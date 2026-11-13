// Headless Chrome CDP Verification for both index.html and retronyah_standalone.html
// Uses Node 24 built-in http, fetch, and WebSocket; zero third-party deps.
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No headless Chromium/Edge binary found');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json'
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }
      const rel = (urlPath === '/') ? 'index.html' : urlPath.replace(/^\/+/, '');
      const full = path.resolve(ROOT, rel);
      if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(full).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      } else if (data.method) {
        this.events.push(data);
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    try { this.ws.close(); } catch {}
  }
}

async function launchChrome() {
  const bin = findChrome();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aldenor-cdp-'));
  const proc = spawn(bin, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const port = await new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (m) {
        proc.stderr.off('data', onData);
        resolve(Number(m[1]));
      }
    };
    proc.stderr.on('data', onData);
    proc.on('exit', (code) => reject(new Error(`Chrome exited early (${code}): ${buf}`)));
  });

  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  const page = targets.find(t => t.type === 'page') || targets[0];
  const client = new CdpClient(page.webSocketDebuggerUrl);
  await client.ready;
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable');
  await client.send('Network.enable');

  return {
    client,
    cleanup() {
      client.close();
      try { proc.kill('SIGKILL'); } catch {}
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
    }
  };
}

async function testEntry(client, url, label) {
  const results = [];
  const push = (name, ok, detail = '') => results.push({ name: `[${label}] ${name}`, ok, detail });

  client.events.length = 0;
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await client.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 900));

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  for (const ev of client.events) {
    if (ev.method === 'Runtime.exceptionThrown') {
      pageErrors.push(ev.params.exceptionDetails.text || 'uncaught exception');
    } else if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') {
      consoleErrors.push(ev.params.args.map(a => a.value ?? a.description).join(' '));
    } else if (ev.method === 'Network.responseReceived' && ev.params.response.status >= 400) {
      failedRequests.push(`${ev.params.response.status} ${ev.params.response.url}`);
    }
  }
  push('boot: zero console/page/network errors', consoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0,
    JSON.stringify({ consoleErrors, pageErrors, failedRequests }));

  // Verify canvas rendered non-blank pixels & starts game cleanly
  const startInfo = await client.eval(`(() => {
    if (typeof introCinemaState !== 'undefined') introCinemaState.active = false;
    titleScreenState.active = true;
    localStorage.setItem('aldenor_intro_watched', '1');
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 100));

  // Press Space on title screen to start New Game
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Space', key: ' ', windowsVirtualKeyCode: 32 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ', windowsVirtualKeyCode: 32 });
  await new Promise(r => setTimeout(r, 300));

  const gameState = await client.eval(`(() => {
    const cvs = document.getElementById('gameCanvas');
    const cctx = cvs.getContext('2d');
    const img = cctx.getImageData(0, 0, cvs.width, cvs.height).data;
    let nonBlack = 0;
    for (let i = 0; i < img.length; i += 4) {
      if (img[i] > 10 || img[i + 1] > 10 || img[i + 2] > 10) nonBlack++;
    }
    return {
      titleActive: titleScreenState.active,
      map: YsEngine.getActiveMapId(),
      nonBlack,
      overflowDesktop: document.documentElement.scrollWidth > window.innerWidth
    };
  })()`);
  push('gameplay: start new game & canvas non-blank without overflow',
    gameState.titleActive === false && gameState.nonBlack > 1000 && !gameState.overflowDesktop,
    JSON.stringify(gameState));

  // Mobile responsive viewports check (390x844 and 320x640)
  for (const [mw, mh] of [[390, 844], [320, 640]]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width: mw, height: mh, deviceScaleFactor: 2, mobile: true });
    await new Promise(r => setTimeout(r, 150));
    const mob = await client.eval(`(() => {
      const cvs = document.getElementById('gameCanvas');
      const rect = cvs.getBoundingClientRect();
      return {
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        cw: Math.round(rect.width),
        ch: Math.round(rect.height)
      };
    })()`);
    push(`responsive: ${mw}x${mh} zero horizontal overflow & visible canvas`,
      mob.scrollW <= mob.innerW && mob.cw > 100 && mob.ch > 80,
      JSON.stringify(mob));
  }
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 120));

  // Ensure any opening dialogue/transition is cleared before probing live inputs
  await client.eval(`(() => {
    if (dialogueState.active) closeDialogue();
    transitionState.active = false;
    titleScreenState.active = false;
    introCinemaState.active = false;
  })()`);

  // Probe: KeyM repeat (odd count = 3 repeats) does not strobe mute
  const muteRepeat = await client.eval(`(() => {
    const startMuted = YsEngine.isMuted();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', key: 'm', repeat: false }));
    const afterTap = YsEngine.isMuted();
    for (let i = 0; i < 3; i++) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', key: 'm', repeat: true }));
    }
    const afterRepeats = YsEngine.isMuted();
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyM', key: 'm' }));
    if (YsEngine.isMuted() !== startMuted) toggleMute();
    return { startMuted, afterTap, afterRepeats };
  })()`);
  push('input: KeyM key-repeat does not toggle mute repeatedly',
    muteRepeat.afterTap !== muteRepeat.startMuted && muteRepeat.afterRepeats === muteRepeat.afterTap,
    JSON.stringify(muteRepeat));

  // Probe: window blur clears stuck movement keys
  const blurClear = await client.eval(`(() => {
    const xBefore = hero.x;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight' }));
    window.dispatchEvent(new Event('blur'));
    update(0.1);
    return { xBefore, xAfter: hero.x };
  })()`);
  push('input: window blur clears stuck keysDown',
    blurClear.xAfter === blurClear.xBefore,
    JSON.stringify(blurClear));

  // Probe: dialogueLogState blocks KeyI / button from opening StatusMenu underneath
  const logOverlay = await client.eval(`(() => {
    statusMenuState.open = false;
    const openedLog = toggleDialogueLog(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', key: 'i' }));
    const leakedViaKey = statusMenuState.open;
    statusMenuState.open = false;
    document.getElementById('btnStatus').click();
    const leakedViaBtn = statusMenuState.open;
    toggleDialogueLog(false);
    return { openedLog, leakedViaKey, leakedViaBtn };
  })()`);
  push('ui: dialogueLogState blocks KeyI and MENU button from opening Status Menu underneath',
    logOverlay.openedLog === true && logOverlay.leakedViaKey === false && logOverlay.leakedViaBtn === false,
    JSON.stringify(logOverlay));

  // Probe: VU meter DOM node identity churn across frames
  const vuChurn = await client.eval(`(() => {
    const segBefore = document.getElementById('vuBar0').children[0] || null;
    update(0.016);
    updateVuMeterHud();
    const segAfter = document.getElementById('vuBar0').children[0] || null;
    return { hadSeg: !!segBefore, sameNode: segBefore !== null && segBefore === segAfter };
  })()`);
  push('perf: updateVuMeterHud reuses segment DOM nodes (zero churn)',
    vuChurn.hadSeg && vuChurn.sameNode,
    JSON.stringify(vuChurn));

  // Probe: returnToTitleScreen clears #glLightCanvas overlay (synchronous draw check + clear check)
  const glCleared = await client.eval(`(() => {
    setTimeOfDay(true, { silent: true });
    renderFrame(document.getElementById('gameCanvas').getContext('2d'));
    const readLightNonZero = () => {
      const glCanvas = document.getElementById('glLightCanvas');
      const tmp = document.createElement('canvas');
      tmp.width = 256; tmp.height = 224;
      const tctx = tmp.getContext('2d');
      tctx.drawImage(glCanvas, 0, 0);
      const data = tctx.getImageData(0, 0, 256, 224).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 2 || data[i+1] > 2 || data[i+2] > 2) nonZero++;
      }
      return nonZero;
    };
    const beforeReturn = readLightNonZero();
    returnToTitleScreen();
    const afterReturn = readLightNonZero();
    return { beforeReturn, afterReturn };
  })()`);
  push('render: returnToTitleScreen clears #glLightCanvas lighting overlay',
    glCleared.beforeReturn > 0 && glCleared.afterReturn === 0,
    JSON.stringify(glCleared));

  return results;
}

(async () => {
  const { server, port } = await startStaticServer();
  const chrome = await launchChrome();
  const all = [];
  try {
    all.push(...await testEntry(chrome.client, `http://127.0.0.1:${port}/index.html`, 'index.html'));
    all.push(...await testEntry(chrome.client, `http://127.0.0.1:${port}/retronyah_standalone.html`, 'standalone.html'));
  } finally {
    chrome.cleanup();
    server.close();
  }

  let failed = 0;
  for (const r of all) {
    console.log(`${r.ok ? '[PASS]' : '[FAIL]'} ${r.name}${r.ok ? '' : ' -> ' + r.detail}`);
    if (!r.ok) failed++;
  }
  console.log(`\nBrowser Summary: ${all.length - failed}/${all.length} passed (${failed} failed).`);
  process.exit(failed > 0 ? 1 : 0);
})();
