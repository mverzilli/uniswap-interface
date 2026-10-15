import { UniverseChainId } from '@universe/chains'

export interface ZkPassportPolicy {
  /** The policy's id on the ZKPassportCredentials contract, as 0x-prefixed hex */
  policyId: string
  label: string
}

/** SingletonGatedERC1155ValidationHook deployments: the validation hook of ZKPassport-gated auctions, by chain. */
export const ZKPASSPORT_VALIDATION_HOOKS: Partial<Record<UniverseChainId, string>> = {
  [UniverseChainId.Sepolia]: '0x45448d875F74a710805e220878B326F95F7f3E8E',
}

/** Policies offered to auction creators, by chain. A creator may also enter any other policy id. */
export const ZKPASSPORT_DEFAULT_POLICIES: Partial<Record<UniverseChainId, ZkPassportPolicy[]>> = {
  [UniverseChainId.Sepolia]: [
    { policyId: '0x5e639832038e5684a2f06ffb0096d4a5dd7a9ca289802fc3cbed1e77724de77e', label: 'Age 18+' },
    {
      policyId: '0x30f7cf0302dbd1a1f9a8ba88eeee8478a2106890e3181dfa1ba22876362ba12f',
      label: 'Age 18+, sanctions screened, not from Cuba, Iran, North Korea or Syria',
    },
  ],
}

export const ZKPASSPORT_CONTACT_URL = 'https://zkpassport.id/#contact'
