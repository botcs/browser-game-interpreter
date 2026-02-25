// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// NPC sprite subclasses - port of src/vgdl/ontology/sprites.py
import { VGDLSprite, Resource } from './sprite.js';
import { GRAY, RED, BLUE, BLACK, ORANGE, RIGHT, BASEDIRS } from './constants.js';
import { GridPhysics } from './physics.js';

export class Immovable extends VGDLSprite {
  static color = GRAY;
  static is_static = true;
}

export class Passive extends VGDLSprite {
  static color = RED;
}

export class ResourcePack extends Resource {
  static is_static = true;
}

export class Flicker extends VGDLSprite {
  static color = RED;
  static limit = 1;

  constructor(opts) {
    super(opts);
    this._age = 0;
    if (opts.limit !== undefined) this.limit = opts.limit;
    else this.limit = this.constructor.limit;
  }

  update(game) {
    super.update(game);
    this._age += 1;
    if (this._age >= this.limit) {
      game.killSprite(this);
    }
  }
}

export class OrientedSprite extends VGDLSprite {
  static draw_arrow = false;

  constructor(opts) {
    super(opts);
    if (this.orientation === undefined) {
      this.orientation = opts.orientation || RIGHT;
    }
  }
}

export class Missile extends OrientedSprite {
  static speed = 1;
}

export class OrientedFlicker extends OrientedSprite {
  static draw_arrow = true;
  static speed = 0;

  constructor(opts) {
    super(opts);
    this._age = 0;
    if (opts.limit !== undefined) this.limit = opts.limit;
    else this.limit = this.constructor.limit || 1;
  }

  update(game) {
    super.update(game);
    this._age += 1;
    if (this._age >= this.limit) {
      game.killSprite(this);
    }
  }
}
// Set default limit for OrientedFlicker
OrientedFlicker.limit = 1;

export class SpriteProducer extends VGDLSprite {
  static stype = null;
}

export class Portal extends SpriteProducer {
  static is_static = true;
  static is_stochastic = true;
  static color = BLUE;
}

export class SpawnPoint extends SpriteProducer {
  static color = BLACK;
  static is_static = true;

  constructor(opts) {
    super(opts);
    this.counter = 0;
    this.prob = opts.prob !== undefined ? opts.prob : 1;
    this.total = opts.total !== undefined ? opts.total : null;
    if (opts.cooldown !== undefined) this.cooldown = opts.cooldown;
    else if (this.cooldown === 0) this.cooldown = 1;
    this.is_stochastic = (this.prob > 0 && this.prob < 1);
  }

  update(game) {
    if (game.time % this.cooldown === 0 && game.randomGenerator.random() < this.prob) {
      game.addSpriteCreation(this.stype, [this.rect.x, this.rect.y]);
      this.counter += 1;
    }
    if (this.total && this.counter >= this.total) {
      game.killSprite(this);
    }
  }
}

export class RandomNPC extends VGDLSprite {
  static speed = 1;
  static is_stochastic = true;

  update(game) {
    super.update(game);
    const dir = BASEDIRS[Math.floor(game.randomGenerator.random() * BASEDIRS.length)];
    this.physics.activeMovement(this, dir);
  }
}

export class Chaser extends RandomNPC {
  static stype = null;

  constructor(opts) {
    super(opts);
    this.fleeing = opts.fleeing || false;
    this.stype = opts.stype || this.constructor.stype;
  }

  _closestTargets(game) {
    let bestd = 1e100;
    let res = [];
    const targets = game.getSprites(this.stype);
    for (const target of targets) {
      const d = this.physics.distance(this.rect, target.rect);
      if (d < bestd) {
        bestd = d;
        res = [target];
      } else if (d === bestd) {
        res.push(target);
      }
    }
    return res;
  }

  _movesToward(game, target) {
    const res = [];
    const basedist = this.physics.distance(this.rect, target.rect);
    for (const a of BASEDIRS) {
      const r = this.rect.move(a);
      const newdist = this.physics.distance(r, target.rect);
      if (this.fleeing && basedist < newdist) {
        res.push(a);
      }
      if (!this.fleeing && basedist > newdist) {
        res.push(a);
      }
    }
    return res;
  }

  update(game) {
    VGDLSprite.prototype.update.call(this, game);
    let options = [];
    for (const target of this._closestTargets(game)) {
      options.push(...this._movesToward(game, target));
    }
    if (options.length === 0) {
      options = [...BASEDIRS];
    }
    const choice = options[Math.floor(game.randomGenerator.random() * options.length)];
    this.physics.activeMovement(this, choice);
  }
}

export class Fleeing extends Chaser {
  constructor(opts) {
    super({ ...opts, fleeing: true });
  }
}

export class Bomber extends SpawnPoint {
  static color = ORANGE;
  static is_static = false;

  constructor(opts) {
    super(opts);
    if (this.orientation === undefined) {
      this.orientation = opts.orientation || RIGHT;
    }
    this.speed = opts.speed !== undefined ? opts.speed : 1;
  }

  update(game) {
    // Missile-like movement
    this.lastrect = this.rect;
    this.lastmove += 1;
    if (!this.is_static && !this.only_active) {
      this.physics.passiveMovement(this);
    }
    // SpawnPoint logic
    SpawnPoint.prototype.update.call(this, game);
  }
}

export class Walker extends Missile {
  static is_stochastic = true;

  update(game) {
    const lastdir = this.lastdirection;
    if (lastdir.x === 0) {
      let d;
      if (this.orientation.x > 0) d = 1;
      else if (this.orientation.x < 0) d = -1;
      else d = game.randomGenerator.random() < 0.5 ? -1 : 1;
      this.physics.activeMovement(this, { x: d, y: 0 });
    }
    super.update(game);
  }
}

export class Conveyor extends OrientedSprite {
  static is_static = true;
  static color = BLUE;
  static strength = 1;
  static draw_arrow = true;
}

export class Spreader extends Flicker {
  static spreadprob = 1.0;

  update(game) {
    super.update(game);
    if (this._age === 2) {
      for (const u of BASEDIRS) {
        if (game.randomGenerator.random() < (this.spreadprob || Spreader.spreadprob)) {
          game.addSpriteCreation(this.name, [
            this.lastrect.x + u.x * this.lastrect.w,
            this.lastrect.y + u.y * this.lastrect.h,
          ]);
        }
      }
    }
  }
}