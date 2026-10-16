import { UniverseChainId } from '@universe/chains'
import { describe, expect, it, vi } from 'vitest'
import { KycCard } from '~/pages/Liquidity/CreateAuction/components/KycCard'
import { CreateAuctionStoreContext } from '~/pages/Liquidity/CreateAuction/store/CreateAuctionStoreContext'
import { createCreateAuctionStore } from '~/pages/Liquidity/CreateAuction/store/createCreateAuctionStore'
import { fireEvent, render, screen } from '~/test-utils/render'

const AGE_POLICY = '0x5e639832038e5684a2f06ffb0096d4a5dd7a9ca289802fc3cbed1e77724de77e'

vi.mock('~/features/Toucan/ZkPassport/config', () => ({
  ZKPASSPORT_CONTACT_URL: 'https://zkpassport.id/#contact',
  ZKPASSPORT_VALIDATION_HOOKS: { 11155111: '0x45448d875F74a710805e220878B326F95F7f3E8E' },
  ZKPASSPORT_DEFAULT_POLICIES: {
    11155111: [{ policyId: '0x5e639832038e5684a2f06ffb0096d4a5dd7a9ca289802fc3cbed1e77724de77e', label: 'Age 18+' }],
  },
}))
vi.mock('~/features/Toucan/ZkPassport/isActiveZkPassportPolicy', () => ({ isActiveZkPassportPolicy: vi.fn() }))

function renderKycCard(chainId: UniverseChainId): ReturnType<typeof createCreateAuctionStore> {
  const store = createCreateAuctionStore()
  const { actions } = store.getState()
  actions.updateCreateNewTokenField('network', chainId)
  actions.commitTokenFormAndAdvance()

  render(
    <CreateAuctionStoreContext.Provider value={store}>
      <KycCard />
    </CreateAuctionStoreContext.Provider>,
  )
  return store
}

describe('KycCard', () => {
  it('turns the setup button into the ZKPassport policy picker when ZKPassport is checked', () => {
    renderKycCard(UniverseChainId.Sepolia)

    expect(screen.getByText('Set up identity verification')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Use ZKPassport'))

    expect(screen.getByText('Choose a ZKPassport policy')).toBeInTheDocument()
    expect(screen.queryByText('Set up identity verification')).not.toBeInTheDocument()
  })

  it('shows the chosen ZKPassport policy in the card', () => {
    const store = renderKycCard(UniverseChainId.Sepolia)

    fireEvent.click(screen.getByText('Use ZKPassport'))
    fireEvent.click(screen.getByText('Choose a ZKPassport policy'))
    fireEvent.click(screen.getByText('Age 18+'))
    fireEvent.click(screen.getByText('Confirm'))

    expect(store.getState().configureAuction.zkPassportPolicyId).toBe(AGE_POLICY)
    expect(screen.getByText('Age 18+')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('offers no ZKPassport option on a chain without the ZKPassport hook', () => {
    renderKycCard(UniverseChainId.Mainnet)

    expect(screen.getByText('Set up identity verification')).toBeInTheDocument()
    expect(screen.queryByText('Use ZKPassport')).not.toBeInTheDocument()
  })
})
