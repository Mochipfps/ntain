/* ============================================================
   CharacterSelectScene.js — pick a playable HoodLust character
   before entering the whitelist world. Shows a live preview
   animation, portrait strip, name / class, a selection highlight,
   and continues on ENTER (or the on-screen Continue button).
   Reuses the real game characters & animations only.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';
import { CHARACTERS, animKey } from '../data/characters.js';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super('CharacterSelectScene'); }

  init(data) {
    this.joystick = data && data.joystick ? data.joystick : null;
    this.index = 0;
  }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#141a24');
    cam.fadeIn(360, 8, 10, 16);

    // Atmospheric tiled grass base, darkened, with a soft light wash.
    this.bg = this.add.tileSprite(0, 0, 10, 10, 'grass_forest').setOrigin(0, 0).setDepth(0).setAlpha(0.5);
    this.dark = this.add.rectangle(0, 0, 10, 10, 0x0a0e14, 0.55).setOrigin(0, 0).setDepth(1);
    this.glow = this.add.image(0, 0, 'glow').setBlendMode('ADD').setTint(0xffd88a).setAlpha(0.5).setDepth(2);

    // Title.
    this.title = this.add.text(0, 0, 'CHOOSE YOUR CHARACTER', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '20px', color: '#f2d16b',
      stroke: '#2a1500', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.HUD);
    this.subtitle = this.add.text(0, 0, 'HOODLUST ACCESS PASS', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#ff8ab0',
      stroke: '#2a0010', strokeThickness: 4, align: 'center', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.HUD);

    // Hero preview platform + shadow + animated sprite.
    this.platform = this.add.ellipse(0, 0, 240, 60, 0x000000, 0.35).setDepth(3);
    this.heroGlow = this.add.image(0, 0, 'glow').setBlendMode('ADD').setTint(0xffe6a0).setAlpha(0.6).setDepth(3);
    this.hero = this.add.sprite(0, 0, this._tex(CHARACTERS[0], 'idle')).setOrigin(0.5, 1).setDepth(4);

    // Info block (name / class / weapon / desc).
    this.nameText = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '24px', color: '#ffffff',
      stroke: '#000', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.HUD);
    this.classText = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#9fe8c0',
      stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.HUD);
    this.descText = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#dfe6ee', align: 'center',
      wordWrap: { width: 520 }, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH.HUD);

    // Portrait strip (one card per character).
    this.cards = CHARACTERS.map((ch, i) => this._makeCard(ch, i));

    // Nav arrows (clickable) + continue hint.
    this.leftArrow = this.add.text(0, 0, '\u25C0', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '22px', color: '#f2d16b', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTH.HUD).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._move(-1));
    this.rightArrow = this.add.text(0, 0, '\u25B6', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '22px', color: '#f2d16b', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTH.HUD).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._move(1));

    this.continueBtn = this.add.text(0, 0, 'PRESS ENTER TO CONTINUE', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '12px', color: '#141014',
      backgroundColor: '#9fe8c0', padding: { x: 18, y: 12 }, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.HUD).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._confirm());
    this.hint = this.add.text(0, 0, '\u25C0 \u25B6  or  A / D  to browse', {
      fontFamily: 'monospace', fontSize: '13px', color: '#9aa7b4', align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.HUD);

    // Input.
    this.input.keyboard.on('keydown-LEFT', () => this._move(-1));
    this.input.keyboard.on('keydown-A', () => this._move(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this._move(1));
    this.input.keyboard.on('keydown-D', () => this._move(1));
    this.input.keyboard.on('keydown-ENTER', () => this._confirm());
    this.input.keyboard.on('keydown-SPACE', () => this._confirm());

    this.scale.on('resize', this._layout, this);
    this._select(0, true);
    this._layout();

    this.events.once('shutdown', () => this.scale.off('resize', this._layout, this));
  }

  _tex(ch, state) { return ch.prefix ? `${ch.prefix}_${state}` : state; }

  _makeCard(ch, i) {
    const cont = this.add.container(0, 0).setDepth(DEPTH.HUD - 2);
    const frame = this.add.rectangle(0, 0, 108, 128, 0x1c2634, 0.92)
      .setStrokeStyle(3, 0x3a4a5e).setOrigin(0.5);
    const port = this.add.image(0, -14, ch.portrait).setOrigin(0.5);
    // Fit portrait inside the card.
    const pt = this.textures.get(ch.portrait).getSourceImage();
    const s = Math.min(84 / pt.width, 84 / pt.height);
    port.setScale(s);
    const nm = this.add.text(0, 46, ch.name, {
      fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#e8eef4', align: 'center',
    }).setOrigin(0.5);
    cont.add([frame, port, nm]);
    cont.setSize(108, 128);
    cont.setInteractive(new Phaser.Geom.Rectangle(-54, -64, 108, 128), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => this._select(i));
    cont.frameRect = frame;
    return cont;
  }

  _move(dir) {
    const n = CHARACTERS.length;
    this._select((this.index + dir + n) % n);
  }

  _select(i, silent) {
    this.index = i;
    const ch = CHARACTERS[i];

    // Hero swap → live idle animation.
    this.hero.setTexture(this._tex(ch, 'idle'));
    const key = animKey(ch, 'idle');
    if (this.anims.exists(key)) this.hero.play(key, true);
    this._sizeHero();

    this.nameText.setText(ch.name.toUpperCase());
    this.classText.setText(`${ch.style}  \u2022  ${ch.weapon}`);
    this.descText.setText(ch.desc);

    // Highlight the selected card.
    this.cards.forEach((c, idx) => {
      const on = idx === i;
      c.frameRect.setStrokeStyle(on ? 4 : 3, on ? 0xffd24f : 0x3a4a5e);
      c.frameRect.setFillStyle(on ? 0x2a3a24 : 0x1c2634, on ? 0.96 : 0.9);
      this.tweens.add({ targets: c, scale: on ? 1.12 : 1.0, duration: 160, ease: 'Quad.easeOut' });
    });

    if (!silent) {
      // little pop on the hero
      this.tweens.add({ targets: this.hero, scaleX: this._heroScale * 1.05, duration: 120, yoyo: true });
    }
  }

  _sizeHero() {
    const H = this.scale.height;
    const img = this.hero.texture.getSourceImage();
    const targetH = Phaser.Math.Clamp(H * 0.34, 150, 340);
    this._heroScale = targetH / img.height;
    this.hero.setScale(this._heroScale);
  }

  _confirm() {
    if (this._confirming) return;
    this._confirming = true;
    const ch = CHARACTERS[this.index];
    this.cameras.main.fadeOut(420, 8, 10, 16);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('WorldScene', { joystick: this.joystick, character: ch.id });
    });
  }

  _layout() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;
    const portrait = H > W; // portrait orientation

    // Backgrounds fill the viewport.
    this.bg.setSize(W, H);
    this.dark.setSize(W, H);
    this.glow.setPosition(cx, H * 0.42).setScale(Math.max(W, H) / 100);

    // Title.
    this.title.setPosition(cx, H * 0.08).setFontSize(Phaser.Math.Clamp(W * 0.028, 13, 22));
    this.subtitle.setPosition(cx, H * 0.08 + Phaser.Math.Clamp(W * 0.028, 13, 22) + 14);

    // Portrait strip lives at the very bottom; everything else fits above it.
    const n = this.cards.length;
    const gap = Math.min(124, (W - 40) / n);
    const cardH = 128;
    const stripY = H - cardH * 0.5 - 30;      // card centre
    const stripTop = stripY - cardH * 0.5;    // card top edge
    const startX = cx - ((n - 1) * gap) / 2;
    this.cards.forEach((c, idx) => c.setPosition(startX + idx * gap, stripY));

    // Hero preview centred in the space above the strip.
    const heroBaseY = Math.min(portrait ? H * 0.46 : H * 0.5, stripTop - 150);
    this._sizeHero();
    this.hero.setPosition(cx, heroBaseY);
    this.platform.setPosition(cx, heroBaseY).setScale(Phaser.Math.Clamp(W / 900, 0.7, 1.4));
    this.heroGlow.setPosition(cx, heroBaseY - this.hero.displayHeight * 0.45)
      .setScale(this.hero.displayHeight / 90);

    // Info block below hero, above the strip.
    const infoY = heroBaseY + 18;
    this.nameText.setPosition(cx, infoY).setFontSize(Phaser.Math.Clamp(W * 0.03, 16, 26));
    this.classText.setPosition(cx, infoY + 30);
    // Description only when there's vertical room (hidden on short landscape).
    const roomForDesc = (stripTop - (infoY + 44)) > 40;
    this.descText.setPosition(cx, infoY + 56).setWordWrapWidth(Math.min(560, W * 0.86)).setVisible(roomForDesc);

    // Nav arrows flank the hero.
    this.leftArrow.setPosition(Math.max(30, cx - (portrait ? W * 0.42 : 330)), heroBaseY - this.hero.displayHeight * 0.5);
    this.rightArrow.setPosition(Math.min(W - 30, cx + (portrait ? W * 0.42 : 330)), heroBaseY - this.hero.displayHeight * 0.5);

    // Footer hint + continue button.
    this.continueBtn.setPosition(cx, H - 22).setFontSize(Phaser.Math.Clamp(W * 0.016, 9, 12));
    // Show the browse hint only on non-touch and only when the description
    // isn't already occupying that space.
    this.hint.setPosition(cx, stripTop - 14).setVisible(!this.sys.game.device.input.touch && !roomForDesc);
  }
}
