// Character images are served from the GitHub repo
// Update this base URL if you rename your repo
const IMG = (name) => `https://emilrpohl-commits.github.io/greenhunger-players/characters/${name}`

export const PLAYER_CHARACTERS = {
  dorothea: {
    id: 'dorothea',
    name: 'Dorothea Flight',
    password: 'Esmae',
    class: 'Bard',
    subclass: 'College of Glamour',
    level: 4,
    species: 'Human',
    background: 'Farmer',
    player: 'BearOfTheSouthWest',
    image: 'Dorothea.png',
    colour: '#9070a0',

    stats: {
      maxHp: 43,
      ac: 13,
      speed: 30,
      initiative: '+1',
      proficiencyBonus: '+2',
      spellAttack: '+6',
      spellSaveDC: 14,
      spellcastingAbility: 'Charisma'
    },

    abilityScores: {
      STR: { score: 10, mod: '+0' },
      DEX: { score: 12, mod: '+1' },
      CON: { score: 14, mod: '+2' },
      INT: { score: 10, mod: '+0' },
      WIS: { score: 14, mod: '+2' },
      CHA: { score: 18, mod: '+4' }
    },

    savingThrows: [
      { name: 'Strength', mod: '+0', proficient: false },
      { name: 'Dexterity', mod: '+3', proficient: true },
      { name: 'Constitution', mod: '+2', proficient: false },
      { name: 'Intelligence', mod: '+0', proficient: false },
      { name: 'Wisdom', mod: '+2', proficient: false },
      { name: 'Charisma', mod: '+6', proficient: true }
    ],

    skills: [
      { name: 'Acrobatics', mod: '+1', ability: 'DEX' },
      { name: 'Animal Handling', mod: '+2', proficient: true, ability: 'WIS' },
      { name: 'Arcana', mod: '+1', ability: 'INT' },
      { name: 'Athletics', mod: '+1', ability: 'STR' },
      { name: 'Deception', mod: '+6', proficient: true, ability: 'CHA' },
      { name: 'History', mod: '+1', ability: 'INT' },
      { name: 'Insight', mod: '+7', proficient: true, expertise: true, ability: 'WIS' },
      { name: 'Intimidation', mod: '+5', ability: 'CHA' },
      { name: 'Investigation', mod: '+1', ability: 'INT' },
      { name: 'Medicine', mod: '+2', ability: 'WIS' },
      { name: 'Nature', mod: '+2', proficient: true, ability: 'INT' },
      { name: 'Perception', mod: '+5', proficient: true, ability: 'WIS' },
      { name: 'Performance', mod: '+5', ability: 'CHA' },
      { name: 'Persuasion', mod: '+8', proficient: true, expertise: true, ability: 'CHA' },
      { name: 'Religion', mod: '+1', ability: 'INT' },
      { name: 'Sleight of Hand', mod: '+1', ability: 'DEX' },
      { name: 'Stealth', mod: '+1', ability: 'DEX' },
      { name: 'Survival', mod: '+5', proficient: true, ability: 'WIS' }
    ],

    spellSlots: {
      1: { max: 4, used: 0 },
      2: { max: 3, used: 0 }
    },

    features: [
      { name: 'Bardic Inspiration', uses: '4 / Long Rest', description: 'Give a creature a d6 to add to one failed d20 test within the hour.' },
      { name: 'Beguiling Magic', uses: '1 / Long Rest', description: 'After casting an Enchantment or Illusion spell, force a creature to save DC 14 Wis or be Charmed/Frightened for 1 min.' },
      { name: 'Mantle of Inspiration', uses: 'Bardic Inspiration', description: 'Expend inspiration, roll die. Up to 4 creatures within 60 ft. gain 2× roll as Temp HP and can move without provoking.' },
      { name: 'Jack of All Trades', uses: 'Passive', description: 'Add half proficiency (+1) to any skill check you\'re not proficient in.' },
      { name: 'Fey Touched', uses: 'Feat', description: 'Always prepared: Command (1/LR free), Misty Step (1/LR free). Spell ability: Charisma.' }
    ],

    spells: {
      cantrips: [
        { name: 'Minor Illusion', level: 0, school: 'Illusion', mechanic: 'utility', castingTime: 'Action', range: '30 ft.', target: null, description: 'Create a sound or image of an object within range. Creatures can use Investigation vs. your spell save DC to see through it.' },
        { name: 'Starry Wisp', level: 0, school: 'Evocation', mechanic: 'attack', castingTime: 'Action', range: '60 ft.', target: 'enemy', toHit: 6, damage: { count: 1, sides: 8, mod: 0, type: 'Radiant' }, description: 'Ranged spell attack. On hit, 1d8 Radiant damage and target sheds dim light (10 ft.) until your next turn.' },
        { name: 'Mage Hand', level: 0, school: 'Conjuration', mechanic: 'utility', castingTime: 'Action', range: '30 ft.', target: null, description: 'Conjure a spectral hand to manipulate objects up to 10 lb., open containers, or retrieve items.' },
      ],
      1: [
        { name: 'Healing Word', level: 1, school: 'Abjuration', mechanic: 'heal', castingTime: 'Bonus Action', range: '60 ft.', target: 'ally', minSlot: 1, upcast: true, healDice: { count: 1, sides: 4, mod: 4 }, perLevelHeal: { count: 1, sides: 4 }, description: 'Heal a creature you can see. +1d4 per slot level above 1st.' },
        { name: 'Silvery Barbs', level: 1, school: 'Enchantment', mechanic: 'utility', castingTime: 'Reaction', range: '60 ft.', target: 'enemy', minSlot: 1, upcast: false, description: 'When a creature succeeds on an attack, check, or save, force it to reroll and use the lower result. Another creature of your choice has advantage on its next roll.' },
        { name: 'Identify', level: 1, school: 'Divination', mechanic: 'utility', castingTime: '1 min (Ritual)', range: 'Touch', target: null, ritual: true, limitedUse: 'Ritual (no slot)', description: 'Learn a magic item\'s properties, attunement, and spells it can produce.' },
        { name: 'Bane', level: 1, school: 'Enchantment', mechanic: 'save', castingTime: 'Action', range: '30 ft.', target: 'enemy', minSlot: 1, upcast: true, concentration: true, saveType: 'CHA', saveDC: 14, appliesCondition: 'Bane', description: 'Up to 3 creatures make CHA saves. On fail, subtract 1d4 from attack rolls and saving throws for 1 min (concentration). +1 creature per slot above 1st.' },
        { name: 'Command', level: 1, school: 'Enchantment', mechanic: 'save', castingTime: 'Action', range: '60 ft.', target: 'enemy', minSlot: 1, upcast: false, saveType: 'WIS', saveDC: 14, limitedUse: '1/LR', description: 'One creature makes a WIS save or obeys a one-word command (Grovel, Flee, Drop, etc.) until end of its next turn.' },
        { name: 'Charm Person', level: 1, school: 'Enchantment', mechanic: 'save', castingTime: 'Action', range: '30 ft.', target: 'enemy', minSlot: 1, upcast: true, saveType: 'WIS', saveDC: 14, alwaysPrepared: true, description: 'A humanoid makes a WIS save or is charmed by you for 1 hour. It regards you as a friendly acquaintance. Ends if you or companions harm it.' },
      ],
      2: [
        { name: 'Aid', level: 2, school: 'Abjuration', mechanic: 'utility', castingTime: 'Action', range: '30 ft.', target: 'party', minSlot: 2, upcast: true, description: 'Up to 3 creatures\' max HP and current HP increase by 5 for 8 hours. +5 per slot above 2nd.' },
        { name: 'Lesser Restoration', level: 2, school: 'Abjuration', mechanic: 'utility', castingTime: 'Action', range: 'Touch', target: 'ally', minSlot: 2, upcast: false, description: 'End one disease or condition (blinded, deafened, paralyzed, or poisoned) afflicting a creature.' },
        { name: 'Shatter', level: 2, school: 'Evocation', mechanic: 'save', castingTime: 'Action', range: '60 ft.', target: 'enemy', minSlot: 2, upcast: true, saveType: 'CON', saveDC: 14, damage: { count: 3, sides: 8, mod: 0, type: 'Thunder' }, perLevel: { count: 1, sides: 8 }, aoe: '10 ft. radius', description: 'Creatures in range make a CON save. On fail, 3d8 Thunder damage (half on success). +1d8 per slot above 2nd.' },
        { name: 'Misty Step', level: 2, school: 'Conjuration', mechanic: 'utility', castingTime: 'Bonus Action', range: '30 ft.', target: 'self', minSlot: 2, limitedUse: '1/LR', description: 'Teleport up to 30 ft. to an unoccupied space you can see. No components required.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', mechanic: 'utility', castingTime: 'Action', range: 'Self', target: 'self', minSlot: 2, alwaysPrepared: true, description: 'Three illusory duplicates appear. When attacked, d20: 6+ hit a duplicate (destroyed). 11+ if 2 remain, 6+ if 1 remains.' },
      ],
    },

    weapons: [
      { name: 'Dagger', hit: '+3', attackBonus: 3, damage: '1d4+1 Piercing', damageDice: { count: 1, sides: 4, modifier: 1, type: 'Piercing' }, notes: 'Finesse, Light, Thrown (20/60)' },
      { name: 'Starry Wisp', hit: '+6', attackBonus: 6, damage: '1d8 Radiant', damageDice: { count: 1, sides: 8, modifier: 0, type: 'Radiant' }, notes: 'Cantrip, 60 ft.' },
      { name: 'Unarmed Strike', hit: '+2', attackBonus: 2, damage: '1 Bludgeoning', damageDice: { count: 0, sides: 0, modifier: 1, type: 'Bludgeoning' }, notes: '' }
    ],

    healingActions: [
      {
        name: 'Healing Word',
        slotLevel: 1,
        maxSlotLevel: 2,
        baseDice: { count: 1, sides: 4, modifier: 4 },
        perLevelBonus: { count: 1, sides: 4 },
        action: 'Bonus Action',
        range: '60 ft',
        target: 'ally',
        note: '+1d4 per slot level above 1st'
      }
    ],

    buffActions: [
      {
        name: 'Bardic Inspiration',
        die: 6,
        maxUses: 4,
        perRest: 'long',
        action: 'Bonus Action',
        range: '60 ft',
        description: 'Grant a creature a d6 Inspiration die to add to any d20 Test within the next hour.',
        target: 'ally'
      }
    ],

    equipment: [
      'Bag of Holding', 'Brooch of the Last Hearth (Attuned)', 'Leather Armour', 'Dagger ×2',
      'Sickle', 'Backpack', 'Bedroll', 'Bell', 'Tinderbox', 'Waterskin', 'Mirror',
      'Bullseye Lantern', 'Costume ×3', 'Iron Pot', 'Oil ×8', 'Rations ×9',
      'Traveller\'s Clothes', 'Potion of Healing'
    ],

    magicItems: [
      {
        name: 'Brooch of the Last Hearth',
        description: 'Attuned. Advantage on saves vs. corruption in corrupted terrain. Tied to the Birna binding.'
      }
    ],

    passiveScores: {
      perception: 15,
      insight: 17,
      investigation: 11
    },

    senses: 'Normal vision',
    languages: 'Common, Elvish',
    backstory: 'Grief-hardened matriarch. Lost twins across generations. Possible fey/hag interference in her bloodline.'
  },

  kanan: {
    id: 'kanan',
    name: 'Kanan Black',
    password: 'Ishmira',
    class: 'Wizard',
    subclass: 'School of Necromancy',
    level: 4,
    species: 'Tiefling',
    background: 'Former Twisted Rune',
    player: 'BearOfTheSouthWest',
    image: 'Kanan.png',
    colour: '#8060a0',

    stats: {
      maxHp: 26,
      ac: 13,
      speed: 30,
      initiative: '+2',
      proficiencyBonus: '+2',
      spellAttack: '+7',
      spellSaveDC: 15,
      spellcastingAbility: 'Intelligence'
    },

    abilityScores: {
      STR: { score: 8, mod: '-1' },
      DEX: { score: 14, mod: '+2' },
      CON: { score: 14, mod: '+2' },
      INT: { score: 18, mod: '+4' },
      WIS: { score: 12, mod: '+1' },
      CHA: { score: 12, mod: '+1' }
    },

    savingThrows: [
      { name: 'Strength', mod: '-1', proficient: false },
      { name: 'Dexterity', mod: '+2', proficient: false },
      { name: 'Constitution', mod: '+2', proficient: false },
      { name: 'Intelligence', mod: '+6', proficient: true },
      { name: 'Wisdom', mod: '+3', proficient: true },
      { name: 'Charisma', mod: '+1', proficient: false }
    ],

    skills: [
      { name: 'Acrobatics', mod: '+2', ability: 'DEX' },
      { name: 'Animal Handling', mod: '+1', ability: 'WIS' },
      { name: 'Arcana', mod: '+8', proficient: true, expertise: true, ability: 'INT' },
      { name: 'Athletics', mod: '-1', ability: 'STR' },
      { name: 'Deception', mod: '+1', ability: 'CHA' },
      { name: 'History', mod: '+6', proficient: true, ability: 'INT' },
      { name: 'Insight', mod: '+1', ability: 'WIS' },
      { name: 'Intimidation', mod: '+1', ability: 'CHA' },
      { name: 'Investigation', mod: '+6', proficient: true, ability: 'INT' },
      { name: 'Medicine', mod: '+3', proficient: true, ability: 'WIS' },
      { name: 'Nature', mod: '+4', ability: 'INT' },
      { name: 'Perception', mod: '+1', ability: 'WIS' },
      { name: 'Performance', mod: '+1', ability: 'CHA' },
      { name: 'Persuasion', mod: '+1', ability: 'CHA' },
      { name: 'Religion', mod: '+4', ability: 'INT' },
      { name: 'Sleight of Hand', mod: '+2', ability: 'DEX' },
      { name: 'Stealth', mod: '+2', ability: 'DEX' },
      { name: 'Survival', mod: '+3', proficient: true, ability: 'WIS' }
    ],

    spellSlots: {
      1: { max: 4, used: 0 },
      2: { max: 3, used: 0 }
    },

    features: [
      { name: 'Arcane Recovery', uses: '1 / Long Rest (after Short Rest)', description: 'Recover spell slots with combined level ≤ half wizard level (2).' },
      { name: 'Grim Harvest', uses: 'Passive', description: 'When you kill a creature with a 1st+ spell, regain HP equal to 3× the spell\'s level (Necromancy) or 2× otherwise.' },
      { name: 'Ritual Adept', uses: 'Passive', description: 'Cast any spell with the ritual tag as a ritual without preparing it, if it\'s in your spellbook.' },
      { name: 'Fiendish Legacy', uses: 'Passive', description: 'Tiefling trait. Access to fiendish legacy spells (Intelligence-based).' },
      { name: 'Magic Initiate (Druid)', uses: 'Feat', description: 'Know 2 Druid cantrips. One 1st-level Druid spell always prepared, castable once per Long Rest for free.' },
      { name: 'Eye of the Hollow Raven', uses: '1/day', description: 'Detect Magic without casting. Also reveals the direction magical sources are moving (Ilya\'s upgrade, until end of session).' }
    ],

    spells: {
      cantrips: [
        { name: 'Chill Touch', level: 0, school: 'Necromancy', mechanic: 'attack', castingTime: 'Action', range: '120 ft.', target: 'enemy', toHit: 7, damage: { count: 1, sides: 10, mod: 0, type: 'Necrotic' }, description: 'Ranged spell attack. On hit, 1d10 Necrotic damage. Target can\'t regain HP until start of your next turn. Undead also get disadvantage on attacks vs. you.' },
        { name: 'Toll the Dead', level: 0, school: 'Necromancy', mechanic: 'save', castingTime: 'Action', range: '60 ft.', target: 'enemy', saveType: 'WIS', saveDC: 15, damage: { count: 1, sides: 8, mod: 0, type: 'Necrotic' }, damageIfHurt: { count: 1, sides: 12, mod: 0, type: 'Necrotic' }, description: 'Target makes a WIS save or takes 1d8 Necrotic (1d12 if the target is missing any HP).' },
        { name: 'Prestidigitation', level: 0, school: 'Transmutation', mechanic: 'utility', castingTime: 'Action', range: '10 ft.', target: null, description: 'Create minor magical effects: soil or clean, create small sensory effects, chill or warm objects, etc.' },
        { name: 'Mending', level: 0, school: 'Transmutation', mechanic: 'utility', castingTime: '1 minute', range: 'Touch', target: null, description: 'Repair a single break or tear in an object (no larger than 1 ft. in any dimension). Cannot repair magic items.' },
      ],
      1: [
        { name: 'Ray of Sickness', level: 1, school: 'Necromancy', mechanic: 'attack', castingTime: 'Action', range: '60 ft.', target: 'enemy', minSlot: 1, upcast: true, toHit: 7, damage: { count: 2, sides: 8, mod: 0, type: 'Poison' }, perLevel: { count: 1, sides: 8 }, description: 'Ranged spell attack. On hit, 2d8 Poison damage and target makes CON save or is Poisoned until end of your next turn. +1d8 per slot above 1st.' },
        { name: 'Mage Armor', level: 1, school: 'Abjuration', mechanic: 'utility', castingTime: 'Action', range: 'Touch', target: 'self', minSlot: 1, upcast: false, description: 'AC becomes 13 + DEX modifier for 8 hours (requires no armour).' },
        { name: 'Magic Missile', level: 1, school: 'Evocation', mechanic: 'auto', castingTime: 'Action', range: '120 ft.', target: 'enemy', minSlot: 1, upcast: true, missiles: 3, perLevelMissiles: 1, damage: { count: 1, sides: 4, mod: 1, type: 'Force' }, description: '3 missiles of force, each dealing 1d4+1 Force damage. Auto-hit — choose any targets. +1 missile per slot above 1st.' },
        { name: 'False Life', level: 1, school: 'Necromancy', mechanic: 'utility', castingTime: 'Action', range: 'Self', target: 'self', minSlot: 1, upcast: true, description: 'Gain 1d4+4 Temporary HP for 1 hour. +5 Temp HP per slot above 1st.' },
        { name: 'Detect Magic', level: 1, school: 'Divination', mechanic: 'utility', castingTime: 'Action (Ritual)', range: 'Self (30 ft.)', target: null, minSlot: 1, ritual: true, concentration: true, limitedUse: 'Eye 1/day (free)', description: 'Sense magical auras within 30 ft. for 10 minutes (concentration). Can use Eye of the Hollow Raven once per day without a spell slot.' },
      ],
      2: [
        { name: 'Scorching Ray', level: 2, school: 'Evocation', mechanic: 'attack', castingTime: 'Action', range: '120 ft.', target: 'enemy', minSlot: 2, upcast: true, toHit: 7, rays: 3, perLevelRays: 1, damage: { count: 2, sides: 6, mod: 0, type: 'Fire' }, description: 'Create 3 rays of fire. Make a separate ranged spell attack for each. On hit, 2d6 Fire damage. +1 ray per slot above 2nd.' },
        { name: 'Mirror Image', level: 2, school: 'Illusion', mechanic: 'utility', castingTime: 'Action', range: 'Self', target: 'self', minSlot: 2, upcast: false, description: 'Three illusory duplicates appear. When attacked, roll d20 to see if a duplicate is hit instead (6+ with 3, 8+ with 2, 11+ with 1). Destroyed duplicate negates the attack.' },
        { name: 'Ray of Enfeeblement', level: 2, school: 'Necromancy', mechanic: 'attack', castingTime: 'Action', range: '60 ft.', target: 'enemy', minSlot: 2, upcast: false, toHit: 7, concentration: true, damage: null, saveType: 'CON', saveDC: 15, description: 'Ranged spell attack. On hit, target makes CON save or deals only half damage with STR-based attacks for 1 min (concentration).' },
      ],
    },

    weapons: [
      { name: 'Chill Touch', hit: '+7', attackBonus: 7, damage: '1d10 Necrotic', damageDice: { count: 1, sides: 10, modifier: 0, type: 'Necrotic' }, notes: 'Cantrip, 120 ft.' },
      { name: 'Toll the Dead', hit: 'WIS DC 15', save: 'WIS 15', damage: '1d12 Necrotic', damageDice: { count: 1, sides: 12, modifier: 0, type: 'Necrotic' }, notes: 'Cantrip, 60 ft. (save)' },
      { name: 'Dagger', hit: '+4', attackBonus: 4, damage: '1d4+2 Piercing', damageDice: { count: 1, sides: 4, modifier: 2, type: 'Piercing' }, notes: 'Finesse, Thrown (20/60)' }
    ],

    healingActions: [
      { name: 'Potion of Healing', dice: { count: 2, sides: 4, modifier: 2 }, action: 'Action', target: 'any', note: '2d4+2' }
    ],

    equipment: [
      'Spellbook', 'Eye of the Hollow Raven (Attuned)', 'Dagger',
      'Mirror', 'Rations ×10', 'Tinderbox', 'Component Pouch',
      'Scholar\'s Pack', 'Ink and Quill', 'Parchment'
    ],

    magicItems: [
      {
        name: 'Eye of the Hollow Raven',
        description: 'Attuned. Once per day: Detect Magic without casting. Reveals magical auras and their direction of movement. Tied to the Birna binding.'
      }
    ],

    passiveScores: {
      perception: 11,
      insight: 11,
      investigation: 16
    },

    senses: 'Darkvision 60 ft.',
    languages: 'Common, Infernal, Elvish, Draconic',
    backstory: 'Former member of the Twisted Rune. Connects genie politics, Calimshan, and manufactured plague. Necromantic pragmatist.'
  },

  danil: {
    id: 'danil',
    name: 'Danil Tanner',
    password: 'Dianara',
    class: 'Sorcerer',
    subclass: 'Aberrant Mind / Genie Touched',
    level: 4,
    species: 'Half-Elf',
    background: 'Genie Touched (Milestone)',
    player: 'BearOfTheSouthWest',
    image: 'Danil.png',
    colour: '#407080',

    stats: {
      maxHp: 26,
      ac: 13,
      speed: 30,
      initiative: '+2',
      proficiencyBonus: '+2',
      spellAttack: '+6',
      spellSaveDC: 14,
      spellcastingAbility: 'Charisma'
    },

    abilityScores: {
      STR: { score: 10, mod: '+0' },
      DEX: { score: 14, mod: '+2' },
      CON: { score: 16, mod: '+3' },
      INT: { score: 12, mod: '+1' },
      WIS: { score: 12, mod: '+1' },
      CHA: { score: 18, mod: '+4' }
    },

    savingThrows: [
      { name: 'Strength', mod: '+0', proficient: false },
      { name: 'Dexterity', mod: '+2', proficient: false },
      { name: 'Constitution', mod: '+5', proficient: true },
      { name: 'Intelligence', mod: '+1', proficient: false },
      { name: 'Wisdom', mod: '+1', proficient: false },
      { name: 'Charisma', mod: '+6', proficient: true }
    ],

    skills: [
      { name: 'Acrobatics', mod: '+2', ability: 'DEX' },
      { name: 'Animal Handling', mod: '+1', ability: 'WIS' },
      { name: 'Arcana', mod: '+3', proficient: true, ability: 'INT' },
      { name: 'Athletics', mod: '+0', ability: 'STR' },
      { name: 'Deception', mod: '+6', proficient: true, ability: 'CHA' },
      { name: 'History', mod: '+1', ability: 'INT' },
      { name: 'Insight', mod: '+3', proficient: true, ability: 'WIS' },
      { name: 'Intimidation', mod: '+4', ability: 'CHA' },
      { name: 'Investigation', mod: '+1', ability: 'INT' },
      { name: 'Medicine', mod: '+1', ability: 'WIS' },
      { name: 'Nature', mod: '+3', proficient: true, ability: 'INT' },
      { name: 'Perception', mod: '+3', proficient: true, ability: 'WIS' },
      { name: 'Performance', mod: '+6', proficient: true, ability: 'CHA' },
      { name: 'Persuasion', mod: '+6', proficient: true, ability: 'CHA' },
      { name: 'Religion', mod: '+1', ability: 'INT' },
      { name: 'Sleight of Hand', mod: '+2', ability: 'DEX' },
      { name: 'Stealth', mod: '+2', ability: 'DEX' },
      { name: 'Survival', mod: '+1', ability: 'WIS' }
    ],

    spellSlots: {
      1: { max: 4, used: 0 },
      2: { max: 3, used: 0 }
    },

    sorceryPoints: { max: 4, used: 0 },

    features: [
      { name: 'Innate Sorcery', uses: '2 / Long Rest', description: 'Bonus Action: unleash simmering magic for 1 minute. Spell save DC increases by 1, you have advantage on spell attack rolls.' },
      { name: 'Font of Magic', uses: '4 Sorcery Points / Long Rest', description: 'Convert sorcery points to spell slots (2SP→L1, 3SP→L2) or spell slots to sorcery points.' },
      { name: 'Metamagic: Careful Spell', uses: 'Sorcery Points', description: 'Spend 1 SP — choose creatures up to CHA mod. They automatically succeed on your spell save.' },
      { name: 'Metamagic: Twinned Spell', uses: 'Sorcery Points', description: 'Spend SP equal to spell level — target a second creature with a single-target spell.' },
      { name: 'Telepathic Speech', uses: 'Passive', description: 'Choose a creature within 30 ft. Communicate telepathically for 4 minutes over 4 miles.' },
      { name: 'Ring of the Unbroken Thread', uses: '1/session', description: 'Reroll one wild magic surge result and take the second result.' }
    ],

    spells: {
      cantrips: [
        { name: 'Lightning Lure', level: 0, school: 'Evocation', mechanic: 'save', castingTime: 'Action', range: '15 ft.', target: 'enemy', saveType: 'STR', saveDC: 14, damage: { count: 1, sides: 8, mod: 0, type: 'Lightning' }, description: 'Target within 15 ft. makes a STR save. On fail, pulled 10 ft. toward you and takes 1d8 Lightning damage.' },
        { name: 'Ray of Frost', level: 0, school: 'Evocation', mechanic: 'attack', castingTime: 'Action', range: '60 ft.', target: 'enemy', toHit: 6, damage: { count: 1, sides: 8, mod: 0, type: 'Cold' }, description: 'Ranged spell attack. On hit, 1d8 Cold damage and target\'s speed is reduced by 10 ft. until start of your next turn.' },
        { name: 'Shocking Grasp', level: 0, school: 'Evocation', mechanic: 'attack', castingTime: 'Action', range: 'Touch', target: 'enemy', toHit: 6, damage: { count: 1, sides: 8, mod: 0, type: 'Lightning' }, description: 'Melee spell attack. On hit, 1d8 Lightning damage and target can\'t take reactions until its next turn starts. Advantage vs. creatures in metal armour.' },
      ],
      1: [
        { name: 'Magic Missile', level: 1, school: 'Evocation', mechanic: 'auto', castingTime: 'Action', range: '120 ft.', target: 'enemy', minSlot: 1, upcast: true, missiles: 3, perLevelMissiles: 1, damage: { count: 1, sides: 4, mod: 1, type: 'Force' }, description: '3 missiles of force, each dealing 1d4+1 Force damage. Auto-hit — choose any targets. +1 missile per slot above 1st.' },
        { name: 'Shield', level: 1, school: 'Abjuration', mechanic: 'utility', castingTime: 'Reaction', range: 'Self', target: 'self', minSlot: 1, upcast: false, description: '+5 AC until start of your next turn, including vs. the triggering attack. Also blocks Magic Missile.' },
        { name: 'Thunderwave', level: 1, school: 'Evocation', mechanic: 'save', castingTime: 'Action', range: 'Self (15 ft. cube)', target: 'enemy', minSlot: 1, upcast: true, saveType: 'CON', saveDC: 14, damage: { count: 2, sides: 8, mod: 0, type: 'Thunder' }, perLevel: { count: 1, sides: 8 }, aoe: '15 ft. cube', description: 'Creatures in a 15 ft. cube make a CON save. On fail, 2d8 Thunder and pushed 10 ft. Half damage on success. +1d8 per slot above 1st.' },
      ],
      2: [
        { name: 'Detect Thoughts', level: 2, school: 'Divination', mechanic: 'save', castingTime: 'Action', range: '30 ft.', target: 'enemy', minSlot: 2, upcast: false, concentration: true, saveType: 'WIS', saveDC: 14, description: 'Read a creature\'s surface thoughts for 1 minute (concentration). If you probe deeper, target makes WIS DC 14 save. On fail, you read deeper thoughts; on success, spell ends.' },
      ],
    },

    weapons: [
      { name: 'Dagger', hit: '+4', attackBonus: 4, damage: '1d4+2 Piercing', damageDice: { count: 1, sides: 4, modifier: 2, type: 'Piercing' }, notes: 'Finesse, Light, Thrown (20/60)' },
      { name: 'Quarterstaff', hit: '+2', attackBonus: 2, damage: '1d6 Bludgeoning', damageDice: { count: 1, sides: 6, modifier: 0, type: 'Bludgeoning' }, notes: 'Versatile' },
      { name: 'Ray of Frost', hit: '+6', attackBonus: 6, damage: '1d8 Cold', damageDice: { count: 1, sides: 8, modifier: 0, type: 'Cold' }, notes: 'Cantrip, 60 ft.' },
      { name: 'Shocking Grasp', hit: '+6', attackBonus: 6, damage: '1d8 Lightning', damageDice: { count: 1, sides: 8, modifier: 0, type: 'Lightning' }, notes: 'Cantrip, Touch, adv. vs metal' }
    ],

    healingActions: [
      { name: 'Potion of Healing', dice: { count: 2, sides: 4, modifier: 2 }, action: 'Action', target: 'any', note: '2d4+2' }
    ],

    equipment: [
      'Ring of the Unbroken Thread (Attuned)', 'Dagger', 'Quarterstaff',
      'Arcane Focus', 'Explorer\'s Pack', 'Rations', 'Waterskin'
    ],

    magicItems: [
      {
        name: 'Ring of the Unbroken Thread',
        description: 'Attuned. Once per session, reroll a wild magic surge result and take the second result. Tied to the Birna binding.'
      }
    ],

    passiveScores: {
      perception: 13,
      insight: 13,
      investigation: 11
    },

    senses: 'Darkvision 60 ft.',
    languages: 'Common, Elvish, one additional',
    backstory: 'Wild magic sorcerer whose power crackles across his skin. The binding organised something that had always felt like raw flare. He is still deciding if that is a good thing.'
  },

  ilya: {
    id: 'ilya',
    name: 'Ilya',
    password: 'Ilyan',
    class: 'Cleric',
    subclass: 'Life Domain',
    level: 7,
    species: 'Human',
    background: 'Scholar',
    player: null,           // assigned by DM at runtime
    isNPC: true,
    image: 'Ilya.png',
    colour: '#608070',

    stats: {
      maxHp: 58,
      ac: 14,
      speed: 30,
      initiative: '+1',
      proficiencyBonus: '+3',
      spellAttack: '+7',
      spellSaveDC: 15,
      spellcastingAbility: 'Wisdom'
    },

    abilityScores: {
      STR: { score: 10, mod: '+0' },
      DEX: { score: 12, mod: '+1' },
      CON: { score: 14, mod: '+2' },
      INT: { score: 16, mod: '+3' },
      WIS: { score: 18, mod: '+4' },
      CHA: { score: 13, mod: '+1' }
    },

    savingThrows: [
      { name: 'Strength',      mod: '+0', proficient: false },
      { name: 'Dexterity',     mod: '+1', proficient: false },
      { name: 'Constitution',  mod: '+2', proficient: false },
      { name: 'Intelligence',  mod: '+3', proficient: false },
      { name: 'Wisdom',        mod: '+7', proficient: true  },
      { name: 'Charisma',      mod: '+4', proficient: true  }
    ],

    skills: [
      { name: 'History',   mod: '+6', proficient: true, ability: 'INT' },
      { name: 'Insight',   mod: '+7', proficient: true, ability: 'WIS' },
      { name: 'Medicine',  mod: '+7', proficient: true, ability: 'WIS' },
      { name: 'Religion',  mod: '+6', proficient: true, ability: 'INT' },
      { name: 'Perception',mod: '+4', ability: 'WIS' },
      { name: 'Persuasion',mod: '+1', ability: 'CHA' },
    ],

    spellSlots: {
      1: { max: 4, used: 0 },
      2: { max: 3, used: 0 },
      3: { max: 3, used: 0 },
      4: { max: 1, used: 0 },
    },

    features: [
      { name: 'Spellcasting', uses: 'Passive', description: 'Wisdom-based. Spell save DC 15, +7 to hit. Prepared spells include Healing Word, Cure Wounds, Lesser Restoration, Dispel Magic, Spirit Guardians, Speak with Dead, Inflict Wounds.' },
      { name: 'Channel Divinity', uses: '2 / Short Rest', description: 'Preserve Life: restore up to 35 HP split among creatures within 30 ft. at 0–half max HP. Also: Turn Undead.' },
      { name: 'Field Suppression', uses: '1 / Short Rest', description: 'Touch — DC 13 CON save or the target is weakened by a creeping malaise until the end of its next turn.' },
      { name: 'Suspension Ritual', uses: 'Action', description: 'Touch a willing or incapacitated corruption-touched creature — compress them into dormant state. Reversible.' },
      { name: 'Divine Intervention', uses: '1 / Long Rest', description: 'Roll d100 — on ≤ level (7), divine aid answers. DM decides the form.' },
    ],

    spells: {
      cantrips: [
        { name: 'Sacred Flame', level: 0, school: 'Evocation', mechanic: 'save', castingTime: 'Action', range: '60 ft.', target: 'enemy', saveType: 'DEX', saveDC: 15, damage: { count: 2, sides: 6, mod: 0, type: 'Radiant' }, description: 'Target makes DEX save or takes 2d6 Radiant. No cover bonus. At level 7 the damage is 2d6.' },
        { name: 'Toll the Dead', level: 0, school: 'Necromancy', mechanic: 'save', castingTime: 'Action', range: '60 ft.', target: 'enemy', saveType: 'WIS', saveDC: 15, damage: { count: 2, sides: 8, mod: 0, type: 'Necrotic' }, description: 'Target makes WIS save or takes 2d8 Necrotic (2d12 if missing any HP). At level 7.' },
        { name: 'Guidance', level: 0, school: 'Divination', mechanic: 'utility', castingTime: 'Action', range: 'Touch', target: 'ally', description: 'Touch a willing creature. Once in the next minute it can add 1d4 to one ability check.' },
      ],
      1: [
        { name: 'Healing Word', level: 1, school: 'Evocation', mechanic: 'heal', castingTime: 'Bonus Action', range: '60 ft.', target: 'ally', minSlot: 1, upcast: true, healDice: { count: 1, sides: 4, mod: 4 }, perLevel: { mod: 1 }, description: 'Bonus action heal. Target regains 1d4+4 HP. +1d4 per slot above 1st.' },
        { name: 'Cure Wounds', level: 1, school: 'Evocation', mechanic: 'heal', castingTime: 'Action', range: 'Touch', target: 'ally', minSlot: 1, upcast: true, healDice: { count: 1, sides: 8, mod: 4 }, perLevel: { count: 1, sides: 8 }, description: 'Touch heal. Target regains 1d8+4 HP. +1d8 per slot above 1st.' },
        { name: 'Inflict Wounds', level: 1, school: 'Necromancy', mechanic: 'attack', castingTime: 'Action', range: 'Touch', target: 'enemy', minSlot: 1, upcast: true, toHit: 7, damage: { count: 3, sides: 10, mod: 0, type: 'Necrotic' }, description: 'Melee spell attack. On hit, 3d10 Necrotic (at 3rd level slot). +1d10 per slot above 1st.' },
      ],
      2: [
        { name: 'Lesser Restoration', level: 2, school: 'Abjuration', mechanic: 'utility', castingTime: 'Action', range: 'Touch', target: 'ally', minSlot: 2, description: 'End one disease, or one condition: blinded, deafened, paralyzed, or poisoned.' },
        { name: 'Hold Person', level: 2, school: 'Enchantment', mechanic: 'save', castingTime: 'Action', range: '60 ft.', target: 'enemy', minSlot: 2, concentration: true, saveType: 'WIS', saveDC: 15, description: 'Paralyze a humanoid for 1 minute (concentration). Repeat save each turn. Attacks vs. target have advantage, hits within 5 ft. are critical.' },
      ],
      3: [
        { name: 'Dispel Magic', level: 3, school: 'Abjuration', mechanic: 'utility', castingTime: 'Action', range: '120 ft.', target: null, minSlot: 3, description: 'End one spell on a target. Spells of 3rd level or lower end automatically; higher requires ability check.' },
        { name: 'Spirit Guardians', level: 3, school: 'Conjuration', mechanic: 'save', castingTime: 'Action', range: 'Self (15 ft.)', target: 'enemy', minSlot: 3, concentration: true, saveType: 'WIS', saveDC: 15, damage: { count: 3, sides: 8, mod: 0, type: 'Necrotic' }, description: 'Spectral forms fill 15 ft. around you for 10 min. Entering or starting turn: 3d8 Necrotic, WIS DC 15 for half. Movement halved in the area.' },
        { name: 'Speak with Dead', level: 3, school: 'Necromancy', mechanic: 'utility', castingTime: 'Action', range: '10 ft.', target: null, minSlot: 3, description: 'A corpse answers up to 5 questions truthfully. It knows only what it knew in life and is under no obligation to volunteer information.' },
      ],
    },

    weapons: [
      { name: 'Mace', hit: '+3', attackBonus: 3, damage: '1d6 Bludgeoning', damageDice: { count: 1, sides: 6, modifier: 0, type: 'Bludgeoning' }, notes: 'Melee' },
      { name: 'Sacred Flame', hit: 'DEX DC 15', save: 'DEX 15', damage: '2d6 Radiant', damageDice: { count: 2, sides: 6, modifier: 0, type: 'Radiant' }, notes: 'Cantrip, 60 ft.' },
      { name: 'Inflict Wounds', hit: '+7', attackBonus: 7, damage: '3d10 Necrotic', damageDice: { count: 3, sides: 10, modifier: 0, type: 'Necrotic' }, notes: 'Touch, 3rd-level slot' },
    ],

    healingActions: [
      { name: 'Healing Word', dice: { count: 1, sides: 4, modifier: 4 }, action: 'Bonus Action', target: 'any', note: '1d4+4, 60 ft.' },
      { name: 'Cure Wounds', dice: { count: 1, sides: 8, modifier: 4 }, action: 'Action', target: 'any', note: '1d8+4, Touch' },
    ],

    equipment: [
      'Mace', 'Chain Shirt', 'Holy Symbol (concealed)',
      'Scholar\'s Pack', 'Field journal', 'Ink and Quill', 'Component Pouch'
    ],

    magicItems: [],

    passiveScores: {
      perception: 14,
      insight: 17,
      investigation: 13
    },

    senses: 'Passive Perception 14',
    languages: 'Common, Elvish, Druidic (partial), Celestial',
    backstory: 'Scholar-cleric with a calm bedside manner and a habit of careful note-taking. Polite, precise, and immediately useful. He came to the forest to study corruption patterns and ended up in over his head.'
  }
}
