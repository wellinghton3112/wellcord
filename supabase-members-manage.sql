-- MEMBERS MANAGE: dono pode remover membro (kick). Idempotente.
-- Sair sozinho já era permitido ("members leave"); faltava o dono tirar outros.

drop policy if exists "members leave" on server_members;
drop policy if exists "members kick" on server_members;
create policy "members kick" on server_members for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from servers s where s.id = server_members.server_id and s.owner_id = auth.uid())
  );
