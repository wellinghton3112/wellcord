-- CHANNEL READS: última leitura por canal/usuário (base das não-lidas). Idempotente.

create table if not exists channel_reads (
  channel_id uuid references channels(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  last_read_at timestamp with time zone not null default now(),
  primary key (channel_id, user_id)
);

alter table channel_reads enable row level security;

drop policy if exists "reads own" on channel_reads;
create policy "reads own" on channel_reads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
