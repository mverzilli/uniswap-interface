import { describe, expect, it } from 'vitest'
import {
  buildValidationHookRegistration,
  isValidationHookRegistration,
} from '~/state/sagas/createAuction/validationHookRegistration'

const VALIDATION_HOOK = '0x2222222222222222222222222222222222222222'
const AUCTION = '0x5555555555555555555555555555555555555555'

// approve(address,uint256) for Permit2 with a max allowance.
const APPROVE_DATA = `0x095ea7b3${'0'.repeat(24)}000000000022d473030f116ddee9f6b43ac78ba3${'f'.repeat(64)}`

describe('buildValidationHookRegistration', () => {
  it('calls register on the hook with the auction, the policy and a gate that never expires', () => {
    const registration = buildValidationHookRegistration({
      validationHook: VALIDATION_HOOK,
      auction: AUCTION,
      policyId: '0x7b',
    })

    expect(registration).toEqual({
      to: VALIDATION_HOOK,
      data:
        '0x6d23f895' +
        '0000000000000000000000005555555555555555555555555555555555555555' +
        '000000000000000000000000000000000000000000000000000000000000007b' +
        '000000000000000000000000000000000000000000000000ffffffffffffffff',
    })
  })
})

describe('isValidationHookRegistration', () => {
  it('recognizes a registration and nothing else', () => {
    const registration = buildValidationHookRegistration({
      validationHook: VALIDATION_HOOK,
      auction: AUCTION,
      policyId: '0x7b',
    })

    expect(isValidationHookRegistration(registration.data)).toBe(true)
    expect(isValidationHookRegistration(APPROVE_DATA)).toBe(false)
    expect(isValidationHookRegistration(undefined)).toBe(false)
  })
})
