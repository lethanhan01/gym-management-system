/* eslint-disable no-console */
import 'reflect-metadata'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { config as loadDotenv } from 'dotenv'
import { validateConfig } from './configuration'

for (const file of ['.env', '.env.local']) {
  const path = resolve(process.cwd(), file)
  if (existsSync(path)) loadDotenv({ path, override: file === '.env.local' })
}

try {
  validateConfig(process.env)
  console.log('Environment configuration is valid.')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
