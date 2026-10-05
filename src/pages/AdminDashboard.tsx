import React, { useEffect, useState } from 'react';
import { getUsers, getBatches, addBatch, getQuestions } from '../lib/db';
import { User, Batch, Question } from '../types';
import { SECTION_NAMES } from '../lib/questions';
import { HAS_SUPABASE } from '../lib/supabase';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bName, setBName] = useState(''); const [bCollege, setBCollege] = useState('');

  const load = () => { getUsers().then(setUsers); getBatches().then(setBatches); getQuestions().then(setQuestions); };
  useEffect(load, []);

  const create = async () => { if (!bName) return; await addBatch(bName, bCollege); setBName(''); setBCollege(''); load(); };

  const roleCount = (r: string) => users.filter(u => u.role === r).length;
  const qBySection: Record<string, number> = {};
  questions.forEach(q => { qBySection[q.section] = (qBySection[q.section] || 0) + 1; });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-slate-800">Admin Console</h1>

      {!HAS_SUPABASE && <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5">
        Demo mode. In production (Supabase connected) this console manages real users, batches, and the full 500-question bank.
      </div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Total users" value={users.length} />
        <KPI label="Participants" value={roleCount('participant')} />
        <KPI label="Trainers" value={roleCount('trainer')} />
        <KPI label="Questions loaded" value={questions.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-800 mb-3">Batches</h2>
          <div className="space-y-2 mb-4">
            {batches.map(b => <div key={b.id} className="flex justify-between text-sm border border-slate-100 rounded-lg px-3 py-2"><span className="font-semibold">{b.name}</span><span className="text-slate-400 text-xs">{b.college}</span></div>)}
          </div>
          <div className="flex gap-2">
            <input value={bName} onChange={e => setBName(e.target.value)} placeholder="Batch name" className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
            <input value={bCollege} onChange={e => setBCollege(e.target.value)} placeholder="College" className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={create} className="bg-brand text-white text-sm font-semibold px-3 rounded-lg">Add</button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-800 mb-3">Question bank by section</h2>
          <div className="space-y-2">
            {Object.keys(SECTION_NAMES).map(s => (
              <div key={s} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 w-40">{SECTION_NAMES[s]}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full"><div className="h-2 bg-brand rounded-full" style={{ width: Math.min(100, (qBySection[s] || 0) * 20) + '%' }} /></div>
                <span className="text-xs font-bold w-6 text-right">{qBySection[s] || 0}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">Load the full 500 via the SQL seed (see README).</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-3">All users</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-slate-100"><tr><th className="text-left py-2">Name</th><th className="text-left">Email</th><th className="text-left">Role</th><th className="text-left">Branch</th></tr></thead>
          <tbody>{users.map(u => <tr key={u.id} className="border-b border-slate-50"><td className="py-2 font-semibold">{u.name}</td><td className="text-slate-500">{u.email}</td><td className="capitalize">{u.role}</td><td className="text-slate-500">{u.branch || '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: any }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-2xl font-extrabold text-brand">{value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}
