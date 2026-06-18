import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { money } from '../lib/format.js'
import { tipoServicoLabel } from '../lib/calc.js'

const emptyForm = { nome: '', tipo_servico: 'van_guia', qtd_maxima: '', valor_servico: '' }

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
      tipo_servico: p.tipo_servico,
      qtd_maxima: p.qtd_maxima,
      valor_servico: p.valor_servico,
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
      tipo_servico: form.tipo_servico,
      qtd_maxima: Math.max(0, parseInt(form.qtd_maxima, 10) || 0),
      valor_servico: Number(form.valor_servico) || 0,
    }
    if (!payload.nome) return setError('Informe o nome do parceiro.')

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
        Quem presta o serviço (van, guia ou van + guia) por um valor, com capacidade máxima de pessoas.
      </p>

      <form
        onSubmit={save}
        className={`bg-white rounded-xl border p-4 grid gap-3 sm:grid-cols-4 items-end ${editId ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200'}`}
      >
        {editId && (
          <p className="sm:col-span-4 text-sm font-medium text-brand-dark">Editando “{form.nome}”</p>
        )}
        <Field label="Parceiro" className="sm:col-span-2">
          <input
            ref={nomeRef}
            className="input"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex.: Namorandê"
          />
        </Field>
        <Field label="Tipo de serviço">
          <select
            className="input"
            value={form.tipo_servico}
            onChange={(e) => setForm({ ...form, tipo_servico: e.target.value })}
          >
            <option value="van">Van</option>
            <option value="guia">Guia</option>
            <option value="van_guia">Van + Guia</option>
          </select>
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
        <Field label="Valor do serviço">
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={form.valor_servico}
            onChange={(e) => setForm({ ...form, valor_servico: e.target.value })}
            placeholder="0,00"
          />
        </Field>
        <div className="sm:col-span-4 flex gap-2">
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
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2 text-right">Máx. pessoas</th>
              <th className="px-4 py-2 text-right">Valor do serviço</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Carregando…</td></tr>
            )}
            {!loading && parceiros.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Nenhum parceiro cadastrado.</td></tr>
            )}
            {parceiros.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{p.nome}</td>
                <td className="px-4 py-2 text-slate-600">{tipoServicoLabel(p.tipo_servico)}</td>
                <td className="px-4 py-2 text-right">{p.qtd_maxima}</td>
                <td className="px-4 py-2 text-right">{money(p.valor_servico)}</td>
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
