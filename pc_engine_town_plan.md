# Project Ys-Engine: 90s PC-Engine CD Fantasy Town Exploration Game (V2 Revision)
## Direct Implementation Specification & Prompt for Gemini 3.8 Flash (Standard Mode — No `/boost`)

> [!IMPORTANT]
> **Execution Mode:** Direct Single-Pass Implementation (No `/boost`).
> **Target Output:** Overwrite `index.html` in the workspace root (`g:\Codex stuff\Games\Retronyah\index.html`) as a single standalone, zero-dependency HTML5 file.
> **Why V2 Exists:** This specification fixes the 6 concrete visual and gameplay bugs observed in the V1 build:
> 1. **100% Zoom Postage-Stamp Bug:** V1 left `#viewport` at `width: auto; height: auto` inside a flex box, shrinking the game to a tiny 256×224 square in a giant black void at 100% desktop zoom.
> 2. **Fake Vector Polygon Portraits ("Triangle-Head Elf" Bug):** V1 used anti-aliased Canvas 2D vector paths (`ctx.beginPath()`, `ctx.lineTo()`, `ctx.ellipse()`) for portraits, which looks like flat N64/Flash polygons instead of pixel art. **Vector path drawing is now STRICTLY FORBIDDEN for portraits.** All portraits MUST use the 32×32 pure pixel-grid bitmap matrices defined in Section 3.1 (rendered via `putImageData` and scaled 2× nearest-neighbor to 64×64).
> 3. **Walking On Top of Doors Bug:** V1 set `solid = 0` on closed `oakDoor` tiles (`my === 5`, `ay === 9`, `ty === 20`), allowing the player to stand directly on top of the vertical door graphics. **All building walls AND closed doors MUST have `solid = 1`.**
> 4. **Mobile & 400%-Zoom Control Overlap Bug:** V1 used `@media (max-width: 768px)` and `position: absolute; bottom: 12px` for `#mobileControls`, causing virtual buttons to overlap the bottom footer bar and appear on desktop when zoomed in.
> 5. **Tiny Stick-Block Chibi Sprites:** V1 made character sprites only 8px wide with 1px dot eyes. V2 provides full-width 12–14px SD chibi 16×16 sprite matrices with 2px tall anime eyes, multi-tone hair shading, and distinct silhouettes.
> 6. **Noisy High-Contrast Cobblestone Grid & Broccoli Lamp Posts:** V1 used black sprite outlines (`1`) and white specular dots (`5`) inside every cobblestone brick, and drew green circles on brown sticks for lamp posts. V2 replaces these with low-contrast, cohesive 90s PC-Engine tile matrices.

---

## 1. Viewport Scaling, Responsive Cabinet & Mobile Layout Fixes

### 1.1 Fix #1: Desktop 100% Zoom Full-Cabinet Scaling (`resizeViewport()`)
Do **NOT** leave `#viewport` with `width: auto; height: auto;`. The 256×224 native canvas (`#gameCanvas`) must automatically scale up to fill `#screenWrapper` at 100% browser zoom while preserving the exact `256 : 224` (`8 : 7`) aspect ratio and crisp nearest-neighbor pixels:

```javascript
function resizeViewport() {
  const wrapper = document.getElementById('screenWrapper');
  const viewport = document.getElementById('viewport');
  if (!wrapper || !viewport) return;
  const availW = wrapper.clientWidth - 8;
  const availH = wrapper.clientHeight - 8;
  // Prefer integer scale (2x, 3x, 4x) when it fills >=70% of wrapper, otherwise exact aspect fit
  const exactScale = Math.min(availW / 256, availH / 224);
  const intScale = Math.floor(exactScale);
  const scale = (intScale >= 1 && (intScale / exactScale) >= 0.72) ? intScale : Math.max(0.5, exactScale);
  viewport.style.width = `${Math.floor(256 * scale)}px`;
  viewport.style.height = `${Math.floor(224 * scale)}px`;
}
window.addEventListener('resize', resizeViewport);
window.addEventListener('DOMContentLoaded', resizeViewport);
```

### 1.2 Fix #2: Touch Controls & `100dvh` Safe Layout (No Cutoff or Overlap)
* Set `#cabinetContainer` to `height: 100dvh; max-height: 100dvh; padding: 6px 10px env(safe-area-inset-bottom, 8px);`.
* **Never trigger `#mobileControls` via `(max-width: 768px)`** (which falsely triggers when a desktop user zooms their browser to 400%). Trigger touch controls **ONLY** via `@media (hover: none) and (pointer: coarse)`.
* Inside `@media (hover: none) and (pointer: coarse)`:
  * Hide `footer#bottomBar` (`display: none`) so keyboard shortcut badges don't clutter phone screens.
  * Render `#mobileControls` as a dedicated flex row **below `#screenWrapper`** (`position: relative; height: 116px; flex-shrink: 0; padding: 6px 20px; display: flex; justify-content: space-between; align-items: center; background: #10101c; border: 2px solid #363654; border-top: none; border-radius: 0 0 6px 6px;`) so the D-Pad and `(I)` button are **never** cut off at the bottom of a phone screen and **never** cover the game canvas!

---

## 2. True 90s PC-Engine Tile & 16×16 SD Chibi Sprite Matrices

### 2.1 Cohesive VCE 9-Bit Palettes (`PAL_MAP`)
Use `VCE_STEPS = [0, 36, 73, 109, 146, 182, 219, 255]` (`vceRgba(r3, g3, b3)`).
Ensure ground tiles use **soft, low-contrast mortar** (`vceRgba(3,3,4)` in Midday, `vceRgba(1,1,3)` in Twilight) rather than dark sprite outlines so sprites pop clearly against the streets:

```javascript
const OUTLINE_RGBA = vceRgba(1, 1, 2); // #242449 Dark Navy-Slate Sprite Outline

const PAL_MAP = {
  cobbleMidday: [
    [0,0,0,0], OUTLINE_RGBA,
    vceRgba(4,4,5), // 2: Stone base
    vceRgba(5,5,6), // 3: Stone light face
    vceRgba(3,3,4), // 4: Soft mortar line (NOT black!)
    vceRgba(6,6,6), // 5: Subtle top edge
    vceRgba(2,2,3), // 6: Deep crevice
    vceRgba(6,5,3), // 7: Warm plaza sandstone
    vceRgba(5,4,2), // 8: Plaza mortar
    vceRgba(7,6,4), // 9: Plaza highlight
    vceRgba(7,6,1), // A: Gold trim
    vceRgba(7,7,7), [0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]
  ],
  cobbleTwilight: [
    [0,0,0,0], OUTLINE_RGBA,
    vceRgba(2,2,4), // 2: Dusk stone base
    vceRgba(3,3,5), // 3: Dusk stone light
    vceRgba(1,1,3), // 4: Dusk mortar
    vceRgba(4,4,6), // 5: Dusk highlight
    vceRgba(1,1,2), // 6: Deep crevice
    vceRgba(3,2,4), // 7: Dusk plaza
    vceRgba(2,1,3), // 8: Dusk plaza mortar
    vceRgba(4,3,5), // 9: Dusk plaza highlight
    vceRgba(5,4,1), // A: Muted gold trim
    vceRgba(5,5,7), [0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]
  ],
  // Keep grassMidday/grassTwilight, stoneMidday/stoneTwilight, waterMidday/waterTwilight, marketMidday/marketTwilight
  charPalette: [
    [0,0,0,0],       // 0: Transparent
    OUTLINE_RGBA,    // 1: Dark navy-slate outline (1,1,2)
    vceRgba(7,1,1),  // 2: Bright crimson red (Hero hair / ruby / ribbons)
    vceRgba(5,0,1),  // 3: Dark crimson shadow
    vceRgba(1,4,7),  // 4: Cobalt blue armor / tunic
    vceRgba(0,2,5),  // 5: Deep navy armor shadow / Nyah hair highlight
    vceRgba(7,6,5),  // 6: Fair anime skin
    vceRgba(6,4,3),  // 7: Warm skin shadow / boots
    vceRgba(7,7,7),  // 8: Pure white (eye sclera, maid apron, fangs)
    vceRgba(5,5,6),  // 9: Silver-grey frill shadow / steel
    vceRgba(7,6,1),  // A: Bright gold (Nyah eyes, bell, blonde hair)
    vceRgba(5,4,0),  // B: Dark gold / bronze / oak staff
    vceRgba(1,6,2),  // C: Emerald green (Lumina tunic & eyes)
    vceRgba(0,4,1),  // D: Forest green shadow
    vceRgba(2,2,3),  // E: Glossy jet-black hair (Nyah hair base)
    vceRgba(7,4,5)   // F: Pastel pink (cat inner ears & cheek blush)
  ]
};
```

### 2.2 Upgraded Low-Noise Environment Tiles (`TILE_HEX`)
Use these exact 16×16 hex matrices for `cobble1`, `cobble2`, `plaza`, `roofTile`, `oakDoor`, and `lampPost` so the town looks like an authentic 16-bit PC-Engine RPG:

```javascript
// Soft, rounded cobblestone without black grid lines:
cobble1: [
  "4444444444444444",
  "4333322443332224",
  "4355332443533224",
  "4222226442222264",
  "4444444444444444",
  "4224433332244334",
  "4224435533244354",
  "4264422222644224",
  "4444444444444444",
  "4333222443333224",
  "4353322443553324",
  "4222226442222264",
  "4444444444444444",
  "4224433322244334",
  "4264422222644224",
  "4444444444444444"
],
cobble2: [
  "4444444444444444",
  "4333222443333224",
  "4353322443533224",
  "4222226442222264",
  "4444444444444444",
  "4224433322244334",
  "4224435332244354",
  "4264422222644224",
  "4444444444444444",
  "4333322443332224",
  "4355332443533224",
  "4222226442222264",
  "4444444444444444",
  "4224433332244334",
  "4264422222644224",
  "4444444444444444"
],
// Warm sandstone plaza flagstones (uses indices 7, 8, 9):
plaza: [
  "8888888888888888",
  "8999997889999978",
  "8977777889777778",
  "8977777889777778",
  "8977777889777778",
  "8977777889777778",
  "8777774887777748",
  "8888888888888888",
  "8888888888888888",
  "8999997889999978",
  "8977777889777778",
  "8977777889777778",
  "8977777889777778",
  "8977777889777778",
  "8777774887777748",
  "8888888888888888"
],
// Scalloped Terra-cotta Roof Tiles (uses stoneMidday/stoneTwilight: 6=red, 7=dark red, 8=highlight, 1=outline):
roofTile: [
  "1777177717771777",
  "6886688668866886",
  "6666666666666666",
  "7667766776677667",
  "1111111111111111",
  "7717771777177717",
  "8668866886688668",
  "6666666666666666",
  "6776677667766776",
  "1111111111111111",
  "1777177717771777",
  "6886688668866886",
  "6666666666666666",
  "7667766776677667",
  "1111111111111111",
  "4444444444444444"
],
// Ornate Wrought-Iron & Glowing Glass Street Lamp (uses marketMidday/marketTwilight: 1=iron, 6=gold glow, 3=white core):
lampPost: [
  "0000000110000000",
  "0000011111100000",
  "0000166336610000",
  "0000163333610000",
  "0000166336610000",
  "0000011661100000",
  "0000001111000000",
  "0000000110000000",
  "0000000110000000",
  "0000000110000000",
  "0000000110000000",
  "0000000110000000",
  "0000001111000000",
  "0000011991100000",
  "0000119999110000",
  "0000111111110000"
]
```

### 2.3 Full-Proportion 16×16 SD Chibi Character Sprites (`SPRITE_HEX`)
Use these expressive, full-width 90s PC-Engine chibi sprites (with 2px tall anime eyes, hair shading, and distinct silhouettes):

```javascript
const SPRITE_HEX = {
  // Hero (Adol-style Red-Haired Swordsman in Blue & Silver Armor)
  heroDown0: [
    "0001111111111000",
    "0012222222222100",
    "0122282222822210",
    "0123222222223210",
    "0126626666266210",
    "0166186666816610",
    "0166146666416610",
    "0016666776666100",
    "0011884444881100",
    "0144894444984410",
    "0166144AA4416610",
    "0011155445511100",
    "0001558888551000",
    "0001771001771000",
    "0001771001771000",
    "0000110000110000"
  ],
  heroDown1: [
    "0001111111111000",
    "0012222222222100",
    "0122282222822210",
    "0123222222223210",
    "0126626666266210",
    "0166186666816610",
    "0166146666416610",
    "0016666776666100",
    "0011884444881100",
    "0144894444984410",
    "0166144AA4416610",
    "0011155445511100",
    "0017758888510000",
    "0017710001771000",
    "0001100001771000",
    "0000000000110000"
  ],
  heroDown2: [
    "0001111111111000",
    "0012222222222100",
    "0122282222822210",
    "0123222222223210",
    "0126626666266210",
    "0166186666816610",
    "0166146666416610",
    "0016666776666100",
    "0011884444881100",
    "0144894444984410",
    "0166144AA4416610",
    "0011155445511100",
    "0000158888577100",
    "0001771000177100",
    "0001771000011000",
    "0000110000000000"
  ],
  heroUp0: [
    "0001111111111000",
    "0012222222222100",
    "0122282222822210",
    "0122222222222210",
    "0123222222223210",
    "0123322222233210",
    "0013333333333100",
    "0011884444881100",
    "0144444444444410",
    "0144554444554410",
    "0166155445516610",
    "0011155555511100",
    "0001554444551000",
    "0001771001771000",
    "0001771001771000",
    "0000110000110000"
  ],
  heroUp1: [
    "0001111111111000",
    "0012222222222100",
    "0122282222822210",
    "0122222222222210",
    "0123222222223210",
    "0123322222233210",
    "0013333333333100",
    "0011884444881100",
    "0144444444444410",
    "0144554444554410",
    "0166155445516610",
    "0011155555511100",
    "0017754444510000",
    "0017710001771000",
    "0001100001771000",
    "0000000000110000"
  ],
  heroUp2: [
    "0001111111111000",
    "0012222222222100",
    "0122282222822210",
    "0122222222222210",
    "0123222222223210",
    "0123322222233210",
    "0013333333333100",
    "0011884444881100",
    "0144444444444410",
    "0144554444554410",
    "0166155445516610",
    "0011155555511100",
    "0000154444577100",
    "0001771000177100",
    "0001771000011000",
    "0000110000000000"
  ],
  heroLeft0: [
    "0001111111110000",
    "0012222222221000",
    "0122282222222100",
    "0126666222232100",
    "0161866622332100",
    "0161466623331000",
    "0016667661110000",
    "0001144884410000",
    "0001448984410000",
    "0001446644410000",
    "0001551155510000",
    "0001888885510000",
    "0000144444100000",
    "0000177771000000",
    "0000177771000000",
    "0000011110000000"
  ],
  heroLeft1: [
    "0001111111110000",
    "0012222222221000",
    "0122282222222100",
    "0126666222232100",
    "0161866622332100",
    "0161466623331000",
    "0016667661110000",
    "0001144884410000",
    "0001448984410000",
    "0001446644410000",
    "0001551155510000",
    "0001888885510000",
    "0001444144410000",
    "0017771017771000",
    "0001110001110000",
    "0000000000000000"
  ],
  heroLeft2: [
    "0001111111110000",
    "0012222222221000",
    "0122282222222100",
    "0126666222232100",
    "0161866622332100",
    "0161466623331000",
    "0016667661110000",
    "0001144884410000",
    "0001448984410000",
    "0001446644410000",
    "0001551155510000",
    "0001888885510000",
    "0014441014441000",
    "0017771001777100",
    "0001110000111000",
    "0000000000000000"
  ],

  // Nyah: Catgirl Maid (Black cat ears, twin-tails, white maid headband, golden eyes, bell choker, flared maid dress)
  nyahIdle0: [
    "0011000000001100",
    "01EF11111111FE10",
    "01EE88988988EE10",
    "1EE1EEEEEEEE1EE1",
    "1E51EE6666EE15E1",
    "1EE1618668161EE1",
    "1EE161A66A161EE1",
    "01116F6666F61110",
    "0000111AA1110000",
    "0001EE8888EE1000",
    "001EE188881EE100",
    "0016618998166100",
    "0011888888881100",
    "0001998888991000",
    "0000188118810000",
    "0000111001110000"
  ],
  nyahIdle1: [
    "0001100000011000",
    "001EF111111FE100",
    "01EE88988988EE10",
    "1EE1EEEEEEEE1EE1",
    "1E51EE6666EE15E1",
    "1EE1618668161EE1",
    "1EE161A66A161EE1",
    "01116F6666F61110",
    "0000111AA1110000",
    "0001EE8888EE1000",
    "001EE188881EE110",
    "00166189981661E1",
    "00118888888811E1",
    "0001998888991E10",
    "0000188118811100",
    "0000111001110000"
  ],

  // Lumina: Blonde Elf Apothecary (Blonde braids, pointed elf ears, emerald eyes, green/white alchemy dress)
  lumina0: [
    "0001111111111000",
    "001AAAAAAAAAA100",
    "01AA88AAAA88AA10",
    "11AAB666666BAA11",
    "1661618668161661",
    "011161C66C161110",
    "001A16677661A100",
    "001A11822811A100",
    "0011CC8888CC1100",
    "01CCCC8998CCCC10",
    "01661CCCCCC16610",
    "0011CCCCCCCC1100",
    "0001CCDDDDCC1000",
    "0001771001771000",
    "0001771001771000",
    "0000110000110000"
  ],

  // Town Elder (White beard, sage robe, oak staff)
  elder0: [
    "0001111111111000",
    "0018888888888100",
    "0188998888998810",
    "0189666666669810",
    "0186186666816810",
    "0116668888666110",
    "01B1888998881100",
    "01B1338888331000",
    "01B1333AA3333100",
    "01B1663333663100",
    "01B1333AA3331000",
    "01B1333333331000",
    "01B1339999331000",
    "01B1771001771000",
    "01B1771001771000",
    "0010110000110000"
  ],

  // Town Guard (Crested bronze helm, breastplate, halberd)
  guard0: [
    "0000012222100000",
    "000111AAAA111000",
    "001AA8AAAA8AA100",
    "011BBBBBBBBBB110",
    "0191618668161000",
    "0181666776661000",
    "01B111AAAA111000",
    "01B1AA8888AA1100",
    "01B1AAAAAAAAA100",
    "01B166BBBB661000",
    "01B144AAAA441000",
    "01B1445555441000",
    "01B1991001991000",
    "01B1771001771000",
    "01B1771001771000",
    "0010110000110000"
  ],

  // Village Child (Spiky chestnut hair, green tunic)
  child0: [
    "0000000000000000",
    "0001111111111000",
    "0017772222777100",
    "0177227777227710",
    "0176676666766710",
    "0166186666816610",
    "0166146666416610",
    "0016F666666F6100",
    "00011CCCCCC11000",
    "001CCCD88DCCC100",
    "00166CCCCCC66100",
    "00011BBBBBB11000",
    "0000166116610000",
    "0000177117710000",
    "0000011001100000",
    "0000000000000000"
  ]
};
```

---

## 3. True Pixel-Art 32×32 Portrait Matrices (Scaled 2× Nearest-Neighbor to 64×64)

> [!CAUTION]
> **STRICT ANTI-VECTOR RULE FOR PORTRAITS:**
> Do **NOT** use `ctx.beginPath()`, `ctx.lineTo()`, `ctx.fill()`, `ctx.arc()`, or `ctx.ellipse()` anywhere in the portrait renderer! Canvas 2D vector primitives create blurry anti-aliased polygons ("Triangle-Head Elf").
> Instead, compile every portrait from a **32×32 Hex/Char Matrix** into a `32×32` `ImageData` buffer using `putImageData`, then draw that `32×32` canvas into the `64×64` cut-in frame (`ctx.drawImage(portraitCanvas, px, py, 64, 64)`) with `ctx.imageSmoothingEnabled = false` so every single portrait pixel is a crisp `2×2` retro pixel-art block!

### 3.1 Shared 16-Color Portrait Palette (`PORTRAIT_PAL`)
```javascript
const PORTRAIT_PAL = {
  '0': vceRgba(0, 0, 2, 255), // 0: Deep midnight blue portrait background
  '1': vceRgba(1, 1, 2, 255), // 1: Dark navy-slate pixel outline
  '2': vceRgba(1, 1, 3, 255), // 2: Nyah glossy black-indigo hair base
  '3': vceRgba(2, 2, 4, 255), // 3: Nyah hair midtone
  '4': vceRgba(4, 4, 6, 255), // 4: Hair specular highlight / steel
  '5': vceRgba(7, 6, 5, 255), // 5: Fair anime skin base
  '6': vceRgba(6, 4, 3, 255), // 6: Warm skin shadow / chestnut
  '7': vceRgba(7, 4, 4, 255), // 7: Cute anime cheek blush
  '8': vceRgba(7, 7, 7, 255), // 8: Pure white (sclera, eye glint, maid frills, fang)
  '9': vceRgba(5, 5, 6, 255), // 9: Silver-grey frill shadow
  'A': vceRgba(7, 6, 0, 255), // A: Bright golden yellow (Nyah iris, bell, Lumina blonde hair)
  'B': vceRgba(5, 4, 0, 255), // B: Deep amber gold (iris top shade, blonde hair shadow)
  'C': vceRgba(1, 6, 2, 255), // C: Bright emerald green (Lumina iris & tunic)
  'D': vceRgba(0, 4, 1, 255), // D: Forest emerald shadow
  'E': vceRgba(7, 2, 2, 255), // E: Berry red (open mouth tongue, ruby brooch, guard plume)
  'F': vceRgba(7, 4, 5, 255)  // F: Soft pink (Nyah inner cat ears)
};
```

### 3.2 Nyah's 32×32 Pixel-Art Portrait Matrix & Dynamic Expression Patches
Use this exact 32×32 pixel matrix for **Nyah** (featuring her velvety black cat ears with pink insides, frilly white maid headband, glossy twin-tails with anime highlights, big golden slit-pupil anime eyes, blush, `:3` fang smirk, black choker + gold bell, and maid apron):

```javascript
const NYAH_PORTRAIT_BASE = [
  "00000110000000000000000001100000",
  "00001221000000000000000012210000",
  "00012FF210000000000000012FF21000",
  "00012FFF2100011111100012FFF21000",
  "00122FFFF21112222221112FFFF22100",
  "00122FFFF22889888898822FFFF22100",
  "001222FF2288889889888822FF222100",
  "00012222288988888888988222221000",
  "00122332211111111111111223322100",
  "01223443222332222223322234432210",
  "01233222234443222234443222233210",
  "12232212222222222222222221223221",
  "12322122225522222222552222122321",
  "12321012255552255225555221012321",
  "12321012211115555551111221012321",
  "12221012511115555551111521012221",
  "12221012588B15555551B88521012221",
  "1232101258AA85555558AA8521012321",
  "12321012568865565556886521012321",
  "12321012277555555555577221012321",
  "12231001265555111155556210013221",
  "01221001226555555855562210012210",
  "01221000122665555556622100012210",
  "00110000011116655661111000001100",
  "00000000000112211221100000000000",
  "0000000001122658A562211000000000",
  "000000011222889AA988222110000000",
  "00000112232888811888823221100000",
  "00001223328898888889882332210000",
  "00012233228888888888882233221000",
  "00012332298889888898889223321000",
  "00011111111111111111111111111000"
];
```

* **Dynamic Expression & Animation Overrides on Nyah's 32×32 Grid:**
  * When `blink === true`: Replace rows `15..17` at cols `9..12` and `19..22` with closed lash pixels (`5555` on rows 15–16, `1111` on row 17).
  * When `expression === 'jealous'`: Angle eyebrows inward on row `14` (`5111` left, `1115` right).
  * When `expression === 'bratty'`: Wink the right eye (`cols 19..22` on rows `15..17` become `5555`, `1111`, `5555`).
  * When `expression === 'flustered'`: Widen blush on row `19` (`7775` and `5777`).
  * When `mouthOpen === true`: Replace cols `14..17` on rows `20..21` with `1EE1` (row 20, with white fang `1E81`) and `5115` (row 21).
  * When `earTwitch === true`: Shift rows `0..3` inward by 1px on each ear.

### 3.3 Lumina the Elf's 32×32 Pixel-Art Portrait Matrix (Rounded Anime Face — No Polygon Triangles!)
```javascript
const LUMINA_PORTRAIT_BASE = [
  "00000000001111111111110000000000",
  "0000000011AAAAAAAAAAAA1100000000",
  "00000001AA88AAAAAAAA88AA10000000",
  "0000001AAA888AAAAAA888AAA1000000",
  "000001AAAAABBBBBBBBBBAAAAA100000",
  "00001AAAAABAA88AA88AABAAAAA10000",
  "00001AAAABAAA8AAAA8AAABAAAA10000",
  "0001AAAAABAAAAAAAAAAAAABAAAA1000",
  "0001AAAABAAA55AAAA55AAAABAAA1000",
  "0001AAAABAA5555AA5555AAABAAA1000",
  "0011AAAABA555555555555ABAAAA1100",
  "01551AAAB55111155111155BAAA15510",
  "155F51AAB51111155111115BAA15F551",
  "0165551AB588D155551D885BA1555610",
  "00116551B58CC855558CC85B15561100",
  "00001165156886565568865156110000",
  "00001AA115775555555577511AA10000",
  "00001AAA1655551EE1555561AAA10000",
  "00001ABA1165555555555611ABA10000",
  "00001AAB1016655555566101BAA10000",
  "00001AAA1001166556611001AAA10000",
  "00001ABA1000016556100001ABA10000",
  "00011AAA1111118888111111AAA11000",
  "001CC1AA1888891EE1988881AA1CC100",
  "01CCC1BA188991E8EE199881AB1CCC10",
  "01CDCC118899991EE199998811CCDC10",
  "1CCDDCCC8999999119999998CCCDDCC1",
  "1CCDDCCCC88999988999988CCCCDDCC1",
  "1CCDDDCCCC111118811111CCCCDDDCC1",
  "1CCDDDDCCCCCCCC88CCCCCCCCDDDDCC1",
  "1CCDDDDDCCCCCCC99CCCCCCCDDDDDCC1",
  "01111111111111111111111111111110"
];
```
* Support `blink` (replace rows `13..14` at cols `10..13` and `18..21` with `5555` and `1111`) and `mouthOpen` (replace cols `14..17` on rows `17..18` with `1EE1` and `5115`).
* Also define 32×32 pixel matrices for `'elder'`, `'guard'`, and `'child'` using `PORTRAIT_PAL` so every single portrait in the game uses `putImageData` at 32×32 scaled 2× to 64×64!

---

## 4. Fix #3: Door & Building Collision Rules (No Walking On Top of Doors!)

> [!WARNING]
> In `buildAldenorMap()`, every building wall tile AND every closed `oakDoor` tile MUST have `solid = 1`!
> Specifically:
> - **Northeast Grand Manor (`my === 5`):** `setTile(mx, 5, 'carpet', isDoor ? 'oakDoor' : 'wallBase', null, 1);` (Change `isDoor ? 0 : 1` to `1`!).
> - **West Apothecary Building (`ay === 9`):** `setTile(ax, 9, 'cobble1', (ax === 6) ? 'oakDoor' : 'timberWall', null, 1);` (Change `(ax === 6) ? 0 : 1` to `1`!).
> - **South Harbor Tavern (`ty === 20`):** `setTile(tx, 20, 'cobble1', (tx === 24) ? 'oakDoor' : 'timberWall', null, 1);` (Change `(tx === 24) ? 0 : 1` to `1`!).

* **Door & Prop Inspection Bonus:** When the player presses `[Space]` or `[E]` and no NPC is within interaction range, check the tile directly in front of the Hero:
  * If facing an `oakDoor` on the **Grand Manor (`ty === 5`)**, open a 1-line cut-in with **Nyah (`'bratty'`)**: *"HEY!! don't go rattling the manor doors, Master! the lord is out and nyah is right here on the steps anyway!!"*
  * If facing the **Apothecary Door (`ty === 9`)**, open a 1-line cut-in with **Lumina**: *"My indoor workshop is locked while I run the market counter over here!"*
  * If facing the **Tavern Door (`ty === 20`)**, show a dialogue message from the **Guard**: *"The Harbor Tavern doesn't open its kegs until late night, traveler."*

---

## 5. Retained Core Architecture (Keep Intact from V1)

Keep all working systems from V1 intact when writing the updated `index.html`:
1. **HuC6280 6-Channel DFT Wavetable Synthesizer (`createHuC6280Wave`):** Keep the 32-point Discrete Fourier Transform wavetable synth, 16-bar *Ys*-style upbeat town BGM sequencer, character-specific voice blips (`1580Hz` for Nyah, `1200Hz` for Lumina), spatial fountain ambient noise bus, and PSG 7-bar VU meter HUD.
2. **Nyah & Lumina Reactive Story Dialogue (`getDialogueTree`):** Keep all 3 reactive branches for **Nyah** (Branch A when visited first, Branch B jealousy meltdown if `flags.talkedToElf` is set first, and Branch C repeat/Twilight dialogue) plus scrollable 6-line bitmap text box, instant line skip on `[Space]`/`[E]`, and `220ms` close cooldown.
3. **3-Pass Y-Sorted Renderer & Twilight Lantern Glow (`[T]` & `[C]`):** Keep the dual-atlas (`tileCanvasesMidday` / `tileCanvasesTwilight`) instant switch, additive radial lantern light cones in Twilight mode, chimney smoke & fountain particles, and high-DPI CRT scanline overlay.

---

## 6. Direct Execution Checklist for 3.8 Flash

1. Update `g:\Codex stuff\Games\Retronyah\index.html` directly (or generate via `build_game.js` and write `index.html`, then clean up any temporary test scripts if desired).
2. Verify `resizeViewport()` scales `#viewport` to fill `#screenWrapper` at 100% browser zoom (`768×672` or larger on desktop).
3. Verify `@media (hover: none) and (pointer: coarse)` places `#mobileControls` in a non-overlapping bottom deck and never triggers on desktop browser zoom.
4. Verify zero uses of `fillPixelPoly` or `fillPixelEllipse`—all 5 character portraits (`nyah`, `lumina`, `elder`, `guard`, `child`) must render from 32×32 pixel-grid matrices via `putImageData` scaled 2× nearest-neighbor to 64×64.
5. Verify `collisionMap` is `1` on all `oakDoor` tiles (`(24,5)`, `(25,5)`, `(6,9)`, `(24,20)`) so the Hero cannot walk onto any door tile.
