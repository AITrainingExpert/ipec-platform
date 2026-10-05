import { Question } from '../types';

// STARTER QUESTION BANK.
// This ships with a working set across all 5 days / Sections A–F.
// To load the full 500: paste them into Supabase (see supabase-schema.sql seed section)
// OR extend this array. The app reads whatever is here (demo mode) or from the DB (production).
export const SEED_QUESTIONS: Question[] = [
  // ---- Day 1 / Section A ----
  { id: 'a1', section: 'A', day: 1, level: 'B', text: "What is a 'growth mindset'?", options: ['Abilities are fixed at birth', 'Abilities can be developed through effort and practice', 'Always thinking positively regardless of facts', 'A memorization technique'], answer: 1 },
  { id: 'a2', section: 'A', day: 1, level: 'B', text: 'In box breathing, the standard pattern is:', options: ['Inhale 4s – Hold 4s – Exhale 4s – Hold 4s', 'Inhale 2s – Exhale 8s', 'One deep hold', 'Rapid breaths then pause'], answer: 0 },
  { id: 'a3', section: 'A', day: 1, level: 'I', text: 'Your mind goes blank in a mock interview. The correct sequence is:', options: ['Apologize and leave', 'Breathe → buy-time phrase → anchor to a structure → answer one layer', 'Change the topic', 'Wait silently'], answer: 1 },
  { id: 'a4', section: 'A', day: 1, level: 'A', text: 'Mid-answer you realize a stated fact is wrong. Best recovery:', options: ['Continue; they may not notice', "Briefly correct yourself and proceed — it signals integrity", 'Stop and apologize repeatedly', 'Change topic'], answer: 1 },
  { id: 'a5', section: 'A', day: 1, level: 'B', text: "The 'spotlight effect' is the tendency to:", options: ['Believe others notice/judge us more than they do', 'Fear stage lights', 'Focus on the best performer', 'Highlight text to remember'], answer: 0 },
  // ---- Day 2 / Section B ----
  { id: 'b1', section: 'B', day: 2, level: 'B', text: 'Which sentence is correct?', options: ['She have completed it', 'She completed it yesterday', 'She is completed it', 'She completing it'], answer: 1 },
  { id: 'b2', section: 'B', day: 2, level: 'B', text: 'Active listening means:', options: ['Planning your reply while they talk', 'Fully attending, confirming understanding, noting key points', 'Nodding continuously', 'Recording the talk'], answer: 1 },
  { id: 'b3', section: 'B', day: 2, level: 'I', text: "'Please revert back to me' contains:", options: ['No issue', "Redundancy ('revert back') and Indianism", 'A spelling error', 'A tense error'], answer: 1 },
  { id: 'b4', section: 'B', day: 2, level: 'A', text: "Best professional rewrite of 'we messed up the build, fixing it rn':", options: ['Build gone. Fixing.', 'We identified an issue in the build and are resolving it; update by 5 PM.', 'Someone broke the build again', 'The build was messed up by us'], answer: 1 },
  { id: 'b5', section: 'B', day: 2, level: 'B', text: 'Correct preposition: The meeting is ___ Monday ___ 10 AM.', options: ['in / on', 'on / at', 'at / in', 'on / on'], answer: 1 },
  // ---- Day 3 / Section C + E ----
  { id: 'c1', section: 'C', day: 3, level: 'B', text: 'In PREP, the letters stand for:', options: ['Plan, Read, Execute, Present', 'Point, Reason, Example, Point', 'Prepare, Rehearse, Explain, Perform', 'Point, Review, Evidence, Pause'], answer: 1 },
  { id: 'c2', section: 'C', day: 3, level: 'I', text: 'A good interview PREP answer typically lasts:', options: ['10–15 seconds', '45–60 seconds', '3–4 minutes', 'As long as possible'], answer: 1 },
  { id: 'e1', section: 'E', day: 3, level: 'B', text: 'In STAR, the letters stand for:', options: ['Skill, Task, Ability, Result', 'Situation, Task, Action, Result', 'Story, Team, Action, Review', 'Situation, Timing, Answer, Recap'], answer: 1 },
  { id: 'e2', section: 'E', day: 3, level: 'I', text: 'Which resume bullet is strongest?', options: ['Worked on an ML project', 'Built a crop-disease classifier (CNN, 92% accuracy) used by 40+ farmers', 'Was part of ML team', 'ML project done in final year'], answer: 1 },
  { id: 'e3', section: 'E', day: 3, level: 'A', text: 'Interviewer: team of 4 — what was YOUR contribution? Weak answer to avoid:', options: ["'I built the API and auth module'", "'We all did everything together equally'", 'A STAR story of your owned challenge', 'Naming your module + one cross-team contribution'], answer: 1 },
  // ---- Day 4 / Section D ----
  { id: 'd1', section: 'D', day: 4, level: 'B', text: "The '5 Whys' technique is used to:", options: ['Interrogate teammates', 'Drill from a symptom to a root cause', 'Generate five ideas', 'Score debate points'], answer: 1 },
  { id: 'd2', section: 'D', day: 4, level: 'B', text: 'In a GD, a good way to enter is:', options: ['Speak louder than the current speaker', "'Adding to that point...' building on what was said", 'Tap the table', 'Wait until everyone finishes'], answer: 1 },
  { id: 'd3', section: 'D', day: 4, level: 'I', text: 'Your demo crashes 1 hour before presentation. First structured step:', options: ['Assign blame', 'Define the problem precisely — what fails, since when, under what condition', 'Restart everything repeatedly', 'Tell the evaluator it cannot be fixed'], answer: 1 },
  { id: 'd4', section: 'D', day: 4, level: 'A', text: 'A viral post claims IT hiring dropped 90% with no source. Strongest check:', options: ['Ask friends if they believe it', 'Trace the primary source, check credible industry reports and the exact metric/period', 'Assume all news is fake', 'Share with a question mark'], answer: 1 },
  { id: 'd5', section: 'D', day: 4, level: 'B', text: "Which is a 'group-progress move' in a GD?", options: ["'Let me repeat my point'", "'We've covered causes; shall we move to solutions?'", "'I disagree with everyone'", "'Speak faster everyone'"], answer: 1 },
  // ---- Day 5 / Section F ----
  { id: 'f1', section: 'F', day: 5, level: 'B', text: "The 90-second 'Tell Me About Yourself' formula is:", options: ['Childhood → School → College → Family', 'Present → Past → Future → Fit', 'Hobbies → Strengths → Weaknesses', 'Name → Marks → Address'], answer: 1 },
  { id: 'f2', section: 'F', day: 5, level: 'B', text: 'On weaknesses, the recommended approach is:', options: ["'I have no weaknesses'", 'A real, non-fatal weakness + concrete improvement underway', "'I work too hard'", 'List three weaknesses fully'], answer: 1 },
  { id: 'f3', section: 'F', day: 5, level: 'I', text: "'Why this company?' scores highest when it includes:", options: ["'It's a big brand with good salary'", 'Specific researched hooks connected to your skills and goals', "'My friends work here'", "'Yours called first'"], answer: 1 },
  { id: 'f4', section: 'F', day: 5, level: 'A', text: "Stress question: 'Your CGPA is mediocre, why not reject you now?' Best response:", options: ['Defensive justification of every semester', 'Brief ownership + pivot to compensating evidence, delivered calmly', "'Marks don't matter in real life'", "'Toppers also fail'"], answer: 1 },
  { id: 'f5', section: 'F', day: 5, level: 'B', text: "A follow-up 'thank you' email should be sent:", options: ['Within 24 hours, brief and specific', 'After a week', 'Only if asked', 'Only when rejected'], answer: 0 },
];

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

// Pick N questions for a given day (or 'all'), shuffled, options shuffled too.
export function pickQuiz(all: Question[], day: number | 'all', count: number): Question[] {
  const pool = day === 'all' ? all : all.filter(q => q.day === day);
  const picked = shuffle(pool).slice(0, Math.min(count, pool.length));
  // shuffle options while keeping the answer correct
  return picked.map(q => {
    const order = shuffle(q.options.map((_, i) => i));
    return {
      ...q,
      options: order.map(i => q.options[i]),
      answer: order.indexOf(q.answer),
    };
  });
}
