-- PROFILE: bio + mensagem de status. Idempotente.
-- Exibidos no card de perfil estilo Discord.

alter table profiles add column if not exists bio text not null default '';
alter table profiles add column if not exists status_text text not null default '';
