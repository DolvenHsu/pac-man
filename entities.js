const DIRECTIONS = {
  UP: { x: 0, y: -1, angle: -Math.PI / 2 },
  DOWN: { x: 0, y: 1, angle: Math.PI / 2 },
  LEFT: { x: -1, y: 0, angle: Math.PI },
  RIGHT: { x: 1, y: 0, angle: 0 },
  NONE: { x: 0, y: 0, angle: 0 }
};

class Entity {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.dir = DIRECTIONS.NONE;
    this.nextDir = DIRECTIONS.NONE;
    this.targetX = x;
    this.targetY = y;
  }

  isAtCenter(s) {
     return Math.abs(this.x % 1) < this.speed * 1.5 && Math.abs(this.y % 1) < this.speed * 1.5;
  }
}

class PacMan extends Entity {
  constructor(x, y) {
    super(x, y, 0.1);
    this.mouthOpen = 0;
    this.mouthSpeed = 0.15;
    this.lives = 3;
    this.rotation = 0;
    this.radius = 0.72;
  }

  update(maze) {
    // Movement logic
    const gridX = Math.round(this.x);
    const gridY = Math.round(this.y);
    
    // Check if we're roughly at tile center
    if (Math.abs(this.x - gridX) < this.speed && Math.abs(this.y - gridY) < this.speed) {
      if (this.nextDir !== DIRECTIONS.NONE) {
        const nextTile = maze.getTile(gridX + this.nextDir.x, gridY + this.nextDir.y);
        if (nextTile !== MAP_TILES.WALL) {
          this.dir = this.nextDir;
          this.nextDir = DIRECTIONS.NONE;
        }
      }
      
      const aheadTile = maze.getTile(gridX + this.dir.x, gridY + this.dir.y);
      if (aheadTile === MAP_TILES.WALL) {
        this.dir = DIRECTIONS.NONE;
      }
    }

    this.x += this.dir.x * this.speed;
    this.y += this.dir.y * this.speed;
    
    // Tunneling
    if (this.x < 0) this.x = maze.width - 1;
    if (this.x > maze.width - 1) this.x = 0;

    // Animation
    if (this.dir !== DIRECTIONS.NONE) {
      this.mouthOpen += this.mouthSpeed;
      if (this.mouthOpen > 0.3 || this.mouthOpen < 0) this.mouthSpeed *= -1;
      this.rotation = this.dir.angle;
    }
  }

  draw(ctx, s) {
    ctx.save();
    ctx.translate((this.x + 0.5) * s, (this.y + 0.5) * s);
    ctx.rotate(this.rotation);
    
    ctx.fillStyle = '#fefe33';
    ctx.shadowColor = 'rgba(254, 254, 51, 0.5)';
    ctx.shadowBlur = s * 0.2;
    
    ctx.beginPath();
    const mouthSize = this.mouthOpen * Math.PI;
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, this.radius * s, mouthSize, Math.PI * 2 - mouthSize);
    ctx.fill();
    ctx.restore();
  }
}

class Ghost extends Entity {
  constructor(x, y, name, color, scatterTarget) {
    super(x, y, 0.08);
    this.name = name;
    this.color = color;
    this.mode = 'CHASE'; // CHASE, SCATTER, FRIGHTENED, EATEN
    this.scatterTarget = scatterTarget;
    this.frightenedTimer = 0;
    this.prevTileX = -1;
    this.prevTileY = -1;
    this.startPos = { x, y };
  }

  update(maze, pacman, blinky) {
    const gridX = Math.round(this.x);
    const gridY = Math.round(this.y);

    if (gridX !== this.prevTileX || gridY !== this.prevTileY) {
      this.prevTileX = gridX;
      this.prevTileY = gridY;

      // Choose next direction
      const target = this.getTarget(pacman, blinky);
      this.chooseDirection(maze, target);
    }

    this.x += this.dir.x * this.speed;
    this.y += this.dir.y * this.speed;
    
    // Tunneling
    if (this.x < 0) this.x = maze.width - 1;
    if (this.x > maze.width - 1) this.x = 0;

    if (this.mode === 'FRIGHTENED') {
      this.frightenedTimer--;
      if (this.frightenedTimer <= 0) this.mode = 'CHASE';
    }
  }

  getTarget(pacman, blinky) {
    if (this.mode === 'SCATTER') return this.scatterTarget;
    if (this.mode === 'FRIGHTENED') return { x: Math.random() * 28, y: Math.random() * 31 };
    if (this.mode === 'EATEN') return { x: 14, y: 13 }; // Ghost House

    // CHASE Logic per ghost
    switch (this.name) {
      case 'BLINKY': return { x: pacman.x, y: pacman.y };
      case 'PINKY': return { x: pacman.x + pacman.dir.x * 4, y: pacman.y + pacman.dir.y * 4 };
      case 'INKY': 
        const px = pacman.x + pacman.dir.x * 2;
        const py = pacman.y + pacman.dir.y * 2;
        return { x: px + (px - blinky.x), y: py + (py - blinky.y) };
      case 'CLYDE':
        const d = Math.sqrt(Math.pow(this.x - pacman.x, 2) + Math.pow(this.y - pacman.y, 2));
        return (d > 8) ? { x: pacman.x, y: pacman.y } : this.scatterTarget;
    }
  }

  chooseDirection(maze, target) {
    const possibleDirs = [DIRECTIONS.UP, DIRECTIONS.DOWN, DIRECTIONS.LEFT, DIRECTIONS.RIGHT];
    let bestDir = this.dir;
    let minDist = Infinity;

    possibleDirs.forEach(d => {
      // Cannot reverse direction
      if (d.x === -this.dir.x && d.y === -this.dir.y) return;
      
      const nx = Math.round(this.x + d.x);
      const ny = Math.round(this.y + d.y);
      const tile = maze.getTile(nx, ny);
      
      if (tile !== MAP_TILES.WALL) {
        const dist = Math.pow(nx - target.x, 2) + Math.pow(ny - target.y, 2);
        if (dist < minDist) {
          minDist = dist;
          bestDir = d;
        }
      }
    });

    this.dir = bestDir;
  }

  draw(ctx, s) {
    const px = (this.x + 0.5) * s;
    const py = (this.y + 0.5) * s;
    const r = s * 0.44;

    ctx.fillStyle = this.mode === 'FRIGHTENED' ? (this.frightenedTimer < 100 && this.frightenedTimer % 20 < 10 ? 'white' : '#0033ff') : this.color;
    if (this.mode === 'EATEN') ctx.fillStyle = 'rgba(255,255,255,0.2)';

    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = s * 0.2;

    // Body (Dome)
    ctx.beginPath();
    ctx.arc(px, py, r, Math.PI, 0);
    ctx.lineTo(px + r, py + r);
    // Wavy bottom
    const waveRadius = r / 3;
    for (let i = 0; i < 3; i++) {
       ctx.arc(px + r - (i * waveRadius * 2) - waveRadius, py + r, waveRadius, 0, Math.PI);
    }
    ctx.lineTo(px - r, py);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(px - r*0.3, py - r*0.2, r*0.2, 0, Math.PI*2);
    ctx.arc(px + r*0.3, py - r*0.2, r*0.2, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(px - r*0.3 + this.dir.x*r*0.1, py - r*0.2 + this.dir.y*r*0.1, r*0.1, 0, Math.PI*2);
    ctx.arc(px + r*0.3 + this.dir.x*r*0.1, py - r*0.2 + this.dir.y*r*0.1, r*0.1, 0, Math.PI*2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}
