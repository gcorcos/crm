import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../../api'
import { Account } from '../../types'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { Plus, Search, Building2 } from 'lucide-react'

const INDUSTRIES = ['Tech', 'Finance', 'Santé', 'Retail', 'Industrie', 'Autre']

function AccountForm({ account, onClose }: { account?: Account; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: account?.name ?? '',
    industry: account?.industry ?? '',
    size: account?.size ?? '',
    website: account?.website ?? '',
    city: account?.city ?? '',
    country: account?.country ?? 'France',
    notes: account?.notes ?? '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: object) => account ? accountsApi.update(account.id, data) : accountsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); onClose() },
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
            <option value="">— Sélectionner —</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Taille</label>
          <select className="input" value={form.size} onChange={f('size')}>
            <option value="">— Sélectionner —</option>
            {['1-10', '10-50', '50-200', '200-500', '500+'].map((s) => <option key={s}>{s}</option>)}
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
          {mutation.isPending ? 'Enregistrement...' : account ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

export default function AccountsList() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [selected, setSelected] = useState<Account | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', { page, search }],
    queryFn: () => accountsApi.list({ page, search: search || undefined }),
  })

  const qc = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: accountsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
    onError: (e: { response?: { data?: { error?: string } } }) => alert(e.response?.data?.error),
  })

  const close = () => { setModal(null); setSelected(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Comptes</h1>
        <button onClick={() => setModal('create')} className="btn-primary"><Plus size={16} /> Nouveau compte</button>
      </div>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Rechercher..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Compte', 'Secteur', 'Taille', 'Ville', 'Contacts', 'Opportunités', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Chargement...</td></tr>}
            {data?.data.map((acc) => (
              <tr key={acc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Building2 size={14} className="text-blue-600" />
                    </div>
                    <button onClick={() => { setSelected(acc); setModal('edit') }} className="font-medium hover:text-blue-600">
                      {acc.name}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{acc.industry ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{acc.size ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{acc.city ?? '—'}</td>
                <td className="px-4 py-3 text-center">{acc._count?.contacts ?? 0}</td>
                <td className="px-4 py-3 text-center">{acc._count?.opportunities ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(acc); setModal('edit') }} className="text-xs text-blue-600 hover:underline">Modifier</button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(acc.id) }}
                      className="text-xs text-red-500 hover:underline ml-2">Suppr.</button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.data.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun compte</td></tr>}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={page} total={data.total} limit={data.limit} onChange={setPage} />}

      {modal === 'create' && <Modal title="Nouveau compte" onClose={close}><AccountForm onClose={close} /></Modal>}
      {modal === 'edit' && selected && <Modal title="Modifier compte" onClose={close}><AccountForm account={selected} onClose={close} /></Modal>}
    </div>
  )
}
