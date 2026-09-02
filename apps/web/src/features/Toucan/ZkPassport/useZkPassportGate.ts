import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import type { UniverseChainId } from 'uniswap/src/features/chains/types'
import { assume0xAddress, zeroAddress } from '~/chains'
import { gatedErc1155HookAbi, zkPassportAttestAbi } from '~/features/Toucan/ZkPassport/abi'
import { ZKPASSPORT_ATTEST_REGISTRY, zkPassportVerifyUrl } from '~/features/Toucan/ZkPassport/config'
import { getSessionlessPublicClient } from '~/features/Toucan/ZkPassport/sessionlessClient'

export interface ZkPassportGate {
  /** The auction's validation hook gates on a ZKPassport credential */
  isGated: boolean
  /** Wallet holds a valid, unexpired credential for the hook's policy */
  isEligible: boolean
  /** Still resolving the hook introspection or the balance read */
  isLoading: boolean
  policyId?: bigint
  registry?: `0x${string}`
  /** Opens the ZKPassport verification popup for the hook's policy */
  openVerify: () => void
}

/**
 * Resolves whether an auction's validation hook gates bids on a ZKPassport
 * credential, and whether the connected wallet already holds one. Both reads
 * are the stock ERC-1155 surface (hook.erc1155()/tokenId(), then balanceOf),
 * so no vendor API is involved; the popup handles the actual verification and
 * posts back when a credential is minted, which refreshes the balance read.
 *
 * The reads go through the sessionless public client rather than the app's
 * wagmi transport: the wagmi path is UniRPC, which 401s without a gateway
 * session, and a wrong read failure here surfaces as a spurious
 * "Auction not supported" banner on the bid form.
 */
export function useZkPassportGate({
  chainId,
  validationHook,
  walletAddress,
}: {
  chainId?: UniverseChainId
  validationHook?: string
  walletAddress?: string
}): ZkPassportGate {
  const hookAddress = validationHook && validationHook !== zeroAddress ? assume0xAddress(validationHook) : undefined

  const { data: hookViews, isLoading: isHookLoading } = useQuery({
    queryKey: ['zkpassport-hook-introspection', chainId, hookAddress],
    queryFn: async () => {
      if (!chainId || !hookAddress) {
        throw new Error('chainId and hookAddress required')
      }
      const client = getSessionlessPublicClient(chainId)
      const [registry, tokenId] = await Promise.all([
        client.readContract({
          address: hookAddress,
          abi: gatedErc1155HookAbi,
          functionName: 'erc1155',
        }),
        client.readContract({
          address: hookAddress,
          abi: gatedErc1155HookAbi,
          functionName: 'tokenId',
        }),
      ])
      return { registry, tokenId }
    },
    enabled: Boolean(hookAddress && chainId),
    staleTime: Infinity,
    retry: 1,
  })

  const knownRegistry = chainId ? ZKPASSPORT_ATTEST_REGISTRY[chainId] : undefined
  const hookRegistry = hookViews?.registry
  const policyId = hookViews?.tokenId
  const isGated = Boolean(
    knownRegistry &&
    hookRegistry &&
    policyId !== undefined &&
    hookRegistry.toLowerCase() === knownRegistry.toLowerCase(),
  )

  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['zkpassport-credential-balance', chainId, hookRegistry, policyId?.toString(), walletAddress],
    queryFn: async () => {
      if (!chainId || !hookRegistry || policyId === undefined || !walletAddress) {
        throw new Error('gate introspection and wallet required')
      }
      return getSessionlessPublicClient(chainId).readContract({
        address: hookRegistry,
        abi: zkPassportAttestAbi,
        functionName: 'balanceOf',
        args: [assume0xAddress(walletAddress), policyId],
      })
    },
    enabled: Boolean(isGated && chainId && walletAddress && policyId !== undefined),
  })

  useEffect(() => {
    if (!isGated) {
      return undefined
    }
    const onMessage = (event: MessageEvent): void => {
      const data = event.data as { type?: string; policyId?: string } | null
      if (data?.type === 'zkpassport-attest-result' && data.policyId === policyId?.toString()) {
        void refetchBalance()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [isGated, policyId, refetchBalance])

  const openVerify = useCallback(() => {
    if (chainId && hookRegistry && policyId !== undefined) {
      window.open(
        zkPassportVerifyUrl({ chainId, registry: hookRegistry, policyId }),
        'zkpassport-verify',
        'width=480,height=720',
      )
    }
  }, [chainId, hookRegistry, policyId])

  return useMemo(
    () => ({
      isGated,
      isEligible: isGated && (balance ?? 0n) > 0n,
      isLoading: Boolean(hookAddress) && (isHookLoading || (isGated && Boolean(walletAddress) && isBalanceLoading)),
      policyId: isGated ? policyId : undefined,
      registry: isGated ? hookRegistry : undefined,
      openVerify,
    }),
    [isGated, balance, hookAddress, isHookLoading, walletAddress, isBalanceLoading, policyId, hookRegistry, openVerify],
  )
}
