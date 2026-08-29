-- COLE NO SQL EDITOR DO SUPABASE E CLIQUE RUN (para ativar login)

-- 1. Tabela de perfis (liga com auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar text default '😎',
  color text default '#5865F2',
  created_at timestamp with time zone default now()
);

-- 2. Habilitar RLS
alter table profiles enable row level security;

-- 3. Políticas: todos logados podem ver perfis, só o dono edita
drop policy if exists "profiles visíveis para logados" on profiles;
create policy "profiles visíveis para logados" on profiles for select using (auth.role() = 'authenticated');
drop policy if exists "inserir próprio perfil" on profiles;
create policy "inserir próprio perfil" on profiles for insert with check (auth.uid() = id);
drop policy if exists "atualizar próprio perfil" on profiles;
create policy "atualizar próprio perfil" on profiles for update using (auth.uid() = id);

-- 4. Função para criar perfil automaticamente ao cadastrar
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '😎');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 5. Tornar mensagens/servers/channels privados (só logados)
--  Remover políticas permissivas antigas
drop policy if exists "permitir tudo servers" on servers;
drop policy if exists "permitir tudo channels" on channels;
drop policy if exists "permitir tudo messages" on messages;

-- Novas políticas: precisa estar logado
create policy "servers para logados" on servers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "channels para logados" on channels for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "messages para logados" on messages for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- profiles já tem políticas acima

-- 6. Voltar user_id para NOT NULL com FK (agora que temos auth)
-- Não obrigatório, mas se quiser garantir integridade, descomente:
-- alter table messages add constraint messages_user_id_fkey foreign key (user_id) references auth.users(id);
-- alter table messages alter column user_id set not null;
