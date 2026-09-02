import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Flex, Text } from 'ui/src'
import { Check } from 'ui/src/components/icons/Check'
import type { UniverseChainId } from 'uniswap/src/features/chains/types'
import { Dropdown, InternalMenuItem } from '~/components/Dropdowns/Dropdown'
import { ZKPASSPORT_CREATE_POLICY_URL } from '~/features/Toucan/ZkPassport/config'
import { useZkPassportPolicies } from '~/features/Toucan/ZkPassport/useZkPassportPolicies'
import { ExternalLink } from '~/theme/components/Links'

/**
 * "Use ZKPassport" checkbox plus a dropdown of ready-made policies fetched
 * live from the chain's ZKPassportAttest registry. Selecting a policy hands
 * its validation-hook address to the caller — the same value the manual
 * "enter a hook address" path produces.
 */
export function ZkPassportPolicyPicker({
  chainId,
  onSelectHook,
}: {
  chainId: UniverseChainId
  onSelectHook: (hookAddress: string | undefined) => void
}) {
  const { t } = useTranslation()
  const [useZkPassport, setUseZkPassport] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedPolicyId, setSelectedPolicyId] = useState<bigint | undefined>()
  const { policies, isLoading } = useZkPassportPolicies(chainId)

  const selected = policies.find((option) => option.policyId === selectedPolicyId)

  const toggle = (checked: boolean) => {
    setUseZkPassport(checked)
    if (!checked) {
      setSelectedPolicyId(undefined)
      onSelectHook(undefined)
    }
  }

  return (
    <Flex gap="$spacing8">
      <Flex row alignItems="center" gap="$spacing8">
        <Checkbox size="$icon.16" checked={useZkPassport} onPress={() => toggle(!useZkPassport)} />
        <Text variant="body3" color="$neutral1" onPress={() => toggle(!useZkPassport)}>
          {t('toucan.zkpassport.usePolicy')}
        </Text>
      </Flex>

      {useZkPassport && (
        <Flex gap="$spacing8">
          <Dropdown
            isOpen={dropdownOpen}
            toggleOpen={setDropdownOpen}
            isTriggerStyled={false}
            chevronSize="$icon.20"
            allowFlip
            containerStyle={{ width: '100%' }}
            dropdownStyle={{
              width: '100%',
              minWidth: '100%',
              p: '$spacing8',
              gap: '$spacing2',
              borderRadius: '$rounded12',
            }}
            buttonStyle={{
              width: '100%',
              flex: 1,
              minWidth: 0,
              backgroundColor: '$surface2',
              borderWidth: 0,
              borderRadius: '$rounded12',
              p: '$spacing12',
              height: 'auto',
              minHeight: 0,
              hoverStyle: { backgroundColor: '$surface3' },
              focusStyle: { backgroundColor: '$surface3' },
            }}
            menuLabel={
              <Text flex={1} minWidth={0} variant="body3" color="$neutral1" numberOfLines={1}>
                {selected?.label ?? (isLoading ? '…' : t('toucan.zkpassport.policyDropdownPlaceholder'))}
              </Text>
            }
          >
            {policies.map((option) => (
              <InternalMenuItem
                key={option.policyId.toString()}
                onPress={() => {
                  setSelectedPolicyId(option.policyId)
                  onSelectHook(option.hook)
                  setDropdownOpen(false)
                }}
              >
                <Text variant="body3">{option.label}</Text>
                {selectedPolicyId === option.policyId ? (
                  <Check size="$icon.16" color="$neutral1" strokeWidth={3} />
                ) : null}
              </InternalMenuItem>
            ))}
          </Dropdown>

          <ExternalLink href={ZKPASSPORT_CREATE_POLICY_URL}>
            <Text variant="buttonLabel4" color="$neutral2">
              {t('toucan.zkpassport.customPolicy')}
            </Text>
          </ExternalLink>
        </Flex>
      )}
    </Flex>
  )
}
