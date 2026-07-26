/* ============================================================
   config.js — THE single source of truth for every editable link
   and endpoint in the HoodLust Access Pass whitelist.

   ⚠ Never hardcode a URL anywhere else in the project — always
   import it from here. Change a value in this file and it updates
   everywhere.
   ============================================================ */

export const CONFIG = {
  // --- Intro video (1024×1024, shown fully, never cropped/zoomed) ---
  introVideo: 'assets/video/intro.mp4',

  // --- X (Twitter) quest links ---
  xProfile:     'https://x.com/KHFRHN',                                     // Task 1 — Follow
  xLikeLink:    'https://x.com/KHFRHN/status/2081451476833235356',          // Task 2 — Like
  xRepostLink:  'https://x.com/KHFRHN/status/2081451476833235356',          // Task 3 — Repost
  xCommentLink: 'https://x.com/KHFRHN/status/2081451476833235356',          // Task 4 — Comment

  // --- Google Apps Script Web App (whitelist submission endpoint) ---
  // doPost expects form fields: username, comment, wallet.
  googleScriptUrl: 'https://script.google.com/macros/s/AKfycbwFJXBFsrUCV50VLUBVxmuYEFh6YdzsKyHif-kYrgWJZYPa49E4PSiVsH4XbOD6kOpo/exec',

  // --- Future (used in later phases; editable here now) ---
  futureWebsiteUrl:     'https://hoodlust.xyz',
  futureContractAddress: '0x0000000000000000000000000000000000000000',
};
