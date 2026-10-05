import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  getBatches, getAllowedEmails, addAllowedEmails, removeAllowedEmail,
  setParticipantBlocked, parseQuestionCsv, addUploadedQuestions, getFeedback,
} from '../lib/db';
import { Batch, AllowedEmail, Feedback } from '../types';

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
        <TabBtn on={tab === 'feedback'} onClick={() => setTab('feedback')}>Feedback Export</TabBtn>
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
      {tab === 'feedback' && <FeedbackExport batchId={batchId} isAdmin={isAdmin} />}
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
  const load = () => getAllowedEmails(batchId).then(setList);
  useEffect(load, [batchId]);

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
  const [msg, setMsg] = useState('');
  const template = 'section,day,level,question,optionA,optionB,optionC,optionD,answer\nAPT,1,I,"If 3 pens cost 45, cost of 7 pens?","95","105","115","120",B\nRSN,1,I,"Find the odd one out","Square","Circle","Triangle","Cube",D';

  const upload = async () => {
    const qs = parseQuestionCsv(csv);
    if (qs.length === 0) { setMsg('No valid rows found. Check the format matches the template.'); return; }
    const n = await addUploadedQuestions(qs);
    setMsg(`${n} question(s) added. They now appear in quizzes (shuffled with the rest).`); setCsv('');
  };

  const downloadTemplate = () => {
    const blob = new Blob([template], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'question_template.csv'; a.click();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">Upload Aptitude / Reasoning questions</h2>
        <button onClick={downloadTemplate} className="text-sm font-semibold text-brand border border-indigo-200 rounded-lg px-3 py-1.5">Download CSV template</button>
      </div>
      <p className="text-xs text-slate-500">Columns: section, day, level (B/I/A), question, optionA–D, answer (A/B/C/D). Use section APT for Aptitude, RSN for Reasoning. Paste your filled CSV below.</p>
      <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={10} className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono" placeholder={template} />
      <button onClick={upload} className="w-full bg-brand text-white font-bold py-2.5 rounded-lg">Add questions to quiz bank</button>
      {msg && <p className="text-center text-xs text-emerald-600">{msg}</p>}
    </div>
  );
}

function FeedbackExport({ batchId, isAdmin }: { batchId: string; isAdmin: boolean }) {
  const [fb, setFb] = useState<Feedback[]>([]);
  useEffect(() => { getFeedback(isAdmin ? undefined : batchId).then(setFb); }, [batchId, isAdmin]);

  const avg = (k: keyof Feedback) => fb.length ? (fb.reduce((s, f) => s + (Number(f[k]) || 0), 0) / fb.length).toFixed(1) : '-';

  const exportCsv = () => {
    const head = 'Session,Name,Programme,Trainer,Interactivity,Engagement,Different,Comments,Date\n';
    const rows = fb.map(f => `${f.sessionKey},${f.userName},${f.ratingProgram},${f.ratingTrainer},${f.ratingInteractivity},${f.ratingEngagement},${f.ratingDifferent},"${(f.comments || '').replace(/"/g, '""')}",${f.createdAt}`).join('\n');
    const blob = new Blob([head + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'feedback.csv'; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Stat label="Programme" v={avg('ratingProgram')} />
        <Stat label="Trainer" v={avg('ratingTrainer')} />
        <Stat label="Interactivity" v={avg('ratingInteractivity')} />
        <Stat label="Engagement" v={avg('ratingEngagement')} />
        <Stat label="Different" v={avg('ratingDifferent')} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{fb.length} response(s) collected.</p>
        <button onClick={exportCsv} disabled={fb.length === 0} className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">Download Feedback CSV</button>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 max-h-96 overflow-y-auto">
        {fb.length === 0 && <p className="text-sm text-slate-400">No feedback yet.</p>}
        {fb.map(f => (
          <div key={f.id} className="border-b border-slate-100 py-2">
            <div className="flex justify-between text-xs text-slate-500"><span className="font-semibold text-slate-700">{f.userName}</span><span>{f.sessionKey}</span></div>
            {f.comments && <p className="text-sm text-slate-600 mt-1">“{f.comments}”</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: any }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-3 text-center"><div className="text-xl font-extrabold text-brand">{v}</div><div className="text-[11px] text-slate-500">{label}</div></div>;
}
