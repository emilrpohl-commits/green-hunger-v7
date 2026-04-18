export const SESSION_2 = {
  id: 'session-2',
  title: 'Session Two',
  subtitle: 'Into the Heart',
  scenes: [
    {
      id: 's2-darcy',
      order: 1,
      title: 'Darcy — The Clearing',
      subtitle: 'Moral choice, first consequences',
      estimatedTime: '20–30 min',
      dmNote: 'Let persuasion breathe. Do not rush to combat. The window is finite — three rounds of conversation at most before he loses coherence. If the party dithers too long, he snaps.',
      beats: [
        {
          id: 's2b1-1',
          order: 1,
          type: 'narrative',
          title: 'Darcy Rises',
          content: 'He is not what he was. The form that pulled itself upright from the churned earth is Darcy — the shape of him, at least. Tall. Lean. That familiar hitch of the shoulders. But the proportions are wrong in ways that keep shifting as you look. His hands are too long. His neck bends at an angle that should hurt. His eyes burn green, brighter than they should in this light, and they are not quite tracking together.',
          dmNote: 'Read slowly. Let the wrongness land before he speaks.'
        },
        {
          id: 's2b1-2',
          order: 2,
          type: 'narrative',
          title: 'He Speaks',
          content: 'He looks at you. Something in his face is working. Trying. The jaw moves without sound for a moment before anything comes out. "I— know you," he says. The voice is his, mostly. Dragged through too many layers of something else. "I know you. I remember. I— where did I—" He stops. Presses a hand to the side of his head. Flinches. Behind you, Birna is very still.',
          dmNote: 'Birna does not intervene unless asked. She watches. She is assessing.'
        },
        {
          id: 's2b1-3',
          order: 3,
          type: 'prompt',
          title: 'The Persuasion Window',
          content: 'Darcy is not gone. He is divided. His own consciousness surfaces in brief gaps. The party has a window to reach him — but it requires genuine engagement, not just a roll.',
          dmNote: 'PERSUASION MECHANICS:\n• Speak his name / ground him — Charisma (Persuasion) DC 10: He stops advancing. "It hurts. I can\'t— I keep coming apart."\n• Remind him who he is — Charisma (Persuasion) DC 14: He goes very still. A tear tracks down his face, dries to black. "Don\'t let it use me. Please."\n• Appeal to his fear of becoming a tool — Charisma (Insight + Persuasion) DC 16: He turns to Birna. "Can you— is there a way that isn\'t— is there a way that doesn\'t hurt?"\n• Ask what he remembers of the fracture — Charisma (History) DC 12: "Green light. It pulled us all different ways. I tried to hold on. I couldn\'t."\n• Threaten or pressure him — AUTO FAIL: He snaps back into full corruption. Initiative.'
        },
        {
          id: 's2b1-4',
          order: 4,
          type: 'decision',
          title: 'Persuasion Succeeds',
          content: 'Darcy turns to Birna. He does not ask her for the ritual — he asks her to end it. "I can hold you," Birna says. Not gently. Not unkindly. Simply as a fact. "It will not be comfortable. But you will not be lost." Darcy\'s hands shake. He looks at each of you in turn. "Okay," he says. Just that. "Okay."',
          dmNote: 'Insight DC 15 on Birna: her expression, just before she begins, is not grief. It is satisfaction. It passes quickly. She says nothing that reveals this. Talona retains her foothold. The party does not know this.'
        },
        {
          id: 's2b1-5',
          order: 5,
          type: 'narrative',
          title: 'The Suspension',
          content: 'She does not use the circle this time. She moves directly to Darcy and places both hands on either side of his face, and whatever she speaks is too quiet to hear. The green in his eyes brightens for one terrible moment — then dims, slowly, like a coal going grey. His body does not fall. It folds inward, compressing into a shape that is barely a shape at all — a knot of dark wood and old root fibre, the size of a clenched fist. Birna catches it. Holds it in her palm.',
          dmNote: 'She puts it in a pouch at her hip and does not look at them. If asked what the pouch contains: "A decision. Not yours to revisit." She will not elaborate.'
        },
        {
          id: 's2b1-6',
          order: 6,
          type: 'combat trigger',
          statBlockId: 'darcy-recombined',
          title: 'COMBAT — Darcy Recombined',
          content: 'If persuasion fails: Darcy loses coherence and attacks. He does not recognise them anymore.',
          dmNote: 'STAT BLOCK — DARCY, RECOMBINED (CR 4)\nAC: 13 · HP: 65 · Speed: 35 ft.\nSTR 16 (+3) · DEX 14 (+2) · CON 14 (+2) · INT 12 (+1) · WIS 8 (-1) · CHA 6 (-2)\nResistances: Necrotic · Immunities: Charmed, Frightened\n\nDIVIDED FORM: Two forms share HP pool. Two attacks per turn; disadvantage on second if same target.\nREFORMATION: At 30 HP, splits into two Medium creatures (10 HP each, 1 round). Recombines at 15 HP if both survive.\nCORRUPTED INSTINCT: Hit a creature below half HP → Con save DC 13 or 1 Green Mark.\nINSTINCTIVE SURGE (Recharge 5–6): All within 10 ft., DC 13 Con or 14 (4d6) necrotic + 1 Green Mark.\n\nATTACKS:\n• Corrupted Strike: +5 to hit, 8 (1d10+3) bludgeoning + 4 (1d8) necrotic\n• Seizing Grip: +5 to hit, 6 (1d6+3) bludgeoning, target grappled (escape DC 13)\n\nCOMBAT PROMPTS:\n• On hit: "The blow connects but the body gives wrong — too much, in the wrong direction, as though it hasn\'t agreed on where its joints should be."\n• On Reformation: "The form tears in two — not violently, but like cloth pulled at a seam. Two shapes where there was one. Both wearing his face."\n• On death: "He collapses. The green dims from his eyes slowly, like something stepping back through a door. His last expression is not pain. It is relief."'
        }
      ]
    },
    {
      id: 's2-forest',
      order: 2,
      title: 'Into the Forest',
      subtitle: 'Exploration, dread, rot mechanics',
      estimatedTime: '25–35 min',
      dmNote: 'Raven helps here. Pacing is the atmosphere. Pause. Let them fill the silence. The forest rewards observation and punishes complacency.',
      beats: [
        {
          id: 's2b2-1',
          order: 1,
          type: 'narrative',
          title: 'Birna\'s Send-Off',
          content: '"My brother\'s name is Ilyan. He is a scholar — all intellect and no patience. He went in a fortnight ago and has not come back. He would not have died quietly. If he is alive, he is trapped." She hands you nothing. She offers no map. She gestures toward the treeline with two fingers, as though she is pointing at something offensive. "The corruption concentrates toward the heart. Follow the wrongness. It will not be subtle." A pause. "If you find what is at the centre — do not confront it directly. You are not equipped for that yet. Find Ilyan. Come back." She does not say goodbye.',
          dmNote: null
        },
        {
          id: 's2b2-2',
          order: 2,
          type: 'prompt',
          title: '🦅 Raven Appears — It Helps',
          content: 'The raven appears at a fork in the undergrowth. Two directions look passable. The raven lands on a branch over the left passage, watches the party, then lifts off and circles once before landing again. Then it vanishes. The left passage has fresher air. The right terminates in a bog within twenty feet.',
          dmNote: 'This is Artos guiding them. He cannot explain. He can only point. The bog would have cost 1 Green Mark (Con save DC 13) and 30 minutes of backtracking.'
        },
        {
          id: 's2b2-3',
          order: 3,
          type: 'check',
          title: 'The Whispering Glade',
          content: 'You step into a clearing that is wrong in a different way from the others. The trees here lean inward at the top, their highest branches laced together like fingers. The light through them is not green — it is grey, and it does not move. At the centre of the clearing, the earth is black and soft, and the moss on it forms a pattern. Not a random one. A spiral, dense and deliberate, pressing inward to a central point.',
          dmNote: 'SKILL CHECKS:\n• Examine the spiral — Investigation DC 12: The moss has been arranged. Recently. Something with intent made this.\n• Examine the spiral — Investigation DC 16: A binding symbol, old, predating the current corruption. It is not complete.\n• Stand at the centre — Wisdom Save DC 14: Fail: a voice — not heard, felt — says your character\'s name. Just the name. Nothing else. Gain 1 GREEN MARK.\n• Examine the soil — Nature DC 13: The soil is warm. Not from sunlight. From below.\n\nDM NOTE: Artos made this. He was trying to contain the corruption. He couldn\'t finish it. If players try to complete it: the spiral resists. The moss reforms elsewhere.'
        },
        {
          id: 's2b2-4',
          order: 4,
          type: 'check',
          title: 'ROT OPPORTUNITY — The Black Pool',
          content: 'The path dips toward a shallow pool. The water is dark — not from depth, but from what is in it. A faint sheen of iridescent green floats on the surface. The smell is sweet in a way that curdles quickly into rot. The far bank is clearly visible. The pool is perhaps six feet across.',
          dmNote: 'ROT MECHANICS:\n• Crossing without care: Con save DC 13. Fail → 1 GREEN MARK.\n• Jumping across: Athletics DC 11. Simple — the challenge is noticing what\'s in the water.\n• Examining the water: Nature DC 12 → it is active. Something living in it, too small to see.\n• Drinking the water: 2 GREEN MARKS. Con save DC 15 or poisoned 1 hour. Do not prompt this. Let them try.'
        }
      ]
    },
    {
      id: 's2-bloom',
      order: 3,
      title: 'Rotting Bloom Combat',
      subtitle: 'Minor fight, world-building',
      estimatedTime: '15–20 min',
      dmNote: 'Fast and strange. These are not threatening enemies — they are atmosphere made violent. Three of them. The spore mechanic is the real danger.',
      beats: [
        {
          id: 's2b3-1',
          order: 1,
          type: 'narrative',
          title: 'The Fungi Stir',
          content: 'As the path narrows and the canopy closes, the ground becomes thick with oversized fungi and root-clusters that pulse faintly. You hear it before you see it — a low, wet tearing, like bark splitting under pressure. The fungi at the path\'s edge are not growing. They are unfolding. Each cluster opens from a central stem, revealing something underneath that is neither plant nor animal, and is not pleased to have been noticed.',
          dmNote: 'Notice fungi moving — Perception DC 13: tracking movement, toward sound and vibration. Identify species — Nature DC 15: no natural analogues. Disturb the ground → AUTO: three Rotting Bloom clusters animate.'
        },
        {
          id: 's2b3-2',
          order: 2,
          type: 'combat trigger',
          statBlockId: 'rotting-bloom',
          title: 'COMBAT — Rotting Blooms × 3',
          content: 'Three Rotting Bloom clusters animate and attack.',
          dmNote: 'STAT BLOCK — ROTTING BLOOM (CR 1) × 3\nAC: 10 · HP: 22 · Speed: 10 ft.\nResistances: Necrotic, Poison · Vulnerabilities: Fire\nImmunities (conditions): Blinded, Deafened, Frightened\nSenses: Tremorsense 30 ft., Passive Perception 10\n\nSPORE CLOUD (Passive): When it takes damage, 5-ft. radius — Con DC 12 or 1d4 poison + 1 GREEN MARK. Once per turn per creature.\nFALSE APPEARANCE: While motionless, indistinguishable from normal fungi.\n\nATTACKS:\n• Tendril Lash: +1 to hit, reach 5 ft. Hit: 1d6 piercing + 1d4 poison\n• Collapse (on 0 HP): All within 5 ft., Con DC 11 or poisoned until end of next turn.\n\nCOMBAT PROMPTS:\n• On a hit: "The tendril connects and leaves a smear of something dark that smells like turned earth after rain."\n• On Spore Cloud: "A grey-green mist puffs from the wound. It smells almost pleasant, which makes it worse."\n• On death: "It collapses inward with a sound like a held breath finally released. What\'s left is black slurry and a smell of copper."'
        }
      ]
    },
    {
      id: 's2-fork',
      order: 4,
      title: 'The Fork in the Road',
      subtitle: 'Choice under ambiguity',
      estimatedTime: '10 min',
      dmNote: 'Do not tip the scales. Both paths lead to the heart — left through the druid\'s cabin (30 min longer), right is direct. If the party splits: run both. The raven does not appear at this junction.',
      branches: [
        { label: 'Left Path — The Druid\'s Cabin', targetId: 's2-cabin', description: 'Old boot prints. Wood smoke. More time, more clues.' },
        { label: 'Right Path — Heart Entrance', targetId: 's2-entrance', description: 'No tracks. Ancient stillness. Direct.' }
      ],
      beats: [
        {
          id: 's2b4-1',
          order: 1,
          type: 'narrative',
          title: 'The Division',
          content: 'The path divides. Not at a crossroads — there is no signpost, no deliberate junction. The track simply becomes two tracks, one inclining left through a thinning of trees, one continuing right where the canopy presses lower and the air smells older. Between the two paths, half-buried in the root-tangle at the division, is a stone. On it, carved with something sharper than a knife and older than the current corruption: a single line. And beneath it, an arrow. The arrow is broken off at the tip.',
          dmNote: null
        },
        {
          id: 's2b4-2',
          order: 2,
          type: 'check',
          title: 'Reading the Stone',
          content: 'The carving is deliberate. The break in the arrow is not erosion — it was struck off. The surviving shaft points right. The missing tip pointed somewhere impossible to determine.',
          dmNote: 'SKILL CHECKS:\n• Examine carving — Investigation DC 11: Deliberate, old. Break was intentional.\n• Identify script — History DC 14: Old Druidic mark meaning "threshold" or "between." The arrow pointed to a threshold.\n• Feel the air — Nature DC 12: Right path: older, more still. Left path: faint trace of wood smoke, old habitation.\n• Check for tracks — Survival DC 13: Left path: old boot prints, months ago. Right path: nothing. At all.'
        }
      ]
    },
    {
      id: 's2-cabin',
      order: 5,
      title: 'Scene 5a — The Druid\'s Cabin',
      subtitle: 'Clues, tools, rot risk (Left Path)',
      estimatedTime: '20–25 min',
      dmNote: 'Raven hinders here. Artos used this cabin. He is trying — and failing — to communicate that there is a rot risk inside. He cannot make them understand.',
      beats: [
        {
          id: 's2b5a-1',
          order: 1,
          type: 'prompt',
          title: '🦅 Raven Hinders',
          content: 'As the party approaches the cabin, the raven appears on the roof. When anyone moves toward the door, it drops from the roof and dive-bombs them — not attacking, but placing itself between the party and the entrance. It beats its wings. It will not let them approach without hesitation. After thirty seconds of this, it gives up and vanishes in smoke.',
          dmNote: 'This is Artos. He is trying to warn them about the rot-touched wall inside. He cannot explain. If the party tries to communicate with it: it watches them with something that almost looks like grief. Then it vanishes.'
        },
        {
          id: 's2b5a-2',
          order: 2,
          type: 'narrative',
          title: 'Inside the Cabin',
          content: 'It was not abandoned in haste. Whoever lived here chose to leave. Inside, the smell of old herbs and something sharper — iron, or old rain — has settled into the walls. A bedroll, rolled tightly. A workbench, cleared. Two wooden bowls, stacked. On the wall, drawings. Not decorative. Diagrams. Dozens of them, overlapping. The same shape repeated in different scales and angles: a root system, or a diagram of something beneath the ground, something that branches and spreads and comes to a single point at its centre.',
          dmNote: null
        },
        {
          id: 's2b5a-3',
          order: 3,
          type: 'check',
          title: 'What They Find',
          content: 'The diagrams are maps. Rough, but maps. A system of tunnels beneath the forest floor, converging on a central chamber. At the bottom of one diagram, in small, careful writing: "She does not sleep. She waits."',
          dmNote: 'SKILL CHECKS:\n• Diagrams — Investigation DC 12: They are maps. A tunnel system converging on a central chamber.\n• Diagrams — Arcana DC 15: The root system depicted is not metaphorical. Someone mapping a living structure beneath the Weald.\n• Locked chest (under workbench) — Thieves\' Tools DC 13 or Strength DC 16: Vial of holy water, scroll of Lesser Restoration, wooden token carved with Sylvanus symbol (cracked down the middle).\n• Inscription — Religion DC 14: "She does not sleep" = old Tethyrian hedge tradition, a divine force in arrested power — not imprisoned, not free. Contained but aware.\n• Overturned inkpot behind door — Perception DC 13: The spill traces a shape. A hand. Flat. Palm-down. As though pressing against the floor.\n\nROT OPPORTUNITY — The Rotted Wall:\nOne wall has been touched by the corruption — darker, wood turned soft, wrong-coloured moss, faint sweet smell.\n• Touch it — Con save DC 13. Fail → 1 GREEN MARK. The wall feels warm.\n• Examine — Nature DC 14: The corruption is recent, within two weeks. DM NOTE: Ilya passed through. He is the source. He did not know he was already compromised.'
        }
      ]
    },
    {
      id: 's2-entrance',
      order: 6,
      title: 'Scene 5b — The Heart Entrance',
      subtitle: 'Direct path, hidden door (Right Path)',
      estimatedTime: '15 min',
      dmNote: 'Reward observation. Players who took the left path and found the diagrams have advantage on Investigation checks here.',
      beats: [
        {
          id: 's2b5b-1',
          order: 1,
          type: 'narrative',
          title: 'The Forgotten Path',
          content: 'Nothing has walked this path in a long time. Not because it is dangerous — it doesn\'t feel dangerous. It feels forgotten. The trees on either side stand straighter here, and the ground underfoot is unusually firm. The roots do not shift. The air does not move. It is as though the forest has simply... overlooked this particular strip of ground. At the end of the path, a wall of root and stone.',
          dmNote: null
        },
        {
          id: 's2b5b-2',
          order: 2,
          type: 'check',
          title: 'Finding the Entrance',
          content: 'The wall of root and stone is real — but it is not solid everywhere. The entrance does not announce itself.',
          dmNote: 'SKILL CHECKS:\n• Examine the wall — Perception DC 13: One section of root growth is different. The roots here are dead. Dry. Not corrupted. Just old and hollow.\n• Press/probe the wall — Investigation DC 11: Behind the dead roots, the stone is loose. It moves.\n• Notice the airflow — Perception DC 15: Cool air seeping through the root-wall. The forest is warmer than whatever is behind this.\n• Listen at the wall — Perception DC 14: Very faint. Deep. A slow, rhythmic sound. Not mechanical. Organic. Like breathing, but too slow.'
        }
      ]
    },
    {
      id: 's2-antechamber',
      order: 7,
      title: 'The Antechamber',
      subtitle: 'Trap, rot risk',
      estimatedTime: '15 min',
      dmNote: 'Slow and quiet. The trap triggers visually — green light pulses up through the tile cracks before discharging. Passive Perception 14+ sees the pulse before anyone steps on the centre.',
      beats: [
        {
          id: 's2b6-1',
          order: 1,
          type: 'narrative',
          title: 'The Tunnel',
          content: 'The tunnel beyond the hidden entrance is wider than it has any right to be. The walls are stone but they are not natural — too smooth in places, too deliberate. Bioluminescent moss clings to the upper corners, providing enough light to see by. Just enough. The floor is uneven but dry, and the air is cool in the way that deep places are cool: not refreshing. Just removed from the world above. It smells of wet stone and something beneath that. Older. Sweeter.',
          dmNote: null
        },
        {
          id: 's2b6-2',
          order: 2,
          type: 'check',
          title: 'The Trap',
          content: 'The corridor opens into a low antechamber. At the centre of the floor — a pattern of stone tiles, different in colour from the surrounding floor. Not hidden, exactly. Not obvious either. A ring of them, arranged in a circle perhaps ten feet across.',
          dmNote: 'SKILL CHECKS:\n• Notice the tiles — Perception DC 11: Too deliberate for natural cave floor.\n• Examine the tiles — Investigation DC 13: Pressure-sensitive. Only triggers if all tiles stepped simultaneously, or if the centre tile is stepped on.\n• Arcana / History DC 15: A warding mechanism. Originally protective. It has been altered — the ward now distributes what it catches rather than containing it.\n• Step on the centre tile — Dexterity Save DC 14 (all in room): Fail: 9 (2d8) necrotic damage + 1 GREEN MARK.\n• Disarm — Thieves\' Tools DC 14 or Arcana DC 16: Successfully neutralised. Tiles go dark.'
        }
      ]
    },
    {
      id: 's2-webs',
      order: 8,
      title: 'The Web Chamber — Ilya',
      subtitle: 'Discovery, key NPC choice',
      estimatedTime: '25–30 min',
      dmNote: 'Ilya is not what he seems. He is polite, precise, and visibly trying to compose himself. He is also secretly a cleric of Talona. He is not lying about being trapped — but he is lying about why he came into the forest. His manner is warm and immediately useful. That is exactly the point.',
      beats: [
        {
          id: 's2b7-1',
          order: 1,
          type: 'narrative',
          title: 'The Web Chamber',
          content: 'The passage beyond the antechamber descends. Not steeply. Just enough that you feel it in your calves. The bioluminescent moss thins and then disappears entirely. Whatever light exists here now comes from the webs. And there are webs everywhere. Not the fine silver geometry of spiders in sunlight. These are thick — rope-thick in some places — and the colour of old cream, and they do not move in any perceivable air current. The chamber beyond is vast. You cannot see the far wall. But you can hear something.',
          dmNote: 'Passive Perception 13+: A sound from deeper in. Irregular. Rhythmic in fragments. The sound of someone struggling against restraint. Not screaming. Too exhausted for that. Just the persistent small effort of someone who has not yet stopped trying.'
        },
        {
          id: 's2b7-2',
          order: 2,
          type: 'narrative',
          title: 'Finding Ilya',
          content: 'He is suspended in a web cocoon approximately twelve feet off the floor, near the chamber\'s centre. He has been there for eleven days. He is conscious. His eyes are open. His hands are free from the wrist down, and they have been working at the silk — there are frayed strands around his fingers that have been picked at, slowly, for days. He sees you before you reach him. "I," he says, and his voice is a wreck, "would very much appreciate it if you could get me down from here."',
          dmNote: 'Insight DC 16: Ilya is too composed. Eleven days in a web, and his primary affect is mild irritation at the inconvenience. This is not how people behave after eleven days.'
        },
        {
          id: 's2b7-3',
          order: 3,
          type: 'check',
          title: 'Freeing Ilya',
          content: 'The webs hold weight but can be cut through or climbed.',
          dmNote: 'MECHANICS:\n• Slashing through webs: AC 10, 5 HP per section. Works.\n• Fire: Works but risks alerting Damir.\n• Climbing to reach him: Athletics DC 12 or a rope.\n\nILYA\'S RESPONSES TO KEY QUESTIONS:\n• "What is this place?" → "The centre of a very old problem. The forest grew around something that should have been contained and was not. I came to study it."\n• "What put you there?" → "Something that lives deeper in. It does not kill efficiently — it collects."\n• "What is causing this?" → "A divine force in a state of frustrated containment. The corruption is pressure. Something vast pushing against a barrier that has been weakening."\n• "What is the barrier?" → "I don\'t know precisely." (He knows. He will not say.) "Something living. Something with will. Whatever it is, it is losing ground."\n• "Talona?" → "That name... yes, it is consistent with the symptoms." (Brief pause.) "An interesting hypothesis."\n• "Do you know Birna?" → "My sister. Yes. I imagine she sent you." (Dry.) "She would have."\n\nILYA\'S BOON (before pressing forward):\n• Dorothea: Murmurs over her hands. Until end of session, roll d8 for bardic inspiration.\n• Kanan: Adjusts the Eye of the Hollow Raven. Until end of session, Detect Magic also shows direction a magical source is moving.\n• Danil: Places a hand on his shoulder briefly. Until end of session, one wild magic surge result may be rerolled.'
        }
      ]
    },
    {
      id: 's2-damir',
      order: 9,
      title: 'Damir — The Woven Grief',
      subtitle: 'Boss fight, tunnel collapse',
      estimatedTime: '30–40 min',
      dmNote: 'Treat this as the session climax. The tunnel collapse is not optional — it happens. The party is going forward. That is the point. If Ilya is present, he is conspicuously quiet during Damir\'s opening speech. Insight DC 15 to notice.',
      beats: [
        {
          id: 's2b8-1',
          order: 1,
          type: 'narrative',
          title: 'Approaching the Chamber',
          content: 'Beyond the web chamber, the passage widens again. The webs thin. The air here is different — not the cave-cold of the antechamber, but something charged and warm, like the air before a storm that has been building for days. The floor is smooth stone, and the stone is dry except in one place, where a dark seepage tracks toward the centre of the chamber ahead.',
          dmNote: null
        },
        {
          id: 's2b8-2',
          order: 2,
          type: 'narrative',
          title: 'Damir',
          content: 'The chamber is large enough to lose the ceiling in shadow. At its centre — something waits. Your first instinct is to identify it. Your mind offers you categories: spider, man, creature, thing. None of them hold. The body below is that of a spider — vast, eight-legged, its carapace the deep brown-black of old dried blood. It is perhaps twelve feet across at the widest point. Its movements are too deliberate for an animal. Too controlled. Too aware. But the head. The head is human.',
          dmNote: 'Damir was a grave cleric. He was caught by the corruption at the moment of his crossing through the fracture and was remade rather than killed. The spider body is not a transformation — it is a replacement. His human consciousness is inside it.'
        },
        {
          id: 's2b8-3',
          order: 3,
          type: 'prompt',
          title: 'Before Initiative — Damir Speaks',
          content: '"I know what I look like. I know what I am. I stopped arguing with it some time ago." A pause. The legs shift. "There is something worse than me further in. You should know that before you decide what to do with me. I am not the worst thing in this forest. I am simply the thing in your way." Another pause. "I cannot move aside. That option was removed from me some time ago. But I want you to understand — what is at the centre did this to me. Not out of cruelty. Out of efficiency. That is what you are walking toward."',
          dmNote: 'He is genuinely saying what needs to be said. He is not stalling. Let this land before initiative.'
        },
        {
          id: 's2b8-4',
          order: 4,
          type: 'combat trigger',
          statBlockId: 'damir-woven-grief',
          title: 'COMBAT — Damir, the Woven Grief',
          content: 'Damir fights. He does not want to. He does not stop.',
          dmNote: 'STAT BLOCK — DAMIR, THE WOVEN GRIEF (CR 7)\nAC: 15 · HP: 110 · Speed: 30 ft., climb 30 ft.\nSTR 18 (+4) · DEX 14 (+2) · CON 17 (+3) · INT 14 (+2) · WIS 18 (+4) · CHA 12 (+1)\nSaving Throws: Wis +7, Con +6\nSkills: Insight +7, Religion +5, Perception +7, Stealth +5\nResistances: Necrotic, Poison · Immunities: Charmed, Frightened\nSenses: Tremorsense 60 ft., Darkvision 120 ft., Passive Perception 17\n\nSPIDER CLIMB: Climb any surface including ceilings.\nWEB SENSE: Knows exact location of any creature touching a web he touches.\nSPELLCASTING (Wis-based, DC 15, +7): Spare the Dying, Sacred Flame, Toll the Dead, Inflict Wounds (3rd, 1/day), Spirit Guardians (3rd, concentration), Speak with Dead.\nRESURRECTION DISTORTION: When he casts any healing/restoration spell, target Con save DC 13 or 1 GREEN MARK.\nPRESENCE OF THE BOUNDARY (Aura 10 ft.): Creatures starting turn within 10 ft. — Wisdom save DC 14 or frightened until start of next turn.\n\nATTACKS (Multiattack: 2 Leg Strikes + 1 Bite or Toll the Dead):\n• Leg Strike: +7 to hit, reach 10 ft. Hit: 11 (2d6+4) piercing\n• Bite: +7 to hit, reach 5 ft. Hit: 13 (2d8+4) piercing + 14 (4d6) poison. Con DC 14 or poisoned 1 min + 1 GREEN MARK.\n• Web (Recharge 5–6): +5 to hit, range 30/60 ft. Hit: restrained (escape DC 14, or 15 HP slashing).\n• Toll the Dead (Cantrip): DC 15 Wisdom or 14 (2d12) necrotic (2d8 if at full HP).\n• Inflict Wounds (3rd, 1/day): +7 to hit, 28 (8d6) necrotic.\n• Spirit Guardians (3rd, Concentration): 15-ft. radius arachnid shapes. Entering/starting turn: 14 (3d8) necrotic, DC 15 Wis for half. Movement halved.\n\nCOMBAT PROMPTS:\n• Leg Strike hit: "The leg comes down with mechanical certainty. Not fury. Just force, directed with precision. His face above it is very still."\n• Bite hit: "His face lowers toward you, and this — this is the moment you realise the spider and the man are not separate things looking in different directions. They are both looking at you."\n• Web: "The silk hits and holds immediately, warm from wherever inside him it came from."\n• Spirit Guardians: "Small shapes pour from the walls. Too many legs each. His eyes close briefly, and when they open they are wet. He does not look like he has chosen this."\n• At 50% HP: "\'You are better than I expected,\' he says. It does not sound like a compliment or a threat. It sounds like a fact he was not prepared for."\n• On death: "He folds inward — the spider body first, then the face, as though the last thing to let go is the part of him that could still look at you." → ALL IN RANGE: Con DC 13 or 1 GREEN MARK from death pulse.\n\nOUTCOMES:\n• Damir Killed (Party): Talona loses this foothold. Forest goes quiet — quieter than before the fight.\n• Ilya Offers Suspension (if present): Steps forward before killing blow. Performs rapid suspension — faster, rougher, clearly practised. Insight DC 15: his hands are entirely steady. He has done this before.\n• Damir Speaks Before Death (if party pauses at 0 HP): "I was a cleric of Kelemvor. I tended the dead. I asked for nothing. I do not know why I was chosen."'
        },
        {
          id: 's2b8-5',
          order: 5,
          type: 'narrative',
          title: 'The Tunnel Collapse',
          content: 'The fight is almost over — and then the chamber decides it disagrees. The first crack sounds like something snapping deep underground. Then a second. The web-columns begin to vibrate. A section of ceiling, somewhere behind you, drops. "Move," Damir says. Or says it one last time.',
          dmNote: 'COLLAPSE TIMELINE (begins at Damir 0 HP or suspension):\n• Round 1: Cracks appear, ceiling dust falls. Dexterity DC 12 or 7 (2d6) falling debris damage.\n• Round 2: Tunnel collapses fully. Any character still in the tunnel: 21 (6d6) bludgeoning + buried (Strength DC 16 or restrained until freed).\n\nThe route they came in through is GONE. The only exit is forward — deeper into the heart.'
        }
      ]
    },
    {
      id: 's2-levelup',
      order: 10,
      title: 'Level Up & Close',
      subtitle: 'Advancement, ominous beat',
      estimatedTime: '10–15 min',
      dmNote: 'End on silence. No music swell. No dramatic speech. Just the warmth from the passage ahead, and the slow pulse of something aware.',
      beats: [
        {
          id: 's2b9-1',
          order: 1,
          type: 'narrative',
          title: 'The Close',
          content: 'The tunnel behind you is gone. You stand at the threshold of the deeper forest — or what is beneath it. The passage forward is open. The air from it is warm, which it should not be, and it carries that sweet-rot smell that you have begun to recognise as the forest\'s version of a held breath. Somewhere ahead, the heart of the Weald waits. The raven does not appear. For the first time in the forest, you are entirely alone.',
          dmNote: null
        },
        {
          id: 's2b9-2',
          order: 2,
          type: 'narrative',
          title: 'The Pulse',
          content: 'And then — felt rather than heard — a single, slow pulse from somewhere deep below. As though something vast has registered your presence. As though it has decided you are interesting. As though it is ready.',
          dmNote: 'Full stop. Let the silence sit. Then: ALL PLAYERS LEVEL UP TO 5.\n\nLEVEL 5 CHANGES:\n• Kanan (Wizard 5): 3rd-level spell slots. HP +1d6+Con mod.\n• Dorothea (Bard 5): Bardic Inspiration → d8. Font of Inspiration (recover on short rest). 3rd-level spell slots. HP up.\n• Danil (Sorcerer 5): 3rd-level spell slots. Sorcery Points → 5. HP up. Wild Magic at level 5 begins to interact with the forest\'s energy — consider flagging one new unique surge result for the Weald.\n• Ilya (if active): Already level 7. No change. He does not mention this unless asked.\n\nGREEN MARK TRACKER: Update marks. They do not reset at level-up.\nTALONA\'S FOOTHOLD TRACKER: Record Darcy and Damir status (Killed = foothold lost / Suspended = foothold held). This matters in Session 3.'
        }
      ]
    }
  ]
}

export const SESSION_2_ENEMIES = {
  'darcy-recombined': {
    id: 'darcy-recombined',
    name: 'Darcy, Recombined',
    ac: 13,
    maxHp: 65,
    initiative: 0,
    type: 'enemy',
    cr: 4,
    dmNote: 'Divided Form: two forms share HP pool. Reformation at 30 HP.'
  },
  'rotting-bloom': {
    id: 'rotting-bloom',
    name: 'Rotting Bloom',
    ac: 10,
    maxHp: 22,
    initiative: 0,
    type: 'enemy',
    cr: 1
  },
  'damir-woven-grief': {
    id: 'damir-woven-grief',
    name: 'Damir, the Woven Grief',
    ac: 15,
    maxHp: 110,
    initiative: 0,
    type: 'enemy',
    cr: 7,
    dmNote: 'Spider Climb, Web Sense, Presence of the Boundary aura (10 ft., DC 14 Wis or frightened).'
  }
}
