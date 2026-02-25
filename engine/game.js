// BasicGame and BasicGameLevel - port of src/vgdl/core.py:496-1200
import { Rect } from './rect.js';
import { Resource } from './sprite.js';
import { SpriteRegistry } from './sprite-registry.js';

// Seeded PRNG (simple mulberry32)
export class SeededRandom {
  constructor(seed = 42) {
    this._seed = seed;
    this._state = seed;
  }

  random() {
    let t = this._state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  choice(arr) {
    return arr[Math.floor(this.random() * arr.length)];
  }

  seed(s) {
    this._state = s;
    this._seed = s;
  }
}


// Effect base class
export class Effect {
  constructor(actorStype, acteeStype, { scoreChange = 0 } = {}) {
    this.actor_stype = actorStype;
    this.actee_stype = acteeStype;
    this.score = scoreChange;
    this.is_stochastic = false;
  }

  call(sprite, partner, game) {
    throw new Error('Effect.call not implemented');
  }

  get name() {
    return this.constructor.name;
  }
}


// FunctionalEffect wraps a plain function as an effect
export class FunctionalEffect extends Effect {
  constructor(fn, actorStype, acteeStype, kwargs = {}) {
    const scoreChange = kwargs.scoreChange || 0;
    super(actorStype, acteeStype, { scoreChange });
    this.callFn = fn;
    // Remove scoreChange from kwargs passed to the function
    const { scoreChange: _sc, ...fnArgs } = kwargs;
    this.fnArgs = fnArgs;
    this._name = fn.name || 'anonymous';
  }

  call(sprite, partner, game) {
    if (Object.keys(this.fnArgs).length > 0) {
      return this.callFn(sprite, partner, game, this.fnArgs);
    }
    return this.callFn(sprite, partner, game);
  }

  get name() {
    return this._name;
  }
}


export class BasicGame {
  constructor(spriteRegistry, opts = {}) {
    this.domain_registry = spriteRegistry;
    this.title = opts.title || null;
    this.seed = opts.seed !== undefined ? opts.seed : 42;
    this.block_size = opts.block_size || 1;

    this.notable_resources = [];
    this.sprite_order = [];
    this.collision_eff = [];
    this.char_mapping = {};
    this.terminations = [];
    this.resources_limits = {};
    this.resources_colors = {};
    this.is_stochastic = false;
  }

  finishSetup() {
    this.is_stochastic = this.collision_eff.some(e => e.is_stochastic);
    this.setupResources();

    // Avatar should be updated last
    const avatarIdx = this.sprite_order.indexOf('avatar');
    if (avatarIdx !== -1) {
      this.sprite_order.splice(avatarIdx, 1);
      this.sprite_order.push('avatar');
    }
  }

  setupResources() {
    this.notable_resources = [];
    for (const [resType, { cls, args }] of this.domain_registry.getSpriteDefs()) {
      if (cls.prototype instanceof Resource || cls === Resource) {
        let rt = resType;
        if (args.res_type) rt = args.res_type;
        if (args.color) this.resources_colors[rt] = args.color;
        if (args.limit !== undefined) this.resources_limits[rt] = args.limit;
        this.notable_resources.push(rt);
      }
    }
  }

  buildLevel(lstr) {
    const lines = lstr.split('\n').filter(l => l.length > 0);
    const lengths = lines.map(l => l.length);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    if (minLen !== maxLen) {
      throw new Error(`Inconsistent line lengths: min=${minLen}, max=${maxLen}`);
    }

    const level = new BasicGameLevel(
      this,
      this.domain_registry.deepCopy(),
      lstr,
      lengths[0],
      lines.length,
      this.seed
    );

    // Create sprites from level mapping
    for (let row = 0; row < lines.length; row++) {
      for (let col = 0; col < lines[row].length; col++) {
        const c = lines[row][col];
        const keys = this.char_mapping[c];
        if (keys) {
          const pos = [col * this.block_size, row * this.block_size];
          level.createSprites(keys, pos);
        }
      }
    }

    level.initState = level.getGameState();
    return level;
  }
}


export class BasicGameLevel {
  constructor(domain, spriteRegistry, levelstring, width, height, seed = 0) {
    this.domain = domain;
    this.sprite_registry = spriteRegistry;
    this.levelstring = levelstring;
    this.width = width;
    this.height = height;
    this.block_size = domain.block_size;
    this.screensize = [this.width * this.block_size, this.height * this.block_size];

    // Random state
    this.seed = seed;
    this.randomGenerator = new SeededRandom(seed);

    // Deferred queues
    this.kill_list = [];
    this.create_list = [];
    this.resource_changes = [];

    // Game state
    this.score = 0;
    this.last_reward = 0;
    this.time = 0;
    this.ended = false;
    this.won = false;
    this.lose = false;
    this.is_stochastic = false;
    this.active_keys = [];
    this.events_triggered = [];
    this.initState = null;

    // Game rect for EOS detection
    this._gameRect = new Rect(0, 0, this.screensize[0], this.screensize[1]);
  }

  reset() {
    this.score = 0;
    this.last_reward = 0;
    this.time = 0;
    this.ended = false;
    this.won = false;
    this.lose = false;
    this.kill_list = [];
    this.create_list = [];
    this.resource_changes = [];
    this.active_keys = [];
    this.events_triggered = [];
    if (this.initState) {
      this.setGameState(this.initState);
    }
  }

  createSprite(key, pos, id) {
    const sprite = this.sprite_registry.createSprite(key, {
      pos,
      id,
      size: [this.block_size, this.block_size],
      rng: this.randomGenerator,
    });
    if (sprite) {
      this.is_stochastic = this.domain.is_stochastic || sprite.is_stochastic || this.is_stochastic;
    }
    return sprite;
  }

  createSprites(keys, pos) {
    return keys.map(key => this.createSprite(key, pos)).filter(Boolean);
  }

  killSprite(sprite) {
    this.kill_list.push(sprite);
  }

  addSpriteCreation(key, pos, id) {
    this.create_list.push([key, pos, id]);
    // For transformTo: immediately create and return the sprite
    // This matches the Python behavior where transformTo calls
    // game.add_sprite_creation which also returns a new sprite
    return null;
  }

  addScore(scoreVal) {
    this.score += scoreVal;
    this.last_reward += scoreVal;
  }

  numSprites(key) {
    return this.sprite_registry.withStype(key).length;
  }

  getSprites(key) {
    return this.sprite_registry.withStype(key);
  }

  getAvatars() {
    const res = [];
    for (const [, ss] of this.sprite_registry.groups(true)) {
      if (ss.length > 0 && this.sprite_registry.isAvatar(ss[0])) {
        res.push(...ss);
      }
    }
    return res;
  }

  containsRect(rect) {
    return this._gameRect.contains(rect);
  }

  tick(action) {
    this.time += 1;
    this.last_reward = 0;

    if (this.ended) return;

    // Set active keys from action
    this.active_keys = action.keys;

    // Update all sprites
    const allSprites = this.sprite_registry.spritesArray();
    for (const s of allSprites) {
      s.just_pushed = null;
    }
    for (const s of allSprites) {
      s.update(this);
    }

    // Handle collision effects
    this.events_triggered = [];
    const [ss, moveEvents, moveEventKeys] = this._moveEventHandling();
    const [nonMoveEvents, nonMoveEventKeys] = this._eventHandling(ss);
    this.events_triggered = moveEvents.concat(nonMoveEvents);

    // Flush kill list
    for (const sprite of this.kill_list) {
      this.sprite_registry.killSprite(sprite);
    }
    // Flush create list
    for (const [key, pos, id] of this.create_list) {
      this.createSprite(key, pos, id);
    }
    // Flush resource changes
    for (const [sprite, resource, value] of this.resource_changes) {
      const limit = (this.domain.resources_limits && this.domain.resources_limits[resource]) || Infinity;
      sprite.resources[resource] = Math.max(0, Math.min(sprite.resources[resource] + value, limit));
    }

    // Check terminations
    this._checkTerminations();

    // Clear queues
    this.kill_list = [];
    this.create_list = [];
    this.resource_changes = [];
  }

  _moveEventHandling() {
    let allEventsTriggered = [];
    let allEventsTriggeredKeys = [];
    const ss = {};

    // Apply stepbacks
    const stepbackEffects = this.domain.collision_eff.filter(e => e.name === 'stepBack');
    for (const effect of stepbackEffects) {
      const [, events, eventKeys] = this._applyEffect(effect, ss);
      allEventsTriggered.push(...events);
      allEventsTriggeredKeys.push(...eventKeys);
    }

    // Apply movements (bounceForward, reverseDirection, turnAround)
    const moveEffects = this.domain.collision_eff.filter(
      e => ['bounceForward', 'reverseDirection', 'turnAround'].includes(e.name)
    );
    for (const effect of moveEffects) {
      const [, events, eventKeys] = this._applyEffect(effect, ss);
      allEventsTriggered.push(...events);
      allEventsTriggeredKeys.push(...eventKeys);
    }

    // Reapply stepbacks
    for (const effect of stepbackEffects) {
      const [, events, eventKeys] = this._applyEffect(effect, ss);
      allEventsTriggered.push(...events);
      allEventsTriggeredKeys.push(...eventKeys);
    }

    return [ss, allEventsTriggered, allEventsTriggeredKeys];
  }

  _eventHandling(ss) {
    let allEventsTriggered = [];
    let allEventsTriggeredKeys = [];
    const nonMoveEffects = this.domain.collision_eff.filter(
      e => !['stepBack', 'bounceForward', 'reverseDirection', 'turnAround'].includes(e.name)
    );

    for (const effect of nonMoveEffects) {
      const [, events, eventKeys] = this._applyEffect(effect, ss);
      allEventsTriggered.push(...events);
      allEventsTriggeredKeys.push(...eventKeys);
    }
    return [allEventsTriggered, allEventsTriggeredKeys];
  }

  _applyEffect(effect, ss) {
    const eventsTriggered = [];
    const eventsTriggeredKeys = [];
    const g1 = effect.actor_stype;
    const g2 = effect.actee_stype;

    // Build sprite lists if not cached
    if (!(g1 in ss)) {
      ss[g1] = this.sprite_registry.withStype(g1);
    }
    if (g2 !== 'EOS' && !(g2 in ss)) {
      ss[g2] = this.sprite_registry.withStype(g2);
    }

    // EOS (end-of-screen) handling
    if (g2 === 'EOS') {
      const sprites = ss[g1];
      for (let i = sprites.length - 1; i >= 0; i--) {
        const s1 = sprites[i];
        if (!this.containsRect(s1.rect)) {
          this.addScore(effect.score);
          effect.call(s1, null, this);
          eventsTriggered.push([effect.name, s1.id, 'EOS']);
          eventsTriggeredKeys.push([effect.name, s1.key, 'EOS', [s1.rect.x, s1.rect.y], [null, null]]);
          // If still out of bounds and alive, kill it
          if (!this.containsRect(s1.rect) && s1.alive) {
            this.killSprite(s1);
          }
        }
      }
      return [ss, eventsTriggered, eventsTriggeredKeys];
    }

    let sprites = ss[g1];
    let others = ss[g2];
    if (sprites.length === 0 || others.length === 0) {
      return [ss, eventsTriggered, eventsTriggeredKeys];
    }

    let reverse = false;
    if (sprites.length > others.length) {
      [sprites, others] = [others, sprites];
      reverse = true;
    }

    for (const sprite of sprites) {
      // Check collisions using rect overlap
      for (const other of others) {
        if (sprite === other) continue;
        if (!sprite.rect.colliderect(other.rect)) continue;

        if (reverse) {
          if (!this.kill_list.includes(other)) {
            this.addScore(effect.score);
            effect.call(other, sprite, this);
            eventsTriggered.push([effect.name, other.id, sprite.id]);
            eventsTriggeredKeys.push([effect.name, other.key, sprite.key,
              [other.rect.x, other.rect.y], [sprite.rect.x, sprite.rect.y]]);
          }
        } else {
          if (!this.kill_list.includes(sprite)) {
            this.addScore(effect.score);
            effect.call(sprite, other, this);
            eventsTriggered.push([effect.name, sprite.id, other.id]);
            eventsTriggeredKeys.push([effect.name, sprite.key, other.key,
              [sprite.rect.x, sprite.rect.y], [other.rect.x, other.rect.y]]);
          }
        }
      }
    }

    return [ss, eventsTriggered, eventsTriggeredKeys];
  }

  _checkTerminations() {
    this.lose = false;
    for (const t of this.domain.terminations) {
      const [ended, won] = t.isDone(this);
      this.ended = ended;
      this.won = won === null ? false : won;

      if (t.constructor.name === 'Timeout') {
        // Timeout is just checked
      } else if (['SpriteCounter', 'MultiSpriteCounter'].includes(t.constructor.name)) {
        if (this.ended && !this.won) {
          this.lose = true;
        }
      }

      if (this.ended) {
        this.addScore(t.score);
        break;
      }
    }
  }

  getGameState() {
    // Simple state snapshot for reset
    const spriteStates = {};
    for (const key of this.sprite_registry.spriteKeys) {
      const live = this.sprite_registry._liveSpritesByKey[key] || [];
      const dead = this.sprite_registry._deadSpritesByKey[key] || [];
      spriteStates[key] = [...live, ...dead].map(s => ({
        id: s.id,
        key: s.key,
        x: s.rect.x,
        y: s.rect.y,
        w: s.rect.w,
        h: s.rect.h,
        alive: s.alive,
        resources: { ...s.resources },
        speed: s.speed,
        cooldown: s.cooldown,
        orientation: s.orientation ? { ...s.orientation } : undefined,
        _age: s._age,
        lastmove: s.lastmove,
      }));
    }
    return {
      score: this.score,
      time: this.time,
      sprites: spriteStates,
    };
  }

  setGameState(state) {
    this.sprite_registry.reset();
    this.score = state.score;
    this.time = state.time;

    for (const [key, spritesData] of Object.entries(state.sprites)) {
      for (const sd of spritesData) {
        const sprite = this.sprite_registry.createSprite(key, {
          id: sd.id,
          pos: [sd.x, sd.y],
          size: [sd.w, sd.h],
          rng: this.randomGenerator,
        });
        if (sprite) {
          sprite.resources = new Proxy({ ...sd.resources }, {
            get(target, prop) {
              if (typeof prop === 'string' && !(prop in target) && prop !== 'toJSON'
                  && prop !== 'then' && prop !== Symbol.toPrimitive
                  && prop !== Symbol.toStringTag && prop !== 'inspect'
                  && prop !== 'constructor' && prop !== '__proto__') {
                return 0;
              }
              return target[prop];
            },
            set(target, prop, value) { target[prop] = value; return true; },
          });
          if (sd.speed !== undefined) sprite.speed = sd.speed;
          if (sd.cooldown !== undefined) sprite.cooldown = sd.cooldown;
          if (sd.orientation) sprite.orientation = { ...sd.orientation };
          if (sd._age !== undefined) sprite._age = sd._age;
          if (sd.lastmove !== undefined) sprite.lastmove = sd.lastmove;
          sprite.alive = sd.alive;
          if (!sd.alive) {
            this.sprite_registry.killSprite(sprite);
          }
        }
      }
    }
  }
}
