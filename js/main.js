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

  pixelArt: true,
  antialias: false,
  roundPixels: true,

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

  scene: [BootScene, CharacterSelectScene, WorldScene],
};

const game = new Phaser.Game(config);

window.WHITELIST = {
  game,
  joystick,
  begin() {
    joystick.hide();
    game.scene.stop('BootScene');
    game.scene.start('CharacterSelectScene', { joystick });
  },
  CONFIG,
};

initFlow(window.WHITELIST);
