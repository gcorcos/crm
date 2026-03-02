import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../../api'
import { Lead } from '../../types'
import StatusBadge from '../../components/ui/StatusBadge'
import ActivityTimeline from '../../components/ui/ActivityTimeline'
import Modal from '../../components/ui/Modal'
import { ArrowLeft, Edit2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Site web', REFERRAL: 'Recommandation', COLD_CALL: 'Appel froid',
  EMAIL: 'Email', SOCIAL: 'Réseaux sociaux', EVENT: 'Événement', OTHER: 'Autre',
}
const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']
const SOURCE_OPTIONS = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL', 'EVENT', 'OTHER']

function EditLeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    firstName: lead.firstName, lastName: lead.lastName,
    email: lead.email, phone: lead.phone ?? '',
    company: lead.company ?? '', source: lead.source,
    status: lead.status, notes: lead.notes ?? '',
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: object) => leadsApi.update(lead.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lead', lead.id] }); onClose() },
    onError: (e: { response?: { data?: { error?: string } } }) => setError(e.response?.data?.error ?? 'Erreur'),
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
        <div>
          <label className="label">Statut</label>
          <select className="input" value={form.status} onChange={f('status')}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={f('notes')} /></div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Enregistrement...' : 'Modifier'}
        </button>
      </div>
    </form>
  )
}

function ConvertModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ opportunityName: `${lead.company ?? lead.firstName} — Opportunité`, amount: '', closeDate: '' })
  const mutation = useMutation({
    mutationFn: (data: object) => leadsApi.convert(lead.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lead', lead.id] }); onClose() },
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

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const [modal, setModal] = useState<null | 'edit' | 'convert'>(null)

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="text-center py-12 text-gray-400">Chargement...</div>
  if (!lead) return <div className="text-center py-12 text-gray-400">Lead introuvable</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/leads" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.firstName} {lead.lastName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{lead.company ?? lead.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
            <button onClick={() => setModal('convert')} className="btn-secondary">
              <RefreshCw size={15} /> Convertir
            </button>
          )}
          <button onClick={() => setModal('edit')} className="btn-secondary">
            <Edit2 size={15} /> Modifier
          </button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left — infos */}
        <div className="col-span-2 space-y-4">
          {/* KPI bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1">Statut</p>
              <StatusBadge status={lead.status} />
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-2">Score</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-16 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${lead.score}%` }} />
                </div>
                <span className="font-bold text-gray-800">{lead.score}</span>
              </div>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1">Source</p>
              <p className="font-medium text-sm">{SOURCE_LABELS[lead.source]}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Informations</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-gray-400">Email</dt>
                <dd className="font-medium mt-0.5"><a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a></dd>
              </div>
              <div>
                <dt className="text-gray-400">Téléphone</dt>
                <dd className="font-medium mt-0.5">{lead.phone ? <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a> : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Société</dt>
                <dd className="font-medium mt-0.5">{lead.company ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Propriétaire</dt>
                <dd className="font-medium mt-0.5">{lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : '—'}</dd>
              </div>
              {lead.convertedAt && (
                <div>
                  <dt className="text-gray-400">Converti le</dt>
                  <dd className="font-medium mt-0.5">{format(new Date(lead.convertedAt), 'dd MMM yyyy', { locale: fr })}</dd>
                </div>
              )}
              {lead.notes && (
                <div className="col-span-2">
                  <dt className="text-gray-400">Notes</dt>
                  <dd className="mt-0.5 text-gray-700 whitespace-pre-wrap">{lead.notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400">Créé le</dt>
                <dd className="font-medium mt-0.5">{format(new Date(lead.createdAt), 'dd MMM yyyy', { locale: fr })}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right — timeline */}
        <div className="col-span-1">
          <div className="card sticky top-4">
            <ActivityTimeline relatedType="LEAD" relatedId={id!} />
          </div>
        </div>
      </div>

      {modal === 'edit' && <Modal title="Modifier lead" onClose={() => setModal(null)}><EditLeadModal lead={lead} onClose={() => setModal(null)} /></Modal>}
      {modal === 'convert' && <Modal title="Convertir le lead" onClose={() => setModal(null)}><ConvertModal lead={lead} onClose={() => setModal(null)} /></Modal>}
    </div>
  )
}
