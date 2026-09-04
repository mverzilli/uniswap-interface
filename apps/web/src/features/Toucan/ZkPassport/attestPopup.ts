/**
 * Minimal client for the hosted ZKPassport verify-popup's attestation
 * protocol. The popup announces `ready`, the opener responds with a
 * `configure` message carrying the attest request (the popup resolves the
 * on-chain policy itself), and the popup reports progress and the final
 * outcome back via `postMessage`. Kept dependency-free: the protocol types
 * live in @zkpassport/sdk, but the attest extension is not published yet.
 */

export interface AttestPopupConfig {
  /** Chain name in the ZKPassport SDK's format, e.g. "ethereum_sepolia". */
  chain: string
  /** On-chain policy id as a 0x-prefixed 32-byte hex string. */
  policyId: `0x${string}`
  /** ZKPassportAttest registry address. */
  registry: `0x${string}`
  /** RPC override for dev registries; the popup defaults per chain. */
  rpcUrl?: string
}

export interface AttestOutcome {
  status: 'minted' | 'unminted' | 'already-verified'
  /** Recipient account the user selected in the popup; may differ from the wallet connected here. */
  walletAddress?: `0x${string}`
  txHash?: `0x${string}`
  reason?: string
}

export interface AttestPopupCallbacks {
  /** Verification finished; `outcome` is present when a credential mint was attempted. */
  onSuccess?: (outcome?: AttestOutcome) => void
  onReject?: () => void
  onError?: (message: string) => void
  /** The user closed the popup before a result was produced. */
  onClose?: () => void
}

export interface AttestPopupHandle {
  close: () => void
}

const CLOSE_POLL_INTERVAL = 500

/**
 * Open the hosted verification page in a new tab. Must be called from a
 * user gesture or the browser will block it. No window features are passed:
 * the page opens with full browser chrome, and `window.opener` stays intact
 * for the postMessage protocol (never add noopener here).
 */
export function openAttestPopup({
  popupUrl,
  devMode,
  attest,
  callbacks = {},
}: {
  popupUrl: string
  devMode: boolean
  attest: AttestPopupConfig
  callbacks?: AttestPopupCallbacks
}): AttestPopupHandle | null {
  const popupOrigin = new URL(popupUrl).origin
  const popup = window.open(popupUrl, 'zkpassport-verify')
  if (!popup) {
    return null
  }

  let finished = false
  let closePoll: ReturnType<typeof setInterval> | null = null

  const cleanup = (): void => {
    window.removeEventListener('message', onMessage)
    if (closePoll) {
      clearInterval(closePoll)
      closePoll = null
    }
  }

  function onMessage(event: MessageEvent): void {
    if (event.origin !== popupOrigin || event.source !== popup) {
      return
    }
    const data = event.data as {
      zkpassport?: boolean
      type?: string
      attest?: AttestOutcome
      message?: string
    } | null
    if (!data?.zkpassport || typeof data.type !== 'string') {
      return
    }
    switch (data.type) {
      case 'ready':
        popup?.postMessage(
          {
            zkpassport: true,
            type: 'configure',
            request: { devMode, attest },
            query: {},
          },
          popupOrigin,
        )
        break
      case 'success':
        finished = true
        callbacks.onSuccess?.(data.attest)
        break
      case 'rejected':
        finished = true
        callbacks.onReject?.()
        break
      case 'error':
        callbacks.onError?.(String(data.message))
        break
      default:
        break
    }
  }

  window.addEventListener('message', onMessage)
  closePoll = setInterval(() => {
    if (popup.closed) {
      cleanup()
      if (!finished) {
        callbacks.onClose?.()
      }
    }
  }, CLOSE_POLL_INTERVAL)

  return {
    close: () => {
      cleanup()
      popup.close()
    },
  }
}
