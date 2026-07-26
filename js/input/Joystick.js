/* ============================================================
   Joystick.js — DOM virtual joystick + run button for touch.
   Exposes .vector {x,y} (-1..1), .active and .running flags.
   Identical behaviour to the HoodLust joystick.
   ============================================================ */

export class Joystick {
  constructor() {
    this.vector = { x: 0, y: 0 };
    this.active = false;
    this.running = false;

    this.root   = document.getElementById('touch-controls');
    this.base    = document.getElementById('joystick-base');
    this.thumb   = document.getElementById('joystick-thumb');
    this.runBtn  = document.getElementById('run-btn');

    this.maxRadius = 44;
    this.touchId = null;
    this._origin = null;

    this._bind();
  }

  isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  show() { if (this.isTouchDevice() && this.root) this.root.classList.remove('hidden'); }
  hide() { if (this.root) this.root.classList.add('hidden'); this._reset(); }

  _reset() {
    this.active = false;
    this.vector.x = 0; this.vector.y = 0;
    this.touchId = null;
    if (this.thumb) this.thumb.style.transform = 'translate(-50%,-50%)';
  }

  _bind() {
    if (!this.base) return;
    const start = (clientX, clientY, id) => {
      this.active = true; this.touchId = id;
      this._origin = this.base.getBoundingClientRect();
      this._move(clientX, clientY);
    };
    const move = (clientX, clientY) => { if (this.active) this._move(clientX, clientY); };

    this.base.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.base.setPointerCapture(e.pointerId);
      start(e.clientX, e.clientY, e.pointerId);
    });
    this.base.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.touchId) return;
      move(e.clientX, e.clientY);
    });
    const end = (e) => { if (e.pointerId === this.touchId) this._reset(); };
    this.base.addEventListener('pointerup', end);
    this.base.addEventListener('pointercancel', end);

    if (this.runBtn) {
      const setRun = (v) => (e) => { e.preventDefault(); this.running = v; this.runBtn.classList.toggle('active', v); };
      this.runBtn.addEventListener('pointerdown', setRun(true));
      this.runBtn.addEventListener('pointerup', setRun(false));
      this.runBtn.addEventListener('pointerleave', setRun(false));
      this.runBtn.addEventListener('pointercancel', setRun(false));
    }
  }

  _move(clientX, clientY) {
    const cx = this._origin.left + this._origin.width / 2;
    const cy = this._origin.top + this._origin.height / 2;
    let dx = clientX - cx, dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > this.maxRadius) { dx = dx / dist * this.maxRadius; dy = dy / dist * this.maxRadius; }
    this.thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.vector.x = dx / this.maxRadius;
    this.vector.y = dy / this.maxRadius;
  }
}
