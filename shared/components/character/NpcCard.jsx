import React from 'react'
import BaseCharacterCard from './BaseCharacterCard.jsx'

export default function NpcCard(props) {
  return <BaseCharacterCard {...props} tagLabel={props.tagLabel ?? 'NPC'} />
}
