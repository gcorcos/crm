import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'
import { TrendingUp, DollarSign, Users, CheckSquare, AlertTriangle, Target, FileWarning } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { Contract } from '../types'

const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: 'Prospection', QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposition', NEGOTIATION: 'Négociation',
  WON: 'Gagné', LOST: 'Perdu',
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function KpiCard({ label, value, sub, icon: Icon, color = 'blue' }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: kpi, isLoading } = useQuery({ queryKey: ['kpi'], queryFn: dashboardApi.kpi })
  const { data: pipeline } = useQuery({ queryKey: ['pipeline'], queryFn: dashboardApi.pipeline })
  const { data: expiringContracts = [] } = useQuery({ queryKey: ['expiring-contracts'], queryFn: dashboardApi.expiringContracts })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Pipeline total"
          value={fmt(kpi?.pipeline.total ?? 0)}
          sub={`Pondéré : ${fmt(kpi?.pipeline.weighted ?? 0)}`}
          icon={TrendingUp}
          color="blue"
        />
        <KpiCard
          label="CA ce mois"
          value={fmt(kpi?.revenue.thisMonth ?? 0)}
          sub={`Année : ${fmt(kpi?.revenue.thisYear ?? 0)}`}
          icon={DollarSign}
          color="green"
        />
        <KpiCard
          label="Taux conversion"
          value={`${kpi?.conversion.rate ?? 0} %`}
          sub={`${kpi?.conversion.leadsConverted} / ${kpi?.conversion.leadsTotal} leads`}
          icon={Users}
          color="purple"
        />
        <KpiCard
          label="Activités en retard"
          value={String(kpi?.activities.overdue ?? 0)}
          sub={`Aujourd'hui : ${kpi?.activities.today ?? 0}`}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Pipeline par étape */}
      <div className="card">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Target size={18} className="text-blue-600" />
          Pipeline par étape
        </h2>
        <div className="space-y-3">
          {kpi?.pipeline.byStage.map(({ stage, count, amount }) => {
            const max = Math.max(...(kpi.pipeline.byStage.map((s) => s.amount) ?? [1]))
            const pct = max > 0 ? (amount / max) * 100 : 0
            return (
              <div key={stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{STAGE_LABELS[stage] ?? stage}</span>
                  <span className="text-gray-500">{count} opp · {fmt(amount)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Contrats expirant */}
      {(expiringContracts as Contract[]).length > 0 && (
        <div className="card border-l-4 border-orange-400">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-orange-700">
            <FileWarning size={18} />
            Contrats expirant dans 30 jours ({(expiringContracts as Contract[]).length})
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

      {/* Kanban preview */}
      {pipeline && (
        <div className="card">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <CheckSquare size={18} className="text-blue-600" />
            Opportunités ouvertes
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {(pipeline as { stage: string; opportunities: { id: string; name: string; amount: number; account?: { name: string } }[] }[]).map(({ stage, opportunities }) => (
              <div key={stage} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {STAGE_LABELS[stage] ?? stage}
                  </span>
                  <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{opportunities.length}</span>
                </div>
                <div className="space-y-2">
                  {opportunities.slice(0, 4).map((opp) => (
                    <div key={opp.id} className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100">
                      <p className="text-xs font-medium text-gray-800 truncate">{opp.name}</p>
                      <p className="text-xs text-gray-400 truncate">{opp.account?.name}</p>
                      <p className="text-sm font-semibold text-blue-600 mt-1">{fmt(opp.amount)}</p>
                    </div>
                  ))}
                  {opportunities.length > 4 && (
                    <p className="text-xs text-gray-400 text-center">+{opportunities.length - 4} autres</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
