// GTA VI Trophy Guide & Tracker — UI logic.
// Classic script (no ES modules) so index.html also works straight from disk
// (file://). All data comes from data/trophies.js, generated from the canonical
// data/trophies.json. No network requests are made at run time.
(function () {
  'use strict';

  var DATA = window.GTA6_DATA;
  var trophies = DATA.trophies;
  var byId = new Map(trophies.map(function (t) { return [t.id, t]; }));
  var validIds = new Set(byId.keys());
  var GRADES = ['platinum', 'gold', 'silver', 'bronze'];
  var CAT_LABEL = {
    story: 'story', mission: 'mission', collectible: 'collectible', activity: 'activity',
    combat: 'combat', money: 'money', exploration: 'exploration'
  };

  var state = window.Store.load(validIds);
  var earned = new Set(state.earned);
  var selectedId = null;

  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('list'), detailEl = $('detail'), roadmapEl = $('roadmap');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function syncEarned() {
    state.earned = Array.from(earned).sort(function (a, b) { return a - b; });
    window.Store.save(state);
  }

  function isHidden(t) {
    return state.settings.spoiler && t.spoiler && !earned.has(t.id);
  }

  function fmtTarget(t) {
    if (t.count === undefined) return '';
    if (t.count_unit === '$') return '$' + t.count.toLocaleString('en-US');
    if (t.count_unit === '%') return t.count + '%';
    return String(t.count);
  }

  function fmtCompact(t) {
    if (t.count === undefined) return '';
    if (t.count_unit === '$') return '$' + Math.round(t.count / 1000) + 'k';
    return fmtTarget(t);
  }

  /* ---------- header ---------- */
  function renderHeader() {
    var total = trophies.length;
    var n = earned.size;
    $('pct').textContent = Math.round((n / total) * 100) + '%';
    $('countLabel').textContent = n + ' / ' + total + ' earned';
    $('barFill').style.width = (n / total) * 100 + '%';
    var chips = $('gradeChips');
    chips.replaceChildren();
    GRADES.forEach(function (g) {
      var all = trophies.filter(function (t) { return t.grade === g; });
      var got = all.filter(function (t) { return earned.has(t.id); }).length;
      var chip = el('span', 'grade-chip');
      chip.append(el('span', 'dot ' + g));
      chip.append(document.createTextNode(g.charAt(0).toUpperCase() + g.slice(1) + ' ' + got + '/' + all.length));
      chips.append(chip);
    });
    $('demoBadge').hidden = !window.Store.demo;
  }

  /* ---------- filters ---------- */
  function visibleTrophies() {
    var q = $('search').value.trim().toLowerCase();
    var grade = $('fGrade').value;
    var cat = $('fCategory').value;
    var status = $('fStatus').value;
    return trophies.filter(function (t) {
      if (grade !== 'all' && t.grade !== grade) return false;
      if (cat === 'missable') { if (!t.missable) return false; }
      else if (cat !== 'all' && t.category !== cat) return false;
      if (status === 'earned' && !earned.has(t.id)) return false;
      if (status === 'remaining' && earned.has(t.id)) return false;
      if (state.settings.hideEarned && earned.has(t.id)) return false;
      if (q) {
        var hay = (t.name + ' ' + t.description + ' ' + t.id).toLowerCase();
        if (!isHidden(t)) hay += ' ' + t.guide.toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  /* ---------- checklist ---------- */
  function renderList() {
    var scroll = listEl.scrollTop;
    var vis = visibleTrophies();
    listEl.replaceChildren();
    vis.forEach(function (t) {
      var hidden = isHidden(t);
      var row = el('div', 'row' + (earned.has(t.id) ? ' earned' : '') +
        (t.id === selectedId ? ' selected' : '') + (hidden ? ' hidden-story' : ''));
      row.dataset.id = t.id;

      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = earned.has(t.id);
      box.setAttribute('aria-label', 'Mark ' + (hidden ? 'hidden story trophy' : t.name) + ' earned');
      box.addEventListener('click', function (e) { e.stopPropagation(); });
      box.addEventListener('change', function () { toggleEarned(t.id, box.checked); });
      row.append(box);

      var main = el('div', 'row-main');
      var top = el('div', 'row-top');
      top.append(el('span', 'tname', hidden ? '???' : t.name));
      top.append(el('span', 'badge ' + t.grade, t.grade));
      var tags = el('span', 'row-tags');
      if (t.count !== undefined) {
        var c = el('span', 'tag count', fmtCompact(t));
        c.title = 'Target: ' + fmtTarget(t) + (t.count_note ? ' — ' + t.count_note : '');
        tags.append(c);
      }
      tags.append(el('span', 'tag', CAT_LABEL[t.category] || t.category));
      if (t.missable) {
        var m = el('span', 'tag miss', '⚑ missable');
        m.title = t.missable_note;
        tags.append(m);
      }
      top.append(tags);
      main.append(top);
      main.append(el('div', 'row-desc', hidden
        ? 'Story trophy — hidden until earned (spoiler guard).'
        : t.description));
      row.append(main);

      row.addEventListener('click', function () { openGuide(t.id); });
      listEl.append(row);
    });
    listEl.scrollTop = scroll;
    $('resultCount').textContent = 'Showing ' + vis.length + ' of ' + trophies.length;
  }

  function toggleEarned(id, on) {
    if (on) earned.add(id); else earned.delete(id);
    syncEarned();
    renderAll();
  }

  /* ---------- detail / guide ---------- */
  function renderDetail() {
    detailEl.replaceChildren();
    if (selectedId === null || !byId.has(selectedId)) {
      var empty = el('div', 'detail-empty');
      empty.append(el('span', 'big', '◆'));
      empty.append(document.createTextNode('Select a trophy to read its guide.'));
      empty.append(el('p', '', 'Guides are written in this app’s own words and cite their sources. Story trophies can be hidden with the spoiler guard until you earn them.'));
      detailEl.append(empty);
      return;
    }
    var t = byId.get(selectedId);
    var hidden = isHidden(t);

    var head = el('div', 'detail-head');
    var h2 = el('h2', '', hidden ? '???' : t.name);
    head.append(h2);
    var close = el('button', 'detail-close', '✕');
    close.type = 'button';
    close.title = 'Close guide';
    close.addEventListener('click', function () { selectedId = null; renderList(); renderDetail(); });
    head.append(close);
    detailEl.append(head);

    var sub = el('div', 'detail-sub');
    sub.append(el('span', 'badge ' + t.grade, t.grade));
    sub.append(el('span', 'tag', CAT_LABEL[t.category] || t.category));
    if (t.missable) sub.append(el('span', 'tag miss', '⚑ missable'));
    if (t.count !== undefined) {
      var tg = el('span', 'tag count', 'target: ' + fmtTarget(t));
      if (t.count_note) tg.title = t.count_note;
      sub.append(tg);
    }
    if (t.spoiler) sub.append(el('span', 'tag', 'spoiler guarded'));
    detailEl.append(sub);

    if (hidden) {
      var lock = el('div', 'locked');
      lock.append(el('span', 'q', '? ? ?'));
      lock.append(el('p', '', 'This story trophy is hidden by the spoiler guard. Earn it — or switch the guard off — to reveal its name, description and guide.'));
      detailEl.append(lock);
    } else {
      detailEl.append(el('div', 'dlabel', 'Official description'));
      detailEl.append(el('p', 'official', t.description));

      detailEl.append(el('div', 'dlabel', 'Guide'));
      detailEl.append(el('p', 'guide-text', t.guide));
      if (t.count !== undefined && t.count_note) {
        detailEl.append(el('p', 'count-note', t.count_note));
      }

      detailEl.append(el('div', 'dlabel', 'Missable?'));
      detailEl.append(el('p', 'note-box' + (t.missable ? ' warn' : ''), t.missable_note));

      detailEl.append(el('div', 'dlabel', 'Sources'));
      var ul = el('ul', 'sources');
      t.sources.forEach(function (s) {
        var li = el('li');
        if (s.url) {
          var a = el('a', '', s.name);
          a.href = s.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          li.append(a);
        } else {
          li.append(document.createTextNode(s.name + ' '));
          var hint = el('span', 'src-hint', '(named guide)');
          hint.title = 'Cited by name — this app does not invent article URLs it has not seen.';
          li.append(hint);
        }
        ul.append(li);
      });
      detailEl.append(ul);
    }

    var actions = el('div', 'detail-actions');
    var mark = el('button', earned.has(t.id) ? 'ghost' : 'primary',
      earned.has(t.id) ? 'Unmark earned' : 'Mark earned');
    mark.type = 'button';
    mark.addEventListener('click', function () { toggleEarned(t.id, !earned.has(t.id)); });
    actions.append(mark);
    var nav = el('span', 'detail-nav');
    [['← Prev', t.id - 1], ['Next →', t.id + 1]].forEach(function (pair) {
      var b = el('button', 'ghost', pair[0]);
      b.type = 'button';
      b.disabled = !byId.has(pair[1]);
      b.addEventListener('click', function () { openGuide(pair[1]); });
      nav.append(b);
    });
    actions.append(nav);
    detailEl.append(actions);
  }

  function openGuide(id) {
    if (!byId.has(id)) return;
    selectedId = id;
    renderList();
    renderDetail();
    var row = listEl.querySelector('.row[data-id="' + id + '"]');
    if (row) row.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- roadmap ---------- */
  function chipFor(t, capstone) {
    var hidden = isHidden(t);
    var chip = el('button', 'chip' + (earned.has(t.id) ? ' earned' : '') + (capstone ? ' capstone' : ''));
    chip.type = 'button';
    chip.append(el('span', 'dot ' + t.grade));
    chip.append(el('span', 'chip-name', hidden ? '???' : t.name));
    if (t.count !== undefined && !hidden) chip.append(el('span', 'chip-count', fmtCompact(t)));
    chip.title = hidden ? 'Hidden story trophy — earn it to reveal' : t.description;
    chip.addEventListener('click', function () { setTab('tracker'); openGuide(t.id); });
    return chip;
  }

  function renderRoadmap() {
    roadmapEl.replaceChildren();
    var intro = el('div', 'roadmap-intro');
    var strong = el('strong', '', 'Road to Platinum · 55 trophies · 5 phases. ');
    intro.append(strong);
    intro.append(document.createTextNode(DATA.notes.missables + ' ' + DATA.notes.honesty));
    roadmapEl.append(intro);

    DATA.roadmap.forEach(function (p) {
      var card = el('div', 'phase');
      var head = el('div', 'phase-head');
      head.append(el('span', 'phase-num', String(p.phase)));
      head.append(el('h3', '', p.title));
      var got = p.ids.filter(function (id) { return earned.has(id); }).length;
      head.append(el('span', 'phase-progress', got + ' / ' + p.ids.length + ' earned'));
      card.append(head);
      card.append(el('p', 'phase-blurb', p.blurb));
      var chips = el('div', 'chips');
      p.ids.forEach(function (id) { chips.append(chipFor(byId.get(id), false)); });
      card.append(chips);
      roadmapEl.append(card);
    });

    var cap = el('div', 'phase');
    var capHead = el('div', 'phase-head');
    capHead.append(el('span', 'phase-num', '★'));
    capHead.append(el('h3', '', 'The Platinum'));
    capHead.append(el('span', 'phase-progress', (earned.has(1) ? 1 : 0) + ' / 1 earned'));
    cap.append(capHead);
    cap.append(el('p', 'phase-blurb', 'Vice Got a Price! unlocks automatically once the other 54 trophies are earned. When every phase above reads complete, the platinum is yours — Leonida Legend.'));
    var capChips = el('div', 'chips');
    capChips.append(chipFor(byId.get(1), true));
    cap.append(capChips);
    roadmapEl.append(cap);
  }

  /* ---------- tabs ---------- */
  function setTab(name) {
    var tracker = name !== 'roadmap';
    $('viewTracker').hidden = !tracker;
    $('viewRoadmap').hidden = tracker;
    $('tabTracker').classList.toggle('active', tracker);
    $('tabRoadmap').classList.toggle('active', !tracker);
    if (!tracker) renderRoadmap();
  }

  function renderAll() {
    renderHeader();
    renderList();
    renderDetail();
    if (!$('viewRoadmap').hidden) renderRoadmap();
  }

  /* ---------- export / import / reset ---------- */
  function doExport() {
    var payload = window.Store.exportPayload(state);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  function applyImport(text) {
    var msg = $('importMsg');
    try {
      var result = window.Store.parseImport(text, trophies);
      earned = new Set(result.earned);
      if (result.settings) state.settings = result.settings;
      syncEarned();
      $('fSpoiler').checked = state.settings.spoiler;
      $('fHideEarned').checked = state.settings.hideEarned;
      renderAll();
      msg.className = 'import-msg';
      msg.textContent = 'Imported ' + result.earned.length + ' earned trophies' +
        (result.skipped ? ' (' + result.skipped + ' unknown entries skipped)' : '') + '.';
    } catch (e) {
      msg.className = 'import-msg err';
      msg.textContent = 'Import failed: ' + e.message;
    }
  }

  /* ---------- wiring ---------- */
  $('tabTracker').addEventListener('click', function () { setTab('tracker'); });
  $('tabRoadmap').addEventListener('click', function () { setTab('roadmap'); });
  $('search').addEventListener('input', renderList);
  ['fGrade', 'fCategory', 'fStatus'].forEach(function (id) {
    $(id).addEventListener('change', renderList);
  });
  $('fSpoiler').addEventListener('change', function () {
    state.settings.spoiler = this.checked;
    window.Store.save(state);
    renderAll();
  });
  $('fHideEarned').addEventListener('change', function () {
    state.settings.hideEarned = this.checked;
    window.Store.save(state);
    renderList();
  });
  $('btnExport').addEventListener('click', doExport);
  $('btnImport').addEventListener('click', function () {
    $('importMsg').textContent = '';
    $('importText').value = '';
    $('importFile').value = '';
    $('importDialog').showModal();
  });
  $('importCancel').addEventListener('click', function () { $('importDialog').close(); });
  $('importFile').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    f.text().then(function (text) { $('importText').value = text; });
  });
  $('importApply').addEventListener('click', function () { applyImport($('importText').value); });
  $('btnReset').addEventListener('click', function () {
    if (!window.confirm('Reset all progress? This clears every earned trophy on this browser.')) return;
    earned = new Set();
    syncEarned();
    renderAll();
  });

  $('footNote').textContent = DATA.notes.missables + ' Sources: official list via Exophase; PSNProfiles and PowerPyx guides cited by name. ' +
    'Progress is saved locally in your browser (localStorage) — nothing is sent anywhere.';

  /* ---------- deterministic screenshot support ---------- */
  var params = window.Store.params;
  var shot = params.get('shot');
  $('fSpoiler').checked = state.settings.spoiler;
  $('fHideEarned').checked = state.settings.hideEarned;
  if (shot === 'spoiler') {
    state.settings.spoiler = true;
    $('fSpoiler').checked = true;
    window.Store.save(state);
  }
  if (shot === 'roadmap') {
    setTab('roadmap');
    // Let the document grow so a full-page capture shows every phase.
    document.body.classList.add('shot-full');
    document.documentElement.style.height = 'auto';
  }
  renderAll();
  if (shot === 'guide') {
    var gid = Number(params.get('id'));
    openGuide(Number.isFinite(gid) && byId.has(gid) ? gid : 17);
  }

  window.__app = {
    state: state,
    earned: earned,
    openGuide: openGuide,
    setTab: setTab,
    toggle: toggleEarned,
    render: renderAll
  };
  window.__shotReady = true;
})();
