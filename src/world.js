import * as THREE from 'three';
import { Chunk, CHUNK_W, CHUNK_H } from './chunk.js';
import { BLOCK, BLOCK_DATA } from './blocks.js';
import { SimplexNoise } from './noise.js';
import { buildTextureAtlas } from './textures.js';

const SEA_LEVEL = 62;
const RENDER_DIST = 8;

export class World {
  constructor(scene, seed = Math.floor(Math.random() * 1e9)) {
    this.scene = scene;
    this.seed = seed;
    this.chunks = new Map();
    this.noise = new SimplexNoise(seed);
    this.noise2 = new SimplexNoise(seed + 1);
    this.noise3 = new SimplexNoise(seed + 2);
    this.material = null;
    this.waterMaterial = null;
    this._buildMaterials();
  }

  _buildMaterials() {
    const atlas = buildTextureAtlas();
    this.atlasCanvas = atlas.image; // The canvas used for the atlas

    this.material = new THREE.MeshLambertMaterial({
      map: atlas,
      vertexColors: true,
      side: THREE.FrontSide,
    });

    const wAtlas = buildTextureAtlas(); // separate instance for water
    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: wAtlas,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  chunkKey(cx, cz) { return `${cx},${cz}`; }
  getChunk(cx, cz) { return this.chunks.get(this.chunkKey(cx, cz)); }

  _ensureChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    if (!this.chunks.has(key)) {
      const chunk = new Chunk(cx, cz);
      this.chunks.set(key, chunk);
      this._generateChunk(chunk);
    }
    return this.chunks.get(key);
  }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= CHUNK_H) return 0;
    const cx = Math.floor(wx / CHUNK_W);
    const cz = Math.floor(wz / CHUNK_W);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const lz = ((wz % CHUNK_W) + CHUNK_W) % CHUNK_W;
    return chunk.getBlock(lx, wy, lz);
  }

  setBlock(wx, wy, wz, id) {
    if (wy < 0 || wy >= CHUNK_H) return;
    const cx = Math.floor(wx / CHUNK_W);
    const cz = Math.floor(wz / CHUNK_W);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const lz = ((wz % CHUNK_W) + CHUNK_W) % CHUNK_W;
    chunk.setBlock(lx, wy, lz, id);
    // Mark neighbors dirty if on chunk edge
    if (lx === 0) { const n = this.getChunk(cx-1, cz); if (n) n.dirty = true; }
    if (lx === CHUNK_W-1) { const n = this.getChunk(cx+1, cz); if (n) n.dirty = true; }
    if (lz === 0) { const n = this.getChunk(cx, cz-1); if (n) n.dirty = true; }
    if (lz === CHUNK_W-1) { const n = this.getChunk(cx, cz+1); if (n) n.dirty = true; }
  }

  _heightAt(wx, wz) {
    const h1 = this.noise.noise2d(wx * 0.004, wz * 0.004) * 28;
    const h2 = this.noise.noise2d(wx * 0.012, wz * 0.012) * 14;
    const h3 = this.noise.noise2d(wx * 0.05, wz * 0.05) * 5;
    const mountain = Math.max(0, this.noise2.noise2d(wx * 0.003, wz * 0.003));
    const mountainH = mountain * mountain * 55;
    return Math.floor(SEA_LEVEL + h1 + h2 + h3 + mountainH);
  }

  _biomeAt(wx, wz) {
    const b = this.noise3.noise2d(wx * 0.002, wz * 0.002);
    if (b < -0.3) return 'desert';
    if (b > 0.45) return 'mountains';
    return 'plains';
  }

  _generateChunk(chunk) {
    const { cx, cz } = chunk;

    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_W; lz++) {
        const wx = cx * CHUNK_W + lx;
        const wz = cz * CHUNK_W + lz;
        const height = Math.max(2, Math.min(CHUNK_H - 3, this._heightAt(wx, wz)));
        const biome = this._biomeAt(wx, wz);

        // Bedrock
        chunk.setBlock(lx, 0, lz, BLOCK.BEDROCK);

        for (let y = 1; y <= height; y++) {
          let id;
          if (y <= 2) {
            id = this.noise.noise2d(wx*0.4, y*0.4+wz*0.4) > 0.3 ? BLOCK.BEDROCK : BLOCK.STONE;
          } else if (y < height - 3) {
            // Underground ores
            const on = this.noise.noise2d(wx*0.28, y*0.28+wz*0.28);
            if (y < 15 && on > 0.82) id = BLOCK.DIAMOND_ORE;
            else if (y < 28 && on > 0.78) id = BLOCK.GOLD_ORE;
            else if (on > 0.73) id = BLOCK.IRON_ORE;
            else if (on > 0.63) id = BLOCK.COAL_ORE;
            else id = BLOCK.STONE;
          } else if (y < height) {
            id = biome === 'desert' ? BLOCK.SAND : BLOCK.DIRT;
          } else {
            // Surface block
            if (biome === 'desert') id = BLOCK.SAND;
            else if (height > SEA_LEVEL + 18) id = BLOCK.SNOW;
            else id = BLOCK.GRASS;
          }
          chunk.setBlock(lx, y, lz, id);
        }

        // Water
        if (height < SEA_LEVEL) {
          for (let y = height + 1; y <= SEA_LEVEL; y++) {
            chunk.setBlock(lx, y, lz, BLOCK.WATER);
          }
        }

        // Caves
        for (let y = 4; y < height - 3; y++) {
          const c1 = this.noise.noise2d(wx*0.09, y*0.04 + wz*0.09);
          const c2 = this.noise2.noise2d(wx*0.09 + 50, y*0.09 + wz*0.09);
          if (c1 > 0.62 && c2 > 0.48) chunk.setBlock(lx, y, lz, BLOCK.AIR);
        }
      }
    }

    // Trees
    const tr = this._makeRng(cx * 73856093 ^ cz * 19349663);
    const biome = this._biomeAt(cx * CHUNK_W + 8, cz * CHUNK_W + 8);
    if (biome !== 'desert') {
      const count = 2 + Math.floor(tr() * 4);
      for (let t = 0; t < count; t++) {
        const lx = 2 + Math.floor(tr() * (CHUNK_W - 4));
        const lz = 2 + Math.floor(tr() * (CHUNK_W - 4));
        const wx = cx * CHUNK_W + lx;
        const wz = cz * CHUNK_W + lz;
        const h = this._heightAt(wx, wz);
        if (h > SEA_LEVEL && h < SEA_LEVEL + 16) {
          this._placeTree(chunk, lx, h + 1, lz, tr);
        }
      }
    }

    chunk.generated = true;
  }

  _placeTree(chunk, lx, y, lz, rng) {
    const h = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < h; i++) chunk.setBlock(lx, y + i, lz, BLOCK.WOOD);
    for (let dy = h - 2; dy <= h + 1; dy++) {
      const r = dy >= h ? 1 : 2;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r) continue;
          const bx = lx + dx, bz2 = lz + dz;
          if (bx >= 0 && bx < CHUNK_W && bz2 >= 0 && bz2 < CHUNK_W) {
            if (chunk.getBlock(bx, y + dy, bz2) === BLOCK.AIR)
              chunk.setBlock(bx, y + dy, bz2, BLOCK.LEAVES);
          }
        }
      }
    }
  }

  _makeRng(seed) {
    let s = (seed ^ 0xdeadbeef) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  update(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_W);
    const pcz = Math.floor(playerZ / CHUNK_W);
    const rd = RENDER_DIST;

    // Ensure chunks in range
    for (let dx = -rd; dx <= rd; dx++) {
      for (let dz = -rd; dz <= rd; dz++) {
        if (dx*dx + dz*dz > rd*rd) continue;
        this._ensureChunk(pcx + dx, pcz + dz);
      }
    }

    // Rebuild dirty chunks (limited per frame)
    let rebuilt = 0;
    for (const [key, chunk] of this.chunks) {
      if (!chunk.dirty || rebuilt >= 5) continue;
      if (chunk.mesh) this.scene.remove(chunk.mesh);
      if (chunk.waterMesh) this.scene.remove(chunk.waterMesh);
      chunk.buildMesh(this.material, this.waterMaterial, (wx, wy, wz) => this.getBlock(wx, wy, wz));
      if (chunk.mesh) this.scene.add(chunk.mesh);
      if (chunk.waterMesh) this.scene.add(chunk.waterMesh);
      rebuilt++;
    }

    // Unload distant chunks
    for (const [key, chunk] of this.chunks) {
      const [kcx, kcz] = key.split(',').map(Number);
      if (Math.max(Math.abs(kcx - pcx), Math.abs(kcz - pcz)) > rd + 2) {
        if (chunk.mesh) this.scene.remove(chunk.mesh);
        if (chunk.waterMesh) this.scene.remove(chunk.waterMesh);
        chunk.dispose();
        this.chunks.delete(key);
      }
    }
  }

  raycast(origin, direction, maxDist = 5) {
    const step = 0.05;
    let x = origin.x, y = origin.y, z = origin.z;
    let px = x, py = y, pz = z;
    for (let d = 0; d < maxDist; d += step) {
      px = x; py = y; pz = z;
      x += direction.x * step;
      y += direction.y * step;
      z += direction.z * step;
      const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
      const b = this.getBlock(bx, by, bz);
      if (b !== 0 && !BLOCK_DATA[b]?.liquid) {
        return { hit: true, blockX: bx, blockY: by, blockZ: bz,
                 prevX: Math.floor(px), prevY: Math.floor(py), prevZ: Math.floor(pz) };
      }
    }
    return { hit: false };
  }

  getSurfaceY(wx, wz) {
    this._ensureChunk(Math.floor(wx / CHUNK_W), Math.floor(wz / CHUNK_W));
    for (let y = CHUNK_H - 1; y >= 0; y--) {
      const b = this.getBlock(wx, y, wz);
      if (b !== 0 && b !== BLOCK.WATER) return y + 1;
    }
    return SEA_LEVEL + 1;
  }
}
