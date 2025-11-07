"use client"
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/themes/airbnb.css'
import { INDIAN_STATES } from '@/lib/geoUtils'
import { getAllPersons } from '@/lib/personUtils'

// All Indian states and UTs organized by region
const ALL_STATES = Object.keys(INDIAN_STATES).sort();

export default function PersonFiltersPanel({ filters, setFilters, onApply }) {
  const allPersons = getAllPersons();

  return (
    <aside className="lg:col-span-1 bg-white p-4 rounded-lg border border-slate-200 self-start dark:bg-slate-900">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        Filters
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Date Range</label>
          <Flatpickr
            className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white dark:bg-slate-900"
            options={{ mode: 'range', dateFormat: 'd M, Y' }}
            value={filters.dateRange}
            onChange={(dates) => setFilters((f) => ({ ...f, dateRange: dates }))}
            placeholder="Select a date range"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">State / UT</label>
          <select
            className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white dark:bg-slate-900"
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
          <label className="block text-sm font-medium text-slate-600 mb-1">Person / Candidate</label>
          <select
            className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white dark:bg-slate-900"
            value={filters.person}
            onChange={(e) => setFilters((f) => ({ ...f, person: e.target.value }))}
          >
            <option>All Persons</option>
            {allPersons.map(person => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>
        </div>
        <button
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 transition"
          onClick={onApply}
        >
          Apply Filters
        </button>
      </div>
    </aside>
  )
}
