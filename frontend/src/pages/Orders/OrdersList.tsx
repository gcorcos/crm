import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, accountsApi } from '../../api'
import { Order } from '../../types'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { Plus, Search } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']

function OrderForm({ order, onClose }: { order?: Order; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: accounts } = useQuery({ queryKey: ['accounts-all'], queryFn: () => accountsApi.list({ limit: 200 }) })
  const [form, setForm] = useState({
    totalAmount: order?.totalAmount ? String(order.totalAmount) : '',
    status: order?.status ?? 'PENDING',
    orderDate: order?.orderDate ? order.orderDate.split('T')[0] : new Date().toISOString().split('T')[0],
    accountId: order?.accountId ?? '',
    notes: order?.notes ?? '',
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: object) => order ? ordersApi.update(order.id, data) : ordersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); onClose() },
    onError: (e: { response?: { data?: { error?: string } } }) => setError(e.response?.data?.error ?? 'Erreur'),
  })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Montant (€) *</label><input type="number" className="input" value={form.totalAmount} onChange={f('totalAmount')} required /></div>
        <div><label className="label">Date commande</label><input type="date" className="input" value={form.orderDate} onChange={f('orderDate')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Compte *</label>
          <select className="input" value={form.accountId} onChange={f('accountId')} required>
            <option value="">— Sélectionner —</option>
            {accounts?.data.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={form.status} onChange={f('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={f('notes')} /></div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Enregistrement...' : order ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function OrdersList() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [selected, setSelected] = useState<Order | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { page, status, search }],
    queryFn: () => ordersApi.list({ page, status: status || undefined, search: search || undefined }),
  })
  const qc = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: ordersApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
  const close = () => { setModal(null); setSelected(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Commandes</h1>
        <button onClick={() => setModal('create')} className="btn-primary"><Plus size={16} /> Nouvelle commande</button>
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
              {['N°', 'Compte', 'Montant', 'Statut', 'Date', 'Contrat', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Chargement...</td></tr>}
            {data?.data.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{o.number}</td>
                <td className="px-4 py-3 font-medium">{o.account?.name}</td>
                <td className="px-4 py-3 font-semibold text-blue-700">{fmt(Number(o.totalAmount))}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-gray-500">{format(new Date(o.orderDate), 'dd MMM yyyy', { locale: fr })}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{o.contract?.number ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(o); setModal('edit') }} className="text-xs text-blue-600 hover:underline">Modifier</button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(o.id) }} className="text-xs text-red-500 hover:underline ml-2">Suppr.</button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.data.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucune commande</td></tr>}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={page} total={data.total} limit={data.limit} onChange={setPage} />}
      {modal === 'create' && <Modal title="Nouvelle commande" onClose={close}><OrderForm onClose={close} /></Modal>}
      {modal === 'edit' && selected && <Modal title="Modifier commande" onClose={close}><OrderForm order={selected} onClose={close} /></Modal>}
    </div>
  )
}
