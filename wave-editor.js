// ─── WAVE EDITOR ───
const weState = {
    open: false,
    scenario: null,
    currentWave: 0,
    selectedTool: null, // { type: 'enemy'|'terrain'|'boss'|'pickup'|'tree'|'erase', value: string }
    panX: 0, panY: 0,
    zoom: 0.15,
    dragging: false,
    dragStartX: 0, dragStartY: 0,
    dragPanX: 0, dragPanY: 0,
    painting: false,
    frame: 0, // local animation counter (independent of game loop)
};

// Sidebar color swatches only — rendering uses actual tile code
const WE_TERRAIN_COLORS = {
    grass1: '#2d5a1e', grass2: '#3a6b2b', stone: '#607d8b', dirt: '#8d6e63',
    water: '#1565c0', lava: '#bf360c', flower: '#e040fb', void: '#111111',
    sand: '#c8aa7a', bridge: '#7b4e20'
};
const WE_TERRAIN_TYPES = ['grass1','grass2','stone','dirt','water','lava','flower','void','sand','bridge'];

function weNewScenario() {
    return {
        version: 1, difficulty: 'normal', terrainOverrides: {},
        trees: [],
        waves: [{ condition: 'killAll', surviveSecs: 60, enemies: [], bosses: [], pickups: [] }]
    };
}

// ── DOM build ────────────────────────────────────────────────────────────────
function _weBuildDOM() {
    const el = document.createElement('div');
    el.id = 'wave-editor-overlay';
    el.className = 'hidden';
    el.style.cssText = 'position:absolute;inset:0;z-index:600;background:#111;display:flex;flex-direction:column;font-family:monospace;';
    el.innerHTML = `
<div id="we-topbar" style="height:48px;background:#1a1a2e;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:2px solid #333;flex-shrink:0;">
  <span style="color:#a0a0ff;font-size:11px;letter-spacing:2px;margin-right:4px;">WAVE EDITOR</span>
  <div id="we-wave-tabs" style="display:flex;gap:4px;flex:1;overflow-x:auto;"></div>
  <button class="we-topbtn" id="we-add-wave-btn" onclick="weAddWave()">+ Wave</button>
  <select id="we-diff-select" style="background:#222;color:#ccc;border:1px solid #444;padding:3px 6px;font-family:monospace;font-size:10px;">
    <option value="easy">EASY</option><option value="normal" selected>NORMAL</option>
    <option value="hard">HARD</option><option value="extreme">EXTREME</option>
  </select>
  <button class="we-topbtn we-play" id="we-play-btn" onclick="weStartGame()">&#9654; PLAY</button>
  <button class="we-topbtn" id="we-export-btn" onclick="weExport()">EXPORT</button>
  <button class="we-topbtn" id="we-import-btn" onclick="weImportPrompt()">IMPORT</button>
  <button class="we-topbtn we-close" id="we-close-btn" onclick="weCloseEditor()">&#x2715;</button>
</div>
<div id="we-main" style="flex:1;display:flex;min-height:0;overflow:hidden;">
  <canvas id="we-canvas" style="flex:1;cursor:crosshair;display:block;min-width:0;height:100%;background:#0a0a0a;"></canvas>
  <div id="we-sidebar" style="width:210px;flex-shrink:0;background:#181828;border-left:2px solid #333;display:flex;flex-direction:column;overflow:hidden;">
    <div id="we-tabs" style="display:flex;border-bottom:1px solid #333;">
      <button class="we-tab we-tab-active" onclick="weSelectTab('enemies')">Enemy</button>
      <button class="we-tab" onclick="weSelectTab('terrain')">Terrain</button>
      <button class="we-tab" onclick="weSelectTab('bosses')">Boss</button>
      <button class="we-tab" onclick="weSelectTab('other')">Other</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:6px;" id="we-panel-content"></div>
  </div>
</div>
<div id="we-json-modal" class="hidden" style="position:absolute;inset:0;z-index:700;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
  <textarea id="we-json-text" style="width:500px;height:200px;font-family:monospace;font-size:11px;background:#1a1a2e;color:#ccc;border:1px solid #555;padding:8px;" spellcheck="false"></textarea>
  <div style="display:flex;gap:8px;">
    <button class="we-topbtn we-play" id="we-json-ok">OK</button>
    <button class="we-topbtn we-close" onclick="document.getElementById('we-json-modal').classList.add('hidden')">Cancel</button>
  </div>
</div>`;
    (document.getElementById('game-container') || document.body).appendChild(el);

    const style = document.createElement('style');
    style.textContent = `
#we-canvas{background:#0a0a0a;}
.we-topbtn{background:#2a2a4a;color:#ccc;border:1px solid #444;padding:4px 10px;font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:1px;}
.we-topbtn:hover{background:#3a3a6a;}
.we-play{border-color:#4caf50;color:#4caf50;}.we-play:hover{background:#1b5e20;}
.we-close{border-color:#e53935;color:#e53935;}.we-close:hover{background:#4a0000;}
.we-tab{flex:1;background:#181828;color:#888;border:none;border-right:1px solid #333;padding:6px 2px;font-size:9px;font-family:monospace;cursor:pointer;letter-spacing:1px;}
.we-tab:hover{color:#ccc;}.we-tab-active{color:#a0a0ff;border-bottom:2px solid #a0a0ff;}
.we-wave-tab{background:#222;color:#aaa;border:1px solid #444;padding:3px 8px;font-family:monospace;font-size:9px;cursor:pointer;}
.we-wave-tab:hover{background:#333;}.we-wave-tab.we-wave-active{background:#2a2a5a;color:#a0a0ff;border-color:#a0a0ff;}
.we-item-btn{display:block;width:100%;background:#1a1a2e;color:#bbb;border:1px solid #333;padding:5px 8px;font-family:monospace;font-size:9px;cursor:pointer;margin-bottom:3px;text-align:left;}
.we-item-btn:hover{background:#2a2a4a;}.we-item-btn.we-selected{border-color:#a0a0ff;color:#a0a0ff;background:#1a1a3e;}
.we-erase-btn{border-color:#e57373!important;color:#e57373!important;}.we-erase-btn.we-selected{background:#3a1010!important;}`;
    document.head.appendChild(style);

    const cvs = document.getElementById('we-canvas');
    cvs.addEventListener('contextmenu', e => e.preventDefault());
    cvs.addEventListener('mousedown', _weMouseDown);
    cvs.addEventListener('mousemove', _weMouseMove);
    cvs.addEventListener('mouseup', _weMouseUp);
    cvs.addEventListener('mouseleave', _weMouseUp);
    cvs.addEventListener('wheel', _weWheel, { passive: false });
    document.getElementById('we-diff-select').addEventListener('change', e => {
        if (weState.scenario) weState.scenario.difficulty = e.target.value;
    });
    document.getElementById('we-json-ok').addEventListener('click', weImportConfirm);
}

// ── Open / Close ─────────────────────────────────────────────────────────────
function weOpenEditor() {
    if (!document.getElementById('wave-editor-overlay')) _weBuildDOM();
    if (!weState.scenario) weState.scenario = weNewScenario();
    if (!weState.scenario.trees) weState.scenario.trees = [];
    weState.open = true;
    weState.currentWave = 0;
    const overlay = document.getElementById('wave-editor-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('title-overlay').classList.add('hidden');
    document.getElementById('we-diff-select').value = weState.scenario.difficulty || 'normal';
    _weRefreshWaveTabs();
    weSelectTab('enemies');

    const cvs = document.getElementById('we-canvas');
    // Double RAF ensures layout is done before measuring canvas dimensions
    requestAnimationFrame(() => requestAnimationFrame(() => {
        cvs.width  = cvs.offsetWidth  || 580;
        cvs.height = cvs.offsetHeight || 500;
        weState.panX = WORLD_W / 2 - (cvs.width  / 2) / weState.zoom;
        weState.panY = WORLD_H / 2 - (cvs.height / 2) / weState.zoom;
        _weRenderLoop();
    }));
}

function weCloseEditor() {
    weState.open = false;
    document.getElementById('wave-editor-overlay').classList.add('hidden');
    document.getElementById('title-overlay').classList.remove('hidden');
}

// ── Render ────────────────────────────────────────────────────────────────────
function _weRenderLoop() {
    if (!weState.open) return;
    weState.frame++;
    const cvs = document.getElementById('we-canvas');
    if (cvs.width !== cvs.offsetWidth || cvs.height !== cvs.offsetHeight) {
        cvs.width = cvs.offsetWidth || cvs.width;
        cvs.height = cvs.offsetHeight || cvs.height;
    }
    _weRender(cvs);
    requestAnimationFrame(_weRenderLoop);
}

function _weRender(cvs) {
    const ctx = cvs.getContext('2d');
    const { panX, panY, zoom } = weState;
    const W = cvs.width, H = cvs.height;
    const tf = weState.frame;

    ctx.clearRect(0, 0, W, H);

    // ── World-space drawing (scaled + translated) ──
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-panX, -panY);

    const startCol = Math.max(0, Math.floor(panX / TILE));
    const endCol   = Math.min(Math.ceil(WORLD_W / TILE) - 1, Math.ceil((panX + W / zoom) / TILE));
    const startRow = Math.max(0, Math.floor(panY / TILE));
    const endRow   = Math.min(Math.ceil(WORLD_H / TILE) - 1, Math.ceil((panY + H / zoom) / TILE));
    const overrides = weState.scenario.terrainOverrides;

    // Terrain
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const tkey = col + '_' + row;
            const base = (terrainMap[row] && terrainMap[row][col]) || 'grass1';
            const terrain = overrides[tkey] || base;
            _weDrawTile(ctx, terrain, col * TILE, row * TILE, row, col, tf);
            if (overrides[tkey]) {
                ctx.strokeStyle = 'rgba(255,255,80,0.6)'; ctx.lineWidth = 2;
                ctx.strokeRect(col * TILE + 1, row * TILE + 1, TILE - 2, TILE - 2);
            }
        }
    }

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
    for (let c = startCol; c <= endCol + 1; c++) { ctx.beginPath(); ctx.moveTo(c*TILE, startRow*TILE); ctx.lineTo(c*TILE, (endRow+1)*TILE); ctx.stroke(); }
    for (let r = startRow; r <= endRow + 1; r++) { ctx.beginPath(); ctx.moveTo(startCol*TILE, r*TILE); ctx.lineTo((endCol+1)*TILE, r*TILE); ctx.stroke(); }

    // World border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

    // Trees (global — not per-wave)
    for (const tr of weState.scenario.trees || []) {
        // Canopy layers (like actual drawTree)
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath(); ctx.arc(tr.wx, tr.wy - 12, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath(); ctx.arc(tr.wx, tr.wy - 14, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#388e3c';
        ctx.beginPath(); ctx.arc(tr.wx - 5, tr.wy - 18, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(tr.wx + 4, tr.wy - 17, 6, 0, Math.PI * 2); ctx.fill();
        // Trunk
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(tr.wx - 4, tr.wy, 8, 14);
    }

    ctx.restore();

    // ── Screen-space overlays ──────────────────────────────────────────────
    // Player spawn marker
    const spx = (WORLD_W / 2 - panX) * zoom;
    const spy = (WORLD_H / 2 - panY) * zoom;
    ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(spx - 9, spy); ctx.lineTo(spx + 9, spy); ctx.moveTo(spx, spy - 9); ctx.lineTo(spx, spy + 9); ctx.stroke();
    ctx.fillStyle = '#00ff00'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('SPAWN', spx, spy - 12);

    // Wave entities
    if (weState.scenario.waves.length > 0) {
        const wv = weState.scenario.waves[weState.currentWave] || weState.scenario.waves[0];
        const R = 7;
        ctx.textBaseline = 'middle';
        for (const e of wv.enemies) {
            const ex = (e.wx - panX) * zoom, ey = (e.wy - panY) * zoom;
            const tmpl = ENEMY_TYPES.find(t => t.type === e.type);
            ctx.fillStyle = (tmpl && tmpl.color) || '#ff6666';
            ctx.beginPath(); ctx.arc(ex, ey, R, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(ex, ey, R, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText(e.type[0].toUpperCase(), ex, ey);
        }
        for (const e of wv.bosses) {
            const ex = (e.wx - panX) * zoom, ey = (e.wy - panY) * zoom;
            const tmpl = ENEMY_TYPES.find(t => t.type === e.type);
            ctx.fillStyle = (tmpl && tmpl.color) || '#ff0000';
            ctx.beginPath(); ctx.arc(ex, ey, R * 1.6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(ex, ey, R * 1.6, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            ctx.fillText('B', ex, ey);
        }
        for (const e of wv.pickups) {
            const ex = (e.wx - panX) * zoom, ey = (e.wy - panY) * zoom;
            ctx.fillStyle = e.kind === 'chest' ? '#ffd700' : '#ff6b6b';
            ctx.fillRect(ex - 6, ey - 6, 12, 12);
            ctx.fillStyle = '#000'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText(e.kind === 'chest' ? '$' : '+', ex, ey);
        }
    }

    // Status bar
    ctx.textBaseline = 'alphabetic';
    if (weState.selectedTool) {
        const label = weState.selectedTool.type === 'erase' ? 'ERASE' : weState.selectedTool.value;
        const tw = label.length * 7 + 10;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(6, H - 22, tw, 17);
        ctx.fillStyle = '#aaa'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText('[' + label.toUpperCase() + ']', 10, H - 9);
    }
    const wvLabel = 'Wave ' + (weState.currentWave + 1) + ' / ' + weState.scenario.waves.length;
    ctx.fillStyle = '#555'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
    ctx.fillText(wvLabel, W - 8, H - 9);
}

// ── Tile drawing (normal world variant, adapted from draw.js) ─────────────────
function _weDrawTile(ctx, t, sx, sy, r, c, tf) {
    if (t === 'water') {
        const wPhase = (tf * 0.04 + r * 0.7 + c * 0.5) % (Math.PI * 2);
        const wBright = Math.floor(20 + Math.sin(wPhase) * 8);
        ctx.fillStyle = `rgb(${wBright+6},${wBright+38},${wBright+90})`;
        ctx.fillRect(sx, sy, TILE, TILE);
        const shimX = ((tf * 2 + c * 13 + r * 7) % TILE);
        ctx.fillStyle = `rgba(100,180,255,${(0.12 + Math.sin(wPhase+1) * 0.08).toFixed(2)})`;
        ctx.fillRect(sx + shimX, sy + 4, 4, TILE - 8);
        return;
    }
    if (t === 'lava') {
        const lPhase = (tf * 0.06 + r * 0.8 + c * 0.6) % (Math.PI * 2);
        const lBright = Math.floor(30 + Math.sin(lPhase) * 15);
        ctx.fillStyle = `rgb(${Math.min(255,lBright+180)},${Math.max(0,lBright+30)},0)`;
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = `rgba(255,160,0,${(0.22 + Math.sin(lPhase+1) * 0.12).toFixed(2)})`;
        ctx.fillRect(sx + ((tf * 1.5 + c * 11 + r * 9) % TILE), sy + 4, 4, TILE - 8);
        if ((r * 5 + c * 7 + Math.floor(tf / 20)) % 5 === 0) {
            ctx.fillStyle = 'rgba(255,220,60,0.6)';
            ctx.fillRect(sx + 10 + (c % 6) * 3, sy + 10, 3, 3);
        }
        return;
    }
    if (t === 'flower') {
        ctx.fillStyle = '#3a6b2b'; ctx.fillRect(sx, sy, TILE, TILE);
        const colors = ['#ff6b6b','#ffeb3b','#e040fb','#40c4ff'];
        ctx.fillStyle = colors[(r * 7 + c * 13) % 4];
        const sway = Math.sin(tf * 0.05 + r * 1.3 + c * 0.9) * 2;
        ctx.fillRect(sx + 12 + sway, sy + 12, 6, 6);
        ctx.fillStyle = '#2a5a1e';
        ctx.fillRect(sx + 14 + sway * 0.5, sy + 18, 2, 6);
        return;
    }
    if (t === 'grass1' || t === 'grass2') {
        ctx.fillStyle = t === 'grass1' ? '#2d5a1e' : '#3a6b2b';
        ctx.fillRect(sx, sy, TILE, TILE);
        if ((r + c) % 3 === 0) {
            const swayG = Math.sin(tf * 0.06 + r * 1.1 + c * 0.8) * 2;
            ctx.fillStyle = t === 'grass1' ? '#3a7028' : '#4a8035';
            ctx.fillRect(sx + 6 + swayG, sy + 4, 2, 10);
            ctx.fillRect(sx + 20 - swayG, sy + 8, 2, 8);
            ctx.fillRect(sx + 14 + swayG * 0.5, sy + 2, 2, 12);
        }
        return;
    }
    if (t === 'dirt') {
        ctx.fillStyle = '#6b5230'; ctx.fillRect(sx, sy, TILE, TILE);
        if ((r * 3 + c * 5) % 4 === 0) {
            ctx.fillStyle = 'rgba(80,55,25,0.4)';
            ctx.fillRect(sx + 6, sy + 8, 8, 3); ctx.fillRect(sx + 18, sy + 20, 5, 3);
        }
        return;
    }
    if (t === 'stone') {
        ctx.fillStyle = '#5a5a5a'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(40,40,40,0.5)';
        if ((r + c) % 2 === 0) { ctx.fillRect(sx + 4, sy + 12, 14, 2); }
        else { ctx.fillRect(sx + 10, sy + 4, 2, 18); }
        ctx.fillStyle = 'rgba(120,120,120,0.3)';
        ctx.fillRect(sx + 2, sy + 2, 6, 4);
        return;
    }
    if (t === 'sand') {
        ctx.fillStyle = '#c8aa7a'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#d4b888'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        if ((r * 3 + c * 7) % 4 === 0) {
            ctx.fillStyle = 'rgba(120,85,40,0.3)';
            ctx.fillRect(sx + (c * 7) % 22 + 2, sy + (r * 5) % 22 + 2, 3, 2);
        }
        return;
    }
    if (t === 'bridge') {
        ctx.fillStyle = '#4a2e10'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#7b4e20'; ctx.fillRect(sx, sy + 1, TILE, 6);
        ctx.fillStyle = '#8c5c28'; ctx.fillRect(sx, sy + 8, TILE, 6);
        ctx.fillStyle = '#7b4e20'; ctx.fillRect(sx, sy + 15, TILE, 6);
        ctx.fillStyle = '#8c5c28'; ctx.fillRect(sx, sy + 22, TILE, 5);
        ctx.fillStyle = '#3a2008';
        ctx.fillRect(sx, sy + 7, TILE, 1); ctx.fillRect(sx, sy + 14, TILE, 1); ctx.fillRect(sx, sy + 21, TILE, 1);
        return;
    }
    if (t === 'void') {
        ctx.fillStyle = '#06060a'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
        if ((r * 5 + c * 7) % 9 === 0) {
            ctx.fillStyle = 'rgba(30,10,45,0.4)'; ctx.fillRect(sx + 6, sy + 8, 8, 4);
        }
        return;
    }
    // Default
    ctx.fillStyle = '#2d5a1e'; ctx.fillRect(sx, sy, TILE, TILE);
}

// ── Input ─────────────────────────────────────────────────────────────────────
function _weScreenToWorld(cvs, mx, my) {
    const rect = cvs.getBoundingClientRect();
    return {
        wx: (mx - rect.left) / weState.zoom + weState.panX,
        wy: (my - rect.top)  / weState.zoom + weState.panY
    };
}

function _weMouseDown(e) {
    const cvs = document.getElementById('we-canvas');
    if (e.button === 2) {
        weState.dragging = true;
        weState.dragStartX = e.clientX; weState.dragStartY = e.clientY;
        weState.dragPanX = weState.panX; weState.dragPanY = weState.panY;
    } else if (e.button === 0) {
        weState.painting = true;
        _wePlaceAt(cvs, e.clientX, e.clientY);
    }
}
function _weMouseMove(e) {
    const cvs = document.getElementById('we-canvas');
    if (weState.dragging) {
        weState.panX = weState.dragPanX - (e.clientX - weState.dragStartX) / weState.zoom;
        weState.panY = weState.dragPanY - (e.clientY - weState.dragStartY) / weState.zoom;
    } else if (weState.painting && weState.selectedTool && weState.selectedTool.type === 'terrain') {
        _wePlaceAt(cvs, e.clientX, e.clientY);
    }
}
function _weMouseUp() { weState.dragging = false; weState.painting = false; }

function _weWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.08, Math.min(2.0, weState.zoom * factor));
    const cvs = document.getElementById('we-canvas');
    const rect = cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    weState.panX += mx / weState.zoom - mx / newZoom;
    weState.panY += my / weState.zoom - my / newZoom;
    weState.zoom = newZoom;
}

function _wePlaceAt(cvs, clientX, clientY) {
    const tool = weState.selectedTool;
    if (!tool) return;
    const { wx, wy } = _weScreenToWorld(cvs, clientX, clientY);
    if (wx < 0 || wx > WORLD_W || wy < 0 || wy > WORLD_H) return;

    if (tool.type === 'erase') {
        const ERASE_R = 30;
        if (weState.scenario.waves.length > 0) {
            const wv = weState.scenario.waves[weState.currentWave];
            for (const arr of [wv.enemies, wv.bosses, wv.pickups]) {
                for (let i = arr.length - 1; i >= 0; i--) {
                    if (Math.hypot(arr[i].wx - wx, arr[i].wy - wy) < ERASE_R) { arr.splice(i, 1); return; }
                }
            }
        }
        // Also check global trees
        const trees = weState.scenario.trees || [];
        for (let i = trees.length - 1; i >= 0; i--) {
            if (Math.hypot(trees[i].wx - wx, trees[i].wy - wy) < ERASE_R) { trees.splice(i, 1); return; }
        }
        // Terrain erase: reset to base
        const col = Math.floor(wx / TILE), row = Math.floor(wy / TILE);
        delete weState.scenario.terrainOverrides[col + '_' + row];
        return;
    }

    if (tool.type === 'terrain') {
        weState.scenario.terrainOverrides[Math.floor(wx / TILE) + '_' + Math.floor(wy / TILE)] = tool.value;
        return;
    }

    if (tool.type === 'tree') {
        if (!weState.scenario.trees) weState.scenario.trees = [];
        if (weState.scenario.trees.some(t => Math.hypot(t.wx - wx, t.wy - wy) < 36)) return;
        weState.scenario.trees.push({ wx: Math.round(wx), wy: Math.round(wy) });
        return;
    }

    // Entity placement — don't stack
    if (weState.scenario.waves.length === 0) return;
    const wv = weState.scenario.waves[weState.currentWave];
    const all = [...wv.enemies, ...wv.bosses, ...wv.pickups];
    if (all.some(e => Math.hypot(e.wx - wx, e.wy - wy) < 20)) return;

    if (tool.type === 'enemy')  wv.enemies.push({ type: tool.value, wx: Math.round(wx), wy: Math.round(wy) });
    else if (tool.type === 'boss')   wv.bosses.push({ type: tool.value, wx: Math.round(wx), wy: Math.round(wy) });
    else if (tool.type === 'pickup') wv.pickups.push({ kind: tool.value, wx: Math.round(wx), wy: Math.round(wy) });
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
let _weCurrentTab = 'enemies';

function weSelectTab(tab) {
    _weCurrentTab = tab;
    document.querySelectorAll('.we-tab').forEach((b, i) => {
        b.classList.toggle('we-tab-active', ['enemies','terrain','bosses','other'][i] === tab);
    });
    const panel = document.getElementById('we-panel-content');
    panel.innerHTML = '';

    if (tab === 'enemies') {
        _weToolBtn(panel, 'erase', 'erase', '✕ ERASE', null, true);
        _weSectionLabel(panel, '— ENEMIES —');
        for (const et of ENEMY_TYPES) _weToolBtn(panel, 'enemy', et.type, et.type.toUpperCase(), et.color);
    } else if (tab === 'terrain') {
        _weToolBtn(panel, 'erase', 'erase', '✕ ERASE (restore base)', null, true);
        _weSectionLabel(panel, '— PAINT TERRAIN —');
        for (const tt of WE_TERRAIN_TYPES) _weToolBtn(panel, 'terrain', tt, tt.toUpperCase(), WE_TERRAIN_COLORS[tt]);
        _weSectionLabel(panel, 'Right-drag: pan   Scroll: zoom   Left-drag: paint');
    } else if (tab === 'bosses') {
        _weToolBtn(panel, 'erase', 'erase', '✕ ERASE', null, true);
        _weSectionLabel(panel, '— BOSS TYPES —');
        for (const et of ENEMY_TYPES) _weToolBtn(panel, 'boss', et.type, et.type.toUpperCase() + ' (BOSS)', et.color);
    } else if (tab === 'other') {
        _weSectionLabel(panel, '— STRUCTURES —');
        _weToolBtn(panel, 'erase', 'erase', '✕ ERASE', null, true);
        _weToolBtn(panel, 'tree', 'tree', 'TREE', '#2e7d32');
        _weSectionLabel(panel, '— PICKUPS —');
        _weToolBtn(panel, 'pickup', 'chest', 'TREASURE CHEST', '#ffd700');
        _weToolBtn(panel, 'pickup', 'heart', 'HEART', '#ff6b6b');
        _weSectionLabel(panel, '— WAVE SETTINGS —');
        if (weState.scenario.waves.length > 0) {
            const wv = weState.scenario.waves[weState.currentWave];
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:2px;';

            const condLabel = document.createElement('label');
            condLabel.style.cssText = 'color:#aaa;font-size:9px;display:flex;flex-direction:column;gap:3px;';
            condLabel.textContent = 'Win Condition:';
            const condSel = document.createElement('select');
            condSel.style.cssText = 'background:#222;color:#ccc;border:1px solid #444;padding:3px;font-family:monospace;font-size:9px;';
            condSel.innerHTML = '<option value="killAll">Kill All Enemies</option><option value="survive">Survive (seconds)</option>';
            condSel.value = wv.condition;
            condSel.addEventListener('change', e => { wv.condition = e.target.value; weSelectTab('other'); });
            condLabel.appendChild(condSel);
            row.appendChild(condLabel);

            if (wv.condition === 'survive') {
                const secLabel = document.createElement('label');
                secLabel.style.cssText = 'color:#aaa;font-size:9px;display:flex;flex-direction:column;gap:3px;';
                secLabel.textContent = 'Seconds:';
                const secInput = document.createElement('input');
                secInput.type = 'number'; secInput.min = '5'; secInput.max = '600'; secInput.value = wv.surviveSecs;
                secInput.style.cssText = 'background:#222;color:#ccc;border:1px solid #444;padding:3px;font-family:monospace;font-size:9px;width:60px;';
                secInput.addEventListener('change', e => { wv.surviveSecs = parseInt(e.target.value) || 60; });
                secLabel.appendChild(secInput);
                row.appendChild(secLabel);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'we-item-btn we-erase-btn';
            deleteBtn.textContent = 'DELETE THIS WAVE';
            deleteBtn.style.marginTop = '12px';
            deleteBtn.addEventListener('click', () => {
                if (weState.scenario.waves.length <= 1) return;
                weState.scenario.waves.splice(weState.currentWave, 1);
                weState.currentWave = Math.max(0, weState.currentWave - 1);
                _weRefreshWaveTabs();
                weSelectTab('other');
            });
            row.appendChild(deleteBtn);
            panel.appendChild(row);
        }
    }
}

function _weSectionLabel(parent, text) {
    parent.appendChild(Object.assign(document.createElement('div'), {
        style: 'color:#555;font-size:8px;padding:5px 2px 2px 2px;line-height:1.5;',
        textContent: text
    }));
}

function _weToolBtn(parent, type, value, label, color, isErase) {
    const btn = document.createElement('button');
    btn.className = 'we-item-btn' + (isErase ? ' we-erase-btn' : '');
    const sel = weState.selectedTool && weState.selectedTool.type === type && weState.selectedTool.value === value;
    if (sel) btn.classList.add('we-selected');
    if (color) {
        const dot = document.createElement('span');
        dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:' + color + ';margin-right:6px;vertical-align:middle;';
        btn.appendChild(dot);
    }
    btn.appendChild(document.createTextNode(label));
    btn.addEventListener('click', () => {
        weState.selectedTool = sel ? null : { type, value };
        weSelectTab(_weCurrentTab);
    });
    parent.appendChild(btn);
}

// ── Wave tabs ─────────────────────────────────────────────────────────────────
function _weRefreshWaveTabs() {
    const bar = document.getElementById('we-wave-tabs');
    bar.innerHTML = '';
    weState.scenario.waves.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'we-wave-tab' + (i === weState.currentWave ? ' we-wave-active' : '');
        btn.textContent = 'Wave ' + (i + 1);
        btn.addEventListener('click', () => { weState.currentWave = i; _weRefreshWaveTabs(); weSelectTab(_weCurrentTab); });
        bar.appendChild(btn);
    });
}

function weAddWave() {
    weState.scenario.waves.push({ condition: 'killAll', surviveSecs: 60, enemies: [], bosses: [], pickups: [] });
    weState.currentWave = weState.scenario.waves.length - 1;
    _weRefreshWaveTabs();
    weSelectTab(_weCurrentTab);
}

// ── Export / Import ───────────────────────────────────────────────────────────
function weExport() {
    weState.scenario.difficulty = document.getElementById('we-diff-select').value;
    const json = JSON.stringify(weState.scenario, null, 2);
    document.getElementById('we-json-text').value = json;
    document.getElementById('we-json-ok').textContent = 'COPY';
    document.getElementById('we-json-ok').onclick = () => {
        navigator.clipboard.writeText(json).catch(() => {});
        document.getElementById('we-json-modal').classList.add('hidden');
    };
    document.getElementById('we-json-modal').classList.remove('hidden');
}
function weImportPrompt() {
    document.getElementById('we-json-text').value = '';
    document.getElementById('we-json-ok').textContent = 'OK';
    document.getElementById('we-json-ok').onclick = weImportConfirm;
    document.getElementById('we-json-modal').classList.remove('hidden');
}
function weImportConfirm() {
    try {
        const sc = JSON.parse(document.getElementById('we-json-text').value);
        if (!sc.waves || !Array.isArray(sc.waves)) throw new Error('Missing waves array');
        if (!sc.trees) sc.trees = [];
        weState.scenario = sc;
        weState.currentWave = 0;
        document.getElementById('we-diff-select').value = sc.difficulty || 'normal';
        document.getElementById('we-json-modal').classList.add('hidden');
        _weRefreshWaveTabs();
        weSelectTab(_weCurrentTab);
    } catch(e) { alert('Invalid scenario JSON: ' + e.message); }
}

// ── Start Game ────────────────────────────────────────────────────────────────
function weStartGame() {
    const sc = weState.scenario;
    if (!sc || sc.waves.length === 0) { showNotif('Add at least one wave first!'); return; }
    sc.difficulty = document.getElementById('we-diff-select').value;
    const diffKey = sc.difficulty;
    const d = DIFFICULTY_SETTINGS[diffKey];

    state.gameOver = false; state.paused = false;
    state.difficulty = diffKey; state.diffMult = d;
    state.isDailyChallenge = false; state.dailyParams = null;
    state.activeEvent = null; state.currentQuest = null; state.questWaveCounter = 0;
    state.challengeZone = null; state.dungeonPortal = null; state.dungeon = null;
    state.weather = { stage:0, wavesLeft:0, extreme:null, rainParticles:[], lightningFlash:0, tornadoX:WORLD_W/2, tornadoY:WORLD_H/2, fogPatches:[] };
    state._eclipseActive=false; state._bloodMoonActive=false; state._earthquakeActive=false;
    state._meteorActive=false; state._healSpringActive=false; state._frostActive=false;
    state.dragonRitualInLava=false; state.hasRubixCube=false;
    state.slipperyPatches=[]; state.janitorPickupWindow=[];
    state.enemies=[]; state.goldPickups=[]; state.heartPickups=[];
    state.particles=[]; state.projectiles=[]; state.enemyProjectiles=[];
    state.barricades=[]; state.skeletonWarriors=[]; state.spiderWebs=[];
    state.treasureChests=[]; state.eggs=[]; state.damageNumbers=[];
    state.fireTrails=[]; state.shockwaves=[]; state.lightningEffects=[];
    state.birdVortexes=[]; state.bountyTarget=null;
    state.bossActive=false; state.hordeWave=false;
    state.waveBreather=90; state.waveSpawnQueue=[];
    state.waveAllSpawned=false; state.waveEnemiesTotal=0; state.waveEnemiesKilled=0;
    state.waveSpawnTimer=0; state.mapVariant='normal';
    state.achievementsThisRun=[]; state.runStartTime=Date.now();
    state.endlessMode=false; state.grimReaperSpawned=false; state.grimReaperDefeated=false;
    state.pacifistTimer=0; state.webbedTimer=0; state.runAngelHeals=0;
    state.runShadowDemonsKilled=0; state.speedKillWindow=[];
    state.shopLocks={}; state.shopLockedPrices={};
    state.dayNight={phase:'day',timer:DAY_LEN,dayCount:1,alpha:0,eveningShown:false};
    state.postBossCooldown=0; state.frame=0;
    state.alienWorld=false; state.dinoWorld=false; state.sailorWorld=false;
    state.stickWorld=false; state.underwater=false; state.butler=null;

    const p = state.player;
    p.x=WORLD_W/2; p.y=WORLD_H/2; p.character='knight'; p.pet='dog';
    p.maxHp=Math.round(100*d.playerHpMult); p.hp=p.maxHp;
    p.gold=0; p.score=0; p.kills=0; p.wave=1; p.bossesKilled=0;
    p.dashing=false; p.dashCooldown=0; p.dashTimer=0;
    p.attacking=false; p.attackCooldown=0; p.attackCount=0;
    p.facingX=0; p.facingY=1;
    p.weapon='sword'; p.ownedWeapons=['sword'];
    p.weaponSlots={1:'sword',2:null,3:null};
    p.upgrades=[]; p.upgradeLevels={};
    p.streak=0; p.streakTimer=0; p.streakMult=1;
    p.sizeScale=1; p.damageMult=1; p.orbAngle=0;
    p.totalGoldEarned=0; p.pineWood=0; p.redWood=0; p.bones=0;
    p.torchTimer=0; p.furyKills=0; p.secondChanceUsed=false; p.phoenixUsed=false;
    p.petBranch=[0,0,0]; p.petEvolveLevel=0;
    p.petActionCount=0; p.petActionThreshold=0; p.petUpgradeReady=false;
    p.xp=0; p.xpLevel=0; p.xpToNext=10; p.skillPoints=0; p.skills={};
    p.skillCritChance=0; p.lifeStealBonus=0; p.attackSpeedMult=1;
    p.attackRangeBonus=0; p.hasMomentum=false; p.momentumStacks=0;
    p.goldMult=1; p.unlockedEnemyTypes=12;
    p.milestoneIndex=0; p.nextEvolveKills=170;
    p.humanKillsThisRun=0; p.lakeSec1=0; p.lakeSec2=0;
    p.weaponDurability={sword:200}; p.weaponUpgrades={}; p.weaponWarnedLow={};
    p.armor={helmet:null,chest:null,leggings:null,boots:null};
    p.armorDurability={}; p.fusionIngredients={};
    p.maxWeaponSlots=3; p.maxUpgrades=6;
    p.animFrame=0; p.animTimer=0; p.cloneAttackTimer=0;
    p.robotMalfunction=false; p.robotMalfunctionTimer=0; p.chickenTimer=0;

    state.customWaves=sc; state.customWaveIndex=0;
    state._cwSpawned=false; state._cwSurviveTimer=0; state._cwComplete=false;

    // Apply terrain overrides
    for (const [key, type] of Object.entries(sc.terrainOverrides || {})) {
        const [col, row] = key.split('_').map(Number);
        if (terrainMap[row]) terrainMap[row][col] = type;
    }

    applyCharacterBonuses();
    spawnCrocodiles(); spawnSalamanders(); spawnFishAndSharks(); spawnTrees(); generateDungeon(); randomizeShop();

    // Add custom trees on top of normal trees
    for (const t of sc.trees || []) {
        state.trees.push({ x: t.wx, y: t.wy, hp: 5, maxHp: 5, hurtTimer: 0 });
    }

    weState.open = false;
    document.getElementById('wave-editor-overlay').classList.add('hidden');
    document.getElementById('right-panel').classList.remove('hidden');
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('title-overlay').classList.add('hidden');
    updateWeaponHUD();
    _audio.startMusic();
    persist.hasPlayed = true; savePersist(persist);
    showNotif('CUSTOM WAVES — Knight + Dog — ' + diffKey.toUpperCase());
}

// ── Custom wave update (called from updateWave when state.customWaves set) ────
function updateCustomWave() {
    if (state.gameOver) return;
    const waves = state.customWaves.waves;
    if (state.waveBreather > 0) { state.waveBreather--; return; }

    if (!state._cwSpawned) {
        if (state.customWaveIndex >= waves.length) {
            if (!state._cwComplete) {
                state._cwComplete = true;
                showNotif('All waves complete! You win!', true);
                setTimeout(() => endGame(), 3000);
            }
            return;
        }
        const wv = waves[state.customWaveIndex];
        state._cwSpawned = true;
        state._cwSurviveTimer = wv.condition === 'survive' ? wv.surviveSecs * 60 : 0;
        _spawnCustomWaveEnemies(wv);
        state.player.wave = state.customWaveIndex + 1;
        showNotif('Wave ' + (state.customWaveIndex + 1) + ' / ' + waves.length +
            (wv.condition === 'survive' ? ' — Survive ' + wv.surviveSecs + 's!' : ' — Kill all!'));
    }

    const wv = waves[state.customWaveIndex];
    let waveDone = false;
    if (wv.condition === 'survive') {
        if (state._cwSurviveTimer > 0) state._cwSurviveTimer--;
        else waveDone = true;
    } else {
        waveDone = state.enemies.length === 0;
    }

    if (waveDone) {
        state.customWaveIndex++;
        state._cwSpawned = false;
        state.waveBreather = 180;
        createExplosion(state.player.x, state.player.y, '#4e4e6e');
        if (state.customWaveIndex < waves.length) showNotif('Wave cleared! Next wave soon...');
    }
}

function _spawnCustomWaveEnemies(waveData) {
    const dm = state.diffMult;
    const allTypes = [...ENEMY_TYPES, ...HUMAN_ENEMY_TYPES, ...DINO_ENEMY_TYPES, ...SAILOR_ENEMY_TYPES, ...ALIEN_ENEMY_TYPES];
    for (const entry of waveData.enemies || []) {
        const tmpl = allTypes.find(t => t.type === entry.type);
        if (!tmpl) continue;
        state.enemies.push({
            x:entry.wx, y:entry.wy, w:16, h:16, type:tmpl.type,
            hp:tmpl.hp*dm.enemyHpMult, maxHp:tmpl.hp*dm.enemyHpMult,
            speed:tmpl.speed*dm.enemySpeedMult,
            color:tmpl.color, gold:tmpl.gold, score:tmpl.score,
            sizeScale:tmpl.size||1, animTimer:Math.random()*100,
            elite:false, isBoss:false, knockbackResist:tmpl.knockbackResist||0,
            hurtTimer:0, isWaveEnemy:true, mod:null, shield:0, maxShield:0,
            _hpLastFrame:0, isEnraged:false, waterOnly:!!(tmpl.waterOnly), dormant:false, mpTargetIdx:0
        });
    }
    for (const entry of waveData.bosses || []) {
        const tmpl = allTypes.find(t => t.type === entry.type);
        if (!tmpl) continue;
        state.enemies.push({
            x:entry.wx, y:entry.wy, w:24, h:24, type:tmpl.type,
            hp:tmpl.hp*8*dm.enemyHpMult, maxHp:tmpl.hp*8*dm.enemyHpMult,
            speed:tmpl.speed*dm.enemySpeedMult,
            color:tmpl.color, gold:tmpl.gold*10, score:tmpl.score*5,
            sizeScale:(tmpl.size||1)*2, animTimer:Math.random()*100,
            elite:false, isBoss:true, knockbackResist:1,
            hurtTimer:0, isWaveEnemy:true, mod:null, shield:0, maxShield:0,
            _hpLastFrame:0, isEnraged:false, mpTargetIdx:0
        });
    }
    for (const entry of waveData.pickups || []) {
        if (entry.kind === 'chest') state.treasureChests.push({ x:entry.wx, y:entry.wy, opened:false, animTimer:0 });
        else if (entry.kind === 'heart') state.heartPickups.push({ x:entry.wx, y:entry.wy });
    }
    state.waveEnemiesTotal = (waveData.enemies||[]).length + (waveData.bosses||[]).length;
    state.waveEnemiesKilled = 0;
    state.waveAllSpawned = true;
}
