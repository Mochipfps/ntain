/* ============================================================
   web3/config.js — production NFT access configuration.
   The game is gated: only holders of the HoodLust collection may
   play. Ownership is verified on-chain against Robinhood Mainnet
   through the Alchemy RPC. No signature is requested.
   ============================================================ */

export const WEB3 = {
  // HoodLust collection — required to enter the game (ERC-721).
  nftContract: '0x0be6e89cf774020d5a978865544b6ccc63e61a29',

  // Access Pass collection — NOT required to play. Integrated for future
  // Access Pass features only (Battle Pass etc.); never gates gameplay.
  accessPassContract: '0x4bd53fc6b81b100bda27ab1055e908cd9a9daafb',

  // Robinhood Mainnet via Alchemy. Ownership is always read live from chain.
  rpcUrl: 'https://robinhood-mainnet.g.alchemy.com/v2/iqcukbF27ZiKGrV4yAbz8',
  chainName: 'Robinhood Mainnet',

  // Admin wallets (lowercase) — reserved for future tooling.
  admins: [],
};

// ERC-721 balanceOf(address) selector.
export const BALANCE_OF_SELECTOR = '0x70a08231';
