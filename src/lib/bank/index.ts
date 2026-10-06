// ============================================================
// SYLLABUS BANK — single entry point
// Junior Champions + Senior Champions, Day 1-5, Morning/Afternoon.
// Quizzes, Drills and the Full Bootcamp all draw ONLY from here
// (plus trainer-uploaded questions that carry a track/day/session).
// ============================================================
import { Question } from '../../types';
import { BankDay, Slot, Track } from './types';
import { JUNIOR_DAY1 } from './junior/day1';
import { JUNIOR_DAY2 } from './junior/day2';
import { JUNIOR_DAY3 } from './junior/day3';
import { JUNIOR_DAY4 } from './junior/day4';
import { JUNIOR_DAY5 } from './junior/day5';
import { SENIOR_DAY1 } from './senior/day1';
import { SENIOR_DAY2 } from './senior/day2';
import { SENIOR_DAY3 } from './senior/day3';
import { SENIOR_DAY4 } from './senior/day4';
import { SENIOR_DAY5 } from './senior/day5';

export type { Track, Slot } from './types';

export const SLOTS: Slot[] = ['Morning', 'Afternoon'];
export const DAYS_1_5 = [1, 2, 3, 4, 5] as const;

export const BANK: Record<Track, BankDay[]> = {
  junior: [JUNIOR_DAY1, JUNIOR_DAY2, JUNIOR_DAY3, JUNIOR_DAY4, JUNIOR_DAY5],
  senior: [SENIOR_DAY1, SENIOR_DAY2, SENIOR_DAY3, SENIOR_DAY4, SENIOR_DAY5],
};

export const TRACK_LABEL: Record<Track, string> = {
  junior: 'Junior Champions',
  senior: 'Senior Champions',
};

export function bankDay(track: Track, day: number): BankDay | undefined {
  return BANK[track].find(d => d.day === day);
}

/** Distinct syllabus topics of a session, in first-seen order (for headings). */
export function sessionTopics(track: Track, day: number, slot: Slot): string[] {
  const d = bankDay(track, day);
  if (!d) return [];
  return Array.from(new Set(d.sessions[slot].quiz.map(q => q.topic)));
}

/** Clean day title, e.g. 'KNOW YOUR PLAYER: Self-Discovery…' (quotes stripped). */
export function dayTitle(track: Track, day: number): string {
  return (bankDay(track, day)?.title || `Day ${day}`).replace(/"/g, '');
}

// ---- Quiz questions in the app's Question shape (stable ids) ----
const BUILT_IN: Question[] = [];
(Object.keys(BANK) as Track[]).forEach(track => {
  BANK[track].forEach(d => {
    SLOTS.forEach(slot => {
      d.sessions[slot].quiz.forEach((q, i) => {
        BUILT_IN.push({
          id: `${track === 'junior' ? 'j' : 's'}${d.day}${slot[0]}-${String(i + 1).padStart(2, '0')}`,
          section: q.topic, topic: q.topic, track, day: d.day, slot,
          level: q.level, text: q.text, options: [...q.options], answer: q.answer,
        });
      });
    });
  });
});
export const BUILT_IN_QUESTIONS: Question[] = BUILT_IN;

// ---- Drills in the arena's shape (day + session attached) ----
export interface ArenaDrill {
  id: string;
  track: Track;
  day: number;
  session: Slot;
  title: string;
  desc: string;
  badgeTitle: string;
  badgeTier: 'Gold' | 'Platinum';
  passScore: number;
  xp: number;
  questions: { text: string; options: string[]; answer: number; insight: string }[];
}

const DRILLS_BY_TRACK: Record<Track, ArenaDrill[]> = { junior: [], senior: [] };
(Object.keys(BANK) as Track[]).forEach(track => {
  BANK[track].forEach(d => {
    SLOTS.forEach(slot => {
      const dr = d.sessions[slot].drill;
      DRILLS_BY_TRACK[track].push({
        ...dr, track, day: d.day, session: slot,
        questions: dr.questions.map(q => ({ ...q, options: [...q.options] })),
      });
    });
  });
});

export function drillsFor(track: Track): ArenaDrill[] {
  return DRILLS_BY_TRACK[track];
}

export const ALL_DRILLS: ArenaDrill[] = [...DRILLS_BY_TRACK.junior, ...DRILLS_BY_TRACK.senior];
