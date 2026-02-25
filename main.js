// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// Main UI glue: keyboard input, game loop, UI wiring
import { setupRegistry } from './engine/setup-registry.js';
import { VGDLParser } from './engine/parser.js';
import { ACTION } from './engine/action.js';
import { Renderer } from './renderer.js';
import { GAMES } from './games/game-data.js';

// Initialize the registry once
setupRegistry();

// DOM elements
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

const renderer = new Renderer(canvas, 30);

let currentGame = null;
let currentLevel = null;
let playing = false;
let gameLoopId = null;

// Flap state
let activeFlap = null; // 'desc' | 'level' | null

// Modification detection snapshots
let loadedDescSnapshot = '';
let loadedLevelSnapshot = '';

// Tick mode: 'action' = tick on keypress only, or a number = FPS
function getTickMode() {
  const val = tickModeSelect.value;
  if (val === 'action') return 'action';
  return Number(val);
}

// Keyboard state: keysDown tracks currently held keys,
// lastKeyPressed latches the most recent keydown between ticks
// so quick taps aren't lost.
const keysDown = new Set();
let lastKeyPressed = null;

// Game keys only fire when the canvas is focused
canvas.addEventListener('keydown', (e) => {
  const k = keyMap(e.key);
  if (k) {
    e.preventDefault();
    keysDown.add(k);
    lastKeyPressed = k;
    // Auto-start on first game input
    if (!playing) {
      startPlaying();
    }
    // In action mode, each keypress immediately triggers a tick
    if (getTickMode() === 'action') {
      doTick();
    }
  }
});

canvas.addEventListener('keyup', (e) => {
  const k = keyMap(e.key);
  if (k) {
    keysDown.delete(k);
  }
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
  // Prefer the latched keypress (catches quick taps between ticks),
  // then fall back to whatever is currently held down.
  const key = lastKeyPressed || [...keysDown][0] || null;
  lastKeyPressed = null; // consume the latch
  switch (key) {
    case 'SPACE': return ACTION.SPACE;
    case 'UP':    return ACTION.UP;
    case 'DOWN':  return ACTION.DOWN;
    case 'LEFT':  return ACTION.LEFT;
    case 'RIGHT': return ACTION.RIGHT;
    default:      return ACTION.NOOP;
  }
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


  // Store snapshots for modification detection
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
  const action = getAction();
  currentLevel.tick(action);
  renderer.render(currentLevel);

}

function startPlaying() {
  const mode = getTickMode();
  if (mode === 'action') {
    // Action mode: no interval, ticks happen on keypress
    return;
  }
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
  if (playing) {
    stopPlaying();
  } else {
    startPlaying();
  }
  canvas.focus();
}

function resetGame() {
  stopPlaying();
  if (currentLevel) {
    currentLevel.reset();
    renderer.render(currentLevel);
  }
}

// --- Flap tabs ---
function toggleFlap(which) {
  if (activeFlap === which) {
    // Close the active flap
    activeFlap = null;
    flapTabDesc.classList.remove('active');
    flapTabLevel.classList.remove('active');
    flapPanelDesc.classList.remove('open');
    flapPanelLevel.classList.remove('open');
    return;
  }

  // Opening a flap auto-pauses the game
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

    // Header
    const header = document.createElement('div');
    header.className = 'library-game-header';
    const title = document.createElement('span');
    title.textContent = name;
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '>';
    header.appendChild(title);
    header.appendChild(arrow);
    header.addEventListener('click', () => {
      el.classList.toggle('expanded');
    });

    // Body
    const body = document.createElement('div');
    body.className = 'library-game-body';

    // Level items -- click loads both description + level and triggers loadGame
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
  // Pick level 4 if it exists, otherwise first available
  const levelNums = Object.keys(game.levels).map(Number).sort((a, b) => a - b);
  const lvl = levelNums.includes(4) ? 4 : levelNums[0];
  levelText.value = game.levels[lvl];
  loadGame();
}

// --- Event wiring ---

// Flap tabs
flapTabDesc.addEventListener('click', () => toggleFlap('desc'));
flapTabLevel.addEventListener('click', () => toggleFlap('level'));

// Textarea modification detection
gameDesc.addEventListener('input', checkModifications);
levelText.addEventListener('input', checkModifications);

// Create New Env
btnCreateEnv.addEventListener('click', (e) => {
  e.stopPropagation();
  loadGame();
});

// Canvas overlay buttons -- stopPropagation so they don't affect canvas focus weirdly
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

// Close speed popover when clicking outside
document.addEventListener('click', (e) => {
  if (!speedPopover.contains(e.target) && e.target !== btnCog && !btnCog.contains(e.target)) {
    speedPopover.classList.remove('open');
  }
});

// When tick mode changes, restart the loop if playing
tickModeSelect.addEventListener('change', () => {
  if (playing) {
    stopPlaying();
    startPlaying();
  }
});

// Clear held keys when canvas loses focus to avoid stuck keys
canvas.addEventListener('blur', () => {
  keysDown.clear();
  lastKeyPressed = null;
});

// Keyboard shortcuts (only when not in an input/textarea)
document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
  if (e.key === 'Enter') {
    loadGame();
  }
  if (e.key === 'p') {
    togglePlay();
  }
});

// --- Mobile D-Pad ---
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const action = btn.dataset.action;
    lastKeyPressed = action;
    doTick();
  });
});

// --- Initialize ---
buildLibrary();
loadDefaultGame();