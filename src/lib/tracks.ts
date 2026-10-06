// ============================================================
// TRACK RESOLUTION — which syllabus (Junior / Senior) a user follows.
// Source of truth = the batch's `track` column (set by admin).
// Fallbacks: batch id/name ("sr-3", "Senior Batch 3"), then the
// participant's year (1st/2nd = Junior, 3rd/4th = Senior).
// ============================================================
import { useEffect, useState } from 'react';
import { Batch, Track, User } from '../types';
import { getBatches } from './db';
import { useAuth } from './auth';

export function trackFromYear(year?: string): Track {
  const y = (year || '').toLowerCase();
  return /\b(1st|2nd|first|second)\b|^[12]/.test(y) ? 'junior' : 'senior';
}

export function trackOfBatch(b?: Batch | null, year?: string): Track {
  if (b?.track === 'junior' || b?.track === 'senior') return b.track;
  const key = `${b?.id || ''} ${b?.name || ''}`.toLowerCase();
  if (/\bsr\b|^sr-|senior/.test(key)) return 'senior';
  if (/\bjr\b|^jr-|junior/.test(key)) return 'junior';
  return trackFromYear(year);
}

let batchCache: Promise<Batch[]> | null = null;
export function cachedBatches(refresh = false): Promise<Batch[]> {
  if (!batchCache || refresh) batchCache = getBatches().catch(() => []);
  return batchCache;
}

export async function trackForUser(u: User | null): Promise<Track> {
  if (!u) return 'senior';
  const batches = await cachedBatches();
  return trackOfBatch(batches.find(b => b.id === u.batchId), u.year);
}

/**
 * The signed-in user's track. Staff (trainer/admin) can preview the other
 * track with `?track=junior|senior` or the `override` argument.
 */
export function useMyTrack(override?: Track | null): { track: Track; loading: boolean } {
  const { user } = useAuth();
  const [track, setTrack] = useState<Track>('senior');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const isStaff = user?.role === 'trainer' || user?.role === 'admin';
    if (isStaff && override) { setTrack(override); setLoading(false); return; }
    trackForUser(user).then(t => { if (alive) { setTrack(t); setLoading(false); } });
    return () => { alive = false; };
  }, [user, override]);
  return { track, loading };
}
