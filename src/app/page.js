'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'

const COLORS = ['#f472b6','#facc15','#4ade80','#60a5fa','#fb923c','#a78bfa','#f87171','#2dd4bf','#e879f9','#fbbf24','#34d399','#818cf8']

const fmt = (v) => v.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (v) => v.toLocaleString('ca-ES')

/* Icons */
const IconEuro = () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4" /></svg>)
const IconBox = () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>)
const IconReceipt = () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>)
const IconGrid = () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>)
const IconCalendar = () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>)
const IconSearch = () => (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>)
const IconSort = ({ dir }) => (<svg className="w-3 h-3 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{dir === 'asc' ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /> : dir === 'desc' ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />}</svg>)

function KpiCard({ icon, label, value, accent, sub }) {
  return (
    <div className="rounded-xl border border-slate-700 p-3 sm:p-5 relative overflow-hidden" style={{ backgroundColor: '#1e293b', borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2" style={{ color: '#94a3b8' }}>
        <span style={{ color: accent }}>{icon}</span>
        <span className="text-xs sm:text-sm font-medium truncate">{label}</span>
      </div>
      <div className="text-lg sm:text-2xl font-bold" style={{ color: '#f1f5f9' }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: '#64748b' }}>{sub}</div>}
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-700 p-3 sm:p-5" style={{ backgroundColor: '#1e293b' }}>
      <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4" style={{ color: '#f1f5f9' }}>{title}</h3>
      {children}
    </div>
  )
}

function CustomTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-sm border border-slate-600" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {typeof p.value === 'number' ? fmt(p.value) : p.value}{suffix}</p>
      ))}
    </div>
  )
}

const renderPieLabel = ({ name, pctImport, cx, cy, midAngle, outerRadius }) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 20
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (pctImport < 5) return null
  return <text x={x} y={y} fill="#cbd5e1" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>{pctImport.toFixed(1)}%</text>
}

/* ---- DATE FILTER ---- */
function DateFilter({ dates, dateFrom, dateTo, onChange }) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const presets = [
    { label: 'Avui', fn: () => onChange(today, today) },
    { label: 'Ahir', fn: () => onChange(yesterday, yesterday) },
    { label: '7 dies', fn: () => { const end = dates[dates.length-1]; const start = dates[Math.max(0, dates.length-7)]; onChange(start, end) }},
    { label: '30 dies', fn: () => { const end = dates[dates.length-1]; const start = dates[Math.max(0, dates.length-30)]; onChange(start, end) }},
    { label: 'Tot', fn: () => onChange(dates[0], dates[dates.length-1]) },
  ]

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
      <div className="flex gap-1">
        {presets.map((p) => (
          <button key={p.label} onClick={p.fn}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-600 hover:bg-slate-700 hover:border-pink-400 transition-colors"
            style={{ color: '#f1f5f9', backgroundColor: '#0f172a' }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
        <input type="date" value={dateFrom} onChange={(e) => onChange(e.target.value, dateTo)}
          className="px-2 sm:px-3 py-1.5 rounded-lg text-xs border border-slate-600 focus:outline-none focus:border-pink-400 flex-1 sm:flex-none min-w-0"
          style={{ backgroundColor: '#0f172a', color: '#f1f5f9', colorScheme: 'dark' }} />
        <span style={{ color: '#64748b' }}>—</span>
        <input type="date" value={dateTo} onChange={(e) => onChange(dateFrom, e.target.value)}
          className="px-2 sm:px-3 py-1.5 rounded-lg text-xs border border-slate-600 focus:outline-none focus:border-pink-400 flex-1 sm:flex-none min-w-0"
          style={{ backgroundColor: '#0f172a', color: '#f1f5f9', colorScheme: 'dark' }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('import')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    fetch('/api/sales')
      .then((r) => r.json())
      .then((d) => {
        // Fallback to static JSON if API returns empty (no DB data yet)
        if (!d.products || d.products.length === 0) {
          return fetch('/data/sales.json').then(r => r.json())
        }
        return d
      })
      .then((d) => {
        setData(d)
        setDateFrom(d.period.start)
        setDateTo(d.period.end)
      })
      .catch(console.error)
  }, [])

  /* Filter products by date range */
  const filtered = useMemo(() => {
    if (!data) return { products: [], daily: [], categories: [] }

    // Filter daily data
    const dailyFiltered = data.daily.filter(d => d.date >= dateFrom && d.date <= dateTo)
    const daysInRange = dailyFiltered.length || 1

    // If we have productsByDate, use it for filtering
    if (data.productsByDate) {
      const byDate = data.productsByDate.filter(p => p.date >= dateFrom && p.date <= dateTo)

      // Aggregate products
      const prodMap = {}
      byDate.forEach(p => {
        if (!prodMap[p.producte]) {
          prodMap[p.producte] = { codi: p.codi, producte: p.producte, unitats: 0, import: 0, categoria: p.categoria }
        }
        prodMap[p.producte].unitats += p.unitats
        prodMap[p.producte].import += p.import
      })

      const products = Object.values(prodMap).map(p => ({
        ...p,
        import: Math.round(p.import * 100) / 100,
        preuMig: p.unitats > 0 ? Math.round(p.import / p.unitats * 100) / 100 : 0
      }))

      // Aggregate categories
      const catMap = {}
      const totalImp = products.reduce((s, p) => s + p.import, 0)
      products.forEach(p => {
        if (!catMap[p.categoria]) catMap[p.categoria] = { name: p.categoria, unitats: 0, import: 0 }
        catMap[p.categoria].unitats += p.unitats
        catMap[p.categoria].import += p.import
      })
      const categories = Object.values(catMap).map(c => ({
        ...c,
        import: Math.round(c.import * 100) / 100,
        pctImport: totalImp > 0 ? Math.round(c.import / totalImp * 1000) / 10 : 0
      })).sort((a, b) => b.import - a.import)

      return { products, daily: dailyFiltered, categories, days: daysInRange }
    }

    // Fallback: use global products (no date filtering possible)
    return { products: data.products, daily: dailyFiltered, categories: data.categories, days: daysInRange }
  }, [data, dateFrom, dateTo])

  const isFullRange = data && dateFrom === data.period.start && dateTo === data.period.end

  const totals = useMemo(() => {
    const facturacio = filtered.products.reduce((s, p) => s + p.import, 0)
    const unitats = filtered.products.reduce((s, p) => s + p.unitats, 0)
    return {
      facturacio: Math.round(facturacio * 100) / 100,
      unitats,
      productes: filtered.products.length,
      ticketMig: unitats > 0 ? Math.round(facturacio / unitats * 100) / 100 : 0,
    }
  }, [filtered])

  const top10Import = useMemo(() => [...filtered.products].sort((a, b) => b.import - a.import).slice(0, 10).reverse(), [filtered])
  const top10Units = useMemo(() => [...filtered.products].sort((a, b) => b.unitats - a.unitats).slice(0, 10).reverse(), [filtered])

  const categoryAvgPrice = useMemo(() => {
    const map = {}
    filtered.products.forEach((p) => {
      if (!map[p.categoria]) map[p.categoria] = { sum: 0, count: 0 }
      map[p.categoria].sum += p.preuMig * p.unitats
      map[p.categoria].count += p.unitats
    })
    return Object.entries(map)
      .map(([name, v]) => ({ name, preuMig: v.count > 0 ? Math.round(v.sum / v.count * 100) / 100 : 0 }))
      .sort((a, b) => b.preuMig - a.preuMig)
  }, [filtered])

  /* Daily chart data */
  const dailyChart = useMemo(() => {
    return filtered.daily.map(d => ({
      ...d,
      label: new Date(d.date + 'T00:00:00').toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })
    }))
  }, [filtered])

  const filteredProducts = useMemo(() => {
    let list = filtered.products
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.producte.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q))
    }
    list = [...list].sort((a, b) => {
      const aVal = a[sortCol], bVal = b[sortCol]
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal, 'ca') : bVal.localeCompare(aVal, 'ca')
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return list
  }, [filtered, search, sortCol, sortDir])

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE)
  const paginatedProducts = filteredProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => { setPage(0) }, [search, sortCol, sortDir, dateFrom, dateTo])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'producte' || col === 'categoria' ? 'asc' : 'desc') }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ color: '#94a3b8' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Carregant dades...</p>
        </div>
      </div>
    )
  }

  const { period } = data
  const mitjana = totals.facturacio / (filtered.days || 1)

  const formatDate = (d) => {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-10">
      {/* Header + Date Filter */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-3xl font-bold" style={{ color: '#f1f5f9' }}>Dashboard Gelateria</h1>
          <a href="/costos" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-4 py-2 rounded-lg text-sm transition">Costos & Factures →</a>
        </div>
        <div>
          <p className="text-xs sm:text-sm mt-1" style={{ color: '#94a3b8' }}>
            {isFullRange
              ? `Periode complet: ${formatDate(period.start)} — ${formatDate(period.end)} (${period.days} dies)`
              : `Filtrat: ${formatDate(dateFrom)} — ${formatDate(dateTo)} (${filtered.days} dies)`
            }
          </p>
        </div>
        <DateFilter dates={data.dates || []} dateFrom={dateFrom} dateTo={dateTo}
          onChange={(from, to) => { setDateFrom(from); setDateTo(to) }} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
        <KpiCard icon={<IconEuro />} label="Facturacio Total" value={`${fmt(totals.facturacio)} \u20AC`} accent="#f472b6" />
        <KpiCard icon={<IconBox />} label="Unitats Venudes" value={fmtInt(totals.unitats)} accent="#facc15" />
        <KpiCard icon={<IconReceipt />} label="Ticket Mig" value={`${fmt(totals.ticketMig)} \u20AC`} accent="#4ade80" />
        <KpiCard icon={<IconGrid />} label="Productes Actius" value={fmtInt(totals.productes)} accent="#60a5fa" />
        <KpiCard icon={<IconCalendar />} label="Mitjana Diaria" value={`${fmt(mitjana)} \u20AC`} accent="#fb923c"
          sub={`${filtered.days} dies`} />
      </div>

      {/* Evolucio Diaria */}
      {dailyChart.length > 1 && (
        <ChartCard title="Evolucio Diaria de Vendes">
          <div className="w-full h-[220px] sm:h-[280px]">
            <ResponsiveContainer>
              <LineChart data={dailyChart} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={Math.max(0, Math.floor(dailyChart.length / 10))} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}`} width={40} />
                <Tooltip content={<CustomTooltip suffix=" \u20AC" />} />
                <Line type="monotone" dataKey="facturacio" name="Facturacio" stroke="#f472b6" strokeWidth={2} dot={{ r: 1.5, fill: '#f472b6' }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Charts 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Top 10 Productes per Import">
          <div className="w-full h-[300px] sm:h-[350px]">
            <ResponsiveContainer>
              <BarChart data={top10Import} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}`} />
                <YAxis type="category" dataKey="producte" width={90} tick={{ fill: '#cbd5e1', fontSize: 9 }} />
                <Tooltip content={<CustomTooltip suffix=" \u20AC" />} />
                <Bar dataKey="import" name="Import" fill="#f472b6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top 10 Productes per Unitats">
          <div className="w-full h-[300px] sm:h-[350px]">
            <ResponsiveContainer>
              <BarChart data={top10Units} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis type="category" dataKey="producte" width={90} tick={{ fill: '#cbd5e1', fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="unitats" name="Unitats" fill="#facc15" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Distribucio per Categories">
          <div className="w-full h-[280px] sm:h-[370px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={filtered.categories} dataKey="import" nameKey="name" cx="50%" cy="45%"
                  innerRadius={45} outerRadius={85} paddingAngle={2} label={renderPieLabel}>
                  {filtered.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip suffix=" \u20AC" />} />
                <Legend verticalAlign="bottom" iconType="circle" iconSize={7}
                  wrapperStyle={{ fontSize: 10, color: '#94a3b8', paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Preu Mig per Categoria">
          <div className="w-full h-[280px] sm:h-[370px]">
            <ResponsiveContainer>
              <BarChart data={categoryAvgPrice} margin={{ left: 0, right: 10, top: 5, bottom: 60 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 8 }} angle={-45} textAnchor="end" interval={0} height={80} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v.toFixed(1)}`} width={35} />
                <Tooltip content={<CustomTooltip suffix=" \u20AC" />} />
                <Bar dataKey="preuMig" name="Preu Mig" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 border-b border-slate-700">
          <h3 className="text-sm sm:text-base font-semibold" style={{ color: '#f1f5f9' }}>Productes ({filteredProducts.length})</h3>
          <div className="relative w-full sm:w-auto">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }}><IconSearch /></span>
            <input type="text" placeholder="Cercar producte o categoria..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg text-sm border border-slate-600 focus:outline-none focus:border-pink-400 w-full sm:w-64"
              style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr style={{ backgroundColor: '#0f172a' }}>
                {[
                  { key: 'producte', label: 'Producte', align: 'left' },
                  { key: 'categoria', label: 'Cat.', align: 'left', hideOnMobile: true },
                  { key: 'unitats', label: 'Uds', align: 'right' },
                  { key: 'import', label: 'Import', align: 'right' },
                  { key: 'preuMig', label: 'P.Mig', align: 'right' },
                ].map(col => (
                  <th key={col.key}
                    className={`px-2 sm:px-4 py-2 sm:py-3 font-semibold cursor-pointer select-none hover:text-pink-400 transition-colors ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                    style={{ color: '#94a3b8' }} onClick={() => handleSort(col.key)}>
                    {col.label}<IconSort dir={sortCol === col.key ? sortDir : null} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((p, i) => (
                <tr key={`${p.producte}-${i}`}
                  className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)' }}>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 font-medium max-w-[120px] sm:max-w-none truncate" style={{ color: '#f1f5f9' }}>{p.producte}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 hidden sm:table-cell" style={{ color: '#94a3b8' }}>{p.categoria}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-right" style={{ color: '#f1f5f9' }}>{fmtInt(p.unitats)}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-right" style={{ color: '#f1f5f9' }}>{fmt(p.import)}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-right" style={{ color: '#f1f5f9' }}>{fmt(p.preuMig)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-t border-slate-700" style={{ color: '#94a3b8' }}>
            <span className="text-xs">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredProducts.length)} de {filteredProducts.length}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-2 sm:px-3 py-1 rounded text-xs border border-slate-600 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ color: '#f1f5f9' }}>{'<'}</button>
              <span className="px-2 py-1 text-xs sm:hidden" style={{ color: '#f1f5f9' }}>{page + 1}/{totalPages}</span>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pn = totalPages <= 7 ? i : page < 3 ? i : page > totalPages - 4 ? totalPages - 7 + i : page - 3 + i
                return (
                  <button key={pn} onClick={() => setPage(pn)}
                    className={`px-2 sm:px-3 py-1 rounded text-xs border transition-colors hidden sm:inline-block ${page === pn ? 'bg-pink-500 border-pink-500 text-white' : 'border-slate-600 hover:bg-slate-700'}`}
                    style={page !== pn ? { color: '#f1f5f9' } : {}}>
                    {pn + 1}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="px-2 sm:px-3 py-1 rounded text-xs border border-slate-600 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ color: '#f1f5f9' }}>{'>'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
