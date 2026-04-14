const MAP_TILES = {
  EMPTY: 0,
  WALL: 1,
  DOT: 2,
  POWER_PELLET: 3,
  GHOST_HOUSE: 4,
  GHOST_EXIT: 5,
  VOID: 6
};

const LEVEL_WALL_COLORS = [
  { stroke: '#0066ff', glow: 'rgba(0, 102, 255, 0.5)'  }, // Lv1  Blue
  { stroke: '#ff3344', glow: 'rgba(255, 51, 68, 0.5)'  }, // Lv2  Red
  { stroke: '#00cc66', glow: 'rgba(0, 204, 102, 0.5)'  }, // Lv3  Green
  { stroke: '#cc44ff', glow: 'rgba(204, 68, 255, 0.5)' }, // Lv4  Purple
  { stroke: '#ff8800', glow: 'rgba(255, 136, 0, 0.5)'  }, // Lv5  Orange
  { stroke: '#00ffff', glow: 'rgba(0, 255, 255, 0.5)'  }, // Lv6+ Cyan
];

// 28 columns, 31 rows (Original Arcade Size)
const MAZE_DATA = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [6,6,6,6,6,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,6,6,6,6,6],
  [6,6,6,6,6,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,6,6,6,6,6],
  [6,6,6,6,6,1,2,1,1,0,1,1,1,5,5,1,1,1,0,1,1,2,1,6,6,6,6,6],
  [1,1,1,1,1,1,2,1,1,0,1,4,4,4,4,4,4,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,0,2,0,0,0,1,4,4,4,4,4,4,1,0,0,0,2,0,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,4,4,4,4,4,4,1,0,1,1,2,1,1,1,1,1,1],
  [6,6,6,6,6,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,6,6,6,6,6],
  [6,6,6,6,6,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,6,6,6,6,6],
  [6,6,6,6,6,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,6,6,6,6,6],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

class Maze {
  constructor() {
    this.width = MAZE_DATA[0].length;
    this.height = MAZE_DATA.length;
    this.data = [];
    this.totalDots = 0;
    this.reset();
  }

  reset(level = 1) {
    this.data = MAZE_DATA.map(row => [...row]);
    this.wallColor = LEVEL_WALL_COLORS[Math.min(level - 1, LEVEL_WALL_COLORS.length - 1)];
    this.applyLevelWalls(level);
    this.totalDots = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.data[y][x] === MAP_TILES.DOT || this.data[y][x] === MAP_TILES.POWER_PELLET) {
          this.totalDots++;
        }
      }
    }
  }

  applyLevelWalls(level) {
    // Standard map for all levels — difficulty is controlled by speed and timers only
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width) return MAP_TILES.VOID;
    if (y < 0 || y >= this.height) return MAP_TILES.VOID;
    return this.data[y][x];
  }

  setTile(x, y, tile) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.data[y][x] = tile;
    }
  }

  isWall(x, y) {
    const tile = this.getTile(x, y);
    return tile === MAP_TILES.WALL;
  }

  isGhostHouse(x, y) {
    const tile = this.getTile(x, y);
    return tile === MAP_TILES.GHOST_HOUSE || tile === MAP_TILES.GHOST_EXIT;
  }

  draw(ctx, cellSize, time) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.data[y][x];
        const px = x * cellSize;
        const py = y * cellSize;

        if (tile === MAP_TILES.WALL) {
          this.drawWall(ctx, x, y, px, py, cellSize);
        } else if (tile === MAP_TILES.DOT) {
          this.drawDot(ctx, px, py, cellSize);
        } else if (tile === MAP_TILES.POWER_PELLET) {
          this.drawPowerPellet(ctx, px, py, cellSize, time);
        } else if (tile === MAP_TILES.GHOST_EXIT) {
          this.drawGhostGate(ctx, px, py, cellSize);
        }
      }
    }
  }

  drawWall(ctx, x, y, px, py, s) {
    ctx.strokeStyle = this.wallColor.stroke;
    ctx.lineWidth = s * 0.15;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Glow
    ctx.shadowColor = this.wallColor.glow;
    ctx.shadowBlur = s * 0.3;

    const margin = s * 0.2;
    
    // Simplistic wall rendering with connections
    const neighbors = {
      up: this.isWall(x, y - 1),
      down: this.isWall(x, y + 1),
      left: this.isWall(x - 1, y),
      right: this.isWall(x + 1, y)
    };

    ctx.beginPath();
    const cx = px + s / 2;
    const cy = py + s / 2;

    if (neighbors.left) { ctx.moveTo(px, cy); ctx.lineTo(cx, cy); }
    if (neighbors.right) { ctx.moveTo(cx, cy); ctx.lineTo(px + s, cy); }
    if (neighbors.up) { ctx.moveTo(cx, py); ctx.lineTo(cx, cy); }
    if (neighbors.down) { ctx.moveTo(cx, cy); ctx.lineTo(cx, py + s); }

    // Circles at endpoints / corners
    if (!neighbors.up && !neighbors.down && !neighbors.left && !neighbors.right) {
       ctx.arc(cx, cy, s*0.2, 0, Math.PI*2);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawDot(ctx, px, py, s) {
    ctx.fillStyle = '#ffaa44';
    ctx.beginPath();
    ctx.arc(px + s / 2, py + s / 2, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPowerPellet(ctx, px, py, s, time) {
    const pulse = Math.abs(Math.sin(time / 200));
    ctx.fillStyle = '#fefe33';
    ctx.shadowColor = 'rgba(254, 254, 51, 0.8)';
    ctx.shadowBlur = pulse * s * 0.5;
    ctx.beginPath();
    ctx.arc(px + s / 2, py + s / 2, (0.2 + pulse * 0.15) * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawGhostGate(ctx, px, py, s) {
    ctx.strokeStyle = '#ff88cc';
    ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(px, py + s / 2);
    ctx.lineTo(px + s, py + s / 2);
    ctx.stroke();
  }
}
