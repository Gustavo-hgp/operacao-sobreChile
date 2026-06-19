// Cálculo da economia, conforme a modelagem:
//   - passeio (referência): valor_cupo_pessoa = cupo de referência por pessoa.
//   - parceiro: presta van, guia e/ou van+guia, cada um com seu preço; qtd_maxima
//     = capacidade máxima de pessoas.
//
// O cupo por pessoa do parceiro = valor do serviço (do tipo escolhido) ÷ pessoas.

export function calcEconomia({ valorCupoReferencia, valorServicoParceiro, qtdPessoas }) {
  const ref = Number(valorCupoReferencia) || 0
  const servico = Number(valorServicoParceiro) || 0
  const pessoas = Number(qtdPessoas) || 0

  const cupoParceiroPorPessoa = pessoas > 0 ? servico / pessoas : 0
  const economizadoPorPessoa = ref - cupoParceiroPorPessoa
  const economiaTotal = economizadoPorPessoa * pessoas

  return { ref, servico, pessoas, cupoParceiroPorPessoa, economizadoPorPessoa, economiaTotal }
}

// Atalho a partir de uma operação. Os valores são gravados na própria operação
// (snapshot): valor_cupo (referência) e valor_servico (parceiro). Assim, editar
// ou excluir o passeio/parceiro NÃO altera o histórico já lançado.
// (mantém fallback ao join `passeios` por compatibilidade com dados antigos.)
export function calcOperacao(op) {
  return calcEconomia({
    valorCupoReferencia: op?.valor_cupo ?? op?.passeios?.valor_cupo_pessoa,
    valorServicoParceiro: op?.valor_servico,
    qtdPessoas: op?.qtd_pessoas,
  })
}

// Comissão de roupa = total alugado × percentual.
export const comissaoValor = (op) =>
  ((Number(op?.valor_roupa) || 0) * (Number(op?.comissao_pct) || 0)) / 100

// Ponto de equilíbrio: a partir de quantas pessoas o parceiro fica mais barato
// que o cupo de referência (valor_servico / pessoas < cupo_referencia).
export function pontoEquilibrio(valorServicoParceiro, valorCupoReferencia) {
  const ref = Number(valorCupoReferencia) || 0
  const servico = Number(valorServicoParceiro) || 0
  if (ref <= 0) return null
  return Math.ceil(servico / ref)
}

// Rótulo amigável do tipo de serviço.
export const tipoServicoLabel = (t) =>
  ({ van: 'Van', guia: 'Guia', van_guia: 'Van + Guia' }[t] || t || '—')

// Tipos de serviço que um parceiro oferece (os que têm preço preenchido),
// com o valor de cada um. Ex.: [{ tipo: 'van', valor: 150 }, ...].
export function tiposDoParceiro(p) {
  const out = []
  if (p?.valor_van != null) out.push({ tipo: 'van', valor: Number(p.valor_van) })
  if (p?.valor_guia != null) out.push({ tipo: 'guia', valor: Number(p.valor_guia) })
  if (p?.valor_van_guia != null) out.push({ tipo: 'van_guia', valor: Number(p.valor_van_guia) })
  return out
}
