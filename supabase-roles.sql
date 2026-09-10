-- ROLES: sistema de cargos com permissões.
-- Cada servidor pode ter múltiplos cargos, membros podem ter 1+ cargos.

CREATE TABLE IF NOT EXISTS server_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#99AAB5',
  position int NOT NULL DEFAULT 0,
  permissions jsonb NOT NULL DEFAULT '{"kick": false, "ban": false, "manage_messages": false, "manage_channels": false, "manage_roles": false}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(server_id, name)
);

CREATE TABLE IF NOT EXISTS server_member_roles (
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES server_roles(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (server_id, user_id, role_id)
);

ALTER TABLE server_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_member_roles ENABLE ROW LEVEL SECURITY;

-- Quem pode ver cargos: membros do servidor
DROP POLICY IF EXISTS "roles select" ON server_roles;
CREATE POLICY "roles select" ON server_roles FOR SELECT
  USING (auth.role() = 'authenticated' AND is_server_member(server_id));

DROP POLICY IF EXISTS "member_roles select" ON server_member_roles;
CREATE POLICY "member_roles select" ON server_member_roles FOR SELECT
  USING (auth.role() = 'authenticated' AND is_server_member(server_id));

-- Quem pode criar/editar/excluir cargos: dono
DROP POLICY IF EXISTS "roles insert" ON server_roles;
CREATE POLICY "roles insert" ON server_roles FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM servers s WHERE s.id = server_roles.server_id AND s.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "roles update" ON server_roles;
CREATE POLICY "roles update" ON server_roles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM servers s WHERE s.id = server_roles.server_id AND s.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "roles delete" ON server_roles;
CREATE POLICY "roles delete" ON server_roles FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM servers s WHERE s.id = server_roles.server_id AND s.owner_id = auth.uid())
  );

-- Quem pode atribuir cargos: dono
DROP POLICY IF EXISTS "member_roles insert" ON server_member_roles;
CREATE POLICY "member_roles insert" ON server_member_roles FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM servers s WHERE s.id = server_member_roles.server_id AND s.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "member_roles delete" ON server_member_roles;
CREATE POLICY "member_roles delete" ON server_member_roles FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM servers s WHERE s.id = server_member_roles.server_id AND s.owner_id = auth.uid())
  );

-- Função para verificar permissão (bypass RLS)
CREATE OR REPLACE FUNCTION has_permission(sid uuid, uid uuid, perm text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM server_member_roles smr
    JOIN server_roles sr ON sr.id = smr.role_id
    WHERE smr.server_id = sid AND smr.user_id = uid AND sr.permissions @> jsonb_build_object(perm, true)
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE server_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE server_member_roles;
