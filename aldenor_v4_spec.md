# Project Ys-Engine: Aldenor RPG Expansion — Master Architectural Specification & Complete Dialogue Script (v4.1)

> **Document Version**: 4.1.0 (Argon-Verified Master Spec & Full Narrative Script)  
> **Target Application**: `index.html` (`Project Ys-Engine: Aldenor Town (PC-Engine CD)`)  
> **Design Philosophy**: Strict Late-1980s / Early-1990s Japanese NEC PC-Engine CD-ROM² Action RPG (Falcom *Ys Book I & II*, *Ys IV: The Dawn of Ys*, *Popful Mail*, *Dragon Slayer: The Legend of Heroes*)  
> **Architecture Constraint**: Single-file, zero-external-dependency HTML5 Canvas + Web Audio API synthesizer. Pure retro hardware authenticity (HuC6260 9-bit VCE palette, HuC6280 6-channel PSG wavetable audio, pure hex-matrix pixel art, zero vector canvas geometry).

---

## 1. Executive Summary & Core Architecture Rules

### 1.1 Objective
Expand the existing town/coastal adventure into a full-scale, narrative-driven Action RPG featuring:
1. **Nyah as an Active Battle & Banter Companion**: She follows Adol, fights alongside him with twin silver cat-claw daggers (`nyahClaw0` / `nyahClaw1`), auto-heals in emergencies, participates in dialogue, and gains new perks, idle animations, and cosmetic accessories as the story progresses.
2. **PC-Engine CD Visual Cinema Intro**: A 5-card pixel-art visual novel prologue with dramatic HuC6280 PSG overture music and scrolling text, transitioning smoothly into Adol landing at Aldenor Harbor.
3. **The Three Great Dungeons + Bell Tower Climax**:
   - *Dungeon 1: The Old Quarry Mines* (minecart track switches, rock beetles, Obsidian Crusher boss).
   - *Dungeon 2: The Coastal Crypts* (undead catacombs, lever portcullises, illusory walls, Lord Malakor Skeletal Lich boss).
   - *Dungeon 3: The Sunken Shrine* (submerged water gates, sluice valves, Charybdis Queen Leviathan boss).
   - *Final Climax: The Northern Bell Tower Spire* (The Shadow of the Eclipse showdown, restoration of the Bell, dawn epilogue).
4. **Classic Falcom Leveling (Lv 1–20) & Weapon Progression**:
   - Levels 1 to 20 with EXP curve, STR, DEF, Max HP, victory fanfare, and full HP refill.
   - 5 tiered upgradable swords with unique hex sprite trails, Hold-[Z] Whirlwind Spin Slash, and full-HP sword beam projectile.
5. **Town Life, Economy & Quests**:
   - Goran's Blacksmith Forge & Lumina's Expanded Apothecary.
   - Dynamic story-phased NPC dialogue across 5 chapters.
   - In-menu Quest Log tab (`[I]` / `[Tab]`) and an exterior Tavern Bounty Board.
   - NPCs gossiping and dropping hints about secrets, hidden walls, and hidden treasure.
6. **Dual Save System**: Seamless `localStorage` auto-save on room transitions/level-up + 3 manual save slots.

### 1.2 Core Hardware & Backwards-Compatibility Constraints
* **HuC6260 VCE 9-Bit Palette**: All colors must use `vceColor(r3, g3, b3)` or `vceRgba(r3, g3, b3, a)` from `VCE_STEPS = [0, 36, 73, 109, 146, 182, 219, 255]`. Outline color is strictly `#242449` (`OUTLINE_COLOR = vceColor(1, 1, 2)`).
* **Zero Vector Geometry in Sprites/Tiles/Portraits**: All visual entities must be compiled from pure hex matrices (`SPRITE_HEX`, `TILE_HEX`, `PORTRAIT_PAL`). Particles and dust are rendered strictly as `1x1` or `2x2` `fillRect` clusters.
* **HuC6280 6-Channel PSG Audio**: All BGM and SFX run through the 32-sample DFT wavetable synthesizer (`waveLead`, `waveHollow`, `waveBass`, `waveArp`, noise generators) driving `vuMeters[0..6]`.
* **Global Engine Window Exports**: Maintain `window.YsEngine`, `window.flags`, `window.hero`, `window.dialogueState`, `window.npcs`, `window.monsters`, `window.drops`, `window.transitionState`, `window.collisionMap`.
* **Unified Inventory Bridge (V3 + V4 Compatibility)**:
  - Maintain `hero.bag = [{ id, name, type, count, iconHex }]` for stackable consumables, key items, and gear, while keeping `flags.inventory` automatically synchronized to the most recently acquired quest key item (`'starlight_tonic'`, `'silver_teacup'`, `'guard_sandwich'`, `'jasmine_tea'`, `'bell_tuning_fork'`, `'bell_clapper'`, `'sanctum_crest'`) so all existing V3 dialogue condition checks (`flags.inventory === 'jasmine_tea'`) continue to work without modification.
  - Provide helper functions: `hasItem(id)`, `getItemCount(id)`, `addItem(id, qty = 1)`, and `removeItem(id, qty = 1)`.

---

## 2. PC-Engine CD Intro Cinematic: "The Curse of the Silent Bell"

### 2.1 Memory-Efficient Layered VCE Cinema Renderer
> **CRITICAL ARCHITECTURAL RULE**: Do NOT hardcode five massive `256x160` raw strings (which would exceed 200,000 characters). Instead, render each `256x160` cinema canvas inside the letterboxed `256x224` viewport (`16px` top/bottom black bars) by compositing:
> 1. **HuC6260 9-Bit Dithered Sky/Sea Scanline Bands** (`fillRect` horizontal strips using `vceColor`).
> 2. **Tile Stamps** from `TILE_HEX` (stone masonry, manor windows, harbor water, cliffs).
> 3. **Character & Focal Stamps**: Compact `32x32` and `48x32` hex matrices in `CINE_HEX` scaled `2x`, plus `compilePortraitCanvas` portraits.

```
+-------------------------------------------------------------+
| [ CINEMATIC 16px BLACK LETTERBOX BAR ]                      |
| +---------------------------------------------------------+ |
| |                                                         | |
| |   [ LAYERED 9-BIT VCE PIXEL ART CINEMATIC SCENE ]       | |
| |                                                         | |
| +---------------------------------------------------------+ |
| | "For centuries, the sacred Bell of Aldenor rang out...   | |
| |  sealing the twilight shadows beneath the coastal deep."| |
| [SPACE/ENTER: NEXT]                      [ESC/S: SKIP INTRO]|
+-------------------------------------------------------------+
```

### 2.2 Complete 5-Card Storyboard & Script
1. **Card 1: Adol on the Ship Prow (`cine_ship_prow`)**:
   - **Visual**: Dithered twilight purple-and-amber sea horizon (`vceColor(2,1,4)` to `vceColor(6,3,2)`), animated whitecap pixel waves, timber ship prow on the left, Adol in silver armor with wind-swept crimson hair (`2x` focal stamp) gazing toward the distant dark silhouette of Aldenor Island.
   - **Audio**: Ocean surf filtered pink noise + mysterious 3-note `waveArp` motif.
   - **Scrolling Text**:
     > *"The Sea of Esteria whispers of forgotten lands. Adol Christin, red-haired adventurer, sails toward the remote island town of Aldenor..."*
2. **Card 2: The Northern Cliff Bell Tower (`cine_bell_spire`)**:
   - **Visual**: High stone sanctum perched above crashing surf; the Great Bronze Bell suspended in the belfry, wrapped in pulsing violet-black miasma particles (`vceColor(5,1,6)`).
   - **Scrolling Text**:
     > *"High above the village stands the sacred Bell Tower of Aldenor. For three centuries, its silver chime held the abyssal twilight shadows at bay."*
3. **Card 3: The Manor Bedroom & The Cursed Slumber (`cine_manor_slumber`)**:
   - **Visual**: Grand Manor interior tiles, the Lord lying pale and motionless in a crimson-canopied bed while dark purple crystalline tendrils creep across the floorboards.
   - **Scrolling Text**:
     > *"Until one moonless night, three abyssal lords breached the sanctum. They stole the Bell's sacred relics, plunging the Lord of Aldenor into a deathlike slumber."*
4. **Card 4: Nyah on the Manor Steps (`cine_nyah_steps`)**:
   - **Visual**: Nyah on the Grand Manor steps in her black-and-white maid apron, velvety black cat ears pinned flat with worry, clutching her twin silver daggers as glowing red monster eyes peer from the southern woods.
   - **Scrolling Text**:
     > *"With the town guard overwhelmed, the manor's fiercely loyal catgirl Nyah refuses to yield. 'I don't care how many monsters are out there... nyah won't let the Manor fall!'"*
5. **Card 5: Title Screen & Pier Landing (`cine_title_arrival`)**:
   - **Visual**: Harbor lantern view with crisp pixel-art banner **PROJECT YS: THE BELL OF ALDENOR** (`vceColor(7,6,1)` gold bevel with `vceColor(1,1,2)` shadow).
   - **Audio**: Triumphant, fast-paced 132 BPM HuC6280 PC-Engine CD overture (`bgm_overture`).
   - **Transition**: Pressing `[Space]` or `[Enter]` triggers the horizontal scanline shutter wipe into `aldenor_exterior` at `(384, 352)`.
   - **Skip Rule**: Pressing `[Esc]` or `[S]` skips immediately to the pier arrival and sets `flags.introWatched = true` in `localStorage`.

---

## 3. Nyah Companion System: Recruitment, AI, Combat & Cosmetics

### 3.1 Seamless Recruitment Hook (`flags.nyahJoinedParty`)
To preserve the V3 Courtyard Broom Sweeping, Nocturnal Door Rattle, and Jasmine-Catnip Tea quest while introducing V4 Party Combat:
* **Initial State**: At the start of Chapter 1, `flags.nyahJoinedParty = false`. Nyah is stationed at the Grand Manor steps (`384, 128`) sweeping with her broom (`nyahSweep0` / `nyahSweep1`).
* **Recruitment Trigger A (The Royal Tea Route)**: Completing the Jasmine-Catnip Tea delivery unlocks `manor_parlor`, sets `flags.manorUnlocked = true` AND `flags.nyahJoinedParty = true`, and rewards Adol with `+150 EXP`. Nyah tosses her broom aside and joins Adol's active party permanently!
* **Recruitment Trigger B (The South Gate Ambush Route)**: If the player tries to walk through the South Harbor Gate (`gy >= 24, gx in 14..17`) into `aldenor_coastal_plains` while `!flags.nyahJoinedParty`, trigger a mini-cutscene:
  - Nyah sprints down from the plaza (`speed: 140`) with her ears pinned flat, stops right behind Adol, sets `flags.nyahJoinedParty = true`, and opens a mandatory dialogue box (`portraitId: 'nyah'`, `currentExpression: 'bratty'`):
    > *"HOLD IT RIGHT THERE, MASTER!! Where the hell do you think you're going by yourself?! The coastal plains are crawling with slimes and giant armored crabs! Screw sweeping the steps—nyah is coming with you so you don't get folded in five seconds flat! ...What?! Stop smiling like that, I'm only doing this because it'd be embarrassing if you died!!"*

### 3.2 Following Path, Non-Blocking Collision & Proximity AI
Once `flags.nyahJoinedParty === true`, Nyah follows Adol across all exterior, interior, and dungeon maps via an 8-node position ring buffer (`trailBuffer`, recording `(hero.x, hero.y, hero.dir)` every `10px` of hero movement):
* **Trailing Leash**:
  - Distance `< 24px`: Nyah enters idle state, facing Adol's general direction.
  - Distance `24px..88px`: Nyah walks smoothly along `trailBuffer` at `hero.speed * 0.96`.
  - Distance `88px..200px`: Nyah sprints at `hero.speed * 1.35` with rapid ear-twitch frames.
  - Distance `> 200px` (or on room transitions): Nyah snaps cleanly to the tile `16px` behind Adol's spawn position.
* **Zero Corridor Body-Blocking Rule (CRITICAL)**:
  - `hero` movement collision **never** treats `nyah` as a solid obstacle.
  - **Corridor Swap**: If Adol moves directly into Nyah's bounding box (`dist < 10px`) for `> 0.25s` inside a narrow 1-tile dungeon corridor, Nyah automatically slides onto Adol's previous `trailBuffer` node (`swapCooldown = 1.0s`). If Adol bumps into her 3 times in 10 seconds, spawn a floating pixel bark above her head: `"PERSONAL SPACE, MASTER!! >.<"`.
  - **Hazard Immunity**: Nyah does not take damage from floor spikes or minecarts so pathfinding never punishes the player.

### 3.3 Active Combat Behavior (Twin Silver Cat-Claw Daggers)
In combat maps (`aldenor_coastal_plains`, `dungeon_mines`, `dungeon_crypts`, `dungeon_shrine`, `bell_spire`):
1. **Target Acquisition**:
   - Scans for live monsters within `76px` of Adol or herself, prioritizing monsters targeting Adol.
2. **Twin Dagger "Cat-Claw" Flurry (`nyahClaw0` / `nyahClaw1` in `SPRITE_HEX`)**:
   - Nyah dashes into melee range (`16px`) and strikes with twin silver daggers (`C_WHITE` + `vceColor(7,4,6)` rose-silver slash arc).
   - **Damage**: `Math.max(2, Math.floor((hero.totalStr * 0.65) - (monster.def * 0.45)))` (+10% crit chance when wearing the *Crimson Ribbon*).
   - **Audio**: Crisp high-frequency HuC6280 noise + triangle sweep (`playSfxClaw()`).
   - **Cooldown**: `0.68s` between strikes.
3. **Emergency Panic Heal**:
   - Triggers automatically when `hero.hp <= Math.floor(hero.maxHp * 0.28)` and `nyah.healCooldown <= 0`.
   - Nyah rushes to Adol, plays a 3-note HuC6280 healing arpeggio, restores `Math.floor(hero.maxHp * (nyah.accessory === 'silver_bell' ? 0.50 : 0.35))` HP, and spawns floating green pixel text `NYAH HEAL +XX!` and a bark `"STAY WITH ME, IDIOT!!"`.
   - **Cooldown**: `18.0s` (displayed as a tiny bell cooldown dot next to Nyah's HUD badge).

### 3.4 Story Perks & Cooperative Dual Techniques
* **Perk 1: Dual Whirlwind Slash (Unlocked after Dungeon 1 - Mines)**:
  - When Adol releases a charged Hold-`[Z]` Whirlwind Spin (`chargeTimer >= 0.60s`), Nyah spins simultaneously in a counter-rotating crimson-and-silver ring (`36px` radius), dealing `1.8x` damage to all surrounding enemies and deflecting minor projectiles.
* **Perk 2: Shadow Pounce (Unlocked after Dungeon 2 - Crypts)**:
  - When Adol targets a front-shielded enemy (`rock_beetle`, `skeleton_knight`, `armored_triton`) or boss, Nyah vaults over hazards (`zOffset` arc animation) to land behind the enemy, staggering them (`monster.staggerTimer = 1.4s`, flipping their facing direction) and shouting `"HIT 'EM NOW, MASTER!"`.
* **Perk 3: Guardian's Devotion (Unlocked after Dungeon 3 - Shrine)**:
  - Once per boss encounter (or wilderness run), if `hero.hp` drops to `0`, Nyah intercepts the fatal blow, flashes gold, restores Adol to `50%` Max HP with `2.0s` of invulnerability, and yells: `"DON'T YOU DARE DIE ON NYAH, MASTER!!"`.

### 3.5 Unlockable Cosmetics & Context-Sensitive Idle Animations
* **Cosmetic Accessories (Visible on Nyah's Sprite & Portrait)**:
  1. `default_ribbon`: Classic Maid Apron with Black Velvet Ribbon.
  2. `crimson_ribbon` (Found in Dungeon 1 Mines Chest): Recolors Nyah's twin-tail ribbon pixels to deep crimson (`vceColor(7,1,2)`); boosts Nyah's critical strike chance by `+15%`.
  3. `silver_bell` (Purchased from Lumina for `180 G`): Adds a gleaming silver bell pixel cluster to her choker (`vceColor(7,7,3)`); plays a soft high-pitched HuC6280 chime every 8 steps and boosts Nyah's Emergency Heal from `35%` to `50%` Max HP.
  4. `moonlight_cloak` (Found in Dungeon 3 Shrine Chest): Renders a midnight-blue elven capelet (`vceColor(2,3,7)`) over her shoulders; reduces Nyah's attack cooldown to `0.50s`.
* **Context-Sensitive Idle Animations (Triggered when `hero.idleTimer > 3.0s`)**:
  - *Town / Midday*: Smooths her apron, touches her cat ears self-consciously, or leans side-by-side against Adol's shoulder (`nyahLean`).
  - *Near Water / Harbor / Shrine*: Crouches slightly to stare at water ripples while her glossy black tail swishes rapidly left and right.
  - *Inside Dungeons*: Glances left and right with ears perked sharply toward the nearest monster.

---

## 4. Balanced RPG Math, Leveling (Lv 1–20) & Gear Progression

### 4.1 Corrected Combat & Leveling Formulas
Adol progresses from Level 1 to Level 20:

$$\text{NextEXP}(L) = \lfloor 80 \times 1.32^{L - 1} \rfloor$$

$$\text{MaxHP}(L) = 100 + (L - 1) \times 15 \quad (\text{Lv 1: } 100 \rightarrow \text{Lv 20: } 385)$$

$$\text{BaseSTR}(L) = 10 + (L - 1) \times 3 \quad (\text{Lv 1: } 10 \rightarrow \text{Lv 20: } 67)$$

$$\text{BaseDEF}(L) = 5 + (L - 1) \times 2 \quad (\text{Lv 1: } 5 \rightarrow \text{Lv 20: } 43)$$

* **Balanced Damage Formula (Prevents `1 Damage` Softlocks & One-Shot Bugs)**:
  $$\text{HeroDamage} = \max\left(2, \, \left\lfloor \left(\text{TotalSTR} - \text{MonsterDEF} \times 0.55\right) \times \text{SkillMult} \right\rfloor + \text{Rnd}(-1..2)\right)$$
  $$\text{MonsterDamage} = \max\left(2, \, \left\lfloor \text{MonsterATK} - \text{TotalDEF} \times 0.55 \right\rfloor + \text{Rnd}(-1..1)\right)$$
  *(Note: If `MonsterDamage` is reduced below 15% of `MonsterATK` by high armor, clamp minimum damage to `Math.max(1, Math.floor(MonsterATK * 0.12))` so late-game enemies still feel dangerous while armor upgrades noticeably cut incoming damage in half!)*

### 4.2 5-Tier Weapon Progression Table

| Tier | Weapon ID & Name | ATK | Cooldown | Arc Color & Special Effect | Acquisition |
|:---:|:---|:---:|:---:|:---|:---|
| **1** | `rusty_sword` (**Rusty Shortsword**) | `+8` | `0.26s` | `14px` White arc (`vceColor(7,7,7)`). | Starting weapon. |
| **2** | `iron_broadsword` (**Iron Broadsword**) | `+18` | `0.24s` | `18px` Steel-blue arc (`vceColor(3,5,7)`). | Goran's Forge (`120 G`). |
| **3** | `silver_falchion` (**Silver Falchion**) | `+32` | `0.20s` | `20px` Gleaming cyan-silver arc (`vceColor(5,7,7)`); fast swing. | Dungeon 1 (Mines) Chest. |
| **4** | `flame_edge` (**Flame Edge**) | `+48` | `0.20s` | `22px` Crimson-gold fire arc (`vceColor(7,3,1)`); burns crypt vines & deals `1.3x` vs Undead. | Dungeon 2 (Crypts) Vault. |
| **5** | `clerici_blade` (**Clerici's Sacred Blade**) | `+70` | `0.18s` | `24px` Radiant holy arc (`vceColor(6,7,7)`); at `>= 90%` HP, launches a piercing 8x8 gold crescent beam (`range: 136px`, `0.6x` STR damage). | Dungeon 3 (Shrine) Sanctum. |

### 4.3 Complete Monster & Boss Balanced Stat Table

| Zone | Entity ID | Name | HP | ATK | DEF | EXP | Gold | Special Behavior |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Coastal Plains** | `slime` | Plains Slime | `24` | `12` | `4` | `12` | `8 G` | Hops toward hero; drops Herb (25%). |
| **Coastal Plains** | `crab` | Shore Crab | `42` | `18` | `10` | `22` | `15 G` | Sideways scuttle charge. |
| **D1: Mines** | `cave_bat` | Cave Bat | `36` | `22` | `8` | `28` | `14 G` | Erratic sine-wave swoop; ignores rail obstacles. |
| **D1: Mines** | `goblin_miner` | Goblin Miner | `65` | `28` | `14` | `45` | `24 G` | Throws stone pickaxe projectile (`range: 96px`). |
| **D1: Mines** | `rock_beetle` | Armored Beetle | `90` | `32` | `28` | `60` | `30 G` | Frontal armor (`0.2x` dmg from front); vulnerable from behind or Spin Slash. |
| **D1 BOSS** | `boss_golem` | **Obsidian Crusher** | `420` | `42` | `22` | `350` | `250 G` | Shockwave ring, falling stalactite shadows, wall-crash stun. |
| **D2: Crypts** | `crypt_wisp` | Crypt Wisp | `75` | `38` | `16` | `75` | `35 G` | Hovers over pits; fires homing shadow bolt. |
| **D2: Crypts** | `crypt_spider` | Venom Weaver | `95` | `42` | `22` | `90` | `42 G` | Drops from ceiling; inflicts `slowTimer = 3.0s` unless wearing *Sea Charm*. |
| **D2: Crypts** | `skeleton_knight` | Skeleton Knight | `135` | `48` | `34` | `120` | `55 G` | Parries frontal normal slashes; Nyah's *Shadow Pounce* or *Flame Edge* breaks guard. |
| **D2 BOSS** | `boss_lich` | **Lord Malakor** | `750` | `58` | `32` | `800` | `500 G` | Pillar teleport, 5-way skull spread, rotating bone shield, summons 2 skeletons. |
| **D3: Shrine** | `electric_jelly` | Volt Jellyfish | `130` | `56` | `28` | `160` | `65 G` | Pulses an electric ring every `2.8s` (`20px` radius). |
| **D3: Shrine** | `armored_triton` | Abyssal Triton | `180` | `66` | `42` | `210` | `85 G` | Fast trident lunge; retreats into shallow water. |
| **D3: Shrine** | `coral_crab` | Emperor Crab | `240` | `74` | `56` | `260` | `110 G` | Heavy armor; fires bubble spread. |
| **D3 BOSS** | `boss_leviathan` | **Charybdis Queen** | `1200` | `82` | `46` | `1600` | `1000 G` | Tidal wave sweep, floor geysers, whirlpool pull + Nyah dual-pounce stun. |
| **Spire** | `shadow_guard` | Eclipse Sentinel | `220` | `80` | `50` | `320` | `140 G` | Teleports and performs mirror-image dash slashes. |
| **FINAL BOSS** | `boss_eclipse` | **Shadow of the Eclipse** | `1800` | `96` | `55` | `5000` | `0 G` | 3-phase climax boss: radial dark orbs, mirror clones, twilight blackout phase. |

---

## 5. Multi-Wing Dungeon Layout Architecture (`36x32` Quadrant System)

To make `dungeon_mines`, `dungeon_crypts`, and `dungeon_shrine` (`36x32` tiles = `576x512` px) feel like expansive multi-room Falcom dungeons without loading extra map arrays, partition each `36x32` grid into **4 Quadrants** separated by 2-tile impassable chasm/wall dividers (`x = 17..18` and `y = 15..16`):

```
+-----------------------------------+-----------------------------------+
| QUADRANT B: PUZZLE & TREASURE WING| QUADRANT D: BOSS SANCTUM ARENA    |
| (x: 1..16, y: 1..14)              | (x: 19..34, y: 1..14)             |
| - Dungeon Weapon Chest            | - 16x13 Sealed Boss Chamber       |
| - Switch / Lever / Valve #2       | - Boss HP Bar Overlay             |
| - Secret Illusory Wall Alcove     | - Relic Pedestal at North Wall    |
+=+=+=+=+
| QUADRANT A: ENTRANCE FOYER        | QUADRANT C: GAUNTLET & SAVE ROOM  |
| (x: 1..16, y: 17..30)             | (x: 19..34, y: 17..30)            |
| - Exit Mat back to Coastal Plains | - Switch / Lever / Valve #1       |
| - Initial Monster Patrols         | - Glowing Blue Mana Save Crystal  |
| - Locked Shortcut Gate to Quad C  | - Boss Gate leading North to D    |
+-----------------------------------+-----------------------------------+
```

* **Wilderness Hub Entrances (`aldenor_coastal_plains`)**:
  - **West Cliffside (`x: 2, y: 8`)**: Timber Mine Entrance $\rightarrow$ `dungeon_mines`.
  - **East Graveyard Bluff (`x: 29, y: 9`)**: Iron Crypt Mausoleum $\rightarrow$ `dungeon_crypts`.
  - **South-Central Reef (`x: 16, y: 21`)**: Sunken Whirlpool Stairway (opens or allows passage anytime, recommended Lv 10+) $\rightarrow$ `dungeon_shrine`.
* **Northern Bell Tower Entrance (`aldenor_exterior`)**:
  - **North behind Grand Manor (`x: 24..25, y: 1`)**: Iron Sanctum Gate sealed by 3 resonance locks. Once the player holds `bell_tuning_fork`, `bell_clapper`, and `sanctum_crest`, interacting with the gate unseals the path into `bell_spire` (`20x28` vertical cliffside ascent)!

---

## 6. Complete Master Script: Cutscenes, Campfire Chats, Bosses & 5-Chapter Town Dialogue

### 6.1 Act I Opening: Arrival at Aldenor Pier & Meeting Nyah
* **Trigger**: Immediately after Card 5 of the Intro Cinema (`aldenor_exterior`, Harbor Pier `x: 384, y: 352`).
* **Guard Thorne (Approaching Adol at the dock)**:
  > *"Halt, traveler! Wait... that crimson hair and battered silver travel cloak... Could you be Adol Christin, the swordsman who sailed from Esteria?"*
  > *"Thank the heavens! Aldenor is in dire straits. Three nights ago, dark monsters shattered the Sacred Bell in the Northern Spire and stole its three relics—the Tuning Fork, the Clapper, and the Sanctum Crest."*
  > *"Since that night, our Lord has lain trapped in a cursed twilight slumber, and monsters have overrun the Old Quarry Mines, the Coastal Crypts, and the Sunken Shrine. Go speak with Elder Gared at the fountain—or Nyah up at the Grand Manor steps!"*

* **Nyah — First Meeting on the Grand Manor Steps (`nyahVisitedFirst === true`)**:
  - **Expression**: `smug` $\rightarrow$ `bratty` $\rightarrow$ `flustered`
  - **Dialogue**:
    > *"Well, well, well! Look who finally washed ashore and marched straight up to the Grand Manor before talking to anyone else in town! You've got good instincts, Master—nyah approves."*
    > *"Wait, why am I calling you Master already? B-Because you look like someone who desperately needs a smart, gorgeous catgirl telling him what to do so he doesn't walk off a cliff, obviously!!"*
    > *"Listen closely: the Lord is asleep inside under some creepy purple curse, and the monsters out past the South Gate stole the three relics of the Bell Tower. Take the Lord's **Silver Teacup**, have that elf apothecary Lumina brew me a proper cup of **Royal Jasmine-Catnip Tea**, and nyah will personally accompany you into battle!"*

* **Nyah — First Meeting if You Visited Lumina First (`elfVisitedFirst === true`)**:
  - **Expression**: `jealous` $\rightarrow$ `bratty` $\rightarrow$ `flustered`
  - **Dialogue**:
    > *"...Hold on. *Sniff, sniff.* Why do you smell like crushed moon-herbs and cheap elven perfume?! You went to see Lumina at the market BEFORE coming to see nyah?!"*
    > *"UNBELIEVABLE!! You literally just got off the boat and you're already chasing pointy-eared shopkeepers while nyah is up here guarding the entire Manor by herself! Give me that—nyah is confiscating your Cloak Pin until you learn some loyalty!"*
    > *"Hmph! If you want your pin back—and if you want nyah's elite twin-dagger backup out in the wilderness—go get the **Silver Teacup**, have Lumina brew me **Royal Jasmine-Catnip Tea**, and swear fealty to me properly!"*

* **Nyah — Delivering the Royal Jasmine-Catnip Tea (Party Join Scene)**:
  - **Branching Choices**:
    1. `"Present Jasmine-Catnip Tea & swear fealty"`
    2. `"Tease Nyah about her twitching ears"`
  - **On Choice 1 (`nextExpr: 'flustered'`)**:
    > *"O-Oh!! It's still steaming... and the jasmine-catnip aroma is actually perfect... *sip* ...Mmph!! Okay fine, you're forgiven, Master! Here's your Cloak Pin back—I polished it for you anyway."*
    > *"And forget this stupid broom! If we're going to break the Lord's curse and ring the Bell of Aldenor, nyah is coming with you every step of the way. I've got my twin silver daggers, I've got emergency healing herbs, and nobody gets to scratch my Master while I'm around! Let's go check out Goran's Forge or head out the South Gate!"*
  - **On Choice 2 (`nextExpr: 'bratty'`)**:
    > *"MY EARS ARE NOT TWITCHING!! It's the sea breeze, you absolute menace!! Give me that teacup before I scratch your shins! ...*sip* ...Ugh, why does it taste so good when you're being annoying?! Come on, I'm joining your party anyway—somebody has to keep you alive out there!"*

---

### 6.2 Campfire, Inn & Mana Crystal "Sit and Chat with Nyah" Vignettes
Interacting with any Bed (`manor_parlor`, `harbor_tavern`) or glowing blue **Mana Save Crystal** (placed outside every boss room) restores 100% HP, offers Manual Save (`[Slots 1-3]`), and displays the choice **`> Sit and Chat with Nyah`**. Select the dialogue based on current progress/cosmetics:

1. **Chat 1 — Early Adventure (Chapter 1, Coastal Plains / Town)**:
   - **Expression**: `normal` $\rightarrow$ `flustered`
   - **Dialogue**:
     > *"Hey, Master... let me see your sword arm for a second. No, don't pull away, I'm checking for crab pinches! Honestly, the way you just charge headfirst into monsters gives nyah a heart attack every ten seconds."*
     > *"Before the curse hit the Manor, things were so quiet here. Sometimes I'd sit on the roof at sunset watching ships pass by, wondering if anything exciting would ever happen... and then you showed up. ...H-Hey, why are you looking at me like that?! Drink your potion and go to sleep!!"*

2. **Chat 2 — Inside The Old Quarry Mines (`dungeon_mines`)**:
   - **Expression**: `bratty` $\rightarrow$ `normal`
   - **Dialogue**:
     > *"Ugh, look at this soot! Do you have any idea how long it takes nyah to brush coal dust out of my tail?! If anyone asks, this is a strategic stealth tint."*
     > *"Wait... listen to the rails, Master. When you hit those iron track switches with your blade, the minecarts can smash right through the wooden barricades in the lower tunnels. Stick close to me when the Rock Beetles charge—I'll flank them while you wind up a spin slash!"*

3. **Chat 3 — After Defeating the Obsidian Crusher (Chapter 2, Dual Spin Unlocked)**:
   - **Expression**: `smug` $\rightarrow$ `flustered`
   - **Dialogue**:
     > *"Did you SEE us back there against that giant rock golem, Master?! When you spun your blade and nyah spun right alongside you, we looked like an unstoppable hurricane! Try holding `[Z]` in the next fight—I've got the rhythm of your footwork memorized now."*
     > *"...You know, I used to think fighting for someone meant being ordered around. Back before I came to Aldenor, people always tried to tell me what to be. With you... nyah chooses to be here. Every single fight. ...Anyway! My feet are cold, scoot over!"*

4. **Chat 4 — Inside The Coastal Crypts (`dungeon_crypts`)**:
   - **Expression**: `flustered` $\rightarrow$ `bratty`
   - **Dialogue**:
     > *"I am NOT scared of ghosts, Master! My tail is only wrapped around your arm for tactical balance in the dark!! If you tell anyone in town that nyah jumped when that skeleton rattled, I will lock you inside a sarcophagus."*
     > *"Also, look closely at the eastern masonry near the blue braziers. Some of these crypt walls don't have mortar at the bottom—Bard Dennis said the old masons built illusory passages you can walk straight through!"*

5. **Chat 5 — After Defeating Lord Malakor (Chapter 3, Shadow Pounce Unlocked)**:
   - **Expression**: `normal` $\rightarrow$ `smug`
   - **Dialogue**:
     > *"Two relics down, one to go! And did you see how nyah vaulted right over those bone shields?! Whenever we run into those annoying shielded Skeleton Knights or Tritons, just engage them from the front and I'll leap right over their heads to stagger them from behind!"*
     > *"Look at the sky over the town, Master... the purple mist is actually starting to thin out. The Lord's breathing was steadier when we checked on him, too. We're really doing this."*

6. **Chat 6 — Inside The Sunken Shrine (`dungeon_shrine`)**:
   - **Expression**: `bratty` $\rightarrow$ `flustered`
   - **Dialogue**:
     > *"Water. An entire dungeon full of waist-deep seawater, electric jellyfish, and giant crabs. You brought a catgirl into a flooded underwater temple on purpose, didn't you?!"*
     > *"Listen up: those brass sluice valves control the water height across all four quadrants. Lower the water when we need to use the sunken stairs, and raise it when we need the wooden rafts to float across the deep chasms. And if my apron gets soaked, you're buying me ten tins of silver sardines at the tavern!"*

7. **Chat 7 — Before the Northern Bell Tower Spire (Chapter 4, Guardian's Devotion Unlocked)**:
   - **Expression**: `flustered` $\rightarrow$ `normal` (Quiet & Sincere)
   - **Dialogue**:
     > *"Master... wait a second before we climb the Spire stairs. Look how far down the harbor lanterns are from up here."*
     > *"Whatever is waiting at the top of that belfry is the thing that cursed the Lord and tried to swallow this whole island in the dark. If things get bad up there—even if you take a hit that should knock you down—nyah won't let you fall. I'll pour every drop of strength I have left into getting you back on your feet."*
     > *"Promise me one thing, okay? When the Bell rings and the sun comes up... don't just get back on that ship and vanish without saying goodbye. ...Come here. Give me your hand. Okay... let's go finish this."*

8. **Cosmetic Reaction — Equipping the `Crimson Ribbon`**:
   - **Expression**: `flustered` $\rightarrow$ `smug`
   - **Dialogue**:
     > *"Wait, you saved the Crimson Ribbon from the Mines chest for me?! Hold still, tie it in my hair for me... How does it look? Matches your red hair now, doesn't it, Master? Hehe, nobody's allowed to forget who nyah belongs with!"*

9. **Cosmetic Reaction — Equipping the `Silver Jingle Bell Collar`**:
   - **Expression**: `bratty` $\rightarrow$ `flustered`
   - **Dialogue**:
     > *"*Jingle, jingle.* ...Master. You bought me a silver bell collar from Lumina's shop. Are you trying to keep track of where I am in the dark, or do you just like making me blush?! ...I mean, the craftsmanship is really pretty, and the resonance makes my healing magic way stronger, so nyah is keeping it on! Don't get smug!!"*

10. **Cosmetic Reaction — Equipping the `Moonlight Cloak`**:
    - **Expression**: `smug`
    - **Dialogue**:
      > *"Whoa... feel how light this midnight-blue silk is! It shimmers like the stars over Esteria. Look at me, Master—nyah looks like a proper legendary phantom rogue now! Monsters won't even see my daggers coming."*

---

### 6.3 Dungeon Boss Intro & Defeat Scripts

#### Boss 1: Obsidian Crusher (The Old Quarry Mines)
* **Pre-Fight Cutscene (Entering Quadrant D)**:
  - *Screen rumbles (`cameraShake = 0.4s`); a massive `32x32` stone golem with a glowing violet core rises from the ore pit, holding the **Silver Bell Tuning Fork** embedded in its chest*.
  - **Nyah (`flustered`)**: *"WHOA!! Master, look at the size of that thing—the first relic is jammed right into its magma core! Watch the ceiling shadows when it jumps, and hit its core when it crashes into the cavern wall!"*
* **Post-Fight Cutscene**:
  - **Nyah (`smug`)**: *"BOOM!! Crushed the Crusher! We got the **Silver Bell Tuning Fork** and a gleaming **Silver Falchion**! Look how fast our footwork is together now—unlocked **[Perk: Dual Whirlwind Slash]**!"*

#### Boss 2: Lord Malakor, Skeletal Lich (The Coastal Crypts)
* **Pre-Fight Cutscene (Entering Quadrant D)**:
  - *Purple braziers flare; **Lord Malakor** materializes above the crypt throne, spinning the **Silver Bell Clapper** in a ring of necromantic bone shields*.
  - **Lord Malakor**: *"Foolish mortals... The Bell of Aldenor shall never chime again! The Eternal Twilight claims this isle, and your bones shall join my legion!"*
  - **Nyah (`bratty`)**: *"Keep your crusty bone hands to yourself, grandpa! Master, when he summons that spinning bone shield, watch for the gap after he teleports—I'll pounce in to break his focus!"*
* **Post-Fight Cutscene**:
  - **Nyah (`smug`)**: *"Take a nap in your coffin, bonehead! That's the **Silver Bell Clapper** and the **Flame Edge** secured! Plus, nyah figured out how to vault right over enemy shields—unlocked **[Perk: Shadow Pounce]**!"*

#### Boss 3: Charybdis Queen, Abyssal Leviathan (The Sunken Shrine)
* **Pre-Fight Cutscene (Entering Quadrant D)**:
  - *The central pool erupts into a roaring whirlpool as the **Charybdis Queen** rears her armored serpent head, the **Sacred Sanctum Crest** glinting upon her crown*.
  - **Nyah (`flustered`)**: *"OKAY THAT IS A VERY BIG SEA DRAGON. Watch the floor grates when the water bubbles, Master—and when the whirlpool pulls us in, wait for me to leap at her head to stagger her so you can unleash **Clerici's Sacred Blade**!"*
* **Post-Fight Cutscene**:
  - **Nyah (`normal`)**: *"We got all three relics!! The **Tuning Fork**, the **Clapper**, and the **Sacred Sanctum Crest**! Master, we can finally open the sealed gate behind the Grand Manor and climb the **Northern Bell Tower Spire**! No matter what happens up there, nyah has your back—unlocked **[Perk: Guardian's Devotion]**!"*

#### Final Boss: The Shadow of the Eclipse (Northern Bell Tower Spire)
* **Pre-Fight Cutscene (Top of `bell_spire`)**:
  - *At the summit belfry, the silent Great Bell hangs shrouded in black lightning. The miasma condenses into a winged entity of living night—**The Shadow of the Eclipse***.
  - **The Shadow of the Eclipse**: *"Three hundred years I slumbered beneath the chime of bronze and silver... Your fragile dawn is over, Swordsman. Drown in the endless dark!"*
  - **Nyah (`bratty` $\rightarrow$ `normal`)**: *"Not while nyah and Master are standing here!! You messed with my Manor, you put the Lord to sleep, and you ruined our tea time! Master—let's ring that Bell right in its face!!"*
* **Mid-Fight `Guardian's Devotion` Trigger (If `hero.hp` hits `0`)**:
  - **Nyah (`flustered`)**: *"DON'T YOU DARE DIE ON NYAH, MASTER!! Get up—my heart only beats if you're standing beside me!!"* (`+50% HP Restored!`)

---

### 6.4 Complete 5-Chapter Town NPC Dialogue & Shop Scripts

#### 1. Goran the Blacksmith (`goran_forge` — Northwest Town Forge)
* **Shop Menu Options**:
  - `Buy Iron Broadsword (+18 ATK) — 120 G`
  - `Buy Studded Leather (+6 DEF) — 80 G`
  - `Buy Wood Buckler (+2 DEF) — 50 G`
  - `Temper Weapon with Triton Scale (+8 Bonus ATK) — 200 G + Triton Scale`
* **Chapter 1**: *"Welcome to the forge, lad! My hammers haven't stopped ringing since the monsters crept out of the Old Quarry. Don't go into those mines with a rusty blade—pick up an **Iron Broadsword** and a **Wood Buckler** first!"*
* **Chapter 2 (Mines Cleared)**: *"By the ancestors, is that the **Silver Falchion** from the deep quarry vault?! And Nyah's fighting right beside you? Hah! Never thought I'd see the Manor maid slicing up goblins!"*
* **Chapter 3 (Crypts Cleared)**: *"That **Flame Edge** carries ancient volcanic steel in its core. Bring me a **Triton Scale** from the Tavern Bounty Board and `200 G`, and I'll temper your blade's edge even sharper!"*
* **Chapter 4 (Shrine Cleared)**: *"The **Sacred Blade of Clerici**... I only heard of it in my grandfather's tales. Keep your health near full, Adol, and that sword will fire beams of pure starlight!"*
* **Chapter 5 (Post-Game)**: *"The Bell's chime cracked the rust right off my anvil! Greatest smithy in Esteria, at your service!"*

#### 2. Lumina the Elven Apothecary (`aldenor_exterior` Stall by Day / `lumina_workshop` by Night)
* **Shop Menu Options**:
  - `Buy Healing Potion (+80 HP) — 35 G`
  - `Buy Antidote Salve (Cures Slow/Poison) — 25 G`
  - `Buy High-Grade Elixir (+200 HP) — 90 G`
  - `Buy Silver Jingle Bell Collar (Nyah Accessory: +15% Heal) — 180 G`
  - `Brew Royal Jasmine-Catnip Tea (Requires Silver Teacup) — Free (Quest)`
* **Chapter 1**: *"May the silver stars guide you, Adol. The twilight miasma from the Bell Tower is withering the coastal herbs. If Nyah is giving you an attitude on the Manor steps, bring me the **Silver Teacup** and I'll blend my finest **Jasmine-Catnip Tea**—she can never resist it."* *(Nyah interjection if in party: "I CAN HEAR YOU, POINTY-EARS!!")*
* **Chapter 2**: *"You cleared the Quarry Mines! The mountain spring water is running clear again. Have you seen this **Silver Jingle Bell Collar** (`180 G`)? It's enchanted to amplify companion healing magic—though Nyah might get flustered if you put it on her."*
* **Chapter 3**: *"The Coastal Crypts hold venomous spiders. Stock up on **Antidote Salves** (`25 G`) and assign them to your `[1]`–`[3]` quick-keys in the `[I]` menu so you can drink them mid-battle!"*
* **Chapter 4**: *"All three relics are in your hands... Take an extra **High-Grade Elixir** before climbing the Spire. And take care of Nyah—she pretends to be bratty, but she looks at you like you're her whole world."*
* **Chapter 5**: *"Look how bright the morning dew is! Come by for free jasmine tea whenever you and Nyah please!"*

#### 3. Elder Gared (`aldenor_exterior` Fountain Plaza by Day / `harbor_tavern` by Night)
* **Chapter 1 (Secret Hint)**: *"Ah, Adol! Listen closely to an old man's memory: when the miners built the **Old Quarry**, they hid the **Crimson Ribbon** and the **Silver Breastplate** behind a false shale wall just north of the second track switch!"*
* **Chapter 2**: *"The ground tremors have stopped! The **Obsidian Crusher** is no more! Next lies the **Coastal Crypts** to the east of the plains—pull all three skull levers to raise the iron portcullis."*
* **Chapter 3**: *"Lord Malakor is vanquished! Only the **Sunken Shrine** on the southern reef remains."*
* **Chapter 4**: *"Take the three relics to the iron gate behind the Grand Manor. The path up the **Northern Bell Tower Spire** awaits!"*
* **Chapter 5**: *"Our Lord is awake and the curse is broken! Aldenor will sing of Adol and Nyah for three hundred years more!"*

#### 4. Guard Thorne (`aldenor_exterior` South Gate & Tavern Entrance)
* **Chapter 1**: *"Watch yourself past the South Gate, Adol! Check the **Bounty Board** outside the Harbor Tavern—the town council is paying cold hard gold and EXP for clearing out Slimes, Bats, Skeletons, and Armored Crabs!"*
* **Chapters 2–5**: Reacts to each boss victory and salutes Adol and Nyah at the gate.

#### 5. Lyla the Village Girl & The Stray Kitten Side Quest (`aldenor_exterior` East Path)
* **Quest Trigger (Chapter 1–4, `!flags.kittenRescued`)**:
  > *"Sniffle... Mister Swordsman! Miss Nyah! My little white kitten **Mochi** got scared by a slime and ran out through the South Gate toward the western pine grove in the Coastal Plains! Can you bring him back, please?"*
  - **Nyah (`flustered`)**: *"A lost kitten?! MASTER, DROP EVERYTHING, WE ARE RESCUING THAT KITTEN RIGHT NOW."*
* **Resolution (Interact with `kitten_mochi` at `aldenor_coastal_plains` `x: 72, y: 160` and return to Lyla)**:
  > *"Mochi!! You found him!! Thank you so much! Here, I found this shiny **Starlight Shard** (`+15 Max HP Permanent Boost` + `100 G`) by the fountain—please take it!"*

#### 6. Tavern Night Crowd (`harbor_tavern`)
* **Barkeep Orson**: Pays out completed **Bounty Board** hunts (`60 G` / `140 G` / `250 G` / `400 G + Triton Scale`), sells **Harbor Malt (`20 G`, restores 50 HP)**, and gossips about dungeon Weak Points.
* **Bard Dennis (Singing Minstrel + Quest)**:
  - Gives the Crypt secret hint: *"When the purple flames turn blue in the eastern crypt hall, walk straight through the stone wall between the pillars to claim the **Flame Edge**!"*
  - **Reward**: Speaking to Dennis after clearing the Crypts inspires his new ballad and rewards Adol with the **Ring of Melody** (`+2 HP regen every 3s while moving`)!
* **Old Sailor Pete (Lost Locket Quest)**:
  - *"Arrgh! One of those giant Shore Crabs on the southern beach snapped my **Brass Compass Locket** right off my belt! Slay the crabs on the beach to get it back, and I'll give ye my lucky **Sea Charm** (`DEF +6`, immunity to Crypt Spider slow & water hazards)!"*
* **Mercenary Jack**:
  - *"Want a pro combat tip, Red? Hold down `[Z]` for half a second until your blade flashes gold, then let go for a 360-degree **Whirlwind Spin Slash**! It hits armored beetles and skeletons right through their guard!"*

---

### 6.5 Act V Finale: Ringing the Bell & The Dawn Epilogue Cutscene

* **Trigger**: Defeating `boss_eclipse` (**The Shadow of the Eclipse**) at the summit of `bell_spire`.
* **Sequence**:
  1. The Shadow dissolves in a cascade of white and gold pixel sparks; the storm clouds part into a brilliant HuC6260 sunrise gradient (`vceColor(7,5,2)` gold, `vceColor(7,3,4)` rose, `vceColor(3,5,7)` azure).
  2. Adol and Nyah step up to the Great Bronze Bell (`x: 160, y: 64`). The **Tuning Fork**, **Clapper**, and **Sanctum Crest** lock into place with a resonant HuC6280 chime (`playSfxBellTolling()` — rich 6-channel harmonic chord with long exponential decay).
  3. **Cut to `manor_parlor`**: The Lord of Aldenor opens his eyes as the purple curse crystals shatter into golden dust; Elder Gared, Lumina, and Goran cheer in the courtyard.
  4. **Cut to the Cliffside Overlook (`bell_spire` Balcony at Dawn)** — `bgm_victory` (**"Restoration: Dawn Over Aldenor"**, 100 BPM romantic Falcom arrangement) plays:
     - **Nyah (`normal` $\rightarrow$ `flustered`, standing beside Adol looking out over the sparkling sea, her tail gently curling around his wrist)**:
       > *"Listen to that echo, Master... You can hear the Bell all the way out past the harbor lighthouse. The curse is really gone. The Lord is awake, the town is safe... and it's all because you didn't give up on us."*
       > *"...Hey. Don't think this means your contract with nyah is finished! You still owe me at least a hundred more tea parties, and somebody has to make sure you don't get pinched by crabs on your next voyage."*
       > *"Wherever you go next—whether it's around Aldenor or across the whole Sea of Esteria—nyah is staying right here by your side. Got it, Master? Good. ...Now hold still, the wind messed up your hair again."*
  5. Display **VICTORY & POST-GAME UNLOCKED** banner (`flags.gameCompleted = true`, auto-saved to `localStorage`), returning the player to `aldenor_exterior` in sunlit Chapter 5 free-roam mode with all dungeons, shops, and Nyah's full perks unlocked!

---

## 7. Retro Status Menu (`[I]` / `[Tab]`), Quick-Keys & Save Schema

### 7.1 Interactive 2-Pane Status, Bag, Quest & Save Overlay
Pressing `[I]` or `[Tab]` pauses combat and draws a crisp PC-Engine 9-bit interface on `#gameCanvas`:
* **Left Pane**: Adol's Level, HP, EXP/NextEXP, Total STR/DEF breakdown, Equipped `[WPN]`, `[ARM]`, `[SHD]`, `[ACC]`, and Nyah's Active Perks + Cosmetic Accessory selector (`[C]` to cycle unlocked Nyah cosmetics).
* **Right Pane (Toggled via `[Left]`/`[Right]` or `[Q]`)**:
  - **Tab 1: BAG & GEAR**: Use consumables (`Space`), equip found weapons/armor/rings, or press `[1]`, `[2]`, `[3]` to bind any potion/tea to the real-time HUD Quick-Slots.
  - **Tab 2: QUEST LOG & BOUNTIES**: Live tracker for the 4 Main Story Relics, the 4 Tavern Bounties (`kills / target`), Lyla's Lost Kitten, and Pete's Compass Locket.
  - **Tab 3: SAVE / LOAD (`localStorage: 'aldenor_save_v4'`)**: 3 Manual Save Slots + Auto-Save slot showing Level, Current Map, and Timestamp.

---

## 8. Final Implementation & Verification Checklist

1. [ ] **Zero Truncation & Single-File Integrity**: Deliver the complete `index.html` with all 10 maps (`aldenor_exterior`, `manor_parlor`, `lumina_workshop`, `harbor_tavern`, `goran_forge`, `aldenor_coastal_plains`, `dungeon_mines`, `dungeon_crypts`, `dungeon_shrine`, `bell_spire`) and zero `// TODO` placeholders.
2. [ ] **PCE Hardware Compliance**: 100% `vceColor`/`vceRgba` palette compliance, pure hex-matrix sprites/tiles/portraits, and 6-channel HuC6280 PSG audio driving `vuMeters[0..6]`.
3. [ ] **Layered 5-Card Cinema Intro**: Plays on launch with `bgm_overture`, `[Space]` advance, and `[Esc]`/`[S]` skip to Aldenor Pier.
4. [ ] **Nyah Companion AI & Non-Blocking Swap**: Verify Nyah joins via Jasmine Tea or South Gate ambush, follows via `trailBuffer`, swaps cleanly in 1-tile corridors without blocking Adol, attacks with `nyahClaw0/1`, auto-heals at `<28%` HP, and unlocks Dual Spin, Shadow Pounce, and Guardian's Devotion.
5. [ ] **Balanced Combat & 4 Boss Encounters**: Verify the updated damage formula prevents `1 damage` softlocks, Hold-`[Z]` executes Whirlwind Spin Slash, Clerici's Blade fires sword beams at `>=90%` HP, and all 4 bosses display a top/bottom Boss HP bar and drop their respective Bell Relics.
