'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

const STORAGE_KEY = 'gelateria-costs'

const fmt = (v) => v.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (v) => v.toLocaleString('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/* ─── Icons (inline SVG) ─── */
const IconEuro = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IconPercent = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
  </svg>
)
const IconWarning = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
)
const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)
const IconHistory = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)
const IconSave = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

/* ─── Helpers ─── */
function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentCost(costsArr, productName) {
  // Find the most recent entry with no dataFi (active cost)
  const active = costsArr
    .filter((c) => c.producte === productName && c.dataFi === null)
    .sort((a, b) => b.dataInici.localeCompare(a.dataInici))
  return active.length > 0 ? active[0].cost : null
}

function getProductHistory(costsArr, productName) {
  return costsArr
    .filter((c) => c.producte === productName)
    .sort((a, b) => b.dataInici.localeCompare(a.dataInici))
}

function marginColor(pct) {
  if (pct < 30) return '#ef4444'   // red
  if (pct <= 50) return '#facc15'  // yellow
  return '#4ade80'                  // green
}

/* ─── Main Page ─── */
export default function CostsPage() {
  const [products, setProducts] = useState([])
  const [costs, setCosts] = useState([])
  const [search, setSearch] = useState('')
  const [editValues, setEditValues] = useState({})  // { productName: "1.50" }
  const [flashProduct, setFlashProduct] = useState(null)
  const [expandedProduct, setExpandedProduct] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Load products from API (real DB data)
  useEffect(() => {
    fetch('/api/sales')
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
  }, [])

  // Load costs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setCosts(JSON.parse(stored))
      }
    } catch {}
    setLoaded(true)
  }, [])

  // Save costs to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(costs))
    }
  }, [costs, loaded])

  // Save a cost for a product
  function saveCost(productName, newCostStr) {
    const newCost = parseFloat(newCostStr)
    if (isNaN(newCost) || newCost < 0) return

    const today = getToday()
    setCosts((prev) => {
      const updated = prev.map((c) => {
        if (c.producte === productName && c.dataFi === null) {
          return { ...c, dataFi: today }
        }
        return c
      })
      updated.push({
        producte: productName,
        cost: newCost,
        dataInici: today,
        dataFi: null,
      })
      return updated
    })

    // Flash feedback
    setFlashProduct(productName)
    setTimeout(() => setFlashProduct(null), 800)

    // Clear edit value
    setEditValues((prev) => {
      const next = { ...prev }
      delete next[productName]
      return next
    })
  }

  // Filtered products
  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        p.producte.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
    )
  }, [products, search])

  // KPI calculations
  const kpis = useMemo(() => {
    const total = products.length
    let withCost = 0
    let marginSum = 0
    let revenueWithCost = 0
    let costTotal = 0

    products.forEach((p) => {
      const cost = getCurrentCost(costs, p.producte)
      if (cost !== null) {
        withCost++
        const revenue = p.import
        const totalCost = cost * p.unitats
        marginSum += revenue - totalCost
        revenueWithCost += revenue
        costTotal += totalCost
      }
    })

    const avgMarginPct = revenueWithCost > 0 ? ((revenueWithCost - costTotal) / revenueWithCost) * 100 : 0

    return {
      total,
      withCost,
      withoutCost: total - withCost,
      marginSum,
      avgMarginPct,
    }
  }, [products, costs])

  // Export costs as JSON
  function exportCosts() {
    const blob = new Blob([JSON.stringify(costs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `costos-gelateria-${getToday()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
          Gestio de Costos
        </h1>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          Introdueix el cost de cada producte per calcular marges
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          icon={<IconCheck />}
          label="Productes amb cost definit"
          value={`${kpis.withCost} / ${kpis.total}`}
          accent="#4ade80"
        />
        <KpiCard
          icon={<IconEuro />}
          label="Marge Brut Estimat"
          value={`${fmt(kpis.marginSum)} \u20ac`}
          accent="#f472b6"
        />
        <KpiCard
          icon={<IconPercent />}
          label="% Marge Mig"
          value={`${fmtPct(kpis.avgMarginPct)} %`}
          accent="#facc15"
        />
        <KpiCard
          icon={<IconWarning />}
          label="Productes sense cost"
          value={kpis.withoutCost}
          accent={kpis.withoutCost > 0 ? '#ef4444' : '#4ade80'}
        />
      </div>

      {/* Search + Export bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }}>
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Cercar producte o categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
          />
        </div>
        <button
          onClick={exportCosts}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: '#f472b6', color: '#0f172a' }}
        >
          <IconDownload />
          Exportar Costos
        </button>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#0f172a' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#94a3b8' }}>Producte</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#94a3b8' }}>Categoria</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: '#94a3b8' }}>Preu Venda</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: '#94a3b8' }}>Cost Unitari</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: '#94a3b8' }}>Marge (&euro;)</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: '#94a3b8' }}>Marge (%)</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: '#94a3b8' }}>Historial</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const preuVenda = product.unitats > 0 ? product.import / product.unitats : 0
                const currentCost = getCurrentCost(costs, product.producte)
                const margeEur = currentCost !== null ? preuVenda - currentCost : null
                const margePct = currentCost !== null && preuVenda > 0 ? ((preuVenda - currentCost) / preuVenda) * 100 : null
                const history = getProductHistory(costs, product.producte)
                const isExpanded = expandedProduct === product.producte
                const isFlashing = flashProduct === product.producte
                const editVal = editValues[product.producte]

                return (
                  <ProductRow
                    key={product.codi}
                    product={product}
                    preuVenda={preuVenda}
                    currentCost={currentCost}
                    margeEur={margeEur}
                    margePct={margePct}
                    history={history}
                    isExpanded={isExpanded}
                    isFlashing={isFlashing}
                    editVal={editVal}
                    onToggleHistory={() =>
                      setExpandedProduct(isExpanded ? null : product.producte)
                    }
                    onEditChange={(val) =>
                      setEditValues((prev) => ({ ...prev, [product.producte]: val }))
                    }
                    onSave={() => {
                      const val = editValues[product.producte]
                      if (val !== undefined && val !== '') {
                        saveCost(product.producte, val)
                      }
                    }}
                  />
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8" style={{ color: '#64748b' }}>
                    Cap producte trobat
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── Product Row Component ─── */
function ProductRow({
  product,
  preuVenda,
  currentCost,
  margeEur,
  margePct,
  history,
  isExpanded,
  isFlashing,
  editVal,
  onToggleHistory,
  onEditChange,
  onSave,
}) {
  const inputRef = useRef(null)

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      onSave()
    }
  }

  return (
    <>
      <tr
        className="border-t border-slate-700 transition-colors"
        style={{
          backgroundColor: isFlashing ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
          transition: 'background-color 0.4s ease',
        }}
      >
        {/* Producte */}
        <td className="px-4 py-3 font-medium" style={{ color: '#f1f5f9' }}>
          {product.producte}
        </td>

        {/* Categoria */}
        <td className="px-4 py-3">
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: '#334155', color: '#94a3b8' }}
          >
            {product.categoria}
          </span>
        </td>

        {/* Preu Venda */}
        <td className="px-4 py-3 text-right tabular-nums" style={{ color: '#f1f5f9' }}>
          {fmt(preuVenda)} &euro;
        </td>

        {/* Cost Unitari (editable) */}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              min="0"
              placeholder={currentCost !== null ? fmt(currentCost) : '0,00'}
              value={editVal !== undefined ? editVal : ''}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-24 rounded border border-slate-600 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
            />
            <button
              onClick={onSave}
              className="p-1 rounded hover:bg-slate-600 transition-colors"
              style={{ color: '#4ade80' }}
              title="Desar"
            >
              <IconSave />
            </button>
          </div>
        </td>

        {/* Marge (euro) */}
        <td
          className="px-4 py-3 text-right tabular-nums font-medium"
          style={{ color: margePct !== null ? marginColor(margePct) : '#64748b' }}
        >
          {margeEur !== null ? `${fmt(margeEur)} \u20ac` : '\u2014'}
        </td>

        {/* Marge (%) */}
        <td className="px-4 py-3 text-right">
          {margePct !== null ? (
            <span
              className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                color: marginColor(margePct),
                backgroundColor:
                  margePct < 30
                    ? 'rgba(239, 68, 68, 0.15)'
                    : margePct <= 50
                    ? 'rgba(250, 204, 21, 0.15)'
                    : 'rgba(74, 222, 128, 0.15)',
              }}
            >
              {fmtPct(margePct)} %
            </span>
          ) : (
            <span style={{ color: '#64748b' }}>&mdash;</span>
          )}
        </td>

        {/* Historial */}
        <td className="px-4 py-3 text-center">
          <button
            onClick={onToggleHistory}
            className={`p-1.5 rounded transition-colors ${
              isExpanded ? 'bg-pink-500/20' : 'hover:bg-slate-600'
            }`}
            style={{ color: isExpanded ? '#f472b6' : '#94a3b8' }}
            title="Veure historial de costos"
          >
            <IconHistory />
          </button>
          {history.length > 0 && (
            <span
              className="ml-1 inline-block text-xs rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: '#334155', color: '#94a3b8' }}
            >
              {history.length}
            </span>
          )}
        </td>
      </tr>

      {/* History expansion row */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-4 py-3" style={{ backgroundColor: '#0f172a' }}>
            {history.length === 0 ? (
              <p className="text-sm italic" style={{ color: '#64748b' }}>
                Sense historial de costos
              </p>
            ) : (
              <div className="max-w-xl">
                <p className="text-xs font-semibold mb-2" style={{ color: '#94a3b8' }}>
                  Historial de costos &mdash; {product.producte}
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-1 px-2 font-medium" style={{ color: '#64748b' }}>
                        Cost
                      </th>
                      <th className="text-left py-1 px-2 font-medium" style={{ color: '#64748b' }}>
                        Data Inici
                      </th>
                      <th className="text-left py-1 px-2 font-medium" style={{ color: '#64748b' }}>
                        Data Fi
                      </th>
                      <th className="text-left py-1 px-2 font-medium" style={{ color: '#64748b' }}>
                        Estat
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="py-1 px-2 tabular-nums" style={{ color: '#f1f5f9' }}>
                          {fmt(h.cost)} &euro;
                        </td>
                        <td className="py-1 px-2" style={{ color: '#94a3b8' }}>
                          {h.dataInici}
                        </td>
                        <td className="py-1 px-2" style={{ color: '#94a3b8' }}>
                          {h.dataFi || '\u2014'}
                        </td>
                        <td className="py-1 px-2">
                          {h.dataFi === null ? (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' }}
                            >
                              Actiu
                            </span>
                          ) : (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: 'rgba(100, 116, 139, 0.15)', color: '#64748b' }}
                            >
                              Tancat
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
