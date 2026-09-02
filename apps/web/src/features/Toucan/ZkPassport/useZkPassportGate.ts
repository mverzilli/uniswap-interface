import { useCallback, useEffect, useMemo } from 'react'
import type { EVMUniverseChainId, UniverseChainId } from 'uniswap/src/features/chains/types'
import { useReadContract, useReadContracts } from 'wagmi'
import { assume0xAddress, zeroAddress } from '~/chains'
import { gatedErc1155HookAbi, zkPassportAttestAbi } from '~/features/Toucan/ZkPassport/abi'
import { ZKPASSPORT_ATTEST_REGISTRY, zkPassportVerifyUrl } from '~/features/Toucan/ZkPassport/config'

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
  const evmChainId = chainId as EVMUniverseChainId | undefined
  const hookAddress = validationHook && validationHook !== zeroAddress ? assume0xAddress(validationHook) : undefined

  const { data: hookViews, isLoading: isHookLoading } = useReadContracts({
    contracts: [
      {
        address: hookAddress,
        chainId: evmChainId,
        abi: gatedErc1155HookAbi,
        functionName: 'erc1155',
      },
      {
        address: hookAddress,
        chainId: evmChainId,
        abi: gatedErc1155HookAbi,
        functionName: 'tokenId',
      },
    ],
    query: {
      enabled: Boolean(hookAddress && chainId),
      staleTime: Infinity,
      retry: 1,
    },
  })

  const knownRegistry = chainId ? ZKPASSPORT_ATTEST_REGISTRY[chainId] : undefined
  const hookRegistry = hookViews?.[0].result
  const policyId = hookViews?.[1].result
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
  } = useReadContract({
    address: isGated ? hookRegistry : undefined,
    chainId: evmChainId,
    abi: zkPassportAttestAbi,
    functionName: 'balanceOf',
    args: walletAddress && policyId !== undefined ? [assume0xAddress(walletAddress), policyId] : undefined,
    query: {
      enabled: Boolean(isGated && walletAddress && policyId !== undefined),
    },
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
