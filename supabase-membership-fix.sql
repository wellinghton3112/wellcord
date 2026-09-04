-- MEMBERSHIP FIX: o teste "servidor sem membros (legado público)" usava NOT EXISTS
-- direto em server_members — mas essa leitura respeita o RLS do leitor, e quem não
-- é membro não enxerga membro nenhum, então TODO servidor privado parecia público.
-- Correção: helper SECURITY DEFINER (bypassa RLS) + recria as policies de leitura.
-- Idempotente.

create or replace function server_has_members(sid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from server_members where server_id = sid);
$$;

-- SERVERS select
drop policy if exists "servers select" on servers;
create policy "servers select" on servers for select
  using (
    auth.role() = 'authenticated'
    and (
      not server_has_members(servers.id)
      or is_server_member(servers.id)
    )
  );

-- CHANNELS select + insert
drop policy if exists "channels select" on channels;
drop policy if exists "channels insert" on channels;
create policy "channels select" on channels for select
  using (
    auth.role() = 'authenticated'
    and (
      not server_has_members(channels.server_id)
      or is_server_member(channels.server_id)
    )
  );
create policy "channels insert" on channels for insert
  with check (
    auth.role() = 'authenticated'
    and (
      not server_has_members(channels.server_id)
      or is_server_member(channels.server_id)
    )
  );

-- MESSAGES select + insert
drop policy if exists "messages select" on messages;
drop policy if exists "messages insert" on messages;
create policy "messages select" on messages for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from channels c
      where c.id = messages.channel_id
      and (
        not server_has_members(c.server_id)
        or is_server_member(c.server_id)
      )
    )
  );
create policy "messages insert" on messages for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from channels c
      where c.id = messages.channel_id
      and (
        not server_has_members(c.server_id)
        or is_server_member(c.server_id)
      )
    )
  );

-- VOICE select
drop policy if exists "voice select" on voice_sessions;
create policy "voice select" on voice_sessions for select
  using (
    auth.role() = 'authenticated'
    and (
      not server_has_members((select c.server_id from channels c where c.id = voice_sessions.channel_id))
      or is_server_member((select c.server_id from channels c where c.id = voice_sessions.channel_id))
    )
  );
