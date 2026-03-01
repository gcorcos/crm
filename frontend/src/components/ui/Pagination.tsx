interface Props {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
}

export default function Pagination({ page, total, limit, onChange }: Props) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} sur {total}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
        >
          Préc.
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`px-3 py-1 rounded border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
        >
          Suiv.
        </button>
      </div>
    </div>
  )
}
