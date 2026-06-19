import * as THREE from 'three';
import { BLOCK, BLOCK_DATA, isSolid } from './blocks.js';

const GRAVITY = -22;
const JUMP_FORCE = 8;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 5.6;
const SNEAK_SPEED = 1.3;
const W = 0.3;  // half-width of player AABB
const H = 1.8;  // player height
const EYE_H = 1.62;

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.pos = new THREE.Vector3(8, 80, 8);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.onGround = false;
    this.inWater = false;
    this.sneaking = false;
    this.sprinting = false;
    this.health = 20; this.maxHealth = 20;
    this.hunger = 20; this.maxHunger = 20;
    this.xp = 0; this.xpLevel = 0;
    this.alive = true;
    this.respawnTimer = 0;
    this.invincibleTime = 0;
    this.foodTimer = 0;
    this.hungerTimer = 0;
    this.lastGroundY = 80;
    this.breakProgress = 0;
    this.breakTarget = null;
    this.breakingBlock = false;
    this.hotbar = [
      BLOCK.GRASS, BLOCK.STONE, BLOCK.WOOD, BLOCK.PLANKS, BLOCK.TORCH,
      BLOCK.SAND, BLOCK.GLASS, BLOCK.COBBLESTONE, BLOCK.CRAFTING
    ];
    this.hotbarIdx = 0;
    this.inventory = Array.from({length: 36}, () => ({ id: 0, count: 0 }));
    this.keys = {};
    this.pitch = 0;
    this.yaw = 0;
    this.mouseDx = 0;
    this.mouseDy = 0;
    this._setupInput();
  }

  _setupInput() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && this.onGround && !this.inWater) {
        this.vel.y = JUMP_FORCE;
        this.onGround = false;
      }
      for (let i = 1; i <= 9; i++) {
        if (e.code === `Digit${i}`) this.hotbarIdx = i - 1;
      }
    });
    document.addEventListener('keyup', e => { delete this.keys[e.code]; });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        this.mouseDx += e.movementX;
        this.mouseDy += e.movementY;
      }
    });
  }

  getEyePos() {
    return new THREE.Vector3(this.pos.x, this.pos.y + EYE_H, this.pos.z);
  }

  getLookDir() {
    return new THREE.Vector3(
      -Math.sin(this.yaw + Math.PI) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw + Math.PI) * Math.cos(this.pitch)
    ).normalize();
  }

  update(dt, world) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this._respawn(world);
      return;
    }

    // Mouse look
    this.yaw += this.mouseDx * 0.002;
    this.pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, this.pitch - this.mouseDy * 0.002));
    this.mouseDx = 0; this.mouseDy = 0;

    // Update camera
    this.camera.position.set(this.pos.x, this.pos.y + EYE_H, this.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + Math.PI;
    this.camera.rotation.x = this.pitch;

    // Water check
    this.inWater = world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.5), Math.floor(this.pos.z)) === BLOCK.WATER;

    // Horizontal movement
    this.sprinting = this.keys['ControlLeft'] && !this.sneaking;
    this.sneaking = this.keys['ShiftLeft'] && !this.inWater;
    const speed = this.sprinting ? SPRINT_SPEED : (this.sneaking ? SNEAK_SPEED : WALK_SPEED);

    const sinY = Math.sin(this.yaw + Math.PI);
    const cosY = Math.cos(this.yaw + Math.PI);
    const fw = { x: -sinY, z: -cosY };
    const rt = { x: cosY, z: -sinY };

    let mx = 0, mz = 0;
    if (this.keys['KeyW']) { mx += fw.x; mz += fw.z; }
    if (this.keys['KeyS']) { mx -= fw.x; mz -= fw.z; }
    if (this.keys['KeyA']) { mx -= rt.x; mz -= rt.z; }
    if (this.keys['KeyD']) { mx += rt.x; mz += rt.z; }
    const mlen = Math.sqrt(mx*mx + mz*mz);
    if (mlen > 0) { mx = mx/mlen*speed; mz = mz/mlen*speed; }

    if (this.inWater) {
      this.vel.x = mx;
      this.vel.z = mz;
      this.vel.y *= 0.85;
      if (this.keys['Space']) this.vel.y = 2.5;
      if (this.keys['ShiftLeft']) this.vel.y = -2.5;
      this.vel.y += GRAVITY * 0.12 * dt;
    } else {
      this.vel.x = mx;
      this.vel.z = mz;
      this.vel.y = Math.max(this.vel.y + GRAVITY * dt, -40);
    }

    // Move and collide
    const STEPS = 4;
    const sdt = dt / STEPS;
    for (let s = 0; s < STEPS; s++) {
      // X
      this.pos.x += this.vel.x * sdt;
      if (this._collidesXZ(world, this.pos.x, this.pos.y, this.pos.z, 'x')) {
        this.pos.x -= this.vel.x * sdt;
        this.vel.x = 0;
      }
      // Z
      this.pos.z += this.vel.z * sdt;
      if (this._collidesXZ(world, this.pos.x, this.pos.y, this.pos.z, 'z')) {
        this.pos.z -= this.vel.z * sdt;
        this.vel.z = 0;
      }
      // Y
      this.pos.y += this.vel.y * sdt;
      if (this.vel.y <= 0) {
        // Falling - check ground
        if (this._collidesFloor(world)) {
          // Snap to top of block we're inside
          const blockY = Math.floor(this.pos.y);
          this.pos.y = blockY + 1.0;
          if (this.vel.y < -3 && !this.inWater) {
            const fallen = this.lastGroundY - this.pos.y;
            if (fallen > 3.5) this._damage(Math.floor(fallen - 3.5));
          }
          this.onGround = true;
          this.lastGroundY = this.pos.y;
          this.vel.y = 0;
        } else {
          this.onGround = false;
        }
      } else {
        // Rising - check ceiling
        if (this._collidesHead(world)) {
          this.pos.y -= this.vel.y * sdt;
          this.vel.y = 0;
        }
      }
    }

    // Kill if out of world
    if (this.pos.y < -20) this._damage(999);

    // Hunger
    this.hungerTimer += dt;
    if (this.hungerTimer > 30) {
      this.hungerTimer = 0;
      if (this.hunger > 0) this.hunger--;
    }

    // Regen
    if (this.hunger >= 18) {
      this.foodTimer += dt;
      if (this.foodTimer > 1 && this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + 1);
        this.foodTimer = 0;
      }
    } else this.foodTimer = 0;

    if (this.invincibleTime > 0) this.invincibleTime -= dt;
    if (this.health <= 0) { this.alive = false; this.respawnTimer = 3; }
  }

  // Check if player AABB overlaps solid blocks in XZ plane (not Y)
  _collidesXZ(world, px, py, pz, axis) {
    // Check all blocks the player occupies
    const corners = [
      [px - W, pz - W], [px + W, pz - W],
      [px - W, pz + W], [px + W, pz + W],
    ];
    for (let yOff = 0; yOff < H; yOff += 0.5) {
      const y = Math.floor(py + yOff);
      for (const [cx, cz] of corners) {
        if (isSolid(world.getBlock(Math.floor(cx), y, Math.floor(cz)))) return true;
      }
    }
    // Also check top
    const y = Math.floor(py + H - 0.01);
    for (const [cx, cz] of corners) {
      if (isSolid(world.getBlock(Math.floor(cx), y, Math.floor(cz)))) return true;
    }
    return false;
  }

  _collidesFloor(world) {
    const y = Math.floor(this.pos.y - 0.001);
    const corners = [
      [this.pos.x - W, this.pos.z - W], [this.pos.x + W, this.pos.z - W],
      [this.pos.x - W, this.pos.z + W], [this.pos.x + W, this.pos.z + W],
    ];
    for (const [cx, cz] of corners) {
      if (isSolid(world.getBlock(Math.floor(cx), y, Math.floor(cz)))) return true;
    }
    return false;
  }

  _collidesHead(world) {
    const y = Math.floor(this.pos.y + H);
    const corners = [
      [this.pos.x - W, this.pos.z - W], [this.pos.x + W, this.pos.z - W],
      [this.pos.x - W, this.pos.z + W], [this.pos.x + W, this.pos.z + W],
    ];
    for (const [cx, cz] of corners) {
      if (isSolid(world.getBlock(Math.floor(cx), y, Math.floor(cz)))) return true;
    }
    return false;
  }

  _damage(amount) {
    if (this.invincibleTime > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invincibleTime = 0.5;
  }

  _respawn(world) {
    this.pos.set(8, world.getSurfaceY(8, 8) + 1, 8);
    this.vel.set(0, 0, 0);
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.alive = true;
    this.invincibleTime = 3;
    this.onGround = false;
    this.lastGroundY = this.pos.y;
  }

  addToInventory(blockId, count = 1) {
    for (let i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i].id === blockId && this.inventory[i].count < 64) {
        this.inventory[i].count = Math.min(64, this.inventory[i].count + count);
        return true;
      }
    }
    for (let i = 0; i < this.inventory.length; i++) {
      if (!this.inventory[i].id || this.inventory[i].count === 0) {
        this.inventory[i] = { id: blockId, count };
        return true;
      }
    }
    return false;
  }

  getHotbarItem() { return this.hotbar[this.hotbarIdx]; }

  scrollHotbar(delta) {
    this.hotbarIdx = ((this.hotbarIdx + (delta > 0 ? 1 : -1)) + 9) % 9;
  }
}
