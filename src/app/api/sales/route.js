import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)

    let from = searchParams.get('from')
    let to = searchParams.get('to')

    // Get all distinct dates
    const allDates = await sql`SELECT DISTINCT date FROM daily_sales ORDER BY date`
    const dates = allDates.map(r => r.date.toISOString().split('T')[0])

    if (!from || !to) {
      if (dates.length === 0) {
        return NextResponse.json({
          period: { start: null, end: null, days: 0 },
          products: [],
          productsByDate: [],
          categories: [],
          totals: { facturacio: 0, unitats: 0, productes: 0, ticketMig: 0 },
          daily: [],
          dates: []
        })
      }
      from = from || dates[0]
      to = to || dates[dates.length - 1]
    }

    // Get products aggregated
    const products = await sql(
      'SELECT codi, producte, categoria, SUM(unitats) as unitats, SUM(import) as import FROM daily_sales WHERE date >= $1 AND date <= $2 GROUP BY codi, producte, categoria ORDER BY import DESC',
      [from, to]
    )

    // Get daily totals
    const daily = await sql(
      'SELECT date, SUM(import) as facturacio, SUM(unitats) as unitats FROM daily_sales WHERE date >= $1 AND date <= $2 GROUP BY date ORDER BY date',
      [from, to]
    )

    // Get products by date
    const productsByDate = await sql(
      'SELECT date, codi, producte, unitats, import, categoria FROM daily_sales WHERE date >= $1 AND date <= $2 ORDER BY date, producte',
      [from, to]
    )

    // Process products with preuMig
    const processedProducts = products.map(p => ({
      codi: p.codi,
      producte: p.producte,
      unitats: parseInt(p.unitats),
      import: parseFloat(p.import),
      categoria: p.categoria,
      preuMig: parseInt(p.unitats) > 0
        ? parseFloat((parseFloat(p.import) / parseInt(p.unitats)).toFixed(2))
        : 0
    }))

    // Calculate category aggregates
    const totalImport = processedProducts.reduce((sum, p) => sum + p.import, 0)
    const categoryMap = {}
    for (const p of processedProducts) {
      const cat = p.categoria || 'Sense categoria'
      if (!categoryMap[cat]) {
        categoryMap[cat] = { name: cat, unitats: 0, import: 0 }
      }
      categoryMap[cat].unitats += p.unitats
      categoryMap[cat].import += p.import
    }
    const categories = Object.values(categoryMap)
      .map(c => ({
        ...c,
        import: parseFloat(c.import.toFixed(2)),
        pctImport: totalImport > 0
          ? parseFloat(((c.import / totalImport) * 100).toFixed(1))
          : 0
      }))
      .sort((a, b) => b.import - a.import)

    // Process daily
    const processedDaily = daily.map(d => ({
      date: d.date.toISOString().split('T')[0],
      facturacio: parseFloat(d.facturacio),
      unitats: parseInt(d.unitats)
    }))

    // Process products by date
    const processedProductsByDate = productsByDate.map(p => ({
      date: p.date.toISOString().split('T')[0],
      codi: p.codi,
      producte: p.producte,
      unitats: parseInt(p.unitats),
      import: parseFloat(p.import),
      categoria: p.categoria
    }))

    // Calculate totals
    const totalFacturacio = parseFloat(totalImport.toFixed(2))
    const totalUnitats = processedProducts.reduce((sum, p) => sum + p.unitats, 0)
    const numDays = processedDaily.length
    const ticketMig = numDays > 0
      ? parseFloat((totalFacturacio / numDays).toFixed(2))
      : 0

    // Calculate period days
    const startDate = new Date(from)
    const endDate = new Date(to)
    const periodDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

    return NextResponse.json({
      period: { start: from, end: to, days: periodDays },
      products: processedProducts,
      productsByDate: processedProductsByDate,
      categories,
      totals: {
        facturacio: totalFacturacio,
        unitats: totalUnitats,
        productes: processedProducts.length,
        ticketMig
      },
      daily: processedDaily,
      dates
    })
  } catch (error) {
    console.error('Sales GET error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
