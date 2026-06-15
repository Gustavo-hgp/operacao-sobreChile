import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { money, todayISO, fmtData } from '../lib/format.js'
import { calcOperacao } from '../lib/calc.js'
import ServicoSelect from '../components/ServicoSelect.jsx'

const PAGE_SIZE = 10
const emptyForm = {
  servico_id: '',
  data: todayISO(),
  custo_van_guia: '',
  qtd_pessoas: '',
  comissao_roupa: '',
}

export default function Lancamentos() {
  const [servicos, setServicos] = useState([])
  const [operacoes, setOperacoes] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [searchDate, setSearchDate] = useState('')
  const [tick, setTick] = useState(0) // força recarregar a lista após salvar/excluir

  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [servicosLoading, setServicosLoading] = useState(true)
  const [listLoading, setListLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // Serviços ativos do seletor — carrega uma vez.
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data, error } = await supabase
        .from('servicos')
        .select('id, nome, valor_cupo, parceiros(nome)')
        .eq('ativo', true)
        .order('nome')
      if (error) setError(error.message)
      else setServicos(data)
      setServicosLoading(false)
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
          'id, data, custo_van_guia, qtd_pessoas, comissao_roupa, servico_id, servicos(nome, valor_cupo, parceiros(nome))',
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

  // Prévia dos cálculos ao vivo enquanto preenche o formulário.
  const servicoSel = servicos.find((s) => String(s.id) === String(form.servico_id))
  const preview = useMemo(
    () =>
      calcOperacao({
        qtd_pessoas: form.qtd_pessoas,
        custo_van_guia: form.custo_van_guia,
        comissao_roupa: form.comissao_roupa,
        valor_cupo: servicoSel?.valor_cupo,
      }),
    [form, servicoSel],
  )

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function save(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (!form.servico_id) return setError('Escolha o serviço.')
    if (!form.data) return setError('Escolha a data.')

    setSaving(true)
    const row = {
      servico_id: Number(form.servico_id),
      data: form.data,
      custo_van_guia: Number(form.custo_van_guia) || 0,
      qtd_pessoas: Math.max(0, parseInt(form.qtd_pessoas, 10) || 0),
      comissao_roupa: Number(form.comissao_roupa) || 0,
    }
    const { error } = editId
      ? await supabase.from('operacoes').update(row).eq('id', editId)
      : await supabase.from('operacoes').insert(row)
    setSaving(false)
    if (error) return setError(error.message)
    setMsg(editId ? 'Operação atualizada!' : 'Operação salva!')
    setEditId(null)
    setForm({ ...emptyForm, data: form.data }) // mantém a data, limpa o resto
    setSearchDate('')
    setPage(0)
    refreshList()
  }

  function editRow(o) {
    setMsg('')
    setEditId(o.id)
    setForm({
      servico_id: String(o.servico_id),
      data: o.data,
      custo_van_guia: String(o.custo_van_guia),
      qtd_pessoas: String(o.qtd_pessoas),
      comissao_roupa: String(o.comissao_roupa),
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lançar operação</h1>

      {!servicosLoading && servicos.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Nenhum serviço cadastrado ainda.{' '}
          <Link to="/servicos" className="font-semibold underline">Cadastre um serviço</Link>{' '}
          (com o valor do cupo) para começar a lançar operações.
        </div>
      )}

      <form
        onSubmit={save}
        className="bg-white rounded-xl border border-slate-200 p-4 grid gap-3 sm:grid-cols-6 items-end"
      >
        <div className="block sm:col-span-3">
          <span className="block text-xs font-medium text-slate-500 mb-1">Serviço</span>
          <ServicoSelect
            servicos={servicos}
            value={form.servico_id}
            onChange={(id) => setForm((f) => ({ ...f, servico_id: id }))}
          />
        </div>
        <Field label="Data" className="sm:col-span-3">
          <input
            type="date"
            className="input"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
          />
        </Field>
        <Field label="Quanto gastei (van + guia)" className="sm:col-span-2">
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={form.custo_van_guia}
            onChange={(e) => setForm({ ...form, custo_van_guia: e.target.value })}
            placeholder="0,00"
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
        <Field label="Comissão de roupa" className="sm:col-span-2">
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={form.comissao_roupa}
            onChange={(e) => setForm({ ...form, comissao_roupa: e.target.value })}
            placeholder="0,00"
          />
        </Field>

        {/* Prévia dos cálculos */}
        {servicoSel && (
          <div className="sm:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
            <Preview label="Custo /pessoa" value={money(preview.custoPorPessoa)} />
            <Preview label="Se terceirizasse" value={money(preview.custoTerceirizado)} />
            <Preview
              label="Economia"
              value={money(preview.saldoEconomia)}
              tone={preview.saldoEconomia >= 0 ? 'text-green-600' : 'text-accent'}
            />
            <Preview
              label="Resultado do dia"
              value={money(preview.resultadoDia)}
              tone={preview.resultadoDia >= 0 ? 'text-green-600' : 'text-accent'}
              strong
            />
          </div>
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
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Serviço</th>
                <th className="px-4 py-2 text-right">Pessoas</th>
                <th className="px-4 py-2 text-right">Custo van</th>
                <th className="px-4 py-2 text-right">Custo /pax</th>
                <th className="px-4 py-2 text-right">Resultado</th>
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
                      <td className="px-4 py-2 font-medium">{o.servicos?.nome || '—'}</td>
                      <td className="px-4 py-2 text-right">{o.qtd_pessoas}</td>
                      <td className="px-4 py-2 text-right">{money(c.custoVan)}</td>
                      <td className="px-4 py-2 text-right">{money(c.custoPorPessoa)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${c.resultadoDia >= 0 ? 'text-green-600' : 'text-accent'}`}>
                        {money(c.resultadoDia)}
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
