import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activitiesApi, leadsApi, opportunitiesApi, contactsApi, accountsApi } from '../../api'
import { Activity } from '../../types'
import { format, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Phone, Mail, Users, CheckSquare, FileText,
  AlertTriangle, CheckCircle, Clock, Plus, X,
} from 'lucide-react'

const TYPE_ICONS: Record<string, React.ElementType> = {
  CALL: Phone, EMAIL: Mail, MEETING: Users, TASK: CheckSquare, NOTE: FileText,
}
const TYPE_COLORS: Record<string, string> = {
  CALL: 'bg-blue-100 text-blue-600',
  EMAIL: 'bg-purple-100 text-purple-600',
  MEETING: 'bg-green-100 text-green-600',
  TASK: 'bg-yellow-100 text-yellow-600',
  NOTE: 'bg-gray-100 text-gray-600',
}
const TYPE_LABELS: Record<string, string> = {
  CALL: 'Appel', EMAIL: 'Email', MEETING: 'Réunion', TASK: 'Tâche', NOTE: 'Note',
}
const STATUS_LABELS: Record<string, string> = {
  TODO: 'À faire', IN_PROGRESS: 'En cours', DONE: 'Terminé', CANCELLED: 'Annulé',
}

const RELATED_TYPES = ['LEAD', 'OPPORTUNITY', 'CONTACT', 'ACCOUNT']
const RELATED_LABELS: Record<string, string> = {
  LEAD: 'Lead', OPPORTUNITY: 'Opportunité', CONTACT: 'Contact', ACCOUNT: 'Compte',
}

function useRelatedEntities(relatedType: string) {
  const leads = useQuery({ queryKey: ['leads-all'], queryFn: () => leadsApi.list({ limit: 200 }), enabled: relatedType === 'LEAD' })
  const opps = useQuery({ queryKey: ['opportunities-all'], queryFn: () => opportunitiesApi.list({ limit: 200 }), enabled: relatedType === 'OPPORTUNITY' })
  const contacts = useQuery({ queryKey: ['contacts-all'], queryFn: () => contactsApi.list({ limit: 200 }), enabled: relatedType === 'CONTACT' })
  const accounts = useQuery({ queryKey: ['accounts-all'], queryFn: () => accountsApi.list({ limit: 200 }), enabled: relatedType === 'ACCOUNT' })

  if (relatedType === 'LEAD') return (leads.data?.data ?? []).map((l) => ({ id: l.id, label: `${l.firstName} ${l.lastName}` }))
  if (relatedType === 'OPPORTUNITY') return (opps.data?.data ?? []).map((o) => ({ id: o.id, label: o.name }))
  if (relatedType === 'CONTACT') return (contacts.data?.data ?? []).map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))
  if (relatedType === 'ACCOUNT') return (accounts.data?.data ?? []).map((a) => ({ id: a.id, label: a.name }))
  return []
}

function QuickActivityForm({
  defaultRelatedType,
  defaultRelatedId,
  onClose,
}: {
  defaultRelatedType: string
  defaultRelatedId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    type: 'TASK',
    subject: '',
    dueDate: '',
    relatedType: defaultRelatedType,
    relatedId: defaultRelatedId,
  })

  const entities = useRelatedEntities(form.relatedType)

  const mutation = useMutation({
    mutationFn: (data: object) => activitiesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities', defaultRelatedType, defaultRelatedId] })
      onClose()
    },
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value, ...(k === 'relatedType' ? { relatedId: '' } : {}) }))

  const fkMap: Record<string, string> = {
    LEAD: 'leadId', OPPORTUNITY: 'opportunityId', CONTACT: 'contactId', ACCOUNT: 'accountId',
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-blue-800">Nouvelle activité</p>
        <button onClick={onClose} className="text-blue-400 hover:text-blue-600"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className="input text-sm py-1.5" value={form.type} onChange={f('type')}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" className="input text-sm py-1.5" value={form.dueDate} onChange={f('dueDate')} />
      </div>
      <input className="input text-sm py-1.5" placeholder="Sujet *" value={form.subject} onChange={f('subject')} />
      {!defaultRelatedId && (
        <div className="grid grid-cols-2 gap-2">
          <select className="input text-sm py-1.5" value={form.relatedType} onChange={f('relatedType')}>
            {RELATED_TYPES.map((r) => <option key={r} value={r}>{RELATED_LABELS[r]}</option>)}
          </select>
          <select className="input text-sm py-1.5" value={form.relatedId} onChange={f('relatedId')} required>
            <option value="">— Entité —</option>
            {entities.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
      )}
      <button
        disabled={!form.subject || (!form.relatedId && !defaultRelatedId) || mutation.isPending}
        onClick={() => mutation.mutate({
          ...form,
          relatedId: form.relatedId || defaultRelatedId,
          [fkMap[form.relatedType]]: form.relatedId || defaultRelatedId,
          status: 'TODO',
        })}
        className="btn-primary w-full text-sm py-1.5"
      >
        {mutation.isPending ? 'Création...' : 'Créer'}
      </button>
    </div>
  )
}

interface ActivityTimelineProps {
  relatedType: string
  relatedId: string
  showAddButton?: boolean
}

export default function ActivityTimeline({ relatedType, relatedId, showAddButton = true }: ActivityTimelineProps) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['activities', relatedType, relatedId],
    queryFn: () => activitiesApi.list({ relatedType, relatedId, limit: 50 }),
    enabled: !!relatedId,
  })

  const doneMutation = useMutation({
    mutationFn: (id: string) => activitiesApi.update(id, { status: 'DONE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', relatedType, relatedId] }),
  })

  const activities: Activity[] = data?.data ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Activités ({data?.total ?? 0})</h3>
        {showAddButton && (
          <button onClick={() => setShowForm((v) => !v)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Plus size={13} /> Ajouter
          </button>
        )}
      </div>

      {showForm && (
        <QuickActivityForm
          defaultRelatedType={relatedType}
          defaultRelatedId={relatedId}
          onClose={() => setShowForm(false)}
        />
      )}

      {isLoading && <div className="text-center py-4 text-gray-400 text-sm">Chargement...</div>}

      {!isLoading && activities.length === 0 && (
        <div className="text-center py-6 text-gray-400 text-sm">Aucune activité</div>
      )}

      <div className="space-y-2">
        {activities.map((a) => {
          const Icon = TYPE_ICONS[a.type] ?? FileText
          const isDone = a.status === 'DONE'
          const overdue = a.dueDate && isPast(new Date(a.dueDate)) && !isDone && a.status !== 'CANCELLED'

          return (
            <div key={a.id} className={`flex gap-3 p-3 rounded-xl border transition-colors ${isDone ? 'bg-gray-50 border-gray-100 opacity-60' : overdue ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
              <div className={`p-1.5 rounded-lg shrink-0 h-fit ${TYPE_COLORS[a.type]}`}>
                <Icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {a.subject}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {overdue && <AlertTriangle size={12} className="text-red-500" />}
                    {!isDone && a.status !== 'CANCELLED' && (
                      <button onClick={() => doneMutation.mutate(a.id)} title="Marquer terminé"
                        className="text-gray-300 hover:text-green-500 transition-colors">
                        <CheckCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-400">{TYPE_LABELS[a.type]}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                  {a.dueDate && (
                    <>
                      <span className="text-xs text-gray-300">·</span>
                      <span className={`text-xs flex items-center gap-0.5 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                        <Clock size={10} />
                        {format(new Date(a.dueDate), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </>
                  )}
                  {a.owner && (
                    <>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{a.owner.firstName} {a.owner.lastName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
