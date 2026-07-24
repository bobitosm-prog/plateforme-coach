import ts from 'typescript'

export const SUPABASE_CONSTRUCTOR_PACKAGES = [
  '@supabase/ssr',
  '@supabase/supabase-js',
  '@supabase/auth-helpers-nextjs',
] as const

export const SUPABASE_CONSTRUCTORS = [
  'createBrowserClient',
  'createServerClient',
  'createMiddlewareClient',
  'createClientComponentClient',
  'createRouteHandlerClient',
  'createServerComponentClient',
  'createPagesBrowserClient',
  'createPagesServerClient',
  'createClient',
  'SupabaseClient',
] as const

export type SupabaseConstruction = {
  readonly file: string
  readonly constructor: string
  readonly line: number
  readonly column: number
}

export type SupabaseConstructionAudit = {
  readonly constructions: readonly SupabaseConstruction[]
  readonly uncalledRuntimeImports: readonly string[]
}

type Binding = { readonly imported: string; readonly packageName: string }

const constructorNames = new Set<string>(SUPABASE_CONSTRUCTORS)
const constructorPackages = new Set<string>(SUPABASE_CONSTRUCTOR_PACKAGES)

function location(
  sourceFile: ts.SourceFile,
  file: string,
  node: ts.Node,
  constructor: string,
): SupabaseConstruction {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  return { file, constructor, line: position.line + 1, column: position.character + 1 }
}

export function auditSupabaseConstructions(
  file: string,
  source: string,
): SupabaseConstructionAudit {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const bindings = new Map<string, Binding>()
  const namespaces = new Map<string, string>()
  const runtimeImports = new Set<string>()
  const usedBindings = new Set<string>()
  const constructions: SupabaseConstruction[] = []
  let hasDynamicSsrImport = false

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const packageName = statement.moduleSpecifier.text
    if (!constructorPackages.has(packageName)) continue
    const clause = statement.importClause
    if (!clause || clause.isTypeOnly || !clause.namedBindings) continue
    if (ts.isNamespaceImport(clause.namedBindings)) {
      namespaces.set(clause.namedBindings.name.text, packageName)
      runtimeImports.add(`${packageName}:*`)
      continue
    }
    for (const element of clause.namedBindings.elements) {
      if (element.isTypeOnly) continue
      const imported = element.propertyName?.text ?? element.name.text
      if (!constructorNames.has(imported)) continue
      bindings.set(element.name.text, { imported, packageName })
      runtimeImports.add(`${packageName}:${imported}:${element.name.text}`)
    }
  }

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments[0]
      && ts.isStringLiteral(node.arguments[0])
      && constructorPackages.has(node.arguments[0].text)
    ) {
      hasDynamicSsrImport = true
    }

    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)) {
      const call = node.initializer
      if (
        ts.isIdentifier(call.expression)
        && call.expression.text === 'require'
        && call.arguments[0]
        && ts.isStringLiteral(call.arguments[0])
        && constructorPackages.has(call.arguments[0].text)
      ) {
        if (ts.isIdentifier(node.name)) namespaces.set(node.name.text, call.arguments[0].text)
        if (ts.isObjectBindingPattern(node.name)) {
          for (const element of node.name.elements) {
            const imported = element.propertyName && ts.isIdentifier(element.propertyName)
              ? element.propertyName.text
              : element.name.getText(sourceFile)
            if (constructorNames.has(imported) && ts.isIdentifier(element.name)) {
              bindings.set(element.name.text, { imported, packageName: call.arguments[0].text })
              runtimeImports.add(`${call.arguments[0].text}:${imported}:${element.name.text}`)
            }
          }
        }
      }
    }

    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        const binding = bindings.get(node.expression.text)
        const inferredDynamic = hasDynamicSsrImport && constructorNames.has(node.expression.text)
        if (binding || inferredDynamic) {
          const constructor = binding?.imported ?? node.expression.text
          constructions.push(location(sourceFile, file, node.expression, constructor))
          usedBindings.add(node.expression.text)
        }
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        const namespace = node.expression.expression
        const constructor = node.expression.name.text
        if (
          constructorNames.has(constructor)
          && ts.isIdentifier(namespace)
          && namespaces.has(namespace.text)
        ) {
          constructions.push(location(sourceFile, file, node.expression, constructor))
          usedBindings.add(`${namespaces.get(namespace.text)}:*`)
        }
      }
    }

    if (
      ts.isNewExpression(node)
      && ts.isIdentifier(node.expression)
      && (bindings.get(node.expression.text)?.imported === 'SupabaseClient'
        || node.expression.text === 'SupabaseClient')
    ) {
      constructions.push(location(sourceFile, file, node.expression, 'SupabaseClient'))
      usedBindings.add(node.expression.text)
    }

    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  const uncalledRuntimeImports = [...runtimeImports]
    .filter(key => {
      if (key.endsWith(':*')) return !usedBindings.has(key)
      return !usedBindings.has(key.slice(key.lastIndexOf(':') + 1))
    })
    .sort()

  return {
    constructions: constructions.sort((a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column),
    uncalledRuntimeImports,
  }
}

export function constructionKey(value: SupabaseConstruction): string {
  return `${value.file}:${value.line}:${value.column}:${value.constructor}`
}

export function compareSupabaseConstructionBaseline(
  actual: readonly SupabaseConstruction[],
  expected: readonly string[],
): { readonly ok: boolean; readonly added: readonly string[]; readonly missing: readonly string[] } {
  const actualKeys = actual.map(constructionKey).sort()
  const expectedKeys = [...expected].sort()
  const actualSet = new Set(actualKeys)
  const expectedSet = new Set(expectedKeys)
  const added = actualKeys.filter(key => !expectedSet.has(key))
  const missing = expectedKeys.filter(key => !actualSet.has(key))
  return { ok: added.length === 0 && missing.length === 0, added, missing }
}
