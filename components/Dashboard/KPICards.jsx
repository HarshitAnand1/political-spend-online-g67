export default function KPICards({ stats = {} }) {
  // Calculate Cost Per Impression (CPI) in paise
  const totalSpendCrores = (stats.totalSpend || 0) / 100; // Convert Lakhs to Crores
  const totalSpendRupees = totalSpendCrores * 10000000; // Convert Crores to Rupees for CPI calculation
  const cpi = stats.totalImpressions > 0 ? (totalSpendRupees / stats.totalImpressions).toFixed(2) : 0;

  return (
    <div className="mb-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white shadow-lg">
          <h4 className="text-sm font-medium opacity-80">TOTAL ADS</h4>
          <p className="text-3xl font-bold mt-1">{stats.totalAds?.toLocaleString() || '0'}</p>
          <p className="text-xs opacity-70 mt-1">Across all parties</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white shadow-lg">
          <h4 className="text-sm font-medium opacity-80">TOTAL PAGES</h4>
          <p className="text-3xl font-bold mt-1">{stats.totalPages?.toLocaleString() || '0'}</p>
          <p className="text-xs opacity-70 mt-1">Unique advertisers</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-lg text-white shadow-lg">
          <h4 className="text-sm font-medium opacity-80">TOTAL SPEND</h4>
          <p className="text-3xl font-bold mt-1">₹{totalSpendCrores.toFixed(2)} Cr</p>
          <p className="text-xs opacity-70 mt-1">Political advertising</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-4 rounded-lg text-white shadow-lg">
          <h4 className="text-sm font-medium opacity-80">TOTAL REACH</h4>
          <p className="text-3xl font-bold mt-1">{((stats.totalImpressions || 0) / 1000000).toFixed(1)}M</p>
          <p className="text-xs opacity-70 mt-1">Cost/1K: ₹{cpi}</p>
        </div>
      </div>
    </div>
  )
}
