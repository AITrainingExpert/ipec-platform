import { supabase, HAS_SUPABASE, SHEETS_WEBHOOK } from './supabase';
import { User, Batch, Question, QuizResult, Role, DrillResult, AllowedEmail, SessionLock, Feedback } from '../types';
import { SEED_QUESTIONS } from './questions';

// ============================================================
// DATA LAYER
// If Supabase is configured -> real multi-user backend.
// Else -> DEMO MODE using browser localStorage (single device).
// Same function signatures either way, so UI code never changes.
// ============================================================

const LS = {
  users: 'ipec_users', results: 'ipec_results', batches: 'ipec_batches',
  questions: 'ipec_questions', session: 'ipec_session', drills: 'ipec_drills',
  allowed: 'ipec_allowed', locks: 'ipec_locks', feedback: 'ipec_feedback', uploadedQ: 'ipec_uploaded_q',
};

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function write(key: string, val: any) { localStorage.setItem(key, JSON.stringify(val)); }
function uid() { return 'id-' + Math.random().toString(36).slice(2, 10); }

// ---- one-time demo seed ----
export function ensureSeed() {
  if (HAS_SUPABASE) return;
  if (!localStorage.getItem(LS.users)) {
    const admin: User = { id: 'admin-1', name: 'Platform Admin', email: 'admin@ipec.test',
      role: 'admin', createdAt: new Date().toISOString() };
    const trainer: User = { id: 'trainer-1', name: 'Demo Trainer', email: 'trainer@ipec.test',
      role: 'trainer', batchId: 'batch-1', createdAt: new Date().toISOString() };
    write(LS.users, [admin, trainer]);
  }
  if (!localStorage.getItem(LS.batches)) {
    const bs: Batch[] = [];
    for (let i = 1; i <= 5; i++) {
      bs.push({ id: `batch-${i}`, name: `Batch ${i}`, college: 'Your College', trainerId: `trainer-${i}`, createdAt: new Date().toISOString() });
    }
    write(LS.batches, bs);
  }
  if (!localStorage.getItem(LS.questions)) write(LS.questions, SEED_QUESTIONS);
}

// ---- AUTH ----
// Production: email + password (Supabase). No OTP/link friction — works on free plan.
// Demo: simple local accounts.
// Pending profile data is passed at signup and written once the session exists.

type ProfileInput = { name: string; role: Role; mobile?: string; branch?: string; year?: string; college?: string; batchId?: string };

async function writeProfile(userId: string, email: string, p: ProfileInput): Promise<User> {
  const u: User = { id: userId, email, name: p.name, role: p.role, mobile: p.mobile,
    branch: p.branch, year: p.year, college: p.college, batchId: p.batchId, createdAt: new Date().toISOString() };
  if (HAS_SUPABASE && supabase) {
    await supabase.from('profiles').upsert({
      id: u.id, name: u.name, email: u.email, role: u.role, mobile: u.mobile,
      branch: u.branch, year: u.year, college: u.college, batch_id: u.batchId,
    });
  }
  return u;
}

// Register a new account with email + password.
export async function signUp(email: string, password: string, profile: ProfileInput): Promise<{ ok: boolean; user?: User; msg: string }> {
  // Gatekeeping: only invited emails may register AS PARTICIPANTS.
  // Trainers and admins are staff and are not restricted by the participant allowlist.
  if (profile.role === 'participant') {
    const allowed = await isEmailAllowed(email);
    if (!allowed) return { ok: false, msg: 'This email is not enrolled for any training batch. Please contact your trainer/admin.' };
    // Force the participant into the batch their email was enrolled into,
    // regardless of what the form defaulted to. Fix for students landing in batch-1.
    profile = { ...profile, batchId: await batchForEmail(email, profile.batchId || 'batch-1') };
  }
  if (HAS_SUPABASE && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: {
        name: profile.name, role: profile.role, mobile: profile.mobile,
        branch: profile.branch, year: profile.year, college: profile.college,
        batch_id: profile.batchId || 'batch-1',
      } },
    });
    if (error) return { ok: false, msg: error.message };
    if (!data.user) return { ok: false, msg: 'Sign up failed. Please try again.' };
    // If email confirmation is OFF, a session exists now and we can write the profile immediately.
    if (data.session) {
      const u = await writeProfile(data.user.id, email, profile);
      return { ok: true, user: u, msg: 'Account created' };
    }
    // If confirmation is ON, stash the profile so it is written after they confirm + first sign in.
    localStorage.setItem('ipec_pending_profile', JSON.stringify({ email, profile }));
    return { ok: false, msg: 'Check your email to confirm your account, then sign in.' };
  }
  // demo
  const users = read<User[]>(LS.users, []);
  if (users.find(x => x.email === email)) return { ok: false, msg: 'Account already exists — please sign in.' };
  const u: User = { id: uid(), email, name: profile.name, role: profile.role, mobile: profile.mobile,
    branch: profile.branch, year: profile.year, college: profile.college,
    batchId: profile.batchId || 'batch-1', createdAt: new Date().toISOString() };
  users.push(u); write(LS.users, users);
  localStorage.setItem('ipec_pw_' + email, password);
  write(LS.session, u);
  return { ok: true, user: u, msg: 'Account created' };
}

// Sign in to an existing account.
export async function signIn(email: string, password: string): Promise<{ ok: boolean; user?: User; msg: string }> {
  if (HAS_SUPABASE && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: error.message };
    if (!data.user) return { ok: false, msg: 'Sign in failed.' };
    // Check if participant is blocked (only for participants — staff are never in allowlist)
    const { data: prof0 } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    if (prof0?.role === 'participant') {
      const blocked = await isParticipantBlocked(email);
      if (blocked) {
        await supabase.auth.signOut();
        return { ok: false, msg: 'Your access has been suspended by the admin. Please contact your trainer.' };
      }
    }
    // Fetch profile; if missing (e.g. just confirmed email), write it from the stashed data.
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    if (prof) {
      return { ok: true, user: mapProfile(prof), msg: 'Signed in' };
    }
    const pendingRaw = localStorage.getItem('ipec_pending_profile');
    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw);
      if (pending.email === email) {
        const u = await writeProfile(data.user.id, email, pending.profile);
        localStorage.removeItem('ipec_pending_profile');
        return { ok: true, user: u, msg: 'Signed in' };
      }
    }
    // No profile and no pending data: create a minimal one in the enrolled batch.
    const resolvedBatch = await batchForEmail(email);
    const u = await writeProfile(data.user.id, email, { name: email.split('@')[0], role: 'participant', batchId: resolvedBatch });
    return { ok: true, user: u, msg: 'Signed in' };
  }
  // demo
  const users = read<User[]>(LS.users, []);
  const u = users.find(x => x.email === email);
  if (!u) return { ok: false, msg: 'No account found — please register.' };
  const savedPw = localStorage.getItem('ipec_pw_' + email);
  if (savedPw && savedPw !== password) return { ok: false, msg: 'Incorrect password.' };
  write(LS.session, u);
  return { ok: true, user: u, msg: 'Signed in' };
}

function mapProfile(prof: any): User {
  return { id: prof.id, name: prof.name, email: prof.email, role: prof.role, mobile: prof.mobile,
    branch: prof.branch, year: prof.year, college: prof.college, batchId: prof.batch_id, createdAt: prof.created_at };
}

export async function getSession(): Promise<User | null> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    const uid = data.session.user.id;
    const email = data.session.user.email || '';
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (prof) return mapProfile(prof);
    // Session exists but no profile yet (e.g. returned from an email confirmation link).
    const pendingRaw = localStorage.getItem('ipec_pending_profile');
    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw);
      if (pending.email === email) {
        const u = await writeProfile(uid, email, pending.profile);
        localStorage.removeItem('ipec_pending_profile');
        return u;
      }
    }
    const resolvedBatch = await batchForEmail(email);
    return await writeProfile(uid, email, { name: email.split('@')[0], role: 'participant', batchId: resolvedBatch });
  }
  return read<User | null>(LS.session, null);
}

export async function signOut() {
  if (HAS_SUPABASE && supabase) await supabase.auth.signOut();
  else localStorage.removeItem(LS.session);
}

// ---- QUESTIONS ----
export async function getQuestions(): Promise<Question[]> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('questions').select('*');
    if (data && data.length) return data.map((q: any) => ({
      id: q.id, section: q.section, day: q.day, level: q.level, text: q.text,
      options: q.options, answer: q.answer,
    }));
    return SEED_QUESTIONS;
  }
  return [...read<Question[]>(LS.questions, SEED_QUESTIONS), ...read<Question[]>(LS.uploadedQ, [])];
}

// ---- RESULTS ----
export async function saveResult(r: QuizResult) {
  if (HAS_SUPABASE && supabase) {
    await supabase.from('results').insert({
      id: r.id, user_id: r.userId, user_name: r.userName, batch_id: r.batchId,
      day: String(r.day), session_slot: r.sessionSlot || 'Full',
      activity_type: r.activityType || 'Quiz',
      attempt_number: r.attemptNumber || 1,
      score: r.score, total: r.total, percentage: r.percentage,
      weak_sections: r.weakSections, completed_at: r.completedAt,
    });
  } else {
    // Demo: append-only — never overwrite
    const all = read<QuizResult[]>(LS.results, []);
    all.unshift(r); write(LS.results, all);
  }
  syncToSheets(r);
}

// ---- DRILL RESULTS (gamified arena) ----
export async function saveDrillResult(r: DrillResult) {
  if (HAS_SUPABASE && supabase) {
    await supabase.from('drill_results').insert({
      id: r.id, user_id: r.userId, user_name: r.userName, batch_id: r.batchId,
      drill_id: r.drillId, drill_title: r.drillTitle, badge_title: r.badgeTitle,
      badge_tier: r.badgeTier, score: r.score, total: r.total, percentage: r.percentage,
      passed: r.passed, xp_earned: r.xpEarned, completed_at: r.completedAt,
    });
  } else {
    const all = read<DrillResult[]>(LS.drills, []);
    all.unshift(r); write(LS.drills, all);
  }
}

export async function getMyDrills(userId: string): Promise<DrillResult[]> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('drill_results').select('*').eq('user_id', userId).order('completed_at', { ascending: false });
    return (data || []).map(mapDrill);
  }
  return read<DrillResult[]>(LS.drills, []).filter(r => r.userId === userId);
}

export async function getBatchDrills(batchId?: string): Promise<DrillResult[]> {
  if (HAS_SUPABASE && supabase) {
    let q = supabase.from('drill_results').select('*').order('completed_at', { ascending: false });
    if (batchId) q = q.eq('batch_id', batchId);
    const { data } = await q;
    return (data || []).map(mapDrill);
  }
  const all = read<DrillResult[]>(LS.drills, []);
  return batchId ? all.filter(r => r.batchId === batchId) : all;
}

function mapDrill(r: any): DrillResult {
  return { id: r.id, userId: r.user_id, userName: r.user_name, batchId: r.batch_id,
    drillId: r.drill_id, drillTitle: r.drill_title, badgeTitle: r.badge_title,
    badgeTier: r.badge_tier, score: r.score, total: r.total, percentage: r.percentage,
    passed: r.passed === true || r.passed === 1,
    xpEarned: r.xp_earned || 0, completedAt: r.completed_at };
}

export async function getMyResults(userId: string): Promise<QuizResult[]> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('results').select('*').eq('user_id', userId).order('completed_at', { ascending: false });
    return (data || []).map(mapResult);
  }
  return read<QuizResult[]>(LS.results, []).filter(r => r.userId === userId);
}

export async function getBatchResults(batchId?: string): Promise<QuizResult[]> {
  if (HAS_SUPABASE && supabase) {
    let q = supabase.from('results').select('*').order('completed_at', { ascending: false });
    if (batchId) q = q.eq('batch_id', batchId);
    const { data } = await q;
    return (data || []).map(mapResult);
  }
  const all = read<QuizResult[]>(LS.results, []);
  return batchId ? all.filter(r => r.batchId === batchId) : all;
}

function mapResult(r: any): QuizResult {
  return { id: r.id, userId: r.user_id, userName: r.user_name, batchId: r.batch_id,
    day: r.day === 'all' ? 'all' : Number(r.day),
    sessionSlot: r.session_slot || 'Full',
    activityType: r.activity_type || 'Quiz',
    attemptNumber: r.attempt_number || 1,
    score: r.score, total: r.total,
    percentage: r.percentage, weakSections: r.weak_sections || [], completedAt: r.completed_at };
}

// ---- USERS & BATCHES (admin/trainer) ----
export async function getUsers(): Promise<User[]> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('profiles').select('*');
    return (data || []).map((p: any) => ({ id: p.id, name: p.name, email: p.email, role: p.role,
      mobile: p.mobile, branch: p.branch, year: p.year, college: p.college, batchId: p.batch_id, createdAt: p.created_at }));
  }
  return read<User[]>(LS.users, []);
}

export async function getBatches(): Promise<Batch[]> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('batches').select('*');
    return (data || []).map((b: any) => ({ id: b.id, name: b.name, college: b.college, trainerId: b.trainer_id, createdAt: b.created_at }));
  }
  return read<Batch[]>(LS.batches, []);
}

export async function addBatch(name: string, college: string) {
  const b: Batch = { id: uid(), name, college, createdAt: new Date().toISOString() };
  if (HAS_SUPABASE && supabase) await supabase.from('batches').insert({ id: b.id, name, college, created_at: b.createdAt });
  else { const all = read<Batch[]>(LS.batches, []); all.push(b); write(LS.batches, all); }
  return b;
}

// ============================================================
// PHASE 1: ALLOWLIST (only invited emails can register)
// ============================================================
export async function isEmailAllowed(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('allowed_emails').select('email').eq('email', e).maybeSingle();
    return !!data;
  }
  const list = read<AllowedEmail[]>(LS.allowed, []);
  // In demo mode, if the list is empty, allow everyone (so you can try it out).
  if (list.length === 0) return true;
  return list.some(a => a.email === e);
}

export async function getAllowedEmails(batchId?: string): Promise<AllowedEmail[]> {
  if (HAS_SUPABASE && supabase) {
    let q = supabase.from('allowed_emails').select('*').order('created_at', { ascending: false });
    if (batchId) q = q.eq('batch_id', batchId);
    const { data } = await q;
    return (data || []).map((a: any) => ({ email: a.email, batchId: a.batch_id, addedBy: a.added_by, createdAt: a.created_at }));
  }
  const list = read<AllowedEmail[]>(LS.allowed, []);
  return batchId ? list.filter(a => a.batchId === batchId) : list;
}

// Bulk add emails (paste or CSV). Returns how many were added.
// Resolve which batch an email was enrolled into — makes students land in the
// RIGHT batch at signup instead of always batch-1.
export async function batchForEmail(email: string, fallback = 'batch-1'): Promise<string> {
  const e = email.trim().toLowerCase();
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('allowed_emails')
      .select('batch_id').eq('email', e)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data?.batch_id || fallback;
  }
  const list = read<AllowedEmail[]>(LS.allowed, []);
  const hit = list.find(a => a.email === e);
  return hit?.batchId || fallback;
}

export async function addAllowedEmails(emails: string[], batchId: string, addedBy: string): Promise<number> {
  const clean = Array.from(new Set(emails.map(e => e.trim().toLowerCase()).filter(e => e.includes('@'))));
  if (clean.length === 0) return 0;
  if (HAS_SUPABASE && supabase) {
    const rows = clean.map(email => ({ email, batch_id: batchId, added_by: addedBy }));
    const { error } = await supabase.from('allowed_emails').upsert(rows, { onConflict: 'email,batch_id' });
    if (error) { await supabase.from('allowed_emails').upsert(rows, { onConflict: 'email' }); }
    return clean.length;
  }
  const list = read<AllowedEmail[]>(LS.allowed, []);
  clean.forEach(email => {
    if (!list.find(a => a.email === email)) list.push({ email, batchId, addedBy, createdAt: new Date().toISOString() });
  });
  write(LS.allowed, list);
  return clean.length;
}

export async function removeAllowedEmail(email: string) {
  const e = email.trim().toLowerCase();
  if (HAS_SUPABASE && supabase) { await supabase.from('allowed_emails').delete().eq('email', e); return; }
  const list = read<AllowedEmail[]>(LS.allowed, []).filter(a => a.email !== e);
  write(LS.allowed, list);
}

// ============================================================
// PHASE 2: SESSION LOCKS (Morning/Afternoon per day)
// ============================================================
export const SESSION_KEYS: string[] = [];
for (let d = 1; d <= 5; d++) { SESSION_KEYS.push(`${d}-Morning`, `${d}-Afternoon`); }

export async function getSessionLocks(batchId: string): Promise<Record<string, boolean>> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('session_locks').select('*').eq('batch_id', batchId);
    const map: Record<string, boolean> = {};
    (data || []).forEach((r: any) => { map[r.session_key] = r.unlocked; });
    return map;
  }
  const all = read<SessionLock[]>(LS.locks, []);
  const map: Record<string, boolean> = {};
  all.filter(l => l.batchId === batchId).forEach(l => { map[l.sessionKey] = l.unlocked; });
  return map;
}

export async function setSessionLock(batchId: string, sessionKey: string, unlocked: boolean, updatedBy: string) {
  if (HAS_SUPABASE && supabase) {
    await supabase.from('session_locks').upsert(
      { batch_id: batchId, session_key: sessionKey, unlocked, updated_by: updatedBy, updated_at: new Date().toISOString() },
      { onConflict: 'batch_id,session_key' }
    );
    return;
  }
  const all = read<SessionLock[]>(LS.locks, []);
  const i = all.findIndex(l => l.batchId === batchId && l.sessionKey === sessionKey);
  const row: SessionLock = { batchId, sessionKey, unlocked, updatedBy, updatedAt: new Date().toISOString() };
  if (i >= 0) all[i] = row; else all.push(row);
  write(LS.locks, all);
}

// Enforce "only one session active at a time": unlock this one, lock all others in the batch.
export async function activateOnlySession(batchId: string, sessionKey: string, updatedBy: string) {
  for (const key of SESSION_KEYS) {
    await setSessionLock(batchId, key, key === sessionKey, updatedBy);
  }
}

// ============================================================
// PHASE 3: TRAINER QUESTION UPLOAD (parsed from CSV text)
// ============================================================
// CSV columns: section,day,level,question,optionA,optionB,optionC,optionD,answer(A-D)
export function parseQuestionCsv(csv: string): Question[] {
  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out: Question[] = [];
  const letterToIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
  let start = 0;
  if (lines[0] && /section/i.test(lines[0]) && /question/i.test(lines[0])) start = 1; // skip header
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 9) continue;
    const [section, day, level, text, a, b, c, d, ans] = cols;
    const answer = letterToIdx[ans.trim()] ?? 0;
    const lv = (level || 'I').trim().toUpperCase();
    out.push({
      id: 'up-' + Date.now() + '-' + i,
      section: (section || 'APT').trim().toUpperCase(),
      day: Number(day) || 1,
      level: (['B', 'I', 'A'].includes(lv) ? lv : 'I') as any,
      text: text.trim(),
      options: [a, b, c, d].map(x => x.trim()),
      answer,
    });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { q = !q; }
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.replace(/^"|"$/g, ''));
}

export async function addUploadedQuestions(qs: Question[]): Promise<number> {
  if (qs.length === 0) return 0;
  if (HAS_SUPABASE && supabase) {
    const rows = qs.map(q => ({ id: q.id, section: q.section, day: q.day, level: q.level, text: q.text, options: q.options, answer: q.answer }));
    await supabase.from('questions').insert(rows);
    return qs.length;
  }
  const existing = read<Question[]>(LS.uploadedQ, []);
  write(LS.uploadedQ, [...existing, ...qs]);
  return qs.length;
}

// ============================================================
// PHASE 4: FEEDBACK
// ============================================================
export async function saveFeedback(f: Feedback) {
  if (HAS_SUPABASE && supabase) {
    await supabase.from('feedback').insert({
      id: f.id, user_id: f.userId, user_name: f.userName, batch_id: f.batchId, session_key: f.sessionKey,
      rating_program: f.ratingProgram, rating_trainer: f.ratingTrainer, rating_interactivity: f.ratingInteractivity,
      rating_engagement: f.ratingEngagement, rating_different: f.ratingDifferent, comments: f.comments, created_at: f.createdAt,
    });
    return;
  }
  const all = read<Feedback[]>(LS.feedback, []);
  all.unshift(f); write(LS.feedback, all);
}

export async function getFeedback(batchId?: string): Promise<Feedback[]> {
  if (HAS_SUPABASE && supabase) {
    let q = supabase.from('feedback').select('*').order('created_at', { ascending: false });
    if (batchId) q = q.eq('batch_id', batchId);
    const { data } = await q;
    return (data || []).map(mapFeedback);
  }
  const all = read<Feedback[]>(LS.feedback, []);
  return batchId ? all.filter(f => f.batchId === batchId) : all;
}

function mapFeedback(f: any): Feedback {
  return { id: f.id, userId: f.user_id, userName: f.user_name, batchId: f.batch_id, sessionKey: f.session_key,
    ratingProgram: f.rating_program, ratingTrainer: f.rating_trainer, ratingInteractivity: f.rating_interactivity,
    ratingEngagement: f.rating_engagement, ratingDifferent: f.rating_different, comments: f.comments, createdAt: f.created_at };
}

// ============================================================
// CERTIFICATES
// ============================================================
import type { Certificate, CertSettings, BadgeLevel } from '../types';

function badgeFromScore(score: number): string {
  if (score >= 85) return 'Platinum Edge';
  if (score >= 70) return 'Gold Edge';
  if (score >= 55) return 'Silver Edge';
  return 'Bronze Edge';
}

function autoSeqNumber(idx: number): string {
  const year = new Date().getFullYear();
  return `IPEC-${year}-${String(idx).padStart(4, '0')}`;
}

export async function getCertSettings(batchId: string): Promise<CertSettings | null> {
  if (HAS_SUPABASE && supabase) {
    // Fetch ALL cert_settings rows and find any with download enabled
    // This handles the case where admin sets it on batch-1 but participant is in batch-2 etc.
    const { data: allSettings } = await supabase.from('cert_settings').select('*');
    if (!allSettings || allSettings.length === 0) return { batchId, downloadEnabled: false, collegeLogoUrl: '', collegeSignatoryName: '', collegeSignatoryTitle: '', updatedAt: '' };
    // Prefer exact batch match, then any enabled batch
    const exact = allSettings.find((r: any) => r.batch_id === batchId);
    const anyEnabled = allSettings.find((r: any) => r.download_enabled === true);
    const row = exact || anyEnabled || allSettings[0];
    return { batchId: row.batch_id, downloadEnabled: row.download_enabled,
      collegeLogoUrl: row.college_logo_url, collegeSignatoryName: row.college_signatory_name,
      collegeSignatoryTitle: row.college_signatory_title,
      collegeSignatureUrl: row.college_signature_url || '',
      updatedAt: row.updated_at };
  }
  const s = read<CertSettings | null>('ipec_cert_settings_' + batchId, null);
  if (!s) return read<CertSettings | null>('ipec_cert_settings_batch-1', null);
  return s;
}

export async function saveCertSettings(s: CertSettings) {
  if (HAS_SUPABASE && supabase) {
    await supabase.from('cert_settings').upsert({
      batch_id: s.batchId, download_enabled: s.downloadEnabled,
      college_logo_url: s.collegeLogoUrl, college_signatory_name: s.collegeSignatoryName,
      college_signatory_title: s.collegeSignatoryTitle,
      college_signature_url: s.collegeSignatureUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'batch_id' });
    return;
  }
  write('ipec_cert_settings_' + s.batchId, s);
}

export async function getMyCertificate(userId: string, batchId?: string): Promise<Certificate | null> {
  if (HAS_SUPABASE && supabase) {
    // If batchId provided, try exact match first; then fall back to any cert for this user
    let q = supabase.from('certificates').select('*').eq('user_id', userId);
    if (batchId) q = q.eq('batch_id', batchId);
    const { data } = await q.order('issued_at', { ascending: false }).limit(1).maybeSingle();
    return data ? mapCert(data) : null;
  }
  // Demo mode: try with batchId first, then without
  if (batchId) {
    const c = read<Certificate | null>('ipec_cert_' + userId + '_' + batchId, null);
    if (c) return c;
  }
  return null;
}

export async function getBatchCertificates(batchId: string): Promise<Certificate[]> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('certificates').select('*').eq('batch_id', batchId);
    return (data || []).map(mapCert);
  }
  return [];
}

export async function generateCertificate(
  user: { id: string; name: string; batchId: string; branch?: string; college?: string },
  extra: { usn: string; semester: string; batchName: string; finalScore: number; idx: number }
): Promise<Certificate> {
  const certNumber = autoSeqNumber(extra.idx);
  const qrCode = `https://ipec-platform.vercel.app/verify/${certNumber}`;
  const cert: Certificate = {
    id: 'cert-' + user.id, certNumber, userId: user.id, userName: user.name,
    usn: extra.usn, semester: extra.semester, batchId: user.batchId || '',
    batchName: extra.batchName, college: user.college || '', branch: user.branch || '',
    finalScore: extra.finalScore, badgeLevel: badgeFromScore(extra.finalScore),
    trainingDuration: '5 Days · 30 Hours', issuedAt: new Date().toISOString(),
    qrCode, downloadEnabled: false,
  };
  if (HAS_SUPABASE && supabase) {
    await supabase.from('certificates').upsert({
      id: cert.id, cert_number: cert.certNumber, user_id: cert.userId, user_name: cert.userName,
      usn: cert.usn, semester: cert.semester, batch_id: cert.batchId, batch_name: cert.batchName,
      college: cert.college, branch: cert.branch, final_score: cert.finalScore,
      badge_level: cert.badgeLevel, training_duration: cert.trainingDuration,
      issued_at: cert.issuedAt, qr_code: cert.qrCode, download_enabled: false,
    }, { onConflict: 'id' });
  } else {
    write('ipec_cert_' + user.id + '_' + (user.batchId || ''), cert);
  }
  return cert;
}

function mapCert(d: any): Certificate {
  return { id: d.id, certNumber: d.cert_number, userId: d.user_id, userName: d.user_name,
    usn: d.usn, semester: d.semester, batchId: d.batch_id, batchName: d.batch_name,
    college: d.college, branch: d.branch, finalScore: d.final_score, badgeLevel: d.badge_level,
    trainingDuration: d.training_duration, issuedAt: d.issued_at, qrCode: d.qr_code,
    collegeLogoUrl: d.college_logo_url, downloadEnabled: d.download_enabled };
}

// ============================================================
// ATTEMPT LIMITS
// ============================================================
import type { AttemptLimit, NbaConfig, CourseOutcome } from '../types';

const DEFAULT_MAX_ATTEMPTS = 2;

export async function getAttemptLimit(batchId: string): Promise<number> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('attempt_limits').select('max_attempts').eq('batch_id', batchId).maybeSingle();
    return data?.max_attempts ?? DEFAULT_MAX_ATTEMPTS;
  }
  return read<number>('ipec_attempt_limit_' + batchId, DEFAULT_MAX_ATTEMPTS);
}

export async function setAttemptLimit(batchId: string, max: number, updatedBy: string) {
  if (HAS_SUPABASE && supabase) {
    await supabase.from('attempt_limits').upsert({ batch_id: batchId, max_attempts: max, updated_by: updatedBy, updated_at: new Date().toISOString() }, { onConflict: 'batch_id' });
    return;
  }
  write('ipec_attempt_limit_' + batchId, max);
}

// Count attempts for a participant on a specific day/activity
export async function countAttempts(userId: string, day: number | 'all', activityType: string): Promise<number> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('results').select('id')
      .eq('user_id', userId).eq('day', String(day)).eq('activity_type', activityType);
    return (data || []).length;
  }
  const all = read<QuizResult[]>(LS.results, []);
  return all.filter(r => r.userId === userId && String(r.day) === String(day) && (r.activityType || 'Quiz') === activityType).length;
}

// Get best score per day for a participant
export async function getBestScores(userId: string): Promise<Record<string, number>> {
  const results = await getMyResults(userId);
  const best: Record<string, number> = {};
  results.forEach(r => {
    const key = `${r.day}-${r.activityType || 'Quiz'}`;
    if (!best[key] || r.percentage > best[key]) best[key] = r.percentage;
  });
  return best;
}

// ============================================================
// NBA / OBE CONFIGURATION
// ============================================================

// Default 5 COs aligned to iPEC Employability Edge programme
export const DEFAULT_COS: CourseOutcome[] = [
  { id: 'CO1', statement: 'Demonstrate effective oral and written communication skills in professional contexts',
    poMapping: 'PO10', psoMapping: '', days: [2, 3], activityTypes: ['Quiz', 'Drill'] },
  { id: 'CO2', statement: 'Apply logical reasoning and quantitative aptitude to solve placement-related problems',
    poMapping: 'PO2', psoMapping: '', days: [4, 5], activityTypes: ['Quiz', 'Bootcamp'] },
  { id: 'CO3', statement: 'Exhibit professional interview readiness through structured self-presentation and HR skills',
    poMapping: 'PO12', psoMapping: '', days: [3, 5], activityTypes: ['Quiz', 'Drill', 'Bootcamp'] },
  { id: 'CO4', statement: 'Collaborate effectively in group discussions, teamwork and leadership scenarios',
    poMapping: 'PO9', psoMapping: '', days: [4], activityTypes: ['Quiz', 'Drill'] },
  { id: 'CO5', statement: 'Build a placement-ready profile including ATS-optimised resume and professional mindset',
    poMapping: 'PO12', psoMapping: '', days: [1, 3], activityTypes: ['Quiz', 'Drill'] },
];

export async function getNbaConfig(batchId: string): Promise<NbaConfig | null> {
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('nba_config').select('*').eq('batch_id', batchId).maybeSingle();
    if (!data) return null;
    return { batchId: data.batch_id, programName: data.program_name, collegeName: data.college_name,
      department: data.department, academicYear: data.academic_year, threshold: data.threshold || 60,
      cos: data.cos || DEFAULT_COS, updatedAt: data.updated_at };
  }
  return read<NbaConfig | null>('ipec_nba_' + batchId, null);
}

export async function saveNbaConfig(cfg: NbaConfig) {
  if (HAS_SUPABASE && supabase) {
    await supabase.from('nba_config').upsert({
      batch_id: cfg.batchId, program_name: cfg.programName, college_name: cfg.collegeName,
      department: cfg.department, academic_year: cfg.academicYear, threshold: cfg.threshold,
      cos: cfg.cos, updated_at: new Date().toISOString(),
    }, { onConflict: 'batch_id' });
    return;
  }
  write('ipec_nba_' + cfg.batchId, cfg);
}

// Compute CO attainment from results
export function computeAttainment(
  results: QuizResult[],
  cos: CourseOutcome[],
  threshold: number
): { co: CourseOutcome; attainmentPct: number; studentsAttempted: number; studentsAttained: number }[] {
  const studentMap: Record<string, QuizResult[]> = {};
  results.forEach(r => {
    if (!studentMap[r.userId]) studentMap[r.userId] = [];
    studentMap[r.userId].push(r);
  });
  const studentIds = Object.keys(studentMap);
  const total = studentIds.length;

  return cos.map(co => {
    const relevant = results.filter(r => co.days.includes(Number(r.day)));
    // Per student, get best score on CO-relevant days
    const studentBest: Record<string, number> = {};
    relevant.forEach(r => {
      if (!studentBest[r.userId] || r.percentage > studentBest[r.userId]) studentBest[r.userId] = r.percentage;
    });
    const attempted = Object.keys(studentBest).length;
    const attained = Object.values(studentBest).filter(p => p >= threshold).length;
    const attainmentPct = attempted > 0 ? Math.round((attained / attempted) * 100) : 0;
    return { co, attainmentPct, studentsAttempted: attempted, studentsAttained: attained };
  });
}

// ---- Google Sheets sync ----
async function syncToSheets(r: QuizResult) {
  if (!SHEETS_WEBHOOK) return;
  try {
    await fetch(SHEETS_WEBHOOK, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: r.userName, day: r.day, score: r.score, total: r.total,
        percentage: r.percentage, weak: r.weakSections.join('; '),
        completedAt: r.completedAt, batch: r.batchId || '',
      }),
    });
  } catch { /* ignore in demo */ }
}

// ============================================================
// BLOCK / UNBLOCK participant (keeps all data, blocks login)
// ============================================================
export async function setParticipantBlocked(email: string, blocked: boolean) {
  const e = email.trim().toLowerCase();
  if (HAS_SUPABASE && supabase) {
    await supabase.from('allowed_emails')
      .update({ is_blocked: blocked, updated_at: new Date().toISOString() })
      .eq('email', e);
    return;
  }
  // Demo mode
  const list = read<any[]>(LS.allowed, []);
  const idx = list.findIndex((a: any) => a.email === e);
  if (idx >= 0) { list[idx].isBlocked = blocked; write(LS.allowed, list); }
}

export async function isParticipantBlocked(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.from('allowed_emails')
      .select('is_blocked').eq('email', e).maybeSingle();
    return data?.is_blocked ?? false;
  }
  const list = read<any[]>(LS.allowed, []);
  const found = list.find((a: any) => a.email === e);
  return found?.isBlocked ?? false;
}

// Get session-wise completion per participant (for admin view)
export async function getSessionCompletionMap(batchId?: string): 
  Promise<Record<string, Record<string, { done: boolean; score: number; attempts: number }>>> {
  const results = await getBatchResults(batchId);
  const map: Record<string, Record<string, { done: boolean; score: number; attempts: number }>> = {};
  results.forEach(r => {
    if (!map[r.userId]) map[r.userId] = {};
    const key = `${r.day}-${r.sessionSlot || 'Full'}`;
    if (!map[r.userId][key]) map[r.userId][key] = { done: false, score: 0, attempts: 0 };
    map[r.userId][key].attempts++;
    map[r.userId][key].done = true;
    if (r.percentage > map[r.userId][key].score) map[r.userId][key].score = r.percentage;
  });
  return map;
}
