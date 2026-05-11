const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--aurora-space-3)',
    margin: 'var(--aurora-space-4) 0',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'var(--aurora-border-soft)',
  },
  label: {
    fontSize: 'var(--aurora-text-xs)',
    color: 'var(--aurora-text-muted)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
};

export function AuroraDivider({ label, vertical = false, spacing, ...props }) {
  if (vertical) {
    return (
      <div
        style={{
          width: 1,
          backgroundColor: 'var(--aurora-border-soft)',
          alignSelf: 'stretch',
          margin: spacing ? `0 ${spacing}` : '0 var(--aurora-space-3)',
        }}
        {...props}
      />
    );
  }

  if (!label) {
    return (
      <div
        style={{
          height: 1,
          backgroundColor: 'var(--aurora-border-soft)',
          margin: spacing || 'var(--aurora-space-4) 0',
        }}
        {...props}
      />
    );
  }

  return (
    <div style={{ ...styles.container, margin: spacing || styles.container.margin }} {...props}>
      <div style={styles.line} />
      <span style={styles.label}>{label}</span>
      <div style={styles.line} />
    </div>
  );
}

export default AuroraDivider;
