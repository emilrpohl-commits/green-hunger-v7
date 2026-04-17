Category 1: Dice syntax variations

Risk: The parser is anchored to NdM±K. Any deviation silently fails.







Input



Expected extraction



Current behavior





1d8



{count:1, sides:8, modifier:0}



✓





2d6+3



{count:2, sides:6, modifier:3}



✓





2d6-3



{count:2, sides:6, modifier:-3}



✓





d4



{count:1, sides:4, modifier:0}



✗ — no count prefix





1d8 (+1)



{count:1, sides:8, modifier:1}



✗ — +1 stripped





1d8+1d4



[{count:1, sides:8}, {count:1, sides:4}]



✗ — unsupported





2d6 - 3



{count:2, sides:6, modifier:-3}



✓ after space-strip





2d6 − 3



{count:2, sides:6, modifier:-3}



✗ — em-dash





4d6 drop lowest



{count:4, sides:6, drop_lowest:1}



✗ — not supported





1d6 per level



{base:{count:1,sides:6}, scaling:'per_level'}



✗ — not supported





0d6+5



{count:0, sides:6, modifier:5} or flat 5



✗ — count:0 fails \d+ match





10d6



{count:10, sides:6, modifier:0}



✓





d%



{count:1, sides:100}



✗ — not recognized



Category 2: Flat modifiers (no dice)

Risk: Some healing, bonus, and flat-damage effects have no dice component. The parser only produces results from NdM±K matches.







Input



Expected extraction



Current behavior





+5 hit points



flat heal 5



✗ — no dice token, nothing extracted





-1 to AC



flat modifier -1



✗ — not a recognized pattern





1 fire damage



flat 1 fire damage



✗ — no dice token





10 (2d6+3)



damage {count:2, sides:6, modifier:3}, display 10



✗ — 10 alone triggers no dice; (2d6+3) parens-stripped





(2d6+3) fire damage



{count:2,sides:6,modifier:3} + type fire



✗ — parenthetical stripped before parse



Category 3: Damage and healing type extraction

Risk: Type extraction is proximity-based (110-char window). Placement, punctuation, and compound types break it.







Input



Expected type



Current behavior





1d8 necrotic damage



necrotic



✓





1d8 (+1) necrotic



necrotic, modifier +1



type ✓, modifier ✗





1d4+2 radiant or necrotic



radiant, necrotic



only radiant (first match)





1d6 bludgeoning plus 1d6 fire



bludgeoning, fire (two tokens)



✗ — compound expression fails





1d8 cold damage on a failed save



cold



✓





regain 2d8+4 hit points



type: healing



✗ — no healing keyword match





you gain 1d6 temporary hit points



type: temp_hp



✗ — not recognized





1d6 psychic damage and the target is stunned



psychic, condition: stunned



type ✓, condition ✗





3d10 force damage (on a failed save, half on a success)



force, half-on-success flag



type ✓, half-damage ✗





4d8 + your spellcasting modifier



type unknown, modifier: dynamic



✗ — non-integer modifier



Category 4: Attack roll and save structures

Risk: Attack vs. save detection is heuristic. Save type and DC may be in a different part of the text.







Input



Expected



Current behavior





+5 to hit



attack bonus 5



✗ — "to hit" not in spellHasAttackSignal patterns





Make a ranged spell attack



attack type: ranged spell



depends on attackType field existing





DC 14 Wisdom saving throw



save: WIS, DC: 14



DC span styled ✓; structured extraction ✗





DC 14 Dexterity saving throw, half damage on success



save: DEX, DC: 14, half-on-success: true



only DC styling





The target must succeed on a DC 12 Constitution save



save: CON, DC: 12



DC styled ✓; structured ✗





Melee Weapon Attack: +7 to hit



attack bonus 7, type: melee weapon



not parsed at application layer





Hit: 1d8+4 piercing damage



{count:1,sides:8,modifier:4}, type: piercing



piercing ✓ if in window; shape ✓



Category 5: Multiple effect clauses

Risk: Spells and features routinely have compound effects. The parser handles one expression at a time.







Input



Expected



Current behavior





1d6 fire and 1d6 lightning damage



two dice tokens, two types



single dice token, one type





take 2d6 fire damage, or half as much on a success



fire damage + half-on-success



fire damage only





deal 1d4 necrotic and heal for 1d4 hit points



necrotic damage + heal



necrotic ✓, heal ✗





deal 2d8 cold damage and push 10 feet



cold damage + push effect



cold ✓, push ✗





become frightened until end of your next turn



condition: frightened, duration: 1 turn



✗ — condition not extracted





each creature in a 20-foot cube



AoE: cube 20ft



✗ — area shapes not extracted



Category 6: Conditions

Risk: Conditions are inlined in prose. No extractor pulls them into structured data.







Input



Expected



Current behavior





the target is poisoned



condition: poisoned



✗ — prose only





charmed until the end of its next turn



condition: charmed, duration: 1 turn



✗





frightened for 1 minute



condition: frightened, duration: 10 rounds



✗





incapacitated (concentration check)



condition: incapacitated, trigger: concentration



✗





target falls prone



condition: prone



✗





the creature is paralyzed and unconscious



conditions: [paralyzed, unconscious]



✗



Category 7: Durations and concentration

Risk: Duration is stored as a prose string. No structured duration model exists.







Input



Expected



Current behavior





Concentration, up to 1 minute



duration: 1min, concentration: true



concentration ✓, duration prose





1 round



duration: 1 round



prose





8 hours



duration: 480 min



prose





Until dispelled



duration: indefinite



prose





Until the end of your next turn



duration: 1 turn, relative: true



prose



Category 8: Scaling text

Risk: Scaling effects (at higher levels, per spell level, for each additional) have no structured representation.







Input



Expected



Current behavior





At Higher Levels: 1d6 per slot level above 1st



base dice + scaling rule



prose only





For each additional target beyond the first, deal 1d6



base + target scaling



prose only





The damage increases by 1d6 when you reach 5th level



class-level scaling breakpoints



prose only





1d8 for each level of the spell slot used



slot-level scaling



prose only



Category 9: Spell and feature text weirdness







Input



Expected



Current behavior





Melf's Acid Arrow in prose



entity link to Melf's Acid Arrow



✗ — \b fails at '





Bigby's Hand



entity link



✗





Tasha's Hideous Laughter



entity link



✗





Sword of Answering (Law) mid-name



resolve to Sword of Answering



✗ — (Law) is mid-name, not suffix





healing word vs healing words



both resolve to same compendium entry



✓ (singularizer handles this)





eyes of the eagle



entity link



✗ — eyes → singularizer → ey





antimagic field vs anti-magic field



resolve to same entry



✗ in normalized, ✓ in loose



Category 10: Weapon and action wording







Input



Expected



Current behavior





DDB inventory item Longsword



weapon in weapons array



✗ — never extracted





Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1d8+3 slashing



parsed weapon stat block



✗ — no weapon stat block parser





+1 Longsword



resolves to Longsword, stores +1 bonus



✓ in entity resolver, bonus lost in weapon mapping





Feature Sneak Attack (1d6)



feature with dice uses



prose only





Uses: 3/day



{uses: 3, recharge: 'day'}



✗ — not extracted from features