// state.js — progress storage for the GTA VI trophy tracker.
// Real progress lives under 'gta6-trophy-guide-tracker:v1' in localStorage.
// ?demo=1 uses a SEPARATE demo key and never touches the real one, so the
// screenshots can show a seeded checklist without wiping anyone's progress.
(function () {
  'use strict';

  var KEY = 'gta6-trophy-guide-tracker:v1';
  var DEMO_KEY = 'gta6-trophy-guide-tracker:demo';
  var DEMO_SEED = [2, 3, 4, 8, 19, 20, 21, 44];

  var params = new URLSearchParams(location.search);
  var demo = params.get('demo') === '1';

  function key() {
    return demo ? DEMO_KEY : KEY;
  }

  function blankState() {
    return { earned: [], settings: { spoiler: false, hideEarned: false } };
  }

  function load(validIds) {
    var valid = {};
    validIds.forEach(function (id) { valid[id] = true; });
    var state = blankState();
    try {
      var raw = localStorage.getItem(key());
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.earned)) {
          state.earned = parsed.earned.filter(function (id) { return valid[id]; });
        }
        if (parsed && parsed.settings) {
          state.settings.spoiler = !!parsed.settings.spoiler;
          state.settings.hideEarned = !!parsed.settings.hideEarned;
        }
      } else if (demo) {
        // First demo visit: seed the demo checklist so screenshots show progress.
        state.earned = DEMO_SEED.filter(function (id) { return valid[id]; });
        save(state);
      }
    } catch (e) {
      // Corrupt or unavailable storage: start clean, never crash the page.
      state = blankState();
    }
    state.earned = state.earned.slice().sort(function (a, b) { return a - b; });
    return state;
  }

  function save(state) {
    try {
      localStorage.setItem(key(), JSON.stringify({
        earned: state.earned.slice().sort(function (a, b) { return a - b; }),
        settings: state.settings,
        updated: new Date().toISOString()
      }));
    } catch (e) {
      // Storage full or blocked (private mode): progress just won't persist.
    }
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

  // Accept three shapes: the app's own export, a bare id array, or a name
  // array (the starter checklist's trophy names). Returns the earned ids
  // sorted, how many entries were skipped, and the settings if present.
  function parseImport(text, trophies) {
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('That is not valid JSON. Paste the app\'s export, a list of ids like [2,3,8], or a list of names like ["Trust"].');
    }
    var list = null;
    var settings = null;
    if (parsed && Array.isArray(parsed.earned)) {
      list = parsed.earned;
      if (parsed.settings) settings = parsed.settings;
    } else if (Array.isArray(parsed)) {
      list = parsed;
    }
    if (!list) {
      throw new Error('No "earned" array found in that JSON.');
    }
    var byId = {};
    var byName = {};
    trophies.forEach(function (t) {
      byId[t.id] = true;
      byName[t.name.toLowerCase()] = t.id;
    });
    var earned = [];
    var skipped = 0;
    list.forEach(function (entry) {
      var id = null;
      if (typeof entry === 'number' && byId[entry]) id = entry;
      else if (typeof entry === 'string' && byName[entry.toLowerCase()] !== undefined) id = byName[entry.toLowerCase()];
      if (id === null) { skipped++; return; }
      if (earned.indexOf(id) === -1) earned.push(id);
    });
    earned.sort(function (a, b) { return a - b; });
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
