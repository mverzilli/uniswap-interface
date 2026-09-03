import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { CHAIN_ID_TO_URL_PARAM } from 'uniswap/src/features/chains/chainUrlParam'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

/** Origin serving the ZKPassport verification popup. */
export const ZKPASSPORT_POPUP_URL = (process.env.ZKPASSPORT_POPUP_URL ?? 'http://localhost:3010').replace(/\/$/, '')

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

export function zkPassportVerifyUrl({
  chainId,
  registry,
  policyId,
}: {
  chainId: UniverseChainId
  registry: string
  policyId: bigint
}): string {
  const chainParam = CHAIN_ID_TO_URL_PARAM[chainId]
  // The mobile app roots proofs in the mainnet registries unless dev mode is
  // requested, which switches to the testnet registries — so testnet chains
  // only verify dev-mode proofs.
  const dev = getChainInfo(chainId).testnet ? '&dev=1' : ''
  return `${ZKPASSPORT_POPUP_URL}/?chain=${chainParam}&registry=${registry}&policyId=${policyId}${dev}`
}
