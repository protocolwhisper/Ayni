/**
 * Injects a mock window.ethereum into the page context.
 * Call this in page.addInitScript() before navigation.
 */
export function buildMockWallet({ address, chainId = 4441, balance = '0xDE0B6B3A7640000' } = {}) {
  return `
    (() => {
      const address = '${address}';
      const chainId = ${chainId};
      const balanceHex = '${balance}';

      window.ethereum = {
        selectedAddress: address,
        chainId: '0x' + chainId.toString(16),
        isMetaMask: true,

        request({ method, params }) {
          if (method === 'eth_requestAccounts') return Promise.resolve([address]);
          if (method === 'eth_accounts') return Promise.resolve([address]);
          if (method === 'eth_chainId') return Promise.resolve('0x' + chainId.toString(16));
          if (method === 'eth_getBalance') return Promise.resolve(balanceHex);
          if (method === 'wallet_switchEthereumChain') return Promise.resolve(null);
          if (method === 'eth_sendTransaction') return Promise.resolve('0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678');
          return Promise.reject(new Error('Method not supported: ' + method));
        },

        on(event, handler) {
          this._handlers = this._handlers || {};
          this._handlers[event] = handler;
        },
        removeListener() {},
      };
    })();
  `
}
