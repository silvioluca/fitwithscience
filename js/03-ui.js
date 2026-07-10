/* Fit with Science — 03-ui.js
   Toast, Modal, Charts, Stats, tabelle, card
   Script classici in ordine: condividono lo scope lessicale globale. */
'use strict';

/* =====================================================================
   TOAST / MODAL / CONFIRM
   ===================================================================== */
const Toast = {
  show(msg, type = 'success') {
    const icons = { success: 'check', error: 'x', info: 'info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-ico">${ic(icons[type])}</span><span>${esc(msg)}</span>`;
    $('#toastRoot').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
  },
};

const Modal = {
  open({ title, body, footer, wide = false, locked = false, onMount }) {
    const root = $('#modalRoot');
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>${esc(title)}</h3>${locked ? '' : `<button class="btn-icon modal-close" aria-label="${t('close')}">${ic('x')}</button>`}</div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>`;
    requestAnimationFrame(() => root.classList.add('open'));
    if (!locked) {
      $('.modal-close', root).onclick = () => Modal.close();
      $('.modal-backdrop', root).onclick = () => Modal.close();
    }
    if (onMount) onMount(root);
    return root;
  },
  close() {
    const root = $('#modalRoot');
    root.classList.remove('open');
    setTimeout(() => { root.innerHTML = ''; }, 280);
  },
};

function confirmDialog(msg, onYes) {
  Modal.open({
    title: t('confirm'),
    body: `<p style="font-size:14px">${esc(msg)}</p>`,
    footer: `<button class="btn" id="cfNo">${t('cancel')}</button><button class="btn btn-danger" id="cfYes">${t('del')}</button>`,
    onMount(root) {
      $('#cfNo', root).onclick = () => Modal.close();
      $('#cfYes', root).onclick = () => { Modal.close(); onYes(); };
    },
  });
}

function validateForm(root) {
  let ok = true;
  $$('[data-req]', root).forEach(inp => {
    const bad = inp.value.trim() === '' || (inp.dataset.pos !== undefined && Number(inp.value) < 0);
    inp.classList.toggle('invalid', bad);
    if (bad) ok = false;
  });
  return ok;
}

/* =====================================================================
   CHART HELPERS
   ===================================================================== */
const Charts = {
  registry: [],
  destroyAll() { this.registry.forEach(c => c.destroy()); this.registry = []; },
  make(canvasId, config) {
    const ctx = $('#' + canvasId);
    if (!ctx) return null;
    const c = new Chart(ctx, config);
    this.registry.push(c);
    return c;
  },
  baseOpts(extra = {}) {
    const css = getComputedStyle(document.documentElement);
    const grid = css.getPropertyValue('--border').trim();
    const text = css.getPropertyValue('--text-soft').trim();
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: { labels: { color: text, boxWidth: 12, boxHeight: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,.92)', padding: 10, cornerRadius: 10,
          titleFont: { family: 'Inter', weight: '700' }, bodyFont: { family: 'Inter' },
        },
      },
      scales: {
        x: { grid: { color: grid, drawOnChartArea: false }, ticks: { color: text, font: { family: 'Inter', size: 10.5 } } },
        y: { grid: { color: grid }, ticks: { color: text, font: { family: 'Inter', size: 10.5 } }, border: { display: false } },
      },
      ...extra,
    };
  },
  colors: { emerald: '#10b981', blue: '#2563eb', amber: '#f59e0b', red: '#ef4444', purple: '#8b5cf6' },
  gradient(canvasId, color) {
    const ctx = $('#' + canvasId)?.getContext('2d');
    if (!ctx) return color + '22';
    const g = ctx.createLinearGradient(0, 0, 0, 280);
    g.addColorStop(0, color + '4d');
    g.addColorStop(1, color + '05');
    return g;
  },
};

/* =====================================================================
   DERIVED DATA / STATS
   ===================================================================== */
const Stats = {
  sortedMeasurements() { return [...Store.data.measurements].sort((a, b) => a.date.localeCompare(b.date)); },
  latestM() { const s = this.sortedMeasurements(); return s[s.length - 1] || null; },
  prevM() { const s = this.sortedMeasurements(); return s[s.length - 2] || null; },

  bmi(m) {
    const h = m?.height || Store.data.profile.height;
    return m && h ? round1(m.weight / ((h / 100) ** 2)) : null;
  },

  /* Volume: reps → serie×rip×kg; durata (es. plank) → serie×kg (i secondi non sono volume) */
  workoutVolume(w) { return w.exercises.reduce((tt, e) => tt + (e.mode === 'time' ? e.sets * e.weight : e.sets * e.reps * e.weight), 0); },
  sortedWorkouts() { return [...Store.data.workouts].sort((a, b) => b.date.localeCompare(a.date)); },

  streak() {
    const dates = [...new Set(Store.data.workouts.map(w => w.date))].sort().reverse();
    if (!dates.length) return 0;
    let streak = 0; let cursor = new Date();
    for (const d of dates) {
      const diff = Math.round((cursor - new Date(d + 'T00:00')) / 86400000);
      if (diff <= 2) { streak++; cursor = new Date(d + 'T00:00'); }
      else break;
    }
    return streak;
  },

  weekWorkouts() {
    const from = daysAgo(6);
    return Store.data.workouts.filter(w => w.date >= from);
  },

  mealsFor(date) { return Store.data.meals.filter(m => m.date === date); },

  dayMacros(date) {
    return this.mealsFor(date).reduce((tt, m) => ({
      kcal: tt.kcal + m.kcal, protein: tt.protein + m.protein, carbs: tt.carbs + m.carbs, fat: tt.fat + m.fat,
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  },

  personalRecords() {
    const best = {};
    Store.data.workouts.forEach(w => w.exercises.forEach(e => {
      if (!e.weight || e.mode === 'time') return; // Epley non ha senso sui secondi
      const orm = e.weight * (1 + e.reps / 30); // 1RM stimato (Epley)
      if (!best[e.name] || orm > best[e.name].orm) best[e.name] = { orm, weight: e.weight, reps: e.reps, date: w.date, name: e.name };
    }));
    return Object.values(best).sort((a, b) => b.orm - a.orm);
  },

  muscleFrequency() {
    const freq = {};
    Store.data.workouts.forEach(w => w.exercises.forEach(e => { freq[e.group] = (freq[e.group] || 0) + e.sets; }));
    return freq;
  },
};

/* =====================================================================
   GENERIC TABLE — ordinamento, ricerca, paginazione, export CSV
   ===================================================================== */
function renderTable({ mountId, columns, rows, pageSize = 8, csvName, onEdit, onDelete, onShare, emptyMsg }) {
  const mount = $('#' + mountId);
  if (!mount) return;
  let state = { sortKey: columns[0].key, sortDir: -1, page: 1, q: '' };

  function filtered() {
    let r = rows;
    if (state.q) {
      const q = state.q.toLowerCase();
      r = r.filter(row => columns.some(c => String(row[c.key] ?? '').toLowerCase().includes(q)));
    }
    r = [...r].sort((a, b) => {
      const va = a[state.sortKey], vb = b[state.sortKey];
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return cmp * state.sortDir;
    });
    return r;
  }

  function draw() {
    const all = filtered();
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    state.page = Math.min(state.page, pages);
    const slice = all.slice((state.page - 1) * pageSize, state.page * pageSize);

    const thead = columns.map(c =>
      `<th data-k="${c.key}">${esc(c.label)}${state.sortKey === c.key ? `<span class="sort-arrow">${state.sortDir > 0 ? '▲' : '▼'}</span>` : ''}</th>`
    ).join('') + (onEdit || onDelete || onShare ? '<th></th>' : '');

    const tbody = slice.length ? slice.map(row => `<tr>
      ${columns.map(c => `<td>${c.render ? c.render(row) : esc(row[c.key])}</td>`).join('')}
      ${onEdit || onDelete || onShare ? `<td><div class="td-actions">
        ${onShare ? `<button class="btn-icon" data-share="${row.id}" title="${t('share')}">${ic('share')}</button>` : ''}
        ${onEdit ? `<button class="btn-icon" data-edit="${row.id}" title="${t('edit')}">${ic('pencil')}</button>` : ''}
        ${onDelete ? `<button class="btn-icon danger" data-del="${row.id}" title="${t('del')}">${ic('trash')}</button>` : ''}
      </div></td>` : ''}
    </tr>`).join('')
      : `<tr><td colspan="${columns.length + 1}"><div class="empty-state"><div class="es-ico">${ic('inbox')}</div><b>${t('noResults')}</b><p>${esc(emptyMsg || t('noData'))}</p></div></td></tr>`;

    let pager = '';
    for (let p = 1; p <= pages; p++) pager += `<button class="${p === state.page ? 'active' : ''}" data-pg="${p}">${p}</button>`;

    mount.innerHTML = `
      <div class="table-scroll"><table class="data-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>
      <div class="table-footer"><span>${all.length} ${t('items')}</span><div class="pager">${pager}</div></div>`;

    $$('th[data-k]', mount).forEach(th => th.onclick = () => {
      const k = th.dataset.k;
      if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = 1; }
      draw();
    });
    $$('[data-pg]', mount).forEach(b => b.onclick = () => { state.page = Number(b.dataset.pg); draw(); });
    if (onEdit) $$('[data-edit]', mount).forEach(b => b.onclick = () => onEdit(b.dataset.edit));
    if (onDelete) $$('[data-del]', mount).forEach(b => b.onclick = () => onDelete(b.dataset.del));
    if (onShare) $$('[data-share]', mount).forEach(b => b.onclick = () => onShare(b.dataset.share));
  }

  draw();

  return {
    search(q) { state.q = q; state.page = 1; draw(); },
    exportCSV() {
      const all = filtered();
      const head = columns.map(c => `"${c.label}"`).join(';');
      const body = all.map(r => columns.map(c => `"${String(r[c.key] ?? '')}"`).join(';')).join('\n');
      const blob = new Blob(['﻿' + head + '\n' + body], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (csvName || 'export') + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      Toast.show(t('csvExported'), 'info');
    },
  };
}

/* Campi misure corporee (etichette bilingui) */
const M_FIELDS = [
  { key: 'weight', it: 'Peso', en: 'Weight', unit: 'kg' }, { key: 'height', it: 'Altezza', en: 'Height', unit: 'cm' },
  { key: 'bodyFat', it: 'Massa grassa', en: 'Body fat', unit: '%' },
  { key: 'neck', it: 'Collo', en: 'Neck', unit: 'cm' }, { key: 'shoulders', it: 'Spalle', en: 'Shoulders', unit: 'cm' },
  { key: 'chest', it: 'Petto', en: 'Chest', unit: 'cm' },
  { key: 'waist', it: 'Vita', en: 'Waist', unit: 'cm' }, { key: 'abdomen', it: 'Addome', en: 'Abdomen', unit: 'cm' },
  { key: 'hips', it: 'Fianchi', en: 'Hips', unit: 'cm' },
  { key: 'arm', it: 'Braccio', en: 'Arm', unit: 'cm' },
  { key: 'forearm', it: 'Avambraccio', en: 'Forearm', unit: 'cm' },
  { key: 'thigh', it: 'Coscia', en: 'Thigh', unit: 'cm' },
  { key: 'calf', it: 'Polpaccio', en: 'Calf', unit: 'cm' },
];
const fl = f => f[Lang.lang] || f.it;

/* Helper HTML */
/* Descrizioni brevi delle metriche (tooltip ⓘ) — lookup per etichetta tradotta */
function statTips() {
  const F = k => M_FIELDS.find(f => f.key === k);
  return {
    [t('curWeight')]: t('tipWeight'), 'BMI': t('tipBmi'), [t('bodyFat')]: t('tipBf'),
    [t('streak')]: t('tipStreak'), [t('kcalToday')]: t('tipKcalToday'), [t('workouts7')]: t('tipWork7'),
    [t('nextSession')]: t('tipNext'), [t('proteinToday')]: t('tipProteinToday'),
    [t('totSessions')]: t('tipSessions'), [t('totVolume')]: t('tipVolume'),
    [t('exDone')]: t('tipExDone'), [t('avgDuration')]: t('tipAvgDur'),
    [t('kcalLbl2')]: t('tipKcal'), [t('proteinS')]: t('tipProtein'),
    [t('carbsS')]: t('tipCarbs'), [t('fatS')]: t('tipFat'),
    [t('readiness')]: t('tipReadiness'), [t('sleepLast')]: t('tipSleep'),
    [t('rhrLbl')]: t('tipRhr'), [t('hrvLbl')]: t('tipHrv'),
    [t('estVo2')]: t('tipVo2'), [t('fitnessAge')]: t('tipFitAge'),
    ['Δ ' + fl(F('weight'))]: t('tipDeltaW'), ['Δ ' + fl(F('waist'))]: t('tipDeltaWaist'),
    [t('sessions')]: t('tipSessions'), 'Volume': t('tipVolume'),
  };
}

function statCard(label, value, delta, deltaCls, icoName, icoCls) {
  const tip = statTips()[label];
  return `<div class="stat-card">
    <div class="stat-top"><span class="stat-label">${label}</span><span class="stat-ico ${icoCls}">${ic(icoName)}</span></div>
    <div class="stat-value">${value}</div>
    ${delta ? `<div class="stat-delta ${deltaCls}">${delta}</div>` : ''}
    ${tip ? `<button type="button" class="info-tip" data-tip="${esc(tip)}" aria-label="Info">i</button>` : ''}
  </div>`;
}

/* Tooltip per le card (grafici, liste, tabelle) — lookup per titolo tradotto */
function cardTips() {
  const F = k => M_FIELDS.find(f => f.key === k);
  return {
    [t('weightTrend')]: t('tipChWeight'), [fl(F('weight'))]: t('tipChWeight'),
    [t('volTitle')]: t('tipVolume'), [t('volOverTime')]: t('tipVolume'),
    [t('dailyKcal')]: t('tipChKcal'), [t('kcalLbl2')]: t('tipChKcal'),
    [t('macroToday')]: t('tipChMacro'),
    [t('lastWorkouts')]: t('tipLastWork'), [t('lastMeasures')]: t('tipLastMeas'), [t('prs')]: t('tipPrs'),
    [t('trendTime')]: t('tipTrendTime'), [t('deltasPct')]: t('tipDeltas'),
    [t('allMeasChart')]: t('tipAllMeas'), [t('historyMeas')]: t('tipHistMeas'),
    [t('muscleFreq')]: t('tipMuscleFreq'), [t('workHistory')]: t('tipWorkHist'),
    [t('nutriGoals')]: t('tipNutriGoals'), [t('water')]: t('tipWater'),
    [t('sleep14')]: t('tipSleep14'), [t('rhrHrv14')]: t('tipRhrHrv'),
    [t('readinessTrend')]: t('tipReadiness'), [t('readyBreak')]: t('tipReadyBreak'),
    [t('fitnessAge')]: t('tipFitAge'), [t('hrZones')]: t('tipZones'),
    [t('rhrHistory')]: t('tipRhr'), [t('hrvHistory')]: t('tipHrv'),
    [t('keyGirths')]: t('tipGirths'), [t('pctImprove')]: t('tipImprove'),
  };
}

/* Inietta l'icona info nei titoli card dopo il render della pagina */
function hydrateCardTips() {
  let tips;
  try { tips = cardTips(); } catch { return; }
  $$('#content .card-title').forEach(el => {
    const card = el.closest('.card');
    if (!card || card.querySelector(':scope > .info-tip') || el.querySelector('.info-tip')) return;
    const key = (el.childNodes[0]?.textContent ?? el.textContent).trim();
    const tip = tips[key];
    if (!tip) return;
    // sempre nell'angolo in alto a destra; il CSS fa spazio agli altri controlli
    card.insertAdjacentHTML('beforeend', `<button type="button" class="info-tip card-corner" data-tip="${esc(tip)}" aria-label="Info">i</button>`);
  });
}

function macroBar(name, val, goal, unit) {
  const pct = Math.min(100, Math.round(val / goal * 100));
  return `<div class="macro-row">
    <div class="macro-head"><b>${name}</b><span>${val} / ${goal} ${unit}</span></div>
    <div class="progress"><div class="progress-fill ${val > goal ? 'over' : ''}" style="width:${pct}%"></div></div>
  </div>`;
}

function emptyState(icoName, title, msg) {
  return `<div class="empty-state"><div class="es-ico">${ic(icoName)}</div><b>${title}</b><p>${msg}</p></div>`;
}
