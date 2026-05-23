const API = 'https://doodledo-backend.onrender.com';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

export async function loadData(state) {
  try {
    const localTasks = localStorage.getItem('doodledo_tasks');
    if (localTasks) {
      try { state.tasks = JSON.parse(localTasks); } catch (e) {}
    }
    
    const localStats = localStorage.getItem('doodledo_stats');
    if (localStats) {
      try {
        const stats = JSON.parse(localStats);
        state.xp = stats.xp || 0;
        state.streak = stats.streak || 0;
        state.lastActiveDate = stats.lastActiveDate || null;
      } catch (e) {}
    }

    const res = await fetch(`${API}/api/tasks`, { headers: authHeaders() });
    if (res.ok) {
      const tasks = await res.json();
      state.tasks = tasks.map(t => ({
        id: t._id,
        text: t.text,
        tag: t.tag || 'Study',
        priority: (t.priority || 'medium').toLowerCase(),
        done: t.completed,
        dueDate: t.dueDate,
        pomos: t.pomos || 2,
        donePomos: t.donePomos || 0,
        focused: false,
        schedHour: null
      }));
      localStorage.setItem('doodledo_tasks', JSON.stringify(state.tasks));
    }
      const statsRes = await fetch(`${API}/api/stats`, { headers: authHeaders() });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        state.xp = stats.xp || 0;
        state.streak = stats.streak || 0;
        state.lastActiveDate = stats.lastActiveDate || null;
        if (stats.quotes && stats.quotes.length > 0) state.serverQuotes = stats.quotes;
        if (stats.customVibes && stats.customVibes.length > 0) state.serverVibes = stats.customVibes;
        localStorage.setItem('doodledo_stats', JSON.stringify({
          xp: state.xp, streak: state.streak, lastActiveDate: state.lastActiveDate
        }));
      }
  } catch (err) {
    console.error('loadData fetch failed (offline fallback active):', err);
  }
}

export async function saveTask(task) {
  try {
    const res = await fetch(`${API}/api/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
  text: task.text,
  priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1), // capitalize
  dueDate: task.dueDate,
  completed: task.done || false
})
    });
    const saved = await res.json();
    return saved._id;
  } catch (err) {
    console.error('saveTask failed:', err);
  }
}

export async function updateTask(id, updates) {
  try {
    await fetch(`${API}/api/tasks/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(updates)
    });
  } catch (err) {
    console.error('updateTask failed:', err);
  }
}

export async function deleteTask(id) {
  try {
    await fetch(`${API}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
  } catch (err) {
    console.error('deleteTask failed:', err);
  }
}

export async function saveStats(state) {
  try {
    const customVibes = window.vibe ? window.vibe.VIBES.filter(v => String(v.id).startsWith('custom-')) : state.customVibes || [];
    
    await fetch(`${API}/api/stats`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        xp: state.xp || 0,
        streak: state.streak || 0,
        lastActiveDate: state.lastActiveDate || null,
        quotes: state.quotes || [],
        customVibes: customVibes
      })
    });
  } catch (err) {
    console.error('saveStats failed:', err);
  }
}