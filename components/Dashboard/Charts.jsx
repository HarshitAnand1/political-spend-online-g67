"use client"
import { Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

export function SpendLineChart({ labels, series }) {
  const data = {
    labels,
    datasets: [
      series.BJP && {
        label: 'BJP',
        data: series.BJP,
        borderColor: '#FF9933',
        backgroundColor: '#FF993333',
        fill: true,
        tension: 0.3,
      },
      series.INC && {
        label: 'INC',
        data: series.INC,
        borderColor: '#138808',
        backgroundColor: '#13880833',
        fill: true,
        tension: 0.3,
      },
      series.AAP && {
        label: 'AAP',
        data: series.AAP,
        borderColor: '#0073e6',
        backgroundColor: '#0073e633',
        fill: true,
        tension: 0.3,
      },
      series['Janata Dal (United)'] && {
        label: 'Janata Dal (United)',
        data: series['Janata Dal (United)'],
        borderColor: '#006400',
        backgroundColor: '#00640033',
        fill: true,
        tension: 0.3,
      },
      series.RJD && {
        label: 'RJD',
        data: series.RJD,
        borderColor: '#008000',
        backgroundColor: '#00800033',
        fill: true,
        tension: 0.3,
      },
      series['Jan Suraaj'] && {
        label: 'Jan Suraaj',
        data: series['Jan Suraaj'],
        borderColor: '#FF6347',
        backgroundColor: '#FF634733',
        fill: true,
        tension: 0.3,
      },
      series.LJP && {
        label: 'LJP',
        data: series.LJP,
        borderColor: '#9333EA',
        backgroundColor: '#9333EA33',
        fill: true,
        tension: 0.3,
      },
      series.HAM && {
        label: 'HAM',
        data: series.HAM,
        borderColor: '#92400E',
        backgroundColor: '#92400E33',
        fill: true,
        tension: 0.3,
      },
      series.VIP && {
        label: 'VIP',
        data: series.VIP,
        borderColor: '#0891B2',
        backgroundColor: '#0891B233',
        fill: true,
        tension: 0.3,
      },
      series.AIMIM && {
        label: 'AIMIM',
        data: series.AIMIM,
        borderColor: '#14532D',
        backgroundColor: '#14532D33',
        fill: true,
        tension: 0.3,
      },
      series.DMK && {
        label: 'DMK',
        data: series.DMK,
        borderColor: '#DC2626',
        backgroundColor: '#DC262633',
        fill: true,
        tension: 0.3,
      },
      series.AITC && {
        label: 'AITC',
        data: series.AITC,
        borderColor: '#16A34A',
        backgroundColor: '#16A34A33',
        fill: true,
        tension: 0.3,
      },
      series.NCP && {
        label: 'NCP',
        data: series.NCP,
        borderColor: '#2563EB',
        backgroundColor: '#2563EB33',
        fill: true,
        tension: 0.3,
      },
      series.TDP && {
        label: 'TDP',
        data: series.TDP,
        borderColor: '#FBBF24',
        backgroundColor: '#FBBF2433',
        fill: true,
        tension: 0.3,
      },
      series.AIADMK && {
        label: 'AIADMK',
        data: series.AIADMK,
        borderColor: '#059669',
        backgroundColor: '#05966933',
        fill: true,
        tension: 0.3,
      },
      series.SP && {
        label: 'SP',
        data: series.SP,
        borderColor: '#E11D48',
        backgroundColor: '#E11D4833',
        fill: true,
        tension: 0.3,
      },
      series.BSP && {
        label: 'BSP',
        data: series.BSP,
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F633',
        fill: true,
        tension: 0.3,
      },
      series['Shiv Sena'] && {
        label: 'Shiv Sena',
        data: series['Shiv Sena'],
        borderColor: '#F97316',
        backgroundColor: '#F9731633',
        fill: true,
        tension: 0.3,
      },
      series.BJD && {
        label: 'BJD',
        data: series.BJD,
        borderColor: '#10B981',
        backgroundColor: '#10B98133',
        fill: true,
        tension: 0.3,
      },
      series.YSRCP && {
        label: 'YSRCP',
        data: series.YSRCP,
        borderColor: '#7C3AED',
        backgroundColor: '#7C3AED33',
        fill: true,
        tension: 0.3,
      },
      series.BRS && {
        label: 'BRS',
        data: series.BRS,
        borderColor: '#EC4899',
        backgroundColor: '#EC489933',
        fill: true,
        tension: 0.3,
      },
      series['CPI(M)'] && {
        label: 'CPI(M)',
        data: series['CPI(M)'],
        borderColor: '#B91C1C',
        backgroundColor: '#B91C1C33',
        fill: true,
        tension: 0.3,
      },
      series['JD(S)'] && {
        label: 'JD(S)',
        data: series['JD(S)'],
        borderColor: '#65A30D',
        backgroundColor: '#65A30D33',
        fill: true,
        tension: 0.3,
      },
      series.Others && {
        label: 'Others',
        data: series.Others,
        borderColor: '#64748B',
        backgroundColor: '#64748B33',
        fill: true,
        tension: 0.3,
      },
    ].filter(Boolean),
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { boxWidth: 12, font: { size: 10 } },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => `₹${v} Cr` },
      },
    },
  }
  return <Line data={data} options={options} />
}

export function SpendPieChart({ totals = {} }) {
  const labels = Object.keys(totals)
  const values = Object.values(totals)

  // Map party names to colors
  const partyColorMap = {
    BJP: '#FF9933',
    INC: '#138808',
    AAP: '#0073e6',
    'Janata Dal (United)': '#006400',
    RJD: '#008000',
    'Jan Suraaj': '#FF6347',
    LJP: '#9333EA',
    HAM: '#92400E',
    VIP: '#0891B2',
    AIMIM: '#14532D',
    DMK: '#DC2626',
    AITC: '#14B8A6',
    NCP: '#2563EB',
    TDP: '#FBBF24',
    AIADMK: '#059669',
    SP: '#E11D48',
    BSP: '#3B82F6',
    'Shiv Sena': '#F97316',
    BJD: '#10B981',
    YSRCP: '#7C3AED',
    BRS: '#EC4899',
    'CPI(M)': '#B91C1C',
    'JD(S)': '#65A30D',
    Others: '#64748B'
  }

  const colors = labels.map(label => partyColorMap[label] || '#64748B')

  const data = {
    labels,
    datasets: [{
      label: 'Spend Share',
      data: values,
      backgroundColor: colors,
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || ''
            const value = context.parsed
            return `${label}: ₹${value} Cr`
          },
        },
      },
    },
    cutout: '70%',
  }

  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-1/2">
        <Doughnut data={data} options={options} />
      </div>
      <div className="w-1/2 h-full overflow-y-auto ml-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {labels.map((label, i) => (
            <div className="flex items-center" key={label}>
              <div className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: colors[i] }} />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
