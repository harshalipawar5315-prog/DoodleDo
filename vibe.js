// FIX 2: Modularise vibe logic
export let VIBES = [
  { id: 'rainy', label: 'Rainy', icon: '🌧️', bg: ['#0a0e1a', '#0d1520', '#1a2535'], accent: '#7aadff', accent2: '#a0c4ff', glow: 'rgba(122,173,255,0.18)', particle: 'rgba(122,173,255,0.4)', tracks: [{ title: 'Deep Thunder', artist: 'Nature FM', icon: '⛈️', dur: 240 }, { title: 'Lo-fi Rain', artist: 'Lofi Girl', icon: '🌧️', dur: 225 }, { title: 'Window Rain', artist: 'Soft Vibes', icon: '🪟', dur: 180 }], synthType: 'rain' },
  { id: 'study', label: 'Study', icon: '📖', bg: ['#0a0908', '#141210', '#1c1a17'], accent: '#d4a373', accent2: '#faedcd', glow: 'rgba(212,163,115,0.15)', particle: 'rgba(212,163,115,0.3)', tracks: [{ title: 'Library Silence', artist: 'Study Wisdom', icon: '📖', dur: 300 }, { title: 'Focus Flow', artist: 'Deep Work', icon: '🧠', dur: 210 }, { title: 'Ancient Books', artist: 'History FM', icon: '📜', dur: 320 }], synthType: 'lofi' },
  { id: 'chill', label: 'Chill', icon: '☕', bg: ['#0e0a18', '#12102a', '#1a1535'], accent: '#c084fc', accent2: '#e0aaff', glow: 'rgba(192,132,252,0.18)', particle: 'rgba(192,132,252,0.4)', tracks: [{ title: 'Chill Vibes', artist: 'ChillHop', icon: '☕', dur: 195 }, { title: 'Sunset Drive', artist: 'Retro Wave', icon: '🌅', dur: 240 }, { title: 'Morning Coffee', artist: 'Cafe Jazz', icon: '☕', dur: 210 }], synthType: 'ambient' },
  { id: 'night', label: 'Night', icon: '🌙', bg: ['#060810', '#080c18', '#0c1020'], accent: '#818cf8', accent2: '#a5b4fc', glow: 'rgba(129,140,248,0.18)', particle: 'rgba(129,140,248,0.4)', tracks: [{ title: 'Deep Space', artist: 'Cosmic', icon: '🌌', dur: 360 }, { title: 'Night Drive', artist: 'Synth Cafe', icon: '🌙', dur: 240 }, { title: 'Quiet City', artist: 'Urban Lofi', icon: '🏙️', dur: 220 }], synthType: 'deep' },
  { id: 'bloom', label: 'Bloom', icon: '🌸', bg: ['#1a0a10', '#2a0d18', '#3a1025'], accent: '#ff8fab', accent2: '#fb6f92', glow: 'rgba(255,143,171,0.18)', particle: 'rgba(255,143,171,0.4)', tracks: [{ title: 'Spring Bloom', artist: 'Nature Vibes', icon: '🌸', dur: 200 }, { title: 'Rose Garden', artist: 'Soft Piano', icon: '🌹', dur: 240 }, { title: 'Classy Evening', artist: 'High End', icon: '🍸', dur: 300 }], synthType: 'soft' },
  { id: 'party', label: 'Party', icon: '🪩', bg: ['#18051a', '#220828', '#300a3a'], accent: '#f472b6', accent2: '#fb7185', glow: 'rgba(244,114,182,0.18)', particle: 'rgba(244,114,182,0.45)', tracks: [{ title: 'Neon Nights', artist: 'Techno Cat', icon: '⚡', dur: 180 }, { title: 'Midnight Disco', artist: 'Groove', icon: '🕺', dur: 220 }, { title: 'House Party', artist: 'DJ Vibe', icon: '🎧', dur: 200 }], synthType: 'party' },
  { id: 'relax', label: 'Relax', icon: '🌿', bg: ['#061410', '#081a12', '#0c2218'], accent: '#34d399', accent2: '#6ee7b7', glow: 'rgba(52,211,153,0.18)', particle: 'rgba(52,211,153,0.4)', tracks: [{ title: 'Forest Sounds', artist: 'Nature FM', icon: '🌿', dur: 320 }, { title: 'Ocean Waves', artist: 'Sea FM', icon: '🌊', dur: 400 }], synthType: 'noise' },
  { id: 'peace', label: 'Peace', icon: '🕊️', bg: ['#0a1a1a', '#0f2525', '#1a3535'], accent: '#a5f3fc', accent2: '#22d3ee', glow: 'rgba(165,243,252,0.18)', particle: 'rgba(165,243,252,0.6)', tracks: [{ title: 'Morning Birds', artist: 'Nature', icon: '🕊️', dur: 300 }, { title: 'Zen Garden', artist: 'Peaceful', icon: '🧘', dur: 240 }], synthType: 'file', file: 'birds.mp3' },
];

function saveCustomVibes() {
  const customVibes = VIBES.filter(v => String(v.id).startsWith('custom-'));
  localStorage.setItem('doodledo_vibes', JSON.stringify(customVibes));
}

function loadCustomVibes() {
  try {
    const local = localStorage.getItem('doodledo_vibes');
    if (local) {
      const customVibes = JSON.parse(local);
      if (state) state.customVibes = customVibes;
      customVibes.forEach(cv => VIBES.push(cv));
    }
  } catch(e) {
    console.error('Failed to load custom vibes', e);
  }
}

loadCustomVibes();

export function addCustomVibe(vibe) {
  console.log('Adding custom vibe:', vibe);
  VIBES.push(vibe);
  saveCustomVibes();
  if (state) {
    state.customVibes = VIBES.filter(v => String(v.id).startsWith('custom-'));
    if (window.storage) window.storage.saveStats(state);
  }
  renderVibes();
}

export function deleteCustomVibe(idx, e) {
  if (e) e.stopPropagation();
  const v = VIBES[idx];
  if (!v || !v.id || !String(v.id).startsWith('custom-')) {
    toast("Cannot delete default vibes!");
    return;
  }
  VIBES.splice(idx, 1);
  saveCustomVibes();
  if (state) {
    state.customVibes = VIBES.filter(v => String(v.id).startsWith('custom-'));
    if (window.storage) window.storage.saveStats(state);
  }
  if (state.vibe >= idx) {
    state.vibe = Math.max(0, state.vibe - 1);
    setVibe(state.vibe);
  }
  renderVibes();
  toast(`${v.icon} Deleted custom vibe`);
}

let state;
const canvas = document.getElementById('vibe-canvas');
const ctx2 = canvas.getContext('2d');
let particles = [], animId;

export function init(sharedState) {
  state = sharedState;
  
  // Apply server vibes if loaded
  if (state.serverVibes && state.serverVibes.length > 0) {
    const existingIds = new Set(VIBES.map(v => v.id));
    state.serverVibes.forEach(cv => {
      if (!existingIds.has(cv.id)) {
        VIBES.push(cv);
      }
    });
    saveCustomVibes();
    state.customVibes = VIBES.filter(v => String(v.id).startsWith('custom-'));
  }
}

export function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// FIX 1: Reduce particle count for low-core devices
export function initParticles() {
  const v = VIBES[state.vibe];
  particles = [];
  let count = v.id === 'rainy' ? 120 : v.id === 'party' ? 80 : 50;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
    count = Math.floor(count * 0.5);
  }
  for (let i = 0; i < count; i++) {
    const isPeace = v.id === 'peace';
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: isPeace ? 1 + Math.random() * 2 : (v.id === 'rainy' ? -0.5 + Math.random() * -1 : (Math.random() - 0.5) * 0.4),
      vy: isPeace ? (Math.random() - 0.5) * 0.2 : (v.id === 'rainy' ? 2 + Math.random() * 3 : -0.3 - Math.random() * 0.5),
      size: v.id === 'rainy' ? 1 + Math.random() * 1.5 : (isPeace ? 2 + Math.random() * 2 : 1 + Math.random() * 2.5),
      alpha: 0.2 + Math.random() * 0.5,
      life: Math.random(),
      wing: Math.random() * Math.PI * 2
    });
  }
}

export function drawBg() {
  const v = VIBES[state.vibe];
  const [c1, c2, c3] = v.bg;
  const grad = ctx2.createRadialGradient(canvas.width * 0.35, canvas.height * 0.3, 0, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.9);
  grad.addColorStop(0, c3);
  grad.addColorStop(0.5, c2);
  grad.addColorStop(1, c1);
  ctx2.fillStyle = grad;
  ctx2.fillRect(0, 0, canvas.width, canvas.height);

  const grad2 = ctx2.createRadialGradient(canvas.width * 0.7, canvas.height * 0.7, 0, canvas.width * 0.7, canvas.height * 0.7, canvas.width * 0.5);
  grad2.addColorStop(0, v.glow);
  grad2.addColorStop(1, 'transparent');
  ctx2.fillStyle = grad2;
  ctx2.fillRect(0, 0, canvas.width, canvas.height);
}

// FIX 1: Throttle canvas animation on visibility change
export function animateCanvas() {
  if (document.visibilityState !== 'visible') return;
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  drawBg();
  const v = VIBES[state.vibe];
  const isRain = v.id === 'rainy';

  for (let p of particles) {
    p.x += p.vx; p.y += p.vy;
    p.life += 0.005;
    if (p.life > 1) p.life = 0;

    if (isRain) {
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      ctx2.save();
      ctx2.globalAlpha = p.alpha * 0.7;
      ctx2.strokeStyle = v.particle;
      ctx2.lineWidth = p.size * 0.5;
      ctx2.beginPath();
      ctx2.moveTo(p.x, p.y);
      ctx2.lineTo(p.x + p.vx * 4, p.y + p.vy * 4);
      ctx2.stroke();
      ctx2.restore();
    } else if (v.id === 'peace') {
      if (p.x > canvas.width) { p.x = -20; p.y = Math.random() * canvas.height; }
      p.wing += 0.15;
      const flap = Math.sin(p.wing) * 4;
      ctx2.save();
      ctx2.globalAlpha = p.alpha;
      ctx2.fillStyle = v.particle;
      ctx2.translate(p.x, p.y);
      // Simple bird shape (V shape)
      ctx2.beginPath();
      ctx2.moveTo(-p.size, flap);
      ctx2.lineTo(0, 0);
      ctx2.lineTo(p.size, flap);
      ctx2.stroke(); 
      ctx2.restore();
    } else {
      if (p.y < 0) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
      const pulse = Math.sin(p.life * Math.PI * 2) * 0.3 + 0.7;
      ctx2.save();
      ctx2.globalAlpha = p.alpha * pulse;
      ctx2.fillStyle = v.particle;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    }
  }
  animId = requestAnimationFrame(animateCanvas);
}

export function getAnimId() { return animId; }
export function setAnimId(id) { animId = id; }

// Import dependencies for setVibe
import { stopAudio, playAudio, updateTrackInfo } from './audio.js';
import { toast, esc } from './main.js';

export function setVibe(idx) {
  state.vibe = idx;
  const v = VIBES[idx];
  const r = document.documentElement;
  r.style.setProperty('--vibe-accent', v.accent);
  r.style.setProperty('--vibe-accent2', v.accent2);
  r.style.setProperty('--vibe-glow', v.glow);
  r.style.setProperty('--vibe-particle', v.particle);
  
  // FIX: Update background variables for UI elements
  if (v.bg && v.bg.length >= 2) {
    r.style.setProperty('--vibe-bg1', v.bg[0]);
    r.style.setProperty('--vibe-bg2', v.bg[1]);
  }

  document.querySelectorAll('.vibe-btn').forEach((b, i) => b.classList.toggle('active', i === idx));

  state.musicTrack = 0;
  updateTrackInfo();
  initParticles();
  if (state.musicPlaying) { stopAudio(); playAudio(); }
  toast(`${v.icon} ${v.label} vibe activated`);

  // Switch to Focus tab on mobile after selection
  if (window.innerWidth <= 768) {
    import('./main.js').then(m => {
      const focusBtn = document.querySelector('.m-tab[onclick*="focus"]');
      if (focusBtn) m.switchMobileTab('focus', focusBtn);
    });
  }
}

export function renderVibes() {
  const el = document.getElementById('vibe-list');
  el.innerHTML = VIBES.map((v, i) => {
    const isCustom = v.id && String(v.id).startsWith('custom-');
    return `
      <button class="vibe-btn ${i === state.vibe ? 'active' : ''}" onclick="setVibe(${i})" style="--vibe-accent: ${v.accent}">
        <span class="vibe-icon">${v.icon}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(v.label)}</span>
        <div class="vibe-accent-preview"></div>
        ${isCustom ? `<div class="vibe-delete-btn" title="Delete Vibe" onclick="deleteCustomVibe(${i}, event)">✕</div>` : ''}
      </button>
    `;
  }).join('');
}
