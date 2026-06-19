const STORAGE_KEY = "plannr-v1";
const XP_PER_LEVEL = 100;

const starterHabits = ["10 min tidy up", "Hydrate x3", "Stretch break"];

let state = loadState();
let activeFilter = "today";

const refs = {
  taskForm: document.getElementById("taskForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskCategory: document.getElementById("taskCategory"),
  taskDueDate: document.getElementById("taskDueDate"),
  taskList: document.getElementById("taskList"),
  levelLabel: document.getElementById("levelLabel"),
  xpLabel: document.getElementById("xpLabel"),
  xpProgress: document.getElementById("xpProgress"),
  streakCount: document.getElementById("streakCount"),
  doneTodayCount: document.getElementById("doneTodayCount"),
  completionRate: document.getElementById("completionRate"),
  questHint: document.getElementById("questHint"),
  habitForm: document.getElementById("habitForm"),
  habitTitle: document.getElementById("habitTitle"),
  habitList: document.getElementById("habitList"),
  burstLayer: document.getElementById("burstLayer"),
  morningPlan: document.getElementById("morningPlan"),
  afternoonPlan: document.getElementById("afternoonPlan"),
  eveningPlan: document.getElementById("eveningPlan"),
  chips: document.querySelectorAll(".chip"),
};

boot();

function boot() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Older devices can still run without worker support.
    });
  }

  hydratePlannerInputs();
  bindEvents();
  render();
}

function bindEvents() {
  refs.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = refs.taskTitle.value.trim();
    if (!title) return;

    const formData = new FormData(refs.taskForm);
    const difficulty = formData.get("difficulty") || "easy";

    state.tasks.unshift({
      id: createId(),
      title,
      category: refs.taskCategory.value.trim() || "general",
      dueDate: refs.taskDueDate.value || "",
      difficulty,
      xp: xpFor(difficulty),
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: "",
    });

    refs.taskForm.reset();
    refs.taskTitle.focus();
    persistAndRender();
  });

  refs.taskList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const taskId = button.dataset.id;
    const action = button.dataset.action;
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;

    if (action === "toggle") {
      task.done = !task.done;
      task.completedAt = task.done ? new Date().toISOString() : "";
      if (task.done) {
        gainXp(task.xp, `Mission done +${task.xp} XP`);
        markTodayComplete();
      }
    } else if (action === "delete") {
      state.tasks = state.tasks.filter((item) => item.id !== taskId);
    }

    persistAndRender();
  });

  refs.habitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = refs.habitTitle.value.trim();
    if (!title) return;
    state.habits.push({ id: createId(), title, history: [] });
    refs.habitForm.reset();
    persistAndRender();
  });

  refs.habitList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-habit-id]");
    if (!button) return;
    const habitId = button.dataset.habitId;
    const habit = state.habits.find((item) => item.id === habitId);
    if (!habit) return;

    const today = todayISO();
    const doneToday = habit.history.includes(today);
    habit.history = doneToday ? habit.history.filter((day) => day !== today) : [...habit.history, today];

    if (!doneToday) {
      gainXp(5, "Daily boost +5 XP");
      markTodayComplete();
    }

    persistAndRender();
  });

  refs.chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.filter;
      refs.chips.forEach((item) => item.classList.toggle("active", item === chip));
      renderTasks();
    });
  });

  refs.morningPlan.addEventListener("input", savePlannerText);
  refs.afternoonPlan.addEventListener("input", savePlannerText);
  refs.eveningPlan.addEventListener("input", savePlannerText);
}

function render() {
  renderStats();
  renderTasks();
  renderHabits();
}

function renderStats() {
  const level = Math.floor(state.xp / XP_PER_LEVEL) + 1;
  const withinLevelXp = state.xp % XP_PER_LEVEL;
  const completionRate = scoreCompletionRate();
  refs.levelLabel.textContent = `Level ${level}`;
  refs.xpLabel.textContent = `${state.xp} XP`;
  refs.xpProgress.style.width = `${withinLevelXp}%`;
  refs.streakCount.textContent = streakFromCompletionDays();
  refs.doneTodayCount.textContent = tasksDoneToday();
  refs.completionRate.textContent = completionRate;
}

function renderTasks() {
  const filtered = filteredTasks();
  refs.taskList.innerHTML = "";

  const quest = filtered.find((task) => !task.done) || state.tasks.find((task) => !task.done);
  refs.questHint.textContent = quest
    ? `Today's starter quest: ${quest.title}`
    : "No open quests. Add one and keep your streak alive.";

  if (filtered.length === 0) {
    refs.taskList.innerHTML = '<li class="task-item">No missions in this view yet.</li>';
    return;
  }

  filtered.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item ${task.done ? "done" : ""}`;
    li.innerHTML = `
      <div class="task-main">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <div class="meta">
            <span class="badge">${escapeHtml(task.category)}</span>
            <span class="badge">${task.difficulty}</span>
            <span class="badge">+${task.xp} XP</span>
            ${task.dueDate ? `<span class="badge">due ${formatDate(task.dueDate)}</span>` : ""}
          </div>
        </div>
        <div class="task-actions">
          <button type="button" class="done-btn" data-action="toggle" data-id="${task.id}">${
            task.done ? "Undo" : "Done"
          }</button>
          <button type="button" class="delete-btn" data-action="delete" data-id="${task.id}">Delete</button>
        </div>
      </div>
    `;
    refs.taskList.appendChild(li);
  });
}

function renderHabits() {
  const today = todayISO();
  refs.habitList.innerHTML = "";

  state.habits.forEach((habit) => {
    const doneToday = habit.history.includes(today);
    const streak = streakFromHistory(habit.history);
    const li = document.createElement("li");
    li.className = "habit-item";
    li.innerHTML = `
      <div class="habit-main">
        <div>
          <strong>${escapeHtml(habit.title)}</strong>
          <p class="meta">${streak} day streak</p>
        </div>
        <button
          type="button"
          class="toggle ${doneToday ? "on" : ""}"
          data-habit-id="${habit.id}"
        >
          ${doneToday ? "Done ✅" : "Mark"}
        </button>
      </div>
    `;
    refs.habitList.appendChild(li);
  });
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultState();
    const parsed = JSON.parse(raw);
    const fallback = makeDefaultState();
    return {
      ...fallback,
      ...parsed,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      habits: Array.isArray(parsed.habits) ? parsed.habits : fallback.habits,
      completionDays: Array.isArray(parsed.completionDays) ? parsed.completionDays : [],
      plans: parsed.plans && typeof parsed.plans === "object" ? parsed.plans : {},
    };
  } catch {
    return makeDefaultState();
  }
}

function gainXp(amount, message) {
  state.xp += amount;
  celebrate(message);
}

function celebrate(message) {
  const note = document.createElement("div");
  note.className = "burst";
  note.textContent = message;
  refs.burstLayer.appendChild(note);
  setTimeout(() => note.remove(), 950);

  for (let i = 0; i < 18; i += 1) {
    const spark = document.createElement("div");
    spark.className = "spark";
    spark.style.left = `${40 + Math.random() * 20}%`;
    spark.style.bottom = `${80 + Math.random() * 40}px`;
    spark.style.background = sparkColor(i);
    spark.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 220)}px`);
    spark.style.setProperty("--dy", `${Math.round(Math.random() * -260 - 20)}px`);
    refs.burstLayer.appendChild(spark);
    setTimeout(() => spark.remove(), 1020);
  }
}

function sparkColor(index) {
  const palette = ["#8f6bff", "#ff5bd8", "#37f0d0", "#ffdf4f", "#66ff85"];
  return palette[index % palette.length];
}

function markTodayComplete() {
  const today = todayISO();
  if (!state.completionDays.includes(today)) {
    state.completionDays.push(today);
    state.completionDays.sort();
  }
}

function tasksDoneToday() {
  const today = todayISO();
  return state.tasks.filter((task) => task.done && task.completedAt.startsWith(today)).length;
}

function scoreCompletionRate() {
  if (!state.tasks.length) return 0;
  const done = state.tasks.filter((task) => task.done).length;
  return Math.round((done / state.tasks.length) * 100);
}

function streakFromCompletionDays() {
  return streakFromHistory(state.completionDays);
}

function streakFromHistory(history) {
  if (!history.length) return 0;
  const set = new Set(history);
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;

  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function filteredTasks() {
  const today = todayISO();
  const weekEnd = addDays(today, 6);

  if (activeFilter === "done") {
    return state.tasks.filter((task) => task.done);
  }
  if (activeFilter === "all") {
    return state.tasks;
  }
  if (activeFilter === "week") {
    return state.tasks.filter((task) => !task.dueDate || between(task.dueDate, today, weekEnd));
  }
  return state.tasks.filter((task) => {
    if (task.done) return false;
    if (!task.dueDate) return true;
    return task.dueDate <= today;
  });
}

function xpFor(difficulty) {
  if (difficulty === "hard") return 35;
  if (difficulty === "medium") return 20;
  return 10;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const copy = new Date(isoDate);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

function between(value, min, max) {
  return value >= min && value <= max;
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function savePlannerText() {
  const today = todayISO();
  state.plans[today] = {
    morning: refs.morningPlan.value,
    afternoon: refs.afternoonPlan.value,
    evening: refs.eveningPlan.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hydratePlannerInputs() {
  const plan = state.plans[todayISO()] || {};
  refs.morningPlan.value = plan.morning || "";
  refs.afternoonPlan.value = plan.afternoon || "";
  refs.eveningPlan.value = plan.evening || "";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char];
  });
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeDefaultState() {
  return {
    xp: 0,
    tasks: [],
    habits: starterHabits.map((title) => ({ id: createId(), title, history: [] })),
    completionDays: [],
    plans: {},
  };
}
