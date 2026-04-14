class SoundEngine {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.enabled = false;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.gain = this.ctx.createGain();
    this.gain.connect(this.ctx.destination);
    this.enabled = true;
  }

  playChomp() {
    if (!this.enabled) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.1, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(g);
    g.connect(this.gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playPowerUp() {
     if (!this.enabled) return;
     const osc = this.ctx.createOscillator();
     osc.type = 'square';
     osc.frequency.setValueAtTime(200, this.ctx.currentTime);
     osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.2);
     this.gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
     osc.connect(this.gain);
     osc.start();
     osc.stop(this.ctx.currentTime + 0.2);
  }

  playDeath() {
     if (!this.enabled) return;
     const osc = this.ctx.createOscillator();
     osc.type = 'sawtooth';
     osc.frequency.setValueAtTime(800, this.ctx.currentTime);
     osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 1.0);
     this.gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
     osc.connect(this.gain);
     osc.start();
     osc.stop(this.ctx.currentTime + 1.0);
  }
}

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.maze = new Maze();
    this.sound = new SoundEngine();
    
    this.pacman = new PacMan(14, 23);
    this.ghosts = [
      new Ghost(13, 11, 'BLINKY', '#ff3344', { x: 25, y: -2 }),
      new Ghost(14, 13, 'PINKY', '#ff88cc', { x: 2, y: -2 }),
      new Ghost(11, 13, 'INKY', '#00ffff', { x: 27, y: 31 }),
      new Ghost(16, 13, 'CLYDE', '#ffaa44', { x: 0, y: 31 })
    ];
    
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('pacman-highscore')) || 0;
    this.level = 1;
    this.state = 'START'; // START, PLAYING, DEATH, WIN
    this.cellSize = 20;
    
    this.lastTime = 0;
    this.touchStart = { x: 0, y: 0 };

    this.floatingTexts = [];
    this.ghostCombo = 0;
    this.dotsEaten = 0;
    this.fruit = null;
    this.fruitTypes = [
      { name: 'CHERRY',     value: 100,  color: '#ff2244' },
      { name: 'STRAWBERRY', value: 300,  color: '#ff66aa' },
      { name: 'ORANGE',     value: 500,  color: '#ff8800' },
      { name: 'APPLE',      value: 700,  color: '#ff0000' },
      { name: 'MELON',      value: 1000, color: '#44cc44' },
      { name: 'GALAXIAN',   value: 2000, color: '#4488ff' },
      { name: 'BELL',       value: 3000, color: '#ffee44' },
      { name: 'KEY',        value: 5000, color: '#88ffff' },
    ];

    this.init();
    this.setupGamepad();
    this.applyDifficulty();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // UI Init
    document.getElementById('high-score').textContent = this.highScore.toString().padStart(6, '0');
    this.updateLivesUI();
  }

  resize() {
    const container = document.querySelector('.game-wrapper');
    const width = container.clientWidth;
    this.cellSize = Math.floor(width / this.maze.width);
    this.canvas.width = this.cellSize * this.maze.width;
    this.canvas.height = this.cellSize * this.maze.height;
  }

  setupGamepad() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (this.state === 'START') this.startGame();
      switch(e.key) {
        case 'ArrowUp': case 'w': this.pacman.nextDir = DIRECTIONS.UP; break;
        case 'ArrowDown': case 's': this.pacman.nextDir = DIRECTIONS.DOWN; break;
        case 'ArrowLeft': case 'a': this.pacman.nextDir = DIRECTIONS.LEFT; break;
        case 'ArrowRight': case 'd': this.pacman.nextDir = DIRECTIONS.RIGHT; break;
      }
    });

    // Floating Joystick State
    this.joystickActive = false;
    this.joystickBaseX = 0;
    this.joystickBaseY = 0;
    this.joystickBaseEl = document.getElementById('joystick-base');
    this.joystickKnobEl = document.getElementById('joystick-knob');
    this.joystickMaxRadius = 15;

    const handleStart = (clientX, clientY) => {
      if (this.state === 'START') this.startGame();
      this.joystickActive = true;
      this.joystickBaseX = clientX;
      this.joystickBaseY = clientY;
      
      this.joystickBaseEl.style.left = `${clientX}px`;
      this.joystickBaseEl.style.top = `${clientY}px`;
      this.joystickBaseEl.classList.add('active');
      this.joystickKnobEl.style.transform = `translate(-50%, -50%)`;
    };

    const handleMove = (clientX, clientY) => {
      if (!this.joystickActive) return;
      
      const dx = clientX - this.joystickBaseX;
      const dy = clientY - this.joystickBaseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate knob position (clamped to max radius)
      let knobX = dx;
      let knobY = dy;
      
      // Dynamic joystick base: If moved past radius, drag the base along to allow endless swiping
      if (distance > this.joystickMaxRadius) {
        const ratio = this.joystickMaxRadius / distance;
        knobX *= ratio;
        knobY *= ratio;
        
        this.joystickBaseX = clientX - knobX;
        this.joystickBaseY = clientY - knobY;
        this.joystickBaseEl.style.left = `${this.joystickBaseX}px`;
        this.joystickBaseEl.style.top = `${this.joystickBaseY}px`;
      }
      
      // Visual update
      this.joystickKnobEl.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

      // Determine direction quickly based on vector (1 pixel is enough)
      if (distance > 1) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.pacman.nextDir = dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
        } else {
          this.pacman.nextDir = dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
        }
      }
    };

    const handleEnd = () => {
      this.joystickActive = false;
      this.joystickBaseEl.classList.remove('active');
      this.joystickKnobEl.style.transform = `translate(-50%, -50%)`;
    };

    window.addEventListener('touchstart', (e) => {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.joystickActive && e.cancelable) e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    // Mouse fallback for desktop testing
    window.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handleEnd);
  }

  startGame() {
    if (this.deathTimeout) clearTimeout(this.deathTimeout);
    if (this.pacman.lives <= 0 || this.maze.totalDots === 0) {
      this.resetGame();
    }
    this.applyDifficulty();
    this.state = 'PLAYING';
    document.getElementById('overlay').classList.add('hidden');
    try {
      this.sound.init();
    } catch(e) {
      console.error("Sound init failed:", e);
    }
  }

  applyDifficulty() {
    // Level 1: very easy. Each level gets progressively harder.
    const lvl = this.level;
    // Pac-Man: fast at level 1, slightly slower at higher levels
    this.pacman.speed = Math.max(0.08, 0.13 - (lvl - 1) * 0.005);
    // Ghosts: very slow at level 1, speed up each level
    const ghostSpeed = Math.min(0.1, 0.04 + (lvl - 1) * 0.008);
    this.ghosts.forEach(g => { g.speed = ghostSpeed; });
    // Frightened duration: long at level 1, shorter at higher levels
    this.frightenedDuration = Math.max(200, 800 - (lvl - 1) * 80);
  }

  resetGame() {
    if (this.deathTimeout) clearTimeout(this.deathTimeout);
    this.score = 0;
    this.level = 1;
    this.maze.reset(this.level);
    this.pacman = new PacMan(14, 23);
    this.ghosts.forEach(g => {
        if (g.startPos) {
          g.x = g.startPos.x;
          g.y = g.startPos.y;
        }
        g.mode = 'CHASE';
        g.dir = DIRECTIONS.NONE;
    });
    this.updateScore();
    this.updateLivesUI();
    this.dotsEaten = 0;
    this.ghostCombo = 0;
    this.fruit = null;
    this.floatingTexts = [];
  }

  updateScore(points = 0) {
    this.score += points;
    document.getElementById('score').textContent = this.score.toString().padStart(6, '0');
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pacman-highscore', this.highScore);
      document.getElementById('high-score').textContent = this.highScore.toString().padStart(6, '0');
    }
  }

  updateLivesUI() {
    const container = document.getElementById('lives');
    container.innerHTML = '';
    for (let i = 0; i < this.pacman.lives; i++) {
        container.innerHTML += `<svg class="life-svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#fefe33"/></svg>`;
    }
  }

  loop(time) {
    if (this.state === 'PLAYING') {
      this.update(time);
    }
    this.draw(time);
    requestAnimationFrame(this.loop);
  }

  update(time) {
    this.pacman.update(this.maze);
    
    // Dot Collision
    const gridX = Math.round(this.pacman.x);
    const gridY = Math.round(this.pacman.y);
    const tile = this.maze.getTile(gridX, gridY);
    
    if (tile === MAP_TILES.DOT) {
      this.maze.setTile(gridX, gridY, MAP_TILES.EMPTY);
      this.updateScore(10);
      this.sound.playChomp();
      this.dotsEaten++;
      if (this.dotsEaten === 70 || this.dotsEaten === 170) this.spawnFruit();
      this.checkWin();
    } else if (tile === MAP_TILES.POWER_PELLET) {
      this.maze.setTile(gridX, gridY, MAP_TILES.EMPTY);
      this.updateScore(50);
      this.sound.playPowerUp();
      this.ghostCombo = 0;
      this.ghosts.forEach(g => {
        g.mode = 'FRIGHTENED';
        g.frightenedTimer = this.frightenedDuration || 500;
        g.dir = { x: -g.dir.x, y: -g.dir.y }; // Reverse
      });
      this.checkWin();
    }

    // Ghost Update & Collision
    const blinky = this.ghosts[0];
    this.ghosts.forEach(g => {
      g.update(this.maze, this.pacman, blinky);

      const dist = Math.sqrt(Math.pow(this.pacman.x - g.x, 2) + Math.pow(this.pacman.y - g.y, 2));
      if (dist < 0.6) {
        if (g.mode === 'FRIGHTENED') {
          g.mode = 'EATEN';
          this.ghostCombo++;
          const ghostScore = 200 * Math.pow(2, this.ghostCombo - 1);
          this.updateScore(ghostScore);
          this.addFloatingText(g.x, g.y, ghostScore.toString(), '#ffffff');
        } else if (g.mode !== 'EATEN') {
          this.handleDeath();
        }
      }
    });

    // Fruit Update
    if (this.fruit) {
      this.fruit.timer--;
      if (this.fruit.timer <= 0) {
        this.fruit = null;
      } else {
        const fdist = Math.sqrt(
          Math.pow(this.pacman.x - this.fruit.x, 2) +
          Math.pow(this.pacman.y - this.fruit.y, 2)
        );
        if (fdist < 0.8) {
          this.updateScore(this.fruit.value);
          this.addFloatingText(this.fruit.x, this.fruit.y, this.fruit.value.toString(), this.fruit.color);
          this.fruit = null;
        }
      }
    }

    // Floating Texts Update
    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
    this.floatingTexts.forEach(ft => {
      ft.life--;
      ft.alpha = ft.life / 60;
    });
  }

  handleDeath() {
    this.state = 'DEATH';
    this.pacman.lives--;
    this.sound.playDeath();
    this.updateLivesUI();
    
    this.deathTimeout = setTimeout(() => {
      if (this.pacman.lives > 0) {
        this.pacman.x = 14;
        this.pacman.y = 23;
        this.pacman.dir = DIRECTIONS.NONE;
        this.state = 'PLAYING';
      } else {
        document.getElementById('overlay-title').textContent = 'GAME OVER';
        document.getElementById('overlay-message').textContent = 'CLICK TO START';
        document.getElementById('overlay').classList.remove('hidden');
        this.state = 'START';
        // Delay to allow reading "GAME OVER" before next game can start
      }
    }, 2000);
  }

  checkWin() {
    let dotsRemaining = 0;
    for (let y = 0; y < this.maze.height; y++) {
      for (let x = 0; x < this.maze.width; x++) {
        const tile = this.maze.data[y][x];
        if (tile === MAP_TILES.DOT || tile === MAP_TILES.POWER_PELLET) {
          dotsRemaining++;
        }
      }
    }
    
    if (dotsRemaining === 0) {
      this.state = 'WIN';
      document.getElementById('overlay-title').textContent = 'LEVEL CLEAR!';
      document.getElementById('overlay-message').textContent = 'PREPARING NEXT LEVEL...';
      document.getElementById('overlay').classList.remove('hidden');
      
      setTimeout(() => {
        this.level++;
        this.dotsEaten = 0;
        this.ghostCombo = 0;
        this.fruit = null;
        document.getElementById('level').textContent = this.level;
        this.maze.reset(this.level);
        this.pacman.x = 14;
        this.pacman.y = 23;
        this.pacman.dir = DIRECTIONS.NONE;
        this.ghosts.forEach(g => {
            // Reset ghosts to start positions
            g.mode = 'CHASE';
        });
        this.startGame();
      }, 3000);
    }
  }

  draw(time) {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.maze.draw(this.ctx, this.cellSize, time);
    this.pacman.draw(this.ctx, this.cellSize);
    this.ghosts.forEach(g => g.draw(this.ctx, this.cellSize));
    this.drawFruit(this.ctx, this.cellSize);
    this.drawFloatingTexts(this.ctx, this.cellSize);
  }

  spawnFruit() {
    if (this.fruit) return;
    const idx = Math.min(this.level - 1, this.fruitTypes.length - 1);
    const type = this.fruitTypes[idx];
    this.fruit = { x: 13, y: 17, value: type.value, color: type.color, timer: 600 };
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, alpha: 1.0, life: 60 });
  }

  drawFruit(ctx, s) {
    if (!this.fruit) return;
    const f = this.fruit;
    const px = (f.x + 0.5) * s;
    const py = (f.y + 0.5) * s;
    const r = s * 0.38;
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 250);

    ctx.shadowColor = f.color;
    ctx.shadowBlur = s * 0.6 * pulse;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    // Bright inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(px - r * 0.25, py - r * 0.28, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawFloatingTexts(ctx, s) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.floor(s * 0.7)}px "Press Start 2P", monospace`;
    this.floatingTexts.forEach(ft => {
      const progress = 1 - ft.life / 60;
      const px = (ft.x + 0.5) * s;
      const py = (ft.y - progress * 2 + 0.5) * s;
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, px, py);
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  }
}

// Start
window.onload = () => new GameEngine();
