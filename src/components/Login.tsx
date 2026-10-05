import React, { useState, useEffect } from 'react';
import { signUp, signIn, getBatches } from '../lib/db';
import { validateMobile } from '../lib/logic';
import { useAuth } from '../lib/auth';
import { Role, Batch } from '../types';
import { HAS_SUPABASE } from '../lib/supabase';

export default function Login() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<Role>('participant');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('3rd');
  const [college, setCollege] = useState('');
  const [batchId, setBatchId] = useState('batch-1');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { getBatches().then(setBatches); }, []);

  const doSignup = async () => {
    if (!name || !email || !password) { setMsg('Please enter your name, email and a password.'); return; }
    if (password.length < 6) { setMsg('Password must be at least 6 characters.'); return; }
    const mob = validateMobile(mobile);
    if (!mob.ok) { setMsg(mob.msg); return; }
    setBusy(true); setMsg('');
    const r = await signUp(email, password, { name, role: 'participant', mobile, branch, year, college, batchId });
    setBusy(false);
    if (r.ok && r.user) { setUser(r.user); return; }
    setMsg(r.msg);
    // If confirmation is required, nudge them to sign in after confirming.
    if (r.msg.toLowerCase().includes('confirm')) setMode('signin');
  };

  const doSignin = async () => {
    if (!email || !password) { setMsg('Please enter your email and password.'); return; }
    setBusy(true); setMsg('');
    const r = await signIn(email, password);
    setBusy(false);
    if (r.ok && r.user) { setUser(r.user); return; }
    setMsg(r.msg);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8 fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-brand font-extrabold text-xl">iPEC Employability Edge</div>
          <p className="text-slate-500 text-sm mt-1">Soft Skill Training & Assessment Platform</p>
          <p className="text-emerald-600 text-xs mt-1 font-semibold">100% Free for Students · No Camera · No Fees</p>
        </div>

        {!HAS_SUPABASE && (
          <div className="mb-4 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5">
            Demo mode (browser storage). Add Supabase keys to enable real multi-user accounts.
          </div>
        )}

        {/* mode toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setMode('signup'); setMsg(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold border ${mode === 'signup' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200'}`}>
            Register
          </button>
          <button onClick={() => { setMode('signin'); setMsg(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold border ${mode === 'signin' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200'}`}>
            Sign In
          </button>
        </div>

        {mode === 'signup' && (
          <div className="space-y-3">
            <div className="text-xs bg-indigo-50 border border-indigo-100 text-brand rounded-lg p-2.5 text-center font-semibold">
              Participant registration. Trainers & Admin: use the Sign In tab with the credentials provided to you.
            </div>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} />
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Mobile number (10 digits, required)" value={mobile} onChange={e => setMobile(e.target.value)} />
            {true && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Branch (e.g. CSE)" value={branch} onChange={e => setBranch(e.target.value)} />
                  <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={year} onChange={e => setYear(e.target.value)}>
                    {['1st', '2nd', '3rd', '4th'].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="College" value={college} onChange={e => setCollege(e.target.value)} />
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={batchId} onChange={e => setBatchId(e.target.value)}>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <button disabled={busy} onClick={doSignup} className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </div>
        )}

        {mode === 'signin' && (
          <div className="space-y-3">
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button disabled={busy} onClick={doSignin} className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        )}

        {msg && <p className="text-center text-xs mt-3 text-slate-600">{msg}</p>}
      </div>
    </div>
  );
}
