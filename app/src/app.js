// UI logic for the GTA VI trophy tracker (classic script, no modules).
// All data comes from window.GTA6_DATA; no network at run time.
(function () {
  'use strict';

  var DATA = window.GTA6_DATA;
  var trophies = DATA.trophies;
  var byId = {};
  trophies.forEach(function (t) { byId[t.id] = t; });

  var state = window.Store.load(trophies.map(function (t) { return t.id; }));
  var currentId = null;
  var filters = { q: '', grade: 'all', category: 'all', status: 'all' };

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isEarned(id) { return state.earned.indexOf(id) !== -1; }

  function isSpoilerHidden(t) {
    return state.settings.spoiler && t.spoiler && !isEarned(t.id);
  }

  function displayName(t) { return isSpoilerHidden(t) ? '???' : t.name; }
  function displayDesc(t) {
    return isSpoilerHidden(t)
      ? 'Story trophy — hidden until earned (spoiler guard).'
      : t.description;
  }

  function gradeLabel(g) {
    return g.charAt(0).toUpperCase() + g.slice(1);
  }

  function countLabel(t) {
    if (t.count === undefined || t.count === null) return null;
    if (t.count_unit === '$') {
      return t.count >= 1000 ? '$' + (t.count / 1000) + 'k' : '$' + t.count;
    }
    if (t.count_unit === '%') return t.count + '%';
    return String(t.count);
  }

  function countTitle(t) {
    var s = 'Target: ' + countLabel(t);
    if (t.count_note) s += ' — ' + t.count_note;
    return s;
  }

  function gradeBadge(t) {
    return '<span class="badge grade-' + t.grade + '">' + gradeLabel(t.grade) + '</span>';
  }

  function countChip(t) {
    var label = countLabel(t);
    if (label === null) return '';
    return '<span class="tag count" title="' + esc(countTitle(t)) + '">× ' + esc(label) + '</span>';
  }

  function missableFlag(t) {
    if (!t.missable) return '';
    return '<span class="tag missable" title="' + esc(t.missable_note) + '">&#9873; missable</span>';
  }

  // ---------- header ----------

  function renderHeader() {
    var earned = state.earned.length;
    var total = trophies.length;
    $('pct').textContent = Math.round((earned / total) * 100) + '%';
    $('countLabel').textContent = earned + ' / ' + total + ' earned';
    $('barFill').style.width = (earned / total) * 100 + '%';
    var order = ['platinum', 'gold', 'silver', 'bronze'];
    $('gradeChips').innerHTML = order.map(function (g) {
      var all = trophies.filter(function (t) { return t.grade === g; });
      var got = all.filter(function (t) { return isEarned(t.id); }).length;
      return '<span class="chip"><span class="dot dot-' + g + '"></span>' +
        gradeLabel(g) + ' ' + got + '/' + all.length + '</span>';
    }).join('');
    $('demoBadge').hidden = !window.Store.demo;
  }

  // ---------- checklist ----------

  function visibleTrophies() {
    var q = filters.q.trim().toLowerCase();
    return trophies.filter(function (t) {
      if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
      if (filters.category !== 'all') {
        if (filters.category === 'missable') { if (!t.missable) return false; }
        else if (t.category !== filters.category) return false;
      }
      if (filters.status === 'earned' && !isEarned(t.id)) return false;
      if (filters.status === 'remaining' && isEarned(t.id)) return false;
      if (state.settings.hideEarned && isEarned(t.id)) return false;
      if (q) {
        var hay = (t.name + ' ' + t.description + ' ' + t.id).toLowerCase();
        if (!isSpoilerHidden(t)) hay += ' ' + (t.guide || '').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function rowHtml(t) {
    var earned = isEarned(t.id);
    var cls = 'row' + (earned ? ' earned' : '') + (t.id === currentId ? ' selected' : '');
    return '<div class="' + cls + '" data-id="' + t.id + '" role="listitem">' +
      '<input type="checkbox" class="row-check" ' + (earned ? 'checked' : '') +
      ' aria-label="Mark ' + esc(displayName(t)) + ' earned">' +
      '<div class="row-main">' +
      '<div class="row-top"><span class="row-name">' + esc(displayName(t)) + '</span> ' +
      gradeBadge(t) +
      ' <span class="tag cat">' + esc(t.category) + '</span> ' +
      missableFlag(t) + countChip(t) + '</div>' +
      '<div class="row-desc">' + esc(displayDesc(t)) + '</div>' +
      '</div></div>';
  }

  function renderList() {
    var list = visibleTrophies();
    $('list').innerHTML = list.length
      ? list.map(rowHtml).join('')
      : '<p class="empty">No trophies match these filters.</p>';
    $('resultCount').textContent = 'Showing ' + list.length + ' of 55';
  }

  // ---------- detail panel ----------

  function detailHtml(t) {
    var hidden = isSpoilerHidden(t);
    var earned = isEarned(t.id);
    var html = '<div class="detail-head"><h2>' + esc(displayName(t)) + '</h2>' +
      '<button id="detailClose" class="ghost" type="button" aria-label="Close guide">&times;</button></div>' +
      '<div class="detail-tags">' + gradeBadge(t) +
      ' <span class="tag cat">' + esc(t.category) + '</span> ' +
      missableFlag(t) + countChip(t) +
      (hidden ? ' <span class="tag spoiler-tag">spoiler guarded</span>' : '') +
      '</div>';

    html += '<div class="detail-sec"><div class="detail-label">Official description</div>' +
      '<p class="official">' + esc(displayDesc(t)) + '</p></div>';

    if (hidden) {
      html += '<div class="detail-sec"><div class="detail-label">Guide</div>' +
        '<div class="note-box warn">Spoiler guarded — this story trophy is hidden until you earn it. ' +
        'Turn the spoiler guard off, or tick it earned, to reveal the guide.</div></div>';
    } else {
      html += '<div class="detail-sec"><div class="detail-label">Guide</div>' +
        '<p class="guide-text">' + esc(t.guide) + '</p>' +
        (t.count_note ? '<p class="count-note">Target note: ' + esc(t.count_note) + '</p>' : '') +
        '</div>';
    }

    html += '<div class="detail-sec"><div class="detail-label">Missable?</div>' +
      '<div class="note-box' + (t.missable ? ' warn' : '') + '">' + esc(t.missable_note) + '</div></div>';

    html += '<div class="detail-sec"><div class="detail-label">Sources</div><ul class="sources">' +
      t.sources.map(function (s) {
        if (s.url) {
          return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a></li>';
        }
        return '<li><span title="Cited by name — this app does not invent article URLs it has not seen.">' +
          esc(s.name) + ' <em>(named guide)</em></span></li>';
      }).join('') + '</ul></div>';

    var idx = visibleTrophies().map(function (x) { return x.id; });
    var pos = idx.indexOf(t.id);
    html += '<div class="detail-actions">' +
      '<button id="detailToggle" class="primary" type="button">' + (earned ? 'Unmark earned' : 'Mark earned') + '</button>' +
      '<button id="detailPrev" class="ghost" type="button"' + (pos <= 0 ? ' disabled' : '') + '>&larr; Prev</button>' +
      '<button id="detailNext" class="ghost" type="button"' + (pos < 0 || pos >= idx.length - 1 ? ' disabled' : '') + '>Next &rarr;</button>' +
      '</div>';
    return html;
  }

  function renderDetail() {
    var el = $('detail');
    if (!currentId || !byId[currentId]) {
      el.innerHTML = '<p class="detail-empty">Pick a trophy on the left to see its guide, sources and missable notes here.</p>' +
        '<p class="detail-empty">55 trophies &middot; 8 missable in the moment &middot; 5 phases to the platinum. ' +
        'The Road to Platinum tab lays out the order.</p>';
      return;
    }
    el.innerHTML = detailHtml(byId[currentId]);
    $('detailClose').addEventListener('click', function () {
      currentId = null;
      render();
    });
    $('detailToggle').addEventListener('click', function () {
      toggle(currentId);
    });
    var prev = $('detailPrev');
    var next = $('detailNext');
    if (prev) prev.addEventListener('click', function () {
      var idx = visibleTrophies().map(function (x) { return x.id; });
      var pos = idx.indexOf(currentId);
      if (pos > 0) openGuide(idx[pos - 1]);
    });
    if (next) next.addEventListener('click', function () {
      var idx = visibleTrophies().map(function (x) { return x.id; });
      var pos = idx.indexOf(currentId);
      if (pos >= 0 && pos < idx.length - 1) openGuide(idx[pos + 1]);
    });
  }

  // ---------- roadmap ----------

  function renderRoadmap() {
    var html = '<div class="roadmap-intro">' +
      '<strong>Road to Platinum &middot; 55 trophies &middot; 5 phases.</strong>' +
      '<p>' + esc(DATA.notes.missables) + '</p>' +
      '<p>' + esc(DATA.notes.honesty) + '</p></div>';

    DATA.roadmap.forEach(function (phase) {
      var got = phase.ids.filter(function (id) { return isEarned(id); }).length;
      html += '<article class="phase"><div class="phase-head">' +
        '<span class="phase-num">' + phase.phase + '</span>' +
        '<div><h3>' + esc(phase.title) + '</h3>' +
        '<span class="phase-count">' + got + ' / ' + phase.ids.length + ' earned</span></div></div>' +
        '<p class="phase-blurb">' + esc(phase.blurb) + '</p>' +
        '<div class="phase-chips">' + phase.ids.map(function (id) {
          var t = byId[id];
          var label = countLabel(t);
          return '<button type="button" class="tchip' + (isEarned(id) ? ' earned' : '') + '" data-id="' + id + '">' +
            '<span class="dot dot-' + t.grade + '"></span>' +
            '<span class="tchip-name">' + esc(displayName(t)) + '</span>' +
            (label !== null ? '<span class="tchip-count">&times; ' + esc(label) + '</span>' : '') +
            '</button>';
        }).join('') + '</div></article>';
    });

    html += '<article class="phase platinum-card"><div class="phase-head">' +
      '<span class="phase-num plat-star">&#9733;</span>' +
      '<div><h3>The Platinum</h3></div></div>' +
      '<p class="phase-blurb">Vice Got a Price! unlocks automatically once the other 54 trophies are earned. ' +
      'When every phase above reads complete, the platinum is yours — Leonida Legend.</p></article>';

    $('roadmap').innerHTML = html;
  }

  // ---------- actions ----------

  function toggle(id) {
    var i = state.earned.indexOf(id);
    if (i === -1) state.earned.push(id);
    else state.earned.splice(i, 1);
    state.earned.sort(function (a, b) { return a - b; });
    window.Store.save(state);
    render();
  }

  function openGuide(id) {
    if (!byId[id]) return;
    currentId = id;
    setTab('tracker');
    render();
    var row = document.querySelector('.row[data-id="' + id + '"]');
    if (row) row.scrollIntoView({ block: 'nearest' });
  }

  function setTab(name) {
    var tracker = name === 'tracker';
    $('tabTracker').classList.toggle('active', tracker);
    $('tabRoadmap').classList.toggle('active', !tracker);
    $('viewTracker').hidden = !tracker;
    $('viewRoadmap').hidden = tracker;
  }

  // Redraws the whole UI from the current state: progress header, filtered
  // trophy list, the selected trophy's guide panel, and the roadmap phases.
  function render() {
    renderHeader();
    renderList();
    renderDetail();
    renderRoadmap();
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- wire up ----------

  $('fSpoiler').checked = !!state.settings.spoiler;
  $('fHideEarned').checked = !!state.settings.hideEarned;

  $('search').addEventListener('input', function (e) {
    filters.q = e.target.value;
    renderList();
  });
  $('fGrade').addEventListener('change', function (e) {
    filters.grade = e.target.value;
    renderList();
  });
  $('fCategory').addEventListener('change', function (e) {
    filters.category = e.target.value;
    renderList();
  });
  $('fStatus').addEventListener('change', function (e) {
    filters.status = e.target.value;
    renderList();
  });
  $('fSpoiler').addEventListener('change', function (e) {
    state.settings.spoiler = e.target.checked;
    window.Store.save(state);
    render();
  });
  $('fHideEarned').addEventListener('change', function (e) {
    state.settings.hideEarned = e.target.checked;
    window.Store.save(state);
    render();
  });

  $('list').addEventListener('click', function (e) {
    var row = e.target.closest('.row');
    if (!row) return;
    var id = parseInt(row.getAttribute('data-id'), 10);
    if (e.target.classList.contains('row-check')) return; // change handler toggles
    openGuide(id);
  });
  $('list').addEventListener('change', function (e) {
    if (e.target.classList.contains('row-check')) {
      var row = e.target.closest('.row');
      toggle(parseInt(row.getAttribute('data-id'), 10));
    }
  });

  $('tabTracker').addEventListener('click', function () { setTab('tracker'); });
  $('tabRoadmap').addEventListener('click', function () { setTab('roadmap'); });

  $('roadmap').addEventListener('click', function (e) {
    var chip = e.target.closest('.tchip');
    if (!chip) return;
    openGuide(parseInt(chip.getAttribute('data-id'), 10));
  });

  $('btnExport').addEventListener('click', function () {
    download('gta6-trophy-progress.json',
      JSON.stringify(window.Store.exportPayload(state), null, 2));
  });

  var dialog = $('importDialog');
  $('btnImport').addEventListener('click', function () {
    $('importMsg').textContent = '';
    $('importText').value = '';
    $('importFile').value = '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
  });
  $('importCancel').addEventListener('click', function () { dialog.close(); });
  $('importFile').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { $('importText').value = String(reader.result || ''); };
    reader.readAsText(file);
  });
  $('importApply').addEventListener('click', function () {
    try {
      var result = window.Store.parseImport($('importText').value, trophies);
      state.earned = result.earned;
      if (result.settings) {
        state.settings.spoiler = !!result.settings.spoiler;
        state.settings.hideEarned = !!result.settings.hideEarned;
        $('fSpoiler').checked = state.settings.spoiler;
        $('fHideEarned').checked = state.settings.hideEarned;
      }
      window.Store.save(state);
      render();
      $('importMsg').textContent = 'Imported ' + result.earned.length +
        ' trophies' + (result.skipped ? ' (' + result.skipped + ' skipped).' : '.');
      setTimeout(function () { dialog.close(); }, 900);
    } catch (err) {
      $('importMsg').textContent = err.message;
    }
  });

  $('btnReset').addEventListener('click', function () {
    if (window.confirm('Clear all saved progress? This cannot be undone.')) {
      state.earned = [];
      window.Store.save(state);
      render();
    }
  });

  $('footNote').textContent = DATA.notes.missables +
    ' Sources: official list via Exophase; PSNProfiles and PowerPyx guides cited by name.' +
    ' Progress is saved locally in your browser (localStorage) — nothing is sent anywhere.';

  // ---------- screenshot modes ----------

  var shot = window.Store.params.get('shot');
  if (shot === 'spoiler') {
    state.settings.spoiler = true;
    $('fSpoiler').checked = true;
    window.Store.save(state);
  }
  if (shot === 'roadmap') {
    setTab('roadmap');
    document.body.classList.add('shot-full');
  }
  if (shot === 'guide') {
    var gid = parseInt(window.Store.params.get('id') || '17', 10);
    if (byId[gid]) currentId = gid;
  }

  render();
  window.__app = {
    state: state,
    earned: state.earned,
    openGuide: openGuide,
    setTab: setTab,
    toggle: toggle,
    render: render
  };
  window.__shotReady = true;
})();
