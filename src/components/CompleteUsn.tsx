import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { completeMyUsn } from '../lib/db';
import { USN_EXAMPLE, USN_MAX, checkUsn, cleanUsn } from '../lib/registration';

// ============================================================
// ONE-TIME STEP for students who registered before USN login:
// they enter their USN once; it is saved on their profile and
// becomes their password. Shown until a USN is saved.
// ============================================================
export default function CompleteUsn() {
  const { user, setUser, logout } = useAuth();
  const [usn, setUsn] = useState('');
  const [usn2, setUsn2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ passwordSet: boolean } | null>(null);
  if (!user) return null;

  const u = cleanUsn(usn);
  const save = async () => {
    const e = checkUsn(u);
    if (e) { setErr(e); return; }
    if (cleanUsn(usn2) !== u) { setErr('The two USNs don\'t match. Type it again carefully.'); return; }
    setBusy(true); setErr('');
    const r = await completeMyUsn(user, u);
    setBusy(false);
    if (r.msg === 'NOT_READY') { setUser({ ...user }); return; }   // database not upgraded yet: let them in
    if (!r.ok) { setErr(r.msg); return; }
    setDone({ passwordSet: r.passwordSet });
  };

  const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm font-mono tracking-widest uppercase outline-none focus:ring-2 focus:ring-indigo-200 focus:border-brand';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 fade-in space-y-4">
        <div className="text-center">
          <div className="text-brand font-extrabold text-xl">iPEC Employability Edge</div>
          <p className="text-slate-500 text-sm mt-1">Hi {user.name?.split(' ')[0] || 'there'} 👋</p>
        </div>

        {!done ? (
          <>
            <div className="text-sm bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-lg p-3 leading-relaxed">
              <b>One more step.</b> Enter your <b>USN</b>. It goes on your certificate and reports,
              and from now on it is your <b>password</b>.
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">USN</label>
              <input className={inp} value={u} maxLength={USN_MAX} placeholder={USN_EXAMPLE} autoCapitalize="characters" spellCheck={false}
                onChange={e => setUsn(cleanUsn(e.target.value))} />
              <p className="text-[11px] text-slate-400 mt-1">Capital letters and numbers, e.g. {USN_EXAMPLE} or 01SU24AI001</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Type your USN again</label>
              <input className={inp} value={cleanUsn(usn2)} maxLength={USN_MAX} autoCapitalize="characters" spellCheck={false}
                onChange={e => setUsn2(cleanUsn(e.target.value))} onPaste={e => e.preventDefault()} />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button onClick={save} disabled={busy}
              className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Saving…' : 'Save USN'}
            </button>
            <button onClick={logout} className="w-full text-xs text-slate-400 hover:underline">Not you? Sign out</button>
          </>
        ) : (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm space-y-1">
              <p className="font-bold text-emerald-800">✓ USN saved</p>
              {done.passwordSet ? <>
                <p className="text-emerald-900">From now on, sign in with:</p>
                <p className="text-emerald-900">Username: <b className="break-all">{user.email}</b></p>
                <p className="text-emerald-900">Password: <b className="font-mono tracking-wider">{u}</b></p>
              </> : (
                <p className="text-amber-800">Your password could not be changed right now, so keep using your old password. Your trainer can switch it to your USN.</p>
              )}
            </div>
            <button onClick={() => setUser({ ...user, usn: u })}
              className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-lg text-sm">Continue</button>
          </>
        )}
      </div>
    </div>
  );
}
