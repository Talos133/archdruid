import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig, saveConfig, defaultConfig } from '../src/config.js'

const ORIG_HOME = process.env.HOME

describe('config', () => {
  let tmpHome: string

  beforeEach(() => {
    tmpHome = mkdtempSync(join(tmpdir(), 'archdruid-test-'))
    process.env.HOME = tmpHome
  })

  afterEach(() => {
    process.env.HOME = ORIG_HOME
    rmSync(tmpHome, { recursive: true, force: true })
  })

  it('returns default config when no file exists', async () => {
    const cfg = await loadConfig()
    expect(cfg.defaults.maxResults).toBe(20)
    expect(cfg.sources.github.enabled).toBe(true)
    expect(cfg.sources.reddit.enabled).toBe(false)
  })

  it('creates config file on first load', async () => {
    await loadConfig()
    const { existsSync } = await import('node:fs')
    expect(existsSync(join(tmpHome, '.archdruid', 'config.json'))).toBe(true)
  })

  it('round-trips a modified config', async () => {
    const cfg = await loadConfig()
    cfg.sources.github.token = 'ghp_test123'
    await saveConfig(cfg)
    const reloaded = await loadConfig()
    expect(reloaded.sources.github.token).toBe('ghp_test123')
  })
})
