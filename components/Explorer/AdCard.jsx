'use client'
import { useState } from 'react'

export default function AdCard({ ad }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden dark:bg-slate-900 hover:shadow-lg transition-shadow">
      <div className="h-40 bg-slate-200 flex items-center justify-center relative overflow-hidden">
        {!imageError && ad.img ? (
          <img
            src={ad.img}
            alt={`${ad.party} Ad`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <svg className="w-12 h-12 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-slate-500 dark:text-slate-400">{ad.party} Advertisement</p>
            {ad.snapshotUrl && (
              <a
                href={ad.snapshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 underline"
                onClick={(e) => e.stopPropagation()}
              >
                View Ad
              </a>
            )}
          </div>
        )}
        {ad.isNational && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">
            National
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">Sponsored by</p>
        <p className="font-semibold flex items-center mt-1 text-slate-800 dark:text-white">
          <span className="w-6 h-6 rounded-full mr-2 inline-flex items-center justify-center text-white text-xs" style={{ backgroundColor: ad.partyColor }}>
            {ad.party[0]}
          </span>
          <span className="truncate">{ad.sponsor}</span>
        </p>
        <div className="text-xs mt-2 space-y-1">
          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 rounded">
            <span className="font-medium text-slate-600 dark:text-slate-400">Spend:</span>
            <span className="font-bold text-slate-800 dark:text-white">{ad.spend}</span>
          </div>
          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 rounded">
            <span className="font-medium text-slate-600 dark:text-slate-400">Region:</span>
            <span className="font-semibold text-slate-800 dark:text-white">
              {ad.isNational ? `${ad.stateCount} states` : ad.region}
            </span>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
            <span className="font-medium text-slate-600 dark:text-slate-400">Location:</span>
            <span className="ml-1 text-slate-800 dark:text-white">{ad.locationSummary || ad.state}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
