-- ⚠️ OBSOLETO / NÃO APLICAR — era do MVP anônimo (mensagens sem login).
-- O app hoje exige auth (redirect para /login) e sempre insere user_id.
-- Aplicar este arquivo remove o NOT NULL/FK de messages.user_id e enfraquece a integridade.
-- Mantido no repo apenas como histórico. Ordem canônica de aplicação:
--   1. supabase-schema.sql → 2. supabase-auth.sql → 3. supabase-voice.sql
--   4. supabase-dm.sql → 5. supabase-dm-fix.sql → 6. supabase-dm-fix2.sql
--   7. supabase-server-icon.sql → 8. supabase-channel-icon.sql
-- COLE ISTO TAMBÉM NO SQL EDITOR E CLIQUE RUN
-- Permite enviar mensagens sem login (MVP para usar com amigos sem auth)

alter table messages drop constraint if exists messages_user_id_fkey;
alter table messages alter column user_id drop not null;

-- Garantir que mensagens possam ser inseridas sem user_id
-- Se quiser auth depois, revertemos
