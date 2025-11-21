"use client"
import { useEffect, useState } from 'react'
import FiltersPanel from '../Dashboard/FiltersPanel'
import RegionalAnalytics from '../Dashboard/RegionalAnalytics'
import { format } from '../Dashboard/utils/date'

export default function Analytics() {
  const [filters, setFilters] = useState({ dateRange: [], state: 'All India', party: 'All Parties' })
  const [loading, setLoading] = useState(true)
  const [regionalData, setRegionalData] = useState([])

  const fetchAnalyticsData = () => {
    setLoading(true)

    // Build query params from filters
    const params = new URLSearchParams()
    if (filters.state && filters.state !== 'All India') {
      params.append('state', filters.state)
    }
    if (filters.party && filters.party !== 'All Parties') {
      params.append('party', filters.party)
    }
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.append('startDate', format(filters.dateRange[0], 'yyyy-MM-dd'))
      params.append('endDate', format(filters.dateRange[1], 'yyyy-MM-dd'))
    }

    // Fetch regional analytics
    fetch(`/api/analytics/regions?${params}`)
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`)
        }
        return r.json()
      })
      .then((regionalResponse) => {
        console.log('Regional analytics response:', regionalResponse)
        console.log('Number of regions:', regionalResponse.regions?.length || 0)
        setRegionalData(regionalResponse.regions || [])
      })
      .catch(error => {
        console.error('Error fetching analytics data:', error)
        setRegionalData([]) // Ensure empty array on error
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const onApplyFilters = () => {
    fetchAnalyticsData()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <FiltersPanel filters={filters} setFilters={setFilters} onApply={onApplyFilters} />
      <div className="lg:col-span-3">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-96 bg-slate-200 rounded" />
          </div>
        ) : (
          <RegionalAnalytics data={regionalData} />
        )}
      </div>
    </div>
  )
}
