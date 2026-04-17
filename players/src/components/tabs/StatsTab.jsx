import React from 'react'
import { Section, RollBtn } from '../ui/Section'
import { usePlayerStore } from '../../stores/playerStore'
import DiceInlineText from '@shared/components/combat/DiceInlineText.jsx'
import { createPlayerDiceRollHandler } from '@shared/lib/diceText/dispatch.js'

export default function StatsTab({ char, rollSave, rollSkill }) {
  const pushRoll = usePlayerStore((s) => s.pushRoll)
  const abilityScores = char?.abilityScores && typeof char.abilityScores === 'object' && !Array.isArray(char.abilityScores) ? char.abilityScores : {}
  const savingThrows = Array.isArray(char.savingThrows) ? char.savingThrows : []
  const skills = Array.isArray(char.skills) ? char.skills : []
  const passiveScores = char?.passiveScores && typeof char.passiveScores === 'object' && !Array.isArray(char.passiveScores) ? char.passiveScores : {}
  const weapons = Array.isArray(char.weapons) ? char.weapons : []
  const st = char?.stats && typeof char.stats === 'object' && !Array.isArray(char.stats) ? char.stats : {}
  const handleInlineRoll = createPlayerDiceRollHandler({
    pushRoll,
    rollerName: char?.name || 'Player',
    defaultContextLabel: `${char?.name || 'Character'}: stats`,
  })

  return (
    <>
      <Section title="Ability Scores">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {Object.entries(abilityScores).map(([stat, val]) => (
            <div key={stat} style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '10px 4px', textAlign: 'center'
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-primary)', fontWeight: 500 }}>{val.mod}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{stat}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{val.score}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Saving Throws">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {char.savingThrows.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: s.proficient ? char.colour : 'var(--border)',
                border: `1px solid ${s.proficient ? char.colour : 'var(--border-bright)'}`
              }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: s.proficient ? 'var(--green-bright)' : 'var(--text-secondary)', minWidth: 28 }}>
                {s.mod}
              </span>
              <span style={{ fontSize: 13, color: s.proficient ? 'var(--text-primary)' : 'var(--text-muted)', flex: 1 }}>
                {s.name}
              </span>
              <RollBtn colour={char.colour} small onClick={() => rollSave(s, { contextLabel: `${s.name} save` })} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Skills">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {skills.map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
              borderBottom: '1px solid var(--border)',
              opacity: s.proficient ? 1 : 0.65
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: s.expertise ? char.colour : s.proficient ? 'var(--green-mid)' : 'transparent',
                border: `1px solid ${s.expertise ? char.colour : s.proficient ? 'var(--green-mid)' : 'var(--border-bright)'}`
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: s.expertise ? char.colour : s.proficient ? 'var(--green-bright)' : 'var(--text-secondary)',
                minWidth: 28
              }}>
                {s.mod}
              </span>
              <span style={{ fontSize: 13, color: s.proficient ? 'var(--text-primary)' : 'var(--text-muted)', flex: 1 }}>
                {s.name}
              </span>
              {s.expertise && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: char.colour, textTransform: 'uppercase', letterSpacing: '0.08em' }}>exp</span>
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{s.ability}</span>
              <RollBtn colour={s.proficient ? char.colour : 'var(--text-muted)'} small onClick={() => rollSkill(s, { contextLabel: `${s.name} check` })} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          <span>● Proficient</span>
          <span style={{ color: char.colour }}>● Expertise</span>
        </div>
      </Section>

      <Section title="Passive Scores">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(passiveScores).map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Weapons & Attacks">
        {weapons.map(w => (
          <div key={w.name} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '6px 0', borderBottom: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{w.name}</div>
              {w.notes && (
                <DiceInlineText
                  text={w.notes}
                  contextLabel={`${char?.name || 'Character'}: ${w.name}`}
                  onRoll={handleInlineRoll}
                  style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}
                />
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green-bright)' }}>{w.hit}</div>
              <DiceInlineText
                text={w.damage}
                contextLabel={`${char?.name || 'Character'}: ${w.name} damage`}
                onRoll={handleInlineRoll}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}
              />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Spell Attack: {st.spellAttack ?? '—'} · Save DC: {st.spellSaveDC ?? '—'}
        </div>
      </Section>

      {char.sorceryPoints && (
        <Section title="Sorcery Points">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Array.from({ length: char.sorceryPoints.max }).map((_, i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--green-mid)', border: '1px solid var(--green-dim)' }} />
            ))}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
              {char.sorceryPoints.max} / Long Rest
            </span>
          </div>
        </Section>
      )}
    </>
  )
}
