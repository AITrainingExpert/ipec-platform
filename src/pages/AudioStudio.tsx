import React, { useEffect, useState } from 'react';
import { AUDIO_CLIPS } from '../lib/audioClips';
import { useAuth } from '../lib/auth';
import { getSessionLocks } from '../lib/db';
import { Link } from 'react-router-dom';

export default function AudioStudio() {
  const { user } = useAuth();
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const isStaff = user?.role === 'trainer' || user?.role === 'admin';

  useEffect(() => {
    if (user?.batchId) getSessionLocks(user.batchId).then(setLocks);
  }, [user]);

  const anyActive = isStaff || Object.values(locks).some(v => v);

  const speak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) { alert('Your browser does not support speech playback.'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.onend = () => setSpeaking(null);
    setSpeaking(id);
    window.speechSynthesis.speak(u);
  };
  const stop = () => { window.speechSynthesis.cancel(); setSpeaking(null); };

  if (!anyActive) return (
    <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center mt-10">
      <div className="text-4xl mb-3">🔒</div>
      <h1 className="text-xl font-extrabold text-slate-800">Audio Studio is locked</h1>
      <p className="text-slate-500 text-sm mt-2">Your trainer hasn't activated a session yet. The Audio Studio unlocks when a session is open.</p>
      <Link to="/" className="inline-block mt-5 text-sm font-semibold text-brand">← Back to Home</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">🎧 Audio Studio — Model vs Flawed Answers</h1>
        <p className="text-sm text-slate-500">Click play to hear the difference. Uses your browser's built-in voice — no microphone or camera needed.</p>
      </div>
      {AUDIO_CLIPS.map((c, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
          <span className="text-[11px] font-bold text-brand bg-indigo-50 px-2 py-0.5 rounded-full">{c.category}</span>
          <h3 className="font-bold text-slate-800 mt-2">{c.title}</h3>
          <p className="text-xs text-slate-500 mt-1 mb-3">{c.desc}</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="border border-red-100 bg-red-50/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-red-600">⚠ Flawed delivery</span>
                <button onClick={() => speaking === `f${i}` ? stop() : speak(`f${i}`, c.flawed)} className="text-xs font-bold bg-red-500 text-white px-3 py-1 rounded-lg">
                  {speaking === `f${i}` ? '■ Stop' : '▶ Listen'}
                </button>
              </div>
              <p className="text-sm text-slate-600 italic">"{c.flawed}"</p>
            </div>
            <div className="border border-emerald-100 bg-emerald-50/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-700">✓ Model answer</span>
                <button onClick={() => speaking === `m${i}` ? stop() : speak(`m${i}`, c.model)} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1 rounded-lg">
                  {speaking === `m${i}` ? '■ Stop' : '▶ Listen'}
                </button>
              </div>
              <p className="text-sm text-slate-700">"{c.model}"</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
