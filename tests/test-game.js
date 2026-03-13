// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

import { describe, it, assert, assertEqual } from './test-framework.js';
import { setupRegistry } from '../engine/setup-registry.js';
import { VGDLParser } from '../engine/parser.js';
import { ACTION } from '../engine/action.js';

export function runGameTests() {
  setupRegistry();

  const BAIT_DESC = `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        hole > Immovable img=colors/BLUE
        avatar > MovingAvatar img=colors/YELLOW
        mushroom > Immovable img=colors/BLACK
        key > Resource img=colors/ORANGE limit=1
        goal > Immovable img=colors/PURPLE
        box > Passive img=colors/BROWN
        wall > Immovable img=colors/PINK
    LevelMapping
        . > floor
        w > floor wall
        A > floor avatar
        0 > floor hole
        1 > floor box
        k > floor key
        g > floor goal
        m > floor mushroom
    InteractionSet
        avatar wall > stepBack
        avatar hole > killSprite
        box avatar > bounceForward
        box wall > stepBack
        box box > stepBack
        box mushroom > undoAll
        hole box > killSprite
        hole box > changeScore scoreChange=5
        box hole > killSprite
        avatar key > changeScore scoreChange=5
        avatar key > changeResource resource=key value=5
        key avatar > killSprite
        goal avatar > killIfOtherHasMore resource=key limit=1
        mushroom avatar > changeScore scoreChange=10
        mushroom avatar > killSprite
    TerminationSet
        SpriteCounter stype=goal limit=0 win=True
        SpriteCounter stype=avatar limit=0 win=False`;

  describe('BasicGameLevel.tick', () => {
    it('time increments on each tick', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      const level = game.buildLevel('wwwww\nwA..w\nwwwww');
      assertEqual(level.time, 0);
      level.tick(ACTION.NOOP);
      assertEqual(level.time, 1);
      level.tick(ACTION.NOOP);
      assertEqual(level.time, 2);
    });

    it('avatar moves right', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      const level = game.buildLevel('wwwww\nwA..w\nwwwww');
      const avatar = level.getAvatars()[0];
      assertEqual(avatar.rect.x, 1);
      level.tick(ACTION.RIGHT);
      assertEqual(avatar.rect.x, 2);
    });

    it('wall blocks avatar (stepBack)', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      const level = game.buildLevel('wwwww\nwA..w\nwwwww');
      const avatar = level.getAvatars()[0];
      // Move up into wall
      level.tick(ACTION.UP);
      assertEqual(avatar.rect.y, 1); // stayed in place
    });

    it('collecting key gives score', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      const level = game.buildLevel('wwwww\nwAk.w\nwwwww');
      level.tick(ACTION.RIGHT); // move onto key
      assert(level.score >= 5, `Score should be >= 5, got ${level.score}`);
    });

    it('goal kills when avatar has key resource', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      const level = game.buildLevel('wwwww\nwAkgw\nwwwww');
      level.tick(ACTION.RIGHT); // collect key
      level.tick(ACTION.RIGHT); // step on goal
      // Goal should be killed (removed), game should end with win
      assert(level.ended, 'Game should have ended');
      assert(level.won, 'Game should be won');
    });

    it('avatar dying into hole triggers lose', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      // Must include a goal so SpriteCounter(goal,0,win=True) doesn't fire immediately
      const level = game.buildLevel('wwwww\nwA0gw\nwwwww');
      level.tick(ACTION.RIGHT); // move into hole
      assert(level.ended, 'Game should have ended');
      assert(!level.won, 'Game should be lost');
    });

    it('box push via bounceForward', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      const level = game.buildLevel('wwwwww\nwA1..w\nwwwwww');
      // Find the box
      const boxes = level.sprite_registry.withStype('box');
      assertEqual(boxes.length, 1);
      assertEqual(boxes[0].rect.x, 2);
      level.tick(ACTION.RIGHT); // push box
      // Box should have moved right
      const boxesAfter = level.sprite_registry.withStype('box');
      assertEqual(boxesAfter[0].rect.x, 3);
    });

    it('deferred kill: sprites in kill_list still collide', () => {
      // This is tested implicitly: hole box > killSprite and box hole > killSprite
      // both happen in the same tick
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      // Must include a goal so SpriteCounter(goal,0,win=True) doesn't fire on tick 1
      const level = game.buildLevel('wwwwwwww\nwA1.0.gw\nwwwwwwww');
      level.tick(ACTION.RIGHT); // push box toward hole (box at 2 -> 3)
      level.tick(ACTION.RIGHT); // push box into hole (box at 3 -> 4)
      // Both hole and box should be dead
      const boxes = level.sprite_registry.withStype('box');
      const holes = level.sprite_registry.withStype('hole');
      assertEqual(boxes.length, 0);
      assertEqual(holes.length, 0);
    });

    it('reset restores initial state', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      const level = game.buildLevel('wwwww\nwAk.w\nwwwww');
      level.tick(ACTION.RIGHT);
      assert(level.score > 0);
      level.reset();
      assertEqual(level.score, 0);
      assertEqual(level.time, 0);
      const keys = level.sprite_registry.withStype('key');
      assertEqual(keys.length, 1);
    });
  });

  describe('Termination short-circuit', () => {
    it('first triggering condition wins', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(BAIT_DESC);
      // Avatar steps into hole and dies. Goal still exists, so only
      // SpriteCounter(avatar, 0, win=False) fires (goal termination does not trigger).
      const level = game.buildLevel('wwwww\nwA0gw\nwwwww');
      level.tick(ACTION.RIGHT);
      assert(level.ended, 'Game should have ended');
      // avatar is dead -> SpriteCounter(avatar, 0) -> win=False
      assert(!level.won, 'Game should be lost');
    });
  });

  // Roomworld game description for exhaustion integration tests
  const ROOMWORLD_DESC = `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        wall > Immovable img=colors/DARKGRAY
        avatar > MovingAvatar img=colored_shapes/YELLOW_CIRCLE
        goal > Immovable img=colored_shapes/LIGHTGREEN_STAR
        key1 > Resource img=colored_shapes/ORANGE_DIAMOND limit=1
        door1 > Immovable img=colored_shapes/ORANGE_SQUARE
        door1_used > Immovable img=colored_shapes/LIGHTORANGE_SQUARE
        t6 > Portal stype=t6 img=colored_shapes/PURPLE_HEXAGON
        t6_used > Immovable img=colored_shapes/LIGHTPURPLE_HEXAGON
        catapult > Immovable img=colored_shapes/PINK_TRIANGLE
        catapult_used > Immovable img=colored_shapes/LIGHTPINK_TRIANGLE
    LevelMapping
        . > floor
        w > floor wall
        A > floor avatar
        x > floor goal
        K > floor key1
        D > floor door1
        T > floor t6
        c > floor catapult
    InteractionSet
        avatar wall > stepBack
        avatar door1 > stepBackIfHasLess resource=key1 limit=1 exhaustStype=door1_used
        avatar door1_used > stepBack
        avatar key1 > changeResource resource=key1 value=1
        key1 avatar > killSprite
        avatar t6 > teleportToOther exhaustStype=t6_used
        avatar catapult > catapultForward exhaustStype=catapult_used
        goal avatar > killSprite
    TerminationSet
        SpriteCounter stype=goal limit=0 win=True
        Timeout limit=500 win=False`;

  describe('Roomworld door exhaustion', () => {
    it('door transforms to door1_used after opening, blocks return', () => {
      // Layout: w w w w w w w
      //         w A . K D . x w   (avatar at 1, key at 3, door at 4, goal at 6)
      //         w w w w w w w w
      const parser = new VGDLParser();
      const game = parser.parseGame(ROOMWORLD_DESC);
      const level = game.buildLevel('wwwwwwww\nwA.KD.xw\nwwwwwwww');
      const avatar = level.getAvatars()[0];

      // Move right x2 to collect key1
      level.tick(ACTION.RIGHT); // (1,1) -> (2,1)
      level.tick(ACTION.RIGHT); // (2,1) -> (3,1) collect key1
      assertEqual(avatar.resources['key1'], 1);

      // Move right to open door
      level.tick(ACTION.RIGHT); // (3,1) -> (4,1) open door1 -> door1_used
      assertEqual(avatar.rect.x, 4);

      // door1 should be gone, door1_used should exist
      assertEqual(level.sprite_registry.withStype('door1').length, 0);
      assertEqual(level.sprite_registry.withStype('door1_used').length, 1);

      // Move past door
      level.tick(ACTION.RIGHT); // (4,1) -> (5,1)
      assertEqual(avatar.rect.x, 5);

      // Try to go back -- blocked by door1_used
      level.tick(ACTION.LEFT); // (5,1) -> blocked at (5,1)
      assertEqual(avatar.rect.x, 5);
    });

    it('solve still works: collect key, open door, reach goal', () => {
      const parser = new VGDLParser();
      const game = parser.parseGame(ROOMWORLD_DESC);
      const level = game.buildLevel('wwwwwwww\nwA.KD.xw\nwwwwwwww');

      level.tick(ACTION.RIGHT); // (1) -> (2)
      level.tick(ACTION.RIGHT); // (2) -> (3) collect key
      level.tick(ACTION.RIGHT); // (3) -> (4) open door
      level.tick(ACTION.RIGHT); // (4) -> (5)
      level.tick(ACTION.RIGHT); // (5) -> (6) goal
      assert(level.ended, 'Game should have ended');
      assert(level.won, 'Game should be won');
    });
  });

  describe('Roomworld teleporter exhaustion', () => {
    it('teleporter pair becomes inert after use', () => {
      // Layout: w w w w w w w w
      //         w T . A . T . x w   T=t6 at (1,1) and (5,1), avatar at (3,1), goal at (7,1)
      //         w w w w w w w w w
      const parser = new VGDLParser();
      const game = parser.parseGame(ROOMWORLD_DESC);
      const level = game.buildLevel('wwwwwwwww\nwT.A.T.xw\nwwwwwwwww');
      const avatar = level.getAvatars()[0];

      assertEqual(level.sprite_registry.withStype('t6').length, 2);

      // Move left x2 onto t6 at (1,1) -> teleport to (5,1)
      level.tick(ACTION.LEFT); // (3,1) -> (2,1)
      level.tick(ACTION.LEFT); // (2,1) -> step onto t6 at (1,1) -> teleport to (5,1)
      assertEqual(avatar.rect.x, 5);
      assertEqual(avatar.rect.y, 1);

      // Both t6 should be gone, t6_used should exist
      assertEqual(level.sprite_registry.withStype('t6').length, 0);
      assertEqual(level.sprite_registry.withStype('t6_used').length, 2);

      // Walk away and return -- no teleport
      level.tick(ACTION.LEFT); // (5,1) -> (4,1)
      assertEqual(avatar.rect.x, 4);
      level.tick(ACTION.RIGHT); // (4,1) -> (5,1) walk onto t6_used, no teleport
      assertEqual(avatar.rect.x, 5);
      assertEqual(avatar.rect.y, 1);
    });
  });

  describe('Roomworld catapult exhaustion', () => {
    it('catapult becomes inert after launch', () => {
      // Layout: w w w w w w w w w
      //         w . . A c . . x w   avatar at (3,1), catapult at (4,1), goal at (7,1)
      //         w w w w w w w w w
      const parser = new VGDLParser();
      const game = parser.parseGame(ROOMWORLD_DESC);
      const level = game.buildLevel('wwwwwwwww\nw..Ac..xw\nwwwwwwwww');
      const avatar = level.getAvatars()[0];

      // Step right onto catapult -> catapulted right to (5,1)
      level.tick(ACTION.RIGHT); // (3,1) -> catapult at (4,1) -> launched to (5,1)
      assertEqual(avatar.rect.x, 5);

      // Catapult should be exhausted
      assertEqual(level.sprite_registry.withStype('catapult').length, 0);
      assertEqual(level.sprite_registry.withStype('catapult_used').length, 1);

      // Walk back onto catapult_used -> no launch, just normal walk
      level.tick(ACTION.LEFT); // (5,1) -> (4,1) on catapult_used
      assertEqual(avatar.rect.x, 4);
      // Walk off and re-approach
      level.tick(ACTION.LEFT); // (4,1) -> (3,1)
      assertEqual(avatar.rect.x, 3);
      level.tick(ACTION.RIGHT); // (3,1) -> (4,1) no catapult effect
      assertEqual(avatar.rect.x, 4);
    });
  });
}