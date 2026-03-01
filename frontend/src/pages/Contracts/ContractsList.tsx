import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi, accountsApi } from '../../api'
import { Contract } from '../../types'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { Plus, Search, AlertTriangle, Download } from 'lucide-react'
import { downloadCsv } from '../../utils/exportCsv'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

function daysUntilExpiry(endDate: string) {
  return differenceInDays(new Date(endDate), new Date())
}

function isExpiringSoon(contract: Contract) {
  if (!contract.endDate) return false
  if (!['ACTIVE', 'SIGNED'].includes(contract.status)) return false
  const days = daysUntilExpiry(contract.endDate)
  return days >= 0 && days <= 30
}

const STATUSES = ['DRAFT', 'REVIEW', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED']

function ContractForm({ contract, onClose }: { contract?: Contract; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: accounts } = useQuery({ queryKey: ['accounts-all'], queryFn: () => accountsApi.list({ limit: 200 }) })
  const [form, setForm] = useState({
    amount: contract?.amount ? String(contract.amount) : '',
    status: contract?.status ?? 'DRAFT',
    startDate: contract?.startDate ? contract.startDate.split('T')[0] : '',
    endDate: contract?.endDate ? contract.endDate.split('T')[0] : '',
    accountId: contract?.accountId ?? '',
    notes: contract?.notes ?? '',
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: object) => contract ? contractsApi.update(contract.id, data) : contractsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); onClose() },
    onError: (e: { response?: { data?: { error?: string } } }) => setError(e.response?.data?.error ?? 'Erreur'),
  })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Montant (€) *</label><input type="number" className="input" value={form.amount} onChange={f('amount')} required /></div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={form.status} onChange={f('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Compte *</label>
        <select className="input" value={form.accountId} onChange={f('accountId')} required>
          <option value="">— Sélectionner —</option>
          {accounts?.data.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Date début</label><input type="date" className="input" value={form.startDate} onChange={f('startDate')} /></div>
        <div><label className="label">Date fin</label><input type="date" className="input" value={form.endDate} onChange={f('endDate')} /></div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={f('notes')} /></div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Enregistrement...' : contract ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function ContractsList() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [selected, setSelected] = useState<Contract | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', { page, status, search }],
    queryFn: () => contractsApi.list({ page, status: status || undefined, search: search || undefined }),
  })
  const qc = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: contractsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
  const close = () => { setModal(null); setSelected(null) }

  async function handleExport() {
    const all = await contractsApi.list({ status: status || undefined, search: search || undefined, limit: 1000 })
    downloadCsv(all.data.map((c: Contract) => ({
      numero: c.number, compte: c.account?.name ?? '',
      montant: Number(c.amount), statut: c.status,
      debut: c.startDate ? new Date(c.startDate).toLocaleDateString('fr-FR') : '',
      fin: c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '',
    })), 'contrats', [
      { key: 'numero', label: 'N°' }, { key: 'compte', label: 'Compte' },
      { key: 'montant', label: 'Montant (€)' }, { key: 'statut', label: 'Statut' },
      { key: 'debut', label: 'Début' }, { key: 'fin', label: 'Fin' },
    ])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contrats</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary"><Download size={15} /> Export CSV</button>
          <button onClick={() => setModal('create')} className="btn-primary"><Plus size={16} /> Nouveau contrat</button>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Rechercher par N°..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Tous statuts</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['N°', 'Compte', 'Montant', 'Statut', 'Début', 'Fin', 'Signé le', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Chargement...</td></tr>}
            {data?.data.map((c) => {
              const expiring = isExpiringSoon(c)
              const daysLeft = c.endDate ? daysUntilExpiry(c.endDate) : null
              return (
              <tr key={c.id} className={`hover:bg-gray-50 ${expiring ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {expiring && <AlertTriangle size={13} className="text-orange-500 shrink-0" />}
                    <span className="font-mono text-xs text-gray-600">{c.number}</span>
                  </div>
                  {expiring && daysLeft !== null && (
                    <span className="text-xs text-orange-600 font-medium">Expire dans {daysLeft}j</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{c.account?.name}</td>
                <td className="px-4 py-3 font-semibold text-blue-700">{fmt(Number(c.amount))}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-gray-500">{c.startDate ? format(new Date(c.startDate), 'dd MMM yy', { locale: fr }) : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.endDate ? format(new Date(c.endDate), 'dd MMM yy', { locale: fr }) : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.signedAt ? format(new Date(c.signedAt), 'dd MMM yy', { locale: fr }) : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(c); setModal('edit') }} className="text-xs text-blue-600 hover:underline">Modifier</button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(c.id) }} className="text-xs text-red-500 hover:underline ml-2">Suppr.</button>
                  </div>
                </td>
              </tr>
            )})}

            {!isLoading && !data?.data.length && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Aucun contrat</td></tr>}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={page} total={data.total} limit={data.limit} onChange={setPage} />}
      {modal === 'create' && <Modal title="Nouveau contrat" onClose={close}><ContractForm onClose={close} /></Modal>}
      {modal === 'edit' && selected && <Modal title="Modifier contrat" onClose={close}><ContractForm contract={selected} onClose={close} /></Modal>}
    </div>
  )
}
