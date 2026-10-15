import { useQueryClient } from '@tanstack/react-query'
import { UniverseChainId } from '@universe/chains'
import { VerifyWithZKPassport } from '@zkpassport/ui/react-button'
import { useTranslation } from 'react-i18next'
import { getVerifyWalletQueryKey } from 'uniswap/src/data/apiClients/dataApiService/auctions/useVerifyWallet'
import { assume0xAddress } from '~/chains'
import { useActiveAddress } from '~/features/accounts/store/hooks'
import { useVerifyWalletParams } from '~/features/Toucan/Auction/hooks/useVerifyWalletParams'
import { useAuctionStore } from '~/features/Toucan/Auction/store/useAuctionStore'

/** Opens ZKPassport to mint the credential `policyId` defines to the connected wallet. */
export function ZkPassportVerifyButton({ policyId }: { policyId: string }): JSX.Element | null {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const chainId = useAuctionStore((state) => state.auctionDetails?.chainId)
  const walletAddress = useActiveAddress(chainId ?? UniverseChainId.Sepolia)
  const verifyWalletParams = useVerifyWalletParams()

  if (!chainId || !walletAddress) {
    return null
  }

  return (
    <VerifyWithZKPassport
      mint
      policyId={policyId}
      bind={{ account: assume0xAddress(walletAddress), chainId }}
      style={{ label: t('toucan.kyc.verifyIdentity') }}
      // The auction's ERC-1155 gate passes once the credential is minted; refetching it swaps this button for the bid button.
      onSuccess={() => {
        void queryClient.invalidateQueries({ queryKey: getVerifyWalletQueryKey(verifyWalletParams) })
      }}
    />
  )
}
