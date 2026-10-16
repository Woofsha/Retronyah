# Project Ys-Engine: Aldenor RPG Expansion — Master Architectural Specification & Implementation Plan

> **Document Version**: 4.0.0 (Master Plan for Argon Review)  
> **Target Application**: `index.html` (`Project Ys-Engine: Aldenor Town (PC-Engine CD)`)  
> **Design Philosophy**: Strict Late-1980s / Early-1990s Japanese NEC PC-Engine CD-ROM² Action RPG (Falcom *Ys Book I & II*, *Ys IV: The Dawn of Ys*, *Popful Mail*, *Dragon Slayer: The Legend of Heroes*)  
> **Architecture Constraint**: Single-file, zero-external-dependency HTML5 Canvas + Web Audio API synthesizer. Pure retro hardware authenticity (HuC6260 9-bit VCE palette, HuC6280 6-channel PSG wavetable audio, pure hex-matrix pixel art, zero vector canvas geometry).

---

## 1. Executive Summary & Design Vision

### 1.1 Objective
Expand the existing town/coastal adventure into a full-scale, narrative-driven Action RPG featuring:
1. **Nyah as an Active Battle & Banter Companion**: She follows Adol, fights alongside him with claw strikes, auto-heals in emergencies, participates in dialogue, and gains new perks, idle animations, and cosmetic accessories as the story progresses.
2. **PC-Engine CD Visual Cinema Intro**: A 5-card pixel-art visual novel prologue with dramatic HuC6280 PSG overture music and scrolling text, transitioning smoothly into Adol landing at Aldenor Harbor.
3. **The Three Great Dungeons + Bell Tower Climax**:
   - *Dungeon 1: The Old Quarry Mines* (minecart track switches, rock golems, Obsidian Crusher boss).
   - *Dungeon 2: The Coastal Crypts* (undead catacombs, lever portcullises, Lord Malakor Skeletal Lich boss).
   - *Dungeon 3: The Sunken Shrine* (submerged water gates, sluice valves, Charybdis Queen Leviathan boss).
   - *Final Climax: The Northern Bell Tower Spire* (The Shadow of the Eclipse showdown, restoration of the Bell, dawn epilogue).
4. **Classic Falcom Leveling (Lv 1–20) & Weapon Progression**:
   - Levels 1 to 20 with EXP curve, STR, DEF, Max HP, victory fanfare, and full HP refill.
   - 5 tiered upgradable swords with unique hex sprite trails, Hold-[Z] Whirlwind Spin Slash, and full-HP sword beam projectile.
5. **Town Life, Economy & Quests**:
   - Goran's Blacksmith Forge & Lumina's Expanded Apothecary.
   - Dynamic story-phased NPC dialogue across chapters.
   - In-menu Quest Log tab (`[I]` / `[Tab]`) and an exterior Tavern Bounty Board.
   - NPCs gossiping and dropping hints about secrets, hidden walls, and hidden treasure.
6. **Dual Save System**: Seamless `localStorage` auto-save on room transitions/level-up + 3 manual save slots.

### 1.2 Core Hardware Constraints Checklist
* **HuC6260 VCE 9-Bit Palette**: All colors must use `vceColor(r3, g3, b3)` or `vceRgba(r3, g3, b3, a)` from `VCE_STEPS = [0, 36, 73, 109, 146, 182, 219, 255]`. Outline color is strictly `#242449` (`OUTLINE_COLOR`).
* **Zero Vector Geometry in Sprites/Tiles/Portraits**: All visual entities must be compiled from pure hex matrices (`SPRITE_HEX`, `TILE_HEX`, `PORTRAIT_PAL`). Particles and dust are rendered as 1x1 or 2x2 `fillRect` clusters.
* **HuC6280 6-Channel PSG Audio**: All BGM and SFX run through the 32-sample DFT wavetable synthesizer (`waveLead`, `waveHollow`, `waveBass`, `waveArp`, noise generators) driving `vuMeters[0..6]`.
* **Global Engine Window Exports**: Maintain `window.YsEngine`, `window.flags`, `window.hero`, `window.dialogueState`, `window.npcs`, `window.monsters`, `window.drops`, `window.transitionState`, `window.collisionMap`.

---

## 2. PC-Engine CD Intro Cinematic: "The Curse of the Silent Bell"

### 2.1 Cinematic Storyboard Sequence (5 Cards)
The game begins in a dedicated letterboxed cinema mode (`256x224` viewport with 16px top/bottom black cinematic borders). Each slide renders a 9-bit pixel-art illustration card with scrolling Japanese/English prologue text and a blinking gold `>` prompt.

```
+-------------------------------------------------------------+
| [ CINEMATIC 16px BLACK LETTERBOX BAR ]                      |
| +---------------------------------------------------------+ |
| |                                                         | |
| |        [ 9-BIT VCE PIXEL ART CINEMATIC CARD ]           | |
| |                                                         | |
| +---------------------------------------------------------+ |
| | "For centuries, the sacred Bell of Aldenor rang out...   | |
| |  sealing the twilight shadows beneath the coastal deep."| |
| [ CINEMATIC 16px BLACK LETTERBOX BAR ] [SPACE: ADVANCE]     |
+-------------------------------------------------------------+
```

1. **Card 1: Adol on the Ship Prow (`cine_ship_prow`)**:
   - Visual: Adol in his silver breastplate, red hair blowing in the sea wind, looking toward the distant misty cliffs of Aldenor at dusk.
   - Music: Gentle ocean surf noise + mysterious 3-note arpeggio.
   - Text: *"The Sea of Esteria whispers of forgotten lands. Adol Christin, red-haired adventurer, sails toward the remote island of Aldenor..."*
2. **Card 2: The Northern Cliff Bell Tower (`cine_bell_spire`)**:
   - Visual: An imposing stone sanctum perched high above crashing sea waves, an ancient bronze bell cloaked in swirling twilight miasma.
   - Text: *"High above the village stands the sacred Bell Tower of Aldenor. For three centuries, its resonance held the ancient twilight shadows at bay."*
3. **Card 3: The Manor Bedroom & The Cursed Slumber (`cine_manor_slumber`)**:
   - Visual: The Lord of the Manor lying unconscious in a canopied bed, purple crystalline shadow tendrils creeping across the floor.
   - Text: *"Until one fateful night, dark cultists breached the sanctum. The bell's sacred clapper was shattered, and the Lord of Aldenor fell into a deathlike slumber."*
4. **Card 4: Nyah on the Manor Steps (`cine_nyah_steps`)**:
   - Visual: Nyah in her maid apron, ears flat with anxiety, clutching her fists as coastal monsters roam past the distant harbor gates.
   - Text: *"Fiercely protective of her home, the manor's guardian catgirl Nyah refuses to despair. 'If no one else will save the Lord... nyah will do it myself!'"*
5. **Card 5: Title Screen & Pier Landing (`cine_title_arrival`)**:
   - Visual: Project logo **PROJECT YS: THE BELL OF ALDENOR** emblazoned over the harbor view.
   - Music: Triumphant, fast-paced HuC6280 PC-Engine CD opening overture (`bgm_overture`).
   - Action: Pressing `[Space]` or `[Enter]` triggers a smooth scanline shutter wipe into the game engine, where Adol walks down the ship gangplank onto Aldenor Harbor dock (`aldenor_exterior`, `x: 384, y: 352`).

### 2.2 Skip Functionality
* Pressing `[Esc]` or `[S]` at any point skips directly to the pier arrival.
* A flag `flags.introWatched = true` is stored in `localStorage` so repeat visits jump straight to the title screen or gameplay.

---

## 3. Nyah Companion System: Active Battle & Banter Partner

### 3.1 Following Path & Proximity AI
Nyah moves through an 8-node position queue (`trailBuffer`) recorded from Adol's previous positions:
* **Trailing Leash**:
  - Distance < `28px`: Nyah enters idle state, facing Adol's general direction.
  - Distance `28px..96px`: Nyah walks smoothly along the trail buffer at `hero.speed * 0.95`.
  - Distance > `96px`: Nyah enters sprint mode (`hero.speed * 1.35`) to catch up quickly.
  - Distance > `240px` (or room transitions): Nyah instantly teleports to the nearest valid walkable tile behind Adol.
* **Collision Handling**: Nyah uses the active map's `collisionMap`. If a tile on her path is blocked, she steps along the tangent vector toward Adol's current tile.

### 3.2 Active Combat Behavior
In combat maps (`aldenor_coastal_plains`, `dungeon_mines`, `dungeon_crypts`, `dungeon_shrine`, `bell_spire`):
1. **Target Acquisition**:
   - Nyah scans for monsters within `72px` of Adol or herself.
   - She prioritizes monsters currently attacking or flanking Adol.
2. **Melee Claw Flurry (`nyahClaw0` / `nyahClaw1` in `SPRITE_HEX`)**:
   - Nyah dashes into melee range (`14px`) and delivers a swift dual claw strike.
   - Damage: `Math.floor(hero.str * 0.75)`.
   - Audio: Crisp high-frequency white-noise claw slash (`playSfxClaw()`).
   - Cooldown: `0.70s` between attacks.
3. **Emergency Panic Heal**:
   - When `hero.hp < (hero.maxHp * 0.25)` and Nyah is not stunned:
   - Nyah rushes to Adol's side, plays a rising 3-note healing arpeggio, and heals Adol for `hero.maxHp * 0.35`.
   - Cooldown: `20.0s`.
   - Floating pixel text: `HEAL +35!` above Adol.

### 3.3 Unlocked Story Perks & Dual Moves
As the story progresses, Nyah unlocks powerful cooperative moves:
* **Perk 1: Dual Whirlwind Slash (Unlocked after Dungeon 1 - Mines)**:
  - When Adol releases a fully-charged Hold-[Z] Whirlwind Spin, Nyah synchronizes her sprint and spins in the opposite direction, creating a devastating 360-degree dual blade-and-claw circle that clears surrounding monster mobs.
* **Perk 2: Shadow Pounce (Unlocked after Dungeon 2 - Crypts)**:
  - Nyah can leap over spike pits and land directly behind shielded monsters, staggering them for 1.2 seconds and turning them around so Adol can strike their vulnerable back.
* **Perk 3: Guardian's Devotion (Unlocked after Dungeon 3 - Shrine)**:
  - If Adol's HP reaches 0 during a boss battle, Nyah sacrifices her own stamina to revive Adol with 50% HP (once per boss attempt), shouting: *"DON'T YOU DARE DIE ON NYAH, MASTER!!"*

### 3.4 Companion Bonding, Campfire Banter & Cosmetics
Nyah's relationship deepens organically through story milestones rather than a grindy number meter:
* **Resting & Campfire Banter**:
  - Interacting with beds at the Harbor Tavern, Manor Parlor, or glowing Mana Crystals in dungeon safe rooms prompts a rest dialogue choice:
    `> Rest until Morning/Night`
    `> Sit and Chat with Nyah`
  - "Chat with Nyah" triggers intimate, funny, and story-relevant dialogue vignettes (e.g. Nyah complaining about cave dust getting in her fur, demanding Adol let her inspect his sword wounds, or admitting she was terrified before the first boss).
* **Unlockable Cosmetic Costumes & Accessories**:
  - Found in dungeon chests or bought from Goran/Lumina:
    1. *Default*: Classic Maid Apron with Black Velvet Ribbon.
    2. *Crimson Ribbon* (Mines chest): Boosts claw critical strike chance by +10%; sprite recolors her ribbon to deep red.
    3. *Silver Jingle Bell Collar* (Bought from Lumina): Nyah's idle chime plays soft bells when she runs; increases her heal potency by +15%.
    4. *Moonlight Cloak* (Shrine chest): Nyah wears an elegant midnight-blue elven capelet.
* **Idle Animations**:
  - When Adol stands still for > 3.0 seconds, Nyah performs charming context-sensitive idle animations:
    - *Midday outside*: Sits down and rubs her ears, or leans playfully against Adol's shoulder.
    - *Near water/pier*: Stares intently at fish ripples, tail swishing rapidly.
    - *In dungeons*: Scans the ceiling nervously, ears perking toward monster sounds.

---

## 4. RPG Stats, Leveling & Equipment System

### 4.1 Character Stats (Levels 1 to 20)
Adol begins at Level 1 and can reach Level 20:

$$\text{NextEXP}(L) = \lfloor 100 \times 1.35^{L - 1} \rfloor$$

$$\text{MaxHP}(L) = 100 + (L - 1) \times 15 \quad (\text{Lv 1: } 100 \rightarrow \text{Lv 20: } 385)$$

$$\text{BaseSTR}(L) = 10 + (L - 1) \times 3 \quad (\text{Lv 1: } 10 \rightarrow \text{Lv 20: } 67)$$

$$\text{BaseDEF}(L) = 5 + (L - 1) \times 2 \quad (\text{Lv 1: } 5 \rightarrow \text{Lv 20: } 43)$$

* **Combat Damage Formula**:
  $$\text{Damage} = \max(1, \, (\text{TotalSTR} - \text{TargetDEF}) \times \text{DamageModifier} \pm \text{Rnd}(0..2))$$
* **Level-Up Sequence**:
  - Plays an authentic 5-note HuC6280 victory fanfare.
  - Instantly refills Adol's HP to full.
  - Spawns a floating gold `LEVEL UP! (LV 2)` pixel banner above Adol's head.
  - Nyah's claw attack power scales automatically with Adol's level.

### 4.2 5-Tier Weapon Progression System
Each sword tier features a distinct hex-matrix sprite representation and visual slash motion trail:

| Tier | Weapon Name | ATK | Special Technique & Arc Visuals | Acquisition Method |
|:---:|:---|:---:|:---|:---|
| **1** | **Rusty Shortsword** | `+10` | Standard `14px` white blade arc (`vceColor(7,7,7)`). | Starting equipment. |
| **2** | **Iron Broadsword** | `+22` | Wider `18px` steel arc with blue trail (`vceColor(3,5,7)`). | Buy from Goran's Forge (`120 G`). |
| **3** | **Silver Falchion** | `+38` | Fast `20px` gleaming silver arc; reduces attack cooldown from `0.26s` to `0.20s`. | Dungeon 1 (Mines) Treasure Chest. |
| **4** | **Flame Edge** | `+58` | Scorching crimson-gold fire trail (`vceColor(7,3,1)` + `vceColor(7,6,1)`); sets flammable dungeon vines ablaze; extra damage against undead. | Dungeon 2 (Crypts) Hidden Vault. |
| **5** | **Clerici's Sacred Blade** | `+85` | Holy radiant crescent arc (`vceColor(6,7,7)`); at 100% HP, swings launch a piercing sword beam projectile across the screen. | Dungeon 3 (Shrine) Inner Sanctum. |

* **Combat Techniques**:
  - **Standard Slash (`KeyZ` or `Space`)**: Fast directional arc with knockback.
  - **Whirlwind Spin Slash (Hold `[Z]` for 0.65s, then release)**: Spins Adol in a 360-degree radius hitting all adjacent monsters for `1.6x` damage with guaranteed knockback.
  - **Sword Beam (`Clerici Blade` at full HP)**: Fires an 8x8 golden cross projectile traveling 8 tiles.

### 4.3 Armor, Shields & Accessories

| Item Name | Slot | Stat Effects | Visual / Functional Benefit |
|:---|:---:|:---:|:---|
| **Traveler's Tunic** | Armor | `DEF +0` | Starting cloth vest. |
| **Studded Leather** | Armor | `DEF +6` | Purchased from Goran (`80 G`). |
| **Silver Breastplate** | Armor | `DEF +14` | Reduces monster knockback distance by 50%. Found in Mines. |
| **Holy Knight Armor** | Armor | `DEF +26` | Found in Sunken Shrine. Resists elemental damage. |
| **Wood Buckler** | Shield | `DEF +2` | Purchased from Goran (`50 G`). |
| **Kite Shield** | Shield | `DEF +8` | Found in Crypts. |
| **Ring of Power** | Accessory | `STR +8` | Treasure in Coastal Plains cave. |
| **Ring of Melody** | Accessory | `HP Regen` | Regenerates 2 HP every 3 seconds while moving. Quest reward from Bard. |
| **Sea Charm** | Accessory | `DEF +6` | Protects against poison and tide traps. Quest reward from Sailor. |

### 4.4 Retro Status & Equipment Screen (`[I]` / `[Tab]`)
Pressing `[I]` or `[Tab]` pauses the engine and renders a high-contrast PC-Engine CD subscreen:

```
+-----------------------------------------------------------------------+
| [EQUIPMENT & STATUS]                             GOLD: 450 G  LV: 06  |
+------------------------------------+----------------------------------+
| ADOL CHRISTIN                      | [1] BAG ITEMS      [2] QUESTS    |
| HP:  175 / 175  EXP:  1420 / 1850  | -------------------------------- |
| STR: 48 (Base 25 + Wpn 22 + Ring 1)| [X] Healing Potion (x3)   [HOT:1]|
| DEF: 27 (Base 15 + Arm 6  + Shd 6) | [ ] Antidote Salve (x2)   [HOT:2]|
|                                    | [ ] Jasmine-Catnip Tea    [HOT:3]|
| [WPN] Iron Broadsword              | [ ] Stygian Pickaxe (Key)        |
| [ARM] Studded Leather              | [ ] Mine Cart Key (Key)          |
| [SHD] Wood Buckler                 |                                  |
| [ACC] Ring of Power                | [SPACE: USE]  [1-3: SET QUICK]   |
|                                    |                                  |
| COMPANION: NYAH (BOND: TRUSTED)    | [S] SAVE GAME   [L] LOAD GAME    |
| [ACC] Silver Jingle Bell (+15% H)  |                                  |
+------------------------------------+----------------------------------+
```

* **Quick-Use Hotkeys (`[1]`, `[2]`, `[3]`)**: In real-time gameplay, pressing number keys `1..3` instantly drinks the assigned consumable from Adol's pouch without opening the menu.

---

## 5. World Map, Dungeons & Boss Architecture

### 5.1 Comprehensive World Scene Registry (`MAPS`)
The game engine expands from 4 maps to 10 interconnected maps:

```
               [ Northern Bell Tower Spire ] (Final Boss)
                           ^
                           |
             [ Northeast Grand Manor ]
                           ^
                           |
[ Goran's Forge ] <-> [ Aldenor Town ] <-> [ Lumina's Workshop ]
                           ^   |
                           |   v
                           | [ Harbor Tavern ]
                           v
               [ Coastal Plains ] (Hub Wilderness)
                 /         |         \
                v          v          v
     [ Old Quarry Mines ] [ Coastal Crypts ] [ Sunken Shrine ]
```

1. `aldenor_exterior` (Town Exterior - `32x26` tiles)
2. `manor_parlor` (Grand Manor Interior - `16x14` tiles)
3. `lumina_workshop` (Apothecary Interior - `14x12` tiles)
4. `harbor_tavern` (Tavern Interior - `16x14` tiles)
5. `goran_forge` (Blacksmith Interior - `14x12` tiles)
6. `aldenor_coastal_plains` (Wilderness Hub - `32x24` tiles)
7. `dungeon_mines` (The Old Quarry Mines - `36x32` tiles)
8. `dungeon_crypts` (The Coastal Crypts - `36x32` tiles)
9. `dungeon_shrine` (The Sunken Shrine - `36x32` tiles)
10. `bell_spire` (The Northern Bell Tower Spire - `20x28` tiles)

---

### 5.2 Dungeon 1: The Old Quarry Mines (`dungeon_mines`)

* **Visual Theme**: Dark brown shale, exposed copper veins, wooden mine timbers, rail tracks, lantern sconces.
* **Environmental Puzzle: Minecart Track Switches**:
  - Rail lines wind through the caverns blocked by heavy wooden barricades.
  - Striking lever switches (`trackSwitch0` / `trackSwitch1`) toggles the rail junctions.
  - Interacting with an empty minecart launches it down the rails, smashing barriers and opening access to lower ore chambers.
* **Bestiary**:
  - `goblin_miner`: Fast scuttling miners hurling stone picks (`HP: 35, ATK: 12`).
  - `cave_bat`: Erratically fluttering bats swooping from above (`HP: 18, ATK: 8`).
  - `rock_beetle`: Armored bugs immune to front attacks; must be struck from behind or hit with Whirlwind Slash (`HP: 45, ATK: 15`).
* **Dungeon Boss: Obsidian Crusher (Gorgon Golem)**:
  - **Arena**: `240x180` circular cavern with unstable ceiling stalactites.
  - **Visual**: Huge `32x32` animated stone golem with glowing violet magma core.
  - **Phase 1**: Ground Pound shockwave that travels outward; Adol must dodge or jump attack. Nyah pounces to draw aggro.
  - **Phase 2 (HP < 50%)**: Leaps into ceiling; shadows appear on floor where stalactites fall; charges across the arena when landing.
  - **Weak Point**: Core exposed after missing a charge and crashing into the cavern wall.
  - **Reward**: *Silver Bell Tuning Fork* (Key Item) + *Silver Falchion* sword.

---

### 5.3 Dungeon 2: The Coastal Crypts (`dungeon_crypts`)

* **Visual Theme**: Cold slate brick, rusted iron portcullises, glowing green braziers, sarcophagi, cobwebs.
* **Environmental Puzzle: Lever Portcullises & Secret Illusory Walls**:
  - Gated chambers require finding 3 skull levers scattered across separate crypt wings.
  - Cracked stone walls can be destroyed using the *Flame Edge* or bomb barrels.
  - False wall illusions (tiles that look solid but have `solid: 0` allowing passage into hidden treasure alcoves).
* **Bestiary**:
  - `skeleton_knight`: Sword-and-shield undead that parries frontal blows (`HP: 60, ATK: 20`).
  - `crypt_wisp`: Floating ghostly orbs firing seeking shadow bolts (`HP: 30, ATK: 16`).
  - `crypt_spider`: Lunges from ceilings and inflicts temporary slow status (`HP: 40, ATK: 14`).
* **Dungeon Boss: Lord Malakor (Skeletal Lich)**:
  - **Arena**: Ancient crypt throne room surrounded by purple flame braziers.
  - **Visual**: Hovering skeletal sorcerer in decayed ceremonial robes.
  - **Phase 1**: Teleports to random pillars; casts a 5-way spread of shadow flame skulls.
  - **Phase 2 (HP < 50%)**: Summons an orbiting ring of bone shields; summons skeleton minions; Adol and Nyah must time their slashes to penetrate the bone orbit.
  - **Reward**: *Silver Bell Clapper* (Key Item) + *Flame Edge* sword.

---

### 5.4 Dungeon 3: The Sunken Shrine (`dungeon_shrine`)

* **Visual Theme**: Submerged marble pillars, coral encrustations, luminescent sea flora, bubbling water channels.
* **Environmental Puzzle: Sluice Gate Valves & Water Levels**:
  - Interacting with ancient brass wheel valves (`waterValve0` / `waterValve1`) raises or lowers the chamber's water level.
  - Low Water: Exposes sunken stone stairs and floor switches.
  - High Water: Floats wooden platforms to span deep chasms and access elevated doors.
* **Bestiary**:
  - `armored_triton`: Amphibious spear-wielders with fast thrust attacks (`HP: 85, ATK: 28`).
  - `electric_jelly`: Pulsing jellyfish that discharge shock fields when hit (`HP: 45, ATK: 22`).
  - `coral_crab`: Giant armored crabs with high DEF (`HP: 110, ATK: 32`).
* **Dungeon Boss: Charybdis Queen (Abyssal Leviathan)**:
  - **Arena**: Flooded sanctuary surrounded by deep water pools.
  - **Visual**: Massive serpentine sea dragon rearing out of the central whirlpool.
  - **Phase 1**: Tidal wave sweep covering half the arena; water geysers erupting from floor grates.
  - **Phase 2 (HP < 50%)**: Submerges into water; whirlpool drags Adol toward the center; requires Nyah's dual leap attack to stagger the head when it surfaces.
  - **Reward**: *Sacred Sanctum Crest* (Key Item) + *Clerici's Sacred Blade*.

---

### 5.5 Climax: The Northern Bell Tower Spire (`bell_spire`)

* **Setting**: Open-air grand stone staircase winding up the cliff face into the storm clouds above the Grand Manor.
* **Final Confrontation: The Shadow of the Eclipse**:
  - The manifestation of the ancient slumber curse guarding the silent bell.
  - Multi-phase encounter featuring fast bullet spreads, dark clones, and arena-wide darkness.
* **Victory & Restoration Cutscene**:
  - Adol and Nyah place the Clapper and Crest into the Great Bell.
  - Striking the bell produces a radiant HuC6280 chime that banishes the storm clouds and bathes Aldenor in morning sunlight.
  - The Manor Lord awakens; the villagers cheer at the gate.
  - Emotional, tender epilogue scene between Adol and Nyah on the cliff edge overlooking the glistening sea.

---

## 6. Town Life, Economy, Quests & NPC Dialogue

### 6.1 Expanded NPC Roster & Roles

```
[ ALDENOR TOWN RESIDENTS ]
├── Goran (Blacksmith)   -> Sells Iron weapons, shields, repairs gear, forges accessories.
├── Lumina (Apothecary)  -> Sells potions, antidotes, catnip treats, alchemical upgrades.
├── Nyah (Companion)     -> Manor steps / alongside Adol; dialogue, banter, affection.
├── Elder Gared (Mayor)  -> Fountain plaza; gives town lore, history, and secret hints.
├── Guard Thorne (Gate)  -> Harbor & South Gate; warns about wilderness danger, bounty info.
├── Lyla (Child)         -> Wanders town; side quest to rescue stray kitten.
├── Barkeep Orson        -> Tavern; sells tavern brew, shares rumors about the three ruins.
├── Bard Dennis          -> Tavern hearth; plays lute songs, hints at crypt puzzles.
├── Old Sailor Pete      -> Tavern table; gives coastal map clues, lost locket quest.
└── Mercenary Jack       -> Tavern table; teaches Whirlwind Slash and boss evasion tactics.
```

### 6.2 Tavern Bounty Board
Located on the exterior wall of the Harbor Tavern:
* An interactive board displaying 4 bounty notices:
  1. **Hunt 6 Coastal Slimes**: Reward `60 G`, `150 EXP`.
  2. **Exterminate 8 Mine Bats**: Reward `140 G`, `350 EXP`.
  3. **Purge 5 Crypt Skeletons**: Reward `250 G`, `600 EXP`.
  4. **Slay 4 Armored Shore Crabs**: Reward `400 G`, `1000 EXP` + *Triton Scale* (forge material).
* Bounties automatically track kills and pay out upon checking back at the board or talking to Barkeep Orson.

### 6.3 Dynamic Chapter-Based Dialogue & Secret Gossip
NPC dialogue updates across 5 story chapters:
1. **Chapter 1: The Cursed Island (Start)** — Town is anxious; manor is sealed; Elder urges caution.
2. **Chapter 2: Depths of the Earth (Mines Cleared)** — Villagers notice fewer monsters; Goran unlocks Silver forging.
3. **Chapter 3: Echoes in the Tombs (Crypts Cleared)** — Twilight miasma thins; Bard shares ancient verses about the Sunken Shrine.
4. **Chapter 4: The Tides of Chaos (Shrine Cleared)** — The storm gathers around the Northern Spire; town rallies behind Adol & Nyah.
5. **Chapter 5: Dawn of Aldenor (Post-Game)** — Peace restored; NPCs celebrate with unique victory dialogues; free exploration of all dungeons.
* **Secret NPC Hints**:
  - Elder Gared hints: *"They say the old mine workers hid a chest behind the false rock wall near the third track switch..."*
  - Bard Dennis hints: *"When the purple flames in the crypt turn blue, walk through the eastern wall without fear..."*

---

## 7. Audio & Music Architecture (HuC6280 PSG)

The Web Audio 32-sample DFT wavetable synthesizer is expanded to support an 8-track Falcom PC-Engine CD soundscape:

| Track Constant | Title / Role | Tempo | Musical Style |
|:---|:---|:---:|:---|
| `bgm_overture` | **Prologue: The Red-Haired Voyager** | `132 BPM` | Dramatic, sweeping Falcom PC-Engine CD cinematic overture. |
| `bgm_aldenor_day` | **Aldenor: Sunlit Cobblestones** | `108 BPM` | Warm, cheerful town theme with melodic flute and harp arpeggio (existing). |
| `bgm_aldenor_twilight` | **Aldenor: Lanterns in the Mist** | `92 BPM` | Moody, contemplative nocturne with mellow wavetable bass (existing). |
| `bgm_plains` | **Wilderness: Coastal Breeze** | `140 BPM` | Upbeat, driving Falcom action field theme with brisk bassline. |
| `bgm_mines` | **Subterranean: Echoes of Iron** | `116 BPM` | Rhythmic, industrial cave exploration with deep hollow bass and mineral chimes. |
| `bgm_crypts` | **Catacombs: Danse Macabre** | `124 BPM` | Eerie baroque organ/wavetable counterpoint in harmonic minor. |
| `bgm_shrine` | **Sunken Palace: Whispering Tides** | `130 BPM` | Mystical, flowing aquatic arpeggios with resonant wave lead. |
| `bgm_boss` | **Showdown: Clashing Steel** | `156 BPM` | High-tempo, electrifying PC-Engine battle rock with rapid bass runs and snare noise. |
| `bgm_victory` | **Restoration: Dawn Over Aldenor** | `100 BPM` | Triumphant, romantic celebratory anthem. |

---

## 8. Save System & State Persistence Schema

### 8.1 LocalStorage Data Contract (`aldenor_save_v4`)
The engine serializes state to `localStorage.getItem('aldenor_save_v4')`:

```json
{
  "version": 4,
  "activeSlot": 1,
  "slots": [
    {
      "id": 1,
      "name": "Slot 1 - Coastal Crypts",
      "timestamp": 1729112400000,
      "playtime": 3420,
      "hero": {
        "level": 8,
        "exp": 2450,
        "hp": 205,
        "maxHp": 205,
        "x": 288,
        "y": 192,
        "dir": "down",
        "gold": 620,
        "weapon": "silver_falchion",
        "armor": "studded_leather",
        "shield": "wood_buckler",
        "accessory": "ring_of_power"
      },
      "nyah": {
        "perks": ["dual_spin", "shadow_pounce"],
        "costume": "crimson_ribbon",
        "accessory": "silver_bell"
      },
      "activeMapId": "dungeon_crypts",
      "flags": {
        "introWatched": true,
        "minesCleared": true,
        "cryptsCleared": false,
        "shrineCleared": false,
        "gameCompleted": false,
        "openedChests": ["mines_c1", "mines_c2", "plains_c1"],
        "completedBounties": ["bounty_slimes", "bounty_bats"]
      },
      "inventory": [
        { "id": "potion_heal", "count": 3 },
        { "id": "potion_antidote", "count": 2 },
        { "id": "bell_tuning_fork", "count": 1 }
      ]
    }
  ]
}
```

* **Seamless Auto-Save**: Occurs transparently on every map transition (`startMapTransition`) and level-up.
* **Manual Save / Load**: 3 distinct save slots accessible via the `[I]` status menu, or at glowing Mana Save Crystals placed before dungeon boss doors.

---

## 9. Phased Implementation Roadmap & Verification Plan

```
[ PHASED DEVELOPMENT TIMELINE ]
Phase 1: Core Engine Architecture, Stats, Leveling & Save System
Phase 2: Intro Cinema & Storyboard Sequence
Phase 3: Nyah Companion AI, Following Trail & Active Combat
Phase 4: Town Expansion, Blacksmith Forge, Shops & Bounty Board
Phase 5: Dungeon 1 (Old Quarry Mines) & Obsidian Crusher Boss
Phase 6: Dungeon 2 (Coastal Crypts) & Lord Malakor Boss
Phase 7: Dungeon 3 (Sunken Shrine) & Charybdis Queen Boss
Phase 8: Northern Bell Tower Spire, Final Climax & Epilogue
Phase 9: Comprehensive Audio Integration & Playtesting
```

### Phase 1: Core Engine Architecture & Data Model
* Implement Leveling curve (Levels 1–20), `hero.exp`, `hero.str`, `hero.def`, `hero.maxHp`.
* Implement `localStorage` serialization, auto-save on room change, and 3 manual save slots.
* Build the 2-pane Retro Status & Equipment Screen (`[I]` / `[Tab]`) and `[1]`-`[3]` quick-slot hotkeys.
* Validate: Leveling up awards correct stats, plays fanfare, and restores HP; state cleanly reloads after browser refresh.

### Phase 2: Intro Cinema & Storyboard Engine
* Add 9-bit VCE cinematic illustration matrices for the 5 story cards.
* Implement the letterboxed text-scrolling cinema loop with `[Space]` advance and `[Esc]` skip.
* Compose and wire the dramatic HuC6280 opening overture (`bgm_overture`).
* Validate: Intro plays on first launch; skips cleanly; smoothly drops Adol at Aldenor Harbor.

### Phase 3: Nyah Companion AI & Active Combat
* Build the 8-node `trailBuffer` following AI with obstacle tangent routing.
* Implement Nyah's melee claw attack (`SPRITE_HEX: nyahClaw0/1`), targeting logic, and emergency panic heal.
* Add companion resting banter when sleeping at the Tavern or Mana Save Crystals.
* Validate: Nyah stays with Adol without getting stuck on corners; attacks nearby monsters; heals Adol when HP < 25%.

### Phase 4: Town Expansion, Shops & Bounty Board
* Add Goran's Blacksmith Forge (`goran_forge`) and populate with Goran NPC.
* Implement shopping UI in Lumina's Apothecary and Goran's Forge.
* Add the exterior Tavern Bounty Board with 4 hunt missions.
* Implement dynamic chapter-based dialogue for all town NPCs.
* Validate: Player can purchase weapons/armor with Gold; equipped stats update immediately; bounties track kills and reward Gold/EXP.

### Phase 5: Dungeon 1 — The Old Quarry Mines
* Construct `dungeon_mines` (`36x32` tiles) with mine tracks, switches, and minecart physics.
* Populate Goblin Miners, Cave Bats, and Rock Beetles.
* Code the Obsidian Crusher boss encounter with ground shockwaves, falling stalactites, and Boss HP bar.
* Place the *Silver Falchion* and *Silver Bell Tuning Fork* rewards.
* Validate: Track switches toggle correctly; boss transitions smoothly between phases; Nyah unlocks Dual Spin Slash upon victory.

### Phase 6: Dungeon 2 — The Coastal Crypts
* Construct `dungeon_crypts` (`36x32` tiles) with lever portcullises, spike traps, and illusory breakable walls.
* Populate Skeleton Knights, Crypt Wisps, and Spiders.
* Code the Lord Malakor Skeletal Lich boss with teleportation, dark fire skulls, and orbiting bone shield.
* Place the *Flame Edge* and *Silver Bell Clapper* rewards.
* Validate: Portcullises open upon activating levers; boss shield mechanics operate without glitching; Flame Edge burns vines.

### Phase 7: Dungeon 3 — The Sunken Shrine
* Construct `dungeon_shrine` (`36x32` tiles) with dynamic water level sluice gates.
* Populate Armored Tritons, Electric Jellyfish, and Coral Crabs.
* Code the Charybdis Queen Leviathan boss with tidal wave sweeps, water geysers, and cooperative pounce vulnerability.
* Place *Clerici's Sacred Blade* and the *Sacred Sanctum Crest* rewards.
* Validate: Sluice valves raise/lower water levels cleanly; Clerici Blade launches sword beams at 100% HP.

### Phase 8: Northern Bell Tower Spire & Epilogue
* Construct `bell_spire` (`20x28` tiles) leading up the cliff staircase into the clouds.
* Code the Final Boss encounter: The Shadow of the Eclipse.
* Implement the Bell Restoration cinematic, dawn over Aldenor, and tender Adol & Nyah ending scene.
* Validate: Full playthrough from Intro to Epilogue can be completed seamlessly without crashes or state desyncs.

### Phase 9: Audio Soundscape & Quality Assurance
* Verify all 8 PSG BGM tracks loop smoothly through `createHuC6280Wave` without audio context clicks.
* Confirm VU meters 0..6 accurately reflect all wavetable channels during combat and dialogue.
* Perform high-DPI CRT filter check across all dungeons to ensure 1:1 scanlines and phosphor bloom perform at 60 FPS.

---

## 10. Summary Checklist for Argon Review

When reviewing this master plan, Argon should specifically verify:
1. **PCE Hardware Authenticity**: Does the design maintain 100% compliance with HuC6260 9-bit VCE palette constraints, zero vector paths, and HuC6280 6-channel PSG synthesis?
2. **Single-File Feasibility**: Can the 10 maps, 5 cinema cards, new hex sprites, and combat/save routines fit within `index.html` without performance degradation or browser memory leaks?
3. **Pacing & Progression Balance**: Does the 1–20 leveling curve and 5-tier sword progression provide satisfying damage scaling against the 3 dungeon tiers and boss encounters?
4. **Nyah Companion Balance**: Does Nyah's companion AI enhance combat without trivializing boss difficulty or blocking Adol in narrow 1-tile dungeon corridors?
5. **UI & Usability**: Is the 2-pane `[I]` Status Screen intuitive on both keyboard and gamepad/touch, and do the `[1]`-`[3]` quick-potion hotkeys keep combat fluid?
