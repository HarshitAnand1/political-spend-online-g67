"use client"
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export default function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 dark:bg-slate-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="m8 15 4 4 4-4"/><path d="M12 3v16"/><path d="M5 3h14"/><path d="M18 3a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2Z"/></svg>
            <h1 className="text-xl font-bold ml-2">Political Ad Tracker <span className="text-sm font-medium text-slate-500">India</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">Last Updated: <span className="font-semibold text-slate-600">7 Sep 2025, 2:30 PM</span></div>
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
