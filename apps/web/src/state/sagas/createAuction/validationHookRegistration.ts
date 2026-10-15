import { assume0xAddress, encodeFunctionData } from '~/chains'

// register(address,uint256,uint64)
const REGISTER_SELECTOR = '0x6d23f895'
const MAX_EXPIRATION_BLOCK = 2n ** 64n - 1n

/**
 * The call that registers `auction` with the ZKPassport validation hook, gating it on `policyId`
 * for its whole duration. It must land before the auction is created.
 */
export function buildValidationHookRegistration({
  validationHook,
  auction,
  policyId,
}: {
  validationHook: string
  auction: string
  policyId: string
}): { to: string; data: string } {
  return {
    to: validationHook,
    data: encodeFunctionData({
      abi: registerAbi,
      functionName: 'register',
      args: [assume0xAddress(auction), BigInt(policyId), MAX_EXPIRATION_BLOCK],
    }),
  }
}

/** Whether `data` is calldata for the ZKPassport validation hook's `register`. */
export function isValidationHookRegistration(data: unknown): boolean {
  return typeof data === 'string' && data.startsWith(REGISTER_SELECTOR)
}

const registerAbi = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'auction', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'expirationBlock', type: 'uint64' },
    ],
    outputs: [],
  },
] as const
