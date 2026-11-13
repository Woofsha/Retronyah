# PROJECT NYAH — Fix Verification, Second Pass (F1–F10)

**For:** the engineer/agent maintaining this codebase
**Date:** 2026-10-18
**Scope verified:** the fixes applied on 2026-10-18 ~02:49–02:53 to `js/04_maps_and_dungeons.js`, `js/05_story_and_banter.js`, `js/06_engine_and_ui.js`, `index.html`, `bundle_standalone.js`, `retronyah_standalone.html`
**Method:** read-only — source inspection plus the real `js/04` executed unmodified in a Node `vm` sandbox (flood-fill reachability, closed→open rebuilds, double-build diffing, decoration sweep)
**Modifications made:** none to any code file. This document supersedes the first-pass review document (replaced in place).

> **F5** (`portrait_*_talk` frames) is excluded per the project owner — it is by design, not a defect.

---

## TL;DR — verdicts

| # | Severity | Original finding | Verdict |
|---|---|---|---|
| F1 | 🔴 Critical | `setMapTile()` skipped falsy writes → no gate could ever open, rebuilds non-idempotent, mines barricade became an invisible wall | ✅ **Fixed** (semantics + builder resets + runtime sites). Two pre-existing reachability traps remain that the tile fix cannot solve — see **N1** and **N2**. |
| F2 | 🟠 Major | Desktop `C` double-bound (CRT + starburst; double cosmetic cycle in menu) | ✅ **Fixed** — `C` is single-owner, CRT moved to `V`. Stale button label left behind — see **N4**. |
| F3 | 🟠 Moderate | WebGL shader failure permanently killed the lighting overlay | ✅ **Fixed** — failing init swaps in a fresh canvas node; render fallback also self-heals. |
| F4 | 🟠 Moderate | `updateHudLevelBadge()` wiped the badge's nested spans | ✅ **Fixed** — targets `#lblHeroLv`, innerHTML rebuild only as fallback. |
| F5 | 🟠 Content | Unused `portrait_*_talk` frames | ➖ **Excluded by owner** (not a defect). |
| F6 | 🟡 Minor | Dead `dungeonState` fields (`minesCartCleared`, `cryptsBraziersLit`, `shrineWaterDrained`) | ✅ **Wired** — first two reachable in play; `cryptsBraziersLit` still only reachable via the deadlocked crypts branch (N2). Reset gap — see **N3**. |
| F7 | 🟡 Minor | Orphan `MAPS.manor_parlor` map | ✅ **Fixed** — true alias of `grand_manor_interior` (`04:173`); verified identical object at runtime. |
| F8 | 🟡 Minor | Flags schema drift | ✅ **Fixed** — defaults + `startNewGame` resets + unified `bountyProgress` seeds. Seed-key nit remains — see **N6**. |
| F9 | 🟡 Trivial | `theThree Relics`; dead `'anvil'`/`'forge Furnace'` check | ✅ **Fixed** — `05:2628`, `06:2765`. |
| F10 | 🟡 Housekeeping | Standalone freshness, v4 backup, doc drift | ✅ Standalone regenerated *after* the js edits and contains the fixes; `index_v4_backup.html` untouched (archive). Spec 144×88 drift remains (cosmetic). |

---

## How this was verified (so you can re-verify)

- `node --check` on all 7 `js/` files — all parse.
- Scratch harness (outside the repo, nothing added to the project): `%TEMP%\opencode\retronyah_verify2.js` (main) and `%TEMP%\opencode\retronyah_verify2b.js` (quad reachability). They load `js/04` into a `vm` context with stubs for `window`/`flags`, then:
  1. assert the fresh closed state of every gate;
  2. exercise the new `setMapTile` semantics directly (leave vs clear);
  3. diff two consecutive `buildAllMaps()` runs — every map, all four layers + lanterns;
  4. rebuild with progression flags set and assert open states;
  5. flood-fill walkable tiles (4-dir, `collisionMap === 0`) for reachability before/after each puzzle;
  6. sweep 30 decoration spots across all maps.
- `04` contains no `Math.random`, so builders are deterministic and results reproduce exactly.

---

## Per-finding detail

### F1 ✅ — `setMapTile()` semantics and the gate machinery

**What changed**
- `setMapTile()` (`04:183–190`) now treats `undefined` as "leave untouched" and explicit `null`/`0` as writes (the `solid` default moved off `0`).
- Every builder starts by resetting `structLayer.fill(null)`, `overheadLayer.fill(null)`, `collisionMap.fill(0)` — so rebuilds are true rebuilds.
- All runtime open sites now actually clear tiles: mines barricade + boss gate (`06:3073–3078`), mines shortcut (`06:3085–3088`), crypts lever sprites/shortcut/gate (`06:3099–3128`), shrine shortcut/gate (`06:3146–3153`), Aldenor sanctum gate (`06:2969–2970`).

**Verified empirically**
- Fresh build: every gate closed (`portcullis`/`woodBarricade`/`ironFence`, collision 1) — pass.
- Semantics: ground-only call leaves struct+solid; explicit `null`/`0` clears both — pass.
- Rebuild with open flags: all gates open, `(8,5)` → `trackRails` + walkable (the old invisible-wall bug is gone), `(26,2)` teaTable→bench per relic flags — pass.
- **Double-build is byte-identical** (zero diffs across all maps/layers) — idempotency restored.
- Mines progression in real play: both switches reachable → gate opens → quad C (save crystal, shortcut lever) reachable. Shrine: valve `(6,6)` in quad B is operable → everything opens → quad C reachable.

**Caveat:** the fix is correct; two progression traps are design-level and remain (N1, N2).

### F2 ✅ — single-owner `C`, CRT on `V`

- `keydown` listener (`06:2612–2630`) no longer handles `KeyC`; CRT is on `if (k === 'KeyV') toggleCrt();` (`06:2630`, no conflicts elsewhere).
- `C` is consumed exactly once per press: status menu → one cosmetic cycle (`06:3466`); in-game → starburst (`06:3766`). Mobile `[C]` (index.html:438) matches automatically.
- `#btnCrt` click handler still wired (`06:2729`), so CRT remains one click away.
- Leftover: the button's own label/tooltip still says `(C)`/`[C]` — N4.

### F3 ✅ — WebGL fallback

- Shader compile fail and program link fail now replace `#glLightCanvas` with a fresh clone before returning (`glInitAttempted` stays true but the visible canvas no longer holds a GL context).
- The 2D fallback (`06:368–377`) also swaps the canvas node if `getContext('2d')` returns null, then retries — so even failures after context creation recover.
- Verified by code inspection + standalone markers (`freshCanvas` present); no WebGL in the Node harness.

### F4 ✅ — HUD badge

- `updateHudBars()` writes `#lblHeroLv` (`05:359/365`); `updateHudLevelBadge()` writes `#lblHeroLv` and only rebuilds `innerHTML` if the span is missing (`05:369–374`). Markup in `index.html:362–364` intact.
- `hpFill`/`hpText`/`goldText` lookups (`05:354–356`) remain, still dead-but-guarded (as noted originally; harmless).

### F6 ✅ — dead `dungeonState` fields

- Wired: `minesCartCleared` (`06:3071`), `shrineWaterDrained` (`06:3143`), `cryptsBraziersLit` (`06:3124`).
- `minesCartCleared` and `shrineWaterDrained` are reachable in normal play; `cryptsBraziersLit`'s only setter is inside the still-unreachable all-3-levers branch (N2).
- None of the three are reset by `startNewGame` (N3).

### F7 ✅ — `manor_parlor` alias

- `04:173`: `MAPS.manor_parlor = MAPS.grand_manor_interior;` — runtime identity check passes. All `activeMapId === 'manor_parlor'` checks keep working; old saves landing on `manor_parlor` now get a built map.

### F8 ✅ — flags schema

- Defaults (`05:96–131`) now include `nyahPerks`, `nyahAffection`, `nyahCosmetic`, `tavern_pass`, `bossDefeated`, `southGateAmbushShown`.
- `startNewGame` resets them (`06:1558–1596`) and seeds `bountyProgress` identically to `05:102` (six keys, both lists now identical).
- Nit: four seed keys (`bat`, `beetle`, `skeleton`, `triton`) still don't match real type strings (`cave_bat`, `rock_beetle`, `skeleton_knight`, `armored_triton`) — inert because increments are lazy and only the slime/crab bounties are read. See N6.

### F9 ✅ — typos

- `"Ask about the Three Relics"` (`05:2628`) — fixed.
- Counter-ahead check now tests `forgeAnvil`/`forgeFurnace` (`06:2765`) — fixed.

### F10 ✅ — housekeeping

- `retronyah_standalone.html` regenerated at 02:53, after the last js edit (02:52); contains the new semantics (`ground !== undefined`, line 5569), `KeyV` (12207), `freshCanvas` (9814+), and the F9 text (8979). Version bumped to v0.5.2 in `index.html` and standalone.
- `index_v4_backup.html` untouched (10/17) — fine as an archive.
- `aldenor_v5_modular_spec.md` still documents 144×88 CGs vs 160×112 art — cosmetic, untouched.

---

## New findings

### N1 🔴 — The Bell Spire is unreachable; the game cannot be completed *(pre-existing; the F1 fix alone cannot solve it)*

The sanctum gate tiles now clear correctly, but they sit in a **sealed pocket**:

- `(24,1)`/`(25,1)` neighbors are all solid: `(23,1)`, `(26,1)`, `(24,0)`, `(25,0)` are `wallMid`; `(24,2)`, `(25,2)` are `roofTile` (the manor roof row from `04:249–252` overrides them).
- Flood-fill from town (551/832 tiles reachable): the pocket is unreachable **both closed and open**; the search finds **zero standable (tile, facing) pairs** that could trigger either entry path — the interact (`06:2960–2973`) or the step trigger (`06:3865–3879`).
- Those are the only two `startMapTransition('bell_spire', …)` sites in the codebase, and there is no direct `activeMapId` jump anywhere else.
- The spire's own exit (`06:3980`) spawns the hero at **(25,2) — a solid roof tile**; from there only the two gate tiles are walkable and the town is not reachable — returning from the spire strands the player in the pocket (escape only via quit-to-title).
- The Eclipse boss (`05:1188`, tile `(10,6)` inside `bell_spire`), the bell, the epilogue, and `flags.gameCompleted` (`05:1036`, `06:2247/2257`) are all behind this door → **normal play cannot reach the ending**.
- Pre-existing: `index_v4_backup.html` has identical gate code (5215–5218), manor loops (5244–5259) and interact condition (10459).

**Directions (pick one):**
- Relocate the gate so it borders a reachable tile: the shoulder strips `(20,2)` and `(30,2)` are reachable, and `(20,1)`/`(30,1)` are directly north of them.
- Or carve a deliberate walkable approach (roof gap + connecting alley) — note `(24..25, 3..5)` are currently manor wall/door, so a route must be designed through.
- Or move the entrance per the older spec line "Sacred Bell Spire (Northwest Town `(3,2)`)" (`aldenor_v5_modular_spec.md:230`).
- Regression test: assert at least one reachable standable tile can trigger the spire interaction.

### N2 🟡 — Crypts quad C deadlock persists *(pre-existing design trap)*

The fix made the tiles clear correctly, but the puzzle remains unsolvable:

- Reachable from the entrance (verified): lever0 `(4,20)`, lever1 `(14,4)`.
- **Unreachable:** lever2 `(32,20)`, the shortcut switch `(20,23)`, the save-crystal room `(26,25)`, and all of quad C.
- The A↔C shortcut opens only from lever2 (`06:3113–3120`) or `(20,23)` (`06:3097–3105`) — **both inside C**; the boss gate requires all three levers (`06:3122–3128`). Simulating levers 0+1 leaves the gate solid and lever2 unreachable.
- Mines and Shrine are now solvable (their C-unlockers are reachable); Crypts is the odd one out.
- Not progression-blocking: the lich and the Bell Clapper are safe — the boss spawns at `(26,7)` in quad D, reachable through the B↔D gap `(17..18, 8..9)`. The affected content is the sealed wing (crystal room, lever2, one switch) and Nyah's "pull all three skull levers" hint.
- Direction: make one of the C-unlockers reachable from outside C (move lever2 out of C, or open the shortcut from lever0/1, or make `(20,23)` reachable via D).

### N3 🟡 — `startNewGame` misses three `dungeonState` resets

`06:1600–1619` resets everything except `minesCartCleared`, `cryptsBraziersLit`, `shrineWaterDrained` (the three fields F6 just wired). Reproduction: finish the mines and shrine, return to title, start a New Game in the same session → the rebuild sees the stale `true` values and the mines gate and shrine gate start open. Fix: add three resets alongside the others.

### N4 🟡 — CRT button label stale after the key move

`index.html:386–387` still says `title="…CRT Filter (C)"` and shows `[C]`, but the real key is now `V` (`06:2630`). The footer legend (`index.html:420`) lists `C Maid Spell` (correct) but has no `V`/CRT entry. Clicking the button still works. Minor extra: `V` toggles CRT even while menus are open (same behavior the old `C` binding had — optional to guard).

### N5 🟢 — Two dead treasure branches → two unobtainable items *(pre-existing)*

- Mines `(14,8)` branch (`06:3001–3009`) grants `crimson_ribbon`, but no builder places a `chestClosed` there (mines chests: `(8,2)`, `(15,3)`).
- Crypts `(3,8)` branch (`06:3020–3027`) grants `kite_shield`; the crypts builder only has a chest at `(8,1)`.
- Neither item has another source (grep). `dungeonState.minesChestRibbon`/`cryptChestShield` can never become true in play.
- The same branches exist in the v4 backup (10500/10519), so this is inherited. Fix: add the chests or drop the branches/fields.

### N6 🟢 — Nits

- `bountyProgress` seeds: only `slime`/`crab` match real monster types; `bat`/`beetle`/`skeleton`/`triton` never match (`cave_bat`/`rock_beetle`/`skeleton_knight`/`armored_triton`). Harmless (lazy increments; only slime/crab bounties are consumed). Pick one source of truth when convenient.
- `hpFill`/`hpText`/`goldText` lookups (`05:354–356`) remain dead-but-guarded (unchanged from F4's "related dead code" note).
- Spec doc drift (144×88 vs 160×112) as before.

---

## Verified clean (regression sweep)

- All 7 `js/` files parse; no syntax fallout anywhere.
- Two consecutive `buildAllMaps()` runs → **zero diffs** across every map, all four layers, and lanterns.
- 30 decoration spot checks across all maps pass (chests, levers, valves, bell, crystals, portals, stalls, doors, furniture).
- Fresh boot: all gates closed; rebuild with flags: all gates open; `(8,5)` rails+walkable; `(26,2)` furniture swaps per relic flags.
- Mines: full progression reachable (switches → gate → C content, shortcut). Shrine: full progression reachable (B valve → everything). Both bosses reachable.
- All three dungeon bosses at `(26,7)` are reachable even with gates closed — relic collection is not gated by the gate puzzles (except N1's spire, which is a different map).
- Spire interior (chains, save crystal `(5,24)`, bell `(9–10,2)`, exits) is coherent — the problem is purely getting in (N1).
- Save/load: `dungeonState` is serialized (`05:408`) and reapplied with a full rebuild (`05:441–446`) — gate state follows the flags; verified by composition of the rebuild tests.
- Standalone regenerated after the js edits and contains all fixes; `index_v4_backup.html` untouched.

---

*End of second-pass verification. Everything the fixer was asked to change is implemented correctly; N1 (spire access) is the one item worth prioritizing next, since it makes the ending unreachable, followed by N2 (crypts deadlock).*
