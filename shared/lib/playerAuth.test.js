import { describe, it, expect } from 'vitest'
import { establishPlayerSessionClaims, refreshPlayerSessionRunClaim } from './playerAuth.js'

describe('playerAuth', () => {
  it('exports session claim helpers', () => {
    expect(typeof establishPlayerSessionClaims).toBe('function')
    expect(typeof refreshPlayerSessionRunClaim).toBe('function')
  })
})
