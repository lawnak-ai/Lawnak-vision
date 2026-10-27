// Turns the frames the main process records into a video file, with the music mixed in.
// Encoding uses the browser's WebCodecs (hardware H.264 where there is one) through Mediabunny.
import {
  AudioBufferSource,
  BufferTarget,
  canEncodeAudio,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSample,
  VideoSampleSource,
  WebMOutputFormat
} from 'mediabunny'
import type { VideoJob } from '../../preload/api'
import { AUDIO_FADE_SECONDS, VIDEO_FORMATS } from '@shared/video'

export class VideoExportCancelled extends Error {}

export interface VideoExportControl {
  cancelled: boolean
}

/** MP4 (H.264 + AAC) where this computer can encode it at every video size, else WebM (VP9 + Opus). */
async function pickContainer(): Promise<'mp4' | 'webm'> {
  for (const f of VIDEO_FORMATS) {
    const ok = await getFirstEncodableVideoCodec(['avc'], { width: f.outWidth, height: f.outHeight })
    if (!ok) return 'webm'
  }
  return 'mp4'
}

/**
 * The music as it plays under the video: its volume, looped if it is shorter than the video,
 * cut at the end of the video, with a short fade out.
 */
async function mixMusic(audio: NonNullable<VideoJob['audio']>, seconds: number): Promise<AudioBuffer> {
  const rate = 48000
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(seconds * rate)), rate)
  const bytes = audio.data.buffer.slice(audio.data.byteOffset, audio.data.byteOffset + audio.data.byteLength) as ArrayBuffer
  const decoded = await ctx.decodeAudioData(bytes)
  const src = ctx.createBufferSource()
  src.buffer = decoded
  src.loop = true
  const gain = ctx.createGain()
  const volume = Math.max(0, Math.min(1, audio.volume))
  const fadeStart = Math.max(0, seconds - AUDIO_FADE_SECONDS)
  gain.gain.setValueAtTime(volume, 0)
  gain.gain.setValueAtTime(volume, fadeStart)
  gain.gain.linearRampToValueAtTime(0, seconds)
  src.connect(gain).connect(ctx.destination)
  src.start(0)
  return ctx.startRendering()
}

/**
 * Exports a video deck. Asks where to save, records every frame, encodes, and returns the saved
 * file's path (null when the user cancelled the save dialog). `onProgress` gets 0..1.
 * Set control.cancelled to stop; the promise then rejects with VideoExportCancelled.
 */
export async function exportVideo(
  deckId: string,
  onProgress: (fraction: number, note?: string) => void,
  control: VideoExportControl
): Promise<{ path: string; warning?: string } | null> {
  const container = await pickContainer()
  const job = await window.api.videoBegin(deckId, container)
  if (!job) return null
  let output: Output | null = null
  let warning: string | undefined
  let next: Promise<Uint8Array | null> | null = null
  try {
    output = new Output({
      format: container === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
      target: new BufferTarget()
    })
    const videoCodec =
      container === 'mp4' ? 'avc' : await getFirstEncodableVideoCodec(['vp9', 'vp8', 'av1'], { width: job.width, height: job.height })
    if (!videoCodec) throw new Error('This computer cannot encode video.')
    const video = new VideoSampleSource({ codec: videoCodec, quality: QUALITY_HIGH, keyFrameInterval: 2 })
    output.addVideoTrack(video, { frameRate: job.fps })

    const seconds = job.frames / job.fps
    let music: { source: AudioBufferSource; buffer: AudioBuffer } | null = null
    if (job.audio) {
      onProgress(0, 'Preparing the music…')
      const codec = container === 'mp4' ? 'aac' : 'opus'
      try {
        const buffer = await mixMusic(job.audio, seconds)
        if (!(await canEncodeAudio(codec, { numberOfChannels: 2, sampleRate: buffer.sampleRate }))) {
          throw new Error('no encoder')
        }
        music = { source: new AudioBufferSource({ codec, quality: QUALITY_HIGH }), buffer }
        output.addAudioTrack(music.source)
      } catch {
        warning = 'The music could not be read, so the video has no sound.'
      }
    }

    await output.start()
    if (music) {
      await music.source.add(music.buffer)
      music.source.close()
    }

    // Ask for the next frame while this one is being encoded.
    next = window.api.videoFrame(job.jobId)
    for (let i = 0; i < job.frames && next; i++) {
      const pixels = await next
      if (control.cancelled) throw new VideoExportCancelled('Stopped.')
      if (!pixels) break
      next = i + 1 < job.frames ? window.api.videoFrame(job.jobId) : null
      const sample = new VideoSample(pixels, {
        format: 'BGRA',
        codedWidth: job.width,
        codedHeight: job.height,
        timestamp: i / job.fps,
        duration: 1 / job.fps
      })
      try {
        await video.add(sample)
      } finally {
        sample.close()
      }
      onProgress((i + 1) / job.frames)
    }
    video.close()
    onProgress(1, 'Saving…')
    await output.finalize()
    const data = (output.target as BufferTarget).buffer
    if (!data) throw new Error('The video could not be made.')
    const path = await window.api.videoFinish(job.jobId, new Uint8Array(data))
    return { path, warning }
  } catch (e) {
    // A frame may still be on its way; the recording stops below, so it will fail.
    void next?.catch(() => undefined)
    await output?.cancel().catch(() => undefined)
    await window.api.videoCancel(job.jobId).catch(() => undefined)
    throw e
  }
}
