-- COLE ISTO NO SQL EDITOR DO SUPABASE (https://supabase.com/dashboard -> SQL Editor)

-- 1. Ativar UUID
create extension if not exists "uuid-ossp";

-- 2. Tabelas
create table if not exists servers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  icon text,
  owner_id uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

create table if not exists channels (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid references servers(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('text','voice')),
  created_at timestamp with time zone default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references channels(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  username text not null,
  avatar text,
  color text,
  content text not null,
  created_at timestamp with time zone default now()
);

-- 3. RLS
alter table servers enable row level security;
alter table channels enable row level security;
alter table messages enable row level security;

-- Políticas permissivas para MVP (depois refinamos por membros do servidor)
create policy "permitir tudo servers" on servers for all using (true) with check (true);
create policy "permitir tudo channels" on channels for all using (true) with check (true);
create policy "permitir tudo messages" on messages for all using (true) with check (true);

-- 4. Realtime
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table channels;
alter publication supabase_realtime add table servers;

-- 5. Dados iniciais (opcional)
-- insert into servers (name, icon) values ('Casa dos Amigos', '🏠');
