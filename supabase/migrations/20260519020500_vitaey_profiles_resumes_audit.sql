create table if not exists public.vitaey_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  headline text,
  location text,
  seniority text,
  target_roles text[] not null default '{}',
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  salary_min integer,
  remote_first boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vitaey_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  extracted_text text,
  extracted_skills text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.vitaey_application_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.vitaey_applications(id) on delete cascade,
  event_type text not null,
  reviewed_fields text[] not null default '{}',
  message text,
  created_at timestamptz not null default now()
);

alter table public.vitaey_profiles enable row level security;
alter table public.vitaey_resumes enable row level security;
alter table public.vitaey_application_audit enable row level security;

grant select, insert, update, delete on public.vitaey_profiles to authenticated;
grant select, insert, update, delete on public.vitaey_resumes to authenticated;
grant select, insert on public.vitaey_application_audit to authenticated;

drop policy if exists "Users can read their Vitaey profile" on public.vitaey_profiles;
create policy "Users can read their Vitaey profile"
on public.vitaey_profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create their Vitaey profile" on public.vitaey_profiles;
create policy "Users can create their Vitaey profile"
on public.vitaey_profiles
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their Vitaey profile" on public.vitaey_profiles;
create policy "Users can update their Vitaey profile"
on public.vitaey_profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their Vitaey profile" on public.vitaey_profiles;
create policy "Users can delete their Vitaey profile"
on public.vitaey_profiles
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can read their Vitaey resumes" on public.vitaey_resumes;
create policy "Users can read their Vitaey resumes"
on public.vitaey_resumes
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create their Vitaey resumes" on public.vitaey_resumes;
create policy "Users can create their Vitaey resumes"
on public.vitaey_resumes
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their Vitaey resumes" on public.vitaey_resumes;
create policy "Users can update their Vitaey resumes"
on public.vitaey_resumes
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their Vitaey resumes" on public.vitaey_resumes;
create policy "Users can delete their Vitaey resumes"
on public.vitaey_resumes
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can read their Vitaey audit" on public.vitaey_application_audit;
create policy "Users can read their Vitaey audit"
on public.vitaey_application_audit
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create their Vitaey audit" on public.vitaey_application_audit;
create policy "Users can create their Vitaey audit"
on public.vitaey_application_audit
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vitaey-resumes',
  'vitaey-resumes',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their Vitaey resume files" on storage.objects;
create policy "Users can read their Vitaey resume files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vitaey-resumes'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload their Vitaey resume files" on storage.objects;
create policy "Users can upload their Vitaey resume files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vitaey-resumes'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their Vitaey resume files" on storage.objects;
create policy "Users can update their Vitaey resume files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vitaey-resumes'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'vitaey-resumes'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their Vitaey resume files" on storage.objects;
create policy "Users can delete their Vitaey resume files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vitaey-resumes'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
