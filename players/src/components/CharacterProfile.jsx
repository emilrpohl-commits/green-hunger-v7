import React, { useState } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import useCharacterActions from '../hooks/useCharacterActions'
import RulesLookupPanel from '@shared/components/rules/RulesLookupPanel.jsx'
import PortraitHeader from './PortraitHeader'
import ConditionsBar from './ConditionsBar'
import RollResultPanel from './RollResultPanel'
import DmRollNotification from './DmRollNotification'
import CombatStrip from './CombatStrip'
import InitiativeModal from './InitiativeModal'
import StatsTab from './tabs/StatsTab'
import SpellsTab from './tabs/SpellsTab'
import ActionsTab from './tabs/ActionsTab'
import FeaturesTab from './tabs/FeaturesTab'
import EquipmentTab from './tabs/EquipmentTab'
import SheetEditTab from './tabs/SheetEditTab.jsx'
import StickySummaryBar, { useStickySummaryVisibility } from './StickySummaryBar.jsx'
import PlayerTacticalSection from './PlayerTacticalSection.jsx'
import { GreenMarkTracker } from '@shared/components/greenMarks/index.js'
import PlayerActionStrip from './PlayerActionStrip.jsx'
import { getSfxPrefs, setSfxPrefs } from '@shared/lib/sfxEngine.js'

export default function CharacterProfile({ characterId, onBackToLogin }) {
  const actions = useCharacterActions(characterId)
  const takeShortRest = usePlayerStore((s) => s.takeShortRest)
  const takeLongRest = usePlayerStore((s) => s.takeLongRest)
  const [tab, setTab] = useState('stats')
  const [stripSignal, setStripSignal] = useState(null)
  const [rulesLookupOpen, setRulesLookupOpen] = useState(false)
  const [sfxMute, setSfxMute] = useState(() => getSfxPrefs().muted)
  const [sfxVol, setSfxVol] = useState(() => getSfxPrefs().volume)
  const { sentinelRef, visible: stickyVisible } = useStickySummaryVisibility('-120px 0px 0px 0px 0px')

  if (!actions.char) {
    return (
      <div style={{
        maxWidth: 480,
        margin: '32px auto',
        padding: '24px 28px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
      }}
      >
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          color: 'var(--warning)',
          marginBottom: 10,
          letterSpacing: '0.06em',
        }}
        >
          No character assigned
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 14 }}>
          There is no sheet in the database for this login. Pick another character, ask the DM to assign you in Supabase, or return to the login screen.
        </p>
        {onBackToLogin && (
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--green-mid)',
              background: 'var(--green-dim)',
              color: 'var(--green-bright)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            Back to login
          </button>
        )}
      </div>
    )
  }

  const {
    char, liveChar, curHp, tempHp, concentration, concentrationSpell, conditionsLive, inspiration, classResources,
    canEditState, myCombatant,
    combatActive, combatCombatants, combatActiveCombatantIndex,
    myTurnActive, myEconomy, ilyaAssignedTo,
    spellSlots, activeSpell, spellSlotLevel, enemies, partyChars, playerCharacters,
    spellTarget, spellTargets,
    selectedTarget, healTarget, healSlot, bardicTarget,
    bardicInspirationUses, activeBuffs, myBuffs,
    rollResult, pendingSpellDmg, turnPromptVisible,
    dmRoll, showDmRoll, manualSaveTotal,
    initiativePhase, hasBardic,
    updateMyCharacterHp, updateMyCharacterTempHp,
    setMyCharacterConcentration, patchMyCharacterTacticalJson, setMyCharacterConditions,
    toggleMyActionEconomyField, useSpellSlot,
  } = actions

  const tabs = ['stats', 'spells', 'actions', 'features', 'equipment', ...(canEditState ? ['sheet edit'] : [])]

  const sheetStats = char?.stats && typeof char.stats === 'object' && !Array.isArray(char.stats) ? char.stats : {}

  const acValue = combatActive && myCombatant
    ? (myCombatant.effectiveAc ?? myCombatant.ac ?? sheetStats.ac)
    : sheetStats.ac

  const maxHp = sheetStats.maxHp ?? 0
  const slotsHint = spellSlots && typeof spellSlots === 'object'
    ? Object.entries(spellSlots).map(([lv, s]) => `L${lv}:${(s?.max ?? 0) - (s?.used ?? 0)}`).join(' ')
    : ''

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>
      <RulesLookupPanel open={rulesLookupOpen} onClose={() => setRulesLookupOpen(false)} />

      <StickySummaryBar
        visible={stickyVisible}
        charColour={char.colour}
        curHp={curHp}
        maxHp={maxHp}
        tempHp={tempHp}
        ac={acValue}
        conditions={conditionsLive}
        concentration={concentration}
        concentrationSpell={concentrationSpell}
        resourceHint={slotsHint}
      />

      {showDmRoll && (
        <DmRollNotification
          dmRoll={dmRoll}
          char={char}
          clearDmRoll={actions.clearDmRoll}
          resolveIncomingSavePrompt={actions.resolveIncomingSavePrompt}
          manualSaveTotal={manualSaveTotal}
          setManualSaveTotal={actions.setManualSaveTotal}
        />
      )}

      {turnPromptVisible && (
        <div style={{
          position: 'fixed',
          top: 76,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 260,
          background: '#141814',
          border: `1px solid ${char.colour}88`,
          borderRadius: 10,
          padding: '10px 14px',
          boxShadow: `0 4px 24px ${char.colour}40`,
          minWidth: 220,
          textAlign: 'center',
        }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: char.colour, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Your Turn
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            A:{myEconomy.actionAvailable ? 'ready' : 'used'} · BA:{myEconomy.bonusActionAvailable ? 'ready' : 'used'} · R:{myEconomy.reactionAvailable ? 'ready' : 'used'}
          </div>
        </div>
      )}

      <PortraitHeader
        char={char}
        curHp={curHp}
        tempHp={tempHp}
        concentration={concentration}
        myCombatant={myCombatant}
        combatActive={combatActive}
        charColour={char.colour}
        ilyaAssignedTo={ilyaAssignedTo}
        loggedInAs={characterId}
        showStatBadges={false}
      />

      <div ref={sentinelRef} style={{ height: 1, marginTop: -1 }} aria-hidden />

      <div style={{ padding: '12px 16px 0' }}>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <GreenMarkTracker current={liveChar?.greenMarks ?? 0} />
          <button
            type="button"
            onClick={() => setRulesLookupOpen(true)}
            title="Search SRD rules glossary"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              padding: '6px 12px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Rules
          </button>
        </div>

        <PlayerTacticalSection
          char={char}
          characterId={characterId}
          curHp={curHp}
          tempHp={tempHp}
          maxHp={maxHp}
          ac={acValue}
          speed={sheetStats.speed}
          initiativeLabel={String(sheetStats.initiative ?? '+0')}
          spellSaveDC={sheetStats.spellSaveDC}
          spellSlots={spellSlots}
          conditions={conditionsLive}
          concentration={concentration}
          concentrationSpell={concentrationSpell}
          inspiration={inspiration}
          classResources={classResources}
          combatActive={combatActive}
          myTurnActive={myTurnActive}
          myEconomy={myEconomy}
          canEdit={canEditState}
          onHpDelta={(d) => updateMyCharacterHp(characterId, curHp + d)}
          onTempHp={(t) => updateMyCharacterTempHp(characterId, t)}
          onToggleConcentration={() => setMyCharacterConcentration(characterId, true, '')}
          onConcentrationSpellBlur={(text) => patchMyCharacterTacticalJson(characterId, { concentrationSpell: text || null })}
          onEndConcentration={() => setMyCharacterConcentration(characterId, false, null)}
          onRemoveCondition={(name) => setMyCharacterConditions(
            characterId,
            conditionsLive.filter((c) => c !== name)
          )}
          onSpellSlotClick={(level, mode) => {
            const lv = parseInt(level, 10)
            if (mode === 'use') useSpellSlot(characterId, lv)
          }}
          onToggleEconomy={(kind) => toggleMyActionEconomyField(characterId, kind)}
          onShortRest={canEditState ? () => { takeShortRest(characterId) } : undefined}
          onLongRest={canEditState ? () => { takeLongRest(characterId) } : undefined}
        />

        <PlayerActionStrip
          charColour={char.colour}
          onPick={(id) => {
            const t = Date.now()
            if (id === 'attack') {
              setTab('actions')
              setStripSignal({ type: 'attack', t })
            } else if (id === 'spell') {
              setTab('spells')
              setStripSignal({ type: 'spell_attack', t })
            } else if (id === 'bonus_action') {
              setTab('actions')
              setStripSignal({ type: 'bonus_action', t })
            } else if (id === 'feature') {
              setTab('features')
              setStripSignal({ type: 'feature', t })
            }
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 14, fontSize: 11, color: 'var(--text-muted)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={sfxMute}
              onChange={(e) => {
                const m = e.target.checked
                setSfxMute(m)
                setSfxPrefs({ muted: m })
              }}
            />
            Mute SFX
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            SFX vol
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVol}
              onChange={(e) => {
                const v = Number(e.target.value)
                setSfxVol(v)
                setSfxPrefs({ volume: v })
              }}
              style={{ width: 100 }}
            />
          </label>
        </div>

        {combatActive && (
          <CombatStrip
            char={char}
            myTurnActive={myTurnActive}
            myEconomy={myEconomy}
            combatCombatants={combatCombatants}
            combatActiveCombatantIndex={combatActiveCombatantIndex}
          />
        )}

        <ConditionsBar
          conditions={[]}
          effects={myCombatant?.effects}
          myBuffs={myBuffs}
          concentration={false}
        />

        <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              background: tab === t ? char.colour + '20' : 'transparent',
              border: `1px solid ${tab === t ? char.colour + '60' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
            >
              {t === 'actions' ? '⚔ Actions' : t}
            </button>
          ))}
        </div>

        {tab === 'stats' && (
          <StatsTab char={char} rollSave={actions.rollSave} rollSkill={actions.rollSkill} />
        )}

        {tab === 'spells' && (
          <SpellsTab
            stripSignal={stripSignal}
            char={char}
            spellSlots={spellSlots}
            activeSpell={activeSpell}
            spellSlotLevel={spellSlotLevel}
            setSpellSlotLevel={actions.setSpellSlotLevel}
            spellTarget={spellTarget}
            setSpellTarget={actions.setSpellTarget}
            spellTargets={spellTargets}
            setSpellTargets={actions.setSpellTargets}
            enemies={enemies}
            partyChars={partyChars}
            playerCharacters={playerCharacters}
            characterId={characterId}
            openSpell={actions.openSpell}
            closeSpell={actions.closeSpell}
            castSpell={actions.castSpell}
            resolveSpellForCasting={actions.resolveSpellForCasting}
            combatActive={combatActive}
          />
        )}

        {tab === 'actions' && (
          <ActionsTab
            stripSignal={stripSignal}
            char={char}
            combatActive={combatActive}
            enemies={enemies}
            partyChars={partyChars}
            playerCharacters={playerCharacters}
            characterId={characterId}
            selectedTarget={selectedTarget}
            setSelectedTarget={actions.setSelectedTarget}
            healTarget={healTarget}
            setHealTarget={actions.setHealTarget}
            healSlot={healSlot}
            setHealSlot={actions.setHealSlot}
            bardicTarget={bardicTarget}
            setBardicTarget={actions.setBardicTarget}
            rollAttack={actions.rollAttack}
            rollHeal={actions.rollHeal}
            grantBardic={actions.grantBardic}
            bardicInspirationUses={bardicInspirationUses}
            activeBuffs={activeBuffs}
            spellSlots={spellSlots}
          />
        )}

        {tab === 'features' && <FeaturesTab char={char} />}
        {tab === 'equipment' && <EquipmentTab char={char} />}
        {tab === 'sheet edit' && (
          <SheetEditTab
            char={char}
            canEdit={canEditState}
            onSave={(patch) => actions.saveMyCharacterSheet(characterId, patch)}
          />
        )}

      </div>

      <RollResultPanel
        result={rollResult}
        charColour={char.colour}
        onRollDamage={pendingSpellDmg ? actions.rollSpellDamage : actions.rollDamageFromPending}
        onUseBardicInspiration={actions.useBardicInspiration}
        hasBardic={hasBardic}
        onDismiss={actions.dismissRoll}
      />

      {initiativePhase && combatActive && (
        <InitiativeModal
          char={char}
          characterId={characterId}
          combatCombatants={combatCombatants}
          submitInitiative={actions.submitInitiative}
          pushRoll={actions.pushRoll}
        />
      )}
    </div>
  )
}
