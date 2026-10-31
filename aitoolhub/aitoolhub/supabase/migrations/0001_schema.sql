-- AIToolHub: core schema (Phase 1)
create extension if not exists "pgcrypto";

create type user_role as enum ('user','admin');
create type user_status as enum ('active','suspended');
create type pricing_type as enum ('free','freemium','paid','free_trial');
create type tool_status as enum ('draft','published','unpublished');
create type submission_status as enum ('pending','approved','rejected');
create type review_status as enum ('visible','hidden');

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- users (profile row per auth.users row)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null unique,
  role user_role not null default 'user',
  avatar_url text,
  status user_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

create table public.ai_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text,
  short_description text not null,
  full_description text,
  logo_url text,
  screenshots text[] not null default '{}',
  official_url text not null check (official_url ~* '^https?://'),
  pricing_type pricing_type not null default 'freemium',
  pricing_details text,
  features text[] not null default '{}',
  capabilities text[] not null default '{}',
  platforms text[] not null default '{}',
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  tags text[] not null default '{}',
  use_case text,
  -- launch_date is only set when an admin has verified it. Never infer from created_at.
  launch_date date,
  launch_date_verified boolean not null default false,
  category_id uuid references public.categories(id) on delete set null,
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  status tool_status not null default 'draft',
  published_at timestamptz,
  views_count bigint not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(tagline,'') || ' ' || coalesce(short_description,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(full_description,'')), 'C')
  ) stored,
  constraint verified_needs_date check (not launch_date_verified or launch_date is not null)
);
create trigger ai_tools_updated before update on public.ai_tools
  for each row execute function set_updated_at();

-- Auto-set published_at the first time a tool is published
create or replace function set_published_at() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then new.published_at = now(); end if;
  return new;
end $$;
create trigger ai_tools_published before insert or update on public.ai_tools
  for each row execute function set_published_at();

create table public.tool_categories (   -- additional categories
  tool_id uuid references public.ai_tools(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  primary key (tool_id, category_id)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tool_id uuid not null references public.ai_tools(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, tool_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tool_id uuid not null references public.ai_tools(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review text check (char_length(review) <= 2000),
  status review_status not null default 'visible',
  created_at timestamptz not null default now(),
  unique (user_id, tool_id)
);

create table public.tool_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  tool_id uuid not null references public.ai_tools(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table public.tool_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tool_data jsonb not null,
  status submission_status not null default 'pending',
  admin_feedback text,
  created_at timestamptz not null default now()
);

create table public.outdated_reports (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.ai_tools(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  message text not null check (char_length(message) <= 1000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- Indexes
create index ai_tools_search_idx on public.ai_tools using gin (search);
create index ai_tools_tags_idx on public.ai_tools using gin (tags);
create index ai_tools_platforms_idx on public.ai_tools using gin (platforms);
create index ai_tools_listing_idx on public.ai_tools (status, published_at desc);
create index ai_tools_category_idx on public.ai_tools (category_id);
create index ai_tools_views_idx on public.ai_tools (views_count desc);
create index favorites_user_idx on public.favorites (user_id);
create index reviews_tool_idx on public.reviews (tool_id);
create index tool_views_tool_time_idx on public.tool_views (tool_id, viewed_at desc);
create index tool_views_user_time_idx on public.tool_views (user_id, viewed_at desc);
create index submissions_status_idx on public.tool_submissions (status);

-- Create a profile row on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
