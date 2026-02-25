// Register all sprite classes, effects, and terminations with the global registry
// This mirrors Python's registry.register_all(ontology)

import { registry } from './registry.js';

// Sprite classes
import { Immovable, Passive, ResourcePack, Flicker, OrientedFlicker, OrientedSprite,
         Missile, SpawnPoint, RandomNPC, Chaser, Fleeing, Portal, Bomber, Walker,
         Conveyor, SpriteProducer, Spreader } from './sprites.js';
import { MovingAvatar, OrientedAvatar, ShootAvatar, HorizontalAvatar, FlakAvatar } from './avatars.js';
import { VGDLSprite, Resource, Immutable } from './sprite.js';

// Effects
import { killSprite, killBoth, changeScore, cloneSprite, transformTo,
         stepBack, undoAll, bounceForward, reverseDirection, turnAround,
         flipDirection, wrapAround, collectResource, changeResource,
         addResource, removeResource, killIfOtherHasMore, killIfHasMore,
         killIfOtherHasLess, killIfHasLess, spawnIfHasMore, killIfAlive,
         conveySprite, pullWithIt, teleportToExit, wallBounce,
         bounceDirection } from './effects.js';

// Terminations
import { Timeout, SpriteCounter, MultiSpriteCounter, ResourceCounter } from './terminations.js';

// Physics
import { GridPhysics } from './physics.js';

// Game
import { BasicGame } from './game.js';

// Constants (colors)
import * as constants from './constants.js';

export function setupRegistry() {
  // Sprite classes
  registry.register('VGDLSprite', VGDLSprite);
  registry.register('Immovable', Immovable);
  registry.register('Passive', Passive);
  registry.register('Resource', Resource);
  registry.register('ResourcePack', ResourcePack);
  registry.register('Flicker', Flicker);
  registry.register('OrientedFlicker', OrientedFlicker);
  registry.register('OrientedSprite', OrientedSprite);
  registry.register('Missile', Missile);
  registry.register('SpawnPoint', SpawnPoint);
  registry.register('SpriteProducer', SpriteProducer);
  registry.register('Portal', Portal);
  registry.register('RandomNPC', RandomNPC);
  registry.register('Chaser', Chaser);
  registry.register('Fleeing', Fleeing);
  registry.register('Bomber', Bomber);
  registry.register('Walker', Walker);
  registry.register('Conveyor', Conveyor);
  registry.register('Spreader', Spreader);
  registry.register('Immutable', Immutable);

  // Avatars
  registry.register('MovingAvatar', MovingAvatar);
  registry.register('OrientedAvatar', OrientedAvatar);
  registry.register('ShootAvatar', ShootAvatar);
  registry.register('HorizontalAvatar', HorizontalAvatar);
  registry.register('FlakAvatar', FlakAvatar);

  // Effects
  registry.register('killSprite', killSprite);
  registry.register('killBoth', killBoth);
  registry.register('changeScore', changeScore);
  registry.register('cloneSprite', cloneSprite);
  registry.register('transformTo', transformTo);
  registry.register('stepBack', stepBack);
  registry.register('undoAll', undoAll);
  registry.register('bounceForward', bounceForward);
  registry.register('reverseDirection', reverseDirection);
  registry.register('turnAround', turnAround);
  registry.register('flipDirection', flipDirection);
  registry.register('wrapAround', wrapAround);
  registry.register('collectResource', collectResource);
  registry.register('changeResource', changeResource);
  registry.register('addResource', addResource);
  registry.register('removeResource', removeResource);
  registry.register('killIfOtherHasMore', killIfOtherHasMore);
  registry.register('killIfHasMore', killIfHasMore);
  registry.register('killIfOtherHasLess', killIfOtherHasLess);
  registry.register('killIfHasLess', killIfHasLess);
  registry.register('spawnIfHasMore', spawnIfHasMore);
  registry.register('killIfAlive', killIfAlive);
  registry.register('conveySprite', conveySprite);
  registry.register('pullWithIt', pullWithIt);
  registry.register('teleportToExit', teleportToExit);
  registry.register('wallBounce', wallBounce);
  registry.register('bounceDirection', bounceDirection);

  // Terminations
  registry.register('Timeout', Timeout);
  registry.register('SpriteCounter', SpriteCounter);
  registry.register('MultiSpriteCounter', MultiSpriteCounter);
  registry.register('ResourceCounter', ResourceCounter);

  // Physics
  registry.register('GridPhysics', GridPhysics);

  // Game
  registry.register('BasicGame', BasicGame);

  // Colors (for img=colors/LIGHTGRAY parsing)
  for (const [name, value] of Object.entries(constants.COLORS)) {
    registry.register(name, value);
  }

  // Direction constants
  registry.register('UP', constants.UP);
  registry.register('DOWN', constants.DOWN);
  registry.register('LEFT', constants.LEFT);
  registry.register('RIGHT', constants.RIGHT);
}
