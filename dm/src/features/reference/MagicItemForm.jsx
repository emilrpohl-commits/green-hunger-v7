import React from 'react'
import { inputStyle, labelStyle } from './ReferenceFormPrimitives.jsx'

const CATEGORIES = ['Armour', 'Potion', 'Ring', 'Rod', 'Scroll', 'Staff', 'Wand', 'Weapon', 'Wondrous Item']
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact']

export default function MagicItemForm({ value, onChange }) {
  const item = value || {}
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={item.name || ''} onChange={(e) => onChange({ ...item, name: e.target.value })} />
      </div>
      <div>
        <label style={labelStyle}>Category</label>
        <select style={inputStyle} value={item.equipment_category || 'Wondrous Item'} onChange={(e) => onChange({ ...item, equipment_category: e.target.value })}>
          {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Rarity</label>
        <select style={inputStyle} value={item.rarity || 'Uncommon'} onChange={(e) => onChange({ ...item, rarity: e.target.value })}>
          {RARITIES.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
        </select>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
        <input type="checkbox" checked={!!item.requires_attunement} onChange={(e) => onChange({ ...item, requires_attunement: e.target.checked })} />
        Requires Attunement
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
        <input type="checkbox" checked={!!item.is_variant} onChange={(e) => onChange({ ...item, is_variant: e.target.checked })} />
        Is Variant
      </label>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Attunement Conditions</label>
        <input style={inputStyle} disabled={!item.requires_attunement} value={item.attunement_conditions || ''} onChange={(e) => onChange({ ...item, attunement_conditions: e.target.value || null })} placeholder="by a spellcaster" />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Source Book</label>
        <input style={inputStyle} value={item.source_book || ''} onChange={(e) => onChange({ ...item, source_book: e.target.value })} />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, minHeight: 180, resize: 'vertical', fontFamily: 'inherit' }} value={item.description || ''} onChange={(e) => onChange({ ...item, description: e.target.value })} />
      </div>
    </div>
  )
}
