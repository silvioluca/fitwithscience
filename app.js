/* =====================================================================
   Fit with Science — app.js
   SPA vanilla JS. Multi-utente con auth locale + Google Sign-In.
   Persistenza: localStorage per-utente + export/import file JSON.
   NB: hosting statico (GitHub Pages) → l'auth è client-side: protegge
   l'interfaccia, non i dati. Per protezione reale serve un backend.
   ===================================================================== */

'use strict';

/* Inserisci qui il Client ID OAuth creato su console.cloud.google.com
   (APIs & Services → Credentials → OAuth Client ID → Web application,
   con l'origine https://<utente>.github.io tra le Authorized origins). */
const GOOGLE_CLIENT_ID = '671477447831-it90ogc8g9bb60msa3rfcp67uvmbvmg0.apps.googleusercontent.com';

/* =====================================================================
   UTILS
   ===================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const fmtDate = iso => new Date(iso + 'T00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateShort = iso => new Date(iso + 'T00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const round1 = n => Math.round(n * 10) / 10;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* =====================================================================
   ICONS — SVG inline monocromatiche (stroke: currentColor)
   ===================================================================== */
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  ruler: '<path d="M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0L21.3 10.1a1 1 0 0 0 0-1.4z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/>',
  dumbbell: '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/>',
  trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  menu: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  droplet: '<path d="M12 2.7s6.3 6.9 6.3 11a6.3 6.3 0 0 1-12.6 0c0-4.1 6.3-11 6.3-11Z"/>',
  scale: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  gauge: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M12 3v3"/><path d="m17 6.3-2 2"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
};

const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* Sostituisce i placeholder [data-ic] presenti nell'HTML statico */
function hydrateIcons(root = document) {
  $$('[data-ic]', root).forEach(el => { el.innerHTML = ic(el.dataset.ic); });
}

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
    // Fallback (contesti non sicuri, es. file://): hash djb2 — solo offuscamento
    let h = 5381;
    for (const c of pw) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return 'djb2-' + h.toString(16);
  },

  async register(email, pw) {
    email = email.trim().toLowerCase();
    if (this.users().some(u => u.email === email)) throw new Error('Email già registrata');
    const user = { id: uid(), email, provider: 'local', pwHash: await this.hash(pw), onboarded: false, createdAt: todayISO() };
    this.updateUser(user);
    localStorage.setItem(this.SESS_KEY, user.id);
    return user;
  },

  async login(email, pw) {
    email = email.trim().toLowerCase();
    const user = this.users().find(u => u.email === email && u.provider === 'local');
    if (!user || user.pwHash !== await this.hash(pw)) throw new Error('Credenziali non valide');
    localStorage.setItem(this.SESS_KEY, user.id);
    return user;
  },

  /* payload = JWT di Google decodificato (sub, email, given_name, family_name) */
  loginGoogle(payload) {
    let user = this.users().find(u => u.provider === 'google' && u.googleSub === payload.sub);
    if (!user) {
      user = {
        id: uid(), email: payload.email, provider: 'google', googleSub: payload.sub,
        onboarded: false, createdAt: todayISO(),
        prefill: { firstName: payload.given_name || '', lastName: payload.family_name || '' },
      };
      this.updateUser(user);
    }
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
    location.reload();
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
    this.save();
  },

  save() { localStorage.setItem(this.key, JSON.stringify(this.data)); },

  blank() {
    return {
      profile: { firstName: '', lastName: '', age: null, height: null, goal: 'Ricomposizione corporea' },
      goals: { kcal: 2400, protein: 170, carbs: 260, fat: 75, waterGlasses: 8, weeklyWorkouts: 4 },
      measurements: [], workouts: [], templates: [], meals: [], water: {},
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
    Toast.show('Dati esportati su file', 'info');
  },

  importJSON(text) {
    const parsed = JSON.parse(text);
    const d = parsed.data || parsed; // accetta sia il wrapper che il payload nudo
    if (!d.profile || !Array.isArray(d.measurements)) throw new Error('Formato non valido');
    this.data = d;
    this.save();
  },

  /* Dati di esempio realistici (~3 mesi) — solo per l'account demo */
  seedDemo() {
    const measurements = [];
    for (let w = 12; w >= 0; w--) {
      const t = (12 - w) / 12;
      const noise = () => (Math.random() - 0.5) * 0.4;
      measurements.push({
        id: uid() + w, date: daysAgo(w * 7),
        weight: round1(84.2 - 4.2 * t + noise()), height: 178,
        neck: round1(39.5 - 0.6 * t + noise() * 0.3), shoulders: round1(118 + 1.2 * t + noise() * 0.4),
        chest: round1(103 + 0.8 * t + noise() * 0.4), torso: round1(98 - 1.5 * t + noise() * 0.4),
        waist: round1(88 - 4.5 * t + noise() * 0.5), abdomen: round1(91 - 4.8 * t + noise() * 0.5),
        hips: round1(99 - 2.2 * t + noise() * 0.4),
        armR: round1(35.5 + 1.1 * t + noise() * 0.2), armL: round1(35.1 + 1.1 * t + noise() * 0.2),
        forearmR: round1(29.2 + 0.5 * t + noise() * 0.2), forearmL: round1(28.9 + 0.5 * t + noise() * 0.2),
        thighR: round1(58.5 + 0.9 * t + noise() * 0.3), thighL: round1(58.2 + 0.9 * t + noise() * 0.3),
        calfR: round1(37.8 + 0.4 * t + noise() * 0.2), calfL: round1(37.6 + 0.4 * t + noise() * 0.2),
        bodyFat: round1(21 - 4 * t + noise() * 0.4),
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
      profile: { firstName: 'Utente', lastName: 'Demo', age: 30, height: 178, goal: 'Ricomposizione corporea' },
      goals: { kcal: 2400, protein: 170, carbs: 260, fat: 75, waterGlasses: 8, weeklyWorkouts: 4 },
      measurements, workouts, templates, meals, water,
    };
  },
};

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
        <div class="modal-head"><h3>${esc(title)}</h3>${locked ? '' : `<button class="btn-icon modal-close" aria-label="Chiudi">${ic('x')}</button>`}</div>
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
    title: 'Conferma',
    body: `<p style="font-size:14px">${esc(msg)}</p>`,
    footer: `<button class="btn" id="cfNo">Annulla</button><button class="btn btn-danger" id="cfYes">Elimina</button>`,
    onMount(root) {
      $('#cfNo', root).onclick = () => Modal.close();
      $('#cfYes', root).onclick = () => { Modal.close(); onYes(); };
    },
  });
}

/* Validazione: [data-req] non vuoto, [data-pos] numero >= 0 */
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

  workoutVolume(w) { return w.exercises.reduce((t, e) => t + e.sets * e.reps * e.weight, 0); },
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
    return this.mealsFor(date).reduce((t, m) => ({
      kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat,
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  },

  personalRecords() {
    const best = {};
    Store.data.workouts.forEach(w => w.exercises.forEach(e => {
      if (!e.weight) return;
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
function renderTable({ mountId, columns, rows, pageSize = 8, csvName, onEdit, onDelete, emptyMsg }) {
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
    ).join('') + (onEdit || onDelete ? '<th></th>' : '');

    const tbody = slice.length ? slice.map(row => `<tr>
      ${columns.map(c => `<td>${c.render ? c.render(row) : esc(row[c.key])}</td>`).join('')}
      ${onEdit || onDelete ? `<td><div class="td-actions">
        ${onEdit ? `<button class="btn-icon" data-edit="${row.id}" title="Modifica">${ic('pencil')}</button>` : ''}
        ${onDelete ? `<button class="btn-icon danger" data-del="${row.id}" title="Elimina">${ic('trash')}</button>` : ''}
      </div></td>` : ''}
    </tr>`).join('')
      : `<tr><td colspan="${columns.length + 1}"><div class="empty-state"><div class="es-ico">${ic('inbox')}</div><b>Nessun risultato</b><p>${esc(emptyMsg || 'Nessun dato disponibile.')}</p></div></td></tr>`;

    let pager = '';
    for (let p = 1; p <= pages; p++) pager += `<button class="${p === state.page ? 'active' : ''}" data-pg="${p}">${p}</button>`;

    mount.innerHTML = `
      <div class="table-scroll"><table class="data-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>
      <div class="table-footer"><span>${all.length} elementi</span><div class="pager">${pager}</div></div>`;

    $$('th[data-k]', mount).forEach(th => th.onclick = () => {
      const k = th.dataset.k;
      if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = 1; }
      draw();
    });
    $$('[data-pg]', mount).forEach(b => b.onclick = () => { state.page = Number(b.dataset.pg); draw(); });
    if (onEdit) $$('[data-edit]', mount).forEach(b => b.onclick = () => onEdit(b.dataset.edit));
    if (onDelete) $$('[data-del]', mount).forEach(b => b.onclick = () => onDelete(b.dataset.del));
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
      Toast.show('CSV esportato', 'info');
    },
  };
}

/* =====================================================================
   PAGINE
   ===================================================================== */
const Pages = {

  /* ------------------------------------------------ DASHBOARD */
  dashboard() {
    const m = Stats.latestM(), prev = Stats.prevM();
    const dWeight = m && prev ? round1(m.weight - prev.weight) : 0;
    const macros = Stats.dayMacros(todayISO());
    const goals = Store.data.goals;
    const week = Stats.weekWorkouts();
    const weekMin = week.reduce((t, w) => t + w.duration, 0);
    const recent = Stats.sortedWorkouts().slice(0, 4);
    const recentM = [...Stats.sortedMeasurements()].reverse().slice(0, 4);
    const prs = Stats.personalRecords().slice(0, 5);
    const nextName = recent[0]?.name.includes('Upper') ? 'Lower A — Squat focus' : 'Upper A — Spinta';
    const p = Store.data.profile;

    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>Ciao${p.firstName ? ', ' + esc(p.firstName) : ''}</h1><p>Panoramica del ${fmtDate(todayISO())}</p></div>
        <div class="actions quick-actions">
          <button class="btn btn-primary" data-quick="misura">${ic('plus')} Misurazione</button>
          <button class="btn btn-blue" data-quick="workout">${ic('plus')} Allenamento</button>
          <button class="btn" data-quick="pasto">${ic('plus')} Pasto</button>
        </div>
      </div>

      <div class="grid grid-stats">
        ${statCard('Peso attuale', m ? `${m.weight}<small> kg</small>` : '—', m && prev ? (dWeight <= 0 ? `↓ ${Math.abs(dWeight)} kg vs precedente` : `↑ +${dWeight} kg vs precedente`) : '', dWeight <= 0 ? 'delta-down' : 'delta-up', 'scale', 'ico-emerald')}
        ${statCard('BMI', Stats.bmi(m) ?? '—', m ? 'Indice massa corporea' : '', 'delta-good', 'gauge', 'ico-blue')}
        ${statCard('Massa grassa', m?.bodyFat ? `${m.bodyFat}<small> %</small>` : '—', prev?.bodyFat && m?.bodyFat ? `${round1(m.bodyFat - prev.bodyFat)} % vs precedente` : '', 'delta-down', 'percent', 'ico-purple')}
        ${statCard('Streak', `${Stats.streak()}<small> giorni</small>`, 'Allenamenti consecutivi', 'delta-good', 'flame', 'ico-amber')}
        ${statCard('Calorie oggi', `${Math.round(macros.kcal)}<small> kcal</small>`, `${Math.max(0, goals.kcal - Math.round(macros.kcal))} rimanenti`, 'delta-neutral', 'utensils', 'ico-emerald')}
        ${statCard('Allenamenti (7g)', `${week.length}<small> / ${goals.weeklyWorkouts}</small>`, `${weekMin} min totali`, 'delta-neutral', 'dumbbell', 'ico-blue')}
        ${statCard('Prossima sessione', `<span style="font-size:15px">${esc(nextName)}</span>`, 'Suggerita in base allo split', 'delta-neutral', 'calendar', 'ico-purple')}
        ${statCard('Proteine oggi', `${Math.round(macros.protein)}<small> / ${goals.protein} g</small>`, `${Math.round(macros.protein / goals.protein * 100)}% obiettivo`, 'delta-good', 'activity', 'ico-amber')}
      </div>

      <div class="grid grid-2 mt">
        <div class="card"><div class="card-head-row"><div><div class="card-title">Andamento peso</div><div class="card-sub">Storico misurazioni</div></div></div>
          <div class="chart-wrap"><canvas id="chWeight"></canvas></div></div>
        <div class="card"><div class="card-title">Volume allenamento</div><div class="card-sub">kg totali sollevati per sessione</div>
          <div class="chart-wrap"><canvas id="chVolume"></canvas></div></div>
        <div class="card"><div class="card-title">Calorie giornaliere</div><div class="card-sub">Ultimi 7 giorni vs obiettivo</div>
          <div class="chart-wrap"><canvas id="chKcal"></canvas></div></div>
        <div class="card"><div class="card-title">Macronutrienti oggi</div><div class="card-sub">Distribuzione</div>
          <div class="chart-wrap"><canvas id="chMacro"></canvas></div></div>
      </div>

      <div class="grid grid-3 mt">
        <div class="card"><div class="card-title">Ultimi allenamenti</div><div class="card-sub">Sessioni recenti</div>
          ${recent.length ? recent.map(w => `<div class="list-row"><div class="list-ico ico-blue">${ic('dumbbell')}</div>
            <div class="list-main"><b>${esc(w.name)}</b><span>${fmtDateShort(w.date)} · ${w.exercises.length} esercizi</span></div>
            <div class="list-end"><b>${Math.round(Stats.workoutVolume(w)).toLocaleString('it-IT')} kg</b>${w.duration} min</div></div>`).join('')
          : emptyState('dumbbell', 'Nessun allenamento', 'Registra la prima sessione.')}
        </div>
        <div class="card"><div class="card-title">Ultime misurazioni</div><div class="card-sub">Peso e vita</div>
          ${recentM.length ? recentM.map(x => `<div class="list-row"><div class="list-ico ico-emerald">${ic('ruler')}</div>
            <div class="list-main"><b>${x.weight} kg</b><span>${fmtDateShort(x.date)}</span></div>
            <div class="list-end"><b>${x.waist ?? '—'} cm</b>vita</div></div>`).join('')
          : emptyState('ruler', 'Nessuna misurazione', 'Aggiungi la prima misurazione.')}
        </div>
        <div class="card"><div class="card-title">Record personali</div><div class="card-sub">Basati su 1RM stimato</div>
          ${prs.length ? prs.map((p2, i) => `<div class="pr-item"><span class="pr-rank ${['', 'r2', 'r3', 'rn', 'rn'][i]}">${i + 1}</span>
            <div><div class="pr-name">${esc(p2.name)}</div><div class="pr-detail">${p2.weight} kg × ${p2.reps} · ${fmtDateShort(p2.date)}</div></div>
            <span class="pr-value">${Math.round(p2.orm)} kg</span></div>`).join('')
          : emptyState('trophy', 'Nessun record', 'I PR appariranno dopo i primi allenamenti.')}
        </div>
      </div>
    </div>`;
  },

  dashboardCharts() {
    const ms = Stats.sortedMeasurements();
    Charts.make('chWeight', {
      type: 'line',
      data: {
        labels: ms.map(m => fmtDateShort(m.date)),
        datasets: [{
          label: 'Peso (kg)', data: ms.map(m => m.weight),
          borderColor: Charts.colors.emerald, backgroundColor: Charts.gradient('chWeight', Charts.colors.emerald),
          fill: true, tension: .35, pointRadius: 3, pointHoverRadius: 6, borderWidth: 2.5,
        }],
      },
      options: Charts.baseOpts(),
    });

    const ws = [...Store.data.workouts].sort((a, b) => a.date.localeCompare(b.date));
    Charts.make('chVolume', {
      type: 'bar',
      data: {
        labels: ws.map(w => fmtDateShort(w.date)),
        datasets: [{ label: 'Volume (kg)', data: ws.map(w => Math.round(Stats.workoutVolume(w))), backgroundColor: Charts.colors.blue + 'cc', borderRadius: 8, maxBarThickness: 26 }],
      },
      options: Charts.baseOpts(),
    });

    const days = [...Array(7)].map((_, i) => daysAgo(6 - i));
    Charts.make('chKcal', {
      type: 'bar',
      data: {
        labels: days.map(fmtDateShort),
        datasets: [
          { label: 'Calorie', data: days.map(d => Math.round(Stats.dayMacros(d).kcal)), backgroundColor: Charts.colors.emerald + 'cc', borderRadius: 8, maxBarThickness: 30 },
          { label: 'Obiettivo', data: days.map(() => Store.data.goals.kcal), type: 'line', borderColor: Charts.colors.amber, borderDash: [6, 5], pointRadius: 0, borderWidth: 2 },
        ],
      },
      options: Charts.baseOpts(),
    });

    const mac = Stats.dayMacros(todayISO());
    Charts.make('chMacro', {
      type: 'doughnut',
      data: {
        labels: ['Proteine', 'Carboidrati', 'Grassi'],
        datasets: [{ data: [mac.protein * 4, mac.carbs * 4, mac.fat * 9].map(Math.round), backgroundColor: [Charts.colors.emerald, Charts.colors.blue, Charts.colors.amber], borderWidth: 0, hoverOffset: 8 }],
      },
      options: { ...Charts.baseOpts({ cutout: '62%' }), scales: {} },
    });
  },

  /* ------------------------------------------------ MISURE */
  misure() {
    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>Misure Corporee</h1><p>Traccia peso e circonferenze nel tempo</p></div>
        <div class="actions">
          <button class="btn" id="btnCompare">${ic('swap')} Confronta date</button>
          <button class="btn btn-primary" id="btnAddM">${ic('plus')} Nuova misurazione</button>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card"><div class="card-head-row"><div><div class="card-title">Andamento nel tempo</div><div class="card-sub">Seleziona la misura</div></div>
          <select id="mMetric" class="table-search" style="width:auto">
            ${M_FIELDS.map(f => `<option value="${f.key}">${f.label}</option>`).join('')}
          </select></div>
          <div class="chart-wrap"><canvas id="chMeasure"></canvas></div></div>
        <div class="card"><div class="card-title">Variazioni % (prima → ultima)</div><div class="card-sub">Su tutto lo storico</div>
          <div class="chart-wrap"><canvas id="chDeltas"></canvas></div></div>
      </div>

      <div class="card table-card mt">
        <div class="table-toolbar"><div class="card-title">Cronologia misurazioni</div>
          <div class="spacer">
            <input class="table-search" id="mSearch" placeholder="Cerca…">
            <button class="btn btn-sm" id="mCsv">${ic('download')} CSV</button>
            <button class="btn btn-sm" id="mPdf">${ic('download')} PDF</button>
          </div></div>
        <div id="mTable"></div>
      </div>
    </div>`;
  },

  misureMount() {
    const cols = [
      { key: 'date', label: 'Data', render: r => fmtDate(r.date) },
      { key: 'weight', label: 'Peso (kg)' },
      { key: 'bodyFat', label: 'Grasso %', render: r => r.bodyFat ?? '—' },
      { key: 'waist', label: 'Vita', render: r => r.waist ?? '—' },
      { key: 'chest', label: 'Petto', render: r => r.chest ?? '—' },
      { key: 'hips', label: 'Fianchi', render: r => r.hips ?? '—' },
      { key: 'armR', label: 'Braccio dx', render: r => r.armR ?? '—' },
      { key: 'thighR', label: 'Coscia dx', render: r => r.thighR ?? '—' },
    ];
    const table = renderTable({
      mountId: 'mTable', columns: cols, rows: Store.data.measurements, csvName: 'misure',
      onEdit: id => measurementForm(Store.data.measurements.find(x => x.id === id)),
      onDelete: id => confirmDialog('Eliminare questa misurazione? L\'operazione non è reversibile.', () => {
        Store.data.measurements = Store.data.measurements.filter(x => x.id !== id);
        Store.save(); Toast.show('Misurazione eliminata'); Router.render();
      }),
      emptyMsg: 'Aggiungi la prima misurazione con il pulsante in alto.',
    });
    $('#mSearch').oninput = e => table.search(e.target.value);
    $('#mCsv').onclick = () => table.exportCSV();
    $('#mPdf').onclick = () => window.print();
    $('#btnAddM').onclick = () => measurementForm();
    $('#btnCompare').onclick = () => compareDialog();

    const drawMetric = key => {
      Charts.registry = Charts.registry.filter(c => (c.canvas.id === 'chMeasure' ? (c.destroy(), false) : true));
      const ms = Stats.sortedMeasurements();
      const f = M_FIELDS.find(x => x.key === key);
      Charts.make('chMeasure', {
        type: 'line',
        data: {
          labels: ms.map(m => fmtDateShort(m.date)),
          datasets: [{ label: `${f.label} (${f.unit})`, data: ms.map(m => m[key]), borderColor: Charts.colors.blue, backgroundColor: Charts.gradient('chMeasure', Charts.colors.blue), fill: true, tension: .35, pointRadius: 3, borderWidth: 2.5, spanGaps: true }],
        },
        options: Charts.baseOpts(),
      });
    };
    drawMetric('weight');
    $('#mMetric').onchange = e => drawMetric(e.target.value);

    const s = Stats.sortedMeasurements();
    if (s.length >= 2) {
      const first = s[0], last = s[s.length - 1];
      const keys = M_FIELDS.filter(f => f.key !== 'height' && first[f.key] != null && last[f.key] != null).slice(0, 10);
      Charts.make('chDeltas', {
        type: 'bar',
        data: {
          labels: keys.map(f => f.label),
          datasets: [{
            label: 'Variazione %',
            data: keys.map(f => round1((last[f.key] - first[f.key]) / first[f.key] * 100)),
            backgroundColor: keys.map(f => (last[f.key] - first[f.key]) <= 0 ? Charts.colors.emerald + 'cc' : Charts.colors.blue + 'cc'),
            borderRadius: 8, maxBarThickness: 26,
          }],
        },
        options: { ...Charts.baseOpts(), indexAxis: 'y' },
      });
    }
  },

  /* ------------------------------------------------ ALLENAMENTO */
  allenamento() {
    const ws = Stats.sortedWorkouts();
    const totVol = ws.reduce((t, w) => t + Stats.workoutVolume(w), 0);
    const totEx = ws.reduce((t, w) => t + w.exercises.length, 0);

    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>Allenamento</h1><p>Programmi, sessioni e statistiche</p></div>
        <div class="actions">
          <button class="btn" id="btnTemplates">${ic('clipboard')} Modelli (${Store.data.templates.length})</button>
          <button class="btn btn-primary" id="btnAddW">${ic('plus')} Nuovo allenamento</button>
        </div>
      </div>

      <div class="grid grid-stats">
        ${statCard('Sessioni totali', ws.length, 'Nello storico', 'delta-neutral', 'calendar', 'ico-blue')}
        ${statCard('Volume totale', `${Math.round(totVol / 1000).toLocaleString('it-IT')}<small> t</small>`, 'Peso sollevato complessivo', 'delta-good', 'trending', 'ico-emerald')}
        ${statCard('Esercizi svolti', totEx, `Media ${round1(totEx / (ws.length || 1))} a sessione`, 'delta-neutral', 'target', 'ico-purple')}
        ${statCard('Durata media', `${Math.round(ws.reduce((t, w) => t + w.duration, 0) / (ws.length || 1))}<small> min</small>`, 'Per sessione', 'delta-neutral', 'clock', 'ico-amber')}
      </div>

      <div class="grid grid-2 mt">
        <div class="card"><div class="card-title">Volume nel tempo</div><div class="card-sub">kg per sessione</div>
          <div class="chart-wrap"><canvas id="chWVol"></canvas></div></div>
        <div class="card"><div class="card-title">Frequenza gruppi muscolari</div><div class="card-sub">Serie totali per gruppo</div>
          <div class="chart-wrap"><canvas id="chWRadar"></canvas></div></div>
      </div>

      <div class="card table-card mt">
        <div class="table-toolbar"><div class="card-title">Storico allenamenti</div>
          <div class="spacer">
            <input class="table-search" id="wSearch" placeholder="Cerca…">
            <button class="btn btn-sm" id="wCsv">${ic('download')} CSV</button>
          </div></div>
        <div id="wTable"></div>
      </div>
    </div>`;
  },

  allenamentoMount() {
    const rows = Stats.sortedWorkouts().map(w => ({
      ...w, volume: Math.round(Stats.workoutVolume(w)), nEx: w.exercises.length,
    }));
    const table = renderTable({
      mountId: 'wTable', csvName: 'allenamenti', rows,
      columns: [
        { key: 'date', label: 'Data', render: r => fmtDate(r.date) },
        { key: 'name', label: 'Nome', render: r => `<b>${esc(r.name)}</b>` },
        { key: 'group', label: 'Gruppo', render: r => `<span class="badge badge-blue">${esc(r.group)}</span>` },
        { key: 'nEx', label: 'Esercizi' },
        { key: 'volume', label: 'Volume (kg)', render: r => r.volume.toLocaleString('it-IT') },
        { key: 'duration', label: 'Durata (min)' },
      ],
      onEdit: id => workoutForm(Store.data.workouts.find(x => x.id === id)),
      onDelete: id => confirmDialog('Eliminare questo allenamento?', () => {
        Store.data.workouts = Store.data.workouts.filter(x => x.id !== id);
        Store.save(); Toast.show('Allenamento eliminato'); Router.render();
      }),
      emptyMsg: 'Crea il primo allenamento o parti da un modello.',
    });
    $('#wSearch').oninput = e => table.search(e.target.value);
    $('#wCsv').onclick = () => table.exportCSV();
    $('#btnAddW').onclick = () => workoutForm();
    $('#btnTemplates').onclick = () => templatesDialog();

    const ws = [...Store.data.workouts].sort((a, b) => a.date.localeCompare(b.date));
    Charts.make('chWVol', {
      type: 'line',
      data: {
        labels: ws.map(w => fmtDateShort(w.date)),
        datasets: [{ label: 'Volume (kg)', data: ws.map(w => Math.round(Stats.workoutVolume(w))), borderColor: Charts.colors.emerald, backgroundColor: Charts.gradient('chWVol', Charts.colors.emerald), fill: true, tension: .35, pointRadius: 3, borderWidth: 2.5 }],
      },
      options: Charts.baseOpts(),
    });

    const freq = Stats.muscleFrequency();
    const labels = Object.keys(freq);
    if (labels.length) {
      Charts.make('chWRadar', {
        type: 'radar',
        data: {
          labels,
          datasets: [{ label: 'Serie totali', data: labels.map(l => freq[l]), borderColor: Charts.colors.purple, backgroundColor: Charts.colors.purple + '33', pointBackgroundColor: Charts.colors.purple, borderWidth: 2 }],
        },
        options: {
          ...Charts.baseOpts(), scales: {
            r: {
              grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border').trim() },
              pointLabels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-soft').trim(), font: { family: 'Inter', size: 10.5 } },
              ticks: { display: false },
            },
          },
        },
      });
    }
  },

  /* ------------------------------------------------ ALIMENTAZIONE */
  alimentazione() {
    const date = State.foodDate;
    const mac = Stats.dayMacros(date);
    const g = Store.data.goals;
    const water = Store.data.water[date] || 0;
    const mealNames = ['Colazione', 'Pranzo', 'Spuntino', 'Cena'];
    const meals = Stats.mealsFor(date);

    const mealBlocks = mealNames.map(mn => {
      const foods = meals.filter(m => m.meal === mn);
      const kcal = foods.reduce((t, f) => t + f.kcal, 0);
      return `<div class="card mt">
        <div class="card-head-row"><div><div class="card-title">${mn}</div><div class="card-sub">${Math.round(kcal)} kcal</div></div>
          <button class="btn btn-sm btn-primary" data-addfood="${mn}">${ic('plus')} Alimento</button></div>
        ${foods.length ? foods.map(f => `<div class="list-row"><div class="list-ico ico-emerald">${ic('utensils')}</div>
          <div class="list-main"><b>${esc(f.name)}</b><span>${esc(f.qty)} · P ${f.protein}g · C ${f.carbs}g · G ${f.fat}g</span></div>
          <div class="list-end"><b>${Math.round(f.kcal)} kcal</b></div>
          <div class="td-actions"><button class="btn-icon" data-editfood="${f.id}">${ic('pencil')}</button><button class="btn-icon danger" data-delfood="${f.id}">${ic('trash')}</button></div>
        </div>`).join('') : `<div class="empty-state" style="padding:18px"><p>Nessun alimento registrato.</p></div>`}
      </div>`;
    }).join('');

    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>Alimentazione</h1><p>Diario alimentare e obiettivi nutrizionali</p></div>
        <div class="actions">
          <div class="field" style="margin:0"><input type="date" id="foodDate" value="${date}" max="${todayISO()}" style="height:42px"></div>
        </div>
      </div>

      <div class="grid grid-stats">
        ${statCard('Calorie', `${Math.round(mac.kcal)}<small> / ${g.kcal}</small>`, `${Math.max(0, g.kcal - Math.round(mac.kcal))} kcal rimanenti`, mac.kcal > g.kcal ? 'delta-up' : 'delta-good', 'flame', 'ico-emerald')}
        ${statCard('Proteine', `${Math.round(mac.protein)}<small> / ${g.protein} g</small>`, `${Math.round(mac.protein / g.protein * 100)}%`, 'delta-good', 'activity', 'ico-blue')}
        ${statCard('Carboidrati', `${Math.round(mac.carbs)}<small> / ${g.carbs} g</small>`, `${Math.round(mac.carbs / g.carbs * 100)}%`, 'delta-neutral', 'target', 'ico-amber')}
        ${statCard('Grassi', `${Math.round(mac.fat)}<small> / ${g.fat} g</small>`, `${Math.round(mac.fat / g.fat * 100)}%`, 'delta-neutral', 'droplet', 'ico-purple')}
      </div>

      <div class="grid grid-2 mt">
        <div class="card">
          <div class="card-title">Obiettivi nutrizionali</div><div class="card-sub">Avanzamento giornaliero</div>
          ${macroBar('Calorie', Math.round(mac.kcal), g.kcal, 'kcal')}
          ${macroBar('Proteine', Math.round(mac.protein), g.protein, 'g')}
          ${macroBar('Carboidrati', Math.round(mac.carbs), g.carbs, 'g')}
          ${macroBar('Grassi', Math.round(mac.fat), g.fat, 'g')}
        </div>
        <div class="card">
          <div class="card-head-row"><div><div class="card-title">Acqua</div><div class="card-sub">${water} / ${g.waterGlasses} bicchieri (${round1(water * 0.25)} L)</div></div></div>
          <div class="water-glasses">
            ${[...Array(g.waterGlasses)].map((_, i) => `<button class="water-glass ${i < water ? 'full' : ''}" data-water="${i + 1}">${ic('droplet')}</button>`).join('')}
          </div>
          <div class="card-title mt" style="font-size:14px">Riepilogo settimanale</div>
          <div class="chart-wrap short"><canvas id="chWeekKcal"></canvas></div>
        </div>
      </div>

      ${mealBlocks}
    </div>`;
  },

  alimentazioneMount() {
    $('#foodDate').onchange = e => { State.foodDate = e.target.value; Router.render(); };
    $$('[data-addfood]').forEach(b => b.onclick = () => foodForm(null, b.dataset.addfood));
    $$('[data-editfood]').forEach(b => b.onclick = () => foodForm(Store.data.meals.find(m => m.id === b.dataset.editfood)));
    $$('[data-delfood]').forEach(b => b.onclick = () => confirmDialog('Eliminare questo alimento?', () => {
      Store.data.meals = Store.data.meals.filter(m => m.id !== b.dataset.delfood);
      Store.save(); Toast.show('Alimento eliminato'); Router.render();
    }));
    $$('[data-water]').forEach(b => b.onclick = () => {
      const n = Number(b.dataset.water);
      const cur = Store.data.water[State.foodDate] || 0;
      Store.data.water[State.foodDate] = (n === cur) ? n - 1 : n; // click sull'ultimo pieno lo svuota
      Store.save(); Router.render();
    });

    const days = [...Array(7)].map((_, i) => daysAgo(6 - i));
    Charts.make('chWeekKcal', {
      type: 'bar',
      data: {
        labels: days.map(fmtDateShort),
        datasets: [
          { label: 'Proteine (g)', data: days.map(d => Math.round(Stats.dayMacros(d).protein)), backgroundColor: Charts.colors.emerald + 'cc', borderRadius: 6, maxBarThickness: 22 },
          { label: 'Carbo (g)', data: days.map(d => Math.round(Stats.dayMacros(d).carbs)), backgroundColor: Charts.colors.blue + 'cc', borderRadius: 6, maxBarThickness: 22 },
          { label: 'Grassi (g)', data: days.map(d => Math.round(Stats.dayMacros(d).fat)), backgroundColor: Charts.colors.amber + 'cc', borderRadius: 6, maxBarThickness: 22 },
        ],
      },
      options: { ...Charts.baseOpts(), scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }, y: { stacked: true, ticks: { color: '#94a3b8', font: { size: 10 } }, border: { display: false } } } },
    });
  },

  /* ------------------------------------------------ PROGRESSI */
  progressi() {
    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>Progressi</h1><p>Analisi storica e confronti</p></div>
        <div class="actions chip-row" id="rangeChips">
          <button class="chip ${State.range === 7 ? 'active' : ''}" data-range="7">Settimana</button>
          <button class="chip ${State.range === 30 ? 'active' : ''}" data-range="30">Mese</button>
          <button class="chip ${State.range === 365 ? 'active' : ''}" data-range="365">Anno</button>
          <button class="chip ${State.range === 0 ? 'active' : ''}" data-range="0">Tutto</button>
        </div>
      </div>

      <div id="progStats" class="grid grid-stats"></div>

      <div class="grid grid-2 mt">
        <div class="card"><div class="card-title">Peso</div><div class="card-sub">Nel periodo selezionato</div>
          <div class="chart-wrap"><canvas id="pgWeight"></canvas></div></div>
        <div class="card"><div class="card-title">Circonferenze chiave</div><div class="card-sub">Vita, petto, braccio dx</div>
          <div class="chart-wrap"><canvas id="pgCirc"></canvas></div></div>
        <div class="card"><div class="card-title">Calorie</div><div class="card-sub">Assunzione giornaliera</div>
          <div class="chart-wrap"><canvas id="pgKcal"></canvas></div></div>
        <div class="card"><div class="card-title">Volume allenamento</div><div class="card-sub">Andamento del carico</div>
          <div class="chart-wrap"><canvas id="pgVol"></canvas></div></div>
      </div>

      <div class="card mt"><div class="card-title">Miglioramenti percentuali</div><div class="card-sub">Dal primo all'ultimo rilevamento del periodo</div>
        <div id="pgImprovements" class="cmp-grid" style="grid-template-columns:1fr auto auto"></div></div>
    </div>`;
  },

  progressiMount() {
    $$('#rangeChips .chip').forEach(c => c.onclick = () => { State.range = Number(c.dataset.range); Router.render(); });

    const cutoff = State.range === 0 ? '0000-00-00' : daysAgo(State.range);
    const ms = Stats.sortedMeasurements().filter(m => m.date >= cutoff);
    const ws = [...Store.data.workouts].sort((a, b) => a.date.localeCompare(b.date)).filter(w => w.date >= cutoff);
    const first = ms[0], last = ms[ms.length - 1];

    const dW = first && last ? round1(last.weight - first.weight) : 0;
    const vol = ws.reduce((t, w) => t + Stats.workoutVolume(w), 0);
    $('#progStats').innerHTML =
      statCard('Δ Peso', `${dW > 0 ? '+' : ''}${dW}<small> kg</small>`, 'Nel periodo', dW <= 0 ? 'delta-down' : 'delta-up', 'scale', 'ico-emerald') +
      statCard('Sessioni', ws.length, `${Math.round(ws.reduce((t, w) => t + w.duration, 0) / 60)} ore totali`, 'delta-neutral', 'dumbbell', 'ico-blue') +
      statCard('Volume', `${Math.round(vol / 1000)}<small> t</small>`, 'Peso sollevato', 'delta-good', 'trending', 'ico-purple') +
      statCard('Δ Vita', first && last && first.waist != null && last.waist != null ? `${round1(last.waist - first.waist)}<small> cm</small>` : '—', 'Circonferenza', 'delta-down', 'ruler', 'ico-amber');

    Charts.make('pgWeight', {
      type: 'line',
      data: { labels: ms.map(m => fmtDateShort(m.date)), datasets: [{ label: 'Peso (kg)', data: ms.map(m => m.weight), borderColor: Charts.colors.emerald, backgroundColor: Charts.gradient('pgWeight', Charts.colors.emerald), fill: true, tension: .35, pointRadius: 3, borderWidth: 2.5 }] },
      options: Charts.baseOpts(),
    });

    Charts.make('pgCirc', {
      type: 'line',
      data: {
        labels: ms.map(m => fmtDateShort(m.date)),
        datasets: [
          { label: 'Vita', data: ms.map(m => m.waist), borderColor: Charts.colors.emerald, tension: .35, pointRadius: 2, borderWidth: 2, spanGaps: true },
          { label: 'Petto', data: ms.map(m => m.chest), borderColor: Charts.colors.blue, tension: .35, pointRadius: 2, borderWidth: 2, spanGaps: true },
          { label: 'Braccio dx', data: ms.map(m => m.armR), borderColor: Charts.colors.purple, tension: .35, pointRadius: 2, borderWidth: 2, spanGaps: true },
        ],
      },
      options: Charts.baseOpts(),
    });

    const nDays = State.range === 0 ? 30 : Math.min(State.range, 30);
    const days = [...Array(nDays)].map((_, i) => daysAgo(nDays - 1 - i));
    Charts.make('pgKcal', {
      type: 'line',
      data: { labels: days.map(fmtDateShort), datasets: [{ label: 'kcal', data: days.map(d => Math.round(Stats.dayMacros(d).kcal) || null), borderColor: Charts.colors.amber, backgroundColor: Charts.gradient('pgKcal', Charts.colors.amber), fill: true, tension: .3, pointRadius: 2, borderWidth: 2, spanGaps: true }] },
      options: Charts.baseOpts(),
    });

    Charts.make('pgVol', {
      type: 'bar',
      data: { labels: ws.map(w => fmtDateShort(w.date)), datasets: [{ label: 'Volume (kg)', data: ws.map(w => Math.round(Stats.workoutVolume(w))), backgroundColor: Charts.colors.blue + 'cc', borderRadius: 8, maxBarThickness: 26 }] },
      options: Charts.baseOpts(),
    });

    if (first && last && first !== last) {
      const rows = M_FIELDS.filter(f => f.key !== 'height' && first[f.key] != null && last[f.key] != null).map(f => {
        const d = round1(last[f.key] - first[f.key]);
        const pct = first[f.key] ? round1(d / first[f.key] * 100) : 0;
        const good = ['waist', 'abdomen', 'hips', 'weight', 'bodyFat', 'neck', 'torso'].includes(f.key) ? d <= 0 : d >= 0;
        return `<span class="cmp-label">${f.label}</span>
          <span>${first[f.key]} → ${last[f.key]} ${f.unit}</span>
          <span class="cmp-delta" style="color:${good ? 'var(--emerald)' : 'var(--red)'}">${d > 0 ? '+' : ''}${d} (${pct > 0 ? '+' : ''}${pct}%)</span>`;
      }).join('');
      $('#pgImprovements').innerHTML = `<span class="cmp-h">Misura</span><span class="cmp-h">Valori</span><span class="cmp-h" style="text-align:right">Δ</span>` + rows;
    } else {
      $('#pgImprovements').innerHTML = '<span style="color:var(--text-faint);font-size:13px">Dati insufficienti nel periodo selezionato.</span>';
    }
  },
};

/* Campi misure corporee */
const M_FIELDS = [
  { key: 'weight', label: 'Peso', unit: 'kg' }, { key: 'height', label: 'Altezza', unit: 'cm' },
  { key: 'bodyFat', label: 'Massa grassa', unit: '%' },
  { key: 'neck', label: 'Collo', unit: 'cm' }, { key: 'shoulders', label: 'Spalle', unit: 'cm' },
  { key: 'chest', label: 'Petto', unit: 'cm' }, { key: 'torso', label: 'Torace', unit: 'cm' },
  { key: 'waist', label: 'Vita', unit: 'cm' }, { key: 'abdomen', label: 'Addome', unit: 'cm' },
  { key: 'hips', label: 'Fianchi', unit: 'cm' },
  { key: 'armR', label: 'Braccio dx', unit: 'cm' }, { key: 'armL', label: 'Braccio sx', unit: 'cm' },
  { key: 'forearmR', label: 'Avambraccio dx', unit: 'cm' }, { key: 'forearmL', label: 'Avambraccio sx', unit: 'cm' },
  { key: 'thighR', label: 'Coscia dx', unit: 'cm' }, { key: 'thighL', label: 'Coscia sx', unit: 'cm' },
  { key: 'calfR', label: 'Polpaccio dx', unit: 'cm' }, { key: 'calfL', label: 'Polpaccio sx', unit: 'cm' },
];

/* Helper HTML */
function statCard(label, value, delta, deltaCls, icoName, icoCls) {
  return `<div class="stat-card">
    <div class="stat-top"><span class="stat-label">${label}</span><span class="stat-ico ${icoCls}">${ic(icoName)}</span></div>
    <div class="stat-value">${value}</div>
    ${delta ? `<div class="stat-delta ${deltaCls}">${delta}</div>` : ''}
  </div>`;
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

/* =====================================================================
   FORMS (modali)
   ===================================================================== */
function measurementForm(existing = null) {
  const m = existing || Object.fromEntries(M_FIELDS.map(f => [f.key, f.key === 'height' ? (Store.data.profile.height ?? '') : '']));
  const body = `<div class="form-grid">
    <div class="field full"><label>Data *</label><input type="date" id="fmDate" data-req value="${existing ? existing.date : todayISO()}" max="${todayISO()}"><div class="err-msg">Campo obbligatorio</div></div>
    ${M_FIELDS.map(f => `<div class="field"><label>${f.label} (${f.unit})${f.key === 'weight' ? ' *' : ''}</label>
      <input type="number" step="0.1" min="0" id="fm_${f.key}" ${f.key === 'weight' ? 'data-req data-pos' : ''} value="${m[f.key] ?? ''}" placeholder="0.0"><div class="err-msg">Valore non valido</div></div>`).join('')}
  </div>`;

  Modal.open({
    title: existing ? 'Modifica misurazione' : 'Nuova misurazione', body, wide: true,
    footer: `<button class="btn" onclick="Modal.close()">Annulla</button><button class="btn btn-primary" id="fmSave">Salva</button>`,
    onMount(root) {
      $('#fmSave', root).onclick = () => {
        if (!validateForm(root)) { Toast.show('Compila i campi obbligatori', 'error'); return; }
        const rec = { id: existing?.id || uid(), date: $('#fmDate', root).value };
        M_FIELDS.forEach(f => { const v = $('#fm_' + f.key, root).value; rec[f.key] = v === '' ? null : Number(v); });
        if (existing) {
          const i = Store.data.measurements.findIndex(x => x.id === existing.id);
          Store.data.measurements[i] = rec;
        } else Store.data.measurements.push(rec);
        Store.save(); Modal.close(); Toast.show(existing ? 'Misurazione aggiornata' : 'Misurazione salvata'); Router.render();
      };
    },
  });
}

function exerciseBlockHTML(e = {}) {
  const id = e.id || uid();
  return `<div class="ex-block" data-exid="${id}">
    <div class="ex-block-head"><b>Esercizio</b><button class="btn-icon danger ex-del" title="Rimuovi">${ic('trash')}</button></div>
    <div class="form-grid">
      <div class="field full"><label>Nome *</label><input class="exf" data-f="name" data-req value="${esc(e.name || '')}" placeholder="Es. Panca piana"><div class="err-msg">Obbligatorio</div></div>
      <div class="field"><label>Gruppo muscolare</label><input class="exf" data-f="group" value="${esc(e.group || '')}" placeholder="Petto"></div>
      <div class="field"><label>Serie *</label><input type="number" min="1" class="exf" data-f="sets" data-req data-pos value="${e.sets ?? 3}"><div class="err-msg">Obbligatorio</div></div>
      <div class="field"><label>Ripetizioni *</label><input type="number" min="1" class="exf" data-f="reps" data-req data-pos value="${e.reps ?? 10}"><div class="err-msg">Obbligatorio</div></div>
      <div class="field"><label>Peso (kg)</label><input type="number" step="0.5" min="0" class="exf" data-f="weight" value="${e.weight ?? 0}"></div>
      <div class="field"><label>Recupero (s)</label><input type="number" min="0" step="15" class="exf" data-f="rest" value="${e.rest ?? 90}"></div>
      <div class="field full"><label>RPE: <span class="range-val">${e.rpe ?? 8}</span></label>
        <input type="range" min="1" max="10" class="exf rpe-slider" data-f="rpe" value="${e.rpe ?? 8}"></div>
      <div class="field full"><label>Note</label><input class="exf" data-f="notes" value="${esc(e.notes || '')}" placeholder="Opzionale"></div>
    </div>
  </div>`;
}

function workoutForm(existing = null, fromTemplate = null) {
  const w = existing || fromTemplate || { name: '', group: '', duration: 60, notes: '', exercises: [{}] };
  const body = `
    <div class="form-grid">
      <div class="field full"><label>Nome allenamento *</label><input id="fwName" data-req value="${esc(w.name)}" placeholder="Es. Upper A — Spinta"><div class="err-msg">Obbligatorio</div></div>
      <div class="field"><label>Data *</label><input type="date" id="fwDate" data-req value="${existing?.date || todayISO()}" max="${todayISO()}"><div class="err-msg">Obbligatorio</div></div>
      <div class="field"><label>Gruppo muscolare</label>
        <select id="fwGroup">${['Upper Body', 'Lower Body', 'Full Body', 'Push', 'Pull', 'Legs', 'Altro'].map(g => `<option ${w.group === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label>Durata (min)</label><input type="number" min="0" id="fwDur" value="${w.duration}"></div>
      <div class="field full"><label>Note</label><textarea id="fwNotes" placeholder="Opzionale">${esc(w.notes || '')}</textarea></div>
    </div>
    <div style="margin:16px 0 10px;font-weight:700;font-size:14px">Esercizi</div>
    <div id="exList">${w.exercises.map(e => exerciseBlockHTML(e)).join('')}</div>
    <button class="btn btn-sm" id="addEx">${ic('plus')} Aggiungi esercizio</button>`;

  Modal.open({
    title: existing ? 'Modifica allenamento' : 'Nuovo allenamento', body, wide: true,
    footer: `${existing ? `<button class="btn" id="fwDup">${ic('copy')} Duplica</button><button class="btn" id="fwTpl">${ic('clipboard')} Salva come modello</button>` : ''}
      <button class="btn" onclick="Modal.close()">Annulla</button><button class="btn btn-primary" id="fwSave">Salva</button>`,
    onMount(root) {
      const bindBlocks = () => {
        $$('.ex-del', root).forEach(b => b.onclick = () => {
          if ($$('.ex-block', root).length === 1) { Toast.show('Serve almeno un esercizio', 'error'); return; }
          b.closest('.ex-block').remove();
        });
        $$('.rpe-slider', root).forEach(s => s.oninput = () => { s.closest('.field').querySelector('.range-val').textContent = s.value; });
      };
      bindBlocks();
      $('#addEx', root).onclick = () => { $('#exList', root).insertAdjacentHTML('beforeend', exerciseBlockHTML()); bindBlocks(); };

      const collect = () => {
        if (!validateForm(root)) { Toast.show('Compila i campi obbligatori', 'error'); return null; }
        return {
          id: existing?.id || uid(),
          name: $('#fwName', root).value.trim(),
          date: $('#fwDate', root).value,
          group: $('#fwGroup', root).value,
          duration: Number($('#fwDur', root).value) || 0,
          notes: $('#fwNotes', root).value.trim(),
          exercises: $$('.ex-block', root).map(bl => {
            const get = f => $(`[data-f="${f}"]`, bl).value;
            return { id: bl.dataset.exid, name: get('name').trim(), group: get('group').trim() || 'Altro', sets: Number(get('sets')), reps: Number(get('reps')), weight: Number(get('weight')) || 0, rest: Number(get('rest')) || 0, rpe: Number(get('rpe')), notes: get('notes').trim() };
          }),
        };
      };

      $('#fwSave', root).onclick = () => {
        const rec = collect(); if (!rec) return;
        if (existing) {
          const i = Store.data.workouts.findIndex(x => x.id === existing.id);
          Store.data.workouts[i] = rec;
        } else Store.data.workouts.push(rec);
        Store.save(); Modal.close(); Toast.show(existing ? 'Allenamento aggiornato' : 'Allenamento salvato'); Router.render();
      };

      if (existing) {
        $('#fwDup', root).onclick = () => {
          const rec = collect(); if (!rec) return;
          rec.id = uid(); rec.date = todayISO();
          rec.exercises = rec.exercises.map(e => ({ ...e, id: uid() }));
          Store.data.workouts.push(rec);
          Store.save(); Modal.close(); Toast.show('Allenamento duplicato con data odierna'); Router.render();
        };
        $('#fwTpl', root).onclick = () => {
          const rec = collect(); if (!rec) return;
          Store.data.templates.push({ id: uid(), name: rec.name, group: rec.group, exercises: rec.exercises.map(e => ({ ...e, id: uid() })) });
          Store.save(); Toast.show('Modello salvato');
        };
      }
    },
  });
}

function templatesDialog() {
  const tpls = Store.data.templates;
  Modal.open({
    title: 'Modelli di allenamento',
    body: tpls.length ? tpls.map(t => `<div class="list-row">
      <div class="list-ico ico-blue">${ic('clipboard')}</div>
      <div class="list-main"><b>${esc(t.name)}</b><span>${t.exercises.length} esercizi · ${esc(t.group)}</span></div>
      <div class="td-actions">
        <button class="btn btn-sm btn-primary" data-usetpl="${t.id}">Usa</button>
        <button class="btn-icon danger" data-deltpl="${t.id}">${ic('trash')}</button>
      </div></div>`).join('')
      : emptyState('clipboard', 'Nessun modello', 'Salva un allenamento come modello per riutilizzarlo.'),
    onMount(root) {
      $$('[data-usetpl]', root).forEach(b => b.onclick = () => {
        const t = tpls.find(x => x.id === b.dataset.usetpl);
        Modal.close();
        setTimeout(() => workoutForm(null, { name: t.name, group: t.group, duration: 60, notes: '', exercises: t.exercises.map(e => ({ ...e, id: uid() })) }), 300);
      });
      $$('[data-deltpl]', root).forEach(b => b.onclick = () => {
        Store.data.templates = Store.data.templates.filter(x => x.id !== b.dataset.deltpl);
        Store.save(); Toast.show('Modello eliminato'); Modal.close();
      });
    },
  });
}

function foodForm(existing = null, mealName = 'Colazione') {
  const f = existing || { name: '', qty: '', kcal: '', protein: '', carbs: '', fat: '' };
  Modal.open({
    title: existing ? 'Modifica alimento' : `Aggiungi a ${mealName}`,
    body: `<div class="form-grid">
      <div class="field full"><label>Nome alimento *</label><input id="ffName" data-req value="${esc(f.name)}" placeholder="Es. Petto di pollo"><div class="err-msg">Obbligatorio</div></div>
      <div class="field"><label>Quantità</label><input id="ffQty" value="${esc(f.qty)}" placeholder="100 g"></div>
      <div class="field"><label>Pasto</label>
        <select id="ffMeal">${['Colazione', 'Pranzo', 'Spuntino', 'Cena'].map(m => `<option ${(existing?.meal || mealName) === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div class="field"><label>Calorie (kcal) *</label><input type="number" min="0" id="ffKcal" data-req data-pos value="${f.kcal}"><div class="err-msg">Obbligatorio</div></div>
      <div class="field"><label>Proteine (g)</label><input type="number" min="0" step="0.1" id="ffP" value="${f.protein}"></div>
      <div class="field"><label>Carboidrati (g)</label><input type="number" min="0" step="0.1" id="ffC" value="${f.carbs}"></div>
      <div class="field"><label>Grassi (g)</label><input type="number" min="0" step="0.1" id="ffF" value="${f.fat}"></div>
    </div>`,
    footer: `<button class="btn" onclick="Modal.close()">Annulla</button><button class="btn btn-primary" id="ffSave">Salva</button>`,
    onMount(root) {
      $('#ffSave', root).onclick = () => {
        if (!validateForm(root)) { Toast.show('Compila i campi obbligatori', 'error'); return; }
        const rec = {
          id: existing?.id || uid(), date: existing?.date || State.foodDate,
          meal: $('#ffMeal', root).value, name: $('#ffName', root).value.trim(), qty: $('#ffQty', root).value.trim() || '—',
          kcal: Number($('#ffKcal', root).value), protein: Number($('#ffP', root).value) || 0,
          carbs: Number($('#ffC', root).value) || 0, fat: Number($('#ffF', root).value) || 0,
        };
        if (existing) {
          const i = Store.data.meals.findIndex(x => x.id === existing.id);
          Store.data.meals[i] = rec;
        } else Store.data.meals.push(rec);
        Store.save(); Modal.close(); Toast.show(existing ? 'Alimento aggiornato' : 'Alimento aggiunto'); Router.render();
      };
    },
  });
}

function compareDialog() {
  const ms = Stats.sortedMeasurements();
  if (ms.length < 2) { Toast.show('Servono almeno due misurazioni', 'error'); return; }
  const opts = ms.map(m => `<option value="${m.id}">${fmtDate(m.date)}</option>`).join('');

  Modal.open({
    title: 'Confronto tra due date', wide: true,
    body: `<div class="form-grid" style="grid-template-columns:1fr 1fr">
        <div class="field"><label>Da</label><select id="cmpA">${opts}</select></div>
        <div class="field"><label>A</label><select id="cmpB">${opts}</select></div>
      </div><div id="cmpOut" class="mt"></div>`,
    onMount(root) {
      $('#cmpB', root).value = ms[ms.length - 1].id;
      const draw = () => {
        const a = ms.find(m => m.id === $('#cmpA', root).value);
        const b = ms.find(m => m.id === $('#cmpB', root).value);
        $('#cmpOut', root).innerHTML = `<div class="cmp-grid">
          <span class="cmp-h">Misura</span><span class="cmp-h">${fmtDateShort(a.date)}</span><span class="cmp-h">${fmtDateShort(b.date)}</span><span class="cmp-h" style="text-align:right">Δ</span>
          ${M_FIELDS.filter(f => a[f.key] != null && b[f.key] != null).map(f => {
            const d = round1(b[f.key] - a[f.key]);
            const pct = a[f.key] ? round1(d / a[f.key] * 100) : 0;
            const good = ['waist', 'abdomen', 'hips', 'weight', 'bodyFat', 'neck', 'torso'].includes(f.key) ? d <= 0 : d >= 0;
            return `<span class="cmp-label">${f.label}</span><span>${a[f.key]} ${f.unit}</span><span>${b[f.key]} ${f.unit}</span>
              <span class="cmp-delta" style="color:${d === 0 ? 'var(--text-faint)' : good ? 'var(--emerald)' : 'var(--red)'}">${d > 0 ? '+' : ''}${d} (${pct > 0 ? '+' : ''}${pct}%)</span>`;
          }).join('')}
        </div>`;
      };
      $('#cmpA', root).onchange = draw;
      $('#cmpB', root).onchange = draw;
      draw();
    },
  });
}

/* =====================================================================
   ONBOARDING — primo accesso: dati anagrafici + misure iniziali
   ===================================================================== */
function onboardingForm(user) {
  const pre = user.prefill || {};
  const optFields = M_FIELDS.filter(f => !['weight', 'height', 'bodyFat'].includes(f.key));
  Modal.open({
    title: 'Benvenuto! Completa il tuo profilo', wide: true, locked: true,
    body: `
      <p style="font-size:13px;color:var(--text-soft);margin-bottom:16px">
        Questi dati inizializzano il tuo profilo e la prima misurazione. Potrai modificarli in seguito.</p>
      <div class="form-grid">
        <div class="field"><label>Nome *</label><input id="obFirst" data-req value="${esc(pre.firstName || '')}" placeholder="Mario"><div class="err-msg">Obbligatorio</div></div>
        <div class="field"><label>Cognome *</label><input id="obLast" data-req value="${esc(pre.lastName || '')}" placeholder="Rossi"><div class="err-msg">Obbligatorio</div></div>
        <div class="field"><label>Età *</label><input type="number" min="10" max="100" id="obAge" data-req data-pos placeholder="30"><div class="err-msg">Obbligatorio</div></div>
        <div class="field"><label>Peso (kg) *</label><input type="number" step="0.1" min="0" id="obWeight" data-req data-pos placeholder="75.0"><div class="err-msg">Obbligatorio</div></div>
        <div class="field"><label>Altezza (cm) *</label><input type="number" min="0" id="obHeight" data-req data-pos placeholder="175"><div class="err-msg">Obbligatorio</div></div>
        <div class="field"><label>Massa grassa (%) — opzionale</label><input type="number" step="0.1" min="0" id="obBf" placeholder="18.0"></div>
      </div>
      <details style="margin-top:16px">
        <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--text-soft)">Misure corporee iniziali (opzionali)</summary>
        <div class="form-grid" style="margin-top:12px">
          ${optFields.map(f => `<div class="field"><label>${f.label} (${f.unit})</label>
            <input type="number" step="0.1" min="0" id="ob_${f.key}" placeholder="0.0"></div>`).join('')}
        </div>
      </details>`,
    footer: `<button class="btn btn-primary" id="obSave">Inizia</button>`,
    onMount(root) {
      $('#obSave', root).onclick = () => {
        if (!validateForm(root)) { Toast.show('Compila i campi obbligatori', 'error'); return; }
        const p = Store.data.profile;
        p.firstName = $('#obFirst', root).value.trim();
        p.lastName = $('#obLast', root).value.trim();
        p.age = Number($('#obAge', root).value);
        p.height = Number($('#obHeight', root).value);

        // Prima misurazione dal profilo
        const rec = { id: uid(), date: todayISO(), weight: Number($('#obWeight', root).value), height: p.height };
        const bf = $('#obBf', root).value;
        rec.bodyFat = bf === '' ? null : Number(bf);
        optFields.forEach(f => {
          const v = $('#ob_' + f.key, root).value;
          rec[f.key] = v === '' ? null : Number(v);
        });
        Store.data.measurements.push(rec);
        Store.save();

        user.onboarded = true;
        Auth.updateUser(user);

        Modal.close();
        applyUserToUI(user);
        Toast.show(`Benvenuto, ${p.firstName}! Profilo creato.`);
        Router.render();
      };
    },
  });
}

/* =====================================================================
   AUTH SCREEN
   ===================================================================== */
function renderAuthScreen() {
  const scr = $('#authScreen');
  scr.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand">
        <div class="brand-logo">FS</div>
        <div><h1>Fit with Science</h1><p>Allenamento, misure e alimentazione</p></div>
      </div>

      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">Accedi</button>
        <button class="auth-tab" data-tab="register">Registrati</button>
      </div>

      <form id="authForm" novalidate>
        <div class="field"><label>Email</label><input type="email" id="authEmail" data-req placeholder="nome@email.com" autocomplete="email"><div class="err-msg">Email obbligatoria</div></div>
        <div class="field"><label>Password</label><input type="password" id="authPw" data-req placeholder="••••••••" autocomplete="current-password" minlength="6"><div class="err-msg">Password obbligatoria (min 6 caratteri)</div></div>
        <div class="field" id="pw2Field" style="display:none"><label>Conferma password</label><input type="password" id="authPw2" placeholder="••••••••" autocomplete="new-password"><div class="err-msg">Le password non coincidono</div></div>
        <button type="submit" class="btn btn-primary auth-submit" id="authSubmit">Accedi</button>
      </form>

      <div class="auth-divider">oppure</div>
      <div class="gsi-wrap" id="gsiBtn"></div>
      <button class="btn auth-demo" id="demoBtn">${ic('user')} Prova la demo</button>

      <p class="auth-note">
        I dati restano nel tuo browser (localStorage) e sono esportabili come file JSON dal menu profilo.<br>
        Hosting statico: l'accesso protegge l'interfaccia, non cifra i dati sul dispositivo.
      </p>
    </div>`;

  let mode = 'login';
  $$('.auth-tab', scr).forEach(t => t.onclick = () => {
    mode = t.dataset.tab;
    $$('.auth-tab', scr).forEach(x => x.classList.toggle('active', x === t));
    $('#pw2Field', scr).style.display = mode === 'register' ? '' : 'none';
    $('#authSubmit', scr).textContent = mode === 'register' ? 'Crea account' : 'Accedi';
    $('#authPw', scr).autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  });

  $('#authForm', scr).onsubmit = async e => {
    e.preventDefault();
    if (!validateForm(scr)) return;
    const email = $('#authEmail', scr).value;
    const pw = $('#authPw', scr).value;
    if (pw.length < 6) { $('#authPw', scr).classList.add('invalid'); return; }
    if (mode === 'register') {
      const pw2 = $('#authPw2', scr).value;
      if (pw !== pw2) { $('#authPw2', scr).classList.add('invalid'); return; }
    }
    try {
      const user = mode === 'register' ? await Auth.register(email, pw) : await Auth.login(email, pw);
      startApp(user);
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  };

  $('#demoBtn', scr).onclick = () => startApp(Auth.loginDemo());

  initGoogleSignIn();
}

function initGoogleSignIn() {
  const mount = $('#gsiBtn');
  const tryInit = () => {
    if (GOOGLE_CLIENT_ID.startsWith('YOUR')) {
      mount.innerHTML = `<span style="font-size:12px;color:var(--text-faint);text-align:center">
        Accesso Google non configurato:<br>imposta GOOGLE_CLIENT_ID in app.js</span>`;
      return true;
    }
    if (!window.google?.accounts?.id) return false;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: res => {
        try {
          // Decodifica il payload del JWT (identità verificata da Google lato client)
          const payload = JSON.parse(atob(res.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          startApp(Auth.loginGoogle(payload));
        } catch { Toast.show('Accesso Google non riuscito', 'error'); }
      },
    });
    google.accounts.id.renderButton(mount, {
      theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
      size: 'large', width: 320, text: 'continue_with', locale: 'it',
    });
    return true;
  };
  // Lo script GIS è async: riprova finché non è caricato
  if (!tryInit()) {
    let tries = 0;
    const iv = setInterval(() => { if (tryInit() || ++tries > 20) clearInterval(iv); }, 250);
  }
}

/* =====================================================================
   PROFILE MENU — export/import dati, logout
   ===================================================================== */
function initProfileMenu(user) {
  const menu = $('#profileMenu');
  const p = () => Store.data.profile;
  const render = () => {
    menu.innerHTML = `
      <div class="pm-head"><b>${esc(p().firstName)} ${esc(p().lastName)}</b><span>${esc(user.email)}</span></div>
      <button class="pm-item" id="pmExport">${ic('download')} Esporta dati (JSON)</button>
      <button class="pm-item" id="pmImport">${ic('upload')} Importa dati da file</button>
      <button class="pm-item danger" id="pmLogout">${ic('logout')} Esci</button>`;
    $('#pmExport', menu).onclick = () => { Store.exportJSON(); menu.classList.remove('open'); };
    $('#pmImport', menu).onclick = () => { $('#importFile').click(); menu.classList.remove('open'); };
    $('#pmLogout', menu).onclick = () => Auth.logout();
  };
  render();

  $('#profileBtn').onclick = e => { e.stopPropagation(); render(); menu.classList.toggle('open'); };
  document.addEventListener('click', e => { if (!e.target.closest('#profileMenu') && !e.target.closest('#profileBtn')) menu.classList.remove('open'); });

  $('#importFile').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      Store.importJSON(await file.text());
      Toast.show('Dati importati dal file');
      applyUserToUI(user);
      Router.render();
    } catch { Toast.show('File non valido', 'error'); }
    e.target.value = '';
  };
}

function applyUserToUI(user) {
  const p = Store.data.profile;
  const initials = ((p.firstName[0] || user.email[0] || '?') + (p.lastName[0] || '')).toUpperCase();
  $('#sideAvatar').textContent = initials;
  $('#profileBtn').textContent = initials;
  $('#sideUserName').textContent = p.firstName ? `${p.firstName} ${p.lastName}` : user.email;
  $('#sideUserGoal').textContent = 'Obiettivo: ' + (p.goal || '—');
}

/* =====================================================================
   GLOBAL SEARCH / NOTIFICHE / TEMA / NAV
   ===================================================================== */
function initGlobalSearch() {
  const input = $('#globalSearch');
  const box = $('#searchResults');
  input.oninput = () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { box.classList.remove('open'); return; }
    const hits = [];
    Store.data.workouts.forEach(w => {
      if (w.name.toLowerCase().includes(q)) hits.push({ type: 'Workout', label: w.name, sub: fmtDateShort(w.date), page: 'allenamento' });
      w.exercises.forEach(e => { if (e.name.toLowerCase().includes(q)) hits.push({ type: 'Esercizio', label: e.name, sub: `${w.name} · ${fmtDateShort(w.date)}`, page: 'allenamento' }); });
    });
    Store.data.meals.forEach(m => { if (m.name.toLowerCase().includes(q)) hits.push({ type: 'Alimento', label: m.name, sub: `${m.meal} · ${fmtDateShort(m.date)}`, page: 'alimentazione' }); });

    const uniq = [];
    const seen = new Set();
    for (const h of hits) { const k = h.type + h.label; if (!seen.has(k)) { seen.add(k); uniq.push(h); } if (uniq.length >= 8) break; }

    box.innerHTML = uniq.length
      ? uniq.map(h => `<div class="sr-item" data-page="${h.page}"><span class="sr-type">${h.type}</span><span>${esc(h.label)}</span><span style="margin-left:auto;color:var(--text-faint);font-size:11px">${esc(h.sub)}</span></div>`).join('')
      : `<div class="sr-empty">Nessun risultato per "${esc(q)}"</div>`;
    box.classList.add('open');
    $$('.sr-item', box).forEach(el => el.onclick = () => { box.classList.remove('open'); input.value = ''; Router.go(el.dataset.page); });
  };
  document.addEventListener('click', e => { if (!e.target.closest('.search-box')) box.classList.remove('open'); });
}

function initNotifications() {
  const panel = $('#notifPanel');
  const streak = Stats.streak();
  const mac = Stats.dayMacros(todayISO());
  const g = Store.data.goals;
  const items = [
    { icon: 'flame', text: `Streak di ${streak} giorni: continua così!`, time: 'oggi' },
    { icon: 'activity', text: `Proteine: ${Math.round(mac.protein)}/${g.protein} g raggiunti`, time: 'oggi' },
    { icon: 'ruler', text: 'Ricordati la misurazione settimanale', time: '2 g' },
    { icon: 'trophy', text: 'Controlla i tuoi nuovi record personali', time: '3 g' },
  ];
  panel.innerHTML = `<div class="notif-head">Notifiche</div>` +
    items.map(n => `<div class="notif-item"><span style="color:var(--text-soft)">${ic(n.icon)}</span><span>${esc(n.text)}</span><span class="n-time">${n.time}</span></div>`).join('');

  $('#notifBtn').onclick = e => { e.stopPropagation(); panel.classList.toggle('open'); };
  document.addEventListener('click', e => { if (!e.target.closest('#notifPanel') && !e.target.closest('#notifBtn')) panel.classList.remove('open'); });
}

function initTheme() {
  const saved = localStorage.getItem('fws-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = saved;
  const btn = $('#themeToggle');
  const setIcon = () => btn.innerHTML = ic(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon');
  setIcon();
  btn.onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('fws-theme', next);
    setIcon();
    if (!document.body.classList.contains('auth-locked')) Router.render(); // grafici con colori del nuovo tema
  };
}

function initNav() {
  $$('.nav-item, .bnav-item').forEach(n => n.addEventListener('click', e => { e.preventDefault(); Router.go(n.dataset.page); }));
  $('#menuBtn').onclick = () => { $('#sidebar').classList.add('open'); $('#sidebarOverlay').classList.add('show'); };
  $('#sidebarOverlay').onclick = () => { $('#sidebar').classList.remove('open'); $('#sidebarOverlay').classList.remove('show'); };
  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (PAGE_NAMES.includes(h) && h !== State.page) { State.page = h; Router.render(); }
  });
}

/* =====================================================================
   ROUTER / BOOT
   ===================================================================== */
const PAGE_NAMES = ['dashboard', 'misure', 'allenamento', 'alimentazione', 'progressi'];
const State = { page: 'dashboard', foodDate: todayISO(), range: 0 };

const Router = {
  go(page) {
    State.page = page;
    location.hash = page;
    this.render();
    window.scrollTo({ top: 0 });
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').classList.remove('show');
  },

  render() {
    Charts.destroyAll();
    const p = State.page;
    $('#content').innerHTML = Pages[p]();
    if (p === 'dashboard') {
      Pages.dashboardCharts();
      $$('[data-quick]').forEach(b => b.onclick = () => {
        const q = b.dataset.quick;
        if (q === 'misura') measurementForm();
        if (q === 'workout') workoutForm();
        if (q === 'pasto') foodForm();
      });
    }
    if (p === 'misure') Pages.misureMount();
    if (p === 'allenamento') Pages.allenamentoMount();
    if (p === 'alimentazione') Pages.alimentazioneMount();
    if (p === 'progressi') Pages.progressiMount();

    $$('.nav-item, .bnav-item').forEach(n => n.classList.toggle('active', n.dataset.page === p));
  },
};

function startApp(user) {
  Store.init(user);
  document.body.classList.remove('auth-locked');
  applyUserToUI(user);
  initProfileMenu(user);
  initGlobalSearch();
  initNotifications();

  const h = location.hash.slice(1);
  if (PAGE_NAMES.includes(h)) State.page = h;
  Router.render();

  if (!user.onboarded) onboardingForm(user);
}

document.addEventListener('DOMContentLoaded', () => {
  hydrateIcons();
  initTheme();
  initNav();

  const user = Auth.current();
  if (user) startApp(user);
  else renderAuthScreen();
});
