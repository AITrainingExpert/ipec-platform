import React, { useEffect, useMemo, useRef, useState } from 'react';
import { signUp, signIn, getBatches, checkRegistration } from '../lib/db';
import { useAuth } from '../lib/auth';
import { Batch } from '../types';
import { HAS_SUPABASE } from '../lib/supabase';
import { trackOfBatch } from '../lib/tracks';
import {
  BRANCHES, FIXED_SEMESTER, FIXED_YEAR, USN_EXAMPLE, USN_MAX, RegistrationCheck,
  branchFromUsn, branchLabel, checkEmail, checkMobile, checkName, checkUsn,
  cleanEmail, cleanMobile, cleanName, cleanUsn,
} from '../lib/registration';

// ============================================================
// LOGIN + STUDENT REGISTRATION
//   Username = college email · Password = USN (capitals + numbers)
//   Branch, Semester (fixed 5) and Senior Batch are picked, not typed.
//   Email / USN are checked live, and the student confirms everything
//   on a review screen before the account is created.
// ============================================================

type Mode = 'signup' | 'signin';
type Field = 'name' | 'email' | 'usn' | 'mobile' | 'branch' | 'batch';

const inputCls = (bad?: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-base sm:text-sm bg-white outline-none focus:ring-2 ${
    bad ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-200 focus:border-brand'}`;

export default function Login() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<Mode>('signup');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // registration fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [usn, setUsn] = useState('');
  const [mobile, setMobile] = useState('');
  const [branch, setBranch] = useState('');            // branch code, e.g. "CS"
  const [branchAuto, setBranchAuto] = useState(true);  // still following the USN?
  const [batchId, setBatchId] = useState('');
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [showAll, setShowAll] = useState(false);
  const [review, setReview] = useState(false);

  // sign-in fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [batches, setBatches] = useState<Batch[]>([]);
  useEffect(() => { getBatches().then(setBatches); }, []);
  const seniorBatches = useMemo(() => batches.filter(b => trackOfBatch(b) === 'senior'), [batches]);

  // ---------- live database check (email enrolled? USN / email already used?) ----------
  const [check, setCheck] = useState<RegistrationCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const checkSeq = useRef(0);
  const e = cleanEmail(email);
  const u = cleanUsn(usn);
  const m = cleanMobile(mobile);
  const emailOk = !checkEmail(email);
  const usnOk = !checkUsn(u);
  const mobileOk = !checkMobile(mobile);

  useEffect(() => {
    if (mode !== 'signup' || (!emailOk && !usnOk && !mobileOk)) { setCheck(null); return; }
    const id = ++checkSeq.current;
    setChecking(true);
    const t = setTimeout(async () => {
      const r = await checkRegistration(emailOk ? e : '', usnOk ? u : '', mobileOk ? m : '');
      if (id === checkSeq.current) { setCheck(r); setChecking(false); }
    }, 450);
    return () => clearTimeout(t);
  }, [e, u, m, emailOk, usnOk, mobileOk, mode]);

  // The college list says which batch this email belongs to: pre-select it once.
  const preselected = useRef('');
  useEffect(() => {
    const b = check?.enrolled_batch;
    if (b && preselected.current !== e && seniorBatches.some(x => x.id === b)) {
      preselected.current = e;
      setBatchId(cur => cur || b);
    }
  }, [check, e, seniorBatches]);

  // Branch follows the USN (…CS…) until the student picks one by hand.
  const usnBranch = branchFromUsn(u);
  useEffect(() => { if (branchAuto && usnBranch) setBranch(usnBranch); }, [usnBranch, branchAuto]);

  // ---------- validation ----------
  const errors: Record<Field, string> = {
    name: checkName(name),
    email: checkEmail(email)
      || (emailOk && check && check.email_registered ? 'This email is already registered. Use Sign In.' : '')
      || (emailOk && check && check.blocked ? 'Your access has been blocked. Please contact your trainer.' : '')
      || (emailOk && check && !check.enrolled ? 'This email is not on your college\'s list. Use the exact email you gave the college.' : ''),
    usn: checkUsn(u)
      || (usnOk && check && check.usn_registered ? 'This USN is already registered. If it is yours, use Sign In.' : '')
      || (usnOk && emailOk && check && check.usn_matches_list === false ? 'This USN does not match your college record for this email. Check both.' : ''),
    mobile: checkMobile(mobile),
    branch: branch ? '' : 'Select your branch.',
    batch: batchId ? '' : 'Select your batch.',
  };
  const show = (f: Field) => (showAll || touched[f]) && !!errors[f];
  const touch = (f: Field) => () => setTouched(t => ({ ...t, [f]: true }));
  const firstError = (Object.keys(errors) as Field[]).find(f => errors[f]);

  const batch = seniorBatches.find(b => b.id === batchId);
  const batchMismatch = !!(check?.enrolled_batch && batchId && check.enrolled_batch !== batchId);
  const branchMismatch = !!(usnBranch && branch && usnBranch !== branch);

  const goReview = () => {
    setShowAll(true); setMsg('');
    if (firstError) {
      document.getElementById(`f-${firstError}`)?.focus();
      return;
    }
    setReview(true);
  };

  const create = async () => {
    setBusy(true); setMsg('');
    const r = await signUp(e, u, {
      name: cleanName(name), role: 'participant', mobile: m,
      branch: branchLabel(branch), year: FIXED_YEAR, semester: FIXED_SEMESTER,
      college: batch?.college || undefined, batchId, usn: u,
    });
    setBusy(false);
    if (r.ok && r.user) { setUser(r.user); return; }
    setReview(false);
    setMsg(r.msg);
    if (/already registered/i.test(r.msg) && /email/i.test(r.msg)) { setLoginEmail(e); setMode('signin'); }
  };

  const doSignin = async () => {
    if (!loginEmail.trim() || !loginPw) { setMsg('Enter your email and password.'); return; }
    setBusy(true); setMsg('');
    const r = await signIn(cleanEmail(loginEmail), loginPw.trim());
    setBusy(false);
    if (r.ok && r.user) { setUser(r.user); return; }
    setMsg(r.msg);
  };

  const switchTo = (to: Mode) => {
    setMode(to); setMsg(''); setReview(false);
    if (to === 'signin' && !loginEmail && emailOk) setLoginEmail(e);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 fade-in">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 text-brand font-extrabold text-xl">iPEC Employability Edge</div>
          <p className="text-slate-500 text-sm mt-1">Soft Skill Training & Assessment Platform</p>
          <p className="text-emerald-600 text-xs mt-1 font-semibold">100% Free for Students · No Camera · No Fees</p>
        </div>

        {!HAS_SUPABASE && (
          <div className="mb-4 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5">
            Demo mode (browser storage). Add Supabase keys to enable real multi-user accounts.
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {(['signup', 'signin'] as Mode[]).map(k => (
            <button key={k} onClick={() => switchTo(k)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border ${mode === k ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200'}`}>
              {k === 'signup' ? 'New Student? Register' : 'Sign In'}
            </button>
          ))}
        </div>

        {/* ===================== REGISTER ===================== */}
        {mode === 'signup' && !review && (
          <div className="space-y-3.5">
            <div className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-lg p-3 leading-relaxed">
              <b>Register only once.</b> Your <b>college email</b> is your username and your <b>USN</b> is your password.
              <span className="block mt-1 text-indigo-600">Trainers & Admin: use the Sign In tab.</span>
            </div>

            <Row label="Full name" hint="As in your college records" err={show('name') ? errors.name : ''}>
              <input id="f-name" className={inputCls(show('name'))} value={name} autoComplete="name"
                onChange={ev => setName(ev.target.value)} onBlur={() => { setName(cleanName(name)); touch('name')(); }}
                placeholder="e.g. Priya Kumari" />
            </Row>

            <Row label="College email" hint="The same email you gave to your college" err={show('email') ? errors.email : ''}>
              <input id="f-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none"
                className={inputCls(show('email'))} value={email}
                onChange={ev => setEmail(ev.target.value)} onBlur={() => { setEmail(e); touch('email')(); }}
                placeholder="yourname@college.edu" />
              {emailOk && <EmailStatus check={check} checking={checking} onSignIn={() => switchTo('signin')} />}
            </Row>

            <Row label="USN (this is your password)" hint={`Capital letters and numbers, e.g. ${USN_EXAMPLE} or 01SU24AI001`} err={show('usn') ? errors.usn : ''}>
              <input id="f-usn" className={inputCls(show('usn')) + ' font-mono tracking-widest uppercase'} value={u}
                maxLength={USN_MAX} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                onChange={ev => setUsn(cleanUsn(ev.target.value))} onBlur={touch('usn')} placeholder={USN_EXAMPLE} />
              {usnOk && check && !check.usn_registered && check.usn_matches_list !== false && (
                <p className="text-[11px] text-emerald-700 mt-1 font-semibold">{check.usn_matches_list ? '✓ Matches your college record' : '✓ USN looks right'}</p>
              )}
            </Row>

            <Row label="Mobile number" hint="Your own 10-digit number" err={show('mobile') ? errors.mobile : ''}>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-sm text-slate-500">+91</span>
                <input id="f-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10}
                  className={inputCls(show('mobile')) + ' rounded-l-none'} value={mobile}
                  onChange={ev => setMobile(ev.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={touch('mobile')}
                  placeholder="98XXXXXXXX" />
              </div>
              {mobileOk && check?.mobile_registered && (
                <p className="text-[11px] text-amber-700 mt-1">This number is already used by another account. Please give your own number.</p>
              )}
            </Row>

            <Row label="Branch" err={show('branch') ? errors.branch : ''}>
              <select id="f-branch" className={inputCls(show('branch'))} value={branch}
                onChange={ev => { setBranch(ev.target.value); setBranchAuto(false); }} onBlur={touch('branch')}>
                <option value="">Select your branch</option>
                {BRANCHES.map(b => <option key={b.code} value={b.code}>{b.code} – {b.name}</option>)}
              </select>
              {branchMismatch && (
                <p className="text-[11px] text-amber-700 mt-1">Your USN shows <b>{usnBranch}</b> but you picked <b>{branch}</b>. Please check.</p>
              )}
            </Row>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2">
                <Row label="Semester">
                  <div className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 text-base sm:text-sm text-slate-700 font-semibold">
                    {FIXED_SEMESTER}th Sem
                  </div>
                </Row>
              </div>
              <div className="col-span-3">
                <Row label="Batch" err={show('batch') ? errors.batch : ''}>
                  <select id="f-batch" className={inputCls(show('batch'))} value={batchId}
                    onChange={ev => setBatchId(ev.target.value)} onBlur={touch('batch')}>
                    <option value="">Select batch</option>
                    {seniorBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </Row>
              </div>
            </div>
            {batchMismatch && (
              <p className="text-[11px] text-amber-700 -mt-2">
                Your college list shows <b>{check?.enrolled_batch_name || check?.enrolled_batch}</b>. Pick that unless your trainer told you otherwise.
              </p>
            )}

            <button onClick={goReview} disabled={busy}
              className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-lg text-sm disabled:opacity-50">
              Continue
            </button>
            {showAll && firstError && <p className="text-center text-xs text-red-600">Please fix the highlighted fields.</p>}
          </div>
        )}

        {/* ===================== REVIEW ===================== */}
        {mode === 'signup' && review && (
          <div className="space-y-4">
            <div>
              <h2 className="font-extrabold text-slate-800">Check your details</h2>
              <p className="text-xs text-slate-500">Wrong details go on your certificate and reports. Please read once.</p>
            </div>
            <dl className="text-sm divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {[
                ['Name', cleanName(name)], ['Email', e], ['USN', u], ['Mobile', '+91 ' + m],
                ['Branch', branchLabel(branch)], ['Semester', FIXED_SEMESTER], ['Batch', batch?.name || batchId],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 px-3 py-2">
                  <dt className="w-20 shrink-0 text-slate-500">{k}</dt>
                  <dd className={`font-semibold text-slate-800 ${k === 'Email' ? 'break-all' : 'break-words'} ${k === 'USN' ? 'font-mono tracking-wider' : ''}`}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
              <p className="font-bold text-emerald-800 mb-1">Your login (note it down)</p>
              <p className="text-emerald-900">Username: <b className="break-all">{e}</b></p>
              <p className="text-emerald-900">Password: <b className="font-mono tracking-wider">{u}</b></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReview(false)} disabled={busy}
                className="flex-1 border border-slate-300 rounded-lg py-2.5 text-sm font-semibold text-slate-700">← Edit</button>
              <button onClick={create} disabled={busy}
                className="flex-[2] bg-brand hover:bg-brand-dark text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">
                {busy ? 'Creating account…' : 'Confirm & create account'}
              </button>
            </div>
          </div>
        )}

        {/* ===================== SIGN IN ===================== */}
        {mode === 'signin' && (
          <form className="space-y-3.5" onSubmit={ev => { ev.preventDefault(); doSignin(); }}>
            <Row label="Email" hint="Students: your college email">
              <input type="email" inputMode="email" autoComplete="username" autoCapitalize="none" className={inputCls()}
                value={loginEmail} onChange={ev => setLoginEmail(ev.target.value)} placeholder="yourname@college.edu" />
            </Row>
            <Row label="Password" hint={`Students: your USN, e.g. ${USN_EXAMPLE}`}>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} autoComplete="current-password" autoCapitalize="characters"
                  className={inputCls() + ' pr-16'} value={loginPw} onChange={ev => setLoginPw(ev.target.value)} placeholder="Your USN" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand px-2 py-1">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </Row>
            <button type="submit" disabled={busy} className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="text-center text-[11px] text-slate-400">Forgot or wrong details? Ask your trainer. The admin can correct them.</p>
          </form>
        )}

        {msg && <p className="text-center text-sm mt-3 text-red-600">{msg}</p>}
      </div>
    </div>
  );
}

function Row({ label, hint, err, children }: { label: string; hint?: string; err?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      {children}
      {err ? <p className="text-[11px] text-red-600 mt-1">{err}</p>
        : hint ? <p className="text-[11px] text-slate-400 mt-1">{hint}</p> : null}
    </div>
  );
}

function EmailStatus({ check, checking, onSignIn }: { check: RegistrationCheck | null; checking: boolean; onSignIn: () => void }) {
  if (checking && !check) return <p className="text-[11px] text-slate-400 mt-1">Checking your college list…</p>;
  if (!check) return null;
  if (check.email_registered) {
    return (
      <p className="text-[11px] mt-1">
        <button type="button" onClick={onSignIn} className="font-bold text-brand underline">Go to Sign In →</button>
      </p>
    );
  }
  if (check.enrolled && !check.blocked) {
    return <p className="text-[11px] text-emerald-700 mt-1 font-semibold">✓ Found on your college list{check.enrolled_batch_name ? ` · ${check.enrolled_batch_name}` : ''}</p>;
  }
  return null;
}
