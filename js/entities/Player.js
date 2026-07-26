/* ============================================================
   Player.js — the playable HoodLust character in the whitelist
   world. 8-direction movement with smooth acceleration/decel,
   facing/flip and idle/walk/run states — identical feel to the
   HoodLust game. Directional sheet animations play automatically.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';
import { animKey } from '../data/characters.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, char) {
    const startTex = char.prefix ? `${char.prefix}_idle` : 'idle';
    super(scene, x, y, startTex);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.char = char;
    const c = CONFIG.player;
    this.cfg = { ...c };

    // Feet-anchored, scaled DOWN to a target height (never up).
    this.setOrigin(0.5, 1);
    const fw = this.width, fh = this.height;
    const targetH = c.displaySize * 1.4;
    this.setScale(Math.min(1, targetH / fh));
    this.setDepth(DEPTH.PLAYER);

    // Feet-area collision body.
    const bw = fw * c.bodyScaleX;
    const bh = fh * c.bodyScaleY;
    this.body.setSize(bw, bh);
    this.body.setOffset((fw - bw) / 2, fh - bh - fh * 0.04);
    this.setCollideWorldBounds(true);

    this.state = 'idle';
    this.facing = 'down';
    this._bobT = 0;
    this._baseScale = this.scale;

    this.play(this._animName('idle'));

    // Soft shadow tracking the feet.
    this.shadow = scene.add.ellipse(x, y, c.displaySize * 0.42, c.displaySize * 0.16, 0x000000, 0.35);
    this.shadow.setDepth(DEPTH.PLAYER - 1);
  }

  update(delta, moveVec, running) {
    const c = this.cfg;
    const dt = delta / 1000;
    const moving = (moveVec.x !== 0 || moveVec.y !== 0);
    const maxSpeed = running ? c.runSpeed : c.walkSpeed;

    const targetVX = moveVec.x * maxSpeed;
    const targetVY = moveVec.y * maxSpeed;

    // Frame-rate-independent smoothing (accel / decel) — exactly HoodLust.
    const rate = moving ? c.accel : c.decel;
    const t = 1 - Math.exp(-rate * dt);
    const vx = Phaser.Math.Linear(this.body.velocity.x, targetVX, t);
    const vy = Phaser.Math.Linear(this.body.velocity.y, targetVY, t);
    this.setVelocity(vx, vy);

    const speed = Math.hypot(vx, vy);
    let next = 'idle';
    if (moving && speed > 4) next = running ? 'run' : 'walk';
    if (next !== this.state) this._setState(next);

    if (moving) {
      this.facing = this._facingFromVec(moveVec.x, moveVec.y);
      if (moveVec.x < -0.15) this.setFlipX(true);
      else if (moveVec.x > 0.15) this.setFlipX(false);
    }

    this._animateFallback(dt, speed, maxSpeed);
    this.shadow.setPosition(this.x, this.y);
  }

  _animName(s) { return animKey(this.char, s); }
  _hasAnim(s) { return this.scene.anims.exists(this._animName(s)); }

  _setState(s) {
    this.state = s;
    if (this._hasAnim(s)) this.play(this._animName(s), true);
    else if (this._hasAnim('idle')) this.play(this._animName('idle'), true);
  }

  _facingFromVec(x, y) {
    const a = Phaser.Math.RadToDeg(Math.atan2(y, x));
    const dirs = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
    const idx = Math.round(((a + 360) % 360) / 45) % 8;
    return dirs[idx];
  }

  // Subtle squash/bob when a state has no dedicated frame anim.
  _animateFallback(dt, speed) {
    if (this._hasAnim(this.state)) return;
    if (speed > 4) {
      const freq = this.state === 'run' ? 15 : 9;
      this._bobT += dt * freq;
      const amp = this.state === 'run' ? 0.06 : 0.035;
      const s = this._baseScale * (1 + Math.sin(this._bobT) * amp);
      this.setScale(this._baseScale * (1 - Math.sin(this._bobT) * amp * 0.5), s);
    } else {
      this._bobT = 0;
      const s = Phaser.Math.Linear(this.scaleY, this._baseScale, 1 - Math.exp(-10 * dt));
      this.setScale(this._baseScale, s);
    }
  }

  destroy(fromScene) {
    if (this.shadow) this.shadow.destroy();
    super.destroy(fromScene);
  }
}
