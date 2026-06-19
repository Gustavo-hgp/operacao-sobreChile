-- Migração: histórico imutável (NÃO-destrutiva — não apaga nenhum dado).
-- Rode UMA vez no SQL Editor do Supabase.
--
-- O que faz: grava um "snapshot" dos valores/nomes em cada operação e troca as
-- FKs de ON DELETE CASCADE para ON DELETE SET NULL. Assim, editar ou excluir um
-- passeio/parceiro deixa de afetar o histórico já lançado.

-- 1) Colunas de snapshot (aditivas)
alter table operacoes add column if not exists valor_cupo    numeric(10,2) not null default 0;
alter table operacoes add column if not exists passeio_nome  text;
alter table operacoes add column if not exists parceiro_nome text;

-- 2) Backfill das operações já existentes, a partir dos cadastros atuais
update operacoes o
   set valor_cupo   = coalesce(nullif(o.valor_cupo, 0), p.valor_cupo_pessoa, 0),
       passeio_nome = coalesce(o.passeio_nome, p.nome)
  from passeios p
 where o.passeio_id = p.id;

update operacoes o
   set parceiro_nome = coalesce(o.parceiro_nome, pa.nome)
  from parceiros pa
 where o.parceiro_id = pa.id;

-- 3) IDs passam a ser opcionais e as FKs deixam de apagar (cascade -> set null)
alter table operacoes alter column passeio_id  drop not null;
alter table operacoes alter column parceiro_id drop not null;

alter table operacoes drop constraint if exists operacoes_passeio_id_fkey;
alter table operacoes add  constraint operacoes_passeio_id_fkey
  foreign key (passeio_id) references passeios(id) on delete set null;

alter table operacoes drop constraint if exists operacoes_parceiro_id_fkey;
alter table operacoes add  constraint operacoes_parceiro_id_fkey
  foreign key (parceiro_id) references parceiros(id) on delete set null;
