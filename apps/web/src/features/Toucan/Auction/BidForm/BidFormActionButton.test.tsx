import { KycVerificationStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { UniverseChainId } from '@universe/chains'
import type { VerifyWithZKPassportProps } from '@zkpassport/ui/react-button'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BidFormActionButton } from '~/features/Toucan/Auction/BidForm/BidFormActionButton'
import type { AuctionKycStatus } from '~/features/Toucan/Auction/hooks/useAuctionKycStatus'
import type { ZkPassportGate } from '~/features/Toucan/ZkPassport/useZkPassportGate'
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

// jsdom cannot parse the real button's stylesheet.
const { mockVerifyWithZKPassport } = vi.hoisted(() => ({
  mockVerifyWithZKPassport: vi.fn((props: VerifyWithZKPassportProps) => (
    <button type="button">{props.style?.label}</button>
  )),
}))
vi.mock('@zkpassport/ui/react-button', () => ({
  VerifyWithZKPassport: (props: VerifyWithZKPassportProps) => mockVerifyWithZKPassport(props),
}))

// What VerifyWallet reports for an auction on the ZKPassport hook, which the backend does not model.
const unmodeledHookStatus: AuctionKycStatus = {
  canBid: true,
  kycButtonDisabled: false,
  onKycAction: undefined,
  isLoading: false,
  isError: false,
  isAllowlisted: false,
  auctionHasPresale: false,
  auctionNeedsVerification: false,
  status: KycVerificationStatus.VERIFICATION_STATUS_UNSPECIFIED,
  hasNoRecognizedValidations: true,
}

function renderActionButton(zkPassportGate: ZkPassportGate): void {
  render(
    <BidFormActionButton
      isGeoRestricted={false}
      needsTestnetModeSwitch={false}
      isWalletConnected
      kycStatus={unmodeledHookStatus}
      zkPassportGate={zkPassportGate}
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
  })

  it('offers ZKPassport verification to a wallet the gate blocks', async () => {
    const refetchCredential = vi.fn()

    renderActionButton({ policyId: 'eip155:11155111:0x7b', canBid: false, refetchCredential })

    expect(await screen.findByRole('button', { name: 'Verify identity to bid' })).toBeInTheDocument()
    expect(mockVerifyWithZKPassport.mock.lastCall?.[0]).toMatchObject({
      mint: true,
      policyId: 'eip155:11155111:0x7b',
      bind: { account: WALLET, chainId: UniverseChainId.Sepolia },
      onSuccess: refetchCredential,
    })
  })

  it('offers the bid to a wallet the gate lets through', () => {
    renderActionButton({ policyId: 'eip155:11155111:0x7b', canBid: true, refetchCredential: vi.fn() })

    expect(screen.getByText('Review bid')).toBeInTheDocument()
    expect(mockVerifyWithZKPassport).not.toHaveBeenCalled()
  })
})
