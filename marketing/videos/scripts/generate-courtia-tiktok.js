#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const assetsDir = path.resolve(__dirname, '../assets/screenshots')
const audioPath = path.resolve(__dirname, '../assets/audio/tiktok-bed.mp3')
const exportDir = path.resolve(__dirname, '../exports')
const outputFile = path.join(exportDir, 'courtia-tiktok-presentation.mp4')

const slides = [
  { file: 'dashboard.png', duration: 3.5, caption: 'Courtiers : votre CRM doit enfin travailler pour vous.' },
  { file: 'dashboard.png', duration: 4.0, caption: 'ARK priorise vos journées.' },
  { file: 'clients.png', duration: 5.0, caption: 'Repérez vos clients à risque.' },
  { file: 'client-detail.png', duration: 5.0, caption: 'Chaque fiche client devient une vue 360.' },
  { file: 'morning-brief.png', duration: 5.0, caption: 'Morning Brief : votre plan d\'action quotidien.' },
  { file: 'admin-costs.png', duration: 5.0, caption: 'Admin, coûts IA, pilotage : tout est centralisé.' },
  { file: 'dashboard.png', duration: 4.5, caption: 'COURTIA — Le cockpit IA des courtiers.' },
]

function resolveSlideFile(file) {
  const direct = path.join(assetsDir, file)
  if (fs.existsSync(direct)) return file
  if (file === 'client-detail.png') {
    const fallback = path.join(assetsDir, 'clients.png')
    if (fs.existsSync(fallback)) return 'clients.png'
  }
  return null
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'pipe', encoding: 'utf8', ...options })
  return result
}

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000)
  const hh = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  const mmm = String(ms % 1000).padStart(3, '0')
  return `${hh}:${mm}:${ss},${mmm}`
}

function buildAssets() {
  const resolvedSlides = slides.map((slide) => ({
    ...slide,
    file: resolveSlideFile(slide.file),
  }))
  const missing = resolvedSlides.filter((slide) => !slide.file)
  if (missing.length > 0) {
    throw new Error(`Captures manquantes: ${missing.map((m) => m.caption).join(', ')}`)
  }

  fs.mkdirSync(exportDir, { recursive: true })
  const tmpDir = fs.mkdtempSync(path.join(exportDir, 'tmp-tiktok-'))

  const concatFile = path.join(tmpDir, 'slides.txt')
  const srtFile = path.join(tmpDir, 'captions.srt')

  const concatLines = []
  let cursor = 0
  const srtBlocks = []

  resolvedSlides.forEach((slide, index) => {
    const filePath = path.join(assetsDir, slide.file)
    concatLines.push(`file '${filePath.replace(/'/g, "'\\''")}'`)
    concatLines.push(`duration ${slide.duration}`)

    const start = cursor
    cursor += slide.duration
    const end = cursor

    srtBlocks.push([
      String(index + 1),
      `${srtTime(start)} --> ${srtTime(end)}`,
      slide.caption,
      '',
    ].join('\n'))
  })

  const lastFile = path.join(assetsDir, resolvedSlides[resolvedSlides.length - 1].file)
  concatLines.push(`file '${lastFile.replace(/'/g, "'\\''")}'`)

  fs.writeFileSync(concatFile, `${concatLines.join('\n')}\n`, 'utf8')
  fs.writeFileSync(srtFile, `${srtBlocks.join('\n')}\n`, 'utf8')

  return { tmpDir, concatFile, srtFile }
}

function ffmpegInstalled() {
  const check = run('ffmpeg', ['-version'])
  return check.status === 0
}

function ffmpegSupportsSubtitles() {
  const check = run('ffmpeg', ['-filters'])
  return check.status === 0 && /\bsubtitles\b/i.test(`${check.stdout}\n${check.stderr}`)
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

  const { tmpDir, concatFile, srtFile } = buildAssets()
  const escapedSrtPath = srtFile
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
  const supportsSubtitles = ffmpegSupportsSubtitles()

  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
  ]

  const hasAudio = fs.existsSync(audioPath)
  if (hasAudio) {
    args.push('-stream_loop', '-1', '-i', audioPath)
  }

  const videoFilter = supportsSubtitles
    ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles=filename='${escapedSrtPath}':force_style='FontName=Arial\\,FontSize=42\\,PrimaryColour=&H00FFFFFF\\,Outline=1\\,OutlineColour=&H00000000\\,BackColour=&H77000000\\,BorderStyle=3\\,Alignment=2\\,MarginV=90'`
    : 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'

  args.push('-vf', videoFilter, '-r', '30', '-pix_fmt', 'yuv420p')

  if (hasAudio) {
    args.push('-shortest')
  }

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
