/**
 * Plannr — main application UI
 */
(function () {
  var data = Store.load();
  var currentView = 'today';
  var currentCategory = 'all';
  var currentHorizon = 'daily';
  var currentPeriodKey = Planning.periodKey('daily', new Date());
  var currentGoalHorizon = 'all';
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

  function init() {
    Store.resetHabitsDaily(data);
    data.stats = Store.resetXpToday(data.stats);
    data.goals.forEach(function (g) {
      Store.recomputeGoalProgress(data, g);
    });
    bindEvents();
    renderAll();
  }

  function bindEvents() {
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchView(this.getAttribute('data-nav'));
      });
    });

    document.querySelectorAll('#category-tabs .tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentCategory = this.getAttribute('data-category');
        document.querySelectorAll('#category-tabs .tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        renderTaskList();
      });
    });

    document.querySelectorAll('#horizon-tabs .tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentHorizon = this.getAttribute('data-horizon');
        document.querySelectorAll('#horizon-tabs .tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        currentPeriodKey = Planning.periodKey(currentHorizon, new Date());
        renderPlan();
      });
    });

    document.querySelectorAll('#goal-horizon-tabs .tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentGoalHorizon = this.getAttribute('data-goal-horizon');
        document.querySelectorAll('#goal-horizon-tabs .tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        renderGoals();
      });
    });

    document.getElementById('period-prev').addEventListener('click', function () {
      currentPeriodKey = Planning.shiftPeriod(currentHorizon, currentPeriodKey, -1);
      renderPlan();
    });
    document.getElementById('period-next').addEventListener('click', function () {
      currentPeriodKey = Planning.shiftPeriod(currentHorizon, currentPeriodKey, 1);
      renderPlan();
    });
    document.getElementById('period-jump').addEventListener('click', function () {
      currentPeriodKey = Planning.periodKey(currentHorizon, new Date());
      renderPlan();
    });

    document.getElementById('add-task-today').addEventListener('click', function () {
      openModal('task', null, { horizon: 'daily', targetDate: Planning.todayKey() });
    });
    document.getElementById('add-task-plan').addEventListener('click', function () {
      openModal('task', null, {
        horizon: currentHorizon,
        targetDate: Planning.defaultTargetDate(currentHorizon, currentPeriodKey)
      });
    });
    document.getElementById('add-task').addEventListener('click', function () { openModal('task'); });
    document.getElementById('add-habit').addEventListener('click', function () { openModal('habit'); });
    document.getElementById('add-goal').addEventListener('click', function () { openModal('goal'); });

    document.getElementById('modal-horizon').addEventListener('change', updateModalDateField);
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

  function renderAll() {
    renderHeader();
    renderDailyProgress();
    renderToday();
    renderPlan();
    renderGoals();
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
    var today = Planning.todayKey();

    TIME_BLOCKS.forEach(function (block) {
      var tasks = data.tasks.filter(function (t) {
        return (t.horizon || 'daily') === 'daily' &&
          t.targetDate === today &&
          t.timeblock === block.id &&
          (!t.completed || Store.isToday(t));
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

  function renderPlan() {
    document.getElementById('period-label').textContent =
      Planning.formatPeriodLabel(currentHorizon, currentPeriodKey);

    var nowKey = Planning.periodKey(currentHorizon, new Date());
    var jumpBtn = document.getElementById('period-jump');
    jumpBtn.classList.toggle('hidden', currentPeriodKey === nowKey);

    var list = document.getElementById('plan-task-list');
    list.innerHTML = '';

    var tasks = Store.getTasksForPeriod(data, currentHorizon, currentPeriodKey);
    var isFuture = Planning.isFuturePeriod(currentHorizon, currentPeriodKey);

    if (tasks.length === 0) {
      var li = document.createElement('li');
      li.className = 'time-block-empty';
      li.textContent = isFuture
        ? 'Nothing planned yet — get ahead of future you!'
        : 'No items for this period. Tap + to add one.';
      list.appendChild(li);
      return;
    }

    tasks.forEach(function (task) {
      list.appendChild(createTaskElement(task, isFuture));
    });
  }

  function renderGoals() {
    var list = document.getElementById('goal-list');
    list.innerHTML = '';

    var goals = data.goals.filter(function (g) { return !g.completed; });
    if (currentGoalHorizon !== 'all') {
      goals = goals.filter(function (g) { return g.horizon === currentGoalHorizon; });
    }

    if (goals.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'time-block-empty';
      empty.textContent = 'Set a goal — monthly, quarterly, or yearly. Dream big!';
      list.appendChild(empty);
      return;
    }

    goals.forEach(function (goal) {
      list.appendChild(createGoalElement(goal));
    });
  }

  function createGoalElement(goal) {
    Store.recomputeGoalProgress(data, goal);
    var li = document.createElement('li');
    li.className = 'goal-card';

    var linkedCount = data.tasks.filter(function (t) { return t.goalId === goal.id; }).length;
    var deadline = goal.targetDate
      ? Planning.parseDate(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    var milestonesHtml = '';
    if (goal.milestones && goal.milestones.length) {
      milestonesHtml = '<ul class="goal-milestones">';
      goal.milestones.forEach(function (ms) {
        milestonesHtml +=
          '<li class="goal-milestone">' +
            '<button class="milestone-check' + (ms.done ? ' done' : '') + '" data-goal="' + goal.id + '" data-ms="' + ms.id + '">' +
              (ms.done ? '✓' : '') +
            '</button>' +
            '<span class="milestone-text' + (ms.done ? ' done' : '') + '">' + escapeHtml(ms.text) + '</span>' +
          '</li>';
      });
      milestonesHtml += '</ul>';
    }

    li.innerHTML =
      '<div class="goal-header">' +
        '<div class="goal-title">' + escapeHtml(goal.text) + '</div>' +
        '<span class="goal-horizon-badge">' + (Planning.HORIZON_LABELS[goal.horizon] || goal.horizon) + '</span>' +
      '</div>' +
      (goal.notes ? '<p class="goal-notes">' + escapeHtml(goal.notes) + '</p>' : '') +
      '<div class="goal-progress-wrap">' +
        '<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:' + (goal.progress || 0) + '%"></div></div>' +
        '<div class="goal-progress-text">' +
          '<span>' + (goal.progress || 0) + '% complete</span>' +
          '<span>' + linkedCount + ' linked tasks' + (deadline ? ' · due ' + deadline : '') + '</span>' +
        '</div>' +
      '</div>' +
      milestonesHtml +
      (goal.progress >= 100
        ? '<div class="goal-actions"><button class="btn btn-primary btn-sm goal-complete-btn" data-goal="' + goal.id + '">Complete goal (+50 XP)</button></div>'
        : '');

    li.querySelectorAll('.milestone-check').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        handleMilestoneToggle(goal.id, this.getAttribute('data-ms'));
      });
    });

    var completeBtn = li.querySelector('.goal-complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        completeGoalAction(goal.id);
      });
    }

    li.addEventListener('click', function () {
      openModal('goal', goal);
    });

    return li;
  }

  function renderTaskList() {
    var list = document.getElementById('task-list-all');
    if (!list) return;
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
      li.textContent = 'No tasks yet.';
      list.appendChild(li);
      return;
    }

    tasks.forEach(function (task) {
      list.appendChild(createTaskElement(task));
    });
  }

  function createTaskElement(task, isFuture) {
    var li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');
    var xp = Gamification.XP_TABLE[task.priority] || 10;
    if (task.horizon && task.horizon !== 'daily') xp = Math.round(xp * 1.5);

    var horizonTag = '';
    if (task.horizon && task.horizon !== 'daily') {
      horizonTag = '<span class="task-tag tag-horizon">' + Planning.HORIZON_LABELS[task.horizon] + '</span>';
    }
    if (isFuture) {
      horizonTag += '<span class="task-tag tag-future">Upcoming</span>';
    }

    var goalTag = '';
    if (task.goalId) {
      var g = data.goals.find(function (x) { return x.id === task.goalId; });
      if (g) goalTag = '<span class="task-tag tag-life">🎯 ' + escapeHtml(g.text).substring(0, 20) + '</span>';
    }

    li.innerHTML =
      '<button class="task-check' + (task.completed ? ' checked' : '') + '" aria-label="Toggle complete">' +
        (task.completed ? '✓' : '') +
      '</button>' +
      '<div class="task-body">' +
        '<div class="task-text">' + escapeHtml(task.text) + '</div>' +
        '<div class="task-meta">' +
          '<span class="task-tag tag-' + task.category + '">' + (CATEGORY_LABELS[task.category] || task.category) + '</span>' +
          horizonTag + goalTag +
          (task.priority === 'high' ? '<span class="task-tag tag-priority-high">Boss</span>' : '') +
        '</div>' +
      '</div>' +
      '<span class="task-xp">+' + xp + '</span>';

    li.querySelector('.task-check').addEventListener('click', function (e) {
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
        '<div class="task-body"><div class="task-text">' + escapeHtml(habit.text) + '</div></div>' +
        '<span class="habit-streak">🔥 ' + (habit.streak || 0) + '</span>' +
        '<div class="habit-streak-bar"><div class="habit-streak-fill" style="width:' + streakPct + '%"></div></div>';

      li.querySelector('.task-check').addEventListener('click', function (e) {
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

  function handleCelebration(result) {
    if (!result || !result.xp) return;
    Gamification.showCelebration(result.xp);
    if (result.leveledUp) {
      setTimeout(function () {
        Gamification.showLevelUp(result.level.level, Gamification.getTitle(result.level.level))
          .then(function () { renderAll(); });
      }, 1900);
    }
  }

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
    handleCelebration(result);
    Store.checkPerfectDay(data);
    renderAll();
  }

  function toggleHabit(id) {
    var result = Store.toggleHabit(data, id);
    if (!result || !result.xp) {
      renderAll();
      return;
    }
    handleCelebration(result);
    renderAll();
  }

  function handleMilestoneToggle(goalId, milestoneId) {
    var result = Store.toggleMilestone(data, goalId, milestoneId);
    if (result && result.xp) {
      handleCelebration(result);
    }
    renderAll();
  }

  function completeGoalAction(goalId) {
    var result = Store.completeGoal(data, goalId);
    if (!result) return;
    handleCelebration(result);
    renderAll();
  }

  function populateGoalLinkSelect(selectedId) {
    var sel = document.getElementById('modal-goal-link');
    sel.innerHTML = '<option value="">None</option>';
    Store.getActiveGoals(data).forEach(function (g) {
      var opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.text;
      if (g.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function setFieldVisibility(id, visible) {
    var el = document.getElementById(id);
    if (!el) return;
    var label = document.querySelector('label[for="' + id + '"]');
    el.style.display = visible ? '' : 'none';
    if (label) label.style.display = visible ? '' : 'none';
  }

  function openModal(type, item, defaults) {
    editingType = type;
    editingId = item ? item.id : null;
    defaults = defaults || {};

    document.getElementById('modal-type').value = type;
    document.getElementById('modal-id').value = editingId || '';
    document.getElementById('modal-text').value = item ? item.text : '';
    document.getElementById('modal-delete').classList.toggle('hidden', !editingId);

    var taskFields = ['modal-horizon', 'modal-target-date', 'modal-goal-link', 'modal-category', 'modal-priority', 'modal-timeblock'];
    var goalFields = ['modal-notes', 'modal-milestones'];
    var habitOnly = type === 'habit';
    var goalOnly = type === 'goal';

    document.getElementById('modal-title').textContent =
      editingId
        ? (goalOnly ? 'Edit Goal' : habitOnly ? 'Edit Habit' : 'Edit Task')
        : (goalOnly ? 'New Goal' : habitOnly ? 'New Habit' : 'New Task');

    taskFields.forEach(function (fid) {
      setFieldVisibility(fid, !goalOnly && !habitOnly);
    });
    goalFields.forEach(function (fid) {
      setFieldVisibility(fid, goalOnly);
    });

    if (!goalOnly && !habitOnly) {
      var horizon = item ? item.horizon : (defaults.horizon || 'daily');
      document.getElementById('modal-horizon').value = horizon;
      document.getElementById('modal-category').value = item ? item.category : 'life';
      document.getElementById('modal-priority').value = item ? item.priority : 'medium';
      document.getElementById('modal-timeblock').value = item ? item.timeblock : 'anytime';
      document.getElementById('modal-target-date').value = item
        ? item.targetDate
        : (defaults.targetDate || Planning.todayKey());
      populateGoalLinkSelect(item ? item.goalId : '');
      updateModalDateField();
    }

    if (goalOnly) {
      setFieldVisibility('modal-horizon', true);
      setFieldVisibility('modal-target-date', true);
      document.querySelector('label[for="modal-horizon"]').textContent = 'Goal timeframe';
      document.getElementById('modal-horizon').innerHTML =
        '<option value="monthly">Monthly</option>' +
        '<option value="quarterly">Quarterly</option>' +
        '<option value="yearly">Yearly</option>';
      document.getElementById('modal-horizon').value = item ? item.horizon : 'yearly';

      document.querySelector('label[for="modal-target-date"]').textContent = 'Target date';
      document.getElementById('modal-target-date').type = 'date';
      document.getElementById('modal-target-date').value = item
        ? item.targetDate
        : Planning.defaultTargetDate('yearly', Planning.yearKey(new Date()));

      document.getElementById('modal-notes').value = item ? (item.notes || '') : '';
      document.getElementById('modal-milestones').value = item && item.milestones
        ? item.milestones.map(function (m) { return m.text; }).join('\n')
        : '';
    } else {
      document.getElementById('modal-horizon').innerHTML =
        '<option value="daily">Daily</option>' +
        '<option value="weekly">Weekly</option>' +
        '<option value="monthly">Monthly</option>' +
        '<option value="quarterly">Quarterly</option>' +
        '<option value="yearly">Yearly</option>';
    }

    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal-text').focus();
  }

  function updateModalDateField() {
    var horizon = document.getElementById('modal-horizon').value;
    var timeField = document.getElementById('modal-timeblock');
    var label = document.querySelector('label[for="modal-target-date"]');
    setFieldVisibility('modal-timeblock', horizon === 'daily');

    if (horizon === 'daily') {
      label.textContent = 'Date';
      document.getElementById('modal-target-date').type = 'date';
    } else if (horizon === 'weekly') {
      label.textContent = 'Week of (pick any day in that week)';
      document.getElementById('modal-target-date').type = 'date';
    } else if (horizon === 'monthly') {
      label.textContent = 'Month';
      document.getElementById('modal-target-date').type = 'month';
    } else if (horizon === 'yearly') {
      label.textContent = 'Year';
      document.getElementById('modal-target-date').type = 'number';
      document.getElementById('modal-target-date').min = '2020';
      document.getElementById('modal-target-date').max = '2099';
      if (document.getElementById('modal-target-date').type === 'number') {
        document.getElementById('modal-target-date').value = new Date().getFullYear();
      }
    } else if (horizon === 'quarterly') {
      label.textContent = 'Quarter start date';
      document.getElementById('modal-target-date').type = 'date';
    }
  }

  function parseModalTargetDate(horizon) {
    var val = document.getElementById('modal-target-date').value;
    if (horizon === 'daily' || horizon === 'weekly') return val;
    if (horizon === 'monthly') return val + '-01';
    if (horizon === 'yearly') return val + '-01-01';
    if (horizon === 'quarterly') return val;
    return Planning.todayKey();
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
    } else if (editingType === 'goal') {
      var milestones = document.getElementById('modal-milestones').value
        .split('\n')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; })
        .map(function (s, i) {
          if (editingId) {
            var existing = data.goals.find(function (g) { return g.id === editingId; });
            if (existing && existing.milestones && existing.milestones[i]) {
              return { id: existing.milestones[i].id, text: s, done: existing.milestones[i].done };
            }
          }
          return { id: Store.uid(), text: s, done: false };
        });

      var goalPayload = {
        text: text,
        notes: document.getElementById('modal-notes').value.trim(),
        horizon: document.getElementById('modal-horizon').value,
        targetDate: parseModalTargetDate(document.getElementById('modal-horizon').value),
        milestones: milestones
      };

      if (editingId) {
        Store.updateGoal(data, editingId, goalPayload);
        var g = data.goals.find(function (x) { return x.id === editingId; });
        if (g) Store.recomputeGoalProgress(data, g);
      } else {
        Store.addGoal(data, goalPayload);
      }
    } else {
      var horizon = document.getElementById('modal-horizon').value;
      var payload = {
        text: text,
        category: document.getElementById('modal-category').value,
        priority: document.getElementById('modal-priority').value,
        timeblock: horizon === 'daily' ? document.getElementById('modal-timeblock').value : 'anytime',
        horizon: horizon,
        targetDate: parseModalTargetDate(horizon),
        goalId: document.getElementById('modal-goal-link').value || null
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
    if (editingType === 'habit') Store.deleteHabit(data, editingId);
    else if (editingType === 'goal') Store.deleteGoal(data, editingId);
    else Store.deleteTask(data, editingId);
    closeModal();
    renderAll();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
