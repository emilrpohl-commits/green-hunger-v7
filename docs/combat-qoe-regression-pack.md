# Combat QoE Regression Pack

Run these scenarios before merging combat or infrastructure changes.

## Scenario Set
1. Baseline 5-round turn cycle
2. Rapid burst damage/actions
3. Concurrent DM + player writes
4. Save-prompt create/resolve
5. Reconnect with stale-event tolerance

## Pass Criteria
- `hpMismatchCount === 0`
- `missingFeedEventCount === 0`
- `outOfOrderFeedCount === 0`
- `unresolvedPromptCount === 0`

## Trace Capture Format
The verifier expects newline-delimited JSON (`ndjson`) events with shape:

```json
{"kind":"hp_snapshot","dmHp":22,"playerHp":22}
{"kind":"feed_event","timestamp":"2026-04-14T11:30:00.000Z","id":101}
{"kind":"missing_feed_event","actionId":"pc-dmg-1"}
{"kind":"save_prompt_open","promptId":"p-1"}
{"kind":"save_prompt_resolved","promptId":"p-1"}
```

## Run Verifier

```bash
node tools/combatQoeRegression.mjs --trace ./tmp/combat-trace.ndjson
```

If no trace is provided, the script prints the deterministic scenario checklist.
