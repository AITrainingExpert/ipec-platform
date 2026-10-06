import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  getBatches, getAllowedEmails, addAllowedEmails, removeAllowedEmail,
  setParticipantBlocked, parseQuestionCsv, addUploadedQuestions, getFeedback,
} from '../lib/db';
import { Batch, AllowedEmail, Track } from '../types';
import TrainerFeedbackReport from '../components/TrainerFeedbackReport';
import ErrorBoundary from '../components/ErrorBoundary';
import { cachedBatches, trackOfBatch } from '../lib/tracks';
import { sessionTopics, TRACK_LABEL } from '../lib/bank';

export default function Enrollment() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';
  const canEnroll = isAdmin || isTrainer;            // trainers can now enroll too
  const [tab, setTab] = useState<'emails' | 'questions' | 'feedback'>('questions');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('batch-1');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    getBatches().then(b => { setBatches(b); setPageLoading(false); });
  }, []);

  // Set defaults once user is known
  useEffect(() => {
    if (user) {
      if (user.batchId) setBatchId(user.batchId);
      setTab((user.role === 'admin' || user.role === 'trainer') ? 'emails' : 'questions');
    }
  }, [user]);

  if (pageLoading || authLoading) return (
    <div className="text-center py-16 text-slate-400">
      <div className="text-2xl mb-2">⏳</div>
      <p>Loading enrollment panel...</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Enrollment & Content</h1>
        <p className="text-sm text-slate-500">Manage who can join, upload questions, and export feedback.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {canEnroll && <TabBtn on={tab === 'emails'} onClick={() => setTab('emails')}>Enroll Students</TabBtn>}
        <TabBtn on={tab === 'questions'} onClick={() => setTab('questions')}>Upload Questions</TabBtn>
        <TabBtn on={tab === 'feedback'} onClick={() => setTab('feedback')}>Trainer Feedback</TabBtn>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-600">Batch:</span>
        <select value={batchId} onChange={e => setBatchId(e.target.value)} disabled={!isAdmin}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500">
          {(isAdmin ? batches : batches.filter(b => b.id === user?.batchId)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {!isAdmin && <span className="text-xs text-slate-400">You manage your own batch.</span>}
      </div>

      {tab === 'emails' && canEnroll && <Emails batchId={batchId} addedBy={user!.name} />}
      {tab === 'questions' && <Questions batchId={batchId} />}
      {tab === 'feedback' && <ErrorBoundary resetKey={tab}><TrainerFeedbackReport batchId={batchId} isAdmin={isAdmin} /></ErrorBoundary>}
    </div>
  );
}

function TabBtn({ on, onClick, children }: any) {
  return <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-bold ${on ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{children}</button>;
}

function Emails({ batchId, addedBy }: { batchId: string; addedBy: string }) {
  const [text, setText] = useState('');
  const [list, setList] = useState<AllowedEmail[]>([]);
  const [msg, setMsg] = useState('');
  const load = () => { getAllowedEmails(batchId).then(setList); };
  useEffect(() => { load(); }, [batchId]);

  const upload = async () => {
    const emails = text.split(/[\s,;\n]+/).map(e => e.trim()).filter(e => e.includes('@'));
    const n = await addAllowedEmails(emails, batchId, addedBy);
    setMsg(`${n} email(s) enrolled.`); setText(''); load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-bold text-slate-800">Bulk-enroll participant emails</h2>
        <p className="text-xs text-slate-500">Paste emails (one per line, or comma/space separated). Only enrolled emails can register.</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={8} className="w-full border border-slate-200 rounded-lg p-3 text-sm" placeholder={'student1@college.edu\nstudent2@college.edu\n…'} />
        <button onClick={upload} className="w-full bg-brand text-white font-bold py-2.5 rounded-lg">Enroll these emails</button>
        {msg && <p className="text-center text-xs text-emerald-600">{msg}</p>}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-1">Enrolled ({list.length})</h2>
        <p className="text-[11px] text-slate-400 mb-2">Block suspends login but keeps all data. Remove deletes the enrollment record.</p>
        <div className="max-h-80 overflow-y-auto space-y-1">
          {list.length === 0 && <p className="text-sm text-slate-400">No emails enrolled yet for this batch.</p>}
          {list.map((a: any) => (
            <div key={a.email} className={`flex items-center justify-between text-sm border rounded px-2 py-1 ${a.isBlocked || a.is_blocked ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
              <div>
                <span className={`text-slate-600 ${a.isBlocked || a.is_blocked ? 'line-through text-slate-400' : ''}`}>{a.email}</span>
                {(a.isBlocked || a.is_blocked) && <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">BLOCKED</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setParticipantBlocked(a.email, !(a.isBlocked || a.is_blocked)).then(load)}
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${a.isBlocked || a.is_blocked ? 'text-emerald-600 border border-emerald-200 hover:bg-emerald-50' : 'text-amber-600 border border-amber-200 hover:bg-amber-50'}`}>
                  {a.isBlocked || a.is_blocked ? 'Unblock' : 'Block'}
                </button>
                <button onClick={() => removeAllowedEmail(a.email).then(load)} className="text-xs text-red-400 hover:text-red-600">remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Questions({ batchId }: { batchId: string }) {
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [track, setTrack] = useState<Track>('senior');
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState<'Morning' | 'Afternoon'>('Morning');
  const [busy, setBusy] = useState(false);

  // Default the track to the selected batch's track
  useEffect(() => { cachedBatches().then(bs => setTrack(trackOfBatch(bs.find(b => b.id === batchId)))); }, [batchId]);

  const template = [
    'track,day,session,topic,level,question,optionA,optionB,optionC,optionD,answer',
    'senior,2,Morning,Quant Basics,I,"A shirt marked Rs 800 is sold at 15% discount. Selling price?",Rs 640,Rs 680,Rs 700,Rs 720,B',
    'junior,4,Morning,Logical Reasoning Playground,B,"Find the next number: 3, 6, 12, 24, ?",30,36,48,42,C',
  ].join('\n');

  const upload = async () => {
    const { questions, skipped } = parseQuestionCsv(csv, { track, slot });
    // rows in the old 9-column format take the day from the CSV; new rows carry everything
    setSkipped(skipped);
    if (questions.length === 0) { setMsg({ ok: false, text: 'No valid rows found. Check the format matches the template.' }); return; }
    setBusy(true);
    const r = await addUploadedQuestions(questions);
    setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? `${r.count} question(s) added. They join only their own track / day / session pool and shuffle with the syllabus questions.` : r.msg });
    if (r.ok) setCsv('');
  };

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'question_template.csv'; a.click();
  };

  const topics = sessionTopics(track, day, slot);
  const sel = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold text-slate-800">Add syllabus questions</h2>
        <button onClick={downloadTemplate} className="text-sm font-semibold text-brand border border-indigo-200 rounded-lg px-3 py-1.5">Download CSV template</button>
      </div>
      <p className="text-xs text-slate-500">
        Columns: <code>track, day, session, topic, level (B/I/A), question, optionA–D, answer (A/B/C/D)</code>.
        Every question must belong to a track, a day (1–5) and a session (Morning/Afternoon) — it is only ever asked in that session's quiz
        and in the Full Bootcamp. Rows in the old 9-column format use the track and session chosen below.
      </p>
      <div className="flex flex-wrap gap-2 items-center bg-slate-50 rounded-lg p-3">
        <span className="text-xs font-semibold text-slate-500">Syllabus topics for:</span>
        <select className={sel} value={track} onChange={e => setTrack(e.target.value as Track)}>
          <option value="junior">{TRACK_LABEL.junior}</option><option value="senior">{TRACK_LABEL.senior}</option>
        </select>
        <select className={sel} value={day} onChange={e => setDay(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>Day {d}</option>)}
        </select>
        <select className={sel} value={slot} onChange={e => setSlot(e.target.value as any)}>
          <option>Morning</option><option>Afternoon</option>
        </select>
        <div className="w-full flex flex-wrap gap-1 mt-1">
          {topics.map(t => <span key={t} className="text-[11px] bg-white border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{t}</span>)}
        </div>
      </div>
      <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={10} className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono" placeholder={template} />
      <button onClick={upload} disabled={busy || !csv.trim()} className="w-full bg-brand text-white font-bold py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Uploading…' : 'Add questions to the syllabus bank'}</button>
      {msg && <p className={`text-center text-xs ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
      {skipped.length > 0 && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 max-h-32 overflow-y-auto">
          <p className="font-bold mb-1">{skipped.length} row(s) skipped:</p>
          {skipped.slice(0, 30).map(x => <div key={x}>{x}</div>)}
        </div>
      )}
    </div>
  );
}
