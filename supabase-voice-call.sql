-- CALL: início da chamada de voz por canal. Idempotente.
-- Regra: o timer parte de 0 quando o PRIMEIRO entra e só zera quando o ÚLTIMO sai.
-- Por isso o início fica gravado aqui, separado das sessões (que entram/saem o tempo todo).
-- Fluxo no código: join grava started_at só se não há sessões; leave apaga a linha
-- só se não restar ninguém (a policy de DELETE garante isso no banco).

create table if not exists voice_calls (
  channel_id uuid primary key references channels(id) on delete cascade,
  started_at timestamp with time zone not null default now()
);

alter table voice_calls enable row level security;

drop policy if exists "voice_calls select" on voice_calls;
drop policy if exists "voice_calls insert" on voice_calls;
drop policy if exists "voice_calls update" on voice_calls;
drop policy if exists "voice_calls delete" on voice_calls;

create policy "voice_calls select" on voice_calls for select using (auth.role() = 'authenticated');
create policy "voice_calls insert" on voice_calls for insert with check (auth.role() = 'authenticated');
create policy "voice_calls update" on voice_calls for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- Apagar a chamada só é permitido quando não há mais ninguém nela
create policy "voice_calls delete" on voice_calls for delete
  using (not exists (select 1 from voice_sessions vs where vs.channel_id = voice_calls.channel_id));

alter publication supabase_realtime add table voice_calls;
