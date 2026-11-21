// Progress storage for the GTA VI trophy tracker (classic script).
// Real progress lives under one localStorage key; ?demo=1 uses a separate
// demo key and never touches the real one.
(function () {
  'use strict';

  var REAL_KEY = 'gta6-trophy-guide-tracker:v1';
  var DEMO_KEY = 'gta6-trophy-guide-tracker:demo';
  var DEMO_SEED = [2, 3, 4, 8, 19, 20, 21, 44];

  var params = new URLSearchParams(window.location.search);
  var demo = params.get('demo') === '1';

  function key() {
    return demo ? DEMO_KEY : REAL_KEY;
  }

  function load(validIds) {
    var valid = {};
    (validIds || []).forEach(function (id) { valid[id] = true; });
    var state = { earned: [], settings: { spoiler: false, hideEarned: false } };
    var raw = null;
    try { raw = window.localStorage.getItem(key()); } catch (e) { raw = null; }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.earned)) {
          state.earned = parsed.earned.filter(function (id) { return valid[id]; });
        }
        if (parsed && parsed.settings) {
          state.settings.spoiler = !!parsed.settings.spoiler;
          state.settings.hideEarned = !!parsed.settings.hideEarned;
        }
      } catch (e) { /* corrupt stored data: start clean */ }
    } else if (demo) {
      // Fresh demo run: seed a little progress so the tracker shows its shape.
      state.earned = DEMO_SEED.filter(function (id) { return valid[id]; });
      save(state);
    }
    state.earned.sort(function (a, b) { return a - b; });
    return state;
  }

  function save(state) {
    try {
      window.localStorage.setItem(key(), JSON.stringify({
        earned: (state.earned || []).slice().sort(function (a, b) { return a - b; }),
        settings: state.settings || {},
        updated: new Date().toISOString()
      }));
    } catch (e) { /* storage unavailable: progress just won't persist */ }
  }

  function exportPayload(state) {
    return {
      app: 'gta6-trophy-guide-tracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      earned: (state.earned || []).slice().sort(function (a, b) { return a - b; }),
      settings: state.settings || {}
    };
  }

  function parseImport(text, trophies) {
    var byId = {};
    var byName = {};
    trophies.forEach(function (t) {
      byId[t.id] = true;
      byName[t.name.toLowerCase()] = t.id;
    });

    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('That is not valid JSON. Paste the app\'s export, a plain id list, or a name list.');
    }

    var rawIds = null;
    var settings = null;
    if (data && Array.isArray(data.earned)) {
      rawIds = data.earned;
      settings = data.settings || null;
    } else if (Array.isArray(data)) {
      rawIds = data;
    } else {
      throw new Error('No "earned" array found in that JSON.');
    }

    var earned = [];
    var skipped = 0;
    rawIds.forEach(function (item) {
      var id = null;
      if (typeof item === 'number') id = item;
      else if (typeof item === 'string') {
        var trimmed = item.trim();
        if (/^\d+$/.test(trimmed)) id = parseInt(trimmed, 10);
        else if (byName[trimmed.toLowerCase()] !== undefined) id = byName[trimmed.toLowerCase()];
      }
      if (id !== null && byId[id] && earned.indexOf(id) === -1) earned.push(id);
      else skipped += 1;
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
