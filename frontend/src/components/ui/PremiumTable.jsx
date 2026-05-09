export default function PremiumTable({ columns = [], rows = [], empty = 'Aucune donnée', getRowKey }) {
  return (
    <div className="courtia-premium-table-wrap">
      <table className="courtia-premium-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key || column.label}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length || 1} className="courtia-premium-table__empty">{empty}</td></tr>
          )}
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row, index) : row.id || index}>
              {columns.map((column) => (
                <td key={column.key || column.label}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
