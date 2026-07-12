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

  /* Merge di due copie dei dati: le aggiunte di entrambe sopravvivono.
     'remote' è la copia più recente → vince sugli elementi in conflitto
     (stesso id/chiave) e sugli scalari (profilo, obiettivi). */
  merge(local, remote) {
    const byKey = (a = [], b = [], key) => {
      const m = new Map(a.map(x => [x[key], x]));
      b.forEach(x => m.set(x[key], x)); // il remoto (più recente) vince sui condivisi
      return [...m.values()];
    };
    return {
      ...remote,
      measurements: byKey(local.measurements, remote.measurements, 'id'),
      workouts: byKey(local.workouts, remote.workouts, 'id'),
      templates: byKey(local.templates, remote.templates, 'id'),
      meals: byKey(local.meals, remote.meals, 'id'),
      customFoods: byKey(local.customFoods, remote.customFoods, 'name'),
      customExercises: byKey(local.customExercises, remote.customExercises, 'name'),
      water: { ...local.water, ...remote.water },
      wellness: { ...local.wellness, ...remote.wellness },
      foodPrefs: { ...local.foodPrefs, ...remote.foodPrefs },
      updatedAt: Date.now(),
    };
  },

  /* Adotta dati remoti più recenti fondendoli con quelli locali */
  adoptRemote(remote, notify = true) {
    Store.data = this.merge(Store.data, remote);
    Store.migrate();
    localStorage.setItem(Store.key, JSON.stringify(Store.data));
    if (notify && Date.now() - (this._toastAt || 0) > 30000) { // niente spam di toast
      this._toastAt = Date.now();
      Toast.show(t('syncNewer'), 'info');
    }
    if (typeof Router !== 'undefined' && !document.body.classList.contains('auth-locked')) Router.render();
  },

  async load(uid) {
    const snap = await firebase.firestore().collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
  },

  /* Scrittura debounced in transazione: se un altro dispositivo ha scritto
     dati più recenti (updatedAt maggiore), quelli vincono e vengono adottati
     localmente invece di sovrascriverli. */
  scheduleSave() {
    if (!this.enabled || !this.uid) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      const ref = firebase.firestore().collection('users').doc(this.uid);
      try {
        let merged = null;
        await firebase.firestore().runTransaction(async tx => {
          const snap = await tx.get(ref);
          const remote = snap.exists ? snap.data() : null;
          if (remote && (remote.updatedAt || 0) > (Store.data.updatedAt || 0)) {
            // qualcun altro ha scritto: fondi e scrivi l'unione — nessuna aggiunta va persa
            merged = this.merge(Store.data, remote);
            tx.set(ref, JSON.parse(JSON.stringify(merged)));
          } else {
            tx.set(ref, JSON.parse(JSON.stringify(Store.data)));
          }
        });
        if (merged) {
          Store.data = merged;
          Store.migrate();
          localStorage.setItem(Store.key, JSON.stringify(Store.data));
          if (typeof Router !== 'undefined' && !document.body.classList.contains('auth-locked')) Router.render();
        }
      } catch (e) {
        Toast.show(t('cloudErr'), 'error');
      }
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
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  dish: '<path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7"/><path d="m13 12 4-4"/><path d="M10.9 7.25A4 4 0 0 0 4 10c0 .73.2 1.41.54 2"/>',
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
