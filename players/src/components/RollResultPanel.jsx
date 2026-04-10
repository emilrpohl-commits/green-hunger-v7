import React, { useEffect } from 'react'

export default function RollResultPanel({ result, charColour, onRollDamage, onUseBardicInspiration, hasBardic, onDismiss }) {
  useEffect(() => {
    if (!result) return
    const t = setTimeout(onDismiss, 12000)
    return () => clearTimeout(t)
  }, [result, onDismiss])

  if (!result) return null

  const critColour = '#d4a820'
  const hitColour = '#6aaa5a'
  const missColour = '#b03030'

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#141814',
      border: `2px solid ${charColour}90`,
      borderRadius: 12,
      padding: '18px 22px',
      zIndex: 200,
      minWidth: 260, maxWidth: 340,
      boxShadow: `0 6px 32px ${charColour}40, 0 2px 8px rgba(0,0,0,0.7)`,
      textAlign: 'center'
    }}>
      <button onClick={onDismiss} style={{
        position: 'absolute', top: 8, right: 10,
        background: 'none', border: 'none', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: 16, lineHeight: 1
      }}>×</button>

      {(result.type === 'skill' || result.type === 'save') && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            {result.type === 'skill' ? 'Skill Check' : 'Saving Throw'} — {result.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: result.crit ? critColour : 'var(--text-primary)', fontWeight: 500, lineHeight: 1 }}>
              {result.d20}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-muted)' }}>+</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: charColour }}>{result.mod >= 0 ? result.mod : result.mod}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-muted)' }}>=</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: result.crit ? critColour : charColour, fontWeight: 700, lineHeight: 1 }}>
              {result.total}
            </span>
          </div>
          {result.crit && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: critColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Natural 20!</div>}
          {result.fumble && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: missColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Natural 1</div>}
          {result.bardicBonus != null && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9070a0', marginBottom: 4 }}>
              + Bardic d6: {result.bardicBonus} → <strong style={{ color: charColour }}>{result.total}</strong>
            </div>
          )}
          {hasBardic && result.bardicBonus == null && (
            <button onClick={onUseBardicInspiration} style={{
              marginTop: 6, padding: '5px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              background: '#9070a020', border: '1px solid #9070a060',
              borderRadius: 'var(--radius)', color: '#b090c0', cursor: 'pointer'
            }}>
              + Use Bardic Inspiration (1d6)
            </button>
          )}
        </>
      )}

      {result.type === 'attack' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Attack — {result.weaponName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: result.crit ? critColour : 'var(--text-primary)', fontWeight: 500, lineHeight: 1 }}>
              {result.d20}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-muted)' }}>+</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: charColour }}>{result.bonus}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-muted)' }}>=</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: result.crit ? critColour : result.hit ? hitColour : missColour, fontWeight: 700, lineHeight: 1 }}>
              {result.total}
            </span>
          </div>
          {result.target && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              vs {result.target.name} (AC {result.target.ac})
            </div>
          )}
          {result.crit && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: critColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Critical Hit!</div>}
          {result.hit === true && !result.crit && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: hitColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Hit!</div>}
          {result.hit === false && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: missColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Miss</div>}
          {(result.hit || result.hit == null) && (
            <button onClick={onRollDamage} style={{
              padding: '8px 20px',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              background: `${charColour}20`, border: `1px solid ${charColour}60`,
              borderRadius: 'var(--radius)', color: charColour, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Roll Damage
            </button>
          )}
        </>
      )}

      {result.type === 'attack-damage' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            {result.crit ? 'Critical Hit!' : 'Hit!'} — {result.weaponName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, color: result.crit ? critColour : hitColour, fontWeight: 700 }}>{result.total}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>vs AC {result.target.ac}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            [{result.rolls.join(' + ')}]{result.modifier ? ` + ${result.modifier}` : ''} = <strong style={{ color: missColour, fontSize: 22 }}>{result.dmgTotal}</strong>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            {result.damageType} damage → {result.target.name}
          </div>
        </>
      )}

      {result.type === 'save-spell' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Forced Save — {result.weaponName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Target must make a <strong style={{ color: charColour }}>{result.saveStr}</strong>
          </div>
          {result.damageTotal != null && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Rolled damage: <strong style={{ color: missColour }}>{result.damageTotal}</strong>
              {result.damageType ? ` ${result.damageType}` : ''}
              {result.target ? ` → ${result.target.name}` : ''}
            </div>
          )}
          <button onClick={onRollDamage} style={{
            padding: '8px 20px',
            fontFamily: 'var(--font-mono)', fontSize: 11,
            background: `${charColour}20`, border: `1px solid ${charColour}60`,
            borderRadius: 'var(--radius)', color: charColour, cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.08em'
          }}>
            {result.damageTotal != null ? 'Apply damage' : 'Roll damage'}
          </button>
        </>
      )}

      {result.type === 'damage' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Damage — {result.weaponName}{result.crit ? ' (Crit!)' : ''}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            [{result.rolls.join(' + ')}]{result.modifier !== 0 ? ` + ${result.modifier}` : ''}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, color: missColour, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
            {result.total}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            {result.damageType} damage
            {result.target ? ` → ${result.target.name}` : ''}
          </div>
          {result.crit && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: critColour, marginTop: 4 }}>Dice doubled!</div>}
        </>
      )}

      {result.type === 'heal' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Healing — {result.spellName}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            [{result.rolls.join(' + ')}]{result.modifier > 0 ? ` + ${result.modifier}` : ''}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, color: hitColour, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
            +{result.total}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            HP restored → {result.targetName}
          </div>
        </>
      )}

      {result.type === 'utility' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
            Spell Cast
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: charColour, marginBottom: result.targetName ? 6 : 0 }}>
            {result.spellName}
          </div>
          {result.targetName && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>→ {result.targetName}</div>
          )}
        </>
      )}

      {result.type === 'bardic' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Bardic Inspiration Granted
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: '#b090c0', fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
            1d6
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Granted to <strong style={{ color: '#b090c0' }}>{result.targetName}</strong>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
            Add to any d20 Test within the hour
          </div>
        </>
      )}
    </div>
  )
}
