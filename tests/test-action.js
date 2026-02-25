import { describe, it, assert, assertEqual } from './test-framework.js';
import { Action, ACTION } from '../engine/action.js';

export function runActionTests() {
  describe('Action.asVector', () => {
    it('UP -> {0, -1}', () => {
      const v = ACTION.UP.asVector();
      assertEqual(v.x, 0);
      assertEqual(v.y, -1);
    });

    it('DOWN -> {0, 1}', () => {
      const v = ACTION.DOWN.asVector();
      assertEqual(v.x, 0);
      assertEqual(v.y, 1);
    });

    it('LEFT -> {-1, 0}', () => {
      const v = ACTION.LEFT.asVector();
      assertEqual(v.x, -1);
      assertEqual(v.y, 0);
    });

    it('RIGHT -> {1, 0}', () => {
      const v = ACTION.RIGHT.asVector();
      assertEqual(v.x, 1);
      assertEqual(v.y, 0);
    });

    it('SPACE -> {0, 0}', () => {
      const v = ACTION.SPACE.asVector();
      assertEqual(v.x, 0);
      assertEqual(v.y, 0);
    });

    it('NOOP -> {0, 0}', () => {
      const v = ACTION.NOOP.asVector();
      assertEqual(v.x, 0);
      assertEqual(v.y, 0);
    });
  });

  describe('Action.keys', () => {
    it('UP has correct key', () => {
      assertEqual(ACTION.UP.keys.length, 1);
      assertEqual(ACTION.UP.keys[0], 'UP');
    });

    it('NOOP has no keys', () => {
      assertEqual(ACTION.NOOP.keys.length, 0);
    });

    it('SPACE_RIGHT has two sorted keys', () => {
      assertEqual(ACTION.SPACE_RIGHT.keys.length, 2);
      // Sorted: RIGHT, SPACE
      assertEqual(ACTION.SPACE_RIGHT.keys[0], 'RIGHT');
      assertEqual(ACTION.SPACE_RIGHT.keys[1], 'SPACE');
    });
  });

  describe('Action.equals', () => {
    it('same actions are equal', () => {
      assert(ACTION.UP.equals(new Action('UP')));
    });

    it('different actions are not equal', () => {
      assert(!ACTION.UP.equals(ACTION.DOWN));
    });

    it('non-Action returns false', () => {
      assert(!ACTION.UP.equals('UP'));
    });
  });
}
