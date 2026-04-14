export const WALLET_DISCONNECTED_KEY = 'ayni_wallet_disconnected'

function parseChainId(chainHex) {
  return chainHex ? Number.parseInt(chainHex, 16) : null
}

export function isWalletManuallyDisconnected() {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(WALLET_DISCONNECTED_KEY) === '1'
}

export function markWalletDisconnected() {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(WALLET_DISCONNECTED_KEY, '1')
}

export function clearWalletDisconnected() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(WALLET_DISCONNECTED_KEY)
}

export function readWalletSessionSync() {
  if (typeof window === 'undefined' || !window.ethereum) {
    return { walletAddress: '', walletChainId: null }
  }

  return {
    walletAddress: isWalletManuallyDisconnected() ? '' : (window.ethereum.selectedAddress ?? ''),
    walletChainId: parseChainId(window.ethereum.chainId),
  }
}
