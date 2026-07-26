/* ============================================================
   BootScene.js — preloads every whitelist asset with pixel-art
   (nearest-neighbour) settings and registers character animations
   sliced from the HoodLust master sheets. Does NOT auto-start the
   world; the screen flow (intro → join → select) drives that.
   ============================================================ */

import { CONFIG } from '../config.js';
import { CHARACTERS, CHAR_SHEETS, ANIM_PLAY, texKey, animKey } from '../data/characters.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Gentle parallel cap — reliable on static hosts.
    this.load.maxParallelDownloads = 6;

    // Force nearest-neighbour on every loaded texture (no blur, no AA).
    this.load.on('filecomplete', (key, type) => {
      if (type === 'image' && this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    // --- Characters: idle / walk / run sheets + portrait for each ---
    for (const ch of CHARACTERS) {
      const sheet = CHAR_SHEETS[ch.sheet];
      for (const [state, [fw, fh]] of Object.entries(sheet)) {
        this.load.spritesheet(texKey(ch, state), `assets/characters/${texKey(ch, state)}.png`, { frameWidth: fw, frameHeight: fh });
      }
      this.load.image(ch.portrait, `assets/characters/${ch.portrait}.png`);
    }

    // --- World tiles ---
    this.load.image('grass_forest', 'assets/tiles/grass_forest.png');
    this.load.image('path',         'assets/tiles/path.png');

    // --- Props / decor ---
    ['tree', 'bush', 'rock', 'fence', 'mushroom', 'crystal',
     'flower_pink', 'flower_blue', 'flower_purple', 'flower_gold',
     'quest_board', 'portal_stone', 'vault']
      .forEach(k => this.load.image(k, `assets/props/${k}.png`));

    // --- FX / UI ---
    this.load.image('glow', 'assets/ui/glow.png');

    // Loading bar wiring (DOM boot overlay).
    const fill = document.getElementById('boot-fill');
    const pct  = document.getElementById('boot-pct');
    this.load.on('progress', (p) => {
      const n = Math.round(p * 100);
      if (fill) fill.style.width = n + '%';
      if (pct) pct.textContent = n + '%';
    });
  }

  create() {
    // --- Register every character's idle / walk / run animations ---
    for (const ch of CHARACTERS) {
      const sheet = CHAR_SHEETS[ch.sheet];
      for (const [state, dims] of Object.entries(sheet)) {
        const count = dims[2];
        const play = ANIM_PLAY[state] || { fps: 10, repeat: -1 };
        const key = animKey(ch, state);
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(texKey(ch, state), { start: 0, end: count - 1 }),
          frameRate: play.fps,
          repeat: play.repeat,
        });
      }
    }

    // Signal the flow controller that assets are ready.
    window.dispatchEvent(new CustomEvent('whitelist-ready'));
  }
}
