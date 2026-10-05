import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getMyResults, getMyDrills, getSessionLocks, countAttempts, getAttemptLimit } from '../lib/db';
import { analyzeSkillGap, evaluateBadges, sessionQuizAvg, comprehensiveScore } from '../lib/logic';
import { QuizResult } from '../types';

const DAYS = [
  { day: 1, title: 'Mindset & Confidence', desc: 'Growth mindset, box breathing, Answer-to-Fear' },
  { day: 2, title: 'Communication & English', desc: 'Grammar, listening, professional messaging' },
  { day: 3, title: 'Speaking, Storytelling & Resume', desc: 'PREP, STAR, ATS resume' },
  { day: 4, title: 'Thinking, Teamwork & GD', desc: '5 Whys, fact-checking, group discussion' },
  { day: 5, title: 'Interview & Etiquette', desc: 'TMAY, HR questions, follow-up' },
];

export default function ParticipantHome() {
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [drills, setDrills] = useState<any[]>([]);

  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [maxAttempts, setMaxAttempts] = useState(2);

  useEffect(() => {
    if (!user) return;
    getMyResults(user.id).then(setResults);
    getMyDrills(user.id).then(setDrills);
    if (user.batchId) {
      getSessionLocks(user.batchId).then(setLocks);
      getAttemptLimit(user.batchId).then(setMaxAttempts);
      // Count attempts per day+slot separately
      const slotKeys = [];
      for (let d = 1; d <= 5; d++) {
        slotKeys.push({ d, slot: 'Morning' }, { d, slot: 'Afternoon' });
      }
      Promise.all(slotKeys.map(({ d, slot }) =>
        countAttempts(user.id, d, `Quiz-${slot}`).then(c => ({ d, slot, c }))
      )).then(counts => {
        const map: Record<string, number> = {};
        counts.forEach(({ d, slot, c }) => { map[`${d}-${slot}`] = c; });
        setAttemptCounts(map);
      });
    }
  }, [user]);

  const gap = analyzeSkillGap(results);
  const badges = evaluateBadges(results);
  const doneDays = new Set(results.filter(r => r.day !== 'all').map(r => r.day));

  // Per-day+slot scores for display
  const slotScores: Record<string, number> = {};
  results.forEach(r => {
    const key = `${r.day}-${r.sessionSlot || 'Full'}`;
    if (!slotScores[key] || r.percentage > slotScores[key]) slotScores[key] = r.percentage;
  });
  const dayScores: Record<string | number, number> = {}; // kept for bootcamp card
  results.forEach(r => {
    const k = String(r.day);
    if (!dayScores[k] || r.percentage > dayScores[k]) dayScores[k] = r.percentage;
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-brand to-indigo-500 text-white rounded-2xl p-6">
        <h1 className="text-2xl font-extrabold">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-indigo-100 text-sm mt-1">Complete each day's quiz, track your growth, and close your skill gaps — all free.</p>
        <div className="flex flex-wrap gap-4 mt-4">
          <Stat label="Sessions done" value={Object.keys(slotScores).length + '/10'} />
          <Stat label="Drills passed" value={(drills.filter((d:any) => d.passed).length) + '/10'} />
          <Stat label="Badges earned" value={badges.length} />
          <Stat label="Final score" value={comprehensiveScore(sessionQuizAvg(results), drills.filter((d:any)=>d.passed).length ? Math.round(drills.filter((d:any)=>d.passed).reduce((s:number,d:any)=>s+d.percentage,0)/drills.filter((d:any)=>d.passed).length) : 0, drills.filter((d:any)=>d.passed).length, badges.length) + '%'} />
        </div>
      </div>

      <div>
        <h2 className="font-bold text-slate-800 mb-3">5-Day Assessment Track</h2>
        <div className="space-y-3">
          {DAYS.map(d => {
            const morningActive = locks[`${d.day}-Morning`];
            const afternoonActive = locks[`${d.day}-Afternoon`];
            const morningAttempts = attemptCounts[`${d.day}-Morning`] || 0;
            const afternoonAttempts = attemptCounts[`${d.day}-Afternoon`] || 0;
            const morningScore = slotScores[`${d.day}-Morning`];
            const afternoonScore = slotScores[`${d.day}-Afternoon`];
            const morningDone = morningScore !== undefined;
            const afternoonDone = afternoonScore !== undefined;
            return (
              <div key={d.day} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-extrabold text-brand bg-indigo-50 px-2 py-1 rounded">DAY {d.day}</span>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{d.title}</p>
                    <p className="text-xs text-slate-500">{d.desc}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {/* Morning Quiz */}
                  {(['Morning', 'Afternoon'] as const).map(slot => {
                    const active = slot === 'Morning' ? morningActive : afternoonActive;
                    const attempts = slot === 'Morning' ? morningAttempts : afternoonAttempts;
                    const score = slot === 'Morning' ? morningScore : afternoonScore;
                    const done = score !== undefined;
                    const limitReached = attempts >= maxAttempts;
                    const attemptsLeft = maxAttempts - attempts;
                    return (
                      <div key={slot} className={`rounded-lg p-3 border ${active ? 'border-brand bg-indigo-50/30' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[11px] font-bold ${slot === 'Morning' ? 'text-amber-600' : 'text-indigo-600'}`}>
                            {slot === 'Morning' ? '☀' : '🌙'} {slot} Quiz
                          </span>
                          <div className="flex gap-1">
                            {!active && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">🔒 Locked</span>}
                            {active && !done && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Pending</span>}
                            {done && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">✓ {score}%</span>}
                          </div>
                        </div>
                        {attempts > 0 && (
                          <p className={`text-[10px] mb-2 ${limitReached ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                            {limitReached ? `⚠ ${maxAttempts}/${maxAttempts} attempts used` : `${attempts}/${maxAttempts} attempts · ${attemptsLeft} left`}
                          </p>
                        )}
                        {active && !limitReached
                          ? <Link to={`/quiz?day=${d.day}&slot=${slot}`}
                              className="block text-center text-xs font-bold bg-brand text-white py-1.5 rounded-lg">
                              {done ? `Retake` : 'Start Quiz'}
                            </Link>
                          : active && limitReached
                            ? <div className="text-center text-[10px] font-bold bg-red-50 text-red-600 py-1.5 rounded border border-red-200">
                                Exhausted — contact trainer
                              </div>
                            : <div className="text-center text-[10px] text-slate-400 py-1.5">
                                Awaiting trainer activation
                              </div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <Link to="/quiz?day=all" className="block bg-slate-800 text-white rounded-xl p-4 hover:bg-slate-900 transition">
            <span className="text-xs font-bold text-indigo-300">FULL BOOTCAMP</span>
            <h3 className="font-bold mt-1 text-sm">Complete Assessment — Mixed questions from all days</h3>
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Link to="/drills" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand hover:shadow-sm transition">
          <div className="text-lg">🏆</div>
          <h3 className="font-bold text-slate-800 text-sm mt-1">Drills Arena</h3>
          <p className="text-xs text-slate-500 mt-0.5">10 gamified drills, earn Gold & Platinum badges</p>
        </Link>
        <Link to="/audio" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand hover:shadow-sm transition">
          <div className="text-lg">🎧</div>
          <h3 className="font-bold text-slate-800 text-sm mt-1">Audio Studio</h3>
          <p className="text-xs text-slate-500 mt-0.5">Hear model vs flawed answers</p>
        </Link>
        <Link to="/resume" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand hover:shadow-sm transition">
          <div className="text-lg">📄</div>
          <h3 className="font-bold text-slate-800 text-sm mt-1">Resume Tools</h3>
          <p className="text-xs text-slate-500 mt-0.5">ATS score checker + builder</p>
        </Link>
      </div>

      {gap.gaps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-bold text-slate-800 mb-2">Your current focus areas</h2>
          <div className="flex flex-wrap gap-2">
            {gap.gaps.map(g => <span key={g} className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-100">{g}</span>)}
          </div>
          <Link to="/report" className="inline-block mt-3 text-sm font-semibold text-brand">See full report →</Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white/15 rounded-lg px-3 py-2">
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[11px] text-indigo-100">{label}</div>
    </div>
  );
}
