import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)

    let from = searchParams.get('from')
    let to = searchParams.get('to')

    const allDates = await sql`SELECT DISTINCT date FROM daily_sales ORDER BY date`
    const dates = allDates.map(r => {
      if (r.date instanceof Date) return r.date.toISOString().split('T')[0]
      return String(r.date).split('T')[0]
    })

    if (!from || !to) {
      if (dates.length === 0) {
        return NextResponse.json({
          period: { start: null, end: null, days: 0 },
          products: [], productsByDate: [], categories: [],
          totals: { facturacio: 0, unitats: 0, productes: 0, ticketMig: 0 },
          daily: [], dates: []
        })
      }
      from = from || dates[0]
      to = to || dates[dates.length - 1]
    }

    const products = await sql`SELECT codi, producte, categoria, SUM(unitats)::int as unitats, SUM(import)::float as import FROM daily_sales WHERE date >= ${from} AND date <= ${to} GROUP BY codi, producte, categoria ORDER BY import DESC`

    const daily = await sql`SELECT date, SUM(import)::float as facturacio, SUM(unitats)::int as unitats FROM daily_sales WHERE date >= ${from} AND date <= ${to} GROUP BY date ORDER BY date`

    const productsByDate = await sql`SELECT date, codi, producte, unitats::int, import::float, categoria FROM daily_sales WHERE date >= ${from} AND date <= ${to} ORDER BY date, producte`

    const processedProducts = products.map(p => ({
      codi: p.codi,
      producte: p.producte,
      unitats: Number(p.unitats),
      import: Number(p.import),
      categoria: p.categoria,
      preuMig: Number(p.unitats) > 0 ? Math.round(Number(p.import) / Number(p.unitats) * 100) / 100 : 0
    }))

    const totalImport = processedProducts.reduce((s, p) => s + p.import, 0)
    const catMap = {}
    for (const p of processedProducts) {
      const cat = p.categoria || 'Altres'
      if (!catMap[cat]) catMap[cat] = { name: cat, unitats: 0, import: 0 }
      catMap[cat].unitats += p.unitats
      catMap[cat].import += p.import
    }
    const categories = Object.values(catMap)
      .map(c => ({ ...c, import: Math.round(c.import * 100) / 100, pctImport: totalImport > 0 ? Math.round(c.import / totalImport * 1000) / 10 : 0 }))
      .sort((a, b) => b.import - a.import)

    const processedDaily = daily.map(d => {
      const dt = d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date).split('T')[0]
      return { date: dt, facturacio: Number(d.facturacio), unitats: Number(d.unitats) }
    })

    const processedPBD = productsByDate.map(p => {
      const dt = p.date instanceof Date ? p.date.toISOString().split('T')[0] : String(p.date).split('T')[0]
      return { date: dt, codi: p.codi, producte: p.producte, unitats: Number(p.unitats), import: Number(p.import), categoria: p.categoria }
    })

    const totalUnitats = processedProducts.reduce((s, p) => s + p.unitats, 0)
    const ticketMig = totalUnitats > 0 ? Math.round(totalImport / totalUnitats * 100) / 100 : 0

    return NextResponse.json({
      period: { start: from, end: to, days: processedDaily.length },
      products: processedProducts,
      productsByDate: processedPBD,
      categories,
      totals: { facturacio: Math.round(totalImport * 100) / 100, unitats: totalUnitats, productes: processedProducts.length, ticketMig },
      daily: processedDaily,
      dates
    })
  } catch (error) {
    console.error('Sales GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
