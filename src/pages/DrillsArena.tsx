import React, { useEffect, useState } from 'react';
import { DRILLS, Drill } from '../lib/drills';
import { saveDrillResult, getMyDrills, getSessionLocks } from '../lib/db';
import { useAuth } from '../lib/auth';
import { DrillResult } from '../types';
import { Link } from 'react-router-dom';

const tierColor: Record<string, string> = {
  Gold:     'bg-yellow-100 text-yellow-700 border-yellow-300',
  Platinum: 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

export default function DrillsArena() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [active, setActive] = useState<Drill | null>(null);
  const [done, setDone] = useState<DrillResult[]>([]);
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const isStaff = user?.role === 'trainer' || user?.role === 'admin';

  const load = () => {
    if (user) {
      getMyDrills(user.id).then(setDone);
      if (user.batchId) getSessionLocks(user.batchId).then(setLocks);
    }
  };
  useEffect(load, [user]);

  const totalXp = done.filter(d => d.passed).reduce((s, d) => s + d.xpEarned, 0);
  const earned = new Set(done.filter(d => d.passed).map(d => d.drillId));
  const shown = filter === 'all' ? DRILLS : DRILLS.filter(d => d.day === filter);

  // Check if any session is active at all (for participants)
  const anySessionActive = isStaff || Object.values(locks).some(v => v);

  if (active) return <DrillRunner drill={active} onDone={() => { setActive(null); load(); }} />;

  // If no session active, show locked screen
  if (!anySessionActive && !isStaff) return (
    <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center mt-10">
      <div className="text-4xl mb-3">🔒</div>
      <h1 className="text-xl font-extrabold text-slate-800">Drills Arena is locked</h1>
      <p className="text-slate-500 text-sm mt-2">Your trainer hasn't activated a session yet. The Drills Arena unlocks when a session is open.</p>
      <Link to="/" className="inline-block mt-5 text-sm font-semibold text-brand">← Back to Home</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6">
        <h1 className="text-2xl font-extrabold">Gamified Activity Arena 🏆</h1>
        <p className="text-indigo-100 text-sm mt-1">Complete morning & afternoon drills across all 5 days. Score above the bar to unlock Gold and Platinum badges.</p>
        <div className="flex gap-4 mt-4">
          <div className="bg-white/15 rounded-lg px-4 py-2"><div className="text-xl font-extrabold">{earned.size} / {DRILLS.length}</div><div className="text-[11px] text-indigo-100">Badges unlocked</div></div>
          <div className="bg-white/15 rounded-lg px-4 py-2"><div className="text-xl font-extrabold">{totalXp} XP</div><div className="text-[11px] text-indigo-100">Total experience</div></div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 1, 2, 3, 4, 5] as const).map(d => (
          <button key={d} onClick={() => setFilter(d)} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${filter === d ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {d === 'all' ? 'All 5 Days' : 'Day ' + d}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {shown.map(dr => {
          const unlocked = earned.has(dr.id);
          // Check if this drill's day session is active
          const drillSessionActive = isStaff || locks[`${dr.day}-${dr.session}`] || false;
          return (
            <div key={dr.id} className={`bg-white border rounded-xl p-4 ${drillSessionActive ? 'border-slate-200' : 'border-slate-100 opacity-70'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-brand">DAY {dr.day} · {dr.session.toUpperCase()}</span>
                <span className="text-[11px] text-slate-400">Req: {dr.passScore}% score</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">{dr.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{dr.desc}</p>
              <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 border ${unlocked ? tierColor[dr.badgeTier] : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <div className="text-xs font-bold">{dr.badgeTitle} <span className="uppercase text-[10px]">{dr.badgeTier}</span></div>
                  <div className="text-[10px] opacity-70">{unlocked ? 'Unlocked ✓' : `+${dr.xp} XP on unlock`}</div>
                </div>
              </div>
              {drillSessionActive
                ? <button onClick={() => setActive(dr)} className="mt-3 w-full bg-brand hover:bg-brand-dark text-white text-sm font-bold py-2 rounded-lg">
                    {unlocked ? 'Replay Drill' : '▶ Start Gamified Drill'}
                  </button>
                : <div className="mt-3 w-full bg-slate-100 text-slate-400 text-sm font-bold py-2 rounded-lg text-center">🔒 Session not active</div>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DrillRunner({ drill, onDone }: { drill: Drill; onDone: () => void }) {
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{ pct: number; passed: boolean } | null>(null);

  const q = drill.questions[idx];
  const isLast = idx === drill.questions.length - 1;

  const choose = (i: number) => { if (revealed) return; setPicked(i); };
  const check = () => {
    if (picked === null) return;
    setRevealed(true);
    if (picked === q.answer) setCorrect(c => c + 1);
  };
  const next = async () => {
    if (!isLast) { setIdx(idx + 1); setPicked(null); setRevealed(false); return; }
    const total = drill.questions.length;
    const finalCorrect = correct + (picked === q.answer && revealed ? 0 : 0);
    const pct = Math.round((finalCorrect / total) * 100);
    const passed = pct >= drill.passScore;
    setResult({ pct, passed }); setFinished(true);
    if (user) {
      const r: DrillResult = {
        id: 'dr-' + Date.now(), userId: user.id, userName: user.name, batchId: user.batchId,
        drillId: drill.id, drillTitle: drill.title, badgeTitle: drill.badgeTitle,
        badgeTier: drill.badgeTier, score: finalCorrect, total, percentage: pct,
        passed, xpEarned: passed ? drill.xp : 0, completedAt: new Date().toISOString(),
      };
      await saveDrillResult(r);
    }
  };

  if (finished && result) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center">
        {result.passed ? (
          <>
            <div className="text-5xl">🏆</div>
            <div className={`mt-3 inline-block text-xs font-bold px-3 py-1 rounded-full ${tierColor[drill.badgeTier]}`}>{drill.badgeTier.toUpperCase()} BADGE UNLOCKED!</div>
            <h2 className="text-xl font-extrabold text-slate-800 mt-2">{drill.badgeTitle}</h2>
            <div className="bg-slate-50 rounded-lg p-3 mt-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Drill score</span><span className="font-bold text-emerald-600">{result.pct}%</span></div>
              <div className="flex justify-between"><span className="text-slate-500">XP awarded</span><span className="font-bold text-brand">+{drill.xp} XP</span></div>
            </div>
          </>
        ) : (
          <>
            <div className="text-5xl">🔄</div>
            <h2 className="text-xl font-extrabold text-slate-800 mt-3">Drill Complete</h2>
            <p className="text-slate-500 text-sm mt-1">You scored {result.pct}%. Need {drill.passScore}% to unlock the {drill.badgeTitle} badge.</p>
          </>
        )}
        <button onClick={onDone} className="mt-6 w-full bg-brand text-white font-bold py-2.5 rounded-lg">Back to Activity Arena</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-brand">DAY {drill.day} · {drill.session.toUpperCase()}</span>
        <span className="text-xs text-slate-500">Question {idx + 1} of {drill.questions.length}</span>
      </div>
      <h2 className="font-extrabold text-slate-800 mb-3">{drill.title}</h2>
      <div className="h-1.5 bg-slate-200 rounded-full mb-4"><div className="h-1.5 bg-brand rounded-full transition-all" style={{ width: `${((idx + 1) / drill.questions.length) * 100}%` }} /></div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <p className="text-[11px] font-bold text-brand mb-2">SIMULATED DRILL CHALLENGE #{idx + 1}</p>
        <p className="font-bold text-slate-800 mb-4">{q.text}</p>
        <div className="space-y-2">
          {q.options.map((o, i) => {
            let cls = 'border-slate-200 hover:bg-slate-50';
            if (revealed) {
              if (i === q.answer) cls = 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold';
              else if (i === picked) cls = 'border-red-300 bg-red-50 text-red-700';
              else cls = 'border-slate-200 opacity-40';
            } else if (picked === i) cls = 'border-brand bg-indigo-50 font-semibold';
            return (
              <button key={i} onClick={() => choose(i)} className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${cls}`}>
                <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{o}
                {revealed && i === q.answer && <span className="float-right">✓</span>}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
            <p className="text-xs font-bold text-brand mb-1">✨ iPEC Master Trainer Insight</p>
            <p className="text-sm text-slate-700">{q.insight}</p>
          </div>
        )}
      </div>
      <div className="mt-4">
        {!revealed
          ? <button onClick={check} disabled={picked === null} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-lg disabled:opacity-40">Check Answer</button>
          : <button onClick={next} className="w-full bg-brand text-white font-bold py-2.5 rounded-lg">{isLast ? 'Complete Drill & Check Badge →' : 'Next Challenge Question →'}</button>}
      </div>
    </div>
  );
}
