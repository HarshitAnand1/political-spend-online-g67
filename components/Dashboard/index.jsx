"use client"
import { useEffect, useMemo, useState } from 'react'
import FiltersPanel from './FiltersPanel'
import KPICards from './KPICards'
import { SpendLineChart, SpendPieChart } from './Charts'
import SpendTable from './SpendTable'
import TopAdvertisers from './TopAdvertisers'
import GeographicBreakdown from './GeographicBreakdown'
import RegionalAnalytics from './RegionalAnalytics'
import { addDays, format } from './utils/date'

export default function Dashboard() {
  const [filters, setFilters] = useState({ dateRange: [], state: 'All India', party: 'All Parties' })
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalAds: 0, totalPages: 0, totalSpend: 0, partyBreakdown: {} })
  const [spendData, setSpendData] = useState({})
  const [lineSeries, setLineSeries] = useState({ labels: [], BJP: [], INC: [], AAP: [], Others: [] })
  const [topAdvertisers, setTopAdvertisers] = useState([])
  const [geoData, setGeoData] = useState([])
  const [regionalData, setRegionalData] = useState([])

  const fetchDashboardData = () => {
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
    
    // Fetch all dashboard APIs with filters
    Promise.all([
      fetch(`/api/stats?${params}`).then(r => r.json()),
      fetch(`/api/analytics/spend?${params}`).then(r => r.json()),
      fetch(`/api/analytics/trends?${params}`).then(r => r.json()),
      fetch(`/api/analytics/top-advertisers?${params}&limit=10`).then(r => r.json()),
      fetch(`/api/analytics/geography?${params}&limit=10`).then(r => r.json()),
      fetch(`/api/analytics/regions?${params}`).then(r => r.json())
    ])
      .then(([statsData, spendResponse, trendsResponse, topAdsData, geoResponse, regionalResponse]) => {
        setStats(statsData || { totalAds: 0, totalPages: 0, totalSpend: 0, partyBreakdown: {} })
        setSpendData(spendResponse.spendData || {})
        setLineSeries(trendsResponse.lineSeries || { labels: [], BJP: [], INC: [], AAP: [], Others: [] })
        setTopAdvertisers(topAdsData.advertisers || [])
        setGeoData(geoResponse.states || [])
        setRegionalData(regionalResponse.regions || [])
      })
      .catch(error => {
        console.error('Error fetching dashboard data:', error)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const onApplyFilters = () => {
    fetchDashboardData()
  }

  // Compute totals for KPI and pie from party breakdown (convert Lakhs to Crores)
  const totals = useMemo(() => {
    const breakdown = stats.partyBreakdown || {}
    // Check if breakdown has new format with nested objects or old format with direct values
    const bjpValue = typeof breakdown.BJP === 'object' ? breakdown.BJP.spend : breakdown.BJP
    const incValue = typeof breakdown.INC === 'object' ? breakdown.INC.spend : breakdown.INC
    const aapValue = typeof breakdown.AAP === 'object' ? breakdown.AAP.spend : breakdown.AAP
    const othersValue = typeof breakdown.Others === 'object' ? breakdown.Others.spend : breakdown.Others
    
    // Fallback to spendData if breakdown not available
    const lakhs = {
      BJP: bjpValue || spendData.BJP || 0,
      INC: incValue || spendData.INC || 0,
      AAP: aapValue || spendData.AAP || 0,
      Others: othersValue || spendData.Others || 0
    }
    
    return {
      BJP: parseFloat(((lakhs.BJP || 0) / 100).toFixed(2)),
      INC: parseFloat(((lakhs.INC || 0) / 100).toFixed(2)),
      AAP: parseFloat(((lakhs.AAP || 0) / 100).toFixed(2)),
      Others: parseFloat(((lakhs.Others || 0) / 100).toFixed(2))
    }
  }, [stats, spendData])

  // Line chart data (convert Lakhs to Crores)
  const line = useMemo(() => {
    return {
      labels: lineSeries.labels || [],
      BJP: (lineSeries.BJP || []).map(v => parseFloat((v / 100).toFixed(2))),
      INC: (lineSeries.INC || []).map(v => parseFloat((v / 100).toFixed(2))),
      AAP: (lineSeries.AAP || []).map(v => parseFloat((v / 100).toFixed(2))),
      Others: (lineSeries.Others || []).map(v => parseFloat((v / 100).toFixed(2)))
    }
  }, [lineSeries])

  const tableRows = useMemo(() => {
    const totalSum = Object.values(totals).reduce((a, b) => a + b, 0) || 1
    const logos = {
      BJP: 'https://placehold.co/24x24/FF9933/FFFFFF?text=B',
      INC: 'https://placehold.co/24x24/138808/FFFFFF?text=I',
      AAP: 'https://placehold.co/24x24/0073e6/FFFFFF?text=A',
      Others: 'https://placehold.co/24x24/64748B/FFFFFF?text=O',
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name: name === 'INC' ? 'Indian National Congress' : name === 'BJP' ? 'Bharatiya Janata Party' : name === 'AAP' ? 'Aam Aadmi Party' : 'Others',
        logo: logos[name],
        value: value.toFixed(2),
        percent: ((value / totalSum) * 100).toFixed(1),
      }))
  }, [totals])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <FiltersPanel filters={filters} setFilters={setFilters} onApply={onApplyFilters} />
      <div className="lg:col-span-3">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 rounded" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 rounded" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-slate-200 rounded" />
              <div className="h-64 bg-slate-200 rounded" />
            </div>
            <div className="h-64 bg-slate-200 rounded" />
          </div>
        ) : (
          <>
            <KPICards totals={totals} stats={stats} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900 shadow-sm">
                <h3 className="font-semibold mb-2 text-slate-800 dark:text-white">Spend Over Time</h3>
                <div className="h-64 rounded-md">
                  <SpendLineChart labels={line.labels} series={line} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900 shadow-sm">
                <h3 className="font-semibold mb-2 text-slate-800 dark:text-white">Party-wise Spend Distribution</h3>
                <div className="h-64 rounded-md">
                  <SpendPieChart totals={totals} />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TopAdvertisers data={topAdvertisers} />
              <GeographicBreakdown data={geoData} />
            </div>
            
            <div className="mb-6">
              <RegionalAnalytics data={regionalData} />
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900 shadow-sm">
              <h3 className="font-semibold mb-2 text-slate-800 dark:text-white">Top Spenders by Party</h3>
              <SpendTable rows={tableRows} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
