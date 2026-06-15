import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { money } from '../lib/format.js'
import { calcOperacao, passageirosMinimos } from '../lib/calc.js'
import DateFilter from '../components/DateFilter.jsx'
import {
  Bar as RBar,
  Cell,
  ComposedChart,
  CartesianGrid,
  XAxis,
  Legend,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip as RChartTooltip,
  ChartTooltipContent,
  ChartLegendContent,
} from '../components/ui/chart.jsx'

const NAVY = '#0a3fa8'
const RED = '#e11d2a'
const GREEN = '#16a34a'

const chartConfig = {
  operar: { label: 'Operando (real)', color: NAVY },
  terceirizar: { label: 'Terceirizando', color: RED },
  resultado: { label: 'Resultado', color: NAVY },
}

const toISO = (d) => (d ? d.toLocaleDateString('en-CA') : null)
const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const fmtBR = (d) => d.toLocaleDateString('pt-BR')
const dayMonth = (iso) => iso.slice(8) + '/' + iso.slice(5, 7)

export default function Dashboard() {
  const [mode, setMode] = useState('periodo') // 'dia' | 'periodo'
  const [single, setSingle] = useState(new Date())
  const [range, setRange] = useState({ from: addDays(new Date(), -29), to: new Date() })

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Ponto de equilíbrio — usa o histórico todo (carrega uma vez).
  const [breakEven, setBreakEven] = useState([])

  const from = mode === 'dia' ? single : range?.from
  const to = mode === 'dia' ? single : (range?.to ?? range?.from)
  const fromStr = toISO(from)
  const toStr = toISO(to)

  const select = 'data, custo_van_guia, qtd_pessoas, comissao_roupa, servicos(nome, valor_cupo)'

  async function load() {
    if (!supabase || !fromStr || !toStr) return setLoading(false)
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('operacoes')
      .select(select)
      .gte('data', fromStr)
      .lte('data', toStr)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [fromStr, toStr])

  // Ponto de equilíbrio por serviço (custo médio da van ÷ valor do cupo).
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data, error } = await supabase
        .from('operacoes')
        .select('custo_van_guia, servicos(nome, valor_cupo, parceiros(nome))')
      if (error || !data) return
      const acc = {}
      for (const o of data) {
        const nome = o.servicos?.nome || '—'
        const a = (acc[nome] ||= {
          nome,
          parceiro: o.servicos?.parceiros?.nome || '—',
          valorCupo: Number(o.servicos?.valor_cupo) || 0,
          soma: 0,
          n: 0,
        })
        a.soma += Number(o.custo_van_guia) || 0
        a.n += 1
      }
      const list = Object.values(acc).map((a) => {
        const custoMedioVan = a.n > 0 ? a.soma / a.n : 0
        return { ...a, custoMedioVan, minimo: passageirosMinimos(custoMedioVan, a.valorCupo) }
      })
      list.sort((a, b) => a.nome.localeCompare(b.nome))
      setBreakEven(list)
    })()
  }, [])

  // KPIs do período selecionado.
  const kpis = useMemo(() => {
    let economia = 0, comissao = 0, resultado = 0, pessoas = 0, custoVan = 0
    for (const r of rows) {
      const c = calcOperacao(r)
      economia += c.saldoEconomia
      comissao += c.comissao
      resultado += c.resultadoDia
      pessoas += c.qtd
      custoVan += c.custoVan
    }
    return { economia, comissao, resultado, pessoas, custoMedio: pessoas > 0 ? custoVan / pessoas : 0 }
  }, [rows])

  // Série por dia: operando (real) vs terceirizando + resultado.
  const porDia = useMemo(() => {
    const byDate = {}
    for (const r of rows) {
      const c = calcOperacao(r)
      const a = (byDate[r.data] ||= { data: r.data, operar: 0, terceirizar: 0, resultado: 0 })
      a.operar += c.custoVan
      a.terceirizar += c.custoTerceirizado
      a.resultado += c.resultadoDia
    }
    return Object.values(byDate)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((d) => ({ ...d, label: dayMonth(d.data) }))
  }, [rows])

  const periodoLabel =
    mode === 'dia'
      ? (from ? fmtBR(from) : '—')
      : from && to
        ? `${fmtBR(from)} → ${fmtBR(to)}`
        : 'Selecione o período'

  const temDados = porDia.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Período: {periodoLabel}</p>
        </div>
        <DateFilter
          mode={mode}
          setMode={setMode}
          single={single}
          setSingle={setSingle}
          range={range}
          setRange={setRange}
          label={periodoLabel}
        />
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Resultado do período"
          value={money(kpis.resultado)}
          tone={kpis.resultado >= 0 ? 'text-green-600' : 'text-accent'}
          sub="Economia + comissão"
        />
        <Kpi
          label="Economia real"
          value={money(kpis.economia)}
          tone={kpis.economia >= 0 ? 'text-brand-dark' : 'text-accent'}
          sub="Operar vs terceirizar"
        />
        <Kpi label="Comissão de roupas" value={money(kpis.comissao)} />
        <Kpi label="Custo médio /pessoa" value={money(kpis.custoMedio)} sub={`${kpis.pessoas} pessoas`} />
      </div>

      <Card
        title="Operar vs Terceirizar"
        subtitle="Custo real de rodar a van comparado ao que custaria jogar pro parceiro · por dia"
      >
        {!temDados ? (
          <Empty loading={loading} />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
            <ComposedChart data={porDia} margin={{ top: 8, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <RChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={money} />} />
              <Legend content={<ChartLegendContent />} />
              <RBar dataKey="operar" fill="var(--color-operar)" radius={4} />
              <RBar dataKey="terceirizar" fill="var(--color-terceirizar)" radius={4} />
            </ComposedChart>
          </ChartContainer>
        )}
      </Card>

      <Card title="Resultado por dia" subtitle="Verde = lucro/economia · vermelho = prejuízo">
        {!temDados ? (
          <Empty loading={loading} />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
            <ComposedChart data={porDia} margin={{ top: 8, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <RChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={money} />} />
              <RBar dataKey="resultado" radius={4}>
                {porDia.map((d) => (
                  <Cell key={d.data} fill={d.resultado >= 0 ? GREEN : RED} />
                ))}
              </RBar>
            </ComposedChart>
          </ChartContainer>
        )}
      </Card>

      <Card
        title="Ponto de equilíbrio por serviço"
        subtitle="Passageiros mínimos para valer a pena rodar a van em vez de terceirizar (histórico completo)"
      >
        {breakEven.length === 0 ? (
          <Empty loading={loading} text="Cadastre serviços e lance operações para ver o ponto de equilíbrio." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="py-2 pr-4">Serviço</th>
                  <th className="py-2 pr-4">Parceiro</th>
                  <th className="py-2 pr-4 text-right">Valor cupo</th>
                  <th className="py-2 pr-4 text-right">Custo médio van</th>
                  <th className="py-2 text-right">Passageiros mín.</th>
                </tr>
              </thead>
              <tbody>
                {breakEven.map((b) => (
                  <tr key={b.nome} className="border-t border-slate-100">
                    <td className="py-2 pr-4 font-medium">{b.nome}</td>
                    <td className="py-2 pr-4 text-slate-600">{b.parceiro}</td>
                    <td className="py-2 pr-4 text-right">{money(b.valorCupo)}</td>
                    <td className="py-2 pr-4 text-right">{money(b.custoMedioVan)}</td>
                    <td className="py-2 text-right font-bold text-brand-dark">
                      {b.minimo == null ? '—' : `${b.minimo} pax`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400">
              Acima do mínimo, compensa rodar a van própria. Abaixo, sai mais barato repassar pro parceiro.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

function Kpi({ label, value, sub, tone = 'text-slate-800' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-xl font-bold ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-600">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Empty({ loading, text = 'Sem operações para este período.' }) {
  return (
    <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
      {loading ? 'Carregando…' : text}
    </div>
  )
}
