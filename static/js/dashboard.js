// SimCalio — Dashboard Logic
// Uses Firebase ESM via CDN; imported as a module in dashboard.html

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBVR09VER0k3nLv-OjU7ARB1CdUKKG7_14",
  authDomain: "planner-beebb.firebaseapp.com",
  projectId: "planner-beebb",
  storageBucket: "planner-beebb.firebasestorage.app",
  messagingSenderId: "1007032615851",
  appId: "1:1007032615851:web:8bb9bb8321c25bb6e908ee"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userName = '';
let userGoals = { calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, water_ml: 2000 };
let currentDate = new Date().toISOString().split('T')[0];
let macroChart, goalChart;

// ─── Date Picker ─────────────────────────────────────────────────────────────
const dp = document.getElementById('date-picker');
dp.value = currentDate;
dp.addEventListener('change', () => { currentDate = dp.value; loadData(); });

// ─── Auth State ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = '/'; return; }
  currentUser = user;

  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const d = snap.data();
      userName = d.name || user.displayName || 'there';
      if (d.goals) {
        userGoals = { ...userGoals, ...d.goals };
      }
      // Populate goal inputs from saved values
      document.getElementById('g-cals').value   = userGoals.calories;
      document.getElementById('g-prot').value   = userGoals.protein_g;
      document.getElementById('g-carbs').value  = userGoals.carbs_g;
      document.getElementById('g-fat').value    = userGoals.fat_g;
      document.getElementById('g-water').value  = userGoals.water_ml;
    } else {
      userName = user.displayName || 'there';
    }
  } catch (e) {
    console.warn('Could not fetch user doc:', e);
    userName = user.displayName || 'there';
  }

  document.getElementById('user-name').textContent = userName;
  await loadData();
});

// ─── Sign Out ─────────────────────────────────────────────────────────────────
window.logout = () => signOut(auth).catch(console.error);

// ─── Load Data for Selected Date ─────────────────────────────────────────────
async function loadData() {
  const dateLabel = new Date(currentDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('date-label').textContent = dateLabel;

  try {
    const ref = doc(db, 'users', currentUser.uid, 'days', currentDate);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      renderAll(data.totals || {}, data.meals || []);
    } else {
      renderAll({}, []);
    }
  } catch (e) {
    console.error('loadData error:', e);
    renderAll({}, []);
  }
}

// ─── Goal % Helper ────────────────────────────────────────────────────────────
function pct(val, goal) {
  if (!goal) return 0;
  return Math.min(100, Math.round(((val || 0) / goal) * 100));
}

// ─── Render All ───────────────────────────────────────────────────────────────
function renderAll(totals, meals) {
  const g = userGoals;
  const cals  = Math.round(totals.calories  || 0);
  const prot  = Math.round(totals.protein_g || 0);
  const carbs = Math.round(totals.carbs_g   || 0);
  const fat   = Math.round(totals.fat_g     || 0);
  const water = Math.round(totals.water_ml  || 0);

  // Stat cards
  document.getElementById('s-cals').textContent      = cals  + ' kcal';
  document.getElementById('s-prot').textContent      = prot  + 'g';
  document.getElementById('s-carbs').textContent     = carbs + 'g';
  document.getElementById('s-fat').textContent       = fat   + 'g';
  document.getElementById('s-water').textContent     = water + 'ml';
  document.getElementById('s-cals-sub').textContent  = `of ${g.calories} goal`;
  document.getElementById('s-prot-sub').textContent  = `of ${g.protein_g}g goal`;
  document.getElementById('s-carbs-sub').textContent = `of ${g.carbs_g}g goal`;
  document.getElementById('s-fat-sub').textContent   = `of ${g.fat_g}g goal`;
  document.getElementById('s-water-sub').textContent = `of ${g.water_ml}ml goal`;

  document.getElementById('sf-cals').style.width  = pct(cals,  g.calories)   + '%';
  document.getElementById('sf-prot').style.width  = pct(prot,  g.protein_g)  + '%';
  document.getElementById('sf-carbs').style.width = pct(carbs, g.carbs_g)    + '%';
  document.getElementById('sf-fat').style.width   = pct(fat,   g.fat_g)      + '%';
  document.getElementById('sf-water').style.width = pct(water, g.water_ml)   + '%';

  // Macro doughnut chart
  const mCtx = document.getElementById('chart-macros').getContext('2d');
  if (macroChart) macroChart.destroy();
  macroChart = new Chart(mCtx, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [prot || 0.1, carbs || 0.1, fat || 0.1],
        backgroundColor: ['#60a5fa', '#7c6af7', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#6b6b80', font: { family: 'DM Sans', size: 12 } } }
      },
      cutout: '65%',
      animation: { duration: 800 }
    }
  });

  // Goals bar chart
  const gCtx = document.getElementById('chart-goals').getContext('2d');
  if (goalChart) goalChart.destroy();
  goalChart = new Chart(gCtx, {
    type: 'bar',
    data: {
      labels: ['Calories', 'Protein', 'Carbs', 'Fat', 'Water'],
      datasets: [{
        data: [
          pct(cals, g.calories),
          pct(prot, g.protein_g),
          pct(carbs, g.carbs_g),
          pct(fat, g.fat_g),
          pct(water, g.water_ml)
        ],
        backgroundColor: ['#f06f4b', '#60a5fa', '#7c6af7', '#f59e0b', '#22d3ee'],
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          max: 120,
          grid: { color: '#2a2a3a' },
          ticks: { color: '#6b6b80', callback: v => v + '%' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#6b6b80', font: { size: 11 } }
        }
      },
      animation: { duration: 800 }
    }
  });

  // Micronutrients
  const micros = [
    { label: 'Iron',      val: totals.iron_mg         || 0, goal: 18,   unit: 'mg',  color: '#f06f4b' },
    { label: 'Magnesium', val: totals.magnesium_mg    || 0, goal: 400,  unit: 'mg',  color: '#7c6af7' },
    { label: 'Calcium',   val: totals.calcium_mg      || 0, goal: 1000, unit: 'mg',  color: '#60a5fa' },
    { label: 'Potassium', val: totals.potassium_mg    || 0, goal: 3500, unit: 'mg',  color: '#22d3ee' },
    { label: 'Vit C',     val: totals.vitamin_c_mg    || 0, goal: 90,   unit: 'mg',  color: '#4ade80' },
    { label: 'Vit D',     val: totals.vitamin_d_mcg   || 0, goal: 20,   unit: 'mcg', color: '#f59e0b' },
    { label: 'Vit B12',   val: totals.vitamin_b12_mcg || 0, goal: 2.4,  unit: 'mcg', color: '#a78bfa' },
    { label: 'Sodium',    val: totals.sodium_mg       || 0, goal: 2300, unit: 'mg',  color: '#fb7185' },
  ];

  document.getElementById('micro-grid').innerHTML = micros.map(m => `
    <div class="micro-row">
      <div class="micro-label">
        <span class="micro-name">${m.label}</span>
        <span class="micro-val">${(m.val || 0).toFixed(1)}/${m.goal}${m.unit}</span>
      </div>
      <div class="micro-bar">
        <div class="micro-fill" style="width:${pct(m.val, m.goal)}%;background:${m.color}"></div>
      </div>
    </div>`).join('');

  // Meals table
  const mealBadgeClass = {
    breakfast: 'badge-breakfast', lunch: 'badge-lunch', dinner: 'badge-dinner',
    snack: 'badge-snack', water: 'badge-water', supplements: 'badge-supplements', any: 'badge-any'
  };

  if (!meals.length) {
    document.getElementById('meals-container').innerHTML =
      '<div class="no-data">No meals logged yet. Start chatting! 🍽️</div>';
  } else {
    document.getElementById('meals-container').innerHTML = `
      <table class="meals-table">
        <thead><tr><th>Type</th><th>Meal</th><th>Calories</th><th>Time</th></tr></thead>
        <tbody>
          ${meals.map(m => {
            const time = new Date(m.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const badgeClass = mealBadgeClass[m.mealType] || 'badge-any';
            return `<tr>
              <td><span class="meal-type-badge ${badgeClass}">${m.mealType || 'meal'}</span></td>
              <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.name}</td>
              <td style="color:var(--accent2)">${Math.round(m.calories)} kcal</td>
              <td style="color:var(--muted)">${time}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }
}

// ─── Save Goals ───────────────────────────────────────────────────────────────
// Key fix: read inputs, update userGoals in memory first, THEN try Firestore.
// If Firestore fails or user isn't fully ready, goals still update locally.
window.saveGoals = async () => {
  const cals  = parseInt(document.getElementById('g-cals').value,  10);
  const prot  = parseInt(document.getElementById('g-prot').value,  10);
  const carbs = parseInt(document.getElementById('g-carbs').value, 10);
  const fat   = parseInt(document.getElementById('g-fat').value,   10);
  const water = parseInt(document.getElementById('g-water').value, 10);

  // Validate
  if ([cals, prot, carbs, fat, water].some(v => isNaN(v) || v < 0)) {
    showToast('⚠️ Please enter valid positive numbers for all goals.');
    return;
  }

  // Update local goals object immediately
  userGoals = { calories: cals, protein_g: prot, carbs_g: carbs, fat_g: fat, water_ml: water };

  // Re-render dashboard with new goals right away (no need to wait for Firestore)
  await loadData();

  const btn = document.getElementById('btn-save-goals');
  btn.textContent = '✓ Saved!';
  btn.classList.add('saved');
  setTimeout(() => { btn.textContent = 'Save Goals'; btn.classList.remove('saved'); }, 2000);

  // Persist to Firestore in background (non-blocking)
  if (currentUser) {
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { goals: userGoals }, { merge: true });
    } catch (e) {
      console.warn('Firestore save failed (goals saved locally):', e);
      showToast('⚠️ Saved locally — cloud sync failed.');
    }
  }
};

// ─── Toast Helper ─────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}