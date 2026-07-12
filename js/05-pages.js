/* Fit with Science — 05-pages.js
   pagine dell’app
   Script classici in ordine: condividono lo scope lessicale globale. */
'use strict';

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
          <button class="btn btn-amber" data-quick="pasto">${ic('plus')} ${t('qMeal')}</button>
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
          <button class="btn btn-blue" id="btnAddW">${ic('plus')} ${t('newWork')}</button>
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

      <div class="card mt">
        <div class="card-head-row"><div><div class="card-title">${t('explTitle')}</div><div class="card-sub">${t('explSub')}</div></div>
          <input class="table-search" id="explSearch" placeholder="${t('searchMini')}"></div>
        <div class="gpill-row" id="explPills" style="margin:6px 0 10px">
          <button type="button" class="gpill active" data-g="">${t('all')}</button>
          ${MUSCLE_GROUPS.filter(g => g.k !== 'Altro').map(g => `<button type="button" class="gpill" data-g="${g.k}">${gLabel(g)}</button>`).join('')}
        </div>
        <div class="expl-list" id="explList"></div>
        <div class="dish-make-bar" id="explBar" style="display:none">
          <button type="button" class="btn btn-sm btn-blue" id="explMake">${ic('dumbbell')} ${t('newWork')} (<span id="explCount">0</span>)</button>
        </div>
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
    initExerciseExplorer();

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
    const gkeys = Object.keys(freq);
    if (gkeys.length) {
      Charts.make('chWRadar', {
        type: 'radar',
        data: {
          labels: gkeys.map(gDisp),
          datasets: [{ label: t('totalSets'), data: gkeys.map(l => freq[l]), borderColor: Charts.colors.purple, backgroundColor: Charts.colors.purple + '33', pointBackgroundColor: Charts.colors.purple, borderWidth: 2 }],
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
      return `<div class="card mt meal-card">
        <div class="card-head-row"><div><div class="card-title">${mealLabel(mn)}</div><div class="card-sub">${Math.round(kcal)} kcal</div></div>
          <div style="display:flex;gap:8px;align-items:center">
            ${foods.length ? `<button class="btn-icon" data-dishsel="${mn}" title="${t('createDish')}">${ic('dish')}</button>` : ''}
            <button class="btn btn-sm btn-amber" data-addfood="${mn}">${ic('plus')} ${t('foodItem')}</button>
          </div></div>
        ${foods.length ? foods.map(f => `<div class="list-row" data-mid="${f.id}"><div class="list-ico ico-emerald">${ic('utensils')}</div>
          <div class="list-main"><b>${esc(f.name)}</b><span>${esc(f.qty)} · P ${f.protein}g · C ${f.carbs}g · G ${f.fat}g</span></div>
          <div class="list-end"><b>${Math.round(f.kcal)} kcal</b></div>
          <div class="td-actions"><button class="btn-icon" data-editfood="${f.id}">${ic('pencil')}</button><button class="btn-icon danger" data-delfood="${f.id}">${ic('trash')}</button></div>
        </div>`).join('') : `<div class="empty-state" style="padding:18px"><p>${t('noFood')}</p></div>`}
        <div class="dish-make-bar"><button class="btn btn-sm btn-primary" data-dishmk="${mn}">${ic('dish')} ${t('createDish')} (<span class="msel-count">0</span>)</button></div>
      </div>`;
    }).join('');

    return `
    <div class="page">
      <div class="page-head">
        <div class="page-title"><h1>${t('navFood')}</h1><p>${t('foodSub')}</p></div>
        <div class="field" style="margin:0 0 0 auto"><input type="date" id="foodDate" value="${date}" max="${todayISO()}" style="height:40px"></div>
        <div class="actions" style="margin-left:0">
          <button class="btn" id="dishBtn">${ic('dish')} ${t('createDish')}</button>
          <button class="btn btn-amber" id="foodAdd">${ic('plus')} ${t('qMeal')}</button>
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

      <div class="mt" style="display:flex;justify-content:center">
        <button class="btn" id="foodShare" style="min-width:220px">${ic('share')} ${t('shareDay')}</button>
      </div>
    </div>`;
  },

  alimentazioneMount() {
    $('#foodDate').onchange = e => { State.foodDate = e.target.value; Router.render(); };
    $('#foodShare').onclick = () => sharePeriodDialog(State.foodDate, true);
    $('#dishBtn').onclick = () => dishForm();
    $('#foodAdd').onclick = () => foodForm();
    // Selezione alimenti nella card pasto → piatto precompilato
    $$('[data-dishsel]').forEach(b => b.onclick = () => {
      const card = b.closest('.meal-card');
      card.classList.toggle('sel-mode');
      if (!card.classList.contains('sel-mode')) { // uscita: pulisce la selezione
        $$('.list-row.msel-on', card).forEach(r => r.classList.remove('msel-on'));
        $('.msel-count', card).textContent = 0;
      }
    });
    $$('.meal-card .list-row[data-mid]').forEach(row => row.addEventListener('click', e => {
      const card = row.closest('.meal-card');
      if (!card.classList.contains('sel-mode')) return;
      if (e.target.closest('.td-actions')) return; // modifica/elimina restano cliccabili
      row.classList.toggle('msel-on');
      $('.msel-count', card).textContent = $$('.list-row.msel-on', card).length;
    }));
    $$('[data-dishmk]').forEach(b => b.onclick = () => {
      const card = b.closest('.meal-card');
      const ids = $$('.list-row.msel-on', card).map(r => r.dataset.mid);
      if (!ids.length) { Toast.show(t('minOneIng'), 'error'); return; }
      dishForm(mealItemsFromIds(ids));
    });
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

    // Giorni coperti dal range; con "Tutto" si parte dal primo pasto registrato
    let span;
    if (State.range === 0) {
      const dates = Store.data.meals.map(m => m.date);
      const first = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : daysAgo(29);
      span = Math.min(365, Math.max(7, Math.round((new Date(todayISO() + 'T00:00') - new Date(first + 'T00:00')) / 86400000) + 1));
    } else span = State.range;
    const days = [...Array(span)].map((_, i) => daysAgo(span - 1 - i));

    // Oltre 60 giorni i punti giornalieri sono illeggibili → media per settimana
    let kLabels, kData;
    if (days.length > 60) {
      const weeks = {};
      days.forEach(d => { const wk = weekDays(d)[0]; (weeks[wk] = weeks[wk] || []).push(Stats.dayMacros(d).kcal); });
      const wkeys = Object.keys(weeks).sort();
      kLabels = wkeys.map(fmtDateShort);
      kData = wkeys.map(k => { const v = weeks[k].filter(x => x > 0); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; });
    } else {
      kLabels = days.map(fmtDateShort);
      kData = days.map(d => Math.round(Stats.dayMacros(d).kcal) || null);
    }
    Charts.make('pgKcal', {
      type: 'line',
      data: { labels: kLabels, datasets: [{ label: 'kcal', data: kData, borderColor: Charts.colors.amber, backgroundColor: Charts.gradient('pgKcal', Charts.colors.amber), fill: true, tension: .3, pointRadius: 2, borderWidth: 2, spanGaps: true }] },
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
