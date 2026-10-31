-- Google sign-in puts the display name in full_name and the photo in picture; email signup uses name.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (new.id, lower(new.email),
          coalesce(nullif(new.raw_user_meta_data->>'name',''), nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
          coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
  on conflict (id) do nothing;
  return new;
end $$;
