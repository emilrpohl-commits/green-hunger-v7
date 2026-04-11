import React from 'react'
import BaseCharacterCard from './BaseCharacterCard.jsx'

export default function CompanionCard(props) {
  return <BaseCharacterCard {...props} tagLabel={props.tagLabel ?? 'Companion'} />
}
