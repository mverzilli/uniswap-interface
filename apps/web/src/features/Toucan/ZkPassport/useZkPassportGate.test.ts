import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useZkPassportGate } from '~/features/Toucan/ZkPassport/useZkPassportGate'

const ZKPASSPORT_HOOK = '0x2222222222222222222222222222222222222222'
const OTHER_HOOK = '0x4444444444444444444444444444444444444444'
const CREDENTIALS = '0x000C558ea450790ad88f4f15A302B8F2C9b60d6C'
const AUCTION = '0x5555555555555555555555555555555555555555'
const WALLET = '0x3333333333333333333333333333333333333333'

vi.mock('~/features/Toucan/ZkPassport/config', () => ({
  ZKPASSPORT_VALIDATION_HOOKS: { 11155111: '0x2222222222222222222222222222222222222222' },
}))

const mockStoreState = {
  auctionAddress: AUCTION,
  currentBlockNumber: 100 as number | undefined,
  auctionDetails: { chainId: UniverseChainId.Sepolia, validationHook: ZKPASSPORT_HOOK } as {
    chainId?: number
    validationHook?: string
  } | null,
}
vi.mock('~/features/Toucan/Auction/store/useAuctionStore', () => ({
  useAuctionStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}))
vi.mock('~/features/accounts/store/hooks', () => ({
  useActiveAddress: () => WALLET,
}))

const mockChain = {
  config: { tokenId: 123n, expirationBlock: 2n ** 64n - 1n, registered: true },
  credentialBalance: 0n,
}
const mockRefetch = vi.fn()
vi.mock('wagmi', () => ({
  useReadContracts: (params: { query: { enabled: boolean } }) => ({
    data: params.query.enabled
      ? [
          { status: 'success', result: CREDENTIALS },
          { status: 'success', result: mockChain.config },
        ]
      : undefined,
  }),
  useReadContract: (params: { query: { enabled: boolean } }) => ({
    data: params.query.enabled ? mockChain.credentialBalance : undefined,
    refetch: mockRefetch,
  }),
}))

describe('useZkPassportGate', () => {
  beforeEach(() => {
    mockStoreState.currentBlockNumber = 100
    mockStoreState.auctionDetails = { chainId: UniverseChainId.Sepolia, validationHook: ZKPASSPORT_HOOK }
    mockChain.config = { tokenId: 123n, expirationBlock: 2n ** 64n - 1n, registered: true }
    mockChain.credentialBalance = 0n
  })

  it('names the auction policy and blocks a wallet without the credential', () => {
    const { result } = renderHook(() => useZkPassportGate())

    expect(result.current?.policyId).toBe('eip155:11155111:0x7b')
    expect(result.current?.canBid).toBe(false)
  })

  it('lets a wallet holding the credential bid', () => {
    mockChain.credentialBalance = 1n

    const { result } = renderHook(() => useZkPassportGate())

    expect(result.current?.canBid).toBe(true)
  })

  it('lets any wallet bid once the gate has expired', () => {
    mockChain.config = { tokenId: 123n, expirationBlock: 100n, registered: true }

    const { result } = renderHook(() => useZkPassportGate())

    expect(result.current?.canBid).toBe(true)
  })

  it('returns undefined when the auction uses another validation hook', () => {
    mockStoreState.auctionDetails = { chainId: UniverseChainId.Sepolia, validationHook: OTHER_HOOK }

    const { result } = renderHook(() => useZkPassportGate())

    expect(result.current).toBeUndefined()
  })

  it('returns undefined when the auction is not registered with the hook', () => {
    mockChain.config = { tokenId: 0n, expirationBlock: 0n, registered: false }

    const { result } = renderHook(() => useZkPassportGate())

    expect(result.current).toBeUndefined()
  })
})
