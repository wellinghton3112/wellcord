-- COLE NO SQL EDITOR E CLIQUE RUN
create extension if not exists "uuid-ossp";

create table if not exists dm_conversations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now()
);

create table if not exists dm_participants (
  conversation_id uuid references dm_conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (conversation_id, user_id)
);

create table if not exists dm_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references dm_conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table dm_conversations enable row level security;
alter table dm_participants enable row level security;
alter table dm_messages enable row level security;

drop policy if exists "dm_conversations para participantes" on dm_conversations;
create policy "dm_conversations para participantes" on dm_conversations for all using (
  exists (select 1 from dm_participants where dm_participants.conversation_id = dm_conversations.id and dm_participants.user_id = auth.uid())
) with check (
  exists (select 1 from dm_participants where dm_participants.conversation_id = dm_conversations.id and dm_participants.user_id = auth.uid())
);

-- permite criar conversa
drop policy if exists "criar dm_conversations" on dm_conversations;
create policy "criar dm_conversations" on dm_conversations for insert with check (auth.role() = 'authenticated');

drop policy if exists "dm_participants visível" on dm_participants;
create policy "dm_participants visível" on dm_participants for all using (auth.uid() = user_id or exists (select 1 from dm_participants dp where dp.conversation_id = dm_participants.conversation_id and dp.user_id = auth.uid())) with check (auth.role() = 'authenticated');

drop policy if exists "dm_messages para participantes" on dm_messages;
create policy "dm_messages para participantes" on dm_messages for all using (
  exists (select 1 from dm_participants where dm_participants.conversation_id = dm_messages.conversation_id and dm_participants.user_id = auth.uid())
) with check (
  exists (select 1 from dm_participants where dm_participants.conversation_id = dm_messages.conversation_id and dm_participants.user_id = auth.uid())
);

alter publication supabase_realtime add table dm_messages;
alter publication supabase_realtime add table dm_conversations;
