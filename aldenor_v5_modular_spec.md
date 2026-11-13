# PROJECT NYAH: THE BELL OF ALDENOR — V5 MASTER IMPLEMENTATION SPEC (FOR GEMINI 3.8 FLASH)

## CRITICAL WORKSPACE & ARCHITECTURE STATUS (READ FIRST!)
The project in `g:\Codex stuff\Games\Retronyah\` has ALREADY been pre-split into the **Option A Modular Multi-File Architecture** and all high-resolution VCE-quantized pixel art has ALREADY been pre-compiled into `js/00_v5_assets_bundle.js`, `js/02_art_sprites.js`, and `js/03_art_portraits.js`!

### Files in `g:\Codex stuff\Games\Retronyah\`:
1. **`index.html`** — Loads `js/00_v5_assets_bundle.js` through `js/06_engine_and_ui.js` via standard `<script src="...">` tags (`file://` compatible, no ES modules).
2. **`js/00_v5_assets_bundle.js` (DO NOT MODIFY — ALREADY COMPLETE!)** — Contains synchronous pre-compiled VCE 9-bit RGBA canvases (`window.getV5Canvas(key)`) for:
   - **64×64 Anime Portraits:** `portrait_nyah`, `portrait_fifi`, `portrait_fifi_tea`, `portrait_lumina`, `portrait_elder`, `portrait_guard`, `portrait_child`
   - **22×26 Tall Chibi Overworld Sprites:** `chibi_heroDown0..2`, `chibi_heroUp0..2`, `chibi_nyahDown0..2`, `chibi_nyahUp0..2`, `chibi_fifiDown0..2`, `chibi_fifiUp0..2`, `chibi_luminaDown0..2`, `chibi_elderDown0..2`, `chibi_guardDown0..2`, `chibi_childDown0..2`, `chibi_bardDown0..2`
   - **48×48 Giant Menacing Boss Sprites:** `boss_golem0..1`, `boss_lich0..1`, `boss_leviathan0..1`, `boss_eclipse0..1`
   - **144×88 PC-98 / PC-Engine Manor Futon Event CGs:** `cg_nyah_futon`, `cg_fifi_futon`, `cg_fifi_blush`
3. **`js/02_art_sprites.js` & `js/03_art_portraits.js` (ALREADY WIRED TO V5 ASSETS!)** — `renderNyahPortrait`, `renderFifiPortrait`, `renderLuminaPortrait`, `renderNpcPortrait`, and `renderEventCg(cgId)` are already implemented in `js/03_art_portraits.js`, and `buildTileAtlases()` in `js/02_art_sprites.js` already registers all `22×26` chibi sprites, `48×48` bosses, `fifiBolt`, softened Midday palettes, and the 4 distinct dungeon palettes (`minesDungeonPal`, `cryptsDungeonPal`, `shrineDungeonPal`, `spireDungeonPal`).

Your job is to execute **Steps 1 through 5** below across `index.html`, `js/01_config_and_audio.js`, `js/02_art_sprites.js`, `js/04_maps_and_dungeons.js`, `js/05_story_and_banter.js`, and `js/06_engine_and_ui.js`.

---

## STEP 1: `index.html` & `js/01_config_and_audio.js`
### 1.1 Rename "Project Ys" to "Project Nyah", Add WebGL Overlay Canvas & Safe-Area Mobile Controls (`index.html`)
1. Change `<title>` and header text in `index.html` from `Project Ys` to **`PROJECT NYAH: THE BELL OF ALDENOR`**.
2. Inside `#viewport` right after `<canvas id="gameCanvas" width="256" height="224"></canvas>`, add the WebGL lighting/glow overlay canvas:
   ```html
   <canvas id="glLightCanvas" width="256" height="224" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;"></canvas>
   ```
3. In `#mobile-controls` CSS, ensure controls are never cut off on phones (`bottom: max(12px, env(safe-area-inset-bottom, 12px)); padding: 0 14px; box-sizing: border-box;`) and add a `[C] SPELL` button (`data-key="KeyC"`) and `[E] TALK` button (`data-key="KeyE"`).

### 1.2 Add Missing `'²'` and `'♥'` Glyphs to `FONT_GLYPHS` (`js/01_config_and_audio.js`)
In `FONT_GLYPHS` (around line 1060 of `js/01_config_and_audio.js`), add:
```javascript
  '²': [0x0e, 0x01, 0x06, 0x08, 0x0f, 0x00, 0x00],
  '♥': [0x00, 0x0a, 0x1f, 0x1f, 0x0e, 0x04, 0x00],
```
so `"A PC-Engine CD-ROM² Adventure"` renders `'²'` instead of `'?'`!

### 1.3 Slow Intro Music to Stately `92 BPM` (`js/01_config_and_audio.js`)
In `buildSequencer()`:
- When `currentTrackName === 'intro_overture'`, set `curBpm = 92` (instead of `132`) so the intro prologue music is majestic and unhurried, and skip the every-step hi-hat noise (`if (currentTrackName !== 'intro_overture' || step % 8 === 0)`).

### 1.4 Undertale / Deltarune Per-Character Talking Voice Blips (`js/01_config_and_audio.js`)
Add `playVoiceBlip(speakerId = 'nyah', expr = 'normal', charCode = 65)` in `js/01_config_and_audio.js` and call it from the dialogue typewriter crawl (`updateDialogue`, `updateIntroCinema`, `updateEpilogueCinema`):
```javascript
  function playVoiceBlip(speakerId = 'nyah', expr = 'normal', charCode = 65) {
    if (isMuted || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const pitchJitter = ((charCode * 17) % 50) - 25;

    let baseFreq = 480;
    let endFreq = 510;
    let waveType = 'triangle';
    let dur = 0.045;
    let vol = 0.065;

    const id = (speakerId || '').toLowerCase();
    if (id.includes('nyah')) {
      // Nyah: Sassy, bright, catty upward chirp (higher & faster when jealous/bratty/flustered)
      waveType = (expr === 'jealous' || expr === 'bratty') ? 'square' : 'triangle';
      baseFreq = (expr === 'flustered' || expr === 'shocked') ? 620 : 540;
      endFreq = baseFreq + 85 + pitchJitter;
      dur = 0.042;
      vol = 0.06;
    } else if (id.includes('fifi')) {
      // Fifi: Soft, gentle, bashful flute-like sine/triangle voice with shy downward lilt
      waveType = 'sine';
      baseFreq = (expr === 'panicked' || expr === 'flustered') ? 560 : 430;
      endFreq = baseFreq - 35 + pitchJitter * 0.6;
      dur = 0.052;
      vol = 0.075;
    } else if (id.includes('lumina')) {
      // Lumina: Melodic, warm bell-like mezzo lilt
      waveType = 'sine';
      baseFreq = 475 + pitchJitter;
      endFreq = baseFreq + 45;
      dur = 0.05;
    } else if (id.includes('elder') || id.includes('gared')) {
      // Elder Gared: Deep, warm Undertale Asgore/Gerson low baritone square blip
      waveType = 'sawtooth';
      baseFreq = 165 + (pitchJitter * 0.4);
      endFreq = 152;
      dur = 0.055;
      vol = 0.045;
    } else if (id.includes('guard') || id.includes('goran')) {
      // Guard Goran: Sturdy, brassy mid-low square bark
      waveType = 'square';
      baseFreq = 235 + (pitchJitter * 0.5);
      endFreq = 250;
      dur = 0.04;
      vol = 0.045;
    } else if (id.includes('child') || id.includes('lyla')) {
      // Child Lyla: High, bubbly music-box chirp
      waveType = 'triangle';
      baseFreq = 690 + pitchJitter;
      endFreq = 750;
      dur = 0.038;
    } else if (id.includes('gull')) {
      waveType = 'sawtooth';
      baseFreq = 880;
      endFreq = 620;
      dur = 0.06;
    } else {
      // Narrator / Notice
      waveType = 'triangle';
      baseFreq = 360 + (pitchJitter * 0.4);
      endFreq = 360;
      dur = 0.035;
    }

    osc.type = waveType;
    osc.frequency.setValueAtTime(Math.max(80, baseFreq), now);
    osc.frequency.linearRampToValueAtTime(Math.max(80, endFreq), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.005);
  }
```

---

## STEP 2: `js/02_art_sprites.js` — Animated Flowers (#25) & Cracked Secret Wall (#9)
In `TILE_HEX` (`js/02_art_sprites.js`):
1. Add `flowers1` and `flowers2` (wind-swayed variants of `flowers` where petal clusters shift 1px right/left) and register `'flowers1'` and `'flowers2'` in `tileDefs` inside `buildTileAtlases()`.
2. Add `crackedWall` (a brick wall tile with a dark jagged crack down the middle) and register `'crackedWall'` in `tileDefs` so the secret passage at `(14, 3)` in `dungeon_mines` looks like an intentional secret cracked wall rather than a broken floor tile!
3. Add dungeon-specific floor & wall tile variants in `tileDefs`:
   - `minesFloor`, `minesWall` (using `PAL_MAP.minesDungeonPal`)
   - `cryptsFloor`, `cryptsWall` (using `PAL_MAP.cryptsDungeonPal`)
   - `shrineFloor`, `shrineWall` (using `PAL_MAP.shrineDungeonPal`)
   - `spireFloor`, `spireWall` (using `PAL_MAP.spireDungeonPal`)

---

## STEP 3: `js/04_maps_and_dungeons.js` — Fountain Centering (#12), Doors (#23), Playable Grand Manor (#24, #27), Dungeon Exits (#7), Dungeon Walls (#9), & Distinct Dungeon Themes (#29)

### 3.1 Center the Town Fountain on a 7×7 Golden Plaza (#12)
In `buildAldenorExteriorMap()` (`js/04_maps_and_dungeons.js`):
- Change the plaza loop from `px = 13..18, py = 10..15` (6×6, which left 1 tile on the left and 2 tiles on the right of the 3×3 fountain!) to **`px = 12; px <= 18`** and **`py = 10; py <= 16`** (`7×7` tiles).
- Keep the 3×3 fountain at `fx = 14..16, fy = 12..14` so there is an exact **2-tile golden plaza border on all 4 sides**!

### 3.2 Add Playable `grand_manor_interior` Map (#24, #27) & Improve Town Interiors
In `buildAllMaps()` (`js/04_maps_and_dungeons.js`):
- Create `mapRegistry['grand_manor_interior'] = buildGrandManorInteriorMap()` (`16×14` indoor map):
  - Royal crimson carpet runner up the center (`x = 7..8, y = 3..12`).
  - **The Cursed Sleeping Lord of Aldenor** on a grand canopy bed at `(7..8, 2..3)` (surrounded by glowing purple curse crystals until Chapter 5!).
  - **Maid Quarters (Left Wing):**
    - **Nyah's Futon (`x = 2..3, y = 4`)** — interacting triggers Nyah's `144×88` PC-Engine Futon Event CG (`cg_nyah_futon`)!
    - **Fifi's Futon (`x = 2..3, y = 7`)** — interacting triggers Fifi's `144×88` Sleeping/Blushing Futon Event CG (`cg_fifi_futon` / `cg_fifi_blush`)!
    - **Maid Tea Parlor Table (`x = 4, y = 9`)**
  - **Lord's Study (Right Wing):**
    - **Royal Bookshelves (`x = 11..13, y = 2`)**
    - **Grand Manor Chest (`x = 13, y = 5`)** containing `150G` and `Maid's Starlight Ribbon (+5 DEF, +10 MAX HP)`!
  - Exit mat at `(7..8, 12..13)` returning to `aldenor_exterior` at `(15 * 16, 5 * 16 + 8)`.

### 3.3 Fix Dungeon Walls, Passable Portcullis Gates (#9), & Distinct Dungeon Themes (#29)
In `buildDungeonMinesMap()`, `buildDungeonCryptsMap()`, `buildDungeonShrineMap()`, and `buildDungeonSpireMap()`:
1. **Use Distinct Visual Tiles (#29):**
   - `dungeon_mines`: floor `'minesFloor'`, walls `'minesWall'` (warm rust-amber cavern rock).
   - `dungeon_crypts`: floor `'cryptsFloor'`, walls `'cryptsWall'` (violet-indigo necropolis marble).
   - `dungeon_shrine`: floor `'shrineFloor'`, walls `'shrineWall'` (sunken sea-emerald coral).
   - `dungeon_spire`: floor `'spireFloor'`, walls `'spireWall'` (obsidian & gold astral sanctum).
2. **Fix Passable Wall Gaps Next to Locked Portcullis Gates (#9):**
   - In the horizontal divider wall (`y = 15..16`), change the right passage from `x >= 25 && x <= 27` (3 tiles wide, which left `x = 25` open!) to **`x >= 26 && x <= 27` (2 tiles wide)**.
   - Place the locked `'portcullis'` across **BOTH `y = 15` and `y = 16` at `x = 26..27` with `solid = 1`** (`setMapTile(m, x, y, floorTile, 'portcullis', null, 1)`), and only set `solid = 0` when the dungeon's puzzle (`minesCartCleared` / `cryptsBraziersLit` / `shrineWaterDrained`) is solved!
   - At `(14, 3)` in `dungeon_mines`, set `mid = 'crackedWall'` so the illusory wall has a visible crack decal.

---

## STEP 4: `js/05_story_and_banter.js` — Fifi Companion, "The Rival Maid Trial", Nyah Claiming "Master", Hints, Lumina Day/Night Banter, & Inspectable Furniture (#8, #11, #13, #16–#21, #26, #28)

### 4.1 Fix Elder Gared Overlapping the Bard in the Tavern at Twilight (#26)
In `updateNpcSchedules()` (`js/05_story_and_banter.js`):
- At Twilight, `elder` was placed in `harbor_tavern` at `x = 10 * 16 (160), y = 2 * 16 + 8 (40)`, directly overlapping `bard` at `(160, 48)`.
- Change `elder`'s Twilight tavern coordinates to **`x = 7 * 16 (112), y = 6 * 16 (96)`** (sitting warmly beside the hearth fire!).

### 4.2 Add `fifiCompanion` Entity & Starting Flags (#16–#20)
1. In `flags`:
   - `fifiRecruited: true` (Adol arrives at Aldenor Pier ALREADY accompanied by his loyal, bashful doggirl magician maid **Fifi**, who calls him `"Master"` from the start!).
   - `nyahRecruited: false`, `nyahCallsMaster: false`, `rivalMaidTrialStep: 0`, `southGateSlimesCleared: 0`, `nyahInFrontSlot: false`.
2. Add `fifiCompanion`:
   ```javascript
   const fifiCompanion = {
     id: 'fifi',
     name: 'FIFI',
     x: 384,
     y: 368,
     dir: 1,
     walkTimer: 0,
     walkFrame: 0,
     castTimer: 0,
     healTimer: 0,
     scaleX: 1,
     scaleY: 1,
     hopY: 0
   };
   window.fifiCompanion = fifiCompanion;
   ```

### 4.3 "The Rival Maid Trial" Recruitment Quest & Nyah Claiming the Title "Master" (#11, #17, #18, #24)
Remove the old automatic Nyah recruitment at the South Gate (`if (!flags.nyahRecruited && hero.y >= 416)`). Instead, implement the 3-step **Rival Maid Trial**:
- **Step 1 (`rivalMaidTrialStep === 0` — First meeting Nyah at the Grand Manor Gate `(240, 88)` with Fifi):**
  - Nyah does NOT know Adol yet! She calls him `"red-haired tourist"` / `"stranger"`:
    - `NYAH (bratty)`: `"Halt right there, red-haired tourist! The Grand Manor is under lockdown! The Lord of Aldenor is trapped in a cursed slumber and nyah isn't letting suspicious strangers past this gate!"`
    - `FIFI (bashful)`: `"U-um, excuse me, Miss Catgirl! Please don't bristle your tail... My Master and I just docked at the pier, and Master only wanted to ask how we can help—"`
    - `NYAH (shocked)`: `"WAIT A SECOND. Hold everything. Did this floppy-eared puppy maid just call you 'MASTER'?! Excuse me?! You just stroll into MY town with your own personal doggirl maid calling you Master?!"`
    - `FIFI (panicked)`: `"E-eep! I'm sorry, Master, she's glaring at my ears!"`
    - `NYAH (jealous)`: `"Hmph!! Look at her hiding behind your cape! Listen up, tourist: if you want nyah to trust you two—or let you inspect the Manor—you have to pass **THE RIVAL MAID TRIAL**! Part 1: prove you know how to treat a real guardian maid by bringing nyah a steaming cup of **Hot Jasmine Tea**! Guard Goran by the plaza fountain knows where the Manor's silver teacup went!"` (`flags.rivalMaidTrialStep = 1`).
- **Step 2 (`rivalMaidTrialStep === 1` + Delivering `jasmine_tea` to Nyah):**
  - `NYAH (flustered)`: `"Sniff... wait, this is actually Lumina's top-shelf jasmine tea?! A-and you even polished the silver teacup?! ...Okay FINE, maybe you two aren't completely useless. Nyah unlocked the **Grand Manor Front Door** right behind me so you can see the Lord's curse—and our Maid Quarters—for yourself! Now meet nyah down at the **South Gate** for Part 2 of your trial: the Combat Test!"`
  - Set `flags.manorUnlocked = true`, `flags.rivalMaidTrialStep = 2`, and move Nyah's town NPC position to `(224, 412)` by the South Gate!
- **Step 3 (`rivalMaidTrialStep === 2` — South Gate Tutorial & Nyah Claiming "Master"):**
  - When stepping out to `aldenor_coastal_plains` (or talking to Nyah at the South Gate and defeating 3 Coastal Slimes while Fifi assists with her ranged Starlight Bolts!), trigger Nyah's recruitment scene:
    - `NYAH (shocked)`: `"Okay wait wait WAIT... you cleared those slimes like it was nothing?! And floppy-ears can shoot homing starlight magic from her hands?!"`
    - `FIFI (happy)`: `"I-I did my best for Master! Did you see my Starlight Bolt, Master?"`
    - `NYAH (jealous)`: `"HEY! Stop wagging your fluffy tail at him like that!! That settles it—nyah CANNOT leave an overly nice guy like you alone with only a bashful puppy maid! You'd get pinched by crabs in five minutes without nyah's claws!"`
    - `NYAH (flustered)`: `"AND ANOTHER THING! If she gets to call you Master, then nyah is calling you **Master** too! In fact, nyah is your NUMBER ONE maid now, got it, **Master**?! Move over, floppy-ears—nyah walks in the front spot!!"`
  - Set `flags.nyahRecruited = true`, `flags.nyahCallsMaster = true`, `flags.rivalMaidTrialStep = 3`, `flags.nyahInFrontSlot = true`, and add Nyah to the 3-person party train!

### 4.4 Universal Hint System on Both Fifi & Nyah (`getQuestHint(speaker)`) (#8, #19)
Add `getQuestStage()` (`0..11`) and a top dialogue choice **`"💡 Ask for a Hint (What next?)"`** whenever talking to **Fifi** or **Nyah**:
- Stage 0: Meet Nyah at the Grand Manor Gate in northern Aldenor.
- Stage 1: Talk to Guard Goran by the fountain -> chase the Seagull on the southern pier 3 times for Goran's Sandwich -> trade Sandwich to Goran for the Silver Teacup -> have Lumina at the eastern Apothecary brew Hot Jasmine Tea -> bring Tea to Nyah at the Manor Gate.
- Stage 2: Inspect the newly unlocked **Grand Manor Interior** (and Nyah & Fifi's Maid Quarters!), then head to the **South Gate** and defeat 3 Coastal Slimes in the Coastal Plains to finish Nyah's Rival Maid Trial.
- Stage 3: Rescue Lyla's lost kitten **Mochi** in the eastern Coastal Plains and return Mochi to Lyla in town for `+15 Permanent Max HP & +100G`.
- Stage 4: Enter the **Western Abandoned Mines** (`(2, 8)` in Coastal Plains), flip the Minecart Track Switch & Skull Lever, and defeat the giant 48×48 **Obsidian Crusher** for the **Bronze Tuning Fork**.
- Stage 5: Speak to Elder Gared to advance to **Twilight**, then enter the **Eastern Sunken Crypts** (`(29, 9)` in Coastal Plains), light the 3 Blue Braziers, and defeat **Arch-Lich Malakor** for the **Resonant Clapper**.
- Stage 6: Enter the **Southern Coastal Shrine** (`(16, 21)` in Coastal Plains), turn the 2 Sluice Valves to drain the water, and defeat the **Tidal Leviathan** for the **Sanctum Crest**.
- Stage 7: Ascend the **Sacred Bell Spire** (Northwest Town `(3, 2)`), defeat the **Shadow of the Eclipse**, and ring the restored Bell of Aldenor!
For every stage, **Fifi** gives a sweet, polite, crystal-clear directional hint and **Nyah** chimes in with a bratty, possessive remark!

### 4.5 Multi-Speaker Lumina × Nyah × Fifi Banter (Day vs. Night) (#13) & 16 Inspectable Furniture Objects (#27, #28)
1. Support per-line `speaker`, `portraitId` (`'nyah'`, `'fifi'`, `'lumina'`, `'elder'`, `'guard'`, `'child'`), `expr`, and optional `cgId` (`'nyah_futon'`, `'fifi_futon'`, `'fifi_blush'`) on each entry of `dialogueState.lines[]` so multi-speaker cut-in conversations seamlessly switch portraits and voice blips on every line!
2. In `getDialogueTree('lumina')`, add a choice **`"✦ Maid Trio Banter"`** (and auto-trigger on first visit with Nyah & Fifi) with **two distinct scripts**:
   - **Daytime (`!flags.isTwilight`):** Lumina praises Fifi's polite manners and teases Nyah about being a jealous stray cat; Nyah threatens to knock over her potion jars while Fifi tries to calm her down.
   - **Night/Twilight (`flags.isTwilight`):** Lumina teases Adol, Nyah, and Fifi about buying late-night stamina tonics and asks which maid gets to keep Master warm in his tent tonight—sending both Fifi and Nyah into a flustered meltdown!
3. Add `INTERIOR_INSPECTABLES` across all 5 interiors (`harbor_tavern`, `apothecary_shop`, `blacksmith_shop`, `elder_sanctum`, `grand_manor_interior`) so pressing `Space` or `E` facing beds, bookshelves, cauldrons, weapon racks, the sleeping Lord's canopy bed, **Nyah's Futon (`cgId: 'nyah_futon'`)**, or **Fifi's Futon (`cgId: 'fifi_futon'` -> `'fifi_blush'`)** triggers hilarious Fifi + Nyah commentary (and displays the `144×88` PC-Engine Event CG in the Manor Maid Quarters!).

---

## STEP 5: `js/06_engine_and_ui.js` — All UI/Combat Bug Fixes (#2, #5, #6, #7, #10, #15), 3-Person Party Train + Jealous Wedge AI, TP Combo Spell, Squash-and-Stretch Juice, & 2D WebGL Lighting Shader

### 5.1 Fix `Escape` Key Dumping to Main Menu (#10)
In `update()` (`js/06_engine_and_ui.js`):
- Replace `if (consumeJustPressed('Escape')) { returnToTitleScreen(); return; }` with `if (consumeJustPressed('Escape')) { toggleStatusMenu(); return; }`.

### 5.2 Fix `Space` Accidentally Talking to Nyah When Swinging Sword (#15)
1. Add **`KeyE`** and **`KeyX`** as dedicated **Talk / Companion Hint** keys (`if (consumeJustPressed('KeyE') || consumeJustPressed('KeyX')) { tryInteract(true); }`).
2. In `tryInteract(allowCompanionTalk = false)`:
   - On combat maps (`aldenor_coastal_plains` or `dungeon_*`) or whenever any monster is alive within `160px`, **do NOT trigger Nyah or Fifi dialogue on `Space`** (`!allowCompanionTalk`)—so `Space` 100% swings your sword without ever accidentally opening Nyah's dialogue box mid-fight!

### 5.3 Fix Dungeon Exit Infinite Teleport Loop (#7)
1. Add `let transitionGraceTimer = 0;` set to `0.45` when a map transition finishes fading in; while `transitionGraceTimer > 0`, decrement by `dt` and skip map exit/entrance triggers.
2. Update dungeon exit spawn coordinates in `update()` so exiting spawns you **2 full tiles clear** of the entrance trigger:
   - `dungeon_mines` -> `startMapTransition('aldenor_coastal_plains', 5 * 16, 9 * 16, 3)`
   - `dungeon_crypts` -> `startMapTransition('aldenor_coastal_plains', 26 * 16, 10 * 16, 2)`
   - `dungeon_shrine` -> `startMapTransition('aldenor_coastal_plains', 16 * 16, 18 * 16, 1)`

### 5.4 Fix Mochi Quest Overlapping Text & Wiped `+15 MAX HP` (#6)
1. Add `hero.bonusMaxHp = 0` to `hero` (and persist in `localStorage`).
2. In `getMaxHpForLevel(lv)`, return `base + (hero.bonusMaxHp || 0)`.
3. In `getDialogueTree('child')` when turning in Mochi, increment `hero.bonusMaxHp = (hero.bonusMaxHp || 0) + 15;` BEFORE calling `addExp(150);`.
4. In `spawnFloatingText(text, x, y, color)`, count existing active `floatingTexts` within `Math.abs(ft.y - y) < 18` and offset `y -= nearbyCount * 11` so multiple popups stack cleanly and NEVER overlap!

### 5.5 Fix Inventory Text Cutoffs (#5) & Intro/Epilogue Text Scrolling (#2)
1. Add `drawCompactText(ctx, text, x, y, color, outline)` using `4px–5px` variable kerning so equipment (`W: Rusty Shortsword`, `A: Silver Breastplate`) and bag items (`1x Mochi the Kitten`) render in full inside `renderStatusMenu(ctx)` without `.slice(0, 13)` truncation!
2. In `renderIntroCinema(ctx)` and `renderEpilogueCinema(ctx)`:
   - Replace `lines.slice(0, 4)` with `const startIdx = Math.max(0, lines.length - 4); lines.slice(startIdx, startIdx + 4)` so lines 5–6 automatically scroll into view as the typewriter advances!
   - Replace all `"PROJECT YS"` strings in Title Screen, Intro Card 5, and Epilogue Card 6 with **`"PROJECT NYAH"`**.

### 5.6 Render 22×26 Tall Chibis, 48×48 Giant Bosses, & Squash-and-Stretch Juice
1. **Dynamic Sprite Size & Squash-and-Stretch (`drawSpriteJuicy`):**
   - Since V5 character sprites are `22×26` and V5 bosses are `48×48` (while regular monsters/items remain `16×16`), draw any sprite `spr` anchored at its bottom-center foot coordinate `(entity.x + 8, entity.y + 16)` with its `scaleX`, `scaleY`, and `hopY`:
     ```javascript
     function drawEntitySprite(ctx, spr, ex, ey, scaleX = 1, scaleY = 1, hopY = 0) {
       if (!spr) return;
       const w = spr.width || 16;
       const h = spr.height || 16;
       const footX = Math.round(ex + 8);
       const footY = Math.round(ey + 16 + hopY);
       ctx.save();
       ctx.translate(footX, footY);
       ctx.scale(scaleX, scaleY);
       ctx.drawImage(spr, -Math.floor(w / 2), -h, w, h);
       ctx.restore();
     }
     ```
   - Update spring squash-and-stretch every frame:
     - Walking adds a rhythmic trot bounce (`scaleX = 1 + Math.sin(walkTimer * 14) * 0.06`, `scaleY = 1 - Math.sin(walkTimer * 14) * 0.06`, `hopY = -Math.abs(Math.sin(walkTimer * 14)) * 1.5`).
     - Sword slash / Nyah claw / Fifi cast sets `scaleX = 1.25, scaleY = 0.78` and springs back to `1.0`.
     - Taking damage sets `scaleX = 1.32, scaleY = 0.70, hopY = -3`.
     - Speaking a new dialogue line triggers a portrait + sprite emotion pop (`dialogueState.portraitPop = 1.16` decaying to `1.0`).

### 5.7 3-Person Party Train (`heroTrail`), Nyah's "Jealous Wedge" AI, Fifi Ranged Magic, & TP "Maid Twin Starburst" (`[C]`)
1. **3-Person Caterpillar Follow + Nyah's Jealous Wedge:**
   - Maintain `heroTrail[]` (up to 36 breadcrumb steps `{x, y, dir}` pushed whenever `hero` moves `>= 3px`).
   - Before Nyah is recruited: `fifiCompanion` follows at `heroTrail[6]`.
   - After Nyah is recruited (`flags.nyahRecruited`):
     - Slot 1 (`heroTrail[5]`) is right behind Master; Slot 2 (`heroTrail[11]`) is behind Slot 1.
     - Every `14 seconds` out of combat, if `!flags.nyahInFrontSlot`, Nyah triggers a **Jealous Wedge**: she sprints into Slot 1 (`flags.nyahInFrontSlot = true`), bumps Fifi to Slot 2, triggers a squash-stretch hop, and spawns a floating banter popup (`"Move over, mutt! Nyah walks next to Master!"` / `"E-eep! Sorry, Miss Nyah!"`).
2. **Fifi's Autonomous Ranged Magic & Gentle Heal + Deltarune TP Bar + "Maid Twin Starburst" (`[C]`):**
   - **Fifi Combat AI:** Every `1.15s` when any living monster is within `115px`, Fifi triggers a cast stretch and fires a homing `fifiBolt` projectile (`speed: 140`, damage `7 + hero.level * 2`, builds `+8 TP`). Every `9s` if `hero.hp < hero.maxHp * 0.85`, Fifi casts **Gentle Puppy Blessing** (`+12% Max HP` heal + pink heart particles).
   - **TP Bar (`hero.tp = 0..100`):** Displayed in the top HUD next to EXP. Sword hits add `+10 TP`, Fifi bolts `+8 TP`, Nyah claws `+8 TP`.
   - **Maid Combo Spell (`[C]` or Auto-Trigger at 100% TP against Bosses / 3+ monsters):**
     - Consumes `100 TP`, shows a `0.75s` top-screen dual portrait cut-in banner (**Nyah & Fifi: `"★ MAID TWIN STARBURST! ★"`**), calls down 8 starlight-lightning pillars across a `100px` radius dealing `36 + hero.level * 6` AoE damage, stuns monsters for `1.2s`, and heals Master for `30% Max HP`!

### 5.8 2D WebGL Dynamic Lighting, Glow & CRT Bloom Shader Pass (`#glLightCanvas`)
Add `initWebGLLighting()` and `renderWebGLLighting()` in `js/06_engine_and_ui.js` called at the end of `renderFrame()`:
- Collect up to `16` dynamic point lights `lights[]` (`{ x, y, r, g, b, radius, intensity }`) in screen coordinates from:
  - `hero` (warm adventurer aura), `fifiCompanion` (soft pink-gold starlight aura), `nyahCompanion` (golden bell glint),
  - Active `swordBeams` & `fifiBolts` (bright cyan/magenta magic glow),
  - Town street lanterns, Tavern hearth fire, Blacksmith furnace, Dungeon blue braziers, Save crystals, and Boss magma/soul cores!
- Render a WebGL quad over `#glLightCanvas` with a fragment shader that outputs additive colored point-light bloom + ambient dungeon/twilight mood lighting (with automatic fallback to a 2D `createRadialGradient` `'screen'` blend pass if WebGL context creation is unavailable).
