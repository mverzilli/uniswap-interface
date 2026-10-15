import { UniverseChainId } from '@universe/chains'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZkPassportPolicyModal } from '~/pages/Liquidity/CreateAuction/components/ZkPassportPolicyModal'
import { fireEvent, render, screen, waitFor } from '~/test-utils/render'

const DEFAULT_POLICY = '0x5e639832038e5684a2f06ffb0096d4a5dd7a9ca289802fc3cbed1e77724de77e'
const CUSTOM_POLICY = '0x000000000000000000000000000000000000000000000000000000000000007b'

vi.mock('~/features/Toucan/ZkPassport/config', () => ({
  ZKPASSPORT_CONTACT_URL: 'https://zkpassport.id/#contact',
  ZKPASSPORT_DEFAULT_POLICIES: {
    11155111: [{ policyId: '0x5e639832038e5684a2f06ffb0096d4a5dd7a9ca289802fc3cbed1e77724de77e', label: 'Age 18+' }],
  },
}))

const mockIsActiveZkPassportPolicy = vi.fn()
vi.mock('~/features/Toucan/ZkPassport/isActiveZkPassportPolicy', () => ({
  isActiveZkPassportPolicy: (...args: unknown[]) => mockIsActiveZkPassportPolicy(...args),
}))

function renderModal(): { onAccepted: ReturnType<typeof vi.fn> } {
  const onAccepted = vi.fn()
  render(<ZkPassportPolicyModal isOpen onClose={vi.fn()} chainId={UniverseChainId.Sepolia} onAccepted={onAccepted} />)
  return { onAccepted }
}

describe('ZkPassportPolicyModal', () => {
  beforeEach(() => {
    mockIsActiveZkPassportPolicy.mockReset()
  })

  it('accepts a default policy without checking it on chain', () => {
    const { onAccepted } = renderModal()

    fireEvent.click(screen.getByText('Age 18+'))
    fireEvent.click(screen.getByText('Confirm'))

    expect(onAccepted).toHaveBeenCalledWith(DEFAULT_POLICY)
    expect(mockIsActiveZkPassportPolicy).not.toHaveBeenCalled()
  })

  it('accepts a typed policy id once the chain confirms it is active', async () => {
    mockIsActiveZkPassportPolicy.mockResolvedValue(true)
    const { onAccepted } = renderModal()

    fireEvent.change(screen.getByPlaceholderText('Or enter a policy ID'), { target: { value: '123' } })
    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => expect(onAccepted).toHaveBeenCalledWith(CUSTOM_POLICY))
    expect(mockIsActiveZkPassportPolicy).toHaveBeenCalledWith({
      chainId: UniverseChainId.Sepolia,
      policyId: CUSTOM_POLICY,
    })
  })

  it('rejects a typed policy id with no active policy behind it', async () => {
    mockIsActiveZkPassportPolicy.mockResolvedValue(false)
    const { onAccepted } = renderModal()

    fireEvent.change(screen.getByPlaceholderText('Or enter a policy ID'), { target: { value: '123' } })
    fireEvent.click(screen.getByText('Confirm'))

    expect(await screen.findByText('No active ZKPassport policy has this ID on this network.')).toBeInTheDocument()
    expect(onAccepted).not.toHaveBeenCalled()
  })
})
