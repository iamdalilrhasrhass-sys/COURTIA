let cachedColumns
let cachedTimestampColumn

const ALLOWED_TIMESTAMP_COLUMNS = ['generated_at', 'created_at', 'updated_at']

async function getPortfolioInsightColumns(pool) {
  if (cachedColumns) return cachedColumns
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'portfolio_insights'
       AND table_schema = ANY(current_schemas(false))`
  )

  cachedColumns = new Set(result.rows.map((row) => row.column_name))
  return cachedColumns
}

async function getPortfolioInsightTimestampColumn(pool) {
  if (cachedTimestampColumn !== undefined) return cachedTimestampColumn

  const available = await getPortfolioInsightColumns(pool)
  cachedTimestampColumn = ALLOWED_TIMESTAMP_COLUMNS.find((column) => available.has(column)) || null
  return cachedTimestampColumn
}

function selectPortfolioColumn(columns, column, fallback, alias = column) {
  return columns.has(column) ? column : `${fallback} AS ${alias}`
}

function getPortfolioTimestampSelect(column) {
  return column ? `${column} AS generated_at` : 'NOW() AS generated_at'
}

function getPortfolioTimestampOrder(column) {
  return column || 'id'
}

module.exports = {
  getPortfolioInsightColumns,
  getPortfolioInsightTimestampColumn,
  getPortfolioTimestampOrder,
  getPortfolioTimestampSelect,
  selectPortfolioColumn,
}
