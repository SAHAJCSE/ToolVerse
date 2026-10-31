alter function public.set_updated_at() set search_path = public;
alter function public.set_published_at() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_user_columns() from public, anon, authenticated;
