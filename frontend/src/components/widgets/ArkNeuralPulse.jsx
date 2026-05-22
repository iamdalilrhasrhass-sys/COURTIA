// ArkNeuralPulse.jsx
// Réseau de neurones animé qui visualise ARK en train de "penser".
// Props :
//   isThinking {boolean}  — true quand ARK est en train de traiter
//   confidence {number}   — 0-100, niveau de confiance ARK
//   label {string}        — ex: "Analyse dossier Dupont..."
//   width {number}        — largeur canvas (défaut 320)
//   height {number}       — hauteur canvas (défaut 180)
//
// Intégration : <ArkNeuralPulse isThinking={arkStatus === 'processing'} confidence={ark.confidence} label={ark.currentTask} />

import { useEffect, useRef, useState } from 'react'

const LAYERS = [3, 5, 5, 4, 2]

function buildNodes(W, H) {
  const nodes = []
  const layerX = LAYERS.map((_, i) => 40 + i * ((W - 80) / (LAYERS.length - 1)))
  LAYERS.forEach((count, li) => {
    const spacing = H / (count + 1)
    for (let ni = 0; ni < count; ni++) {
      nodes.push({
        id: nodes.length,
        layer: li,
        x: layerX[li],
        y: spacing * (ni + 1),
        phase: Math.random() * Math.PI * 2,
        activationLevel: 0,
        targetActivation: 0,
      })
    }
  })
  return nodes
}

function buildEdges(nodes) {
  const edges = []
  for (let i = 0; i < LAYERS.length - 1; i++) {
    const layerA = nodes.filter(n => n.layer === i)
    const layerB = nodes.filter(n => n.layer === i + 1)
    layerA.forEach(a => layerB.forEach(b => {
      edges.push({ from: a.id, to: b.id, weight: Math.random() * 2 - 1, pulse: 0 })
    }))
  }
  return edges
}

export default function ArkNeuralPulse({
  isThinking = false,
  confidence = 0,
  label = 'ARK en veille',
  width = 320,
  height = 180,
}) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ nodes: [], edges: [], t: 0, isThinking })
  const rafRef = useRef(null)

  useEffect(() => {
    stateRef.current.nodes = buildNodes(width, height)
    stateRef.current.edges = buildEdges(stateRef.current.nodes)
  }, [width, height])

  useEffect(() => {
    stateRef.current.isThinking = isThinking
  }, [isThinking])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      const { nodes, edges, t } = stateRef.current
      const thinking = stateRef.current.isThinking
      ctx.clearRect(0, 0, width, height)

      const dark = window.matchMedia('(prefers-color-scheme:dark)').matches
      const bg = dark ? 'rgba(30,30,35,0)' : 'rgba(255,255,255,0)'
      const nodeIdle = dark ? '#4a4a6a' : '#c5c3e8'
      const nodeActive = dark ? '#9F97E8' : '#8B5CF6'
      const nodeHot = dark ? '#f0b429' : '#BA7517'
      const edgeIdle = dark ? 'rgba(100,100,150,0.12)' : 'rgba(83,74,183,0.08)'
      const edgeActive = dark ? 'rgba(159,151,232,0.5)' : 'rgba(83,74,183,0.4)'

      if (thinking && Math.random() < 0.08) {
        const inputNode = nodes.find(n => n.layer === 0 && Math.random() < 0.6)
        if (inputNode) inputNode.targetActivation = 1
      }

      nodes.forEach(node => {
        node.activationLevel += (node.targetActivation - node.activationLevel) * 0.12
        node.targetActivation *= 0.94

        if (node.activationLevel > 0.3 && thinking) {
          const nextLayerEdges = edges.filter(e => e.from === node.id)
          nextLayerEdges.forEach(e => {
            if (Math.random() < 0.15) {
              e.pulse = 1
              const toNode = nodes[e.to]
              if (toNode) toNode.targetActivation = Math.min(1, toNode.targetActivation + 0.6)
            }
          })
        }
      })

      edges.forEach(edge => {
        edge.pulse *= 0.88
        const fromNode = nodes[edge.from]
        const toNode = nodes[edge.to]
        if (!fromNode || !toNode) return

        const activity = Math.max(fromNode.activationLevel, edge.pulse)
        ctx.beginPath()
        ctx.moveTo(fromNode.x, fromNode.y)
        ctx.lineTo(toNode.x, toNode.y)
        ctx.strokeStyle = activity > 0.2 ? edgeActive : edgeIdle
        ctx.lineWidth = 0.5 + activity * 1.5
        ctx.globalAlpha = 0.4 + activity * 0.6
        ctx.stroke()
        ctx.globalAlpha = 1
      })

      nodes.forEach(node => {
        const pulse = Math.sin(stateRef.current.t * 0.04 + node.phase) * 0.3 + 0.7
        const radius = 4 + node.activationLevel * 5
        const isHot = node.activationLevel > 0.6

        ctx.beginPath()
        ctx.arc(node.x, node.y, radius * (thinking ? pulse : 0.85), 0, Math.PI * 2)
        ctx.fillStyle = isHot ? nodeHot : node.activationLevel > 0.2 ? nodeActive : nodeIdle
        ctx.globalAlpha = 0.3 + node.activationLevel * 0.7 + (thinking ? pulse * 0.15 : 0)
        ctx.fill()
        ctx.globalAlpha = 1

        if (node.activationLevel > 0.4) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius * 1.8, 0, Math.PI * 2)
          ctx.fillStyle = isHot ? nodeHot : nodeActive
          ctx.globalAlpha = node.activationLevel * 0.15
          ctx.fill()
          ctx.globalAlpha = 1
        }
      })

      stateRef.current.t++
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [width, height])

  const confColor = confidence >= 80 ? 'text-emerald-500' : confidence >= 60 ? 'text-amber-500' : 'text-red-400'

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isThinking ? 'bg-violet-500 animate-pulse' : 'bg-slate-400'}`}
          />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {isThinking ? label : 'ARK en veille'}
          </span>
        </div>
        {isThinking && (
          <span className={`text-xs font-semibold ${confColor}`}>
            {confidence}% conf.
          </span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg w-full"
        style={{ height }}
      />

      {isThinking && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-0.5">
          <div
            className="h-0.5 rounded-full bg-violet-500 transition-all duration-700"
            style={{ width: `${confidence}%` }}
          />
        </div>
      )}
    </div>
  )
}
