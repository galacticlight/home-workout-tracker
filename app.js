// Home Workout Tracker - Offline only
// Data model + PR highlighting + pinned heuristics

const STORAGE_KEY = 'homeWorkoutTracker_v1';

const DEFAULT_EXERCISES = [
  { id: 'ex1', name: 'Push-ups', muscle: 'Chest', type: 'bodyweight' },
  { id: 'ex2', name: 'Pull-ups', muscle: 'Back', type: 'bodyweight' },
  { id: 'ex3', name: 'Squats (Bodyweight)', muscle: 'Legs', type: 'bodyweight' },
  { id: 'ex4', name: 'Dumbbell Bench Press', muscle: 'Chest', type: 'weight' },
  { id: 'ex5', name: 'Dumbbell Rows', muscle: 'Back', type: 'weight' },
  { id: 'ex6', name: 'Goblet Squats', muscle: 'Legs', type: 'weight' },
  { id: 'ex7', name: 'Overhead Press (DB)', muscle: 'Shoulders', type: 'weight' },
  { id: 'ex8', name: 'Romanian Deadlift (DB)', muscle: 'Legs', type: 'weight' },
  { id: 'ex9', name: 'Lunges', muscle: 'Legs', type: 'weight' },
  { id: 'ex10', name: 'Plank', muscle: 'Core', type: 'bodyweight' },
  { id: 'ex11', name: 'Bicep Curls', muscle: 'Arms', type: 'weight' },
  { id: 'ex12', name: 'Tricep Dips', muscle: 'Arms', type: 'bodyweight' },
  { id: 'ex13', name: 'Lateral Raises', muscle: 'Shoulders', type: 'weight' },
  { id: 'ex14', name: 'Calf Raises', muscle: 'Legs', type: 'weight' },
  { id: 'ex15', name: 'Burpees', muscle: 'Full Body', type: 'bodyweight' },
];

let state = {
  exercises: [],
  routines: [],
  workouts: [],
  prs: {}, // exerciseId -> { maxWeight, maxVolume, maxReps, date, workoutId, type }
  currentWorkout: null,
  activeTab: 'dashboard',
  restSeconds: 90,
  restInterval: null,
};

// ---------- Persistence ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.exercises = parsed.exercises || [...DEFAULT_EXERCISES];
      state.routines = parsed.routines || [];
      state.workouts = parsed.workouts || [];
      state.prs = parsed.prs || {};
    } else {
      state.exercises = [...DEFAULT_EXERCISES];
      saveState();
    }
  } catch (e) {
    console.error('Load failed', e);
    state.exercises = [...DEFAULT_EXERCISES];
  }
}

function saveState() {
  const toSave = {
    exercises: state.exercises,
    routines: state.routines,
    workouts: state.workouts,
    prs: state.prs,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

// ---------- PR Logic ----------
function checkAndUpdatePR(exerciseId, weight, reps, workoutId) {
  const volume = (weight || 0) * (reps || 0);
  const existing = state.prs[exerciseId] || {};
  let isNew = false;
  let detail = '';

  // Max weight (prefer higher weight, or same weight more reps)
  if (weight > (existing.maxWeight || 0) || (weight === existing.maxWeight && reps > (existing.maxRepsAtWeight || 0))) {
    existing.maxWeight = weight;
    existing.maxRepsAtWeight = reps;
    existing.weightDate = new Date().toISOString().slice(0, 10);
    existing.weightWorkoutId = workoutId;
    isNew = true;
    detail = `${weight} kg × ${reps}`;
  }

  // Max volume (single set)
  if (volume > (existing.maxVolume || 0)) {
    existing.maxVolume = volume;
    existing.volumeDate = new Date().toISOString().slice(0, 10);
    existing.volumeWorkoutId = workoutId;
    isNew = true;
    if (!detail) detail = `Volume ${volume}`;
  }

  // Max reps (any weight, useful for bodyweight)
  if (reps > (existing.maxReps || 0)) {
    existing.maxReps = reps;
    existing.repsDate = new Date().toISOString().slice(0, 10);
    existing.repsWorkoutId = workoutId;
    isNew = true;
    if (!detail) detail = `${reps} reps`;
  }

  if (isNew) {
    existing.exerciseId = exerciseId;
    state.prs[exerciseId] = existing;
    saveState();
    showPRToast(detail);
  }
  return isNew;
}

function showPRToast(detail) {
  const toast = document.getElementById('pr-toast');
  document.getElementById('pr-detail').textContent = detail;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ---------- UI Rendering ----------
function setTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  render();
}

function render() {
  const content = document.getElementById('content');
  switch (state.activeTab) {
    case 'dashboard': content.innerHTML = renderDashboard(); break;
    case 'log': content.innerHTML = renderLog(); break;
    case 'routines': content.innerHTML = renderRoutines(); break;
    case 'progress': content.innerHTML = renderProgress(); break;
    case 'history': content.innerHTML = renderHistory(); break;
  }
  bindEvents();
}

function renderDashboard() {
  const recent = state.workouts.slice(-5).reverse();
  const prCount = Object.keys(state.prs).length;
  const streak = calcStreak();

  let html = `
    <div class="card">
      <div class="card-title">Quick Stats</div>
      <div style="display:flex;justify-content:space-around;text-align:center;">
        <div><div style="font-size:1.6rem;font-weight:700;">${state.workouts.length}</div><div class="text-sm text-muted">Workouts</div></div>
        <div><div style="font-size:1.6rem;font-weight:700;color:var(--pr);">${prCount}</div><div class="text-sm text-muted">PRs</div></div>
        <div><div style="font-size:1.6rem;font-weight:700;">${streak}</div><div class="text-sm text-muted">Day Streak</div></div>
      </div>
    </div>
    <button class="btn btn-block mb-12" onclick="startNewWorkout()">+ Start Workout</button>
  `;

  if (recent.length) {
    html += `<div class="card"><div class="card-title">Recent</div>`;
    recent.forEach(w => {
      const vol = totalVolume(w);
      html += `<div class="list-item" onclick="viewWorkout('${w.id}')">
        <div><strong>${w.name || 'Workout'}</strong><div class="text-sm text-muted">${w.date}</div></div>
        <div class="text-sm">${vol} kg</div>
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="empty">No workouts yet. Tap Start Workout to begin.</div>`;
  }
  return html;
}

function renderLog() {
  if (!state.currentWorkout) {
    return `
      <div class="empty">
        <p>No active workout.</p>
        <button class="btn mt-12" onclick="startNewWorkout()">Start New Workout</button>
        <div class="mt-12">
          <label>Or start from routine</label>
          <select id="routine-select">
            <option value="">-- Select routine --</option>
            ${state.routines.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-block mt-12" onclick="startFromRoutine()">Start Routine</button>
        </div>
      </div>`;
  }

  const w = state.currentWorkout;
  let html = `
    <div class="card">
      <input id="workout-name" value="${w.name || ''}" placeholder="Workout name" />
      <div class="text-sm text-muted">${w.date}</div>
    </div>
  `;

  w.exercises.forEach((ex, exIdx) => {
    const exInfo = state.exercises.find(e => e.id === ex.exerciseId) || { name: 'Unknown' };
    html += `<div class="exercise-block" data-exidx="${exIdx}">
      <div class="exercise-header">
        <span class="exercise-name">${exInfo.name}</span>
        <button class="btn btn-sm btn-secondary" onclick="removeExercise(${exIdx})">✕</button>
      </div>
      <div class="set-row text-sm text-muted" style="margin-bottom:4px;">
        <div></div><div class="text-center">kg</div><div class="text-center">reps</div><div></div>
      </div>`;
    ex.sets.forEach((s, sIdx) => {
      const isPR = s.isPR ? '<span class="pr-badge">PR</span>' : '';
      html += `<div class="set-row">
        <div class="set-num">${sIdx + 1}${isPR}</div>
        <input type="number" inputmode="decimal" value="${s.weight || ''}" data-ex="${exIdx}" data-set="${sIdx}" data-field="weight" onchange="updateSet(this)" />
        <input type="number" inputmode="numeric" value="${s.reps || ''}" data-ex="${exIdx}" data-set="${sIdx}" data-field="reps" onchange="updateSet(this)" />
        <button class="icon-btn" onclick="removeSet(${exIdx},${sIdx})">✕</button>
      </div>`;
    });
    html += `
      <button class="btn btn-sm btn-secondary mt-12" onclick="addSet(${exIdx})">+ Set</button>
      <button class="btn btn-sm btn-success" style="margin-left:8px;" onclick="startRest()">⏱ Rest</button>
    </div>`;
  });

  html += `
    <button class="btn btn-secondary btn-block mb-12" onclick="addExerciseToWorkout()">+ Add Exercise</button>
    <button class="btn btn-block btn-success" onclick="finishWorkout()">Finish Workout</button>
    <button class="btn btn-block btn-danger mt-12" onclick="cancelWorkout()">Cancel</button>
  `;
  return html;
}

function renderRoutines() {
  let html = `<button class="btn btn-block mb-12" onclick="createRoutine()">+ New Routine</button>`;
  if (!state.routines.length) {
    html += `<div class="empty">No routines yet. Create one to speed up logging.</div>`;
  } else {
    state.routines.forEach(r => {
      const names = r.exerciseIds.map(id => (state.exercises.find(e => e.id === id) || {}).name || '?').join(', ');
      html += `<div class="card">
        <strong>${r.name}</strong>
        <div class="text-sm text-muted">${names}</div>
        <div class="mt-12 flex gap-8">
          <button class="btn btn-sm" onclick="startRoutineById('${r.id}')">Start</button>
          <button class="btn btn-sm btn-secondary" onclick="deleteRoutine('${r.id}')">Delete</button>
        </div>
      </div>`;
    });
  }
  return html;
}

function renderProgress() {
  // PINNED PRs at the top (key requirement)
  const prList = Object.values(state.prs).map(pr => {
    const ex = state.exercises.find(e => e.id === pr.exerciseId) || { name: 'Unknown' };
    return { ...pr, name: ex.name };
  }).sort((a, b) => (b.maxWeight || 0) - (a.maxWeight || 0));

  let html = `<div class="card pr-pinned">
    <div class="card-title" style="color:var(--pr);">🏆 Pinned Personal Records</div>`;
  if (!prList.length) {
    html += `<div class="text-muted text-sm">No PRs yet. Log some heavy sets!</div>`;
  } else {
    prList.forEach(pr => {
      html += `<div class="pr-item">
        <div>
          <div class="pr-exercise">${pr.name}</div>
          <div class="pr-meta">${pr.weightDate || pr.volumeDate || ''}</div>
        </div>
        <div class="pr-value">${pr.maxWeight || 0} kg × ${pr.maxRepsAtWeight || pr.maxReps || '?'}</div>
      </div>`;
    });
  }
  html += `</div>`;

  // Exercise selector for chart
  html += `<div class="card">
    <div class="card-title">Exercise Progress</div>
    <select id="chart-exercise" onchange="renderChart()">
      <option value="">Select exercise...</option>
      ${state.exercises.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
    </select>
    <div class="chart-wrap"><canvas id="progress-chart"></canvas></div>
  </div>`;

  // Simple heuristics
  const totalVol = state.workouts.reduce((sum, w) => sum + totalVolume(w), 0);
  html += `<div class="card">
    <div class="card-title">Heuristics</div>
    <div class="list-item"><span>Total volume lifted</span><strong>${Math.round(totalVol)} kg</strong></div>
    <div class="list-item"><span>Total workouts</span><strong>${state.workouts.length}</strong></div>
    <div class="list-item"><span>Unique exercises used</span><strong>${new Set(state.workouts.flatMap(w => w.exercises.map(e => e.exerciseId))).size}</strong></div>
  </div>`;

  return html;
}

function renderHistory() {
  if (!state.workouts.length) return `<div class="empty">No history yet.</div>`;
  let html = '';
  [...state.workouts].reverse().forEach(w => {
    const vol = totalVolume(w);
    const prsInWorkout = w.exercises.some(ex => ex.sets.some(s => s.isPR));
    html += `<div class="card" onclick="viewWorkout('${w.id}')">
      <div style="display:flex;justify-content:space-between;">
        <strong>${w.name || 'Workout'}</strong>
        ${prsInWorkout ? '<span class="pr-badge">PR</span>' : ''}
      </div>
      <div class="text-sm text-muted">${w.date} · ${vol} kg volume · ${w.exercises.length} exercises</div>
    </div>`;
  });
  return html;
}

// ---------- Helpers ----------
function totalVolume(workout) {
  return workout.exercises.reduce((sum, ex) => {
    return sum + ex.sets.reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
  }, 0);
}

function calcStreak() {
  if (!state.workouts.length) return 0;
  const dates = [...new Set(state.workouts.map(w => w.date))].sort().reverse();
  let streak = 0;
  let expected = new Date();
  expected.setHours(0,0,0,0);
  for (const d of dates) {
    const dt = new Date(d);
    dt.setHours(0,0,0,0);
    const diff = (expected - dt) / 86400000;
    if (diff === 0 || diff === 1) {
      streak++;
      expected = new Date(dt);
      expected.setDate(expected.getDate() - 1);
    } else break;
  }
  return streak;
}

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ---------- Workout Actions ----------
function startNewWorkout() {
  state.currentWorkout = {
    id: generateId(),
    name: 'Home Session',
    date: new Date().toISOString().slice(0, 10),
    exercises: [],
    notes: '',
  };
  setTab('log');
}

function startFromRoutine() {
  const sel = document.getElementById('routine-select');
  if (!sel || !sel.value) return;
  startRoutineById(sel.value);
}

function startRoutineById(rid) {
  const r = state.routines.find(x => x.id === rid);
  if (!r) return;
  state.currentWorkout = {
    id: generateId(),
    name: r.name,
    date: new Date().toISOString().slice(0, 10),
    exercises: r.exerciseIds.map(eid => ({
      exerciseId: eid,
      sets: [{ weight: '', reps: '', isPR: false }],
    })),
    notes: '',
  };
  setTab('log');
}

function addExerciseToWorkout() {
  const name = prompt('Exercise name (or pick from library later):');
  if (!name) return;
  let ex = state.exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
  if (!ex) {
    ex = { id: generateId(), name, muscle: 'Other', type: 'weight' };
    state.exercises.push(ex);
    saveState();
  }
  state.currentWorkout.exercises.push({
    exerciseId: ex.id,
    sets: [{ weight: '', reps: '', isPR: false }],
  });
  render();
}

function addSet(exIdx) {
  state.currentWorkout.exercises[exIdx].sets.push({ weight: '', reps: '', isPR: false });
  render();
}

function removeSet(exIdx, sIdx) {
  state.currentWorkout.exercises[exIdx].sets.splice(sIdx, 1);
  if (state.currentWorkout.exercises[exIdx].sets.length === 0) {
    state.currentWorkout.exercises.splice(exIdx, 1);
  }
  render();
}

function removeExercise(exIdx) {
  state.currentWorkout.exercises.splice(exIdx, 1);
  render();
}

function updateSet(el) {
  const exIdx = +el.dataset.ex;
  const sIdx = +el.dataset.set;
  const field = el.dataset.field;
  const val = el.value === '' ? '' : Number(el.value);
  state.currentWorkout.exercises[exIdx].sets[sIdx][field] = val;
}

function finishWorkout() {
  const nameEl = document.getElementById('workout-name');
  if (nameEl) state.currentWorkout.name = nameEl.value || 'Workout';

  // Check PRs for every set
  state.currentWorkout.exercises.forEach(ex => {
    ex.sets.forEach(s => {
      if (s.weight !== '' && s.reps !== '') {
        const isNew = checkAndUpdatePR(ex.exerciseId, Number(s.weight), Number(s.reps), state.currentWorkout.id);
        s.isPR = isNew;
      }
    });
  });

  state.workouts.push(state.currentWorkout);
  state.currentWorkout = null;
  saveState();
  setTab('dashboard');
  alert('Workout saved! Check Progress for pinned PRs.');
}

function cancelWorkout() {
  if (confirm('Discard current workout?')) {
    state.currentWorkout = null;
    setTab('dashboard');
  }
}

function viewWorkout(id) {
  const w = state.workouts.find(x => x.id === id);
  if (!w) return;
  let msg = `${w.name}\n${w.date}\n\n`;
  w.exercises.forEach(ex => {
    const name = (state.exercises.find(e => e.id === ex.exerciseId) || {}).name;
    msg += `${name}:\n`;
    ex.sets.forEach((s, i) => {
      msg += `  ${i+1}. ${s.weight} kg × ${s.reps}${s.isPR ? ' 🏆' : ''}\n`;
    });
  });
  alert(msg);
}

// ---------- Routines ----------
function createRoutine() {
  const name = prompt('Routine name:');
  if (!name) return;
  const ids = [];
  let more = true;
  while (more) {
    const ename = prompt('Add exercise name (leave empty to finish):');
    if (!ename) { more = false; break; }
    let ex = state.exercises.find(e => e.name.toLowerCase() === ename.toLowerCase());
    if (!ex) {
      ex = { id: generateId(), name: ename, muscle: 'Other', type: 'weight' };
      state.exercises.push(ex);
    }
    ids.push(ex.id);
  }
  if (ids.length) {
    state.routines.push({ id: generateId(), name, exerciseIds: ids });
    saveState();
    render();
  }
}

function deleteRoutine(id) {
  if (confirm('Delete this routine?')) {
    state.routines = state.routines.filter(r => r.id !== id);
    saveState();
    render();
  }
}

// ---------- Rest Timer ----------
function startRest() {
  let secs = state.restSeconds;
  const overlay = document.getElementById('rest-timer');
  const timeEl = document.getElementById('rest-time');
  overlay.classList.remove('hidden');
  timeEl.textContent = secs;

  if (state.restInterval) clearInterval(state.restInterval);
  state.restInterval = setInterval(() => {
    secs--;
    timeEl.textContent = secs;
    if (secs <= 0) {
      clearInterval(state.restInterval);
      overlay.classList.add('hidden');
      // Optional vibration
      if (navigator.vibrate) navigator.vibrate(200);
    }
  }, 1000);
}

function skipRest() {
  if (state.restInterval) clearInterval(state.restInterval);
  document.getElementById('rest-timer').classList.add('hidden');
}

// ---------- Chart ----------
let chartInstance = null;
function renderChart() {
  const sel = document.getElementById('chart-exercise');
  if (!sel || !sel.value) return;
  const exId = sel.value;

  // Collect history of best set weight per workout for this exercise
  const points = [];
  state.workouts.forEach(w => {
    const ex = w.exercises.find(e => e.exerciseId === exId);
    if (ex) {
      const maxW = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
      if (maxW > 0) points.push({ date: w.date, weight: maxW });
    }
  });

  const ctx = document.getElementById('progress-chart');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.map(p => p.date),
      datasets: [{
        label: 'Best Weight (kg)',
        data: points.map(p => p.weight),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
        tension: 0.3,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#999' }, grid: { color: '#333' } },
        y: { ticks: { color: '#999' }, grid: { color: '#333' }, beginAtZero: true },
      },
    },
  });
}

// ---------- Export / Import ----------
function exportData() {
  const data = {
    exercises: state.exercises,
    routines: state.routines,
    workouts: state.workouts,
    prs: state.prs,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workout-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.exercises) state.exercises = data.exercises;
      if (data.routines) state.routines = data.routines;
      if (data.workouts) state.workouts = data.workouts;
      if (data.prs) state.prs = data.prs;
      saveState();
      render();
      alert('Import successful!');
    } catch (err) {
      alert('Invalid file');
    }
  };
  reader.readAsText(file);
}

// ---------- Event Binding ----------
function bindEvents() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => setTab(t.dataset.tab);
  });
  document.getElementById('btn-export').onclick = exportData;
  document.getElementById('btn-import').onclick = () => document.getElementById('import-file').click();
  document.getElementById('import-file').onchange = (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
  };
  document.getElementById('rest-skip').onclick = skipRest;

  // After progress render, try chart if selected
  if (state.activeTab === 'progress') {
    setTimeout(renderChart, 50);
  }
}

// ---------- Init ----------
loadState();
render();
