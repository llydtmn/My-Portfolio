-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- IMPORTANT: change the email below to the email of YOUR admin user (create it under Authentication > Users),
-- and turn OFF "Allow new users to sign up" under Authentication > Sign In / Providers.

create table if not exists portfolio_content (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table portfolio_content enable row level security;
drop policy if exists "public read" on portfolio_content;
drop policy if exists "admin write" on portfolio_content;
create policy "public read" on portfolio_content for select using (true);
create policy "admin write" on portfolio_content for all to authenticated
  using (auth.jwt() ->> 'email' = 'johntiman.08@gmail.com')
  with check (auth.jwt() ->> 'email' = 'johntiman.08@gmail.com');

create table if not exists contact_messages (
  id bigint generated always as identity primary key,
  name text, email text, subject text, message text,
  created_at timestamptz default now()
);
alter table contact_messages add column if not exists created_at timestamptz default now();
alter table contact_messages enable row level security;
drop policy if exists "anyone can send" on contact_messages;
drop policy if exists "admin read messages" on contact_messages;
drop policy if exists "admin delete messages" on contact_messages;
create policy "anyone can send" on contact_messages for insert with check (true);
create policy "admin read messages" on contact_messages for select to authenticated
  using (auth.jwt() ->> 'email' = 'johntiman.08@gmail.com');
create policy "admin delete messages" on contact_messages for delete to authenticated
  using (auth.jwt() ->> 'email' = 'johntiman.08@gmail.com');

insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict (id) do nothing;
drop policy if exists "public read portfolio images" on storage.objects;
drop policy if exists "admin upload portfolio images" on storage.objects;
create policy "public read portfolio images" on storage.objects for select using (bucket_id = 'portfolio');
create policy "admin upload portfolio images" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and auth.jwt() ->> 'email' = 'johntiman.08@gmail.com');
