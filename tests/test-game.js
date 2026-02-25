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
}
