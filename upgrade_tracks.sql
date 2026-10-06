-- ============================================================
-- iPEC Employability Edge — UPGRADE: Junior/Senior tracks,
-- syllabus question bank, certificate lock, trainer feedback.
-- Run ONCE in Supabase > SQL Editor > New query > Run.
-- Safe to run again (every step skips what already exists).
-- ============================================================

-- 1. Each batch belongs to a track: 'junior' (Junior Champions) or 'senior' (Senior Champions)
alter table batches add column if not exists track text;

-- 2. Existing batch-1 … batch-8 = Junior Champions (renamed "Junior Batch N" so they
--    can't be confused with Senior Batch N). Change any of these later in Admin > Batches & tracks.
update batches
   set track = 'junior',
       name  = 'Junior Batch ' || substring(id from 'batch-(\d+)')
 where id ~ '^batch-[1-8]$'
   and track is null;

-- 3. Senior Champions: Senior Batch 1 … 10 (ids sr-1 … sr-10)
insert into batches (id, name, college, track)
select 'sr-' || n, 'Senior Batch ' || n,
       coalesce((select college from batches where id = 'batch-1'), 'Your College'), 'senior'
from generate_series(1, 10) as n
on conflict (id) do nothing;

-- 4. Trainer-uploaded questions now carry track / day / session / topic.
--    Old rows without a track are ignored by the app (syllabus-only quizzes).
alter table questions add column if not exists track text;
alter table questions add column if not exists slot  text;
alter table questions add column if not exists topic text;

-- Trainers (not only admin) may add questions
drop policy if exists "staff add questions" on questions;
create policy "staff add questions" on questions for insert
  with check (public.user_role(auth.uid()) in ('trainer','admin'));

-- 5. Results remember the session slot / activity / attempt (used by session-wise reports)
alter table results add column if not exists session_slot   text;
alter table results add column if not exists activity_type  text;
alter table results add column if not exists attempt_number int;

-- 6. Certificates: LOCK every batch now. Admin releases batch-by-batch
--    (or all Junior / all Senior) from Admin > Certificates > Certificate Release.
alter table cert_settings add column if not exists college_signature_url text;
update cert_settings set download_enabled = false;

-- 7. Check the result
select id, name, track from batches order by track, id;
