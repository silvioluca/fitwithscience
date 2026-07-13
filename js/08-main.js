/* Fit with Science — 08-main.js
   impostazioni, onboarding, auth screen, router, boot
   Script classici in ordine: condividono lo scope lessicale globale. */
'use strict';

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
        <div class="field"><label>${t('sex')}</label>
          <select id="obSex">
            <option value="m">${t('sexM')}</option>
            <option value="f">${t('sexF')}</option>
            <option value="na" selected>${t('sexNA')}</option>
          </select></div>
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
        p.sex = $('#obSex', root).value; // usato da zone cardiache e fitness age
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

  // Notifiche derivate dai dati reali, non testo statico
  const build = () => {
    const items = [];
    const today = todayISO();

    const lastM = Stats.latestM();
    if (!lastM) items.push({ icon: 'ruler', text: t('nMeasNever'), warn: true });
    else {
      const dd = Math.round((new Date(today + 'T00:00') - new Date(lastM.date + 'T00:00')) / 86400000);
      if (dd >= 7) items.push({ icon: 'ruler', text: t('nMeasOld', dd), warn: true });
    }

    const r = Wellness.readiness(today);
    if (r != null && r < 50) items.push({ icon: 'gauge', text: t('nLowReady', r), warn: true });

    const weekAgo = daysAgo(7);
    Stats.personalRecords().filter(p => p.date >= weekAgo).slice(0, 2)
      .forEach(p => items.push({ icon: 'trophy', text: t('nNewPr', p.name, Math.round(p.orm)) }));

    const y = daysAgo(1);
    const mac = Stats.dayMacros(y);
    if (Stats.mealsFor(y).length && mac.protein < Store.data.goals.protein * 0.6)
      items.push({ icon: 'activity', text: t('nLowProt', Math.round(mac.protein), Store.data.goals.protein), warn: true });

    const st = Stats.streak();
    if (st >= 3) items.push({ icon: 'flame', text: t('nStreak', st) });

    return items.slice(0, 5);
  };

  const render = () => {
    const items = build();
    const dot = $('#notifBtn .notif-dot');
    if (dot) dot.style.display = items.some(i => i.warn) ? '' : 'none';
    panel.innerHTML = `<div class="notif-head">${t('notifs')}</div>` +
      (items.length
        ? items.map(n => `<div class="notif-item"><span style="color:var(--text-soft)">${ic(n.icon)}</span><span>${esc(n.text)}</span></div>`).join('')
        : `<div class="notif-item"><span style="color:var(--text-soft)">${ic('check')}</span><span>${t('nNothing')}</span></div>`);
  };

  $('#notifBtn').onclick = e => { e.stopPropagation(); render(); panel.classList.toggle('open'); };
  document.addEventListener('click', e => { if (!e.target.closest('#notifPanel') && !e.target.closest('#notifBtn')) panel.classList.remove('open'); });
  render(); // aggiorna subito il pallino
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

/* Su mobile le azioni della pagina flottano in basso quando l'header
   esce dallo schermo (chiamata su scroll/resize e dopo ogni render). */
function floatingActionsTick() {
  const head = $('#content .page-head');
  const actions = head && $('.actions', head);
  if (!actions) return;
  // i filtri (chip, navigazione calendario) restano nell'header; solo le vere azioni flottano
  if (actions.classList.contains('chip-row') || actions.classList.contains('cal-head')) { actions.classList.remove('floating'); return; }
  const mobile = window.innerWidth <= 768;
  const out = head.getBoundingClientRect().bottom < 64; // sotto la topbar
  actions.classList.toggle('floating', mobile && out);
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
const State = { page: 'dashboard', foodDate: todayISO(), range: 0, calMonth: todayISO().slice(0, 7), calView: 'month' };

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
    floatingActionsTick();
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

  window.addEventListener('scroll', floatingActionsTick, { passive: true });
  window.addEventListener('resize', floatingActionsTick);

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
    // fusione: le aggiunte di entrambe le copie sopravvivono
    Store.data = Cloud.merge(Store.data, cloudData);
    Store.migrate();
    localStorage.setItem(Store.key, JSON.stringify(Store.data));
  }
  Cloud.scheduleSave(); // spinge lo stato fuso (o iniziale) sul cloud

  startApp(user);

  // Realtime: le scritture degli altri dispositivi arrivano subito,
  // anche a pagina aperta (era il motivo per cui il desktop non le vedeva)
  firebase.firestore().collection('users').doc(fbU.uid).onSnapshot(snap => {
    if (!snap.exists || snap.metadata.hasPendingWrites) return; // ignora l'eco locale
    const remote = snap.data();
    if ((remote.updatedAt || 0) <= (Store.data.updatedAt || 0)) return;
    Cloud.adoptRemote(remote);
  });
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
