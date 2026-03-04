import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'
import { TrendingUp, DollarSign, Users, AlertTriangle, Target, FileWarning } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { Contract } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: 'Prospection', QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposition', NEGOTIATION: 'Négociation',
  WON: 'Gagné', LOST: 'Perdu',
}

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Site web', REFERRAL: 'Recommandation', COLD_CALL: 'Appel froid',
  EMAIL: 'Email', SOCIAL: 'Réseaux', EVENT: 'Événement', OTHER: 'Autre',
}

const STAGE_COLORS: Record<string, string> = {
  PROSPECTING: '#93c5fd', QUALIFICATION: '#60a5fa', PROPOSAL: '#3b82f6',
  NEGOTIATION: '#2563eb', WON: '#16a34a', LOST: '#ef4444',
}
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#06b6d4']

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtK(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}k€`
  return `${n}€`
}

function KpiCard({ label, value, sub, icon: Icon, color = 'blue' }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600', red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}><Icon size={22} /></div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const currentYear = new Date().getFullYear()
  const { data: kpi, isLoading } = useQuery({ queryKey: ['kpi'], queryFn: dashboardApi.kpi })
  const { data: expiringContracts = [] } = useQuery({ queryKey: ['expiring-contracts'], queryFn: dashboardApi.expiringContracts })
  const { data: leadSources = [] } = useQuery({ queryKey: ['lead-sources'], queryFn: dashboardApi.leadSources })
  const { data: revenueData } = useQuery({
    queryKey: ['monthly-revenue', currentYear],
    queryFn: () => dashboardApi.monthlyRevenue(currentYear),
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}</div>
      </div>
    )
  }

  // Build monthly revenue chart data (last 6 months)
  const now = new Date()
  const monthlyChartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (revenueData as any)?.find?.((r: any) => `${r.year}-${String(r.period).padStart(2, '0')}` === monthKey)
    return {
      name: MONTHS[d.getMonth()],
      ca: row ? Number(row.total) : 0,
    }
  })

  // Pipeline data for bar chart
  const pipelineChartData = (kpi?.pipeline.byStage ?? [])
    .filter((s) => !['WON', 'LOST'].includes(s.stage))
    .map((s) => ({ name: STAGE_LABELS[s.stage] ?? s.stage, amount: s.amount, count: s.count }))

  // Lead sources pie data
  const pieData = leadSources
    .filter((s) => s.count > 0)
    .map((s) => ({ name: SOURCE_LABELS[s.source] ?? s.source, value: s.count }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Pipeline total" value={fmt(kpi?.pipeline.total ?? 0)}
          sub={`Pondéré : ${fmt(kpi?.pipeline.weighted ?? 0)}`} icon={TrendingUp} color="blue" />
        <KpiCard label="CA ce mois" value={fmt(kpi?.revenue.thisMonth ?? 0)}
          sub={`Année : ${fmt(kpi?.revenue.thisYear ?? 0)}`} icon={DollarSign} color="green" />
        <KpiCard label="Taux conversion" value={`${kpi?.conversion.rate ?? 0} %`}
          sub={`${kpi?.conversion.leadsConverted} / ${kpi?.conversion.leadsTotal} leads`} icon={Users} color="purple" />
        <KpiCard label="Activités en retard" value={String(kpi?.activities.overdue ?? 0)}
          sub={`Aujourd'hui : ${kpi?.activities.today ?? 0}`} icon={AlertTriangle} color="red" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Monthly CA bar chart */}
        <div className="card col-span-2">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" /> CA mensuel {currentYear}
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={(v) => fmt(Number(v ?? 0))} labelStyle={{ fontWeight: 600 }} />
              <Bar dataKey="ca" fill="#3b82f6" radius={[4, 4, 0, 0]} name="CA" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead sources pie */}
        <div className="card">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" /> Sources leads
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} innerRadius={35}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Aucun lead</div>
          )}
        </div>
      </div>

      {/* Pipeline par étape */}
      {pipelineChartData.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Target size={16} className="text-blue-600" /> Pipeline par étape
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pipelineChartData} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 80 }}>
              <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} name="Montant">
                {pipelineChartData.map((entry, i) => (
                  <Cell key={i} fill={STAGE_COLORS[['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'][i]] ?? '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {(kpi?.pipeline.byStage ?? []).filter((s) => !['WON', 'LOST'].includes(s.stage)).map(({ stage, count, amount }) => (
              <div key={stage} className="text-center">
                <p className="text-xs text-gray-400">{STAGE_LABELS[stage]}</p>
                <p className="font-semibold text-gray-800 text-sm">{count} · {fmt(amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contrats expirant */}
      {(expiringContracts as Contract[]).length > 0 && (
        <div className="card border-l-4 border-orange-400">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-orange-700">
            <FileWarning size={18} /> Contrats expirant dans 30 jours ({(expiringContracts as Contract[]).length})
          </h2>
          <div className="space-y-2">
            {(expiringContracts as Contract[]).map((c) => {
              const days = differenceInDays(new Date(c.endDate!), new Date())
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="font-mono text-sm font-medium text-gray-800">{c.number}</span>
                    <span className="text-sm text-gray-500 ml-2">{c.account?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-blue-700">{fmt(Number(c.amount))}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 7 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {days}j
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
