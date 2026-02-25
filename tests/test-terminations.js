// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

import { describe, it, assert, assertEqual } from './test-framework.js';
import { Timeout, SpriteCounter, MultiSpriteCounter } from '../engine/terminations.js';

export function runTerminationTests() {
  describe('Timeout', () => {
    it('isDone returns [true, win] when time >= limit', () => {
      const t = new Timeout({ limit: 100, win: false });
      const [done, win] = t.isDone({ time: 100 });
      assert(done);
      assertEqual(win, false);
    });

    it('isDone returns [false, null] when time < limit', () => {
      const t = new Timeout({ limit: 100, win: false });
      const [done, win] = t.isDone({ time: 50 });
      assert(!done);
      assertEqual(win, null);
    });
  });

  describe('SpriteCounter', () => {
    it('isDone when count <= limit', () => {
      const t = new SpriteCounter({ stype: 'goal', limit: 0, win: true });
      const game = {
        numSprites(key) { return 0; },
      };
      const [done, win] = t.isDone(game);
      assert(done);
      assertEqual(win, true);
    });

    it('not done when count > limit', () => {
      const t = new SpriteCounter({ stype: 'goal', limit: 0, win: true });
      const game = {
        numSprites(key) { return 2; },
      };
      const [done, win] = t.isDone(game);
      assert(!done);
    });
  });

  describe('MultiSpriteCounter', () => {
    it('isDone when sum == limit', () => {
      const t = new MultiSpriteCounter({
        limit: 0, win: true,
        stype1: 'gem', stype2: 'key',
      });
      const game = {
        numSprites(key) { return 0; },
      };
      const [done, win] = t.isDone(game);
      assert(done);
      assertEqual(win, true);
    });

    it('not done when sum != limit', () => {
      const t = new MultiSpriteCounter({
        limit: 0, win: true,
        stype1: 'gem', stype2: 'key',
      });
      const game = {
        numSprites(key) { return key === 'gem' ? 1 : 0; },
      };
      const [done] = t.isDone(game);
      assert(!done);
    });
  });
}