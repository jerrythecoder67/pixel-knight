// ─── DUNGEON SYSTEM ───
// Procedurally generated dungeon. 5×4 grid = 20 rooms.
// Room types: entry(1), treasure(1), boss(1), puzzle(5-7), battle(5-10), chest(rest).
// Locked iron doors seal corridors until the parent room is cleared.
// Boss is always the spanning-tree parent of the Treasure room.

const DG_COLS = 5, DG_ROWS = 4;
const DG_ROOM_W = 12, DG_ROOM_H = 9;
const DG_CELL_W = 16, DG_CELL_H = 11;          // cell = room + gap (2-tile gap)
const DUNGEON_ORIGIN = { tx: 62, ty: 66 };
const DUNGEON_AREA_W = 2 + DG_COLS * DG_CELL_W; // 82
const DUNGEON_AREA_H = 2 + DG_ROWS * DG_CELL_H; // 46 — fits below world centre

// ─── Low-level helpers ───

function _dtile(relTX, relTY, type) {
    const aty = DUNGEON_ORIGIN.ty + relTY;
    const atx = DUNGEON_ORIGIN.tx + relTX;
    if (terrainMap[aty]) terrainMap[aty][atx] = type;
}

function _roomWorldCenter(room) {
    return {
        x: (DUNGEON_ORIGIN.tx + room.rx + Math.floor(DG_ROOM_W / 2)) * TILE,
        y: (DUNGEON_ORIGIN.ty + room.ry + Math.floor(DG_ROOM_H / 2)) * TILE,
    };
}

function _playerInRoom(room) {
    const p = state.player;
    const minX = (DUNGEON_ORIGIN.tx + room.rx) * TILE;
    const maxX = (DUNGEON_ORIGIN.tx + room.rx + DG_ROOM_W) * TILE;
    const minY = (DUNGEON_ORIGIN.ty + room.ry) * TILE;
    const maxY = (DUNGEON_ORIGIN.ty + room.ry + DG_ROOM_H) * TILE;
    return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

function _dungeonLivingEnemies(roomId) {
    return state.enemies.filter(e => e._dungeonRoom === roomId).length;
}

// ─── Corridor & door geometry ───

function _carveEdgeCorridor(rA, rB) {
    if (rA.row === rB.row) {
        const left = rA.col < rB.col ? rA : rB;
        for (let rx = left.rx + DG_ROOM_W; rx <= left.rx + DG_CELL_W - 1; rx++)
            for (let ry = left.ry + 3; ry <= left.ry + 6; ry++)
                _dtile(rx, ry, 'stone');
    } else {
        const top = rA.row < rB.row ? rA : rB;
        for (let ry = top.ry + DG_ROOM_H; ry <= top.ry + DG_CELL_H - 1; ry++)
            for (let rx = top.rx + 4; rx <= top.rx + 7; rx++)
                _dtile(rx, ry, 'stone');
    }
}

// 4-tile door placed at the child-room side of the corridor.
function _computeDoorTiles(parentRoom, childRoom) {
    const tiles = [];
    if (parentRoom.row === childRoom.row) {
        const left = parentRoom.col < childRoom.col ? parentRoom : childRoom;
        const corY1 = left.ry + 3;
        const dx = childRoom.col > parentRoom.col
            ? left.rx + DG_CELL_W - 1
            : childRoom.rx + DG_ROOM_W;
        for (let y = corY1; y <= corY1 + 3; y++) tiles.push({ rx: dx, ry: y });
    } else {
        const top = parentRoom.row < childRoom.row ? parentRoom : childRoom;
        const corX1 = top.rx + 4;
        const dy = childRoom.row > parentRoom.row
            ? top.ry + DG_CELL_H - 1
            : childRoom.ry + DG_ROOM_H;
        for (let x = corX1; x <= corX1 + 3; x++) tiles.push({ rx: x, ry: dy });
    }
    return tiles;
}

// ─── Layout generation ───

function _generateDungeonLayout() {
    const rooms = [];
    const byGrid = {};
    for (let r = 0; r < DG_ROWS; r++) {
        for (let c = 0; c < DG_COLS; c++) {
            const id = rooms.length;
            rooms.push({
                id, col: c, row: r,
                rx: 1 + c * DG_CELL_W,
                ry: 1 + r * DG_CELL_H,
                type: 'battle', cleared: false, spawned: false,
                puzzleState: null,
            });
            byGrid[`${c},${r}`] = id;
        }
    }

    const entryId = byGrid['0,0'];
    rooms[entryId].type = 'entry';
    rooms[entryId].cleared = true;

    // Randomised Prim's spanning tree
    const visited = new Set([entryId]);
    const frontier = [];
    const edges = [];

    function addFrontier(id) {
        const rm = rooms[id];
        for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nc = rm.col + dc, nr = rm.row + dr;
            if (nc >= 0 && nc < DG_COLS && nr >= 0 && nr < DG_ROWS) {
                const nid = byGrid[`${nc},${nr}`];
                if (!visited.has(nid)) frontier.push({ parentId: id, childId: nid });
            }
        }
    }
    addFrontier(entryId);

    while (frontier.length > 0) {
        const idx = Math.floor(Math.random() * frontier.length);
        const { parentId, childId } = frontier.splice(idx, 1)[0];
        if (visited.has(childId)) continue;
        visited.add(childId);
        edges.push({ fromId: parentId, toId: childId, unlocked: false, doorTiles: null });
        addFrontier(childId);
    }

    // BFS distances from entry
    const dist = new Array(rooms.length).fill(Infinity);
    dist[entryId] = 0;
    const q = [entryId];
    while (q.length) {
        const cur = q.shift();
        for (const e of edges) {
            const nb = e.fromId === cur ? e.toId : e.toId === cur ? e.fromId : -1;
            if (nb >= 0 && dist[nb] === Infinity) { dist[nb] = dist[cur] + 1; q.push(nb); }
        }
    }

    // Treasure = farthest room
    const sorted = [...rooms].sort((a, b) => dist[b.id] - dist[a.id]);
    const treasureId = sorted[0].id;

    // Boss = spanning-tree parent of treasure (must be cleared to unlock treasure door)
    const treasureEdge = edges.find(e => e.toId === treasureId);
    const bossId = treasureEdge ? treasureEdge.fromId : sorted[1].id;

    rooms[treasureId].type = 'treasure';
    rooms[bossId].type = 'boss';

    // Available rooms for puzzle / battle / chest
    const available = rooms.filter(r => r.id !== entryId && r.id !== treasureId && r.id !== bossId);
    const maxD = dist[treasureId];

    // Target counts
    const nPuzzle = 5 + Math.floor(Math.random() * 3); // 5-7
    let nBattle = 5 + Math.floor(Math.random() * 6);   // 5-10
    // Ensure at least 2 chest rooms remain
    if (nPuzzle + nBattle > available.length - 2) {
        nBattle = Math.max(0, available.length - 2 - nPuzzle);
    }

    // Puzzle rooms: prefer mid-distance (25-75% of max dist), shuffle for randomness
    const midPool = available
        .filter(r => dist[r.id] >= Math.max(1, Math.floor(maxD * 0.25)) &&
                     dist[r.id] <= Math.floor(maxD * 0.75))
        .sort(() => Math.random() - 0.5);
    const restPool = available
        .filter(r => !midPool.includes(r))
        .sort(() => Math.random() - 0.5);
    const puzzleCandidates = [...midPool, ...restPool]; // mid-distance first

    for (let i = 0, assigned = 0; i < puzzleCandidates.length && assigned < nPuzzle; i++) {
        const rm = puzzleCandidates[i];
        if (rm.type !== 'battle') continue;
        rm.type = 'puzzle';
        rm.puzzleState = {
            type: Math.random() < 0.5 ? 'plates' : 'switches',
            solved: false, holdTimer: 0, plates: [], switches: [], nextSwitch: 0,
        };
        assigned++;
    }

    // Battle vs chest: shuffle remaining battle rooms, keep nBattle, rest become chest
    const battleRooms = rooms.filter(r => r.type === 'battle').sort(() => Math.random() - 0.5);
    for (let i = nBattle; i < battleRooms.length; i++) {
        battleRooms[i].type = 'chest';
    }

    // Assign doors (entry's children start unlocked)
    edges.forEach(edge => {
        const parent = rooms[edge.fromId];
        if (parent.type === 'entry') {
            edge.unlocked = true;
        } else {
            edge.doorTiles = _computeDoorTiles(parent, rooms[edge.toId]);
        }
    });

    return { rooms, edges, entryId, treasureId, bossId };
}

// ─── Main generation ───

function generateDungeon() {
    state.dungeonPortal = null;
    state.dungeon = null;
    if (Math.random() > 0.15) return;

    // Void-fill the dungeon area
    for (let ry = 0; ry < DUNGEON_AREA_H; ry++)
        for (let rx = 0; rx < DUNGEON_AREA_W; rx++)
            _dtile(rx, ry, 'void');

    const layout = _generateDungeonLayout();
    const { rooms, edges, entryId, treasureId, bossId } = layout;

    // Carve rooms
    rooms.forEach(room => {
        for (let ry = room.ry; ry < room.ry + DG_ROOM_H; ry++)
            for (let rx = room.rx; rx < room.rx + DG_ROOM_W; rx++)
                _dtile(rx, ry, 'stone');
    });

    // Carve corridors, then seal locked doors
    edges.forEach(edge => {
        _carveEdgeCorridor(rooms[edge.fromId], rooms[edge.toId]);
        if (edge.doorTiles) edge.doorTiles.forEach(({ rx, ry }) => _dtile(rx, ry, 'void'));
    });

    // Portal: random position in the world, away from dungeon footprint and map edges
    const dMinX = DUNGEON_ORIGIN.tx * TILE, dMaxX = (DUNGEON_ORIGIN.tx + DUNGEON_AREA_W) * TILE;
    const dMinYP = DUNGEON_ORIGIN.ty * TILE, dMaxYP = (DUNGEON_ORIGIN.ty + DUNGEON_AREA_H) * TILE;
    const margin = 400;
    let portalX, portalY, attempts = 0;
    do {
        portalX = margin + Math.random() * (WORLD_W - margin * 2);
        portalY = margin + Math.random() * (WORLD_H - margin * 2);
        attempts++;
    } while (attempts < 50 &&
        portalX > dMinX - 200 && portalX < dMaxX + 200 &&
        portalY > dMinYP - 200 && portalY < dMaxYP + 200);

    // Remove trees inside dungeon footprint
    const dMinY = DUNGEON_ORIGIN.ty * TILE, dMaxY = (DUNGEON_ORIGIN.ty + DUNGEON_AREA_H) * TILE;
    if (state.trees) state.trees = state.trees.filter(t =>
        t.x < dMinX || t.x > dMaxX || t.y < dMinY || t.y > dMaxY);

    // Remove world treasure chests that landed inside the dungeon
    if (state.treasureChests) state.treasureChests = state.treasureChests.filter(tc => {
        const tcTX = tc.x / TILE, tcTY = tc.y / TILE;
        return tcTX < DUNGEON_ORIGIN.tx || tcTX > DUNGEON_ORIGIN.tx + DUNGEON_AREA_W ||
               tcTY < DUNGEON_ORIGIN.ty || tcTY > DUNGEON_ORIGIN.ty + DUNGEON_AREA_H;
    });

    // Spawn point: left side of entry room
    const entry = rooms[entryId];
    const entrySpawn = {
        x: (DUNGEON_ORIGIN.tx + entry.rx + 2) * TILE,
        y: (DUNGEON_ORIGIN.ty + entry.ry + Math.floor(DG_ROOM_H / 2)) * TILE,
    };

    // Exit portal and end chest: both in treasure room, separated
    const trCenter = _roomWorldCenter(rooms[treasureId]);
    const exitPortalX = trCenter.x - 64;
    const exitPortalY = trCenter.y;
    const endChest = { x: trCenter.x + 64, y: trCenter.y, opened: false };

    state.dungeonPortal = { x: portalX, y: portalY, used: false };
    state.dungeon = {
        active: false,
        rooms, edges,
        entryId, treasureId, bossId,
        entryX: entrySpawn.x, entryY: entrySpawn.y,
        exitPortalX, exitPortalY,
        endChest,
        returnX: portalX, returnY: portalY,
        cleared: false,
        _savedCrocs: null,
        _entryFrame: 0,
    };
}

// ─── Unlock a corridor edge (convert door void-tiles → stone) ───

function _unlockEdge(edge) {
    if (edge.unlocked || !edge.doorTiles) return;
    edge.doorTiles.forEach(({ rx, ry }) => _dtile(rx, ry, 'stone'));
    edge.unlocked = true;
}

// ─── Spawn dungeon enemies ───

function _spawnDungeonEnemies(room) {
    const center = _roomWorldCenter(room);
    const p = state.player;
    const TYPES = ['slime','skeleton','wraith','imp','vampire','spider','troll','golem'];
    const depth = room.col + room.row;
    const isBoss = room.type === 'boss';
    const count = isBoss ? (2 + Math.floor(p.wave / 4)) : (5 + depth + Math.floor(p.wave / 3));
    const hpMult = 1.2 + depth * 0.12 + p.wave * 0.06;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const r = 60 + Math.random() * 60;
        const typeKey = TYPES[Math.floor(Math.random() * TYPES.length)];
        const base = ENEMY_TYPES.find(t => t.id === typeKey) || ENEMY_TYPES[0];
        const hp = Math.round((base.hp || 40) * hpMult);
        const enemy = {
            ...base, type: base.type || base.id,
            x: center.x + Math.cos(angle) * r,
            y: center.y + Math.sin(angle) * r,
            w: 16, h: 16, hp, maxHp: hp,
            speed: base.speed || 1, color: base.color || '#888',
            gold: Math.round((base.gold || 5) * 2),
            score: (base.score || 20) * 2,
            sizeScale: base.size || 1,
            animTimer: Math.random() * 100, hurtTimer: 0,
            knockbackResist: base.knockbackResist || 0,
            dormant: false, waterOnly: false,
            mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0,
            isEnraged: false, isBoss: false, isWaveEnemy: false,
            facingX: 1, facingY: 0,
            _dungeonRoom: room.id, elite: depth >= 3,
        };
        if (isBoss && i === 0) {
            enemy.mod = true; enemy.elite = true;
            enemy.hp = Math.round(hp * 4); enemy.maxHp = enemy.hp;
            enemy.sizeScale = 2.0; enemy.gold = Math.round(enemy.gold * 3);
        }
        state.enemies.push(enemy);
    }
    showNotif(isBoss
        ? 'BOSS ROOM! Defeat the dungeon guardian!'
        : 'Battle room! Clear all enemies to unlock the next door!');
}

// ─── Puzzle room ───

function _initPuzzleRoom(room) {
    const { x: cx, y: cy } = _roomWorldCenter(room);
    const isCoOp = typeof MP !== 'undefined' && MP.active;
    const pz = room.puzzleState;

    if (pz.type === 'plates') {
        pz.plates = isCoOp
            ? [{ x: cx - 40, y: cy, active: false }, { x: cx + 40, y: cy, active: false }]
            : [{ x: cx, y: cy, active: false }];
    } else {
        pz.switches = [
            { x: cx - 60, y: cy - 30, order: 0, activated: false },
            { x: cx + 60, y: cy - 30, order: 1, activated: false },
            { x: cx,      y: cy + 40, order: 2, activated: false },
        ];
        pz.nextSwitch = 0;
    }
    // Generic notification — do NOT reveal puzzle type
    showNotif('PUZZLE ROOM! Solve the puzzle to unlock the next door!', true);
}

function _updatePuzzleRoom(room) {
    const pz = room.puzzleState;
    if (!pz || pz.solved) return;
    const p = state.player;

    if (pz.type === 'plates') {
        const players = [{ x: p.x, y: p.y }];
        if (typeof MP !== 'undefined' && MP.active) {
            if (MP.isHost) MP.guestPlayers.forEach(g => { if (g.isAlive) players.push({ x: g.x, y: g.y }); });
            else if (MP._remoteHostPlayer) players.push({ x: MP._remoteHostPlayer.x, y: MP._remoteHostPlayer.y });
        }
        pz.plates.forEach(pl => { pl.active = players.some(pp => Math.hypot(pp.x - pl.x, pp.y - pl.y) < 22); });
        if (pz.plates.every(pl => pl.active)) {
            if (++pz.holdTimer >= 180) _solvePuzzle(room);
        } else {
            pz.holdTimer = Math.max(0, pz.holdTimer - 2);
        }
    } else {
        const sw = pz.switches[pz.nextSwitch];
        if (sw && !sw.activated && Math.hypot(p.x - sw.x, p.y - sw.y) < 20) {
            sw.activated = true;
            createExplosion(sw.x, sw.y, '#ffd700');
            if (++pz.nextSwitch >= pz.switches.length) _solvePuzzle(room);
            else showNotif('Switch ' + pz.nextSwitch + '/' + pz.switches.length + ' — keep going!');
        }
    }
}

function _solvePuzzle(room) {
    const dg = state.dungeon;
    const pz = room.puzzleState;
    pz.solved = true;
    room.cleared = true;
    if (pz.plates && pz.plates.length) pz.plates.forEach(pl => createExplosion(pl.x, pl.y, '#69f0ae'));
    dg.edges.forEach(e => { if (e.fromId === room.id) _unlockEdge(e); });
    showNotif('PUZZLE SOLVED! Path forward unlocked!', true);
}

// ─── Update ───

function updateDungeon() {
    const p = state.player;
    const dg = state.dungeon;
    if (!dg) return;

    // ── World portal entry ──
    if (!dg.active && state.dungeonPortal && !state.dungeonPortal.used) {
        const dp = state.dungeonPortal;
        if (Math.hypot(p.x - dp.x, p.y - dp.y) < 80 && state.keys['e']) {
            dp.used = true;
            dg.active = true;
            dg.returnX = dp.x; dg.returnY = dp.y;
            dg._savedCrocs = state.crocodiles.map(c => ({ ...c }));
            state.crocodiles = [];
            state.enemies = [];
            dg._entryFrame = state.frame;
            p.x = dg.entryX; p.y = dg.entryY;
            state.camera.x = p.x - 400; state.camera.y = p.y - 300;
            showNotif('Entered the DUNGEON! Fight through every room to reach the treasure!', true);
        }
        return;
    }
    if (!dg.active) return;

    // ── Room logic ──
    for (const room of dg.rooms) {
        if (room.type === 'entry' || room.type === 'treasure') continue;
        if (room.cleared) continue;
        if (!_playerInRoom(room)) continue;

        if (room.type === 'puzzle') {
            if (!room.spawned) { room.spawned = true; _initPuzzleRoom(room); }
            _updatePuzzleRoom(room);
        } else if (room.type === 'chest') {
            // Auto-clear on entry: drop gold, unlock children
            room.cleared = true;
            const center = _roomWorldCenter(room);
            for (let i = 0; i < 3; i++) {
                state.goldPickups.push({
                    x: center.x + (Math.random() - 0.5) * 60,
                    y: center.y + (Math.random() - 0.5) * 60,
                    amount: 30 + Math.floor(Math.random() * 40), life: 600,
                });
            }
            createExplosion(center.x, center.y, '#ffd700');
            dg.edges.forEach(e => { if (e.fromId === room.id) _unlockEdge(e); });
            showNotif('Chest room! Bonus gold collected!');
        } else {
            // battle or boss
            if (!room.spawned) {
                room.spawned = true;
                _spawnDungeonEnemies(room);
            } else if (_dungeonLivingEnemies(room.id) === 0) {
                room.cleared = true;
                createExplosion(_roomWorldCenter(room).x, _roomWorldCenter(room).y, '#69f0ae');
                dg.edges.forEach(e => { if (e.fromId === room.id) _unlockEdge(e); });
                showNotif(room.type === 'boss'
                    ? 'GUARDIAN DEFEATED! Treasure room unlocked!'
                    : 'Room cleared!');
            }
        }
    }

    // ── End chest (press E to open) ──
    const cooldownOver = state.frame - (dg._entryFrame || 0) > 60;
    if (!dg.endChest.opened && _playerInRoom(dg.rooms[dg.treasureId])) {
        const ec = dg.endChest;
        if (cooldownOver && Math.hypot(p.x - ec.x, p.y - ec.y) < 50 && state.keys['e']) {
            ec.opened = true;
            dg.cleared = true;
            for (let i = 0; i < 8; i++) {
                state.goldPickups.push({
                    x: ec.x + (Math.random() - 0.5) * 100,
                    y: ec.y + (Math.random() - 0.5) * 100,
                    amount: 200 + Math.floor(Math.random() * 150), life: 600,
                });
            }
            createExplosion(ec.x, ec.y, '#ffd700');
            state.pendingUpgradeCount++; updateUpgradeButton();
            showNotif('DUNGEON CLEARED! Treasure claimed!', true);
        }
    }

    // ── Exit ──
    if (cooldownOver) {
        if (Math.hypot(p.x - dg.exitPortalX, p.y - dg.exitPortalY) < 80 && state.keys['e']) {
            p.x = dg.returnX; p.y = dg.returnY;
            dg.active = false;
            state.camera.x = p.x - 400; state.camera.y = p.y - 300;
            if (dg._savedCrocs) { state.crocodiles = dg._savedCrocs; dg._savedCrocs = null; }
            state.enemies = [];
            showNotif('Escaped the dungeon! Welcome back.');
        }
    }
}

// ─── Drawing ───

function drawDungeonPortal(portalX, portalY, isExit, cx, cy) {
    const px = Math.round(portalX - cx), py = Math.round(portalY - cy);
    const t = state.frame;
    const glow = Math.sin(t * 0.05) * 0.15;
    const R = (x, y, w, h, col, a) => { ctx.globalAlpha = a !== undefined ? a : 1; ctx.fillStyle = col; ctx.fillRect(px+x, py+y, w, h); };
    ctx.save();
    R(-12,-20, 6,28,'#546e7a'); R(6,-20, 6,28,'#546e7a');
    R(-14,-24, 8, 6,'#455a64'); R(6,-24, 8, 6,'#455a64'); R(-6,-28,12, 6,'#455a64');
    R(-12,-20, 2,28,'#78909c'); R( 6,-20, 2,28,'#78909c');
    ctx.globalAlpha = 1;
    ctx.fillStyle = isExit ? `rgba(105,240,174,${0.45+glow})` : `rgba(124,77,255,${0.45+glow})`;
    ctx.fillRect(px-6, py-20, 12, 28);
    ctx.fillStyle = isExit ? `rgba(200,255,230,${0.3+glow})` : `rgba(200,180,255,${0.3+glow})`;
    ctx.fillRect(px-4, py-18+(t%20), 2, 6);
    ctx.fillRect(px+2, py-10+((t+10)%20), 2, 6);
    R(-14,8, 28,4,'#37474f');
    ctx.globalAlpha = 0.9;
    ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = isExit ? '#69f0ae' : '#b39ddb';
    ctx.fillText(isExit ? 'EXIT' : 'DUNGEON', px, py-32);
    ctx.restore();
}

function _drawDungeonDoor(edge, cx, cy) {
    if (edge.unlocked || !edge.doorTiles) return;
    const t = edge.doorTiles;
    const wx1 = (DUNGEON_ORIGIN.tx + Math.min(...t.map(d=>d.rx))) * TILE;
    const wy1 = (DUNGEON_ORIGIN.ty + Math.min(...t.map(d=>d.ry))) * TILE;
    const wx2 = (DUNGEON_ORIGIN.tx + Math.max(...t.map(d=>d.rx)) + 1) * TILE;
    const wy2 = (DUNGEON_ORIGIN.ty + Math.max(...t.map(d=>d.ry)) + 1) * TILE;
    const sx = wx1-cx, sy = wy1-cy, sw = wx2-wx1, sh = wy2-wy1;
    if (sx>860||sx+sw<-10||sy>660||sy+sh<-10) return;
    ctx.save();
    ctx.fillStyle = '#3a0a0a'; ctx.globalAlpha = 0.92;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = '#6d1515'; ctx.globalAlpha = 0.75;
    const vert = sh > sw;
    if (vert) { for (let i=1;i<=2;i++) ctx.fillRect(sx+2, sy+Math.round(sh*i/3)-2, sw-4, 4); }
    else      { for (let i=1;i<=2;i++) ctx.fillRect(sx+Math.round(sw*i/3)-2, sy+2, 4, sh-4); }
    ctx.strokeStyle='#7f2020'; ctx.lineWidth=2; ctx.globalAlpha=0.9;
    ctx.strokeRect(sx+1,sy+1,sw-2,sh-2);
    ctx.globalAlpha=1; ctx.fillStyle='#ffd700';
    ctx.font=`bold ${Math.min(sw,sh)<=16?8:10}px monospace`; ctx.textAlign='center';
    ctx.fillText('\uD83D\uDD12', sx+sw/2, sy+sh/2+3);
    ctx.restore();
}

function _drawEndChest(cx, cy) {
    const dg = state.dungeon;
    if (!dg || !dg.endChest || dg.endChest.opened) return;
    const ec = dg.endChest;
    const ex = Math.round(ec.x - cx), ey = Math.round(ec.y - cy);
    if (ex < -40 || ex > 860 || ey < -40 || ey > 660) return;
    const glow = 0.25 + Math.sin(state.frame * 0.1) * 0.15;
    ctx.save();
    // Glow halo
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(ex - 16, ey - 12, 32, 24);
    ctx.globalAlpha = 1;
    // Chest body
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(ex - 12, ey - 2, 24, 14);
    // Chest lid
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(ex - 12, ey - 10, 24, 10);
    // Gold trim
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(ex - 12, ey - 2, 24, 3);
    ctx.fillRect(ex - 2, ey - 10, 4, 24);
    // Lock
    ctx.fillStyle = '#ffcc02';
    ctx.fillRect(ex - 3, ey - 1, 6, 5);
    // Border
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
    ctx.strokeRect(ex - 12, ey - 10, 24, 22);
    // [E] hint when near
    if (Math.hypot(state.player.x - ec.x, state.player.y - ec.y) < 50) {
        ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('[E] Open', ex, ey + 26);
    }
    ctx.restore();
}

function drawDungeon() {
    if (!state.dungeon) return;
    const dg = state.dungeon;
    const cx = state.camera.x, cy = state.camera.y;
    const p2 = state.player;

    // World portal
    if (state.dungeonPortal && !state.dungeonPortal.used) {
        const dp = state.dungeonPortal;
        const sx = dp.x-cx, sy = dp.y-cy;
        if (sx>-60&&sx<860&&sy>-60&&sy<660) {
            drawDungeonPortal(dp.x, dp.y, false, cx, cy);
            if (Math.hypot(p2.x-dp.x, p2.y-dp.y) < 80) {
                ctx.save(); ctx.font='bold 8px monospace'; ctx.textAlign='center';
                ctx.fillStyle='#ede7f6'; ctx.fillText('[E] Enter', dp.x-cx, dp.y-cy+22);
                ctx.restore();
            }
        }
    }

    if (!dg.active) return;

    // Doors
    dg.edges.forEach(e => _drawDungeonDoor(e, cx, cy));

    // Puzzle room elements (all puzzle rooms)
    for (const room of dg.rooms) {
        if (room.type !== 'puzzle' || !room.spawned || !room.puzzleState || room.puzzleState.solved) continue;
        const pz = room.puzzleState;
        const ft = state.frame * 0.08;
        if (pz.type === 'plates') {
            pz.plates.forEach((pl, i) => {
                const px2=pl.x-cx, py2=pl.y-cy;
                const g = pl.active ? 1.0 : 0.4+Math.sin(ft+i)*0.2;
                ctx.save();
                ctx.globalAlpha=g; ctx.fillStyle=pl.active?'#69f0ae':'#37474f';
                ctx.fillRect(px2-14,py2-6,28,12);
                ctx.strokeStyle=pl.active?'#fff':'#78909c'; ctx.lineWidth=2;
                ctx.strokeRect(px2-14,py2-6,28,12);
                if (pl.active && pz.holdTimer>0) { ctx.fillStyle='#ffd700'; ctx.fillRect(px2-14,py2+8,28*(pz.holdTimer/180),3); }
                ctx.globalAlpha=0.9; ctx.fillStyle='#fff'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
                ctx.fillText(pz.plates.length>1?(i===0?'P1':'P2'):'HOLD', px2, py2+4);
                ctx.restore();
            });
        } else {
            pz.switches.forEach((sw, i) => {
                const px2=sw.x-cx, py2=sw.y-cy;
                ctx.save();
                ctx.globalAlpha=sw.activated?0.35:0.9;
                ctx.fillStyle=sw.activated?'#455a64':(i===pz.nextSwitch?'#ffd700':'#78909c');
                ctx.beginPath(); ctx.arc(px2,py2,12,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(px2,py2,12,0,Math.PI*2); ctx.stroke();
                ctx.fillStyle='#fff'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
                ctx.fillText(String(i+1), px2, py2+4);
                ctx.restore();
            });
        }
    }

    // End chest in treasure room
    _drawEndChest(cx, cy);

    // Exit portal in treasure room
    drawDungeonPortal(dg.exitPortalX, dg.exitPortalY, true, cx, cy);
    if (Math.hypot(p2.x-dg.exitPortalX, p2.y-dg.exitPortalY) < 80) {
        ctx.save(); ctx.font='bold 8px monospace'; ctx.textAlign='center';
        ctx.fillStyle='#69f0ae'; ctx.fillText('[E] Exit', dg.exitPortalX-cx, dg.exitPortalY-cy+22);
        ctx.restore();
    }

    // HUD: count only battle, puzzle, boss rooms
    const countable = r => r.type === 'battle' || r.type === 'puzzle' || r.type === 'boss';
    const total   = dg.rooms.filter(countable).length;
    const cleared = dg.rooms.filter(r => countable(r) && r.cleared).length;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(canvas.width/2-110,2,220,20);
    ctx.font='bold 7px monospace'; ctx.textAlign='center';
    ctx.fillStyle = dg.cleared ? '#69f0ae' : '#b39ddb';
    ctx.fillText('DUNGEON  '+cleared+'/'+total+' rooms  '+(dg.cleared?'\u2605 CLEARED':''), canvas.width/2, 15);
    ctx.restore();

    // Arrow toward nearest accessible uncleared battle/puzzle/boss room
    if (!dg.cleared) {
        let target = null, bestD = Infinity;
        for (const room of dg.rooms) {
            if (!countable(room) || room.cleared) continue;
            const ok = dg.edges.some(e => e.unlocked && (e.fromId===room.id||e.toId===room.id));
            if (!ok) continue;
            const rc = _roomWorldCenter(room);
            const d = Math.hypot(rc.x-p2.x, rc.y-p2.y);
            if (d < bestD) { bestD = d; target = room; }
        }
        if (target) {
            const nc = _roomWorldCenter(target);
            const ang = Math.atan2(nc.y-p2.y, nc.x-p2.x);
            ctx.save(); ctx.translate(p2.x-cx, p2.y-cy); ctx.rotate(ang);
            ctx.globalAlpha = 0.7+Math.sin(state.frame*0.12)*0.3;
            ctx.fillStyle='#ff7043'; ctx.font='bold 14px monospace'; ctx.textAlign='center';
            ctx.fillText('\u25B6', 30, 5);
            ctx.restore();
        }
    }
}
