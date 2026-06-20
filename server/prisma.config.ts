import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema',
  migrate: {
    seed: {
      run: 'ts-node prisma/seed/index.ts',
    },
  },
})
