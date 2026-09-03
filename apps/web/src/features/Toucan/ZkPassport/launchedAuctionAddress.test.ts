import { auctionAddressFromLogs } from '~/features/Toucan/ZkPassport/launchedAuctionAddress'

// Logs from the sepolia launch tx 0x00c5c4ba533eb89bb506c2f1b60102b3399e71477b860876aa8073ac624702df,
// whose build-time prediction (0x46dA7929…) diverged from the deployed auction.
const launchReceiptLogs = [
  {
    // ERC20 Transfer from the launched token
    topics: [
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x00000000000000000000000000004c4ccc709ef590f7c81102c0689f0263d4e9',
    ],
  },
  {
    // AuctionCreated(auction, token, ...) from the CCA initializer factory
    topics: [
      '0x7ede475fad18ccf0039f2b956c4d43a8b4ed0853de4daaa8ae25299f331ae3b9',
      '0x00000000000000000000000044284947b3e1c7dd9a5ad0dd897c1d1b16ca9367',
      '0x000000000000000000000000342ee32319e937ba6b59a15c274dca9a2d2aafa4',
    ],
  },
  {
    topics: ['0x6d759545eb439f07e70f45431d6339af7a4f1ffef06d43e8ddf47fdb0799708c'],
  },
]

describe('auctionAddressFromLogs', () => {
  it('extracts the deployed auction address from the AuctionCreated log', () => {
    expect(auctionAddressFromLogs(launchReceiptLogs)).toBe('0x44284947b3e1C7dd9A5AD0dD897c1D1B16cA9367')
  })

  it('returns undefined when the receipt has no AuctionCreated log', () => {
    expect(auctionAddressFromLogs(launchReceiptLogs.filter((_, i) => i !== 1))).toBeUndefined()
  })

  it('returns undefined for an empty receipt', () => {
    expect(auctionAddressFromLogs([])).toBeUndefined()
  })
})
