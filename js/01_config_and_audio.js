// 01_config_and_audio.js (Modularized from index.html)
  // Section 1.1: Responsive Viewport Scaler
  function resizeViewport() {
    const wrapper = document.getElementById('screenWrapper');
    const viewport = document.getElementById('viewport');
    if (!wrapper || !viewport) return;
    const availW = wrapper.clientWidth - 8;
    const availH = wrapper.clientHeight - 8;
    const exactScale = Math.min(availW / 256, availH / 224);
    const intScale = Math.floor(exactScale);
    const scale = (intScale >= 1 && (intScale / exactScale) >= 0.72) ? intScale : Math.max(0.5, exactScale);
    viewport.style.width = `${Math.floor(256 * scale)}px`;
    viewport.style.height = `${Math.floor(224 * scale)}px`;
  }
  window.addEventListener('resize', resizeViewport);
  window.addEventListener('orientationchange', resizeViewport);
  window.addEventListener('DOMContentLoaded', resizeViewport);
  // The cabinet header wraps on narrow screens and the touch pad appears via
  // media query, so the wrapper can change size without a window resize event.
  if (typeof ResizeObserver !== 'undefined') {
    const wrapperEl = document.getElementById('screenWrapper');
    if (wrapperEl) new ResizeObserver(() => resizeViewport()).observe(wrapperEl);
  }

  // =========================================================================
  // SECTION 1: HuC6260 Video Color Encoder (VCE) 9-Bit Palette System
  // =========================================================================
  const VCE_STEPS = [0, 36, 73, 109, 146, 182, 219, 255];

  function vceColor(r3, g3, b3) {
    return `rgb(${VCE_STEPS[r3 & 7]}, ${VCE_STEPS[g3 & 7]}, ${VCE_STEPS[b3 & 7]})`;
  }

  function vceRgb(r3, g3, b3) {
    return [VCE_STEPS[r3 & 7], VCE_STEPS[g3 & 7], VCE_STEPS[b3 & 7]];
  }

  function vceRgba(r3, g3, b3, a = 255) {
    const alphaFloat = (a <= 1) ? a : (a / 255);
    const alphaByte = (a <= 1) ? Math.round(a * 255) : a;
    const arr = [VCE_STEPS[r3 & 7], VCE_STEPS[g3 & 7], VCE_STEPS[b3 & 7], alphaByte];
    arr.toString = function() {
      return `rgba(${arr[0]}, ${arr[1]}, ${arr[2]}, ${alphaFloat})`;
    };
    return arr;
  }

  function vceColorRgba(r3, g3, b3, a = 1.0) {
    return `rgba(${VCE_STEPS[r3 & 7]}, ${VCE_STEPS[g3 & 7]}, ${VCE_STEPS[b3 & 7]}, ${a})`;
  }

  const OUTLINE_COLOR = vceColor(1, 1, 2); // Authentic 9-bit slate outline #242449
  const OUTLINE_RGBA = vceRgba(1, 1, 2);

  // =========================================================================
  // SECTION 2: HuC6280 6-Channel Web Audio Synthesizer & Discrete Fourier Transform
  // =========================================================================
  let audioCtx = null;
  let isAudioUnlocked = false;
  let isMuted = false;

  function initAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
    buildWavetables();
    buildSequencer();
    initSpatialFountain();
  }

  function unlockAudio() {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isAudioUnlocked = true;
  }

  ['keydown', 'pointerdown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { once: false });
  });

  // DFT Wavetable Conversion
  function createHuC6280Wave(ctx, samples32) {
    const N = 32;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    const norm = samples32.map(v => (v - 15.5) / 15.5);
    for (let k = 1; k < N / 2; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        re += norm[n] * Math.cos(angle);
        im -= norm[n] * Math.sin(angle);
      }
      real[k] = (2 * re) / N;
      imag[k] = (2 * im) / N;
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  const SAMPLES_LEAD = [0, 2, 4, 7, 11, 16, 22, 28, 31, 31, 30, 27, 23, 18, 14, 10, 8, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const SAMPLES_HOLLOW = [16, 21, 26, 29, 31, 30, 27, 22, 16, 9, 4, 1, 0, 1, 4, 9, 16, 22, 27, 30, 31, 29, 25, 19, 13, 8, 4, 1, 0, 2, 6, 11];
  const SAMPLES_BASS = [31, 31, 30, 28, 25, 21, 16, 10, 5, 1, 0, 0, 2, 6, 12, 18, 23, 26, 27, 26, 24, 20, 15, 10, 6, 3, 1, 0, 0, 3, 10, 20];
  const SAMPLES_ARP = [0, 0, 0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31, 31, 31, 27, 23, 19, 15, 11, 7, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  let waveLead, waveHollow, waveBass, waveArp;
  let masterGain;
  const vuMeters = [0, 0, 0, 0, 0, 0, 0];

  function buildWavetables() {
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    waveLead = createHuC6280Wave(audioCtx, SAMPLES_LEAD);
    waveHollow = createHuC6280Wave(audioCtx, SAMPLES_HOLLOW);
    waveBass = createHuC6280Wave(audioCtx, SAMPLES_BASS);
    waveArp = createHuC6280Wave(audioCtx, SAMPLES_ARP);
  }

  let noiseBuffer = null;
  function getNoiseBuffer() {
    if (!noiseBuffer && audioCtx) {
      const bufferSize = audioCtx.sampleRate * 2;
      noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.16;
      }
    }
    return noiseBuffer;
  }

  let fountainSource = null;
  let fountainGain = null;
  function initSpatialFountain() {
    if (!audioCtx) return;
    const buf = getNoiseBuffer();
    fountainSource = audioCtx.createBufferSource();
    fountainSource.buffer = buf;
    fountainSource.loop = true;

    const bq = audioCtx.createBiquadFilter();
    bq.type = 'bandpass';
    bq.frequency.setValueAtTime(850, audioCtx.currentTime);
    bq.Q.setValueAtTime(2.2, audioCtx.currentTime);

    fountainGain = audioCtx.createGain();
    fountainGain.gain.setValueAtTime(0, audioCtx.currentTime);

    fountainSource.connect(bq);
    bq.connect(fountainGain);
    fountainGain.connect(masterGain);
    fountainSource.start();
  }

  function updateSpatialFountain(heroX, heroY) {
    if (!fountainGain || !audioCtx) return;
    const curMap = (typeof getActiveMap === 'function') ? getActiveMap() : null;
    if (!curMap || curMap.id === 'aldenor_exterior') {
      const FOUNTAIN_PX_X = 248, FOUNTAIN_PX_Y = 208;
      const dist = Math.hypot(heroX - FOUNTAIN_PX_X, heroY - FOUNTAIN_PX_Y);
      const maxDist = 200;
      const targetVol = isMuted ? 0 : Math.max(0, 1 - dist / maxDist) * 0.22;
      fountainGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.08);
      vuMeters[6] = Math.max(vuMeters[6] * 0.88, targetVol / 0.22);
    } else if (curMap.id === 'aldenor_coastal_plains') {
      const now = audioCtx.currentTime;
      const swell = (Math.sin(now * 1.5) * 0.5 + 0.5);
      const targetVol = isMuted ? 0 : 0.08 + swell * 0.16;
      fountainGain.gain.setTargetAtTime(targetVol, now, 0.08);
      vuMeters[6] = Math.max(vuMeters[6] * 0.88, targetVol / 0.24);
    } else if (curMap.hearthPos) {
      const dist = Math.hypot(heroX - curMap.hearthPos.x, heroY - curMap.hearthPos.y);
      const maxDist = 180;
      const targetVol = isMuted ? 0 : Math.max(0, 1 - dist / maxDist) * 0.26;
      fountainGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.08);
      vuMeters[6] = Math.max(vuMeters[6] * 0.88, targetVol / 0.26);
    } else {
      fountainGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.08);
      vuMeters[6] *= 0.88;
    }
  }

  function playTransitionChime(isEntering = true) {
    if (!audioCtx || isMuted) return;
    const notes = isEntering
      ? [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6]
      : [NOTE.C6, NOTE.G5, NOTE.E5, NOTE.C5];
    const now = audioCtx.currentTime;
    notes.forEach((freq, idx) => {
      scheduleNote(waveArp, freq, now + idx * 0.045, 0.04, 0.12, 3);
    });
  }

  function playSfxSquawk() {
    if (!audioCtx || isMuted) return;
    const now = audioCtx.currentTime;
    scheduleNote(waveLead, 1850, now, 0.05, 0.18, 0);
    scheduleNote(waveLead, 2400, now + 0.04, 0.08, 0.22, 0);
    scheduleNote(waveLead, 1600, now + 0.10, 0.06, 0.14, 0);
  }

  function playSfxBlip(freq, duration = 0.038) {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    osc.setPeriodicWave(waveLead || waveArp);
    osc.frequency.setValueAtTime(freq + (Math.random() * 40 - 20), audioCtx.currentTime);

    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    vuMeters[5] = 1.0;
  }

  function playUiConfirm() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(waveArp);
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.14, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.12);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.12);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    vuMeters[5] = 1.0;
  }

  function playSfxDoorLocked() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    [130, 100, 85].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(waveHollow || waveBass);
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.18, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.035);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.035);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    vuMeters[5] = 0.9;
  }

  function playSfxBroom() {
    if (!audioCtx || isMuted) return;
    const buf = getNoiseBuffer();
    if (!buf) return;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const bq = audioCtx.createBiquadFilter();
    bq.type = 'bandpass';
    bq.frequency.setValueAtTime(1400, audioCtx.currentTime);
    bq.Q.setValueAtTime(1.8, audioCtx.currentTime);
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.018, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(bq);
    bq.connect(gain);
    gain.connect(masterGain);
    src.start(t);
    src.stop(t + 0.06);
    src.onended = () => { src.disconnect(); bq.disconnect(); gain.disconnect(); };
    vuMeters[5] = Math.max(vuMeters[5], 0.2);
  }

  function playSfxLute() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    [293.66, 349.23, 440.00].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(waveArp);
      osc.frequency.setValueAtTime(freq, t + idx * 0.055);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.12, t + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.28);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.28);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    vuMeters[3] = 0.8;
  }

  function playSfxSword() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.setPeriodicWave(waveLead);
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.12);
    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.14, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
    osc.onended = () => { osc.disconnect(); oscGain.disconnect(); };

    const buf = getNoiseBuffer();
    if (buf) {
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const bq = audioCtx.createBiquadFilter();
      bq.type = 'highpass';
      bq.frequency.setValueAtTime(2000, t);
      const nGain = audioCtx.createGain();
      nGain.gain.setValueAtTime(0.08, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
      src.connect(bq);
      bq.connect(nGain);
      nGain.connect(masterGain);
      src.start(t);
      src.stop(t + 0.10);
      src.onended = () => { src.disconnect(); bq.disconnect(); nGain.disconnect(); };
    }
    vuMeters[0] = 1.0;
    vuMeters[5] = 0.8;
  }

  function playSfxHit() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.setPeriodicWave(waveBass);
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    vuMeters[2] = 1.0;
  }

  function playSfxHurt() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.setPeriodicWave(waveBass);
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.14);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.14);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    vuMeters[2] = 1.0;
  }

  function playSfxCoin() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(waveArp);
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.14, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.16);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.16);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    vuMeters[3] = 0.9;
  }

  function playSfxHeal() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(waveArp);
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.14, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.22);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.22);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    vuMeters[3] = 1.0;
  }

  function playSfxDefeat() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    [440.00, 349.23, 293.66, 220.00].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(waveLead);
      osc.frequency.setValueAtTime(freq, t + idx * 0.14);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.18, t + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.14 + 0.24);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.14);
      osc.stop(t + idx * 0.14 + 0.24);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    vuMeters[0] = 1.0;
  }

  function playSfxLevelUp() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(waveArp || waveLead);
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.18, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.28);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.28);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    vuMeters[0] = 1.0;
    vuMeters[3] = 1.0;
  }

  function playSfxClaw() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.setPeriodicWave(waveLead);
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.07);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    vuMeters[1] = 0.9;
  }

  function playSfxSwordBeam() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.setPeriodicWave(waveArp);
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.12);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    vuMeters[3] = 0.9;
  }

  function playSfxSpin() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    [300, 480, 720, 960, 600].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(waveLead);
      osc.frequency.setValueAtTime(freq, t + idx * 0.03);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.14, t + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.03 + 0.08);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.03);
      osc.stop(t + idx * 0.03 + 0.08);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    vuMeters[0] = 1.0;
  }

  function playSfxBellTolling() {
    if (!audioCtx || isMuted) return;
    const t = audioCtx.currentTime;
    [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(waveHollow || waveArp);
      osc.frequency.setValueAtTime(freq, t + idx * 0.02);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.20, t + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.02 + 1.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.02);
      osc.stop(t + idx * 0.02 + 1.2);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    vuMeters[1] = 1.0;
    vuMeters[2] = 1.0;
  }

  // Authentic Falcom-Style Town BGMs (Ys / Popful Mail) - 98 BPM
  const NOTE = {
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Gs3: 207.65, 'G#3': 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
    C4: 261.63, Cs4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Gs4: 415.30, 'G#4': 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
    C5: 523.25, Cs5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Gs5: 830.61, 'G#5': 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
    C6: 1046.50, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98
  };

  const createEmptyScore = () => ({
    ch1: new Array(256).fill(0),
    ch2: new Array(256).fill(0),
    ch3: new Array(256).fill(0),
    ch4: new Array(256).fill(0),
    ch5: new Array(256).fill(0)
  });

  const scoreMidday = createEmptyScore();
  const scoreTwilight = createEmptyScore();
  const scoreOverture = createEmptyScore();
  const scoreTitle = createEmptyScore();
  const scoreMines = createEmptyScore();
  const scoreCrypts = createEmptyScore();
  const scoreShrine = createEmptyScore();
  const scoreBoss = createEmptyScore();
  const scoreVictory = createEmptyScore();

  function buildBgmScores() {
    // --- Midday Track (98 BPM, C Major Falcom Ys town melody) ---
    const mMelody = [
      NOTE.E5, 0, 0, 0, NOTE.G5, 0, NOTE.A5, 0, NOTE.G5, 0, 0, 0, NOTE.E5, 0, 0, 0,
      NOTE.F5, 0, 0, 0, NOTE.A5, 0, NOTE.C6, 0, NOTE.B5, 0, NOTE.A5, 0, NOTE.G5, 0, 0, 0,
      NOTE.E5, 0, 0, 0, NOTE.G5, 0, NOTE.E5, 0, NOTE.D5, 0, 0, 0, NOTE.C5, 0, 0, 0,
      NOTE.D5, 0, 0, 0, NOTE.E5, 0, NOTE.F5, 0, NOTE.D5, 0, 0, 0, NOTE.B4, 0, 0, 0,
      NOTE.C5, 0, 0, 0, NOTE.E5, 0, NOTE.G5, 0, NOTE.C6, 0, 0, 0, NOTE.D6, 0, 0, 0,
      NOTE.E6, 0, 0, 0, NOTE.D6, 0, NOTE.C6, 0, NOTE.A5, 0, 0, 0, NOTE.C6, 0, 0, 0,
      NOTE.G5, 0, 0, 0, NOTE.A5, 0, NOTE.G5, 0, NOTE.E5, 0, 0, 0, NOTE.D5, 0, 0, 0,
      NOTE.C5, 0, 0, 0, 0, 0, 0, 0, NOTE.C5, 0, 0, 0, 0, 0, 0, 0
    ];

    const mHarm = [
      NOTE.C5, 0, 0, 0, NOTE.E5, 0, NOTE.F5, 0, NOTE.E5, 0, 0, 0, NOTE.C5, 0, 0, 0,
      NOTE.C5, 0, 0, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.G5, 0, NOTE.F5, 0, NOTE.E5, 0, 0, 0,
      NOTE.C5, 0, 0, 0, NOTE.E5, 0, NOTE.C5, 0, NOTE.B4, 0, 0, 0, NOTE.A4, 0, 0, 0,
      NOTE.B4, 0, 0, 0, NOTE.C5, 0, NOTE.D5, 0, NOTE.B4, 0, 0, 0, NOTE.G4, 0, 0, 0,
      NOTE.G4, 0, 0, 0, NOTE.C5, 0, NOTE.E5, 0, NOTE.G5, 0, 0, 0, NOTE.B5, 0, 0, 0,
      NOTE.C6, 0, 0, 0, NOTE.B5, 0, NOTE.A5, 0, NOTE.F5, 0, 0, 0, NOTE.A5, 0, 0, 0,
      NOTE.E5, 0, 0, 0, NOTE.F5, 0, NOTE.E5, 0, NOTE.C5, 0, 0, 0, NOTE.B4, 0, 0, 0,
      NOTE.G4, 0, 0, 0, 0, 0, 0, 0, NOTE.E4, 0, 0, 0, 0, 0, 0, 0
    ];

    const mBass = [
      NOTE.C3, 0, 0, 0, NOTE.G3, 0, 0, 0, NOTE.E3, 0, 0, 0, NOTE.G3, 0, 0, 0,
      NOTE.F3, 0, 0, 0, NOTE.C3, 0, 0, 0, NOTE.A3, 0, 0, 0, NOTE.C4, 0, 0, 0,
      NOTE.A3, 0, 0, 0, NOTE.E3, 0, 0, 0, NOTE.C3, 0, 0, 0, NOTE.E3, 0, 0, 0,
      NOTE.G3, 0, 0, 0, NOTE.D3, 0, 0, 0, NOTE.B3, 0, 0, 0, NOTE.D4, 0, 0, 0,
      NOTE.C3, 0, 0, 0, NOTE.G3, 0, 0, 0, NOTE.E3, 0, 0, 0, NOTE.G3, 0, 0, 0,
      NOTE.F3, 0, 0, 0, NOTE.A3, 0, 0, 0, NOTE.C4, 0, 0, 0, NOTE.A3, 0, 0, 0,
      NOTE.G3, 0, 0, 0, NOTE.D3, 0, 0, 0, NOTE.E3, 0, 0, 0, NOTE.G3, 0, 0, 0,
      NOTE.C3, 0, 0, 0, NOTE.G3, 0, 0, 0, NOTE.C3, 0, 0, 0, 0, 0, 0, 0
    ];

    const mArp = [
      0, 0, NOTE.E4, 0, NOTE.G4, 0, NOTE.C5, 0, 0, 0, NOTE.G4, 0, NOTE.E4, 0, 0, 0,
      0, 0, NOTE.F4, 0, NOTE.A4, 0, NOTE.C5, 0, 0, 0, NOTE.A4, 0, NOTE.F4, 0, 0, 0,
      0, 0, NOTE.E4, 0, NOTE.A4, 0, NOTE.C5, 0, 0, 0, NOTE.A4, 0, NOTE.E4, 0, 0, 0,
      0, 0, NOTE.D4, 0, NOTE.G4, 0, NOTE.B4, 0, 0, 0, NOTE.G4, 0, NOTE.D4, 0, 0, 0,
      0, 0, NOTE.E4, 0, NOTE.G4, 0, NOTE.C5, 0, 0, 0, NOTE.G4, 0, NOTE.E4, 0, 0, 0,
      0, 0, NOTE.F4, 0, NOTE.A4, 0, NOTE.C5, 0, 0, 0, NOTE.C5, 0, NOTE.A4, 0, 0, 0,
      0, 0, NOTE.E4, 0, NOTE.G4, 0, NOTE.B4, 0, 0, 0, NOTE.G4, 0, NOTE.D4, 0, 0, 0,
      0, 0, NOTE.E4, 0, NOTE.G4, 0, NOTE.C5, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

    for (let i = 0; i < 256; i++) {
      scoreMidday.ch1[i] = mMelody[i % 128];
      scoreMidday.ch2[i] = mHarm[i % 128];
      scoreMidday.ch3[i] = mBass[i % 128];
      scoreMidday.ch4[i] = mArp[i % 128];
      const s = i % 16;
      if (s === 0) scoreMidday.ch5[i] = 1;
      else if (s === 8) scoreMidday.ch5[i] = 2;
      else if (s === 4 || s === 12) scoreMidday.ch5[i] = 3;
    }

    // --- Twilight Track (98 BPM, A minor / Fmaj7 Nocturnal Nostalgia) ---
    const tMelody = [
      NOTE.E5, 0, 0, 0, NOTE.C5, 0, 0, 0, NOTE.B4, 0, NOTE.C5, 0, NOTE.A4, 0, 0, 0,
      NOTE.A4, 0, 0, 0, NOTE.C5, 0, NOTE.E5, 0, NOTE.G5, 0, NOTE.F5, 0, NOTE.E5, 0, 0, 0,
      NOTE.D5, 0, 0, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.G5, 0, 0, 0, NOTE.F5, 0, 0, 0,
      NOTE.E5, 0, 0, 0, NOTE.B4, 0, 0, 0, NOTE.Gs4, 0, 0, 0, NOTE.E4, 0, 0, 0,
      NOTE.A4, 0, 0, 0, NOTE.C5, 0, NOTE.E5, 0, NOTE.A5, 0, 0, 0, NOTE.B5, 0, 0, 0,
      NOTE.C6, 0, 0, 0, NOTE.B5, 0, NOTE.A5, 0, NOTE.E5, 0, 0, 0, NOTE.F5, 0, 0, 0,
      NOTE.D5, 0, 0, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.B5, 0, 0, 0, NOTE.G5, 0, 0, 0,
      NOTE.A5, 0, 0, 0, 0, 0, 0, 0, NOTE.A4, 0, 0, 0, 0, 0, 0, 0
    ];

    const tHarm = [
      NOTE.C5, 0, 0, 0, NOTE.A4, 0, 0, 0, NOTE.G4, 0, NOTE.A4, 0, NOTE.E4, 0, 0, 0,
      NOTE.F4, 0, 0, 0, NOTE.A4, 0, NOTE.C5, 0, NOTE.E5, 0, NOTE.D5, 0, NOTE.C5, 0, 0, 0,
      NOTE.A4, 0, 0, 0, NOTE.D5, 0, NOTE.F5, 0, NOTE.E5, 0, 0, 0, NOTE.D5, 0, 0, 0,
      NOTE.B4, 0, 0, 0, NOTE.Gs4, 0, 0, 0, NOTE.E4, 0, 0, 0, NOTE.B3, 0, 0, 0,
      NOTE.C5, 0, 0, 0, NOTE.E5, 0, NOTE.A5, 0, NOTE.E5, 0, 0, 0, NOTE.G5, 0, 0, 0,
      NOTE.A5, 0, 0, 0, NOTE.G5, 0, NOTE.F5, 0, NOTE.C5, 0, 0, 0, NOTE.D5, 0, 0, 0,
      NOTE.B4, 0, 0, 0, NOTE.D5, 0, NOTE.F5, 0, NOTE.G5, 0, 0, 0, NOTE.E5, 0, 0, 0,
      NOTE.E5, 0, 0, 0, 0, 0, 0, 0, NOTE.C4, 0, 0, 0, 0, 0, 0, 0
    ];

    const tBass = [
      NOTE.A2, 0, 0, 0, NOTE.E3, 0, 0, 0, NOTE.A2, 0, 0, 0, NOTE.E3, 0, 0, 0,
      NOTE.F2, 0, 0, 0, NOTE.C3, 0, 0, 0, NOTE.F2, 0, 0, 0, NOTE.C3, 0, 0, 0,
      NOTE.D2, 0, 0, 0, NOTE.A2, 0, 0, 0, NOTE.D2, 0, 0, 0, NOTE.A2, 0, 0, 0,
      NOTE.E2, 0, 0, 0, NOTE.B2, 0, 0, 0, NOTE.E2, 0, 0, 0, NOTE.B2, 0, 0, 0,
      NOTE.A2, 0, 0, 0, NOTE.E3, 0, 0, 0, NOTE.A2, 0, 0, 0, NOTE.E3, 0, 0, 0,
      NOTE.F2, 0, 0, 0, NOTE.C3, 0, 0, 0, NOTE.A2, 0, 0, 0, NOTE.C3, 0, 0, 0,
      NOTE.D2, 0, 0, 0, NOTE.A2, 0, 0, 0, NOTE.G2, 0, 0, 0, NOTE.D3, 0, 0, 0,
      NOTE.A2, 0, 0, 0, NOTE.E3, 0, 0, 0, NOTE.A2, 0, 0, 0, 0, 0, 0, 0
    ];

    const tArp = [
      NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.E4, NOTE.C4, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.C5, NOTE.A4, NOTE.E4, NOTE.C4, NOTE.A3, 0,
      NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.C4, NOTE.A3, NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.E4, NOTE.C4, NOTE.A3, NOTE.F3, 0,
      NOTE.D3, NOTE.F3, NOTE.A3, NOTE.C4, NOTE.A3, NOTE.F3, NOTE.D3, NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4, NOTE.C4, NOTE.A3, NOTE.F3, NOTE.D3, 0,
      NOTE.E3, NOTE.Gs3, NOTE.B3, NOTE.E4, NOTE.B3, NOTE.Gs3, NOTE.E3, NOTE.Gs3, NOTE.B3, NOTE.E4, NOTE.Gs4, NOTE.E4, NOTE.B3, NOTE.Gs3, NOTE.E3, 0,
      NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.E4, NOTE.C4, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.C5, NOTE.A4, NOTE.E4, NOTE.C4, NOTE.A3, 0,
      NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.C4, NOTE.A3, NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.E4, NOTE.C4, NOTE.A3, NOTE.F3, 0,
      NOTE.D3, NOTE.F3, NOTE.A3, NOTE.C4, NOTE.A3, NOTE.F3, NOTE.D3, NOTE.F3, NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4, NOTE.D4, NOTE.B3, NOTE.G3, 0,
      NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.E4, NOTE.C4, NOTE.A3, NOTE.C4, NOTE.E4, 0, 0, 0, 0, 0, 0, 0
    ];

    for (let i = 0; i < 256; i++) {
      scoreTwilight.ch1[i] = tMelody[i % 128];
      scoreTwilight.ch2[i] = tHarm[i % 128];
      scoreTwilight.ch3[i] = tBass[i % 128];
      scoreTwilight.ch4[i] = tArp[i % 128];
      const s = i % 16;
      if (s === 4 || s === 12) scoreTwilight.ch5[i] = 3;
    }

    // --- PCE-CD Overture Track (132 BPM, D minor / F Major Heroic Falcom Overture) ---
    const oMelody = [
      NOTE.D5, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.D6, 0, NOTE.C6, 0, NOTE.A5, 0, NOTE.F5, 0, NOTE.G5, 0,
      NOTE.A5, 0, 0, 0, NOTE.F5, 0, NOTE.D5, 0, NOTE.E5, 0, 0, 0, NOTE.C5, 0, NOTE.E5, 0,
      NOTE.F5, 0, NOTE.G5, 0, NOTE.A5, 0, NOTE.C6, 0, NOTE.D6, 0, 0, 0, NOTE.C6, 0, NOTE.A5, 0,
      NOTE.G5, 0, NOTE.A5, 0, NOTE.F5, 0, NOTE.E5, 0, NOTE.D5, 0, 0, 0, 0, 0, 0, 0,
      NOTE.D5, 0, NOTE.D5, 0, NOTE.F5, 0, NOTE.G5, 0, NOTE.A5, 0, NOTE.C6, 0, NOTE.D6, 0, NOTE.E6, 0,
      NOTE.F6, 0, 0, 0, NOTE.E6, 0, NOTE.D6, 0, NOTE.C6, 0, NOTE.A5, 0, NOTE.G5, 0, NOTE.A5, 0,
      NOTE.B5, 0, 0, 0, NOTE.C6, 0, NOTE.D6, 0, NOTE.E6, 0, 0, 0, NOTE.D6, 0, NOTE.C6, 0,
      NOTE.D6, 0, 0, 0, 0, 0, 0, 0, NOTE.D5, 0, 0, 0, 0, 0, 0, 0
    ];
    const oHarm = [
      NOTE.A4, 0, NOTE.D5, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.G5, 0, NOTE.F5, 0, NOTE.D5, 0, NOTE.E5, 0,
      NOTE.F5, 0, 0, 0, NOTE.D5, 0, NOTE.A4, 0, NOTE.C5, 0, 0, 0, NOTE.A4, 0, NOTE.C5, 0,
      NOTE.D5, 0, NOTE.E5, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.B5, 0, 0, 0, NOTE.A5, 0, NOTE.F5, 0,
      NOTE.E5, 0, NOTE.F5, 0, NOTE.D5, 0, NOTE.C5, 0, NOTE.A4, 0, 0, 0, 0, 0, 0, 0,
      NOTE.A4, 0, NOTE.A4, 0, NOTE.D5, 0, NOTE.E5, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.B5, 0, NOTE.C6, 0,
      NOTE.D6, 0, 0, 0, NOTE.C6, 0, NOTE.B5, 0, NOTE.A5, 0, NOTE.F5, 0, NOTE.E5, 0, NOTE.F5, 0,
      NOTE.G5, 0, 0, 0, NOTE.A5, 0, NOTE.B5, 0, NOTE.C6, 0, 0, 0, NOTE.B5, 0, NOTE.A5, 0,
      NOTE.A5, 0, 0, 0, 0, 0, 0, 0, NOTE.F4, 0, 0, 0, 0, 0, 0, 0
    ];
    const oBass = [
      NOTE.D3, 0, 0, 0, NOTE.A3, 0, 0, 0, NOTE.F3, 0, 0, 0, NOTE.C4, 0, 0, 0,
      NOTE.D3, 0, 0, 0, NOTE.A3, 0, 0, 0, NOTE.C3, 0, 0, 0, NOTE.G3, 0, 0, 0,
      NOTE.B2, 0, 0, 0, NOTE.F3, 0, 0, 0, NOTE.G2, 0, 0, 0, NOTE.D3, 0, 0, 0,
      NOTE.A2, 0, 0, 0, NOTE.E3, 0, 0, 0, NOTE.D3, 0, 0, 0, NOTE.A3, 0, 0, 0,
      NOTE.D3, 0, 0, 0, NOTE.A3, 0, 0, 0, NOTE.F3, 0, 0, 0, NOTE.C4, 0, 0, 0,
      NOTE.B2, 0, 0, 0, NOTE.F3, 0, 0, 0, NOTE.C3, 0, 0, 0, NOTE.G3, 0, 0, 0,
      NOTE.G2, 0, 0, 0, NOTE.D3, 0, 0, 0, NOTE.A2, 0, 0, 0, NOTE.E3, 0, 0, 0,
      NOTE.D3, 0, 0, 0, NOTE.A3, 0, 0, 0, NOTE.D3, 0, 0, 0, 0, 0, 0, 0
    ];
    const oArp = [
      NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.F5, NOTE.D5, NOTE.A4, NOTE.F4, NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.C5, NOTE.G4, NOTE.E4,
      NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.A4, NOTE.F4, NOTE.D4, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.G4, NOTE.E4, NOTE.C4, NOTE.G3,
      NOTE.B3, NOTE.D4, NOTE.F4, NOTE.B4, NOTE.D5, NOTE.B4, NOTE.F4, NOTE.D4, NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4, NOTE.D4, NOTE.B3, NOTE.G3, NOTE.D3,
      NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.C5, NOTE.A4, NOTE.E4, NOTE.C4, NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.A4, NOTE.F4, NOTE.D4, 0,
      NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.F5, NOTE.D5, NOTE.A4, NOTE.F4, NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F5, NOTE.C5, NOTE.A4, NOTE.F4, NOTE.C4,
      NOTE.B3, NOTE.D4, NOTE.F4, NOTE.B4, NOTE.D5, NOTE.B4, NOTE.F4, NOTE.D4, NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.G4, NOTE.E4, NOTE.C4, NOTE.G3,
      NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4, NOTE.B4, NOTE.G4, NOTE.D4, NOTE.B3, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.E4, NOTE.C4, NOTE.A3, NOTE.E3,
      NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.F5, NOTE.D5, NOTE.A4, NOTE.F4, NOTE.D4, 0, 0, 0, 0, 0, 0, 0
    ];

    for (let i = 0; i < 256; i++) {
      scoreOverture.ch1[i] = oMelody[i % 128];
      scoreOverture.ch2[i] = oHarm[i % 128];
      scoreOverture.ch3[i] = oBass[i % 128];
      scoreOverture.ch4[i] = oArp[i % 128];
      const s = i % 16;
      if (s === 0 || s === 8) scoreOverture.ch5[i] = 1;
      else if (s === 4 || s === 12) scoreOverture.ch5[i] = 2;
      else if (s % 2 === 0) scoreOverture.ch5[i] = 3;
    }

    // --- Title Theme (112 BPM, D Minor Arpeggiated Harp & Soaring Flute) ---
    const titleMelody = [
      NOTE.D5, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.D6, 0, NOTE.C6, 0, NOTE.A5, 0, NOTE.F5, 0, NOTE.G5, 0,
      NOTE.A5, 0, NOTE.F5, 0, NOTE.E5, 0, NOTE.D5, 0, NOTE.C5, 0, NOTE.E5, 0, NOTE.G5, 0, NOTE.A5, 0,
      NOTE.D5, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.D6, 0, NOTE.E6, 0, NOTE.D6, 0, NOTE.C6, 0, NOTE.A5, 0,
      NOTE.Bb5, 0, NOTE.A5, 0, NOTE.G5, 0, NOTE.F5, 0, NOTE.E5, 0, NOTE.F5, 0, NOTE.D5, 0, 0, 0
    ];
    const titleHarm = [
      NOTE.F4, 0, 0, 0, NOTE.A4, 0, 0, 0, NOTE.E4, 0, 0, 0, NOTE.C4, 0, 0, 0,
      NOTE.F4, 0, 0, 0, NOTE.D4, 0, 0, 0, NOTE.E4, 0, 0, 0, NOTE.C4, 0, 0, 0,
      NOTE.F4, 0, 0, 0, NOTE.A4, 0, 0, 0, NOTE.G4, 0, 0, 0, NOTE.E4, 0, 0, 0,
      NOTE.D4, 0, 0, 0, NOTE.Bb3, 0, 0, 0, NOTE.Cs4, 0, 0, 0, NOTE.D4, 0, 0, 0
    ];
    const titleBass = [
      NOTE.D3, 0, NOTE.D3, 0, NOTE.A2, 0, NOTE.D3, 0, NOTE.C3, 0, NOTE.C3, 0, NOTE.G2, 0, NOTE.C3, 0,
      NOTE.D3, 0, NOTE.D3, 0, NOTE.A2, 0, NOTE.D3, 0, NOTE.A2, 0, NOTE.A2, 0, NOTE.E3, 0, NOTE.A2, 0,
      NOTE.D3, 0, NOTE.D3, 0, NOTE.A2, 0, NOTE.D3, 0, NOTE.G2, 0, NOTE.G2, 0, NOTE.D3, 0, NOTE.G2, 0,
      NOTE.Bb2, 0, NOTE.Bb2, 0, NOTE.F2, 0, NOTE.Bb2, 0, NOTE.A2, 0, NOTE.A2, 0, NOTE.D3, 0, 0, 0
    ];
    const titleArp = [
      NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.F5, NOTE.D5, NOTE.A4, NOTE.F4,
      NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.C5, NOTE.G4, NOTE.E4,
      NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.F5, NOTE.D5, NOTE.A4, NOTE.F4,
      NOTE.A3, NOTE.Cs4, NOTE.E4, NOTE.A4, NOTE.Cs5, NOTE.A4, NOTE.E4, NOTE.Cs4
    ];

    // --- Mines Track (116 BPM, Subterranean Drive & Resonant Echoes) ---
    const mDungMel = [
      NOTE.A4, 0, NOTE.C5, 0, NOTE.D5, 0, NOTE.E5, NOTE.D5, NOTE.C5, 0, NOTE.A4, 0, NOTE.G4, 0, NOTE.A4, 0,
      NOTE.C5, 0, NOTE.D5, 0, NOTE.E5, 0, NOTE.G5, 0, NOTE.E5, 0, NOTE.D5, 0, NOTE.C5, 0, NOTE.D5, 0,
      NOTE.A4, 0, NOTE.C5, 0, NOTE.D5, 0, NOTE.E5, NOTE.D5, NOTE.C5, 0, NOTE.A4, 0, NOTE.G4, 0, NOTE.E4, 0,
      NOTE.G4, 0, NOTE.A4, 0, NOTE.C5, 0, NOTE.A4, 0, NOTE.G4, 0, NOTE.E4, 0, NOTE.A4, 0, 0, 0
    ];
    const mDungBass = [
      NOTE.A2, NOTE.A2, NOTE.E3, NOTE.A2, NOTE.A2, NOTE.A2, NOTE.G2, NOTE.A2,
      NOTE.C3, NOTE.C3, NOTE.G3, NOTE.C3, NOTE.D3, NOTE.D3, NOTE.A3, NOTE.D3,
      NOTE.A2, NOTE.A2, NOTE.E3, NOTE.A2, NOTE.A2, NOTE.A2, NOTE.G2, NOTE.A2,
      NOTE.F2, NOTE.F2, NOTE.C3, NOTE.F2, NOTE.E2, NOTE.E2, NOTE.B2, NOTE.E2
    ];
    const mDungArp = [
      NOTE.E4, NOTE.A4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.E4,
      NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.F5, NOTE.E5, NOTE.C5, NOTE.G4
    ];

    // --- Crypts Track (96 BPM, Gothic Catacombs & Dark Elegance) ---
    const cMelody = [
      NOTE.D5, 0, 0, 0, NOTE.F5, 0, NOTE.E5, 0, NOTE.D5, 0, NOTE.Cs5, 0, NOTE.D5, 0, 0, 0,
      NOTE.Bb4, 0, 0, 0, NOTE.D5, 0, NOTE.C5, 0, NOTE.Bb4, 0, NOTE.A4, 0, NOTE.G4, 0, NOTE.A4, 0,
      NOTE.D5, 0, 0, 0, NOTE.F5, 0, NOTE.G5, 0, NOTE.A5, 0, NOTE.Bb5, 0, NOTE.A5, 0, 0, 0,
      NOTE.G5, 0, NOTE.F5, 0, NOTE.E5, 0, NOTE.D5, 0, NOTE.Cs5, 0, NOTE.E5, 0, NOTE.D5, 0, 0, 0
    ];
    const cBass = [
      NOTE.D2, 0, NOTE.D2, 0, NOTE.A2, 0, NOTE.D2, 0, NOTE.D2, 0, NOTE.D2, 0, NOTE.A2, 0, NOTE.D2, 0,
      NOTE.Bb2, 0, NOTE.Bb2, 0, NOTE.F2, 0, NOTE.Bb2, 0, NOTE.A2, 0, NOTE.A2, 0, NOTE.E2, 0, NOTE.A2, 0,
      NOTE.D2, 0, NOTE.D2, 0, NOTE.A2, 0, NOTE.D2, 0, NOTE.G2, 0, NOTE.G2, 0, NOTE.D2, 0, NOTE.G2, 0,
      NOTE.A2, 0, NOTE.A2, 0, NOTE.E2, 0, NOTE.A2, 0, NOTE.D2, 0, NOTE.D2, 0, 0, 0, 0, 0
    ];
    const cArp = [
      NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.Cs4, NOTE.E4, NOTE.A4, NOTE.Cs5,
      NOTE.Bb3, NOTE.D4, NOTE.F4, NOTE.Bb4, NOTE.A3, NOTE.Cs4, NOTE.E4, NOTE.A4
    ];

    // --- Shrine Track (108 BPM, Aquatic Sanctum & Cascading Waves) ---
    const sMelody = [
      NOTE.F5, 0, NOTE.A5, 0, NOTE.C6, 0, NOTE.Bb5, 0, NOTE.A5, 0, NOTE.G5, 0, NOTE.F5, 0, NOTE.G5, 0,
      NOTE.A5, 0, 0, 0, NOTE.D5, 0, NOTE.F5, 0, NOTE.G5, 0, NOTE.F5, 0, NOTE.E5, 0, NOTE.D5, 0,
      NOTE.F5, 0, NOTE.A5, 0, NOTE.C6, 0, NOTE.D6, 0, NOTE.C6, 0, NOTE.A5, 0, NOTE.F5, 0, NOTE.G5, 0,
      NOTE.A5, 0, NOTE.Bb5, 0, NOTE.A5, 0, NOTE.G5, 0, NOTE.F5, 0, NOTE.E5, 0, NOTE.F5, 0, 0, 0
    ];
    const sBass = [
      NOTE.F3, 0, NOTE.F3, 0, NOTE.C3, 0, NOTE.F3, 0, NOTE.D3, 0, NOTE.D3, 0, NOTE.A2, 0, NOTE.D3, 0,
      NOTE.Bb2, 0, NOTE.Bb2, 0, NOTE.F2, 0, NOTE.Bb2, 0, NOTE.C3, 0, NOTE.C3, 0, NOTE.G2, 0, NOTE.C3, 0,
      NOTE.F3, 0, NOTE.F3, 0, NOTE.C3, 0, NOTE.F3, 0, NOTE.D3, 0, NOTE.D3, 0, NOTE.A2, 0, NOTE.D3, 0,
      NOTE.Bb2, 0, NOTE.Bb2, 0, NOTE.C3, 0, NOTE.C3, 0, NOTE.F3, 0, NOTE.F3, 0, 0, 0, 0, 0
    ];
    const sArp = [
      NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F5, NOTE.C5, NOTE.A4, NOTE.F4, NOTE.C4,
      NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.A4, NOTE.F4, NOTE.D4, NOTE.A3
    ];

    // --- Boss Track (144 BPM, Intense Driving Falcom Climax) ---
    const bMelody = [
      NOTE.E5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.B5, 0, NOTE.A5, NOTE.G5, NOTE.Fs5, 0, NOTE.D5, 0, NOTE.E5, 0, 0, 0,
      NOTE.G5, NOTE.A5, NOTE.B5, NOTE.C6, NOTE.D6, 0, NOTE.C6, NOTE.B5, NOTE.A5, 0, NOTE.B5, 0, NOTE.E5, 0, 0, 0,
      NOTE.E6, NOTE.D6, NOTE.C6, NOTE.B5, NOTE.A5, NOTE.B5, NOTE.C6, NOTE.A5, NOTE.B5, 0, NOTE.G5, 0, NOTE.A5, 0, NOTE.Fs5, 0,
      NOTE.G5, NOTE.A5, NOTE.B5, NOTE.G5, NOTE.Fs5, NOTE.G5, NOTE.A5, NOTE.Fs5, NOTE.E5, 0, 0, 0, 0, 0, 0, 0
    ];
    const bBass = [
      NOTE.E3, NOTE.E3, NOTE.E3, NOTE.E3, NOTE.C3, NOTE.C3, NOTE.C3, NOTE.C3,
      NOTE.D3, NOTE.D3, NOTE.D3, NOTE.D3, NOTE.B2, NOTE.B2, NOTE.B2, NOTE.B2,
      NOTE.C3, NOTE.C3, NOTE.C3, NOTE.C3, NOTE.A2, NOTE.A2, NOTE.A2, NOTE.A2,
      NOTE.B2, NOTE.B2, NOTE.B2, NOTE.B2, NOTE.E2, NOTE.E2, NOTE.E2, NOTE.E2
    ];
    const bArp = [
      NOTE.E4, NOTE.G4, NOTE.B4, NOTE.E5, NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5,
      NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.D5, NOTE.B3, NOTE.D4, NOTE.Fs4, NOTE.B4
    ];

    // --- Victory & Dawn Epilogue Track (100 BPM, Warm Sunrise Arrangement) ---
    const vMelody = [
      NOTE.C5, 0, NOTE.E5, 0, NOTE.G5, 0, NOTE.C6, 0, NOTE.B5, 0, NOTE.G5, 0, NOTE.A5, 0, NOTE.B5, 0,
      NOTE.C6, 0, NOTE.G5, 0, NOTE.E5, 0, 0, 0, NOTE.F5, 0, NOTE.A5, 0, NOTE.C6, 0, NOTE.D6, 0,
      NOTE.C6, 0, NOTE.A5, 0, NOTE.G5, 0, NOTE.E5, 0, NOTE.D5, 0, NOTE.E5, 0, NOTE.C5, 0, 0, 0,
      NOTE.E5, 0, NOTE.F5, 0, NOTE.G5, 0, NOTE.A5, 0, NOTE.G5, 0, NOTE.C5, 0, NOTE.D5, 0, NOTE.C5, 0
    ];
    const vBass = [
      NOTE.C3, 0, NOTE.G3, 0, NOTE.C3, 0, NOTE.G3, 0, NOTE.F3, 0, NOTE.C4, 0, NOTE.F3, 0, NOTE.C4, 0,
      NOTE.G3, 0, NOTE.D4, 0, NOTE.G3, 0, NOTE.D4, 0, NOTE.C3, 0, NOTE.G3, 0, NOTE.C3, 0, NOTE.G3, 0
    ];
    const vArp = [
      NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.C5, NOTE.G4, NOTE.E4,
      NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F5, NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G5
    ];

    for (let i = 0; i < 256; i++) {
      // Title
      scoreTitle.ch1[i] = titleMelody[i % titleMelody.length];
      scoreTitle.ch2[i] = titleHarm[i % titleHarm.length];
      scoreTitle.ch3[i] = titleBass[i % titleBass.length];
      scoreTitle.ch4[i] = titleArp[i % titleArp.length];
      const ts = i % 16;
      if (ts === 0) scoreTitle.ch5[i] = 1;
      else if (ts === 8) scoreTitle.ch5[i] = 2;
      else if (ts % 2 === 0) scoreTitle.ch5[i] = 3;

      // Mines
      scoreMines.ch1[i] = mDungMel[i % mDungMel.length];
      scoreMines.ch2[i] = mDungMel[(i + 4) % mDungMel.length] ? NOTE.E4 : 0;
      scoreMines.ch3[i] = mDungBass[i % mDungBass.length];
      scoreMines.ch4[i] = mDungArp[i % mDungArp.length];
      if (ts === 0 || ts === 8) scoreMines.ch5[i] = 1;
      else if (ts === 4 || ts === 12) scoreMines.ch5[i] = 2;
      else if (ts % 2 === 0) scoreMines.ch5[i] = 3;

      // Crypts
      scoreCrypts.ch1[i] = cMelody[i % cMelody.length];
      scoreCrypts.ch2[i] = cMelody[(i + 2) % cMelody.length] ? NOTE.A4 : 0;
      scoreCrypts.ch3[i] = cBass[i % cBass.length];
      scoreCrypts.ch4[i] = cArp[i % cArp.length];
      if (ts === 8) scoreCrypts.ch5[i] = 2;
      else if (ts === 0) scoreCrypts.ch5[i] = 1;
      else if (ts % 4 === 0) scoreCrypts.ch5[i] = 3;

      // Shrine
      scoreShrine.ch1[i] = sMelody[i % sMelody.length];
      scoreShrine.ch2[i] = sMelody[(i + 4) % sMelody.length] ? NOTE.C5 : 0;
      scoreShrine.ch3[i] = sBass[i % sBass.length];
      scoreShrine.ch4[i] = sArp[i % sArp.length];
      if (ts === 0 || ts === 6 || ts === 12) scoreShrine.ch5[i] = 1;
      else if (ts === 4 || ts === 10) scoreShrine.ch5[i] = 2;
      else if (ts % 2 === 0) scoreShrine.ch5[i] = 3;

      // Boss
      scoreBoss.ch1[i] = bMelody[i % bMelody.length];
      scoreBoss.ch2[i] = bMelody[i % bMelody.length] ? NOTE.E4 : 0;
      scoreBoss.ch3[i] = bBass[i % bBass.length];
      scoreBoss.ch4[i] = bArp[i % bArp.length];
      if (ts % 4 === 0) scoreBoss.ch5[i] = 1;
      else if (ts % 4 === 2) scoreBoss.ch5[i] = 2;
      else scoreBoss.ch5[i] = 3;

      // Victory
      scoreVictory.ch1[i] = vMelody[i % vMelody.length];
      scoreVictory.ch2[i] = vMelody[(i + 4) % vMelody.length] ? NOTE.G4 : 0;
      scoreVictory.ch3[i] = vBass[i % vBass.length];
      scoreVictory.ch4[i] = vArp[i % vArp.length];
      if (ts === 0 || ts === 8) scoreVictory.ch5[i] = 1;
      else if (ts === 4 || ts === 12) scoreVictory.ch5[i] = 2;
      else if (ts % 2 === 0) scoreVictory.ch5[i] = 3;
    }
  }

  const BPM = 98;
  const STEP_DUR = (60 / BPM) / 4;
  let currentStep = 0;
  let nextStepTime = 0;
  let sequencerTimer = null;

  function playKick(time) {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);
    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.09);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    vuMeters[4] = Math.max(vuMeters[4], 0.9);
  }

  function playSnare(time) {
    if (!audioCtx || isMuted) return;
    const buf = getNoiseBuffer();
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(time);
    src.stop(time + 0.11);
    src.onended = () => { src.disconnect(); filter.disconnect(); gain.disconnect(); };
    vuMeters[4] = Math.max(vuMeters[4], 0.8);
  }

  function playHihat(time) {
    if (!audioCtx || isMuted) return;
    const buf = getNoiseBuffer();
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, time);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(time);
    src.stop(time + 0.035);
    src.onended = () => { src.disconnect(); filter.disconnect(); gain.disconnect(); };
    vuMeters[4] = Math.max(vuMeters[4], 0.4);
  }

  function scheduleNote(wave, freq, time, duration, volume, meterIdx) {
    if (!freq || !audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.setValueAtTime(freq, time);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.006);
    gain.gain.setValueAtTime(volume * 0.8, time + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    vuMeters[meterIdx] = Math.max(vuMeters[meterIdx], volume / 0.16);
  }

  function buildSequencer() {
    buildBgmScores();
    nextStepTime = audioCtx.currentTime + 0.05;
    sequencerTimer = setInterval(() => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      if (nextStepTime < audioCtx.currentTime) {
        nextStepTime = audioCtx.currentTime + 0.05;
      }
      while (nextStepTime < audioCtx.currentTime + 0.12) {
        const step = currentStep;
        const t = nextStepTime;
        const isIntro = (typeof introCinemaState !== 'undefined' && introCinemaState && introCinemaState.active);
        const isTitle = (typeof titleScreenState !== 'undefined' && titleScreenState && titleScreenState.active);
        const isBoss = (typeof isBossActive === 'function' && isBossActive());

        let curScore = scoreMidday;
        let curBpm = 98;
        if (isTitle) {
          curScore = scoreTitle;
          curBpm = 112;
        } else if (isIntro) {
          curScore = scoreOverture;
          curBpm = 92;
        } else if ((typeof epilogueCinemaState !== 'undefined' && epilogueCinemaState && epilogueCinemaState.active) || (typeof flags !== 'undefined' && flags.gameCompleted && activeMapId === 'bell_spire')) {
          curScore = scoreVictory;
          curBpm = 100;
        } else if (isBoss) {
          curScore = scoreBoss;
          curBpm = 144;
        } else if (activeMapId === 'dungeon_mines') {
          curScore = scoreMines;
          curBpm = 116;
        } else if (activeMapId === 'dungeon_crypts') {
          curScore = scoreCrypts;
          curBpm = 96;
        } else if (activeMapId === 'dungeon_shrine') {
          curScore = scoreShrine;
          curBpm = 108;
        } else if (activeMapId === 'bell_spire') {
          curScore = scoreCrypts;
          curBpm = 120;
        } else if (flags.isTwilight) {
          curScore = scoreTwilight;
          curBpm = 98;
        } else {
          curScore = scoreMidday;
          curBpm = 98;
        }
        const curStepDur = (60 / curBpm) / 4;

        const f1 = curScore.ch1[step];
        if (f1) {
          const w1 = (isIntro || isTitle || isBoss) ? waveLead : (flags.isTwilight ? waveHollow : waveLead);
          const v1 = isBoss ? 0.16 : (isIntro || isTitle ? 0.14 : (flags.isTwilight ? 0.12 : 0.13));
          scheduleNote(w1, f1, t, curStepDur * 3.2, v1, 0);
        }

        const f2 = curScore.ch2[step];
        if (f2) {
          const v2 = isBoss ? 0.11 : (isIntro || isTitle ? 0.09 : (flags.isTwilight ? 0.06 : 0.08));
          scheduleNote(waveHollow, f2, t, curStepDur * 3.0, v2, 1);
        }

        const f3 = curScore.ch3[step];
        if (f3) scheduleNote(waveBass, f3, t, curStepDur * 2.8, isBoss ? 0.19 : 0.16, 2);

        const f4 = curScore.ch4[step];
        if (f4) scheduleNote(waveArp, f4, t, curStepDur * 1.8, isBoss ? 0.09 : 0.07, 3);

        const p = curScore.ch5[step];
        if (p === 1) playKick(t);
        else if (p === 2) playSnare(t);
        else if (p === 3) playHihat(t);
        else if (isIntro) {
          if (step % 8 === 0) playHihat(t);
        } else if ((isTitle || isBoss || activeMapId === 'aldenor_coastal_plains' || activeMapId.startsWith('dungeon_')) && step % 2 === 1) playHihat(t);

        currentStep = (currentStep + 1) % 256;
        nextStepTime += curStepDur;
      }
    }, 25);
  }

  // =========================================================================
  // SECTION 3: 5x7 Retro Bitmap Font Engine
  // =========================================================================
  const FONT_GLYPHS = {
    'A': [0x0e,0x11,0x11,0x1f,0x11,0x11,0x11], 'B': [0x1e,0x11,0x11,0x1e,0x11,0x11,0x1e],
    'C': [0x0e,0x11,0x10,0x10,0x10,0x11,0x0e], 'D': [0x1c,0x12,0x11,0x11,0x11,0x12,0x1c],
    'E': [0x1f,0x10,0x10,0x1e,0x10,0x10,0x1f], 'F': [0x1f,0x10,0x10,0x1e,0x10,0x10,0x10],
    'G': [0x0e,0x11,0x10,0x17,0x11,0x11,0x0f], 'H': [0x11,0x11,0x11,0x1f,0x11,0x11,0x11],
    'I': [0x0e,0x04,0x04,0x04,0x04,0x04,0x0e], 'J': [0x07,0x02,0x02,0x02,0x02,0x12,0x0c],
    'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11], 'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1f],
    'M': [0x11,0x1b,0x15,0x15,0x11,0x11,0x11], 'N': [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
    'O': [0x0e,0x11,0x11,0x11,0x11,0x11,0x0e], 'P': [0x1e,0x11,0x11,0x1e,0x10,0x10,0x10],
    'Q': [0x0e,0x11,0x11,0x11,0x15,0x12,0x0d], 'R': [0x1e,0x11,0x11,0x1e,0x14,0x12,0x11],
    'S': [0x0f,0x10,0x10,0x0e,0x01,0x01,0x1e], 'T': [0x1f,0x04,0x04,0x04,0x04,0x04,0x04],
    'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0e], 'V': [0x11,0x11,0x11,0x11,0x11,0x0a,0x04],
    'W': [0x11,0x11,0x11,0x15,0x15,0x15,0x0a], 'X': [0x11,0x11,0x0a,0x04,0x0a,0x11,0x11],
    'Y': [0x11,0x11,0x0a,0x04,0x04,0x04,0x04], 'Z': [0x1f,0x01,0x02,0x04,0x08,0x10,0x1f],
    'a': [0x00,0x00,0x0e,0x01,0x0f,0x11,0x0f], 'b': [0x10,0x10,0x1e,0x11,0x11,0x11,0x1e],
    'c': [0x00,0x00,0x0e,0x11,0x10,0x11,0x0e], 'd': [0x01,0x01,0x0f,0x11,0x11,0x11,0x0f],
    'e': [0x00,0x00,0x0e,0x11,0x1f,0x10,0x0e], 'f': [0x06,0x09,0x08,0x1c,0x08,0x08,0x08],
    'g': [0x00,0x00,0x0f,0x11,0x0f,0x01,0x0e], 'h': [0x10,0x10,0x16,0x19,0x11,0x11,0x11],
    'i': [0x04,0x00,0x0c,0x04,0x04,0x04,0x0e], 'j': [0x02,0x00,0x06,0x02,0x02,0x12,0x0c],
    'k': [0x10,0x10,0x12,0x14,0x18,0x14,0x12], 'l': [0x0c,0x04,0x04,0x04,0x04,0x04,0x0e],
    'm': [0x00,0x00,0x1a,0x15,0x15,0x11,0x11], 'n': [0x00,0x00,0x16,0x19,0x11,0x11,0x11],
    'o': [0x00,0x00,0x0e,0x11,0x11,0x11,0x0e], 'p': [0x00,0x00,0x1e,0x11,0x1e,0x10,0x10],
    'q': [0x00,0x00,0x0f,0x11,0x0f,0x01,0x01], 'r': [0x00,0x00,0x16,0x19,0x10,0x10,0x10],
    's': [0x00,0x00,0x0f,0x10,0x0e,0x01,0x1e], 't': [0x08,0x08,0x1c,0x08,0x08,0x09,0x06],
    'u': [0x00,0x00,0x11,0x11,0x11,0x13,0x0d], 'v': [0x00,0x00,0x11,0x11,0x11,0x0a,0x04],
    'w': [0x00,0x00,0x11,0x15,0x15,0x15,0x0a], 'x': [0x00,0x00,0x11,0x0a,0x04,0x0a,0x11],
    'y': [0x00,0x00,0x11,0x11,0x0f,0x01,0x0e], 'z': [0x00,0x00,0x1f,0x02,0x04,0x08,0x1f],
    '0': [0x0e,0x11,0x13,0x15,0x19,0x11,0x0e], '1': [0x04,0x0c,0x04,0x04,0x04,0x04,0x0e],
    '2': [0x0e,0x11,0x01,0x06,0x08,0x10,0x1f], '3': [0x1f,0x02,0x04,0x02,0x01,0x11,0x0e],
    '4': [0x02,0x06,0x0a,0x12,0x1f,0x02,0x02], '5': [0x1f,0x10,0x1e,0x01,0x01,0x11,0x0e],
    '6': [0x06,0x08,0x10,0x1e,0x11,0x11,0x0e], '7': [0x1f,0x01,0x02,0x04,0x08,0x08,0x08],
    '8': [0x0e,0x11,0x11,0x0e,0x11,0x11,0x0e], '9': [0x0e,0x11,0x11,0x0f,0x01,0x02,0x0c],
    '!': [0x04,0x04,0x04,0x04,0x04,0x00,0x04], '?': [0x0e,0x11,0x01,0x02,0x04,0x00,0x04],
    '.': [0x00,0x00,0x00,0x00,0x00,0x04,0x04], ',': [0x00,0x00,0x00,0x00,0x00,0x04,0x08],
    ':': [0x00,0x04,0x04,0x00,0x04,0x04,0x00], ';': [0x00,0x04,0x04,0x00,0x04,0x04,0x08],
    "'": [0x04,0x04,0x08,0x00,0x00,0x00,0x00], '"': [0x0a,0x0a,0x14,0x00,0x00,0x00,0x00],
    '-': [0x00,0x00,0x00,0x1f,0x00,0x00,0x00], '—': [0x00,0x00,0x00,0x1f,0x00,0x00,0x00],
    '–': [0x00,0x00,0x00,0x0e,0x00,0x00,0x00], '~': [0x00,0x0a,0x15,0x00,0x00,0x00,0x00],
    '(': [0x02,0x04,0x08,0x08,0x08,0x04,0x02], ')': [0x08,0x04,0x02,0x02,0x02,0x04,0x08],
    '[': [0x0e,0x08,0x08,0x08,0x08,0x08,0x0e], ']': [0x0e,0x02,0x02,0x02,0x02,0x02,0x0e],
    '<': [0x02,0x04,0x08,0x10,0x08,0x04,0x02], '>': [0x08,0x04,0x02,0x01,0x02,0x04,0x08],
    '/': [0x01,0x02,0x04,0x08,0x10,0x00,0x00], '+': [0x00,0x04,0x04,0x1f,0x04,0x04,0x00],
    '=': [0x00,0x1f,0x00,0x1f,0x00,0x00,0x00], '%': [0x19,0x19,0x02,0x04,0x08,0x13,0x13],
    '*': [0x00,0x15,0x0e,0x1f,0x0e,0x15,0x00], '✦': [0x04,0x04,0x0e,0x1f,0x0e,0x04,0x04],
    '_': [0x00,0x00,0x00,0x00,0x00,0x00,0x1f], '&': [0x0c,0x12,0x14,0x08,0x15,0x12,0x0d],
    '#': [0x0a,0x1f,0x0a,0x0a,0x1f,0x0a,0x00],
    '²': [0x0e, 0x01, 0x06, 0x08, 0x0f, 0x00, 0x00],
    '♥': [0x00, 0x0a, 0x1f, 0x1f, 0x0e, 0x04, 0x00],
    '▲': [0x00,0x04,0x04,0x0e,0x0e,0x1f,0x1f],
    '▼': [0x1f,0x1f,0x0e,0x0e,0x04,0x04,0x00], ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00]
  };

  function sanitizePixelString(raw) {
    if (raw == null) return '';
    return String(raw)
      .replace(/\ufffd/g, ' - ')
      .replace(/[—–]/g, '-')
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/…/g, '...')
      .replace(/[\uD800-\uDFFF]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trimStart();
  }

  function drawGlyph(ctx, ch, px, py, color) {
    const rows = FONT_GLYPHS[ch] || FONT_GLYPHS[' '];
    ctx.fillStyle = color;
    for (let y = 0; y < 7; y++) {
      const bits = rows[y];
      for (let x = 0; x < 5; x++) {
        if ((bits >> (4 - x)) & 1) {
          ctx.fillRect(px + x, py + y, 1, 1);
        }
      }
    }
  }

  function drawPixelText(ctx, text, startX, startY, color = vceColor(7, 7, 7), shadowColor = OUTLINE_COLOR) {
    const clean = sanitizePixelString(text);
    let curX = startX;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (shadowColor) {
        drawGlyph(ctx, ch, curX + 1, startY + 1, shadowColor);
      }
      drawGlyph(ctx, ch, curX, startY, color);
      curX += 6;
    }
    return curX;
  }

  function wrapDialogueText(text, maxCharsPerLine = 28) {
    const clean = sanitizePixelString(text);
    const words = clean.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + (cur ? ' ' : '') + w).length <= maxCharsPerLine) {
        cur += (cur ? ' ' : '') + w;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // Undertale / Deltarune Per-Character Talking Voice Blips
  function playVoiceBlip(speakerId = 'nyah', expr = 'normal', charCode = 65) {
    if (isMuted || !audioCtx || !masterGain) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const pitchJitter = ((charCode * 17) % 50) - 25;

    let baseFreq = 480;
    let endFreq = 510;
    let waveType = 'triangle';
    let dur = 0.045;
    let vol = 0.065;

    const id = (speakerId || '').toLowerCase();
    if (id.includes('nyah')) {
      // Nyah: Sassy, bright, catty upward chirp (higher & faster when jealous/bratty/flustered)
      waveType = (expr === 'jealous' || expr === 'bratty') ? 'square' : 'triangle';
      baseFreq = (expr === 'flustered' || expr === 'shocked') ? 620 : 540;
      endFreq = baseFreq + 85 + pitchJitter;
      dur = 0.042;
      vol = 0.06;
    } else if (id.includes('fifi')) {
      // Fifi: Soft, gentle, bashful flute-like sine/triangle voice with shy downward lilt
      waveType = 'sine';
      baseFreq = (expr === 'panicked' || expr === 'flustered') ? 560 : 430;
      endFreq = baseFreq - 35 + pitchJitter * 0.6;
      dur = 0.052;
      vol = 0.075;
    } else if (id.includes('lumina')) {
      // Lumina: Melodic, warm bell-like mezzo lilt
      waveType = 'sine';
      baseFreq = 475 + pitchJitter;
      endFreq = baseFreq + 45;
      dur = 0.05;
    } else if (id.includes('elder') || id.includes('gared')) {
      // Elder Gared: Deep, warm Undertale Asgore/Gerson low baritone square blip
      waveType = 'sawtooth';
      baseFreq = 165 + (pitchJitter * 0.4);
      endFreq = 152;
      dur = 0.055;
      vol = 0.045;
    } else if (id.includes('guard') || id.includes('goran')) {
      // Guard Goran: Sturdy, brassy mid-low square bark
      waveType = 'square';
      baseFreq = 235 + (pitchJitter * 0.5);
      endFreq = 250;
      dur = 0.04;
      vol = 0.045;
    } else if (id.includes('child') || id.includes('lyla')) {
      // Child Lyla: High, bubbly music-box chirp
      waveType = 'triangle';
      baseFreq = 690 + pitchJitter;
      endFreq = 750;
      dur = 0.038;
    } else if (id.includes('gull')) {
      waveType = 'sawtooth';
      baseFreq = 880;
      endFreq = 620;
      dur = 0.06;
    } else {
      // Narrator / Notice
      waveType = 'triangle';
      baseFreq = 360 + (pitchJitter * 0.4);
      endFreq = 360;
      dur = 0.035;
    }

    osc.type = waveType;
    osc.frequency.setValueAtTime(Math.max(80, baseFreq), now);
    osc.frequency.linearRampToValueAtTime(Math.max(80, endFreq), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.onended = () => {
      try { osc.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
    };
    osc.start(now);
    osc.stop(now + dur + 0.005);
  }

  function drawCompactGlyph(ctx, ch, px, py, color) {
    const rows = FONT_GLYPHS[ch] || FONT_GLYPHS['?'];
    if (!rows) return 3;
    if (ch === ' ') return 3;
    let minX = 5, maxX = -1;
    for (let y = 0; y < 7; y++) {
      const bits = rows[y];
      for (let x = 0; x < 5; x++) {
        if ((bits >> (4 - x)) & 1) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    if (maxX === -1) return 3;
    ctx.fillStyle = color;
    for (let y = 0; y < 7; y++) {
      const bits = rows[y];
      for (let x = minX; x <= maxX; x++) {
        if ((bits >> (4 - x)) & 1) {
          ctx.fillRect(px + (x - minX), py + y, 1, 1);
        }
      }
    }
    return Math.max(3, (maxX - minX + 1) + 1);
  }

  function drawCompactText(ctx, text, startX, startY, color = vceColor(7, 7, 7), shadowColor = OUTLINE_COLOR) {
    let curX = startX;
    const str = sanitizePixelString(text);
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === ' ') {
        curX += 3;
        continue;
      }
      if (shadowColor) {
        drawCompactGlyph(ctx, ch, curX + 1, startY + 1, shadowColor);
      }
      const advance = drawCompactGlyph(ctx, ch, curX, startY, color);
      curX += advance;
    }
    return curX;
  }

  window.playVoiceBlip = playVoiceBlip;
  window.drawCompactText = drawCompactText;

  // =========================================================================
