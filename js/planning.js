/**
 * Planning horizons — daily, weekly, monthly, quarterly, yearly
 */
var Planning = (function () {
  var HORIZONS = [
    { id: 'daily', label: 'Day', icon: '☀️' },
    { id: 'weekly', label: 'Week', icon: '📅' },
    { id: 'monthly', label: 'Month', icon: '🗓️' },
    { id: 'quarterly', label: 'Quarter', icon: '📊' },
    { id: 'yearly', label: 'Year', icon: '🎯' }
  ];

  var HORIZON_LABELS = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly'
  };

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function parseDate(str) {
    var p = str.split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function dateKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function startOfWeek(d) {
    var copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = copy.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return copy;
  }

  function endOfWeek(d) {
    var start = startOfWeek(d);
    var end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  }

  function weekKey(d) {
    var start = startOfWeek(d);
    return dateKey(start);
  }

  function monthKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }

  function quarterNum(d) {
    return Math.floor(d.getMonth() / 3) + 1;
  }

  function quarterKey(d) {
    return d.getFullYear() + '-Q' + quarterNum(d);
  }

  function yearKey(d) {
    return '' + d.getFullYear();
  }

  function periodKey(horizon, d) {
    if (horizon === 'daily') return dateKey(d);
    if (horizon === 'weekly') return weekKey(d);
    if (horizon === 'monthly') return monthKey(d);
    if (horizon === 'quarterly') return quarterKey(d);
    if (horizon === 'yearly') return yearKey(d);
    return dateKey(d);
  }

  function shiftPeriod(horizon, periodKeyVal, delta) {
    var d;
    if (horizon === 'daily') {
      d = parseDate(periodKeyVal);
      d.setDate(d.getDate() + delta);
      return dateKey(d);
    }
    if (horizon === 'weekly') {
      d = parseDate(periodKeyVal);
      d.setDate(d.getDate() + delta * 7);
      return weekKey(d);
    }
    if (horizon === 'monthly') {
      var parts = periodKeyVal.split('-');
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1 + delta, 1);
      return monthKey(d);
    }
    if (horizon === 'quarterly') {
      var qp = periodKeyVal.split('-Q');
      var year = parseInt(qp[0], 10);
      var q = parseInt(qp[1], 10) + delta;
      while (q < 1) { q += 4; year -= 1; }
      while (q > 4) { q -= 4; year += 1; }
      return year + '-Q' + q;
    }
    if (horizon === 'yearly') {
      return '' + (parseInt(periodKeyVal, 10) + delta);
    }
    return periodKeyVal;
  }

  function formatPeriodLabel(horizon, periodKeyVal) {
    if (horizon === 'daily') {
      var d = parseDate(periodKeyVal);
      var today = todayKey();
      if (periodKeyVal === today) return 'Today';
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (periodKeyVal === dateKey(tomorrow)) return 'Tomorrow';
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (horizon === 'weekly') {
      var start = parseDate(periodKeyVal);
      var end = endOfWeek(start);
      var opts = { month: 'short', day: 'numeric' };
      return start.toLocaleDateString('en-US', opts) + ' – ' + end.toLocaleDateString('en-US', opts);
    }
    if (horizon === 'monthly') {
      var mp = periodKeyVal.split('-');
      var md = new Date(parseInt(mp[0], 10), parseInt(mp[1], 10) - 1, 1);
      return md.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (horizon === 'quarterly') {
      var qparts = periodKeyVal.split('-Q');
      return 'Q' + qparts[1] + ' ' + qparts[0];
    }
    if (horizon === 'yearly') {
      return periodKeyVal;
    }
    return periodKeyVal;
  }

  function taskPeriodKey(task) {
    var horizon = task.horizon || 'daily';
    if (task.targetDate) {
      if (horizon === 'daily') return task.targetDate;
      if (horizon === 'weekly') return weekKey(parseDate(task.targetDate));
      if (horizon === 'monthly') return monthKey(parseDate(task.targetDate));
      if (horizon === 'quarterly') return quarterKey(parseDate(task.targetDate));
      if (horizon === 'yearly') return yearKey(parseDate(task.targetDate));
    }
    return periodKey(horizon, new Date());
  }

  function defaultTargetDate(horizon, periodKeyVal) {
    if (horizon === 'daily') return periodKeyVal;
    if (horizon === 'weekly') return periodKeyVal;
    if (horizon === 'monthly') return periodKeyVal + '-01';
    if (horizon === 'quarterly') {
      var q = parseInt(periodKeyVal.split('-Q')[1], 10);
      var y = parseInt(periodKeyVal.split('-Q')[0], 10);
      var month = (q - 1) * 3;
      return y + '-' + pad(month + 1) + '-01';
    }
    if (horizon === 'yearly') return periodKeyVal + '-01-01';
    return todayKey();
  }

  function isInPeriod(task, horizon, periodKeyVal) {
    return taskPeriodKey(task) === periodKeyVal && (task.horizon || 'daily') === horizon;
  }

  function isFuturePeriod(horizon, periodKeyVal) {
    var now = new Date();
    var current = Planning.periodKey(horizon, now);
    if (horizon === 'yearly') return parseInt(periodKeyVal, 10) > now.getFullYear();
    if (horizon === 'quarterly') {
      var cy = now.getFullYear();
      var cq = quarterNum(now);
      var ty = parseInt(periodKeyVal.split('-Q')[0], 10);
      var tq = parseInt(periodKeyVal.split('-Q')[1], 10);
      return ty > cy || (ty === cy && tq > cq);
    }
    if (horizon === 'monthly') return periodKeyVal > monthKey(now);
    if (horizon === 'weekly') return periodKeyVal > weekKey(now);
    if (horizon === 'daily') return periodKeyVal > todayKey();
    return false;
  }

  function goalHorizons() {
    return ['monthly', 'quarterly', 'yearly'];
  }

  return {
    HORIZONS: HORIZONS,
    HORIZON_LABELS: HORIZON_LABELS,
    todayKey: todayKey,
    dateKey: dateKey,
    periodKey: periodKey,
    shiftPeriod: shiftPeriod,
    formatPeriodLabel: formatPeriodLabel,
    taskPeriodKey: taskPeriodKey,
    defaultTargetDate: defaultTargetDate,
    isInPeriod: isInPeriod,
    isFuturePeriod: isFuturePeriod,
    goalHorizons: goalHorizons,
    parseDate: parseDate,
    yearKey: yearKey
  };
})();
