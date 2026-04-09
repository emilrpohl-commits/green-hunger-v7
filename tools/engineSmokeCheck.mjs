#!/usr/bin/env node
/**
 * Lightweight smoke checks for self-hosted 5e engine and canonical tables.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'
const API_BASE = process.env.DND5E_API_BASE || 'https://www.dnd5eapi.co'

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} ${body}`)
  }
  return res.json()
}

async function run() {
  const report = {
    timestamp: new Date().toISOString(),
    api: {},
    db: {},
  }

  try {
    const api2024 = await fetchJson(`${API_BASE}/api/2024`)
    report.api.v2024 = { ok: true, keys: Object.keys(api2024 || {}).length }
  } catch (err) {
    report.api.v2024 = { ok: false, error: String(err?.message || err) }
  }

  try {
    const countRes = await fetch(`${SUPABASE_URL}/rest/v1/rules_entities?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
      },
    })
    if (!countRes.ok) throw new Error(await countRes.text())
    report.db.rules_entities = {
      ok: true,
      countHeader: countRes.headers.get('content-range') || null,
    }
  } catch (err) {
    report.db.rules_entities = { ok: false, error: String(err?.message || err) }
  }

  console.log(JSON.stringify(report, null, 2))
  const failed = Object.values(report.api).some((v) => !v.ok) || Object.values(report.db).some((v) => !v.ok)
  if (failed) process.exitCode = 1
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exitCode = 1
})
