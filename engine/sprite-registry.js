// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// SpriteRegistry - port of src/vgdl/core.py:22-200
// Manages sprite class definitions and live/dead sprite instances.

export class SpriteRegistry {
  constructor() {
    // Class definitions
    this.classes = {};       // key -> class
    this.classArgs = {};     // key -> default constructor args
    this.stypes = {};        // key -> stype hierarchy array
    this.spriteKeys = [];    // ordered list of registered keys

    this.singletons = [];    // keys that are singletons

    // Instance tracking
    this._spriteById = {};
    this._liveSpritesByKey = {};  // key -> [sprite, ...]
    this._deadSpritesByKey = {};  // key -> [sprite, ...]
  }

  reset() {
    this._liveSpritesByKey = {};
    this._deadSpritesByKey = {};
    this._spriteById = {};
  }

  registerSingleton(key) {
    this.singletons.push(key);
  }

  isSingleton(key) {
    return this.singletons.includes(key);
  }

  registerSpriteClass(key, cls, args, stypes) {
    if (key in this.classes) {
      throw new Error(`Sprite key already registered: ${key}`);
    }
    if (cls === null || cls === undefined) {
      throw new Error(`Cannot register null class for key: ${key}`);
    }
    this.classes[key] = cls;
    this.classArgs[key] = args;
    this.stypes[key] = stypes;
    this.spriteKeys.push(key);
  }

  getSpriteDef(key) {
    if (!(key in this.classes)) {
      throw new Error(`Unknown sprite type '${key}', verify your domain file`);
    }
    return {
      cls: this.classes[key],
      args: this.classArgs[key],
      stypes: this.stypes[key],
    };
  }

  *getSpriteDefs() {
    for (const key of this.spriteKeys) {
      yield [key, this.getSpriteDef(key)];
    }
  }

  _generateIdNumber(key) {
    const liveIds = (this._liveSpritesByKey[key] || [])
      .map(s => parseInt(s.id.split('.').pop()));
    const deadIds = (this._deadSpritesByKey[key] || [])
      .map(s => parseInt(s.id.split('.').pop()));
    const allIds = liveIds.concat(deadIds);
    if (allIds.length > 0) {
      return Math.max(...allIds) + 1;
    }
    return 1;
  }

  generateId(key) {
    const n = this._generateIdNumber(key);
    return `${key}.${n}`;
  }

  createSprite(key, opts) {
    // opts: { id, pos, size, rng, ...extraArgs }
    if (this.isSingleton(key)) {
      const live = this._liveSpritesByKey[key] || [];
      if (live.length > 0) {
        return null;
      }
    }

    const { cls, args, stypes } = this.getSpriteDef(key);
    const id = opts.id || this.generateId(key);

    // Merge class args with instance args
    const mergedOpts = { ...args, ...opts, key, id };
    const sprite = new cls(mergedOpts);
    sprite.stypes = stypes;

    if (!this._liveSpritesByKey[key]) {
      this._liveSpritesByKey[key] = [];
    }
    this._liveSpritesByKey[key].push(sprite);
    this._spriteById[id] = sprite;
    return sprite;
  }

  killSprite(sprite) {
    sprite.alive = false;
    const key = sprite.key;
    const liveList = this._liveSpritesByKey[key];
    if (liveList) {
      const idx = liveList.indexOf(sprite);
      if (idx !== -1) {
        liveList.splice(idx, 1);
        if (!this._deadSpritesByKey[key]) {
          this._deadSpritesByKey[key] = [];
        }
        this._deadSpritesByKey[key].push(sprite);
      }
    }
  }

  group(key, includeDead = false) {
    const live = this._liveSpritesByKey[key] || [];
    if (!includeDead) return live;
    const dead = this._deadSpritesByKey[key] || [];
    return live.concat(dead);
  }

  *groups(includeDead = false) {
    for (const key of this.spriteKeys) {
      if (includeDead) {
        const live = this._liveSpritesByKey[key] || [];
        const dead = this._deadSpritesByKey[key] || [];
        yield [key, live.concat(dead)];
      } else {
        yield [key, this._liveSpritesByKey[key] || []];
      }
    }
  }

  *sprites(includeDead = false) {
    if (includeDead) {
      throw new Error('sprites(includeDead=true) not supported');
    }
    for (const key of this.spriteKeys) {
      const list = this._liveSpritesByKey[key] || [];
      for (const sprite of list) {
        yield sprite;
      }
    }
  }

  spritesArray() {
    const result = [];
    for (const key of this.spriteKeys) {
      const list = this._liveSpritesByKey[key] || [];
      for (const sprite of list) {
        result.push(sprite);
      }
    }
    return result;
  }

  withStype(stype, includeDead = false) {
    // Direct key match first
    if (this.spriteKeys.includes(stype)) {
      return this.group(stype, includeDead);
    }
    // Otherwise check stype hierarchy
    const result = [];
    for (const key of this.spriteKeys) {
      if (this.stypes[key] && this.stypes[key].includes(stype)) {
        const list = includeDead
          ? (this._liveSpritesByKey[key] || []).concat(this._deadSpritesByKey[key] || [])
          : (this._liveSpritesByKey[key] || []);
        result.push(...list);
      }
    }
    return result;
  }

  getAvatar() {
    for (const [, sprites] of this.groups(true)) {
      if (sprites.length > 0 && this.isAvatar(sprites[0])) {
        return sprites[0];
      }
    }
    return null;
  }

  isAvatar(sprite) {
    return this.isAvatarCls(sprite.constructor);
  }

  isAvatarCls(cls) {
    // Walk the prototype chain looking for 'Avatar' in the name
    let current = cls;
    while (current && current.name) {
      if (current.name.includes('Avatar')) return true;
      current = Object.getPrototypeOf(current);
    }
    return false;
  }

  // Deep copy for building a level from a domain
  deepCopy() {
    const copy = new SpriteRegistry();
    copy.classes = { ...this.classes };
    copy.classArgs = {};
    for (const [k, v] of Object.entries(this.classArgs)) {
      copy.classArgs[k] = { ...v };
    }
    copy.stypes = {};
    for (const [k, v] of Object.entries(this.stypes)) {
      copy.stypes[k] = [...v];
    }
    copy.spriteKeys = [...this.spriteKeys];
    copy.singletons = [...this.singletons];
    return copy;
  }
}