let cachedTimestampColumn

const ALLOWED_TIMESTAMP_COLUMNS = ['generated_at', 'created_at', 'updated_at']

async function getPortfolioInsightTimestampColumn(pool) {
  if (cachedTimestampColumn !== undefined) return cachedTimestampColumn

  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'portfolio_insights'
       AND column_name = ANY($1)`,
    [ALLOWED_TIMESTAMP_COLUMNS]
  )

  const available = new Set(result.rows.map((row) => row.column_name))
  cachedTimestampColumn = ALLOWED_TIMESTAMP_COLUMNS.find((column) => available.has(column)) || null
  return cachedTimestampColumn
}

function getPortfolioTimestampSelect(column) {
  return column ? `${column} AS generated_at` : 'NOW() AS generated_at'
}

function getPortfolioTimestampOrder(column) {
  return column || 'id'
}

module.exports = {
  getPortfolioInsightTimestampColumn,
  getPortfolioTimestampOrder,
  getPortfolioTimestampSelect,
}
