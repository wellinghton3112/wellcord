-- COLE NO SQL EDITOR E CLIQUE RUN
alter table channels add column if not exists icon text;
alter table channels add column if not exists image_url text;

-- Bucket para ícones de canais (Storage)
insert into storage.buckets (id, name, public) values ('channel-icons', 'channel-icons', true)
on conflict (id) do nothing;

-- Políticas para o bucket: logados podem subir/ver
drop policy if exists "channel-icons public read" on storage.objects;
create policy "channel-icons public read" on storage.objects for select using (bucket_id = 'channel-icons');
drop policy if exists "channel-icons logados upload" on storage.objects;
create policy "channel-icons logados upload" on storage.objects for insert with check (bucket_id = 'channel-icons' and auth.role() = 'authenticated');
drop policy if exists "channel-icons logados update" on storage.objects;
create policy "channel-icons logados update" on storage.objects for update using (bucket_id = 'channel-icons' and auth.role() = 'authenticated');
drop policy if exists "channel-icons logados delete" on storage.objects;
create policy "channel-icons logados delete" on storage.objects for delete using (bucket_id = 'channel-icons' and auth.role() = 'authenticated');
