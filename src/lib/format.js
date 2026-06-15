export const money = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const todayISO = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local

// "2026-06-14" -> "14/06/2026"
export const fmtData = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
