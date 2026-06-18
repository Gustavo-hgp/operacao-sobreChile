-- Operação Chile — schema do Supabase
-- Rode isto no SQL Editor do seu projeto Supabase.
--
-- Se você já rodou uma versão anterior do schema, rode antes (apaga tudo):
--   drop table if exists operacoes, servicos, parceiros, passeios cascade;

-- 1) Passeio (referência): nome + valor do cupo por pessoa (preço de referência).
create table if not exists passeios (
  id                bigint generated always as identity primary key,
  nome              text not null,
  valor_cupo_pessoa numeric(10,2) not null default 0,
  created_at        timestamptz not null default now()
);

-- 2) Parceiro: presta o serviço (van, guia ou van+guia) por um valor, com uma
--    capacidade máxima de pessoas.
create table if not exists parceiros (
  id            bigint generated always as identity primary key,
  nome          text not null,
  tipo_servico  text not null default 'van_guia' check (tipo_servico in ('van','guia','van_guia')),
  qtd_maxima    integer not null default 0 check (qtd_maxima >= 0),
  valor_servico numeric(10,2) not null default 0,
  created_at    timestamptz not null default now()
);

-- 3) Operação: um passeio executado com um parceiro, para N pessoas.
--    O cupo do parceiro por pessoa = valor_servico ÷ qtd_pessoas (calculado no app).
create table if not exists operacoes (
  id             bigint generated always as identity primary key,
  data           date not null,
  passeio_id     bigint not null references passeios(id) on delete cascade,
  parceiro_id    bigint not null references parceiros(id) on delete cascade,
  qtd_pessoas    integer not null default 0 check (qtd_pessoas >= 0),
  comissao_roupa numeric(10,2) not null default 0,
  created_at     timestamptz not null default now()
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
