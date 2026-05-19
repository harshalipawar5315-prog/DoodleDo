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
    const res = await fetch(`${API}/api/tasks`, { headers: authHeaders() });
    if (res.ok) {
      const tasks = await res.json();
      state.tasks = tasks.map(t => ({
        id: t._id,
        text: t.text,
        tag: t.tag || 'Study',
        priority: t.priority,
        done: t.completed,
        dueDate: t.dueDate,
        pomos: t.pomos || 2,
        donePomos: t.donePomos || 0,
        focused: false,
        schedHour: null
      }));
    }
    const statsRes = await fetch(`${API}/api/stats`, { headers: authHeaders() });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      state.xp = stats.xp || 0;
      state.streak = stats.streak || 0;
      state.lastActiveDate = stats.lastActiveDate || null;
    }
  } catch (err) {
    console.error('loadData failed:', err);
  }
}

export async function saveTask(task) {
  try {
    const res = await fetch(`${API}/api/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        text: task.text,
        priority: task.priority,
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
    await fetch(`${API}/api/stats`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        xp: state.xp || 0,
        streak: state.streak || 0,
        lastActiveDate: state.lastActiveDate || null
      })
    });
  } catch (err) {
    console.error('saveStats failed:', err);
  }
}