"use client"
import { useMemo, useState } from 'react'
import classNames from 'classnames'

export default function Tabs({ tabs, initial = 0, onChange, activeIndex }) {
  const isControlled = useMemo(() => typeof activeIndex === 'number', [activeIndex])
  const [internal, setInternal] = useState(initial)
  const active = isControlled ? activeIndex : internal

  const handleClick = (i) => {
    if (!isControlled) setInternal(i)
    onChange?.(i)
  }

  return (
    <div className="bg-white border-b border-slate-200 sticky top-16 z-20 dark:bg-slate-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-6 -mb-px">
          {tabs.map((t, i) => (
            <button
              key={t}
              className={classNames(
                'tab-button py-3 px-1 border-b-2 border-transparent text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300',
                { 'text-blue-600 border-blue-600 font-semibold': i === active }
              )}
              onClick={() => handleClick(i)}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
