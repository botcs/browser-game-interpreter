// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

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

  describe('stepBackIfHasLess exhaustStype', () => {
    it('transforms partner when sprite has enough resource', () => {
      const game = makeGame();
      const avatar = makeSprite('avatar', 5, 5);
      avatar.lastrect = new Rect(4, 5, 1, 1);
      avatar.resources['key1'] = 1;
      const door = makeSprite('door1', 5, 5);
      door.lastrect = door.rect;
      effects.stepBackIfHasLess(avatar, door, game, { resource: 'key1', limit: 1, exhaustStype: 'door1_used' });
      // Door should be killed (transformTo kills original) and door1_used created
      assertEqual(game.kill_list.length, 1);
      assertEqual(game.kill_list[0], door);
      assertEqual(game.create_list.length, 1);
      assertEqual(game.create_list[0][0], 'door1_used');
    });

    it('still blocks when sprite lacks resource (exhaustStype ignored)', () => {
      const game = makeGame();
      const avatar = makeSprite('avatar', 5, 5);
      avatar.lastrect = new Rect(4, 5, 1, 1);
      avatar.resources['key1'] = 0;
      const door = makeSprite('door1', 5, 5);
      door.lastrect = door.rect;
      effects.stepBackIfHasLess(avatar, door, game, { resource: 'key1', limit: 1, exhaustStype: 'door1_used' });
      // Avatar should be stepped back, no kills or creates
      assertEqual(avatar.rect.x, 4);
      assertEqual(game.kill_list.length, 0);
      assertEqual(game.create_list.length, 0);
    });
  });

  describe('catapultForward exhaustStype', () => {
    it('transforms catapult after successful launch', () => {
      const game = makeGame();
      game.screensize = [13, 13];
      const avatar = makeSprite('avatar', 5, 5);
      avatar.lastrect = new Rect(4, 5, 1, 1); // approached from left -> lastdirection = {x:1, y:0}
      const catapult = makeSprite('catapult', 5, 5);
      catapult.lastrect = catapult.rect;
      effects.catapultForward(avatar, catapult, game, { exhaustStype: 'catapult_used' });
      // Avatar should be catapulted right
      assertEqual(avatar.rect.x, 6);
      // Catapult should be killed and catapult_used created
      assertEqual(game.kill_list.length, 1);
      assertEqual(game.kill_list[0], catapult);
      assertEqual(game.create_list.length, 1);
      assertEqual(game.create_list[0][0], 'catapult_used');
    });

    it('does NOT exhaust when already on catapult (no launch)', () => {
      const game = makeGame();
      game.screensize = [13, 13];
      const avatar = makeSprite('avatar', 5, 5);
      avatar.lastrect = new Rect(5, 5, 1, 1); // was already on catapult -> lastdirection = {x:0, y:0}
      const catapult = makeSprite('catapult', 5, 5);
      effects.catapultForward(avatar, catapult, game, { exhaustStype: 'catapult_used' });
      // No launch, no exhaustion
      assertEqual(game.kill_list.length, 0);
      assertEqual(game.create_list.length, 0);
    });
  });

  describe('teleportToOther exhaustStype', () => {
    it('transforms both endpoints after teleport', () => {
      const game = makeGame();
      const reg = game.sprite_registry;
      reg.registerSpriteClass('t6', Immovable, {}, ['t6']);
      const portal1 = reg.createSprite('t6', { pos: [3, 3], size: [1, 1] });
      const portal2 = reg.createSprite('t6', { pos: [7, 7], size: [1, 1] });
      const avatar = makeSprite('avatar', 3, 3);
      avatar.lastrect = new Rect(2, 3, 1, 1); // approached from left
      effects.teleportToOther(avatar, portal1, game, { exhaustStype: 't6_used' });
      // Avatar should be teleported to portal2 position
      assertEqual(avatar.rect.x, 7);
      assertEqual(avatar.rect.y, 7);
      // Both portals should be killed and t6_used created
      assertEqual(game.kill_list.length, 2);
      assertEqual(game.create_list.length, 2);
      assertEqual(game.create_list[0][0], 't6_used');
      assertEqual(game.create_list[1][0], 't6_used');
    });
  });
}