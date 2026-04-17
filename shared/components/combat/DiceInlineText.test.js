import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import DiceInlineText from './DiceInlineText.jsx'

describe('DiceInlineText', () => {
  it('renders plain text when no onRoll callback is provided', () => {
    const html = renderToStaticMarkup(React.createElement(DiceInlineText, { text: 'Deal 2d6 fire damage.' }))
    expect(html).toContain('Deal 2d6 fire damage.')
    expect(html.includes('<button')).toBe(false)
  })

  it('renders clickable dice buttons when onRoll is provided', () => {
    const html = renderToStaticMarkup(React.createElement(DiceInlineText, {
      text: 'Deal 2d6 fire and 1d4 cold damage.',
      onRoll: () => {},
    }))
    expect(html.includes('<button')).toBe(true)
    expect(html).toContain('2d6')
    expect(html).toContain('1d4')
  })
})

