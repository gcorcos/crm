import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activitiesApi } from '../../api'
import { Activity } from '../../types'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { Plus, AlertTriangle } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'

const TYPES = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE']
const TYPE_LABELS: Record<string, string> = { CALL: 'Appel', EMAIL: 'Email', MEETING: 'Réunion', TASK: 'Tâche', NOTE: 'Note' }
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']
const RELATED_TYPES = ['LEAD', 'OPPORTUNITY', 'CONTACT', 'ACCOUNT']

function ActivityForm({ activity, onClose }: { activity?: Activity; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    type: activity?.type ?? 'TASK',
    subject: activity?.subject ?? '',
    description: activity?.description ?? '',
    status: activity?.status ?? 'TODO',
    dueDate: activity?.dueDate ? activity.dueDate.split('T')[0] : '',
    relatedType: activity?.relatedType ?? 'OPPORTUNITY',
    relatedId: activity?.relatedId ?? '',
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: object) => activity ? activitiesApi.update(activity.id, data) : activitiesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); onClose() },
    onError: (e: { response?: { data?: { error?: string } } }) => setError(e.response?.data?.error ?? 'Erreur'),
  })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={f('type')}>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={form.status} onChange={f('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Sujet *</label><input className="input" value={form.subject} onChange={f('subject')} required /></div>
      <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={f('description')} /></div>
      <div><label className="label">Date d'échéance</label><input type="date" className="input" value={form.dueDate} onChange={f('dueDate')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Entité liée</label>
          <select className="input" value={form.relatedType} onChange={f('relatedType')}>
            {RELATED_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div><label className="label">ID entité *</label><input className="input" value={form.relatedId} onChange={f('relatedId')} placeholder="ID de l'entité" required /></div>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Enregistrement...' : activity ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

export default function ActivitiesList() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [selected, setSelected] = useState<Activity | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['activities', { page, status, type }],
    queryFn: () => activitiesApi.list({ page, status: status || undefined, type: type || undefined }),
  })
  const qc = useQueryClient()
  const doneMutation = useMutation({
    mutationFn: (id: string) => activitiesApi.update(id, { status: 'DONE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
  const deleteMutation = useMutation({
    mutationFn: activitiesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
  const close = () => { setModal(null); setSelected(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activités</h1>
        <button onClick={() => setModal('create')} className="btn-primary"><Plus size={16} /> Nouvelle activité</button>
      </div>
      <div className="flex gap-3">
        <select className="input w-40" value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}>
          <option value="">Tous types</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select className="input w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Tous statuts</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Type', 'Sujet', 'Lié à', 'Échéance', 'Statut', 'Assigné', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Chargement...</td></tr>}
            {data?.data.map((a) => {
              const overdue = a.dueDate && isPast(new Date(a.dueDate)) && !['DONE', 'CANCELLED'].includes(a.status)
              return (
                <tr key={a.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="badge bg-gray-100 text-gray-700">{TYPE_LABELS[a.type]}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      {overdue && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                      <button onClick={() => { setSelected(a); setModal('edit') }} className="hover:text-blue-600 text-left">{a.subject}</button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.relatedType} · {a.relatedId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.dueDate ? format(new Date(a.dueDate), 'dd MMM yyyy', { locale: fr }) : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{a.owner?.firstName} {a.owner?.lastName}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {!['DONE', 'CANCELLED'].includes(a.status) && (
                        <button onClick={() => doneMutation.mutate(a.id)} className="text-xs text-green-600 hover:underline">Terminer</button>
                      )}
                      <button onClick={() => { setSelected(a); setModal('edit') }} className="text-xs text-blue-600 hover:underline ml-1">Modifier</button>
                      <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(a.id) }} className="text-xs text-red-500 hover:underline ml-1">Suppr.</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!isLoading && !data?.data.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucune activité</td></tr>}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={page} total={data.total} limit={data.limit} onChange={setPage} />}
      {modal === 'create' && <Modal title="Nouvelle activité" onClose={close}><ActivityForm onClose={close} /></Modal>}
      {modal === 'edit' && selected && <Modal title="Modifier activité" onClose={close}><ActivityForm activity={selected} onClose={close} /></Modal>}
    </div>
  )
}
