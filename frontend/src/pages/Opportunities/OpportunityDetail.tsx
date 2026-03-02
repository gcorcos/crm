import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opportunitiesApi, accountsApi } from '../../api'
import { Opportunity } from '../../types'
import StatusBadge from '../../components/ui/StatusBadge'
import ActivityTimeline from '../../components/ui/ActivityTimeline'
import Modal from '../../components/ui/Modal'
import { ArrowLeft, Edit2, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: 'Prospection', QUALIFICATION: 'Qualification', PROPOSAL: 'Proposition',
  NEGOTIATION: 'Négociation', WON: 'Gagné', LOST: 'Perdu',
}
const STAGE_PROB: Record<string, number> = {
  PROSPECTING: 10, QUALIFICATION: 20, PROPOSAL: 40, NEGOTIATION: 60, WON: 100, LOST: 0,
}
const STAGES = Object.keys(STAGE_LABELS)

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function EditOppModal({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: accounts } = useQuery({ queryKey: ['accounts-all'], queryFn: () => accountsApi.list({ limit: 200 }) })
  const [form, setForm] = useState({
    name: opp.name,
    amount: String(opp.amount),
    stage: opp.stage,
    probability: String(opp.probability),
    closeDate: opp.closeDate.split('T')[0],
    accountId: opp.accountId,
    lostReason: opp.lostReason ?? '',
    notes: opp.notes ?? '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: object) => opportunitiesApi.update(opp.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunity', opp.id] })
      onClose()
    },
    onError: (e: { response?: { data?: { error?: string } } }) => setError(e.response?.data?.error ?? 'Erreur'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.value
    setForm((p) => ({ ...p, [k]: val, ...(k === 'stage' ? { probability: String(STAGE_PROB[val] ?? 0) } : {}) }))
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={f('name')} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Montant (€)</label><input type="number" className="input" value={form.amount} onChange={f('amount')} /></div>
        <div><label className="label">Date clôture</label><input type="date" className="input" value={form.closeDate} onChange={f('closeDate')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Étape</label>
          <select className="input" value={form.stage} onChange={f('stage')}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </div>
        <div><label className="label">Probabilité (%)</label><input type="number" className="input" value={form.probability} onChange={f('probability')} min={0} max={100} /></div>
      </div>
      <div>
        <label className="label">Compte *</label>
        <select className="input" value={form.accountId} onChange={f('accountId')} required>
          {accounts?.data.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      {form.stage === 'LOST' && (
        <div><label className="label">Motif de perte *</label><input className="input" value={form.lostReason} onChange={f('lostReason')} required /></div>
      )}
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

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>()
  const [showEdit, setShowEdit] = useState(false)

  const { data: opp, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => opportunitiesApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="text-center py-12 text-gray-400">Chargement...</div>
  if (!opp) return <div className="text-center py-12 text-gray-400">Opportunité introuvable</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/opportunities" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{opp.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{opp.account?.name}</p>
          </div>
        </div>
        <button onClick={() => setShowEdit(true)} className="btn-secondary">
          <Edit2 size={15} /> Modifier
        </button>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left — infos */}
        <div className="col-span-2 space-y-4">
          {/* KPI bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1">Montant</p>
              <p className="text-xl font-bold text-blue-700">{fmt(Number(opp.amount))}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1">Étape</p>
              <StatusBadge status={opp.stage} />
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1">Probabilité</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-16 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${opp.probability}%` }} />
                </div>
                <span className="font-bold text-gray-800">{opp.probability}%</span>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Informations</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-gray-400">Compte</dt>
                <dd className="font-medium mt-0.5">{opp.account?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Contact</dt>
                <dd className="font-medium mt-0.5">
                  {opp.contact ? `${opp.contact.firstName} ${opp.contact.lastName}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Date de clôture</dt>
                <dd className="font-medium mt-0.5">{format(new Date(opp.closeDate), 'dd MMMM yyyy', { locale: fr })}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Propriétaire</dt>
                <dd className="font-medium mt-0.5">{opp.owner ? `${opp.owner.firstName} ${opp.owner.lastName}` : '—'}</dd>
              </div>
              {opp.lostReason && (
                <div className="col-span-2">
                  <dt className="text-gray-400">Motif de perte</dt>
                  <dd className="font-medium mt-0.5 text-red-600">{opp.lostReason}</dd>
                </div>
              )}
              {opp.notes && (
                <div className="col-span-2">
                  <dt className="text-gray-400">Notes</dt>
                  <dd className="mt-0.5 text-gray-700 whitespace-pre-wrap">{opp.notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400">Créée le</dt>
                <dd className="font-medium mt-0.5">{format(new Date(opp.createdAt), 'dd MMM yyyy', { locale: fr })}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Modifiée le</dt>
                <dd className="font-medium mt-0.5">{format(new Date(opp.updatedAt), 'dd MMM yyyy', { locale: fr })}</dd>
              </div>
            </dl>
          </div>

          {/* Contracts */}
          {(opp as Opportunity & { contracts?: { id: string; number: string; status: string; amount: number }[] }).contracts?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText size={15} /> Contrats associés
              </h2>
              <div className="space-y-2">
                {(opp as Opportunity & { contracts?: { id: string; number: string; status: string; amount: number }[] }).contracts!.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-gray-700">{c.number}</span>
                    <span className="badge bg-gray-100 text-gray-600">{c.status}</span>
                    <span className="font-semibold text-blue-700">{fmt(Number(c.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — timeline */}
        <div className="col-span-1">
          <div className="card sticky top-4">
            <ActivityTimeline relatedType="OPPORTUNITY" relatedId={id!} />
          </div>
        </div>
      </div>

      {showEdit && <Modal title="Modifier opportunité" onClose={() => setShowEdit(false)} size="lg">
        <EditOppModal opp={opp} onClose={() => setShowEdit(false)} />
      </Modal>}
    </div>
  )
}
