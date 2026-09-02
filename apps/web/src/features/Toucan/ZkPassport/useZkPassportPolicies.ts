import { useQuery } from '@tanstack/react-query'
import type { UniverseChainId } from 'uniswap/src/features/chains/types'
import { usePublicClient } from 'wagmi'
import { zkPassportAttestAbi, type ZkPassportPolicy } from '~/features/Toucan/ZkPassport/abi'
import { ZKPASSPORT_ATTEST_DEPLOY_BLOCK, ZKPASSPORT_ATTEST_REGISTRY } from '~/features/Toucan/ZkPassport/config'

export interface ZkPassportPolicyOption {
  policyId: bigint
  hook: `0x${string}`
  label: string
  policy: ZkPassportPolicy
}

const policyCreatedEvent = zkPassportAttestAbi.find((entry) => entry.type === 'event' && entry.name === 'PolicyCreated')

/** Compact human-readable summary of what a policy checks. */
export function zkPassportPolicyLabel(policy: ZkPassportPolicy): string {
  const parts: string[] = []
  if (policy.minAge > 0) {
    parts.push(`${policy.minAge}+`)
  }
  if (policy.sanctionsCheck) {
    parts.push('sanctions-clear')
  }
  if (policy.excludedCountries.length > 0) {
    parts.push(`excludes ${policy.excludedCountries.join(', ')}`)
  }
  if (policy.unique) {
    parts.push('one per document')
  }
  return parts.length > 0 ? parts.join(' · ') : 'No requirements'
}

/**
 * Live list of policies on the chain's ZKPassportAttest registry, enumerated
 * from PolicyCreated logs and enriched via getPolicy. Retired policies are
 * dropped. Each option carries its per-policy validation hook — the address
 * the auction's validationHook parameter takes.
 */
export function useZkPassportPolicies(chainId?: UniverseChainId): {
  policies: ZkPassportPolicyOption[]
  isLoading: boolean
} {
  const registry = chainId ? ZKPASSPORT_ATTEST_REGISTRY[chainId] : undefined
  const deployBlock = chainId ? ZKPASSPORT_ATTEST_DEPLOY_BLOCK[chainId] : undefined
  const publicClient = usePublicClient({ chainId })

  const { data, isLoading } = useQuery({
    queryKey: ['zkpassport-policies', chainId, registry],
    enabled: Boolean(registry && publicClient),
    queryFn: async (): Promise<ZkPassportPolicyOption[]> => {
      if (!registry || !publicClient || !policyCreatedEvent) {
        return []
      }
      const logs = await publicClient.getLogs({
        address: registry,
        event: policyCreatedEvent,
        fromBlock: deployBlock ?? 0n,
        toBlock: 'latest',
      })
      const options = await Promise.all(
        logs.map(async (log) => {
          const policyId = log.args.policyId
          if (policyId === undefined) {
            return undefined
          }
          const policy = (await publicClient.readContract({
            address: registry,
            abi: zkPassportAttestAbi,
            functionName: 'getPolicy',
            args: [policyId],
          })) as ZkPassportPolicy
          if (policy.retiredAt !== 0n) {
            return undefined
          }
          return {
            policyId,
            hook: policy.hook,
            label: zkPassportPolicyLabel(policy),
            policy,
          }
        }),
      )
      return options.filter((option): option is ZkPassportPolicyOption => option !== undefined)
    },
  })

  return { policies: data ?? [], isLoading }
}
