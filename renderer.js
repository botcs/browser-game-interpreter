// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// Canvas renderer for VGDL games
// Draws colored rectangles on a grid, with resource bars on avatar

export class Renderer {
  constructor(canvas, cellSize = 30) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = cellSize;
  }

  resize(widthCells, heightCells) {
    this.canvas.width = widthCells * this.cellSize;
    this.canvas.height = heightCells * this.cellSize;
  }

  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(level) {
    this.clear();
    const bs = level.block_size;
    const scale = this.cellSize / bs;

    // Draw sprites in sprite_order (z-order)
    for (const key of level.domain.sprite_order) {
      const sprites = level.sprite_registry._liveSpritesByKey[key] || [];
      for (const sprite of sprites) {
        this._drawSprite(sprite, scale, bs);
      }
    }

    // Draw score and time overlay
    this._drawHUD(level);
  }

  _drawSprite(sprite, scale, bs) {
    const x = sprite.rect.x * scale;
    const y = sprite.rect.y * scale;
    const w = sprite.rect.w * scale;
    const h = sprite.rect.h * scale;

    // Determine color and shape from img
    let color = null;
    let shape = null;
    if (sprite.img) {
      const parsed = this._parseImg(sprite.img);
      color = parsed.color;
      shape = parsed.shape;
    }
    if (!color) {
      color = sprite.color;
    }
    if (!color) {
      color = [128, 128, 128]; // fallback gray
    }

    // Apply shrink factor
    const shrink = sprite.shrinkfactor || 0;
    const sx = x + w * shrink / 2;
    const sy = y + h * shrink / 2;
    const sw = w * (1 - shrink);
    const sh = h * (1 - shrink);

    this.ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

    if (shape) {
      this._drawShape(shape, sx, sy, sw, sh);
    } else {
      this.ctx.fillRect(sx, sy, sw, sh);
    }

    // Draw orientation arrow for oriented sprites
    if (sprite.orientation && sprite.draw_arrow) {
      this._drawArrow(sx, sy, sw, sh, sprite.orientation, color);
    }

    // Draw resource bars for avatar
    if (sprite.is_avatar) {
      this._drawResources(sprite, sx, sy, sw, sh);
    }
  }

  _parseImg(img) {
    // img format: "colors/COLORNAME" or "colored_shapes/COLORNAME_SHAPENAME"
    const COLORS = {
      LIGHTGRAY: [150, 150, 150],
      BLUE: [0, 0, 200],
      YELLOW: [250, 250, 0],
      BLACK: [0, 0, 0],
      ORANGE: [250, 160, 0],
      PURPLE: [128, 0, 128],
      BROWN: [140, 120, 100],
      PINK: [250, 200, 200],
      GREEN: [0, 200, 0],
      RED: [200, 0, 0],
      WHITE: [250, 250, 250],
      GOLD: [250, 212, 0],
      LIGHTRED: [250, 50, 50],
      LIGHTORANGE: [250, 200, 100],
      LIGHTBLUE: [50, 100, 250],
      LIGHTGREEN: [50, 250, 50],
      DARKGRAY: [30, 30, 30],
      DARKBLUE: [20, 20, 100],
      GRAY: [90, 90, 90],
    };

    if (img.startsWith('colors/')) {
      const colorName = img.split('/')[1];
      return { color: COLORS[colorName] || null, shape: null };
    }

    if (img.startsWith('colored_shapes/')) {
      const parts = img.split('/')[1]; // e.g. "RED_CIRCLE"
      const SHAPES = ['CIRCLE', 'TRIANGLE', 'DIAMOND', 'STAR', 'CROSS', 'HEXAGON', 'SQUARE', 'PENTAGON'];
      for (const shape of SHAPES) {
        if (parts.endsWith('_' + shape)) {
          const colorName = parts.slice(0, -(shape.length + 1));
          return { color: COLORS[colorName] || null, shape };
        }
      }
      return { color: null, shape: null };
    }

    return { color: null, shape: null };
  }

  _drawShape(shape, x, y, w, h) {
    const ctx = this.ctx;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    // Padding ratio matching the Python generator (2px padding on 24px canvas)
    const pad = 2 / 24;
    const prx = rx * (1 - 2 * pad);
    const pry = ry * (1 - 2 * pad);

    ctx.beginPath();
    switch (shape) {
      case 'CIRCLE':
        ctx.ellipse(cx, cy, prx, pry, 0, 0, Math.PI * 2);
        break;

      case 'TRIANGLE': {
        const top = cy - pry;
        const bottom = cy + pry;
        const left = cx - prx;
        const right = cx + prx;
        ctx.moveTo(cx, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.closePath();
        break;
      }

      case 'DIAMOND':
        ctx.moveTo(cx, cy - pry);
        ctx.lineTo(cx + prx, cy);
        ctx.lineTo(cx, cy + pry);
        ctx.lineTo(cx - prx, cy);
        ctx.closePath();
        break;

      case 'STAR': {
        const outerR = Math.min(prx, pry);
        const innerR = outerR * 0.4;
        for (let i = 0; i < 5; i++) {
          const outerAngle = -Math.PI / 2 + i * (2 * Math.PI / 5);
          const innerAngle = outerAngle + Math.PI / 5;
          if (i === 0) {
            ctx.moveTo(cx + outerR * Math.cos(outerAngle), cy + outerR * Math.sin(outerAngle));
          } else {
            ctx.lineTo(cx + outerR * Math.cos(outerAngle), cy + outerR * Math.sin(outerAngle));
          }
          ctx.lineTo(cx + innerR * Math.cos(innerAngle), cy + innerR * Math.sin(innerAngle));
        }
        ctx.closePath();
        break;
      }

      case 'CROSS': {
        const armW = prx * 2 / 3;
        const halfArm = armW / 2;
        // Horizontal bar
        ctx.rect(cx - prx, cy - halfArm, prx * 2, armW);
        // Vertical bar
        ctx.rect(cx - halfArm, cy - pry, armW, pry * 2);
        break;
      }

      case 'HEXAGON': {
        const r = Math.min(prx, pry);
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 6 + i * (Math.PI / 3); // flat-topped
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }

      case 'SQUARE': {
        // Slightly inset like the Python generator
        const inset = Math.min(prx, pry) * (1 / 20);
        ctx.rect(cx - prx + inset, cy - pry + inset, (prx - inset) * 2, (pry - inset) * 2);
        break;
      }

      case 'PENTAGON': {
        const r = Math.min(prx, pry);
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI / 2 + i * (2 * Math.PI / 5);
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }

      default:
        ctx.rect(x, y, w, h);
    }
    ctx.fill();
  }

  _drawArrow(x, y, w, h, orientation, color) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const len = Math.min(w, h) * 0.3;

    // Invert color for arrow
    const arrowColor = [color[0], 255 - color[1], color[2]];
    this.ctx.strokeStyle = `rgb(${arrowColor[0]}, ${arrowColor[1]}, ${arrowColor[2]})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx + orientation.x * len, cy + orientation.y * len);
    this.ctx.stroke();
  }

  _drawResources(sprite, x, y, w, h) {
    const resources = sprite.resources;
    let barIdx = 0;
    const barHeight = 3;
    for (const key of Object.keys(resources)) {
      if (key === 'toJSON') continue;
      const val = resources[key];
      if (val > 0) {
        const barY = y + h + barIdx * (barHeight + 1);
        this.ctx.fillStyle = '#FFD400';
        this.ctx.fillRect(x, barY, w * Math.min(val / 5, 1), barHeight);
        barIdx++;
      }
    }
  }

  _drawHUD(level) {
    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px monospace';
    this.ctx.textAlign = 'left';

    const y = this.canvas.height - 5;
    this.ctx.fillText(`Score: ${level.score}  Time: ${level.time}`, 5, y);

    if (level.ended) {
      this.ctx.fillStyle = level.won ? '#0f0' : '#f00';
      this.ctx.font = 'bold 24px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        level.won ? 'WIN' : 'LOSE',
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    }
  }
}