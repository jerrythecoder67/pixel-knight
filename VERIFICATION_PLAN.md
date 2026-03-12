# Pixel Knight — Verification Plan

A manual checklist covering every major system added or fixed in recent sessions. Open in browser, play, and tick off items.

---

## WORLD BOSSES

### T-Rex Boss (Paleontologist)
- [ ] Play as Paleontologist, survive to wave%20 (or first full unlock cycle)
- [ ] T-Rex spawns with "THE T-REX KING RISES" notification
- [ ] Ground stomp fires ring of brown projectiles outward
- [ ] Roar charge: T-Rex lunges toward player
- [ ] At 50% HP: speed increases, enrage notification shows
- [ ] On death: `extinctionEvent` achievement granted → Dino Pal pet unlocked
- [ ] Post-boss overlay shows "THE T-REX KING IS DEFEATED" (not "Grim Reaper")
- [ ] Can press "Keep Playing" → endless mode, or "Go to Menu"

### Megalodon (Sailor / Pirate)
- [ ] Play as Sailor or Pirate, survive to boss wave
- [ ] Megalodon spawns in water area with notification
- [ ] Tail sweep fires fan of teal water projectiles
- [ ] Water rush: Megalodon lunges at player
- [ ] At 50% HP: enrage notification and speed boost
- [ ] On death: `whaleOfATime` achievement granted → Sharky pet unlocked
- [ ] Post-boss overlay shows "THE MEGALODON IS SLAIN"

### Alien Queen (Alien / Astronaut)
- [ ] Play as Alien or Astronaut, survive to boss wave
- [ ] Alien Queen spawns with notification
- [ ] Egg burst fires ring of plasma projectiles
- [ ] Psychic pull: yanks player toward queen and deals damage
- [ ] At 50% HP: enrage notification
- [ ] On death: `firstContact` achievement granted → Little Guy pet unlocked
- [ ] Post-boss overlay shows "THE ALIEN QUEEN IS DESTROYED"

### Grim Reaper (Standard worlds)
- [ ] Standard run (non-world character), survive to wave%20 after unlocking all enemy types
- [ ] Scythe fan + soul drain fire correctly
- [ ] Phase 2 (50% HP): ring burst added, teleport behind player
- [ ] On death: `beyondDeath` achievement granted → Ghosty pet unlocked
- [ ] Post-boss overlay shows "DEATH DEFIED"

---

## BOSS SPECIAL ATTACKS (Regular enemy types as wave bosses)

### Troll
- [ ] Wave boss troll: ground pound ring fires outward
- [ ] Charge lunge toward player
- [ ] No conflict with normal troll behavior

### Wraith
- [ ] Wave boss wraith: blinks near player on timer
- [ ] Phase 2 blink is faster

### Golem
- [ ] Wave boss golem: hardens (damage reduction), then POWERED charge
- [ ] Powered state visually apparent (glow)

### Demon
- [ ] Wave boss demon: fires 8-way hellfire ring

### Imp
- [ ] Wave boss imp: splits into 2 smaller imps at 50% HP

### Vampire (NEW)
- [ ] Wave boss vampire: summons 2 vampire minions periodically
- [ ] Phase 2: summons 3, faster cadence
- [ ] Blood drain: yanks player, heals vampire, shows red particles
- [ ] Enrage at 50% HP with speed boost

### Spider (NEW)
- [ ] Wave boss spider: drops ring of webs around itself on a timer
- [ ] Phase 2: spawns 3 spiderlings periodically
- [ ] Webs visually appear on the ground

### Necromancer (NEW)
- [ ] Wave boss necromancer: raises 2 skeleton minions periodically
- [ ] Phase 2: raises 4 skeletons, more frequent
- [ ] Death ray: spread burst of purple bone projectiles toward player
- [ ] Enrage at 50% HP

---

## NEW PETS

### Dino Pal
- [ ] Unlocked via `extinctionEvent` achievement
- [ ] Appears in pet select overlay
- [ ] In-game: baby raptor drawing orbits near player
- [ ] Lunges at nearby enemies and deals damage

### Sharky
- [ ] Unlocked via `whaleOfATime` achievement
- [ ] In-game: tiny shark drawing circles player
- [ ] Chomps nearby enemies periodically

### Little Guy
- [ ] Unlocked via `firstContact` achievement
- [ ] In-game: small alien drawing orbits player
- [ ] Fires plasma projectiles at enemies

### Ghosty
- [ ] Unlocked via `beyondDeath` achievement
- [ ] In-game: translucent ghost drawing with wobble animation
- [ ] Phases through enemies, heals player periodically

### Phoenix
- [ ] Unlocked via `forgery` achievement (forge all 8 weapons)
- [ ] In-game: firebird orbits player at `phoenixAngle` offset (~50px radius)
- [ ] Wing flicker animation visible
- [ ] Every 2 seconds: fire burst damages nearby enemies, 6 fire projectiles emitted

---

## ENEMY BEHAVIORS

### Raptor Pack Hunting
- [ ] 2+ raptors within 120px of each other → speed boost (1.4x)
- [ ] Pack disperses → speed returns to normal
- [ ] No stack overflow from repeated boost application

### Pterodactyl Dive Bomb
- [ ] Pterodactyl waits at distance, then lunges 160px toward player
- [ ] Gray explosion particles on dive
- [ ] Resets dive timer after each dive

### Jellyfish Slow
- [ ] Contact with jellyfish triggers "Stung! Slowed!" notification
- [ ] Player speed visibly reduced for ~2.5 seconds
- [ ] Timer counts down correctly (p.jellyfishSlow)

### Octopus Ink Cloud
- [ ] Octopus periodically drops 3 spider webs when player is nearby
- [ ] "Ink cloud!" notification shows
- [ ] Webs slow the player as expected

---

## WORLD-SPECIFIC ENEMY SPAWNING

### Sailor World Wave Spawning Fix
- [ ] Wave enemies in sailor world spawn only on water tiles (not land)
- [ ] If a water tile can't be found quickly, enemy is re-queued
- [ ] Eels, piranhas, octopi, jellyfish, mantarays all spawn correctly

---

## TERRAIN

### Paleo World (Paleontologist character)
- [ ] Terrain loads mostly stone and dirt (rocky, sparse)
- [ ] Very few/no flower tiles
- [ ] Grass significantly reduced vs. normal world
- [ ] Lava pools still present
- [ ] Trees still spawn (fewer due to stone/dirt base)

---

## ACHIEVEMENTS

| Achievement | Trigger | Reward |
|---|---|---|
| `extinctionEvent` | Defeat T-Rex as Paleontologist | Dino Pal pet |
| `whaleOfATime` | Defeat Megalodon as Sailor/Pirate | Sharky pet |
| `firstContact` | Defeat Alien Queen as Alien/Astronaut | Little Guy pet |
| `beyondDeath` | Defeat Grim Reaper in standard world | Ghosty pet |
| `forgery` | Forge all 8 weapons | Phoenix pet |
| `deathDefied` | Defeat the final boss of your world | (reward varies) |
| `dinoKing` | Die to croc as Fat after 30+ croc kills | Unlocks Dinosaur char |
| `bobUnlock` | Lose 10 runs total | Unlocks Bob char |
| `witchUnlock` | Kill Red Wizard as Wizard | Unlocks Witch char |
| `stickmanUnlock` | Collect 30 tree branches | Unlocks Stickman char |

---

## VISUAL / DRAWING

### Enemy Projectile Types
- [ ] `ground` (T-Rex stomp): brown circle with lighter center
- [ ] `water` (Megalodon sweep): teal/cyan circle
- [ ] `plasma` (Alien Queen eggs): dark teal with cyan center
- [ ] `deathRay` (Necromancer boss): purple glow, bone cross shape
- [ ] `hellfire` (Demon): red/dark red circle
- [ ] `scythe` (Grim Reaper): purple arc

### Unknown Enemy Fallback
- [ ] Any unknown enemy type renders a magenta square with "???" text
- [ ] No silent invisible enemies

### Character Visuals (in-game appearance)
- [ ] Dinosaur: yellow eyes with pupils, white teeth, bright green spines, belly highlight
- [ ] Monster: purple body, glowing purple eyes, horns, fangs
- [ ] Fashion Model: red lips, lashes, blush, voluminous hair
- [ ] Blob: dark green spiky blob with wobble animation

---

## LORE / UI

### Dynamic Lore Panel
- [ ] Dinosaur or Paleontologist unlocked → "THE PREHISTORIC WORLD" section appears
- [ ] Sailor world lore mentions: eel, piranha, manta ray, octopus ink, Megalodon
- [ ] Sailor world lore does NOT mention Megalodon before those characters are unlocked

### Witch Character Unlock Hint
- [ ] Hover/view Witch in character select → hint says "Hunt the rare Red Wizard — but only if you are a Wizard yourself."

### Post-Boss Overlay
- [ ] T-Rex death → "THE T-REX KING IS DEFEATED" header
- [ ] Megalodon death → "THE MEGALODON IS SLAIN" header
- [ ] Alien Queen death → "THE ALIEN QUEEN IS DESTROYED" header
- [ ] Grim Reaper death → "DEATH DEFIED" header

---

## PERSISTENCE / SAVE

### Gold Tracking
- [ ] 40% of run gold added to `persist.lifetimeGold` at run end
- [ ] Millionaire / MrBeast / RichestMan achievements check at end of game

### Pirate Unlock Tracking
- [ ] Shark kill increments `persist.pirateRun.sharkKills`
- [ ] Pirate character unlocks at: 10 bones + 20 croc kills + 1 shark kill + 100k gold

### Merged Pet Fully Removed
- [ ] No "Create Merged Pet" overlay appears anywhere
- [ ] Forgery achievement → Phoenix pet (not merged)
- [ ] Phoenix orbits player and erupts in fire every 2s
