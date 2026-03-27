const USER_KEY = 'acadplanner_users';
const SESSION_KEY = 'acadplanner_current_user';
const EVENT_KEY = 'acadplanner_events';

const showNotification = (msg) => {
  const n = document.getElementById('notification');
  n.textContent = msg; n.style.display = 'block';
  clearTimeout(window._notifyTimer);
  window._notifyTimer = setTimeout(() => { n.style.display='none'; }, 2500);
};

const safeParse = (raw, fallback) => {
  try { const parsed = JSON.parse(raw); return parsed || fallback; } catch { return fallback; }
};

const loadUsers = () => {
  const raw = localStorage.getItem(USER_KEY);
  const parsed = safeParse(raw, []);
  if (!Array.isArray(parsed)) { localStorage.removeItem(USER_KEY); return []; }
  return parsed;
};
const saveUsers = (users) => localStorage.setItem(USER_KEY, JSON.stringify(users));
const getCurrentUser = () => {
  const raw = localStorage.getItem(SESSION_KEY);
  const user = safeParse(raw, null);
  if (user && user.email && user.name) return user; 
  localStorage.removeItem(SESSION_KEY);
  return null;
};
const setCurrentUser = (u) => { if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u)); else localStorage.removeItem(SESSION_KEY); };

const loadEvents = () => {
  const raw = localStorage.getItem(EVENT_KEY);
  const parsed = safeParse(raw, []);
  if (!Array.isArray(parsed)) { localStorage.removeItem(EVENT_KEY); return []; }
  return parsed;
};
const saveEvents = (events) => localStorage.setItem(EVENT_KEY, JSON.stringify(events));
const fixClass = (name) => name.toLowerCase().replace(/\s+/g, '-');

const setVisibleSection = (section) => {
  document.getElementById('authSection').style.display = section==='auth' ? 'block' : 'none';
  document.getElementById('registerSection').style.display = section==='register' ? 'block' : 'none';
  document.getElementById('plannerSection').style.display = section==='planner' ? 'block' : 'none';
};

const renderEvents = () => {
  const list = document.getElementById('eventList'); list.innerHTML = '';
  const events = loadEvents().sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
  if (!events.length) { list.innerHTML = '<tr><td colspan="6" style="color:#94a3b8; text-align:center;">No events yet</td></tr>'; return; }
  events.forEach((e, idx) => {
    const row = document.createElement('tr'); row.innerHTML = `
      <td>${e.title}</td>
      <td>${e.date}</td>
      <td>${e.time || '—'}</td>
      <td><span class="badge badge-${fixClass(e.type)}">${e.type}</span></td>
      <td><span class="badge badge-${fixClass(e.priority)}">${e.priority}</span></td>
      <td class="actions"><button class="edit" data-index="${idx}">Edit</button><button class="delete" data-index="${idx}">Delete</button></td>`;
    list.appendChild(row);
  });
};

document.getElementById('showRegister').addEventListener('click', () => setVisibleSection('register'));
document.getElementById('showLogin').addEventListener('click', () => setVisibleSection('auth'));

document.getElementById('loginForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showNotification('Email and password are required'); return; }
  const users = loadUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) { showNotification('Invalid login'); return; }
  setCurrentUser(user);
  document.getElementById('userGreeting').textContent = `Welcome, ${user.name}`;
  setVisibleSection('planner');
  showNotification('Logged in successfully');
  renderEvents();
});

document.getElementById('registerForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim().toLowerCase();
  const password = document.getElementById('registerPassword').value;
  if (!name || !email || !password) { showNotification('All fields are required'); return; }
  if (password.length < 6) { showNotification('Password must be at least 6 characters'); return; }
  const users = loadUsers();
  if (users.some(u => u.email === email)) { showNotification('Email already registered'); return; }
  const newUser = { name, email, password };
  users.push(newUser); saveUsers(users);
  setCurrentUser(newUser);
  document.getElementById('userGreeting').textContent = `Welcome, ${name}`;
  setVisibleSection('planner');
  showNotification('Registration successful');
  renderEvents();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  setCurrentUser(null); setVisibleSection('auth');
  showNotification('Logged out');
});

document.getElementById('eventForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const type = document.getElementById('type').value;
  const priority = document.getElementById('priority').value;
  if (!title || !date) { showNotification('Please fill Title and Date'); return; }
  const events = loadEvents();
  events.push({ title, date, time, type, priority, id: crypto.randomUUID() });
  saveEvents(events);
  showNotification('Event added');
  document.getElementById('eventForm').reset();
  renderEvents();
});

document.getElementById('eventList').addEventListener('click', (ev) => {
  const btn = ev.target.closest('button'); if (!btn) return;
  const events = loadEvents();
  const index = Number(btn.dataset.index);
  if (btn.classList.contains('delete')) {
    events.splice(index, 1); saveEvents(events); renderEvents(); showNotification('Event deleted');
  }
  if (btn.classList.contains('edit')) {
    const e = events[index]; if (!e) return;
    document.getElementById('title').value = e.title;
    document.getElementById('date').value = e.date;
    document.getElementById('time').value = e.time;
    document.getElementById('type').value = e.type;
    document.getElementById('priority').value = e.priority;
    events.splice(index, 1); saveEvents(events); renderEvents(); showNotification('Edit and resubmit the form');
  }
});

const user = getCurrentUser();
if (user) {
  document.getElementById('userGreeting').textContent = `Welcome, ${user.name}`;
  setVisibleSection('planner');
  renderEvents();
} else {
  setVisibleSection('auth');
}