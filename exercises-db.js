/* Fit with Science — database esercizi
   Nome + gruppo muscolare (chiavi coerenti con MUSCLE_GROUPS in app.js).
   Gli esercizi aggiunti dall'utente vengono salvati in
   Store.data.customExercises e uniti a questa lista. */

window.FWS_EXERCISES = [
  // ---- Petto ----
  { name: 'Panca piana bilanciere', group: 'Petto' },
  { name: 'Panca piana manubri', group: 'Petto' },
  { name: 'Panca inclinata bilanciere', group: 'Petto' },
  { name: 'Panca inclinata manubri', group: 'Petto' },
  { name: 'Panca declinata', group: 'Petto' },
  { name: 'Croci ai cavi', group: 'Petto' },
  { name: 'Croci con manubri', group: 'Petto' },
  { name: 'Chest press', group: 'Petto' },
  { name: 'Pectoral machine', group: 'Petto' },
  { name: 'Piegamenti (push-up)', group: 'Petto' },
  { name: 'Dip alle parallele', group: 'Petto' },

  // ---- Dorso ----
  { name: 'Trazioni alla sbarra', group: 'Dorso' },
  { name: 'Trazioni zavorrate', group: 'Dorso' },
  { name: 'Lat machine', group: 'Dorso' },
  { name: 'Lat machine presa stretta', group: 'Dorso' },
  { name: 'Rematore bilanciere', group: 'Dorso' },
  { name: 'Rematore manubrio', group: 'Dorso' },
  { name: 'Rematore ai cavi (seated row)', group: 'Dorso' },
  { name: 'T-bar row', group: 'Dorso' },
  { name: 'Pulldown braccia tese', group: 'Dorso' },
  { name: 'Pullover con manubrio', group: 'Dorso' },
  { name: 'Stacco da terra', group: 'Dorso' },
  { name: 'Iperestensioni (hyperextension)', group: 'Dorso' },

  // ---- Spalle ----
  { name: 'Lento avanti bilanciere (military press)', group: 'Spalle' },
  { name: 'Lento avanti manubri', group: 'Spalle' },
  { name: 'Arnold press', group: 'Spalle' },
  { name: 'Alzate laterali', group: 'Spalle' },
  { name: 'Alzate laterali ai cavi', group: 'Spalle' },
  { name: 'Alzate frontali', group: 'Spalle' },
  { name: 'Alzate posteriori (reverse fly)', group: 'Spalle' },
  { name: 'Face pull', group: 'Spalle' },
  { name: 'Shoulder press machine', group: 'Spalle' },
  { name: 'Tirate al mento', group: 'Spalle' },
  { name: 'Scrollate con manubri (shrug)', group: 'Spalle' },

  // ---- Bicipiti ----
  { name: 'Curl bilanciere', group: 'Bicipiti' },
  { name: 'Curl manubri', group: 'Bicipiti' },
  { name: 'Curl manubri alternato', group: 'Bicipiti' },
  { name: 'Hammer curl', group: 'Bicipiti' },
  { name: 'Curl panca Scott', group: 'Bicipiti' },
  { name: 'Curl ai cavi', group: 'Bicipiti' },
  { name: 'Curl concentrato', group: 'Bicipiti' },
  { name: 'Trazioni presa supina (chin-up)', group: 'Bicipiti' },

  // ---- Tricipiti ----
  { name: 'French press EZ', group: 'Tricipiti' },
  { name: 'Pushdown ai cavi', group: 'Tricipiti' },
  { name: 'Pushdown con corda', group: 'Tricipiti' },
  { name: 'Panca presa stretta', group: 'Tricipiti' },
  { name: 'Estensioni sopra la testa', group: 'Tricipiti' },
  { name: 'Kickback con manubrio', group: 'Tricipiti' },
  { name: 'Dip su panca', group: 'Tricipiti' },

  // ---- Gambe ----
  { name: 'Squat bilanciere', group: 'Gambe' },
  { name: 'Front squat', group: 'Gambe' },
  { name: 'Goblet squat', group: 'Gambe' },
  { name: 'Hack squat', group: 'Gambe' },
  { name: 'Leg press', group: 'Gambe' },
  { name: 'Affondi con manubri', group: 'Gambe' },
  { name: 'Affondi bulgari (bulgarian split squat)', group: 'Gambe' },
  { name: 'Leg extension', group: 'Gambe' },
  { name: 'Step-up su panca', group: 'Gambe' },

  // ---- Femorali ----
  { name: 'Romanian deadlift', group: 'Femorali' },
  { name: 'Stacco gambe tese', group: 'Femorali' },
  { name: 'Leg curl', group: 'Femorali' },
  { name: 'Leg curl in piedi', group: 'Femorali' },
  { name: 'Nordic ham curl', group: 'Femorali' },
  { name: 'Good morning', group: 'Femorali' },

  // ---- Glutei ----
  { name: 'Hip thrust', group: 'Glutei' },
  { name: 'Glute bridge', group: 'Glutei' },
  { name: 'Kickback ai cavi (glutei)', group: 'Glutei' },
  { name: 'Abductor machine', group: 'Glutei' },
  { name: 'Sumo deadlift', group: 'Glutei' },

  // ---- Polpacci ----
  { name: 'Calf raise in piedi', group: 'Polpacci' },
  { name: 'Calf raise seduto', group: 'Polpacci' },
  { name: 'Calf press alla leg press', group: 'Polpacci' },

  // ---- Core ----
  { name: 'Plank', group: 'Core' },
  { name: 'Side plank', group: 'Core' },
  { name: 'Crunch', group: 'Core' },
  { name: 'Crunch ai cavi', group: 'Core' },
  { name: 'Leg raise (sollevamento gambe)', group: 'Core' },
  { name: 'Russian twist', group: 'Core' },
  { name: 'Ab wheel rollout', group: 'Core' },
  { name: 'Mountain climber', group: 'Core' },
  { name: 'Dead bug', group: 'Core' },
  { name: 'Pallof press', group: 'Core' },

  // ---- Cardio ----
  { name: 'Tapis roulant (corsa)', group: 'Cardio' },
  { name: 'Camminata in salita', group: 'Cardio' },
  { name: 'Cyclette', group: 'Cardio' },
  { name: 'Vogatore', group: 'Cardio' },
  { name: 'Ellittica', group: 'Cardio' },
  { name: 'Salto della corda', group: 'Cardio' },
  { name: 'Burpees', group: 'Cardio' },
  { name: 'HIIT (intervalli)', group: 'Cardio' },
];
