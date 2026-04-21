'use strict';

// ---------- CONFIGURATION ----------
const CONFIG = {
  POINTS_PER_COMPLETION: 10,
  STREAK_FREEZE_COST: 100,
  LEVELS: [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000],
  MAX_RECENT_ACTIVITIES: 20,
  REMINDER_TIME: { hour: 8, minute: 0 },
};

// ---------- GLOBAL STATE (now var for hoisting) ----------
var state = {
  habits: [],
  totalPoints: 0,
  streakFreezes: 0,
  activities: [],
  settings: {
    vibrationsEnabled: true,
    particlesEnabled: true,
  },
};

// Expose for console debugging
window.state = state;

// Store current modal habit ID globally
let currentModalHabitId = null;

// ---------- DOM ELEMENTS ----------
const DOM = {
  // Points & Level
  totalPointsHeader: document.getElementById('totalPointsHeader'),
  userLevel: document.getElementById('userLevel'),
  levelProgressFill: document.getElementById('levelProgressFill'),
  nextLevelPoints: document.getElementById('nextLevelPoints'),
  
  // Stats
  totalHabitsCount: document.getElementById('totalHabitsCount'),
  currentStreakMax: document.getElementById('currentStreakMax'),
  weeklyCompletionRate: document.getElementById('weeklyCompletionRate'),
  
  // Habit list
  habitListContainer: document.getElementById('habitListContainer'),
  habitNameInput: document.getElementById('habitNameInput'),
  habitCategorySelect: document.getElementById('habitCategorySelect'),
  addHabitButton: document.getElementById('addHabitButton'),
  
  // Weekly heatmap
  weeklyHeatmapContainer: document.getElementById('weeklyHeatmapContainer'),
  weekDateRange: document.getElementById('weekDateRange'),
  
  // Badges
  badgesContainer: document.getElementById('badgesContainer'),
  
  // Reminders
  enableRemindersButton: document.getElementById('enableRemindersButton'),
  
  // Freeze shop
  buyFreezeBtn: document.getElementById('buyFreezeBtn'),
  
  // Quote
  dailyQuote: document.getElementById('dailyQuote'),
  
  // Modal
  habitDetailModal: document.getElementById('habitDetailModal'),
  modalHabitName: document.getElementById('modalHabitName'),
  modalStreak: document.getElementById('modalStreak'),
  modalLongestStreak: document.getElementById('modalLongestStreak'),
  modalTotalCompletions: document.getElementById('modalTotalCompletions'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  
  // Toast
  toastContainer: document.getElementById('toastContainer'),
  
  // Offline banner
  offlineBanner: document.getElementById('offlineBanner'),
  
  // Activity log
  activityLogList: document.getElementById('activityLogList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  
  // FAB
  quickCheckInFab: document.getElementById('quickCheckInFab'),
  
  // Data management
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataBtn: document.getElementById('importDataBtn'),
  importFileInput: document.getElementById('importFileInput'),
  resetAllDataBtn: document.getElementById('resetAllDataBtn'),
};

// ---------- UTILITIES ----------
const utils = {
  generateId: function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  getTodayStr: function() {
    return new Date().toISOString().split('T')[0];
  },
  
  getDateStr: function(date) {
    return date.toISOString().split('T')[0];
  },
  
  formatDate: function(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  },
  
  vibrate: function(pattern) {
    if (state.settings.vibrationsEnabled && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch(e) {}
    }
  },
  
  showToast: function(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    toast.style.cssText = 'background:var(--bg-secondary); border-radius:60px; padding:14px 20px; margin-bottom:10px; box-shadow:var(--shadow-lg); border-left:6px solid var(--accent-primary);';
    
    if (DOM.toastContainer) {
      DOM.toastContainer.appendChild(toast);
      setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(function() { toast.remove(); }, 300);
      }, duration);
    }
    
    if (type === 'success') utils.vibrate(50);
    else if (type === 'error') utils.vibrate([100, 50, 100]);
  },
  
  logActivity: function(message) {
    state.activities.unshift({
      message: message,
      timestamp: new Date().toISOString(),
    });
    if (state.activities.length > CONFIG.MAX_RECENT_ACTIVITIES) {
      state.activities.pop();
    }
    renderActivityLog();
    saveToStorage();
  },
  
  triggerConfetti: function(intensity) {
    if (typeof confetti === 'function') {
      try {
        var count = intensity === 'high' ? 200 : 100;
        confetti({ particleCount: count, spread: 80, origin: { y: 0.6 } });
      } catch(e) {
        console.log('Confetti error:', e);
      }
    }
  },
};

// ---------- PARTICLE BACKGROUND ----------
function initParticles() {
  var canvas = document.createElement('canvas');
  canvas.id = 'particleCanvas';
  canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:-1;';
  document.body.prepend(canvas);
  
  var ctx = canvas.getContext('2d');
  var width, height;
  var particles = [];
  var PARTICLE_COUNT = 30;
  
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  
  function createParticles() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        color: 'hsla(' + (Math.random() * 60 + 220) + ', 80%, 65%, 0.12)',
      });
    }
  }
  
  function draw() {
    if (!state.settings.particlesEnabled) return;
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x < 0 || p.x > width) p.speedX *= -1;
      if (p.y < 0 || p.y > height) p.speedY *= -1;
    }
    requestAnimationFrame(draw);
  }
  
  window.addEventListener('resize', function() {
    resize();
    createParticles();
  });
  
  resize();
  createParticles();
  draw();
}

// ---------- STORAGE ----------
var STORAGE_KEY = 'consistencyPulse_v1';

function saveToStorage() {
  try {
    var data = {
      habits: state.habits,
      totalPoints: state.totalPoints,
      streakFreezes: state.streakFreezes,
      activities: state.activities,
      settings: state.settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) {
    console.log('Storage error:', e);
  }
}

function loadFromStorage() {
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      var data = JSON.parse(saved);
      state.habits = data.habits || [];
      state.totalPoints = data.totalPoints || 0;
      state.streakFreezes = data.streakFreezes || 0;
      state.activities = data.activities || [];
      state.settings = data.settings || { vibrationsEnabled: true, particlesEnabled: true };
    } catch(e) {
      console.log('Parse error:', e);
      initializeDefaultHabits();
    }
  } else {
    initializeDefaultHabits();
  }
  
  // Ensure each habit has all fields
  var todayStr = utils.getTodayStr();
  state.habits = state.habits.map(function(h) {
    return {
      id: h.id || utils.generateId(),
      name: h.name || 'Unnamed Habit',
      category: h.category || 'other',
      streak: h.streak || 0,
      longestStreak: h.longestStreak || 0,
      lastCompleted: h.lastCompleted || null,
      completedDates: h.completedDates || [],
      doneToday: (h.lastCompleted === todayStr),
      freezeActive: h.freezeActive || false,
    };
  });
}

function initializeDefaultHabits() {
  state.habits = [
    { id: utils.generateId(), name: '📚 Study 30 min', category: 'study', streak: 0, longestStreak: 0, lastCompleted: null, completedDates: [], doneToday: false, freezeActive: false },
    { id: utils.generateId(), name: '🏃 Exercise', category: 'exercise', streak: 0, longestStreak: 0, lastCompleted: null, completedDates: [], doneToday: false, freezeActive: false },
    { id: utils.generateId(), name: '📖 Read 10 pages', category: 'read', streak: 0, longestStreak: 0, lastCompleted: null, completedDates: [], doneToday: false, freezeActive: false },
  ];
  state.totalPoints = 0;
  state.streakFreezes = 0;
  state.activities = [{ message: '✨ Welcome to ConsistencyPulse! Add your first habit.', timestamp: new Date().toISOString() }];
}
// ==================== BLOCK 2: HABIT OPERATIONS & RENDERING ====================

// ---------- HABIT OPERATIONS ----------
function addHabit(name, category) {
  if (!name || !name.trim()) {
    utils.showToast('Please enter a habit name', 'error');
    return;
  }
  
  var newHabit = {
    id: utils.generateId(),
    name: name.trim(),
    category: category || 'other',
    streak: 0,
    longestStreak: 0,
    lastCompleted: null,
    completedDates: [],
    doneToday: false,
    freezeActive: false,
  };
  
  state.habits.push(newHabit);
  utils.logActivity('➕ Added: ' + newHabit.name);
  utils.showToast('Habit added!', 'success');
  utils.vibrate(30);
  saveToStorage();
  renderAll();
}

function markHabitDone(habitId) {
  var habit = state.habits.find(function(h) { return h.id === habitId; });
  if (!habit) return;
  
  var todayStr = utils.getTodayStr();
  if (habit.lastCompleted === todayStr) {
    utils.showToast('Already done today!', 'info');
    return;
  }
  
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = utils.getDateStr(yesterday);
  
  if (habit.lastCompleted === yesterdayStr) {
    habit.streak += 1;
  } else {
    habit.streak = 1;
  }
  
  if (habit.streak > habit.longestStreak) {
    habit.longestStreak = habit.streak;
  }
  
  habit.lastCompleted = todayStr;
  habit.doneToday = true;
  habit.completedDates.push(todayStr);
  
  state.totalPoints += CONFIG.POINTS_PER_COMPLETION;
  
  if (habit.streak % 7 === 0) {
    utils.triggerConfetti('high');
    utils.showToast('🔥 ' + habit.streak + ' day streak! +50 bonus!', 'success');
    state.totalPoints += 50;
  } else {
    utils.triggerConfetti('normal');
  }
  
  utils.logActivity('✅ ' + habit.name + ' · Streak: ' + habit.streak + ' 🔥');
  utils.showToast('Great job! +' + CONFIG.POINTS_PER_COMPLETION + ' pts', 'success');
  utils.vibrate([30, 50]);
  
  saveToStorage();
  renderAll();
}

function skipDay(habitId) {
  var habit = state.habits.find(function(h) { return h.id === habitId; });
  if (!habit) return;
  
  if (habit.freezeActive) {
    habit.freezeActive = false;
    state.streakFreezes--;
    utils.logActivity('❄️ Freeze saved streak for: ' + habit.name);
    utils.showToast('Freeze saved your streak!', 'info');
  } else {
    habit.streak = 0;
    utils.logActivity('⏭️ Skipped: ' + habit.name + ' · streak reset');
    utils.showToast('Streak reset', 'warning');
  }
  
  habit.lastCompleted = null;
  habit.doneToday = false;
  saveToStorage();
  renderAll();
}

function deleteHabit(habitId) {
  var index = state.habits.findIndex(function(h) { return h.id === habitId; });
  if (index !== -1) {
    var habitName = state.habits[index].name;
    state.habits.splice(index, 1);
    utils.logActivity('🗑️ Deleted: ' + habitName);
    utils.showToast('Habit deleted', 'info');
    saveToStorage();
    renderAll();
  }
}

function buyStreakFreeze() {
  if (state.totalPoints >= CONFIG.STREAK_FREEZE_COST) {
    state.totalPoints -= CONFIG.STREAK_FREEZE_COST;
    state.streakFreezes++;
    utils.logActivity('❄️ Purchased streak freeze');
    utils.showToast('Streak Freeze purchased!', 'success');
    utils.vibrate(50);
    saveToStorage();
    renderAll();
  } else {
    utils.showToast('Need ' + CONFIG.STREAK_FREEZE_COST + ' points!', 'error');
  }
}

// ---------- RENDERING FUNCTIONS ----------
function renderPointsAndLevel() {
  if (!DOM.totalPointsHeader) return;
  DOM.totalPointsHeader.textContent = state.totalPoints;
  
  var level = 1;
  for (var i = 1; i < CONFIG.LEVELS.length; i++) {
    if (state.totalPoints >= CONFIG.LEVELS[i]) level = i + 1;
    else break;
  }
  if (DOM.userLevel) DOM.userLevel.textContent = level;
  
  var currentMin = CONFIG.LEVELS[level - 1] || 0;
  var nextMin = CONFIG.LEVELS[level] || CONFIG.LEVELS[level-1] * 2;
  var progress = ((state.totalPoints - currentMin) / (nextMin - currentMin)) * 100;
  if (DOM.levelProgressFill) DOM.levelProgressFill.style.width = Math.min(progress, 100) + '%';
  if (DOM.nextLevelPoints) DOM.nextLevelPoints.textContent = (nextMin - state.totalPoints) + ' pts to Level ' + (level + 1);
}

function renderStats() {
  if (!DOM.totalHabitsCount) return;
  DOM.totalHabitsCount.textContent = state.habits.length;
  
  var maxStreak = 0;
  state.habits.forEach(function(h) { if (h.longestStreak > maxStreak) maxStreak = h.longestStreak; });
  DOM.currentStreakMax.textContent = maxStreak;
  
  var today = new Date();
  var startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  var weekDates = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    weekDates.push(utils.getDateStr(d));
  }
  
  var completedCount = 0;
  state.habits.forEach(function(h) {
    h.completedDates.forEach(function(date) {
      if (weekDates.indexOf(date) !== -1) completedCount++;
    });
  });
  
  var totalPossible = state.habits.length * 7;
  var rate = totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;
  DOM.weeklyCompletionRate.textContent = rate + '%';
}

function renderHabitList() {
  if (!DOM.habitListContainer) return;
  
  if (state.habits.length === 0) {
    DOM.habitListContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">🌱</span><p>No habits yet. Add one above!</p></div>';
    return;
  }
  
  var html = '';
  state.habits.forEach(function(habit) {
    var streakDisplay = habit.streak > 0 ? habit.streak + ' 🔥' : '0';
    var doneDisabled = habit.doneToday ? 'disabled' : '';
    var freezeIndicator = habit.freezeActive ? ' ❄️' : '';
    
    html += '<div class="habit-card" data-id="' + habit.id + '">';
    html += '<div class="habit-info">';
    html += '<span class="habit-name">' + habit.name + freezeIndicator + '</span>';
    html += '<span class="habit-category-tag">' + habit.category + '</span>';
    html += '<div class="streak-info"><span class="streak-flame">🔥</span><span class="streak-count">' + streakDisplay + '</span></div>';
    html += '</div>';
    html += '<div class="habit-actions">';
    html += '<button class="done-btn" data-id="' + habit.id + '" ' + doneDisabled + '>' + (habit.doneToday ? '✅ Done' : 'Mark Done') + '</button>';
    html += '<button class="more-options-btn" data-id="' + habit.id + '">⋯</button>';
    html += '</div></div>';
  });
  
  DOM.habitListContainer.innerHTML = html;
  
  // Attach listeners
  document.querySelectorAll('.done-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      markHabitDone(e.target.dataset.id);
    });
  });
  
  document.querySelectorAll('.more-options-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      openHabitModal(e.target.dataset.id);
    });
  });
}

function renderWeeklyHeatmap() {
  if (!DOM.weeklyHeatmapContainer) return;
  
  var today = new Date();
  var startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  var endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  if (DOM.weekDateRange) {
    DOM.weekDateRange.textContent = utils.formatDate(startOfWeek) + ' - ' + utils.formatDate(endOfWeek);
  }
  
  var cells = DOM.weeklyHeatmapContainer.querySelectorAll('.heatmap-day');
  var days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  days.forEach(function(day, index) {
    var date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    var dateStr = utils.getDateStr(date);
    
    var completions = 0;
    state.habits.forEach(function(h) {
      if (h.completedDates.indexOf(dateStr) !== -1) completions++;
    });
    
    var totalHabits = state.habits.length;
    var intensity = 0;
    if (totalHabits > 0) {
      var percent = completions / totalHabits;
      if (percent > 0) intensity = 1;
      if (percent >= 0.25) intensity = 2;
      if (percent >= 0.5) intensity = 3;
      if (percent >= 0.75) intensity = 4;
    }
    
    var cellDiv = cells[index].querySelector('.heat-cell');
    var badgeSpan = cells[index].querySelector('.completion-badge');
    
    if (cellDiv) cellDiv.className = 'heat-cell intensity-' + intensity;
    if (badgeSpan) badgeSpan.textContent = completions + '/' + totalHabits;
  });
}

function renderBadges() {
  if (!DOM.badgesContainer) return;
  
  var badges = [
    { name: 'Bronze Starter', emoji: '🥉', required: 50 },
    { name: 'Silver Consistency', emoji: '🥈', required: 150 },
    { name: 'Gold Streaker', emoji: '🥇', required: 300 },
    { name: 'Diamond Discipline', emoji: '💎', required: 500 },
  ];
  
  var html = '';
  badges.forEach(function(badge) {
    var unlocked = state.totalPoints >= badge.required;
    var progress = Math.min(state.totalPoints, badge.required);
    html += '<div class="badge-item ' + (unlocked ? 'unlocked' : 'locked') + '">';
    html += '<span class="badge-emoji">' + badge.emoji + '</span>';
    html += '<span class="badge-name">' + badge.name + '</span>';
    html += '<span class="badge-progress">' + progress + '/' + badge.required + '</span>';
    html += '</div>';
  });
  DOM.badgesContainer.innerHTML = html;
}

function renderActivityLog() {
  if (!DOM.activityLogList) return;
  
  if (state.activities.length === 0) {
    DOM.activityLogList.innerHTML = '<li class="log-entry">✨ No recent activity</li>';
    return;
  }
  
  var html = '';
  state.activities.slice(0, 10).forEach(function(act) {
    var time = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    html += '<li class="log-entry">' + act.message + ' <span style="opacity:0.6;">' + time + '</span></li>';
  });
  DOM.activityLogList.innerHTML = html;
}

function renderAll() {
  renderPointsAndLevel();
  renderStats();
  renderHabitList();
  renderWeeklyHeatmap();
  renderBadges();
  renderActivityLog();
  updateFreezeButton();
}

function updateFreezeButton() {
  if (DOM.buyFreezeBtn) {
    DOM.buyFreezeBtn.disabled = (state.totalPoints < CONFIG.STREAK_FREEZE_COST);
  }
}
// ==================== BLOCK 3: MODAL, LISTENERS, INIT ====================

// ---------- MODAL FUNCTIONS ----------
function openHabitModal(habitId) {
  console.log('Opening modal for habit:', habitId);
  
  var habit = state.habits.find(function(h) { return h.id === habitId; });
  if (!habit) {
    console.log('Habit not found!');
    return;
  }
  
  currentModalHabitId = habitId;
  
  // Populate modal fields
  if (DOM.modalHabitName) DOM.modalHabitName.textContent = habit.name;
  if (DOM.modalStreak) DOM.modalStreak.textContent = habit.streak + ' days';
  if (DOM.modalLongestStreak) DOM.modalLongestStreak.textContent = habit.longestStreak + ' days';
  if (DOM.modalTotalCompletions) DOM.modalTotalCompletions.textContent = habit.completedDates.length;
  
  // Show modal
  if (DOM.habitDetailModal) {
    DOM.habitDetailModal.hidden = false;
    console.log('Modal should be visible now');
  }
}

function closeModal() {
  console.log('Closing modal');
  if (DOM.habitDetailModal) {
    DOM.habitDetailModal.hidden = true;
  }
  currentModalHabitId = null;
}

// Global handlers for modal buttons (called via onclick in HTML)
function handleModalMarkDone() {
  console.log('Mark Done clicked, habitId:', currentModalHabitId);
  if (currentModalHabitId) {
    markHabitDone(currentModalHabitId);
    closeModal();
  }
}

function handleModalSkipDay() {
  console.log('Skip Day clicked, habitId:', currentModalHabitId);
  if (currentModalHabitId) {
    skipDay(currentModalHabitId);
    closeModal();
  }
}

function handleModalDelete() {
  console.log('Delete clicked, habitId:', currentModalHabitId);
  if (currentModalHabitId && confirm('Delete this habit permanently?')) {
    deleteHabit(currentModalHabitId);
    closeModal();
  }
}

// Expose to global scope for onclick attributes
window.handleModalMarkDone = handleModalMarkDone;
window.handleModalSkipDay = handleModalSkipDay;
window.handleModalDelete = handleModalDelete;

// ---------- QUOTES ----------
var quotes = [
  { text: "Small daily improvements are the key to staggering long-term results.", author: "James Clear" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
];

function rotateQuote() {
  if (!DOM.dailyQuote) return;
  var randomIndex = Math.floor(Math.random() * quotes.length);
  var quote = quotes[randomIndex];
  DOM.dailyQuote.innerHTML = '<p class="quote-text">"' + quote.text + '"</p><span class="quote-author">— ' + quote.author + '</span>';
}

// ---------- EVENT LISTENERS ----------
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Add habit
  if (DOM.addHabitButton) {
    DOM.addHabitButton.addEventListener('click', function() {
      addHabit(DOM.habitNameInput.value, DOM.habitCategorySelect.value);
      DOM.habitNameInput.value = '';
    });
  }
  
  if (DOM.habitNameInput) {
    DOM.habitNameInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        addHabit(DOM.habitNameInput.value, DOM.habitCategorySelect.value);
        DOM.habitNameInput.value = '';
      }
    });
  }
  
  // Modal close
  if (DOM.closeModalBtn) {
    DOM.closeModalBtn.addEventListener('click', closeModal);
  }
  
  if (DOM.habitDetailModal) {
    DOM.habitDetailModal.addEventListener('click', function(e) {
      if (e.target === DOM.habitDetailModal) closeModal();
    });
  }
  
  // Freeze shop
  if (DOM.buyFreezeBtn) {
    DOM.buyFreezeBtn.addEventListener('click', buyStreakFreeze);
  }
  
  // FAB Quick Check-in
  if (DOM.quickCheckInFab) {
    DOM.quickCheckInFab.addEventListener('click', function() {
      var undone = state.habits.filter(function(h) { return !h.doneToday; });
      if (undone.length === 0) {
        utils.showToast('All habits done today! 🎉', 'success');
      } else {
        undone.forEach(function(h) { markHabitDone(h.id); });
      }
    });
  }
  
  // Clear history
  if (DOM.clearHistoryBtn) {
    DOM.clearHistoryBtn.addEventListener('click', function() {
      state.activities = [];
      renderActivityLog();
      saveToStorage();
      utils.showToast('History cleared', 'info');
    });
  }
  
  // Export data
  if (DOM.exportDataBtn) {
    DOM.exportDataBtn.addEventListener('click', function() {
      var dataStr = JSON.stringify({ habits: state.habits, totalPoints: state.totalPoints, streakFreezes: state.streakFreezes, activities: state.activities }, null, 2);
      var blob = new Blob([dataStr], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'consistency-pulse-backup-' + utils.getTodayStr() + '.json';
      a.click();
      URL.revokeObjectURL(url);
      utils.showToast('Data exported!', 'success');
    });
  }
  
  // Import data
  if (DOM.importDataBtn && DOM.importFileInput) {
    DOM.importDataBtn.addEventListener('click', function() {
      DOM.importFileInput.click();
    });
    
    DOM.importFileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(event) {
        try {
          var imported = JSON.parse(event.target.result);
          state.habits = imported.habits || state.habits;
          state.totalPoints = imported.totalPoints || 0;
          state.streakFreezes = imported.streakFreezes || 0;
          state.activities = imported.activities || [];
          saveToStorage();
          renderAll();
          utils.showToast('Data imported!', 'success');
          utils.triggerConfetti('normal');
        } catch(err) {
          utils.showToast('Invalid file', 'error');
        }
      };
      reader.readAsText(file);
      DOM.importFileInput.value = '';
    });
  }
  
  // Reset all data
  if (DOM.resetAllDataBtn) {
    DOM.resetAllDataBtn.addEventListener('click', function() {
      if (confirm('Reset ALL data?')) {
        localStorage.removeItem(STORAGE_KEY);
        initializeDefaultHabits();
        state.totalPoints = 0;
        state.streakFreezes = 0;
        state.activities = [{ message: '🔄 Data reset', timestamp: new Date().toISOString() }];
        saveToStorage();
        renderAll();
        utils.showToast('All data reset', 'info');
      }
    });
  }
  
  // Reminders
  if (DOM.enableRemindersButton) {
    DOM.enableRemindersButton.addEventListener('click', function() {
      if (!('Notification' in window)) {
        utils.showToast('Notifications not supported', 'error');
        return;
      }
      Notification.requestPermission().then(function(permission) {
        if (permission === 'granted') {
          utils.showToast('Reminders enabled!', 'success');
        } else {
          utils.showToast('Permission denied', 'error');
        }
      });
    });
  }
  
  // Offline detection
  window.addEventListener('online', function() {
    if (DOM.offlineBanner) DOM.offlineBanner.hidden = true;
  });
  window.addEventListener('offline', function() {
    if (DOM.offlineBanner) DOM.offlineBanner.hidden = false;
  });
}

// ---------- INITIALIZATION ----------
function init() {
  console.log('Initializing ConsistencyPulse...');
  
  loadFromStorage();
  
  var todayStr = utils.getTodayStr();
  state.habits.forEach(function(h) {
    h.doneToday = (h.lastCompleted === todayStr);
  });
  
  renderAll();
  setupEventListeners();
  rotateQuote();
  setInterval(rotateQuote, 3600000);
  
  if (state.settings.particlesEnabled) {
    initParticles();
  }
  
  setTimeout(function() {
    utils.showToast('Ready to build consistency! 🔥', 'info');
  }, 500);
  
  console.log('Initialization complete!');
}

// Start everything
init();