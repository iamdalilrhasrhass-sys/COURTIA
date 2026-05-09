export default function PremiumTabs({ tabs = [], value, onChange }) {
  return (
    <div className="courtia-premium-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={value === tab.value ? 'is-active' : ''}
          onClick={() => onChange?.(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
