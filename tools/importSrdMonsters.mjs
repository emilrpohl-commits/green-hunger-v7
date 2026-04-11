#!/usr/bin/env node
/**
 * Import SRD 5.2.1 monsters from src/data/monsters/monsters-srd-5.2.1.json into stat_blocks.
 *
 *   node tools/importSrdMonsters.mjs --dry-run
 *   node tools/importSrdMonsters.mjs --write-db --campaign-id <uuid>
 *
 * Env: SUPABASE_URL, SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY
 *
 * Reserved slugs: srd521-<monster-id>. Only rows tagged srd-import are updated.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSrdStatBlockPayload } from '../shared/lib/srdMonsters/cleanAndMap.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const DEFAULT_JSON = path.join(ROOT, 'src/data/monsters/monsters-srd-5.2.1.json')
const DEFAULT_REPORT_DIR = path.join(ROOT, 'tools/reports')

const SRD_SLUG_RE = /^srd521-[a-z0-9-]+$/

function parseArgs(argv) {
  const out = {
    dryRun: false,
    writeDb: false,
    jsonPath: null,
    campaignId: null,
    reportDir: null,
    batchSize: 25,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--write-db') out.writeDb = true
    else if (a === '--json' && argv[i + 1]) out.jsonPath = argv[++i]
    else if (a.startsWith('--json=')) out.jsonPath = a.split('=').slice(1).join('=')
    else if (a === '--campaign-id' && argv[i + 1]) out.campaignId = argv[++i]
    else if (a.startsWith('--campaign-id=')) out.campaignId = a.split('=').slice(1).join('=')
    else if (a === '--report-dir' && argv[i + 1]) out.reportDir = argv[++i]
    else if (a.startsWith('--report-dir=')) out.reportDir = a.split('=').slice(1).join('=')
    else if (a === '--batch-size' && argv[i + 1]) out.batchSize = Math.max(1, parseInt(argv[++i], 10) || 25)
  }
  return out
}

function hasSrdImportTag(tags) {
  return Array.isArray(tags) && tags.some((t) => t === 'srd-import')
}

function restHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra,
  }
}

/**
 * Fetch existing stat_blocks for campaign with slugs in chunk (PostgREST or=(slug.eq.a,slug.eq.b)).
 */
async function fetchExistingBySlugs(campaignId, slugs) {
  if (!slugs.length) return new Map()
  const parts = slugs.map((s) => `slug.eq.${encodeURIComponent(s)}`).join(',')
  const url = `${SUPABASE_URL}/rest/v1/stat_blocks?campaign_id=eq.${campaignId}&or=(${parts})&select=id,slug,tags`
  const res = await fetch(url, { headers: restHeaders() })
  if (!res.ok) throw new Error(`stat_blocks fetch failed (${res.status}): ${await res.text()}`)
  const rows = await res.json()
  const map = new Map()
  for (const r of rows || []) {
    if (r.slug) map.set(r.slug, r)
  }
  return map
}

async function insertStatBlock(row) {
  const url = `${SUPABASE_URL}/rest/v1/stat_blocks`
  const res = await fetch(url, {
    method: 'POST',
    headers: restHeaders(),
    body: JSON.stringify([row]),
  })
  if (!res.ok) throw new Error(`stat_blocks insert failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return Array.isArray(data) ? data[0] : data
}

async function patchStatBlock(id, patch) {
  const url = `${SUPABASE_URL}/rest/v1/stat_blocks?id=eq.${id}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: restHeaders(),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`stat_blocks patch failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return Array.isArray(data) ? data[0] : data
}

function buildDbRow(payload, campaignId) {
  const now = new Date().toISOString()
  return {
    ...payload,
    campaign_id: campaignId,
    updated_at: now,
  }
}

function mdEscape(s) {
  return String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

async function main() {
  const args = parseArgs(process.argv)
  const jsonPath = path.resolve(args.jsonPath || DEFAULT_JSON)
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR)

  if (args.writeDb && args.dryRun) {
    console.error('Use only one of --write-db or --dry-run')
    process.exitCode = 1
    return
  }
  if (args.writeDb && !args.campaignId) {
    console.error('--campaign-id is required with --write-db (DM app loads stat blocks per campaign).')
    process.exitCode = 1
    return
  }
  if (args.writeDb && !SUPABASE_KEY) {
    console.error('Set SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY for --write-db')
    process.exitCode = 1
    return
  }

  const rawText = await fs.readFile(jsonPath, 'utf8')
  const bundle = JSON.parse(rawText)
  const monsters = bundle.monsters || []
  if (!Array.isArray(monsters) || monsters.length === 0) {
    console.error('No monsters array in JSON')
    process.exitCode = 1
    return
  }

  /** @type {ReturnType<typeof buildSrdStatBlockPayload>[]} */
  const built = []
  for (const m of monsters) {
    built.push(buildSrdStatBlockPayload(m))
  }

  const summary = {
    total: built.length,
    /** dry-run only */
    would_insert: 0,
    /** --write-db */
    inserted: 0,
    updated: 0,
    skipped_collision: 0,
    skipped_invalid_slug: 0,
    errors: 0,
    quality: { high: 0, medium: 0, low: 0 },
    dryRun: args.dryRun,
    writeDb: args.writeDb,
  }

  /** @type {any[]} */
  const reportEntries = []

  for (const b of built) {
    summary.quality[b.parse_quality]++
    if (!SRD_SLUG_RE.test(b.slug)) {
      summary.skipped_invalid_slug++
      reportEntries.push({
        slug: b.slug,
        name: b.payload.name,
        parse_quality: b.parse_quality,
        warnings: b.warnings,
        db_status: 'skipped',
        skip_reason: 'invalid_slug',
      })
      continue
    }

    let db_status = 'would_insert'
    let skip_reason = null

    if (args.writeDb) {
      // Defer actual IO — second pass after batch fetch
      reportEntries.push({
        slug: b.slug,
        name: b.payload.name,
        parse_quality: b.parse_quality,
        warnings: b.warnings,
        db_status: 'pending',
      })
    } else {
      reportEntries.push({
        slug: b.slug,
        name: b.payload.name,
        parse_quality: b.parse_quality,
        warnings: b.warnings,
        db_status: 'would_insert',
      })
      summary.would_insert++
    }
  }

  if (args.writeDb) {
    const campaignId = args.campaignId
    const slugs = built.filter((b) => SRD_SLUG_RE.test(b.slug)).map((b) => b.slug)
    const existingMap = new Map()
    const batch = Math.max(5, args.batchSize)
    for (let i = 0; i < slugs.length; i += batch) {
      const chunk = slugs.slice(i, i + batch)
      const m = await fetchExistingBySlugs(campaignId, chunk)
      for (const [k, v] of m) existingMap.set(k, v)
    }

    let idx = 0
    for (const b of built) {
      const entry = reportEntries[idx++]
      if (!SRD_SLUG_RE.test(b.slug)) continue

      const row = buildDbRow(b.payload, campaignId)
      const ex = existingMap.get(b.slug)

      try {
        if (!ex) {
          await insertStatBlock(row)
          entry.db_status = 'inserted'
          summary.inserted++
        } else if (hasSrdImportTag(ex.tags)) {
          const { campaign_id: _c, ...patch } = row
          await patchStatBlock(ex.id, patch)
          entry.db_status = 'updated'
          summary.updated++
        } else {
          entry.db_status = 'skipped'
          entry.skip_reason = 'slug_collision_non_srd'
          summary.skipped_collision++
        }
      } catch (e) {
        entry.db_status = 'error'
        entry.error = String(e?.message || e)
        summary.errors++
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    jsonPath,
    campaignId: args.campaignId || null,
    summary,
    entries: reportEntries,
  }

  await fs.mkdir(reportDir, { recursive: true })
  const stamp = report.generatedAt.replace(/[:.]/g, '-')
  const jsonReportPath = path.join(reportDir, `srd-monster-import-report-${stamp}.json`)
  const mdReportPath = path.join(reportDir, `srd-monster-import-report-${stamp}.md`)
  await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2), 'utf8')

  const flagged = reportEntries.filter((e) => e.parse_quality !== 'high' || (e.warnings && e.warnings.length > 0))
  const md = [
    '# SRD 5.2.1 monster import report',
    '',
    `Generated: ${report.generatedAt}`,
    `Source: \`${jsonPath}\``,
    args.campaignId ? `Campaign: \`${args.campaignId}\`` : '',
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total | ${summary.total} |`,
    `| High quality | ${summary.quality.high} |`,
    `| Medium quality | ${summary.quality.medium} |`,
    `| Low quality | ${summary.quality.low} |`,
    args.dryRun ? `| Would insert | ${summary.would_insert} |` : '',
    args.writeDb ? `| Inserted | ${summary.inserted} |` : '',
    args.writeDb ? `| Updated | ${summary.updated} |` : '',
    args.dryRun ? `| Would insert (valid slugs) | ${summary.would_insert} |` : '',
    args.writeDb ? `| Skipped (collision) | ${summary.skipped_collision} |` : '',
    args.writeDb ? `| Errors | ${summary.errors} |` : '',
    `| Invalid slug | ${summary.skipped_invalid_slug} |`,
    '',
    '## Flagged for manual review (medium/low quality or any warning)',
    '',
    '| Slug | Name | Quality | Warnings | DB status |',
    '|------|------|---------|----------|-----------|',
    ...flagged.map(
      (e) =>
        `| ${mdEscape(e.slug)} | ${mdEscape(e.name)} | ${e.parse_quality} | ${mdEscape((e.warnings || []).join('; '))} | ${mdEscape(e.db_status)} |`
    ),
    '',
    `Full JSON: \`${jsonReportPath}\``,
    '',
  ].filter(Boolean)
  await fs.writeFile(mdReportPath, md.join('\n'), 'utf8')

  console.log(JSON.stringify({ ...summary, jsonReportPath, mdReportPath }, null, 2))
  if (args.dryRun) {
    console.error('\nDry run: no database writes. Use --write-db --campaign-id <uuid> to upsert.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
