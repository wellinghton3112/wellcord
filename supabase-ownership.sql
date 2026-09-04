-- OWNERSHIP: só dono edita/apaga (servidor, mensagem, ícone). Idempotente.
-- Aplica DEPOIS de: schema, auth, voice, dm, dm-fix, dm-fix2, server-icon, channel-icon.
-- Legado sem dono (owner_id NULL) segue editável por logados até alguém assumir.

-- 0. Garante coluna de dono (schema.sql já cria; seguro repetir)
alter table servers add column if not exists owner_id uuid references auth.users(id) on delete set null;

-- 1. SERVERS: ver/inserir = logados; editar/apagar = dono (ou legado sem dono)
drop policy if exists "servers para logados" on servers;
drop policy if exists "servers select" on servers;
drop policy if exists "servers insert" on servers;
drop policy if exists "servers update" on servers;
drop policy if exists "servers delete" on servers;
create policy "servers select" on servers for select using (auth.role() = 'authenticated');
create policy "servers insert" on servers for insert with check (auth.role() = 'authenticated');
create policy "servers update" on servers for update
  using (auth.uid() = owner_id or owner_id is null)
  with check (auth.uid() = owner_id);
create policy "servers delete" on servers for delete
  using (auth.uid() = owner_id or owner_id is null);

-- 2. MESSAGES: ver/inserir = logados; editar/apagar = autor
drop policy if exists "messages para logados" on messages;
drop policy if exists "messages select" on messages;
drop policy if exists "messages insert" on messages;
drop policy if exists "messages update" on messages;
drop policy if exists "messages delete" on messages;
create policy "messages select" on messages for select using (auth.role() = 'authenticated');
create policy "messages insert" on messages for insert with check (auth.role() = 'authenticated');
create policy "messages update" on messages for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages delete" on messages for delete using (auth.uid() = user_id);

-- 3. CHANNELS: ver/inserir = logados; editar/apagar = dono do servidor (ou legado sem dono)
drop policy if exists "channels para logados" on channels;
drop policy if exists "channels select" on channels;
drop policy if exists "channels insert" on channels;
drop policy if exists "channels update" on channels;
drop policy if exists "channels delete" on channels;
create policy "channels select" on channels for select using (auth.role() = 'authenticated');
create policy "channels insert" on channels for insert with check (auth.role() = 'authenticated');
create policy "channels update" on channels for update
  using (exists (select 1 from servers s where s.id = channels.server_id and (s.owner_id = auth.uid() or s.owner_id is null)))
  with check (exists (select 1 from servers s where s.id = channels.server_id and (s.owner_id = auth.uid() or s.owner_id is null)));
create policy "channels delete" on channels for delete
  using (exists (select 1 from servers s where s.id = channels.server_id and (s.owner_id = auth.uid() or s.owner_id is null)));

-- 4. VOICE_SESSIONS: ver = logados; escrever = só as próprias linhas
drop policy if exists "voice_sessions para logados" on voice_sessions;
drop policy if exists "voice select" on voice_sessions;
drop policy if exists "voice self insert" on voice_sessions;
drop policy if exists "voice self update" on voice_sessions;
drop policy if exists "voice self delete" on voice_sessions;
create policy "voice select" on voice_sessions for select using (auth.role() = 'authenticated');
create policy "voice self insert" on voice_sessions for insert with check (auth.uid() = user_id);
create policy "voice self update" on voice_sessions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "voice self delete" on voice_sessions for delete using (auth.uid() = user_id);

-- 5. STORAGE: leitura pública; escrita/apagar só na própria pasta (primeiro segmento = uid)
--    O app salva em "<uid>/..." (ver useServerActions). Ícones legados fora de pasta de uid
--    só podem ser removidos pelo dashboard.
drop policy if exists "server-icons logados upload" on storage.objects;
drop policy if exists "server-icons logados update" on storage.objects;
drop policy if exists "server-icons logados delete" on storage.objects;
drop policy if exists "server-icons owner write" on storage.objects;
drop policy if exists "server-icons owner update" on storage.objects;
drop policy if exists "server-icons owner delete" on storage.objects;
create policy "server-icons owner write" on storage.objects for insert
  with check (bucket_id = 'server-icons' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "server-icons owner update" on storage.objects for update
  using (bucket_id = 'server-icons' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'server-icons' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "server-icons owner delete" on storage.objects for delete
  using (bucket_id = 'server-icons' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "channel-icons logados upload" on storage.objects;
drop policy if exists "channel-icons logados update" on storage.objects;
drop policy if exists "channel-icons logados delete" on storage.objects;
drop policy if exists "channel-icons owner write" on storage.objects;
drop policy if exists "channel-icons owner update" on storage.objects;
drop policy if exists "channel-icons owner delete" on storage.objects;
create policy "channel-icons owner write" on storage.objects for insert
  with check (bucket_id = 'channel-icons' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "channel-icons owner update" on storage.objects for update
  using (bucket_id = 'channel-icons' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'channel-icons' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "channel-icons owner delete" on storage.objects for delete
  using (bucket_id = 'channel-icons' and (storage.foldername(name))[1] = auth.uid()::text);
