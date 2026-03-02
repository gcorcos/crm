import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchApi } from '../../api'
import { Search } from 'lucide-react'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

type Results = Awaited<ReturnType<typeof searchApi.search>>

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults(null); setOpen(false); return }
    setLoading(true)
    searchApi.search(debouncedQuery)
      .then((r) => { setResults(r); setOpen(true) })
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function go(path: string) {
    navigate(path)
    setQuery('')
    setOpen(false)
    setResults(null)
  }

  const hasResults = results && (
    results.leads.length + results.accounts.length +
    results.contacts.length + results.opportunities.length > 0
  )

  return (
    <div ref={containerRef} className="relative w-72">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-gray-300 transition-all"
          placeholder="Recherche globale..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results && query.length >= 2) setOpen(true) }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {!hasResults ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun résultat</p>
          ) : (
            <div className="py-1">
              {results!.leads.length > 0 && (
                <Section label="Leads">
                  {results!.leads.map((l) => (
                    <ResultRow key={l.id} primary={`${l.firstName} ${l.lastName}`} secondary={l.email} tag={l.status}
                      onClick={() => go(`/leads/${l.id}`)} />
                  ))}
                </Section>
              )}
              {results!.accounts.length > 0 && (
                <Section label="Comptes">
                  {results!.accounts.map((a) => (
                    <ResultRow key={a.id} primary={a.name} secondary={a.industry ?? ''} onClick={() => go('/accounts')} />
                  ))}
                </Section>
              )}
              {results!.contacts.length > 0 && (
                <Section label="Contacts">
                  {results!.contacts.map((c) => (
                    <ResultRow key={c.id} primary={`${c.firstName} ${c.lastName}`} secondary={c.email} onClick={() => go('/contacts')} />
                  ))}
                </Section>
              )}
              {results!.opportunities.length > 0 && (
                <Section label="Opportunités">
                  {results!.opportunities.map((o) => (
                    <ResultRow key={o.id} primary={o.name} secondary={o.account?.name ?? ''} tag={o.stage}
                      onClick={() => go(`/opportunities/${o.id}`)} />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 pt-3 pb-1">{label}</p>
      {children}
    </div>
  )
}

function ResultRow({ primary, secondary, tag, onClick }: {
  primary: string; secondary: string; tag?: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{primary}</p>
        {secondary && <p className="text-xs text-gray-400 truncate">{secondary}</p>}
      </div>
      {tag && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 shrink-0">{tag}</span>}
    </button>
  )
}
