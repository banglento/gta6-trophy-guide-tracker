// Progress storage for the GTA VI trophy tracker.
// Real progress lives under one localStorage key; ?demo=1 uses a SEPARATE demo
// key and never touches the real one, so screenshots can show seeded progress
// without polluting a visitor's saved checklist.
(function () {
  'use strict';

  var REAL_KEY = 'gta6-trophy-guide-tracker:v1';
  var DEMO_KEY = 'gta6-trophy-guide-tracker:demo';
  var params = new URLSearchParams(location.search);
  var demo = params.get('demo') === '1';
  var KEY = demo ? DEMO_KEY : REAL_KEY;
  // A handful of early trophies, ticked in demo mode only.
  var DEMO_SEED = [2, 3, 4, 8, 19, 20, 21, 44];

  function defaults() {
    return { earned: [], settings: { spoiler: false, hideEarned: false } };
  }

  function load(validIds) {
    var state = defaults();
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    if (raw && Array.isArray(raw.earned)) {
      state.earned = raw.earned.filter(function (id) { return validIds.has(id); });
      if (raw.settings && typeof raw.settings === 'object') {
        state.settings.spoiler = !!raw.settings.spoiler;
        state.settings.hideEarned = !!raw.settings.hideEarned;
      }
    } else if (demo) {
      state.earned = DEMO_SEED.slice();
    }
    return state;
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        earned: state.earned,
        settings: state.settings,
        updated: new Date().toISOString()
      }));
    } catch (e) { /* private mode etc. — the app still works in memory */ }
  }

  function exportPayload(state) {
    return {
      app: 'gta6-trophy-guide-tracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      earned: state.earned.slice().sort(function (a, b) { return a - b; }),
      settings: state.settings
    };
  }

  // Accepts this app's export, a bare id array, or the starter checklist's
  // name array. Returns {earned, skipped} or throws on unparseable input.
  function parseImport(text, trophies) {
    var data = JSON.parse(text);
    var list = Array.isArray(data) ? data : (data && Array.isArray(data.earned) ? data.earned : null);
    if (!list) throw new Error('No "earned" array found in that JSON.');
    var byId = new Map(trophies.map(function (t) { return [t.id, t]; }));
    var byName = new Map(trophies.map(function (t) { return [t.name, t]; }));
    var earned = [];
    var skipped = 0;
    list.forEach(function (entry) {
      var t = typeof entry === 'number' ? byId.get(entry) : byName.get(String(entry));
      if (t) { if (earned.indexOf(t.id) === -1) earned.push(t.id); }
      else skipped++;
    });
    earned.sort(function (a, b) { return a - b; });
    var settings = (data && !Array.isArray(data) && data.settings && typeof data.settings === 'object')
      ? { spoiler: !!data.settings.spoiler, hideEarned: !!data.settings.hideEarned }
      : null;
    return { earned: earned, skipped: skipped, settings: settings };
  }

  window.Store = {
    demo: demo,
    params: params,
    load: load,
    save: save,
    exportPayload: exportPayload,
    parseImport: parseImport
  };
})();
