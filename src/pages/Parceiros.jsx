import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useCurrency } from '../lib/currency.jsx'
import { tipoServicoLabel } from '../lib/calc.js'

const PAGE_SIZE = 10
const emptyForm = { nome: '', qtd_maxima: '' }
const novaLinha = () => ({ passeio_id: '', tipo_servico: 'van_guia', valor: '' })

export default function Parceiros() {
  const { formatMoney } = useCurrency()
  const [parceiros, setParceiros] = useState([])
  const [passeios, setPasseios] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [tick, setTick] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [precos, setPrecos] = useState([novaLinha()])
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nomeRef = useRef(null)

  // Passeios pra montar os seletores de preço — carrega uma vez.
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('passeios')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => data && setPasseios(data))
  }, [])

  // Parceiros (paginado) com seus preços.
  useEffect(() => {
    if (!supabase) return setLoading(false)
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error, count } = await supabase
        .from('parceiros')
        .select('*, parceiro_precos(id, passeio_id, tipo_servico, valor, passeios(nome))', {
          count: 'exact',
        })
        .order('nome')
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      if (data.length === 0 && page > 0) return setPage((p) => p - 1)
      setParceiros(data)
      setTotal(count ?? 0)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [page, tick])

  const refresh = () => setTick((t) => t + 1)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function startEdit(p) {
    setEditId(p.id)
    setForm({ nome: p.nome, qtd_maxima: p.qtd_maxima })
    const rows = (p.parceiro_precos || []).map((pr) => ({
      passeio_id: String(pr.passeio_id),
      tipo_servico: pr.tipo_servico,
      valor: String(pr.valor),
    }))
    setPrecos(rows.length ? rows : [novaLinha()])
    nomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    nomeRef.current?.focus()
  }

  function cancelEdit() {
    setEditId(null)
    setForm(emptyForm)
    setPrecos([novaLinha()])
  }

  const addLinha = () => setPrecos((p) => [...p, novaLinha()])
  const removeLinha = (i) => setPrecos((p) => (p.length === 1 ? [novaLinha()] : p.filter((_, idx) => idx !== i)))
  const updateLinha = (i, patch) =>
    setPrecos((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  async function save(e) {
    e.preventDefault()
    setError('')
    const nome = form.nome.trim()
    if (!nome) return setError('Informe o nome do parceiro.')

    // Linhas válidas (passeio + valor) e sem duplicar (passeio, tipo).
    const validas = precos.filter((pr) => pr.passeio_id && pr.valor !== '')
    if (validas.length === 0)
      return setError('Adicione pelo menos um preço (passeio + valor).')
    const porChave = new Map()
    for (const pr of validas) porChave.set(`${pr.passeio_id}|${pr.tipo_servico}`, pr)
    const linhas = [...porChave.values()]

    const payload = { nome, qtd_maxima: Math.max(0, parseInt(form.qtd_maxima, 10) || 0) }

    let parceiroId = editId
    if (editId) {
      const { error } = await supabase.from('parceiros').update(payload).eq('id', editId)
      if (error) return setError(error.message)
    } else {
      const { data, error } = await supabase.from('parceiros').insert(payload).select('id').single()
      if (error) return setError(error.message)
      parceiroId = data.id
    }

    // Sincroniza os preços: apaga os antigos e insere os atuais.
    await supabase.from('parceiro_precos').delete().eq('parceiro_id', parceiroId)
    const rows = linhas.map((pr) => ({
      parceiro_id: parceiroId,
      passeio_id: Number(pr.passeio_id),
      tipo_servico: pr.tipo_servico,
      valor: Number(pr.valor) || 0,
    }))
    const { error: insErr } = await supabase.from('parceiro_precos').insert(rows)
    if (insErr) return setError(insErr.message)

    cancelEdit()
    refresh()
  }

  async function remove(id) {
    if (!confirm('Excluir este parceiro? As operações já lançadas continuam no histórico (mantêm os valores da época).')) return
    const { error } = await supabase.from('parceiros').delete().eq('id', id)
    if (error) return setError(error.message)
    refresh()
  }

  const semPasseios = passeios.length === 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Parceiros</h1>
      <p className="text-sm text-slate-500 -mt-4">
        Quem presta o serviço. Cadastre o preço dele <strong>por passeio</strong> e por tipo (van, guia ou van + guia).
      </p>

      {semPasseios && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Cadastre um <strong>passeio</strong> primeiro pra poder definir os preços do parceiro.
        </div>
      )}

      <form
        onSubmit={save}
        className={`bg-white rounded-xl border p-4 space-y-4 ${editId ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200'}`}
      >
        {editId && (
          <p className="text-sm font-medium text-brand-dark">Editando “{form.nome}”</p>
        )}
        <div className="grid gap-3 sm:grid-cols-3 items-end">
          <Field label="Parceiro" className="sm:col-span-2">
            <input
              ref={nomeRef}
              className="input"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: Dudu"
            />
          </Field>
          <Field label="Qtd. máx. de pessoas">
            <input
              className="input"
              type="number"
              min="0"
              value={form.qtd_maxima}
              onChange={(e) => setForm({ ...form, qtd_maxima: e.target.value })}
              placeholder="0"
            />
          </Field>
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-500 mb-2">Preços por passeio</span>
          <div className="space-y-2">
            {precos.map((pr, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <select
                  className="input sm:col-span-5"
                  value={pr.passeio_id}
                  onChange={(e) => updateLinha(i, { passeio_id: e.target.value })}
                >
                  <option value="">Passeio…</option>
                  {passeios.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <select
                  className="input sm:col-span-3"
                  value={pr.tipo_servico}
                  onChange={(e) => updateLinha(i, { tipo_servico: e.target.value })}
                >
                  <option value="van">Van</option>
                  <option value="guia">Guia</option>
                  <option value="van_guia">Van + Guia</option>
                </select>
                <input
                  className="input sm:col-span-3"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pr.valor}
                  onChange={(e) => updateLinha(i, { valor: e.target.value })}
                  placeholder="Valor"
                />
                <button
                  type="button"
                  onClick={() => removeLinha(i)}
                  className="sm:col-span-1 justify-self-start sm:justify-self-center p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-accent transition"
                  title="Remover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLinha}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-dark hover:underline"
          >
            <Plus className="h-4 w-4" />
            Adicionar preço
          </button>
        </div>

        <div className="flex gap-2">
          <button className="btn-primary" type="submit">
            {editId ? 'Salvar alterações' : 'Adicionar parceiro'}
          </button>
          {editId && (
            <button className="btn-ghost" type="button" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {error && <p className="text-sm text-accent">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Parceiro</th>
              <th className="px-4 py-2 text-right">Máx.</th>
              <th className="px-4 py-2">Preços (passeio · tipo)</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Carregando…</td></tr>
            )}
            {!loading && parceiros.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Nenhum parceiro cadastrado.</td></tr>
            )}
            {!loading && parceiros.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2 font-medium">{p.nome}</td>
                <td className="px-4 py-2 text-right">{p.qtd_maxima}</td>
                <td className="px-4 py-2 text-slate-600">
                  {(p.parceiro_precos || []).length === 0 ? (
                    <span className="text-slate-400">— sem preços —</span>
                  ) : (
                    <div className="space-y-0.5">
                      {p.parceiro_precos.map((pr) => (
                        <div key={pr.id}>
                          {pr.passeios?.nome || '—'} · {tipoServicoLabel(pr.tipo_servico)}:{' '}
                          <span className="font-medium text-slate-700">{formatMoney(pr.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button className="link" onClick={() => startEdit(p)}>Editar</button>
                  <button className="link text-accent ml-3" onClick={() => remove(p.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{total} parceiro{total === 1 ? '' : 's'}</span>
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
