// Baseline & Regression Verification Harness for PROJECT NYAH: THE BELL OF ALDENOR
// Zero external dependencies; runs on Node 24+.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const JS_FILES = [
  'js/00_v5_assets_bundle.js',
  'js/01_config_and_audio.js',
  'js/02_art_sprites.js',
  'js/03_art_portraits.js',
  'js/04_maps_and_dungeons.js',
  'js/05_story_and_banter.js',
  'js/06_engine_and_ui.js'
];

function createDomStub() {
  let createdDivCount = 0;
  const elementsById = new Map();
  const elementsByClass = new Map();

  function makeClassList(el) {
    const set = new Set(String(el._className || '').split(/\s+/).filter(Boolean));
    return {
      add(c) { set.add(c); el._className = [...set].join(' '); },
      remove(c) { set.delete(c); el._className = [...set].join(' '); },
      toggle(c, force) {
        const next = (typeof force === 'boolean') ? force : !set.has(c);
        if (next) set.add(c); else set.delete(c);
        el._className = [...set].join(' ');
        return next;
      },
      contains(c) { return set.has(c); }
    };
  }

  function make2dCtx() {
    const noop = () => {};
    return {
      imageSmoothingEnabled: false,
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      font: '10px monospace',
      textAlign: 'left',
      fillRect: noop,
      clearRect: noop,
      strokeRect: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      ellipse: noop,
      fill: noop,
      stroke: noop,
      save: noop,
      restore: noop,
      translate: noop,
      scale: noop,
      rotate: noop,
      drawImage: noop,
      fillText: noop,
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: noop
    };
  }

  function makeElement(tag, id = '', className = '') {
    const el = {
      tagName: tag.toUpperCase(),
      id,
      _className: className,
      children: [],
      textContent: '',
      _innerHTML: '',
      style: {},
      parentNode: null,
      _attrs: {},
      _listeners: {},
      get className() { return this._className; },
      set className(v) {
        this._className = String(v);
        this.classList = makeClassList(this);
      },
      get innerHTML() { return this._innerHTML; },
      set innerHTML(v) {
        this._innerHTML = String(v);
        if (this._innerHTML === '') this.children = [];
      },
      appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      replaceChild(newNode, oldNode) {
        const idx = this.children.indexOf(oldNode);
        if (idx >= 0) this.children[idx] = newNode;
        newNode.parentNode = this;
        return oldNode;
      },
      cloneNode() {
        return makeElement(this.tagName, this.id, this._className);
      },
      getAttribute(k) { return this._attrs[k] ?? null; },
      setAttribute(k, v) { this._attrs[k] = String(v); },
      addEventListener(type, fn) {
        (this._listeners[type] = this._listeners[type] || []).push(fn);
      },
      dispatchEvent(evt) {
        const list = this._listeners[evt.type] || [];
        list.forEach(fn => fn(evt));
      },
      getContext(kind) {
        if (kind === '2d') {
          if (!this._ctx2d) this._ctx2d = make2dCtx();
          return this._ctx2d;
        }
        return null;
      },
      focus: () => {},
      blur: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 512, height: 448, right: 512, bottom: 448 }),
      querySelectorAll: () => []
    };
    el.classList = makeClassList(el);
    if (id) elementsById.set(id, el);
    if (className) {
      for (const c of className.split(/\s+/)) {
        if (!c) continue;
        if (!elementsByClass.has(c)) elementsByClass.set(c, []);
        elementsByClass.get(c).push(el);
      }
    }
    return el;
  }

  const rootIds = [
    'cabinet', 'topHud', 'screenWrapper', 'viewport', 'gameCanvas', 'glLightCanvas', 'crtOverlay',
    'lblHeroLv', 'lblHeroHp', 'hpFill', 'staminaFill', 'lblHeroStamina', 'lblHeroTp', 'tpFill',
    'lblGold', 'lblItemName', 'btnStatus', 'btnTitle', 'btnSlash', 'lblDayNight', 'btnCrt', 'btnMute', 'lblMute',
    'vuBars', 'vuBar0', 'vuBar1', 'vuBar2', 'vuBar3', 'vuBar4', 'vuBar5', 'vuBar6',
    'bottomBar', 'mobileControls'
  ];
  for (const id of rootIds) makeElement(id.includes('Canvas') ? 'canvas' : id.startsWith('btn') ? 'button' : 'div', id);

  const vuBarsEl = elementsById.get('vuBars');
  for (let i = 0; i < 7; i++) {
    const bar = elementsById.get(`vuBar${i}`);
    vuBarsEl.appendChild(bar);
  }
  const viewportEl = elementsById.get('viewport');
  viewportEl.appendChild(elementsById.get('gameCanvas'));
  viewportEl.appendChild(elementsById.get('glLightCanvas'));
  viewportEl.appendChild(elementsById.get('crtOverlay'));

  const vactMenu = makeElement('div', '', 'vact-btn');
  vactMenu.setAttribute('data-action', 'menu');
  const vactSpace = makeElement('div', '', 'vact-btn');
  vactSpace.setAttribute('data-key', 'Space');
  const vpadUp = makeElement('div', '', 'vpad-btn vpad-up');
  vpadUp.setAttribute('data-key', 'ArrowUp');

  const docListeners = {};
  const document = {
    hidden: false,
    body: makeElement('body'),
    getElementById: (id) => elementsById.get(id) || null,
    createElement: (tag) => {
      if (tag === 'div') createdDivCount++;
      return makeElement(tag);
    },
    querySelectorAll: (sel) => {
      if (sel === '.vpad-btn') return elementsByClass.get('vpad-btn') || [];
      if (sel === '.vact-btn') return elementsByClass.get('vact-btn') || [];
      if (sel === '.vact-btn[data-action="menu"]') return [vactMenu];
      if (sel === '.hud-btn') return [elementsById.get('btnCrt'), elementsById.get('btnMute'), elementsById.get('btnStatus'), elementsById.get('btnTitle')];
      return [];
    },
    addEventListener: (t, fn) => { (docListeners[t] = docListeners[t] || []).push(fn); },
    dispatchEvent: (e) => { (docListeners[e.type] || []).forEach(fn => fn(e)); }
  };

  return {
    document,
    elementsById,
    getCreatedDivCount: () => createdDivCount,
    resetCreatedDivCount: () => { createdDivCount = 0; }
  };
}

function loadGameIntoVm() {
  const dom = createDomStub();
  const storage = new Map();
  const localStorage = {
    getItem: (k) => storage.has(k) ? storage.get(k) : null,
    setItem: (k, v) => { storage.set(k, String(v)); },
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear()
  };

  let createdAudioNodes = [];
  class MockAudioContext {
    constructor() {
      this.currentTime = 1.0;
      this.state = 'running';
      this.destination = { id: 'dest' };
    }
    resume() { return Promise.resolve(); }
    createGain() {
      const node = {
        kind: 'gain',
        disconnected: false,
        gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} },
        connect() {},
        disconnect() { this.disconnected = true; }
      };
      createdAudioNodes.push(node);
      return node;
    }
    createOscillator() {
      const node = {
        kind: 'osc',
        disconnected: false,
        onended: null,
        frequency: { value: 440, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
        setPeriodicWave() {},
        connect() {},
        disconnect() { this.disconnected = true; },
        start() {},
        stop() {}
      };
      createdAudioNodes.push(node);
      return node;
    }
    createPeriodicWave() { return {}; }
    createBuffer(ch, len, sr) { return { getChannelData: () => new Float32Array(len) }; }
    createBufferSource() {
      return { buffer: null, loop: false, connect() {}, start() {}, stop() {}, disconnect() {} };
    }
    createBiquadFilter() {
      const p = () => ({ value: 500, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} });
      return {
        type: 'lowpass',
        frequency: p(),
        Q: p(),
        connect() {}
      };
    }
  }

  const winListeners = {};
  class MockImageData {
    constructor(dataOrW, wOrH, maybeH) {
      if (typeof dataOrW === 'number') {
        this.width = dataOrW;
        this.height = wOrH;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrW;
        this.width = wOrH;
        this.height = maybeH;
      }
    }
  }

  const sandbox = {
    console,
    Math,
    Date,
    JSON,
    Object,
    Array,
    Map,
    Set,
    Uint8Array,
    Uint8ClampedArray,
    Int32Array,
    Float32Array,
    ImageData: MockImageData,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
    btoa: (bin) => Buffer.from(bin, 'binary').toString('base64'),
    performance: { now: () => 1000 },
    innerWidth: 1280,
    innerHeight: 800,
    document: dom.document,
    localStorage,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    addEventListener: (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); },
    dispatchEvent: (e) => { (winListeners[e.type] || []).forEach(fn => fn(e)); }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);
  for (const rel of JS_FILES) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { ctx, dom, localStorage, winListeners, getAudioNodes: () => createdAudioNodes, resetAudioNodes: () => { createdAudioNodes = []; } };
}

function bfsReachable(map, startTx, startTy) {
  const w = map.width;
  const h = map.height;
  const visited = new Set();
  if (map.collisionMap[startTy * w + startTx] === 1) return visited;
  const queue = [[startTx, startTy]];
  visited.add(startTy * w + startTx);
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const idx = ny * w + nx;
      if (visited.has(idx) || map.collisionMap[idx] === 1) continue;
      visited.add(idx);
      queue.push([nx, ny]);
    }
  }
  return visited;
}

const results = [];
function check(name, fn) {
  try {
    const out = fn();
    if (out === true || out === undefined) {
      results.push({ name, ok: true, detail: 'ok' });
    } else {
      results.push({ name, ok: false, detail: String(out) });
    }
  } catch (err) {
    results.push({ name, ok: false, detail: err.stack || err.message || String(err) });
  }
}

// 1. Syntax checks
check('syntax: all js files & bundle_standalone.js', () => {
  for (const f of [...JS_FILES, 'bundle_standalone.js']) {
    execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' });
  }
  return true;
});

// 2. Standalone bundler sync check
check('standalone: retronyah_standalone.html synced with js/ + index.html', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  let combinedScripts = '';
  for (const f of JS_FILES) {
    const js = fs.readFileSync(path.join(ROOT, f), 'utf8');
    combinedScripts += `\n<!-- === ${f} === -->\n<script>\n${js}\n</script>\n`;
  }
  const scriptTagsRegex = /<script\s+src="js\/00_v5_assets_bundle\.js"><\/script>[\s\S]*?<script\s+src="js\/06_engine_and_ui\.js"><\/script>/i;
  const expected = html.replace(scriptTagsRegex, () => combinedScripts.trim());
  const actual = fs.readFileSync(path.join(ROOT, 'retronyah_standalone.html'), 'utf8');
  return (actual === expected) || 'retronyah_standalone.html differs from index.html + js/*';
});

const env = loadGameIntoVm();
const ctx = env.ctx;
ctx.eval = (code) => vm.runInContext(`(() => {\n${code}\n})()`, ctx);

// 3. Map & Dungeon BFS Reachability Invariants
check('maps: all 10 maps exist & spawn tiles walkable & key objectives reachable when solved', () => {
  ctx.eval(`
    startNewGame();
    dungeonState.minesCartCleared = true;
    dungeonState.minesBarricadeBroken = true;
    dungeonState.minesShortcutOpen = true;
    dungeonState.cryptSkullLevers = [true, true, true];
    dungeonState.cryptPortcullisOpen = true;
    dungeonState.cryptsBraziersLit = true;
    dungeonState.cryptBraziers = [true,true,true,true,true,true,true,true];
    dungeonState.cryptShortcutOpen = true;
    dungeonState.shrineValve1 = true;
    dungeonState.shrineValve2 = true;
    dungeonState.shrineWaterDrained = true;
    dungeonState.shrineShortcutOpen = true;
    dungeonState.spireGateOpen = true;
    buildAllMaps();
  `);
  const checks = [
    ['aldenor_exterior', 15, 17, [[15, 24], [24, 1], [6, 10], [24, 21]]],
    ['grand_manor_interior', 7, 11, [[12, 5], [7, 4], [4, 4]]],
    ['lumina_workshop', 7, 8, [[7, 6]]],
    ['harbor_tavern', 7, 9, [[7, 6]]],
    ['goran_forge', 7, 8, [[7, 6]]],
    ['aldenor_coastal_plains', 15, 3, [[4, 9], [28, 9], [16, 20]]],
    ['dungeon_mines', 6, 28, [[8, 3], [26, 12], [27, 8]]],
    ['dungeon_crypts', 6, 28, [[14, 4], [26, 12], [27, 8]]],
    ['dungeon_shrine', 6, 28, [[4, 3], [26, 12], [27, 8]]],
    ['bell_spire', 10, 25, [[10, 14], [10, 8]]]
  ];
  for (const [id, sx, sy, targets] of checks) {
    const map = ctx.MAPS[id];
    if (!map) return `missing map ${id}`;
    const reach = bfsReachable(map, sx, sy);
    for (const [tx, ty] of targets) {
      if (!reach.has(ty * map.width + tx)) {
        return `${id}: (${tx},${ty}) unreachable from (${sx},${sy})`;
      }
    }
  }
  return true;
});

check('maps: unsolved dungeon boss gates seal sanctums', () => {
  ctx.eval(`startNewGame();`);
  for (const id of ['dungeon_mines', 'dungeon_crypts', 'dungeon_shrine']) {
    const map = ctx.MAPS[id];
    const reach = bfsReachable(map, 6, 28);
    if (reach.has(8 * map.width + 27)) return `${id}: boss sanctum reachable before puzzle solved`;
  }
  return true;
});

// 4. Save / Load round-trip & Legacy v4 Save compatibility
check('save: v4.1 round-trip & legacy v4 compatibility', () => {
  ctx.eval(`
    startNewGame();
    flags.gold = 345;
    flags.nyahJoinedParty = true;
    flags.nyahRecruited = true;
    flags.bellForkFound = true;
    addItem('bell_tuning_fork', 1);
    addItem('sea_charm', 1);
    hero.level = 5;
    hero.hp = 123;
    hero.maxHp = getMaxHpForLevel(5);
    dungeonState.cryptBraziers[0] = true;
    saveGame(0, false);
    const savedRaw = JSON.parse(localStorage.getItem('aldenor_save_v4')).slot_0;
    startNewGame();
    if (flags.gold !== 0) throw new Error('startNewGame leaked gold');
    loadGame(0, false);
    if (flags.gold !== 345 || hero.level !== 5 || !hasItem('sea_charm') || !dungeonState.cryptBraziers[0]) {
      throw new Error('round-trip load mismatch');
    }
    // Legacy save lacking cryptBraziers & cryptsBraziersLit
    delete savedRaw.dungeonState.cryptBraziers;
    delete savedRaw.dungeonState.cryptsBraziersLit;
    const all = JSON.parse(localStorage.getItem('aldenor_save_v4'));
    all.slot_1 = savedRaw;
    localStorage.setItem('aldenor_save_v4', JSON.stringify(all));
    loadGame(1, false);
    if (!Array.isArray(dungeonState.cryptBraziers) || dungeonState.cryptBraziers[0] !== false) {
      throw new Error('legacy save inherited live cryptBraziers');
    }
  `);
  return true;
});

// === AUDIT PROBES (Record BEFORE vs AFTER behavior) ===

check('probe: starlight_ribbon registered & grants +5 DEF and +10 Max HP', () => {
  const ok = ctx.eval(`
    startNewGame();
    const baseDef = getTotalHeroDef();
    const baseMaxHp = hero.maxHp;
    const reg = KEY_ITEMS.starlight_ribbon;
    if (!reg) return false;
    addItem('starlight_ribbon', 1);
    refreshWorldAfterLoad();
    return (getTotalHeroDef() === baseDef + 5 && hero.maxHp === baseMaxHp + 10);
  `);
  return ok || 'starlight_ribbon missing from KEY_ITEMS or gives 0 stats';
});

check('probe: minesCart lethal hit calls defeat rescue instead of 0 HP soft-lock', () => {
  const out = ctx.eval(`
    startNewGame();
    YsEngine.setActiveMapId('dungeon_mines');
    hero.x = 8 * 16;
    hero.y = 10 * 16;
    hero.hp = 1;
    hero.invulnTimer = 0;
    minesCart.x = 8 * 16;
    minesCart.y = 10 * 16;
    minesCart.run = { phase: 'roll', speed: 150, timer: 0 };
    updateMinesCart(0.016);
    return ({ hp: hero.hp, rescued: flags.heroRescuedByNyah, trans: transitionState.active });
  `);
  return (out.hp > 0 && (out.rescued || out.trans)) || `left hero soft-locked at hp=${out.hp}, rescued=${out.rescued}`;
});

check('probe: 3rd relic (boss_leviathan) immediately opens Sanctum Gate (24..25, 1)', () => {
  const blocked = ctx.eval(`
    startNewGame();
    flags.bellForkFound = true;
    flags.bellClapperFound = true;
    addItem('bell_tuning_fork', 1);
    addItem('bell_clapper', 1);
    handleMonsterDefeat({ type: 'boss_leviathan', name: 'Tidal Leviathan', exp: 100, x: 400, y: 120, alive: true });
    const m = MAPS.aldenor_exterior;
    return [m.collisionMap[1 * m.width + 24], m.collisionMap[1 * m.width + 25]];
  `);
  return (blocked[0] === 0 && blocked[1] === 0) || `sanctum gate collision stayed [${blocked.join(',')}]`;
});

check('probe: handleSeagullInteraction step 1 lands seagull on walkable tile', () => {
  const info = ctx.eval(`
    startNewGame();
    YsEngine.setActiveMapId('aldenor_exterior');
    const gull = npcs.find(n => n.id === 'seagull');
    flags.seagullStep = 1;
    handleSeagullInteraction(gull);
    const tx = Math.floor((gull.x + 8) / 16);
    const ty = Math.floor((gull.y + 12) / 16);
    const m = MAPS.aldenor_exterior;
    return ({ tx, ty, solid: m.collisionMap[ty * m.width + tx], tile: m.structLayer[ty * m.width + tx] });
  `);
  return info.solid === 0 || `seagull landed inside solid tile (${info.tx},${info.ty}) struct=${info.tile}`;
});

check('probe: projectile wall check uses projectile point, not hero foot offset', () => {
  const res = ctx.eval(`
    startNewGame();
    YsEngine.setActiveMapId('dungeon_mines');
    const m = MAPS.dungeon_mines;
    const solidCheck = m.collisionMap[16 * m.width + 5] === 1 && m.collisionMap[17 * m.width + 5] === 0;
    enemyProjectiles.length = 0;
    enemyProjectiles.push({ x: 88, y: 268, vx: 0, vy: 0, dist: 0, maxDist: 200, damage: 5, color: '#fff' });
    update(0.016);
    const insideWallStillAlive = enemyProjectiles.length === 1;
    return ({ solidCheck, insideWallStillAlive });
  `);
  return (res.solidCheck && !res.insideWallStillAlive) || 'projectile inside solid wall (88,268) survived checkCollision foot-offset bug';
});

check('probe: skeleton_knight parry (dmg=0) awards no +10 TP or knockback', () => {
  const res = ctx.eval(`
    startNewGame();
    YsEngine.setActiveMapId('dungeon_crypts');
    titleScreenState.active = false;
    introCinemaState.active = false;
    hero.tp = 0;
    hero.x = 80; hero.y = 80; hero.dir = 3;
    hero.isAttacking = true; hero.attackTimer = 0.16; hero.hitList = [];
    monsters.length = 0;
    monsters.push({ id: 'sk', type: 'skeleton_knight', name: 'Skeleton Knight', x: 96, y: 80, dir: 2, hp: 100, maxHp: 100, def: 4, atk: 12, speed: 30, alive: true, hitTimer: 0, flashTimer: 0, staggerTimer: 0 });
    update(0.016);
    return ({ tp: hero.tp, mx: monsters[0].x });
  `);
  return (res.tp === 0 && res.mx <= 96) || `parry leaked tp=${res.tp}, pushed skeleton x=${res.mx}`;
});

check('probe: Twin Starburst blocked when Nyah has not joined party', () => {
  const res = ctx.eval(`
    startNewGame();
    flags.nyahJoinedParty = false;
    hero.tp = 100;
    triggerMaidTwinStarburst();
    return hero.tp;
  `);
  return res === 100 || `Twin Starburst consumed 100 TP before Nyah joined (tp=${res})`;
});

check('probe: updateItemBadge formats relic/locket IDs cleanly', () => {
  const text = ctx.eval(`
    startNewGame();
    flags.inventory = 'bell_tuning_fork';
    updateItemBadge();
    return document.getElementById('lblItemName').textContent;
  `);
  return (text !== 'bell_tuning_fork' && !text.includes('_')) || `raw id shown in HUD: "${text}"`;
});

check('probe: refreshWorldAfterLoad resets transient charge & pounceCooldown', () => {
  const res = ctx.eval(`
    startNewGame();
    hero.chargeTimer = 0.8;
    hero.chargeReady = true;
    nyahCompanion.pounceCooldown = 3.5;
    particles.push({ x: 1, y: 1, vx: 0, vy: 0, life: 1, maxLife: 1, size: 2, color: '#fff' });
    refreshWorldAfterLoad();
    return ({ ct: hero.chargeTimer, cr: hero.chargeReady, pc: nyahCompanion.pounceCooldown, p: particles.length });
  `);
  return (res.ct === 0 && res.cr === false && res.pc === 0 && res.p === 0) ||
    `stale state after refreshWorldAfterLoad: ${JSON.stringify(res)}`;
});

check('probe: toggleStatusMenu blocked while dialogueLogState is open', () => {
  const open = ctx.eval(`
    startNewGame();
    titleScreenState.active = false;
    introCinemaState.active = false;
    statusMenuState.open = false;
    dialogueLogState.open = true;
    toggleStatusMenu();
    return statusMenuState.open;
  `);
  return open === false || 'statusMenu opened over dialogueLogState';
});

check('probe: updateVuMeterHud zero per-frame DOM element creation', () => {
  ctx.eval(`
    startNewGame();
    updateVuMeterHud();
  `);
  env.dom.resetCreatedDivCount();
  ctx.eval(`
    vuMeters[0] = 0.8;
    for (let i = 0; i < 10; i++) updateVuMeterHud();
  `);
  const created = env.dom.getCreatedDivCount();
  return created === 0 || `created ${created} div elements across 10 VU frames`;
});

check('probe: playVoiceBlip attaches onended node cleanup', () => {
  env.resetAudioNodes();
  ctx.eval(`
    initAudio();
    isMuted = false;
    playVoiceBlip('nyah', 'smug', 65);
  `);
  const nodes = env.getAudioNodes().filter(n => n.kind === 'osc');
  const last = nodes[nodes.length - 1];
  if (!last || typeof last.onended !== 'function') return 'osc.onended handler missing';
  last.onended();
  return last.disconnected === true || 'osc.onended did not disconnect node';
});

check('probe: shadow_guard / boss_eclipse teleport fallback near wall', () => {
  const res = ctx.eval(`
    startNewGame();
    titleScreenState.active = false;
    introCinemaState.active = false;
    YsEngine.setActiveMapId('bell_spire');
    hero.x = 1 * 16; hero.y = 12 * 16; hero.dir = 3;
    monsters.length = 0;
    monsters.push({ id: 'be', type: 'boss_eclipse', name: 'Eclipse', x: 10 * 16, y: 12 * 16, dir: 0, hp: 500, maxHp: 1800, def: 8, atk: 20, speed: 40, phase: 3, teleportTimer: 0, orbTimer: 5, alive: true, hitTimer: 0, flashTimer: 0 });
    update(0.016);
    for (let i = 0; i < 25; i++) update(0.02);
    return ({ mx: monsters[0].x, my: monsters[0].y, projs: enemyProjectiles.length });
  `);
  return (res.projs > 0 && res.mx !== 160) || `boss_eclipse Phase 3 teleport fizzled silently (${JSON.stringify(res)})`;
});

let failed = 0;
for (const r of results) {
  const tag = r.ok ? '[PASS]' : '[FAIL]';
  console.log(`${tag} ${r.name}${r.ok ? '' : ' -> ' + r.detail}`);
  if (!r.ok) failed++;
}
console.log(`\nSummary: ${results.length - failed}/${results.length} passed (${failed} failed).`);
process.exit(failed > 0 ? 1 : 0);
