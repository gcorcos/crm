import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '../../api'
import { useAuthStore } from '../../store/auth'
import { User, Lock, CheckCircle } from 'lucide-react'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
  })
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')

  const profileMutation = useMutation({
    mutationFn: (data: object) => profileApi.updateMe(data),
    onSuccess: (updated) => {
      setUser(updated)
      qc.invalidateQueries({ queryKey: ['me'] })
      setProfileSuccess(true)
      setProfileError('')
      setTimeout(() => setProfileSuccess(false), 3000)
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      setProfileError(e.response?.data?.error ?? 'Erreur')
      setProfileSuccess(false)
    },
  })

  const pwMutation = useMutation({
    mutationFn: (data: object) => profileApi.changePassword(data),
    onSuccess: () => {
      setPwSuccess(true)
      setPwError('')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 3000)
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      setPwError(e.response?.data?.error ?? 'Erreur')
      setPwSuccess(false)
    },
  })

  function submitProfile(e: React.FormEvent) {
    e.preventDefault()
    profileMutation.mutate(profileForm)
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('Les mots de passe ne correspondent pas')
      return
    }
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Administrateur', MANAGER: 'Manager', SALES: 'Commercial', READONLY: 'Lecture seule',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>

      {/* Profile info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <User size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Informations personnelles</h2>
        </div>

        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1 inline-block">
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </span>
          </div>
        </div>

        <form onSubmit={submitProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom *</label>
              <input className="input" value={profileForm.firstName}
                onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={profileForm.lastName}
                onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={profileForm.email}
              onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} required />
          </div>
          {profileError && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{profileError}</p>}
          {profileSuccess && (
            <p className="text-sm text-green-700 bg-green-50 rounded p-2 flex items-center gap-2">
              <CheckCircle size={14} /> Profil mis à jour
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={profileMutation.isPending} className="btn-primary">
              {profileMutation.isPending ? 'Enregistrement...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Lock size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Changer le mot de passe</h2>
        </div>
        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label className="label">Mot de passe actuel *</label>
            <input type="password" className="input" value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nouveau mot de passe *</label>
              <input type="password" className="input" value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} required minLength={8} />
            </div>
            <div>
              <label className="label">Confirmer *</label>
              <input type="password" className="input" value={pwForm.confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} required />
            </div>
          </div>
          {pwError && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{pwError}</p>}
          {pwSuccess && (
            <p className="text-sm text-green-700 bg-green-50 rounded p-2 flex items-center gap-2">
              <CheckCircle size={14} /> Mot de passe modifié
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={pwMutation.isPending} className="btn-primary">
              {pwMutation.isPending ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
