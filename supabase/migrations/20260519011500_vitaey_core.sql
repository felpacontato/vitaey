create extension if not exists pgcrypto;

create table if not exists public.vitaey_jobs (
  id text primary key,
  title text not null,
  company text not null,
  location text not null,
  work_model text not null check (work_model in ('remote', 'hybrid', 'onsite')),
  employment_type text not null check (employment_type in ('clt', 'pj', 'contract', 'internship')),
  seniority text not null,
  salary_min integer,
  salary_max integer,
  score integer not null check (score between 0 and 100),
  posted_days_ago integer not null default 0,
  source text not null default 'manual_demo',
  source_url text,
  description text not null,
  requirements text[] not null default '{}',
  benefits text[] not null default '{}',
  gaps text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vitaey_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null references public.vitaey_jobs(id) on delete cascade,
  stage text not null check (stage in ('saved', 'prepared', 'applied', 'interviewing', 'offered')),
  company text not null,
  title text not null,
  sent_at date,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

alter table public.vitaey_jobs enable row level security;
alter table public.vitaey_applications enable row level security;

grant select on public.vitaey_jobs to anon, authenticated;
grant select, insert, update, delete on public.vitaey_applications to authenticated;

drop policy if exists "Vitaey jobs are public readable" on public.vitaey_jobs;
create policy "Vitaey jobs are public readable"
on public.vitaey_jobs
for select
to anon, authenticated
using (true);

drop policy if exists "Users can read their Vitaey applications" on public.vitaey_applications;
create policy "Users can read their Vitaey applications"
on public.vitaey_applications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their Vitaey applications" on public.vitaey_applications;
create policy "Users can create their Vitaey applications"
on public.vitaey_applications
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their Vitaey applications" on public.vitaey_applications;
create policy "Users can update their Vitaey applications"
on public.vitaey_applications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their Vitaey applications" on public.vitaey_applications;
create policy "Users can delete their Vitaey applications"
on public.vitaey_applications
for delete
to authenticated
using (auth.uid() = user_id);

insert into public.vitaey_jobs (
  id,
  title,
  company,
  location,
  work_model,
  employment_type,
  seniority,
  salary_min,
  salary_max,
  score,
  posted_days_ago,
  source,
  source_url,
  description,
  requirements,
  benefits,
  gaps
) values
  (
    'job_001',
    'Product Designer Pleno',
    'NuvemLabs',
    'Remoto Brasil',
    'remote',
    'clt',
    'pleno',
    9000,
    12500,
    92,
    2,
    'manual_demo',
    'https://example.com/jobs/product-designer-pleno',
    'Atuar em squads de produto B2B SaaS, conduzir discovery, prototipos e evoluir design system.',
    array['figma', 'ux research', 'design system', 'saas', 'prototipacao'],
    array['Plano de saude', 'Remoto', 'Auxilio educacao'],
    array['Ingles avancado desejavel']
  ),
  (
    'job_002',
    'UX Researcher',
    'ContaVerde',
    'Sao Paulo, SP',
    'hybrid',
    'clt',
    'senior',
    11000,
    14500,
    84,
    5,
    'manual_demo',
    'https://example.com/jobs/ux-researcher',
    'Pesquisa com usuarios, entrevistas, analise qualitativa e priorizacao com times de produto.',
    array['ux research', 'analytics', 'entrevistas', 'product discovery'],
    array['Hibrido', 'Bonus anual'],
    array['Case recente de pesquisa quantitativa']
  ),
  (
    'job_003',
    'Product Manager',
    'HealthSync',
    'Curitiba, PR',
    'remote',
    'pj',
    'pleno',
    12000,
    17000,
    78,
    1,
    'manual_demo',
    'https://example.com/jobs/product-manager',
    'Definir roadmap, acompanhar metricas e liderar descoberta em produto de saude digital.',
    array['roadmap', 'analytics', 'discovery', 'saas', 'stakeholders'],
    array['Remoto', 'Horario flexivel'],
    array['Experiencia direta em healthtech']
  )
on conflict (id) do update set
  title = excluded.title,
  company = excluded.company,
  location = excluded.location,
  work_model = excluded.work_model,
  employment_type = excluded.employment_type,
  seniority = excluded.seniority,
  salary_min = excluded.salary_min,
  salary_max = excluded.salary_max,
  score = excluded.score,
  posted_days_ago = excluded.posted_days_ago,
  source = excluded.source,
  source_url = excluded.source_url,
  description = excluded.description,
  requirements = excluded.requirements,
  benefits = excluded.benefits,
  gaps = excluded.gaps,
  updated_at = now();
