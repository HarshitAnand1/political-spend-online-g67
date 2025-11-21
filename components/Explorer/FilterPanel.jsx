"use client"
import { useState } from 'react'

const PARTIES = [
  'BJP', 'INC', 'AAP', 'DMK', 'AITC', 'NCP', 'TDP', 'AIADMK',
  'Janata Dal (United)', 'RJD', 'Jan Suraaj', 'LJP', 'HAM', 'VIP', 'AIMIM',
  'SP', 'BSP', 'Shiv Sena', 'BJD', 'YSRCP', 'BRS', 'CPI(M)', 'JD(S)'
]

const STATES = [
  'Uttar Pradesh', 'Maharashtra', 'West Bengal', 'Bihar India', 'Tamil Nadu India',
  'Delhi India', 'Karnataka India', 'Gujarat India', 'Rajasthan India', 'Kerala India',
  'Madhya Pradesh India', 'Telangana India', 'Andhra Pradesh India', 'Odisha India',
  'Haryana India', 'Punjab India', 'Jharkhand India', 'Assam India', 'Chhattisgarh India'
]

export default function FilterPanel({ filters, setFilters }) {
  const [showAllParties, setShowAllParties] = useState(false)
  const [showAllStates, setShowAllStates] = useState(false)

  const displayedParties = showAllParties ? PARTIES : PARTIES.slice(0, 6)
  const displayedStates = showAllStates ? STATES : STATES.slice(0, 6)

  return (
    <aside className="lg:col-span-1 bg-white p-4 rounded-lg border border-slate-200 self-start dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Refine Results</h3>
        {(filters.datePreset || filters.parties.length > 0 || filters.states.length > 0) && (
          <button
            onClick={() => setFilters({ datePreset: '', parties: [], states: [] })}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear All
          </button>
        )}
      </div>
      <div className="space-y-5">
        <div>
          <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">Date Range</h4>
          <div className="space-y-1">
            {['Last 24 hours', 'Last 7 days', 'Last 30 days'].map((label) => (
              <label className="flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" key={label}>
                <input
                  type="radio"
                  name="date"
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                  checked={filters.datePreset === label}
                  onChange={() => setFilters((f) => ({ ...f, datePreset: label }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">Political Party</h4>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {displayedParties.map((p) => (
              <label className="flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" key={p}>
                <input
                  type="checkbox"
                  className="mr-2 rounded text-blue-600 focus:ring-blue-500"
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
            <button
              onClick={() => setShowAllParties(!showAllParties)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
            >
              {showAllParties ? 'Show Less' : `Show All (${PARTIES.length})`}
            </button>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">State / UT</h4>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {displayedStates.map((s) => (
              <label className="flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" key={s}>
                <input
                  type="checkbox"
                  className="mr-2 rounded text-blue-600 focus:ring-blue-500"
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
                {s.replace(' India', '')}
              </label>
            ))}
            <button
              onClick={() => setShowAllStates(!showAllStates)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
            >
              {showAllStates ? 'Show Less' : `Show All (${STATES.length})`}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
