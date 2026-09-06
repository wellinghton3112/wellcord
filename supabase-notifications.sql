-- NOTIFICATIONS: menções + DMs via tabela + realtime (transporte confiável).
-- Leitura/apagar = dono; inserir = logado (qualquer um pode me notificar).

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kind text not null check (kind in ('channel','dm')),
  sender text not null,
  snippet text not null default '',
  server_id uuid,
  channel_id uuid,
  conversation_id uuid,
  created_at timestamp with time zone default now()
);

alter table notifications enable row level security;

drop policy if exists "notifications select" on notifications;
drop policy if exists "notifications insert" on notifications;
drop policy if exists "notifications delete" on notifications;
create policy "notifications select" on notifications for select using (auth.uid() = user_id);
create policy "notifications insert" on notifications for insert with check (auth.role() = 'authenticated');
create policy "notifications delete" on notifications for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table notifications;
