/* ============================================================
   popup.js — beautiful modal popups + the victory celebration for
   the whitelist quest. Pure DOM (matches the cute-gothic pixel
   theme); every popup returns a Promise so tasks.js can await the
   player's action. No task logic lives here.
   ============================================================ */

function ensureRoot() {
  let root = document.getElementById('wl-popup-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'wl-popup-root';
    document.body.appendChild(root);
  }
  return root;
}

let activeBackdrop = null;

/**
 * Show a themed popup.
 * @param {Object} o
 *   o.icon        emoji/glyph shown at the top
 *   o.tag         small label above the title (e.g. "TASK 1")
 *   o.title       heading
 *   o.desc        body line(s)
 *   o.input       { label, placeholder, hint, validate(value)->{ok,error,value} }
 *   o.primary     { label }   main button (required)
 *   o.secondary   { label }   optional second button (e.g. Cancel)
 * @returns {Promise<{action:'primary'|'secondary', value?:string}>}
 */
export function showPopup(o) {
  const root = ensureRoot();
  closeActive();

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'wl-backdrop';
    activeBackdrop = backdrop;

    const card = document.createElement('div');
    card.className = 'wl-card';

    if (o.icon) {
      const ic = document.createElement('div');
      ic.className = 'wl-card-icon';
      ic.textContent = o.icon;
      card.appendChild(ic);
    }
    if (o.tag) {
      const tg = document.createElement('div');
      tg.className = 'wl-card-tag';
      tg.textContent = o.tag;
      card.appendChild(tg);
    }
    const h = document.createElement('div');
    h.className = 'wl-card-title';
    h.textContent = o.title || '';
    card.appendChild(h);

    if (o.desc) {
      const d = document.createElement('div');
      d.className = 'wl-card-desc';
      d.textContent = o.desc;
      card.appendChild(d);
    }

    let inputEl = null, errEl = null;
    if (o.input) {
      const wrap = document.createElement('div');
      wrap.className = 'wl-field';
      if (o.input.label) {
        const lab = document.createElement('label');
        lab.className = 'wl-field-label';
        lab.textContent = o.input.label;
        wrap.appendChild(lab);
      }
      inputEl = document.createElement('input');
      inputEl.className = 'wl-input';
      inputEl.type = 'text';
      inputEl.autocomplete = 'off';
      inputEl.spellcheck = false;
      inputEl.placeholder = o.input.placeholder || '';
      wrap.appendChild(inputEl);
      if (o.input.hint) {
        const hint = document.createElement('div');
        hint.className = 'wl-field-hint';
        hint.textContent = o.input.hint;
        wrap.appendChild(hint);
      }
      errEl = document.createElement('div');
      errEl.className = 'wl-field-err';
      wrap.appendChild(errEl);
      card.appendChild(wrap);
    }

    const actions = document.createElement('div');
    actions.className = 'wl-actions';

    let submitting = false;
    const submit = () => {
      if (submitting) return;                    // prevent double-click / double-submit
      if (o.input && o.input.validate) {
        const res = o.input.validate(inputEl.value);
        if (!res.ok) {
          errEl.textContent = res.error || 'Please check your entry.';
          inputEl.classList.add('bad');
          inputEl.focus();
          return;
        }
        submitting = true;
        finish({ action: 'primary', value: res.value != null ? res.value : inputEl.value.trim() });
        return;
      }
      submitting = true;
      finish({ action: 'primary' });
    };

    const finish = (result) => {
      backdrop.classList.remove('shown');
      setTimeout(() => { if (backdrop.parentNode) backdrop.remove(); if (activeBackdrop === backdrop) activeBackdrop = null; }, 220);
      resolve(result);
    };

    if (o.secondary) {
      const b2 = document.createElement('button');
      b2.className = 'wl-btn wl-btn-ghost';
      b2.type = 'button';
      b2.textContent = o.secondary.label;
      b2.addEventListener('click', () => finish({ action: 'secondary' }));
      actions.appendChild(b2);
    }
    const b1 = document.createElement('button');
    b1.className = 'wl-btn wl-btn-primary';
    b1.type = 'button';
    b1.textContent = o.primary.label;
    if (o.loading) {
      // Non-dismissible loading state: disabled button, no action.
      b1.classList.add('wl-btn-loading');
      b1.disabled = true;
    } else {
      b1.addEventListener('click', submit);
    }
    actions.appendChild(b1);
    card.appendChild(actions);

    if (inputEl) {
      inputEl.addEventListener('input', () => { inputEl.classList.remove('bad'); errEl.textContent = ''; });
      inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    }

    backdrop.appendChild(card);
    root.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('shown'));
    if (inputEl) setTimeout(() => inputEl.focus(), 120);
  });
}

export function closeActive() {
  if (activeBackdrop) {
    const b = activeBackdrop; activeBackdrop = null;
    b.classList.remove('shown');
    setTimeout(() => { if (b.parentNode) b.remove(); }, 200);
  }
}

/* ---------------- VICTORY CELEBRATION ---------------- */

export function playVictorySound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.45);
    });
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1400);
  } catch (e) { /* audio not allowed */ }
}

function runConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);
  const colors = ['#ff5a8a', '#f2d16b', '#9fe8c0', '#b98cff', '#ffffff', '#ff8ab0'];
  const N = 220;
  const parts = Array.from({ length: N }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 10,
    vy: 2 + Math.random() * 4,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4,
    color: colors[(Math.random() * colors.length) | 0],
  }));
  let start = performance.now();
  const tick = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.02;
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = elapsed > 5000 ? Math.max(0, 1 - (elapsed - 5000) / 2500) : 1;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (elapsed < 7500) requestAnimationFrame(tick);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); window.removeEventListener('resize', resize); }
  };
  requestAnimationFrame(tick);
}

/**
 * Full-screen celebration. Confetti + glow + victory copy, then it
 * settles into the permanent "Whitelist Completed" lock panel.
 */
export function showCelebration() {
  const root = ensureRoot();
  const overlay = document.createElement('div');
  overlay.id = 'wl-celebrate';
  overlay.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.className = 'wl-confetti';
  overlay.appendChild(canvas);

  const panel = document.createElement('div');
  panel.className = 'wl-celebrate-panel';
  panel.innerHTML = `
    <div class="wl-celebrate-crest">&#127881;</div>
    <div class="wl-celebrate-title">CONGRATULATIONS!</div>
    <div class="wl-celebrate-msg">You have successfully joined the<br/><b>HoodLust Access Pass</b> Whitelist.</div>
    <div class="wl-celebrate-badge">&#9733; WHITELISTED &#9733;</div>
  `;
  overlay.appendChild(panel);
  root.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('shown'));
  runConfetti(canvas);
  playVictorySound();
  return overlay;
}

/**
 * The permanent completed state — shown after the celebration and on
 * every future load once whitelisting is finished. No replay.
 */
export function showCompletedLock() {
  const root = ensureRoot();
  let overlay = document.getElementById('wl-completed');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'wl-completed';
  overlay.innerHTML = `
    <div class="wl-completed-panel">
      <div class="wl-completed-crest">&#9829;</div>
      <div class="wl-completed-title">WHITELIST COMPLETED</div>
      <div class="wl-completed-sub">Thank you.</div>
      <div class="wl-completed-foot">HoodLust Access Pass</div>
    </div>
  `;
  root.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('shown'));
  return overlay;
}
