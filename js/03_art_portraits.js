// 03_art_portraits.js (V5 High-Craft 64x64 PC-Engine CD Anime Portraits & Event CGs)
const portraitCache = {};

const SEAGULL_PORTRAIT_BASE = [
  "00000000000000000000000000000000", "00000000000000000000000000000000",
  "00000000000011111100000000000000", "00000000000188888810000000000000",
  "00000000001888888881000000000000", "00000000018888888888100000000000",
  "00000000188811888888811110000000", "0000000018818818888881AAA1000000",
  "0000000018811118888881AAAA100000", "000000001888118888881AAAAAA10000",
  "000000001888888888881AAAAAAA1000", "000000000188888888881111AAAA1000",
  "00000000001888888888888111110000", "00000000000188888888888100000000",
  "00000000001888888888888810000000", "00000000018888888888888881000000",
  "00000000199888888888888888100000", "00000001999988888888888888100000",
  "00000019999998888888888888810000", "00000199999999888888888888810000",
  "00000199999999888888888888810000", "00001999999999988888888888881000",
  "00001999999999988888888888881000", "00001999999999988888888888881000",
  "00000199999999888888888888810000", "00000019999998888888888888810000",
  "00000001111118888888888888100000", "00000000000001111188888811000000",
  "00000000000000000111111100000000", "00000000000000000000000000000000",
  "00000000000000000000000000000000", "00000000000000000000000000000000"
];

function drawEmoteBadge(ctx, type) {
  if (type === 'jealous' || type === 'bratty' || type === 'angry') {
    // 90s Anime Crimson Anger Vein (💢) in top-right corner
    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(49, 4, 11, 11);
    ctx.fillStyle = vceColor(7, 1, 1);
    ctx.fillRect(50, 5, 3, 4); ctx.fillRect(56, 5, 3, 4);
    ctx.fillRect(50, 10, 3, 4); ctx.fillRect(56, 10, 3, 4);
    ctx.fillStyle = vceColor(7, 7, 7);
    ctx.fillRect(52, 7, 1, 2); ctx.fillRect(56, 7, 1, 2);
    ctx.fillRect(52, 10, 1, 2); ctx.fillRect(56, 10, 1, 2);
  } else if (type === 'flustered') {
    // Rosy cheek blush slash marks + floating pink heart
    ctx.fillStyle = 'rgba(255, 105, 135, 0.55)';
    ctx.fillRect(18, 33, 7, 3);
    ctx.fillRect(31, 33, 8, 3);
    ctx.fillStyle = vceColor(7, 3, 5);
    ctx.fillRect(51, 6, 3, 2); ctx.fillRect(55, 6, 3, 2);
    ctx.fillRect(50, 8, 9, 2);
    ctx.fillRect(52, 10, 5, 2);
    ctx.fillRect(54, 12, 1, 2);
  } else if (type === 'panicked' || type === 'shy') {
    // Anime Sweatdrop (💧) in top-right corner
    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(52, 5, 7, 11);
    ctx.fillStyle = vceColor(3, 6, 7);
    ctx.fillRect(54, 6, 3, 3);
    ctx.fillRect(53, 9, 5, 5);
    ctx.fillStyle = vceColor(7, 7, 7);
    ctx.fillRect(54, 10, 2, 2);
  } else if (type === 'shocked') {
    // Double Exclamation (!!)
    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(50, 4, 9, 12);
    ctx.fillStyle = vceColor(7, 6, 1);
    ctx.fillRect(51, 5, 2, 6); ctx.fillRect(51, 13, 2, 2);
    ctx.fillRect(56, 5, 2, 6); ctx.fillRect(56, 13, 2, 2);
  } else if (type === 'smug' || type === 'happy' || type === 'teasing' || type === 'tender') {
    // Golden Starlight Sparkle (✦)
    ctx.fillStyle = vceColor(7, 6, 1);
    ctx.fillRect(54, 5, 1, 9);
    ctx.fillRect(50, 9, 9, 1);
    ctx.fillStyle = vceColor(7, 7, 7);
    ctx.fillRect(53, 8, 3, 3);
  }
}

function drawV5Portrait(v5Key, expression, mouthOpen, blink, earShift) {
  const mouthFrame = mouthOpen ? 1 : 0;
  const cacheKey = `${v5Key}_${expression}_${mouthFrame}`;
  if (portraitCache[cacheKey]) return portraitCache[cacheKey];

  const src = (typeof window.getV5Canvas === 'function')
    ? window.getV5Canvas(v5Key)
    : null;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = vceColor(0, 0, 1);
  ctx.fillRect(0, 0, 64, 64);

  if (src) {
    const bounceY = (mouthFrame === 1) ? -1 : 0;
    ctx.drawImage(src, 0, bounceY);
    drawEmoteBadge(ctx, expression);
  }

  portraitCache[cacheKey] = c;
  return c;
}

const buildDecoratedPortrait = drawV5Portrait;
window.drawV5Portrait = drawV5Portrait;
window.buildDecoratedPortrait = buildDecoratedPortrait;

function renderNyahPortrait(expression = 'smug', mouthOpen = false, blink = false, earTwitch = false) {
  return buildDecoratedPortrait('portrait_nyah', expression, mouthOpen, blink, earTwitch);
}

function renderFifiPortrait(expression = 'bashful', mouthOpen = false, blink = false, earFlop = false) {
  const v5Key = (expression === 'tea') ? 'portrait_fifi_tea' : 'portrait_fifi';
  return buildDecoratedPortrait(v5Key, expression, mouthOpen, blink, earFlop);
}

function renderLuminaPortrait(expression = 'friendly', mouthOpen = false, blink = false) {
  return buildDecoratedPortrait('portrait_lumina', expression, mouthOpen, blink, false);
}

function renderNpcPortrait(type = 'elder', mouthOpen = false) {
  if (type === 'fifi') return renderFifiPortrait('bashful', mouthOpen, false, false);
  if (type === 'seagull') {
    if (portraitCache['seagull']) return portraitCache['seagull'];
    const c32 = document.createElement('canvas');
    c32.width = 32; c32.height = 32;
    const ctx32 = c32.getContext('2d');
    for (let y = 0; y < 32; y++) {
      const r = SEAGULL_PORTRAIT_BASE[y];
      for (let x = 0; x < 32; x++) {
        const ch = r[x];
        if (ch === '1') ctx32.fillStyle = vceColor(1,1,2);
        else if (ch === '8') ctx32.fillStyle = vceColor(7,7,7);
        else if (ch === '9') ctx32.fillStyle = vceColor(5,5,6);
        else if (ch === 'A') ctx32.fillStyle = vceColor(7,6,1);
        else ctx32.fillStyle = vceColor(0,0,2);
        ctx32.fillRect(x, y, 1, 1);
      }
    }
    const c64 = document.createElement('canvas');
    c64.width = 64; c64.height = 64;
    const ctx64 = c64.getContext('2d');
    ctx64.imageSmoothingEnabled = false;
    ctx64.drawImage(c32, 0, 0, 64, 64);
    portraitCache['seagull'] = c64;
    return c64;
  }
  return buildDecoratedPortrait('portrait_' + type, 'friendly', mouthOpen, false, false);
}

function renderEventCg(cgId) {
  if (!cgId) return null;
  if (typeof window.getV5Canvas === 'function') {
    const key = cgId.startsWith('cg_') ? cgId : 'cg_' + cgId;
    return window.getV5Canvas(key);
  }
  return null;
}

function drawManorEventCG(ctx, cgId, x = 80, y = 14) {
  const cgCanvas = renderEventCg(cgId);
  if (!cgCanvas) return;
  ctx.save();
  // Outer dark navy shadow & gold PC-Engine CD border around 160x112 CG
  ctx.fillStyle = '#080818';
  ctx.fillRect(x - 4, y - 4, 168, 120);
  ctx.strokeStyle = '#f8d850';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 3, y - 3, 166, 118);
  ctx.strokeStyle = '#906820';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 1, y - 1, 162, 114);
  ctx.drawImage(cgCanvas, x, y, 160, 112);
  ctx.restore();
}

