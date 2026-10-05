import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getMyResults } from '../lib/db';
import { evaluateBadges } from '../lib/logic';
import { QuizResult, Badge } from '../types';

const ALL_BADGES: { code: string; title: string; tier: string; how: string }[] = [
  { code: 'FIRST_STEP', title: 'First Step', tier: 'Bronze', how: 'Complete your first quiz' },
  { code: 'HIGH_ACHIEVER', title: 'High Achiever', tier: 'Silver', how: 'Score 80%+ on any quiz' },
  { code: 'HALFWAY_HERO', title: 'Halfway Hero', tier: 'Silver', how: 'Complete 3 different days' },
  { code: 'PERFECT_SCORE', title: 'Perfect Score', tier: 'Gold', how: 'Score 100% on any quiz' },
  { code: 'BOOTCAMP_CHAMPION', title: 'Bootcamp Champion', tier: 'Gold', how: 'Complete all 5 days' },
];
const TIER_COLOR: Record<string, string> = { Bronze: 'bg-amber-100 text-amber-700 border-amber-200', Silver: 'bg-slate-100 text-slate-600 border-slate-300', Gold: 'bg-yellow-100 text-yellow-700 border-yellow-300' };

export default function Badges() {
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  useEffect(() => { if (user) getMyResults(user.id).then(setResults); }, [user]);
  const earned = new Set(evaluateBadges(results).map(b => b.code));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Your Badges</h1>
        <p className="text-sm text-slate-500">Earn badges by completing quizzes and hitting score milestones.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALL_BADGES.map(b => {
          const has = earned.has(b.code);
          return (
            <div key={b.code} className={`rounded-xl p-4 border-2 ${has ? TIER_COLOR[b.tier] : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase">{b.tier}</span>
                {has ? <span className="text-xs font-bold">✓ Earned</span> : <span className="text-xs text-slate-400">Locked</span>}
              </div>
              <h3 className="font-extrabold mt-1">{b.title}</h3>
              <p className="text-xs mt-1 opacity-80">{b.how}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
