"use client"

export default function TopAdvertisers({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
          Top Advertisers
        </h3>
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    )
  }

  const partyColors = {
    BJP: 'bg-orange-500',
    INC: 'bg-green-600',
    AAP: 'bg-blue-600',
    'Janata Dal (United)': 'bg-green-800',
    RJD: 'bg-green-500',
    'Jan Suraaj': 'bg-red-500',
    Others: 'bg-slate-500'
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
        Top Advertisers by Spend
      </h3>
      <div className="space-y-3">
        {data.map((advertiser, idx) => (
          <div 
            key={idx} 
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 dark:text-white truncate">
                  {advertiser.name || 'Unknown'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold text-white ${partyColors[advertiser.party] || partyColors.Others}`}>
                    {advertiser.party}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {advertiser.ad_count} ads
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <p className="font-bold text-slate-800 dark:text-white">
                {advertiser.spend}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {advertiser.percentage}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
