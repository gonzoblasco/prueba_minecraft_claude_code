import * as THREE from 'three';
import { BLOCK_DATA, BLOCK } from './blocks.js';
import { getTileUV } from './textures.js';

export const CHUNK_W = 16;
export const CHUNK_H = 128;

const FACES = [
  { dir:[0,1,0],  norm:[0,1,0],  type:'top',    light:1.0,  verts:[[0,1,0],[1,1,0],[1,1,1],[0,1,1]], uvs:[[0,1],[1,1],[1,0],[0,0]] },
  { dir:[0,-1,0], norm:[0,-1,0], type:'bottom', light:0.5,  verts:[[0,0,1],[1,0,1],[1,0,0],[0,0,0]], uvs:[[0,1],[1,1],[1,0],[0,0]] },
  { dir:[0,0,-1], norm:[0,0,-1], type:'side',   light:0.8,  verts:[[1,1,0],[0,1,0],[0,0,0],[1,0,0]], uvs:[[0,1],[1,1],[1,0],[0,0]] },
  { dir:[0,0,1],  norm:[0,0,1],  type:'side',   light:0.8,  verts:[[0,1,1],[1,1,1],[1,0,1],[0,0,1]], uvs:[[0,1],[1,1],[1,0],[0,0]] },
  { dir:[-1,0,0], norm:[-1,0,0], type:'side',   light:0.65, verts:[[0,1,1],[0,1,0],[0,0,0],[0,0,1]], uvs:[[0,1],[1,1],[1,0],[0,0]] },
  { dir:[1,0,0],  norm:[1,0,0],  type:'side',   light:0.65, verts:[[1,1,0],[1,1,1],[1,0,1],[1,0,0]], uvs:[[0,1],[1,1],[1,0],[0,0]] },
];

function isNeighborVisible(blockId, neighborId) {
  if (neighborId === 0) return true;
  const nd = BLOCK_DATA[neighborId];
  if (!nd) return true;
  if (nd.liquid) return blockId !== BLOCK.WATER; // water faces only shown if neighbor is air
  return nd.transparent && !nd.liquid;
}

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_W * CHUNK_W * CHUNK_H);
    this.mesh = null;
    this.waterMesh = null;
    this.dirty = true;
    this.generated = false;
  }

  idx(x, y, z) { return x + z * CHUNK_W + y * CHUNK_W * CHUNK_W; }

  getBlock(x, y, z) {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_W || y < 0 || y >= CHUNK_H) return 0;
    return this.blocks[this.idx(x, y, z)];
  }

  setBlock(x, y, z, id) {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_W || y < 0 || y >= CHUNK_H) return;
    this.blocks[this.idx(x, y, z)] = id;
    this.dirty = true;
  }

  buildMesh(material, waterMaterial, getWorldBlock) {
    // Two separate arrays: opaque and water
    const oPos=[], oNrm=[], oUvs=[], oIdx=[], oCol=[];
    const wPos=[], wNrm=[], wUvs=[], wIdx=[], wCol=[];
    let oVi = 0, wVi = 0;

    for (let y = 0; y < CHUNK_H; y++) {
      for (let z = 0; z < CHUNK_W; z++) {
        for (let x = 0; x < CHUNK_W; x++) {
          const blockId = this.getBlock(x, y, z);
          if (blockId === 0) continue;
          const bdata = BLOCK_DATA[blockId];
          if (!bdata) continue;
          const isWater = bdata.liquid === true;

          for (const face of FACES) {
            const nx = x + face.dir[0];
            const ny = y + face.dir[1];
            const nz = z + face.dir[2];

            let neighborId;
            if (ny < 0 || ny >= CHUNK_H) {
              neighborId = 0;
            } else if (nx < 0 || nx >= CHUNK_W || nz < 0 || nz >= CHUNK_W) {
              const wx = this.cx * CHUNK_W + nx;
              const wz = this.cz * CHUNK_W + nz;
              neighborId = getWorldBlock(wx, ny, wz);
            } else {
              neighborId = this.getBlock(nx, ny, nz);
            }

            if (!isNeighborVisible(blockId, neighborId)) continue;

            // Get tile
            let tile;
            if (face.type === 'top') tile = bdata.top;
            else if (face.type === 'bottom') tile = bdata.bottom;
            else tile = bdata.side;
            if (!tile) continue;

            const { u0, u1, v0, v1 } = getTileUV(tile[0], tile[1]);
            const lv = face.light;

            if (isWater) {
              for (let i = 0; i < 4; i++) {
                const v = face.verts[i];
                wPos.push(x + v[0], y + (v[1] > 0 ? 0.9 : 0), z + v[2]); // water surface slightly lower
                wNrm.push(...face.norm);
                const uv = face.uvs[i];
                wUvs.push(uv[0] === 0 ? u0 : u1, uv[1] === 0 ? v0 : v1);
                wCol.push(lv, lv, lv);
              }
              wIdx.push(wVi, wVi+1, wVi+2, wVi, wVi+2, wVi+3);
              wVi += 4;
            } else {
              for (let i = 0; i < 4; i++) {
                const v = face.verts[i];
                oPos.push(x + v[0], y + v[1], z + v[2]);
                oNrm.push(...face.norm);
                const uv = face.uvs[i];
                oUvs.push(uv[0] === 0 ? u0 : u1, uv[1] === 0 ? v0 : v1);
                oCol.push(lv, lv, lv);
              }
              oIdx.push(oVi, oVi+1, oVi+2, oVi, oVi+2, oVi+3);
              oVi += 4;
            }
          }
        }
      }
    }

    if (this.mesh) { this.mesh.geometry.dispose(); this.mesh = null; }
    if (this.waterMesh) { this.waterMesh.geometry.dispose(); this.waterMesh = null; }

    if (oPos.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(oPos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(oNrm, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(oUvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(oCol, 3));
      geo.setIndex(oIdx);
      geo.computeBoundingSphere();
      this.mesh = new THREE.Mesh(geo, material);
      this.mesh.position.set(this.cx * CHUNK_W, 0, this.cz * CHUNK_W);
    }

    if (wPos.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(wNrm, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(wUvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(wCol, 3));
      geo.setIndex(wIdx);
      geo.computeBoundingSphere();
      this.waterMesh = new THREE.Mesh(geo, waterMaterial);
      this.waterMesh.position.set(this.cx * CHUNK_W, 0, this.cz * CHUNK_W);
    }

    this.dirty = false;
  }

  dispose() {
    if (this.mesh) { this.mesh.geometry.dispose(); this.mesh = null; }
    if (this.waterMesh) { this.waterMesh.geometry.dispose(); this.waterMesh = null; }
  }
}
