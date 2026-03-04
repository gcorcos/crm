import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi, accountsApi } from '../../api'
import ActivityTimeline from '../../components/ui/ActivityTimeline'
import Modal from '../../components/ui/Modal'
import StatusBadge from '../../components/ui/StatusBadge'
import { ArrowLeft, Edit2, Mail, Phone, Briefcase, Target } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

type ContactFull = {
  id: string; firstName: string; lastName: string; email: string
  phone: string | null; title: string | null; role: string | null
  accountId: string; createdAt: string
  account: { id: string; name: string } | null
  owner: { id: string; firstName: string; lastName: string } | null
  opportunities: { id: string; name: string; stage: string; amount: unknown; closeDate: string }[]
}

function EditContactModal({ contact, onClose }: { contact: ContactFull; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: accounts } = useQuery({ queryKey: ['accounts-all'], queryFn: () => accountsApi.list({ limit: 200 }) })
  const [form, setForm] = useState({
    firstName: contact.firstName, lastName: contact.lastName,
    email: contact.email, phone: contact.phone ?? '',
    title: contact.title ?? '', role: contact.role ?? '',
    accountId: contact.accountId,
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: object) => contactsApi.update(contact.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contact', contact.id] }); onClose() },
    onError: (e: { response?: { data?: { error?: string } } }) => setError(e.response?.data?.error ?? 'Erreur'),
  })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
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
        <div><label className="label">Poste</label><input className="input" value={form.title} onChange={f('title')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Rôle décisionnel</label>
          <select className="input" value={form.role} onChange={f('role')}>
            <option value="">—</option>
            {['Décideur', 'Influenceur', 'Utilisateur'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Compte *</label>
          <select className="input" value={form.accountId} onChange={f('accountId')} required>
            {accounts?.data.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
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

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const [showEdit, setShowEdit] = useState(false)

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.get(id!) as unknown as Promise<ContactFull>,
    enabled: !!id,
  })

  if (isLoading) return <div className="text-center py-12 text-gray-400">Chargement...</div>
  if (!contact) return <div className="text-center py-12 text-gray-400">Contact introuvable</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/contacts" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contact.firstName} {contact.lastName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {[contact.title, contact.account?.name].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <button onClick={() => setShowEdit(true)} className="btn-secondary">
          <Edit2 size={15} /> Modifier
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left */}
        <div className="col-span-2 space-y-4">
          {/* KPI bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><Mail size={11} /> Email</p>
              <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:underline truncate block">{contact.email}</a>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><Phone size={11} /> Téléphone</p>
              {contact.phone
                ? <a href={`tel:${contact.phone}`} className="text-sm text-blue-600 hover:underline">{contact.phone}</a>
                : <span className="text-sm text-gray-400">—</span>
              }
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><Target size={11} /> Opportunités</p>
              <p className="text-2xl font-bold text-gray-800">{contact.opportunities.length}</p>
            </div>
          </div>

          {/* Info */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Informations</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-400 flex items-center gap-1"><Briefcase size={11} /> Poste</dt>
                <dd className="font-medium mt-0.5">{contact.title ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Rôle décisionnel</dt>
                <dd className="font-medium mt-0.5">{contact.role ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Compte</dt>
                <dd className="font-medium mt-0.5">
                  {contact.account
                    ? <Link to={`/accounts/${contact.account.id}`} className="text-blue-600 hover:underline">{contact.account.name}</Link>
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Propriétaire</dt>
                <dd className="font-medium mt-0.5">{contact.owner ? `${contact.owner.firstName} ${contact.owner.lastName}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Créé le</dt>
                <dd className="font-medium mt-0.5">{format(new Date(contact.createdAt), 'dd MMM yyyy', { locale: fr })}</dd>
              </div>
            </dl>
          </div>

          {/* Opportunités */}
          {contact.opportunities.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Target size={14} /> Opportunités</h2>
              <div className="space-y-2">
                {contact.opportunities.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                    <Link to={`/opportunities/${o.id}`} className="font-medium hover:text-blue-600">{o.name}</Link>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={o.stage} />
                      <span className="font-semibold text-blue-700">{fmt(Number(o.amount))}</span>
                      <span className="text-gray-400">{format(new Date(o.closeDate), 'dd MMM yyyy', { locale: fr })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — timeline */}
        <div className="col-span-1">
          <div className="card sticky top-4">
            <ActivityTimeline relatedType="CONTACT" relatedId={id!} />
          </div>
        </div>
      </div>

      {showEdit && (
        <Modal title="Modifier contact" onClose={() => setShowEdit(false)}>
          <EditContactModal contact={contact} onClose={() => setShowEdit(false)} />
        </Modal>
      )}
    </div>
  )
}
