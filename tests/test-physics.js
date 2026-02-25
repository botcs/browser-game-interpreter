import { describe, it, assert, assertEqual } from './test-framework.js';
import { GridPhysics } from '../engine/physics.js';
import { VGDLSprite } from '../engine/sprite.js';
import { RIGHT, UP } from '../engine/constants.js';
import { ACTION, NOOP } from '../engine/action.js';

export function runPhysicsTests() {
  describe('GridPhysics.passiveMovement', () => {
    it('sprite with orientation moves by speed * gridsize', () => {
      const physics = new GridPhysics([10, 10]);
      const s = new VGDLSprite({
        key: 'test', id: 'test.1', pos: [50, 50], size: [10, 10],
      });
      s.orientation = RIGHT;
      s.speed = 1;
      s.lastmove = 10; // enough to pass cooldown
      physics.passiveMovement(s);
      assertEqual(s.rect.x, 60);
      assertEqual(s.rect.y, 50);
    });

    it('sprite without orientation does not move', () => {
      const physics = new GridPhysics([10, 10]);
      const s = new VGDLSprite({
        key: 'test', id: 'test.1', pos: [50, 50], size: [10, 10],
      });
      // No orientation set
      delete s.orientation;
      s.speed = 1;
      physics.passiveMovement(s);
      assertEqual(s.rect.x, 50);
    });
  });

  describe('GridPhysics.activeMovement', () => {
    it('moves sprite by action direction * speed * gridsize', () => {
      const physics = new GridPhysics([10, 10]);
      const s = new VGDLSprite({
        key: 'test', id: 'test.1', pos: [50, 50], size: [10, 10],
      });
      s.speed = 1;
      s.lastmove = 10;
      physics.activeMovement(s, UP);
      assertEqual(s.rect.x, 50);
      assertEqual(s.rect.y, 40);
    });

    it('NOOP vector does not move sprite', () => {
      const physics = new GridPhysics([10, 10]);
      const s = new VGDLSprite({
        key: 'test', id: 'test.1', pos: [50, 50], size: [10, 10],
      });
      s.speed = 1;
      s.lastmove = 10;
      physics.activeMovement(s, { x: 0, y: 0 });
      assertEqual(s.rect.x, 50);
      assertEqual(s.rect.y, 50);
    });
  });

  describe('GridPhysics.distance', () => {
    it('computes Manhattan distance', () => {
      const physics = new GridPhysics([1, 1]);
      const d = physics.distance(
        { top: 0, left: 0 },
        { top: 3, left: 4 }
      );
      assertEqual(d, 7);
    });
  });
}
