/**
 * Data store — localStorage persistence
 */
var Store = (function () {
  var KEY = 'plannr_data';

  var DEFAULT = {
    tasks: [],
    habits: [],
    goals: [],
    character: null,
    shopRewards: [],
    redemptions: [],
    stats: {
      totalXp: 0,
      walletXp: 0,
      xpToday: 0,
      xpTodayDate: '',
      totalCompleted: 0,
      goalsCompleted: 0,
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
    if (data.tasks) result.tasks = migrateTasks(data.tasks);
    if (data.habits) result.habits = data.habits;
    if (data.goals) result.goals = data.goals;
    if (data.shopRewards) result.shopRewards = data.shopRewards;
    if (data.redemptions) result.redemptions = data.redemptions;
    if (!data.shopRewards || data.shopRewards.length === 0) {
      if (!data.tasks || data.tasks.length === 0) {
        result.shopRewards = getStarterLoot();
      } else {
        result.shopRewards = [];
      }
    }
    if (data.stats) {
      for (var k in DEFAULT.stats) {
        if (data.stats[k] !== undefined) result.stats[k] = data.stats[k];
      }
      if (data.stats.walletXp === undefined) {
        result.stats.walletXp = data.stats.totalXp || 0;
      }
    }
    result.character = migrateCharacter(data.character);
    return result;
  }

  function migrateCharacter(character) {
    var base = clone(RPG.DEFAULT_CHARACTER);
    if (!character) return base;
    base.name = character.name || base.name;
    base.skinId = character.skinId || base.skinId;
    base.unlockedSkins = character.unlockedSkins || base.unlockedSkins;
    if (base.unlockedSkins.indexOf('default') === -1) {
      base.unlockedSkins.unshift('default');
    }
    return base;
  }

  function migrateTasks(tasks) {
    var today = Planning.todayKey();
    return tasks.map(function (t) {
      if (!t.horizon) t.horizon = 'daily';
      if (!t.targetDate) t.targetDate = today;
      if (t.goalId === undefined) t.goalId = null;
      return t;
    });
  }

  function getStarterLoot() {
    return [
      { id: 'loot_tv', name: '30 min guilt-free screen time', icon: '📺', cost: 40, desc: 'Couch mode activated' },
      { id: 'loot_coffee', name: 'Fancy coffee or treat', icon: '☕', cost: 75, desc: 'A small luxury you earned' },
      { id: 'loot_game', name: '1 hour of gaming', icon: '🎮', cost: 120, desc: 'Play without the guilt' }
    ];
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

  function earnXp(data, amount) {
    data.stats.totalXp += amount;
    data.stats.walletXp = (data.stats.walletXp || 0) + amount;
    data.stats = resetXpToday(data.stats);
    data.stats.xpToday += amount;
    var lvl = Gamification.getLevel(data.stats.totalXp);
    var leveledUp = lvl.level > data.stats.level;
    data.stats.level = lvl.level;
    return { leveledUp: leveledUp, level: lvl };
  }

  function spendXp(data, amount) {
    if ((data.stats.walletXp || 0) < amount) return false;
    data.stats.walletXp -= amount;
    save(data);
    return true;
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
    if (!task.horizon) task.horizon = 'daily';
    if (!task.targetDate) task.targetDate = Planning.todayKey();
    if (task.goalId === undefined) task.goalId = null;
    data.tasks.push(task);
    save(data);
    syncGoalProgress(data, task.goalId);
    return task;
  }

  function updateTask(data, id, updates) {
    var task = data.tasks.find(function (t) { return t.id === id; });
    if (!task) return null;
    var oldGoalId = task.goalId;
    for (var k in updates) task[k] = updates[k];
    save(data);
    syncGoalProgress(data, oldGoalId);
    syncGoalProgress(data, task.goalId);
    return task;
  }

  function deleteTask(data, id) {
    var task = data.tasks.find(function (t) { return t.id === id; });
    var goalId = task ? task.goalId : null;
    data.tasks = data.tasks.filter(function (t) { return t.id !== id; });
    save(data);
    syncGoalProgress(data, goalId);
  }

  function completeTask(data, id) {
    var task = data.tasks.find(function (t) { return t.id === id; });
    if (!task || task.completed) return null;

    task.completed = true;
    task.completedAt = Date.now();

    var xp = Gamification.XP_TABLE[task.priority] || 10;
    if (task.horizon && task.horizon !== 'daily') {
      xp = Math.round(xp * 1.5);
    }

    data.stats.totalCompleted += 1;
    data.stats = Gamification.updateStreak(data.stats);
    var xpResult = earnXp(data, xp);

    save(data);
    syncGoalProgress(data, task.goalId);
    return { task: task, xp: xp, leveledUp: xpResult.leveledUp, level: xpResult.level };
  }

  function uncompleteTask(data, id) {
    var task = data.tasks.find(function (t) { return t.id === id; });
    if (!task || !task.completed) return null;

    task.completed = false;
    task.completedAt = null;

    var xp = Gamification.XP_TABLE[task.priority] || 10;
    if (task.horizon && task.horizon !== 'daily') {
      xp = Math.round(xp * 1.5);
    }

    data.stats.totalXp = Math.max(0, data.stats.totalXp - xp);
    data.stats.walletXp = Math.max(0, (data.stats.walletXp || 0) - xp);
    data.stats = resetXpToday(data.stats);
    data.stats.xpToday = Math.max(0, data.stats.xpToday - xp);
    data.stats.totalCompleted = Math.max(0, data.stats.totalCompleted - 1);

    var lvl = Gamification.getLevel(data.stats.totalXp);
    data.stats.level = lvl.level;

    save(data);
    syncGoalProgress(data, task.goalId);
    return task;
  }

  function getTasksForPeriod(data, horizon, periodKeyVal) {
    return data.tasks.filter(function (t) {
      return Planning.isInPeriod(t, horizon, periodKeyVal);
    }).sort(function (a, b) {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  /* Goals */
  function addGoal(data, goal) {
    goal.id = uid();
    goal.createdAt = Date.now();
    goal.completed = false;
    goal.completedAt = null;
    goal.milestones = goal.milestones || [];
    goal.progress = goal.progress || 0;
    if (!goal.horizon) goal.horizon = 'yearly';
    if (!goal.targetDate) {
      goal.targetDate = Planning.defaultTargetDate(goal.horizon, Planning.periodKey(goal.horizon, new Date()));
    }
    data.goals.push(goal);
    save(data);
    return goal;
  }

  function updateGoal(data, id, updates) {
    var goal = data.goals.find(function (g) { return g.id === id; });
    if (!goal) return null;
    for (var k in updates) goal[k] = updates[k];
    save(data);
    return goal;
  }

  function deleteGoal(data, id) {
    data.tasks.forEach(function (t) {
      if (t.goalId === id) t.goalId = null;
    });
    data.goals = data.goals.filter(function (g) { return g.id !== id; });
    save(data);
  }

  function toggleMilestone(data, goalId, milestoneId) {
    var goal = data.goals.find(function (g) { return g.id === goalId; });
    if (!goal || !goal.milestones) return null;

    var ms = goal.milestones.find(function (m) { return m.id === milestoneId; });
    if (!ms) return null;

    ms.done = !ms.done;
    recomputeGoalProgress(data, goal);
    save(data);

    if (goal.progress >= 100 && !goal.completed) {
      return completeGoal(data, goalId);
    }
    return { goal: goal, xp: 0, justCompleted: false };
  }

  function completeGoal(data, id) {
    var goal = data.goals.find(function (g) { return g.id === id; });
    if (!goal || goal.completed) return null;

    goal.completed = true;
    goal.completedAt = Date.now();
    goal.progress = 100;
    if (goal.milestones) {
      goal.milestones.forEach(function (m) { m.done = true; });
    }

    var xp = Gamification.GOAL_XP;
    data.stats.goalsCompleted = (data.stats.goalsCompleted || 0) + 1;
    data.stats = Gamification.updateStreak(data.stats);
    var xpResult = earnXp(data, xp);

    save(data);
    return { goal: goal, xp: xp, leveledUp: xpResult.leveledUp, level: xpResult.level };
  }

  function syncGoalProgress(data, goalId) {
    if (!goalId) return;
    var goal = data.goals.find(function (g) { return g.id === goalId; });
    if (!goal) return;
    recomputeGoalProgress(data, goal);
    save(data);
  }

  function recomputeGoalProgress(data, goal) {
    var linked = data.tasks.filter(function (t) { return t.goalId === goal.id; });
    var msDone = 0;
    var msTotal = 0;
    if (goal.milestones && goal.milestones.length) {
      msTotal = goal.milestones.length;
      msDone = goal.milestones.filter(function (m) { return m.done; }).length;
    }
    var taskDone = linked.filter(function (t) { return t.completed; }).length;
    var taskTotal = linked.length;

    if (msTotal > 0 && taskTotal > 0) {
      goal.progress = Math.round(((msDone / msTotal) * 0.5 + (taskDone / taskTotal) * 0.5) * 100);
    } else if (msTotal > 0) {
      goal.progress = Math.round((msDone / msTotal) * 100);
    } else if (taskTotal > 0) {
      goal.progress = Math.round((taskDone / taskTotal) * 100);
    }

    if (goal.progress >= 100 && !goal.completed) {
      goal.progress = 100;
    }
  }

  function getGoalsForHorizon(data, horizon) {
    return data.goals.filter(function (g) {
      return !g.completed && g.horizon === horizon;
    }).sort(function (a, b) {
      return (a.targetDate || '').localeCompare(b.targetDate || '');
    });
  }

  function getActiveGoals(data) {
    return data.goals.filter(function (g) { return !g.completed; })
      .sort(function (a, b) { return (a.targetDate || '').localeCompare(b.targetDate || ''); });
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
      data.stats.walletXp = Math.max(0, (data.stats.walletXp || 0) - Gamification.HABIT_XP);
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

      data.stats = Gamification.updateStreak(data.stats);
      var xpResult = earnXp(data, xp);
      leveledUp = xpResult.leveledUp;
      lvl = xpResult.level;
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
    var today = Planning.todayKey();
    var todayTasks = getTodayTasks(data);
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
    var today = Planning.todayKey();
    return data.tasks.filter(function (t) {
      var horizon = t.horizon || 'daily';
      if (horizon !== 'daily') return false;
      if (t.targetDate !== today) return false;
      return !t.completed || isToday(t);
    });
  }

  function isToday(task) {
    if (task.completed && task.completedAt) {
      return isSameDay(task.completedAt, Planning.todayKey());
    }
    return !task.completed;
  }

  /* RPG — skins & loot shop */
  function buySkin(data, skinId) {
    var check = RPG.canBuySkin(data, skinId);
    if (!check.ok) return { ok: false, reason: check.reason };
    var skin = RPG.getSkin(skinId);
    if (!spendXp(data, skin.cost)) return { ok: false, reason: 'Not enough XP' };
    if (data.character.unlockedSkins.indexOf(skinId) === -1) {
      data.character.unlockedSkins.push(skinId);
    }
    data.character.skinId = skinId;
    save(data);
    return { ok: true, skin: skin };
  }

  function equipSkin(data, skinId) {
    if (!RPG.isSkinOwned(data.character, skinId)) return false;
    data.character.skinId = skinId;
    save(data);
    return true;
  }

  function setHeroName(data, name) {
    data.character.name = (name || 'Hero').trim().substring(0, 24);
    save(data);
  }

  function addShopReward(data, reward) {
    reward.id = uid();
    reward.createdAt = Date.now();
    reward.icon = reward.icon || '🎁';
    data.shopRewards.push(reward);
    save(data);
    return reward;
  }

  function deleteShopReward(data, id) {
    data.shopRewards = data.shopRewards.filter(function (r) { return r.id !== id; });
    save(data);
  }

  function redeemShopReward(data, id) {
    var reward = data.shopRewards.find(function (r) { return r.id === id; });
    if (!reward) return { ok: false, reason: 'Reward not found' };
    var check = RPG.canRedeemReward(data, reward);
    if (!check.ok) return { ok: false, reason: check.reason };
    if (!spendXp(data, reward.cost)) return { ok: false, reason: 'Not enough XP' };
    data.redemptions.push({
      id: uid(),
      rewardId: reward.id,
      name: reward.name,
      icon: reward.icon,
      cost: reward.cost,
      redeemedAt: Date.now()
    });
    save(data);
    return { ok: true, reward: reward };
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
    getTasksForPeriod: getTasksForPeriod,
    addGoal: addGoal,
    updateGoal: updateGoal,
    deleteGoal: deleteGoal,
    toggleMilestone: toggleMilestone,
    completeGoal: completeGoal,
    getGoalsForHorizon: getGoalsForHorizon,
    getActiveGoals: getActiveGoals,
    recomputeGoalProgress: recomputeGoalProgress,
    addHabit: addHabit,
    deleteHabit: deleteHabit,
    toggleHabit: toggleHabit,
    resetHabitsDaily: resetHabitsDaily,
    checkPerfectDay: checkPerfectDay,
    getTodayTasks: getTodayTasks,
    isToday: isToday,
    buySkin: buySkin,
    equipSkin: equipSkin,
    setHeroName: setHeroName,
    addShopReward: addShopReward,
    deleteShopReward: deleteShopReward,
    redeemShopReward: redeemShopReward
  };
})();
