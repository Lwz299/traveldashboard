import { cn } from "../../lib/utils.mjs"

function SkeletonRows({ columns = 4, rows = 5 }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="grid animate-pulse gap-2 rounded-lg bg-slate-50 p-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, colIdx) => (
            <div key={colIdx} className="h-4 rounded bg-slate-200/80" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyText = "No data available.",
  rowKey,
  minWidth = "min-w-[760px]",
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <SkeletonRows columns={columns.length} />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
      <table className={cn("w-full border-collapse text-sm", minWidth)}>
        <thead className="bg-slate-50/90 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={rowKey(row, idx)} className="border-t border-slate-200/70">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3 align-top text-slate-700">
                  {column.render ? column.render(row, idx) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
