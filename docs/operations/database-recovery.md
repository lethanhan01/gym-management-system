# Database recovery runbook

## Before restoring

1. Stop the API and every worker that can write to PostgreSQL.
2. Create and securely store a logical snapshot of the current database with `pg_dump`.
3. In Supabase Dashboard, review replication slots and subscriptions; follow Dashboard prompts before restoring.
4. Select the PITR point immediately before the incident. For the 24 July 2026 incident, use **14:43:59 ICT**.

## Restore and verify

1. Restore the selected PITR point in Supabase Dashboard. The project is unavailable while the restore runs.
2. Recreate any subscriptions or replication slots that Supabase requires to be removed.
3. Restart the API only after `npm run config:check` passes, then run `npm run prisma:smoke` as a read-only verification.
4. Verify row counts, foreign-key relationships, authentication, and business records. Keep the emergency snapshot until the owner accepts the restored data.

## Safety rules

- Production has no seed or reset command.
- Before every `prisma:push`, create a backup or clone and review the schema change.
- CI runs `npm run db:safety:check` to block reset flags, Prisma seed commands, and unscoped `deleteMany()` in Prisma/scripts.
