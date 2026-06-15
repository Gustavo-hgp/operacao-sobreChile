# Operação Chile

Sistema de gestão de operação de passeios: compara o custo de **rodar a van própria**
com o de **terceirizar para um parceiro**, controla a **comissão de roupas** e mostra o
**ponto de equilíbrio** de cada serviço.

Stack: **React + Vite + Tailwind + Supabase** (mesma base do Impactour).

## Como funciona

- **Parceiros** — cadastro das operadoras parceiras.
- **Serviços** — cada passeio/rota, vinculado a um parceiro e ao **valor do cupo**
  (quanto o parceiro cobraria por cliente se você terceirizasse).
- **Lançar** — uma linha por viagem: data, serviço, custo da van + guia, nº de pessoas
  e comissão de roupa. Os cálculos saem na hora.
- **Dashboard** — KPIs, comparativo operar × terceirizar, resultado por dia e o
  ponto de equilíbrio por serviço.

### Cálculos

| Indicador | Fórmula |
|---|---|
| Custo por pessoa | `custo_van_guia ÷ qtd_pessoas` |
| Custo terceirizado | `qtd_pessoas × valor_cupo` |
| Economia real | `custo_terceirizado − custo_van_guia` |
| Resultado do dia | `economia + comissao_roupa` |
| Passageiros mínimos | `teto(custo_médio_van ÷ valor_cupo)` |

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com seu projeto Supabase
npm run dev
```

Abra http://localhost:5173

## Supabase

1. Crie um projeto em https://supabase.com
2. No **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Authentication > Users**, crie seu usuário (marque *Auto Confirm User*) e
   desative o cadastro público em *Sign In / Providers*.
4. Pegue a **URL** e a **anon key** em *Project Settings > API* e coloque no `.env`.

## Deploy com Docker

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... docker compose up -d --build
```

App em http://localhost:8080. As credenciais são injetadas em runtime no
`config.js` — a mesma imagem serve qualquer projeto Supabase sem rebuild.
