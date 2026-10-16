import type { EVMUniverseChainId } from '@universe/chains'
import { Button, Flex, fonts, Input, ModalCloseIcon, Text, TouchableArea } from '@universe/mycelium'
import { HeightAnimator } from '@universe/mycelium/height-animator'
import { Check } from '@universe/mycelium/icons/Check'
import { UserCheck } from '@universe/mycelium/icons/UserCheck'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SpinningLoader } from 'ui/src'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { ZKPASSPORT_CONTACT_URL, ZKPASSPORT_DEFAULT_POLICIES } from '~/features/Toucan/ZkPassport/config'
import { isActiveZkPassportPolicy } from '~/features/Toucan/ZkPassport/isActiveZkPassportPolicy'
import { parseZkPassportPolicyId } from '~/features/Toucan/ZkPassport/policyIds'
import { ExternalLink } from '~/theme/components/Links'

/** Picks the ZKPassport policy an auction gates bids on: a default policy for the chain, or any active policy id. */
export function ZkPassportPolicyModal({
  isOpen,
  onClose,
  chainId,
  onAccepted,
}: {
  isOpen: boolean
  onClose: () => void
  chainId: EVMUniverseChainId
  onAccepted: (policyId: string) => void
}) {
  const { t } = useTranslation()
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>()
  const [customPolicyId, setCustomPolicyId] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [hasError, setHasError] = useState(false)
  const modalSessionRef = useRef(0)

  useEffect(() => {
    modalSessionRef.current += 1
    if (isOpen) {
      setSelectedPolicyId(undefined)
      setCustomPolicyId('')
      setIsValidating(false)
      setHasError(false)
    }
  }, [isOpen])

  const defaultPolicies = ZKPASSPORT_DEFAULT_POLICIES[chainId] ?? []
  const parsedCustomPolicyId = parseZkPassportPolicyId(customPolicyId)
  const canConfirm = Boolean(selectedPolicyId ?? parsedCustomPolicyId)

  const accept = (policyId: string): void => {
    onAccepted(policyId)
    onClose()
  }

  const handleConfirm = async (): Promise<void> => {
    if (selectedPolicyId) {
      accept(selectedPolicyId)
      return
    }
    if (!parsedCustomPolicyId) {
      return
    }

    setIsValidating(true)
    const sessionAtStart = modalSessionRef.current
    const isActive = await isActiveZkPassportPolicy({ chainId, policyId: parsedCustomPolicyId })
    if (sessionAtStart !== modalSessionRef.current) {
      return
    }

    setIsValidating(false)
    if (isActive) {
      accept(parsedCustomPolicyId)
    } else {
      setHasError(true)
    }
  }

  return (
    <Modal name={ModalName.AuctionZkPassportPolicySetup} onClose={onClose} isModalOpen={isOpen} padding={0}>
      <HeightAnimator>
        <Flex gap="$spacing24" px="$spacing24" pb="$spacing24" pt="$spacing16" maxWidth={420} mx="auto" width="100%">
          <Flex row height={36} alignItems="center" justifyContent="flex-end" width="100%">
            <ModalCloseIcon role="none" onClose={onClose} />
          </Flex>

          <Flex alignItems="center" width="100%">
            <Flex
              width={48}
              height={48}
              borderRadius="$rounded12"
              backgroundColor="$surface3"
              alignItems="center"
              justifyContent="center"
            >
              <UserCheck color="$neutral1" size="$icon.24" />
            </Flex>
          </Flex>

          {isValidating ? (
            <Flex gap="$spacing20" alignItems="center" py="$spacing16" width="100%">
              <SpinningLoader size={32} color="$neutral2" />
              <Text variant="body2" color="$neutral2" textAlign="center">
                {t('toucan.createAuction.step.configureAuction.zkPassport.modal.validating')}
              </Text>
            </Flex>
          ) : (
            <Flex gap="$spacing16" alignItems="center" width="100%">
              <Flex gap="$spacing8" alignItems="center" width="100%">
                <Text variant="subheading1" color="$neutral1" textAlign="center">
                  {t('toucan.createAuction.step.configureAuction.zkPassport.modal.title')}
                </Text>
                <Text variant="body2" color="$neutral2" textAlign="center" lineHeight={20}>
                  {t('toucan.createAuction.step.configureAuction.zkPassport.modal.description')}
                </Text>
              </Flex>

              <Flex gap="$spacing8" width="100%">
                {defaultPolicies.map((policy) => {
                  const isSelected = policy.policyId === selectedPolicyId
                  return (
                    <TouchableArea
                      key={policy.policyId}
                      onPress={() => {
                        setSelectedPolicyId(policy.policyId)
                        setCustomPolicyId('')
                        setHasError(false)
                      }}
                    >
                      <Flex
                        row
                        alignItems="center"
                        justifyContent="space-between"
                        gap="$spacing8"
                        px="$spacing16"
                        py="$spacing12"
                        backgroundColor="$surface2"
                        borderWidth={1}
                        borderColor={isSelected ? '$accent1' : '$surface3'}
                        borderRadius="$rounded16"
                      >
                        <Text variant="body2" color="$neutral1" flex={1}>
                          {policy.label}
                        </Text>
                        {isSelected && <Check color="$accent1" size="$icon.16" />}
                      </Flex>
                    </TouchableArea>
                  )
                })}

                <Flex
                  row
                  alignItems="center"
                  width="100%"
                  minHeight={48}
                  px="$spacing16"
                  py="$spacing8"
                  backgroundColor="$surface2"
                  borderWidth={1}
                  borderColor={hasError ? '$statusCritical' : '$surface3'}
                  borderRadius="$rounded16"
                >
                  <Input
                    flex={1}
                    value={customPolicyId}
                    onChangeText={(text) => {
                      setCustomPolicyId(text)
                      setSelectedPolicyId(undefined)
                      setHasError(false)
                    }}
                    placeholder={t('toucan.createAuction.step.configureAuction.zkPassport.modal.customPolicyId')}
                    placeholderTextColor="$neutral3"
                    height={fonts.body2.lineHeight}
                    fontSize={fonts.body2.fontSize}
                    lineHeight={fonts.body2.lineHeight}
                    color="$neutral1"
                    px="$none"
                    backgroundColor="$transparent"
                  />
                </Flex>

                {hasError && (
                  <Text variant="body4" color="$statusCritical" textAlign="center">
                    {t('toucan.createAuction.step.configureAuction.zkPassport.modal.error.invalidPolicy')}
                  </Text>
                )}
              </Flex>

              <ExternalLink href={ZKPASSPORT_CONTACT_URL}>
                <Text variant="buttonLabel3" color="$accent3" textAlign="center">
                  {t('toucan.createAuction.step.configureAuction.zkPassport.modal.contact')}
                </Text>
              </ExternalLink>

              <Flex row gap="$spacing8" width="100%">
                <Button size="small" emphasis="secondary" minHeight="$spacing36" fill onPress={onClose}>
                  {t('common.button.cancel')}
                </Button>
                <Button
                  size="small"
                  emphasis="primary"
                  minHeight="$spacing36"
                  fill
                  disabled={!canConfirm}
                  onPress={() => {
                    void handleConfirm()
                  }}
                >
                  {t('common.button.confirm')}
                </Button>
              </Flex>
            </Flex>
          )}
        </Flex>
      </HeightAnimator>
    </Modal>
  )
}
