// FIX 2: Modularise main logic (Entry Point)
/* 
  NOTE: This app uses ES Modules. To run it locally, you must use a local server (localhost)
  due to browser security restrictions on the file:// protocol for modules.
*/

import * as storage from './storage.js';
import * as audio from './audio.js';
import * as vibe from './vibe.js';
import * as pomo from './pomo.js';
import * as tasks from './tasks.js';

const DEFAULT_QUOTES = [
  { text: 'The focus you have today will build the life you want tomorrow.', author: '— Study Wisdom' },
  { text: 'Small steps every day lead to big changes every year.', author: '— DoodleDo' },
  { text: 'A goal without a plan is just a wish.', author: '— Antoine de Saint-Exupéry' },
  { text: 'Your future self will thank you for what you do today.', author: '— Study Wisdom' },
  { text: 'Deep work is the superpower of the 21st century.', author: '— Cal Newport' },
  { text: 'It\'s not about having time. It\'s about making time.', author: '— Unknown' },
];

export let state = {
  vibe: 0,
  musicPlaying: false,
  layoutMode: 'plan',
  musicTrack: 0,
  musicProgress: 0,
  musicInterval: null,
  pomo: { mode: 'focus', running: false, remaining: 25 * 60, interval: null, sessions: 0, focusTaskIdx: -1 },
  tasks: [],
  filter: 'all',
  activePanel: 'tasks',
  sessionLog: [],
  xp: 0,
  streak: 0,
  tasksDone: 0,
  focusMinutes: 0,
  schedDayOffset: 0,
  quoteIdx: 0,
  liked: false,
  audioCtx: null,
  gainNode: null,
  oscNodes: [],
  dim: false,
  lastActiveDate: null,
  selectedDate: new Date().toISOString().split('T')[0],
  calendarOpen: false,
  quotes: [],
};

// Initialize modules with state
storage.init(state);
audio.init(state);
vibe.init(state);
pomo.init(state);
tasks.init(state);

// --- UTILS ---
// FIX 4: Robust text sanitization helper
export function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) {
    console.warn("Toast element missing:", msg);
    return;
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// --- CLOCK & QUOTES ---
export function updateClock() {
  const now = new Date();
  const m = now.getMinutes().toString().padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const hh = (now.getHours() % 12 || 12).toString().padStart(2, '0');
  document.getElementById('clock').textContent = `${hh}:${m} ${ampm}`;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  document.getElementById('clock-date').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
}

export function renderQuotes() {
  const dots = document.getElementById('quote-dots');
  dots.innerHTML = state.quotes.map((_, i) => `<div class="qdot ${i === state.quoteIdx ? 'active' : ''}" onclick="setQuote(${i})"></div>`).join('');
}

export function setQuote(idx) {
  state.quoteIdx = idx;
  const q = state.quotes[idx];
  if (!q) return;
  document.getElementById('quote-text').textContent = q.text;
  document.getElementById('quote-author').textContent = q.author;
  renderQuotes();
}

export function rotateQuote() {
  if (state.quotes.length === 0) return;
  setQuote((state.quoteIdx + 1) % state.quotes.length);
}

// --- LOG, STATS, XP ---
export function addLog(icon, title, xp) {
  const now = new Date();
  const h = (now.getHours() % 12 || 12).toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  state.sessionLog.unshift({ icon, title, xp, time: `${h}:${m} ${ampm}` });
  renderLog();
  updateXP();
}

export function renderLog() {
  const list = document.getElementById('log-list');
  if (!state.sessionLog.length) { list.innerHTML = '<div class="log-empty">No sessions yet.<br>Start your first Pomodoro! 🍅</div>'; return; }
  list.innerHTML = state.sessionLog.map(l => `
    <div class="log-item">
      <div class="log-icon">${l.icon}</div>
      <div class="log-body">
        <div class="log-title">${esc(l.title)}</div>
        <div class="log-time">${l.time}</div>
      </div>
      <div class="log-xp">${l.xp}</div>
    </div>`).join('');
}

export function updateStats() {
  document.getElementById('s-sessions').textContent = state.pomo.sessions;
  document.getElementById('s-tasks').textContent = state.tasksDone;
  document.getElementById('s-focus').textContent = state.focusMinutes + 'm';
}

export function updateXP() {
  document.getElementById('xp-total').textContent = state.xp;
  document.getElementById('streak-count').textContent = state.streak;
}

// --- UI GLUE ---
export function showPanel(id, btn) {
  state.activePanel = id;
  ['tasks', 'schedule', 'log'].forEach(p => {
    document.getElementById('panel-' + p).style.display = p === id ? '' : 'none';
  });
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (id === 'schedule') tasks.renderSchedule();
  if (id === 'log') renderLog();
}

export function toggleHeart() {
  state.liked = !state.liked;
  document.getElementById('heart-btn').textContent = state.liked ? '♥' : '♡';
  document.getElementById('heart-btn').classList.toggle('liked', state.liked);
}

export function toggleDim() {
  state.dim = !state.dim;
  document.getElementById('vibe-overlay').style.background = state.dim ? 'rgba(0,0,0,0.35)' : 'transparent';
}

export function toggleLayoutMode() {
  const app = document.getElementById('app');
  const btn = document.getElementById('mode-toggle');
  const text = btn.querySelector('.mode-text');
  const icon = btn.querySelector('.mode-icon');

  if (state.layoutMode === 'plan') {
    state.layoutMode = 'focus';
    app.classList.remove('plan-mode');
    app.classList.add('focus-mode');
    btn.classList.add('active');
    text.textContent = 'Focus Mode';
    icon.textContent = '🧘';
  } else {
    state.layoutMode = 'plan';
    app.classList.remove('focus-mode');
    app.classList.add('plan-mode');
    btn.classList.remove('active');
    text.textContent = 'Plan Mode';
    icon.textContent = '🎯';
  }
  storage.saveData();
}

export function toggleQueue() {
  const panel = document.getElementById('queue-panel');
  panel.classList.toggle('show');
  if (panel.classList.contains('show')) renderQueue();
}

export function renderQueue() {
  const v = vibe.VIBES[state.vibe];
  const list = document.getElementById('queue-list');
  list.innerHTML = v.tracks.map((t, i) => `
    <div class="q-item ${i === state.musicTrack ? 'active' : ''}" onclick="setMusicTrack(${i})">
      <div class="q-icon">${t.icon}</div>
      <div class="q-info">
        <div class="q-title">${esc(t.title)}</div>
        <div class="q-artist">${esc(t.artist)}</div>
      </div>
    </div>
  `).join('');
}

export function setMusicTrack(idx) {
  state.musicTrack = idx;
  if (state.musicPlaying) audio.playAudio();
  audio.updateMusicUI();
  renderQueue();
  document.getElementById('queue-panel').classList.remove('show');
}

export function switchMobileTab(id, btn) {
  const app = document.getElementById('app');
  app.classList.remove('m-show-vibes', 'm-show-focus', 'm-show-plan');
  app.classList.add('m-show-' + id);
  document.querySelectorAll('.m-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// --- GLOBAL ATTACHMENTS (for HTML onclick) ---
window.setVibe = vibe.setVibe;
window.togglePomo = pomo.togglePomo;
window.setPomoMode = pomo.setPomoMode;
window.resetPomo = pomo.resetPomo;
window.skipPomo = pomo.skipPomo;
window.toggleLayoutMode = toggleLayoutMode;
window.toggleDim = toggleDim;
window.toggleMusicPlay = audio.toggleMusicPlay;
window.showPanel = showPanel;
window.addTask = tasks.addTask;
window.setFilter = tasks.setFilter;
window.changeDay = tasks.changeDay;
window.switchMobileTab = switchMobileTab;
window.toggleHeart = toggleHeart;
window.prevMusicTrack = audio.prevMusicTrack;
window.nextMusicTrack = audio.nextMusicTrack;
window.seekMusic = audio.seekMusic;
window.setVolume = audio.setVolume;
window.toggleQueue = toggleQueue;
window.setMusicTrack = setMusicTrack;
window.toggleTask = tasks.toggleTask;
window.deleteTask = tasks.deleteTask;
window.setFocusTask = pomo.setFocusTask;
window.setQuote = setQuote;
window.rotateQuote = rotateQuote;
window.openQuoteManager = openQuoteManager;
window.deleteQuote = deleteQuote;
window.openCreateVibeModal = openCreateVibeModal;
window.deleteCustomVibe = vibe.deleteCustomVibe;
window.toggleCalendar = tasks.toggleCalendar;
window.selectDate = tasks.selectDate;
window.changeMonth = tasks.changeMonth;
window.togglePriorityMenu = togglePriorityMenu;
window.setPriority = setPriority;
window.toggleFullscreen = toggleFullscreen;

export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      toast(`Error entering fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('fullscreen-toggle');
  if (btn) {
    btn.textContent = document.fullscreenElement ? '⤢' : '⛶';
    btn.classList.toggle('active', !!document.fullscreenElement);
  }
});

export function togglePriorityMenu() {
  document.getElementById('prio-options').classList.toggle('select-hide');
}

export function setPriority(val) {
  const hiddenInput = document.getElementById('task-priority');
  const selectedDiv = document.getElementById('prio-selected');
  hiddenInput.value = val;
  selectedDiv.textContent = val.charAt(0).toUpperCase() + val.slice(1);
  // togglePriorityMenu(); // The user wants a "Done" button to close it, so we don't close it here.
}

// --- CREATE VIBE MODAL ---
export function openCreateVibeModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
    backdrop-filter: blur(15px); z-index: 3000;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  `;

  const content = document.createElement('div');
  content.className = 'pomo-card';
  content.style.cssText = `
    width: 100%; max-width: 420px; 
    border: 1px solid var(--vibe-accent);
    box-shadow: 0 0 40px rgba(0,0,0,0.5), 0 0 20px var(--vibe-glow);
  `;
  content.innerHTML = `
    <h3 style="margin-bottom:24px; text-align:center; font-family:'Outfit', sans-serif; font-size:20px;">Create Your Vibe</h3>
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div>
        <label style="font-size:10px; color:var(--text3); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px; display:block;">Vibe Name</label>
        <input type="text" id="cv-label" placeholder="e.g. Cyberpunk" class="task-inp" style="width:100%">
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
        <div>
          <label style="font-size:10px; color:var(--text3); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px; display:block;">Icon</label>
          <input type="text" id="cv-icon" placeholder="🌌" class="task-inp" style="width:100%">
        </div>
        <div>
          <label style="font-size:10px; color:var(--text3); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px; display:block;">Accent</label>
          <input type="color" id="cv-color" value="#6b8cff" style="border:none; background:none; cursor:pointer; width:100%; height:38px;">
        </div>
      </div>
      <div>
        <label style="font-size:10px; color:var(--text3); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px; display:block;">Sound Engine</label>
        <select id="cv-synth" class="task-inp" style="width:100%; background-color: var(--glass); color: var(--text);">
          <option value="ambient">Ambient (Soft)</option>
          <option value="lofi">Lofi (Warm)</option>
          <option value="rain">Rain (Focus)</option>
          <option value="deep">Deep (Bass)</option>
          <option value="jazz">Jazz (Smooth)</option>
          <option value="party">Party (Energy)</option>
          <option value="noise">Noise (White)</option>
        </select>
      </div>
      <button id="cv-save" class="tadd" style="width:100%; padding:14px; font-size:14px; margin-top:10px; background:var(--vibe-accent); color:var(--vibe-bg1); border:none; font-weight:700; border-radius:12px;">Create My Vibe</button>
      <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none; border:none; color:var(--text3); font-size:12px; cursor:pointer; margin-top:4px;">Maybe later</button>
    </div>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  document.getElementById('cv-save').onclick = () => {
    const label = document.getElementById('cv-label').value.trim();
    const icon = document.getElementById('cv-icon').value.trim() || '✨';
    const color = document.getElementById('cv-color').value;
    const synth = document.getElementById('cv-synth').value;

    if (label) {
      const newVibe = {
        id: 'custom-' + Date.now(),
        label: label,
        icon: icon,
        bg: [shadeColor(color, -80), shadeColor(color, -40), shadeColor(color, -20)],
        accent: color,
        accent2: shadeColor(color, 40),
        glow: color + '2e', 
        particle: color + '66',
        synthType: synth,
        tracks: [{ title: label + ' Session', artist: 'Custom Vibe', icon: icon, dur: 200 }]
      };
      vibe.addCustomVibe(newVibe);
      overlay.remove();
      toast(`✨ ${label} vibe created!`);
    }
  };
}

function shadeColor(color, percent) {
  let R = parseInt(color.substring(1,3),16);
  let G = parseInt(color.substring(3,5),16);
  let B = parseInt(color.substring(5,7),16);
  R = Math.floor(R * (100 + percent) / 100);
  G = Math.floor(G * (100 + percent) / 100);
  B = Math.floor(B * (100 + percent) / 100);
  R = (R<255)?R:255; R = (R<0)?0:R;
  G = (G<255)?G:255; G = (G<0)?0:G;
  B = (B<255)?B:255; B = (B<0)?0:B;
  const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
  const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
  const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
  return "#"+RR+GG+BB;
}

// --- QUOTE MANAGER ---
export function openQuoteManager() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
    backdrop-filter: blur(15px); z-index: 3000;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  `;

  const content = document.createElement('div');
  content.className = 'pomo-card';
  content.style.cssText = `
    width: 100%; max-width: 480px; 
    border: 1px solid var(--vibe-accent);
    box-shadow: 0 0 40px rgba(0,0,0,0.5), 0 0 20px var(--vibe-glow);
    max-height: 85vh; display: flex; flex-direction: column;
  `;
  
  content.innerHTML = `
    <h3 style="margin-bottom:20px; text-align:center; font-family:'Outfit', sans-serif; font-size:20px;">Manage Your Quotes</h3>
    
    <div style="flex:1; overflow-y:auto; margin-bottom:20px; padding-right:10px;" id="qm-list"></div>

    <div style="padding-top:16px; border-top:1px solid var(--border2);">
      <div style="font-size:10px; color:var(--text3); text-transform:uppercase; margin-bottom:12px; letter-spacing:0.1em;">Add New Quote</div>
      <textarea id="qm-new-text" placeholder="Your inspiring quote..." class="task-inp" style="width:100%; min-height:60px; margin-bottom:10px; resize:none;"></textarea>
      <input type="text" id="qm-new-author" placeholder="Author name" class="task-inp" style="width:100%; margin-bottom:14px;">
      <button id="qm-save" class="tadd" style="width:100%; padding:12px; font-weight:700;">Add Quote</button>
      <button onclick="this.parentElement.parentElement.parentElement.remove()" style="width:100%; background:none; border:none; color:var(--text3); font-size:12px; cursor:pointer; margin-top:12px;">Close</button>
    </div>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const renderQMList = () => {
    const list = document.getElementById('qm-list');
    list.innerHTML = state.quotes.map((q, i) => `
      <div style="display:flex; gap:12px; align-items:center; background:var(--glass); padding:10px; border-radius:10px; margin-bottom:8px; border:1px solid var(--border);">
        <div style="flex:1; min-width:0;">
          <div style="font-size:12px; font-style:italic; line-height:1.4; color:var(--text);">"${esc(q.text)}"</div>
          <div style="font-size:10px; color:var(--text3); margin-top:4px;">${esc(q.author)}</div>
        </div>
      </div>
    `).join('');
  };

  renderQMList();

  document.getElementById('qm-save').onclick = () => {
    const text = document.getElementById('qm-new-text').value.trim();
    const author = document.getElementById('qm-new-author').value.trim() || '— Unknown';
    if (text) {
      state.quotes.push({ text, author });
      document.getElementById('qm-new-text').value = '';
      document.getElementById('qm-new-author').value = '';
      renderQMList();
      renderQuotes();
      storage.saveData();
      toast("✨ Quote added!");
    }
  };
}

export function deleteQuote(idx) {
  state.quotes.splice(idx, 1);
  if (state.quotes.length === 0) {
    state.quotes = [...DEFAULT_QUOTES];
  }
  if (state.quoteIdx >= state.quotes.length) state.quoteIdx = 0;
  renderQuotes();
  setQuote(state.quoteIdx);
  storage.saveData();
}

// --- INIT ---
(function init() {
  checkAuth();
  storage.loadData();
  // Ensure all default quotes are present (Restore deleted ones)
  if (!state.quotes) state.quotes = [];
  DEFAULT_QUOTES.forEach(dq => {
    if (!state.quotes.find(q => q.text === dq.text)) {
      state.quotes.push(dq);
    }
  });
  
  vibe.resizeCanvas();
  window.addEventListener('resize', () => { vibe.resizeCanvas(); vibe.initParticles(); });
  vibe.initParticles();
  cancelAnimationFrame(vibe.getAnimId());
  vibe.animateCanvas();

  vibe.renderVibes();
  vibe.setVibe(0);
  renderQuotes();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(rotateQuote, 18000);

  pomo.updatePomoDisplay();
  pomo.updatePomoRing(1);

  state.tasksDone = state.tasks.filter(t => t.done).length;
  tasks.renderTasks();
  updateStats();

  const taskInp = document.getElementById('task-input');
  if (taskInp) {
    taskInp.addEventListener('keypress', (e) => { if (e.key === 'Enter') tasks.addTask(); });
  }
  updateXP();
  audio.updateTrackInfo();

  const circ = 2 * Math.PI * 55;
  document.getElementById('pomo-prog').style.strokeDasharray = circ;
  document.getElementById('pomo-prog').style.strokeDashoffset = 0;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      cancelAnimationFrame(vibe.getAnimId());
      vibe.animateCanvas();
    } else {
      cancelAnimationFrame(vibe.getAnimId());
    }
  });
})();

 // Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('✅ Service Worker registered'))
      .catch((err) => console.log('❌ SW failed:', err));
  });
}

window.addEventListener('click', (e) => {
  const prioOptions = document.getElementById('prio-options');
  const prioCustom = document.getElementById('priority-custom');
  if (prioOptions && !prioOptions.classList.contains('select-hide')) {
    if (prioCustom && !prioCustom.contains(e.target)) {
      prioOptions.classList.add('select-hide');
    }
  }

  const queuePanel = document.getElementById('queue-panel');
  const queueBtn = document.querySelector('.queue-btn');
  if (queuePanel && queuePanel.classList.contains('show')) {
    if (!queuePanel.contains(e.target) && !queueBtn.contains(e.target)) {
      queuePanel.classList.remove('show');
    }
  }
});

window.addEventListener('load', () => {
  const app = document.getElementById('app');
  app.classList.add('m-show-focus');
  if (state.layoutMode === 'focus') {
    state.layoutMode = 'plan';
    toggleLayoutMode();
  } else {
    app.classList.add('plan-mode');
  }
});
