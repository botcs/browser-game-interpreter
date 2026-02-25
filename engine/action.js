// Action class and ACTION enum
// In Python, actions are based on pygame key codes. Here we use string keys.
// The keys are just identifiers used for matching; the vector mapping is hardcoded.

export class Action {
  constructor(...keys) {
    this.keys = Object.freeze([...keys].sort());
  }

  asVector() {
    let x = 0, y = 0;
    for (const k of this.keys) {
      if (k === 'LEFT') x -= 1;
      if (k === 'RIGHT') x += 1;
      if (k === 'UP') y -= 1;
      if (k === 'DOWN') y += 1;
    }
    return { x, y };
  }

  equals(other) {
    if (!(other instanceof Action)) return false;
    if (this.keys.length !== other.keys.length) return false;
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i] !== other.keys[i]) return false;
    }
    return true;
  }

  toString() {
    return this.keys.length === 0 ? 'noop' : this.keys.join(',');
  }
}

// Singleton action constants
export const ACTION = {
  NOOP: new Action(),
  UP: new Action('UP'),
  DOWN: new Action('DOWN'),
  LEFT: new Action('LEFT'),
  RIGHT: new Action('RIGHT'),
  SPACE: new Action('SPACE'),
  SPACE_RIGHT: new Action('SPACE', 'RIGHT'),
  SPACE_LEFT: new Action('SPACE', 'LEFT'),
};

// NOOP constant for convenience
export const NOOP = ACTION.NOOP;
