import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { AI_GOLDEN_CONTRACTS, canonicalSerialize } from '../fixtures/ai-golden'

const digest = (value: unknown) => createHash('sha256').update(canonicalSerialize(value)).digest('hex')

describe('AI golden contracts', () => {
  it('covers every runtime AI entry point exactly once', () => {
    expect(AI_GOLDEN_CONTRACTS).toHaveLength(15)
    expect(new Set(AI_GOLDEN_CONTRACTS.map(contract => contract.id)).size).toBe(15)
    expect(new Set(AI_GOLDEN_CONTRACTS.map(contract => contract.entryPoint)).size).toBe(15)
  })

  it.each(AI_GOLDEN_CONTRACTS)('$id keeps its exact provider invocation', contract => {
    expect(digest(contract.invocation())).toBe(contract.expectedInvocationSha256)
  })

  it('is deterministic, immutable and keeps shared contracts byte-identical', () => {
    const first = AI_GOLDEN_CONTRACTS.map(contract => digest(contract.invocation()))
    const second = AI_GOLDEN_CONTRACTS.map(contract => digest(contract.invocation()))
    expect(second).toEqual(first)
    expect(first[7]).toBe(first[8])
    expect(first[13]).toBe(first[14])
    expect(AI_GOLDEN_CONTRACTS.every(contract => Object.isFrozen(contract.invocation()))).toBe(true)
  })

  it('provides public success, failure and invalid fixtures for every entry point', () => {
    for (const contract of AI_GOLDEN_CONTRACTS) {
      expect(contract.publicCases.success).toBeDefined()
      expect(contract.publicCases.failure).toBeDefined()
      expect(contract.publicCases.invalid).toBeDefined()
      expect(() => canonicalSerialize(contract.publicCases)).not.toThrow()
    }
  })

  it('never embeds secret-shaped fixture values', () => {
    const serialized = canonicalSerialize(AI_GOLDEN_CONTRACTS.map(contract => ({ ...contract, invocation: contract.invocation() })))
    expect(serialized).not.toMatch(/sk-ant-|service_role|authorization|bearer\s|eyJ[A-Za-z0-9_-]{10,}/i)
  })
})

describe('canonical AI golden serializer', () => {
  it('sorts object keys but preserves arrays and exact strings', () => {
    expect(canonicalSerialize({ z: 'ligne 1\nligne 2', a: [2, 1] })).toBe('{"a":[2,1],"z":"ligne 1\\nligne 2"}')
    expect(canonicalSerialize({ value: BigInt(12) })).toBe('{"value":{"$bigint":"12"}}')
  })

  it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY, () => undefined, Symbol('x')])('rejects unsupported value %s', value => {
    expect(() => canonicalSerialize(value)).toThrow(TypeError)
  })
})
