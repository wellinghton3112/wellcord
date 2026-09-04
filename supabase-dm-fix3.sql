-- FIX 3: normaliza as policies de dm_conversations (idempotente, independe da ordem aplicada antes).
-- Sintoma: "new row violates row-level security policy for table dm_conversations" (403) ao criar DM.
-- Causa: a policy antiga "dm_conversations para participantes" (FOR ALL) exigia is_dm_participant(id)
--   também no INSERT — mas no INSERT ainda não há participants, então toda criação era bloqueada.
--   (Arquivos dm.sql e dm-fix.sql criam essa policy; dm-fix2.sql a remove — se o banco ficou num
--   estado intermediário ou em ordem trocada, o bug persiste.)

-- Garante a função helper (mesma de dm-fix.sql)
create or replace function is_dm_participant(conv uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from dm_participants where conversation_id = conv and user_id = auth.uid());
$$;

-- Remove TODAS as policies conhecidas (estado limpo)
drop policy if exists "dm_conversations para participantes" on dm_conversations;
drop policy if exists "dm_conversations select" on dm_conversations;
drop policy if exists "dm_conversations update" on dm_conversations;
drop policy if exists "dm_conversations delete" on dm_conversations;
drop policy if exists "criar dm_conversations" on dm_conversations;

-- Recria o conjunto correto: leitura/alteração só para participantes, INSERT para qualquer logado
create policy "dm_conversations select" on dm_conversations for select using (is_dm_participant(id));
create policy "dm_conversations update" on dm_conversations for update using (is_dm_participant(id)) with check (is_dm_participant(id));
create policy "dm_conversations delete" on dm_conversations for delete using (is_dm_participant(id));
create policy "criar dm_conversations" on dm_conversations for insert with check (auth.role() = 'authenticated');
