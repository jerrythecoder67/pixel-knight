// ─── CROCODILE SPAWNING ───
function spawnCrocodiles() {
    state.crocodiles = [];
    for (const lake of lakes) {
        const { size, cx, cy } = lake;
        if (size < 15) continue; // too small for crocs
        let count = 0;
        if (size >= 50) {
            count = 1; // guaranteed one in big lake
            let prob = 0.08;
            while (Math.random() < prob) { count++; prob *= 0.08; }
        } else {
            if (Math.random() < 0.35) count = 1; // 35% chance in medium lake
        }
        for (let ci = 0; ci < count; ci++) {
            const angle = Math.random() * Math.PI * 2;
            const spread = Math.sqrt(size) * TILE * 0.15;
            state.crocodiles.push({
                x: cx + Math.cos(angle) * spread,
                y: cy + Math.sin(angle) * spread,
                homeX: cx, homeY: cy,
                w: 18, h: 10, hp: 120, maxHp: 120,
                waterSpeed: 1.7, stoneSpeed: 1.0,
                gold: 20, score: 180, damage: 15,
                animTimer: 0, hurtTimer: 0, attackCooldown: 0,
                facingX: 1, wanderTimer: 0, wanderAngle: 0,
                nearFoePool: false
            });
        }
    }
}

// ─── FISH & SHARK SPAWNING ───
function spawnFishAndSharks() {
    state.fish = [];
    state.sharks = [];
    for (const lake of lakes) {
        const { size, cx, cy } = lake;
        if (size < 4) continue;
        // Fish: 3-6 per lake — spawn at center to guarantee water tile
        const fishCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < fishCount; i++) {
            state.fish.push({
                x: cx, y: cy,
                vx: (Math.random()-0.5)*1.2, vy: (Math.random()-0.5)*1.2,
                wanderTimer: Math.floor(Math.random()*120),
                hp: 1, hurtTimer: 0, healAmt: 8,
                colorVariant: Math.floor(Math.random()*3) // 0=orange,1=cyan,2=yellow
            });
        }
        // Sharks: only in large lakes (size >= 120) — spawn at center
        if (size >= 120) {
            const sharkCount = Math.min(2, 1 + Math.floor(size / 100));
            for (let i = 0; i < sharkCount; i++) {
                state.sharks.push({
                    x: cx, y: cy,
                    homeX: cx, homeY: cy,
                    hp: 350, maxHp: 350, hurtTimer: 0,
                    speed: 2.5, damage: 18, attackCooldown: 0, animTimer: 0,
                    facingX: 1, wanderTimer: 0, wanderAngle: Math.random()*Math.PI*2
                });
            }
        }
    }
}

// ─── CRAB SPAWNING (sailor world land predators — spawn at former lake centers, now islands) ───
function spawnCrabs() {
    state.crabs = [];
    for (const lake of lakes) {
        const { size, cx, cy } = lake;
        if (size < 10) continue;
        let count = 0;
        if (size >= 40) { count = 1; if (Math.random() < 0.5) count = 2; }
        else if (Math.random() < 0.5) count = 1;
        for (let ci = 0; ci < count; ci++) {
            const angle = Math.random() * Math.PI * 2;
            const spread = Math.sqrt(size) * TILE * 0.1;
            state.crabs.push({
                x: cx + Math.cos(angle) * spread,
                y: cy + Math.sin(angle) * spread,
                homeX: cx, homeY: cy,
                hp: 120, maxHp: 120,
                speed: 1.4, gold: 15, score: 140, damage: 12,
                animTimer: 0, hurtTimer: 0, attackCooldown: 0,
                facingX: 1, wanderTimer: 0, wanderAngle: 0
            });
        }
    }
}

// ─── SALAMANDER SPAWNING ───
function spawnSalamanders() {
    state.salamanders = [];
    for (const pool of lavaPools) {
        const { size, cx, cy } = pool;
        if (size < 12) continue; // too small for salamanders
        let count = 0;
        if (size >= 50) {
            count = 1;
            let prob = 0.08;
            while (Math.random() < prob) { count++; prob *= 0.08; }
        } else {
            if (Math.random() < 0.35) count = 1;
        }
        for (let ci = 0; ci < count; ci++) {
            const angle = Math.random() * Math.PI * 2;
            const spread = Math.sqrt(size) * TILE * 0.15;
            state.salamanders.push({
                x: cx + Math.cos(angle) * spread,
                y: cy + Math.sin(angle) * spread,
                homeX: cx, homeY: cy,
                w: 18, h: 10, hp: 120, maxHp: 120,
                lavaSpeed: 1.7, stoneSpeed: 1.0,
                gold: 20, score: 180, damage: 15,
                animTimer: 0, hurtTimer: 0, attackCooldown: 0,
                facingX: 1, wanderTimer: 0, wanderAngle: 0,
                nearFoePool: false
            });
        }
    }
    // All crocs and salas are cross-pool aggressors — they'll fight when they wander in range
    for (const s of state.salamanders) s.nearFoePool = true;
    for (const c of state.crocodiles) c.nearFoePool = true;
}

// ─── ALIEN WORLD: HUMAN SPACE MARINES (spawn at lake outpost positions) ───
function spawnHumanExplorers() {
    state.humanExplorers = [];
    for (const lake of lakes) {
        const { size, cx, cy } = lake;
        if (size < 12) continue;
        let count = 0;
        if (size >= 50) { count = 2; let p = 0.35; while (Math.random() < p) { count++; p *= 0.4; } }
        else if (size >= 20) { count = 1; if (Math.random() < 0.5) count = 2; }
        else if (Math.random() < 0.5) count = 1;
        for (let ci = 0; ci < count; ci++) {
            const angle = Math.random() * Math.PI * 2;
            const spread = Math.sqrt(size) * TILE * 0.18;
            state.humanExplorers.push({
                x: cx + Math.cos(angle) * spread, y: cy + Math.sin(angle) * spread,
                homeX: cx, homeY: cy,
                w: 14, h: 20, hp: 200, maxHp: 200,
                speed: 2.2, gold: 35, score: 250, damage: 20,
                animTimer: 0, hurtTimer: 0, attackCooldown: 0,
                shootCooldown: 0, facingX: 1, wanderTimer: 0, wanderAngle: 0,
                nearFoe: true, encampRadius: 340
            });
        }
    }
    // All explorers fight each other on contact — nearFoe always true
    // (cross-faction aggro happens within encampment range in update.js)
}

// ─── ALIEN WORLD: ALIEN SCOUTS (spawn at lava/plasma outpost positions) ───
function spawnAlienExplorers() {
    state.alienExplorers = [];
    for (const pool of lavaPools) {
        const { size, cx, cy } = pool;
        if (size < 12) continue;
        let count = 0;
        if (size >= 50) { count = 2; let p = 0.35; while (Math.random() < p) { count++; p *= 0.4; } }
        else if (size >= 20) { count = 1; if (Math.random() < 0.5) count = 2; }
        else if (Math.random() < 0.5) count = 1;
        for (let ci = 0; ci < count; ci++) {
            const angle = Math.random() * Math.PI * 2;
            const spread = Math.sqrt(size) * TILE * 0.18;
            state.alienExplorers.push({
                x: cx + Math.cos(angle) * spread, y: cy + Math.sin(angle) * spread,
                homeX: cx, homeY: cy,
                w: 14, h: 18, hp: 160, maxHp: 160,
                speed: 2.8, gold: 40, score: 300, damage: 25,
                animTimer: 0, hurtTimer: 0, attackCooldown: 0,
                blinkCooldown: 0, facingX: 1, wanderTimer: 0, wanderAngle: 0,
                nearFoe: true, encampRadius: 380
            });
        }
    }
}

// ─── TREE SPAWNING ───
function spawnTrees() {
    // Filter out positions that are now on water (important for sailorWorld after terrain inversion)
    state.trees = WORLD_TREE_POSITIONS
        .filter(pos => getTerrainAt(pos.tx, pos.ty) !== 'water')
        .map(pos => {
            const type = pos.treeType;
            const hp = type === 'pine' ? 8 : type === 'dead' ? 1 : type === 'fruit' ? 3 : type === 'redwood' ? 20 : 5;
            return { x: pos.tx, y: pos.ty, hp, maxHp: hp, hurtTimer: 0, treeType: type };
        });
    // Lumberjack world: pack the world with extra trees (~4x density)
    if (state.player.charAxeArc) {
        const TYPES = ['oak', 'oak', 'oak', 'pine', 'pine', 'redwood'];
        const extra = 1800;
        const margin = 120;
        for (let i = 0; i < extra; i++) {
            const tx = margin + Math.random() * (WORLD_W - margin * 2);
            const ty = margin + Math.random() * (WORLD_H - margin * 2);
            // Skip water/lava, and keep spawn area clear
            const t = getTerrainAt(tx, ty);
            if (t === 'water' || t === 'lava') continue;
            const dx = tx - WORLD_W / 2, dy = ty - WORLD_H / 2;
            if (Math.abs(dx) < 160 && Math.abs(dy) < 160) continue;
            const treeType = TYPES[Math.floor(Math.random() * TYPES.length)];
            const hp = treeType === 'pine' ? 8 : treeType === 'redwood' ? 20 : 5;
            state.trees.push({ x: tx, y: ty, hp, maxHp: hp, hurtTimer: 0, treeType });
        }
    }
}

// ─── SHOP ───
function randomizeShop() {
    const avail = Object.keys(ALL_WEAPONS).filter(k =>
        k !== 'sword' && !ALL_WEAPONS[k].isFusion && !ALL_WEAPONS[k].isCharity
        && !ALL_WEAPONS[k].isCharExclusive
        && !state.player.ownedWeapons.includes(k));
    const shuffled = avail.sort(() => Math.random() - 0.5);
    // Keep locked items in place, replace only unlocked slots
    const newWeapons = state.shopWeapons.slice();
    // Ensure we have 3 slots
    while (newWeapons.length < 3) newWeapons.push(null);
    let si = 0;
    for (let i = 0; i < 3; i++) {
        const key = newWeapons[i];
        if (key && state.shopLocks[key]) continue; // preserve locked
        // Advance past already-chosen or locked items
        while (si < shuffled.length && (state.shopLocks[shuffled[si]] || newWeapons.includes(shuffled[si]))) si++;
        newWeapons[i] = shuffled[si] !== undefined ? shuffled[si++] : null;
    }
    state.shopWeapons = newWeapons.filter(Boolean).slice(0, 3);
    // Fill up to 3 if needed
    for (const k of shuffled) {
        if (state.shopWeapons.length >= 3) break;
        if (!state.shopWeapons.includes(k) && !state.shopLocks[k]) state.shopWeapons.push(k);
    }
}
randomizeShop();
