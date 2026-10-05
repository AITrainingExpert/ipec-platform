import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getMyResults, getMyDrills } from '../lib/db';
import { analyzeSkillGap, recommendFor, conceptCoverage, comprehensiveScore, evaluateBadges, sessionQuizAvg } from '../lib/logic';

function badgeFromScore(score: number): string {
  if (score >= 85) return 'Platinum Edge';
  if (score >= 70) return 'Gold Edge';
  if (score >= 55) return 'Silver Edge';
  return 'Bronze Edge';
}
import { QuizResult, DrillResult } from '../types';

export default function MyReport() {
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [drills, setDrills] = useState<DrillResult[]>([]);
  useEffect(() => {
    if (user) {
      getMyResults(user.id).then(setResults);
      getMyDrills(user.id).then(setDrills);
    }
  }, [user]);

  const gap = analyzeSkillGap(results);
  // Per day+slot: keep best score for display
  const byDaySlot: Record<string, QuizResult> = {};
  results.forEach(r => {
    const k = `${r.day}-${r.sessionSlot || 'Full'}`;
    if (!byDaySlot[k] || r.percentage > byDaySlot[k].percentage) byDaySlot[k] = r;
  });
  // Legacy byDay for bootcamp card
  const byDay: Record<string, QuizResult> = {};
  results.forEach(r => { const k = String(r.day); if (!byDay[k] || r.percentage > byDay[k].percentage) byDay[k] = r; });

  const passedDrills = drills.filter(d => d.passed);
  const drillAvg = passedDrills.length ? Math.round(passedDrills.reduce((s, d) => s + d.percentage, 0) / passedDrills.length) : 0;
  const badges = evaluateBadges(results);
  // Comprehensive score: Quiz 55% + Drills 35% + Badges 10%
  const quizSessionAvg = sessionQuizAvg(results);
  const consolidated = comprehensiveScore(quizSessionAvg, drillAvg, passedDrills.length, badges.length);
  // Concept coverage by track
  const { track, coverage } = conceptCoverage(results, user?.year || '3rd');

  const download = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const badgeLabel = badgeFromScore(consolidated);
    const conceptRows = coverage.map((c: any) =>
      `<tr><td>${c.label}</td><td style="text-align:center">${c.weight}%</td>
       <td style="text-align:center;color:${c.score !== null && c.score >= 75 ? '#059669' : c.score !== null && c.score >= 55 ? '#d97706' : '#dc2626'}">
       <b>${c.score !== null ? c.score + '%' : 'Not taken'}</b></td></tr>`
    ).join('');
    // Build session-wise rows for PDF
    const sessionRows = (() => {
      const rows: string[] = [];
      for (let d = 1; d <= 5; d++) {
        const m = byDaySlot[`${d}-Morning`];
        const a = byDaySlot[`${d}-Afternoon`];
        if (m) rows.push(`<tr><td>Day ${d} ☀ Morning</td><td style="text-align:center">${m.percentage}%</td><td style="text-align:center">${m.score}/${m.total}</td></tr>`);
        if (a) rows.push(`<tr><td>Day ${d} 🌙 Afternoon</td><td style="text-align:center">${a.percentage}%</td><td style="text-align:center">${a.score}/${a.total}</td></tr>`);
      }
      const bc = byDaySlot['all-Full'];
      if (bc) rows.push(`<tr><td>Full Bootcamp</td><td style="text-align:center">${bc.percentage}%</td><td style="text-align:center">${bc.score}/${bc.total}</td></tr>`);
      return rows.join('');
    })();
    const dayRows = sessionRows; // alias used below
    const recRows = recommendFor(consolidated, gap.gaps).map((r: string) => `<li>${r}</li>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Performance Report — ${user?.name}</title>
<style>
  body{font-family:Calibri,Arial;padding:30px;color:#1e293b;max-width:800px;margin:0 auto;}
  h1{color:#4f46e5;font-size:22px;margin-bottom:4px;}
  h2{color:#1e293b;font-size:15px;margin:20px 0 6px;}
  .meta{color:#64748b;font-size:13px;margin-bottom:6px;}
  .scores{display:flex;gap:12px;margin:14px 0;flex-wrap:wrap;}
  .score-card{background:#f1f5f9;border-radius:8px;padding:12px 18px;text-align:center;min-width:110px;}
  .score-card .val{font-size:26px;font-weight:800;color:#4f46e5;}
  .score-card .lbl{font-size:10px;color:#64748b;margin-top:2px;}
  .highlight{background:#4f46e5;}.highlight .val{color:white;}.highlight .lbl{color:#c7d2fe;}
  table{border-collapse:collapse;width:100%;margin:8px 0;font-size:13px;}
  th{background:#4f46e5;color:white;padding:7px 10px;text-align:left;}
  td{border:1px solid #e2e8f0;padding:6px 10px;}
  tr:nth-child(even){background:#f8fafc;}
  ul{padding-left:18px;}li{margin:4px 0;font-size:13px;}
  .badge{display:inline-block;background:#fef3c7;color:#d97706;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;margin-left:8px;}
  .footer{color:#94a3b8;font-size:11px;margin-top:28px;border-top:1px solid #e2e8f0;padding-top:12px;}
  @media print{@page{size:A4;margin:18mm}}
</style></head><body>
<h1>Individual Performance Report <span class="badge">${badgeLabel}</span></h1>
<p class="meta"><b>${user?.name}</b> · ${user?.branch || ''} ${user?.year || ''} Year · ${user?.college || ''}</p>
<p class="meta">Track: <b>${track}</b> &nbsp;|&nbsp; Date: ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>

<div class="scores">
  <div class="score-card"><div class="val">${gap.avg}%</div><div class="lbl">Quiz Avg (55%)</div></div>
  <div class="score-card"><div class="val">${drillAvg}%</div><div class="lbl">Drill Avg (35%)</div></div>
  <div class="score-card"><div class="val">${badges.length}/5</div><div class="lbl">Badges (10%)</div></div>
  <div class="score-card highlight"><div class="val">${consolidated}%</div><div class="lbl">🏆 Final Score</div></div>
</div>

<h2>Session-wise Quiz Scores (Morning &amp; Afternoon)</h2>
<table><tr><th>Assessment</th><th style="text-align:center">Score</th><th style="text-align:center">Correct</th></tr>${dayRows}</table>

<h2>Concept Coverage — ${track}</h2>
<table><tr><th>Concept Area</th><th style="text-align:center">Track Weight</th><th style="text-align:center">Your Score</th></tr>${conceptRows}</table>

<h2>Strengths</h2>
<ul>${gap.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>

<h2>Focus Areas</h2>
<ul>${gap.gaps.length ? gap.gaps.map((g: string) => `<li>${g}</li>`).join('') : '<li>Well-rounded — no major gaps detected.</li>'}</ul>

<h2>Personalised Recommendations</h2>
<ul>${recRows}</ul>

<div class="footer">
  iPEC Solutions Pvt. Ltd. &nbsp;·&nbsp; www.ipecsolutions.com &nbsp;·&nbsp; +91 6366373030<br/>
  Free for students · Generated ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})} · Print to PDF from your browser.
</div>
</body></html>`);
    w.document.close(); w.print();
  };

  if (results.length === 0) return (
    <div className="text-center text-slate-500 py-16">No results yet. Take a quiz to build your report.</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-800">My Performance Report</h1>
        <button onClick={download} className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg">Download PDF</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card label="Session quiz avg (55%)" value={quizSessionAvg + '%'} />
        <Card label="Drills passed" value={`${passedDrills.length}/10`} />
        <Card label="Drill average (35%)" value={drillAvg + '%'} />
        <Card label="Milestone badges (10%)" value={badges.length + '/5'} />
        <Card label="🏆 Final score" value={consolidated + '%'} highlight />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-3">Session-wise Scores</h2>
        <div className="space-y-3">
          {[1,2,3,4,5].map(day => {
            const morning = byDaySlot[`${day}-Morning`];
            const afternoon = byDaySlot[`${day}-Afternoon`];
            if (!morning && !afternoon) return null;
            return (
              <div key={day}>
                <p className="text-xs font-bold text-slate-400 mb-1.5">Day {day}</p>
                <div className="space-y-1.5 pl-2">
                  {morning && (
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-amber-600 font-bold w-28 shrink-0">☀ Morning</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full">
                        <div className={`h-2.5 rounded-full ${morning.percentage>=75?'bg-emerald-500':morning.percentage>=55?'bg-amber-400':'bg-red-400'}`} style={{width:morning.percentage+'%'}} />
                      </div>
                      <span className="text-sm font-bold text-slate-600 w-12 text-right">{morning.percentage}%</span>
                    </div>
                  )}
                  {afternoon && (
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-indigo-600 font-bold w-28 shrink-0">🌙 Afternoon</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full">
                        <div className={`h-2.5 rounded-full ${afternoon.percentage>=75?'bg-emerald-500':afternoon.percentage>=55?'bg-amber-400':'bg-red-400'}`} style={{width:afternoon.percentage+'%'}} />
                      </div>
                      <span className="text-sm font-bold text-slate-600 w-12 text-right">{afternoon.percentage}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {byDaySlot['all-Full'] && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5">Full Bootcamp</p>
              <div className="flex items-center gap-3 pl-2">
                <span className="text-[11px] text-slate-600 font-bold w-28 shrink-0">🏋 Bootcamp</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full">
                  <div className="h-2.5 rounded-full bg-indigo-500" style={{width:byDaySlot['all-Full'].percentage+'%'}} />
                </div>
                <span className="text-sm font-bold text-slate-600 w-12 text-right">{byDaySlot['all-Full'].percentage}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-emerald-700 mb-2">Strengths</h2>
          <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">{gap.strengths.map(s => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-red-700 mb-2">Focus areas</h2>
          {gap.gaps.length ? <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">{gap.gaps.map(g => <li key={g}>{g}</li>)}</ul>
            : <p className="text-sm text-slate-500">Well rounded — no major gaps detected.</p>}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800">📊 Concept Coverage — {track}</h2>
          <span className="text-xs text-slate-400">score per concept area</span>
        </div>
        <div className="space-y-3">
          {coverage.map((c, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700 font-medium">{c.label}</span>
                <span className="text-xs text-slate-400">{c.weight}% of track · {c.score !== null ? <strong className="text-slate-700">{c.score}%</strong> : <span className="text-slate-400">not taken</span>}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-2.5 rounded-full ${c.score !== null && c.score >= 75 ? 'bg-emerald-500' : c.score !== null && c.score >= 55 ? 'bg-amber-400' : c.score !== null ? 'bg-red-400' : 'bg-slate-200'}`}
                  style={{ width: `${c.score ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Green ≥75% · Amber ≥55% · Red below 55%</p>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <h2 className="font-bold text-brand mb-2">📌 Your personalised recommendations</h2>
        <ul className="space-y-1.5 text-sm text-slate-700 list-disc list-inside">
          {recommendFor(gap.avg, gap.gaps).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200'}`}>
      <div className={`text-2xl font-extrabold ${highlight ? 'text-white' : 'text-slate-800'}`}>{value}</div>
      <div className={`text-xs mt-1 ${highlight ? 'text-indigo-100' : 'text-slate-500'}`}>{label}</div>
    </div>
  );
}