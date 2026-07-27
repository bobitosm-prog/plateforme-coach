import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { buildPhase6SeedSql } from '../../scripts/preproduction/generate-phase6-seed.mjs'
import { verifyPhase6SeedAuthority } from '../../scripts/preproduction/apply-phase6-seed.mjs'
import {
  PHASE6_STAGING_PROJECT_REF,
  PHASE6_STAGING_SUPABASE_URL,
  assertPhase6AuthV2Manifest,
  assertPhase6StagingTarget,
  assertSuccessfulPhase6AuthPreflight,
  expectedPhase6AuthMetadata,
  provisionPhase6AuthV2,
} from '../../scripts/preproduction/provision-phase6-auth-v2.mjs'

const root = process.cwd()
const manifestSource = readFileSync(
  resolve(root, 'scripts/preproduction/phase6-auth-v2-manifest.json'),
  'utf8',
)
const provisionerSource = readFileSync(
  resolve(root, 'scripts/preproduction/provision-phase6-auth-v2.mjs'),
  'utf8',
)
const manifest = JSON.parse(manifestSource)

function canonicalUser(persona: (typeof manifest.personas)[number]) {
  return {
    id: persona.id,
    email: persona.email,
    email_confirmed_at: '2026-07-27T00:00:00.000Z',
    user_metadata: expectedPhase6AuthMetadata(persona, manifest.authority),
    app_metadata: { provider: 'email', providers: ['email'] },
    identities: [{
      provider: 'email',
      identity_data: { email: persona.email },
    }],
  }
}

describe('Phase 6 canonical Auth v2 cohort', () => {
  it('pins nine deterministic unique UUIDs and synthetic emails', () => {
    expect(assertPhase6AuthV2Manifest(manifest)).toBe(manifest)
    expect(manifest.personas).toHaveLength(9)
    expect(new Set(manifest.personas.map((row: { id: string }) => row.id)).size)
      .toBe(9)
    expect(new Set(
      manifest.personas.map((row: { email: string }) => row.email),
    ).size).toBe(9)
    expect(manifest.personas.every((row: { id: string }) =>
      /^76100000-0000-4000-8000-00000000000[1-9]$/.test(row.id),
    )).toBe(true)
    expect(manifest.personas.every((row: { email: string }) =>
      row.email.startsWith('phase6-v2-')
      && row.email.endsWith('@moovx.invalid'),
    )).toBe(true)
  })

  it('generates a relational-only, controlled profile upsert', () => {
    const sql = buildPhase6SeedSql(manifest)
    expect(sql).toContain('INSERT INTO public.profiles')
    expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET')
    expect(sql).toContain("'super_admin'")
    expect(sql).toContain('role = EXCLUDED.role')
    expect(sql).toContain('status = EXCLUDED.status')
    expect(sql).toContain('JOIN auth.users AS users')
    expect(sql).toContain('FROM auth.identities AS identities')
    expect(sql).not.toMatch(
      /\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?auth\./i,
    )
    expect(sql).not.toContain('76000000-')
  })

  it('hard-blocks every target except the exact staging project', () => {
    expect(assertPhase6StagingTarget({
      projectRef: PHASE6_STAGING_PROJECT_REF,
      supabaseUrl: PHASE6_STAGING_SUPABASE_URL,
    })).toMatchObject({ productionExcluded: true })
    expect(() => assertPhase6StagingTarget({
      projectRef: 'njlzossopgknanhkzcbk',
      supabaseUrl: 'https://njlzossopgknanhkzcbk.supabase.co',
    })).toThrow('not the authorized staging project')
  })

  it('refuses the quarantined 76000000 manifest', () => {
    const legacySource = readFileSync(
      resolve(root, 'scripts/preproduction/phase6-seed-manifest.json'),
      'utf8',
    )
    expect(() => verifyPhase6SeedAuthority({
      manifestSource: legacySource,
    })).toThrow('Invalid Phase 6 Auth v2 seed authority')
  })

  it('keeps credential values and local environment fallbacks out of artifacts', () => {
    expect(manifestSource).not.toMatch(
      /\b(?:sk_live|sk_test|pk_live|pk_test|eyJ[A-Za-z0-9_-]*\.)/,
    )
    expect(manifestSource).not.toMatch(
      /"(?:password|secret|token|serviceRole)"\s*:/i,
    )
    expect(provisionerSource).not.toContain('process.env')
    expect(provisionerSource).not.toContain('.env.local')
    expect(provisionerSource).not.toMatch(/\$2[aby]\$\d{2}\$/)
    expect(provisionerSource).not.toContain('updateUserById')
    expect(provisionerSource).not.toContain('deleteUser')
  })

  it('blocks an email collision before requesting credentials or mutating Auth', async () => {
    const colliding = {
      ...canonicalUser(manifest.personas[0]),
      id: '79999999-0000-4000-8000-000000000001',
    }
    const authAdmin = {
      listUsers: vi.fn().mockResolvedValue({
        data: { users: [colliding] },
        error: null,
      }),
      getUserById: vi.fn(),
      createUser: vi.fn(),
    }
    const passwordFor = vi.fn(() => 'x'.repeat(16))

    await expect(provisionPhase6AuthV2({
      authAdmin,
      manifest,
      passwordFor,
    })).rejects.toThrow('preflight is not fully canonical')
    expect(passwordFor).not.toHaveBeenCalled()
    expect(authAdmin.createUser).not.toHaveBeenCalled()
  })

  it('preserves an already canonical cohort without mutation', async () => {
    const users = manifest.personas.map(canonicalUser)
    const authAdmin = {
      listUsers: vi.fn().mockResolvedValue({
        data: { users },
        error: null,
      }),
      getUserById: vi.fn(async (id: string) => ({
        data: { user: users.find((user: { id: string }) => user.id === id) },
        error: null,
      })),
      createUser: vi.fn(),
    }
    const passwordFor = vi.fn(() => 'x'.repeat(16))

    await expect(provisionPhase6AuthV2({
      authAdmin,
      manifest,
      passwordFor,
    })).resolves.toMatchObject({
      status: 'provisioned',
      createdCount: 0,
      preservedCount: 9,
      canonicalCount: 9,
    })
    expect(passwordFor).not.toHaveBeenCalled()
    expect(authAdmin.createUser).not.toHaveBeenCalled()
  })

  it('creates every absent account only through createUser', async () => {
    const users: ReturnType<typeof canonicalUser>[] = []
    const authAdmin = {
      listUsers: vi.fn(async () => ({
        data: { users },
        error: null,
      })),
      getUserById: vi.fn(async (id: string) => ({
        data: { user: users.find(user => user.id === id) },
        error: null,
      })),
      createUser: vi.fn(async (input: {
        id: string
        email: string
        password: string
        email_confirm: boolean
        user_metadata: Record<string, unknown>
      }) => {
        const persona = manifest.personas.find(
          (row: { id: string }) => row.id === input.id,
        )
        users.push(canonicalUser(persona))
        return { data: { user: { id: input.id } }, error: null }
      }),
    }

    await expect(provisionPhase6AuthV2({
      authAdmin,
      manifest,
      passwordFor: () => 'x'.repeat(16),
    })).resolves.toMatchObject({
      status: 'provisioned',
      createdCount: 9,
      preservedCount: 0,
      canonicalCount: 9,
    })
    expect(authAdmin.createUser).toHaveBeenCalledTimes(9)
    expect(authAdmin.createUser).toHaveBeenCalledWith(expect.objectContaining({
      id: manifest.personas[0].id,
      email: manifest.personas[0].email,
      email_confirm: true,
      user_metadata: expectedPhase6AuthMetadata(
        manifest.personas[0],
        manifest.authority,
      ),
    }))
  })

  it('requires nine canonical accounts before the relational seed', () => {
    expect(() => assertSuccessfulPhase6AuthPreflight({
      status: 'ready',
      expectedCount: 9,
      canonicalCount: 8,
      absentCount: 1,
      collisionCount: 0,
    })).toThrow('preflight is not fully canonical')
  })
})
