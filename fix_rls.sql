-- ============================================================
-- FIX: recursive RLS on profiles made every login fall back to
-- "participant". Replace the recursive staff policies with a
-- SECURITY DEFINER helper that reads a user's role WITHOUT
-- triggering RLS recursion.
-- ============================================================

-- 1. Helper: get a user's role, bypassing RLS (no recursion).
create or replace function public.user_role(uid uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = uid;
$$;

-- 2. Drop the recursive policies that caused the failure.
drop policy if exists "staff read profiles" on profiles;
drop policy if exists "staff read results" on results;
drop policy if exists "staff read drills" on drill_results;
drop policy if exists "staff manage allowed_emails" on allowed_emails;
drop policy if exists "staff manage session_locks" on session_locks;
drop policy if exists "staff read feedback" on feedback;
drop policy if exists "admin manage batches" on batches;
drop policy if exists "admin manage questions" on questions;

-- 3. Recreate them using the helper function (no recursion).
create policy "staff read profiles" on profiles for select
  using (public.user_role(auth.uid()) in ('trainer','admin'));

create policy "staff read results" on results for select
  using (public.user_role(auth.uid()) in ('trainer','admin'));

create policy "staff read drills" on drill_results for select
  using (public.user_role(auth.uid()) in ('trainer','admin'));

create policy "staff manage allowed_emails" on allowed_emails for all
  using (public.user_role(auth.uid()) in ('trainer','admin'));

create policy "staff manage session_locks" on session_locks for all
  using (public.user_role(auth.uid()) in ('trainer','admin'));

create policy "staff read feedback" on feedback for select
  using (public.user_role(auth.uid()) in ('trainer','admin'));

create policy "admin manage batches" on batches for all
  using (public.user_role(auth.uid()) = 'admin');

create policy "admin manage questions" on questions for all
  using (public.user_role(auth.uid()) = 'admin');
