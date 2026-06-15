// Cálculos da operação. Cada operação = UMA viagem lançada.
// O valor do cupo (quanto o parceiro cobraria por cliente) vem do serviço.

// Aceita a operação com o serviço aninhado (op.servicos.valor_cupo) ou um
// valor_cupo solto na própria linha.
export function calcOperacao(op) {
  const qtd = Number(op?.qtd_pessoas) || 0
  const custoVan = Number(op?.custo_van_guia) || 0
  const valorCupo = Number(op?.servicos?.valor_cupo ?? op?.valor_cupo) || 0
  const comissao = Number(op?.comissao_roupa) || 0

  // Quanto custaria se você jogasse esses clientes pro parceiro.
  const custoTerceirizado = qtd * valorCupo
  // Seu custo por pessoa rodando a van própria.
  const custoPorPessoa = qtd > 0 ? custoVan / qtd : 0
  // Economia real de operar por conta (positivo = economizou, negativo = prejuízo).
  const saldoEconomia = custoTerceirizado - custoVan
  // Resultado do dia = economia + comissão de roupas.
  const resultadoDia = saldoEconomia + comissao

  return { qtd, custoVan, valorCupo, comissao, custoTerceirizado, custoPorPessoa, saldoEconomia, resultadoDia }
}

// Ponto de equilíbrio: nº mínimo de passageiros para valer a pena tirar a van
// da garagem em vez de terceirizar. Acima disso, operar compensa.
export function passageirosMinimos(custoVanMedio, valorCupo) {
  if (!valorCupo || valorCupo <= 0) return null
  return Math.ceil(custoVanMedio / valorCupo)
}
