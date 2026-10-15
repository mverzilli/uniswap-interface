import { areAddressesEqual, isEVMChain, UniverseChainId, zeroAddress } from '@universe/chains'
import { useReadContracts } from 'wagmi'
import { assume0xAddress } from '~/chains'
import { useAuctionStore } from '~/features/Toucan/Auction/store/useAuctionStore'

/** ZKPassportCredentials, the soulbound ERC-1155 contract whose token ids are ZKPassport policies. */
const ZKPASSPORT_CREDENTIALS_ADDRESSES: Partial<Record<UniverseChainId, string>> = {
  [UniverseChainId.Mainnet]: '0x000C558ea450790ad88f4f15A302B8F2C9b60d6C',
  [UniverseChainId.Sepolia]: '0x000C558ea450790ad88f4f15A302B8F2C9b60d6C',
}

// The getters of IBaseERC1155ValidationHook, from the continuous-clearing-auction repo.
const erc1155ValidationHookAbi = [
  {
    type: 'function',
    name: 'erc1155',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

/**
 * The ZKPassport policy the current auction's ERC-1155 validation hook requires, as an
 * `eip155:<chainId>:0x<tokenId>` policy id. Undefined when the hook gates on any other token.
 */
export function useZkPassportPolicyId({ hasErc1155Gate }: { hasErc1155Gate: boolean }): string | undefined {
  const chainId = useAuctionStore((state) => state.auctionDetails?.chainId)
  const validationHook = useAuctionStore((state) => state.auctionDetails?.validationHook)

  const evmChainId = chainId && isEVMChain(chainId) ? chainId : undefined
  const credentialsAddress = evmChainId ? ZKPASSPORT_CREDENTIALS_ADDRESSES[evmChainId] : undefined
  const hookAddress = validationHook && validationHook !== zeroAddress ? assume0xAddress(validationHook) : undefined

  const { data } = useReadContracts({
    contracts: [
      { address: hookAddress, chainId: evmChainId, abi: erc1155ValidationHookAbi, functionName: 'erc1155' },
      { address: hookAddress, chainId: evmChainId, abi: erc1155ValidationHookAbi, functionName: 'tokenId' },
    ],
    // Both getters return immutables.
    query: { enabled: hasErc1155Gate && Boolean(hookAddress && credentialsAddress), staleTime: Infinity },
  })

  const gatingToken = data?.[0].result
  const tokenId = data?.[1].result
  if (!hasErc1155Gate || !evmChainId || !gatingToken || tokenId === undefined) {
    return undefined
  }

  const isZkPassportCredential = areAddressesEqual({
    addressInput1: { address: gatingToken, chainId: evmChainId },
    addressInput2: { address: credentialsAddress, chainId: evmChainId },
  })
  return isZkPassportCredential ? `eip155:${evmChainId}:0x${tokenId.toString(16)}` : undefined
}
