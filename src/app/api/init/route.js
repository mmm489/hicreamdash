import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()

    await sql`
      CREATE TABLE IF NOT EXISTS daily_sales (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        codi INTEGER,
        producte VARCHAR(200) NOT NULL,
        unitats INTEGER DEFAULT 0,
        import DECIMAL(10,2) DEFAULT 0,
        categoria VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS product_costs (
        id SERIAL PRIMARY KEY,
        producte VARCHAR(200) NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        data_inici DATE NOT NULL,
        data_fi DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(200) NOT NULL,
        salari_mensual DECIMAL(10,2),
        hores_setmana DECIMAL(5,1),
        actiu BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sales_date_producte
      ON daily_sales(date, producte)
    `

    return NextResponse.json({ success: true, message: 'Tables created' })
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
