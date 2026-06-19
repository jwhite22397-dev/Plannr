/**
 * RPG system — hero, skins, XP shop (earn-only, no pay-to-win)
 */
var RPG = (function () {
  var SKINS = [
    {
      id: 'default',
      name: 'Starter Adventurer',
      icon: '🧙',
      aura: 'aura-default',
      cost: 0,
      desc: 'Every legend begins somewhere mundane.',
      requirement: null
    },
    {
      id: 'warrior',
      name: 'Quest Warrior',
      icon: '⚔️',
      aura: 'aura-fire',
      cost: 100,
      desc: 'Forged by finishing your first real quests.',
      requirement: { type: 'level', value: 2 }
    },
    {
      id: 'scout',
      name: 'Morning Scout',
      icon: '🏹',
      aura: 'aura-mint',
      cost: 150,
      desc: 'Rises with the sun and the to-do list.',
      requirement: { type: 'tasks', value: 10 }
    },
    {
      id: 'knight',
      name: 'Habit Knight',
      icon: '🛡️',
      aura: 'aura-blue',
      cost: 250,
      desc: 'Armor plated with daily consistency.',
      requirement: { type: 'level', value: 4 }
    },
    {
      id: 'ninja',
      name: 'Stealth Ninja',
      icon: '🥷',
      aura: 'aura-shadow',
      cost: 400,
      desc: 'Silently crushes chores before they gang up.',
      requirement: { type: 'streak', value: 5 }
    },
    {
      id: 'mage',
      name: 'Focus Mage',
      icon: '🔮',
      aura: 'aura-purple',
      cost: 500,
      desc: 'Channels chaos into completed checkboxes.',
      requirement: { type: 'level', value: 6 }
    },
    {
      id: 'royal',
      name: 'Streak Royal',
      icon: '👑',
      aura: 'aura-gold',
      cost: 600,
      desc: 'Crown earned one boring day at a time.',
      requirement: { type: 'streak', value: 10 }
    },
    {
      id: 'dragon',
      name: 'Boss Slayer',
      icon: '🐉',
      aura: 'aura-dragon',
      cost: 800,
      desc: 'High-priority tasks fear this hero.',
      requirement: { type: 'level', value: 8 }
    },
    {
      id: 'cosmic',
      name: 'Cosmic Planner',
      icon: '🌌',
      aura: 'aura-cosmic',
      cost: 1200,
      desc: 'Sees the week, month, and year at once.',
      requirement: { type: 'level', value: 10 }
    },
    {
      id: 'golden',
      name: 'Golden Legend',
      icon: '✨',
      aura: 'aura-golden',
      cost: 1500,
      desc: 'The ultimate grind — fifty wins deep.',
      requirement: { type: 'tasks', value: 50 }
    }
  ];

  var DEFAULT_CHARACTER = {
    name: 'Hero',
    skinId: 'default',
    unlockedSkins: ['default']
  };

  var CLASS_TITLES = [
    { maxLevel: 2, title: 'Novice', icon: '🌱' },
    { maxLevel: 4, title: 'Adventurer', icon: '🗡️' },
    { maxLevel: 6, title: 'Veteran', icon: '🛡️' },
    { maxLevel: 8, title: 'Champion', icon: '⚡' },
    { maxLevel: 10, title: 'Elite', icon: '🔥' },
    { maxLevel: 99, title: 'Legend', icon: '👑' }
  ];

  function getSkin(id) {
    return SKINS.find(function (s) { return s.id === id; }) || SKINS[0];
  }

  function getClass(level) {
    for (var i = 0; i < CLASS_TITLES.length; i++) {
      if (level <= CLASS_TITLES[i].maxLevel) return CLASS_TITLES[i];
    }
    return CLASS_TITLES[CLASS_TITLES.length - 1];
  }

  function checkRequirement(req, stats) {
    if (!req) return true;
    if (req.type === 'level') return (stats.level || 1) >= req.value;
    if (req.type === 'streak') return (stats.bestStreak || 0) >= req.value;
    if (req.type === 'tasks') return (stats.totalCompleted || 0) >= req.value;
    return true;
  }

  function requirementLabel(req) {
    if (!req) return '';
    if (req.type === 'level') return 'Reach Lv. ' + req.value;
    if (req.type === 'streak') return req.value + '-day best streak';
    if (req.type === 'tasks') return req.value + ' tasks completed';
    return '';
  }

  function isSkinOwned(character, skinId) {
    return character.unlockedSkins.indexOf(skinId) !== -1;
  }

  function canBuySkin(data, skinId) {
    var skin = getSkin(skinId);
    var character = data.character || DEFAULT_CHARACTER;
    if (isSkinOwned(character, skinId)) return { ok: false, reason: 'Already owned' };
    if ((data.stats.walletXp || 0) < skin.cost) {
      return { ok: false, reason: 'Need ' + skin.cost + ' XP (you have ' + (data.stats.walletXp || 0) + ')' };
    }
    if (!checkRequirement(skin.requirement, data.stats)) {
      return { ok: false, reason: 'Requires: ' + requirementLabel(skin.requirement) };
    }
    return { ok: true };
  }

  function canRedeemReward(data, reward) {
    if ((data.stats.walletXp || 0) < reward.cost) {
      return { ok: false, reason: 'Need ' + reward.cost + ' XP' };
    }
    return { ok: true };
  }

  function getEquippedSkin(data) {
    var character = data.character || DEFAULT_CHARACTER;
    return getSkin(character.skinId);
  }

  return {
    SKINS: SKINS,
    DEFAULT_CHARACTER: DEFAULT_CHARACTER,
    getSkin: getSkin,
    getClass: getClass,
    checkRequirement: checkRequirement,
    requirementLabel: requirementLabel,
    isSkinOwned: isSkinOwned,
    canBuySkin: canBuySkin,
    canRedeemReward: canRedeemReward,
    getEquippedSkin: getEquippedSkin
  };
})();
