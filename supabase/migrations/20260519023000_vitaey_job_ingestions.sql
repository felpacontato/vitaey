create table if not exists public.vitaey_job_ingestions (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  jobs_count integer not null default 0,
  status text not null check (status in ('completed', 'failed')),
  error_detail text,
  created_at timestamptz not null default now()
);

alter table public.vitaey_job_ingestions enable row level security;

grant insert on public.vitaey_job_ingestions to service_role;

