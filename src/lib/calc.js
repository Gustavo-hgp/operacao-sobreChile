// Cálculo da economia, conforme a modelagem:
//   - passeio (referência): valor_cupo_pessoa = cupo de referência por pessoa.
//   - parceiro: valor_servico = quanto o parceiro cobra pelo serviço prestado
//     (van, guia ou van+guia); qtd_maxima = capacidade máxima de pessoas.
//
// O cupo por pessoa do parceiro = valor do serviço ÷ pessoas inseridas no passeio.

export function calcEconomia({ valorCupoReferencia, valorServicoParceiro, qtdPessoas }) {
  const ref = Number(valorCupoReferencia) || 0
  const servico = Number(valorServicoParceiro) || 0
  const pessoas = Number(qtdPessoas) || 0

  // Quanto custa, por pessoa, contratando o parceiro.
  const cupoParceiroPorPessoa = pessoas > 0 ? servico / pessoas : 0
  // Quanto se economiza por pessoa vs. o cupo de referência.
  const economizadoPorPessoa = ref - cupoParceiroPorPessoa
  // Economia total = economia por pessoa × pessoas.
  const economiaTotal = economizadoPorPessoa * pessoas

  return { ref, servico, pessoas, cupoParceiroPorPessoa, economizadoPorPessoa, economiaTotal }
}

// Atalho a partir de uma operação com passeio e parceiro aninhados (joins).
export function calcOperacao(op) {
  return calcEconomia({
    valorCupoReferencia: op?.passeios?.valor_cupo_pessoa,
    valorServicoParceiro: op?.parceiros?.valor_servico,
    qtdPessoas: op?.qtd_pessoas,
  })
}

// Ponto de equilíbrio: a partir de quantas pessoas o parceiro fica mais barato
// que o cupo de referência (valor_servico / pessoas < cupo_referencia).
export function pontoEquilibrio(valorServicoParceiro, valorCupoReferencia) {
  const ref = Number(valorCupoReferencia) || 0
  const servico = Number(valorServicoParceiro) || 0
  if (ref <= 0) return null
  return Math.ceil(servico / ref)
}

// Rótulo amigável do tipo de serviço do parceiro.
export const tipoServicoLabel = (t) =>
  ({ van: 'Van', guia: 'Guia', van_guia: 'Van + Guia' }[t] || t || '—')
