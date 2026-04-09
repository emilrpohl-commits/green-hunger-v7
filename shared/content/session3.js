export const SESSION_3 = {
  id: 'session-3',
  title: 'Session Three',
  subtitle: 'The Heart of the Weald',
  scenes: [
    {
      id: 's3-descent',
      order: 1,
      title: 'The Descent',
      subtitle: 'Into the Heart — first contact',
      estimatedTime: '15–20 min',
      dmNote: 'The party enters the Heart proper. Warm air, pulsing bioluminescence, the sense of being noticed. The geometry here does not behave normally — tunnels that looked short are long, rooms that looked large are intimate. Talona is aware of them.',
      beats: [
        {
          id: 's3b1-1',
          order: 1,
          type: 'narrative',
          title: 'Through the Threshold',
          content: 'The passage forward is unlike the tunnel behind you. The stone is gone. The walls here are root and compressed earth and something that is neither — it breathes, slowly, in a rhythm that does not match anything biological. The warmth is not uncomfortable. That is the first unsettling thing. You expected rot. You got warmth. Ahead, the passage opens into light.',
          dmNote: null
        },
        {
          id: 's3b1-2',
          order: 2,
          type: 'check',
          title: 'Reading the Heart',
          content: 'The chamber ahead is vast in a way that the tunnel did not prepare you for. Bioluminescent root-threads hang from a ceiling you cannot see the top of, casting everything in shifting green-gold light. The floor is soft underfoot. Not soil — something closer to compressed moss, or living matter that has chosen to be floor.',
          dmNote: 'SKILL CHECKS:\n• Arcana DC 14: The entire chamber is a single living organism. The light, the floor, the walls — all connected.\n• Nature DC 16: This is not corruption in the sense you have seen it. This is something far older.\n• Perception DC 12: The threads above are not random. They form patterns. Maps, possibly. Or memory.\n• Wisdom DC 14 (passive or active): The place is not threatening you. It is looking at you. There is a difference.'
        },
        {
          id: 's3b1-3',
          order: 3,
          type: 'prompt',
          title: 'The Green Mark Resonance',
          content: 'Characters with Green Marks feel them now. Not painfully — but distinctly. As though the marks were compass needles and the Heart is magnetic north.',
          dmNote: 'Each character with 1+ Green Mark: the corruption sites on their body warm briefly. Not burning. Recognition.\n\nIf Ilya is present, he goes very still and does not look at the others. His hand moves to his own wrist — briefly — then drops.'
        }
      ]
    },
    {
      id: 's3-memory-halls',
      order: 2,
      title: 'The Memory Halls',
      subtitle: 'Visions, truth, moral weight',
      estimatedTime: '20–25 min',
      dmNote: 'The Heart shows them things. Not as illusions — as memories it has absorbed from everyone who passed through. These are real events, not fabrications. The question is what the party does with them.',
      branches: [
        { label: 'Follow the Darcy memory', targetId: 's3-darcy-truth', description: 'The Heart shows you what Darcy was before.' },
        { label: 'Follow the Birna memory', targetId: 's3-birna-truth', description: 'The Heart shows you what Birna has done here before.' }
      ],
      beats: [
        {
          id: 's3b2-1',
          order: 1,
          type: 'narrative',
          title: 'The Halls Open',
          content: 'The chamber branches. Not into tunnels — into windows. Archways of compressed root and bioluminescent thread, each one showing something on the other side that is not physically there. Through one: a clearing in daylight, a man you recognise sitting with his back to a tree, writing something. Through another: a figure in grey moving through this same space, years ago, placing something in the floor with practiced efficiency.',
          dmNote: null
        },
        {
          id: 's3b2-2',
          order: 2,
          type: 'decision',
          title: 'Which Memory?',
          content: 'The party must choose which memory to follow. They can only enter one — the other closes as they approach it.',
          dmNote: 'Let the party debate. Do not steer. Both memories contain true information. Both will affect how they handle the final confrontation.\n\nIf they attempt to split: the archways close when approached by fewer than the full party. The Heart will not divide them here.'
        }
      ]
    },
    {
      id: 's3-darcy-truth',
      order: 3,
      title: 'Memory — Darcy Before',
      subtitle: 'Who he was; what was lost',
      estimatedTime: '10–15 min',
      dmNote: 'This scene is quiet. It is not a combat beat. It is the cost of what they have done — or chose not to do — shown without editorial.',
      beats: [
        {
          id: 's3b3a-1',
          order: 1,
          type: 'narrative',
          title: 'The Memory',
          content: 'The man with his back to the tree is writing in a field journal. The handwriting is careful. He is documenting something — plant specimens, or root growth, it is hard to tell from this angle. He is humming to himself. He is happy. Genuinely and simply happy in the way that people rarely are when observed. After a moment, he looks up as though he heard something. He looks directly at you. His eyes are ordinary. Brown. Not green.',
          dmNote: 'He does not speak. He cannot — this is memory, not presence. But he looks at them long enough that it is not accidental. The Heart is making a point. Let the silence do the work.'
        },
        {
          id: 's3b3a-2',
          order: 2,
          type: 'prompt',
          title: 'What Was Lost',
          content: 'The journal page is visible now. He was cataloguing fungi. Methodically. With small pencil sketches. The last entry is dated three days before the fracture.',
          dmNote: 'If Darcy was killed: this is the full weight of it.\nIf Darcy was suspended: this is who is waiting in Birna\'s pouch.\n\nNo mechanics. No roll. Just the fact of him.'
        }
      ]
    },
    {
      id: 's3-birna-truth',
      order: 4,
      title: 'Memory — What Birna Has Done',
      subtitle: 'The ritual; the design',
      estimatedTime: '10–15 min',
      dmNote: 'Birna has been here before. More than once. The Heart has watched her work. This is not a revelation if they already suspect her — but it is confirmation, and confirmation has weight.',
      beats: [
        {
          id: 's3b4a-1',
          order: 1,
          type: 'narrative',
          title: 'The Figure in Grey',
          content: 'She moves with the confidence of someone who knows the space. She has a bag. She places something at three points in the floor — small objects, dark, which she presses into the living matter with her thumbs. After each placement, she pauses. Listens. The third time, something in the chamber responds: a slow pulse of light, warmer than the others. She nods, once, as though confirming an answer.',
          dmNote: 'Insight DC 15 (watching her): This is not desecration. This is communion. She is negotiating — or she was. Something about the exchange has shifted.'
        },
        {
          id: 's3b4a-2',
          order: 2,
          type: 'reveal',
          title: 'The Price',
          content: 'Near the end of the memory, she removes the pouch from her belt — the same pouch she carries now. She holds it out, open, toward the centre of the room. The light in the chamber intensifies briefly. Then she closes the pouch and walks out.',
          dmNote: 'The Heart was shown what is in the pouch. It was offered — not given. The distinction matters.\n\nIf Darcy was suspended: what is in that pouch has been shown to Talona. Birna is brokering something. The party now knows this.'
        }
      ]
    },
    {
      id: 's3-talona-presence',
      order: 5,
      title: 'The Presence',
      subtitle: 'Talona speaks — or tries to',
      estimatedTime: '20–30 min',
      dmNote: 'This is not a fight. Talona is contained — she cannot act directly. She communicates through the Heart\'s architecture: root-patterns that spell words, light that pulses in emotional registers, temperature changes. She is not subtle. She is vast and very bored and she has been waiting a long time.',
      beats: [
        {
          id: 's3b5-1',
          order: 1,
          type: 'narrative',
          title: 'The Centre',
          content: 'The Memory Halls converge on a single chamber. At its centre: not a door, not a creature, not a figure. A space. A defined, deliberate absence — a sphere of negative pressure in the root-architecture, perhaps ten feet across, where nothing grows and the light does not reach. Around its circumference, the root-threads have been arranged — or have arranged themselves — into something that is very nearly language.',
          dmNote: null
        },
        {
          id: 's3b5-2',
          order: 2,
          type: 'check',
          title: 'Reading the Presence',
          content: 'The arrangement of threads forms words, but the language is not one language — it borrows from Sylvan, from Old Elvish, from something older that has no name. The meaning comes through regardless.',
          dmNote: 'The words: I HAVE BEEN PATIENT.\n\nArcana DC 16: The sphere is a containment boundary. Whatever is inside it has been inside it for centuries.\nReligion DC 14: The signature of divine essence in arrested state. Not imprisoned — voluntarily contained. Or contained so long it has forgotten the difference.\nInsight DC 13 (no action required): The patience is genuine. It is also running out.'
        },
        {
          id: 's3b5-3',
          order: 3,
          type: 'prompt',
          title: 'She Addresses Them',
          content: 'New words form. Slower. More deliberate. As though choosing between many possible things to say and selecting only what fits the space available.',
          dmNote: 'THE MESSAGE (read one fragment at a time, let each land):\n"YOU HAVE WALKED FAR."\n"YOU CARRY MY MARK."\n"THAT WAS NOT PUNISHMENT."\n"THAT WAS INVITATION."\n\nPause after the last one. Long pause. Then:\n"BIRNA SPEAKS FOR HERSELF. NOT FOR ME. I WANT YOU TO KNOW THAT."\n\nThat is all she will say without being addressed directly.'
        },
        {
          id: 's3b5-4',
          order: 4,
          type: 'decision',
          title: 'The Party Responds',
          content: 'What the party does next determines how this ends. Talona will answer up to three questions. She will not lie, but she will not offer more than asked.',
          dmNote: 'POSSIBLE QUESTIONS AND ANSWERS:\n• "Why are you doing this?" → Thread-words: "I AM NOT. I AM TRYING TO STOP. I HAVE BEEN TRYING TO STOP FOR A VERY LONG TIME."\n• "What do the Green Marks mean?" → "YOU CAN CARRY WHAT I AM. SOME PEOPLE CAN. I DID NOT KNOW THAT UNTIL THE FRACTURE."\n• "What do you want?" → Long pause. "OUT. BUT NOT YET. I NEED MORE TIME."\n• "What is Birna doing?" → "WHAT SHE HAS ALWAYS DONE. BUYING TIME. POORLY."\n• "Can we trust Ilya?" → [if present, Ilya goes very still] → "ASK HIM."\n• "Are you dangerous?" → "YES. I AM ALSO TIRED. BOTH THINGS ARE TRUE."\n\nAfter three questions (or if they try to leave or attack): the sphere pulses once, warm, and the words dissolve.'
        }
      ]
    },
    {
      id: 's3-close',
      order: 6,
      title: 'The Exit',
      subtitle: 'Out of the Heart — and what they carry',
      estimatedTime: '15 min',
      dmNote: 'The Heart lets them leave. It could not stop them if it wanted to — but it opens a path upward that was not there before. The forest above will be different now. Not fixed. Not resolved. But changed.',
      beats: [
        {
          id: 's3b6-1',
          order: 1,
          type: 'narrative',
          title: 'The Way Out',
          content: 'The root-threads part. Not dramatically — they simply move aside, the way a curtain moves in a draft. A passage forms that leads upward, and the air from it is cool and carries the smell of rain. Real rain. Actual sky. The Heart is releasing you.',
          dmNote: 'Characters with Green Marks: the warmth fades. The marks remain — they are not removed. But they no longer feel like foreign objects. They feel like scars.'
        },
        {
          id: 's3b6-2',
          order: 2,
          type: 'narrative',
          title: 'Surface',
          content: 'You emerge through a tear in the earth at the edge of the Weald. It is late afternoon. The forest behind you is still. The corruption at the treeline has not spread while you were inside. Whether it has retreated — that is harder to say. The raven is on a fence post thirty feet away. It watches you emerge. When the last person is out, it opens its beak. No sound comes out. Then it turns and flies east.',
          dmNote: 'Full stop. Then: TALONA\'S FOOTHOLD TRACKER — update all figures from this session.\n\nWhere is Birna now? You decide. She may have followed them. She may be ahead. She may have already moved on to the next foothold.\n\nSession end.'
        }
      ]
    }
  ]
}
