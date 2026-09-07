/**
 * Launcher-side ABI fragments: the ZKPassportAttest registry's vendor-specific
 * views, used by the creator wizard to enumerate policies when configuring an
 * auction's validation hook.
 */

export const policyCreatedEvent = {
  type: 'event',
  name: 'PolicyCreated',
  inputs: [
    { name: 'policyId', type: 'uint256', indexed: true },
    { name: 'owner', type: 'address', indexed: true },
    { name: 'hook', type: 'address', indexed: false },
  ],
} as const

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
  policyCreatedEvent,
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
