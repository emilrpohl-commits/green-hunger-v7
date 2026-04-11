import React from 'react'
import BaseCharacterCard from './BaseCharacterCard.jsx'

export default function PlayerCard(props) {
  return <BaseCharacterCard {...props} tagLabel={props.tagLabel ?? 'Player'} />
}
