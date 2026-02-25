// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// Color definitions matching Python src/vgdl/ontology/constants.py
export const GREEN = [0, 200, 0];
export const BLUE = [0, 0, 200];
export const RED = [200, 0, 0];
export const GRAY = [90, 90, 90];
export const WHITE = [250, 250, 250];
export const BROWN = [140, 120, 100];
export const BLACK = [0, 0, 0];
export const ORANGE = [250, 160, 0];
export const YELLOW = [250, 250, 0];
export const PINK = [250, 200, 200];
export const GOLD = [250, 212, 0];
export const LIGHTRED = [250, 50, 50];
export const LIGHTORANGE = [250, 200, 100];
export const LIGHTBLUE = [50, 100, 250];
export const LIGHTGREEN = [50, 250, 50];
export const LIGHTGRAY = [150, 150, 150];
export const DARKGRAY = [30, 30, 30];
export const DARKBLUE = [20, 20, 100];
export const PURPLE = [128, 0, 128];

// All named colors for parser lookup
export const COLORS = {
  GREEN, BLUE, RED, GRAY, WHITE, BROWN, BLACK, ORANGE, YELLOW,
  PINK, GOLD, LIGHTRED, LIGHTORANGE, LIGHTBLUE, LIGHTGREEN,
  LIGHTGRAY, DARKGRAY, DARKBLUE, PURPLE,
};

// Direction vectors as {x, y}
export const UP = { x: 0, y: -1 };
export const DOWN = { x: 0, y: 1 };
export const LEFT = { x: -1, y: 0 };
export const RIGHT = { x: 1, y: 0 };

export const BASEDIRS = [UP, LEFT, DOWN, RIGHT];

export const BASEDIRS_DICT = { UP, LEFT, DOWN, RIGHT };

// Vector helpers
export function vecAdd(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecScale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

export function vecEquals(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function vecLength(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vecNormalize(v) {
  const len = vecLength(v);
  if (len > 0) {
    return { x: v.x / len, y: v.y / len };
  }
  return { x: 1, y: 0 };
}

export function unitVector(v) {
  const len = vecLength(v);
  if (len > 0) {
    return { x: v.x / len, y: v.y / len };
  }
  return { x: 1, y: 0 };
}