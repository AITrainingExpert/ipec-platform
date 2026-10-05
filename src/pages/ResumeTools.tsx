import React, { useState, useEffect } from 'react';
import { checkAts } from '../lib/logic';
import { AtsResult } from '../types';
import { useAuth } from '../lib/auth';
import { getSessionLocks } from '../lib/db';
import { Link } from 'react-router-dom';

export default function ResumeTools() {
  const { user } = useAuth();
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const isStaff = user?.role === 'trainer' || user?.role === 'admin';

  useEffect(() => {
    if (user?.batchId) getSessionLocks(user.batchId).then(setLocks);
  }, [user]);

  const anyActive = isStaff || Object.values(locks).some(v => v);

  // Resume Tools: show soft warning if no session active, but still show content
  // (participants need access to build resume at any time)
  const [tab, setTab] = useState<'ats' | 'builder'>('ats');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab('ats')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'ats' ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>ATS Score Checker</button>
        <button onClick={() => setTab('builder')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'builder' ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Resume Builder</button>
      </div>
      {tab === 'ats' ? <Ats /> : <Builder />}
    </div>
  );
}

function Ats() {
  const [text, setText] = useState('');
  const [jd, setJd] = useState('');
  const [res, setRes] = useState<AtsResult | null>(null);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-bold text-slate-800">Paste your resume text</h2>
        <p className="text-xs text-slate-500">Copy the text from your resume PDF and paste it here. (No upload or camera needed.)</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={10} className="w-full border border-slate-200 rounded-lg p-3 text-sm" placeholder="Paste full resume text…" />
        <input value={jd} onChange={e => setJd(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm" placeholder="Optional: paste target job description keywords" />
        <button onClick={() => setRes(checkAts(text, jd))} disabled={text.length < 40} className="w-full bg-brand text-white font-bold py-2.5 rounded-lg disabled:opacity-50">Check ATS Score</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        {!res ? <p className="text-slate-400 text-sm text-center py-16">Your ATS analysis will appear here.</p> : (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-5xl font-extrabold ${res.overall >= 75 ? 'text-emerald-600' : res.overall >= 55 ? 'text-amber-600' : 'text-red-500'}`}>{res.overall}</div>
              <div className="text-xs text-slate-500">Overall ATS score</div>
            </div>
            <Bar label="Keyword match" v={res.keywords} />
            <Bar label="Action verbs" v={res.actionVerbs} />
            <Bar label="Formatting" v={res.formatting} />
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">Detected skills</p>
              <div className="flex flex-wrap gap-1">{res.detectedSkills.map(s => <span key={s} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{s}</span>)}</div>
            </div>
            {res.missingKeywords.length > 0 && <div>
              <p className="text-xs font-bold text-slate-500 mb-1">Consider adding</p>
              <div className="flex flex-wrap gap-1">{res.missingKeywords.map(s => <span key={s} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{s}</span>)}</div>
            </div>}
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">Recommendations</p>
              <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">{res.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">{label}</span><span className="font-bold">{v}</span></div>
      <div className="h-2 bg-slate-100 rounded-full"><div className={`h-2 rounded-full ${v >= 75 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: v + '%' }} /></div>
    </div>
  );
}

function Builder() {
  const [f, setF] = useState({ name: '', title: '', email: '', phone: '', summary: '', skills: '', experience: '', education: '', projects: '' });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const download = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const bullets = (s: string) => s.split('\n').filter(Boolean).map(l => `<li>${l}</li>`).join('');
    w.document.write(`<html><head><title>${f.name} Resume</title>
      <style>body{font-family:Arial;max-width:760px;margin:auto;padding:30px;color:#1e293b;line-height:1.5}
      h1{margin:0;color:#111} .title{color:#4f46e5;font-weight:bold} .contact{color:#555;font-size:13px;margin:4px 0 14px}
      h2{border-bottom:2px solid #4f46e5;color:#4f46e5;font-size:15px;margin:16px 0 6px;padding-bottom:2px} ul{margin:4px 0}</style></head>
      <body><h1>${f.name}</h1><div class="title">${f.title}</div>
      <div class="contact">${f.email} · ${f.phone}</div>
      ${f.summary ? `<h2>Summary</h2><p>${f.summary}</p>` : ''}
      ${f.skills ? `<h2>Skills</h2><p>${f.skills}</p>` : ''}
      ${f.experience ? `<h2>Experience</h2><ul>${bullets(f.experience)}</ul>` : ''}
      ${f.projects ? `<h2>Projects</h2><ul>${bullets(f.projects)}</ul>` : ''}
      ${f.education ? `<h2>Education</h2><ul>${bullets(f.education)}</ul>` : ''}
      </body></html>`);
    w.document.close(); w.print();
  };

  const F = (k: string, label: string, area = false) => area
    ? <div><label className="text-xs font-bold text-slate-500">{label}</label><textarea rows={3} value={(f as any)[k]} onChange={e => set(k, e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm mt-1" placeholder="One item per line" /></div>
    : <div><label className="text-xs font-bold text-slate-500">{label}</label><input value={(f as any)[k]} onChange={e => set(k, e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm mt-1" /></div>;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-bold text-slate-800">Build an ATS-clean resume</h2>
        <div className="grid grid-cols-2 gap-3">{F('name', 'Full name')}{F('title', 'Target role')}{F('email', 'Email')}{F('phone', 'Phone')}</div>
        {F('summary', 'Summary', true)}
        {F('skills', 'Skills (comma separated)')}
        {F('experience', 'Experience', true)}
        {F('projects', 'Projects', true)}
        {F('education', 'Education', true)}
        <button onClick={download} disabled={!f.name} className="w-full bg-brand text-white font-bold py-2.5 rounded-lg disabled:opacity-50">Generate & Download (Print to PDF)</button>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-800 mb-2">{f.name || 'Your Name'}</h3>
        <p className="text-brand font-semibold text-sm">{f.title || 'Target Role'}</p>
        <p className="text-xs text-slate-500">{f.email} {f.phone && '· ' + f.phone}</p>
        {f.summary && <><p className="font-bold text-brand text-sm mt-3">Summary</p><p className="text-sm text-slate-600">{f.summary}</p></>}
        {f.skills && <><p className="font-bold text-brand text-sm mt-3">Skills</p><p className="text-sm text-slate-600">{f.skills}</p></>}
        {f.projects && <><p className="font-bold text-brand text-sm mt-3">Projects</p><ul className="text-sm text-slate-600 list-disc list-inside">{f.projects.split('\n').filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul></>}
      </div>
    </div>
  );
}
