// ─── NATURE: FIRE TRAILS, SHOCKWAVES, ENEMY PROJECTILES, PARTICLES, TREASURE CHESTS ───
function updateNature() {
    const p = state.player;
    const _mpGuest = typeof MP !== 'undefined' && MP.active && !MP.isHost;

    // Fire trails
    for (let i = state.fireTrails.length - 1; i >= 0; i--) {
        const f = state.fireTrails[i]; f.life--;
        if (!_mpGuest) state.enemies.forEach(e => { if (Math.hypot(e.x - f.x, e.y - f.y) < 18) e.hp -= f.damage * 0.1; });
        if (f.life <= 0) state.fireTrails.splice(i, 1);
    }
    // Janitor slippery patches
    if (state.slipperyPatches) {
        for (let i = state.slipperyPatches.length - 1; i >= 0; i--) {
            state.slipperyPatches[i].life--;
            if (state.slipperyPatches[i].life <= 0) state.slipperyPatches.splice(i, 1);
        }
    }

    // Shockwaves
    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
        const sw = state.shockwaves[i];
        if (sw.delay && sw.delay > 0) { sw.delay--; continue; }
        sw.r = (sw.r || sw.radius || 10); sw.r += 5;
        if (!sw.radius) sw.radius = sw.r; else sw.radius = sw.r;
        if (!_mpGuest) state.enemies.forEach(e => {
            if (Math.abs(Math.hypot(e.x - sw.x, e.y - sw.y) - sw.r) < 18) {
                if (sw.isMegaphone) {
                    if (!sw.hitSet) sw.hitSet = new Set();
                    if (!sw.hitSet.has(e)) {
                        sw.hitSet.add(e);
                        e.hp -= sw.damage * 0.3;
                        // knockback + stun + silence
                        const edx = e.x - sw.x, edy = e.y - sw.y, kd = Math.hypot(edx, edy) || 1;
                        e.x += (edx / kd) * 25 * (1 - (e.knockbackResist || 0));
                        e.y += (edy / kd) * 25 * (1 - (e.knockbackResist || 0));
                        if (!e.isBoss) { e.stunned = true; e.stunTimer = 60; }
                        e.silenced = (e.silenced || 0) + 60;
                        createExplosion(e.x, e.y, '#f06292');
                    }
                } else {
                    e.hp -= sw.damage * 0.2;
                }
            }
        });
        if (sw.r >= sw.maxR) state.shockwaves.splice(i, 1);
    }

    // Lightning effects
    for (let i = state.lightningEffects.length - 1; i >= 0; i--) { state.lightningEffects[i].life--; if (state.lightningEffects[i].life <= 0) state.lightningEffects.splice(i, 1); }

    // Enemy projectiles
    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = state.enemyProjectiles[i];
        ep.x += ep.vx; ep.y += ep.vy; ep.life--;
        if (Math.hypot(ep.x - p.x, ep.y - p.y) < 16 * (p.sizeScale || 1) && !(p.rabbitInvTimer > 0) && !state.underwater) {
            let catDodge = p.pet === 'cat' ? 0.20 : 0;
            if (p.pet === 'cat' && petBranchIs(1, 0, 0)) { // Acrobat path
                const dt3 = Math.max(0, p.petEvolveLevel - 3);
                catDodge += Math.min(0.55, dt3 * 0.08);
            }
            if (Math.random() < catDodge) {
                addPetAction(1); // cat: track dodges
                for (let k = 0; k < 5; k++) state.particles.push({ x: ep.x, y: ep.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 20, color: '#a0a0ff' });
                // Ninja cat path: dodge leaves a decoy explosion (branch 2)
                if (p.pet === 'cat' && petBranchIs(2, 0, 0) && p.petEvolveLevel >= 1) {
                    const dt3 = Math.max(0, p.petEvolveLevel - 3);
                    const decoyCnt = dt3 >= 4 ? 2 : 1;
                    for (let dc = 0; dc < decoyCnt; dc++) {
                        const dx2 = ep.x + (Math.random()-0.5)*20, dy2 = ep.y + (Math.random()-0.5)*20;
                        state.enemies.forEach(e => { if (Math.hypot(e.x-dx2, e.y-dy2) < 30 + dt3*8) e.hp -= 20 * (dt3 >= 2 ? 1.5 : 1); });
                        createExplosion(dx2, dy2, '#a0a0ff');
                    }
                }
                // Lucky cat path: dodge drops gold (branch 3)
                if (p.pet === 'cat' && petBranchIs(3, 0, 0) && p.petEvolveLevel >= 1) {
                    const dt3 = Math.max(0, p.petEvolveLevel - 3);
                    const goldAmt = 5 + dt3 * 10;
                    state.goldPickups.push({ x: ep.x, y: ep.y, amount: goldAmt, life: 180 });
                }
                ep.life = 0; continue;
            }
            const reflectChance = hasUpgrade('mirrorShield') ? 0.3 + upgradeLevel('mirrorShield') * 0.15 : 0;
            if (Math.random() < reflectChance) {
                state.projectiles.push({ x: ep.x, y: ep.y, vx: -ep.vx, vy: -ep.vy, damage: ep.damage * 1.5, life: 60, type: 'reflected' });
                createExplosion(ep.x, ep.y, '#b0c4ff');
            } else {
                let dmg = ep.damage;
                if (hasUpgrade('fortress')) dmg *= (0.6 - upgradeLevel('fortress') * 0.1);
                p.hp -= dmg;
                createExplosion(ep.x, ep.y, '#4fc3f7');
                if (p.hp <= 0) {
                    if (hasUpgrade('phoenix') && !p.phoenixUsed) {
                        p.hp = p.maxHp * (0.5 + upgradeLevel('phoenix') * 0.15); p.phoenixUsed = true;
                        showNotif('Phoenix revive!'); createExplosion(p.x, p.y, '#ff8800');
                    } else endGame();
                }
            }
            ep.life = 0;
        }
        if (ep.life <= 0) state.enemyProjectiles.splice(i, 1);
    }

    // Spider webs
    for (let i = state.spiderWebs.length - 1; i >= 0; i--) {
        state.spiderWebs[i].life--;
        if (state.spiderWebs[i].life <= 0) state.spiderWebs.splice(i, 1);
    }

    // Treasure chests — spawn one every ~10s, max 4 at a time
    if (state.frame % 600 === 0 && state.treasureChests.filter(c => !c.opened).length < 4) {
        const cang = Math.random() * Math.PI * 2;
        const cdist = 350 + Math.random() * 450;
        const cx2 = p.x + Math.cos(cang) * cdist, cy2 = p.y + Math.sin(cang) * cdist;
        if (cx2 > 60 && cx2 < WORLD_W - 60 && cy2 > 60 && cy2 < WORLD_H - 60) {
            state.treasureChests.push({ x: cx2, y: cy2, opened: false, openedTimer: 0, isMimic: Math.random() < 0.03 });
        }
    }
    for (let i = state.treasureChests.length - 1; i >= 0; i--) {
        const ch = state.treasureChests[i];
        if (ch.opened) {
            ch.openedTimer--;
            if (ch.openedTimer <= 0) state.treasureChests.splice(i, 1);
            continue;
        }
        const chRevealDist = ch.isMimic ? 60 : 28;
        if (Math.hypot(ch.x - p.x, ch.y - p.y) < chRevealDist) {
            ch.opened = true; ch.openedTimer = 1;
            if (ch.isMimic) {
                const mTmpl = ENEMY_TYPES.find(t => t.type === 'mimic');
                const ws = 1 + (p.wave - 1) * 0.12;
                state.enemies.push({
                    x: ch.x, y: ch.y, w: 16, h: 16, type: 'mimic',
                    hp: mTmpl.hp * ws, maxHp: mTmpl.hp * ws,
                    speed: mTmpl.speed, color: mTmpl.color,
                    gold: mTmpl.gold, score: mTmpl.score,
                    sizeScale: 1, animTimer: 0,
                    elite: false, isBoss: false, dormant: false,
                    knockbackResist: 0, hurtTimer: 0,
                    mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0, isEnraged: false
                });
                for (let k = 0; k < 10; k++) createExplosion(ch.x + (Math.random()-0.5)*20, ch.y + (Math.random()-0.5)*20, '#cc2200');
                showNotif("IT'S A MIMIC!");
            } else {
                ch.openedTimer = 100;
                if (ch.loot === 'dungeon') {
                    // Dungeon chest: jackpot loot
                    const goldAmt = 400 + Math.floor(Math.random() * 200) + p.wave * 15;
                    p.gold += goldAmt; p.totalGoldEarned = (p.totalGoldEarned || 0) + goldAmt;
                    p.hp = p.maxHp; // full heal
                    state.pendingUpgradeCount += 2; updateUpgradeButton();
                    showNotif('DUNGEON CHEST! +' + goldAmt + ' gold, full heal, 2 upgrades!', true);
                    for (let k = 0; k < 8; k++) createExplosion(ch.x + (Math.random()-0.5)*40, ch.y + (Math.random()-0.5)*40, '#ffd700');
                } else if (ch.loot === 'challenge') {
                    // Challenge zone chest
                    const goldAmt = 200 + Math.floor(Math.random() * 100) + p.wave * 8;
                    p.gold += goldAmt; p.totalGoldEarned = (p.totalGoldEarned || 0) + goldAmt;
                    p.hp = Math.min(p.maxHp, p.hp + 60);
                    showNotif('Challenge Chest! +' + goldAmt + ' gold, +60 HP!', true);
                    for (let k = 0; k < 5; k++) createExplosion(ch.x + (Math.random()-0.5)*30, ch.y + (Math.random()-0.5)*30, '#ff7043');
                } else {
                    const roll = Math.random();
                    // Rubix cube: 2% chance from any chest (only if not yet found this run)
                    if (roll < 0.02 && !state.hasRubixCube && !persist.achievements.rubixCuberUnlock) {
                        state.hasRubixCube = true;
                        showNotif('Found a Rubix Cube! Press Z to try to solve it!');
                    } else if (roll < 0.5) {
                        const amt = 60 + Math.floor(Math.random() * 120);
                        p.gold += amt; showNotif('Chest! +' + amt + ' Gold!');
                    } else if (roll < 0.75) {
                        p.hp = Math.min(p.maxHp, p.hp + 50); showNotif('Chest! +50 HP!');
                    } else {
                        state.pendingUpgradeCount++; updateUpgradeButton(); showNotif('Chest! Free Upgrade!');
                    }
                }
                createExplosion(ch.x, ch.y, '#ffd700');
                for (let k = 0; k < 3; k++) createExplosion(ch.x + (Math.random()-0.5)*24, ch.y + (Math.random()-0.5)*24, '#ffaa00');
            }
        }
    }

    // Particles (cap at 300 to prevent FPS drops)
    if (state.particles.length > 300) state.particles.splice(0, state.particles.length - 300);
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i]; pt.x += pt.vx; pt.y += pt.vy; pt.life--;
        if (pt.life <= 0) state.particles.splice(i, 1);
    }

    // Damage numbers
    for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
        const dn = state.damageNumbers[i]; dn.y += dn.vy; dn.life--;
        if (dn.life <= 0) state.damageNumbers.splice(i, 1);
    }

    // Egg update
    for (let i = state.eggs.length - 1; i >= 0; i--) {
        const eg = state.eggs[i];
        eg.timer--;
        if (eg.timer <= 0) {
            const egBranch = eg.branch || 0; const egDt = eg.deepTier || 0;
            const bombPath = egBranch === 1;
            const clusterPath = egBranch === 2;
            const goldPath = egBranch === 3;
            const eDmg = 60 + (bombPath ? egDt * 25 : 0);
            const eRadius = 50 + (bombPath ? egDt * 15 : 0);
            state.enemies.forEach(e => { if (Math.hypot(e.x - eg.x, e.y - eg.y) < eRadius) { e.hp -= eDmg; state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(eDmg), life: 50, vy: -1.5, crit: false }); } });
            if (clusterPath && egDt >= 0) {
                const miniCount = Math.min(3 + egDt, 8);
                for (let mc = 0; mc < miniCount; mc++) {
                    const ma = (mc / miniCount) * Math.PI * 2;
                    state.eggs.push({ x: eg.x + Math.cos(ma)*20, y: eg.y + Math.sin(ma)*20, timer: 30, branch: 0, deepTier: 0 });
                }
            }
            if (goldPath) {
                const goldAmt = 8 + egDt * 10;
                state.goldPickups.push({ x: eg.x, y: eg.y, amount: goldAmt, life: 180 });
            }
            for (let k = 0; k < 12; k++) createExplosion(eg.x + (Math.random()-0.5)*30, eg.y + (Math.random()-0.5)*30, '#ff8800');
            createExplosion(eg.x, eg.y, '#ffdd44');
            if (p.pet === 'chicken') addPetAction(1); // chicken: track egg detonations
            state.eggs.splice(i, 1);
        }
    }
}
