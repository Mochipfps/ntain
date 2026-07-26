/* ============================================================
   main.js — entry point. Boots the Phaser game (pixel-perfect,
   responsive, gamepad-ready) and wires it to the screen-flow
   controller (intro video → join → character select → world).
   Modular: Step 2 systems (tasks, wallet, submission) plug in
   without touching this bootstrap.
   ============================================================ */

import { CONFIG } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { CharacterSelectScene } from './scenes/CharacterSelectScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { Joystick } from './input/Joystick.js';
import { initFlow } from './ui/screens.js';

const joystick = new Joystick();

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: CONFIG.world.floorColor,

  // Pixel-perfect rendering.
  pixelArt: true,
  antialias: false,
  roundPixels: true,

  // Responsive: canvas fills the window; cameras handle the world view.
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },

  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: CONFIG.debug },
  },

  input: { gamepad: true },
  fps: { target: 60, min: 30 },

  // BootScene preloads then idles; the flow controller starts the rest.
  scene: [BootScene, CharacterSelectScene, WorldScene],
};

const game = new Phaser.Game(config);

// Global handle — future phases attach here.
window.WHITELIST = {
  game,
  joystick,
  // Called by the Join screen: leave boot idle, enter character select.
  begin() {
    joystick.hide();
    game.scene.stop('BootScene');
    game.scene.start('CharacterSelectScene', { joystick });
  },
  CONFIG,
};

// Kick off the DOM screen flow (intro video + join screen).
initFlow(window.WHITELIST);
