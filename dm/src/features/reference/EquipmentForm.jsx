import React, { useState } from 'react'
import { inputStyle, labelStyle } from './ReferenceFormPrimitives.jsx'

const CATEGORY_OPTIONS = ['Weapon', 'Armour', 'Adventuring Gear', 'Tool', 'Mount', 'Vehicle']
const DAMAGE_TYPES = ['', 'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder']
const PROPERTY_OPTIONS = ['Ammunition', 'Finesse', 'Heavy', 'Light', 'Loading', 'Reach', 'Special', 'Thrown', 'Two-Handed', 'Versatile', 'Monk']

export default function EquipmentForm({ value, onChange }) {
  const item = value || {}
  const [tab, setTab] = useState('core')
  const props = item.properties || []
  const isWeapon = (item.equipment_category || '').toLowerCase() === 'weapon'
  const isArmour = /armour|armor|shield/i.test(item.equipment_category || '')

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {['core', 'weapon', 'armour', 'other'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{ padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: tab === t ? 'var(--green-dim)' : 'transparent', color: tab === t ? 'var(--green-bright)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>{t}</button>
        ))}
      </div>
      {tab === 'core' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={item.name || ''} onChange={(e) => onChange({ ...item, name: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={item.equipment_category || 'Weapon'} onChange={(e) => onChange({ ...item, equipment_category: e.target.value })}>
              {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Cost</label>
              <input type="number" style={inputStyle} value={item.cost_quantity ?? ''} onChange={(e) => onChange({ ...item, cost_quantity: e.target.value ? parseInt(e.target.value, 10) : null })} />
            </div>
            <div>
              <label style={labelStyle}>Unit</label>
              <select style={inputStyle} value={item.cost_unit || 'gp'} onChange={(e) => onChange({ ...item, cost_unit: e.target.value })}>
                {['gp', 'sp', 'cp'].map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Weight (lb)</label>
            <input type="number" style={inputStyle} value={item.weight_lb ?? ''} onChange={(e) => onChange({ ...item, weight_lb: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>
      )}
      {tab === 'weapon' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, opacity: isWeapon ? 1 : 0.6 }}>
          <div>
            <label style={labelStyle}>Weapon Category</label>
            <select style={inputStyle} value={item.weapon_category || ''} onChange={(e) => onChange({ ...item, weapon_category: e.target.value || null })}>
              <option value="">None</option>
              <option value="Simple">Simple</option>
              <option value="Martial">Martial</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Range Type</label>
            <select style={inputStyle} value={item.weapon_range || ''} onChange={(e) => onChange({ ...item, weapon_range: e.target.value || null })}>
              <option value="">None</option>
              <option value="Melee">Melee</option>
              <option value="Ranged">Ranged</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Damage Dice</label>
            <input style={inputStyle} value={item.damage_dice || ''} onChange={(e) => onChange({ ...item, damage_dice: e.target.value || null })} placeholder="1d8" />
          </div>
          <div>
            <label style={labelStyle}>Damage Type</label>
            <select style={inputStyle} value={item.damage_type || ''} onChange={(e) => onChange({ ...item, damage_type: e.target.value || null })}>
              {DAMAGE_TYPES.map((type) => <option key={type} value={type}>{type || 'None'}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Normal Range</label>
            <input type="number" style={inputStyle} value={item.range_normal ?? ''} onChange={(e) => onChange({ ...item, range_normal: e.target.value ? parseInt(e.target.value, 10) : null })} />
          </div>
          <div>
            <label style={labelStyle}>Long Range</label>
            <input type="number" style={inputStyle} value={item.range_long ?? ''} onChange={(e) => onChange({ ...item, range_long: e.target.value ? parseInt(e.target.value, 10) : null })} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Properties</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
              {PROPERTY_OPTIONS.map((prop) => (
                <label key={prop} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={props.includes(prop)} onChange={(e) => onChange({ ...item, properties: e.target.checked ? [...props, prop] : props.filter((x) => x !== prop) })} />
                  {prop}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab === 'armour' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, opacity: isArmour ? 1 : 0.6 }}>
          <div>
            <label style={labelStyle}>Armour Category</label>
            <select style={inputStyle} value={item.weapon_category || ''} onChange={(e) => onChange({ ...item, weapon_category: e.target.value || null })}>
              <option value="">None</option>
              <option value="Light">Light</option>
              <option value="Medium">Medium</option>
              <option value="Heavy">Heavy</option>
              <option value="Shield">Shield</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Base AC</label>
            <input type="number" style={inputStyle} value={item.ac_base ?? ''} onChange={(e) => onChange({ ...item, ac_base: e.target.value ? parseInt(e.target.value, 10) : null })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
            <input type="checkbox" checked={!!item.ac_add_dex_modifier} onChange={(e) => onChange({ ...item, ac_add_dex_modifier: e.target.checked })} />
            Add DEX Modifier
          </label>
          <div>
            <label style={labelStyle}>Max DEX Bonus</label>
            <input type="number" style={inputStyle} value={item.ac_max_dex_bonus ?? ''} onChange={(e) => onChange({ ...item, ac_max_dex_bonus: e.target.value ? parseInt(e.target.value, 10) : null })} />
          </div>
          <div>
            <label style={labelStyle}>Strength Requirement</label>
            <input type="number" style={inputStyle} value={item.strength_minimum ?? ''} onChange={(e) => onChange({ ...item, strength_minimum: e.target.value ? parseInt(e.target.value, 10) : null })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
            <input type="checkbox" checked={!!item.stealth_disadvantage} onChange={(e) => onChange({ ...item, stealth_disadvantage: e.target.checked })} />
            Stealth Disadvantage
          </label>
        </div>
      )}
      {tab === 'other' && (
        <div>
          <label style={labelStyle}>Raw Notes</label>
          <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }} value={item.notes || ''} onChange={(e) => onChange({ ...item, notes: e.target.value })} />
        </div>
      )}
    </div>
  )
}
