// 06_engine_and_ui.js (Modularized from index.html)
  // SECTION 9: Particles, Camera & 3-Pass Renderer
  // =========================================================================
  const camera = { x: 0, y: 0 };
  const particles = [];

  function spawnChimneySmoke(px, py) {
    if (Math.random() < 0.04) {
      particles.push({
        x: px + (Math.random() * 4 - 2),
        y: py,
        vx: (Math.random() - 0.5) * 6,
        vy: -12 - Math.random() * 8,
        life: 2.2,
        maxLife: 2.2,
        size: 2,
        color: 'rgba(200, 200, 220, 0.45)'
      });
    }
  }

  function spawnFountainSparkle(px, py) {
    if (Math.random() < 0.18) {
      particles.push({
        x: px + (Math.random() * 24 - 12),
        y: py + (Math.random() * 12 - 6),
        vx: (Math.random() - 0.5) * 14,
        vy: -18 - Math.random() * 12,
        life: 0.8,
        maxLife: 0.8,
        size: 1,
        color: 'rgba(180, 230, 255, 0.8)'
      });
    }
  }

  function spawnTwilightMote() {
    if (flags.isTwilight && Math.random() < 0.08) {
      particles.push({
        x: camera.x + Math.random() * 256,
        y: camera.y + Math.random() * 224,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 8,
        life: 3.5,
        maxLife: 3.5,
        size: 1.5,
        color: 'rgba(255, 230, 120, 0.75)'
      });
    }
  }

  function spawnFlowerPetal() {
    if (particles.length > 50) return;
    const colors = [
      vceColor(7, 2, 2), // Coral red petal
      vceColor(7, 6, 2), // Golden yellow petal
      vceColor(3, 4, 7)  // Periwinkle blue petal
    ];
    particles.push({
      x: camera.x + Math.random() * 256,
      y: camera.y + Math.random() * 224,
      vx: 8 + Math.random() * 10,
      vy: 4 + Math.random() * 6,
      life: 1.2,
      maxLife: 1.2,
      size: 1,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  const C_GOLD_HI = vceColor(7, 6, 1);
  const C_GOLD_MID = vceColor(6, 5, 0);
  const C_GOLD_SHD = vceColor(4, 3, 0);

  function drawSlashArc(ctx, dir, hx, hy) {
    let rot = 0;
    if (dir === 0) rot = Math.PI * 0.5;
    else if (dir === 1) rot = -Math.PI * 0.5;
    else if (dir === 2) rot = Math.PI;

    const sx = Math.round(hx + 8 - camera.x);
    const sy = Math.round(hy + 8 - camera.y);
    const prog = hero.attackTimer > 0 ? (1.0 - Math.min(1, hero.attackTimer / 0.16)) : 0.5;
    // The blade sweeps a little past the facing line and trails behind it. Three
    // offset crescents read as motion blur in a 256x224 frame; the old single
    // 1 px glint read as a static curve.
    const sweepStart = rot - 1.30 + prog * 0.55;
    const sweepEnd = rot + 1.30 + prog * 0.40;
    const baseColor = (WEAPONS[hero.weapon] && WEAPONS[hero.weapon].arcColor) ? WEAPONS[hero.weapon].arcColor : vceColor(3, 6, 7);

    ctx.save();
    const trail = [
      { r: 17, w: 5, a: 0.30, c: baseColor },
      { r: 15, w: 3, a: 0.55, c: baseColor },
      { r: 13, w: 2, a: 0.95, c: vceColor(7, 7, 6) }
    ];
    for (let i = 0; i < trail.length; i++) {
      const seg = trail[i];
      ctx.globalAlpha = seg.a;
      ctx.strokeStyle = seg.c;
      ctx.lineWidth = seg.w;
      ctx.beginPath();
      ctx.arc(sx, sy, seg.r, sweepStart - i * 0.10, sweepEnd - i * 0.10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Leading edge: a four-point flare instead of a plus-shaped smear.
    const tipX = Math.round(sx + Math.cos(sweepEnd) * 17);
    const tipY = Math.round(sy + Math.sin(sweepEnd) * 17);
    ctx.fillStyle = vceColor(7, 7, 7);
    ctx.fillRect(tipX - 1, tipY - 3, 2, 7);
    ctx.fillRect(tipX - 3, tipY - 1, 7, 2);
    ctx.fillStyle = baseColor;
    ctx.fillRect(tipX - 2, tipY - 2, 5, 5);
    ctx.fillStyle = vceColor(7, 7, 7);
    ctx.fillRect(tipX, tipY, 2, 2);

    const tailX = Math.round(sx + Math.cos(sweepStart) * 12);
    const tailY = Math.round(sy + Math.sin(sweepStart) * 12);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = baseColor;
    ctx.fillRect(tailX - 1, tailY - 1, 3, 3);
    ctx.restore();
  }

  let transitionGraceTimer = 0;
  let heroTrail = [];
  let fifiBolts = [];
  let starburstPillars = [];
  let starburstCutinTimer = 0;
  let jealousWedgeTimer = 0;
  let dawnAuraTimer = 0;
  // Offscreen layer for the crypt darkness. Punching holes directly into the
  // main canvas with destination-out would erase the scene, not the veil.
  let cryptDarkCanvas = null;
  let cryptDarkCtx = null;
  window.heroTrail = heroTrail;
  window.fifiBolts = fifiBolts;

  function drawEntitySprite(ctx, spr, ex, ey, scaleX = 1, scaleY = 1, hopY = 0) {
    if (!spr) return;
    const w = spr.width || 16;
    const h = spr.height || 16;
    const footX = Math.round(ex + 8 - camera.x);
    const footY = Math.round(ey + 16 + hopY - camera.y);
    ctx.save();
    ctx.translate(footX, footY);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(spr, -Math.floor(w / 2), -h, w, h);
    ctx.restore();
  }
  window.drawEntitySprite = drawEntitySprite;

  function updateSquashAndStretch(entity, dt, isWalking, isAttacking, walkTimer = 0) {
    if (!entity) return;
    if (typeof entity.scaleX !== 'number') entity.scaleX = 1.0;
    if (typeof entity.scaleY !== 'number') entity.scaleY = 1.0;
    if (typeof entity.hopY !== 'number') entity.hopY = 0;

    if (isAttacking) {
      entity.scaleX = 1.25;
      entity.scaleY = 0.78;
    } else if (isWalking) {
      const trot = Math.sin((walkTimer || 0) * 14);
      entity.scaleX = 1 + trot * 0.06;
      entity.scaleY = 1 - trot * 0.06;
      entity.hopY = -Math.abs(trot) * 1.5;
    } else {
      entity.scaleX += (1.0 - entity.scaleX) * Math.min(1, dt * 12);
      entity.scaleY += (1.0 - entity.scaleY) * Math.min(1, dt * 12);
      entity.hopY += (0 - entity.hopY) * Math.min(1, dt * 12);
    }
  }

  // 2D WebGL Dynamic Point-Lighting & Bloom Shader Pass
  let glLightContext = null;
  let glLightProgram = null;
  let glPosBuffer = null;
  let glLocs = {};
  let glInitAttempted = false;

  function initWebGLLighting() {
    if (glInitAttempted) return;
    glInitAttempted = true;
    const canvas = document.getElementById('glLightCanvas');
    if (!canvas) return;
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return;

      const vsSource = `
        attribute vec2 a_pos;
        varying vec2 v_uv;
        void main() {
          v_uv = a_pos * 0.5 + 0.5;
          v_uv.y = 1.0 - v_uv.y;
          gl_Position = vec4(a_pos, 0.0, 1.0);
        }
      `;
      const fsSource = `
        precision mediump float;
        varying vec2 v_uv;
        uniform vec2 u_resolution;
        uniform int u_lightCount;
        uniform vec4 u_lights[16];
        uniform vec3 u_lightColors[16];
        uniform vec3 u_ambientColor;

        void main() {
          vec2 pixelCoord = v_uv * u_resolution;
          vec3 totalLight = u_ambientColor;
          for (int i = 0; i < 16; i++) {
            if (i >= u_lightCount) break;
            vec2 lightPos = u_lights[i].xy;
            float radius = u_lights[i].z;
            float intensity = u_lights[i].w;
            float dist = distance(pixelCoord, lightPos);
            if (dist < radius) {
              float atten = 1.0 - smoothstep(0.0, radius, dist);
              totalLight += u_lightColors[i] * (atten * intensity);
            }
          }
          gl_FragColor = vec4(totalLight, 0.38);
        }
      `;

      function createShader(gl, type, source) {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          gl.deleteShader(s);
          return null;
        }
        return s;
      }

      const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
      if (!vs || !fs) {
        if (canvas.parentNode) {
          const freshCanvas = canvas.cloneNode(false);
          canvas.parentNode.replaceChild(freshCanvas, canvas);
        }
        return;
      }

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        if (canvas.parentNode) {
          const freshCanvas = canvas.cloneNode(false);
          canvas.parentNode.replaceChild(freshCanvas, canvas);
        }
        return;
      }

      glPosBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, glPosBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
      ]), gl.STATIC_DRAW);

      glLightContext = gl;
      glLightProgram = prog;
      glLocs = {
        pos: gl.getAttribLocation(prog, 'a_pos'),
        res: gl.getUniformLocation(prog, 'u_resolution'),
        count: gl.getUniformLocation(prog, 'u_lightCount'),
        lights: gl.getUniformLocation(prog, 'u_lights'),
        colors: gl.getUniformLocation(prog, 'u_lightColors'),
        ambient: gl.getUniformLocation(prog, 'u_ambientColor')
      };
    } catch (e) {
      console.warn("WebGL lighting init fallback to 2D:", e);
    }
  }

  function renderWebGLLighting() {
    const canvas = document.getElementById('glLightCanvas');
    if (!canvas) return;
    if (!glInitAttempted) initWebGLLighting();

    const lights = [];
    const colors = [];

    const addLight = (x, y, radius, intensity, r, g, b) => {
      if (lights.length >= 64) return;
      const sx = x - camera.x;
      const sy = y - camera.y;
      if (sx >= -radius && sx <= 256 + radius && sy >= -radius && sy <= 224 + radius) {
        lights.push(sx, sy, radius, intensity);
        colors.push(r, g, b);
      }
    };

    addLight(hero.x + 8, hero.y + 12, 48, 0.45, 1.0, 0.85, 0.6);

    if (flags.fifiRecruited && typeof fifiCompanion !== 'undefined') {
      addLight(fifiCompanion.x + 8, fifiCompanion.y + 12, 40, 0.45, 0.9, 0.7, 1.0);
    }

    if (flags.nyahRecruited && typeof nyahCompanion !== 'undefined') {
      addLight(nyahCompanion.x + 8, nyahCompanion.y + 12, 38, 0.45, 1.0, 0.9, 0.4);
    }

    if (fifiBolts) {
      fifiBolts.forEach(b => addLight(b.x, b.y, 24, 0.8, 0.6, 0.85, 1.0));
    }
    if (swordBeams) {
      swordBeams.forEach(b => addLight(b.x, b.y, 30, 0.8, 0.4, 0.9, 1.0));
    }

    const curM = getActiveMap();
    if (curM && curM.lanterns) {
      curM.lanterns.forEach(l => {
        addLight(l.x, l.y, 52, 0.65, 1.0, 0.8, 0.35);
      });
    }

    if (curM && curM.hearthPos) {
      addLight(curM.hearthPos.x, curM.hearthPos.y, 64, 0.75, 1.0, 0.5, 0.2);
    }

    if (activeMapId.startsWith('dungeon_')) {
      addLight(26 * 16 + 8, 25 * 16 + 8, 48, 0.6, 0.4, 0.9, 1.0);
    } else if (activeMapId === 'bell_spire') {
      addLight(5 * 16 + 8, 24 * 16 + 8, 48, 0.6, 0.4, 0.9, 1.0);
    }

    let ambR = 0.0, ambG = 0.0, ambB = 0.0;
    if (activeMapId.startsWith('dungeon_')) {
      ambR = 0.04; ambG = 0.04; ambB = 0.10;
    } else if (flags.isTwilight) {
      ambR = 0.12; ambG = 0.06; ambB = 0.14;
    }

    if (glLightContext && glLightProgram) {
      const gl = glLightContext;
      gl.viewport(0, 0, 256, 224);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(glLightProgram);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

      gl.uniform2f(glLocs.res, 256, 224);
      const count = Math.min(16, lights.length / 4);
      gl.uniform1i(glLocs.count, count);
      gl.uniform3f(glLocs.ambient, ambR, ambG, ambB);

      const paddedLights = new Float32Array(64);
      for (let i = 0; i < lights.length; i++) paddedLights[i] = lights[i];
      const paddedColors = new Float32Array(48);
      for (let i = 0; i < colors.length; i++) paddedColors[i] = colors[i];

      gl.uniform4fv(glLocs.lights, paddedLights);
      gl.uniform3fv(glLocs.colors, paddedColors);

      gl.bindBuffer(gl.ARRAY_BUFFER, glPosBuffer);
      gl.enableVertexAttribArray(glLocs.pos);
      gl.vertexAttribPointer(glLocs.pos, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      let activeCanvas = canvas;
      let ctx2d = activeCanvas.getContext('2d');
      if (!ctx2d && activeCanvas.parentNode) {
        const freshCanvas = activeCanvas.cloneNode(false);
        activeCanvas.parentNode.replaceChild(freshCanvas, activeCanvas);
        activeCanvas = freshCanvas;
        ctx2d = activeCanvas.getContext('2d');
      }
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, 256, 224);
      ctx2d.save();
      ctx2d.globalCompositeOperation = 'screen';
      for (let i = 0; i < lights.length; i += 4) {
        const lx = lights[i], ly = lights[i + 1], rad = lights[i + 2];
        const ci = (i / 4) * 3;
        const cr = Math.round(colors[ci] * 255);
        const cg = Math.round(colors[ci + 1] * 255);
        const cb = Math.round(colors[ci + 2] * 255);
        const grad = ctx2d.createRadialGradient(lx, ly, 2, lx, ly, rad);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.45)`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0.0)`);
        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.arc(lx, ly, rad, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.restore();
    }
  }

  function renderFrame(ctx) {
    const curMap = getActiveMap();
    const atlas = flags.isTwilight ? tileCanvasesTwilight : tileCanvasesMidday;
    const camX = Math.round(camera.x);
    const camY = Math.round(camera.y);

    const startTx = Math.max(0, Math.floor(camX / TILE_SZ));
    const endTx = Math.min(curMap.width - 1, Math.floor((camX + 256 + 15) / TILE_SZ));
    const startTy = Math.max(0, Math.floor(camY / TILE_SZ));
    const endTy = Math.min(curMap.height - 1, Math.floor((camY + 224 + 15) / TILE_SZ));

    const fountainFrame = Math.floor(Date.now() / 120) % 4;
    const hearthFrame = Math.floor(Date.now() / 200) % 2;
    const flowerFrame = Math.floor(Date.now() / 240);
    const flowerSeq = ['flowers', 'flowers1', 'flowers', 'flowers2'];

    // Fill screen background black (for smaller centered interior rooms)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 224);

    // PASS 1: Ground & Base Walls
    for (let ty = startTy; ty <= endTy; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        const idx = ty * curMap.width + tx;
        let gId = curMap.groundLayer[idx];
        if (gId === 'waterRim') {
          gId = 'waterRim' + fountainFrame;
        } else if (gId === 'hearthFire') {
          gId = 'hearthFire' + hearthFrame;
        } else if (gId === 'flowers' || gId === 'flowers0' || gId === 'flowers1' || gId === 'flowers2') {
          const flowerIdx = (flowerFrame + ((tx * 2 + ty * 3) % 4)) % 4;
          gId = flowerSeq[flowerIdx];
        }
        const gTile = atlas[gId];
        if (gTile) {
          ctx.drawImage(gTile, tx * TILE_SZ - camX, ty * TILE_SZ - camY);
        }
        let sId = curMap.structLayer[idx];
        if (sId && sId !== 'fountainSpire' && sId !== 'lampPost') {
          if (sId === 'hearthFire0' || sId === 'hearthFire1') {
            sId = 'hearthFire' + hearthFrame;
          } else if (sId === 'flowers' || sId === 'flowers0' || sId === 'flowers1' || sId === 'flowers2') {
            const flowerIdx = (flowerFrame + ((tx * 2 + ty * 3) % 4)) % 4;
            sId = flowerSeq[flowerIdx];
          }
          const sTile = atlas[sId];
          if (sTile) {
            ctx.drawImage(sTile, tx * TILE_SZ - camX, ty * TILE_SZ - camY);
          }
        }
      }
    }

    // PASS 2: Y-Sorted Dynamic Entities & Props
    // Overhead tiles join the sort instead of being a flat pass over everything.
    // Their baseline is the bottom edge of the tile, so a canopy/roof covers an
    // entity standing behind it and yields to one standing in front. This is what
    // stops the market awning from painting over the hero's head.
    const renderList = [];
    for (let ty = startTy; ty <= endTy; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        const idx = ty * curMap.width + tx;
        const oId = curMap.overheadLayer[idx];
        if (!oId) continue;
        const oTile = atlas[oId];
        if (!oTile) continue;
        // Market awnings share a tile with the stall cabinet. Without a lift the
        // canopy paints over the whole cabinet and the stall reads as a floating
        // strip of cloth. Raise it so the shelves show underneath.
        const lift = (typeof oId === 'string' && oId.indexOf('awning') === 0) ? -7 : 0;
        renderList.push({
          yBaseline: (ty + 1) * TILE_SZ - 1,
          draw: () => ctx.drawImage(oTile, tx * TILE_SZ - camX, ty * TILE_SZ + lift - camY)
        });
      }
    }

    // Old Quarry Mines ore cart. Drawn under the hero when parked and over his
    // legs while riding, so it reads as a vehicle rather than a tile.
    if (activeMapId === 'dungeon_mines') {
      renderList.push({
        yBaseline: minesCart.y + 18,
        draw: () => {
          const cx = Math.round(minesCart.x) - camX;
          const cy = Math.round(minesCart.y) - camY;
          // wheels
          ctx.fillStyle = vceColor(1, 1, 1);
          ctx.fillRect(cx + 2, cy + 13, 5, 4);
          ctx.fillRect(cx + 13, cy + 13, 5, 4);
          ctx.fillStyle = vceColor(5, 5, 6);
          ctx.fillRect(cx + 3, cy + 14, 3, 2);
          ctx.fillRect(cx + 14, cy + 14, 3, 2);
          // body
          ctx.fillStyle = vceColor(4, 2, 1);
          ctx.fillRect(cx, cy + 3, 20, 10);
          ctx.fillStyle = vceColor(6, 4, 2);
          ctx.fillRect(cx + 1, cy + 4, 18, 3);
          ctx.fillStyle = vceColor(3, 1, 1);
          ctx.fillRect(cx + 1, cy + 8, 18, 2);
          // iron rim & headlamp
          ctx.fillStyle = vceColor(6, 6, 7);
          ctx.fillRect(cx, cy + 2, 20, 2);
          ctx.fillStyle = vceColor(7, 6, 2);
          ctx.fillRect(cx + 8, cy + 1, 4, 2);
          if (minesCart.run && minesCart.run.phase === 'warn' && Math.floor(Date.now() / 70) % 2 === 0) {
            ctx.fillStyle = vceColor(7, 2, 2);
            ctx.fillRect(cx + 8, cy - 8, 2, 6);
            ctx.fillRect(cx + 8, cy - 1, 2, 2);
          }
        }
      });
    }

    // Hero Adventurer
    let heroSprKey = 'heroDown0';
    if (hero.isAttacking) {
      if (hero.dir === 0) heroSprKey = 'heroSlashDown';
      else if (hero.dir === 1) heroSprKey = 'heroSlashUp';
      else if (hero.dir === 2) heroSprKey = 'heroSlashLeft';
      else if (hero.dir === 3) heroSprKey = 'heroSlashRight';
    } else {
      if (hero.dir === 0) heroSprKey = 'heroDown' + (hero.isMoving ? hero.animFrame : 0);
      else if (hero.dir === 1) heroSprKey = 'heroUp' + (hero.isMoving ? hero.animFrame : 0);
      else if (hero.dir === 2) heroSprKey = 'heroLeft' + (hero.isMoving ? hero.animFrame : 0);
      else if (hero.dir === 3) heroSprKey = 'heroRight' + (hero.isMoving ? hero.animFrame : 0);
    }

    renderList.push({
      yBaseline: hero.y + 16,
      draw: () => {
        const isBlink = hero.invulnTimer > 0 && hero.dodgeTimer <= 0 && (Math.floor(Date.now() / 33) % 2 === 0);
        const spr = atlas[heroSprKey];
        if (spr && hero.dodgeTimer > 0) {
          // Two fading afterimages sell the step without a new sprite.
          ctx.save();
          ctx.globalAlpha = 0.30;
          drawEntitySprite(ctx, spr, hero.x - hero.dodgeDirX * 8, hero.y - hero.dodgeDirY * 8, hero.scaleX || 1, hero.scaleY || 1, hero.hopY || 0);
          ctx.globalAlpha = 0.16;
          drawEntitySprite(ctx, spr, hero.x - hero.dodgeDirX * 16, hero.y - hero.dodgeDirY * 16, hero.scaleX || 1, hero.scaleY || 1, hero.hopY || 0);
          ctx.restore();
        }
        if (!isBlink && spr) {
          drawEntitySprite(ctx, spr, hero.x, hero.y, hero.scaleX || 1, hero.scaleY || 1, hero.hopY || 0);
        }
        if (hero.isAttacking && spr) {
          // One-frame smear behind the swing, so the slash has weight even when
          // the pose itself does not change.
          ctx.save();
          ctx.globalAlpha = 0.22;
          drawEntitySprite(ctx, spr, hero.x - (hero.dir === 3 ? 3 : hero.dir === 2 ? -3 : 0), hero.y - (hero.dir === 0 ? 3 : hero.dir === 1 ? -3 : 0), hero.scaleX || 1, hero.scaleY || 1, hero.hopY || 0);
          ctx.restore();
        }
        if (hero.isAttacking) {
          if (hero.isSpinning) {
            drawSlashArc(ctx, 0, hero.x, hero.y);
            drawSlashArc(ctx, 1, hero.x, hero.y);
            drawSlashArc(ctx, 2, hero.x, hero.y);
            drawSlashArc(ctx, 3, hero.x, hero.y);
          } else {
            drawSlashArc(ctx, hero.dir, hero.x, hero.y);
          }
        } else if (hero.chargeReady) {
          ctx.fillStyle = (Math.floor(Date.now() / 60) % 2 === 0) ? vceColor(7, 7, 3) : vceColor(7, 5, 1);
          ctx.fillRect(Math.round(hero.x) + 7 - camX, Math.round(hero.y) + 2 - camY, 2, 2);
          ctx.fillRect(Math.round(hero.x) + 2 - camX, Math.round(hero.y) + 7 - camY, 2, 2);
          ctx.fillRect(Math.round(hero.x) + 12 - camX, Math.round(hero.y) + 7 - camY, 2, 2);
        }
      }
    });

    // Nyah Companion (Rendered when in active party)
    if (flags.nyahJoinedParty || flags.nyahRecruited) {
      let nyahSprKey = 'nyahIdle0';
      if (nyahCompanion.isAttacking) {
        nyahSprKey = (nyahCompanion.animFrame % 2 === 0) ? 'nyahClaw0' : 'nyahClaw1';
      } else if (nyahCompanion.isMoving) {
        if (nyahCompanion.dir === 0) nyahSprKey = 'nyahIdle' + nyahCompanion.animFrame;
        else if (nyahCompanion.dir === 1) nyahSprKey = 'nyahUp' + nyahCompanion.animFrame;
        else if (nyahCompanion.dir === 2) nyahSprKey = 'nyahLeft' + nyahCompanion.animFrame;
        else if (nyahCompanion.dir === 3) nyahSprKey = 'nyahRight' + nyahCompanion.animFrame;
      } else {
        const isClose = Math.hypot(hero.x - nyahCompanion.x, hero.y - nyahCompanion.y) < 22;
        if (hero.idleTimer > 3.0 && isClose && activeMapId === 'aldenor_exterior') {
          nyahSprKey = 'nyahLean';
        } else {
          const isTwitching = nyahCompanion.animTimer > 3.0 && nyahCompanion.animTimer < 3.35;
          nyahSprKey = isTwitching ? 'nyahIdle1' : 'nyahIdle0';
        }
      }

      renderList.push({
        yBaseline: nyahCompanion.y + 16,
        draw: () => {
          const spr = atlas[nyahSprKey] || atlas['nyahIdle0'];
          if (spr) {
            drawEntitySprite(ctx, spr, nyahCompanion.x, nyahCompanion.y, nyahCompanion.scaleX || 1, nyahCompanion.scaleY || 1, nyahCompanion.hopY || 0);
            if (nyahCompanion.accessory === 'silver_bell') {
              ctx.fillStyle = vceColor(7, 7, 3);
              ctx.fillRect(Math.round(nyahCompanion.x) + 7 - camX, Math.round(nyahCompanion.y) + 7 - camY, 2, 2);
            } else if (nyahCompanion.accessory === 'crimson_ribbon') {
              ctx.fillStyle = vceColor(7, 1, 2);
              ctx.fillRect(Math.round(nyahCompanion.x) + 4 - camX, Math.round(nyahCompanion.y) + 1 - camY, 2, 2);
              ctx.fillRect(Math.round(nyahCompanion.x) + 10 - camX, Math.round(nyahCompanion.y) + 1 - camY, 2, 2);
            } else if (nyahCompanion.accessory === 'moonlight_cloak') {
              ctx.fillStyle = vceColor(2, 3, 7);
              ctx.fillRect(Math.round(nyahCompanion.x) + 5 - camX, Math.round(nyahCompanion.y) + 6 - camY, 6, 2);
            }
          }
          if (nyahCompanion.isAttacking && nyahCompanion.perks && nyahCompanion.perks.includes('dual_spin')) {
            drawSlashArc(ctx, (Math.floor(Date.now() / 40) % 4), nyahCompanion.x, nyahCompanion.y);
          }
        }
      });
    }

    // Fifi Companion (Rendered when recruited, or inside Manor while leashed)
    const isInManor = (activeMapId === 'grand_manor_interior' || activeMapId === 'manor_parlor');
    const shouldRenderFifi = flags.fifiRecruited && typeof fifiCompanion !== 'undefined' && (!flags.fifiLeashedInManor || isInManor);
    if (shouldRenderFifi) {
      let fifiSprKey = 'fifiIdle0';
      if ((fifiCompanion.castTimer || 0) > 0) {
        fifiSprKey = (Math.floor(Date.now() / 150) % 2 === 0) ? 'fifiCast0' : 'fifiCast1';
      } else if (fifiCompanion.isMoving) {
        const frame = (fifiCompanion.animFrame ?? fifiCompanion.walkFrame ?? 0) % 3;
        if (fifiCompanion.dir === 0) fifiSprKey = 'fifiDown' + frame;
        else if (fifiCompanion.dir === 1) fifiSprKey = 'fifiUp' + frame;
        else if (fifiCompanion.dir === 2) fifiSprKey = 'fifiLeft' + frame;
        else if (fifiCompanion.dir === 3) fifiSprKey = 'fifiRight' + frame;
      } else {
        fifiSprKey = (Math.floor(Date.now() / 400) % 2 === 0) ? 'fifiIdle0' : 'fifiIdle1';
      }

      renderList.push({
        yBaseline: fifiCompanion.y + 16,
        draw: () => {
          let leashClasp = null;
          if (flags.fifiLeashedInManor && isInManor) {
            // Draw crimson velvet ribbon tether from wooden bedroom post to Fifi's collar
            const postX = Math.round(MANOR_LEASH_POST_X - camX);
            const postY = Math.round(MANOR_LEASH_POST_Y - camY);
            const colX = Math.round(fifiCompanion.x + 8 - camX);
            const colY = Math.round(fifiCompanion.y + 6 - camY);
            ctx.save();
            ctx.strokeStyle = '#6A0818';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(postX, postY);
            ctx.lineTo(colX, colY);
            ctx.stroke();
            ctx.strokeStyle = '#D81C38';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(postX, postY);
            ctx.lineTo(colX, colY);
            ctx.stroke();
            // Gold bow on the post; the collar clasp is drawn after Fifi so
            // her sprite cannot hide the point where the ribbon attaches.
            ctx.fillStyle = '#D81C38';
            ctx.fillRect(postX - 2, postY - 2, 5, 4);
            ctx.restore();
            leashClasp = { x: colX, y: colY };
          }
          const spr = atlas[fifiSprKey] || atlas['fifiIdle0'];
          if (spr) {
            drawEntitySprite(ctx, spr, fifiCompanion.x, fifiCompanion.y, fifiCompanion.scaleX || fifiCompanion.squashX || 1, fifiCompanion.scaleY || fifiCompanion.squashY || 1, fifiCompanion.hopY || 0);
          }
          if (leashClasp) {
            ctx.fillStyle = '#FFE050';
            ctx.fillRect(leashClasp.x - 1, leashClasp.y - 1, 2, 2);
          }
        }
      });
    }

    // NPCs (Filtered to active map)
    npcs.forEach(n => {
      if (n.mapId !== activeMapId || n.active === false) return;
      if (n.id === 'nyah' && (flags.nyahJoinedParty || flags.nyahRecruited)) return;

      let sprKey = n.id + '0';
      if (n.id === 'nyah') {
        if (n.isSweeping && !n.isEngaged) {
          sprKey = (n.sweepFrame === 1) ? 'nyahSweep1' : 'nyahSweep0';
        } else {
          const isTwitching = n.earTimer > 3.0 && n.earTimer < 3.35;
          sprKey = isTwitching ? 'nyahIdle1' : 'nyahIdle0';
        }
      } else if (n.id === 'lumina') {
        sprKey = 'lumina0';
      } else if (n.id === 'elder') {
        sprKey = (n.dir === 3) ? 'elderRight' : 'elder0';
      } else if (n.id === 'guard') {
        sprKey = (n.dir === 3) ? 'guardRight' : 'guard0';
      } else if (n.id === 'child') {
        sprKey = (n.dir === 3) ? 'childRight' : 'child0';
      } else if (n.id === 'goran') {
        const goranFrame = Math.floor(Date.now() / 450) % 2;
        sprKey = 'goran' + goranFrame;
      } else if (n.id === 'kitten_mochi') {
        sprKey = 'kittenMochi';
      } else if (n.id === 'seagull') {
        const flap = Math.floor(Date.now() / 150) % 2;
        sprKey = (n.dir === 3) ? ('seagullRight' + flap) : ('seagull' + flap);
      } else if (n.id === 'barkeep') {
        const barFrame = Math.floor(Date.now() / 450) % 2;
        sprKey = (n.dir === 3) ? ('barkeepRight' + barFrame) : ('barkeep' + barFrame);
      } else if (n.id === 'bard') {
        const bardFrame = Math.floor(Date.now() / 350) % 2;
        sprKey = 'bard' + bardFrame;
      } else if (n.id === 'sailor') {
        const sailorFrame = Math.floor(Date.now() / 600) % 2;
        sprKey = (n.dir === 3) ? ('sailorRight' + sailorFrame) : ('sailor' + sailorFrame);
      } else if (n.id === 'mercenary') {
        const mercFrame = Math.floor(Date.now() / 600) % 2;
        sprKey = (n.dir === 3) ? ('mercenaryRight' + mercFrame) : ('mercenary' + mercFrame);
      }

      renderList.push({
        yBaseline: n.y + 16,
        draw: () => {
          const spr = atlas[sprKey];
          if (spr) drawEntitySprite(ctx, spr, n.x, n.y, n.scaleX || 1, n.scaleY || 1, n.hopY || 0);
        }
      });
    });

    // Combat Maps Drops & Monsters
    const isCombatMap = (activeMapId === 'aldenor_coastal_plains' || activeMapId.startsWith('dungeon_') || activeMapId === 'bell_spire');
    if (isCombatMap) {
      drops.forEach(d => {
        if (d.collected) return;
        const dropSprKey = d.type === 'coin' ? 'drop_coin' : (d.type === 'locket' ? 'drop_locket' : 'drop_herb');
        const bob = Math.sin(Date.now() / 180 + d.x) * 1.5;
        renderList.push({
          yBaseline: d.y + 14,
          draw: () => {
            const spr = atlas[dropSprKey];
            if (spr) ctx.drawImage(spr, Math.round(d.x) - camX, Math.round(d.y + bob) - camY);
          }
        });
      });

      monsters.forEach(m => {
        if (!m.alive) return;
        let mSprKey = '';
        if (m.type === 'slime') {
          const frame = (m.hopTimer > 0.15 && m.hopTimer < 0.45) ? 1 : 0;
          mSprKey = 'slime' + frame;
        } else if (m.type === 'crab') {
          const frame = Math.floor(Date.now() / 200) % 2;
          mSprKey = 'crab' + frame;
        } else if (m.type === 'cave_bat') {
          const frame = Math.floor(Date.now() / 150) % 2;
          mSprKey = 'bat' + frame;
        } else if (m.type === 'goblin_miner') {
          const frame = Math.floor(Date.now() / 300) % 2;
          mSprKey = 'goblin' + frame;
        } else if (m.type === 'rock_beetle') {
          const frame = Math.floor(Date.now() / 250) % 2;
          mSprKey = 'beetle' + frame;
        } else if (m.type === 'boss_golem') {
          const frame = Math.floor(Date.now() / 350) % 2;
          mSprKey = 'golem' + frame;
        } else if (m.type === 'crypt_wisp') {
          const frame = Math.floor(Date.now() / 200) % 2;
          mSprKey = 'wisp' + frame;
        } else if (m.type === 'crypt_spider') {
          const frame = Math.floor(Date.now() / 200) % 2;
          mSprKey = 'spider' + frame;
        } else if (m.type === 'skeleton_knight') {
          const frame = Math.floor(Date.now() / 300) % 2;
          mSprKey = 'skel' + frame;
        } else if (m.type === 'boss_lich') {
          const frame = Math.floor(Date.now() / 350) % 2;
          mSprKey = 'lich' + frame;
        } else if (m.type === 'electric_jelly') {
          const frame = Math.floor(Date.now() / 250) % 2;
          mSprKey = 'jelly' + frame;
        } else if (m.type === 'armored_triton') {
          const frame = Math.floor(Date.now() / 300) % 2;
          mSprKey = 'triton' + frame;
        } else if (m.type === 'coral_crab') {
          const frame = Math.floor(Date.now() / 250) % 2;
          mSprKey = 'coral' + frame;
        } else if (m.type === 'boss_leviathan') {
          const frame = Math.floor(Date.now() / 350) % 2;
          mSprKey = 'leviathan' + frame;
        } else if (m.type === 'shadow_guard') {
          const frame = Math.floor(Date.now() / 250) % 2;
          mSprKey = 'shadow' + frame;
        } else if (m.type === 'boss_eclipse') {
          const frame = Math.floor(Date.now() / 300) % 2;
          mSprKey = 'eclipse' + frame;
        }

        if (m.flashTimer > 0) {
          mSprKey += '_white';
        }
        renderList.push({
          yBaseline: m.y + 16,
          draw: () => {
            const spr = atlas[mSprKey] || atlas[mSprKey.replace('_white', '')];
            if (spr) drawEntitySprite(ctx, spr, m.x, m.y, m.scaleX || 1, m.scaleY || 1, m.hopY || 0);
            // Attack tell: flashing "!" plus a ring that closes in as the attack
            // resolves. Without this the wind-up would be invisible.
            if (m.windup > 0) {
              const mx = Math.round(m.x) + 8 - camX;
              const my = Math.round(m.y) - camY;
              const on = (Math.floor(Date.now() / 70) % 2 === 0);
              ctx.fillStyle = on ? vceColor(7, 2, 2) : vceColor(7, 7, 2);
              ctx.fillRect(mx - 1, my - 13, 2, 6);
              ctx.fillRect(mx - 1, my - 5, 2, 2);
              const ratio = Math.max(0, Math.min(1, m.windup / (m.windupTotal || 1)));
              ctx.strokeStyle = on ? '#FF3030' : '#FFE050';
              ctx.lineWidth = 1;
              ctx.beginPath();
              // Area attacks show their real radius; single-target tells shrink in.
              ctx.arc(mx, my + 8, m.windupRadius ? m.windupRadius : 8 + ratio * 18, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        });
      });
    }

    // Fountain Spire Mid-Prop (Exterior Only)
    if (activeMapId === 'aldenor_exterior') {
      renderList.push({
        yBaseline: 13 * TILE_SZ + 12,
        draw: () => {
          const spr = atlas['fountainSpire' + fountainFrame] || atlas['fountainSpire'];
          if (spr) ctx.drawImage(spr, 15 * TILE_SZ - camX, 13 * TILE_SZ - camY);
        }
      });
    }

    // Lamp Posts on Active Map
    const mapLanterns = curMap.lanterns || [];
    mapLanterns.forEach(l => {
      renderList.push({
        yBaseline: l.y + 10,
        draw: () => {
          const spr = atlas['lampPost'];
          if (spr) ctx.drawImage(spr, l.x - 8 - camX, l.y - 6 - camY);
        }
      });
    });

    // Sort by baseline & draw
    renderList.sort((a, b) => a.yBaseline - b.yBaseline);
    renderList.forEach(item => item.draw());

    // The crypt's darkness is a plain 2D pass, independent of the optional WebGL
    // light. The hero's lantern, every burning brazier and any monster winding
    // up a tell punch holes in it, so an attack is never hidden by the dark.
    if (activeMapId === 'dungeon_crypts' && !dungeonState.cryptsBraziersLit) {
      const darkAlpha = flags.isTwilight ? 0.82 : 0.70;
      const lights = [{ x: hero.x + 8, y: hero.y + 12, r: 58 + Math.sin(Date.now() / 240) * 2 }];
      (curMap.braziers || []).forEach(b => {
        if (b.lit) lights.push({ x: b.x * 16 + 8, y: b.y * 16 + 8, r: 84 });
      });
      if (flags.nyahJoinedParty || flags.nyahRecruited) {
        lights.push({ x: nyahCompanion.x + 8, y: nyahCompanion.y + 12, r: 32 });
      }
      if (typeof fifiCompanion !== 'undefined' && flags.fifiRecruited) {
        lights.push({ x: fifiCompanion.x + 8, y: fifiCompanion.y + 12, r: 30 });
      }
      monsters.forEach(mm => {
        if (mm.alive && mm.windup > 0) lights.push({ x: mm.x + 8, y: mm.y + 8, r: 32 });
      });
      if (!cryptDarkCanvas) {
        cryptDarkCanvas = document.createElement('canvas');
        cryptDarkCanvas.width = 256;
        cryptDarkCanvas.height = 224;
        cryptDarkCtx = cryptDarkCanvas.getContext('2d');
      }
      const dctx = cryptDarkCtx;
      dctx.clearRect(0, 0, 256, 224);
      dctx.globalCompositeOperation = 'source-over';
      dctx.fillStyle = `rgba(2, 2, 12, ${darkAlpha})`;
      dctx.fillRect(0, 0, 256, 224);
      dctx.globalCompositeOperation = 'destination-out';
      lights.forEach(l => {
        const lx = Math.round(l.x - camX);
        const ly = Math.round(l.y - camY);
        if (lx < -90 || lx > 346 || ly < -90 || ly > 314) return;
        const grad = dctx.createRadialGradient(lx, ly, 4, lx, ly, l.r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.55, 'rgba(0,0,0,0.85)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        dctx.fillStyle = grad;
        dctx.beginPath();
        dctx.arc(lx, ly, l.r, 0, Math.PI * 2);
        dctx.fill();
      });
      dctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(cryptDarkCanvas, 0, 0);
    }

    // PASS 3: Particles & projectiles above the sorted world
    // Particles (chimney smoke, fountain water sparkles, twilight motes, broom dust, musical notes)
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
    });

    // Floating Text FX (Clamped to screen edges so text NEVER clips off right border)
    floatingTexts.forEach(ft => {
      const textW = (ft.text ? ft.text.length : 10) * 6;
      const screenX = Math.max(4, Math.min(252 - textW, Math.round(ft.x - camX)));
      drawPixelText(ctx, ft.text, screenX, Math.round(ft.y - camY), ft.color, OUTLINE_COLOR);
    });

    // Render Enemy Projectiles
    enemyProjectiles.forEach(p => {
      const px = Math.round(p.x - camX);
      const py = Math.round(p.y - camY);
      ctx.fillStyle = p.color || vceColor(5, 1, 6);
      ctx.fillRect(px - 2, py - 2, 4, 4);
    });

    // Render Hero Sword Beams
    swordBeams.forEach(b => {
      const bx = Math.round(b.x - camX);
      const by = Math.round(b.y - camY);
      ctx.fillStyle = vceColor(7, 6, 1);
      ctx.fillRect(bx - 3, by - 3, 6, 6);
      ctx.fillStyle = vceColor(7, 7, 7);
      ctx.fillRect(bx - 1, by - 1, 2, 2);
    });

    // Render Fifi Starlight Bolts
    fifiBolts.forEach(b => {
      const bSpr = atlas['fifiBolt'];
      if (bSpr) {
        ctx.drawImage(bSpr, Math.round(b.x - 8 - camX), Math.round(b.y - 8 - camY));
      } else {
        ctx.fillStyle = vceColor(7, 4, 7);
        ctx.fillRect(Math.round(b.x - 3 - camX), Math.round(b.y - 3 - camY), 6, 6);
        ctx.fillStyle = vceColor(7, 7, 7);
        ctx.fillRect(Math.round(b.x - 1 - camX), Math.round(b.y - 1 - camY), 2, 2);
      }
    });

    // Render Starburst Pillars
    starburstPillars.forEach(p => {
      const px = Math.round(p.x - camX);
      const alpha = Math.min(1, p.timer / 0.65);
      ctx.fillStyle = (Math.floor(Date.now() / 60) % 2 === 0) ? vceRgba(7, 4, 7, alpha) : vceRgba(3, 7, 7, alpha);
      ctx.fillRect(px - 4, 0, 8, 224);
      ctx.fillStyle = vceRgba(7, 7, 7, alpha);
      ctx.fillRect(px - 1, 0, 2, 224);
    });

    // Twilight Radial Light Cones / Ambient Lighting
    if (flags.isTwilight) {
      ctx.save();
      if (activeMapId === 'aldenor_exterior') {
        ctx.fillStyle = 'rgba(10, 8, 34, 0.45)';
        ctx.fillRect(0, 0, 256, 224);

        ctx.globalCompositeOperation = 'lighter';
        mapLanterns.forEach(l => {
          const lx = Math.round(l.x - camX);
          const ly = Math.round(l.y - camY);
          if (lx >= -40 && lx <= 296 && ly >= -40 && ly <= 264) {
            const grad = ctx.createRadialGradient(lx, ly, 2, lx, ly, 38);
            grad.addColorStop(0, 'rgba(255, 230, 140, 0.65)');
            grad.addColorStop(0.35, 'rgba(255, 180, 80, 0.35)');
            grad.addColorStop(1, 'rgba(255, 140, 40, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(lx, ly, 38, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      } else {
        // Warm interior evening ambience
        ctx.fillStyle = 'rgba(32, 18, 12, 0.22)';
        ctx.fillRect(0, 0, 256, 224);

        ctx.globalCompositeOperation = 'lighter';
        if (curMap.hearthPos) {
          const hx = Math.round(curMap.hearthPos.x - camX);
          const hy = Math.round(curMap.hearthPos.y - camY);
          const grad = ctx.createRadialGradient(hx, hy, 4, hx, hy, 48);
          grad.addColorStop(0, 'rgba(255, 190, 90, 0.40)');
          grad.addColorStop(0.5, 'rgba(255, 120, 40, 0.18)');
          grad.addColorStop(1, 'rgba(255, 80, 20, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(hx, hy, 48, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Compact Top-Canvas Pixel HUD Overlay (Solid Crimson & Gold HP, Gold counter)
    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(4, 4, 112, 13);
    ctx.fillStyle = vceColor(6, 5, 1);
    ctx.fillRect(4, 4, 112, 1);
    ctx.fillRect(4, 4, 1, 13);
    ctx.fillRect(4, 16, 112, 1);
    ctx.fillRect(115, 4, 1, 13);

    drawPixelText(ctx, 'HP', 7, 7, vceColor(7, 6, 1), OUTLINE_COLOR);
    ctx.fillStyle = vceColor(0, 0, 1);
    ctx.fillRect(20, 7, 40, 7);
    const hpRatio = Math.max(0, Math.min(1, hero.hp / hero.maxHp));
    const hpBarW = Math.round(hpRatio * 38);
    const isCritHp = hero.hp <= hero.maxHp * 0.20;
    const isBlinking = isCritHp && (Math.floor(Date.now() / 200) % 2 === 0);
    if (!isBlinking && hpBarW > 0) {
      ctx.fillStyle = vceColor(6, 1, 1);
      ctx.fillRect(21, 8, hpBarW, 5);
      ctx.fillStyle = vceColor(7, 2, 2);
      ctx.fillRect(21, 8, hpBarW, 1);
    }
    drawPixelText(ctx, `${hero.hp}/${hero.maxHp}`, 63, 7, vceColor(7, 7, 7), OUTLINE_COLOR);

    // Gold Box: x: 120, y: 4, w: 50, h: 13
    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(120, 4, 50, 13);
    ctx.fillStyle = vceColor(6, 5, 1);
    ctx.fillRect(120, 4, 50, 1);
    ctx.fillRect(120, 4, 1, 13);
    ctx.fillRect(120, 16, 50, 1);
    ctx.fillRect(169, 4, 1, 13);
    drawPixelText(ctx, `G:${flags.gold || 0}`, 123, 7, vceColor(7, 6, 1), OUTLINE_COLOR);

    // TP Bar: x: 174, y: 4, w: 52, h: 13
    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(174, 4, 52, 13);
    ctx.fillStyle = vceColor(6, 5, 1);
    ctx.fillRect(174, 4, 52, 1);
    ctx.fillRect(174, 4, 1, 13);
    ctx.fillRect(174, 16, 52, 1);
    ctx.fillRect(225, 4, 1, 13);
    drawPixelText(ctx, 'TP', 176, 7, vceColor(7, 4, 7), OUTLINE_COLOR);
    ctx.fillStyle = vceColor(0, 0, 1);
    ctx.fillRect(188, 7, 36, 7);
    const tpRatio = Math.max(0, Math.min(1, (hero.tp || 0) / 100));
    const tpBarW = Math.round(tpRatio * 34);
    if (tpBarW > 0) {
      const isMaxTp = ((hero.tp || 0) >= 100);
      const tpColor = isMaxTp ? ((Math.floor(Date.now() / 150) % 2 === 0) ? vceColor(7, 6, 1) : vceColor(7, 3, 7)) : vceColor(5, 2, 7);
      ctx.fillStyle = tpColor;
      ctx.fillRect(189, 8, tpBarW, 5);
      ctx.fillStyle = vceColor(7, 6, 7);
      ctx.fillRect(189, 8, tpBarW, 1);
    }

    // Key-Item HUD Box shifted to Top-Right (x: 230, y: 4)
    if (flags.inventory) {
      const iconSpr = atlas['icon_' + flags.inventory];
      if (iconSpr) {
        ctx.fillStyle = vceRgba(1, 1, 2, 0.94);
        ctx.fillRect(230, 4, 20, 20);
        ctx.fillStyle = C_GOLD_HI;
        ctx.fillRect(230, 4, 20, 1);
        ctx.fillRect(230, 4, 1, 20);
        ctx.fillStyle = C_GOLD_SHD;
        ctx.fillRect(230, 23, 20, 1);
        ctx.fillRect(249, 4, 1, 20);
        ctx.drawImage(iconSpr, 232, 6);
      }
    }

    // PC-Engine 9-Bit Boss HP Bar Overlay
    const curBoss = (typeof isBossActive === 'function') ? isBossActive() : null;
    if (curBoss && curBoss.hp > 0) {
      const bx = 32, by = 202, bw = 192, bh = 16;
      ctx.fillStyle = vceColor(1, 0, 3);
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = vceColor(7, 6, 1);
      ctx.fillRect(bx, by, bw, 1);
      ctx.fillRect(bx, by, 1, bh);
      ctx.fillRect(bx, by + bh - 1, bw, 1);
      ctx.fillRect(bx + bw - 1, by, 1, bh);

      // Boss Name centered
      const bName = curBoss.name || 'ABYSSAL BOSS';
      const nameW = bName.length * 6;
      drawPixelText(ctx, bName, bx + Math.floor((bw - nameW) / 2), by + 3, vceColor(7, 6, 1), OUTLINE_COLOR);

      // HP Bar
      const barX = bx + 8, barY = by + 9, barW = bw - 16, barH = 5;
      ctx.fillStyle = vceColor(0, 0, 1);
      ctx.fillRect(barX, barY, barW, barH);
      const bRatio = Math.max(0, Math.min(1, curBoss.hp / curBoss.maxHp));
      const fillW = Math.round(bRatio * barW);
      if (fillW > 0) {
        ctx.fillStyle = vceColor(6, 1, 1);
        ctx.fillRect(barX, barY, fillW, barH);
        ctx.fillStyle = vceColor(7, 2, 2);
        ctx.fillRect(barX, barY, fillW, 1);
      }
    }

    // Hardware-Style Horizontal Scanline Shutter Wipe Transition
    if (transitionState.active) {
      const p = Math.min(1, Math.max(0, transitionState.timer / transitionState.duration));
      const ratio = p < 0.5 ? (p * 2) : ((1 - p) * 2);
      ctx.fillStyle = vceColor(0, 0, 0);
      const numSlices = 14;
      const sliceH = 16;
      const coverH = Math.ceil((sliceH / 2) * ratio);
      for (let i = 0; i < numSlices; i++) {
        ctx.fillRect(0, i * sliceH, 256, coverH);
        ctx.fillRect(0, (i + 1) * sliceH - coverH, 256, coverH);
      }
    }

    // PASS 4: Dialogue Frame & 64x64 Cut-in
    if (dialogueState.active) {
      renderDialogueBox(ctx);
    }

    // PASS 5: Retro Status / Bag / Quest / Save Screen Overlay
    if (statusMenuState.open) {
      renderStatusMenu(ctx);
    }
    if (dialogueLogState.open) {
      renderDialogueLog(ctx);
    }

    // Maid Twin Starburst Cut-in Banner
    if (starburstCutinTimer > 0) {
      const bx = 16, by = 18, bw = 224, bh = 44;
      ctx.fillStyle = vceColor(1, 0, 2);
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = vceColor(7, 6, 1);
      ctx.fillRect(bx, by, bw, 2);
      ctx.fillRect(bx, by, 2, bh);
      ctx.fillRect(bx, by + bh - 2, bw, 2);
      ctx.fillRect(bx + bw - 2, by, 2, bh);

      const nyahP = (typeof renderNyahPortrait === 'function') ? renderNyahPortrait('smug', false, false, true) : null;
      const fifiP = (typeof renderFifiPortrait === 'function') ? renderFifiPortrait('happy', false, false) : null;
      if (nyahP) ctx.drawImage(nyahP, bx + 4, by + 4, 36, 36);
      if (fifiP) ctx.drawImage(fifiP, bx + bw - 40, by + 4, 36, 36);

      drawPixelText(ctx, "★ MAID TWIN STARBURST! ★", bx + 44, by + 12, vceColor(7, 6, 1), OUTLINE_COLOR);
      drawPixelText(ctx, "NYAH & FIFI DUAL COMBO", bx + 48, by + 26, vceColor(7, 4, 7), OUTLINE_COLOR);
    }

    renderWebGLLighting();
  }

  function renderDialogueBox(ctx) {
    const bx = 4, by = 144, bw = 248, bh = 76;

    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(bx, by, bw, bh);

    ctx.fillStyle = C_GOLD_HI;
    ctx.fillRect(bx, by, bw, 2);
    ctx.fillRect(bx, by, 2, bh);
    ctx.fillStyle = C_GOLD_SHD;
    ctx.fillRect(bx, by + bh - 2, bw, 2);
    ctx.fillRect(bx + bw - 2, by, 2, bh);

    ctx.fillStyle = C_GOLD_MID;
    ctx.fillRect(bx + 2, by + 2, bw - 4, 1);
    ctx.fillRect(bx + 2, by + bh - 3, bw - 4, 1);
    ctx.fillRect(bx + 2, by + 2, 1, bh - 4);
    ctx.fillRect(bx + bw - 3, by + 2, 1, bh - 4);

    [[bx+3, by+3], [bx+bw-6, by+3], [bx+3, by+bh-6], [bx+bw-6, by+bh-6]].forEach(([rx, ry]) => {
      ctx.fillStyle = C_GOLD_HI; ctx.fillRect(rx, ry, 3, 3);
      ctx.fillStyle = C_GOLD_SHD; ctx.fillRect(rx+1, ry+1, 1, 1);
    });

    const curLine = dialogueState.lines[dialogueState.lineIndex];
    if (curLine && curLine.cgId) {
      if (typeof drawManorEventCG === 'function') {
        drawManorEventCG(ctx, curLine.cgId);
      } else {
        const cg = (typeof renderEventCg === 'function') ? renderEventCg(curLine.cgId) : (window.getV5Canvas ? window.getV5Canvas(curLine.cgId) : null);
        if (cg) {
          ctx.fillStyle = vceColor(0, 0, 1);
          ctx.fillRect(46, 20, 164, 116);
          ctx.fillStyle = C_GOLD_HI;
          ctx.fillRect(46, 20, 164, 1);
          ctx.fillRect(46, 20, 1, 116);
          ctx.fillStyle = C_GOLD_SHD;
          ctx.fillRect(46, 135, 164, 1);
          ctx.fillRect(209, 20, 1, 116);
          ctx.drawImage(cg, 48, 22, 160, 112);
        }
      }
    }

    const curPid = curLine?.portraitId || (dialogueState.npc ? dialogueState.npc.portraitId || dialogueState.npc.id : null);
    const hasPortrait = curPid !== null && (
      curPid === 'nyah' || curPid === 'fifi' || curPid === 'lumina' || curPid === 'elder' || curPid === 'guard' || curPid === 'child' || curPid === 'seagull'
    );

    let portraitCanvas = null;
    let nameX = bx + 10;
    let paneW = bw - 20;

    if (hasPortrait) {
      const px = bx + 5, py = by + 6;
      ctx.fillStyle = vceColor(0, 0, 1);
      ctx.fillRect(px - 1, py - 1, 66, 66);
      ctx.strokeStyle = C_GOLD_MID;
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 0.5, py - 0.5, 65, 65);

      const curExpr = curLine?.expr || dialogueState.currentExpression || 'friendly';
      if (curPid === 'nyah') {
        portraitCanvas = renderNyahPortrait(
          curExpr,
          dialogueState.mouthFlap,
          dialogueState.eyeBlink,
          dialogueState.earTwitch
        );
      } else if (curPid === 'fifi') {
        portraitCanvas = (typeof renderFifiPortrait === 'function') ? renderFifiPortrait(
          curExpr,
          dialogueState.mouthFlap,
          dialogueState.eyeBlink
        ) : (window.getV5Canvas ? window.getV5Canvas('portrait_fifi_' + curExpr) : null);
      } else if (curPid === 'lumina') {
        portraitCanvas = renderLuminaPortrait(
          curExpr,
          dialogueState.mouthFlap,
          dialogueState.eyeBlink
        );
      } else {
        portraitCanvas = renderNpcPortrait(curPid, dialogueState.mouthFlap);
      }

      if (portraitCanvas) {
        const pop = dialogueState.portraitPop || 1.0;
        if (pop > 1.01) {
          ctx.save();
          ctx.translate(px + 32, py + 32);
          ctx.scale(pop, pop);
          ctx.drawImage(portraitCanvas, -32, -32);
          ctx.restore();
        } else {
          ctx.drawImage(portraitCanvas, px, py);
        }
      }
      nameX = px + 68;
      paneW = bw - (nameX - bx) - 4;
    }

    const nameY = by + 5;
    const speakerName = (curLine && curLine.speaker) ? curLine.speaker : ((dialogueState.npc && dialogueState.npc.name) ? dialogueState.npc.name : 'NOTICE');
    drawPixelText(ctx, `[${speakerName}]`, nameX, nameY, C_GOLD_HI, OUTLINE_COLOR);

    if (curLine) {
      const displayedText = curLine.text.substring(0, dialogueState.charIndex);
      const promptLines = wrapDialogueText(displayedText, hasPortrait ? 28 : 36);

      // The prompt always keeps the full 6-line pane. Choices used to be drawn in
      // the same box and the prompt was sliced to its last two lines to make room;
      // they now live in their own panel above the box.
      const maxVisible = 6;
      const scroll = Math.max(0, Math.min(dialogueState.scrollOffset || 0, Math.max(0, promptLines.length - maxVisible)));
      const visibleLines = promptLines.slice(scroll, scroll + maxVisible);

      ctx.save();
      ctx.beginPath();
      ctx.rect(nameX, by + 14, paneW, bh - 18);
      ctx.clip();

      let textY = by + 15;
      visibleLines.forEach(l => {
        drawPixelText(ctx, l, nameX, textY, vceColor(7, 7, 7), OUTLINE_COLOR);
        textY += 9;
      });

      ctx.restore();

      if (scroll > 0) {
        drawGlyph(ctx, '▲', bx + bw - 14, by + 5, C_GOLD_HI);
      }

      if (dialogueState.isComplete && scroll < promptLines.length - maxVisible) {
        if (Math.floor(Date.now() / 320) % 2 === 0) {
          drawGlyph(ctx, '▼', bx + bw - 14, by + bh - 11, C_GOLD_HI);
        }
      }
    }

    if (dialogueState.isComplete && dialogueState.activeChoices && dialogueState.activeChoices.length > 0) {
      renderDialogueChoicePanel(ctx, bx, by, bw);
    }
  }

  // Choices get their own framed panel above the dialogue box so the question
  // stays readable and four options fit without blind scrolling.
  function renderDialogueChoicePanel(ctx, boxX, boxY, boxW) {
    const choices = dialogueState.activeChoices || [];
    if (choices.length === 0) return;

    const panelW = 172;
    const panelX = boxX + boxW - panelW - 4;
    // 25 chars = 150 px; the panel's text column is ~157 px wide. Wrapping at 28
    // (168 px) used to push long labels over the right border.
    const items = choices.map(ch => ({ choice: ch, lines: wrapDialogueText(ch.label, 25) }));
    const rowH = item => item.lines.length * 8 + 2;
    const itemH = item => rowH(item) + 2;

    const maxPanelH = boxY - 10;
    const totalH = items.reduce((sum, it) => sum + itemH(it), 0);
    const panelH = Math.min(maxPanelH, totalH + 8);
    const panelY = boxY - panelH - 4;

    const selIdx = Math.max(0, Math.min(dialogueState.choiceIndex || 0, items.length - 1));
    let start = 0, end = items.length - 1;
    if (totalH + 8 > maxPanelH) {
      start = selIdx;
      end = selIdx;
      let used = itemH(items[selIdx]);
      while (start > 0 && used + itemH(items[start - 1]) <= maxPanelH - 8) {
        start--;
        used += itemH(items[start]);
      }
      while (end < items.length - 1 && used + itemH(items[end + 1]) <= maxPanelH - 8) {
        end++;
        used += itemH(items[end]);
      }
    }

    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.fillStyle = C_GOLD_HI;
    ctx.fillRect(panelX, panelY, panelW, 2);
    ctx.fillRect(panelX, panelY, 2, panelH);
    ctx.fillStyle = C_GOLD_SHD;
    ctx.fillRect(panelX, panelY + panelH - 2, panelW, 2);
    ctx.fillRect(panelX + panelW - 2, panelY, 2, panelH);

    let y = panelY + 5;
    for (let idx = start; idx <= end; idx++) {
      const item = items[idx];
      const isSelected = (idx === selIdx);
      if (isSelected && Math.floor(Date.now() / 180) % 2 === 0) {
        drawPixelText(ctx, '>', panelX + 5, y, C_GOLD_HI, OUTLINE_COLOR);
      }
      const col = isSelected ? vceColor(7, 7, 3) : vceColor(5, 5, 6);
      item.lines.forEach((cLine, cIdx) => {
        drawPixelText(ctx, cLine, panelX + 13, y + cIdx * 8, col, OUTLINE_COLOR);
      });
      y += itemH(item);
    }

    if (start > 0) {
      drawGlyph(ctx, '▲', panelX + panelW - 12, panelY + 4, C_GOLD_HI);
    }
    if (end < items.length - 1) {
      if (Math.floor(Date.now() / 320) % 2 === 0) {
        drawGlyph(ctx, '▼', panelX + panelW - 12, panelY + panelH - 12, C_GOLD_HI);
      }
    }
  }

  // =========================================================================
  // SECTION 9B: Retro Status / Bag / Quest / Save Menu
  // =========================================================================
  const statusMenuState = {
    open: false,
    activeTab: 0, // 0: Bag & Gear, 1: Quest Log & Bounties, 2: Save / Load, 3: Automap
    selectedIndex: 0,
    saveSlotIndex: 0
  };

  // Display names for the automap. Keep them short: the map pane is 130 px.
  const MAP_DISPLAY_NAMES = {
    aldenor_exterior: 'ALDENOR TOWN',
    aldenor_coastal_plains: 'COASTAL PLAINS',
    dungeon_mines: 'OLD QUARRY MINES',
    dungeon_crypts: 'COASTAL CRYPTS',
    dungeon_shrine: 'SUNKEN SHRINE',
    bell_spire: 'BELL SPIRE',
    harbor_tavern: 'HARBOR TAVERN',
    lumina_workshop: 'LUMINA WORKSHOP',
    goran_forge: 'GORAN FORGE',
    grand_manor_interior: 'GRAND MANOR',
    manor_parlor: 'GRAND MANOR'
  };

  function toggleStatusMenu() {
    if (dialogueState.active || transitionState.active || dialogueLogState.open) return;
    if (titleScreenState.active || introCinemaState.active || (typeof epilogueCinemaState !== 'undefined' && epilogueCinemaState.active)) return;
    statusMenuState.open = !statusMenuState.open;
    if (statusMenuState.open) {
      statusMenuState.selectedIndex = 0;
      playSfxBlip(1100);
    } else {
      playSfxBlip(800);
    }
  }

  // =========================================================================
  // Dialogue backlog overlay (L). Renders the last 80 spoken lines, newest at
  // the bottom, and pauses gameplay like the status menu does.
  // =========================================================================
  function toggleDialogueLog(open) {
    const want = (typeof open === 'boolean') ? open : !dialogueLogState.open;
    if (want && (dialogueState.active || transitionState.active || titleScreenState.active || introCinemaState.active || statusMenuState.open)) return false;
    dialogueLogState.open = want;
    if (want) {
      dialogueLogState.scroll = 999999;
      playSfxBlip(1100);
    } else {
      playSfxBlip(800);
    }
    return true;
  }

  function renderDialogueLog(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
    ctx.fillRect(0, 0, 256, 224);

    const bx = 6, by = 6, bw = 244, bh = 212;
    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = C_GOLD_HI;
    ctx.fillRect(bx, by, bw, 2);
    ctx.fillRect(bx, by, 2, bh);
    ctx.fillStyle = C_GOLD_SHD;
    ctx.fillRect(bx, by + bh - 2, bw, 2);
    ctx.fillRect(bx + bw - 2, by, 2, bh);

    drawPixelText(ctx, "DIALOGUE LOG", bx + 8, by + 8, C_GOLD_HI, OUTLINE_COLOR);
    drawPixelText(ctx, "[L] CLOSE", bx + bw - 60, by + 8, vceColor(5, 5, 5), OUTLINE_COLOR);

    const rows = [];
    dialogueLog.forEach(entry => {
      rows.push({ speaker: entry.speaker, text: null });
      wrapDialogueText(entry.text, 35).slice(0, 4).forEach(t => rows.push({ speaker: null, text: t }));
      rows.push({ speaker: null, text: '' });
    });

    const viewTop = by + 22;
    // Stop a row short of the hint strip so a wrapped line is never sliced by it.
    const viewBottom = by + bh - 20;
    const rowH = 9;
    const visibleRows = Math.floor((viewBottom - viewTop) / rowH);
    const maxScroll = Math.max(0, rows.length - visibleRows);
    dialogueLogState.scroll = Math.max(0, Math.min(maxScroll, dialogueLogState.scroll));
    const start = dialogueLogState.scroll;

    if (rows.length === 0) {
      drawPixelText(ctx, "NOTHING SAID YET.", bx + 8, viewTop, vceColor(5, 5, 5), OUTLINE_COLOR);
    }
    for (let i = 0; i < visibleRows && start + i < rows.length; i++) {
      const r = rows[start + i];
      const y = viewTop + i * rowH;
      if (r.speaker) {
        drawPixelText(ctx, `[${r.speaker}]`, bx + 8, y, vceColor(7, 5, 2), OUTLINE_COLOR);
      } else {
        drawPixelText(ctx, r.text, bx + 8, y, vceColor(6, 6, 6), OUTLINE_COLOR);
      }
    }

    if (rows.length > visibleRows) {
      const trackX = bx + bw - 9;
      const trackH = viewBottom - viewTop;
      ctx.fillStyle = vceColor(2, 2, 4);
      ctx.fillRect(trackX, viewTop, 2, trackH);
      const thumbH = Math.max(6, Math.round(trackH * visibleRows / rows.length));
      const thumbY = viewTop + Math.round((trackH - thumbH) * (start / Math.max(1, maxScroll)));
      ctx.fillStyle = C_GOLD_MID;
      ctx.fillRect(trackX, thumbY, 2, thumbH);
      drawPixelText(ctx, "UP/DOWN SCROLL", bx + 8, by + bh - 11, vceColor(4, 4, 4), OUTLINE_COLOR);
      drawPixelText(ctx, `${Math.min(rows.length, start + visibleRows)}/${rows.length}`, bx + bw - 52, by + bh - 11, vceColor(4, 4, 4), OUTLINE_COLOR);
    } else if (rows.length > 0) {
      drawPixelText(ctx, "UP/DOWN SCROLL", bx + 8, by + bh - 11, vceColor(4, 4, 4), OUTLINE_COLOR);
    }
  }

  function renderStatusMenu(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, 0, 256, 224);

    const drawBevelBox = (bx, by, bw, bh) => {
      ctx.fillStyle = vceColor(1, 1, 2);
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = C_GOLD_HI;
      ctx.fillRect(bx, by, bw, 1);
      ctx.fillRect(bx, by, 1, bh);
      ctx.fillStyle = C_GOLD_SHD;
      ctx.fillRect(bx, by + bh - 1, bw, 1);
      ctx.fillRect(bx + bw - 1, by, 1, bh);
    };

    // LEFT PANE: Hero Stats, Gear & Nyah Companion
    const lx = 6, ly = 6, lw = 110, lh = 212;
    drawBevelBox(lx, ly, lw, lh);

    drawPixelText(ctx, "ADOL CHRISTIN", lx + 6, ly + 6, C_GOLD_HI, OUTLINE_COLOR);
    drawPixelText(ctx, `LEVEL ${hero.level}`, lx + 6, ly + 18, vceColor(7, 7, 7), OUTLINE_COLOR);

    // HP Bar
    drawPixelText(ctx, "HP", lx + 6, ly + 29, C_GOLD_HI, OUTLINE_COLOR);
    ctx.fillStyle = vceColor(1, 0, 1);
    ctx.fillRect(lx + 22, ly + 29, 44, 7);
    const hpRatio = Math.max(0, Math.min(1, hero.hp / hero.maxHp));
    const hpBarW = Math.round(hpRatio * 42);
    if (hpBarW > 0) {
      ctx.fillStyle = vceColor(6, 1, 1);
      ctx.fillRect(lx + 23, ly + 30, hpBarW, 5);
      ctx.fillStyle = vceColor(7, 2, 2);
      ctx.fillRect(lx + 23, ly + 30, hpBarW, 1);
    }
    drawPixelText(ctx, `${hero.hp}/${hero.maxHp}`, lx + 68, ly + 29, vceColor(7, 7, 7), OUTLINE_COLOR);

    // EXP
    const expReq = getExpForLevel(hero.level);
    drawPixelText(ctx, `EXP ${hero.exp}/${expReq}`, lx + 6, ly + 40, vceColor(6, 6, 6), OUTLINE_COLOR);

    // STR & DEF Breakdown
    const totalStr = getTotalHeroStr();
    const totalDef = getTotalHeroDef();
    const wpnAtk = WEAPONS[hero.weapon] ? WEAPONS[hero.weapon].atk : 8;
    const armDef = ARMORS[hero.armor] ? ARMORS[hero.armor].def : 4;
    const extraDef = Math.max(0, totalDef - hero.baseDef - armDef);
    drawPixelText(ctx, `STR ${totalStr} (${hero.baseStr}+${wpnAtk})`, lx + 6, ly + 52, vceColor(7, 7, 3), OUTLINE_COLOR);
    drawPixelText(ctx, extraDef > 0 ? `DEF ${totalDef} (${hero.baseDef}+${armDef}+${extraDef})` : `DEF ${totalDef} (${hero.baseDef}+${armDef})`, lx + 6, ly + 62, vceColor(3, 7, 7), OUTLINE_COLOR);
    drawPixelText(ctx, `GOLD: ${flags.gold || 0} G`, lx + 6, ly + 72, C_GOLD_HI, OUTLINE_COLOR);

    // Divider line
    ctx.fillStyle = C_GOLD_SHD;
    ctx.fillRect(lx + 4, ly + 82, lw - 8, 1);

    // Equipped Gear
    drawPixelText(ctx, "EQUIPPED GEAR", lx + 6, ly + 86, C_GOLD_HI, OUTLINE_COLOR);
    const wpnName = WEAPONS[hero.weapon] ? WEAPONS[hero.weapon].name : "Rusty Blade";
    const armName = ARMORS[hero.armor] ? ARMORS[hero.armor].name : "Tunic";
    drawCompactText(ctx, `W: ${wpnName}`, lx + 6, ly + 97, vceColor(7, 7, 7), OUTLINE_COLOR);
    drawCompactText(ctx, `A: ${armName}`, lx + 6, ly + 107, vceColor(7, 7, 7), OUTLINE_COLOR);

    // QuickSlots
    const qs1 = hero.quickSlots[0] ? hero.quickSlots[0].replace('potion_', '').slice(0, 4) : '---';
    const qs2 = hero.quickSlots[1] ? hero.quickSlots[1].replace('potion_', '').slice(0, 4) : '---';
    const qs3 = hero.quickSlots[2] ? hero.quickSlots[2].replace('potion_', '').slice(0, 4) : '---';
    drawPixelText(ctx, "HOTKEYS:", lx + 6, ly + 118, vceColor(5, 7, 5), OUTLINE_COLOR);
    drawPixelText(ctx, `1:${qs1} 2:${qs2} 3:${qs3}`, lx + 6, ly + 128, vceColor(5, 7, 5), OUTLINE_COLOR);

    // Divider line
    ctx.fillStyle = C_GOLD_SHD;
    ctx.fillRect(lx + 4, ly + 137, lw - 8, 1);

    // Nyah Section
    drawPixelText(ctx, "NYAH COMPANION", lx + 6, ly + 141, vceColor(7, 4, 6), OUTLINE_COLOR);
    if (!flags.nyahJoinedParty) {
      drawPixelText(ctx, "STATUS: AT MANOR", lx + 6, ly + 153, vceColor(5, 5, 5), OUTLINE_COLOR);
      drawPixelText(ctx, "DELIVER TEA OR", lx + 6, ly + 163, vceColor(4, 4, 4), OUTLINE_COLOR);
      drawPixelText(ctx, "GO TO SOUTH GATE", lx + 6, ly + 173, vceColor(4, 4, 4), OUTLINE_COLOR);
    } else {
      drawPixelText(ctx, "STATUS: IN PARTY", lx + 6, ly + 152, vceColor(2, 7, 2), OUTLINE_COLOR);
      drawPixelText(ctx, "STYLE: [C] CYCLE", lx + 6, ly + 162, C_GOLD_HI, OUTLINE_COLOR);
      const accName = nyahCompanion.accessory.replace('_', ' ').toUpperCase();
      drawPixelText(ctx, accName.slice(0, 16), lx + 6, ly + 172, vceColor(7, 6, 2), OUTLINE_COLOR);
      let perkText = "PANIC HEAL (35%)";
      if (nyahCompanion.accessory === 'silver_bell') perkText = "HEAL+ (50% HP)";
      else      if (nyahCompanion.accessory === 'crimson_ribbon') perkText = "CLAW CRIT+ (+25%)";
      else if (nyahCompanion.accessory === 'moonlight_cloak') perkText = "SWIFT FLURRY (0.5s)";
      drawPixelText(ctx, perkText, lx + 6, ly + 183, vceColor(3, 7, 7), OUTLINE_COLOR);
    }

    // RIGHT PANE: Tabs & Content
    const rx = 120, ry = 6, rw = 130, rh = 212;
    drawBevelBox(rx, ry, rw, rh);

    // Tab Headers. Four tabs at a 31 px pitch: plain labels, gold bar behind the
    // active one. Bracketed labels ("[QUEST]") are 42 px wide and collided with
    // the next tab at any pitch that fits four.
    // "LOG" rather than "QUEST": at 6 px per glyph, "QUEST" + "SAVE" only
    // leaves a 1 px gap inside the 130 px pane.
    const tabs = ["BAG", "LOG", "SAVE", "MAP"];
    for (let t = 0; t < tabs.length; t++) {
      const tx = rx + 4 + t * 31;
      const isActive = (statusMenuState.activeTab === t);
      if (isActive) {
        ctx.fillStyle = C_GOLD_HI;
        ctx.fillRect(tx - 1, ry + 4, 31, 12);
        drawPixelText(ctx, tabs[t], tx, ry + 6, vceColor(0, 0, 1), OUTLINE_COLOR);
      } else {
        drawPixelText(ctx, tabs[t], tx, ry + 6, vceColor(5, 5, 5), OUTLINE_COLOR);
      }
    }

    ctx.fillStyle = C_GOLD_SHD;
    ctx.fillRect(rx + 4, ry + 18, rw - 8, 1);

    // TAB 0: BAG & GEAR
    if (statusMenuState.activeTab === 0) {
      if (hero.bag.length === 0) {
        drawPixelText(ctx, "INVENTORY EMPTY", rx + 14, ry + 36, vceColor(5, 5, 5), OUTLINE_COLOR);
      } else {
        const maxVisible = 7;
        const totalItems = hero.bag.length;
        statusMenuState.selectedIndex = Math.max(0, Math.min(totalItems - 1, statusMenuState.selectedIndex));
        const startIdx = Math.max(0, Math.min(statusMenuState.selectedIndex - 3, totalItems - maxVisible));

        for (let i = 0; i < maxVisible && (startIdx + i) < totalItems; i++) {
          const itemIdx = startIdx + i;
          const entry = hero.bag[itemIdx];
          const isSel = (itemIdx === statusMenuState.selectedIndex);
          const rowY = ry + 24 + i * 14;

          if (isSel) {
            ctx.fillStyle = vceColor(2, 2, 5);
            ctx.fillRect(rx + 6, rowY - 2, rw - 12, 12);
            drawPixelText(ctx, ">", rx + 8, rowY, C_GOLD_HI, OUTLINE_COLOR);
          }

          let name = entry.id;
          if (CONSUMABLES[entry.id]) name = CONSUMABLES[entry.id].name;
          else if (WEAPONS[entry.id]) name = WEAPONS[entry.id].name;
          else if (ARMORS[entry.id]) name = ARMORS[entry.id].name;
          else if (KEY_ITEMS[entry.id]) name = KEY_ITEMS[entry.id].name;

          const label = `${entry.qty}x ${name}`;
          drawCompactText(ctx, label, rx + 18, rowY, isSel ? vceColor(7, 7, 7) : vceColor(5, 5, 5), OUTLINE_COLOR);
        }

        // Selected Item Description Box (y = ry + 130, h = 44)
        const curEntry = hero.bag[statusMenuState.selectedIndex];
        if (curEntry) {
          ctx.fillStyle = vceColor(0, 0, 2);
          ctx.fillRect(rx + 6, ry + 130, rw - 12, 44);
          ctx.strokeStyle = C_GOLD_SHD;
          ctx.strokeRect(rx + 6, ry + 130, rw - 12, 44);

          let desc = "A curious adventure item.";
          if (CONSUMABLES[curEntry.id]) desc = CONSUMABLES[curEntry.id].desc;
          else if (WEAPONS[curEntry.id]) desc = WEAPONS[curEntry.id].desc;
          else if (ARMORS[curEntry.id]) desc = ARMORS[curEntry.id].desc;
          else if (KEY_ITEMS[curEntry.id]) desc = KEY_ITEMS[curEntry.id].desc;

          const descLines = wrapDialogueText(desc, 19);
          descLines.slice(0, 4).forEach((dl, di) => {
            drawPixelText(ctx, dl, rx + 10, ry + 134 + di * 9, vceColor(7, 6, 3), OUTLINE_COLOR);
          });
        }

        // Action Hints (spaced 9px apart vertically)
        drawPixelText(ctx, "[SPACE] USE/EQUIP", rx + 8, ry + 182, C_GOLD_HI, OUTLINE_COLOR);
        drawPixelText(ctx, "[1-3] SET HOTKEY", rx + 8, ry + 191, vceColor(3, 7, 7), OUTLINE_COLOR);
      }
    }
    // TAB 1: QUEST LOG & BOUNTIES
    else if (statusMenuState.activeTab === 1) {
      drawPixelText(ctx, `MAIN STORY: CH ${flags.chapter || 1}`, rx + 6, ry + 24, C_GOLD_HI, OUTLINE_COLOR);

      drawPixelText(ctx, "BELL RELICS:", rx + 6, ry + 36, vceColor(7, 7, 7), OUTLINE_COLOR);
      drawPixelText(ctx, `FORK:    ${flags.bellForkFound ? 'OK' : '---'}`, rx + 10, ry + 46, flags.bellForkFound ? vceColor(3, 7, 3) : vceColor(5, 5, 5), OUTLINE_COLOR);
      drawPixelText(ctx, `CLAPPER: ${flags.bellClapperFound ? 'OK' : '---'}`, rx + 10, ry + 56, flags.bellClapperFound ? vceColor(3, 7, 3) : vceColor(5, 5, 5), OUTLINE_COLOR);
      drawPixelText(ctx, `CREST:   ${flags.sanctumCrestFound ? 'OK' : '---'}`, rx + 10, ry + 66, flags.sanctumCrestFound ? vceColor(3, 7, 3) : vceColor(5, 5, 5), OUTLINE_COLOR);

      ctx.fillStyle = C_GOLD_SHD;
      ctx.fillRect(rx + 4, ry + 78, rw - 8, 1);

      drawPixelText(ctx, "TAVERN BOUNTIES:", rx + 6, ry + 82, C_GOLD_HI, OUTLINE_COLOR);
      const sDone = flags.bountiesClaimed.includes('bounty_slimes');
      const sCount = flags.bountyProgress.slime || 0;
      drawPixelText(ctx, `SLIMES: ${sDone ? 'DONE' : `${sCount}/5`} (60G)`, rx + 10, ry + 93, sDone ? vceColor(3, 7, 3) : vceColor(7, 7, 7), OUTLINE_COLOR);

      const cDone = flags.bountiesClaimed.includes('bounty_crabs');
      const cCount = flags.bountyProgress.crab || 0;
      drawPixelText(ctx, `CRABS:  ${cDone ? 'DONE' : `${cCount}/3`} (90G)`, rx + 10, ry + 103, cDone ? vceColor(3, 7, 3) : vceColor(7, 7, 7), OUTLINE_COLOR);

      ctx.fillStyle = C_GOLD_SHD;
      ctx.fillRect(rx + 4, ry + 115, rw - 8, 1);

      drawPixelText(ctx, "TOWN REQUESTS:", rx + 6, ry + 120, C_GOLD_HI, OUTLINE_COLOR);
      const mStatus = flags.mochiQuestDone ? "SAFE" : (flags.hasMochi ? "TO LYLA" : (flags.mochiQuestActive ? "PLAINS N." : "SEE LYLA"));
      drawPixelText(ctx, `MOCHI: ${mStatus}`, rx + 10, ry + 131, flags.mochiQuestDone ? vceColor(3, 7, 3) : vceColor(7, 6, 2), OUTLINE_COLOR);

      const pStatus = flags.peteQuestDone ? "DONE" : (hasItem('brass_locket') ? "TO PETE" : (flags.peteQuestActive ? "HUNT CRABS" : "SEE PETE"));
      drawPixelText(ctx, `LOCKET: ${pStatus}`, rx + 10, ry + 143, flags.peteQuestDone ? vceColor(3, 7, 3) : vceColor(7, 6, 2), OUTLINE_COLOR);
    }
    // TAB 2: SAVE & LOAD
    else if (statusMenuState.activeTab === 2) {
      drawPixelText(ctx, "DATA STORAGE (V4)", rx + 6, ry + 24, C_GOLD_HI, OUTLINE_COLOR);

      let allSaves = {};
      try {
        allSaves = JSON.parse(localStorage.getItem(SAVE_KEY_V4) || '{}');
      } catch (e) {}

      const slots = [
        { key: 'slot_0', label: "SLOT 1" },
        { key: 'slot_1', label: "SLOT 2" },
        { key: 'slot_2', label: "SLOT 3" },
        { key: 'auto',   label: "AUTO-SAVE" },
        { key: 'title',  label: "TITLE SCREEN" }
      ];

      statusMenuState.saveSlotIndex = Math.max(0, Math.min(4, statusMenuState.saveSlotIndex));

      slots.forEach((s, idx) => {
        const isSel = (idx === statusMenuState.saveSlotIndex);
        const sy = ry + 36 + idx * 24;

        if (isSel) {
          ctx.fillStyle = vceColor(2, 2, 5);
          ctx.fillRect(rx + 6, sy - 2, rw - 12, 22);
          drawPixelText(ctx, ">", rx + 8, sy, C_GOLD_HI, OUTLINE_COLOR);
        }

        if (s.key === 'title') {
          drawPixelText(ctx, s.label, rx + 18, sy, isSel ? C_GOLD_HI : vceColor(7, 6, 2), OUTLINE_COLOR);
          drawPixelText(ctx, "[RETURN TO TITLE]", rx + 18, sy + 10, isSel ? vceColor(3, 7, 7) : vceColor(4, 4, 4), OUTLINE_COLOR);
        } else {
          const data = allSaves[s.key];
          drawPixelText(ctx, s.label, rx + 18, sy, isSel ? C_GOLD_HI : vceColor(6, 6, 6), OUTLINE_COLOR);
          if (data && data.hero) {
            const mapName = (data.activeMapId || 'town').replace('aldenor_', '').replace('dungeon_', '').slice(0, 10);
            drawPixelText(ctx, `LV:${data.hero.level} [${mapName}]`, rx + 18, sy + 10, vceColor(3, 7, 7), OUTLINE_COLOR);
          } else {
            drawPixelText(ctx, "[EMPTY RECORD]", rx + 18, sy + 10, vceColor(4, 4, 4), OUTLINE_COLOR);
          }
        }
      });

      // Save/Load Controls (spaced cleanly above footer)
      drawPixelText(ctx, "[Z]SAVE [SPACE]LOAD", rx + 8, ry + 164, C_GOLD_HI, OUTLINE_COLOR);
      drawPixelText(ctx, "[T] TITLE SCREEN", rx + 8, ry + 176, vceColor(7, 6, 2), OUTLINE_COLOR);
    }
    // TAB 3: AUTOMAP
    else if (statusMenuState.activeTab === 3) {
      const map = MAPS[activeMapId];
      const seen = mapExploration[activeMapId];
      drawPixelText(ctx, "AUTOMAP", rx + 6, ry + 24, C_GOLD_HI, OUTLINE_COLOR);
      drawPixelText(ctx, (MAP_DISPLAY_NAMES[activeMapId] || activeMapId).slice(0, 19), rx + 6, ry + 34, vceColor(3, 7, 7), OUTLINE_COLOR);

      if (!map) {
        drawPixelText(ctx, "NO SURVEY DATA", rx + 12, ry + 56, vceColor(5, 5, 5), OUTLINE_COLOR);
      } else {
        const scale = Math.max(1, Math.min(3, Math.floor(112 / Math.max(map.width, map.height))));
        const gw = map.width * scale, gh = map.height * scale;
        const gx = rx + Math.floor((rw - gw) / 2), gy = ry + 44;
        ctx.fillStyle = vceColor(0, 0, 1);
        ctx.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
        ctx.fillStyle = C_GOLD_SHD;
        ctx.fillRect(gx - 3, gy - 3, gw + 6, 1);
        ctx.fillRect(gx - 3, gy + gh + 2, gw + 6, 1);
        ctx.fillRect(gx - 3, gy - 3, 1, gh + 6);
        ctx.fillRect(gx + gw + 2, gy - 3, 1, gh + 6);

        // Only visited tiles are drawn, so the shape of the dungeon is the
        // player's own record of where they have been.
        if (seen && seen.size > 0) {
          for (let ty = 0; ty < map.height; ty++) {
            for (let tx = 0; tx < map.width; tx++) {
              if (!seen.has(ty * map.width + tx)) continue;
              ctx.fillStyle = map.collisionMap[ty * map.width + tx] ? vceColor(3, 2, 5) : vceColor(2, 5, 4);
              ctx.fillRect(gx + tx * scale, gy + ty * scale, scale, scale);
            }
          }
          const htx = Math.floor((hero.x + 8) / TILE_SZ);
          const hty = Math.floor((hero.y + 12) / TILE_SZ);
          ctx.fillStyle = vceColor(7, 7, 2);
          ctx.fillRect(gx + htx * scale - 1, gy + hty * scale - 1, scale + 2, scale + 2);
        } else {
          drawPixelText(ctx, "NO SURVEY DATA", rx + 12, ry + 80, vceColor(5, 5, 5), OUTLINE_COLOR);
        }

        const total = map.width * map.height;
        const pct = seen ? Math.min(100, Math.round((seen.size / total) * 100)) : 0;
        drawPixelText(ctx, `SURVEYED: ${pct}%`, rx + 6, ry + 148, vceColor(7, 7, 7), OUTLINE_COLOR);
        ctx.fillStyle = vceColor(2, 5, 4);
        ctx.fillRect(rx + 6, ry + 160, 6, 6);
        drawPixelText(ctx, "FLOOR", rx + 16, ry + 160, vceColor(5, 5, 5), OUTLINE_COLOR);
        ctx.fillStyle = vceColor(3, 2, 5);
        ctx.fillRect(rx + 52, ry + 160, 6, 6);
        drawPixelText(ctx, "WALL", rx + 62, ry + 160, vceColor(5, 5, 5), OUTLINE_COLOR);
        drawPixelText(ctx, "YELLOW = YOU", rx + 6, ry + 172, vceColor(7, 6, 2), OUTLINE_COLOR);
      }
    }

    // Bottom Navigation Bar (spaced 9px below previous lines)
    drawPixelText(ctx, "[Q] PREV [TAB] NEXT", rx + 8, ry + 200, vceColor(5, 5, 5), OUTLINE_COLOR);
    drawPixelText(ctx, "[I/ESC] CLOSE", lx + 6, ly + 198, vceColor(5, 5, 5), OUTLINE_COLOR);
  }

  // =========================================================================
  // SECTION 9B-2: PC-Engine CD Main Menu (Title Screen)
  // =========================================================================
  function returnToTitleScreen() {
    if (titleScreenState.active) return;
    autoSave();
    hero.isAttacking = false;
    hero.isSpinning = false;
    hero.chargeTimer = 0;
    hero.chargeReady = false;
    if (typeof epilogueCinemaState !== 'undefined') epilogueCinemaState.active = false;
    if (typeof introCinemaState !== 'undefined') introCinemaState.active = false;
    if (typeof statusMenuState !== 'undefined') statusMenuState.open = false;
    if (typeof dialogueState !== 'undefined') dialogueState.active = false;
    titleScreenState.active = true;
    titleScreenState.mode = 'main';
    titleScreenState.cursor = 0;
    playUiConfirm();
  }

  function startNewGame() {
    hero.level = 1;
    hero.exp = 0;
    hero.hp = 100;
    hero.maxHp = 100;
    hero.baseStr = 10;
    hero.baseDef = 5;
    hero.weapon = 'rusty_sword';
    hero.armor = 'traveler_tunic';
    hero.shield = 'none';
    hero.accessory = null;
    hero.bag = [
      { id: 'potion_heal', qty: 3 },
      { id: 'potion_antidote', qty: 1 }
    ];
    hero.quickSlots = ['potion_heal', 'potion_antidote', null];
    hero.perks = [];
    hero.x = 240;
    hero.y = 272;
    hero.dir = 0;
    // A new run must not inherit the previous run's TP, permanent HP bonus or
    // combat/transient state. These used to leak across New Game.
    hero.vx = 0;
    hero.vy = 0;
    hero.isMoving = false;
    hero.animFrame = 0;
    hero.animTimer = 0;
    hero.tp = 0;
    hero.bonusMaxHp = 0;
    hero.invulnTimer = 0;
    hero.attackTimer = 0;
    hero.attackCooldown = 0;
    hero.dodgeTimer = 0;
    hero.dodgeCooldown = 0;
    hero.dodgeDirX = 0;
    hero.dodgeDirY = 0;
    hero.stamina = 100;
    hero.staminaMax = 100;
    hero.staminaRegenDelay = 0;
    hero.chargeTimer = 0;
    hero.chargeReady = false;
    hero.slowTimer = 0;
    hero.regenTimer = 0;
    hero.idleTimer = 0;
    hero.isAttacking = false;
    hero.isSpinning = false;
    hero.squashX = 1.0;
    hero.squashY = 1.0;
    syncInventoryBridge();
    updateHudBars();

    flags.talkedToElf = false;
    flags.talkedToNyah = false;
    flags.nyahRantedAboutElf = false;
    flags.nyahVisitedFirst = false;
    flags.elfVisitedFirst = false;
    flags.isTwilight = false;
    flags.inventory = null;
    flags.pinConfiscated = false;
    flags.seagullSolved = false;
    flags.seagullStep = 0;
    flags.manorUnlocked = false;
    flags.workshopUnlocked = false;
    flags.gold = 0;
    flags.heroRescuedByNyah = false;
    flags.nyahJoinedParty = false;
    flags.nyahPerks = [];
    flags.nyahAffection = 0;
    flags.nyahCosmetic = 'maid';
    flags.tavern_pass = false;
    flags.chapter = 1;
    flags.bountiesClaimed = [];
    flags.bountyProgress = { slime: 0, crab: 0, bat: 0, beetle: 0, skeleton: 0, triton: 0, cave_bat: 0, rock_beetle: 0, skeleton_knight: 0, armored_triton: 0 };
    flags.peteQuestActive = false;
    flags.peteQuestDone = false;
    flags.mochiQuestActive = false;
    flags.mochiQuestDone = false;
    flags.mochiFound = false;
    flags.hasMochi = false;
    flags.kittenRescued = false;
    flags.bellForkFound = false;
    flags.bellClapperFound = false;
    flags.sanctumCrestFound = false;
    flags.bossDefeated = { boss_golem: false, boss_lich: false, boss_leviathan: false, boss_eclipse: false };
    flags.bossGolemDefeated = false;
    flags.bossLichDefeated = false;
    flags.bossLeviathanDefeated = false;
    flags.bossEclipseDefeated = false;
    flags.bossGolemCutscene = false;
    flags.bossLichCutscene = false;
    flags.bossLeviathanCutscene = false;
    flags.bossEclipseCutscene = false;
    flags.fifiRecruited = true;
    flags.nyahRecruited = false;
    flags.nyahCallsMaster = false;
    flags.rivalMaidTrialStep = 0;
    flags.southGateSlimesCleared = 0;
    flags.nyahInFrontSlot = false;
    flags.nyahThreatenedLeash = false;
    flags.foundVelvetRibbon = false;
    flags.fifiLeashedInManor = false;
    flags.southGateAmbushShown = false;
    flags.manorChestOpened = false;
    flags.guardianDevotionUsed = false;
    flags.introWatched = false;
    flags.gameCompleted = false;
    resetMapExploration();
    dialogueLog.length = 0;
    dialogueLogState.open = false;
    dialogueLogState.scroll = 0;

    dungeonState.minesTrackSwitch1 = false;
    dungeonState.minesTrackSwitch2 = false;
    dungeonState.minesBarricadeBroken = false;
    dungeonState.minesCartCleared = false;
    dungeonState.minesChestWeapon = false;
    dungeonState.minesChestArmor = false;
    dungeonState.minesChestRibbon = false;
    dungeonState.minesShortcutOpen = false;
    dungeonState.cryptSkullLevers = [false, false, false];
    dungeonState.cryptPortcullisOpen = false;
    dungeonState.cryptsBraziersLit = false;
    dungeonState.cryptBraziers = [false, false, false, false, false, false, false, false];
    dungeonState.cryptChestFlame = false;
    dungeonState.cryptChestShield = false;
    dungeonState.cryptShortcutOpen = false;
    dungeonState.shrineWaterLevel = 0;
    dungeonState.shrineWaterDrained = false;
    dungeonState.shrineValve1 = false;
    dungeonState.shrineValve2 = false;
    dungeonState.shrineChestClerici = false;
    dungeonState.shrineChestArmor = false;
    dungeonState.shrineChestCloak = false;
    dungeonState.shrineShortcutOpen = false;
    dungeonState.spireGateOpen = false;

    nyahCompanion.accessory = 'default_ribbon';
    nyahCompanion.perks = [];
    nyahCompanion.trailBuffer = [];
    if (window.fifiCompanion) {
      window.fifiCompanion.x = 368;
      window.fifiCompanion.y = 352;
      window.fifiCompanion.dir = 1;
      window.fifiCompanion.attackCooldown = 0;
      window.fifiCompanion.healCooldown = 0;
      window.fifiCompanion.castTimer = 0;
    }
    hero.slowTimer = 0;
    hero.chargeTimer = 0;
    hero.chargeReady = false;
    hero.isSpinning = false;
    hero.regenTimer = 0;
    statusMenuState.open = false;
    jealousWedgeTimer = 0;
    starburstCutinTimer = 0;
    starburstPillars = [];
    dawnAuraTimer = 0;
    buildAllMaps();

    activeMapId = 'aldenor_exterior';
    // Rebuild the trail, camera, companions, monsters, NPC schedules and HUD
    // through the same path used by loading a save.
    refreshWorldAfterLoad();
  }

  const titleScreenState = {
    active: true,
    cursor: 0,
    mode: 'main', // 'main' | 'slots'
    slotCursor: 0
  };

  function updateTitleScreen(dt) {
    if (titleScreenState.mode === 'main') {
      if (consumeJustPressed('ArrowUp') || consumeJustPressed('KeyW')) {
        titleScreenState.cursor = (titleScreenState.cursor + 2) % 3;
        playSfxBlip(950);
      }
      if (consumeJustPressed('ArrowDown') || consumeJustPressed('KeyS')) {
        titleScreenState.cursor = (titleScreenState.cursor + 1) % 3;
        playSfxBlip(950);
      }
      if (consumeJustPressed('Space') || consumeJustPressed('Enter') || consumeJustPressed('KeyZ') || consumeJustPressed('KeyE')) {
        if (titleScreenState.cursor === 0) {
          // NEW GAME
          startNewGame();
          titleScreenState.active = false;
          introCinemaState.active = true;
          introCinemaState.currentCard = 0;
          introCinemaState.charIndex = 0;
          introCinemaState.crawlTimer = 0;
          introCinemaState.scrollOffset = 0;
          introCinemaState.isComplete = false;
          playUiConfirm();
        } else if (titleScreenState.cursor === 1) {
          // CONTINUE
          let loaded = loadGame(0, true);
          if (!loaded) loaded = loadGame(0, false);
          if (loaded) {
            titleScreenState.active = false;
            introCinemaState.active = false;
            playUiConfirm();
          } else {
            playSfxBlip(400);
          }
        } else if (titleScreenState.cursor === 2) {
          // LOAD RECORD
          titleScreenState.mode = 'slots';
          titleScreenState.slotCursor = 0;
          playSfxBlip(1100);
        }
      }
    } else if (titleScreenState.mode === 'slots') {
      if (consumeJustPressed('ArrowUp') || consumeJustPressed('KeyW')) {
        titleScreenState.slotCursor = (titleScreenState.slotCursor + 3) % 4;
        playSfxBlip(950);
      }
      if (consumeJustPressed('ArrowDown') || consumeJustPressed('KeyS')) {
        titleScreenState.slotCursor = (titleScreenState.slotCursor + 1) % 4;
        playSfxBlip(950);
      }
      if (consumeJustPressed('Escape')) {
        titleScreenState.mode = 'main';
        playSfxBlip(800);
        return;
      }
      if (consumeJustPressed('Space') || consumeJustPressed('Enter') || consumeJustPressed('KeyZ') || consumeJustPressed('KeyE')) {
        if (titleScreenState.slotCursor === 3) {
          // BACK
          titleScreenState.mode = 'main';
          playSfxBlip(800);
        } else {
          const loaded = loadGame(titleScreenState.slotCursor, false);
          if (loaded) {
            titleScreenState.active = false;
            introCinemaState.active = false;
            playUiConfirm();
          } else {
            playSfxBlip(400);
          }
        }
      }
    }
  }

  function renderTitleScreen(ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 224);

    // Deep Twilight Sky Gradient
    for (let y = 0; y < 136; y += 4) {
      const ratio = y / 136;
      const r = Math.round(0 + ratio * 2);
      const g = Math.round(0 + ratio * 1);
      const b = Math.round(1 + ratio * 3);
      ctx.fillStyle = vceColor(r, g, b);
      ctx.fillRect(0, y, 256, 4);
    }

    // Twinkling Pixel Stars
    const timeSec = Date.now() / 350;
    const starCoords = [
      [24, 18], [68, 12], [112, 22], [160, 14], [210, 20], [242, 16],
      [44, 38], [92, 42], [140, 32], [188, 36], [230, 44], [15, 62],
      [78, 68], [198, 64], [132, 72]
    ];
    starCoords.forEach(([sx, sy], idx) => {
      const b = Math.floor(Math.sin(timeSec + idx) * 2 + 5);
      ctx.fillStyle = vceColor(b, b, b);
      ctx.fillRect(sx, sy, 1, 1);
    });

    // Distant Silhouette of Aldenor Coastline & Northern Bell Tower
    ctx.fillStyle = vceColor(0, 0, 2);
    ctx.fillRect(180, 52, 16, 84);
    ctx.fillRect(184, 38, 8, 14);
    ctx.fillRect(187, 26, 2, 12);
    ctx.beginPath();
    ctx.moveTo(120, 136);
    ctx.lineTo(150, 94);
    ctx.lineTo(180, 102);
    ctx.lineTo(210, 88);
    ctx.lineTo(256, 114);
    ctx.lineTo(256, 136);
    ctx.fill();

    // Ocean Waves
    for (let y = 136; y < 164; y += 4) {
      const r = (y % 8 === 0) ? vceColor(1, 1, 4) : vceColor(0, 1, 3);
      ctx.fillStyle = r;
      ctx.fillRect(0, y, 256, 4);
    }
    const waveShift = Math.floor(Date.now() / 240) % 8;
    ctx.fillStyle = vceColor(3, 5, 7);
    for (let wx = 16; wx < 256; wx += 28) {
      ctx.fillRect(wx + waveShift, 142 + (wx % 3) * 6, 8, 1);
    }

    // Foreground Grassy Harbor Overlook Cliff
    ctx.fillStyle = vceColor(1, 2, 2);
    for (let cy = 158; cy < 224; cy += 4) {
      const cw = Math.max(30, Math.round(92 - (cy - 158) * 0.45));
      ctx.fillRect(0, cy, cw, 4);
    }
    ctx.fillStyle = vceColor(2, 3, 2);
    ctx.fillRect(0, 158, 88, 3);

    // Adol, Nyah & Fifi Overworld Chibis overlooking the bay
    const fifiSpr = (typeof tileCanvasesMidday !== 'undefined' && (tileCanvasesMidday['fifiRight0'] || tileCanvasesMidday['fifiIdle0'])) || (typeof atlas !== 'undefined' && atlas['fifiIdle0']);
    if (fifiSpr) ctx.drawImage(fifiSpr, 12, 136);
    const adolSpr = (typeof tileCanvasesMidday !== 'undefined' && tileCanvasesMidday['heroRight0']) || (typeof atlas !== 'undefined' && atlas['heroRight0']);
    if (adolSpr) ctx.drawImage(adolSpr, 34, 136);
    const nyahSpr = (typeof tileCanvasesMidday !== 'undefined' && (tileCanvasesMidday['nyahRight0'] || tileCanvasesMidday['nyahIdle0'])) || (typeof atlas !== 'undefined' && atlas['nyahIdle0']);
    if (nyahSpr) ctx.drawImage(nyahSpr, 56, 136);

    // Framed Nyah & Fifi Portrait Cameos flanking the Main Menu Box
    const nyahPort = (typeof renderNyahPortrait === 'function') ? renderNyahPortrait('smug', false, false, false) : (window.getV5Canvas ? window.getV5Canvas('portrait_nyah') : null);
    if (nyahPort) {
      ctx.fillStyle = vceColor(0, 0, 1);
      ctx.fillRect(14, 76, 52, 52);
      ctx.strokeStyle = C_GOLD_HI;
      ctx.strokeRect(14.5, 76.5, 51, 51);
      ctx.drawImage(nyahPort, 16, 78, 48, 48);
      drawPixelText(ctx, "NYAH", 28, 130, vceColor(7, 4, 6), OUTLINE_COLOR);
    }
    const fifiPort = (typeof renderFifiPortrait === 'function') ? renderFifiPortrait('normal', false, false) : (window.getV5Canvas ? window.getV5Canvas('portrait_fifi') : null);
    if (fifiPort) {
      ctx.fillStyle = vceColor(0, 0, 1);
      ctx.fillRect(190, 76, 52, 52);
      ctx.strokeStyle = C_GOLD_HI;
      ctx.strokeRect(190.5, 76.5, 51, 51);
      ctx.drawImage(fifiPort, 192, 78, 48, 48);
      drawPixelText(ctx, "FIFI", 204, 130, vceColor(7, 6, 4), OUTLINE_COLOR);
    }

    // Version Stamp in Top-Right Corner
    drawPixelText(ctx, "v0.10.0", 208, 6, vceColor(7, 6, 2), OUTLINE_COLOR);

    // Title Header & Double Gold Banners
    drawPixelText(ctx, "PROJECT NYAH", 86, 18, vceColor(7, 2, 2), OUTLINE_COLOR);
    drawPixelText(ctx, "PROJECT NYAH", 85, 17, vceColor(7, 6, 1), OUTLINE_COLOR);

    // Subtitle Banner
    ctx.fillStyle = vceColor(0, 1, 3);
    ctx.fillRect(36, 32, 184, 16);
    ctx.fillStyle = vceColor(7, 6, 1);
    ctx.fillRect(36, 32, 184, 1);
    ctx.fillRect(36, 47, 184, 1);
    ctx.fillRect(36, 32, 1, 16);
    ctx.fillRect(219, 32, 1, 16);
    drawPixelText(ctx, "THE BELL OF ALDENOR", 52, 37, vceColor(7, 7, 7), OUTLINE_COLOR);

    drawPixelText(ctx, "PC-ENGINE CD-ROM2 ACTION RPG", 38, 54, vceColor(6, 5, 2), OUTLINE_COLOR);

    // Menu Box
    const bx = 76, by = 70, bw = 104, bh = 92;
    ctx.fillStyle = vceColor(1, 1, 2);
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = C_GOLD_HI;
    ctx.fillRect(bx, by, bw, 2);
    ctx.fillRect(bx, by, 2, bh);
    ctx.fillStyle = C_GOLD_SHD;
    ctx.fillRect(bx, by + bh - 2, bw, 2);
    ctx.fillRect(bx + bw - 2, by, 2, bh);

    if (titleScreenState.mode === 'main') {
      const items = [
        { label: "NEW GAME",  desc: "Start Adol's Voyage" },
        { label: "CONTINUE",  desc: "Resume Auto-Save" },
        { label: "LOAD GAME", desc: "Select Record 1-3" }
      ];

      items.forEach((item, idx) => {
        const iy = by + 12 + idx * 24;
        const isSel = (idx === titleScreenState.cursor);
        if (isSel) {
          ctx.fillStyle = vceColor(2, 2, 5);
          ctx.fillRect(bx + 4, iy - 2, bw - 8, 20);
          drawPixelText(ctx, ">", bx + 6, iy + 4, C_GOLD_HI, OUTLINE_COLOR);
        }
        drawPixelText(ctx, item.label, bx + 16, iy + 4, isSel ? C_GOLD_HI : vceColor(7, 7, 7), OUTLINE_COLOR);
      });
    } else if (titleScreenState.mode === 'slots') {
      let allSaves = {};
      try {
        allSaves = JSON.parse(localStorage.getItem(SAVE_KEY_V4) || '{}');
      } catch (e) {}

      const slotItems = [
        { key: 'slot_0', label: "SLOT 1" },
        { key: 'slot_1', label: "SLOT 2" },
        { key: 'slot_2', label: "SLOT 3" },
        { key: 'back',   label: "< BACK" }
      ];

      slotItems.forEach((s, idx) => {
        const sy = by + 8 + idx * 20;
        const isSel = (idx === titleScreenState.slotCursor);
        if (isSel) {
          ctx.fillStyle = vceColor(2, 2, 5);
          ctx.fillRect(bx + 4, sy - 1, bw - 8, 18);
          drawPixelText(ctx, ">", bx + 6, sy + 3, C_GOLD_HI, OUTLINE_COLOR);
        }
        if (s.key === 'back') {
          drawPixelText(ctx, s.label, bx + 16, sy + 3, isSel ? C_GOLD_HI : vceColor(6, 6, 6), OUTLINE_COLOR);
        } else {
          const rec = allSaves[s.key];
          drawPixelText(ctx, s.label, bx + 16, sy + 1, isSel ? C_GOLD_HI : vceColor(7, 7, 7), OUTLINE_COLOR);
          if (rec && rec.hero) {
            drawPixelText(ctx, `LV:${rec.hero.level}`, bx + 64, sy + 1, vceColor(3, 7, 7), OUTLINE_COLOR);
          } else {
            drawPixelText(ctx, "--", bx + 64, sy + 1, vceColor(4, 4, 4), OUTLINE_COLOR);
          }
        }
      });
    }

    // Flashing Prompt & Retro Copyright
    const blink = Math.floor(Date.now() / 380) % 2 === 0;
    if (blink) {
      drawPixelText(ctx, "PUSH SPACE TO BEGIN", 62, 178, vceColor(7, 6, 1), OUTLINE_COLOR);
    }
    drawPixelText(ctx, "[UP/DOWN: SELECT  ENTER/SPACE: RUN]", 18, 194, vceColor(5, 5, 5), OUTLINE_COLOR);
    drawPixelText(ctx, "(C) 1989-1993 FALCOM / NIHON PCE CD", 18, 208, vceColor(4, 4, 4), OUTLINE_COLOR);
  }

  // =========================================================================
  // SECTION 9C: Layered 5-Card PC-Engine CD Intro Cinematic
  // =========================================================================
  const introCinemaState = {
    active: false,
    currentCard: 0,
    charIndex: 0,
    crawlTimer: 0,
    scrollOffset: 0,
    isComplete: false
  };

  const INTRO_CARDS = [
    {
      title: "VOYAGE TO ALDENOR",
      text: "The Sea of Esteria whispers of forgotten lands. Adol Christin, red-haired adventurer, sails toward the remote island town of Aldenor..."
    },
    {
      title: "THE SACRED BELL TOWER",
      text: "High above the village stands the sacred Bell Tower of Aldenor. For three centuries, its silver chime held the abyssal twilight shadows at bay."
    },
    {
      title: "THE CURSED SLUMBER",
      text: "Until one moonless night, three abyssal lords breached the sanctum. They stole the Bell's sacred relics, plunging the Lord of Aldenor into a deathlike slumber."
    },
    {
      title: "THE GUARDIAN'S STAND",
      text: "With the town guard overwhelmed, the manor's fiercely loyal catgirl Nyah refuses to yield. 'I don't care how many monsters are out there... nyah won't let the Manor fall!'"
    },
    {
      title: "PROJECT NYAH: THE BELL OF ALDENOR",
      text: "A PC-Engine CD-ROM² Adventure. Press [SPACE] or [ENTER] to begin Adol's journey at Aldenor Pier!"
    }
  ];

  function finishIntroCinema() {
    introCinemaState.active = false;
    introCinemaState.scrollOffset = 0;
    flags.introWatched = true;
    try {
      localStorage.setItem('aldenor_intro_watched', 'true');
    } catch (e) {}
    startMapTransition('aldenor_exterior', 384, 352, 1);
  }

  function updateIntroCinema(dt) {
    if (consumeJustPressed('Escape')) {
      finishIntroCinema();
      return;
    }

    const card = INTRO_CARDS[introCinemaState.currentCard];
    const pageSize = 4;
    const typedLinesNow = wrapDialogueText(card.text.substring(0, introCinemaState.charIndex), 36);
    // Page starts are 0, 4, 8...; the last page may be short. Do not clamp to
    // `lineCount - 4`, or a five-line card repeats three lines on page two.
    const maxPageStart = Math.max(0, Math.floor((typedLinesNow.length - 1) / pageSize) * pageSize);

    if (introCinemaState.isComplete) {
      // Page through the card four lines at a time while it is fully revealed.
      if (consumeJustPressed('ArrowUp') || consumeJustPressed('KeyW')) {
        if (introCinemaState.scrollOffset > 0) {
          introCinemaState.scrollOffset = Math.max(0, introCinemaState.scrollOffset - pageSize);
          playSfxBlip(900);
        }
      }
      if (consumeJustPressed('ArrowDown') || consumeJustPressed('KeyS')) {
        if (introCinemaState.scrollOffset < maxPageStart) {
          introCinemaState.scrollOffset = Math.min(maxPageStart, introCinemaState.scrollOffset + pageSize);
          playSfxBlip(900);
        }
      }
    } else if (typedLinesNow.length > pageSize) {
      // While the crawl runs, follow the newest page instead of sliding by line.
      introCinemaState.scrollOffset = Math.floor((typedLinesNow.length - 1) / pageSize) * pageSize;
    }

    if (!introCinemaState.isComplete) {
      introCinemaState.crawlTimer += dt;
      if (introCinemaState.crawlTimer >= 0.035) {
        introCinemaState.crawlTimer = 0;
        introCinemaState.charIndex++;
        const ch = card.text[introCinemaState.charIndex - 1];
        if (ch && ch !== ' ') {
          if (typeof playVoiceBlip === 'function') {
            playVoiceBlip('narrator', 'normal', ch.charCodeAt(0));
          } else {
            playSfxBlip(1200);
          }
        }
        if (introCinemaState.charIndex >= card.text.length) {
          introCinemaState.isComplete = true;
        }
        const currentWrapped = wrapDialogueText(card.text.substring(0, introCinemaState.charIndex), 36);
        if (currentWrapped.length > pageSize) {
          introCinemaState.scrollOffset = Math.floor((currentWrapped.length - 1) / pageSize) * pageSize;
        }
      }
    }

    if (consumeJustPressed('Space') || consumeJustPressed('Enter') || consumeJustPressed('KeyE')) {
      if (!introCinemaState.isComplete) {
        // Skipping the crawl rewinds to the top of the card so the player can
        // read it page by page instead of being dumped on the last four lines.
        introCinemaState.charIndex = card.text.length;
        introCinemaState.isComplete = true;
        introCinemaState.scrollOffset = 0;
      } else if (introCinemaState.scrollOffset < maxPageStart) {
        introCinemaState.scrollOffset = Math.min(maxPageStart, introCinemaState.scrollOffset + pageSize);
        playSfxBlip(900);
      } else {
        if (introCinemaState.currentCard < INTRO_CARDS.length - 1) {
          introCinemaState.currentCard++;
          introCinemaState.charIndex = 0;
          introCinemaState.crawlTimer = 0;
          introCinemaState.scrollOffset = 0;
          introCinemaState.isComplete = false;
          playSfxBlip(1400);
        } else {
          finishIntroCinema();
        }
      }
    }
  }

  function renderIntroCinema(ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 224);

    const cardIdx = introCinemaState.currentCard;

    if (cardIdx === 0) {
      for (let y = 16; y < 84; y += 4) {
        const ratio = (y - 16) / 68;
        const r = Math.round(2 + ratio * 4);
        const g = Math.round(1 + ratio * 2);
        const b = Math.round(4 - ratio * 2);
        ctx.fillStyle = vceColor(r, g, b);
        ctx.fillRect(0, y, 256, 4);
      }
      ctx.fillStyle = vceColor(1, 1, 2);
      ctx.beginPath();
      ctx.moveTo(170, 84);
      ctx.lineTo(195, 62);
      ctx.lineTo(215, 72);
      ctx.lineTo(235, 56);
      ctx.lineTo(256, 84);
      ctx.fill();

      for (let y = 84; y < 160; y += 8) {
        ctx.fillStyle = (y % 16 === 0) ? vceColor(1, 2, 5) : vceColor(0, 1, 3);
        ctx.fillRect(0, y, 256, 8);
      }
      const waveOffset = Math.floor(Date.now() / 180) % 8;
      ctx.fillStyle = vceColor(7, 7, 7);
      for (let x = 60; x < 256; x += 32) {
        ctx.fillRect(x + waveOffset, 96 + (x % 3) * 16, 6, 1);
        ctx.fillRect(x + waveOffset + 2, 97 + (x % 3) * 16, 3, 1);
      }

      ctx.fillStyle = vceColor(3, 2, 1);
      for (let py = 76; py < 160; py += 4) {
        const pw = Math.max(20, Math.round(68 - (py - 76) * 0.4));
        ctx.fillRect(0, py, pw, 4);
      }
      const adolSpr = tileCanvasesMidday['heroRight0'];
      if (adolSpr) ctx.drawImage(adolSpr, 32, 74);
    } else if (cardIdx === 1) {
      for (let y = 16; y < 90; y += 6) {
        ctx.fillStyle = vceColor(0, 0, Math.round(1 + (y - 16) / 37));
        ctx.fillRect(0, y, 256, 6);
      }
      ctx.fillStyle = vceColor(0, 1, 3);
      ctx.fillRect(0, 130, 256, 30);
      ctx.fillStyle = vceColor(2, 2, 3);
      ctx.fillRect(0, 90, 120, 70);
      ctx.fillRect(160, 100, 96, 60);

      ctx.fillStyle = vceColor(3, 3, 4);
      ctx.fillRect(116, 32, 24, 98);
      ctx.fillStyle = vceColor(2, 2, 3);
      ctx.fillRect(114, 30, 28, 6);
      ctx.fillStyle = vceColor(0, 0, 1);
      ctx.fillRect(122, 42, 12, 18);
      ctx.fillStyle = vceColor(6, 4, 1);
      ctx.fillRect(124, 46, 8, 10);
      ctx.fillStyle = vceColor(7, 6, 2);
      ctx.fillRect(126, 48, 4, 3);

      const miasmaTime = Date.now() / 200;
      for (let m = 0; m < 8; m++) {
        const mx = 128 + Math.cos(miasmaTime + m) * (14 + m * 2);
        const my = 52 + Math.sin(miasmaTime + m * 1.5) * (10 + m);
        ctx.fillStyle = (m % 2 === 0) ? vceColor(5, 1, 6) : vceColor(3, 0, 4);
        ctx.fillRect(Math.round(mx), Math.round(my), 2, 2);
      }
    } else if (cardIdx === 2) {
      ctx.fillStyle = vceColor(1, 1, 2);
      ctx.fillRect(0, 16, 256, 144);
      for (let y = 100; y < 160; y += 8) {
        ctx.fillStyle = (y % 16 === 0) ? vceColor(2, 1, 1) : vceColor(3, 2, 1);
        ctx.fillRect(0, y, 256, 8);
      }
      ctx.fillStyle = vceColor(5, 1, 2);
      ctx.fillRect(78, 50, 100, 56);
      ctx.fillStyle = vceColor(7, 6, 2);
      ctx.fillRect(76, 48, 104, 3);
      ctx.fillStyle = vceColor(6, 6, 6);
      ctx.fillRect(94, 70, 72, 28);
      ctx.fillStyle = vceColor(7, 5, 4);
      ctx.fillRect(98, 74, 14, 12);
      ctx.fillStyle = vceColor(5, 1, 6);
      ctx.fillRect(40, 120, 24, 4);
      ctx.fillRect(56, 114, 6, 12);
      ctx.fillRect(180, 118, 32, 4);
      ctx.fillRect(194, 110, 8, 14);
    } else if (cardIdx === 3) {
      ctx.fillStyle = vceColor(2, 2, 3);
      ctx.fillRect(0, 16, 256, 80);
      for (let s = 0; s < 5; s++) {
        ctx.fillStyle = (s % 2 === 0) ? vceColor(4, 4, 4) : vceColor(3, 3, 3);
        ctx.fillRect(0, 96 + s * 12, 256, 12);
      }
      ctx.fillStyle = vceColor(7, 1, 1);
      const blinkM = Math.floor(Date.now() / 400) % 3;
      if (blinkM !== 0) {
        ctx.fillRect(36, 50, 2, 2); ctx.fillRect(41, 50, 2, 2);
        ctx.fillRect(68, 64, 2, 2); ctx.fillRect(73, 64, 2, 2);
        ctx.fillRect(190, 52, 2, 2); ctx.fillRect(195, 52, 2, 2);
        ctx.fillRect(220, 60, 2, 2); ctx.fillRect(225, 60, 2, 2);
      }
      const nyahSpr = tileCanvasesMidday['nyahClaw0'] || tileCanvasesMidday['nyahIdle0'];
      if (nyahSpr) ctx.drawImage(nyahSpr, 112, 88, 32, 32);
    } else if (cardIdx === 4) {
      ctx.fillStyle = vceColor(0, 0, 2);
      ctx.fillRect(0, 16, 256, 124);
      ctx.fillStyle = vceColor(7, 7, 7);
      const stars = [[24, 24], [56, 32], [90, 20], [140, 26], [180, 20], [220, 28], [40, 60], [210, 68]];
      stars.forEach(([sx, sy]) => ctx.fillRect(sx, sy, 1, 1));

      // Deep midnight navy banner fill with gold double-border
      ctx.fillStyle = vceColor(0, 1, 3);
      ctx.fillRect(20, 22, 216, 96);
      ctx.fillStyle = vceColor(7, 6, 1);
      ctx.fillRect(20, 22, 216, 1);
      ctx.fillRect(20, 117, 216, 1);
      ctx.fillRect(20, 22, 1, 96);
      ctx.fillRect(235, 22, 1, 96);
      ctx.fillRect(22, 24, 212, 1);
      ctx.fillRect(22, 115, 212, 1);
      ctx.fillRect(22, 24, 1, 92);
      ctx.fillRect(233, 24, 1, 92);

      drawPixelText(ctx, "PROJECT NYAH", 88, 34, vceColor(7, 6, 1), OUTLINE_COLOR);
      drawPixelText(ctx, "THE BELL OF ALDENOR", 64, 50, vceColor(7, 7, 7), OUTLINE_COLOR);
      drawPixelText(ctx, "PC-ENGINE CD-ROM2 ADVENTURE", 46, 72, vceColor(3, 7, 7), OUTLINE_COLOR);
      drawPixelText(ctx, "- FALCOM RETRO ENGINE -", 58, 86, vceColor(6, 5, 2), OUTLINE_COLOR);
    }

    const card = INTRO_CARDS[cardIdx];
    const tbX = 8, tbY = 140, tbW = 240, tbH = 76;
    ctx.fillStyle = vceColor(1, 0, 3);
    ctx.fillRect(tbX, tbY, tbW, tbH);
    ctx.fillStyle = vceColor(7, 6, 1);
    ctx.fillRect(tbX, tbY, tbW, 1);
    ctx.fillRect(tbX, tbY, 1, tbH);
    ctx.fillRect(tbX, tbY + tbH - 1, tbW, 1);
    ctx.fillRect(tbX + tbW - 1, tbY, 1, tbH);

    drawPixelText(ctx, card.title, 14, 145, vceColor(7, 6, 1), OUTLINE_COLOR);

    const typedText = card.text.substring(0, introCinemaState.charIndex);
    const lines = wrapDialogueText(typedText, 36);
    const maxVisible = 4;
    const maxScroll = Math.max(0, Math.floor((lines.length - 1) / maxVisible) * maxVisible);
    const scroll = Math.max(0, Math.min(introCinemaState.scrollOffset, maxScroll));
    const visibleLines = lines.slice(scroll, scroll + maxVisible);
    visibleLines.forEach((line, li) => {
      drawPixelText(ctx, line, 14, 156 + li * 9, vceColor(7, 7, 7), OUTLINE_COLOR);
    });

    if (scroll > 0) {
      drawGlyph(ctx, '▲', tbX + tbW - 14, 156, C_GOLD_HI);
    }
    if (scroll < maxScroll) {
      if (Math.floor(Date.now() / 320) % 2 === 0) {
        drawGlyph(ctx, '▼', tbX + tbW - 14, 156 + 3 * 9, C_GOLD_HI);
      }
    }

    drawPixelText(ctx, "[SPACE: NEXT]", 14, 204, vceColor(7, 6, 1), OUTLINE_COLOR);
    drawPixelText(ctx, "[ESC: SKIP]", 172, 204, vceColor(5, 5, 5), OUTLINE_COLOR);
  }

  // =========================================================================
  // SECTION 9D: Layered 5-Card PC-Engine CD Dawn Epilogue Cinematic
  // =========================================================================
  const epilogueCinemaState = {
    active: false,
    currentCard: 0,
    charIndex: 0,
    crawlTimer: 0,
    animTimer: 0,
    scrollOffset: 0,
    isComplete: false
  };

  const EPILOGUE_CARDS = [
    {
      title: "THE BELL OF ALDENOR RESTORED",
      speaker: null,
      portrait: null,
      text: "The Shadow of the Eclipse dissolves in a brilliant cascade of starlight! Adol and Nyah place the Tuning Fork, Clapper, and Sanctum Crest into the ancient bronze bell. With a resonant silver chime, the sacred ward awakens!"
    },
    {
      title: "THE MANOR AWAKENS",
      speaker: null,
      portrait: null,
      text: "Across the island of Aldenor, the sacred bell tolls. Inside the Grand Manor, the Lord awakens as the purple curse crystals shatter into golden dust. In the courtyard below, Elder Gared, Lumina, and Goran cheer with tears of relief!"
    },
    {
      title: "DAWN OVER ALDENOR",
      speaker: "NYAH",
      portrait: "normal",
      text: "Listen to that echo, Master... You can hear the Bell all the way out past the harbor lighthouse. The curse is really gone. The Lord is awake, the town is safe... and it's all because you didn't give up on us."
    },
    {
      title: "THE GUARDIAN'S PROMISE",
      speaker: "NYAH",
      portrait: "flustered",
      text: "...Hey. Don't think this means your contract with nyah is finished! You still owe me at least a hundred more tea parties, and somebody has to make sure you don't get pinched by crabs on your next voyage."
    },
    {
      title: "TOGETHER FOREVER",
      speaker: "NYAH",
      portrait: "smug",
      text: "Wherever you go next—whether it's around Aldenor or across the whole Sea of Esteria—nyah is staying right here by your side. Got it, Master? Good. ...Now hold still, the wind messed up your hair again."
    },
    {
      title: "PROJECT NYAH: VICTORY & PEACE RESTORED",
      speaker: null,
      portrait: null,
      text: "The Shadow of the Eclipse has fallen! The sacred Bell of Aldenor chimes across the realm. Its last light cools into the Crown of the Dawn: undead now burn near you, even in the deepest crypt. Chapter 5: Dawn of Peace unlocked. All dungeons, shops, and Nyah's perks remain open for post-game exploration!"
    }
  ];

  function startEpilogueCinema() {
    epilogueCinemaState.active = true;
    epilogueCinemaState.currentCard = 0;
    epilogueCinemaState.charIndex = 0;
    epilogueCinemaState.crawlTimer = 0;
    epilogueCinemaState.animTimer = 0;
    epilogueCinemaState.scrollOffset = 0;
    epilogueCinemaState.isComplete = false;
    flags.bossEclipseDefeated = true;
    flags.gameCompleted = true;
    flags.chapter = 5;
    flags.isTwilight = false;
    autoSave();
    playSfxBellTolling();
  }

  function finishEpilogueCinema() {
    epilogueCinemaState.active = false;
    flags.bossEclipseDefeated = true;
    flags.gameCompleted = true;
    flags.chapter = 5;
    flags.isTwilight = false;
    autoSave();
    startMapTransition('aldenor_exterior', 384, 160, 0);
    playUiConfirm();
  }

  function updateEpilogueCinema(dt) {
    epilogueCinemaState.animTimer += dt;

    if (consumeJustPressed('Escape')) {
      finishEpilogueCinema();
      return;
    }

    const card = EPILOGUE_CARDS[epilogueCinemaState.currentCard];
    const pageSize = 4;
    const wrapWidth = card.portrait ? 25 : 36;
    const typedLines = wrapDialogueText(card.text.substring(0, epilogueCinemaState.charIndex), wrapWidth);
    const maxPageStart = Math.max(0, Math.floor((typedLines.length - 1) / pageSize) * pageSize);

    if (epilogueCinemaState.isComplete) {
      if (consumeJustPressed('ArrowUp') || consumeJustPressed('KeyW')) {
        if (epilogueCinemaState.scrollOffset > 0) {
          epilogueCinemaState.scrollOffset = Math.max(0, epilogueCinemaState.scrollOffset - pageSize);
          playSfxBlip(900);
        }
      }
      if (consumeJustPressed('ArrowDown') || consumeJustPressed('KeyS')) {
        if (epilogueCinemaState.scrollOffset < maxPageStart) {
          epilogueCinemaState.scrollOffset = Math.min(maxPageStart, epilogueCinemaState.scrollOffset + pageSize);
          playSfxBlip(900);
        }
      }
    } else if (typedLines.length > pageSize) {
      epilogueCinemaState.scrollOffset = Math.floor((typedLines.length - 1) / pageSize) * pageSize;
    }
    if (!epilogueCinemaState.isComplete) {
      epilogueCinemaState.crawlTimer += dt;
      if (epilogueCinemaState.crawlTimer >= 0.032) {
        epilogueCinemaState.crawlTimer = 0;
        epilogueCinemaState.charIndex++;
        const ch = card.text[epilogueCinemaState.charIndex - 1];
        if (ch && ch !== ' ') {
          if (typeof playVoiceBlip === 'function') {
            const spk = card.speaker ? card.speaker.toLowerCase() : 'narrator';
            playVoiceBlip(spk, card.portrait || 'normal', ch.charCodeAt(0));
          } else {
            playSfxBlip(1200);
          }
        }
        if (epilogueCinemaState.charIndex >= card.text.length) {
          epilogueCinemaState.isComplete = true;
          // Natural completion keeps the crawl's current page; skipping resets
          // to page one below so nothing is silently scrolled past.
        }
      }
    }

    if (consumeJustPressed('Space') || consumeJustPressed('Enter') || consumeJustPressed('KeyZ') || consumeJustPressed('KeyE')) {
      if (!epilogueCinemaState.isComplete) {
        epilogueCinemaState.charIndex = card.text.length;
        epilogueCinemaState.isComplete = true;
        epilogueCinemaState.scrollOffset = 0;
      } else if (epilogueCinemaState.scrollOffset < maxPageStart) {
        epilogueCinemaState.scrollOffset = Math.min(maxPageStart, epilogueCinemaState.scrollOffset + pageSize);
        playSfxBlip(900);
      } else {
        if (epilogueCinemaState.currentCard < EPILOGUE_CARDS.length - 1) {
          epilogueCinemaState.currentCard++;
          epilogueCinemaState.charIndex = 0;
          epilogueCinemaState.crawlTimer = 0;
          epilogueCinemaState.scrollOffset = 0;
          epilogueCinemaState.isComplete = false;
          playSfxBlip(1400);
        } else {
          finishEpilogueCinema();
        }
      }
    }
  }

  function renderEpilogueCinema(ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 224);

    const cardIdx = epilogueCinemaState.currentCard;
    const anim = epilogueCinemaState.animTimer;

    // SCENE ARTWORK (y = 0..139)
    if (cardIdx === 0) {
      // CARD 0: Bell Spire Altar Restoration Chime
      for (let y = 16; y < 80; y += 4) {
        const t = (y - 16) / 64;
        const r = Math.round(1 + t * 5);
        const g = Math.round(0 + t * 4);
        const b = Math.round(2 + (1 - t) * 3);
        ctx.fillStyle = vceColor(r, g, b);
        ctx.fillRect(0, y, 256, 4);
      }
      ctx.fillStyle = vceColor(1, 1, 2);
      ctx.fillRect(0, 80, 256, 12);
      for (let y = 92; y < 140; y += 6) {
        ctx.fillStyle = (y % 12 === 0) ? vceColor(3, 3, 3) : vceColor(2, 2, 3);
        ctx.fillRect(0, y, 256, 6);
      }
      ctx.fillStyle = vceColor(4, 4, 4);
      ctx.fillRect(32, 48, 16, 56);
      ctx.fillRect(208, 48, 16, 56);
      ctx.fillStyle = vceColor(5, 5, 5);
      ctx.fillRect(30, 44, 20, 4);
      ctx.fillRect(206, 44, 20, 4);

      // Great Bronze Bell at Center (x: 112..144, y: 36..80)
      ctx.fillStyle = vceColor(4, 3, 1);
      ctx.fillRect(122, 28, 12, 10);
      ctx.fillStyle = vceColor(6, 5, 2);
      ctx.fillRect(116, 38, 24, 8);
      ctx.fillRect(112, 46, 32, 22);
      ctx.fillRect(108, 68, 40, 6);
      ctx.fillStyle = C_GOLD_HI;
      ctx.fillRect(114, 48, 4, 18);
      ctx.fillRect(110, 70, 36, 2);
      ctx.fillStyle = vceColor(7, 7, 7);
      ctx.fillRect(126, 70, 4, 7);

      // Resonant harmonic pulses
      const pulseTime = anim * 3;
      for (let r = 0; r < 3; r++) {
        const ringDist = ((pulseTime + r * 1.2) % 3.6) * 18;
        if (ringDist > 4) {
          ctx.fillStyle = (r % 2 === 0) ? C_GOLD_HI : vceColor(7, 7, 5);
          const cx = 128, cy = 60;
          ctx.fillRect(Math.round(cx - ringDist), cy, 2, 2);
          ctx.fillRect(Math.round(cx + ringDist), cy, 2, 2);
          ctx.fillRect(cx, Math.round(cy - ringDist * 0.7), 2, 2);
          ctx.fillRect(cx, Math.round(cy + ringDist * 0.7), 2, 2);
          ctx.fillRect(Math.round(cx - ringDist * 0.7), Math.round(cy - ringDist * 0.5), 1, 1);
          ctx.fillRect(Math.round(cx + ringDist * 0.7), Math.round(cy - ringDist * 0.5), 1, 1);
          ctx.fillRect(Math.round(cx - ringDist * 0.7), Math.round(cy + ringDist * 0.5), 1, 1);
          ctx.fillRect(Math.round(cx + ringDist * 0.7), Math.round(cy + ringDist * 0.5), 1, 1);
        }
      }

      for (let p = 0; p < 8; p++) {
        const px = (p * 31 + Math.sin(anim * 2 + p) * 12) % 256;
        const py = 120 - ((anim * 25 + p * 15) % 100);
        ctx.fillStyle = (p % 2 === 0) ? C_GOLD_HI : vceColor(7, 7, 7);
        ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
      }

      const adolSpr = tileCanvasesMidday['heroRight0'];
      if (adolSpr) ctx.drawImage(adolSpr, 80, 84);
      const nyahSpr = tileCanvasesMidday['nyahIdle0'];
      if (nyahSpr) ctx.drawImage(nyahSpr, 156, 84);

    } else if (cardIdx === 1) {
      // CARD 1: Grand Manor Parlor Awakening
      ctx.fillStyle = vceColor(3, 3, 4);
      ctx.fillRect(0, 16, 256, 68);
      ctx.fillStyle = vceColor(3, 2, 1);
      ctx.fillRect(0, 84, 256, 56);
      for (let w = 0; w < 3; w++) {
        const wx = 36 + w * 76;
        ctx.fillStyle = vceColor(7, 6, 2);
        ctx.fillRect(wx, 26, 32, 44);
        ctx.fillStyle = vceColor(7, 7, 7);
        ctx.fillRect(wx + 4, 30, 24, 36);
        ctx.fillStyle = vceColor(4, 3, 1);
        ctx.fillRect(wx + 15, 30, 2, 36);
        ctx.fillRect(wx + 4, 47, 24, 2);

        ctx.fillStyle = 'rgba(255, 230, 120, 0.18)';
        ctx.beginPath();
        ctx.moveTo(wx, 70);
        ctx.lineTo(wx + 32, 70);
        ctx.lineTo(wx + 52, 136);
        ctx.lineTo(wx - 10, 136);
        ctx.fill();
      }
      ctx.fillStyle = vceColor(4, 2, 1);
      ctx.fillRect(92, 68, 72, 38);
      ctx.fillStyle = vceColor(5, 1, 1);
      ctx.fillRect(96, 76, 64, 26);
      ctx.fillStyle = vceColor(7, 7, 7);
      ctx.fillRect(100, 78, 20, 10);
      ctx.fillStyle = vceColor(6, 6, 6);
      ctx.fillRect(116, 64, 12, 14);
      ctx.fillStyle = vceColor(7, 5, 4);
      ctx.fillRect(118, 58, 8, 8);
      ctx.fillStyle = vceColor(5, 5, 5);
      ctx.fillRect(116, 56, 12, 4);

      for (let c = 0; c < 10; c++) {
        const cx = 80 + (c * 13) % 96;
        const cy = 60 + Math.sin(anim * 3 + c) * 20;
        ctx.fillStyle = (c % 2 === 0) ? C_GOLD_HI : vceColor(5, 1, 5);
        ctx.fillRect(Math.round(cx), Math.round(cy), 2, 2);
      }

    } else if (cardIdx === 2 || cardIdx === 3 || cardIdx === 4) {
      // CARDS 2, 3, 4: Cliffside Spire Balcony Dawn Overlook
      for (let y = 16; y < 86; y += 2) {
        const ratio = (y - 16) / 70;
        let r, g, b;
        if (ratio < 0.45) {
          const t = ratio / 0.45;
          r = Math.round(3 + t * 4);
          g = Math.round(5 - t * 2);
          b = Math.round(7 - t * 3);
        } else {
          const t = (ratio - 0.45) / 0.55;
          r = 7;
          g = Math.round(3 + t * 2);
          b = Math.round(4 - t * 2);
        }
        ctx.fillStyle = vceColor(r, g, b);
        ctx.fillRect(0, y, 256, 2);
      }

      // Rising sun disc
      ctx.fillStyle = vceColor(7, 7, 7);
      ctx.fillRect(120, 78, 16, 8);
      ctx.fillStyle = C_GOLD_HI;
      ctx.fillRect(116, 80, 24, 6);
      ctx.fillRect(112, 82, 32, 4);

      // Sea horizon
      for (let y = 86; y < 120; y += 3) {
        ctx.fillStyle = (y % 6 === 0) ? vceColor(1, 3, 6) : vceColor(0, 2, 4);
        ctx.fillRect(0, y, 256, 3);
        const glareW = Math.max(12, Math.round(36 - (y - 86) * 0.5));
        ctx.fillStyle = ((y + Math.floor(anim * 4)) % 6 === 0) ? C_GOLD_HI : vceColor(7, 6, 2);
        ctx.fillRect(128 - Math.round(glareW / 2), y, glareW, 2);
      }

      const waveShift = Math.floor(anim * 3) % 4;
      for (let s = 0; s < 6; s++) {
        const sx = (s * 42 + waveShift * 8) % 256;
        const sy = 90 + (s * 5) % 24;
        ctx.fillStyle = vceColor(7, 7, 5);
        ctx.fillRect(sx, sy, 3, 1);
      }

      ctx.fillStyle = vceColor(2, 2, 3);
      ctx.fillRect(0, 84, 52, 10);
      ctx.fillRect(16, 74, 8, 14);
      ctx.fillStyle = C_GOLD_HI;
      ctx.fillRect(18, 72, 4, 3);

      ctx.fillStyle = vceColor(4, 4, 4);
      ctx.fillRect(0, 114, 256, 4);
      ctx.fillStyle = C_GOLD_HI;
      ctx.fillRect(0, 114, 256, 1);
      for (let b = 8; b < 256; b += 16) {
        ctx.fillStyle = vceColor(3, 3, 4);
        ctx.fillRect(b, 118, 4, 10);
      }
      ctx.fillStyle = vceColor(2, 2, 3);
      ctx.fillRect(0, 128, 256, 12);

      const adolSpr = tileCanvasesMidday['heroRight0'];
      if (adolSpr) ctx.drawImage(adolSpr, 110, 94);

      if (cardIdx === 4) {
        const nyahSpr = tileCanvasesMidday['nyahIdle0'];
        if (nyahSpr) ctx.drawImage(nyahSpr, 124, 94);
        ctx.fillStyle = vceColor(1, 1, 1);
        ctx.fillRect(122, 104, 5, 2);
        ctx.fillRect(120, 102, 3, 3);
      } else {
        const nyahSpr = tileCanvasesMidday['nyahIdle0'];
        if (nyahSpr) ctx.drawImage(nyahSpr, 126, 94);
      }

      for (let m = 0; m < 5; m++) {
        const mx = (256 - ((anim * 30 + m * 55) % 270));
        const my = 40 + (m * 18 + Math.sin(anim * 2 + m) * 8) % 70;
        ctx.fillStyle = (m % 2 === 0) ? vceColor(7, 5, 6) : vceColor(7, 7, 7);
        ctx.fillRect(Math.round(mx), Math.round(my), 2, 1);
      }

    } else if (cardIdx === 5) {
      // CARD 5: Falcom PC-Engine CD Grand Victory Plaque
      for (let y = 16; y < 140; y += 4) {
        const t = (y - 16) / 124;
        const r = Math.round(1 + t * 4);
        const g = Math.round(1 + t * 3);
        const b = Math.round(4 - t * 2);
        ctx.fillStyle = vceColor(r, g, b);
        ctx.fillRect(0, y, 256, 4);
      }

      const stars = [[20, 24], [48, 30], [84, 22], [140, 28], [178, 20], [214, 26], [32, 64], [228, 70]];
      ctx.fillStyle = vceColor(7, 7, 7);
      stars.forEach(([sx, sy]) => ctx.fillRect(sx, sy, 1, 1));

      const bx = 16, by = 22, bw = 224, bh = 100;
      ctx.fillStyle = vceColor(0, 1, 3);
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = C_GOLD_HI;
      ctx.fillRect(bx, by, bw, 2);
      ctx.fillRect(bx, by + bh - 2, bw, 2);
      ctx.fillRect(bx, by, 2, bh);
      ctx.fillRect(bx + bw - 2, by, 2, bh);
      ctx.fillStyle = C_GOLD_MID;
      ctx.fillRect(bx + 3, by + 3, bw - 6, 1);
      ctx.fillRect(bx + 3, by + bh - 4, bw - 6, 1);
      ctx.fillRect(bx + 3, by + 3, 1, bh - 6);
      ctx.fillRect(bx + bw - 4, by + 3, 1, bh - 6);

      drawPixelText(ctx, "PROJECT NYAH: THE BELL OF ALDENOR", 28, 34, C_GOLD_HI, OUTLINE_COLOR);
      drawPixelText(ctx, "- VICTORY & PEACE RESTORED -", 44, 48, vceColor(7, 7, 7), OUTLINE_COLOR);
      drawPixelText(ctx, "THE SACRED BELL'S CURSE IS BROKEN!", 24, 64, vceColor(3, 7, 7), OUTLINE_COLOR);
      drawPixelText(ctx, "ADOL & NYAH'S VOYAGE CONTINUES", 38, 78, vceColor(7, 6, 2), OUTLINE_COLOR);
      drawPixelText(ctx, "CHAPTER 5: POST-GAME FREE ROAM", 36, 94, vceColor(3, 7, 3), OUTLINE_COLOR);
    }

    // NARRATIVE & DIALOGUE TEXT BOX (tbX: 8, tbY: 140, tbW: 240, tbH: 76)
    const card = EPILOGUE_CARDS[cardIdx];
    const tbX = 8, tbY = 140, tbW = 240, tbH = 76;
    ctx.fillStyle = vceColor(1, 0, 3);
    ctx.fillRect(tbX, tbY, tbW, tbH);
    ctx.fillStyle = C_GOLD_HI;
    ctx.fillRect(tbX, tbY, tbW, 1);
    ctx.fillRect(tbX, tbY, 1, tbH);
    ctx.fillStyle = C_GOLD_SHD;
    ctx.fillRect(tbX, tbY + tbH - 1, tbW, 1);
    ctx.fillRect(tbX + tbW - 1, tbY, 1, tbH);

    const typedText = card.text.substring(0, epilogueCinemaState.charIndex);

    if (card.portrait) {
      const px = tbX + 6, py = tbY + 6;
      ctx.fillStyle = vceColor(0, 0, 1);
      ctx.fillRect(px - 1, py - 1, 66, 66);
      ctx.strokeStyle = C_GOLD_MID;
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 0.5, py - 0.5, 65, 65);

      const mouthFlap = (!epilogueCinemaState.isComplete && Math.floor(anim * 12) % 2 === 1);
      const eyeBlink = (Math.floor(anim * 2.5) % 8 === 0);
      const earTwitch = (Math.floor(anim * 1.8) % 6 === 0);
      const portrait = renderNyahPortrait(card.portrait, mouthFlap, eyeBlink, earTwitch);
      if (portrait) {
        ctx.drawImage(portrait, px, py);
      }

      const nameX = px + 70;
      drawPixelText(ctx, card.speaker || "NYAH", nameX, tbY + 6, C_GOLD_HI, OUTLINE_COLOR);

      const lines = wrapDialogueText(typedText, 25);
      const maxVisible = 4;
      const maxScroll = Math.max(0, Math.floor((lines.length - 1) / maxVisible) * maxVisible);
      const scroll = Math.max(0, Math.min(epilogueCinemaState.scrollOffset || 0, maxScroll));
      lines.slice(scroll, scroll + maxVisible).forEach((line, li) => {
        drawPixelText(ctx, line, nameX, tbY + 18 + li * 9, vceColor(7, 7, 7), OUTLINE_COLOR);
      });
      if (scroll > 0) drawGlyph(ctx, '▲', tbX + tbW - 12, tbY + 6, C_GOLD_HI);
      if (scroll < maxScroll && Math.floor(Date.now() / 320) % 2 === 0) {
        drawGlyph(ctx, '▼', tbX + tbW - 12, tbY + tbH - 22, C_GOLD_HI);
      }
    } else {
      drawPixelText(ctx, card.title, tbX + 8, tbY + 6, C_GOLD_HI, OUTLINE_COLOR);
      const lines = wrapDialogueText(typedText, 36);
      const maxVisible = 4;
      const maxScroll = Math.max(0, Math.floor((lines.length - 1) / maxVisible) * maxVisible);
      const scroll = Math.max(0, Math.min(epilogueCinemaState.scrollOffset || 0, maxScroll));
      lines.slice(scroll, scroll + maxVisible).forEach((line, li) => {
        drawPixelText(ctx, line, tbX + 8, tbY + 18 + li * 9, vceColor(7, 7, 7), OUTLINE_COLOR);
      });
      if (scroll > 0) drawGlyph(ctx, '▲', tbX + tbW - 12, tbY + 6, C_GOLD_HI);
      if (scroll < maxScroll && Math.floor(Date.now() / 320) % 2 === 0) {
        drawGlyph(ctx, '▼', tbX + tbW - 12, tbY + tbH - 22, C_GOLD_HI);
      }
    }

    drawPixelText(ctx, "[SPACE: NEXT]", 14, 204, C_GOLD_HI, OUTLINE_COLOR);
    drawPixelText(ctx, "[ESC: SKIP]", 172, 204, vceColor(5, 5, 5), OUTLINE_COLOR);
  }

  // SECTION 10: Input Handling & Game Loop
  // =========================================================================
  const keysDown = {};
  const justPressed = {};

  function consumeJustPressed(key) {
    if (justPressed[key]) {
      justPressed[key] = false;
      return true;
    }
    return false;
  }

  function clearHeldInputs() {
    for (const key in keysDown) keysDown[key] = false;
    for (const key in justPressed) justPressed[key] = false;
    if (typeof hero !== 'undefined') {
      hero.chargeTimer = 0;
      hero.chargeReady = false;
    }
  }

  window.addEventListener('blur', clearHeldInputs);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearHeldInputs();
  });

  window.addEventListener('keydown', e => {
    const k = e.code;
    if ((k === 'KeyI' || e.key === 'i' || e.key === 'I' || k === 'Tab') && !introCinemaState.active && !titleScreenState.active && (!epilogueCinemaState || !epilogueCinemaState.active)) {
      e.preventDefault();
      if (dialogueLogState.open) return;
      if (!statusMenuState.open) {
        if (!e.repeat) toggleStatusMenu();
        return;
      }
      // Menu is already open: let the menu input handler consume I/Tab instead
      // of toggling the menu (Tab used to close it instead of changing tabs).
      if (!keysDown[k] && !e.repeat) justPressed[k] = true;
      keysDown[k] = true;
      return;
    }

    if (!keysDown[k] && !e.repeat) justPressed[k] = true;
    keysDown[k] = true;

    if (!e.repeat) {
      if (k === 'KeyT') {
        // T only returns to title from the SAVE tab now. Time is the Elder's
        // business: a free day/night switch made the twilight gate meaningless.
        if (statusMenuState.open && statusMenuState.activeTab === 2) {
          returnToTitleScreen();
        }
      }
      if (k === 'KeyV') toggleCrt();
      if (k === 'KeyM') toggleMute();
    }
  });

  window.addEventListener('keyup', e => {
    keysDown[e.code] = false;
  });

  document.querySelectorAll('.vpad-btn').forEach(btn => {
    const k = btn.getAttribute('data-key');
    const start = (e) => {
      e.preventDefault();
      unlockAudio();
      if (!keysDown[k]) justPressed[k] = true;
      keysDown[k] = true;
    };
    const end = (e) => {
      e.preventDefault();
      keysDown[k] = false;
    };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointerleave', end);
    btn.addEventListener('pointercancel', end);
  });

  document.querySelectorAll('.vact-btn').forEach(btn => {
    const k = btn.getAttribute('data-key');
    // Menu / title style buttons use data-action instead of a key binding.
    if (!k) return;
    const trigger = (e) => {
      e.preventDefault();
      unlockAudio();
      if (k === 'KeyZ') {
        keysDown['KeyZ'] = true;
      } else {
        justPressed[k] = true;
        keysDown[k] = true;
      }
    };
    const release = (e) => {
      e.preventDefault();
      keysDown[k] = false;
    };
    btn.addEventListener('pointerdown', trigger);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
  });

  document.querySelectorAll('.vact-btn[data-action="menu"]').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      unlockAudio();
      toggleStatusMenu();
    });
  });

  const btnSlash = document.getElementById('btnSlash');
  if (btnSlash) {
    btnSlash.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      unlockAudio();
      keysDown['KeyZ'] = true;
      btnSlash.blur();
      const cvs = document.getElementById('gameCanvas');
      if (cvs) cvs.focus();
    });
    const releaseSlash = (e) => {
      e.preventDefault();
      keysDown['KeyZ'] = false;
      btnSlash.blur();
      const cvs = document.getElementById('gameCanvas');
      if (cvs) cvs.focus();
    };
    btnSlash.addEventListener('pointerup', releaseSlash);
    btnSlash.addEventListener('pointerleave', releaseSlash);
    btnSlash.addEventListener('pointercancel', releaseSlash);
  }

  function syncDayNightHud() {
    const lbl = document.getElementById('lblDayNight');
    if (lbl) lbl.textContent = flags.isTwilight ? 'Twilight' : 'Midday';
  }
  window.syncDayNightHud = syncDayNightHud;

  // Time only moves through the Elder's rest. Everything that depends on the
  // phase (tile palettes, NPC schedules, the Crypts ward) is funnelled here so
  // there is no path that flips flags.isTwilight and forgets to rebuild.
  function setTimeOfDay(on, opts = {}) {
    const next = !!on;
    if (flags.isTwilight === next) {
      syncDayNightHud();
      return false;
    }
    flags.isTwilight = next;
    syncDayNightHud();
    updateNpcSchedules();
    buildAllMaps();
    updateHudBars();
    if (!opts.silent) {
      playUiConfirm();
      spawnFloatingText(next ? "TWILIGHT FALLS..." : "MORNING DAWNS!", hero.x - 16, hero.y - 12, vceColor(7, 6, 2));
    }
    return true;
  }

  function toggleDayTwilight() {
    return setTimeOfDay(!flags.isTwilight);
  }

  function toggleCrt() {
    const overlay = document.getElementById('crtOverlay');
    const viewport = document.getElementById('viewport');
    const btn = document.getElementById('btnCrt');
    const isActive = overlay ? overlay.classList.toggle('crt-active') : false;
    if (viewport) viewport.classList.toggle('crt-active', isActive);
    if (btn) btn.classList.toggle('active', isActive);
    playUiConfirm();
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (audioCtx && masterGain) {
      masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.35, audioCtx.currentTime, 0.02);
    }
    const lbl = document.getElementById('lblMute');
    if (lbl) lbl.textContent = isMuted ? 'BGM OFF' : 'BGM ON';
    playUiConfirm();
  }

  document.getElementById('btnCrt')?.addEventListener('click', toggleCrt);
  document.getElementById('btnMute')?.addEventListener('click', toggleMute);
  document.getElementById('btnStatus')?.addEventListener('click', () => { unlockAudio(); toggleStatusMenu(); });
  document.getElementById('btnTitle')?.addEventListener('click', () => { unlockAudio(); returnToTitleScreen(); });

  document.querySelectorAll('.hud-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.currentTarget.blur();
      const cvs = document.getElementById('gameCanvas');
      if (cvs) cvs.focus();
    });
  });

  document.getElementById('screenWrapper')?.addEventListener('pointerdown', () => {
    if (dialogueState.active) {
      unlockAudio();
      advanceDialogue();
    }
  });

  function tryInteract(allowCompanionTalk = false) {
    if (dialogueCloseCooldown > 0 || dialogueState.cooldownTimer > 0) return false;

    const curM = getActiveMap();
    const heroTx = Math.floor((hero.x + 8) / TILE_SZ);
    const heroTy = Math.floor((hero.y + 12) / TILE_SZ);

    // Old Quarry Mines: board the ore cart when it is within arm's reach.
    if (activeMapId === 'dungeon_mines' && !minesCart.riding && !minesCart.run) {
      const dCart = Math.hypot((minesCart.x + 8) - (hero.x + 8), (minesCart.y + 8) - (hero.y + 12));
      if (dCart < 30 && startMinesCartRide()) return true;
    }

    let aheadTx = heroTx, aheadTy = heroTy;
    if (hero.dir === 0) aheadTy += 1;
    else if (hero.dir === 1) aheadTy -= 1;
    else if (hero.dir === 2) aheadTx -= 1;
    else if (hero.dir === 3) aheadTx += 1;

    let isCounterAhead = false;
    if (aheadTx >= 0 && aheadTx < curM.width && aheadTy >= 0 && aheadTy < curM.height) {
      const sTile = curM.structLayer[aheadTy * curM.width + aheadTx];
      if (sTile === 'tavernCounter' || sTile === 'potionStall' || sTile === 'forgeAnvil' || sTile === 'forgeFurnace') {
        isCounterAhead = true;
      }
    }

    // Priority check inside Lumina's Workshop & Goran's Forge so companions never intercept shopkeeper talk
    if (activeMapId === 'lumina_workshop' && heroTy <= 6 && heroTx >= 4 && heroTx <= 9 && hero.dir === 1) {
      const lum = npcs.find(n => n.id === 'lumina');
      if (lum) {
        startDialogue(lum);
        return true;
      }
    }
    if (activeMapId === 'goran_forge' && heroTy <= 6 && heroTx >= 5 && heroTx <= 9 && hero.dir === 1) {
      const gor = npcs.find(n => n.id === 'goran');
      if (gor) {
        startDialogue(gor);
        return true;
      }
    }

    const reach = isCounterAhead ? 40 : 22;
    let targetX = hero.x, targetY = hero.y;
    const forwardOffset = isCounterAhead ? 28 : 16;
    if (hero.dir === 0) targetY += forwardOffset;
    else if (hero.dir === 1) targetY -= forwardOffset;
    else if (hero.dir === 2) targetX -= forwardOffset;
    else if (hero.dir === 3) targetX += forwardOffset;

    for (const n of npcs) {
      if (n.mapId !== activeMapId || n.active === false) continue;
      if (n.id === 'nyah' && (flags.nyahJoinedParty || flags.nyahRecruited)) continue;
      const dist = Math.hypot(n.x - targetX, n.y - targetY);
      if (dist <= reach) {
        startDialogue(n);
        return true;
      }
    }

    // Check Door Interaction if no NPC in range
    let faceX = hero.x + 8, faceY = hero.y + 12;
    if (hero.dir === 0) faceY += 16;
    else if (hero.dir === 1) faceY -= 16;
    else if (hero.dir === 2) faceX -= 16;
    else if (hero.dir === 3) faceX += 16;

    const tileX = Math.floor(faceX / TILE_SZ);
    const tileY = Math.floor(faceY / TILE_SZ);

    // Interior Inspectables (supports dynamic getLines() for Operation Short Leash)
    if (window.INTERIOR_INSPECTABLES && window.INTERIOR_INSPECTABLES[activeMapId]) {
      for (const item of window.INTERIOR_INSPECTABLES[activeMapId]) {
        const inFaceX = Array.isArray(item.x) ? (tileX >= item.x[0] && tileX <= item.x[1]) : (tileX === item.x);
        const inFaceY = Array.isArray(item.y) ? (tileY >= item.y[0] && tileY <= item.y[1]) : (tileY === item.y);
        const inHeroX = Array.isArray(item.x) ? (heroTx >= item.x[0] && heroTx <= item.x[1]) : (heroTx === item.x);
        const inHeroY = Array.isArray(item.y) ? (heroTy >= item.y[0] && heroTy <= item.y[1]) : (heroTy === item.y);
        if ((inFaceX && inFaceY) || (inHeroX && inHeroY)) {
          let rawLines = (typeof item.getLines === 'function') ? item.getLines() : item.lines;
          if (!flags.nyahRecruited && activeMapId !== 'grand_manor_interior' && activeMapId !== 'manor_parlor') {
            rawLines = rawLines.filter(l => l.speaker !== 'NYAH');
          }
          if (rawLines && rawLines.length > 0) {
            startCustomDialogueTree(rawLines, rawLines[0]?.portraitId || null);
            return true;
          }
        }
      }
    }

    if (activeMapId === 'aldenor_exterior') {
      if (tileY === 5 && (tileX === 24 || tileX === 25)) {
        if (flags.manorUnlocked) {
          startMapTransition('grand_manor_interior', 7 * 16, 11 * 16, 1);
        } else {
          playSfxDoorLocked();
          const nyah = npcs.find(n => n.id === 'nyah');
          if (nyah && nyah.mapId === 'aldenor_exterior') {
            nyah.dir = 1;
          }
          if (!flags.nyahRecruited) {
            if (!flags.rivalMaidTrialStep || flags.rivalMaidTrialStep === 0) {
              if (nyah) {
                startDialogue(nyah);
              } else {
                startCustomDialogue(
                  'NYAH',
                  'bratty',
                  "HEY!! Hands off the Manor doors, red-haired tourist! The Grand Manor is under lockdown and nyah is standing right here on the steps!",
                  'nyah',
                  true
                );
              }
            } else {
              startCustomDialogue(
                'NYAH',
                'bratty',
                "HEY!! Don't go rattling the Manor doors, red-haired tourist! Nyah isn't unlocking these doors until you bring me my steaming Hot Jasmine Tea from Lumina at the West Market!",
                'nyah',
                true
              );
            }
          } else if (flags.isTwilight) {
            startCustomDialogue(
              'NYAH',
              'flustered',
              "Master?! What are you doing rattling locks in the pitch dark?! Were you trying to sneak into nyah's bedroom window while the Lord is away?!",
              'nyah',
              true
            );
          } else {
            startCustomDialogue(
              'NYAH',
              'bratty',
              "HEY!! Don't go rattling the Manor doors, Master! Nyah is right here!",
              'nyah',
              true
            );
          }
        }
        return true;
      } else if (tileY === 9 && tileX === 6) {
        if (flags.isTwilight || flags.inventory === 'silver_teacup' || hasItem('silver_teacup') || flags.rivalMaidTrialStep >= 1) {
          startMapTransition('lumina_workshop', 7 * 16 - 8, 8 * 16, 1);
        } else {
          startCustomDialogue(
            'LUMINA',
            'friendly',
            "My indoor workshop is locked while I run the market counter right over here!",
            'lumina',
            true
          );
        }
        return true;
      } else if (tileY === 20 && tileX === 24) {
        if (flags.isTwilight || flags.tavern_pass || flags.seagullSolved) {
          startMapTransition('harbor_tavern', 8 * 16 - 8, 10 * 16, 1);
        } else {
          startCustomDialogue(
            'GUARD',
            'guard',
            "The Harbor Tavern doesn't open its kegs until late night—unless you help me get my lunch back from that pesky harbor gull!",
            'guard',
            true
          );
        }
        return true;
      } else if (tileY === 5 && tileX === 5) {
        startMapTransition('goran_forge', 7 * 16 - 8, 8 * 16, 1);
        return true;
      } else if (tileY === 20 && tileX === 22) {
        openBountyBoard();
        return true;
      }
    }

    // Mana Save Crystal Interaction
    const facingTile = (tileY >= 0 && tileY < curM.height && tileX >= 0 && tileX < curM.width)
      ? curM.structLayer[tileY * curM.width + tileX] || curM.groundLayer[tileY * curM.width + tileX]
      : null;
    const heroTile = (heroTy >= 0 && heroTy < curM.height && heroTx >= 0 && heroTx < curM.width)
      ? curM.structLayer[heroTy * curM.width + heroTx] || curM.groundLayer[heroTy * curM.width + heroTx]
      : null;

    if (facingTile === 'saveCrystal' || heroTile === 'saveCrystal' ||
        (activeMapId.startsWith('dungeon_') && Math.hypot(hero.x - 26 * 16, hero.y - 25 * 16) <= 24) ||
        (activeMapId === 'bell_spire' && Math.hypot(hero.x - 5 * 16, hero.y - 24 * 16) <= 28)) {
      openSaveCrystalDialogue();
      return true;
    }

    // Great Bell in Bell Spire
    if (activeMapId === 'bell_spire' && (facingTile === 'greatBell' || (tileY <= 4 && tileX >= 8 && tileX <= 11))) {
      if (flags.bossEclipseDefeated) {
        playSfxBellTolling();
        startCustomDialogueTree([
          { speaker: 'GREAT BELL', portraitId: null, expr: 'friendly', text: "The sacred Bell of Aldenor chimes in harmony with the sea breeze. Its voice echoes to the ends of the sea!" },
          {
            speaker: 'NYAH',
            portraitId: 'nyah',
            expr: 'flustered',
            text: "Listen to that chime, Master... Every time I hear it, I remember standing up here with you at dawn. Let's look out at the sunrise together!",
            onSelect: () => {
              startEpilogueCinema();
            }
          }
        ], 'nyah');
      } else {
        startCustomDialogueTree([
          { speaker: 'GREAT BELL', portraitId: null, expr: 'friendly', text: "The sacred Bell of Aldenor hangs silent beneath dark eclipse miasma. Slay the Shadow of the Eclipse to ring it!" }
        ], 'nyah');
      }
      return true;
    }

    // Spire Gate behind Manor in Aldenor Exterior
    if (activeMapId === 'aldenor_exterior' && tileY <= 2 && (tileX === 24 || tileX === 25)) {
      const hasAllRelics = (flags.bellForkFound || hasItem('bell_tuning_fork')) &&
                           (flags.bellClapperFound || hasItem('bell_clapper')) &&
                           (flags.sanctumCrestFound || hasItem('sanctum_crest'));
      if (hasAllRelics) {
        flags.bellForkFound = true;
        flags.bellClapperFound = true;
        flags.sanctumCrestFound = true;
        dungeonState.spireGateOpen = true;
        setMapTile(curM, 24, 1, 'curb', null, null, 0);
        setMapTile(curM, 25, 1, 'curb', null, null, 0);
        playSfxCoin();
        spawnFloatingText("SANCTUM GATE OPENED!", hero.x - 16, hero.y - 12, vceColor(7, 6, 1));
        startMapTransition('bell_spire', 10 * 16, 25 * 16, 1);
      } else {
        startCustomDialogueTree([
          { speaker: 'SANCTUM GATE', portraitId: null, expr: 'friendly', text: "The Iron Sanctum Gate is sealed by three resonance locks. Three sacred Bell Relics are required: the Tuning Fork, the Clapper, and the Sanctum Crest." }
        ], 'nyah');
      }
      return true;
    }

    // Treasure Chests
    if (facingTile === 'chestClosed') {
      if (activeMapId === 'dungeon_mines') {
        if (tileX === 8 && tileY === 2) {
          dungeonState.minesChestWeapon = true;
          setMapTile(curM, 8, 2, 'minesFloor', 'chestOpen', null, 1);
          addItem('silver_falchion', 1);
          playSfxCoin();
          spawnFloatingText("+SILVER FALCHION!", hero.x, hero.y - 12, vceColor(7, 6, 1));
          startCustomDialogueTree([{ speaker: 'TREASURE', portraitId: null, expr: 'friendly', text: "Opened the ancient mine chest! Found the Silver Falchion (+32 ATK)! A swift, gleaming blade." }], 'nyah');
          return true;
        } else if (tileX === 15 && tileY === 3) {
          dungeonState.minesChestArmor = true;
          setMapTile(curM, 15, 3, 'minesFloor', 'chestOpen', null, 1);
          addItem('silver_breastplate', 1);
          playSfxCoin();
          spawnFloatingText("+SILVER BREASTPLATE!", hero.x, hero.y - 12, vceColor(7, 6, 1));
          startCustomDialogueTree([{ speaker: 'TREASURE', portraitId: null, expr: 'friendly', text: "Discovered the hidden shale alcove! Found the Silver Breastplate (+24 DEF)! Sturdy armor of Aldenor guards." }], 'nyah');
          return true;
        } else if (tileX === 14 && tileY === 8) {
          dungeonState.minesChestRibbon = true;
          setMapTile(curM, 14, 8, 'minesFloor', 'chestOpen', null, 1);
          addItem('crimson_ribbon', 1);
          nyahCompanion.accessory = 'crimson_ribbon';
          playSfxCoin();
          spawnFloatingText("+CRIMSON RIBBON!", hero.x, hero.y - 12, vceColor(7, 3, 4));
          startCustomDialogueTree([{ speaker: 'NYAH', expr: 'flustered', text: "Wait, you saved the Crimson Ribbon from the Mines chest for me?! Hold still, tie it in my hair for me... How does it look? Matches your red hair now, doesn't it, Master? Hehe, nobody's allowed to forget who nyah belongs with!" }], 'nyah');
          return true;
        }
      } else if (activeMapId === 'dungeon_crypts') {
        if (tileX === 8 && tileY === 1) {
          dungeonState.cryptChestFlame = true;
          setMapTile(curM, 8, 1, 'cryptsFloor', 'chestOpen', null, 1);
          addItem('flame_edge', 1);
          playSfxCoin();
          spawnFloatingText("+FLAME EDGE!", hero.x, hero.y - 12, vceColor(7, 3, 1));
          startCustomDialogueTree([{ speaker: 'TREASURE', portraitId: null, expr: 'friendly', text: "Stepped through the illusory wall! Found the Flame Edge (+48 ATK)! Burns with ancient fire; 1.3x vs Undead." }], 'nyah');
          return true;
        } else if (tileX === 3 && tileY === 8) {
          dungeonState.cryptChestShield = true;
          setMapTile(curM, 3, 8, 'cryptsFloor', 'chestOpen', null, 1);
          addItem('kite_shield', 1);
          playSfxCoin();
          spawnFloatingText("+KITE SHIELD!", hero.x, hero.y - 12, vceColor(7, 6, 1));
          startCustomDialogueTree([{ speaker: 'TREASURE', portraitId: null, expr: 'friendly', text: "Opened the crypt iron chest! Found the Kite Shield (+8 DEF)!" }], 'nyah');
          return true;
        }
      } else if (activeMapId === 'dungeon_shrine') {
        if (tileX === 4 && tileY === 2) {
          dungeonState.shrineChestClerici = true;
          setMapTile(curM, 4, 2, 'shrineFloor', 'chestOpen', null, 1);
          addItem('clerici_blade', 1);
          playSfxCoin();
          spawnFloatingText("+CLERICI'S BLADE!", hero.x, hero.y - 12, vceColor(6, 7, 7));
          startCustomDialogueTree([{ speaker: 'TREASURE', portraitId: null, expr: 'friendly', text: "Unsealed the sunken altar! Claimed Clerici's Sacred Blade (+70 ATK)! At >=90% HP, launches radiant sword beams!" }], 'nyah');
          return true;
        } else if (tileX === 12 && tileY === 2) {
          dungeonState.shrineChestCloak = true;
          setMapTile(curM, 12, 2, 'shrineFloor', 'chestOpen', null, 1);
          addItem('moonlight_cloak', 1);
          nyahCompanion.accessory = 'moonlight_cloak';
          playSfxCoin();
          spawnFloatingText("+MOONLIGHT CLOAK!", hero.x, hero.y - 12, vceColor(2, 3, 7));
          startCustomDialogueTree([{ speaker: 'NYAH', expr: 'smug', text: "Whoa... feel how light this midnight-blue silk is! It shimmers like the stars over Esteria. Look at me, Master—nyah looks like a proper legendary phantom rogue now! Monsters won't even see my daggers coming." }], 'nyah');
          return true;
        }
      } else if (activeMapId === 'grand_manor_interior' || activeMapId === 'manor_parlor') {
        if (tileX === 13 && tileY === 5) {
          flags.manorChestOpened = true;
          setMapTile(curM, 13, 5, 'woodFloor', 'chestOpen', null, 1);
          flags.gold = (flags.gold || 0) + 150;
          addItem('starlight_ribbon', 1);
          hero.maxHp = getMaxHpForLevel(hero.level);
          hero.hp = Math.min(hero.maxHp, hero.hp + 10);
          updateHudBars();
          playSfxCoin();
          spawnFloatingText("+150 GOLD & STARLIGHT RIBBON!", hero.x, hero.y - 12, vceColor(7, 6, 1));
          startCustomDialogueTree([
            { speaker: 'TREASURE', portraitId: null, expr: 'friendly', text: "Opened the ornate Manor chest! Found 150 Gold and the Starlight Ribbon accessory!" }
          ], 'nyah');
          return true;
        }
      }
    }

    // Crypt braziers: kindle each bowl for a permanent pool of light. All eight
    // lift the darkness. This is the only writer besides the Lich's dawn.
    if (activeMapId === 'dungeon_crypts' && facingTile === 'brazierDark') {
      const idx = (curM.braziers || []).findIndex(b => b.x === tileX && b.y === tileY);
      if (idx >= 0 && !dungeonState.cryptBraziers[idx]) {
        dungeonState.cryptBraziers[idx] = true;
        buildAllMaps();
        window.collisionMap = getActiveMap().collisionMap;
        const litCount = dungeonState.cryptBraziers.filter(Boolean).length;
        playSfxHeal();
        spawnFloatingText(`BRAZIER ${litCount}/8`, hero.x, hero.y - 12, vceColor(7, 6, 2));
        if (dungeonState.cryptBraziers.every(Boolean)) {
          dungeonState.cryptsBraziersLit = true;
          playSfxLevelUp();
          startCustomDialogueTree([{ speaker: 'NYAH', expr: 'smug', text: "Eight for eight, Master! Every bowl in the crypt is burning. The dark's gone all the way down the sanctum stairs - even Malakor can't hide from nyah now." }], 'nyah');
        } else {
          startCustomDialogueTree([{ speaker: 'NYAH', expr: 'normal', text: `That's ${litCount} of 8 braziers burning. The blue light keeps the dark off our backs, but the rest of the crypt is still pitch black.` }], 'nyah');
        }
        return true;
      }
    }

    // Dungeon Switches & Levers (Opens all 4 tiles of 2x2 Boss Sanctum & Shortcut Portcullises!)
    if (activeMapId === 'dungeon_mines' && facingTile === 'trackSwitch') {
      if ((tileX === 6 && tileY === 8) || (tileX === 12 && tileY === 4)) {
        if (tileX === 6 && tileY === 8) dungeonState.minesTrackSwitch1 = true;
        if (tileX === 12 && tileY === 4) dungeonState.minesTrackSwitch2 = true;
        if (dungeonState.minesTrackSwitch1 && dungeonState.minesTrackSwitch2) {
          // Both rails must line up before the cart can run. One switch alone no
          // longer breaks the barricade or unlocks the boss sanctum. The cart
          // does the work now: it drops from (8,3) and the barricade only breaks
          // if it reaches (8,5). Standing on the rail is the avoidable hazard.
          playSfxBlip(700);
          spawnFloatingText("RAILS ALIGNED - CART RELEASED!", hero.x - 34, hero.y - 12, vceColor(7, 6, 1));
          startMinesCartRun();
        } else {
          const switched = (dungeonState.minesTrackSwitch1 ? 1 : 0) + (dungeonState.minesTrackSwitch2 ? 1 : 0);
          playSfxBlip(1100);
          spawnFloatingText(`TRACK SWITCH (${switched}/2)`, hero.x, hero.y - 12, vceColor(7, 6, 1));
          startCustomDialogueTree([{ speaker: 'MINES', portraitId: null, expr: 'friendly', text: "One track switch swings over with a heavy clank. The rails are only half aligned - the other switch has to be thrown before an ore cart can run." }], 'nyah');
        }
        return true;
      } else if (tileX === 20 && tileY === 23) {
        dungeonState.minesShortcutOpen = true;
        setMapTile(curM, 17, 23, 'minesFloor', null, null, 0);
        setMapTile(curM, 18, 23, 'minesFloor', null, null, 0);
        setMapTile(curM, 17, 24, 'minesFloor', null, null, 0);
        setMapTile(curM, 18, 24, 'minesFloor', null, null, 0);
        playSfxLevelUp();
        spawnFloatingText("SHORTCUT OPENED!", hero.x, hero.y - 12, vceColor(7, 6, 1));
        startCustomDialogueTree([{ speaker: 'MINES', portraitId: null, expr: 'friendly', text: "Flipped the southern lever! The iron portcullis retracted, opening the shortcut between the Entrance and the Save Crystal Room (and Boss Sanctum)!" }], 'nyah');
        return true;
      }
    }

    if (activeMapId === 'dungeon_crypts' && (facingTile === 'skullLever0' || facingTile === 'skullLever1' || facingTile === 'trackSwitch')) {
      if (tileX === 20 && tileY === 23) {
        dungeonState.cryptShortcutOpen = true;
        setMapTile(curM, 17, 23, 'cryptsFloor', null, null, 0);
        setMapTile(curM, 18, 23, 'cryptsFloor', null, null, 0);
        setMapTile(curM, 17, 24, 'cryptsFloor', null, null, 0);
        setMapTile(curM, 18, 24, 'cryptsFloor', null, null, 0);
        playSfxLevelUp();
        spawnFloatingText("SHORTCUT OPENED!", hero.x, hero.y - 12, vceColor(7, 6, 1));
        return true;
      }
      if (tileX === 4 && tileY === 20) {
        dungeonState.cryptSkullLevers[0] = true;
        setMapTile(curM, 4, 20, 'cryptsFloor', 'skullLever1', null, 0);
      } else if (tileX === 14 && tileY === 4) {
        dungeonState.cryptSkullLevers[1] = true;
        setMapTile(curM, 14, 4, 'cryptsFloor', 'skullLever1', null, 0);
        dungeonState.cryptShortcutOpen = true;
        setMapTile(curM, 17, 23, 'cryptsFloor', null, null, 0);
        setMapTile(curM, 18, 23, 'cryptsFloor', null, null, 0);
        setMapTile(curM, 17, 24, 'cryptsFloor', null, null, 0);
        setMapTile(curM, 18, 24, 'cryptsFloor', null, null, 0);
      } else if (tileX === 32 && tileY === 20) {
        dungeonState.cryptSkullLevers[2] = true;
        setMapTile(curM, 32, 20, 'cryptsFloor', 'skullLever1', null, 0);
        dungeonState.cryptShortcutOpen = true;
        setMapTile(curM, 17, 23, 'cryptsFloor', null, null, 0);
        setMapTile(curM, 18, 23, 'cryptsFloor', null, null, 0);
        setMapTile(curM, 17, 24, 'cryptsFloor', null, null, 0);
        setMapTile(curM, 18, 24, 'cryptsFloor', null, null, 0);
      }
      if (dungeonState.cryptSkullLevers[0] && dungeonState.cryptSkullLevers[1] && dungeonState.cryptSkullLevers[2]) {
        dungeonState.cryptPortcullisOpen = true;
        // Completing the ward also wakes every brazier: the crypt is meant to
        // be readable for the boss fight. Lighting all eight yourself is the
        // earlier, optional route to the same light.
        dungeonState.cryptsBraziersLit = true;
        dungeonState.cryptBraziers = dungeonState.cryptBraziers.map(() => true);
        setBossGateTiles(curM, true, 'cryptsFloor');
        buildAllMaps();
        window.collisionMap = getActiveMap().collisionMap;
        playSfxLevelUp();
        spawnFloatingText("BOSS SANCTUM OPENED!", hero.x, hero.y - 12, vceColor(7, 6, 1));
        startCustomDialogueTree([{ speaker: 'CRYPTS', portraitId: null, expr: 'friendly', text: "All three skull levers are pulled! The massive iron portcullis to Lord Malakor's sanctum has raised—and ward-fire races along the walls, waking every brazier. The dark is gone." }], 'nyah');
      } else {
        playSfxBlip(1100);
        const pulledCount = dungeonState.cryptSkullLevers.filter(Boolean).length;
        spawnFloatingText(`SKULL LEVER (${pulledCount}/3)!`, hero.x, hero.y - 12, vceColor(7, 6, 1));
      }
      return true;
    }

    if (activeMapId === 'dungeon_shrine' && (facingTile === 'sluiceValve' || facingTile === 'trackSwitch')) {
      if (facingTile === 'trackSwitch') {
        // The floor switch is only the entrance/save-crystal shortcut; it must
        // not double as the two-valve sluice puzzle.
        if (!dungeonState.shrineShortcutOpen) {
          dungeonState.shrineShortcutOpen = true;
          buildAllMaps();
          window.collisionMap = getActiveMap().collisionMap;
          playSfxLevelUp();
          spawnFloatingText("SHORTCUT OPENED!", hero.x, hero.y - 12, vceColor(3, 7, 7));
          startCustomDialogueTree([{ speaker: 'SHRINE', portraitId: null, expr: 'friendly', text: "The floor switch sinks with a wet click. The shortcut between the entrance and the save crystal room grinds open." }], 'nyah');
        }
        return true;
      }
      // Valve 1 lowers the basins to walkable shallows and opens the
      // save-crystal shortcut; valve 2 sits beyond it and only then drains the
      // shrine and raises the boss gate. Requiring both up front would
      // soft-lock the room.
      if (tileX === 6 && tileY === 6) {
        dungeonState.shrineValve1 = true;
        dungeonState.shrineWaterLevel = 1;
        dungeonState.shrineShortcutOpen = true;
      } else if (tileX === 30 && tileY === 22) {
        dungeonState.shrineValve2 = true;
      }
      if (dungeonState.shrineValve1 && dungeonState.shrineValve2) {
        dungeonState.shrineWaterDrained = true;
        dungeonState.shrineWaterLevel = 1;
        dungeonState.shrineShortcutOpen = true;
        buildAllMaps();
        window.collisionMap = getActiveMap().collisionMap;
        playSfxLevelUp();
        spawnFloatingText("SLUICE GATES OPENED!", hero.x, hero.y - 12, vceColor(3, 7, 7));
        startCustomDialogueTree([{ speaker: 'SHRINE', portraitId: null, expr: 'friendly', text: "Both brass valves are open! The last of the seawater drains from the central halls, and the Sanctum gate rises with a deep groan." }], 'nyah');
      } else if (dungeonState.shrineValve1) {
        buildAllMaps();
        window.collisionMap = getActiveMap().collisionMap;
        playSfxBlip(1100);
        spawnFloatingText("SLUICE VALVE (1/2)", hero.x, hero.y - 12, vceColor(3, 7, 7));
        startCustomDialogueTree([{ speaker: 'SHRINE', portraitId: null, expr: 'friendly', text: "The first brass valve shudders open. The flooded basins sink to shallow puddles, the shortcut to the save crystal room grinds open, and the far sluice is still sealed - there is a second valve beyond it." }], 'nyah');
      } else {
        buildAllMaps();
        window.collisionMap = getActiveMap().collisionMap;
        playSfxBlip(1100);
        const valvesOpen = (dungeonState.shrineValve1 ? 1 : 0) + (dungeonState.shrineValve2 ? 1 : 0);
        spawnFloatingText(`SLUICE VALVE (${valvesOpen}/2)`, hero.x, hero.y - 12, vceColor(3, 7, 7));
        startCustomDialogueTree([{ speaker: 'SHRINE', portraitId: null, expr: 'friendly', text: "The second brass valve turns, but the main sluice is still sealed. Somewhere on the far side of the shrine, the first valve must be opened too." }], 'nyah');
      }
      return true;
    }

    // Check companions (Fifi & Nyah) last so they never block doorways, chests, or switches.
    // Space is the combat button: ONLY E/X may open a companion menu. Fifi follows a
    // tile behind the hero, so allowing Space here stole sword swings in town.
    if (!allowCompanionTalk) return false;

    const fifi = window.fifiCompanion;
    const nyahNpc = npcs.find(n => n.id === 'nyah');
    const isInManor = (activeMapId === 'grand_manor_interior' || activeMapId === 'manor_parlor');
    const fifiAvailableHere = fifi && (!flags.fifiLeashedInManor || isInManor);
    const dFifi = fifiAvailableHere ? Math.hypot(fifi.x - targetX, fifi.y - targetY) : 999;
    const dHeroFifi = fifiAvailableHere ? Math.hypot(fifi.x - hero.x, fifi.y - hero.y) : 999;
    const dNyah = nyahNpc ? Math.hypot(nyahNpc.x - targetX, nyahNpc.y - targetY) : 999;
    const dHeroNyah = nyahNpc ? Math.hypot(nyahNpc.x - hero.x, nyahNpc.y - hero.y) : 999;
    const compReach = allowCompanionTalk ? 36 : 24;

    const canTalkFifi = (flags.fifiRecruited || !flags.nyahJoinedParty) && fifiAvailableHere && (dFifi <= compReach || (allowCompanionTalk && dHeroFifi <= 32));
    const canTalkNyah = flags.nyahJoinedParty && nyahNpc && nyahNpc.mapId === activeMapId && (dNyah <= compReach || (allowCompanionTalk && dHeroNyah <= 32));

    if (canTalkFifi && canTalkNyah) {
      if (dFifi <= dNyah) {
        startCustomDialogueTree(getDialogueTree('fifi'), 'fifi');
        return true;
      } else {
        startDialogue(nyahNpc);
        return true;
      }
    } else if (canTalkFifi) {
      startCustomDialogueTree(getDialogueTree('fifi'), 'fifi');
      return true;
    } else if (canTalkNyah) {
      startDialogue(nyahNpc);
      return true;
    }

    return false;
  }

  // The visible ribbon and the leash physics must share one anchor, or Fifi
  // stops short of where the drawn ribbon says the post is.
  const MANOR_LEASH_POST_X = 2 * 16 + 6;
  const MANOR_LEASH_POST_Y = 7 * 16 - 2;

  function updateFifiCompanion(dt) {
    const fifi = window.fifiCompanion;
    if (!fifi || (!flags.fifiRecruited && flags.nyahJoinedParty)) return;

    fifi.attackCooldown = Math.max(0, (fifi.attackCooldown || 0) - dt);
    fifi.healCooldown = Math.max(0, (fifi.healCooldown || 0) - dt);
    fifi.castTimer = Math.max(0, (fifi.castTimer || 0) - dt);
    fifi.tugBarkCooldown = Math.max(0, (fifi.tugBarkCooldown || 0) - dt);

    // Decay squash & stretch
    fifi.squashX = (fifi.squashX || 1.0) + (1.0 - (fifi.squashX || 1.0)) * 10 * dt;
    fifi.squashY = (fifi.squashY || 1.0) + (1.0 - (fifi.squashY || 1.0)) * 10 * dt;

    // Operation Short Leash: If Fifi is leashed to the Manor bedroom post
    const isInManor = (activeMapId === 'grand_manor_interior' || activeMapId === 'manor_parlor');
    if (flags.fifiLeashedInManor) {
      if (!isInManor) {
        fifi.isMoving = false;
        return;
      }
      const postAnchorX = MANOR_LEASH_POST_X;
      const postAnchorY = MANOR_LEASH_POST_Y;
      const maxLeashRadius = 36;
      const distHero = Math.hypot(hero.x - fifi.x, hero.y - fifi.y);
      if (distHero > 18 && distHero < 96) {
        const fdx = hero.x - fifi.x;
        const fdy = hero.y - fifi.y;
        const fmag = Math.hypot(fdx, fdy) || 1;
        const step = (hero.speed * 0.75) * dt;
        const nextX = fifi.x + (fdx / fmag) * step;
        const nextY = fifi.y + (fdy / fmag) * step;
        const distFromPost = Math.hypot(nextX - postAnchorX, nextY - postAnchorY);
        if (distFromPost <= maxLeashRadius) {
          fifi.x = nextX;
          fifi.y = nextY;
          fifi.isMoving = true;
        } else {
          // Ribbon pulls taut! Clamp to maxLeashRadius and bounce
          const ang = Math.atan2(nextY - postAnchorY, nextX - postAnchorX);
          fifi.x = postAnchorX + Math.cos(ang) * maxLeashRadius;
          fifi.y = postAnchorY + Math.sin(ang) * maxLeashRadius;
          fifi.isMoving = false;
          if (fifi.tugBarkCooldown <= 0) {
            fifi.tugBarkCooldown = 3.6;
            fifi.squashX = 1.22;
            fifi.squashY = 0.82;
            const tugLines = [
              "M-Master, the leash is too short...!",
              "S-so close to the tea tray, woof...",
              "Miss, Nyah, unclip meee!"
            ];
            spawnFloatingText(tugLines[Math.floor(Math.random() * tugLines.length)], fifi.x - 24, fifi.y - 14, vceColor(7, 5, 6));
          }
        }
        if (Math.abs(fdx) > Math.abs(fdy)) fifi.dir = (fdx > 0) ? 3 : 2;
        else fifi.dir = (fdy > 0) ? 0 : 1;
        fifi.animTimer = (fifi.animTimer || 0) + dt;
        if (fifi.animTimer >= 0.14) {
          fifi.animTimer = 0;
          fifi.animFrame = ((fifi.animFrame || 0) + 1) % 3;
          fifi.walkFrame = fifi.animFrame;
        }
      } else {
        fifi.isMoving = false;
        fifi.dir = (hero.x > fifi.x) ? 3 : 0;
      }
      return;
    }

    // Follow slot selection
    const slot1 = heroTrail[Math.max(0, heroTrail.length - 6)] || { x: hero.x, y: hero.y, dir: hero.dir };
    const slot2 = heroTrail[Math.max(0, heroTrail.length - 12)] || slot1;
    const targetSlot = (flags.nyahJoinedParty && flags.nyahInFrontSlot) ? slot2 : slot1;

    // Distance to follow slot
    const dSlot = Math.hypot(targetSlot.x - fifi.x, targetSlot.y - fifi.y);
    if (dSlot > 180) {
      fifi.x = targetSlot.x;
      fifi.y = targetSlot.y;
      fifi.dir = targetSlot.dir ?? hero.dir;
      fifi.isMoving = false;
    } else if (dSlot > 12) {
      const fSpeed = (dSlot > 54) ? (hero.speed * 1.35) : (hero.speed * 0.98);
      const step = fSpeed * dt;
      const fdx = targetSlot.x - fifi.x;
      const fdy = targetSlot.y - fifi.y;
      const fmag = Math.hypot(fdx, fdy) || 1;
      const nx = fifi.x + (fdx / fmag) * step;
      const ny = fifi.y + (fdy / fmag) * step;
      if (!checkCollision(nx, fifi.y)) fifi.x = nx;
      if (!checkCollision(fifi.x, ny)) fifi.y = ny;
      fifi.isMoving = true;
      if (Math.abs(fdx) > Math.abs(fdy)) fifi.dir = (fdx > 0) ? 3 : 2;
      else fifi.dir = (fdy > 0) ? 0 : 1;

      fifi.animTimer = (fifi.animTimer || 0) + dt;
      if (fifi.animTimer >= 0.14) {
        fifi.animTimer = 0;
        fifi.animFrame = ((fifi.animFrame || 0) + 1) % 3;
        fifi.walkFrame = fifi.animFrame;
      }
    } else {
      fifi.isMoving = false;
      fifi.dir = targetSlot.dir ?? fifi.dir;
    }

    // Soft separation from Nyah so both maids never overlap on the exact same pixel
    if (flags.nyahJoinedParty && typeof nyahCompanion !== 'undefined') {
      const sepDx = fifi.x - nyahCompanion.x;
      const sepDy = fifi.y - nyahCompanion.y;
      const sepDist = Math.hypot(sepDx, sepDy);
      if (sepDist < 14) {
        const pushX = sepDist > 0.1 ? (sepDx / sepDist) * 18 * dt : -18 * dt;
        const pushY = sepDist > 0.1 ? (sepDy / sepDist) * 18 * dt : 0;
        if (!checkCollision(fifi.x + pushX, fifi.y)) fifi.x += pushX;
        if (!checkCollision(fifi.x, fifi.y + pushY)) fifi.y += pushY;
      }
    }

    // Gentle Puppy Blessing (Heals Adol if HP <= 85% and cooldown <= 0)
    if (hero.hp > 0 && hero.hp <= Math.floor(hero.maxHp * 0.85) && fifi.healCooldown <= 0) {
      fifi.healCooldown = 9.0;
      fifi.castTimer = 0.45;
      fifi.squashX = 0.85; fifi.squashY = 1.25;
      const healAmount = 18;
      hero.hp = Math.min(hero.maxHp, hero.hp + healAmount);
      playSfxHeal();
      spawnFloatingText(`+${healAmount} HP (FIFI BLESSING)`, hero.x - 12, hero.y - 12, vceColor(3, 7, 7));
      spawnFloatingText("Master, stay safe!", fifi.x - 16, fifi.y - 18, vceColor(7, 6, 7));
      updateHudBars();
    }

    // Autonomous Starlight Bolt attack (also fires when Hero attacks or monsters are within 140px)
    const isCombatMap = (activeMapId === 'aldenor_coastal_plains' || activeMapId.startsWith('dungeon_') || activeMapId === 'bell_spire');
    if (isCombatMap && fifi.attackCooldown <= 0) {
      let targetMonster = null;
      let targetDist = 140;
      for (const m of monsters) {
        if (!m.alive) continue;
        const dFifi = Math.hypot(m.x - fifi.x, m.y - fifi.y);
        const dHero = Math.hypot(m.x - hero.x, m.y - hero.y);
        const d = Math.min(dFifi, dHero);
        if (d < targetDist && !hasWallBetween(fifi.x, fifi.y, m.x, m.y)) {
          targetMonster = m;
          targetDist = d;
        }
      }
      if (targetMonster) {
        fifi.attackCooldown = 0.95;
        fifi.castTimer = 0.35;
        fifi.squashX = 1.2; fifi.squashY = 0.85;
        if (Math.abs(targetMonster.x - fifi.x) > Math.abs(targetMonster.y - fifi.y)) {
          fifi.dir = (targetMonster.x > fifi.x) ? 3 : 2;
        } else {
          fifi.dir = (targetMonster.y > fifi.y) ? 0 : 1;
        }
        fifiBolts.push({
          x: fifi.x + 8,
          y: fifi.y + 6,
          target: targetMonster,
          speed: 145,
          life: 1.8
        });
        playSfxBlip(1350);
      }
    }
  }

  function updateFifiBolts(dt) {
    for (let i = fifiBolts.length - 1; i >= 0; i--) {
      const b = fifiBolts[i];
      b.life -= dt;
      if (b.life <= 0) {
        fifiBolts.splice(i, 1);
        continue;
      }
      if (b.target && b.target.alive) {
        const bdx = b.target.x - b.x;
        const bdy = b.target.y - b.y;
        const bmag = Math.hypot(bdx, bdy) || 1;
        b.x += (bdx / bmag) * b.speed * dt;
        b.y += (bdy / bmag) * b.speed * dt;

        if (bmag <= 14) {
          const dmg = 14 + Math.floor((hero.level || 1) * 2);
          b.target.hp -= dmg;
          b.target.flashTimer = 0.08;
          b.target.hitTimer = 0.20;
          playSfxHit();
          hero.tp = Math.min(100, (hero.tp || 0) + 8);
          updateHudBars();
          spawnFloatingText(`-${dmg}`, b.target.x + 2, b.target.y - 6, vceColor(7, 4, 7));
          spawnFloatingText("+8 TP", hero.x, hero.y - 12, vceColor(7, 3, 7));

          if (b.target.hp <= 0) {
            handleMonsterDefeat(b.target);
          }
          fifiBolts.splice(i, 1);
        }
      } else {
        fifiBolts.splice(i, 1);
      }
    }
  }

  function triggerMaidTwinStarburst() {
    if (!flags.nyahJoinedParty) {
      playSfxBlip(450);
      spawnFloatingText("NEED NYAH IN PARTY!", hero.x - 24, hero.y - 12, vceColor(7, 4, 4));
      return;
    }
    if ((hero.tp || 0) < 100) {
      playSfxBlip(600);
      spawnFloatingText(`TP NOT READY! (${Math.floor(hero.tp || 0)}%)`, hero.x - 20, hero.y - 12, vceColor(7, 3, 3));
      return;
    }
    hero.tp = 0;
    updateHudBars();
    starburstCutinTimer = 1.6;
    playSfxLevelUp();
    playSfxBellTolling();

    const healAmount = Math.floor(hero.maxHp * 0.30);
    hero.hp = Math.min(hero.maxHp, hero.hp + healAmount);
    spawnFloatingText(`+${healAmount} HP (TWIN MAIDS)`, hero.x - 16, hero.y - 16, vceColor(3, 7, 7));
    spawnFloatingText("MAID TWIN STARBURST!!", hero.x - 28, hero.y - 28, vceColor(7, 6, 1));

    // Spawn 8 starlight pillars
    starburstPillars = [];
    for (let i = 0; i < 8; i++) {
      const px = hero.x - 90 + i * 26;
      starburstPillars.push({ x: px, timer: 0.85 });
    }

    // AoE damage & stun all living monsters on active map
    for (const m of monsters) {
      if (!m.alive) continue;
      const dmg = 95 + Math.floor((hero.level || 1) * 8);
      m.hp -= dmg;
      m.flashTimer = 0.25;
      m.hitTimer = 0.80;
      spawnFloatingText(`-${dmg}!!`, m.x, m.y - 10, vceColor(7, 6, 1));
      if (m.hp <= 0) {
        handleMonsterDefeat(m);
      }
    }
  }
  window.triggerMaidTwinStarburst = triggerMaidTwinStarburst;

  // Enemy attack wind-ups.
  // Boss attacks used to resolve on the exact frame their cooldown expired, so
  // there was nothing to react to. Every telegraphed attack now freezes the
  // monster for `seconds` (drawn as a flashing "!" over its head) and then runs
  // the payload. Keeping the payload in a closure means monsters stay transient
  // and are never serialized into a save.
  function telegraphMonsterAttack(m, seconds, fire, radius) {
    m.windup = seconds;
    m.windupTotal = seconds;
    m.windupRadius = radius || 0; // draw the true danger zone for area attacks
    m.pendingAttack = fire;
    playSfxBlip(260);
  }

  function update(dt) {
    if (dialogueCloseCooldown > 0) dialogueCloseCooldown -= dt;
    if (transitionGraceTimer > 0) transitionGraceTimer -= dt;
    if (hero.invulnTimer > 0) hero.invulnTimer -= dt;
    if (hero.slowTimer > 0) hero.slowTimer -= dt;
    if (hero.attackTimer > 0) {
      hero.attackTimer -= dt;
      if (hero.attackTimer <= 0) {
        hero.isAttacking = false;
        hero.isSpinning = false;
      }
    }
    if (hero.attackCooldown > 0) hero.attackCooldown -= dt;
    if (hero.dodgeCooldown > 0) hero.dodgeCooldown -= dt;
    if (hero.dodgeTimer > 0) hero.dodgeTimer -= dt;

    // Dash stamina regen. The 0.35 s beat starts after a step; the world being
    // paused (menu, dialogue, transition) also pauses the refill so a player
    // cannot park in a menu to refill mid-fight.
    if (!statusMenuState.open && !dialogueState.active && !transitionState.active && hero.dodgeTimer <= 0) {
      if (hero.staminaRegenDelay > 0) {
        hero.staminaRegenDelay -= dt;
      } else if (hero.stamina < hero.staminaMax) {
        const shownStamina = Math.floor(hero.stamina);
        hero.stamina = Math.min(hero.staminaMax, hero.stamina + HERO_STAMINA_REGEN * dt);
        if (Math.floor(hero.stamina) !== shownStamina) updateHudBars();
      }
    }

    if (dialogueState.cooldownTimer > 0) {
      dialogueState.cooldownTimer -= dt;
    }

    if (statusMenuState.open) {
      if (consumeJustPressed('KeyI') || consumeJustPressed('Escape')) {
        toggleStatusMenu();
        return;
      }
      if (consumeJustPressed('KeyC')) {
        cycleNyahCosmetic();
      }
      if (consumeJustPressed('KeyQ') || consumeJustPressed('ArrowLeft')) {
        statusMenuState.activeTab = (statusMenuState.activeTab + 3) % 4;
        statusMenuState.selectedIndex = 0;
        playSfxBlip(950);
      }
      if (consumeJustPressed('Tab') || consumeJustPressed('ArrowRight')) {
        statusMenuState.activeTab = (statusMenuState.activeTab + 1) % 4;
        statusMenuState.selectedIndex = 0;
        playSfxBlip(950);
      }
      if (consumeJustPressed('ArrowUp') || consumeJustPressed('KeyW')) {
        if (statusMenuState.activeTab === 0) {
          if (statusMenuState.selectedIndex > 0) {
            statusMenuState.selectedIndex--;
            playSfxBlip(850);
          }
        } else if (statusMenuState.activeTab === 2) {
          if (statusMenuState.saveSlotIndex > 0) {
            statusMenuState.saveSlotIndex--;
            playSfxBlip(850);
          }
        }
      }
      if (consumeJustPressed('ArrowDown') || consumeJustPressed('KeyS')) {
        if (statusMenuState.activeTab === 0) {
          if (statusMenuState.selectedIndex < hero.bag.length - 1) {
            statusMenuState.selectedIndex++;
            playSfxBlip(850);
          }
        } else if (statusMenuState.activeTab === 2) {
          if (statusMenuState.saveSlotIndex < 4) {
            statusMenuState.saveSlotIndex++;
            playSfxBlip(850);
          }
        }
      }

      // Tab 0: Bag & Gear Actions
      if (statusMenuState.activeTab === 0 && hero.bag.length > 0) {
        const curItem = hero.bag[statusMenuState.selectedIndex];
        if (curItem) {
          if (consumeJustPressed('Space') || consumeJustPressed('Enter') || consumeJustPressed('KeyE')) {
            if (CONSUMABLES[curItem.id]) {
              const item = CONSUMABLES[curItem.id];
              if (item.type === 'heal') {
                const heal = Math.max(0, Math.min(item.val, hero.maxHp - hero.hp));
                const stam = Math.max(0, Math.min(item.stamina || 0, hero.staminaMax - hero.stamina));
                if (heal > 0 || stam > 0) {
                  hero.hp = Math.min(hero.maxHp, hero.hp + heal);
                  hero.stamina = Math.min(hero.staminaMax, hero.stamina + stam);
                  hero.staminaRegenDelay = 0;
                  removeItem(curItem.id, 1);
                  playSfxHeal();
                  const parts = [];
                  if (heal > 0) parts.push(`+${heal} HP`);
                  if (stam > 0) parts.push(`+${stam} ST`);
                  spawnFloatingText(parts.join(' / '), hero.x - 8, hero.y - 12, vceColor(2, 7, 2));
                  updateHudBars();
                }
              } else if (item.type === 'cure') {
                removeItem(curItem.id, 1);
                playSfxHeal();
                spawnFloatingText("CURED!", hero.x, hero.y - 12, vceColor(3, 7, 7));
              }
            } else if (WEAPONS[curItem.id]) {
              hero.weapon = curItem.id;
              playSfxBlip(1400);
              spawnFloatingText("EQUIPPED!", hero.x, hero.y - 12, vceColor(7, 6, 1));
            } else if (ARMORS[curItem.id]) {
              hero.armor = curItem.id;
              playSfxBlip(1400);
              spawnFloatingText("EQUIPPED!", hero.x, hero.y - 12, vceColor(7, 6, 1));
            } else if (typeof SHIELDS !== 'undefined' && SHIELDS[curItem.id]) {
              hero.shield = curItem.id;
              playSfxBlip(1400);
              spawnFloatingText("EQUIPPED SHIELD!", hero.x, hero.y - 12, vceColor(7, 6, 1));
            } else if (KEY_ITEMS[curItem.id] && KEY_ITEMS[curItem.id].type === 'accessory') {
              nyahCompanion.accessory = curItem.id;
              playSfxBlip(1400);
              spawnFloatingText("NYAH EQUIPPED!", hero.x, hero.y - 12, vceColor(7, 4, 7));
            }
          }
          if (consumeJustPressed('Digit1') && CONSUMABLES[curItem.id]) {
            hero.quickSlots[0] = curItem.id;
            playSfxBlip(1200);
            spawnFloatingText("BOUND [1]", hero.x, hero.y - 12, vceColor(7, 6, 1));
          }
          if (consumeJustPressed('Digit2') && CONSUMABLES[curItem.id]) {
            hero.quickSlots[1] = curItem.id;
            playSfxBlip(1200);
            spawnFloatingText("BOUND [2]", hero.x, hero.y - 12, vceColor(7, 6, 1));
          }
          if (consumeJustPressed('Digit3') && CONSUMABLES[curItem.id]) {
            hero.quickSlots[2] = curItem.id;
            playSfxBlip(1200);
            spawnFloatingText("BOUND [3]", hero.x, hero.y - 12, vceColor(7, 6, 1));
          }
        }
      }
      // Tab 2: Save / Load Actions
      else if (statusMenuState.activeTab === 2) {
        if (statusMenuState.saveSlotIndex === 4) {
          if (consumeJustPressed('Space') || consumeJustPressed('Enter') || consumeJustPressed('KeyE') || consumeJustPressed('KeyZ')) {
            returnToTitleScreen();
            return;
          }
        } else {
          if (consumeJustPressed('KeyZ')) {
            const isAuto = (statusMenuState.saveSlotIndex === 3);
            saveGame(statusMenuState.saveSlotIndex, isAuto);
          }
          if (consumeJustPressed('Space') || consumeJustPressed('Enter') || consumeJustPressed('KeyE')) {
            const isAuto = (statusMenuState.saveSlotIndex === 3);
            loadGame(statusMenuState.saveSlotIndex, isAuto);
          }
        }
      }
      return;
    }

    // Dialogue backlog. It owns input completely while open, so a scroll swipe
    // never walks the hero or swings at the same time.
    if (dialogueLogState.open) {
      if (consumeJustPressed('KeyL') || consumeJustPressed('Escape')) {
        toggleDialogueLog(false);
        return;
      }
      if (consumeJustPressed('ArrowUp') || consumeJustPressed('KeyW')) {
        dialogueLogState.scroll -= 1;
        playSfxBlip(850);
      }
      if (consumeJustPressed('ArrowDown') || consumeJustPressed('KeyS')) {
        dialogueLogState.scroll += 1;
        playSfxBlip(850);
      }
      if (consumeJustPressed('PageUp')) dialogueLogState.scroll -= 10;
      if (consumeJustPressed('PageDown')) dialogueLogState.scroll += 10;
      return;
    }
    if (consumeJustPressed('KeyL')) {
      toggleDialogueLog(true);
      return;
    }

    // In-game Toggle Pause / Status Menu via Escape
    if (consumeJustPressed('Escape')) {
      if (!dialogueState.active && !transitionState.active) {
        toggleStatusMenu();
        return;
      }
    }

    // Hardware-Style Scanline Shutter Wipe Transition
    if (transitionState.active) {
      transitionState.timer += dt;
      if (!transitionState.halfwayDone && transitionState.timer >= transitionState.duration * 0.5) {
        transitionState.halfwayDone = true;
        activeMapId = transitionState.targetMap;
        window.collisionMap = getActiveMap().collisionMap;
        hero.x = transitionState.spawnX;
        hero.y = transitionState.spawnY;
        hero.dir = transitionState.spawnDir;
        heroTrail = [{ x: hero.x, y: hero.y, dir: hero.dir }];
        window.heroTrail = heroTrail;
        if (window.fifiCompanion) {
          if (flags.fifiLeashedInManor && (activeMapId === 'grand_manor_interior' || activeMapId === 'manor_parlor')) {
            window.fifiCompanion.x = 3 * 16;
            window.fifiCompanion.y = 7 * 16;
            window.fifiCompanion.dir = 0;
            window.fifiCompanion.isMoving = false;
          } else {
            window.fifiCompanion.x = hero.x - 16;
            window.fifiCompanion.y = hero.y + 8;
            window.fifiCompanion.dir = hero.dir;
            window.fifiCompanion.isMoving = false;
          }
        }
        if (typeof nyahCompanion !== 'undefined') {
          nyahCompanion.x = hero.x + 16;
          nyahCompanion.y = hero.y + 8;
          nyahCompanion.dir = hero.dir;
          nyahCompanion.isMoving = false;
          nyahCompanion.trailBuffer = [{ x: hero.x, y: hero.y, dir: hero.dir }];
        }
        if (activeMapId === 'aldenor_coastal_plains' || activeMapId.startsWith('dungeon_') || activeMapId === 'bell_spire') {
          initMonsters(activeMapId);
        }
        const curM = getActiveMap();
        const mapW = curM.width * TILE_SZ;
        const mapH = curM.height * TILE_SZ;
        camera.x = (mapW < 256) ? Math.floor((mapW - 256) / 2) : Math.max(0, Math.min(mapW - 256, hero.x + 8 - 128));
        camera.y = (mapH < 224) ? Math.floor((mapH - 224) / 2) : Math.max(0, Math.min(mapH - 224, hero.y + 8 - 112));
        updateNpcSchedules();
        updateSpatialFountain(hero.x, hero.y);
      }
      if (transitionState.timer >= transitionState.duration) {
        transitionState.active = false;
        dialogueCloseCooldown = 0.20;
        transitionGraceTimer = 0.45;
        if (flags.heroRescuedByNyah) {
          flags.heroRescuedByNyah = false;
          const nyah = npcs.find(n => n.id === 'nyah');
          if (nyah) {
            hero.dir = 1;
            nyah.dir = 0;
            startCustomDialogue(
              'NYAH',
              'flustered',
              "MASTER!! You absolute idiot!! Nyah had to drag you all the way back from the coast while you were unconscious! Don't you dare go throwing your life away out there - who's going to drink my tea if you die, huh?!",
              'nyah'
            );
          }
        }
      }
      return;
    }

    // Crown of the Dawn (Eclipse drop): a one-second pulse that scorches undead
    // within 52 px. Fixed damage, so it never scales into a boss skip.
    if (hasItem('crown_of_dawn')) {
      dawnAuraTimer += dt;
      if (dawnAuraTimer >= 1.0) {
        dawnAuraTimer -= 1.0;
        let burned = false;
        for (const m of monsters) {
          if (!m.alive) continue;
          if (m.type !== 'skeleton_knight' && m.type !== 'boss_lich') continue;
          if (Math.hypot((m.x + 8) - (hero.x + 8), (m.y + 8) - (hero.y + 12)) > 52) continue;
          burned = true;
          m.hp -= 8;
          m.flashTimer = 0.18;
          spawnFloatingText("-8 DAWN", m.x - 2, m.y - 10, vceColor(7, 6, 3));
          if (m.hp <= 0) handleMonsterDefeat(m);
        }
        if (burned) playSfxBlip(1700);
      }
    }

    if (dialogueState.active) {
      if (dialogueState.activeChoices && dialogueState.activeChoices.length > 0) {
        if (consumeJustPressed('ArrowUp') || consumeJustPressed('KeyW')) {
          if (dialogueState.choiceIndex > 0) {
            dialogueState.choiceIndex--;
            playSfxBlip(900);
          }
        }
        if (consumeJustPressed('ArrowDown') || consumeJustPressed('KeyS')) {
          if (dialogueState.choiceIndex < dialogueState.activeChoices.length - 1) {
            dialogueState.choiceIndex++;
            playSfxBlip(900);
          }
        }
      } else {
        if (consumeJustPressed('ArrowUp') || consumeJustPressed('KeyW')) {
          if (dialogueState.scrollOffset > 0) dialogueState.scrollOffset--;
        }
        if (consumeJustPressed('ArrowDown') || consumeJustPressed('KeyS')) {
          const curLine = dialogueState.lines[dialogueState.lineIndex];
          const curPid = curLine?.portraitId || (dialogueState.npc ? dialogueState.npc.portraitId || dialogueState.npc.id : null);
          const hasPortrait = curPid !== null && (
            curPid === 'nyah' || curPid === 'fifi' || curPid === 'lumina' || curPid === 'elder' || curPid === 'guard' || curPid === 'child' || curPid === 'seagull'
          );
          const fullLines = wrapDialogueText(dialogueState.lines[dialogueState.lineIndex].text, hasPortrait ? 28 : 36);
          if (dialogueState.scrollOffset < fullLines.length - 6) dialogueState.scrollOffset++;
        }
      }

      const curLine = dialogueState.lines[dialogueState.lineIndex];
      if (!dialogueState.isComplete) {
        dialogueState.crawlTimer += dt;
        if (dialogueState.crawlTimer >= 0.035) {
          dialogueState.crawlTimer = 0;
          dialogueState.charIndex++;
          const ch = curLine.text[dialogueState.charIndex - 1];
          if (ch && ch !== ' ') {
            const speakerId = (curLine.speaker ? curLine.speaker.toLowerCase() : (dialogueState.npc ? dialogueState.npc.id : 'nyah'));
            const expr = curLine.expr || (dialogueState.npc ? (dialogueState.npc.currentExpression || dialogueState.npc.expr) : 'normal');
            if (typeof playVoiceBlip === 'function') {
              playVoiceBlip(speakerId, expr, ch.charCodeAt(0));
            } else {
              const freq = (speakerId.includes('nyah')) ? 1580 : (speakerId.includes('lumina')) ? 1200 : 700;
              playSfxBlip(freq);
            }
            dialogueState.mouthFlap = (dialogueState.charIndex % 3 !== 0);
          }
          if (dialogueState.charIndex >= curLine.text.length) {
            dialogueState.isComplete = true;
            dialogueState.mouthFlap = false;
            if (curLine.choices) {
              const active = curLine.choices.filter(c => !c.condition || c.condition());
              if (active.length > 0) {
                dialogueState.activeChoices = active;
                dialogueState.choiceIndex = 0;
              }
            }
          }
          const curPid = curLine?.portraitId || (dialogueState.npc ? dialogueState.npc.portraitId || dialogueState.npc.id : null);
          const hasPortrait = curPid !== null && (
            curPid === 'nyah' || curPid === 'fifi' || curPid === 'lumina' || curPid === 'elder' || curPid === 'guard' || curPid === 'child' || curPid === 'seagull'
          );
          const currentWrapped = wrapDialogueText(curLine.text.substring(0, dialogueState.charIndex), hasPortrait ? 28 : 36);
          if (currentWrapped.length > 6) {
            dialogueState.scrollOffset = currentWrapped.length - 6;
          }
        }
      }

      dialogueState.blinkTimer += dt;
      if (dialogueState.blinkTimer > 2.8) {
        dialogueState.eyeBlink = (dialogueState.blinkTimer < 3.0);
        if (dialogueState.blinkTimer > 3.05) dialogueState.blinkTimer = 0;
      }
      dialogueState.earTimer += dt;
      if (dialogueState.earTimer > 3.2) {
        dialogueState.earTwitch = (dialogueState.earTimer < 3.45);
        if (dialogueState.earTimer > 3.5) dialogueState.earTimer = 0;
      }

      if (consumeJustPressed('Space') || consumeJustPressed('KeyE') || consumeJustPressed('Enter')) {
        advanceDialogue();
      }
      return;
    }

    // The ore cart ride owns the frame while it runs. Monsters and projectiles
    // hold still for the ~3 s trip: it is a scripted vehicle, not a fight.
    if (updateMinesCart(dt)) {
      updateNyahCompanion(dt);
      updateFifiCompanion(dt);
      updateFifiBolts(dt);
      const rideMap = getActiveMap();
      const rideW = rideMap.width * TILE_SZ;
      const rideH = rideMap.height * TILE_SZ;
      camera.x = (rideW <= 256) ? Math.floor((rideW - 256) / 2) : Math.max(0, Math.min(rideW - 256, hero.x + 8 - 128));
      camera.y = (rideH <= 224) ? Math.floor((rideH - 224) / 2) : Math.max(0, Math.min(rideH - 224, hero.y + 8 - 112));
      return;
    }

    // Real-Time QuickSlot Potions [1]-[3]
    if (consumeJustPressed('Digit1')) useQuickSlot(0);
    if (consumeJustPressed('Digit2')) useQuickSlot(1);
    if (consumeJustPressed('Digit3')) useQuickSlot(2);

    // Dodge step: Shift, or the touch DASH button. Checked before the attack
    // keys so a dodge can cancel a swing that is already committed.
    if (consumeJustPressed('ShiftLeft') || consumeJustPressed('ShiftRight')) {
      startDodge();
    }

    // Hold-[Z] Charge for Whirlwind Spin Slash & Attack Handling
    if (keysDown['KeyZ']) {
      if (!hero.isAttacking && !dialogueState.active && !transitionState.active) {
        hero.chargeTimer = (hero.chargeTimer || 0) + dt;
        if (hero.chargeTimer >= 0.60 && !hero.chargeReady) {
          hero.chargeReady = true;
          playSfxBlip(1200);
          spawnFloatingText("CHARGE READY!", hero.x - 12, hero.y - 12, vceColor(7, 6, 1));
        }
      }
    } else {
      if (hero.chargeTimer > 0) {
        if (hero.chargeTimer >= 0.60) {
          startWhirlwindSpin();
        } else {
          startSwordSlash();
        }
        hero.chargeTimer = 0;
        hero.chargeReady = false;
      }
    }

    if (consumeJustPressed('KeyE') || consumeJustPressed('KeyX')) {
      tryInteract(true);
    }

    if (consumeJustPressed('KeyC')) {
      triggerMaidTwinStarburst();
    }

    if (consumeJustPressed('Space') || consumeJustPressed('Enter')) {
      const interacted = tryInteract(false);
      if (!interacted && dialogueCloseCooldown <= 0) {
        startSwordSlash();
      }
    }

    // Hero Movement
    let dx = 0, dy = 0;
    if (hero.dodgeTimer > 0) {
      // Dodge owns movement for its duration; steering is locked so the step is
      // a committed evade, not a sprint.
      dx = hero.dodgeDirX;
      dy = hero.dodgeDirY;
    } else if (!hero.isAttacking) {
      if (keysDown['ArrowUp'] || keysDown['KeyW']) dy -= 1;
      if (keysDown['ArrowDown'] || keysDown['KeyS']) dy += 1;
      if (keysDown['ArrowLeft'] || keysDown['KeyA']) dx -= 1;
      if (keysDown['ArrowRight'] || keysDown['KeyD']) dx += 1;
    }

    hero.isMoving = (dx !== 0 || dy !== 0);

    if (hero.isMoving) {
      if (dy > 0) hero.dir = 0;
      else if (dy < 0) hero.dir = 1;
      else if (dx < 0) hero.dir = 2;
      else if (dx > 0) hero.dir = 3;

      const mag = Math.hypot(dx, dy) || 1;
      const isSlowed = (hero.slowTimer > 0) && (hero.accessory !== 'sea_charm' && !hasItem('sea_charm'));
      const effectiveSpeed = (hero.dodgeTimer > 0) ? 240 : (isSlowed ? (hero.speed * 0.60) : hero.speed);
      const moveDist = effectiveSpeed * dt;
      const stepX = (dx / mag) * moveDist;
      const stepY = (dy / mag) * moveDist;

      if (!checkCollision(hero.x + stepX, hero.y)) {
        hero.x += stepX;
      }
      if (!checkCollision(hero.x, hero.y + stepY)) {
        hero.y += stepY;
      }

      // Record hero trail for party train
      const lastTrail = heroTrail[heroTrail.length - 1];
      if (!lastTrail || Math.hypot(hero.x - lastTrail.x, hero.y - lastTrail.y) >= 4) {
        heroTrail.push({ x: hero.x, y: hero.y, dir: hero.dir });
        if (heroTrail.length > 36) heroTrail.shift();
      }

      // Ring of Melody HP Regen (+2 HP every 3s while moving)
      if (hero.accessory === 'ring_melody' || hasItem('ring_melody')) {
        hero.regenTimer = (hero.regenTimer || 0) + dt;
        if (hero.regenTimer >= 3.0) {
          hero.regenTimer = 0;
          if (hero.hp < hero.maxHp) {
            hero.hp = Math.min(hero.maxHp, hero.hp + 2);
            spawnFloatingText("+2 HP", hero.x, hero.y - 12, vceColor(2, 7, 2));
            updateHudBars();
          }
        }
      }

      hero.animTimer += dt;
      if (hero.animTimer >= 0.14) {
        hero.animTimer = 0;
        hero.animFrame = (hero.animFrame + 1) % 3;
      }
    } else {
      hero.animFrame = 0;
      hero.animTimer = 0;
    }

    const curMap = getActiveMap();
    const mapPxW = curMap.width * TILE_SZ;
    const mapPxH = curMap.height * TILE_SZ;
    hero.x = Math.max(8, Math.min(mapPxW - 24, hero.x));
    hero.y = Math.max(8, Math.min(mapPxH - 20, hero.y));

    // Automap: reveal a small square around the hero as they explore.
    markMapExplored(activeMapId,
      Math.floor((hero.x + 8) / TILE_SZ),
      Math.floor((hero.y + 12) / TILE_SZ), 2);

    if (heroTrail.length === 0) {
      heroTrail.push({ x: hero.x, y: hero.y, dir: hero.dir });
    }

    // Step-on Map Transitions (guarded by transitionGraceTimer)
    if (transitionGraceTimer <= 0) {
      if (activeMapId === 'aldenor_exterior') {
        const heroTx = Math.floor((hero.x + 8) / TILE_SZ);
        const heroTy = Math.floor((hero.y + 12) / TILE_SZ);
        if (heroTy >= 24 && heroTx >= 14 && heroTx <= 17 && hero.dir === 0) {
          if (!flags.nyahJoinedParty && (!flags.rivalMaidTrialStep || flags.rivalMaidTrialStep < 2)) {
            triggerNyahSouthGateAmbush();
          } else {
            if (!flags.nyahJoinedParty && flags.rivalMaidTrialStep === 2 && !flags.southGateAmbushShown) {
              flags.southGateAmbushShown = true;
              hero.y = 22 * 16 + 8;
              triggerNyahSouthGateAmbush();
            } else {
              startMapTransition('aldenor_coastal_plains', 15 * 16 + 8, 2 * 16, 0);
            }
          }
        } else if (heroTy <= 1 && (heroTx === 24 || heroTx === 25) && hero.dir === 1) {
          const hasAllRelics = (flags.bellForkFound || hasItem('bell_tuning_fork')) &&
                               (flags.bellClapperFound || hasItem('bell_clapper')) &&
                               (flags.sanctumCrestFound || hasItem('sanctum_crest'));
          if (hasAllRelics) {
            flags.bellForkFound = true;
            flags.bellClapperFound = true;
            flags.sanctumCrestFound = true;
            dungeonState.spireGateOpen = true;
            startMapTransition('bell_spire', 10 * 16, 25 * 16, 1);
          } else {
            startCustomDialogueTree([
              { speaker: 'SANCTUM GATE', portraitId: null, expr: 'friendly', text: "The Iron Sanctum Gate is sealed by three resonance locks. Three sacred Bell Relics are required: the Tuning Fork, the Clapper, and the Sanctum Crest." }
            ], 'nyah');
          }
        }
      } else if (activeMapId === 'aldenor_coastal_plains') {
        const heroTx = Math.floor((hero.x + 8) / TILE_SZ);
        const heroTy = Math.floor((hero.y + 12) / TILE_SZ);
        if (heroTy <= 1 && heroTx >= 14 && heroTx <= 17 && hero.dir === 1) {
          startMapTransition('aldenor_exterior', 15 * 16 + 8, 23 * 16, 1);
        } else if ((heroTx === 2 || heroTx === 3) && (heroTy === 8 || heroTy === 9)) {
          // Strict Progression Gate 1: Must recruit Nyah and rescue Kitten Mochi before entering Old Quarry Mines!
          if (!flags.nyahRecruited) {
            hero.x = 5 * 16;
            hero.dir = 3;
            playSfxBlip(900);
            startCustomDialogueTree([
              {
                speaker: 'FIFI',
                portraitId: 'fifi',
                expr: 'panicked',
                text: "M-Master, wait! The Old Quarry Mines are swarming with armored rock beetles and goblins! Let's finish defeating 3 Slimes and recruit Miss Nyah at the South Gate before we go inside!"
              }
            ], 'fifi');
          } else if (!flags.mochiQuestDone && !flags.kittenRescued) {
            hero.x = 5 * 16;
            hero.dir = 3;
            playSfxBlip(900);
            startCustomDialogueTree([
              {
                speaker: 'NYAH',
                portraitId: 'nyah',
                expr: 'bratty',
                text: "Hold up, Master! Before we dive deep into the Old Quarry Mines, little Lyla's white kitten Mochi is stranded right down in the western pine grove (just south of here)! Let's rescue Mochi and return him to Lyla in town first!"
              }
            ], 'nyah');
          } else {
            startMapTransition('dungeon_mines', 8 * 16, 28 * 16, 1);
          }
        } else if ((heroTx === 28 || heroTx === 29) && (heroTy === 9 || heroTy === 10)) {
          // Strict Progression Gate 2: Must clear Old Quarry Mines (bellForkFound) AND be at Twilight!
          if (!flags.bellForkFound && !hasItem('bell_tuning_fork')) {
            hero.x = 26 * 16;
            hero.dir = 2;
            playSfxBlip(900);
            // Nyah is still at the Manor during the first trial. The gate used
            // to speak with her voice before she had even joined the party;
            // Fifi is the one travelling with Adol until the recruitment.
            const nyahHere = flags.nyahRecruited || flags.nyahJoinedParty;
            startCustomDialogueTree([
              nyahHere ? {
                speaker: 'NYAH',
                portraitId: 'nyah',
                expr: 'bratty',
                text: "Whoa there, Master! The eastern Coastal Crypts are sealed by a heavy resonance ward! We have to clear the western Old Quarry Mines and recover the Silver Bell Tuning Fork first!"
              } : {
                speaker: 'FIFI',
                portraitId: 'fifi',
                expr: 'panicked',
                text: "M-Master, wait! The eastern Coastal Crypts are sealed by a heavy resonance ward. We have to clear the western Old Quarry Mines and recover the Silver Bell Tuning Fork first!"
              }
            ], nyahHere ? 'nyah' : 'fifi');
          } else if (!flags.isTwilight) {
            hero.x = 26 * 16;
            hero.dir = 2;
            playSfxBlip(900);
            const nyahHere = flags.nyahRecruited || flags.nyahJoinedParty;
            startCustomDialogueTree([
              nyahHere ? {
                speaker: 'NYAH',
                portraitId: 'nyah',
                expr: 'smug',
                text: "The Coastal Crypts only unseal beneath the dusk moon, Master! Rest with Elder Gared in town until Twilight, then come back and we'll crack this ward together!"
              } : {
                speaker: 'FIFI',
                portraitId: 'fifi',
                expr: 'curious',
                text: "The Coastal Crypts only unseal beneath the dusk moon... Elder Gared in town can rest us until Twilight. Let's go ask him, Master!"
              }
            ], nyahHere ? 'nyah' : 'fifi');
          } else {
            startMapTransition('dungeon_crypts', 8 * 16, 28 * 16, 1);
          }
        } else if (heroTx === 16 && (heroTy === 20 || heroTy === 21)) {
          // Strict Progression Gate 3: Must clear Coastal Crypts (bellClapperFound) before entering Sunken Shrine!
          if (!flags.bellClapperFound && !hasItem('bell_clapper')) {
            hero.y = 18 * 16;
            hero.dir = 1;
            playSfxBlip(900);
            startCustomDialogueTree([
              {
                speaker: 'NYAH',
                portraitId: 'nyah',
                expr: 'bratty',
                text: "Hold it, Master! The Sunken Sea Shrine's abyssal seal won't budge until we recover both the Tuning Fork from the western Mines AND the Bell Clapper from the eastern Coastal Crypts!"
              }
            ], 'nyah');
          } else {
            startMapTransition('dungeon_shrine', 8 * 16, 28 * 16, 1);
          }
        }
      } else if (activeMapId.startsWith('dungeon_')) {
        const heroTx = Math.floor((hero.x + 8) / TILE_SZ);
        const heroTy = Math.floor((hero.y + 12) / TILE_SZ);
        if (heroTx === 8 && heroTy >= 30) {
          if (activeMapId === 'dungeon_mines') {
            startMapTransition('aldenor_coastal_plains', 5 * 16, 9 * 16, 3);
          } else if (activeMapId === 'dungeon_crypts') {
            startMapTransition('aldenor_coastal_plains', 26 * 16, 10 * 16, 2);
          } else if (activeMapId === 'dungeon_shrine') {
            startMapTransition('aldenor_coastal_plains', 16 * 16, 18 * 16, 1);
          }
        } else if (heroTx === 32 && heroTy === 12) {
          startMapTransition(activeMapId, 8 * 16, 28 * 16, 1);
        }
      } else if (activeMapId === 'bell_spire') {
        const heroTx = Math.floor((hero.x + 8) / TILE_SZ);
        const heroTy = Math.floor((hero.y + 12) / TILE_SZ);
        if ((heroTx === 9 || heroTx === 10) && heroTy >= 27) {
          startMapTransition('aldenor_exterior', 25 * 16, 2 * 16, 0);
        }
      } else {
        // Check Interior Exit Mat tile trigger
        const heroTx = Math.floor((hero.x + 8) / TILE_SZ);
        const heroTy = Math.floor((hero.y + 12) / TILE_SZ);
        const curTile = (heroTy >= 0 && heroTy < curMap.height && heroTx >= 0 && heroTx < curMap.width)
          ? curMap.groundLayer[heroTy * curMap.width + heroTx]
          : null;

        const isExitMat = (curTile === 'exitMat');
        const isExitDoorArea = (heroTy >= curMap.height - 2) && (
          (activeMapId === 'lumina_workshop' && (heroTx === 6 || heroTx === 7)) ||
          (activeMapId !== 'lumina_workshop' && (heroTx === 7 || heroTx === 8))
        );

        if ((isExitMat || isExitDoorArea) && (hero.dir === 0 || isExitMat)) {
          if (activeMapId === 'manor_parlor' || activeMapId === 'grand_manor_interior') {
            startMapTransition('aldenor_exterior', 24 * 16, 6 * 16, 0);
          } else if (activeMapId === 'lumina_workshop') {
            startMapTransition('aldenor_exterior', 6 * 16, 10 * 16, 0);
          } else if (activeMapId === 'harbor_tavern') {
            startMapTransition('aldenor_exterior', 24 * 16, 21 * 16, 0);
          } else if (activeMapId === 'goran_forge') {
            startMapTransition('aldenor_exterior', 5 * 16, 6 * 16, 0);
          }
        }
      }
    }

    // Hero Idle Timer & Companion Updates
    if (!hero.isMoving && !hero.isAttacking) {
      hero.idleTimer = (hero.idleTimer || 0) + dt;
    } else {
      hero.idleTimer = 0;
    }
    updateNyahCompanion(dt);
    updateFifiCompanion(dt);
    updateFifiBolts(dt);

    // Starburst timers & autonomous boss trigger
    if (starburstCutinTimer > 0) starburstCutinTimer -= dt;
    for (let i = starburstPillars.length - 1; i >= 0; i--) {
      const p = starburstPillars[i];
      p.timer -= dt;
      if (p.timer <= 0) starburstPillars.splice(i, 1);
    }
    if (flags.nyahJoinedParty && (hero.tp || 0) >= 100) {
      const curBoss = (typeof isBossActive === 'function') ? isBossActive() : null;
      const livingCount = monsters.filter(m => m.alive).length;
      if ((curBoss && curBoss.hp > 0) || livingCount >= 3) {
        triggerMaidTwinStarburst();
      }
    }

    // Jealous Wedge: Nyah bumps Fifi to Slot 2 every 14s out of combat
    const isCombatZone = (activeMapId === 'aldenor_coastal_plains' || activeMapId.startsWith('dungeon_') || activeMapId === 'bell_spire');
    if (flags.nyahJoinedParty && !isCombatZone) {
      jealousWedgeTimer += dt;
      if (jealousWedgeTimer >= 14.0) {
        jealousWedgeTimer = 0;
        if (!flags.nyahInFrontSlot) {
          flags.nyahInFrontSlot = true;
          if (typeof nyahCompanion !== 'undefined') {
            nyahCompanion.squashX = 1.3;
            nyahCompanion.squashY = 0.75;
          }
          if (window.fifiCompanion) {
            window.fifiCompanion.squashX = 0.8;
            window.fifiCompanion.squashY = 1.25;
            spawnFloatingText("MY SPOT, DOGGY! >:3", nyahCompanion.x - 24, nyahCompanion.y - 18, vceColor(7, 3, 4));
            spawnFloatingText("W-Wah?! Master...!", window.fifiCompanion.x - 20, window.fifiCompanion.y - 14, vceColor(7, 6, 7));
          }
          playSfxBlip(1600);
        }
      }
    } else {
      jealousWedgeTimer = 0;
    }

    // Squash & Stretch decay
    hero.squashX = (hero.squashX || 1.0) + (1.0 - (hero.squashX || 1.0)) * 10 * dt;
    hero.squashY = (hero.squashY || 1.0) + (1.0 - (hero.squashY || 1.0)) * 10 * dt;
    if (typeof nyahCompanion !== 'undefined') {
      nyahCompanion.squashX = (nyahCompanion.squashX || 1.0) + (1.0 - (nyahCompanion.squashX || 1.0)) * 10 * dt;
      nyahCompanion.squashY = (nyahCompanion.squashY || 1.0) + (1.0 - (nyahCompanion.squashY || 1.0)) * 10 * dt;
    }

    // NPC Patrols & AI
    npcs.forEach(n => {
      if (n.mapId !== activeMapId || n.active === false) return;

      if (n.id === 'nyah') {
        n.earTimer = (n.earTimer || 0) + dt;
        if (n.earTimer > 3.0) {
          if (n.earTimer > 3.35) n.earTimer = 0;
        }
      }
      if (n.isEngaged) return;

      if (n.patrol) {
        const p = n.patrol;
        if (p.pauseTimer > 0) {
          p.pauseTimer -= dt;
        } else {
          n.x += n.speed * p.dir * dt;
          n.dir = p.dir > 0 ? 3 : 2;

          if (n.x >= p.maxX) {
            n.x = p.maxX;
            p.dir = -1;
            p.pauseTimer = 1.2;
          } else if (n.x <= p.minX) {
            n.x = p.minX;
            p.dir = 1;
            p.pauseTimer = 1.2;
          }

          if (checkNpcHeroCollision(n, hero.x, hero.y)) {
            n.x -= n.speed * p.dir * dt;
            p.dir *= -1;
            p.pauseTimer = 0.8;
          }
        }
      }
    });

    // Nyah Sweeping on Manor Steps (Exterior Midday when waiting at Manor Gate)
    const nyah = npcs.find(n => n.id === 'nyah');
    if (nyah) {
      if (activeMapId === 'aldenor_exterior' && !flags.isTwilight && (!flags.rivalMaidTrialStep || flags.rivalMaidTrialStep < 2) && !flags.nyahRecruited && !nyah.isEngaged) {
        nyah.isSweeping = true;
        nyah.sweepTimer = (nyah.sweepTimer || 0) + dt;
        if (nyah.sweepTimer >= 0.45) {
          nyah.sweepTimer = 0;
          nyah.sweepFrame = (nyah.sweepFrame === 1 ? 0 : 1);
          spawnBroomDust(nyah.x + (nyah.sweepFrame ? -5 : 5), nyah.y + 7);
          const distToHero = Math.hypot(hero.x - nyah.x, hero.y - nyah.y);
          if (distToHero <= 96) {
            playSfxBroom();
          }
        }
      } else {
        nyah.isSweeping = false;
        nyah.sweepTimer = 0;
      }
    }

    // Bard Strumming Lute in Harbor Tavern
    if (activeMapId === 'harbor_tavern') {
      const bard = npcs.find(n => n.id === 'bard');
      if (bard && bard.active && !bard.isEngaged) {
        bard.noteTimer = (bard.noteTimer || 0) + dt;
        if (bard.noteTimer >= 2.4) {
          bard.noteTimer = 0;
          spawnMusicalNote(bard.x + 8, bard.y + 2);
          playSfxLute();
        }
      }
    }

    // Combat Maps Action Combat Loop
    const isCombatMap = (activeMapId === 'aldenor_coastal_plains' || activeMapId.startsWith('dungeon_') || activeMapId === 'bell_spire');
    if (isCombatMap && hero.hp > 0 && !transitionState.active) {
      // Boss Pre-Fight Cutscene Triggers
      if (activeMapId === 'dungeon_mines' && hero.x >= 18 * 16 && hero.y < 16 * 16) {
        if (!flags.bossGolemCutscene && !flags.bossGolemDefeated) {
          flags.bossGolemCutscene = true;
          startCustomDialogueTree([
            { speaker: 'NYAH', expr: 'flustered', text: "WHOA!! Master, look at the size of that thing—the first relic is jammed right into its magma core! Watch the ceiling shadows when it jumps, and hit its core when it crashes into the cavern wall!" }
          ], 'nyah');
        }
      } else if (activeMapId === 'dungeon_crypts' && hero.x >= 18 * 16 && hero.y < 16 * 16) {
        if (!flags.bossLichCutscene && !flags.bossLichDefeated) {
          flags.bossLichCutscene = true;
          startCustomDialogueTree([
            { speaker: 'LORD MALAKOR', portraitId: null, expr: 'friendly', text: "Foolish mortals... The Bell of Aldenor shall never chime again! The Eternal Twilight claims this isle, and your bones shall join my legion!" },
            { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Keep your crusty bone hands to yourself, grandpa! Master, when he summons that spinning bone shield, watch for the gap after he teleports—I'll pounce in to break his focus!" }
          ], 'nyah');
        }
      } else if (activeMapId === 'dungeon_shrine' && hero.x >= 18 * 16 && hero.y < 16 * 16) {
        if (!flags.bossLeviathanCutscene && !flags.bossLeviathanDefeated) {
          flags.bossLeviathanCutscene = true;
          startCustomDialogueTree([
            { speaker: 'NYAH', expr: 'flustered', text: "OKAY THAT IS A VERY BIG SEA DRAGON. Watch the floor grates when the water bubbles, Master—and when the whirlpool pulls us in, wait for me to leap at her head to stagger her so you can unleash Clerici's Sacred Blade!" }
          ], 'nyah');
        }
      } else if (activeMapId === 'bell_spire' && hero.y <= 12 * 16) {
        if (!flags.bossEclipseCutscene && !flags.bossEclipseDefeated) {
          flags.bossEclipseCutscene = true;
          startCustomDialogueTree([
            { speaker: 'SHADOW OF ECLIPSE', portraitId: null, expr: 'friendly', text: "Three hundred years I slumbered beneath the chime of bronze and silver... Your fragile dawn is over, Swordsman. Drown in the endless dark!" },
            { speaker: 'NYAH', portraitId: 'nyah', expr: 'bratty', text: "Not while nyah and Master are standing here!! You messed with my Manor, you put the Lord to sleep, and you ruined our tea time! Master—let's ring that Bell right in its face!!" }
          ], 'nyah');
        }
      }

      // Adol Sword Hitbox Processing
      const swordBox = getSwordHitbox();
      if (swordBox) {
        monsters.forEach(m => {
          if (!m.alive || m.hitTimer > 0) return;
          if (swordBox.x < m.x + 14 && swordBox.x + swordBox.w > m.x + 2 &&
              swordBox.y < m.y + 14 && swordBox.y + swordBox.h > m.y + 2) {

            // Frontal defense checks
            const isFacingOpposite = (m.dir === 0 && hero.dir === 1) || (m.dir === 1 && hero.dir === 0) ||
                                     (m.dir === 2 && hero.dir === 3) || (m.dir === 3 && hero.dir === 2);

            let dmg = calcHeroDamage(m.def);
            // Flame Edge's advertised undead bonus. The old build only used the
            // weapon to bypass skeleton parries, so the description was a lie.
            if (hero.weapon === 'flame_edge' && isUndeadMonster(m.type)) {
              dmg = Math.round(dmg * 1.3);
              spawnFloatingText("SEARED!", m.x - 8, m.y - 16, vceColor(7, 3, 1));
            }

            if (m.type === 'rock_beetle' && isFacingOpposite && (m.staggerTimer || 0) <= 0) {
              dmg = Math.max(1, Math.round(dmg * 0.20));
              spawnFloatingText("DEFLECTED!", m.x - 4, m.y - 8, vceColor(6, 6, 6));
            } else if (m.type === 'skeleton_knight' && hero.weapon !== 'flame_edge' && isFacingOpposite && (m.staggerTimer || 0) <= 0) {
              dmg = 0;
              playSfxBlip(400);
              spawnFloatingText("PARRIED!", m.x - 4, m.y - 8, vceColor(6, 6, 6));

              // Shadow Pounce Perk trigger
              if (nyahCompanion.perks && nyahCompanion.perks.includes('shadow_pounce') && (nyahCompanion.pounceCooldown || 0) <= 0) {
                nyahCompanion.pounceCooldown = 4.0;
                nyahCompanion.x = m.x + (hero.dir === 3 ? 18 : (hero.dir === 2 ? -18 : 0));
                nyahCompanion.y = m.y + (hero.dir === 0 ? 18 : (hero.dir === 1 ? -18 : 0));
                m.staggerTimer = 1.4;
                m.hitTimer = 0.25;
                m.dir = [1, 0, 3, 2][m.dir] ?? 0;
                spawnFloatingText("HIT 'EM NOW, MASTER!", nyahCompanion.x - 24, nyahCompanion.y - 14, vceColor(7, 3, 4));
                playSfxClaw();
              }
              return;
            }

            if (!Number.isFinite(dmg)) dmg = 2;
            m.hp -= dmg;
            m.flashTimer = 0.08;
            m.hitTimer = 0.22;
            playSfxHit();
            // Impact sparks: a short radial burst in the weapon's own colour, so
            // every blade looks different when it connects.
            const sparkColor = (WEAPONS[hero.weapon] && WEAPONS[hero.weapon].arcColor) ? WEAPONS[hero.weapon].arcColor : vceColor(7, 7, 4);
            for (let si = 0; si < 7; si++) {
              const sa = (si / 7) * Math.PI * 2 + Math.random() * 0.5;
              const sspd = 24 + Math.random() * 40;
              particles.push({
                x: m.x + 8 + Math.cos(sa) * 4,
                y: m.y + 8 + Math.sin(sa) * 4,
                vx: Math.cos(sa) * sspd,
                vy: Math.sin(sa) * sspd,
                life: 0.16 + Math.random() * 0.12,
                maxLife: 0.28,
                size: 2,
                color: (si % 3 === 0) ? vceColor(7, 7, 7) : sparkColor
              });
            }
            hero.tp = Math.min(100, (hero.tp || 0) + 10);
            updateHudBars();
            hero.squashX = 1.25; hero.squashY = 0.8;
            spawnFloatingText(`-${dmg}`, m.x + 4, m.y - 4, vceColor(7, 7, 1));
            spawnFloatingText("+10 TP", hero.x, hero.y - 12, vceColor(7, 3, 7));

            let targetKx = m.x, targetKy = m.y;
            if (hero.dir === 0) targetKy += 14;
            else if (hero.dir === 1) targetKy -= 14;
            else if (hero.dir === 2) targetKx -= 14;
            else if (hero.dir === 3) targetKx += 14;
            if (!checkCollision(targetKx, m.y)) m.x = targetKx;
            if (!checkCollision(m.x, targetKy)) m.y = targetKy;

            if (m.hp <= 0) {
              handleMonsterDefeat(m);
            }
          }
        });
      }

      // Update Enemy Projectiles
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const p = enemyProjectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.dist += Math.hypot(p.vx, p.vy) * dt;

        if (hero.invulnTimer <= 0 && hero.hp > 0) {
          if (Math.hypot(p.x - (hero.x + 8), p.y - (hero.y + 8)) < 11) {
            const incomingDmg = calcMonsterDamage(p.damage);
            hero.hp = Math.max(0, hero.hp - incomingDmg);
            hero.invulnTimer = 0.75;
            playSfxHurt();
            spawnFloatingText(`-${incomingDmg}`, hero.x + 4, hero.y - 8, vceColor(7, 2, 2));
            enemyProjectiles.splice(i, 1);
            if (hero.hp <= 0) triggerHeroDefeat();
            continue;
          }
        }

        if (p.dist >= p.maxDist || isPointSolid(p.x, p.y)) {
          enemyProjectiles.splice(i, 1);
        }
      }

      // Update Hero Sword Beams
      for (let i = swordBeams.length - 1; i >= 0; i--) {
        const b = swordBeams[i];
        let bvx = 0, bvy = 0;
        if (b.dir === 0) bvy = b.speed;
        else if (b.dir === 1) bvy = -b.speed;
        else if (b.dir === 2) bvx = -b.speed;
        else if (b.dir === 3) bvx = b.speed;

        b.x += bvx * dt;
        b.y += bvy * dt;
        b.dist += b.speed * dt;

        let hit = false;
        monsters.forEach(m => {
          if (!m.alive || hit) return;
          if (Math.hypot(b.x - (m.x + 8), b.y - (m.y + 8)) < 14) {
            hit = true;
            let dmg = calcHeroDamage(m.def, 1.2);
            if (!Number.isFinite(dmg)) dmg = 4;
            m.hp -= dmg;
            m.flashTimer = 0.08;
            m.hitTimer = 0.20;
            playSfxHit();
            spawnFloatingText(`-${dmg}`, m.x + 4, m.y - 6, vceColor(6, 7, 7));
            if (m.hp <= 0) handleMonsterDefeat(m);
          }
        });

        if (hit || b.dist >= b.maxDist || isPointSolid(b.x, b.y)) {
          swordBeams.splice(i, 1);
        }
      }

      // Monster AI Update
      monsters.forEach(m => {
        if (!m.alive) return;
        if (m.hitTimer > 0) m.hitTimer -= dt;
        if (m.flashTimer > 0) m.flashTimer -= dt;
        if (m.staggerTimer > 0) m.staggerTimer -= dt;
        if (m.hitTimer > 0) return;

        // Committed attack: hold still, then resolve. Being hit pauses the tell
        // because the hitTimer early-return above runs first.
        if (m.windup > 0) {
          m.windup -= dt;
          if (m.windup > 0) return;
          m.windup = 0;
          const fire = m.pendingAttack;
          m.pendingAttack = null;
          if (typeof fire === 'function') fire();
          return;
        }

        if (m.type === 'slime') {
          m.hopTimer = (m.hopTimer || 0) + dt;
          if (m.hopTimer >= 1.2) m.hopTimer = 0;
          if (m.hopTimer < 0.45) {
            const dx = hero.x - m.x, dy = hero.y - m.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < 180) {
              const step = m.speed * dt;
              const nx = m.x + (dx / dist) * step;
              const ny = m.y + (dy / dist) * step;
              if (!checkCollision(nx, m.y)) m.x = nx;
              if (!checkCollision(m.x, ny)) m.y = ny;
            }
          }
        } else if (m.type === 'crab') {
          const cdx = hero.x - m.x, cdy = hero.y - m.y;
          const cdist = Math.hypot(cdx, cdy);
          if (cdist < 72) {
            const step = m.speed * dt;
            const nx = m.x + (cdx / (cdist || 1)) * step;
            const ny = m.y + (cdy / (cdist || 1)) * step;
            if (!checkCollision(nx, m.y)) m.x = nx;
            if (!checkCollision(m.x, ny)) m.y = ny;
          } else {
            const nx = m.x + (m.patrolDir || 1) * m.speed * 0.6 * dt;
            if (nx < 4 * 16 || nx > 27 * 16 || checkCollision(nx, m.y)) {
              m.patrolDir = -(m.patrolDir || 1);
            } else {
              m.x = nx;
            }
          }
        } else if (m.type === 'cave_bat') {
          m.sineTimer = (m.sineTimer || 0) + dt * 4;
          const bdx = hero.x - m.x, bdy = hero.y - m.y;
          const bdist = Math.hypot(bdx, bdy) || 1;
          if (bdist < 180 && (typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y))) {
            const nx = m.x + (bdx / bdist) * m.speed * dt;
            const ny = m.y + ((bdy / bdist) * m.speed + Math.sin(m.sineTimer) * 18) * dt;
            if (!checkCollision(nx, m.y)) m.x = nx;
            if (!checkCollision(m.x, ny)) m.y = ny;
          }
        } else if (m.type === 'goblin_miner') {
          m.shootTimer = (m.shootTimer || 0) - dt;
          const gdx = hero.x - m.x, gdy = hero.y - m.y;
          const gdist = Math.hypot(gdx, gdy) || 1;
          const canSeeHero = typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y);
          if (gdist < 200 && canSeeHero) {
            if (gdist > 70) {
              const nx = m.x + (gdx / gdist) * m.speed * dt;
              const ny = m.y + (gdy / gdist) * m.speed * dt;
              if (!checkCollision(nx, m.y)) m.x = nx;
              if (!checkCollision(m.x, ny)) m.y = ny;
            } else if (gdist < 40) {
              const nx = m.x - (gdx / gdist) * m.speed * dt;
              const ny = m.y - (gdy / gdist) * m.speed * dt;
              if (!checkCollision(nx, m.y)) m.x = nx;
              if (!checkCollision(m.x, ny)) m.y = ny;
            }
            if (m.shootTimer <= 0) {
              m.shootTimer = 2.4;
              enemyProjectiles.push({ x: m.x + 8, y: m.y + 8, vx: (gdx / gdist) * 110, vy: (gdy / gdist) * 110, dist: 0, maxDist: 100, damage: 18, color: vceColor(5, 4, 2) });
            }
          }
        } else if (m.type === 'rock_beetle') {
          const rdx = hero.x - m.x, rdy = hero.y - m.y;
          const rdist = Math.hypot(rdx, rdy) || 1;
          if (rdist < 140 && (typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y))) {
            const nx = m.x + (rdx / rdist) * m.speed * dt;
            const ny = m.y + (rdy / rdist) * m.speed * dt;
            if (!checkCollision(nx, m.y)) m.x = nx;
            if (!checkCollision(m.x, ny)) m.y = ny;
            m.dir = Math.abs(rdx) > Math.abs(rdy) ? (rdx > 0 ? 3 : 2) : (rdy > 0 ? 0 : 1);
          }
        } else if (m.type === 'boss_golem') {
          const heroInSanctum = hero.x >= 18 * 16 && hero.y < 16 * 16;
          if (!heroInSanctum) return;
          m.jumpTimer = (m.jumpTimer || 0) + dt;
          const bgdx = hero.x - m.x, bgdy = hero.y - m.y;
          const bgdist = Math.hypot(bgdx, bgdy) || 1;
          if (m.jumpTimer >= 3.7) {
            m.jumpTimer = 0;
            telegraphMonsterAttack(m, 0.6, () => {
              playSfxHit();
              spawnFloatingText("GROUND SHAKE!", m.x - 12, m.y - 12, vceColor(7, 3, 1));
              // This used to be particles only: the first boss's signature move
              // dealt no damage, which taught players to ignore boss tells.
              for (let i = 0; i < 12; i++) {
                const ang = (i / 12) * Math.PI * 2;
                particles.push({ x: m.x + 8 + Math.cos(ang) * 44, y: m.y + 10 + Math.sin(ang) * 40, vx: Math.cos(ang) * 26, vy: Math.sin(ang) * 26, life: 0.5, maxLife: 0.5, size: 3, color: vceColor(5, 4, 3) });
              }
              const quakeDist = Math.hypot((hero.x + 8) - (m.x + 8), (hero.y + 10) - (m.y + 10));
              if (quakeDist <= 62 && hero.invulnTimer <= 0 && hero.hp > 0) {
                const quakeDmg = calcMonsterDamage(Math.round(m.atk * 0.85));
                hero.hp = Math.max(0, hero.hp - quakeDmg);
                hero.invulnTimer = 0.75;
                playSfxHurt();
                spawnFloatingText(`-${quakeDmg}`, hero.x + 4, hero.y - 8, vceColor(7, 2, 2));
                if (hero.hp <= 0) triggerHeroDefeat();
              }
            }, 62);
          } else {
            const nx = m.x + (bgdx / bgdist) * m.speed * dt;
            const ny = m.y + (bgdy / bgdist) * m.speed * dt;
            if (!checkCollision(nx, m.y)) m.x = nx;
            if (!checkCollision(m.x, ny)) m.y = ny;
          }
        } else if (m.type === 'crypt_wisp') {
          m.boltTimer = (m.boltTimer || 0) - dt;
          const wdx = hero.x - m.x, wdy = hero.y - m.y;
          const wdist = Math.hypot(wdx, wdy) || 1;
          const canSeeHero = typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y);
          if (wdist < 180 && canSeeHero) {
            const nx = m.x + (wdx / wdist) * m.speed * dt;
            const ny = m.y + (wdy / wdist) * m.speed * dt;
            if (!checkCollision(nx, m.y)) m.x = nx;
            if (!checkCollision(m.x, ny)) m.y = ny;
            if (m.boltTimer <= 0) {
              m.boltTimer = 2.8;
              enemyProjectiles.push({ x: m.x + 8, y: m.y + 8, vx: (wdx / wdist) * 95, vy: (wdy / wdist) * 95, dist: 0, maxDist: 120, damage: 24, color: vceColor(5, 1, 6) });
            }
          }
        } else if (m.type === 'crypt_spider') {
          const spdx = hero.x - m.x, spdy = hero.y - m.y;
          const spdist = Math.hypot(spdx, spdy) || 1;
          if (spdist < 160 && (typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y))) {
            const nx = m.x + (spdx / spdist) * m.speed * dt;
            const ny = m.y + (spdy / spdist) * m.speed * dt;
            if (!checkCollision(nx, m.y)) m.x = nx;
            if (!checkCollision(m.x, ny)) m.y = ny;
          }
        } else if (m.type === 'skeleton_knight') {
          if ((m.staggerTimer || 0) <= 0) {
            const skdx = hero.x - m.x, skdy = hero.y - m.y;
            const skdist = Math.hypot(skdx, skdy) || 1;
            if (skdist < 150 && (typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y))) {
              const nx = m.x + (skdx / skdist) * m.speed * dt;
              const ny = m.y + (skdy / skdist) * m.speed * dt;
              if (!checkCollision(nx, m.y)) m.x = nx;
              if (!checkCollision(m.x, ny)) m.y = ny;
              m.dir = Math.abs(skdx) > Math.abs(skdy) ? (skdx > 0 ? 3 : 2) : (skdy > 0 ? 0 : 1);
            }
          }
        } else if (m.type === 'boss_lich') {
          const heroInSanctum = hero.x >= 18 * 16 && hero.y < 16 * 16;
          if (!heroInSanctum) return;
          m.teleportTimer = (m.teleportTimer || 0) - dt;
          m.castTimer = (m.castTimer || 0) - dt;
          if (m.teleportTimer <= 0 && m.windup <= 0) {
            m.teleportTimer = 5.2;
            telegraphMonsterAttack(m, 0.35, () => {
              m.x = (m.x < 26 * 16) ? 30 * 16 : 22 * 16;
              m.y = 6 * 16;
              playSfxBlip(1600);
              spawnFloatingText("TELEPORT!", m.x - 4, m.y - 8, vceColor(5, 1, 6));
            });
          } else if (m.castTimer <= 0) {
            m.castTimer = 2.6;
            telegraphMonsterAttack(m, 0.5, () => {
              const ldx = hero.x - m.x, ldy = hero.y - m.y;
              const ldist = Math.hypot(ldx, ldy) || 1;
              [-0.3, 0, 0.3].forEach(ang => {
                const cos = Math.cos(ang), sin = Math.sin(ang);
                const vx = ((ldx * cos - ldy * sin) / ldist) * 95;
                const vy = ((ldx * sin + ldy * cos) / ldist) * 95;
                enemyProjectiles.push({ x: m.x + 8, y: m.y + 8, vx, vy, dist: 0, maxDist: 140, damage: 28, color: vceColor(5, 1, 6) });
              });
            });
          }
        } else if (m.type === 'electric_jelly') {
          m.pulseTimer = (m.pulseTimer || 0) - dt;
          const jdx = hero.x - m.x, jdy = hero.y - m.y;
          const jdist = Math.hypot(jdx, jdy) || 1;
          if (jdist < 150 && (typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y))) {
            const nx = m.x + (jdx / jdist) * m.speed * dt;
            const ny = m.y + (jdy / jdist) * m.speed * dt;
            if (!checkCollision(nx, m.y)) m.x = nx;
            if (!checkCollision(m.x, ny)) m.y = ny;
          }
          if (m.pulseTimer <= 0) {
            m.pulseTimer = 2.8;
            if (jdist < 28 && hero.invulnTimer <= 0) {
              const incomingDmg = calcMonsterDamage(m.atk);
              hero.hp = Math.max(0, hero.hp - incomingDmg);
              hero.invulnTimer = 0.75;
              playSfxHurt();
              spawnFloatingText(`SHOCK! -${incomingDmg}`, hero.x, hero.y - 8, vceColor(3, 7, 7));
              if (hero.hp <= 0) triggerHeroDefeat();
            }
          }
        } else if (m.type === 'armored_triton') {
          const tdx = hero.x - m.x, tdy = hero.y - m.y;
          const tdist = Math.hypot(tdx, tdy) || 1;
          if (tdist < 140 && (typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y))) {
            const nx = m.x + (tdx / tdist) * m.speed * dt;
            const ny = m.y + (tdy / tdist) * m.speed * dt;
            if (!checkCollision(nx, m.y)) m.x = nx;
            if (!checkCollision(m.x, ny)) m.y = ny;
          }
        } else if (m.type === 'coral_crab') {
          m.bubbleTimer = (m.bubbleTimer || 0) - dt;
          const cdx = hero.x - m.x, cdy = hero.y - m.y;
          const cdist = Math.hypot(cdx, cdy) || 1;
          if (cdist < 120 && m.bubbleTimer <= 0 && (typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y))) {
            m.bubbleTimer = 3.0;
            enemyProjectiles.push({ x: m.x + 8, y: m.y + 8, vx: (cdx / cdist) * 80, vy: (cdy / cdist) * 80, dist: 0, maxDist: 100, damage: 22, color: vceColor(2, 7, 7) });
          }
        } else if (m.type === 'boss_leviathan') {
          const heroInSanctum = hero.x >= 18 * 16 && hero.y < 16 * 16;
          if (!heroInSanctum) return;
          m.waveTimer = (m.waveTimer || 0) - dt;
          const lvdx = hero.x - m.x, lvdy = hero.y - m.y;
          const lvdist = Math.hypot(lvdx, lvdy) || 1;
          if (m.waveTimer <= 0) {
            m.waveTimer = 3.8;
            telegraphMonsterAttack(m, 0.45, () => {
              const wdx = hero.x - m.x, wdy = hero.y - m.y;
              const wdist = Math.hypot(wdx, wdy) || 1;
              [-0.2, 0, 0.2].forEach(ang => {
                const cos = Math.cos(ang), sin = Math.sin(ang);
                const vx = ((wdx * cos - wdy * sin) / wdist) * 100;
                const vy = ((wdx * sin + wdy * cos) / wdist) * 100;
                enemyProjectiles.push({ x: m.x + 8, y: m.y + 8, vx, vy, dist: 0, maxDist: 150, damage: 32, color: vceColor(2, 7, 7) });
              });
            });
          }
        } else if (m.type === 'shadow_guard') {
          m.dashTimer = (m.dashTimer || 0) - dt;
          const sgdx = hero.x - m.x, sgdy = hero.y - m.y;
          const sgdist = Math.hypot(sgdx, sgdy) || 1;
          const canSeeHero = typeof hasWallBetween !== 'function' || !hasWallBetween(m.x, m.y, hero.x, hero.y);
          if (m.dashTimer <= 0 && sgdist < 180 && canSeeHero) {
            m.dashTimer = 3.3 + Math.random() * 1.5;
            telegraphMonsterAttack(m, 0.35, () => {
              const side = (Math.random() < 0.5) ? -1 : 1;
              const targetX = hero.x + side * 22;
              const targetY = hero.y;
              if (!checkCollision(targetX, targetY)) {
                m.x = targetX;
                m.y = targetY;
                playSfxClaw();
                enemyProjectiles.push({
                  x: m.x + 8,
                  y: m.y + 8,
                  vx: -side * 110,
                  vy: 0,
                  dist: 0,
                  maxDist: 60,
                  damage: 30,
                  color: vceColor(1, 0, 3)
                });
              }
            });
          } else if (sgdist < 160 && canSeeHero) {
            const nx = m.x + (sgdx / sgdist) * m.speed * dt;
            const ny = m.y + (sgdy / sgdist) * m.speed * dt;
            if (!checkCollision(nx, m.y)) m.x = nx;
            if (!checkCollision(m.x, ny)) m.y = ny;
          }
        } else if (m.type === 'boss_eclipse') {
          // Dynamic 3-Phase Climax State
          if (m.hp > 1200) {
            m.phase = 1;
          } else if (m.hp > 600) {
            if (m.phase === 1) {
              m.phase = 2;
              m.cloneTimer = 0.5;
              playSfxHit();
              spawnFloatingText("PHASE 2: SHADOW CLONES!", m.x - 24, m.y - 12, vceColor(7, 2, 2));
              spawnFloatingText("WATCH OUT, MASTER! HE'S SPLITTING!!", nyahCompanion.x - 36, nyahCompanion.y - 14, vceColor(7, 3, 4));
            }
          } else {
            if (m.phase < 3) {
              m.phase = 3;
              m.teleportTimer = 1.0;
              playSfxBlip(300);
              spawnFloatingText("PHASE 3: TWILIGHT BLACKOUT!", m.x - 28, m.y - 12, vceColor(7, 1, 1));
              spawnFloatingText("STAY CLOSE TO NYAH, MASTER!!", nyahCompanion.x - 32, nyahCompanion.y - 14, vceColor(7, 3, 4));
            }
          }

          const edx = hero.x - m.x, edy = hero.y - m.y;
          const edist = Math.hypot(edx, edy) || 1;

          if (m.phase === 1) {
            if (edist > 32) {
              const nx = m.x + (edx / edist) * m.speed * dt;
              const ny = m.y + (edy / edist) * m.speed * dt;
              if (!checkCollision(nx, m.y)) m.x = nx;
              if (!checkCollision(m.x, ny)) m.y = ny;
            }
            m.orbTimer = (m.orbTimer || 0) - dt;
            if (m.orbTimer <= 0) {
              m.orbTimer = 2.9;
              telegraphMonsterAttack(m, 0.45, () => {
                for (let i = 0; i < 6; i++) {
                  const angle = (i / 6) * Math.PI * 2;
                  enemyProjectiles.push({ x: m.x + 8, y: m.y + 8, vx: Math.cos(angle) * 90, vy: Math.sin(angle) * 90, dist: 0, maxDist: 150, damage: 32, color: vceColor(1, 0, 3) });
                }
              });
            }
          } else if (m.phase === 2) {
            if (edist > 28) {
              const nx = m.x + (edx / edist) * (m.speed * 1.15) * dt;
              const ny = m.y + (edy / edist) * (m.speed * 1.15) * dt;
              if (!checkCollision(nx, m.y)) m.x = nx;
              if (!checkCollision(m.x, ny)) m.y = ny;
            }
            m.cloneTimer = (m.cloneTimer || 0) - dt;
            if (m.cloneTimer <= 0) {
              m.cloneTimer = 7.5;
              telegraphMonsterAttack(m, 0.55, () => {
                const liveClones = monsters.filter(o => o.type === 'shadow_guard' && o.alive).length;
                if (liveClones < 2) {
                  monsters.push({
                    id: 'clone_' + Date.now(),
                    type: 'shadow_guard',
                    x: m.x + (Math.random() < 0.5 ? -24 : 24),
                    y: m.y + 12,
                    hp: 120, maxHp: 120, atk: 70, def: 40, exp: 150, speed: 45, dashTimer: 1.5, hitTimer: 0, flashTimer: 0.1, alive: true
                  });
                  spawnMonsterSparkleBurst(m.x, m.y);
                  spawnFloatingText("MIRROR CLONE!", m.x - 12, m.y - 12, vceColor(6, 2, 6));
                }
              });
            } else {
              // Phase 2 used to only *read* orbTimer, so the 8-orb ring could
              // never fire: phase 1 left the timer at 2.9 and it never ticked.
              m.orbTimer = (m.orbTimer || 0) - dt;
              if (m.orbTimer <= 0) {
                m.orbTimer = 2.3;
                telegraphMonsterAttack(m, 0.4, () => {
                  for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    enemyProjectiles.push({ x: m.x + 8, y: m.y + 8, vx: Math.cos(angle) * 105, vy: Math.sin(angle) * 105, dist: 0, maxDist: 160, damage: 36, color: vceColor(2, 0, 4) });
                  }
                });
              }
            }
          } else if (m.phase === 3) {
            m.teleportTimer = (m.teleportTimer || 0) - dt;
            if (m.teleportTimer <= 0) {
              m.teleportTimer = 3.5;
              telegraphMonsterAttack(m, 0.35, () => {
                const behindX = hero.x + (hero.dir === 3 ? -24 : (hero.dir === 2 ? 24 : 0));
                const behindY = hero.y + (hero.dir === 0 ? -24 : (hero.dir === 1 ? 24 : 0));
                if (!checkCollision(behindX, behindY)) {
                  m.x = behindX;
                  m.y = behindY;
                  playSfxClaw();
                  spawnFloatingText("PHANTOM STRIKE!", m.x - 20, m.y - 12, vceColor(7, 1, 1));
                  const pdx = hero.x - m.x, pdy = hero.y - m.y;
                  const pdist = Math.hypot(pdx, pdy) || 1;
                  [-0.3, 0, 0.3].forEach(ang => {
                    const cos = Math.cos(ang), sin = Math.sin(ang);
                    const vx = ((pdx * cos - pdy * sin) / pdist) * 125;
                    const vy = ((pdx * sin + pdy * cos) / pdist) * 125;
                    enemyProjectiles.push({ x: m.x + 8, y: m.y + 8, vx, vy, dist: 0, maxDist: 140, damage: 42, color: vceColor(7, 1, 2) });
                  });
                }
              });
            } else if (edist > 24) {
              const nx = m.x + (edx / edist) * (m.speed * 1.3) * dt;
              const ny = m.y + (edy / edist) * (m.speed * 1.3) * dt;
              if (!checkCollision(nx, m.y)) m.x = nx;
              if (!checkCollision(m.x, ny)) m.y = ny;
            }

            m.orbTimer = (m.orbTimer || 0) - dt;
            if (m.orbTimer <= 0 && m.windup <= 0) {
              m.orbTimer = 2.0;
              telegraphMonsterAttack(m, 0.4, () => {
                for (let i = 0; i < 10; i++) {
                  const angle = (i / 10) * Math.PI * 2;
                  enemyProjectiles.push({ x: m.x + 8, y: m.y + 8, vx: Math.cos(angle) * 120, vy: Math.sin(angle) * 120, dist: 0, maxDist: 170, damage: 40, color: vceColor(7, 1, 3) });
                }
              });
            }
          }
        }

        // Contact Damage
        if (hero.invulnTimer <= 0 && hero.hp > 0) {
          if (Math.abs(hero.x - m.x) < 11 && Math.abs(hero.y - m.y) < 11) {
            const incomingDmg = calcMonsterDamage(m.atk);
            hero.hp = Math.max(0, hero.hp - incomingDmg);
            hero.invulnTimer = 0.75;
            playSfxHurt();
            spawnFloatingText(`-${incomingDmg}`, hero.x + 4, hero.y - 8, vceColor(7, 2, 2));

            if (m.type === 'crypt_spider') {
              hero.slowTimer = 3.0;
              spawnFloatingText("SLOWED!", hero.x, hero.y - 12, vceColor(7, 3, 1));
            }

            let kx = (hero.x + 8) - (m.x + 8);
            let ky = (hero.y + 8) - (m.y + 8);
            if (kx === 0 && ky === 0) {
              if (hero.dir === 0) ky = -1;
              else if (hero.dir === 1) ky = 1;
              else if (hero.dir === 2) kx = 1;
              else kx = -1;
            }
            const kmag = Math.hypot(kx, ky) || 1;
            const targetHx = hero.x + (kx / kmag) * 6;
            const targetHy = hero.y + (ky / kmag) * 6;
            if (!checkCollision(targetHx, hero.y)) hero.x = targetHx;
            if (!checkCollision(hero.x, targetHy)) hero.y = targetHy;

            if (hero.hp <= 0) {
              triggerHeroDefeat();
            }
          }
        }
      });

      drops.forEach(d => {
        if (d.collected) return;
        if (Math.hypot(hero.x - d.x, hero.y - d.y) < 14) {
          d.collected = true;
          if (d.type === 'coin') {
            flags.gold = (flags.gold || 0) + 15;
            playSfxCoin();
            spawnFloatingText('+15G', d.x + 2, d.y - 6, vceColor(7, 6, 1));
          } else if (d.type === 'herb') {
            hero.hp = Math.min(hero.maxHp, hero.hp + 25);
            playSfxHeal();
            spawnFloatingText('+25 HP', d.x + 2, d.y - 6, vceColor(2, 7, 2));
          }
        }
      });
    }

    // Floating Texts Update
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
      }
    }

    // Sync HUD Health & Gold
    const lblHp = document.getElementById('lblHeroHp');
    if (lblHp) lblHp.textContent = `${hero.hp}/${hero.maxHp}`;
    const lblG = document.getElementById('lblGold');
    if (lblG) lblG.textContent = String(flags.gold || 0);

    // Particles & Spawners
    if (activeMapId === 'aldenor_exterior') {
      spawnChimneySmoke(24 * TILE_SZ, 3 * TILE_SZ);
      spawnChimneySmoke(6 * TILE_SZ, 7 * TILE_SZ);
      spawnFountainSparkle(248, 204);
      spawnTwilightMote();
      if (Math.random() < 0.12) spawnFlowerPetal();
    } else if (activeMapId === 'aldenor_coastal_plains') {
      if (Math.random() < 0.08) spawnFlowerPetal();
    }
    updateParticles(dt);

    // Camera Smooth Lerp & Centering for small rooms
    if (mapPxW <= 256) {
      camera.x = Math.floor((mapPxW - 256) / 2);
    } else {
      const targetCamX = hero.x + 8 - 128;
      camera.x += (targetCamX - camera.x) * 0.12;
      camera.x = Math.max(0, Math.min(mapPxW - 256, camera.x));
    }

    if (mapPxH <= 224) {
      camera.y = Math.floor((mapPxH - 224) / 2);
    } else {
      const targetCamY = hero.y + 8 - 112;
      camera.y += (targetCamY - camera.y) * 0.12;
      camera.y = Math.max(0, Math.min(mapPxH - 224, camera.y));
    }

    // Spatial Fountain / Hearth Volume
    updateSpatialFountain(hero.x, hero.y);
  }

  // HUD VU Meter Display Update
  function updateVuMeterHud() {
    const barsContainer = document.getElementById('vuBars');
    if (!barsContainer) return;
    for (let ch = 0; ch < 7; ch++) {
      const bar = document.getElementById(`vuBar${ch}`);
      if (!bar) continue;
      const val = Math.min(1, Math.max(0, vuMeters[ch]));
      vuMeters[ch] *= 0.88;

      bar.innerHTML = '';
      const totalSegs = 6;
      const litSegs = Math.round(val * totalSegs);
      for (let s = 0; s < totalSegs; s++) {
        const seg = document.createElement('div');
        seg.className = 'vu-segment';
        if (s < litSegs) {
          if (s >= 5) seg.className += ' lit-red';
          else if (s >= 3) seg.className += ' lit-yellow';
          else seg.className += ' lit-green';
        }
        bar.appendChild(seg);
      }
    }
  }

  // =========================================================================
  // SECTION 11: Main Loop & Bootstrap
  // =========================================================================
  const gameCanvas = document.getElementById('gameCanvas');
  const gameCtx = gameCanvas.getContext('2d');
  gameCtx.imageSmoothingEnabled = false;

  let lastTime = performance.now();

  function gameLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (titleScreenState.active) {
      updateTitleScreen(dt);
      renderTitleScreen(gameCtx);
    } else if (introCinemaState.active) {
      updateIntroCinema(dt);
      renderIntroCinema(gameCtx);
    } else if (epilogueCinemaState.active) {
      updateEpilogueCinema(dt);
      renderEpilogueCinema(gameCtx);
    } else {
      update(dt);
      renderFrame(gameCtx);
    }
    updateVuMeterHud();

    requestAnimationFrame(gameLoop);
  }

  window.YsEngine = {
    flags,
    hero,
    nyahCompanion,
    npcs,
    monsters,
    drops,
    enemyProjectiles,
    floatingTexts,
    particles,
    dialogueState,
    transitionState,
    statusMenuState,
    titleScreenState,
    introCinemaState,
    epilogueCinemaState,
    bgmScores: { scoreTitle, scoreOverture, scoreMidday, scoreTwilight, scoreMines, scoreCrypts, scoreShrine, scoreBoss, scoreVictory },
    getActiveMapId: () => activeMapId,
    setActiveMapId: (id) => { activeMapId = id; window.collisionMap = getActiveMap().collisionMap; },
    getAudioCtx: () => audioCtx,
    isMuted: () => isMuted,
    toggleDayTwilight,
    toggleCrt,
    toggleMute,
    toggleStatusMenu,
    cycleNyahCosmetic,
    startIntroCinema: () => {
      introCinemaState.active = true;
      introCinemaState.currentCard = 0;
      introCinemaState.charIndex = 0;
      introCinemaState.scrollOffset = 0;
      introCinemaState.isComplete = false;
    },
    startEpilogueCinema,
    returnToTitleScreen,
    saveGame,
    loadGame,
    addItem,
    removeItem,
    hasItem,
    getItemCount,
    addExp,
    startDialogue,
    advanceDialogue,
    closeDialogue,
    startSwordSlash,
    tryInteract,
    getSwordHitbox,
    triggerHeroDefeat,
    spawnMonsterSparkleBurst,
    initMonsters,
    update,
    renderFrame,
    updateNpcSchedules,
    resetDialogueCooldown: () => { dialogueCloseCooldown = 0; dialogueState.cooldownTimer = 0; },
    calcHeroDamage,
    calcMonsterDamage,
    unlockAudio,
    resizeViewport
  };
  window.flags = flags;
  window.hero = hero;
  window.nyahCompanion = nyahCompanion;   window.dialogueState = dialogueState;
   window.dialogueLog = dialogueLog;
   window.dialogueLogState = dialogueLogState;
   window.toggleDialogueLog = toggleDialogueLog;
  window.statusMenuState = statusMenuState;
  window.titleScreenState = titleScreenState;
  window.introCinemaState = introCinemaState;
  window.epilogueCinemaState = epilogueCinemaState;
  window.returnToTitleScreen = returnToTitleScreen;
  window.npcs = npcs;
  window.monsters = monsters;
  window.drops = drops;
  window.transitionState = transitionState;
  window.updateNpcSchedules = updateNpcSchedules;
  window.unlockAudio = unlockAudio;

  buildTileAtlases();
  buildAllMaps();
  updateNpcSchedules();
  updateItemBadge();
  window.collisionMap = getActiveMap().collisionMap;
  resizeViewport();

  if (!localStorage.getItem('aldenor_intro_watched')) {
    introCinemaState.active = true;
  }

  requestAnimationFrame(gameLoop);

