// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// Replay viewer: loads enriched .replay.json files and steps through
// game states using setGameState() -- no action replay needed.

import { setupRegistry } from './engine/setup-registry.js';
import { VGDLParser } from './engine/parser.js';
import { Renderer } from './renderer.js';
import { GAMES } from './games/game-data.js';

setupRegistry();

// --- State ---
let logData = null;
let states = [];
let replaySteps = [];
let currentStepIndex = -1; // -1 = initial state, 0..N-1 = after step i
let currentLevel = null;
let currentGame = null;
let activeLevel = null;
let staticSprites = null; // cached floor/wall sprites from initial level build
let playInterval = null;
let playSpeed = 2;

// --- DOM ---
const dropZone = document.getElementById('file-drop-zone');
const fileInput = document.getElementById('file-input');
const container = document.getElementById('replay-container');
const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas, 30);

const btnStepBack = document.getElementById('btn-step-back');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnStepFwd = document.getElementById('btn-step-fwd');
const stepLabel = document.getElementById('step-label');
const speedSelect = document.getElementById('speed-select');
const scrubber = document.getElementById('step-scrubber');

const metaGame = document.getElementById('meta-game');
const metaModel = document.getElementById('meta-model');
const metaOutcome = document.getElementById('meta-outcome');

const actionLogEl = document.getElementById('action-log');
const thoughtCommitment = document.getElementById('thought-commitment');
const thoughtReasoning = document.getElementById('thought-reasoning');
const thoughtNote = document.getElementById('thought-note');
const promptContent = document.getElementById('prompt-content');
const systemPromptContent = document.getElementById('system-prompt-content');


// --- File loading ---
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const jsonObj = JSON.parse(e.target.result);
    loadLog(jsonObj);
  };
  reader.readAsText(file);
}


// --- Core replay logic ---

function loadLog(jsonObj) {
  if (!jsonObj.states || !Array.isArray(jsonObj.states)) {
    alert('Invalid replay file: missing "states" array. Run export_replay first.');
    return;
  }
  if (!jsonObj.game || !GAMES[jsonObj.game]) {
    alert('Unknown game: ' + (jsonObj.game || '(none)') + '. Not found in GAMES registry.');
    return;
  }

  logData = jsonObj;
  states = jsonObj.states;
  replaySteps = jsonObj.steps || [];

  // Hide drop zone, show replay container
  dropZone.style.display = 'none';
  container.classList.add('visible');

  // Update metadata
  metaGame.textContent = 'Game: ' + logData.game;
  metaModel.textContent = 'Model: ' + (logData.model || '--');
  metaOutcome.textContent = 'Outcome: ' + (logData.outcome || '--');

  // Set up scrubber
  scrubber.min = -1;
  scrubber.max = replaySteps.length - 1;
  scrubber.value = -1;

  // Build action log
  buildActionLog();

  // Reset and render initial state
  activeLevel = null;
  goToStep(-1);
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

  // Capture static sprites (floor, wall) from the freshly-built level.
  // The Python export strips these to save space, so we need to re-inject them.
  const initState = currentLevel.getGameState();
  staticSprites = {};
  const STATIC_KEYS = new Set(['floor', 'wall']);
  for (const [key, spriteList] of Object.entries(initState.sprites)) {
    if (STATIC_KEYS.has(key)) {
      staticSprites[key] = spriteList;
    }
  }

  renderer.resize(currentLevel.width, currentLevel.height);
}


function gridStateToPixelState(gridState, blockSize) {
  // Convert grid-coordinate state to pixel-coordinate state for setGameState()
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
  // Clamp: index -1 means initial state, max is replaySteps.length - 1
  const maxIdx = replaySteps.length - 1;
  if (index < -1) index = -1;
  if (index > maxIdx) index = maxIdx;

  currentStepIndex = index;

  // Determine level number
  let levelNum;
  if (index < 0) {
    levelNum = logData.start_level || 0;
  } else {
    levelNum = replaySteps[index].level !== undefined
      ? replaySteps[index].level
      : (logData.start_level || 0);
  }

  // Build level if needed (for sprite class info & rendering)
  buildLevelIfNeeded(levelNum);

  // Show state BEFORE the action: states[i] is what the agent saw when choosing step i.
  // states[0] = initial, states[i] = state before step i's action.
  const stateIdx = Math.max(index, 0);
  if (stateIdx < 0 || stateIdx >= states.length) return;

  const gridState = states[stateIdx];
  const blockSize = currentLevel.block_size;
  const pixelState = gridStateToPixelState(gridState, blockSize);

  // Merge static sprites (floor, wall) from level build into the state
  if (staticSprites) {
    for (const [key, spriteList] of Object.entries(staticSprites)) {
      if (!pixelState.sprites[key]) {
        pixelState.sprites[key] = spriteList;
      }
    }
  }

  // Apply state to level and render
  currentLevel.setGameState(pixelState);
  // Also set ended/won/lose for HUD
  currentLevel.ended = gridState.ended || false;
  currentLevel.won = gridState.won || false;
  currentLevel.lose = !!(gridState.ended && !gridState.won);
  currentLevel.score = gridState.score || 0;
  currentLevel.time = gridState.time || 0;

  renderer.render(currentLevel);

  // Update UI
  updateStepLabel();
  updateThoughtPanel();
  updateActionLogHighlight();
  scrubber.value = index;
}


function stepForward() {
  goToStep(currentStepIndex + 1);
}

function stepBackward() {
  goToStep(currentStepIndex - 1);
}

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
    if (currentStepIndex >= replaySteps.length - 1) {
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


// --- UI updates ---

function updateStepLabel() {
  const total = replaySteps.length;
  if (currentStepIndex < 0) {
    stepLabel.textContent = 'Initial / ' + total + ' steps';
  } else {
    const step = replaySteps[currentStepIndex];
    const lvl = step.level !== undefined ? step.level : '?';
    const att = step.attempt !== undefined ? step.attempt : '?';
    stepLabel.textContent = 'Step ' + (currentStepIndex + 1) + ' / ' + total +
      ' (L' + lvl + ' A' + att + ')';
  }
}


function updateThoughtPanel() {
  if (currentStepIndex < 0) {
    thoughtCommitment.textContent = '(initial state)';
    thoughtReasoning.textContent = '--';
    thoughtNote.textContent = '--';
    systemPromptContent.textContent = '(no prompt yet)';
    promptContent.textContent = '(no prompt yet)';
    return;
  }

  const step = replaySteps[currentStepIndex];
  const response = step.response || {};

  thoughtCommitment.textContent = response.commitment || '--';
  thoughtReasoning.textContent = response.reasoning || '--';

  // note_to_self can be string or object
  let note = response.note_to_self || '--';
  if (typeof note === 'object') {
    note = JSON.stringify(note, null, 2);
  }
  thoughtNote.textContent = note;

  systemPromptContent.textContent = step.system_prompt || logData.system_prompt || '(not available)';
  promptContent.textContent = step.user_prompt || '(not available)';
}


function buildActionLog() {
  actionLogEl.innerHTML = '';
  let prevLevel = null;
  let prevAttempt = null;

  for (let i = 0; i < replaySteps.length; i++) {
    const step = replaySteps[i];
    const lvl = step.level;
    const att = step.attempt;

    // Add separator on level/attempt change
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

    // Win/lose markers
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

  // Scroll current entry into view
  const current = actionLogEl.querySelector('.log-entry.current-step');
  if (current) {
    current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}


// --- Event wiring ---

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
      goToStep(-1);
      break;
    case 'End':
      e.preventDefault();
      stopPlayback();
      goToStep(replaySteps.length - 1);
      break;
  }
});
