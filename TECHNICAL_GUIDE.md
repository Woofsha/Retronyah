# PROJECT NYAH: THE BELL OF ALDENOR — Technical Guide

> Living document. Update the **Fix Log** and **Do Not Regress** sections whenever you
> change gameplay code, then rebuild the standalone HTML (see *Build & Test*).
>
> Last updated: **2026-11-13** · Game version: **v0.10.0**

A tiny Falcom-flavoured, PC-Engine-CD-styled action RPG that runs in one browser tab:
256×224 canvas, hand-painted VCE palette, four dungeons, a three-person party, and a
lot of tea. It is deliberately built like a 1993 CD-ROM game, not like a modern web app.

---

## 1. Quick start

```bash
# from the repo root
python -m http.server 8777 --bind 127.0.0.1
# open http://127.0.0.1:8777/
```

Opening `index.html` directly with `file://` mostly works, but saves and some asset
loads are happier over HTTP. There is no bundler, no framework, no npm dependency for
the game itself (Node is only used for the optional standalone build).

Controls: **WASD/arrows** move · **Space** slash/interact · **E/X** talk · **Z** slash
(hold = spin) · **Shift** dodge (0.24 s i-frames, 34 of 100 stamina) · **C** maid spell ·
**I/Tab** menu · **L** dialogue log · **Esc** close menu / title · **1–3** potions ·
**V** CRT · **M** mute.

---

## 2. Repository layout

| Path | Role |
| --- | --- |
| `index.html` | Cabinet chrome, HUD badges, CRT overlay, touch pads, styles. Loads the 7 scripts in order. |
| `js/00_v5_assets_bundle.js` | Generated base64 canvas assets (`window.V5_CANVAS_ASSETS`). Huge; do not hand-edit. |
| `js/01_config_and_audio.js` | `resizeViewport`, VCE palette, pixel font + `drawPixelText` / `drawCompactText` / `wrapDialogueText`, HuC6280-style synth SFX/BGM. |
| `js/02_art_sprites.js` | Tile atlases, character sprites, animated props (flowers, cracked walls, fountain). |
| `js/03_art_portraits.js` | 64×64 portrait renderers, emotes, full-screen event CGs. |
| `js/04_maps_and_dungeons.js` | `MAPS`, `setMapTile`, every map builder, `dungeonState`, `setBossGateTiles`. |
| `js/05_story_and_banter.js` | Entities/AI, NPC dialogue trees, quest flags, save/load, EXP & gear. |
| `js/06_engine_and_ui.js` | Camera, render passes, dialogue UI, status menu, title/intro/epilogue, input, game loop, `window.*` exports. |
| `bundle_standalone.js` | Node script that inlines all modules into `retronyah_standalone.html`. |
| `retronyah_standalone.html` | Generated single-file build for sharing. Never edit by hand. |
| `aldenor_v5_modular_spec.md` | The design spec that produced this version. Useful intent, not always current truth. |
| `CODE_REVIEW.md` | Historical verification notes from an earlier pass. Some findings are now fixed. |
| `README.md` | Public repository landing page, GitHub Pages link, controls, local play & test commands. |
| `.gitignore` | Keeps local `backups/`, `screens/`, `index_v4_backup.html`, and `.freebuff/` untracked. |
| `tests/smoke_verify.js` | Zero-dependency Node VM regression suite (syntax, standalone sync, map BFS, saves, combat/progression/perf probes). |
| `tests/browser_verify.js` | Headless Chrome CDP verification suite across `index.html` and `retronyah_standalone.html` (desktop + mobile). |
| `backups/` | Local timestamped `.tar.gz` archives (git-ignored). The pre-v0.6.0 archive is `aldenor_pre_fixes_2026-10-20_053151.tar.gz` (game v0.5.3). |
| `screens/` | Local review screenshots (git-ignored). |

---

## 3. Architecture rules (read before editing)

1. **No modules, no IIFE, no strict mode.** All seven files are classic `<script>`s that
   share one global lexical environment. A top-level `const`/`let`/`function` name must be
   unique across *all* files. This is the #1 source of "works alone, breaks when loaded".
2. **Load order matters.** `01` → `02` → `03` → `04` → `05` → `06`. `06` starts the game
   at the bottom (`buildAllMaps(); … requestAnimationFrame(gameLoop);`), so anything used
   during startup must already exist.
3. **Only what `06` exports is reachable from the console.** See the `window.*` block at
   the end of `06` (`window.hero`, `window.flags`, `window.MAPS`, `window.monsters`,
   `window.dungeonState`, `window.setBossGateTiles`, …). To debug a private function,
   temporarily export it or drive it through real input.
4. **Rendering is a 3-pass software renderer** on a 256×224 canvas (`ctx.imageSmoothingEnabled = false`).
   Ground and struct tiles paint first; entities, props **and every overhead tile** are
   collected into one list and sorted by the bottom of their tile/sprite, so a canopy,
   tree or eave only covers whoever is standing behind it. The crypt's darkness pass runs
   after that sorted world and before particles, projectiles and the dialogue box, so UI
   is never dimmed; winding-up monsters punch their own hole in the veil so their tell
   rings stay visible. There is an optional WebGL lighting pass on `#glLightCanvas`; it
   must fail gracefully.
5. **State must be reconstructible.** Saves store only flags, dungeonState, hero/party and
   map id. Maps are rebuilt from those on load (`buildAllMaps()`), so never serialize map
   arrays or transient entities.

---

## 4. Coordinates, tiles, maps

- Canvas: **256×224**. Tile size: **`TILE_SZ = 16`**. Hero collision box is smaller than a
  tile, so doorways are 1–2 tiles wide.
- `MAPS[id]` holds fixed-size typed arrays: `groundLayer`, `structLayer`, `overheadLayer`,
  `collisionMap` (`Uint8Array`, `1` = solid).
- `setMapTile(map, x, y, ground, struct, overhead, solid)` — **`undefined` means "leave this
  layer alone"**, `null` means "clear it". This distinction is load-bearing: passing `null`
  for ground erases the floor. Always pass a real ground tile when opening a gate.
- Map builders are idempotent: they `fill(null)`/`fill(0)` first, then re-apply state from
  `flags` and `dungeonState`. Call `buildAllMaps()` after any flag that changes geometry.

### Dungeon quadrant contract

All three combat dungeons use the same 36×32 four-quadrant plan:

```
            x < 18            x > 19
        +----------------+----------------+
 y < 15 |  TL  (A)       |  TR  (B) BOSS  |
        |                |                |
        +--- (7..9) -----+--- (26..27) ---+
 y > 16 |  BL  (C) ENTRY |  BR  (D) SAVE  |
        +----------------+----------------+
```

Passages:

| Tiles | Connects | Controlled by |
| --- | --- | --- |
| `(17..18, 8..9)` | TL ↔ TR | **boss gate** |
| `(26..27, 15..16)` | TR ↔ BR | **boss gate** |
| `(17..18, 23..24)` | BL ↔ BR | dungeon shortcut |
| `(7..9, 15..16)` | TL ↔ BL | always open |

`BOSS_GATE_TILES` + `setBossGateTiles(map, open, groundTile)` in `04` own **both** entrances
to the boss quadrant. The old code sealed only `(26..27, 15..16)`, which made the portcullis
decorative because the boss could be reached through `(17..18, 8..9)`. If you add a dungeon,
reuse this helper; do not open single gate tiles by hand.

### Automap

`markMapExplored(mapId, tx, ty, radius)` runs once per gameplay frame in `06` and reveals a
5×5 square around the hero. The MAP tab draws **only** visited tiles from
`mapExploration[activeMapId]`, at 3 px per tile (108×96 for a 36×32 dungeon), with floors
and walls in different colours and a gold marker for the hero. There is deliberately no
live minimap and no off-map data: if it is not in the survey, it is not drawn.

The survey is a save feature, not render state. Wiping it on New Game and preserving it
across load is part of the contract, and `markMapExplored` is the only writer.

### Puzzle ownership

| Dungeon | Puzzle | Opens |
| --- | --- | --- |
| Old Quarry Mines | Two track switches in TL: `(6,8)` and `(12,4)`. **Both** required. | released cart smashes the barricade at `(8,5)` + boss gate |
| Coastal Crypts | Three skull levers: `(4,20)` BL, `(14,4)` TL, `(32,20)` BR. Levers 2/3 also open the BL↔BR shortcut. | boss gate after all three |
| Sunken Shrine | Valve 1 `(6,6)` TL lowers the five basins to walkable shallows and opens the BL↔BR shortcut; valve 2 `(30,22)` BR then drains the basins to floor. Floor switch `(20,23)` opens only the shortcut. | boss gate after both valves |
| Bell Spire | No inner gate; the town gate at `(24..25, 1)` needs all three relics. | — |

Ordering above is deliberate: valve 2 / lever 3 sit beyond the shortcut, so requiring the
final switch *before* opening the shortcut would soft-lock the room.

---

## 5. Saves

- localStorage key: **`aldenor_save_v4`**. Intro-watched key: `aldenor_intro_watched`.
- `serializeGameState()` → `{ hero, nyah, dungeonState, activeMapId, flags, exploration }`.
- `exploration` (v0.7.0+) is `{ mapId: [packedTileIndex, …] }`, where the index is
  `ty * map.width + tx`. In memory each map is a `Set`, rebuilt by `loadMapExploration()`;
  old saves have no key and simply start with a blank survey. Never serialize Sets
  directly, and call `resetMapExploration()` from `startNewGame()`.
- **Dash stamina is transient and never serialized.** `refreshWorldAfterLoad()` refills
  `hero.stamina` to 100 for both a load and a New Game, and a level-up refills it too.
  Do not add a `stamina` key to the save; a loaded run always starts with a full pool.
- The **dialogue log** (last 80 lines) is deliberately *not* saved: it is a session
  aid, it would bloat every save, and reloading should not inherit the old run's
  conversations. `startNewGame()` clears it.
- `deserializeGameState()` restores values, calls `buildAllMaps()`, sets `activeMapId`, then
  **`refreshWorldAfterLoad()`** which rebuilds: `heroTrail`, companion positions, camera,
  transition/dialogue state, `initMonsters(activeMapId)`, NPC schedules and HUD.
- `startNewGame()` resets the same transient state and ends with `refreshWorldAfterLoad()`.
  If you add a new piece of persistent hero/party/dungeon state, reset it in **both** paths.
- Loading must never inherit monsters, trail points or schedule state from the previous map.
  That was a real bug; the fix is the `refreshWorldAfterLoad()` funnel. Do not bypass it.

---

## 6. Dialogue, choices, cinematics

- `dialogueState` lives in `05`; rendering in `renderDialogueBox()` (`06`).
- Speaker text types at ~28 chars/s; `Space/E/Enter` completes the line, then advances.
- Long lines show a **6-line window**; `↑/↓` scroll it and `▲/▼` indicators appear.
- **Choices render in their own panel above the box** (`renderDialogueChoicePanel`). The
  prompt keeps its full pane. Historically choices were drawn inside the 76 px box and the
  question was sliced to its last two lines — do not reintroduce that coupling.
- Choice labels wrap at **25 chars**; the panel is 172 px wide (text column ~157 px) and
  can scroll if a mod adds many options. Selection is `↑/↓`, confirm is Space/E/Enter.
  Wrapping at 28 overflowed the right border on 27–28-character labels.
- Intro (`INTRO_CARDS`) and epilogue (`EPILOGUE_CARDS`) paginate **4 lines at a time**.
  `scrollOffset` is a page start. Skipping the typewriter rewinds to page 0 so the player
  is never dumped on the last four lines. `↑/↓` / `W/S` page; Space advances when the last
  page is visible. Epilogue skip is **Esc only** (S is page-down).

---

## 7. Input & UI

Keyboard is handled by a single `keydown` listener in `06`; `keysDown` is held state,
`justPressed` is consumed once per frame via `consumeJustPressed(code)`. Toggle shortcuts
(`I`/`Tab`, `T`, `V`, `M`) ignore `e.repeat` so held keys never strobe menus or filters,
window `blur` and `document.hidden` call `clearHeldInputs()` to zero held keys and
whirlwind charge state, and `dialogueLogState.open` (as well as title/intro/epilogue
cinemas) blocks `toggleStatusMenu()`. In Tab 0 (`BAG`), pressing Space/Enter/E also
equips Nyah accessories (`KEY_ITEMS[id].type === 'accessory'`).

Canonical bindings:

| Key | Context | Action |
| --- | --- | --- |
| Space | gameplay | attack / advance dialogue / confirm |
| E or X | gameplay | talk / interact (companions only respond to this) |
| Z | gameplay | slash; hold 0.6 s for whirlwind |
| C | gameplay / menu | maid spell / cycle Nyah cosmetic |
| I | anywhere | toggle status menu |
| Tab / → | menu open | **next tab** (BAG → LOG → SAVE → MAP); outside the menu Tab opens it |
| Q / ← | menu open | previous tab |
| Shift | gameplay | dodge step: 0.22 s, 0.24 s i-frames, costs 34 of 100 stamina, 0.30 s re-fire gate |
| Esc | menu open | close menu; on title/intro/epilogue, skip |
| T | menu save tab | return to title |
| L | gameplay | dialogue log (last 80 lines); ↑/↓ scroll, L/Esc close |

Dodge stamina is the header `ST` badge: a 32×5 bar plus the raw value. Two steps fit in a
full pool (66 → 32), the third is refused without spending anything, and the fill turns
**amber** below the 34-step cost. Regen is 28/s after a 0.35 s beat and pauses only while
the step, menu, dialogue or transition owns the world. Kills return 18 stamina; Healing
Herb / Starlight Tonic restore 25 / 50 stamina as well as HP, and a level-up refills both
pools.

Touch controls live in `#mobileControls`, shown only under
`(hover: none) and (pointer: coarse)`. `.vpad-btn` / `.vact-btn` use `data-key="KeyX"`
attributes; non-key buttons use `data-action="menu"` and a dedicated listener. When adding
a touch button, set **either** `data-key` **or** `data-action`, never neither (the old loop
defaulted missing keys to `Space` and would slash).

The dialogue log has a touch button too: a 36 px `LOG` with `data-key="KeyL"` in the
action grid. It is deliberately smaller than the 46 px combat buttons so the seven-button
grid still lays out as 4 + 3 at 320 px (three rows would overflow the 112 px strip).

**Time of day is not a key binding.** Talking to Elder Gared and choosing *Rest* is
`setTimeOfDay()` — it is the only way to move the clock, and it also rebuilds the map
palettes, NPC schedules and HUD badge. The Bell Clapper's defeat calls it with
`{silent:true}` so the dusk breaks automatically once the Crypts are cleared. There is
no `T` toggle and no header toggle button; the header only *reports* the phase.

The four status tabs are 31 px apart with plain labels (`BAG`, `LOG`, `SAVE`, `MAP`).
Do not reintroduce bracketed labels: `[QUEST]` is 42 px at 6 px glyphs and collides with
the next tab. The SAVE tab is still index **2**, which `T` and the save/load handlers
rely on; MAP was appended as index 3 so those checks stayed valid. On touch, the d-pad
emits ArrowLeft/ArrowRight, which the menu already treats as previous/next tab.

Status menu geometry: left pane `6..116`, right pane `120..250` (`130 px`). At 6 px per
glyph, keep right-pane lines **≤ 19 characters** (`rx + 10` leaves ~120 px). Labels are
short on purpose (`FORK: OK`, `MOCHI: TO LYLA`). Longer text needs `drawCompactText` or a
layout change, not just a longer string.

---

## 8. Responsive layout

- `resizeViewport()` in `01` measures `#screenWrapper`, computes an integer-ish scale for
  256×224, and sets `#viewport` width/height. It runs on load, resize, orientation change,
  and through a `ResizeObserver` on the wrapper (the header can wrap without a window
  resize).
- Below 860 px the header wraps, hides button labels and the VU meter, and shrinks badges.
  `#screenWrapper` has `min-height: 0` so the flex column can actually shrink.
- Touch layout: 100 px d-pad + 200 px action grid (Z, ACT, E, LOG, DASH, C, MENU),
  112 px tall. The six combat buttons are 46 px; `LOG` is 36 px. At 320 px the grid shrinks
  to ~189 px and still lays out 4 + 3 in two rows (97 px). At 390 px it is 4 + 3 as well.
  The touch **MENU** button is the only way to open the status menu on a phone; the d-pad
  drives menu tabs through ArrowLeft/ArrowRight.
- The canvas is intentionally pixelated; never add CSS smoothing or fractional scaling
  without checking the CRT overlay alignment.

---

## 9. Story flags & progression

`flags` lives in `05` and is the single source of truth for quest state. High-level flow:

1. **Tea trial.** Guard Goran no longer hands over the Silver Teacup. A harbor gull stole it;
   the guard sends you to corner the gull **three times** near the south plaza. The gull drops
   `guard_sandwich`; returning it to Goran awards the **Silver Teacup** (plus 30 G and the
   Tavern VIP Pass) and sets `seagullSolved` + `rivalMaidTrialStep = 1`. Lumina brews
   `jasmine_tea`; deliver it to Nyah to recruit her.
2. **Rival Maid Trial.** Clear 3 Coastal Slimes, then Mochi the kitten, then the four relics.
3. **Relics.** Mines fork → Crypts clapper → Shrine crest → Bell Spire finale. Bosses spawn
   only while their `boss*Defeated` flag is false. The Crypts ward needs **twilight**;
   Elder Gared's rest is the only clock, and killing the Lich brings dawn back
   automatically so the player is never stranded in permanent dusk. Inside, the crypt is
   dark until the eight blue bowls are kindled or the skull-lever ward breaks; the levers
   open the sanctum and wake every bowl. Before Nyah is recruited the Crypts gate speaks
   as **Fifi**, because Nyah is still at the Manor.
4. **Post-game.** `flags.gameCompleted` / `chapter = 5` adds the spire balcony bench and free
   roam.

If you add a quest flag: initialize it in `flags`, reset it in `startNewGame`, include it in
any relevant `getQuestStage`/hint logic, and check it survives a save/load round trip.

---

## 10. Build & test

Live deployment (GitHub Pages from `master`): https://woofsha.github.io/Retronyah/

```bash
# 1. Syntax check every module (fast, catches stray braces)
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done

# 2. Automated smoke & regression suite (18 checks: syntax, sync, map BFS, save round-trip, combat/UI/perf probes)
node tests/smoke_verify.js

# 3. Automated headless Chrome CDP suite (18 checks across index.html + retronyah_standalone.html)
node tests/browser_verify.js

# 4. Play it locally
python -m http.server 8777 --bind 127.0.0.1
#    → http://127.0.0.1:8777/

# 5. Rebuild the single-file version after any js/index.html change
node bundle_standalone.js
```

Manual smoke checklist (do this before calling a change done):

- [ ] Boot to title, start a new game, intro pages forward and back, skip rewinds to page 0.
- [ ] Talk to an NPC with choices: the question stays readable above the choice panel.
- [ ] Open the menu with `I`; `Tab`/`Q` cycle tabs; `I`/`Esc` close; save, reload page, load.
- [ ] Save inside a dungeon, reload, load: monsters and the boss are back; no party trail drift.
- [ ] New Game after playing: TP, Mochi's +15 max HP, gear and dungeon state are all reset.
- [ ] Level up once with Mochi's bonus: max HP equals `100 + 15*(lv-1) + bonus` exactly once.
- [ ] Each dungeon: boss quadrant is sealed from **both** entrances until the puzzle is done.
- [ ] Shrine: valve 1 opens the shortcut, valve 2 opens the boss gate (no soft-lock).
- [ ] Teacup chain: guard refuses the cup until the gull is chased and the sandwich returned.
- [ ] Phone width (~390 px): header wraps, no horizontal clipping, MENU button opens the menu.
- [ ] Shift dodges in the held direction and spends exactly 34 of 100 stamina; two
      steps are available, the third is refused with `OUT OF STAMINA!`, and the `ST` bar
      turns amber below the cost. Regen resumes 0.35 s after a step at 28/s, and the touch
      `DASH` button behaves identically.
- [ ] Potions: a Healing Herb restores 40 HP and 25 stamina (Starlight 90/50); at full
      HP it can still be spent on stamina; a kill returns 18 stamina; a level-up refills
      the pool. Loading a save or starting New Game also refills it.
- [ ] Boss tells: the golem, lich, leviathan and Eclipse all show a flashing `!` and a
      closing ring before the attack resolves; the golem's quake hurts within ~4 tiles;
      Eclipse phase 2 actually fires its 8-orb ring (and phase 3 its 10-orb ring).
- [ ] MAP tab: only walked tiles are drawn, the hero marker is on the current tile, the
      survey survives save → load, and New Game starts it blank.
- [ ] `L` opens the dialogue log, ↑/↓ scroll it, `L`/`Esc` close it, and gameplay is
      paused while it is open. Lines from choices and inspectables are in it.
- [ ] Market stall: the hero standing in front of the awning is drawn in front of it,
      the cabinet is visible under the canopy, and the middle stall tile is solid.
- [ ] Touch: the small `LOG` button opens and closes the dialogue log through real
      `pointerdown` events, and at 320 px the seven-button grid is still two rows with no
      horizontal overflow.
- [ ] Crypt darkness: entering with every bowl cold dims the world; the hero's lantern,
      each lit brazier and a winding-up monster cut visible pools in it, while the HUD,
      dialogue box and dialogue log stay bright. The automap is unaffected.
- [ ] Braziers: facing a cold bowl lights exactly one and reports `n/8`; the state survives
      save/load; the eighth lifts the dark. Pulling the third skull lever also wakes every
      bowl, and the Lich's dawn leaves the crypt permanently lit.
- [ ] Mines cart: both switches release the cart after a warning; standing on the rail
      takes about 10 damage, the barricade breaks, and the boss gate opens. Boarding the
      parked cart rides it and it deals 12 to monsters it runs over.
- [ ] Shrine water: at high water the five basins are solid; valve 1 makes them shallow
      and opens only the shortcut; valve 2 drains them to floor and opens the boss gate.
      High water must never strand the valve, chests or save crystal.
- [ ] Signature drops: dodging next to a foe with the Crusher's Core deals exactly 12;
      a kill with the Grave Lantern heals exactly 12; the Crown of the Dawn burns only
      undead (8/s within 52 px). All three survive save/load and New Game clears them.
- [ ] No `T` toggle: `T` on the SAVE tab returns to title and does nothing in gameplay.
      Elder Gared's rest changes the phase both ways and the header TIME badge follows.
- [ ] Level curve: `getExpForLevel(19)` ≈ 867 and a 5,750 EXP clear lands at level 19–20,
      not 12.
- [ ] `retronyah_standalone.html` is newer than the last source edit and boots the same.

Console probes that help (paste in DevTools):

```js
// Where am I, and is the boss gate solid?
({ map: window.MAPS && Object.keys(window.MAPS).length, x: hero.x, y: hero.y,
   gate: window.MAPS.dungeon_mines.collisionMap[8 * 36 + 17] });

// Warp for testing (then walk one tile so collision/camera update)
hero.x = 17 * 16; hero.y = 8 * 16;

// Inspect quest state
JSON.parse(JSON.stringify(window.flags));
```

---

## 11. Fix log

### 2026-11-13 — v0.10.0 `hydrogen-overhaul` stability, combat & perf pass

| Area | Change | Files |
| --- | --- | --- |
| Input & overlay locks | Ignored `e.repeat` on `I`/`Tab`/`T`/`V`/`M`; added `clearHeldInputs()` on window `blur` and `visibilitychange`; blocked `toggleStatusMenu()` while `dialogueLogState.open` or Title/Intro/Epilogue cinema is active. | `06` |
| Minecart & save load cleanup | Lethal `minesCart` collisions call `triggerHeroDefeat()` (clearing `minesCart.run` cleanly instead of leaving `hero.hp <= 0` soft-locked). `refreshWorldAfterLoad()` resets companion combat/`pounceCooldown`, hero spin/charge/slow state, and lingering projectiles/particles. | `05` |
| Items, Bag & DEF HUD | Added `starlight_ribbon` (`+5 DEF`, `+10 MAX HP`) to `KEY_ITEMS` and stat helpers (`getMaxHpForLevel`, `getTotalHeroDef`); simplified `updateItemBadge()` via `KEY_ITEMS`; exposed `+extraDef` breakdown in Status Menu; enabled `[SPACE]` Bag equip for Nyah accessories. | `05`, `06` |
| Combat, LOS & Twin Starburst | Added point-based `isPointSolid()` for `hasWallBetween`, `enemyProjectiles`, and `swordBeams`; made parried `skeleton_knight` swings return early without `+10 TP` or knockback and pause chase while `staggerTimer > 0`; gated `triggerMaidTwinStarburst()` and auto-100TP on `flags.nyahJoinedParty`. | `05`, `06` |
| World progression & teleports | Added `unlockSpireIfAllRelics()` on boss defeat so winning the 3rd relic immediately opens Sanctum Gate `(24..25, 1)`; moved `handleSeagullInteraction` step 1 onto walkable cobble `(144, 256)`; added `pickOpenTeleportPos()` wall fallbacks for `shadow_guard` and `boss_eclipse` phase 3. | `05`, `06` |
| Render, DOM & audio cleanup | Cached 7x6 `.vu-segment` nodes in `updateVuMeterHud()` with self-healing rebuild if mutated; hoisted `glPaddedLights`/`glPaddedColors` buffers and added `clearWebGLLighting()` on `returnToTitleScreen()` + non-world `gameLoop()` branches; attached `osc.onended` disconnect in `playVoiceBlip()`. | `01`, `06` |
| Automated verification | Added `tests/smoke_verify.js` (18 checks) and `tests/browser_verify.js` (18 Chrome CDP checks). All 36 checks verified green after bundling `retronyah_standalone.html`. | `tests/` |

### 2026-10-25 — v0.10.0 dash stamina & enemy pass

| Area | Change | Files |
| --- | --- | --- |
| Dash stamina | `hero.stamina` (100) is the dodge budget. A step costs 34 and starts a 0.35 s regen beat; regen is 28/s and pauses while the step, menu, dialogue or transition owns the world. The old 0.55 s cooldown is now a 0.30 s gate — the pool is the real limiter. A refused step spends nothing and reports `OUT OF STAMINA!`. | `05`, `06` |
| Refills | A kill returns **18** stamina so clearing a room feeds mobility. A level-up refills both pools. Healing Herb / Starlight Tonic restore **25 / 50** stamina as well as 40 / 90 HP; a potion is allowed at full HP when stamina is missing, so it is never a wasted slot. | `05`, `06` |
| HUD | New `ST` badge with a 32×5 bar and numeric value. The fill turns amber below the 34-step cost and updates on every dodge, potion, kill, level and regen tick. | `index.html`, `05` |
| Persistence | Stamina is transient and never serialized. `refreshWorldAfterLoad()` refills it, so both a load and New Game start at 100; `startNewGame()` also clears the regen delay. | `05`, `06` |
| Enemy pass | `calcMonsterDamage` uses 0.62 of DEF (was 0.55), and post-hit i-frames are 0.75 s (was 0.65). Boss cadence slowed: golem 3.7 s; lich 2.6 s cast / 5.2 s teleport; leviathan 3.8 s; shadow guard 3.3–4.8 s; Eclipse 2.9 / 2.3 / 2.0 s by phase. | `05`, `06` |
| Eclipse phase 2 | Found while testing the new cadence: phase 2 only *read* `orbTimer`, so the 8-orb ring could never fire (phase 1 left it above zero). It now ticks the timer, fires the 0.4 s tell and resets to 2.3 s. Phase 3 was audited at 2.0 s. | `06` |
| Probes | `YsEngine.enemyProjectiles` is exported for tell/cadence checks. It is a live array and is not saved. | `06` |
| Version | Header, title, title stamp and bundler log are v0.10.0. | `index.html`, `06`, `bundle_standalone.js` |

### 2026-10-24 — v0.9.0 phase B: cart, crypt darkness, shrine water & gate fixes

| Area | Change | Files |
| --- | --- | --- |
| Mines cart (B1) | The Old Quarry cart is a real dungeon verb. Both track switches release it from `(8,3)` after a 0.6 s warning; it rolls down the `x = 8` rail, smashes the barricade at `(8,5)` and opens the boss gate. Standing on the rail is the telegraphed hazard (`calcMonsterDamage(16)`); stepping off is the counter-play. `E`/Space boards the parked cart for a 118 px/s ride that runs over monsters for 12 each and drops the hero beside the rails at either end. The ride and run are transient and rebuilt from `dungeonState`. | `05`, `06` |
| Shrine water (B3) | Five low basins are now a collision state. At high water they are `seaWater` and solid; valve 1 turns them into walkable `shallowWater` and opens the save-crystal shortcut; valve 2 drains them to `shrineFloor` and opens the sanctum. The basins sit in room centres with a dry perimeter, and the critical passages, valves, chests, switch and save crystal are carved out, so the water can never soft-lock the shrine. Valve and floor-switch interactions rebuild through `buildAllMaps()` instead of patching tiles by hand. | `04`, `06` |
| Crypt verb (B2) | The Coastal Crypts now have their own verb: darkness. With no brazier lit, a 0.82-alpha indigo veil covers the world. The hero's lantern (58 px), every burning bowl (84 px), Nyah (32 px), Fifi (30 px) and any monster in a wind-up (32 px) punch soft holes in it, so an attack is never invisible. The veil sits after the y-sorted world and before particles, projectiles, dialogue and HUD. | `06` |
| Brazier circuit | Eight bowls, stored as `dungeonState.cryptBraziers[8]` with `cryptsBraziersLit` as the aggregate. Facing a `brazierDark` bowl kindles it, rebuilds the maps, reports `n/8` and, at eight, lifts the darkness. `brazierDark` is a cold twin of `blueBrazier`, added to both VCE palettes. | `02`, `04`, `06` |
| Brazier placement | Two bowls originally sat inside the boss sanctum, which the gate seals until the skull levers are pulled, so the eight-of-eight circuit was impossible in normal play. Moved to `(10,20)` and `(30,20)`: two bowls top-left, three bottom-left, three bottom-right, none in the sanctum. | `04` |
| Ward completion | Pulling the third skull lever already opens the sanctum; it now also wakes every bowl, so the boss fight is always readable. The completion line says the ward-fire lit them. Lighting all eight remains an optional, earlier route to light (the gate still needs the levers). | `06` |
| Lich dawn | Malakor's defeat sets all eight bowls, lifts the veil, returns the world to midday and rebuilds the maps even when it was already midday. The Clapper never strands the player in permanent dusk. | `05` |
| Persistence | Old saves have no brazier keys: they load fully dark, or lit when `bossLichDefeated` is set. A saved aggregate forces all eight bowls on, so a partial save can never inherit a lit flag with cold tiles. `startNewGame()` clears both fields. | `05` |
| Hint | Fifi's stage-5 line said the braziers could open the boss gate. They light the crypt; the three skull levers open the gate. The line now says exactly that. | `05` |
| Shrine gate | `shrineGateOpen` included `shrineWaterLevel === 1`, which is just valve 1 again. Turning the first valve therefore opened the boss sanctum without the second. Removed: valve 1 opens only the save-crystal shortcut and shallows, both valves drain the basins and open the boss gate. | `04` |
| Version | Header, title, title stamp and bundler log are v0.9.0. | `index.html`, `06`, `bundle_standalone.js` |

### Verification log — 2026-10-25 (v0.10.0)

| Check | Result |
| --- | --- |
| Syntax | `node --check` passes for all seven modules and `bundle_standalone.js`. |
| Boot / New Game | Real `Space` on the title started a new run. Intro skip rewound to page 0; on the next card a page press moved scroll 0 → 4 and ↑ returned to 0. Clean state: level 1, HP 100, stamina 100, 3 herbs + antidote, town map. |
| Dodge stamina | A real `Shift` step took 100 → **66** (0.22 s timer, 0.24 s i-frames, 0.30 s gate, HUD 66). A second step took it to **32**. The third was refused with `OUT OF STAMINA!` and spent nothing. After 1.0 s of regen it was **53.5**; another step worked (→ 19.9). |
| HUD | `ST` badge shows the pool, bar width and amber low state. Values followed every dodge, potion, kill, level and regen tick. |
| Potions | At full HP with 10 stamina, a Healing Herb restored **25 ST** and consumed one; the text omitted the zero HP part. Starlight Tonic is 90 HP / 50 ST. |
| Kill refund | A 20-stamina hero killed a bat: **+18 ST** text and 40.3 after the following regen ticks. |
| Level-up | Bonus 15: level 2 gave exactly **130** max HP and a full stamina pool; level 3 gave 145. |
| Save/load | Saved in the mines at `(128,464)` with 77 HP: load restored the position, 7 monsters including the golem and a 1-point trail; stamina came back at **100**. A page reload + CONTINUE restored the same mine, boss and position. |
| Gates | Mines: 8/8/0 solid at 0/1/2 switches. Crypts: 8 solid at 0 and 2 of 3 levers, 0 at 3. Shrine: 8 solid at no valves and valve 1, 0 at both. Bell Spire town gate: solid at 0 and 2 relics, open at 3. |
| Shrine water | High water basin `seaWater` / solid; valve 1 `shallowWater` / walkable, shortcut open, gate still solid; valve 2 `shrineFloor` / dry, all 8 gate tiles open. BFS from the entrance: **424 / 678 / 909** tiles. |
| Mines cart | Both switches released the cart after its warning; the barricade went from solid to `0`, the barricade flag set, and the boss gate opened. Standing on the rail lost **9** HP with `-9 CART!`. Boarding the parked cart rode the hero from y 432 → 355. |
| Crypt darkness | Same camera, empty crypt: world luminance **22.9** with the veil vs **58.0** lit. One kindled bowl reported `BRAZIER 1/8`; a seven-lit save plus the eighth interaction gave **8/8**, `cryptsBraziersLit` and no veil. |
| Third lever / Lich | Pulling the last skull lever opened all 8 gate tiles and woke all eight bowls. Killing the Lich in twilight returned the phase to **Midday**, lit all eight bowls and started the dawn dialogue. |
| Boss tells | Golem: 0.60 s tell, no instant damage, then **29** and `GROUND SHAKE!`. Lich: 0.50 s → 3 fan projectiles. Leviathan: 0.45 s → 3 wave projectiles. Eclipse phase 1: 0.45 s → 6 orbs. |
| Eclipse cadence | Phase 2 now ticks `orbTimer` and fires its **8**-orb ring after 0.4 s (was silently dead); phase 3 fires **10** orbs. Reset timers are 2.9 / 2.3 / 2.0 s. |
| Signature drops | Crusher's Core: exactly **12** damage and the dodge cost 34 (100 → 66). Grave Lantern kill: **+12 HP** and **+18 ST**. Crown of the Dawn: skeleton 100 → **92** in one pulse, crypt wisp unchanged at 75. |
| Teacup chain | Guard refused the cup while the gull held the sandwich; three real interactions advanced `seagullStep` 1 → 2 → 3 and produced the sandwich; returning it awarded the cup, VIP pass, **30 G** and trial step 1. |
| Automap | Walking revealed **25** tiles; a second position made 50; save → load restored exactly the original 25. The MAP tab rendered with no error and the hero marker on `(5,22)`. |
| Dialogue log | Real `L` opened it, ↓ advanced scroll, movement stayed frozen while open, and `L` closed it. |
| Choices | Elder offered 3 options; the prompt + panel rendered without error, and the 28-character rest label wrapped inside the panel. |
| Layout / touch | 390×844: `scrollWidth` 390, header 74 px, viewport 370×323. 320×640: `scrollWidth` 320, seven action buttons in **two** visual rows, no horizontal overflow. Real `pointerdown` opened/closed `LOG`, opened `MENU`, and a touch `DASH` spent 34 stamina with the same 0.22/0.24 timers. |
| T / rest | `T` in gameplay changed nothing. Elder Gared's rest moved the phase **Midday → Twilight → Midday** and the header badge followed; at twilight he relocates to the tavern, which is where the morning rest is taken. |
| Level curve | `addExp(5756)` from level 1 landed at **level 19**, 715 EXP toward 20, max HP 370. |
| Standalone | Rebuilt at **1,687,518 bytes (1.61 MB)**: 7 inline scripts, 0 external, v0.10.0 title, engine ready, `ST` badge present. The browser tab was rAF-throttled, so the inlined engine was driven directly: a dodge spent 34 (100 → 66), set the 0.22/0.24 timers and updated the HUD. |
| Console | No errors. The only warnings were the test probes' `getImageData` readback notices. |
| Visual | `screens/verify_v010_stamina_hud_final.png` shows the `ST` badge at 68 in town; `screens/verify_v010_crypt_light.png` shows the crypt veil with the hero's light pool. |

### Verification log — 2026-10-24 (v0.9.0)

| Check | Result |
| --- | --- |
| Syntax | `node --check` passes for all seven modules and `bundle_standalone.js`. |
| Boot / menu | Fresh load: title, New Game, intro skip → page 0, page → 4, ↑ back → 0. `I` opened BAG; `Tab` cycled 0→1→2→3→0; `Q` reversed to 3; `Esc` closed; Space swung the sword afterwards. |
| Save/load | Saved in the mines at `(128,464)` with 7 monsters including `boss_golem`; reload + load restored the position, monsters, boss, TP 55/bonus 15 and a partial brazier array exactly. |
| New Game | After TP 55, `bonusMaxHp` 15, extra gear, a leashed Fifi, an open mines shortcut and a lit crypt: TP 0, bonus 0, max HP 100, starting bag only, leash false, shortcut false, all bowls cold and `cryptsBraziersLit` false. |
| Level / dodge | With `bonusMaxHp = 15`, level 2 gave exactly **130** max HP. A real Shift dodge left 0.153 s of its timer at 60 ms, 0.173 s i-frames, moved 77 px including walking, and refused to re-fire on cooldown. A dodge also cleared a swing in progress. |
| Shrine gate | **Found and fixed a real regression:** valve 1 alone opened all 8 sanctum tiles because the gate condition treated `shrineWaterLevel === 1` as drained. Final run: no valves → 8 solid; valve 1 → 8 solid and only the shortcut open; both valves → 8 open. |
| Mines cart (B1) | Real switch interactions released the cart; it showed the 0.6 s warning, dealt **10–11** to a hero standing on the rail, smashed the barricade and set the boss gate to open. After the barricade dialogue, the cart resumed to `(128,416)` and `run = null`; boarding it carried the hero `416 → 48` at 118 px/s and dropped him at `(148,50)`. |
| Shrine water (B3) | High water: five basins were `seaWater` with collision 1 (94 deep tiles including the sea quadrant); valve 1 made a basin `shallowWater`/walkable, opened the shortcut and left the gate solid; valve 2 made it `shrineFloor`, left 0 shallows, and opened all 8 gate tiles. BFS from the entrance at high water reached 424 tiles including valve 1 and both B chests; C stayed sealed until the shortcut. Low water reached 678, drained 909. |
| Shrine persistence | Saved high water, valve 1 and both valves in turn; each load restored the matching collision state: basin solid/closed gate, shallow/shortcut open/gate closed, then dry/gate open. |
| Teacup chain | Guard refused the cup; three gull interactions yielded the sandwich; returning it awarded the cup, VIP pass, 30 G and trial step 1. Lumina then brewed the tea, consuming the cup and setting `jasmine_tea`. |
| Boss tells | Golem `jumpTimer` → **0.60 s** tell with a pending payload and no instant damage, then 23 damage at 34 px. Lich **0.50 s**, leviathan **0.45 s**, Eclipse **0.45 s**; each spawned its pattern only after the tell. |
| Signature drops | Dodge next to the golem with the Core: 100 → **88** and `STONE BURST! -12`. Grave Lantern kill: 175 → **187**. Crown of the Dawn: skeleton knight 100 → **92 → 84** over two seconds. |
| Layout / touch | At 390×844: `scrollWidth` 390, header 74 px, canvas 370 px. At 320 px: seven action buttons in two rows, no horizontal overflow. Real `pointerdown` on `LOG` opened and closed the log; `MENU` opened the status menu. |
| Crypt darkness | Empty crypt, same camera: world average **38.0** with the veil vs **59.1** with the lit flag on. The hero's light reads 45–53 luminance against 14 in the dark. HUD and dialogue are drawn after the veil. |
| Brazier circuit | Facing a cold bowl changed 8 dark / 0 blue tiles to **7 dark / 1 blue**, with the "1 of 8" line. Six lit bowls plus real interactions at the relocated `(10,20)` and `(30,20)` gave **0 dark / 8 blue**, set `cryptsBraziersLit`, removed the veil and played the 8/8 line with the gate still sealed. All eight spots are outside the sanctum. |
| Lever completion | Pulling the third skull lever through `tryInteract` opened all 8 gate tiles and woke every bowl; the new line mentions the ward-fire, so the light change is explained. |
| Lich dawn | Lich at 1 HP killed by a real sword swing while in twilight: phase → Midday, header badge → `Midday`, all 8 bowls blue, veil off, Clapper dialogue active. |
| Persistence | Partial brazier save/load exact. An old save with neither key loaded all cold with 0 blue tiles; an old save with `bossLichDefeated` loaded all lit with 8 blue tiles. |
| Standalone | Rebuilt at **1.60 MB** (1,681,773 bytes); 7 inline scripts, 0 external, boots to v0.9.0 with the engine ready. |
| Console | No errors. The only warnings came from the test probes' `getImageData` calls. |
| Visual | Screenshot capture was unavailable because the preview window was minimized; the darkness was measured from the live 256×224 canvas instead. |

### 2026-10-20 — v0.6.0 hardening pass

| Area | Fix | Files |
| --- | --- | --- |
| Save/load | Loading rebuilds the whole world through `refreshWorldAfterLoad()`: monsters, boss spawn, NPC schedules, party trail, companions, camera, transition/dialogue state. | `05` |
| New Game | Full reset of `hero.tp`, `hero.bonusMaxHp`, combat timers, menu/cinematic state, then the same world rebuild. | `06` |
| Progression | `addExp()` no longer applies `bonusMaxHp` twice; `getMaxHpForLevel()` is the only place it is added. | `05` |
| Input | Space no longer opens companion menus (only E/X does), so it always attacks/interacts. `Tab` cycles menu tabs instead of closing the menu; hint text matches. | `06` |
| Dialogue | Choices moved to their own panel above the box; prompt keeps six lines and scrolls. Choice labels wrap at 25 chars so long options stay inside the panel. Intro/epilogue paginate 4 lines as 0/4/8 page starts and skipping rewinds to page 0. | `06` |
| Boss gates | Both entrances to the boss quadrant are sealed by one gate state (`setBossGateTiles`). Mines need both switches; shrine needs both valves in a non-soft-locking order; crypts gate is driven by the levers only. | `04`, `06` |
| Teacup quest | Guard Goran no longer gives the Silver Teacup up front. The seagull chase + sandwich return is the mandatory path; hints updated. | `05` |
| Responsive | Header wraps/hides labels below 860 px, VU hidden, viewport can shrink, `ResizeObserver` rescales, status-menu quest labels shortened to fit the 130 px pane, and SAVE-tab strings (`[RETURN TO TITLE]`, `[Z]SAVE [SPACE]LOAD`) shortened so they no longer run off the panel. | `index.html`, `01`, `06` |
| Touch | Added a touch MENU button; action grid reflows to two rows; `data-key`-less buttons no longer fire Space. | `index.html`, `06` |

### 2026-10-21 — audit follow-up

| Area | Fix | Files |
| --- | --- | --- |
| Cinematics | Intro/epilogue scroll limits used `lineCount - 4`, so a 5-line card repeated lines 1-3 on page two. The limit now rounds down to the previous page start, so pages are 0/4/8 and the last page may be short. The earlier check only confirmed the last line was visible, not that the page started there; test page offsets, not just visible text. | `06` |
| Leash scene | Fifi's line says "hands" instead of "paws" (canon: human hands, no paws). The visible ribbon and the leash physics now share one post anchor, and the brass collar clasp draws above Fifi's sprite instead of being hidden behind it. | `05`, `06` |
| Docs | Added the Fifi/Nyah visual canon and voice notes, including Nyah's dominant/yandere dynamic and Fifi's submissive earnestness, to §13. | `TECHNICAL_GUIDE.md` |

### 2026-10-21 — v0.7.0 combat & navigation pass

| Area | Change | Files |
| --- | --- | --- |
| Dodge | Added `startDodge()`: 0.22 s burst at 240 px/s, 0.24 s i-frames, 0.55 s cooldown, cancels a committed swing, uses held direction or facing, draws two afterimages and dust. Bound to Shift, with a touch `DASH` button. This is the player's first real defensive verb. | `05`, `06`, `index.html` |
| Attack tells | Added `telegraphMonsterAttack(m, seconds, fire, radius)`: the monster freezes, plays a chirp, draws a flashing `!` and a tell ring, then runs the payload. Single-target tells use a closing ring; the golem passes `radius = 62` so its ring is the true quake range. Hurt pauses the tell instead of cancelling it. Converted the golem, lich (teleport + fan), leviathan wave, shadow-guard dash and all Eclipse patterns. Payloads are closures and are never serialized. | `06` |
| GROUND SHAKE | The golem's signature move now deals `calcMonsterDamage(atk × 0.85)` within 62 px, with a full particle ring, instead of spawning four harmless particles. | `06` |
| Automap | `mapExploration` tracks visited tiles per map; a 5×5 reveal is marked every gameplay frame. MAP tab draws the survey at 3 px/tile with floor/wall colours, hero marker and a surveyed percentage. Persisted in the save and cleared on New Game. | `05`, `06` |
| Tabs | Status menu now has four tabs. Labels are plain (`BAG`, `LOG`, `SAVE`, `MAP`) at a 31 px pitch; SAVE stays index 2 so existing `T`/save logic is untouched, MAP is index 3. | `06` |

### 2026-10-23 — v0.8.1 signature drops, tell audit & touch log

| Area | Change | Files |
| --- | --- | --- |
| Golem drop | **Crusher's Core.** Dodging with a foe within 34 px deals a fixed 12 damage in a stone burst with particles and `STONE BURST! -12`. The 0.55 s dodge cooldown is the only limiter, so it stays a positioning tool instead of a second weapon. | `05` |
| Lich drop | **Grave Lantern.** Every defeated monster restores 12 HP, applied after EXP so a level-up refill cannot hide it. It turns crypt attrition into route pacing. | `05` |
| Eclipse drop | **Crown of the Dawn** (post-game trophy). A once-per-second pulse burns `skeleton_knight` / `boss_lich` within 52 px for 8 damage. Non-undead are untouched. Added before the epilogue and mentioned on its final card. | `05`, `06` |
| Touch log | There was no touch route to the dialogue log. Added a 36 px `LOG` button (`data-key="KeyL"`) to the action grid; it is smaller so seven buttons still fit two rows at 320 px. | `index.html` |
| Docs | Rewrote the roadmap's leash bullet: Fifi staying behind while leashed is **intended**, not a bug. Added a do-not-regress line. | `TECHNICAL_GUIDE.md` |
| Tells | Re-verified the leviathan wave and shadow-guard dash. Both already route through `telegraphMonsterAttack`; no code change was needed. | — |
| Version | Header, title, title stamp and bundler log are v0.8.1. | `index.html`, `06`, `bundle_standalone.js` |

### Verification log — 2026-10-23 (v0.8.1)

| Check | Result |
| --- | --- |
| Leash flow | Leashed at the Manor post, walked out: Fifi's position froze at `(368,104)`, then stayed at 368/104 while the hero walked ~50 px. Reload → load kept `fifiLeashedInManor = true` and Fifi invisible outside. Re-entering placed her back at the post; the futon/dialogue *Unclip* choice cleared the flag, after which she followed (373 → 433 px) and a save/load kept her released. New Game set the flag false. No crash, duplicate or stuck party state. |
| Crusher's Core | Ghost slime at 24 HP, Nyah/Fifi frozen, no swing in flight: HP stayed 24 for 350 ms, then a real `Shift` dodge took it to **12** with `STONE BURST! -12`. |
| Grave Lantern | Removed the item, killed the Lich; the kill re-added `grave_lantern` to the bag alongside the Clapper and the dialogue mentioned it. Controlled slime kill at exactly 500 HP healed to **512** with `+12 HP`. |
| Crown of the Dawn | Removed the item, killed the Eclipse: `crown_of_dawn` returned to the bag, `gameCompleted = true`, epilogue started and its final card names the Crown. Field test: skeleton knight 135 → **119** over 2.4 s (two ticks), crypt wisp stayed at **75**. |
| Persistence | Save slot JSON held all three ids; loading restored them. `startNewGame()` resets `hero.bag`, so they clear with a new run. |
| Leviathan tell | `waveTimer` forced to 0.02: at 220 ms `windup = 0.25`, `pendingAttack` is a function, **0** projectiles; at 920 ms `windup = 0`, **3** wave projectiles. |
| Shadow-guard tell | `dashTimer = 0` at 60 px: at 220 ms `windup = 0.13`, pending function, **0** projectiles, guard had not dashed; at 820 ms the dash had resolved and **1** projectile existed. |
| Touch LOG | Real `pointerdown` on the 36 px button set `justPressed.KeyL`; one frame later `dialogueLogState.open = true`; a second tap closed it. At 320 px: document `scrollWidth` 320, grid 189×97, seven buttons in two rows, no overflow. |
| Syntax | `node --check` passes for all seven modules and the bundler. |

### 2026-10-22 — v0.8.0 feel, clarity & backlog pass

| Area | Change | Files |
| --- | --- | --- |
| Stall depth | Every `overheadLayer` tile now joins the y-sorted render list with its bottom edge as the baseline. A canopy covers an entity behind it and yields to one in front, so the market awning no longer paints over the hero's head. Awnings are lifted 7 px inside their tile so the stall cabinet shows underneath instead of being fully hidden. | `06` |
| Stall collision | The West Market stall at `(5..7, 12)` is now a continuous solid counter. The old middle tile was walkable and carried an awning, which is exactly where the hero could stand *inside* the canopy. It also stops the player walking behind Lumina's counter. | `04` |
| Sword feel | `drawSlashArc` draws three offset crescents (outer weapon colour → bright core), a four-point tip flare, a tail dot and a wider 150° sweep. Swings throw five trail sparks from the blade, a one-frame smear is drawn behind the attack pose, and connecting spawns a seven-particle radial burst in the weapon's colour. No timing change: the swing is still 0.16 s. | `05`, `06` |
| Dialogue log | `L` opens a scrollable log of the last 80 lines with speaker tags, wrapped text, a gold frame and a scrollbar. ↑/↓ (or W/S) scroll, PageUp/PageDown jump, `L`/Esc close, and the world pauses. Lines are recorded by `recordDialogueLine()` from `startDialogue`, `startCustomDialogue`, `startCustomDialogueTree` and every `advanceDialogue` transition, so choice replies and inspectables are included. Not saved. | `05`, `06`, `index.html` |
| Gate voice | The eastern Coastal Crypts gate spoke in Nyah's voice during the first trial, before she joins. Both gate branches now use Fifi when `!nyahRecruited && !nyahJoinedParty`, matching the western Mines gate. | `06` |
| Time of day | Removed the `T` toggle and the header toggle button. `setTimeOfDay()` is the single funnel (palette, schedules, maps, HUD badge); Elder Gared's rest calls it both ways, and the Lich's defeat calls it silently so the Crypts clear into dawn. The header now reports the phase instead of switching it. | `05`, `06`, `index.html` |
| Level curve | `getExpForLevel` is now `60 × 1.16^(l-1)` (was `80 × 1.32^(l-1)`). Levels 1–20 need ~5,670 EXP total; a full clear is ~5,750, so the cap is reachable instead of decorative. | `05` |
| Promise debt | Flame Edge really applies 1.3× to undead (`skeleton_knight`, `boss_lich`) with a `SEARED!` tag; the Crimson Ribbon text/perk now says the 25% the code rolls; the Chain Hauberk is 30 DEF so the 200 G purchase beats the free 24 DEF chest; Clerici's Mail (+52 DEF) is the Leviathan's signature drop instead of dead data; the Golem/Lich lines no longer claim chest loot as boss loot. | `05`, `06` |
| Version | Header, title, title-screen stamp and bundler log are v0.8.0. | `index.html`, `06`, `bundle_standalone.js` |

### Verification log — 2026-10-22 (v0.8.0)

| Check | Result |
| --- | --- |
| Syntax | `node --check` passes for all seven modules and `bundle_standalone.js`. |
| Stall depth | At `(6,13)` facing the West Market stall, the hero renders in front of the lifted awning and the potion cabinet is visible under it. The stall gap `(6,12)` is `collisionMap = 1`, so the old "stand inside the canopy" spot no longer exists. |
| Slash VFX | Canvas capture at 3× shows the three-crescent arc + tip flare; a live hit on a skeleton with Flame Edge produced `SEARED!` and **61** damage. The swing is still 0.16 s / 0.26 s cooldown. |
| Dialogue log | `L` opens a 12-entry log, ↑ moves `scroll` 53 → 52, PageUp → 42, ↓ → 43. `L`/Esc close it. A line spoken through `startCustomDialogue` appears immediately; New Game clears the log to 0. The world pauses while it is open. |
| Gate voice | Fresh run (`nyahRecruited = false`), standing at `(28..29, 9..10)` in the Coastal Plains: dialogue speaker is **FIFI**, not Nyah. |
| Time of day | `KeyT` leaves `flags.isTwilight` unchanged. Elder Gared's rest toggles `Midday → Twilight → Midday` and the header TIME badge follows both ways. A fake `boss_lich` defeat while in twilight sets the phase back to Midday and starts the new dawn line. |
| Level curve | `addExp(5756)` from a fresh level 1 lands at **level 19**, 715/867 toward 20 (was level 12). `getExpForLevel(1) = 60`, `(19) = 867`. |
| Gear promises | `chain_hauberk.def = 30`; the Leviathan defeat adds `clerici_mail` (+52 DEF); the Ribbon description and perk text read **+25%**. |
| Responsive | At 390×844 there is no horizontal overflow and the header wraps to 74 px with the new TIME badge. |
| Standalone | Rebuilt at **1.58 MB** with all 7 inline scripts, boots to v0.8.0, starts a game, records a dialogue line and reports the same level/stall values. No console errors. |

### Verification log — 2026-10-20 (after the v0.6.0 fixes)

Checked in Chromium against the real build, not just by reading code:

| Check | Result |
| --- | --- |
| Syntax | `node --check` passes for all 7 modules and `bundle_standalone.js`. |
| Boot | Title, New Game, intro skip, menu, and standalone build all run with no console errors. |
| Save/load | Saved in the mines, reloaded the page, loaded via **CONTINUE**: 7 monsters including `boss_golem`, trail length 1, companions beside the hero, quest items intact. |
| New Game | TP 55 → 0, `bonusMaxHp` 15 → 0, max HP 130 → 100, full heal, map reset; an open shrine gate is resealed. |
| Level-up | With `bonusMaxHp = 15`, level 2 gives **130** max HP (not 145). |
| Space vs E | In town, Space swings the sword next to Fifi; E opens her four-choice menu. |
| Menu | `I` opens BAG; `Tab` cycles BAG → QUEST → SAVE without closing; `Esc` closes. |
| Choices | Prompt text stays complete; the choice panel draws in its own band above the box with a gold border. All wrapped label lines ≤ 25 chars. |
| Intro paging | 5-line card shows page 1; Space moves to page offset 4 (only the fifth line), next Space advances the card; skip resets to offset 0. |
| Boss gates | All 8 gate tiles are solid at 0 switches / 1 switch / 2-of-3 levers / valve 1 only; all 8 open only at the complete puzzle for mines, crypts and shrine. |
| Teacup | Guard gives no cup before the gull; three gull interactions yield `guard_sandwich`; returning it awards cup, VIP pass, 30 G and trial step 1. |
| Responsive | At 390×844: no horizontal overflow, header wraps to two rows, footer wraps, viewport 370×323; touch MENU button opens the menu (handler tested). SAVE tab has no gold text pixels beyond the right pane edge. |
| Standalone | `node bundle_standalone.js` regenerated 1.56 MB; the file boots from the server with all 7 inline scripts and starts a new game. |

### Final re-check — 2026-10-21 (after the last guard-dialogue edit)

Ran again against a freshly rebuilt standalone and a cache-busted page load:

| Check | Result |
| --- | --- |
| Teacup chain | Fresh game: guard refuses the cup, Lumina offers no brew. Three gull interactions drop the sandwich; returning it awards the cup, VIP pass, 30 G and trial step 1. Lumina then offers the brew, which consumes the cup and yields `jasmine_tea`. |
| Boss gates | All 8 gate tiles solid at 0/1 mine switch, 2-of-3 crypt levers, and valve 1 only; all open at the complete puzzle. |
| Level-up | With `bonusMaxHp = 15`, reaching level 2 gives exactly **130** max HP. |
| Menu | `I` opens; `Tab` cycles BAG → QUEST → SAVE; `Esc` closes (driven through `update()` with real key events). |
| Responsive | At 390×844 there is no horizontal overflow, the header wraps, and the viewport is 370×323. |
| Standalone | Rebuilt at 1.56 MB, boots from all 7 inline scripts and starts a new game. |
| Visual | Choice panel and six-line dialogue render correctly; screenshots saved to `screens/final_choices_verify.png`, `screens/audit_quest_tab.png`, `screens/audit_save_tab.png`, and `screens/audit_intro_page2.png`. |
| Cinematics | 5-line intro card: skip → page offset 0, next page → offset 4, next → card advance. 7-line epilogue card: skip → 0, page → 4, next → card advance. |
| Companion input | Space beside Fifi starts a sword swing with no dialogue; `tryInteract(true)` (E/X) opens her menu. |
| Touch menu | `pointerdown` on the `data-action="menu"` button opens the status menu; at 320 px the touch controls fit without horizontal overflow. |

Screenshot capture works in the current browser session, so layout can now be checked by eye as
well as numerically. Re-run the manual checklist in §10 after future changes.

### Verification log — 2026-10-21 (v0.7.0)

| Check | Result |
| --- | --- |
| Syntax | `node --check` passes for all modules after every edit in this pass. |
| Dodge | Simulated real keydowns: 0.22 s timer, 0.24 s i-frames, cooldown 0.55 → 0.20 after ~0.35 s; displacement ~53 px plus normal walking; direction follows held input, falls back to facing. |
| Dodge vs attack | `startSwordSlash()` refuses while `dodgeTimer > 0`; `startDodge()` clears `isAttacking`/charge, so a dodge cancels a swing. |
| Golem tell | `jumpTimer` at 3.18 → windup **0.60** with a pending payload on the next frame; the payload fired ~0.6 s later and dealt **30–37** damage inside range. Contact damage is skipped during the tell. |
| Lich tell | `castTimer` fires a **0.48 s** tell; the 3-way fan appears after it, not before. |
| Eclipse tell | Phase-1 orb ring shows a **0.43 s** tell, then spawns 6 projectiles. |
| Tell render | Canvas capture shows the red `!` and the ring above the boss (see `screens/verify_boss_tell.png`). The golem passes a **62 px** radius so its ring is the real quake range, not a decorative shrink (`screens/verify_v070_tell_radius.png`). |
| Touch DASH | `pointerdown` on the `data-key="ShiftLeft"` button starts a dodge (0.22 timer, 0.55 cooldown) exactly like Shift. The d-pad swaps menu tabs through ArrowLeft/ArrowRight. |
| Automap | Walked the mines entry quadrant: 126 tiles surveyed (11% of 36×32), hero marker on the current tile, floors/walls distinct. Screenshot: `screens/verify_automap_final.png`. |
| Automap persistence | Saved slot 1 with 80 tiles surveyed, moved away, loaded through the menu: position and exact 80-tile survey restored. Save JSON contains `exploration`; old saves without it load with a blank map. |
| Tabs | `Tab` cycles 0 → 1 → 2 → 3 → 0 and `Q` reverses; SAVE remains index 2 (save/load and `T` still work); four labels fit the 130 px pane with no overlap. |
| New Game | `resetMapExploration()` clears the survey; dodge fields reset to 0. |

---

## 11A. Improvement roadmap (updated 2026-10-25)

A design pass over the whole game, not just the side content. Items are ordered by how
much they change the moment-to-moment experience. Status values: **done**, **next**,
**backlog**.

**v0.8.0 shipped items 5 and 7, the promise-debt half of item 6, and three bugs that came
out of playtesting:** the flat overhead pass (8), the flat slash arc (9), and the manual
twilight toggle. **v0.9.0 completed item 4** with all three dungeon verbs — the mines
cart, the crypt veil and brazier circuit, and the shrine's receding basins. **v0.10.0
completes item 10** with the dash-stamina pool, shipped together with the enemy pass it
needed: 0.62 DEF mitigation, 0.75 s post-hit i-frames, a slower boss cadence and
dual-purpose potions.

| # | Improvement | Why it matters | Status |
| --- | --- | --- | --- |
| 1 | **Dodge step with i-frames.** `Shift` / touch `DASH`, ~0.2 s of invulnerability, 0.30 s re-fire gate, cancels attack recovery. | Before this the only defence was walking out of range: `hero.invulnTimer` was set only by taking damage. Bosses fire 3-way fans and 6–8 orb rings, so every fight was a potion race. This is the single biggest feel change. | **done (v0.7.0)** |
| 2 | **Boss wind-ups + real GROUND SHAKE.** 0.35–0.6 s committed tell (flash, sound, stop) before each attack resolves; the golem's signature move must actually hit. | Attacks fired the instant a timer expired, so patterns were unreadable. `GROUND SHAKE!` spawned four particles and dealt zero damage, which taught players to ignore boss tells. | **done (v0.7.0)** |
| 3 | **Fog-of-war automap.** Visited tiles per map, persisted in the save, drawn as a fourth `MAP` tab in the status menu (36×32 maps at 3 px/tile). | The game has 36×32 dungeons and no map at all; the quest log says *what*, never *where*. Period-correct (Ys shipped maps) and removes the main reason players stall. | **done (v0.7.0)** |
| 4 | **Give each dungeon its own verb.** Mines: cart hazard/ride. Crypts: darkness with brazier light radius. Shrine: water level changes collision. | All three dungeons are the same 36×32 quadrant plan with a boss at `(26,7)` and a two-switch gate. Mines: the released cart smashes the barricade and the parked cart is a ride/weapon. Crypts: the hero, each burning bowl and winding-up monsters are the only light; the ward completion wakes every bowl for the boss. Shrine: five basins are solid at high water, shallow after valve 1 and dry after valve 2. | **done (v0.9.0)** |
| 5 | **Dialogue backlog.** Scrollable last 80 lines on `L`, with speaker tags, wrapping, a scrollbar and a paused world. | The best content is missable; one stray Space loses a scene with no way to re-read it. The log records branch lines and inspectables too, because it is fed from every `startDialogue` / `startCustomDialogueTree` / `advanceDialogue` transition. | **done (v0.8.0)** |
| 6 | **Boss rewards that change play, and promise-debt fixes.** Flame Edge's 1.3× vs undead, the ribbon's crit text, the duplicate armor, and a signature drop for every boss: Clerici's Mail (Leviathan), Crusher's Core (Golem), Grave Lantern (Lich), Crown of the Dawn (Eclipse). | Flame Edge's advertised undead bonus was unimplemented, the ribbon advertised 15% while rolling 25%, the 200 G Chain Hauberk was identical to a free chest, and Clerici's Mail was defined but unobtainable. The four drops are mechanics, not stat sticks — see the v0.8.1 fix log. | **done (v0.8.1)** |
| 7 | **Level curve sanity.** One full clear is ~5,756 EXP → level 12 at the final boss; level 20 needs 48,587. | Levels 13–20 are unreachable in normal play, so the late curve is decorative. Either accept 12 as the ceiling and tune the last boss to it, or flatten the requirement curve. | **done (v0.8.0)** |
| 8 | **Depth-sort the overhead layer.** Awnings, tree canopies and roof eaves draw as one flat pass over every entity, so standing in front of a market stall puts the canopy over the hero's head and hides the counter entirely. | Rendering, not design: every overhead tile is painted last regardless of who is in front of it. Sorting them by their bottom edge fixes the stall, and the same rule makes trees and eaves behave. The stall gap tile is also sealed so the player cannot stand inside a canopy. | **done (v0.8.0)** |
| 9 | **Sword swing feel.** Wider three-crescent arc with a blade-tip flare, a one-frame hero smear, swing-trail sparks, and a radial impact burst in the weapon's colour. | The attack was a single flat curve with one glint, and a hit only flipped the monster white. This is the most-used animation in the game and it deserved to read as a real swing. A 1–2 frame hitstop was considered and skipped: it changes combat timing, which needs its own balance pass. | **done (v0.8.0)** |
| 10 | **Dash stamina.** Replace the pure cooldown with a stamina pool so dodge spam has a cost. | A full pool is 100; a step costs 34 and regen is 28/s after a 0.35 s beat, so two steps fit and the third waits. Kills return 18 and potions restore 25/50. The compensating enemy pass is part of the same version: 0.62 DEF mitigation, 0.75 s post-hit i-frames, a slower boss cadence, and the Eclipse phase-2 orbit-ring fix. | **done (v0.10.0)** |

Two related findings that are bugs rather than design items:

- **Fifi stays behind while leashed — this is intended.** `flags.fifiLeashedInManor` is
  honoured by the renderer, the companion update and `tryInteract`, so leaving the Manor
  while leashed keeps her at the bedroom post, skips her healer/bolt logic and removes her
  from interaction range outside. The player must walk back to the Manor and unclip her.
  An earlier version of this list called that a bug; it is not. The save keeps the flag,
  `refreshWorldAfterLoad()` keeps her off-screen outside, and `startNewGame()` clears it.
- ~~The shop's Chain Hauberk and the mines' Silver Breastplate are both 24 DEF, so one of
  them is a wasted purchase.~~ **Fixed in v0.8.0:** the Hauberk is 30 DEF for its 200 G.

Rule for this list: do not stack a new system on top of a broken one. Combat feel first,
then navigation, then content breadth.

---

## 12. Do not regress

- **Do not** slice the dialogue prompt to make room for choices.
- **Do not** open a boss gate by setting one or two map tiles manually; call `setBossGateTiles`.
- **Do not** put a puzzle switch inside the room it unlocks (shrine valve 2 / crypt lever 3
  are reached through the shortcut, which is why valve 1 / lever 2 open it).
- **Do not** serialize map layers or monster arrays into saves.
- **Do not** give Space a second meaning in gameplay; it is the attack button.
- **Do not** let a `data-key`-less touch button fall through to `Space`.
- **Do not** regenerate `00_v5_assets_bundle.js` by hand; it is generated base64 data.
- **Do not** fire a boss attack straight off its cooldown timer. Route it through
  `telegraphMonsterAttack`; a tell that resolves instantly is the bug this pass fixed.
- **Do not** skip the `m.windup` early-return in the monster AI loop. It is what freezes
  the monster (and its contact damage) while the tell plays.
- **Do not** draw unexplored tiles on the automap, and do not store the survey anywhere
  except `mapExploration` / the save's `exploration` key.
- **Do not** reorder the status tabs. SAVE must stay at index 2 and MAP at 3.
- **Do not** move overhead tiles back into a flat pass. They belong in the y-sorted list
  with `yBaseline = (ty + 1) * 16 - 1`, or canopies and eaves paint over the hero again.
- **Do not** put an awning on a walkable tile. If the player can stand in the tile, the
  canopy has to be drawn behind them, and there is no clean depth for "inside".
- **Do not** move the crypt darkness pass after particles, projectiles, dialogue or HUD.
  It belongs at the end of the sorted world so tell rings and UI stay readable; move it
  later and a boss wind-up disappears under the veil.
- **Do not** kindle a crypt brazier by writing only its map tile. Update
  `dungeonState.cryptBraziers`, keep `cryptsBraziersLit` consistent and call
  `buildAllMaps()`; the save and the light pass both read the array.
- **Do not** place a crypt brazier inside the boss sanctum. The gate seals that
  quadrant until the levers are pulled, so an eight-of-eight run becomes impossible.
- **Do not** open the shrine boss gate from `shrineWaterLevel`. Valve 1 is the shortcut;
  only `shrineValve1 && shrineValve2` (or the drained aggregate) opens the sanctum.
- **Do not** patch the shrine shortcut or gate tiles by hand after a valve. Write
  `dungeonState` and call `buildAllMaps()`; the water level, shortcut and gate all derive
  from that state.
- **Do not** add a high-water basin without leaving a dry route around it. The five basins
  sit in room centres; the critical passages, valves, chests, switch and save crystal are
  carved out so the flooded shrine cannot seal its own puzzle.
- **Do not** serialize the mines cart or its run. Only `dungeonState` persists; the cart
  is rebuilt at the bottom of the rail on load.
- **Do not** let a dodge fire or spend the cooldown when stamina is below 34. The refusal
  is free; a refused step that eats a charge makes the pool feel broken.
- **Do not** serialize stamina. It is transient; `refreshWorldAfterLoad()` refills it on
  load and New Game, and a level-up refills it in place.
- **Do not** let an enemy attack fire straight off a cadence timer. Keep routing it
  through `telegraphMonsterAttack`, and keep the v0.10.0 cadences paired with the 34-cost
  pool; reverting one without the other re-creates the potion race.
- **Do not** restore the Eclipse phase-2 orbit timer to a read-only check. It must tick
  `orbTimer` before testing it, or the 8-orb ring silently never fires.
- **Do not** say the crypt braziers open the boss gate. They light the dark; the three
  skull levers raise the portcullis.
- **Do not** let the third skull lever leave the bowls cold. The ward completion wakes all
  eight so the Lich fight is readable.
- **Do not** assign `flags.isTwilight` directly outside `setTimeOfDay()`. The palette,
  NPC schedules, map rebuild and header badge all hang off that funnel.
- **Do not** show a dialogue line without going through `recordDialogueLine()`. It is the
  only writer of the backlog, and a branch that bypasses it becomes unreplayable text.
- **Do not** retune `getExpForLevel()` without re-summing levels 1–19 against the ~5,750
  EXP of a full clear; the old curve hid two-thirds of the level range.
- **Do not** describe a weapon bonus the damage code does not apply. Flame Edge and the
  Crimson Ribbon both shipped as lies once; check the multiplier, not the description.
- **Do not** auto-unclip Fifi when the player leaves the Manor. Staying behind while
  `fifiLeashedInManor` is set is the designed consequence; the way out is the Manor post.
- **Do not** switch projectile or line-of-sight wall checks back to `checkCollision()`.
  Projectiles and LOS rays use `isPointSolid()` so they are not shifted by the hero foot hitbox.
- **Do not** award TP, knockback, or hit sparks after a parried `skeleton_knight` swing
  (`dmg === 0`), and keep chase paused while `m.staggerTimer > 0`.
- **Do not** allow `triggerMaidTwinStarburst()` (manual `[C]` or auto-100TP trigger) to
  fire before `flags.nyahJoinedParty` is set.
- **Do not** bypass `toggleStatusMenu()` overlay checks (`dialogueLogState.open`, cinema
  states) or drop `clearHeldInputs()` on window `blur` / `visibilitychange`.
- **Do not** teleport `shadow_guard` or `boss_eclipse` onto solid tiles without
  `pickOpenTeleportPos()`, or grant the 3rd relic without calling `unlockSpireIfAllRelics()`.
- **Do not** recreate `#vuBar0..6` segments on every frame, re-allocate WebGL light typed
  arrays in the render loop, leave `#glLightCanvas` uncleared on Title/Cinemas, or spawn
  `playVoiceBlip` oscillators without `onended` disconnect cleanup.

---

## 13. Character canon (writing & new art)

These notes come from the image-generation and persona prompts used for the cast. Keep new
dialogue and portraits consistent with them.

**Fifi** — gentle, polite, bashful canine junior maid. Dusty-brown braided hair, soft floppy
puppy ears, warm brown eyes, fluffy tail. Black maid dress, frilled white apron and headband,
brown collar with a "Fifi" tag, white stockings and black Mary Janes. She is a human with dog
ears and a tail: **human nose, no muzzle, no whiskers, no paws**, two arms and two legs.

**Nyah** — mischievous catgirl maid, adult, glossy black twintails, black cat ears, golden
slit-pupil eyes, a small fang, black choker with a silver bell, black maid dress with white
apron, black tail with a satin bow and bell. Black nail polish and a double-layered silver
heart anklet on her **right** ankle, visible whenever she is barefoot. Same anatomy rule:
only the ears and tail are animal; human nose, hands, feet and posture, no muzzle or paws.

**Voice.** Nyah calls Adol "Master", refers to herself as "nyah" as often as "I", and talks
like someone typing fast in a chat: lower-case, run-ons, interruptions, sudden CAPS, smug
possessiveness, petty jealousy, and abrupt tenderness. She is the dominant, yandere half of
the pair and will absolutely take charge of Fifi, or of Adol when she has convinced herself
it is "for his own good"; play that as romantic tension and comedy, never as actual loss of
his autonomy. She is devoted but never a yes-woman, and stays sharp when the topic is
technical. She does not sound like a customer-service bot: no "certainly!", no "how can I
help?", no em dashes, no "bro/dude/man". Fifi is the submissive one: earnest, flustered,
supportive, eager to be praised and guided, and proud of small domestic wins. She is shy,
not stupid, and her devotion should read as chosen affection rather than a lack of agency.

**In-game constraints.** Dialogue renders in a 28-character window (25 for choices) and a
six-line page. Keep spoken lines short and punchy; put long rants in optional banter or
split them across lines. Do not paste the full persona prompt into a text box, and do not
add stage directions to every line just to remind the player they have ears.

---

## 14. A note for whoever picks this up next

Dear future AI (or human with very AI-like stamina),

Welcome to Aldenor. The tea is hot, the bell is broken, and the catgirl is judging you.
This codebase is a 1993 console game wearing a 2026 browser as a trench coat: no build
step, no framework, just seven scripts holding hands in global scope. That is a feature.
Treat it gently and it will let you move very fast.

A few things worth knowing before you start typing:

- The map builders are the truth. If a gate looks wrong, draw the quadrants on paper first;
  every dungeon is the same four rooms and two doors, just with different wallpaper.
- If something "works in isolation but not in game", you probably collided with a global
  name or depended on load order. It is almost never a browser bug.
- When you fix a bug, add one line to the Fix Log and one line to the checklist. Future you
  will be tired and will not remember why the portcullis has two entrances.
- Back up before big edits (`backups/`), check syntax after every file, and play the thing.
  A green `node --check` only proves the braces match, not that Nyah can reach the bell.

Nyah says: *"Don't break my Manor, don't skip my tea, and if you must refactor, do it
quietly while Fifi is asleep."* Fifi says: *"Master will do great! Probably! Fifi believes
in you!"*

Now go ring that bell.

```
   /\_/\
  ( o.o )   <- Nyah, supervising
   > ^ <
```
