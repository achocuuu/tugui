import Phaser from 'phaser';
import { advance, createSimulation, DIRECTIONS, pressTurn, releaseTurn, samplePosition } from './simulation.js';

class PlayScene extends Phaser.Scene {
  constructor() { super('play'); }

  create() {
    this.state = createSimulation();
    this.angle = 0;
    this.paused = false;
    this.skipFrame = true;
    this.graphics = this.add.graphics();
    this.hud = this.add.text(28, 22, '', { fontFamily: 'monospace', fontSize: '18px', color: '#f3edff', lineSpacing: 8 });
    this.add.text(28, 646, '← / →  Queue one turn at the next tile center     R  Restart\nRelease before pressing again. Keep turning to stay on the grid.',
      { fontFamily: 'monospace', fontSize: '16px', color: '#c9c1de', lineSpacing: 8 });

    // Advance to each event's time before assigning its turn to an approaching center.
    this.lastTime = performance.now();
    this.sync = () => {
      const now = performance.now();
      const elapsed = (now - this.lastTime) / 1000;
      this.lastTime = now;
      if (this.skipFrame) { this.skipFrame = false; return; }
      // Ignore long stalls rather than fast-forwarding an unseen run.
      if (!this.paused && elapsed < 0.25) advance(this.state, elapsed);
    };
    const down = (event) => {
      this.sync();
      if (event.repeat || this.paused) return;
      if (event.code === 'ArrowLeft') pressTurn(this.state, 'left');
      if (event.code === 'ArrowRight') pressTurn(this.state, 'right');
      if (event.code === 'KeyR') {
        const held = this.state.held;
        this.state = createSimulation();
        this.state.held = held;
        this.angle = 0;
      }
    };
    const up = (event) => {
      this.sync();
      if (event.code === 'ArrowLeft') releaseTurn(this.state, 'left');
      if (event.code === 'ArrowRight') releaseTurn(this.state, 'right');
    };
    this.input.keyboard.addCapture(['LEFT', 'RIGHT']);
    this.input.keyboard.on('keydown', down);
    this.input.keyboard.on('keyup', up);
    const focus = () => {
      this.paused = document.hidden || !document.hasFocus();
      // Key releases can occur outside the window and never reach Phaser.
      if (this.paused) this.state.held.clear();
      this.skipFrame = true;
      this.lastTime = performance.now();
    };
    window.addEventListener('blur', focus);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    focus();
    this.events.once('shutdown', () => {
      window.removeEventListener('blur', focus);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
      this.input.keyboard.off('keydown', down);
      this.input.keyboard.off('keyup', up);
    });
  }

  update(_time, delta) {
    this.sync();
    const target = this.state.direction * Math.PI / 2;
    const difference = Math.atan2(Math.sin(target - this.angle), Math.cos(target - this.angle));
    if (!this.paused) this.angle += difference * (1 - Math.exp(-Math.min(delta, 50) / 90));
    this.drawWorld();
    const s = this.state;
    this.hud.setText(`TUGUI  /  MVP–01\n${this.paused ? 'PAUSED — focus the game to resume' : s.status === 'failed' ? 'EDGE REACHED — press R to restart' : 'RUNNING'}\nTile ${s.x}, ${s.y} · ${DIRECTIONS[s.direction].name} · ${s.speed} tiles/s\nNext turn: ${s.queuedTurn ?? '—'}   Centers reached: ${s.steps}`);
  }

  drawWorld() {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x252039).fillRect(0, 0, 1000, 720);
    g.fillStyle(0x171524).fillRect(0, 235, 1000, 485);
    const position = samplePosition(this.state);
    const sin = Math.sin(this.angle), cos = Math.cos(this.angle);
    const local = (x, y) => {
      const dx = x - position.x, dy = y - position.y;
      return { right: dx * cos + dy * sin, depth: dx * sin - dy * cos + 4 };
    };
    const project = (p) => ({ x: 500 + p.right * 470 / p.depth, y: 220 + 1050 / p.depth });
    const tiles = [];
    for (let y = 0; y < this.state.level.height; y++) {
      for (let x = 0; x < this.state.level.width; x++) {
        let points = [[x - .5, y - .5], [x + .5, y - .5], [x + .5, y + .5], [x - .5, y + .5]].map(([a, b]) => local(a, b));
        // Clip floor polygons to the near plane so turns never project behind the camera.
        const clipped = [];
        for (let i = 0; i < points.length; i++) {
          const a = points[i], b = points[(i + 1) % points.length];
          if (a.depth >= 1) clipped.push(a);
          if ((a.depth >= 1) !== (b.depth >= 1)) {
            const t = (1 - a.depth) / (b.depth - a.depth);
            clipped.push({ right: a.right + (b.right - a.right) * t, depth: 1 });
          }
        }
        if (clipped.length >= 3) tiles.push({ points: clipped.map(project), depth: local(x, y).depth, x, y });
      }
    }
    tiles.sort((a, b) => b.depth - a.depth);
    for (const tile of tiles) {
      g.fillStyle((tile.x + tile.y) % 2 ? 0x765568 : 0xb29578);
      g.fillPoints(tile.points, true);
      g.lineStyle(1, 0x292334, .8).strokePoints(tile.points, true);
    }
    // Fixed behind-player marker; the floor rotates under the following camera.
    g.fillStyle(0x111222, .4).fillEllipse(500, 493, 48, 17);
    g.fillStyle(0xa5f3c4).fillTriangle(500, 448, 479, 487, 521, 487);
    g.lineStyle(2, 0xe9fff1).strokeTriangle(500, 448, 479, 487, 521, 487);
    // Small north-up map makes the approaching boundary and queued turn readable.
    const size = 9, left = 825, top = 30;
    g.fillStyle(0x151324, .95).fillRect(left - 10, top - 10, 155, 155);
    g.lineStyle(1, 0x645875);
    for (let i = 0; i <= 15; i++) {
      g.lineBetween(left + i * size, top, left + i * size, top + 135);
      g.lineBetween(left, top + i * size, left + 135, top + i * size);
    }
    const mx = left + (position.x + .5) * size, my = top + (position.y + .5) * size;
    const d = DIRECTIONS[this.state.direction];
    g.fillStyle(0xa5f3c4).fillCircle(mx, my, 4);
    g.lineStyle(2, 0xa5f3c4).lineBetween(mx, my, mx + d.x * 11, my + d.y * 11);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1000,
  height: 720,
  backgroundColor: '#151324',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: PlayScene,
});
