// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// Narrator page: game loop with action tracking + LLM narration
import { setupRegistry } from './engine/setup-registry.js';
import { VGDLParser } from './engine/parser.js';
import { ACTION } from './engine/action.js';
import { Renderer } from './renderer.js';
import { GAMES } from './games/game-data.js';
import {
  ObjectIDMapper,
  buildSpriteSnapshot,
  formatState,
  logAction,
  buildPrompt,
  callNarrator,
} from './narrator.js';

// Initialize the registry once
setupRegistry();

// --- DOM elements ---
const gameDesc = document.getElementById('game-desc');
const levelText = document.getElementById('level-text');
const canvas = document.getElementById('game-canvas');
const btnPlay = document.getElementById('btn-play');
const btnReset = document.getElementById('btn-reset');
const btnCog = document.getElementById('btn-cog');
const btnCreateEnv = document.getElementById('btn-create-env');
const playIcon = document.getElementById('play-icon');
const tickModeSelect = document.getElementById('tick-mode');
const speedPopover = document.getElementById('speed-popover');
const flapTabDesc = document.getElementById('flap-tab-desc');
const flapTabLevel = document.getElementById('flap-tab-level');
const flapPanelDesc = document.getElementById('flap-panel-desc');
const flapPanelLevel = document.getElementById('flap-panel-level');
const libraryList = document.getElementById('library-list');
const actionLogEl = document.getElementById('action-log');

// Narrator DOM
const btnGenerateDraft = document.getElementById('btn-generate-draft');
const btnSendNarrate = document.getElementById('btn-send-narrate');
const draftSection = document.getElementById('draft-section');
const draftSystemPrompt = document.getElementById('draft-system-prompt');
const draftUserMessage = document.getElementById('draft-user-message');
const narrativePanel = document.getElementById('narrative-panel');
const narrativeContent = document.getElementById('narrative-content');
const narrativeLoading = document.getElementById('narrative-loading');
const apiKeyInput = document.getElementById('narrator-api-key');
const modelInput = document.getElementById('narrator-model');
const promptVariantSelect = document.getElementById('narrator-variant');
const historyLimitInput = document.getElementById('narrator-history-limit');

const renderer = new Renderer(canvas, 30);

let currentGame = null;
let currentLevel = null;
let playing = false;
let gameLoopId = null;

// Flap state
let activeFlap = null;

// Modification detection snapshots
let loadedDescSnapshot = '';
let loadedLevelSnapshot = '';

// --- Action tracking ---
const idMapper = new ObjectIDMapper();
let actionHistory = [];
let stepCounter = 0;
let prevSnapshot = null;
let lastActionIndex = null;

// Max log entries shown in the action log panel
const MAX_LOG_DISPLAY = 100;

// --- Tick mode ---
function getTickMode() {
  const val = tickModeSelect.value;
  if (val === 'action') return 'action';
  return Number(val);
}

// --- Keyboard ---
const keysDown = new Set();
let lastKeyPressed = null;

canvas.addEventListener('keydown', (e) => {
  const k = keyMap(e.key);
  if (k) {
    e.preventDefault();
    keysDown.add(k);
    lastKeyPressed = k;
    if (!playing) startPlaying();
    if (getTickMode() === 'action') doTick();
  }
});

canvas.addEventListener('keyup', (e) => {
  const k = keyMap(e.key);
  if (k) keysDown.delete(k);
});

function keyMap(key) {
  switch (key) {
    case 'ArrowUp': case 'w': return 'UP';
    case 'ArrowDown': case 's': return 'DOWN';
    case 'ArrowLeft': case 'a': return 'LEFT';
    case 'ArrowRight': case 'd': return 'RIGHT';
    case ' ': return 'SPACE';
    default: return null;
  }
}

function getAction() {
  const key = lastKeyPressed || [...keysDown][0] || null;
  lastKeyPressed = null;
  switch (key) {
    case 'SPACE': return ACTION.SPACE;
    case 'UP':    return ACTION.UP;
    case 'DOWN':  return ACTION.DOWN;
    case 'LEFT':  return ACTION.LEFT;
    case 'RIGHT': return ACTION.RIGHT;
    default:      return ACTION.NOOP;
  }
}

function actionToIndex(action) {
  if (action === ACTION.UP) return 0;
  if (action === ACTION.DOWN) return 1;
  if (action === ACTION.LEFT) return 2;
  if (action === ACTION.RIGHT) return 3;
  if (action === ACTION.NOOP) return 4;
  if (action === ACTION.SPACE) return 5;
  return 4;
}

// --- Game lifecycle ---

function initTracking() {
  actionHistory = [];
  stepCounter = 0;
  idMapper.reset();
  lastActionIndex = null;
  prevSnapshot = buildSpriteSnapshot(currentLevel);

  // Register all initial objects with idMapper for stable IDs
  for (const obj of Object.values(prevSnapshot)) {
    if (!obj.isAvatar && obj.key !== 'wall' && obj.key !== 'floor' && obj.key !== 'background') {
      idMapper.getAbstractId(obj.id);
    }
  }

  // Clear action log display
  actionLogEl.innerHTML = '';
}

function loadGame() {
  stopPlaying();
  const descStr = gameDesc.value;
  const lvlStr = levelText.value;

  const parser = new VGDLParser();
  currentGame = parser.parseGame(descStr);
  currentLevel = currentGame.buildLevel(lvlStr);

  renderer.resize(currentLevel.width, currentLevel.height);
  renderer.render(currentLevel);

  initTracking();

  loadedDescSnapshot = descStr;
  loadedLevelSnapshot = lvlStr;
  btnCreateEnv.style.display = 'none';

  canvas.focus();
}

function doTick() {
  if (!currentLevel || currentLevel.ended) {
    stopPlaying();
    return;
  }

  // Capture pre-tick snapshot
  prevSnapshot = buildSpriteSnapshot(currentLevel);

  const action = getAction();
  const actionIdx = actionToIndex(action);
  currentLevel.tick(action);

  // Capture post-tick snapshot and log
  const currSnapshot = buildSpriteSnapshot(currentLevel);
  stepCounter++;
  const logStr = logAction(
    stepCounter, actionIdx, prevSnapshot, currSnapshot,
    currentLevel.events_triggered, currentLevel, idMapper
  );
  actionHistory.push(logStr);
  lastActionIndex = actionIdx;
  prevSnapshot = currSnapshot;

  // Update action log display (show last N entries)
  appendLogEntry(logStr);

  renderer.render(currentLevel);
}

function appendLogEntry(logStr) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = logStr;
  actionLogEl.appendChild(entry);

  // Trim if too many
  while (actionLogEl.children.length > MAX_LOG_DISPLAY) {
    actionLogEl.removeChild(actionLogEl.firstChild);
  }

  // Auto-scroll to bottom
  actionLogEl.scrollTop = actionLogEl.scrollHeight;
}

function startPlaying() {
  const mode = getTickMode();
  if (mode === 'action') return;
  if (playing) return;
  playing = true;
  playIcon.src = 'pause.png';
  playIcon.alt = 'pause';
  gameLoopId = setInterval(doTick, 1000 / mode);
}

function stopPlaying() {
  playing = false;
  playIcon.src = 'play.png';
  playIcon.alt = 'play';
  if (gameLoopId !== null) {
    clearInterval(gameLoopId);
    gameLoopId = null;
  }
}

function togglePlay() {
  if (playing) stopPlaying();
  else startPlaying();
  canvas.focus();
}

function resetGame() {
  stopPlaying();
  if (currentLevel) {
    currentLevel.reset();
    renderer.render(currentLevel);
    initTracking();
  }
}

// --- Flap tabs ---
function toggleFlap(which) {
  if (activeFlap === which) {
    activeFlap = null;
    flapTabDesc.classList.remove('active');
    flapTabLevel.classList.remove('active');
    flapPanelDesc.classList.remove('open');
    flapPanelLevel.classList.remove('open');
    return;
  }
  stopPlaying();
  activeFlap = which;
  flapTabDesc.classList.toggle('active', which === 'desc');
  flapTabLevel.classList.toggle('active', which === 'level');
  flapPanelDesc.classList.toggle('open', which === 'desc');
  flapPanelLevel.classList.toggle('open', which === 'level');
}

// --- Modification detection ---
function checkModifications() {
  const descChanged = gameDesc.value !== loadedDescSnapshot;
  const levelChanged = levelText.value !== loadedLevelSnapshot;
  btnCreateEnv.style.display = (descChanged || levelChanged) ? 'block' : 'none';
}

// --- Speed popover ---
function toggleSpeedPopover() {
  speedPopover.classList.toggle('open');
}

// --- Library ---
function buildLibrary() {
  libraryList.innerHTML = '';
  for (const [name, game] of Object.entries(GAMES)) {
    const el = document.createElement('div');
    el.className = 'library-game';

    const header = document.createElement('div');
    header.className = 'library-game-header';
    const title = document.createElement('span');
    title.textContent = name;
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '>';
    header.appendChild(title);
    header.appendChild(arrow);
    header.addEventListener('click', () => el.classList.toggle('expanded'));

    const body = document.createElement('div');
    body.className = 'library-game-body';

    const levelNums = Object.keys(game.levels).map(Number).sort((a, b) => a - b);
    for (const n of levelNums) {
      const lvlItem = document.createElement('div');
      lvlItem.className = 'library-item library-item-level';
      lvlItem.style.cursor = 'pointer';
      lvlItem.textContent = `Level ${n}`;
      lvlItem.addEventListener('click', (e) => {
        e.stopPropagation();
        gameDesc.value = game.description;
        levelText.value = game.levels[n];
        loadGame();
      });
      body.appendChild(lvlItem);
    }

    el.appendChild(header);
    el.appendChild(body);
    libraryList.appendChild(el);
  }
}

function loadDefaultGame() {
  const game = GAMES['bait_vgfmri4'];
  if (!game) return;
  gameDesc.value = game.description;
  const levelNums = Object.keys(game.levels).map(Number).sort((a, b) => a - b);
  const lvl = levelNums.includes(4) ? 4 : levelNums[0];
  levelText.value = game.levels[lvl];
  loadGame();
}

// --- Narrator ---

function loadNarratorSettings() {
  apiKeyInput.value = localStorage.getItem('narrator_api_key') || '';
  const savedModel = localStorage.getItem('narrator_model');
  if (savedModel) modelInput.value = savedModel;
  const savedVariant = localStorage.getItem('narrator_variant');
  if (savedVariant) promptVariantSelect.value = savedVariant;
  const savedLimit = localStorage.getItem('narrator_history_limit');
  if (savedLimit) historyLimitInput.value = savedLimit;
}

function saveNarratorSettings() {
  localStorage.setItem('narrator_api_key', apiKeyInput.value);
  localStorage.setItem('narrator_model', modelInput.value);
  localStorage.setItem('narrator_variant', promptVariantSelect.value);
  localStorage.setItem('narrator_history_limit', historyLimitInput.value);
}

apiKeyInput.addEventListener('change', saveNarratorSettings);
modelInput.addEventListener('change', saveNarratorSettings);
promptVariantSelect.addEventListener('change', saveNarratorSettings);
historyLimitInput.addEventListener('change', saveNarratorSettings);

function renderNarrativeResponse(text) {
  // Strip markdown code fence if present
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    const firstNewline = cleanText.indexOf('\n');
    const lastFence = cleanText.lastIndexOf('```');
    if (lastFence > firstNewline) {
      cleanText = cleanText.slice(firstNewline + 1, lastFence).trim();
    }
  }

  narrativeContent.innerHTML = '';

  // Try to parse as JSON for structured display
  let parsed = null;
  const parseResult = JSON.parse(cleanText);
  parsed = parseResult;

  for (const [key, value] of Object.entries(parsed)) {
    const section = document.createElement('div');
    section.className = 'thought-section';

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = key.replace(/_/g, ' ');
    section.appendChild(label);

    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    section.appendChild(content);

    narrativeContent.appendChild(section);
  }
}

function generateDraft() {
  if (!currentLevel) {
    narrativeContent.innerHTML = '<div class="thought-section"><div class="content">Load a game first.</div></div>';
    narrativePanel.classList.add('visible');
    return;
  }

  const variant = promptVariantSelect.value;
  const historyLimit = parseInt(historyLimitInput.value) || 50;

  // Build state text
  const stateText = formatState(currentLevel, idMapper);

  // Get last action name
  const ACTION_NAMES = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'WAIT', 'ACTION'];
  const lastAction = lastActionIndex !== null ? ACTION_NAMES[lastActionIndex] : 'NONE';

  // Build prompt
  const { systemPrompt, userMessage } = buildPrompt(
    variant, actionHistory, stateText, lastAction, gameDesc.value, historyLimit
  );

  // Fill draft textareas and show the draft section
  draftSystemPrompt.value = systemPrompt;
  draftUserMessage.value = userMessage;
  draftSection.classList.add('visible');
}

async function sendNarrate() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    narrativeContent.innerHTML = '<div class="thought-section"><div class="content">Enter an OpenRouter API key in settings first.</div></div>';
    narrativePanel.classList.add('visible');
    return;
  }

  const model = modelInput.value.trim() || 'deepseek/deepseek-chat-v3-0324';
  const systemPrompt = draftSystemPrompt.value;
  const userMessage = draftUserMessage.value;

  // Show loading
  narrativePanel.classList.add('visible');
  narrativeLoading.style.display = 'block';
  narrativeContent.innerHTML = '';
  btnSendNarrate.disabled = true;

  // Call API with the (possibly edited) prompts
  const response = await callNarrator(apiKey, model, systemPrompt, userMessage);
  narrativeLoading.style.display = 'none';
  btnSendNarrate.disabled = false;
  renderNarrativeResponse(response);
}

// --- Event wiring ---

flapTabDesc.addEventListener('click', () => toggleFlap('desc'));
flapTabLevel.addEventListener('click', () => toggleFlap('level'));

gameDesc.addEventListener('input', checkModifications);
levelText.addEventListener('input', checkModifications);

btnCreateEnv.addEventListener('click', (e) => {
  e.stopPropagation();
  loadGame();
});

btnPlay.addEventListener('click', (e) => {
  e.stopPropagation();
  togglePlay();
});
btnReset.addEventListener('click', (e) => {
  e.stopPropagation();
  resetGame();
  canvas.focus();
});
btnCog.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSpeedPopover();
});

btnGenerateDraft.addEventListener('click', (e) => {
  e.stopPropagation();
  generateDraft();
});
btnSendNarrate.addEventListener('click', (e) => {
  e.stopPropagation();
  sendNarrate();
});

document.addEventListener('click', (e) => {
  if (!speedPopover.contains(e.target) && e.target !== btnCog && !btnCog.contains(e.target)) {
    speedPopover.classList.remove('open');
  }
});

tickModeSelect.addEventListener('change', () => {
  if (playing) {
    stopPlaying();
    startPlaying();
  }
});

canvas.addEventListener('blur', () => {
  keysDown.clear();
  lastKeyPressed = null;
});

document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
  if (e.key === 'Enter') loadGame();
  if (e.key === 'p') togglePlay();
});

// Mobile D-Pad
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const action = btn.dataset.action;
    lastKeyPressed = action;
    doTick();
  });
});

// --- Initialize ---
loadNarratorSettings();
buildLibrary();
loadDefaultGame();
