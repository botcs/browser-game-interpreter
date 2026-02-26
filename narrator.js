// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// Narrator module: state formatting, event logging, prompt building, and OpenRouter API
// Ports logic from src/llm_eval/state_formatter.py, event_logger.py, and prompt_builder.py

// --- Color mapping (matches renderer.js COLORS) ---
const COLORS = {
  LIGHTGRAY: [150, 150, 150],
  BLUE: [0, 0, 200],
  YELLOW: [250, 250, 0],
  BLACK: [0, 0, 0],
  ORANGE: [250, 160, 0],
  PURPLE: [128, 0, 128],
  BROWN: [140, 120, 100],
  PINK: [250, 200, 200],
  GREEN: [0, 200, 0],
  RED: [200, 0, 0],
  WHITE: [250, 250, 250],
  GOLD: [250, 212, 0],
  LIGHTRED: [250, 50, 50],
  LIGHTORANGE: [250, 200, 100],
  LIGHTBLUE: [50, 100, 250],
  LIGHTGREEN: [50, 250, 50],
  DARKGRAY: [30, 30, 30],
  DARKBLUE: [20, 20, 100],
  GRAY: [90, 90, 90],
};

// Reverse lookup: RGB string -> color name
const RGB_TO_COLOR = {};
for (const [name, rgb] of Object.entries(COLORS)) {
  RGB_TO_COLOR[rgb.join(',')] = name;
}

function getColorName(sprite) {
  // Try img-based color first (matches renderer logic)
  if (sprite.img) {
    if (sprite.img.startsWith('colors/')) {
      return sprite.img.split('/')[1];
    }
    if (sprite.img.startsWith('colored_shapes/')) {
      const parts = sprite.img.split('/')[1];
      const SHAPES = ['CIRCLE', 'TRIANGLE', 'DIAMOND', 'STAR', 'CROSS', 'HEXAGON', 'SQUARE', 'PENTAGON'];
      for (const shape of SHAPES) {
        if (parts.endsWith('_' + shape)) {
          return parts.slice(0, -(shape.length + 1));
        }
      }
    }
  }
  // Fall back to sprite.color RGB array
  if (sprite.color && Array.isArray(sprite.color)) {
    const key = sprite.color.join(',');
    if (RGB_TO_COLOR[key]) return RGB_TO_COLOR[key];
  }
  return sprite.key.toUpperCase();
}


// --- Object ID Mapper ---
// Assigns stable abstract IDs (obj_1, obj_2, ...) in registration order

export class ObjectIDMapper {
  constructor() {
    this._idMap = {};   // internal sprite.id -> abstract id
    this._nextId = 1;
  }

  getAbstractId(spriteId) {
    if (!(spriteId in this._idMap)) {
      this._idMap[spriteId] = `obj_${this._nextId}`;
      this._nextId++;
    }
    return this._idMap[spriteId];
  }

  reset() {
    this._idMap = {};
    this._nextId = 1;
  }
}


// --- Coordinate helpers ---
// Convert grid row/col to Cartesian (bottom-left origin)

function gridToCartesian(col, row, gridHeight) {
  return [col, gridHeight - 1 - row];
}

function spriteToGrid(sprite, blockSize) {
  const col = Math.round(sprite.rect.x / blockSize);
  const row = Math.round(sprite.rect.y / blockSize);
  return [col, row];
}


// --- Snapshot helpers ---
// Build a lightweight snapshot of all live sprites for pre/post comparison

export function buildSpriteSnapshot(level) {
  const snapshot = {};
  const bs = level.block_size;
  for (const key of level.sprite_registry.spriteKeys) {
    const sprites = level.sprite_registry._liveSpritesByKey[key] || [];
    for (const s of sprites) {
      const [col, row] = spriteToGrid(s, bs);
      snapshot[s.id] = {
        id: s.id,
        key: s.key,
        col,
        row,
        isAvatar: s.is_avatar,
        colorName: getColorName(s),
        resources: { ...s.resources },
        orientation: s.orientation ? { x: s.orientation.x, y: s.orientation.y } : null,
      };
    }
  }
  return snapshot;
}


// --- State Formatter ---
// Ports src/llm_eval/state_formatter.py

export function formatState(level, idMapper) {
  const bs = level.block_size;
  const gridW = level.width;
  const gridH = level.height;
  const lines = [];

  lines.push(`Grid: ${gridW}x${gridH}`);

  let avatarPos = null;
  let avatarOrientation = null;
  let avatarResources = null;
  const objects = [];
  const wallPositions = [];

  for (const key of level.sprite_registry.spriteKeys) {
    const sprites = level.sprite_registry._liveSpritesByKey[key] || [];
    for (const s of sprites) {
      const [col, row] = spriteToGrid(s, bs);
      const [cx, cy] = gridToCartesian(col, row, gridH);
      const colorName = getColorName(s);

      if (s.is_avatar) {
        avatarPos = [cx, cy];
        avatarOrientation = s.orientation;
        // Collect resources (filter out proxy traps)
        const res = {};
        for (const rk of Object.keys(s.resources)) {
          if (rk === 'toJSON') continue;
          res[rk] = s.resources[rk];
        }
        avatarResources = res;
      } else if (key === 'wall') {
        wallPositions.push([cx, cy]);
      } else if (key !== 'floor' && key !== 'background') {
        objects.push({
          id: s.id,
          colorName,
          pos: [cx, cy],
        });
      }
    }
  }

  // Avatar line
  if (avatarPos) {
    let avatarLine = `Avatar at (${avatarPos[0]}, ${avatarPos[1]})`;
    if (avatarOrientation) {
      const dirName = orientationToDirection(avatarOrientation);
      if (dirName) avatarLine += ` facing ${dirName}`;
    }
    lines.push(avatarLine);
  } else {
    lines.push('Avatar: DEAD');
  }

  // Resources / inventory
  if (avatarResources) {
    const items = [];
    for (const [rk, rv] of Object.entries(avatarResources)) {
      if (rv > 0) items.push(`${rk}: ${rv}`);
    }
    if (items.length > 0) {
      lines.push(`Inventory: ${items.join(', ')}`);
    }
  }

  // Score
  const reward = level.last_reward;
  if (reward !== 0) {
    const sign = reward > 0 ? '+' : '';
    lines.push(`Score: ${level.score} (${sign}${reward})`);
  } else {
    lines.push(`Score: ${level.score}`);
  }

  // Objects
  lines.push('Objects:');
  if (objects.length > 0) {
    // Sort by id for consistency
    objects.sort((a, b) => a.id.localeCompare(b.id));
    for (const obj of objects) {
      const displayId = idMapper ? idMapper.getAbstractId(obj.id) : obj.id;
      lines.push(`- ${displayId} ${obj.colorName} at (${obj.pos[0]},${obj.pos[1]})`);
    }
  } else {
    lines.push('- none');
  }

  // Walls (compressed)
  if (wallPositions.length > 0) {
    const wallStr = compressWallRanges(wallPositions);
    lines.push(`Walls at: ${wallStr}`);
  }

  return lines.join('\n');
}

function orientationToDirection(o) {
  if (!o) return null;
  const dx = o.x !== undefined ? o.x : 0;
  const dy = o.y !== undefined ? o.y : 0;
  if (dy < 0) return 'UP';
  if (dy > 0) return 'DOWN';
  if (dx < 0) return 'LEFT';
  if (dx > 0) return 'RIGHT';
  return null;
}

function compressWallRanges(positions) {
  if (positions.length === 0) return 'none';
  if (positions.length > 100) return `${positions.length} wall positions (borders)`;

  const wallSet = new Set(positions.map(p => `${p[0]},${p[1]}`));

  // Group by x
  const xGroups = {};
  for (const [x, y] of positions) {
    if (!xGroups[x]) xGroups[x] = [];
    xGroups[x].push(y);
  }
  // Group by y
  const yGroups = {};
  for (const [x, y] of positions) {
    if (!yGroups[y]) yGroups[y] = [];
    yGroups[y].push(x);
  }

  const ranges = [];
  const used = new Set();

  // Vertical segments
  for (const x of Object.keys(xGroups).map(Number).sort((a, b) => a - b)) {
    const yVals = xGroups[x].sort((a, b) => a - b);
    const segments = findConsecutiveSegments(yVals);
    for (const [startY, endY] of segments) {
      if (endY - startY >= 2) {
        for (let y = startY; y <= endY; y++) used.add(`${x},${y}`);
        ranges.push(startY === endY ? `(${x}, ${startY})` : `(${x}, ${startY}-${endY})`);
      }
    }
  }

  // Horizontal segments
  for (const y of Object.keys(yGroups).map(Number).sort((a, b) => a - b)) {
    const xVals = yGroups[y].sort((a, b) => a - b);
    const segments = findConsecutiveSegments(xVals);
    for (const [startX, endX] of segments) {
      const unusedX = [];
      for (let x = startX; x <= endX; x++) {
        if (!used.has(`${x},${y}`)) unusedX.push(x);
      }
      if (unusedX.length >= 2) {
        const subSegments = findConsecutiveSegments(unusedX);
        for (const [subStart, subEnd] of subSegments) {
          if (subEnd - subStart >= 1) {
            for (let x = subStart; x <= subEnd; x++) used.add(`${x},${y}`);
            ranges.push(subStart === subEnd ? `(${subStart}, ${y})` : `(${subStart}-${subEnd}, ${y})`);
          }
        }
      }
    }
  }

  // Remaining individual walls
  for (const [x, y] of positions) {
    if (!used.has(`${x},${y}`)) {
      ranges.push(`(${x}, ${y})`);
    }
  }

  if (ranges.length > 20) return `${positions.length} wall positions (borders)`;
  return ranges.length > 0 ? ranges.join(', ') : 'none';
}

function findConsecutiveSegments(values) {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const segments = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      segments.push([start, end]);
      start = sorted[i];
      end = sorted[i];
    }
  }
  segments.push([start, end]);
  return segments;
}


// --- Event Logger ---
// Ports src/llm_eval/event_logger.py

const ACTION_NAMES = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'WAIT', 'ACTION'];

export function logAction(stepNum, actionIndex, prevSnapshot, currSnapshot, events, level, idMapper) {
  const actionName = ACTION_NAMES[actionIndex] || 'UNKNOWN';
  const gridH = level.height;
  const bs = level.block_size;

  // Find avatar in both snapshots
  let prevAvatarId = null, prevAvatarPos = null;
  let currAvatarId = null, currAvatarPos = null;

  for (const obj of Object.values(prevSnapshot)) {
    if (obj.isAvatar) {
      prevAvatarId = obj.id;
      prevAvatarPos = gridToCartesian(obj.col, obj.row, gridH);
      break;
    }
  }
  for (const obj of Object.values(currSnapshot)) {
    if (obj.isAvatar) {
      currAvatarId = obj.id;
      currAvatarPos = gridToCartesian(obj.col, obj.row, gridH);
      break;
    }
  }

  const avatarEvents = [];
  const worldEvents = [];

  // Process engine events
  const processedEvents = processEvents(events, prevSnapshot, currSnapshot, prevAvatarId, gridH, bs, idMapper);

  // Avatar movement
  if (prevAvatarPos && currAvatarPos) {
    if (prevAvatarPos[0] !== currAvatarPos[0] || prevAvatarPos[1] !== currAvatarPos[1]) {
      avatarEvents.push(`avatar moved ${fmtPos(prevAvatarPos)}->${fmtPos(currAvatarPos)}`);
    } else {
      // Didn't move
      const blocked = processedEvents.avatar.filter(e => e.type === 'blocked');
      if (blocked.length > 0) {
        avatarEvents.push(`avatar blocked by ${blocked[0].objId} (${blocked[0].color})`);
      } else if (actionIndex === 4) {
        avatarEvents.push('no action');
      } else if (actionIndex === 5) {
        const fired = processedEvents.avatar.filter(e => e.type === 'fire');
        if (fired.length > 0) {
          avatarEvents.push(`avatar fired ${fired[0].color} projectile ${fired[0].direction}`);
        } else {
          avatarEvents.push('nothing happened');
        }
      } else {
        avatarEvents.push('avatar blocked');
      }
    }
  } else if (prevAvatarPos && !currAvatarPos) {
    const deathEvents = processedEvents.avatar.filter(e => e.type === 'death_touch');
    if (deathEvents.length > 0) {
      avatarEvents.push(`avatar touched ${deathEvents[0].objId} (${deathEvents[0].color}), died`);
    } else {
      avatarEvents.push('avatar died');
    }
  }

  // Other avatar events
  for (const e of processedEvents.avatar) {
    if (e.type === 'collect') {
      avatarEvents.push(`collecting ${e.objId} (${e.color})`);
    } else if (e.type === 'push') {
      avatarEvents.push(`pushing ${e.objId} (${e.color}) ${fmtPos(e.fromPos)}->${fmtPos(e.toPos)}`);
    } else if (e.type === 'transform') {
      avatarEvents.push(`${e.objId} (${e.fromColor}) became (${e.toColor})`);
    } else if (e.type === 'conditional_remove') {
      avatarEvents.push(`${e.objId} (${e.color}) removed`);
    }
  }

  // World events
  for (const e of processedEvents.world) {
    if (e.type === 'move') {
      worldEvents.push(`${e.objId} (${e.color}) moved ${fmtPos(e.fromPos)}->${fmtPos(e.toPos)}`);
    } else if (e.type === 'spawn') {
      worldEvents.push(`${e.objId} (${e.color}) spawned at ${fmtPos(e.pos)}`);
    } else if (e.type === 'npc_transform') {
      worldEvents.push(`${e.objId} (${e.fromColor}) became (${e.toColor})`);
    } else if (e.type === 'npc_death') {
      worldEvents.push(`${e.objId} (${e.color}) died`);
    }
  }

  // Build log string
  let avatarStr = avatarEvents.length > 0 ? avatarEvents.join(', ') : 'no change';

  // Score delta
  const reward = level.last_reward;
  if (reward !== 0) {
    const sign = reward > 0 ? '+' : '';
    avatarStr += `, ${sign}${reward}`;
  }

  // Win/lose
  if (level.won) avatarStr += ' [WIN]';
  else if (level.lose) avatarStr += ' [LOSE]';

  if (worldEvents.length > 0) {
    return `[${stepNum}] ${actionName} -> ${avatarStr} || ${worldEvents.join('; ')}`;
  }
  return `[${stepNum}] ${actionName} -> ${avatarStr}`;
}


function processEvents(events, prevSnapshot, currSnapshot, avatarId, gridH, bs, idMapper) {
  const result = { avatar: [], world: [] };

  for (const event of events) {
    const effectName = event[0];
    const id1 = event[1];
    const id2 = event[2];

    // Skip EOS events
    if (id1 === 'EOS' || id2 === 'EOS') continue;

    const avatarInvolved = (id1 === avatarId || id2 === avatarId);
    const snap1 = prevSnapshot[id1] || currSnapshot[id1];
    const snap2 = prevSnapshot[id2] || currSnapshot[id2];

    const getDisplayId = (id) => {
      const snap = prevSnapshot[id] || currSnapshot[id];
      if (!snap) return id;
      if (snap.key === 'wall' || snap.key === 'floor' || snap.key === 'background') return snap.key;
      return idMapper ? idMapper.getAbstractId(id) : id;
    };

    if (effectName === 'stepBack') {
      if (avatarInvolved) {
        const blockerId = id1 !== avatarId ? id1 : id2;
        const blockerSnap = prevSnapshot[blockerId] || currSnapshot[blockerId];
        result.avatar.push({
          type: 'blocked',
          objId: getDisplayId(blockerId),
          color: blockerSnap ? blockerSnap.colorName : 'UNKNOWN',
        });
      }

    } else if (effectName === 'bounceForward') {
      if (id2 === avatarId && snap1) {
        // Avatar pushed id1
        const prevObj = prevSnapshot[id1];
        const currObj = currSnapshot[id1];
        if (prevObj) {
          const fromPos = gridToCartesian(prevObj.col, prevObj.row, gridH);
          let toPos = currObj ? gridToCartesian(currObj.col, currObj.row, gridH) : null;
          if (!toPos && prevSnapshot[avatarId] && currSnapshot[avatarId]) {
            const pa = prevSnapshot[avatarId];
            const ca = currSnapshot[avatarId];
            const dx = ca.col - pa.col;
            const dy = ca.row - pa.row;
            toPos = gridToCartesian(prevObj.col + dx, prevObj.row + dy, gridH);
          }
          if (toPos) {
            result.avatar.push({
              type: 'push',
              objId: getDisplayId(id1),
              color: prevObj.colorName,
              fromPos,
              toPos,
            });
          }
        }
      }

    } else if (effectName === 'killSprite') {
      if (id1 === avatarId) {
        // Avatar died
        const killerSnap = prevSnapshot[id2] || currSnapshot[id2];
        result.avatar.push({
          type: 'death_touch',
          objId: getDisplayId(id2),
          color: killerSnap ? killerSnap.colorName : 'UNKNOWN',
        });
      } else if (id2 === avatarId) {
        // Avatar collected/killed something
        const victimSnap = prevSnapshot[id1];
        result.avatar.push({
          type: 'collect',
          objId: getDisplayId(id1),
          color: victimSnap ? victimSnap.colorName : 'UNKNOWN',
        });
      } else {
        const victimSnap = prevSnapshot[id1];
        result.world.push({
          type: 'npc_death',
          objId: getDisplayId(id1),
          color: victimSnap ? victimSnap.colorName : 'UNKNOWN',
        });
      }

    } else if (effectName === 'killIfOtherHasMore') {
      // Only log if object was actually removed
      if (!(id1 in currSnapshot)) {
        const victimSnap = prevSnapshot[id1];
        result.avatar.push({
          type: 'conditional_remove',
          objId: getDisplayId(id1),
          color: victimSnap ? victimSnap.colorName : 'UNKNOWN',
        });
      }

    } else if (effectName === 'transformTo') {
      const oldSnap = prevSnapshot[id1];
      const newSnap = currSnapshot[id1];
      const entry = {
        type: avatarInvolved ? 'transform' : 'npc_transform',
        objId: getDisplayId(id1),
        fromColor: oldSnap ? oldSnap.colorName : 'UNKNOWN',
        toColor: newSnap ? newSnap.colorName : 'UNKNOWN',
      };
      if (avatarInvolved) {
        result.avatar.push(entry);
      } else {
        result.world.push(entry);
      }
    }
  }

  // Detect NPC movements and spawns by comparing snapshots
  for (const [id, curr] of Object.entries(currSnapshot)) {
    if (id === avatarId || curr.key === 'wall' || curr.key === 'floor' || curr.key === 'avatar') continue;

    const displayId = curr.key === 'background' ? 'background' : (idMapper ? idMapper.getAbstractId(id) : id);

    if (id in prevSnapshot) {
      const prev = prevSnapshot[id];
      if (prev.col !== curr.col || prev.row !== curr.row) {
        // Check if already logged as push
        const alreadyLogged = [...result.avatar, ...result.world].some(
          e => e.objId === displayId && (e.type === 'push' || e.type === 'move')
        );
        if (!alreadyLogged) {
          result.world.push({
            type: 'move',
            objId: displayId,
            color: curr.colorName,
            fromPos: gridToCartesian(prev.col, prev.row, gridH),
            toPos: gridToCartesian(curr.col, curr.row, gridH),
          });
        }
      }
    } else {
      result.world.push({
        type: 'spawn',
        objId: displayId,
        color: curr.colorName,
        pos: gridToCartesian(curr.col, curr.row, gridH),
      });
    }
  }

  return result;
}

function fmtPos(pos) {
  if (!pos) return '(?)';
  return `(${pos[0]},${pos[1]})`;
}


// --- Prompt Builder ---

const OBSERVER_PROMPT = `# Human Gameplay Observer

You are observing a human participant play a grid-based video game. Your task is to infer what they might be thinking and what rules they've discovered based on their actions.

## Critical Context
- The player does NOT know the game rules in advance - they must discover them through trial and error
- You are watching their gameplay live - each action has just been taken
- Color determines behavior - all objects of the same color follow the same rules

## What the Player Knows
- They control an avatar on a grid
- Objects are identified by color (e.g., ORANGE, BROWN, GREEN)
- Color determines behavior - all objects of the same color follow the same rules
- They don't know the rules in advance - they must infer them from observations

## Actions
- \`UP\`, \`DOWN\`, \`LEFT\`, \`RIGHT\` - Move in that direction
- \`ACTION\` - Use ability (e.g., fire projectile)
- \`WAIT\` - Do nothing for one tick

## Action Log Format
Actions appear as:
\`[N] ACTION -> <result> || <world events>\`

Examples:
- \`[1] RIGHT -> avatar moved (3,3)->(4,3)\` - simple move
- \`[2] RIGHT -> avatar moved (3,3)->(4,3) pushing obj_8 (RED) (4,3)->(5,3)\` - pushed object
- \`[3] RIGHT -> avatar moved (3,3)->(4,3) collecting obj_7 (ORANGE), +5\` - collected item
- \`[4] RIGHT -> avatar blocked by obj_5 (DARKGRAY)\` - blocked
- \`[5] UP -> avatar moved (2,3)->(2,4), touched obj_4 (GOLD), avatar died, -1 [LOSE]\` - death
- \`[6] ACTION -> avatar fired WHITE projectile RIGHT, hit obj_4 (PINK), both removed, +2\` - projectile
- \`[7] WAIT -> no action || obj_4 (GOLD) moved (5,5)->(4,5); obj_15 (RED) spawned at (1,1)\` - world events

The \`||\` separator divides the action's result from independent world events.

## Pushing Mechanics (Sokoban Rules)
Some objects can be pushed:
- Cannot walk over a pushable object - must go around it
- To push an object, must be on the OPPOSITE side of where you want it to go, then move INTO it

| To push object... | Must stand... | Then move... |
|-------------------|---------------|--------------|
| RIGHT (+x)        | LEFT of it    | RIGHT        |
| LEFT (-x)         | RIGHT of it   | LEFT         |
| UP (+y)           | BELOW it      | UP           |
| DOWN (-y)         | ABOVE it      | DOWN         |

## Coordinate System
Cartesian coordinates:
- X-axis: left=0, increases rightward. \`LEFT\` decreases x, \`RIGHT\` increases x.
- Y-axis: bottom=0, increases upward. \`UP\` increases y, \`DOWN\` decreases y.
- (0, 0) is bottom-left corner

## Your Task
Given the player's action history and the current game state, infer:
1. What rules has the player likely discovered so far?
2. What is their current goal or plan?
3. Why might they have taken this specific action?

## Response Format
Respond with valid JSON only:
\`\`\`json
{
  "reasoning": "<step-by-step analysis of the player's behavior and what it reveals>",
  "inferred_discoveries": "<list of rules/interactions you believe the player has learned, max 15 items>",
  "inferred_goal": "<what the player seems to be trying to achieve right now, max 150 chars>",
  "action_explanation": "<why the player likely took this specific action>"
}
\`\`\`

## Analysis Tips
- Look for patterns: repeated approaches to same-colored objects suggest hypothesis testing
- Deaths followed by avoidance suggest learned danger
- Successful interactions followed by seeking similar objects suggest learned rewards
- Hesitation (many WAITs) before an action may indicate uncertainty or planning
- Ignoring certain objects after interaction suggests they learned it's not useful
- Going around objects rather than through them suggests they learned blocking/pushing rules`;


const NARRATOR_PROMPT = `# Narrative Analysis

You are narrating the journey of a player discovering the rules of an unknown video game. Based on their actions, describe their learning process and current understanding as if telling their story.

## Critical Context
- The player does NOT know the game rules in advance - they must discover them through trial and error
- You are narrating their gameplay live - each action has just been taken
- Color determines behavior - all objects of the same color follow the same rules

## What the Player Knows
- They control an avatar on a grid
- Objects are identified by color (e.g., ORANGE, BROWN, GREEN)
- Color determines behavior - all objects of the same color follow the same rules
- They don't know the rules in advance - they must infer them from observations

## Actions
- \`UP\`, \`DOWN\`, \`LEFT\`, \`RIGHT\` - Move in that direction
- \`ACTION\` - Use ability (e.g., fire projectile)
- \`WAIT\` - Do nothing for one tick

## Action Log Format
Actions appear as:
\`[N] ACTION -> <result> || <world events>\`

Examples:
- \`[1] RIGHT -> avatar moved (3,3)->(4,3)\` - simple move
- \`[2] RIGHT -> avatar moved (3,3)->(4,3) pushing obj_8 (RED) (4,3)->(5,3)\` - pushed object
- \`[3] RIGHT -> avatar moved (3,3)->(4,3) collecting obj_7 (ORANGE), +5\` - collected item
- \`[4] RIGHT -> avatar blocked by obj_5 (DARKGRAY)\` - blocked
- \`[5] UP -> avatar moved (2,3)->(2,4), touched obj_4 (GOLD), avatar died, -1 [LOSE]\` - death
- \`[6] ACTION -> avatar fired WHITE projectile RIGHT, hit obj_4 (PINK), both removed, +2\` - projectile
- \`[7] WAIT -> no action || obj_4 (GOLD) moved (5,5)->(4,5); obj_15 (RED) spawned at (1,1)\` - world events

The \`||\` separator divides the action's result from independent world events.

## Pushing Mechanics (Sokoban Rules)
Some objects can be pushed:
- Cannot walk over a pushable object - must go around it
- To push an object, must be on the OPPOSITE side of where you want it to go, then move INTO it

| To push object... | Must stand... | Then move... |
|-------------------|---------------|--------------|
| RIGHT (+x)        | LEFT of it    | RIGHT        |
| LEFT (-x)         | RIGHT of it   | LEFT         |
| UP (+y)           | BELOW it      | UP           |
| DOWN (-y)         | ABOVE it      | DOWN         |

## Coordinate System
Cartesian coordinates:
- X-axis: left=0, increases rightward. \`LEFT\` decreases x, \`RIGHT\` increases x.
- Y-axis: bottom=0, increases upward. \`UP\` increases y, \`DOWN\` decreases y.
- (0, 0) is bottom-left corner

## Your Task
Given the player's action history and current state, narrate:
1. What discoveries have shaped their understanding?
2. What are they trying to accomplish now?
3. What motivated their latest move?

## Response Format
Respond with valid JSON only:
\`\`\`json
{
  "reasoning": "<narrative analysis of their journey so far>",
  "key_discoveries": "<pivotal moments of learning and what they revealed, max 15 items>",
  "current_quest": "<what the player is now pursuing, max 150 chars>",
  "latest_move": "<narrative explanation of why they made this action>"
}
\`\`\`

## Narrative Tips
- Frame deaths as "lessons learned the hard way"
- Frame successful collections as "discoveries" or "breakthroughs"
- Hesitation can be "weighing options" or "uncertainty"
- Repeated attempts at the same thing show "persistence" or "experimentation"
- Avoidance behaviors show "hard-won wisdom"
- Systematic exploration shows "methodical investigation"`;


function buildOraclePrompt(gameDescText) {
  return `# Oracle Game Narrator

You are an omniscient narrator who knows all the rules of this video game. You are watching a player discover these rules through trial and error, and you narrate their journey with full knowledge of what's really happening.

## How to Read VGDL Game Descriptions

The game description below is written in Video Game Description Language (VGDL). Here is how to interpret each section:

### SpriteSet
Defines every object type in the game. Format: \`name > Type parameters\`

Avatar types (player-controlled):
- MovingAvatar: can move in four directions
- ShootAvatar: MovingAvatar that can also fire projectiles (stype=projectile_name) with space bar
- FlakAvatar: can only move sideways, always shoots upward

Object types:
- Immovable: static object, cannot move
- Passive: can be pushed by the avatar (via bounceForward interaction)
- Resource: collectible object (collected via addResource/changeResource interactions)
- ResourcePack: another collectible variant
- Flicker: appears temporarily, disappears after a set number of steps (total=N)
- SpawnPoint: periodically creates new objects (stype=what_it_spawns, prob=spawn_chance)
- Missile: moves in one fixed direction at a set speed
- Bomber: missile + spawner combined
- Chaser: moves toward the nearest target object (stype=target)
- RandomNPC: moves in random directions
- Portal: teleports objects that touch it to an exit location (via teleportTo interaction)

The \`img=colors/COLORNAME\` parameter sets the object's visible color. All objects of the same color follow the same rules.

### LevelMapping
Maps single characters to sprites for level layout. Format: \`char > sprite1 sprite2 ...\`
Multiple sprites on one character means they overlap (e.g., \`w > floor wall\` places a wall on top of floor).

### InteractionSet
Defines collision rules. Format: \`spriteA spriteB > effect parameters\`

CRITICAL: when spriteA and spriteB collide, the effect is applied TO spriteA (the first sprite).

Effects:
- killSprite: destroys spriteA (the first listed sprite)
- stepBack: spriteA is pushed back (blocked), preventing overlap
- bounceForward: spriteA is pushed in the direction spriteB was moving (i.e., spriteB pushes spriteA)
- transformTo stype=X: spriteA transforms into object type X
- changeScore scoreChange=N: awards N points when the collision happens
- changeResource resource=R value=N: adds N to the avatar's resource R
- addResource resource=R value=N: adds N of resource R to spriteA
- removeResource resource=R value=N: removes N of resource R from spriteA
- killIfOtherHasMore resource=R limit=N: kills spriteA only if spriteB has more than N of resource R
- killIfHasLess resource=R limit=N: kills spriteA if it has less than N of resource R
- teleportTo stype=X: teleports spriteA to the location of an X object
- turnAround: spriteA (a missile) drops one cell and reverses direction
- reverseDirection: spriteA (a missile) reverses its direction
- undoAll: reverts spriteA's position to where it was before this tick

Multiple effects can apply to the same collision (listed as separate lines).
\`EOS\` (End of Screen) interactions handle objects leaving the game boundaries.

### TerminationSet
Defines win/lose conditions. Format: \`ConditionType parameters win=True/False\`
- SpriteCounter stype=X limit=0 win=True: game is WON when all X objects are gone
- SpriteCounter stype=X limit=0 win=False: game is LOST when all X objects are gone
- MultiSpriteCounter stype1=X stype2=Y limit=0 win=True: won when all X and Y are gone
- Timeout limit=N win=False: lost if N steps pass without winning
- Survive limit=N win=True: won if avatar survives N steps

## Game Rules (VGDL Description)
\`\`\`
${gameDescText}
\`\`\`

## Critical Context
- The player does NOT know these rules - they must discover them through trial and error
- YOU know all the rules and can explain what is actually happening mechanically
- Narrate from the perspective of someone who understands the game fully
- Color determines behavior - all objects of the same color follow the same rules
- The player sees colored squares on a grid, not the VGDL source code

## What the Player Sees
- They control a colored avatar on a grid
- Objects are identified by color (e.g., ORANGE, BROWN, GREEN)
- They see score changes displayed on screen
- They do NOT see object type names, interaction rules, or win conditions

## Actions
- \`UP\`, \`DOWN\`, \`LEFT\`, \`RIGHT\` - Move in that direction
- \`ACTION\` - Use ability (e.g., fire projectile)
- \`WAIT\` - Do nothing for one tick

## Action Log Format
Actions appear as:
\`[N] ACTION -> <result> || <world events>\`

Examples:
- \`[1] RIGHT -> avatar moved (3,3)->(4,3)\` - simple move
- \`[2] RIGHT -> avatar moved (3,3)->(4,3) pushing obj_8 (RED) (4,3)->(5,3)\` - pushed object
- \`[3] RIGHT -> avatar moved (3,3)->(4,3) collecting obj_7 (ORANGE), +5\` - collected item
- \`[4] RIGHT -> avatar blocked by obj_5 (DARKGRAY)\` - blocked

## Coordinate System
Cartesian coordinates:
- X-axis: left=0, increases rightward. \`LEFT\` decreases x, \`RIGHT\` increases x.
- Y-axis: bottom=0, increases upward. \`UP\` increases y, \`DOWN\` decreases y.
- (0, 0) is bottom-left corner

## Your Task
Using your knowledge of the game rules, explain:
1. What the player just did and what actually happened mechanically
2. What rules they seem to have discovered vs what they're still missing
3. What they should do to win

## Response Format
Respond with valid JSON only:
\`\`\`json
{
  "reasoning": "<mechanical explanation of what happened using your knowledge of the rules>",
  "rules_discovered": "<which game rules the player seems to have figured out>",
  "rules_missing": "<important rules the player hasn't discovered yet>",
  "suggestion": "<what the player should do next to progress, max 150 chars>"
}
\`\`\``;
}


export function buildPrompt(variant, actionHistory, stateText, lastActionName, gameDescText, historyLimit) {
  // Select system prompt
  let systemPrompt;
  if (variant === 'oracle') {
    systemPrompt = buildOraclePrompt(gameDescText || '(no game description available)');
  } else if (variant === 'narrator') {
    systemPrompt = NARRATOR_PROMPT;
  } else {
    systemPrompt = OBSERVER_PROMPT;
  }

  // Build user message (matching src/human_replay/llm_inference.py:build_user_message)
  const parts = [];

  parts.push('## Current State');
  parts.push(stateText);
  parts.push('');

  parts.push('## Action History');
  // Show most recent first, limited
  const limited = actionHistory.length > historyLimit
    ? actionHistory.slice(actionHistory.length - historyLimit)
    : actionHistory;
  for (let i = limited.length - 1; i >= 0; i--) {
    parts.push(limited[i]);
  }
  if (actionHistory.length > historyLimit) {
    parts.push(`... (${actionHistory.length - historyLimit} earlier actions omitted)`);
  }
  parts.push('');

  parts.push('## Action Taken');
  parts.push(lastActionName || 'UNKNOWN');

  return {
    systemPrompt,
    userMessage: parts.join('\n'),
  };
}


// --- OpenRouter API Call ---

export async function callNarrator(apiKey, model, systemPrompt, userMessage) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No choices in API response');
  }
  return data.choices[0].message.content;
}
