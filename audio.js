// FIX 2: Modularise audio logic
import { VIBES } from './vibe.js';
import { toast } from './main.js';

let state;

export function init(sharedState) {
  state = sharedState;
}

export function initAudio() {
  if (state.audioCtx) return;
  state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  state.gainNode = state.audioCtx.createGain();
  
  // Master Lowpass Filter to reduce 'vibrating' buzz and ear fatigue
  state.masterFilter = state.audioCtx.createBiquadFilter();
  state.masterFilter.type = 'lowpass';
  state.masterFilter.frequency.value = 5000;
  
  state.gainNode.connect(state.masterFilter);
  state.masterFilter.connect(state.audioCtx.destination);
  
  state.gainNode.gain.setValueAtTime(0, state.audioCtx.currentTime);
}

export function stopAudio() {
  if (!state.audioCtx) return;
  state.oscNodes.forEach(n => { try { n.stop(); } catch (e) { } });
  state.oscNodes = [];
  if (state.bgAudio) {
    state.bgAudio.pause();
    state.bgAudio = null;
  }
  state.gainNode.gain.cancelScheduledValues(state.audioCtx.currentTime);
  state.gainNode.gain.setTargetAtTime(0, state.audioCtx.currentTime, 0.4);
}

export function playAudio() {
  initAudio();
  if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
  stopAudio();
  const v = VIBES[state.vibe];
  const ctx = state.audioCtx;
  const master = state.gainNode;
  const currentVol = parseInt(document.getElementById('vol-slider').value) / 100 * 0.9;
  master.gain.setTargetAtTime(currentVol, ctx.currentTime, 0.05);

  if (v.synthType === 'file' && v.file) {
    const audio = new Audio(v.file);
    audio.loop = true;
    audio.volume = currentVol;
    audio.play().catch(err => console.warn("Auto-play blocked or file missing:", err));
    state.bgAudio = audio;
    return;
  }

  const configs = {
    rain: [
      { type: 'noise', ffreq: 400, gain: 0.8 },
      { type: 'noise', ffreq: 1200, gain: 0.3 },
      { type: 'sine', freq: 40, gain: 0.4 }
    ],
    lofi: [
      { type: 'sawtooth', freq: 110, gain: 0.4, ffreq: 400, vibrato: 0.5 }, // Low warm buzz
      { type: 'sine', freq: 220, gain: 0.25, vibrato: 1 }, // Melodic hum
      { type: 'noise', ffreq: 1000, gain: 0.15 } // Tape hiss
    ],
    ambient: [
      { type: 'sine', freq: 120, gain: 0.6, slowFade: true },
      { type: 'sine', freq: 240, gain: 0.4, slowFade: true },
      { type: 'sine', freq: 480, gain: 0.2, slowFade: true }
    ],
    deep: [
      { type: 'noise', ffreq: 300, gain: 1.0 }, // audible deep rumble
      { type: 'sine', freq: 90, gain: 0.8, slowFade: true }, // audible bass
      { type: 'sine', freq: 180, gain: 0.4, slowFade: true } // texture layer
    ],
    jazz: [
      { type: 'triangle', freq: 150, gain: 0.5, vibrato: 4 },
      { type: 'triangle', freq: 225, gain: 0.4, vibrato: 2 }
    ],
    noise: [
      { type: 'noise', ffreq: 500, gain: 0.6 },
      { type: 'sine', freq: 60, gain: 0.7 }
    ],
    party: [
      { type: 'square', freq: 55, gain: 0.25, pulse: 1.5 }, // rhythmic bass
      { type: 'sawtooth', freq: 110, gain: 0.15, pulse: 3 }, // rhythmic synth
      { type: 'noise', ffreq: 3000, gain: 0.05, pulse: 6 } // light high-hat feel
    ],
    soft: [
      { type: 'triangle', freq: 220, gain: 0.35, vibrato: 2 }, // Warm Bloom base
      { type: 'sine', freq: 440, gain: 0.2, slowFade: true }, // Elegant harmonic
      { type: 'sine', freq: 659, gain: 0.1, slowFade: true } // High sparkle
    ],
    nature: [
      { type: 'sine', freq: 900, gain: 0.01, pulse: 0.3, freqLfo: 2 }, // Much softer chirp
      { type: 'triangle', freq: 1100, gain: 0.005, pulse: 0.5, freqLfo: 3 }, // Very soft texture
      { type: 'sine', freq: 60, gain: 0.4, slowFade: true } // Deep calming earth hum
    ]
  };

  const cfgs = configs[v.synthType] || configs.ambient;
  cfgs.forEach(cfg => {
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cfg.ffreq || 800;
    gain.gain.value = cfg.gain;
    filt.connect(gain); gain.connect(master);

    if (cfg.type === 'noise') {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      src.connect(filt); src.start();
      state.oscNodes.push(src);
    } else {
      const osc = ctx.createOscillator();
      osc.type = cfg.type; osc.frequency.value = cfg.freq;

      const lfoG = ctx.createGain();
      const lfo = ctx.createOscillator();

      let finalDest = gain;

      if (cfg.vibrato) {
        lfo.frequency.value = cfg.vibrato;
        lfoG.gain.value = cfg.freq * 0.05;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
      } else if (cfg.slowFade) {
        // Disconnect direct gain to master for slowFade
        gain.disconnect(master);
        const gainMod = ctx.createGain();
        gainMod.gain.value = 0.5;
        const volLfo = ctx.createOscillator();
        volLfo.frequency.value = 0.1 + Math.random() * 0.1;
        volLfo.connect(gainMod.gain);
        gain.connect(gainMod); gainMod.connect(master);
        volLfo.start(); state.oscNodes.push(volLfo);
      } else if (cfg.pulse) {
        lfo.frequency.value = cfg.pulse;
        lfoG.gain.value = cfg.gain;
        lfo.connect(gain.gain);
      }

      if (cfg.freqLfo) {
        const fLfo = ctx.createOscillator();
        const fG = ctx.createGain();
        fLfo.frequency.value = cfg.freqLfo;
        fG.gain.value = cfg.freq * 0.1; // 10% frequency shift
        fLfo.connect(fG); fG.connect(osc.frequency);
        fLfo.start(); state.oscNodes.push(fLfo);
      }

      osc.connect(filt); osc.start(); lfo.start();
      state.oscNodes.push(osc, lfo);
    }
  });
}

export function toggleMusicPlay() {
  initAudio();
  if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
  state.musicPlaying = !state.musicPlaying;
  if (state.musicPlaying) { playAudio(); } else { stopAudio(); }
  updateMusicUI();
}

export function setVolume(val) {
  const vol = val / 100 * 0.9;
  if (state.gainNode) state.gainNode.gain.setTargetAtTime(vol, state.audioCtx.currentTime, 0.05);
  if (state.bgAudio) state.bgAudio.volume = vol;
}

export function updateMusicUI() {
  const v = VIBES[state.vibe];
  const t = v.tracks[state.musicTrack % v.tracks.length];
  document.getElementById('track-title').textContent = t.title;
  document.getElementById('track-artist').textContent = t.artist;
  document.getElementById('album-art').textContent = t.icon;
  document.getElementById('mc-play-btn').classList.toggle('mplaying', state.musicPlaying);
  document.getElementById('top-wave').classList.toggle('paused', !state.musicPlaying);
  document.getElementById('vol-toggle').textContent = state.musicPlaying ? '🔊' : '🔇';
  // Simulate progress
  if (state.musicInterval) clearInterval(state.musicInterval);
  if (state.musicPlaying) {
    state.musicProgress = 0;
    const dur = t.dur;
    document.getElementById('prog-total').textContent = fmtTime(dur);
    state.musicInterval = setInterval(() => {
      state.musicProgress = (state.musicProgress + 1) % dur;
      const pct = (state.musicProgress / dur * 100).toFixed(1);
      document.getElementById('prog-fill').style.width = pct + '%';
      document.getElementById('prog-thumb').style.left = pct + '%';
      document.getElementById('prog-current').textContent = fmtTime(state.musicProgress);
    }, 1000);
  } else {
    clearInterval(state.musicInterval);
  }
}

export function updateTrackInfo() {
  const v = VIBES[state.vibe];
  const t = v.tracks[0];
  document.getElementById('track-title').textContent = t.title;
  document.getElementById('track-artist').textContent = t.artist;
  document.getElementById('album-art').textContent = t.icon;
  document.getElementById('prog-total').textContent = fmtTime(t.dur);
}

export function fmtTime(s) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }

export function seekMusic(e) { 
  const w = e.currentTarget.offsetWidth; 
  const pct = e.offsetX / w; 
  const v = VIBES[state.vibe]; 
  state.musicProgress = Math.round(pct * v.tracks[0].dur); 
}

export function prevMusicTrack() { /* toast('⏮ Previous track'); */ }
export function nextMusicTrack() { /* toast('⏭ Next track'); */ }
