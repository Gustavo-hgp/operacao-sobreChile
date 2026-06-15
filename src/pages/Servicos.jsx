import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { money } from '../lib/format.js'

const emptyForm = { nome: '', parceiro_id: '', valor_cupo: '', ativo: true }

export default function Servicos() {
  const [servicos, setServicos] = useState([])
  const [parceiros, setParceiros] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nomeRef = useRef(null)

  async function load() {
    if (!supabase) return setLoading(false)
    setLoading(true)
    const [s, p] = await Promise.all([
      supabase.from('servicos').select('*, parceiros(nome)').order('nome'),
      supabase.from('parceiros').select('id, nome').order('nome'),
    ])
    if (s.error) setError(s.error.message)
    else setServicos(s.data)
    if (!p.error) setParceiros(p.data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(s) {
    setEditId(s.id)
    setForm({
      nome: s.nome,
      parceiro_id: s.parceiro_id ? String(s.parceiro_id) : '',
      valor_cupo: s.valor_cupo,
      ativo: s.ativo,
    })
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
      parceiro_id: form.parceiro_id ? Number(form.parceiro_id) : null,
      valor_cupo: Number(form.valor_cupo) || 0,
      ativo: form.ativo,
    }
    if (!payload.nome) return setError('Informe o nome do serviço.')

    const query = editId
      ? supabase.from('servicos').update(payload).eq('id', editId)
      : supabase.from('servicos').insert(payload)
    const { error } = await query
    if (error) return setError(error.message)
    cancelEdit()
    load()
  }

  async function remove(id) {
    if (!confirm('Excluir este serviço? As operações lançadas com ele também serão removidas.')) return
    const { error } = await supabase.from('servicos').delete().eq('id', id)
    if (error) return setError(error.message)
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Serviços</h1>
      <p className="text-sm text-slate-500 -mt-4">
        Cada serviço tem o <strong>valor do cupo</strong> — quanto o parceiro cobraria por cliente se você terceirizasse.
      </p>

      <form
        onSubmit={save}
        className={`bg-white rounded-xl border p-4 grid gap-3 sm:grid-cols-4 items-end ${editId ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200'}`}
      >
        {editId && (
          <p className="sm:col-span-4 text-sm font-medium text-brand-dark">Editando “{form.nome}”</p>
        )}
        <Field label="Serviço / Rota" className="sm:col-span-2">
          <input
            ref={nomeRef}
            className="input"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex.: Passeio Lagoa"
          />
        </Field>
        <Field label="Parceiro">
          <select
            className="input"
            value={form.parceiro_id}
            onChange={(e) => setForm({ ...form, parceiro_id: e.target.value })}
          >
            <option value="">— Sem parceiro —</option>
            {parceiros.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor do cupo /cliente">
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={form.valor_cupo}
            onChange={(e) => setForm({ ...form, valor_cupo: e.target.value })}
            placeholder="0,00"
          />
        </Field>
        <label className="sm:col-span-4 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
          />
          Ativo (aparece no lançamento)
        </label>
        <div className="sm:col-span-4 flex gap-2">
          <button className="btn-primary" type="submit">
            {editId ? 'Salvar alterações' : 'Adicionar serviço'}
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
              <th className="px-4 py-2">Serviço</th>
              <th className="px-4 py-2">Parceiro</th>
              <th className="px-4 py-2 text-right">Valor do cupo</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Carregando…</td></tr>
            )}
            {!loading && servicos.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Nenhum serviço cadastrado.</td></tr>
            )}
            {servicos.map((s) => (
              <tr key={s.id} className={`border-t border-slate-100 ${s.ativo ? '' : 'opacity-50'}`}>
                <td className="px-4 py-2 font-medium">
                  {s.nome}
                  {!s.ativo && <span className="ml-2 text-xs text-slate-400">(inativo)</span>}
                </td>
                <td className="px-4 py-2 text-slate-600">{s.parceiros?.nome || '—'}</td>
                <td className="px-4 py-2 text-right">{money(s.valor_cupo)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button className="link" onClick={() => startEdit(s)}>Editar</button>
                  <button className="link text-accent ml-3" onClick={() => remove(s.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
