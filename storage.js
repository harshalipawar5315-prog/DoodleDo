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

const storage = {
  // Load all data from MongoDB into state
  async loadData() {
    try {
      // Load tasks
      const res = await fetch(`${API}/api/tasks`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const tasks = await res.json();
        state.tasks = tasks.map(t => ({
          id: t._id,
          text: t.text,
          priority: t.priority,
          done: t.completed,
          date: t.dueDate
        }));
      }

      // Load stats
      const statsRes = await fetch(`${API}/api/stats`, {
        headers: authHeaders()
      });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        state.xp = stats.xp || 0;
        state.streak = stats.streak || 0;
        state.lastActiveDate = stats.lastActiveDate || null;
      }
    } catch (err) {
      console.error('loadData failed:', err);
    }
  },

  // Save a new task to MongoDB
  async saveTask(task) {
    try {
      const res = await fetch(`${API}/api/tasks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          text: task.text,
          priority: task.priority,
          dueDate: task.date,
          completed: task.done || false
        })
      });
      const saved = await res.json();
      return saved._id; // return MongoDB id
    } catch (err) {
      console.error('saveTask failed:', err);
    }
  },

  // Update a task in MongoDB
  async updateTask(id, updates) {
    try {
      await fetch(`${API}/api/tasks/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('updateTask failed:', err);
    }
  },

  // Delete a task from MongoDB
  async deleteTask(id) {
    try {
      await fetch(`${API}/api/tasks/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
    } catch (err) {
      console.error('deleteTask failed:', err);
    }
  },

  // Save stats to MongoDB
  async saveStats() {
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
};