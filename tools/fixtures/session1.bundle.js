export const SESSION_1 = {
  id: 'session-1',
  title: 'Session One',
  subtitle: 'Our Adventurers Arrive',
  scenes: [
    {
      id: 's1-sundering',
      order: 1,
      title: 'The Sundering',
      subtitle: 'Cold open and separation',
      estimatedTime: '15–20 min',
      dmNote: 'Read the portal sequence slowly. Pause between sentences. Do not rush this.',
      beats: [
        {
          id: 'b1-1',
          order: 1,
          type: 'narrative',
          title: 'Portal Fracture',
          content: 'As the six of you step through the portal from the Inn Between, something goes wrong. Not subtly. Not gradually. There is no flicker, no stumble, no moment to adjust. The world does not shift — it tears.',
          dmNote: 'Read aloud slowly. Let the silence sit after "it tears."'
        },
        {
          id: 'b1-2',
          order: 2,
          type: 'narrative',
          title: 'The Void Between',
          content: 'Light fractures first, splitting into jagged seams that rip outward in impossible angles. Then sound follows — not silence, but something worse. Your breath drags from your lungs as though the air has thickened, your voices stretched thin and distorted beyond recognition.',
          dmNote: null
        },
        {
          id: 'b1-3',
          order: 3,
          type: 'narrative',
          title: 'Separation',
          content: 'The portal does not carry you forward. It pulls you apart. You reach for one another. Fingers brush. Slip. Catch on fabric — a sleeve, a wrist, the edge of a cloak — and then it\'s gone again, torn away as though the world itself resents the connection.',
          dmNote: 'Ask each player: what is the last thing your character reaches for?'
        },
        {
          id: 'b1-4',
          order: 4,
          type: 'narrative',
          title: 'Artos',
          content: 'And then, for one terrible suspended second, it slows. Not stillness — just enough. Enough for you to see him. Artos. Not falling past you. Falling away from you. His face catches the broken light in flashes — surprise, fear, recognition — and then something else. Something deeper, harder to name.',
          dmNote: 'This is the first seed. They won\'t understand it yet. Plant it quietly.'
        },
        {
          id: 'b1-5',
          order: 5,
          type: 'narrative',
          title: 'The Green Light',
          content: 'Below him — if "below" still means anything — a green light blooms. Not bright. Not clean. It spreads slowly, like roots through water, deliberate and reaching. It catches him. For a heartbeat, it almost looks as though he is being held. And then he is gone. Not swallowed. Taken.',
          dmNote: null
        },
        {
          id: 'b1-6',
          order: 6,
          type: 'narrative',
          title: 'Blackout',
          content: 'The fracture collapses inward. A pulse of emerald radiance tears through everything — through you, through the space around you — and for a single, unbearable instant, you feel as though something vast has noticed you. Not seen. Not recognised. Not yet. And then everything goes black.',
          dmNote: 'Full stop. Let silence sit. Then ask each player one grounding question: "What is the first thing Dorothea does when she wakes?" / "What does Danil check for immediately?" / "Does Kanan call out, or listen first?"'
        }
      ]
    },
    {
      id: 's1-silent-forest',
      order: 2,
      title: 'The Silent Forest',
      subtitle: 'Orientation, clues, dread',
      estimatedTime: '30–35 min',
      dmNote: 'Let them regroup and investigate. Do not rush toward danger. The forest\'s wrongness should creep in slowly.',
      beats: [
        {
          id: 'b2-1',
          order: 1,
          type: 'narrative',
          title: 'Awakening',
          content: 'You are in a forest. Old. Pre-kingdom old. The trees are bone-white, their bark smooth as bleached driftwood. The canopy is dense overhead, but the light that filters through is wrong — too grey, too still, as though the sun has forgotten how to move.',
          dmNote: null
        },
        {
          id: 'b2-2',
          order: 2,
          type: 'prompt',
          title: 'No Birds',
          content: 'There are no birds. No insects. The silence is not peaceful. It is the silence of a room just after an argument ends — the kind that has weight.',
          dmNote: 'If players make noise, describe how the silence swallows it. Their voices feel too loud here.'
        },
        {
          id: 'b2-3',
          order: 3,
          type: 'check',
          title: 'Reading the Forest',
          content: 'Players can investigate their surroundings. Let them roll. Reward curiosity.',
          dmNote: 'DC 12 Perception/Survival: Roots subtly reposition, avoiding contact. DC 15: Forest reacts intentionally. DC 18: Movement feels selective, almost aware — the forest is observing behaviour. DC 12 Nature/Arcana on carcass: No insects, faint green-black veining. DC 15: Death is behaving incorrectly. DC 18: Decay is being altered, not progressing.'
        },
        {
          id: 'b2-4',
          order: 4,
          type: 'prompt',
          title: 'The Cobweb',
          content: 'Down the path, where the light is slightly darker, something catches the eye. A feather in a cobweb. Pitch black. It gives a feeling of longing.',
          dmNote: 'Investigation DC 10: The feather is from no bird native to this region. DC 15: It has been here a long time but has not decayed.'
        },
        {
          id: 'b2-5',
          order: 5,
          type: 'prompt',
          title: 'Wrong Wind',
          content: 'The wind moves in the wrong direction. Not against you — that would make sense. It moves sideways, cutting across the path at an angle that serves nothing. It avoids certain trees entirely.',
          dmNote: 'Nature/Perception DC 15: Wind avoids certain areas. DC 18: Air movement feels directed. Local rules are being bent.'
        }
      ]
    },
    {
      id: 's1-raven',
      order: 3,
      title: 'The Watching Raven',
      subtitle: 'Seed the twist',
      estimatedTime: '10 min',
      dmNote: 'It is uncanny, not flashy. Do not make this dramatic. Make it quietly wrong.',
      beats: [
        {
          id: 'b3-1',
          order: 1,
          type: 'narrative',
          title: 'First Sighting',
          content: 'High up, at the edge of perception, a raven watches. It has been there since you woke, if you think about it. You didn\'t think about it.',
          dmNote: null
        },
        {
          id: 'b3-2',
          order: 2,
          type: 'prompt',
          title: 'The Raven\'s Stillness',
          content: 'Ravens move. They cock their heads. They fidget. This one does not. It watches with an attention that feels borrowed from something larger.',
          dmNote: 'Perception DC 15: The raven hasn\'t blinked. DC 18: Its shadow falls at the wrong angle for the light. If approached: it does not flee. It waits until they are very close, then lifts off without sound.'
        },
        {
          id: 'b3-3',
          order: 3,
          type: 'prompt',
          title: 'What It Leaves',
          content: 'Where the raven sat, there is a single black feather. Identical to the one in the cobweb.',
          dmNote: 'Don\'t explain this. Let it sit. Move on.'
        }
      ]
    },
    {
      id: 's1-hunt',
      order: 4,
      title: 'Corrupted Hunt',
      subtitle: 'Main combat of the session',
      estimatedTime: '30–40 min',
      dmNote: 'Two wolves; sharp but survivable. They move as one creature. They do not behave like wolves.',
      beats: [
        {
          id: 'b4-1',
          order: 1,
          type: 'narrative',
          title: 'The Attack',
          content: 'The wolves come from the wrong direction. Not downwind — there is no downwind here — but from above the path, moving through the branches with a coordination that makes no sense. They don\'t growl before they strike. They simply arrive.',
          dmNote: 'Roll for initiative. Wolf 1 & Wolf 2 both at initiative 20. Shared HP pool: 26 total.'
        },
        {
          id: 'b4-2',
          order: 2,
          type: 'combat trigger',
          statBlockId: 'corrupted-wolf',
          title: 'Combat Stats',
          content: 'WOLF 1 & WOLF 2 — Corrupted. Shared HP: 26. AC: 13. These are not natural wolves.',
          dmNote: 'Initiative order: Wolf 1 (20), Wolf 2 (20), Dorothea (15), Kanan (13), Danil (13). Wolves act as one tactical unit. If one is reduced below 5 HP, it retreats and the other covers. They do not fight to the death.'
        },
        {
          id: 'b4-3',
          order: 3,
          type: 'prompt',
          title: 'Mid-Fight Detail',
          content: 'During combat, if a wolf takes damage: describe the wound briefly glowing green-black before it heals slightly. They are being sustained by something.',
          dmNote: 'This is atmosphere only — don\'t make them actually heal, just describe the visual.'
        },
        {
          id: 'b4-4',
          order: 4,
          type: 'narrative',
          title: 'The Silhouette',
          content: 'At some point during the fight — choose your moment — a massive shape moves at the treeline. Bear-sized. Wrong-shaped. Gone before anyone can be certain they saw it.',
          dmNote: 'This is Artos. Do not confirm this. Passive Perception 16+ notices it clearly. Below that: they glimpsed something. Below 12: they felt watched.'
        },
        {
          id: 'b4-5',
          order: 5,
          type: 'narrative',
          title: 'Aftermath',
          content: 'The wolves, when they fall or flee, do not die like animals. The body (or bodies) desiccate rapidly — skin pulling back from bone, fur receding, as though whatever animated them is leaving in a hurry.',
          dmNote: 'A raven circles once overhead, then is gone. This is the second raven moment. Still do not explain it.'
        }
      ]
    },
    {
      id: 's1-threshold',
      order: 5,
      title: 'The Threshold',
      subtitle: 'Breathing space and setup',
      estimatedTime: '15–20 min',
      dmNote: 'Shift from danger to uneasy refuge. This scene is about the forest becoming slightly less hostile — which should itself feel wrong.',
      beats: [
        {
          id: 'b5-1',
          order: 1,
          type: 'narrative',
          title: 'The Clearing',
          content: 'Ahead: a clearing. Not natural — the trees step back from it too deliberately, as though they were told to. In the centre, the remains of a fire circle. Cold. Weeks old. Someone was here.',
          dmNote: null
        },
        {
          id: 'b5-2',
          order: 2,
          type: 'check',
          title: 'Investigation',
          content: 'The fire circle. What can they learn?',
          dmNote: 'DC 12 Investigation: Three distinct sets of footprints, different sizes. DC 15: One set is heavier — armoured, or carrying something. DC 18: The fire was not started with flint. The ash pattern is wrong. Something else made this heat.'
        },
        {
          id: 'b5-3',
          order: 3,
          type: 'prompt',
          title: 'The Charms',
          content: 'On the trees at the edge of the clearing, at roughly head height, small bundles of bark and root have been tied. They are warm to the touch. They should not be warm.',
          dmNote: 'These are Birna\'s wards. Arcana DC 13: Protective magic, druidic in origin. DC 17: The wards are not keeping something out. They are marking a path.'
        }
      ]
    },
    {
      id: 's1-birna',
      order: 6,
      title: 'Birna Appears',
      subtitle: 'NPC anchor and exposition',
      estimatedTime: '20–25 min',
      dmNote: 'Spirit-form only this session. She is gentle but withholding. She knows more than she says. She does not lie outright — she omits.',
      beats: [
        {
          id: 'b6-1',
          order: 1,
          type: 'narrative',
          title: 'Her Arrival',
          content: 'She does not step out of the trees. She steps out of the light — or rather, the light rearranges itself around a shape that gradually becomes her. A woman. Middle years. Mud on her boots. Eyes the colour of weathered copper.',
          dmNote: 'Voice: quiet, deliberate, never startled. She has been watching them for some time.'
        },
        {
          id: 'b6-2',
          order: 2,
          type: 'prompt',
          title: 'What She Offers',
          content: '"You came through the fracture." Not a question. "You should be dead. The fact that you are not is either very good luck or something I need to understand. Come."',
          dmNote: 'She will not answer questions about herself until they follow her. She will answer questions about the forest carefully — truthfully but incompletely.'
        },
        {
          id: 'b6-3',
          order: 3,
          type: 'prompt',
          title: 'What She Withholds',
          content: 'If asked about the bear/large shape: "The forest has guardians. Not all of them are what they were." She changes the subject.',
          dmNote: 'She knows about Artos. She will not name him yet. If pressed hard, Insight DC 16: she is protecting something, not hiding something. There\'s a difference.'
        },
        {
          id: 'b6-4',
          order: 4,
          type: 'prompt',
          title: 'The Binding',
          content: 'Birna explains — partially — that the fracture has made them vulnerable to the forest\'s influence. She offers a ritual. A binding. It will protect them, she says. It will also let her find them if they get lost.',
          dmNote: 'This is true. She omits that the binding also lets the forest find them — though it intends this as protection, not threat. Insight DC 14: she is asking them to trust something she can\'t fully explain.'
        }
      ]
    },
    {
      id: 's1-ritual',
      order: 7,
      title: 'The Ritual',
      subtitle: 'Level to 4, gifts, cliffhanger',
      estimatedTime: '20–30 min',
      dmNote: 'Treat this as climax, not admin. The levelling should feel earned and strange.',
      beats: [
        {
          id: 'b7-1',
          order: 1,
          type: 'narrative',
          title: 'The Ritual Circle',
          content: 'The ritual circle: a basin of water that glows green-white when Birna dips her fingers in. Each player enters one at a time. The words she speaks are instruction, not poetry — she is telling the magic where to go.',
          dmNote: null
        },
        {
          id: 'b7-2',
          order: 2,
          type: 'prompt',
          title: 'Dorothea\'s Binding',
          content: 'Dorothea: the forest notices her. Not invasion — offering. The binding settles with the authority of a well-made lock. She receives the Brooch of the Last Hearth — a bird in flight, warm, thrumming. Attuned to movement through corrupted places.',
          dmNote: 'Mechanical: advantage on saves vs. corruption in corrupted terrain.'
        },
        {
          id: 'b7-3',
          order: 3,
          type: 'prompt',
          title: 'Kanan\'s Binding',
          content: 'Kanan: he sees everything twice. The clearing as it is and the pattern beneath — ley lines like rivers of light, corruption at the edges pressing with patient terrible pressure. He receives the Eye of the Hollow Raven — a glass eye with a shifting green iris. Enhances magical perception.',
          dmNote: 'Mechanical: can perceive magical auras and corruption levels without casting Detect Magic. Once per day.'
        },
        {
          id: 'b7-4',
          order: 4,
          type: 'prompt',
          title: 'Danil\'s Binding',
          content: 'Danil: his wild magic stops feeling like raw flare. A thousand invisible threads align. Not suppressed — organised. He receives the Ring of the Unbroken Thread — simple silver with gold woven through. Channels wild magic surges.',
          dmNote: 'Mechanical: once per session, may reroll a wild magic surge and take the second result.'
        },
        {
          id: 'b7-5',
          order: 5,
          type: 'narrative',
          title: 'Level Up',
          content: 'The binding completes. The forest exhales — or something does. The players feel different. Stronger. More themselves, somehow. As though the Weald has taken their measure and found them worth the investment.',
          dmNote: 'ALL PLAYERS: Level up to 4. Take a moment for this. It should feel significant.'
        },
        {
          id: 'b7-6',
          order: 6,
          type: 'narrative',
          title: 'The Cliffhanger',
          content: 'As the ritual ends, the raven returns. It lands on Birna\'s shoulder and speaks — not birdsong, not mimicry, but a word. One word, in a voice that sounds like cracking wood: "Artos."',
          dmNote: 'Birna\'s expression does not change. But her hands, at her sides, close into fists. "We should sleep," she says. "Tomorrow we go deeper." End session here.'
        }
      ]
    }
  ]
}

export const CHARACTERS = [
  {
    id: 'dorothea',
    name: 'Dorothea Flight',
    player: 'BearOfTheSouthWest',
    class: 'Bard',
    level: 4,
    species: 'Human',
    maxHp: 43,
    curHp: 43,
    tempHp: 0,
    ac: 13,
    initiative: 15,
    spellSlots: { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 } },
    deathSaves: { successes: 0, failures: 0 },
    concentration: false,
    conditions: [],
    image: 'Dorothea.png'
  },
  {
    id: 'kanan',
    name: 'Kanan Black',
    player: 'BearOfTheSouthWest',
    class: 'Wizard',
    level: 4,
    species: 'Tiefling',
    maxHp: 26,
    curHp: 26,
    tempHp: 0,
    ac: 13,
    initiative: 13,
    spellSlots: { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 } },
    deathSaves: { successes: 0, failures: 0 },
    concentration: false,
    conditions: [],
    image: 'Kanan.png'
  },
  {
    id: 'danil',
    name: 'Danil Tanner',
    player: 'BearOfTheSouthWest',
    class: 'Sorcerer',
    level: 4,
    species: 'Half-Elf',
    maxHp: 26,
    curHp: 26,
    tempHp: 0,
    ac: 13,
    initiative: 13,
    spellSlots: { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 } },
    deathSaves: { successes: 0, failures: 0 },
    concentration: false,
    conditions: [],
    image: 'Danil.png'
  },
  // Ilya — NPC companion, toggled by DM. Included here so he appears in combat when active.
  {
    id: 'ilya',
    name: 'Ilya',
    player: null,
    class: 'Cleric 7',
    species: 'Human',
    maxHp: 58,
    curHp: 58,
    tempHp: 0,
    ac: 14,
    initiative: 0,
    spellSlots: { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 }, 3: { max: 3, used: 0 }, 4: { max: 1, used: 0 } },
    deathSaves: { successes: 0, failures: 0 },
    concentration: false,
    conditions: [],
    image: 'Ilya.png',
    isNPC: true,
  }
]

export const ENEMIES = {
  'corrupted-wolf': {
    id: 'corrupted-wolf',
    name: 'Corrupted Wolf',
    ac: 13,
    maxHp: 13,
    attackBonus: 4,
    damage: '2d4+2',
    dmNote: 'Acts as a pack. Wounds glow green-black briefly before partially closing — atmospheric only, no actual healing. Flees below 3 HP.'
  }
}

// Player-facing synopsis (no DM notes); used by the player client for SceneDisplay
export const SESSION_1_PLAYER = {
  id: 'session-1',
  title: 'Session One',
  subtitle: 'Our Adventurers Arrive',
  scenes: [
    { id: 's1-sundering', order: 1, title: 'The Sundering', subtitle: 'The portal tears. The world breaks.' },
    { id: 's1-silent-forest', order: 2, title: 'The Silent Forest', subtitle: 'Something is watching.' },
    { id: 's1-raven', order: 3, title: 'The Watching Raven', subtitle: 'It has been there since you woke.' },
    { id: 's1-hunt', order: 4, title: 'Corrupted Hunt', subtitle: 'They come from the wrong direction.' },
    { id: 's1-threshold', order: 5, title: 'The Threshold', subtitle: 'Someone was here.' },
    { id: 's1-birna', order: 6, title: 'Birna Appears', subtitle: 'She steps out of the light.' },
    { id: 's1-ritual', order: 7, title: 'The Ritual', subtitle: 'Something old takes notice.' }
  ]
}
