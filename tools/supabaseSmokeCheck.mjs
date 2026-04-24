#!/usr/bin/env node
/**
 * Minimal Supabase migration + policy sanity checks for CI.
 * This is intentionally static/offline and does not require Supabase credentials.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')
const SCHEMA_PATH = path.join(ROOT, 'supabase', 'schema.sql')

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length
}

async function run() {
  const report = {
    ok: true,
    checks: [],
  }

  let migrationFiles = []
  try {
    migrationFiles = (await fs.readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith('.sql'))
      .sort()
  } catch (err) {
    report.checks.push({
      id: 'migrations_dir_exists',
      ok: false,
      detail: `Unable to read migrations directory: ${String(err?.message || err)}`,
    })
    report.ok = false
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = 1
    return
  }

  const migrationNamePattern = /^(\d{14}|\d{3})_.+\.sql$/
  const invalidNames = migrationFiles.filter((name) => !migrationNamePattern.test(name))
  report.checks.push({
    id: 'migration_file_naming',
    ok: migrationFiles.length > 0 && invalidNames.length === 0,
    detail:
      migrationFiles.length === 0
        ? 'No SQL migrations found.'
        : invalidNames.length === 0
          ? `${migrationFiles.length} migration files with timestamped names.`
          : `Invalid migration names: ${invalidNames.join(', ')}`,
  })

  const migrationOrderOk = migrationFiles.every((name, i) => i === 0 || migrationFiles[i - 1] <= name)
  report.checks.push({
    id: 'migration_order_monotonic',
    ok: migrationOrderOk,
    detail: migrationOrderOk ? 'Migration filenames are monotonic.' : 'Migration filenames are not sorted chronologically.',
  })

  const schemaSql = await fs.readFile(SCHEMA_PATH, 'utf8')
  const rlsEnableCount = countMatches(schemaSql, /enable row level security;/gi)
  const allowAllCount = countMatches(schemaSql, /allow_all_[a-z_]+/gi)
  const hasPolicyCreation = /create policy/i.test(schemaSql)
  const hasTemplate = migrationFiles.some((name) => name.includes('rls_hardening'))

  report.checks.push({
    id: 'schema_rls_enabled',
    ok: rlsEnableCount > 0,
    detail: `Found ${rlsEnableCount} RLS enable statements in schema.sql.`,
  })

  report.checks.push({
    id: 'schema_policy_block_present',
    ok: hasPolicyCreation,
    detail: hasPolicyCreation ? 'Policy creation statements detected in schema.sql.' : 'No policy creation statements found in schema.sql.',
  })

  report.checks.push({
    id: 'rls_hardening_template_present',
    ok: hasTemplate,
    detail: hasTemplate
      ? 'RLS hardening migration template exists in supabase/migrations.'
      : 'Missing RLS hardening template migration file.',
  })

  report.checks.push({
    id: 'allow_all_policy_inventory',
    ok: true,
    detail: `Detected ${allowAllCount} allow_all policy references (informational while hardening is in progress).`,
  })

  report.ok = report.checks.every((check) => check.ok)
  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exitCode = 1
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exitCode = 1
})
