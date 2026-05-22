delete from public.vitaey_application_audit
where application_id in (
  select id
  from public.vitaey_applications
  where job_id in ('job_001', 'job_002', 'job_003')
    or company in ('NuvemLabs', 'ContaVerde', 'HealthSync')
);

delete from public.vitaey_applications
where job_id in ('job_001', 'job_002', 'job_003')
  or company in ('NuvemLabs', 'ContaVerde', 'HealthSync');

delete from public.vitaey_jobs
where source in ('manual_demo', 'demo', 'mock', 'sample')
  or source_url like 'https://example.com/%'
  or id in ('job_001', 'job_002', 'job_003')
  or company in ('NuvemLabs', 'ContaVerde', 'HealthSync');

alter table public.vitaey_jobs
alter column source set default 'official_api';
