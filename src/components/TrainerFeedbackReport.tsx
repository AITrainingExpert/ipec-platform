import React, { useEffect, useMemo, useState } from 'react';
import { getFeedback, getUsers, getBatches } from '../lib/db';
import { trackOfBatch } from '../lib/tracks';
import { Batch, Feedback, Track, User } from '../types';

// ============================================================
// TRAINER FEEDBACK REPORT
// Admin: every batch, filter by track / batch / trainer / day,
// download a per-trainer summary and the full response sheet.
// Trainer: locked to their own batch.
// ============================================================

const RATINGS: { key: keyof Feedback; label: string }[] = [
  { key: 'ratingProgram', label: 'Programme' },
  { key: 'ratingTrainer', label: 'Trainer' },
  { key: 'ratingInteractivity', label: 'Interactivity' },
  { key: 'ratingEngagement', label: 'Engagement' },
  { key: 'ratingDifferent', label: 'Different' },
];

const csvCell = (v: any) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function downloadCsv(name: string, header: string[], rows: any[][]) {
  const body = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }); // BOM so Excel reads ₹/names correctly
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : 0);
const sessionLabel = (k: string) => { const [d, s] = (k || '').split('-'); return d && s ? `Day ${d} · ${s}` : k || '—'; };
const today = () => new Date().toISOString().slice(0, 10);

export default function TrainerFeedbackReport({ isAdmin, batchId }: { isAdmin: boolean; batchId?: string }) {
  const [fb, setFb] = useState<Feedback[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [fTrack, setFTrack] = useState<'all' | Track>('all');
  const [fBatch, setFBatch] = useState<string>('all');
  const [fTrainer, setFTrainer] = useState<string>('all');
  const [fDay, setFDay] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([getFeedback(isAdmin ? undefined : batchId), getUsers(), getBatches()])
      .then(([f, u, b]) => { setFb(f || []); setUsers(u || []); setBatches(b || []); })
      .catch(e => console.error('Feedback load failed', e))
      .finally(() => setLoading(false));
  }, [isAdmin, batchId]);

  const batchById = useMemo(() => Object.fromEntries(batches.map(b => [b.id, b])), [batches]);
  const trainersOf = useMemo(() => {
    const m: Record<string, string> = {};
    users.filter(u => u.role === 'trainer' && u.batchId).forEach(u => {
      const n = u.name || u.email || 'Trainer';
      m[u.batchId!] = m[u.batchId!] ? `${m[u.batchId!]}, ${n}` : n;
    });
    return m;
  }, [users]);

  // Enrich each response with batch, track and trainer
  const rows = useMemo(() => fb.map(f => {
    const b = batchById[f.batchId || ''];
    return {
      ...f,
      batchName: String(b?.name || f.batchId || '—'),
      userName: String(f.userName || '—'),
      comments: f.comments ? String(f.comments) : '',
      track: trackOfBatch(b) as Track,
      trainer: String(trainersOf[f.batchId || ''] || 'Unassigned'),
      day: (f.sessionKey || '').split('-')[0] || '',
    };
  }), [fb, batchById, trainersOf]);

  const trainerNames = Array.from(new Set(rows.map(r => r.trainer))).sort();
  const filtered = rows.filter(r =>
    (fTrack === 'all' || r.track === fTrack) &&
    (fBatch === 'all' || r.batchId === fBatch) &&
    (fTrainer === 'all' || r.trainer === fTrainer) &&
    (fDay === 'all' || r.day === fDay));

  // Per-trainer summary (one row per trainer + batch)
  const summary = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    filtered.forEach(r => { const k = `${r.trainer}||${r.batchId}`; (g[k] = g[k] || []).push(r); });
    return Object.entries(g).map(([k, list]) => {
      const [trainer, bId] = k.split('||');
      const per = RATINGS.map(R => avg(list.map(x => Number(x[R.key]) || 0).filter(Boolean)));
      return {
        trainer, batchName: list[0].batchName, track: list[0].track, responses: list.length,
        sessions: new Set(list.map(x => x.sessionKey)).size, per,
        overall: avg(per.filter(Boolean)), bId,
      };
    }).sort((a, b) => b.overall - a.overall || a.trainer.localeCompare(b.trainer));
  }, [filtered]);

  const exportSummary = () => downloadCsv(`trainer-feedback-summary-${today()}.csv`,
    ['Trainer', 'Batch', 'Track', 'Responses', 'Sessions rated', ...RATINGS.map(r => `${r.label} (avg /5)`), 'Overall (avg /5)'],
    summary.map(s => [s.trainer, s.batchName, s.track === 'junior' ? 'Junior Champions' : 'Senior Champions',
      s.responses, s.sessions, ...s.per, s.overall]));

  const exportDetail = () => downloadCsv(`trainer-feedback-responses-${today()}.csv`,
    ['Trainer', 'Batch', 'Track', 'Session', 'Participant', ...RATINGS.map(r => r.label), 'Comments', 'Submitted'],
    filtered.map(r => [r.trainer, r.batchName, r.track === 'junior' ? 'Junior Champions' : 'Senior Champions',
      sessionLabel(r.sessionKey), r.userName, ...RATINGS.map(R => r[R.key]), r.comments || '',
      r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '']));

  if (loading) return <div className="text-center py-10 text-slate-400 text-sm">Loading feedback…</div>;

  const totals = RATINGS.map(R => avg(filtered.map(x => Number(x[R.key]) || 0).filter(Boolean)));
  const sel = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white';

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex flex-wrap gap-2 items-center">
          <select className={sel} value={fTrack} onChange={e => { setFTrack(e.target.value as any); setFBatch('all'); }}>
            <option value="all">All tracks</option><option value="junior">Junior Champions</option><option value="senior">Senior Champions</option>
          </select>
          <select className={sel} value={fBatch} onChange={e => setFBatch(e.target.value)}>
            <option value="all">All batches</option>
            {batches.filter(b => fTrack === 'all' || trackOfBatch(b) === fTrack).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className={sel} value={fTrainer} onChange={e => setFTrainer(e.target.value)}>
            <option value="all">All trainers</option>
            {trainerNames.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={sel} value={fDay} onChange={e => setFDay(e.target.value)}>
            <option value="all">All days</option>
            {[1, 2, 3, 4, 5].map(d => <option key={d} value={String(d)}>Day {d}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {RATINGS.map((r, i) => (
          <div key={r.key} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <div className="text-xl font-extrabold text-brand">{filtered.length ? totals[i] : '–'}</div>
            <div className="text-[11px] text-slate-500">{r.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-500">{filtered.length} response(s) · {summary.length} trainer/batch group(s)</p>
        <div className="flex gap-2">
          <button onClick={exportSummary} disabled={!summary.length} className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">⬇ Trainer summary (CSV)</button>
          <button onClick={exportDetail} disabled={!filtered.length} className="border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">⬇ All responses (CSV)</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Trainer</th><th className="text-left px-3">Batch</th>
              <th className="px-2">Resp.</th>
              {RATINGS.map(r => <th key={r.key} className="px-2">{r.label}</th>)}
              <th className="px-2">Overall</th>
            </tr>
          </thead>
          <tbody>
            {summary.length === 0 && <tr><td colSpan={9} className="text-center text-slate-400 py-6">No feedback for this selection yet.</td></tr>}
            {summary.map(s => (
              <tr key={s.trainer + s.bId} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-700">{s.trainer}</td>
                <td className="px-3 text-slate-500">{s.batchName}</td>
                <td className="px-2 text-center">{s.responses}</td>
                {s.per.map((v, i) => <td key={i} className="px-2 text-center">{v || '–'}</td>)}
                <td className="px-2 text-center font-extrabold text-brand">{s.overall || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 max-h-80 overflow-y-auto">
        <h3 className="text-xs font-bold text-slate-500 mb-2">Comments</h3>
        {filtered.filter(f => f.comments).length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
        {filtered.filter(f => f.comments).map(f => (
          <div key={f.id} className="border-b border-slate-100 py-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span><span className="font-semibold text-slate-700">{f.userName}</span> · {f.batchName} · {f.trainer}</span>
              <span>{sessionLabel(f.sessionKey)}</span>
            </div>
            <p className="text-sm text-slate-600 mt-1">“{f.comments}”</p>
          </div>
        ))}
      </div>
    </div>
  );
}
