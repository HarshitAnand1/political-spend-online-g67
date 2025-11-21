"use client"
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Header() {
  const { theme, setTheme } = useTheme()
  const [lastUpdated, setLastUpdated] = useState('Loading...')

  useEffect(() => {
    // Fetch last updated date from API
    fetch('/api/last-updated')
      .then(res => res.json())
      .then(data => {
        if (data.formatted) {
          setLastUpdated(data.formatted)
        }
      })
      .catch(err => {
        console.error('Error fetching last updated date:', err)
        setLastUpdated('N/A')
      })
  }, [])

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 dark:bg-slate-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Political Ad Tracker <span className="text-sm font-medium text-slate-500">India</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">Last Updated: <span className="font-semibold text-slate-600">{lastUpdated}</span></div>
            <button
              aria-label="Toggle theme"
              className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
