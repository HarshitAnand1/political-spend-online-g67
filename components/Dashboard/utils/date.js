export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function format(date, fmt) {
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  
  if (fmt === 'yyyy-MM-dd') {
    return `${yyyy}-${MM}-${dd}`
  }
  
  // For chart labels 'MMM d'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const MMM = months[d.getMonth()]
  return fmt.replace('MMM', MMM).replace('d', String(d.getDate()))
}
