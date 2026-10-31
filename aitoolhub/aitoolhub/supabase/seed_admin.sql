-- Creates a pre-verified admin for testing. Run once in the Supabase SQL editor AFTER migrations 0001-0004.
-- Change the email/password below if you prefer your own, and change the password after your first login.
do $$
declare uid uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = 'admin@aitoolhub.dev') then
    update public.users set role = 'admin' where email = 'admin@aitoolhub.dev';
    return;
  end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'admin@aitoolhub.dev',
    extensions.crypt('Hub-481efdb26c-dbe7c8', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"name":"Admin"}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', 'admin@aitoolhub.dev', 'email_verified', true), 'email', now(), now(), now());
  update public.users set role = 'admin' where id = uid;
end $$;
