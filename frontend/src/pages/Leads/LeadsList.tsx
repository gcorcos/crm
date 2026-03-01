import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../../api'
import { Lead } from '../../types'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']
const SOURCE_OPTIONS = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL', 'EVENT', 'OTHER']
const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Site web', REFERRAL: 'Recommandation', COLD_CALL: 'Appel froid',
  EMAIL: 'Email', SOCIAL: 'Réseaux sociaux', EVENT: 'Événement', OTHER: 'Autre',
}

function LeadForm({ lead, onClose }: { lead?: Lead; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    firstName: lead?.firstName ?? '',
    lastName: lead?.lastName ?? '',
    email: lead?.email ?? '',
    phone: lead?.phone ?? '',
    company: lead?.company ?? '',
    source: lead?.source ?? 'OTHER',
    status: lead?.status ?? 'NEW',
    notes: lead?.notes ?? '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: object) =>
      lead ? leadsApi.update(lead.id, data) : leadsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); onClose() },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      setError(e.response?.data?.error ?? 'Erreur'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Prénom *</label><input className="input" value={form.firstName} onChange={f('firstName')} required /></div>
        <div><label className="label">Nom *</label><input className="input" value={form.lastName} onChange={f('lastName')} required /></div>
      </div>
      <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={f('email')} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={f('phone')} /></div>
        <div><label className="label">Société</label><input className="input" value={form.company} onChange={f('company')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Source</label>
          <select className="input" value={form.source} onChange={f('source')}>
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
          </select>
        </div>
        {lead && (
          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.status} onChange={f('status')}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={f('notes')} /></div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Enregistrement...' : lead ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

function ConvertForm({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ opportunityName: `${lead.company ?? lead.firstName} — Opportunité`, amount: '', closeDate: '' })
  const mutation = useMutation({
    mutationFn: (data: object) => leadsApi.convert(lead.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); onClose() },
  })
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <p className="text-sm text-gray-600">Créera automatiquement un Compte, Contact et Opportunité.</p>
      <div><label className="label">Nom opportunité</label><input className="input" value={form.opportunityName} onChange={(e) => setForm((p) => ({ ...p, opportunityName: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Montant (€)</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
        <div><label className="label">Date clôture</label><input type="date" className="input" value={form.closeDate} onChange={(e) => setForm((p) => ({ ...p, closeDate: e.target.value }))} /></div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Conversion...' : 'Convertir'}
        </button>
      </div>
    </form>
  )
}

export default function LeadsList() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [modal, setModal] = useState<null | 'create' | 'edit' | 'convert'>(null)
  const [selected, setSelected] = useState<Lead | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['leads', { page, search, status }],
    queryFn: () => leadsApi.list({ page, search: search || undefined, status: status || undefined }),
  })

  const qc = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: leadsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  function openEdit(lead: Lead) { setSelected(lead); setModal('edit') }
  function openConvert(lead: Lead) { setSelected(lead); setModal('convert') }
  function close() { setModal(null); setSelected(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Nouveau lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select className="input w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Tous statuts</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Nom', 'Email', 'Société', 'Source', 'Statut', 'Score', 'Créé le', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Chargement...</td></tr>
            )}
            {data?.data.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <button onClick={() => openEdit(lead)} className="hover:text-blue-600 transition-colors">
                    {lead.firstName} {lead.lastName}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                <td className="px-4 py-3 text-gray-600">{lead.company ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{SOURCE_LABELS[lead.source]}</td>
                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${lead.score}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{lead.score}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {format(new Date(lead.createdAt), 'dd MMM yyyy', { locale: fr })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(lead)} className="text-xs text-blue-600 hover:underline">Modifier</button>
                    {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
                      <button onClick={() => openConvert(lead)} className="text-xs text-green-600 hover:underline ml-2 flex items-center gap-1">
                        <RefreshCw size={11} /> Convertir
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('Supprimer ce lead ?')) deleteMutation.mutate(lead.id) }}
                      className="text-xs text-red-500 hover:underline ml-2"
                    >
                      Suppr.
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.data.length && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Aucun lead trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && <Pagination page={page} total={data.total} limit={data.limit} onChange={setPage} />}

      {modal === 'create' && (
        <Modal title="Nouveau lead" onClose={close}><LeadForm onClose={close} /></Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title="Modifier lead" onClose={close}><LeadForm lead={selected} onClose={close} /></Modal>
      )}
      {modal === 'convert' && selected && (
        <Modal title="Convertir le lead" onClose={close}><ConvertForm lead={selected} onClose={close} /></Modal>
      )}
    </div>
  )
}
