-- Newsletter infrastructure: idempotent daily digest
create type subscriber_status as enum ('pending','active','unsubscribed','bounced','complained');
create type run_status as enum ('running','completed','partial','failed');
create type delivery_status as enum ('queued','sent','delivered','failed','bounced','complained');

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  user_id uuid references public.users(id) on delete set null,
  status subscriber_status not null default 'active',
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
create index subscribers_status_idx on public.newsletter_subscribers (status);

-- One row per IST calendar day => duplicate runs impossible
create table public.newsletter_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null unique,
  status run_status not null default 'running',
  is_test boolean not null default false,
  tools_count int not null default 0,
  recipients_count int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- A tool can be in a digest only once (unique tool_id)
create table public.newsletter_run_tools (
  run_id uuid not null references public.newsletter_runs(id) on delete cascade,
  tool_id uuid not null unique references public.ai_tools(id) on delete cascade,
  primary key (run_id, tool_id)
);

create table public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.newsletter_runs(id) on delete cascade,
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  resend_email_id text,
  status delivery_status not null default 'queued',
  error text,
  updated_at timestamptz not null default now(),
  unique (run_id, subscriber_id)         -- safe retries: never double-send to same subscriber
);
create index deliveries_resend_idx on public.newsletter_deliveries (resend_email_id);

-- Verified Resend webhook events (dedupe on svix id)
create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  svix_id text not null unique,
  event_type text not null,
  resend_email_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- Claim today's run. Returns run id, or null if already running/completed.
-- A failed/partial run can be re-claimed for safe retry.
create or replace function public.claim_newsletter_run(p_run_date date, p_is_test boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into newsletter_runs (run_date, is_test) values (p_run_date, p_is_test)
  on conflict (run_date) do update
    set status = 'running', error = null, started_at = now(), finished_at = null
    where newsletter_runs.status in ('failed','partial')
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.claim_newsletter_run(date, boolean) from public, anon, authenticated;

-- Tools published and never included in a digest (launch dates are never inferred)
create or replace function public.digest_eligible_tools()
returns setof public.ai_tools language sql stable security definer set search_path = public as $$
  select t.* from ai_tools t
  where t.status = 'published'
    and not exists (select 1 from newsletter_run_tools rt where rt.tool_id = t.id)
  order by t.published_at desc;
$$;
revoke execute on function public.digest_eligible_tools() from public, anon, authenticated;

alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_runs enable row level security;
alter table public.newsletter_run_tools enable row level security;
alter table public.newsletter_deliveries enable row level security;
alter table public.email_events enable row level security;

create policy subs_admin_all on public.newsletter_subscribers for all using (public.is_admin()) with check (public.is_admin());
create policy runs_admin_read on public.newsletter_runs for select using (public.is_admin());
create policy runtools_admin_read on public.newsletter_run_tools for select using (public.is_admin());
create policy deliveries_admin_read on public.newsletter_deliveries for select using (public.is_admin());
create policy events_admin_read on public.email_events for select using (public.is_admin());
-- Writes to runs/deliveries/events happen only with the service-role key in /api (bypasses RLS).

-- Public subscribe (anon): insert only, active status, via RPC to avoid exposing the table
create or replace function public.subscribe_newsletter(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email'; end if;
  insert into newsletter_subscribers (email) values (lower(trim(p_email)))
  on conflict (email) do update set status = 'active', unsubscribed_at = null
    where newsletter_subscribers.status = 'unsubscribed';
end $$;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
