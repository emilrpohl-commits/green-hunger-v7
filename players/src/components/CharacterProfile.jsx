import React, { useState } from 'react'
import useCharacterActions from '../hooks/useCharacterActions'
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

export default function CharacterProfile({ characterId }) {
  const actions = useCharacterActions(characterId)
  const [tab, setTab] = useState('stats')

  if (!actions.char) return null

  const {
    char, curHp, tempHp, concentration, myCombatant,
    combatActive, combatCombatants, combatActiveCombatantIndex,
    myTurnActive, myEconomy, ilyaAssignedTo,
    spellSlots, activeSpell, spellSlotLevel, enemies, partyChars, playerCharacters,
    spellTarget, spellTargets,
    selectedTarget, healTarget, healSlot, bardicTarget,
    bardicInspirationUses, activeBuffs, myBuffs,
    rollResult, pendingSpellDmg, turnPromptVisible,
    dmRoll, showDmRoll, manualSaveTotal,
    initiativePhase, hasBardic,
  } = actions

  const tabs = ['stats', 'spells', 'actions', 'features', 'equipment']

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>

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
          textAlign: 'center'
        }}>
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
      />

      <div style={{ padding: '12px 16px 0' }}>

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
          conditions={myCombatant?.conditions}
          effects={myCombatant?.effects}
          myBuffs={actions.myBuffs}
          concentration={concentration}
        />

        <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              background: tab === t ? char.colour + '20' : 'transparent',
              border: `1px solid ${tab === t ? char.colour + '60' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}>
              {t === 'actions' ? '⚔ Actions' : t}
            </button>
          ))}
        </div>

        {tab === 'stats' && (
          <StatsTab char={char} rollSave={actions.rollSave} rollSkill={actions.rollSkill} />
        )}

        {tab === 'spells' && (
          <SpellsTab
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
