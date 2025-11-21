export default function KPICards({ stats = {} }) {
  // Calculate Cost Per Impression (CPI) in paise
  const totalSpendCrores = (stats.totalSpend || 0) / 100; // Convert Lakhs to Crores
  const totalSpendRupees = totalSpendCrores * 10000000; // Convert Crores to Rupees for CPI calculation
  const cpi = stats.totalImpressions > 0 ? (totalSpendRupees / stats.totalImpressions).toFixed(2) : 0;

  return (
    <div className="mb-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold opacity-90">TOTAL ADS</h4>
            <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold mt-1">{stats.totalAds?.toLocaleString() || '0'}</p>
          <p className="text-xs opacity-80 mt-2">Across all parties</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold opacity-90">TOTAL PAGES</h4>
            <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold mt-1">{stats.totalPages?.toLocaleString() || '0'}</p>
          <p className="text-xs opacity-80 mt-2">Unique advertisers</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold opacity-90">TOTAL SPEND</h4>
            <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold mt-1">₹{totalSpendCrores.toFixed(2)} Cr</p>
          <p className="text-xs opacity-80 mt-2">Political advertising</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-5 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold opacity-90">TOTAL REACH</h4>
            <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="text-3xl font-bold mt-1">{((stats.totalImpressions || 0) / 1000000).toFixed(1)}M</p>
          <p className="text-xs opacity-80 mt-2">Cost/1K: ₹{cpi}</p>
        </div>
      </div>
    </div>
  )
}
