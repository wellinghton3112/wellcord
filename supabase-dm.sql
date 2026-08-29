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

-- FIX recursão: função SECURITY DEFINER bypassa RLS para checar participação
create or replace function is_dm_participant(conv uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from dm_participants where conversation_id = conv and user_id = auth.uid());
$$;

drop policy if exists "dm_participants visível" on dm_participants;
create policy "dm_participants visível" on dm_participants for all
  using (auth.uid() = user_id or is_dm_participant(conversation_id))
  with check (auth.role() = 'authenticated');

-- dm_conversations: SELECT/UPDATE/DELETE só para participantes, INSERT via "criar"
drop policy if exists "dm_conversations para participantes" on dm_conversations;
drop policy if exists "dm_conversations select" on dm_conversations;
drop policy if exists "dm_conversations update" on dm_conversations;
drop policy if exists "dm_conversations delete" on dm_conversations;
create policy "dm_conversations select" on dm_conversations for select using (is_dm_participant(id));
create policy "dm_conversations update" on dm_conversations for update using (is_dm_participant(id)) with check (is_dm_participant(id));
create policy "dm_conversations delete" on dm_conversations for delete using (is_dm_participant(id));
drop policy if exists "criar dm_conversations" on dm_conversations;
create policy "criar dm_conversations" on dm_conversations for insert with check (auth.role() = 'authenticated');

drop policy if exists "dm_messages para participantes" on dm_messages;
create policy "dm_messages para participantes" on dm_messages for all using (is_dm_participant(conversation_id)) with check (is_dm_participant(conversation_id));

alter publication supabase_realtime add table dm_messages;
alter publication supabase_realtime add table dm_conversations;
