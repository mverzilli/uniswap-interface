import { KycVerificationStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { UniverseChainId } from '@universe/chains'
import type { VerifyWithZKPassportProps } from '@zkpassport/ui/react-button'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BidFormActionButton } from '~/features/Toucan/Auction/BidForm/BidFormActionButton'
import type { AuctionKycStatus } from '~/features/Toucan/Auction/hooks/useAuctionKycStatus'
import { render, screen } from '~/test-utils/render'

const WALLET = '0x3333333333333333333333333333333333333333'

const mockStoreState = { auctionDetails: { chainId: UniverseChainId.Sepolia } }
vi.mock('~/features/Toucan/Auction/store/useAuctionStore', () => ({
  useAuctionStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}))
vi.mock('~/features/accounts/store/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/features/accounts/store/hooks')>()),
  useActiveAddress: () => WALLET,
}))
vi.mock('~/features/Toucan/Auction/hooks/useVerifyWalletParams', () => ({
  useVerifyWalletParams: () => ({ walletAddress: WALLET }),
}))

// jsdom cannot parse the real button's stylesheet.
const { mockVerifyWithZKPassport } = vi.hoisted(() => ({
  mockVerifyWithZKPassport: vi.fn((props: VerifyWithZKPassportProps) => (
    <button type="button">{props.style?.label}</button>
  )),
}))
vi.mock('@zkpassport/ui/react-button', () => ({
  VerifyWithZKPassport: (props: VerifyWithZKPassportProps) => mockVerifyWithZKPassport(props),
}))

let mockZkPassportPolicyId: string | undefined
vi.mock('~/features/Toucan/ZkPassport/useZkPassportPolicyId', () => ({
  useZkPassportPolicyId: () => mockZkPassportPolicyId,
}))

function erc1155GateStatus({ isAllowlisted }: { isAllowlisted: boolean }): AuctionKycStatus {
  return {
    canBid: true,
    whitelistLabel: isAllowlisted ? undefined : 'General sale starts soon',
    kycButtonDisabled: false,
    onKycAction: undefined,
    isLoading: false,
    isError: false,
    isAllowlisted,
    auctionHasPresale: true,
    auctionNeedsVerification: false,
    status: KycVerificationStatus.VERIFICATION_STATUS_UNSPECIFIED,
    hasNoRecognizedValidations: false,
  }
}

function renderActionButton(kycStatus: AuctionKycStatus): void {
  render(
    <BidFormActionButton
      isGeoRestricted={false}
      needsTestnetModeSwitch={false}
      isWalletConnected
      kycStatus={kycStatus}
      buttonLabel="Review bid"
      buttonDisabled={false}
      onButtonPress={vi.fn()}
      onKycRejected={vi.fn()}
      onKycInterstitial={vi.fn()}
    />,
  )
}

describe('BidFormActionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockZkPassportPolicyId = 'eip155:11155111:0x7b'
  })

  it('offers ZKPassport verification to a wallet without the credential the gate requires', async () => {
    renderActionButton(erc1155GateStatus({ isAllowlisted: false }))

    expect(await screen.findByRole('button', { name: 'Verify identity to bid' })).toBeInTheDocument()
    expect(mockVerifyWithZKPassport.mock.lastCall?.[0]).toMatchObject({
      mint: true,
      policyId: 'eip155:11155111:0x7b',
      bind: { account: WALLET, chainId: UniverseChainId.Sepolia },
    })
    expect(screen.queryByText('General sale starts soon')).not.toBeInTheDocument()
  })

  it('offers the bid once the wallet holds the credential', () => {
    renderActionButton(erc1155GateStatus({ isAllowlisted: true }))

    expect(screen.getByText('Review bid')).toBeInTheDocument()
    expect(mockVerifyWithZKPassport).not.toHaveBeenCalled()
  })

  it('keeps the allowlist label for an ERC-1155 gate on any other token', () => {
    mockZkPassportPolicyId = undefined

    renderActionButton(erc1155GateStatus({ isAllowlisted: false }))

    expect(screen.getByText('General sale starts soon')).toBeInTheDocument()
    expect(mockVerifyWithZKPassport).not.toHaveBeenCalled()
  })
})
