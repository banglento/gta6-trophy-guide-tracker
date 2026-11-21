// app.js — UI logic for the GTA VI trophy tracker. Classic script, no modules.
// All data comes from window.GTA6_DATA; nothing is fetched at run time.
(function () {
  'use strict';

  var DATA = window.GTA6_DATA;
  var TROPHIES = DATA.trophies;
  var BY_ID = {};
  TROPHIES.forEach(function (t) { BY_ID[t.id] = t; });

  var state = Store.load(TROPHIES.map(function (t) { return t.id; }));
  var earned = new Set(state.earned);
  var selectedId = null;

  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('list'), detailEl = $('detail'), roadmapEl = $('roadmap');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isHidden(t) {
    return state.settings.spoiler && t.spoiler && !earned.has(t.id);
  }

  function gradeLabel(g) {
    return g.charAt(0).toUpperCase() + g.slice(1);
  }

  // Compact count label: "$250k" style for dollars, plain number otherwise.
  function compactCount(t) {
    if (t.count_unit === '$') return t.count >= 1000 ? '$' + (t.count / 1000) + 'k' : '$' + t.count;
    if (t.count_unit === '%') return t.count + '%';
    return String(t.count);
  }

  // Compact count chip: "$250k" style for dollars, plain number otherwise.
  function countChip(t) {
    if (t.count === undefined || t.count === null) return '';
    var label = compactCount(t);
    var target = t.count_unit === '$' ? '$' + t.count.toLocaleString('en-US')
      : t.count_unit === '%' ? t.count + '%'
      : String(t.count);
    var title = 'Target: ' + target;
    if (t.count_note) title += ' — ' + t.count_note;
    return '<span class="tag count" title="' + esc(title) + '">' + esc(label) + '</span>';
  }

  function save() {
    state.earned = Array.from(earned).sort(function (a, b) { return a - b; });
    Store.save(state);
  }

  function toggle(id) {
    if (earned.has(id)) earned.delete(id); else earned.add(id);
    save();
    render();
  }

  // ---------- header ----------
  function renderHeader() {
    var total = TROPHIES.length;
    var n = earned.size;
    var pct = Math.round((n / total) * 100);
    $('pct').textContent = pct + '%';
    $('countLabel').textContent = n + ' / ' + total + ' earned';
    $('barFill').style.width = pct + '%';
    var order = ['platinum', 'gold', 'silver', 'bronze'];
    $('gradeChips').innerHTML = order.map(function (g) {
      var all = TROPHIES.filter(function (t) { return t.grade === g; });
      var got = all.filter(function (t) { return earned.has(t.id); }).length;
      return '<span class="chip grade-' + g + '"><i class="dot"></i>' +
        esc(gradeLabel(g)) + ' ' + got + '/' + all.length + '</span>';
    }).join('');
    $('demoBadge').hidden = !Store.demo;
  }

  // ---------- filters ----------
  function filtered() {
    var q = $('search').value.trim().toLowerCase();
    var grade = $('fGrade').value;
    var cat = $('fCategory').value;
    var status = $('fStatus').value;
    return TROPHIES.filter(function (t) {
      var hidden = isHidden(t);
      if (grade !== 'all' && t.grade !== grade) return false;
      if (cat === 'missable') { if (!t.missable) return false; }
      else if (cat !== 'all' && t.category !== cat) return false;
      if (status === 'earned' && !earned.has(t.id)) return false;
      if (status === 'remaining' && earned.has(t.id)) return false;
      if (state.settings.hideEarned && earned.has(t.id)) return false;
      if (q) {
        var hay = (t.name + ' ' + t.description + ' ' + t.id).toLowerCase();
        if (!hidden) hay += ' ' + (t.guide || '').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  // ---------- checklist ----------
  function rowHtml(t) {
    var hidden = isHidden(t);
    var got = earned.has(t.id);
    var name = hidden ? '???' : t.name;
    var desc = hidden ? 'Story trophy — hidden until earned (spoiler guard).' : t.description;
    var tags = '<span class="tag cat">' + esc(t.category) + '</span>';
    if (!hidden) {
      if (t.missable) tags += ' <span class="tag missable" title="' + esc(t.missable_note) + '">⚑ missable</span>';
      tags += ' ' + countChip(t);
    }
    return '<div class="row' + (got ? ' earned' : '') + (selectedId === t.id ? ' selected' : '') +
      '" role="listitem" data-id="' + t.id + '">' +
      '<input type="checkbox" class="row-check" ' + (got ? 'checked' : '') +
      ' aria-label="Mark ' + esc(name) + ' earned">' +
      '<div class="row-main"><div class="row-top"><span class="row-name">' + esc(name) + '</span>' +
      ' <span class="badge grade-' + t.grade + '">' + esc(gradeLabel(t.grade)) + '</span></div>' +
      '<div class="row-desc">' + esc(desc) + '</div>' +
      '<div class="row-tags">' + tags + '</div></div></div>';
  }

  function renderList() {
    var rows = filtered();
    listEl.innerHTML = rows.map(rowHtml).join('') ||
      '<p class="empty">No trophies match these filters.</p>';
    $('resultCount').textContent = 'Showing ' + rows.length + ' of ' + TROPHIES.length;
    listEl.querySelectorAll('.row').forEach(function (row) {
      var id = Number(row.dataset.id);
      row.addEventListener('click', function () { openGuide(id); });
      row.querySelector('.row-check').addEventListener('click', function (e) {
        e.stopPropagation();
        toggle(id);
      });
    });
  }

  // ---------- detail panel ----------
  function sourceHtml(s) {
    if (s.url) return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a></li>';
    return '<li>' + esc(s.name) + ' <span class="named-hint" title="Cited by name — this app does not invent article URLs it has not seen.">(named guide)</span></li>';
  }

  function renderDetail() {
    if (selectedId === null || !BY_ID[selectedId]) {
      detailEl.innerHTML = '<p class="detail-hint">Pick a trophy from the list to read its guide — official description, how to earn it, and where the facts come from.</p>';
      return;
    }
    var t = BY_ID[selectedId];
    var hidden = isHidden(t);
    var got = earned.has(t.id);
    var name = hidden ? '???' : t.name;
    var tags = '<span class="tag cat">' + esc(t.category) + '</span>' +
      ' <span class="badge grade-' + t.grade + '">' + esc(gradeLabel(t.grade)) + '</span>';
    if (t.missable) tags += ' <span class="tag missable" title="' + esc(t.missable_note) + '">⚑ missable</span>';
    if (!hidden) tags += ' ' + countChip(t);
    if (hidden) tags += ' <span class="tag spoiler-tag">spoiler guarded</span>';

    var guideHtml;
    if (hidden) {
      guideHtml = '<div class="locked">This is a story trophy. Turn off the spoiler guard, or mark it earned, to read the guide.</div>';
    } else {
      var note = t.count_note ? '<p class="count-note">' + esc(t.count_note) + '</p>' : '';
      guideHtml = '<p>' + esc(t.guide) + '</p>' + note;
    }

    var idx = TROPHIES.indexOf(t);
    var prev = TROPHIES[(idx - 1 + TROPHIES.length) % TROPHIES.length];
    var next = TROPHIES[(idx + 1) % TROPHIES.length];

    detailEl.innerHTML =
      '<div class="detail-head"><h2>' + esc(name) + '</h2>' +
      '<button id="detailClose" class="ghost" type="button" aria-label="Close guide">✕</button></div>' +
      '<div class="detail-tags">' + tags + '</div>' +
      '<h3>Official description</h3>' +
      '<blockquote>' + esc(hidden ? 'Story trophy — hidden until earned (spoiler guard).' : t.description) + '</blockquote>' +
      '<h3>Guide</h3>' + guideHtml +
      '<h3>Missable?</h3>' +
      '<div class="note-box' + (t.missable ? ' warn' : '') + '">' + esc(t.missable_note) + '</div>' +
      '<h3>Sources</h3><ul class="sources">' + t.sources.map(sourceHtml).join('') + '</ul>' +
      '<div class="detail-actions">' +
      '<button id="detailToggle" class="primary" type="button">' + (got ? 'Unmark earned' : 'Mark earned') + '</button>' +
      '<button id="detailPrev" class="ghost" type="button">← Prev</button>' +
      '<button id="detailNext" class="ghost" type="button">Next →</button>' +
      '</div>';
    $('detailClose').addEventListener('click', function () { selectedId = null; renderDetail(); renderList(); });
    $('detailToggle').addEventListener('click', function () { toggle(t.id); });
    $('detailPrev').addEventListener('click', function () { openGuide(prev.id); });
    $('detailNext').addEventListener('click', function () { openGuide(next.id); });
  }

  function openGuide(id) {
    selectedId = id;
    setTab('tracker');
    renderList();
    renderDetail();
    // On narrow screens the detail panel sits below the list; bring it into
    // view only when it is entirely off-screen, so the header and filters
    // stay visible on desktop (and in screenshots).
    var rect = detailEl.getBoundingClientRect();
    if (rect.top > window.innerHeight) detailEl.scrollIntoView();
  }

  // ---------- roadmap ----------
  function renderRoadmap() {
    var html = '<div class="roadmap-intro"><p><strong>Road to Platinum · 55 trophies · 5 phases.</strong></p>' +
      '<p>' + esc(DATA.notes.missables) + '</p>' +
      '<p>' + esc(DATA.notes.honesty) + '</p></div>';
    DATA.roadmap.forEach(function (phase) {
      var phaseTrophies = phase.ids.map(function (id) { return BY_ID[id]; });
      var got = phaseTrophies.filter(function (t) { return earned.has(t.id); }).length;
      var chips = phaseTrophies.map(function (t) {
        var hidden = isHidden(t);
        var label = hidden ? '???' : t.name;
        var count = (!hidden && t.count !== undefined && t.count !== null) ? ' ×' + compactCount(t) : '';
        return '<button type="button" class="phase-chip' + (earned.has(t.id) ? ' earned' : '') +
          '" data-id="' + t.id + '"><i class="dot grade-' + t.grade + '"></i>' +
          esc(label) + esc(count) + '</button>';
      }).join('');
      html += '<article class="phase"><div class="phase-num">' + phase.phase + '</div>' +
        '<div class="phase-body"><div class="phase-head"><h3>' + esc(phase.title) + '</h3>' +
        '<span class="phase-count">' + got + ' / ' + phaseTrophies.length + ' earned</span></div>' +
        '<p>' + esc(phase.blurb) + '</p><div class="phase-chips">' + chips + '</div></div></article>';
    });
    html += '<article class="phase capstone"><div class="phase-num">★</div>' +
      '<div class="phase-body"><div class="phase-head"><h3>The Platinum</h3></div>' +
      '<p>“Vice Got a Price!” unlocks automatically once the other 54 trophies are earned. ' +
      'When every phase above reads complete, the platinum is yours — Leonida Legend.</p></div></article>';
    roadmapEl.innerHTML = html;
    roadmapEl.querySelectorAll('.phase-chip').forEach(function (chip) {
      chip.addEventListener('click', function () { openGuide(Number(chip.dataset.id)); });
    });
  }

  // ---------- tabs ----------
  function setTab(which) {
    $('tabTracker').classList.toggle('active', which === 'tracker');
    $('tabRoadmap').classList.toggle('active', which === 'roadmap');
    $('viewTracker').hidden = which !== 'tracker';
    $('viewRoadmap').hidden = which !== 'roadmap';
    if (which === 'roadmap') renderRoadmap();
  }

  function render() {
    renderHeader();
    renderList();
    renderDetail();
    if (!$('viewRoadmap').hidden) renderRoadmap();
  }

  // ---------- export / import / reset ----------
  function download(filename, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  $('btnExport').addEventListener('click', function () {
    download('gta6-trophy-progress.json', JSON.stringify(Store.exportPayload(state), null, 2));
  });

  var importDialog = $('importDialog');
  $('btnImport').addEventListener('click', function () {
    $('importText').value = '';
    $('importMsg').textContent = '';
    importDialog.showModal();
  });
  $('importCancel').addEventListener('click', function () { importDialog.close(); });
  $('importFile').addEventListener('change', function () {
    var file = $('importFile').files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { $('importText').value = String(reader.result); };
    reader.readAsText(file);
  });
  $('importApply').addEventListener('click', function () {
    try {
      var result = Store.parseImport($('importText').value, TROPHIES);
      earned = new Set(result.earned);
      if (result.settings) {
        state.settings.spoiler = !!result.settings.spoiler;
        state.settings.hideEarned = !!result.settings.hideEarned;
        $('fSpoiler').checked = state.settings.spoiler;
        $('fHideEarned').checked = state.settings.hideEarned;
      }
      save();
      render();
      $('importMsg').textContent = 'Imported ' + result.earned.length + ' earned trophies' +
        (result.skipped ? ' (' + result.skipped + ' entries skipped)' : '') + '.';
      setTimeout(function () { importDialog.close(); }, 900);
    } catch (e) {
      $('importMsg').textContent = e.message;
    }
  });

  $('btnReset').addEventListener('click', function () {
    if (confirm('Clear all earned trophies and settings?')) {
      earned = new Set();
      state.settings = { spoiler: false, hideEarned: false };
      $('fSpoiler').checked = false;
      $('fHideEarned').checked = false;
      selectedId = null;
      save();
      render();
    }
  });

  // ---------- toolbar ----------
  $('search').addEventListener('input', renderList);
  $('fGrade').addEventListener('change', renderList);
  $('fCategory').addEventListener('change', renderList);
  $('fStatus').addEventListener('change', renderList);
  $('fSpoiler').addEventListener('change', function () {
    state.settings.spoiler = $('fSpoiler').checked;
    save();
    render();
  });
  $('fHideEarned').addEventListener('change', function () {
    state.settings.hideEarned = $('fHideEarned').checked;
    save();
    render();
  });
  $('tabTracker').addEventListener('click', function () { setTab('tracker'); });
  $('tabRoadmap').addEventListener('click', function () { setTab('roadmap'); });

  // ---------- footer ----------
  $('footNote').textContent = DATA.notes.missables +
    ' Sources: official list via Exophase; PSNProfiles and PowerPyx guides cited by name.' +
    ' Progress is saved locally in your browser (localStorage) — nothing is sent anywhere.';

  // ---------- init ----------
  $('fSpoiler').checked = state.settings.spoiler;
  $('fHideEarned').checked = state.settings.hideEarned;

  var shot = Store.params.get('shot');
  if (shot === 'spoiler') {
    state.settings.spoiler = true;
    $('fSpoiler').checked = true;
    save();
  }
  render();
  if (shot === 'roadmap') {
    setTab('roadmap');
    document.body.classList.add('shot-full');
  } else if (shot === 'guide') {
    var id = Number(Store.params.get('id')) || 17;
    if (BY_ID[id]) openGuide(id);
  }

  window.__app = { state: state, earned: earned, openGuide: openGuide, setTab: setTab, toggle: toggle, render: render };
  window.__shotReady = true;
})();
