#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const args = { trace: null }
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--trace') args.trace = argv[i + 1] || null
  }
  return args
}

function printChecklist() {
  console.log('Combat QoE deterministic regression checklist:')
  console.log('1) Baseline 5-round turn cycle')
  console.log('2) Rapid burst damage/actions')
  console.log('3) Concurrent DM + player writes')
  console.log('4) Save-prompt create/resolve')
  console.log('5) Reconnect + stale-event tolerance')
  console.log('')
  console.log('Provide --trace <ndjson file> to verify pass/fail counters automatically.')
}

function evaluateTrace(lines) {
  const openPrompts = new Set()
  const result = {
    hpMismatchCount: 0,
    missingFeedEventCount: 0,
    outOfOrderFeedCount: 0,
    unresolvedPromptCount: 0,
    totalEvents: 0,
  }
  let prevTs = null
  let prevId = null

  for (const line of lines) {
    const text = line.trim()
    if (!text) continue
    let event = null
    try {
      event = JSON.parse(text)
    } catch {
      continue
    }
    result.totalEvents += 1

    if (event.kind === 'hp_snapshot') {
      if (Number(event.dmHp) !== Number(event.playerHp)) result.hpMismatchCount += 1
    }
    if (event.kind === 'missing_feed_event') result.missingFeedEventCount += 1
    if (event.kind === 'save_prompt_open' && event.promptId) openPrompts.add(String(event.promptId))
    if (event.kind === 'save_prompt_resolved' && event.promptId) openPrompts.delete(String(event.promptId))
    if (event.kind === 'feed_event') {
      const ts = Date.parse(event.timestamp || '')
      const id = Number(event.id)
      if (!Number.isNaN(ts)) {
        if (prevTs != null && ts > prevTs) {
          result.outOfOrderFeedCount += 1
        } else if (prevTs != null && ts === prevTs && Number.isFinite(id) && Number.isFinite(prevId) && id > prevId) {
          result.outOfOrderFeedCount += 1
        }
        prevTs = ts
        prevId = Number.isFinite(id) ? id : prevId
      }
    }
  }

  result.unresolvedPromptCount = openPrompts.size
  return result
}

function main() {
  const args = parseArgs(process.argv)
  if (!args.trace) {
    printChecklist()
    process.exit(0)
  }

  const tracePath = path.resolve(process.cwd(), args.trace)
  if (!fs.existsSync(tracePath)) {
    console.error(`Trace file not found: ${tracePath}`)
    process.exit(2)
  }

  const raw = fs.readFileSync(tracePath, 'utf8')
  const lines = raw.split('\n')
  const summary = evaluateTrace(lines)
  const pass =
    summary.hpMismatchCount === 0
    && summary.missingFeedEventCount === 0
    && summary.outOfOrderFeedCount === 0
    && summary.unresolvedPromptCount === 0

  console.log(JSON.stringify({ pass, ...summary }, null, 2))
  process.exit(pass ? 0 : 1)
}

main()
