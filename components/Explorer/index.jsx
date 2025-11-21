"use client"
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import FilterPanel from './FilterPanel'
import AdCard from './AdCard'
import AdModal from './AdModal'

export default function Explorer() {
  const search = useSearchParams()
  const router = useRouter()
  const [filters, setFilters] = useState({
    parties: (search.get('parties') || '').split(',').filter(Boolean),
    states: (search.get('states') || '').split(',').filter(Boolean),
  })
  const [loading, setLoading] = useState(true)
  const [ads, setAds] = useState([])
  const [sortBy, setSortBy] = useState(search.get('sort') || 'spend')
  const [selectedAd, setSelectedAd] = useState(null)

  const fetchAds = () => {
    setLoading(true)

    // Build query params
    const params = new URLSearchParams()
    if (filters.parties.length > 0) params.append('parties', filters.parties.join(','))
    if (filters.states.length > 0) params.append('states', filters.states.join(','))
    params.append('sortBy', sortBy)
    params.append('limit', '500')

    fetch(`/api/ads?${params}`)
      .then((r) => r.json())
      .then((json) => setAds(json.ads || []))
      .catch(err => console.error('Error fetching ads:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAds()
  }, [filters, sortBy])

  // Ads already filtered by API, just use them directly
  const filtered = ads

  // Sync filters to URL
  useEffect(() => {
    const url = new URL(window.location.href)
    if (filters.parties.length) url.searchParams.set('parties', filters.parties.join(',')); else url.searchParams.delete('parties')
    if (filters.states.length) url.searchParams.set('states', filters.states.join(',')); else url.searchParams.delete('states')
    if (sortBy) url.searchParams.set('sort', sortBy)
    router.replace(url.pathname + url.search)
  }, [filters, sortBy, router])

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <FilterPanel filters={filters} setFilters={setFilters} />
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-600">Showing <span className="font-semibold">{filtered.length}</span> ads</p>
            <div>
              <label className="text-sm mr-2">Sort by:</label>
              <select className="border border-slate-300 rounded px-2 py-1 text-sm dark:bg-slate-900" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date">Most Recent</option>
                <option value="spend">Highest Spend</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-slate-200 h-64 rounded" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((ad) => (
                  <motion.div key={ad.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                    <div onClick={() => setSelectedAd(ad)} className="cursor-pointer">
                      <AdCard ad={ad} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      
      {/* Ad Preview Modal */}
      {selectedAd && <AdModal ad={selectedAd} onClose={() => setSelectedAd(null)} />}
    </div>
  )
}
