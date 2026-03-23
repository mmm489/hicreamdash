'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6', '#e11d48'];
const MONTH_NAMES = { '01': 'Gener', '02': 'Febrer', '03': 'Març', '04': 'Abril', '05': 'Maig', '06': 'Juny' };

export default function CostosPage() {
  const [data, setData] = useState(null);
  const [filterProv, setFilterProv] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterProv) params.set('proveidor', filterProv);
      if (filterCat) params.set('categoria', filterCat);
      if (filterMes) params.set('mes', filterMes);
      const res = await fetch(`/api/invoices?${params}`);
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    fetchData();
  }, [filterProv, filterCat, filterMes]);

  const filteredTotal = useMemo(() => {
    if (!data) return 0;
    return data.invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
  }, [data]);

  const filteredCount = data?.invoices?.length || 0;

  if (loading && !data) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-amber-400 text-xl">Carregant factures...</div>
    </div>
  );

  const catData = (data?.summary || [])
    .filter(c => parseFloat(c.total) > 0 && c.categoria !== 'Vendes')
    .map(c => ({ name: c.categoria, value: parseFloat(c.total), count: parseInt(c.count) }));

  const provData = (data?.byProvider || [])
    .filter(p => parseFloat(p.total) > 0 && p.categoria !== 'Vendes')
    .slice(0, 15)
    .map(p => ({ name: p.proveidor, total: parseFloat(p.total), count: parseInt(p.count) }));

  const monthData = (data?.byMonth || []).map(m => ({
    name: MONTH_NAMES[m.mes] || m.mes,
    total: parseFloat(m.total),
    count: parseInt(m.count)
  }));

  const totalDespeses = catData.reduce((s, c) => s + c.value, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Costos & Factures</h1>
            <p className="text-gray-400 text-sm">Apolo Holdings 2020 SLU - Hi Cream - 2026</p>
          </div>
          <Link href="/" className="text-gray-400 hover:text-amber-400 transition">
            ← Dashboard Vendes
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Total Factures</p>
            <p className="text-3xl font-bold text-white">{filteredCount}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Total Import</p>
            <p className="text-3xl font-bold text-amber-400">{filteredTotal.toLocaleString('ca-ES', {minimumFractionDigits: 2})} €</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Despeses (sense vendes)</p>
            <p className="text-3xl font-bold text-red-400">{totalDespeses.toLocaleString('ca-ES', {minimumFractionDigits: 2})} €</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Mitjana/Factura</p>
            <p className="text-3xl font-bold text-blue-400">{filteredCount > 0 ? (filteredTotal / filteredCount).toFixed(2) : '0'} €</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Proveïdor</label>
              <select value={filterProv} onChange={e => setFilterProv(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Tots</option>
                {data?.filters?.providers?.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Categoria</label>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Totes</option>
                {data?.filters?.categories?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Mes</label>
              <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Tots</option>
                <option value="01">Gener</option>
                <option value="02">Febrer</option>
                <option value="03">Març</option>
              </select>
            </div>
            {(filterProv || filterCat || filterMes) && (
              <button onClick={() => { setFilterProv(''); setFilterCat(''); setFilterMes(''); }}
                className="self-end bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Netejar filtres
              </button>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie by category */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Despeses per Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString('ca-ES', {minimumFractionDigits: 2}) + ' €'} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar by provider */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Top Proveïdors</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={provData} layout="vertical" margin={{left: 120}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis dataKey="name" type="category" tick={{fill: '#9ca3af', fontSize: 11}} width={110} />
                <Tooltip formatter={(v) => v.toLocaleString('ca-ES', {minimumFractionDigits: 2}) + ' €'} contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151'}} />
                <Bar dataKey="total" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar by month */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Despeses per Mes</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{fill: '#9ca3af'}} />
                <YAxis tick={{fill: '#9ca3af'}} />
                <Tooltip formatter={(v) => v.toLocaleString('ca-ES', {minimumFractionDigits: 2}) + ' €'} contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151'}} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-gray-200">Detall Factures ({filteredCount})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400">Proveïdor</th>
                  <th className="text-left px-4 py-3 text-gray-400">Categoria</th>
                  <th className="text-left px-4 py-3 text-gray-400">Mes</th>
                  <th className="text-left px-4 py-3 text-gray-400">Data</th>
                  <th className="text-right px-4 py-3 text-gray-400">Import (€)</th>
                  <th className="text-left px-4 py-3 text-gray-400">Arxiu</th>
                </tr>
              </thead>
              <tbody>
                {data?.invoices?.map((inv, i) => (
                  <tr key={inv.id || i} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-2 font-medium text-white">{inv.proveidor}</td>
                    <td className="px-4 py-2">
                      <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">{inv.categoria}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-400">{MONTH_NAMES[inv.mes] || inv.mes}</td>
                    <td className="px-4 py-2 text-gray-400">{inv.data || '-'}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {inv.total ? (
                        <span className={parseFloat(inv.total) > 0 ? 'text-amber-400' : 'text-gray-500'}>
                          {parseFloat(inv.total).toLocaleString('ca-ES', {minimumFractionDigits: 2})}
                        </span>
                      ) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{inv.arxiu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
