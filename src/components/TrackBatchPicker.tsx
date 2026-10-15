import { useEffect, useMemo, useState } from 'react';
import { Batch, Track, User } from '../types';
import { trackOfBatch } from '../lib/tracks';

// ============================================================
// TRACK + BATCH SCOPE for admin pages (Analytics, All Results,
// Reports, Participants). Senior and Junior data are never mixed:
// the admin always looks at ONE track, all of its batches or one.
// The choice is remembered across pages. Trainers are fixed to
// their own batch.
// ============================================================

export interface Scope { track: Track; batchId: string }   // batchId '' = every batch of the track

const KEY = 'ipec_admin_scope';
const readSaved = (): Scope | null => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return s && (s.track === 'senior' || s.track === 'junior') ? { track: s.track, batchId: String(s.batchId || '') } : null;
  } catch { return null; }
};

export function useScope(user: User | null, batches: Batch[]) {
  const isAdmin = user?.role === 'admin';
  const [scope, setScopeState] = useState<Scope>(() => readSaved() || { track: 'senior', batchId: '' });

  // Trainers: always their own batch (and its track)
  const own = batches.find(b => b.id === user?.batchId);
  const effective: Scope = isAdmin ? scope : { track: trackOfBatch(own, user?.year), batchId: user?.batchId || '' };

  const setScope = (s: Scope) => {
    setScopeState(s);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  };

  // A remembered batch that no longer belongs to the track → show the whole track
  useEffect(() => {
    if (!isAdmin || !scope.batchId || !batches.length) return;
    const b = batches.find(x => x.id === scope.batchId);
    if (!b || trackOfBatch(b) !== scope.track) setScope({ ...scope, batchId: '' });
  }, [batches, scope, isAdmin]);

  const trackBatches = useMemo(() => batches.filter(b => trackOfBatch(b) === effective.track), [batches, effective.track]);
  const batchIds = useMemo(
    () => new Set(effective.batchId ? [effective.batchId] : trackBatches.map(b => b.id)),
    [effective.batchId, trackBatches],
  );
  const label = effective.batchId
    ? (batches.find(b => b.id === effective.batchId)?.name || effective.batchId)
    : `All ${effective.track === 'senior' ? 'Senior' : 'Junior'} batches`;

  return { scope: effective, setScope, trackBatches, batchIds, label, isAdmin };
}

export const TRACK_NAME: Record<Track, string> = { senior: 'Senior Champions', junior: 'Junior Champions' };

export default function TrackBatchPicker({ scope, setScope, trackBatches, isAdmin, counts }: {
  scope: Scope; setScope: (s: Scope) => void; trackBatches: Batch[]; isAdmin: boolean;
  counts?: Record<string, number>;           // optional number shown next to each batch
}) {
  if (!isAdmin) {
    const b = trackBatches.find(x => x.id === scope.batchId);
    return <span className="text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg px-3 py-1.5">{b?.name || scope.batchId} · {TRACK_NAME[scope.track]}</span>;
  }
  const total = counts ? trackBatches.reduce((s, b) => s + (counts[b.id] || 0), 0) : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
        {(['senior', 'junior'] as Track[]).map(t => (
          <button key={t} onClick={() => setScope({ track: t, batchId: '' })}
            className={`px-3 py-1.5 text-sm font-bold rounded-md ${scope.track === t
              ? (t === 'senior' ? 'bg-violet-600 text-white' : 'bg-sky-600 text-white')
              : 'text-slate-500 hover:text-slate-700'}`}>
            {TRACK_NAME[t]}
          </button>
        ))}
      </div>
      <select value={scope.batchId} onChange={e => setScope({ ...scope, batchId: e.target.value })}
        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white">
        <option value="">All {scope.track === 'senior' ? 'Senior' : 'Junior'} batches{total !== undefined ? ` (${total})` : ''}</option>
        {trackBatches.map(b => <option key={b.id} value={b.id}>{b.name}{counts ? ` (${counts[b.id] || 0})` : ''}</option>)}
      </select>
    </div>
  );
}
