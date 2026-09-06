-- POLLS: enquetes nos canais de texto (voto único, pode trocar). Idempotente.
-- Ver/criar = membro do servidor (ou legado público); votar = membro; apagar voto = próprio.

create table if not exists polls (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references channels(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  username text not null default '',
  question text not null,
  created_at timestamp with time zone default now()
);

create table if not exists poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references polls(id) on delete cascade not null,
  label text not null,
  position int not null default 0
);

create table if not exists poll_votes (
  poll_id uuid references polls(id) on delete cascade not null,
  option_id uuid references poll_options(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (poll_id, user_id)
);

alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;

drop policy if exists "polls select" on polls;
drop policy if exists "polls insert" on polls;
drop policy if exists "polls delete" on polls;
create policy "polls select" on polls for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from channels c
      where c.id = polls.channel_id
      and (not server_has_members(c.server_id) or is_server_member(c.server_id))
    )
  );
create policy "polls insert" on polls for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from channels c
      where c.id = polls.channel_id
      and (not server_has_members(c.server_id) or is_server_member(c.server_id))
    )
  );
create policy "polls delete" on polls for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from channels c join servers s on s.id = c.server_id
      where c.id = polls.channel_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "poll_options select" on poll_options;
drop policy if exists "poll_options insert" on poll_options;
create policy "poll_options select" on poll_options for select using (auth.role() = 'authenticated');
create policy "poll_options insert" on poll_options for insert with check (auth.role() = 'authenticated');

drop policy if exists "poll_votes select" on poll_votes;
drop policy if exists "poll_votes insert" on poll_votes;
drop policy if exists "poll_votes update" on poll_votes;
drop policy if exists "poll_votes delete" on poll_votes;
create policy "poll_votes select" on poll_votes for select using (auth.role() = 'authenticated');
create policy "poll_votes insert" on poll_votes for insert with check (auth.uid() = user_id);
create policy "poll_votes update" on poll_votes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "poll_votes delete" on poll_votes for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table polls;
alter publication supabase_realtime add table poll_options;
alter publication supabase_realtime add table poll_votes;
