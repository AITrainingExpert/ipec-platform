-- ============================================================
-- iPEC Employability Edge — Supabase schema
-- Run this in Supabase > SQL Editor (one time) to enable
-- real, unlimited multi-user mode.
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role text default 'participant',      -- participant | trainer | admin
  mobile text,
  branch text,
  year text,
  college text,
  batch_id text,
  created_at timestamptz default now()
);

-- 2. BATCHES
create table if not exists batches (
  id text primary key,
  name text not null,
  college text,
  trainer_id uuid,
  created_at timestamptz default now()
);

-- 3. QUESTIONS (load your full 500 here)
create table if not exists questions (
  id text primary key,
  section text,
  day int,
  level text,
  text text,
  options jsonb,     -- array of strings
  answer int         -- correct option index
);

-- 4. RESULTS
create table if not exists results (
  id text primary key,
  user_id uuid,
  user_name text,
  batch_id text,
  day text,
  score int,
  total int,
  percentage int,
  weak_sections jsonb,
  completed_at timestamptz default now()
);

-- 5. DRILL RESULTS (gamified arena)
create table if not exists drill_results (
  id text primary key,
  user_id uuid,
  user_name text,
  batch_id text,
  drill_id text,
  drill_title text,
  badge_title text,
  badge_tier text,
  score int,
  total int,
  percentage int,
  passed boolean,
  xp_earned int,
  completed_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — enforces role permissions at the DB.
-- ============================================================
alter table profiles enable row level security;
alter table results  enable row level security;
alter table drill_results enable row level security;
alter table batches  enable row level security;
alter table questions enable row level security;

-- Everyone can read questions and batches (needed to take quizzes / register).
create policy "read questions" on questions for select using (true);
create policy "read batches"   on batches   for select using (true);

-- A user can read/update their own profile.
create policy "own profile read"   on profiles for select using (auth.uid() = id);
create policy "own profile write"  on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

-- Trainers/admins can read all profiles.
create policy "staff read profiles" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('trainer','admin'))
);

-- A participant can insert their own results and read their own.
create policy "own results insert" on results for insert with check (auth.uid() = user_id);
create policy "own results read"   on results for select using (auth.uid() = user_id);

-- Trainers/admins can read all results.
create policy "staff read results" on results for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('trainer','admin'))
);

-- Drill results: own insert/read, staff read all.
create policy "own drills insert" on drill_results for insert with check (auth.uid() = user_id);
create policy "own drills read"   on drill_results for select using (auth.uid() = user_id);
create policy "staff read drills"  on drill_results for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('trainer','admin'))
);

-- Admins can manage batches and questions.
create policy "admin manage batches" on batches for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "admin manage questions" on questions for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ============================================================
-- SEED: one default batch. Add your 500 questions with inserts like:
-- insert into questions (id,section,day,level,text,options,answer)
--   values ('a1','A',1,'B','What is a growth mindset?',
--   '["Fixed","Developed through effort","Positivity","Memorization"]'::jsonb, 1);
-- ============================================================
insert into batches (id, name, college) values ('batch-1', 'Batch 2026', 'Your College')
  on conflict (id) do nothing;

-- ============================================================
-- PHASE 1-4 ADDITIONS (institutional controls)
-- ============================================================

-- Allowlist: only these emails may register
create table if not exists allowed_emails (
  email text primary key,
  batch_id text,
  added_by text,
  created_at timestamptz default now()
);

-- Session locks: one row per batch + session key (e.g. '1-Morning')
create table if not exists session_locks (
  batch_id text,
  session_key text,
  unlocked boolean default false,
  updated_by text,
  updated_at timestamptz default now(),
  primary key (batch_id, session_key)
);

-- Session feedback
create table if not exists feedback (
  id text primary key,
  user_id uuid,
  user_name text,
  batch_id text,
  session_key text,
  rating_program int,
  rating_trainer int,
  rating_interactivity int,
  rating_engagement int,
  rating_different int,
  comments text,
  created_at timestamptz default now()
);

-- RLS
alter table allowed_emails enable row level security;
alter table session_locks enable row level security;
alter table feedback enable row level security;

-- Allowlist: anyone can read (needed to check at signup); staff manage
create policy "read allowed_emails" on allowed_emails for select using (true);
create policy "staff manage allowed_emails" on allowed_emails for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('trainer','admin'))
);

-- Session locks: anyone can read (participants must see unlock state); staff manage
create policy "read session_locks" on session_locks for select using (true);
create policy "staff manage session_locks" on session_locks for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('trainer','admin'))
);

-- Feedback: own insert, staff read all
create policy "own feedback insert" on feedback for insert with check (auth.uid() = user_id);
create policy "own feedback read" on feedback for select using (auth.uid() = user_id);
create policy "staff read feedback" on feedback for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('trainer','admin'))
);

-- ============================================================
-- CERTIFICATES
-- ============================================================
create table if not exists certificates (
  id text primary key,
  cert_number text unique,
  user_id uuid,
  user_name text,
  usn text,
  semester text,
  batch_id text,
  batch_name text,
  college text,
  branch text,
  final_score numeric,
  badge_level text,
  training_duration text,
  issued_at timestamptz default now(),
  qr_code text,
  download_enabled boolean default false
);

create table if not exists cert_settings (
  batch_id text primary key,
  download_enabled boolean default false,
  college_logo_url text,
  college_signatory_name text,
  college_signatory_title text,
  updated_at timestamptz default now()
);

alter table certificates enable row level security;
alter table cert_settings enable row level security;

-- Participants can read their own cert
create policy "own cert read" on certificates for select using (auth.uid() = user_id);
-- Staff can read/manage all certs
create policy "staff cert read" on certificates for select
  using (public.user_role(auth.uid()) in ('trainer','admin'));
create policy "staff cert write" on certificates for all
  using (public.user_role(auth.uid()) in ('trainer','admin'));
-- Staff manage cert settings
create policy "staff cert settings" on cert_settings for all
  using (public.user_role(auth.uid()) in ('trainer','admin'));
-- Participants read cert settings (to check if download is enabled)
create policy "read cert settings" on cert_settings for select using (true);
