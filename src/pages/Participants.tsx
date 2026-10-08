import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getUsers, getBatches, getAllowedEmails, updateParticipantProfile } from '../lib/db';
import { trackOfBatch, cachedBatches } from '../lib/tracks';
import { validateMobile } from '../lib/logic';
import { Batch, Track, User } from '../types';

// ============================================================
// PARTICIPANTS — registration data for every student.
// Admin: all batches, download CSV, edit wrong entries.
// Trainer: own batch, view only (no download).
// ============================================================

const csvCell = (v: any) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export default function Participants() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [users, setUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [fTrack, setFTrack] = useState<'all' | Track>('all');
  const [fBatch, setFBatch] = useState<string>('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([getUsers(), getBatches(), getAllowedEmails()])
      .then(([u, b, a]) => {
        setUsers(u || []); setBatches(b || []);
        setBlocked(new Set((a || []).filter((x: any) => x.isBlocked || x.is_blocked).map(x => x.email)));
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const batchById = useMemo(() => Object.fromEntries(batches.map(b => [b.id, b])), [batches]);
  const people = users
    .filter(u => u.role === 'participant')
    .filter(u => isAdmin || u.batchId === user?.batchId)
    .map(u => {
      const b = batchById[u.batchId || ''];
      return { ...u, batchName: b?.name || u.batchId || '—', track: trackOfBatch(b, u.year) as Track };
    })
    .filter(u => (fTrack === 'all' || u.track === fTrack) && (fBatch === 'all' || u.batchId === fBatch))
    .filter(u => {
      const s = q.trim().toLowerCase();
      return !s || [u.name, u.email, u.mobile, u.branch, u.college].some(v => String(v || '').toLowerCase().includes(s));
    })
    .sort((a, b) => String(a.batchName).localeCompare(String(b.batchName), undefined, { numeric: true }) || String(a.name || '').localeCompare(String(b.name || '')));

  const download = () => {
    if (!isAdmin) return;
    const header = ['S.No', 'Name', 'Email', 'Mobile', 'Branch', 'Year', 'College', 'Batch', 'Track', 'Status', 'Registered on'];
    const rows = people.map((u, i) => [i + 1, u.name, u.email, u.mobile, u.branch, u.year, u.college, u.batchName,
      u.track === 'junior' ? 'Junior Champions' : 'Senior Champions', blocked.has(String(u.email || '').toLowerCase()) ? 'Blocked' : 'Active', fmtDate(u.createdAt)]);
    // Mobile as text so Excel doesn't turn it into 9.88E+09
    const body = [header, ...rows].map((r, ri) => r.map((c, ci) => (ri > 0 && ci === 3 && c ? csvCell(`="${c}"`) : csvCell(c))).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const tag = fBatch !== 'all' ? (batchById[fBatch]?.name || fBatch) : fTrack !== 'all' ? fTrack : 'all';
    a.href = URL.createObjectURL(blob); a.download = `participants-${tag.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const sel = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white';

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Participants</h1>
          <p className="text-sm text-slate-500">Details students entered at registration.{isAdmin ? ' Click Edit to correct a wrong entry.' : ''}</p>
        </div>
        {isAdmin && <button onClick={download} disabled={!people.length} className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">⬇ Download CSV ({people.length})</button>}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {isAdmin && <>
          <select className={sel} value={fTrack} onChange={e => { setFTrack(e.target.value as any); setFBatch('all'); }}>
            <option value="all">All tracks</option><option value="junior">Junior Champions</option><option value="senior">Senior Champions</option>
          </select>
          <select className={sel} value={fBatch} onChange={e => setFBatch(e.target.value)}>
            <option value="all">All batches</option>
            {batches.filter(b => fTrack === 'all' || trackOfBatch(b) === fTrack).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </>}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, mobile, branch…" className={sel + ' flex-1 min-w-48'} />
        {msg && <span className="text-xs text-emerald-600">{msg}</span>}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">#</th><th className="text-left px-3">Name</th><th className="text-left px-3">Email</th>
              <th className="text-left px-3">Mobile</th><th className="text-left px-3">Branch</th><th className="text-left px-3">Year</th>
              <th className="text-left px-3">College</th><th className="text-left px-3">Batch</th><th className="text-left px-3">Registered</th>
              {isAdmin && <th className="px-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className="text-center text-slate-400 py-8">Loading…</td></tr>}
            {!loading && people.length === 0 && <tr><td colSpan={10} className="text-center text-slate-400 py-8">No participants match.</td></tr>}
            {people.map((u, i) => {
              const isBlocked = blocked.has(String(u.email || '').toLowerCase());
              return (
                <tr key={u.id} className={`border-t border-slate-100 ${isBlocked ? 'bg-red-50/50' : ''}`}>
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 font-semibold text-slate-700">{u.name || '—'}{isBlocked && <span className="ml-1 text-[10px] font-bold text-red-600">BLOCKED</span>}</td>
                  <td className="px-3 text-slate-500">{u.email}</td>
                  <td className="px-3">{u.mobile || <span className="text-amber-600 text-xs">missing</span>}</td>
                  <td className="px-3">{u.branch || '—'}</td>
                  <td className="px-3">{u.year || '—'}</td>
                  <td className="px-3 text-slate-500">{u.college || '—'}</td>
                  <td className="px-3 whitespace-nowrap">{u.batchName}</td>
                  <td className="px-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                  {isAdmin && <td className="px-3"><button onClick={() => setEditing(u)} className="text-xs font-semibold text-brand border border-indigo-200 rounded-md px-2 py-1 hover:bg-indigo-50">Edit</button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <EditDialog u={editing} batches={batches} onClose={() => setEditing(null)}
        onSaved={(m) => { setEditing(null); setMsg(m); cachedBatches(true); load(); }} />}
    </div>
  );
}

function EditDialog({ u, batches, onClose, onSaved }: { u: User; batches: Batch[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({ name: u.name || '', mobile: u.mobile || '', branch: u.branch || '', year: u.year || '', college: u.college || '', batchId: u.batchId || '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(s => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    if (!f.name.trim()) { setErr('Name is required.'); return; }
    if (f.mobile.trim()) { const m = validateMobile(f.mobile); if (!m.ok) { setErr(m.msg); return; } }
    setBusy(true); setErr('');
    const r = await updateParticipantProfile(u, f);
    setBusy(false);
    if (!r.ok) { setErr(r.msg); return; }
    onSaved(`Saved changes for ${f.name}. They see the update on their next login.`);
  };

  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1';
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="font-extrabold text-slate-800">Edit participant</h2>
        <p className="text-xs text-slate-500">{u.email} · email is the login ID and can't be changed here.</p>
        <label className="block text-xs font-bold text-slate-500">Full name<input className={inp} value={f.name} onChange={set('name')} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-500">Mobile<input className={inp} value={f.mobile} onChange={set('mobile')} /></label>
          <label className="block text-xs font-bold text-slate-500">Branch<input className={inp} value={f.branch} onChange={set('branch')} /></label>
          <label className="block text-xs font-bold text-slate-500">Year
            <select className={inp} value={f.year} onChange={set('year')}>
              <option value="">—</option>{['1st', '2nd', '3rd', '4th'].map(y => <option key={y}>{y}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500">Batch
            <select className={inp} value={f.batchId} onChange={set('batchId')}>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs font-bold text-slate-500">College<input className={inp} value={f.college} onChange={set('college')} /></label>
        {f.batchId !== (u.batchId || '') && (
          <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2">
            Moving to another batch changes which sessions and syllabus this student gets. Past scores stay with the old batch's reports.
          </p>
        )}
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}
