// FIX 2: Modularise storage logic
let state;

export function init(sharedState) {
  state = sharedState;
}

import { VIBES } from './vibe.js';

export function saveData() {
  const today = new Date().toISOString().split('T')[0];
  const data = {
    tasks: state.tasks,
    xp: state.xp,
    streak: state.streak,
    focusMinutes: state.focusMinutes,
    layoutMode: state.layoutMode,
    sessions: state.pomo.sessions,
    sessionLog: state.sessionLog,
    customVibes: VIBES.filter(v => v.id.startsWith('custom-')),
    quotes: state.quotes,
    lastActiveDate: today
  };
  localStorage.setItem('doodledo_vroom_data', JSON.stringify(data));
}

export function loadData() {
  const saved = localStorage.getItem('doodledo_vroom_data');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  if (saved) {
    try {
      const data = JSON.parse(saved);
      state.tasks = (data.tasks || []).map(t => ({
        id: t.id || 't-' + Math.random().toString(36).substr(2, 9),
        ...t,
        priority: t.priority || 'medium',
        dueDate: t.dueDate || null
      }));
      state.xp = data.xp || 0;
      state.streak = data.streak || 0;
      state.focusMinutes = data.focusMinutes || 0;
      state.pomo.sessions = data.sessions || 0;
      state.sessionLog = data.sessionLog || [];
      state.layoutMode = data.layoutMode || 'plan';
      state.lastActiveDate = data.lastActiveDate || null;
      state.quotes = data.quotes || null; // Will be initialized if null in main.js
  
      // FIX 9: Streak Logic
      if (state.lastActiveDate) {
        const lastDate = new Date(state.lastActiveDate);
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (state.lastActiveDate !== todayStr) {
          if (diffDays > 1) {
            state.streak = 0; // Lost streak
          }
        }
      }
  
      if (data.customVibes) {
        data.customVibes.forEach(cv => {
          if (!VIBES.find(v => v.id === cv.id)) VIBES.push(cv);
        });
      }
    } catch (e) {
      console.error("Error parsing saved data:", e);
      // Fallback to defaults
      state.tasks = [
        { id: 't1', text: 'Read Chapter 5 — Data Structures', tag: 'Study', priority: 'high', dueDate: new Date().toISOString().split('T')[0], pomos: 3, donePomos: 1, done: false, focused: false, schedHour: 9 },
        { id: 't2', text: 'Solve 10 LeetCode problems', tag: 'Code', priority: 'medium', dueDate: null, pomos: 4, donePomos: 0, done: false, focused: false, schedHour: 11 },
        { id: 't3', text: 'Review flashcards (30 min)', tag: 'Study', priority: 'low', dueDate: null, pomos: 2, donePomos: 2, done: false, focused: false, schedHour: 13 },
      ];
    }
  } else {
    // Default tasks if none exist
    state.tasks = [
      { id: 't1', text: 'Read Chapter 5 — Data Structures', tag: 'Study', priority: 'high', dueDate: new Date().toISOString().split('T')[0], pomos: 3, donePomos: 1, done: false, focused: false, schedHour: 9 },
      { id: 't2', text: 'Solve 10 LeetCode problems', tag: 'Code', priority: 'medium', dueDate: null, pomos: 4, donePomos: 0, done: false, focused: false, schedHour: 11 },
      { id: 't3', text: 'Review flashcards (30 min)', tag: 'Study', priority: 'low', dueDate: null, pomos: 2, donePomos: 2, done: false, focused: false, schedHour: 13 },
    ];
  }
}
