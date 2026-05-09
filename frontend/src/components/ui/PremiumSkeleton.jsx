export default function PremiumSkeleton({ rows = 3 }) {
  return (
    <div className="courtia-premium-skeleton" aria-label="Chargement">
      {Array.from({ length: rows }).map((_, index) => <span key={index} />)}
    </div>
  )
}
