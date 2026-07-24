import ts from 'typescript'

export type ProgressionAggregationOccurrence = {
  readonly file: string
  readonly rule: 'epley' | 'tonnage'
  readonly line: number
}

function containsToken(node: ts.Node, sourceFile: ts.SourceFile, token: string): boolean {
  return node.getText(sourceFile).toLowerCase().includes(token)
}

export function auditProgressionAggregationSource(
  file: string,
  source: string,
): readonly ProgressionAggregationOccurrence[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const occurrences: ProgressionAggregationOccurrence[] = []
  const seen = new Set<string>()

  function add(node: ts.Node, rule: ProgressionAggregationOccurrence['rule']): void {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
    const key = `${file}:${line}:${rule}`
    if (!seen.has(key)) occurrences.push({ file, line, rule })
    seen.add(key)
  }

  function visit(node: ts.Node): void {
    if (ts.isBinaryExpression(node)) {
      const hasWeight = containsToken(node, sourceFile, 'weight')
      const hasReps = containsToken(node, sourceFile, 'reps')
      if (hasWeight && hasReps) {
        const expression = node.getText(sourceFile)
        const isEpley = /\/\s*30\b/.test(expression)
        if (isEpley) add(node, 'epley')
        if (node.operatorToken.kind === ts.SyntaxKind.AsteriskToken && !isEpley) add(node, 'tonnage')
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return occurrences.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule))
}

export function progressionAggregationOccurrenceKey(value: ProgressionAggregationOccurrence): string {
  return `${value.file}:${value.line}:${value.rule}`
}

export function compareProgressionAggregationBaseline(
  actual: readonly ProgressionAggregationOccurrence[],
  expected: readonly string[],
) {
  const actualKeys = actual.map(progressionAggregationOccurrenceKey).sort()
  const expectedKeys = [...expected].sort()
  const actualSet = new Set(actualKeys)
  const expectedSet = new Set(expectedKeys)
  const added = actualKeys.filter(key => !expectedSet.has(key))
  const missing = expectedKeys.filter(key => !actualSet.has(key))
  return { ok: added.length === 0 && missing.length === 0, added, missing }
}
