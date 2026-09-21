// DossierOrbitalRings.jsx
// Anneaux concentriques animés représentant la complétude d'un dossier.
// Anneau externe = documents, anneau interne = champs structurés.
// Segments manquants pulsent. Hover = tooltip + action directe.
//
// Props (AUCUNE valeur par défaut chiffrée) :
//   docsScore     {number|null} — 0-100 mesuré, sinon null (« non mesuré »)
//   fieldsScore   {number|null} — 0-100 mesuré, sinon null (« non mesuré »)
//   missingDocs   {Array<{id, label, action: 'whatsapp'|'email'|'form'}>}
//   missingFields {Array<{id, label}>}
//   clientName    {string}
//   onAction      {function({type, item})}
//
// POURQUOI AUCUN DÉFAUT : ce composant portait des scores de repli chiffrés et
// deux listes d'exemple (« Relevé d'information », « Date d'effet »). Monté sans
// props — ou avec les pourcentages fabriqués de la fiche client — il affichait un
// taux de complétude et un « Prêt à tarifer » qu'aucune donnée ne soutenait
// (relevé en production le 21/09/2026). Un anneau sans mesure affiche « non
// mesuré », et « Prêt à tarifer » n'apparaît que si les DEUX mesures existent et
// valent 100 %.

import { useState } from 'react'

const ACTION_ICONS = {
  whatsapp: '💬',
  email: '✉️',
  form: '📝',
}

export default function DossierOrbitalRings({
  docsScore = null,
  fieldsScore = null,
  missingDocs = [],
  missingFields = [],
  clientName = 'Dossier',
  onAction,
  size = 220,
}) {
  const [tooltip, setTooltip] = useState(null)
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.42
  const innerR = size * 0.29
  const strokeOuter = size * 0.09
  const strokeInner = size * 0.07

  const docsMesure = Number.isFinite(docsScore)
  const champsMesure = Number.isFinite(fieldsScore)
  const completudeMesuree = docsMesure && champsMesure

  // Un score global n'a de sens que si ses DEUX composantes sont mesurées :
  // moyenner une mesure avec une inconnue produirait un chiffre inventé.
  const globalScore = completudeMesuree ? Math.round((docsScore + fieldsScore) / 2) : null
  const pretATarifer = completudeMesuree && docsScore >= 100 && fieldsScore >= 100

  const docsSurvolables = Array.isArray(missingDocs) ? missingDocs : []
  const champsSurvolables = Array.isArray(missingFields) ? missingFields : []
  const rienASignaler = docsSurvolables.length === 0 && champsSurvolables.length === 0

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCart(cx, cy, r, startAngle)
    const end = polarToCart(cx, cy, r, endAngle)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  function polarToCart(cx, cy, r, deg) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const outerFillDeg = docsMesure ? (docsScore / 100) * 340 : 0
  const innerFillDeg = champsMesure ? (fieldsScore / 100) * 340 : 0

  const scoreColor = globalScore === null
    ? '#94A3B8'
    : globalScore >= 80
    ? '#22C55E'
    : globalScore >= 55
    ? '#F59E0B'
    : '#E24B4A'

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{clientName}</p>
        {/* L'état du dossier ne s'annonce que sur des mesures réelles : sans les
            deux anneaux mesurés, aucun « Prêt à tarifer ». */}
        {completudeMesuree && (
          <span className="text-xs text-slate-400">{pretATarifer ? 'Prêt à tarifer' : 'À compléter'}</span>
        )}
      </div>

      <div className="flex items-start gap-6">
        {/* SVG rings */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Outer ring track */}
            <circle
              cx={cx} cy={cy} r={outerR}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeOuter}
              className="text-slate-100 dark:text-slate-800"
            />
            {/* Outer ring fill (docs) — seulement si mesuré */}
            {docsMesure && docsScore > 0 && (
              <path
                d={describeArc(cx, cy, outerR, 10, 10 + outerFillDeg)}
                fill="none"
                stroke="#378ADD"
                strokeWidth={strokeOuter}
                strokeLinecap="round"
              />
            )}
            {/* Outer missing segments pulse */}
            {docsMesure && docsScore < 100 && (
              <path
                d={describeArc(cx, cy, outerR, 10 + outerFillDeg + 4, 350)}
                fill="none"
                stroke="#B5D4F4"
                strokeWidth={strokeOuter}
                strokeLinecap="round"
                opacity="0.5"
                style={{ animation: 'courtia-pulse 2s ease-in-out infinite' }}
              />
            )}

            {/* Inner ring track */}
            <circle
              cx={cx} cy={cy} r={innerR}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeInner}
              className="text-slate-100 dark:text-slate-800"
            />
            {/* Inner ring fill (fields) — seulement si mesuré */}
            {champsMesure && fieldsScore > 0 && (
              <path
                d={describeArc(cx, cy, innerR, 10, 10 + innerFillDeg)}
                fill="none"
                stroke="#1D9E75"
                strokeWidth={strokeInner}
                strokeLinecap="round"
              />
            )}
            {champsMesure && fieldsScore < 100 && (
              <path
                d={describeArc(cx, cy, innerR, 10 + innerFillDeg + 4, 350)}
                fill="none"
                stroke="#9FE1CB"
                strokeWidth={strokeInner}
                strokeLinecap="round"
                opacity="0.5"
                style={{ animation: 'courtia-pulse 2.4s ease-in-out infinite' }}
              />
            )}

            {/* Center score */}
            <text
              x={cx} y={cy - 8}
              textAnchor="middle"
              fontSize={globalScore === null ? size * 0.075 : size * 0.14}
              fontWeight="600"
              fill={scoreColor}
            >
              {globalScore === null ? 'non mesuré' : `${globalScore}%`}
            </text>
            <text
              x={cx} y={cy + 10}
              textAnchor="middle"
              fontSize={size * 0.07}
              fill="currentColor"
              className="text-slate-400"
            >
              complétude
            </text>

            {/* Legend dots */}
            <circle cx={cx - 24} cy={cy + 28} r={4} fill="#378ADD" />
            <text x={cx - 16} y={cy + 32} fontSize={size * 0.065} fill="#378ADD">Docs</text>
            <circle cx={cx + 14} cy={cy + 28} r={4} fill="#1D9E75" />
            <text x={cx + 22} y={cy + 32} fontSize={size * 0.065} fill="#1D9E75">Champs</text>
          </svg>

          <style>{`
            @keyframes courtia-pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.8; }
            }
          `}</style>
        </div>

        {/* Missing items */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {docsSurvolables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1.5">
                Documents manquants
              </p>
              <div className="flex flex-col gap-1">
                {docsSurvolables.map(doc => (
                  <button
                    key={doc.id}
                    className="flex items-center gap-2 rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1.5 text-left hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors group"
                    onClick={() => onAction?.({ type: 'request_document', item: doc })}
                  >
                    <span className="text-sm">{ACTION_ICONS[doc.action] ?? '📎'}</span>
                    <span className="text-xs text-blue-700 dark:text-blue-300 flex-1 min-w-0 truncate">{doc.label}</span>
                    <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Demander →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {champsSurvolables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5">
                Champs à compléter
              </p>
              <div className="flex flex-col gap-1">
                {champsSurvolables.map(field => (
                  <button
                    key={field.id}
                    className="flex items-center gap-2 rounded-lg border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 text-left hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors group"
                    onClick={() => onAction?.({ type: 'complete_field', item: field })}
                  >
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 flex-1 min-w-0 truncate">{field.label}</span>
                    <span className="text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Remplir →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pretATarifer && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2">
              <span className="text-emerald-500 text-sm">✓</span>
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                Dossier prêt à tarifer
              </span>
            </div>
          )}

          {!docsMesure && (
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Documents : non mesuré — aucune pièce attendue n’est transmise
                par le serveur pour ce dossier.
              </span>
            </div>
          )}

          {!champsMesure && (
            <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Champs clés : non mesuré — la complétude de la fiche n’a pas pu
                être calculée.
              </span>
            </div>
          )}

          {rienASignaler && completudeMesuree && !pretATarifer && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/30 px-3 py-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Aucun manque signalé pour ce dossier.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
