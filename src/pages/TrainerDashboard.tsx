import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { canExport } from '../lib/permissions';
import { getBatchResults, getBatchDrills, getUsers, getBatches } from '../lib/db';
import { QuizResult, DrillResult, User, Batch } from '../types';
import { comprehensiveScore, evaluateBadges, sessionQuizAvg } from '../lib/logic';
import TrackBatchPicker, { useScope, TRACK_NAME } from '../components/TrackBatchPicker';

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [drills, setDrills] = useState<DrillResult[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const { scope, setScope, trackBatches, batchIds, label, isAdmin } = useScope(user, batches);

  useEffect(() => {
    const batchId = user?.role === 'admin' ? undefined : user?.batchId;
    getBatchResults(batchId).then(setResults);
    getBatchDrills(batchId).then(setDrills);
    getUsers().then(setUsers);
    getBatches().then(setBatches);
  }, [user]);

  // Only the chosen track / batch (batch taken from the student's profile)
  const userById: Record<string, User> = Object.fromEntries(users.map(u => [u.id, u]));
  const batchOf = (r: { userId: string; batchId?: string }) => userById[r.userId]?.batchId || r.batchId || '';
  const batchName = (id: string) => batches.find(b => b.id === id)?.name || id || '—';

  // aggregate per student
  const perStudent: Record<string, { name: string; usn: string; batchId: string; results: QuizResult[] }> = {};
  results.filter(r => batchIds.has(batchOf(r))).forEach(r => {
    if (!perStudent[r.userId]) perStudent[r.userId] = { name: userById[r.userId]?.name || r.userName, usn: userById[r.userId]?.usn || '', batchId: batchOf(r), results: [] };
    perStudent[r.userId].results.push(r);
  });
  const registered = users.filter(u => u.role === 'participant' && batchIds.has(u.batchId || '')).length;
  const rows = Object.entries(perStudent).map(([id, v]) => {
    const quizAvg = sessionQuizAvg(v.results);
    const drillResults = drills.filter(d => d.userId === id && d.passed);
    const drillAvg = drillResults.length ? Math.round(drillResults.reduce((s, d) => s + d.percentage, 0) / drillResults.length) : 0;
    const milestones = evaluateBadges(v.results).length;
    const avg = comprehensiveScore(quizAvg, drillAvg, drillResults.length, milestones);
    const days = new Set(v.results.filter(r => r.day !== 'all').map(r => r.day)).size;
    const band = avg >= 75 ? 'Ready' : avg >= 60 ? 'Developing' : 'At Risk';
    const gaps = Array.from(new Set(v.results.flatMap(r => r.weakSections))).slice(0, 2);
    return { id, name: v.name, usn: v.usn, batchId: v.batchId, avg, quizAvg, days, band, gaps, count: v.results.length };
  }).sort((a, b) => b.avg - a.avg);

  const bandColor: Record<string, string> = { Ready: 'bg-emerald-100 text-emerald-700', Developing: 'bg-amber-100 text-amber-700', 'At Risk': 'bg-red-100 text-red-700' };
  const batchAvg = rows.length ? Math.round(rows.reduce((s, r) => s + r.avg, 0) / rows.length) : 0;
  const ready = rows.filter(r => r.band === 'Ready').length;
  const risk = rows.filter(r => r.band === 'At Risk').length;

  const exportCsv = () => {
    if (!canExport(user)) return;
    const cell = (v: any) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const head = 'Track,Batch,Name,USN,Avg %,Days done,Quizzes,Readiness,Focus areas\n';
    const body = rows.map(r => [TRACK_NAME[scope.track], batchName(r.batchId), r.name, r.usn, r.avg, r.days, r.count, r.band, r.gaps.join('; ')].map(cell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + head + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `results_${scope.track}_${label.replace(/\s+/g, '-')}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">{user?.role === 'admin' ? 'All Results' : 'Batch Dashboard'}</h1>
          <p className="text-sm text-slate-500">{TRACK_NAME[scope.track]} · {label}</p>
        </div>
        {canExport(user) && <button onClick={exportCsv} className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg">Export CSV</button>}
      </div>

      <TrackBatchPicker scope={scope} setScope={setScope} trackBatches={trackBatches} isAdmin={isAdmin} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPI label="Registered" value={registered} />
        <KPI label="Took part" value={rows.length} />
        <KPI label="Batch average" value={batchAvg + '%'} />
        <KPI label="Placement ready" value={ready} good />
        <KPI label="At risk" value={risk} warn />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white text-xs">
            <tr><th className="text-left px-4 py-2">Student</th><th className="text-left px-2 py-2">USN</th>{!scope.batchId && <th className="text-left px-2 py-2">Batch</th>}<th className="px-2 py-2">Avg</th><th className="px-2 py-2">Days</th><th className="px-2 py-2">Readiness</th><th className="text-left px-4 py-2">Focus areas</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-8">No results yet for {label}. Ask students to take quizzes.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-semibold text-slate-700">{r.name}</td>
                <td className="px-2 py-2 font-mono text-xs text-slate-500">{r.usn || '—'}</td>
                {!scope.batchId && <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{batchName(r.batchId)}</td>}
                <td className="px-2 py-2 text-center font-bold">{r.avg}%</td>
                <td className="px-2 py-2 text-center">{r.days}/5</td>
                <td className="px-2 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bandColor[r.band]}`}>{r.band}</span></td>
                <td className="px-4 py-2 text-xs text-slate-500">{r.gaps.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value, good, warn }: { label: string; value: any; good?: boolean; warn?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`text-2xl font-extrabold ${good ? 'text-emerald-600' : warn ? 'text-red-500' : 'text-slate-800'}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
