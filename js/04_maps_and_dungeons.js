// 04_maps_and_dungeons.js (Modularized from index.html)
  // SECTION 6: Multi-Room Map Registry & Interior Rooms Architecture
  // =========================================================================
  const TILE_SZ = 16;
  let activeMapId = 'aldenor_exterior';

  const MAPS = {
    aldenor_exterior: {
      id: 'aldenor_exterior',
      name: 'Aldenor Town',
      width: 32,
      height: 26,
      groundLayer: new Array(32 * 26).fill('cobble1'),
      structLayer: new Array(32 * 26).fill(null),
      overheadLayer: new Array(32 * 26).fill(null),
      collisionMap: new Uint8Array(32 * 26).fill(0),
      hearthPos: null,
      lanterns: [
        { x: 192 + 8, y: 176 + 6 },
        { x: 304 + 8, y: 176 + 6 },
        { x: 192 + 8, y: 240 + 6 },
        { x: 304 + 8, y: 240 + 6 },
        { x: 352 + 8, y: 144 + 6 },
        { x: 432 + 8, y: 144 + 6 },
        { x: 128 + 8, y: 192 + 6 },
        { x: 208 + 8, y: 368 + 6 },
        { x: 288 + 8, y: 368 + 6 }
      ]
    },
    grand_manor_interior: {
      id: 'grand_manor_interior',
      name: 'Grand Manor Interior',
      width: 16,
      height: 14,
      groundLayer: new Array(16 * 14).fill('woodFloor'),
      structLayer: new Array(16 * 14).fill(null),
      overheadLayer: new Array(16 * 14).fill(null),
      collisionMap: new Uint8Array(16 * 14).fill(0),
      hearthPos: { x: 7.5 * 16, y: 2.5 * 16 },
      lanterns: [
        { x: 2 * 16 + 8, y: 11 * 16 + 6 },
        { x: 13 * 16 + 8, y: 11 * 16 + 6 }
      ]
    },
    lumina_workshop: {
      id: 'lumina_workshop',
      name: "Lumina's Workshop",
      width: 14,
      height: 12,
      groundLayer: new Array(14 * 12).fill('woodFloor'),
      structLayer: new Array(14 * 12).fill(null),
      overheadLayer: new Array(14 * 12).fill(null),
      collisionMap: new Uint8Array(14 * 12).fill(0),
      hearthPos: null,
      lanterns: [
        { x: 2 * 16 + 8, y: 4 * 16 + 6 },
        { x: 11 * 16 + 8, y: 4 * 16 + 6 }
      ]
    },
    harbor_tavern: {
      id: 'harbor_tavern',
      name: 'South Harbor Tavern',
      width: 16,
      height: 14,
      groundLayer: new Array(16 * 14).fill('woodFloor'),
      structLayer: new Array(16 * 14).fill(null),
      overheadLayer: new Array(16 * 14).fill(null),
      collisionMap: new Uint8Array(16 * 14).fill(0),
      hearthPos: { x: 12 * 16, y: 2 * 16 },
      lanterns: [
        { x: 1 * 16 + 8, y: 12 * 16 + 6 },
        { x: 14 * 16 + 8, y: 12 * 16 + 6 }
      ]
    },
    aldenor_coastal_plains: {
      id: 'aldenor_coastal_plains',
      name: 'Coastal Plains',
      width: 32,
      height: 24,
      groundLayer: new Array(32 * 24).fill('grass'),
      structLayer: new Array(32 * 24).fill(null),
      overheadLayer: new Array(32 * 24).fill(null),
      collisionMap: new Uint8Array(32 * 24).fill(0),
      hearthPos: null,
      lanterns: [
        { x: 13 * 16 + 8, y: 2 * 16 + 6 },
        { x: 18 * 16 + 8, y: 2 * 16 + 6 }
      ]
    },
    goran_forge: {
      id: 'goran_forge',
      name: "Goran's Forge",
      width: 14,
      height: 12,
      groundLayer: new Array(14 * 12).fill('woodFloor'),
      structLayer: new Array(14 * 12).fill(null),
      overheadLayer: new Array(14 * 12).fill(null),
      collisionMap: new Uint8Array(14 * 12).fill(0),
      hearthPos: { x: 4 * 16, y: 2 * 16 },
      lanterns: [
        { x: 2 * 16 + 8, y: 3 * 16 + 6 },
        { x: 11 * 16 + 8, y: 3 * 16 + 6 }
      ]
    },
    dungeon_mines: {
      id: 'dungeon_mines',
      name: 'Old Quarry Mines',
      width: 36,
      height: 32,
      groundLayer: new Array(36 * 32).fill('minesFloor'),
      structLayer: new Array(36 * 32).fill(null),
      overheadLayer: new Array(36 * 32).fill(null),
      collisionMap: new Uint8Array(36 * 32).fill(0),
      hearthPos: null,
      lanterns: [
        { x: 8 * 16 + 8, y: 28 * 16 + 6 },
        { x: 22 * 16 + 8, y: 24 * 16 + 6 },
        { x: 8 * 16 + 8, y: 8 * 16 + 6 },
        { x: 26 * 16 + 8, y: 6 * 16 + 6 }
      ]
    },
    dungeon_crypts: {
      id: 'dungeon_crypts',
      name: 'Coastal Crypts',
      width: 36,
      height: 32,
      groundLayer: new Array(36 * 32).fill('cryptsFloor'),
      structLayer: new Array(36 * 32).fill(null),
      overheadLayer: new Array(36 * 32).fill(null),
      collisionMap: new Uint8Array(36 * 32).fill(0),
      hearthPos: null,
      lanterns: [
        { x: 8 * 16 + 8, y: 28 * 16 + 6 },
        { x: 22 * 16 + 8, y: 24 * 16 + 6 },
        { x: 8 * 16 + 8, y: 8 * 16 + 6 },
        { x: 26 * 16 + 8, y: 6 * 16 + 6 }
      ]
    },
    dungeon_shrine: {
      id: 'dungeon_shrine',
      name: 'Sunken Shrine',
      width: 36,
      height: 32,
      groundLayer: new Array(36 * 32).fill('shrineFloor'),
      structLayer: new Array(36 * 32).fill(null),
      overheadLayer: new Array(36 * 32).fill(null),
      collisionMap: new Uint8Array(36 * 32).fill(0),
      hearthPos: null,
      lanterns: [
        { x: 8 * 16 + 8, y: 28 * 16 + 6 },
        { x: 22 * 16 + 8, y: 24 * 16 + 6 },
        { x: 8 * 16 + 8, y: 8 * 16 + 6 },
        { x: 26 * 16 + 8, y: 6 * 16 + 6 }
      ]
    },
    bell_spire: {
      id: 'bell_spire',
      name: 'Northern Bell Spire',
      width: 20,
      height: 28,
      groundLayer: new Array(20 * 28).fill('spireFloor'),
      structLayer: new Array(20 * 28).fill(null),
      overheadLayer: new Array(20 * 28).fill(null),
      collisionMap: new Uint8Array(20 * 28).fill(0),
      hearthPos: null,
      lanterns: [
        { x: 10 * 16 + 8, y: 24 * 16 + 6 },
        { x: 10 * 16 + 8, y: 16 * 16 + 6 },
        { x: 10 * 16 + 8, y: 8 * 16 + 6 }
      ]
    }
  };
  MAPS.manor_parlor = MAPS.grand_manor_interior;

  function getActiveMap() {
    return MAPS[activeMapId] || MAPS.aldenor_exterior;
  }

  // Compatibility exports
  const MAP_W = 32, MAP_H = 26;
  const MAP_PX_W = 512, MAP_PX_H = 416;

  function setMapTile(map, x, y, ground, struct, overhead, solid) {
    if (!map || x < 0 || x >= map.width || y < 0 || y >= map.height) return;
    const idx = y * map.width + x;
    if (ground !== undefined) map.groundLayer[idx] = ground;
    if (struct !== undefined) map.structLayer[idx] = struct;
    if (overhead !== undefined) map.overheadLayer[idx] = overhead;
    if (solid !== undefined) map.collisionMap[idx] = solid;
  }

  function setTile(x, y, ground, struct, overhead, solid) {
    setMapTile(MAPS.aldenor_exterior, x, y, ground, struct, overhead, solid);
  }

  function buildAldenorMap() {
    const m = MAPS.aldenor_exterior;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    // 1. Base terrain: cobblestones across town
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        setMapTile(m, x, y, ((x + y) % 3 === 0) ? 'cobble2' : 'cobble1');
      }
    }

    // 2. Map Boundaries (outer stone walls & fences)
    for (let x = 0; x < m.width; x++) {
      setMapTile(m, x, 0, 'wallBase', 'wallMid', 'roofTile', 1);
      setMapTile(m, x, 1, 'wallBase', 'wallMid', null, 1);
      setMapTile(m, x, m.height - 1, 'wallBase', null, null, 1);
    }
    for (let y = 0; y < m.height; y++) {
      setMapTile(m, 0, y, 'wallBase', 'wallMid', null, 1);
      setMapTile(m, m.width - 1, y, 'wallBase', 'wallMid', null, 1);
    }

    // Northern Bell Tower Spire Sanctum Gate behind Grand Manor (x: 24..25, y: 1)
    const gateOpen = dungeonState.spireGateOpen || (flags.bellForkFound && flags.bellClapperFound && flags.sanctumCrestFound);
    setMapTile(m, 24, 1, 'curb', gateOpen ? null : 'ironFence', null, gateOpen ? 0 : 1);
    setMapTile(m, 25, 1, 'curb', gateOpen ? null : 'portcullis', null, gateOpen ? 0 : 1);

    // 3. Central Fountain Plaza (x: 12..18, y: 10..16) -> 7x7 golden plaza
    for (let py = 10; py <= 16; py++) {
      for (let px = 12; px <= 18; px++) {
        setMapTile(m, px, py, 'plaza', null, null, 0);
      }
    }
    // 3x3 Fountain Basin at (14..16, 12..14) -> exactly 2-tile border all 4 sides!
    for (let fy = 12; fy <= 14; fy++) {
      for (let fx = 14; fx <= 16; fx++) {
        setMapTile(m, fx, fy, 'waterRim', null, null, 1);
      }
    }
    setMapTile(m, 11, 13, 'cobble1', 'bench', null, 1);
    setMapTile(m, 19, 13, 'cobble1', 'bench', null, 1);
    setMapTile(m, 11, 10, 'cobble1', 'lampPost', null, 1);
    setMapTile(m, 19, 10, 'cobble1', 'lampPost', null, 1);
    setMapTile(m, 11, 16, 'cobble1', 'lampPost', null, 1);
    setMapTile(m, 19, 16, 'cobble1', 'lampPost', null, 1);

    setMapTile(m, 10, 12, 'flowers', null, null, 0);
    setMapTile(m, 10, 14, 'flowers1', null, null, 0);
    setMapTile(m, 20, 12, 'flowers2', null, null, 0);
    setMapTile(m, 20, 14, 'flowers', null, null, 0);

    // 4. Northeast Grand Manor (x: 20..30, y: 2..10)
    for (let my = 2; my <= 5; my++) {
      for (let mx = 21; mx <= 29; mx++) {
        if (my === 2) {
          if (mx === 23 || mx === 24 || mx === 25) {
            setMapTile(m, mx, my, 'curb', null, null, 0);
          } else {
            setMapTile(m, mx, my, 'wallBase', 'roofTile', 'roofTile', 1);
          }
        } else if (my === 3) {
          setMapTile(m, mx, my, 'wallBase', 'wallMid', 'roofTile', 1);
        } else if (my === 4) {
          const isWin = (mx === 23 || mx === 27);
          setMapTile(m, mx, my, 'wallBase', isWin ? 'stainedWindow' : 'wallBase', null, 1);
        } else if (my === 5) {
          const isDoor = (mx === 24 || mx === 25);
          setMapTile(m, mx, my, 'carpet', isDoor ? 'oakDoor' : 'wallBase', null, 1);
        }
      }
    }
    // Walkable stone path behind Grand Manor leading to Sanctum Gate (x: 20..23, y: 1)
    for (let ax = 20; ax <= 23; ax++) {
      setMapTile(m, ax, 1, 'cobble1', null, null, 0);
    }
    // Courtyard paver floor & red carpet path
    for (let cy = 6; cy <= 9; cy++) {
      for (let cx = 20; cx <= 30; cx++) {
        const isCarpet = (cx === 24 || cx === 25);
        setMapTile(m, cx, cy, isCarpet ? 'carpet' : 'plaza', null, null, 0);
      }
    }
    // Courtyard Wrought Iron Fence (row 10, cols 20..30)
    for (let fx = 20; fx <= 30; fx++) {
      if (fx === 24 || fx === 25) {
        setMapTile(m, fx, 10, 'carpet', null, null, 0);
      } else if (fx === 23 || fx === 26) {
        setMapTile(m, fx, 10, 'plaza', 'gatePillar', null, 1);
      } else {
        setMapTile(m, fx, 10, 'plaza', 'ironFence', null, 1);
      }
    }
    setMapTile(m, 22, 9, 'plaza', 'lampPost', null, 1);
    setMapTile(m, 27, 9, 'plaza', 'lampPost', null, 1);

    // 4b. Northwest Forge (Goran's Smithy, x: 3..8, y: 2..5)
    for (let fy = 2; fy <= 5; fy++) {
      for (let fx = 3; fx <= 8; fx++) {
        if (fy === 2) setMapTile(m, fx, fy, 'wallBase', 'roofTile', 'roofTile', 1);
        else if (fy === 3) setMapTile(m, fx, fy, 'wallBase', 'timberWall', 'roofTile', 1);
        else if (fy === 4) setMapTile(m, fx, fy, 'wallBase', (fx === 4 || fx === 7) ? 'stainedWindow' : 'timberWall', null, 1);
        else setMapTile(m, fx, fy, 'cobble1', (fx === 5) ? 'oakDoor' : 'timberWall', null, 1);
      }
    }

    // 5. West Market & Apothecary (x: 2..11, y: 8..16)
    for (let ay = 7; ay <= 9; ay++) {
      for (let ax = 3; ax <= 8; ax++) {
        if (ay === 7) setMapTile(m, ax, ay, 'wallBase', 'roofTile', 'roofTile', 1);
        else if (ay === 8) setMapTile(m, ax, ay, 'wallBase', 'timberWall', 'roofTile', 1);
        else setMapTile(m, ax, ay, 'cobble1', (ax === 6) ? 'oakDoor' : 'timberWall', null, 1);
      }
    }
    // One continuous three-tile counter. The old middle tile was walkable and
    // carried an awning, so the hero could stand *inside* the canopy with the
    // canvas painted over his head. A solid counter also keeps the player on
    // the customer side of Lumina's stall instead of behind it.
    setMapTile(m, 5, 12, 'cobble1', 'potionStall', 'awningBlue', 1);
    setMapTile(m, 6, 12, 'cobble1', 'potionStall', 'awningBlue', 1);
    setMapTile(m, 7, 12, 'cobble1', 'potionStall', 'awningBlue', 1);
    setMapTile(m, 8, 12, 'cobble1', 'lampPost', null, 1);

    setMapTile(m, 3, 15, 'cobble1', 'potionStall', 'awningRed', 1);
    setMapTile(m, 4, 15, 'cobble1', 'potionStall', 'awningRed', 1);
    setMapTile(m, 8, 15, 'cobble1', 'potionStall', 'awningRed', 1);
    setMapTile(m, 9, 15, 'cobble1', 'potionStall', 'awningRed', 1);

    // 6. South Tavern & Harbor Gate (x: 4..28, y: 17..24)
    for (let ty = 17; ty <= 20; ty++) {
      for (let tx = 21; tx <= 27; tx++) {
        if (ty === 17) setMapTile(m, tx, ty, 'wallBase', 'roofTile', 'roofTile', 1);
        else if (ty === 18) setMapTile(m, tx, ty, 'wallBase', 'timberWall', 'roofTile', 1);
        else if (ty === 19) setMapTile(m, tx, ty, 'wallBase', (tx === 23 || tx === 25) ? 'stainedWindow' : 'timberWall', null, 1);
        else setMapTile(m, tx, ty, 'cobble1', (tx === 24) ? 'oakDoor' : 'timberWall', null, 1);
      }
    }
    // Exterior Tavern Bounty Board (x: 22, y: 20)
    setMapTile(m, 22, 20, 'cobble1', 'bountyBoard', null, 1);
    for (let gy = 24; gy <= 25; gy++) {
      for (let gx = 14; gx <= 17; gx++) {
        setMapTile(m, gx, gy, 'curb', null, null, 0);
      }
    }
    setMapTile(m, 13, 24, 'curb', 'gatePillar', null, 1);
    setMapTile(m, 18, 24, 'curb', 'gatePillar', null, 1);
    setMapTile(m, 13, 23, 'cobble1', 'lampPost', null, 1);
    setMapTile(m, 18, 23, 'cobble1', 'lampPost', null, 1);
    m.lanterns = [
      { x: 192 + 8, y: 176 + 6 },
      { x: 304 + 8, y: 176 + 6 },
      { x: 192 + 8, y: 240 + 6 },
      { x: 304 + 8, y: 240 + 6 },
      { x: 352 + 8, y: 144 + 6 },
      { x: 432 + 8, y: 144 + 6 },
      { x: 128 + 8, y: 192 + 6 },
      { x: 208 + 8, y: 368 + 6 },
      { x: 288 + 8, y: 368 + 6 }
    ];
    m.hearthPos = null;
  }

  function buildGrandManorInteriorMap() {
    const m = MAPS.grand_manor_interior || MAPS.manor_parlor;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        setMapTile(m, x, y, 'woodFloor', null, null, 0);
      }
    }
    for (let x = 0; x < m.width; x++) {
      setMapTile(m, x, 0, 'wallBase', 'wallMid', 'roofTile', 1);
      setMapTile(m, x, 1, 'wallBase', (x === 4 || x === 11) ? 'stainedWindow' : 'wallMid', null, 1);
    }
    for (let y = 2; y < m.height; y++) {
      setMapTile(m, 0, y, 'wallBase', 'wallMid', null, 1);
      setMapTile(m, m.width - 1, y, 'wallBase', 'wallMid', null, 1);
    }
    for (let x = 0; x < m.width; x++) {
      if (x === 7 || x === 8) {
        setMapTile(m, x, m.height - 2, 'exitMat', null, null, 0);
        setMapTile(m, x, m.height - 1, 'exitMat', null, null, 0);
      } else {
        setMapTile(m, x, m.height - 1, 'wallBase', 'wallMid', null, 1);
      }
    }
    // Royal crimson carpet runner up the center (x = 7..8, y = 3..12)
    for (let cy = 3; cy <= 12; cy++) {
      setMapTile(m, 7, cy, 'carpet', null, null, 0);
      setMapTile(m, 8, cy, 'carpet', null, null, 0);
    }
    // The Cursed Sleeping Lord of Aldenor on grand canopy bed at (7..8, 2..3)
    // surrounded by glowing purple curse crystals until Chapter 5
    setMapTile(m, 7, 2, 'carpet', 'bench', null, 1);
    setMapTile(m, 8, 2, 'carpet', 'bench', null, 1);
    const curseLifted = (typeof flags !== 'undefined' && flags.gameCompleted);
    setMapTile(m, 7, 3, 'carpet', curseLifted ? null : 'saveCrystal', null, curseLifted ? 0 : 1);
    setMapTile(m, 8, 3, 'carpet', curseLifted ? null : 'saveCrystal', null, curseLifted ? 0 : 1);

    // Maid Quarters (Left Wing):
    // Nyah's Futon (x = 2..3, y = 4)
    setMapTile(m, 2, 4, 'woodFloor', 'bench', null, 1);
    setMapTile(m, 3, 4, 'woodFloor', 'bench', null, 1);
    // Fifi's Futon (x = 2..3, y = 7)
    setMapTile(m, 2, 7, 'woodFloor', 'bench', null, 1);
    setMapTile(m, 3, 7, 'woodFloor', 'bench', null, 1);
    // Maid Tea Parlor Table (x = 4, y = 9)
    setMapTile(m, 4, 9, 'woodFloor', 'teaTable', null, 1);

    // Lord's Study (Right Wing):
    // Royal Bookshelves (x = 11..13, y = 2)
    setMapTile(m, 11, 2, 'woodFloor', 'alchemyShelf', null, 1);
    setMapTile(m, 12, 2, 'woodFloor', 'alchemyShelf', null, 1);
    setMapTile(m, 13, 2, 'woodFloor', 'alchemyShelf', null, 1);
    // Grand Manor Chest (x = 13, y = 5)
    setMapTile(m, 13, 5, 'woodFloor', (typeof flags !== 'undefined' && flags.manorChestOpened) ? 'chestOpen' : 'chestClosed', null, 1);

    // Parlor lanterns
    setMapTile(m, 2, 11, 'woodFloor', 'lampPost', null, 1);
    setMapTile(m, 13, 11, 'woodFloor', 'lampPost', null, 1);
    m.lanterns = [
      { x: 2 * 16 + 8, y: 11 * 16 + 6 },
      { x: 13 * 16 + 8, y: 11 * 16 + 6 }
    ];
    m.hearthPos = { x: 7.5 * 16, y: 2.5 * 16 };
  }

  function buildManorParlorMap() {
    buildGrandManorInteriorMap();
  }

  function buildLuminaWorkshopMap() {
    const m = MAPS.lumina_workshop;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        setMapTile(m, x, y, 'woodFloor', null, null, 0);
      }
    }
    for (let x = 0; x < m.width; x++) {
      setMapTile(m, x, 0, 'wallBase', 'timberWall', 'roofTile', 1);
      setMapTile(m, x, 1, 'wallBase', (x === 3 || x === 10) ? 'stainedWindow' : 'timberWall', null, 1);
    }
    for (let y = 2; y < m.height; y++) {
      setMapTile(m, 0, y, 'wallBase', 'timberWall', null, 1);
      setMapTile(m, m.width - 1, y, 'wallBase', 'timberWall', null, 1);
    }
    for (let x = 0; x < m.width; x++) {
      if (x === 6 || x === 7) {
        setMapTile(m, x, m.height - 2, 'exitMat', null, null, 0);
        setMapTile(m, x, m.height - 1, 'exitMat', null, null, 0);
      } else {
        setMapTile(m, x, m.height - 1, 'wallBase', 'timberWall', null, 1);
      }
    }
    [1, 2, 4, 5, 8, 9, 11, 12].forEach(sx => {
      setMapTile(m, sx, 2, 'woodFloor', 'alchemyShelf', null, 1);
    });
    for (let cx = 4; cx <= 9; cx++) {
      setMapTile(m, cx, 5, 'woodFloor', 'potionStall', null, 1);
    }
    setMapTile(m, 1, 8, 'woodFloor', 'tavernBarrel', null, 1);
    setMapTile(m, 2, 8, 'woodFloor', 'tavernBarrel', null, 1);
    setMapTile(m, 11, 8, 'woodFloor', 'tavernBarrel', null, 1);
    setMapTile(m, 12, 8, 'woodFloor', 'tavernBarrel', null, 1);
    setMapTile(m, 2, 4, 'woodFloor', 'lampPost', null, 1);
    setMapTile(m, 11, 4, 'woodFloor', 'lampPost', null, 1);
    m.lanterns = [
      { x: 2 * 16 + 8, y: 4 * 16 + 6 },
      { x: 11 * 16 + 8, y: 4 * 16 + 6 }
    ];
    m.hearthPos = null;
  }

  function buildHarborTavernMap() {
    const m = MAPS.harbor_tavern;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        setMapTile(m, x, y, 'woodFloor', null, null, 0);
      }
    }
    for (let x = 0; x < m.width; x++) {
      setMapTile(m, x, 0, 'wallBase', 'timberWall', 'roofTile', 1);
      setMapTile(m, x, 1, 'wallBase', (x === 3 || x === 7) ? 'stainedWindow' : 'timberWall', null, 1);
    }
    for (let y = 2; y < m.height; y++) {
      setMapTile(m, 0, y, 'wallBase', 'timberWall', null, 1);
      setMapTile(m, m.width - 1, y, 'wallBase', 'timberWall', null, 1);
    }
    for (let x = 0; x < m.width; x++) {
      if (x === 7 || x === 8) {
        setMapTile(m, x, m.height - 2, 'exitMat', null, null, 0);
        setMapTile(m, x, m.height - 1, 'exitMat', null, null, 0);
      } else {
        setMapTile(m, x, m.height - 1, 'wallBase', 'timberWall', null, 1);
      }
    }
    setMapTile(m, 11, 2, 'wallBase', 'hearthFire0', null, 1);
    setMapTile(m, 12, 2, 'wallBase', 'hearthFire0', null, 1);
    for (let bx = 1; bx <= 5; bx++) {
      setMapTile(m, bx, 2, 'woodFloor', 'tavernBarrel', null, 1);
    }
    for (let cx = 2; cx <= 6; cx++) {
      setMapTile(m, cx, 4, 'woodFloor', 'tavernCounter', null, 1);
    }
    setMapTile(m, 3, 8, 'woodFloor', 'teaTable', null, 1);
    setMapTile(m, 2, 8, 'woodFloor', 'bench', null, 1);
    setMapTile(m, 4, 8, 'woodFloor', 'bench', null, 1);

    setMapTile(m, 9, 8, 'woodFloor', 'teaTable', null, 1);
    setMapTile(m, 8, 8, 'woodFloor', 'bench', null, 1);
    setMapTile(m, 10, 8, 'woodFloor', 'bench', null, 1);

    setMapTile(m, 6, 11, 'woodFloor', 'teaTable', null, 1);
    setMapTile(m, 5, 11, 'woodFloor', 'bench', null, 1);
    setMapTile(m, 7, 11, 'woodFloor', 'bench', null, 1);

    setMapTile(m, 1, 12, 'woodFloor', 'lampPost', null, 1);
    setMapTile(m, 14, 12, 'woodFloor', 'lampPost', null, 1);
    m.lanterns = [
      { x: 1 * 16 + 8, y: 12 * 16 + 6 },
      { x: 14 * 16 + 8, y: 12 * 16 + 6 }
    ];
    m.hearthPos = { x: 12 * 16, y: 2.5 * 16 };
  }

  function buildCoastalPlainsMap() {
    const m = MAPS.aldenor_coastal_plains;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        setMapTile(m, x, y, ((x + y * 5) % 9 === 0) ? 'flowers' : 'grass', null, null, 0);
      }
    }

    // North Wall & Harbor Gate (y = 0..2)
    for (let x = 0; x < m.width; x++) {
      if (x >= 14 && x <= 17) {
        setMapTile(m, x, 0, 'curb', null, null, 0);
        setMapTile(m, x, 1, 'curb', null, null, 0);
        setMapTile(m, x, 2, 'curb', null, null, 0);
      } else {
        setMapTile(m, x, 0, 'wallBase', 'wallMid', 'roofTile', 1);
        setMapTile(m, x, 1, 'wallBase', 'wallMid', null, 1);
        setMapTile(m, x, 2, 'wallBase', 'wallMid', null, 1);
      }
    }
    setMapTile(m, 13, 2, 'curb', 'lampPost', null, 1);
    setMapTile(m, 18, 2, 'curb', 'lampPost', null, 1);

    // Cobble path heading south from gate
    for (let y = 3; y <= 6; y++) {
      for (let x = 15; x <= 16; x++) {
        setMapTile(m, x, y, 'curb', null, null, 0);
      }
    }

    // West and East Cliffs & Pine Groves (y = 3..16)
    for (let y = 3; y <= 16; y++) {
      for (let x = 0; x <= 2; x++) {
        const isCliff = (x === 0 || (x === 1 && y % 3 === 0));
        setMapTile(m, x, y, 'grass', isCliff ? 'cliffWall' : 'pineTree', null, 1);
      }
      for (let x = 29; x <= 31; x++) {
        const isCliff = (x === 31 || (x === 30 && y % 3 === 0));
        setMapTile(m, x, y, 'grass', isCliff ? 'cliffWall' : 'pineTree', null, 1);
      }
    }

    // South Shore: Golden Beach, Sea Foam & Deep Sparkling Water (y = 17..23)
    for (let y = 17; y <= 20; y++) {
      for (let x = 0; x < m.width; x++) {
        if (x <= 2 || x >= 29) {
          setMapTile(m, x, y, 'sandTile', 'cliffWall', null, 1);
        } else {
          setMapTile(m, x, y, 'sandTile', null, null, 0);
        }
      }
    }

    // Row 21: Sea foam / waterEdge
    for (let x = 0; x < m.width; x++) {
      if (x <= 2 || x >= 29) {
        setMapTile(m, x, 21, 'sandTile', 'cliffWall', null, 1);
      } else {
        setMapTile(m, x, 21, 'waterEdge', null, null, 0);
      }
    }

    // Rows 22..23: Sparkling deep sea water (solid)
    for (let y = 22; y <= 23; y++) {
      for (let x = 0; x < m.width; x++) {
        setMapTile(m, x, y, 'seaWater', null, null, 1);
      }
    }

    // 3 Dungeon Entrances on Coastal Plains (framed with stone plazas & braziers)
    // 1. West Cliff: Old Quarry Mines (x: 2, y: 8)
    for (let dy = 7; dy <= 9; dy++) {
      for (let dx = 2; dx <= 4; dx++) {
        setMapTile(m, dx, dy, 'curb', null, null, 0);
      }
    }
    setMapTile(m, 2, 7, 'curb', 'cliffWall', null, 1);
    setMapTile(m, 2, 9, 'curb', 'cliffWall', null, 1);
    setMapTile(m, 3, 7, 'curb', 'lampPost', null, 1);
    setMapTile(m, 3, 9, 'curb', 'lampPost', null, 1);
    setMapTile(m, 2, 8, 'curb', 'dungeonPortal', null, 0);

    // 2. East Bluff: Coastal Crypts (x: 29, y: 9)
    for (let dy = 8; dy <= 10; dy++) {
      for (let dx = 27; dx <= 29; dx++) {
        setMapTile(m, dx, dy, 'curb', null, null, 0);
      }
    }
    setMapTile(m, 29, 8, 'curb', 'cliffWall', null, 1);
    setMapTile(m, 29, 10, 'curb', 'cliffWall', null, 1);
    setMapTile(m, 28, 8, 'curb', 'blueBrazier', null, 1);
    setMapTile(m, 28, 10, 'curb', 'blueBrazier', null, 1);
    setMapTile(m, 29, 9, 'curb', 'dungeonPortal', null, 0);

    // 3. South Reef: Sunken Shrine (x: 16, y: 21)
    for (let dx = 15; dx <= 17; dx++) {
      setMapTile(m, dx, 19, 'curb', null, null, 0);
      setMapTile(m, dx, 20, 'curb', null, null, 0);
    }
    setMapTile(m, 15, 20, 'curb', 'blueBrazier', null, 1);
    setMapTile(m, 17, 20, 'curb', 'blueBrazier', null, 1);
    setMapTile(m, 16, 21, 'curb', 'dungeonPortal', null, 0);

    m.lanterns = [
      { x: 13 * 16 + 8, y: 2 * 16 + 6 },
      { x: 18 * 16 + 8, y: 2 * 16 + 6 },
      { x: 3 * 16 + 8, y: 7 * 16 + 6 },
      { x: 3 * 16 + 8, y: 9 * 16 + 6 },
      { x: 28 * 16 + 8, y: 8 * 16 + 6 },
      { x: 28 * 16 + 8, y: 10 * 16 + 6 },
      { x: 15 * 16 + 8, y: 20 * 16 + 6 },
      { x: 17 * 16 + 8, y: 20 * 16 + 6 }
    ];
    m.hearthPos = null;
  }

  function buildGoranForgeMap() {
    const m = MAPS.goran_forge;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        setMapTile(m, x, y, 'woodFloor', null, null, 0);
      }
    }
    for (let x = 0; x < m.width; x++) {
      setMapTile(m, x, 0, 'wallBase', 'timberWall', 'roofTile', 1);
      setMapTile(m, x, 1, 'wallBase', (x === 3 || x === 10) ? 'stainedWindow' : 'timberWall', null, 1);
    }
    for (let y = 2; y < m.height; y++) {
      setMapTile(m, 0, y, 'wallBase', 'timberWall', null, 1);
      setMapTile(m, m.width - 1, y, 'wallBase', 'timberWall', null, 1);
    }
    for (let x = 0; x < m.width; x++) {
      if (x === 6 || x === 7) {
        setMapTile(m, x, m.height - 2, 'exitMat', null, null, 0);
        setMapTile(m, x, m.height - 1, 'exitMat', null, null, 0);
      } else {
        setMapTile(m, x, m.height - 1, 'wallBase', 'timberWall', null, 1);
      }
    }
    // Furnace & Glowing Coals
    setMapTile(m, 3, 2, 'wallBase', 'forgeFurnace', null, 1);
    setMapTile(m, 4, 2, 'wallBase', 'forgeFurnace', null, 1);

    // Blacksmith's Heavy Anvil
    setMapTile(m, 7, 4, 'woodFloor', 'forgeAnvil', null, 1);

    // Weapon Racks & Tool Barrels
    setMapTile(m, 1, 2, 'woodFloor', 'weaponRack', null, 1);
    setMapTile(m, 2, 2, 'woodFloor', 'weaponRack', null, 1);
    setMapTile(m, 11, 2, 'woodFloor', 'weaponRack', null, 1);
    setMapTile(m, 12, 2, 'woodFloor', 'weaponRack', null, 1);

    setMapTile(m, 1, 6, 'woodFloor', 'toolBarrel', null, 1);
    setMapTile(m, 1, 7, 'woodFloor', 'toolBarrel', null, 1);
    setMapTile(m, 12, 6, 'woodFloor', 'toolBarrel', null, 1);
    setMapTile(m, 12, 7, 'woodFloor', 'toolBarrel', null, 1);

    setMapTile(m, 2, 3, 'woodFloor', 'lampPost', null, 1);
    setMapTile(m, 11, 3, 'woodFloor', 'lampPost', null, 1);
    m.lanterns = [
      { x: 2 * 16 + 8, y: 3 * 16 + 6 },
      { x: 11 * 16 + 8, y: 3 * 16 + 6 }
    ];
    m.hearthPos = { x: 4 * 16, y: 2.5 * 16 };
  }

  const dungeonState = {
    // Mines
    minesTrackSwitch1: false,
    minesTrackSwitch2: false,
    minesBarricadeBroken: false,
    minesCartCleared: false,
    minesChestWeapon: false,
    minesChestArmor: false,
    minesChestRibbon: false,
    minesShortcutOpen: false,
    // Crypts
    cryptSkullLevers: [false, false, false],
    cryptPortcullisOpen: false,
    cryptsBraziersLit: false,
    // One entry per brazier, in map order. cryptsBraziersLit is the aggregate:
    // the crypt is dark until every bowl is burning (or the Lich's dawn does it).
    cryptBraziers: [false, false, false, false, false, false, false, false],
    cryptChestFlame: false,
    cryptChestShield: false,
    cryptShortcutOpen: false,
    // Shrine
    shrineWaterLevel: 0, // 0: High, 1: Low
    shrineWaterDrained: false,
    shrineValve1: false,
    shrineValve2: false,
    shrineChestClerici: false,
    shrineChestArmor: false,
    shrineChestCloak: false,
    shrineShortcutOpen: false,
    // Spire
    spireGateOpen: false
  };

  function buildDungeonMinesMap() {
    const m = MAPS.dungeon_mines;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        setMapTile(m, x, y, 'minesFloor', null, null, 0);
      }
    }
    // Boundaries
    for (let x = 0; x < m.width; x++) {
      setMapTile(m, x, 0, 'minesWall', null, null, 1);
      setMapTile(m, x, m.height - 1, 'minesWall', null, null, 1);
    }
    for (let y = 0; y < m.height; y++) {
      setMapTile(m, 0, y, 'minesWall', null, null, 1);
      setMapTile(m, m.width - 1, y, 'minesWall', null, null, 1);
    }
    // Dividers (passages use floor groundTile so doorways never draw wall tiles!)
    for (let y = 0; y < m.height; y++) {
      const isPassage = (y >= 8 && y <= 9) || (y >= 23 && y <= 24);
      setMapTile(m, 17, y, isPassage ? 'minesFloor' : 'minesWall', isPassage ? null : 'minesWall', null, isPassage ? 0 : 1);
      setMapTile(m, 18, y, isPassage ? 'minesFloor' : 'minesWall', isPassage ? null : 'minesWall', null, isPassage ? 0 : 1);
    }
    for (let x = 0; x < m.width; x++) {
      const isPassage = (x >= 7 && x <= 9) || (x >= 26 && x <= 27);
      setMapTile(m, x, 15, isPassage ? 'minesFloor' : 'minesWall', isPassage ? null : 'minesWall', null, isPassage ? 0 : 1);
      setMapTile(m, x, 16, isPassage ? 'minesFloor' : 'minesWall', isPassage ? null : 'minesWall', null, isPassage ? 0 : 1);
    }

    // Quad A
    setMapTile(m, 8, 30, 'exitMat', 'dungeonPortal', null, 0);
    for (let y = 17; y <= 29; y++) {
      setMapTile(m, 8, y, 'minesFloor', 'trackRails', null, 0);
    }
    // The cart rides the whole x = 8 column, so the divider doorway needs rails
    // too. Ground only: the passage stays walkable and the divider is untouched.
    setMapTile(m, 8, 15, 'trackRails', null, null, 0);
    setMapTile(m, 8, 16, 'trackRails', null, null, 0);
    setMapTile(m, 17, 23, 'minesFloor', dungeonState.minesShortcutOpen ? null : 'portcullis', null, dungeonState.minesShortcutOpen ? 0 : 1);
    setMapTile(m, 18, 23, 'minesFloor', dungeonState.minesShortcutOpen ? null : 'portcullis', null, dungeonState.minesShortcutOpen ? 0 : 1);
    setMapTile(m, 17, 24, 'minesFloor', dungeonState.minesShortcutOpen ? null : 'portcullis', null, dungeonState.minesShortcutOpen ? 0 : 1);
    setMapTile(m, 18, 24, 'minesFloor', dungeonState.minesShortcutOpen ? null : 'portcullis', null, dungeonState.minesShortcutOpen ? 0 : 1);

    // Quad B
    for (let y = 2; y <= 14; y++) {
      setMapTile(m, 8, y, 'minesFloor', 'trackRails', null, 0);
    }
    setMapTile(m, 6, 8, 'minesFloor', 'trackSwitch', null, 0);
    setMapTile(m, 12, 4, 'minesFloor', 'trackSwitch', null, 0);
    if (!dungeonState.minesBarricadeBroken) {
      setMapTile(m, 8, 5, 'minesFloor', 'woodBarricade', null, 1);
    }
    setMapTile(m, 8, 2, 'minesFloor', dungeonState.minesChestWeapon ? 'chestOpen' : 'chestClosed', null, 1);
    setMapTile(m, 14, 3, 'minesFloor', 'crackedWall', null, 0);
    setMapTile(m, 15, 3, 'minesFloor', dungeonState.minesChestArmor ? 'chestOpen' : 'chestClosed', null, 1);
    setMapTile(m, 14, 8, 'minesFloor', dungeonState.minesChestRibbon ? 'chestOpen' : 'chestClosed', null, 1);

    // Quad C
    setMapTile(m, 20, 23, 'minesFloor', 'trackSwitch', null, 0);
    setMapTile(m, 26, 25, 'minesFloor', 'saveCrystal', null, 0);
    const minesGateOpen = dungeonState.minesCartCleared || (dungeonState.minesTrackSwitch1 && dungeonState.minesTrackSwitch2);
    setBossGateTiles(m, minesGateOpen, 'minesFloor');

    // Quad D
    setMapTile(m, 26, 2, 'minesFloor', flags.bellForkFound ? 'bench' : 'teaTable', null, 1);
    setMapTile(m, 32, 12, 'minesFloor', 'dungeonPortal', null, 0);
  }

  function buildDungeonCryptsMap() {
    const m = MAPS.dungeon_crypts;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        setMapTile(m, x, y, 'cryptsFloor', null, null, 0);
      }
    }
    for (let x = 0; x < m.width; x++) {
      setMapTile(m, x, 0, 'cryptsWall', null, null, 1);
      setMapTile(m, x, m.height - 1, 'cryptsWall', null, null, 1);
    }
    for (let y = 0; y < m.height; y++) {
      setMapTile(m, 0, y, 'cryptsWall', null, null, 1);
      setMapTile(m, m.width - 1, y, 'cryptsWall', null, null, 1);
    }
    for (let y = 0; y < m.height; y++) {
      const isPassage = (y >= 8 && y <= 9) || (y >= 23 && y <= 24);
      setMapTile(m, 17, y, isPassage ? 'cryptsFloor' : 'cryptsWall', isPassage ? null : 'cryptsWall', null, isPassage ? 0 : 1);
      setMapTile(m, 18, y, isPassage ? 'cryptsFloor' : 'cryptsWall', isPassage ? null : 'cryptsWall', null, isPassage ? 0 : 1);
    }
    for (let x = 0; x < m.width; x++) {
      const isPassage = (x >= 7 && x <= 9) || (x >= 26 && x <= 27);
      setMapTile(m, x, 15, isPassage ? 'cryptsFloor' : 'cryptsWall', isPassage ? null : 'cryptsWall', null, isPassage ? 0 : 1);
      setMapTile(m, x, 16, isPassage ? 'cryptsFloor' : 'cryptsWall', isPassage ? null : 'cryptsWall', null, isPassage ? 0 : 1);
    }

    // Quad A
    setMapTile(m, 8, 30, 'exitMat', 'dungeonPortal', null, 0);
    setMapTile(m, 4, 20, 'cryptsFloor', dungeonState.cryptSkullLevers[0] ? 'skullLever1' : 'skullLever0', null, 0);
    setMapTile(m, 17, 23, 'cryptsFloor', dungeonState.cryptShortcutOpen ? null : 'portcullis', null, dungeonState.cryptShortcutOpen ? 0 : 1);
    setMapTile(m, 18, 23, 'cryptsFloor', dungeonState.cryptShortcutOpen ? null : 'portcullis', null, dungeonState.cryptShortcutOpen ? 0 : 1);
    setMapTile(m, 17, 24, 'cryptsFloor', dungeonState.cryptShortcutOpen ? null : 'portcullis', null, dungeonState.cryptShortcutOpen ? 0 : 1);
    setMapTile(m, 18, 24, 'cryptsFloor', dungeonState.cryptShortcutOpen ? null : 'portcullis', null, dungeonState.cryptShortcutOpen ? 0 : 1);

    // Quad B
    setMapTile(m, 14, 4, 'cryptsFloor', dungeonState.cryptSkullLevers[1] ? 'skullLever1' : 'skullLever0', null, 0);
    setMapTile(m, 8, 2, 'cryptsFloor', 'crackedWall', null, 0);
    setMapTile(m, 8, 1, 'cryptsFloor', dungeonState.cryptChestFlame ? 'chestOpen' : 'chestClosed', null, 1);
    setMapTile(m, 3, 8, 'cryptsFloor', dungeonState.cryptChestShield ? 'chestOpen' : 'chestClosed', null, 1);

    // Quad C
    setMapTile(m, 32, 20, 'cryptsFloor', dungeonState.cryptSkullLevers[2] ? 'skullLever1' : 'skullLever0', null, 0);
    setMapTile(m, 20, 23, 'cryptsFloor', 'trackSwitch', null, 0);
    setMapTile(m, 26, 25, 'cryptsFloor', 'saveCrystal', null, 0);

    // Brazier circuit. The crypt is unlit until these bowls are kindled; the
    // positions are spread so every ACCESSIBLE quadrant has a safe pool of
    // light. None may sit inside the boss sanctum: the gate seals that quadrant
    // until the skull levers are pulled, so an eight-of-eight run would be
    // impossible if two bowls were behind it. Index order is the save order.
    const cryptBrazierSpots = [
      [4, 4], [12, 4], [10, 20], [30, 20],
      [5, 26], [13, 24], [22, 22], [24, 26]
    ];
    m.braziers = [];
    cryptBrazierSpots.forEach(([bx, by], i) => {
      const lit = !!dungeonState.cryptBraziers[i];
      setMapTile(m, bx, by, 'cryptsFloor', lit ? 'blueBrazier' : 'brazierDark', null, 1);
      m.braziers.push({ x: bx, y: by, lit });
    });
    const cryptGateOpen = dungeonState.cryptPortcullisOpen || (dungeonState.cryptSkullLevers[0] && dungeonState.cryptSkullLevers[1] && dungeonState.cryptSkullLevers[2]);
    setBossGateTiles(m, cryptGateOpen, 'cryptsFloor');

    // Quad D
    setMapTile(m, 26, 2, 'cryptsFloor', flags.bellClapperFound ? 'bench' : 'teaTable', null, 1);
    setMapTile(m, 32, 12, 'cryptsFloor', 'dungeonPortal', null, 0);
  }

  function buildDungeonShrineMap() {
    const m = MAPS.dungeon_shrine;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    // Water level is a real collision state, not just a recolour. These five
    // basins are the shrine's low ground: at high water they are deep and
    // impassable; valve 1 lowers them to walkable shallows; draining turns them
    // into dry floor. They sit in the middle of the rooms with a dry perimeter,
    // so the recess can never seal a valve, chest, save crystal or passage.
    const shrineWater = dungeonState.shrineWaterDrained ? 2 : (dungeonState.shrineWaterLevel ? 1 : 0);
    const shrineBasins = [
      [8, 8, 3, 3], [3, 20, 3, 3], [11, 26, 3, 3],
      [22, 19, 3, 3], [31, 26, 3, 3]
    ];
    const inBasin = (x, y) => shrineBasins.some(([bx, by, bw, bh]) =>
      x >= bx && x < bx + bw && y >= by && y < by + bh);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        if (!inBasin(x, y) || shrineWater === 2) {
          setMapTile(m, x, y, 'shrineFloor', null, null, 0);
        } else if (shrineWater === 1) {
          setMapTile(m, x, y, 'shallowWater', null, null, 0);
        } else {
          setMapTile(m, x, y, 'seaWater', null, null, 1);
        }
      }
    }
    for (let x = 0; x < m.width; x++) {
      setMapTile(m, x, 0, 'shrineWall', null, null, 1);
      setMapTile(m, x, m.height - 1, 'shrineWall', null, null, 1);
    }
    for (let y = 0; y < m.height; y++) {
      setMapTile(m, 0, y, 'shrineWall', null, null, 1);
      setMapTile(m, m.width - 1, y, 'shrineWall', null, null, 1);
    }
    for (let y = 0; y < m.height; y++) {
      const isPassage = (y >= 8 && y <= 9) || (y >= 23 && y <= 24);
      setMapTile(m, 17, y, isPassage ? 'shrineFloor' : 'shrineWall', isPassage ? null : 'shrineWall', null, isPassage ? 0 : 1);
      setMapTile(m, 18, y, isPassage ? 'shrineFloor' : 'shrineWall', isPassage ? null : 'shrineWall', null, isPassage ? 0 : 1);
    }
    for (let x = 0; x < m.width; x++) {
      const isPassage = (x >= 7 && x <= 9) || (x >= 26 && x <= 27);
      setMapTile(m, x, 15, isPassage ? 'shrineFloor' : 'shrineWall', isPassage ? null : 'shrineWall', null, isPassage ? 0 : 1);
      setMapTile(m, x, 16, isPassage ? 'shrineFloor' : 'shrineWall', isPassage ? null : 'shrineWall', null, isPassage ? 0 : 1);
    }

    // Quad A
    setMapTile(m, 8, 30, 'exitMat', 'dungeonPortal', null, 0);
    setMapTile(m, 17, 23, 'shrineFloor', dungeonState.shrineShortcutOpen ? null : 'portcullis', null, dungeonState.shrineShortcutOpen ? 0 : 1);
    setMapTile(m, 18, 23, 'shrineFloor', dungeonState.shrineShortcutOpen ? null : 'portcullis', null, dungeonState.shrineShortcutOpen ? 0 : 1);
    setMapTile(m, 17, 24, 'shrineFloor', dungeonState.shrineShortcutOpen ? null : 'portcullis', null, dungeonState.shrineShortcutOpen ? 0 : 1);
    setMapTile(m, 18, 24, 'shrineFloor', dungeonState.shrineShortcutOpen ? null : 'portcullis', null, dungeonState.shrineShortcutOpen ? 0 : 1);

    // Quad B
    setMapTile(m, 6, 6, dungeonState.shrineWaterDrained ? 'shrineFloor' : 'shallowWater', 'sluiceValve', null, 1);
    setMapTile(m, 4, 2, 'shrineFloor', dungeonState.shrineChestClerici ? 'chestOpen' : 'chestClosed', null, 1);
    setMapTile(m, 12, 2, 'shrineFloor', dungeonState.shrineChestCloak ? 'chestOpen' : 'chestClosed', null, 1);

    // Quad C
    setMapTile(m, 30, 22, dungeonState.shrineWaterDrained ? 'shrineFloor' : 'shallowWater', 'sluiceValve', null, 1);
    setMapTile(m, 20, 23, 'shrineFloor', 'trackSwitch', null, 0);
    setMapTile(m, 26, 25, 'shrineFloor', 'saveCrystal', null, 0);
    // Valve 1 only lowers the water enough for the shortcut; the sanctum gate
    // needs both valves. `shrineWaterLevel === 1` is just valve 1 again, and
    // treating it as an open gate let the boss be reached without the puzzle.
    const shrineGateOpen = dungeonState.shrineWaterDrained || (dungeonState.shrineValve1 && dungeonState.shrineValve2);
    setBossGateTiles(m, shrineGateOpen, 'shrineFloor');

    // Quad D
    for (let dy = 4; dy <= 10; dy++) {
      for (let dx = 23; dx <= 29; dx++) {
        setMapTile(m, dx, dy, 'seaWater', null, null, 0);
      }
    }
    setMapTile(m, 26, 2, 'shrineFloor', flags.sanctumCrestFound ? 'bench' : 'teaTable', null, 1);
    setMapTile(m, 32, 12, 'shrineFloor', 'dungeonPortal', null, 0);
  }

  function buildBellSpireMap() {
    const m = MAPS.bell_spire;
    m.structLayer.fill(null);
    m.overheadLayer.fill(null);
    m.collisionMap.fill(0);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        const isWall = (x <= 1 || x >= m.width - 2);
        setMapTile(m, x, y, isWall ? 'spireWall' : 'spireFloor', isWall ? 'spireWall' : null, null, isWall ? 1 : 0);
      }
    }
    for (let x = 0; x < m.width; x++) {
      setMapTile(m, x, 0, 'spireWall', null, null, 1);
    }
    setMapTile(m, 9, 27, 'exitMat', 'dungeonPortal', null, 0);
    setMapTile(m, 10, 27, 'exitMat', 'dungeonPortal', null, 0);

    // Save Crystal at base of Spire staircase
    setMapTile(m, 5, 24, 'spireFloor', 'saveCrystal', null, 0);
    setMapTile(m, 4, 24, 'spireFloor', 'blueBrazier', null, 1);
    setMapTile(m, 6, 24, 'spireFloor', 'blueBrazier', null, 1);

    // Staircase Torches & Braziers
    setMapTile(m, 3, 18, 'spireFloor', 'blueBrazier', null, 1);
    setMapTile(m, 16, 18, 'spireFloor', 'blueBrazier', null, 1);
    setMapTile(m, 3, 11, 'spireFloor', 'blueBrazier', null, 1);
    setMapTile(m, 16, 11, 'spireFloor', 'blueBrazier', null, 1);

    // Great Bronze Bell at Belfry Summit
    setMapTile(m, 9, 2, 'spireFloor', 'greatBell', null, 1);
    setMapTile(m, 10, 2, 'spireFloor', 'greatBell', null, 1);

    // Balcony Bench (Post-Game)
    if (flags.gameCompleted) {
      setMapTile(m, 15, 3, 'spireFloor', 'bench', null, 1);
    }
  }

  // Every dungeon hides its boss in the TOP-RIGHT quadrant. That quadrant has
  // two entrances: the west passage (17..18, 8..9) and the south 2x2 portcullis
  // (26..27, 15..16). The old code sealed only the south side, so the boss could
  // be reached from the west passage without solving the dungeon puzzle, and the
  // 2x2 "sanctum" gate was decorative. Both entrances share one gate state now.
  const BOSS_GATE_TILES = [[17, 8], [18, 8], [17, 9], [18, 9], [26, 15], [27, 15], [26, 16], [27, 16]];

  function setBossGateTiles(map, open, groundTile) {
    if (!map) return;
    BOSS_GATE_TILES.forEach(([x, y]) => {
      setMapTile(map, x, y, groundTile, open ? null : 'portcullis', null, open ? 0 : 1);
    });
  }
  window.setBossGateTiles = setBossGateTiles;

  function buildAllMaps() {
    buildAldenorMap();
    buildManorParlorMap();
    buildLuminaWorkshopMap();
    buildHarborTavernMap();
    buildCoastalPlainsMap();
    buildGoranForgeMap();
    buildDungeonMinesMap();
    buildDungeonCryptsMap();
    buildDungeonShrineMap();
    buildBellSpireMap();
  }

  window.MAPS = MAPS;
  window.getActiveMap = getActiveMap;
  window.buildAllMaps = buildAllMaps;
  window.setMapTile = setMapTile;
  window.dungeonState = dungeonState;
  // =========================================================================
