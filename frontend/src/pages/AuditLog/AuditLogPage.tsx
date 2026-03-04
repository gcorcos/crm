import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '../../api'
import Pagination from '../../components/ui/Pagination'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ShieldCheck } from 'lucide-react'

const ENTITIES = ['', 'Lead', 'Account', 'Contact', 'Opportunity', 'Contract', 'Order']
const ENTITY_LABELS: Record<string, string> = {
  Lead: 'Lead', Account: 'Compte', Contact: 'Contact',
  Opportunity: 'Opportunité', Contract: 'Contrat', Order: 'Commande',
}
const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}
const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Créé', UPDATE: 'Modifié', DELETE: 'Supprimé',
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [entity, setEntity] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', { page, entity }],
    queryFn: () => auditApi.list({ page, entity: entity || undefined }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} className="text-gray-500" />
          <h1 className="text-2xl font-bold">Journal d'audit</h1>
        </div>
        <select
          className="input w-44"
          value={entity}
          onChange={(e) => { setEntity(e.target.value); setPage(1) }}
        >
          <option value="">Toutes les entités</option>
          {ENTITIES.filter(Boolean).map((e) => (
            <option key={e} value={e}>{ENTITY_LABELS[e]}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Date', 'Action', 'Entité', 'Par', 'Détails'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Chargement...</td></tr>
            )}
            {data?.data.map((log) => (
              <>
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action]}`}>
                      {ACTION_LABELS[log.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{ENTITY_LABELS[log.entity] ?? log.entity}</span>
                    <span className="text-gray-400 font-mono text-xs ml-2">{log.entityId.slice(0, 8)}…</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {!!(log.before || log.after) && (
                      <button
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {expanded === log.id ? 'Masquer' : 'Voir diff'}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === log.id && (
                  <tr key={`${log.id}-detail`} className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {!!log.before && (
                          <div>
                            <p className="font-semibold text-gray-500 mb-1">Avant</p>
                            <pre className="bg-white rounded p-2 border text-gray-600 overflow-auto max-h-40">
                              {JSON.stringify(log.before, null, 2)}
                            </pre>
                          </div>
                        )}
                        {!!log.after && (
                          <div>
                            <p className="font-semibold text-gray-500 mb-1">Après</p>
                            <pre className="bg-white rounded p-2 border text-gray-600 overflow-auto max-h-40">
                              {JSON.stringify(log.after, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!isLoading && !data?.data.length && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucun événement</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && <Pagination page={page} total={data.total} limit={data.limit} onChange={setPage} />}
    </div>
  )
}
