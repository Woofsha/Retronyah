# Project Nyah: The Bell of Aldenor (v0.10.0)

A Falcom-inspired, PC-Engine CD-styled action RPG running directly in the browser on a 256x224 canvas with custom pixel art, WebGL/2D dynamic lighting, CRT scanlines, and Web Audio PSG synth music/SFX.

**Play Online:** https://woofsha.github.io/Retronyah/

## Features

- **Zero runtime dependencies:** Vanilla HTML5, Canvas 2D, WebGL lighting shader (with automatic 2D fallback), and Web Audio API synth with a 7-channel PSG VU meter.
- **Three-person party & Twin Starburst:** Recruit Fifi and Nyah (`The Rival Maid Trial`), cycle Nyah accessories/costumes, and trigger the `Maid Twin Starburst` combo spell at 100 TP.
- **Four dungeons & town mystery:** Minecart hazards in the Mines, brazier darkness in the Crypts, receding water basins in the Shrine, and a 3-phase climax atop the Bell Spire.
- **Built-in QoL:** Dodge step with i-frames and stamina management, fog-of-war automap (`MAP` tab), scrollable 80-line dialogue backlog (`L`), localStorage save slots + auto-save (`aldenor_save_v4`), and responsive touch controls on mobile viewports.

## Controls

| Key | Action |
| :--- | :--- |
| `W A S D` / Arrows | Move / Menu navigation |
| `Space` | Slash / Interact / Equip or Use item in Bag |
| `E` / `X` | Talk / Companion Quest Hint |
| `Z` | Slash (hold `0.6s` for Whirlwind Spin) |
| `Shift` | Dodge step (`0.24s` i-frames, `34` stamina) |
| `C` | Maid Twin Starburst (in battle) / Cycle Nyah cosmetic (in menu) |
| `I` / `Tab` | Open Status Menu / Cycle tabs (`BAG`, `LOG`, `SAVE`, `MAP`) |
| `Q` | Previous menu tab |
| `L` | Toggle Dialogue Log (`↑`/`↓` scroll, `L`/`Esc` close) |
| `1` - `3` | Quick-use bound potions |
| `V` | Toggle CRT scanline filter |
| `M` | Mute / unmute audio |
| `Esc` | Close menu / Skip intro or epilogue |
| `T` | Return to Title Screen (when `SAVE` tab is active) |

## Running Locally & Testing

Start a local HTTP server from the repository root (zero build step needed):

```bash
python -m http.server 8777 --bind 127.0.0.1
# Open http://127.0.0.1:8777/
```

For offline sharing, open `retronyah_standalone.html` directly in any modern browser. After editing `index.html` or any file in `js/`, regenerate the single-file bundle and run both verification suites:

```bash
node bundle_standalone.js
node tests/smoke_verify.js
node tests/browser_verify.js
```

Note: `tests/browser_verify.js` launches local Google Chrome headless over CDP (`C:\Program Files\Google\Chrome\Application\chrome.exe`) to test both `index.html` and `retronyah_standalone.html` at desktop and mobile viewports.

## Repository Layout

| Path | Description |
| :--- | :--- |
| `index.html` | Main HTML shell, CRT/HUD styling, touch controls, and script loader (`00` through `06`). |
| `js/` | Single global-scope game modules (`00_v5_assets_bundle.js` through `06_engine_and_ui.js`). |
| `assets/` | Source pixel sprites, boss frames, portraits, and event CGs. |
| `bundle_standalone.js` | Bundles `index.html` and `js/*.js` into `retronyah_standalone.html`. |
| `retronyah_standalone.html` | Generated single-file build for offline distribution. |
| `tests/` | Automated Node VM (`smoke_verify.js`) and headless Chrome CDP (`browser_verify.js`) suites. |
| `TECHNICAL_GUIDE.md` | Living engineering guide, architecture rules, fix log, regression guards, and character canon. |
