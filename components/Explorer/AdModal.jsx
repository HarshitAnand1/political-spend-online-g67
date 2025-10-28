"use client"
import { useEffect } from 'react'

export default function AdModal({ ad, onClose }) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  if (!ad) return null

  const partyColors = {
    BJP: '#FF9933',
    INC: '#138808',
    AAP: '#0073e6',
    Others: '#64748B'
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          style={{ borderTopColor: partyColors[ad.party] || partyColors.Others, borderTopWidth: '4px' }}
        >
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{ad.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className="inline-block px-3 py-1 rounded text-sm font-semibold text-white"
                style={{ backgroundColor: partyColors[ad.party] || partyColors.Others }}
              >
                {ad.party}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">{ad.sponsor}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Ad Snapshot */}
          {ad.snapshotUrl && (
            <div className="mb-6">
              <img 
                src={ad.snapshotUrl} 
                alt={ad.title}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white">
              <p className="text-xs opacity-80 mb-1">SPEND</p>
              <p className="text-lg font-bold">{ad.spend}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white">
              <p className="text-xs opacity-80 mb-1">IMPRESSIONS</p>
              <p className="text-lg font-bold">{ad.impressions}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white">
              <p className="text-xs opacity-80 mb-1">LOCATION</p>
              <p className="text-lg font-bold">{ad.state}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-lg text-white">
              <p className="text-xs opacity-80 mb-1">PLATFORM</p>
              <p className="text-lg font-bold">
                {ad.platforms ? JSON.parse(ad.platforms).join(', ') : 'N/A'}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">CAMPAIGN PERIOD</h3>
              <p className="text-slate-800 dark:text-white">
                {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'N/A'} - 
                {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Ongoing'}
              </p>
            </div>

            {ad.estimatedAudience && (
              <div>
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">ESTIMATED AUDIENCE</h3>
                <p className="text-slate-800 dark:text-white">{ad.estimatedAudience}</p>
              </div>
            )}

            {ad.currency && (
              <div>
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">CURRENCY</h3>
                <p className="text-slate-800 dark:text-white">{ad.currency}</p>
              </div>
            )}

            {ad.targetLocations && (
              <div>
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">TARGET LOCATIONS</h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    try {
                      const locs = typeof ad.targetLocations === 'string' 
                        ? JSON.parse(ad.targetLocations) 
                        : ad.targetLocations
                      return Array.isArray(locs) 
                        ? locs.slice(0, 10).map((loc, idx) => (
                            <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300">
                              {loc.name}
                            </span>
                          ))
                        : <span className="text-slate-500">N/A</span>
                    } catch (e) {
                      return <span className="text-slate-500">N/A</span>
                    }
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* View Original Button */}
          {ad.snapshotUrl && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <a
                href={ad.snapshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Original Ad
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
