import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useZkPassportPolicyId } from '~/features/Toucan/ZkPassport/useZkPassportPolicyId'

const ZKPASSPORT_CREDENTIALS = '0x000C558ea450790ad88f4f15A302B8F2C9b60d6C'
const OTHER_ERC1155 = '0x1111111111111111111111111111111111111111'
const VALIDATION_HOOK = '0x2222222222222222222222222222222222222222'

const mockStoreState = {
  auctionDetails: null as { chainId?: number; validationHook?: string } | null,
}
vi.mock('~/features/Toucan/Auction/store/useAuctionStore', () => ({
  useAuctionStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}))

const mockHookGetters: { erc1155: string; tokenId: bigint } = { erc1155: ZKPASSPORT_CREDENTIALS, tokenId: 0n }
const mockUseReadContracts = vi.fn((params: { query: { enabled: boolean } }) => ({
  data: params.query.enabled
    ? [
        { status: 'success', result: mockHookGetters.erc1155 },
        { status: 'success', result: mockHookGetters.tokenId },
      ]
    : undefined,
}))
vi.mock('wagmi', () => ({
  useReadContracts: (params: unknown) => mockUseReadContracts(params as never),
}))

describe('useZkPassportPolicyId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState.auctionDetails = { chainId: UniverseChainId.Sepolia, validationHook: VALIDATION_HOOK }
    mockHookGetters.erc1155 = ZKPASSPORT_CREDENTIALS
    mockHookGetters.tokenId = 123n
  })

  it('returns the chain-scoped policy id when the ERC-1155 gate checks a ZKPassport credential', () => {
    const { result } = renderHook(() => useZkPassportPolicyId({ hasErc1155Gate: true }))

    expect(result.current).toBe('eip155:11155111:0x7b')
  })

  it('matches the credentials contract regardless of address casing', () => {
    mockHookGetters.erc1155 = ZKPASSPORT_CREDENTIALS.toLowerCase()

    const { result } = renderHook(() => useZkPassportPolicyId({ hasErc1155Gate: true }))

    expect(result.current).toBe('eip155:11155111:0x7b')
  })

  it('returns undefined when the ERC-1155 gate checks another token', () => {
    mockHookGetters.erc1155 = OTHER_ERC1155

    const { result } = renderHook(() => useZkPassportPolicyId({ hasErc1155Gate: true }))

    expect(result.current).toBeUndefined()
  })

  it('returns undefined when the auction has no ERC-1155 gate', () => {
    const { result } = renderHook(() => useZkPassportPolicyId({ hasErc1155Gate: false }))

    expect(result.current).toBeUndefined()
  })

  it('returns undefined on a chain without a ZKPassport credentials deployment', () => {
    mockStoreState.auctionDetails = { chainId: UniverseChainId.Base, validationHook: VALIDATION_HOOK }

    const { result } = renderHook(() => useZkPassportPolicyId({ hasErc1155Gate: true }))

    expect(result.current).toBeUndefined()
  })
})
