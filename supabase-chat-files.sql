-- CHAT-FILES: anexos de mensagem (canal + DM). Idempotente.
-- Bucket público com paths imprevisíveis (mesmo padrão dos ícones).
-- Leitura pública; escrita/apagar só na própria pasta (primeiro segmento útil = uid).
-- Layout: chat-files/ch/<serverId>/<channelId>/<uid>/<ts>-<nome>
--         chat-files/dm/<convId>/<uid>/<ts>-<nome>

insert into storage.buckets (id, name, public) values ('chat-files', 'chat-files', true)
on conflict (id) do nothing;

alter table messages add column if not exists file_url text;
alter table messages add column if not exists file_name text;
alter table messages add column if not exists file_type text;

alter table dm_messages add column if not exists file_url text;
alter table dm_messages add column if not exists file_name text;
alter table dm_messages add column if not exists file_type text;

-- Leitura pública; escrita/apagar só na própria pasta do uid
drop policy if exists "chat-files public read" on storage.objects;
drop policy if exists "chat-files owner write" on storage.objects;
drop policy if exists "chat-files owner update" on storage.objects;
drop policy if exists "chat-files owner delete" on storage.objects;
create policy "chat-files public read" on storage.objects for select using (bucket_id = 'chat-files');
create policy "chat-files owner write" on storage.objects for insert
  with check (
    bucket_id = 'chat-files' and auth.role() = 'authenticated'
    and (
      ((storage.foldername(name))[1] = 'ch' and (storage.foldername(name))[4] = auth.uid()::text)
      or ((storage.foldername(name))[1] = 'dm' and (storage.foldername(name))[3] = auth.uid()::text)
    )
  );
create policy "chat-files owner update" on storage.objects for update
  using (
    bucket_id = 'chat-files'
    and (
      ((storage.foldername(name))[1] = 'ch' and (storage.foldername(name))[4] = auth.uid()::text)
      or ((storage.foldername(name))[1] = 'dm' and (storage.foldername(name))[3] = auth.uid()::text)
    )
  )
  with check (
    bucket_id = 'chat-files'
    and (
      ((storage.foldername(name))[1] = 'ch' and (storage.foldername(name))[4] = auth.uid()::text)
      or ((storage.foldername(name))[1] = 'dm' and (storage.foldername(name))[3] = auth.uid()::text)
    )
  );
create policy "chat-files owner delete" on storage.objects for delete
  using (
    bucket_id = 'chat-files'
    and (
      ((storage.foldername(name))[1] = 'ch' and (storage.foldername(name))[4] = auth.uid()::text)
      or ((storage.foldername(name))[1] = 'dm' and (storage.foldername(name))[3] = auth.uid()::text)
    )
  );
