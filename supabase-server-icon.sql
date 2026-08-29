-- COLE NO SQL EDITOR E CLIQUE RUN
alter table servers add column if not exists image_url text;
alter table servers add column if not exists banner_url text;

insert into storage.buckets (id, name, public) values ('server-icons', 'server-icons', true)
on conflict (id) do nothing;

drop policy if exists "server-icons public read" on storage.objects;
create policy "server-icons public read" on storage.objects for select using (bucket_id = 'server-icons');
drop policy if exists "server-icons logados upload" on storage.objects;
create policy "server-icons logados upload" on storage.objects for insert with check (bucket_id = 'server-icons' and auth.role() = 'authenticated');
drop policy if exists "server-icons logados update" on storage.objects;
create policy "server-icons logados update" on storage.objects for update using (bucket_id = 'server-icons' and auth.role() = 'authenticated');
drop policy if exists "server-icons logados delete" on storage.objects;
create policy "server-icons logados delete" on storage.objects for delete using (bucket_id = 'server-icons' and auth.role() = 'authenticated');
