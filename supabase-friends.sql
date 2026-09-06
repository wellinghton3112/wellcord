-- FRIENDS: pedidos de amizade. Idempotente.
-- Amigos = linha accepted (qualquer direção). Sem RLS frouxa: só vejo o que me envolve.

create table if not exists friend_requests (
  from_user uuid references auth.users(id) on delete cascade not null,
  to_user uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamp with time zone default now(),
  primary key (from_user, to_user),
  check (from_user <> to_user)
);

alter table friend_requests enable row level security;

drop policy if exists "friends select" on friend_requests;
drop policy if exists "friends insert" on friend_requests;
drop policy if exists "friends update" on friend_requests;
drop policy if exists "friends delete" on friend_requests;
create policy "friends select" on friend_requests for select
  using (auth.uid() = from_user or auth.uid() = to_user);
create policy "friends insert" on friend_requests for insert
  with check (auth.uid() = from_user);
create policy "friends update" on friend_requests for update
  using (auth.uid() = to_user) with check (auth.uid() = to_user);
create policy "friends delete" on friend_requests for delete
  using (auth.uid() = from_user or auth.uid() = to_user);

alter publication supabase_realtime add table friend_requests;
