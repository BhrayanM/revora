# Backup & Recovery Readiness

## Overview
This document outlines the backup and recovery procedures for the Revora / AI Growth Platform. Currently, the system is in **LIVE BACKUP NOT ACTIVATED** mode, as production infrastructure is not yet provisioned. The procedures below are designed to be **BACKUP READY** and **RESTORE READY** once the production ready is acquired.

## Metrics
- **Target RPO (Recovery Point Objective):** 24 hours (nightly backups).
- **Target RTO (Recovery Time Objective):** 4 hours.

## Database Backup Strategy (Supabase/Postgres)
We will leverage Supabase's built-in Point-in-Time Recovery (PITR) or daily automated backups (depending on the plan).
For cross-region disaster recovery or logical backups, we use `pg_dump`.

### Automated Backup Script (Dry-Run Available)
A script has been created at `scripts/backup-db.mjs` which can be scheduled via cron or a GitHub Action to perform a logical backup of the database schemas and data using `pg_dump`.

### Database Restore Procedure
1. Create a fresh PostgreSQL instance or clear the existing database.
2. Run `psql -h <host> -p 5432 -d <database> -U postgres -W < backup.sql`.
3. Run `npm run supabase migration up` to ensure all historical migrations (00001-00035) and any subsequent ones are applied or verified.

## App Configuration Recovery
All environment variables are documented in `docs/PRODUCTION_ENVIRONMENT.md` and `docs/SECRETS_ARCHITECTURE.md`.
**Recovery Checklist:**
- [ ] Retrieve `.env` values from the secure password manager or CI variables.
- [ ] Inject them into the hosting provider (Vercel).
- [ ] Verify `npm run release:check` passes on the newly deployed instance.

## n8n Workflow Backup
If n8n is deployed for automation:
- Workflows are stored in the n8n SQLite or Postgres database.
- A scheduled job using the n8n API (`GET /workflows`) should export workflows as JSON and commit them to a secure, private backup repository or S3 bucket.

## Disaster Recovery Runbook
In the event of a total regional failure:
1. **Declare Incident:** Notify stakeholders.
2. **Provision Infrastructure:** Create a new Supabase project in a healthy region.
3. **Restore DB:** Execute the database restore procedure from the latest nightly `pg_dump`.
4. **Deploy Application:** Trigger a Vercel deployment with the new Supabase URL and Keys.
5. **Verify:** Run end-to-end tests to confirm system health.
6. **DNS Update:** Point the primary domain to the new deployment.

## READY_FOR_ACTIVATION_AFTER_FIRST_CLIENT
- [ ] Upgrade Supabase to a plan with PITR.
- [ ] Schedule `scripts/backup-db.mjs` using GitHub Actions.
- [ ] Configure n8n workflow backups.
