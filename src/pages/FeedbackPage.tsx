import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { saveFeedback, getSessionLocks, SESSION_KEYS } from '../lib/db';
import { Feedback as FB } from '../types';

const QUESTIONS = [
  { key: 'ratingProgram', label: 'The training programme overall' },
  { key: 'ratingTrainer', label: 'Your trainer' },
  { key: 'ratingInteractivity', label: 'Interactivity of the session' },
  { key: 'ratingEngagement', label: 'How engaging the session was' },
  { key: 'ratingDifferent', label: 'How different this was from other soft-skill trainings' },
] as const;

export default function FeedbackPage() {
  const { user } = useAuth();
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [sessionKey, setSessionKey] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user?.batchId) getSessionLocks(user.batchId).then(m => {
      setLocks(m);
      const active = SESSION_KEYS.find(k => m[k]);
      if (active) setSessionKey(active);
    });
  }, [user]);

  const set = (k: string, v: number) => setRatings(r => ({ ...r, [k]: v }));

  const submit = async () => {
    if (!sessionKey) return;
    const f: FB = {
      id: 'fb-' + Date.now(), userId: user!.id, userName: user!.name, batchId: user!.batchId,
      sessionKey,
      ratingProgram: ratings.ratingProgram || 0, ratingTrainer: ratings.ratingTrainer || 0,
      ratingInteractivity: ratings.ratingInteractivity || 0, ratingEngagement: ratings.ratingEngagement || 0,
      ratingDifferent: ratings.ratingDifferent || 0, comments, createdAt: new Date().toISOString(),
    };
    await saveFeedback(f);
    setDone(true);
  };

  if (done) return (
    <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <div className="text-4xl">🙏</div>
      <h2 className="text-xl font-extrabold text-slate-800 mt-2">Thank you for your feedback!</h2>
      <p className="text-slate-500 text-sm mt-1">Your response helps iPEC keep improving every session.</p>
    </div>
  );

  const activeSession = SESSION_KEYS.find(k => locks[k]);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Session Feedback</h1>
        <p className="text-sm text-slate-500">Rate the current session. 1 = Poor, 5 = Excellent.</p>
      </div>

      {!activeSession ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          No active session right now. Feedback opens when your trainer activates a session.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="text-xs font-bold text-brand bg-indigo-50 inline-block px-2 py-1 rounded-full">
            Session: Day {activeSession.split('-')[0]} · {activeSession.split('-')[1]}
          </div>
          {QUESTIONS.map(q => (
            <div key={q.key}>
              <p className="text-sm font-semibold text-slate-700 mb-1">{q.label}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => set(q.key, n)}
                    className={`w-10 h-10 rounded-lg font-bold text-sm border ${ratings[q.key] === n ? 'bg-brand text-white border-brand' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">What did you like about iPEC / this trainer / these sessions?</p>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3}
              className="w-full border border-slate-200 rounded-lg p-2 text-sm" placeholder="Share what stood out — the trainer, the interactivity, how it differs from other trainings…" />
          </div>
          <button onClick={submit} className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-2.5 rounded-lg">Submit Feedback</button>
        </div>
      )}
    </div>
  );
}
