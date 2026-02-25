// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// VGDLSprite base class - port of src/vgdl/core.py:1217+
import { Rect } from './rect.js';
import { GridPhysics } from './physics.js';
import { COLORS } from './constants.js';

// Pre-built lookup for img=colors/XXX -> [r,g,b]
const _IMG_COLORS = COLORS;

export class VGDLSprite {
  // Class-level defaults (overridden by subclasses)
  static is_static = false;
  static only_active = false;
  static is_avatar = false;
  static is_stochastic = false;
  static color = null;
  static cooldown = 0;
  static speed = null;
  static mass = 1;
  static physicstype = null;
  static shrinkfactor = 0;

  constructor(opts) {
    const {
      key, id, pos, size = [1, 1],
      color, speed, cooldown, physicstype,
      rng, img, resources,
      ...rest
    } = opts;

    this.key = key;
    this.id = id;

    const sz = Array.isArray(size) ? size : [size, size];
    this.rect = new Rect(pos[0], pos[1], sz[0], sz[1]);
    this.lastrect = this.rect;
    this.alive = true;

    // Physics
    const PhysType = physicstype || this.constructor.physicstype || GridPhysics;
    this.physics = new PhysType(sz);

    this.speed = speed !== undefined && speed !== null ? speed : this.constructor.speed;
    this.cooldown = cooldown !== undefined && cooldown !== null ? cooldown : this.constructor.cooldown;
    this.img = img || null;
    this.color = color || this.constructor.color;

    // If img=colors/XXX is set, it overrides the class default color
    if (this.img && this.img.startsWith('colors/')) {
      const colorName = this.img.split('/')[1];
      const resolved = _IMG_COLORS[colorName];
      if (resolved) this.color = resolved;
    }

    // Effect data for once_per_step tracking
    this._effect_data = {};

    // How many ticks since last move
    this.lastmove = 0;

    // Resources defaulting to 0
    this.resources = new Proxy(resources ? { ...resources } : {}, {
      get(target, prop) {
        if (typeof prop === 'string' && !(prop in target) && prop !== 'toJSON'
            && prop !== 'then' && prop !== Symbol.toPrimitive
            && prop !== Symbol.toStringTag && prop !== 'inspect'
            && prop !== 'constructor' && prop !== '__proto__') {
          return 0;
        }
        return target[prop];
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    });

    this.just_pushed = null;
    this.is_static = this.constructor.is_static;
    this.only_active = this.constructor.only_active;
    this.is_avatar = this.constructor.is_avatar;
    this.is_stochastic = this.constructor.is_stochastic;
    this.mass = this.constructor.mass;
    this.shrinkfactor = this.constructor.shrinkfactor;
    this.stypes = [];

    // Apply any additional kwargs
    for (const [name, value] of Object.entries(rest)) {
      this[name] = value;
    }
  }

  update(game) {
    this.lastrect = this.rect;
    this.lastmove += 1;
    if (!this.is_static && !this.only_active) {
      this.physics.passiveMovement(this);
    }
  }

  _updatePosition(orientation, speed) {
    let vx, vy;
    if (speed === undefined || speed === null) {
      const s = this.speed || 0;
      vx = orientation.x * s;
      vy = orientation.y * s;
    } else {
      vx = orientation.x * speed;
      vy = orientation.y * speed;
    }

    if (this.lastmove >= this.cooldown) {
      this.rect = this.rect.move({ x: vx, y: vy });
      this.lastmove = 0;
    }
  }

  get lastdirection() {
    return {
      x: this.rect.x - this.lastrect.x,
      y: this.rect.y - this.lastrect.y,
    };
  }

  toString() {
    return `${this.key} '${this.id}' at (${this.rect.x}, ${this.rect.y})`;
  }
}


// Resource sprite - port of src/vgdl/core.py:1394
export class Resource extends VGDLSprite {
  static value = 1;
  static limit = 2;
  static res_type = null;

  constructor(opts) {
    super(opts);
    this.value = opts.value !== undefined ? opts.value : this.constructor.value;
    this.limit = opts.limit !== undefined ? opts.limit : this.constructor.limit;
    this.res_type = opts.res_type || this.constructor.res_type;
  }

  get resource_type() {
    if (this.res_type === null) {
      return this.key;
    }
    return this.res_type;
  }
}


// Immutable sprite - never moves, minimal state
export class Immutable extends VGDLSprite {
  static is_static = true;

  update(_game) {
    // no-op
  }

  _updatePosition() {
    throw new Error('Tried to move Immutable');
  }
}