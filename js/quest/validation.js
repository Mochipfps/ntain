/* ============================================================
   validation.js — friendly input validators for the whitelist
   quest. Each validator returns { ok, error } so the popup can
   show a clear, human message. Pure functions, no side effects.
   ============================================================ */

// Trim + non-empty (e.g. X username).
export function validateUsername(raw) {
  const v = (raw || '').trim();
  if (!v) return { ok: false, error: 'Please enter your X username.' };
  // Accept with or without a leading @; letters, numbers, underscore.
  const handle = v.replace(/^@+/, '');
  if (handle.length < 1) return { ok: false, error: 'Username cannot be empty.' };
  if (handle.length > 15) return { ok: false, error: 'X usernames are at most 15 characters.' };
  if (!/^[A-Za-z0-9_]+$/.test(handle)) return { ok: false, error: 'Only letters, numbers and underscores are allowed.' };
  return { ok: true, value: '@' + handle };
}

// Valid http(s) URL (e.g. the comment link).
export function validateUrl(raw) {
  const v = (raw || '').trim();
  if (!v) return { ok: false, error: 'Please paste a link.' };
  let url;
  try { url = new URL(v); } catch (e) { return { ok: false, error: 'That doesn\u2019t look like a valid URL.' }; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'Link must start with http:// or https://' };
  }
  return { ok: true, value: url.href };
}

// ERC-20 / EVM address: 0x + 40 hex characters.
export function validateErc20(raw) {
  const v = (raw || '').trim();
  if (!v) return { ok: false, error: 'Please enter your wallet address.' };
  if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
    return { ok: false, error: 'Enter a valid ERC-20 address (0x followed by 40 hex characters).' };
  }
  return { ok: true, value: v };
}
