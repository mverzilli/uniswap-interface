/**
 * Minimal ABI fragments for reading ZKPassport state on-chain. Everything the
 * interface needs is the stock GatedERC1155ValidationHook surface plus the
 * ERC-1155 reads (balanceOf/uri) and the registry's policy views — no vendor
 * SDK involved.
 */

export const gatedErc1155HookAbi = [
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

export const zkPassportAttestAbi = [
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
  {
    type: 'function',
    name: 'uri',
    stateMutability: 'view',
    inputs: [{ name: 'policyId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
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
