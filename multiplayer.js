// ─── MULTIPLAYER ───
// WebRTC P2P via PeerJS. Host is authoritative; guests send inputs, host broadcasts state.

const MP = {
    active: false,
    isHost: false,
    peer: null,
    conns: [],            // DataConnection[] — host: one per guest; guest: one to host
    roomCode: '',
    friendlyFire: false,
    guestPlayers: [],     // host-side: ghost player objects for each guest
    _remoteHostPlayer: null,   // guest-side: last received host player info (for rendering)
    _remoteOtherGuests: [],    // guest-side: other guests (for rendering)
    _tick: 0,
    myPeerId: null,
    _forcedMapVariant: null,   // set before calling selectPet() in MP mode
    _forcedDifficulty: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

// Multiplier for enemy HP based on player count (+30% per extra player)
function mpDiffMult() {
    const extra = MP.active ? (MP.isHost ? MP.guestPlayers.length : MP._remoteOtherGuests.length) : 0;
    return 1 + extra * 0.30;
}

function _mpStatus(msg) {
    // Update whichever status element is visible
    const el = document.getElementById('mp-lobby-status') || document.getElementById('mp-status');
    if (el) el.textContent = msg;
}

// ── Lobby UI helpers ──────────────────────────────────────────────────────────

function mpShowLobby(isHost) {
    document.getElementById('mp-main-menu').classList.add('hidden');
    document.getElementById('mp-lobby-panel').classList.remove('hidden');
    document.getElementById('mp-host-controls').classList.toggle('hidden', !isHost);
    document.getElementById('mp-join-waiting').classList.toggle('hidden', isHost);
    document.getElementById('mp-room-display').classList.toggle('hidden', !isHost);
}

function mpUpdateLobbyUI() {
    const count = 1 + MP.conns.length;
    const listEl = document.getElementById('mp-player-list');
    if (!listEl) return;
    let html = `<div style="color:#aaa;margin-bottom:6px">Players: ${count} / 4</div>`;
    html += `<div style="color:#fff">&#9679; HOST (you)</div>`;
    MP.conns.forEach((c, i) => {
        html += `<div style="color:#ffd700">&#9679; PLAYER ${i + 2}</div>`;
    });
    listEl.innerHTML = html;
    const startBtn = document.getElementById('mp-start-btn');
    if (startBtn) startBtn.disabled = count < 2;
}

// ── Host ─────────────────────────────────────────────────────────────────────

function mpHostGame() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    MP.roomCode = code;
    MP.isHost = true;
    MP.active = true;
    MP.guestPlayers = [];

    _mpStatus('Creating room...');

    MP.peer = new Peer('pd-' + code, { debug: 0 });

    MP.peer.on('open', () => {
        MP.myPeerId = 'pd-' + code;
        document.getElementById('mp-code-display').textContent = code;
        _mpStatus('Share the code above with friends!');
        mpShowLobby(true);
        mpUpdateLobbyUI();
    });

    MP.peer.on('connection', conn => {
        if (MP.conns.length >= 3) { conn.close(); return; }
        MP.conns.push(conn);
        conn.on('open', () => {
            conn.send({ type: 'lobby', playerCount: MP.conns.length + 1 });
            mpUpdateLobbyUI();
        });
        conn.on('data', data => {
            if (data.type === 'input') mpHandleGuestInput(conn, data);
            if (data.type === 'joinInfo') mpRegisterGuest(conn, data);
        });
        conn.on('close', () => {
            MP.conns = MP.conns.filter(c => c !== conn);
            MP.guestPlayers = MP.guestPlayers.filter(g => g._peerId !== conn.peer);
            if (!state.gameOver) mpUpdateLobbyUI();
        });
        conn.on('error', () => { MP.conns = MP.conns.filter(c => c !== conn); });
    });

    MP.peer.on('error', err => {
        _mpStatus('Error: ' + err.type + '. Try again.');
        mpCleanup();
    });
}

function mpRegisterGuest(conn, data) {
    if (MP.guestPlayers.find(g => g._peerId === conn.peer)) return;
    const slot = MP.guestPlayers.length + 1;
    const offsets = [{ x: 0, y: -60 }, { x: 60, y: 0 }, { x: -60, y: 0 }];
    const off = offsets[slot - 1] || { x: 0, y: 0 };
    const gp = {
        x: WORLD_W / 2 + off.x,
        y: WORLD_H / 2 + off.y,
        hp: 100, maxHp: 100,
        speed: 3, damage: 10,
        facingX: 1, facingY: 0,
        animFrame: 0, animTimer: 0,
        dashing: false, dashTimer: 0, dashCooldown: 0,
        hurtTimer: 0, attackCooldown: 0,
        character: data.character || 'knight',
        skin: data.skin || 'default',
        isAlive: true,
        kills: 0,
        _peerId: conn.peer,
        _conn: conn,
        _latestInput: null,
        slot,
    };
    MP.guestPlayers.push(gp);
    mpUpdateLobbyUI();
}

function mpHandleGuestInput(conn, data) {
    const gp = MP.guestPlayers.find(g => g._peerId === conn.peer);
    if (gp) gp._latestInput = data;
}

function mpUpdateGuestPlayers() {
    if (!MP.active || !MP.isHost) return;
    for (const gp of MP.guestPlayers) {
        if (!gp.isAlive) continue;
        const inp = gp._latestInput;
        if (!inp) continue;

        // Movement
        let dx = 0, dy = 0;
        if (inp.keys['w'] || inp.keys['arrowup']) dy -= 1;
        if (inp.keys['s'] || inp.keys['arrowdown']) dy += 1;
        if (inp.keys['a'] || inp.keys['arrowleft']) dx -= 1;
        if (inp.keys['d'] || inp.keys['arrowright']) dx += 1;
        if (inp.joyDir) { dx += inp.joyDir.x; dy += inp.joyDir.y; }
        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy); dx /= len; dy /= len;
            let spd = gp.speed;
            if (gp.dashing) spd *= 3;
            const nx = gp.x + dx * spd, ny = gp.y + dy * spd;
            if (getTerrainAt(nx, gp.y) !== 'void') gp.x = nx;
            if (getTerrainAt(gp.x, ny) !== 'void') gp.y = ny;
            gp.x = Math.max(TILE, Math.min(WORLD_W - TILE, gp.x));
            gp.y = Math.max(TILE, Math.min(WORLD_H - TILE, gp.y));
            gp.facingX = dx; gp.facingY = dy;
            gp.animTimer++; if (gp.animTimer % 10 === 0) gp.animFrame = 1 - gp.animFrame;
        }

        // Dash
        if (inp.dashing && !gp.dashing && gp.dashCooldown <= 0) {
            gp.dashing = true; gp.dashTimer = 12; gp.dashCooldown = 40;
        }
        if (gp.dashing) { gp.dashTimer--; if (gp.dashTimer <= 0) gp.dashing = false; }
        if (gp.dashCooldown > 0) gp.dashCooldown--;
        if (gp.hurtTimer > 0) gp.hurtTimer--;
        if (gp.attackCooldown > 0) gp.attackCooldown--;

        // Attack
        if (inp.attacking && gp.attackCooldown <= 0) {
            gp.attackCooldown = 20;
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - gp.x, e.y - gp.y) < 40) {
                    e.hp -= gp.damage; e.hurtTimer = 12; gp.kills++;
                    state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(gp.damage), life: 50, vy: -1.5, crit: false });
                }
            });
            if (MP.friendlyFire) {
                const hp = state.player;
                if (Math.hypot(hp.x - gp.x, hp.y - gp.y) < 40) { hp.hp -= gp.damage * 0.5; hp.hurtTimer = 12; }
                MP.guestPlayers.forEach(other => {
                    if (other === gp || !other.isAlive) return;
                    if (Math.hypot(other.x - gp.x, other.y - gp.y) < 40) { other.hp -= gp.damage * 0.5; other.hurtTimer = 12; }
                });
            }
        }

        // Gold pickup — adds to shared pool (host's gold)
        for (let i = state.goldPickups.length - 1; i >= 0; i--) {
            const g = state.goldPickups[i];
            if (Math.hypot(g.x - gp.x, g.y - gp.y) < 24) {
                state.player.gold = (state.player.gold || 0) + g.amount;
                state.player.totalGoldEarned = (state.player.totalGoldEarned || 0) + g.amount;
                state.goldPickups.splice(i, 1);
            }
        }

        // Enemy contact damage
        state.enemies.forEach(e => {
            if (gp.hurtTimer > 0 || !e.damage) return;
            if (Math.hypot(e.x - gp.x, e.y - gp.y) < 24) {
                gp.hp -= e.damage; gp.hurtTimer = 40;
                state.screenShakeMag = 4; state.screenShakeDur = 8;
            }
        });

        // Death
        if (gp.hp <= 0 && gp.isAlive) {
            gp.isAlive = false;
            try { gp._conn.send({ type: 'died' }); } catch(e) {}
            showNotif('A player has fallen!');
            createExplosion(gp.x, gp.y, '#ff4444');
        }
    }
}

function mpBroadcastState() {
    if (!MP.active || !MP.isHost || MP.conns.length === 0) return;
    MP._tick++;
    if (MP._tick % 3 !== 0) return; // ~20 snapshots/sec at 60fps
    const p = state.player;
    const snap = {
        type: 'state',
        hp: { x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, gold: p.gold, fx: p.facingX, af: p.animFrame, d: p.dashing, ch: p.character },
        gp: MP.guestPlayers.map(g => ({ id: g._peerId, x: g.x, y: g.y, hp: g.hp, mhp: g.maxHp, fx: g.facingX, af: g.animFrame, d: g.dashing, a: g.isAlive, ch: g.character, sk: g.skin, sl: g.slot })),
        en: state.enemies.map(e => ({ x: e.x, y: e.y, hp: e.hp, mhp: e.maxHp || e.hp, type: e.type, fx: e.facingX, at: e.animTimer % 60, boss: e.isBoss, ht: e.hurtTimer > 0 })),
        gld: state.goldPickups.slice(0, 40).map(g => ({ x: g.x, y: g.y, a: g.amount })),
        wave: p.wave, kills: p.kills,
        boss: state.bossActive,
        wx: { s: state.weather.stage },
        dn: { ph: state.dayNight.phase, al: state.dayNight.alpha, day: state.dayNight.dayCount },
    };
    for (const conn of MP.conns) {
        try { conn.send(snap); } catch(e) {}
    }
}

function mpStartGame() {
    const mapVariant = document.getElementById('mp-map-select').value || 'normal';
    const difficulty = document.getElementById('mp-diff-select').value || 'normal';
    const ff = document.getElementById('mp-ff-toggle').checked;
    MP.friendlyFire = ff;
    MP._forcedMapVariant = mapVariant;

    const startMsg = { type: 'startGame', mapVariant, difficulty, ff };
    MP.guestPlayers.forEach((gp, i) => {
        try { gp._conn.send({ ...startMsg, slot: i + 1 }); } catch(e) {}
    });

    mpHideOverlay();
    // Apply difficulty
    state.difficulty = difficulty;
    const diffs = { easy: { enemyHpMult: 0.6, enemySpeedMult: 0.85, goldMult: 1.3, playerHpMult: 1.3 }, normal: { enemyHpMult: 1.0, enemySpeedMult: 1.0, goldMult: 1.0, playerHpMult: 1.0 }, hard: { enemyHpMult: 1.4, enemySpeedMult: 1.15, goldMult: 0.8, playerHpMult: 0.75 }, extreme: { enemyHpMult: 2.0, enemySpeedMult: 1.3, goldMult: 0.6, playerHpMult: 0.5 } };
    state.diffMult = diffs[difficulty] || diffs.normal;
    selectPet(persist.selectedPet || 'dog');
}

// ── Guest ─────────────────────────────────────────────────────────────────────

function mpJoinGame(code) {
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length < 6) { _mpStatus('Enter a 6-character code.'); return; }
    MP.roomCode = code;
    MP.isHost = false;
    MP.active = true;
    _mpStatus('Connecting...');

    MP.peer = new Peer({ debug: 0 });
    MP.peer.on('open', myId => {
        MP.myPeerId = myId;
        const conn = MP.peer.connect('pd-' + code, { reliable: false });
        MP.conns = [conn];
        conn.on('open', () => {
            _mpStatus('Connected! Waiting for host to start...');
            mpShowLobby(false);
            conn.send({ type: 'joinInfo', character: persist.selectedCharacter || 'knight', skin: persist.selectedSkin || 'default' });
        });
        conn.on('data', data => {
            if (data.type === 'lobby') _mpStatus('In lobby — ' + data.playerCount + ' player(s) connected');
            if (data.type === 'startGame') mpGuestStartGame(data);
            if (data.type === 'state') mpApplyState(data);
            if (data.type === 'died') { if (state.player) state.player.hp = 0; }
        });
        conn.on('close', () => { showNotif('Disconnected from host.'); MP.active = false; });
        conn.on('error', () => { _mpStatus('Connection failed.'); });
    });
    MP.peer.on('error', err => {
        _mpStatus('Could not connect: ' + err.type);
        mpCleanup();
    });
}

function mpGuestStartGame(data) {
    MP._forcedMapVariant = data.mapVariant || 'normal';
    MP._forcedDifficulty = data.difficulty || 'normal';
    MP.friendlyFire = data.ff || false;
    document.getElementById('mp-overlay').classList.add('hidden');
    state.difficulty = MP._forcedDifficulty;
    const diffs = { easy: { enemyHpMult: 0.6, enemySpeedMult: 0.85, goldMult: 1.3, playerHpMult: 1.3 }, normal: { enemyHpMult: 1.0, enemySpeedMult: 1.0, goldMult: 1.0, playerHpMult: 1.0 }, hard: { enemyHpMult: 1.4, enemySpeedMult: 1.15, goldMult: 0.8, playerHpMult: 0.75 }, extreme: { enemyHpMult: 2.0, enemySpeedMult: 1.3, goldMult: 0.6, playerHpMult: 0.5 } };
    state.diffMult = diffs[MP._forcedDifficulty] || diffs.normal;
    selectPet(persist.selectedPet || 'dog');
}

function mpSendInputs() {
    if (!MP.active || MP.isHost || !MP.conns[0]) return;
    try {
        MP.conns[0].send({
            type: 'input',
            frame: state.frame,
            keys: { ...state.keys },
            joyDir: state.joyDir,
            attacking: state._mpAttacking || false,
            dashing: state._mpDashing || false,
        });
    } catch(e) {}
    state._mpAttacking = false;
    state._mpDashing = false;
}

function mpApplyState(snap) {
    MP._remoteHostPlayer = snap.hp;
    MP._remoteOtherGuests = (snap.gp || []).filter(g => g.id !== MP.myPeerId);

    // Apply enemies (guest renders host's enemy positions)
    if (snap.en) {
        state.enemies = snap.en.map(e => ({
            x: e.x, y: e.y, hp: e.hp, maxHp: e.mhp, type: e.type,
            facingX: e.fx, animTimer: e.at, isBoss: e.boss,
            hurtTimer: e.ht ? 5 : 0, speed: 0, gold: 0,
        }));
    }
    // Sync shared gold
    if (state.player && snap.hp) state.player.gold = snap.hp.gold;
    if (state.player) { state.player.wave = snap.wave; state.player.kills = snap.kills; }
    state.bossActive = snap.boss;
    if (snap.dn) { state.dayNight.alpha = snap.dn.al; state.dayNight.phase = snap.dn.ph; state.dayNight.dayCount = snap.dn.day; }
    if (snap.wx) state.weather.stage = snap.wx.s;
    if (snap.gld) state.goldPickups = snap.gld.map(g => ({ x: g.x, y: g.y, amount: g.a, life: 60 }));
}

// ── Remote player rendering ───────────────────────────────────────────────────
// Draws remote players using the real drawPlayer() logic by temporarily swapping
// state.player and persist.selectedSkin, then restoring them.

function drawRemotePlayers() {
    if (!MP.active) return;

    const remotes = [];
    if (MP.isHost) {
        for (const gp of MP.guestPlayers) {
            if (gp.isAlive) remotes.push({
                x: gp.x, y: gp.y, hp: gp.hp, maxHp: gp.maxHp,
                facingX: gp.facingX, facingY: 0, animFrame: gp.animFrame,
                dashing: gp.dashing, character: gp.character, skin: gp.skin,
                label: 'P' + (gp.slot + 1),
            });
        }
    } else {
        if (MP._remoteHostPlayer) {
            const h = MP._remoteHostPlayer;
            remotes.push({ x: h.x, y: h.y, hp: h.hp, maxHp: h.maxHp, facingX: h.fx, facingY: 0, animFrame: h.af, dashing: h.d, character: h.ch, skin: persist.selectedSkin || 'default', label: 'P1' });
        }
        for (const g of (MP._remoteOtherGuests || [])) {
            if (g.a) remotes.push({ x: g.x, y: g.y, hp: g.hp, maxHp: g.mhp, facingX: g.fx, facingY: 0, animFrame: g.af, dashing: g.d, character: g.ch, skin: g.sk || 'default', label: 'P' + (g.sl + 1) });
        }
    }

    // Save real player + skin
    const _realPlayer = state.player;
    const _realSkin = persist.selectedSkin;

    for (const rp of remotes) {
        // Temporarily swap state.player so drawPlayer() draws this remote player
        state.player = {
            ..._realPlayer,           // inherit all fields (weapon, upgrades, etc. not shown)
            x: rp.x, y: rp.y,
            hp: rp.hp, maxHp: rp.maxHp,
            facingX: rp.facingX, facingY: rp.facingY,
            animFrame: rp.animFrame,
            dashing: rp.dashing,
            character: rp.character,
            hurtTimer: 0,
            ninjaInvisible: false,
            sizeScale: 1,
        };
        persist.selectedSkin = rp.skin || 'default';
        persist.selectedCharacter = rp.character || 'knight';

        ctx.globalAlpha = rp.dashing ? 0.55 : 0.92;
        drawPlayer(); // full character art, correct skin
        ctx.globalAlpha = 1;

        // Name label above
        const sx = rp.x - state.camera.x, sy = rp.y - state.camera.y;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(rp.label, sx, sy - 32);

        // HP bar below
        if (rp.maxHp > 0 && rp.hp < rp.maxHp) {
            const bw = 28, bh = 3, bx = sx - bw / 2, by = sy + 14;
            ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#4caf50'; ctx.fillRect(bx, by, bw * Math.max(0, rp.hp / rp.maxHp), bh);
        }
    }

    // Restore real player + skin
    state.player = _realPlayer;
    persist.selectedSkin = _realSkin;
    persist.selectedCharacter = _realPlayer.character;
    ctx.textAlign = 'left';
}

// ── Disconnect / Cleanup ──────────────────────────────────────────────────────

function mpHideOverlay() {
    document.getElementById('mp-overlay').classList.add('hidden');
}

function mpDisconnect() {
    mpCleanup();
    mpHideOverlay();
    document.getElementById('mp-main-menu').classList.remove('hidden');
    document.getElementById('mp-lobby-panel').classList.add('hidden');
    document.getElementById('difficulty-overlay').classList.remove('hidden');
}

function mpCleanup() {
    if (MP.peer) { try { MP.peer.destroy(); } catch(e) {} MP.peer = null; }
    MP.active = false; MP.isHost = false; MP.conns = []; MP.guestPlayers = [];
    MP._remoteHostPlayer = null; MP._remoteOtherGuests = []; MP._tick = 0;
    MP._forcedMapVariant = null; MP._forcedDifficulty = null; MP.roomCode = '';
}
