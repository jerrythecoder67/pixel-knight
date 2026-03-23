// ─── SPAWNING ───

// Returns an array of type-entry strings (e.g. 'slime', 'horde:skeleton') for the current wave.
function getAvailableEnemyTypes(wave) {
    if (state.player.charMonster) {
        // Monster mode: fight humans, unlock progressively
        const humanUnlock = Math.min(5, Math.floor((wave - 1) / 2) + 1); // 1 new type per 2 waves, cap at 5 (no paladin in normal waves)
        return HUMAN_ENEMY_TYPES.slice(0, humanUnlock).filter(t => !t.isBossType);
    }
    const unlocked = Math.min(state.player.unlockedEnemyTypes, ENEMY_TYPES.length);
    return ENEMY_TYPES.slice(0, unlocked).filter(t => t.type !== 'mimic');
}

function buildWaveQueue(isHorde) {
    const p = state.player;
    const wave = p.wave;
    const spawnMult = state.diffMult.spawnMult || 1;
    const mpMult = (typeof MP !== 'undefined' && MP.active && MP.isHost) ? 2 : 1;
    const count = Math.round((isHorde ? Math.min(50 * mpMult, (20 + wave) * mpMult) : Math.min(40 * mpMult, (5 + (wave - 1) * 3) * mpMult)) * spawnMult);
    state.waveEnemiesTotal = count;
    state.waveEnemiesKilled = 0;
    const prefix = isHorde ? 'horde:' : '';
    const queue = [];
    // Paleo world: fight dinosaurs (progressive unlock)
    if (state.dinoWorld) {
        const dinoSlice = DINO_ENEMY_TYPES.slice(0, Math.max(2, p.unlockedDinoTypes || 2));
        for (let i = 0; i < count; i++) queue.push(prefix + dinoSlice[Math.floor(Math.random() * dinoSlice.length)].type);
        return queue;
    }
    // Sailor world: use sailor enemy types (progressive unlock)
    if (state.sailorWorld) {
        const sailorSlice = SAILOR_ENEMY_TYPES.slice(0, Math.max(2, p.unlockedSailorTypes || 2));
        for (let i = 0; i < count; i++) queue.push(prefix + sailorSlice[Math.floor(Math.random() * sailorSlice.length)].type);
        return queue;
    }
    // Alien world: use alien enemy types (progressive unlock)
    if (state.alienWorld) {
        const alienSlice = ALIEN_ENEMY_TYPES.slice(0, Math.max(2, p.unlockedAlienTypes || 2));
        for (let i = 0; i < count; i++) queue.push(prefix + alienSlice[Math.floor(Math.random() * alienSlice.length)].type);
        return queue;
    }
    const avail = getAvailableEnemyTypes(wave);
    if (avail.length === 0) return queue;
    for (let i = 0; i < count; i++) {
        queue.push(prefix + avail[Math.floor(Math.random() * avail.length)].type);
    }
    return queue;
}

// Spawns a single enemy of the given typeEntry (may be prefixed 'horde:').
function spawnWaveEnemy(typeEntry) {
    const isHorde = typeEntry.startsWith('horde:');
    const typeName = isHorde ? typeEntry.slice(6) : typeEntry;
    const tmpl = ENEMY_TYPES.find(t => t.type === typeName) || HUMAN_ENEMY_TYPES.find(t => t.type === typeName) || SAILOR_ENEMY_TYPES.find(t => t.type === typeName) || ALIEN_ENEMY_TYPES.find(t => t.type === typeName) || DINO_ENEMY_TYPES.find(t => t.type === typeName);
    if (!tmpl) return;
    // In MP, spawn near a random alive player to distribute pressure
    let _spawnOx = state.player.x, _spawnOy = state.player.y;
    if (typeof MP !== 'undefined' && MP.active && MP.isHost && MP.guestPlayers.length > 0) {
        const _alive = [{ x: state.player.x, y: state.player.y }, ...MP.guestPlayers.filter(g => g.isAlive)];
        const _pick = _alive[Math.floor(Math.random() * _alive.length)];
        _spawnOx = _pick.x; _spawnOy = _pick.y;
    }
    const ang = Math.random() * Math.PI * 2, dist = 450 + Math.random() * 100;
    const x = _spawnOx + Math.cos(ang) * dist;
    const y = _spawnOy + Math.sin(ang) * dist;
    if (x < 0 || x > WORLD_W || y < 0 || y > WORLD_H) {
        state.waveSpawnQueue.unshift(typeEntry); return; // retry next frame
    }
    // Sailor world: wave enemies must spawn on water (same rule as spawnEnemy)
    if (state.sailorWorld && !isOnWater(x, y)) {
        state.waveSpawnQueue.unshift(typeEntry); return; // retry next frame
    }
    const p = state.player;
    const ws = 1 + (p.wave - 1) * 0.12;
    const isElite = !isHorde && p.wave % 5 === 0 && Math.random() < 0.4;
    const dm = state.diffMult;
    const reaperHpMult = p.charReaper ? 1.1 : 1;
    const hpMult = isHorde ? 0.4 : (isElite ? 2 : 1);
    const mpHp = (typeof mpDiffMult === 'function') ? mpDiffMult() : 1;
    const e = {
        x, y, w: 16, h: 16, type: tmpl.type,
        hp: tmpl.hp * ws * hpMult * dm.enemyHpMult * reaperHpMult * mpHp * (state._dailyEnemyHpMult || 1) * (state._dailyFrenzy ? 0.7 : 1),
        maxHp: tmpl.hp * ws * hpMult * dm.enemyHpMult * reaperHpMult * mpHp * (state._dailyEnemyHpMult || 1) * (state._dailyFrenzy ? 0.7 : 1),
        speed: (tmpl.speed + p.wave * 0.04) * (isHorde ? 1.2 : 1) * (isElite ? 1.2 : 1) * dm.enemySpeedMult,
        color: isElite ? brighten(tmpl.color) : tmpl.color,
        gold: tmpl.gold * (isHorde ? 0.5 : isElite ? 3 : 1),
        score: tmpl.score * (isHorde ? 0.5 : isElite ? 2 : 1),
        sizeScale: (tmpl.size || 1) * (isHorde ? 0.85 : 1) * (state._dailyGiantEnemies ? 1.5 : 1),
        animTimer: Math.random() * 100,
        elite: isElite, isBoss: false,
        knockbackResist: tmpl.knockbackResist || 0, hurtTimer: 0,
        dormant: typeName === 'mimic',
        waterOnly: !!(tmpl.waterOnly),
        mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0, isEnraged: false,
        isWaveEnemy: true
    };
    // MP: alternate targeting between host (0) and guests (1, 2, 3...)
    e.mpTargetIdx = 0;
    if (typeof MP !== 'undefined' && MP.active && MP.isHost && MP.guestPlayers.length > 0 && !e.isBoss) {
        MP._spawnIdx = (MP._spawnIdx || 0) + 1;
        e.mpTargetIdx = MP._spawnIdx % (1 + MP.guestPlayers.length); // 0=host, 1..n=guests
    }
    state.enemies.push(e);
    if (isElite && Math.random() < 0.10) {
        e.mod = ['shielded','enraged','splitting','vampiric'][Math.floor(Math.random() * 4)];
        if (e.mod === 'shielded') { e.shield = Math.floor(e.hp * 0.4); e.maxShield = e.shield; }
        e._hpLastFrame = e.hp;
        showNotif(e.mod.toUpperCase() + ' ELITE appears!');
    }
}

function spawnEnemy() {
    const _mpSpawnMult = (typeof MP !== 'undefined' && MP.active && MP.isHost) ? 2 : 1;
    const max = (6 + state.player.wave * 3 + (state.dayNight.phase === 'night' ? 3 : 0)) * _mpSpawnMult;
    if (state.enemies.length >= max || state.bossActive || state.waveBreather > 0 || state.hordeWave) return;
    let _ambOx = state.player.x, _ambOy = state.player.y;
    if (typeof MP !== 'undefined' && MP.active && MP.isHost && MP.guestPlayers.length > 0) {
        const _alive = [{ x: state.player.x, y: state.player.y }, ...MP.guestPlayers.filter(g => g.isAlive)];
        const _pick = _alive[Math.floor(Math.random() * _alive.length)];
        _ambOx = _pick.x; _ambOy = _pick.y;
    }
    const ang = Math.random() * Math.PI * 2, dist = 450 + Math.random() * 100;
    const x = _ambOx + Math.cos(ang) * dist, y = _ambOy + Math.sin(ang) * dist;
    if (x < 0 || x > WORLD_W || y < 0 || y > WORLD_H) return;

    // Sailor world: spawn sailor enemy types on water tiles only
    if (state.sailorWorld) {
        if (!isOnWater(x, y)) return; // only spawn on ocean
        const tmpl2 = SAILOR_ENEMY_TYPES[Math.floor(Math.random() * SAILOR_ENEMY_TYPES.length)];
        const ws2 = 1 + (state.player.wave - 1) * 0.10;
        const dm2 = state.diffMult;
        state.enemies.push({
            x, y, w: 16, h: 16, type: tmpl2.type,
            hp: tmpl2.hp * ws2 * dm2.enemyHpMult, maxHp: tmpl2.hp * ws2 * dm2.enemyHpMult,
            speed: (tmpl2.speed + state.player.wave * 0.03) * dm2.enemySpeedMult,
            color: tmpl2.color, gold: tmpl2.gold, score: tmpl2.score,
            sizeScale: tmpl2.size || 1, animTimer: Math.random() * 100,
            elite: false, isBoss: false, knockbackResist: 0, hurtTimer: 0,
            waterOnly: true, damage: tmpl2.damage || 10
        });
        return;
    }
    // Alien world: spawn alien enemy types
    if (state.alienWorld) {
        const tmplA = ALIEN_ENEMY_TYPES[Math.floor(Math.random() * ALIEN_ENEMY_TYPES.length)];
        const wsA = 1 + (state.player.wave - 1) * 0.10;
        const dmA = state.diffMult;
        state.enemies.push({
            x, y, w: 16, h: 16, type: tmplA.type,
            hp: tmplA.hp * wsA * dmA.enemyHpMult, maxHp: tmplA.hp * wsA * dmA.enemyHpMult,
            speed: (tmplA.speed + state.player.wave * 0.03) * dmA.enemySpeedMult,
            color: tmplA.color, gold: tmplA.gold, score: tmplA.score,
            sizeScale: tmplA.size || 1, animTimer: Math.random() * 100,
            elite: false, isBoss: false, knockbackResist: tmplA.knockbackResist || 0, hurtTimer: 0,
            mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0, isEnraged: false
        });
        return;
    }

    const avail = getAvailableEnemyTypes(state.player.wave);
    const tmpl = avail[Math.floor(Math.random() * avail.length)];
    const ws = 1 + (state.player.wave - 1) * 0.12;
    const isElite = state.player.wave % 5 === 0 && Math.random() < 0.4;
    const dm = state.diffMult;
    const reaperHpMult = state.player.charReaper ? 1.1 : 1;

    const isRedWizard = tmpl.type === 'wizard' && !isElite && Math.random() < 0.01;
    state.enemies.push({
        x, y, w: 16, h: 16, type: tmpl.type,
        hp: tmpl.hp * ws * (isElite ? 2 : 1) * dm.enemyHpMult * reaperHpMult,
        maxHp: tmpl.hp * ws * (isElite ? 2 : 1) * dm.enemyHpMult * reaperHpMult,
        speed: (tmpl.speed + (state.player.wave * 0.04) * (isElite ? 1.2 : 1)) * dm.enemySpeedMult,
        color: isRedWizard ? '#ff1a1a' : (isElite ? brighten(tmpl.color) : tmpl.color),
        gold: tmpl.gold * (isElite ? 3 : 1), score: tmpl.score * (isElite ? 2 : 1),
        sizeScale: tmpl.size || 1, animTimer: Math.random() * 100,
        elite: isElite, isBoss: false,
        knockbackResist: tmpl.knockbackResist || 0, hurtTimer: 0,
        dormant: tmpl.type === 'mimic',
        mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0, isEnraged: false,
        isRedWizard: isRedWizard || false
    });
    if (isRedWizard) showNotif('⚠ A Red Wizard appears!');
    // Elite mod: 10% chance for a special modifier
    if (isElite && Math.random() < 0.10) {
        const e = state.enemies[state.enemies.length - 1];
        e.mod = ['shielded','enraged','splitting','vampiric'][Math.floor(Math.random() * 4)];
        if (e.mod === 'shielded') { e.shield = Math.floor(e.hp * 0.4); e.maxShield = e.shield; }
        e._hpLastFrame = e.hp;
        showNotif(e.mod.toUpperCase() + ' ELITE appears!');
    }
}

function spawnHordeEnemy() {
    const ang = Math.random() * Math.PI * 2, dist = 380 + Math.random() * 120;
    const x = state.player.x + Math.cos(ang) * dist, y = state.player.y + Math.sin(ang) * dist;
    if (x < 0 || x > WORLD_W || y < 0 || y > WORLD_H) return;
    const avail = getAvailableEnemyTypes(state.player.wave).filter(t => !t.isBossType);
    const tmpl = avail[Math.floor(Math.random() * avail.length)];
    const ws = 1 + (state.player.wave - 1) * 0.12;
    const dm = state.diffMult;
    state.enemies.push({
        x, y, w: 16, h: 16, type: tmpl.type,
        hp: tmpl.hp * ws * 0.4 * dm.enemyHpMult,     // 40% HP — weaker
        maxHp: tmpl.hp * ws * 0.4 * dm.enemyHpMult,
        speed: (tmpl.speed * 1.2 + state.player.wave * 0.04) * dm.enemySpeedMult, // slightly faster
        color: tmpl.color, gold: Math.ceil(tmpl.gold * 0.5), score: Math.ceil(tmpl.score * 0.5),
        sizeScale: (tmpl.size || 1) * 0.85, animTimer: Math.random() * 100,
        elite: false, isBoss: false,
        knockbackResist: tmpl.knockbackResist || 0, hurtTimer: 0, dormant: false
    });
}

function spawnShadowDemon() {
    if (state.shadowDemonActive || state.bossActive) return;
    if (state.dungeon && state.dungeon.active) return; // no shadow demons inside dungeon
    state.shadowDemonActive = true;
    const ang = Math.random() * Math.PI * 2;
    const ws = 1 + state.player.wave * 0.1;
    const dm = state.diffMult;
    state.enemies.push({
        x: state.player.x + Math.cos(ang) * 520, y: state.player.y + Math.sin(ang) * 520,
        w: 32, h: 32, type: 'shadowDemon',
        hp: 1200 * ws * dm.enemyHpMult, maxHp: 1200 * ws * dm.enemyHpMult,
        speed: 0.9 * dm.enemySpeedMult, color: '#1a0030',
        gold: 500, score: 15000,
        sizeScale: 3.5, animTimer: 0,
        elite: false, isBoss: false, isShadowDemon: true,
        knockbackResist: 0.9, hurtTimer: 0
    });
    state.bossWarningTimer = 120;
    document.getElementById('boss-warning').classList.remove('hidden');
    document.getElementById('boss-warning-text').innerText = '☠ A SHADOW DEMON AWAKENS ☠';
}

function spawnBoss(wave) {
    if (state.bossActive) return; // never stack bosses
    state.bossActive = true;
    let tmpl;
    if (state.player.charMonster) {
        // Monster mode boss: use paladin (or captain at early waves)
        tmpl = wave < 10 ? HUMAN_ENEMY_TYPES.find(t => t.type === 'captain')
                         : HUMAN_ENEMY_TYPES.find(t => t.type === 'paladin');
    } else if (state.dinoWorld) {
        // Paleo world boss: triceratops (mid), ankylosaurus (late)
        tmpl = wave < 15 ? DINO_ENEMY_TYPES.find(t => t.type === 'triceratops')
                         : DINO_ENEMY_TYPES.find(t => t.type === 'ankylosaurus');
    } else if (state.sailorWorld) {
        // Sailor world boss: octopus (mid), megalodon-lite (use mantaRay for regular boss waves)
        tmpl = wave < 15 ? SAILOR_ENEMY_TYPES.find(t => t.type === 'octopus')
                         : SAILOR_ENEMY_TYPES.find(t => t.type === 'mantaRay');
    } else if (state.alienWorld) {
        // Alien world boss: hiveMind is the natural boss type
        tmpl = ALIEN_ENEMY_TYPES.find(t => t.type === 'hiveMind');
    } else {
        const bossPool = ENEMY_TYPES.filter(t => t.type !== 'mimic');
        const bossTypeIdx = Math.min(state.player.unlockedEnemyTypes, bossPool.length - 1);
        tmpl = bossPool[bossTypeIdx];
    }
    const ws = 1 + wave * 0.2;
    const ang = Math.random() * Math.PI * 2;
    const dm = state.diffMult;
    state.enemies.push({
        x: state.player.x + Math.cos(ang) * 350, y: state.player.y + Math.sin(ang) * 350,
        w: 24, h: 24, type: tmpl.type,
        hp: tmpl.hp * ws * 8 * dm.enemyHpMult, maxHp: tmpl.hp * ws * 8 * dm.enemyHpMult,
        speed: tmpl.speed * 0.7 * dm.enemySpeedMult, color: '#ff4444',
        gold: tmpl.gold * 10, score: tmpl.score * 5,
        sizeScale: (tmpl.size || 1) * 2, animTimer: 0,
        elite: false, isBoss: true, knockbackResist: 1, hurtTimer: 0
    });
    // Spawn 3-7 minions of same type
    const minionCount = 3 + Math.floor(Math.random() * 5);
    for (let m = 0; m < minionCount; m++) {
        const ma = Math.random() * Math.PI * 2;
        state.enemies.push({
            x: state.player.x + Math.cos(ma) * (300 + Math.random() * 100),
            y: state.player.y + Math.sin(ma) * (300 + Math.random() * 100),
            w: 16, h: 16, type: tmpl.type,
            hp: tmpl.hp * ws, maxHp: tmpl.hp * ws,
            speed: tmpl.speed + state.player.wave * 0.04,
            color: tmpl.color, gold: tmpl.gold, score: tmpl.score,
            sizeScale: tmpl.size || 1, animTimer: Math.random() * 100,
            elite: false, isBoss: false,
            knockbackResist: tmpl.knockbackResist || 0, hurtTimer: 0
        });
    }
    state.bossWarningTimer = 90;
    document.getElementById('boss-warning').classList.remove('hidden');
    document.getElementById('boss-warning-text').innerText = '⚠ BOSS: ' + tmpl.type.toUpperCase() + ' ⚠';
}

function spawnGrimReaper() {
    if (state.bossActive) return;
    const ang = Math.random() * Math.PI * 2;
    const p = state.player, dm = state.diffMult;
    const ws = 1 + (state.endlessMode ? (state.endlessTimer || 0) * 0.0002 : (p.wave - 1) * 0.15);
    const hpBase = 20000 * ws * dm.enemyHpMult;
    state.enemies.push({
        x: p.x + Math.cos(ang) * 520, y: p.y + Math.sin(ang) * 520,
        w: 28, h: 28, type: 'grimReaper',
        hp: hpBase, maxHp: hpBase,
        speed: 2.5 * dm.enemySpeedMult,
        color: '#1a0035', gold: 2000, score: 80000,
        sizeScale: 2.8, animTimer: 0,
        elite: false, isBoss: true, isGrimReaper: true,
        knockbackResist: 1, hurtTimer: 0,
        phase: 1, phaseChangeNotif: false,
    });
    state.bossActive = true;
    state.grimReaperSpawned = true;
    state.bossWarningTimer = 120;
    document.getElementById('boss-warning').classList.remove('hidden');
    document.getElementById('boss-warning-text').innerText = '☠ THE GRIM REAPER APPROACHES ☠';
    showNotif('☠ THE GRIM REAPER APPROACHES ☠', true);
}

function spawnTRexBoss() {
    if (state.bossActive) return;
    const ang = Math.random() * Math.PI * 2;
    const p = state.player, dm = state.diffMult;
    const ws = 1 + (state.endlessMode ? (state.endlessTimer || 0) * 0.0002 : (p.wave - 1) * 0.15);
    const hpBase = 18000 * ws * dm.enemyHpMult;
    state.enemies.push({
        x: p.x + Math.cos(ang) * 520, y: p.y + Math.sin(ang) * 520,
        w: 28, h: 28, type: 'trexBoss',
        hp: hpBase, maxHp: hpBase,
        speed: 2.0 * dm.enemySpeedMult,
        color: '#2e7d32', gold: 1800, score: 75000,
        sizeScale: 3.2, animTimer: 0,
        elite: false, isBoss: true, isGrimReaper: true,
        knockbackResist: 0.95, hurtTimer: 0,
        phase: 1, phaseChangeNotif: false,
    });
    state.bossActive = true;
    state.grimReaperSpawned = true;
    state.bossWarningTimer = 120;
    document.getElementById('boss-warning').classList.remove('hidden');
    document.getElementById('boss-warning-text').innerText = '🦕 THE T-REX KING AWAKENS 🦕';
    showNotif('🦕 THE T-REX KING AWAKENS 🦕', true);
}

function spawnMegalodonBoss() {
    if (state.bossActive) return;
    const ang = Math.random() * Math.PI * 2;
    const p = state.player, dm = state.diffMult;
    const ws = 1 + (state.endlessMode ? (state.endlessTimer || 0) * 0.0002 : (p.wave - 1) * 0.15);
    const hpBase = 22000 * ws * dm.enemyHpMult;
    state.enemies.push({
        x: p.x + Math.cos(ang) * 520, y: p.y + Math.sin(ang) * 520,
        w: 32, h: 32, type: 'megalodon',
        hp: hpBase, maxHp: hpBase,
        speed: 3.0 * dm.enemySpeedMult,
        color: '#455a64', gold: 2200, score: 85000,
        sizeScale: 3.5, animTimer: 0,
        elite: false, isBoss: true, isGrimReaper: true,
        knockbackResist: 1, hurtTimer: 0,
        phase: 1, phaseChangeNotif: false,
        facingX: 1,
    });
    state.bossActive = true;
    state.grimReaperSpawned = true;
    state.bossWarningTimer = 120;
    document.getElementById('boss-warning').classList.remove('hidden');
    document.getElementById('boss-warning-text').innerText = '🦈 THE MEGALODON RISES 🦈';
    showNotif('🦈 THE MEGALODON RISES 🦈', true);
}

function spawnAlienQueenBoss() {
    if (state.bossActive) return;
    const ang = Math.random() * Math.PI * 2;
    const p = state.player, dm = state.diffMult;
    const ws = 1 + (state.endlessMode ? (state.endlessTimer || 0) * 0.0002 : (p.wave - 1) * 0.15);
    const hpBase = 20000 * ws * dm.enemyHpMult;
    state.enemies.push({
        x: p.x + Math.cos(ang) * 520, y: p.y + Math.sin(ang) * 520,
        w: 28, h: 28, type: 'alienQueen',
        hp: hpBase, maxHp: hpBase,
        speed: 1.8 * dm.enemySpeedMult,
        color: '#00796b', gold: 2000, score: 80000,
        sizeScale: 2.8, animTimer: 0,
        elite: false, isBoss: true, isGrimReaper: true,
        knockbackResist: 0.9, hurtTimer: 0,
        phase: 1, phaseChangeNotif: false,
    });
    state.bossActive = true;
    state.grimReaperSpawned = true;
    state.bossWarningTimer = 120;
    document.getElementById('boss-warning').classList.remove('hidden');
    document.getElementById('boss-warning-text').innerText = '👽 THE ALIEN QUEEN DESCENDS 👽';
    showNotif('👽 THE ALIEN QUEEN DESCENDS 👽', true);
}

function showPostReaperOverlay(bossType) {
    const BOSS_NAMES = {
        trexBoss:    '🦕 THE T-REX KING IS DEFEATED 🦕',
        megalodon:   '🦈 THE MEGALODON IS SLAIN 🦈',
        alienQueen:  '👽 THE ALIEN QUEEN IS DESTROYED 👽',
        grimReaper:  '☠ DEATH DEFIED ☠',
    };
    const BOSS_SUBTITLES = {
        trexBoss:   'You have slain the T-Rex King!',
        megalodon:  'You have slain the Megalodon!',
        alienQueen: 'You have destroyed the Alien Queen!',
        grimReaper: 'You have vanquished the Grim Reaper!',
    };
    const key = bossType || 'grimReaper';
    document.querySelector('#post-reaper-overlay h2').innerText = BOSS_NAMES[key] || BOSS_NAMES.grimReaper;
    document.querySelector('#post-reaper-overlay p.upgrade-subtitle').innerText = BOSS_SUBTITLES[key] || BOSS_SUBTITLES.grimReaper;
    document.getElementById('post-reaper-overlay').classList.remove('hidden');
}

function brighten(hex) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + 50); g = Math.min(255, g + 50); b = Math.min(255, b + 50);
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}
