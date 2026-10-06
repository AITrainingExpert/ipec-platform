import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getMyResults, getMyDrills } from '../lib/db';
import { evaluateBadges } from '../lib/logic';
import { drillsFor } from '../lib/bank';
import { useMyTrack } from '../lib/tracks';
import { QuizResult, DrillResult } from '../types';

const tierColor: Record<string, string> = {
  Bronze:   'bg-amber-100 text-amber-700 border-amber-200',
  Silver:   'bg-slate-100 text-slate-600 border-slate-300',
  Gold:     'bg-yellow-100 text-yellow-700 border-yellow-300',
  Platinum: 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

export default function Profile() {
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [drills, setDrills] = useState<DrillResult[]>([]);
  const { track } = useMyTrack();
  const DRILLS = drillsFor(track);

  useEffect(() => {
    if (!user) return;
    getMyResults(user.id).then(setResults);
    getMyDrills(user.id).then(setDrills);
  }, [user]);

  const quizBadges = evaluateBadges(results);
  const passedDrills = drills.filter(d => d.passed);
  const drillXp = passedDrills.reduce((s, d) => s + d.xpEarned, 0);
  const quizXp = results.length * 20 + results.filter(r => r.percentage >= 80).length * 30;
  const totalXp = drillXp + quizXp;
  const level = Math.floor(totalXp / 200) + 1;
  const xpIntoLevel = totalXp % 200;

  const earnedDrillIds = new Set(passedDrills.map(d => d.drillId));

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-brand to-indigo-500 text-white rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-extrabold">{user?.name?.[0]}</div>
          <div>
            <h1 className="text-xl font-extrabold">{user?.name}</h1>
            <p className="text-indigo-100 text-sm">{user?.branch} {user?.year} · {user?.college}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-extrabold">Level {level}</div>
            <div className="text-[11px] text-indigo-100">{totalXp} XP total</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-indigo-100 mb-1"><span>Level {level}</span><span>{xpIntoLevel} / 200 to next</span></div>
          <div className="h-2 bg-white/20 rounded-full"><div className="h-2 bg-white rounded-full" style={{ width: `${(xpIntoLevel / 200) * 100}%` }} /></div>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-slate-800 mb-3">Milestone Badges</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {['FIRST_STEP', 'HIGH_ACHIEVER', 'HALFWAY_HERO', 'BOOTCAMP_CHAMPION', 'PERFECT_SCORE'].map(code => {
            const b = quizBadges.find(x => x.code === code);
            const meta: Record<string, { t: string; tier: string; how: string }> = {
              FIRST_STEP: { t: 'First Step', tier: 'Bronze', how: 'Complete a quiz' },
              HIGH_ACHIEVER: { t: 'High Achiever', tier: 'Silver', how: 'Score 80%+' },
              HALFWAY_HERO: { t: 'Halfway Hero', tier: 'Silver', how: 'Finish 3 days' },
              BOOTCAMP_CHAMPION: { t: 'Bootcamp Champion', tier: 'Gold', how: 'All 5 days' },
              PERFECT_SCORE: { t: 'Perfect Score', tier: 'Gold', how: 'Score 100%' },
            };
            const m = meta[code]; const has = !!b;
            return (
              <div key={code} className={`rounded-xl p-4 border-2 ${has ? tierColor[m.tier] : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                <div className="flex justify-between"><span className="text-[10px] font-bold uppercase">{m.tier}</span>{has && <span className="text-[10px] font-bold">✓</span>}</div>
                <h3 className="font-extrabold text-sm mt-1">{m.t}</h3>
                <p className="text-[11px] mt-1 opacity-80">{m.how}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-bold text-slate-800 mb-3">Drill Trophy Cabinet ({earnedDrillIds.size} / {DRILLS.length})</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DRILLS.map(dr => {
            const has = earnedDrillIds.has(dr.id);
            return (
              <div key={dr.id} className={`rounded-xl p-3 border-2 ${has ? tierColor[dr.badgeTier] : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                <div className="flex justify-between"><span className="text-[10px] font-bold uppercase">{dr.badgeTier}</span>{has ? <span className="text-[10px] font-bold">✓ +{dr.xp}XP</span> : <span className="text-[10px] text-slate-400">Locked</span>}</div>
                <h3 className="font-bold text-sm mt-1">{dr.badgeTitle}</h3>
                <p className="text-[11px] mt-0.5 opacity-70">Day {dr.day} · {dr.session}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
