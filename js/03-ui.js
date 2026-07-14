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

  /* Media mobile del peso su finestra di 7 giorni (per data, non per indice) */
  weightMA7() {
    const ms = this.sortedMeasurements();
    return ms.map(m => {
      const from = new Date(m.date + 'T00:00'); from.setDate(from.getDate() - 6);
      const lo = isoOf(from);
      const win = ms.filter(x => x.date >= lo && x.date <= m.date);
      return round1(win.reduce((a, x) => a + x.weight, 0) / win.length);
    });
  },

  /* Serie per gruppo muscolare negli ultimi 7 giorni */
  weeklySetsByGroup() {
    const from = daysAgo(6);
    const out = {};
    Store.data.workouts.filter(w => w.date >= from).forEach(w =>
      w.exercises.forEach(e => { out[e.group] = (out[e.group] || 0) + e.sets; }));
    return out;
  },

  /* Ultima esecuzione di un esercizio (per data più recente) */
  lastExercisePerf(name) {
    const q = name.trim().toLowerCase();
    const ws = this.sortedWorkouts(); // già in ordine decrescente
    for (const w of ws) {
      const e = w.exercises.find(x => x.name.toLowerCase() === q);
      if (e) return { ...e, date: w.date };
    }
    return null;
  },

  /* Doppia progressione: RPE basso → sali, 9 → ripeti, 10 → scendi */
  suggestNextLoad(perf) {
    if (!perf || perf.mode === 'time' || !perf.weight) return null;
    if (perf.rpe >= 10) return { kind: 'less', weight: Math.max(0, round1(perf.weight - 2.5)) };
    if (perf.rpe === 9) return { kind: 'repeat', weight: perf.weight };
    return { kind: 'more', weight: round1(perf.weight + 2.5) };
  },


  /* Esercizi in crescita/stallo/calo: pendenza %/settimana del 1RM stimato
     (regressione lineare, ultimi 70 giorni; serve ≥3 sessioni su ≥14 giorni). */
  exerciseTrends() {
    const cutoff = daysAgo(70);
    const byName = {};
    [...Store.data.workouts].sort((a, b) => a.date.localeCompare(b.date))
      .filter(w => w.date >= cutoff)
      .forEach(w => w.exercises.forEach(e => {
        if (e.mode === 'time' || !e.weight) return;
        const orm = e.weight * (1 + e.reps / 30);
        (byName[e.name] = byName[e.name] || { group: e.group, pts: [] }).pts.push({ date: w.date, orm });
      }));

    const out = [];
    Object.entries(byName).forEach(([name, { group, pts }]) => {
      if (pts.length < 3) return;
      const span = (new Date(pts[pts.length - 1].date + 'T00:00') - new Date(pts[0].date + 'T00:00')) / 86400000;
      if (span < 14) return;
      const x0 = new Date(pts[0].date + 'T00:00');
      const xs = pts.map(p => (new Date(p.date + 'T00:00') - x0) / 86400000);
      const ys = pts.map(p => p.orm);
      const n = xs.length;
      const sx = xs.reduce((a, b) => a + b, 0), sy = ys.reduce((a, b) => a + b, 0);
      const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0), sxx = xs.reduce((a, x) => a + x * x, 0);
      const denom = n * sxx - sx * sx;
      if (!denom) return;
      const slopeDay = (n * sxy - sx * sy) / denom;
      const latest = ys[ys.length - 1];
      const pctWeek = latest ? round1(slopeDay * 7 / latest * 100) : 0;
      const trend = pctWeek >= 0.3 ? 'up' : pctWeek <= -0.3 ? 'down' : 'flat';
      out.push({ name, group, pctWeek, latest: round1(latest), trend, sessions: pts.length });
    });
    return out.sort((a, b) => a.pctWeek - b.pctWeek);
  },

  /* Serie per fascia di ripetizioni negli ultimi 90 giorni (esclude gli
     esercizi a durata, es. plank). */
  repRangeDistribution() {
    const cutoff = daysAgo(89);
    const out = { strength: 0, hypertrophy: 0, endurance: 0 };
    Store.data.workouts.filter(w => w.date >= cutoff).forEach(w => w.exercises.forEach(e => {
      if (e.mode === 'time' || !e.sets) return;
      if (e.reps <= 5) out.strength += e.sets;
      else if (e.reps <= 12) out.hypertrophy += e.sets;
      else out.endurance += e.sets;
    }));
    return out;
  },

  /* Monotonia (Foster): media / deviazione standard del volume settimanale
     sulle ultime N settimane. Richiede ≥4 settimane con volume > 0. */
  trainingMonotony(weeksN = 8) {
    const weeks = [];
    for (let w = weeksN - 1; w >= 0; w--) {
      const from = daysAgo(w * 7 + 6), to = daysAgo(w * 7);
      const vol = Store.data.workouts.filter(x => x.date >= from && x.date <= to)
        .reduce((tt, x) => tt + this.workoutVolume(x), 0);
      weeks.push(Math.round(vol));
    }
    const active = weeks.filter(v => v > 0);
    if (active.length < 4) return null;
    const mean = weeks.reduce((a, b) => a + b, 0) / weeks.length;
    const variance = weeks.reduce((a, v) => a + (v - mean) ** 2, 0) / weeks.length;
    const sd = Math.sqrt(variance);
    // sd=0 (volume identico ogni settimana) è il caso di monotonia MASSIMA,
    // non un dato mancante: 99 è un valore-sentinella oltre ogni soglia.
    const monotony = sd ? round1(mean / sd) : (mean > 0 ? 99 : null);
    const level = monotony == null ? null : monotony < 1.5 ? 'low' : monotony <= 2 ? 'moderate' : 'high';
    return { weeks, mean: Math.round(mean), monotony, level };
  },

  /* Proteine della data indicata per kg di peso corporeo (ultima misurazione). */
  proteinPerKg(date = todayISO()) {
    const w = this.latestM()?.weight;
    if (!w) return null;
    return round1(this.dayMacros(date).protein / w);
  },

  /* Media proteine per tipologia di pasto negli ultimi n giorni (solo i
     giorni in cui quel pasto è stato effettivamente registrato). */
  mealProteinSplit(days = 7) {
    const from = daysAgo(days - 1);
    const out = {};
    MEAL_KEYS.forEach(mk => {
      const byDay = {};
      Store.data.meals.filter(m => m.date >= from && m.meal === mk).forEach(m => {
        byDay[m.date] = (byDay[m.date] || 0) + m.protein;
      });
      const vals = Object.values(byDay);
      out[mk] = vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    });
    return out;
  },

  /* Giorni consecutivi (a ritroso da ieri) con calorie entro ±10%
     dell'obiettivo giornaliero e almeno un pasto registrato. */
  dietAdherenceStreak() {
    const goal = Store.data.goals.kcal;
    let streak = 0;
    for (let i = 1; i <= 60; i++) {
      const d = daysAgo(i);
      const meals = this.mealsFor(d);
      if (!meals.length) break;
      const kcal = this.dayMacros(d).kcal;
      if (Math.abs(kcal - goal) / goal > 0.1) break;
      streak++;
    }
    return streak;
  },

  /* Serie di massa magra stimata (peso × (1 − %grasso)) per le misurazioni
     che hanno la massa grassa registrata. */
  leanMassSeries() {
    return this.sortedMeasurements()
      .filter(m => m.bodyFat != null)
      .map(m => ({ date: m.date, weight: m.weight, lean: round1(m.weight * (1 - m.bodyFat / 100)) }));
  },

  /* Ritmo di variazione del peso: %/settimana sulle ultime ~28 giorni
     (stessa regressione usata per il TDEE), con classificazione. */
  weightPaceClass() {
    const from = daysAgo(27);
    const ms = this.sortedMeasurements().filter(m => m.date >= from);
    if (ms.length < 2) return null;
    const x0 = new Date(ms[0].date + 'T00:00');
    const xs = ms.map(m => (new Date(m.date + 'T00:00') - x0) / 86400000);
    if (xs[xs.length - 1] < 7) return null;
    const ys = ms.map(m => m.weight);
    const n = xs.length;
    const sx = xs.reduce((a, b) => a + b, 0), sy = ys.reduce((a, b) => a + b, 0);
    const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0), sxx = xs.reduce((a, x) => a + x * x, 0);
    const denom = n * sxx - sx * sx;
    if (!denom) return null;
    const slopeDay = (n * sxy - sx * sy) / denom;
    const kgWeek = round1(slopeDay * 7);
    const pctWeek = round1(kgWeek / ys[ys.length - 1] * 100);
    const abs = Math.abs(pctWeek);
    const level = abs < 0.15 ? 'stable' : abs <= 1 ? 'moderate' : 'fast';
    return { kgWeek, pctWeek, level };
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
    [t('streak')]: t('tipStreak'), [t('workouts7')]: t('tipWork7'),
    [t('nextSession')]: t('tipNext'),
    [t('totSessions')]: t('tipSessions'), [t('totVolume')]: t('tipVolume'),
    [t('exDone')]: t('tipExDone'), [t('avgDuration')]: t('tipAvgDur'),
    [t('kcalLbl2')]: t('tipKcal'), [t('proteinS')]: t('tipProtein'),
    [t('carbsS')]: t('tipCarbs'), [t('fatS')]: t('tipFat'),
    [t('readiness')]: t('tipReadiness'), [t('sleepLast')]: t('tipSleep'),
    [t('rhrLbl')]: t('tipRhr'), [t('hrvLbl')]: t('tipHrv'),
    [t('estVo2')]: t('tipVo2'), [t('fitnessAge')]: t('tipFitAge'),
    ['Δ ' + fl(F('weight'))]: t('tipDeltaW'), ['Δ ' + fl(F('waist'))]: t('tipDeltaWaist'),
    [t('sessions')]: t('tipSessions'), 'Volume': t('tipVolume'),
    [t('weightPace')]: t('tipWeightPace'), [t('proteinPerKg')]: t('tipProteinKg'),
    [t('adherStreak')]: t('tipAdherStreak'),
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
    [t('exHistCard')]: t('tipExHist'), [t('explTitle')]: t('tipExplorer'),
    [t('weeklySets')]: t('tipWeeklySets'), [t('insTitle')]: t('tipInsights'),
    [t('corrTitle')]: t('tipCorr'),
    [t('repRangeTitle')]: t('tipRepRange'), [t('stagTitle')]: t('tipStagnation'),
    [t('monoTitle')]: t('tipMonotony'), [t('proteinSplitTitle')]: t('tipProteinSplit'),
    [t('leanMassTitle')]: t('tipLeanMass'),
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
