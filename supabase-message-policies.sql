-- MESSAGE POLICIES: dono pode editar/excluir mensagens de outros.
-- Adiciona coluna edited_at para rastrear edições.

-- Coluna edited_at na tabela messages
DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Coluna edited_at na tabela dm_messages
DO $$ BEGIN
  ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Atualizar política de UPDATE: dono pode editar qualquer mensagem
DROP POLICY IF EXISTS "messages update" ON messages;
CREATE POLICY "messages update" ON messages FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM channels c
      JOIN servers s ON s.id = c.server_id
      WHERE c.id = messages.channel_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM channels c
      JOIN servers s ON s.id = c.server_id
      WHERE c.id = messages.channel_id AND s.owner_id = auth.uid()
    )
  );

-- Atualizar política de DELETE: dono pode excluir qualquer mensagem
DROP POLICY IF EXISTS "messages delete" ON messages;
CREATE POLICY "messages delete" ON messages FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM channels c
      JOIN servers s ON s.id = c.server_id
      WHERE c.id = messages.channel_id AND s.owner_id = auth.uid()
    )
  );

-- Políticas para dm_messages: dono pode editar/excluir DMs de outros
DROP POLICY IF EXISTS "dm_messages para participantes" ON dm_messages;
CREATE POLICY "dm_messages para participantes" ON dm_messages FOR ALL
  USING (is_dm_participant(conversation_id))
  WITH CHECK (is_dm_participant(conversation_id));
