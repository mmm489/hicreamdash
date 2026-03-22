'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#f472b6','#facc15','#4ade80','#60a5fa','#fb923c','#a78bfa','#f87171','#2dd4bf','#e879f9','#fbbf24','#34d399','#818cf8']

const fmt = (v) => v.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (v) => v.toLocaleString('ca-ES')

/* ─── Icons (inline SVG) ─── */
const IconEuro = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4" />
  </svg>
)
const IconBox = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)
const IconReceipt = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
  </svg>
)
const IconGrid = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)
const IconCalendar = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)
const IconSort = ({ dir }) => (
  <svg className="w-3 h-3 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    {dir === 'asc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    ) : dir === 'desc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
    )}
  </svg>
)

/* ─── KPI Card ─── */
function KpiCard({ icon, label, value, accent }) {
  return (
    <div
      className="rounded-xl border border-slate-700 p-5 relative overflow-hidden"
      style={{ backgroundColor: '#1e293b', borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: '#94a3b8' }}>
        <span style={{ color: accent }}>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
        {value}
      </div>
    </div>
  )
}

/* ─── Chart Card wrapper ─── */
function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-700 p-5" style={{ backgroundColor: '#1e293b' }}>
      <h3 className="text-base font-semibold mb-4" style={{ color: '#f1f5f9' }}>{title}</h3>
      {children}
    </div>
  )
}

/* ─── Custom Tooltip ─── */
function CustomTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-sm border border-slate-600" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === 'number' ? fmt(p.value) : p.value}{suffix}
        </p>
      ))}
    </div>
  )
}

/* ─── Pie label renderer ─── */
const renderPieLabel = ({ name, pctImport, cx, cy, midAngle, innerRadius, outerRadius }) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 25
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (pctImport < 3) return null
  return (
    <text x={x} y={y} fill="#cbd5e1" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
      {pctImport.toFixed(1)}%
    </text>
  )
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('import')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    fetch('/data/sales.json')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
  }, [])

  /* derived data */
  const top10Import = useMemo(() => {
    if (!data) return []
    return [...data.products].sort((a, b) => b.import - a.import).slice(0, 10).reverse()
  }, [data])

  const top10Units = useMemo(() => {
    if (!data) return []
    return [...data.products].sort((a, b) => b.unitats - a.unitats).slice(0, 10).reverse()
  }, [data])

  const categoryAvgPrice = useMemo(() => {
    if (!data) return []
    const map = {}
    data.products.forEach((p) => {
      if (!map[p.categoria]) map[p.categoria] = { sum: 0, count: 0 }
      map[p.categoria].sum += p.preuMig * p.unitats
      map[p.categoria].count += p.unitats
    })
    return Object.entries(map)
      .map(([name, v]) => ({ name, preuMig: v.count > 0 ? v.sum / v.count : 0 }))
      .sort((a, b) => b.preuMig - a.preuMig)
  }, [data])

  const filteredProducts = useMemo(() => {
    if (!data) return []
    let list = data.products
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) => p.producte.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      const aVal = a[sortCol]
      const bVal = b[sortCol]
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal, 'ca') : bVal.localeCompare(aVal, 'ca')
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return list
  }, [data, search, sortCol, sortDir])

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE)
  const paginatedProducts = filteredProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => { setPage(0) }, [search, sortCol, sortDir])

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir(col === 'producte' || col === 'categoria' ? 'asc' : 'desc')
    }
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

  const { period, totals, categories } = data
  const mitjana = totals.facturacio / period.days

  const formatDate = (d) => {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>
          Dashboard Gelateria
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          Periode: {formatDate(period.start)} &mdash; {formatDate(period.end)} ({period.days} dies)
        </p>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={<IconEuro />} label="Facturaci&oacute; Total" value={`${fmt(totals.facturacio)} \u20AC`} accent="#f472b6" />
        <KpiCard icon={<IconBox />} label="Unitats Venudes" value={fmtInt(totals.unitats)} accent="#facc15" />
        <KpiCard icon={<IconReceipt />} label="Ticket Mig" value={`${fmt(totals.ticketMig)} \u20AC`} accent="#4ade80" />
        <KpiCard icon={<IconGrid />} label="Productes Actius" value={fmtInt(totals.productes)} accent="#60a5fa" />
        <KpiCard icon={<IconCalendar />} label="Mitjana Diaria" value={`${fmt(mitjana)} \u20AC`} accent="#fb923c" />
      </div>

      {/* ─── Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 per Import */}
        <ChartCard title="Top 10 Productes per Import">
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={top10Import} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)} \u20AC`} />
                <YAxis type="category" dataKey="producte" width={130} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip suffix=" \u20AC" />} />
                <Bar dataKey="import" name="Import" fill="#f472b6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Top 10 per Unitats */}
        <ChartCard title="Top 10 Productes per Unitats">
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={top10Units} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis type="category" dataKey="producte" width={130} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="unitats" name="Unitats" fill="#facc15" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Distribucio per Categories */}
        <ChartCard title="Distribucio per Categories">
          <div style={{ width: '100%', height: 370 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="import"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  label={renderPieLabel}
                >
                  {categories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip suffix=" \u20AC" />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Preu Mig per Categoria */}
        <ChartCard title="Preu Mig per Categoria">
          <div style={{ width: '100%', height: 370 }}>
            <ResponsiveContainer>
              <BarChart data={categoryAvgPrice} margin={{ left: 5, right: 20, top: 5, bottom: 60 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={80}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(1)} \u20AC`} />
                <Tooltip content={<CustomTooltip suffix=" \u20AC" />} />
                <Bar dataKey="preuMig" name="Preu Mig" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ─── Products Table ─── */}
      <div className="rounded-xl border border-slate-700 overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700">
          <h3 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
            Productes ({filteredProducts.length})
          </h3>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Cercar producte o categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg text-sm border border-slate-600 focus:outline-none focus:border-pink-400 w-64"
              style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#0f172a' }}>
                {[
                  { key: 'producte', label: 'Producte', align: 'left' },
                  { key: 'categoria', label: 'Categoria', align: 'left' },
                  { key: 'unitats', label: 'Unitats', align: 'right' },
                  { key: 'import', label: 'Import (\u20AC)', align: 'right' },
                  { key: 'preuMig', label: 'Preu Mig (\u20AC)', align: 'right' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-semibold cursor-pointer select-none hover:text-pink-400 transition-colors ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    style={{ color: '#94a3b8' }}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <IconSort dir={sortCol === col.key ? sortDir : null} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((p, i) => (
                <tr
                  key={p.codi}
                  className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)' }}
                >
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#f1f5f9' }}>{p.producte}</td>
                  <td className="px-4 py-2.5" style={{ color: '#94a3b8' }}>{p.categoria}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#f1f5f9' }}>{fmtInt(p.unitats)}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#f1f5f9' }}>{fmt(p.import)}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#f1f5f9' }}>{fmt(p.preuMig)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700" style={{ color: '#94a3b8' }}>
            <span className="text-xs">
              {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, filteredProducts.length)} de {filteredProducts.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded text-xs border border-slate-600 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ color: '#f1f5f9' }}
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum
                if (totalPages <= 7) {
                  pageNum = i
                } else if (page < 3) {
                  pageNum = i
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 7 + i
                } else {
                  pageNum = page - 3 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${
                      page === pageNum ? 'bg-pink-500 border-pink-500 text-white' : 'border-slate-600 hover:bg-slate-700'
                    }`}
                    style={page !== pageNum ? { color: '#f1f5f9' } : {}}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1 rounded text-xs border border-slate-600 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ color: '#f1f5f9' }}
              >
                Seg\u00FCent
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
