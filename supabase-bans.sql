-- BANS: dono pode banir membros do servidor.
-- Tabela server_bans rastreia quem foi banido e por quê.

CREATE TABLE IF NOT EXISTS server_bans (
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT '',
  banned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

ALTER TABLE server_bans ENABLE ROW LEVEL SECURITY;

-- Quem pode ver bans do servidor: membros do servidor
DROP POLICY IF EXISTS "bans select" ON server_bans;
CREATE POLICY "bans select" ON server_bans FOR SELECT
  USING (auth.role() = 'authenticated' AND is_server_member(server_id));

-- Quem pode banir: dono do servidor
DROP POLICY IF EXISTS "bans insert" ON server_bans;
CREATE POLICY "bans insert" ON server_bans FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM servers s WHERE s.id = server_bans.server_id AND s.owner_id = auth.uid())
  );

-- Quem pode desbanir: dono do servidor
DROP POLICY IF EXISTS "bans delete" ON server_bans;
CREATE POLICY "bans delete" ON server_bans FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM servers s WHERE s.id = server_bans.server_id AND s.owner_id = auth.uid())
  );

-- Função para verificar se um usuário está banido (bypass RLS)
CREATE OR REPLACE FUNCTION is_user_banned(sid uuid, uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM server_bans WHERE server_id = sid AND user_id = uid);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Atualizar política de INSERT em server_members para verificar ban
DROP POLICY IF EXISTS "members first owner" ON server_members;
CREATE POLICY "members first owner" ON server_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM server_members sm WHERE sm.server_id = server_members.server_id)
    AND EXISTS (SELECT 1 FROM servers s WHERE s.id = server_members.server_id AND s.owner_id = auth.uid())
    AND NOT is_user_banned(server_members.server_id, auth.uid())
  );

-- Atualizar política de INSERT normal (para quando alguém entra via convite)
DROP POLICY IF EXISTS "members join" ON server_members;
CREATE POLICY "members join" ON server_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT is_user_banned(server_members.server_id, auth.uid())
  );

-- Realtime para server_bans
ALTER PUBLICATION supabase_realtime ADD TABLE server_bans;
