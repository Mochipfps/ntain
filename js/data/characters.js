/* ============================================================
   characters.js — the playable HoodLust roster reused for the
   whitelist. Each entry points at the existing game sprite sheets
   (idle / walk / run) + portrait, plus the frame slicing needed to
   register animations. Adding a character = add an entry here.
   ============================================================ */

// Per-character sheet frame sizes [frameWidth, frameHeight, frameCount].
// Values taken directly from the HoodLust slicer so frames line up exactly.
export const CHAR_SHEETS = {
  // Original HoodLust survivor (unprefixed keys).
  lush:    { idle: [72, 144, 10], walk: [70, 140, 10], run: [76, 133, 10] },
  onyx:    { idle: [46, 82, 9],   walk: [57, 75, 9],   run: [59, 71, 9] },
  scarlet: { idle: [52, 90, 10],  walk: [61, 88, 10],  run: [59, 79, 10] },
  aoi:     { idle: [45, 89, 11],  walk: [59, 86, 11],  run: [60, 88, 11] },
  lily:    { idle: [43, 96, 12],  walk: [53, 92, 12],  run: [61, 89, 12] },
};

// Playback config (fps / loop) shared by all characters.
export const ANIM_PLAY = {
  idle: { fps: 8,  repeat: -1 },
  walk: { fps: 12, repeat: -1 },
  run:  { fps: 15, repeat: -1 },
};

// The selectable roster. `sheet` is the CHAR_SHEETS key; `prefix` is the
// asset/anim key prefix (null → original HoodLust bare keys 'idle'/'walk'…).
export const CHARACTERS = [
  {
    id: 'lush', sheet: 'lush', prefix: null,
    name: 'HoodLust', portrait: 'portrait',
    style: 'Balanced Fighter', weapon: 'Rose Bolts',
    desc: 'The original survivor — balanced and dependable.',
  },
  {
    id: 'onyx', sheet: 'onyx', prefix: 'onyx',
    name: 'Onyx', portrait: 'onyx_portrait',
    style: 'Heavy Melee', weapon: 'Ember Odachi',
    desc: 'Soot-and-steel brawler with a burning blade.',
  },
  {
    id: 'scarlet', sheet: 'scarlet', prefix: 'scarlet',
    name: 'Scarlet', portrait: 'scarlet_portrait',
    style: 'Magic Specialist', weapon: 'Arcane Sword',
    desc: 'An arcane duelist whose blade sings with pink light.',
  },
  {
    id: 'aoi', sheet: 'aoi', prefix: 'aoi',
    name: 'Aoi', portrait: 'aoi_portrait',
    style: 'Fast Assassin', weapon: 'Phantom Katana',
    desc: 'A blue-haired blade dancer — fast, agile and lucky.',
  },
  {
    id: 'lily', sheet: 'lily', prefix: 'lily',
    name: 'Lily', portrait: 'lily_portrait',
    style: 'Hybrid Fighter', weapon: 'Blossom Blade',
    desc: 'A cheerful all-rounder blessed with luck and quick feet.',
  },
];

// Resolve the animation key for a character + state ('<prefix>-<state>' or bare).
export function animKey(char, state) {
  return char.prefix ? `${char.prefix}-${state}` : state;
}
// Resolve the texture/sheet asset key for a character + state.
export function texKey(char, state) {
  return char.prefix ? `${char.prefix}_${state}` : state;
}
