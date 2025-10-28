export default function AdCard({ ad }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden dark:bg-slate-900 hover:shadow-lg transition-shadow">
      <div className="h-40 bg-slate-200 flex items-center justify-center relative overflow-hidden">
        <img src={ad.img} alt={`${ad.party} Ad Creative`} className="w-full h-full object-cover" />
        {ad.isNational && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">
            National
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">Sponsored by</p>
        <p className="font-semibold flex items-center mt-1 text-slate-800 dark:text-white">
          <span className="w-6 h-6 rounded-full mr-2 inline-flex items-center justify-center text-white text-xs" style={{ backgroundColor: ad.partyColor }}>
            {ad.party[0]}
          </span>
          <span className="truncate">{ad.sponsor}</span>
        </p>
        <div className="text-xs mt-2 space-y-1">
          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 rounded">
            <span className="font-medium text-slate-600 dark:text-slate-400">Spend:</span>
            <span className="font-bold text-slate-800 dark:text-white">{ad.spend}</span>
          </div>
          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 rounded">
            <span className="font-medium text-slate-600 dark:text-slate-400">Region:</span>
            <span className="font-semibold text-slate-800 dark:text-white">
              {ad.isNational ? `${ad.stateCount} states` : ad.region}
            </span>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
            <span className="font-medium text-slate-600 dark:text-slate-400">Location:</span>
            <span className="ml-1 text-slate-800 dark:text-white">{ad.locationSummary || ad.state}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
