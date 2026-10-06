import React, { useEffect, useState } from 'react';
import { getUsers, getBatches, addBatch, getQuestions, setBatchTrack } from '../lib/db';
import { User, Batch, Question, Track } from '../types';
import { HAS_SUPABASE } from '../lib/supabase';
import { trackOfBatch, cachedBatches } from '../lib/tracks';
import { TRACK_LABEL, drillsFor } from '../lib/bank';
import TrainerFeedbackReport from '../components/TrainerFeedbackReport';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bName, setBName] = useState(''); const [bCollege, setBCollege] = useState('');
  const [bTrack, setBTrack] = useState<Track>('senior');
  const [msg, setMsg] = useState('');

  const load = () => {
    getUsers().then(setUsers);
    getBatches().then(setBatches);
    getQuestions(true).then(setQuestions);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!bName) return;
    await addBatch(bName, bCollege, bTrack);
    setBName(''); setBCollege(''); cachedBatches(true); load();
  };

  const changeTrack = async (b: Batch, t: Track) => {
    const r = await setBatchTrack(b.id, t);
    setMsg(r.ok ? `${b.name} is now ${TRACK_LABEL[t]}.` : r.msg);
    cachedBatches(true); load();
  };

  const roleCount = (r: string) => users.filter(u => u.role === r).length;
  const count = (t: Track, d: number, s: string) => questions.filter(q => q.track === t && q.day === d && q.slot === s).length;
  const trainersOf = (id: string) => users.filter(u => u.role === 'trainer' && u.batchId === id).map(u => u.name).join(', ');
  const participantsOf = (id: string) => users.filter(u => u.role === 'participant' && u.batchId === id).length;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-slate-800">Admin Console</h1>

      {!HAS_SUPABASE && <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5">
        Demo mode (browser storage). In production (Supabase connected) this console manages real users and batches.
      </div>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPI label="Participants" value={roleCount('participant')} />
        <KPI label="Trainers" value={roleCount('trainer')} />
        <KPI label="Junior batches" value={batches.filter(b => trackOfBatch(b) === 'junior').length} />
        <KPI label="Senior batches" value={batches.filter(b => trackOfBatch(b) === 'senior').length} />
        <KPI label="Syllabus questions" value={questions.length} />
      </div>

      {/* Batches + track */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-800">Batches & tracks</h2>
          {msg && <span className="text-xs text-emerald-600">{msg}</span>}
        </div>
        <p className="text-xs text-slate-500 mb-3">The track decides which syllabus a batch's quizzes, drills and bootcamp use. All batches can run at the same time.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 border-b border-slate-100">
              <tr><th className="text-left py-2">Batch</th><th className="text-left">Track</th><th className="text-left">Trainer</th><th className="text-center">Participants</th><th className="text-left">College</th></tr>
            </thead>
            <tbody>
              {batches.map(b => {
                const t = trackOfBatch(b);
                return (
                  <tr key={b.id} className="border-b border-slate-50">
                    <td className="py-2 font-semibold">{b.name} <span className="text-[10px] text-slate-400 font-mono">{b.id}</span></td>
                    <td>
                      <select value={t} onChange={e => changeTrack(b, e.target.value as Track)}
                        className={`text-xs font-bold rounded-md px-2 py-1 border ${t === 'junior' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
                        <option value="junior">{TRACK_LABEL.junior}</option>
                        <option value="senior">{TRACK_LABEL.senior}</option>
                      </select>
                      {!b.track && <span className="ml-1 text-[10px] text-amber-600" title="Not saved yet — guessed from name/year">auto</span>}
                    </td>
                    <td className="text-slate-600 text-xs">{trainersOf(b.id) || <span className="text-slate-300">—</span>}</td>
                    <td className="text-center">{participantsOf(b.id)}</td>
                    <td className="text-slate-400 text-xs">{b.college}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <input value={bName} onChange={e => setBName(e.target.value)} placeholder="New batch name, e.g. Senior Batch 11" className="flex-1 min-w-40 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
          <input value={bCollege} onChange={e => setBCollege(e.target.value)} placeholder="College" className="flex-1 min-w-32 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
          <select value={bTrack} onChange={e => setBTrack(e.target.value as Track)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="junior">{TRACK_LABEL.junior}</option><option value="senior">{TRACK_LABEL.senior}</option>
          </select>
          <button onClick={create} className="bg-brand text-white text-sm font-semibold px-4 rounded-lg">Add batch</button>
        </div>
      </div>

      {/* Question bank coverage */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-1">Syllabus question bank</h2>
        <p className="text-xs text-slate-500 mb-3">Quiz questions per session (each attempt draws 10, shuffled, unseen first). Every session also has its own 8-question drill.</p>
        <div className="grid md:grid-cols-2 gap-4">
          {(['junior', 'senior'] as Track[]).map(t => (
            <div key={t}>
              <h3 className="text-sm font-bold text-slate-700 mb-2">{TRACK_LABEL[t]}</h3>
              <table className="w-full text-xs">
                <thead className="text-slate-500"><tr><th className="text-left py-1">Day</th><th>☀ Morning</th><th>🌙 Afternoon</th><th className="text-left pl-2">Drills</th></tr></thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map(d => (
                    <tr key={d} className="border-t border-slate-100">
                      <td className="py-1.5 font-semibold">Day {d}</td>
                      <td className="text-center">{count(t, d, 'Morning')}</td>
                      <td className="text-center">{count(t, d, 'Afternoon')}</td>
                      <td className="pl-2 text-slate-500">{drillsFor(t).filter(x => x.day === d).map(x => x.badgeTitle).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Trainer feedback */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-3">Trainer Feedback</h2>
        <TrainerFeedbackReport isAdmin={true} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
        <h2 className="font-bold text-slate-800 mb-3">All users</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-slate-100"><tr><th className="text-left py-2">Name</th><th className="text-left">Email</th><th className="text-left">Role</th><th className="text-left">Batch</th><th className="text-left">Branch</th></tr></thead>
          <tbody>{users.map(u => <tr key={u.id} className="border-b border-slate-50"><td className="py-2 font-semibold">{u.name}</td><td className="text-slate-500">{u.email}</td><td className="capitalize">{u.role}</td><td className="text-slate-500">{batches.find(b => b.id === u.batchId)?.name || u.batchId || '—'}</td><td className="text-slate-500">{u.branch || '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: any }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-2xl font-extrabold text-brand">{value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}
