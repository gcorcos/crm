export function downloadCsv(
  rows: object[],
  filename: string,
  columns: { key: string; label: string }[]
) {
  const header = columns.map((c) => c.label).join(';')
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = (row as Record<string, unknown>)[c.key]
          const str = val == null ? '' : String(val)
          return str.includes(';') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(';')
    )
    .join('\n')

  const csv = `${header}\n${body}`
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
