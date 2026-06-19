import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useCurrency } from '../lib/currency.jsx'

const PAGE_SIZE = 10
const emptyForm = { nome: '', valor_cupo_pessoa: '' }

export default function Passeios() {
  const { formatMoney } = useCurrency()
  const [passeios, setPasseios] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [tick, setTick] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nomeRef = useRef(null)

  useEffect(() => {
    if (!supabase) return setLoading(false)
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error, count } = await supabase
        .from('passeios')
        .select('*', { count: 'exact' })
        .order('nome')
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      if (data.length === 0 && page > 0) return setPage((p) => p - 1)
      setPasseios(data)
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
    setForm({ nome: p.nome, valor_cupo_pessoa: p.valor_cupo_pessoa })
    nomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    nomeRef.current?.focus()
  }

  function cancelEdit() {
    setEditId(null)
    setForm(emptyForm)
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    const payload = {
      nome: form.nome.trim(),
      valor_cupo_pessoa: Number(form.valor_cupo_pessoa) || 0,
    }
    if (!payload.nome) return setError('Informe o nome do passeio.')

    const query = editId
      ? supabase.from('passeios').update(payload).eq('id', editId)
      : supabase.from('passeios').insert(payload)
    const { error } = await query
    if (error) return setError(error.message)
    cancelEdit()
    refresh()
  }

  async function remove(id) {
    if (!confirm('Excluir este passeio? As operações já lançadas continuam no histórico (mantêm os valores da época).')) return
    const { error } = await supabase.from('passeios').delete().eq('id', id)
    if (error) return setError(error.message)
    refresh()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Passeios (referência)</h1>
      <p className="text-sm text-slate-500 -mt-4">
        Cada passeio tem o <strong>valor do cupo por pessoa</strong> — o preço de referência usado pra comparar com o parceiro.
      </p>

      <form
        onSubmit={save}
        className={`bg-white rounded-xl border p-4 grid gap-3 sm:grid-cols-3 items-end ${editId ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200'}`}
      >
        {editId && (
          <p className="sm:col-span-3 text-sm font-medium text-brand-dark">Editando “{form.nome}”</p>
        )}
        <Field label="Passeio" className="sm:col-span-2">
          <input
            ref={nomeRef}
            className="input"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex.: Passeio Lagoa"
          />
        </Field>
        <Field label="Valor do cupo /pessoa">
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={form.valor_cupo_pessoa}
            onChange={(e) => setForm({ ...form, valor_cupo_pessoa: e.target.value })}
            placeholder="0,00"
          />
        </Field>
        <div className="sm:col-span-3 flex gap-2">
          <button className="btn-primary" type="submit">
            {editId ? 'Salvar alterações' : 'Adicionar passeio'}
          </button>
          {editId && (
            <button className="btn-ghost" type="button" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {error && <p className="text-sm text-accent">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Passeio</th>
              <th className="px-4 py-2 text-right">Cupo /pessoa</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Carregando…</td></tr>
            )}
            {!loading && passeios.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Nenhum passeio cadastrado.</td></tr>
            )}
            {!loading && passeios.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{p.nome}</td>
                <td className="px-4 py-2 text-right">{formatMoney(p.valor_cupo_pessoa)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button className="link" onClick={() => startEdit(p)}>Editar</button>
                  <button className="link text-accent ml-3" onClick={() => remove(p.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && total > 0 && (
          <Pager page={page} totalPages={totalPages} total={total} setPage={setPage} noun="passeio" />
        )}
      </div>
    </div>
  )
}

function Pager({ page, totalPages, total, setPage, noun }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
      <span>{total} {noun}{total === 1 ? '' : 's'}</span>
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
