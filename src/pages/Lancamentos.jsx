import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { money, todayISO, fmtData } from '../lib/format.js'
import {
  calcEconomia,
  calcOperacao,
  comissaoValor,
  pontoEquilibrio,
  tipoServicoLabel,
  tiposDoParceiro,
} from '../lib/calc.js'
import PickList from '../components/PickList.jsx'

const PAGE_SIZE = 10
const emptyForm = {
  passeio_id: '',
  parceiro_id: '',
  tipo_servico: '',
  data: todayISO(),
  qtd_pessoas: '',
  valor_roupa: '',
  comissao_pct: '',
}

export default function Lancamentos() {
  const [passeios, setPasseios] = useState([])
  const [parceiros, setParceiros] = useState([])
  const [operacoes, setOperacoes] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [searchDate, setSearchDate] = useState('')
  const [tick, setTick] = useState(0)

  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [baseLoading, setBaseLoading] = useState(true)
  const [listLoading, setListLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // Passeios + parceiros do formulário — carrega uma vez.
  useEffect(() => {
    if (!supabase) return setBaseLoading(false)
    ;(async () => {
      const [p, pa] = await Promise.all([
        supabase.from('passeios').select('id, nome, valor_cupo_pessoa').order('nome'),
        supabase
          .from('parceiros')
          .select('id, nome, qtd_maxima, valor_van, valor_guia, valor_van_guia')
          .order('nome'),
      ])
      if (p.error) setError(p.error.message)
      else setPasseios(p.data)
      if (!pa.error) setParceiros(pa.data)
      setBaseLoading(false)
    })()
  }, [])

  // Operações — 10 por página, filtráveis por data.
  useEffect(() => {
    if (!supabase) return setListLoading(false)
    let cancelled = false
    ;(async () => {
      setListLoading(true)
      let q = supabase
        .from('operacoes')
        .select(
          'id, data, tipo_servico, valor_servico, qtd_pessoas, valor_roupa, comissao_pct, passeio_id, parceiro_id, passeios(nome, valor_cupo_pessoa), parceiros(nome)',
          { count: 'exact' },
        )
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
      if (searchDate) q = q.eq('data', searchDate)
      q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      const { data, error, count } = await q
      if (cancelled) return
      if (error) {
        setError(error.message)
        setListLoading(false)
        return
      }
      if (data.length === 0 && page > 0) return setPage((p) => p - 1)
      setOperacoes(data)
      setTotal(count ?? 0)
      setListLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [page, searchDate, tick])

  const refreshList = () => setTick((t) => t + 1)

  const passeioSel = passeios.find((p) => String(p.id) === String(form.passeio_id))
  const parceiroSel = parceiros.find((p) => String(p.id) === String(form.parceiro_id))
  const tipos = parceiroSel ? tiposDoParceiro(parceiroSel) : []
  const tipoSel = tipos.find((t) => t.tipo === form.tipo_servico) || null
  const valorServico = tipoSel?.valor ?? 0
  const qtd = parseInt(form.qtd_pessoas, 10) || 0

  // Se o parceiro presta só um tipo, já seleciona ele.
  useEffect(() => {
    if (tipos.length === 1 && form.tipo_servico !== tipos[0].tipo) {
      setForm((f) => ({ ...f, tipo_servico: tipos[0].tipo }))
    }
  }, [form.parceiro_id])

  const calc = useMemo(
    () =>
      calcEconomia({
        valorCupoReferencia: passeioSel?.valor_cupo_pessoa,
        valorServicoParceiro: valorServico,
        qtdPessoas: qtd,
      }),
    [passeioSel, valorServico, qtd],
  )
  const pe = parceiroSel && passeioSel && tipoSel
    ? pontoEquilibrio(valorServico, passeioSel.valor_cupo_pessoa)
    : null
  const excedeMax = parceiroSel && parceiroSel.qtd_maxima > 0 && qtd > parceiroSel.qtd_maxima
  const comissao = ((Number(form.valor_roupa) || 0) * (Number(form.comissao_pct) || 0)) / 100
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function save(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (!form.passeio_id) return setError('Escolha o passeio.')
    if (!form.parceiro_id) return setError('Escolha o parceiro.')
    if (!form.tipo_servico) return setError('Escolha o tipo de serviço.')
    if (!form.data) return setError('Escolha a data.')

    setSaving(true)
    const row = {
      passeio_id: Number(form.passeio_id),
      parceiro_id: Number(form.parceiro_id),
      tipo_servico: form.tipo_servico,
      valor_servico: valorServico,
      data: form.data,
      qtd_pessoas: Math.max(0, qtd),
      valor_roupa: Number(form.valor_roupa) || 0,
      comissao_pct: Number(form.comissao_pct) || 0,
    }
    const { error } = editId
      ? await supabase.from('operacoes').update(row).eq('id', editId)
      : await supabase.from('operacoes').insert(row)
    setSaving(false)
    if (error) return setError(error.message)
    setMsg(editId ? 'Operação atualizada!' : 'Operação salva!')
    setEditId(null)
    setForm({ ...emptyForm, data: form.data })
    setSearchDate('')
    setPage(0)
    refreshList()
  }

  function editRow(o) {
    setMsg('')
    setEditId(o.id)
    setForm({
      passeio_id: String(o.passeio_id),
      parceiro_id: String(o.parceiro_id),
      tipo_servico: o.tipo_servico,
      data: o.data,
      qtd_pessoas: String(o.qtd_pessoas),
      valor_roupa: o.valor_roupa ? String(o.valor_roupa) : '',
      comissao_pct: o.comissao_pct ? String(o.comissao_pct) : '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null)
    setForm(emptyForm)
    setMsg('')
  }

  async function remove(id) {
    if (!confirm('Excluir esta operação?')) return
    const { error } = await supabase.from('operacoes').delete().eq('id', id)
    if (error) return setError(error.message)
    refreshList()
  }

  const faltaCadastro = !baseLoading && (passeios.length === 0 || parceiros.length === 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lançar operação</h1>

      {faltaCadastro && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Pra lançar você precisa de pelo menos um{' '}
          <Link to="/passeios" className="font-semibold underline">passeio</Link> e um{' '}
          <Link to="/parceiros" className="font-semibold underline">parceiro</Link> cadastrados.
        </div>
      )}

      <form
        onSubmit={save}
        className="bg-white rounded-xl border border-slate-200 p-4 grid gap-3 sm:grid-cols-6 items-end"
      >
        <div className="block sm:col-span-3">
          <span className="block text-xs font-medium text-slate-500 mb-1">Passeio</span>
          <PickList
            items={passeios}
            value={form.passeio_id}
            onChange={(id) => setForm((f) => ({ ...f, passeio_id: id }))}
            emptyText="Nenhum passeio cadastrado."
          />
        </div>
        <div className="block sm:col-span-3">
          <span className="block text-xs font-medium text-slate-500 mb-1">Parceiro</span>
          <PickList
            items={parceiros}
            value={form.parceiro_id}
            onChange={(id) => setForm((f) => ({ ...f, parceiro_id: id, tipo_servico: '' }))}
            emptyText="Nenhum parceiro cadastrado."
          />
        </div>

        <Field label="Tipo de serviço" className="sm:col-span-2">
          <select
            className="input disabled:bg-slate-50 disabled:text-slate-400"
            value={form.tipo_servico}
            onChange={(e) => setForm({ ...form, tipo_servico: e.target.value })}
            disabled={!parceiroSel}
          >
            <option value="">{parceiroSel ? 'Escolha…' : 'Escolha o parceiro antes'}</option>
            {tipos.map((t) => (
              <option key={t.tipo} value={t.tipo}>
                {tipoServicoLabel(t.tipo)} — {money(t.valor)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data" className="sm:col-span-2">
          <input
            type="date"
            className="input"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
          />
        </Field>
        <Field label="Pessoas" className="sm:col-span-2">
          <input
            type="number"
            min="0"
            className="input"
            value={form.qtd_pessoas}
            onChange={(e) => setForm({ ...form, qtd_pessoas: e.target.value })}
            placeholder="0"
          />
        </Field>

        <Field label="Total alugado em roupa (opcional)" className="sm:col-span-3">
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={form.valor_roupa}
            onChange={(e) => setForm({ ...form, valor_roupa: e.target.value })}
            placeholder="0,00"
          />
        </Field>
        <Field label="Comissão de roupa (%)" className="sm:col-span-3">
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={form.comissao_pct}
            onChange={(e) => setForm({ ...form, comissao_pct: e.target.value })}
            placeholder="0"
          />
        </Field>

        {passeioSel && parceiroSel && tipoSel && (
          <div className="sm:col-span-6 grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
            <Preview label="Cupo do parceiro /pessoa" value={money(calc.cupoParceiroPorPessoa)} />
            <Preview
              label="Economizado /pessoa"
              value={money(calc.economizadoPorPessoa)}
              tone={calc.economizadoPorPessoa >= 0 ? 'text-green-600' : 'text-accent'}
            />
            <Preview
              label="Economia total"
              value={money(calc.economiaTotal)}
              tone={calc.economiaTotal >= 0 ? 'text-green-600' : 'text-accent'}
              strong
            />
            <Preview label="Comissão de roupa" value={money(comissao)} />
            <Preview label="Ponto de equilíbrio" value={pe == null ? '—' : `${pe} pessoas`} />
          </div>
        )}

        {excedeMax && (
          <p className="sm:col-span-6 text-sm text-accent">
            Atenção: {qtd} pessoas excede a capacidade do parceiro (máx {parceiroSel.qtd_maxima}).
          </p>
        )}

        <div className="sm:col-span-6 flex items-center justify-end gap-3">
          {editId && (
            <button type="button" className="btn-ghost" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Salvando…' : editId ? 'Atualizar operação' : 'Salvar operação'}
          </button>
        </div>
      </form>

      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {error && <p className="text-sm text-accent">{error}</p>}

      <div>
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-600">
            {searchDate ? `Operações de ${fmtData(searchDate)}` : 'Operações recentes'}
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="input w-auto py-1.5"
              value={searchDate}
              onChange={(e) => {
                setPage(0)
                setSearchDate(e.target.value)
              }}
              aria-label="Buscar por data"
            />
            {searchDate && (
              <button
                type="button"
                className="link"
                onClick={() => {
                  setPage(0)
                  setSearchDate('')
                }}
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Passeio</th>
                <th className="px-4 py-2">Parceiro</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Pessoas</th>
                <th className="px-4 py-2 text-right">Economia</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {listLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">Carregando…</td>
                </tr>
              )}
              {!listLoading && operacoes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    {searchDate ? 'Nenhuma operação nesta data.' : 'Nenhuma operação ainda.'}
                  </td>
                </tr>
              )}
              {!listLoading &&
                operacoes.map((o) => {
                  const c = calcOperacao(o)
                  return (
                    <tr key={o.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 whitespace-nowrap">{fmtData(o.data)}</td>
                      <td className="px-4 py-2 font-medium">{o.passeios?.nome || '—'}</td>
                      <td className="px-4 py-2">{o.parceiros?.nome || '—'}</td>
                      <td className="px-4 py-2 text-slate-600">{tipoServicoLabel(o.tipo_servico)}</td>
                      <td className="px-4 py-2 text-right">{o.qtd_pessoas}</td>
                      <td className={`px-4 py-2 text-right font-medium ${c.economiaTotal >= 0 ? 'text-green-600' : 'text-accent'}`}>
                        {money(c.economiaTotal)}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button className="link" onClick={() => editRow(o)}>Editar</button>
                        <button className="link text-accent ml-3" onClick={() => remove(o.id)}>Excluir</button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>

          {!listLoading && total > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>
                {total} opera{total === 1 ? 'ção' : 'ções'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="btn-ghost px-3 py-1 disabled:opacity-40"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Anterior
                </button>
                <span>Página {page + 1} de {totalPages}</span>
                <button
                  type="button"
                  className="btn-ghost px-3 py-1 disabled:opacity-40"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Preview({ label, value, tone = 'text-slate-800', strong = false }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`${strong ? 'text-base font-bold' : 'font-medium'} ${tone}`}>{value}</div>
    </div>
  )
}
