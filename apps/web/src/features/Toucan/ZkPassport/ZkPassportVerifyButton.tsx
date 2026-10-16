import { UniverseChainId } from '@universe/chains'
import { styled } from '@universe/mycelium/styled'
import { VerifyWithZKPassport } from '@zkpassport/ui/react-button'
import { useTranslation } from 'react-i18next'
import { assume0xAddress } from '~/chains'
import { useActiveAddress } from '~/features/accounts/store/hooks'
import { useAuctionStore } from '~/features/Toucan/Auction/store/useAuctionStore'

// ZKPassport's button stops at 360px, narrower than the bid panel, so it sits centered.
const Centered = styled('div', {
  platform: 'web',
  base: 'flex w-full justify-center',
})

/** Opens ZKPassport to mint the credential `policyId` defines to the connected wallet. */
export function ZkPassportVerifyButton({
  policyId,
  onMinted,
}: {
  policyId: string
  onMinted: () => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const chainId = useAuctionStore((state) => state.auctionDetails?.chainId)
  const walletAddress = useActiveAddress(chainId ?? UniverseChainId.Sepolia)

  if (!chainId || !walletAddress) {
    return null
  }

  return (
    <Centered>
      <VerifyWithZKPassport
        mint
        policyId={policyId}
        bind={{ account: assume0xAddress(walletAddress), chainId }}
        style={{ variant: 'outline', label: t('toucan.kyc.verifyIdentityPrivately') }}
        onSuccess={onMinted}
      />
    </Centered>
  )
}
