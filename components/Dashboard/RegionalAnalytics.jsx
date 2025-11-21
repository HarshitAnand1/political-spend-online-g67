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
    'Janata Dal (United)': '#006400',
    RJD: '#008000',
    'Jan Suraaj': '#FF6347',
    LJP: '#9333EA',
    HAM: '#92400E',
    VIP: '#0891B2',
    AIMIM: '#14532D',
    DMK: '#DC2626',
    AITC: '#14B8A6',
    NCP: '#2563EB',
    TDP: '#FBBF24',
    AIADMK: '#059669',
    SP: '#E11D48',
    BSP: '#3B82F6',
    'Shiv Sena': '#F97316',
    BJD: '#10B981',
    YSRCP: '#7C3AED',
    BRS: '#EC4899',
    'CPI(M)': '#B91C1C',
    'JD(S)': '#65A30D',
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
                      {region.region.replace(' India', '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
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
            
            {/* Party breakdown mini-bars - Top 5 parties */}
            {(() => {
              const parties = Object.entries(region.partyBreakdown);
              const partyCount = parties.length;
              const gridClass = partyCount === 5 ? 'grid-cols-5' :
                               partyCount === 4 ? 'grid-cols-4' :
                               partyCount === 3 ? 'grid-cols-3' :
                               partyCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

              return (
                <div className={`grid ${gridClass} gap-2 mt-2`}>
                  {parties.map(([party, spend]) => (
                    <div key={party} className="text-center">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 truncate" title={party}>
                        {party}
                      </div>
                      <div
                        className="h-2 rounded-full"
                        style={{ backgroundColor: partyColors[party] || '#64748B' }}
                      />
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {spend}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}
