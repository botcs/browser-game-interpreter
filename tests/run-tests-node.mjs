// Node.js test runner - shims browser APIs for test-framework.js

// Collect test results with console output
let currentSuite = '';
const failures = [];

const fakeElement = {
  appendChild() {},
  get lastElementChild() { return fakeElement; },
  set textContent(v) {},
  set className(v) {},
  set style(v) {},
  style: {},
};
globalThis.document = {
  createElement() { return { ...fakeElement, style: {} }; },
  getElementById() { return fakeElement; },
};

// Import and monkey-patch test framework
const fw = await import('./test-framework.js');
const origDescribe = fw.describe;
const origIt = fw.it;

// We can't monkey-patch ES module exports directly, so we'll wrap them
// Instead, let's intercept via a different approach - hook into the results

const { runRectTests } = await import('./test-rect.js');
const { runActionTests } = await import('./test-action.js');
const { runRegistryTests } = await import('./test-registry.js');
const { runPhysicsTests } = await import('./test-physics.js');
const { runSpriteTests } = await import('./test-sprites.js');
const { runEffectTests } = await import('./test-effects.js');
const { runTerminationTests } = await import('./test-terminations.js');
const { runParserTests } = await import('./test-parser.js');
const { runGameTests } = await import('./test-game.js');

// The test framework uses try/catch internally and stores results
// We need to capture errors. Let's re-implement the shim to capture output.

// Actually, let's just wrap each test suite in its own try/catch and report
const suites = [
  ['Rect', runRectTests],
  ['Action', runActionTests],
  ['Registry', runRegistryTests],
  ['Physics', runPhysicsTests],
  ['Sprites', runSpriteTests],
  ['Effects', runEffectTests],
  ['Terminations', runTerminationTests],
  ['Parser', runParserTests],
  ['Game', runGameTests],
];

for (const [name, fn] of suites) {
  fn();
}

const { passed, failed, total } = fw.summary();

// Access internal results - the framework stores them in _results
// Since we can't access module-scoped vars, let's re-run with a custom framework
console.log(`\nTests: ${passed}/${total} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
