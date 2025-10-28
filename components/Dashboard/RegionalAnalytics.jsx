"use client"

export default function RegionalAnalytics({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
          Regional Distribution
        </h3>
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    )
  }

  const partyColors = {
    BJP: '#FF9933',
    INC: '#138808',
    AAP: '#0073e6',
    Others: '#64748B'
  }

  const maxSpend = data.length > 0 ? data[0].spendRaw : 1;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
        Regional Analytics
      </h3>
      <div className="space-y-4">
        {data.map((region, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: region.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {region.region} India
                    </span>
                    <span 
                      className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: partyColors[region.dominantParty] }}
                    >
                      {region.dominantParty}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{region.stateCount} states</span>
                    <span>•</span>
                    <span>{region.adCount} ads</span>
                    <span>•</span>
                    <span>{(region.impressions / 1000000).toFixed(1)}M impressions</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800 dark:text-white">
                  {region.spend}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {region.percentage}%
                </span>
              </div>
            </div>
            
            {/* Spend bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${(region.spendRaw / maxSpend) * 100}%`,
                  backgroundColor: region.color
                }}
              />
            </div>
            
            {/* Party breakdown mini-bars */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {Object.entries(region.partyBreakdown).map(([party, spend]) => (
                <div key={party} className="text-center">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {party}
                  </div>
                  <div 
                    className="h-2 rounded-full"
                    style={{ backgroundColor: partyColors[party] }}
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {spend}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Expand to show states */}
            {region.states && region.states.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200">
                  View states ({region.stateCount})
                </summary>
                <div className="mt-2 flex flex-wrap gap-1">
                  {region.states.slice(0, 10).map((state, idx) => (
                    <span 
                      key={idx}
                      className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-700 dark:text-slate-300"
                    >
                      {state}
                    </span>
                  ))}
                  {region.states.length > 10 && (
                    <span className="inline-block px-2 py-1 text-xs text-slate-500">
                      +{region.states.length - 10} more
                    </span>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
