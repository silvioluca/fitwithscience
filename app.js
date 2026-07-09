/* =====================================================================
   Fit with Science — app.js
   SPA vanilla JS. Multi-utente con auth locale + Google Sign-In.
   Persistenza: localStorage per-utente + export/import file JSON.
   i18n: italiano / inglese (selezionabile nelle impostazioni).
   NB: hosting statico (GitHub Pages) → l'auth è client-side: protegge
   l'interfaccia, non i dati. Per protezione reale serve un backend.
   ===================================================================== */

'use strict';

/* Client ID OAuth (console.cloud.google.com → APIs & Services → Credentials,
   con l'origine https://<utente>.github.io tra le Authorized origins). */
const GOOGLE_CLIENT_ID = '99699687508-64rr056nisltqktkaqp1ur0ipfspp1ie.apps.googleusercontent.com';

/* Client ID OAuth Fitbit (dev.fitbit.com → Register an app,
   Application Type: "Client", Redirect URL: l'URL esatto del sito,
   es. https://<utente>.github.io/fitwithscience/ ).
   PKCE: nessun client secret necessario, funziona da sito statico. */
const FITBIT_CLIENT_ID = 'YOUR_FITBIT_CLIENT_ID';

/* Config Firebase per la sync multi-dispositivo (console.firebase.google.com
   → Project settings → Your apps → Web app → firebaseConfig).
   Con il placeholder l'app resta in modalità solo-locale (localStorage). */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD2eLT8MTiyHJU_mG_PSUYIkGOGjhXvhNk",
  authDomain: "fit-with-science-b582d.firebaseapp.com",
  projectId: "fit-with-science-b582d",
};

/* =====================================================================
   CLOUD — Firebase Auth + Firestore (documento unico users/<uid>)
   ===================================================================== */
const Cloud = {
  enabled: false,
  uid: null,
  saveTimer: null,

  init() {
    if (FIREBASE_CONFIG.apiKey.startsWith('YOUR') || !window.firebase) return false;
    firebase.initializeApp(FIREBASE_CONFIG);
    this.enabled = true;
    return true;
  },

  async load(uid) {
    const snap = await firebase.firestore().collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
  },

  /* Scrittura debounced: localStorage resta immediato, il cloud segue */
  scheduleSave() {
    if (!this.enabled || !this.uid) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      firebase.firestore().collection('users').doc(this.uid)
        .set(JSON.parse(JSON.stringify(Store.data)))
        .catch(() => Toast.show(t('cloudErr'), 'error'));
    }, 1500);
  },
};

/* =====================================================================
   I18N — dizionari italiano / inglese
   ===================================================================== */
/* Dizionari caricati da i18n/<lang>.js (window.FWS_I18N) */
const I18N = window.FWS_I18N || { it: {}, en: {} };

const Lang = {
  lang: localStorage.getItem('fws-lang') || 'it',
  set(l) {
    this.lang = l;
    localStorage.setItem('fws-lang', l);
    document.documentElement.lang = l;
  },
};

/* t('chiave') → stringa tradotta; t('chiave', a, b) → sostituisce {0},{1} */
function t(key, ...args) {
  let s = I18N[Lang.lang][key] ?? I18N.it[key] ?? key;
  args.forEach((a, i) => { s = s.replace('{' + i + '}', a); });
  return s;
}

/* Pasti: chiave canonica (storage) → etichetta tradotta (display) */
const MEAL_KEYS = ['Colazione', 'Pranzo', 'Spuntino', 'Cena'];
const mealLabel = k => (I18N[Lang.lang]?._meals || {})[k] || k;

/* Obiettivi profilo: chiave canonica → etichetta tradotta */
const GOAL_KEYS = ['recomp', 'bulk', 'cut', 'maintain'];
const goalLabel = g => GOAL_KEYS.includes(g) ? t('goal_' + g) : (g || '—');

/* =====================================================================
   UTILS
   ===================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const locale = () => Lang.lang === 'en' ? 'en-GB' : 'it-IT';
const fmtDate = iso => new Date(iso + 'T00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateShort = iso => new Date(iso + 'T00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
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
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
};

const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

function hydrateIcons(root = document) {
  $$('[data-ic]', root).forEach(el => { el.innerHTML = ic(el.dataset.ic); });
}

/* Aggiorna le etichette statiche di index.html secondo la lingua attiva */
function applyStaticLang() {
  const navMap = { dashboard: 'navDash', misure: 'navMeas', allenamento: 'navWork', alimentazione: 'navFood', riposo: 'navRest', salute: 'navHealth', calendario: 'navCal', progressi: 'navProg' };
  const bnavMap = { dashboard: 'bnavHome', misure: 'bnavMeas', allenamento: 'bnavWork', alimentazione: 'bnavFood', riposo: 'bnavRest', salute: 'bnavHealth', calendario: 'bnavCal', progressi: 'bnavProg' };
  $$('.nav-item').forEach(n => { $('.nav-label', n).textContent = t(navMap[n.dataset.page]); });
  $$('.bnav-item').forEach(n => { n.lastChild.textContent = t(bnavMap[n.dataset.page]); });
  $('.brand-tag').textContent = t('brandTag');
  $('#globalSearch').placeholder = t('searchPh');
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

const Pages = {

  /* ------------------------------------------------ DASHBOARD */
  dashboard() {
    const m = Stats.latestM(), prev = Stats.prevM();
    const dWeight = m && prev ? round1(m.weight - prev.weight) : 0;
    const macros = Stats.dayMacros(todayISO());
    const goals = Store.data.goals;
    const week = Stats.weekWorkouts();
    const weekMin = week.reduce((tt, w) => tt + w.duration, 0);
    const recent = Stats.sortedWorkouts().slice(0, 4);
    const recentM = [...Stats.sortedMeasurements()].reverse().slice(0, 4);
    const prs = Stats.personalRecords().slice(0, 5);
    const nextName = recent[0]?.name.includes('Upper') ? 'Lower A — Squat focus' : 'Upper A — Spinta';
    const p = Store.data.profile;

    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>${t('hi')}${p.firstName ? ', ' + esc(p.firstName) : ''}</h1><p>${t('overview')} ${fmtDate(todayISO())}</p></div>
        <div class="actions quick-actions">
          <button class="btn btn-primary" data-quick="misura">${ic('plus')} ${t('qMeasure')}</button>
          <button class="btn btn-blue" data-quick="workout">${ic('plus')} ${t('qWorkout')}</button>
          <button class="btn" data-quick="pasto">${ic('plus')} ${t('qMeal')}</button>
        </div>
      </div>

      <div class="grid grid-stats">
        ${statCard(t('curWeight'), m ? `${m.weight}<small> kg</small>` : '—', m && prev ? (dWeight <= 0 ? `↓ ${Math.abs(dWeight)} kg ${t('vsPrev')}` : `↑ +${dWeight} kg ${t('vsPrev')}`) : '', dWeight <= 0 ? 'delta-down' : 'delta-up', 'scale', 'ico-emerald')}
        ${statCard('BMI', Stats.bmi(m) ?? '—', m ? t('bmiSub') : '', 'delta-good', 'gauge', 'ico-blue')}
        ${statCard(t('bodyFat'), m?.bodyFat ? `${m.bodyFat}<small> %</small>` : '—', prev?.bodyFat && m?.bodyFat ? `${round1(m.bodyFat - prev.bodyFat)} % ${t('vsPrev')}` : '', 'delta-down', 'percent', 'ico-purple')}
        ${statCard(t('streak'), `${Stats.streak()}<small> ${t('days')}</small>`, t('streakSub'), 'delta-good', 'flame', 'ico-amber')}
        ${statCard(t('kcalToday'), `${Math.round(macros.kcal)}<small> kcal</small>`, `${Math.max(0, goals.kcal - Math.round(macros.kcal))} ${t('remaining')}`, 'delta-neutral', 'utensils', 'ico-emerald')}
        ${statCard(t('workouts7'), `${week.length}<small> / ${goals.weeklyWorkouts}</small>`, `${weekMin} ${t('minTotal')}`, 'delta-neutral', 'dumbbell', 'ico-blue')}
        ${statCard(t('nextSession'), `<span style="font-size:15px">${esc(nextName)}</span>`, t('nextSub'), 'delta-neutral', 'calendar', 'ico-purple')}
        ${statCard(t('proteinToday'), `${Math.round(macros.protein)}<small> / ${goals.protein} g</small>`, `${Math.round(macros.protein / goals.protein * 100)}${t('ofGoal')}`, 'delta-good', 'activity', 'ico-amber')}
      </div>

      <div class="grid grid-2 mt">
        <div class="card"><div class="card-head-row"><div><div class="card-title">${t('weightTrend')}</div><div class="card-sub">${t('weightTrendSub')}</div></div></div>
          <div class="chart-wrap"><canvas id="chWeight"></canvas></div></div>
        <div class="card"><div class="card-title">${t('volTitle')}</div><div class="card-sub">${t('volSub')}</div>
          <div class="chart-wrap"><canvas id="chVolume"></canvas></div></div>
        <div class="card"><div class="card-title">${t('dailyKcal')}</div><div class="card-sub">${t('kcalSub')}</div>
          <div class="chart-wrap"><canvas id="chKcal"></canvas></div></div>
        <div class="card"><div class="card-title">${t('macroToday')}</div><div class="card-sub">${t('distribution')}</div>
          <div class="chart-wrap"><canvas id="chMacro"></canvas></div></div>
      </div>

      <div class="grid grid-3 mt">
        <div class="card"><div class="card-title">${t('lastWorkouts')}</div><div class="card-sub">${t('recentSessions')}</div>
          ${recent.length ? recent.map(w => `<div class="list-row"><div class="list-ico ico-blue">${ic('dumbbell')}</div>
            <div class="list-main"><b>${esc(w.name)}</b><span>${fmtDateShort(w.date)} · ${w.exercises.length} ${t('exercises')}</span></div>
            <div class="list-end"><b>${Math.round(Stats.workoutVolume(w)).toLocaleString(locale())} kg</b>${w.duration} min</div></div>`).join('')
          : emptyState('dumbbell', t('noWork'), t('noWorkP'))}
        </div>
        <div class="card"><div class="card-title">${t('lastMeasures')}</div><div class="card-sub">${t('weightWaist')}</div>
          ${recentM.length ? recentM.map(x => `<div class="list-row"><div class="list-ico ico-emerald">${ic('ruler')}</div>
            <div class="list-main"><b>${x.weight} kg</b><span>${fmtDateShort(x.date)}</span></div>
            <div class="list-end"><b>${x.waist ?? '—'} cm</b>${t('waistLow')}</div></div>`).join('')
          : emptyState('ruler', t('noMeas'), t('noMeasP'))}
        </div>
        <div class="card"><div class="card-title">${t('prs')}</div><div class="card-sub">${t('prSub')}</div>
          ${prs.length ? prs.map((p2, i) => `<div class="pr-item"><span class="pr-rank ${['', 'r2', 'r3', 'rn', 'rn'][i]}">${i + 1}</span>
            <div><div class="pr-name">${esc(p2.name)}</div><div class="pr-detail">${p2.weight} kg × ${p2.reps} · ${fmtDateShort(p2.date)}</div></div>
            <span class="pr-value">${Math.round(p2.orm)} kg</span></div>`).join('')
          : emptyState('trophy', t('noPr'), t('noPrP'))}
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
          label: t('weightKg'), data: ms.map(m => m.weight),
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
        datasets: [{ label: t('volumeKg'), data: ws.map(w => Math.round(Stats.workoutVolume(w))), backgroundColor: Charts.colors.blue + 'cc', borderRadius: 8, maxBarThickness: 26 }],
      },
      options: Charts.baseOpts(),
    });

    const days = [...Array(7)].map((_, i) => daysAgo(6 - i));
    Charts.make('chKcal', {
      type: 'bar',
      data: {
        labels: days.map(fmtDateShort),
        datasets: [
          { label: t('kcalLbl2'), data: days.map(d => Math.round(Stats.dayMacros(d).kcal)), backgroundColor: Charts.colors.emerald + 'cc', borderRadius: 8, maxBarThickness: 30 },
          { label: t('goalLbl2'), data: days.map(() => Store.data.goals.kcal), type: 'line', borderColor: Charts.colors.amber, borderDash: [6, 5], pointRadius: 0, borderWidth: 2 },
        ],
      },
      options: Charts.baseOpts(),
    });

    const mac = Stats.dayMacros(todayISO());
    Charts.make('chMacro', {
      type: 'doughnut',
      data: {
        labels: [t('proteinS'), t('carbsS'), t('fatS')],
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
        <div class="page-title"><h1>${t('navMeas')}</h1><p>${t('measSub')}</p></div>
        <div class="actions">
          <button class="btn" id="btnCompare">${ic('swap')} ${t('cmpDates')}</button>
          <button class="btn btn-primary" id="btnAddM">${ic('plus')} ${t('newMeas')}</button>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card"><div class="card-head-row"><div><div class="card-title">${t('trendTime')}</div><div class="card-sub">${t('selectMeasure')}</div></div>
          <select id="mMetric" class="table-search" style="width:auto">
            ${M_FIELDS.map(f => `<option value="${f.key}">${fl(f)}</option>`).join('')}
          </select></div>
          <div class="chart-wrap"><canvas id="chMeasure"></canvas></div></div>
        <div class="card"><div class="card-title">${t('deltasPct')}</div><div class="card-sub">${t('fullHistory')}</div>
          <div class="chart-wrap"><canvas id="chDeltas"></canvas></div></div>
      </div>

      <div class="card mt"><div class="card-title">${t('allMeasChart')}</div><div class="card-sub">${t('allMeasSub')}</div>
        <div class="chart-wrap tall"><canvas id="chAllMeas"></canvas></div></div>

      <div class="card table-card mt">
        <div class="table-toolbar"><div class="card-title">${t('historyMeas')}</div>
          <div class="spacer">
            <input class="table-search" id="mSearch" placeholder="${t('searchMini')}">
            <button class="btn btn-sm" id="mCsv">${ic('download')} CSV</button>
            <button class="btn btn-sm" id="mPdf">${ic('download')} PDF</button>
          </div></div>
        <div id="mTable"></div>
      </div>
    </div>`;
  },

  misureMount() {
    const F = k => M_FIELDS.find(f => f.key === k);
    const cols = [
      { key: 'date', label: t('date'), render: r => fmtDate(r.date) },
      { key: 'weight', label: t('weightKg') },
      { key: 'bodyFat', label: t('fatPct'), render: r => r.bodyFat ?? '—' },
      { key: 'waist', label: fl(F('waist')), render: r => r.waist ?? '—' },
      { key: 'chest', label: fl(F('chest')), render: r => r.chest ?? '—' },
      { key: 'hips', label: fl(F('hips')), render: r => r.hips ?? '—' },
      { key: 'arm', label: fl(F('arm')), render: r => r.arm ?? '—' },
      { key: 'thigh', label: fl(F('thigh')), render: r => r.thigh ?? '—' },
    ];
    const table = renderTable({
      mountId: 'mTable', columns: cols, rows: Store.data.measurements, csvName: 'misure',
      onEdit: id => measurementForm(Store.data.measurements.find(x => x.id === id)),
      onDelete: id => confirmDialog(t('delMeasConfirm'), () => {
        Store.data.measurements = Store.data.measurements.filter(x => x.id !== id);
        Store.save(); Toast.show(t('measDeleted')); Router.render();
      }),
      emptyMsg: t('firstMeasHint'),
    });
    $('#mSearch').oninput = e => table.search(e.target.value);
    $('#mCsv').onclick = () => table.exportCSV();
    $('#mPdf').onclick = () => window.print();
    $('#btnAddM').onclick = () => measurementForm();
    $('#btnCompare').onclick = () => compareDialog();

    const drawMetric = key => {
      Charts.registry = Charts.registry.filter(c => (c.canvas.id === 'chMeasure' ? (c.destroy(), false) : true));
      const ms = Stats.sortedMeasurements();
      const f = F(key);
      Charts.make('chMeasure', {
        type: 'line',
        data: {
          labels: ms.map(m => fmtDateShort(m.date)),
          datasets: [{ label: `${fl(f)} (${f.unit})`, data: ms.map(m => m[key]), borderColor: Charts.colors.blue, backgroundColor: Charts.gradient('chMeasure', Charts.colors.blue), fill: true, tension: .35, pointRadius: 3, borderWidth: 2.5, spanGaps: true }],
        },
        options: Charts.baseOpts(),
      });
    };
    drawMetric('weight');
    $('#mMetric').onchange = e => drawMetric(e.target.value);

    // Grafico unico con tutte le misure: variazione % dal primo rilevamento
    // di ogni serie → unità diverse (kg, cm, %) confrontabili sullo stesso asse
    {
      const ms = Stats.sortedMeasurements();
      const palette = ['#10b981', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#6366f1', '#a855f7'];
      const fields = M_FIELDS.filter(f => f.key !== 'height'); // l'altezza è costante
      const raw = {}; // valori assoluti per il tooltip
      const pct = f => {
        const base = ms.map(m => m[f.key]).find(v => v != null);
        raw[f.key] = ms.map(m => m[f.key]);
        return ms.map(m => (m[f.key] == null || !base) ? null : round1((m[f.key] / base - 1) * 100));
      };
      const base = Charts.baseOpts();
      Charts.make('chAllMeas', {
        type: 'line',
        data: {
          labels: ms.map(m => fmtDateShort(m.date)),
          datasets: fields.map((f, i) => ({
            label: fl(f),
            data: pct(f),
            _key: f.key, _unit: f.unit,
            borderColor: palette[i % palette.length],
            backgroundColor: palette[i % palette.length],
            tension: .3, pointRadius: 3, pointHoverRadius: 6, borderWidth: 2, spanGaps: true, fill: false,
          })),
        },
        options: {
          ...base,
          scales: { ...base.scales, y: { ...base.scales.y, ticks: { ...base.scales.y.ticks, callback: v => v + '%' } } },
          plugins: {
            ...base.plugins,
            tooltip: {
              ...base.plugins.tooltip,
              callbacks: {
                label: ctx => {
                  const abs = raw[ctx.dataset._key]?.[ctx.dataIndex];
                  const p = ctx.parsed.y;
                  return ` ${ctx.dataset.label}: ${p > 0 ? '+' : ''}${p}% (${abs} ${ctx.dataset._unit})`;
                },
              },
            },
          },
        },
      });
    }

    const s = Stats.sortedMeasurements();
    if (s.length >= 2) {
      const first = s[0], last = s[s.length - 1];
      const keys = M_FIELDS.filter(f => f.key !== 'height' && first[f.key] != null && last[f.key] != null).slice(0, 10);
      Charts.make('chDeltas', {
        type: 'bar',
        data: {
          labels: keys.map(fl),
          datasets: [{
            label: t('changePct'),
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
    const totVol = ws.reduce((tt, w) => tt + Stats.workoutVolume(w), 0);
    const totEx = ws.reduce((tt, w) => tt + w.exercises.length, 0);

    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>${t('navWork')}</h1><p>${t('workSub')}</p></div>
        <div class="actions">
          <button class="btn" id="btnTemplates">${ic('clipboard')} ${t('templates')} (${Store.data.templates.length})</button>
          <button class="btn btn-primary" id="btnAddW">${ic('plus')} ${t('newWork')}</button>
        </div>
      </div>

      <div class="grid grid-stats">
        ${statCard(t('totSessions'), ws.length, t('inHistory'), 'delta-neutral', 'calendar', 'ico-blue')}
        ${statCard(t('totVolume'), `${Math.round(totVol / 1000).toLocaleString(locale())}<small> t</small>`, t('liftedTotal'), 'delta-good', 'trending', 'ico-emerald')}
        ${statCard(t('exDone'), totEx, t('avgPerSession', round1(totEx / (ws.length || 1))), 'delta-neutral', 'target', 'ico-purple')}
        ${statCard(t('avgDuration'), `${Math.round(ws.reduce((tt, w) => tt + w.duration, 0) / (ws.length || 1))}<small> min</small>`, t('perSession'), 'delta-neutral', 'clock', 'ico-amber')}
      </div>

      <div class="grid grid-2 mt">
        <div class="card"><div class="card-title">${t('volOverTime')}</div><div class="card-sub">${t('kgPerSession')}</div>
          <div class="chart-wrap"><canvas id="chWVol"></canvas></div></div>
        <div class="card"><div class="card-title">${t('muscleFreq')}</div><div class="card-sub">${t('setsPerGroup')}</div>
          <div class="chart-wrap"><canvas id="chWRadar"></canvas></div></div>
      </div>

      <div class="card table-card mt">
        <div class="table-toolbar"><div class="card-title">${t('workHistory')}</div>
          <div class="spacer">
            <input class="table-search" id="wSearch" placeholder="${t('searchMini')}">
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
        { key: 'date', label: t('date'), render: r => fmtDate(r.date) },
        { key: 'name', label: t('name'), render: r => `<b>${esc(r.name)}</b>` },
        { key: 'group', label: t('group'), render: r => `<span class="badge badge-blue">${esc(r.group)}</span>` },
        { key: 'nEx', label: t('exsCol') },
        { key: 'volume', label: t('volumeKg'), render: r => r.volume.toLocaleString(locale()) },
        { key: 'duration', label: t('durationMin') },
      ],
      onShare: id => shareDialog(workoutShareText(Store.data.workouts.find(x => x.id === id))),
      onEdit: id => workoutForm(Store.data.workouts.find(x => x.id === id)),
      onDelete: id => confirmDialog(t('delWorkConfirm'), () => {
        Store.data.workouts = Store.data.workouts.filter(x => x.id !== id);
        Store.save(); Toast.show(t('workDeleted')); Router.render();
      }),
      emptyMsg: t('firstWorkHint'),
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
        datasets: [{ label: t('volumeKg'), data: ws.map(w => Math.round(Stats.workoutVolume(w))), borderColor: Charts.colors.emerald, backgroundColor: Charts.gradient('chWVol', Charts.colors.emerald), fill: true, tension: .35, pointRadius: 3, borderWidth: 2.5 }],
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
          datasets: [{ label: t('totalSets'), data: labels.map(l => freq[l]), borderColor: Charts.colors.purple, backgroundColor: Charts.colors.purple + '33', pointBackgroundColor: Charts.colors.purple, borderWidth: 2 }],
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
    const meals = Stats.mealsFor(date);

    const mealBlocks = MEAL_KEYS.map(mn => {
      const foods = meals.filter(m => m.meal === mn);
      const kcal = foods.reduce((tt, f) => tt + f.kcal, 0);
      return `<div class="card mt">
        <div class="card-head-row"><div><div class="card-title">${mealLabel(mn)}</div><div class="card-sub">${Math.round(kcal)} kcal</div></div>
          <button class="btn btn-sm btn-primary" data-addfood="${mn}">${ic('plus')} ${t('foodItem')}</button></div>
        ${foods.length ? foods.map(f => `<div class="list-row"><div class="list-ico ico-emerald">${ic('utensils')}</div>
          <div class="list-main"><b>${esc(f.name)}</b><span>${esc(f.qty)} · P ${f.protein}g · C ${f.carbs}g · G ${f.fat}g</span></div>
          <div class="list-end"><b>${Math.round(f.kcal)} kcal</b></div>
          <div class="td-actions"><button class="btn-icon" data-editfood="${f.id}">${ic('pencil')}</button><button class="btn-icon danger" data-delfood="${f.id}">${ic('trash')}</button></div>
        </div>`).join('') : `<div class="empty-state" style="padding:18px"><p>${t('noFood')}</p></div>`}
      </div>`;
    }).join('');

    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>${t('navFood')}</h1><p>${t('foodSub')}</p></div>
        <div class="actions">
          <div class="field" style="margin:0"><input type="date" id="foodDate" value="${date}" max="${todayISO()}" style="height:40px"></div>
          <button class="btn" id="foodShare">${ic('share')} ${t('shareDay')}</button>
        </div>
      </div>

      <div class="grid grid-stats">
        ${statCard(t('kcalLbl2'), `${Math.round(mac.kcal)}<small> / ${g.kcal}</small>`, `${Math.max(0, g.kcal - Math.round(mac.kcal))} ${t('kcalRemaining')}`, mac.kcal > g.kcal ? 'delta-up' : 'delta-good', 'flame', 'ico-emerald')}
        ${statCard(t('proteinS'), `${Math.round(mac.protein)}<small> / ${g.protein} g</small>`, `${Math.round(mac.protein / g.protein * 100)}%`, 'delta-good', 'activity', 'ico-blue')}
        ${statCard(t('carbsS'), `${Math.round(mac.carbs)}<small> / ${g.carbs} g</small>`, `${Math.round(mac.carbs / g.carbs * 100)}%`, 'delta-neutral', 'target', 'ico-amber')}
        ${statCard(t('fatS'), `${Math.round(mac.fat)}<small> / ${g.fat} g</small>`, `${Math.round(mac.fat / g.fat * 100)}%`, 'delta-neutral', 'droplet', 'ico-purple')}
      </div>

      <div class="grid grid-2 mt">
        <div class="card">
          <div class="card-title">${t('nutriGoals')}</div><div class="card-sub">${t('dailyProgress')}</div>
          ${macroBar(t('kcalLbl2'), Math.round(mac.kcal), g.kcal, 'kcal')}
          ${macroBar(t('proteinS'), Math.round(mac.protein), g.protein, 'g')}
          ${macroBar(t('carbsS'), Math.round(mac.carbs), g.carbs, 'g')}
          ${macroBar(t('fatS'), Math.round(mac.fat), g.fat, 'g')}
        </div>
        <div class="card">
          <div class="card-head-row"><div><div class="card-title">${t('water')}</div><div class="card-sub">${water} / ${g.waterGlasses} ${t('glasses')} (${round1(water * 0.25)} L)</div></div></div>
          <div class="water-glasses">
            ${[...Array(g.waterGlasses)].map((_, i) => `<button class="water-glass ${i < water ? 'full' : ''}" data-water="${i + 1}">${ic('droplet')}</button>`).join('')}
          </div>
          <div class="card-title mt" style="font-size:14px">${t('weekSummary')}</div>
          <div class="chart-wrap short"><canvas id="chWeekKcal"></canvas></div>
        </div>
      </div>

      ${mealBlocks}
    </div>`;
  },

  alimentazioneMount() {
    $('#foodDate').onchange = e => { State.foodDate = e.target.value; Router.render(); };
    $('#foodShare').onclick = () => sharePeriodDialog(State.foodDate, true);
    $$('[data-addfood]').forEach(b => b.onclick = () => foodForm(null, b.dataset.addfood));
    $$('[data-editfood]').forEach(b => b.onclick = () => foodForm(Store.data.meals.find(m => m.id === b.dataset.editfood)));
    $$('[data-delfood]').forEach(b => b.onclick = () => confirmDialog(t('delFoodConfirm'), () => {
      Store.data.meals = Store.data.meals.filter(m => m.id !== b.dataset.delfood);
      Store.save(); Toast.show(t('foodDeleted')); Router.render();
    }));
    $$('[data-water]').forEach(b => b.onclick = () => {
      const n = Number(b.dataset.water);
      const cur = Store.data.water[State.foodDate] || 0;
      Store.data.water[State.foodDate] = (n === cur) ? n - 1 : n;
      Store.save(); Router.render();
    });

    const days = [...Array(7)].map((_, i) => daysAgo(6 - i));
    Charts.make('chWeekKcal', {
      type: 'bar',
      data: {
        labels: days.map(fmtDateShort),
        datasets: [
          { label: t('proteinS') + ' (g)', data: days.map(d => Math.round(Stats.dayMacros(d).protein)), backgroundColor: Charts.colors.emerald + 'cc', borderRadius: 6, maxBarThickness: 22 },
          { label: t('carbsS') + ' (g)', data: days.map(d => Math.round(Stats.dayMacros(d).carbs)), backgroundColor: Charts.colors.blue + 'cc', borderRadius: 6, maxBarThickness: 22 },
          { label: t('fatS') + ' (g)', data: days.map(d => Math.round(Stats.dayMacros(d).fat)), backgroundColor: Charts.colors.amber + 'cc', borderRadius: 6, maxBarThickness: 22 },
        ],
      },
      options: { ...Charts.baseOpts(), scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }, y: { stacked: true, ticks: { color: '#94a3b8', font: { size: 10 } }, border: { display: false } } } },
    });
  },

  /* ------------------------------------------------ RIPOSO */
  riposo() {
    const days = Wellness.days();
    if (!days.length) {
      return `<div class="page">
        <div class="page-head">
          <div class="page-title"><h1>${t('navRest')}</h1><p>${t('restSub')}</p></div>
          <div class="actions">
            <button class="btn" id="btnImpWell">${ic('upload')} ${t('importWellness')}</button>
            <button class="btn btn-primary" id="btnAddWell">${ic('plus')} ${t('addWellness')}</button>
          </div>
        </div>
        <div class="card">${emptyState('moon', t('noWellness'), t('noWellnessP'))}</div>
      </div>`;
    }

    const last = days[days.length - 1];
    const w = Wellness.get(last);
    const ready = Wellness.readiness(last);
    const q = Wellness.sleepQuality(w);
    const sleepStr = w.sleepMin != null ? `${Math.floor(w.sleepMin / 60)}h ${String(w.sleepMin % 60).padStart(2, '0')}` : '—';

    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>${t('navRest')}</h1><p>${t('restSub')} · ${fmtDate(last)}</p></div>
        <div class="actions">
          <button class="btn" id="btnImpWell">${ic('upload')} ${t('importWellness')}</button>
          <button class="btn btn-primary" id="btnAddWell">${ic('plus')} ${t('addWellness')}</button>
        </div>
      </div>

      <div class="grid grid-stats">
        ${statCard(t('readiness'), ready != null ? `${ready}<small> / 100</small>` : '—', t('readinessSub'), ready == null ? 'delta-neutral' : ready >= 70 ? 'delta-good' : ready >= 50 ? 'delta-neutral' : 'delta-up', 'gauge', 'ico-emerald')}
        ${statCard(t('sleepLast'), sleepStr, q != null ? `${Math.round(q)}% ${t('restorative')}` : '', q != null && q >= 45 ? 'delta-good' : 'delta-neutral', 'moon', 'ico-purple')}
        ${statCard(t('rhrLbl'), w.rhr != null ? `${w.rhr}<small> ${t('bpm')}</small>` : '—', '', 'delta-neutral', 'heart', 'ico-blue')}
        ${statCard(t('hrvLbl'), w.hrv != null ? `${w.hrv}<small> ${t('ms')}</small>` : '—', '', 'delta-neutral', 'activity', 'ico-amber')}
      </div>

      ${(() => {
        const parts = Wellness.readinessParts(last);
        if (!parts) return '';
        const label = { rhr: t('rhrLbl'), hrv: t('hrvLbl'), sleep: t('compSleep'), quality: t('compQuality') };
        return `<div class="card mt"><div class="card-title">${t('readyBreak')}</div><div class="card-sub">${fmtDate(last)} · ${t('readinessSub')}</div>
          <div class="grid grid-stats" style="margin-top:6px">
            ${Object.entries(parts).map(([k, v]) => `<div>
              <div class="macro-head" style="margin-bottom:6px"><b>${label[k]}</b><span>${v}/100</span></div>
              <div class="progress"><div class="progress-fill ${v < 50 ? 'over' : ''}" style="width:${v}%"></div></div>
            </div>`).join('')}
          </div></div>`;
      })()}

      <div class="grid grid-2 mt">
        <div class="card"><div class="card-title">${t('sleep14')}</div><div class="card-sub">${t('sleepQualityRef')}</div>
          <div class="chart-wrap"><canvas id="chSleep"></canvas></div></div>
        <div class="card"><div class="card-title">${t('rhrHrv14')}</div><div class="card-sub">${t('last14')}</div>
          <div class="chart-wrap"><canvas id="chRhrHrv"></canvas></div></div>
      </div>

      <div class="card mt"><div class="card-title">${t('readinessTrend')}</div><div class="card-sub">${t('last30')}</div>
        <div class="chart-wrap short"><canvas id="chReady"></canvas></div>
        <div style="font-size:11.5px;color:var(--text-faint);margin-top:10px">${t('readinessNote')}</div></div>
    </div>`;
  },

  riposoMount() {
    $('#btnAddWell').onclick = () => wellnessForm();
    $('#btnImpWell').onclick = () => wellnessImportDialog();
    const days = Wellness.days();
    if (!days.length) return;

    const lastN = n => days.slice(-n);

    // Sonno: barre colorate per qualità
    const d14 = lastN(14);
    Charts.make('chSleep', {
      type: 'bar',
      data: {
        labels: d14.map(fmtDateShort),
        datasets: [{
          label: t('sleepH'),
          data: d14.map(d => { const s = Wellness.get(d)?.sleepMin; return s != null ? round1(s / 60) : null; }),
          backgroundColor: d14.map(d => {
            const q = Wellness.sleepQuality(Wellness.get(d));
            return q == null ? Charts.colors.blue + '88' : q >= 45 ? Charts.colors.emerald + 'cc' : Charts.colors.amber + 'cc';
          }),
          borderRadius: 8, maxBarThickness: 26,
        }],
      },
      options: Charts.baseOpts(),
    });

    // RHR + HRV doppio asse
    Charts.make('chRhrHrv', {
      type: 'line',
      data: {
        labels: d14.map(fmtDateShort),
        datasets: [
          { label: t('rhrLbl'), data: d14.map(d => Wellness.get(d)?.rhr ?? null), borderColor: Charts.colors.blue, tension: .3, pointRadius: 3, borderWidth: 2, spanGaps: true, yAxisID: 'y' },
          { label: t('hrvLbl'), data: d14.map(d => Wellness.get(d)?.hrv ?? null), borderColor: Charts.colors.purple, tension: .3, pointRadius: 3, borderWidth: 2, spanGaps: true, yAxisID: 'y2' },
        ],
      },
      options: {
        ...Charts.baseOpts(),
        scales: {
          ...Charts.baseOpts().scales,
          y2: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-soft').trim(), font: { family: 'Inter', size: 10.5 } }, border: { display: false } },
        },
      },
    });

    // Readiness 30gg
    const d30 = lastN(30);
    Charts.make('chReady', {
      type: 'line',
      data: {
        labels: d30.map(fmtDateShort),
        datasets: [{ label: t('readiness'), data: d30.map(d => Wellness.readiness(d)), borderColor: Charts.colors.emerald, backgroundColor: Charts.gradient('chReady', Charts.colors.emerald), fill: true, tension: .3, pointRadius: 2, borderWidth: 2, spanGaps: true }],
      },
      options: { ...Charts.baseOpts(), scales: { ...Charts.baseOpts().scales, y: { ...Charts.baseOpts().scales.y, min: 0, max: 100 } } },
    });
  },

  /* ------------------------------------------------ SALUTE */
  salute() {
    const fa = Wellness.fitnessAge();
    const zones = Wellness.zones();
    const rhr = Wellness.latest('rhr');
    const hrv = Wellness.latest('hrv');

    const faBlock = fa ? `
      <div class="card">
        <div class="card-title">${t('fitnessAge')}</div><div class="card-sub">${t('faNote')}</div>
        <div style="display:flex;align-items:baseline;gap:18px;flex-wrap:wrap;margin:8px 0 14px">
          <span style="font-size:44px;font-weight:800;color:${fa.delta <= 0 ? 'var(--emerald)' : 'var(--red)'}">${fa.fitnessAge}</span>
          <span style="font-size:14px;color:var(--text-soft)">vs ${fa.age} ${t('chronoAge')}</span>
          <span class="badge ${fa.delta <= 0 ? 'badge-emerald' : 'badge-red'}">${fa.delta > 0 ? '+' : ''}${fa.delta} ${t('netDelta')}</span>
        </div>
        <div class="cmp-grid" style="grid-template-columns:1fr auto auto">
          ${fa.deltas.map(d => `<span class="cmp-label">${t(d.key)}</span><span>${d.detail}</span>
            <span class="cmp-delta" style="color:${d.value <= 0 ? 'var(--emerald)' : 'var(--red)'}">${d.value > 0 ? '+' : ''}${d.value}</span>`).join('')}
        </div>
        <div style="font-size:11.5px;color:var(--text-faint);margin-top:12px">${t('estVo2')}: <b>${fa.vo2} ml/kg/min</b> — ${t('vo2Note')}</div>
      </div>`
      : `<div class="card">${emptyState('gauge', t('fitnessAge'), t('needProfile'))}</div>`;

    const zoneBlock = zones ? `
      <div class="card">
        <div class="card-title">${t('hrZones')}</div><div class="card-sub">${t('hrZonesSub')} · HRmax ${zones.hrmax} · RHR ${zones.rhr}</div>
        ${zones.bands.map(z => {
          const w = (z.to - z.from) / (zones.hrmax - zones.bands[0].from) * 100;
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="width:110px;font-size:12.5px;font-weight:600">${t(z.key)}</span>
            <div class="progress" style="flex:1"><div class="progress-fill" style="width:${Math.max(10, w)}%;background:${z.color}"></div></div>
            <span style="width:80px;text-align:right;font-size:12.5px;color:var(--text-soft)">${z.from}–${z.to}</span>
          </div>`;
        }).join('')}
      </div>`
      : `<div class="card">${emptyState('heart', t('hrZones'), t('needRhr'))}</div>`;

    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>${t('navHealth')}</h1><p>${t('healthSub')}</p></div>
        <div class="actions">
          <button class="btn" id="btnImpWell2">${ic('upload')} ${t('importWellness')}</button>
          <button class="btn btn-primary" id="btnAddWell2">${ic('plus')} ${t('addWellness')}</button>
        </div>
      </div>

      <div class="grid grid-stats">
        ${statCard(t('rhrLbl'), rhr ? `${rhr.value}<small> ${t('bpm')}</small>` : '—', rhr ? fmtDateShort(rhr.date) : '', 'delta-neutral', 'heart', 'ico-blue')}
        ${statCard(t('hrvLbl'), hrv ? `${hrv.value}<small> ${t('ms')}</small>` : '—', hrv ? fmtDateShort(hrv.date) : '', 'delta-neutral', 'activity', 'ico-purple')}
        ${statCard(t('estVo2'), fa ? `${fa.vo2}<small> ml/kg</small>` : '—', 'Jackson 1990', 'delta-neutral', 'gauge', 'ico-emerald')}
        ${statCard(t('fitnessAge'), fa ? fa.fitnessAge : '—', fa ? `${fa.delta > 0 ? '+' : ''}${fa.delta} vs ${fa.age}` : '', fa && fa.delta <= 0 ? 'delta-down' : 'delta-neutral', 'flame', 'ico-amber')}
      </div>

      <div class="grid grid-2 mt">
        ${faBlock}
        ${zoneBlock}
        ${(() => {
          const tr = Wellness.trendScore('rhr', -1, 40);
          const th = Wellness.trendScore('hrv', 1, 10);
          const badge = v => v == null ? '' : `<span class="badge ${v >= 55 ? 'badge-emerald' : v >= 45 ? 'badge-blue' : 'badge-red'}">${t('trendLbl')} ${v}/100</span>`;
          return `<div class="card"><div class="card-head-row"><div class="card-title">${t('rhrHistory')}</div>${badge(tr)}</div>
            <div class="chart-wrap"><canvas id="chRhrHist"></canvas></div></div>
          <div class="card"><div class="card-head-row"><div class="card-title">${t('hrvHistory')}</div>${badge(th)}</div>
            <div class="chart-wrap"><canvas id="chHrvHist"></canvas></div></div>`;
        })()}
      </div>
    </div>`;
  },

  saluteMount() {
    $('#btnAddWell2').onclick = () => wellnessForm();
    $('#btnImpWell2').onclick = () => wellnessImportDialog();
    const days = Wellness.days();
    if (!days.length) return;

    const mk = (id, field, color, unit) => Charts.make(id, {
      type: 'line',
      data: {
        labels: days.map(fmtDateShort),
        datasets: [{ label: unit, data: days.map(d => Wellness.get(d)?.[field] ?? null), borderColor: color, backgroundColor: Charts.gradient(id, color), fill: true, tension: .3, pointRadius: 2, borderWidth: 2, spanGaps: true }],
      },
      options: Charts.baseOpts(),
    });
    mk('chRhrHist', 'rhr', Charts.colors.blue, t('rhrLbl') + ' (' + t('bpm') + ')');
    mk('chHrvHist', 'hrv', Charts.colors.purple, t('hrvLbl') + ' (' + t('ms') + ')');
  },

  /* ------------------------------------------------ CALENDARIO */
  calendario() {
    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>${t('navCal')}</h1><p>${t('calSub')}</p></div>
        <div class="actions cal-head" style="margin:0">
          <button class="btn-icon" id="calPrev">‹</button>
          <span class="cal-title" id="calTitle"></span>
          <button class="btn-icon" id="calNext">›</button>
          <button class="btn btn-sm" id="calToday">${t('calToday')}</button>
        </div>
      </div>
      <div class="card">
        <div class="cal-weekdays" id="calWeekdays"></div>
        <div class="cal-grid" id="calGrid"></div>
        <div class="cal-legend">
          <span><span class="cal-dot w"></span>${t('qWorkout')}</span>
          <span><span class="cal-dot m"></span>${t('qMeal')}</span>
        </div>
      </div>
    </div>`;
  },

  calendarioMount() {
    const draw = () => {
      const [y, mo] = State.calMonth.split('-').map(Number);
      const monthStart = new Date(y, mo - 1, 1);

      // Titolo mese localizzato
      $('#calTitle').textContent = monthStart.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });

      // Intestazione giorni (settimana da lunedì)
      const wd = [...Array(7)].map((_, i) =>
        new Date(2026, 5, i + 1).toLocaleDateString(locale(), { weekday: 'short' })); // 1 giu 2026 = lunedì
      $('#calWeekdays').innerHTML = wd.map(d => `<span>${d}</span>`).join('');

      // Indici: allenamenti e kcal per data
      const wByDate = {};
      Store.data.workouts.forEach(w => (wByDate[w.date] = wByDate[w.date] || []).push(w));
      const kcalByDate = {};
      Store.data.meals.forEach(m => kcalByDate[m.date] = (kcalByDate[m.date] || 0) + m.kcal);

      // Griglia: da lunedì della settimana del 1° del mese, 6 settimane
      const firstDow = (monthStart.getDay() + 6) % 7; // 0 = lunedì
      const cells = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(y, mo - 1, 1 - firstDow + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const inMonth = d.getMonth() === mo - 1;
        const nW = (wByDate[iso] || []).length;
        const kcal = Math.round(kcalByDate[iso] || 0);
        cells.push(`<button type="button" class="cal-cell ${inMonth ? '' : 'out'} ${iso === todayISO() ? 'today' : ''}" data-day="${inMonth ? iso : ''}">
          <span class="cal-num">${d.getDate()}</span>
          <span class="cal-marks">
            ${'<span class="cal-dot w"></span>'.repeat(Math.min(nW, 3))}
            ${kcal ? '<span class="cal-dot m"></span>' : ''}
          </span>
          ${kcal ? `<span class="cal-kcal">${kcal} kcal</span>` : ''}
        </button>`);
      }
      $('#calGrid').innerHTML = cells.join('');

      $$('#calGrid [data-day]').forEach(c => c.onclick = () => { if (c.dataset.day) calendarDayDialog(c.dataset.day); });
    };

    $('#calPrev').onclick = () => { State.calMonth = shiftMonth(State.calMonth, -1); draw(); };
    $('#calNext').onclick = () => { State.calMonth = shiftMonth(State.calMonth, 1); draw(); };
    $('#calToday').onclick = () => { State.calMonth = todayISO().slice(0, 7); draw(); };
    draw();
  },

  /* ------------------------------------------------ PROGRESSI */
  progressi() {
    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>${t('navProg')}</h1><p>${t('progSub')}</p></div>
        <div class="actions chip-row" id="rangeChips">
          <button class="chip ${State.range === 7 ? 'active' : ''}" data-range="7">${t('week')}</button>
          <button class="chip ${State.range === 30 ? 'active' : ''}" data-range="30">${t('month')}</button>
          <button class="chip ${State.range === 365 ? 'active' : ''}" data-range="365">${t('year')}</button>
          <button class="chip ${State.range === 0 ? 'active' : ''}" data-range="0">${t('all')}</button>
        </div>
      </div>

      <div id="progStats" class="grid grid-stats"></div>

      <div class="grid grid-2 mt">
        <div class="card"><div class="card-title">${fl(M_FIELDS[0])}</div><div class="card-sub">${t('selPeriod')}</div>
          <div class="chart-wrap"><canvas id="pgWeight"></canvas></div></div>
        <div class="card"><div class="card-title">${t('keyGirths')}</div><div class="card-sub">${t('girthsSub')}</div>
          <div class="chart-wrap"><canvas id="pgCirc"></canvas></div></div>
        <div class="card"><div class="card-title">${t('kcalLbl2')}</div><div class="card-sub">${t('dailyIntake')}</div>
          <div class="chart-wrap"><canvas id="pgKcal"></canvas></div></div>
        <div class="card"><div class="card-title">${t('volTitle')}</div><div class="card-sub">${t('loadTrend')}</div>
          <div class="chart-wrap"><canvas id="pgVol"></canvas></div></div>
      </div>

      <div class="card mt"><div class="card-title">${t('pctImprove')}</div><div class="card-sub">${t('firstToLast')}</div>
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
    const vol = ws.reduce((tt, w) => tt + Stats.workoutVolume(w), 0);
    const F = k => M_FIELDS.find(f => f.key === k);
    $('#progStats').innerHTML =
      statCard('Δ ' + fl(F('weight')), `${dW > 0 ? '+' : ''}${dW}<small> kg</small>`, t('inPeriod'), dW <= 0 ? 'delta-down' : 'delta-up', 'scale', 'ico-emerald') +
      statCard(t('sessions'), ws.length, `${Math.round(ws.reduce((tt, w) => tt + w.duration, 0) / 60)} ${t('hoursTotal')}`, 'delta-neutral', 'dumbbell', 'ico-blue') +
      statCard('Volume', `${Math.round(vol / 1000)}<small> t</small>`, t('lifted'), 'delta-good', 'trending', 'ico-purple') +
      statCard('Δ ' + fl(F('waist')), first && last && first.waist != null && last.waist != null ? `${round1(last.waist - first.waist)}<small> cm</small>` : '—', t('girth'), 'delta-down', 'ruler', 'ico-amber');

    Charts.make('pgWeight', {
      type: 'line',
      data: { labels: ms.map(m => fmtDateShort(m.date)), datasets: [{ label: t('weightKg'), data: ms.map(m => m.weight), borderColor: Charts.colors.emerald, backgroundColor: Charts.gradient('pgWeight', Charts.colors.emerald), fill: true, tension: .35, pointRadius: 3, borderWidth: 2.5 }] },
      options: Charts.baseOpts(),
    });

    Charts.make('pgCirc', {
      type: 'line',
      data: {
        labels: ms.map(m => fmtDateShort(m.date)),
        datasets: [
          { label: fl(F('waist')), data: ms.map(m => m.waist), borderColor: Charts.colors.emerald, tension: .35, pointRadius: 2, borderWidth: 2, spanGaps: true },
          { label: fl(F('chest')), data: ms.map(m => m.chest), borderColor: Charts.colors.blue, tension: .35, pointRadius: 2, borderWidth: 2, spanGaps: true },
          { label: fl(F('arm')), data: ms.map(m => m.arm), borderColor: Charts.colors.purple, tension: .35, pointRadius: 2, borderWidth: 2, spanGaps: true },
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
      data: { labels: ws.map(w => fmtDateShort(w.date)), datasets: [{ label: t('volumeKg'), data: ws.map(w => Math.round(Stats.workoutVolume(w))), backgroundColor: Charts.colors.blue + 'cc', borderRadius: 8, maxBarThickness: 26 }] },
      options: Charts.baseOpts(),
    });

    if (first && last && first !== last) {
      const rows = M_FIELDS.filter(f => f.key !== 'height' && first[f.key] != null && last[f.key] != null).map(f => {
        const d = round1(last[f.key] - first[f.key]);
        const pct = first[f.key] ? round1(d / first[f.key] * 100) : 0;
        const good = ['waist', 'abdomen', 'hips', 'weight', 'bodyFat', 'neck'].includes(f.key) ? d <= 0 : d >= 0;
        return `<span class="cmp-label">${fl(f)}</span>
          <span>${first[f.key]} → ${last[f.key]} ${f.unit}</span>
          <span class="cmp-delta" style="color:${good ? 'var(--emerald)' : 'var(--red)'}">${d > 0 ? '+' : ''}${d} (${pct > 0 ? '+' : ''}${pct}%)</span>`;
      }).join('');
      $('#pgImprovements').innerHTML = `<span class="cmp-h">${t('measureCol')}</span><span class="cmp-h">${t('valuesCol')}</span><span class="cmp-h" style="text-align:right">Δ</span>` + rows;
    } else {
      $('#pgImprovements').innerHTML = `<span style="color:var(--text-faint);font-size:13px">${t('insufficient')}</span>`;
    }
  },
};

/* =====================================================================
   FORMS (modali)
   ===================================================================== */
function measurementForm(existing = null) {
  const m = existing || Object.fromEntries(M_FIELDS.map(f => [f.key, f.key === 'height' ? (Store.data.profile.height ?? '') : '']));
  const body = `<div class="form-grid">
    <div class="field full"><label>${t('date')} *</label><input type="date" id="fmDate" data-req value="${existing ? existing.date : todayISO()}" max="${todayISO()}"><div class="err-msg">${t('required')}</div></div>
    ${M_FIELDS.map(f => `<div class="field"><label>${fl(f)} (${f.unit})${f.key === 'weight' ? ' *' : ''}</label>
      <input type="number" step="0.1" min="0" id="fm_${f.key}" ${f.key === 'weight' ? 'data-req data-pos' : ''} value="${m[f.key] ?? ''}" placeholder="0.0"><div class="err-msg">${t('invalidVal')}</div></div>`).join('')}
  </div>`;

  Modal.open({
    title: existing ? t('editMeas') : t('newMeas'), body, wide: true,
    footer: `<button class="btn" onclick="Modal.close()">${t('cancel')}</button><button class="btn btn-primary" id="fmSave">${t('save')}</button>`,
    onMount(root) {
      $('#fmSave', root).onclick = () => {
        if (!validateForm(root)) { Toast.show(t('reqFields'), 'error'); return; }
        const rec = { id: existing?.id || uid(), date: $('#fmDate', root).value };
        M_FIELDS.forEach(f => { const v = $('#fm_' + f.key, root).value; rec[f.key] = v === '' ? null : Number(v); });
        if (existing) {
          const i = Store.data.measurements.findIndex(x => x.id === existing.id);
          Store.data.measurements[i] = rec;
        } else Store.data.measurements.push(rec);
        Store.save(); Modal.close(); Toast.show(existing ? t('measUpdated') : t('measSaved')); Router.render();
      };
    },
  });
}

/* Gruppi muscolari selezionabili a pill (chiave canonica IT + etichetta EN) */
const MUSCLE_GROUPS = [
  { k: 'Petto', en: 'Chest' }, { k: 'Dorso', en: 'Back' }, { k: 'Spalle', en: 'Shoulders' },
  { k: 'Bicipiti', en: 'Biceps' }, { k: 'Tricipiti', en: 'Triceps' }, { k: 'Gambe', en: 'Legs' },
  { k: 'Femorali', en: 'Hamstrings' }, { k: 'Glutei', en: 'Glutes' }, { k: 'Polpacci', en: 'Calves' },
  { k: 'Core', en: 'Core' }, { k: 'Cardio', en: 'Cardio' }, { k: 'Altro', en: 'Other' },
];
const gLabel = g => Lang.lang === 'en' ? g.en : g.k;

/* Gruppi principali sempre visibili; gli altri compaiono con "Altri…" */
const MAIN_GROUP_KEYS = ['Petto', 'Dorso', 'Spalle', 'Bicipiti', 'Tricipiti', 'Gambe', 'Core'];

/* Database esercizi: statico (exercises-db.js) + personalizzati dell'utente */
function allExercises() { return [...(window.FWS_EXERCISES || []), ...(Store.data.customExercises || [])]; }
function findExercise(name) {
  const q = name.trim().toLowerCase();
  return allExercises().find(x => x.name.toLowerCase() === q) || null;
}

/* Seleziona la pill del gruppo nel blocco (espande i secondari se serve) */
function setBlockGroup(bl, groupKey) {
  $('[data-f="group"]', bl).value = groupKey;
  const extra = $('.gpill-extra', bl);
  const target = $$('.gpill', bl).find(p => p.dataset.g === groupKey);
  if (target && extra.contains(target)) { extra.hidden = false; $('.gpill-more', bl).classList.add('active'); }
  $$('.gpill', bl).forEach(p => { if (!p.classList.contains('gpill-more')) p.classList.toggle('active', p === target); });
}

/* Campo numerico con stepper −/＋ */
function stepperHTML(f, val, step, { min = 0, max = null, req = false } = {}) {
  return `<div class="stepper" data-min="${min}" ${max != null ? `data-max="${max}"` : ''}>
    <button type="button" class="st-btn" data-step="${-step}">−</button>
    <input type="number" min="${min}" class="exf" data-f="${f}" ${req ? 'data-req data-pos' : ''} value="${val}">
    <button type="button" class="st-btn" data-step="${step}">＋</button>
  </div>`;
}

function exerciseBlockHTML(e = {}) {
  const id = e.id || uid();
  const mode = e.mode === 'time' ? 'time' : 'reps';
  // Nuovo esercizio: nessun gruppo preselezionato (altrimenti il default "Altro",
  // che è tra i secondari, aprirebbe sempre la lista estesa)
  const group = e.group ? (MUSCLE_GROUPS.some(g => g.k === e.group) ? e.group : 'Altro') : '';
  const mains = MUSCLE_GROUPS.filter(g => MAIN_GROUP_KEYS.includes(g.k));
  const extras = MUSCLE_GROUPS.filter(g => !MAIN_GROUP_KEYS.includes(g.k));
  const extraOpen = extras.some(g => g.k === group); // gruppo salvato tra i secondari → mostra espanso
  const pill = g => `<button type="button" class="gpill ${group === g.k ? 'active' : ''}" data-g="${g.k}">${gLabel(g)}</button>`;

  return `<div class="ex-block" data-exid="${id}" data-notes="${esc(e.notes || '')}">
    <div class="ex-row-top">
      <div class="field fs-wrap"><input class="exf ex-name" data-f="name" data-req value="${esc(e.name || '')}" placeholder="${t('phExName')} *" autocomplete="off">
        <div class="fs-list ex-suggest"></div></div>
      <div class="mode-toggle">
        <button type="button" class="mchip ${mode === 'reps' ? 'active' : ''}" data-mode="reps">${t('modeReps')}</button>
        <button type="button" class="mchip ${mode === 'time' ? 'active' : ''}" data-mode="time">${t('modeTime')}</button>
      </div>
      <button type="button" class="btn-icon danger ex-del" title="${t('del')}">${ic('trash')}</button>
    </div>
    <div class="gpill-row">
      ${mains.map(pill).join('')}
      <button type="button" class="gpill gpill-more ${extraOpen ? 'active' : ''}">${t('moreGroups')}</button>
      <span class="gpill-extra" ${extraOpen ? '' : 'hidden'}>${extras.map(pill).join('')}</span>
    </div>
    <div class="ex-grid">
      <div class="field"><label>${t('sets')} *</label>${stepperHTML('sets', e.sets ?? 3, 1, { min: 1, req: true })}</div>
      <div class="field"><label class="reps-label">${mode === 'time' ? t('durationS') : t('reps')} *</label>
        ${stepperHTML('reps', e.reps ?? (mode === 'time' ? 60 : 10), mode === 'time' ? 15 : 1, { min: 1, req: true })}</div>
      <div class="field"><label>${t('weightKg')}</label>${stepperHTML('weight', e.weight ?? 0, 2.5)}</div>
      <div class="field"><label>${t('rest')}</label>${stepperHTML('rest', e.rest ?? 90, 15)}</div>
      <div class="field"><label>RPE</label>${stepperHTML('rpe', e.rpe ?? 8, 1, { min: 1, max: 10 })}</div>
    </div>
    <input type="hidden" data-f="group" value="${esc(group)}">
    <input type="hidden" data-f="mode" value="${mode}">
  </div>`;
}

function workoutForm(existing = null, fromTemplate = null) {
  const w = existing || fromTemplate || { name: '', group: '', duration: 60, notes: '', exercises: [{}] };
  const body = `
    <div class="form-grid">
      <div class="field full"><label>${t('workName')} *</label><input id="fwName" data-req value="${esc(w.name)}" placeholder="${t('phWorkName')}"><div class="err-msg">${t('required')}</div></div>
      <div class="field"><label>${t('date')} *</label><input type="date" id="fwDate" data-req value="${existing?.date || todayISO()}" max="${todayISO()}"><div class="err-msg">${t('required')}</div></div>
      <div class="field"><label>${t('muscleGroup')}</label>
        <select id="fwGroup">${['Upper Body', 'Lower Body', 'Full Body', 'Push', 'Pull', 'Legs', 'Altro'].map(g => `<option ${w.group === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label>${t('durationMin')}</label><input type="number" min="0" id="fwDur" value="${w.duration}"></div>
    </div>
    <div style="margin:16px 0 10px;font-weight:700;font-size:14px">${t('exsCol')}</div>
    <div id="exList">${w.exercises.map(e => exerciseBlockHTML(e)).join('')}</div>
    <button class="btn btn-sm" id="addEx">${ic('plus')} ${t('addExercise')}</button>`;

  Modal.open({
    title: existing ? t('editWork') : t('newWork'), body, wide: true,
    footer: `${existing ? `<button class="btn" id="fwDup">${ic('copy')} ${t('duplicate')}</button><button class="btn" id="fwTpl">${ic('clipboard')} ${t('saveTemplate')}</button>` : ''}
      <button class="btn" onclick="Modal.close()">${t('cancel')}</button><button class="btn btn-primary" id="fwSave">${t('save')}</button>`,
    onMount(root) {
      const bindBlocks = () => {
        $$('.ex-del', root).forEach(b => b.onclick = () => {
          if ($$('.ex-block', root).length === 1) { Toast.show(t('minOneEx'), 'error'); return; }
          b.closest('.ex-block').remove();
        });
        // Toggle Ripetizioni/Durata (es. plank): cambia label e passo dello stepper
        $$('.mchip', root).forEach(b => b.onclick = () => {
          const bl = b.closest('.ex-block');
          const time = b.dataset.mode === 'time';
          $$('.mchip', bl).forEach(x => x.classList.toggle('active', x === b));
          $('[data-f="mode"]', bl).value = b.dataset.mode;
          $('.reps-label', bl).innerHTML = (time ? t('durationS') : t('reps')) + ' *';
          const repsStepper = $('[data-f="reps"]', bl).closest('.stepper');
          $$('.st-btn', repsStepper).forEach(sb => { sb.dataset.step = (Number(sb.dataset.step) < 0 ? -1 : 1) * (time ? 15 : 1); });
        });
        // Pill gruppo muscolare (selezione singola; "Altri…" espande i secondari)
        $$('.gpill', root).forEach(b => b.onclick = () => {
          const bl = b.closest('.ex-block');
          if (b.classList.contains('gpill-more')) {
            const extra = $('.gpill-extra', bl);
            extra.hidden = !extra.hidden; // toggle: il pulsante resta visibile
            b.classList.toggle('active', !extra.hidden);
            return;
          }
          $$('.gpill', bl).forEach(x => x.classList.toggle('active', x === b && !x.classList.contains('gpill-more')));
          $('[data-f="group"]', bl).value = b.dataset.g;
        });
        // Autocomplete nome esercizio (DB locale + personalizzati)
        $$('.ex-name', root).forEach(inp => {
          const bl = inp.closest('.ex-block');
          const list = $('.ex-suggest', bl);
          inp.oninput = () => {
            const q = inp.value.trim().toLowerCase();
            if (q.length < 2) { list.classList.remove('open'); return; }
            const matches = allExercises().filter(x => x.name.toLowerCase().includes(q)).slice(0, 8);
            if (!matches.length) { list.classList.remove('open'); return; }
            list.innerHTML = matches.map((x, i) =>
              `<button type="button" class="fs-item" data-i="${i}"><span>${esc(x.name)}</span><small>${esc(x.group)}</small></button>`).join('');
            list.classList.add('open');
            $$('.fs-item', list).forEach(b => b.onclick = () => {
              const x = matches[Number(b.dataset.i)];
              inp.value = x.name;
              setBlockGroup(bl, x.group); // compila anche la pill del gruppo
              list.classList.remove('open');
            });
          };
          inp.onblur = () => setTimeout(() => list.classList.remove('open'), 200); // lascia il tempo al click
        });
        // Stepper generico −/＋ con clamp min/max
        $$('.st-btn', root).forEach(b => b.onclick = () => {
          const wrap = b.closest('.stepper');
          const inp = $('input', wrap);
          const min = Number(wrap.dataset.min || 0);
          const max = wrap.dataset.max !== undefined ? Number(wrap.dataset.max) : Infinity;
          inp.value = Math.min(max, Math.max(min, round1((Number(inp.value) || 0) + Number(b.dataset.step))));
        });
      };
      bindBlocks();
      $('#addEx', root).onclick = () => { $('#exList', root).insertAdjacentHTML('beforeend', exerciseBlockHTML()); bindBlocks(); };

      const collect = () => {
        if (!validateForm(root)) { Toast.show(t('reqFields'), 'error'); return null; }
        return {
          id: existing?.id || uid(),
          name: $('#fwName', root).value.trim(),
          date: $('#fwDate', root).value,
          group: $('#fwGroup', root).value,
          duration: Number($('#fwDur', root).value) || 0,
          notes: existing?.notes || '',
          exercises: $$('.ex-block', root).map(bl => {
            const get = f => $(`[data-f="${f}"]`, bl).value;
            return {
              id: bl.dataset.exid, name: get('name').trim(),
              group: get('group') || 'Altro', mode: get('mode') === 'time' ? 'time' : 'reps',
              sets: Number(get('sets')), reps: Number(get('reps')),
              weight: Number(get('weight')) || 0, rest: Number(get('rest')) || 0,
              rpe: Number(get('rpe')), notes: bl.dataset.notes || '',
            };
          }),
        };
      };

      // Esercizi non presenti in DB → aggiunti automaticamente ai personalizzati
      const learnExercises = rec => {
        rec.exercises.forEach(e => {
          if (e.name && !findExercise(e.name)) {
            Store.data.customExercises.push({ name: e.name, group: e.group || 'Altro' });
          }
        });
      };

      $('#fwSave', root).onclick = () => {
        const rec = collect(); if (!rec) return;
        learnExercises(rec);
        if (existing) {
          const i = Store.data.workouts.findIndex(x => x.id === existing.id);
          Store.data.workouts[i] = rec;
        } else Store.data.workouts.push(rec);
        Store.save(); Modal.close(); Toast.show(existing ? t('workUpdated') : t('workSaved')); Router.render();
      };

      if (existing) {
        $('#fwDup', root).onclick = () => {
          const rec = collect(); if (!rec) return;
          learnExercises(rec);
          rec.id = uid(); rec.date = todayISO();
          rec.exercises = rec.exercises.map(e => ({ ...e, id: uid() }));
          Store.data.workouts.push(rec);
          Store.save(); Modal.close(); Toast.show(t('workDuplicated')); Router.render();
        };
        $('#fwTpl', root).onclick = () => {
          const rec = collect(); if (!rec) return;
          Store.data.templates.push({ id: uid(), name: rec.name, group: rec.group, exercises: rec.exercises.map(e => ({ ...e, id: uid() })) });
          Store.save(); Toast.show(t('tplSaved'));
        };
      }
    },
  });
}

function templatesDialog() {
  const tpls = Store.data.templates;
  Modal.open({
    title: t('tplTitle'),
    body: tpls.length ? tpls.map(tp => `<div class="list-row">
      <div class="list-ico ico-blue">${ic('clipboard')}</div>
      <div class="list-main"><b>${esc(tp.name)}</b><span>${tp.exercises.length} ${t('exercises')} · ${esc(tp.group)}</span></div>
      <div class="td-actions" style="margin-left:auto;align-items:center">
        <button class="btn btn-sm btn-primary" data-usetpl="${tp.id}">${t('use')}</button>
        <button class="btn-icon danger" data-deltpl="${tp.id}">${ic('trash')}</button>
      </div></div>`).join('')
      : emptyState('clipboard', t('noTpl'), t('noTplP')),
    onMount(root) {
      $$('[data-usetpl]', root).forEach(b => b.onclick = () => {
        const tp = tpls.find(x => x.id === b.dataset.usetpl);
        Modal.close();
        setTimeout(() => workoutForm(null, { name: tp.name, group: tp.group, duration: 60, notes: '', exercises: tp.exercises.map(e => ({ ...e, id: uid() })) }), 300);
      });
      $$('[data-deltpl]', root).forEach(b => b.onclick = () => {
        Store.data.templates = Store.data.templates.filter(x => x.id !== b.dataset.deltpl);
        Store.save(); Toast.show(t('tplDeleted')); Modal.close();
      });
    },
  });
}

/* Database alimenti: statico (foods-db.js) + personalizzati dell'utente */
function allFoods() { return [...(window.FWS_FOODS || []), ...(Store.data.customFoods || [])]; }

function findFood(name) {
  const q = name.trim().toLowerCase();
  return allFoods().find(fd => fd.name.toLowerCase() === q) || null;
}

/* Ricerca su Open Food Facts (API pubblica, CORS abilitato) */
async function searchOpenFoodFacts(query) {
  const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=6'
    + '&fields=product_name,brands,nutriments&search_terms=' + encodeURIComponent(query);
  const res = await fetch(url);
  if (!res.ok) throw new Error('off ' + res.status);
  const j = await res.json();
  return (j.products || []).map(p => {
    const n = p.nutriments || {};
    return {
      name: (p.product_name || '').trim(),
      brand: (p.brands || '').split(',')[0].trim(),
      kcal: Number(n['energy-kcal_100g']) || 0,
      protein: round1(Number(n.proteins_100g) || 0),
      carbs: round1(Number(n.carbohydrates_100g) || 0),
      fat: round1(Number(n.fat_100g) || 0),
    };
  }).filter(fd => fd.name && fd.kcal > 0);
}

function foodForm(existing = null, mealKey = 'Colazione') {
  const f = existing || { name: '', qty: '', kcal: '', protein: '', carbs: '', fat: '' };
  // qty può essere "80 g" oppure "10 pz (12 g)" → i grammi sono tra parentesi
  const parseGrams = q => { const m = /\((\d+(?:[.,]\d+)?)\s*g\)/.exec(q || ''); return m ? parseFloat(m[1].replace(',', '.')) : (parseFloat(q) || ''); };
  const gramsInit = existing ? parseGrams(existing.qty) : '';
  let per100 = existing ? findFood(existing.name) : null; // alimento selezionato dal DB

  Modal.open({
    title: existing ? t('editFood') : t('addTo', mealLabel(mealKey)),
    body: `<div class="form-grid">
      <div class="field full fs-wrap"><label>${t('foodName')} *</label>
        <input id="ffName" data-req value="${esc(f.name)}" placeholder="${t('phFood')}" autocomplete="off">
        <div class="fs-list" id="ffList"></div>
        <div class="err-msg">${t('required')}</div></div>
      <div class="field" id="ffCountField" style="display:none"><label>${t('pieces')}</label><input type="number" min="0" step="0.5" id="ffCount" placeholder="1"></div>
      <div class="field"><label>${t('grams')}</label><input type="number" min="0" id="ffGrams" value="${gramsInit}" placeholder="100"></div>
      <div class="field"><label>${t('meal')}</label>
        <select id="ffMeal">${MEAL_KEYS.map(m => `<option value="${m}" ${(existing?.meal || mealKey) === m ? 'selected' : ''}>${mealLabel(m)}</option>`).join('')}</select></div>
      <div class="field"><label>${t('kcalUnit')} *</label><input type="number" min="0" id="ffKcal" data-req data-pos value="${f.kcal}"><div class="err-msg">${t('required')}</div></div>
      <div class="field"><label>${t('protein')}</label><input type="number" min="0" step="0.1" id="ffP" value="${f.protein}"></div>
      <div class="field"><label>${t('carbs')}</label><input type="number" min="0" step="0.1" id="ffC" value="${f.carbs}"></div>
      <div class="field"><label>${t('fat')}</label><input type="number" min="0" step="0.1" id="ffF" value="${f.fat}"></div>
      <div class="full" style="font-size:11.5px;color:var(--text-faint)">${t('autoCalc')}</div>
    </div>`,
    footer: `<button class="btn" onclick="Modal.close()">${t('cancel')}</button><button class="btn btn-primary" id="ffSave">${t('save')}</button>`,
    onMount(root) {
      const nameInp = $('#ffName', root), gramsInp = $('#ffGrams', root), list = $('#ffList', root);
      const countField = $('#ffCountField', root), countInp = $('#ffCount', root);

      // grammi + alimento selezionato → macro calcolate (per 100 g)
      const recalc = () => {
        const g = Number(gramsInp.value);
        if (!per100 || !g) return;
        $('#ffKcal', root).value = Math.round(per100.kcal * g / 100);
        $('#ffP', root).value = round1(per100.protein * g / 100);
        $('#ffC', root).value = round1(per100.carbs * g / 100);
        $('#ffF', root).value = round1(per100.fat * g / 100);
      };

      // Alimenti numerabili (unitG): mostra il campo pezzi e tienilo in sync coi grammi
      const syncCount = () => {
        if (per100?.unitG) {
          countField.style.display = '';
          const g = Number(gramsInp.value);
          countInp.value = g ? round1(g / per100.unitG) : '';
        } else {
          countField.style.display = 'none';
          countInp.value = '';
        }
      };

      const pick = fd => {
        per100 = fd;
        nameInp.value = fd.name;
        list.classList.remove('open');
        // Grammatura ricordata dall'ultima volta; altrimenti 1 pezzo o 100 g
        const pref = Store.data.foodPrefs[fd.name.toLowerCase()];
        if (!gramsInp.value || !existing) gramsInp.value = pref || (fd.unitG ? fd.unitG : 100);
        syncCount();
        recalc();
      };
      if (per100) syncCount(); // modifica di un alimento numerabile esistente

      let debounceT = null;
      const showSuggestions = () => {
        const q = nameInp.value.trim().toLowerCase();
        clearTimeout(debounceT);
        if (q.length < 2) { list.classList.remove('open'); return; }
        const matches = allFoods().filter(fd => fd.name.toLowerCase().includes(q)).slice(0, 8);

        // Nessun match locale → ricerca online automatica (debounce)
        if (!matches.length && q.length >= 3) {
          list.innerHTML = `<div class="fs-empty">${t('searching')}</div>`;
          list.classList.add('open');
          debounceT = setTimeout(() => onlineSearch(nameInp.value.trim()), 500);
          return;
        }

        list.innerHTML = matches.map((fd, i) =>
          `<button type="button" class="fs-item" data-i="${i}"><span>${esc(fd.name)}</span><small>${fd.kcal} kcal ${t('per100')}${fd.unitG ? ' · ' + t('pieceApprox', fd.unitG) : ''}</small></button>`
        ).join('') + `<button type="button" class="fs-item fs-online" id="ffOnline">${ic('search')} ${t('searchOnline')}: "${esc(nameInp.value.trim())}"</button>`;
        list.classList.add('open');
        $$('.fs-item[data-i]', list).forEach(b => b.onclick = () => pick(matches[Number(b.dataset.i)]));
        $('#ffOnline', list).onclick = () => onlineSearch(nameInp.value.trim());
      };

      // Alimento assente → cerca su Open Food Facts e aggiungilo al DB personale
      const onlineSearch = async q => {
        list.innerHTML = `<div class="fs-empty">${t('searching')}</div>`;
        try {
          const results = await searchOpenFoodFacts(q);
          if (!results.length) { list.innerHTML = `<div class="fs-empty">${t('noOnlineRes')}</div>`; return; }
          list.innerHTML = results.map((fd, i) =>
            `<button type="button" class="fs-item" data-i="${i}"><span>${esc(fd.name)}${fd.brand ? ` <small>(${esc(fd.brand)})</small>` : ''}</span><small>${fd.kcal} kcal ${t('per100')}</small></button>`
          ).join('');
          $$('.fs-item[data-i]', list).forEach(b => b.onclick = () => {
            const fd = results[Number(b.dataset.i)];
            const entry = { name: fd.name, kcal: fd.kcal, protein: fd.protein, carbs: fd.carbs, fat: fd.fat };
            if (!findFood(entry.name)) {
              Store.data.customFoods.push(entry);
              Store.save();
              Toast.show(t('foodDbAdded', entry.name), 'info');
            }
            pick(entry);
          });
        } catch { list.innerHTML = `<div class="fs-empty">${t('onlineErr')}</div>`; }
      };

      nameInp.oninput = () => { per100 = null; syncCount(); showSuggestions(); };
      gramsInp.oninput = () => { syncCount(); recalc(); };
      countInp.oninput = () => {
        if (!per100?.unitG) return;
        const n = Number(countInp.value);
        gramsInp.value = n ? round1(n * per100.unitG) : '';
        recalc();
      };
      root.addEventListener('click', e => { if (!e.target.closest('.fs-wrap')) list.classList.remove('open'); });

      $('#ffSave', root).onclick = async () => {
        // Alimento sconosciuto e kcal vuote → lookup automatico e creazione in DB
        const typedName = nameInp.value.trim();
        if (typedName && !findFood(typedName) && !Number($('#ffKcal', root).value)) {
          Toast.show(t('searching'), 'info');
          try {
            const results = await searchOpenFoodFacts(typedName);
            if (results.length) {
              const fd = results[0];
              const entry = { name: fd.name, kcal: fd.kcal, protein: fd.protein, carbs: fd.carbs, fat: fd.fat };
              if (!findFood(entry.name)) {
                Store.data.customFoods.push(entry);
                Store.save();
                Toast.show(t('foodDbAdded', entry.name), 'info');
              }
              pick(entry); // compila nome + valori dai grammi
            }
          } catch { /* offline o API giù: si prosegue con la validazione normale */ }
        }
        if (!validateForm(root)) { Toast.show(t('reqFields'), 'error'); return; }
        const grams = Number(gramsInp.value) || 0;
        const count = per100?.unitG ? Number(countInp.value) || 0 : 0;
        const rec = {
          id: existing?.id || uid(), date: existing?.date || State.foodDate,
          meal: $('#ffMeal', root).value, name: nameInp.value.trim(),
          qty: count ? `${count} pz (${grams} g)` : (grams ? `${grams} g` : '—'),
          kcal: Number($('#ffKcal', root).value), protein: Number($('#ffP', root).value) || 0,
          carbs: Number($('#ffC', root).value) || 0, fat: Number($('#ffF', root).value) || 0,
        };
        // Alimento inserito a mano e non in DB → deduci i valori/100g e salvalo
        if (!findFood(rec.name) && grams > 0 && rec.kcal > 0) {
          Store.data.customFoods.push({
            name: rec.name,
            kcal: Math.round(rec.kcal / grams * 100),
            protein: round1(rec.protein / grams * 100),
            carbs: round1(rec.carbs / grams * 100),
            fat: round1(rec.fat / grams * 100),
          });
          Toast.show(t('foodDbAdded', rec.name), 'info');
        }
        // Memorizza la grammatura: la prossima volta l'alimento parte da qui
        if (rec.name && grams > 0) Store.data.foodPrefs[rec.name.toLowerCase()] = grams;
        if (existing) {
          const i = Store.data.meals.findIndex(x => x.id === existing.id);
          Store.data.meals[i] = rec;
        } else Store.data.meals.push(rec);
        Store.save(); Modal.close(); Toast.show(existing ? t('foodUpdated') : t('foodAdded')); Router.render();
      };
    },
  });
}

/* =====================================================================
   CONDIVISIONE — testo formattato con Copia / WhatsApp / share nativa
   ===================================================================== */
function workoutShareText(w) {
  const vol = Math.round(Stats.workoutVolume(w));
  const lines = [
    `${w.name} — ${fmtDate(w.date)}`,
    `${w.group} · ${w.duration} min · ${t('volumeLbl')}: ${vol.toLocaleString(locale())} kg`,
    '',
  ];
  w.exercises.forEach(e => {
    const load = e.weight ? ` @ ${e.weight} kg` : '';
    const val = e.mode === 'time' ? `${e.sets}×${e.reps}s` : `${e.sets}×${e.reps}`;
    lines.push(`- ${e.name} [${e.group}]: ${val}${load} (${t('restShort')} ${e.rest}s, RPE ${e.rpe})`);
  });
  return lines.join('\n');
}

function foodDayShareText(date) {
  const meals = Stats.mealsFor(date);
  const mac = Stats.dayMacros(date);
  const water = Store.data.water[date] || 0;
  const lines = [`${t('navFood')} — ${fmtDate(date)}`, ''];
  MEAL_KEYS.forEach(mk => {
    const foods = meals.filter(m => m.meal === mk);
    if (!foods.length) return;
    const kcal = Math.round(foods.reduce((tt, f) => tt + f.kcal, 0));
    lines.push(`${mealLabel(mk)} (${kcal} kcal)`);
    foods.forEach(f => lines.push(`- ${f.name} ${f.qty}: ${Math.round(f.kcal)} kcal (P ${round1(f.protein)}g · C ${round1(f.carbs)}g · G ${round1(f.fat)}g)`));
    lines.push('');
  });
  lines.push(`${t('totalLbl')}: ${Math.round(mac.kcal)} kcal · P ${Math.round(mac.protein)}g · C ${Math.round(mac.carbs)}g · G ${Math.round(mac.fat)}g`);
  if (water) lines.push(`${t('waterLbl')}: ${water} ${t('glasses')} (${round1(water * 0.25)} L)`);
  return lines.join('\n');
}

/* Data locale → ISO senza shift di fuso */
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* I 7 giorni (lun→dom) della settimana contenente la data */
function weekDays(iso) {
  const d = new Date(iso + 'T00:00');
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return [...Array(7)].map((_, i) => { const x = new Date(start); x.setDate(start.getDate() + i); return isoOf(x); });
}

const SHARE_DIV = '\n\n----------\n\n';

/* Testo combinato del giorno (allenamenti + diario); foodOnly per la pagina Alimentazione */
function dayShareText(iso, foodOnly = false) {
  const parts = [];
  if (!foodOnly) Store.data.workouts.filter(w => w.date === iso).forEach(w => parts.push(workoutShareText(w)));
  if (Stats.mealsFor(iso).length) parts.push(foodDayShareText(iso));
  return parts.join(SHARE_DIV);
}

function weekShareText(iso, foodOnly = false) {
  const days = weekDays(iso);
  const parts = days.map(d => dayShareText(d, foodOnly)).filter(Boolean);
  if (!parts.length) return '';
  return `${t('weekOf')} ${fmtDateShort(days[0])} – ${fmtDate(days[6])}${SHARE_DIV}${parts.join(SHARE_DIV)}`;
}

/* Modale di condivisione con testo fisso (es. singolo workout) */
function shareDialog(text) {
  sharePeriodDialog(null, false, text);
}

/* Modale con scelta Giorno/Settimana; fixedText la rende statica */
function sharePeriodDialog(iso, foodOnly = false, fixedText = null) {
  let scope = 'day';
  const build = () => fixedText ?? (scope === 'day' ? dayShareText(iso, foodOnly) : weekShareText(iso, foodOnly));
  const canNative = !!navigator.share;

  Modal.open({
    title: t('shareTitle'),
    body: `
      ${fixedText ? '' : `<div class="chip-row" style="margin-bottom:12px">
        <button class="chip active" data-scope="day">${t('dayLbl')}</button>
        <button class="chip" data-scope="week">${t('weekOf')}</button>
      </div>`}
      <div class="share-pre" id="shPre"></div>`,
    footer: `
      <button class="btn" id="shCopy">${ic('copy')} ${t('copy')}</button>
      <button class="btn" id="shWa">WhatsApp</button>
      ${canNative ? `<button class="btn btn-primary" id="shNative">${ic('share')} ${t('send')}</button>` : ''}`,
    onMount(root) {
      const pre = $('#shPre', root);
      const redraw = () => { const tx = build(); pre.textContent = tx || t('nothingToShare'); };
      redraw();

      $$('[data-scope]', root).forEach(c => c.onclick = () => {
        scope = c.dataset.scope;
        $$('[data-scope]', root).forEach(x => x.classList.toggle('active', x === c));
        redraw();
      });

      $('#shCopy', root).onclick = async () => {
        const text = build();
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          Toast.show(t('copied'), 'info');
        } catch {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); Toast.show(t('copied'), 'info'); }
          catch { Toast.show(t('copyErr'), 'error'); }
          ta.remove();
        }
      };
      $('#shWa', root).onclick = () => { const text = build(); if (text) window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); };
      if (canNative) $('#shNative', root).onclick = () => { const text = build(); if (text) navigator.share({ title: 'Fit with Science', text }).catch(() => {}); };
    },
  });
}

/* Sposta 'YYYY-MM' di n mesi */
function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* Dettaglio giorno: allenamenti + pasti */
function calendarDayDialog(iso) {
  const works = Store.data.workouts.filter(w => w.date === iso);
  const meals = Stats.mealsFor(iso);
  const mac = Stats.dayMacros(iso);

  const workHTML = works.length ? works.map(w => `<div class="list-row">
      <div class="list-ico ico-blue">${ic('dumbbell')}</div>
      <div class="list-main"><b>${esc(w.name)}</b><span>${w.exercises.length} ${t('exercises')} · ${w.duration} min</span></div>
      <div class="list-end"><b>${Math.round(Stats.workoutVolume(w)).toLocaleString(locale())} kg</b></div>
    </div>`).join('') : `<div class="empty-state" style="padding:12px"><p>${t('noWork')}</p></div>`;

  const mealHTML = meals.length ? MEAL_KEYS.map(mk => {
    const foods = meals.filter(m => m.meal === mk);
    if (!foods.length) return '';
    const kcal = Math.round(foods.reduce((tt, f) => tt + f.kcal, 0));
    return `<div style="margin-bottom:8px"><b style="font-size:13px">${mealLabel(mk)}</b> <span class="badge badge-emerald">${kcal} kcal</span>
      <div style="font-size:12.5px;color:var(--text-soft);margin-top:2px">${foods.map(f => esc(f.name)).join(' · ')}</div></div>`;
  }).join('') : `<div class="empty-state" style="padding:12px"><p>${t('noFood')}</p></div>`;

  Modal.open({
    title: fmtDate(iso),
    body: `
      <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.04em">${t('navWork')}</div>
      ${workHTML}
      <div style="font-weight:700;font-size:13px;margin:16px 0 8px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.04em">${t('navFood')}
        ${meals.length ? `<span class="badge badge-blue" style="margin-left:6px">${Math.round(mac.kcal)} kcal · P ${Math.round(mac.protein)}g</span>` : ''}</div>
      ${mealHTML}`,
    footer: (works.length || meals.length) ? `<button class="btn btn-primary" id="cdShare">${ic('share')} ${t('share')}</button>` : null,
    onMount(root) {
      const btn = $('#cdShare', root);
      if (!btn) return;
      btn.onclick = () => sharePeriodDialog(iso, false); // toggle Giorno/Settimana
    },
  });
}

function compareDialog() {
  const ms = Stats.sortedMeasurements();
  if (ms.length < 2) { Toast.show(t('need2'), 'error'); return; }
  const opts = ms.map(m => `<option value="${m.id}">${fmtDate(m.date)}</option>`).join('');

  Modal.open({
    title: t('cmpTitle'), wide: true,
    body: `<div class="form-grid" style="grid-template-columns:1fr 1fr">
        <div class="field"><label>${t('from')}</label><select id="cmpA">${opts}</select></div>
        <div class="field"><label>${t('to')}</label><select id="cmpB">${opts}</select></div>
      </div><div id="cmpOut" class="mt"></div>`,
    onMount(root) {
      $('#cmpB', root).value = ms[ms.length - 1].id;
      const draw = () => {
        const a = ms.find(m => m.id === $('#cmpA', root).value);
        const b = ms.find(m => m.id === $('#cmpB', root).value);
        $('#cmpOut', root).innerHTML = `<div class="cmp-grid">
          <span class="cmp-h">${t('measureCol')}</span><span class="cmp-h">${fmtDateShort(a.date)}</span><span class="cmp-h">${fmtDateShort(b.date)}</span><span class="cmp-h" style="text-align:right">Δ</span>
          ${M_FIELDS.filter(f => a[f.key] != null && b[f.key] != null).map(f => {
            const d = round1(b[f.key] - a[f.key]);
            const pct = a[f.key] ? round1(d / a[f.key] * 100) : 0;
            const good = ['waist', 'abdomen', 'hips', 'weight', 'bodyFat', 'neck'].includes(f.key) ? d <= 0 : d >= 0;
            return `<span class="cmp-label">${fl(f)}</span><span>${a[f.key]} ${f.unit}</span><span>${b[f.key]} ${f.unit}</span>
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
   PROFILO — modifica dati personali + foto
   ===================================================================== */
function avatarHTML(p) {
  if (p.avatar) return `<img src="${p.avatar}" alt="">`;
  return ((p.firstName?.[0] || '?') + (p.lastName?.[0] || '')).toUpperCase();
}

/* Ridimensiona l'immagine a 160px (crop quadrato) e restituisce dataURL JPEG */
function resizeImage(file, size = 160) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(c.toDataURL('image/jpeg', 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function profileForm(user) {
  const p = Store.data.profile;
  let newAvatar = p.avatar;

  Modal.open({
    title: t('pfTitle'), wide: true,
    body: `
      <div class="photo-row">
        <div class="avatar-lg" id="pfAvatar">${avatarHTML(p)}</div>
        <div>
          <div style="font-weight:700;font-size:14px;margin-bottom:8px">${t('pfPhoto')}</div>
          <div class="photo-actions">
            <button class="btn btn-sm" id="pfUpload">${ic('camera')} ${t('pfUpload')}</button>
            <button class="btn btn-sm" id="pfRemovePhoto">${ic('trash')} ${t('pfRemove')}</button>
            <input type="file" id="pfFile" accept="image/*" hidden>
          </div>
        </div>
      </div>
      <div class="form-grid">
        <div class="field"><label>${t('firstName')} *</label><input id="pfFirst" data-req value="${esc(p.firstName)}"><div class="err-msg">${t('required')}</div></div>
        <div class="field"><label>${t('lastName')} *</label><input id="pfLast" data-req value="${esc(p.lastName)}"><div class="err-msg">${t('required')}</div></div>
        <div class="field"><label>${t('age')}</label><input type="number" min="10" max="100" id="pfAge" value="${p.age ?? ''}"></div>
        <div class="field"><label>${t('heightLbl')}</label><input type="number" min="0" id="pfHeight" value="${p.height ?? ''}"></div>
        <div class="field"><label>${t('sex')}</label>
          <select id="pfSex">
            <option value="m" ${p.sex === 'm' ? 'selected' : ''}>${t('sexM')}</option>
            <option value="f" ${p.sex === 'f' ? 'selected' : ''}>${t('sexF')}</option>
            <option value="na" ${p.sex === 'na' || !p.sex ? 'selected' : ''}>${t('sexNA')}</option>
          </select></div>
        <div class="field"><label>${t('goalLbl')}</label>
          <select id="pfGoal">${GOAL_KEYS.map(g => `<option value="${g}" ${p.goal === g ? 'selected' : ''}>${t('goal_' + g)}</option>`).join('')}</select></div>
        <div class="field full"><label>${t('pfBio')}</label><textarea id="pfBio" placeholder="${t('optional')}">${esc(p.bio || '')}</textarea></div>
      </div>`,
    footer: `<button class="btn" onclick="Modal.close()">${t('cancel')}</button><button class="btn btn-primary" id="pfSave">${t('save')}</button>`,
    onMount(root) {
      $('#pfUpload', root).onclick = () => $('#pfFile', root).click();
      $('#pfFile', root).onchange = async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          newAvatar = await resizeImage(file);
          $('#pfAvatar', root).innerHTML = `<img src="${newAvatar}" alt="">`;
        } catch { Toast.show(t('invalidFile'), 'error'); }
      };
      $('#pfRemovePhoto', root).onclick = () => {
        newAvatar = null;
        $('#pfAvatar', root).innerHTML = avatarHTML({ ...p, avatar: null });
      };

      $('#pfSave', root).onclick = () => {
        if (!validateForm(root)) { Toast.show(t('reqFields'), 'error'); return; }
        p.firstName = $('#pfFirst', root).value.trim();
        p.lastName = $('#pfLast', root).value.trim();
        p.age = $('#pfAge', root).value ? Number($('#pfAge', root).value) : null;
        p.height = $('#pfHeight', root).value ? Number($('#pfHeight', root).value) : null;
        p.sex = $('#pfSex', root).value;
        p.goal = $('#pfGoal', root).value;
        p.bio = $('#pfBio', root).value.trim();
        p.avatar = newAvatar;
        Store.save();
        Modal.close();
        applyUserToUI(user);
        Toast.show(t('pfSaved'));
        Router.render();
      };
    },
  });
}

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

/* =====================================================================
   IMPOSTAZIONI — obiettivi nutrizionali/allenamento + lingua + integrazioni
   ===================================================================== */
function settingsForm(user) {
  const g = Store.data.goals;
  Modal.open({
    title: t('stTitle'),
    body: `
      <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.04em">${t('stNutrition')}</div>
      <div class="form-grid">
        <div class="field"><label>${t('stKcal')}</label><input type="number" min="0" id="stKcal" value="${g.kcal}"></div>
        <div class="field"><label>${t('protein')}</label><input type="number" min="0" id="stP" value="${g.protein}"></div>
        <div class="field"><label>${t('carbs')}</label><input type="number" min="0" id="stC" value="${g.carbs}"></div>
        <div class="field"><label>${t('fat')}</label><input type="number" min="0" id="stF" value="${g.fat}"></div>
        <div class="field"><label>${t('stWater')}</label><input type="number" min="1" max="16" id="stWater" value="${g.waterGlasses}"></div>
        <div class="field"><label>${t('stWeekly')}</label><input type="number" min="1" max="14" id="stWeekly" value="${g.weeklyWorkouts}"></div>
      </div>
      <div style="font-weight:700;font-size:13px;margin:18px 0 10px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.04em">${t('stGeneral')}</div>
      <div class="form-grid">
        <div class="field"><label>${t('stLang')}</label>
          <select id="stLang">
            <option value="it" ${Lang.lang === 'it' ? 'selected' : ''}>Italiano</option>
            <option value="en" ${Lang.lang === 'en' ? 'selected' : ''}>English</option>
          </select></div>
      </div>
      <div style="font-weight:700;font-size:13px;margin:18px 0 10px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.04em">${t('stIntegrations')}</div>

      <div style="font-weight:700;font-size:13.5px;margin-bottom:4px">Fitbit
        <span class="badge ${Fitbit.connected() ? 'badge-emerald' : 'badge-red'}" style="margin-left:6px">${Fitbit.connected() ? t('fbConnected') : t('fbNotConnected')}</span></div>
      <div style="font-size:12.5px;color:var(--text-soft);margin-bottom:10px;line-height:1.5">${t('intFitbit')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
        ${Fitbit.connected()
          ? `<button class="btn" id="stFbSync">${ic('swap')} ${t('fbSync')}</button>
             <button class="btn btn-danger" id="stFbDisc">${ic('x')} ${t('fbDisconnect')}</button>`
          : `<button class="btn btn-blue" id="stFbConn">${ic('activity')} ${t('fbConnect')}</button>`}
      </div>

      <div style="font-weight:700;font-size:13.5px;margin-bottom:4px">${t('stGfit')}</div>
      <div style="font-size:12.5px;color:var(--text-soft);margin-bottom:10px;line-height:1.5">${t('gfitHint')}</div>
      <button class="btn" id="stGfitBtn">${ic('upload')} ${t('gfitImport')}</button>
      <input type="file" id="stGfitFile" accept=".json,.csv,application/json,text/csv" hidden>

      <div style="font-weight:700;font-size:13.5px;margin:18px 0 4px">Zepp / Amazfit · CSV</div>
      <div style="font-size:12.5px;color:var(--text-soft);margin-bottom:10px;line-height:1.5">${t('intZepp')}</div>
      <button class="btn" id="stZeppBtn">${ic('upload')} ${t('zeppImport')}</button>
      <input type="file" id="stZeppFile" accept=".csv,text/csv" hidden>

      <div style="font-weight:700;font-size:13.5px;margin:18px 0 4px">Google Health Connect</div>
      <div style="font-size:12.5px;color:var(--text-soft);margin-bottom:10px;line-height:1.5">${t('intHc')}</div>
      <button class="btn" id="stHcBtn">${ic('upload')} ${t('hcImport')}</button>
      <input type="file" id="stHcFile" accept=".db,application/octet-stream,application/x-sqlite3" hidden>`,
    footer: `<button class="btn" onclick="Modal.close()">${t('cancel')}</button><button class="btn btn-primary" id="stSave">${t('save')}</button>`,
    onMount(root) {
      if (Fitbit.connected()) {
        $('#stFbSync', root).onclick = () => { Modal.close(); Fitbit.sync(false); };
        $('#stFbDisc', root).onclick = () => { Fitbit.disconnect(); Modal.close(); };
      } else {
        $('#stFbConn', root).onclick = () => Fitbit.connect();
      }
      $('#stGfitBtn', root).onclick = () => $('#stGfitFile', root).click();
      $('#stZeppBtn', root).onclick = () => $('#stZeppFile', root).click();
      $('#stZeppFile', root).onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        Modal.close();
        importWellnessCSV(file);
      };
      $('#stHcBtn', root).onclick = () => $('#stHcFile', root).click();
      $('#stHcFile', root).onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        Modal.close();
        importHealthConnectDB(file);
      };
      $('#stGfitFile', root).onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        Modal.close();
        importGoogleFitFile(file);
      };
      $('#stSave', root).onclick = () => {
        g.kcal = Number($('#stKcal', root).value) || g.kcal;
        g.protein = Number($('#stP', root).value) || g.protein;
        g.carbs = Number($('#stC', root).value) || g.carbs;
        g.fat = Number($('#stF', root).value) || g.fat;
        g.waterGlasses = Math.max(1, Number($('#stWater', root).value) || g.waterGlasses);
        g.weeklyWorkouts = Math.max(1, Number($('#stWeekly', root).value) || g.weeklyWorkouts);
        Store.save();

        const newLang = $('#stLang', root).value;
        const langChanged = newLang !== Lang.lang;
        if (langChanged) Lang.set(newLang);

        Modal.close();
        if (langChanged) { applyStaticLang(); applyUserToUI(user); }
        Toast.show(t('stSaved'));
        Router.render();
      };
    },
  });
}

/* =====================================================================
   ONBOARDING — primo accesso
   ===================================================================== */
function onboardingForm(user) {
  const pre = user.prefill || {};
  const optFields = M_FIELDS.filter(f => !['weight', 'height', 'bodyFat'].includes(f.key));
  Modal.open({
    title: t('obTitle'), wide: true, locked: true,
    body: `
      <p style="font-size:13px;color:var(--text-soft);margin-bottom:16px">${t('obIntro')}</p>
      <div class="form-grid">
        <div class="field"><label>${t('firstName')} *</label><input id="obFirst" data-req value="${esc(pre.firstName || '')}" placeholder="Mario"><div class="err-msg">${t('required')}</div></div>
        <div class="field"><label>${t('lastName')} *</label><input id="obLast" data-req value="${esc(pre.lastName || '')}" placeholder="Rossi"><div class="err-msg">${t('required')}</div></div>
        <div class="field"><label>${t('age')} *</label><input type="number" min="10" max="100" id="obAge" data-req data-pos placeholder="30"><div class="err-msg">${t('required')}</div></div>
        <div class="field"><label>${t('weightLbl')} *</label><input type="number" step="0.1" min="0" id="obWeight" data-req data-pos placeholder="75.0"><div class="err-msg">${t('required')}</div></div>
        <div class="field"><label>${t('heightLbl')} *</label><input type="number" min="0" id="obHeight" data-req data-pos placeholder="175"><div class="err-msg">${t('required')}</div></div>
        <div class="field"><label>${t('bfOpt')}</label><input type="number" step="0.1" min="0" id="obBf" placeholder="18.0"></div>
      </div>
      <details style="margin-top:16px">
        <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--text-soft)">${t('obOptMeas')}</summary>
        <div class="form-grid" style="margin-top:12px">
          ${optFields.map(f => `<div class="field"><label>${fl(f)} (${f.unit})</label>
            <input type="number" step="0.1" min="0" id="ob_${f.key}" placeholder="0.0"></div>`).join('')}
        </div>
      </details>`,
    footer: `<button class="btn btn-primary" id="obSave">${t('obStart')}</button>`,
    onMount(root) {
      $('#obSave', root).onclick = () => {
        if (!validateForm(root)) { Toast.show(t('reqFields'), 'error'); return; }
        const p = Store.data.profile;
        p.firstName = $('#obFirst', root).value.trim();
        p.lastName = $('#obLast', root).value.trim();
        p.age = Number($('#obAge', root).value);
        p.height = Number($('#obHeight', root).value);
        if (pre.avatar) p.avatar = pre.avatar; // foto Google se disponibile

        const rec = { id: uid(), date: todayISO(), weight: Number($('#obWeight', root).value), height: p.height };
        const bf = $('#obBf', root).value;
        rec.bodyFat = bf === '' ? null : Number(bf);
        optFields.forEach(f => {
          const v = $('#ob_' + f.key, root).value;
          rec[f.key] = v === '' ? null : Number(v);
        });
        Store.data.measurements.push(rec);
        Store.data.onboarded = true; // vive nei dati → si sincronizza col cloud
        Store.save();

        user.onboarded = true;
        if (!user.cloud) Auth.updateUser(user); // gli account cloud non stanno in fws-users

        Modal.close();
        applyUserToUI(user);
        Toast.show(t('obWelcome', p.firstName));
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
        <div><h1>Fit with Science</h1><p>${t('appTagline')}</p></div>
      </div>

      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">${t('aLogin')}</button>
        <button class="auth-tab" data-tab="register">${t('aRegister')}</button>
      </div>

      <form id="authForm" novalidate>
        <div class="field"><label>${t('aEmail')}</label><input type="email" id="authEmail" data-req placeholder="nome@email.com" autocomplete="email"><div class="err-msg">${t('aEmailReq')}</div></div>
        <div class="field"><label>${t('aPw')}</label><input type="password" id="authPw" data-req placeholder="••••••••" autocomplete="current-password" minlength="6"><div class="err-msg">${t('aPwReq')}</div></div>
        <div class="field" id="pw2Field" style="display:none"><label>${t('aPw2')}</label><input type="password" id="authPw2" placeholder="••••••••" autocomplete="new-password"><div class="err-msg">${t('aPwMismatch')}</div></div>
        <button type="submit" class="btn btn-primary auth-submit" id="authSubmit">${t('aLogin')}</button>
      </form>

      <div class="auth-divider">${t('or')}</div>
      <div class="gsi-wrap" id="gsiBtn"></div>
      <button class="btn auth-demo" id="demoBtn">${ic('user')} ${t('aDemo')}</button>

      <p class="auth-note">${t('aNote')}<br>${t('aNote2')}</p>
    </div>`;

  let mode = 'login';
  $$('.auth-tab', scr).forEach(tab => tab.onclick = () => {
    mode = tab.dataset.tab;
    $$('.auth-tab', scr).forEach(x => x.classList.toggle('active', x === tab));
    $('#pw2Field', scr).style.display = mode === 'register' ? '' : 'none';
    $('#authSubmit', scr).textContent = mode === 'register' ? t('aCreate') : t('aLogin');
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
    if (Cloud.enabled) {
      // Firebase Auth: onAuthStateChanged farà partire l'app
      try {
        if (mode === 'register') await firebase.auth().createUserWithEmailAndPassword(email, pw);
        else await firebase.auth().signInWithEmailAndPassword(email, pw);
      } catch (err) { Toast.show(fbErrMsg(err), 'error'); }
      return;
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

  // Modalità cloud: popup Firebase al posto del bottone GIS
  if (Cloud.enabled) {
    mount.innerHTML = `<button class="btn" style="width:320px;max-width:100%;justify-content:center" id="fbGoogleBtn">${ic('user')} ${t('gContinue')}</button>`;
    $('#fbGoogleBtn', mount).onclick = async () => {
      try { await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
      catch (err) { if (err?.code !== 'auth/popup-closed-by-user') Toast.show(fbErrMsg(err), 'error'); }
    };
    return;
  }

  const tryInit = () => {
    if (GOOGLE_CLIENT_ID.startsWith('YOUR')) {
      mount.innerHTML = `<span style="font-size:12px;color:var(--text-faint);text-align:center">${t('aGoogleNc')}</span>`;
      return true;
    }
    if (!window.google?.accounts?.id) return false;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: res => {
        try {
          const payload = JSON.parse(atob(res.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          startApp(Auth.loginGoogle(payload));
        } catch { Toast.show(t('errGoogle'), 'error'); }
      },
    });
    google.accounts.id.renderButton(mount, {
      theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
      size: 'large', width: 320, text: 'continue_with', shape: 'pill', locale: Lang.lang,
    });
    return true;
  };
  if (!tryInit()) {
    let tries = 0;
    const iv = setInterval(() => { if (tryInit() || ++tries > 20) clearInterval(iv); }, 250);
  }
}

/* =====================================================================
   PROFILE MENU — profilo, impostazioni, export/import, logout
   ===================================================================== */
function initProfileMenu(user) {
  const menu = $('#profileMenu');
  const render = () => {
    const p = Store.data.profile;
    menu.innerHTML = `
      <div class="pm-head"><b>${esc(p.firstName)} ${esc(p.lastName)}</b><span>${esc(user.email)}</span></div>
      <button class="pm-item" id="pmProfile">${ic('user')} ${t('pmProfile')}</button>
      <button class="pm-item" id="pmSettings">${ic('gear')} ${t('pmSettings')}</button>
      <button class="pm-item" id="pmExport">${ic('download')} ${t('pmExport')}</button>
      <button class="pm-item" id="pmImport">${ic('upload')} ${t('pmImport')}</button>
      <button class="pm-item danger" id="pmLogout">${ic('logout')} ${t('pmLogout')}</button>`;
    $('#pmProfile', menu).onclick = () => { menu.classList.remove('open'); profileForm(user); };
    $('#pmSettings', menu).onclick = () => { menu.classList.remove('open'); settingsForm(user); };
    $('#pmExport', menu).onclick = () => { Store.exportJSON(); menu.classList.remove('open'); };
    $('#pmImport', menu).onclick = () => { $('#importFile').click(); menu.classList.remove('open'); };
    $('#pmLogout', menu).onclick = () => Auth.logout();
  };

  $('#profileBtn').onclick = e => { e.stopPropagation(); render(); menu.classList.toggle('open'); };
  document.addEventListener('click', e => { if (!e.target.closest('#profileMenu') && !e.target.closest('#profileBtn')) menu.classList.remove('open'); });

  $('#importFile').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      Store.importJSON(await file.text());
      Toast.show(t('dataImported'));
      applyUserToUI(user);
      Router.render();
    } catch { Toast.show(t('invalidFile'), 'error'); }
    e.target.value = '';
  };
}

function applyUserToUI(user) {
  const p = Store.data.profile;
  const av = avatarHTML(p);
  $('#sideAvatar').innerHTML = av;
  $('#profileBtn').innerHTML = av;
  $('#sideUserName').textContent = p.firstName ? `${p.firstName} ${p.lastName}` : user.email;
  $('#sideUserGoal').textContent = `${t('goalPrefix')}: ${goalLabel(p.goal)}`;
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
      if (w.name.toLowerCase().includes(q)) hits.push({ type: t('srWorkout'), label: w.name, sub: fmtDateShort(w.date), page: 'allenamento' });
      w.exercises.forEach(e => { if (e.name.toLowerCase().includes(q)) hits.push({ type: t('srExercise'), label: e.name, sub: `${w.name} · ${fmtDateShort(w.date)}`, page: 'allenamento' }); });
    });
    Store.data.meals.forEach(m => { if (m.name.toLowerCase().includes(q)) hits.push({ type: t('srFood'), label: m.name, sub: `${mealLabel(m.meal)} · ${fmtDateShort(m.date)}`, page: 'alimentazione' }); });

    const uniq = [];
    const seen = new Set();
    for (const h of hits) { const k = h.type + h.label; if (!seen.has(k)) { seen.add(k); uniq.push(h); } if (uniq.length >= 8) break; }

    box.innerHTML = uniq.length
      ? uniq.map(h => `<div class="sr-item" data-page="${h.page}"><span class="sr-type">${h.type}</span><span>${esc(h.label)}</span><span style="margin-left:auto;color:var(--text-faint);font-size:11px">${esc(h.sub)}</span></div>`).join('')
      : `<div class="sr-empty">${t('noResFor')} "${esc(q)}"</div>`;
    box.classList.add('open');
    $$('.sr-item', box).forEach(el => el.onclick = () => { box.classList.remove('open'); input.value = ''; Router.go(el.dataset.page); });
  };
  document.addEventListener('click', e => { if (!e.target.closest('.search-box')) box.classList.remove('open'); });
}

function initNotifications() {
  const panel = $('#notifPanel');
  const render = () => {
    const streak = Stats.streak();
    const mac = Stats.dayMacros(todayISO());
    const g = Store.data.goals;
    const items = [
      { icon: 'flame', text: t('nStreak', streak), time: t('today') },
      { icon: 'activity', text: t('nProtein', Math.round(mac.protein), g.protein), time: t('today') },
      { icon: 'ruler', text: t('nMeasure'), time: '2 g' },
      { icon: 'trophy', text: t('nPr'), time: '3 g' },
    ];
    panel.innerHTML = `<div class="notif-head">${t('notifs')}</div>` +
      items.map(n => `<div class="notif-item"><span style="color:var(--text-soft)">${ic(n.icon)}</span><span>${esc(n.text)}</span><span class="n-time">${n.time}</span></div>`).join('');
  };
  $('#notifBtn').onclick = e => { e.stopPropagation(); render(); panel.classList.toggle('open'); };
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
    if (!document.body.classList.contains('auth-locked')) Router.render();
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
const PAGE_NAMES = ['dashboard', 'misure', 'allenamento', 'alimentazione', 'riposo', 'salute', 'calendario', 'progressi'];
const State = { page: 'dashboard', foodDate: todayISO(), range: 0, calMonth: todayISO().slice(0, 7) };

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
    if (p === 'riposo') Pages.riposoMount();
    if (p === 'salute') Pages.saluteMount();
    if (p === 'calendario') Pages.calendarioMount();
    if (p === 'progressi') Pages.progressiMount();

    $$('.nav-item, .bnav-item').forEach(n => n.classList.toggle('active', n.dataset.page === p));
    hydrateCardTips();
  },
};

let CURRENT_USER = null;

function startApp(user) {
  CURRENT_USER = user;
  Store.init(user);
  // Account Google senza foto caricata → usa l'immagine di profilo Google
  if (user.provider === 'google' && !Store.data.profile.avatar && user.prefill?.avatar) {
    Store.data.profile.avatar = user.prefill.avatar;
    Store.save();
  }
  document.body.classList.remove('auth-locked');
  applyStaticLang();
  applyUserToUI(user);
  initProfileMenu(user);
  initGlobalSearch();
  initNotifications();

  const h = location.hash.slice(1);
  if (PAGE_NAMES.includes(h)) State.page = h;
  Router.render();

  if (!user.onboarded && !Store.data.onboarded) onboardingForm(user);

  // Fitbit: ritorno dal flusso OAuth (?code=...) oppure auto-sync giornaliera
  if (location.search.includes('code=')) {
    Fitbit.handleRedirect().then(ok => { if (ok) Fitbit.sync(true); });
  } else {
    Fitbit.autoSync();
  }
}

/* Avvio in modalità cloud: dati Firestore = fonte di verità */
async function cloudStart(fbU) {
  Cloud.uid = fbU.uid;
  const nameParts = (fbU.displayName || '').split(' ');
  const user = {
    id: fbU.uid, email: fbU.email || '', cloud: true,
    provider: fbU.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'local',
    onboarded: false,
    prefill: { firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' '), avatar: fbU.photoURL || null },
  };

  let cloudData = null;
  try { cloudData = await Cloud.load(fbU.uid); }
  catch { Toast.show(t('cloudErr'), 'error'); }

  Store.init(user); // cache locale o blank
  if (cloudData && cloudData.profile) {
    Store.data = cloudData; // il cloud vince: è lo storico condiviso tra dispositivi
    Store.migrate();
    localStorage.setItem(Store.key, JSON.stringify(Store.data));
  } else {
    Cloud.scheduleSave(); // primo dispositivo: spinge i dati locali sul cloud
  }

  startApp(user);
}

/* Mappa gli errori Firebase Auth su messaggi tradotti */
function fbErrMsg(e) {
  const c = e?.code || '';
  if (c.includes('email-already')) return t('errEmailTaken');
  if (c.includes('weak-password')) return t('errWeakPw');
  if (c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-credential') || c.includes('invalid-login')) return t('errBadCreds');
  return t('errGoogle');
}

document.addEventListener('DOMContentLoaded', () => {
  Lang.set(Lang.lang); // imposta <html lang>
  hydrateIcons();
  initTheme();
  initNav();

  if (Cloud.init()) {
    // Modalità cloud: lo stato di login lo decide Firebase
    let first = true;
    firebase.auth().onAuthStateChanged(fbU => {
      if (fbU) { cloudStart(fbU); }
      else if (first) {
        const local = Auth.current();
        if (local && local.id === 'demo') startApp(local); // la demo resta locale
        else renderAuthScreen();
      }
      first = false;
    });
  } else {
    // Modalità solo-locale (Firebase non configurato)
    const user = Auth.current();
    if (user) startApp(user);
    else renderAuthScreen();
  }
});
