import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { HUD } from './hud.js';
import { MobManager } from './mobs.js';
import { AudioManager } from './audio.js';
import { BLOCK, BLOCK_DATA } from './blocks.js';

const DAY_DURATION = 1200;

function lerp(a, b, t) { return a + (b - a) * t; }

export class Game {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.world = null;
    this.player = null;
    this.hud = null;
    this.mobs = null;
    this.audio = null;
    this.clock = new THREE.Clock();
    this.dayTime = 0.3;
    this.showDebug = false;
    this.inventoryOpen = false;
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.stepTimer = 0;
    this.pointerLocked = false;
    this._selectionBox = null;
    this._initialized = false;
  }

  async init() {
    this._setupRenderer();
    this._setupScene();
    this.world = new World(this.scene);
    this.player = new Player(this.camera, this.world);
    this.hud = new HUD(document.body);
    this.mobs = new MobManager(this.scene);
    this.audio = new AudioManager();
    this._setupControls();
    this._setupPointerLock();
    this._buildSelectionBox();

    // Pre-generate spawn area chunks synchronously
    for (let i = 0; i < 80; i++) {
      this.world.update(8, 8);
    }

    // Place player on surface
    const sy = this.world.getSurfaceY(8, 8);
    this.player.pos.set(8.5, sy, 8.5);
    this.player.lastGroundY = this.player.pos.y;

    // Set HUD atlas
    this.hud.setAtlas(this.world.atlasCanvas);

    // Sky
    this._updateDayNight(0);

    this._initialized = true;
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      canvas: document.getElementById('game-canvas')
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = false;

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 150);
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);
    this.sunLight = new THREE.DirectionalLight(0xfff8e0, 1.0);
    this.sunLight.position.set(60, 90, 40);
    this.scene.add(this.sunLight);
    this.scene.background = new THREE.Color(0x87ceeb);
  }

  _buildSelectionBox() {
    const geo = new THREE.BoxGeometry(1.003, 1.003, 1.003);
    const edges = new THREE.EdgesGeometry(geo);
    geo.dispose();
    const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, transparent: true, opacity: 0.6 });
    this._selectionBox = new THREE.LineSegments(edges, mat);
    this._selectionBox.visible = false;
    this.scene.add(this._selectionBox);
  }

  _setupControls() {
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyE') {
        this.inventoryOpen = !this.inventoryOpen;
        this.hud.toggleInventory(this.inventoryOpen, this.player);
        if (this.inventoryOpen) document.exitPointerLock();
        else document.getElementById('game-canvas').requestPointerLock();
      }
      if (e.code === 'F3') this.showDebug = !this.showDebug;
      if (e.code === 'Escape') {
        this.inventoryOpen = false;
        this.hud.toggleInventory(false, this.player);
      }
    });

    document.addEventListener('wheel', e => {
      if (!this.inventoryOpen && this.pointerLocked) {
        this.player.scrollHotbar(e.deltaY);
      }
    });

    document.addEventListener('mousedown', e => {
      this.audio.resume();
      if (!this.pointerLocked || this.inventoryOpen) return;
      if (e.button === 0) this.player.breakingBlock = true;
      if (e.button === 2) this._placeBlock();
    });

    document.addEventListener('mouseup', e => {
      if (e.button === 0) {
        this.player.breakingBlock = false;
        this.player.breakProgress = 0;
        this.player.breakTarget = null;
      }
    });

    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  _setupPointerLock() {
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', () => {
      if (!this.inventoryOpen) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = !!document.pointerLockElement;
      document.getElementById('lock-msg').style.display = this.pointerLocked ? 'none' : 'flex';
    });
  }

  _placeBlock() {
    const eye = this.player.getEyePos();
    const dir = this.player.getLookDir();
    const ray = this.world.raycast(eye, dir, 5);
    if (!ray.hit) return;

    const { prevX, prevY, prevZ } = ray;

    // Don't place inside player
    const px = Math.floor(this.player.pos.x), pz = Math.floor(this.player.pos.z);
    const py = this.player.pos.y;
    if (prevX === px && prevZ === pz && prevY >= Math.floor(py) && prevY <= Math.floor(py + 1.8)) return;

    const blockId = this.player.hotbar[this.player.hotbarIdx];
    if (!blockId) return;
    this.world.setBlock(prevX, prevY, prevZ, blockId);
    this.audio.playPlace();
  }

  _breakBlock(dt) {
    if (!this.player.breakingBlock) {
      this.player.breakProgress = 0;
      this._breakOverlay(0);
      return;
    }

    const eye = this.player.getEyePos();
    const dir = this.player.getLookDir();
    const ray = this.world.raycast(eye, dir, 5);

    if (!ray.hit) { this.player.breakProgress = 0; this._breakOverlay(0); return; }

    const key = `${ray.blockX},${ray.blockY},${ray.blockZ}`;
    if (this.player.breakTarget !== key) {
      this.player.breakTarget = key;
      this.player.breakProgress = 0;
    }

    const blockId = this.world.getBlock(ray.blockX, ray.blockY, ray.blockZ);
    const bdata = BLOCK_DATA[blockId];
    if (!bdata || bdata.hardness < 0) return;

    const breakTime = Math.max(0.1, bdata.hardness * 1.5);
    this.player.breakProgress += dt / breakTime;
    this._breakOverlay(this.player.breakProgress);

    if (this.player.breakProgress >= 1) {
      const drop = bdata.drop !== undefined ? bdata.drop : blockId;
      if (drop) this.player.addToInventory(drop);
      this.world.setBlock(ray.blockX, ray.blockY, ray.blockZ, BLOCK.AIR);
      this.audio.playBreak();
      this.player.xp++;
      this.player.breakProgress = 0;
      this.player.breakTarget = null;
      this._breakOverlay(0);
    }
  }

  _breakOverlay(progress) {
    let el = document.getElementById('break-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'break-overlay';
      el.style.cssText = 'position:fixed;bottom:50px;left:50%;transform:translateX(-50%);width:100px;height:6px;background:#333;border:1px solid #555;display:none;z-index:50;';
      const bar = document.createElement('div');
      bar.style.cssText = 'height:100%;background:#e44;width:0%;';
      el.appendChild(bar);
      document.body.appendChild(el);
    }
    if (progress > 0) {
      el.style.display = 'block';
      el.firstChild.style.width = (Math.min(1, progress) * 100) + '%';
    } else {
      el.style.display = 'none';
    }
  }

  _updateDayNight(dt) {
    this.dayTime = (this.dayTime + dt / DAY_DURATION) % 1;
    const t = this.dayTime;

    let sr, sg, sb, amb, sun;

    if (t < 0.05) {
      // Before sunrise
      const n = t / 0.05;
      sr = lerp(5, 80, n); sg = lerp(5, 80, n); sb = lerp(15, 120, n);
      amb = lerp(0.07, 0.25, n); sun = lerp(0, 0.2, n);
    } else if (t < 0.15) {
      // Sunrise
      const n = (t - 0.05) / 0.1;
      sr = lerp(80, 135, n); sg = lerp(80, 206, n); sb = lerp(120, 235, n);
      amb = lerp(0.25, 0.7, n); sun = lerp(0.2, 1.0, n);
    } else if (t < 0.85) {
      // Day
      sr = 135; sg = 206; sb = 235;
      amb = 0.65; sun = 1.0;
    } else if (t < 0.95) {
      // Sunset
      const n = (t - 0.85) / 0.1;
      sr = lerp(135, 80, n) + n * 80; sg = lerp(206, 60, n); sb = lerp(235, 40, n);
      amb = lerp(0.65, 0.15, n); sun = lerp(1.0, 0.05, n);
    } else {
      // Night
      const n = (t - 0.95) / 0.05;
      sr = lerp(80, 5, n); sg = lerp(60, 5, n); sb = lerp(40, 15, n);
      amb = lerp(0.15, 0.07, n); sun = lerp(0.05, 0, n);
    }

    this.scene.background.setRGB(sr/255, sg/255, sb/255);
    this.scene.fog.color.setRGB(sr/255, sg/255, sb/255);
    this.ambientLight.intensity = amb;
    this.sunLight.intensity = sun;

    const angle = t * Math.PI * 2 - Math.PI / 2;
    this.sunLight.position.set(Math.cos(angle) * 100, Math.sin(angle) * 100, 20);
  }

  _updateSelectionBox() {
    if (!this.player.alive) { this._selectionBox.visible = false; return; }
    const eye = this.player.getEyePos();
    const dir = this.player.getLookDir();
    const ray = this.world.raycast(eye, dir, 5);
    if (ray.hit) {
      this._selectionBox.position.set(ray.blockX + 0.5, ray.blockY + 0.5, ray.blockZ + 0.5);
      this._selectionBox.visible = true;
    } else {
      this._selectionBox.visible = false;
    }
  }

  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this._initialized) { requestAnimationFrame(() => this.loop()); return; }

    this.world.update(this.player.pos.x, this.player.pos.z);
    this.player.update(dt, this.world);
    this._breakBlock(dt);
    this.mobs.update(dt, this.world, this.player, this.dayTime);
    this._updateDayNight(dt);
    this._updateSelectionBox();

    // Footsteps
    if (this.player.onGround && (Math.abs(this.player.vel.x) > 0.1 || Math.abs(this.player.vel.z) > 0.1)) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) { this.audio.playStep(); this.stepTimer = 0.35; }
    }

    // FPS counter
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer > 1) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0; this.fpsTimer = 0;
    }

    this.hud.update(this.player, this.world, dt);
    this.hud.updateDebug(this.showDebug, this.player, this.world, this.fps);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.loop());
  }
}
