// FIX 2: Modularise Pomodoro logic
import { addLog, updateStats, toast, esc } from './main.js';
import { renderTasks } from './tasks.js';
import { saveData } from './storage.js';
import { setVibe, renderVibes } from './vibe.js';
import { playAudio, updateMusicUI } from './audio.js';

export const POMO_MODES = { focus: { label: 'Focus', sec: 25 * 60 }, short: { label: 'Short Break', sec: 5 * 60 }, long: { label: 'Long Break', sec: 15 * 60 } };

let state;

export function init(sharedState) {
  state = sharedState;
}

export function setPomoMode(mode, btn) {
  clearInterval(state.pomo.interval);
  state.pomo.running = false;
  state.pomo.mode = mode;
  state.pomo.remaining = POMO_MODES[mode].sec;
  document.querySelectorAll('.pomo-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('pomo-mode-lbl').textContent = POMO_MODES[mode].label;
  updatePomoDisplay();
  updatePomoRing(1);
  document.getElementById('play-main-btn').classList.remove('playing');
}

export function togglePomo() {
  // FIX 3: Request Notification permission on first start
  if (state.pomo.sessions === 0 && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  if (state.pomo.running) {
    clearInterval(state.pomo.interval);
    state.pomo.running = false;
    document.getElementById('play-main-btn').classList.remove('playing');
  } else {
    state.pomo.running = true;
    document.getElementById('play-main-btn').classList.add('playing');
    state.pomo.interval = setInterval(tickPomo, 1000);
    if (!state.musicPlaying) { state.musicPlaying = true; playAudio(); updateMusicUI(); }
  }
}

export function tickPomo() {
  if (state.pomo.remaining <= 0) {
    clearInterval(state.pomo.interval);
    state.pomo.running = false;
    onPomoComplete();
    return;
  }
  state.pomo.remaining--;
  updatePomoDisplay();
  updatePomoRing(state.pomo.remaining / POMO_MODES[state.pomo.mode].sec);
}

export function onPomoComplete() {
  document.getElementById('play-main-btn').classList.remove('playing');
  if (state.pomo.mode === 'focus') {
    // FIX 3: Browser Notification on completion
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🍅 Session complete!', { 
        body: 'Time for a break. +50 XP earned.', 
        icon: '' 
      });
    }

    state.pomo.sessions++;
    state.focusMinutes += 25;
    state.xp += 50;
    state.streak++;
    markPomoDot();
    const ti = state.pomo.focusTaskIdx;
    if (ti >= 0 && ti < state.tasks.length) {
      state.tasks[ti].donePomos = Math.min(state.tasks[ti].donePomos + 1, state.tasks[ti].pomos);
      addLog('🍅', `Completed: ${state.tasks[ti].text}`, '+50 XP');
    } else {
      addLog('🍅', 'Focus session complete!', '+50 XP');
    }
    updateStats();
    renderTasks();
    saveData();
    // toast('🎉 Session done! +50 XP earned');
    setTimeout(() => setPomoMode('short', document.querySelector('[data-m="short"]')), 1500);
    // Auto switch to chill vibe on break
    setTimeout(() => { if (state.vibe !== 2) { setVibe(2); renderVibes(); } }, 2000);
  } else {
    // toast('Break over — back to focus! 💪');
    setTimeout(() => setPomoMode('focus', document.querySelector('[data-m="focus"]')), 1200);
  }
}

export function resetPomo() {
  clearInterval(state.pomo.interval);
  state.pomo.running = false;
  state.pomo.remaining = POMO_MODES[state.pomo.mode].sec;
  document.getElementById('play-main-btn').classList.remove('playing');
  updatePomoDisplay();
  updatePomoRing(1);
}

export function skipPomo() { clearInterval(state.pomo.interval); state.pomo.running = false; onPomoComplete(); }

export function updatePomoDisplay() {
  const m = Math.floor(state.pomo.remaining / 60).toString().padStart(2, '0');
  const s = (state.pomo.remaining % 60).toString().padStart(2, '0');
  document.getElementById('pomo-display').textContent = `${m}:${s}`;
}

export function updatePomoRing(ratio) {
  const circ = 2 * Math.PI * 55;
  document.getElementById('pomo-prog').style.strokeDasharray = circ;
  document.getElementById('pomo-prog').style.strokeDashoffset = circ * (1 - ratio);
}

export function markPomoDot() {
  const dots = document.querySelectorAll('#pomo-dots .pomo-dot');
  const idx = (state.pomo.sessions - 1) % 4;
  dots.forEach((d, i) => d.classList.toggle('done', i <= idx));
  if (state.pomo.sessions % 4 === 0) setTimeout(() => dots.forEach(d => d.classList.remove('done')), 800);
}

export function setFocusTask(idx) {
  state.tasks.forEach((t, i) => t.focused = i === idx);
  state.pomo.focusTaskIdx = idx;
  const t = state.tasks[idx];
  const display = document.getElementById('focus-task-display');
  display.innerHTML = `<span>${esc(t.text)}</span><div class="task-meta" style="margin-top:5px"><span class="task-tag">${t.tag}</span><span class="task-est" style="font-size:9px;color:var(--text3)">🍅 ${t.donePomos}/${t.pomos}</span></div>`;
  display.classList.add('has-task');
  const fp = document.getElementById('focus-progress');
  fp.style.display = 'block';
  updateFocusProgress();
  renderTasks();
  // toast(`🎯 Focusing on: ${t.text.substring(0,30)}…`);
}

export function updateFocusProgress() {
  const ti = state.pomo.focusTaskIdx;
  if (ti < 0) return;
  const t = state.tasks[ti];
  const pct = t.pomos > 0 ? Math.round((t.donePomos / t.pomos) * 100) : 0;
  document.getElementById('fp-done-lbl').textContent = `${t.donePomos} / ${t.pomos} sessions`;
  document.getElementById('fp-pct').textContent = pct + '%';
  document.getElementById('fp-fill').style.width = pct + '%';
}

export function openTaskSelector() {
  const activeTasks = state.tasks.filter(t => !t.done);
  if (activeTasks.length === 0) {
    toast("No active tasks to focus on!");
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'vibe-overlay';
  overlay.style.pointerEvents = 'auto';
  overlay.style.background = 'rgba(0,0,0,0.8)';
  overlay.style.backdropFilter = 'blur(10px)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '2000';

  const modal = document.createElement('div');
  modal.className = 'calendar-wrap show';
  modal.style.flexDirection = 'column';
  modal.style.padding = '24px';
  modal.style.maxWidth = '400px';

  modal.innerHTML = `
    <div class="focusing-task" id="focus-task-display" onclick="openTaskSelector()">
      <span class="focusing-task-hint">← Click a task to focus</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 20px;">
      ${state.tasks.map((t, i) => !t.done ? `
        <button class="vibe-btn" onclick="confirmSelectTask(${i})">
          <span>${esc(t.text)}</span>
          <span style="font-size: 9px; opacity: 0.6; margin-left: auto;">${t.tag}</span>
        </button>
      ` : '').join('')}
    </div>
    <button class="select-done-btn" onclick="this.closest('.vibe-overlay').remove()">Cancel</button>
  `;

  window.confirmSelectTask = (idx) => {
    setFocusTask(idx);
    overlay.remove();
  };

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
