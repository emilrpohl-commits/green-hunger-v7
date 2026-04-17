import { describe, it, expect } from 'vitest'
import { parseSessionMarkdown } from './parseSessionMarkdown.js'

function sceneBlock(n, title, beatsMd) {
  return `## Scene ${n} — ${title}\n\n${beatsMd}`
}

describe('parseSessionMarkdown', () => {
  it('rejects non-string input', () => {
    expect(() => parseSessionMarkdown(null)).toThrow(TypeError)
    expect(() => parseSessionMarkdown(undefined)).toThrow(TypeError)
    expect(() => parseSessionMarkdown(123)).toThrow(TypeError)
  })

  it('throws when no scene headings are present', () => {
    expect(() => parseSessionMarkdown('# Hello\n\nNo scenes here.')).toThrow(/No scenes detected/i)
  })

  it('throws when a beat heading is not explicit [type] Title', () => {
    const md = [
      '*DM Guide · Session 1*',
      '',
      sceneBlock(
        1,
        'Test',
        ['## Some Random Heading', '', 'Body text without explicit type.'].join('\n'),
      ),
    ].join('\n')
    expect(() => parseSessionMarkdown(md)).toThrow(/Invalid beat heading/i)
  })

  it('parses session number from DM Guide line (digit)', () => {
    const md = [
      '*DM Guide · Session 7*',
      '',
      sceneBlock(1, 'Intro', ['## [narrative] Opening', '', 'Hello.'].join('\n')),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    expect(r.sessionNumber).toBe(7)
  })

  it('parses session number from word numbers', () => {
    const md = [
      '*DM Guide · Session Three*',
      '',
      sceneBlock(1, 'Intro', ['## [narrative] Opening', '', 'Hello.'].join('\n')),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    expect(r.sessionNumber).toBe(3)
  })

  it('falls back to chapter number when session line is absent', () => {
    const md = [
      '*Some preamble*',
      '',
      '*Chapter Five: The Deep Woods*',
      '',
      sceneBlock(1, 'Intro', ['## [prompt] Listen', '', 'Wind in the trees.'].join('\n')),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    expect(r.sessionNumber).toBe(5)
    expect(r.sessionTitle).toMatch(/Deep Woods/i)
  })

  it('infers session number from slug-like token in first lines', () => {
    const md = [
      'Prep notes s12-branch-alpha',
      '',
      sceneBlock(1, 'Intro', ['## [transition] Move on', '', 'Ok.'].join('\n')),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    expect(r.sessionNumber).toBe(12)
  })

  it('normalises CRLF and still parses', () => {
    const md = [
      '*DM Guide · Session 2*\r\n',
      '\r\n',
      sceneBlock(1, 'X', ['## [narrative] A', '', 'B.'].join('\r\n')),
    ].join('')
    const r = parseSessionMarkdown(md)
    expect(r.scenes).toHaveLength(1)
    expect(r.scenes[0].beats[0].content).toMatch(/B/)
  })

  it('detects combat scene when title implies combat', () => {
    const md = [
      '*DM Guide · Session 1*',
      '',
      sceneBlock(1, 'Ambush Fight', ['## [narrative] Setup', '', 'They arrive.'].join('\n')),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    expect(r.scenes[0].sceneType).toBe('combat')
  })

  it('parses explicit beat types including check and decision', () => {
    const md = [
      '*DM Guide · Session 1*',
      '',
      sceneBlock(
        1,
        'Investigation',
        [
          '## [check] Search the room',
          '',
          'Look around.',
          '',
          '## [decision] Choose a path',
          '',
          'Left or right.',
        ].join('\n'),
      ),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    const beats = r.scenes[0].beats
    expect(beats.map((b) => b.type)).toEqual(['check', 'decision'])
  })

  it('collects stat blocks from ## Stat Block — headings', () => {
    const md = [
      '*DM Guide · Session 1*',
      '',
      sceneBlock(
        1,
        'Arena',
        [
          '## [combat] Face the foe',
          '',
          'Prepare yourselves.',
          '',
          '## Stat Block — Test Goblin',
          '',
          'Test Goblin',
          'Small humanoid, neutral — Challenge 1/4 (25 XP)',
          '',
          'STR DEX CON INT WIS CHA',
          '8 14 10 10 8 8',
          '',
          'AC: 15 (leather armor, shield)',
          'HP: 7 (2d6)',
          'Speed: 30 ft.',
        ].join('\n'),
      ),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    expect(r.statBlocks.length).toBeGreaterThanOrEqual(1)
    const names = r.statBlocks.map((s) => s.name)
    expect(names.some((n) => /goblin/i.test(n))).toBe(true)
  })

  it('extracts inline stat block from combat beat body when pattern matches', () => {
    const md = [
      '*DM Guide · Session 1*',
      '',
      sceneBlock(
        1,
        'Fight',
        [
          '## [combat] Sudden attack',
          '',
          'A creature leaps out.',
          '',
          'Inline Creep',
          'Medium monstrosity, unaligned — Challenge 1 (200 XP)',
          '',
          'STR DEX CON INT WIS CHA',
          '16 12 14 6 10 8',
          '',
          'AC: 14 (natural armor)',
          'HP: 22 (3d8 + 9)',
          'Speed: 30 ft.',
        ].join('\n'),
      ),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    const combatBeat = r.scenes[0].beats.find((b) => b.type === 'combat')
    expect(combatBeat).toBeTruthy()
    expect(combatBeat.statBlockRef || combatBeat.inlineStatBlock?.name).toBeTruthy()
    expect(r.statBlocks.some((s) => /creep/i.test(s.name))).toBe(true)
  })

  it('parses skill-check pipe table into mechanicalEffect for [check] beats', () => {
    const md = [
      '*DM Guide · Session 1*',
      '',
      sceneBlock(
        1,
        'Clues',
        [
          '## [check] Examine the desk',
          '',
          '| Trigger | Skill / Save | DC | What They Learn |',
          '| --- | --- | --- | --- |',
          '| Dust | Investigation | 12 | A letter exists |',
        ].join('\n'),
      ),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    const beat = r.scenes[0].beats[0]
    expect(beat.mechanicalEffect).toBeTruthy()
    const parsed = JSON.parse(beat.mechanicalEffect)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed[0].skill).toMatch(/investigation/i)
  })

  it('marks branching scenes and wires branches to parent', () => {
    const md = [
      '*DM Guide · Session 1*',
      '',
      sceneBlock(1, 'Fork', ['## [narrative] At the road', '', 'Split.'].join('\n')),
      '',
      sceneBlock(2, 'Main path', ['## [narrative] Onward', '', 'Continue.'].join('\n')),
      '',
      sceneBlock(
        '2a',
        'Left path',
        ['## [narrative] Woods', '', 'Trees.'].join('\n'),
      ),
    ].join('\n')
    const r = parseSessionMarkdown(md)
    const parent = r.scenes.find((s) => s.sceneNumber === '2')
    const branch = r.scenes.find((s) => s.sceneNumber === '2a')
    expect(branch?.isBranching).toBe(true)
    expect(parent?.branches?.length).toBeGreaterThanOrEqual(1)
    expect(parent.branches[0].targetSceneNumber).toBe('2a')
  })

  it('accepts h1 scene headings without bold markers', () => {
    const md = [
      '*DM Guide · Session 1*',
      '',
      '# Scene 1 — Plain Title',
      '',
      '## [narrative] Start',
      '',
      'Go.',
    ].join('\n')
    const r = parseSessionMarkdown(md)
    expect(r.scenes[0].title).toMatch(/Plain Title/i)
  })
})
