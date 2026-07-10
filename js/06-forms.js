/* Fit with Science — 06-forms.js
   form, condivisione, esploratore esercizi
   Script classici in ordine: condividono lo scope lessicale globale. */
'use strict';

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
/* Traduzione a display di una CHIAVE gruppo (lo storage resta canonico IT) */
const gDisp = k => {
  if (Lang.lang !== 'en') return k;
  const g = MUSCLE_GROUPS.find(x => x.k === k);
  return g ? g.en : k;
};

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


/* =====================================================================
   ESPLORATORE ESERCIZI — sezione inline nella pagina Allenamento:
   ricerca + filtro per gruppo muscolare + descrizioni brevi;
   il ＋ apre un nuovo allenamento con l'esercizio già inserito.
   ===================================================================== */
function initExerciseExplorer() {
  const listEl = $('#explList');
  if (!listEl) return;
  let group = null;
  const selected = new Set(); // nomi esercizio: sopravvive a filtri e ricerche

  const syncBar = () => {
    $('#explCount').textContent = selected.size;
    $('#explBar').style.display = selected.size ? 'flex' : 'none';
  };

  const drawList = () => {
    const q = $('#explSearch').value.trim().toLowerCase();
    const items = allExercises().filter(x =>
      (!group || x.group === group) && (!q || x.name.toLowerCase().includes(q)));
    listEl.innerHTML = items.length ? items.map(x => `
      <div class="list-row ${selected.has(x.name) ? 'msel-on' : ''}">
        <div class="list-main" style="white-space:normal">
          <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="display:inline">${esc(x.name)}</b><span class="badge badge-blue">${esc(gDisp(x.group))}</span></span>
          ${x.d ? `<span style="display:block;font-size:12px;color:var(--text-soft);margin-top:2px">${esc(x.d[Lang.lang] || x.d.it)}</span>` : ''}
        </div>
        <button type="button" class="btn-icon" data-use="${esc(x.name)}" title="${t('useInWork')}" style="margin-left:auto;flex-shrink:0${selected.has(x.name) ? ';color:var(--emerald);border-color:var(--emerald)' : ''}">${ic(selected.has(x.name) ? 'check' : 'plus')}</button>
      </div>`).join('') : emptyState('dumbbell', t('noResults'), '');

    // ＋ = seleziona/deseleziona (evidenziato); l'allenamento si crea alla fine
    $$('[data-use]', listEl).forEach(b => b.onclick = () => {
      const name = b.dataset.use;
      if (selected.has(name)) selected.delete(name); else selected.add(name);
      syncBar();
      drawList();
    });
  };

  $$('#explPills .gpill').forEach(p => p.onclick = () => {
    group = p.dataset.g || null;
    $$('#explPills .gpill').forEach(x => x.classList.toggle('active', x === p));
    drawList();
  });
  $('#explSearch').oninput = drawList;

  $('#explMake').onclick = () => {
    if (!selected.size) return;
    const exercises = [...selected]
      .map(name => allExercises().find(e => e.name === name))
      .filter(Boolean)
      .map(x => ({ name: x.name, group: x.group }));
    selected.clear();
    syncBar();
    drawList();
    workoutForm(null, { name: '', group: '', duration: 60, notes: '', exercises });
  };

  syncBar();
  drawList();
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


/* =====================================================================
   CREA PIATTO — combina più alimenti con grammature; il risultato viene
   salvato in customFoods con i valori per 100 g (usabile come alimento)
   ===================================================================== */
/* Converte voci del diario in ingredienti {fd, g} per dishForm.
   Se l'alimento non è nel DB, i valori/100g si deducono dalla voce stessa. */
function mealItemsFromIds(ids) {
  return ids.map(id => {
    const m = Store.data.meals.find(x => x.id === id);
    if (!m) return null;
    const gm = /\((\d+(?:[.,]\d+)?)\s*g\)/.exec(m.qty || '');
    const g = gm ? parseFloat(gm[1].replace(',', '.')) : (parseFloat(m.qty) || 0);
    let fd = findFood(m.name);
    if (!fd) {
      const base = g > 0 ? g : 100;
      fd = {
        name: m.name,
        kcal: Math.round(m.kcal / base * 100),
        protein: round1(m.protein / base * 100),
        carbs: round1(m.carbs / base * 100),
        fat: round1(m.fat / base * 100),
      };
    }
    return { fd, g: g > 0 ? g : 100 };
  }).filter(Boolean);
}

function dishForm(prefill = null) {
  const rowFood = new Map(); // riga → alimento selezionato (per 100 g)

  const rowHTML = () => `<div class="ex-block dish-row">
    <div class="ex-row-top">
      <div class="field fs-wrap"><input class="dr-name" placeholder="${t('ingPh')}" autocomplete="off">
        <div class="fs-list dr-list"></div></div>
      <div class="field" style="max-width:110px"><input type="number" min="0" class="dr-grams" placeholder="g"></div>
      <button type="button" class="btn-icon danger dr-del" title="${t('del')}">${ic('trash')}</button>
    </div>
  </div>`;

  Modal.open({
    title: t('createDish'), wide: true,
    body: `
      <div class="field"><label>${t('dishName')} *</label><input id="dishName" data-req placeholder="${t('phFood')}"><div class="err-msg">${t('required')}</div></div>
      <div style="margin:16px 0 10px;font-weight:700;font-size:14px">${t('ingredients')}</div>
      <div id="dishRows">${(prefill?.length ? prefill : [null]).map(() => rowHTML()).join('')}</div>
      <button type="button" class="btn btn-sm" id="dishAdd">${ic('plus')} ${t('addIngredient')}</button>
      <div id="dishTotals" style="margin-top:16px;font-size:13px"></div>`,
    footer: `<button class="btn" onclick="Modal.close()">${t('cancel')}</button><button class="btn btn-primary" id="dishSave">${t('save')}</button>`,
    onMount(root) {
      const totalsEl = $('#dishTotals', root);

      const collect = () => {
        const items = [];
        $$('.dish-row', root).forEach(row => {
          const fd = rowFood.get(row);
          const g = Number($('.dr-grams', row).value);
          if (fd && g > 0) items.push({ fd, g });
        });
        return items;
      };

      const recalc = () => {
        const items = collect();
        if (!items.length) { totalsEl.innerHTML = ''; return; }
        const tot = items.reduce((a, x) => ({
          g: a.g + x.g,
          kcal: a.kcal + x.fd.kcal * x.g / 100,
          p: a.p + x.fd.protein * x.g / 100,
          c: a.c + x.fd.carbs * x.g / 100,
          f: a.f + x.fd.fat * x.g / 100,
        }), { g: 0, kcal: 0, p: 0, c: 0, f: 0 });
        const per = k => round1(k / tot.g * 100);
        totalsEl.innerHTML = `
          <b>${t('dishTotal')}:</b> ${Math.round(tot.g)} g · ${Math.round(tot.kcal)} kcal ·
          P ${round1(tot.p)}g · C ${round1(tot.c)}g · G ${round1(tot.f)}g<br>
          <span style="color:var(--text-soft)"><b>${t('per100Vals')}:</b>
          ${per(tot.kcal)} kcal · P ${per(tot.p)}g · C ${per(tot.c)}g · G ${per(tot.f)}g</span>`;
      };

      const bindRow = row => {
        const inp = $('.dr-name', row), list = $('.dr-list', row), grams = $('.dr-grams', row);
        inp.oninput = () => {
          rowFood.delete(row); recalc();
          const q = inp.value.trim().toLowerCase();
          if (q.length < 2) { list.classList.remove('open'); return; }
          const matches = allFoods().filter(fd => fd.name.toLowerCase().includes(q)).slice(0, 8);
          if (!matches.length) { list.classList.remove('open'); return; }
          list.innerHTML = matches.map((fd, i) =>
            `<button type="button" class="fs-item" data-i="${i}"><span>${esc(fd.name)}</span><small>${fd.kcal} kcal ${t('per100')}</small></button>`).join('');
          list.classList.add('open');
          $$('.fs-item', list).forEach(b => b.onclick = () => {
            const fd = matches[Number(b.dataset.i)];
            rowFood.set(row, fd);
            inp.value = fd.name;
            list.classList.remove('open');
            if (!grams.value) grams.value = Store.data.foodPrefs[fd.name.toLowerCase()] || 100;
            recalc();
          });
        };
        inp.onblur = () => setTimeout(() => list.classList.remove('open'), 200);
        grams.oninput = recalc;
        $('.dr-del', row).onclick = () => {
          if ($$('.dish-row', root).length === 1) return;
          rowFood.delete(row);
          row.remove();
          recalc();
        };
      };

      $$('.dish-row', root).forEach(bindRow);
      if (prefill?.length) {
        $$('.dish-row', root).forEach((row, i) => {
          const it = prefill[i];
          if (!it) return;
          rowFood.set(row, it.fd);
          $('.dr-name', row).value = it.fd.name;
          $('.dr-grams', row).value = it.g;
        });
        recalc();
      }
      $('#dishAdd', root).onclick = () => {
        $('#dishRows', root).insertAdjacentHTML('beforeend', rowHTML());
        bindRow($('#dishRows', root).lastElementChild);
      };

      $('#dishSave', root).onclick = () => {
        if (!validateForm(root)) { Toast.show(t('reqFields'), 'error'); return; }
        const items = collect();
        if (!items.length) { Toast.show(t('minOneIng'), 'error'); return; }
        const name = $('#dishName', root).value.trim();
        const totG = items.reduce((a, x) => a + x.g, 0);
        const sum = f => items.reduce((a, x) => a + x.fd[f] * x.g / 100, 0);
        const entry = {
          name,
          kcal: Math.round(sum('kcal') / totG * 100),
          protein: round1(sum('protein') / totG * 100),
          carbs: round1(sum('carbs') / totG * 100),
          fat: round1(sum('fat') / totG * 100),
          isDish: true,
          recipe: items.map(x => ({ name: x.fd.name, g: x.g })),
        };
        // upsert: se esiste già un alimento con lo stesso nome lo aggiorna
        const i = Store.data.customFoods.findIndex(fd => fd.name.toLowerCase() === name.toLowerCase());
        if (i >= 0) Store.data.customFoods[i] = entry; else Store.data.customFoods.push(entry);
        Store.data.foodPrefs[name.toLowerCase()] = totG; // grammatura tipica = il piatto intero
        Store.save();
        Modal.close();
        Toast.show(t('dishSaved', name));
      };
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
