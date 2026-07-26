/* ============================================================
   validation.js — friendly input validators for the whitelist
   quest. Each validator trims input and returns { ok, error }
   (or { ok, value }) so the popup can show a clear, human message.
   Pure functions, no side effects.
   ============================================================ */

// X username: required, trimmed, 2–50 characters, no empty / spaces-only.
export function validateUsername(raw) {
  const v = (raw || '').trim();               // remove leading/trailing spaces
  if (!v) return { ok: false, error: 'Please enter your X username.' };
  // Accept an optional leading @; measure the handle itself.
  const handle = v.replace(/^@+/, '').trim();
  if (!handle) return { ok: false, error: 'Username cannot be empty.' };
  if (handle.length < 2) return { ok: false, error: 'Username must be at least 2 characters.' };
  if (handle.length > 50) return { ok: false, error: 'Username must be 50 characters or fewer.' };
  return { ok: true, value: '@' + handle };
}

// Comment link: required, trimmed, must be an X / Twitter post URL.
export function validateCommentLink(raw) {
  const v = (raw || '').trim();
  if (!v) return { ok: false, error: 'Please paste a link.' };
  if (!/^https:\/\/(x\.com|twitter\.com)\//i.test(v)) {
    return { ok: false, error: 'Link must start with https://x.com/ or https://twitter.com/' };
  }
  return { ok: true, value: v };
}

// ERC-20 / Ethereum address: required, trimmed, 0x + 40 hex = exactly 42 chars.
export function validateErc20(raw) {
  const v = (raw || '').trim();
  if (!v) return { ok: false, error: 'Please enter your wallet address.' };
  if (!v.startsWith('0x')) return { ok: false, error: 'Wallet address must start with 0x.' };
  if (v.length !== 42) return { ok: false, error: 'Wallet address must be exactly 42 characters.' };
  if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
    return { ok: false, error: 'Enter a valid ERC-20 address (0x followed by 40 hex characters).' };
  }
  return { ok: true, value: v };
}
