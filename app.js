// ==================== CONSISTENCYPULSE - COMPLETE APP.JS ====================
// Built by Regan Macharia, Grade 10, Nkubu High School, Kenya 🇰🇪
// Timer fixed, Export fixed, All features working

'use strict';

// ---------- CONFIGURATION ----------
const CONFIG = {
  POINTS_PER_COMPLETION: 10,
  STREAK_FREEZE_COST: 100,
  LEVELS: [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000],
  MAX_RECENT_ACTIVITIES: 20,
  REMINDER_TIME: { hour: 8, minute: 0 },
};

// ---------- GLOBAL STATE ----------
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

// Expose state globally for debugging
window.state = state;

// Store current modal habit ID
var currentModalHabitId = null;

// Timer variables
var timerInterval = null;
var timerSecondsLeft = 25 * 60;
var timerRunning = false;

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
  modalMarkDoneBtn: document.getElementById('modalMarkDoneBtn'),
  modalSkipDayBtn: document.getElementById('modalSkipDayBtn'),
  modalDeleteHabitBtn: document.getElementById('modalDeleteHabitBtn'),
  
  // Toast
  toastContainer: document.getElementById('toastContainer'),
  
  // Offline banner
  offlineBanner: document.getElementById('offlineBanner'),
  
  // Activity log
  activityLogList: document.getElementById('activityLogList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  
  // Timer
  timerMinutes: document.getElementById('timerMinutes'),
  timerSeconds: document.getElementById('timerSeconds'),
  startTimerBtn: document.getElementById('startTimerBtn'),
  pauseTimerBtn: document.getElementById('pauseTimerBtn'),
  resetTimerBtn: document.getElementById('resetTimerBtn'),
  toggleTimerBtn: document.getElementById('toggleTimerBtn'),
  timerPanel: document.getElementById('timerPanel'),
  
  // FAB
  quickCheckInFab: document.getElementById('quickCheckInFab'),
  
  // Data management
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataBtn: document.getElementById('importDataBtn'),
  importFileInput: document.getElementById('importFileInput'),
  resetAllDataBtn: document.getElementById('resetAllDataBtn'),
  
  // Feedback
  feedbackBtn: document.getElementById('feedbackBtn'),
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
    var date = new Date(dateStr);
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
    
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    toast.style.cssText = 'background:var(--bg-secondary); border-radius:60px; padding:14px 20px; margin-bottom:10px; box-shadow:var(--shadow-lg); border-left:6px solid var(--accent-primary); transition:all 0.3s;';
    
    if (DOM.toastContainer) {
      DOM.toastContainer.appendChild(toast);
      setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(function() { 
          if (toast.parentNode) toast.remove(); 
        }, 300);
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
        setTimeout(function() {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6, x: 0.3 } });
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6, x: 0.7 } });
        }, 150);
      } catch(e) {
        console.log('Confetti error:', e);
      }
    }
  },
};

// ---------- TIMER FUNCTIONS ----------
function updateTimerDisplay() {
  var mins = Math.floor(timerSecondsLeft / 60);
  var secs = timerSecondsLeft % 60;
  if (DOM.timerMinutes) {
    DOM.timerMinutes.textContent = mins.toString().padStart(2, '0');
  }
  if (DOM.timerSeconds) {
    DOM.timerSeconds.textContent = secs.toString().padStart(2, '0');
  }
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(function() {
    if (timerSecondsLeft > 0) {
      timerSecondsLeft--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerRunning = false;
      utils.showToast('⏰ Time is up! Take a break.', 'success');
      utils.vibrate([200, 100, 200]);
      utils.triggerConfetti('normal');
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
}

function resetTimer(minutes) {
  pauseTimer();
  timerSecondsLeft = minutes * 60;
  updateTimerDisplay();
}

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
// ===== BURNING FLAME ANIMATION =====
function animateBurningFlame() {
  var flame = document.getElementById('burningFlame');
  if (!flame) return;
  
  var fireEmojis = ['🔥', '🔥', '🔥', '🔥', '🔥', '💥', '✨', '🔥', '🔥', '🔥', '🌟', '🔥', '🔥'];
  var index = 0;
  
  setInterval(function() {
    // Cycle through emojis for a flickering effect
    flame.textContent = fireEmojis[index];
    index = (index + 1) % fireEmojis.length;
    
    // Random scale for flicker
    var scale = 0.8 + Math.random() * 0.6;
    var rotate = -10 + Math.random() * 20;
    var glowIntensity = 8 + Math.random() * 20;
    
    flame.style.transform = 'scale(' + scale + ') rotate(' + rotate + 'deg)';
    flame.style.filter = 'drop-shadow(0 0 ' + glowIntensity + 'px rgba(245, 158, 11, 0.9)) drop-shadow(0 0 ' + (glowIntensity * 2) + 'px rgba(255, 100, 0, 0.6))';
  }, 150);
  
  // More dramatic flame burst every 3 seconds
  setInterval(function() {
    flame.style.transform = 'scale(1.4) rotate(15deg)';
    flame.style.filter = 'drop-shadow(0 0 30px rgba(255, 200, 0, 1)) drop-shadow(0 0 60px rgba(255, 100, 0, 0.9))';
    setTimeout(function() {
      flame.style.transform = 'scale(1) rotate(0deg)';
      flame.style.filter = 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.8))';
    }, 200);
  }, 3000);
}

// Call this in your init() function
// animateBurningFlame();

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
// ==================== BLOCK 2: HABIT OPERATIONS, RENDERING, MODAL, INIT ====================

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

// ---------- EXPORT DATA (Fixed) ----------
function exportData() {
  var data = {
    habits: state.habits,
    totalPoints: state.totalPoints,
    streakFreezes: state.streakFreezes,
    activities: state.activities,
    settings: state.settings,
    exportDate: new Date().toISOString()
  };
  
  var dataStr = JSON.stringify(data, null, 2);
  var blob = new Blob([dataStr], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  
  var a = document.createElement('a');
  a.href = url;
  a.download = 'consistency-pulse-backup-' + utils.getTodayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  utils.showToast('Data exported successfully!', 'success');
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

// ---------- MODAL FUNCTIONS ----------
function openHabitModal(habitId) {
  var habit = state.habits.find(function(h) { return h.id === habitId; });
  if (!habit) return;
  
  currentModalHabitId = habitId;
  
  if (DOM.modalHabitName) DOM.modalHabitName.textContent = habit.name;
  if (DOM.modalStreak) DOM.modalStreak.textContent = habit.streak + ' days';
  if (DOM.modalLongestStreak) DOM.modalLongestStreak.textContent = habit.longestStreak + ' days';
  if (DOM.modalTotalCompletions) DOM.modalTotalCompletions.textContent = habit.completedDates.length;
  
  if (DOM.habitDetailModal) DOM.habitDetailModal.hidden = false;
}

function closeModal() {
  if (DOM.habitDetailModal) DOM.habitDetailModal.hidden = true;
  currentModalHabitId = null;
}

// Global modal handlers
window.handleModalMarkDone = function() {
  if (currentModalHabitId) {
    markHabitDone(currentModalHabitId);
    closeModal();
  }
};

window.handleModalSkipDay = function() {
  if (currentModalHabitId) {
    skipDay(currentModalHabitId);
    closeModal();
  }
};

window.handleModalDelete = function() {
  if (currentModalHabitId && confirm('Delete this habit permanently?')) {
    deleteHabit(currentModalHabitId);
    closeModal();
  }
};

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
  
  // Modal
  if (DOM.closeModalBtn) DOM.closeModalBtn.addEventListener('click', closeModal);
  if (DOM.habitDetailModal) {
    DOM.habitDetailModal.addEventListener('click', function(e) {
      if (e.target === DOM.habitDetailModal) closeModal();
    });
  }
  
  if (DOM.modalMarkDoneBtn) {
    DOM.modalMarkDoneBtn.addEventListener('click', window.handleModalMarkDone);
  }
  if (DOM.modalSkipDayBtn) {
    DOM.modalSkipDayBtn.addEventListener('click', window.handleModalSkipDay);
  }
  if (DOM.modalDeleteHabitBtn) {
    DOM.modalDeleteHabitBtn.addEventListener('click', window.handleModalDelete);
  }
  
  // Freeze shop
  if (DOM.buyFreezeBtn) DOM.buyFreezeBtn.addEventListener('click', buyStreakFreeze);
  
  // Timer
  if (DOM.startTimerBtn) DOM.startTimerBtn.addEventListener('click', startTimer);
  if (DOM.pauseTimerBtn) DOM.pauseTimerBtn.addEventListener('click', pauseTimer);
  if (DOM.resetTimerBtn) {
    DOM.resetTimerBtn.addEventListener('click', function() { resetTimer(25); });
  }
  
  var presets = document.querySelectorAll('.preset');
  presets.forEach(function(btn) {
    btn.addEventListener('click', function() {
      presets.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      resetTimer(parseInt(btn.dataset.time));
    });
  });
  
  if (DOM.toggleTimerBtn && DOM.timerPanel) {
    DOM.toggleTimerBtn.addEventListener('click', function() {
      DOM.timerPanel.classList.toggle('collapsed');
      DOM.toggleTimerBtn.textContent = DOM.timerPanel.classList.contains('collapsed') ? '▶' : '▼';
    });
  }
  
  // FAB
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
  
  // Activity log
  if (DOM.clearHistoryBtn) {
    DOM.clearHistoryBtn.addEventListener('click', function() {
      state.activities = [];
      renderActivityLog();
      saveToStorage();
      utils.showToast('History cleared', 'info');
    });
  }
  
  // Data management
  if (DOM.exportDataBtn) DOM.exportDataBtn.addEventListener('click', exportData);
  
  if (DOM.importDataBtn && DOM.importFileInput) {
    DOM.importDataBtn.addEventListener('click', function() { DOM.importFileInput.click(); });
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
  
  // Feedback
  if (DOM.feedbackBtn) {
    DOM.feedbackBtn.addEventListener('click', function() {
      window.open('https://docs.google.com/forms/d/e/1FAIpQLSelAKwUZdpm4V3CLLZ-ZSTWuh8SKG-rRbgZepuSnjZRWg89oQ/viewform?usp=pp_url', '_blank');
    });
  }
  
  // Offline
  window.addEventListener('online', function() { if (DOM.offlineBanner) DOM.offlineBanner.hidden = true; });
  window.addEventListener('offline', function() { if (DOM.offlineBanner) DOM.offlineBanner.hidden = false; });
}

// ---------- INITIALIZATION ----------
function init() {
  loadFromStorage();
  
  var todayStr = utils.getTodayStr();
  state.habits.forEach(function(h) {
    h.doneToday = (h.lastCompleted === todayStr);
  });
  
  renderAll();
  setupEventListeners();
  rotateQuote();
  updateTimerDisplay();
  setInterval(rotateQuote, 3600000);
  
  if (state.settings.particlesEnabled) initParticles();
  
  setTimeout(function() {
    utils.showToast('Ready to build consistency! 🔥', 'info');
  }, 500);
}

// Start everything
init();
