import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi, accountsApi } from '../../api'
import { Contact } from '../../types'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { Plus, Search, Download } from 'lucide-react'
import { downloadCsv } from '../../utils/exportCsv'

function ContactForm({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: accounts } = useQuery({ queryKey: ['accounts-all'], queryFn: () => accountsApi.list({ limit: 200 }) })
  const [form, setForm] = useState({
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    title: contact?.title ?? '',
    role: contact?.role ?? '',
    accountId: contact?.accountId ?? '',
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: object) => contact ? contactsApi.update(contact.id, data) : contactsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); onClose() },
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
            <option value="">— Sélectionner —</option>
            {accounts?.data.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Enregistrement...' : contact ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

export default function ContactsList() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [selected, setSelected] = useState<Contact | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { page, search }],
    queryFn: () => contactsApi.list({ page, search: search || undefined }),
  })
  const qc = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: contactsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
  const close = () => { setModal(null); setSelected(null) }

  async function handleExport() {
    const all = await contactsApi.list({ search: search || undefined, limit: 1000 })
    downloadCsv(all.data.map((c: Contact) => ({
      nom: `${c.firstName} ${c.lastName}`, email: c.email, telephone: c.phone ?? '',
      poste: c.title ?? '', compte: c.account?.name ?? '', role: c.role ?? '',
    })), 'contacts', [
      { key: 'nom', label: 'Nom' }, { key: 'email', label: 'Email' },
      { key: 'telephone', label: 'Téléphone' }, { key: 'poste', label: 'Poste' },
      { key: 'compte', label: 'Compte' }, { key: 'role', label: 'Rôle' },
    ])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary"><Download size={15} /> Export CSV</button>
          <button onClick={() => setModal('create')} className="btn-primary"><Plus size={16} /> Nouveau contact</button>
        </div>
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
              {['Contact', 'Email', 'Téléphone', 'Poste', 'Compte', 'Rôle', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Chargement...</td></tr>}
            {data?.data.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Link to={`/contacts/${c.id}`} className="hover:text-blue-600">
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.title ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.account?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.role ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(c); setModal('edit') }} className="text-xs text-blue-600 hover:underline">Modifier</button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(c.id) }} className="text-xs text-red-500 hover:underline ml-2">Suppr.</button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.data.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun contact</td></tr>}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={page} total={data.total} limit={data.limit} onChange={setPage} />}
      {modal === 'create' && <Modal title="Nouveau contact" onClose={close}><ContactForm onClose={close} /></Modal>}
      {modal === 'edit' && selected && <Modal title="Modifier contact" onClose={close}><ContactForm contact={selected} onClose={close} /></Modal>}
    </div>
  )
}
