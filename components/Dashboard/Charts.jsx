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
        borderColor: '#F97316',
        backgroundColor: '#F9731633',
        fill: true,
        tension: 0.3,
      },
      series.INC && {
        label: 'INC',
        data: series.INC,
        borderColor: '#0EA5E9',
        backgroundColor: '#0EA5E933',
        fill: true,
        tension: 0.3,
      },
      series.AAP && {
        label: 'AAP',
        data: series.AAP,
        borderColor: '#1E40AF',
        backgroundColor: '#1E40AF33',
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
  const colors = ['#F97316', '#0EA5E9', '#1E40AF', '#64748B']
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
      <div className="w-2/3">
        <Doughnut data={data} options={options} />
      </div>
      <div className="w-1/3 space-y-2 text-sm ml-4">
        {labels.map((label, i) => (
          <div className="flex items-center" key={label}>
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[i] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
