/* Fit with Science — 02-data.js
   Auth + Store
   Script classici in ordine: condividono lo scope lessicale globale. */
'use strict';

/* =====================================================================
   AUTH — account locali (hash SHA-256) + Google Identity Services
   ===================================================================== */
const Auth = {
  USERS_KEY: 'fws-users',
  SESS_KEY: 'fws-session',

  users() { try { return JSON.parse(localStorage.getItem(this.USERS_KEY)) || []; } catch { return []; } },
  saveUsers(u) { localStorage.setItem(this.USERS_KEY, JSON.stringify(u)); },
  current() { const id = localStorage.getItem(this.SESS_KEY); return this.users().find(u => u.id === id) || null; },

  updateUser(user) {
    const list = this.users();
    const i = list.findIndex(u => u.id === user.id);
    if (i >= 0) list[i] = user; else list.push(user);
    this.saveUsers(list);
  },

  async hash(pw) {
    if (crypto?.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; // fallback contesti non sicuri (file://) — solo offuscamento
    for (const c of pw) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return 'djb2-' + h.toString(16);
  },

  async register(email, pw) {
    email = email.trim().toLowerCase();
    if (this.users().some(u => u.email === email)) throw new Error(t('errEmailTaken'));
    const user = { id: uid(), email, provider: 'local', pwHash: await this.hash(pw), onboarded: false, createdAt: todayISO() };
    this.updateUser(user);
    localStorage.setItem(this.SESS_KEY, user.id);
    return user;
  },

  async login(email, pw) {
    email = email.trim().toLowerCase();
    const user = this.users().find(u => u.email === email && u.provider === 'local');
    if (!user || user.pwHash !== await this.hash(pw)) throw new Error(t('errBadCreds'));
    localStorage.setItem(this.SESS_KEY, user.id);
    return user;
  },

  loginGoogle(payload) {
    let user = this.users().find(u => u.provider === 'google' && u.googleSub === payload.sub);
    if (!user) {
      user = { id: uid(), email: payload.email, provider: 'google', googleSub: payload.sub, onboarded: false, createdAt: todayISO() };
    }
    // Prefill aggiornato a ogni login (nome + foto profilo Google)
    user.prefill = { firstName: payload.given_name || '', lastName: payload.family_name || '', avatar: payload.picture || null };
    this.updateUser(user);
    localStorage.setItem(this.SESS_KEY, user.id);
    return user;
  },

  loginDemo() {
    let user = this.users().find(u => u.id === 'demo');
    if (!user) {
      user = { id: 'demo', email: 'demo@fitwithscience.app', provider: 'demo', onboarded: true, createdAt: todayISO() };
      this.updateUser(user);
    }
    localStorage.setItem(this.SESS_KEY, user.id);
    return user;
  },

  logout() {
    localStorage.removeItem(this.SESS_KEY);
    location.hash = '';
    if (Cloud.enabled && firebase.auth().currentUser) {
      firebase.auth().signOut().finally(() => location.reload());
    } else location.reload();
  },
};

/* =====================================================================
   STORE — dati per-utente (chiave: fws-data-<userId>)
   ===================================================================== */
const Store = {
  key: null,
  data: null,

  init(user) {
    this.key = 'fws-data-' + user.id;
    try {
      const raw = localStorage.getItem(this.key);
      this.data = raw ? JSON.parse(raw) : null;
    } catch { this.data = null; }
    if (!this.data || !this.data.profile || !Array.isArray(this.data.measurements)) {
      this.data = user.id === 'demo' ? this.seedDemo() : this.blank();
    }
    this.migrate();
    this.save();
  },

  /* Migrazione schema: dx/sx → misura unica (media se entrambe), torace rimosso */
  migrate() {
    const pairs = [['arm', 'armR', 'armL'], ['forearm', 'forearmR', 'forearmL'], ['thigh', 'thighR', 'thighL'], ['calf', 'calfR', 'calfL']];
    this.data.measurements.forEach(m => {
      pairs.forEach(([k, r, l]) => {
        if (m[k] == null && (m[r] != null || m[l] != null)) {
          m[k] = m[r] != null && m[l] != null ? round1((m[r] + m[l]) / 2) : (m[r] ?? m[l]);
        }
        delete m[r]; delete m[l];
      });
      delete m.torso;
    });
    if (!Array.isArray(this.data.customFoods)) this.data.customFoods = [];
    if (!Array.isArray(this.data.customExercises)) this.data.customExercises = [];
    if (!this.data.foodPrefs || typeof this.data.foodPrefs !== 'object') this.data.foodPrefs = {};
    if (!this.data.wellness || typeof this.data.wellness !== 'object') this.data.wellness = {};
  },

  save() {
    this.data.updatedAt = Date.now(); // per la risoluzione dei conflitti multi-device
    localStorage.setItem(this.key, JSON.stringify(this.data));
    Cloud.scheduleSave(); // no-op se il cloud non è configurato/attivo
  },

  blank() {
    return {
      profile: { firstName: '', lastName: '', age: null, height: null, sex: 'na', goal: 'recomp', bio: '', avatar: null },
      goals: { kcal: 2400, protein: 170, carbs: 260, fat: 75, waterGlasses: 8, weeklyWorkouts: 4 },
      measurements: [], workouts: [], templates: [], meals: [], water: {}, customFoods: [], customExercises: [], foodPrefs: {}, wellness: {},
    };
  },

  exportJSON() {
    const user = Auth.current();
    const payload = { app: 'fit-with-science', version: 1, exportedAt: new Date().toISOString(), user: { email: user.email }, data: this.data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fitwithscience-${user.email.replace(/[^a-z0-9]/gi, '_')}-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    Toast.show(t('dataExported'), 'info');
  },

  importJSON(text) {
    const parsed = JSON.parse(text);
    const d = parsed.data || parsed;
    if (!d.profile || !Array.isArray(d.measurements)) throw new Error('bad format');
    this.data = d;
    this.save();
  },

  /* Dati di esempio realistici (~3 mesi) — solo per l'account demo */
  seedDemo() {
    const measurements = [];
    for (let w = 12; w >= 0; w--) {
      const tt = (12 - w) / 12;
      const noise = () => (Math.random() - 0.5) * 0.4;
      measurements.push({
        id: uid() + w, date: daysAgo(w * 7),
        weight: round1(84.2 - 4.2 * tt + noise()), height: 178,
        neck: round1(39.5 - 0.6 * tt + noise() * 0.3), shoulders: round1(118 + 1.2 * tt + noise() * 0.4),
        chest: round1(103 + 0.8 * tt + noise() * 0.4),
        waist: round1(88 - 4.5 * tt + noise() * 0.5), abdomen: round1(91 - 4.8 * tt + noise() * 0.5),
        hips: round1(99 - 2.2 * tt + noise() * 0.4),
        arm: round1(35.3 + 1.1 * tt + noise() * 0.2),
        forearm: round1(29 + 0.5 * tt + noise() * 0.2),
        thigh: round1(58.4 + 0.9 * tt + noise() * 0.3),
        calf: round1(37.7 + 0.4 * tt + noise() * 0.2),
        bodyFat: round1(21 - 4 * tt + noise() * 0.4),
      });
    }

    const mk = (dOff, name, group, dur, exs, notes = '') => ({
      id: uid() + dOff, date: daysAgo(dOff), name, group, duration: dur, notes,
      exercises: exs.map(e => ({ id: uid() + e[0], name: e[0], group: e[1], sets: e[2], reps: e[3], weight: e[4], rest: e[5], rpe: e[6], notes: e[7] || '' })),
    });

    const workouts = [
      mk(1, 'Upper A — Spinta', 'Upper Body', 72, [
        ['Panca piana bilanciere', 'Petto', 4, 6, 82.5, 150, 8, 'Ultimo set RPE 9'],
        ['Lento avanti manubri', 'Spalle', 3, 8, 26, 120, 8],
        ['Panca inclinata manubri', 'Petto', 3, 10, 30, 90, 8],
        ['Alzate laterali', 'Spalle', 3, 14, 10, 60, 9],
        ['French press EZ', 'Tricipiti', 3, 10, 30, 90, 8],
      ]),
      mk(3, 'Lower A — Squat focus', 'Lower Body', 78, [
        ['Squat bilanciere', 'Gambe', 4, 5, 110, 180, 8, 'PR di giornata'],
        ['Romanian deadlift', 'Femorali', 3, 8, 90, 150, 8],
        ['Leg press', 'Gambe', 3, 12, 180, 120, 8],
        ['Leg curl', 'Femorali', 3, 12, 45, 90, 9],
        ['Calf raise in piedi', 'Polpacci', 4, 12, 60, 60, 8],
      ]),
      mk(5, 'Upper B — Trazione', 'Upper Body', 70, [
        ['Trazioni zavorrate', 'Dorso', 4, 6, 10, 150, 9],
        ['Rematore bilanciere', 'Dorso', 4, 8, 75, 120, 8],
        ['Lat machine presa stretta', 'Dorso', 3, 10, 65, 90, 8],
        ['Curl bilanciere', 'Bicipiti', 3, 10, 32.5, 90, 8],
        ['Face pull', 'Spalle', 3, 15, 25, 60, 8],
      ]),
      mk(8, 'Lower B — Stacco focus', 'Lower Body', 75, [
        ['Stacco da terra', 'Schiena/Gambe', 4, 4, 140, 210, 9, 'Tecnica solida'],
        ['Front squat', 'Gambe', 3, 8, 80, 150, 8],
        ['Hip thrust', 'Glutei', 3, 10, 120, 120, 8],
        ['Leg extension', 'Gambe', 3, 14, 50, 75, 9],
        ['Calf raise seduto', 'Polpacci', 4, 15, 45, 60, 8],
      ]),
      mk(10, 'Upper A — Spinta', 'Upper Body', 68, [
        ['Panca piana bilanciere', 'Petto', 4, 6, 80, 150, 8],
        ['Lento avanti manubri', 'Spalle', 3, 8, 24, 120, 8],
        ['Panca inclinata manubri', 'Petto', 3, 10, 28, 90, 8],
        ['Alzate laterali', 'Spalle', 3, 14, 10, 60, 9],
        ['French press EZ', 'Tricipiti', 3, 10, 27.5, 90, 8],
      ]),
      mk(12, 'Lower A — Squat focus', 'Lower Body', 74, [
        ['Squat bilanciere', 'Gambe', 4, 5, 107.5, 180, 8],
        ['Romanian deadlift', 'Femorali', 3, 8, 87.5, 150, 8],
        ['Leg press', 'Gambe', 3, 12, 175, 120, 8],
        ['Leg curl', 'Femorali', 3, 12, 45, 90, 9],
        ['Calf raise in piedi', 'Polpacci', 4, 12, 55, 60, 8],
      ]),
      mk(15, 'Upper B — Trazione', 'Upper Body', 71, [
        ['Trazioni zavorrate', 'Dorso', 4, 6, 7.5, 150, 9],
        ['Rematore bilanciere', 'Dorso', 4, 8, 72.5, 120, 8],
        ['Lat machine presa stretta', 'Dorso', 3, 10, 62.5, 90, 8],
        ['Curl bilanciere', 'Bicipiti', 3, 10, 30, 90, 8],
        ['Face pull', 'Spalle', 3, 15, 22.5, 60, 8],
      ]),
      mk(17, 'Full Body — Richiamo', 'Full Body', 60, [
        ['Panca piana bilanciere', 'Petto', 3, 8, 75, 120, 7],
        ['Squat bilanciere', 'Gambe', 3, 8, 95, 150, 7],
        ['Rematore manubrio', 'Dorso', 3, 10, 34, 90, 8],
        ['Plank', 'Core', 3, 60, 0, 60, 7, 'Secondi, non reps'],
      ]),
      mk(22, 'Lower B — Stacco focus', 'Lower Body', 76, [
        ['Stacco da terra', 'Schiena/Gambe', 4, 4, 135, 210, 9],
        ['Front squat', 'Gambe', 3, 8, 77.5, 150, 8],
        ['Hip thrust', 'Glutei', 3, 10, 115, 120, 8],
        ['Leg extension', 'Gambe', 3, 14, 50, 75, 9],
      ]),
      mk(24, 'Upper A — Spinta', 'Upper Body', 69, [
        ['Panca piana bilanciere', 'Petto', 4, 6, 77.5, 150, 8],
        ['Lento avanti manubri', 'Spalle', 3, 8, 24, 120, 8],
        ['Alzate laterali', 'Spalle', 3, 14, 9, 60, 9],
        ['French press EZ', 'Tricipiti', 3, 10, 27.5, 90, 8],
      ]),
      mk(29, 'Upper B — Trazione', 'Upper Body', 73, [
        ['Trazioni zavorrate', 'Dorso', 4, 6, 5, 150, 9],
        ['Rematore bilanciere', 'Dorso', 4, 8, 70, 120, 8],
        ['Curl bilanciere', 'Bicipiti', 3, 10, 30, 90, 8],
      ]),
      mk(31, 'Lower A — Squat focus', 'Lower Body', 77, [
        ['Squat bilanciere', 'Gambe', 4, 5, 105, 180, 8],
        ['Romanian deadlift', 'Femorali', 3, 8, 85, 150, 8],
        ['Leg press', 'Gambe', 3, 12, 170, 120, 8],
      ]),
    ];

    const templates = [
      { id: uid() + 't1', name: 'Upper A — Spinta', group: 'Upper Body', exercises: workouts[0].exercises.map(e => ({ ...e, id: uid() + e.name })) },
      { id: uid() + 't2', name: 'Lower A — Squat focus', group: 'Lower Body', exercises: workouts[1].exercises.map(e => ({ ...e, id: uid() + e.name })) },
      { id: uid() + 't3', name: 'Upper B — Trazione', group: 'Upper Body', exercises: workouts[2].exercises.map(e => ({ ...e, id: uid() + e.name })) },
    ];

    const mealPlan = [
      ['Colazione', [['Avena', '80 g', 304, 10.8, 53, 5.6], ['Latte parz. scremato', '250 ml', 115, 8.5, 12, 3.8], ['Banana', '120 g', 107, 1.3, 27, 0.4]]],
      ['Pranzo', [['Riso basmati', '100 g', 356, 7.5, 78, 0.9], ['Petto di pollo', '180 g', 198, 41.4, 0, 3.2], ['Olio EVO', '10 g', 90, 0, 0, 10], ['Zucchine', '200 g', 34, 2.6, 6, 0.6]]],
      ['Spuntino', [['Yogurt greco 0%', '170 g', 97, 17.3, 6, 0.3], ['Mandorle', '20 g', 116, 4.2, 4.4, 10]]],
      ['Cena', [['Salmone', '150 g', 312, 30.8, 0, 20.3], ['Patate', '250 g', 193, 5, 44, 0.3], ['Insalata mista', '100 g', 17, 1.4, 3, 0.2]]],
    ];
    const meals = [];
    for (let d = 6; d >= 0; d--) {
      mealPlan.forEach(([mealName, foods]) => {
        if (d > 0 && mealName === 'Spuntino' && d % 3 === 0) return;
        foods.forEach(f => meals.push({
          id: uid() + d + f[0], date: daysAgo(d), meal: mealName,
          name: f[0], qty: f[1], kcal: f[2], protein: f[3], carbs: f[4], fat: f[5],
        }));
      });
    }

    const water = {};
    for (let d = 6; d >= 0; d--) water[daysAgo(d)] = d === 0 ? 5 : 6 + (d % 3);

    return {
      profile: { firstName: 'Utente', lastName: 'Demo', age: 30, height: 178, sex: 'na', goal: 'recomp', bio: '', avatar: null },
      goals: { kcal: 2400, protein: 170, carbs: 260, fat: 75, waterGlasses: 8, weeklyWorkouts: 4 },
      measurements, workouts, templates, meals, water,
    };
  },
};
