#!/usr/bin/env node
/**
 * Sync canonical rules entities from local 5e-database JSON files into Supabase.
 *
 * Usage:
 *   node tools/syncRulesEntities.mjs --ruleset=2024 --dry-run
 *   node tools/syncRulesEntities.mjs --ruleset=2024 --write-db
 *   node tools/syncRulesEntities.mjs --ruleset=2014 --write-db --limit=200
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const args = new Set(process.argv.slice(2))
const rulesetArg = process.argv.find((a) => a.startsWith('--ruleset=')) || '--ruleset=2024'
const ruleset = String(rulesetArg.split('=')[1] || '2024')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Math.max(0, parseInt(limitArg.split('=')[1], 10) || 0) : null
const dryRun = args.has('--dry-run')
const writeDb = args.has('--write-db') && !dryRun

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'
const BASE_PATH = path.join(ROOT, 'docs', '5e-database-main', 'src', ruleset)

function toEntityType(fileName) {
  return fileName
    .replace(/^5e-SRD-/, '')
    .replace(/\.json$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
}

function normalizeEntity(entityType, rulesetName, row) {
  return {
    entity_type: entityType,
    ruleset: rulesetName,
    source_index: String(row.index || row.slug || row.name || '').trim().toLowerCase().replace(/\s+/g, '-'),
    name: row.name || row.index || 'Unnamed',
    source_url: row.url || null,
    source_version: `5e-database-${rulesetName}`,
    is_fallback: false,
    payload: row,
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

async function postgrestUpsert(table, rows, onConflict) {
  if (rows.length === 0) return { count: 0, status: 'skipped' }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Upsert failed ${table}: ${res.status} ${body}`)
  }
  const data = await res.json()
  return { count: data.length, status: 'ok' }
}

async function createSyncRun(sourceKey, rulesetName) {
  const res = await postgrestUpsert('rules_sync_runs', [{
    source_key: sourceKey,
    ruleset: rulesetName,
    status: 'running',
    started_at: new Date().toISOString(),
  }], 'id')
  return res
}

async function finishSyncRun(rulesetName, status, totals, errorText = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rules_sync_runs?ruleset=eq.${encodeURIComponent(rulesetName)}&status=eq.running`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      status,
      totals,
      error_text: errorText,
      finished_at: new Date().toISOString(),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed updating rules_sync_runs: ${res.status} ${body}`)
  }
}

async function run() {
  const files = (await fs.readdir(BASE_PATH))
    .filter((f) => /^5e-SRD-.*\.json$/i.test(f))
    .sort()

  let totalSourceRows = 0
  let totalNormalizedRows = 0
  let totalFiles = 0
  const rowsToWrite = []

  for (const file of files) {
    const raw = await fs.readFile(path.join(BASE_PATH, file), 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) continue
    const entityType = toEntityType(file)
    const scoped = limit != null ? parsed.slice(0, limit) : parsed
    const normalized = scoped
      .map((row) => normalizeEntity(entityType, ruleset, row))
      .filter((row) => !!row.source_index)
    totalSourceRows += parsed.length
    totalNormalizedRows += normalized.length
    totalFiles += 1
    rowsToWrite.push(...normalized)
  }

  const report = {
    ruleset,
    basePath: BASE_PATH,
    totalFiles,
    totalSourceRows,
    totalNormalizedRows,
    dryRun,
    writeDb,
  }

  if (!writeDb) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  try {
    await createSyncRun('5e-srd-api', ruleset)
    await postgrestUpsert('rules_sources', [{
      source_key: '5e-srd-api',
      base_url: 'self-hosted',
      primary_ruleset: '2024',
      fallback_ruleset: '2014',
      source_version: `5e-database-${ruleset}`,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }], 'source_key')
    const entitiesResult = await postgrestUpsert('rules_entities', rowsToWrite, 'entity_type,ruleset,source_index')
    await finishSyncRun(ruleset, 'success', {
      files: totalFiles,
      sourceRows: totalSourceRows,
      normalizedRows: totalNormalizedRows,
      writtenRows: entitiesResult.count,
    })
    console.log(JSON.stringify({ ...report, db: entitiesResult }, null, 2))
  } catch (error) {
    await finishSyncRun(ruleset, 'failed', report, String(error?.message || error))
    throw error
  }
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exitCode = 1
})
