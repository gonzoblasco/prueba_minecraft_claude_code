import * as THREE from 'three';

const TILE = 16;
const COLS = 16;
const ROWS = 16;
const SIZE = TILE * COLS; // 256

function rng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
}

function px(ctx, x, y, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x, y, 1, 1);
}

function drawTile(ctx, col, row, fn) {
  const ox = col * TILE, oy = row * TILE;
  fn(ctx, ox, oy);
}

function colorVariant(hex, range, r) {
  const n = parseInt(hex.slice(1), 16);
  const rd = ((n >> 16) & 255) + Math.floor((r() - 0.5) * range * 2);
  const gd = ((n >> 8) & 255)  + Math.floor((r() - 0.5) * range * 2);
  const bd = (n & 255)          + Math.floor((r() - 0.5) * range * 2);
  const clamp = v => Math.max(0, Math.min(255, v));
  return `rgb(${clamp(rd)},${clamp(gd)},${clamp(bd)})`;
}

function solidTile(ctx, ox, oy, base, variance, seed) {
  const r = rng(seed);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    px(ctx, ox + x, oy + y, colorVariant(base, variance, r));
  }
}

function oreTile(ctx, ox, oy, base, oreColor, seed) {
  solidTile(ctx, ox, oy, base, 12, seed);
  const r = rng(seed + 99);
  for (let i = 0; i < 8; i++) {
    const tx = ox + Math.floor(r() * 14) + 1;
    const ty = oy + Math.floor(r() * 14) + 1;
    ctx.fillStyle = oreColor;
    ctx.fillRect(tx, ty, 2, 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(tx, ty, 1, 1);
  }
}

export function buildTextureAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ─── Row 0 ───
  // [0,0] grass_top
  drawTile(ctx, 0, 0, (c, ox, oy) => {
    const r = rng(1);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const g = 80 + Math.floor(r() * 40);
      const gv = 120 + Math.floor(r() * 30);
      px(c, ox+x, oy+y, `rgb(${g},${gv},${g})`);
    }
    // small darker patches
    for (let i = 0; i < 10; i++) {
      const dx = Math.floor(r()*14), dy = Math.floor(r()*14);
      px(c, ox+dx, oy+dy, '#3d7a1e');
    }
  });

  // [1,0] dirt
  drawTile(ctx, 1, 0, (c, ox, oy) => solidTile(c, ox, oy, '#8b5e3c', 18, 2));

  // [2,0] grass_side
  drawTile(ctx, 2, 0, (c, ox, oy) => {
    const r = rng(3);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      if (y < 4) {
        const g = 80 + Math.floor(r() * 30);
        px(c, ox+x, oy+y, `rgb(${g},${100+Math.floor(r()*30)},${g})`);
      } else {
        const b = 120 + Math.floor(r() * 30);
        px(c, ox+x, oy+y, `rgb(${b-40},${b-60},${b-80})`);
      }
    }
  });

  // [3,0] stone
  drawTile(ctx, 3, 0, (c, ox, oy) => {
    solidTile(c, ox, oy, '#7f7f7f', 15, 4);
    const r = rng(4);
    ctx.fillStyle = '#555';
    for (let i = 0; i < 5; i++) {
      const sx = ox + Math.floor(r()*12)+1, sy = oy + Math.floor(r()*12)+1;
      c.fillRect(sx, sy, Math.floor(r()*4)+2, 1);
    }
  });

  // [4,0] log_top
  drawTile(ctx, 4, 0, (c, ox, oy) => {
    const cx = ox + 8, cy = oy + 8;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const d = Math.sqrt((x-7.5)**2+(y-7.5)**2);
      let col;
      if (d < 3) col = '#5c3a1e';
      else if (d < 5) col = '#7a4f2d';
      else if (d < 6.5) col = '#5c3a1e';
      else col = '#8b6340';
      const r = rng(x*16+y+5);
      px(c, ox+x, oy+y, colorVariant(col, 8, r));
    }
  });

  // [5,0] log_side
  drawTile(ctx, 5, 0, (c, ox, oy) => {
    const r = rng(6);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const stripe = Math.sin((x/TILE)*Math.PI*3) > 0.3;
      const base = stripe ? '#7a4f2d' : '#8b6340';
      px(c, ox+x, oy+y, colorVariant(base, 10, r));
    }
  });

  // [6,0] leaves
  drawTile(ctx, 6, 0, (c, ox, oy) => {
    const r = rng(7);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      if (r() > 0.15) {
        const g = 60 + Math.floor(r() * 50);
        px(c, ox+x, oy+y, `rgb(${g-30},${g+30},${g-30})`);
      } // else transparent (no fill = black = fine for leaves cutout look)
    }
  });

  // [7,0] sand
  drawTile(ctx, 7, 0, (c, ox, oy) => solidTile(c, ox, oy, '#d9cb94', 15, 8));

  // [8,0] water
  drawTile(ctx, 8, 0, (c, ox, oy) => {
    const r = rng(9);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const wave = Math.sin((x+y)*0.8) * 15;
      px(c, ox+x, oy+y, `rgba(20,${100+wave},${180+wave},0.8)`);
    }
  });

  // [9,0] bedrock
  drawTile(ctx, 9, 0, (c, ox, oy) => {
    const r = rng(10);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const v = 30 + Math.floor(r() * 30);
      px(c, ox+x, oy+y, `rgb(${v},${v},${v})`);
    }
  });

  // [10,0] coal_ore
  oreTile(ctx, 10, 0, '#7f7f7f', '#111111', 11);
  // [11,0] iron_ore
  oreTile(ctx, 11, 0, '#7f7f7f', '#c8a87c', 12);
  // [12,0] gold_ore
  oreTile(ctx, 12, 0, '#7f7f7f', '#fcee4b', 13);
  // [13,0] diamond_ore
  oreTile(ctx, 13, 0, '#7f7f7f', '#7de7f5', 14);

  // [14,0] planks
  drawTile(ctx, 14, 0, (c, ox, oy) => {
    const r = rng(15);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const plank = Math.floor(y / 8);
      const base = plank % 2 === 0 ? '#c8a45a' : '#b8944a';
      px(c, ox+x, oy+y, colorVariant(base, 10, r));
    }
    // vertical lines
    ctx.fillStyle = '#9a7030';
    c.fillRect(ox, oy+8, TILE, 1);
    c.fillRect(ox+8, oy, 1, 8);
    c.fillRect(ox+8+4, oy+8, 1, 8);
  });

  // [15,0] glass
  drawTile(ctx, 15, 0, (c, ox, oy) => {
    ctx.fillStyle = 'rgba(170,220,255,0.4)';
    c.fillRect(ox, oy, TILE, TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillRect(ox, oy, TILE, 1); c.fillRect(ox, oy+TILE-1, TILE, 1);
    c.fillRect(ox, oy, 1, TILE); c.fillRect(ox+TILE-1, oy, 1, TILE);
    c.fillRect(ox+4, oy+4, 3, 3);
  });

  // ─── Row 1 ───
  // [0,1] gravel
  drawTile(ctx, 0, 1, (c, ox, oy) => {
    solidTile(c, ox, oy, '#888880', 20, 20);
    const r = rng(20);
    for (let i = 0; i < 12; i++) {
      const gx = ox+Math.floor(r()*13)+1, gy = oy+Math.floor(r()*13)+1;
      const s = Math.floor(r()*2)+1;
      c.fillStyle = colorVariant('#aaaaaa', 20, r);
      c.fillRect(gx, gy, s, s);
    }
  });

  // [1,1] cobblestone
  drawTile(ctx, 1, 1, (c, ox, oy) => {
    solidTile(c, ox, oy, '#888888', 20, 21);
    ctx.fillStyle = '#555';
    const stones = [[0,0,8,8],[8,0,8,4],[8,4,4,4],[12,4,4,4],[0,8,4,8],[4,8,6,4],[10,8,6,4],[4,12,5,4],[9,12,7,4]];
    stones.forEach(([sx,sy,sw,sh]) => {
      c.strokeStyle = '#444'; c.lineWidth = 1;
      c.strokeRect(ox+sx+0.5, oy+sy+0.5, sw-1, sh-1);
    });
  });

  // [2,1] torch
  drawTile(ctx, 2, 1, (c, ox, oy) => {
    // flame
    c.fillStyle = '#ffff00'; c.fillRect(ox+7, oy+1, 2, 2);
    c.fillStyle = '#ff8800'; c.fillRect(ox+6, oy+2, 4, 2);
    c.fillStyle = '#ff4400'; c.fillRect(ox+7, oy+3, 2, 1);
    // stick
    c.fillStyle = '#8b6340';
    for (let y = 4; y < 14; y++) { c.fillRect(ox+7, oy+y, 2, 1); }
  });

  // [3,1] crafting_top
  drawTile(ctx, 3, 1, (c, ox, oy) => {
    solidTile(c, ox, oy, '#c8a45a', 8, 30);
    ctx.fillStyle = '#4a3020';
    c.fillRect(ox+1, oy+1, 6, 6);
    c.fillRect(ox+9, oy+1, 6, 6);
    c.fillRect(ox+1, oy+9, 6, 6);
    c.fillRect(ox+9, oy+9, 6, 6);
  });

  // [4,1] crafting_side
  drawTile(ctx, 4, 1, (c, ox, oy) => {
    solidTile(c, ox, oy, '#c8a45a', 8, 31);
    ctx.fillStyle = '#8b5e3c';
    c.fillRect(ox+2, oy+2, 12, 8);
  });

  // [5,1] furnace_front
  drawTile(ctx, 5, 1, (c, ox, oy) => {
    solidTile(c, ox, oy, '#7f7f7f', 15, 32);
    ctx.fillStyle = '#333'; c.fillRect(ox+4, oy+4, 8, 8);
    ctx.fillStyle = '#ff6600'; c.fillRect(ox+5, oy+5, 6, 6);
    ctx.fillStyle = '#ffcc00'; c.fillRect(ox+6, oy+6, 4, 4);
  });

  // [6,1] furnace_side
  drawTile(ctx, 6, 1, (c, ox, oy) => solidTile(c, ox, oy, '#7f7f7f', 15, 33));

  // [7,1] snow
  drawTile(ctx, 7, 1, (c, ox, oy) => solidTile(c, ox, oy, '#e8f4f8', 8, 34));

  // [8,1] ice
  drawTile(ctx, 8, 1, (c, ox, oy) => {
    const r = rng(35);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      px(c, ox+x, oy+y, `rgba(100,170,230,${0.6+r()*0.2})`);
    }
  });

  // [9,1] clay
  drawTile(ctx, 9, 1, (c, ox, oy) => solidTile(c, ox, oy, '#9baabb', 10, 36));

  // [10,1] wool_white
  drawTile(ctx, 10, 1, (c, ox, oy) => solidTile(c, ox, oy, '#e8e8e8', 12, 37));
  // [11,1] wool_red
  drawTile(ctx, 11, 1, (c, ox, oy) => solidTile(c, ox, oy, '#cc2222', 12, 38));
  // [12,1] wool_blue
  drawTile(ctx, 12, 1, (c, ox, oy) => solidTile(c, ox, oy, '#2244cc', 12, 39));
  // [13,1] wool_green
  drawTile(ctx, 13, 1, (c, ox, oy) => solidTile(c, ox, oy, '#226622', 12, 40));

  // [14,1] leaves2 (birch)
  drawTile(ctx, 14, 1, (c, ox, oy) => {
    const r = rng(41);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      if (r() > 0.15) {
        const g = 80 + Math.floor(r() * 40);
        px(c, ox+x, oy+y, `rgb(${g+20},${g+50},${g})`);
      }
    }
  });

  // [15,1] log2_side (birch)
  drawTile(ctx, 15, 1, (c, ox, oy) => {
    const r = rng(42);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const v = 200 + Math.floor(r() * 30);
      if (r() < 0.1) px(c, ox+x, oy+y, '#555');
      else px(c, ox+x, oy+y, `rgb(${v},${v},${v-20})`);
    }
  });

  // ─── Row 2 ───
  // [0,2] log2_top (birch)
  drawTile(ctx, 0, 2, (c, ox, oy) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const d = Math.sqrt((x-7.5)**2+(y-7.5)**2);
      const v = d < 5 ? 160 : 210;
      const r = rng(x*16+y+43);
      const vv = v + Math.floor(r()-0.5) * 15;
      px(c, ox+x, oy+y, `rgb(${vv},${vv},${vv-15})`);
    }
  });

  // Build Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.flipY = true;
  return texture;
}

const TILES = COLS; // 16 tiles per row/col

export function getTileUV(col, row) {
  const u0 = col / TILES;
  const u1 = (col + 1) / TILES;
  // With flipY = true: canvas row 0 (top) → Three.js v=1
  // v for bottom of tile in Three.js = 1 - (row+1)/TILES
  // v for top of tile in Three.js    = 1 - row/TILES
  const v0 = 1 - (row + 1) / TILES; // bottom of tile
  const v1 = 1 - row / TILES;        // top of tile
  return { u0, u1, v0, v1 };
}
