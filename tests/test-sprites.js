import { describe, it, assert, assertEqual } from './test-framework.js';
import { setupRegistry } from '../engine/setup-registry.js';
import { SpriteRegistry } from '../engine/sprite-registry.js';
import { Immovable, Flicker, Missile, SpawnPoint, RandomNPC, Chaser, OrientedFlicker } from '../engine/sprites.js';
import { MovingAvatar, ShootAvatar } from '../engine/avatars.js';
import { VGDLSprite, Resource } from '../engine/sprite.js';
import { RIGHT, DOWN } from '../engine/constants.js';
import { SeededRandom } from '../engine/game.js';

export function runSpriteTests() {
  setupRegistry();

  describe('VGDLSprite basics', () => {
    it('update saves lastrect and increments lastmove', () => {
      const s = new VGDLSprite({ key: 'test', id: 'test.1', pos: [0, 0], size: [1, 1] });
      s.lastmove = 5;
      const game = { time: 1 };
      s.update(game);
      assertEqual(s.lastmove, 6);
    });

    it('resources default to 0', () => {
      const s = new VGDLSprite({ key: 'test', id: 'test.1', pos: [0, 0], size: [1, 1] });
      assertEqual(s.resources['gold'], 0);
      assertEqual(s.resources['anything'], 0);
    });
  });

  describe('SpriteRegistry', () => {
    it('registerClass + createSprite works', () => {
      const reg = new SpriteRegistry();
      reg.registerSpriteClass('wall', Immovable, { color: [90, 90, 90] }, ['wall']);
      const s = reg.createSprite('wall', { pos: [5, 5], size: [1, 1] });
      assert(s !== null);
      assertEqual(s.key, 'wall');
      assertEqual(s.rect.x, 5);
    });

    it('generates unique IDs', () => {
      const reg = new SpriteRegistry();
      reg.registerSpriteClass('box', Immovable, {}, ['box']);
      const s1 = reg.createSprite('box', { pos: [0, 0], size: [1, 1] });
      const s2 = reg.createSprite('box', { pos: [1, 0], size: [1, 1] });
      assert(s1.id !== s2.id);
    });

    it('singleton prevents second instance', () => {
      const reg = new SpriteRegistry();
      reg.registerSpriteClass('hero', Immovable, {}, ['hero']);
      reg.registerSingleton('hero');
      const s1 = reg.createSprite('hero', { pos: [0, 0], size: [1, 1] });
      const s2 = reg.createSprite('hero', { pos: [1, 1], size: [1, 1] });
      assert(s1 !== null);
      assert(s2 === null);
    });

    it('killSprite moves to dead', () => {
      const reg = new SpriteRegistry();
      reg.registerSpriteClass('coin', Immovable, {}, ['coin']);
      const s = reg.createSprite('coin', { pos: [0, 0], size: [1, 1] });
      assertEqual(reg.group('coin').length, 1);
      reg.killSprite(s);
      assertEqual(reg.group('coin').length, 0);
      assertEqual(reg.group('coin', true).length, 1);
    });

    it('withStype matches parent type', () => {
      const reg = new SpriteRegistry();
      reg.registerSpriteClass('chaser1', Immovable, {}, ['chaser1', 'mover']);
      reg.registerSpriteClass('chaser2', Immovable, {}, ['chaser2', 'mover']);
      reg.createSprite('chaser1', { pos: [0, 0], size: [1, 1] });
      reg.createSprite('chaser2', { pos: [1, 0], size: [1, 1] });
      const movers = reg.withStype('mover');
      assertEqual(movers.length, 2);
    });

    it('sprites() iterates in registration order', () => {
      const reg = new SpriteRegistry();
      reg.registerSpriteClass('a', Immovable, {}, ['a']);
      reg.registerSpriteClass('b', Immovable, {}, ['b']);
      reg.createSprite('b', { pos: [1, 0], size: [1, 1] });
      reg.createSprite('a', { pos: [0, 0], size: [1, 1] });
      const keys = [...reg.sprites()].map(s => s.key);
      assertEqual(keys[0], 'a');
      assertEqual(keys[1], 'b');
    });
  });

  describe('Immovable', () => {
    it('is_static = true, does not move', () => {
      const s = new Immovable({ key: 'wall', id: 'wall.1', pos: [5, 5], size: [1, 1] });
      assert(s.is_static);
      s.update({ time: 1 });
      assertEqual(s.rect.x, 5);
      assertEqual(s.rect.y, 5);
    });
  });

  describe('Flicker', () => {
    it('auto-kills after limit ticks', () => {
      const killed = [];
      const game = {
        time: 1,
        killSprite(s) { killed.push(s); },
      };
      const s = new Flicker({ key: 'fx', id: 'fx.1', pos: [0, 0], size: [1, 1], limit: 2 });
      s.update(game); // _age = 1
      assertEqual(killed.length, 0);
      s.update(game); // _age = 2 >= limit
      assertEqual(killed.length, 1);
    });
  });

  describe('Missile', () => {
    it('moves in fixed orientation each tick', () => {
      const s = new Missile({ key: 'bullet', id: 'bullet.1', pos: [5, 5], size: [1, 1], orientation: RIGHT });
      s.speed = 1;
      s.update({ time: 1 });
      // Should have moved right by 1 * gridsize
      assertEqual(s.rect.x, 6);
      assertEqual(s.rect.y, 5);
    });
  });
}
