import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Config } from './types.js'

export function configDir(): string {
  return join(process.env.HOME ?? homedir(), '.archdruid')
}

export function configPath(): string {
  return join(configDir(), 'config.json')
}

export function historyPath(): string {
  return join(configDir(), 'history.json')
}

export const defaultConfig: Config = {
  sources: {
    github:        { enabled: true,  token: '' },
    arxiv:         { enabled: true },
    stackoverflow: { enabled: true,  key: '' },
    reddit:        { enabled: false, clientId: '', clientSecret: '' },
  },
  defaults: {
    maxResults: 20,
    dateFilter: {
      enabled: true,
      lookbackMonths: 6,
      allowOverride: true,
    },
  },
}

export async function loadConfig(): Promise<Config> {
  await mkdir(configDir(), { recursive: true })
  try {
    const raw = await readFile(configPath(), 'utf8')
    return JSON.parse(raw) as Config
  } catch {
    await writeFile(configPath(), JSON.stringify(defaultConfig, null, 2))
    return structuredClone(defaultConfig)
  }
}

export async function saveConfig(cfg: Config): Promise<void> {
  await mkdir(configDir(), { recursive: true })
  await writeFile(configPath(), JSON.stringify(cfg, null, 2))
}
