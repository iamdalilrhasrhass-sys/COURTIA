async function insertStripePaymentEventIfNew(pool, event, organizationId = null, subscriptionId = null) {
  const inserted = await pool.query(
    `INSERT INTO payment_events (
      provider, event_id, event_type, organization_id, subscription_id, processed_at, is_idempotent, payload_json, created_at
    ) VALUES ('stripe', $1, $2, $3, $4, NOW(), TRUE, $5::jsonb, NOW())
    ON CONFLICT (event_id) DO NOTHING
    RETURNING id`,
    [event.id, event.type, organizationId, subscriptionId, JSON.stringify(event)]
  )
  return inserted.rows.length > 0
}

module.exports = {
  insertStripePaymentEventIfNew,
}
