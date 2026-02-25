// Termination conditions - port of src/vgdl/ontology/terminations.py

export class Termination {
  constructor({ win = true, scoreChange = 0 } = {}) {
    this.win = win;
    this.score = scoreChange;
  }

  isDone(_game) {
    return [false, null];
  }
}

export class Timeout extends Termination {
  constructor(opts = {}) {
    super(opts);
    this.limit = opts.limit || 0;
  }

  isDone(game) {
    if (game.time >= this.limit) {
      return [true, this.win];
    }
    return [false, null];
  }
}

export class SpriteCounter extends Termination {
  constructor(opts = {}) {
    super(opts);
    this.limit = opts.limit !== undefined ? opts.limit : 0;
    this.stype = opts.stype || null;
  }

  isDone(game) {
    if (game.numSprites(this.stype) <= this.limit) {
      return [true, this.win];
    }
    return [false, null];
  }

  toString() {
    return `SpriteCounter(stype=${this.stype})`;
  }
}

export class MultiSpriteCounter extends Termination {
  constructor(opts = {}) {
    // MultiSpriteCounter passes win directly to super
    const { win = true, scoreChange = 0, limit = 0, ...rest } = opts;
    super({ win, scoreChange });
    this.limit = limit;
    // stypes come from remaining kwargs (stype1, stype2, ...)
    this.stypes = [];
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith('stype')) {
        this.stypes.push(value);
      }
    }
  }

  isDone(game) {
    let total = 0;
    for (const st of this.stypes) {
      total += game.numSprites(st);
    }
    if (total === this.limit) {
      return [true, this.win];
    }
    return [false, null];
  }
}

export class ResourceCounter extends Termination {
  constructor(opts = {}) {
    super(opts);
    this.stype = opts.stype || null;
    this.limit = opts.limit || 0;
  }

  isDone(game) {
    const avatars = game.getAvatars();
    if (avatars.length === 0) return [false, null];
    const avatar = avatars[0];
    const satisfied = (avatar.resources[this.stype] || 0) >= this.limit;
    return [satisfied, this.win];
  }
}
