/* ============================================================
   video.js — modular intro-video controller.
   Plays the 1024×1024 intro fully (never cropped/zoomed/stretched):
   the crisp square video is scaled proportionally to fit and stays
   centered on a pure-black fullscreen stage, so its own black
   background blends invisibly into the surrounding screen. Plays
   once, cannot be skipped, and calls onEnded when finished. If the
   video can't load, an animated title placeholder runs the same flow.

   The video URL comes from config.js (never hardcoded here).
   ============================================================ */

import { CONFIG } from './config.js';

/**
 * @param {Object} els   { intro, video, placeholder }
 * @param {Function} onEnded  called once when the intro completes
 */
export function playIntro(els, onEnded) {
  const { video, placeholder } = els;
  let decided = false;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    try { video.pause(); } catch (e) {}
    onEnded();
  };

  const useVideo = () => {
    if (decided) return; decided = true;
    placeholder.style.display = 'none';
    video.style.display = 'block';
    // The surround is pure black (the video's own background extended), so the
    // blurred cover copy is intentionally not shown.
    const p1 = video.play();
    if (p1 && p1.catch) p1.catch(() => {});
  };

  const usePlaceholder = () => {
    if (decided) return; decided = true;
    video.style.display = 'none';
    placeholder.style.display = 'flex';
    placeholder.classList.add('play');
    setTimeout(finish, 5200);   // cinematic beat, then continue
  };

  // Lazy, gentle loading — decode only what's needed to start playback.
  try {
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', '');
    video.preload = 'auto';
    video.src = CONFIG.introVideo;
    video.addEventListener('canplay', useVideo, { once: true });
    video.addEventListener('error', usePlaceholder, { once: true });
    video.addEventListener('ended', finish);
    video.load();
    // Fall back to the animated placeholder if nothing is ready shortly.
    setTimeout(() => { if (!decided && video.readyState < 2) usePlaceholder(); }, 2200);
  } catch (e) {
    usePlaceholder();
  }
}
