/**
 * Data store — localStorage persistence
 */
var Store = (function () {
  var KEY = 'plannr_data';

  var DEFAULT = {
    tasks: [],
    habits: [],
    stats: {
      totalXp: 0,
      xpToday: 0,
      xpTodayDate: '',
      totalCompleted: 0,
      streak: 0,
      bestStreak: 0,
      lastActiveDate: '',
      perfectDays: 0,
      level: 1
    }
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var data = JSON.parse(raw);
      return mergeDefaults(data);
    } catch (e) {
      return clone(DEFAULT);
    }
  }

  function mergeDefaults(data) {
    var result = clone(DEFAULT);
    if (data.tasks) result.tasks = data.tasks;
    if (data.habits) result.habits = data.habits;
    if (data.stats) {
      for (var k in DEFAULT.stats) {
        if (data.stats[k] !== undefined) result.stats[k] = data.stats[k];
      }
    }
    return result;
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* storage full — silent fail on Kindle */
    }
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function resetXpToday(stats) {
    var today = Gamification.todayKey();
    if (stats.xpTodayDate !== today) {
      stats.xpToday = 0;
      stats.xpTodayDate = today;
    }
    return stats;
  }

  /* Tasks */
  function addTask(data, task) {
    task.id = uid();
    task.createdAt = Date.now();
    task.completed = false;
    task.completedAt = null;
    data.tasks.push(task);
    save(data);
    return task;
  }

  function updateTask(data, id, updates) {
    var task = data.tasks.find(function (t) { return t.id === id; });
    if (!task) return null;
    for (var k in updates) task[k] = updates[k];
    save(data);
    return task;
  }

  function deleteTask(data, id) {
    data.tasks = data.tasks.filter(function (t) { return t.id !== id; });
    save(data);
  }

  function completeTask(data, id) {
    var task = data.tasks.find(function (t) { return t.id === id; });
    if (!task || task.completed) return null;

    task.completed = true;
    task.completedAt = Date.now();

    var xp = Gamification.XP_TABLE[task.priority] || 10;
    data.stats = resetXpToday(data.stats);
    data.stats.totalXp += xp;
    data.stats.xpToday += xp;
    data.stats.totalCompleted += 1;
    data.stats = Gamification.updateStreak(data.stats);

    var lvl = Gamification.getLevel(data.stats.totalXp);
    var leveledUp = lvl.level > data.stats.level;
    data.stats.level = lvl.level;

    save(data);
    return { task: task, xp: xp, leveledUp: leveledUp, level: lvl };
  }

  function uncompleteTask(data, id) {
    var task = data.tasks.find(function (t) { return t.id === id; });
    if (!task || !task.completed) return null;

    task.completed = false;
    task.completedAt = null;

    var xp = Gamification.XP_TABLE[task.priority] || 10;
    data.stats.totalXp = Math.max(0, data.stats.totalXp - xp);
    data.stats = resetXpToday(data.stats);
    data.stats.xpToday = Math.max(0, data.stats.xpToday - xp);
    data.stats.totalCompleted = Math.max(0, data.stats.totalCompleted - 1);

    var lvl = Gamification.getLevel(data.stats.totalXp);
    data.stats.level = lvl.level;

    save(data);
    return task;
  }

  /* Habits */
  function addHabit(data, habit) {
    habit.id = uid();
    habit.streak = 0;
    habit.lastDone = '';
    habit.completedToday = false;
    data.habits.push(habit);
    save(data);
    return habit;
  }

  function deleteHabit(data, id) {
    data.habits = data.habits.filter(function (h) { return h.id !== id; });
    save(data);
  }

  function toggleHabit(data, id) {
    var habit = data.habits.find(function (h) { return h.id === id; });
    if (!habit) return null;

    var today = Gamification.todayKey();
    var xp = 0;
    var leveledUp = false;
    var lvl;

    if (habit.completedToday) {
      habit.completedToday = false;
      data.stats.totalXp = Math.max(0, data.stats.totalXp - Gamification.HABIT_XP);
      data.stats = resetXpToday(data.stats);
      data.stats.xpToday = Math.max(0, data.stats.xpToday - Gamification.HABIT_XP);
    } else {
      habit.completedToday = true;

      if (habit.lastDone) {
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var yKey = yesterday.getFullYear() + '-' +
          (yesterday.getMonth() + 1 < 10 ? '0' : '') + (yesterday.getMonth() + 1) + '-' +
          (yesterday.getDate() < 10 ? '0' : '') + yesterday.getDate();

        if (habit.lastDone === yKey) {
          habit.streak += 1;
        } else if (habit.lastDone !== today) {
          habit.streak = 1;
        }
      } else {
        habit.streak = 1;
      }
      habit.lastDone = today;

      xp = Gamification.HABIT_XP;
      if (habit.streak >= 7) xp += 10;
      if (habit.streak >= 30) xp += 25;

      data.stats = resetXpToday(data.stats);
      data.stats.totalXp += xp;
      data.stats.xpToday += xp;
      data.stats = Gamification.updateStreak(data.stats);

      lvl = Gamification.getLevel(data.stats.totalXp);
      leveledUp = lvl.level > data.stats.level;
      data.stats.level = lvl.level;
    }

    save(data);
    return { habit: habit, xp: xp, leveledUp: leveledUp, level: lvl };
  }

  function resetHabitsDaily(data) {
    var today = Gamification.todayKey();
    var changed = false;
    data.habits.forEach(function (h) {
      if (h.lastDone && h.lastDone !== today) {
        h.completedToday = false;
        changed = true;
      }
    });
    if (changed) save(data);
  }

  function checkPerfectDay(data) {
    var today = Gamification.todayKey();
    var todayTasks = data.tasks.filter(function (t) {
      return !t.completedAt || isSameDay(t.completedAt, today);
    });
    var incomplete = todayTasks.filter(function (t) { return !t.completed; });
    if (todayTasks.length > 0 && incomplete.length === 0) {
      data.stats.perfectDays = (data.stats.perfectDays || 0) + 1;
      save(data);
    }
  }

  function isSameDay(ts, dayKey) {
    var d = new Date(ts);
    var key = d.getFullYear() + '-' +
      (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '-' +
      (d.getDate() < 10 ? '0' : '') + d.getDate();
    return key === dayKey;
  }

  function getTodayTasks(data) {
    return data.tasks.filter(function (t) { return !t.completed || isToday(t); });
  }

  function isToday(task) {
    if (task.completed && task.completedAt) {
      return isSameDay(task.completedAt, Gamification.todayKey());
    }
    return !task.completed;
  }

  return {
    load: load,
    save: save,
    uid: uid,
    resetXpToday: resetXpToday,
    addTask: addTask,
    updateTask: updateTask,
    deleteTask: deleteTask,
    completeTask: completeTask,
    uncompleteTask: uncompleteTask,
    addHabit: addHabit,
    deleteHabit: deleteHabit,
    toggleHabit: toggleHabit,
    resetHabitsDaily: resetHabitsDaily,
    checkPerfectDay: checkPerfectDay,
    getTodayTasks: getTodayTasks,
    isToday: isToday
  };
})();
