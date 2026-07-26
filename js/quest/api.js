/* ============================================================
   api.js — whitelist submission layer.
   Sends the completed entry to the Google Apps Script Web App
   defined in config.js. The script's doPost expects exactly three
   form fields: username, comment, wallet.

   Cross-origin note: Apps Script Web Apps don't return CORS
   headers, so we POST with mode:'no-cors' (opaque response). A
   resolved fetch = delivered; a thrown/timed-out fetch = failed,
   which the quest surfaces as a "Submission Failed" popup + retry.
   ============================================================ */

import { CONFIG } from './config.js';

const TIMEOUT_MS = 12000;

/**
 * Submit the finished whitelist entry to the Apps Script.
 * @param {{username:string, comment:string, wallet:string}} entry
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function submitWhitelist(entry) {
  const url = CONFIG.googleScriptUrl;
  if (!url) return { ok: false, error: 'No submission endpoint configured.' };

  // Exactly the three fields the Apps Script reads — never renamed.
  const body = new URLSearchParams();
  body.set('username', entry.username || '');
  body.set('comment', entry.comment || '');
  body.set('wallet', entry.wallet || '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      // Simple content-type keeps it a non-preflighted request.
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    // Opaque response — reaching here means the request was delivered.
    return { ok: true };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e && e.name === 'AbortError' ? 'Request timed out.' : 'Network error.' };
  }
}
