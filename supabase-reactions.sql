-- REACTIONS: emoji nas mensagens (canal + DM), com realtime. Idempotente.
-- Ver/inserir = quem vê a mensagem; apagar = só a própria reação.

create table if not exists message_reactions (
  message_id uuid references messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  emoji text not null,
  created_at timestamp with time zone default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists dm_reactions (
  message_id uuid references dm_messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  emoji text not null,
  created_at timestamp with time zone default now(),
  primary key (message_id, user_id, emoji)
);

alter table message_reactions enable row level security;
alter table dm_reactions enable row level security;

-- Canal: mesma visibilidade da mensagem (membro do servidor ou legado público)
drop policy if exists "msg_react select" on message_reactions;
drop policy if exists "msg_react insert" on message_reactions;
drop policy if exists "msg_react delete" on message_reactions;
create policy "msg_react select" on message_reactions for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from messages m join channels c on c.id = m.channel_id
      where m.id = message_reactions.message_id
      and (
        not server_has_members(c.server_id)
        or is_server_member(c.server_id)
      )
    )
  );
create policy "msg_react insert" on message_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from messages m join channels c on c.id = m.channel_id
      where m.id = message_reactions.message_id
      and (
        not server_has_members(c.server_id)
        or is_server_member(c.server_id)
      )
    )
  );
create policy "msg_react delete" on message_reactions for delete using (auth.uid() = user_id);

-- DM: mesma visibilidade da DM (participante)
drop policy if exists "dm_react select" on dm_reactions;
drop policy if exists "dm_react insert" on dm_reactions;
drop policy if exists "dm_react delete" on dm_reactions;
create policy "dm_react select" on dm_reactions for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from dm_messages dm
      where dm.id = dm_reactions.message_id
      and is_dm_participant(dm.conversation_id)
    )
  );
create policy "dm_react insert" on dm_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from dm_messages dm
      where dm.id = dm_reactions.message_id
      and is_dm_participant(dm.conversation_id)
    )
  );
create policy "dm_react delete" on dm_reactions for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table message_reactions;
alter publication supabase_realtime add table dm_reactions;
