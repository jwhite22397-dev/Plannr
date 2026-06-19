/**
 * Plannr — main application UI
 */
(function () {
  var data = Store.load();
  var currentView = 'today';
  var currentCategory = 'all';
  var editingId = null;
  var editingType = 'task';

  var TIME_BLOCKS = [
    { id: 'morning', icon: '🌅', label: 'Morning' },
    { id: 'afternoon', icon: '☀️', label: 'Afternoon' },
    { id: 'evening', icon: '🌙', label: 'Evening' },
    { id: 'anytime', icon: '📋', label: 'Anytime' }
  ];

  var CATEGORY_LABELS = {
    life: 'Life', work: 'Work', health: 'Health', home: 'Home'
  };

  /* ── Init ── */
  function init() {
    Store.resetHabitsDaily(data);
    data.stats = Store.resetXpToday(data.stats);
    bindEvents();
    renderAll();
  }

  function bindEvents() {
    /* Navigation */
    var navBtns = document.querySelectorAll('.nav-btn');
    for (var i = 0; i < navBtns.length; i++) {
      navBtns[i].addEventListener('click', function () {
        switchView(this.getAttribute('data-nav'));
      });
    }

    /* Category tabs */
    var tabs = document.querySelectorAll('.tab');
    for (var j = 0; j < tabs.length; j++) {
      tabs[j].addEventListener('click', function () {
        currentCategory = this.getAttribute('data-category');
        document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        renderTaskList();
      });
    }

    /* Add buttons */
    document.getElementById('add-task').addEventListener('click', function () { openModal('task'); });
    document.getElementById('add-task-today').addEventListener('click', function () { openModal('task'); });
    document.getElementById('add-habit').addEventListener('click', function () { openModal('habit'); });

    /* Modal */
    document.getElementById('modal-form').addEventListener('submit', handleModalSubmit);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-backdrop').addEventListener('click', closeModal);
    document.getElementById('modal-delete').addEventListener('click', handleDelete);
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelector('.nav-btn[data-nav="' + view + '"]').classList.add('active');
    renderAll();
  }

  /* ── Render ── */
  function renderAll() {
    renderHeader();
    renderDailyProgress();
    renderToday();
    renderTaskList();
    renderHabits();
    renderRewards();
  }

  function renderHeader() {
    var lvl = Gamification.getLevel(data.stats.totalXp);
    var pct = lvl.xpNeeded > 0 ? (lvl.xpInLevel / lvl.xpNeeded) * 100 : 0;

    document.getElementById('streak-count').textContent = data.stats.streak || 0;
    document.getElementById('level-label').textContent = 'Lv. ' + lvl.level;
    document.getElementById('xp-label').textContent = lvl.xpInLevel + ' / ' + lvl.xpNeeded + ' XP';
    document.getElementById('xp-fill').style.width = pct + '%';
    document.getElementById('level-title').textContent = Gamification.getTitle(lvl.level);
  }

  function renderDailyProgress() {
    var todayTasks = Store.getTodayTasks(data);
    var done = todayTasks.filter(function (t) { return t.completed; }).length;
    var total = todayTasks.length;
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;

    var circumference = 2 * Math.PI * 52;
    var offset = circumference - (pct / 100) * circumference;
    document.getElementById('progress-ring-fill').style.strokeDashoffset = offset;
    document.getElementById('progress-percent').textContent = pct + '%';
    document.getElementById('stat-done').textContent = done + ' done';
    document.getElementById('stat-xp-today').textContent = '+' + (data.stats.xpToday || 0) + ' XP today';
    document.getElementById('motivation-text').textContent =
      Gamification.getMotivation(done, total, data.stats.streak || 0);
  }

  function renderToday() {
    var el = document.getElementById('date-display');
    var now = new Date();
    el.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });

    var container = document.getElementById('time-blocks');
    container.innerHTML = '';

    TIME_BLOCKS.forEach(function (block) {
      var tasks = data.tasks.filter(function (t) {
        return t.timeblock === block.id && (!t.completed || Store.isToday(t));
      });

      var section = document.createElement('div');
      section.className = 'time-block';

      var doneCount = tasks.filter(function (t) { return t.completed; }).length;
      section.innerHTML =
        '<div class="time-block-header">' +
          '<span class="time-block-icon">' + block.icon + '</span>' +
          '<span class="time-block-label">' + block.label + '</span>' +
          '<span class="time-block-count">' + doneCount + '/' + tasks.length + '</span>' +
        '</div>';

      if (tasks.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'time-block-empty';
        empty.textContent = 'Nothing here yet — add a task!';
        section.appendChild(empty);
      } else {
        var ul = document.createElement('ul');
        ul.className = 'task-list';
        tasks.forEach(function (task) {
          ul.appendChild(createTaskElement(task));
        });
        section.appendChild(ul);
      }

      container.appendChild(section);
    });
  }

  function renderTaskList() {
    var list = document.getElementById('task-list-all');
    list.innerHTML = '';

    var tasks = data.tasks.slice().sort(function (a, b) {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    if (currentCategory !== 'all') {
      tasks = tasks.filter(function (t) { return t.category === currentCategory; });
    }

    if (tasks.length === 0) {
      var li = document.createElement('li');
      li.className = 'time-block-empty';
      li.textContent = 'No tasks yet. Tap + to add one!';
      list.appendChild(li);
      return;
    }

    tasks.forEach(function (task) {
      list.appendChild(createTaskElement(task));
    });
  }

  function createTaskElement(task) {
    var li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');

    var xp = Gamification.XP_TABLE[task.priority] || 10;

    li.innerHTML =
      '<button class="task-check' + (task.completed ? ' checked' : '') + '" aria-label="Toggle complete">' +
        (task.completed ? '✓' : '') +
      '</button>' +
      '<div class="task-body">' +
        '<div class="task-text">' + escapeHtml(task.text) + '</div>' +
        '<div class="task-meta">' +
          '<span class="task-tag tag-' + task.category + '">' + (CATEGORY_LABELS[task.category] || task.category) + '</span>' +
          (task.priority === 'high' ? '<span class="task-tag tag-priority-high">Boss</span>' : '') +
        '</div>' +
      '</div>' +
      '<span class="task-xp">+' + xp + '</span>';

    var check = li.querySelector('.task-check');
    check.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleTask(task.id);
    });

    li.addEventListener('click', function () {
      openModal('task', task);
    });

    return li;
  }

  function renderHabits() {
    var list = document.getElementById('habit-list');
    list.innerHTML = '';

    if (data.habits.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'time-block-empty';
      empty.textContent = 'No habits yet. Start a streak!';
      list.appendChild(empty);
      return;
    }

    data.habits.forEach(function (habit) {
      var li = document.createElement('li');
      li.className = 'habit-item';

      var streakPct = Math.min((habit.streak / 30) * 100, 100);

      li.innerHTML =
        '<button class="task-check' + (habit.completedToday ? ' checked' : '') + '" aria-label="Toggle habit">' +
          (habit.completedToday ? '✓' : '') +
        '</button>' +
        '<div class="task-body">' +
          '<div class="task-text">' + escapeHtml(habit.text) + '</div>' +
        '</div>' +
        '<span class="habit-streak">🔥 ' + (habit.streak || 0) + '</span>' +
        '<div class="habit-streak-bar"><div class="habit-streak-fill" style="width:' + streakPct + '%"></div></div>';

      var check = li.querySelector('.task-check');
      check.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleHabit(habit.id);
      });

      list.appendChild(li);
    });
  }

  function renderRewards() {
    document.getElementById('total-xp').textContent = data.stats.totalXp || 0;
    document.getElementById('best-streak').textContent = data.stats.bestStreak || 0;
    document.getElementById('tasks-completed-total').textContent = data.stats.totalCompleted || 0;

    var grid = document.getElementById('achievements-grid');
    grid.innerHTML = '';

    Gamification.ACHIEVEMENTS.forEach(function (ach) {
      var unlocked = ach.check(data);
      var div = document.createElement('div');
      div.className = 'achievement ' + (unlocked ? 'unlocked' : 'locked');
      div.innerHTML =
        '<div class="achievement-icon">' + ach.icon + '</div>' +
        '<div class="achievement-name">' + ach.name + '</div>' +
        '<div class="achievement-desc">' + ach.desc + '</div>';
      grid.appendChild(div);
    });
  }

  /* ── Actions ── */
  function toggleTask(id) {
    var task = data.tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    if (task.completed) {
      Store.uncompleteTask(data, id);
      renderAll();
      return;
    }

    var result = Store.completeTask(data, id);
    if (!result) return;

    Gamification.showCelebration(result.xp);

    if (result.leveledUp) {
      setTimeout(function () {
        Gamification.showLevelUp(result.level.level, Gamification.getTitle(result.level.level))
          .then(function () { renderAll(); });
      }, 1900);
    }

    Store.checkPerfectDay(data);
    renderAll();
  }

  function toggleHabit(id) {
    var result = Store.toggleHabit(data, id);
    if (!result || !result.xp) {
      renderAll();
      return;
    }

    Gamification.showCelebration(result.xp);

    if (result.leveledUp) {
      setTimeout(function () {
        Gamification.showLevelUp(result.level.level, Gamification.getTitle(result.level.level))
          .then(function () { renderAll(); });
      }, 1900);
    }

    renderAll();
  }

  /* ── Modal ── */
  function openModal(type, item) {
    editingType = type;
    editingId = item ? item.id : null;

    var modal = document.getElementById('modal');
    var title = document.getElementById('modal-title');
    var deleteBtn = document.getElementById('modal-delete');

    document.getElementById('modal-type').value = type;
    document.getElementById('modal-id').value = editingId || '';
    document.getElementById('modal-text').value = item ? item.text : '';

    var catField = document.getElementById('modal-category');
    var priField = document.getElementById('modal-priority');
    var timeField = document.getElementById('modal-timeblock');

    if (type === 'habit') {
      title.textContent = editingId ? 'Edit Habit' : 'New Habit';
      catField.parentElement.style.display = 'none';
      priField.parentElement.style.display = 'none';
      timeField.parentElement.style.display = 'none';
    } else {
      title.textContent = editingId ? 'Edit Task' : 'New Task';
      catField.parentElement.style.display = '';
      priField.parentElement.style.display = '';
      timeField.parentElement.style.display = '';
      catField.value = item ? item.category : 'life';
      priField.value = item ? item.priority : 'medium';
      timeField.value = item ? item.timeblock : 'anytime';
    }

    deleteBtn.classList.toggle('hidden', !editingId);
    modal.classList.remove('hidden');
    document.getElementById('modal-text').focus();
  }

  function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    editingId = null;
  }

  function handleModalSubmit(e) {
    e.preventDefault();
    var text = document.getElementById('modal-text').value.trim();
    if (!text) return;

    if (editingType === 'habit') {
      if (editingId) {
        var habit = data.habits.find(function (h) { return h.id === editingId; });
        if (habit) habit.text = text;
        Store.save(data);
      } else {
        Store.addHabit(data, { text: text });
      }
    } else {
      var payload = {
        text: text,
        category: document.getElementById('modal-category').value,
        priority: document.getElementById('modal-priority').value,
        timeblock: document.getElementById('modal-timeblock').value
      };
      if (editingId) {
        Store.updateTask(data, editingId, payload);
      } else {
        Store.addTask(data, payload);
      }
    }

    closeModal();
    renderAll();
  }

  function handleDelete() {
    if (!editingId) return;
    if (editingType === 'habit') {
      Store.deleteHabit(data, editingId);
    } else {
      Store.deleteTask(data, editingId);
    }
    closeModal();
    renderAll();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* Boot */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
