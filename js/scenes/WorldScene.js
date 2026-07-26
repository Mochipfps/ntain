/* ============================================================
   WorldScene.js — the walkable whitelist map. One straight forward
   path from the START point to the Final Area, lined with the
   HoodLust forest. Movement + camera are identical to the game.
   Task areas are LOCKED placeholders only — no logic yet (Step 2).
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';
import { CHARACTERS } from '../data/characters.js';
import { Player } from '../entities/Player.js';
import { InputManager } from '../input/InputManager.js';
import { QuestManager } from '../quest/tasks.js';

export class WorldScene extends Phaser.Scene {
  constructor() { super('WorldScene'); }

  init(data) {
    this.joystick = data && data.joystick ? data.joystick : null;
    this.charDef = CHARACTERS.find(c => c.id === (data && data.character)) || CHARACTERS[0];
  }

  create() {
    const W = CONFIG.world.width, H = CONFIG.world.height;
    const laneY = CONFIG.path.laneY, laneHalf = CONFIG.path.laneHalfHeight;

    const cam = this.cameras.main;
    cam.fadeIn(400, 8, 10, 16);
    cam.roundPixels = true;

    // --- Bounds: camera sees the whole corridor; player is kept in the lane ---
    this.physics.world.setBounds(0, laneY - laneHalf, W, laneHalf * 2);
    cam.setBounds(0, 0, W, H);
    cam.setBackgroundColor(CONFIG.world.floorColor);

    // --- Floor + path ---
    this.add.tileSprite(0, 0, W, H, 'grass_forest').setOrigin(0, 0).setDepth(DEPTH.FLOOR);
    // Winding-free straight stone path band down the centre of the lane.
    const pathImg = this.textures.get('path').getSourceImage();
    const bandH = Math.min(laneHalf * 1.5, pathImg.height * 3 || 260);
    this.add.tileSprite(0, laneY, W, bandH, 'path').setOrigin(0, 0.5).setDepth(DEPTH.PATH).setAlpha(0.9);

    // --- Decorative forest borders (visual only, outside the lane) ---
    this._decorate(W, H, laneY, laneHalf);

    // --- Collidable obstacles sparsely inside the lane (keep centre clear) ---
    this.props = this.physics.add.staticGroup();
    this._obstacles(W, laneY, laneHalf);

    // --- Player at the START point ---
    this.player = new Player(this, CONFIG.path.startX, laneY, this.charDef);
    this.physics.add.collider(this.player, this.props);

    this.inputMgr = new InputManager(this, this.joystick);

    // --- Camera — identical follow/deadzone/lerp to HoodLust ---
    cam.startFollow(this.player, true, CONFIG.camera.lerp, CONFIG.camera.lerp);
    cam.setDeadzone(CONFIG.camera.deadzoneW, CONFIG.camera.deadzoneH);

    // --- START pad marker ---
    this._startPad(CONFIG.path.startX, laneY);

    // --- Task placeholders (LOCKED) ---
    this.stations = CONFIG.path.stations.map(s => this._buildStation(s, laneY));
    this._nearStation = null;

    // --- Atmosphere: light wash + vignette (screen-space) ---
    this._buildAtmosphere();

    // --- HUD hint (screen-fixed) ---
    this._buildHint();

    // --- Quest system (Step 2): activates the checkpoints, order,
    //     popups, validation, persistence, celebration + lock. ---
    this.quest = new QuestManager(this);
    this.quest.init();

    // Fit the joystick in on touch.
    if (this.joystick) this.joystick.show();

    this.scale.on('resize', this._onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this._onResize, this));
  }

  /* ---------------- world building ---------------- */
  _rng(seed) {
    let s = seed;
    return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  }

  _decorate(W, H, laneY, laneHalf) {
    const rand = this._rng(9137);
    const topEdge = laneY - laneHalf;
    const botEdge = laneY + laneHalf;

    // Dense tree line just outside both edges → reads as a forest corridor.
    const treeImg = this.textures.get('tree').getSourceImage();
    const place = (key, x, y, opts = {}) => {
      const spr = this.add.image(x, y, key).setOrigin(0.5, opts.originY != null ? opts.originY : 0.85);
      spr.setDepth(y);
      if (opts.tint) spr.setTint(opts.tint);
      if (opts.scale) spr.setScale(opts.scale);
      return spr;
    };

    for (let x = 60; x < W - 40; x += 96 + rand() * 44) {
      // top rows (behind the lane)
      place('tree', x, topEdge - 20 - rand() * 90, { tint: 0x6fae5a, scale: 0.9 + rand() * 0.3 });
      if (rand() > 0.5) place('tree', x + 40, topEdge - 120 - rand() * 120, { tint: 0x5f9a4c, scale: 0.8 });
      // bottom rows (in front, larger)
      place('tree', x + 20, botEdge + 30 + rand() * 90, { tint: 0x6fae5a, scale: 1.0 + rand() * 0.35 });
      if (rand() > 0.5) place('tree', x - 30, botEdge + 130 + rand() * 120, { tint: 0x79bb63, scale: 1.1 });
    }

    // Bushes + flowers + mushrooms scattered along the edges (decor).
    const flora = ['bush', 'flower_pink', 'flower_blue', 'flower_purple', 'flower_gold', 'mushroom'];
    for (let i = 0; i < 220; i++) {
      const key = flora[(rand() * flora.length) | 0];
      const onTop = rand() > 0.5;
      const x = 40 + rand() * (W - 80);
      const y = onTop
        ? topEdge - 6 - rand() * 70
        : botEdge + 6 + rand() * 80;
      const glow = key === 'mushroom' ? 0xff8a9a : null;
      const spr = place(key, x, y, { scale: 0.8 + rand() * 0.5, originY: 0.9 });
      if (glow) {
        const g = this.add.image(x, y - 8, 'glow').setBlendMode('ADD').setTint(glow).setAlpha(0.35).setScale(0.7).setDepth(y - 1);
        this.tweens.add({ targets: g, alpha: 0.55, scale: 0.9, duration: 1200 + rand() * 800, yoyo: true, repeat: -1 });
      }
    }

    // A few crystals as glowing landmarks between stations.
    for (let i = 0; i < 10; i++) {
      const x = 500 + rand() * (W - 900);
      const onTop = rand() > 0.5;
      const y = onTop ? topEdge - 30 - rand() * 40 : botEdge + 40 + rand() * 40;
      place('crystal', x, y, { scale: 0.9, originY: 0.85 });
      const g = this.add.image(x, y - 20, 'glow').setBlendMode('ADD').setTint(0xb98cff).setAlpha(0.4).setScale(1.1).setDepth(y - 1);
      this.tweens.add({ targets: g, alpha: 0.7, scale: 1.4, duration: 1600, yoyo: true, repeat: -1 });
    }
  }

  _obstacles(W, laneY, laneHalf) {
    const rand = this._rng(4242);
    // Sparse collidable rocks/trees inside the lane but off the central line,
    // so walking straight forward is always clear.
    for (let i = 0; i < 26; i++) {
      const x = 620 + rand() * (W - 1000);
      // keep away from station centres
      if (CONFIG.path.stations.some(s => Math.abs(s.x - x) < 150)) continue;
      const side = rand() > 0.5 ? 1 : -1;
      const y = laneY + side * (laneHalf * 0.55 + rand() * (laneHalf * 0.4));
      const key = rand() > 0.5 ? 'rock' : 'tree';
      const s = this.props.create(x, y, key).setOrigin(0.5, 0.85);
      s.setDepth(y);
      if (key === 'tree') s.setTint(0x6fae5a).setScale(0.85);
      const bw = key === 'tree' ? 16 : 26, bh = 12;
      s.body.setSize(bw, bh);
      s.body.setOffset((s.width - bw) / 2, s.height * (key === 'tree' ? 0.72 : 0.5));
      s.refreshBody();
    }
  }

  _startPad(x, y) {
    const ring = this.add.image(x, y, 'glow').setBlendMode('ADD').setTint(0x9fe8c0).setAlpha(0.55).setScale(2.4).setDepth(DEPTH.PATH + 1);
    this.tweens.add({ targets: ring, scale: 3.0, alpha: 0.3, duration: 1400, yoyo: true, repeat: -1 });
    this.add.text(x, y - 120, 'START', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '12px', color: '#9fe8c0',
      stroke: '#04120a', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTH.FX);
    this.add.text(x, y - 96, '\u25B6 walk forward', {
      fontFamily: 'monospace', fontSize: '13px', color: '#dfe6ee', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH.FX);
  }

  _buildStation(def, laneY) {
    const x = def.x;
    const isFinal = !!def.final;
    const tex = isFinal ? 'vault' : 'quest_board';
    const tint = isFinal ? 0xffd24f : 0xb98cff;

    // Glowing base ring.
    const ring = this.add.image(x, laneY, 'glow').setBlendMode('ADD').setTint(tint).setAlpha(0.5).setScale(isFinal ? 3.4 : 2.6).setDepth(DEPTH.PATH + 1);
    this.tweens.add({ targets: ring, scale: (isFinal ? 4.0 : 3.1), alpha: 0.28, duration: 1500, yoyo: true, repeat: -1 });

    // The board / vault structure.
    const board = this.add.image(x, laneY + 6, tex).setOrigin(0.5, 0.9).setDepth(laneY + 6);
    board.setScale(isFinal ? 1.15 : 1.0);

    // Floating label plate.
    const plateY = laneY - (isFinal ? 150 : 128);
    const label = this.add.text(x, plateY, def.label.toUpperCase(), {
      fontFamily: '"Press Start 2P", monospace', fontSize: isFinal ? '13px' : '11px',
      color: isFinal ? '#f2d16b' : '#e8dcff', stroke: '#000', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.FX);

    // LOCKED badge.
    const badge = this.add.text(x, plateY + 26, '\uD83D\uDD12 LOCKED', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: '#ff9a9a',
      backgroundColor: '#2a1420', padding: { x: 8, y: 6 }, stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(DEPTH.FX);

    // Gentle bob on the label group.
    this.tweens.add({ targets: [label, badge], y: '-=6', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    return { def, x, ring, board, label, badge };
  }

  /* ---------------- atmosphere ---------------- */
  _buildAtmosphere() {
    const { width, height } = this.scale;
    // Warm additive light wash (brightens only — keeps pixel style).
    this.lightWash = this.add.rectangle(0, 0, width, height, CONFIG.world.lightTint, CONFIG.world.lightIntensity)
      .setOrigin(0, 0).setScrollFactor(0).setBlendMode('ADD').setDepth(DEPTH.FX - 2);
    // Vignette.
    this.vignette = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.FX - 1);
    this._drawVignette(width, height);
  }
  _drawVignette(w, h) {
    const g = this.vignette; g.clear();
    for (let i = 0; i < 6; i++) {
      const a = 0.11 * (i / 6), inset = (i / 6) * Math.min(w, h) * 0.5;
      g.fillStyle(0x000000, a);
      g.fillRect(0, 0, w, inset); g.fillRect(0, h - inset, w, inset);
      g.fillRect(0, 0, inset, h); g.fillRect(w - inset, 0, inset, h);
    }
  }

  /* ---------------- HUD ---------------- */
  _buildHint() {
    const touch = this.sys.game.device.input.touch;
    const txt = touch ? 'Joystick to move  \u2022  RUN to sprint'
                      : 'WASD / Arrows to move  \u2022  Shift to run';
    this.hint = this.add.text(0, 0, txt, {
      fontFamily: 'monospace', fontSize: '13px', color: '#dfe6ee',
      backgroundColor: 'rgba(10,14,20,0.55)', padding: { x: 10, y: 7 },
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.banner = this.add.text(0, 0, 'HOODLUST ACCESS PASS \u2014 WHITELIST PATH', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#f2d16b',
      stroke: '#2a1500', strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.HUD);

    // "Locked" toast shown when standing at a station.
    this.toast = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#ffd6d6',
      backgroundColor: 'rgba(42,20,32,0.9)', padding: { x: 12, y: 10 }, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD).setAlpha(0);

    this._layoutHud();
  }

  _layoutHud() {
    const W = this.scale.width, H = this.scale.height;
    if (this.lightWash) this.lightWash.setSize(W, H);
    if (this.vignette) this._drawVignette(W, H);
    if (this.hint) this.hint.setPosition(14, H - 34);
    if (this.banner) this.banner.setPosition(W / 2, 12);
    if (this.toast) this.toast.setPosition(W / 2, H * 0.72);
  }

  _onResize() { this._layoutHud(); }

  /* ---------------- loop ---------------- */
  update(time, delta) {
    // Freeze movement while a quest popup is open or after completion —
    // the walk/camera/animation feel is otherwise unchanged from HoodLust.
    const blocking = this.quest && this.quest.isBlocking();
    const move = blocking ? { x: 0, y: 0 } : this.inputMgr.getMoveVector();
    const running = !blocking && this.inputMgr.isRunning();
    this.player.update(delta, move, running);
    this.player.setDepth(this.player.y);
    this.player.shadow.setDepth(this.player.y - 1);

    if (this.quest) this.quest.update(this.player);
  }
}
