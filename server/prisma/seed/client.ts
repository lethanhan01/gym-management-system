import { PrismaClient } from '@prisma/client'
import { getRuntimeDatabaseUrl } from '../../src/prisma/database-url'

export const prisma = new PrismaClient({ datasourceUrl: getRuntimeDatabaseUrl() })
export const SEED_PASSWORD = 'Password123!'
