import React from 'react'
import { CollapsibleDmCharacterPanel } from './DmPartyCards.jsx'

/**
 * Default collapsed: name + HP. Expand for full DM controls.
 */
export default function CollapsibleDmPartyPanel({ characters, tagLabel = 'Player' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {characters.map((char) => (
        <CollapsibleDmCharacterPanel key={char.id} char={char} tagLabel={tagLabel} />
      ))}
    </div>
  )
}
