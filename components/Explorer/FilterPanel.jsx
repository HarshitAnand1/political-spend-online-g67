"use client"

export default function FilterPanel({ filters, setFilters }) {
  return (
    <aside className="lg:col-span-1 bg-white p-4 rounded-lg border border-slate-200 self-start dark:bg-slate-900">
      <h3 className="text-lg font-semibold mb-4">Refine Results</h3>
      <div className="space-y-5">
        <div>
          <h4 className="font-semibold text-sm mb-2">Date Range</h4>
          <div className="space-y-1">
            {['Last 24 hours', 'Last 7 days', 'Last 30 days'].map((label) => (
              <label className="flex items-center text-sm" key={label}>
                <input
                  type="radio"
                  name="date"
                  className="mr-2"
                  checked={filters.datePreset === label}
                  onChange={() => setFilters((f) => ({ ...f, datePreset: label }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-2">Party</h4>
          <div className="space-y-1">
            {['BJP', 'INC', 'AAP'].map((p) => (
              <label className="flex items-center text-sm" key={p}>
                <input
                  type="checkbox"
                  className="mr-2 rounded"
                  checked={filters.parties.includes(p)}
                  onChange={(e) => {
                    setFilters((f) => {
                      const exists = f.parties.includes(p)
                      return {
                        ...f,
                        parties: exists ? f.parties.filter((x) => x !== p) : [...f.parties, p],
                      }
                    })
                  }}
                />
                {p}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-2">State / UT</h4>
          <div className="space-y-1">
            {['Uttar Pradesh', 'Maharashtra', 'West Bengal', 'Delhi'].map((s) => (
              <label className="flex items-center text-sm" key={s}>
                <input
                  type="checkbox"
                  className="mr-2 rounded"
                  checked={filters.states.includes(s)}
                  onChange={() => {
                    setFilters((f) => {
                      const exists = f.states.includes(s)
                      return {
                        ...f,
                        states: exists ? f.states.filter((x) => x !== s) : [...f.states, s],
                      }
                    })
                  }}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
