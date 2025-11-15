export default function SpendTable({ rows }) {
  return (
    <div className="mt-6 bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900">
      <h3 className="font-semibold mb-1">Party Spend Summary</h3>
      <p className="text-xs text-slate-500 mb-4">Based on selected filters.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="p-2">Rank</th>
              <th className="p-2">Party</th>
              <th className="p-2 text-right">Total Spend</th>
              <th className="p-2 text-right">Unofficial Spend</th>
              <th className="p-2 text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr className="border-b" key={r.name}>
                <td className="p-2 font-medium text-slate-500">{idx + 1}</td>
                <td className="p-2 font-medium flex items-center">
                  <img src={r.logo} alt={`${r.name} Logo`} className="w-6 h-6 object-contain rounded-full mr-2" />
                  {r.name}
                </td>
                <td className="p-2 text-right font-semibold">₹{r.value} Cr</td>
                <td className="p-2 text-right font-semibold text-orange-600">
                  {r.unofficialSpend > 0 ? `₹${r.unofficialSpend} Cr` : '—'}
                </td>
                <td className="p-2 text-right text-slate-600">{r.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
