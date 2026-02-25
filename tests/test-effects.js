import { describe, it, assert, assertEqual } from './test-framework.js';
import { setupRegistry } from '../engine/setup-registry.js';
import { Rect } from '../engine/rect.js';
import { VGDLSprite, Resource } from '../engine/sprite.js';
import { Immovable, Passive } from '../engine/sprites.js';
import { SpriteRegistry } from '../engine/sprite-registry.js';
import * as effects from '../engine/effects.js';

function makeSprite(key, x, y) {
  return new VGDLSprite({ key, id: `${key}.1`, pos: [x, y], size: [1, 1] });
}

function makeGame() {
  const reg = new SpriteRegistry();
  return {
    kill_list: [],
    create_list: [],
    resource_changes: [],
    score: 0,
    last_reward: 0,
    time: 1,
    sprite_registry: reg,
    domain: { resources_limits: {} },
    killSprite(s) { this.kill_list.push(s); },
    addSpriteCreation(key, pos, id) { this.create_list.push([key, pos, id]); return null; },
    addScore(v) { this.score += v; this.last_reward += v; },
    randomGenerator: { random: () => 0.5, choice: (arr) => arr[0] },
  };
}

export function runEffectTests() {
  setupRegistry();

  describe('killSprite effect', () => {
    it('adds sprite to kill_list', () => {
      const game = makeGame();
      const s = makeSprite('box', 0, 0);
      effects.killSprite(s, null, game);
      assertEqual(game.kill_list.length, 1);
      assertEqual(game.kill_list[0], s);
    });
  });

  describe('changeScore effect', () => {
    it('increases score and last_reward', () => {
      const game = makeGame();
      effects.changeScore(null, null, game, { scoreChange: 5 });
      assertEqual(game.score, 5);
      assertEqual(game.last_reward, 5);
    });
  });

  describe('stepBack effect', () => {
    it('reverts sprite to lastrect', () => {
      const game = makeGame();
      const s = makeSprite('avatar', 5, 5);
      s.lastrect = new Rect(3, 3, 1, 1);
      const partner = makeSprite('wall', 5, 5);
      partner.lastrect = partner.rect;
      effects.stepBack(s, partner, game);
      assertEqual(s.rect.x, 3);
      assertEqual(s.rect.y, 3);
    });

    it('when sprite didnt move, reverts partner', () => {
      const game = makeGame();
      const s = makeSprite('wall', 5, 5);
      s.lastrect = s.rect; // didn't move
      const partner = makeSprite('avatar', 5, 5);
      partner.lastrect = new Rect(4, 5, 1, 1);
      effects.stepBack(s, partner, game);
      assertEqual(partner.rect.x, 4);
    });
  });

  describe('bounceForward effect', () => {
    it('pushes sprite in direction of partner movement', () => {
      const game = makeGame();
      const box = makeSprite('box', 3, 0);
      box.lastrect = new Rect(3, 0, 1, 1);
      const avatar = makeSprite('avatar', 2, 0);
      avatar.lastrect = new Rect(1, 0, 1, 1); // moved right
      avatar.just_pushed = null;
      effects.bounceForward(box, avatar, game);
      // box should have moved right
      assertEqual(box.rect.x, 4);
    });
  });

  describe('undoAll effect', () => {
    it('reverts ALL sprites', () => {
      const game = makeGame();
      const reg = game.sprite_registry;
      reg.registerSpriteClass('a', Immovable, {}, ['a']);
      reg.registerSpriteClass('b', Immovable, {}, ['b']);
      const s1 = reg.createSprite('a', { pos: [5, 5], size: [1, 1] });
      const s2 = reg.createSprite('b', { pos: [10, 10], size: [1, 1] });
      s1.lastrect = new Rect(0, 0, 1, 1);
      s2.lastrect = new Rect(1, 1, 1, 1);
      effects.undoAll(null, null, game);
      assertEqual(s1.rect.x, 0);
      assertEqual(s2.rect.x, 1);
    });
  });

  describe('changeResource effect', () => {
    it('pushes to resource_changes (deferred)', () => {
      const game = makeGame();
      const s = makeSprite('avatar', 0, 0);
      effects.changeResource(s, null, game, { resource: 'key', value: 5 });
      assertEqual(game.resource_changes.length, 1);
      assertEqual(game.resource_changes[0][1], 'key');
      assertEqual(game.resource_changes[0][2], 5);
    });
  });

  describe('killIfOtherHasMore effect', () => {
    it('kills when partner has >= limit', () => {
      const game = makeGame();
      const s = makeSprite('goal', 0, 0);
      const partner = makeSprite('avatar', 0, 0);
      partner.resources['key'] = 3;
      effects.killIfOtherHasMore(s, partner, game, { resource: 'key', limit: 1 });
      assertEqual(game.kill_list.length, 1);
    });

    it('does NOT kill when partner has < limit', () => {
      const game = makeGame();
      const s = makeSprite('goal', 0, 0);
      const partner = makeSprite('avatar', 0, 0);
      partner.resources['key'] = 0;
      effects.killIfOtherHasMore(s, partner, game, { resource: 'key', limit: 1 });
      assertEqual(game.kill_list.length, 0);
    });
  });

  describe('transformTo effect', () => {
    it('kills sprite and creates new one', () => {
      const game = makeGame();
      const s = makeSprite('mushroom', 5, 5);
      s.lastrect = s.rect;
      effects.transformTo(s, null, game, { stype: 'wall' });
      assertEqual(game.kill_list.length, 1);
      assertEqual(game.create_list.length, 1);
      assertEqual(game.create_list[0][0], 'wall');
    });
  });
}
