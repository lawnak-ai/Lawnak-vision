import { BrowserWindow, screen } from 'electron'
import { promises as fs } from 'node:fs'
import { extname, join } from 'node:path'
import type { Deck, DeckAudio } from '@shared/types'
import { buildDeckDocument } from '@shared/deckHtml'
import { FRAME_MARK_PX, frameMarkColor, videoFormat, videoSeconds, VIDEO_FPS } from '@shared/video'
import { newId } from '@shared/ids'
import { setViewport } from './viewport'

// ---------- Music files ----------

export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'flac', 'webm']
const MAX_AUDIO_BYTES = 80 * 1024 * 1024
/** Music file names the app made: "<deck id>-<random>.<ext>". Anything else is refused. */
const AUDIO_NAME_RE = new RegExp(`^[a-z0-9_-]{4,64}-[a-z0-9]{4,40}\\.(${AUDIO_EXTENSIONS.join('|')})$`, 'i')

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  webm: 'audio/webm'
}

/** Keeps the music of videos, one file per deck, in the user data folder. */
export class MediaStore {
  readonly dir: string

  constructor(root: string) {
    this.dir = join(root, 'media')
  }

  /** The file for a deck's music, or null when the name is not one the app made. */
  path(audio: Pick<DeckAudio, 'file'> | undefined): string | null {
    if (!audio || !AUDIO_NAME_RE.test(audio.file)) return null
    return join(this.dir, audio.file)
  }

  /** Copies a music file the user picked, replacing the deck's earlier music. */
  async add(deckId: string, source: string): Promise<DeckAudio> {
    const ext = extname(source).slice(1).toLowerCase()
    if (!AUDIO_EXTENSIONS.includes(ext)) throw new Error('Pick an audio file: MP3, WAV, M4A, AAC, OGG, OPUS or FLAC.')
    const stat = await fs.stat(source)
    if (stat.size > MAX_AUDIO_BYTES) throw new Error('That audio file is too large (the limit is 80 MB).')
    await fs.mkdir(this.dir, { recursive: true })
    await this.removeFor(deckId)
    const file = `${deckId}-${newId('a').replace(/[^a-z0-9]/gi, '').slice(0, 24)}.${ext}`
    await fs.copyFile(source, join(this.dir, file))
    const name = source.split(/[\\/]/).pop() ?? file
    return { file, name: name.slice(0, 120), volume: 0.8 }
  }

  async read(audio: DeckAudio | undefined): Promise<{ data: Buffer; mime: string } | null> {
    const file = this.path(audio)
    if (!file) return null
    try {
      return { data: await fs.readFile(file), mime: MIME[extname(file).slice(1).toLowerCase()] ?? 'audio/mpeg' }
    } catch {
      return null
    }
  }

  /** Deletes every music file of a deck. */
  async removeFor(deckId: string): Promise<void> {
    let names: string[] = []
    try {
      names = await fs.readdir(this.dir)
    } catch {
      return
    }
    await Promise.all(
      names.filter((n) => n.startsWith(deckId + '-') && AUDIO_NAME_RE.test(n)).map((n) => fs.rm(join(this.dir, n), { force: true }))
    )
  }
}

// ---------- Recording a video, frame by frame ----------

const MAX_RETAKES = 25

/** True when the strip at the bottom of a BGRA picture shows this frame's number. */
export function markMatches(bgra: Uint8Array, width: number, height: number, frame: number): boolean {
  const [r, g, b] = frameMarkColor(frame)
  const y = height - 2
  const close = (a: number, e: number): boolean => Math.abs(a - e) <= 3
  // Check a few points along the strip.
  return [0.25, 0.5, 0.75].every((fx) => {
    const i = (y * width + Math.floor(width * fx)) * 4
    return close(bgra[i + 2], r) && close(bgra[i + 1], g) && close(bgra[i], b)
  })
}

export interface VideoJobInfo {
  jobId: string
  width: number
  height: number
  fps: number
  frames: number
}

/**
 * Plays a video deck in a hidden window on a virtual clock (VIRTUAL_TIME_JS) and takes a picture
 * of every frame. Each frame is drawn exactly on time, however long the picture takes.
 */
export class VideoRecorder {
  readonly info: VideoJobInfo
  private win: BrowserWindow | null = null
  private file: string
  private index = 0
  private scale = 1
  /** Pictures taken again because the browser had not redrawn yet (for diagnostics). */
  retakes = 0

  constructor(
    private deck: Deck,
    tmpDir: string
  ) {
    const f = videoFormat(deck)
    const seconds = videoSeconds(deck)
    this.info = {
      jobId: newId('v'),
      width: f.outWidth,
      height: f.outHeight,
      fps: VIDEO_FPS,
      frames: Math.max(1, Math.round(seconds * VIDEO_FPS))
    }
    this.file = join(tmpDir, `lv-video-${process.pid}-${this.info.jobId}.html`)
  }

  async start(): Promise<void> {
    await fs.writeFile(this.file, buildDeckDocument(this.deck, { videoMode: 'capture' }), 'utf8')
    const win = new BrowserWindow({
      show: false,
      width: 640,
      height: 360,
      useContentSize: true,
      paintWhenInitiallyHidden: true,
      webPreferences: { sandbox: true, contextIsolation: true, backgroundThrottling: false }
    })
    this.win = win
    // Scenes are untrusted HTML: never let them navigate or open windows.
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (e) => e.preventDefault())
    win.webContents.setAudioMuted(true)
    await win.loadFile(this.file)
    // Pictures come out at the screen's scale, so a viewport of the video size divided by the
    // scale gives pictures of exactly the video size. The deck scales its scenes to fill it.
    // Under it is the frame-number strip, cut off later.
    this.scale = screen.getDisplayMatching(win.getBounds()).scaleFactor || 1
    await setViewport(win, Math.round(this.info.width / this.scale), Math.round(this.info.height / this.scale) + FRAME_MARK_PX)
    await win.webContents.executeJavaScript('window.__lvReady()', true)
    // Let web fonts, images and WebGL draw before the first frame.
    await new Promise((r) => setTimeout(r, 400))
  }

  /** The next frame as raw BGRA pixels, or null when the video is finished. */
  async frame(): Promise<Buffer | null> {
    const win = this.win
    if (!win || win.isDestroyed()) throw new Error('The video recording stopped.')
    if (this.index >= this.info.frames) return null
    const n = this.index
    // Exact times, so a scene change at 2 s lands on frame 60 and not one later.
    const time = Math.round((n * 1e6) / this.info.fps) / 1000
    await win.webContents.executeJavaScript(`window.__lvAdvanceTo(${time},${n})`, true)
    const { width, height } = this.info
    let bitmap: Buffer | null = null
    // The browser may not have redrawn yet (a new scene can take a moment to draw the first
    // time): take the picture again until the strip shows this frame's number.
    for (let attempt = 0; attempt < MAX_RETAKES && !bitmap; attempt++) {
      if (attempt) {
        this.retakes++
        await new Promise((r) => setTimeout(r, 20 + attempt * 10))
      }
      let image = await win.webContents.capturePage()
      let size = image.getSize()
      if (size.width !== width) {
        // A screen scale that doesn't divide the video size evenly.
        image = image.resize({ width, height: Math.round((size.height * width) / size.width), quality: 'good' })
        size = image.getSize()
      }
      const pixels = image.toBitmap()
      if (size.height < height || pixels.length < size.width * size.height * 4) continue
      const fresh = markMatches(pixels, size.width, size.height, n)
      if (fresh || attempt === MAX_RETAKES - 1) {
        if (!fresh) console.warn(`Video frame ${n} may be stale.`)
        // Rows are stored top to bottom, so the picture is the first `height` rows.
        bitmap = Buffer.from(pixels.subarray(0, width * height * 4))
      }
    }
    if (!bitmap) throw new Error('Could not take a picture of the video frame.')
    this.index++
    return bitmap
  }

  async close(): Promise<void> {
    if (this.win && !this.win.isDestroyed()) this.win.destroy()
    this.win = null
    await fs.rm(this.file, { force: true })
  }
}
