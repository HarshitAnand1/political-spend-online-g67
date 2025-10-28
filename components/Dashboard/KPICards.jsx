export default function KPICards({ totals = { BJP: 28.5, INC: 15.2, AAP: 4.8, Others: 4.3 }, stats = {} }) {
  // Calculate Cost Per Impression (CPI) in paise
  const totalSpendRupees = (stats.totalSpend || 0) * 100000; // Convert Lakhs to Rupees
  const cpi = stats.totalImpressions > 0 ? (totalSpendRupees / stats.totalImpressions).toFixed(2) : 0;
  
  return (
    <div className="mb-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
          <p className="text-3xl font-bold mt-1">₹{stats.totalSpend?.toFixed(2) || '0'} L</p>
          <p className="text-xs opacity-70 mt-1">Political advertising</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-4 rounded-lg text-white shadow-lg">
          <h4 className="text-sm font-medium opacity-80">TOTAL REACH</h4>
          <p className="text-3xl font-bold mt-1">{((stats.totalImpressions || 0) / 1000000).toFixed(1)}M</p>
          <p className="text-xs opacity-70 mt-1">Cost/1K: ₹{cpi}</p>
        </div>
      </div>
      
      {/* Party-wise Spending */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-white">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium opacity-80">BJP SPEND</h4>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">
              {stats.partyBreakdown?.BJP?.count || 0} ads
            </span>
          </div>
          <p className="text-3xl font-bold mt-1">₹{totals.BJP} Cr</p>
          <div className="mt-2 text-xs opacity-80">
            {stats.partyBreakdown?.BJP?.impressions 
              ? `${(stats.partyBreakdown.BJP.impressions / 1000000).toFixed(1)}M impressions`
              : 'No impression data'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium opacity-80">INC SPEND</h4>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">
              {stats.partyBreakdown?.INC?.count || 0} ads
            </span>
          </div>
          <p className="text-3xl font-bold mt-1">₹{totals.INC} Cr</p>
          <div className="mt-2 text-xs opacity-80">
            {stats.partyBreakdown?.INC?.impressions 
              ? `${(stats.partyBreakdown.INC.impressions / 1000000).toFixed(1)}M impressions`
              : 'No impression data'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-700 to-blue-800 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium opacity-80">AAP SPEND</h4>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">
              {stats.partyBreakdown?.AAP?.count || 0} ads
            </span>
          </div>
          <p className="text-3xl font-bold mt-1">₹{totals.AAP} Cr</p>
          <div className="mt-2 text-xs opacity-80">
            {stats.partyBreakdown?.AAP?.impressions 
              ? `${(stats.partyBreakdown.AAP.impressions / 1000000).toFixed(1)}M impressions`
              : 'No impression data'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-500 to-slate-600 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium opacity-80">OTHERS</h4>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">
              {stats.partyBreakdown?.Others?.count || 0} ads
            </span>
          </div>
          <p className="text-3xl font-bold mt-1">₹{totals.Others} Cr</p>
          <div className="mt-2 text-xs opacity-80">
            {stats.partyBreakdown?.Others?.impressions 
              ? `${(stats.partyBreakdown.Others.impressions / 1000000).toFixed(1)}M impressions`
              : 'No impression data'}
          </div>
        </div>
      </div>
    </div>
  )
}
