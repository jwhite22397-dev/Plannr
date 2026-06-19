/**
 * AI Coach — OpenAI-powered planning advice
 * API key is stored locally on your device only (never in source code).
 */
var AICoach = (function () {
  var KEY_STORAGE = 'plannr_openai_key';
  var URL_STORAGE = 'plannr_coach_url';
  var CACHE_STORAGE = 'plannr_coach_cache';

  var DEFAULT_MODEL = 'gpt-4o-mini';

  function getApiKey() {
    try {
      return localStorage.getItem(KEY_STORAGE) || '';
    } catch (e) {
      return '';
    }
  }

  function setApiKey(key) {
    try {
      if (key) localStorage.setItem(KEY_STORAGE, key.trim());
      else localStorage.removeItem(KEY_STORAGE);
    } catch (e) { /* ignore */ }
  }

  function getCoachUrl() {
    try {
      var saved = localStorage.getItem(URL_STORAGE);
      if (saved) return saved;
    } catch (e) { /* ignore */ }
    if (location.hostname.includes('netlify.app')) {
      return '/.netlify/functions/coach';
    }
    return '';
  }

  function setCoachUrl(url) {
    try {
      if (url) localStorage.setItem(URL_STORAGE, url.trim());
      else localStorage.removeItem(URL_STORAGE);
    } catch (e) { /* ignore */ }
  }

  function hasKey() {
    return getApiKey().length > 10 || getCoachUrl().length > 0;
  }

  function buildPlanContext(data) {
    var today = Planning.todayKey();
    var todayTasks = Store.getTodayTasks(data).filter(function (t) { return !t.completed; });
    var habits = data.habits.map(function (h) {
      return { text: h.text, streak: h.streak, doneToday: !!h.completedToday };
    });
    var goals = Store.getActiveGoals(data).map(function (g) {
      return { text: g.text, horizon: g.horizon, progress: g.progress, notes: g.notes || '' };
    });
    var upcoming = data.tasks.filter(function (t) {
      return !t.completed && t.horizon !== 'daily';
    }).slice(0, 15).map(function (t) {
      return {
        text: t.text,
        horizon: t.horizon,
        targetDate: t.targetDate,
        priority: t.priority,
        category: t.category
      };
    });

    return {
      date: today,
      todayTasks: todayTasks.map(function (t) {
        return {
          text: t.text,
          category: t.category,
          priority: t.priority,
          timeblock: t.timeblock
        };
      }),
      habits: habits,
      goals: goals,
      upcomingPlanned: upcoming,
      streak: data.stats.streak || 0,
      level: data.stats.level || 1
    };
  }

  function buildTaskContext(data, taskId) {
    var task = data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return null;
    var goal = task.goalId ? data.goals.find(function (g) { return g.id === task.goalId; }) : null;
    return {
      task: {
        text: task.text,
        category: task.category,
        priority: task.priority,
        horizon: task.horizon,
        timeblock: task.timeblock,
        targetDate: task.targetDate
      },
      linkedGoal: goal ? { text: goal.text, progress: goal.progress } : null
    };
  }

  function systemPrompt() {
    return 'You are Plannr Coach, a warm and practical productivity assistant. ' +
      'You help people with ADHD-like motivation challenges complete mundane life tasks. ' +
      'Be concise, actionable, and encouraging — not preachy. Use short paragraphs and bullet points. ' +
      'Suggest realistic order of operations, time estimates, and tiny first steps. ' +
      'Never shame the user. Celebrate small wins.';
  }

  function planEfficiencyPrompt(ctx) {
    return 'Analyze this life plan and give specific advice to make it more efficient and achievable today.\n\n' +
      'Include:\n' +
      '1. Suggested order to tackle today\'s tasks (with brief why)\n' +
      '2. One thing to defer or simplify if overwhelmed\n' +
      '3. How habits and goals connect to today\'s tasks\n' +
      '4. One motivational nudge\n\n' +
      'Plan data (JSON):\n' + JSON.stringify(ctx, null, 2);
  }

  function taskAdvicePrompt(ctx) {
    return 'Give practical step-by-step advice for completing this specific task. ' +
      'Break it into tiny steps, mention tools/supplies if relevant, estimate time, and suggest how to start in under 2 minutes.\n\n' +
      'Task data (JSON):\n' + JSON.stringify(ctx, null, 2);
  }

  function callOpenAI(messages) {
    var coachUrl = getCoachUrl();
    var apiKey = getApiKey();

    if (!coachUrl && !apiKey) {
      return Promise.reject(new Error('Add your OpenAI API key in Coach settings first.'));
    }

    var endpoint = coachUrl || 'https://api.openai.com/v1/chat/completions';
    var headers = { 'Content-Type': 'application/json' };

    if (coachUrl) {
      if (apiKey) headers['X-OpenAI-Key'] = apiKey;
    } else {
      headers['Authorization'] = 'Bearer ' + apiKey;
    }

    var body = {
      model: DEFAULT_MODEL,
      messages: messages,
      max_tokens: 900,
      temperature: 0.7
    };

    if (coachUrl) {
      return fetch(coachUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      }).then(handleResponse);
    }

    return fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    }).then(handleResponse);
  }

  function handleResponse(res) {
    if (!res.ok) {
      return res.json().catch(function () { return {}; }).then(function (err) {
        var msg = err.error && err.error.message ? err.error.message : 'Request failed (' + res.status + ')';
        throw new Error(msg);
      });
    }
    return res.json().then(function (json) {
      if (!json.choices || !json.choices[0] || !json.choices[0].message) {
        throw new Error('Unexpected response from AI');
      }
      return json.choices[0].message.content.trim();
    });
  }

  function analyzePlan(data) {
    var ctx = buildPlanContext(data);
    return callOpenAI([
      { role: 'system', content: systemPrompt() },
      { role: 'user', content: planEfficiencyPrompt(ctx) }
    ]);
  }

  function adviseTask(data, taskId) {
    var ctx = buildTaskContext(data, taskId);
    if (!ctx) return Promise.reject(new Error('Task not found'));
    return callOpenAI([
      { role: 'system', content: systemPrompt() },
      { role: 'user', content: taskAdvicePrompt(ctx) }
    ]);
  }

  function cacheGet(key) {
    try {
      var raw = localStorage.getItem(CACHE_STORAGE);
      if (!raw) return null;
      var cache = JSON.parse(raw);
      var entry = cache[key];
      if (!entry) return null;
      if (Date.now() - entry.ts > 3600000) return null;
      return entry.text;
    } catch (e) {
      return null;
    }
  }

  function cacheSet(key, text) {
    try {
      var raw = localStorage.getItem(CACHE_STORAGE);
      var cache = raw ? JSON.parse(raw) : {};
      cache[key] = { text: text, ts: Date.now() };
      localStorage.setItem(CACHE_STORAGE, JSON.stringify(cache));
    } catch (e) { /* ignore */ }
  }

  function formatResponse(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^- (.+)$/gm, '• $1')
      .replace(/\n/g, '<br>');
  }

  return {
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    getCoachUrl: getCoachUrl,
    setCoachUrl: setCoachUrl,
    hasKey: hasKey,
    analyzePlan: analyzePlan,
    adviseTask: adviseTask,
    cacheGet: cacheGet,
    cacheSet: cacheSet,
    formatResponse: formatResponse,
    buildPlanContext: buildPlanContext
  };
})();
