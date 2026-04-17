import React from 'react'
import DiceInlineText from './DiceInlineText.jsx'

/**
 * Renders text with dice expressions as subtle inline roll buttons.
 *
 * @param {{
 *   text: string,
 *   onRoll?: (result: { total: number, rolls: number[], mod: number, expr: string, contextLabel?: string }) => void,
 *   contextLabel?: string,
 *   style?: React.CSSProperties,
 * }} props
 */
export default function DiceRichText({ text, onRoll, contextLabel, style }) {
  return (
    <DiceInlineText
      text={text}
      onRoll={onRoll}
      contextLabel={contextLabel}
      style={style}
      preserveWhitespace
    />
  )
}
