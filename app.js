(function () {
  "use strict";

  var STORAGE_KEY = "plannr.state.v1";
  var XP_PER_LEVEL = 20;
  var REWARD_TARGET = 100;

  var prompts = [
    "Clear one visible surface for 3 minutes",
    "Drink a glass of water",
    "Put away 10 things",
    "Send one message you have been avoiding",
    "Do a 5 minute future-you favor",
    "Step outside or open a window",
    "Write the next tiny step",
    "Start the laundry loop",
    "Prep one simple meal component",
    "Pay, file, or delete one nagging thing"
  ];

  var celebrationLines = [
    "Tiny win banked. The streak engine likes that.",
    "Quest complete. Your future self just got a gift.",
    "That counts. Momentum does not need drama.",
    "Clean little dopamine hit secured.",
    "You did the thing. The board remembers."
  ];

  var defaultState = {
    tasks: [],
    xp: 0,
    streak: 0,
    lastWinDate: "",
    reward: "",
    rituals: {},
    createdAt: ""
  };

  var state = loadState();
  var today = getTodayKey();
  var toastTimer = null;

  var els = {
    dateLabel: document.getElementById("date-label"),
    motivationLine: document.getElementById("motivation-line"),
    levelValue: document.getElementById("level-value"),
    xpValue: document.getElementById("xp-value"),
    nextLevelLabel: document.getElementById("next-level-label"),
    streakValue: document.getElementById("streak-value"),
    winsValue: document.getElementById("wins-value"),
    taskForm: document.getElementById("task-form"),
    taskTitle: document.getElementById("task-title"),
    taskArea: document.getElementById("task-area"),
    taskEnergy: document.getElementById("task-energy"),
    taskList: document.getElementById("task-list"),
    taskTemplate: document.getElementById("task-template"),
    emptyState: document.getElementById("empty-state"),
    focusCard: document.getElementById("focus-card"),
    focusTitle: document.getElementById("focus-title"),
    focusDetail: document.getElementById("focus-detail"),
    clearDone: document.getElementById("clear-done"),
    resetDay: document.getElementById("reset-day"),
    surpriseTask: document.getElementById("surprise-task"),
    morningStatus: document.getElementById("morning-status"),
    eveningStatus: document.getElementById("evening-status"),
    rewardInput: document.getElementById("reward-input"),
    rewardMeter: document.getElementById("reward-meter"),
    rewardNote: document.getElementById("reward-note"),
    saveReward: document.getElementById("save-reward"),
    toast: document.getElementById("toast")
  };

  init();

  function init() {
    if (!state.createdAt) {
      state.createdAt = today;
      saveState();
    }

    els.dateLabel.textContent = formatToday();
    els.rewardInput.value = state.reward || "";

    els.taskForm.addEventListener("submit", onTaskSubmit);
    els.taskList.addEventListener("click", onTaskListClick);
    els.clearDone.addEventListener("click", clearCompletedTasks);
    els.resetDay.addEventListener("click", startFreshDay);
    els.surpriseTask.addEventListener("click", usePrompt);
    els.saveReward.addEventListener("click", saveReward);

    bindRituals();
    render();
    registerServiceWorker();
  }

  function loadState() {
    var stored = null;

    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      stored = null;
    }

    if (!stored) {
      return clone(defaultState);
    }

    try {
      return normalizeState(JSON.parse(stored));
    } catch (error) {
      return clone(defaultState);
    }
  }

  function normalizeState(value) {
    var next = clone(defaultState);
    var key;

    if (!value || typeof value !== "object") {
      return next;
    }

    for (key in next) {
      if (Object.prototype.hasOwnProperty.call(next, key) && value[key] !== undefined) {
        next[key] = value[key];
      }
    }

    if (!Array.isArray(next.tasks)) {
      next.tasks = [];
    }

    if (!next.rituals || typeof next.rituals !== "object") {
      next.rituals = {};
    }

    next.xp = Number(next.xp) || 0;
    next.streak = Number(next.streak) || 0;

    return next;
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("I could not save locally. Your browser may be out of storage.");
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function onTaskSubmit(event) {
    event.preventDefault();

    addTask({
      title: els.taskTitle.value,
      area: els.taskArea.value,
      energy: els.taskEnergy.value
    });

    els.taskForm.reset();
    els.taskEnergy.value = "Tiny";
    els.taskTitle.focus();
  }

  function addTask(input) {
    var title = trim(input.title);

    if (!title) {
      showToast("Give the quest a name first.");
      return;
    }

    state.tasks.unshift({
      id: makeId(),
      title: title,
      area: input.area || "Home",
      energy: input.energy || "Tiny",
      points: pointsForEnergy(input.energy),
      date: today,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: ""
    });

    saveState();
    render();
    showToast("Quest added. Make it embarrassingly easy to start.");
  }

  function onTaskListClick(event) {
    var item = closest(event.target, ".task-item");
    var taskId;

    if (!item) {
      return;
    }

    taskId = item.getAttribute("data-id");

    if (closest(event.target, ".complete-toggle")) {
      toggleTask(taskId);
      return;
    }

    if (closest(event.target, ".delete-task")) {
      deleteTask(taskId);
    }
  }

  function toggleTask(taskId) {
    var task = findTask(taskId);
    var line;

    if (!task) {
      return;
    }

    task.done = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : "";

    if (task.done) {
      state.xp += task.points;
      updateStreak();
      line = celebrationLines[Math.floor(Math.random() * celebrationLines.length)];
      showToast("+" + task.points + " XP. " + line);
    } else {
      state.xp = Math.max(0, state.xp - task.points);
      showToast("Quest reopened. No shame, just data.");
    }

    saveState();
    render();
    pulseStats();
  }

  function updateStreak() {
    if (state.lastWinDate === today) {
      return;
    }

    if (state.lastWinDate === getRelativeDayKey(-1)) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }

    state.lastWinDate = today;
  }

  function deleteTask(taskId) {
    var task = findTask(taskId);
    var tasks = [];
    var i;

    if (task && task.done) {
      state.xp = Math.max(0, state.xp - task.points);
    }

    for (i = 0; i < state.tasks.length; i += 1) {
      if (state.tasks[i].id !== taskId) {
        tasks.push(state.tasks[i]);
      }
    }

    state.tasks = tasks;
    saveState();
    render();
  }

  function clearCompletedTasks() {
    var remaining = [];
    var i;

    for (i = 0; i < state.tasks.length; i += 1) {
      if (!state.tasks[i].done) {
        remaining.push(state.tasks[i]);
      }
    }

    state.tasks = remaining;
    saveState();
    render();
    showToast("Wins cleared from the board, XP kept in the bank.");
  }

  function startFreshDay() {
    var tomorrowTasks = [];
    var i;

    for (i = 0; i < state.tasks.length; i += 1) {
      if (!state.tasks[i].done) {
        state.tasks[i].date = today;
        tomorrowTasks.push(state.tasks[i]);
      }
    }

    state.tasks = tomorrowTasks;
    ensureRitualDay();
    saveState();
    render();
    showToast("Fresh page. Unfinished quests rolled forward.");
  }

  function usePrompt() {
    els.taskTitle.value = prompts[Math.floor(Math.random() * prompts.length)];
    els.taskEnergy.value = "Tiny";
    els.taskTitle.focus();
  }

  function bindRituals() {
    var cards = document.querySelectorAll(".ritual-card");
    var i;

    for (i = 0; i < cards.length; i += 1) {
      cards[i].addEventListener("click", function () {
        toggleRitual(this.getAttribute("data-ritual"));
      });
    }
  }

  function ensureRitualDay() {
    if (!state.rituals[today]) {
      state.rituals[today] = {
        morning: false,
        evening: false
      };
    }
  }

  function toggleRitual(name) {
    ensureRitualDay();
    state.rituals[today][name] = !state.rituals[today][name];

    if (state.rituals[today][name]) {
      state.xp += 5;
      updateStreak();
      showToast("+5 XP. Ritual locked in.");
    } else {
      state.xp = Math.max(0, state.xp - 5);
      showToast("Ritual reopened.");
    }

    saveState();
    render();
    pulseStats();
  }

  function saveReward() {
    state.reward = trim(els.rewardInput.value);
    saveState();
    renderReward();
    showToast(state.reward ? "Reward saved. Chase the finish line." : "Reward cleared.");
  }

  function render() {
    renderStats();
    renderTasks();
    renderRituals();
    renderReward();
  }

  function renderStats() {
    var level = Math.floor(state.xp / XP_PER_LEVEL) + 1;
    var nextLevelXp = level * XP_PER_LEVEL;
    var wins = countTodayWins();

    els.levelValue.textContent = level;
    els.xpValue.textContent = state.xp;
    els.nextLevelLabel.textContent = Math.max(0, nextLevelXp - state.xp) + " until level " + (level + 1);
    els.streakValue.textContent = state.streak;
    els.winsValue.textContent = wins;

    if (wins === 0) {
      els.motivationLine.textContent = "Choose a tiny win. Starting is the whole game.";
    } else if (wins < 3) {
      els.motivationLine.textContent = "Momentum is online. Stack one more easy win.";
    } else {
      els.motivationLine.textContent = "You are officially on a roll. Protect the vibe.";
    }
  }

  function renderTasks() {
    var tasks = getTodayTasks();
    var nextTask = null;
    var fragment = document.createDocumentFragment();
    var i;

    els.taskList.innerHTML = "";

    for (i = 0; i < tasks.length; i += 1) {
      fragment.appendChild(renderTask(tasks[i]));

      if (!tasks[i].done && !nextTask) {
        nextTask = tasks[i];
      }
    }

    els.taskList.appendChild(fragment);
    els.emptyState.hidden = tasks.length > 0;

    if (nextTask) {
      els.focusCard.hidden = false;
      els.focusTitle.textContent = nextTask.title;
      els.focusDetail.textContent = nextTask.energy + " energy | " + nextTask.area + " | +" + nextTask.points + " XP";
    } else {
      els.focusCard.hidden = true;
    }
  }

  function renderTask(task) {
    var item = getTemplateNode();
    var title = item.querySelector(".task-copy strong");
    var meta = item.querySelector(".task-copy span");
    var points = item.querySelector(".task-points");
    var toggle = item.querySelector(".complete-toggle");

    item.setAttribute("data-id", task.id);
    title.textContent = task.title;
    meta.textContent = task.area + " | " + task.energy + " energy";
    points.textContent = "+" + task.points;
    toggle.setAttribute("aria-label", task.done ? "Reopen " + task.title : "Complete " + task.title);

    if (task.done) {
      item.className += " is-done";
    }

    return item;
  }

  function getTemplateNode() {
    if (els.taskTemplate.content) {
      return document.importNode(els.taskTemplate.content.firstElementChild, true);
    }

    var item = document.createElement("li");
    item.className = "task-item";
    item.innerHTML = '<button class="complete-toggle" type="button"></button><div class="task-copy"><strong></strong><span></span></div><span class="task-points"></span><button class="delete-task" type="button" aria-label="Delete task">x</button>';
    return item;
  }

  function renderRituals() {
    var rituals;
    ensureRitualDay();
    rituals = state.rituals[today];
    setRitualStatus("morning", rituals.morning);
    setRitualStatus("evening", rituals.evening);
  }

  function setRitualStatus(name, isDone) {
    var card = document.querySelector('.ritual-card[data-ritual="' + name + '"]');
    var label = name === "morning" ? els.morningStatus : els.eveningStatus;

    label.textContent = isDone ? "Done" : "Not done";

    if (isDone) {
      addClass(card, "is-done");
    } else {
      removeClass(card, "is-done");
    }
  }

  function renderReward() {
    var progress = state.xp % REWARD_TARGET;
    var reward = state.reward || "your chosen treat";

    if (state.xp > 0 && progress === 0) {
      progress = REWARD_TARGET;
    }

    els.rewardMeter.textContent = progress + "/" + REWARD_TARGET;

    if (progress >= REWARD_TARGET) {
      els.rewardNote.textContent = "Reward unlocked: " + reward + ". Take it on purpose.";
    } else {
      els.rewardNote.textContent = (REWARD_TARGET - progress) + " XP until " + reward + ".";
    }
  }

  function getTodayTasks() {
    var tasks = [];
    var i;

    for (i = 0; i < state.tasks.length; i += 1) {
      if (state.tasks[i].date === today) {
        tasks.push(state.tasks[i]);
      }
    }

    return tasks;
  }

  function countTodayWins() {
    var count = 0;
    var tasks = getTodayTasks();
    var i;

    for (i = 0; i < tasks.length; i += 1) {
      if (tasks[i].done) {
        count += 1;
      }
    }

    return count;
  }

  function findTask(taskId) {
    var i;

    for (i = 0; i < state.tasks.length; i += 1) {
      if (state.tasks[i].id === taskId) {
        return state.tasks[i];
      }
    }

    return null;
  }

  function pointsForEnergy(energy) {
    if (energy === "Boss") {
      return 25;
    }

    if (energy === "Medium") {
      return 15;
    }

    return 10;
  }

  function getTodayKey() {
    return getRelativeDayKey(0);
  }

  function getRelativeDayKey(offset) {
    var date = new Date();
    date.setDate(date.getDate() + offset);
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function formatToday() {
    var date = new Date();
    var names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return names[date.getDay()] + ", " + months[date.getMonth()] + " " + date.getDate();
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function makeId() {
    return "task-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
  }

  function trim(value) {
    return String(value || "").replace(/^\s+|\s+$/g, "");
  }

  function closest(node, selector) {
    while (node && node !== document) {
      if (matches(node, selector)) {
        return node;
      }
      node = node.parentNode;
    }

    return null;
  }

  function matches(node, selector) {
    var proto = Element.prototype;
    var fn = proto.matches || proto.msMatchesSelector || proto.webkitMatchesSelector;

    if (!node || node.nodeType !== 1) {
      return false;
    }

    if (fn) {
      return fn.call(node, selector);
    }

    return false;
  }

  function addClass(node, className) {
    if (!node) {
      return;
    }

    if (node.classList) {
      node.classList.add(className);
    } else if ((" " + node.className + " ").indexOf(" " + className + " ") === -1) {
      node.className += " " + className;
    }
  }

  function removeClass(node, className) {
    if (!node) {
      return;
    }

    if (node.classList) {
      node.classList.remove(className);
    } else {
      node.className = (" " + node.className + " ").replace(" " + className + " ", " ").replace(/^\s+|\s+$/g, "");
    }
  }

  function pulseStats() {
    var cards = document.querySelectorAll(".stat-card");
    var i;

    for (i = 0; i < cards.length; i += 1) {
      removeClass(cards[i], "win-pulse");
      /* Trigger a reflow so repeating wins can replay the pulse. */
      cards[i].offsetWidth;
      addClass(cards[i], "win-pulse");
    }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;

    toastTimer = window.setTimeout(function () {
      els.toast.hidden = true;
    }, 3200);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* Offline caching is a bonus; the planner still works without it. */
      });
    });
  }
}());
