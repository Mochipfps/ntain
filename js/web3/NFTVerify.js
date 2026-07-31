/* ============================================================
   NFTVerify.js — on-chain ownership check against Robinhood
   Mainnet through the Alchemy RPC. No wallet signature is used:
   we read the connected address, then query balanceOf directly
   from the blockchain. Gameplay unlocks only when the HoodLust
   balance is at least 1.
   ============================================================ */

import { WEB3, BALANCE_OF_SELECTOR } from './config.js';

export class NFTVerify {
  constructor(wallet) { this.wallet = wallet; }

  _callData(address) {
    const addr = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    return BALANCE_OF_SELECTOR + addr;
  }

  /** Live on-chain balanceOf via the Alchemy RPC (no signature, no cache). */
  async _balanceOf(contract, address) {
    const res = await fetch(WEB3.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'eth_call',
        params: [{ to: contract, data: this._callData(address) }, 'latest'],
      }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'RPC_ERROR');
    return this._toInt(json.result);
  }

  /** HoodLust NFTs owned (gates gameplay). */
  balanceOf(address) { return this._balanceOf(WEB3.nftContract, address); }

  /** Access Pass NFTs owned (future features only — never gates play). */
  accessPassBalance(address) { return this._balanceOf(WEB3.accessPassContract, address); }

  _toInt(hex) {
    if (!hex || hex === '0x') return 0;
    try { return Number(BigInt(hex)); } catch (_) { return parseInt(hex, 16) || 0; }
  }

  async isHolder(address) { return (await this.balanceOf(address)) > 0; }
}
