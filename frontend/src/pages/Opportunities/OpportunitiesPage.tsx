import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opportunitiesApi, accountsApi, dashboardApi } from '../../api'
import { Opportunity } from '../../types'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { Plus, Search, LayoutGrid, List, FileText, Download } from 'lucide-react'
import { downloadCsv } from '../../utils/exportCsv'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: 'Prospection', QUALIFICATION: 'Qualification', PROPOSAL: 'Proposition',
  NEGOTIATION: 'Négociation', WON: 'Gagné', LOST: 'Perdu',
}
const STAGE_PROB: Record<string, number> = { PROSPECTING: 10, QUALIFICATION: 20, PROPOSAL: 40, NEGOTIATION: 60, WON: 100, LOST: 0 }

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function OppForm({ opp, onClose }: { opp?: Opportunity; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: accounts } = useQuery({ queryKey: ['accounts-all'], queryFn: () => accountsApi.list({ limit: 200 }) })
  const [form, setForm] = useState({
    name: opp?.name ?? '',
    amount: opp?.amount ? String(opp.amount) : '',
    stage: opp?.stage ?? 'PROSPECTING',
    probability: opp?.probability ? String(opp.probability) : '10',
    closeDate: opp?.closeDate ? opp.closeDate.split('T')[0] : '',
    accountId: opp?.accountId ?? '',
    lostReason: opp?.lostReason ?? '',
    notes: opp?.notes ?? '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: object) => opp ? opportunitiesApi.update(opp.id, data) : opportunitiesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['opportunities'] }); qc.invalidateQueries({ queryKey: ['pipeline'] }); onClose() },
    onError: (e: { response?: { data?: { error?: string } } }) => setError(e.response?.data?.error ?? 'Erreur'),
  })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.value
    setForm((p) => {
      const next = { ...p, [k]: val }
      if (k === 'stage') next.probability = String(STAGE_PROB[val] ?? 0)
      return next
    })
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={f('name')} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Montant (€) *</label><input type="number" className="input" value={form.amount} onChange={f('amount')} required min={0} /></div>
        <div><label className="label">Date clôture *</label><input type="date" className="input" value={form.closeDate} onChange={f('closeDate')} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Étape</label>
          <select className="input" value={form.stage} onChange={f('stage')}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </div>
        <div><label className="label">Probabilité (%)</label>
          <input type="number" className="input" value={form.probability} onChange={f('probability')} min={0} max={100} /></div>
      </div>
      <div>
        <label className="label">Compte *</label>
        <select className="input" value={form.accountId} onChange={f('accountId')} required>
          <option value="">— Sélectionner —</option>
          {accounts?.data.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      {form.stage === 'LOST' && (
        <div><label className="label">Motif de perte *</label><input className="input" value={form.lostReason} onChange={f('lostReason')} required /></div>
      )}
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={f('notes')} /></div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Enregistrement...' : opp ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

function KanbanView() {
  const { data: pipeline, isLoading } = useQuery({ queryKey: ['pipeline'], queryFn: dashboardApi.pipeline })
  const qc = useQueryClient()
  const updateMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      opportunitiesApi.update(id, { stage, probability: STAGE_PROB[stage] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline'] }); qc.invalidateQueries({ queryKey: ['opportunities'] }) },
  })

  if (isLoading) return <div className="text-center py-8 text-gray-400">Chargement...</div>

  const kanbanStages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION']
  const cols = pipeline as { stage: string; opportunities: Opportunity[] }[] | undefined

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {kanbanStages.map((stage) => {
        const col = cols?.find((c) => c.stage === stage)
        const opps = col?.opportunities ?? []
        const total = opps.reduce((s, o) => s + Number(o.amount), 0)
        return (
          <div key={stage} className="min-w-[260px] flex-1 bg-gray-50 rounded-xl p-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700">{STAGE_LABELS[stage]}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{opps.length}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">{fmt(total)}</p>
            <div className="space-y-2">
              {opps.map((opp) => (
                <div key={opp.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
                  <Link to={`/opportunities/${opp.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 block">{opp.name}</Link>
                  <p className="text-xs text-gray-400 mt-0.5">{opp.account?.name}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-semibold text-blue-600">{fmt(Number(opp.amount))}</span>
                    <span className="text-xs text-gray-400">{opp.probability}%</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {kanbanStages.filter((s) => s !== stage).map((s) => (
                      <button key={s} onClick={() => updateMutation.mutate({ id: opp.id, stage: s })}
                        className="text-xs text-gray-400 hover:text-blue-600 truncate max-w-[60px]" title={`→ ${STAGE_LABELS[s]}`}>
                        → {STAGE_LABELS[s].slice(0, 5)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContractFromOppForm({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ startDate: '', endDate: '', notes: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: object) => opportunitiesApi.createContract(opp.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      onClose()
    },
    onError: (e: { response?: { data?: { error?: string; contract?: { number: string } } } }) => {
      const err = e.response?.data
      if (err?.contract) setError(`Contrat déjà créé : ${err.contract.number}`)
      else setError(err?.error ?? 'Erreur')
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
        <p className="font-medium">{opp.name}</p>
        <p className="text-blue-600">{fmt(Number(opp.amount))} · {opp.account?.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date début</label>
          <input type="date" className="input" value={form.startDate}
            onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="label">Date fin</label>
          <input type="date" className="input" value={form.endDate}
            onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Création...' : 'Créer le contrat'}
        </button>
      </div>
    </form>
  )
}

export default function OpportunitiesPage() {
  const [view, setView] = useState<'list' | 'kanban'>('kanban')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [modal, setModal] = useState<null | 'create' | 'edit' | 'contract'>(null)
  const [selected, setSelected] = useState<Opportunity | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', { page, search, stage }],
    queryFn: () => opportunitiesApi.list({ page, search: search || undefined, stage: stage || undefined }),
    enabled: view === 'list',
  })
  const qc = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: opportunitiesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  })
  const close = () => { setModal(null); setSelected(null) }

  function openContract(opp: Opportunity) { setSelected(opp); setModal('contract') }

  async function handleExport() {
    const all = await opportunitiesApi.list({ stage: stage || undefined, search: search || undefined, limit: 1000 })
    downloadCsv(all.data.map((o: Opportunity) => ({
      nom: o.name, compte: o.account?.name ?? '', montant: Number(o.amount),
      etape: STAGE_LABELS[o.stage], probabilite: o.probability,
      cloture: new Date(o.closeDate).toLocaleDateString('fr-FR'),
    })), 'opportunites', [
      { key: 'nom', label: 'Opportunité' }, { key: 'compte', label: 'Compte' },
      { key: 'montant', label: 'Montant (€)' }, { key: 'etape', label: 'Étape' },
      { key: 'probabilite', label: 'Probabilité (%)' }, { key: 'cloture', label: 'Clôture' },
    ])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Opportunités</h1>
        <div className="flex gap-2">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => setView('kanban')} className={`px-3 py-2 text-sm flex items-center gap-1.5 ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <LayoutGrid size={15} /> Kanban
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-2 text-sm flex items-center gap-1.5 ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <List size={15} /> Liste
            </button>
          </div>
          {view === 'list' && <button onClick={handleExport} className="btn-secondary"><Download size={15} /> Export CSV</button>}
          <button onClick={() => setModal('create')} className="btn-primary"><Plus size={16} /> Nouvelle opportunité</button>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanView />
      ) : (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Rechercher..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <select className="input w-44" value={stage} onChange={(e) => { setStage(e.target.value); setPage(1) }}>
              <option value="">Toutes étapes</option>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Opportunité', 'Compte', 'Montant', 'Étape', 'Probabilité', 'Clôture', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Chargement...</td></tr>}
                {data?.data.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/opportunities/${opp.id}`} className="hover:text-blue-600">{opp.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{opp.account?.name}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">{fmt(Number(opp.amount))}</td>
                    <td className="px-4 py-3"><StatusBadge status={opp.stage} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${opp.probability}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{opp.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{format(new Date(opp.closeDate), 'dd MMM yyyy', { locale: fr })}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => { setSelected(opp); setModal('edit') }} className="text-xs text-blue-600 hover:underline">Modifier</button>
                        {opp.stage === 'WON' && (
                          <button onClick={() => openContract(opp)} className="text-xs text-green-600 hover:underline ml-2 flex items-center gap-0.5">
                            <FileText size={11} /> Contrat
                          </button>
                        )}
                        <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(opp.id) }} className="text-xs text-red-500 hover:underline ml-2">Suppr.</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && !data?.data.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucune opportunité</td></tr>}
              </tbody>
            </table>
          </div>
          {data && <Pagination page={page} total={data.total} limit={data.limit} onChange={setPage} />}
        </>
      )}

      {modal === 'create' && <Modal title="Nouvelle opportunité" onClose={close} size="lg"><OppForm onClose={close} /></Modal>}
      {modal === 'edit' && selected && <Modal title="Modifier opportunité" onClose={close} size="lg"><OppForm opp={selected} onClose={close} /></Modal>}
      {modal === 'contract' && selected && <Modal title="Créer un contrat" onClose={close}><ContractFromOppForm opp={selected} onClose={close} /></Modal>}
    </div>
  )
}
