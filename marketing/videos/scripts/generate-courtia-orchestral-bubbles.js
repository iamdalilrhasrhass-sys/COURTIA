#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const assetsDir = path.resolve(__dirname, '../assets/screenshots')
const audioPath = path.resolve(__dirname, '../assets/audio/orchestral-bed.mp3')
const exportDir = path.resolve(__dirname, '../exports')
const outputFile = path.join(exportDir, 'courtia-orchestral-bubbles.mp4')

const sequence = [
  { file: 'dashboard.png', duration: 3.6, caption: 'BOUM Dashboard · POP Priorités du jour' },
  { file: 'clients.png', duration: 3.6, caption: 'BOUM Clients · POP Clients à risque' },
  { file: 'client-detail.png', duration: 3.8, caption: 'BOUM Fiche client · POP Vue 360' },
  { file: 'dashboard.png', duration: 3.6, caption: 'BOUM Contrats · POP Échéances sous contrôle' },
  { file: 'dashboard.png', duration: 3.6, caption: 'BOUM Tâches · POP Actions à traiter' },
  { file: 'morning-brief.png', duration: 3.8, caption: 'BOUM Morning Brief · POP Plan intelligent' },
  { file: 'dashboard.png', duration: 3.6, caption: 'BOUM Rapports · POP Pilotage cabinet' },
  { file: 'admin-costs.png', duration: 3.8, caption: 'BOUM Admin Costs · POP Coûts IA maîtrisés' },
  { file: 'dashboard.png', duration: 4.2, caption: 'COURTIA · Votre portefeuille devient vivant.' },
]

function resolveSequenceFile(file) {
  const direct = path.join(assetsDir, file)
  if (fs.existsSync(direct)) return file
  if (file === 'client-detail.png') {
    const fallback = path.join(assetsDir, 'clients.png')
    if (fs.existsSync(fallback)) return 'clients.png'
  }
  return null
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { stdio: 'pipe', encoding: 'utf8', ...options })
}

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000)
  const hh = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  const mmm = String(ms % 1000).padStart(3, '0')
  return `${hh}:${mm}:${ss},${mmm}`
}

function ffmpegInstalled() {
  return run('ffmpeg', ['-version']).status === 0
}

function ffmpegSupportsSubtitles() {
  const check = run('ffmpeg', ['-filters'])
  return check.status === 0 && /\bsubtitles\b/i.test(`${check.stdout}\n${check.stderr}`)
}

function buildTempFiles() {
  const resolvedSequence = sequence.map((item) => ({
    ...item,
    file: resolveSequenceFile(item.file),
  }))
  const missing = resolvedSequence.filter((item) => !item.file)
  if (missing.length > 0) {
    throw new Error(`Captures manquantes: ${missing.map((m) => m.caption).join(', ')}`)
  }

  fs.mkdirSync(exportDir, { recursive: true })
  const tmpDir = fs.mkdtempSync(path.join(exportDir, 'tmp-orch-'))

  const concatPath = path.join(tmpDir, 'slides.txt')
  const subtitlesPath = path.join(tmpDir, 'captions.srt')

  let current = 0
  const concatLines = []
  const subtitleBlocks = []

  resolvedSequence.forEach((item, index) => {
    const filePath = path.join(assetsDir, item.file)
    concatLines.push(`file '${filePath.replace(/'/g, "'\\''")}'`)
    concatLines.push(`duration ${item.duration}`)

    const start = current
    current += item.duration

    subtitleBlocks.push([
      String(index + 1),
      `${srtTime(start)} --> ${srtTime(current)}`,
      item.caption,
      '',
    ].join('\n'))
  })

  const lastPath = path.join(assetsDir, resolvedSequence[resolvedSequence.length - 1].file)
  concatLines.push(`file '${lastPath.replace(/'/g, "'\\''")}'`)

  fs.writeFileSync(concatPath, `${concatLines.join('\n')}\n`, 'utf8')
  fs.writeFileSync(subtitlesPath, `${subtitleBlocks.join('\n')}\n`, 'utf8')

  return { tmpDir, concatPath, subtitlesPath }
}

function main() {
  if (!ffmpegInstalled()) {
    console.log(JSON.stringify({
      success: false,
      reason: 'ffmpeg_non_disponible',
      message: 'Installez ffmpeg pour générer les MP4 automatiquement.',
      outputFile,
    }, null, 2))
    return
  }

  const { tmpDir, concatPath, subtitlesPath } = buildTempFiles()
  const escapedSrtPath = subtitlesPath
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
  const supportsSubtitles = ffmpegSupportsSubtitles()

  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatPath,
  ]

  const hasAudio = fs.existsSync(audioPath)
  if (hasAudio) {
    args.push('-stream_loop', '-1', '-i', audioPath)
  }

  const videoFilter = supportsSubtitles
    ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.08:saturation=1.12,subtitles=filename='${escapedSrtPath}':force_style='FontName=Arial\\,FontSize=40\\,PrimaryColour=&H00FFFFFF\\,Outline=1\\,OutlineColour=&H00000000\\,BackColour=&H77000000\\,BorderStyle=3\\,Alignment=2\\,MarginV=90'`
    : 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.08:saturation=1.12'

  args.push('-vf', videoFilter, '-r', '30', '-pix_fmt', 'yuv420p')

  if (hasAudio) args.push('-shortest')

  args.push(outputFile)

  const render = run('ffmpeg', args)
  if (render.status !== 0) {
    console.error(render.stderr)
    throw new Error('ffmpeg_render_failed')
  }

  fs.rmSync(tmpDir, { recursive: true, force: true })

  console.log(JSON.stringify({
    success: true,
    outputFile,
    withAudio: hasAudio,
    captionsBurned: supportsSubtitles,
  }, null, 2))
}

main()
