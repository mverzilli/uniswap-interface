import { isEVMChain } from '@universe/chains'
import { Button, Flex, Text, TouchableArea } from '@universe/mycelium'
import { Check } from '@universe/mycelium/icons/Check'
import { UserCheck } from '@universe/mycelium/icons/UserCheck'
import { X } from '@universe/mycelium/icons/X'
import { type PropsWithChildren, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ZKPASSPORT_VALIDATION_HOOKS } from '~/features/Toucan/ZkPassport/config'
import { getZkPassportPolicyLabel } from '~/features/Toucan/ZkPassport/policyIds'
import { ZkPassportPolicyModal } from '~/pages/Liquidity/CreateAuction/components/ZkPassportPolicyModal'
import {
  useCreateAuctionStore,
  useCreateAuctionStoreActions,
} from '~/pages/Liquidity/CreateAuction/CreateAuctionContext'

/** Gates the auction on a ZKPassport policy, on chains where the ZKPassport validation hook is deployed. */
export function ZkPassportCard() {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const zkPassportPolicyId = useCreateAuctionStore((s) => s.configureAuction.zkPassportPolicyId)
  const committed = useCreateAuctionStore((s) => s.configureAuction.committed)
  const { setZkPassportPolicyId } = useCreateAuctionStoreActions()

  const chainId = committed?.totalSupply.currency.chainId
  if (!chainId || !isEVMChain(chainId) || !ZKPASSPORT_VALIDATION_HOOKS[chainId]) {
    return null
  }

  if (zkPassportPolicyId) {
    return (
      <ZkPassportCardShell>
        <Flex row alignItems="center" justifyContent="space-between" width="100%" gap={10}>
          <ZkPassportCardTitleRow />
          <Flex
            row
            alignItems="center"
            gap={2}
            px="$spacing4"
            py="$spacing2"
            borderRadius="$rounded6"
            backgroundColor="$accent1"
            flexShrink={0}
          >
            <Check size="$icon.12" color="$surface1" />
            <Text fontSize={8} lineHeight={12} fontWeight="$medium" color="$surface1">
              {t('toucan.createAuction.step.configureAuction.kyc.card.enabledBadge')}
            </Text>
          </Flex>
        </Flex>

        <Text variant="body4" color="$neutral1">
          {t('toucan.createAuction.step.configureAuction.zkPassport.description')}
        </Text>

        <Flex
          row
          alignItems="center"
          gap="$spacing4"
          width="100%"
          px="$spacing12"
          py="$spacing8"
          borderRadius="$rounded12"
          backgroundColor="$surface3"
        >
          <UserCheck color="$neutral1" size="$icon.16" />
          <Text variant="buttonLabel4" color="$neutral1" flex={1}>
            {getZkPassportPolicyLabel(chainId, zkPassportPolicyId)}
          </Text>
          <TouchableArea
            onPress={() => setZkPassportPolicyId(undefined)}
            hitSlop={8}
            opacity={0.6}
            hoverStyle={{ opacity: 1 }}
          >
            <X color="$neutral1" size="$icon.16" />
          </TouchableArea>
        </Flex>
      </ZkPassportCardShell>
    )
  }

  return (
    <>
      <ZkPassportCardShell>
        <ZkPassportCardTitleRow />

        <Text variant="body4" color="$neutral1">
          {t('toucan.createAuction.step.configureAuction.zkPassport.description')}
        </Text>

        <Flex row>
          <Button size="small" emphasis="secondary" fill onPress={() => setModalOpen(true)}>
            {t('toucan.createAuction.step.configureAuction.zkPassport.setUp')}
          </Button>
        </Flex>
      </ZkPassportCardShell>

      <ZkPassportPolicyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        chainId={chainId}
        onAccepted={setZkPassportPolicyId}
      />
    </>
  )
}

function ZkPassportCardShell({ children }: PropsWithChildren) {
  return (
    <Flex borderWidth={1} borderColor="$surface3" borderRadius="$rounded12" p="$spacing12" gap="$spacing8" width="100%">
      {children}
    </Flex>
  )
}

function ZkPassportCardTitleRow() {
  const { t } = useTranslation()
  return (
    <Flex row alignItems="center" flexShrink={1} flexWrap="wrap" gap="$spacing4">
      <Text variant="buttonLabel3" color="$neutral1">
        {t('toucan.createAuction.step.configureAuction.zkPassport')}
      </Text>
      <Text variant="buttonLabel3" color="$neutral2">
        {t('toucan.createAuction.step.configureAuction.zkPassport.provider')}
      </Text>
    </Flex>
  )
}
