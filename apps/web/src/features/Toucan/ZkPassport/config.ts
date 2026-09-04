import { UniverseChainId } from 'uniswap/src/features/chains/types'

/** Origin serving the ZKPassport verification popup. */
export const ZKPASSPORT_POPUP_URL = (process.env.ZKPASSPORT_POPUP_URL ?? 'http://localhost:5173').replace(/\/$/, '')

/** Chain names in the ZKPassport SDK's format, keyed by supported chain. */
export const ZKPASSPORT_CHAIN_NAME: Partial<Record<UniverseChainId, string>> = {
  [UniverseChainId.Sepolia]: 'ethereum_sepolia',
}

/**
 * ZKPassportAttest registry per chain. Used to source the creator-flow policy
 * dropdown and to recognize auction validation hooks that gate on it.
 */
export const ZKPASSPORT_ATTEST_REGISTRY: Partial<Record<UniverseChainId, `0x${string}`>> = {
  [UniverseChainId.Sepolia]: (process.env.ZKPASSPORT_ATTEST_REGISTRY_SEPOLIA ??
    '0x2a615a175439b9eb0004b924aBdD2B4c7a871f11') as `0x${string}`,
}

/** Block each registry was deployed at, bounding PolicyCreated log scans. */
export const ZKPASSPORT_ATTEST_DEPLOY_BLOCK: Partial<Record<UniverseChainId, bigint>> = {
  [UniverseChainId.Sepolia]: BigInt(process.env.ZKPASSPORT_ATTEST_DEPLOY_BLOCK_SEPOLIA ?? 11625471),
}

/** Link for creators who want a policy beyond the ready-made list. */
export const ZKPASSPORT_CREATE_POLICY_URL = process.env.ZKPASSPORT_CREATE_POLICY_URL ?? 'http://localhost:3001/creator'
