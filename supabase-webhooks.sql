-- WEBHOOKS: permitem que serviços externos enviem mensagens para canais.
-- Cada webhook tem um token único que autentica as requisições.

-- Adicionar colunas necessárias para webhooks na tabela messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embeds jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS username text;

CREATE TABLE IF NOT EXISTS channel_webhooks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Webhook',
  avatar_url text,
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE channel_webhooks ENABLE ROW LEVEL SECURITY;

-- Quem pode ver webhooks: membros do servidor dono do canal
DROP POLICY IF EXISTS "webhooks select" ON channel_webhooks;
CREATE POLICY "webhooks select" ON channel_webhooks FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_webhooks.channel_id
      AND is_server_member(c.server_id)
    )
  );

-- Quem pode criar webhooks: dono ou quem tem manage_channels
DROP POLICY IF EXISTS "webhooks insert" ON channel_webhooks;
CREATE POLICY "webhooks insert" ON channel_webhooks FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN servers s ON s.id = c.server_id
      WHERE c.id = channel_webhooks.channel_id
      AND (s.owner_id = auth.uid() OR has_permission(s.id, auth.uid(), 'manage_channels'))
    )
  );

-- Quem pode excluir webhooks: dono ou quem criou
DROP POLICY IF EXISTS "webhooks delete" ON channel_webhooks;
CREATE POLICY "webhooks delete" ON channel_webhooks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN servers s ON s.id = c.server_id
      WHERE c.id = channel_webhooks.channel_id
      AND (s.owner_id = auth.uid() OR channel_webhooks.created_by = auth.uid())
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE channel_webhooks;
