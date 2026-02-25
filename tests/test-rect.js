import { describe, it, assert, assertEqual, assertThrows } from './test-framework.js';
import { Rect } from '../engine/rect.js';

export function runRectTests() {
  describe('Rect - construction and properties', () => {
    it('constructs with x, y, w, h', () => {
      const r = new Rect(10, 20, 30, 40);
      assertEqual(r.x, 10);
      assertEqual(r.y, 20);
      assertEqual(r.w, 30);
      assertEqual(r.h, 40);
    });

    it('computes left/top/right/bottom', () => {
      const r = new Rect(10, 20, 30, 40);
      assertEqual(r.left, 10);
      assertEqual(r.top, 20);
      assertEqual(r.right, 40);
      assertEqual(r.bottom, 60);
    });

    it('computes center', () => {
      const r = new Rect(0, 0, 10, 10);
      assertEqual(r.centerx, 5);
      assertEqual(r.centery, 5);
    });

    it('computes topleft and size', () => {
      const r = new Rect(3, 7, 5, 9);
      assertEqual(r.topleft[0], 3);
      assertEqual(r.topleft[1], 7);
      assertEqual(r.size[0], 5);
      assertEqual(r.size[1], 9);
    });
  });

  describe('Rect.move', () => {
    it('returns new Rect at offset, original unchanged', () => {
      const r = new Rect(10, 20, 5, 5);
      const r2 = r.move(3, -2);
      assertEqual(r2.x, 13);
      assertEqual(r2.y, 18);
      assertEqual(r.x, 10);
      assertEqual(r.y, 20);
    });

    it('accepts vector {x, y}', () => {
      const r = new Rect(0, 0, 5, 5);
      const r2 = r.move({ x: -1, y: 1 });
      assertEqual(r2.x, -1);
      assertEqual(r2.y, 1);
    });
  });

  describe('Rect.copy', () => {
    it('deep copies independently', () => {
      const r = new Rect(1, 2, 3, 4);
      const c = r.copy();
      assertEqual(c.x, 1);
      c.x = 99;
      assertEqual(r.x, 1);
    });
  });

  describe('Rect.colliderect', () => {
    it('overlapping rects -> true', () => {
      const a = new Rect(0, 0, 10, 10);
      const b = new Rect(5, 5, 10, 10);
      assert(a.colliderect(b));
    });

    it('adjacent rects -> false', () => {
      const a = new Rect(0, 0, 10, 10);
      const b = new Rect(10, 0, 10, 10);
      assert(!a.colliderect(b));
    });

    it('same position -> true', () => {
      const a = new Rect(5, 5, 10, 10);
      const b = new Rect(5, 5, 10, 10);
      assert(a.colliderect(b));
    });

    it('disjoint -> false', () => {
      const a = new Rect(0, 0, 5, 5);
      const b = new Rect(100, 100, 5, 5);
      assert(!a.colliderect(b));
    });
  });

  describe('Rect.collidelistall', () => {
    it('returns correct indices for overlaps', () => {
      const r = new Rect(5, 5, 10, 10);
      const others = [
        new Rect(0, 0, 6, 6),    // overlaps
        new Rect(100, 100, 5, 5), // disjoint
        new Rect(10, 10, 5, 5),  // overlaps
      ];
      const result = r.collidelistall(others);
      assertEqual(result.length, 2);
      assertEqual(result[0], 0);
      assertEqual(result[1], 2);
    });

    it('returns empty for no overlaps', () => {
      const r = new Rect(0, 0, 1, 1);
      const others = [new Rect(10, 10, 1, 1), new Rect(20, 20, 1, 1)];
      assertEqual(r.collidelistall(others).length, 0);
    });
  });

  describe('Rect.contains', () => {
    it('fully inside -> true', () => {
      const outer = new Rect(0, 0, 100, 100);
      const inner = new Rect(10, 10, 20, 20);
      assert(outer.contains(inner));
    });

    it('partially outside -> false', () => {
      const outer = new Rect(0, 0, 100, 100);
      const inner = new Rect(90, 90, 20, 20);
      assert(!outer.contains(inner));
    });

    it('equal -> true', () => {
      const a = new Rect(5, 5, 10, 10);
      const b = new Rect(5, 5, 10, 10);
      assert(a.contains(b));
    });
  });
}
