/* ============================================================
   storage.js — persistent whitelist progress (localStorage).
   Tracks which tasks are done, the collected submissions, and the
   permanent "completed" lock so the experience can never be
   replayed. Swappable: Step 3 can mirror this to a backend without
   touching the quest logic.
   ============================================================ */

const KEY = 'hoodlust_whitelist_v1';

const DEFAULT = {
  step: 0,             // number of quest tasks completed (0..N)
  completed: false,    // permanently finished — no replay
  character: null,     // chosen character id (context only)
  submissions: {       // collected public inputs
    xUsername: null,
    commentLink: null,
    wallet: null,
  },
  updatedAt: null,
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, submissions: { ...DEFAULT.submissions } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...parsed,
      submissions: { ...DEFAULT.submissions, ...(parsed.submissions || {}) },
    };
  } catch (e) {
    return { ...DEFAULT, submissions: { ...DEFAULT.submissions } };
  }
}

function write(state) {
  try {
    state.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) { /* storage unavailable — run in-memory */ }
  return state;
}

export const Storage = {
  get() { return read(); },

  isCompleted() { return read().completed === true; },

  getStep() { return read().step || 0; },

  setCharacter(id) { const s = read(); s.character = id; return write(s); },

  // Persist a single submission value (e.g. 'xUsername').
  saveSubmission(field, value) {
    const s = read();
    s.submissions[field] = value;
    return write(s);
  },

  // Advance to a completed-task count.
  setStep(step) { const s = read(); s.step = step; return write(s); },

  // Mark the whole whitelist permanently completed.
  markCompleted() { const s = read(); s.completed = true; return write(s); },

  // Full record for Step-3 submission / debugging (public data only).
  snapshot() { return read(); },

  // Dev-only reset (NOT exposed in the UI — no admin surface).
  _reset() { try { localStorage.removeItem(KEY); } catch (e) {} },
};
