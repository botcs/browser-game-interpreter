// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// Representation viewer: replays human gameplay with synchronized
// model representation panels (fMRI, DDQN, EfficientZero, DeepSeek).
// Shows the full session (all trials for a subject+game) with
// temporally aligned features via behavioral_indices.

import { setupRegistry } from './engine/setup-registry.js';
import { VGDLParser } from './engine/parser.js';
import { Renderer } from './renderer.js';
import { GAMES } from './games/game-data.js';

setupRegistry();

// ============================================================
// Configuration
// ============================================================
// Manifest format (session-level):
// {
//   "subjects": {
//     "sub-13": {
//       "games": {
//         "bait_vgfmri4": {
//           "replay": "sub-13/bait_vgfmri4_sub-13.replay.json.gz",
//           "features": {
//             "human_fmri": "sub-13/bait_vgfmri4_fmri.json",
//             "deepseek": "sub-13/bait_vgfmri4_deepseek.json"
//           }
//         }
//       }
//     }
//   }
// }

const DATA_BASE = './data/representation';

// ============================================================
// State
// ============================================================
let manifest = null;
let logData = null;
let states = [];
let replaySteps = [];
let currentStepIndex = 0;
let currentLevel = null;
let currentGame = null;
let activeLevel = null;
let playInterval = null;
let playSpeed = 2;

// Feature data for each panel (with behavioral_indices for alignment)
let featureData = {
  human_fmri: null,
  ddqn: null,
  ez: null,
  deepseek: null,
};

// ============================================================
// DOM references
// ============================================================
const selectSubject = document.getElementById('select-subject');
const selectGame = document.getElementById('select-game');
const btnLoad = document.getElementById('btn-load');
const loadStatus = document.getElementById('load-status');

const mainContainer = document.getElementById('main-container');
const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas, 30);

const btnStepBack = document.getElementById('btn-step-back');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnStepFwd = document.getElementById('btn-step-fwd');
const stepLabel = document.getElementById('step-label');
const speedSelect = document.getElementById('speed-select');
const scrubber = document.getElementById('step-scrubber');

const metaGame = document.getElementById('meta-game');
const metaSubject = document.getElementById('meta-subject');
const metaOutcome = document.getElementById('meta-outcome');

const actionLogEl = document.getElementById('action-log');
const trialInfo = document.getElementById('trial-info');
const dataAvailability = document.getElementById('data-availability');

const flapTabDesc = document.getElementById('flap-tab-desc');
const flapTabLevel = document.getElementById('flap-tab-level');
const flapPanelDesc = document.getElementById('flap-panel-desc');
const flapPanelLevel = document.getElementById('flap-panel-level');
const gameDescEl = document.getElementById('game-desc');
const levelTextEl = document.getElementById('level-text');

// Panel canvases and status elements
const panels = {
  human_fmri: {
    canvas: document.getElementById('canvas-human'),
    status: document.getElementById('panel-human-status'),
    placeholder: document.getElementById('placeholder-human'),
  },
  ddqn: {
    canvas: document.getElementById('canvas-ddqn'),
    status: document.getElementById('panel-ddqn-status'),
    placeholder: document.getElementById('placeholder-ddqn'),
  },
  ez: {
    canvas: document.getElementById('canvas-ez'),
    status: document.getElementById('panel-ez-status'),
    placeholder: document.getElementById('placeholder-ez'),
  },
  deepseek: {
    canvas: document.getElementById('canvas-deepseek'),
    status: document.getElementById('panel-deepseek-status'),
    placeholder: document.getElementById('placeholder-deepseek'),
  },
};

// ============================================================
// Flap tabs
// ============================================================
let activeFlap = null;

function toggleFlap(which) {
  if (activeFlap === which) {
    activeFlap = null;
    flapTabDesc.classList.remove('active');
    flapTabLevel.classList.remove('active');
    flapPanelDesc.classList.remove('open');
    flapPanelLevel.classList.remove('open');
    return;
  }
  activeFlap = which;
  flapTabDesc.classList.toggle('active', which === 'desc');
  flapTabLevel.classList.toggle('active', which === 'level');
  flapPanelDesc.classList.toggle('open', which === 'desc');
  flapPanelLevel.classList.toggle('open', which === 'level');
}

flapTabDesc.addEventListener('click', () => toggleFlap('desc'));
flapTabLevel.addEventListener('click', () => toggleFlap('level'));


// ============================================================
// Manifest loading & selector population
// ============================================================

async function loadManifest() {
  loadStatus.textContent = 'Loading manifest...';
  const resp = await fetch(`${DATA_BASE}/manifest.json`);
  if (!resp.ok) {
    loadStatus.textContent = 'No manifest.json found -- run prepare_representation_data.py first';
    return;
  }
  manifest = await resp.json();
  loadStatus.textContent = '';
  populateSubjects();
}

function populateSubjects() {
  selectSubject.innerHTML = '<option value="">-- select --</option>';
  if (!manifest || !manifest.subjects) return;

  for (const subj of Object.keys(manifest.subjects).sort()) {
    const opt = document.createElement('option');
    opt.value = subj;
    opt.textContent = subj;
    selectSubject.appendChild(opt);
  }
}

function populateGames() {
  selectGame.innerHTML = '<option value="">-- select --</option>';
  selectGame.disabled = true;
  btnLoad.disabled = true;

  const subj = selectSubject.value;
  if (!subj || !manifest.subjects[subj]) return;

  selectGame.disabled = false;
  const games = manifest.subjects[subj].games;
  for (const gameName of Object.keys(games).sort()) {
    const opt = document.createElement('option');
    opt.value = gameName;
    const raw = gameName.replace(/_vgfmri\d+$/, '');
    const display = raw.replace(/([A-Z])/g, ' $1').trim();
    opt.textContent = display.charAt(0).toUpperCase() + display.slice(1);
    selectGame.appendChild(opt);
  }
}

selectSubject.addEventListener('change', populateGames);
selectGame.addEventListener('change', () => {
  btnLoad.disabled = !selectGame.value;
});


// ============================================================
// Data loading
// ============================================================

async function loadSelectedData() {
  const subj = selectSubject.value;
  const game = selectGame.value;

  if (!subj || !game) return;

  btnLoad.disabled = true;
  loadStatus.textContent = 'Loading replay...';

  const gameEntry = manifest.subjects[subj].games[game];

  // Load session replay
  const replayUrl = `${DATA_BASE}/${gameEntry.replay}`;

  let replayJson;
  const resp = await fetch(replayUrl);
  if (!resp.ok) {
    loadStatus.textContent = 'Failed to load replay: ' + resp.status;
    btnLoad.disabled = false;
    return;
  }

  if (replayUrl.endsWith('.gz')) {
    const ds = new DecompressionStream('gzip');
    const decompressed = resp.body.pipeThrough(ds);
    const text = await new Response(decompressed).text();
    replayJson = JSON.parse(text);
  } else {
    replayJson = await resp.json();
  }

  // Load feature data in parallel
  loadStatus.textContent = 'Loading features...';
  const featureKeys = ['human_fmri', 'ddqn', 'ez', 'deepseek'];
  const featurePromises = featureKeys.map(async (key) => {
    if (!gameEntry.features || !gameEntry.features[key]) return null;
    const path = gameEntry.features[key];
    const url = `${DATA_BASE}/${path}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    return r.json();
  });

  const featureResults = await Promise.all(featurePromises);
  for (let i = 0; i < featureKeys.length; i++) {
    featureData[featureKeys[i]] = featureResults[i];
  }

  loadStatus.textContent = '';
  btnLoad.disabled = false;

  // Initialize replay
  loadReplay(replayJson, subj);
}

btnLoad.addEventListener('click', loadSelectedData);


// ============================================================
// Feature lookup: nearest-neighbor via behavioral_indices
// ============================================================

/**
 * Find the feature vector for a given state index using binary search
 * on behavioral_indices. Returns the feature at the nearest index <= stepIndex,
 * or null if no feature covers this position.
 */
function findFeatureForStep(data, stepIndex) {
  if (!data || !data.behavioral_indices || !data.features) return null;

  const indices = data.behavioral_indices;
  if (indices.length === 0) return null;

  // If before the first feature point, no data yet
  if (stepIndex < indices[0]) return null;

  // Binary search for nearest index <= stepIndex
  let lo = 0, hi = indices.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (indices[mid] <= stepIndex) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return data.features[lo];
}


// ============================================================
// Core replay logic
// ============================================================

function loadReplay(jsonObj, subject) {
  if (!jsonObj.states || !Array.isArray(jsonObj.states)) {
    loadStatus.textContent = 'Invalid replay: missing "states" array';
    return;
  }

  const gameName = jsonObj.game;
  if (!gameName || !GAMES[gameName]) {
    loadStatus.textContent = 'Unknown game: ' + (gameName || '(none)');
    return;
  }

  logData = jsonObj;
  states = jsonObj.states;
  replaySteps = jsonObj.steps || [];

  // Show main container
  mainContainer.classList.add('visible');

  // Update metadata
  metaGame.textContent = 'Game: ' + gameName;
  metaSubject.textContent = 'Subject: ' + (subject || logData.subject || '--');

  // Session has multiple trials -- show summary
  const trials = logData.trials || [];
  const wins = trials.filter(t => t.outcome === 'win').length;
  const losses = trials.filter(t => t.outcome === 'lose').length;
  metaOutcome.textContent = trials.length + ' trials (' + wins + 'W / ' + losses + 'L)';

  // Scrubber
  scrubber.min = 0;
  scrubber.max = replaySteps.length;
  scrubber.value = 0;

  // Build action log
  buildActionLog();

  // Game description flap
  const gameData = GAMES[gameName];
  gameDescEl.value = gameData.description;

  // Update trial info
  const levels = logData.levels || [];
  trialInfo.innerHTML = [
    '<b>Game:</b> ' + gameName,
    '<b>Subject:</b> ' + (subject || logData.subject || '--'),
    '<b>Levels:</b> ' + (levels.length > 0 ? levels.join(', ') : '--'),
    '<b>Trials:</b> ' + trials.length + ' (' + wins + ' wins, ' + losses + ' losses)',
    '<b>Total Steps:</b> ' + replaySteps.length,
    '<b>Total States:</b> ' + states.length,
  ].join('<br>');

  // Update data availability display
  updateDataAvailability();

  // Update panel statuses
  updatePanelStatuses();

  // Reset and render
  activeLevel = null;
  goToStep(0);
}


function buildLevelIfNeeded(levelNum) {
  if (activeLevel === levelNum) return;

  const gameData = GAMES[logData.game];
  const parser = new VGDLParser();
  currentGame = parser.parseGame(gameData.description);
  const lvlStr = gameData.levels[levelNum];
  if (!lvlStr) {
    console.error('Level', levelNum, 'not found for game', logData.game);
    return;
  }
  currentLevel = currentGame.buildLevel(lvlStr);
  activeLevel = levelNum;

  levelTextEl.value = lvlStr;
  renderer.resize(currentLevel.width, currentLevel.height);
}


function gridStateToPixelState(gridState, blockSize) {
  const pixelSprites = {};
  for (const [key, spriteList] of Object.entries(gridState.sprites)) {
    pixelSprites[key] = spriteList.map(s => ({
      id: s.id,
      key: s.key,
      x: s.col * blockSize,
      y: s.row * blockSize,
      w: blockSize,
      h: blockSize,
      alive: s.alive,
      resources: s.resources || {},
      speed: s.speed,
      cooldown: s.cooldown,
      orientation: s.orientation,
      _age: s._age,
      lastmove: s.lastmove,
    }));
  }
  return {
    score: gridState.score,
    time: gridState.time,
    sprites: pixelSprites,
  };
}


function goToStep(index) {
  const maxIdx = replaySteps.length;
  if (index < 0) index = 0;
  if (index > maxIdx) index = maxIdx;

  currentStepIndex = index;

  // Determine level number
  let levelNum;
  if (index < replaySteps.length) {
    levelNum = replaySteps[index].level !== undefined
      ? replaySteps[index].level
      : (logData.start_level || 0);
  } else {
    const lastStep = replaySteps[replaySteps.length - 1];
    levelNum = lastStep.level !== undefined ? lastStep.level : (logData.start_level || 0);
  }

  buildLevelIfNeeded(levelNum);

  const stateIdx = index;
  if (stateIdx < 0 || stateIdx >= states.length) return;

  const gridState = states[stateIdx];
  const blockSize = currentLevel.block_size;
  const pixelState = gridStateToPixelState(gridState, blockSize);

  currentLevel.setGameState(pixelState);
  currentLevel.ended = gridState.ended || false;
  currentLevel.won = gridState.won || false;
  currentLevel.lose = !!(gridState.ended && !gridState.won);
  currentLevel.score = gridState.score || 0;
  currentLevel.time = gridState.time || 0;

  renderer.render(currentLevel);

  // Update UI
  updateStepLabel();
  updateActionLogHighlight();
  scrubber.value = index;

  // Update all representation panels
  updateAllPanels(stateIdx);
}


// ============================================================
// Playback controls
// ============================================================

function stepForward() { goToStep(currentStepIndex + 1); }
function stepBackward() { goToStep(currentStepIndex - 1); }

function togglePlayback() {
  if (playInterval !== null) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  if (playInterval !== null) return;
  btnPlayPause.textContent = 'Pause';
  playSpeed = Number(speedSelect.value) || 2;
  playInterval = setInterval(() => {
    if (currentStepIndex >= replaySteps.length) {
      stopPlayback();
      return;
    }
    stepForward();
  }, 1000 / playSpeed);
}

function stopPlayback() {
  if (playInterval !== null) {
    clearInterval(playInterval);
    playInterval = null;
  }
  btnPlayPause.textContent = 'Play';
}


// ============================================================
// UI updates
// ============================================================

function updateStepLabel() {
  const total = replaySteps.length;
  if (currentStepIndex >= total) {
    stepLabel.textContent = 'Final / ' + total + ' steps';
  } else {
    const step = replaySteps[currentStepIndex];
    const lvl = step.level !== undefined ? step.level : '?';
    const att = step.attempt !== undefined ? step.attempt : '?';
    stepLabel.textContent = 'Step ' + (currentStepIndex + 1) + ' / ' + total +
      ' (L' + lvl + ' A' + att + ')';
  }
}


function buildActionLog() {
  actionLogEl.innerHTML = '';
  let prevLevel = null;
  let prevAttempt = null;

  for (let i = 0; i < replaySteps.length; i++) {
    const step = replaySteps[i];
    const lvl = step.level;
    const att = step.attempt;

    if (lvl !== prevLevel || att !== prevAttempt) {
      const sep = document.createElement('div');
      sep.className = 'log-separator';
      sep.textContent = '--- Level ' + lvl + ', Attempt ' + att + ' ---';
      actionLogEl.appendChild(sep);
      prevLevel = lvl;
      prevAttempt = att;
    }

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.dataset.index = i;
    entry.textContent = step.action_log || ('[' + (i + 1) + '] ' + (step.action || '').toUpperCase());

    if (step.won) entry.textContent += ' [WIN]';
    if (step.lose) entry.textContent += ' [LOSE]';

    entry.addEventListener('click', () => {
      stopPlayback();
      goToStep(i);
    });
    actionLogEl.appendChild(entry);
  }
}


function updateActionLogHighlight() {
  const entries = actionLogEl.querySelectorAll('.log-entry');
  for (const entry of entries) {
    const idx = Number(entry.dataset.index);
    entry.classList.toggle('current-step', idx === currentStepIndex);
  }
  const current = actionLogEl.querySelector('.log-entry.current-step');
  if (current) {
    current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}


function updateDataAvailability() {
  const lines = [];
  const featureLabels = {
    human_fmri: 'Human fMRI',
    ddqn: 'DDQN',
    ez: 'EfficientZero',
    deepseek: 'DeepSeek R1',
  };
  for (const [key, label] of Object.entries(featureLabels)) {
    const data = featureData[key];
    if (data && data.behavioral_indices) {
      const nFeatures = data.behavioral_indices.length;
      const dims = data.dim || '?';
      const minIdx = data.behavioral_indices[0];
      const maxIdx = data.behavioral_indices[nFeatures - 1];
      lines.push(label + ': ' + nFeatures + ' features, dim=' + dims +
        ' (states ' + minIdx + '-' + maxIdx + ')');
    } else {
      lines.push(label + ': not available');
    }
  }
  dataAvailability.textContent = lines.join('\n');
}


function updatePanelStatuses() {
  for (const key of Object.keys(panels)) {
    const panel = panels[key];
    const data = featureData[key];
    if (data && data.behavioral_indices) {
      panel.status.textContent = data.behavioral_indices.length + ' pts';
      panel.status.style.color = '#4a4';
      panel.placeholder.style.display = 'none';
      panel.canvas.style.display = 'block';
    } else {
      panel.status.textContent = 'no data';
      panel.status.style.color = '#999';
      panel.placeholder.style.display = 'block';
      panel.canvas.style.display = 'none';
    }
  }
}


// ============================================================
// Representation panel updates
// ============================================================

function updateAllPanels(stepIndex) {
  for (const key of Object.keys(panels)) {
    updatePanel(key, stepIndex, featureData[key]);
  }
}


function updatePanel(panelKey, stepIndex, data) {
  const panel = panels[panelKey];
  if (!data || !panel) return;

  const cvs = panel.canvas;
  const ctx = cvs.getContext('2d');

  // Use nearest-neighbor lookup via behavioral_indices
  const stepFeatures = findFeatureForStep(data, stepIndex);

  if (!stepFeatures) {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = '#999';
    ctx.font = '13px "EB Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data at state ' + stepIndex, cvs.width / 2, cvs.height / 2);
    return;
  }

  drawFeatureHeatmap(ctx, cvs.width, cvs.height, stepFeatures, stepIndex);
}


function drawFeatureHeatmap(ctx, w, h, features, stepIndex) {
  ctx.clearRect(0, 0, w, h);

  if (!Array.isArray(features) || features.length === 0) {
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#999';
    ctx.font = '13px "EB Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillText('No features at state ' + stepIndex, w / 2, h / 2);
    return;
  }

  // Find min/max for normalization
  let min = Infinity, max = -Infinity;
  for (const v of features) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;

  // Determine grid layout
  const n = features.length;
  const cols = Math.ceil(Math.sqrt(n * (w / h)));
  const rows = Math.ceil(n / cols);
  const cellW = w / cols;
  const cellH = h / rows;

  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const norm = (features[i] - min) / range;

    const r = Math.round(norm * 255);
    const b = Math.round((1 - norm) * 255);
    const g = Math.round(Math.min(norm, 1 - norm) * 2 * 128);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(col * cellW, row * cellH, cellW + 0.5, cellH + 0.5);
  }

  // Step label overlay
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(0, h - 18, 80, 18);
  ctx.fillStyle = '#333';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('state ' + stepIndex, 4, h - 5);
}


// ============================================================
// Event wiring
// ============================================================

btnStepBack.addEventListener('click', () => { stopPlayback(); stepBackward(); });
btnStepFwd.addEventListener('click', () => { stopPlayback(); stepForward(); });
btnPlayPause.addEventListener('click', () => togglePlayback());

speedSelect.addEventListener('change', () => {
  if (playInterval !== null) {
    stopPlayback();
    startPlayback();
  }
});

scrubber.addEventListener('input', () => {
  stopPlayback();
  goToStep(Number(scrubber.value));
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
  if (!logData) return;

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      stopPlayback();
      stepBackward();
      break;
    case 'ArrowRight':
      e.preventDefault();
      stopPlayback();
      stepForward();
      break;
    case ' ':
      e.preventDefault();
      togglePlayback();
      break;
    case 'Home':
      e.preventDefault();
      stopPlayback();
      goToStep(0);
      break;
    case 'End':
      e.preventDefault();
      stopPlayback();
      goToStep(replaySteps.length);
      break;
  }
});


// ============================================================
// Initialization
// ============================================================
loadManifest();
