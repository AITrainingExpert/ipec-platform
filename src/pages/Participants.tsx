import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getUsers, getBatches, getAllowedEmails, adminUpdateStudent, adminDeleteStudent } from '../lib/db';
import { trackOfBatch, cachedBatches } from '../lib/tracks';
import { Batch, Track, User } from '../types';
import {
  BRANCHES, USN_EXAMPLE, branchCodeOf, branchLabel, checkEmail, checkMobile, checkUsn,
  cleanEmail, cleanMobile, cleanName, cleanUsn,
} from '../lib/registration';

// ============================================================
// PARTICIPANTS: registration data for every student.
// Admin: all batches, download CSV, correct wrong entries (incl. login
//        email and USN = password), find and remove duplicate accounts.
// Trainer: own batch, view only (no download).
// ============================================================

const csvCell = (v: any) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const normName = (s?: string) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const digits10 = (s?: string) => String(s || '').replace(/\D/g, '').slice(-10);

type Person = User & { batchName: string; track: Track; dupWhy: string[] };

export default function Participants() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [users, setUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [fTrack, setFTrack] = useState<'all' | Track>('all');
  const [fBatch, setFBatch] = useState<string>('all');
  const [onlyDups, setOnlyDups] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Person | null>(null);
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

  // Possible duplicates: same USN, same mobile, or same name in the same batch.
  const all: Person[] = useMemo(() => {
    const students = users.filter(u => u.role === 'participant').filter(u => isAdmin || u.batchId === user?.batchId);
    const count = (key: (u: User) => string) => {
      const m = new Map<string, number>();
      students.forEach(u => { const k = key(u); if (k) m.set(k, (m.get(k) || 0) + 1); });
      return (u: User) => { const k = key(u); return !!k && (m.get(k) || 0) > 1; };
    };
    const sameUsn = count(u => (u.usn || '').toUpperCase());
    const sameMobile = count(u => (digits10(u.mobile).length === 10 ? digits10(u.mobile) : ''));
    const sameName = count(u => (normName(u.name) ? `${u.batchId}|${normName(u.name)}` : ''));
    return students.map(u => {
      const b = batchById[u.batchId || ''];
      const dupWhy = [sameUsn(u) && 'same USN', sameMobile(u) && 'same mobile', sameName(u) && 'same name'].filter(Boolean) as string[];
      return { ...u, batchName: b?.name || u.batchId || '—', track: trackOfBatch(b, u.year) as Track, dupWhy };
    });
  }, [users, batchById, isAdmin, user?.batchId]);

  const dupCount = all.filter(p => p.dupWhy.length).length;
  const people = all
    .filter(u => (fTrack === 'all' || u.track === fTrack) && (fBatch === 'all' || u.batchId === fBatch))
    .filter(u => !onlyDups || u.dupWhy.length > 0)
    .filter(u => {
      const s = q.trim().toLowerCase();
      return !s || [u.name, u.email, u.usn, u.mobile, u.branch, u.college].some(v => String(v || '').toLowerCase().includes(s));
    })
    .sort((a, b) => onlyDups
      ? normName(a.name).localeCompare(normName(b.name)) || digits10(a.mobile).localeCompare(digits10(b.mobile))
      : String(a.batchName).localeCompare(String(b.batchName), undefined, { numeric: true }) || String(a.name || '').localeCompare(String(b.name || '')));

  const download = () => {
    if (!isAdmin) return;
    const header = ['S.No', 'Name', 'USN (password)', 'Email (username)', 'Mobile', 'Branch', 'Semester', 'Year', 'College', 'Batch', 'Track', 'Status', 'Possible duplicate', 'Registered on'];
    const rows = people.map((u, i) => [i + 1, u.name, u.usn, u.email, u.mobile, u.branch, u.semester, u.year, u.college, u.batchName,
      u.track === 'junior' ? 'Junior Champions' : 'Senior Champions', blocked.has(String(u.email || '').toLowerCase()) ? 'Blocked' : 'Active',
      u.dupWhy.join(', '), fmtDate(u.createdAt)]);
    // Mobile as text so Excel doesn't turn it into 9.88E+09
    const body = [header, ...rows].map((r, ri) => r.map((c, ci) => (ri > 0 && ci === 4 && c ? csvCell(`="${c}"`) : csvCell(c))).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const tag = onlyDups ? 'possible-duplicates' : fBatch !== 'all' ? (batchById[fBatch]?.name || fBatch) : fTrack !== 'all' ? fTrack : 'all';
    a.href = URL.createObjectURL(blob); a.download = `participants-${tag.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const sel = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white';

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Participants</h1>
          <p className="text-sm text-slate-500">
            Details students entered at registration. Login = college email · Password = USN.
            {isAdmin ? ' Click Edit to correct a wrong entry or reset a password.' : ''}
          </p>
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
        <button onClick={() => setOnlyDups(v => !v)}
          className={`text-sm font-semibold rounded-lg px-3 py-1.5 border ${onlyDups ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-300'}`}>
          ⚠ Possible duplicates ({dupCount})
        </button>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, USN, email, mobile…" className={sel + ' flex-1 min-w-48'} />
        {msg && <span className="text-xs text-emerald-600">{msg}</span>}
      </div>

      {onlyDups && (
        <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5">
          These accounts share a USN, a mobile number, or the same name in one batch. Usually one student registered twice.
          Open the wrong one and use <b>Delete duplicate</b>. An account that already has quiz or drill scores is kept; correct it with Edit instead.
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">#</th><th className="text-left px-3">Name</th><th className="text-left px-3">USN</th>
              <th className="text-left px-3">Email (login)</th><th className="text-left px-3">Mobile</th><th className="text-left px-3">Branch</th>
              <th className="text-left px-3">Sem</th><th className="text-left px-3">Batch</th><th className="text-left px-3">Registered</th>
              {isAdmin && <th className="px-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className="text-center text-slate-400 py-8">Loading…</td></tr>}
            {!loading && people.length === 0 && <tr><td colSpan={10} className="text-center text-slate-400 py-8">No participants match.</td></tr>}
            {people.map((u, i) => {
              const isBlocked = blocked.has(String(u.email || '').toLowerCase());
              return (
                <tr key={u.id} className={`border-t border-slate-100 ${isBlocked ? 'bg-red-50/50' : u.dupWhy.length ? 'bg-amber-50/60' : ''}`}>
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 font-semibold text-slate-700">
                    {u.name || '—'}
                    {isBlocked && <span className="ml-1 text-[10px] font-bold text-red-600">BLOCKED</span>}
                    {u.dupWhy.length > 0 && <span title={u.dupWhy.join(', ')} className="ml-1 text-[10px] font-bold text-amber-700">DUPLICATE? ({u.dupWhy.join(', ')})</span>}
                  </td>
                  <td className="px-3 font-mono text-xs">{u.usn || <span className="text-amber-600 font-sans">missing</span>}</td>
                  <td className="px-3 text-slate-500">{u.email}</td>
                  <td className="px-3">{u.mobile || <span className="text-amber-600 text-xs">missing</span>}</td>
                  <td className="px-3" title={u.branch}>{branchCodeOf(u.branch) || u.branch || '—'}</td>
                  <td className="px-3">{u.semester || u.year || '—'}</td>
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

function EditDialog({ u, batches, onClose, onSaved }: { u: Person; batches: Batch[]; onClose: () => void; onSaved: (m: string) => void }) {
  const oldBranchCode = branchCodeOf(u.branch);
  const [f, setF] = useState({
    name: u.name || '', email: u.email || '', usn: u.usn || '', mobile: u.mobile || '',
    branch: oldBranchCode || (u.branch ? '__old' : ''), semester: u.semester || '', batchId: u.batchId || '',
  });
  const [resetPw, setResetPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(s => ({ ...s, [k]: e.target.value }));

  const usn = cleanUsn(f.usn);
  const usnChanged = usn !== (u.usn || '');
  const emailChanged = cleanEmail(f.email) !== (u.email || '').toLowerCase();
  const pwWillChange = !!usn && (usnChanged || resetPw);

  const save = async () => {
    const name = cleanName(f.name);
    if (!name) { setErr('Name is required.'); return; }
    const eErr = checkEmail(f.email); if (eErr) { setErr(eErr); return; }
    if (usn) { const uErr = checkUsn(usn); if (uErr) { setErr(uErr); return; } }
    if (f.mobile.trim()) { const mErr = checkMobile(f.mobile); if (mErr) { setErr(mErr); return; } }
    if (resetPw && !usn) { setErr('Enter the USN first, then reset the password.'); return; }
    setBusy(true); setErr('');
    const r = await adminUpdateStudent(u.id, {
      name, email: cleanEmail(f.email), usn, mobile: f.mobile.trim() ? cleanMobile(f.mobile) : '',
      branch: f.branch === '__old' ? (u.branch || '') : branchLabel(f.branch),
      semester: f.semester, batchId: f.batchId, resetPassword: resetPw,
    });
    setBusy(false);
    if (!r.ok) { setErr(r.msg); return; }
    onSaved(`Saved ${name}.` + (r.passwordSet ? ` Login: ${cleanEmail(f.email)} / ${usn}` : ''));
  };

  const del = async () => {
    setBusy(true); setErr('');
    const r = await adminDeleteStudent(u.id);
    setBusy(false);
    if (!r.ok) { setErr(r.msg); setConfirmDelete(false); return; }
    onSaved(`Deleted the account ${u.email}.`);
  };

  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1';
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-extrabold text-slate-800">Edit student</h2>
          {u.dupWhy.length > 0 && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">POSSIBLE DUPLICATE: {u.dupWhy.join(', ')}</span>}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-0.5">
          <p className="font-bold text-slate-600">Login details</p>
          <p>Username: <b className="break-all">{cleanEmail(f.email) || '—'}</b></p>
          <p>Password: <b className="font-mono">{usn || '—'}</b> <span className="text-slate-400">(the USN{u.usn ? '' : ', once you add it and reset'})</span></p>
          {!u.usn && <p className="text-amber-700">This student registered before USN login. Add their USN and tick “Set password to USN” so they can sign in with it.</p>}
        </div>

        <label className="block text-xs font-bold text-slate-500">Full name<input className={inp} value={f.name} onChange={set('name')} onBlur={() => setF(s => ({ ...s, name: cleanName(s.name) }))} /></label>
        <label className="block text-xs font-bold text-slate-500">College email (username)
          <input className={inp} value={f.email} onChange={set('email')} autoCapitalize="none" />
        </label>
        {emailChanged && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2">The student will sign in with the new email from now on.</p>}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-500">USN (password)
            <input className={inp + ' font-mono uppercase'} value={f.usn} maxLength={10} placeholder={USN_EXAMPLE}
              onChange={e => setF(s => ({ ...s, usn: cleanUsn(e.target.value) }))} />
          </label>
          <label className="block text-xs font-bold text-slate-500">Mobile<input className={inp} value={f.mobile} inputMode="numeric" onChange={set('mobile')} /></label>
          <label className="block text-xs font-bold text-slate-500 col-span-2">Branch
            <select className={inp} value={f.branch} onChange={set('branch')}>
              <option value="">—</option>
              {f.branch === '__old' && <option value="__old">Keep as typed: “{u.branch}”</option>}
              {BRANCHES.map(b => <option key={b.code} value={b.code}>{b.code} – {b.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500">Semester
            <select className={inp} value={f.semester} onChange={set('semester')}>
              <option value="">{u.year ? `Not set (year stays ${u.year})` : 'Not set'}</option>
              {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500">Batch
            <select className={inp} value={f.batchId} onChange={set('batchId')}>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        </div>

        <label className={`flex items-start gap-2 text-sm rounded-lg p-2.5 border ${pwWillChange ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200'}`}>
          <input type="checkbox" className="mt-0.5" checked={usnChanged && !!usn ? true : resetPw} disabled={usnChanged && !!usn}
            onChange={e => setResetPw(e.target.checked)} />
          <span>
            <b>Set password to USN</b>
            <span className="block text-xs text-slate-500">
              {usnChanged && usn ? 'Happens automatically because the USN changed.' : 'Use when a student forgot their password or registered with a different one.'}
            </span>
          </span>
        </label>

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

        <div className="border-t border-slate-100 pt-3">
          {!confirmDelete
            ? <button onClick={() => setConfirmDelete(true)} disabled={busy} className="text-xs font-semibold text-red-600 hover:underline">Delete duplicate account…</button>
            : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs space-y-2">
                <p className="text-red-800">Delete <b>{u.email}</b>? Only do this for a duplicate. It is refused if the account has any quiz, drill or feedback record.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-slate-200 bg-white rounded-md py-1.5 font-semibold">Keep it</button>
                  <button onClick={del} disabled={busy} className="flex-1 bg-red-600 text-white rounded-md py-1.5 font-bold disabled:opacity-50">{busy ? 'Deleting…' : 'Yes, delete'}</button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
