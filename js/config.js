/* ============================================================
   config.js — Central tunable constants for the HoodLust Access
   Pass whitelist experience. Movement, camera and world values
   are lifted verbatim from the HoodLust game so the whitelist
   feels identical to the real thing. Everything is modular so
   Step 2 (tasks, wallet, submission) can plug in later.
   ============================================================ */

export const CONFIG = {
  // --- Player movement (px/sec) — identical to HoodLust ---
  player: {
    walkSpeed: 130,
    runSpeed:  230,
    accel:     14,
    decel:     16,
    displaySize: 76,
    bodyScaleX: 0.42,
    bodyScaleY: 0.32,
    bodyOffsetY: 0.30,
  },

  // --- Whitelist corridor world (one straight forward path) ---
  world: {
    width:  4600,     // long horizontal corridor
    height: 1100,
    floorColor: '#2e6b34',   // magic-forest grass base
    grass: 'grass_forest',
    lightTint: 0xfff2c8,
    lightIntensity: 0.16,
  },

  // --- Camera — identical to HoodLust ---
  camera: {
    lerp: 0.10,
    deadzoneW: 120,
    deadzoneH: 90,
  },

  // --- The whitelist path: start point + task placeholders ---
  path: {
    startX: 360,
    laneY: 550,          // centre of the walkable lane
    laneHalfHeight: 210, // how far up/down the player may roam
    // Task placeholder gates along the forward path. Locked, no logic.
    stations: [
      { id: 'task1', x: 1000, label: 'Task Area 1' },
      { id: 'task2', x: 1720, label: 'Task Area 2' },
      { id: 'task3', x: 2440, label: 'Task Area 3' },
      { id: 'task4', x: 3160, label: 'Task Area 4' },
      { id: 'final', x: 4080, label: 'Final Area', final: true },
    ],
  },

  debug: false,
};

// Depth layers — keep sorting predictable (mirrors HoodLust).
export const DEPTH = {
  FLOOR: 0,
  PATH: 2,
  PROP:  10,
  PLAYER: 10,
  FX:    100000,
  HUD:   200000,
};
