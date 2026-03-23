import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const proveidor = searchParams.get('proveidor');
  const categoria = searchParams.get('categoria');
  const mes = searchParams.get('mes');

  let invoices;
  if (proveidor && categoria && mes) {
    invoices = await sql`SELECT * FROM invoices WHERE proveidor = ${proveidor} AND categoria = ${categoria} AND mes = ${mes} ORDER BY data DESC, proveidor`;
  } else if (proveidor && mes) {
    invoices = await sql`SELECT * FROM invoices WHERE proveidor = ${proveidor} AND mes = ${mes} ORDER BY data DESC`;
  } else if (categoria && mes) {
    invoices = await sql`SELECT * FROM invoices WHERE categoria = ${categoria} AND mes = ${mes} ORDER BY data DESC, proveidor`;
  } else if (proveidor) {
    invoices = await sql`SELECT * FROM invoices WHERE proveidor = ${proveidor} ORDER BY data DESC`;
  } else if (categoria) {
    invoices = await sql`SELECT * FROM invoices WHERE categoria = ${categoria} ORDER BY data DESC, proveidor`;
  } else if (mes) {
    invoices = await sql`SELECT * FROM invoices WHERE mes = ${mes} ORDER BY data DESC, proveidor`;
  } else {
    invoices = await sql`SELECT * FROM invoices ORDER BY mes, proveidor`;
  }

  const summary = await sql`
    SELECT
      categoria,
      COUNT(*) as count,
      SUM(COALESCE(total, 0)) as total
    FROM invoices
    GROUP BY categoria
    ORDER BY total DESC
  `;

  const byProvider = await sql`
    SELECT
      proveidor,
      categoria,
      COUNT(*) as count,
      SUM(COALESCE(total, 0)) as total
    FROM invoices
    GROUP BY proveidor, categoria
    ORDER BY total DESC
  `;

  const byMonth = await sql`
    SELECT
      mes,
      COUNT(*) as count,
      SUM(COALESCE(total, 0)) as total
    FROM invoices
    GROUP BY mes
    ORDER BY mes
  `;

  const providers = await sql`SELECT DISTINCT proveidor FROM invoices ORDER BY proveidor`;
  const categories = await sql`SELECT DISTINCT categoria FROM invoices ORDER BY categoria`;

  return Response.json({
    invoices,
    summary,
    byProvider,
    byMonth,
    filters: {
      providers: providers.map(p => p.proveidor),
      categories: categories.map(c => c.categoria),
      months: ['01', '02', '03']
    }
  });
}
