import { Question, Track } from '../types';

// ============================================================
// QUIZ PICKING
// The question bank itself lives in ./bank (Junior + Senior,
// Day 1-5, Morning/Afternoon, syllabus topics only).
// ============================================================

// Topic names are stored directly in `section`; this map only labels
// the old A-F codes that may still exist in historic results.
export const SECTION_NAMES: Record<string, string> = {
  A: 'Mindset & Confidence',
  B: 'Communication & English',
  C: 'Structured Speaking',
  D: 'Thinking, Teamwork & GD',
  E: 'Resume & STAR',
  F: 'Interview & Etiquette',
};

// Fisher–Yates shuffle
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Slot = 'Morning' | 'Afternoon';

/** Questions of one track + day + session (slot null = both sessions of that day). */
export function sessionPool(all: Question[], track: Track, day: number, slot: Slot | null): Question[] {
  return all.filter(q => q.track === track && q.day === day && (!slot || q.slot === slot));
}

// Prefer questions this participant has not seen yet, then top up with seen ones.
function takeFresh(pool: Question[], n: number, avoid: Set<string>): Question[] {
  const fresh = shuffle(pool.filter(q => !avoid.has(q.id)));
  const seen = shuffle(pool.filter(q => avoid.has(q.id)));
  return [...fresh, ...seen].slice(0, Math.min(n, pool.length));
}

function shuffleOptions(q: Question): Question {
  const order = shuffle(q.options.map((_, i) => i));
  return { ...q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
}

/**
 * Pick a shuffled quiz.
 *  - Day quiz: `count` questions from that track/day/session only.
 *  - Full Bootcamp (day 'all'): spread evenly across all 10 sessions of the
 *    track (Day 1-5 × Morning/Afternoon), one per session for a 10-question quiz.
 * Options are shuffled too, keeping the answer key correct.
 */
export function pickQuiz(all: Question[], opts: {
  track: Track; day: number | 'all'; slot?: Slot | null; count: number; avoid?: Set<string>;
}): Question[] {
  const avoid = opts.avoid || new Set<string>();
  let picked: Question[];
  if (opts.day === 'all') {
    const groups: Question[][] = [];
    for (let d = 1; d <= 5; d++) for (const s of ['Morning', 'Afternoon'] as Slot[]) {
      const g = sessionPool(all, opts.track, d, s);
      if (g.length) groups.push(g);
    }
    const per = Math.floor(opts.count / Math.max(1, groups.length));
    const extra = opts.count - per * groups.length;
    const order = shuffle(groups.map((_, i) => i));
    picked = [];
    groups.forEach((g, i) => {
      const n = per + (order.indexOf(i) < extra ? 1 : 0);
      picked.push(...takeFresh(g, n, avoid));
    });
    picked = shuffle(picked);
  } else {
    picked = takeFresh(sessionPool(all, opts.track, opts.day, opts.slot || null), opts.count, avoid);
  }
  return picked.map(shuffleOptions);
}

// ---- remember which questions a participant has already seen ----
const seenKey = (userId: string, activity: string) => `ipec_seen_${userId}_${activity}`;
export function getSeen(userId: string, activity: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(seenKey(userId, activity)) || '[]')); }
  catch { return new Set(); }
}
export function addSeen(userId: string, activity: string, ids: string[]) {
  try {
    const s = getSeen(userId, activity); ids.forEach(i => s.add(i));
    localStorage.setItem(seenKey(userId, activity), JSON.stringify(Array.from(s).slice(-200)));
  } catch { /* storage unavailable — shuffling still works */ }
}
