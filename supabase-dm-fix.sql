-- COLE NO SQL EDITOR DO SUPABASE E CLIQUE RUN — corrige "infinite recursion detected in policy for relation dm_participants"
create or replace function is_dm_participant(conv uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from dm_participants where conversation_id = conv and user_id = auth.uid());
$$;

drop policy if exists "dm_participants visível" on dm_participants;
create policy "dm_participants visível" on dm_participants for all
  using (auth.uid() = user_id or is_dm_participant(conversation_id))
  with check (auth.role() = 'authenticated');

drop policy if exists "dm_conversations para participantes" on dm_conversations;
create policy "dm_conversations para participantes" on dm_conversations for all using (is_dm_participant(id)) with check (is_dm_participant(id));

drop policy if exists "dm_messages para participantes" on dm_messages;
create policy "dm_messages para participantes" on dm_messages for all using (is_dm_participant(conversation_id)) with check (is_dm_participant(conversation_id));
