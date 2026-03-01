import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../../api'
import { User, Role } from '../../types'
import Modal from '../../components/ui/Modal'
import { Plus, UserCheck, UserX } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'SALES', 'READONLY']
const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin', MANAGER: 'Manager', SALES: 'Commercial', READONLY: 'Lecture seule',
}
const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  MANAGER: 'bg-purple-100 text-purple-700',
  SALES: 'bg-blue-100 text-blue-700',
  READONLY: 'bg-gray-100 text-gray-600',
}

function UserForm({ user, onClose }: { user?: User; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'SALES' as Role,
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: object) =>
      user ? usersApi.update(user.id, data) : usersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose() },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      setError(e.response?.data?.error ?? 'Erreur'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, string> = {
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role,
    }
    if (!user) {
      payload.email = form.email
      payload.password = form.password
    }
    mutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Prénom *</label><input className="input" value={form.firstName} onChange={f('firstName')} required /></div>
        <div><label className="label">Nom *</label><input className="input" value={form.lastName} onChange={f('lastName')} required /></div>
      </div>
      {!user && (
        <>
          <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={f('email')} required /></div>
          <div><label className="label">Mot de passe *</label><input type="password" className="input" value={form.password} onChange={f('password')} required minLength={8} /></div>
        </>
      )}
      <div>
        <label className="label">Rôle</label>
        <select className="input" value={form.role} onChange={f('role')}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Enregistrement...' : user ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

export default function UsersList() {
  const { user: me } = useAuthStore()
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [selected, setSelected] = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  })

  const qc = useQueryClient()
  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const close = () => { setModal(null); setSelected(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Nouvel utilisateur
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Utilisateur', 'Email', 'Rôle', 'Statut', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Chargement...</td></tr>}
            {(users as User[]).map((u) => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <span className="font-medium">{u.firstName} {u.lastName}</span>
                    {u.id === me?.id && <span className="text-xs text-gray-400">(moi)</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelected(u); setModal('edit') }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Modifier
                    </button>
                    {u.id !== me?.id && (
                      <button
                        onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                        className={`text-xs hover:underline flex items-center gap-1 ${u.isActive ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {u.isActive ? <><UserX size={12} /> Désactiver</> : <><UserCheck size={12} /> Activer</>}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !(users as User[]).length && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucun utilisateur</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === 'create' && <Modal title="Nouvel utilisateur" onClose={close}><UserForm onClose={close} /></Modal>}
      {modal === 'edit' && selected && <Modal title="Modifier utilisateur" onClose={close}><UserForm user={selected} onClose={close} /></Modal>}
    </div>
  )
}
