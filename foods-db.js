/* Fit with Science — database alimenti
   Valori nutrizionali PER 100 g (kcal, proteine g, carboidrati g, grassi g).
   Gli alimenti aggiunti dall'utente (manualmente o da Open Food Facts)
   vengono salvati in Store.data.customFoods e uniti a questa lista. */

window.FWS_FOODS = [
  // ---- Cereali e derivati ----
  { name: 'Avena (fiocchi)', kcal: 380, protein: 13.5, carbs: 66.3, fat: 7.0 },
  { name: 'Riso basmati', kcal: 356, protein: 7.5, carbs: 78.0, fat: 0.9 },
  { name: 'Riso integrale', kcal: 362, protein: 7.5, carbs: 76.2, fat: 2.7 },
  { name: 'Pasta di semola', kcal: 353, protein: 12.5, carbs: 71.0, fat: 1.5 },
  { name: 'Pasta integrale', kcal: 348, protein: 13.4, carbs: 66.2, fat: 2.5 },
  { name: 'Pane integrale', kcal: 247, protein: 8.5, carbs: 44.0, fat: 3.5 },
  { name: 'Pane bianco', kcal: 265, protein: 9.0, carbs: 49.0, fat: 3.2 },
  { name: 'Farro', kcal: 340, protein: 15.1, carbs: 67.1, fat: 2.5 },
  { name: 'Quinoa', kcal: 368, protein: 14.1, carbs: 64.2, fat: 6.1 },
  { name: 'Couscous', kcal: 376, protein: 12.8, carbs: 77.4, fat: 0.6 },
  { name: 'Gallette di riso', kcal: 387, protein: 8.1, carbs: 81.5, fat: 2.8 },
  { name: 'Patate', kcal: 77, protein: 2.0, carbs: 17.5, fat: 0.1 },
  { name: 'Patate dolci', kcal: 86, protein: 1.6, carbs: 20.1, fat: 0.1 },

  // ---- Carne ----
  { name: 'Petto di pollo', kcal: 110, protein: 23.0, carbs: 0, fat: 1.8 },
  { name: 'Petto di tacchino', kcal: 107, protein: 24.0, carbs: 0, fat: 1.0 },
  { name: 'Manzo magro', kcal: 129, protein: 21.8, carbs: 0, fat: 4.6 },
  { name: 'Macinato di manzo 5%', kcal: 137, protein: 21.0, carbs: 0, fat: 5.0 },
  { name: 'Lonza di maiale', kcal: 146, protein: 21.1, carbs: 0, fat: 7.0 },
  { name: 'Bresaola', kcal: 151, protein: 32.0, carbs: 0.4, fat: 2.0 },
  { name: 'Prosciutto crudo (sgrassato)', kcal: 145, protein: 27.0, carbs: 0, fat: 4.0 },
  { name: 'Prosciutto cotto', kcal: 132, protein: 19.8, carbs: 0.9, fat: 5.5 },

  // ---- Pesce ----
  { name: 'Salmone', kcal: 208, protein: 20.5, carbs: 0, fat: 13.5 },
  { name: 'Tonno al naturale', kcal: 103, protein: 25.0, carbs: 0, fat: 0.6 },
  { name: 'Tonno fresco', kcal: 144, protein: 23.3, carbs: 0, fat: 4.9 },
  { name: 'Merluzzo', kcal: 82, protein: 17.8, carbs: 0, fat: 0.7 },
  { name: 'Orata', kcal: 100, protein: 19.8, carbs: 0, fat: 2.3 },
  { name: 'Gamberi', kcal: 85, protein: 20.1, carbs: 0, fat: 0.5 },
  { name: 'Sgombro', kcal: 205, protein: 18.6, carbs: 0, fat: 13.9 },

  // ---- Uova e latticini ----
  { name: 'Uovo intero', kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
  { name: 'Albume', kcal: 52, protein: 10.9, carbs: 0.7, fat: 0.2 },
  { name: 'Latte parz. scremato', kcal: 46, protein: 3.4, carbs: 4.8, fat: 1.5 },
  { name: 'Latte intero', kcal: 62, protein: 3.2, carbs: 4.7, fat: 3.6 },
  { name: 'Yogurt greco 0%', kcal: 57, protein: 10.2, carbs: 3.5, fat: 0.2 },
  { name: 'Yogurt greco 5%', kcal: 97, protein: 9.0, carbs: 3.0, fat: 5.0 },
  { name: 'Skyr', kcal: 63, protein: 11.0, carbs: 4.0, fat: 0.2 },
  { name: 'Ricotta vaccina', kcal: 146, protein: 8.8, carbs: 3.5, fat: 10.9 },
  { name: 'Fiocchi di latte', kcal: 99, protein: 11.1, carbs: 3.4, fat: 4.5 },
  { name: 'Parmigiano Reggiano', kcal: 392, protein: 33.0, carbs: 0, fat: 28.4 },
  { name: 'Mozzarella', kcal: 253, protein: 18.7, carbs: 0.7, fat: 19.5 },
  { name: 'Mozzarella light', kcal: 163, protein: 20.0, carbs: 1.0, fat: 9.0 },

  // ---- Legumi ----
  { name: 'Ceci (cotti)', kcal: 120, protein: 7.0, carbs: 18.9, fat: 2.4 },
  { name: 'Lenticchie (cotte)', kcal: 92, protein: 6.9, carbs: 16.3, fat: 0.4 },
  { name: 'Fagioli borlotti (cotti)', kcal: 91, protein: 7.3, carbs: 16.4, fat: 0.4 },
  { name: 'Piselli', kcal: 81, protein: 5.4, carbs: 14.4, fat: 0.4 },
  { name: 'Edamame', kcal: 121, protein: 11.9, carbs: 8.9, fat: 5.2 },
  { name: 'Tofu', kcal: 76, protein: 8.1, carbs: 1.9, fat: 4.8 },

  // ---- Verdura ----
  { name: 'Zucchine', kcal: 17, protein: 1.3, carbs: 3.1, fat: 0.3 },
  { name: 'Broccoli', kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
  { name: 'Spinaci', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: 'Pomodori', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: 'Insalata mista', kcal: 17, protein: 1.4, carbs: 3.0, fat: 0.2 },
  { name: 'Carote', kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
  { name: 'Peperoni', kcal: 31, protein: 1.0, carbs: 6.0, fat: 0.3 },
  { name: 'Melanzane', kcal: 25, protein: 1.0, carbs: 5.9, fat: 0.2 },
  { name: 'Cavolfiore', kcal: 25, protein: 1.9, carbs: 5.0, fat: 0.3 },
  { name: 'Asparagi', kcal: 20, protein: 2.2, carbs: 3.9, fat: 0.1 },
  { name: 'Funghi champignon', kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },

  // ---- Frutta ----
  { name: 'Banana', kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  { name: 'Mela', kcal: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  { name: 'Arancia', kcal: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
  { name: 'Kiwi', kcal: 61, protein: 1.1, carbs: 14.7, fat: 0.5 },
  { name: 'Fragole', kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { name: 'Mirtilli', kcal: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
  { name: 'Uva', kcal: 69, protein: 0.7, carbs: 18.1, fat: 0.2 },
  { name: 'Pera', kcal: 57, protein: 0.4, carbs: 15.2, fat: 0.1 },
  { name: 'Pesca', kcal: 39, protein: 0.9, carbs: 9.5, fat: 0.3 },
  { name: 'Anguria', kcal: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
  { name: 'Avocado', kcal: 160, protein: 2.0, carbs: 8.5, fat: 14.7 },

  // ---- Frutta secca e semi ----
  { name: 'Mandorle', kcal: 579, protein: 21.2, carbs: 21.6, fat: 49.9 },
  { name: 'Noci', kcal: 654, protein: 15.2, carbs: 13.7, fat: 65.2 },
  { name: 'Anacardi', kcal: 553, protein: 18.2, carbs: 30.2, fat: 43.9 },
  { name: 'Arachidi', kcal: 567, protein: 25.8, carbs: 16.1, fat: 49.2 },
  { name: 'Burro di arachidi', kcal: 588, protein: 25.1, carbs: 20.0, fat: 50.4 },
  { name: 'Semi di chia', kcal: 486, protein: 16.5, carbs: 42.1, fat: 30.7 },
  { name: 'Pistacchi', kcal: 560, protein: 20.2, carbs: 27.2, fat: 45.3 },

  // ---- Condimenti e grassi ----
  { name: 'Olio extravergine di oliva', kcal: 884, protein: 0, carbs: 0, fat: 100 },
  { name: 'Burro', kcal: 717, protein: 0.9, carbs: 0.1, fat: 81.1 },
  { name: 'Miele', kcal: 304, protein: 0.3, carbs: 82.4, fat: 0 },
  { name: 'Zucchero', kcal: 387, protein: 0, carbs: 100, fat: 0 },
  { name: 'Marmellata', kcal: 278, protein: 0.4, carbs: 69.0, fat: 0.1 },
  { name: 'Cioccolato fondente 85%', kcal: 592, protein: 9.7, carbs: 22.7, fat: 52.4 },

  // ---- Piatti compositi (valori medi per 100 g di piatto pronto) ----
  { name: 'Pasta al pomodoro', kcal: 145, protein: 5.0, carbs: 26.0, fat: 2.5 },
  { name: 'Pasta alla norma', kcal: 155, protein: 5.5, carbs: 24.0, fat: 4.5 },
  { name: 'Pasta alla carbonara', kcal: 195, protein: 8.5, carbs: 22.0, fat: 8.5 },
  { name: 'Pasta al pesto', kcal: 210, protein: 6.5, carbs: 25.0, fat: 9.5 },
  { name: 'Pasta al ragù (bolognese)', kcal: 170, protein: 8.0, carbs: 22.0, fat: 5.5 },
  { name: 'Pasta aglio olio e peperoncino', kcal: 185, protein: 5.0, carbs: 27.0, fat: 6.5 },
  { name: 'Lasagne alla bolognese', kcal: 175, protein: 9.0, carbs: 15.0, fat: 9.0 },
  { name: 'Risotto alla parmigiana', kcal: 165, protein: 5.0, carbs: 24.0, fat: 5.5 },
  { name: 'Risotto ai funghi', kcal: 140, protein: 4.0, carbs: 23.0, fat: 3.5 },
  { name: 'Parmigiana di melanzane', kcal: 165, protein: 7.5, carbs: 8.0, fat: 12.0 },
  { name: 'Pizza margherita', kcal: 240, protein: 10.0, carbs: 32.0, fat: 8.0 },
  { name: 'Pizza marinara', kcal: 220, protein: 6.5, carbs: 36.0, fat: 5.5 },
  { name: 'Minestrone di verdure', kcal: 40, protein: 2.0, carbs: 6.5, fat: 0.8 },
  { name: 'Pasta e fagioli', kcal: 110, protein: 5.5, carbs: 17.0, fat: 2.0 },
  { name: 'Pollo alla griglia (piatto)', kcal: 150, protein: 26.0, carbs: 0.5, fat: 5.0 },
  { name: 'Cotoletta alla milanese', kcal: 260, protein: 18.0, carbs: 12.0, fat: 15.5 },
  { name: 'Frittata (2 uova)', kcal: 190, protein: 12.5, carbs: 1.0, fat: 15.0 },
  { name: 'Insalata di riso', kcal: 155, protein: 5.0, carbs: 22.0, fat: 5.0 },
  { name: 'Piadina prosciutto e formaggio', kcal: 270, protein: 11.0, carbs: 28.0, fat: 12.5 },
  { name: 'Tiramisù', kcal: 340, protein: 6.0, carbs: 34.0, fat: 20.0 },

  // ---- Integratori / altro ----
  { name: 'Proteine whey (polvere)', kcal: 400, protein: 80.0, carbs: 8.0, fat: 6.0 },
  { name: 'Crema di riso', kcal: 360, protein: 6.5, carbs: 80.0, fat: 0.9 },
  { name: 'Maltodestrine', kcal: 380, protein: 0, carbs: 95.0, fat: 0 },
  { name: 'Tortillas integrali', kcal: 306, protein: 8.5, carbs: 49.0, fat: 8.0 },
  { name: 'Salmone affumicato', kcal: 147, protein: 22.0, carbs: 0.5, fat: 6.5 },
  { name: 'Hummus', kcal: 166, protein: 7.9, carbs: 14.3, fat: 9.6 },
];
