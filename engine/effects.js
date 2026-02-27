// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// Effect functions - port of src/vgdl/ontology/effects.py
import { unitVector } from './constants.js';
import { Resource } from './sprite.js';
import { OrientedSprite } from './sprites.js';

export function killSprite(sprite, partner, game) {
  game.killSprite(sprite);
}

export function killBoth(sprite, partner, game) {
  game.killSprite(sprite);
  game.killSprite(partner);
}

export function changeScore(sprite, partner, game, { scoreChange = 0 } = {}) {
  game.addScore(scoreChange);
}

export function cloneSprite(sprite, partner, game) {
  game.addSpriteCreation(sprite.key, [sprite.rect.x, sprite.rect.y]);
}

export function transformTo(sprite, partner, game, { stype = 'wall' } = {}) {
  const lastRectKilled = sprite.lastrect;
  game.killSprite(sprite);
  const newSprite = game.addSpriteCreation(stype, sprite.rect.topleft);
  if (newSprite !== null && newSprite !== undefined) {
    newSprite.lastrect = lastRectKilled;
    if (sprite.orientation !== undefined && newSprite.orientation !== undefined) {
      newSprite.orientation = sprite.orientation;
    }
  }
}

export function stepBackIfHasLess(sprite, partner, game, { resource, limit = 1, no_symmetry = false } = {}) {
  if (sprite.resources[resource] < limit) {
    stepBack(sprite, partner, game, { no_symmetry });
  } else {
    killSprite(partner, sprite, game);
  }
}

export function stepBack(sprite, partner, game, { no_symmetry = false } = {}) {
  if (!game.kill_list.includes(partner) && !game.kill_list.includes(sprite)) {
    if (sprite.rect.equals(sprite.lastrect) && !no_symmetry) {
      partner.rect = partner.lastrect;
      stepBackPusher(partner, 0);
    } else {
      sprite.rect = sprite.lastrect;
      stepBackPusher(sprite, 0);
    }
  }
}

export function stepBackPusher(sprite, depth) {
  if (depth > 5) return;
  if (sprite.just_pushed) {
    sprite.just_pushed.rect = sprite.just_pushed.lastrect;
    stepBackPusher(sprite.just_pushed, depth + 1);
  }
}

export function undoAll(sprite, partner, game) {
  for (const s of game.sprite_registry.sprites()) {
    s.rect = s.lastrect;
  }
}

export function findOriginMvt(partner, depth) {
  if (partner.just_pushed && depth < 3) {
    return findOriginMvt(partner.just_pushed, depth + 1);
  }
  return partner.lastdirection;
}

export function bounceForward(sprite, partner, game) {
  let pushedDir = findOriginMvt(partner, 0);
  if (Math.abs(pushedDir.x) + Math.abs(pushedDir.y) === 0) {
    // Bouncing occurs the other way around
    pushedDir = findOriginMvt(sprite, 0);
    partner.physics.activeMovement(partner, unitVector(pushedDir));
    partner.just_pushed = sprite;
  } else {
    sprite.physics.activeMovement(sprite, unitVector(pushedDir));
    sprite.just_pushed = partner;
  }
}

export function catapultForward(sprite, partner, game) {
  if (sprite.lastrect.colliderect(partner.rect)) return;
  const direction = sprite.lastdirection;
  const len = Math.abs(direction.x) + Math.abs(direction.y);
  if (len === 0) return;
  const dir = unitVector(direction);
  const gridsize = sprite.rect.width;
  const newRect = sprite.rect.copy();
  newRect.x += Math.round(dir.x) * gridsize;
  newRect.y += Math.round(dir.y) * gridsize;
  if (newRect.x < 0 || newRect.y < 0
      || newRect.x + newRect.width > game.screensize[0]
      || newRect.y + newRect.height > game.screensize[1]) return;
  sprite.rect = newRect;
  sprite.lastmove = 0;
}

export function reverseDirection(sprite, partner, game, { with_step_back = true } = {}) {
  if (with_step_back) {
    sprite.rect = sprite.lastrect;
  }
  if (sprite.orientation !== undefined) {
    sprite.orientation = { x: -sprite.orientation.x, y: -sprite.orientation.y };
  }
}

export function turnAround(sprite, partner, game) {
  sprite.rect = sprite.lastrect;
  sprite.lastmove = sprite.cooldown;
  sprite.physics.activeMovement(sprite, { x: 0, y: 1 }, 1); // DOWN
  reverseDirection(sprite, partner, game, { with_step_back: false });
}

export function flipDirection(sprite, partner, game) {
  const BASEDIRS = [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }];
  sprite.orientation = BASEDIRS[Math.floor(game.randomGenerator.random() * BASEDIRS.length)];
}

export function wrapAround(sprite, partner, game, { offset = 0 } = {}) {
  if (sprite.rect.top < 0) {
    sprite.rect.top = game.screensize[1] - sprite.rect.height;
  } else if (sprite.rect.top + sprite.rect.height > game.screensize[1]) {
    sprite.rect.top = 0;
  }
  if (sprite.rect.left < 0) {
    sprite.rect.left = game.screensize[0] - sprite.rect.width;
  } else if (sprite.rect.left + sprite.rect.width > game.screensize[0]) {
    sprite.rect.left = 0;
  }
  sprite.lastmove = 0;
}

export function collectResource(sprite, partner, game) {
  if (!(sprite instanceof Resource)) {
    throw new Error(`collectResource: sprite must be a Resource, got ${sprite.constructor.name}`);
  }
  const r = sprite.resource_type;
  const limit = (game.domain.resources_limits && game.domain.resources_limits[r]) || Infinity;
  partner.resources[r] = Math.max(0, Math.min(partner.resources[r] + sprite.value, limit));
}

export function changeResource(sprite, partner, game, { resource, value = 1 } = {}) {
  game.resource_changes.push([sprite, resource, value]);
}

export function addResource(sprite, partner, game, { resource, value = 1 } = {}) {
  game.resource_changes.push([partner, resource, value]);
  game.kill_list.push(sprite);
}

export function removeResource(sprite, partner, game, { resource, value = -1 } = {}) {
  game.resource_changes.push([partner, resource, value]);
  game.kill_list.push(sprite);
}

export function killIfOtherHasMore(sprite, partner, game, { resource, limit = 1 } = {}) {
  if (partner.resources[resource] >= limit) {
    killSprite(sprite, partner, game);
  }
}

export function killIfHasMore(sprite, partner, game, { resource, limit = 1 } = {}) {
  if (sprite.resources[resource] >= limit) {
    killSprite(sprite, partner, game);
  }
}

export function killIfOtherHasLess(sprite, partner, game, { resource, limit = 1 } = {}) {
  if (partner.resources[resource] <= limit) {
    killSprite(sprite, partner, game);
  }
}

export function killIfHasLess(sprite, partner, game, { resource, limit = 1 } = {}) {
  if (sprite.resources[resource] <= limit) {
    killSprite(sprite, partner, game);
  }
}

export function spawnIfHasMore(sprite, partner, game, { resource, stype, limit = 1 } = {}) {
  if (sprite.resources[resource] >= limit) {
    game.addSpriteCreation(stype, [sprite.rect.x, sprite.rect.y]);
  }
}

export function killIfAlive(sprite, partner, game) {
  if (!game.kill_list.includes(partner)) {
    killSprite(sprite, partner, game);
  }
}

export function conveySprite(sprite, partner, game) {
  const tmp = sprite.lastrect;
  const v = unitVector(partner.orientation);
  sprite.physics.activeMovement(sprite, v, partner.strength || 1);
  sprite.lastrect = tmp;
}

export function pullWithIt(sprite, partner, game) {
  if (!oncePerStep(sprite, game, 't_lastpull')) return;
  const tmp = sprite.lastrect;
  const lastdir = partner.lastdirection;
  const len = Math.abs(lastdir.x) + Math.abs(lastdir.y);
  const v = len > 0 ? unitVector(lastdir) : { x: 1, y: 0 };
  sprite._updatePosition(v, (partner.speed || 1) * sprite.physics.gridsize[0]);
  sprite.lastrect = tmp;
}

export function teleportToExit(sprite, partner, game) {
  const exits = game.sprite_registry.withStype(partner.stype || partner.key);
  if (exits.length > 0) {
    const e = exits[Math.floor(game.randomGenerator.random() * exits.length)];
    sprite.rect = e.rect.copy();
  }
  sprite.lastmove = 0;
}

export function teleportToOther(sprite, partner, game) {
  if (sprite.lastrect.colliderect(partner.rect)) return;
  const siblings = game.sprite_registry.group(partner.key).filter(s => s !== partner);
  if (siblings.length === 0) return;
  const e = siblings[Math.floor(game.randomGenerator.random() * siblings.length)];
  sprite.rect = e.rect.copy();
  // Set lastrect to destination so the sibling portal's guard fires
  // within the same _applyEffect loop (prevents ping-pong teleport)
  sprite.lastrect = e.rect.copy();
  sprite.lastmove = 0;
}

export function wallBounce(sprite, partner, game, { friction = 0 } = {}) {
  if (!oncePerStep(sprite, game, 't_lastbounce')) return;
  if (sprite.speed !== null) sprite.speed *= (1 - friction);
  stepBack(sprite, partner, game);
  if (sprite.orientation !== undefined) {
    if (Math.abs(sprite.rect.centerx - partner.rect.centerx) > Math.abs(sprite.rect.centery - partner.rect.centery)) {
      sprite.orientation = { x: -sprite.orientation.x, y: sprite.orientation.y };
    } else {
      sprite.orientation = { x: sprite.orientation.x, y: -sprite.orientation.y };
    }
  }
}

export function bounceDirection(sprite, partner, game, { friction = 0 } = {}) {
  stepBack(sprite, partner, game);
  if (sprite.orientation !== undefined) {
    const inc = sprite.orientation;
    const snorm = unitVector({
      x: -sprite.rect.centerx + partner.rect.centerx,
      y: -sprite.rect.centery + partner.rect.centery,
    });
    const dp = snorm.x * inc.x + snorm.y * inc.y;
    sprite.orientation = {
      x: -2 * dp * snorm.x + inc.x,
      y: -2 * dp * snorm.y + inc.y,
    };
    if (sprite.speed !== null) sprite.speed *= (1 - friction);
  }
}

// Class-based effects (used via registry)
export class NullEffect {
  constructor(_actor, _actee, _kwargs) {}
  call(_sprite, _partner, _game) {}
}

// Utility: once_per_step
function oncePerStep(sprite, game, name) {
  if (name in sprite._effect_data) {
    if (sprite._effect_data[name] === game.time) {
      return false;
    }
  }
  sprite._effect_data[name] = game.time;
  return true;
}