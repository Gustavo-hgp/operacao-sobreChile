import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { money } from '../lib/format.js'
import { tiposDoParceiro, tipoServicoLabel } from '../lib/calc.js'

const emptyForm = { nome: '', qtd_maxima: '', valor_van: '', valor_guia: '', valor_van_guia: '' }

export default function Parceiros() {
  const [parceiros, setParceiros] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nomeRef = useRef(null)

  async function load() {
    if (!supabase) return setLoading(false)
    setLoading(true)
    const { data, error } = await supabase.from('parceiros').select('*').order('nome')
    if (error) setError(error.message)
    else setParceiros(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(p) {
    setEditId(p.id)
    setForm({
      nome: p.nome,
      qtd_maxima: p.qtd_maxima,
      valor_van: p.valor_van ?? '',
      valor_guia: p.valor_guia ?? '',
      valor_van_guia: p.valor_van_guia ?? '',
    })
    nomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    nomeRef.current?.focus()
  }

  function cancelEdit() {
    setEditId(null)
    setForm(emptyForm)
  }

  // "" -> null (não presta esse tipo); senão o número.
  const num = (v) => (v === '' || v == null ? null : Number(v) || 0)

  async function save(e) {
    e.preventDefault()
    setError('')
    const payload = {
      nome: form.nome.trim(),
      qtd_maxima: Math.max(0, parseInt(form.qtd_maxima, 10) || 0),
      valor_van: num(form.valor_van),
      valor_guia: num(form.valor_guia),
      valor_van_guia: num(form.valor_van_guia),
    }
    if (!payload.nome) return setError('Informe o nome do parceiro.')
    if (payload.valor_van == null && payload.valor_guia == null && payload.valor_van_guia == null)
      return setError('Preencha o preço de pelo menos um tipo de serviço.')

    const query = editId
      ? supabase.from('parceiros').update(payload).eq('id', editId)
      : supabase.from('parceiros').insert(payload)
    const { error } = await query
    if (error) return setError(error.message)
    cancelEdit()
    load()
  }

  async function remove(id) {
    if (!confirm('Excluir este parceiro? As operações lançadas com ele também serão removidas.')) return
    const { error } = await supabase.from('parceiros').delete().eq('id', id)
    if (error) return setError(error.message)
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Parceiros</h1>
      <p className="text-sm text-slate-500 -mt-4">
        Quem presta o serviço. Preencha o preço de cada tipo que ele faz (deixe em branco o que ele não faz).
      </p>

      <form
        onSubmit={save}
        className={`bg-white rounded-xl border p-4 grid gap-3 sm:grid-cols-2 items-end ${editId ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200'}`}
      >
        {editId && (
          <p className="sm:col-span-2 text-sm font-medium text-brand-dark">Editando “{form.nome}”</p>
        )}
        <Field label="Parceiro">
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

        <div className="sm:col-span-2">
          <span className="block text-xs font-medium text-slate-500 mb-2">
            Tipos de serviço e preços
          </span>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Van">
              <input
                className="input" type="number" step="0.01" min="0"
                value={form.valor_van}
                onChange={(e) => setForm({ ...form, valor_van: e.target.value })}
                placeholder="não faz"
              />
            </Field>
            <Field label="Guia">
              <input
                className="input" type="number" step="0.01" min="0"
                value={form.valor_guia}
                onChange={(e) => setForm({ ...form, valor_guia: e.target.value })}
                placeholder="não faz"
              />
            </Field>
            <Field label="Van + Guia">
              <input
                className="input" type="number" step="0.01" min="0"
                value={form.valor_van_guia}
                onChange={(e) => setForm({ ...form, valor_van_guia: e.target.value })}
                placeholder="não faz"
              />
            </Field>
          </div>
        </div>

        <div className="sm:col-span-2 flex gap-2">
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
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Parceiro</th>
              <th className="px-4 py-2 text-right">Máx. pessoas</th>
              <th className="px-4 py-2">Serviços e preços</th>
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
            {parceiros.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{p.nome}</td>
                <td className="px-4 py-2 text-right">{p.qtd_maxima}</td>
                <td className="px-4 py-2 text-slate-600">
                  {tiposDoParceiro(p)
                    .map((t) => `${tipoServicoLabel(t.tipo)}: ${money(t.valor)}`)
                    .join(' · ') || '—'}
                </td>
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
