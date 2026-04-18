// Full monster stat blocks for all Green Hunger sessions
// Each block follows D&D 5e conventions

export const STAT_BLOCKS = {

  'corrupted-wolf': {
    id: 'corrupted-wolf',
    name: 'Corrupted Wolf',
    cr: '½',
    size: 'Medium',
    type: 'Beast (Corrupted)',
    ac: 13,
    acNote: 'natural armour',
    maxHp: 13,
    hitDice: '2d8+4',
    speed: '40 ft.',
    stats: { STR: 12, DEX: 15, CON: 14, INT: 3, WIS: 8, CHA: 5 },
    modifiers: { STR: 1, DEX: 2, CON: 2, INT: -4, WIS: -1, CHA: -3 },
    savingThrows: [],
    skills: [{ name: 'Perception', mod: 3 }, { name: 'Stealth', mod: 4 }],
    resistances: ['Necrotic'],
    immunities: { damage: [], condition: ['Charmed', 'Frightened'] },
    senses: 'Darkvision 60 ft., Passive Perception 13',
    languages: '—',
    traits: [
      { name: 'Pack Tactics', desc: 'Advantage on attacks if an ally is adjacent to the target and not incapacitated.' },
      { name: 'Corruption Aura', desc: 'Creatures that start their turn within 5 ft. must make a DC 11 Con save or take 1 necrotic damage.' }
    ],
    actions: [
      { name: 'Bite', type: 'attack', toHit: 4, reach: '5 ft.', targets: 1, damage: '7 (2d4+2) piercing', effect: 'Medium or smaller target must succeed DC 12 Str save or be knocked prone.' },
      { name: 'Corrupted Claw', type: 'attack', toHit: 4, reach: '5 ft.', targets: 1, damage: '4 (1d4+2) slashing + 2 (1d4) necrotic' }
    ],
    combatPrompts: [
      { trigger: 'On bite hit', text: '"The jaws connect with mechanical certainty, and where it touches you there is cold before there is pain."' },
      { trigger: 'On death', text: '"It folds onto itself. The green dims from the eyes slowly, like a coal going grey."' }
    ]
  },

  'darcy-recombined': {
    id: 'darcy-recombined',
    name: 'Darcy, Recombined',
    cr: '4',
    size: 'Large',
    type: 'Humanoid (Corrupted)',
    ac: 13,
    acNote: 'corruption-hardened skin',
    maxHp: 65,
    hitDice: '10d10+10',
    speed: '35 ft.',
    stats: { STR: 16, DEX: 14, CON: 14, INT: 12, WIS: 8, CHA: 6 },
    modifiers: { STR: 3, DEX: 2, CON: 2, INT: 1, WIS: -1, CHA: -2 },
    savingThrows: [],
    skills: [],
    resistances: ['Necrotic'],
    immunities: { damage: [], condition: ['Charmed', 'Frightened'] },
    senses: 'Darkvision 60 ft., Passive Perception 9',
    languages: 'Common (barely)',
    traits: [
      { name: 'Divided Form', desc: 'Two forms share one HP pool. Each can attack separately on its turn. Disadvantage on the second attack if targeting the same creature.' },
      { name: 'Reformation', desc: 'At 30 HP, splits into two Medium creatures (10 HP each, 1 round). Recombines at 15 HP if both survive.' },
      { name: 'Corrupted Instinct', desc: 'When hitting a creature below half HP: Con save DC 13 or 1 Green Mark.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'special', desc: 'Two attacks: one Corrupted Strike and one Seizing Grip (or two Corrupted Strikes).' },
      { name: 'Corrupted Strike', type: 'attack', toHit: 5, reach: '5 ft.', targets: 1, damage: '8 (1d10+3) bludgeoning + 4 (1d8) necrotic' },
      { name: 'Seizing Grip', type: 'attack', toHit: 5, reach: '5 ft.', targets: 1, damage: '6 (1d6+3) bludgeoning', effect: 'Target grappled (escape DC 13).' }
    ],
    legendaryActions: [],
    reactions: [
      { name: 'Instinctive Surge', recharge: '5–6', desc: 'When hit: all creatures within 10 ft., DC 13 Con save or 14 (4d6) necrotic + 1 Green Mark.' }
    ],
    combatPrompts: [
      { trigger: 'On hit', text: '"The blow connects but the body gives wrong — too much, in the wrong direction, as though it hasn\'t agreed on where its joints should be."' },
      { trigger: 'On Reformation', text: '"The form tears in two — not violently, but like cloth pulled at a seam. Two shapes where there was one. Both wearing his face."' },
      { trigger: 'At 50% HP', text: '"The coherence in his face wavers. Both forms orient on the same target simultaneously. Something in them has agreed on a priority."' },
      { trigger: 'On death', text: '"He collapses. The green dims from his eyes slowly, like something stepping back through a door. His last expression is not pain. It is relief."' }
    ]
  },

  'rotting-bloom': {
    id: 'rotting-bloom',
    name: 'Rotting Bloom',
    cr: '1',
    size: 'Medium',
    type: 'Plant (Corrupted)',
    ac: 10,
    acNote: '',
    maxHp: 22,
    hitDice: '4d8+4',
    speed: '10 ft.',
    stats: { STR: 10, DEX: 6, CON: 12, INT: 1, WIS: 10, CHA: 3 },
    modifiers: { STR: 0, DEX: -2, CON: 1, INT: -5, WIS: 0, CHA: -4 },
    savingThrows: [],
    skills: [],
    resistances: ['Necrotic', 'Poison'],
    vulnerabilities: ['Fire'],
    immunities: { damage: [], condition: ['Blinded', 'Deafened', 'Frightened'] },
    senses: 'Tremorsense 30 ft., Passive Perception 10',
    languages: '—',
    traits: [
      { name: 'False Appearance', desc: 'While motionless, indistinguishable from normal oversized fungi.' },
      { name: 'Spore Cloud (Passive)', desc: 'When it takes damage: 5-ft. radius — Con DC 12 or 1d4 poison damage + 1 Green Mark. Once per turn per creature.' }
    ],
    actions: [
      { name: 'Tendril Lash', type: 'attack', toHit: 1, reach: '5 ft.', targets: 1, damage: '3 (1d6) piercing + 2 (1d4) poison' },
      { name: 'Collapse (on death)', type: 'special', desc: 'All within 5 ft. — Con DC 11 or poisoned until end of next turn.' }
    ],
    combatPrompts: [
      { trigger: 'On hit', text: '"The tendril connects and leaves a smear of something dark that smells like turned earth after rain."' },
      { trigger: 'Spore Cloud', text: '"A grey-green mist puffs from the wound. It smells almost pleasant, which makes it worse."' },
      { trigger: 'On death', text: '"It collapses inward with a sound like a held breath finally released. What\'s left is black slurry and a smell of copper."' }
    ]
  },

  'damir-woven-grief': {
    id: 'damir-woven-grief',
    name: 'Damir, the Woven Grief',
    cr: '7',
    size: 'Large',
    type: 'Monstrosity (Corrupted Humanoid)',
    ac: 15,
    acNote: 'natural armour (carapace)',
    maxHp: 110,
    hitDice: '13d10+39',
    speed: '30 ft., climb 30 ft.',
    stats: { STR: 18, DEX: 14, CON: 17, INT: 14, WIS: 18, CHA: 12 },
    modifiers: { STR: 4, DEX: 2, CON: 3, INT: 2, WIS: 4, CHA: 1 },
    savingThrows: [{ name: 'WIS', mod: 7 }, { name: 'CON', mod: 6 }],
    skills: [
      { name: 'Insight', mod: 7 },
      { name: 'Religion', mod: 5 },
      { name: 'Perception', mod: 7 },
      { name: 'Stealth', mod: 5 }
    ],
    resistances: ['Necrotic', 'Poison'],
    immunities: { damage: [], condition: ['Charmed', 'Frightened'] },
    senses: 'Tremorsense 60 ft., Darkvision 120 ft., Passive Perception 17',
    languages: 'Common, Undercommon',
    traits: [
      { name: 'Spider Climb', desc: 'Can climb any surface including ceilings, no check required.' },
      { name: 'Web Sense', desc: 'Knows the exact location of any creature currently in contact with a web he is also touching.' },
      { name: 'Spellcasting (Wis-based, DC 15, +7)', desc: 'Cantrips: Spare the Dying, Sacred Flame, Toll the Dead. 3rd level (1/day): Inflict Wounds, Spirit Guardians.' },
      { name: 'Resurrection Distortion', desc: 'When he casts any healing or restoration spell: target Con save DC 13 or 1 Green Mark.' },
      { name: 'Presence of the Boundary (Aura 10 ft.)', desc: 'Creatures starting their turn within 10 ft. — Wisdom save DC 14 or frightened until start of next turn.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'special', desc: 'Two Leg Strikes + one Bite or Toll the Dead.' },
      { name: 'Leg Strike', type: 'attack', toHit: 7, reach: '10 ft.', targets: 1, damage: '11 (2d6+4) piercing' },
      { name: 'Bite', type: 'attack', toHit: 7, reach: '5 ft.', targets: 1, damage: '13 (2d8+4) piercing + 14 (4d6) poison', effect: 'Con DC 14 or poisoned 1 minute + 1 Green Mark.' },
      { name: 'Web (Recharge 5–6)', type: 'attack', toHit: 5, range: '30/60 ft.', targets: 1, damage: '—', effect: 'Target restrained. Escape DC 14 or deal 15 HP slashing to web.' },
      { name: 'Toll the Dead (Cantrip)', type: 'save', saveType: 'WIS', saveDC: 15, damage: '14 (2d12) necrotic (or 9 (2d8) necrotic if target at full HP)' },
      { name: 'Inflict Wounds (3rd, 1/day)', type: 'attack', toHit: 7, reach: '5 ft.', targets: 1, damage: '28 (8d6) necrotic' },
      { name: 'Spirit Guardians (3rd, Concentration)', type: 'special', desc: '15-ft. radius arachnid shapes. Entering or starting turn in area: 14 (3d8) necrotic, DC 15 Wis for half. Movement halved.' }
    ],
    combatPrompts: [
      { trigger: 'Leg Strike hit', text: '"The leg comes down with mechanical certainty. Not fury. Just force, directed with precision. His face above it is very still."' },
      { trigger: 'Bite hit', text: '"His face lowers toward you, and this — this is the moment you realise the spider and the man are not separate things looking in different directions. They are both looking at you."' },
      { trigger: 'Web', text: '"The silk hits and holds immediately, warm from wherever inside him it came from."' },
      { trigger: 'Spirit Guardians', text: '"Small shapes pour from the walls. Too many legs each. His eyes close briefly, and when they open they are wet. He does not look like he has chosen this."' },
      { trigger: 'At 50% HP', text: '"\'You are better than I expected,\' he says. It does not sound like a compliment or a threat. It sounds like a fact he was not prepared for."' },
      { trigger: 'On death', text: '"He folds inward — the spider body first, then the face, as though the last thing to let go is the part of him that could still look at you. Con DC 13 all in range or 1 Green Mark from death pulse."' }
    ]
  },

  'ilya-npc': {
    id: 'ilya-npc',
    name: 'Ilya (NPC Ally)',
    cr: '7',
    size: 'Medium',
    type: 'Humanoid (Human, Cleric of Talona — secret)',
    ac: 14,
    acNote: 'chain shirt',
    maxHp: 58,
    hitDice: '9d8+18',
    speed: '30 ft.',
    stats: { STR: 10, DEX: 12, CON: 14, INT: 16, WIS: 18, CHA: 13 },
    modifiers: { STR: 0, DEX: 1, CON: 2, INT: 3, WIS: 4, CHA: 1 },
    savingThrows: [{ name: 'WIS', mod: 7 }, { name: 'CHA', mod: 4 }],
    skills: [
      { name: 'Insight', mod: 7 },
      { name: 'Medicine', mod: 7 },
      { name: 'History', mod: 6 },
      { name: 'Religion', mod: 6 }
    ],
    resistances: [],
    immunities: { damage: [], condition: [] },
    senses: 'Passive Perception 14',
    languages: 'Common, Elvish, Druidic (partial), Celestial',
    traits: [
      { name: 'Spellcasting (Wis-based, DC 15, +7)', desc: 'Cleric 7. Prepared spells include: Healing Word, Cure Wounds, Lesser Restoration, Dispel Magic, Spirit Guardians, Speak with Dead, Inflict Wounds (domain).' },
      { name: 'Talona\'s Touch (Secret)', desc: 'Once per short rest: touch — DC 13 Con save or target gains 1 Green Mark. He uses this rarely and subtly. He does not announce it.' },
      { name: 'Suspension Ritual', desc: 'As an action, can perform suspension on a willing or incapacitated corruption-touched creature. Compresses them into a dormant state. Reversible.' },
      { name: 'Divine Sense', desc: 'Detects presence of Celestial, Fiend, or Undead within 60 ft. (Cleric level 7).' }
    ],
    actions: [
      { name: 'Sacred Flame', type: 'save', saveType: 'DEX', saveDC: 15, damage: '14 (4d6) radiant' },
      { name: 'Mace', type: 'attack', toHit: 3, reach: '5 ft.', targets: 1, damage: '4 (1d6) bludgeoning' },
      { name: 'Healing Word (Bonus Action)', type: 'special', desc: '1 target within 60 ft. regains 1d4+4 HP (1st level). Scales: +1d4 per slot level above 1st.' },
      { name: 'Inflict Wounds (1/day, 3rd level)', type: 'attack', toHit: 7, reach: '5 ft.', targets: 1, damage: '28 (8d6) necrotic' }
    ],
    dmNotes: [
      'Ilya is not what he seems. He is polite, precise, and immediately useful. That is exactly the point.',
      'He has been in the forest before. His composed affect after 11 days in a web is the tell.',
      'He will not betray the party directly. He will, however, occasionally act in Talona\'s interest if the opportunity arises without risk to himself.',
      'If "Talona?" is asked: "That name... yes, it is consistent with the symptoms. An interesting hypothesis."',
      'Insight DC 16 during Damir fight: his hands are entirely steady. He has done this before.'
    ]
  }

}
