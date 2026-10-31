-- RLS, roles, helpers, storage (Phase 1)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin' and status = 'active');
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and status = 'active');
$$;

-- Block self-promotion: only admins can change role/status
create or replace function protect_user_columns() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status or new.email is distinct from old.email)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Not allowed to change role, status or email';
  end if;
  return new;
end $$;
create trigger users_protect before update on public.users
  for each row execute function protect_user_columns();

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.ai_tools enable row level security;
alter table public.tool_categories enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.tool_views enable row level security;
alter table public.tool_submissions enable row level security;
alter table public.outdated_reports enable row level security;
alter table public.admin_logs enable row level security;

-- users
create policy users_select_own_or_admin on public.users for select using (id = auth.uid() or public.is_admin());
create policy users_update_own on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy users_admin_all on public.users for all using (public.is_admin()) with check (public.is_admin());

-- categories
create policy categories_public_read on public.categories for select using (true);
create policy categories_admin_write on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- ai_tools
create policy tools_public_read on public.ai_tools for select using (status = 'published' or public.is_admin());
create policy tools_admin_write on public.ai_tools for all using (public.is_admin()) with check (public.is_admin());

create policy toolcats_public_read on public.tool_categories for select using (true);
create policy toolcats_admin_write on public.tool_categories for all using (public.is_admin()) with check (public.is_admin());

-- favorites
create policy fav_own on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active_user());

-- reviews
create policy reviews_public_read on public.reviews for select using (status = 'visible' or user_id = auth.uid() or public.is_admin());
create policy reviews_insert_own on public.reviews for insert with check (user_id = auth.uid() and public.is_active_user());
create policy reviews_update_own on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'visible');
create policy reviews_delete_own on public.reviews for delete using (user_id = auth.uid());
create policy reviews_admin on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- tool_views (written only via RPC below)
create policy views_own_read on public.tool_views for select using (user_id = auth.uid() or public.is_admin());

-- submissions
create policy subs_insert_own on public.tool_submissions for insert with check (user_id = auth.uid() and status = 'pending' and public.is_active_user());
create policy subs_read_own on public.tool_submissions for select using (user_id = auth.uid() or public.is_admin());
create policy subs_admin on public.tool_submissions for update using (public.is_admin()) with check (public.is_admin());

-- outdated reports
create policy reports_insert on public.outdated_reports for insert with check (auth.uid() is not null);
create policy reports_admin on public.outdated_reports for all using (public.is_admin()) with check (public.is_admin());

-- admin_logs
create policy logs_admin on public.admin_logs for all using (public.is_admin()) with check (public.is_admin());

-- Record a view (real usage drives trending). Callable by anon + authenticated.
create or replace function public.record_tool_view(p_tool_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from ai_tools where id = p_tool_id and status = 'published') then return; end if;
  insert into tool_views (user_id, tool_id) values (auth.uid(), p_tool_id);
  update ai_tools set views_count = views_count + 1 where id = p_tool_id;
end $$;
grant execute on function public.record_tool_view(uuid) to anon, authenticated;

-- Trending by real views in the last 7 days
create or replace function public.trending_tools(p_limit int default 12)
returns setof public.ai_tools language sql stable security definer set search_path = public as $$
  select t.* from ai_tools t
  join (select tool_id, count(*) c from tool_views where viewed_at > now() - interval '7 days' group by tool_id) v
    on v.tool_id = t.id
  where t.status = 'published'
  order by v.c desc limit p_limit;
$$;

-- Rating aggregates (computed, never hardcoded)
create or replace view public.tool_ratings with (security_invoker = true) as
  select tool_id, round(avg(rating)::numeric,2) as avg_rating, count(*) as review_count
  from public.reviews where status = 'visible' group by tool_id;

-- Storage: public-read assets, admin-only write; avatars per-user folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('tool-assets','tool-assets', true, 2097152, array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('avatars','avatars', true, 1048576, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "tool-assets admin write" on storage.objects for all
  using (bucket_id = 'tool-assets' and public.is_admin()) with check (bucket_id = 'tool-assets' and public.is_admin());
create policy "avatars own write" on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
