// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// Avatar sprite classes - port of src/vgdl/ontology/avatars.py
import { VGDLSprite } from './sprite.js';
import { OrientedSprite, SpriteProducer } from './sprites.js';
import { Action, ACTION, NOOP } from './action.js';
import { WHITE, GREEN, RIGHT, LEFT, UP, DOWN, vecEquals, unitVector } from './constants.js';

// Helper: find which Action matches the current active_keys
function readAction(sprite, game) {
  const activeKeys = [...game.active_keys].sort();

  // Try longest combo first
  for (let numKeys = Math.max(3, activeKeys.length); numKeys >= 0; numKeys--) {
    for (const combo of combinations(activeKeys, numKeys)) {
      const comboKey = combo.join(',');
      if (sprite._keysToAction.has(comboKey)) {
        return sprite._keysToAction.get(comboKey);
      }
    }
  }
  throw new Error('No valid actions encountered, consider allowing NO_OP');
}

// Generate all combinations of length r from array
function combinations(arr, r) {
  if (r === 0) return [[]];
  if (arr.length === 0) return [];
  const result = [];
  function helper(start, combo) {
    if (combo.length === r) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

function buildKeysToAction(actions) {
  const map = new Map();
  for (const action of Object.values(actions)) {
    const key = [...action.keys].sort().join(',');
    map.set(key, action);
  }
  return map;
}


export class MovingAvatar extends VGDLSprite {
  static color = WHITE;
  static speed = 1;
  static is_avatar = true;

  constructor(opts) {
    super(opts);
    this.is_avatar = true;

    const actions = this.constructor.declarePossibleActions();
    this._keysToAction = buildKeysToAction(actions);
  }

  static declarePossibleActions() {
    return {
      UP: new Action('UP'),
      DOWN: new Action('DOWN'),
      LEFT: new Action('LEFT'),
      RIGHT: new Action('RIGHT'),
      NO_OP: new Action(),
    };
  }

  update(game) {
    VGDLSprite.prototype.update.call(this, game);
    const action = readAction(this, game);
    if (!action.equals(NOOP)) {
      this.physics.activeMovement(this, action);
    }
  }
}


export class OrientedAvatar extends VGDLSprite {
  static color = WHITE;
  static speed = 1;
  static is_avatar = true;
  static draw_arrow = false;

  constructor(opts) {
    super(opts);
    this.is_avatar = true;
    if (this.orientation === undefined) {
      this.orientation = opts.orientation || RIGHT;
    }
    const actions = this.constructor.declarePossibleActions();
    this._keysToAction = buildKeysToAction(actions);
  }

  static declarePossibleActions() {
    return {
      UP: new Action('UP'),
      DOWN: new Action('DOWN'),
      LEFT: new Action('LEFT'),
      RIGHT: new Action('RIGHT'),
      NO_OP: new Action(),
    };
  }

  update(game) {
    const lastOrientation = this.orientation;
    this.orientation = { x: 0, y: 0 };
    VGDLSprite.prototype.update.call(this, game);

    const action = readAction(this, game);
    if (action) {
      this.physics.activeMovement(this, action);
    }

    const lastdir = this.lastdirection;
    const lastdirLen = Math.abs(lastdir.x) + Math.abs(lastdir.y);
    if (lastdirLen !== 0) {
      this.orientation = lastdir;
    } else {
      this.orientation = lastOrientation;
    }
  }
}


export class ShootAvatar extends OrientedAvatar {
  static ammo = null;

  constructor(opts) {
    super(opts);
    this.stype = opts.stype || null;
    this.ammo = opts.ammo !== undefined ? opts.ammo : this.constructor.ammo;
  }

  static declarePossibleActions() {
    const actions = OrientedAvatar.declarePossibleActions();
    actions.SPACE = new Action('SPACE');
    return actions;
  }

  update(game) {
    OrientedAvatar.prototype.update.call(this, game);

    const action = readAction(this, game);
    if (this._hasAmmo() && action.equals(ACTION.SPACE)) {
      this._shoot(game);
    }
  }

  _hasAmmo() {
    if (this.ammo === null) return true;
    if (this.ammo in this.resources) {
      return this.resources[this.ammo] > 0;
    }
    return false;
  }

  _spendAmmo() {
    if (this.ammo !== null && this.ammo in this.resources) {
      this.resources[this.ammo] -= 1;
    }
  }

  _shoot(game) {
    if (this.stype === null) return;

    const directions = this._shootDirections(game);
    for (const dir of directions) {
      const neighbor = [
        this.lastrect.x + dir.x * this.lastrect.w,
        this.lastrect.y + dir.y * this.lastrect.h,
      ];
      const sprite = game.createSprite(this.stype, neighbor);
      if (sprite && sprite.orientation !== undefined) {
        sprite.orientation = dir;
      }
    }
    this._spendAmmo();
  }

  _shootDirections(_game) {
    return [unitVector(this.orientation)];
  }
}


export class HorizontalAvatar extends MovingAvatar {
  static declarePossibleActions() {
    return {
      LEFT: new Action('LEFT'),
      RIGHT: new Action('RIGHT'),
      NO_OP: new Action(),
    };
  }

  update(game) {
    VGDLSprite.prototype.update.call(this, game);
    const action = readAction(this, game);
    const v = action.asVector();
    if (vecEquals(v, RIGHT) || vecEquals(v, LEFT)) {
      this.physics.activeMovement(this, action);
    }
  }
}


export class FlakAvatar extends HorizontalAvatar {
  static color = GREEN;

  constructor(opts) {
    super(opts);
    this.stype = opts.stype || null;
  }

  static declarePossibleActions() {
    const actions = HorizontalAvatar.declarePossibleActions();
    actions.SPACE = new Action('SPACE');
    return actions;
  }

  update(game) {
    HorizontalAvatar.prototype.update.call(this, game);
    if (this.stype && game.active_keys.includes('SPACE')) {
      game.createSprite(this.stype, [this.rect.x, this.rect.y]);
    }
  }
}