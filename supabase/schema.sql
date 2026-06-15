-- Operação Chile — schema do Supabase
-- Rode isto no SQL Editor do seu projeto Supabase.

-- 1) Parceiros: quem são os parceiros comerciais (operadoras donas dos cupos).
create table if not exists parceiros (
  id          bigint generated always as identity primary key,
  nome        text not null,
  telefone    text,
  created_at  timestamptz not null default now()
);

-- 2) Serviços / Rotas: cada passeio, vinculado ao parceiro e ao valor do cupo
--    (quanto o parceiro cobraria por cliente, se você terceirizasse).
create table if not exists servicos (
  id           bigint generated always as identity primary key,
  parceiro_id  bigint references parceiros(id) on delete set null,
  nome         text not null,
  valor_cupo   numeric(10,2) not null default 0,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 3) Operações: cada linha é UMA viagem lançada (a van na rua naquele dia).
--    custo_van_guia = custo fixo do dia; qtd_pessoas = passageiros;
--    comissao_roupa = ganho extra com aluguel de roupas.
create table if not exists operacoes (
  id              bigint generated always as identity primary key,
  data            date not null,
  servico_id      bigint not null references servicos(id) on delete cascade,
  custo_van_guia  numeric(10,2) not null default 0,
  qtd_pessoas     integer not null default 0 check (qtd_pessoas >= 0),
  comissao_roupa  numeric(10,2) not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_servicos_parceiro on servicos(parceiro_id);
create index if not exists idx_operacoes_data on operacoes(data);
create index if not exists idx_operacoes_servico on operacoes(servico_id);

-- Acesso restrito a usuários autenticados (Supabase Auth). A role anon (chave
-- pública embutida no navegador) NÃO tem acesso aos dados — é obrigatório fazer
-- login. Crie o usuário no painel: Authentication > Users > Add user (marque
-- "Auto Confirm User") e DESATIVE o cadastro público em Authentication >
-- Sign In / Providers > "Allow new users to sign up".
alter table parceiros enable row level security;
alter table servicos  enable row level security;
alter table operacoes enable row level security;

drop policy if exists "authenticated full access parceiros" on parceiros;
create policy "authenticated full access parceiros" on parceiros
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access servicos" on servicos;
create policy "authenticated full access servicos" on servicos
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access operacoes" on operacoes;
create policy "authenticated full access operacoes" on operacoes
  for all to authenticated using (true) with check (true);
