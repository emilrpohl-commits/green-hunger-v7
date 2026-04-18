import { describe, it, expect } from 'vitest'
import { sanitizeUserText } from './sanitizeUserText.js'

// Tests run in Node (no window/DOMPurify), so the regex fallback is exercised.

describe('sanitizeUserText', () => {
  it('returns empty string for null', () => {
    expect(sanitizeUserText(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(sanitizeUserText(undefined)).toBe('')
  })

  it('passes plain text through unchanged', () => {
    expect(sanitizeUserText('Hello, world!')).toBe('Hello, world!')
  })

  it('strips script tags', () => {
    const result = sanitizeUserText('<script>alert(1)</script>text')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('</script>')
    expect(result).toContain('text')
  })

  it('strips img tags with onerror', () => {
    const result = sanitizeUserText('<img src=x onerror=alert(1)>safe')
    expect(result).not.toContain('<img')
    expect(result).toContain('safe')
  })

  it('strips arbitrary HTML tags but keeps content', () => {
    const result = sanitizeUserText('<b>bold</b> and <em>italic</em>')
    expect(result).not.toContain('<b>')
    expect(result).not.toContain('<em>')
    expect(result).toContain('bold')
    expect(result).toContain('italic')
  })

  it('handles nested tags', () => {
    const result = sanitizeUserText('<div><span>inner</span></div>')
    expect(result).not.toContain('<div>')
    expect(result).not.toContain('<span>')
    expect(result).toContain('inner')
  })

  it('handles empty string', () => {
    expect(sanitizeUserText('')).toBe('')
  })

  it('coerces numbers to string', () => {
    expect(sanitizeUserText(42)).toBe('42')
  })

  it('coerces booleans to string', () => {
    expect(sanitizeUserText(false)).toBe('false')
  })

  it('strips anchor tags with javascript href', () => {
    const result = sanitizeUserText('<a href="javascript:void(0)">click</a>')
    expect(result).not.toContain('<a')
    expect(result).toContain('click')
  })
})
