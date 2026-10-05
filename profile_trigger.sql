-- ============================================================
-- FIX: auto-create a profile row whenever a user signs up.
-- This runs server-side (SECURITY DEFINER), so it never hits
-- the timing/RLS issue that left profiles empty.
-- Role, name, mobile etc. are passed in signup metadata.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, mobile, branch, year, college, batch_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'participant'),
    new.raw_user_meta_data->>'mobile',
    new.raw_user_meta_data->>'branch',
    new.raw_user_meta_data->>'year',
    new.raw_user_meta_data->>'college',
    coalesce(new.raw_user_meta_data->>'batch_id', 'batch-1')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Seed 5 batches (Batch 1..5) for the 5 trainers.
-- ============================================================
insert into batches (id, name, college) values
  ('batch-1','Batch 1','Your College'),
  ('batch-2','Batch 2','Your College'),
  ('batch-3','Batch 3','Your College'),
  ('batch-4','Batch 4','Your College'),
  ('batch-5','Batch 5','Your College')
on conflict (id) do nothing;
