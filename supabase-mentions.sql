-- MENTIONS: ids mencionados por mensagem (canal + DM). Idempotente.
-- Sem RLS nova (mesma linha, mesmas policies); notificação é via broadcast.

alter table messages add column if not exists mentions text[] not null default '{}';
alter table dm_messages add column if not exists mentions text[] not null default '{}';
