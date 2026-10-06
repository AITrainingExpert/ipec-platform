import { Question, QuizResult, Badge, AtsResult } from '../types';
import { SECTION_NAMES } from './questions';

// ---- Quiz scoring ----
export function scoreQuiz(questions: Question[], answers: Record<string, number>) {
  let correct = 0;
  const sectionMiss: Record<string, number> = {};
  const sectionTotal: Record<string, number> = {};
  questions.forEach(q => {
    sectionTotal[q.section] = (sectionTotal[q.section] || 0) + 1;
    if (answers[q.id] === q.answer) correct++;
    else sectionMiss[q.section] = (sectionMiss[q.section] || 0) + 1;
  });
  const total = questions.length;
  const percentage = total ? Math.round((correct / total) * 100) : 0;
  // weak section = missed >= half of that section's questions
  const weakSections = Object.keys(sectionMiss)
    .filter(s => sectionMiss[s] >= Math.ceil((sectionTotal[s] || 1) / 2))
    .map(s => SECTION_NAMES[s] || s);
  return { correct, total, percentage, weakSections };
}

// ---- Skill-gap analyzer: aggregate a user's results into strengths/gaps ----
export function analyzeSkillGap(results: QuizResult[]) {
  if (results.length === 0) return { avg: 0, strengths: [], gaps: [], trend: 'No data yet' };
  const avg = Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length);
  const gapCounts: Record<string, number> = {};
  results.forEach(r => r.weakSections.forEach(w => { gapCounts[w] = (gapCounts[w] || 0) + 1; }));
  const gaps = Object.entries(gapCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 3);
  const dayScores = results.filter(r => r.day !== 'all');
  const strengths: string[] = [];
  if (avg >= 75) strengths.push('Consistently strong quiz performance across modules');
  const best = [...results].sort((a, b) => b.percentage - a.percentage)[0];
  if (best) strengths.push(`Strongest in a ${best.day === 'all' ? 'full' : 'Day ' + best.day} assessment (${best.percentage}%)`);
  if (dayScores.length >= 2) {
    const first = dayScores[dayScores.length - 1].percentage;
    const last = dayScores[0].percentage;
    strengths.push(last >= first ? 'Improving trend across days' : 'Solid baseline to build on');
  }
  const trend = avg >= 75 ? 'Placement-ready' : avg >= 60 ? 'Developing' : 'Needs focused practice';
  return { avg, strengths, gaps, trend };
}

// ---- Gamification: badge rules ----
export function evaluateBadges(results: QuizResult[]): Badge[] {
  const badges: Badge[] = [];
  const now = new Date().toISOString();
  const daysCompleted = new Set(results.filter(r => r.day !== 'all').map(r => r.day));
  if (results.length >= 1) badges.push({ id: 'b_start', code: 'FIRST_STEP', title: 'First Step', tier: 'Bronze', earnedAt: now });
  if (daysCompleted.size >= 3) badges.push({ id: 'b_streak', code: 'HALFWAY_HERO', title: 'Halfway Hero', tier: 'Silver', earnedAt: now });
  if (daysCompleted.size >= 5) badges.push({ id: 'b_all', code: 'BOOTCAMP_CHAMPION', title: 'Bootcamp Champion', tier: 'Gold', earnedAt: now });
  if (results.some(r => r.percentage === 100)) badges.push({ id: 'b_perfect', code: 'PERFECT_SCORE', title: 'Perfect Score', tier: 'Gold', earnedAt: now });
  if (results.some(r => r.percentage >= 80)) badges.push({ id: 'b_ace', code: 'HIGH_ACHIEVER', title: 'High Achiever', tier: 'Silver', earnedAt: now });
  return badges;
}

// ---- ATS resume checker (client-side keyword + heuristic scoring) ----
const ROLE_KEYWORDS = ['java', 'python', 'javascript', 'react', 'node', 'sql', 'git', 'api', 'rest',
  'data structures', 'algorithms', 'cloud', 'aws', 'docker', 'agile', 'testing', 'oop',
  'problem solving', 'communication', 'teamwork', 'project', 'internship'];
const ACTION_VERBS = ['built', 'developed', 'designed', 'implemented', 'created', 'led', 'improved',
  'reduced', 'increased', 'automated', 'optimized', 'launched', 'delivered', 'analyzed', 'managed'];

export function checkAts(resumeText: string, jd = ''): AtsResult {
  const text = resumeText.toLowerCase();
  const target = (jd.toLowerCase().match(/[a-z][a-z+#.]+/g) || []);
  const keywordsToCheck = jd ? Array.from(new Set([...ROLE_KEYWORDS, ...target])) : ROLE_KEYWORDS;

  const detectedSkills = ROLE_KEYWORDS.filter(k => text.includes(k));
  const missingKeywords = keywordsToCheck.filter(k => !text.includes(k)).slice(0, 8);
  const foundVerbs = ACTION_VERBS.filter(v => text.includes(v));

  const keywords = Math.min(100, Math.round((detectedSkills.length / ROLE_KEYWORDS.length) * 130));
  const actionVerbs = Math.min(100, Math.round((foundVerbs.length / 8) * 100));

  // formatting heuristics
  const hasNumbers = /\d+%|\d{2,}|\$\d+/.test(resumeText);
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  const goodLength = wordCount >= 150 && wordCount <= 900;
  const hasSections = /experience|education|skills|project/i.test(resumeText);
  let formatting = 40;
  if (hasNumbers) formatting += 25;
  if (goodLength) formatting += 20;
  if (hasSections) formatting += 15;
  formatting = Math.min(100, formatting);

  const overall = Math.round(keywords * 0.4 + actionVerbs * 0.25 + formatting * 0.35);

  const tips: string[] = [];
  if (!hasNumbers) tips.push('Quantify impact — add numbers like "reduced load time by 40%".');
  if (foundVerbs.length < 4) tips.push('Start bullet points with strong action verbs (Built, Led, Optimized).');
  if (detectedSkills.length < 6) tips.push('Add more role-relevant skills/keywords from the job description.');
  if (!goodLength) tips.push('Aim for a focused one-page resume (roughly 150–900 words).');
  if (!hasSections) tips.push('Use clear standard headings: Skills, Experience, Projects, Education.');
  if (tips.length === 0) tips.push('Strong resume — keep tailoring keywords to each specific job description.');

  return { overall, formatting, keywords, actionVerbs, detectedSkills, missingKeywords, tips };
}

// ---- Mobile number format validation (Indian) ----
export function validateMobile(m: string): { ok: boolean; msg: string } {
  const digits = (m || '').replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (local.length !== 10) return { ok: false, msg: 'Mobile must be 10 digits.' };
  if (!/^[6-9]/.test(local)) return { ok: false, msg: 'Mobile must start with 6, 7, 8 or 9.' };
  return { ok: true, msg: '' };
}

// ---- Per-participant recommendation from results ----
export function recommendFor(avg: number, gaps: string[]): string[] {
  const recs: string[] = [];
  if (avg >= 80) recs.push('Strong performer — focus on advanced mock interviews and leadership in group discussions.');
  else if (avg >= 60) recs.push('Solid progress — revise weak sections and retake those quizzes to push above 75%.');
  else recs.push('Prioritise fundamentals — redo the beginner drills and revisit each day\u2019s micro-lessons before retrying.');
  gaps.slice(0, 3).forEach(g => {
    recs.push(`Targeted practice needed in: ${g}. Use the Drills Arena and Audio Studio for this area.`);
  });
  if (gaps.length === 0 && avg >= 75) recs.push('Well-rounded — you are on track for placement readiness.');
  return recs;
}

// ---- Concept coverage mapping (day → concepts) ----
// Junior Champion track: 1st & 2nd year
// Senior Champion track: 3rd & 4th year

export const JUNIOR_CONCEPTS: Record<string, { label: string; weight: number }> = {
  '1': { label: 'Confidence, Mindset & Psychology', weight: 20 },
  '2': { label: 'Communication & English', weight: 37 },
  '3': { label: 'Communication & English', weight: 37 },
  '4': { label: 'Reasoning & Aptitude + Teamwork & GD', weight: 22 },
  '5': { label: 'Teamwork, GD & Presentation', weight: 21 },
};

export const SENIOR_CONCEPTS: Record<string, { label: string; weight: number }> = {
  '1': { label: 'Mindset & Anxiety Management', weight: 10 },
  '2': { label: 'Communication & GD (PREP)', weight: 25 },
  '3': { label: 'Resume, LinkedIn & Technical Storytelling', weight: 15 },
  '4': { label: 'Reasoning & Aptitude', weight: 22 },
  '5': { label: 'Interview Skills (TMAY, HR, Mock Battle)', weight: 28 },
};

// Concept-wise breakdown per participant
// `yearOrTrack` = 'junior' | 'senior' (preferred, from the batch) or a year like '2nd'.
export function conceptCoverage(results: QuizResult[], yearOrTrack: string) {
  const v = (yearOrTrack || '').toLowerCase();
  const isJunior = v === 'junior' ? true : v === 'senior' ? false
    : ['1st','2nd','first','second'].some(y => v.includes(y));
  const map = isJunior ? JUNIOR_CONCEPTS : SENIOR_CONCEPTS;
  const track = isJunior ? 'Junior Champion' : 'Senior Champion';

  const coverage = Object.entries(map).map(([day, meta]) => {
    const dayResults = results.filter(r => String(r.day) === day);
    const score = dayResults.length ? Math.round(dayResults.reduce((s, r) => s + r.percentage, 0) / dayResults.length) : null;
    return { day: Number(day), label: meta.label, weight: meta.weight, score };
  });

  return { track, coverage, isJunior };
}

// Comprehensive final score: quizzes + drills + milestone badges
// ── Comprehensive final score ─────────────────────────────────
// 21 total activities: 10 quizzes (5 days × Morning+Afternoon)
//                    + 10 drills (5 days × Morning+Afternoon)
//                    + 1 bootcamp
// Weights: Quiz sessions 55% | Drills 35% | Milestone badges 10%
export function comprehensiveScore(
  quizAvg: number,        // avg across all Morning+Afternoon quiz sessions
  drillAvg: number,       // avg across all passed drills
  drillsPassed: number,   // number of drills passed (out of 10)
  milestoneBadges: number // milestone badges earned (out of 5)
): number {
  const quizScore  = quizAvg;
  const drillScore = drillAvg;
  // Badge bonus: each badge = 4 points, max 5 badges = 20 pts → mapped to 0–100
  const badgeBonus = Math.min(milestoneBadges * 4, 20);
  const badgeScore = (badgeBonus / 20) * 100;
  return Math.round(quizScore * 0.55 + drillScore * 0.35 + badgeScore * 0.10);
}

// Session-wise quiz average (Morning + Afternoon tracked separately)
export function sessionQuizAvg(results: QuizResult[]): number {
  // Use best score per day+slot combination
  const bestPerSlot: Record<string, number> = {};
  results.forEach(r => {
    const key = `${r.day}-${r.sessionSlot || 'Full'}`;
    if (r.day === 'all') return; // skip bootcamp
    if (!bestPerSlot[key] || r.percentage > bestPerSlot[key]) bestPerSlot[key] = r.percentage;
  });
  const scores = Object.values(bestPerSlot);
  return scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
}
