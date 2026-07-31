/* ============================================================
   Web3UI.js — Windows-95 controllers for the Phase-5 online layer:
   holder-verification gate, player profile, leaderboard (weekly /
   monthly / all-time + reset countdown) and the reward-admin
   module. Owns the verification session used to gate gameplay.
   ============================================================ */

import { WEB3 } from '../web3/config.js';
import { Wallet } from '../web3/Wallet.js';
import { NFTVerify } from '../web3/NFTVerify.js';
import { makeBackend, ONLINE, setAuthToken } from '../online/Backend.js';
import { Realtime } from '../online/Realtime.js';
import { Rewards } from '../online/Rewards.js';
import { AntiCheat } from '../online/AntiCheat.js';
import { CHARACTERS } from '../data/maps.js';
import { WEAPONS } from '../data/gamedata.js';

export class Web3UI {
  constructor(save) {
    this.save = save;
    this.wallet = new Wallet();
    this.verify = new NFTVerify(this.wallet);
    this.backend = makeBackend();
    this.rewards = new Rewards(this.backend, save);
    this.anticheat = AntiCheat;

    // Verification session. `connected` = wallet linked; `verified` = on-chain
    // HoodLust ownership confirmed (the only thing that unlocks Play).
    this.session = { wallet: null, nfts: 0, accessPass: 0, holder: false, connected: false, verified: false, name: '' };

    this.backdrop = document.getElementById('modal-backdrop');
    this._bind();

    // Live updates + server notifications (remote mode only).
    this.realtime = new Realtime();
    this.realtime.on('leaderboard', (m) => { if (!document.getElementById('leaderboard-window').classList.contains('hidden')) this._renderSeasonBoard(); });
    this.realtime.on('notification', (m) => this._toast((m.title || 'Notice') + (m.body ? ' — ' + m.body : '')));

    // Re-link a wallet the user already authorised (no prompt, no signature).
    this.wallet.onAccountChange(() => { this.session.verified = false; this.session.connected = false; this._refreshMenuWallet(); });
    this.wallet.tryReconnect().then((addr) => { if (addr) { this.session.wallet = addr; this.session.connected = true; this._refreshMenuWallet(); } });
    this._refreshMenuWallet();
  }

  _bind() {
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    document.querySelectorAll('[data-open="profile"]').forEach(b => b.addEventListener('click', () => this.showProfile()));
    document.querySelectorAll('[data-open="leaderboard"]').forEach(b => b.addEventListener('click', () => this.showLeaderboard()));
    document.querySelectorAll('[data-wallet="close"]').forEach(b => b.addEventListener('click', () => this._hide('wallet-window')));
    document.querySelectorAll('[data-profile="close"]').forEach(b => b.addEventListener('click', () => this._hide('profile-window')));
    document.querySelectorAll('[data-lb="close"]').forEach(b => b.addEventListener('click', () => this._hide('leaderboard-window')));
    document.querySelectorAll('[data-admin="close"]').forEach(b => b.addEventListener('click', () => this._hide('admin-window')));

    on('wallet-connect', 'click', () => this._connect());
    on('wallet-switch', 'click', () => this._connect(true));
    on('wallet-verify', 'click', () => this._verify());
    on('wallet-play', 'click', () => this._enterGame());
    on('profile-switch', 'click', () => { this._hide('profile-window'); this.openGate(this._pendingEnter); });
  }

  // ---------------- access gate (production, on-chain) ----------------
  isVerified() { return this.session.verified; }

  openGate(onEnter) {
    this._pendingEnter = onEnter;
    this._resetSteps();
    this._show('wallet-window');
    // Reflect current session state.
    if (this.session.verified) {
      this._btn('wallet-connect', false); this._btn('wallet-switch', true);
      this._btn('wallet-verify', false); this._btn('wallet-play', true);
      this._stepDone('ws-connect'); this._stepDone('ws-nft'); this._stepActive('ws-enter');
      this._status(`Verified — ${this.session.nfts} HoodLust NFT${this.session.nfts > 1 ? 's' : ''}.`, 'ok');
    } else if (this.session.connected) {
      this._btn('wallet-connect', false); this._btn('wallet-switch', true);
      this._btn('wallet-verify', true); this._btn('wallet-play', false);
      this._stepDone('ws-connect');
      this._status('Wallet connected. Press Verify to check NFT ownership.');
    } else {
      this._btn('wallet-connect', true); this._btn('wallet-switch', false);
      this._btn('wallet-verify', false); this._btn('wallet-play', false);
      this._status('Connect your wallet to begin.');
    }
  }

  // Step 1-3: connect wallet, read address only. No signature requested.
  async _connect(isSwitch = false) {
    try {
      this._stepActive('ws-connect');
      this._status('Connecting wallet…');
      const addr = isSwitch ? await this.wallet.switchWallet() : await this.wallet.connect();
      if (!addr) throw new Error('NO_ACCOUNT');
      this.session.wallet = addr; this.session.connected = true;
      this.session.verified = false;
      this._stepDone('ws-connect'); this._refreshMenuWallet();
      this._btn('wallet-connect', false); this._btn('wallet-switch', true);
      this._btn('wallet-verify', true); this._btn('wallet-play', false);
      this._status('Wallet connected: ' + this.wallet.short(addr) + '. Press Verify.');
    } catch (e) {
      const msg = e.message === 'NO_WALLET'
        ? 'No wallet detected. Please install a Web3 wallet (e.g. MetaMask).'
        : 'Wallet connection was cancelled. Please try again.';
      this._stepFail('ws-connect');
      this._status(msg, 'err');
    }
  }

  // Step 6-8: verify HoodLust ownership live on Robinhood Mainnet (no signature).
  async _verify() {
    if (!this.session.wallet) return this._connect();
    const addr = this.session.wallet;
    try {
      this._stepActive('ws-nft');
      this._status('Checking NFT ownership on-chain…');
      const nfts = await this.verify.balanceOf(addr);
      this.session.nfts = nfts; this.session.holder = nfts > 0;
      // Read Access Pass balance too (future features only; never gates play).
      this.verify.accessPassBalance(addr).then(n => { this.session.accessPass = n; }).catch(() => {});

      if (nfts <= 0) {
        this._stepFail('ws-nft');
        this._status('You need a Hoodlust NFT to play HoodLust.', 'err');
        this._btn('wallet-play', false); this._btn('wallet-switch', true);
        return;
      }
      this.session.verified = true;
      this.session.name = this._playerName(addr);
      this._stepDone('ws-nft'); this._stepActive('ws-enter');
      this._status(`Verified — ${nfts} HoodLust NFT${nfts > 1 ? 's' : ''}. Play unlocked.`, 'ok');
      this._btn('wallet-verify', false); this._btn('wallet-play', true);
      this._refreshMenuWallet();
      this._syncCloud(addr);
      this.rewards.processWeekly(addr, this.anticheat).then(r => { if (r) this._toast('Weekly reward: ' + (r.title || r.id)); }).catch(() => {});
    } catch (e) {
      this._stepFail('ws-nft');
      this._status('Could not verify ownership right now. Please try again.', 'err');
    }
  }

  _enterGame() {
    if (!this.session.verified) return;   // gameplay never unlocks without on-chain verification
    this._hide('wallet-window');
    const cb = this._pendingEnter; this._pendingEnter = null;
    if (cb) cb({ ...this.session });
  }

  // ---- nickname (chosen by player; changeable once every 30 days) ----
  NAME_COOLDOWN_MS = 30 * 24 * 3600 * 1000;
  _playerName(addr) {
    return this.save.data.nickname || localStorage.getItem('hoodlust-name') || ('Player ' + (addr ? addr.slice(2, 6).toUpperCase() : ''));
  }
  nameChangeAllowedInDays() {
    const last = this.save.data.nameChangedAt || 0;
    const left = this.NAME_COOLDOWN_MS - (Date.now() - last);
    return left <= 0 ? 0 : Math.ceil(left / (24 * 3600 * 1000));
  }
  setNickname(name) {
    name = String(name || '').trim().slice(0, 20).replace(/[<>]/g, '');
    if (!name) return { ok: false, error: 'Please enter a nickname.' };
    if (this.save.data.nickname && this.nameChangeAllowedInDays() > 0)
      return { ok: false, error: `You can change your name again in ${this.nameChangeAllowedInDays()} day(s).` };
    this.save.data.nickname = name;
    this.save.data.nameChangedAt = Date.now();
    this.save.save();
    this.session.name = name;
    return { ok: true, name };
  }

  async _syncCloud(addr) {
    try {
      const blob = await this.backend.cloudLoad(addr);
      if (blob && this.anticheat.verifySave(blob)) {
        // merge coins/unlocks conservatively (take the max).
        const d = this.save.data;
        d.coins = Math.max(d.coins, blob.coins || 0);
        (blob.unlockedWeapons || []).forEach(w => this.save.unlockWeapon(w));
        this.save.save();
      }
    } catch (_) {}
  }

  // ---------------- profile ----------------
  async showProfile() {
    const body = document.getElementById('profile-body');
    const s = this.session, d = this.save.data;
    const [wRank, aRank] = await Promise.all([
      s.wallet ? this.backend.playerRank(s.wallet, 'week') : null,
      s.wallet ? this.backend.playerRank(s.wallet, 'all') : null,
    ]);
    const chars = CHARACTERS.map(c => c.name);
    const weapons = (d.unlockedWeapons || []).map(id => WEAPONS[id] ? WEAPONS[id].name : id);
    const titles = d.titles || [];
    const excl = (d.exclusive || []).map(r => (r.title || r.id));
    const status = s.verified ? 'Verified Holder' : (s.wallet ? 'Connected (unverified)' : 'Not connected');
    const days = this.nameChangeAllowedInDays();
    const nmeta = this.save.data.nickname
      ? (days > 0 ? `Next change in ${days} day(s)` : 'You can change your name now')
      : 'Set your nickname (changeable once every 30 days)';

    const row = (k, v) => `<div class="profile-row"><span>${k}</span><b>${v}</b></div>`;
    const tags = (arr, empty) => arr.length
      ? `<div class="profile-tags">${arr.map(t => `<span class="profile-tag">${t}</span>`).join('')}</div>`
      : `<div class="profile-tags"><span class="profile-tag empty">${empty}</span></div>`;

    body.innerHTML =
      row('Wallet', s.wallet ? this.wallet.short(s.wallet) : '—') +
      `<div class="profile-row nick-row"><span>Nickname</span>
         <span class="nick-edit"><input id="nick-input" maxlength="20" value="${(this.save.data.nickname || '').replace(/"/g, '&quot;')}" placeholder="Choose a nickname"/>
         <button class="w95-btn" id="nick-save">Save</button></span></div>` +
      `<div class="profile-note" id="nick-note">${nmeta}</div>` +
      row('Access Status', status) +
      row('HoodLust NFTs', s.nfts || 0) +
      row('Access Pass NFTs', s.accessPass || 0) +
      row('Weekly Rank', wRank ? '#' + wRank : '—') +
      row('All-Time Rank', aRank ? '#' + aRank : '—') +
      row('Lifetime Best Score', d.bestScore || 0) +
      row('Best Time', this._fmtTime(d.bestTime || 0)) +
      row('Highest Level', d.highestLevel || 1) +
      row('Bosses Defeated', d.bosses || 0) +
      `<div class="profile-section">Owned Characters</div>` + tags(chars, 'None') +
      `<div class="profile-section">Unlocked Weapons</div>` + tags(weapons, 'None') +
      `<div class="profile-section">Exclusive Rewards & Titles</div>` + tags([...excl, ...titles], 'Compete each season to earn exclusives') +
      `<div class="profile-section">Achievements (${(d.achievements || []).length})</div>` + tags(d.achievements || [], 'None yet');

    this._show('profile-window');
    const saveBtn = document.getElementById('nick-save');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const r = this.setNickname(document.getElementById('nick-input').value);
      const note = document.getElementById('nick-note');
      if (note) { note.textContent = r.ok ? 'Nickname saved.' : r.error; note.classList.toggle('err', !r.ok); }
    });
  }

  // ---------------- leaderboard ----------------
  // ---------------- seasonal leaderboard ----------------
  async showLeaderboard() {
    this._show('leaderboard-window');
    this._renderSeasonBoard();
    this._startCountdown();
  }

  async _renderSeasonBoard() {
    const rows = document.getElementById('lb-rows');
    rows.innerHTML = '<div class="lb-empty">Loading…</div>';
    // Season name from LiveOps if available.
    try {
      const lo = window.HOODLUST.ui.eco.liveops;
      const nm = document.getElementById('lb-season-name');
      if (nm) nm.textContent = (lo.season().name || 'Season 1').replace(/^Season \d+\s*[—-]\s*/, '');
    } catch (_) {}

    const board = await this.backend.leaderboard('all');
    const me = this.session.wallet;
    // Derive season display fields (XP / wins / matches) from score deterministically.
    const row = (e, i) => {
      const rank = i + 1;
      const xp = Math.round(e.score * 1.5);
      const wins = Math.max(1, Math.floor(e.score / 900));
      const cls = ['lb-row', rank <= 3 ? 'top' + rank : '', e.wallet === me ? 'me' : ''].join(' ').trim();
      const name = e.wallet === me ? 'You' : (e.name || this.wallet.short(e.wallet));
      return `<div class="${cls}"><span class="lb-rank">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}</span>
        <span class="lb-name">${name}</span><span class="lb-xp">${xp.toLocaleString()}</span>
        <span class="lb-wins">${wins}</span></div>`;
    };
    rows.innerHTML = board.length ? board.map(row).join('')
      : '<div class="lb-empty">No ranked players yet this season — play a match to appear here!</div>';

    // "Your rank" summary card.
    const meEl = document.getElementById('lb-me');
    if (meEl) {
      const idx = board.findIndex(e => e.wallet === me);
      const best = this.save.data.bestScore || 0;
      const xp = Math.round(best * 1.5), wins = Math.max(0, Math.floor(best / 900)), matches = this.save.data.runs || 0;
      meEl.innerHTML = `<div class="lb-me-rank">${idx >= 0 ? '#' + (idx + 1) : 'Unranked'}</div>
        <div class="lb-me-stats"><span>XP <b>${xp.toLocaleString()}</b></span><span>Wins <b>${wins}</b></span><span>Matches <b>${matches}</b></span></div>`;
    }

    // Hidden (blurred) top-player rewards.
    const rw = document.getElementById('lb-rewards');
    if (rw) rw.innerHTML = `
      <div class="lb-rewards-title">Top-Player Season Rewards</div>
      <div class="lb-reward-grid">
        <div class="lb-reward-card"><span class="lb-rw-lbl">NFT</span><span class="lb-blur">█████</span></div>
        <div class="lb-reward-card"><span class="lb-rw-lbl">TOKEN</span><span class="lb-blur">████████</span></div>
        <div class="lb-reward-card"><span class="lb-rw-lbl">TOP PLAYERS</span><span class="lb-blur">████</span></div>
        <div class="lb-reward-card"><span class="lb-rw-lbl">SEASON BADGE</span><span class="lb-icon-blur">🏅</span></div>
        <div class="lb-reward-card"><span class="lb-rw-lbl">TITLE</span><span class="lb-blur">██████</span></div>
      </div>`;
    // Information panel.
    const info = document.getElementById('lb-info');
    if (info) info.innerHTML = `
      <div class="lb-info-title">How Seasonal Leaderboards Work</div>
      <p>Seasonal Leaderboards reset every season. Compete by earning XP and winning battles.
      The highest-ranked players receive exclusive seasonal rewards. Reward quantities remain
      hidden until the official announcement. Every season brings new rankings and exclusive content.</p>`;
  }

  _startCountdown() {
    const el = document.getElementById('lb-countdown');
    const tick = () => {
      if (!el) return;
      try { el.textContent = window.HOODLUST.ui.eco.liveops.seasonDaysLeft() + ' days'; }
      catch (_) { el.textContent = this.rewards.countdownText(); }
    };
    tick();
    clearInterval(this._cdT); this._cdT = setInterval(tick, 30000);
  }

  // ---------------- admin (removed from public demo build) ----------------
  showAdmin() { /* disabled in demo */ }
  _addAdminRule() {}
  _renderAdmin() {}
  _saveAdminRules() {}

  // ---------------- score submission (called by GameScene) ----------------
  async submitRun(stats, character) {
    const score = this.anticheat.computeScore(stats);
    // Update local best regardless.
    if (score > (this.save.data.bestScore || 0)) { this.save.data.bestScore = score; this.save.save(); }
    // Only verified holders submit to the leaderboard; validate first (anti-cheat).
    if (!this.session.verified || !this.session.wallet) return { score, submitted: false };
    if (!this.anticheat.validateScore(score, stats)) return { score, submitted: false, rejected: true };
    await this.backend.submitScore({ wallet: this.session.wallet, name: this.session.name, score, character, ts: Date.now() });
    // Cloud save (signed) + weekly reward check.
    const blob = { coins: this.save.data.coins, unlockedWeapons: this.save.data.unlockedWeapons, bestScore: this.save.data.bestScore };
    blob._sig = this.anticheat.sign(blob);
    await this.backend.cloudSave(this.session.wallet, blob);
    const reward = await this.rewards.processWeekly(this.session.wallet, this.anticheat);
    return { score, submitted: true, reward };
  }

  // ---------------- small helpers ----------------
  _fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }
  _show(id) { this.backdrop.classList.remove('hidden'); document.getElementById(id).classList.remove('hidden'); }
  _hide(id) { document.getElementById(id).classList.add('hidden'); this.backdrop.classList.add('hidden'); }
  _btn(id, show) { const el = document.getElementById(id); if (el) el.classList.toggle('hidden', !show); }
  _status(msg, kind) { const el = document.getElementById('wallet-status'); el.textContent = msg; el.className = 'wallet-status' + (kind ? ' ' + kind : ''); }
  _resetSteps() { ['ws-connect', 'ws-nft', 'ws-enter'].forEach(id => { const e = document.getElementById(id); if (e) e.className = ''; }); }
  _stepActive(id) { const e = document.getElementById(id); if (e) e.className = 'active'; }
  _stepDone(id) { const e = document.getElementById(id); if (e) e.className = 'done'; }
  _stepFail(id) { const e = document.getElementById(id); if (e) e.className = 'fail'; }
  _refreshMenuWallet() {
    const el = document.getElementById('menu-wallet-addr'); const wrap = document.getElementById('menu-wallet');
    if (!el) return;
    wrap.classList.remove('locked');
    if (this.session.verified) { el.textContent = this.wallet.short(this.session.wallet) + ' \u2714'; wrap.classList.add('verified'); }
    else if (this.session.wallet) { el.textContent = this.wallet.short(this.session.wallet); wrap.classList.remove('verified'); }
    else { el.textContent = 'Not connected'; wrap.classList.remove('verified'); }
  }
  _toast(msg) {
    // Reuse the achievement toast styling for online notices.
    const el = document.getElementById('achievement-toast');
    document.getElementById('ach-ico').textContent = '\u{1F517}';
    document.getElementById('ach-name').textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.add('hidden'), 3600);
  }
}
