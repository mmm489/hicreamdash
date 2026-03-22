import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(request) {
  try {
    const sql = getDb()
    const body = await request.json()
    const { date, products } = body

    if (!date || !products || !Array.isArray(products)) {
      return NextResponse.json(
        { success: false, error: 'Missing date or products array' },
        { status: 400 }
      )
    }

    // Delete existing data for this date
    await sql('DELETE FROM daily_sales WHERE date = $1', [date])

    // Insert all products
    for (const p of products) {
      await sql(
        'INSERT INTO daily_sales (date, codi, producte, unitats, import, categoria) VALUES ($1, $2, $3, $4, $5, $6)',
        [date, p.codi, p.producte, p.unitats, p.import, p.categoria]
      )
    }

    return NextResponse.json({
      success: true,
      date,
      products: products.length
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
