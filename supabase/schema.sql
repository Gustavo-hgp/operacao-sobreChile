-- Operação Chile — schema do Supabase
-- Rode isto no SQL Editor do seu projeto Supabase.
--
-- Se você já rodou uma versão anterior do schema, rode antes o supabase/reset.sql
-- (apaga as tabelas), e depois este arquivo.

-- 1) Passeio (referência): nome + valor do cupo por pessoa (preço de referência).
create table if not exists passeios (
  id                bigint generated always as identity primary key,
  nome              text not null,
  valor_cupo_pessoa numeric(10,2) not null default 0,
  created_at        timestamptz not null default now()
);

-- 2) Parceiro: pode prestar van, guia e/ou van+guia, cada um com seu preço
--    (deixe nulo o que ele não faz). qtd_maxima = capacidade máxima de pessoas.
create table if not exists parceiros (
  id             bigint generated always as identity primary key,
  nome           text not null,
  qtd_maxima     integer not null default 0 check (qtd_maxima >= 0),
  valor_van      numeric(10,2),
  valor_guia     numeric(10,2),
  valor_van_guia numeric(10,2),
  created_at     timestamptz not null default now()
);

-- 3) Operação: um passeio executado com um parceiro num tipo de serviço.
--    valor_servico = preço do parceiro para o tipo escolhido (gravado no momento).
--    Comissão de roupa = valor_roupa * comissao_pct / 100.
create table if not exists operacoes (
  id            bigint generated always as identity primary key,
  data          date not null,
  passeio_id    bigint not null references passeios(id) on delete cascade,
  parceiro_id   bigint not null references parceiros(id) on delete cascade,
  tipo_servico  text not null check (tipo_servico in ('van','guia','van_guia')),
  valor_servico numeric(10,2) not null default 0,
  qtd_pessoas   integer not null default 0 check (qtd_pessoas >= 0),
  valor_roupa   numeric(10,2) not null default 0,
  comissao_pct  numeric(5,2) not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_operacoes_data on operacoes(data);
create index if not exists idx_operacoes_passeio on operacoes(passeio_id);
create index if not exists idx_operacoes_parceiro on operacoes(parceiro_id);

-- Acesso restrito a usuários autenticados (Supabase Auth). A role anon (chave
-- pública embutida no navegador) NÃO tem acesso aos dados — é obrigatório login.
-- Crie o usuário no painel: Authentication > Users > Add user (marque
-- "Auto Confirm User") e DESATIVE o cadastro público em Authentication >
-- Sign In / Providers > "Allow new users to sign up".
alter table passeios  enable row level security;
alter table parceiros enable row level security;
alter table operacoes enable row level security;

drop policy if exists "authenticated full access passeios" on passeios;
create policy "authenticated full access passeios" on passeios
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access parceiros" on parceiros;
create policy "authenticated full access parceiros" on parceiros
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access operacoes" on operacoes;
create policy "authenticated full access operacoes" on operacoes
  for all to authenticated using (true) with check (true);

-- 4) Config: taxas de câmbio (chave/valor). A moeda base de ARMAZENAMENTO é o
--    peso chileno (CLP); as taxas dizem quanto de CLP vale 1 USD e 1 BRL, e
--    afetam só a EXIBIÇÃO. Esta tabela é aditiva (não apaga nada ao recriar).
create table if not exists config (
  chave text primary key,
  valor numeric not null default 0
);

alter table config enable row level security;
drop policy if exists "authenticated full access config" on config;
create policy "authenticated full access config" on config
  for all to authenticated using (true) with check (true);
