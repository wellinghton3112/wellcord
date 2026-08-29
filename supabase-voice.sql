-- COLE NO SQL EDITOR E CLIQUE RUN
create table if not exists voice_sessions (
  channel_id uuid references channels(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  username text not null,
  joined_at timestamp with time zone default now(),
  primary key (channel_id, user_id)
);
alter table voice_sessions enable row level security;
drop policy if exists "voice_sessions para logados" on voice_sessions;
create policy "voice_sessions para logados" on voice_sessions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter publication supabase_realtime add table voice_sessions;
