-- FIX 2: corrige "new row violates row-level security policy for table dm_conversations" ao criar DM
-- O policy anterior FOR ALL bloqueava INSERT porque exigia is_dm_participant(id) antes dos participants existirem

drop policy if exists "dm_conversations para participantes" on dm_conversations;
drop policy if exists "dm_conversations select" on dm_conversations;

-- SELECT/UPDATE/DELETE: só participantes veem
create policy "dm_conversations select" on dm_conversations for select using (is_dm_participant(id));
create policy "dm_conversations update" on dm_conversations for update using (is_dm_participant(id)) with check (is_dm_participant(id));
create policy "dm_conversations delete" on dm_conversations for delete using (is_dm_participant(id));

-- INSERT já existe como "criar dm_conversations" com check auth.role()='authenticated' — garante que logados criem
-- Se não existir, recria:
drop policy if exists "criar dm_conversations" on dm_conversations;
create policy "criar dm_conversations" on dm_conversations for insert with check (auth.role() = 'authenticated');

-- Corrige dm_messages para usar função (evita recursão indireta)
drop policy if exists "dm_messages para participantes" on dm_messages;
create policy "dm_messages para participantes" on dm_messages for all using (is_dm_participant(conversation_id)) with check (is_dm_participant(conversation_id));
