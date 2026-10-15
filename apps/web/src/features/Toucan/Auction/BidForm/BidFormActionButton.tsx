import { KycVerificationStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { lazy, Suspense } from 'react'
import { ToucanGeoRestrictionCard } from '~/components/GeoRestriction/ToucanGeoRestrictionCard'
import type { useAuctionKycStatus } from '~/features/Toucan/Auction/hooks/useAuctionKycStatus'
import { KycActionButton } from '~/features/Toucan/Shared/KycActionButton'
import { ToucanActionButton } from '~/features/Toucan/Shared/ToucanActionButton'
import { useZkPassportPolicyId } from '~/features/Toucan/ZkPassport/useZkPassportPolicyId'

const ZkPassportVerifyButton = lazy(() =>
  import('~/features/Toucan/ZkPassport/ZkPassportVerifyButton').then((module) => ({
    default: module.ZkPassportVerifyButton,
  })),
)

interface BidFormActionButtonProps {
  isGeoRestricted: boolean
  geoTokenSymbol?: string
  needsTestnetModeSwitch: boolean
  isWalletConnected: boolean
  kycStatus: ReturnType<typeof useAuctionKycStatus>
  buttonLabel: string
  buttonDisabled: boolean
  onButtonPress: () => void
  onKycRejected: () => void
  onKycInterstitial: () => void
}

/**
 * The bid panel's primary CTA plus the geo-restriction info card. Extracted from BidForm to keep
 * its complexity within bounds. A geo-restricted auction token (LP-946) takes precedence over the
 * KYC button: the CTA is the disabled "unavailable in your region" button and the card renders below.
 */
export function BidFormActionButton({
  isGeoRestricted,
  geoTokenSymbol,
  needsTestnetModeSwitch,
  isWalletConnected,
  kycStatus,
  buttonLabel,
  buttonDisabled,
  onButtonPress,
  onKycRejected,
  onKycInterstitial,
}: BidFormActionButtonProps): JSX.Element {
  const zkPassportPolicyId = useZkPassportPolicyId({ hasErc1155Gate: kycStatus.auctionHasPresale })

  const canShowVerification = !isGeoRestricted && !needsTestnetModeSwitch && isWalletConnected
  // An ERC-1155 gate on a ZKPassport credential is passed by minting the credential, not by waiting for an allowlist.
  const showZkPassportButton = canShowVerification && zkPassportPolicyId !== undefined && !kycStatus.isAllowlisted
  const showKycButton = canShowVerification && Boolean(kycStatus.kycButtonLabel || kycStatus.whitelistLabel)

  return (
    <>
      {showZkPassportButton ? (
        <Suspense fallback={null}>
          <ZkPassportVerifyButton policyId={zkPassportPolicyId} />
        </Suspense>
      ) : showKycButton ? (
        <KycActionButton
          kycStatus={kycStatus}
          onPress={() =>
            kycStatus.status === KycVerificationStatus.VERIFICATION_STATUS_REJECTED
              ? onKycRejected()
              : onKycInterstitial()
          }
        />
      ) : (
        <ToucanActionButton
          label={buttonLabel}
          isDisabled={buttonDisabled}
          onPress={onButtonPress}
          shouldUseSoftBranded={!isWalletConnected}
        />
      )}
      {isGeoRestricted && <ToucanGeoRestrictionCard tokenSymbol={geoTokenSymbol} />}
    </>
  )
}
