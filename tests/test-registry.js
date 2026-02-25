import { describe, it, assert, assertEqual, assertThrows } from './test-framework.js';
import { OntologyRegistry } from '../engine/registry.js';

export function runRegistryTests() {
  describe('OntologyRegistry', () => {
    it('register + request returns same class', () => {
      const reg = new OntologyRegistry();
      class Foo {}
      reg.register('Foo', Foo);
      assertEqual(reg.request('Foo'), Foo);
    });

    it('request for unknown name throws', () => {
      const reg = new OntologyRegistry();
      assertThrows(() => reg.request('Unknown'));
    });

    it('has() returns true for registered', () => {
      const reg = new OntologyRegistry();
      reg.register('bar', 42);
      assert(reg.has('bar'));
      assert(!reg.has('baz'));
    });

    it('registerAll adds multiple entries', () => {
      const reg = new OntologyRegistry();
      reg.registerAll({ a: 1, b: 2, c: 3 });
      assertEqual(reg.request('a'), 1);
      assertEqual(reg.request('b'), 2);
      assertEqual(reg.request('c'), 3);
    });

    it('re-register overwrites', () => {
      const reg = new OntologyRegistry();
      reg.register('x', 1);
      reg.register('x', 2);
      assertEqual(reg.request('x'), 2);
    });
  });
}
