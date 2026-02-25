// Minimal AABB Rect replacing pygame.Rect
// All values are integers (grid-based physics)
export class Rect {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  // Factory from position tuple and size tuple (pygame-style)
  static fromPosSize(pos, size) {
    return new Rect(pos[0], pos[1], size[0], size[1]);
  }

  get left() { return this.x; }
  set left(v) { this.x = v; }

  get top() { return this.y; }
  set top(v) { this.y = v; }

  get right() { return this.x + this.w; }
  get bottom() { return this.y + this.h; }

  get width() { return this.w; }
  get height() { return this.h; }

  get centerx() { return this.x + Math.floor(this.w / 2); }
  get centery() { return this.y + Math.floor(this.h / 2); }
  get center() { return [this.centerx, this.centery]; }

  get topleft() { return [this.x, this.y]; }
  get size() { return [this.w, this.h]; }

  // Return a new Rect moved by (dx, dy)
  move(dxOrVec, dy) {
    if (typeof dxOrVec === 'object' && dxOrVec !== null) {
      return new Rect(this.x + dxOrVec.x, this.y + dxOrVec.y, this.w, this.h);
    }
    return new Rect(this.x + dxOrVec, this.y + dy, this.w, this.h);
  }

  copy() {
    return new Rect(this.x, this.y, this.w, this.h);
  }

  // AABB overlap test (matching pygame: adjacent rects do NOT collide)
  colliderect(other) {
    return (
      this.x < other.x + other.w &&
      this.x + this.w > other.x &&
      this.y < other.y + other.h &&
      this.y + this.h > other.y
    );
  }

  // Returns indices of all rects in the list that overlap this one
  collidelistall(others) {
    const result = [];
    for (let i = 0; i < others.length; i++) {
      if (this.colliderect(others[i].rect || others[i])) {
        result.push(i);
      }
    }
    return result;
  }

  // Does this rect fully contain `other`?
  contains(other) {
    return (
      other.x >= this.x &&
      other.y >= this.y &&
      other.x + other.w <= this.x + this.w &&
      other.y + other.h <= this.y + this.h
    );
  }

  equals(other) {
    return this.x === other.x && this.y === other.y &&
           this.w === other.w && this.h === other.h;
  }

  toString() {
    return `Rect(${this.x}, ${this.y}, ${this.w}, ${this.h})`;
  }
}
