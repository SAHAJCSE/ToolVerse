create type candidate_status as enum ('pending','approved','rejected');

create table public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null unique,
  status run_status not null default 'running',
  found_count int not null default 0,
  inserted_count int not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- domain is unique across all days, so a tool is never suggested twice
create table public.tool_candidates (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  rank int not null check (rank between 1 and 5),
  name text not null,
  official_url text not null check (official_url ~* '^https?://'),
  domain text not null unique,
  description text,
  category_slug text,
  source text not null,
  source_url text,
  source_score numeric not null default 0,
  status candidate_status not null default 'pending',
  tool_id uuid references public.ai_tools(id) on delete set null,
  created_at timestamptz not null default now()
);
create index candidates_queue_idx on public.tool_candidates (status, run_date desc, rank);

alter table public.discovery_runs enable row level security;
alter table public.tool_candidates enable row level security;
create policy runs_admin_read on public.discovery_runs for select using (public.is_admin());
create policy cand_admin_read on public.tool_candidates for select using (public.is_admin());
create policy cand_admin_update on public.tool_candidates for update using (public.is_admin()) with check (public.is_admin());
-- inserts come only from the server job using the service-role key (bypasses RLS)
