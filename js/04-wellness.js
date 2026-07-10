/* Fit with Science — 04-wellness.js
   Wellness, form benessere, import HC/CSV
   Script classici in ordine: condividono lo scope lessicale globale. */
'use strict';

/* =====================================================================
   PAGINE
   ===================================================================== */
/* =====================================================================
   WELLNESS — sonno, FC riposo, HRV, readiness, zone, fitness age
   Dati per giorno in Store.data.wellness[YYYY-MM-DD]:
   { rhr, hrv, sleepMin, deepMin, remMin } (tutti opzionali)
   ===================================================================== */
const Wellness = {
  days() { return Object.keys(Store.data.wellness).sort(); },
  get(date) { return Store.data.wellness[date] || null; },
  latest(field) {
    const ds = this.days().reverse();
    for (const d of ds) { const v = Store.data.wellness[d]?.[field]; if (v != null) return { date: d, value: v }; }
    return null;
  },

  /* Media di un campo sugli ultimi n giorni prima di `before` (baseline) */
  baseline(field, before, n = 30) {
    const vals = this.days()
      .filter(d => d < before)
      .slice(-n)
      .map(d => Store.data.wellness[d][field])
      .filter(v => v != null);
    return vals.length >= 3 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  },

  sleepQuality(w) {
    if (!w?.sleepMin || (w.deepMin == null && w.remMin == null)) return null;
    return ((w.deepMin || 0) + (w.remMin || 0)) / w.sleepMin * 100;
  },

  /* Componenti readiness 0–100 (presenti → pesate uguali nel totale).
     RHR sotto baseline = meglio; HRV sopra baseline = meglio;
     sonno vs 7h45; quota ristorativa vs 45%. */
  readinessParts(date) {
    const w = this.get(date);
    if (!w) return null;
    const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
    const parts = {};

    if (w.rhr != null) {
      const base = this.baseline('rhr', date);
      parts.rhr = base ? clamp(50 + (base - w.rhr) * 5) : 50;
    }
    if (w.hrv != null) {
      const base = this.baseline('hrv', date);
      parts.hrv = base ? clamp(50 + (w.hrv - base) * 2) : 50;
    }
    if (w.sleepMin != null) parts.sleep = clamp(w.sleepMin / 465 * 100);
    const q = this.sleepQuality(w);
    if (q != null) parts.quality = clamp(q / 45 * 100);

    return Object.keys(parts).length ? parts : null;
  },

  readiness(date) {
    const parts = this.readinessParts(date);
    if (!parts) return null;
    const vals = Object.values(parts);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  },

  /* Trend 0–100 su tutto lo storico: regressione lineare del campo.
     dir −1 = scendere è adattamento (RHR); dir +1 = salire (HRV).
     50 = piatto; k scala la pendenza mensile. */
  trendScore(field, dir, k) {
    const ds = this.days().map(d => ({ d, v: this.get(d)?.[field] })).filter(x => x.v != null);
    if (ds.length < 5) return null;
    const x0 = new Date(ds[0].d + 'T00:00');
    const xs = ds.map(x => (new Date(x.d + 'T00:00') - x0) / 86400000);
    const ys = ds.map(x => x.v);
    const n = xs.length;
    const sx = xs.reduce((a, b) => a + b, 0), sy = ys.reduce((a, b) => a + b, 0);
    const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0), sxx = xs.reduce((a, x) => a + x * x, 0);
    const denom = n * sxx - sx * sx;
    if (!denom) return null;
    const perMonth = (n * sxy - sx * sy) / denom * 30;
    return Math.max(0, Math.min(100, Math.round(50 + dir * perMonth * k)));
  },

  /* Zone Karvonen: HRmax Tanaka (208 − 0.7×età), riserva = HRmax − RHR */
  zones() {
    const age = Store.data.profile.age;
    const rhr = this.latest('rhr')?.value;
    if (!age || !rhr) return null;
    const hrmax = Math.round(208 - 0.7 * age);
    const hrr = hrmax - rhr;
    const at = p => Math.round(rhr + hrr * p);
    return {
      hrmax, rhr,
      bands: [
        { key: 'z1', from: at(.50), to: at(.60), color: '#2563eb' },
        { key: 'z2', from: at(.60), to: at(.70), color: '#10b981' },
        { key: 'z3', from: at(.70), to: at(.80), color: '#f59e0b' },
        { key: 'z4', from: at(.80), to: at(.90), color: '#f97316' },
        { key: 'z5', from: at(.90), to: hrmax, color: '#ef4444' },
      ],
    };
  },

  /* VO2max stimato — Jackson et al. (1990), variante BMI, non-exercise */
  estVo2max() {
    const p = Store.data.profile;
    const weight = Stats.latestM()?.weight;
    if (!p.age || !p.height || !weight) return null;
    const bmi = weight / ((p.height / 100) ** 2);
    // PAR 0–7 dal volume medio settimanale reale (ultimi 90 giorni)
    const cutoff = daysAgo(90);
    const minWeek = Store.data.workouts.filter(w => w.date >= cutoff).reduce((tt, w) => tt + w.duration, 0) / 13;
    const par = minWeek >= 300 ? 6 : minWeek >= 200 ? 5 : minWeek >= 120 ? 4 : minWeek >= 60 ? 3 : minWeek >= 20 ? 2 : 1;
    const male = p.sex !== 'f' ? 1 : 0; // 'na' → formula maschile come default dichiarato
    return round1(56.363 + 1.921 * par - 0.381 * p.age - 0.754 * bmi + 10.987 * male);
  },

  /* Fitness age: età anagrafica + delta cappati (stile Garmin/HUNT, euristico) */
  fitnessAge() {
    const p = Store.data.profile;
    const vo2 = this.estVo2max();
    if (!p.age || vo2 == null) return null;
    const cap = (v, c) => Math.max(-c, Math.min(c, v));

    // Media VO2max di fascia (approssimazione lineare sul dato di popolazione)
    const male = p.sex !== 'f';
    const avgVo2 = (male ? 46 : 38) - 0.30 * (p.age - 25);
    const dVo2 = cap(-(vo2 - avgVo2) * 0.7, 6);

    const rhr = this.latest('rhr')?.value;
    const dRhr = rhr != null ? cap(-(60 - rhr) * 0.2, 4) : 0;

    const cutoff = daysAgo(90);
    const minWeek = Store.data.workouts.filter(w => w.date >= cutoff).reduce((tt, w) => tt + w.duration, 0) / 13;
    const dAct = cap(-(minWeek - 90) / 60, 2);

    const deltas = [
      { key: 'faVo2', value: round1(dVo2), detail: `${vo2} vs ~${round1(avgVo2)} ml/kg/min` },
      { key: 'faRhr', value: round1(dRhr), detail: rhr != null ? `${rhr} ${t('bpm')} vs 60` : '—' },
      { key: 'faActivity', value: round1(dAct), detail: `${Math.round(minWeek)} min/sett` },
    ];
    const fa = Math.max(18, round1(p.age + deltas.reduce((tt, d) => tt + d.value, 0)));
    return { age: p.age, fitnessAge: fa, delta: round1(fa - p.age), vo2, deltas };
  },
};

/* Form inserimento manuale dati benessere */
function wellnessForm(date = todayISO()) {
  const w = Wellness.get(date) || {};
  Modal.open({
    title: t('wellnessTitle'),
    body: `<div class="form-grid">
      <div class="field full"><label>${t('date')} *</label><input type="date" id="wfDate" data-req value="${date}" max="${todayISO()}"><div class="err-msg">${t('required')}</div></div>
      <div class="field"><label>${t('rhrLbl')} (${t('bpm')})</label><input type="number" min="25" max="120" id="wfRhr" value="${w.rhr ?? ''}" placeholder="55"></div>
      <div class="field"><label>${t('hrvLbl')} (${t('ms')})</label><input type="number" min="5" max="250" id="wfHrv" value="${w.hrv ?? ''}" placeholder="60"></div>
      <div class="field"><label>${t('sleepH')}</label><input type="number" min="0" max="16" step="0.25" id="wfSleep" value="${w.sleepMin ? round1(w.sleepMin / 60) : ''}" placeholder="7.5"></div>
      <div class="field"><label>${t('deepMin')}</label><input type="number" min="0" id="wfDeep" value="${w.deepMin ?? ''}" placeholder="90"></div>
      <div class="field"><label>${t('remMin')}</label><input type="number" min="0" id="wfRem" value="${w.remMin ?? ''}" placeholder="100"></div>
    </div>`,
    footer: `<button class="btn" onclick="Modal.close()">${t('cancel')}</button><button class="btn btn-primary" id="wfSave">${t('save')}</button>`,
    onMount(root) {
      $('#wfSave', root).onclick = () => {
        if (!validateForm(root)) { Toast.show(t('reqFields'), 'error'); return; }
        const d = $('#wfDate', root).value;
        const num = id => { const v = $('#' + id, root).value; return v === '' ? null : Number(v); };
        const rec = { ...(Store.data.wellness[d] || {}) };
        const rhr = num('wfRhr'), hrv = num('wfHrv'), sh = num('wfSleep'), deep = num('wfDeep'), rem = num('wfRem');
        if (rhr != null) rec.rhr = rhr;
        if (hrv != null) rec.hrv = hrv;
        if (sh != null) rec.sleepMin = Math.round(sh * 60);
        if (deep != null) rec.deepMin = deep;
        if (rem != null) rec.remMin = rem;
        Store.data.wellness[d] = rec;
        Store.save(); Modal.close(); Toast.show(t('wellnessSaved')); Router.render();
      };
    },
  });
}

/* Modale unica di import benessere: Fitbit / CSV Zepp / .db Health Connect.
   Richiamabile dalle pagine Riposo e Salute oltre che dalle Impostazioni. */
function wellnessImportDialog() {
  Modal.open({
    title: t('importWellness'),
    body: `
      <div class="list-row">
        <div class="list-ico ico-blue">${ic('activity')}</div>
        <div class="list-main"><b>Fitbit</b><span>${t('intFitbit')}</span></div>
        <button class="btn btn-sm btn-fixed ${Fitbit.connected() ? '' : 'btn-blue'}" id="wiFb" style="margin-left:auto">${Fitbit.connected() ? t('syncBtn') : t('connectBtn')}</button>
      </div>
      <div class="list-row">
        <div class="list-ico ico-emerald">${ic('upload')}</div>
        <div class="list-main"><b>Zepp / Amazfit · CSV</b><span>${t('intZepp')}</span></div>
        <button class="btn btn-sm btn-fixed" id="wiZepp" style="margin-left:auto">${t('impBtn')}</button>
        <input type="file" id="wiZeppFile" accept=".csv,text/csv" hidden>
      </div>
      <div class="list-row">
        <div class="list-ico ico-purple">${ic('upload')}</div>
        <div class="list-main"><b>Health Connect · .db</b><span>${t('intHc')}</span></div>
        <button class="btn btn-sm btn-fixed" id="wiHc" style="margin-left:auto">${t('impBtn')}</button>
        <input type="file" id="wiHcFile" accept=".db,application/octet-stream,application/x-sqlite3" hidden>
      </div>`,
    onMount(root) {
      $('#wiFb', root).onclick = () => {
        if (Fitbit.connected()) { Modal.close(); Fitbit.sync(false); }
        else Fitbit.connect();
      };
      $('#wiZepp', root).onclick = () => $('#wiZeppFile', root).click();
      $('#wiZeppFile', root).onchange = e => { const f = e.target.files[0]; if (f) { Modal.close(); importWellnessCSV(f); } };
      $('#wiHc', root).onclick = () => $('#wiHcFile', root).click();
      $('#wiHcFile', root).onchange = e => { const f = e.target.files[0]; if (f) { Modal.close(); importHealthConnectDB(f); } };
    },
  });
}

/* CSV benessere generico (Zepp/Amazfit e simili): riconosce le colonne
   dalle intestazioni — date, deep/profondo, rem, light/shallow, rhr/resting,
   hrv/rmssd, duration/totale. Valori sonno in minuti. */
function parseWellnessCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return {};
  const sep = lines[0].includes(';') ? ';' : ',';
  const head = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const idx = re => head.findIndex(h => re.test(h));

  const iDate = idx(/date|data|giorno|day/);
  const iDeep = idx(/deep|profondo/);
  const iRem = idx(/rem/);
  const iLight = idx(/light|shallow|leggero/);
  // durata totale: mai le colonne di fase (deep/rem/shallow…)
  const iDur = head.findIndex(h => !/(deep|rem|shallow|light|profondo|leggero)/.test(h)
    && /duration|totale|total|sleep.*(min|time|dur)/.test(h));
  const iRhr = idx(/resting|riposo|rhr/);
  const iHrv = idx(/hrv|rmssd/);
  if (iDate < 0) return {};

  const out = {};
  lines.slice(1).forEach(l => {
    const c = l.split(sep).map(x => x.trim().replace(/"/g, ''));
    const m = /(\d{4}-\d{2}-\d{2})/.exec(c[iDate] || '');
    if (!m) return;
    const date = m[1];
    const num = i => { if (i < 0) return null; const v = parseFloat(String(c[i]).replace(',', '.')); return isNaN(v) ? null : v; };
    const rec = {};
    const deep = num(iDeep), rem = num(iRem), light = num(iLight), dur = num(iDur);
    if (deep != null) rec.deepMin = Math.round(deep);
    if (rem != null) rec.remMin = Math.round(rem);
    if (dur != null) rec.sleepMin = Math.round(dur);
    else if (deep != null || rem != null || light != null) rec.sleepMin = Math.round((deep || 0) + (rem || 0) + (light || 0));
    const rhr = num(iRhr), hrv = num(iHrv);
    if (rhr != null && rhr > 20 && rhr < 130) rec.rhr = Math.round(rhr);
    if (hrv != null && hrv > 1 && hrv < 300) rec.hrv = round1(hrv);
    if (Object.keys(rec).length) out[date] = rec;
  });
  return out;
}

/* =====================================================================
   HEALTH CONNECT — import del database SQLite esportato (.db)
   Letto interamente nel browser via sql.js (WASM, caricato on-demand).
   Lo schema interno varia tra versioni → introspezione tollerante:
   si cercano tabelle/colonne per pattern, non per nome esatto.
   ===================================================================== */
function loadSqlJs() {
  if (window.initSqlJs) return Promise.resolve(window.initSqlJs);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js';
    s.onload = () => res(window.initSqlJs);
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function importHealthConnectDB(file) {
  Toast.show(t('hcLoading'), 'info');
  let db;
  try {
    const initSqlJs = await loadSqlJs();
    const SQL = await initSqlJs({ locateFile: f => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/' + f });
    db = new SQL.Database(new Uint8Array(await file.arrayBuffer()));
  } catch { Toast.show(t('invalidFile'), 'error'); return; }

  try {
    const tables = (db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values || []).flat();
    const cols = tb => (db.exec(`PRAGMA table_info(${JSON.stringify(tb)})`)[0]?.values || []).map(r => String(r[1]));
    const findT = re => tables.find(n => re.test(n.toLowerCase()));
    const findC = (cs, re, not = /$^/) => cs.find(c => re.test(c.toLowerCase()) && !not.test(c.toLowerCase()));
    const toDate = v => { const n = Number(v); return n > 1e10 ? isoOf(new Date(n)) : null; }; // epoch ms
    const rows = tb => { const r = db.exec(`SELECT * FROM ${JSON.stringify(tb)}`)[0]; return r ? r.values.map(v => Object.fromEntries(r.columns.map((c, i) => [c, v[i]]))) : []; };

    const well = Store.data.wellness;
    const put = (date, field, val) => { if (!date || val == null) return; well[date] = well[date] || {}; well[date][field] = val; touched.add(date); };
    const touched = new Set();

    // FC a riposo
    const tRhr = findT(/resting_heart_rate/);
    if (tRhr) {
      const cs = cols(tRhr);
      const cT = findC(cs, /time/), cV = findC(cs, /beats|bpm|rate/, /time/);
      if (cT && cV) rows(tRhr).forEach(r => { const v = Number(r[cV]); if (v > 20 && v < 130) put(toDate(r[cT]), 'rhr', Math.round(v)); });
    }

    // HRV rMSSD
    const tHrv = findT(/heart_rate_variability/);
    if (tHrv) {
      const cs = cols(tHrv);
      const cT = findC(cs, /time/), cV = findC(cs, /millis|rmssd|variability/, /time/);
      if (cT && cV) rows(tHrv).forEach(r => { const v = Number(r[cV]); if (v > 1 && v < 300) put(toDate(r[cT]), 'hrv', round1(v)); });
    }

    // Sessioni di sonno (durata) — data = fine sessione
    const tSleep = findT(/sleep_session/);
    if (tSleep) {
      const cs = cols(tSleep);
      const cS = findC(cs, /start.*time|time.*start/), cE = findC(cs, /end.*time|time.*end/);
      if (cS && cE) rows(tSleep).forEach(r => {
        const start = Number(r[cS]), end = Number(r[cE]);
        if (end > start && start > 1e10) {
          const min = Math.round((end - start) / 60000);
          if (min > 60 && min < 20 * 60) put(toDate(end), 'sleepMin', min);
        }
      });
    }

    // Fasi del sonno: HC stage_type → 5 = deep, 6 = REM
    const tStage = findT(/sleep_stage/);
    if (tStage) {
      const cs = cols(tStage);
      const cS = findC(cs, /start.*time|time.*start/), cE = findC(cs, /end.*time|time.*end/), cTy = findC(cs, /type|stage/, /time/);
      if (cS && cE && cTy) {
        const acc = {}; // date → {deep, rem}
        rows(tStage).forEach(r => {
          const start = Number(r[cS]), end = Number(r[cE]), ty = Number(r[cTy]);
          if (!(end > start && start > 1e10)) return;
          const d = toDate(end);
          const min = (end - start) / 60000;
          acc[d] = acc[d] || { deep: 0, rem: 0 };
          if (ty === 5) acc[d].deep += min;
          if (ty === 6) acc[d].rem += min;
        });
        Object.entries(acc).forEach(([d, v]) => {
          if (v.deep) put(d, 'deepMin', Math.round(v.deep));
          if (v.rem) put(d, 'remMin', Math.round(v.rem));
        });
      }
    }

    // Peso → misurazioni (non sovrascrive giorni già presenti)
    let weights = 0;
    const tW = findT(/weight_record/);
    if (tW && !/planned/.test(tW)) {
      const cs = cols(tW);
      const cT = findC(cs, /time/), cV = findC(cs, /weight|grams|kilo/, /time/);
      if (cT && cV) {
        const existing = new Set(Store.data.measurements.map(m => m.date));
        rows(tW).forEach(r => {
          let v = Number(r[cV]);
          if (v > 1000) v = v / 1000; // grammi → kg
          const d = toDate(r[cT]);
          if (d && v >= 30 && v <= 300 && !existing.has(d)) {
            Store.data.measurements.push({ id: 'hc' + uid(), date: d, weight: round1(v), height: Store.data.profile.height ?? null, source: 'hc' });
            existing.add(d);
            weights++;
          }
        });
      }
    }

    db.close();
    if (!touched.size && !weights) { Toast.show(t('hcNone'), 'error'); return; }
    Store.save();
    Toast.show(t('hcImported', touched.size, weights));
    Router.render();
  } catch {
    db.close();
    Toast.show(t('hcNone'), 'error');
  }
}

function importWellnessCSV(file) {
  file.text().then(text => {
    let rows;
    try { rows = parseWellnessCSV(text); } catch { Toast.show(t('invalidFile'), 'error'); return; }
    const dates = Object.keys(rows);
    if (!dates.length) { Toast.show(t('zeppNone'), 'error'); return; }
    dates.forEach(d => { Store.data.wellness[d] = { ...(Store.data.wellness[d] || {}), ...rows[d] }; });
    Store.save();
    Toast.show(t('zeppImported', dates.length));
    Router.render();
  }).catch(() => Toast.show(t('invalidFile'), 'error'));
}
