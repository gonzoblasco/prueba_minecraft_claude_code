import { BLOCK, BLOCK_DATA } from './blocks.js';

// Renders the complete Minecraft HUD using DOM + Canvas
export class HUD {
  constructor(container) {
    this.container = container;
    this._build();
    this._atlasCanvas = null;
    this._atlasCtx = null;
  }

  setAtlas(atlasCanvas) {
    this._atlasCanvas = atlasCanvas;
    this._atlasCtx = atlasCanvas.getContext('2d');
    this._drawHotbarIcons();
  }

  _build() {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.style.cssText = `position:fixed;inset:0;pointer-events:none;font-family:'Courier New',monospace;image-rendering:pixelated;`;
    this.container.appendChild(hud);
    this.hud = hud;

    // Crosshair
    const cross = document.createElement('div');
    cross.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:18px;height:18px;
    `;
    cross.innerHTML = `<svg width="18" height="18"><line x1="9" y1="0" x2="9" y2="18" stroke="white" stroke-width="2" opacity="0.7"/><line x1="0" y1="9" x2="18" y2="9" stroke="white" stroke-width="2" opacity="0.7"/><line x1="9" y1="0" x2="9" y2="18" stroke="black" stroke-width="4" opacity="0.3"/><line x1="0" y1="9" x2="18" y2="9" stroke="black" stroke-width="4" opacity="0.3"/></svg>`;
    hud.appendChild(cross);

    // Bottom center area
    const bottom = document.createElement('div');
    bottom.style.cssText = `position:absolute;bottom:0;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;padding-bottom:4px;`;
    hud.appendChild(bottom);

    // Health row
    const healthRow = document.createElement('div');
    healthRow.style.cssText = `display:flex;gap:1px;margin-bottom:2px;align-self:flex-start;margin-left:2px;`;
    bottom.appendChild(healthRow);
    this.healthRow = healthRow;

    // Hunger row
    const hungerRow = document.createElement('div');
    hungerRow.style.cssText = `display:flex;gap:1px;margin-bottom:2px;align-self:flex-end;margin-right:2px;flex-direction:row-reverse;`;
    bottom.appendChild(hungerRow);
    this.hungerRow = hungerRow;

    // Hotbar
    const hotbar = document.createElement('div');
    hotbar.style.cssText = `display:flex;gap:0px;`;
    bottom.appendChild(hotbar);
    this.hotbarEl = hotbar;

    this.slots = [];
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width:40px;height:40px;border:2px solid #555;background:rgba(80,80,80,0.85);
        position:relative;box-sizing:border-box;display:flex;align-items:center;justify-content:center;
      `;
      const canvas = document.createElement('canvas');
      canvas.width = 32; canvas.height = 32;
      canvas.style.cssText = `width:32px;height:32px;image-rendering:pixelated;`;
      slot.appendChild(canvas);
      const count = document.createElement('span');
      count.style.cssText = `position:absolute;bottom:1px;right:3px;color:white;font-size:10px;text-shadow:1px 1px 0 #000;font-weight:bold;`;
      slot.appendChild(count);
      hotbar.appendChild(slot);
      this.slots.push({ el: slot, canvas, count });
    }

    // XP bar
    const xpOuter = document.createElement('div');
    xpOuter.style.cssText = `width:360px;height:5px;background:#333;margin-bottom:2px;`;
    const xpInner = document.createElement('div');
    xpInner.style.cssText = `height:100%;width:0%;background:#7dff00;transition:width 0.2s;`;
    xpOuter.appendChild(xpInner);
    bottom.insertBefore(xpOuter, hotbar);
    this.xpBar = xpInner;
    this.xpLevel = null;

    // Breath bubbles (hidden by default)
    const breathRow = document.createElement('div');
    breathRow.style.cssText = `display:flex;gap:1px;margin-bottom:1px;`;
    bottom.insertBefore(breathRow, healthRow);
    this.breathRow = breathRow;

    // Debug / block selection label
    const label = document.createElement('div');
    label.style.cssText = `position:absolute;top:8px;left:8px;color:white;font-size:12px;text-shadow:1px 1px 0 #000;background:rgba(0,0,0,0.3);padding:4px 6px;border-radius:2px;`;
    hud.appendChild(label);
    this.label = label;

    // F3 Debug overlay
    const debug = document.createElement('div');
    debug.style.cssText = `position:absolute;top:8px;left:8px;color:white;font-size:11px;text-shadow:1px 1px 0 #000;display:none;line-height:1.5;`;
    hud.appendChild(debug);
    this.debugEl = debug;

    // Damage vignette
    const vignette = document.createElement('div');
    vignette.style.cssText = `position:absolute;inset:0;background:radial-gradient(ellipse at center, transparent 50%, rgba(255,0,0,0.5) 100%);opacity:0;transition:opacity 0.1s;pointer-events:none;`;
    hud.appendChild(vignette);
    this.vignetteEl = vignette;

    // Inventory overlay
    this._buildInventory();
  }

  _buildInventory() {
    const inv = document.createElement('div');
    inv.style.cssText = `
      position:fixed;inset:0;display:none;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.5);pointer-events:auto;z-index:100;
    `;
    this.container.appendChild(inv);
    this.inventoryEl = inv;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:#c6c6c6;border:2px solid #555;padding:12px;
      font-family:'Courier New',monospace;font-size:12px;color:#333;
      image-rendering:pixelated;
    `;
    inv.appendChild(panel);

    panel.innerHTML = `
      <div style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:8px;color:#333;">Inventory</div>
      <div id="inv-crafting" style="margin-bottom:8px;">
        <div style="font-size:11px;margin-bottom:4px;">Crafting</div>
        <div style="display:flex;gap:4px;align-items:center;">
          <div id="inv-craft-grid" style="display:grid;grid-template-columns:repeat(2,40px);gap:2px;"></div>
          <div style="font-size:20px;margin:0 8px;">→</div>
          <div id="inv-craft-result" style="width:40px;height:40px;border:2px solid #777;background:#8b8b8b;"></div>
        </div>
      </div>
      <div id="inv-slots" style="display:grid;grid-template-columns:repeat(9,40px);gap:2px;margin-bottom:8px;"></div>
      <div id="inv-hotbar-slots" style="display:grid;grid-template-columns:repeat(9,40px);gap:2px;"></div>
    `;

    this.invSlotsEl = panel.querySelector('#inv-slots');
    this.invHotbarEl = panel.querySelector('#inv-hotbar-slots');
    this._buildInvSlots();
  }

  _buildInvSlots() {
    this.invSlots = [];
    for (let i = 0; i < 27; i++) {
      const s = this._makeInvSlot();
      this.invSlotsEl.appendChild(s.el);
      this.invSlots.push(s);
    }
    this.invHotbarSlots = [];
    for (let i = 0; i < 9; i++) {
      const s = this._makeInvSlot();
      this.invHotbarEl.appendChild(s.el);
      this.invHotbarSlots.push(s);
    }
  }

  _makeInvSlot() {
    const el = document.createElement('div');
    el.style.cssText = `width:40px;height:40px;border:2px solid #777;background:#8b8b8b;position:relative;box-sizing:border-box;cursor:pointer;`;
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    canvas.style.cssText = `width:32px;height:32px;display:block;margin:2px;image-rendering:pixelated;`;
    el.appendChild(canvas);
    const count = document.createElement('span');
    count.style.cssText = `position:absolute;bottom:1px;right:3px;color:white;font-size:10px;text-shadow:1px 1px 0 #000;font-weight:bold;`;
    el.appendChild(count);
    return { el, canvas, count };
  }

  _drawBlockIcon(canvas, blockId) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    if (!blockId || blockId === 0 || !this._atlasCanvas) return;
    const bdata = BLOCK_DATA[blockId];
    if (!bdata || !bdata.top) return;

    // Draw a simple isometric-ish block icon
    const TILE = 16;
    const ATLAS = 256;

    const drawFace = (tile, destX, destY, destW, destH, brightness) => {
      const sx = tile[0] * TILE, sy = tile[1] * TILE;
      ctx.globalAlpha = brightness;
      ctx.drawImage(this._atlasCanvas, sx, sy, TILE, TILE, destX, destY, destW, destH);
      ctx.globalAlpha = 1;
    };

    // Top face
    drawFace(bdata.top, 4, 0, 24, 12, 1.0);
    // Left face (side)
    drawFace(bdata.side, 0, 8, 16, 20, 0.75);
    // Right face (side)
    drawFace(bdata.side, 16, 8, 16, 20, 0.6);
  }

  update(player, world, dt) {
    // Health hearts
    const hearts = player.health;
    const maxHearts = player.maxHealth;
    this.healthRow.innerHTML = '';
    for (let i = 0; i < maxHearts / 2; i++) {
      const full = hearts >= (i + 1) * 2;
      const half = !full && hearts >= i * 2 + 1;
      const span = document.createElement('span');
      span.style.cssText = `font-size:14px;line-height:1;`;
      span.textContent = full ? '❤' : (half ? '❥' : '♡');
      span.style.color = full ? '#ff0000' : (half ? '#ff6666' : '#666');
      this.healthRow.appendChild(span);
    }

    // Hunger
    this.hungerRow.innerHTML = '';
    for (let i = 0; i < player.maxHunger / 2; i++) {
      const full = player.hunger >= (i + 1) * 2;
      const half = !full && player.hunger >= i * 2 + 1;
      const span = document.createElement('span');
      span.style.cssText = `font-size:14px;line-height:1;`;
      span.textContent = full ? '🍖' : '🦴';
      span.style.color = full ? '#cc8800' : (half ? '#aa6600' : '#555');
      this.hungerRow.appendChild(span);
    }

    // Hotbar selection
    for (let i = 0; i < 9; i++) {
      const s = this.slots[i];
      const selected = i === player.hotbarIdx;
      s.el.style.borderColor = selected ? '#fff' : '#555';
      s.el.style.borderWidth = selected ? '3px' : '2px';
      const blockId = player.hotbar[i];
      if (blockId) this._drawBlockIcon(s.canvas, blockId);
      s.count.textContent = '';
    }

    // XP bar
    const xpFrac = Math.min(1, player.xp / Math.max(1, (player.xpLevel + 1) * 10));
    this.xpBar.style.width = (xpFrac * 100) + '%';

    // Block name label
    const blockId = player.hotbar[player.hotbarIdx];
    const bdata = BLOCK_DATA[blockId];
    this.label.textContent = bdata ? bdata.name : '';

    // Damage flash
    if (player.invincibleTime > 0 && player.health < player.maxHealth) {
      this.vignetteEl.style.opacity = Math.min(1, player.invincibleTime * 2) * 0.7;
    } else {
      this.vignetteEl.style.opacity = 0;
    }

    // Break progress indicator (shown on crosshair)
    if (player.breakProgress > 0) {
      this.crossProgress = player.breakProgress;
    } else {
      this.crossProgress = 0;
    }
  }

  showDamage() {
    this.vignetteEl.style.opacity = 0.8;
  }

  toggleInventory(show, player) {
    this.inventoryEl.style.display = show ? 'flex' : 'none';
    if (show) this._refreshInventory(player);
  }

  _refreshInventory(player) {
    for (let i = 0; i < 27; i++) {
      const slot = player.inventory[i + 9];
      this._drawBlockIcon(this.invSlots[i].canvas, slot?.id || 0);
      this.invSlots[i].count.textContent = slot?.count > 1 ? slot.count : '';
    }
    for (let i = 0; i < 9; i++) {
      const id = player.hotbar[i];
      this._drawBlockIcon(this.invHotbarSlots[i].canvas, id);
    }
  }

  updateDebug(show, player, world, fps) {
    if (!show) { this.debugEl.style.display = 'none'; this.label.style.display = ''; return; }
    this.label.style.display = 'none';
    this.debugEl.style.display = 'block';
    const p = player.pos;
    this.debugEl.innerHTML = `
      FPS: ${fps}<br>
      XYZ: ${p.x.toFixed(2)} / ${p.y.toFixed(2)} / ${p.z.toFixed(2)}<br>
      Chunk: ${Math.floor(p.x/16)} / ${Math.floor(p.z/16)}<br>
      Health: ${player.health}/${player.maxHealth}<br>
      Hunger: ${player.hunger}/${player.maxHunger}<br>
      Ground: ${player.onGround}<br>
      Water: ${player.inWater}
    `;
  }

  _drawHotbarIcons() {
    for (let i = 0; i < 9; i++) this._drawBlockIcon(this.slots[i].canvas, 0);
  }
}
