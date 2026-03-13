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

// Replay mode DOM
const replayDropZone = document.getElementById('replay-drop-zone');
const replayFileInput = document.getElementById('replay-file-input');
const btnStepBack = document.getElementById('btn-step-back');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnStepFwd = document.getElementById('btn-step-fwd');
const stepLabelEl = document.getElementById('step-label');
const replaySpeedSelect = document.getElementById('replay-speed-select');
const scrubber = document.getElementById('step-scrubber');
const btnCloseReplay = document.getElementById('btn-close-replay');
const metaGame = document.getElementById('meta-game');
const metaModel = document.getElementById('meta-model');
const metaOutcome = document.getElementById('meta-outcome');
const agentCommitment = document.getElementById('agent-commitment');
const agentReasoning = document.getElementById('agent-reasoning');
const agentNote = document.getElementById('agent-note');
const narratorColoredContent = document.getElementById('narrator-colored-content');
const replayPromptContent = document.getElementById('replay-prompt-content');
const wrapperEl = document.querySelector('.wrapper');

const renderer = new Renderer(canvas, 30);

let currentGame = null;
let currentLevel = null;
let playing = false;
let gameLoopId = null;

// --- Replay mode state ---
let replayMode = false;
let logData = null;
let replayStates = [];
let replaySteps = [];
let currentStepIndex = 0;
let replayPlayInterval = null;
let replayPlaySpeed = 2;
let replayActiveLevel = null;

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
  if (replayMode) return; // Replay mode uses global keyboard handler
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

  // Choose target container based on mode
  const targetEl = replayMode ? narratorColoredContent : narrativeContent;
  targetEl.innerHTML = '';

  // Try to parse as JSON for structured display
  const parsed = JSON.parse(cleanText);

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

    targetEl.appendChild(section);
  }
}

function generateDraft() {
  if (!currentLevel) {
    const targetEl = replayMode ? narratorColoredContent : narrativeContent;
    targetEl.innerHTML = '<div class="thought-section"><div class="content">Load a game first.</div></div>';
    if (!replayMode) narrativePanel.classList.add('visible');
    return;
  }

  const variant = promptVariantSelect.value;
  const historyLimit = parseInt(historyLimitInput.value) || 50;

  // Build state text from the current loaded game state
  // (works for both interactive and replay mode since goToReplayStep
  // applies the state to currentLevel via setGameState)
  const stateText = formatState(currentLevel, replayMode ? null : idMapper);

  // Get last action name and action history
  let lastAction;
  let history;
  if (replayMode) {
    // Build action history from replay steps up to current index
    history = [];
    for (let i = 0; i < currentStepIndex; i++) {
      const step = replaySteps[i];
      history.push(step.action_log || ('[' + (i + 1) + '] ' + (step.action || '').toUpperCase()));
    }
    // Last action is the one that led to the current state
    if (currentStepIndex > 0) {
      const prevStep = replaySteps[currentStepIndex - 1];
      lastAction = (prevStep.action || 'WAIT').toUpperCase();
    } else {
      lastAction = 'NONE';
    }
  } else {
    history = actionHistory;
    const ACTION_NAMES = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'WAIT', 'ACTION'];
    lastAction = lastActionIndex !== null ? ACTION_NAMES[lastActionIndex] : 'NONE';
  }

  // Build prompt using the narrator's own variant/settings
  const { systemPrompt, userMessage } = buildPrompt(
    variant, history, stateText, lastAction, gameDesc.value, historyLimit
  );

  // Fill draft textareas and show the draft section
  draftSystemPrompt.value = systemPrompt;
  draftUserMessage.value = userMessage;
  draftSection.open = true;
}

async function sendNarrate() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    const targetEl = replayMode ? narratorColoredContent : narrativeContent;
    targetEl.innerHTML = '<div class="thought-section"><div class="content">Enter an OpenRouter API key in settings first.</div></div>';
    if (!replayMode) narrativePanel.classList.add('visible');
    return;
  }

  const model = modelInput.value.trim() || 'deepseek/deepseek-chat-v3-0324';
  const systemPrompt = draftSystemPrompt.value;
  const userMessage = draftUserMessage.value;

  // Show loading
  if (!replayMode) narrativePanel.classList.add('visible');
  narrativeLoading.style.display = 'block';
  const targetEl = replayMode ? narratorColoredContent : narrativeContent;
  targetEl.innerHTML = '';
  btnSendNarrate.disabled = true;

  // Call API with the (possibly edited) prompts
  const response = await callNarrator(apiKey, model, systemPrompt, userMessage);
  narrativeLoading.style.display = 'none';
  btnSendNarrate.disabled = false;
  renderNarrativeResponse(response);
}

// =====================================================================
// --- Replay Mode ---
// =====================================================================

// --- File loading ---

async function handleReplayFile(file) {
  let text;
  if (file.name.endsWith('.gz')) {
    const ds = new DecompressionStream('gzip');
    const decompressed = file.stream().pipeThrough(ds);
    text = await new Response(decompressed).text();
  } else {
    text = await file.text();
  }
  const jsonObj = JSON.parse(text);
  loadReplay(jsonObj);
}

function loadReplay(jsonObj) {
  if (!jsonObj.states || !Array.isArray(jsonObj.states)) {
    alert('Invalid replay file: missing "states" array. Run export_replay first.');
    return;
  }
  if (!jsonObj.game || !GAMES[jsonObj.game]) {
    alert('Unknown game: ' + (jsonObj.game || '(none)') + '. Not found in GAMES registry.');
    return;
  }

  logData = jsonObj;
  replayStates = jsonObj.states;
  replaySteps = jsonObj.steps || [];

  // Update metadata
  metaGame.textContent = 'Game: ' + logData.game;
  metaModel.textContent = 'Model: ' + (logData.model || '--');
  metaOutcome.textContent = 'Outcome: ' + (logData.outcome || '--');

  // Set up scrubber
  scrubber.min = 0;
  scrubber.max = replaySteps.length;
  scrubber.value = 0;

  // Populate game description flap
  const gameData = GAMES[logData.game];
  gameDesc.value = gameData.description;

  // Enter replay mode
  enterReplayMode();

  // Build action log and render first step
  buildReplayActionLog();
  replayActiveLevel = null;
  goToReplayStep(0);
}

// --- Mode switching ---

function enterReplayMode() {
  // Stop any interactive game loop
  stopPlaying();
  replayMode = true;
  wrapperEl.classList.add('replay-mode');

  // Clear the narrator colored content for fresh start
  narratorColoredContent.innerHTML =
    '<div class="thought-section"><div class="content" style="color:#888">' +
    'Click "Generate Prompt Draft" then "Send to LLM"</div></div>';
}

function exitReplayMode() {
  stopReplayPlayback();
  replayMode = false;
  wrapperEl.classList.remove('replay-mode');

  // Clear replay state
  logData = null;
  replayStates = [];
  replaySteps = [];
  currentStepIndex = 0;
  replayActiveLevel = null;

  // Hide draft section
  draftSection.open = false;

  // Reload default game
  loadDefaultGame();
}

// --- Replay rendering ---

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

function buildReplayLevelIfNeeded(levelNum) {
  if (replayActiveLevel === levelNum) return;

  const gameData = GAMES[logData.game];
  const parser = new VGDLParser();
  currentGame = parser.parseGame(gameData.description);
  const lvlStr = gameData.levels[levelNum];
  if (!lvlStr) {
    console.error('Level', levelNum, 'not found for game', logData.game);
    return;
  }
  currentLevel = currentGame.buildLevel(lvlStr);
  replayActiveLevel = levelNum;

  // Update level layout flap
  levelText.value = lvlStr;

  renderer.resize(currentLevel.width, currentLevel.height);
}

function goToReplayStep(index) {
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

  buildReplayLevelIfNeeded(levelNum);

  const stateIdx = index;
  if (stateIdx < 0 || stateIdx >= replayStates.length) return;

  const gridState = replayStates[stateIdx];
  const blockSize = currentLevel.block_size;
  const pixelState = gridStateToPixelState(gridState, blockSize);

  currentLevel.setGameState(pixelState);
  currentLevel.ended = gridState.ended || false;
  currentLevel.won = gridState.won || false;
  currentLevel.lose = !!(gridState.ended && !gridState.won);
  currentLevel.score = gridState.score || 0;
  currentLevel.time = gridState.time || 0;

  renderer.render(currentLevel);

  // Update all UI
  updateReplayStepLabel();
  updateReplayThoughtPanel();
  updateReplayActionLogHighlight();
  updateReplayPromptContent();
  scrubber.value = index;
}

// --- Replay UI updates ---

function updateReplayStepLabel() {
  const total = replaySteps.length;
  if (currentStepIndex >= total) {
    stepLabelEl.textContent = 'Final / ' + total + ' steps';
  } else {
    const step = replaySteps[currentStepIndex];
    const lvl = step.level !== undefined ? step.level : '?';
    const att = step.attempt !== undefined ? step.attempt : '?';
    stepLabelEl.textContent = 'Step ' + (currentStepIndex + 1) + ' / ' + total +
      ' (L' + lvl + ' A' + att + ')';
  }
}

function updateReplayThoughtPanel() {
  if (currentStepIndex >= replaySteps.length) {
    agentCommitment.textContent = '(final state after last action)';
    agentReasoning.textContent = '--';
    agentNote.textContent = '--';
    return;
  }

  const step = replaySteps[currentStepIndex];
  const response = step.response || {};

  agentCommitment.textContent = response.commitment || '--';
  agentReasoning.textContent = response.reasoning || '--';

  let note = response.note_to_self || '--';
  if (typeof note === 'object') {
    note = JSON.stringify(note, null, 2);
  }
  agentNote.textContent = note;
}

function updateReplayPromptContent() {
  if (currentStepIndex >= replaySteps.length) {
    replayPromptContent.textContent = '(final state -- no prompt)';
    return;
  }
  const step = replaySteps[currentStepIndex];
  const sysPrompt = step.system_prompt || logData.system_prompt || '(not available)';
  const userPrompt = step.user_prompt || '(not available)';
  replayPromptContent.textContent =
    '=== SYSTEM PROMPT ===\n' + sysPrompt +
    '\n\n=== USER MESSAGE ===\n' + userPrompt;
}

function buildReplayActionLog() {
  actionLogEl.innerHTML = '';
  let prevLevel = null;
  let prevAttempt = null;

  for (let i = 0; i < replaySteps.length; i++) {
    const step = replaySteps[i];
    const lvl = step.level;
    const att = step.attempt;

    if (lvl !== prevLevel || att !== prevAttempt) {
      if (prevLevel !== null) {
        const sep = document.createElement('div');
        sep.className = 'log-separator';
        sep.textContent = '--- Level ' + lvl + ', Attempt ' + att + ' ---';
        actionLogEl.appendChild(sep);
      }
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
      stopReplayPlayback();
      goToReplayStep(i);
    });
    actionLogEl.appendChild(entry);
  }
}

function updateReplayActionLogHighlight() {
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

// --- Replay playback controls ---

function replayStepForward() {
  goToReplayStep(currentStepIndex + 1);
}

function replayStepBackward() {
  goToReplayStep(currentStepIndex - 1);
}

function startReplayPlayback() {
  if (replayPlayInterval !== null) return;
  btnPlayPause.textContent = 'Pause';
  replayPlaySpeed = Number(replaySpeedSelect.value) || 2;
  replayPlayInterval = setInterval(() => {
    if (currentStepIndex >= replaySteps.length) {
      stopReplayPlayback();
      return;
    }
    replayStepForward();
  }, 1000 / replayPlaySpeed);
}

function stopReplayPlayback() {
  if (replayPlayInterval !== null) {
    clearInterval(replayPlayInterval);
    replayPlayInterval = null;
  }
  btnPlayPause.textContent = 'Play';
}

function toggleReplayPlayback() {
  if (replayPlayInterval !== null) {
    stopReplayPlayback();
  } else {
    startReplayPlayback();
  }
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

  if (replayMode) {
    // Replay mode keyboard shortcuts
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        stopReplayPlayback();
        replayStepBackward();
        break;
      case 'ArrowRight':
        e.preventDefault();
        stopReplayPlayback();
        replayStepForward();
        break;
      case ' ':
        e.preventDefault();
        toggleReplayPlayback();
        break;
      case 'Home':
        e.preventDefault();
        stopReplayPlayback();
        goToReplayStep(0);
        break;
      case 'End':
        e.preventDefault();
        stopReplayPlayback();
        goToReplayStep(replaySteps.length);
        break;
      case 'Escape':
        e.preventDefault();
        exitReplayMode();
        break;
    }
    return;
  }

  // Interactive mode keyboard shortcuts
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

// --- Replay event wiring ---

// File drop zone
replayDropZone.addEventListener('click', (e) => {
  if (e.target === replayFileInput) return;
  replayFileInput.click();
});
replayFileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleReplayFile(e.target.files[0]);
});
replayDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  replayDropZone.classList.add('dragover');
});
replayDropZone.addEventListener('dragleave', () => {
  replayDropZone.classList.remove('dragover');
});
replayDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  replayDropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleReplayFile(e.dataTransfer.files[0]);
});

// Playback controls
btnStepBack.addEventListener('click', () => { stopReplayPlayback(); replayStepBackward(); });
btnStepFwd.addEventListener('click', () => { stopReplayPlayback(); replayStepForward(); });
btnPlayPause.addEventListener('click', () => toggleReplayPlayback());
btnCloseReplay.addEventListener('click', () => exitReplayMode());

replaySpeedSelect.addEventListener('change', () => {
  if (replayPlayInterval !== null) {
    stopReplayPlayback();
    startReplayPlayback();
  }
});

scrubber.addEventListener('input', () => {
  stopReplayPlayback();
  goToReplayStep(Number(scrubber.value));
});

// --- Initialize ---
loadNarratorSettings();
buildLibrary();
loadDefaultGame();
