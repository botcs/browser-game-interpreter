// Minimal test framework for browser
let _suiteCount = 0;
let _passCount = 0;
let _failCount = 0;
let _currentSuite = '';
const _results = [];

export function describe(name, fn) {
  _currentSuite = name;
  _suiteCount++;
  if (typeof process !== 'undefined') console.log(`\n${name}`);
  const div = document.createElement('div');
  div.className = 'suite';
  const h = document.createElement('h3');
  h.textContent = name;
  div.appendChild(h);
  document.getElementById('test-output').appendChild(div);
  fn();
}

export function it(name, fn) {
  const entry = document.createElement('div');
  entry.className = 'test';
  const fullName = `${_currentSuite} > ${name}`;
  const result = { name: fullName, passed: false, error: null };
  _results.push(result);

  let passed = false;
  let error = null;
  try {
    fn();
    passed = true;
    _passCount++;
  } catch (e) {
    _failCount++;
    error = e;
  }
  result.passed = passed;
  result.error = error;

  // Console output for Node.js runner
  if (typeof process !== 'undefined') {
    if (passed) {
      console.log(`  PASS ${name}`);
    } else {
      console.log(`  FAIL ${name}`);
      console.log(`    ${error.message}`);
      if (error.stack) console.log(`    ${error.stack.split('\n').slice(1, 3).join('\n    ')}`);
    }
  }

  entry.textContent = `${passed ? 'PASS' : 'FAIL'} ${name}`;
  entry.style.color = passed ? '#0f0' : '#f00';
  if (error) {
    const errDiv = document.createElement('pre');
    errDiv.textContent = `  ${error.message}`;
    errDiv.style.color = '#f88';
    entry.appendChild(errDiv);
  }
  const output = document.getElementById('test-output');
  output.lastElementChild.appendChild(entry);
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      (message ? message + ': ' : '') +
      `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertThrows(fn, message) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) {
    throw new Error(message || 'Expected function to throw');
  }
}

export function summary() {
  const div = document.createElement('div');
  div.className = 'summary';
  div.style.marginTop = '20px';
  div.style.fontWeight = 'bold';
  div.style.fontSize = '16px';
  const total = _passCount + _failCount;
  div.textContent = `${_passCount}/${total} passed, ${_failCount} failed (${_suiteCount} suites)`;
  div.style.color = _failCount === 0 ? '#0f0' : '#f00';
  document.getElementById('test-output').appendChild(div);
  return { passed: _passCount, failed: _failCount, total };
}
