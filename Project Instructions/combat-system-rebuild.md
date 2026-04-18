# Green Hunger — Combat System Rebuild

This document is the authoritative specification for rebuilding the combat system from its current fragile, multi-authority state into a clean, reliable, real-time system. It covers the root causes of the current jank, the target architecture, and exact implementation instructions for Cursor.

---

## Why It Currently Feels Broken

The combat system has ten distinct failure modes. Three of them are responsible for most of the day-to-day jank:

### 1. Two things own HP at the same time

During combat, HP is written to **two separate places**: `combat_state.combatants[].curHp` and `character_states.cur_hp`. Both the DM and players write to both. A reconciliation function in `realtimeSlice.js` (lines 132–159) tries to pick a winner using an `updated_at` timestamp watermark — but this fails constantly due to network reordering, clock skew between machines, and concurrent writes. The result: damage visibly lands, then silently undoes itself a second later as the losing write wins the timestamp race.

### 2. Optimistic updates with no guaranteed rollback

When a player applies damage, the sequence is: (1) update local state immediately, (2) call the RPC, (3) insert a combat feed entry, (4) update `character_states`. If the RPC fails after the feed entry is already inserted, the feed says "hit for 8 damage" but the HP never changed. The rollback only reverts local state — the database is now inconsistent and stays that way until someone refreshes.

### 3. Turn advancement is not atomic

`nextTurn()` reads `combatants` from store, loops to find the next eligible combatant, then writes back. Between the read and the write, Supabase Realtime can fire and update `combatants` from another user's action. The index computed on the old array now points to a different combatant in the new array. This is why turns sometimes skip to the wrong person, or why the "active" indicator shows a dead enemy.

The other seven issues (save prompt encoding, initiative blocking, subscription leaks, stale watermarks, action economy reset, no DB schema validation, no transaction boundaries) all compound these three.

---

## Target Architecture

### Single source of truth: `combat_state`

**`combat_state` is the only authority for all combat data during an active encounter.**

`character_states` is not written to during combat. It is only updated when combat ends (end-of-combat sync). Players and the DM both read from and write to `combat_state` exclusively. This eliminates the dual-authority problem entirely.

### All writes go through a single RPC

Every combat action — damage, healing, condition toggle, turn advance, initiative set — is a single Supabase RPC call that executes atomically in a PostgreSQL transaction. No client-side fallback chains. No multi-step promise sequences. One call, one outcome.

### Realtime is display-only

The DM and player apps subscribe to `combat_state` changes via Supabase Realtime. When a change arrives, they apply it to local display state. They do not use Realtime to trigger further writes. Realtime is a one-way read pipe, not a coordination mechanism.

### Save prompts get their own table

Save prompts are currently encoded as JSON strings inside `combat_feed.text`. They move to a dedicated `combat_save_prompts` table with proper columns and FK constraints.

### Turn order is immutable once locked

When initiative is sorted and combat begins, the turn order is written to `combat_state.turn_order` as an ordered array of combatant IDs. Turn advancement is always computed against this fixed array — never against the live combatants array. Combatants can die without affecting the turn order until the round is complete.

---

## Database Changes

### New RPC functions (replace all client-side combat writes)

All of these go in a new migration: `[timestamp]_combat_rpcs_v2.sql`

```sql
-- ============================================================
-- apply_damage_v2
-- Atomically apply damage to a combatant.
-- Returns the updated combatant object.
-- ============================================================
CREATE OR REPLACE FUNCTION apply_damage_v2(
  p_session_run_id uuid,
  p_target_id       text,
  p_raw_damage      integer,
  p_damage_type     text,
  p_attacker_name   text,
  p_weapon_name     text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_state         jsonb;
  v_combatants    jsonb;
  v_target        jsonb;
  v_target_idx    integer;
  v_temp_hp       integer;
  v_cur_hp        integer;
  v_max_hp        integer;
  v_hp_loss       integer;
  v_new_hp        integer;
  v_new_temp      integer;
  v_updated       jsonb;
  v_feed_text     text;
BEGIN
  -- Lock the combat_state row for this session
  SELECT raw_state INTO v_state
  FROM combat_state
  WHERE session_run_id = p_session_run_id
  FOR UPDATE;

  IF v_state IS NULL THEN
    RAISE EXCEPTION 'No combat_state found for session %', p_session_run_id;
  END IF;

  v_combatants := v_state->'combatants';

  -- Find the target combatant
  SELECT elem, ordinality - 1
  INTO v_target, v_target_idx
  FROM jsonb_array_elements(v_combatants) WITH ORDINALITY AS t(elem, ordinality)
  WHERE elem->>'id' = p_target_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Combatant % not found', p_target_id;
  END IF;

  -- Extract current HP values
  v_temp_hp := COALESCE((v_target->>'tempHp')::integer, 0);
  v_cur_hp  := COALESCE((v_target->>'curHp')::integer, 0);
  v_max_hp  := COALESCE((v_target->>'maxHp')::integer, 0);

  -- Apply damage: absorb temp HP first
  IF v_temp_hp >= p_raw_damage THEN
    v_new_temp := v_temp_hp - p_raw_damage;
    v_hp_loss  := 0;
  ELSE
    v_hp_loss  := p_raw_damage - v_temp_hp;
    v_new_temp := 0;
  END IF;
  v_new_hp := GREATEST(0, v_cur_hp - v_hp_loss);

  -- Update the target in the combatants array
  v_target := v_target
    || jsonb_build_object('curHp', v_new_hp)
    || jsonb_build_object('tempHp', v_new_temp);

  v_combatants := jsonb_set(v_combatants, ARRAY[v_target_idx::text], v_target);

  -- Update combat_state
  UPDATE combat_state
  SET
    raw_state  = raw_state || jsonb_build_object('combatants', v_combatants),
    updated_at = now()
  WHERE session_run_id = p_session_run_id;

  -- Insert combat feed entry
  v_feed_text := p_attacker_name || ' hits ' || (v_target->>'name')
    || ' with ' || p_weapon_name
    || ' for ' || p_raw_damage || ' damage'
    || ' (' || v_new_hp || '/' || v_max_hp || ' HP)';

  IF v_new_hp = 0 THEN
    v_feed_text := v_feed_text || ' — DOWN';
  END IF;

  INSERT INTO combat_feed (session_run_id, text, kind, target_id, is_public)
  VALUES (p_session_run_id, v_feed_text, 'damage', p_target_id, true);

  RETURN v_target;
END;
$$;


-- ============================================================
-- apply_healing_v2
-- ============================================================
CREATE OR REPLACE FUNCTION apply_healing_v2(
  p_session_run_id uuid,
  p_target_id      text,
  p_amount         integer,
  p_healer_name    text,
  p_spell_name     text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_state      jsonb;
  v_combatants jsonb;
  v_target     jsonb;
  v_target_idx integer;
  v_cur_hp     integer;
  v_max_hp     integer;
  v_new_hp     integer;
BEGIN
  SELECT raw_state INTO v_state
  FROM combat_state
  WHERE session_run_id = p_session_run_id
  FOR UPDATE;

  SELECT elem, ordinality - 1
  INTO v_target, v_target_idx
  FROM jsonb_array_elements(v_state->'combatants') WITH ORDINALITY AS t(elem, ordinality)
  WHERE elem->>'id' = p_target_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Combatant % not found', p_target_id;
  END IF;

  v_cur_hp := COALESCE((v_target->>'curHp')::integer, 0);
  v_max_hp := COALESCE((v_target->>'maxHp')::integer, 0);
  v_new_hp := LEAST(v_max_hp, v_cur_hp + p_amount);

  v_target     := v_target || jsonb_build_object('curHp', v_new_hp);
  v_combatants := jsonb_set(v_state->'combatants', ARRAY[v_target_idx::text], v_target);

  UPDATE combat_state
  SET
    raw_state  = raw_state || jsonb_build_object('combatants', v_combatants),
    updated_at = now()
  WHERE session_run_id = p_session_run_id;

  INSERT INTO combat_feed (session_run_id, text, kind, target_id, is_public)
  VALUES (
    p_session_run_id,
    p_healer_name || ' heals ' || (v_target->>'name')
      || ' for ' || p_amount || ' HP'
      || ' (' || v_new_hp || '/' || v_max_hp || ' HP)',
    'heal', p_target_id, true
  );

  RETURN v_target;
END;
$$;


-- ============================================================
-- advance_turn_v2
-- Atomically advance to the next eligible combatant.
-- ============================================================
CREATE OR REPLACE FUNCTION advance_turn_v2(
  p_session_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_state           jsonb;
  v_combatants      jsonb;
  v_turn_order      jsonb;  -- ordered array of combatant IDs
  v_current_idx     integer;
  v_next_idx        integer;
  v_n               integer;
  v_round           integer;
  v_new_round       boolean := false;
  v_candidate_id    text;
  v_candidate       jsonb;
  v_i               integer;
BEGIN
  SELECT raw_state INTO v_state
  FROM combat_state
  WHERE session_run_id = p_session_run_id
  FOR UPDATE;

  v_combatants  := v_state->'combatants';
  v_turn_order  := v_state->'turnOrder';   -- array of IDs, fixed at combat start
  v_current_idx := COALESCE((v_state->>'activeTurnIndex')::integer, 0);
  v_round       := COALESCE((v_state->>'round')::integer, 1);
  v_n           := jsonb_array_length(v_turn_order);

  IF v_n = 0 THEN
    RAISE EXCEPTION 'No turn order defined';
  END IF;

  -- Find next eligible combatant
  v_next_idx := v_current_idx;
  FOR v_i IN 1..v_n LOOP
    v_next_idx := (v_next_idx + 1) % v_n;

    -- Wrap-around = new round
    IF v_next_idx = 0 AND v_i = 1 THEN
      v_new_round := true;
      v_round     := v_round + 1;
    END IF;

    v_candidate_id := v_turn_order->>v_next_idx;

    -- Find this combatant in live combatants array
    SELECT elem INTO v_candidate
    FROM jsonb_array_elements(v_combatants) AS t(elem)
    WHERE elem->>'id' = v_candidate_id;

    -- Eligible = player (always) OR enemy with HP > 0
    IF v_candidate IS NOT NULL AND (
      v_candidate->>'type' = 'player'
      OR (v_candidate->>'type' = 'enemy' AND (v_candidate->>'curHp')::integer > 0)
    ) THEN
      EXIT;  -- Found our next combatant
    END IF;
  END LOOP;

  -- Reset action economy for the new active combatant
  v_combatants := (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'id' = v_candidate_id
        THEN elem || '{"actionEconomy":{"actionAvailable":true,"bonusActionAvailable":true,"reactionAvailable":true}}'::jsonb
        ELSE elem
      END
    )
    FROM jsonb_array_elements(v_combatants) AS t(elem)
  );

  -- Write updated state
  UPDATE combat_state
  SET
    raw_state = raw_state
      || jsonb_build_object('combatants', v_combatants)
      || jsonb_build_object('activeTurnIndex', v_next_idx)
      || jsonb_build_object('round', v_round),
    updated_at = now()
  WHERE session_run_id = p_session_run_id;

  -- Insert round marker if new round
  IF v_new_round THEN
    INSERT INTO combat_feed (session_run_id, text, kind, is_public)
    VALUES (p_session_run_id, '— Round ' || v_round || ' —', 'round', true);
  END IF;

  RETURN jsonb_build_object(
    'activeTurnIndex', v_next_idx,
    'activeId', v_candidate_id,
    'round', v_round,
    'newRound', v_new_round
  );
END;
$$;


-- ============================================================
-- toggle_condition_v2
-- ============================================================
CREATE OR REPLACE FUNCTION toggle_condition_v2(
  p_session_run_id uuid,
  p_target_id      text,
  p_condition      text,
  p_add            boolean   -- true = add, false = remove
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_state      jsonb;
  v_combatants jsonb;
  v_target     jsonb;
  v_target_idx integer;
  v_conditions jsonb;
  v_new_target jsonb;
BEGIN
  SELECT raw_state INTO v_state
  FROM combat_state
  WHERE session_run_id = p_session_run_id
  FOR UPDATE;

  SELECT elem, ordinality - 1
  INTO v_target, v_target_idx
  FROM jsonb_array_elements(v_state->'combatants') WITH ORDINALITY AS t(elem, ordinality)
  WHERE elem->>'id' = p_target_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Combatant % not found', p_target_id;
  END IF;

  v_conditions := COALESCE(v_target->'conditions', '[]'::jsonb);

  IF p_add THEN
    -- Add condition only if not already present
    IF NOT v_conditions @> to_jsonb(p_condition) THEN
      v_conditions := v_conditions || to_jsonb(p_condition);
    END IF;
    -- Break concentration on Incapacitated or Unconscious
    IF p_condition IN ('Incapacitated', 'Unconscious') THEN
      v_target := v_target || '{"concentration": false}'::jsonb;
    END IF;
  ELSE
    -- Remove condition
    SELECT jsonb_agg(c)
    INTO v_conditions
    FROM jsonb_array_elements(v_conditions) AS t(c)
    WHERE c #>> '{}' != p_condition;
    v_conditions := COALESCE(v_conditions, '[]'::jsonb);
  END IF;

  v_new_target := v_target || jsonb_build_object('conditions', v_conditions);
  v_combatants := jsonb_set(v_state->'combatants', ARRAY[v_target_idx::text], v_new_target);

  UPDATE combat_state
  SET
    raw_state  = raw_state || jsonb_build_object('combatants', v_combatants),
    updated_at = now()
  WHERE session_run_id = p_session_run_id;

  RETURN v_new_target;
END;
$$;


-- ============================================================
-- lock_initiative_v2
-- Sort combatants by initiative and lock turn order.
-- Called once when DM clicks "Begin Combat".
-- ============================================================
CREATE OR REPLACE FUNCTION lock_initiative_v2(
  p_session_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_state      jsonb;
  v_combatants jsonb;
  v_sorted     jsonb;
  v_turn_order jsonb;
BEGIN
  SELECT raw_state INTO v_state
  FROM combat_state
  WHERE session_run_id = p_session_run_id
  FOR UPDATE;

  v_combatants := v_state->'combatants';

  -- Sort combatants by initiative descending, ties broken by DEX
  SELECT jsonb_agg(elem ORDER BY
    (elem->>'initiative')::integer DESC,
    (elem->'abilityModifiers'->>'DEX')::integer DESC NULLS LAST
  )
  INTO v_sorted
  FROM jsonb_array_elements(v_combatants) AS t(elem);

  -- Build the immutable turn order (just the IDs)
  SELECT jsonb_agg(elem->>'id')
  INTO v_turn_order
  FROM jsonb_array_elements(v_sorted) AS t(elem);

  UPDATE combat_state
  SET
    raw_state = raw_state
      || jsonb_build_object('combatants', v_sorted)
      || jsonb_build_object('turnOrder', v_turn_order)
      || jsonb_build_object('activeTurnIndex', 0)
      || jsonb_build_object('round', 1)
      || jsonb_build_object('initiativePhase', false),
    updated_at = now()
  WHERE session_run_id = p_session_run_id;

  INSERT INTO combat_feed (session_run_id, text, kind, is_public)
  VALUES (p_session_run_id, '⚔ Initiative locked. Round 1 begins.', 'system', true);

  RETURN jsonb_build_object('turnOrder', v_turn_order, 'combatants', v_sorted);
END;
$$;
```

### New table: `combat_save_prompts`

Replace the current `__SAVE_PROMPT__` JSON-in-text hack with a proper table.

```sql
CREATE TABLE IF NOT EXISTS combat_save_prompts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_run_id   uuid NOT NULL REFERENCES session_state(session_run_id) ON DELETE CASCADE,
  spell_name       text NOT NULL,
  save_ability     text NOT NULL,      -- 'DEX' | 'CON' | 'WIS' etc.
  save_dc          integer NOT NULL,
  attacker_name    text,
  targets          jsonb NOT NULL,     -- [{id, name, type}]
  damage_on_fail   text,              -- dice expression e.g. '8d6'
  damage_type      text,
  half_on_success  boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  resolved_at      timestamptz,        -- null = still pending
  resolved_by      text               -- 'dm' | 'auto'
);

CREATE INDEX combat_save_prompts_session_idx
  ON combat_save_prompts (session_run_id)
  WHERE resolved_at IS NULL;
```

Enable Realtime on this table so players receive prompts instantly.

### Update `combat_state` schema

Add `turn_order` and `active_turn_index` as top-level fields in the `raw_state` JSONB. Add a check constraint to reject combatants without IDs:

```sql
-- Add comment documenting the expected raw_state shape
COMMENT ON COLUMN combat_state.raw_state IS
'Shape: {
  combatants: [{id, name, type, curHp, maxHp, tempHp, ac, initiative,
                conditions, concentration, deathSaves, actionEconomy, exhaustionLevel}],
  turnOrder: [id, ...],          -- locked at combat start, immutable during encounter
  activeTurnIndex: integer,      -- index into turnOrder
  round: integer,
  initiativePhase: boolean,
  combatActive: boolean
}';
```

---

## Store Changes

### DM combat store (`dm/src/stores/combatStore/`)

#### actionsSlice.js — replace all multi-step promise chains with single RPC calls

**`applyDamage()`** — Before: 3-step chain (optimistic update → RPC → fallback). After:

```javascript
applyDamage: async (targetId, rawDamage, damageType, attackerName, weaponName) => {
  const { sessionRunId } = get()
  const { data, error } = await supabase.rpc('apply_damage_v2', {
    p_session_run_id: sessionRunId,
    p_target_id:      targetId,
    p_raw_damage:     rawDamage,
    p_damage_type:    damageType,
    p_attacker_name:  attackerName,
    p_weapon_name:    weaponName,
  })
  if (error) {
    console.error('[Combat] applyDamage failed:', error.message)
    // No local state change — wait for Realtime to confirm
    return
  }
  // Realtime subscription will fire and update local state
},
```

No optimistic updates. No fallback chains. The RPC either succeeds or it doesn't. Realtime delivers the confirmed state.

**`applyHealing()`** — same pattern calling `apply_healing_v2`.

**`nextTurn()`** — Before: reads store, loops, writes back. After:

```javascript
nextTurn: async () => {
  const { sessionRunId } = get()
  const { data, error } = await supabase.rpc('advance_turn_v2', {
    p_session_run_id: sessionRunId,
  })
  if (error) console.error('[Combat] advance_turn failed:', error.message)
  // Realtime delivers the new combat_state
},
```

**`sortInitiative()`** — calls `lock_initiative_v2`:

```javascript
lockInitiative: async () => {
  const { sessionRunId } = get()
  const { error } = await supabase.rpc('lock_initiative_v2', {
    p_session_run_id: sessionRunId,
  })
  if (error) console.error('[Combat] lockInitiative failed:', error.message)
},
```

**`toggleCondition()`** — calls `toggle_condition_v2`.

#### stateSlice.js — simplify the realtime handler

Remove the `_combatStateSyncedAt` watermark system entirely. It exists to resolve conflicts between `combat_state` and `character_states` — once `character_states` is not written during combat, there are no conflicts to resolve.

```javascript
// New realtime handler — much simpler
applyCombatStateRow: (row) => {
  if (!row?.raw_state) return

  const state = row.raw_state
  const combatants = parseCombatantsArray(state.combatants)

  set({
    combatants,
    activeTurnIndex:  state.activeTurnIndex ?? 0,
    round:            state.round ?? 1,
    combatActive:     state.combatActive ?? false,
    initiativePhase:  state.initiativePhase ?? false,
    turnOrder:        state.turnOrder ?? [],
  })
},
```

No watermark, no conflict resolution, no stale-check. The DB is authoritative; whatever arrives from Realtime is the truth.

### Player combat store (`players/src/stores/playerStore/`)

#### combatSlice.js — remove all writes during combat

Players should not write to `character_states` while combat is active. Remove:
- `applyDamageToEnemy()` as a direct DB write — replace with RPC call
- `applyHealingToCharacter()` as a direct DB write — replace with RPC call
- Any upsert to `character_states` that happens during a combat action

```javascript
// Players call the same RPCs as the DM — no special player writes
applyDamageToEnemy: async (targetId, amount, damageType) => {
  const { sessionRunId, activeCharacterId } = get()
  const char = get().myCharacter

  const { error } = await supabase.rpc('apply_damage_v2', {
    p_session_run_id: sessionRunId,
    p_target_id:      targetId,
    p_raw_damage:     amount,
    p_damage_type:    damageType,
    p_attacker_name:  char.name,
    p_weapon_name:    'weapon',
  })
  if (error) console.error('[Player] applyDamage failed:', error.message)
  // Realtime delivers the result — no optimistic update
},
```

#### realtimeSlice.js — remove the character_states reconciliation

The entire reconciliation block (lines 105–186) can be deleted. `character_states` is no longer written during combat. The only Realtime handler needed for player HP is the `combat_state` subscription.

Remove the character_states channel during combat entirely:

```javascript
subscribe: () => {
  const { combatActive } = get()

  // Always subscribe to combat_state and combat_feed
  subscribeCombatState()
  subscribeCombatFeed()

  // Only subscribe to character_states when NOT in active combat
  if (!combatActive) {
    subscribeCharacterStates()
  }

  // Subscribe to save_prompts table
  subscribeSavePrompts()
}
```

#### realtimeSlice.js — fix channel lifecycle

Add proper cleanup with verification:

```javascript
unsubscribe: async () => {
  const channels = [
    get().combatChannel,
    get().feedChannel,
    get().charChannel,
    get().savePromptChannel,
  ].filter(Boolean)

  await Promise.allSettled(
    channels.map(ch => supabase.removeChannel(ch))
  )

  set({
    combatChannel:     null,
    feedChannel:       null,
    charChannel:       null,
    savePromptChannel: null,
    connected:         false,
  })
},
```

Use `Promise.allSettled` — if one channel fails to remove, the others still clean up.

---

## Initiative Flow — Redesigned

### Current (broken) flow

1. DM launches encounter → `initiativePhase = true`
2. Each player submits their roll via a store action
3. DM manually sets enemy initiative via UI buttons
4. DM clicks "Sort Init" → client-side sort → `initiativePhase = false`
5. First combatant becomes active

**Problem:** Step 4 has no timeout. If a player doesn't roll, the DM is stuck. Client-side sort is not atomic.

### New flow

#### Phase 1: Initiative Collection (30-second window)

When the DM launches an encounter:

```javascript
launchEncounter: async (encounterId) => {
  // 1. Build combatants from encounter participants
  // 2. Set initiativePhase = true, combat_state populated
  // 3. Start a 30-second countdown in the UI only (no DB timer)
  set({ initiativeCountdown: 30 })
}
```

The countdown is purely cosmetic — it shows players how long they have. The DM can override at any time.

Player rolls initiative:

```javascript
submitInitiative: async (roll) => {
  const { sessionRunId, activeCharacterId } = get()
  await supabase.rpc('set_combatant_initiative', {
    p_session_run_id: sessionRunId,
    p_combatant_id:   activeCharacterId,
    p_initiative:     roll,
  })
  // Realtime shows the DM which players have rolled
}
```

```sql
CREATE OR REPLACE FUNCTION set_combatant_initiative(
  p_session_run_id uuid,
  p_combatant_id   text,
  p_initiative     integer
)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_state jsonb; v_combatants jsonb; v_target jsonb; v_idx integer;
BEGIN
  SELECT raw_state INTO v_state FROM combat_state
  WHERE session_run_id = p_session_run_id FOR UPDATE;

  SELECT elem, ordinality - 1 INTO v_target, v_idx
  FROM jsonb_array_elements(v_state->'combatants') WITH ORDINALITY AS t(elem, ordinality)
  WHERE elem->>'id' = p_combatant_id;

  IF v_target IS NULL THEN RAISE EXCEPTION 'Combatant not found'; END IF;

  v_target := v_target
    || jsonb_build_object('initiative', p_initiative)
    || jsonb_build_object('initiativeSet', true);

  v_combatants := jsonb_set(v_state->'combatants', ARRAY[v_idx::text], v_target);

  UPDATE combat_state
  SET raw_state = raw_state || jsonb_build_object('combatants', v_combatants),
      updated_at = now()
  WHERE session_run_id = p_session_run_id;
END;
$$;
```

#### Phase 2: DM Locks Initiative

DM sees in real-time which players have rolled (green tick) and which haven't (grey). DM sets enemy initiatives via the existing UI (now calling `set_combatant_initiative` RPC). When ready, DM clicks **Begin Combat** → calls `lock_initiative_v2` → turn order is immutable from this point.

Players who didn't roll get whatever initiative value they currently have (0 if never rolled). The DM can set it manually before clicking Begin.

#### DM Initiative Panel UI

```
┌─────────────────────────────────────────────────────────┐
│  ⚔ Initiative                              0:23 left    │
│                                                         │
│  PLAYERS                                                │
│  ✓ Dorothea        18                                   │
│  ✓ Kanan           11                                   │
│  ✗ Danil           —       [Roll for them: d20+1 ↻]    │
│                                                         │
│  ENEMIES                                                │
│  Corrupted Wolf ×2  [d20+1 ↻]  [d20+2 ↻]              │
│                                                         │
│  [Begin Combat →]                                       │
│   (Danil hasn't rolled. Their initiative will be 0.)   │
└─────────────────────────────────────────────────────────┘
```

"Roll for them" button calls `set_combatant_initiative` server-side with `floor(random()*20)+1 + modifier`. The DM can use this to unblock a disconnected player.

---

## Save Prompts — Redesigned

### Current (broken)

Save prompts are encoded as `__SAVE_PROMPT__{JSON}` in `combat_feed.text`. Three different decoders. Silent failures.

### New flow

**DM side — triggering a save:**

```javascript
triggerSave: async ({ spellName, saveAbility, saveDC, targets, damageOnFail, damageType, halfOnSuccess }) => {
  const { sessionRunId, myCharacter } = get()
  const { error } = await supabase
    .from('combat_save_prompts')
    .insert({
      session_run_id:  sessionRunId,
      spell_name:      spellName,
      save_ability:    saveAbility,
      save_dc:         saveDC,
      attacker_name:   myCharacter?.name ?? 'DM',
      targets:         targets,
      damage_on_fail:  damageOnFail,
      damage_type:     damageType,
      half_on_success: halfOnSuccess,
    })
  if (error) console.error('[Combat] triggerSave failed:', error.message)
}
```

**Player side — receiving a save prompt:**

Realtime subscription on `combat_save_prompts` filters by `session_run_id`. When a row arrives with `resolved_at IS NULL`, check if the player's character is in `targets`:

```javascript
subscribeSavePrompts: () => {
  const channel = supabase
    .channel('save-prompts')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'combat_save_prompts',
      filter: `session_run_id=eq.${sessionRunId}`
    }, (payload) => {
      const prompt = payload.new
      const myId = get().activeCharacterId
      const isTarget = prompt.targets.some(t => t.id === myId)
      if (isTarget) {
        set({ activeSavePrompt: prompt })
      }
    })
    .subscribe()
  set({ savePromptChannel: channel })
}
```

**Player rolls the save:**

```javascript
rollSave: async (promptId) => {
  const prompt = get().activeSavePrompt
  const char = get().myCharacter
  const modKey = prompt.save_ability   // 'DEX'
  const mod = char.savingThrows.find(s => s.ability === modKey)?.mod ?? 0
  const d20 = Math.floor(Math.random() * 20) + 1
  const total = d20 + mod
  const passed = total >= prompt.save_dc

  // Push to combat feed
  await supabase.from('combat_feed').insert({
    session_run_id: get().sessionRunId,
    text: `${char.name} rolls ${prompt.save_ability} save: ${d20}+${mod}=${total} vs DC ${prompt.save_dc} — ${passed ? 'SUCCESS' : 'FAIL'}`,
    kind: 'save',
    target_id: char.id,
    is_public: true,
    payload: { promptId, total, passed, ability: prompt.save_ability }
  })

  set({ activeSavePrompt: null })

  // If failed and damage is specified, apply it via RPC
  if (!passed && prompt.damage_on_fail) {
    const dmg = rollDice(prompt.damage_on_fail)
    await supabase.rpc('apply_damage_v2', { ... })
  } else if (passed && prompt.half_on_success && prompt.damage_on_fail) {
    const dmg = Math.floor(rollDice(prompt.damage_on_fail) / 2)
    await supabase.rpc('apply_damage_v2', { ... })
  }
}
```

**DM resolves the prompt (marks it done):**

```javascript
resolvePrompt: async (promptId) => {
  await supabase
    .from('combat_save_prompts')
    .update({ resolved_at: new Date().toISOString(), resolved_by: 'dm' })
    .eq('id', promptId)
}
```

The DM's UI subscribes to the same table and shows pending/resolved state per target.

---

## End-of-Combat Sync

When combat ends (`endCombat()`), write the final HP and conditions from `combat_state` back to `character_states`. This is the **only** time `character_states` is written during a session:

```javascript
endCombat: async () => {
  const { combatants, sessionRunId } = get()

  // Sync player combatants back to character_states
  const playerCombatants = combatants.filter(c => c.type === 'player')
  for (const combatant of playerCombatants) {
    await supabase.from('character_states').upsert({
      id:           combatant.id,
      cur_hp:       combatant.curHp,
      temp_hp:      combatant.tempHp,
      conditions:   combatant.conditions,
      concentration: combatant.concentration,
      death_saves:  combatant.deathSaves,
      spell_slots:  combatant.spellSlots,
    }, { onConflict: 'id' })
  }

  // Clear combat state
  await supabase.rpc('end_combat', { p_session_run_id: sessionRunId })

  set({ combatActive: false, combatants: [], turnOrder: [], round: 1 })
}
```

---

## UI Changes

### DM Combat Panel

#### Combat Tracker — what changes

**Remove:** HP edit input on each row (HP is now managed by the damage/heal controls only, not by direct entry which bypassed the RPC)

**Remove:** The "quick damage" buttons (−1, −2, −3, −5, −8, −10) as individual actions. Replace with:

```
[___] damage  [Damage ▾]
              ├─ Bludgeoning
              ├─ Piercing
              ├─ Slashing
              └─ Fire / Cold / etc.
[___] heal    [Heal]
```

Single input, type selector, one button. One RPC call.

**Remove:** The DM `nextTurn` button that calls client-side turn logic. Replace with a button that calls `advance_turn_v2` RPC.

**Add:** Turn order indicator — a horizontal strip showing the full initiative order (from `turnOrder` array), with the active combatant highlighted. This strip never changes during a round (it's the locked order), but the active highlight moves.

```
[ Dorothea 18 ] → [ Wolf ×1 ] → [ Kanan 11 ] → [ Wolf ×2 ] → [ Danil 9 ]
                    ↑ Active now
```

**Add:** Round counter and "End Turn →" button prominently displayed at the top of the combat panel, not buried in the tracker.

**Add:** "Save vs [spell]" button that opens a modal to trigger a save prompt — replaces the current stringly-typed encoding.

#### Initiative Panel — what changes

**Add:** Per-player rolled/not-rolled indicator (green tick / grey dash)
**Add:** "Roll for them" button per unrolled player
**Add:** 30-second visual countdown (cosmetic only)
**Add:** Warning text if a player hasn't rolled before DM clicks Begin

### Player App

#### CombatStrip — what changes

**Remove:** Optimistic HP update that shows before the RPC confirms

**Add:** A "waiting..." state on action buttons while the RPC is in flight — a spinner on the button, disabled state to prevent double-taps

**Add:** Save prompt card that slides up from the bottom when a save prompt arrives (replacing the current `concentrationSavePrompt` overlay pattern which only handles concentration saves):

```
┌──────────────────────────────────────────────────────┐
│  DEX Saving Throw                                    │
│  Fireball — DC 16                                    │
│  Cast by Damir                                       │
│                                                      │
│  DEX Save: +3                                        │
│                                                      │
│  [Roll DEX Save]                                     │
└──────────────────────────────────────────────────────┘
```

**Add:** Visual confirmation when an action lands — a brief (1.5s) success flash on the button, not a toast

---

## Implementation Order

Work through these phases in order. Do not start a phase until the previous one is stable and testable in dev.

### Phase 1 — Database foundation (no UI changes)

1. Write and run the migration for `combat_save_prompts` table
2. Write and run the migration for the five new RPC functions (`apply_damage_v2`, `apply_healing_v2`, `advance_turn_v2`, `toggle_condition_v2`, `lock_initiative_v2`, `set_combatant_initiative`)
3. Test each RPC manually via Supabase SQL editor with sample data
4. Verify RPC locking with two concurrent calls (open two SQL editor tabs, call simultaneously)

### Phase 2 — DM store (wires RPC, removes client logic)

1. Replace `applyDamage()` in `actionsSlice.js` with single RPC call
2. Replace `applyHealing()` with RPC call
3. Replace `nextTurn()` with RPC call
4. Replace `toggleCondition()` with RPC call
5. Replace `sortInitiative()` with `lock_initiative_v2` RPC call
6. Simplify `applyCombatStateRow()` in `stateSlice.js` — remove watermark logic
7. Test: DM can apply damage, advance turns, and toggle conditions without client-side optimism

### Phase 3 — Player store (remove character_states writes during combat)

1. Replace `applyDamageToEnemy()` with RPC call (same `apply_damage_v2`)
2. Replace `applyHealingToCharacter()` with RPC call (same `apply_healing_v2`)
3. Remove all upserts to `character_states` during combat actions
4. Delete the reconciliation block in `realtimeSlice.js` (lines 105–186)
5. Add `subscribeSavePrompts()` channel
6. Fix channel lifecycle with `Promise.allSettled`
7. Test: Player can hit enemies; HP updates via Realtime; no dual-write conflicts

### Phase 4 — Save prompts migration

1. Remove `encodeSavePrompt` / `decodeSavePrompt` from `combatRules.js`
2. Replace `triggerSave()` with insert to `combat_save_prompts`
3. Add `subscribeSavePrompts()` to player store
4. Build the save prompt card UI in the player app
5. Build the DM "trigger save" modal UI
6. Test: DM triggers a fireball save; players see the prompt; rolls flow to feed

### Phase 5 — Initiative redesign

1. Update `launchEncounter()` to populate `initiativePhase: true` in `raw_state`
2. Add 30-second cosmetic countdown to DM Initiative Panel
3. Add per-player rolled/not-rolled indicators
4. Add "Roll for them" button calling `set_combatant_initiative`
5. Replace "Sort Init" button with "Begin Combat →" calling `lock_initiative_v2`
6. Add warning text for unrolled players

### Phase 6 — UI polish

1. Add turn order strip to DM combat panel
2. Unify damage input (single input + type selector)
3. Add loading states to all combat action buttons in player app
4. Add end-of-combat sync to `character_states`
5. Remove HP direct-edit input from combatant rows

---

## Rules for Cursor

- **Every combat write is an RPC call.** If you find yourself writing `supabase.from('combat_state').upsert(...)` in a store action (not an RPC), stop — that logic belongs in a PostgreSQL function.
- **No optimistic updates in combat.** Do not update local store state before the RPC confirms. The user sees a brief loading state; then Realtime delivers the confirmed state. This is the correct trade-off for data integrity.
- **No writes to `character_states` during active combat.** The only exception is `endCombat()` which syncs the final state.
- **`turnOrder` is immutable once set.** Never modify `turnOrder` during a round. `advance_turn_v2` uses `activeTurnIndex` to walk the fixed array. Only `lock_initiative_v2` can write `turnOrder`.
- **Save prompts live in `combat_save_prompts`, not in `combat_feed.text`.** If you see `encodeSavePrompt` or `decodeSavePrompt` being called anywhere, remove them.
- **The watermark system (`_combatStateSyncedAt`) is deleted in Phase 3.** Do not add new code that references it.
- **Test with two browser windows** — DM in one, player in another. The DM applies damage; the player sees the HP change within 1 second. If the player has to refresh to see the change, the Realtime subscription is broken.

---

*Written: April 2026. Based on full audit of dm/src/stores/combatStore/, players/src/stores/playerStore/combatSlice.js, players/src/stores/playerStore/realtimeSlice.js, shared/lib/combat/, and supabase/schema.sql.*
