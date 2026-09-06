-- PINS: mensagens fixadas por canal. Idempotente.
-- Ver = quem vê o canal; fixar/desafixar = dono do servidor ou autor da mensagem.

create table if not exists pinned_messages (
  channel_id uuid references channels(id) on delete cascade not null,
  message_id uuid references messages(id) on delete cascade not null,
  pinned_by uuid references auth.users(id) on delete set null,
  pinned_at timestamp with time zone default now(),
  primary key (channel_id, message_id)
);

alter table pinned_messages enable row level security;

drop policy if exists "pins select" on pinned_messages;
drop policy if exists "pins write" on pinned_messages;
create policy "pins select" on pinned_messages for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from channels c
      where c.id = pinned_messages.channel_id
      and (
        not server_has_members(c.server_id)
        or is_server_member(c.server_id)
      )
    )
  );
create policy "pins write" on pinned_messages for all
  using (
    auth.role() = 'authenticated'
    and (
      auth.uid() = pinned_by
      or exists (select 1 from servers s join channels c on c.server_id = s.id where c.id = pinned_messages.channel_id and s.owner_id = auth.uid())
      or exists (select 1 from messages m where m.id = pinned_messages.message_id and m.user_id = auth.uid())
    )
  )
  with check (
    auth.role() = 'authenticated'
    and (
      exists (select 1 from servers s join channels c on c.id = pinned_messages.channel_id and s.owner_id = auth.uid())
      or exists (select 1 from messages m where m.id = pinned_messages.message_id and m.user_id = auth.uid())
    )
  );

alter publication supabase_realtime add table pinned_messages;
