"use client"
import { useEffect, useMemo, useState } from 'react'
import FiltersPanel from './FiltersPanel'
import KPICards from './KPICards'
import { SpendLineChart, SpendPieChart } from './Charts'
import SpendTable from './SpendTable'
import { addDays, format } from './utils/date'

export default function Dashboard() {
  const [filters, setFilters] = useState({ dateRange: [], state: 'All India', party: 'All Parties' })
  const [loading, setLoading] = useState(true)
  const [ads, setAds] = useState([])
  const [baseLine, setBaseLine] = useState(null)
  const [stats, setStats] = useState({ totalAds: 0, totalPages: 0, totalSpend: 0 })

  useEffect(() => {
    let mounted = true
    setLoading(true)
    
    // Fetch dashboard data
    Promise.all([
      fetch('/api/mock-data').then(r => r.json()),
      fetch('/api/stats').then(r => r.json())
    ])
      .then(([mockData, statsData]) => {
        if (mounted) {
          setAds(mockData.ads || [])
          setBaseLine(mockData.lineSeries || null)
          setStats(statsData || { totalAds: 0, totalPages: 0, totalSpend: 0 })
        }
      })
      .catch(error => {
        console.error('Error fetching dashboard data:', error)
      })
      .finally(() => mounted && setLoading(false))
    
    return () => { mounted = false }
  }, [])

  // Apply dashboard filters over ads
  const filteredAds = useMemo(() => {
    if (!ads.length) return []
    let out = ads
    // dateRange: [startDate, endDate]
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [start, end] = filters.dateRange
      const startMs = new Date(start).getTime()
      const endMs = new Date(end).getTime() + 24 * 3600 * 1000 // include end day
      out = out.filter((a) => {
        const t = new Date(a.createdAt).getTime()
        return t >= startMs && t < endMs
      })
    }
    if (filters.state && filters.state !== 'All India') {
      out = out.filter((a) => a.state === filters.state)
    }
    if (filters.party && filters.party !== 'All Parties') {
      out = out.filter((a) => a.party === filters.party)
    }
    return out
  }, [ads, filters])

  // Compute totals for KPI and pie
  const totals = useMemo(() => {
    const byParty = { BJP: 0, INC: 0, AAP: 0, Others: 0 }
    for (const a of filteredAds) {
      if (a.party in byParty) byParty[a.party] += a.spendValue ?? 0
      else byParty.Others += a.spendValue ?? 0
    }
    // Convert lakhs to crores for display (~ 100 lakhs = 1 crore). Our spendValue is in lakhs; we keep crores 2 decimals.
    const toCr = (lakhs) => Number((lakhs / 100).toFixed(2))
    return {
      BJP: toCr(byParty.BJP),
      INC: toCr(byParty.INC),
      AAP: toCr(byParty.AAP),
      Others: toCr(byParty.Others),
    }
  }, [filteredAds])

  // Line chart: keep original baseline series for visual consistency; apply party filter to show/hide series
  const line = useMemo(() => {
    if (!baseLine) return { labels: [], BJP: undefined, INC: undefined, AAP: undefined }
    const selected = filters.party === 'All Parties' ? ['BJP', 'INC', 'AAP'] : [filters.party]
    return {
      labels: baseLine.labels,
      BJP: selected.includes('BJP') ? baseLine.BJP : undefined,
      INC: selected.includes('INC') ? baseLine.INC : undefined,
      AAP: selected.includes('AAP') ? baseLine.AAP : undefined,
    }
  }, [baseLine, filters.party])

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
      <FiltersPanel filters={filters} setFilters={setFilters} onApply={() => { /* simulate filter apply */ }} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900">
                <h3 className="font-semibold mb-2">Spend Over Time</h3>
                <div className="h-64 rounded-md">
                  <SpendLineChart labels={line.labels} series={line} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900">
                <h3 className="font-semibold mb-2">Party-wise Spend Distribution</h3>
                <div className="h-64 rounded-md">
                  <SpendPieChart data={totals} />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900">
              <h3 className="font-semibold mb-2">Top Spenders</h3>
              <SpendTable rows={tableRows} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900">
                <h3 className="font-semibold mb-4">Party-wise Spend Share</h3>
                <SpendPieChart totals={totals} />
              </div>
            </div>
            <SpendTable rows={tableRows} />
          </>
        )}
      </div>
    </div>
  )
}
