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
//             "human_fmri": {                          // object = has variants
//               "default": "sub-13/bait_vgfmri4_fmri.json",
//               "variants": {
//                 "whole_brain": "sub-13/bait_vgfmri4_fmri.json",
//                 "AG": "sub-13/bait_vgfmri4_fmri_roi_AG.json",
//                 ...
//               }
//             },
//             "deepseek": {
//               "default": "sub-13/bait_vgfmri4_deepseek.json",
//               "variants": {
//                 "layer_27": "sub-13/bait_vgfmri4_deepseek.json",
//                 "layer_0": "sub-13/bait_vgfmri4_deepseek_layer_0.json",
//                 ...
//               }
//             },
//             "ez": "sub-13/bait_vgfmri4_ez.json"     // string = no variants
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
    variantSelect: document.getElementById('variant-human_fmri'),
  },
  ddqn: {
    canvas: document.getElementById('canvas-ddqn'),
    status: document.getElementById('panel-ddqn-status'),
    placeholder: document.getElementById('placeholder-ddqn'),
    variantSelect: null,
  },
  ez: {
    canvas: document.getElementById('canvas-ez'),
    status: document.getElementById('panel-ez-status'),
    placeholder: document.getElementById('placeholder-ez'),
    variantSelect: null,
  },
  deepseek: {
    canvas: document.getElementById('canvas-deepseek'),
    status: document.getElementById('panel-deepseek-status'),
    placeholder: document.getElementById('placeholder-deepseek'),
    variantSelect: document.getElementById('variant-deepseek'),
  },
};

// Currently loaded game entry from manifest (needed for variant switching)
let currentGameEntry = null;

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

  // Store game entry for variant switching
  currentGameEntry = gameEntry;

  // Load feature data in parallel
  // Feature entries can be a plain string path or {default, variants} object.
  loadStatus.textContent = 'Loading features...';
  const featureKeys = ['human_fmri', 'ddqn', 'ez', 'deepseek'];
  const featurePromises = featureKeys.map(async (key) => {
    if (!gameEntry.features || !gameEntry.features[key]) return null;
    const entry = gameEntry.features[key];
    // Resolve the default path: string = direct path, object = entry.default
    const path = (typeof entry === 'string') ? entry : entry.default;
    if (!path) return null;
    const url = `${DATA_BASE}/${path}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    return r.json();
  });

  const featureResults = await Promise.all(featurePromises);
  for (let i = 0; i < featureKeys.length; i++) {
    featureData[featureKeys[i]] = featureResults[i];
  }

  // Populate variant dropdowns
  populateVariantDropdowns(gameEntry);

  loadStatus.textContent = '';
  btnLoad.disabled = false;

  // Initialize replay
  loadReplay(replayJson, subj);
}

btnLoad.addEventListener('click', loadSelectedData);


// ============================================================
// Variant dropdown logic
// ============================================================

/**
 * Populate variant <select> dropdowns from the manifest's feature entries.
 * If a feature entry has a 'variants' dict, populate and enable the dropdown.
 * Otherwise, reset to single "--" option and disable.
 */
function populateVariantDropdowns(gameEntry) {
  for (const key of Object.keys(panels)) {
    const panel = panels[key];
    const sel = panel.variantSelect;
    if (!sel) continue;

    sel.innerHTML = '<option value="">--</option>';
    sel.disabled = true;

    if (!gameEntry.features || !gameEntry.features[key]) continue;
    const entry = gameEntry.features[key];
    if (typeof entry === 'string' || !entry.variants) continue;

    const variants = entry.variants;
    const variantNames = Object.keys(variants);
    if (variantNames.length <= 1) continue;

    // Find which variant name corresponds to the default path
    const defaultPath = entry.default;
    let defaultVariant = variantNames[0];
    for (const name of variantNames) {
      if (variants[name] === defaultPath) {
        defaultVariant = name;
        break;
      }
    }

    sel.innerHTML = '';
    for (const name of variantNames) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === defaultVariant) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.disabled = false;
  }
}


/**
 * Handle variant dropdown change: fetch the selected variant's JSON,
 * replace featureData for that panel, and re-render.
 */
async function onVariantChange(panelKey) {
  const panel = panels[panelKey];
  const sel = panel.variantSelect;
  if (!sel || !currentGameEntry) return;

  const entry = currentGameEntry.features[panelKey];
  if (!entry || typeof entry === 'string' || !entry.variants) return;

  const variantName = sel.value;
  if (!variantName) return;

  const path = entry.variants[variantName];
  if (!path) return;

  // Show loading state
  panel.status.textContent = 'loading...';
  panel.status.style.color = '#888';

  const url = `${DATA_BASE}/${path}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    panel.status.textContent = 'load failed';
    panel.status.style.color = '#c44';
    return;
  }

  featureData[panelKey] = await resp.json();
  updatePanelStatuses();
  updateDataAvailability();
  updateAllPanels(currentStepIndex);
}


// Wire up variant change events, keyboard navigation, and panel click-to-focus
for (const key of Object.keys(panels)) {
  const sel = panels[key].variantSelect;
  if (!sel) continue;

  sel.addEventListener('change', () => onVariantChange(key));

  // Clicking anywhere on the panel body focuses the variant selector
  const panelBody = panels[key].canvas.parentElement;
  panelBody.addEventListener('click', () => {
    if (!sel.disabled) sel.focus();
  });

  // Explicit Up/Down keyboard cycling (native <select> behavior is
  // inconsistent across browsers, especially on macOS)
  sel.addEventListener('keydown', (e) => {
    if (sel.disabled || sel.options.length <= 1) return;

    let newIdx = sel.selectedIndex;
    if (e.key === 'ArrowDown') {
      newIdx = Math.min(sel.selectedIndex + 1, sel.options.length - 1);
    } else if (e.key === 'ArrowUp') {
      newIdx = Math.max(sel.selectedIndex - 1, 0);
    } else {
      return;
    }

    e.preventDefault();
    if (newIdx !== sel.selectedIndex) {
      sel.selectedIndex = newIdx;
      onVariantChange(key);
    }
  });
}


// ============================================================
// Feature lookup helpers for RSA visualization
// ============================================================

/**
 * Count how many feature vectors have behavioral_indices[i] <= stepIndex.
 * Uses binary search. Returns 0 if no features collected yet.
 */
function collectFeaturesUpTo(data, stepIndex) {
  if (!data || !data.behavioral_indices) return 0;

  const indices = data.behavioral_indices;
  if (indices.length === 0 || stepIndex < indices[0]) return 0;

  // Binary search for rightmost index <= stepIndex
  let lo = 0, hi = indices.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (indices[mid] <= stepIndex) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo + 1; // count = index + 1
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
  const w = cvs.width;
  const h = cvs.height;

  const count = collectFeaturesUpTo(data, stepIndex);

  if (count === 0) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#999';
    ctx.font = '13px "EB Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data at state ' + stepIndex, w / 2, h / 2);
    return;
  }

  renderPanelRSA(ctx, w, h, data, count);
}


// ============================================================
// Colormap helpers
// ============================================================

/**
 * Viridis colormap (perceptually uniform, dark purple -> teal -> yellow).
 * t in [0, 1]. Returns [r, g, b] each in 0-255.
 */
function colormapViridis(t) {
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  // Control points sampled from the matplotlib viridis colormap
  const stops = [
    [0.0,  68,   1,  84],
    [0.25, 59,  82, 139],
    [0.5,  33, 145, 140],
    [0.75, 94, 201,  98],
    [1.0, 253, 231,  37],
  ];
  // Find the two surrounding stops
  let lo = 0;
  for (let i = 1; i < stops.length; i++) {
    if (stops[i][0] <= t) lo = i;
  }
  if (lo === stops.length - 1) return [stops[lo][1], stops[lo][2], stops[lo][3]];
  const hi = lo + 1;
  const f = (t - stops[lo][0]) / (stops[hi][0] - stops[lo][0]);
  return [
    Math.round(stops[lo][1] + f * (stops[hi][1] - stops[lo][1])),
    Math.round(stops[lo][2] + f * (stops[hi][2] - stops[lo][2])),
    Math.round(stops[lo][3] + f * (stops[hi][3] - stops[lo][3])),
  ];
}

/**
 * Diverging blue-white-red colormap.
 * t in [0, 1]: 0 = blue, 0.5 = white, 1 = red.
 * Returns [r, g, b] each in 0-255.
 */
function colormapDiverging(t) {
  // Clamp
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  let r, g, b;
  if (t < 0.5) {
    // blue -> white
    const s = t * 2; // 0..1
    r = Math.round(s * 255);
    g = Math.round(s * 255);
    b = 255;
  } else {
    // white -> red
    const s = (t - 0.5) * 2; // 0..1
    r = 255;
    g = Math.round((1 - s) * 255);
    b = Math.round((1 - s) * 255);
  }
  return [r, g, b];
}


// ============================================================
// RSA L-shaped panel rendering
// ============================================================

/**
 * Render the L-shaped RSA layout on a single canvas:
 *
 *   [count label]  [feature-top: (dim x count) transposed]
 *   [feature-left]  [RDM: count x count]
 *
 * Margin = 60px for the label/feature bars.
 */
function renderPanelRSA(ctx, w, h, data, count) {
  const margin = 60;
  const rdmW = w - margin;
  const rdmH = h - margin;

  ctx.clearRect(0, 0, w, h);

  // -- Top-left corner: count label --
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, margin, margin);
  ctx.fillStyle = '#333';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('n=' + count, margin / 2, margin / 2);

  // -- Compute feature min/max across collected features --
  const features = data.features;
  const dim = data.dim || (features[0] ? features[0].length : 0);
  let fMin = Infinity, fMax = -Infinity;
  for (let i = 0; i < count; i++) {
    const row = features[i];
    for (let j = 0; j < dim; j++) {
      const v = row[j];
      if (v < fMin) fMin = v;
      if (v > fMax) fMax = v;
    }
  }
  const fRange = fMax - fMin || 1;

  // -- Feature-top bar: above the RDM, dims as rows, time steps as columns --
  // Region: x=[margin, w), y=[0, margin), size = rdmW x margin
  // Data: for each column c in [0, count), row d in [0, dim): features[c][d]
  if (rdmW > 0 && margin > 0) {
    const imgTop = ctx.createImageData(rdmW, margin);
    const dTop = imgTop.data;
    for (let py = 0; py < margin; py++) {
      // Which feature dimension does this row map to?
      const d = Math.floor(py * dim / margin);
      const dClamped = Math.min(d, dim - 1);
      for (let px = 0; px < rdmW; px++) {
        // Which time step does this column map to?
        const c = Math.floor(px * count / rdmW);
        const cClamped = Math.min(c, count - 1);
        const val = features[cClamped][dClamped];
        const t = (val - fMin) / fRange;
        const [r, g, b] = colormapViridis(t);
        const idx = (py * rdmW + px) * 4;
        dTop[idx] = r;
        dTop[idx + 1] = g;
        dTop[idx + 2] = b;
        dTop[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgTop, margin, 0);
  }

  // -- Feature-left bar: left of the RDM, time steps as rows, dims as columns --
  // Region: x=[0, margin), y=[margin, h), size = margin x rdmH
  // Data: for each row r in [0, count): features[r][d] across d in [0, dim)
  if (margin > 0 && rdmH > 0) {
    const imgLeft = ctx.createImageData(margin, rdmH);
    const dLeft = imgLeft.data;
    for (let py = 0; py < rdmH; py++) {
      const r = Math.floor(py * count / rdmH);
      const rClamped = Math.min(r, count - 1);
      for (let px = 0; px < margin; px++) {
        const d = Math.floor(px * dim / margin);
        const dClamped = Math.min(d, dim - 1);
        const val = features[rClamped][dClamped];
        const t = (val - fMin) / fRange;
        const [cr, cg, cb] = colormapViridis(t);
        const idx = (py * margin + px) * 4;
        dLeft[idx] = cr;
        dLeft[idx + 1] = cg;
        dLeft[idx + 2] = cb;
        dLeft[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgLeft, 0, margin);
  }

  // -- RDM center: count x count submatrix --
  // Region: x=[margin, w), y=[margin, h), size = rdmW x rdmH
  if (rdmW > 0 && rdmH > 0 && data.rdm) {
    const rdm = data.rdm;

    // Find actual min/max of the visible RDM submatrix for proper normalization.
    // Theoretical range is 0-2, but real data often clusters in a narrow band.
    let rdmMin = Infinity, rdmMax = -Infinity;
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        const v = rdm[i][j];
        if (v < rdmMin) rdmMin = v;
        if (v > rdmMax) rdmMax = v;
      }
    }
    const rdmRange = rdmMax - rdmMin || 1;

    const imgRdm = ctx.createImageData(rdmW, rdmH);
    const dRdm = imgRdm.data;
    for (let py = 0; py < rdmH; py++) {
      const ri = Math.floor(py * count / rdmH);
      const riC = Math.min(ri, count - 1);
      for (let px = 0; px < rdmW; px++) {
        const ci = Math.floor(px * count / rdmW);
        const ciC = Math.min(ci, count - 1);
        const val = rdm[riC][ciC];
        // Normalize to actual data range: min -> 0 (blue), max -> 1 (red)
        const t = (val - rdmMin) / rdmRange;
        const [r, g, b] = colormapDiverging(t);
        const idx = (py * rdmW + px) * 4;
        dRdm[idx] = r;
        dRdm[idx + 1] = g;
        dRdm[idx + 2] = b;
        dRdm[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgRdm, margin, margin);
  }

  // -- Separator lines --
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  // Vertical line between left bar and RDM
  ctx.beginPath();
  ctx.moveTo(margin, 0);
  ctx.lineTo(margin, h);
  ctx.stroke();
  // Horizontal line between top bar and RDM
  ctx.beginPath();
  ctx.moveTo(0, margin);
  ctx.lineTo(w, margin);
  ctx.stroke();
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
