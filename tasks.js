// FIX 2: Modularise task and schedule logic
import { saveData } from './storage.js';
import { updateStats, addLog, esc } from './main.js';
import { setFocusTask } from './pomo.js';

export const TASK_TAGS = ['Study', 'Code', 'Read', 'Notes', 'Review', 'Other'];
export const SCHEDULE_HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM'];

let state;

export function init(sharedState) {
  state = sharedState;
}

export function addTask() {
  const inp = document.getElementById('task-input');
  const prioInp = document.getElementById('task-priority');
  const dateInp = document.getElementById('task-duedate');
  
  const text = inp.value.trim();
  if (!text) return;

  const newTask = {
    id: 't-' + Date.now(),
    text: text,
    tag: 'Study',
    priority: prioInp.value || 'medium',
    dueDate: dateInp.value || null,
    pomos: 2,
    donePomos: 0,
    done: false,
    focused: false,
    schedHour: null
  };

  state.tasks.unshift(newTask);
  inp.value = '';
  dateInp.value = '';
  prioInp.value = 'medium';
  renderTasks();
  saveData();
}

export function toggleTask(idx) {
  state.tasks[idx].done = !state.tasks[idx].done;
  state.tasksDone = state.tasks.filter(t => t.done).length;
  if (state.tasks[idx].done) { state.xp += 20; addLog('✅', `Done: ${state.tasks[idx].text}`, '+20 XP'); }
  updateStats();
  renderTasks();
  saveData();
}

export function deleteTask(idx) {
  if (state.pomo.focusTaskIdx === idx) {
    state.pomo.focusTaskIdx = -1;
    document.getElementById('focus-task-display').innerHTML = '<span class="focusing-task-hint">← Click a task to focus</span>';
    document.getElementById('focus-task-display').classList.remove('has-task');
    document.getElementById('focus-progress').style.display = 'none';
  }
  state.tasks.splice(idx, 1);
  renderTasks();
  saveData();
}

export function setFilter(f, btn) {
  state.filter = f;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

export function getFilteredTasks() {
  const prioMap = { high: 3, medium: 2, low: 1 };
  const today = new Date().toISOString().split('T')[0];

  let filtered = state.tasks.map((t, i) => ({ ...t, _i: i })).filter(t => {
    if (state.filter === 'active') return !t.done;
    if (state.filter === 'done') return t.done;
    if (state.filter === 'study') return t.tag === 'Study';
    if (state.filter === 'code') return t.tag === 'Code';
    if (state.filter === 'date') return t.dueDate === state.selectedDate;
    return true;
  });

  // Sort active tasks: overdue first, then by priority
  if (state.filter !== 'done') {
    filtered.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.done) return 0;

      const aOverdue = a.dueDate && a.dueDate <= today;
      const bOverdue = b.dueDate && b.dueDate <= today;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      return prioMap[b.priority] - prioMap[a.priority];
    });
  }

  return filtered;
}

export function renderTasks() {
  const tasks = getFilteredTasks();
  const container = document.getElementById('task-render');
  
  // FIX 10: Performance Check (Simple Virtual DOM / Memoization)
  const taskState = JSON.stringify(tasks.map(t => ({ id: t.id, done: t.done, text: t.text, focused: t.focused, donePomos: t.donePomos, pomos: t.pomos, priority: t.priority, dueDate: t.dueDate })));
  if (container.getAttribute('data-last-tasks') === taskState) return;
  container.setAttribute('data-last-tasks', taskState);

  const active = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

  let html = '';
  if (active.length) {
    html += `<div class="task-group-label">Active · ${active.length}</div><div class="task-list-wrap">`;
    active.forEach(t => { html += taskCardHTML(t); });
    html += `</div>`;
  }
  if (done.length) {
    html += `<div class="task-group-label" style="margin-top:16px">Completed · ${done.length}</div><div class="task-list-wrap">`;
    done.forEach(t => { html += taskCardHTML(t); });
    html += `</div>`;
  }
  if (!tasks.length) html = `<div style="text-align:center;padding:32px 0;color:var(--text3);font-size:12px">No tasks here.<br>Add one above! ✍️</div>`;
  
  container.innerHTML = html;
  
  // FIX 6: Initialize swipe gestures after render
  initSwipeGestures();
}

export function taskCardHTML(t) {
  const i = t._i;
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = t.dueDate && t.dueDate <= today && !t.done;

  const pomoHtml = Array.from({ length: t.pomos }, (_, pi) =>
    `<span class="pomo-pip ${pi < t.donePomos ? 'done-pip' : ''}">🍅</span>`
  ).join('');

  return `
    <div class="task-card-container">
      <div class="swipe-delete-bg">Delete ✕</div>
      <div class="task-card ${t.focused ? 'focused' : ''} ${t.done ? 'done-card' : ''}" data-idx="${i}">
        <div class="tchk ${t.done ? 'checked' : ''}" onclick="toggleTask(${i})"></div>
        <div class="task-body">
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="task-title">${esc(t.text)}</div>
            <span class="priority-badge priority-${t.priority}">${t.priority}</span>
          </div>
          <div class="task-meta">
            <span class="task-tag">${esc(t.tag)}</span>
            <div class="task-pomos">${pomoHtml}</div>
            <span class="task-est">${t.donePomos}/${t.pomos} done</span>
            ${t.dueDate ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">📅 ${t.dueDate}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          ${!t.done ? `<button class="tact focus-btn" onclick="setFocusTask(${i})" title="Focus on this">🎯</button>` : ''}
          <button class="tact" onclick="deleteTask(${i})" title="Delete">✕</button>
        </div>
      </div>
    </div>`;
}

// FIX 6: Swipe to delete implementation
function initSwipeGestures() {
  const cards = document.querySelectorAll('.task-card');
  cards.forEach(card => {
    let startX = 0;
    let currentX = 0;
    const threshold = 80;

    card.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      card.classList.add('swiping');
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      currentX = e.touches[0].clientX - startX;
      // Only allow swiping left
      if (currentX < 0) {
        card.style.transform = `translateX(${currentX}px)`;
      }
    }, { passive: true });

    card.addEventListener('touchend', () => {
      card.classList.remove('swiping');
      if (currentX < -threshold) {
        const idx = parseInt(card.getAttribute('data-idx'));
        card.classList.add('deleting');
        setTimeout(() => {
          deleteTask(idx);
        }, 300);
      } else {
        card.style.transform = '';
      }
      startX = 0;
      currentX = 0;
    });
  });
}

export function renderSchedule() {
  const now = new Date();
  const currentH = now.getHours();
  const offset = state.schedDayOffset;
  const d = new Date(); d.setDate(d.getDate() + offset);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  document.getElementById('sched-date-lbl').textContent =
    offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;

  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  const LABELS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM'];

  const tasksByHour = {};
  state.tasks.forEach((t, i) => { if (t.schedHour !== null) { if (!tasksByHour[t.schedHour]) tasksByHour[t.schedHour] = []; tasksByHour[t.schedHour].push({ ...t, _i: i }); } });

  let html = '';
  HOURS.forEach((h, li) => {
    const isCurrent = offset === 0 && h === currentH;
    const slotTasks = tasksByHour[h] || [];
    if (slotTasks.length) {
      html += `<div class="time-row">
        <div class="time-lbl">${LABELS[li]}</div>
        <div class="time-slot occupied ${isCurrent ? 'current-hour' : ''}">
          ${isCurrent ? '<div class="current-indicator"></div>' : ''}
          <div>
            ${slotTasks.map(t => `<div class="slot-title">${esc(t.text.substring(0, 28))}${t.text.length > 28 ? '…' : ''}</div><div class="slot-tag">🍅 ${t.pomos} sessions · ${esc(t.tag)}</div>`).join('')}
          </div>
        </div>
      </div>`;
    } else {
      html += `<div class="time-row">
        <div class="time-lbl">${LABELS[li]}</div>
        <div class="time-slot ${isCurrent ? 'current-hour' : ''}" onclick="assignTaskToHour(${h})">
          ${isCurrent ? '<div class="current-indicator"></div>' : ''}
          <span class="slot-content">+ add task</span>
        </div>
      </div>`;
    }
  });
  document.getElementById('time-blocks').innerHTML = html;
}

export function changeDay(dir) { state.schedDayOffset += dir; renderSchedule(); }

export function assignTaskToHour(h) {
  const availableTasks = state.tasks.filter(t => !t.done && t.schedHour === null);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.9);
    backdrop-filter: blur(15px); z-index: 2000;
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
    <h3 style="margin-bottom:24px; font-size:20px; color:var(--text); text-align:center; font-family:'Outfit', sans-serif;">
      Schedule: ${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}
    </h3>
    
    <div style="margin-bottom: 25px;">
      <div style="font-size: 11px; color: var(--vibe-accent); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Add New Task Here</div>
      <input type="text" id="quick-sched-input" placeholder="What's happening at ${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}?" 
             style="width: 100%; padding: 14px 18px; font-size: 15px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border2); color: #ffffff; outline: none; margin-bottom:12px;">
      
      <button id="quick-sched-save" style="width:100%; padding:12px; border-radius:12px; background:var(--vibe-accent); color:var(--vibe-bg1); font-weight:600; border:none; cursor:pointer; transition: transform 0.2s;">
        ✓ Save Task to ${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}
      </button>
    </div>

    ${availableTasks.length > 0 ? `
      <div style="margin-bottom: 10px; border-top: 1px solid var(--border2); padding-top: 15px;">
        <div style="font-size: 11px; color: var(--text3); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Or Select from List</div>
        <div style="max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
          ${availableTasks.map(t => `
            <button class="vibe-btn" style="text-align: left; padding: 12px; background: var(--glass);" onclick="confirmScheduleTask('${t.text.replace(/'/g, "\\'")}', ${h})">
              <span>${esc(t.text)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <button style="margin-top:10px; width:100%; background:transparent; border:none; color:var(--text3); font-size:12px; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">Cancel</button>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const input = content.querySelector('#quick-sched-input');
  const saveBtn = content.querySelector('#quick-sched-save');

  input.focus();

  const handleSave = () => {
    const val = input.value.trim();
    if (val) {
      const newTask = {
        text: val,
        tag: 'Other',
        pomos: 2,
        donePomos: 0,
        done: false,
        focused: false,
        schedHour: h
      };
      state.tasks.unshift(newTask);
      renderSchedule();
      if (typeof renderTasks === 'function') renderTasks();
      saveData();
      overlay.remove();
    }
  };

  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSave(); });
  saveBtn.addEventListener('click', handleSave);

  window.confirmScheduleTask = (taskText, hour) => {
    const task = state.tasks.find(t => t.text === taskText);
    if (task) {
      task.schedHour = hour;
      renderSchedule();
      saveData();
    }
    overlay.remove();
  };
}

// --- CALENDAR LOGIC ---
let calendarMonth = new Date();

export function toggleCalendar() {
  state.calendarOpen = !state.calendarOpen;
  const wrap = document.getElementById('calendar-wrap');
  const btn = document.querySelector('.calendar-toggle-btn');
  wrap.classList.toggle('show', state.calendarOpen);
  btn.textContent = state.calendarOpen ? '📅 Hide Calendar' : '📅 Show Calendar';
  if (state.calendarOpen) renderCalendar();
}

export function renderCalendar() {
  const wrap = document.getElementById('calendar-wrap');
  if (!wrap) return;

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Calendar Section
  let calHtml = `
    <div class="calendar-main">
      <div class="cal-header">
        <button class="sched-nav" onclick="changeMonth(-1)">‹</button>
        <div class="cal-month">${monthNames[month]} ${year}</div>
        <button class="sched-nav" onclick="changeMonth(1)">›</button>
      </div>
      <div class="cal-grid">
        <div class="cal-day-lbl">Su</div><div class="cal-day-lbl">Mo</div><div class="cal-day-lbl">Tu</div>
        <div class="cal-day-lbl">We</div><div class="cal-day-lbl">Th</div><div class="cal-day-lbl">Fr</div><div class="cal-day-lbl">Sa</div>
  `;

  for (let i = 0; i < firstDay; i++) calHtml += `<div></div>`;

  const today = new Date().toISOString().split('T')[0];
  const tasksByDate = {};
  state.tasks.forEach(t => { if (t.dueDate) tasksByDate[t.dueDate] = true; });

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const isToday = dateStr === today;
    const isSelected = dateStr === state.selectedDate;
    const hasTask = tasksByDate[dateStr];
    calHtml += `<div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasTask ? 'has-task' : ''}" 
               onclick="selectDate('${dateStr}')">${d}</div>`;
  }

  calHtml += `
      </div>
      <div class="cal-footer">
        <button class="cal-done-btn" onclick="toggleCalendar()">Done</button>
      </div>
    </div>
  `;

  // Preview Section
  const dateTasks = state.tasks.filter(t => t.dueDate === state.selectedDate);
  let previewHtml = `
    <div class="calendar-preview">
      <div class="cal-preview-title">Tasks for ${state.selectedDate}</div>
  `;

  if (dateTasks.length === 0) {
    previewHtml += `<div class="cal-preview-empty">No tasks scheduled for this day.</div>`;
  } else {
    dateTasks.forEach(t => {
      previewHtml += `
        <div class="cal-preview-item">
          <div class="cal-preview-text">${esc(t.text)}</div>
          <div class="cal-preview-meta">
            <span class="priority-badge priority-${t.priority}">${t.priority}</span>
            · ${t.tag} · ${t.donePomos}/${t.pomos} pomos
          </div>
        </div>
      `;
    });
  }
  previewHtml += `</div>`;

  wrap.innerHTML = calHtml + previewHtml;
}

export function changeMonth(dir) {
  calendarMonth.setMonth(calendarMonth.getMonth() + dir);
  renderCalendar();
}

export function selectDate(date) {
  state.selectedDate = date;
  state.filter = 'date'; // Special filter for date
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  renderCalendar(); // Re-render to update the preview panel
  renderTasks();
}
