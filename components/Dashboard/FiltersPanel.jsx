"use client"
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/themes/airbnb.css'
import { INDIAN_STATES } from '@/lib/geoUtils'

// All Indian states and UTs organized by region
const ALL_STATES = Object.keys(INDIAN_STATES).sort();

// All parties
const PARTIES = [
  'BJP', 'INC', 'AAP', 'DMK', 'AITC', 'NCP', 'TDP', 'AIADMK',
  'Janata Dal (United)', 'RJD', 'Jan Suraaj', 'LJP', 'HAM', 'VIP', 'AIMIM',
  'SP', 'BSP', 'Shiv Sena', 'BJD', 'YSRCP', 'BRS', 'CPI(M)', 'JD(S)'
];

export default function FiltersPanel({ filters, setFilters, onApply }) {
  return (
    <aside className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 self-start dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-600"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Filters
        </h3>
        {(filters.dateRange?.length > 0 || filters.state !== 'All India' || filters.party !== 'All Parties') && (
          <button
            onClick={() => setFilters({ dateRange: [], state: 'All India', party: 'All Parties' })}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Date Range
          </label>
          <Flatpickr
            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            options={{
              mode: 'range',
              dateFormat: 'd M, Y',
              maxDate: 'today'
            }}
            value={filters.dateRange}
            onChange={(dates) => setFilters((f) => ({ ...f, dateRange: dates }))}
            placeholder="Select date range"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Leave empty for all-time data
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            State / UT
          </label>
          <select
            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer"
            value={filters.state}
            onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
          >
            <option>All India</option>
            {ALL_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Political Party
          </label>
          <select
            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer"
            value={filters.party}
            onChange={(e) => setFilters((f) => ({ ...f, party: e.target.value }))}
          >
            <option>All Parties</option>
            {PARTIES.map(party => (
              <option key={party} value={party}>{party}</option>
            ))}
          </select>
        </div>
        <button
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          onClick={onApply}
        >
          Apply Filters
        </button>
      </div>
    </aside>
  )
}
