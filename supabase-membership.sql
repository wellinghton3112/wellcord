-- MEMBERSHIP: servidor privado por padrão + convites. Idempotente.
-- Regra: servidor novo só aparece para membros; legado SEM membros segue público.
-- Servidores legados COM dono ganham o dono como membro (viram privados — gere convites).
-- Entrar num servidor: só via redeem_invite(codigo) ou sendo o primeiro membro (dono).

-- 1. Tabelas
create table if not exists server_members (
  server_id uuid references servers(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamp with time zone default now(),
  primary key (server_id, user_id)
);

create table if not exists server_invites (
  code text primary key,
  server_id uuid references servers(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  max_uses int,
  uses int not null default 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table server_members enable row level security;
alter table server_invites enable row level security;

-- 2. Helper sem recursão (bypassa RLS)
create or replace function is_server_member(sid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from server_members where server_id = sid and user_id = auth.uid());
$$;

-- 3. Backfill: donos viram membros dos próprios servidores
insert into server_members (server_id, user_id, role)
select id, owner_id, 'owner' from servers where owner_id is not null
on conflict do nothing;

-- 4. MEMBERS policies: ver = co-membro; entrar = só via função ou bootstrap do dono
drop policy if exists "members select" on server_members;
drop policy if exists "members insert" on server_members;
drop policy if exists "members delete" on server_members;
create policy "members select" on server_members for select
  using (auth.uid() = user_id or is_server_member(server_id));
-- Bootstrap: dono se adiciona como PRIMEIRO membro (servidor recém-criado)
create policy "members first owner" on server_members for insert
  with check (
    auth.uid() = user_id
    and not exists (select 1 from server_members m where m.server_id = server_members.server_id)
    and exists (select 1 from servers s where s.id = server_members.server_id and s.owner_id = auth.uid())
  );
create policy "members leave" on server_members for delete using (auth.uid() = user_id);

-- 5. INVITES policies: ver/criar = membro; apagar = criador ou dono
drop policy if exists "invites select" on server_invites;
drop policy if exists "invites insert" on server_invites;
drop policy if exists "invites delete" on server_invites;
create policy "invites select" on server_invites for select using (is_server_member(server_id));
create policy "invites insert" on server_invites for insert
  with check (auth.uid() = created_by and is_server_member(server_id));
create policy "invites delete" on server_invites for delete
  using (auth.uid() = created_by or exists (select 1 from servers s where s.id = server_invites.server_id and s.owner_id = auth.uid()));

-- 6. Resgate de convite (único caminho para entrar em servidor privado)
create or replace function redeem_invite(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_server uuid;
  v_uses int;
  v_max int;
  v_exp timestamptz;
begin
  select server_id, uses, max_uses, expires_at into v_server, v_uses, v_max, v_exp
  from server_invites where code = p_code;
  if v_server is null then raise exception 'Convite inválido'; end if;
  if v_exp is not null and v_exp < now() then raise exception 'Convite expirado'; end if;
  if v_max is not null and v_uses >= v_max then raise exception 'Convite esgotado'; end if;
  insert into server_members (server_id, user_id, role)
  values (v_server, auth.uid(), 'member')
  on conflict do nothing;
  update server_invites set uses = uses + 1 where code = p_code;
  return v_server;
end;
$$;

-- 7. SERVERS: visível se público (sem membros) ou se membro
drop policy if exists "servers select" on servers;
drop policy if exists "servers insert" on servers;
drop policy if exists "servers update" on servers;
drop policy if exists "servers delete" on servers;
create policy "servers select" on servers for select
  using (
    auth.role() = 'authenticated'
    and (
      not exists (select 1 from server_members m where m.server_id = servers.id)
      or is_server_member(servers.id)
    )
  );
create policy "servers insert" on servers for insert with check (auth.role() = 'authenticated');
create policy "servers update" on servers for update
  using (auth.uid() = owner_id or owner_id is null)
  with check (auth.uid() = owner_id);
create policy "servers delete" on servers for delete
  using (auth.uid() = owner_id or owner_id is null);

-- 8. CHANNELS: ver/inserir = membro do servidor (ou legado público); gerenciar = dono
drop policy if exists "channels select" on channels;
drop policy if exists "channels insert" on channels;
drop policy if exists "channels update" on channels;
drop policy if exists "channels delete" on channels;
create policy "channels select" on channels for select
  using (
    auth.role() = 'authenticated'
    and (
      not exists (select 1 from server_members m where m.server_id = channels.server_id)
      or is_server_member(channels.server_id)
    )
  );
create policy "channels insert" on channels for insert
  with check (
    auth.role() = 'authenticated'
    and (
      not exists (select 1 from server_members m where m.server_id = channels.server_id)
      or is_server_member(channels.server_id)
    )
  );
create policy "channels update" on channels for update
  using (exists (select 1 from servers s where s.id = channels.server_id and (s.owner_id = auth.uid() or s.owner_id is null)))
  with check (exists (select 1 from servers s where s.id = channels.server_id and (s.owner_id = auth.uid() or s.owner_id is null)));
create policy "channels delete" on channels for delete
  using (exists (select 1 from servers s where s.id = channels.server_id and (s.owner_id = auth.uid() or s.owner_id is null)));

-- 9. MESSAGES: ver/inserir = membro do servidor do canal; editar/apagar = autor
drop policy if exists "messages select" on messages;
drop policy if exists "messages insert" on messages;
drop policy if exists "messages update" on messages;
drop policy if exists "messages delete" on messages;
create policy "messages select" on messages for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from channels c
      where c.id = messages.channel_id
      and (
        not exists (select 1 from server_members m where m.server_id = c.server_id)
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
        not exists (select 1 from server_members m where m.server_id = c.server_id)
        or is_server_member(c.server_id)
      )
    )
  );
create policy "messages update" on messages for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages delete" on messages for delete using (auth.uid() = user_id);

-- 10. VOZ: ver = membro; sessões próprias p/ escrita (como antes)
drop policy if exists "voice select" on voice_sessions;
drop policy if exists "voice self insert" on voice_sessions;
drop policy if exists "voice self update" on voice_sessions;
drop policy if exists "voice self delete" on voice_sessions;
create policy "voice select" on voice_sessions for select
  using (
    auth.role() = 'authenticated'
    and (
      not exists (select 1 from server_members m where m.server_id = (select c.server_id from channels c where c.id = voice_sessions.channel_id))
      or is_server_member((select c.server_id from channels c where c.id = voice_sessions.channel_id))
    )
  );
create policy "voice self insert" on voice_sessions for insert with check (auth.uid() = user_id);
create policy "voice self update" on voice_sessions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "voice self delete" on voice_sessions for delete using (auth.uid() = user_id);

-- 11. Realtime das novas tabelas
alter publication supabase_realtime add table server_members;
alter publication supabase_realtime add table server_invites;
