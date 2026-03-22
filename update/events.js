// ─── QUEST PROGRESS TICK ───
function _completeQuest() {
    const q = state.currentQuest;
    if (!q) return;
    const p = state.player;
    let msg = 'Quest complete: ' + q.name + '!';
    if (q.reward.gold) { p.gold += q.reward.gold; p.totalGoldEarned = (p.totalGoldEarned||0) + q.reward.gold; msg += ' +' + q.reward.gold + ' gold'; }
    if (q.reward.heart) { state.heartPickups.push({ x: p.x + (Math.random()-0.5)*40, y: p.y + (Math.random()-0.5)*40, life: 600 }); }
    if (q.reward.upgrade) { state.pendingUpgradeCount++; updateUpgradeButton(); }
    showNotif(msg, true);
    state.currentQuest = null;
}

function updateQuestProgress() {
    const q = state.currentQuest;
    if (!q || q.failed) return;
    const p = state.player;

    if (q.type === 'frames') {
        q.progress = Math.min(q.target, (q.progress || 0) + 1);
    } else if (q.type === 'streak') {
        q.progress = Math.max(q.progress || 0, p.streak || 0);
    } else if (q.type === 'damage') {
        // tracked externally via _questDmgThisRound — updated in combat.js
    } else if (q.type === 'goldCollect') {
        const goldNow = p.totalGoldEarned || 0;
        q.progress = Math.max(0, goldNow - (q._goldAtStart || 0));
    }

    // noHit: reset if player takes damage (tracked via flag set in enemies.js)
    if (q.type === 'noHit' && state._questHitThisFrame) {
        q._noHitKills = 0; q._noHitThisRound = false;
        q.progress = 0;
    }
    if (q.type === 'noHit') q.progress = q._noHitKills || 0;

    // noDash: reset if player dashed
    if (q.type === 'noDash' && p.dashing) {
        q._noDashKills = 0; q._noDashThisRound = false;
        q.progress = 0;
    }
    if (q.type === 'noDash') q.progress = q._noDashKills || 0;

    state._questHitThisFrame = false;

    if (q.progress >= q.target) _completeQuest();
}

// ─── MID-RUN EVENT TICK ───
function updateEvents() {
    const p = state.player;
    updateQuestProgress();

    if (state.activeEvent) {
        if (state.activeEvent.duration > 0) {
            state.activeEvent.timer--;
            if (state.activeEvent.timer <= 0) {
                state.activeEvent.remove(state, p);
                state.activeEvent = null;
            }
        }
        // Meteor shower: spawn fireballs from sky every 45 frames
        if (state._meteorActive && state.frame % 45 === 0) {
            const mx = state.camera.x + Math.random() * 800;
            const my = state.camera.y + Math.random() * 600;
            hitEnemies(mx, my, 60, 25, false, true);
            if (p.hp > 0) {
                const pdist = Math.hypot(p.x - mx, p.y - my);
                if (pdist < 60) { p.hp -= 8; createExplosion(mx, my, '#ff6600'); }
            }
            createExplosion(mx, my, '#ff4400');
        }
        // Healing spring: restore 1 HP every 90 frames
        if (state._healSpringActive) {
            state._healSpringTimer++;
            if (state._healSpringTimer % 90 === 0) p.hp = Math.min(p.maxHp, p.hp + 1);
        }
        // Eclipse: +30% enemy dmg and hp already applied via flag in enemy logic
        // Frost: slow enemies (applied in enemy speed check below via _frostActive flag)
    }

    // Challenge zone update
    updateChallengeZone();

    // Dungeon update
    updateDungeon();

    // Daily challenge modifiers (per-frame effects like poison)
    updateDailyModifiers();
}

function _spawnChallengeEnemy(cz) {
    const TYPES = ['slime', 'skeleton', 'wraith', 'imp', 'spider'];
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const angle = Math.random() * Math.PI * 2;
    const r = cz.r * 0.6;
    const ex = cz.x + Math.cos(angle) * r, ey = cz.y + Math.sin(angle) * r;
    const base = ENEMY_TYPES.find(t => t.id === type) || ENEMY_TYPES[0];
    const hp = Math.round((base.hp || 40) * (1 + state.player.wave * 0.1));
    state.enemies.push({ ...base, x: ex, y: ey, hp, maxHp: hp, _inChallengeZone: true, gold: Math.round((base.gold || 5) * 1.5), score: base.score || 20 });
}

function updateChallengeZone() {
    const cz = state.challengeZone;
    if (!cz || cz.complete) return;
    const p = state.player;
    const distToCenter = Math.hypot(p.x - cz.x, p.y - cz.y);

    if (!cz.active) {
        // Pulse to attract player; activate when player steps inside
        if (distToCenter < cz.r) {
            cz.active = true;
            cz.wave = 0;
            cz.enemiesLeft = 0;
            showNotif('CHALLENGE ZONE activated! Survive ' + cz.maxWaves + ' waves!', true);
        }
        return;
    }

    // Count challenge enemies still alive
    const czEnemies = state.enemies.filter(e => e._inChallengeZone);
    cz.enemiesLeft = czEnemies.length;

    // If all enemies cleared, advance wave or complete
    if (cz.enemiesLeft === 0 && !cz._spawning) {
        if (cz.wave >= cz.maxWaves) {
            // All waves done: drop chest + reward
            cz.complete = true;
            state.treasureChests.push({ x: cz.x, y: cz.y, opened: false, openedTimer: 0, isMimic: false, loot: 'challenge' });
            const goldReward = 200 + state.player.wave * 20;
            state.goldPickups.push({ x: cz.x + 20, y: cz.y, amount: goldReward, life: 300 });
            state.goldPickups.push({ x: cz.x - 20, y: cz.y, amount: goldReward, life: 300 });
            state.pendingUpgradeCount++; updateUpgradeButton();
            showNotif('CHALLENGE ZONE cleared! Rewards unlocked!', true);
        } else {
            // Spawn next wave
            cz.wave++;
            cz._spawning = true;
            const count = 4 + cz.wave * 2;
            for (let i = 0; i < count; i++) _spawnChallengeEnemy(cz);
            cz._spawning = false;
            showNotif('Challenge wave ' + cz.wave + '/' + cz.maxWaves + '!');
        }
    }
}
