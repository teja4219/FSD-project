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

const getEventStatus = (event) => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  if (event.completed) return 'completed';
  if (event.date <= today) return 'completed';
  if (event.date === tomorrow || (event.date > today && event.date <= tomorrow)) return 'due-soon';
  return 'pending';
};

const getDaysUntil = (dateStr) => {
  const eventDate = new Date(dateStr).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  const diff = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
  return diff;
};

// AUTH
const setVisibleSection = (section) => {
  document.getElementById('authSection').style.display = section==='auth' ? 'block' : 'none';
  document.getElementById('registerSection').style.display = section==='register' ? 'block' : 'none';
  document.getElementById('plannerSection').style.display = section==='planner' ? 'block' : 'none';
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
  document.getElementById('userGreeting').textContent = `Welcome, ${user.name} 👋`;
  setVisibleSection('planner');
  showNotification('Logged in successfully');
  initPlanner();
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
  document.getElementById('userGreeting').textContent = `Welcome, ${name} 👋`;
  setVisibleSection('planner');
  showNotification('Registration successful');
  initPlanner();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  setCurrentUser(null); setVisibleSection('auth');
  showNotification('Logged out');
});

// EVENTS
const renderEvents = () => {
  const list = document.getElementById('eventList');
  list.innerHTML = '';
  
  let events = loadEvents();
  const search = document.getElementById('searchInput').value.toLowerCase();
  const typeFilter = document.getElementById('filterType').value;
  const statusFilter = document.getElementById('filterStatus').value;
  
  events = events.filter(e => 
    e.title.toLowerCase().includes(search) &&
    (!typeFilter || e.type === typeFilter) &&
    (!statusFilter || getEventStatus(e) === statusFilter)
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (!events.length) {
    list.innerHTML = '<tr><td colspan="7" style="color:#94a3b8; text-align:center; padding: 2rem;">No events found</td></tr>';
    return;
  }
  
  events.forEach((e, idx) => {
    const status = getEventStatus(e);
    const statusLabel = status === 'completed' ? '✓ Completed' : status === 'due-soon' ? '⚡ Due Soon' : '⏳ Pending';
    const statusClass = status === 'completed' ? 'status-completed' : status === 'due-soon' ? 'status-due-soon' : 'status-pending';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${e.title}</strong></td>
      <td>${e.date}</td>
      <td>${e.time || '—'}</td>
      <td><span class="badge badge-${fixClass(e.type)}">${e.type}</span></td>
      <td><span class="badge badge-${fixClass(e.priority)}">${e.priority}</span></td>
      <td><span class="badge ${statusClass}">${statusLabel}</span></td>
      <td class="actions">
        <button class="edit" data-index="${idx}" title="Edit">✏️</button>
        <button class="complete" data-index="${idx}" title="Mark Complete">${status === 'completed' ? '↩️' : '✓'}</button>
        <button class="delete" data-index="${idx}" title="Delete">🗑️</button>
      </td>`;
    list.appendChild(row);
  });
  
  // Update stats
  updateStats();
};

const updateStats = () => {
  const events = loadEvents();
  const total = events.length;
  const completed = events.filter(e => getEventStatus(e) === 'completed').length;
  const pending = events.filter(e => getEventStatus(e) === 'pending').length;
  const dueSoon = events.filter(e => getEventStatus(e) === 'due-soon').length;
  
  document.getElementById('totalEvents').textContent = total;
  document.getElementById('completedCount').textContent = completed;
  document.getElementById('pendingCount').textContent = pending;
  document.getElementById('dueSoonCount').textContent = dueSoon;
};

document.getElementById('eventForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const type = document.getElementById('type').value;
  const priority = document.getElementById('priority').value;
  
  if (!title || !date) { showNotification('Please fill Title and Date'); return; }
  
  const events = loadEvents();
  events.push({ title, date, time, type, priority, id: crypto.randomUUID(), completed: false });
  saveEvents(events);
  showNotification('Event added successfully');
  document.getElementById('eventForm').reset();
  renderEvents();
  renderCalendar();
  drawPerformanceChart();
});

document.getElementById('eventList').addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  
  const events = loadEvents();
  const index = Number(btn.dataset.index);
  const allEvents = loadEvents().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const search = document.getElementById('searchInput').value.toLowerCase();
  const typeFilter = document.getElementById('filterType').value;
  const statusFilter = document.getElementById('filterStatus').value;
  const filtered = allEvents.filter(e => 
    e.title.toLowerCase().includes(search) &&
    (!typeFilter || e.type === typeFilter) &&
    (!statusFilter || getEventStatus(e) === statusFilter)
  );
  const event = filtered[index];
  const eventIndex = events.findIndex(e => e.id === event.id);
  
  if (btn.classList.contains('delete')) {
    events.splice(eventIndex, 1);
    saveEvents(events);
    showNotification('Event deleted');
  } else if (btn.classList.contains('edit')) {
    document.getElementById('title').value = event.title;
    document.getElementById('date').value = event.date;
    document.getElementById('time').value = event.time;
    document.getElementById('type').value = event.type;
    document.getElementById('priority').value = event.priority;
    events.splice(eventIndex, 1);
    saveEvents(events);
    showNotification('Edit and save again');
  } else if (btn.classList.contains('complete')) {
    event.completed = !event.completed;
    saveEvents(events);
    showNotification(event.completed ? 'Task marked complete' : 'Task marked pending');
  }
  
  renderEvents();
  renderCalendar();
  drawPerformanceChart();
});

// SEARCH & FILTER
document.getElementById('searchInput').addEventListener('input', renderEvents);
document.getElementById('filterType').addEventListener('change', renderEvents);
document.getElementById('filterStatus').addEventListener('change', renderEvents);

// TABS
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-tab');
    document.getElementById(tab + 'Tab').classList.add('active');
    
    if (tab === 'calendar') renderCalendar();
    else if (tab === 'profile') renderProfile();
    else drawPerformanceChart();
  });
});

// CALENDAR
let currentDate = new Date();

const renderCalendar = () => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  document.getElementById('monthYear').textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];
  
  const calendarDays = document.getElementById('calendarDays');
  calendarDays.innerHTML = '';
  
  // Days from previous month
  const prevDaysInMonth = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day other';
    dayDiv.innerHTML = `<div class="calendar-day-num">${prevDaysInMonth - i}</div>`;
    calendarDays.appendChild(dayDiv);
  }
  
  // Days of current month
  const events = loadEvents();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    if (dateStr === today) dayDiv.classList.add('today');
    
    dayDiv.innerHTML = `<div class="calendar-day-num">${day}</div>`;
    if (dayEvents.length > 0) {
      const eventDiv = document.createElement('div');
      eventDiv.className = 'calendar-day-events';
      dayEvents.forEach(() => {
        const dot = document.createElement('div');
        dot.className = 'calendar-event-dot';
        eventDiv.appendChild(dot);
      });
      dayDiv.appendChild(eventDiv);
    }
    
    dayDiv.addEventListener('click', () => displayCalendarEvents(dateStr));
    calendarDays.appendChild(dayDiv);
  }
  
  // Days from next month
  const totalCells = calendarDays.children.length;
  for (let i = 1; i <= 42 - totalCells; i++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day other';
    dayDiv.innerHTML = `<div class="calendar-day-num">${i}</div>`;
    calendarDays.appendChild(dayDiv);
  }
};

const displayCalendarEvents = (dateStr) => {
  const events = loadEvents().filter(e => e.date === dateStr);
  const eventContainer = document.getElementById('calendarEvents');
  
  if (!events.length) {
    eventContainer.innerHTML = '<p style="color: #94a3b8; text-align: center;">No events on this date</p>';
    return;
  }
  
  eventContainer.innerHTML = `<h3 style="margin: 0 0 1rem; color: #38bdf8;">Events on ${new Date(dateStr).toLocaleDateString()}</h3>`;
  events.forEach(e => {
    const item = document.createElement('div');
    item.className = 'calendar-event-item';
    const status = getEventStatus(e);
    const statusLabel = status === 'completed' ? '✓' : status === 'due-soon' ? '⚡' : '⏳';
    item.innerHTML = `<strong>${e.title}</strong> <span style="color: #94a3b8; font-size: 0.85rem;">| ${e.type} | ${statusLabel} ${e.priority} priority</span>`;
    eventContainer.appendChild(item);
  });
};

document.getElementById('prevMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

// PERFORMANCE CHART
const drawPerformanceChart = () => {
  const canvas = document.getElementById('performanceCanvas');
  if (!canvas || !canvas.getContext) return;
  
  const ctx = canvas.getContext('2d');
  const events = loadEvents();
  const completed = events.filter(e => getEventStatus(e) === 'completed').length;
  const pending = events.filter(e => getEventStatus(e) === 'pending').length;
  const dueSoon = events.filter(e => getEventStatus(e) === 'due-soon').length;
  
  const total = completed + pending + dueSoon || 1;
  const completedPercent = (completed / total) * 100;
  const pendingPercent = (pending / total) * 100;
  const dueSoonPercent = (dueSoon / total) * 100;
  
  const barWidth = 60;
  const barHeight = 150;
  const spacing = 80;
  const startX = 50;
  const startY = 180;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw bars
  const bars = [
    { label: 'Completed', value: completedPercent, color: '#86efac', data: completed },
    { label: 'Pending', value: pendingPercent, color: '#facc15', data: pending },
    { label: 'Due Soon', value: dueSoonPercent, color: '#fca5a5', data: dueSoon }
  ];
  
  let x = startX;
  bars.forEach(bar => {
    const height = (bar.value / 100) * barHeight;
    
    // Draw bar
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, startY - height, barWidth, height);
    
    // Draw border
    ctx.strokeStyle = bar.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, startY - height, barWidth, height);
    
    // Draw label
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(bar.label, x + barWidth / 2, startY + 25);
    
    // Draw value
    ctx.font = 'bold 16px Arial';
    ctx.fillText(bar.data, x + barWidth / 2, startY - height - 10);
    
    // Draw percentage
    ctx.font = '12px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(Math.round(bar.value) + '%', x + barWidth / 2, startY - height - 30);
    
    x += spacing;
  });
  
  // Draw axes
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 30);
  ctx.lineTo(40, startY);
  ctx.lineTo(canvas.width - 20, startY);
  ctx.stroke();
};

// PROFILE
const renderProfile = () => {
  const user = getCurrentUser();
  const events = loadEvents();
  const completed = events.filter(e => getEventStatus(e) === 'completed').length;
  const total = events.length || 1;
  const productivity = Math.round((completed / total) * 100);
  
  document.getElementById('profileName').textContent = user?.name || '—';
  document.getElementById('profileEmail').textContent = user?.email || '—';
  document.getElementById('profileTotal').textContent = total;
  document.getElementById('profileCompletion').textContent = productivity + '%';
  document.getElementById('productivityPercent').textContent = productivity + '%';
  
  // Update circular progress
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (productivity / 100) * circumference;
  const progressRing = document.querySelector('.progress-ring');
  if (progressRing) {
    progressRing.style.strokeDashoffset = offset;
  }
};

// INIT
const initPlanner = () => {
  renderEvents();
  renderCalendar();
  renderProfile();
  drawPerformanceChart();
};

// START
const user = getCurrentUser();
if (user) {
  document.getElementById('userGreeting').textContent = `Welcome, ${user.name} 👋`;
  setVisibleSection('planner');
  initPlanner();
} else {
  setVisibleSection('auth');
}