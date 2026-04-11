#!/usr/bin/env node
/**
 * Validates rules layer JSON + alignment with data/rules (offline).
 * Run: node tools/rulesLayerSmokeCheck.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

async function readJson(rel) {
  const raw = await fs.readFile(path.join(ROOT, rel), 'utf8')
  return JSON.parse(raw)
}

async function run() {
  const report = { ok: true, checks: [] }

  const rulesCore = await readJson('data/rules/rules-core.json')
  const dcLadder = rulesCore?.rulesEngine?.difficultyClasses
  const dcCatalog = await readJson('shared/lib/rules/catalog/dcTables.json')

  const ladderMatch =
    Array.isArray(dcLadder) &&
    Array.isArray(dcCatalog.standardLadder) &&
    dcLadder.length === dcCatalog.standardLadder.length &&
    dcLadder.every((row, i) => row.dc === dcCatalog.standardLadder[i].dc && row.label === dcCatalog.standardLadder[i].label)

  report.checks.push({
    id: 'dc_ladder_matches_rules_core',
    ok: ladderMatch,
    detail: ladderMatch ? 'rules-core difficultyClasses ↔ catalog/dcTables.json' : 'Mismatch: update one source',
  })

  const conditions = await readJson('shared/lib/rules/catalog/conditions.json')
  const srdCount = conditions.entries.filter((e) => e.srd).length
  report.checks.push({
    id: 'srd_condition_count',
    ok: srdCount === 15,
    detail: `SRD conditions in catalog: ${srdCount} (expected 15)`,
  })

  const skills = await readJson('shared/lib/rules/catalog/skillsIndex.json')
  report.checks.push({
    id: 'skills_count',
    ok: skills.skills.length === 18,
    detail: `Skills in index: ${skills.skills.length}`,
  })

  const glossary = await readJson('data/rules/rules-glossary.json')
  report.checks.push({
    id: 'glossary_entries',
    ok: Array.isArray(glossary.entries) && glossary.entries.length >= 40,
    detail: `Glossary entries: ${glossary.entries?.length ?? 0}`,
  })

  await readJson('data/rules/srd-source.json')
  report.checks.push({ id: 'srd_source_manifest', ok: true, detail: 'data/rules/srd-source.json readable' })

  await readJson('data/rules/gameplay-toolbox.json')
  report.checks.push({ id: 'gameplay_toolbox', ok: true, detail: 'data/rules/gameplay-toolbox.json readable' })

  report.ok = report.checks.every((c) => c.ok)
  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exitCode = 1
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exitCode = 1
})
