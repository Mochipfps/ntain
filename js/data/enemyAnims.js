/* ============================================================
   enemyAnims.js — frame manifests for the 8 imported enemy sheets.
   Each strip is packed uniform-cell (feet-aligned) by the slicer;
   BootScene loads `<id>.png` as a spritesheet with [w,h] and
   registers a looping anim `<id>-move`. One enemy per map (1-8).
   ============================================================ */

export const ENEMY_SHEETS = {
  enemy1: { w: 194, h: 156, count: 6, fps: 8 },
  enemy2: { w: 153, h: 183, count: 4, fps: 9 },
  enemy3: { w: 746, h: 305, count: 2, fps: 3 },
  enemy4: { w: 184, h: 168, count: 9, fps: 10 },
  enemy5: { w: 233, h: 161, count: 6, fps: 8 },
  enemy6: { w: 220, h: 161, count: 8, fps: 10 },
  enemy7: { w: 216, h: 159, count: 4, fps: 8 },
  enemy8: { w: 217, h: 169, count: 5, fps: 7 },
};
