// bundle_standalone.js
// Automatically inlines all V5 modules into a single self-contained HTML file
// for zero-dependency offline double-click play & easy sharing with friends.

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const INDEX_HTML = path.join(ROOT_DIR, 'index.html');
const OUTPUT_HTML = path.join(ROOT_DIR, 'retronyah_standalone.html');

const SCRIPTS = [
  'js/00_v5_assets_bundle.js',
  'js/01_config_and_audio.js',
  'js/02_art_sprites.js',
  'js/03_art_portraits.js',
  'js/04_maps_and_dungeons.js',
  'js/05_story_and_banter.js',
  'js/06_engine_and_ui.js'
];

console.log('Building Retronyah Standalone v0.11.0...');

let html = fs.readFileSync(INDEX_HTML, 'utf8');

let combinedScripts = '';
for (const scriptPath of SCRIPTS) {
  const fullPath = path.join(ROOT_DIR, scriptPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`ERROR: Missing script file: ${fullPath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  console.log(`  + Inlined ${scriptPath} (${(content.length / 1024).toFixed(1)} KB)`);
  combinedScripts += `\n<!-- === ${scriptPath} === -->\n<script>\n${content}\n</script>\n`;
}

// Replace the external script tags in index.html with the inlined scripts
const scriptTagsRegex = /<script\s+src="js\/00_v5_assets_bundle\.js"><\/script>[\s\S]*?<script\s+src="js\/06_engine_and_ui\.js"><\/script>/i;

if (!scriptTagsRegex.test(html)) {
  console.error('ERROR: Could not find script tags block in index.html');
  process.exit(1);
}

const standaloneHtml = html.replace(scriptTagsRegex, combinedScripts.trim());

fs.writeFileSync(OUTPUT_HTML, standaloneHtml, 'utf8');

const stat = fs.statSync(OUTPUT_HTML);
console.log(`\nSuccessfully created standalone game:`);
console.log(`  File: ${OUTPUT_HTML}`);
console.log(`  Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB (${stat.size} bytes)`);
console.log('Ready to send to friends or double-click to play anywhere!');
