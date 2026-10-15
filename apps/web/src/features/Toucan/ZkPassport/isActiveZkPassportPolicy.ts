import type { EVMUniverseChainId } from '@universe/chains'
import { getPublicClient } from '@wagmi/core'
import { assume0xAddress } from '~/chains'
import { wagmiConfig } from '~/connection/wagmiConfig'
import { ZKPASSPORT_VALIDATION_HOOKS } from '~/features/Toucan/ZkPassport/config'

/** Whether `policyId` names an existing, unretired policy on the credentials contract the chain's ZKPassport hook checks. */
export async function isActiveZkPassportPolicy({
  chainId,
  policyId,
}: {
  chainId: EVMUniverseChainId
  policyId: string
}): Promise<boolean> {
  const validationHook = ZKPASSPORT_VALIDATION_HOOKS[chainId]
  if (!validationHook) {
    return false
  }

  const client = getPublicClient(wagmiConfig, { chainId })
  if (!client) {
    return false
  }

  try {
    const credentials = await client.readContract({
      address: assume0xAddress(validationHook),
      abi: credentialsAbi,
      functionName: 'erc1155',
    })
    // getPolicy reverts for an unknown policy.
    const policy = await client.readContract({
      address: credentials,
      abi: credentialsAbi,
      functionName: 'getPolicy',
      args: [BigInt(policyId)],
    })
    return policy.retiredAt === 0n
  } catch {
    return false
  }
}

// The hook's erc1155() and ZKPassportCredentials.getPolicy().
const credentialsAbi = [
  {
    type: 'function',
    name: 'erc1155',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
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
          { name: 'credentialDuration', type: 'uint64' },
          { name: 'enforceUniqueness', type: 'bool' },
          { name: 'ownerIssuable', type: 'bool' },
          { name: 'ownerBannable', type: 'bool' },
          { name: 'ownerEditable', type: 'bool' },
          { name: 'evaluator', type: 'address' },
          { name: 'requirements', type: 'bytes' },
          { name: 'metadataURL', type: 'string' },
          { name: 'retiredAt', type: 'uint64' },
        ],
      },
    ],
  },
] as const
