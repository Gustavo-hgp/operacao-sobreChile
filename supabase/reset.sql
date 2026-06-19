-- Operação Chile — RESET do banco.
-- Use quando precisar recriar do zero (ex.: erro "Could not find the 'X' column").
-- ⚠️ ATENÇÃO: isto APAGA TODOS OS DADOS dessas tabelas.
-- Passo 1: rode este arquivo no SQL Editor.
-- Passo 2: rode o supabase/schema.sql logo em seguida (ele recria tudo no formato certo).

drop table if exists operacoes cascade;
drop table if exists servicos  cascade;  -- tabela do modelo antigo, não é mais usada
drop table if exists parceiros cascade;
drop table if exists passeios  cascade;
