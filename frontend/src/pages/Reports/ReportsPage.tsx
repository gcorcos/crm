import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi, usersApi, leadsApi, opportunitiesApi, contactsApi, accountsApi } from '../../api'
import { useAuthStore } from '../../store/auth'
import { User } from '../../types'
import { Download, Play, Save, Trash2, BarChart2, FileSearch, BookOpen } from 'lucide-react'
import { downloadCsv } from '../../utils/exportCsv'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

// ─── US-20 : Rapport CA ───────────────────────────────────────────────────────

function RevenueReport() {
  const { user } = useAuthStore()
  const [year, setYear] = useState(new Date().getFullYear())
  const [period, setPeriod] = useState<'month' | 'quarter'>('month')
  const [userId, setUserId] = useState('')

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['revenue', { year, period, userId }],
    queryFn: () => reportsApi.revenue({ year, period, userId: userId || undefined }),
    enabled: true,
  })

  const MONTH_LABELS: Record<string, string> = {
    '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Jun',
    '07': 'Jul', '08': 'Aoû', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
  }

  function periodLabel(p: string) {
    if (period === 'month') {
      const [, m] = p.split('-')
      return MONTH_LABELS[m] ?? p
    }
    return p
  }

  // Collect all periods across all commercials
  const allPeriods: string[] = data
    ? ([...new Set(data.commercials.flatMap((c: { periods: Record<string, unknown> }) => Object.keys(c.periods)))].sort() as string[])
    : []

  function handleExport() {
    if (!data) return
    const rows = data.commercials.flatMap((c: { name: string; periods: Record<string, { amount: number; count: number }>; total: number }) =>
      Object.entries(c.periods).map(([p, v]) => ({
        commercial: c.name,
        periode: periodLabel(p),
        montant: (v as { amount: number }).amount,
        nb_opps: (v as { count: number }).count,
      }))
    )
    downloadCsv(rows, `rapport-ca-${year}`, [
      { key: 'commercial', label: 'Commercial' },
      { key: 'periode', label: 'Période' },
      { key: 'montant', label: 'CA (€)' },
      { key: 'nb_opps', label: 'Nb opps' },
    ])
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Année</label>
            <select className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Période</label>
            <select className="input w-36" value={period} onChange={(e) => setPeriod(e.target.value as 'month' | 'quarter')}>
              <option value="month">Mensuel</option>
              <option value="quarter">Trimestriel</option>
            </select>
          </div>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <div>
              <label className="label">Commercial</label>
              <select className="input w-44" value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Tous</option>
                {(users as User[]).map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={handleExport} className="btn-secondary" disabled={!data}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Total */}
      {data && (
        <div className="card bg-blue-600 text-white">
          <p className="text-sm opacity-80">CA Total {year}</p>
          <p className="text-3xl font-bold mt-1">{fmt(data.total)}</p>
          <p className="text-sm opacity-70 mt-1">{data.commercials.length} commercial(s)</p>
        </div>
      )}

      {/* Table */}
      {isLoading && <div className="text-center py-8 text-gray-400">Chargement...</div>}
      {data && data.commercials.length === 0 && (
        <div className="card text-center text-gray-400 py-8">Aucune opportunité gagnée sur cette période</div>
      )}
      {data && data.commercials.length > 0 && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Commercial</th>
                {allPeriods.map((p) => (
                  <th key={p} className="text-right px-3 py-3 text-xs font-medium text-gray-500 uppercase">
                    {periodLabel(p)}
                  </th>
                ))}
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-700 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.commercials.map((c: { id: string; name: string; periods: Record<string, { amount: number; count: number }>; total: number }) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  {allPeriods.map((p) => {
                    const v = c.periods[p]
                    return (
                      <td key={p} className="px-3 py-3 text-right">
                        {v ? (
                          <>
                            <div className="font-semibold text-blue-700">{fmt(v.amount)}</div>
                            <div className="text-xs text-gray-400">{v.count} opp</div>
                          </>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(c.total)}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-gray-700">Total</td>
                {allPeriods.map((p) => {
                  const total = data.commercials.reduce(
                    (s: number, c: { periods: Record<string, { amount: number }> }) => s + (c.periods[p]?.amount ?? 0), 0
                  )
                  return (
                    <td key={p} className="px-3 py-3 text-right text-blue-700">{total > 0 ? fmt(total) : '—'}</td>
                  )
                })}
                <td className="px-4 py-3 text-right text-blue-800 font-bold">{fmt(data.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── US-18 : Générateur de rapports ──────────────────────────────────────────

const ENTITY_CONFIGS: Record<string, {
  label: string
  columns: { key: string; label: string }[]
  fetch: (filters: Record<string, string>) => Promise<{ data: object[] }>
  filterFields: { key: string; label: string; type: 'text' | 'select'; options?: string[] }[]
}> = {
  LEAD: {
    label: 'Leads',
    columns: [
      { key: 'firstName', label: 'Prénom' }, { key: 'lastName', label: 'Nom' },
      { key: 'email', label: 'Email' }, { key: 'company', label: 'Société' },
      { key: 'status', label: 'Statut' }, { key: 'score', label: 'Score' },
    ],
    fetch: (f) => leadsApi.list({ ...f, limit: 500 }),
    filterFields: [
      { key: 'search', label: 'Recherche', type: 'text' },
      { key: 'status', label: 'Statut', type: 'select', options: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] },
    ],
  },
  OPPORTUNITY: {
    label: 'Opportunités',
    columns: [
      { key: 'name', label: 'Nom' }, { key: 'amount', label: 'Montant' },
      { key: 'stage', label: 'Étape' }, { key: 'probability', label: 'Proba %' },
      { key: 'closeDate', label: 'Clôture' },
    ],
    fetch: (f) => opportunitiesApi.list({ ...f, limit: 500 }),
    filterFields: [
      { key: 'search', label: 'Recherche', type: 'text' },
      { key: 'stage', label: 'Étape', type: 'select', options: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] },
    ],
  },
  CONTACT: {
    label: 'Contacts',
    columns: [
      { key: 'firstName', label: 'Prénom' }, { key: 'lastName', label: 'Nom' },
      { key: 'email', label: 'Email' }, { key: 'title', label: 'Poste' },
    ],
    fetch: (f) => contactsApi.list({ ...f, limit: 500 }),
    filterFields: [{ key: 'search', label: 'Recherche', type: 'text' }],
  },
  ACCOUNT: {
    label: 'Comptes',
    columns: [
      { key: 'name', label: 'Nom' }, { key: 'industry', label: 'Secteur' },
      { key: 'size', label: 'Taille' }, { key: 'city', label: 'Ville' },
    ],
    fetch: (f) => accountsApi.list({ ...f, limit: 500 }),
    filterFields: [{ key: 'search', label: 'Recherche', type: 'text' }],
  },
}

function ReportBuilder() {
  const qc = useQueryClient()
  const [entityType, setEntityType] = useState('OPPORTUNITY')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedCols, setSelectedCols] = useState<string[]>(['name', 'amount', 'stage', 'probability', 'closeDate'])
  const [results, setResults] = useState<object[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportName, setReportName] = useState('')
  const [saved, setSaved] = useState(false)

  const config = ENTITY_CONFIGS[entityType]

  function handleTypeChange(t: string) {
    setEntityType(t)
    setFilters({})
    setSelectedCols(ENTITY_CONFIGS[t].columns.map((c) => c.key))
    setResults(null)
    setSaved(false)
  }

  async function runReport() {
    setLoading(true)
    try {
      const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      const res = await config.fetch(cleanFilters)
      setResults(res.data)
    } finally {
      setLoading(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => reportsApi.create({
      name: reportName || `Rapport ${config.label} ${new Date().toLocaleDateString('fr-FR')}`,
      type: entityType,
      filters,
      columns: selectedCols,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); setSaved(true) },
  })

  function handleExport() {
    if (!results) return
    const cols = config.columns.filter((c) => selectedCols.includes(c.key))
    downloadCsv(results, `rapport-${entityType.toLowerCase()}`, cols)
  }

  const visibleCols = config.columns.filter((c) => selectedCols.includes(c.key))

  return (
    <div className="space-y-4">
      {/* Config */}
      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Entité</label>
            <select className="input" value={entityType} onChange={(e) => handleTypeChange(e.target.value)}>
              {Object.entries(ENTITY_CONFIGS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nom du rapport (pour sauvegarde)</label>
            <input className="input" placeholder="ex: Opps Négociation Q1" value={reportName}
              onChange={(e) => setReportName(e.target.value)} />
          </div>
        </div>

        {/* Filters */}
        <div>
          <p className="label mb-2">Filtres</p>
          <div className="grid grid-cols-3 gap-3">
            {config.filterFields.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                {f.type === 'select' ? (
                  <select className="input" value={filters[f.key] ?? ''} onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}>
                    <option value="">Tous</option>
                    {f.options?.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="input" value={filters[f.key] ?? ''} onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Columns toggle */}
        <div>
          <p className="label mb-2">Colonnes</p>
          <div className="flex flex-wrap gap-2">
            {config.columns.map((c) => (
              <button key={c.key}
                onClick={() => setSelectedCols((p) => p.includes(c.key) ? p.filter((k) => k !== c.key) : [...p, c.key])}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedCols.includes(c.key) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button onClick={runReport} disabled={loading} className="btn-primary">
            <Play size={15} /> {loading ? 'Exécution...' : 'Exécuter'}
          </button>
          {results && (
            <>
              <button onClick={handleExport} className="btn-secondary"><Download size={15} /> Export CSV</button>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || saved} className="btn-secondary">
                <Save size={15} /> {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {results !== null && (
        <div className="card p-0 overflow-x-auto">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-600">{results.length} résultat(s)</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {visibleCols.map((c) => (
                  <th key={c.key} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {visibleCols.map((c) => {
                    const val = (row as Record<string, unknown>)[c.key]
                    return <td key={c.key} className="px-4 py-2.5 text-gray-700">{val == null ? '—' : String(val)}</td>
                  })}
                </tr>
              ))}
              {results.length > 100 && (
                <tr><td colSpan={visibleCols.length} className="px-4 py-3 text-center text-xs text-gray-400">... et {results.length - 100} autres (utilisez l'export CSV pour tout voir)</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Mes rapports sauvegardés ─────────────────────────────────────────────────

function SavedReports() {
  const qc = useQueryClient()
  const { data: reports = [], isLoading } = useQuery({ queryKey: ['reports'], queryFn: reportsApi.list })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })

  if (isLoading) return <div className="text-center py-8 text-gray-400">Chargement...</div>
  if (!(reports as object[]).length) return (
    <div className="card text-center py-12 text-gray-400">
      <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
      <p>Aucun rapport sauvegardé. Créez-en un depuis l'onglet Générateur.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {(reports as { id: string; name: string; type: string; shared: boolean; owner: { firstName: string; lastName: string }; updatedAt: string }[]).map((r) => (
        <div key={r.id} className="card flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{r.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {ENTITY_CONFIGS[r.type]?.label ?? r.type} · {r.owner.firstName} {r.owner.lastName} ·{' '}
              {new Date(r.updatedAt).toLocaleDateString('fr-FR')}
              {r.shared && <span className="ml-2 badge bg-green-100 text-green-700">Partagé</span>}
            </p>
          </div>
          <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(r.id) }}
            className="text-red-400 hover:text-red-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

type Tab = 'revenue' | 'builder' | 'saved'

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('revenue')

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'revenue', label: 'Rapport CA', icon: BarChart2 },
    { id: 'builder', label: 'Générateur', icon: FileSearch },
    { id: 'saved', label: 'Mes rapports', icon: BookOpen },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rapports</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'revenue' && <RevenueReport />}
      {tab === 'builder' && <ReportBuilder />}
      {tab === 'saved' && <SavedReports />}
    </div>
  )
}
