import { Flex, Text } from '@universe/mycelium'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdvancedSettingsSeparator } from '~/pages/Liquidity/CreateAuction/components/AdvancedSettingsSeparator'
import { KycCard } from '~/pages/Liquidity/CreateAuction/components/KycCard'
import { ZkPassportCard } from '~/pages/Liquidity/CreateAuction/components/ZkPassportCard'

export function AuctionAdvancedSettings() {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Flex gap="$spacing24">
      <AdvancedSettingsSeparator isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />

      {isExpanded && (
        <Flex gap="$spacing12">
          <Flex gap="$spacing4">
            <Text variant="subheading1" $md={{ variant: 'subheading2' }} color="$neutral1">
              {t('toucan.createAuction.step.configureAuction.participation')}
            </Text>
            <Text variant="body3" color="$neutral2">
              {t('toucan.createAuction.step.configureAuction.participation.description')}
            </Text>
          </Flex>

          <Flex row gap="$spacing12" width="100%" $md={{ flexDirection: 'column' }}>
            <Flex flex={1}>
              <KycCard />
            </Flex>
            <Flex flex={1}>
              <ZkPassportCard />
            </Flex>
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}
