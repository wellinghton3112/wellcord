-- REPLIES: resposta com citação (canal + DM). Idempotente.
-- Snapshot (autor + texto) junto ao id: a citação sobrevive mesmo se a original for apagada.
-- Sem FK para não apagar/limitar nada em cascata.

alter table messages add column if not exists reply_to uuid;
alter table messages add column if not exists reply_user text;
alter table messages add column if not exists reply_content text;

alter table dm_messages add column if not exists reply_to uuid;
alter table dm_messages add column if not exists reply_user text;
alter table dm_messages add column if not exists reply_content text;
