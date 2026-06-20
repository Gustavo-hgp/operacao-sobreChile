-- Migração: preço do parceiro POR passeio e POR tipo de serviço.
-- Rode UMA vez no SQL Editor do Supabase.
--
-- Cria a tabela parceiro_precos e remove as colunas de preço fixo do parceiro.
-- ⚠️ As operações já lançadas NÃO são afetadas (o valor fica gravado nelas).
--    Mas os preços antigos do parceiro (valor_van/guia/van_guia) saem — recadastre
--    os preços por passeio na tela de Parceiros depois.

create table if not exists parceiro_precos (
  id           bigint generated always as identity primary key,
  parceiro_id  bigint not null references parceiros(id) on delete cascade,
  passeio_id   bigint not null references passeios(id) on delete cascade,
  tipo_servico text not null check (tipo_servico in ('van','guia','van_guia')),
  valor        numeric(10,2) not null default 0,
  created_at   timestamptz not null default now(),
  unique (parceiro_id, passeio_id, tipo_servico)
);

create index if not exists idx_parceiro_precos_parceiro on parceiro_precos(parceiro_id);
create index if not exists idx_parceiro_precos_passeio on parceiro_precos(passeio_id);

alter table parceiro_precos enable row level security;
drop policy if exists "authenticated full access parceiro_precos" on parceiro_precos;
create policy "authenticated full access parceiro_precos" on parceiro_precos
  for all to authenticated using (true) with check (true);

-- Remove as colunas antigas de preço fixo do parceiro (agora o preço é por passeio).
alter table parceiros drop column if exists valor_van;
alter table parceiros drop column if exists valor_guia;
alter table parceiros drop column if exists valor_van_guia;
