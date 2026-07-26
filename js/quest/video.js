/* ============================================================
   video.js — modular intro-video controller.
   Plays the 1024×1024 intro fully (never cropped/zoomed/stretched):
   the crisp square video is scaled proportionally to fit, and the
   leftover screen area is filled with a soft blurred extension of
   the video plus its live edge colour — no black bars. Plays once,
   cannot be skipped, and calls onEnded when finished. If the video
   can't load, an animated title placeholder runs the same flow.

   The video URL comes from config.js (never hardcoded here).
   ============================================================ */

import { CONFIG } from './config.js';

/**
 * @param {Object} els   { intro, video, bgVideo, placeholder }
 * @param {Function} onEnded  called once when the intro completes
 */
export function playIntro(els, onEnded) {
  const { intro, video, bgVideo, placeholder } = els;
  let decided = false;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    try { video.pause(); bgVideo.pause(); } catch (e) {}
    onEnded();
  };

  const useVideo = () => {
    if (decided) return; decided = true;
    placeholder.style.display = 'none';
    video.style.display = 'block';
    bgVideo.style.display = 'block';
    const p1 = video.play(); const p2 = bgVideo.play();
    if (p1 && p1.catch) p1.catch(() => {});
    if (p2 && p2.catch) p2.catch(() => {});
    startColorSampler();
  };

  const usePlaceholder = () => {
    if (decided) return; decided = true;
    video.style.display = 'none';
    bgVideo.style.display = 'none';
    placeholder.style.display = 'flex';
    placeholder.classList.add('play');
    setTimeout(finish, 5200);   // cinematic beat, then continue
  };

  // Live edge-colour fill so the area around the square video looks natural.
  function startColorSampler() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      if (finished) return;
      try {
        ctx.drawImage(video, 0, 0, 32, 32);
        const d = ctx.getImageData(0, 0, 32, 32).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < 32; i++) {
          for (const [x, y] of [[i, 0], [i, 31], [0, i], [31, i]]) {
            const o = (y * 32 + x) * 4;
            r += d[o]; g += d[o + 1]; b += d[o + 2]; n++;
          }
        }
        intro.style.background = `rgb(${(r / n) | 0},${(g / n) | 0},${(b / n) | 0})`;
      } catch (e) { /* frame not ready yet */ }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Lazy, gentle loading — decode only what's needed to start playback.
  try {
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', '');
    video.preload = 'auto';
    bgVideo.muted = true; bgVideo.playsInline = true; bgVideo.setAttribute('playsinline', '');
    bgVideo.preload = 'auto';
    video.src = CONFIG.introVideo; bgVideo.src = CONFIG.introVideo;
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
