import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureLocalServer, listLocalModels, resolveLocalModel, serveArgs } from '../src/main/ai/fastgguf'
import { AiError } from '../src/main/ai/prompt'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'lv-gguf-'))
})
afterEach(() => rm(dir, { recursive: true, force: true }))

describe('listLocalModels', () => {
  it('finds .gguf files in the folder and its subfolders, but not vision projectors', async () => {
    await writeFile(join(dir, 'Llama-3.2-1B.gguf'), '')
    await writeFile(join(dir, 'notes.txt'), '')
    await writeFile(join(dir, 'mmproj-model-f16.gguf'), '')
    await mkdir(join(dir, 'qwen'))
    await writeFile(join(dir, 'qwen', 'Qwen3-8B.GGUF'), '')
    expect(await listLocalModels(dir)).toEqual(['Llama-3.2-1B.gguf', 'qwen/Qwen3-8B.GGUF'])
  })

  it('says what to do when the folder is missing', async () => {
    await expect(listLocalModels('')).rejects.toBeInstanceOf(AiError)
    await expect(listLocalModels(join(dir, 'nope'))).rejects.toThrow('Choose it again in Settings')
  })
})

describe('resolveLocalModel', () => {
  it('keeps model files inside the models folder', () => {
    expect(resolveLocalModel(dir, 'qwen/a.gguf')).toBe(resolve(dir, 'qwen', 'a.gguf'))
    expect(() => resolveLocalModel(dir, '../a.gguf')).toThrow(AiError)
    expect(() => resolveLocalModel(dir, resolve(tmpdir(), 'a.gguf'))).toThrow(AiError)
    expect(() => resolveLocalModel(dir, 'a.exe')).toThrow(AiError)
  })
})

describe('fastgguf server', () => {
  it('passes the port, then the context size', () => {
    expect(serveArgs('C:/m/a.gguf', 51234, 16384)).toEqual(['serve', 'C:/m/a.gguf', '51234', '16384'])
  })

  it('explains a missing program or model before starting anything', async () => {
    const signal = new AbortController().signal
    const cfg = { exe: join(dir, 'fastgguf.exe'), modelsDir: dir, model: 'a.gguf', ctx: 4096, device: 'auto' as const }
    await expect(ensureLocalServer(cfg, signal)).rejects.toThrow('fastgguf was not found')
    await writeFile(cfg.exe, '')
    await expect(ensureLocalServer(cfg, signal)).rejects.toThrow('not in the models folder')
    await expect(ensureLocalServer({ ...cfg, exe: '' }, signal)).rejects.toThrow('Choose the fastgguf program')
  })
})
