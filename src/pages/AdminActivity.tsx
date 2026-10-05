import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getBatches, getBatchResults, getBatchDrills, getUsers, getSessionLocks, SESSION_KEYS } from '../lib/db';
import { Batch, QuizResult, DrillResult, User } from '../types';
import { comprehensiveScore, evaluateBadges } from '../lib/logic';
import { Link } from 'react-router-dom';

// Which trainers/participants are "active" — had activity in last 24 hrs
function isRecentlyActive(dateStr?: string): boolean {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) < 24 * 60 * 60 * 1000;
}

export default function AdminActivity() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [allDrills, setAllDrills] = useState<DrillResult[]>([]);
  const [locks, setLocks] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'trainers' | 'participants'>('trainers');

  useEffect(() => {
    Promise.all([
      getBatches(),
      getUsers(),
      getBatchResults(undefined),
      getBatchDrills(undefined),
    ]).then(async ([b, u, r, d]) => {
      setBatches(b as Batch[]);
      setAllUsers(u as User[]);
      setAllResults(r as QuizResult[]);
      setAllDrills(d as DrillResult[]);
      // Load session locks for all batches
      const lockMap: Record<string, Record<string, boolean>> = {};
      for (const batch of (b as Batch[])) {
        const { getSessionLocks: gsl } = await import('../lib/db');
        lockMap[batch.id] = await gsl(batch.id);
      }
      setLocks(lockMap);
      setLoading(false);
    });
  }, []);

  const trainers = allUsers.filter(u => u.role === 'trainer');
  const participants = allUsers.filter(u => u.role === 'participant');

  // Per participant summary
  const participantSummary = participants
    .filter(p => selectedBatch === 'all' || p.batchId === selectedBatch)
    .map(p => {
      const pResults = allResults.filter(r => r.userId === p.id);
      const pDrills = allDrills.filter(d => d.userId === p.id).filter(d => d.passed);
      const quizAvg = pResults.length ? Math.round(pResults.reduce((s, r) => s + r.percentage, 0) / pResults.length) : 0;
      const drillAvg = pDrills.length ? Math.round(pDrills.reduce((s, d) => s + d.percentage, 0) / pDrills.length) : 0;
      const badges = evaluateBadges(pResults).length;
      const finalScore = comprehensiveScore(quizAvg, drillAvg, pDrills.length, badges);
      const sessionsCompleted = new Set(pResults.map(r => `${r.day}-${r.sessionSlot || 'Full'}`)).size;
      const lastActive = pResults.length ? [...pResults].sort((a,b) => b.completedAt.localeCompare(a.completedAt))[0]?.completedAt : undefined;
      const active = isRecentlyActive(lastActive);
      return { user: p, quizAvg, drillAvg, finalScore, sessionsCompleted, lastActive, active };
    }).sort((a, b) => b.finalScore - a.finalScore);

  if (loading) return <div className="text-center py-16 text-slate-400">⏳ Loading activity data...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Admin Activity Dashboard</h1>
        <p className="text-sm text-slate-500">Real-time trainer status, participant completion, session locks — all batches.</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-extrabold text-brand">{trainers.length}</div>
          <div className="text-xs text-slate-500">Trainers registered</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-extrabold text-emerald-600">{participants.length}</div>
          <div className="text-xs text-slate-500">Participants enrolled</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-extrabold text-amber-600">{allResults.length}</div>
          <div className="text-xs text-slate-500">Quiz attempts recorded</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-extrabold text-indigo-600">{allDrills.filter(d=>d.passed).length}</div>
          <div className="text-xs text-slate-500">Drills passed</div>
        </div>
      </div>

      {/* Trainer status panel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-white">Trainer & Session Status</h2>
          <span className="text-xs text-slate-400">Updates on page refresh</span>
        </div>
        <div className="divide-y divide-slate-100">
          {batches.map(batch => {
            const trainer = trainers.find(t => t.batchId === batch.id);
            const batchLocks = locks[batch.id] || {};
            const activeSession = SESSION_KEYS.find(k => batchLocks[k]);
            const batchParticipants = participants.filter(p => p.batchId === batch.id);
            const batchResults = allResults.filter(r => batchParticipants.some(p => p.id === r.userId));
            const activeParticipants = new Set(
              batchResults.filter(r => isRecentlyActive(r.completedAt)).map(r => r.userId)
            ).size;
            return (
              <div key={batch.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-800">{batch.name}</span>
                      {activeSession
                        ? <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">● Session active: {activeSession}</span>
                        : <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">No session active</span>}
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>👩‍🏫 Trainer: <strong className="text-slate-700">{trainer?.name || 'Not assigned'}</strong></span>
                      <span>📧 {trainer?.email || '—'}</span>
                      <span>👥 {batchParticipants.length} participants</span>
                      {activeParticipants > 0 && <span className="text-emerald-600 font-semibold">🟢 {activeParticipants} active today</span>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div className="font-semibold text-slate-600">{batchResults.length} attempts</div>
                  </div>
                </div>
                {/* Session grid for this batch */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[1,2,3,4,5].map(day => (['Morning','Afternoon'] as const).map(slot => {
                    const key = `${day}-${slot}`;
                    const on = batchLocks[key];
                    return (
                      <span key={key} className={`text-[10px] px-2 py-0.5 rounded font-semibold ${on ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        D{day} {slot === 'Morning' ? '☀' : '🌙'}{on ? ' ●' : ''}
                      </span>
                    );
                  }))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participant completion table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-800 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-white">Participant Report & Certificate Access</h2>
          <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
            className="text-xs border border-slate-600 bg-slate-700 text-white rounded px-2 py-1">
            <option value="all">All batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-2">Participant</th>
                <th className="text-left px-3 py-2">Batch</th>
                <th className="px-3 text-center">Sessions Done</th>
                <th className="px-3 text-center">Quiz Avg</th>
                <th className="px-3 text-center">Final Score</th>
                <th className="px-3 text-center">Status</th>
                <th className="px-3 text-center">Report</th>
                <th className="px-3 text-center">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {participantSummary.length === 0 && (
                <tr><td colSpan={8} className="text-center text-slate-400 py-8">No participant data yet.</td></tr>
              )}
              {participantSummary.map(({ user: p, quizAvg, finalScore, sessionsCompleted, lastActive, active }) => {
                const batch = batches.find(b => b.id === p.batchId);
                const readiness = finalScore >= 75 ? 'Ready' : finalScore >= 60 ? 'Developing' : 'Needs attention';
                const readinessColor = finalScore >= 75 ? 'bg-emerald-100 text-emerald-700' : finalScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        {active && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" title="Active today"></span>}
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{p.email}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{batch?.name || p.batchId}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sessionsCompleted >= 8 ? 'bg-emerald-100 text-emerald-700' : sessionsCompleted > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                        {sessionsCompleted}/10
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-slate-600">{quizAvg}%</td>
                    <td className="px-3 py-2 text-center font-bold text-brand">{finalScore}%</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${readinessColor}`}>{readiness}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Link to={`/admin/participant/${p.id}/report`}
                        className="text-xs font-semibold text-brand hover:underline">View →</Link>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Link to={`/admin/participant/${p.id}/certificate`}
                        className="text-xs font-semibold text-emerald-600 hover:underline">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
