import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { money } from '../lib/format.js'

const emptyForm = { nome: '', valor_cupo_pessoa: '' }

export default function Passeios() {
  const [passeios, setPasseios] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nomeRef = useRef(null)

  async function load() {
    if (!supabase) return setLoading(false)
    setLoading(true)
    const { data, error } = await supabase.from('passeios').select('*').order('nome')
    if (error) setError(error.message)
    else setPasseios(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

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
    load()
  }

  async function remove(id) {
    if (!confirm('Excluir este passeio? As operações lançadas com ele também serão removidas.')) return
    const { error } = await supabase.from('passeios').delete().eq('id', id)
    if (error) return setError(error.message)
    load()
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
            {passeios.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{p.nome}</td>
                <td className="px-4 py-2 text-right">{money(p.valor_cupo_pessoa)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button className="link" onClick={() => startEdit(p)}>Editar</button>
                  <button className="link text-accent ml-3" onClick={() => remove(p.id)}>Excluir</button>
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
