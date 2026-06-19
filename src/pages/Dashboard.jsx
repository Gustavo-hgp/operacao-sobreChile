import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useCurrency } from '../lib/currency.jsx'
import { calcOperacao, comissaoValor } from '../lib/calc.js'
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

const NAVY = '#176DB0'
const RED = '#F80000'
const GREEN = '#16a34a'

const chartConfig = {
  referencia: { label: 'Custo de referência', color: RED },
  parceiro: { label: 'Custo do parceiro', color: NAVY },
  economia: { label: 'Economia', color: NAVY },
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
  const { formatMoney } = useCurrency()
  const [mode, setMode] = useState('periodo') // 'dia' | 'periodo'
  const [single, setSingle] = useState(new Date())
  const [range, setRange] = useState({ from: addDays(new Date(), -29), to: new Date() })

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const from = mode === 'dia' ? single : range?.from
  const to = mode === 'dia' ? single : (range?.to ?? range?.from)
  const fromStr = toISO(from)
  const toStr = toISO(to)

  const select =
    'data, qtd_pessoas, valor_servico, valor_roupa, comissao_pct, passeios(valor_cupo_pessoa)'

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

  const kpis = useMemo(() => {
    let economia = 0, comissao = 0, pessoas = 0
    for (const r of rows) {
      const c = calcOperacao(r)
      economia += c.economiaTotal
      comissao += comissaoValor(r)
      pessoas += c.pessoas
    }
    return { economia, comissao, resultado: economia + comissao, pessoas }
  }, [rows])

  // Série por dia: custo de referência vs custo do parceiro + economia.
  const porDia = useMemo(() => {
    const byDate = {}
    for (const r of rows) {
      const c = calcOperacao(r)
      const a = (byDate[r.data] ||= { data: r.data, referencia: 0, parceiro: 0, economia: 0 })
      a.referencia += c.ref * c.pessoas
      a.parceiro += c.servico
      a.economia += c.economiaTotal
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
          label="Economia total"
          value={formatMoney(kpis.economia)}
          tone={kpis.economia >= 0 ? 'text-green-600' : 'text-accent'}
          sub="vs. cupo de referência"
        />
        <Kpi label="Comissão de roupas" value={formatMoney(kpis.comissao)} />
        <Kpi
          label="Resultado do período"
          value={formatMoney(kpis.resultado)}
          tone={kpis.resultado >= 0 ? 'text-brand-dark' : 'text-accent'}
          sub="Economia + comissão"
        />
        <Kpi label="Pessoas" value={kpis.pessoas} />
      </div>

      <Card
        title="Economia por dia"
        subtitle="Quanto você economizou vs. o cupo de referência · verde = economia, vermelho = prejuízo"
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
              <RChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={formatMoney} />} />
              <RBar dataKey="economia" radius={4}>
                {porDia.map((d) => (
                  <Cell key={d.data} fill={d.economia >= 0 ? GREEN : RED} />
                ))}
              </RBar>
            </ComposedChart>
          </ChartContainer>
        )}
      </Card>

      <Card
        title="Referência vs Parceiro"
        subtitle="Custo se fosse pelo cupo de referência comparado ao que o parceiro cobrou · por dia"
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
              <RChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={formatMoney} />} />
              <Legend content={<ChartLegendContent />} />
              <RBar dataKey="referencia" fill="var(--color-referencia)" radius={4} />
              <RBar dataKey="parceiro" fill="var(--color-parceiro)" radius={4} />
            </ComposedChart>
          </ChartContainer>
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
