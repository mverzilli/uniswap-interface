/**
 * ABI fragments for reading ZKPassport state on-chain, split by who defines
 * the interface. The credential check uses only the stock surfaces below;
 * nothing vendor-specific is needed to gate bids.
 */

/** Getter shape of Uniswap's stock BaseERC1155ValidationHook. */
export const erc1155ValidationHookAbi = [
  {
    type: 'function',
    name: 'erc1155',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

/** Standard ERC-1155 read used for the credential balance check. */
export const erc1155BalanceOfAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

/**
 * ZKPassportAttest registry views. Vendor-specific: used only by the creator
 * wizard to enumerate policies, never by the bid-gating credential check.
 */
export const zkPassportAttestAbi = [
  {
    type: 'function',
    name: 'getPolicy',
    stateMutability: 'view',
    inputs: [{ name: 'policyId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'validityPeriod', type: 'uint64' },
          { name: 'unique', type: 'bool' },
          { name: 'saltedNullifierOnly', type: 'bool' },
          { name: 'minAge', type: 'uint8' },
          { name: 'sanctionsCheck', type: 'bool' },
          { name: 'excludedCountries', type: 'string[]' },
          { name: 'metadataURL', type: 'string' },
          { name: 'hook', type: 'address' },
          { name: 'retiredAt', type: 'uint64' },
        ],
      },
    ],
  },
  {
    type: 'event',
    name: 'PolicyCreated',
    inputs: [
      { name: 'policyId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'hook', type: 'address', indexed: false },
    ],
  },
] as const

export type ZkPassportPolicy = {
  owner: `0x${string}`
  validityPeriod: bigint
  unique: boolean
  saltedNullifierOnly: boolean
  minAge: number
  sanctionsCheck: boolean
  excludedCountries: readonly string[]
  metadataURL: string
  hook: `0x${string}`
  retiredAt: bigint
}
