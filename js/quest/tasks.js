/* ============================================================
   tasks.js — the whitelist quest system.
   Activates the path checkpoints, enforces task ORDER, drives the
   themed popups, validates every input, persists progress, submits
   to the Google Apps Script (api.js) and fires the celebration +
   permanent lock. Every editable link is read from config.js.

   WorldScene stays almost untouched: it just constructs a
   QuestManager, asks isBlocking() to freeze movement while a popup
   is open / after completion, and calls update(player) each frame.
   ============================================================ */

import { showPopup, showCelebration, showCompletedLock, closeActive } from './popup.js';
import { validateUsername, validateCommentLink, validateErc20 } from './validation.js';
import { Storage } from './storage.js';
import { submitWhitelist } from './api.js';
import { CONFIG } from './config.js';

function openTab(url) {
  try { window.open(url, '_blank', 'noopener,noreferrer'); }
  catch (e) { location.href = url; }
}

/* ---------------- ordered task runners ----------------
   Each returns a Promise<boolean> — true when fully completed,
   false when the player cancelled (task stays available). */

async function task1_follow() {
  const r = await showPopup({
    tag: 'TASK 1', icon: '\u2795', title: 'Follow our X account',
    desc: 'Follow the official HoodLust X account to begin the whitelist.',
    primary: { label: 'Open X' }, secondary: { label: 'Cancel' },
  });
  if (r.action !== 'primary') return false;
  openTab(CONFIG.xProfile);

  // After returning → confirm with the followed username (required).
  const u = await showPopup({
    tag: 'TASK 1', icon: '\u2705', title: 'Enter your X Username',
    desc: 'Confirm the account you followed with. You can\u2019t continue until it\u2019s submitted.',
    input: { label: 'X Username', placeholder: '@yourhandle', validate: validateUsername },
    primary: { label: 'Submit' },
  });
  Storage.saveSubmission('xUsername', u.value);
  return true;
}

async function task2_like() {
  const r = await showPopup({
    tag: 'TASK 2', icon: '\u2764\uFE0F', title: 'Like our X Post',
    desc: 'Like the pinned HoodLust post to unlock the next checkpoint.',
    primary: { label: 'Open Post' }, secondary: { label: 'Cancel' },
  });
  if (r.action !== 'primary') return false;
  openTab(CONFIG.xLikeLink);
  await showPopup({
    tag: 'TASK 2', icon: '\u2714\uFE0F', title: 'Post Liked',
    desc: 'Nice! The next checkpoint is now unlocked. No input needed.',
    primary: { label: 'Continue' },
  });
  return true;
}

async function task3_repost() {
  const r = await showPopup({
    tag: 'TASK 3', icon: '\uD83D\uDD01', title: 'Repost our X Post',
    desc: 'Repost the HoodLust post to spread the word.',
    primary: { label: 'Open Post' }, secondary: { label: 'Cancel' },
  });
  if (r.action !== 'primary') return false;
  openTab(CONFIG.xRepostLink);
  await showPopup({
    tag: 'TASK 3', icon: '\u2714\uFE0F', title: 'Reposted',
    desc: 'Thank you! The next checkpoint is unlocked.',
    primary: { label: 'Continue' },
  });
  return true;
}

// Task 4 (comment + link) chains straight into Task 5 (wallet).
async function task4_comment_and_wallet() {
  const r = await showPopup({
    tag: 'TASK 4', icon: '\uD83D\uDCAC', title: 'Comment on our X Post',
    desc: 'Leave a comment on the HoodLust post, then paste the link to it.',
    primary: { label: 'Open Post' }, secondary: { label: 'Cancel' },
  });
  if (r.action !== 'primary') return false;
  openTab(CONFIG.xCommentLink);

  const link = await showPopup({
    tag: 'TASK 4', icon: '\uD83D\uDD17', title: 'Comment Link',
    desc: 'Paste the direct link to your comment.',
    input: {
      label: 'Comment URL', placeholder: 'https://x.com/...',
      hint: 'Must start with https://x.com/ or https://twitter.com/',
      validate: validateCommentLink,
    },
    primary: { label: 'Submit' },
  });
  Storage.saveSubmission('commentLink', link.value);

  // --- TASK 5 — immediately after the comment link ---
  const wallet = await showPopup({
    tag: 'TASK 5', icon: '\uD83D\uDC5B', title: 'Wallet Address',
    desc: 'Enter the ERC-20 wallet address for your whitelist spot.',
    input: {
      label: 'ERC-20 Wallet Address', placeholder: '0x...',
      hint: 'Must be a valid ERC-20 address (0x + 40 hex characters, 42 total).',
      validate: validateErc20,
    },
    primary: { label: 'Submit' },
  });
  Storage.saveSubmission('wallet', wallet.value);
  return true;
}

const TASKS = [
  { stationId: 'task1', objective: 'Walk to Task Area 1', run: task1_follow },
  { stationId: 'task2', objective: 'Walk to Task Area 2', run: task2_like },
  { stationId: 'task3', objective: 'Walk to Task Area 3', run: task3_repost },
  { stationId: 'task4', objective: 'Walk to Task Area 4', run: task4_comment_and_wallet },
];

/* ---------------- Quest manager ---------------- */

export class QuestManager {
  constructor(scene) {
    this.scene = scene;
    this.step = 0;
    this.completed = false;
    this.busy = false;
    this.modalOpen = false;
    this.armed = true;         // require leaving a zone before re-trigger
    this.tasks = TASKS;
  }

  init() {
    Storage.setCharacter(this.scene.charDef ? this.scene.charDef.id : null);
    const state = Storage.get();
    this.step = Math.min(state.step || 0, this.tasks.length);
    this.completed = !!state.completed;

    this._buildObjective();
    this._refreshStations();

    if (this.completed) {
      // Already finished — permanently locked, no replay.
      showCompletedLock();
      this._setObjective('Whitelist completed \u2014 thank you.');
    } else if (this.step >= this.tasks.length) {
      // All tasks done but submission didn't finish last time — resume it.
      this._finalize();
    } else {
      this._setObjective(this._currentObjectiveText());
    }
  }

  // Movement is frozen while a popup is up, during celebration, or forever
  // once the whitelist is completed.
  isBlocking() { return this.modalOpen || this.completed; }

  update(player) {
    if (this.completed || this.busy || this.step >= this.tasks.length) return;
    const task = this.tasks[this.step];
    const st = this._station(task.stationId);
    if (!st) return;

    const near = Math.abs(player.x - st.x) < 120 &&
                 Math.abs(player.y - this.scene.player.y) < 9999 &&
                 Math.abs(player.y - (st.board ? st.board.y : player.y)) < 240;

    if (!near) { this.armed = true; return; }
    if (near && this.armed && !this.busy) {
      this.armed = false;
      this._trigger(this.step);
    }
  }

  async _trigger(index) {
    const task = this.tasks[index];
    this.busy = true;
    this._setModal(true);
    let done = false;
    try { done = await task.run(); }
    catch (e) { done = false; console.warn('[quest] task error', e); }
    this._setModal(false);
    this.busy = false;

    if (!done) return; // cancelled — stays available on re-approach

    this.step = index + 1;
    Storage.setStep(this.step);
    this._refreshStations();

    if (this.step >= this.tasks.length) this._finalize();
    else this._setObjective(this._currentObjectiveText());
  }

  async _finalize() {
    this._refreshStations();
    this._setObjective('Submitting your whitelist entry\u2026');

    // Send exactly { username, comment, wallet } to the Apps Script,
    // retrying until it succeeds. Only lock the experience on success.
    this._setModal(true);
    const snap = Storage.snapshot();
    const entry = {
      username: snap.submissions.xUsername || '',
      comment: snap.submissions.commentLink || '',
      wallet: snap.submissions.wallet || '',
    };

    let ok = false;
    while (!ok) {
      // Non-dismissible loading state — button disabled, no double submit.
      showPopup({
        tag: 'SUBMISSION', icon: '\uD83D\uDCE4', title: 'Submitting\u2026',
        desc: 'Sending your whitelist entry. Please wait\u2026',
        loading: true, primary: { label: 'Submitting\u2026' },
      });
      const res = await submitWhitelist(entry);
      closeActive();
      if (res.ok) { ok = true; break; }
      // Beautiful failure popup — player can retry (entered data is kept).
      await showPopup({
        tag: 'SUBMISSION', icon: '\u26A0\uFE0F', title: 'Submission Failed',
        desc: 'We couldn\u2019t reach the server. Please try again \u2014 your details are saved.',
        primary: { label: 'Try Again' },
      });
    }
    this._setModal(false);

    // --- Success: permanently complete + celebrate ---
    this.completed = true;
    Storage.markCompleted();
    this._refreshStations();
    this._setObjective('Whitelist completed \u2014 thank you.');

    // Camera shake + glow + confetti + victory sound.
    const cam = this.scene.cameras.main;
    cam.shake(700, 0.008);
    cam.flash(600, 255, 220, 150);
    this._playerGlow();

    showCelebration();
    // Settle into the permanent "Whitelist Completed / Thank you." panel.
    setTimeout(() => showCompletedLock(), 6000);
  }

  /* ---------------- visuals ---------------- */
  _station(id) { return (this.scene.stations || []).find(s => s.def.id === id); }

  _refreshStations() {
    for (const st of (this.scene.stations || [])) {
      const taskIdx = this.tasks.findIndex(t => t.stationId === st.def.id);
      let state;
      if (st.def.id === 'final') {
        state = this.completed ? 'done' : 'final';
      } else if (taskIdx < 0) {
        state = 'locked';
      } else if (taskIdx < this.step) {
        state = 'done';
      } else if (taskIdx === this.step && !this.completed) {
        state = 'active';
      } else {
        state = 'locked';
      }
      this._styleStation(st, state);
    }
  }

  _styleStation(st, state) {
    const map = {
      locked: { txt: '\uD83D\uDD12 LOCKED',   color: '#ff9a9a', bg: '#2a1420', ring: 0xb98cff, alpha: 0.35 },
      active: { txt: '\u2757 ACTIVE',          color: '#141014', bg: '#f2d16b', ring: 0xffd24f, alpha: 0.6 },
      done:   { txt: '\u2714 DONE',            color: '#0e2417', bg: '#9fe8c0', ring: 0x6fe08a, alpha: 0.5 },
      final:  { txt: '\uD83C\uDFC1 FINAL AREA', color: '#141014', bg: '#ffd27a', ring: 0xffd24f, alpha: 0.5 },
    };
    const s = map[state] || map.locked;
    if (st.badge) st.badge.setText(s.txt).setColor(s.color).setBackgroundColor(s.bg);
    if (st.ring) {
      st.ring.setTint(s.ring);
      // gentle extra pulse for the active checkpoint
      if (state === 'active' && !st._pulse) {
        st._pulse = this.scene.tweens.add({ targets: st.ring, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });
      } else if (state !== 'active' && st._pulse) {
        st._pulse.stop(); st._pulse = null; st.ring.setAlpha(s.alpha);
      }
    }
  }

  _playerGlow() {
    const p = this.scene.player;
    const g = this.scene.add.image(p.x, p.y - p.displayHeight * 0.4, 'glow')
      .setBlendMode('ADD').setTint(0xffe6a0).setDepth(p.y + 1).setScale(0.5).setAlpha(0.9);
    this.scene.tweens.add({ targets: g, scale: 3.4, alpha: 0, duration: 1200, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  }

  /* ---------------- objective HUD ---------------- */
  _buildObjective() {
    this.objective = this.scene.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#9fe8c0',
      backgroundColor: 'rgba(10,20,14,0.6)', padding: { x: 12, y: 9 }, align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200000);
    this._layoutObjective();
    this.scene.scale.on('resize', this._layoutObjective, this);
    this.scene.events.once('shutdown', () => this.scene.scale.off('resize', this._layoutObjective, this));
  }
  _layoutObjective() {
    if (this.objective) this.objective.setPosition(this.scene.scale.width / 2, 44);
  }
  _setObjective(text) { if (this.objective) this.objective.setText(text); }
  _currentObjectiveText() {
    const t = this.tasks[this.step];
    return t ? `OBJECTIVE:  ${t.objective}  \u25B6` : 'Whitelist completed \u2014 thank you.';
  }

  _setModal(open) {
    this.modalOpen = open;
    // Stop Phaser eating keystrokes while the player types in a popup.
    if (this.scene.input && this.scene.input.keyboard) this.scene.input.keyboard.enabled = !open;
  }
}
