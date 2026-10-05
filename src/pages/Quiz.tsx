import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getQuestions, saveResult, getSessionLocks, countAttempts, getAttemptLimit, getBestScores } from '../lib/db';
import { pickQuiz } from '../lib/questions';
import { scoreQuiz } from '../lib/logic';
import { useAuth } from '../lib/auth';
import { Question, QuizResult } from '../types';

const QUIZ_SIZE = 10;
const SECONDS_PER_Q = 45;

export default function Quiz() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const dayParam = params.get('day') || 'all';
  const slotParam = params.get('slot') as 'Morning' | 'Afternoon' | null;
  const day: number | 'all' = dayParam === 'all' ? 'all' : Number(dayParam);
  // Each Morning/Afternoon is tracked separately as Quiz-Morning / Quiz-Afternoon
  const activityType: string = day === 'all' ? 'Bootcamp' : slotParam ? `Quiz-${slotParam}` : 'Quiz';
  const displaySlot = slotParam || (day === 'all' ? 'Full' : 'Full');

  const [all, setAll] = useState<Question[]>([]);
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof scoreQuiz> | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const isStaff = user?.role === 'trainer' || user?.role === 'admin';

  useEffect(() => {
    getQuestions().then(setAll);
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      user.batchId ? getSessionLocks(user.batchId) : Promise.resolve({}),
      countAttempts(user.id, day, activityType),
      getAttemptLimit(user.batchId || 'batch-1'),
      getBestScores(user.id),
    ]).then(([l, count, max, best]) => {
      setLocks(l as Record<string, boolean>);
      setAttemptCount(count as number);
      setMaxAttempts(max as number);
      const key = `${day}-${activityType}`;
      setBestScore((best as Record<string, number>)[key] ?? null);
      setLoading(false);
      setLoading(false);
    });
  }, [user, day]);

  const dayUnlocked = isStaff || day === 'all'
    ? true
    : slotParam
      ? Boolean(locks[`${day}-${slotParam}`])
      : Boolean(locks[`${day}-Morning`] || locks[`${day}-Afternoon`]);

  // Which session slot is currently active for this day?
  const activeSlot: 'Morning' | 'Afternoon' | 'Full' = slotParam || (locks[`${day}-Morning`] ? 'Morning' : locks[`${day}-Afternoon`] ? 'Afternoon' : 'Full');

  const attemptsLeft = maxAttempts - attemptCount;
  const limitReached = !isStaff && attemptsLeft <= 0;

  const begin = () => {
    const q = pickQuiz(all, day, QUIZ_SIZE);
    setQuiz(q); setAnswers({}); setIdx(0); setSubmitted(false); setResult(null);
    setTimeLeft(q.length * SECONDS_PER_Q); setStarted(true);
  };

  useEffect(() => {
    if (!started || submitted) return;
    if (timeLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft, submitted]);

  const finish = async () => {
    if (submitted) return;
    const res = scoreQuiz(quiz, answers);
    setResult(res); setSubmitted(true);
    const newCount = attemptCount + 1;
    setAttemptCount(newCount);
    if (res.percentage > (bestScore ?? 0)) setBestScore(res.percentage);
    if (user) {
      const qr: QuizResult = {
        id: 'r-' + Date.now(), userId: user.id, userName: user.name, batchId: user.batchId,
        day, sessionSlot: activeSlot, activityType,
        attemptNumber: newCount,
        score: res.correct, total: res.total, percentage: res.percentage,
        weakSections: res.weakSections, completedAt: new Date().toISOString(),
      };
      await saveResult(qr);
    }
  };

  const cur = quiz[idx];
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  if (loading) return <div className="text-center py-16 text-slate-400">Loading quiz...</div>;

  // Session locked
  if (!started && !dayUnlocked) return (
    <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="text-xl font-extrabold text-slate-800 mt-2">Day {day} {slotParam || ''} is locked</h1>
      <p className="text-slate-500 text-sm mt-2">Your trainer hasn't activated this session yet.</p>
      <Link to="/" className="inline-block mt-5 text-sm font-semibold text-brand">← Back to Home</Link>
    </div>
  );

  // Attempt limit reached
  if (!started && limitReached) return (
    <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <div className="text-4xl">🏁</div>
      <h1 className="text-xl font-extrabold text-slate-800 mt-2">
        {day === 'all' ? 'Full Bootcamp' : `Day ${day} Quiz`} — Attempts used
      </h1>
      <p className="text-slate-500 text-sm mt-2">
        You have used all {maxAttempts} attempt{maxAttempts > 1 ? 's' : ''} for this {activityType.toLowerCase()}.
      </p>
      {bestScore !== null && (
        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="text-3xl font-extrabold text-brand">{bestScore}%</div>
          <div className="text-xs text-slate-500 mt-1">Your best score — used in your final report</div>
        </div>
      )}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
        📩 Contact your trainer if you need an additional attempt.
      </div>
      <Link to="/" className="inline-block mt-4 text-sm font-semibold text-brand">← Back to Home</Link>
    </div>
  );

  // Pre-quiz start screen
  if (!started) return (
    <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <h1 className="text-xl font-extrabold text-slate-800">
        {day === 'all' ? 'Full Bootcamp Assessment' : `Day ${day} ${slotParam ? slotParam + ' Session' : ''} Quiz`}
      </h1>
      {slotParam && <p className="text-xs font-bold text-indigo-600 mt-1">{slotParam === 'Morning' ? '☀' : '🌙'} {slotParam} Session</p>}
      <p className="text-slate-500 text-sm mt-2">{QUIZ_SIZE} shuffled questions · {SECONDS_PER_Q}s each · auto-scored.</p>

      {/* Attempt info */}
      {!isStaff && (
        <div className={`mt-3 inline-block text-xs font-bold px-3 py-1.5 rounded-full ${attemptsLeft <= 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          Attempt {attemptCount + 1} of {maxAttempts}
          {attemptsLeft <= 1 && attemptCount > 0 ? ' — Last chance' : ''}
        </div>
      )}

      {/* Best score if already attempted */}
      {bestScore !== null && (
        <div className="mt-3 bg-slate-50 rounded-lg p-3 text-sm">
          Previous best: <strong className="text-brand">{bestScore}%</strong>
          {bestScore >= 60 ? ' ✓ Passed' : ' — Keep going!'}
        </div>
      )}

      <ul className="text-xs text-slate-500 mt-4 space-y-1 text-left inline-block">
        <li>• Questions and options are shuffled every attempt.</li>
        <li>• Timer auto-submits when it reaches zero.</li>
        <li>• Your <strong>best score</strong> across attempts is used in your report.</li>
      </ul>
      <button onClick={begin} disabled={all.length === 0}
        className="mt-6 w-full bg-brand hover:bg-brand-dark text-white font-bold py-2.5 rounded-lg disabled:opacity-50">
        Start {activityType}
      </button>
    </div>
  );

  // Results screen
  if (submitted && result) {
    const pass = result.percentage >= 60;
    const isNewBest = result.percentage >= (bestScore ?? 0);
    const retakeAllowed = !isStaff && attemptCount < maxAttempts;

    return (
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <div className={`text-5xl font-extrabold ${pass ? 'text-emerald-600' : 'text-amber-600'}`}>
          {result.percentage}%
        </div>
        <p className="text-slate-600 mt-1">You scored {result.correct} / {result.total}</p>
        {isNewBest && <div className="mt-1 text-xs font-bold text-emerald-600">🌟 New best score!</div>}
        <div className={`mt-2 inline-block text-sm font-bold px-3 py-1 rounded-full ${pass ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {result.percentage >= 75 ? 'Excellent' : pass ? 'Passed' : 'Keep practicing'}
        </div>

        {/* Attempt status */}
        {!isStaff && (
          <div className={`mt-3 text-xs font-semibold px-3 py-1.5 rounded-full inline-block ${attemptCount >= maxAttempts ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
            {attemptCount >= maxAttempts
              ? `All ${maxAttempts} attempts used — contact your trainer for more`
              : `${maxAttempts - attemptCount} attempt${maxAttempts - attemptCount > 1 ? 's' : ''} remaining`}
          </div>
        )}

        {result.weakSections.length > 0 && (
          <div className="mt-4 text-left">
            <p className="text-xs font-bold text-slate-500 mb-1">Focus areas:</p>
            <div className="flex flex-wrap gap-2">
              {result.weakSections.map(w => (
                <span key={w} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">{w}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          {(retakeAllowed || isStaff) && (
            <button onClick={begin} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-semibold hover:bg-slate-50">
              Retake ({attemptsLeft > 0 ? attemptsLeft : '∞'} left)
            </button>
          )}
          <Link to="/report" className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-semibold">
            View Report
          </Link>
        </div>

        {attemptCount >= maxAttempts && !isStaff && (
          <p className="text-xs text-amber-600 mt-3 font-semibold">
            📩 Contact your trainer if you need an additional attempt.
          </p>
        )}
      </div>
    );
  }

  if (!cur) return <div className="text-center text-slate-500">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-500">Question {idx + 1} / {quiz.length}</span>
        <span className={`font-mono font-bold px-3 py-1 rounded-lg ${timeLeft < 30 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
          {mm}:{ss}
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full mb-4">
        <div className="h-1.5 bg-brand rounded-full transition-all" style={{ width: `${((idx + 1) / quiz.length) * 100}%` }} />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <p className="font-bold text-slate-800 text-base mb-4">{cur.text}</p>
        <div className="space-y-2">
          {cur.options.map((opt, i) => (
            <button key={i} onClick={() => setAnswers(a => ({ ...a, [cur.id]: i }))}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${answers[cur.id] === i ? 'border-brand bg-indigo-50 font-semibold' : 'border-slate-200 hover:bg-slate-50'}`}>
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        {idx > 0 && <button onClick={() => setIdx(i => i - 1)} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-semibold">← Previous</button>}
        {idx < quiz.length - 1
          ? <button onClick={() => setIdx(i => i + 1)} className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-semibold">Next →</button>
          : <button onClick={finish} className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-bold">Submit Quiz</button>}
      </div>
    </div>
  );
}
