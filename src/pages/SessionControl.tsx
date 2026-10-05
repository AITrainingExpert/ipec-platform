import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getBatches, getBatchResults, getBatchDrills, getSessionLocks, setSessionLock, activateOnlySession, SESSION_KEYS } from '../lib/db';
import { Batch, QuizResult, DrillResult } from '../types';

// Attempt status for a participant on a given session/day
type AttemptStatus = 'not-started' | 'attempted' | 'completed';

function statusColor(s: AttemptStatus) {
  if (s === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (s === 'attempted') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-400';
}
function statusLabel(s: AttemptStatus) {
  if (s === 'completed') return '✓ Done';
  if (s === 'attempted') return '½ Partial';
  return 'Not started';
}

export default function SessionControl() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('batch-1');
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<QuizResult[]>([]);
  const [drills, setDrills] = useState<DrillResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'exclusive' | 'flexible'>('exclusive');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    getBatches().then(b => { setBatches(b); setPageLoading(false); });
  }, []);

  // Set batchId from user once user is loaded
  useEffect(() => {
    if (user?.batchId) setBatchId(user.batchId);
  }, [user]);

  const load = async () => {
    if (!batchId) return;
    const [l, r, d] = await Promise.all([
      getSessionLocks(batchId),
      getBatchResults(batchId),
      getBatchDrills(batchId),
    ]);
    setLocks(l); setResults(r); setDrills(d);
  };
  useEffect(() => { load(); }, [batchId]);

  // Activate one session (locks all others) — exclusive mode
  const activateExclusive = async (key: string) => {
    setBusy(true);
    await activateOnlySession(batchId, key, user!.name);
    await load(); setBusy(false);
  };

  // Toggle individual session (flexible mode — multiple can be open)
  const toggleSession = async (key: string) => {
    setBusy(true);
    await setSessionLock(batchId, key, !locks[key], user!.name);
    await load(); setBusy(false);
  };

  const lockAll = async () => {
    setBusy(true);
    for (const k of SESSION_KEYS) await setSessionLock(batchId, k, false, user!.name);
    await load(); setBusy(false);
  };

  const unlockAll = async () => {
    setBusy(true);
    for (const k of SESSION_KEYS) await setSessionLock(batchId, k, true, user!.name);
    await load(); setBusy(false);
  };

  if (pageLoading || authLoading) return (
    <div className="text-center py-16 text-slate-400">
      <div className="text-2xl mb-2">⏳</div>
      <p>Loading session control...</p>
    </div>
  );

  const activeCount = SESSION_KEYS.filter(k => locks[k]).length;
  const active = SESSION_KEYS.find(k => locks[k]);

  // Build participant attempt map: userId → { day → status }
  const participantMap: Record<string, { name: string; days: Record<string, AttemptStatus>; drillsDone: number }> = {};
  results.forEach(r => {
    if (!participantMap[r.userId]) participantMap[r.userId] = { name: r.userName, days: {}, drillsDone: 0 };
    const dayKey = String(r.day);
    const current = participantMap[r.userId].days[dayKey];
    const status: AttemptStatus = r.percentage >= 100 ? 'completed' : r.percentage > 0 ? 'attempted' : 'not-started';
    // "completed" wins over "attempted"
    if (current !== 'completed') participantMap[r.userId].days[dayKey] = status;
  });
  drills.forEach(d => {
    if (!participantMap[d.userId]) participantMap[d.userId] = { name: d.userName, days: {}, drillsDone: 0 };
    if (d.passed) participantMap[d.userId].drillsDone++;
  });

  const participants = Object.entries(participantMap);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Session Control</h1>
        <p className="text-sm text-slate-500">Control which sessions are open for participants. Use Exclusive mode for one-at-a-time control, or Flexible mode to open multiple sessions.</p>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-slate-600">Batch:</span>
        <select value={batchId} onChange={e => setBatchId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setMode('exclusive')} className={`text-xs font-bold px-3 py-1.5 rounded-md ${mode === 'exclusive' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Exclusive</button>
          <button onClick={() => setMode('flexible')} className={`text-xs font-bold px-3 py-1.5 rounded-md ${mode === 'flexible' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Flexible</button>
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={unlockAll} disabled={busy} className="text-sm font-semibold text-emerald-600 border border-emerald-200 rounded-lg px-3 py-2 hover:bg-emerald-50">Unlock all</button>
          <button onClick={lockAll} disabled={busy} className="text-sm font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50">Lock all</button>
        </div>
      </div>

      {/* Status banner */}
      {activeCount > 0
        ? <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm font-semibold">
            {activeCount === 1 && active ? `Currently active: Day ${active.split('-')[0]} · ${active.split('-')[1]}` : `${activeCount} sessions currently active`}
          </div>
        : <div className="bg-slate-50 border border-slate-200 text-slate-500 rounded-lg p-3 text-sm">No session active. Participants cannot access quizzes, drills or activities until you activate one.</div>}

      {/* Mode hint */}
      <p className="text-xs text-slate-400">
        {mode === 'exclusive' ? '● Exclusive mode: activating a session auto-locks all others.' : '● Flexible mode: toggle each session independently — multiple can be open at once.'}
      </p>

      {/* Session grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5].map(day => (
          <div key={day} className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-bold text-slate-800 mb-2">Day {day}</h3>
            <div className="space-y-2">
              {['Morning', 'Afternoon'].map(sess => {
                const key = `${day}-${sess}`;
                const on = locks[key];
                // Count who has attempted this day
                const attempted = participants.filter(([, v]) => v.days[String(day)] && v.days[String(day)] !== 'not-started').length;
                const done = participants.filter(([, v]) => v.days[String(day)] === 'completed').length;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-slate-600">{sess}</span>
                      {participants.length > 0 && (
                        <span className="ml-2 text-[10px] text-slate-400">
                          {done} done · {attempted - done} partial · {participants.length - attempted} not started
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => mode === 'exclusive' ? activateExclusive(key) : toggleSession(key)}
                      disabled={busy}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg ${on ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {on ? '● Active' : mode === 'exclusive' ? 'Activate' : 'Open'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Participant attempt tracker */}
      {participants.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Participant Attempt Tracker</h2>
            <span className="text-xs text-slate-400">{participants.length} participants · colour = quiz attempt status</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">Participant</th>
                  {[1, 2, 3, 4, 5].map(d => <th key={d} className="px-2 text-center">Day {d}</th>)}
                  <th className="px-2 text-center">Drills</th>
                  <th className="px-2 text-center">Overall</th>
                </tr>
              </thead>
              <tbody>
                {participants.map(([uid, v]) => {
                  const dayStatuses = [1, 2, 3, 4, 5].map(d => v.days[String(d)] || 'not-started');
                  const completed = dayStatuses.filter(s => s === 'completed').length;
                  const attempted = dayStatuses.filter(s => s !== 'not-started').length;
                  const overallStatus: AttemptStatus = completed >= 5 ? 'completed' : attempted > 0 ? 'attempted' : 'not-started';
                  return (
                    <tr key={uid} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-semibold text-slate-700">{v.name}</td>
                      {dayStatuses.map((s, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(s)}`}>{statusLabel(s)}</span>
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center text-xs font-semibold text-indigo-600">{v.drillsDone}/10</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(overallStatus)}`}>{statusLabel(overallStatus)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
