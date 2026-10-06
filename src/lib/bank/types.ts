// ============================================================
// SYLLABUS QUESTION BANK — shared shapes
// Every quiz question and drill question belongs to exactly one
// track (junior | senior), one day (1..5) and one session
// (Morning | Afternoon), and is written ONLY from that session's
// syllabus topics.
// ============================================================

export type Track = 'junior' | 'senior';
export type Slot = 'Morning' | 'Afternoon';

export interface BankQuizQuestion {
  topic: string;               // syllabus module/topic, shown as a focus area when missed
  level: 'B' | 'I' | 'A';      // Basic / Intermediate / Advanced
  text: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;       // index of the correct option
}

export interface BankDrillQuestion {
  text: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  insight: string;             // "Master Trainer Insight" shown after answering
}

export interface BankDrill {
  id: string;                  // stable id (stored in drill_results.drill_id)
  title: string;
  desc: string;
  badgeTitle: string;
  badgeTier: 'Gold' | 'Platinum';
  passScore: number;
  xp: number;
  questions: BankDrillQuestion[];
}

export interface BankSession {
  quiz: BankQuizQuestion[];    // pool; each attempt draws 10 shuffled
  drill: BankDrill;
}

export interface BankDay {
  track: Track;
  day: 1 | 2 | 3 | 4 | 5;
  title: string;               // day title from the syllabus
  sessions: Record<Slot, BankSession>;
}
