-- COLE ISTO TAMBÉM NO SQL EDITOR E CLIQUE RUN
-- Permite enviar mensagens sem login (MVP para usar com amigos sem auth)

alter table messages drop constraint if exists messages_user_id_fkey;
alter table messages alter column user_id drop not null;

-- Garantir que mensagens possam ser inseridas sem user_id
-- Se quiser auth depois, revertemos
