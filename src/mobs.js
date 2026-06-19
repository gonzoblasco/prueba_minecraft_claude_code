import * as THREE from 'three';
import { isSolid, BLOCK } from './blocks.js';

const DAY_TICKS_PER_SEC = 1 / 1200; // 20-min day

function lerp(a, b, t) { return a + (b - a) * t; }

class Mob {
  constructor(x, y, z, type) {
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.type = type;
    this.health = type === 'zombie' ? 20 : (type === 'skeleton' ? 20 : 10);
    this.maxHealth = this.health;
    this.alive = true;
    this.onGround = false;
    this.target = null;
    this.thinkTimer = Math.random() * 2;
    this.attackTimer = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.mesh = null;
    this._buildMesh();
  }

  _buildMesh() {
    const geo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const hostile = this.type === 'zombie' || this.type === 'skeleton';
    const color = this.type === 'zombie' ? 0x3a7a3a :
                  this.type === 'skeleton' ? 0xddddcc :
                  this.type === 'cow' ? 0x8b6344 :
                  this.type === 'pig' ? 0xf5a0a0 : 0xeeeeee;
    const mat = new THREE.MeshLambertMaterial({ color });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.pos);
    this.mesh.position.y += 0.9;

    // Head
    const headGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    const headMat = new THREE.MeshLambertMaterial({ color: color + 0x111111 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.2;
    this.mesh.add(head);
    this.headMesh = head;
  }

  update(dt, world, player, dayTime) {
    if (!this.alive) return;

    const isHostile = this.type === 'zombie' || this.type === 'skeleton';
    const isNight = dayTime < 0.25 || dayTime > 0.75;

    // Gravity
    this.vel.y -= 20 * dt;
    this.vel.y = Math.max(this.vel.y, -40);

    this.thinkTimer -= dt;
    if (this.thinkTimer <= 0) {
      this.thinkTimer = 0.5 + Math.random();

      if (isHostile && isNight) {
        const dist = this.pos.distanceTo(player.pos);
        if (dist < 20) {
          this.target = player;
        } else {
          this.target = null;
        }
      } else {
        this.target = null;
      }

      if (!this.target) {
        this.wanderAngle += (Math.random() - 0.5) * 1.2;
      }
    }

    // Movement
    let speed = isHostile ? 2.2 : 1.0;
    if (this.target) {
      const dir = new THREE.Vector3()
        .subVectors(this.target.pos, this.pos)
        .normalize();
      this.vel.x = dir.x * speed;
      this.vel.z = dir.z * speed;
      this.mesh.lookAt(this.target.pos.x, this.pos.y, this.target.pos.z);

      // Jump obstacles
      if (this.onGround) {
        const nx = Math.floor(this.pos.x + dir.x * 0.8);
        const nz = Math.floor(this.pos.z + dir.z * 0.8);
        if (isSolid(world.getBlock(nx, Math.floor(this.pos.y), nz))) {
          this.vel.y = 6;
        }
      }

      // Attack
      this.attackTimer -= dt;
      if (this.attackTimer <= 0 && this.target.pos.distanceTo(this.pos) < 2) {
        this.attackTimer = 1.5;
        this.target._damage?.(isHostile ? 3 : 2);
      }
    } else {
      this.vel.x = Math.cos(this.wanderAngle) * speed * 0.4;
      this.vel.z = Math.sin(this.wanderAngle) * speed * 0.4;
    }

    // Collision movement
    this.pos.x += this.vel.x * dt;
    const bx = Math.floor(this.pos.x);
    const by = Math.floor(this.pos.y);
    const bz = Math.floor(this.pos.z);
    if (isSolid(world.getBlock(bx, by, bz)) || isSolid(world.getBlock(bx, by + 1, bz))) {
      this.pos.x -= this.vel.x * dt; this.vel.x = 0;
    }

    this.pos.z += this.vel.z * dt;
    const bx2 = Math.floor(this.pos.x);
    const bz2 = Math.floor(this.pos.z);
    if (isSolid(world.getBlock(bx2, by, bz2)) || isSolid(world.getBlock(bx2, by + 1, bz2))) {
      this.pos.z -= this.vel.z * dt; this.vel.z = 0;
    }

    this.pos.y += this.vel.y * dt;
    const by2 = Math.floor(this.pos.y);
    if (isSolid(world.getBlock(Math.floor(this.pos.x), by2 - 1, Math.floor(this.pos.z)))) {
      this.pos.y = Math.ceil(this.pos.y - 0.1);
      this.vel.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    if (isSolid(world.getBlock(Math.floor(this.pos.x), by2 + 2, Math.floor(this.pos.z)))) {
      this.vel.y = 0;
    }

    // Burn in sunlight
    if (isHostile && !isNight && dayTime > 0.05 && dayTime < 0.95) {
      if (Math.random() < 0.01) this.health -= 1;
    }

    // Update mesh
    this.mesh.position.set(this.pos.x, this.pos.y + 0.9, this.pos.z);

    // Animate legs
    const legSpeed = (this.vel.x !== 0 || this.vel.z !== 0) ? 5 : 0;
    this.mesh.rotation.y = Math.atan2(this.vel.x, this.vel.z);

    if (this.health <= 0) {
      this.alive = false;
    }
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0) this.alive = false;
  }
}

export class MobManager {
  constructor(scene) {
    this.scene = scene;
    this.mobs = [];
    this.spawnTimer = 0;
  }

  update(dt, world, player, dayTime) {
    const isNight = dayTime < 0.25 || dayTime > 0.75;

    // Spawn
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 3 + Math.random() * 5;
      if (this.mobs.filter(m => m.alive).length < 20) {
        this._trySpawn(world, player, isNight);
      }
    }

    // Update and remove dead
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      const dist = mob.pos.distanceTo(player.pos);

      if (!mob.alive || dist > 80) {
        this.scene.remove(mob.mesh);
        mob.mesh.geometry.dispose();
        this.mobs.splice(i, 1);
        continue;
      }

      mob.update(dt, world, player, dayTime);
    }
  }

  _trySpawn(world, player, isNight) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 20;
    const spawnX = Math.floor(player.pos.x + Math.cos(angle) * dist);
    const spawnZ = Math.floor(player.pos.z + Math.sin(angle) * dist);
    const spawnY = world.getSurfaceY(spawnX, spawnZ);

    if (spawnY <= 0 || spawnY >= 126) return;

    const blockAbove = world.getBlock(spawnX, spawnY, spawnZ);
    if (blockAbove !== 0) return;

    let type;
    if (isNight && Math.random() < 0.6) {
      type = Math.random() < 0.5 ? 'zombie' : 'skeleton';
    } else {
      type = Math.random() < 0.5 ? 'cow' : 'pig';
    }

    const mob = new Mob(spawnX + 0.5, spawnY, spawnZ + 0.5, type);
    this.scene.add(mob.mesh);
    this.mobs.push(mob);
  }

  hitMob(pos, dir, player) {
    for (const mob of this.mobs) {
      if (!mob.alive) continue;
      const d = mob.pos.distanceTo(pos);
      if (d < 4) {
        const toMob = new THREE.Vector3().subVectors(mob.pos, pos).normalize();
        if (toMob.dot(dir) > 0.7) {
          mob.damage(4);
          mob.vel.set(dir.x * 6, 4, dir.z * 6);
          return true;
        }
      }
    }
    return false;
  }
}
