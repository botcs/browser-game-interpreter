// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// GridPhysics - port of src/vgdl/ontology/physics.py
import { NOOP } from './action.js';
import { vecEquals } from './constants.js';

export class GridPhysics {
  constructor(gridsize) {
    // gridsize is [w, h] or a number
    if (Array.isArray(gridsize)) {
      this.gridsize = gridsize;
    } else {
      this.gridsize = [gridsize, gridsize];
    }
  }

  passiveMovement(sprite) {
    let speed = sprite.speed === null ? 1 : sprite.speed;
    if (speed !== 0 && sprite.orientation !== undefined) {
      sprite._updatePosition(sprite.orientation, speed * this.gridsize[0]);
    }
  }

  activeMovement(sprite, action, speed) {
    if (speed === undefined || speed === null) {
      speed = sprite.speed === null ? 1 : sprite.speed;
    }
    if (speed !== 0 && action !== null && action !== undefined) {
      // action can be an Action object or a direction vector
      let dir;
      if (action.asVector) {
        dir = action.asVector();
      } else {
        dir = action;
      }
      if (vecEquals(dir, { x: 0, y: 0 })) return;
      sprite._updatePosition(dir, speed * this.gridsize[0]);
    }
  }

  distance(r1, r2) {
    // Grid physics use Manhattan distance
    return Math.abs(r1.top - r2.top) + Math.abs(r1.left - r2.left);
  }
}