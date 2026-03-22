import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()
    const costs = await sql`SELECT id, producte, cost, data_inici, data_fi, created_at FROM product_costs ORDER BY producte, data_inici DESC`
    const processed = costs.map(c => ({
      ...c,
      cost: parseFloat(c.cost),
      data_inici: c.data_inici instanceof Date ? c.data_inici.toISOString().split('T')[0] : String(c.data_inici).split('T')[0],
      data_fi: c.data_fi ? (c.data_fi instanceof Date ? c.data_fi.toISOString().split('T')[0] : String(c.data_fi).split('T')[0]) : null
    }))
    return NextResponse.json({ success: true, costs: processed })
  } catch (error) {
    console.error('Costs GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const sql = getDb()
    const { producte, cost } = await request.json()
    if (!producte || cost === undefined) {
      return NextResponse.json({ success: false, error: 'Missing producte or cost' }, { status: 400 })
    }
    const today = new Date().toISOString().split('T')[0]
    await sql`UPDATE product_costs SET data_fi = ${today} WHERE producte = ${producte} AND data_fi IS NULL`
    await sql`INSERT INTO product_costs (producte, cost, data_inici) VALUES (${producte}, ${cost}, ${today})`
    const costs = await sql`SELECT id, producte, cost, data_inici, data_fi, created_at FROM product_costs ORDER BY producte, data_inici DESC`
    const processed = costs.map(c => ({
      ...c, cost: parseFloat(c.cost),
      data_inici: c.data_inici instanceof Date ? c.data_inici.toISOString().split('T')[0] : String(c.data_inici).split('T')[0],
      data_fi: c.data_fi ? (c.data_fi instanceof Date ? c.data_fi.toISOString().split('T')[0] : String(c.data_fi).split('T')[0]) : null
    }))
    return NextResponse.json({ success: true, costs: processed })
  } catch (error) {
    console.error('Costs POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
