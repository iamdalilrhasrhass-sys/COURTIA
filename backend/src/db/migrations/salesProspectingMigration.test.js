const fs = require('fs')
const path = require('path')

describe('043_sales_prospecting_fr migration', () => {
  const sql = fs.readFileSync(path.join(__dirname, '043_sales_prospecting_fr.sql'), 'utf8')

  test.each([
    'sales_import_jobs', 'sales_import_rows', 'sales_cabinets', 'sales_cabinet_assignments',
    'sales_cabinet_locks', 'sales_calls', 'sales_cabinet_notes', 'sales_followups',
    'sales_appointments', 'sales_proposals', 'sales_status_history', 'sales_audit_log',
  ])('creates required table %s', (table) => {
    expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(`))
  })

  test('makes the audit journal append-only at database level', () => {
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON sales_audit_log')
    expect(sql).toContain("RAISE EXCEPTION 'sales_audit_log is append-only'")
  })

  test('includes all critical user lifecycle columns', () => {
    for (const column of ['username', 'must_change_password', 'deleted_at', 'last_login_at', 'status', 'suspended_at', 'suspended_reason']) {
      expect(sql).toContain(`ADD COLUMN IF NOT EXISTS ${column}`)
    }
  })
})
