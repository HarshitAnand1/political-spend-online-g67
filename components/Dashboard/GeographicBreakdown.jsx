"use client"

export default function GeographicBreakdown({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
          Geographic Distribution
        </h3>
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    )
  }

  const partyColors = {
    BJP: 'bg-orange-500',
    INC: 'bg-sky-500',
    AAP: 'bg-blue-700',
    Others: 'bg-slate-500'
  }

  const maxSpend = data.length > 0 ? data[0].spendRaw : 1;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
        Top States by Ad Spend
      </h3>
      <div className="space-y-3">
        {data.map((state, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">
                  {state.state}
                </span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold text-white ${partyColors[state.dominantParty]}`}>
                  {state.dominantParty}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {state.adCount} ads
                </span>
                <span className="font-semibold text-slate-800 dark:text-white min-w-[80px] text-right">
                  {state.spend}
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full ${partyColors[state.dominantParty]} transition-all duration-500`}
                style={{ width: `${(state.spendRaw / maxSpend) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
