export default function KPICards({ totals = { BJP: 28.5, INC: 15.2, AAP: 4.8, Others: 4.3 }, stats = {} }) {
  return (
    <div className="mb-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white">
          <h4 className="text-sm font-medium opacity-80">TOTAL ADS</h4>
          <p className="text-3xl font-bold mt-1">{stats.totalAds?.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white">
          <h4 className="text-sm font-medium opacity-80">TOTAL PAGES</h4>
          <p className="text-3xl font-bold mt-1">{stats.totalPages?.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-lg text-white">
          <h4 className="text-sm font-medium opacity-80">TOTAL SPEND</h4>
          <p className="text-3xl font-bold mt-1">₹{stats.totalSpend?.toFixed(2) || '0'} L</p>
        </div>
      </div>
      
      {/* Party-wise Spending */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-white">
        <div className="bg-orange-500 p-4 rounded-lg">
          <h4 className="text-sm font-medium opacity-80">BJP SPEND</h4>
          <p className="text-3xl font-bold mt-1">₹{totals.BJP} Cr</p>
        </div>
        <div className="bg-sky-500 p-4 rounded-lg">
          <h4 className="text-sm font-medium opacity-80">INC SPEND</h4>
          <p className="text-3xl font-bold mt-1">₹{totals.INC} Cr</p>
        </div>
        <div className="bg-blue-800 p-4 rounded-lg">
          <h4 className="text-sm font-medium opacity-80">AAP SPEND</h4>
          <p className="text-3xl font-bold mt-1">₹{totals.AAP} Cr</p>
        </div>
        <div className="bg-slate-500 p-4 rounded-lg">
          <h4 className="text-sm font-medium opacity-80">OTHERS</h4>
          <p className="text-3xl font-bold mt-1">₹{totals.Others} Cr</p>
        </div>
      </div>
    </div>
  )
}
