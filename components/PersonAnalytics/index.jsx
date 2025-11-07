"use client"
import { useEffect, useState, useMemo } from 'react'
import PersonFiltersPanel from './PersonFiltersPanel'
import { getPersonDetails, getPersonColor, getAllPersons } from '@/lib/personUtils'
import { format } from '../Dashboard/utils/date'

export default function PersonAnalytics() {
  const [filters, setFilters] = useState({ dateRange: [], state: 'All India', person: 'All Persons' })
  const [loading, setLoading] = useState(true)
  const [personStats, setPersonStats] = useState({})

  const fetchPersonData = () => {
    setLoading(true)

    // Build query params from filters
    const params = new URLSearchParams()
    if (filters.state && filters.state !== 'All India') {
      params.append('state', filters.state)
    }
    if (filters.person && filters.person !== 'All Persons') {
      params.append('person', filters.person)
    }
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.append('startDate', format(filters.dateRange[0], 'yyyy-MM-dd'))
      params.append('endDate', format(filters.dateRange[1], 'yyyy-MM-dd'))
    }

    fetch(`/api/analytics/person-spend?${params}`)
      .then(r => r.json())
      .then(data => {
        setPersonStats(data.personStats || {})
      })
      .catch(error => {
        console.error('Error fetching person analytics:', error)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPersonData()
  }, [])

  const onApplyFilters = () => {
    fetchPersonData()
  }

  // Prepare data for cards
  const personCards = useMemo(() => {
    const allPersons = getAllPersons()

    return allPersons.map(personName => {
      const stats = personStats[personName] || { count: 0, spend: 0, impressions: 0 }
      const details = getPersonDetails(personName)
      const color = getPersonColor(personName)

      return {
        name: personName,
        details,
        stats,
        color
      }
    }).filter(p => p.stats.count > 0) // Only show persons with ads
      .sort((a, b) => b.stats.spend - a.stats.spend) // Sort by spend descending
  }, [personStats])

  // Calculate Others stats
  const othersStats = personStats['Others'] || { count: 0, spend: 0, impressions: 0 }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <PersonFiltersPanel filters={filters} setFilters={setFilters} onApply={onApplyFilters} />
      <div className="lg:col-span-3">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 rounded" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                Person Analytics
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Track advertising expenditure for individual candidates
              </p>
            </div>

            {/* Person Cards */}
            {personCards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {personCards.map((person, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 p-6 rounded-lg border-2 hover:shadow-lg transition-all duration-200"
                    style={{ borderColor: person.color }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                          {person.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {person.details.constituency}
                        </p>
                      </div>
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: person.color }}
                      >
                        {idx + 1}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Party</span>
                        <span
                          className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                          style={{ backgroundColor: person.color }}
                        >
                          {person.details.party}
                        </span>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Total Spend
                          </span>
                          <span className="text-xl font-bold text-slate-800 dark:text-white">
                            ₹{person.stats.spend.toFixed(2)} L
                          </span>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Total Ads
                          </span>
                          <span className="text-lg font-semibold text-slate-800 dark:text-white">
                            {person.stats.count}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Impressions
                          </span>
                          <span className="text-lg font-semibold text-slate-800 dark:text-white">
                            {(person.stats.impressions / 1000).toFixed(1)}K
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                  No data available for the selected filters
                </p>
              </div>
            )}

            {/* Others Section */}
            {othersStats.count > 0 && (
              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                  Others (Unclassified)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Ads</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {othersStats.count}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Spend</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      ₹{othersStats.spend.toFixed(2)} L
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Impressions</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {(othersStats.impressions / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
