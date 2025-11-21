"use client"
import { useEffect, useMemo, useState } from 'react'
import FiltersPanel from './FiltersPanel'
import KPICards from './KPICards'
import { SpendLineChart, SpendPieChart } from './Charts'
import SpendTable from './SpendTable'
import TopAdvertisers from './TopAdvertisers'
import GeographicBreakdown from './GeographicBreakdown'
import { addDays, format } from './utils/date'
import { getPartyName, getPartyColor } from '@/lib/partyUtils'

export default function Dashboard() {
  const [filters, setFilters] = useState({ dateRange: [], state: 'All India', party: 'All Parties' })
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalAds: 0, totalPages: 0, totalSpend: 0, partyBreakdown: {} })
  const [spendData, setSpendData] = useState({})
  const [lineSeries, setLineSeries] = useState({ labels: [], BJP: [], INC: [], AAP: [], 'Janata Dal (United)': [], RJD: [], 'Jan Suraaj': [], LJP: [], HAM: [], VIP: [], AIMIM: [], DMK: [], AITC: [], NCP: [], TDP: [], AIADMK: [], SP: [], BSP: [], 'Shiv Sena': [], BJD: [], YSRCP: [], BRS: [], 'CPI(M)': [], 'JD(S)': [], Others: [] })
  const [topAdvertisers, setTopAdvertisers] = useState([])
  const [geoData, setGeoData] = useState([])

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
      fetch(`/api/analytics/geography?${params}&limit=10`).then(r => r.json())
    ])
      .then(([statsData, spendResponse, trendsResponse, topAdsData, geoResponse]) => {
        setStats(statsData || { totalAds: 0, totalPages: 0, totalSpend: 0, partyBreakdown: {} })
        setSpendData(spendResponse.spendData || {})
        setLineSeries(trendsResponse.lineSeries || { labels: [], BJP: [], INC: [], AAP: [], Others: [] })
        setTopAdvertisers(topAdsData.advertisers || [])
        setGeoData(geoResponse.states || [])
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

    // Helper function to get value from breakdown or spendData
    const getValue = (partyCode) => {
      const breakdownValue = breakdown[partyCode]
      const value = typeof breakdownValue === 'object' ? breakdownValue.spend : breakdownValue
      return value || spendData[partyCode] || 0
    }

    // Get values for all parties + Others
    const lakhs = {
      BJP: getValue('BJP'),
      INC: getValue('INC'),
      AAP: getValue('AAP'),
      'Janata Dal (United)': getValue('Janata Dal (United)'),
      RJD: getValue('RJD'),
      'Jan Suraaj': getValue('Jan Suraaj'),
      LJP: getValue('LJP'),
      HAM: getValue('HAM'),
      VIP: getValue('VIP'),
      AIMIM: getValue('AIMIM'),
      DMK: getValue('DMK'),
      AITC: getValue('AITC'),
      NCP: getValue('NCP'),
      TDP: getValue('TDP'),
      AIADMK: getValue('AIADMK'),
      SP: getValue('SP'),
      BSP: getValue('BSP'),
      'Shiv Sena': getValue('Shiv Sena'),
      BJD: getValue('BJD'),
      YSRCP: getValue('YSRCP'),
      BRS: getValue('BRS'),
      'CPI(M)': getValue('CPI(M)'),
      'JD(S)': getValue('JD(S)'),
      Others: getValue('Others')
    }

    // Convert all from Lakhs to Crores
    return {
      BJP: parseFloat(((lakhs.BJP || 0) / 100).toFixed(2)),
      INC: parseFloat(((lakhs.INC || 0) / 100).toFixed(2)),
      AAP: parseFloat(((lakhs.AAP || 0) / 100).toFixed(2)),
      'Janata Dal (United)': parseFloat(((lakhs['Janata Dal (United)'] || 0) / 100).toFixed(2)),
      RJD: parseFloat(((lakhs.RJD || 0) / 100).toFixed(2)),
      'Jan Suraaj': parseFloat(((lakhs['Jan Suraaj'] || 0) / 100).toFixed(2)),
      LJP: parseFloat(((lakhs.LJP || 0) / 100).toFixed(2)),
      HAM: parseFloat(((lakhs.HAM || 0) / 100).toFixed(2)),
      VIP: parseFloat(((lakhs.VIP || 0) / 100).toFixed(2)),
      AIMIM: parseFloat(((lakhs.AIMIM || 0) / 100).toFixed(2)),
      DMK: parseFloat(((lakhs.DMK || 0) / 100).toFixed(2)),
      AITC: parseFloat(((lakhs.AITC || 0) / 100).toFixed(2)),
      NCP: parseFloat(((lakhs.NCP || 0) / 100).toFixed(2)),
      TDP: parseFloat(((lakhs.TDP || 0) / 100).toFixed(2)),
      AIADMK: parseFloat(((lakhs.AIADMK || 0) / 100).toFixed(2)),
      SP: parseFloat(((lakhs.SP || 0) / 100).toFixed(2)),
      BSP: parseFloat(((lakhs.BSP || 0) / 100).toFixed(2)),
      'Shiv Sena': parseFloat(((lakhs['Shiv Sena'] || 0) / 100).toFixed(2)),
      BJD: parseFloat(((lakhs.BJD || 0) / 100).toFixed(2)),
      YSRCP: parseFloat(((lakhs.YSRCP || 0) / 100).toFixed(2)),
      BRS: parseFloat(((lakhs.BRS || 0) / 100).toFixed(2)),
      'CPI(M)': parseFloat(((lakhs['CPI(M)'] || 0) / 100).toFixed(2)),
      'JD(S)': parseFloat(((lakhs['JD(S)'] || 0) / 100).toFixed(2)),
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
      'Janata Dal (United)': (lineSeries['Janata Dal (United)'] || []).map(v => parseFloat((v / 100).toFixed(2))),
      RJD: (lineSeries.RJD || []).map(v => parseFloat((v / 100).toFixed(2))),
      'Jan Suraaj': (lineSeries['Jan Suraaj'] || []).map(v => parseFloat((v / 100).toFixed(2))),
      LJP: (lineSeries.LJP || []).map(v => parseFloat((v / 100).toFixed(2))),
      HAM: (lineSeries.HAM || []).map(v => parseFloat((v / 100).toFixed(2))),
      VIP: (lineSeries.VIP || []).map(v => parseFloat((v / 100).toFixed(2))),
      AIMIM: (lineSeries.AIMIM || []).map(v => parseFloat((v / 100).toFixed(2))),
      DMK: (lineSeries.DMK || []).map(v => parseFloat((v / 100).toFixed(2))),
      AITC: (lineSeries.AITC || []).map(v => parseFloat((v / 100).toFixed(2))),
      NCP: (lineSeries.NCP || []).map(v => parseFloat((v / 100).toFixed(2))),
      TDP: (lineSeries.TDP || []).map(v => parseFloat((v / 100).toFixed(2))),
      AIADMK: (lineSeries.AIADMK || []).map(v => parseFloat((v / 100).toFixed(2))),
      SP: (lineSeries.SP || []).map(v => parseFloat((v / 100).toFixed(2))),
      BSP: (lineSeries.BSP || []).map(v => parseFloat((v / 100).toFixed(2))),
      'Shiv Sena': (lineSeries['Shiv Sena'] || []).map(v => parseFloat((v / 100).toFixed(2))),
      BJD: (lineSeries.BJD || []).map(v => parseFloat((v / 100).toFixed(2))),
      YSRCP: (lineSeries.YSRCP || []).map(v => parseFloat((v / 100).toFixed(2))),
      BRS: (lineSeries.BRS || []).map(v => parseFloat((v / 100).toFixed(2))),
      'CPI(M)': (lineSeries['CPI(M)'] || []).map(v => parseFloat((v / 100).toFixed(2))),
      'JD(S)': (lineSeries['JD(S)'] || []).map(v => parseFloat((v / 100).toFixed(2))),
      Others: (lineSeries.Others || []).map(v => parseFloat((v / 100).toFixed(2)))
    }
  }, [lineSeries])

  const tableRows = useMemo(() => {
    const totalSum = Object.values(totals).reduce((a, b) => a + b, 0) || 1

    return Object.entries(totals)
      .filter(([, value]) => value > 0) // Only show parties with spending
      .sort((a, b) => b[1] - a[1])
      .map(([partyCode, value]) => {
        const color = getPartyColor(partyCode)
        const initial = partyCode.charAt(0).toUpperCase()

        // Get unofficial spend from partyBreakdown (convert from Lakhs to Crores)
        const unofficialSpendLakhs = stats.partyBreakdown[partyCode]?.unofficialSpend || 0
        const unofficialSpendCrores = parseFloat((unofficialSpendLakhs / 100).toFixed(2))

        return {
          name: getPartyName(partyCode),
          logo: `https://placehold.co/24x24/${color.substring(1)}/FFFFFF?text=${initial}`,
          value: value.toFixed(2),
          unofficialSpend: unofficialSpendCrores,
          percent: ((value / totalSum) * 100).toFixed(1),
        }
      })
  }, [totals, stats.partyBreakdown])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <FiltersPanel filters={filters} setFilters={setFilters} onApply={onApplyFilters} />
      <div className="lg:col-span-3">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            <KPICards stats={stats} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <h3 className="font-bold text-slate-800 dark:text-white">Spend Over Time</h3>
                </div>
                <div className="h-80 rounded-md">
                  <SpendLineChart labels={line.labels} series={line} />
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <h3 className="font-bold text-slate-800 dark:text-white">Party-wise Spend Distribution</h3>
                </div>
                <div className="h-80 rounded-md">
                  <SpendPieChart totals={totals} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TopAdvertisers data={topAdvertisers} />
              <GeographicBreakdown data={geoData} />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="font-bold text-slate-800 dark:text-white">Top Spenders by Party</h3>
              </div>
              <SpendTable rows={tableRows} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
