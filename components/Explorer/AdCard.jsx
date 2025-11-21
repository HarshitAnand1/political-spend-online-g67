'use client'

export default function AdCard({ ad }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden dark:bg-slate-900 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all">
      {/* Header with party badge */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800" style={{ borderLeftWidth: '4px', borderLeftColor: ad.partyColor }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: ad.partyColor }}>
                {ad.party[0]}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: ad.partyColor + '20', color: ad.partyColor }}>
                {ad.party}
              </span>
              {ad.isNational && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  National
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate mt-2">
              {ad.sponsor}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Advertiser</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Spend - highlighted */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-3 rounded-lg border border-blue-100 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Spend</span>
            <span className="text-base font-bold text-blue-700 dark:text-blue-400">{ad.spend}</span>
          </div>
        </div>

        {/* Other info */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Target Region</span>
            <span className="font-semibold text-slate-800 dark:text-white">
              {ad.isNational ? `${ad.stateCount} states` : ad.region}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Locations</span>
            <span className="font-medium text-slate-800 dark:text-white text-right">
              {ad.locationSummary || ad.state}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Impressions</span>
            <span className="font-medium text-slate-800 dark:text-white">{ad.impressions}</span>
          </div>
        </div>

        {/* View Ad Button */}
        {ad.snapshotUrl && (
          <a
            href={ad.snapshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Original Ad
          </a>
        )}
      </div>
    </div>
  )
}
