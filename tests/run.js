/* Fit with Science — test suite
   Esecuzione: node tests/run.js
   Carica tutti gli script dell'app in un contesto Node con stub minimi del
   browser, poi verifica la logica pura (date, parser, statistiche, wellness).
   Serve anche da smoke test dell'ordine di caricamento dei moduli. */

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---------- stub browser minimi (solo ciò che serve al load) ---------- */
global.window = global;
global.localStorage = { _m: {}, getItem: k => global.localStorage._m[k] ?? null, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, documentElement: { dataset: {}, lang: '' } };
// navigator esiste già in Node 21+ (solo getter): non serve stubbarlo
global.location = { hash: '', search: '', pathname: '/', origin: 'http://localhost' };
global.Chart = function () {}; // Chart.js non serve nei test

const ROOT = path.join(__dirname, '..');
const files = [
  'foods-db.js', 'exercises-db.js', 'i18n/it.js', 'i18n/en.js',
  'js/01-core.js', 'js/02-data.js', 'js/03-ui.js', 'js/04-wellness.js',
  'js/05-pages.js', 'js/06-forms.js', 'js/07-integrations.js', 'js/08-main.js',
];
for (const f of files) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
}

/* ---------- micro framework ---------- */
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; }
  else { fail++; console.error(`✗ ${name}\n    got:  ${g}\n    want: ${w}`); }
};
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`✗ ${name}`); } };

/* ---------- dati finti ---------- */
Store.data = Store.blank();
Store.key = 'fws-test';
Store.save = () => {}; // niente persistenza nei test

/* ---------- date ---------- */
eq('weekDays: mercoledì → lun..dom', weekDays('2026-07-08')[0], '2026-07-06');
eq('weekDays: domenica resta nella sua settimana', weekDays('2026-07-12')[0], '2026-07-06');
eq('weekDays: lunedì è il primo giorno', weekDays('2026-07-06')[0], '2026-07-06');
eq('weekDays: 7 giorni', weekDays('2026-07-08').length, 7);
eq('shiftMonth avanti', shiftMonth('2026-12', 1), '2027-01');
eq('shiftMonth indietro', shiftMonth('2026-01', -1), '2025-12');
eq('isoOf: niente shift di fuso', isoOf(new Date(2026, 6, 8)), '2026-07-08');

/* ---------- Stats: volume, PR, macro ---------- */
const w1 = {
  id: 'w1', date: '2026-07-07', name: 'Test', group: 'Upper Body', duration: 60, notes: '',
  exercises: [
    { id: 'e1', name: 'Panca piana bilanciere', group: 'Petto', mode: 'reps', sets: 4, reps: 6, weight: 80, rest: 120, rpe: 8, notes: '' },
    { id: 'e2', name: 'Plank', group: 'Core', mode: 'time', sets: 3, reps: 60, weight: 0, rest: 60, rpe: 7, notes: '' },
  ],
};
Store.data.workouts = [w1];
eq('workoutVolume: reps=s×r×kg, time=s×kg', Stats.workoutVolume(w1), 4 * 6 * 80);
const prs = Stats.personalRecords();
eq('personalRecords: esclude gli esercizi a durata', prs.length, 1);
eq('personalRecords: 1RM Epley', Math.round(prs[0].orm), Math.round(80 * (1 + 6 / 30)));

Store.data.meals = [
  { id: 'm1', date: '2026-07-08', meal: 'Colazione', name: 'A', qty: '100 g', kcal: 300, protein: 20, carbs: 30, fat: 10 },
  { id: 'm2', date: '2026-07-08', meal: 'Pranzo', name: 'B', qty: '50 g', kcal: 200, protein: 10, carbs: 25, fat: 5 },
];
eq('dayMacros somma i pasti', Stats.dayMacros('2026-07-08').kcal, 500);

/* ---------- Store.migrate: dx/sx → media, torace via ---------- */
Store.data.measurements = [{ id: 'x', date: '2026-01-01', weight: 80, armR: 36, armL: 34, thighR: 60, torso: 98 }];
Store.migrate();
eq('migrate: media dx/sx', Store.data.measurements[0].arm, 35);
eq('migrate: singolo lato → quel valore', Store.data.measurements[0].thigh, 60);
ok('migrate: torace eliminato', !('torso' in Store.data.measurements[0]));
ok('migrate: campi laterali eliminati', !('armR' in Store.data.measurements[0]));

/* ---------- Wellness: readiness, zone, fitness age ---------- */
Store.data.profile = { firstName: 'T', lastName: 'T', age: 34, height: 185, sex: 'm', goal: 'recomp' };
Store.data.measurements = [{ id: 'm', date: daysAgo(1), weight: 85, height: 185 }];
Store.data.wellness = {};
for (let i = 10; i >= 1; i--) Store.data.wellness[daysAgo(i)] = { rhr: 56, hrv: 58, sleepMin: 450, deepMin: 90, remMin: 100 };
Store.data.wellness[daysAgo(0)] = { rhr: 52, hrv: 66, sleepMin: 465, deepMin: 95, remMin: 115 };

const r = Wellness.readiness(daysAgo(0));
ok('readiness in [0,100]', r >= 0 && r <= 100);
ok('readiness alta con RHR giù/HRV su/sonno pieno', r >= 75);
const parts = Wellness.readinessParts(daysAgo(0));
eq('readinessParts: 4 componenti', Object.keys(parts).length, 4);

const z = Wellness.zones();
eq('zones: HRmax Tanaka 208−0.7×età', z.hrmax, Math.round(208 - 0.7 * 34));
eq('zones: Z1 parte al 50% della riserva', z.bands[0].from, Math.round(52 + (z.hrmax - 52) * 0.5));
eq('zones: 5 bande', z.bands.length, 5);

const fa = Wellness.fitnessAge();
ok('fitnessAge presente con profilo completo', fa && typeof fa.fitnessAge === 'number');
ok('fitnessAge ≥ 18', fa.fitnessAge >= 18);
ok('estVo2max plausibile (20-70)', fa.vo2 > 20 && fa.vo2 < 70);

/* ---------- parser CSV benessere (Zepp e generico) ---------- */
const zepp = parseWellnessCSV('date,deepSleepTime,shallowSleepTime,REMTime,restingHeartRate,hrv_rmssd\n2026-07-07,95,240,110,54,62.5');
eq('CSV Zepp: sonno = somma fasi', zepp['2026-07-07'].sleepMin, 445);
eq('CSV Zepp: rhr', zepp['2026-07-07'].rhr, 54);
const gen = parseWellnessCSV('day;total sleep (min);deep;rem;rhr\n2026-07-08;450;85;100;53');
eq('CSV generico: durata esplicita vince', gen['2026-07-08'].sleepMin, 450);
eq('CSV: separatore ; supportato', gen['2026-07-08'].deepMin, 85);
eq('CSV senza colonna data → vuoto', Object.keys(parseWellnessCSV('a,b\n1,2')).length, 0);

/* ---------- parser Google Fit ---------- */
const gfJson = JSON.stringify({ 'Data Points': [{ fitValue: [{ value: { fpVal: 81.4 } }], startTimeNanos: '1750000000000000000' }] });
eq('GFit JSON: un punto peso', parseGoogleFit(gfJson, 'raw_com.google.weight_x.json').length, 1);
const gfCsv = parseGoogleFit('Date,Average weight (kg)\n2026-06-01,82.1\n2026-06-02,', 'daily.csv');
eq('GFit CSV: righe vuote scartate', gfCsv.length, 1);

/* ---------- mealItemsFromIds ---------- */
Store.data.meals = [
  { id: 'q1', name: 'Mandorle', qty: '10 pz (12 g)', kcal: 69, protein: 2.5, carbs: 2.6, fat: 6 },
  { id: 'q2', name: 'Sconosciuto', qty: '80 g', kcal: 200, protein: 10, carbs: 20, fat: 8 },
];
const items = mealItemsFromIds(['q1', 'q2']);
eq('mealItems: grammi da "(12 g)"', items[0].g, 12);
eq('mealItems: DB usato se presente', items[0].fd.kcal, 579);
eq('mealItems: per100 dedotti se assente', items[1].fd.kcal, 250);

/* ---------- condivisione ---------- */
Lang.lang = 'it';
const shareTxt = workoutShareText(w1);
ok('share: contiene volume corretto', shareTxt.includes('1.920') || shareTxt.includes('1920'));
ok('share: durata in secondi per il plank', shareTxt.includes('3×60s'));

/* ---------- Cloud.merge: le aggiunte di entrambi i device sopravvivono ---------- */
{
  const local = { ...Store.blank(), meals: [{ id: 'd1', name: 'Desktop' }], water: { '2026-07-11': 5 }, updatedAt: 100 };
  const remote = { ...Store.blank(), meals: [{ id: 'p1', name: 'Phone' }], water: { '2026-07-12': 3 }, profile: { firstName: 'R' }, updatedAt: 200 };
  const m = Cloud.merge(local, remote);
  eq('merge: union dei pasti per id', m.meals.map(x => x.id).sort(), ['d1', 'p1']);
  eq('merge: union acqua per data', Object.keys(m.water).sort(), ['2026-07-11', '2026-07-12']);
  eq('merge: scalari → vince il più recente', m.profile.firstName, 'R');
  const conflict = Cloud.merge(
    { ...Store.blank(), meals: [{ id: 'x', name: 'vecchio' }] },
    { ...Store.blank(), meals: [{ id: 'x', name: 'nuovo' }] });
  eq('merge: stesso id → vince il remoto (più recente)', conflict.meals[0].name, 'nuovo');
  ok('merge: updatedAt rigenerato', m.updatedAt > 200);
}

/* ---------- esito ---------- */
console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
