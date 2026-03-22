// ─── DUNGEON SYSTEM ───
// Portal in world → teleport to carved dungeon area (far corner of world map).
// Layout (tile coords relative to DUNGEON_ORIGIN):
//   Row1: [ENTRY 1,1,10,8] --H-corr-- [BATTLE1 13,1,11,8]
//                                           |V-corr|
//   Row2: [TREASURE 1,11,12,9] --H-corr-- [BATTLE2 15,11,11,9] --H-corr-- [BATTLE3 28,11,11,9]
//
// Total area: 40w × 22h tiles = 1280×704px at world pos (3424, 2688)

const DUNGEON_ORIGIN = { tx: 107, ty: 84 };  // world tile origin of dungeon area

// Rooms: [relTX, relTY, widthTiles, heightTiles, type]
//   type: 'entry'|'battle'|'treasure'
const DUNGEON_ROOMS = [
    { id: 0, rx: 1,  ry: 1,  rw: 10, rh: 8,  type: 'entry'    },
    { id: 1, rx: 13, ry: 1,  rw: 11, rh: 8,  type: 'battle'   },
    { id: 2, rx: 15, ry: 11, rw: 11, rh: 9,  type: 'battle'   },
    { id: 3, rx: 28, ry: 11, rw: 11, rh: 9,  type: 'battle'   },
    { id: 4, rx: 1,  ry: 11, rw: 12, rh: 9,  type: 'treasure' },
];

// Corridors: [relTX, relTY, relTX2, relTY2] — fills min→max in each axis, 3-tile wide
const DUNGEON_CORRIDORS = [
    [10, 3, 13, 6],   // Entry → Battle1 (horizontal)
    [16, 9, 19, 11],  // Battle1 → Battle2 (vertical)
    [26, 13, 28, 17], // Battle2 → Battle3 (horizontal)
    [3,  9,  7, 11],  // Entry → Treasure (vertical)
];

function _dtile(relTX, relTY, type) {
    const aty = DUNGEON_ORIGIN.ty + relTY;
    const atx = DUNGEON_ORIGIN.tx + relTX;
    if (terrainMap[aty]) terrainMap[aty][atx] = type;
}

function _roomWorldCenter(room) {
    return {
        x: (DUNGEON_ORIGIN.tx + room.rx + Math.floor(room.rw / 2)) * TILE,
        y: (DUNGEON_ORIGIN.ty + room.ry + Math.floor(room.rh / 2)) * TILE,
    };
}

function _playerInRoom(room) {
    const p = state.player;
    const minX = (DUNGEON_ORIGIN.tx + room.rx) * TILE;
    const maxX = (DUNGEON_ORIGIN.tx + room.rx + room.rw) * TILE;
    const minY = (DUNGEON_ORIGIN.ty + room.ry) * TILE;
    const maxY = (DUNGEON_ORIGIN.ty + room.ry + room.rh) * TILE;
    return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

function generateDungeon() {
    // 15% chance per run to spawn a dungeon portal (0 otherwise, rare chance of 2)
    state.dungeonPortal = null;
    state.dungeon = null;
    const roll = Math.random();
    if (roll > 0.15) return; // no dungeon this run

    const AREA_W = 40, AREA_H = 22;

    // Fill dungeon area with void
    for (let ry = 0; ry < AREA_H; ry++) {
        for (let rx = 0; rx < AREA_W; rx++) {
            _dtile(rx, ry, 'void');
        }
    }

    // Carve rooms
    DUNGEON_ROOMS.forEach(room => {
        for (let ry = room.ry; ry < room.ry + room.rh; ry++) {
            for (let rx = room.rx; rx < room.rx + room.rw; rx++) {
                _dtile(rx, ry, 'stone');
            }
        }
    });

    // Carve corridors
    DUNGEON_CORRIDORS.forEach(([x1, y1, x2, y2]) => {
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        for (let ry = minY; ry <= maxY; ry++) {
            for (let rx = minX; rx <= maxX; rx++) {
                _dtile(rx, ry, 'stone');
            }
        }
    });

    // Place dungeon portal in the open world (random position, not too close to player start)
    const angle = Math.random() * Math.PI * 2;
    const dist = 600 + Math.random() * 400;
    const portalX = Math.max(300, Math.min(WORLD_W - 300, WORLD_W / 2 + Math.cos(angle) * dist));
    const portalY = Math.max(300, Math.min(WORLD_H - 300, WORLD_H / 2 + Math.sin(angle) * dist));

    const entryCenter = _roomWorldCenter(DUNGEON_ROOMS[0]);

    state.dungeonPortal = { x: portalX, y: portalY, used: false };
    state.dungeon = {
        active: false,           // player is currently in dungeon
        entryX: entryCenter.x,  // where player spawns on dungeon entry
        entryY: entryCenter.y,
        returnX: portalX,        // where player returns when exiting
        returnY: portalY,
        roomsCleared: [false, false, false], // battle rooms 1/2/3
        treasureOpened: false,
        cleared: false,
        _spawned: [false, false, false],     // enemies spawned for each battle room
    };
}

function _spawnDungeonEnemies(roomIndex) {
    const room = DUNGEON_ROOMS[roomIndex + 1]; // +1 because room 0 is entry
    const center = _roomWorldCenter(room);
    const p = state.player;
    const TYPES = ['slime', 'skeleton', 'wraith', 'imp', 'vampire', 'spider', 'troll', 'golem'];
    const count = 5 + roomIndex * 2 + Math.floor(p.wave / 3);
    const isBossRoom = roomIndex === 2; // last battle room has a mini-boss
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const r = 60 + Math.random() * 50;
        const ex = center.x + Math.cos(angle) * r;
        const ey = center.y + Math.sin(angle) * r;
        const typeKey = TYPES[Math.floor(Math.random() * TYPES.length)];
        const base = ENEMY_TYPES.find(t => t.id === typeKey) || ENEMY_TYPES[0];
        const hpMult = 1.5 + p.wave * 0.08;
        const hp = Math.round((base.hp || 40) * hpMult);
        const enemy = { ...base, x: ex, y: ey, hp, maxHp: hp,
            gold: Math.round((base.gold || 5) * 2), score: (base.score || 20) * 2,
            _dungeonRoom: roomIndex, elite: roomIndex >= 1 };
        if (isBossRoom && i === 0) {
            enemy.isBoss = false; enemy.mod = true; enemy.elite = true;
            enemy.hp = Math.round(hp * 2.5); enemy.maxHp = enemy.hp;
            enemy.sizeScale = 1.5;
        }
        state.enemies.push(enemy);
    }
}

function _dungeonLivingEnemies(roomIndex) {
    return state.enemies.filter(e => e._dungeonRoom === roomIndex).length;
}

function updateDungeon() {
    const p = state.player;
    const dg = state.dungeon;

    if (!dg) return;

    // ─── WORLD PORTAL ───
    if (!dg.active && !state.dungeonPortal.used) {
        const dp = state.dungeonPortal;
        if (Math.hypot(p.x - dp.x, p.y - dp.y) < 28) {
            // Enter dungeon
            dp.used = true;
            dg.active = true;
            dg.returnX = p.x;
            dg.returnY = p.y;
            // Teleport player to dungeon entry room
            p.x = dg.entryX; p.y = dg.entryY;
            state.camera.x = p.x - 400; state.camera.y = p.y - 300;
            showNotif('Entered the DUNGEON! Fight your way to the treasure!', true);
        }
        return;
    }

    if (!dg.active) return;

    // ─── IN DUNGEON ───

    // Check each battle room for entry (spawn enemies) and clearing
    for (let ri = 0; ri < 3; ri++) {
        const room = DUNGEON_ROOMS[ri + 1]; // +1 for entry room offset
        if (dg.roomsCleared[ri]) continue;

        if (_playerInRoom(room)) {
            if (!dg._spawned[ri]) {
                dg._spawned[ri] = true;
                _spawnDungeonEnemies(ri);
                showNotif('Battle room ' + (ri + 1) + '/3! Clear all enemies!');
            }
            // Check cleared
            if (dg._spawned[ri] && _dungeonLivingEnemies(ri) === 0) {
                dg.roomsCleared[ri] = true;
                if (ri < 2) {
                    createExplosion(_roomWorldCenter(room).x, _roomWorldCenter(room).y, '#69f0ae');
                    showNotif('Room ' + (ri + 1) + ' cleared!');
                }
            }
        }
    }

    // All 3 battle rooms cleared → spawn treasure chest in treasure room
    const allCleared = dg.roomsCleared.every(c => c);
    if (allCleared && !dg.cleared) {
        dg.cleared = true;
        const tr = _roomWorldCenter(DUNGEON_ROOMS[4]);
        state.treasureChests.push({ x: tr.x, y: tr.y, opened: false, openedTimer: 0, isMimic: false, loot: 'dungeon' });
        // Also scatter generous gold
        for (let i = 0; i < 5; i++) {
            state.goldPickups.push({
                x: tr.x + (Math.random() - 0.5) * 80,
                y: tr.y + (Math.random() - 0.5) * 80,
                amount: 150 + Math.floor(Math.random() * 100),
                life: 600
            });
        }
        // Bonus upgrade slot
        state.pendingUpgradeCount++; updateUpgradeButton();
        showNotif('DUNGEON CLEARED! Claim your treasure!', true);
    }

    // Exit: player back in entry room AND all rooms cleared (or they choose to leave)
    const entryRoom = DUNGEON_ROOMS[0];
    if (_playerInRoom(entryRoom) && dg._spawned.some(s => s)) {
        // Show exit hint
        if (dg.cleared && Math.hypot(p.x - dg.entryX, p.y - dg.entryY) < 40) {
            // Exit portal — teleport back to world
            p.x = dg.returnX; p.y = dg.returnY;
            dg.active = false;
            state.camera.x = p.x - 400; state.camera.y = p.y - 300;
            showNotif('Escaped the dungeon! Welcome back.');
        }
    }
}

function drawDungeonPortal(portalX, portalY, label, cx, cy) {
    const px = portalX - cx, py = portalY - cy;
    const t = state.frame * 0.06;
    ctx.save();
    // Outer glow ring
    ctx.globalAlpha = 0.35 + Math.sin(t) * 0.15;
    ctx.strokeStyle = '#7c4dff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, 20 + Math.sin(t * 1.3) * 4, 0, Math.PI * 2); ctx.stroke();
    // Inner swirl (3 arcs rotating)
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 3; i++) {
        const ang = t + i * (Math.PI * 2 / 3);
        ctx.strokeStyle = i === 0 ? '#b39ddb' : i === 1 ? '#7c4dff' : '#311b92';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 10 + i * 4, ang, ang + Math.PI * 1.2); ctx.stroke();
    }
    // Center dot
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ede7f6';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    // Label
    ctx.globalAlpha = 0.9 + Math.sin(t * 1.5) * 0.1;
    ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#b39ddb';
    ctx.fillText(label, px, py - 26);
    ctx.restore();
}

function drawDungeon() {
    if (!state.dungeon) return;
    const dg = state.dungeon;
    const cx = state.camera.x, cy = state.camera.y;

    // World portal (if not used)
    if (state.dungeonPortal && !state.dungeonPortal.used) {
        const dp = state.dungeonPortal;
        const screen = { x: dp.x - cx, y: dp.y - cy };
        if (screen.x > -60 && screen.x < 860 && screen.y > -60 && screen.y < 660) {
            drawDungeonPortal(dp.x, dp.y, '⚔ DUNGEON PORTAL', cx, cy);
            const d = Math.hypot(state.player.x - dp.x, state.player.y - dp.y);
            if (d < 120) {
                ctx.save(); ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
                ctx.fillStyle = '#ede7f6'; ctx.fillText('Step in to enter', dp.x - cx, dp.y - cy + 20);
                ctx.restore();
            }
        }
    }

    // Dungeon interior: exit portal in entry room
    if (dg.active) {
        drawDungeonPortal(dg.entryX, dg.entryY, dg.cleared ? 'EXIT ▶' : 'EXIT (clear all rooms)', cx, cy);

        // Dungeon HUD (top-center of screen)
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(canvas.width / 2 - 90, 2, 180, 20);
        ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#b39ddb';
        const roomStatus = dg.roomsCleared.map((c, i) => c ? '✓' : (dg._spawned[i] ? '⚔' : '○')).join('  ');
        ctx.fillText('DUNGEON  ' + roomStatus + '  ' + (dg.cleared ? '✓CLEARED' : ''), canvas.width / 2, 15);
        ctx.restore();

        // Arrow to nearest uncompleted room while in entry room
        const entryRoom = DUNGEON_ROOMS[0];
        if (_playerInRoom(entryRoom) && !dg.cleared) {
            const nextRI = dg.roomsCleared.findIndex(c => !c);
            if (nextRI >= 0) {
                const nextRoom = DUNGEON_ROOMS[nextRI + 1];
                const nc = _roomWorldCenter(nextRoom);
                const sx = nc.x - cx, sy = nc.y - cy;
                const px = state.player.x - cx, py = state.player.y - cy;
                const ang = Math.atan2(sy - py, sx - px);
                ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
                ctx.globalAlpha = 0.7 + Math.sin(state.frame * 0.12) * 0.3;
                ctx.fillStyle = '#ff7043'; ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center'; ctx.fillText('▶', 30, 5);
                ctx.restore();
            }
        }
    }
}
