# Character Reference Map (AI Harness Document)

This document maps character-specific file paths and `#region` maps to allow AI agents to read only the required line ranges, reducing token usage significantly.

## How to use this Map
1. Do NOT read the entire character file.
2. Check the character's map table below.
3. Locate the starting `#region` for the part you need to modify.
4. Call `view_file` specifying only the specific line numbers/regions.

---

## 1. Chanhwi (chanhwi)
- **File**: `src/characters/chanhwi/normal.ts`
- **Role**: Nuker | **Tier**: S
- **Region Map**:
  - `CONSTANTS`: Timing durations (17.4s), quotes, scale multiplier, blast ranges.
  - `CONFIG`: Config fields (tier, role, color).
  - `SKILL_TRIGGER`: Initial teleport setup.
  - `UPDATE`: Slide -> Cast -> Blast phase ticks.
  - `DAMAGE`: 97% incoming damage reduction.
  - `RENDER`: Screen shake, overlay dark, text rendering, portal lines.

## 2. Su (su)
- **File**: `src/characters/su/normal.ts`
- **Role**: Sniper | **Tier**: C
- **Region Map**:
  - `TYPES`: LaserTrail interface.
  - `CONSTANTS`: Invisibility duration, body parts roll multipliers.
  - `HELPERS`: Rising sound synthesis.
  - `CONFIG`: Config fields.
  - `SKILL_TRIGGER`: Target closest, roll body part, deal headshot.
  - `UPDATE`: Invisibility timer, trail decays, stun timer.
  - `DAMAGE`: Zero damage on invisible state.
  - `RENDER`: Draw laser trails, semi-transparency alpha, isTargetable check.

## 3. Jiho (jiho)
- **File**: `src/characters/jiho/normal.ts`
- **Role**: Specialist | **Tier**: A
- **Region Map**:
  - `CONSTANTS`: Cooldown (5s), Compile success rate (65%), bug chance (40%).
  - `CONFIG`: Config fields.
  - `BASIC_ATTACK`: Roll bug debuff, crash stun and splash.
  - `SKILL_TRIGGER`: Start 2.0s typing channeling.
  - `UPDATE`: Ticks, succeed compile, heal and buff speeds.
  - `DAMAGE`: 2.2x outgoing damage multiplier hook.
  - `RENDER`: Draw typing bar, green aura pre-render, stun stars.

## 4. Doyun (doyun)
- **File**: `src/characters/doyun/normal.ts`
- **Role**: Guardian | **Tier**: C
- **Region Map**:
  - `CONSTANTS`: Cooldown (5s), Shield absorption (6), scale multiplier.
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Leap scale, target tracking.
  - `UPDATE`: Homing velocities, landing timeouts.
  - `COLLISION`: Explode on collision contact.
  - `DAMAGE`: Shield absorption hook.
  - `RENDER`: Blue shield circle.
  - `HELPERS`: `executeDunkSlam` logic.

## 5. Unhee (unhee)
- **File**: `src/characters/unhee/normal.ts`
- **Role**: Juggernaut | **Tier**: D
- **Region Map**:
  - `CONSTANTS`: Channeling time (2s), Bulkup duration (7s), stats multipliers.
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Channeling start, vx/vy freeze.
  - `UPDATE`: Workout updates, trigger bulkup, heal.
  - `COLLISION`: Passive forced workout on contact.
  - `DAMAGE`: 50% damage reduction on bulkup state.
  - `RENDER`: Barbell drawing, flame aura ring.

## 6. Juju (juju)
- **File**: `src/characters/juju/normal.ts`
- **Role**: Disabler | **Tier**: S
- **Region Map**:
  - `TYPES`: SwapPortalEffect interface.
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Black hole coordinate set, grant immunity.
  - `UPDATE`: Pull enemies, stun refresh, collapse visual triggers.
  - `DAMAGE`: Immunity checks, Emergency Swap passive trigger.
  - `RENDER`: Swirl black hole cores, portal circles, grid lines.

## 7. Seyeon (seyeon)
- **File**: `src/characters/seyeon/normal.ts`
- **Role**: Guardian | **Tier**: S
- **Region Map**:
  - `TYPES`: SeyeonState interface.
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Dance triggers, speed increase, immunity set.
  - `UPDATE`: Love ticks, pull enemies inside radius, reset charmed.
  - `DAMAGE`: Immunity from charmed targets, 50% damage amplification.
  - `RENDER`: Gradient pink aura, heart head decorations.

## 8. Chanik (chanik)
- **File**: `src/characters/chanik/normal.ts`
- **Role**: Nuker | **Tier**: A
- **Region Map**:
  - `TYPES`: Projectile, ArtilleryStrike interfaces.
  - `CONSTANTS`: Warning and bombardment durations.
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Queue active strike alert.
  - `UPDATE`: Enemy slow ticks, spawn falling shells, knockback damage.
  - `DEATH`: Clean up slow debuff on target speed values.
  - `RENDER`: Warning overlays, siren borders, missile lines.

## 9. Nayuta (nayuta)
- **File**: `src/characters/nayuta/normal.ts`
- **Role**: Speedster | **Tier**: B
- **Region Map**:
  - `CONSTANTS`: Domination chance, duration, and contact effects.
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Cancel active skills of targets.
  - `COLLISION`: Apply domination only to enemies.
  - `UPDATE`: Control targets, force ticks, check target ranges.
  - `DEATH`: Release dominated targets.
  - `RENDER`: Red collar rings on controlled enemies.

## 10. Eunsu (eunsu)
- **File**: `src/characters/eunsu/normal.ts`
- **Role**: Summoner | **Tier**: A
- **Region Map**:
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Spawn clone state, push to context list.
  - `COLLISION`: Passive 25% double slap and stun.
  - `UPDATE`: Idle particles.
  - `DEATH`: Kill all active clones.
  - `RENDER`: Glow rings.

## 11. Dongjun (dongjun)
- **File**: `src/characters/dongjun/normal.ts`
- **Role**: Specialist | **Tier**: B
- **Region Map**:
  - `TYPES`: DongjunState interface.
  - `CONSTANTS`: Cooldown (5s), Discharge chances (3%).
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Lock promotion reroll, active speed.
  - `UPDATE`: Cooldown timers, quote timers.
  - `RENDER`: Draw rank badge names.
  - `HELPERS`: `promoteDongjun`, `getRankStats`.

## 12. Puman (puman)
- **File**: `src/characters/puman/normal.ts`
- **Role**: Juggernaut | **Tier**: B
- **Region Map**:
  - `TYPES`: VenomProjectile, PlantEntity, PumanState interfaces.
  - `CONSTANTS`: DPS (4), max stacks (15).
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Spawn venom projectile.
  - `BASIC_ATTACK`: Consume stacks on basic hit to heal.
  - `UPDATE`: Grow plants, check eating plant vs stepped on.
  - `RENDER`: Draw plants, venom balls, stack counts.

## 13. Myeongseok (myeongseok)
- **File**: `src/characters/myeongseok/normal.ts`
- **Role**: Juggernaut | **Tier**: B
- **Region Map**:
  - `TYPES`: BowlingBall, MyeongseokState.
  - `CONSTANTS`: Cooldown (6s), speed, damage ticks.
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Shoot bowling ball.
  - `UPDATE`: Physical updates, wall bounces (+4), enemy strikes (+6).
  - `RENDER`: Draw bowling balls and holes.

## 14. Juyeon (juyeon)
- **File**: `src/characters/juyeon/normal.ts`
- **Role**: Specialist | **Tier**: A
- **Region Map**:
  - `TYPES`: AmpouleProjectile, JuyeonState.
  - `CONSTANTS`: Cooldown (6s), heal (15), buff/debuff rates.
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Fire modeling ampoule syringe.
  - `UPDATE`: Projectile flight calculations, stun triggering, speed buff decays.
  - `COLLISION`: Passive speed steal & shield popped.
  - `RENDER`: Draw syringe projectiles, stack counts, and stun stars.

## 15. Sungjae (sungjae)
- **File**: `src/characters/sungjae/normal.ts`
- **Role**: Juggernaut | **Tier**: S
- **Region Map**:
  - `TYPES`: LaserBullet, SungjaeState.
  - `CONSTANTS`: Cooldown (7s), Mecha HP (180), Pilot HP (60), Railgun specs.
  - `CONFIG`: Config description.
  - `SKILL_TRIGGER`: Activate rotating railgun charge or pilot dodge roll.
  - `UPDATE`: Railgun rotations, projectile bullet ticks, eject explosions.
  - `BASIC_ATTACK`: Beam saber slice (Mecha close range) or pilot handgun bullet spawn (Pilot long range).
  - `DAMAGE`: Double HP damage absorption and eject blast trigger.
  - `RENDER`: Draw laser bullets, railgun targeting lines, mecha visors.

## 16. Mongshil (mongshil)
- **File**: `src/characters/mongshil/normal.ts`
- **Role**: Specialist | **Tier**: B
- **Region Map**:
  - `TYPES`: Thrown toxic bottle and magic residue runtime state.
  - `CONSTANTS`: Heat DOT and toxic residue tuning.
  - `SKILL_TRIGGER`: Throw toxic material at the nearest enemy.
  - `UPDATE`: Move bottles, create residues on impact, and resolve effects.
  - `BASIC_ATTACK`: Apply probabilistic magic-iron heat.
  - `RENDER`: Draw residue zones.

## 17. Seojun (seojun)
- **File**: `src/characters/seojun/normal.ts`
- **Role**: Speedster | **Tier**: A
- **Region Map**:
  - `TYPES`: Time anchor, path, rewind and buff state.
  - `CONSTANTS`: Two-stage cooldown, rewind, collision damage, and stack tuning.
  - `SKILL_TRIGGER`: Create a time anchor or initiate rewind.
  - `UPDATE`: Record the route, rewind safely, and expire buffs.
  - `DAMAGE`: Rewind immunity and hit-based damage buff.
  - `RENDER`: Draw the recorded time path and anchor.

## 18. Jiwoo (jiwoo)
- **File**: `src/characters/jiwoo/normal.ts`
- **Role**: Disabler | **Tier**: A
- **Region Map**:
  - `TYPES`: One-time passive, return point, and attacker memory state.
  - `CONSTANTS`: Vanity duration, recovery, return damage, and confusion tuning.
  - `SKILL_TRIGGER`: Store the return point and become a phantom.
  - `UPDATE`: Return, damage, confuse, teleport a recent attacker, and expire fracture marks.
  - `BASIC_ATTACK`: Detonate a reality-fracture mark.
  - `DAMAGE`: Passive reality rewrite, active invulnerability, and one-time-per-attacker damage reflection.
  - `RENDER`: Phantom transparency and untargetability.

## 19. Juju Singularity Boss (juju_singularity_boss)
- **File**: `src/characters/juju/boss.ts`
- **Role**: Boss Disabler | **Tier**: S
- **Region Map**:
  - `TYPES`: Phase state, singularities, time faults, future rifts, and player history.
  - `CONSTANTS`: Raid HP, 70%/35% phase thresholds, cinematic durations, damage, duration, and enrage tuning.
  - `CONFIG`: Independent boss-only registration data.
  - `SKILL_TRIGGER`: Phase 3 singularity cast.
  - `UPDATE`: Intro descent plus three-phase space/time raid pattern scheduler; time faults replace wormhole movement.
  - `DAMAGE`: Boss damage hook.
  - `DEATH`: Singularity-collapse finale cinematic.
  - `RENDER`: Starfield, black-hole arrival, phase-specific arenas, collapsing singularities, time-fault telegraphs, and phase subtitles.

## 20. Junseok (junseok)
- **File**: `src/characters/junseok/normal.ts`
- **Role**: Specialist | **Tier**: A
- **Region Map**:
  - `TYPES`: Operation-data stack and delayed block-point state.
  - `CONSTANTS`: Base/enhanced blast, prediction, knockback, and slow tuning.
  - `HELPERS`: Enemy filtering and nearest-target selection.
  - `CONFIG`: Character stats and skill copy.
  - `SKILL_TRIGGER`: Predict target path and queue two or three block points.
  - `UPDATE`: Resolve delayed blast, knockback, and slow restoration.
  - `BASIC_ATTACK`: Build operation data from basic hits.
  - `COLLISION`: Reserved no-op hook.
  - `DAMAGE`: Standard incoming damage hook.
  - `DEATH`: Clear queued block points.
  - `RENDER`: Draw operation-data ring and predicted blast telegraphs.
