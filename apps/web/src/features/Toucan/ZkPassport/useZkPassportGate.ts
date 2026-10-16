import { areAddressesEqual, isEVMChain, UniverseChainId } from '@universe/chains'
import { useReadContract, useReadContracts } from 'wagmi'
import { assume0xAddress } from '~/chains'
import { useActiveAddress } from '~/features/accounts/store/hooks'
import { useAuctionStore } from '~/features/Toucan/Auction/store/useAuctionStore'
import { ZKPASSPORT_VALIDATION_HOOKS } from '~/features/Toucan/ZkPassport/config'

export interface ZkPassportGate {
  /** The auction's ZKPassport policy, as an `eip155:<chainId>:0x<tokenId>` policy id */
  policyId: string
  /** The connected wallet may bid: it holds the credential, or the gate has expired */
  canBid: boolean
  /** Read the wallet's credential again, e.g. after minting it */
  refetchCredential: () => void
}

/**
 * The ZKPassport gate of the current auction, when its validation hook is the
 * SingletonGatedERC1155ValidationHook and the auction is registered with it.
 */
export function useZkPassportGate(): ZkPassportGate | undefined {
  const chainId = useAuctionStore((state) => state.auctionDetails?.chainId)
  const auctionAddress = useAuctionStore((state) => state.auctionAddress)
  const validationHook = useAuctionStore((state) => state.auctionDetails?.validationHook)
  const currentBlockNumber = useAuctionStore((state) => state.currentBlockNumber)
  const walletAddress = useActiveAddress(chainId ?? UniverseChainId.Sepolia)

  const evmChainId = chainId && isEVMChain(chainId) ? chainId : undefined
  const zkPassportHook = evmChainId ? ZKPASSPORT_VALIDATION_HOOKS[evmChainId] : undefined
  const isZkPassportHook = isZkPassportValidationHook({ chainId, validationHook })

  const { data: hookViews } = useReadContracts({
    contracts: [
      { address: assume0xAddress(zkPassportHook), chainId: evmChainId, abi: singletonHookAbi, functionName: 'erc1155' },
      {
        address: assume0xAddress(zkPassportHook),
        chainId: evmChainId,
        abi: singletonHookAbi,
        functionName: 'configOf',
        args: [assume0xAddress(auctionAddress ?? '')],
      },
    ],
    // A registered auction's config never changes, and neither does the credentials contract.
    query: { enabled: isZkPassportHook && Boolean(auctionAddress), staleTime: Infinity },
  })
  const credentialsAddress = hookViews?.[0].result
  const config = hookViews?.[1].result

  const { data: credentialBalance, refetch } = useReadContract({
    address: credentialsAddress,
    chainId: evmChainId,
    abi: erc1155BalanceOfAbi,
    functionName: 'balanceOf',
    args: [assume0xAddress(walletAddress ?? ''), config?.tokenId ?? 0n],
    query: { enabled: Boolean(credentialsAddress && config?.registered && walletAddress) },
  })

  if (!isZkPassportHook || !evmChainId || !config?.registered) {
    return undefined
  }

  const hasExpired = currentBlockNumber !== undefined && BigInt(currentBlockNumber) >= config.expirationBlock
  return {
    policyId: `eip155:${evmChainId}:0x${config.tokenId.toString(16)}`,
    canBid: hasExpired || (credentialBalance ?? 0n) > 0n,
    refetchCredential: () => {
      void refetch()
    },
  }
}

/** Whether `validationHook` is the SingletonGatedERC1155ValidationHook deployed on `chainId`. */
export function isZkPassportValidationHook({
  chainId,
  validationHook,
}: {
  chainId?: UniverseChainId
  validationHook?: string
}): boolean {
  const zkPassportHook = chainId ? ZKPASSPORT_VALIDATION_HOOKS[chainId] : undefined
  return Boolean(
    chainId &&
    zkPassportHook &&
    areAddressesEqual({
      addressInput1: { address: validationHook, chainId },
      addressInput2: { address: zkPassportHook, chainId },
    }),
  )
}

// The views of ISingletonGatedERC1155ValidationHook this hook reads.
const singletonHookAbi = [
  {
    type: 'function',
    name: 'erc1155',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'configOf',
    stateMutability: 'view',
    inputs: [{ name: 'auction', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'expirationBlock', type: 'uint64' },
          { name: 'registered', type: 'bool' },
        ],
      },
    ],
  },
] as const

const erc1155BalanceOfAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const
