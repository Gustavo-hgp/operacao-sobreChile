-- Corrige o erro ao salvar as taxas de câmbio.
-- Garante que a tabela `config` existe e tem a permissão (RLS) certa.
-- Seguro rodar quantas vezes quiser — não apaga nada.

create table if not exists config (
  chave text primary key,
  valor numeric not null default 0
);

alter table config enable row level security;

drop policy if exists "authenticated full access config" on config;
create policy "authenticated full access config" on config
  for all to authenticated using (true) with check (true);
