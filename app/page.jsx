"use client"
import { useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import Header from '@/components/Header'
import Tabs from '@/components/Tabs'
import Dashboard from '@/components/Dashboard'
import Explorer from '@/components/Explorer'
import Analytics from '@/components/Analytics'

export default function Home() {
  const search = useSearchParams()
  const router = useRouter()
  const tabParam = search.get('tab')
  const active = useMemo(() => {
    if (tabParam === 'explorer') return 1
    if (tabParam === 'analytics') return 2
    return 0
  }, [tabParam])

  const setActive = (i) => {
    const t = i === 1 ? 'explorer' : i === 2 ? 'analytics' : 'dashboard'
    const url = new URL(window.location.href)
    url.searchParams.set('tab', t)
    router.replace(url.pathname + url.search)
  }
  return (
    <div className="min-h-screen">
      <Header />
      <Tabs tabs={["Dashboard View", "Explorer View", "Regional Analytics"]} initial={0} onChange={setActive} activeIndex={active} />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {active === 0 ? (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <Dashboard />
            </motion.div>
          ) : active === 1 ? (
            <motion.div key="explorer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <Explorer />
            </motion.div>
          ) : (
            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <Analytics />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
