/* Fit with Science — 07-integrations.js
   Google Fit + Fitbit
   Script classici in ordine: condividono lo scope lessicale globale. */
'use strict';

/* =====================================================================
   GOOGLE FIT — import da export Takeout
   L'API REST di Google Fit è stata dismessa da Google (giugno 2025) e
   Health Connect non espone API web: l'unica integrazione possibile da
   sito statico è l'import dello storico esportato da takeout.google.com.
   Formati supportati:
   - JSON raw (raw_com.google.weight_*.json): Data Points → fpVal + startTimeNanos
   - CSV "Daily activity metrics": colonna data + colonna peso medio
   ===================================================================== */
function parseGoogleFit(text, filename) {
  const out = []; // [{date, weight}]

  if (/\.json$/i.test(filename) || text.trim().startsWith('{')) {
    const j = JSON.parse(text);
    const points = j['Data Points'] || j.point || [];
    points.forEach(pt => {
      const v = pt.fitValue?.[0]?.value?.fpVal ?? pt.value?.[0]?.fpVal;
      const nanos = pt.startTimeNanos || pt.endTimeNanos;
      if (v && nanos) out.push({ date: new Date(Number(nanos) / 1e6).toISOString().slice(0, 10), weight: round1(v) });
    });
  } else {
    // CSV: individua colonna data e colonna peso (indipendente dalla lingua di export)
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return out;
    const head = lines[0].split(',').map(h => h.trim().toLowerCase());
    const wIdx = head.findIndex(h => /weight|peso/.test(h));
    const dIdx = head.findIndex(h => /date|data/.test(h));
    if (wIdx < 0) return out;
    lines.slice(1).forEach(l => {
      const cells = l.split(',');
      const w = parseFloat(cells[wIdx]);
      const rawDate = dIdx >= 0 ? cells[dIdx]?.trim() : null;
      const date = rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : null;
      if (!isNaN(w) && w > 0 && date) out.push({ date, weight: round1(w) });
    });
  }

  // Una misura per giorno (l'ultima vince), ordinate per data
  const byDate = {};
  out.forEach(r => { byDate[r.date] = r.weight; });
  return Object.entries(byDate).map(([date, weight]) => ({ date, weight })).sort((a, b) => a.date.localeCompare(b.date));
}

function importGoogleFitFile(file) {
  file.text().then(text => {
    let rows;
    try { rows = parseGoogleFit(text, file.name); }
    catch { Toast.show(t('invalidFile'), 'error'); return; }
    if (!rows.length) { Toast.show(t('gfitNone'), 'error'); return; }

    const existing = new Set(Store.data.measurements.map(m => m.date));
    let added = 0;
    rows.forEach(r => {
      if (existing.has(r.date)) return; // non sovrascrive misurazioni esistenti
      Store.data.measurements.push({ id: uid(), date: r.date, weight: r.weight, height: Store.data.profile.height ?? null });
      added++;
    });
    Store.save();
    Toast.show(t('gfitImported', added));
    Router.render();
  }).catch(() => Toast.show(t('invalidFile'), 'error'));
}

/* =====================================================================
   FITBIT — sync automatica via OAuth2 PKCE (100% client-side)
   Peso + massa grassa (log ultimi 90 giorni, finestre da 31gg max API)
   e attività → allenamenti. Auto-sync una volta al giorno all'avvio.
   ===================================================================== */
const Fitbit = {
  API: 'https://api.fitbit.com',

  storeKey() { return 'fws-fitbit-' + (CURRENT_USER?.id || Auth.current()?.id || 'anon'); },
  tokens() { try { return JSON.parse(localStorage.getItem(this.storeKey())); } catch { return null; } },
  saveTokens(tk) { localStorage.setItem(this.storeKey(), JSON.stringify(tk)); },
  clearTokens() { localStorage.removeItem(this.storeKey()); },
  connected() { return !!this.tokens()?.refresh; },
  configured() { return !FITBIT_CLIENT_ID.startsWith('YOUR'); },

  redirectUri() { return location.origin + location.pathname; },

  /* --- PKCE helpers --- */
  b64url(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  randVerifier() {
    const a = new Uint8Array(64);
    crypto.getRandomValues(a);
    return this.b64url(a).slice(0, 96);
  },

  /* Avvia il flusso: redirect alla pagina di autorizzazione Fitbit */
  async connect() {
    if (!this.configured()) { Toast.show(t('fbNotConf'), 'error'); return; }
    const verifier = this.randVerifier();
    localStorage.setItem('fws-fb-verifier', verifier);
    const challenge = this.b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const params = new URLSearchParams({
      client_id: FITBIT_CLIENT_ID,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: 'weight activity profile',
      redirect_uri: this.redirectUri(),
    });
    location.href = 'https://www.fitbit.com/oauth2/authorize?' + params;
  },

  /* Al ritorno dal redirect (?code=...) scambia il codice con i token */
  async handleRedirect() {
    const code = new URLSearchParams(location.search).get('code');
    const verifier = localStorage.getItem('fws-fb-verifier');
    if (!code || !verifier) return false;
    history.replaceState(null, '', location.pathname + location.hash); // pulisce l'URL
    localStorage.removeItem('fws-fb-verifier');
    try {
      const res = await fetch(this.API + '/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: FITBIT_CLIENT_ID, grant_type: 'authorization_code',
          code, code_verifier: verifier, redirect_uri: this.redirectUri(),
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      this.saveTokens({ access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + j.expires_in * 1000 - 60000 });
      Toast.show(t('fbConnected'));
      return true;
    } catch { Toast.show(t('fbError'), 'error'); return false; }
  },

  async refresh() {
    const tk = this.tokens();
    if (!tk?.refresh) return false;
    try {
      const res = await fetch(this.API + '/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: FITBIT_CLIENT_ID, grant_type: 'refresh_token', refresh_token: tk.refresh }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      this.saveTokens({ access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + j.expires_in * 1000 - 60000 });
      return true;
    } catch { this.clearTokens(); return false; }
  },

  async api(path) {
    let tk = this.tokens();
    if (!tk) throw new Error('not connected');
    if (Date.now() >= tk.expiresAt) {
      if (!await this.refresh()) throw new Error('refresh failed');
      tk = this.tokens();
    }
    const res = await fetch(this.API + path, { headers: { Authorization: 'Bearer ' + tk.access } });
    if (res.status === 401) { // token revocato altrove: un tentativo di refresh
      if (!await this.refresh()) throw new Error('unauthorized');
      return this.api(path);
    }
    if (!res.ok) throw new Error('api ' + res.status);
    return res.json();
  },

  /* Sync: log peso/grasso (finestre da 31gg, 90gg totali) + attività */
  async sync(silent = false) {
    if (!this.connected()) return;
    try {
      let addedM = 0, addedW = 0;

      // --- Peso e massa grassa ---
      const byDate = new Map(Store.data.measurements.map(m => [m.date, m]));
      for (let win = 0; win < 3; win++) {
        const end = daysAgo(win * 31), start = daysAgo(win * 31 + 30);
        const j = await this.api(`/1/user/-/body/log/weight/date/${start}/${end}.json`);
        (j.weight || []).forEach(log => {
          const ex = byDate.get(log.date);
          if (ex) {
            if (ex.source === 'fitbit') { ex.weight = round1(log.weight); if (log.fat) ex.bodyFat = round1(log.fat); }
            return; // non tocca le misurazioni manuali
          }
          const rec = {
            id: 'fb' + (log.logId || uid()), date: log.date, source: 'fitbit',
            weight: round1(log.weight), bodyFat: log.fat ? round1(log.fat) : null,
            height: Store.data.profile.height ?? null,
          };
          Store.data.measurements.push(rec);
          byDate.set(log.date, rec);
          addedM++;
        });
      }

      // --- Sonno, HRV, FC a riposo (ultimi 30 giorni) → wellness ---
      const wStart = daysAgo(29), wEnd = todayISO();
      const well = Store.data.wellness;
      const put = (date, field, val) => { if (val == null) return; well[date] = well[date] || {}; well[date][field] = val; };
      try {
        const sj = await this.api(`/1.2/user/-/sleep/date/${wStart}/${wEnd}.json`);
        (sj.sleep || []).filter(x => x.isMainSleep !== false).forEach(x => {
          put(x.dateOfSleep, 'sleepMin', x.minutesAsleep);
          const lv = x.levels?.summary;
          if (lv?.deep) put(x.dateOfSleep, 'deepMin', lv.deep.minutes);
          if (lv?.rem) put(x.dateOfSleep, 'remMin', lv.rem.minutes);
        });
      } catch { /* scope sonno assente: si prosegue */ }
      try {
        const hj = await this.api(`/1/user/-/hrv/date/${wStart}/${wEnd}.json`);
        (hj.hrv || []).forEach(x => put(x.dateTime, 'hrv', round1(x.value?.dailyRmssd)));
      } catch { }
      try {
        const rj = await this.api(`/1/user/-/activities/heart/date/${wStart}/${wEnd}.json`);
        (rj['activities-heart'] || []).forEach(x => put(x.dateTime, 'rhr', x.value?.restingHeartRate ?? null));
      } catch { }

      // --- Attività → allenamenti ---
      const after = daysAgo(90);
      const j = await this.api(`/1/user/-/activities/list.json?afterDate=${after}&sort=asc&offset=0&limit=100`);
      const ids = new Set(Store.data.workouts.map(w => w.id));
      (j.activities || []).forEach(a => {
        const id = 'fb' + a.logId;
        if (ids.has(id)) return;
        Store.data.workouts.push({
          id, date: (a.startTime || '').slice(0, 10) || todayISO(),
          name: a.activityName || 'Fitbit', group: 'Cardio',
          duration: Math.round((a.duration || 0) / 60000),
          notes: 'Fitbit', exercises: [],
        });
        addedW++;
      });

      Store.data.fitbitLastSync = todayISO();
      Store.save();
      if (!silent || addedM || addedW) Toast.show(t('fbSynced', addedM, addedW));
      if (addedM || addedW) Router.render();
    } catch {
      if (!silent) Toast.show(t('fbError'), 'error');
    }
  },

  /* Auto-sync: al massimo una volta al giorno, silenziosa */
  autoSync() {
    if (this.connected() && Store.data.fitbitLastSync !== todayISO()) this.sync(true);
  },

  disconnect() {
    this.clearTokens();
    Toast.show(t('fbDisconnected'), 'info');
  },
};
