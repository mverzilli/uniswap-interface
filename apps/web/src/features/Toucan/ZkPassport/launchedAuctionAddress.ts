import type { UniverseChainId } from 'uniswap/src/features/chains/types'
import { getAddress } from 'viem'
import { getSessionlessPublicClient } from '~/features/Toucan/ZkPassport/sessionlessClient'

/** AuctionCreated(address indexed auction, address indexed token, ...) emitted by the CCA initializer factory. */
const AUCTION_CREATED_TOPIC = '0x7ede475fad18ccf0039f2b956c4d43a8b4ed0853de4daaa8ae25299f331ae3b9'

/** The launched auction's address, from the AuctionCreated log of a launch receipt. */
export function auctionAddressFromLogs(logs: ReadonlyArray<{ topics: readonly string[] }>): `0x${string}` | undefined {
  const created = logs.find((log) => log.topics[0] === AUCTION_CREATED_TOPIC)
  const auctionTopic = created?.topics[1]
  return auctionTopic ? getAddress(`0x${auctionTopic.slice(-40)}`) : undefined
}

/**
 * The address the launch transaction actually deployed the auction at.
 *
 * The build-time CREATE2 prediction can diverge from the deployed address —
 * the LBP strategy derives its own factory salt and patches the auction
 * params before calling create, so replaying factory.getAddress with the
 * client-side inputs does not always hash to the same address. The
 * AuctionCreated log in the receipt is ground truth; the prediction is only
 * a fallback for when the receipt cannot be fetched (e.g. batch-wallet ids).
 */
export async function resolveLaunchedAuctionAddress({
  chainId,
  hash,
  predictedAddress,
}: {
  chainId: UniverseChainId
  hash: string
  predictedAddress: string
}): Promise<string> {
  try {
    const receipt = await getSessionlessPublicClient(chainId).waitForTransactionReceipt({
      hash: hash as `0x${string}`,
      timeout: 120_000,
    })
    return auctionAddressFromLogs(receipt.logs) ?? predictedAddress
  } catch {
    return predictedAddress
  }
}
