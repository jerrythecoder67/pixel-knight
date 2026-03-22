// ─── MULTIPLAYER ───
// Flow: confirm → difficulty/char/skin/pet → choice (create/join) → lobby/join screen → game

const MP = {
    active: false,
    isHost: false,
    gameStarted: false,       // true only after mpStartGame/mpGuestStartGame — lobby doesn't count
    peer: null,
    conns: [],
    roomCode: '',
    friendlyFire: false,
    playerName: '',
    guestPlayers: [],         // host-side ghost players for each guest
    _remoteHostPlayer: null,  // guest-side: last received host info
    _remoteOtherGuests: [],   // guest-side: other guests
    _tick: 0,
    myPeerId: null,
    _forcedMapVariant: null,
    _forcedDifficulty: null,
    _spectating: false,       // guest is dead, watching the host
    _respawnUsed: false,      // guest already used their 1 respawn
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mpDiffMult() {
    const extra = MP.active ? (MP.isHost ? MP.guestPlayers.length : MP._remoteOtherGuests.length) : 0;
    return 1 + extra * 0.30;
}

function _mpHide(...ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }); }
function _mpShow(...ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }); }

// Draw a character preview into a mini canvas element (top-half of character)
function mpDrawCharacterPreview(canvas, character, skin) {
    if (!canvas || !ctx) return;
    const pCtx = canvas.getContext('2d');
    // Reset any accumulated transform from previous draws before clearing/scaling
    pCtx.setTransform(1, 0, 0, 1, 0, 0);
    pCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Temporarily swap globals so drawPlayer() renders into this mini canvas
    const _oldCtx = ctx; const _oldPlayer = state.player;
    const _oldCamera = state.camera; const _oldSkin = persist.selectedSkin;
    const _oldChar = persist.selectedCharacter;

    try {
        ctx = pCtx;
        state.camera = { x: 0, y: 0 };
        // Scale up 2.5x so the pixel art character fills the preview
        const scale = 2.5;
        pCtx.scale(scale, scale);
        // Position: head top at ~14px above player.y; with scale=2.5 and canvas 90x100,
        // logical coords are 36x40. Place player at (18, 28) → head at (18, 14), feet at (18, 44).
        const lx = canvas.width / 2 / scale;
        const ly = canvas.height * 0.7 / scale;
        state.player = {
            ..._oldPlayer, x: lx, y: ly,
            facingX: 1, facingY: 0, animFrame: 0, dashing: false,
            hurtTimer: 0, ninjaInvisible: false, sizeScale: 1,
            character, pet: null,
        };
        persist.selectedSkin = skin || 'default';
        persist.selectedCharacter = character || 'knight';
        drawPlayer();
    } catch(e) {
        // Fallback: draw a simple colored box with initial
        pCtx.fillStyle = '#2e7d32';
        pCtx.fillRect(0, 0, canvas.width, canvas.height);
        pCtx.fillStyle = '#fff';
        pCtx.font = 'bold 20px monospace';
        pCtx.textAlign = 'center';
        pCtx.textBaseline = 'middle';
        pCtx.fillText((character || '?')[0].toUpperCase(), canvas.width / 2, canvas.height / 2);
        pCtx.textBaseline = 'alphabetic';
    } finally {
        ctx = _oldCtx; state.player = _oldPlayer; state.camera = _oldCamera;
        persist.selectedSkin = _oldSkin; persist.selectedCharacter = _oldChar;
    }
}

function mpUpdateSlots(slots, containerId) {
    // slots: array of {name, character, skin, you, label} or null for empty
    // containerId: 'mp-slot-0' etc. (host lobby) or builds inside containerId (guest)
    for (let i = 0; i < 4; i++) {
        const wrap = document.getElementById('mp-slot-' + i);
        if (!wrap) continue;
        const s = slots[i];
        const box = wrap.querySelector('.mp-slot-box');
        const canvas = wrap.querySelector('.mp-slot-canvas');
        const nameEl = wrap.querySelector('.mp-slot-name');
        const labelEl = wrap.querySelector('.mp-slot-label');
        if (!box) continue;

        if (!s) {
            box.className = 'mp-slot-box empty';
            box.innerHTML = '+'; // canvas replaced with +
            if (nameEl) nameEl.textContent = '';
            if (labelEl) labelEl.textContent = '';
        } else {
            box.className = 'mp-slot-box ' + (s.you ? 'you' : 'occupied');
            // Restore canvas if it was replaced
            if (!box.querySelector('canvas')) {
                const c = document.createElement('canvas');
                c.className = 'mp-slot-canvas'; c.width = 90; c.height = 100;
                box.innerHTML = ''; box.appendChild(c);
            }
            const cv = box.querySelector('canvas');
            if (cv) mpDrawCharacterPreview(cv, s.character || 'knight', s.skin || 'default');
            if (nameEl) nameEl.textContent = s.name || 'Player';
            if (labelEl) { labelEl.textContent = s.label || ''; labelEl.style.color = s.you ? '#ffd700' : '#aaa'; }
        }
    }
}

// ── Step 1: Confirmation ──────────────────────────────────────────────────────

function mpConfirmYes() {
    state.mpMode = true;
    _mpHide('mp-confirm-overlay');
    _mpShow('difficulty-overlay');
    // Hide the MULTIPLAYER button — already in MP flow
    const mpBtn = document.getElementById('mp-open-btn');
    if (mpBtn) mpBtn.style.display = 'none';
}

function mpConfirmNo() {
    state.mpMode = false;
    _mpHide('mp-confirm-overlay');
    _mpShow('difficulty-overlay');
}

// ── Step 2: After pet select — show choice overlay ────────────────────────────
// Called from selectPet() when state.mpMode is true

function mpShowChoice() {
    state.paused = true;
    _mpHide('pet-overlay');
    _mpShow('mp-choice-overlay');
    const nameInput = document.getElementById('mp-name-input');
    if (nameInput && !nameInput.value) nameInput.value = persist.selectedCharacter || 'Player';
}

function mpChoiceBack() {
    // Return to pet select
    _mpHide('mp-choice-overlay');
    _mpShow('pet-overlay');
    state.paused = false;
}

// ── Step 3a: Join flow ────────────────────────────────────────────────────────

function mpGoJoin() {
    MP.playerName = (document.getElementById('mp-name-input').value || 'Player').slice(0, 12);
    _mpHide('mp-choice-overlay');
    _mpShow('mp-join-overlay');
    document.getElementById('mp-join-status').textContent = '';
    const inp = document.getElementById('mp-code-input');
    if (inp) { inp.value = ''; inp.focus(); }
}

function mpJoinBack() {
    _mpHide('mp-join-overlay');
    _mpShow('mp-choice-overlay');
    mpCleanup();
}

function mpConnectToHost() {
    const raw = (document.getElementById('mp-code-input').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length < 6) { document.getElementById('mp-join-status').textContent = 'Enter a 6-character code.'; return; }
    MP.roomCode = raw;
    MP.isHost = false;
    MP.active = true;
    document.getElementById('mp-join-status').textContent = 'Connecting...';

    MP.peer = new Peer({ debug: 0 });
    MP.peer.on('open', myId => {
        MP.myPeerId = myId;
        const conn = MP.peer.connect('pd-' + raw, { reliable: false });
        MP.conns = [conn];
        conn.on('open', () => {
            document.getElementById('mp-join-status').textContent = 'Connected! Waiting for host...';
            conn.send({ type: 'joinInfo', name: MP.playerName, character: persist.selectedCharacter || 'knight', skin: persist.selectedSkin || 'default' });
            // Switch to guest waiting overlay
            _mpHide('mp-join-overlay');
            _mpShow('mp-guest-overlay');
            document.getElementById('mp-guest-status').textContent = 'Connected! Waiting for host to start...';
            // Show guest slots (just show yourself for now)
            _mpUpdateGuestSlots([{ name: MP.playerName, character: persist.selectedCharacter || 'knight', you: true }]);
        });
        conn.on('data', data => {
            if (data.type === 'lobbyUpdate') _mpApplyLobbyUpdate(data);
            if (data.type === 'startGame') mpGuestStartGame(data);
            if (data.type === 'state' || data.type === 'enemies') mpApplyState(data);
            if (data.type === 'died') mpGuestEnterSpectate();
            if (data.type === 'offerRespawn') mpGuestReceiveRespawnOffer();
            if (data.type === 'respawned') mpGuestReceiveRespawn(data);
        });
        conn.on('close', () => { mpHostDisconnected(); });
        conn.on('error', () => { document.getElementById('mp-join-status').textContent = 'Connection failed. Check the code.'; });
    });
    MP.peer.on('error', err => {
        document.getElementById('mp-join-status').textContent = 'Could not connect: ' + err.type;
        mpCleanup();
    });
}

function _mpApplyLobbyUpdate(data) {
    // data.players = [{name, character, isHost}]
    _mpUpdateGuestSlots(data.players.map((p, i) => ({ name: p.name, character: p.character, you: p.peerId === MP.myPeerId })));
    document.getElementById('mp-guest-status').textContent = 'In lobby — ' + data.players.length + ' / 4 players';
}

function _mpUpdateGuestSlots(players) {
    const container = document.getElementById('mp-guest-slots');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 4; i++) {
        const p = players[i];
        const wrap = document.createElement('div');
        wrap.className = 'mp-slot-wrap';
        const box = document.createElement('div');
        box.className = 'mp-slot-box ' + (p ? (p.you ? 'you' : 'occupied') : 'empty');
        const nameEl = document.createElement('div'); nameEl.className = 'mp-slot-name';
        const labelEl = document.createElement('div'); labelEl.className = 'mp-slot-label';
        if (!p) {
            box.textContent = '+';
        } else {
            const cv = document.createElement('canvas');
            cv.className = 'mp-slot-canvas'; cv.width = 90; cv.height = 100;
            box.appendChild(cv);
            mpDrawCharacterPreview(cv, p.character || 'knight', p.skin || 'default');
            nameEl.textContent = p.name || 'Player';
            labelEl.textContent = p.you ? 'YOU' : (i === 0 ? 'HOST' : 'PLAYER ' + (i + 1));
            labelEl.style.color = p.you ? '#ffd700' : '#aaa';
        }
        wrap.appendChild(box); wrap.appendChild(nameEl); wrap.appendChild(labelEl);
        container.appendChild(wrap);
    }
}

// ── Step 3b: Create / Host lobby ──────────────────────────────────────────────

function mpGoCreate() {
    MP.playerName = (document.getElementById('mp-name-input').value || 'Player').slice(0, 12);
    _mpHide('mp-choice-overlay');
    mpHostGame();
}

function mpHostGame() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    MP.roomCode = code;
    MP.isHost = true;
    MP.active = true;
    MP.guestPlayers = [];

    document.getElementById('mp-code-display').textContent = code;
    _mpShow('mp-lobby-overlay');
    _mpRefreshHostSlots();
    document.getElementById('mp-start-btn').disabled = true; // need ≥2 players

    MP.peer = new Peer('pd-' + code, { debug: 0 });
    MP.peer.on('open', () => { MP.myPeerId = 'pd-' + code; });
    MP.peer.on('connection', conn => {
        if (MP.conns.length >= 3) { conn.close(); return; }
        MP.conns.push(conn);
        conn.on('open', () => { _mpRefreshHostSlots(); _mpBroadcastLobbyUpdate(); });
        conn.on('data', data => {
            if (data.type === 'input') mpHandleGuestInput(conn, data);
            if (data.type === 'joinInfo') mpRegisterGuest(conn, data);
            if (data.type === 'respawnRequest') mpHandleRespawnRequest(conn);
        });
        conn.on('close', () => {
            MP.conns = MP.conns.filter(c => c !== conn);
            MP.guestPlayers = MP.guestPlayers.filter(g => g._peerId !== conn.peer);
            _mpRefreshHostSlots();
            _mpBroadcastLobbyUpdate();
        });
        conn.on('error', () => { MP.conns = MP.conns.filter(c => c !== conn); });
    });
    MP.peer.on('error', err => { showNotif('MP error: ' + err.type); mpLobbyBack(); });
}

function _mpRefreshHostSlots() {
    const slots = [
        { name: MP.playerName || 'Host', character: persist.selectedCharacter || 'knight', skin: persist.selectedSkin || 'default', you: true, label: 'YOU (HOST)' },
        ...MP.guestPlayers.map((g, i) => ({ name: g.name, character: g.character, skin: g.skin, label: 'PLAYER ' + (i + 2) })),
        null, null, null
    ].slice(0, 4);
    mpUpdateSlots(slots);
    document.getElementById('mp-start-btn').disabled = MP.guestPlayers.length < 1;
}

function _mpBroadcastLobbyUpdate() {
    const players = [
        { name: MP.playerName || 'Host', character: persist.selectedCharacter || 'knight', isHost: true, peerId: MP.myPeerId },
        ...MP.guestPlayers.map(g => ({ name: g.name, character: g.character, peerId: g._peerId }))
    ];
    for (const conn of MP.conns) {
        try { conn.send({ type: 'lobbyUpdate', players }); } catch(e) {}
    }
}

function mpLobbyBack() {
    mpCleanup();
    _mpHide('mp-lobby-overlay');
    _mpShow('mp-choice-overlay');
}

// ── Guest registration ────────────────────────────────────────────────────────

function mpRegisterGuest(conn, data) {
    if (MP.guestPlayers.find(g => g._peerId === conn.peer)) return;
    const slot = MP.guestPlayers.length + 1;
    const offsets = [{ x: 0, y: -60 }, { x: 60, y: 0 }, { x: -60, y: 0 }];
    const off = offsets[slot - 1] || { x: 0, y: 0 };
    MP.guestPlayers.push({
        x: WORLD_W / 2 + off.x, y: WORLD_H / 2 + off.y,
        hp: 100, maxHp: 100, speed: 3, damage: 10,
        facingX: 1, facingY: 0, animFrame: 0, animTimer: 0,
        dashing: false, dashTimer: 0, dashCooldown: 0,
        hurtTimer: 0, attackCooldown: 0,
        name: data.name || 'Player',
        character: data.character || 'knight',
        skin: data.skin || 'default',
        isAlive: true, kills: 0,
        _peerId: conn.peer, _conn: conn, _latestInput: null, slot,
    });
    _mpRefreshHostSlots();
    _mpBroadcastLobbyUpdate();
}

// ── Start game ────────────────────────────────────────────────────────────────

function mpStartGame() {
    const mapVariant = document.getElementById('mp-map-select').value || 'normal';
    const ff = document.getElementById('mp-ff-toggle').checked;
    MP.friendlyFire = ff;

    // Apply the chosen variant on the host now
    state.mapVariant = mapVariant;
    if (mapVariant === 'island') applyIslandVariant();
    else if (mapVariant === 'canyon') applyCanyonVariant();
    else if (mapVariant === 'cave') applyCaveVariant();
    if (mapVariant === 'cave') {
        state.dayNight.phase = 'day'; state.dayNight.alpha = 0.45;
        state.dayNight.timer = 999999999; state.dayNight.eveningShown = true;
    }
    spawnTrees(); // respawn trees to match new terrain
    state.waveSpawnQueue = buildWaveQueue(false); // rebuild queue now that world flags are set

    const startMsg = { type: 'startGame', mapVariant, difficulty: state.difficulty || 'normal', ff };
    MP.guestPlayers.forEach((gp, i) => {
        try { gp._conn.send({ ...startMsg, slot: i + 1 }); } catch(e) {}
    });

    _mpHide('mp-lobby-overlay');
    MP.gameStarted = true;
    state.paused = false;
    if (mapVariant !== 'normal') showNotif(mapVariant.charAt(0).toUpperCase() + mapVariant.slice(1) + ' world — multiplayer!');
}

function mpGuestStartGame(data) {
    const mapVariant = data.mapVariant || 'normal';
    MP.friendlyFire = data.ff || false;

    // Apply difficulty from host
    if (data.difficulty && typeof DIFFICULTY_SETTINGS !== 'undefined' && DIFFICULTY_SETTINGS[data.difficulty]) {
        state.difficulty = data.difficulty;
        state.diffMult = DIFFICULTY_SETTINGS[data.difficulty];
        const p = state.player;
        p.maxHp = Math.round(100 * state.diffMult.playerHpMult);
        p.hp = p.maxHp;
    }

    // Apply host's map variant
    state.mapVariant = mapVariant;
    if (mapVariant === 'island') applyIslandVariant();
    else if (mapVariant === 'canyon') applyCanyonVariant();
    else if (mapVariant === 'cave') {
        applyCaveVariant();
        state.dayNight.phase = 'day'; state.dayNight.alpha = 0.45;
        state.dayNight.timer = 999999999; state.dayNight.eveningShown = true;
    }
    spawnTrees();
    state.waveSpawnQueue = buildWaveQueue(false);

    _mpHide('mp-guest-overlay');
    MP.gameStarted = true;
    state.paused = false;
}

// ── Per-frame: guest inputs & host simulation ─────────────────────────────────

function mpHandleGuestInput(conn, data) {
    const gp = MP.guestPlayers.find(g => g._peerId === conn.peer);
    if (gp) { gp._latestInput = data; gp.isPaused = !!data.paused; }
}

function mpUpdateGuestPlayers() {
    if (!MP.active || !MP.isHost) return;
    for (const gp of MP.guestPlayers) {
        if (!gp.isAlive) continue;
        const inp = gp._latestInput;
        if (!inp) continue;

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
        if (inp.dashing && !gp.dashing && gp.dashCooldown <= 0) { gp.dashing = true; gp.dashTimer = 12; gp.dashCooldown = 40; }
        if (gp.dashing) { gp.dashTimer--; if (gp.dashTimer <= 0) gp.dashing = false; }
        if (gp.dashCooldown > 0) gp.dashCooldown--;
        if (gp.hurtTimer > 0) gp.hurtTimer--;
        if (gp.attackCooldown > 0) gp.attackCooldown--;

        if (inp.attacking && gp.attackCooldown <= 0) {
            gp.attackCooldown = 20;
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - gp.x, e.y - gp.y) < 40) {
                    e.hp -= gp.damage; e.hurtTimer = 12; gp.kills++;
                    state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(gp.damage), life: 50, vy: -1.5, crit: false });
                }
            });
            if (MP.friendlyFire) {
                if (Math.hypot(state.player.x - gp.x, state.player.y - gp.y) < 40) { state.player.hp -= gp.damage * 0.5; state.player.hurtTimer = 12; }
                MP.guestPlayers.forEach(o => { if (o !== gp && o.isAlive && Math.hypot(o.x - gp.x, o.y - gp.y) < 40) { o.hp -= gp.damage * 0.5; o.hurtTimer = 12; } });
            }
        }

        for (let i = state.goldPickups.length - 1; i >= 0; i--) {
            const g = state.goldPickups[i];
            if (Math.hypot(g.x - gp.x, g.y - gp.y) < 24) {
                state.player.gold = (state.player.gold || 0) + g.amount;
                state.player.totalGoldEarned = (state.player.totalGoldEarned || 0) + g.amount;
                state.goldPickups.splice(i, 1);
            }
        }

        if (!gp.isPaused) {
            state.enemies.forEach(e => {
                if (gp.hurtTimer > 0) return;
                // enemies don't carry a damage field in their template; fall back to a wave-scaled default
                const eDmg = e.damage || Math.max(5, Math.round(8 + (state.player.wave || 1) * 1.5));
                if (Math.hypot(e.x - gp.x, e.y - gp.y) < 24) { gp.hp -= eDmg; gp.hurtTimer = 40; }
            });
        }

        if (gp.hp <= 0 && gp.isAlive) {
            gp.isAlive = false;
            try { gp._conn.send({ type: 'died' }); } catch(e) {}
            showNotif(gp.name + ' has fallen!');
            // Offer 1 respawn if they haven't used theirs yet
            if (!gp._respawnUsed) {
                try { gp._conn.send({ type: 'offerRespawn' }); } catch(e) {}
            }
        }
    }
}

function mpBroadcastState() {
    if (!MP.active || !MP.isHost || MP.conns.length === 0) return;
    MP._tick++;
    const p = state.player;

    // Player + gold: every 2 frames (~30/sec) — small packet
    if (MP._tick % 2 === 0) {
        const lightSnap = {
            type: 'state',
            hp: { x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, gold: p.gold, fx: p.facingX, af: p.animFrame, d: p.dashing, ch: p.character, nm: MP.playerName, wp: p.weapon || 'sword' },
            gp: MP.guestPlayers.map(g => ({ id: g._peerId, x: g.x, y: g.y, hp: g.hp, mhp: g.maxHp, fx: g.facingX, af: g.animFrame, d: g.dashing, a: g.isAlive, ch: g.character, sk: g.skin, sl: g.slot, nm: g.name, wp: g.weapon || 'sword' })),
            gld: state.goldPickups.slice(0, 30).map(g => ({ x: g.x, y: g.y, a: g.amount })),
            wave: p.wave, kills: p.kills, boss: state.bossActive,
            dn: { ph: state.dayNight.phase, al: state.dayNight.alpha, day: state.dayNight.dayCount },
        };
        for (const conn of MP.conns) { try { conn.send(lightSnap); } catch(e) {} }
    }

    // Enemies + weather: every 6 frames (~10/sec) — heavier packet
    if (MP._tick % 6 === 0) {
        const enemySnap = {
            type: 'enemies',
            en: state.enemies.map(e => ({ x: Math.round(e.x), y: Math.round(e.y), hp: Math.round(e.hp), mhp: Math.round(e.maxHp || e.hp), type: e.type, fx: e.facingX, boss: e.isBoss, ht: e.hurtTimer > 0, cl: e.color, sz: e.sizeScale || 1, el: !!e.elite })),
            wx: { s: state.weather.stage },
        };
        for (const conn of MP.conns) { try { conn.send(enemySnap); } catch(e) {} }
    }
}

function mpSendInputs() {
    if (!MP.active || MP.isHost || !MP.conns[0] || MP._spectating) return;
    try {
        MP.conns[0].send({ type: 'input', frame: state.frame, keys: { ...state.keys }, joyDir: state.joyDir, attacking: state._mpAttacking || false, dashing: state._mpDashing || false, paused: !!state.paused });
    } catch(e) {}
    state._mpAttacking = false;
    state._mpDashing = false;
}

function _mpApplyEnemies(en, wx) {
    if (!en) return;
    const _allTypes = [
        ...(typeof ENEMY_TYPES !== 'undefined' ? ENEMY_TYPES : []),
        ...(typeof HUMAN_ENEMY_TYPES !== 'undefined' ? HUMAN_ENEMY_TYPES : []),
        ...(typeof DINO_ENEMY_TYPES !== 'undefined' ? DINO_ENEMY_TYPES : []),
        ...(typeof SAILOR_ENEMY_TYPES !== 'undefined' ? SAILOR_ENEMY_TYPES : []),
        ...(typeof ALIEN_ENEMY_TYPES !== 'undefined' ? ALIEN_ENEMY_TYPES : []),
    ];
    // Merge preserving local animTimer (incremented each frame for smooth animation)
    const prevById = {};
    state.enemies.forEach((e, i) => { prevById[i] = e; });
    state.enemies = en.map((e, i) => {
        const tmpl = _allTypes.find(t => t.type === e.type) || {};
        const prev = prevById[i];
        return {
            x: e.x, y: e.y, hp: e.hp, maxHp: e.mhp, type: e.type,
            facingX: e.fx,
            animTimer: (prev && prev.type === e.type) ? prev.animTimer : 0,
            isBoss: e.boss, hurtTimer: e.ht ? 5 : 0, speed: 0, gold: 0,
            color: e.cl || tmpl.color || '#888',
            sizeScale: e.sz || (tmpl.size || 1),
            elite: e.el || false,
            damage: tmpl.damage || 10,
        };
    });
    if (wx) state.weather.stage = wx.s;
}

function mpApplyState(snap) {
    if (snap.type === 'enemies') { _mpApplyEnemies(snap.en, snap.wx); return; }
    // Regular light state packet
    MP._remoteHostPlayer = snap.hp;
    // Spectating: ghost camera to host position so camera/draw follows them
    if (MP._spectating && snap.hp && state.player) {
        state.player.x = snap.hp.x;
        state.player.y = snap.hp.y;
    }
    // Separate my own guest data from other guests'
    const myGuestData = (snap.gp || []).find(g => g.id === MP.myPeerId);
    MP._remoteOtherGuests = (snap.gp || []).filter(g => g.id !== MP.myPeerId);
    // Sync guest's own HP from host (authoritative)
    if (myGuestData && state.player) {
        state.player.hp = myGuestData.hp;
        state.player.maxHp = myGuestData.mhp;
    }
    // Only sync gold when the shop isn't open (prevents purchase rollback)
    if (state.player && snap.hp && !state.shopOpen) state.player.gold = snap.hp.gold;
    if (state.player && snap.wave != null) { state.player.wave = snap.wave; state.player.kills = snap.kills; }
    if (snap.boss != null) state.bossActive = snap.boss;
    if (snap.dn) { state.dayNight.alpha = snap.dn.al; state.dayNight.phase = snap.dn.ph; state.dayNight.dayCount = snap.dn.day; }
    if (snap.gld) state.goldPickups = snap.gld.map(g => ({ x: g.x, y: g.y, amount: g.a, life: 60 }));
}

// ── Remote player rendering ───────────────────────────────────────────────────

function drawRemotePlayers() {
    if (!MP.active) return;
    const remotes = [];
    if (MP.isHost) {
        for (const gp of MP.guestPlayers) {
            if (gp.isAlive) remotes.push({ x: gp.x, y: gp.y, hp: gp.hp, maxHp: gp.maxHp, facingX: gp.facingX, facingY: 0, animFrame: gp.animFrame, dashing: gp.dashing, character: gp.character, skin: gp.skin, weapon: gp.weapon || 'sword', label: gp.name || ('P' + (gp.slot + 1)) });
        }
    } else {
        if (MP._remoteHostPlayer) {
            const h = MP._remoteHostPlayer;
            remotes.push({ x: h.x, y: h.y, hp: h.hp, maxHp: h.maxHp, facingX: h.fx, facingY: 0, animFrame: h.af, dashing: h.d, character: h.ch, skin: 'default', weapon: h.wp || 'sword', label: h.nm || 'Host' });
        }
        for (const g of (MP._remoteOtherGuests || [])) {
            if (g.a) remotes.push({ x: g.x, y: g.y, hp: g.hp, maxHp: g.mhp, facingX: g.fx, facingY: 0, animFrame: g.af, dashing: g.d, character: g.ch, skin: g.sk || 'default', weapon: g.wp || 'sword', label: g.nm || ('P' + (g.sl + 1)) });
        }
    }

    const _realPlayer = state.player;
    const _realSkin = persist.selectedSkin;
    const _realChar = persist.selectedCharacter;

    for (const rp of remotes) {
        state.player = { ..._realPlayer, x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, facingX: rp.facingX, facingY: rp.facingY, animFrame: rp.animFrame, dashing: rp.dashing, character: rp.character, weapon: rp.weapon || 'sword', hurtTimer: 0, ninjaInvisible: false, sizeScale: 1 };
        persist.selectedSkin = rp.skin || 'default';
        persist.selectedCharacter = rp.character || 'knight';
        ctx.globalAlpha = rp.dashing ? 0.55 : 0.92;
        try { drawPlayer(); } catch(e) {}
        ctx.globalAlpha = 1;
        // Restore immediately so a thrown exception can't corrupt the next frame
        state.player = _realPlayer;
        persist.selectedSkin = _realSkin;
        persist.selectedCharacter = _realChar;

        const sx = rp.x - state.camera.x, sy = rp.y - state.camera.y;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(rp.label, sx, sy - 32);

        if (rp.maxHp > 0 && rp.hp < rp.maxHp) {
            const bw = 28, bh = 3, bx = sx - bw / 2, by = sy + 14;
            ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#4caf50'; ctx.fillRect(bx, by, bw * Math.max(0, rp.hp / rp.maxHp), bh);
        }
    }
    ctx.textAlign = 'left';
}

// ── Death / Spectate (guest-side) ────────────────────────────────────────────

function mpGuestEnterSpectate() {
    if (MP._spectating) return; // already spectating, avoid double-trigger
    MP._spectating = true;
    state.gameOver = false; // prevent endGame() death screen from showing
    state.player.hp = 0;
    // Clear all keys so the dead player doesn't keep moving
    for (const k in state.keys) state.keys[k] = false;
    _mpShow('mp-spectate-overlay');
    document.getElementById('mp-spectate-status').textContent = 'You died. Spectating...';
    document.getElementById('mp-respawn-offer').classList.add('hidden');
}

function mpGuestReceiveRespawnOffer() {
    if (MP._respawnUsed) return; // already used
    document.getElementById('mp-spectate-status').textContent = 'Respawn available!';
    _mpShow('mp-respawn-offer');
}

function mpRequestRespawn() {
    if (!MP.active || MP.isHost || !MP.conns[0] || MP._respawnUsed) return;
    try { MP.conns[0].send({ type: 'respawnRequest' }); } catch(e) {}
    document.getElementById('mp-respawn-offer').classList.add('hidden');
    document.getElementById('mp-spectate-status').textContent = 'Respawning...';
}

function mpGuestReceiveRespawn(data) {
    MP._spectating = false;
    MP._respawnUsed = true;
    _mpHide('mp-spectate-overlay');
    if (state.player) {
        state.player.hp = state.player.maxHp;
        if (data.x != null) { state.player.x = data.x; state.player.y = data.y; }
    }
    showNotif('Respawned!');
}

function mpHandleRespawnRequest(conn) {
    const gp = MP.guestPlayers.find(g => g._peerId === conn.peer);
    if (!gp || gp._respawnUsed) return;
    gp._respawnUsed = true;
    gp.isAlive = true;
    gp.hp = gp.maxHp;
    // Place near host player with a small offset
    const ang = Math.random() * Math.PI * 2;
    gp.x = state.player.x + Math.cos(ang) * 60;
    gp.y = state.player.y + Math.sin(ang) * 60;
    try { gp._conn.send({ type: 'respawned', x: gp.x, y: gp.y }); } catch(e) {}
    showNotif(gp.name + ' respawned!');
}

// ── Host disconnected (guest-side) ────────────────────────────────────────────

function mpHostDisconnected() {
    // Pause the guest's game and show choice overlay
    state.paused = true;
    _mpShow('mp-hostleft-overlay');
}

function mpKeepPlayingSolo() {
    _mpHide('mp-hostleft-overlay', 'mp-spectate-overlay');
    // Take over simulation: become solo player
    MP._spectating = false;
    MP.active = false;
    MP.isHost = false;
    if (MP.peer) { try { MP.peer.destroy(); } catch(e) {} MP.peer = null; }
    MP.conns = []; MP.guestPlayers = [];
    state.paused = false;
    showNotif('Playing solo! Good luck!');
}

function mpQuitToMenu() {
    _mpHide('mp-hostleft-overlay');
    mpDisconnect();
}

// ── Disconnect / Cleanup ──────────────────────────────────────────────────────

function mpDisconnect() {
    mpCleanup();
    _mpHide('mp-guest-overlay', 'mp-lobby-overlay', 'mp-join-overlay', 'mp-choice-overlay', 'mp-confirm-overlay');
    state.mpMode = false;
    state.paused = false;
    const mpBtn = document.getElementById('mp-open-btn');
    if (mpBtn) mpBtn.style.display = '';
    _mpShow('difficulty-overlay');
}

function mpCleanup() {
    if (MP.peer) { try { MP.peer.destroy(); } catch(e) {} MP.peer = null; }
    MP.active = false; MP.isHost = false; MP.gameStarted = false; MP.conns = []; MP.guestPlayers = [];
    MP._remoteHostPlayer = null; MP._remoteOtherGuests = []; MP._tick = 0;
    MP._forcedMapVariant = null; MP.roomCode = '';
    MP._spectating = false; MP._respawnUsed = false;
}
