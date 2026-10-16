import type { UniverseChainId } from '@universe/chains'
import { ZKPASSPORT_DEFAULT_POLICIES } from '~/features/Toucan/ZkPassport/config'

/** Read a policy id typed as 0x-prefixed hex or as decimal, as 32-byte 0x-prefixed hex. */
export function parseZkPassportPolicyId(input: string): string | undefined {
  const trimmed = input.trim()
  if (!/^(0x[0-9a-fA-F]{1,64}|\d{1,78})$/.test(trimmed)) {
    return undefined
  }

  const policyId = BigInt(trimmed)
  if (policyId === 0n || policyId >= 2n ** 256n) {
    return undefined
  }
  return `0x${policyId.toString(16).padStart(64, '0')}`
}

/** The label of a default policy, or the policy id shortened for display. */
export function getZkPassportPolicyLabel(chainId: UniverseChainId, policyId: string): string {
  const defaultPolicy = ZKPASSPORT_DEFAULT_POLICIES[chainId]?.find(
    (policy) => BigInt(policy.policyId) === BigInt(policyId),
  )
  return defaultPolicy?.label ?? `${policyId.slice(0, 6)}…${policyId.slice(-4)}`
}
