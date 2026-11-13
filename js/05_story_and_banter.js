// 05_story_and_banter.js (Modularized from index.html)
  // SECTION 7: Entity System, AI Patrols & Story Flags
  // =========================================================================
  const transitionState = {
    active: false,
    timer: 0,
    duration: 0.36,
    targetMap: null,
    spawnX: 0,
    spawnY: 0,
    spawnDir: 0,
    halfwayDone: false
  };

  function startMapTransition(targetMapId, spawnX, spawnY, spawnDir = 0) {
    if (transitionState.active) return;
    transitionState.active = true;
    transitionState.timer = 0;
    transitionState.duration = 0.36;
    transitionState.targetMap = targetMapId;
    transitionState.spawnX = spawnX;
    transitionState.spawnY = spawnY;
    transitionState.spawnDir = spawnDir;
    transitionState.halfwayDone = false;
    playTransitionChime(targetMapId !== 'aldenor_exterior');
  }

  const WEAPONS = {
    rusty_sword: { id: 'rusty_sword', name: "Rusty Shortsword", atk: 8, cd: 0.26, arcColor: vceColor(7,7,7), arcSize: 14, desc: "A pitted blade from the voyage." },
    iron_broadsword: { id: 'iron_broadsword', name: "Iron Broadsword", atk: 18, cd: 0.24, arcColor: vceColor(3,5,7), arcSize: 18, desc: "Forged by Goran from tempered iron." },
    silver_falchion: { id: 'silver_falchion', name: "Silver Falchion", atk: 32, cd: 0.20, arcColor: vceColor(5,7,7), arcSize: 20, desc: "Gleaming silver edge with swift swing." },
    flame_edge: { id: 'flame_edge', name: "Flame Edge", atk: 48, cd: 0.20, arcColor: vceColor(7,3,1), arcSize: 22, desc: "Burns with eternal flame; 1.3x vs undead." },
    clerici_blade: { id: 'clerici_blade', name: "Clerici's Sacred Blade", atk: 70, cd: 0.18, arcColor: vceColor(6,7,7), arcSize: 24, desc: "Holy blade; fires crescent beam at >=90% HP." }
  };

  const ARMORS = {
    traveler_tunic: { id: 'traveler_tunic', name: "Traveler's Tunic", def: 4, desc: "Simple linen travel tunic." },
    leather_cuirass: { id: 'leather_cuirass', name: "Leather Cuirass", def: 12, desc: "Hardened leather smith's vest." },
    silver_breastplate: { id: 'silver_breastplate', name: "Silver Breastplate", def: 24, desc: "Finely forged silver chestplate." },
    // 30, not 24: the free Silver Breastplate in the mines used to make this
    // 200 G purchase strictly worse value for identical stats.
    chain_hauberk: { id: 'chain_hauberk', name: "Chain Hauberk", def: 30, desc: "Interlocking steel rings, heavier than they look." },
    silver_plate: { id: 'silver_plate', name: "Silver Plate", def: 38, desc: "Heavy plate blessed by church elders." },
    clerici_mail: { id: 'clerici_mail', name: "Clerici's Mail", def: 52, desc: "Ancient sanctum armor; reduces miasma." }
  };

  const SHIELDS = {
    none: { id: 'none', name: "None", def: 0, desc: "No shield equipped." },
    wood_buckler: { id: 'wood_buckler', name: "Wood Buckler", def: 2, desc: "Small round wooden shield." },
    kite_shield: { id: 'kite_shield', name: "Kite Shield", def: 8, desc: "Sturdy steel kite shield." }
  };

  const CONSUMABLES = {
    potion_heal: { id: 'potion_heal', name: "Healing Herb", type: 'heal', val: 40, stamina: 25, price: 15, desc: "Restores 40 HP and 25 stamina." },
    potion_greater: { id: 'potion_greater', name: "Starlight Tonic", type: 'heal', val: 90, stamina: 50, price: 45, desc: "Restores 90 HP and 50 stamina." },
    potion_antidote: { id: 'potion_antidote', name: "Moon Elixir", type: 'cure', val: 0, price: 20, desc: "Cures all status ailments." }
  };

  const KEY_ITEMS = {
    silver_teacup: { id: 'silver_teacup', name: "Silver Teacup", desc: "Lord's tea service, finely polished." },
    starlight_tonic: { id: 'starlight_tonic', name: "Starlight Tonic", desc: "Rare apothecary concoction." },
    jasmine_tea: { id: 'jasmine_tea', name: "Jasmine-Catnip Tea", desc: "Fragrant royal blend beloved by Nyah." },
    guard_sandwich: { id: 'guard_sandwich', name: "Smoked Fish Sandwich", desc: "Hearty harbor lunch for Guard Thorne." },
    tavern_pass: { id: 'tavern_pass', name: "Tavern Pass", desc: "Allows late night entrance to Harbor Tavern." },
    bell_tuning_fork: { id: 'bell_tuning_fork', name: "Bell Tuning Fork", desc: "First relic of the Sacred Bell." },
    bell_clapper: { id: 'bell_clapper', name: "Sacred Bell Clapper", desc: "Second relic of the Sacred Bell." },
    sanctum_crest: { id: 'sanctum_crest', name: "Sanctum Crest", desc: "Third relic of the Sacred Bell." },
    brass_locket: { id: 'brass_locket', name: "Sailor Pete's Locket", desc: "Keepsake lost on the southern reef." },
    kitten_mochi: { id: 'kitten_mochi', name: "Mochi the Kitten", desc: "Lyla's beloved white kitten, safe and warm." },
    crimson_ribbon: { id: 'crimson_ribbon', name: "Crimson Ribbon", type: 'accessory', desc: "Nyah's twin-tail ribbon (+25% crit chance)." },
    moonlight_cloak: { id: 'moonlight_cloak', name: "Moonlight Cloak", type: 'accessory', desc: "Midnight-blue capelet for Nyah (0.50s attack speed)." },
    silver_bell: { id: 'silver_bell', name: "Silver Bell Collar", type: 'accessory', desc: "Chime collar for Nyah (+50% emergency heal)." },
    sea_charm: { id: 'sea_charm', name: "Sea Charm", def: 6, desc: "Lucky sailor charm (+6 DEF, slow immunity)." },
    ring_melody: { id: 'ring_melody', name: "Ring of Melody", desc: "+2 HP regen every 3s while moving." },
    // Signature boss drops. These are mechanics, not stat sticks: each one
    // changes an existing verb and is applied by the code, never by the text.
    crushers_core: { id: 'crushers_core', name: "Crusher's Core", desc: "Stone heart of the Golem. Dodging near a foe bursts it for 12 damage." },
    grave_lantern: { id: 'grave_lantern', name: "Grave Lantern", desc: "Malakor's cold lamp. Every foe defeated restores 12 HP." },
    crown_of_dawn: { id: 'crown_of_dawn', name: "Crown of the Dawn", desc: "Eclipse's last light. Undead within 52 px burn for 8 damage a second." }
  };

  const BOUNTIES = [
    { id: 'bounty_slimes', name: "Plains Slime Extermination", target: 'slime', count: 5, reward: 60, exp: 50, desc: "Cull 5 slime pests roaming the coastal plains." },
    { id: 'bounty_crabs', name: "Armored Crab Shells", target: 'crab', count: 3, reward: 90, exp: 80, desc: "Defeat 3 armored shore crabs along the southern beach." }
  ];

  const flags = {
    talkedToElf: false,
    talkedToNyah: false,
    nyahRantedAboutElf: false,
    nyahVisitedFirst: false,
    elfVisitedFirst: false,
    isTwilight: false,
    inventory: null,
    pinConfiscated: false,
    seagullSolved: false,
    seagullStep: 0,
    manorUnlocked: false,
    workshopUnlocked: false,
    gold: 0,
    heroRescuedByNyah: false,
    nyahJoinedParty: false,
    nyahPerks: [],
    nyahAffection: 0,
    nyahCosmetic: 'maid',
    tavern_pass: false,
    chapter: 1,
    bountiesClaimed: [],
    bountyProgress: { slime: 0, crab: 0, bat: 0, beetle: 0, skeleton: 0, triton: 0, cave_bat: 0, rock_beetle: 0, skeleton_knight: 0, armored_triton: 0 },
    peteQuestActive: false,
    peteQuestDone: false,
    mochiQuestActive: false,
    mochiQuestDone: false,
    mochiFound: false,
    hasMochi: false,
    kittenRescued: false,
    bellForkFound: false,
    bellClapperFound: false,
    sanctumCrestFound: false,
    bossDefeated: { boss_golem: false, boss_lich: false, boss_leviathan: false, boss_eclipse: false },
    bossGolemDefeated: false,
    bossLichDefeated: false,
    bossLeviathanDefeated: false,
    bossEclipseDefeated: false,
    bossGolemCutscene: false,
    bossLichCutscene: false,
    bossLeviathanCutscene: false,
    bossEclipseCutscene: false,
    fifiRecruited: true,
    nyahRecruited: false,
    nyahCallsMaster: false,
    rivalMaidTrialStep: 0,
    southGateSlimesCleared: 0,
    nyahInFrontSlot: false,
    nyahThreatenedLeash: false,
    foundVelvetRibbon: false,
    fifiLeashedInManor: false,
    southGateAmbushShown: false,
    manorChestOpened: false,
    guardianDevotionUsed: false,
    gameCompleted: false,
    introWatched: false
  };

  const enemyProjectiles = [];
  const swordBeams = [];

  const hero = {
    x: 240, y: 272,
    w: 16, h: 16,
    vx: 0, vy: 0,
    speed: 72,
    dir: 0, // 0: Down, 1: Up, 2: Left, 3: Right
    animFrame: 0,
    animTimer: 0,
    isMoving: false,
    level: 1,
    exp: 0,
    hp: 100,
    maxHp: 100,
    bonusMaxHp: 0,
    tp: 0,
    baseStr: 10,
    baseDef: 5,
    weapon: 'rusty_sword',
    armor: 'traveler_tunic',
    shield: 'none',
    accessory: null,
    bag: [
      { id: 'potion_heal', qty: 3 },
      { id: 'potion_antidote', qty: 1 }
    ],
    quickSlots: ['potion_heal', 'potion_antidote', null],
    invulnTimer: 0,
    isAttacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    chargeTimer: 0,
    chargeReady: false,
    isSpinning: false,
    slowTimer: 0,
    regenTimer: 0,
    // Dodge step. Kept on the hero so New Game can reset it in one place.
    dodgeTimer: 0,
    dodgeCooldown: 0,
    dodgeDirX: 0,
    dodgeDirY: 0,
    // Dash stamina (roadmap 10). Two steps fit in a full pool; the third waits
    // on regen. Kills and potions feed it back, so the pool rewards aggression.
    stamina: 100,
    staminaMax: 100,
    staminaRegenDelay: 0
  };

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

  const nyahCompanion = {
    x: 384,
    y: 128,
    dir: 0,
    speed: 72,
    animFrame: 0,
    animTimer: 0,
    isMoving: false,
    isAttacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    healCooldown: 0,
    accessory: 'default_ribbon',
    perks: [],
    trailBuffer: [],
    swapCooldown: 0,
    barkCooldown: 0,
    bumpCount: 0,
    lastBumpTime: 0,
    idleTimer: 0
  };

  // 60 * 1.16^(l-1) sums to ~5,670 EXP for levels 1-20. A completionist clear
  // is worth ~5,750, so the cap is reachable just before the final boss instead
  // of being decorative (the old 80 * 1.32 curve needed 47,800).
  function getExpForLevel(l) {
    if (l <= 1) return 60;
    return Math.floor(60 * Math.pow(1.16, l - 1));
  }

  function getMaxHpForLevel(l) {
    return 100 + (l - 1) * 15 + (hero.bonusMaxHp || 0);
  }

  function getBaseStrForLevel(l) {
    return 10 + (l - 1) * 3;
  }

  function getBaseDefForLevel(l) {
    return 5 + (l - 1) * 2;
  }

  function getTotalHeroStr() {
    const w = WEAPONS[hero.weapon];
    return hero.baseStr + (w ? w.atk : 8);
  }

  function getTotalHeroDef() {
    const a = ARMORS[hero.armor];
    const s = (typeof SHIELDS !== 'undefined' && SHIELDS[hero.shield]) ? SHIELDS[hero.shield].def : 0;
    const accDef = (hero.accessory === 'sea_charm' || (typeof hasItem === 'function' && hasItem('sea_charm'))) ? 6 : 0;
    return hero.baseDef + (a ? a.def : 4) + s + accDef;
  }

  // The Flame Edge description promises 1.3x against undead. Keep the list in
  // one place so a future monster can be classified without editing damage code.
  const UNDEAD_TYPES = ['skeleton_knight', 'boss_lich'];
  function isUndeadMonster(type) {
    return UNDEAD_TYPES.indexOf(type) >= 0;
  }

  function calcHeroDamage(monsterDef, skillMult = 1.0) {
    const totalStr = Number(getTotalHeroStr()) || 12;
    const mDef = Number(monsterDef ?? 4) || 4;
    const base = (totalStr - mDef * 0.55) * (Number(skillMult) || 1.0);
    const rnd = Math.floor(Math.random() * 4) - 1; // -1..2
    let dmg = Math.max(2, Math.round(base) + rnd);
    if (!Number.isFinite(dmg)) dmg = 2;
    return dmg;
  }

  function calcMonsterDamage(monsterAtk) {
    const totalDef = Number(getTotalHeroDef()) || 6;
    const mAtk = Number(monsterAtk ?? 8) || 8;
    // 0.62 (was 0.55): the dash-stamina pass cut sustained i-frame uptime by
    // roughly half, so armor has to carry more of the mitigation. This is a
    // global ~10-15% cut at endgame gear, not a per-boss cheat.
    const base = mAtk - totalDef * 0.62;
    const rnd = Math.floor(Math.random() * 3) - 1; // -1..1
    let dmg = Math.floor(base) + rnd;
    const minDmg = Math.max(1, Math.floor(mAtk * 0.12));
    let finalDmg = Math.max(minDmg, dmg);
    if (!Number.isFinite(finalDmg)) finalDmg = 1;
    return finalDmg;
  }

  function addExp(amount) {
    hero.exp += amount;
    spawnFloatingText(`+${amount} EXP`, hero.x, hero.y - 12, vceColor(3, 7, 3));
    let nextReq = getExpForLevel(hero.level);
    while (hero.level < 20 && hero.exp >= nextReq) {
      hero.exp -= nextReq;
      hero.level++;
      hero.maxHp = getMaxHpForLevel(hero.level);
      hero.hp = hero.maxHp;
      hero.baseStr = getBaseStrForLevel(hero.level);
      hero.baseDef = getBaseDefForLevel(hero.level);
      // A level-up is a full reset of both pools, including dash stamina.
      hero.stamina = hero.staminaMax;
      hero.staminaRegenDelay = 0;
      playSfxLevelUp();
      spawnFloatingText(`LEVEL UP! LV ${hero.level}`, hero.x, hero.y - 24, vceColor(7, 6, 1));
      updateHudLevelBadge();
      nextReq = getExpForLevel(hero.level);
    }
    updateHudBars();
  }

  function addItem(id, qty = 1) {
    const entry = hero.bag.find(item => item.id === id);
    if (entry) {
      entry.qty += qty;
    } else {
      hero.bag.push({ id, qty });
    }
    syncInventoryBridge();
    updateItemBadge();
  }

  function removeItem(id, qty = 1) {
    const entry = hero.bag.find(item => item.id === id);
    if (entry) {
      entry.qty -= qty;
      if (entry.qty <= 0) {
        hero.bag = hero.bag.filter(item => item.id !== id);
      }
    }
    syncInventoryBridge();
    updateItemBadge();
  }

  function hasItem(id) {
    return hero.bag.some(item => item.id === id && item.qty > 0);
  }

  function getItemCount(id) {
    const entry = hero.bag.find(item => item.id === id);
    return entry ? entry.qty : 0;
  }

  function syncInventoryBridge() {
    const priorityKeys = ['jasmine_tea', 'silver_teacup', 'starlight_tonic', 'guard_sandwich', 'tavern_pass', 'bell_tuning_fork', 'bell_clapper', 'sanctum_crest', 'brass_locket'];
    for (const k of priorityKeys) {
      if (hasItem(k)) {
        flags.inventory = k;
        return;
      }
    }
    flags.inventory = null;
  }

  function useQuickSlot(slotIndex) {
    const itemId = hero.quickSlots[slotIndex];
    if (!itemId) return;
    const item = CONSUMABLES[itemId];
    if (!item) return;
    if (getItemCount(itemId) <= 0) {
      spawnFloatingText("OUT OF ITEMS!", hero.x, hero.y - 12, vceColor(7, 2, 2));
      playSfxBlip(300);
      return;
    }
    if (item.type === 'heal') {
      const heal = Math.max(0, Math.min(item.val, hero.maxHp - hero.hp));
      const stam = Math.max(0, Math.min(item.stamina || 0, hero.staminaMax - hero.stamina));
      // A potion is a full reset button now: at full HP it can still be spent to
      // get back into the dodge game, but it is never wasted on a full pool.
      if (heal <= 0 && stam <= 0) return;
      hero.hp = Math.min(hero.maxHp, hero.hp + heal);
      hero.stamina = Math.min(hero.staminaMax, hero.stamina + stam);
      hero.staminaRegenDelay = 0;
      removeItem(itemId, 1);
      playSfxHeal();
      const parts = [];
      if (heal > 0) parts.push(`+${heal} HP`);
      if (stam > 0) parts.push(`+${stam} ST`);
      spawnFloatingText(parts.join(' / '), hero.x - 8, hero.y - 12, vceColor(2, 7, 2));
      updateHudBars();
    } else if (item.type === 'cure') {
      removeItem(itemId, 1);
      playSfxHeal();
      spawnFloatingText("STATUS CURED!", hero.x, hero.y - 12, vceColor(2, 7, 7));
    }
  }

  function updateHudBars() {
    const hpBar = document.getElementById('hpFill');
    const hpText = document.getElementById('hpText');
    const goldText = document.getElementById('goldText');
    const lblHeroHp = document.getElementById('lblHeroHp');
    const lblGold = document.getElementById('lblGold');
    const lblHeroLv = document.getElementById('lblHeroLv');
    const stBar = document.getElementById('staminaFill');
    const lblStamina = document.getElementById('lblHeroStamina');
    if (hpBar) hpBar.style.width = Math.round((hero.hp / hero.maxHp) * 100) + '%';
    if (hpText) hpText.textContent = `${hero.hp}/${hero.maxHp}`;
    if (goldText) goldText.textContent = `${flags.gold || 0} G`;
    if (lblHeroHp) lblHeroHp.textContent = `${hero.hp}/${hero.maxHp}`;
    if (lblGold) lblGold.textContent = `${flags.gold || 0}`;
    if (lblHeroLv) lblHeroLv.textContent = `${hero.level}`;
    if (stBar) {
      const pct = Math.max(0, Math.min(100, Math.round((hero.stamina / hero.staminaMax) * 100)));
      stBar.style.width = pct + '%';
      stBar.style.background = hero.stamina >= DODGE_STAMINA_COST ? '#3ad2c0' : '#e8902c';
    }
    if (lblStamina) lblStamina.textContent = `${Math.floor(hero.stamina)}`;
  }

  function updateHudLevelBadge() {
    const lblHeroLv = document.getElementById('lblHeroLv');
    if (lblHeroLv) {
      lblHeroLv.textContent = `${hero.level}`;
    } else {
      const badge = document.getElementById('hudLvBadge');
      if (badge) badge.innerHTML = `<span style="color:#6da2f8;font-weight:700;">LV:</span> <span id="lblHeroLv" style="color:#fff;font-weight:600;">${hero.level}</span>`;
    }
  }

  const SAVE_KEY_V4 = 'aldenor_save_v4';

  // --- Automap -------------------------------------------------------------
  // Visited tiles per map. Sets in memory, plain arrays on disk. Only visited
  // tiles are drawn; the map is a survey record, not a live minimap. Old saves
  // simply have no `exploration` key and start blank.
  const mapExploration = {};

  function markMapExplored(mapId, tx, ty, radius = 2) {
    const map = (typeof MAPS !== 'undefined') ? MAPS[mapId] : null;
    if (!map) return;
    let seen = mapExploration[mapId];
    if (!seen) {
      seen = new Set();
      mapExploration[mapId] = seen;
    }
    const x0 = Math.max(0, tx - radius), x1 = Math.min(map.width - 1, tx + radius);
    const y0 = Math.max(0, ty - radius), y1 = Math.min(map.height - 1, ty + radius);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) seen.add(y * map.width + x);
    }
  }

  function serializeMapExploration() {
    const out = {};
    for (const mapId in mapExploration) out[mapId] = Array.from(mapExploration[mapId]);
    return out;
  }

  function loadMapExploration(saved) {
    resetMapExploration();
    if (!saved || typeof saved !== 'object') return;
    for (const mapId in saved) {
      if (Array.isArray(saved[mapId])) mapExploration[mapId] = new Set(saved[mapId]);
    }
  }

  function resetMapExploration() {
    for (const mapId in mapExploration) delete mapExploration[mapId];
  }

  function serializeGameState() {
    return {
      version: '4.1',
      timestamp: Date.now(),
      hero: {
        level: hero.level,
        exp: hero.exp,
        hp: hero.hp,
        maxHp: hero.maxHp,
        baseStr: hero.baseStr,
        baseDef: hero.baseDef,
        weapon: hero.weapon,
        armor: hero.armor,
        shield: hero.shield,
        accessory: hero.accessory,
        bag: hero.bag,
        quickSlots: hero.quickSlots,
        bonusMaxHp: hero.bonusMaxHp || 0,
        tp: hero.tp || 0,
        x: hero.x,
        y: hero.y,
        dir: hero.dir
      },
      nyah: {
        joined: flags.nyahJoinedParty || false,
        accessory: nyahCompanion.accessory,
        perks: nyahCompanion.perks
      },
      dungeonState: Object.assign({}, dungeonState, {
        cryptSkullLevers: [...dungeonState.cryptSkullLevers],
        cryptBraziers: [...dungeonState.cryptBraziers]
      }),
      activeMapId: activeMapId,
      flags: Object.assign({}, flags),
      exploration: serializeMapExploration()
    };
  }

  function deserializeGameState(data) {
    if (!data || !data.hero) return false;
    hero.level = data.hero.level || 1;
    hero.exp = data.hero.exp || 0;
    hero.bonusMaxHp = data.hero.bonusMaxHp || 0;
    hero.tp = data.hero.tp || 0;
    hero.maxHp = data.hero.maxHp || getMaxHpForLevel(hero.level);
    hero.hp = Math.min(hero.maxHp, data.hero.hp || hero.maxHp);
    hero.baseStr = data.hero.baseStr || getBaseStrForLevel(hero.level);
    hero.baseDef = data.hero.baseDef || getBaseDefForLevel(hero.level);
    hero.weapon = data.hero.weapon || 'rusty_sword';
    hero.armor = data.hero.armor || 'traveler_tunic';
    hero.shield = data.hero.shield || 'none';
    hero.accessory = data.hero.accessory || null;
    hero.bag = Array.isArray(data.hero.bag) ? data.hero.bag : [];
    hero.quickSlots = data.hero.quickSlots || ['potion_heal', 'potion_antidote', null];
    hero.x = data.hero.x ?? 240;
    hero.y = data.hero.y ?? 272;
    hero.dir = data.hero.dir ?? 0;

    Object.assign(flags, data.flags || {});
    if (data.nyah) {
      flags.nyahJoinedParty = !!data.nyah.joined;
      nyahCompanion.accessory = data.nyah.accessory || 'default_ribbon';
      nyahCompanion.perks = data.nyah.perks || [];
    }

    loadMapExploration(data.exploration);

    if (data.dungeonState) {
      Object.assign(dungeonState, data.dungeonState);
      if (Array.isArray(data.dungeonState.cryptSkullLevers)) {
        dungeonState.cryptSkullLevers = [...data.dungeonState.cryptSkullLevers];
      }
      // Old saves have no brazier key. Never inherit the live array: a stale
      // "all lit" would silently disable the crypt's darkness on load.
      if (!Array.isArray(data.dungeonState.cryptBraziers) || data.dungeonState.cryptBraziers.length !== 8) {
        dungeonState.cryptBraziers = [false, false, false, false, false, false, false, false];
      } else {
        dungeonState.cryptBraziers = data.dungeonState.cryptBraziers.map(v => !!v);
      }
      // Old saves also lack the aggregate flag. Derive it instead of inheriting
      // the live value, then make the tiles agree with it.
      const savedLit = data.dungeonState.cryptsBraziersLit;
      dungeonState.cryptsBraziersLit = (typeof savedLit === 'boolean')
        ? savedLit
        : (dungeonState.cryptBraziers.every(Boolean) || !!flags.bossLichDefeated);
      if (dungeonState.cryptsBraziersLit) {
        dungeonState.cryptBraziers = dungeonState.cryptBraziers.map(() => true);
      }
    }

    // Always rebuild: this reapplies every gate, chest and furniture state from
    // flags/dungeonState. Loading an old save must never inherit live map edits.
    buildAllMaps();

    if (data.activeMapId && MAPS[data.activeMapId]) {
      activeMapId = data.activeMapId;
    }
    window.collisionMap = getActiveMap().collisionMap;

    // The old save path only restored numbers; it left the party trail,
    // companions, camera, NPC schedules and monsters from the PREVIOUS world.
    refreshWorldAfterLoad();

    updateHudLevelBadge();
    updateHudBars();
    syncInventoryBridge();
    return true;
  }

  // Rebuilds all transient world state after a load (or a brand-new game).
  // Everything here is intentionally reconstructible from flags + dungeonState so
  // saves stay small and forward-compatible.
  function refreshWorldAfterLoad() {
    const curMap = getActiveMap();
    const mapPxW = curMap.width * TILE_SZ;
    const mapPxH = curMap.height * TILE_SZ;

    heroTrail = [{ x: hero.x, y: hero.y, dir: hero.dir }];
    window.heroTrail = heroTrail;
    hero.vx = 0;
    hero.vy = 0;
    hero.isMoving = false;

    if (window.fifiCompanion) {
      window.fifiCompanion.x = hero.x - 16;
      window.fifiCompanion.y = hero.y + 8;
      window.fifiCompanion.dir = hero.dir;
      window.fifiCompanion.isMoving = false;
      window.fifiCompanion.animFrame = 0;
      window.fifiCompanion.castTimer = 0;
    }
    nyahCompanion.x = hero.x + 16;
    nyahCompanion.y = hero.y + 8;
    nyahCompanion.dir = hero.dir;
    nyahCompanion.isMoving = false;
    nyahCompanion.trailBuffer = [{ x: hero.x, y: hero.y, dir: hero.dir }];

    transitionState.active = false;
    transitionState.timer = 0;
    transitionState.halfwayDone = false;
    transitionGraceTimer = 0.45;
    dialogueState.active = false;
    dialogueState.activeChoices = null;
    dialogueState.cooldownTimer = 0;
    dialogueCloseCooldown = 0.20;
    hero.isAttacking = false;
    hero.attackTimer = 0;
    hero.attackCooldown = 0;
    hero.invulnTimer = 0;
    // Dash stamina is transient by design: never serialized, fully refilled by
    // the same funnel that rebuilds the trail, monsters and companions.
    hero.stamina = hero.staminaMax || 100;
    hero.staminaRegenDelay = 0;
    hero.dodgeTimer = 0;
    hero.dodgeCooldown = 0;
    // The ore cart is transient: cancel a ride/run that was in progress and put
    // it back on its home rails. The map builder owns the barricade state.
    resetMinesCart();

    camera.x = (mapPxW < 256) ? Math.floor((mapPxW - 256) / 2) : Math.max(0, Math.min(mapPxW - 256, hero.x + 8 - 128));
    camera.y = (mapPxH < 224) ? Math.floor((mapPxH - 224) / 2) : Math.max(0, Math.min(mapPxH - 224, hero.y + 8 - 112));

    initMonsters(activeMapId);
    updateNpcSchedules();
    if (typeof syncDayNightHud === 'function') syncDayNightHud();
    window.collisionMap = curMap.collisionMap;
    updateItemBadge();
    updateHudLevelBadge();
    updateHudBars();
  }
  window.refreshWorldAfterLoad = refreshWorldAfterLoad;

  function saveGame(slotIndex = 0, isAuto = false) {
    try {
      const allSaves = JSON.parse(localStorage.getItem(SAVE_KEY_V4) || '{}');
      const key = isAuto ? 'auto' : `slot_${slotIndex}`;
      allSaves[key] = serializeGameState();
      localStorage.setItem(SAVE_KEY_V4, JSON.stringify(allSaves));
      playSfxBlip(1200);
      spawnFloatingText(isAuto ? "AUTO-SAVED" : `SAVED SLOT ${slotIndex + 1}`, hero.x, hero.y - 14, vceColor(7, 6, 1));
      return true;
    } catch (e) {
      console.warn("Save failed:", e);
      return false;
    }
  }

  function loadGame(slotIndex = 0, isAuto = false) {
    try {
      const allSaves = JSON.parse(localStorage.getItem(SAVE_KEY_V4) || '{}');
      const key = isAuto ? 'auto' : `slot_${slotIndex}`;
      const data = allSaves[key];
      if (!data) return false;
      const success = deserializeGameState(data);
      if (success) {
        playUiConfirm();
        spawnFloatingText(isAuto ? "LOADED AUTO" : `LOADED SLOT ${slotIndex + 1}`, hero.x, hero.y - 14, vceColor(3, 7, 7));
      }
      return success;
    } catch (e) {
      console.warn("Load failed:", e);
      return false;
    }
  }

  function autoSave() {
    saveGame(0, true);
  }

  function cycleNyahCosmetic() {
    const cosmetics = ['default_ribbon', 'crimson_ribbon', 'silver_bell', 'moonlight_cloak'];
    let idx = cosmetics.indexOf(nyahCompanion.accessory);
    if (idx < 0) idx = 0;
    nyahCompanion.accessory = cosmetics[(idx + 1) % cosmetics.length];
    playSfxBlip(1400);
    spawnFloatingText(nyahCompanion.accessory.replace('_', ' ').toUpperCase(), nyahCompanion.x, nyahCompanion.y - 12, vceColor(7, 6, 2));
  }

  function hasWallBetween(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) return false;
    const steps = Math.ceil(dist / 8);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = x0 + dx * t;
      const sy = y0 + dy * t;
      if (checkCollision(sx, sy)) return true;
    }
    return false;
  }
  window.hasWallBetween = hasWallBetween;

  function triggerNyahSouthGateAmbush() {
    if (flags.nyahRecruited) return;
    if (!flags.rivalMaidTrialStep || flags.rivalMaidTrialStep < 2) {
      hero.y = 22 * 16;
      hero.dir = 1;
      playSfxBlip(1200);
      startCustomDialogueTree([
        {
          speaker: 'FIFI',
          portraitId: 'fifi',
          expr: 'curious',
          text: "Master, wait! Before we venture out onto the monster-infested Coastal Plains, let's head up to the Grand Manor in northeast Aldenor and finish Miss Nyah's Hot Jasmine Tea trial!"
        }
      ], 'fifi');
      return;
    }
    // Step 2: Nyah is at the South Gate waiting to test the tourist and Fifi!
    playSfxBlip(1600);
    startCustomDialogueTree([
      {
        speaker: 'NYAH',
        portraitId: 'nyah',
        expr: 'smug',
        text: `Hold it right there, red-haired tourist! Part 2 of the Rival Maid Trial starts right outside this gate: defeat 3 Coastal Slimes! (${flags.southGateSlimesCleared || 0}/3 cleared). Nyah is watching from the gate—let's see if your bashful puppy maid can actually fight!`
      },
      {
        speaker: 'FIFI',
        portraitId: 'fifi',
        expr: 'determined',
        text: "Fifi won't let you down, Master! Let's defeat 3 Slimes on the Coastal Plains and report back to Miss Nyah!"
      }
    ], 'nyah');
  }

  function openBountyBoard() {
    const sCount = flags.bountyProgress.slime || 0;
    const cCount = flags.bountyProgress.crab || 0;
    const sDone = flags.bountiesClaimed.includes('bounty_slimes') ? '[CLAIMED]' : (sCount >= 5 ? '[READY FOR BARKEEP]' : `(${sCount}/5)`);
    const cDone = flags.bountiesClaimed.includes('bounty_crabs') ? '[CLAIMED]' : (cCount >= 3 ? '[READY FOR BARKEEP]' : `(${cCount}/3)`);
    playSfxBlip(1000);
    startCustomDialogue(
      'BOUNTY BOARD',
      'guard',
      `TAVERN BOUNTIES: 1. Plains Slimes ${sDone}: 60G & 50 EXP. 2. Armored Crabs ${cDone}: 90G & 80 EXP. Turn completed hunts into Barkeep Orson inside the tavern!`,
      null,
      true
    );
  }

  function updateNyahCompanion(dt) {
    if (!flags.nyahJoinedParty) return;

    if (nyahCompanion.attackCooldown > 0) nyahCompanion.attackCooldown -= dt;
    if (nyahCompanion.healCooldown > 0) nyahCompanion.healCooldown -= dt;
    if (nyahCompanion.swapCooldown > 0) nyahCompanion.swapCooldown -= dt;
    if (nyahCompanion.barkCooldown > 0) nyahCompanion.barkCooldown -= dt;
    if (nyahCompanion.attackTimer > 0) {
      nyahCompanion.attackTimer -= dt;
      if (nyahCompanion.attackTimer <= 0) {
        nyahCompanion.isAttacking = false;
      }
    }

    // Sync NPC entity for interaction
    const nyahNpc = npcs.find(n => n.id === 'nyah');
    if (nyahNpc) {
      nyahNpc.mapId = activeMapId;
      nyahNpc.x = nyahCompanion.x;
      nyahNpc.y = nyahCompanion.y;
      nyahNpc.isSweeping = false;
    }

    // Emergency Panic Heal (triggers when hero.hp <= 28% maxHp and cooldown <= 0)
    if (hero.hp > 0 && hero.hp <= Math.floor(hero.maxHp * 0.28) && nyahCompanion.healCooldown <= 0) {
      const healPercent = (nyahCompanion.accessory === 'silver_bell') ? 0.50 : 0.35;
      const healAmount = Math.max(10, Math.floor(hero.maxHp * healPercent));
      hero.hp = Math.min(hero.maxHp, hero.hp + healAmount);
      nyahCompanion.healCooldown = 18.0;
      playSfxHeal();
      spawnFloatingText(`NYAH HEAL +${healAmount}!`, hero.x - 6, hero.y - 12, vceColor(2, 7, 2));
      spawnFloatingText("STAY WITH ME, IDIOT!!", nyahCompanion.x - 16, nyahCompanion.y - 20, vceColor(7, 4, 6));
      updateHudBars();
    }

    // Follower Trail Buffer (records every ~8px of movement)
    const lastNode = nyahCompanion.trailBuffer[nyahCompanion.trailBuffer.length - 1];
    if (!lastNode || Math.hypot(hero.x - lastNode.x, hero.y - lastNode.y) >= 8) {
      nyahCompanion.trailBuffer.push({ x: hero.x, y: hero.y, dir: hero.dir });
      if (nyahCompanion.trailBuffer.length > 8) {
        nyahCompanion.trailBuffer.shift();
      }
    }

    const distToHero = Math.hypot(hero.x - nyahCompanion.x, hero.y - nyahCompanion.y);

    // Corridor Swap Rule (Zero Corridor Body-Blocking)
    if (distToHero < 10) {
      if (nyahCompanion.barkCooldown <= 0) {
        const nowTime = performance.now() / 1000;
        if (nowTime - nyahCompanion.lastBumpTime > 10) {
          nyahCompanion.bumpCount = 0;
        }
        nyahCompanion.bumpCount++;
        nyahCompanion.lastBumpTime = nowTime;

        if (nyahCompanion.bumpCount >= 3) {
          nyahCompanion.bumpCount = 0;
          nyahCompanion.barkCooldown = 4.5;
          spawnFloatingText("PERSONAL SPACE, MASTER!! >.<", nyahCompanion.x - 24, nyahCompanion.y - 16, vceColor(7, 3, 4));
        }
      }

      if (nyahCompanion.swapCooldown <= 0 && nyahCompanion.trailBuffer.length > 1) {
        const swapTarget = nyahCompanion.trailBuffer[0];
        if (!checkCollision(swapTarget.x, swapTarget.y)) {
          nyahCompanion.x = swapTarget.x;
          nyahCompanion.y = swapTarget.y;
          nyahCompanion.swapCooldown = 1.0;
        }
      }
    }

    // Combat Target Acquisition (monsters within 72px with clear line-of-sight—never through walls!)
    let combatTarget = null;
    let targetDist = 72;
    if (activeMapId === 'aldenor_coastal_plains' || activeMapId.startsWith('dungeon_') || activeMapId === 'bell_spire') {
      for (const m of monsters) {
        if (!m.alive) continue;
        const dNyah = Math.hypot(m.x - nyahCompanion.x, m.y - nyahCompanion.y);
        const dHero = Math.hypot(m.x - hero.x, m.y - hero.y);
        const closest = Math.min(dNyah, dHero);
        if (closest < targetDist && !hasWallBetween(nyahCompanion.x, nyahCompanion.y, m.x, m.y) && !hasWallBetween(hero.x, hero.y, m.x, m.y)) {
          combatTarget = m;
          targetDist = closest;
        }
      }
    }

    if (combatTarget && !nyahCompanion.isAttacking && nyahCompanion.attackCooldown <= 0) {
      const mDist = Math.hypot(combatTarget.x - nyahCompanion.x, combatTarget.y - nyahCompanion.y);
      if (mDist <= 20) {
        nyahCompanion.isAttacking = true;
        nyahCompanion.attackTimer = 0.18;
        const cd = (nyahCompanion.accessory === 'moonlight_cloak') ? 0.50 : 0.68;
        nyahCompanion.attackCooldown = cd;
        nyahCompanion.animFrame = (nyahCompanion.animFrame + 1) % 2;
        playSfxClaw();

        if (Math.abs(combatTarget.x - nyahCompanion.x) > Math.abs(combatTarget.y - nyahCompanion.y)) {
          nyahCompanion.dir = (combatTarget.x > nyahCompanion.x) ? 3 : 2;
        } else {
          nyahCompanion.dir = (combatTarget.y > nyahCompanion.y) ? 0 : 1;
        }

        const attackerStr = Number(getTotalHeroStr()) || 12;
        const mDef = Number(combatTarget.def ?? 4) || 4;
        let baseDmg = Math.max(2, Math.round((attackerStr * 0.65) - (mDef * 0.45)));
        const isCrit = (nyahCompanion.accessory === 'crimson_ribbon') && (Math.random() < 0.25);
        if (isCrit) baseDmg = Math.floor(baseDmg * 1.5);
        if (!Number.isFinite(baseDmg)) baseDmg = 2;

        combatTarget.hp -= baseDmg;
        combatTarget.flashTimer = 0.08;
        combatTarget.hitTimer = 0.22;
        hero.tp = Math.min(100, (hero.tp || 0) + 8);
        if (typeof updateHudBars === 'function') updateHudBars();
        nyahCompanion.squashX = 1.25; nyahCompanion.squashY = 0.8;
        spawnFloatingText(`-${baseDmg}${isCrit ? '!' : ''}`, combatTarget.x + 4, combatTarget.y - 6, isCrit ? vceColor(7, 3, 1) : vceColor(7, 6, 6));

        let kx = (combatTarget.x > nyahCompanion.x) ? 10 : -10;
        let ky = (combatTarget.y > nyahCompanion.y) ? 10 : -10;
        if (!checkCollision(combatTarget.x + kx, combatTarget.y)) combatTarget.x += kx;
        if (!checkCollision(combatTarget.x, combatTarget.y + ky)) combatTarget.y += ky;

        if (combatTarget.hp <= 0) {
          handleMonsterDefeat(combatTarget);
        }
      } else {
        const mdx = combatTarget.x - nyahCompanion.x;
        const mdy = combatTarget.y - nyahCompanion.y;
        const mag = Math.hypot(mdx, mdy) || 1;
        const step = (hero.speed * 1.1) * dt;
        const nextX = nyahCompanion.x + (mdx / mag) * step;
        const nextY = nyahCompanion.y + (mdy / mag) * step;
        if (!checkCollision(nextX, nyahCompanion.y)) nyahCompanion.x = nextX;
        if (!checkCollision(nyahCompanion.x, nextY)) nyahCompanion.y = nextY;
        nyahCompanion.isMoving = true;
        if (Math.abs(mdx) > Math.abs(mdy)) nyahCompanion.dir = (mdx > 0) ? 3 : 2;
        else nyahCompanion.dir = (mdy > 0) ? 0 : 1;
      }
    } else if (!nyahCompanion.isAttacking) {
      if (distToHero > 140) {
        nyahCompanion.x = hero.x;
        nyahCompanion.y = hero.y;
        nyahCompanion.isMoving = false;
      } else if (distToHero > 22) {
        const target = nyahCompanion.trailBuffer[0] || hero;
        const tdx = target.x - nyahCompanion.x;
        const tdy = target.y - nyahCompanion.y;
        const tmag = Math.hypot(tdx, tdy) || 1;

        const followSpeed = (distToHero > 88) ? (hero.speed * 1.35) : (hero.speed * 0.96);
        const step = followSpeed * dt;
        const nextX = nyahCompanion.x + (tdx / tmag) * step;
        const nextY = nyahCompanion.y + (tdy / tmag) * step;
        let moved = false;
        if (!checkCollision(nextX, nyahCompanion.y)) { nyahCompanion.x = nextX; moved = true; }
        if (!checkCollision(nyahCompanion.x, nextY)) { nyahCompanion.y = nextY; moved = true; }
        if (!moved && distToHero > 48) {
          nyahCompanion.x = hero.x;
          nyahCompanion.y = hero.y;
        }
        nyahCompanion.isMoving = true;

        if (Math.abs(tdx) > Math.abs(tdy)) nyahCompanion.dir = (tdx > 0) ? 3 : 2;
        else nyahCompanion.dir = (tdy > 0) ? 0 : 1;

        nyahCompanion.animTimer += dt;
        if (nyahCompanion.animTimer >= 0.14) {
          nyahCompanion.animTimer = 0;
          nyahCompanion.animFrame = (nyahCompanion.animFrame + 1) % 2;
        }
      } else {
        nyahCompanion.isMoving = false;
        nyahCompanion.animTimer += dt;
        if (nyahCompanion.animTimer > 3.0) {
          if (nyahCompanion.animTimer > 3.4) nyahCompanion.animTimer = 0;
        }
        if (Math.abs(hero.x - nyahCompanion.x) > Math.abs(hero.y - nyahCompanion.y)) {
          nyahCompanion.dir = (hero.x > nyahCompanion.x) ? 3 : 2;
        } else {
          nyahCompanion.dir = (hero.y > nyahCompanion.y) ? 0 : 1;
        }
      }
    }
  }

  const npcs = [
    {
      id: 'nyah',
      name: 'NYAH',
      mapId: 'aldenor_exterior',
      x: 384, y: 104, // Tile (24, 6.5) - Right in front of Grand Manor doors on red carpet
      w: 16, h: 16,
      dir: 0,
      idleTimer: 0,
      earTimer: 0,
      sweepTimer: 0,
      isSweeping: true,
      isEngaged: false,
      patrol: null
    },
    {
      id: 'lumina',
      name: 'LUMINA',
      mapId: 'aldenor_exterior',
      x: 96, y: 176, // Tile (6, 11) - West Market potion counter
      w: 16, h: 16,
      dir: 0,
      idleTimer: 0,
      isEngaged: false,
      patrol: null
    },
    {
      id: 'elder',
      name: 'ELDER',
      mapId: 'aldenor_exterior',
      x: 224, y: 160,
      w: 16, h: 16,
      dir: 2,
      speed: 24,
      isEngaged: false,
      patrol: { minX: 208, maxX: 272, axis: 'x', dir: 1, pauseTimer: 0 }
    },
    {
      id: 'guard',
      name: 'GUARD',
      mapId: 'aldenor_exterior',
      x: 224, y: 368,
      w: 16, h: 16,
      dir: 3,
      speed: 32,
      isEngaged: false,
      patrol: { minX: 200, maxX: 280, axis: 'x', dir: 1, pauseTimer: 0 }
    },
    {
      id: 'child',
      name: 'CHILD',
      mapId: 'aldenor_exterior',
      x: 220, y: 246,
      w: 16, h: 16,
      dir: 0,
      speed: 40,
      isEngaged: false,
      patrol: { minX: 210, maxX: 276, axis: 'x', dir: 1, pauseTimer: 0 }
    },
    {
      id: 'seagull',
      name: 'SEAGULL',
      mapId: 'aldenor_exterior',
      x: 264, y: 340,
      w: 16, h: 16,
      dir: 2,
      active: true,
      flapTimer: 0,
      isEngaged: false,
      patrol: null
    },
    {
      id: 'barkeep',
      name: 'BARKEEP',
      portraitId: null,
      mapId: 'harbor_tavern',
      x: 64, y: 48,
      w: 16, h: 16,
      dir: 0,
      isEngaged: false,
      patrol: null
    },
    {
      id: 'bard',
      name: 'BARD',
      portraitId: null,
      mapId: 'harbor_tavern',
      x: 160, y: 48,
      w: 16, h: 16,
      dir: 0,
      isEngaged: false,
      patrol: null,
      noteTimer: 0
    },
    {
      id: 'sailor',
      name: 'SAILOR',
      portraitId: null,
      mapId: 'harbor_tavern',
      x: 32, y: 128,
      w: 16, h: 16,
      dir: 3,
      isEngaged: false,
      patrol: null
    },
    {
      id: 'mercenary',
      name: 'MERCENARY',
      portraitId: null,
      mapId: 'harbor_tavern',
      x: 128, y: 128,
      w: 16, h: 16,
      dir: 2,
      isEngaged: false,
      patrol: null
    },
    {
      id: 'goran',
      name: 'GORAN',
      portraitId: null,
      mapId: 'goran_forge',
      x: 7 * 16, y: 3 * 16 + 8,
      w: 16, h: 16,
      dir: 0,
      isEngaged: false,
      patrol: null
    },
    {
      id: 'kitten_mochi',
      name: 'MOCHI',
      portraitId: null,
      mapId: 'aldenor_coastal_plains',
      x: 72, y: 160,
      w: 16, h: 16,
      dir: 3,
      isEngaged: false,
      patrol: null
    }
  ];

  const monsters = [];
  const drops = [];
  const floatingTexts = [];
  let dialogueCloseCooldown = 0;

  function spawnFloatingText(text, x, y, color = vceColor(7, 7, 7)) {
    const curM = (typeof getActiveMap === 'function') ? getActiveMap() : null;
    const textW = (text ? text.length : 10) * 6;
    const maxX = curM ? (curM.width * TILE_SZ - 8) : 248;
    let clampedX = Math.max(8, Math.min(maxX - textW, x));
    if (typeof camera !== 'undefined' && camera) {
      const minCamX = camera.x + 8;
      const maxCamX = camera.x + 248 - textW;
      clampedX = Math.max(minCamX, Math.min(maxCamX, clampedX));
    }
    const nearbyCount = floatingTexts.filter(ft => ft.life > 0.2 && Math.abs(ft.y - y) < 18 && Math.abs(ft.x - clampedX) < 48).length;
    const stackedY = y - nearbyCount * 11;
    floatingTexts.push({ text, x: clampedX, y: stackedY, vy: -14, life: 1.3, color });
  }

  function spawnMonsterSparkleBurst(mx, my) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spd = 22 + Math.random() * 18;
      const col = (i % 2 === 0) ? vceColor(7, 7, 7) : vceColor(7, 6, 1);
      particles.push({
        x: mx + 8,
        y: my + 8,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.35,
        maxLife: 0.35,
        size: (i % 2 === 0) ? 2 : 1,
        color: col
      });
    }
  }

  function spawnBroomDust(bx, by) {
    const count = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const size = (Math.random() < 0.5) ? 1 : 2;
      const col = (Math.random() < 0.5) ? vceColor(6, 6, 5) : vceColor(5, 5, 4);
      particles.push({
        x: bx + (Math.random() * 4 - 2),
        y: by + (Math.random() * 2 - 1),
        vx: (Math.random() - 0.5) * 6,
        vy: -8 - Math.random() * 6,
        life: 0.30,
        maxLife: 0.30,
        size: size,
        color: col
      });
    }
  }

  function spawnMusicalNote(px, py) {
    particles.push({
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 4,
      vy: -12,
      life: 0.9,
      maxLife: 0.9,
      size: 2,
      color: vceColor(7, 6, 2)
    });
  }

  function isBossActive() {
    if (!monsters || monsters.length === 0) return null;
    const boss = monsters.find(m => m.alive && (
      m.type === 'boss_golem' ||
      m.type === 'boss_lich' ||
      m.type === 'boss_leviathan' ||
      m.type === 'boss_eclipse'
    ));
    if (!boss) return null;
    if (activeMapId.startsWith('dungeon_')) {
      if (hero.x >= 18 * 16 && hero.y < 16 * 16) return boss;
    } else if (activeMapId === 'bell_spire') {
      if (hero.y < 14 * 16) return boss;
    }
    return null;
  }

  function handleMonsterDefeat(m) {
    m.alive = false;
    spawnMonsterSparkleBurst(m.x, m.y);
    addExp(m.exp || 20);
    // Aggression feeds mobility: each kill returns 18 stamina, so clearing a
    // room is how a player refills the dodge pool without leaving combat.
    if (hero.stamina < hero.staminaMax) {
      hero.stamina = Math.min(hero.staminaMax, hero.stamina + 18);
      spawnFloatingText("+18 ST", m.x + 2, m.y - 20, vceColor(3, 7, 7));
      updateHudBars();
    }
    // Grave Lantern (Lich drop): every kill feeds 12 HP back. Applied after the
    // EXP so a level-up refill cannot mask whether the heal actually fired.
    if (hasItem('grave_lantern') && hero.hp > 0 && hero.hp < hero.maxHp) {
      hero.hp = Math.min(hero.maxHp, hero.hp + 12);
      spawnFloatingText("+12 HP", m.x - 4, m.y - 18, vceColor(3, 7, 5));
      updateHudBars();
    }
    flags.bountyProgress[m.type] = (flags.bountyProgress[m.type] || 0) + 1;
    if (m.type === 'slime') {
      flags.southGateSlimesCleared = (flags.southGateSlimesCleared || 0) + 1;
      if (flags.rivalMaidTrialStep === 2 && flags.southGateSlimesCleared === 3 && !flags.nyahRecruited) {
        spawnFloatingText("TRIAL COMPLETED! TALK TO NYAH AT SOUTH GATE!", hero.x - 30, hero.y - 12, vceColor(7, 6, 1));
      }
    }

    // Pete's Locket drop from crabs
    if (flags.peteQuestActive && !flags.peteQuestDone && !hasItem('brass_locket') && m.type === 'crab' && Math.random() < 0.40) {
      addItem('brass_locket', 1);
      spawnFloatingText('+LOCKET!', m.x, m.y - 12, vceColor(7, 6, 1));
      playSfxCoin();
    }

    // Boss Defeats & Relic Rewards
    if (m.type === 'boss_golem') {
      flags.bossGolemDefeated = true;
      flags.bellForkFound = true;
      addItem('bell_tuning_fork', 1);
      if (!hasItem('crushers_core')) addItem('crushers_core', 1);
      if (!nyahCompanion.perks.includes('dual_spin')) nyahCompanion.perks.push('dual_spin');
      playSfxLevelUp();
      autoSave();
      startCustomDialogueTree([
        { speaker: 'NYAH', expr: 'smug', text: "BOOM!! Crushed the Crusher! We got the Silver Bell Tuning Fork—and its Core is still humming, so nyah kept it! Dodge into a creep and it bursts for 12. Look how fast our footwork is together now, too—unlocked [Perk: Dual Whirlwind Slash]!" }
      ], 'nyah');
    } else if (m.type === 'boss_lich') {
      flags.bossLichDefeated = true;
      flags.bellClapperFound = true;
      addItem('bell_clapper', 1);
      // Signature drop. The lantern turns every kill in the crypts into a small
      // heal, so the late rooms are about route pacing instead of potion count.
      if (!hasItem('grave_lantern')) addItem('grave_lantern', 1);
      if (!nyahCompanion.perks.includes('shadow_pounce')) nyahCompanion.perks.push('shadow_pounce');
      playSfxLevelUp();
      // The Clapper's toll breaks Malakor's dusk. Leaving the crypts in permanent
      // twilight was the reason the old build needed a manual day switch. The
      // dawn also floods the crypt: every brazier lights and the darkness lifts.
      dungeonState.cryptBraziers = [true, true, true, true, true, true, true, true];
      dungeonState.cryptsBraziersLit = true;
      setTimeOfDay(false, { silent: true });
      // setTimeOfDay() early-returns when it is already midday, so rebuild the
      // braziers explicitly. Otherwise a daylight kill would leave dark bowls.
      buildAllMaps();
      window.collisionMap = getActiveMap().collisionMap;
      autoSave();
      startCustomDialogueTree([
        { speaker: 'NYAH', expr: 'smug', text: "Take a nap in your coffin, bonehead! That's the Silver Bell Clapper—and listen, the toll broke Malakor's dusk! The sun's coming up over the harbor again. Nyah also swiped his Grave Lantern: every creep we drop now gives Master 12 HP back. Plus she can vault right over enemy shields—unlocked [Perk: Shadow Pounce]!" }
      ], 'nyah');
    } else if (m.type === 'boss_leviathan') {
      flags.bossLeviathanDefeated = true;
      flags.sanctumCrestFound = true;
      addItem('sanctum_crest', 1);
      // Signature drop. Clerici's Mail was defined but never obtainable; the
      // dragon sleeping on Clerici's shrine is the right owner for it.
      if (!hasItem('clerici_mail')) addItem('clerici_mail', 1);
      if (!nyahCompanion.perks.includes('guardians_devotion')) nyahCompanion.perks.push('guardians_devotion');
      playSfxLevelUp();
      autoSave();
      startCustomDialogueTree([
        { speaker: 'NYAH', expr: 'normal', text: "We got all three relics!! The Tuning Fork, the Clapper, and the Sacred Sanctum Crest! ...and look what washed out of her hoard: Clerici's Mail, +52 DEF! Master, we can finally open the sealed gate behind the Grand Manor and climb the Northern Bell Tower Spire! No matter what happens up there, nyah has your back—unlocked [Perk: Guardian's Devotion]!" }
      ], 'nyah');
    } else if (m.type === 'boss_eclipse') {
      flags.bossEclipseDefeated = true;
      flags.gameCompleted = true;
      flags.chapter = 5;
      flags.isTwilight = false;
      // Post-game trophy. It only matters after the ending, which is fine:
      // the crypts stay open and the skeletons there still count as undead.
      if (!hasItem('crown_of_dawn')) addItem('crown_of_dawn', 1);
      playSfxBellTolling();
      startEpilogueCinema();
    } else {
      // Normal monster drop
      const dropType = (Math.random() < 0.5) ? 'coin' : 'herb';
      drops.push({
        type: dropType,
        x: m.x,
        y: m.y,
        collected: false
      });
      spawnFloatingText(dropType === 'coin' ? '+GOLD' : '+HERB', m.x - 4, m.y - 6, vceColor(7, 7, 1));
    }
  }

  function startWhirlwindSpin() {
    if (dialogueState.active || transitionState.active) return;
    hero.isAttacking = true;
    hero.isSpinning = true;
    hero.attackTimer = 0.26;
    hero.attackCooldown = 0.35;
    playSfxSpin();

    const hasDualSpin = nyahCompanion.perks && nyahCompanion.perks.includes('dual_spin');
    if (hasDualSpin) {
      nyahCompanion.isAttacking = true;
      nyahCompanion.attackTimer = 0.26;
      spawnFloatingText("DUAL SPIN!!", nyahCompanion.x - 12, nyahCompanion.y - 14, vceColor(7, 3, 4));
    }

    const spinRadius = hasDualSpin ? 42 : 32;
    monsters.forEach(m => {
      if (!m.alive || m.hitTimer > 0) return;
      const d = Math.hypot((m.x + 8) - (hero.x + 8), (m.y + 8) - (hero.y + 8));
      if (d <= spinRadius) {
        const mult = hasDualSpin ? 1.8 : 1.4;
        let dmg = calcHeroDamage(m.def, mult);
        if (!Number.isFinite(dmg)) dmg = 4;
        m.hp -= dmg;
        m.flashTimer = 0.12;
        m.hitTimer = 0.28;
        playSfxHit();
        hero.tp = Math.min(100, (hero.tp || 0) + 12);
        if (typeof updateHudBars === 'function') updateHudBars();
        hero.squashX = 1.3; hero.squashY = 0.75;
        spawnFloatingText(`CRIT! -${dmg}`, m.x + 2, m.y - 6, vceColor(7, 6, 1));

        const kx = (m.x + 8) - (hero.x + 8);
        const ky = (m.y + 8) - (hero.y + 8);
        const kmag = Math.hypot(kx, ky) || 1;
        const targetKx = m.x + (kx / kmag) * 18;
        const targetKy = m.y + (ky / kmag) * 18;
        if (!checkCollision(targetKx, m.y)) m.x = targetKx;
        if (!checkCollision(m.x, targetKy)) m.y = targetKy;

        if (m.hp <= 0) {
          handleMonsterDefeat(m);
        }
      }
    });

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const p = enemyProjectiles[i];
      if (Math.hypot(p.x - (hero.x + 8), p.y - (hero.y + 8)) <= spinRadius + 12) {
        p.vx = -p.vx * 1.5;
        p.vy = -p.vy * 1.5;
        spawnFloatingText("DEFLECTED!", p.x, p.y - 6, vceColor(7, 7, 1));
      }
    }

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r = 20;
      particles.push({
        x: hero.x + 8 + Math.cos(angle) * r,
        y: hero.y + 8 + Math.sin(angle) * r,
        vx: Math.cos(angle + Math.PI / 2) * 25,
        vy: Math.sin(angle + Math.PI / 2) * 25,
        life: 0.22,
        maxLife: 0.22,
        size: 2,
        color: hasDualSpin ? vceColor(7, 4, 6) : vceColor(7, 7, 7)
      });
    }
  }

  function initMonsters(mapId = activeMapId) {
    monsters.length = 0;
    drops.length = 0;
    enemyProjectiles.length = 0;
    swordBeams.length = 0;

    if (mapId === 'aldenor_coastal_plains') {
      monsters.push(
        { id: 'slime1', type: 'slime', x: 8 * 16, y: 7 * 16, hp: 24, maxHp: 24, atk: 12, def: 4, exp: 12, speed: 28, hopTimer: 0, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'slime2', type: 'slime', x: 22 * 16, y: 9 * 16, hp: 24, maxHp: 24, atk: 12, def: 4, exp: 12, speed: 28, hopTimer: 0.3, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'slime3', type: 'slime', x: 15 * 16, y: 12 * 16, hp: 24, maxHp: 24, atk: 12, def: 4, exp: 12, speed: 28, hopTimer: 0.6, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'crab1', type: 'crab', x: 9 * 16, y: 18 * 16, hp: 42, maxHp: 42, atk: 18, def: 10, exp: 22, speed: 38, patrolDir: 1, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'crab2', type: 'crab', x: 21 * 16, y: 19 * 16, hp: 42, maxHp: 42, atk: 18, def: 10, exp: 22, speed: 38, patrolDir: -1, hitTimer: 0, flashTimer: 0, alive: true }
      );
    } else if (mapId === 'dungeon_mines') {
      monsters.push(
        { id: 'm_bat1', type: 'cave_bat', x: 5 * 16, y: 22 * 16, hp: 36, maxHp: 36, atk: 22, def: 8, exp: 28, speed: 42, sineTimer: 0, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'm_gob1', type: 'goblin_miner', x: 12 * 16, y: 24 * 16, hp: 65, maxHp: 65, atk: 28, def: 14, exp: 45, speed: 32, shootTimer: 2.0, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'm_bee1', type: 'rock_beetle', x: 7 * 16, y: 10 * 16, hp: 90, maxHp: 90, atk: 32, def: 28, exp: 60, speed: 26, dir: 0, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'm_gob2', type: 'goblin_miner', x: 13 * 16, y: 8 * 16, hp: 65, maxHp: 65, atk: 28, def: 14, exp: 45, speed: 32, shootTimer: 1.5, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'm_bat2', type: 'cave_bat', x: 24 * 16, y: 22 * 16, hp: 36, maxHp: 36, atk: 22, def: 8, exp: 28, speed: 42, sineTimer: 1.2, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'm_bee2', type: 'rock_beetle', x: 28 * 16, y: 20 * 16, hp: 90, maxHp: 90, atk: 32, def: 28, exp: 60, speed: 26, dir: 1, hitTimer: 0, flashTimer: 0, alive: true }
      );
      if (!flags.bossGolemDefeated) {
        monsters.push(
          { id: 'boss_golem', type: 'boss_golem', name: 'OBSIDIAN CRUSHER', x: 26 * 16, y: 7 * 16, hp: 420, maxHp: 420, atk: 42, def: 22, exp: 350, speed: 35, stateTimer: 0, jumpTimer: 0, hitTimer: 0, flashTimer: 0, alive: true }
        );
      }
    } else if (mapId === 'dungeon_crypts') {
      monsters.push(
        { id: 'c_wisp1', type: 'crypt_wisp', x: 5 * 16, y: 22 * 16, hp: 75, maxHp: 75, atk: 38, def: 16, exp: 75, speed: 38, boltTimer: 2.2, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'c_spid1', type: 'crypt_spider', x: 12 * 16, y: 24 * 16, hp: 95, maxHp: 95, atk: 42, def: 22, exp: 90, speed: 44, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'c_skel1', type: 'skeleton_knight', x: 7 * 16, y: 10 * 16, hp: 135, maxHp: 135, atk: 48, def: 34, exp: 120, speed: 30, parry: true, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'c_spid2', type: 'crypt_spider', x: 13 * 16, y: 8 * 16, hp: 95, maxHp: 95, atk: 42, def: 22, exp: 90, speed: 44, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'c_skel2', type: 'skeleton_knight', x: 28 * 16, y: 20 * 16, hp: 135, maxHp: 135, atk: 48, def: 34, exp: 120, speed: 30, parry: true, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'c_wisp2', type: 'crypt_wisp', x: 24 * 16, y: 22 * 16, hp: 75, maxHp: 75, atk: 38, def: 16, exp: 75, speed: 38, boltTimer: 1.5, hitTimer: 0, flashTimer: 0, alive: true }
      );
      if (!flags.bossLichDefeated) {
        monsters.push(
          { id: 'boss_lich', type: 'boss_lich', name: 'LORD MALAKOR', x: 26 * 16, y: 7 * 16, hp: 750, maxHp: 750, atk: 58, def: 32, exp: 800, speed: 36, teleportTimer: 4.0, castTimer: 1.8, shieldAngle: 0, hitTimer: 0, flashTimer: 0, alive: true }
        );
      }
    } else if (mapId === 'dungeon_shrine') {
      monsters.push(
        { id: 's_jelly1', type: 'electric_jelly', x: 5 * 16, y: 22 * 16, hp: 130, maxHp: 130, atk: 56, def: 28, exp: 160, speed: 28, pulseTimer: 2.8, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 's_triton1', type: 'armored_triton', x: 12 * 16, y: 24 * 16, hp: 180, maxHp: 180, atk: 66, def: 42, exp: 210, speed: 40, lungeTimer: 2.5, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 's_coral1', type: 'coral_crab', x: 7 * 16, y: 10 * 16, hp: 240, maxHp: 240, atk: 74, def: 56, exp: 260, speed: 24, bubbleTimer: 3.0, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 's_jelly2', type: 'electric_jelly', x: 13 * 16, y: 8 * 16, hp: 130, maxHp: 130, atk: 56, def: 28, exp: 160, speed: 28, pulseTimer: 1.4, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 's_triton2', type: 'armored_triton', x: 28 * 16, y: 20 * 16, hp: 180, maxHp: 180, atk: 66, def: 42, exp: 210, speed: 40, lungeTimer: 1.8, hitTimer: 0, flashTimer: 0, alive: true }
      );
      if (!flags.bossLeviathanDefeated) {
        monsters.push(
          { id: 'boss_leviathan', type: 'boss_leviathan', name: 'CHARYBDIS QUEEN', x: 26 * 16, y: 7 * 16, hp: 1200, maxHp: 1200, atk: 82, def: 46, exp: 1600, speed: 30, waveTimer: 3.5, geyserTimer: 2.0, hitTimer: 0, flashTimer: 0, alive: true }
        );
      }
    } else if (mapId === 'bell_spire') {
      monsters.push(
        { id: 'sp_guard1', type: 'shadow_guard', x: 10 * 16, y: 20 * 16, hp: 220, maxHp: 220, atk: 80, def: 50, exp: 320, speed: 45, dashTimer: 2.0, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'sp_guard2', type: 'shadow_guard', x: 6 * 16, y: 15 * 16, hp: 220, maxHp: 220, atk: 80, def: 50, exp: 320, speed: 45, dashTimer: 2.8, hitTimer: 0, flashTimer: 0, alive: true },
        { id: 'sp_guard3', type: 'shadow_guard', x: 14 * 16, y: 15 * 16, hp: 220, maxHp: 220, atk: 80, def: 50, exp: 320, speed: 45, dashTimer: 1.5, hitTimer: 0, flashTimer: 0, alive: true }
      );
      if (!flags.bossEclipseDefeated) {
        monsters.push(
          { id: 'boss_eclipse', type: 'boss_eclipse', name: 'SHADOW OF THE ECLIPSE', x: 10 * 16, y: 6 * 16, hp: 1800, maxHp: 1800, atk: 96, def: 55, exp: 5000, speed: 38, phase: 1, orbTimer: 2.5, cloneTimer: 6.0, hitTimer: 0, flashTimer: 0, alive: true }
        );
      }
    }
  }

  // Dash stamina (roadmap 10). 100 max, 34 per step, 28/s regen after a 0.35 s
  // beat: two committed steps, then either disengage or spend a potion. Tuned
  // together with the slower boss cadence below so limited i-frames stay fair.
  const DODGE_STAMINA_COST = 34;
  const HERO_STAMINA_MAX = 100;
  const HERO_STAMINA_REGEN = 28;
  const HERO_STAMINA_DELAY = 0.35;

  // A short step with i-frames. This is the player's only real defensive verb:
  // before it existed, the only way to avoid a boss pattern was to walk out of
  // range, which made every fight a potion race. Direction comes from the held
  // d-pad, falling back to the facing direction when standing still.
  function startDodge() {
    if (hero.dodgeCooldown > 0 || hero.dodgeTimer > 0) return;
    if (dialogueState.active || transitionState.active || statusMenuState.open) return;
    // Refuse the step before it consumes the cooldown: an empty pool must read as
    // "not now", not as a silent input drop. Move covers the low-stamina state.
    if (hero.stamina < DODGE_STAMINA_COST) {
      playSfxBlip(220);
      spawnFloatingText("OUT OF STAMINA!", hero.x - 12, hero.y - 14, vceColor(6, 5, 2));
      return;
    }

    const down = (typeof keysDown !== 'undefined' && keysDown) ? keysDown : {};
    let ax = 0, ay = 0;
    if (down['ArrowUp'] || down['KeyW']) ay -= 1;
    if (down['ArrowDown'] || down['KeyS']) ay += 1;
    if (down['ArrowLeft'] || down['KeyA']) ax -= 1;
    if (down['ArrowRight'] || down['KeyD']) ax += 1;
    if (ax === 0 && ay === 0) {
      if (hero.dir === 0) ay = 1;
      else if (hero.dir === 1) ay = -1;
      else if (hero.dir === 2) ax = -1;
      else ax = 1;
    } else {
      const mag = Math.hypot(ax, ay) || 1;
      ax = ax / mag;
      ay = ay / mag;
    }

    // Dodging out of an attack is deliberate: commit to the step, cancel the swing.
    hero.isAttacking = false;
    hero.isSpinning = false;
    hero.attackTimer = 0;
    hero.chargeTimer = 0;
    hero.chargeReady = false;
    hero.stamina = Math.max(0, hero.stamina - DODGE_STAMINA_COST);
    hero.staminaRegenDelay = HERO_STAMINA_DELAY;
    updateHudBars();
    hero.dodgeTimer = 0.22;
    // The pool is the limiter now; the short cooldown only stops a double-tap
    // from spending two charges on the same i-frame window.
    hero.dodgeCooldown = 0.30;
    hero.dodgeDirX = ax;
    hero.dodgeDirY = ay;
    hero.invulnTimer = Math.max(hero.invulnTimer || 0, 0.24);
    if (ay > 0) hero.dir = 0;
    else if (ay < 0) hero.dir = 1;
    else if (ax < 0) hero.dir = 2;
    else if (ax > 0) hero.dir = 3;

    playSfxSpin();
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: hero.x + 8 - ax * 6 + (Math.random() * 8 - 4),
        y: hero.y + 12 - ay * 6 + (Math.random() * 6 - 3),
        vx: -ax * 18 + (Math.random() - 0.5) * 20,
        vy: -ay * 10 + (Math.random() - 0.5) * 12,
        life: 0.28, maxLife: 0.28, size: 2, color: vceColor(5, 5, 6)
      });
    }

    // Crusher's Core (Golem drop): the dodge's dust is stone shrapnel. Fixed
    // 12 damage and the 34-stamina step cost keep it a positioning tool rather
    // than a second weapon.
    if (hasItem('crushers_core')) {
      let burst = false;
      for (const m of monsters) {
        if (!m.alive) continue;
        if (Math.hypot((m.x + 8) - (hero.x + 8), (m.y + 8) - (hero.y + 12)) > 34) continue;
        burst = true;
        m.hp -= 12;
        m.flashTimer = 0.18;
        m.hitTimer = Math.max(m.hitTimer || 0, 0.25);
        spawnFloatingText("STONE BURST! -12", m.x - 10, m.y - 10, vceColor(6, 5, 4));
        if (m.hp <= 0) handleMonsterDefeat(m);
      }
      if (burst) {
        playSfxHit();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          particles.push({
            x: hero.x + 8, y: hero.y + 14,
            vx: Math.cos(a) * 46, vy: Math.sin(a) * 36 - 10,
            life: 0.3, maxLife: 0.3, size: 2, color: vceColor(5, 4, 3)
          });
        }
      }
    }
  }

  // =========================================================================
  // Old Quarry Mines ore cart (roadmap 4, B1)
  // One cart lives on the x = 8 rail. It is transient, rebuilt from
  // dungeonState on load, and rebuilt again by the map builder. Two modes:
  //  * run   — a scripted, telegraphed drop from the top that smashes the
  //            barricade at (8,5) when both track switches are set. Being on the
  //            rail is the hazard; stepping off is the counter-play.
  //  * ride  — board with E/Space and the cart carries you along the rail. It
  //            runs over monsters (12 each) and is safe to stand in.
  // =========================================================================
  const minesCart = {
    x: 8 * 16,
    y: 26 * 16,
    riding: false,
    dir: -1,
    hitIds: new Set(),
    run: null
  };

  function resetMinesCart() {
    minesCart.x = 8 * 16;
    minesCart.y = 26 * 16;
    minesCart.riding = false;
    minesCart.dir = -1;
    minesCart.hitIds = new Set();
    minesCart.run = null;
  }

  // Called by the second track switch. The 0.6 s warning is the tell: the cart
  // sits at the top of the rail with a ! over it before it starts rolling.
  function startMinesCartRun() {
    if (activeMapId !== 'dungeon_mines' || minesCart.riding || minesCart.run) return false;
    if (dungeonState.minesBarricadeBroken) return false;
    // (8,2) is the weapon chest, so the rail's usable top is (8,3).
    minesCart.x = 8 * 16;
    minesCart.y = 3 * 16;
    minesCart.run = { phase: 'warn', timer: 0.6, speed: 0 };
    playSfxBlip(420);
    spawnFloatingText("! ORE CART RELEASED !", 8 * 16 - 26, 3 * 16 - 12, vceColor(7, 3, 2));
    return true;
  }

  function breakMinesBarricade() {
    if (dungeonState.minesBarricadeBroken) return;
    dungeonState.minesBarricadeBroken = true;
    dungeonState.minesCartCleared = true;
    buildAllMaps();
    window.collisionMap = getActiveMap().collisionMap;
    playSfxLevelUp();
    spawnMonsterSparkleBurst(8 * 16, 5 * 16);
    for (let i = 0; i < 18; i++) {
      particles.push({
        x: 8 * 16 + 8, y: 5 * 16 + 8,
        vx: (Math.random() - 0.5) * 90,
        vy: -20 - Math.random() * 60,
        life: 0.55, maxLife: 0.55, size: 2, color: vceColor(5, 3, 1)
      });
    }
    spawnFloatingText("BARRICADE SMASHED!", hero.x - 24, hero.y - 14, vceColor(7, 6, 1));
    startCustomDialogueTree([{
      speaker: 'MINES', portraitId: null, expr: 'friendly',
      text: "The ore cart thunders down the aligned rails, splintering the wooden barricade! Its wheels rattle past into the lower tunnel - and the iron portcullis to the Obsidian Crusher's Sanctum groans open."
    }], 'nyah');
  }

  function getMinesCartRideDir() {
    // Below the barricade but above the bottom half: the only useful trip is up.
    if (!dungeonState.minesBarricadeBroken && minesCart.y > 5 * 16 && minesCart.y < 7 * 16) return -1;
    return minesCart.y > 14 * 16 ? -1 : 1;
  }

  function startMinesCartRide() {
    if (activeMapId !== 'dungeon_mines' || minesCart.riding || minesCart.run) return false;
    minesCart.riding = true;
    minesCart.dir = getMinesCartRideDir();
    minesCart.hitIds = new Set();
    hero.isAttacking = false;
    hero.attackTimer = 0;
    hero.chargeTimer = 0;
    hero.chargeReady = false;
    hero.isMoving = false;
    playSfxBlip(600);
    spawnFloatingText("ALL ABOARD!", hero.x - 14, hero.y - 16, vceColor(7, 6, 2));
    return true;
  }

  function endMinesCartRide(reason) {
    minesCart.riding = false;
    hero.isAttacking = false;
    hero.attackTimer = 0;
    // Step out beside the cart; never drop the hero inside a wall.
    const spots = [
      [minesCart.x + 20, minesCart.y + 2],
      [minesCart.x - 20, minesCart.y + 2],
      [minesCart.x, minesCart.y + 20]
    ];
    let placed = false;
    for (const [sx, sy] of spots) {
      if (!checkCollision(sx, sy)) { hero.x = sx; hero.y = sy; placed = true; break; }
    }
    if (!placed) { hero.x = minesCart.x; hero.y = minesCart.y + 18; }
    heroTrail = [{ x: hero.x, y: hero.y, dir: hero.dir }];
    window.heroTrail = heroTrail;
    if (reason === 'blocked') {
      spawnFloatingText("BARRICADE IN THE WAY!", minesCart.x - 26, minesCart.y - 14, vceColor(7, 3, 2));
    } else {
      spawnFloatingText("END OF THE LINE.", minesCart.x - 18, minesCart.y - 14, vceColor(6, 6, 6));
    }
  }

  // Returns true while the cart owns the frame (the ride), so 06 can skip the
  // walking/casting input for that frame. The scripted run deliberately does
  // not own the frame: the player must be able to step off the rail.
  function updateMinesCart(dt) {
    if (activeMapId !== 'dungeon_mines') return false;

    if (minesCart.run) {
      const run = minesCart.run;
      if (run.phase === 'warn') {
        run.timer -= dt;
        if (run.timer <= 0) { run.phase = 'roll'; run.speed = 150; }
      } else {
        const prevY = minesCart.y;
        minesCart.y += run.speed * dt;
        // The hazard: one tile wide, telegraphed, and only if you refuse to move.
        if (hero.invulnTimer <= 0 &&
            Math.abs((hero.x + 8) - (minesCart.x + 8)) < 13 &&
            Math.abs((hero.y + 12) - (minesCart.y + 8)) < 16) {
          const dmg = calcMonsterDamage(16);
          hero.hp = Math.max(0, hero.hp - dmg);
          hero.invulnTimer = 0.9;
          playSfxHit();
          spawnFloatingText(`-${dmg} CART!`, hero.x, hero.y - 14, vceColor(7, 3, 2));
          updateHudBars();
        }
        if (!dungeonState.minesBarricadeBroken && prevY < 5 * 16 + 8 && minesCart.y >= 5 * 16 + 8) {
          breakMinesBarricade();
        }
        if (minesCart.y >= 26 * 16) {
          minesCart.y = 26 * 16;
          minesCart.run = null;
          playSfxHit();
        }
      }
      return false;
    }

    if (!minesCart.riding) return false;

    const step = 118 * dt;
    minesCart.y += minesCart.dir * step;
    hero.x = minesCart.x;
    hero.y = minesCart.y - 2;
    hero.dir = minesCart.dir < 0 ? 1 : 0;
    hero.invulnTimer = Math.max(hero.invulnTimer || 0, 0.12);

    // Monsters in the cart's path take a one-time hit per ride.
    for (const m of monsters) {
      if (!m.alive || minesCart.hitIds.has(m.id)) continue;
      if (Math.hypot((m.x + 8) - (minesCart.x + 8), (m.y + 8) - (minesCart.y + 8)) > 20) continue;
      minesCart.hitIds.add(m.id);
      m.hp -= 12;
      m.flashTimer = 0.18;
      m.hitTimer = Math.max(m.hitTimer || 0, 0.3);
      playSfxHit();
      spawnFloatingText("CART! -12", m.x - 10, m.y - 10, vceColor(7, 5, 3));
      if (m.hp <= 0) handleMonsterDefeat(m);
    }

    if (!dungeonState.minesBarricadeBroken) {
      if (minesCart.dir < 0 && minesCart.y <= 6 * 16) {
        minesCart.y = 6 * 16;
        if (dungeonState.minesTrackSwitch1 && dungeonState.minesTrackSwitch2) {
          breakMinesBarricade();
        } else {
          endMinesCartRide('blocked');
          return false;
        }
      } else if (minesCart.dir > 0 && minesCart.y >= 4 * 16) {
        // Defensive: the cart can only be above the barricade after a run that
        // already smashed it, but never let a ride phase through the boards.
        minesCart.y = 4 * 16;
        endMinesCartRide('blocked');
        return false;
      }
    }

    if (minesCart.y <= 3 * 16) {
      minesCart.y = 3 * 16;
      endMinesCartRide('top');
      return false;
    }
    if (minesCart.y >= 26 * 16) {
      minesCart.y = 26 * 16;
      endMinesCartRide('bottom');
      return false;
    }
    return true;
  }

  function startSwordSlash() {
    if (hero.dodgeTimer > 0) return;
    if (hero.attackCooldown > 0 || dialogueState.active || transitionState.active) return;
    hero.isAttacking = true;
    hero.attackTimer = 0.16;
    hero.attackCooldown = 0.26;
    playSfxSword();

    // Blade wind-trail: a handful of sparks thrown along the swing direction.
    // They live just longer than the 0.16 s arc, so the swing has a tail.
    const swingX = hero.dir === 3 ? 10 : hero.dir === 2 ? -2 : 6;
    const swingY = hero.dir === 0 ? 10 : hero.dir === 1 ? -2 : 6;
    const sparkCol = (WEAPONS[hero.weapon] && WEAPONS[hero.weapon].arcColor) ? WEAPONS[hero.weapon].arcColor : vceColor(7, 7, 5);
    for (let i = 0; i < 5; i++) {
      const spread = (Math.random() - 0.5) * 18;
      particles.push({
        x: hero.x + swingX + (hero.dir === 0 || hero.dir === 1 ? spread : 0),
        y: hero.y + swingY + (hero.dir === 2 || hero.dir === 3 ? spread : 0),
        vx: (hero.dir === 3 ? 34 : hero.dir === 2 ? -34 : 0) + (Math.random() - 0.5) * 16,
        vy: (hero.dir === 0 ? 34 : hero.dir === 1 ? -34 : 0) + (Math.random() - 0.5) * 16,
        life: 0.20 + Math.random() * 0.10,
        maxLife: 0.30,
        size: 2,
        color: (i % 2 === 0) ? sparkCol : vceColor(7, 7, 7)
      });
    }

    if (hero.weapon === 'clerici_blade' && hero.hp >= hero.maxHp * 0.90) {
      playSfxSwordBeam();
      swordBeams.push({
        x: hero.x + 8,
        y: hero.y + 8,
        dir: hero.dir,
        dist: 0,
        maxDist: 136,
        speed: 220
      });
    }

    if (activeMapId === 'aldenor_exterior') {
      const nyah = npcs.find(n => n.id === 'nyah');
      if (nyah && Math.hypot(hero.x - nyah.x, hero.y - nyah.y) <= 48) {
        nyah.earTimer = 3.1;
        spawnFloatingText("WATCH THE EARS, IDIOT!!", nyah.x - 28, nyah.y - 12, vceColor(7, 2, 2));
      }
    }
  }

  function getSwordHitbox() {
    if (!hero.isAttacking || hero.attackTimer < 0.02) return null;
    let hx = hero.x, hy = hero.y;
    if (hero.dir === 0) return { x: hx - 2, y: hy + 14, w: 20, h: 20 };
    if (hero.dir === 1) return { x: hx - 2, y: hy - 14, w: 20, h: 20 };
    if (hero.dir === 2) return { x: hx - 14, y: hy - 2, w: 20, h: 20 };
    if (hero.dir === 3) return { x: hx + 14, y: hy - 2, w: 20, h: 20 };
    return null;
  }

  function triggerHeroDefeat() {
    if (nyahCompanion.perks && nyahCompanion.perks.includes('guardians_devotion') && !flags.guardianDevotionUsed) {
      flags.guardianDevotionUsed = true;
      hero.hp = Math.floor(hero.maxHp * 0.50);
      hero.invulnTimer = 2.5;
      playSfxHeal();
      startCustomDialogueTree([
        {
          speaker: 'NYAH',
          portraitId: 'nyah',
          expr: 'flustered',
          text: "DON'T YOU DARE DIE ON NYAH, MASTER!! Get up—my heart only beats if you're standing beside me!!"
        }
      ], 'nyah');
      spawnFloatingText("+50% HP (DEVOTION)!", hero.x - 8, hero.y - 10, vceColor(7, 6, 1));
      updateHudBars();
      return;
    }
    playSfxDefeat();
    startMapTransition('aldenor_exterior', 384, 144, 1);
    hero.hp = 50;
    hero.invulnTimer = 0;
    hero.isAttacking = false;
    hero.attackTimer = 0;
    hero.attackCooldown = 0;
    flags.heroRescuedByNyah = true;
    window.collisionMap = MAPS.aldenor_exterior.collisionMap;
  }

  function updateNpcSchedules() {
    const nyah = npcs.find(n => n.id === 'nyah');
    const lumina = npcs.find(n => n.id === 'lumina');
    const elder = npcs.find(n => n.id === 'elder');
    const guard = npcs.find(n => n.id === 'guard');
    const seagull = npcs.find(n => n.id === 'seagull');

    if (nyah) {
      if (flags.nyahRecruited) {
        nyah.mapId = null;
        nyah.isSweeping = false;
      } else if (flags.manorUnlocked && (activeMapId === 'manor_parlor' || activeMapId === 'grand_manor_interior')) {
        nyah.mapId = activeMapId;
        nyah.x = 8 * 16 - 8;
        nyah.y = 5 * 16;
        nyah.dir = 0;
        nyah.isSweeping = false;
      } else if (flags.rivalMaidTrialStep === 2) {
        nyah.mapId = 'aldenor_exterior';
        nyah.x = 240;
        nyah.y = 368;
        nyah.dir = 0;
        nyah.isSweeping = false;
      } else {
        nyah.mapId = 'aldenor_exterior';
        nyah.x = 384;
        nyah.y = 104;
        nyah.dir = 0;
        nyah.isSweeping = true;
      }
    }

    if (lumina) {
      if (activeMapId === 'lumina_workshop' || flags.isTwilight) {
        lumina.mapId = 'lumina_workshop';
        lumina.x = 7 * 16 - 8;
        lumina.y = 4 * 16;
        lumina.dir = 0;
      } else {
        lumina.mapId = 'aldenor_exterior';
        lumina.x = 96;
        lumina.y = 176;
        lumina.dir = 0;
      }
    }

    if (elder) {
      if (activeMapId === 'harbor_tavern' || flags.isTwilight) {
        elder.mapId = 'harbor_tavern';
        elder.x = 7 * 16;
        elder.y = 6 * 16;
        elder.dir = 0;
        elder.patrol = null;
      } else {
        elder.mapId = 'aldenor_exterior';
        elder.x = 224;
        elder.y = 160;
        elder.patrol = { minX: 208, maxX: 272, axis: 'x', dir: 1, pauseTimer: 0 };
      }
    }

    if (guard) {
      guard.mapId = 'aldenor_exterior';
      if (flags.isTwilight) {
        guard.x = 368;
        guard.y = 336;
        guard.patrol = { minX: 352, maxX: 384, axis: 'x', dir: 1, pauseTimer: 0 };
      } else {
        guard.x = 224;
        guard.y = 368;
        guard.patrol = { minX: 200, maxX: 280, axis: 'x', dir: 1, pauseTimer: 0 };
      }
    }

    if (seagull) {
      seagull.mapId = 'aldenor_exterior';
      seagull.active = (!flags.seagullSolved && flags.seagullStep < 3);
    }

    ['barkeep', 'bard', 'sailor', 'mercenary'].forEach(id => {
      const npc = npcs.find(n => n.id === id);
      if (npc) {
        npc.mapId = 'harbor_tavern';
        npc.active = true;
      }
    });

    const kitten = npcs.find(n => n.id === 'kitten_mochi');
    if (kitten) {
      kitten.mapId = 'aldenor_coastal_plains';
      kitten.x = 72;
      kitten.y = 160;
      kitten.active = (!flags.kittenRescued && !flags.mochiFound);
    }
  }

  function checkCollision(px, py) {
    const curMap = getActiveMap();
    const boxX = px + 3;
    const boxY = py + 8;
    const boxW = 10;
    const boxH = 8;

    const tLeft = Math.floor(boxX / TILE_SZ);
    const tRight = Math.floor((boxX + boxW - 1) / TILE_SZ);
    const tTop = Math.floor(boxY / TILE_SZ);
    const tBottom = Math.floor((boxY + boxH - 1) / TILE_SZ);

    if (tLeft < 0 || tRight >= curMap.width || tTop < 0 || tBottom >= curMap.height) return true;

    for (let ty = tTop; ty <= tBottom; ty++) {
      for (let tx = tLeft; tx <= tRight; tx++) {
        if (curMap.collisionMap[ty * curMap.width + tx] === 1) return true;
      }
    }
    return false;
  }

  function checkNpcHeroCollision(npc, heroX, heroY) {
    const hx = heroX + 3, hy = heroY + 8, hw = 10, hh = 8;
    const nx = npc.x + 3, ny = npc.y + 8, nw = 10, nh = 8;
    return (hx < nx + nw && hx + hw > nx && hy < ny + nh && hy + hh > ny);
  }

  // =========================================================================
  // SECTION 8: Dialogue System, Choice Engine & 64x64 Cut-in Manager
  // =========================================================================
  const dialogueState = {
    active: false,
    npc: null,
    lines: [],
    lineIndex: 0,
    charIndex: 0,
    crawlTimer: 0,
    isComplete: false,
    cooldownTimer: 0,
    mouthFlap: false,
    eyeBlink: false,
    blinkTimer: 0,
    earTwitch: false,
    earTimer: 0,
    currentExpression: 'smug',
    scrollOffset: 0,
    isDoorInspection: false,
    choiceIndex: 0,
    activeChoices: null
  };

  // Dialogue backlog. Every line is recorded when the player first sees it, so
  // the log follows branches, choice replies and inspectable one-offs. It is
  // transient on purpose: saves stay small and the log is about this session.
  const dialogueLog = [];
  const DIALOGUE_LOG_MAX = 80;
  const dialogueLogState = { open: false, scroll: 0 };

  function recordDialogueLine(line) {
    if (!line || typeof line.text !== 'string' || !line.text) return;
    const speaker = line.speaker || (dialogueState.npc && dialogueState.npc.name) || '???';
    dialogueLog.push({ speaker: String(speaker).toUpperCase(), text: line.text });
    while (dialogueLog.length > DIALOGUE_LOG_MAX) dialogueLog.shift();
    dialogueLogState.scroll = 999999; // render clamps to the bottom
  }

  function updateItemBadge() {
    const lbl = document.getElementById('lblItemName');
    if (!lbl) return;
    if (!flags.inventory) {
      lbl.textContent = 'NONE';
    } else if (flags.inventory === 'starlight_tonic') {
      lbl.textContent = 'Starlight Tonic';
    } else if (flags.inventory === 'silver_teacup') {
      lbl.textContent = 'Silver Teacup';
    } else if (flags.inventory === 'guard_sandwich') {
      lbl.textContent = 'Guard Sandwich';
    } else if (flags.inventory === 'jasmine_tea') {
      lbl.textContent = 'Jasmine-Catnip Tea';
    } else if (flags.inventory === 'tavern_pass') {
      lbl.textContent = 'Tavern VIP Pass';
    } else {
      lbl.textContent = String(flags.inventory);
    }
  }

  function handleSeagullInteraction(seagull) {
    playSfxSquawk();
    if (flags.seagullStep === 0) {
      startCustomDialogue(
        'SEAGULL',
        'seagull',
        "SQUAAAWK!! The harbor seagull flaps frantically, clutching Guard Goran's wrapped sandwich in its beak before darting north toward the plaza!",
        'seagull'
      );
      seagull.x = 200;
      seagull.y = 300;
      flags.seagullStep = 1;
    } else if (flags.seagullStep === 1) {
      startCustomDialogue(
        'SEAGULL',
        'seagull',
        "SKREEE! The seagull hops backward, dodging your hands, and flutters over toward the western market stall!",
        'seagull'
      );
      seagull.x = 144;
      seagull.y = 240;
      flags.seagullStep = 2;
    } else if (flags.seagullStep === 2) {
      startCustomDialogue(
        'SEAGULL',
        'seagull',
        "SQUAAAWK!! Cornered against the stones, the startled gull drops Guard Goran's wrapped sandwich and takes flight into the harbor clouds!",
        'seagull'
      );
      flags.seagullStep = 3;
      addItem('guard_sandwich', 1);
      flags.inventory = 'guard_sandwich';
      seagull.active = false;
      spawnFloatingText("GOT GUARD SANDWICH!", hero.x - 16, hero.y - 12, vceColor(7, 6, 1));
      updateItemBadge();
    }
  }

  function getQuestStage() {
    if (!flags.rivalMaidTrialStep || flags.rivalMaidTrialStep === 0) return 0;
    if (flags.rivalMaidTrialStep === 1) return 1;
    if (flags.rivalMaidTrialStep === 2) return 2;
    if (!flags.mochiQuestDone && !flags.kittenRescued) return 3;
    if (!flags.bellForkFound) return 4;
    if (!flags.bellClapperFound) return 5;
    if (!flags.sanctumCrestFound) return 6;
    if (!flags.bossEclipseDefeated) return 7;
    return 8;
  }

  function getQuestHint(speaker) {
    const stage = getQuestStage();
    const isFifi = (speaker === 'fifi');
    // IMPORTANT: Before Nyah is recruited (stages 0..2), asking Fifi only shows Fifi's lines (Nyah is not in your party yet!),
    // and asking Nyah calls the hero "tourist" / "red-haired tourist" (NEVER "Master" until flags.nyahRecruited === true).
    if (stage === 0) {
      if (isFifi) {
        return [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'curious', text: "Master, we just arrived at Aldenor! The Grand Manor stands in the northeast corner of town—let's go introduce ourselves to the catgirl maid sweeping the Manor steps!" }
        ];
      } else {
        return [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "If you want nyah to take you seriously, red-haired tourist, bring me a steaming cup of Hot Jasmine Tea! A thieving harbor gull snatched the Manor's Silver Teacup from Guard Goran near the south plaza - corner it three times, then Lumina in the west market brews the tea!" },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'bashful', text: "Fifi will help Master get the Silver Teacup and brew the tea!" }
        ];
      }
    }
    if (stage === 1) {
      if (!hasItem('jasmine_tea') && flags.inventory !== 'jasmine_tea') {
        if (!hasItem('silver_teacup') && flags.inventory !== 'silver_teacup') {
          if (isFifi) {
            return [
              { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Master, the harbor gull that stole the Manor's Silver Teacup is still hopping around the south plaza - let's corner it three times and take back Guard Goran's sandwich!" }
            ];
          } else {
            return [
              { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Still empty-handed, tourist?! That harbor gull near the south plaza still has the Manor's Silver Teacup AND Guard Goran's sandwich - chase it down three times, then have Lumina brew my Hot Jasmine Tea!" }
            ];
          }
        } else {
          if (isFifi) {
            return [
              { speaker: 'FIFI', portraitId: 'fifi', expr: 'curious', text: "We have the Silver Teacup! Now let's visit Lumina at the West Market Apothecary stall (or inside her shop) and select 'Brew Jasmine-Catnip Tea'!" }
            ];
          } else {
            return [
              { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "You've got the Silver Teacup, tourist! Now take it to Lumina's Apothecary on the west side of town and have her steep Royal Jasmine-Catnip Tea!" }
            ];
          }
        }
      } else {
        if (isFifi) {
          return [
            { speaker: 'FIFI', portraitId: 'fifi', expr: 'tea', text: "We have the steaming Hot Jasmine-Catnip Tea! Let's deliver it straight to Miss Nyah at the Grand Manor steps in northeast Aldenor!" }
          ];
        } else {
          return [
            { speaker: 'NYAH', portraitId: 'nyah', expr: 'flustered', text: "Is that... fresh Jasmine-Catnip Tea?! Hand it over right this second, tourist! Don't let it get cold!" }
          ];
        }
      }
    }
    if (stage === 2) {
      if (isFifi) {
        return [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: `The Grand Manor doors are unlocked so we can explore the Maid Quarters! Whenever you're ready for Part 2 of the trial, let's head out the South Gate and defeat 3 Coastal Slimes (${flags.southGateSlimesCleared || 0}/3), then report to Miss Nyah at the South Gate!` }
        ];
      } else {
        return [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: `Check out the Manor Parlor if you want, tourist, then step out the South Gate and defeat 3 Coastal Slimes (${flags.southGateSlimesCleared || 0}/3) to prove you and floppy-ears can fight!` }
        ];
      }
    }
    if (stage === 3) {
      if (isFifi) {
        return [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'curious', text: "Little Lyla in town is crying because her white kitten Mochi ran out the South Gate toward the western pine grove in the Coastal Plains! Let's rescue Mochi for her, Master!" },
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "A lost kitten?! As Aldenor's number one catgirl, nyah orders you to find Mochi immediately, Master! No feline gets left behind!" }
        ];
      } else {
        return [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Master, go talk to little Lyla in town and search the western pine grove in the Coastal Plains for her kitten Mochi! Kittens get scared easily—hurry up!" },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Fifi will sniff out Mochi's trail through the coastal grass, Master!" }
        ];
      }
    }
    if (stage === 4) {
      if (isFifi) {
        return [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "We need the First Relic (Bell Tuning Fork)! Let's enter the Old Quarry Mines at the western cliffs of the Coastal Plains (2, 8), flip the two iron track switches to open the boss gate, and defeat the Obsidian Crusher!" },
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "That overgrown rock golem thinks it's tough! With Master's sword, Fifi's bolts, and nyah's daggers, we'll turn it into gravel!" }
        ];
      } else {
        return [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "First relic time, Master! Head to the Old Quarry Mines at the western cliff of the Coastal Plains (2, 8). Hit both track switches in the north and south tunnels to unseal the boss sanctum!" },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Fifi's Starlight Bolts will light up the mine tunnels for Master!" }
        ];
      }
    }
    if (stage === 5) {
      if (!flags.isTwilight) {
        if (isFifi) {
          return [
            { speaker: 'FIFI', portraitId: 'fifi', expr: 'curious', text: "The Coastal Crypts only open beneath twilight shadows! Let's speak with Elder Gared in town and choose 'Rest until Twilight' so we can enter the eastern Crypts!" },
            { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "Elder Gared is strolling near the central plaza. Go tell the old man we're ready for dusk, Master!" }
          ];
        } else {
          return [
            { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "The Coastal Crypts only unseal their gates at dusk, Master! Go talk to Elder Gared in town to advance time to Twilight!" },
            { speaker: 'FIFI', portraitId: 'fifi', expr: 'bashful', text: "Fifi will stay extra close to Master once night falls!" }
          ];
        }
      } else {
        if (isFifi) {
          return [
            { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "It's Twilight! Enter the Coastal Crypts at the eastern bluff of the Coastal Plains (29, 9). Kindle the blue braziers to push back the dark, and pull the 3 skull levers to open the boss gate, then defeat Lord Malakor!" },
            { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Ugh, creepy skeletons! Master, hold nyah's hand if you get scared... okay fine, maybe nyah wants to hold your hand!" }
          ];
        } else {
          return [
            { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Into the eastern Coastal Crypts (29, 9), Master! It's pitch black in there, so kindle the blue bowls as we go—then pull all three skull levers to open the boss portcullis and smash that skeleton lich for the Bell Clapper!" },
            { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Fifi will cast Gentle Puppy Blessing if anyone gets hurt!" }
          ];
        }
      }
    }
    if (stage === 6) {
      if (isFifi) {
        return [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "The third relic is the Sanctum Crest! Enter the Sunken Shrine at the southern beach reef (16, 21), turn both brass sluice valves to open the boss gate, and defeat the Charybdis Queen!" },
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "A giant sea serpent? Nyah's claws are going to slice it into sashimi for Master's dinner! Let's dive in!" }
        ];
      } else {
        return [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "The southern reef Sunken Shrine (16, 21), Master! Turn the two brass water valves to unseal the boss sanctum, then we take down the Leviathan for the Sanctum Crest!" },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Master, remember we can unleash our MAID TWIN STARBURST combo spell with [C] when TP reaches 100%!" }
        ];
      }
    }
    if (stage === 7) {
      if (isFifi) {
        return [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'determined', text: "All three relics are gathered! The Sanctum Gate behind the Grand Manor at (24, 1) is unsealed. Let's ascend the Sacred Bell Spire and defeat the Shadow of the Eclipse!" },
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'determined', text: "This is it, Master! Whatever dark eclipse is up there, we face it together. Nyah is never leaving your side!" }
        ];
      } else {
        return [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'determined', text: "The gate behind the Grand Manor at (24, 1) is open! Time to climb the Northern Spire stairs and kick the Shadow of the Eclipse back into the abyss!" },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Fifi will protect Master until the dawn breaks!" }
        ];
      }
    }
    if (isFifi) {
      return [
        { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "The Bell of Aldenor rings freely across the sea, Master! The curse is broken, and everyone in town is celebrating! Fifi is so proud to be your maid!" },
        { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "And nyah is officially your number one catgirl maid forever, Master! Now sit down and let me pour your tea!" }
      ];
    } else {
      return [
        { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "Aldenor is saved, the Lord is awake, and the tea is piping hot! Enjoy the post-game sunshine with nyah, Master!" },
        { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Master, thank you for taking Fifi on this wonderful adventure!" }
      ];
    }
  }

  function getFifiFutonInspectLines() {
    const title = flags.nyahRecruited ? "Master" : "tourist";
    if (flags.fifiLeashedInManor) {
      return [
        {
          speaker: 'NYAH',
          portraitId: 'nyah',
          expr: 'smug',
          cgId: 'cg_fifi_leash_duo',
          text: "Hehehehe! Look at her, Master! The crimson velvet ribbon has exactly forty-two inches of slack—plenty of room to sit on her fluffy futon, and TWO INCHES SHORT of the afternoon tea tray! Who's the head maid of this Manor now, puppy?!"
        },
        {
          speaker: 'FIFI',
          portraitId: 'fifi',
          expr: 'blush',
          cgId: 'cg_fifi_leash_solo',
          text: "M-Miss Nyah, stop waving the teacup just out of my reach! *whimper* ...Master, please! Tell her to unclip my collar, or at least sit close enough so Fifi can hold your hand!",
          choices: [
            {
              label: "Unclip the crimson ribbon (Free Fifi)",
              onSelect: () => {
                flags.fifiLeashedInManor = false;
                playSfxHeal();
                spawnFloatingText("FIFI UNCLIPPED!", hero.x - 12, hero.y - 12, vceColor(3, 7, 5));
              },
              nextLines: [
                { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Thank you, Master!! *wag wag* Fifi is free! I'll stay right by your side—and far away from Miss Nyah's ribbon drawer!" },
                { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Booo! You let her off the hook way too fast, Master! Next time she tries to hog your attention, the ribbon is coming right back out!" }
              ]
            },
            {
              label: "Leave her clipped there a little longer",
              nextLines: [
                { speaker: 'FIFI', portraitId: 'fifi', expr: 'blush', cgId: 'cg_fifi_leash_solo', text: "E-Eep?! Master too?! B-BARK! You two are both terrible teasers...!" },
                { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', cgId: 'cg_fifi_leash_duo', text: "AHAHAHA! Did you hear that tiny little puppy bark, Master?! Best afternoon in the Manor EVER!" }
              ]
            }
          ]
        }
      ];
    }
    if (flags.nyahRecruited && flags.foundVelvetRibbon) {
      return [
        {
          speaker: 'FIFI',
          portraitId: 'fifi',
          expr: 'blush',
          cgId: 'cg_fifi_futon',
          text: "T-This is Fifi's sleeping cushion, Master! Wait... Miss Nyah, why are you hiding your hands behind your apron with that huge grin on your face...?"
        },
        {
          speaker: 'NYAH',
          portraitId: 'nyah',
          expr: 'smug',
          cgId: 'cg_fifi_futon',
          text: "Oh, nothing~ Nyah just found this gorgeous Crimson Velvet Ribbon in the wardrobe! Hey Master... remember what nyah said earlier about keeping this clingy puppy in one place?",
          choices: [
            {
              label: "* Let Nyah clip the Crimson Ribbon to Fifi's collar",
              onSelect: () => {
                flags.fifiLeashedInManor = true;
                fifiCompanion.x = 3 * 16;
                fifiCompanion.y = 7 * 16;
                playSfxBlip(1500);
                spawnFloatingText("OPERATION SHORT LEASH!", hero.x - 24, hero.y - 12, vceColor(7, 2, 3));
              },
              nextLines: [
                {
                  speaker: 'FIFI',
                  portraitId: 'fifi',
                  expr: 'blush',
                  cgId: 'cg_fifi_leash_duo',
                  text: "WAIT—*CLICK*—E-EEP?! Miss Nyah, what did you just clip to the brass ring on my collar?! Did you just tie the other end around the bedroom post?!"
                },
                {
                  speaker: 'NYAH',
                  portraitId: 'nyah',
                  expr: 'smug',
                  cgId: 'cg_fifi_leash_duo',
                  text: "Ta-daaa!! A double-looped crimson velvet bow around the oak post! Go ahead, puppy—try reaching for the silver teacup on the tray!"
                },
                {
                  speaker: 'FIFI',
                  portraitId: 'fifi',
                  expr: 'blush',
                  cgId: 'cg_fifi_leash_solo',
                  text: "H-Hey! *tug... tug!* The ribbon pulls taut two inches short of the tea tray!! M-Miss Nyah, that is NOT funny! Unclip me right this second! B-BARK!"
                },
                {
                  speaker: 'NYAH',
                  portraitId: 'nyah',
                  expr: 'smug',
                  cgId: 'cg_fifi_leash_duo',
                  text: "AHAHAHAHA! Look at her pouting while her fluffy tail is STILL wagging a hundred miles an hour because Master is watching!! Now Master is 100% nyah's!"
                }
              ]
            },
            {
              label: "Behave yourself, Nyah",
              nextLines: [
                { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Tch! Spoilsport! Nyah is keeping the ribbon in my pocket just in case!" }
              ]
            }
          ]
        }
      ];
    }
    return [
      {
        speaker: 'FIFI',
        portraitId: 'fifi',
        expr: 'blush',
        cgId: 'cg_fifi_futon',
        text: "T-This is Fifi's sleeping cushion, Master! I always fold the starry quilt neatly each morning so it's ready if Master needs a rest..."
      },
      {
        speaker: 'NYAH',
        portraitId: 'nyah',
        expr: 'jealous',
        cgId: 'cg_fifi_futon',
        onSelect: () => { flags.nyahThreatenedLeash = true; },
        text: `Look at you blushing into your hands just because ${title} looked at your quilt! Keep trying to monopolize ${title} and nyah is going to raid the Manor Wardrobe on the right wall, find a spare crimson velvet ribbon, and clip your collar straight to that wooden bedroom post two inches short of the tea tray!`
      },
      {
        speaker: 'FIFI',
        portraitId: 'fifi',
        expr: 'blush',
        cgId: 'cg_fifi_futon',
        text: "E-Eep!! C-Clipped to the bedroom post?! Miss Nyah, you wouldn't really do that... w-would you?!"
      }
    ];
  }

  function getManorWardrobeInspectLines() {
    const title = flags.nyahRecruited ? "Master" : "tourist";
    if (flags.nyahRecruited && flags.nyahThreatenedLeash && !flags.foundVelvetRibbon) {
      return [
        {
          speaker: 'NYAH',
          portraitId: 'nyah',
          expr: 'smug',
          onSelect: () => {
            flags.foundVelvetRibbon = true;
            playSfxLevelUp();
            spawnFloatingText("FOUND CRIMSON VELVET RIBBON!", hero.x - 28, hero.y - 12, vceColor(7, 2, 3));
          },
          text: "Aha!! Look what nyah just found tucked behind volume four in the wardrobe drawer, Master—a six-foot spool of heavy Crimson Velvet Ribbon with a polished brass clasp! Hehehe... let's go check on Fifi's futon on the left side of the room again!"
        },
        {
          speaker: 'FIFI',
          portraitId: 'fifi',
          expr: 'panicked',
          text: "M-Master?! Why is Miss Nyah twirling that long red ribbon and staring at my collar like a predator?!"
        }
      ];
    }
    return [
      {
        speaker: 'NYAH',
        portraitId: 'nyah',
        expr: 'bratty',
        text: `Ancient Aldenor history scrolls, architectural blueprints of the Bell Spire, spare maid ribbons... and a handwritten book of feline grooming secrets hidden behind volume four! DON'T READ THAT ONE, ${title.toUpperCase()}!!`
      },
      {
        speaker: 'FIFI',
        portraitId: 'fifi',
        expr: 'curious',
        text: "Oh! There are ancient records of the PC-Engine CD-ROM² legends and celestial magic! Master, we should study these together!"
      }
    ];
  }

  const INTERIOR_INSPECTABLES = {
    grand_manor_interior: [
      {
        x: [2, 3], y: [4, 4],
        getLines: () => {
          const title = flags.nyahRecruited ? "Master" : "tourist";
          return [
            { speaker: 'NYAH', portraitId: 'nyah', expr: 'flustered', cgId: 'cg_nyah_futon', text: `H-HEY! Get your eyes off nyah's futon, ${title}! Don't go sniffing the catnip pillow while I'm on duty! ...Unless you want to curl up together later, idiot.` },
            { speaker: 'FIFI', portraitId: 'fifi', expr: 'bashful', text: "Miss Nyah's bedding smells like sun-dried blankets and wild jasmine... It looks very cozy, Master!" }
          ];
        }
      },
      {
        x: [2, 3], y: [7, 7],
        getLines: getFifiFutonInspectLines
      },
      {
        x: [4, 4], y: [9, 9],
        getLines: () => [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "The official Aldenor Maid Tea Table! Only the finest silver porcelain and jasmine-catnip blends are served here by nyah's own hands!" },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'tea', text: "Fifi polished all the silver spoons until they sparkle like stars! Master, would you like a warm cup of jasmine tea?" }
        ]
      },
      {
        x: [7, 8], y: [2, 3],
        getLines: () => {
          const title = flags.nyahRecruited ? "Master" : "tourist";
          return [
            { speaker: 'FIFI', portraitId: 'fifi', expr: 'sad', text: "The Lord of Aldenor lies in an endless enchanted slumber... The dark eclipse miasma seals his spirit within crystal shards." },
            { speaker: 'NYAH', portraitId: 'nyah', expr: 'determined', text: `He took nyah in when everyone else tried to control me. We HAVE to ring the Sacred Bell and shatter this curse! Let's get moving, ${title}!` }
          ];
        }
      },
      {
        x: [11, 13], y: [2, 2],
        getLines: getManorWardrobeInspectLines
      }
    ],
    manor_parlor: null,
    harbor_tavern: [
      {
        x: [11, 12], y: [2, 2],
        lines: [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "The hearth fire crackles so warmly! It makes my tail wag just standing near the stone bricks, Master." },
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "Nyah prefers curling right up in front of the embers on a cold night. You can sit beside me if you bring snacks, Master." }
        ]
      },
      {
        x: [1, 5], y: [2, 2],
        lines: [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Aging oak casks of Esterian dark ale and spiced cider. One sniff and my nose is tingling!" },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'bashful', text: "Barkeep says it's strictly for sailors returning from deep waters. Master should stick to herbal tea!" }
        ]
      },
      {
        x: [2, 4], y: [8, 8],
        lines: [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Sturdy cedarwood tavern tables! There are carved initials and sailing tales scratched into the grain." },
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "Watch out for spilled grog, Master! If a single droplet touches my tail, someone's getting scratched." }
        ]
      },
      {
        x: [8, 10], y: [8, 8],
        lines: [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "The tavern tables are bustling with adventurers swapping monster tales!" },
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "None of their stories compare to how awesome Master and nyah are, obviously!" }
        ]
      }
    ],
    lumina_workshop: [
      {
        x: [1, 2], y: [2, 2],
        lines: [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'curious', text: "Rows upon rows of glowing jars, dried starlight herbs, and crushed sapphire powder!" },
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Half of these potions smell like bubbling pond water! But Lumina's jasmine tea blend is the one thing she actually got right." }
        ]
      },
      {
        x: [8, 12], y: [2, 2],
        lines: [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "Mystical elf alchemy tomes and rare moonflower tinctures. Don't knock anything over, Master!" },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'curious', text: "Lumina's alchemy notes look so intricate! Starlight magic and herbal chemistry work together so beautifully." }
        ]
      },
      {
        x: [4, 9], y: [5, 5],
        lines: [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "Lumina's brewing station! Look at all those glass distillers. It takes all of nyah's self-control not to bat them off the counter." },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'panicked', text: "P-Please don't bat the glassware, Miss Nyah! Lumina would turn us both into starry toads!" }
        ]
      }
    ],
    goran_forge: [
      {
        x: [3, 5], y: [2, 2],
        lines: [
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'surprised', text: "The forge bellows roar with fierce heat! Guard Goran smiths heavy armor and steel blades here." },
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Way too hot! Nyah's fur will get singed just standing here! Let's get Master a shiny new blade and get back to the cool breeze." }
        ]
      },
      {
        x: [8, 11], y: [2, 2],
        lines: [
          { speaker: 'NYAH', portraitId: 'nyah', expr: 'smug', text: "Broadswords, halberds, and iron shields. Good heavy steel, but nothing matches the agility of nyah's twin silver daggers!" },
          { speaker: 'FIFI', portraitId: 'fifi', expr: 'happy', text: "Master looks so heroic when holding a sword! Fifi will always protect Master from behind with Starlight magic!" }
        ]
      }
    ]
  };
  INTERIOR_INSPECTABLES.manor_parlor = INTERIOR_INSPECTABLES.grand_manor_interior;
  window.getQuestStage = getQuestStage;
  window.getQuestHint = getQuestHint;
  window.INTERIOR_INSPECTABLES = INTERIOR_INSPECTABLES;

  function getDialogueTree(npcId) {
    if (npcId === 'fifi') {
      if ((activeMapId === 'grand_manor_interior' || activeMapId === 'manor_parlor') && flags.fifiLeashedInManor) {
        return [
          {
            speaker: 'FIFI',
            portraitId: 'fifi',
            expr: 'blush',
            cgId: 'cg_fifi_leash_solo',
            text: "M-Master!! Miss Nyah clipped her crimson velvet ribbon to my collar and tied me to the bedroom post... *whimper* ...It pulls taut two inches short of the tea tray!",
            choices: [
              {
                label: "Nyah: Dangle teacup 2 inches out of reach",
                nextLines: [
                  {
                    speaker: 'NYAH',
                    portraitId: 'nyah',
                    expr: 'smug',
                    cgId: 'cg_fifi_leash_duo',
                    text: "Oh, were you reaching for this steaming cup of royal jasmine tea, puppy~? Too bad the ribbon stops at forty-two inches! Come on, give Mistress Nyah a polite little bark and maybe I'll move the tray half an inch closer!"
                  },
                  {
                    speaker: 'FIFI',
                    portraitId: 'fifi',
                    expr: 'blush',
                    cgId: 'cg_fifi_leash_solo',
                    text: "M-Miss Nyah!! Stop smirking with your little fang out! I am Master's loyal guardian maid, not your pet! B-BARK! ...E-Eep! I didn't mean to actually bark!!"
                  }
                ]
              },
              {
                label: "Sit within reach & pet Fifi's ears",
                nextLines: [
                  {
                    speaker: 'FIFI',
                    portraitId: 'fifi',
                    expr: 'blush',
                    cgId: 'cg_fifi_leash_solo',
                    text: "A-Awwh... Master stepped inside the ribbon radius just to pet my ears... *wag wag wag* ...Suddenly Fifi doesn't mind being clipped to the futon post so much..."
                  },
                  {
                    speaker: 'NYAH',
                    portraitId: 'nyah',
                    expr: 'jealous',
                    cgId: 'cg_fifi_leash_duo',
                    text: "WAIT A SECOND!! MASTER!! The whole point of leashing her to the post was so she COULDN'T monopolize your headpats!! Why are you sitting on her futon?! GET OVER HERE!!"
                  }
                ]
              },
              {
                label: "Unclip the crimson ribbon (Free Fifi)",
                onSelect: () => {
                  flags.fifiLeashedInManor = false;
                  playSfxHeal();
                  spawnFloatingText("FIFI UNCLIPPED!", hero.x - 12, hero.y - 12, vceColor(3, 7, 5));
                },
                nextLines: [
                  {
                    speaker: 'FIFI',
                    portraitId: 'fifi',
                    expr: 'happy',
                    text: "Thank you so much, Master!! *wag wag* Fifi is free to follow you everywhere again!"
                  },
                  {
                    speaker: 'NYAH',
                    portraitId: 'nyah',
                    expr: 'bratty',
                    text: "Hmph! Nyah is keeping that crimson ribbon in my apron pocket, puppy—don't forget who runs this Manor!"
                  }
                ]
              },
              {
                label: "Leave her clipped there a little longer"
              }
            ]
          }
        ];
      }
      return [
        {
          speaker: 'FIFI',
          portraitId: 'fifi',
          expr: 'happy',
          text: "Master! Fifi is right here by your side. Is there something you need, Master?",
          choices: [
            {
              label: "* Ask for a Hint (What next?)",
              nextLines: getQuestHint('fifi')
            },
            {
              label: "Pet Fifi's fluffy puppy ears",
              nextLines: [
                {
                  speaker: 'FIFI',
                  portraitId: 'fifi',
                  expr: 'blush',
                  text: "A-Awwh... Master's gentle hand... *whimper* ...My tail won't stop wagging! Master is so kind to Fifi..."
                },
                ...(flags.nyahRecruited ? [
                  {
                    speaker: 'NYAH',
                    portraitId: 'nyah',
                    expr: 'jealous',
                    text: "HEY!! MASTER!! Who told you you could give the puppy headpats right in front of nyah?! Nyah's cat ears have AT LEAST 40% MORE SURFACE FLUFF! Scratch mine next right NOW!!"
                  }
                ] : [])
              ]
            },
            {
              label: "Ask about Fifi's Starlight Magic",
              nextLines: [
                {
                  speaker: 'FIFI',
                  portraitId: 'fifi',
                  expr: 'happy',
                  text: "Fifi channels celestial starlight into homing Starlight Bolts! Whenever Master attacks or monsters draw close, Fifi will fire bolts to support you! And if Master's HP falls low, Fifi casts Gentle Puppy Blessing!"
                },
                ...(flags.nyahRecruited ? [
                  {
                    speaker: 'NYAH',
                    portraitId: 'nyah',
                    expr: 'smug',
                    text: "And when Master builds 100% TP, we can unleash our MAID TWIN STARBURST combo spell! Press [C] to call down the starlight pillars, Master!"
                  }
                ] : [])
              ]
            },
            {
              label: "Leave"
            }
          ]
        }
      ];
    }

    if (npcId === 'nyah') {
      if (flags.nyahRecruited || flags.nyahJoinedParty) {
        return [
          {
            speaker: 'NYAH',
            portraitId: 'nyah',
            expr: 'smug',
            text: "What is it, Master? Need your favorite catgirl's advice, or did you just want an excuse to stare at my cute ears again?",
            choices: [
              {
                label: "* Ask for a Hint (What next?)",
                nextLines: getQuestHint('nyah')
              },
              {
                label: "Gently scratch her cat ears",
                nextLines: [
                  {
                    speaker: 'NYAH',
                    portraitId: 'nyah',
                    expr: 'flustered',
                    text: "A-Ah... mmph... wait, Master, not right here in public... *purr* ...HEY!! nyah did NOT purr! That was a tactical combat vibration!! Now keep moving before I scratch you!"
                  }
                ]
              },
              {
                label: "Tease Nyah about following you",
                nextLines: [
                  {
                    speaker: 'NYAH',
                    portraitId: 'nyah',
                    expr: 'flustered',
                    text: "I'M NOT CLINGY!! I'm just making sure you don't trip over a pebble and get pinched in two by a crab! If anyone's going to tease you, it's me! Don't flatter yourself, Master!"
                  }
                ]
              },
              {
                label: "Ask about Sacred Bell relics",
                nextLines: [
                  {
                    speaker: 'NYAH',
                    portraitId: 'nyah',
                    expr: 'bratty',
                    text: "The three relics were stolen by three creepy abyssal lords! First is the Tuning Fork in the Old Quarry Mines, second is the Bell Clapper in the Coastal Crypts, and third is the Sanctum Crest in the Sunken Shrine."
                  },
                  {
                    speaker: 'NYAH',
                    portraitId: 'nyah',
                    expr: 'smug',
                    text: "We have to recover all three to unseal the Northern Spire and ring the Bell! Don't worry, nyah has your back with my silver daggers!"
                  }
                ]
              },
              {
                label: "Leave"
              }
            ]
          }
        ];
      }

      // Step 0: First meeting at Manor Gate with Fifi
      if (!flags.rivalMaidTrialStep || flags.rivalMaidTrialStep === 0) {
        return [
          {
            speaker: 'NYAH',
            portraitId: 'nyah',
            expr: 'bratty',
            text: "Halt right there, red-haired tourist! The Grand Manor is under lockdown! The Lord of Aldenor is trapped in a cursed slumber and nyah isn't letting suspicious strangers past these doors!"
          },
          {
            speaker: 'FIFI',
            portraitId: 'fifi',
            expr: 'bashful',
            text: "U-um, excuse me, Miss Catgirl! Please don't bristle your tail... My Master and I just docked at the pier, and Master only wanted to ask how we can help—"
          },
          {
            speaker: 'NYAH',
            portraitId: 'nyah',
            expr: 'shocked',
            text: "WAIT A SECOND. Hold everything. Did this floppy-eared puppy maid just call you 'MASTER'?! Excuse me?! You just stroll into MY town with your own personal doggirl maid calling you Master?!"
          },
          {
            speaker: 'FIFI',
            portraitId: 'fifi',
            expr: 'panicked',
            text: "E-eep! I'm sorry, Master, she's glaring at my ears!"
          },
          {
            speaker: 'NYAH',
            portraitId: 'nyah',
            expr: 'jealous',
            text: "Hmph!! Look at her hiding behind your cape! Listen up, tourist: if you want nyah to trust you two—or let you inside the Manor—you have to pass THE RIVAL MAID TRIAL! Part 1: bring nyah a steaming cup of Hot Jasmine Tea! A harbor gull snatched the Manor's Silver Teacup from Guard Goran near the south plaza - corner it three times, then have Lumina at the West Market Apothecary brew the tea!",
            onSelect: () => {
              flags.rivalMaidTrialStep = 1;
            }
          }
        ];
      }

      // Step 1: Delivering Jasmine Tea to Nyah at Manor Gate
      if (flags.rivalMaidTrialStep === 1) {
        if (hasItem('jasmine_tea') || flags.inventory === 'jasmine_tea') {
          return [
            {
              speaker: 'NYAH',
              portraitId: 'nyah',
              expr: 'flustered',
              text: "Sniff... wait, this is actually Lumina's top-shelf Jasmine-Catnip Tea?! A-and you even polished the silver teacup?! ...Okay FINE, maybe you two aren't completely useless.",
              onSelect: () => {
                removeItem('jasmine_tea', 1);
                flags.inventory = null;
                flags.manorUnlocked = true;
                flags.rivalMaidTrialStep = 2;
                addExp(150);
                playSfxLevelUp();
                updateNpcSchedules();
                updateItemBadge();
              }
            },
            {
              speaker: 'NYAH',
              portraitId: 'nyah',
              expr: 'smug',
              text: "Nyah unlocked the Grand Manor Front Door right behind me so you can see the Lord's curse—and our Maid Quarters—for yourself! Now meet nyah down at the South Gate for Part 2 of your trial: the Combat Test!"
            },
            {
              speaker: 'FIFI',
              portraitId: 'fifi',
              expr: 'tea',
              text: "We did it, Master! Miss Nyah loved the hot tea, unlocked the Grand Manor, and moved down to the South Gate to test our combat skills!"
            }
          ];
        } else {
          return [
            {
              speaker: 'NYAH',
              portraitId: 'nyah',
              expr: 'bratty',
              text: "Where's nyah's Hot Jasmine Tea, red-haired tourist?! That harbor gull near the south plaza still has the Silver Teacup - corner it three times, then have Lumina at the West Market Apothecary brew the tea, and bring it right here!"
            },
            {
              speaker: 'FIFI',
              portraitId: 'fifi',
              expr: 'bashful',
              text: "Master, let's corner that harbor gull near the south plaza three times, then visit Lumina at the West Market so Miss Nyah doesn't pout!"
            }
          ];
        }
      }

      // Step 2: South Gate Combat Test
      if (flags.rivalMaidTrialStep === 2) {
        if (flags.southGateSlimesCleared >= 3) {
          return [
            {
              speaker: 'NYAH',
              portraitId: 'nyah',
              expr: 'shocked',
              text: "Okay wait wait WAIT... you cleared those slimes like it was nothing?! And floppy-ears can shoot homing starlight magic from her hands?!"
            },
            {
              speaker: 'FIFI',
              portraitId: 'fifi',
              expr: 'happy',
              text: "I-I did my best for Master! Did you see my Starlight Bolts, Master?"
            },
            {
              speaker: 'NYAH',
              portraitId: 'nyah',
              expr: 'jealous',
              text: "HEY! Stop wagging your fluffy tail at him like that!! That settles it—nyah CANNOT leave an overly nice guy like you alone with only a bashful puppy maid! You'd get pinched by crabs in five minutes without nyah's claws!"
            },
            {
              speaker: 'NYAH',
              portraitId: 'nyah',
              expr: 'flustered',
              text: "AND ANOTHER THING! If she gets to call you Master, then nyah is calling you Master too! In fact, nyah is your NUMBER ONE maid now, got it, Master?! Move over, floppy-ears—nyah walks in the front spot!!",
              onSelect: () => {
                flags.nyahRecruited = true;
                flags.nyahJoinedParty = true;
                flags.nyahCallsMaster = true;
                flags.rivalMaidTrialStep = 3;
                flags.nyahInFrontSlot = true;
                playSfxLevelUp();
                spawnFloatingText("NYAH JOINED THE PARTY!", hero.x - 24, hero.y - 14, vceColor(7, 6, 1));
                updateNpcSchedules();
              }
            }
          ];
        } else {
          return [
            {
              speaker: 'NYAH',
              portraitId: 'nyah',
              expr: 'smug',
              text: `There you are, red-haired tourist! Part 2 of the Rival Maid Trial: step out onto the Coastal Plains and defeat 3 Coastal Slimes! (Cleared: ${flags.southGateSlimesCleared || 0}/3). Let's see if that floppy-eared puppy maid can actually protect you, or if you need nyah's silver claws!`
            },
            {
              speaker: 'FIFI',
              portraitId: 'fifi',
              expr: 'determined',
              text: "Fifi is ready, Master! Together with Master's sword and Fifi's Starlight magic, we'll clear those slimes in no time!"
            }
          ];
        }
      }
    } else if (npcId === 'lumina') {
      // The teacup is the quest token: having started the trial is not enough.
      // Otherwise a player could skip the gull chase and brew tea with no cup.
      const canBrewTea = !flags.manorUnlocked && !hasItem('jasmine_tea') && flags.inventory !== 'jasmine_tea' && (hasItem('silver_teacup') || flags.inventory === 'silver_teacup');
      return [
        {
          speaker: 'LUMINA',
          portraitId: 'lumina',
          expr: 'friendly',
          text: "Welcome to the Apothecary, Adol! Looking for restorative draughts, or can I brew something special for you?",
          choices: [
            ...(canBrewTea ? [{
              label: "* Brew Hot Jasmine Tea for Nyah",
              onSelect: () => {
                removeItem('silver_teacup', 1);
                addItem('jasmine_tea', 1);
                flags.inventory = 'jasmine_tea';
                if (!flags.rivalMaidTrialStep || flags.rivalMaidTrialStep === 0) {
                  flags.rivalMaidTrialStep = 1;
                }
                playSfxLevelUp();
                spawnFloatingText("BREWED JASMINE-CATNIP TEA!", hero.x - 24, hero.y - 12, vceColor(7, 6, 1));
                updateItemBadge();
              },
              nextLines: [
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'teasing',
                  text: "Oho! Trying to win over that feisty catgirl maid at the Grand Manor? Let me steep our finest royal jasmine blossoms and dried catnip leaves into this silver teacup..."
                },
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'teasing',
                  text: "There! Steaming hot Royal Jasmine-Catnip Tea! Nyah won't be able to stay grumpy for five seconds once she catches a whiff of this. Tee-hee!"
                },
                {
                  speaker: 'FIFI',
                  portraitId: 'fifi',
                  expr: 'tea',
                  text: "W-Wow, it smells wonderful, Lady Lumina! Master, let's carry this steaming teacup carefully up to Miss Nyah at the Grand Manor steps!"
                }
              ]
            }] : []),
            ...(flags.nyahRecruited ? [{
              label: "* Maid Trio Banter",
              nextLines: (!flags.isTwilight) ? [
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'teasing',
                  text: "Well well, what an adorable party! An energetic swordsman accompanied by two completely devoted guardian maids... and one of them is an obedient little puppy maid!"
                },
                {
                  speaker: 'FIFI',
                  portraitId: 'fifi',
                  expr: 'bashful',
                  text: "U-Um! Thank you, Lady Lumina! Fifi does her very best to keep Master's clothes clean and brew herbal tea every morning!"
                },
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'teasing',
                  text: "Such sweet manners! Unlike a certain scruffy stray catgirl who used to sneak into my greenhouse and nap on the sun-fern drying racks~"
                },
                {
                  speaker: 'NYAH',
                  portraitId: 'nyah',
                  expr: 'bratty',
                  text: "HEY!! THAT WAS ONE TIME!! The sun-ferns were warm and nyah was taking a tactical surveillance nap!! Keep talking like that, pointy-ears, and nyah will bat all your potion jars off the counter!!"
                },
                {
                  speaker: 'FIFI',
                  portraitId: 'fifi',
                  expr: 'panicked',
                  text: "E-Eep! Miss Nyah, please don't knock over the potions! Master, please help calm her tail down!"
                }
              ] : [
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'teasing',
                  text: "Oho... browsing the apothecary at this late hour? Are you looking for a bottle of my secret Midnight Vigor Tonic, Master Adol? Camping outside gets awfully cold at night..."
                },
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'teasing',
                  text: "Though with two lovely maids following you around, I wonder... which one of them gets to snuggle inside Master's sleeping tent to keep him warm tonight?"
                },
                {
                  speaker: 'FIFI',
                  portraitId: 'fifi',
                  expr: 'blush',
                  text: "W-W-WHAT?! Master's sleeping bag?! Fifi... Fifi has very warm fur, but... to sleep right next to Master... *whimper* ...my face is burning up!!"
                },
                {
                  speaker: 'NYAH',
                  portraitId: 'nyah',
                  expr: 'flustered',
                  text: "LUMINA!! YOU PERVERTED WOOD ELF!! WHAT KIND OF QUESTIONS ARE YOU ASKING MASTER IN THE DARK?! AND WHY IS THE DOGGIRL EVEN CONSIDERING IT?! NYAH GETS THE TENT FIRST!! WAIT NO!! NYAH DIDN'T MEAN IT LIKE THAT!!"
                },
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'teasing',
                  text: "Tee-hee! You two are just too adorable when flustered. Mind your manners out in the dark, you three!"
                }
              ]
            }] : []),
            {
              label: "Buy Potions & Charms",
              nextLines: [
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'friendly',
                  text: "Everything here is brewed from fresh herbs gathered beneath the full moon.",
                  choices: [
                    {
                      label: "Healing Herb (+40 HP) - 15 G",
                      condition: () => flags.gold >= 15,
                      onSelect: () => {
                        flags.gold -= 15;
                        addItem('potion_heal', 1);
                        playUiConfirm();
                        spawnFloatingText("+1 HEALING HERB", hero.x, hero.y - 12, vceColor(2, 7, 2));
                        updateHudBars();
                      }
                    },
                    {
                      label: "Starlight Tonic (+90 HP) - 45 G",
                      condition: () => flags.gold >= 45,
                      onSelect: () => {
                        flags.gold -= 45;
                        addItem('potion_greater', 1);
                        playUiConfirm();
                        spawnFloatingText("+1 STARLIGHT TONIC", hero.x, hero.y - 12, vceColor(2, 5, 7));
                        updateHudBars();
                      }
                    },
                    {
                      label: "Moon Elixir (Cure Status) - 20 G",
                      condition: () => flags.gold >= 20,
                      onSelect: () => {
                        flags.gold -= 20;
                        addItem('potion_antidote', 1);
                        playUiConfirm();
                        spawnFloatingText("+1 MOON ELIXIR", hero.x, hero.y - 12, vceColor(7, 4, 7));
                        updateHudBars();
                      }
                    },
                    {
                      label: "Nyah's Silver Choker Bell - 180 G",
                      condition: () => flags.nyahRecruited && flags.gold >= 180 && nyahCompanion.accessory !== 'silver_bell',
                      onSelect: () => {
                        flags.gold -= 180;
                        nyahCompanion.accessory = 'silver_bell';
                        playSfxLevelUp();
                        spawnFloatingText("BOUGHT NYAH'S SILVER BELL!", hero.x, hero.y - 12, vceColor(7, 6, 1));
                        updateHudBars();
                      }
                    },
                    {
                      label: "Back",
                      nextLines: [{ speaker: 'LUMINA', portraitId: 'lumina', expr: 'friendly', text: "Come back whenever your draughts run dry!" }]
                    }
                  ]
                }
              ]
            },
            {
              label: "Ask about the Lord's slumber",
              nextLines: [
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'friendly',
                  text: "The Lord's slumber isn't a natural sickness. It's a deep twilight curse cast when the three sacred relics were stolen from the Bell Tower."
                },
                {
                  speaker: 'LUMINA',
                  portraitId: 'lumina',
                  expr: 'friendly',
                  text: "Only by recovering the Tuning Fork, Bell Clapper, and Sanctum Crest can we ring the sacred bell and shatter the darkness!"
                }
              ]
            },
            {
              label: "Leave"
            }
          ]
        }
      ];
    } else if (npcId === 'goran') {
      return [
        {
          speaker: 'GORAN',
          portraitId: 'guard',
          expr: 'friendly',
          text: "Welcome to Goran's Forge! The finest tempered steel in all of Aldenor. What'll it be, swordsman?",
          choices: [
            {
              label: "Browse Weapons & Armor",
              nextLines: [
                {
                  speaker: 'GORAN',
                  portraitId: 'guard',
                  expr: 'friendly',
                  text: "Pick your steel wisely, lad. Good armor saves your skin when monsters swarm.",
                  choices: [
                    {
                      label: "Iron Broadsword (+18 ATK) - 120 G",
                      condition: () => flags.gold >= 120 && hero.weapon !== 'iron_broadsword',
                      onSelect: () => {
                        flags.gold -= 120;
                        hero.weapon = 'iron_broadsword';
                        playSfxLevelUp();
                        spawnFloatingText("EQUIPPED IRON BROADSWORD!", hero.x, hero.y - 12, vceColor(3, 5, 7));
                        updateHudBars();
                      }
                    },
                    {
                      label: "Leather Cuirass (+12 DEF) - 90 G",
                      condition: () => flags.gold >= 90 && hero.armor !== 'leather_cuirass',
                      onSelect: () => {
                        flags.gold -= 90;
                        hero.armor = 'leather_cuirass';
                        playSfxLevelUp();
                        spawnFloatingText("EQUIPPED LEATHER CUIRASS!", hero.x, hero.y - 12, vceColor(7, 6, 1));
                        updateHudBars();
                      }
                    },
                    {
                      label: "Chain Hauberk (+30 DEF) - 200 G",
                      condition: () => flags.gold >= 200 && hero.armor !== 'chain_hauberk',
                      onSelect: () => {
                        flags.gold -= 200;
                        hero.armor = 'chain_hauberk';
                        playSfxLevelUp();
                        spawnFloatingText("EQUIPPED CHAIN HAUBERK!", hero.x, hero.y - 12, vceColor(5, 7, 7));
                        updateHudBars();
                      }
                    },
                    {
                      label: "Back",
                      nextLines: [{ speaker: 'GORAN', portraitId: 'guard', expr: 'friendly', text: "Let me know when you need real craftsmanship!" }]
                    }
                  ]
                }
              ]
            },
            {
              label: "Ask about ancient weapons",
              nextLines: [
                {
                  speaker: 'GORAN',
                  portraitId: 'guard',
                  expr: 'friendly',
                  text: "Legends speak of two master blades on this island: the Flame Edge buried in the Coastal Crypts, and Clerici's Sacred Blade resting in the Sunken Shrine."
                },
                {
                  speaker: 'GORAN',
                  portraitId: 'guard',
                  expr: 'friendly',
                  text: "If you find either of 'em in the deep ruins, bring 'em to my anvil! I'll hone their edges to split the twilight itself!"
                }
              ]
            },
            {
              label: "Leave"
            }
          ]
        }
      ];
    } else if (npcId === 'guard') {
      if (hasItem('guard_sandwich') || flags.inventory === 'guard_sandwich') {
        return [
          {
            speaker: 'GUARD',
            portraitId: 'guard',
            expr: 'guard',
            text: "By the gods... my smoked herring sandwich! You wrestled it back from that fiendish gull?! You are a true hero, lad! Here—take this Tavern VIP Pass, 30 Gold, and the Manor's Silver Teacup if you still need it!",
            onSelect: () => {
              flags.seagullSolved = true;
              flags.tavern_pass = true;
              flags.gold = (flags.gold || 0) + 30;
              removeItem('guard_sandwich', 1);
              if (!flags.manorUnlocked && !hasItem('silver_teacup') && !hasItem('jasmine_tea')) {
                addItem('silver_teacup', 1);
                flags.inventory = 'silver_teacup';
                if (!flags.rivalMaidTrialStep || flags.rivalMaidTrialStep === 0) {
                  flags.rivalMaidTrialStep = 1;
                }
              }
              addItem('tavern_pass', 1);
              playSfxLevelUp();
              spawnFloatingText("+SILVER TEACUP & +30G!", hero.x - 20, hero.y - 12, vceColor(7, 6, 1));
              updateHudBars();
              updateItemBadge();
            }
          }
        ];
      }
      if (!flags.manorUnlocked && !hasItem('silver_teacup') && !hasItem('jasmine_tea')) {
        // The teacup is NOT handed over here any more: the gull has it, and the
        // seagull chase is the mandatory step described in the dialogue. The
        // teacup is only awarded when the stolen sandwich is returned below.
        return [
          {
            speaker: 'GUARD',
            portraitId: 'guard',
            expr: 'guard',
            text: "Halt, traveler! Ah—that feisty catgirl maid Nyah up at the Grand Manor sent you for the Manor's Silver Teacup, didn't she? Bad news: a harbor gull snatched it right out of my hands while I was polishing it by the fountain!",
            nextLines: [
              {
                speaker: 'GUARD',
                portraitId: 'guard',
                expr: 'guard',
                text: "It's still flapping around the south plaza with my smoked herring sandwich in its beak. Corner that feathered thief three times and bring my lunch back - then the Silver Teacup is yours. Lumina at the West Market Apothecary can brew Nyah's tea once you have it."
              }
            ]
          }
        ];
      }
      return [
        {
          speaker: 'GUARD',
          portraitId: 'guard',
          expr: 'guard',
          text: "Stay sharp out there, Adol! If you're looking for Nyah's tea, bring that Silver Teacup to Lumina at the West Market Apothecary stall! And if you spot that thieving seagull with my sandwich, chase it down 3 times for a 30G reward!"
        }
      ];
    } else if (npcId === 'elder') {
      return [
        {
          speaker: 'ELDER',
          portraitId: 'elder',
          expr: 'elder',
          text: "Welcome to our port of Aldenor, young adventurer. The Sacred Bell Tower has held the deep shadows at bay for three hundred years.",
          choices: [
            {
              label: flags.isTwilight ? "* Rest until Morning" : "* Rest until Twilight (Dusk)",
              onSelect: () => {
                hero.hp = hero.maxHp;
                playSfxHeal();
                // The Elder is the only way to move the clock. One funnel for the
                // palette, schedules, maps and HUD keeps the phase consistent.
                setTimeOfDay(!flags.isTwilight);
                hero.hp = hero.maxHp;
                updateHudBars();
              },
              nextLines: [
                {
                  speaker: 'ELDER',
                  portraitId: 'elder',
                  expr: 'elder',
                  text: flags.isTwilight
                    ? "The sun rises over the harbor waters, restoring your strength."
                    : "Twilight descends over Aldenor... Beneath the dusk sky, the sealed gates of the eastern Coastal Crypts will open."
                }
              ]
            },
            {
              label: "Ask about the Three Relics",
              nextLines: [
                {
                  speaker: 'ELDER',
                  portraitId: 'elder',
                  expr: 'elder',
                  text: "First is the Tuning Fork in the western Old Quarry Mines. Second is the Bell Clapper in the eastern Coastal Crypts at Twilight. Third is the Sanctum Crest in the southern Sunken Shrine."
                }
              ]
            },
            {
              label: "Leave"
            }
          ]
        }
      ];
    } else if (npcId === 'barkeep') {
      const hasSlimeBounty = flags.bountyProgress && flags.bountyProgress.slime >= 5 && !flags.bountiesClaimed.includes('bounty_slimes');
      const hasCrabBounty = flags.bountyProgress && flags.bountyProgress.crab >= 3 && !flags.bountiesClaimed.includes('bounty_crabs');

      if (hasSlimeBounty || hasCrabBounty) {
        return [
          {
            speaker: 'BARKEEP',
            expr: 'friendly',
            text: "Look who's back from the coastal wild! Let me check the guild registry...",
            choices: [
              ...(hasSlimeBounty ? [{
                label: "Claim Slime Bounty (60 G, 50 EXP)",
                onSelect: () => {
                  flags.bountiesClaimed.push('bounty_slimes');
                  flags.gold += 60;
                  addExp(50);
                  playSfxCoin();
                  updateHudBars();
                },
                nextLines: [
                  { speaker: 'BARKEEP', expr: 'friendly', text: "Outstanding work, swordsman! 5 slimes culled. Here's your 60 Gold and guild renown!" }
                ]
              }] : []),
              ...(hasCrabBounty ? [{
                label: "Claim Crab Bounty (90 G, 80 EXP)",
                onSelect: () => {
                  flags.bountiesClaimed.push('bounty_crabs');
                  flags.gold += 90;
                  addExp(80);
                  playSfxCoin();
                  updateHudBars();
                },
                nextLines: [
                  { speaker: 'BARKEEP', expr: 'friendly', text: "Crushed those armored shore crabs, did ye? The harbor fishers thank ye! Here's 90 Gold!" }
                ]
              }] : []),
              {
                label: "Leave"
              }
            ]
          }
        ];
      }
      return [
        {
          speaker: 'BARKEEP',
          expr: 'friendly',
          text: "Welcome to the South Harbor Tavern, traveler! Cold malt on tap, and the latest coastal gossip.",
          choices: [
            {
              label: "Ask about monster bounties",
              nextLines: [
                {
                  speaker: 'BARKEEP',
                  expr: 'friendly',
                  text: "Check the Bounty Board right outside my tavern doors! Cull 5 slimes or 3 armored crabs, and I'll pay you gold on the spot!"
                }
              ]
            },
            {
              label: "Order a cold malt (5 G)",
              condition: () => flags.gold >= 5,
              onSelect: () => {
                flags.gold -= 5;
                hero.hp = Math.min(hero.maxHp, hero.hp + 15);
                playSfxHeal();
                spawnFloatingText("+15 HP (REFRESHED)", hero.x, hero.y - 12, vceColor(2, 7, 2));
                updateHudBars();
              },
              nextLines: [
                { speaker: 'BARKEEP', expr: 'friendly', text: "Down the hatch! Nothing washes away sea brine like fresh harbor ale." }
              ]
            },
            {
              label: "Leave"
            }
          ]
        }
      ];
    } else if (npcId === 'bard') {
      return [
        {
          speaker: 'BARD',
          expr: 'friendly',
          text: "* O brave red-haired swordsman from across the sea... Did the silver chimes of Esteria guide your blade to our shores? *"
        },
        {
          speaker: 'BARD',
          expr: 'friendly',
          text: "The ancient verses tell of an adventurer who cuts through darkness with swift steel. May your song never falter, Adol Christin!"
        }
      ];
    } else if (npcId === 'sailor') {
      if (hasItem('brass_locket') && !flags.peteQuestDone) {
        return [
          {
            speaker: 'SAILOR',
            expr: 'friendly',
            text: "BY THE TIDES!! Me wife's brass locket!! Ye actually battered it out of those beach crabs' pincers!",
            onSelect: () => {
              removeItem('brass_locket', 1);
              flags.peteQuestDone = true;
              flags.gold += 50;
              addExp(100);
              playSfxLevelUp();
              spawnFloatingText("+100 EXP  +50 G", hero.x, hero.y - 12, vceColor(7, 6, 1));
              updateHudBars();
            },
            nextLines: [
              {
                speaker: 'SAILOR',
                expr: 'friendly',
                text: "You're a lifesaver, Adol! If I went home without that locket, me wife would've fed me to the sharks! Here's 50 Gold and me eternal thanks!"
              }
            ]
          }
        ];
      } else if (flags.peteQuestDone) {
        return [
          {
            speaker: 'SAILOR',
            expr: 'friendly',
            text: "Thanks to you, lad, me locket is safe around me neck! Give those beach crabs an extra whack for old Pete!"
          }
        ];
      } else {
        return [
          {
            speaker: 'SAILOR',
            expr: 'friendly',
            text: "Hic! Lost me wife's brass locket down by the southern reef... the armored crabs snapped it right off me belt!",
            choices: [
              {
                label: "I'll recover your locket",
                onSelect: () => { flags.peteQuestActive = true; playUiConfirm(); },
                nextLines: [
                  { speaker: 'SAILOR', expr: 'friendly', text: "Bless ye, lad! Smash those crabs on the south beach and bring it back!" }
                ]
              },
              {
                label: "Stay out of trouble"
              }
            ]
          }
        ];
      }
    } else if (npcId === 'mercenary') {
      return [
        {
          speaker: 'MERCENARY',
          expr: 'friendly',
          text: "You look like you know how to hold a blade, traveler. But out in the wilderness, hesitation gets you killed."
        },
        {
          speaker: 'MERCENARY',
          expr: 'friendly',
          text: "Press [Z] or [Space] outside town to slash monsters before they close the distance! Time your strikes to knock 'em back!"
        }
      ];
    } else if (npcId === 'child') {
      if ((flags.mochiFound || flags.hasMochi || hasItem('kitten_mochi')) && !flags.kittenRescued) {
        return [
          {
            speaker: 'LYLA',
            portraitId: 'child',
            expr: 'child',
            text: "MOCHI!! You found him!! Thank you so much! Here, I found this shiny Starlight Shard by the fountain—please take it!",
            onSelect: () => {
              flags.hasMochi = false;
              flags.mochiFound = true;
              flags.kittenRescued = true;
              flags.mochiQuestDone = true;
              removeItem('kitten_mochi', 1);
              hero.bonusMaxHp = (hero.bonusMaxHp || 0) + 15;
              hero.maxHp = getMaxHpForLevel(hero.level);
              hero.hp = hero.maxHp;
              flags.gold = (flags.gold || 0) + 100;
              addExp(150);
              playSfxLevelUp();
              spawnFloatingText("+15 MAX HP  +100G  +150 EXP!", hero.x - 20, hero.y - 14, vceColor(7, 6, 1));
              updateHudBars();
            },
            nextLines: [
              {
                speaker: 'LYLA',
                portraitId: 'child',
                expr: 'child',
                text: flags.nyahRecruited
                  ? "Mochi is safe and warm now! You, Miss Fifi, and Miss Nyah are the best heroes in the whole world!"
                  : "Mochi is safe and warm now! You and Miss Fifi are the best heroes in the whole world!"
              }
            ]
          }
        ];
      } else if (flags.kittenRescued || flags.mochiQuestDone) {
        return [
          {
            speaker: 'LYLA',
            portraitId: 'child',
            expr: 'child',
            text: "Mochi is safe and warm now! When I grow up, I want to be a brave swordsman just like you, mister Adol!"
          }
        ];
      } else {
        return [
          {
            speaker: 'LYLA',
            portraitId: 'child',
            expr: 'child',
            text: flags.nyahRecruited
              ? "Sniffle... Mister Swordsman! Miss Nyah! My little white kitten Mochi got scared by a slime and ran out through the South Gate toward the western pine grove in the Coastal Plains! Can you bring him back, please?"
              : "Sniffle... Mister Swordsman! My little white kitten Mochi got scared by a slime and ran out through the South Gate toward the western pine grove in the Coastal Plains! Can you bring him back, please?",
            choices: [
              {
                label: "I'll find Mochi",
                onSelect: () => { flags.mochiQuestActive = true; playUiConfirm(); },
                nextLines: [
                  { speaker: 'LYLA', portraitId: 'child', expr: 'child', text: "Really?! Thank you!! Please check the pine grove near the western cliffs outside the South Gate!" }
                ]
              },
              {
                label: "I'm busy right now"
              }
            ]
          }
        ];
      }
    } else if (npcId === 'kitten_mochi') {
      const nyahLine = flags.nyahRecruited ? [
        {
          speaker: 'NYAH',
          portraitId: 'nyah',
          expr: 'friendly',
          text: "Mochi!! Come here little guy—we've got you! Master, let's take him right back to Lyla in town!"
        }
      ] : [];
      return [
        {
          speaker: 'MOCHI',
          expr: 'friendly',
          text: "Mew! The little calico kitten purrs softly, nuzzles against your traveling boots, and snuggles into your travel cloak! (You found Mochi!)",
          onSelect: () => {
            flags.mochiFound = true;
            flags.hasMochi = true;
            flags.mochiQuestActive = true;
            addItem('kitten_mochi', 1);
            const mochiNpc = npcs.find(n => n.id === 'kitten_mochi');
            if (mochiNpc) mochiNpc.active = false;
            playSfxBlip(1600);
            spawnFloatingText("FOUND KITTEN MOCHI!", hero.x, hero.y - 12, vceColor(7, 6, 1));
          },
          nextLines: nyahLine
        }
      ];
    } else {
      return [
        {
          speaker: 'TRAVELER',
          expr: 'friendly',
          text: "Aldenor was once the jewel of the northern sea... May you bring peace back to our island."
        }
      ];
    }
  }

  function startDialogue(npc) {
    if (dialogueState.cooldownTimer > 0) return;

    if (npc.id === 'bard') {
      playSfxLute();
    }

    if (npc.id === 'seagull') {
      handleSeagullInteraction(npc);
      return;
    }

    const tree = getDialogueTree(npc.id);
    if (!tree || tree.length === 0) return;
    tree.forEach(line => {
      delete line._executed;
      if (line.nextLines) line.nextLines.forEach(nl => delete nl._executed);
    });

    dialogueState.active = true;
    dialogueState.npc = npc;
    dialogueState.lines = tree;
    dialogueState.lineIndex = 0;
    dialogueState.charIndex = 0;
    dialogueState.crawlTimer = 0;
    dialogueState.isComplete = false;
    dialogueState.mouthFlap = false;
    dialogueState.eyeBlink = false;
    dialogueState.blinkTimer = 0;
    dialogueState.earTwitch = false;
    dialogueState.earTimer = 0;
    dialogueState.currentExpression = tree[0].expr || 'friendly';
    if (tree[0].portraitId) npc.portraitId = tree[0].portraitId;
    if (tree[0].speaker) npc.name = tree[0].speaker;
    dialogueState.scrollOffset = 0;
    dialogueState.isDoorInspection = false;
    dialogueState.choiceIndex = 0;
    dialogueState.activeChoices = null;
    recordDialogueLine(tree[0]);

    npc.isEngaged = true;
    const dx = hero.x - npc.x, dy = hero.y - npc.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      npc.dir = dx > 0 ? 3 : 2;
    } else {
      npc.dir = dy > 0 ? 0 : 1;
    }

    updateItemBadge();
    playUiConfirm();
  }

  function startCustomDialogue(speaker, expr, text, npcId, isDoor = false) {
    if (dialogueState.cooldownTimer > 0) return;
    dialogueState.active = true;
    dialogueState.npc = {
      id: npcId,
      name: speaker,
      portraitId: (npcId === 'nyah' || npcId === 'lumina' || npcId === 'elder' || npcId === 'guard' || npcId === 'child' || npcId === 'seagull') ? npcId : null,
      isEngaged: false
    };
    dialogueState.lines = [{ speaker, expr, text }];
    dialogueState.lineIndex = 0;
    dialogueState.charIndex = 0;
    dialogueState.crawlTimer = 0;
    dialogueState.isComplete = false;
    dialogueState.mouthFlap = false;
    dialogueState.eyeBlink = false;
    dialogueState.blinkTimer = 0;
    dialogueState.earTwitch = false;
    dialogueState.earTimer = 0;
    dialogueState.currentExpression = expr;
    dialogueState.scrollOffset = 0;
    dialogueState.isDoorInspection = isDoor;
    dialogueState.choiceIndex = 0;
    dialogueState.activeChoices = null;
    recordDialogueLine(dialogueState.lines[0]);
    playUiConfirm();
  }

  function startCustomDialogueTree(lines, npcId = 'nyah') {
    if (dialogueState.cooldownTimer > 0) return;
    dialogueState.active = true;
    const firstPid = lines[0]?.portraitId || ((npcId === 'nyah' || npcId === 'fifi' || npcId === 'lumina' || npcId === 'elder' || npcId === 'guard' || npcId === 'child' || npcId === 'seagull') ? npcId : null);
    dialogueState.npc = {
      id: npcId,
      name: lines[0]?.speaker || 'DIALOGUE',
      portraitId: firstPid,
      isEngaged: false
    };
    lines.forEach(l => {
      delete l._executed;
      if (l.nextLines) l.nextLines.forEach(nl => delete nl._executed);
    });
    dialogueState.lines = lines;
    dialogueState.lineIndex = 0;
    dialogueState.charIndex = 0;
    dialogueState.crawlTimer = 0;
    dialogueState.isComplete = false;
    dialogueState.mouthFlap = false;
    dialogueState.eyeBlink = false;
    dialogueState.blinkTimer = 0;
    dialogueState.earTwitch = false;
    dialogueState.earTimer = 0;
    dialogueState.currentExpression = lines[0]?.expr || 'friendly';
    dialogueState.scrollOffset = 0;
    dialogueState.isDoorInspection = false;
    dialogueState.choiceIndex = 0;
    dialogueState.activeChoices = null;
    recordDialogueLine(lines[0]);
    playUiConfirm();
  }

  function openSaveCrystalDialogue() {
    hero.hp = hero.maxHp;
    playSfxHeal();
    spawnFloatingText("HP FULLY RESTORED!", hero.x - 12, hero.y - 12, vceColor(2, 7, 2));
    updateHudBars();
    autoSave();

    let chatLines = [];
    if (activeMapId === 'dungeon_mines') {
      if (flags.bossGolemDefeated) {
        chatLines = [
          { speaker: 'NYAH', expr: 'smug', text: "Did you SEE us back there against that giant rock golem, Master?! When you spun your blade and nyah spun right alongside you, we looked like an unstoppable hurricane! Try holding [Z] in the next fight—I've got the rhythm of your footwork memorized now." },
          { speaker: 'NYAH', expr: 'flustered', text: "...You know, I used to think fighting for someone meant being ordered around. Back before I came to Aldenor, people always tried to tell me what to be. With you... nyah chooses to be here. Every single fight. ...Anyway! My feet are cold, scoot over!" }
        ];
      } else {
        chatLines = [
          { speaker: 'NYAH', expr: 'bratty', text: "Ugh, look at this soot! Do you have any idea how long it takes nyah to brush coal dust out of my tail?! If anyone asks, this is a strategic stealth tint." },
          { speaker: 'NYAH', expr: 'normal', text: "Wait... listen to the rails, Master. When you hit those iron track switches with your blade, the minecarts can smash right through the wooden barricades in the lower tunnels. Stick close to me when the Rock Beetles charge—I'll flank them while you wind up a spin slash!" }
        ];
      }
    } else if (activeMapId === 'dungeon_crypts') {
      if (flags.bossLichDefeated) {
        chatLines = [
          { speaker: 'NYAH', expr: 'normal', text: "Two relics down, one to go! And did you see how nyah vaulted right over those bone shields?! Whenever we run into those annoying shielded Skeleton Knights or Tritons, just engage them from the front and I'll leap right over their heads to stagger them from behind!" },
          { speaker: 'NYAH', expr: 'smug', text: "Look at the sky over the town, Master... the purple mist is actually starting to thin out. The Lord's breathing was steadier when we checked on him, too. We're really doing this." }
        ];
      } else {
        chatLines = [
          { speaker: 'NYAH', expr: 'flustered', text: "I am NOT scared of ghosts, Master! My tail is only wrapped around your arm for tactical balance in the dark!! If you tell anyone in town that nyah jumped when that skeleton rattled, I will lock you inside a sarcophagus." },
          { speaker: 'NYAH', expr: 'bratty', text: "Also, look closely at the eastern masonry near the blue braziers. Some of these crypt walls don't have mortar at the bottom—Bard Dennis said the old masons built illusory passages you can walk straight through!" }
        ];
      }
    } else if (activeMapId === 'dungeon_shrine') {
      if (flags.bossLeviathanDefeated) {
        chatLines = [
          { speaker: 'NYAH', expr: 'normal', text: "We got all three relics!! The Tuning Fork, the Clapper, and the Sacred Sanctum Crest! Master, we can finally open the sealed gate behind the Grand Manor and climb the Northern Bell Tower Spire! No matter what happens up there, nyah has your back—unlocked [Perk: Guardian's Devotion]!" }
        ];
      } else {
        chatLines = [
          { speaker: 'NYAH', expr: 'bratty', text: "Water. An entire dungeon full of waist-deep seawater, electric jellyfish, and giant crabs. You brought a catgirl into a flooded underwater temple on purpose, didn't you?!" },
          { speaker: 'NYAH', expr: 'flustered', text: "Listen up: those brass sluice valves control the water height across all four quadrants. Lower the water when we need to use the sunken stairs, and raise it when we need the wooden rafts to float across the deep chasms. And if my apron gets soaked, you're buying me ten tins of silver sardines at the tavern!" }
        ];
      }
    } else if (activeMapId === 'bell_spire') {
      chatLines = [
        { speaker: 'NYAH', expr: 'flustered', text: "Master... wait a second before we climb the Spire stairs. Look how far down the harbor lanterns are from up here." },
        { speaker: 'NYAH', expr: 'normal', text: "Whatever is waiting at the top of that belfry is the thing that cursed the Lord and tried to swallow this whole island in the dark. If things get bad up there—even if you take a hit that should knock you down—nyah won't let you fall. I'll pour every drop of strength I have left into getting you back on your feet." },
        { speaker: 'NYAH', expr: 'flustered', text: "Promise me one thing, okay? When the Bell rings and the sun comes up... don't just get back on that ship and vanish without saying goodbye. ...Come here. Give me your hand. Okay... let's go finish this." }
      ];
    } else {
      chatLines = [
        { speaker: 'NYAH', expr: 'normal', text: "Hey, Master... let me see your sword arm for a second. No, don't pull away, I'm checking for crab pinches! Honestly, the way you just charge headfirst into monsters gives nyah a heart attack every ten seconds." },
        { speaker: 'NYAH', expr: 'flustered', text: "Before the curse hit the Manor, things were so quiet here. Sometimes I'd sit on the roof at sunset watching ships pass by, wondering if anything exciting would ever happen... and then you showed up. ...H-Hey, why are you looking at me like that?! Drink your potion and go to sleep!!" }
      ];
    }

    const crystalTree = [
      {
        speaker: 'MANA CRYSTAL',
        expr: 'friendly',
        text: "The glowing Mana Crystal pulses with warm restorative energy. HP fully restored and game progress saved.",
        choices: [
          {
            label: "Sit and Chat with Nyah",
            nextLines: chatLines.map(line => ({
              speaker: line.speaker,
              portraitId: 'nyah',
              expr: line.expr,
              text: line.text
            }))
          },
          {
            label: "Open Save Menu",
            onSelect: () => {
              statusMenuState.open = true;
              statusMenuState.activeTab = 2;
            }
          },
          {
            label: "Stand up & Continue"
          }
        ]
      }
    ];

    startCustomDialogueTree(crystalTree, 'nyah');
  }

  function advanceDialogue() {
    if (!dialogueState.active) return;

    const currentLine = dialogueState.lines[dialogueState.lineIndex];
    if (!dialogueState.isComplete) {
      dialogueState.charIndex = currentLine.text.length;
      dialogueState.isComplete = true;
      dialogueState.mouthFlap = false;
      const curPid = currentLine?.portraitId || (dialogueState.npc ? dialogueState.npc.portraitId || dialogueState.npc.id : null);
      const hasPortrait = curPid !== null && (
        curPid === 'nyah' || curPid === 'fifi' || curPid === 'lumina' || curPid === 'elder' || curPid === 'guard' || curPid === 'child' || curPid === 'seagull'
      );
      const fullLines = wrapDialogueText(currentLine.text, hasPortrait ? 28 : 36);
      if (fullLines.length > 6) {
        dialogueState.scrollOffset = fullLines.length - 6;
      }
      if (currentLine.choices) {
        const active = currentLine.choices.filter(c => !c.condition || c.condition());
        if (active.length > 0) {
          dialogueState.activeChoices = active;
          dialogueState.choiceIndex = 0;
        }
      }
    } else {
      if (dialogueState.activeChoices && dialogueState.activeChoices.length > 0) {
        const choice = dialogueState.activeChoices[dialogueState.choiceIndex];
        if (choice.onSelect) choice.onSelect();
        if (choice.nextExpr) dialogueState.currentExpression = choice.nextExpr;
        if (choice.nextLines && choice.nextLines.length > 0) {
          dialogueState.lines = choice.nextLines;
          dialogueState.lineIndex = 0;
          dialogueState.charIndex = 0;
          dialogueState.crawlTimer = 0;
          dialogueState.isComplete = false;
          dialogueState.scrollOffset = 0;
          dialogueState.activeChoices = null;
          dialogueState.choiceIndex = 0;
          const firstNext = dialogueState.lines[0];
          dialogueState.currentExpression = firstNext.expr || dialogueState.currentExpression || 'friendly';
          if (firstNext.portraitId && dialogueState.npc) dialogueState.npc.portraitId = firstNext.portraitId;
          if (firstNext.speaker && dialogueState.npc) dialogueState.npc.name = firstNext.speaker;
          recordDialogueLine(firstNext);
          playUiConfirm();
        } else {
          closeDialogue();
        }
        return;
      }

      const curLine = dialogueState.lines[dialogueState.lineIndex];
      if (curLine && curLine.onSelect && !curLine._executed) {
        curLine._executed = true;
        curLine.onSelect();
      }
      if (curLine && curLine.nextLines && curLine.nextLines.length > 0) {
        dialogueState.lines = curLine.nextLines;
        dialogueState.lineIndex = 0;
        dialogueState.charIndex = 0;
        dialogueState.crawlTimer = 0;
        dialogueState.isComplete = false;
        dialogueState.scrollOffset = 0;
        dialogueState.activeChoices = null;
        dialogueState.choiceIndex = 0;
        const firstNext = dialogueState.lines[0];
        dialogueState.currentExpression = firstNext.expr || 'friendly';
        if (firstNext.portraitId && dialogueState.npc) dialogueState.npc.portraitId = firstNext.portraitId;
        if (firstNext.speaker && dialogueState.npc) dialogueState.npc.name = firstNext.speaker;
        recordDialogueLine(firstNext);
        playUiConfirm();
        return;
      }

      dialogueState.lineIndex++;
      if (dialogueState.lineIndex < dialogueState.lines.length) {
        dialogueState.charIndex = 0;
        dialogueState.crawlTimer = 0;
        dialogueState.isComplete = false;
        const nxt = dialogueState.lines[dialogueState.lineIndex];
        dialogueState.currentExpression = nxt.expr || 'friendly';
        if (nxt.portraitId && dialogueState.npc) dialogueState.npc.portraitId = nxt.portraitId;
        if (nxt.speaker && dialogueState.npc) dialogueState.npc.name = nxt.speaker;
        recordDialogueLine(nxt);
        dialogueState.mouthFlap = false;
        dialogueState.scrollOffset = 0;
        dialogueState.activeChoices = null;
        dialogueState.choiceIndex = 0;
      } else {
        closeDialogue();
      }
    }
  }

  function closeDialogue() {
    if (!dialogueState.active) return;
    const npc = dialogueState.npc;

    if (!dialogueState.isDoorInspection && npc) {
      if (npc.id === 'nyah') {
        flags.talkedToNyah = true;
        if (flags.talkedToElf) flags.nyahRantedAboutElf = true;
      } else if (npc.id === 'lumina') {
        flags.talkedToElf = true;
      }
    }

    dialogueState.active = false;
    dialogueState.npc = null;
    dialogueState.activeChoices = null;
    dialogueState.isDoorInspection = false;
    dialogueState.cooldownTimer = 0.22;
    dialogueCloseCooldown = 0.20;
    if (npc && npc.isEngaged) npc.isEngaged = false;
    updateItemBadge();
    playUiConfirm();
  }

  // =========================================================================
