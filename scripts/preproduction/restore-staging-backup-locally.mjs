#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PRIMARY_LOCAL_PORTS = Object.freeze([
  3000, 3001, 3210, 55320, 55321, 55322, 55323, 55324, 55325, 55327, 54329,
])
export const REQUIRED_BACKUP_FILES = Object.freeze([
  'roles.sql',
  'schema.sql',
  'data.sql',
  'history_schema.sql',
  'history_data.sql',
])
export const OFFICIAL_CLI_ROLE_GRANT =
  'GRANT "postgres" TO "cli_login_postgres" WITH INHERIT FALSE GRANTED BY "supabase_admin";'
export const OFFICIAL_REALTIME_PARAMETER_GRANT =
  'GRANT SET ON PARAMETER "log_min_messages" TO "supabase_realtime_admin";'

const OFFICIAL_CLI_ROLE_GRANT_PATTERN =
  /GRANT[ \t\r\n]+"postgres"[ \t\r\n]+TO[ \t\r\n]+"cli_login_postgres"[ \t\r\n]+WITH[ \t\r\n]+INHERIT[ \t\r\n]+FALSE[ \t\r\n]+GRANTED[ \t\r\n]+BY[ \t\r\n]+"supabase_admin"[ \t\r\n]*;/g
const OFFICIAL_REALTIME_PARAMETER_GRANT_PATTERN =
  /GRANT[ \t\r\n]+SET[ \t\r\n]+ON[ \t\r\n]+PARAMETER[ \t\r\n]+"log_min_messages"[ \t\r\n]+TO[ \t\r\n]+"supabase_realtime_admin"[ \t\r\n]*;/g

const repositoryRoot = resolve(import.meta.dirname, '../..')
const supabaseCli = resolve(repositoryRoot, 'node_modules/.bin/supabase')
const dockerBinary = '/usr/local/bin/docker'
const sourceConfigPath = resolve(repositoryRoot, 'supabase/config.toml')
const allowedPath = '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin'
const runPorts = Object.freeze([
  Object.freeze({ shadow: 61520, api: 61521, db: 61522, studio: 61523, mailpit: 61524, smtp: 61525, analytics: 61527, pooler: 61529, site: 61500, e2e: 61510 }),
  Object.freeze({ shadow: 61620, api: 61621, db: 61622, studio: 61623, mailpit: 61624, smtp: 61625, analytics: 61627, pooler: 61629, site: 61600, e2e: 61610 }),
])

const SECRET_PATTERN =
  /(?:\bBearer\s+\S+|\b(?:sbp|eyJ|sk_live|sk_test|whsec)_\S+|(?:password|secret|token|cookie|credential)\s*[=:]\s*\S+|postgres(?:ql)?:\/\/\S+)/gi
export const INVENTORY_STATUSES = Object.freeze({
  present: 'PRESENT',
  absent: 'ABSENT',
  error: 'ERROR',
  notApplicable: 'NOT_APPLICABLE',
})

function assertLocalPath(value, label) {
  const path = resolve(value)
  const allowedTemporaryRoots = [resolve(tmpdir()), '/private/tmp']
  if (path === repositoryRoot
    || !allowedTemporaryRoots.some(root => path.startsWith(`${root}/`))) {
    throw new Error(`${label} must be inside a dedicated temporary directory`)
  }
  return path
}

export function assertSafeRestoreArgs(argv) {
  const forbidden = ['--linked', '--prod', '--no-owner', '--db-url', '--password']
  for (const flag of forbidden) {
    if (argv.includes(flag)) throw new Error(`${flag} is forbidden`)
  }
  const allowed = new Set(['--backup-dir', '--runs'])
  const values = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!allowed.has(key) || !value || value.startsWith('--')) {
      throw new Error(`Unsupported or incomplete argument: ${key || '<empty>'}`)
    }
    if (Object.hasOwn(values, key)) throw new Error(`Duplicate argument: ${key}`)
    values[key] = value
  }
  if (!values['--backup-dir']) throw new Error('--backup-dir is required')
  try {
    const parsed = new URL(values['--backup-dir'])
    if (parsed.protocol) throw new Error('Remote backup URL is forbidden')
  } catch (error) {
    if (error instanceof Error && error.message === 'Remote backup URL is forbidden') throw error
  }
  const requestedRuns = values['--runs'] ?? '2'
  if (!/^[12]$/.test(requestedRuns)) {
    const error = new Error('Restore run count must be exactly 1 or 2')
    error.restoreReport = {
      phase: 'arguments',
      sqlstate: 'NOT_APPLICABLE',
      operation: 'RESTORE',
      objectType: 'RUN_COUNT',
      schema: null,
      classification: 'INVALID_RUN_COUNT',
      sensitiveDetailRemoved: true,
    }
    throw error
  }
  const runs = Number(requestedRuns)
  return { backupDirectory: assertLocalPath(values['--backup-dir'], 'backup directory'), runs }
}

export function validateBackupDirectory(directory) {
  const root = assertLocalPath(directory, 'backup directory')
  if (!statSync(root).isDirectory()) throw new Error('Backup path is not a directory')
  const names = readdirSync(root).filter(name => name.endsWith('.sql')).sort()
  if (JSON.stringify(names) !== JSON.stringify([...REQUIRED_BACKUP_FILES].sort())) {
    throw new Error('Backup file set is incomplete or unexpected')
  }
  const files = Object.fromEntries(REQUIRED_BACKUP_FILES.map(name => {
    const path = resolve(root, name)
    const metadata = statSync(path)
    if (!metadata.isFile() || metadata.size === 0) throw new Error(`Backup file is empty: ${name}`)
    const source = readFileSync(path, 'utf8')
    validateSqlArtifactSafety(source, name)
    return [name, { path, source, sizeBytes: metadata.size }]
  }))
  return { root, files }
}

function sqlSafetyError({ artifact, classification, line, patternType }) {
  const error = new Error('Unsafe backup SQL artifact blocked')
  error.restoreReport = {
    artifact,
    classification,
    line,
    type: patternType,
  }
  return error
}

function lineNumberAt(source, index) {
  let line = 1
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source[cursor] === '\n') line += 1
  }
  return line
}

function escapeStringPrefixLength(source, quoteIndex) {
  if (quoteIndex >= 1 && /[eE]/.test(source[quoteIndex - 1])) {
    const before = source[quoteIndex - 2]
    if (!before || !/[a-zA-Z0-9_$]/.test(before)) return 1
  }
  if (quoteIndex >= 2 && /[uU]/.test(source[quoteIndex - 2]) && source[quoteIndex - 1] === '&') {
    const before = source[quoteIndex - 3]
    if (!before || !/[a-zA-Z0-9_$]/.test(before)) return 2
  }
  return 0
}

function maskSqlNonExecutableContexts(source, {
  artifact = 'unknown.sql',
  maskDoubleQuotedIdentifiers = true,
} = {}) {
  const characters = source.split('')
  const masked = source.split('')
  const blank = index => {
    if (masked[index] !== '\n' && masked[index] !== '\r') masked[index] = ' '
  }
  const incomplete = (index, patternType) => {
    throw sqlSafetyError({
      artifact,
      classification: 'SQL_LEXING_INCOMPLETE',
      line: lineNumberAt(source, index),
      patternType,
    })
  }
  let statementStart = 0

  for (let index = 0; index < characters.length;) {
    if (characters[index] === '-' && characters[index + 1] === '-') {
      blank(index++)
      blank(index++)
      while (index < characters.length && characters[index] !== '\n') blank(index++)
      continue
    }

    if (characters[index] === '/' && characters[index + 1] === '*') {
      const opening = index
      let depth = 1
      blank(index++)
      blank(index++)
      while (index < characters.length && depth > 0) {
        if (characters[index] === '/' && characters[index + 1] === '*') {
          depth += 1
          blank(index++)
          blank(index++)
          continue
        }
        if (characters[index] === '*' && characters[index + 1] === '/') {
          depth -= 1
          blank(index++)
          blank(index++)
          continue
        }
        blank(index++)
      }
      if (depth !== 0) incomplete(opening, 'BLOCK_COMMENT')
      continue
    }

    if (characters[index] === "'") {
      const opening = index
      const escapePrefixLength = escapeStringPrefixLength(source, index)
      for (let offset = escapePrefixLength; offset > 0; offset -= 1) blank(index - offset)
      blank(index++)
      let closed = false
      while (index < characters.length) {
        if (escapePrefixLength > 0 && characters[index] === '\\') {
          blank(index++)
          if (index < characters.length) blank(index++)
          continue
        }
        const quote = characters[index] === "'"
        blank(index++)
        if (quote && characters[index] === "'") {
          blank(index++)
          continue
        }
        if (quote) {
          closed = true
          break
        }
      }
      if (!closed) incomplete(opening, 'SINGLE_QUOTED_STRING')
      continue
    }

    if (characters[index] === '"') {
      const opening = index
      if (maskDoubleQuotedIdentifiers) blank(index)
      index += 1
      let closed = false
      while (index < characters.length) {
        const quote = characters[index] === '"'
        if (maskDoubleQuotedIdentifiers) blank(index)
        index += 1
        if (quote && characters[index] === '"') {
          if (maskDoubleQuotedIdentifiers) blank(index)
          index += 1
          continue
        }
        if (quote) {
          closed = true
          break
        }
      }
      if (!closed) incomplete(opening, 'DOUBLE_QUOTED_IDENTIFIER')
      continue
    }

    if (characters[index] === '$') {
      const delimiter = source.slice(index).match(/^\$[a-zA-Z_][a-zA-Z0-9_]*\$|^\$\$/)?.[0]
      if (delimiter) {
        const opening = index
        for (let offset = 0; offset < delimiter.length; offset += 1) blank(index++)
        const closing = source.indexOf(delimiter, index)
        if (closing === -1) incomplete(opening, 'DOLLAR_QUOTED_BODY')
        const end = closing + delimiter.length
        while (index < end) blank(index++)
        continue
      }
    }

    if (characters[index] === ';') {
      const statement = masked.slice(statementStart, index + 1).join('')
      const copyFromStdin = statement.match(
        /(?:^|\n)[ \t]*COPY\b[\s\S]*?\bFROM\s+STDIN\s*;[ \t\r]*$/i,
      )
      statementStart = index + 1
      if (copyFromStdin) {
        const payloadStart = index + 1
        let cursor = payloadStart
        let terminatorEnd = -1
        while (cursor < characters.length) {
          const lineEnd = source.indexOf('\n', cursor)
          const end = lineEnd === -1 ? characters.length : lineEnd
          const line = source.slice(cursor, end).replace(/\r$/, '')
          if (/^[ \t]*\\\.[ \t]*$/.test(line)) {
            terminatorEnd = end
            break
          }
          cursor = lineEnd === -1 ? characters.length : lineEnd + 1
        }
        if (terminatorEnd === -1) incomplete(payloadStart, 'COPY_STDIN_DATA')
        index = payloadStart
        while (index < terminatorEnd) blank(index++)
        if (characters[index] === '\n') index += 1
        statementStart = index
        continue
      }
    }

    index += 1
  }
  return masked.join('')
}

function statementRanges(maskedSource) {
  const ranges = []
  let start = 0
  for (let index = 0; index < maskedSource.length; index += 1) {
    if (maskedSource[index] === ';') {
      ranges.push({ start, end: index + 1 })
      start = index + 1
    }
  }
  if (start < maskedSource.length) ranges.push({ start, end: maskedSource.length })
  return ranges
}

export function validateSqlArtifactSafety(source, artifact = 'unknown.sql') {
  const maskedSource = maskSqlNonExecutableContexts(source, {
    artifact,
    maskDoubleQuotedIdentifiers: true,
  })
  const maskedLines = maskedSource.split(/\n/)
  const executableCharacters = maskedSource.split('')
  let lineOffset = 0
  for (let index = 0; index < maskedLines.length; index += 1) {
    const line = maskedLines[index]
    if (/^[ \t]*\\!/.test(line)) {
      throw sqlSafetyError({
        artifact,
        classification: 'UNSAFE_PSQL_SHELL_COMMAND',
        line: index + 1,
        patternType: 'PSQL_SHELL_COMMAND',
      })
    }
    if (/^[ \t]*\\connect\b/i.test(line)) {
      throw sqlSafetyError({
        artifact,
        classification: 'UNSAFE_PSQL_CONNECT_COMMAND',
        line: index + 1,
        patternType: 'PSQL_CONNECT_COMMAND',
      })
    }
    if (/^[ \t]*\\/.test(line)) {
      for (let cursor = lineOffset; cursor < lineOffset + line.length; cursor += 1) {
        if (maskedSource[cursor] !== '\r') {
          // Other psql meta-commands are excluded from SQL statement parsing.
          executableCharacters[cursor] = ' '
        }
      }
    }
    lineOffset += line.length + 1
  }

  const executableSource = executableCharacters.join('')
  for (const range of statementRanges(executableSource)) {
    const statement = executableSource.slice(range.start, range.end)
    if (/^\s*COPY\b[\s\S]*?\b(?:FROM|TO)\s+PROGRAM\b/i.test(statement)) {
      const copyOffset = statement.search(/\bCOPY\b/i)
      throw sqlSafetyError({
        artifact,
        classification: 'UNSAFE_COPY_PROGRAM',
        line: lineNumberAt(executableSource, range.start + Math.max(copyOffset, 0)),
        patternType: 'COPY_PROGRAM',
      })
    }
  }
  return true
}

function privilegeGrantContractError(classification) {
  const error = new Error('CLI role grant contract blocked')
  error.restoreReport = {
    phase: 'roles_contract',
    sqlstate: 'NOT_APPLICABLE',
    operation: 'GRANT',
    objectType: 'ROLE',
    schema: null,
    classification,
    sensitiveDetailRemoved: true,
  }
  return error
}

function parameterGrantContractError(classification) {
  const error = new Error('Realtime parameter grant contract blocked')
  error.restoreReport = {
    phase: 'roles_contract',
    sqlstate: 'NOT_APPLICABLE',
    operation: 'GRANT SET ON PARAMETER',
    objectType: 'PARAMETER',
    schema: null,
    classification,
    sensitiveDetailRemoved: true,
  }
  return error
}

function officialGrantMatches(maskedSource) {
  return [...maskedSource.matchAll(OFFICIAL_CLI_ROLE_GRANT_PATTERN)]
}

function hasUnrecognizedRelevantGrant(maskedSource, recognizedMatches) {
  const withoutRecognized = maskedSource.split('')
  for (const match of recognizedMatches) {
    for (let index = match.index; index < match.index + match[0].length; index += 1) {
      if (withoutRecognized[index] !== '\n' && withoutRecognized[index] !== '\r') {
        withoutRecognized[index] = ' '
      }
    }
  }
  const grantStatements = withoutRecognized.join('').match(/\bGRANT\b[\s\S]*?(?:;|$)/gi) ?? []
  return grantStatements.some(statement => (
    /\bcli_login_postgres\b/i.test(statement)
    || /\bsupabase_admin\b/i.test(statement)
    || /^GRANT[ \t\r\n]+"?postgres"?(?:[ \t\r\n]|$)/i.test(statement)
  ))
}

export function prepareOfficialCliRoleGrant(source) {
  const maskedSource = maskSqlNonExecutableContexts(source, {
    artifact: 'roles.sql',
    maskDoubleQuotedIdentifiers: false,
  })
  const matches = officialGrantMatches(maskedSource)
  if (matches.length > 1) throw privilegeGrantContractError('MULTIPLE_OFFICIAL_GRANTS')
  if (hasUnrecognizedRelevantGrant(maskedSource, matches)) {
    throw privilegeGrantContractError('UNRECOGNIZED_PRIVILEGE_GRANT')
  }
  if (matches.length === 0) {
    return { source, classification: 'OFFICIAL_GRANT_ALREADY_OMITTED' }
  }
  const match = matches[0]
  const prepared = `${source.slice(0, match.index)}-- Local restore: official Supabase cli_login_postgres grant omitted.${source.slice(match.index + match[0].length)}`
  return { source: prepared, classification: 'OFFICIAL_GRANT_FILTERED' }
}

export function prepareOfficialRealtimeParameterGrant(source) {
  const maskedSource = maskSqlNonExecutableContexts(source, {
    artifact: 'roles.sql',
    maskDoubleQuotedIdentifiers: false,
  })
  const matches = [...maskedSource.matchAll(OFFICIAL_REALTIME_PARAMETER_GRANT_PATTERN)]
  if (matches.length > 1) {
    throw parameterGrantContractError('MULTIPLE_OFFICIAL_PARAMETER_GRANTS')
  }
  const withoutRecognized = maskedSource.split('')
  for (const match of matches) {
    for (let index = match.index; index < match.index + match[0].length; index += 1) {
      if (withoutRecognized[index] !== '\n' && withoutRecognized[index] !== '\r') {
        withoutRecognized[index] = ' '
      }
    }
  }
  const relatedGrants = withoutRecognized.join('').match(/\bGRANT\b[\s\S]*?(?:;|$)/gi) ?? []
  if (relatedGrants.some(statement => (
    /\bGRANT\s+SET\s+ON\s+PARAMETER\b/i.test(statement)
    || /\blog_min_messages\b/i.test(statement)
    || /\bsupabase_realtime_admin\b/i.test(statement)
  ))) {
    throw parameterGrantContractError('UNRECOGNIZED_PARAMETER_GRANT')
  }
  if (matches.length === 0) {
    return { source, classification: 'OFFICIAL_PARAMETER_GRANT_ALREADY_OMITTED' }
  }
  const match = matches[0]
  const prepared = `${source.slice(0, match.index)}-- Local restore: official Supabase realtime parameter grant applied by the managed role.${source.slice(match.index + match[0].length)}`
  return { source: prepared, classification: 'OFFICIAL_PARAMETER_GRANT_FILTERED' }
}

export function neutralizeUnsupportedCliRoleGrant(source) {
  return prepareOfficialCliRoleGrant(source).source
}

export function buildCanonicalRestoreSql(files) {
  const cliPrepared = prepareOfficialCliRoleGrant(files['roles.sql'].source)
  const roles = prepareOfficialRealtimeParameterGrant(cliPrepared.source).source
  return [
    '\\set ON_ERROR_STOP on',
    'BEGIN;',
    roles,
    files['schema.sql'].source,
    'SET session_replication_role = replica;',
    files['data.sql'].source,
    files['history_schema.sql'].source,
    files['history_data.sql'].source,
    'COMMIT;',
  ].join('\n')
}

function operationFromError(message) {
  const match = message.match(/(?:STATEMENT|statement):\s*([^\n]+)/i)
  const statement = match?.[1]?.trim() ?? ''
  if (/^GRANT\s+SET\s+ON\s+PARAMETER\b/i.test(statement)) return 'GRANT SET ON PARAMETER'
  if (/^GRANT\b/i.test(statement)) return 'GRANT'
  if (/^ALTER\s+.+OWNER\b/i.test(statement)) return 'ALTER OWNER'
  if (/^SET\s+ROLE\b/i.test(statement)) return 'SET ROLE'
  if (/^CREATE\s+EXTENSION\b/i.test(statement)) return 'CREATE EXTENSION'
  if (/^ALTER\s+PUBLICATION\b/i.test(statement)) return 'ALTER PUBLICATION'
  if (/^SELECT\b/i.test(statement)) return 'SELECT'
  return 'UNKNOWN'
}

export function sanitizeRestoreError(raw, phase = 'restore') {
  const message = String(raw)
  const sqlstate = message.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]
    ?? message.match(/SQLSTATE\s+([0-9A-Z]{5})/)?.[1]
    ?? 'UNKNOWN'
  const schema = message.match(/schema\s+"?([a-z_][a-z0-9_]*)"?/i)?.[1] ?? null
  const objectType = message.match(/(?:table|function|schema|role|publication|extension|parameter)\s+"?[^\s"]+/i)?.[0]?.split(/\s+/)[0]?.toUpperCase() ?? 'UNKNOWN'
  const classification = sqlstate === '42501'
    ? 'INSUFFICIENT_PRIVILEGE'
    : sqlstate === '42704'
      ? 'MISSING_OBJECT'
      : sqlstate === '42710'
        ? 'DUPLICATE_OBJECT'
        : sqlstate === '2BP01'
          ? 'DEPENDENT_OBJECTS'
          : 'RESTORE_ERROR'
  const sanitized = message.replace(SECRET_PATTERN, '<redacted>')
  return {
    phase,
    sqlstate,
    operation: operationFromError(sanitized),
    objectType,
    schema,
    classification,
    sensitiveDetailRemoved: sanitized !== message,
  }
}

export async function withGuaranteedCleanup(operation, cleanup) {
  try {
    return await operation()
  } finally {
    await cleanup()
  }
}

function inventoryContractError({
  classification,
  queryType,
  objectType,
  schema = null,
  status,
  inventoryStatuses,
}) {
  const error = new Error('Inventory contract blocked')
  error.restoreReport = {
    phase: 'inventory',
    sqlstate: 'NOT_APPLICABLE',
    operation: 'SELECT',
    queryType,
    objectType,
    schema,
    lineOrOrdinal: 1,
    status,
    classification,
    inventoryStatuses,
    sensitiveDetailRemoved: true,
  }
  return error
}

export function classifyInventoryPrerequisites(presence) {
  const required = {
    auth: presence?.authUsers === true,
    storage: presence?.storageObjects === true,
    migrationHistory: presence?.migrationHistory === true,
    plpgsql: presence?.plpgsql === true,
  }
  const fixturePresent = presence?.fixtureTable === true
  return {
    auth: required.auth ? INVENTORY_STATUSES.present : INVENTORY_STATUSES.absent,
    storage: required.storage ? INVENTORY_STATUSES.present : INVENTORY_STATUSES.absent,
    migrationHistory: required.migrationHistory
      ? INVENTORY_STATUSES.present
      : INVENTORY_STATUSES.absent,
    extensions: required.plpgsql ? INVENTORY_STATUSES.present : INVENTORY_STATUSES.absent,
    fixture: fixturePresent ? INVENTORY_STATUSES.present : INVENTORY_STATUSES.notApplicable,
    policies: fixturePresent
      ? (presence?.fixturePolicy === true ? INVENTORY_STATUSES.present : INVENTORY_STATUSES.absent)
      : INVENTORY_STATUSES.notApplicable,
    publications: fixturePresent
      ? (presence?.fixturePublication === true
          ? INVENTORY_STATUSES.present
          : INVENTORY_STATUSES.absent)
      : INVENTORY_STATUSES.notApplicable,
    securityDefiner: fixturePresent
      ? (presence?.fixtureSecurityDefiner === true
          ? INVENTORY_STATUSES.present
          : INVENTORY_STATUSES.absent)
      : INVENTORY_STATUSES.notApplicable,
    billing: presence?.billingPayments === true
      ? INVENTORY_STATUSES.present
      : INVENTORY_STATUSES.notApplicable,
  }
}

export function assertInventoryPrerequisites(presence) {
  const statuses = classifyInventoryPrerequisites(presence)
  const required = [
    ['auth', 'AUTH_USERS', 'TABLE', 'auth'],
    ['storage', 'STORAGE_OBJECTS', 'TABLE', 'storage'],
    ['migrationHistory', 'MIGRATION_HISTORY', 'TABLE', 'supabase_migrations'],
    ['extensions', 'PLPGSQL_EXTENSION', 'EXTENSION', null],
  ]
  for (const [category, queryType, objectType, schema] of required) {
    if (statuses[category] === INVENTORY_STATUSES.absent) {
      throw inventoryContractError({
        classification: 'INVENTORY_REQUIRED_OBJECT_ABSENT',
        queryType,
        objectType,
        schema,
        status: INVENTORY_STATUSES.absent,
        inventoryStatuses: statuses,
      })
    }
  }
  return statuses
}

export function sanitizeInventoryQueryError(raw, queryType, lineOrOrdinal = 1) {
  const report = sanitizeRestoreError(raw, 'inventory')
  return {
    ...report,
    operation: report.operation === 'UNKNOWN' ? 'SELECT' : report.operation,
    queryType,
    lineOrOrdinal,
    status: INVENTORY_STATUSES.error,
    classification: report.sqlstate === '42501'
      ? 'INVENTORY_PERMISSION_DENIED'
      : 'INVENTORY_QUERY_ERROR',
  }
}

function enrichInventoryExecutionError(error, queryType, lineOrOrdinal = 1) {
  const report = error?.restoreReport
  if (!report) {
    return inventoryContractError({
      classification: 'INVENTORY_QUERY_ERROR',
      queryType,
      objectType: 'CATALOG',
      status: INVENTORY_STATUSES.error,
      inventoryStatuses: {},
    })
  }
  error.restoreReport = {
    ...report,
    phase: 'inventory',
    operation: report.operation === 'UNKNOWN' ? 'SELECT' : report.operation,
    queryType,
    lineOrOrdinal,
    status: INVENTORY_STATUSES.error,
    classification: report.sqlstate === '42501'
      ? 'INVENTORY_PERMISSION_DENIED'
      : 'INVENTORY_QUERY_ERROR',
  }
  return error
}

export function assertIsolatedTarget({ projectId, ports, temporaryRoot }) {
  if (!/^moovx-staging-restore-[a-z0-9-]+$/.test(projectId)) {
    throw new Error('Isolated project ID is invalid')
  }
  const values = Object.values(ports)
  if (new Set(values).size !== values.length) throw new Error('Isolated ports must be unique')
  if (values.some(port => PRIMARY_LOCAL_PORTS.includes(port))) {
    throw new Error('Primary local port is forbidden')
  }
  assertLocalPath(temporaryRoot, 'restore worktree')
}

export function compareRestoreProofs(first, second) {
  if (first.fingerprint !== second.fingerprint) throw new Error('Restore fingerprints differ')
  if (JSON.stringify(first.counts) !== JSON.stringify(second.counts)) {
    throw new Error('Restore counts differ')
  }
  if (JSON.stringify(first.owners) !== JSON.stringify(second.owners)) {
    throw new Error('Restore ownership differs')
  }
  if (JSON.stringify(first.inventoryStatuses) !== JSON.stringify(second.inventoryStatuses)) {
    throw new Error('Restore inventory statuses differ')
  }
  return true
}

function configFor(projectId, ports) {
  const replacements = new Map([
    [55320, ports.shadow], [55321, ports.api], [55322, ports.db], [55323, ports.studio],
    [55324, ports.mailpit], [55325, ports.smtp], [55327, ports.analytics], [54329, ports.pooler],
    [3000, ports.site], [3210, ports.e2e],
  ])
  let config = readFileSync(sourceConfigPath, 'utf8')
    .replace(/^project_id\s*=\s*"[^"]+"/m, `project_id = "${projectId}"`)
  for (const [current, replacement] of replacements) {
    config = config.replace(new RegExp(`\\b${current}\\b`, 'g'), String(replacement))
  }
  return config.replace(/(\[db\.seed\][\s\S]*?enabled\s*=\s*)true/, '$1false')
}

function execute(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    input: options.input,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    env: { PATH: allowedPath, SUPABASE_TELEMETRY_DISABLED: '1' },
    stdio: 'pipe',
  })
  if (result.status !== 0) {
    const error = new Error(`${options.label ?? basename(command)} failed`)
    error.restoreReport = sanitizeRestoreError(
      `${result.stdout || ''}\n${result.stderr || ''}`,
      options.phase ?? 'restore',
    )
    throw error
  }
  return options.allowOutput ? (result.stdout || '') : ''
}

function docker(args, options) {
  return execute(dockerBinary, args, { label: 'docker', ...options })
}

function resources(projectId) {
  const containers = docker(
    ['ps', '-a', '--filter', `name=${projectId}`, '--format', '{{.Names}}'],
    { allowOutput: true, phase: 'resource_inventory' },
  ).trim().split('\n').filter(Boolean).sort()
  const volumes = docker(
    ['volume', 'ls', '--filter', `name=${projectId}`, '--format', '{{.Name}}'],
    { allowOutput: true, phase: 'resource_inventory' },
  ).trim().split('\n').filter(Boolean).sort()
  return { containers, volumes }
}

function forceCleanup(projectId) {
  const current = resources(projectId)
  if (current.containers.length) docker(['rm', '-f', ...current.containers], { phase: 'cleanup' })
  if (current.volumes.length) docker(['volume', 'rm', ...current.volumes], { phase: 'cleanup' })
}

function inventory(container) {
  const prerequisiteSql = `
SELECT json_build_object(
  'authUsers', to_regclass('auth.users') IS NOT NULL,
  'storageObjects', to_regclass('storage.objects') IS NOT NULL,
  'migrationHistory', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
  'plpgsql', EXISTS (SELECT 1 FROM pg_extension WHERE extname='plpgsql'),
  'fixtureTable', to_regclass('restore_fixture.items') IS NOT NULL,
  'fixturePolicy', EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='restore_fixture' AND tablename='items'),
  'fixturePublication', EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='fixture_restore_publication' AND schemaname='restore_fixture' AND tablename='items'),
  'fixtureSecurityDefiner', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='restore_fixture' AND p.proname='item_count' AND p.prosecdef),
  'billingPayments', to_regclass('public.payments') IS NOT NULL
)::text;`
  let presenceOutput
  try {
    presenceOutput = docker(
      ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-Atq', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
      { input: prerequisiteSql, allowOutput: true, phase: 'inventory' },
    ).trim()
  } catch (error) {
    throw enrichInventoryExecutionError(error, 'INVENTORY_PREREQUISITES')
  }
  let presence
  try {
    presence = JSON.parse(presenceOutput)
  } catch {
    throw inventoryContractError({
      classification: 'INVENTORY_QUERY_ERROR',
      queryType: 'INVENTORY_PREREQUISITES',
      objectType: 'CATALOG',
      status: INVENTORY_STATUSES.error,
      inventoryStatuses: {},
    })
  }
  const inventoryStatuses = assertInventoryPrerequisites(presence)
  const sql = `
SELECT json_build_object(
  'counts', json_build_object(
    'publicTables', (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),
    'authUsers', (SELECT count(*) FROM auth.users),
    'storageObjects', (SELECT count(*) FROM storage.objects),
    'migrationHistory', (SELECT count(*) FROM supabase_migrations.schema_migrations)
  ),
  'owners', json_build_object(
    'auth', (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='auth'),
    'storage', (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='storage'),
    'realtime', (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='realtime')
  ),
  'fixturePresent', to_regclass('restore_fixture.items') IS NOT NULL,
  'fingerprint', md5((SELECT string_agg(item, E'\\n' ORDER BY item) FROM (
    SELECT concat('c|',table_schema,'|',table_name,'|',column_name,'|',data_type,'|',is_nullable,'|',coalesce(column_default,'')) item FROM information_schema.columns WHERE table_schema IN ('public','auth','storage','supabase_migrations','restore_fixture')
    UNION ALL SELECT concat('k|',n.nspname,'|',c.relname,'|',co.conname,'|',pg_get_constraintdef(co.oid)) FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','storage','restore_fixture')
    UNION ALL SELECT concat('i|',schemaname,'|',tablename,'|',indexname,'|',indexdef) FROM pg_indexes WHERE schemaname IN ('public','auth','storage','restore_fixture')
    UNION ALL SELECT concat('p|',schemaname,'|',tablename,'|',policyname,'|',cmd,'|',coalesce(qual,''),'|',coalesce(with_check,'')) FROM pg_policies WHERE schemaname IN ('public','auth','storage','restore_fixture')
    UNION ALL SELECT concat('r|',pubname,'|',schemaname,'|',tablename) FROM pg_publication_tables
    UNION ALL SELECT concat('o|',nspname,'|',pg_get_userbyid(nspowner)) FROM pg_namespace WHERE nspname IN ('public','auth','storage','realtime','restore_fixture')
  ) fingerprint_items))
)::text;`
  let output
  try {
    output = docker(
      ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-Atq', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
      { input: sql, allowOutput: true, phase: 'inventory' },
    ).trim()
  } catch (error) {
    throw enrichInventoryExecutionError(error, 'INVENTORY_AGGREGATE')
  }
  let report
  try {
    report = JSON.parse(output)
  } catch {
    throw inventoryContractError({
      classification: 'INVENTORY_QUERY_ERROR',
      queryType: 'INVENTORY_AGGREGATE',
      objectType: 'CATALOG',
      status: INVENTORY_STATUSES.error,
      inventoryStatuses,
    })
  }
  report.inventoryStatuses = inventoryStatuses
  if (report.fixturePresent) {
    const fixtureSql = `
SELECT json_build_object(
  'rowCount', (SELECT count(*) FROM restore_fixture.items),
  'schemaOwner', (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='restore_fixture'),
  'tableOwner', (SELECT tableowner FROM pg_tables WHERE schemaname='restore_fixture' AND tablename='items'),
  'rlsEnabled', (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='restore_fixture' AND c.relname='items'),
  'policyCount', (SELECT count(*) FROM pg_policies WHERE schemaname='restore_fixture' AND tablename='items'),
  'securityDefiner', (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='restore_fixture' AND p.proname='item_count'),
  'publicationCount', (SELECT count(*) FROM pg_publication_tables WHERE pubname='fixture_restore_publication' AND schemaname='restore_fixture' AND tablename='items'),
  'fixtureRolePresent', EXISTS (SELECT 1 FROM pg_roles WHERE rolname='fixture_restore_owner'),
  'cliRolePresent', EXISTS (SELECT 1 FROM pg_roles WHERE rolname='cli_login_postgres'),
  'unsupportedMembershipCount', (SELECT count(*) FROM pg_auth_members m JOIN pg_roles role ON role.oid=m.roleid JOIN pg_roles member ON member.oid=m.member WHERE role.rolname='postgres' AND member.rolname='cli_login_postgres')
)::text;`
    let fixtureOutput
    try {
      fixtureOutput = docker(
        ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-Atq', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
        { input: fixtureSql, allowOutput: true, phase: 'inventory' },
      ).trim()
    } catch (error) {
      throw enrichInventoryExecutionError(error, 'FIXTURE_INVENTORY')
    }
    try {
      report.fixture = JSON.parse(fixtureOutput)
    } catch {
      throw inventoryContractError({
        classification: 'INVENTORY_QUERY_ERROR',
        queryType: 'FIXTURE_INVENTORY',
        objectType: 'CATALOG',
        status: INVENTORY_STATUSES.error,
        inventoryStatuses,
      })
    }
    if (Number(report.fixture.policyCount) === 0) {
      report.inventoryStatuses.policies = INVENTORY_STATUSES.absent
    }
    if (Number(report.fixture.publicationCount) === 0) {
      report.inventoryStatuses.publications = INVENTORY_STATUSES.absent
    }
    if (report.fixture.securityDefiner !== true) {
      report.inventoryStatuses.securityDefiner = INVENTORY_STATUSES.absent
    }
  }
  return report
}

async function restoreOnce({ backup, runNumber, ports }) {
  const nonce = `${process.pid}-${Date.now().toString(36)}-${runNumber}`
  const projectId = `moovx-staging-restore-${nonce}`
  const temporaryRoot = mkdtempSync(join(tmpdir(), `moovx-staging-restore-run-${runNumber}-`))
  assertIsolatedTarget({ projectId, ports, temporaryRoot })
  const projectRoot = resolve(temporaryRoot, 'project')
  const configRoot = resolve(projectRoot, 'supabase')
  const container = `supabase_db_${projectId}`
  const volume = `supabase_db_${projectId}`
  mkdirSync(resolve(configRoot, 'migrations'), { recursive: true, mode: 0o700 })
  writeFileSync(resolve(configRoot, 'config.toml'), configFor(projectId, ports), { mode: 0o600 })
  chmodSync(temporaryRoot, 0o700)
  let proof
  await withGuaranteedCleanup(async () => {
    if (resources(projectId).containers.length || resources(projectId).volumes.length) {
      throw new Error('Isolated Docker resource collision')
    }
    execute(supabaseCli, ['start'], { cwd: projectRoot, phase: 'stack_start' })
    if (!resources(projectId).containers.includes(container)
      || !resources(projectId).volumes.includes(volume)) {
      throw new Error('Expected isolated database resources are missing')
    }
    const cliPrepared = prepareOfficialCliRoleGrant(backup.files['roles.sql'].source)
    const parameterPrepared = prepareOfficialRealtimeParameterGrant(cliPrepared.source)
    if (parameterPrepared.classification === 'OFFICIAL_PARAMETER_GRANT_FILTERED') {
      docker(
        ['exec', '-i', container, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
        { input: OFFICIAL_REALTIME_PARAMETER_GRANT, phase: 'managed_parameter_grant' },
      )
    }
    const restoreSql = buildCanonicalRestoreSql(backup.files)
    docker(
      ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
      { input: restoreSql, phase: 'canonical_restore' },
    )
    const restored = inventory(container)
    if (restored.owners.auth !== 'supabase_admin'
      || restored.owners.storage !== 'supabase_admin'
      || restored.owners.realtime !== 'supabase_admin') {
      throw inventoryContractError({
        classification: 'INVENTORY_OWNER_MISMATCH',
        queryType: 'MANAGED_SCHEMA_OWNERS',
        objectType: 'SCHEMA',
        status: INVENTORY_STATUSES.error,
        inventoryStatuses: restored.inventoryStatuses,
      })
    }
    if (restored.fixturePresent
      && (Number(restored.fixture.rowCount) !== 2
        || restored.fixture.schemaOwner !== 'postgres'
        || restored.fixture.tableOwner !== 'postgres'
        || restored.fixture.rlsEnabled !== true
        || Number(restored.fixture.policyCount) !== 1
        || restored.fixture.securityDefiner !== true
        || Number(restored.fixture.publicationCount) !== 1
        || restored.fixture.fixtureRolePresent !== true
        || restored.fixture.cliRolePresent !== true
        || Number(restored.fixture.unsupportedMembershipCount) !== 0)) {
      throw inventoryContractError({
        classification: 'INVENTORY_FIXTURE_CONTRACT_MISMATCH',
        queryType: 'FIXTURE_ASSERTIONS',
        objectType: 'FIXTURE',
        schema: 'restore_fixture',
        status: INVENTORY_STATUSES.error,
        inventoryStatuses: restored.inventoryStatuses,
      })
    }
    proof = {
      runNumber,
      projectId,
      databasePort: ports.db,
      volume,
      fingerprint: restored.fingerprint,
      counts: restored.counts,
      owners: restored.owners,
      inventoryStatuses: restored.inventoryStatuses,
    }
  }, async () => {
    try { execute(supabaseCli, ['stop', '--no-backup'], { cwd: projectRoot, phase: 'stack_stop' }) } catch {}
    forceCleanup(projectId)
    chmodSync(temporaryRoot, 0o700)
    rmSync(temporaryRoot, { recursive: true, force: true })
    const remaining = resources(projectId)
    if (remaining.containers.length || remaining.volumes.length) {
      throw new Error('Isolated cleanup incomplete')
    }
  })
  return proof
}

/**
 * @param {{
 *   backup: { files: Record<string, { source: string }> },
 *   requestedRuns: number,
 *   restoreRun?: (input: {
 *     backup: { files: Record<string, { source: string }> },
 *     runNumber: number,
 *     ports: { db: number } & Record<string, number>,
 *   }) => Promise<{
 *     fingerprint: string,
 *     counts: Record<string, unknown>,
 *     owners: Record<string, unknown>,
 *   }>,
 *   ports?: readonly ({ db: number } & Record<string, number>)[],
 *   compareProofs?: (
 *     first: { fingerprint: string, counts: Record<string, unknown>, owners: Record<string, unknown> },
 *     second: { fingerprint: string, counts: Record<string, unknown>, owners: Record<string, unknown> },
 *   ) => boolean,
 * }} input
 */
export async function executeRestoreRuns({
  backup,
  requestedRuns,
  restoreRun = restoreOnce,
  ports = runPorts,
  compareProofs = compareRestoreProofs,
}) {
  if (requestedRuns !== 1 && requestedRuns !== 2) {
    throw new Error('Restore execution requires exactly 1 or 2 runs')
  }
  const roleGrant = prepareOfficialCliRoleGrant(backup.files['roles.sql'].source)
  const parameterGrant = prepareOfficialRealtimeParameterGrant(roleGrant.source)
  const proofs = []
  for (let index = 0; index < requestedRuns; index += 1) {
    proofs.push(await restoreRun({ backup, runNumber: index + 1, ports: ports[index] }))
  }
  if (requestedRuns === 2) {
    compareProofs(proofs[0], proofs[1])
  }
  return {
    status: 'RESTORABLE',
    requestedRuns,
    completedRuns: proofs.length,
    runs: proofs,
    restoreRuns: proofs,
    fingerprint: proofs[0].fingerprint,
    fingerprintsIdentical: requestedRuns === 2 ? true : null,
    countsIdentical: requestedRuns === 2 ? true : null,
    ownershipIdentical: requestedRuns === 2 ? true : null,
    roleGrantClassification: roleGrant.classification,
    parameterGrantClassification: parameterGrant.classification,
    sourceDumpModified: false,
    remoteAccess: false,
  }
}

export async function restoreBackupRuns(backupDirectory, requestedRuns = 2) {
  const backup = validateBackupDirectory(backupDirectory)
  return executeRestoreRuns({ backup, requestedRuns })
}

export async function restoreBackupTwice(backupDirectory) {
  return restoreBackupRuns(backupDirectory, 2)
}

async function main() {
  const { backupDirectory, runs } = assertSafeRestoreArgs(process.argv.slice(2))
  const report = await restoreBackupRuns(backupDirectory, runs)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const report = error?.restoreReport ?? {
      phase: 'harness',
      sqlstate: 'UNKNOWN',
      operation: 'UNKNOWN',
      objectType: 'UNKNOWN',
      schema: null,
      classification: 'HARNESS_FAILURE',
      sensitiveDetailRemoved: false,
    }
    process.stderr.write(`${JSON.stringify(report)}\n`)
    process.exitCode = 1
  })
}
