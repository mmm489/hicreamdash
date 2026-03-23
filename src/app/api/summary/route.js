import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()

    // Get date range
    const dates = await sql`SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(DISTINCT date) as num_days FROM daily_sales`
    const minDate = dates[0].min_date ? (dates[0].min_date instanceof Date ? dates[0].min_date.toISOString().split('T')[0] : String(dates[0].min_date).split('T')[0]) : null
    const maxDate = dates[0].max_date ? (dates[0].max_date instanceof Date ? dates[0].max_date.toISOString().split('T')[0] : String(dates[0].max_date).split('T')[0]) : null
    const numDays = Number(dates[0].num_days)

    if (!minDate) {
      return NextResponse.json({ summary: 'No hi ha dades a la base de dades.' })
    }

    // Global totals
    const totals = await sql`SELECT SUM(import)::float as facturacio, SUM(unitats)::int as unitats, COUNT(DISTINCT producte) as productes FROM daily_sales`

    // Daily breakdown
    const daily = await sql`SELECT date, SUM(import)::float as facturacio, SUM(unitats)::int as unitats FROM daily_sales GROUP BY date ORDER BY date`

    // Top 15 products by revenue
    const topProducts = await sql`SELECT producte, categoria, SUM(unitats)::int as unitats, SUM(import)::float as import FROM daily_sales GROUP BY producte, categoria ORDER BY import DESC LIMIT 15`

    // Category breakdown
    const categories = await sql`SELECT categoria, SUM(unitats)::int as unitats, SUM(import)::float as import FROM daily_sales GROUP BY categoria ORDER BY import DESC`

    // Top 10 by units
    const topByUnits = await sql`SELECT producte, SUM(unitats)::int as unitats, SUM(import)::float as import FROM daily_sales GROUP BY producte ORDER BY unitats DESC LIMIT 10`

    // Average daily
    const facturacio = Number(totals[0].facturacio) || 0
    const unitats = Number(totals[0].unitats) || 0
    const ticketMig = unitats > 0 ? (facturacio / unitats) : 0
    const mitjanaDiaria = numDays > 0 ? (facturacio / numDays) : 0

    // Best and worst days
    const bestDay = daily.reduce((best, d) => Number(d.facturacio) > Number(best.facturacio) ? d : best, daily[0])
    const worstDay = daily.reduce((worst, d) => Number(d.facturacio) < Number(worst.facturacio) ? d : worst, daily[0])

    // Build text summary
    let text = `RESUM GELATERIA HI CREAM - APOLO HOLDINGS\n`
    text += `==========================================\n\n`
    text += `Periode: ${minDate} a ${maxDate} (${numDays} dies amb dades)\n\n`
    text += `TOTALS:\n`
    text += `- Facturacio total: ${facturacio.toFixed(2)} EUR\n`
    text += `- Unitats venudes: ${unitats}\n`
    text += `- Productes unics: ${totals[0].productes}\n`
    text += `- Ticket mig: ${ticketMig.toFixed(2)} EUR\n`
    text += `- Mitjana diaria: ${mitjanaDiaria.toFixed(2)} EUR\n\n`

    if (bestDay) {
      const bd = bestDay.date instanceof Date ? bestDay.date.toISOString().split('T')[0] : String(bestDay.date).split('T')[0]
      text += `Millor dia: ${bd} (${Number(bestDay.facturacio).toFixed(2)} EUR)\n`
    }
    if (worstDay) {
      const wd = worstDay.date instanceof Date ? worstDay.date.toISOString().split('T')[0] : String(worstDay.date).split('T')[0]
      text += `Pitjor dia: ${wd} (${Number(worstDay.facturacio).toFixed(2)} EUR)\n`
    }

    text += `\nVENDES PER DIA:\n`
    for (const d of daily) {
      const dt = d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date).split('T')[0]
      text += `- ${dt}: ${Number(d.facturacio).toFixed(2)} EUR (${d.unitats} uds)\n`
    }

    text += `\nTOP 15 PRODUCTES (per import):\n`
    for (const p of topProducts) {
      text += `- ${p.producte} [${p.categoria}]: ${Number(p.import).toFixed(2)} EUR (${p.unitats} uds)\n`
    }

    text += `\nTOP 10 PRODUCTES (per unitats):\n`
    for (const p of topByUnits) {
      text += `- ${p.producte}: ${p.unitats} uds (${Number(p.import).toFixed(2)} EUR)\n`
    }

    text += `\nCATEGORIES:\n`
    for (const c of categories) {
      const pct = facturacio > 0 ? (Number(c.import) / facturacio * 100).toFixed(1) : '0'
      text += `- ${c.categoria}: ${Number(c.import).toFixed(2)} EUR (${pct}%) - ${c.unitats} uds\n`
    }

    return NextResponse.json({
      summary: text,
      data: {
        period: { start: minDate, end: maxDate, days: numDays },
        totals: { facturacio, unitats, productes: Number(totals[0].productes), ticketMig: Math.round(ticketMig * 100) / 100, mitjanaDiaria: Math.round(mitjanaDiaria * 100) / 100 },
        daily: daily.map(d => ({ date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date).split('T')[0], facturacio: Number(d.facturacio), unitats: Number(d.unitats) })),
        topProducts: topProducts.map(p => ({ producte: p.producte, categoria: p.categoria, unitats: Number(p.unitats), import: Number(p.import) })),
        categories: categories.map(c => ({ name: c.categoria, unitats: Number(c.unitats), import: Number(c.import) })),
      }
    })
  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
