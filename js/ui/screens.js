/* ============================================================
   screens.js — DOM screen-flow controller.
   Sequence:  Boot (loading) → Intro video → Join → (Phaser) Select.
   The intro itself lives in the modular video.js controller; this
   file only orchestrates the transitions between screens.
   ============================================================ */

import { playIntro } from '../quest/video.js';

export function initFlow(app) {
  const boot   = document.getElementById('boot-overlay');
  const intro  = document.getElementById('intro-screen');
  const join   = document.getElementById('join-screen');
  const video  = document.getElementById('intro-video');
  const bgVideo = document.getElementById('intro-bg');
  const placeholder = document.getElementById('intro-placeholder');
  const joinBtn = document.getElementById('join-btn');

  let assetsReady = false;
  let introStarted = false;

  // --- Boot: wait for Phaser assets, then start the intro. ---
  window.addEventListener('whitelist-ready', () => {
    assetsReady = true;
    if (boot) { boot.classList.add('hide'); setTimeout(() => boot.remove(), 600); }
    startIntro();
  }, { once: true });

  // Safety net: if the ready event never fires, start anyway.
  setTimeout(() => { if (!assetsReady) startIntro(); }, 8000);

  /* ---------------- INTRO ---------------- */
  function startIntro() {
    if (introStarted) return;
    introStarted = true;
    intro.classList.add('shown');
    playIntro({ intro, video, bgVideo, placeholder }, finishIntro);
  }

  function finishIntro() {
    // Fade the intro out, then fade in the Join screen + button.
    intro.classList.add('fade');
    setTimeout(() => { intro.style.display = 'none'; showJoin(); }, 800);
  }

  /* ---------------- JOIN ---------------- */
  function showJoin() {
    join.style.display = 'flex';
    requestAnimationFrame(() => join.classList.add('shown'));
    let entered = false;
    const enter = () => {
      if (entered) return; entered = true;
      join.classList.add('fade');
      setTimeout(() => {
        join.style.display = 'none';
        app.begin();          // → Phaser CharacterSelectScene
      }, 620);
    };
    joinBtn.addEventListener('click', enter);
    joinBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') enter(); });
  }
}
