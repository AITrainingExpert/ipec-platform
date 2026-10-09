// ============================================================
// THE EMPLOYABILITY EDGE: Reports & Exports (trainer + admin)
//   - Batch progress, day-wise and session-wise
//   - Department-wise day averages with batch + trainer
//   - Student-wise day / session results
//   - Full attempt log
//   Download any of them as CSV or PDF.
//
// Who sees what:
//   admin   → every batch (or one batch)
//   trainer → locked to their own batch
//   student → no access (the route is staff-only)
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  REPORTS, Row, buildPDF, fileName, fmt, sortRows, toCSV,
} from '../lib/reportExport';

// Typed loosely on purpose: works with any Supabase client export.
const sb: any = supabase;

const PREVIEW_ROWS = 300;   // rows shown on screen (downloads include all)
const DAYS = ['1', '2', '3', '4', '5'];

interface Me { name: string; email: string; role: string; batchId: string | null; }
interface BatchOpt { batch_id: string; batch_no: string; batch_name: string; trainer_name: string | null; }
interface Filters { batch?: string; day?: string; session?: string; dept?: string; }

// Every report comes from ONE secure database function, rpt_fetch().
// The database checks the role and locks trainers to their own batch.
async function fetchReport<T = Row>(reportKey: string, f: Filters = {}): Promise<T[]> {
  const { data, error } = await sb.rpc('rpt_fetch', {
    p_report: reportKey,
    p_batch: f.batch || null,
    p_day: f.day ? Number(f.day) : null,
    p_session: f.session || null,
    p_dept: f.dept || null,
  });
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []) as T[];
}

function friendlyError(msg: string): string {
  if (/rpt_fetch|could not find the function|does not exist/i.test(msg))
    return 'Reports are not installed in the database yet. Run the latest reports-views.sql in Supabase once.';
  if (/NOT_ALLOWED/.test(msg)) return 'Reports are available to trainers and admins only.';
  if (/NO_BATCH/.test(msg)) return 'Your trainer account has no batch assigned. Ask the admin to set it.';
  if (/timeout/i.test(msg)) return 'The report took too long. Pick one batch or one day and try again.';
  return msg || 'Could not load the report.';
}

function download(content: Blob, name: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function Reports() {
  const [me, setMe] = useState<Me | null>(null);
  const [batches, setBatches] = useState<BatchOpt[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [reportId, setReportId] = useState(REPORTS[0].id);
  const [batch, setBatch] = useState('');
  const [day, setDay] = useState('');
  const [session, setSession] = useState('');
  const [dept, setDept] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const report = REPORTS.find(r => r.id === reportId)!;
  const isAdmin = me?.role === 'admin';
  const isTrainer = me?.role === 'trainer';

  // ---- who am I? ----
  useEffect(() => {
    (async () => {
      if (!sb) { setError('Reports need the live database (Supabase is not connected in this build).'); return; }
      const { data: auth } = await sb.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { setError('Please sign in again.'); return; }
      const { data: p, error: e } = await sb.from('profiles')
        .select('name,email,role,batch_id').eq('id', uid).single();
      if (e || !p) { setError('Could not read your profile.'); return; }
      const m: Me = { name: p.name || p.email, email: p.email, role: p.role, batchId: p.batch_id };
      setMe(m);
      if (m.role === 'trainer') setBatch(m.batchId || '');
    })();
  }, []);

  // ---- batch list ----
  useEffect(() => {
    if (!me || (!isAdmin && !isTrainer)) return;
    (async () => {
      try {
        const list = (await fetchReport<BatchOpt>('batches'))
          .sort((a, b) => Number(a.batch_no) - Number(b.batch_no) || a.batch_id.localeCompare(b.batch_id));
        setBatches(list);
      } catch (e: any) { setError(friendlyError(e?.message || '')); }
    })();
  }, [me, isAdmin, isTrainer]);

  // ---- department list (for the chosen batch), read straight from profiles ----
  useEffect(() => {
    if (!me || (!isAdmin && !isTrainer)) return;
    (async () => {
      try {
        const list = (await fetchReport<string>('departments', { batch })).map(String);
        setDepartments(list);
        setDept(d => (d && !list.includes(d) ? '' : d));
      } catch { setDepartments([]); }
    })();
  }, [me, batch, isAdmin, isTrainer]);

  // ---- load the report (latest request wins if filters change quickly) ----
  const reqId = useRef(0);
  const load = useCallback(async () => {
    if (!me || (!isAdmin && !isTrainer)) return;
    const id = ++reqId.current;
    setLoading(true); setError('');
    try {
      const data = await fetchReport(report.id, {
        batch: isTrainer ? undefined : batch,          // trainers: the database applies their batch
        day,
        session: report.sessionFilter ? session : '',
        dept: report.id === 'batch' ? '' : dept,
      });
      if (id === reqId.current) setRows(sortRows(data, report));
    } catch (e: any) {
      if (id === reqId.current) { setError(friendlyError(e?.message || '')); setRows([]); }
    } finally { if (id === reqId.current) setLoading(false); }
  }, [me, isAdmin, isTrainer, batch, day, session, dept, report]);

  useEffect(() => { load(); }, [load]);

  // A "Full Day" filter only exists in the batch report
  useEffect(() => { if (report.id !== 'batch' && session === 'Full Day') setSession(''); }, [report.id, session]);

  // ---- labels for file names and the PDF header ----
  const batchLabel = useMemo(() => {
    const b = batches.find(x => x.batch_id === (isTrainer ? me?.batchId : batch));
    return b ? `Batch ${b.batch_no}` : 'All batches';
  }, [batches, batch, isTrainer, me]);
  const filterText = [
    batchLabel,
    day ? `Day ${day}` : 'All days',
    report.sessionFilter ? (session || 'All sessions') : '',
    report.id !== 'batch' ? (dept || 'All departments') : '',
  ].filter(Boolean).join('  ·  ');
  const nameParts = [batchLabel.replace(/\s/g, ''), day ? `Day${day}` : '', session, dept.split(' (')[0]];

  // ---- summary chips ----
  const summary = useMemo(() => {
    const pctKey = ['avg_score_pct', 'overall_pct', 'percentage'].find(k => rows.some(r => r[k] !== null && r[k] !== undefined));
    const vals = pctKey ? rows.map(r => Number(r[pctKey])).filter(n => !Number.isNaN(n)) : [];
    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
    const students = new Set(rows.map(r => r.user_id).filter(Boolean)).size;
    return { avg, students };
  }, [rows]);

  const onCSV = () => download(
    new Blob([toCSV(rows, report.columns)], { type: 'text/csv;charset=utf-8' }),
    fileName(report, nameParts, 'csv'),
  );
  const onPDF = () => {
    const doc = buildPDF(rows, report.columns, { title: report.title, filters: filterText, generatedBy: me?.name || '' });
    doc.save(fileName(report, nameParts, 'pdf'));
  };

  if (me && !isAdmin && !isTrainer) {
    return <div className="p-6 text-slate-500">Reports are available to trainers and admins only.</div>;
  }

  const sel = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-100 disabled:text-slate-500';

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports &amp; Exports</h1>
          <p className="text-sm text-slate-500">
            {isTrainer ? `Showing your batch only (${batchLabel}).` : 'Pick a report, filter it, and download as CSV or PDF.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button onClick={onCSV} disabled={loading || !rows.length}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
            Download CSV
          </button>
          <button onClick={onPDF} disabled={loading || !rows.length}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
            Download PDF
          </button>
        </div>
      </div>

      {/* report tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORTS.map(r => (
          <button key={r.id} onClick={() => setReportId(r.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              r.id === reportId ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {r.title}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-sm text-slate-500">{report.blurb}</p>

      {/* filters */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-4">
        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Batch
          <select className={sel} value={isTrainer ? me?.batchId || '' : batch}
            disabled={isTrainer} onChange={e => setBatch(e.target.value)}>
            {isAdmin && <option value="">All batches</option>}
            {batches.map(b => (
              <option key={b.batch_id} value={b.batch_id}>
                Batch {b.batch_no}{b.trainer_name ? ` · ${b.trainer_name}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Day
          <select className={sel} value={day} onChange={e => setDay(e.target.value)}>
            <option value="">All days</option>
            {DAYS.map(d => <option key={d} value={d}>Day {d}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Session
          <select className={sel} value={session} disabled={!report.sessionFilter} onChange={e => setSession(e.target.value)}>
            <option value="">{report.sessionFilter ? 'All sessions' : 'Not split by session'}</option>
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            {report.id === 'batch' && <option value="Full Day">Full Day</option>}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Department
          <select className={sel} value={dept} disabled={report.id === 'batch'} onChange={e => setDept(e.target.value)}>
            <option value="">{report.id === 'batch' ? 'Whole batch' : 'All departments'}</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>

      {/* summary */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700"><b>{rows.length}</b> rows</span>
        {summary.students > 0 && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700"><b>{summary.students}</b> students</span>}
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">Average <b>{summary.avg}{summary.avg !== '–' ? '%' : ''}</b></span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">{filterText}</span>
      </div>

      {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      {/* preview table */}
      <div className="overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" style={{ maxHeight: '60vh' }}>
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-800 text-xs uppercase tracking-wide text-white">
            <tr>{report.columns.map(c => <th key={c.key} className="whitespace-nowrap px-3 py-2 font-semibold">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
              <tr key={i} className={`${i % 2 ? 'bg-slate-50' : 'bg-white'} ${r.session === 'Full Day' ? 'font-semibold' : ''}`}>
                {report.columns.map(c => (
                  <td key={c.key} className="whitespace-nowrap px-3 py-1.5 text-slate-700">{fmt(r[c.key])}</td>
                ))}
              </tr>
            ))}
            {!loading && !rows.length && !error && (
              <tr><td colSpan={report.columns.length} className="px-3 py-10 text-center text-slate-400">
                No results yet for these filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > PREVIEW_ROWS && (
        <p className="text-xs text-slate-500">Showing the first {PREVIEW_ROWS} of {rows.length} rows. Downloads include every row.</p>
      )}
    </div>
  );
}
