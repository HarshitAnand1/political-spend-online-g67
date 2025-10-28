export default function AdCard({ ad }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden dark:bg-slate-900">
      <div className="h-40 bg-slate-200 flex items-center justify-center">
        <img src={ad.img} alt={`${ad.party} Ad Creative`} className="w-full h-full object-cover" />
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-500">Sponsored by</p>
        <p className="font-semibold flex items-center mt-1">
          <span className="w-6 h-6 rounded-full mr-2 inline-flex items-center justify-center text-white text-xs" style={{ backgroundColor: ad.partyColor }}>
            {ad.party[0]}
          </span>
          {ad.sponsor}
        </p>
        <div className="text-xs mt-2 bg-slate-100 p-2 rounded dark:bg-slate-800">
          <p><span className="font-medium">Spend:</span> {ad.spend}</p>
          <p><span className="font-medium">State:</span> {ad.state}</p>
        </div>
      </div>
    </div>
  )
}
