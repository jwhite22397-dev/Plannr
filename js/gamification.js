/**
 * Gamification engine — XP, levels, streaks, achievements, celebrations
 */
var Gamification = (function () {
  var XP_TABLE = { low: 5, medium: 10, high: 20 };
  var HABIT_XP = 15;

  var LEVEL_TITLES = [
    'Fresh Start',
    'Getting Going',
    'Momentum Maker',
    'Task Tamer',
    'Routine Rockstar',
    'Habit Hero',
    'Life Legend',
    'Productivity Pro',
    'Discipline Duke',
    'Grandmaster of Getting Stuff Done'
  ];

  var CELEBRATION_MESSAGES = [
    'Nice work!',
    'Crushed it!',
    'You did the thing!',
    'Boom!',
    'That counts!',
    'Small win, big vibes!',
    'Look at you go!',
    'Momentum unlocked!',
    'Another one down!',
    'Future you says thanks!'
  ];

  var CELEBRATION_EMOJIS = ['🎉', '⭐', '✨', '🔥', '💪', '🌟', '🎯', '👏', '🏅', '💫'];

  var ACHIEVEMENTS = [
    { id: 'first_task', icon: '🌱', name: 'First Step', desc: 'Complete your first task', check: function (s) { return s.stats.totalCompleted >= 1; } },
    { id: 'five_tasks', icon: '✋', name: 'High Five', desc: 'Complete 5 tasks', check: function (s) { return s.stats.totalCompleted >= 5; } },
    { id: 'twenty_tasks', icon: '🚀', name: 'On a Roll', desc: 'Complete 20 tasks', check: function (s) { return s.stats.totalCompleted >= 20; } },
    { id: 'fifty_tasks', icon: '💎', name: 'Unstoppable', desc: 'Complete 50 tasks', check: function (s) { return s.stats.totalCompleted >= 50; } },
    { id: 'streak_3', icon: '🔥', name: '3-Day Fire', desc: '3-day streak', check: function (s) { return s.stats.bestStreak >= 3; } },
    { id: 'streak_7', icon: '🌋', name: 'Week Warrior', desc: '7-day streak', check: function (s) { return s.stats.bestStreak >= 7; } },
    { id: 'streak_30', icon: '👑', name: 'Monthly Monarch', desc: '30-day streak', check: function (s) { return s.stats.bestStreak >= 30; } },
    { id: 'level_5', icon: '⬆️', name: 'Level 5', desc: 'Reach level 5', check: function (s) { return s.stats.level >= 5; } },
    { id: 'level_10', icon: '🏆', name: 'Level 10', desc: 'Reach level 10', check: function (s) { return s.stats.level >= 10; } },
    { id: 'perfect_day', icon: '💯', name: 'Perfect Day', desc: 'Complete all tasks in a day', check: function (s) { return s.stats.perfectDays >= 1; } },
    { id: 'habit_streak_7', icon: '🔄', name: 'Habit Machine', desc: '7-day habit streak', check: function (s) { return s.habits.some(function (h) { return h.streak >= 7; }); } },
    { id: 'xp_500', icon: '⚡', name: 'XP Hunter', desc: 'Earn 500 total XP', check: function (s) { return s.stats.totalXp >= 500; } }
  ];

  function xpForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  function getLevel(totalXp) {
    var level = 1;
    var xpNeeded = 0;
    while (true) {
      var next = xpForLevel(level);
      if (totalXp < xpNeeded + next) break;
      xpNeeded += next;
      level++;
      if (level > 99) break;
    }
    return { level: level, xpInLevel: totalXp - xpNeeded, xpNeeded: xpForLevel(level) };
  }

  function getTitle(level) {
    var idx = Math.min(level - 1, LEVEL_TITLES.length - 1);
    return LEVEL_TITLES[idx];
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function updateStreak(stats) {
    var today = todayKey();
    if (stats.lastActiveDate === today) return stats;

    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yKey = yesterday.getFullYear() + '-' + pad(yesterday.getMonth() + 1) + '-' + pad(yesterday.getDate());

    if (stats.lastActiveDate === yKey) {
      stats.streak = (stats.streak || 0) + 1;
    } else if (stats.lastActiveDate !== today) {
      stats.streak = 1;
    }

    if (stats.streak > (stats.bestStreak || 0)) {
      stats.bestStreak = stats.streak;
    }
    stats.lastActiveDate = today;
    return stats;
  }

  function getMotivation(done, total, streak) {
    if (total === 0) return 'Every small win counts. Start with one.';
    var pct = total > 0 ? done / total : 0;
    if (pct >= 1) return 'You cleared the board! Legendary.';
    if (pct >= 0.75) return 'Almost there — finish strong!';
    if (pct >= 0.5) return 'Halfway! The hardest part is behind you.';
    if (pct >= 0.25) return 'Momentum building. Keep going!';
    if (done > 0) return 'You started. That\'s the hardest part.';
    if (streak > 3) return 'Day ' + streak + ' of your streak. Don\'t break the chain!';
    return 'Pick the easiest one first. Quick dopamine hit.';
  }

  /* Confetti */
  var confettiAnim = null;

  function launchConfetti(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var colors = ['#ffd54f', '#ff6b9d', '#69f0ae', '#b388ff', '#64b5f6', '#ff5252'];
    var particles = [];
    for (var i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        life: 1,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 10
      });
    }

    if (confettiAnim) cancelAnimationFrame(confettiAnim);

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = false;
      for (var j = 0; j < particles.length; j++) {
        var p = particles[j];
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life -= 0.02;
        p.rot += p.rotV;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      if (alive) {
        confettiAnim = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    frame();
  }

  function showCelebration(xp) {
    var el = document.getElementById('celebration');
    var emoji = document.getElementById('celebration-emoji');
    var text = document.getElementById('celebration-text');
    var xpEl = document.getElementById('celebration-xp');
    var canvas = document.getElementById('confetti-canvas');

    emoji.textContent = randomFrom(CELEBRATION_EMOJIS);
    text.textContent = randomFrom(CELEBRATION_MESSAGES);
    xpEl.textContent = '+' + xp + ' XP';

    el.classList.remove('hidden');
    launchConfetti(canvas);

    setTimeout(function () {
      el.classList.add('hidden');
    }, 1800);
  }

  function showLevelUp(level, title) {
    var el = document.getElementById('levelup');
    document.getElementById('levelup-level').textContent = 'Level ' + level;
    document.getElementById('levelup-title').textContent = title;
    el.classList.remove('hidden');

    return new Promise(function (resolve) {
      var btn = document.getElementById('levelup-dismiss');
      function dismiss() {
        el.classList.add('hidden');
        btn.removeEventListener('click', dismiss);
        resolve();
      }
      btn.addEventListener('click', dismiss);
    });
  }

  return {
    XP_TABLE: XP_TABLE,
    HABIT_XP: HABIT_XP,
    ACHIEVEMENTS: ACHIEVEMENTS,
    xpForLevel: xpForLevel,
    getLevel: getLevel,
    getTitle: getTitle,
    todayKey: todayKey,
    updateStreak: updateStreak,
    getMotivation: getMotivation,
    showCelebration: showCelebration,
    showLevelUp: showLevelUp
  };
})();
