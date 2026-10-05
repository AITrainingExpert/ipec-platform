import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getBatchResults, getBatchDrills, getUsers } from '../lib/db';
import { QuizResult, DrillResult, User } from '../types';
import { comprehensiveScore, evaluateBadges, sessionQuizAvg } from '../lib/logic';

export default function Analytics() {
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [drills, setDrills] = useState<DrillResult[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const batchId = user?.role === 'admin' ? undefined : user?.batchId;
    getBatchResults(batchId).then(setResults);
    getBatchDrills(batchId).then(setDrills);
    getUsers().then(setUsers);
  }, [user]);

  // Build per-candidate rows
  const map: Record<string, { name: string; branch: string; quiz: QuizResult[]; xp: number }> = {};
  results.forEach(r => {
    if (!map[r.userId]) {
      const u = users.find(x => x.id === r.userId);
      map[r.userId] = { name: r.userName, branch: u?.branch || '—', quiz: [], xp: 0 };
    }
    map[r.userId].quiz.push(r);
  });
  drills.forEach(d => {
    if (!map[d.userId]) map[d.userId] = { name: d.userName, branch: users.find(x => x.id === d.userId)?.branch || '—', quiz: [], xp: 0 };
    if (d.passed) map[d.userId].xp += d.xpEarned;
  });

  const rows = Object.entries(map).map(([id, v]) => {
    const quizAvg = sessionQuizAvg(v.quiz);
    const drillResults = drills.filter(d => d.userId === id && d.passed);
    const drillAvg = drillResults.length ? Math.round(drillResults.reduce((s, d) => s + d.percentage, 0) / drillResults.length) : 0;
    const milestones = evaluateBadges(v.quiz).length;
    // Comprehensive score: Quiz 55% + Drills 35% + Badges 10%
    const avg = comprehensiveScore(quizAvg, drillAvg, drillResults.length, milestones);
    const readiness = avg >= 75 ? 'Top Tier Candidate' : avg >= 60 ? 'Interview Ready' : 'Needs Practice';
    return { id, name: v.name, branch: v.branch, avg, quizAvg, xp: v.xp, readiness };
  }).sort((a, b) => b.avg - a.avg);

  const cohort = rows.length;
  const cohortAvg = cohort ? Math.round(rows.reduce((s, r) => s + r.avg, 0) / cohort) : 0;
  const ready = rows.filter(r => r.avg >= 60).length;
  const readyPct = cohort ? Math.round((ready / cohort) * 100) : 0;

  // branch breakdown
  const branchMap: Record<string, number[]> = {};
  rows.forEach(r => { (branchMap[r.branch] = branchMap[r.branch] || []).push(r.avg); });
  const branches = Object.entries(branchMap).map(([b, arr]) => ({ branch: b, pct: Math.round(arr.reduce((s, x) => s + x, 0) / arr.length), n: arr.length }));

  const tagColor: Record<string, string> = {
    'Top Tier Candidate': 'bg-emerald-100 text-emerald-700',
    'Interview Ready': 'bg-blue-100 text-blue-700',
    'Needs Practice': 'bg-amber-100 text-amber-700',
  };

  const exportPdf = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const branchRows = branches.map(b => `<tr><td>${b.branch}</td><td>${b.pct}%</td><td>${b.n}</td></tr>`).join('');
    const candRows = rows.map(r => `<tr><td>${r.name}</td><td>${r.branch}</td><td>${r.avg}%</td><td>${r.xp}</td><td>${r.readiness}</td></tr>`).join('');
    w.document.write(`<html><head><title>Cohort Readiness Report</title>
      <style>body{font-family:Arial;padding:30px;color:#1e293b}h1{color:#4f46e5}table{border-collapse:collapse;width:100%;margin:10px 0}td,th{border:1px solid #ccc;padding:6px;text-align:left;font-size:13px}th{background:#4f46e5;color:#fff}</style></head>
      <body><h1>Cohort Readiness Report</h1>
      <p>Total: <b>${cohort}</b> · Avg score: <b>${cohortAvg}%</b> · Placement-ready: <b>${readyPct}%</b></p>
      <h3>Branch-wise readiness</h3><table><tr><th>Branch</th><th>Avg</th><th>Students</th></tr>${branchRows}</table>
      <h3>Candidate leaderboard</h3><table><tr><th>Candidate</th><th>Branch</th><th>Avg</th><th>XP</th><th>Status</th></tr>${candRows}</table>
      <p style="color:#64748b;font-size:12px;margin-top:24px">iPEC Solutions · Print to PDF from your browser.</p></body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Recruiter Analytics</h1>
          <p className="text-sm text-slate-500">{user?.role === 'admin' ? 'All batches' : 'Your batch'} · placement readiness overview</p>
        </div>
        <button onClick={exportPdf} className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg">Export Cohort Report (PDF)</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Total cohort" value={cohort} />
        <KPI label="Final score (avg)" value={cohortAvg + '%'} />
        <KPI label="Placement ready" value={readyPct + '%'} good />
        <KPI label="Top tier" value={rows.filter(r => r.avg >= 75).length} good />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-3">Branch-wise readiness</h2>
        {branches.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
        <div className="space-y-2">
          {branches.map(b => (
            <div key={b.branch} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600 w-40">{b.branch} <span className="text-xs text-slate-400">({b.n})</span></span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full"><div className={`h-3 rounded-full ${b.pct >= 75 ? 'bg-emerald-500' : b.pct >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: b.pct + '%' }} /></div>
              <span className="text-sm font-bold w-12 text-right">{b.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100"><h2 className="font-bold text-slate-800">Candidate Assessment Leaderboard</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="text-left px-4 py-2">Candidate</th><th className="text-left">Branch</th><th className="px-2">Quiz Avg</th><th className="px-2">Final Score</th><th className="px-2">XP</th><th className="text-left px-2">Status</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-8">No candidate data yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-semibold text-slate-700">{r.name}</td>
                <td className="text-slate-500">{r.branch}</td>
                <td className="px-2 text-center text-slate-500">{(r as any).quizAvg ?? r.avg}%</td>
                  <td className="px-2 text-center font-bold text-brand">{r.avg}%</td>
                <td className="px-2 text-center">{r.xp}</td>
                <td className="px-2"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tagColor[r.readiness]}`}>{r.readiness}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value, good }: { label: string; value: any; good?: boolean }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-4"><div className={`text-2xl font-extrabold ${good ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}
