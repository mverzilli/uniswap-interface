import { UniverseChainId } from '@universe/chains'
import { describe, expect, it, vi } from 'vitest'
import { getZkPassportPolicyLabel, parseZkPassportPolicyId } from '~/features/Toucan/ZkPassport/policyIds'

vi.mock('~/features/Toucan/ZkPassport/config', () => ({
  ZKPASSPORT_DEFAULT_POLICIES: {
    11155111: [{ policyId: '0x000000000000000000000000000000000000000000000000000000000000007b', label: 'Age 18+' }],
  },
}))

const POLICY_123 = '0x000000000000000000000000000000000000000000000000000000000000007b'

describe('parseZkPassportPolicyId', () => {
  it('reads hex and decimal ids as 32-byte hex', () => {
    expect(parseZkPassportPolicyId('0x7b')).toBe(POLICY_123)
    expect(parseZkPassportPolicyId(' 123 ')).toBe(POLICY_123)
  })

  it('rejects text that is not a policy id', () => {
    expect(parseZkPassportPolicyId('')).toBeUndefined()
    expect(parseZkPassportPolicyId('0x')).toBeUndefined()
    expect(parseZkPassportPolicyId('0xzz')).toBeUndefined()
    expect(parseZkPassportPolicyId('0')).toBeUndefined()
    expect(parseZkPassportPolicyId(`0x1${'0'.repeat(64)}`)).toBeUndefined()
  })
})

describe('getZkPassportPolicyLabel', () => {
  it('names a default policy, however its id is written', () => {
    expect(getZkPassportPolicyLabel(UniverseChainId.Sepolia, '0x7b')).toBe('Age 18+')
  })

  it('shortens the id of any other policy', () => {
    const otherPolicy = '0x30f7cf0302dbd1a1f9a8ba88eeee8478a2106890e3181dfa1ba22876362ba12f'

    expect(getZkPassportPolicyLabel(UniverseChainId.Sepolia, otherPolicy)).toBe('0x30f7…a12f')
  })
})
