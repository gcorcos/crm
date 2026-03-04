import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../../api'
import ActivityTimeline from '../../components/ui/ActivityTimeline'
import Modal from '../../components/ui/Modal'
import StatusBadge from '../../components/ui/StatusBadge'
import { ArrowLeft, Edit2, Building2, Globe, MapPin, Users, Target, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const INDUSTRIES = ['Tech', 'Finance', 'Santé', 'Retail', 'Industrie', 'Autre']
const SIZES = ['1-10', '10-50', '50-200', '200-500', '500+']

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

type AccountFull = {
  id: string; name: string; industry: string | null; size: string | null
  website: string | null; address: string | null; city: string | null; country: string | null
  notes: string | null; createdAt: string; updatedAt: string
  owner: { id: string; firstName: string; lastName: string } | null
  contacts: { id: string; firstName: string; lastName: string; email: string; phone: string | null; title: string | null; role: string | null }[]
  opportunities: { id: string; name: string; stage: string; amount: unknown; closeDate: string }[]
  contracts: { id: string; number: string; status: string; amount: unknown; endDate: string | null }[]
  orders: { id: string; number: string; status: string; totalAmount: unknown; orderDate: string }[]
}

function EditAccountModal({ account, onClose }: { account: AccountFull; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: account.name, industry: account.industry ?? '', size: account.size ?? '',
    website: account.website ?? '', city: account.city ?? '', country: account.country ?? '',
    notes: account.notes ?? '',
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: object) => accountsApi.update(account.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['account', account.id] }); onClose() },
    onError: (e: { response?: { data?: { error?: string } } }) => setError(e.response?.data?.error ?? 'Erreur'),
  })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={f('name')} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Secteur</label>
          <select className="input" value={form.industry} onChange={f('industry')}>
            <option value="">—</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Taille</label>
          <select className="input" value={form.size} onChange={f('size')}>
            <option value="">—</option>
            {SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Site web</label><input type="url" className="input" value={form.website} onChange={f('website')} placeholder="https://" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Ville</label><input className="input" value={form.city} onChange={f('city')} /></div>
        <div><label className="label">Pays</label><input className="input" value={form.country} onChange={f('country')} /></div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={f('notes')} /></div>
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

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const [showEdit, setShowEdit] = useState(false)

  const { data: account, isLoading } = useQuery({
    queryKey: ['account', id],
    queryFn: () => accountsApi.get(id!) as Promise<AccountFull>,
    enabled: !!id,
  })

  if (isLoading) return <div className="text-center py-12 text-gray-400">Chargement...</div>
  if (!account) return <div className="text-center py-12 text-gray-400">Compte introuvable</div>

  const totalCA = account.opportunities
    .filter((o) => o.stage === 'WON')
    .reduce((s, o) => s + Number(o.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/accounts" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{[account.industry, account.city].filter(Boolean).join(' · ')}</p>
            </div>
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
          <div className="grid grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><Users size={11} /> Contacts</p>
              <p className="text-2xl font-bold text-gray-800">{account.contacts.length}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><Target size={11} /> Opps</p>
              <p className="text-2xl font-bold text-gray-800">{account.opportunities.length}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><FileText size={11} /> Contrats</p>
              <p className="text-2xl font-bold text-gray-800">{account.contracts.length}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-400 mb-1">CA gagné</p>
              <p className="text-lg font-bold text-blue-700">{fmt(totalCA)}</p>
            </div>
          </div>

          {/* Info */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Informations</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {account.website && (
                <div>
                  <dt className="text-gray-400 flex items-center gap-1"><Globe size={11} /> Site web</dt>
                  <dd className="font-medium mt-0.5"><a href={account.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{account.website}</a></dd>
                </div>
              )}
              {account.city && (
                <div>
                  <dt className="text-gray-400 flex items-center gap-1"><MapPin size={11} /> Localisation</dt>
                  <dd className="font-medium mt-0.5">{[account.city, account.country].filter(Boolean).join(', ')}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400">Propriétaire</dt>
                <dd className="font-medium mt-0.5">{account.owner ? `${account.owner.firstName} ${account.owner.lastName}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Créé le</dt>
                <dd className="font-medium mt-0.5">{format(new Date(account.createdAt), 'dd MMM yyyy', { locale: fr })}</dd>
              </div>
              {account.notes && (
                <div className="col-span-2">
                  <dt className="text-gray-400">Notes</dt>
                  <dd className="mt-0.5 text-gray-700 whitespace-pre-wrap">{account.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Contacts */}
          {account.contacts.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Users size={14} /> Contacts ({account.contacts.length})</h2>
              <div className="space-y-2">
                {account.contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                    <div>
                      <Link to={`/contacts/${c.id}`} className="font-medium hover:text-blue-600">{c.firstName} {c.lastName}</Link>
                      {c.title && <span className="text-gray-400 ml-2">· {c.title}</span>}
                    </div>
                    <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline text-xs">{c.email}</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opportunités */}
          {account.opportunities.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Target size={14} /> Opportunités ({account.opportunities.length})</h2>
              <div className="space-y-2">
                {account.opportunities.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                    <Link to={`/opportunities/${o.id}`} className="font-medium hover:text-blue-600">{o.name}</Link>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={o.stage} />
                      <span className="font-semibold text-blue-700">{fmt(Number(o.amount))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contrats */}
          {account.contracts.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><FileText size={14} /> Contrats ({account.contracts.length})</h2>
              <div className="space-y-2">
                {account.contracts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                    <span className="font-mono text-gray-700">{c.number}</span>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={c.status} />
                      <span className="font-semibold text-blue-700">{fmt(Number(c.amount))}</span>
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
            <ActivityTimeline relatedType="ACCOUNT" relatedId={id!} />
          </div>
        </div>
      </div>

      {showEdit && (
        <Modal title="Modifier compte" onClose={() => setShowEdit(false)}>
          <EditAccountModal account={account} onClose={() => setShowEdit(false)} />
        </Modal>
      )}
    </div>
  )
}
