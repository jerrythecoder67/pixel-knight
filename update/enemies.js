// ─── ENEMY AI UPDATE LOOP + PLAYER PROJECTILES ───
function updateEnemies() {
    const p = state.player;

    // Enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i]; e.animTimer++;
        if (e.hurtTimer > 0) e.hurtTimer--;
        if (e.hitFlash > 0) e.hitFlash--;

        // Poison tick
        if (e.poisoned) {
            e.poisonTimer--;
            if (state.frame % 10 === 0) {
                e.hp -= e.poisonDmg;
                state.particles.push({ x: e.x + (Math.random() - 0.5) * 8, y: e.y - 5, vx: (Math.random() - 0.5) * 1.5, vy: -1, life: 20, color: '#00ff44' });
            }
            if (e.poisonTimer <= 0) e.poisoned = false;
        }

        if (e.charmed) { e.charmTimer--; if (e.charmTimer <= 0) e.charmed = false; }

        // Host-relative distance (always used for damage/boss specials)
        const hostEdx = p.x - e.x, hostEdy = p.y - e.y, hostDist = Math.hypot(hostEdx, hostEdy);
        // MP: non-boss enemies may target a guest player for movement
        let edx = hostEdx, edy = hostEdy, dist = hostDist;
        if (typeof MP !== 'undefined' && MP.active && MP.isHost && e.mpTargetIdx > 0 && !e.isBoss && !e.isShadowDemon) {
            const gpIdx = (e.mpTargetIdx - 1) % Math.max(1, MP.guestPlayers.length);
            const gpt = MP.guestPlayers[gpIdx];
            if (gpt && gpt.isAlive) { edx = gpt.x - e.x; edy = gpt.y - e.y; dist = Math.hypot(edx, edy) || 1; }
        }
        const pContactDist = 20 * (p.sizeScale || 1);
        // Ninja invisibility: enemies slow to a wander when player is invisible
        if (p.ninjaInvisible && hostDist > 40) { e.x += (Math.random()-0.5)*0.5; e.y += (Math.random()-0.5)*0.5; continue; }
        // Underwater: land enemies can't reach the diver
        if (state.underwater && !e.underwaterCapable) { e.x += (Math.random()-0.5)*0.8; e.y += (Math.random()-0.5)*0.8; continue; }
        let spd = e.speed;
        if (hasUpgrade('frostAura') && dist < 100 + upgradeLevel('frostAura') * 10) spd *= 0.6 - upgradeLevel('frostAura') * 0.1;
        spd *= nightMult();
        // Event/weather speed modifiers
        if (state._frostActive) spd *= 0.6;
        const _wsCur = state.weather.extreme || (state.weather.stage > 0 ? WEATHER_STAGES[state.weather.stage] : null);
        if (_wsCur) spd *= _wsCur.speedMult;
        if (state._eclipseActive) spd *= 1.3;
        if (state._dailyEnemySpeedMult && state._dailyEnemySpeedMult !== 1) spd *= state._dailyEnemySpeedMult;
        if (e.wolfSlowed > 0) spd *= 0.45;
        if (e.toxinSlowed && e.toxinSlowed >= state.frame) spd *= 0.6;
        if (e.stunned && e.stunTimer > 0) { e.stunTimer--; if (e.stunTimer <= 0) e.stunned = false; spd = 0; }
        if (e.pinnedTimer > 0) { e.pinnedTimer--; spd = 0; }
        // Hook pull (fishing rod): yank enemy toward player
        if (e.pullingToPlayer > 0) {
            e.pullingToPlayer--;
            const pdx = p.x - e.x, pdy = p.y - e.y, pd = Math.hypot(pdx, pdy) || 1;
            e.x += (pdx / pd) * 6; e.y += (pdy / pd) * 6;
            spd = 0; // override normal movement
        }
        if (e.charmed && e.charmedTimer > 0) { e.charmedTimer--; spd *= 0.25; if (e.charmedTimer <= 0) e.charmed = false; }
        // Bob: nearby enemies randomly stop and stare for 1s
        if (p.charBob && !e.isBoss && dist < 200 && !e.staring && Math.random() < 0.0004) {
            e.staring = true; e.starTimer = 60; // 1s
        }
        if (e.staring) { e.starTimer--; if (e.starTimer <= 0) e.staring = false; spd = 0; }
        // Janitor mop: slippery patches slow enemies passing over them
        if (state.slipperyPatches) {
            for (const sp of state.slipperyPatches) {
                if (Math.hypot(e.x - sp.x, e.y - sp.y) < sp.radius) { spd *= 0.5; break; }
            }
        }

        // Monster Tamer: tamed enemies are temporary allies
        if (e.isTamed) {
            e.tamedTimer--;
            if (e.tamedTimer <= 0) { e.isTamed = false; continue; }
            // Orbit player
            if (dist > 80 && dist > 5) { e.x += (edx / dist) * spd * 0.9; e.y += (edy / dist) * spd * 0.9; }
            else if (dist < 45 && dist > 5) { e.x -= (edx / dist) * spd * 0.6; e.y -= (edy / dist) * spd * 0.6; }
            // Attack nearest non-tamed enemy
            if (!e.tamedAttackCooldown) e.tamedAttackCooldown = 0;
            e.tamedAttackCooldown--;
            if (e.tamedAttackCooldown <= 0) {
                let nearestFoe = null, nearFoeDist = 180;
                for (const other of state.enemies) {
                    if (other === e || other.isTamed || (p.charReaper && other.type === 'skeleton')) continue;
                    const od = Math.hypot(other.x - e.x, other.y - e.y);
                    if (od < nearFoeDist) { nearFoeDist = od; nearestFoe = other; }
                }
                if (nearestFoe) {
                    const tdx = nearestFoe.x - e.x, tdy = nearestFoe.y - e.y, tdd = nearFoeDist || 1;
                    e.x += (tdx / tdd) * spd * 1.1;
                    e.y += (tdy / tdd) * spd * 1.1;
                    if (nearFoeDist < 20) { nearestFoe.hp -= 8; nearestFoe.hurtTimer = 8; e.tamedAttackCooldown = 40; }
                }
            }
            continue;
        }

        // Reaper: skeletons are permanent allies — orbit player and shoot at enemies
        if (p.charReaper && e.type === 'skeleton') {
            e.animTimer = (e.animTimer || 0) + 1;
            if (dist > 110 && dist > 5) { e.x += (edx / dist) * spd * 0.9; e.y += (edy / dist) * spd * 0.9; }
            else if (dist < 65 && dist > 5) { e.x -= (edx / dist) * spd * 0.6; e.y -= (edy / dist) * spd * 0.6; }
            if (e.shootTimer === undefined) e.shootTimer = 20 + Math.floor(Math.random() * 60);
            e.shootTimer--;
            if (e.shootTimer <= 0) {
                e.shootTimer = 80 + Math.floor(Math.random() * 40);
                let target = null, minTD = Infinity;
                state.enemies.forEach(other => {
                    if (other === e || (p.charReaper && other.type === 'skeleton')) return;
                    const d = Math.hypot(other.x - e.x, other.y - e.y);
                    if (d < minTD) { minTD = d; target = other; }
                });
                if (target && minTD < 260) {
                    const dx = target.x - e.x, dy = target.y - e.y, d = minTD || 1;
                    state.projectiles.push({ x: e.x, y: e.y, vx: (dx / d) * 3.5, vy: (dy / d) * 3.5, damage: 10, life: 90, type: 'bone' });
                }
            }
            continue;
        }

        // Mimic: stay dormant until player gets close
        if (e.type === 'mimic' && e.dormant) {
            if (dist < 80) {
                e.dormant = false;
                for (let k = 0; k < 10; k++) createExplosion(e.x + (Math.random()-0.5)*20, e.y + (Math.random()-0.5)*20, '#cc2200');
                showNotif("IT'S A MIMIC!");
            } else {
                if (e.hp <= 0) {
                    state.enemies.splice(i, 1);
                    p.kills++; p.score += Math.round(e.score * p.streakMult);
                    if (e.isWaveEnemy) state.waveEnemiesKilled++;
                    state.pacifistTimer = 0;
                    persist.lifetimeKills = (persist.lifetimeKills || 0) + 1;
                    if (!persist.seenEnemies) persist.seenEnemies = {};
                    persist.seenEnemies[e.type] = true;
                    state.goldPickups.push({ x: e.x, y: e.y, amount: e.gold, life: 180 });
                    createExplosion(e.x, e.y, '#cc2200'); checkMilestone(); checkEvolve();
                }
                continue;
            }
        }

        if (e.charmed) {
            let target = null, minTD = Infinity;
            state.enemies.forEach(other => {
                if (other === e || other.charmed || other.isBoss) return;
                const d = Math.hypot(other.x - e.x, other.y - e.y);
                if (d < minTD) { minTD = d; target = other; }
            });
            if (target) {
                const tdx = target.x - e.x, tdy = target.y - e.y, td = minTD || 1;
                e.x += (tdx / td) * spd; e.y += (tdy / td) * spd;
                if (minTD < 20) { target.hp -= 15; createExplosion(target.x, target.y, '#e040fb'); }
            }
        } else {
            // Skeleton archers keep distance and shoot
            if (e.type === 'skeleton') {
                if (dist < 120 && dist > 5) {
                    // Flee slowly (0.7x speed instead of 1.5x)
                    e.x -= (edx / dist) * spd * 0.7; e.y -= (edy / dist) * spd * 0.7;
                } else if (dist > 280 && dist > 5) {
                    // Come back when player is too far away
                    e.x += (edx / dist) * spd * 1.2; e.y += (edy / dist) * spd * 1.2;
                }
                if (dist >= 100 && dist <= 240) {
                    if (e.shootTimer === undefined) e.shootTimer = Math.floor(Math.random() * 80);
                    e.shootTimer--;
                    if (e.shootTimer <= 0) {
                        e.shootTimer = 100 + Math.floor(Math.random() * 40);
                        const al = dist || 1;
                        state.enemyProjectiles.push({ x: e.x, y: e.y, vx: (edx / al) * 3.5, vy: (edy / al) * 3.5, damage: 6, life: 90, type: 'bone' });
                    }
                }
            } else if (e.type === 'necromancer') {
                // Keep distance, drift away when player closes in
                if (dist < 180 && dist > 5) { e.x -= (edx / dist) * spd; e.y -= (edy / dist) * spd; }
                else if (dist > 350 && dist > 5) { e.x += (edx / dist) * spd * 0.7; e.y += (edy / dist) * spd * 0.7; }
            } else {
                if (dist > 5) { e.x += (edx / dist) * spd; e.y += (edy / dist) * spd; if (edx !== 0) e.facingX = edx > 0 ? 1 : -1; }
            }

            // Spider drops webs
            if (e.type === 'spider') {
                if (!e.webTimer) e.webTimer = 60 + Math.floor(Math.random() * 80);
                e.webTimer--;
                if (e.webTimer <= 0) {
                    e.webTimer = 120 + Math.floor(Math.random() * 80);
                    state.spiderWebs.push({ x: e.x, y: e.y, life: 600 });
                }
            }
            // Octopus sprays ink webs (uses webbing flag)
            if (e.webbing) {
                if (!e.inkTimer) e.inkTimer = 180 + Math.floor(Math.random() * 120);
                e.inkTimer--;
                if (e.inkTimer <= 0 && dist < 300) {
                    e.inkTimer = 200 + Math.floor(Math.random() * 100);
                    // Drop 3 ink blobs in a spread
                    for (let k = -1; k <= 1; k++) {
                        state.spiderWebs.push({ x: e.x + k * 18, y: e.y + k * 18, life: 400 });
                    }
                    showNotif('Ink cloud!');
                }
            }

            // Raptor pack hunting: +40% speed when 2+ raptors are close
            if (e.type === 'raptor') {
                const packCount = state.enemies.filter(o => o !== e && o.type === 'raptor' && Math.hypot(o.x - e.x, o.y - e.y) < 120).length;
                if (packCount >= 1 && !e._packBoost) { e._packBoost = true; e.speed *= 1.4; }
                else if (packCount < 1 && e._packBoost) { e._packBoost = false; e.speed /= 1.4; }
            }
            // Pterodactyl dive-bomb: occasionally charge at player from distance
            if (e.type === 'pterodactyl') {
                if (!e.diveTimer) e.diveTimer = 180 + Math.floor(Math.random() * 120);
                e.diveTimer--;
                if (e.diveTimer <= 0 && dist > 200 && dist < 500) {
                    e.diveTimer = 300 + Math.floor(Math.random() * 120);
                    const d = dist || 1;
                    e.x += (edx / d) * 160; e.y += (edy / d) * 160;
                    for (let k = 0; k < 5; k++) createExplosion(e.x + (Math.random()-0.5)*20, e.y + (Math.random()-0.5)*20, '#78909c');
                }
            }

            // Wizard shoots projectiles
            if (e.type === 'wizard' && dist < 350) {
                if (e.shootTimer === undefined) e.shootTimer = Math.floor(Math.random() * 80);
                e.shootTimer--;
                if (e.shootTimer <= 0) {
                    e.shootTimer = 90 + Math.floor(Math.random() * 40);
                    const al = dist || 1;
                    state.enemyProjectiles.push({ x: e.x, y: e.y, vx: (edx / al) * 4, vy: (edy / al) * 4, damage: 8, life: 100, type: 'wizard' });
                }
            }

            // Human archer: keeps range, shoots arrows
            if (e.type === 'humanArcher' && dist < 320) {
                if (e.shootTimer === undefined) e.shootTimer = Math.floor(Math.random() * 70);
                e.shootTimer--;
                if (e.shootTimer <= 0) {
                    e.shootTimer = 80 + Math.floor(Math.random() * 40);
                    const al = dist || 1;
                    state.enemyProjectiles.push({ x: e.x, y: e.y, vx: (edx / al) * 5, vy: (edy / al) * 5, damage: 7, life: 80, type: 'bone' });
                }
                // Back away if player gets close
                if (dist < 120) { e.x -= (edx / dist) * e.speed * 1.2; e.y -= (edy / dist) * e.speed * 1.2; }
            }
            // Crossbowman: slower but harder-hitting bolts
            if (e.type === 'crossbowman' && dist < 380) {
                if (e.shootTimer === undefined) e.shootTimer = Math.floor(Math.random() * 100);
                e.shootTimer--;
                if (e.shootTimer <= 0) {
                    e.shootTimer = 120 + Math.floor(Math.random() * 60);
                    const al = dist || 1;
                    state.enemyProjectiles.push({ x: e.x, y: e.y, vx: (edx / al) * 6.5, vy: (edy / al) * 6.5, damage: 12, life: 85, type: 'bone' });
                }
                if (dist < 140) { e.x -= (edx / dist) * e.speed * 1.0; e.y -= (edy / dist) * e.speed * 1.0; }
            }
            // Captain: calls for reinforcements every 15s
            if (e.type === 'captain' && !e.isBoss) {
                if (e.reinforceTimer === undefined) e.reinforceTimer = 900;
                e.reinforceTimer--;
                if (e.reinforceTimer <= 0) {
                    e.reinforceTimer = 900;
                    showNotif('Captain calls for backup!');
                    for (let ri = 0; ri < 2; ri++) {
                        const ra = Math.random() * Math.PI * 2;
                        state.enemies.push({ x: e.x + Math.cos(ra) * 60, y: e.y + Math.sin(ra) * 60, w: 16, h: 16, type: 'guardKnight', hp: 80, maxHp: 80, speed: 1.3, color: '#546e7a', gold: 8, score: 60, sizeScale: 0.8, animTimer: 0, elite: false, isBoss: false, knockbackResist: 0, hurtTimer: 0, dormant: false });
                    }
                }
            }

            // Necromancer summons undead minions periodically (non-boss only; boss uses bossRaiseTimer)
            if (e.type === 'necromancer' && !e.isBoss) {
                if (e.summonTimer === undefined) e.summonTimer = 180 + Math.floor(Math.random() * 100);
                e.summonTimer--;
                if (e.summonTimer <= 0) {
                    e.summonTimer = 260 + Math.floor(Math.random() * 80);
                    const sa = Math.random() * Math.PI * 2;
                    state.enemies.push({
                        x: e.x + Math.cos(sa) * 28, y: e.y + Math.sin(sa) * 28,
                        w: 8, h: 8, type: 'slime', hp: 30, maxHp: 30,
                        speed: 1.4, color: '#7b1fa2',
                        gold: 1, score: 20, sizeScale: 0.55, animTimer: 0,
                        elite: false, isBoss: false, isMini: true, knockbackResist: 0, hurtTimer: 0, dormant: false
                    });
                    for (let k = 0; k < 8; k++) state.particles.push({ x: e.x + (Math.random()-0.5)*24, y: e.y + (Math.random()-0.5)*24, vx: (Math.random()-0.5)*2, vy: -1.5, life: 35, color: '#7b1fa2' });
                }
            }

            // ─── BOSS SPECIAL MOVES (boss-only, never applied to normal enemies) ───
            if (e.isBoss) {
                // MP: boss switches target randomly every ~180 frames
                if (typeof MP !== 'undefined' && MP.active && MP.isHost && MP.guestPlayers.length > 0) {
                    if (!e._bossTargetTimer) e._bossTargetTimer = 120 + Math.floor(Math.random() * 120);
                    e._bossTargetTimer--;
                    if (e._bossTargetTimer <= 0) {
                        e._bossTargetTimer = 120 + Math.floor(Math.random() * 120);
                        e.mpTargetIdx = Math.floor(Math.random() * (1 + MP.guestPlayers.length));
                    }
                    const _bossGpIdx = e.mpTargetIdx > 0 ? (e.mpTargetIdx - 1) % Math.max(1, MP.guestPlayers.length) : -1;
                    const _bossTarget = _bossGpIdx >= 0 ? MP.guestPlayers[_bossGpIdx] : null;
                    if (_bossTarget && _bossTarget.isAlive) {
                        edx = _bossTarget.x - e.x; edy = _bossTarget.y - e.y;
                        dist = Math.hypot(edx, edy) || 1;
                    }
                }
                // ── TROLL: Ground pound ring ──
                if (e.type === 'troll') {
                    if (!e.groundPoundTimer) e.groundPoundTimer = 240 + Math.floor(Math.random() * 120);
                    e.groundPoundTimer--;
                    if (e.groundPoundTimer === 30) e.groundPoundWindup = true;
                    if (e.groundPoundTimer <= 0) {
                        e.groundPoundTimer = 240 + Math.floor(Math.random() * 120);
                        e.groundPoundWindup = false;
                        const ringCount = e.hp < e.maxHp * 0.5 ? 2 : 1;
                        for (let ring = 0; ring < ringCount; ring++) {
                            const offset = ring * (Math.PI / 8);
                            for (let k = 0; k < 8; k++) {
                                const a = offset + (k / 8) * Math.PI * 2;
                                state.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, damage: 12, life: 120, type: 'groundfire' });
                            }
                        }
                        for (let k = 0; k < 12; k++) createExplosion(e.x + (Math.random()-0.5)*50, e.y + (Math.random()-0.5)*50, '#ff6600');
                        state.screenShakeDur = 18; state.screenShakeMag = 7;
                    }
                }
                // ── WRAITH: Phase blink ──
                if (e.type === 'wraith') {
                    if (!e.blinkTimer) e.blinkTimer = 600;
                    e.blinkTimer--;
                    if (e.blinkTimer <= 0) {
                        e.blinkTimer = e.hp < e.maxHp * 0.5 ? 300 : 600;
                        const toWraithA = Math.atan2(e.y - p.y, e.x - p.x);
                        e.x = p.x + Math.cos(toWraithA) * 70;
                        e.y = p.y + Math.sin(toWraithA) * 70;
                        e.x = Math.max(20, Math.min(WORLD_W - 20, e.x));
                        e.y = Math.max(20, Math.min(WORLD_H - 20, e.y));
                        for (let k = 0; k < 8; k++) createExplosion(e.x + (Math.random()-0.5)*24, e.y + (Math.random()-0.5)*24, '#9c27b0');
                        showNotif('Wraith BLINKS!');
                    }
                }
                // ── GOLEM: Stone shell charge-up → 5s power surge ──
                if (e.type === 'golem') {
                    if (!e.golemHardenTimer) e.golemHardenTimer = 1800 + Math.floor(Math.random() * 1800);
                    if (!e.hardened && !e.golemPowered) {
                        e.golemHardenTimer--;
                        if (e.golemHardenTimer <= 0) {
                            e.hardened = true; e.hardenDur = 120;
                            showNotif('Golem HARDENS... charging!');
                        }
                    }
                    if (e.hardened) {
                        e.hardenDur--;
                        if (e.hardenDur <= 0) {
                            e.hardened = false; e.golemPowered = true; e.powerDur = 300;
                            e.speed *= 1.6;
                            state.screenShakeDur = 20; state.screenShakeMag = 8;
                            for (let k = 0; k < 16; k++) createExplosion(e.x + (Math.random()-0.5)*70, e.y + (Math.random()-0.5)*70, '#795548');
                            showNotif('Golem ERUPTS! Powered up for 5s!');
                        }
                    }
                    if (e.golemPowered) {
                        e.powerDur--;
                        if (e.powerDur <= 0) {
                            e.golemPowered = false;
                            e.speed /= 1.6;
                            e.golemHardenTimer = 1800 + Math.floor(Math.random() * 1800);
                        }
                    }
                }
                // ── DEMON: Hellfire ring ──
                if (e.type === 'demon') {
                    if (!e.hellfireTimer) e.hellfireTimer = 180 + Math.floor(Math.random() * 120);
                    e.hellfireTimer--;
                    if (e.hellfireTimer <= 0) {
                        e.hellfireTimer = 240 + Math.floor(Math.random() * 180);
                        for (let k = 0; k < 8; k++) {
                            const a = (k / 8) * Math.PI * 2;
                            state.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8, damage: 10, life: 200, type: 'hellfire' });
                        }
                        for (let k = 0; k < 6; k++) createExplosion(e.x + (Math.random()-0.5)*30, e.y + (Math.random()-0.5)*30, '#b71c1c');
                    }
                }
                // ── IMP: Clone split at 50% HP ──
                if (e.type === 'imp' && !e.hasSplit && e.hp < e.maxHp * 0.5) {
                    e.hasSplit = true;
                    for (let s = 0; s < 2; s++) {
                        const sa = Math.random() * Math.PI * 2;
                        state.enemies.push({
                            x: e.x + Math.cos(sa) * 30, y: e.y + Math.sin(sa) * 30,
                            w: 14, h: 14, type: 'imp',
                            hp: e.maxHp * 0.4, maxHp: e.maxHp * 0.4,
                            speed: e.speed * 1.4, color: '#ff6090',
                            gold: Math.floor(e.gold * 0.3), score: Math.floor(e.score * 0.3),
                            sizeScale: 1.4, animTimer: Math.random() * 100,
                            elite: false, isBoss: false, isMini: true,
                            knockbackResist: 0, hurtTimer: 0, dormant: false,
                            mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0, isEnraged: false
                        });
                    }
                    for (let k = 0; k < 10; k++) createExplosion(e.x + (Math.random()-0.5)*30, e.y + (Math.random()-0.5)*30, '#e91e63');
                    showNotif('Imp SPLITS!');
                }
                // ── GRIM REAPER: Scythe fan + Soul Drain + Teleport ──
                if (e.type === 'grimReaper') {
                    // Phase transition
                    if (!e.phaseChangeNotif && e.hp < e.maxHp * 0.5) {
                        e.phase = 2; e.phaseChangeNotif = true;
                        e.speed *= 1.4;
                        showNotif('☠ GRIM REAPER ENRAGES ☠', true);
                        for (let k = 0; k < 16; k++) createExplosion(e.x + (Math.random()-0.5)*80, e.y + (Math.random()-0.5)*80, '#8800ff');
                    }
                    const phase2 = e.phase === 2;
                    // Scythe fan
                    if (!e.scytheTimer) e.scytheTimer = phase2 ? 60 : 100;
                    e.scytheTimer--;
                    if (e.scytheTimer <= 0) {
                        e.scytheTimer = phase2 ? 55 : 90;
                        const toP = Math.atan2(edy, edx);
                        const fanCount = phase2 ? 10 : 7;
                        const pSpeed = phase2 ? 6.5 : 5.0;
                        for (let k = 0; k < fanCount; k++) {
                            const fa = toP + (k - Math.floor(fanCount / 2)) * 0.3;
                            state.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(fa) * pSpeed, vy: Math.sin(fa) * pSpeed, damage: 22, life: 150, type: 'scythe' });
                        }
                        // Phase 2: also fire ring burst
                        if (phase2) {
                            for (let k = 0; k < 12; k++) {
                                const ra = (k / 12) * Math.PI * 2;
                                state.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(ra) * 3.5, vy: Math.sin(ra) * 3.5, damage: 14, life: 200, type: 'scythe' });
                            }
                        }
                        for (let k = 0; k < 8; k++) createExplosion(e.x + (Math.random()-0.5)*40, e.y + (Math.random()-0.5)*40, '#6600cc');
                    }
                    // Soul Drain
                    if (!e.soulDrainTimer) e.soulDrainTimer = phase2 ? 160 : 220;
                    e.soulDrainTimer--;
                    if (e.soulDrainTimer <= 0) {
                        if (dist < 450) {
                            e.soulDrainTimer = phase2 ? 150 : 210;
                            const pullD = dist || 1;
                            p.x += (edx / pullD) * (phase2 ? 55 : 38); p.y += (edy / pullD) * (phase2 ? 55 : 38);
                            p.hp -= phase2 ? 22 : 14;
                            showNotif('☠ Soul Drain!');
                            for (let k = 0; k < 12; k++) state.particles.push({ x: p.x + (Math.random()-0.5)*20, y: p.y + (Math.random()-0.5)*20, vx: (edx / pullD) * 2.5, vy: (edy / pullD) * 2.5, life: 45, color: '#8800ff' });
                        } else {
                            e.soulDrainTimer = 30; // retry soon when player gets close
                        }
                    }
                    // Teleport behind player (phase 2 only)
                    if (phase2) {
                        if (!e.teleportTimer) e.teleportTimer = 480;
                        e.teleportTimer--;
                        if (e.teleportTimer <= 0) {
                            e.teleportTimer = 360;
                            const behindAng = Math.atan2(edy, edx) + Math.PI;
                            e.x = p.x + Math.cos(behindAng) * 80;
                            e.y = p.y + Math.sin(behindAng) * 80;
                            showNotif('☠ Reaper Teleports!');
                            for (let k = 0; k < 10; k++) createExplosion(e.x + (Math.random()-0.5)*30, e.y + (Math.random()-0.5)*30, '#cc00ff');
                        }
                    }
                }
                // ── T-REX BOSS: Ground Stomp + Roar Charge ──
                if (e.type === 'trexBoss') {
                    if (!e.phaseChangeNotif && e.hp < e.maxHp * 0.5) {
                        e.phase = 2; e.phaseChangeNotif = true; e.speed *= 1.35;
                        showNotif('🦖 T-REX ENRAGES!', true);
                        for (let k = 0; k < 12; k++) createExplosion(e.x + (Math.random()-0.5)*80, e.y + (Math.random()-0.5)*80, '#2e7d32');
                    }
                    const trPhase2 = e.phase === 2;
                    // Ground stomp shockwave ring
                    if (!e.stompTimer) e.stompTimer = trPhase2 ? 120 : 200;
                    e.stompTimer--;
                    if (e.stompTimer <= 0) {
                        e.stompTimer = trPhase2 ? 100 : 180;
                        const count = trPhase2 ? 16 : 10;
                        for (let k = 0; k < count; k++) {
                            const ra = (k / count) * Math.PI * 2;
                            state.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(ra) * 4.5, vy: Math.sin(ra) * 4.5, damage: 28, life: 100, type: 'ground' });
                        }
                        for (let k = 0; k < 8; k++) createExplosion(e.x + (Math.random()-0.5)*60, e.y + (Math.random()-0.5)*60, '#1b5e20');
                        showNotif('🦖 STOMP!');
                    }
                    // Roar charge: lunge toward player
                    if (!e.chargeTimer) e.chargeTimer = trPhase2 ? 180 : 280;
                    e.chargeTimer--;
                    if (e.chargeTimer <= 0) {
                        e.chargeTimer = trPhase2 ? 160 : 250;
                        const d = dist || 1;
                        e.x += (edx / d) * 120; e.y += (edy / d) * 120;
                        showNotif('🦖 CHARGE!');
                        for (let k = 0; k < 8; k++) createExplosion(e.x + (Math.random()-0.5)*40, e.y + (Math.random()-0.5)*40, '#33691e');
                    }
                }
                // ── MEGALODON BOSS: Tail Sweep + Water Rush ──
                if (e.type === 'megalodon') {
                    if (!e.phaseChangeNotif && e.hp < e.maxHp * 0.5) {
                        e.phase = 2; e.phaseChangeNotif = true; e.speed *= 1.4;
                        showNotif('🦈 MEGALODON ENRAGES!', true);
                        for (let k = 0; k < 14; k++) createExplosion(e.x + (Math.random()-0.5)*80, e.y + (Math.random()-0.5)*80, '#455a64');
                    }
                    const mgPhase2 = e.phase === 2;
                    // Tail sweep: burst of projectiles in a fan behind it
                    if (!e.tailTimer) e.tailTimer = mgPhase2 ? 100 : 160;
                    e.tailTimer--;
                    if (e.tailTimer <= 0) {
                        e.tailTimer = mgPhase2 ? 85 : 140;
                        const toP = Math.atan2(edy, edx);
                        const fanCount = mgPhase2 ? 12 : 8;
                        for (let k = 0; k < fanCount; k++) {
                            const fa = toP + (k - Math.floor(fanCount / 2)) * 0.35;
                            state.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(fa) * 5.5, vy: Math.sin(fa) * 5.5, damage: 25, life: 130, type: 'water' });
                        }
                        showNotif('🦈 Tail Sweep!');
                    }
                    // Water rush: accelerate directly at player
                    if (!e.rushTimer) e.rushTimer = mgPhase2 ? 150 : 240;
                    e.rushTimer--;
                    if (e.rushTimer <= 0) {
                        e.rushTimer = mgPhase2 ? 130 : 200;
                        const d = dist || 1;
                        e.x += (edx / d) * 150; e.y += (edy / d) * 150;
                        for (let k = 0; k < 10; k++) createExplosion(e.x + (Math.random()-0.5)*50, e.y + (Math.random()-0.5)*50, '#546e7a');
                        showNotif('🦈 RUSH!');
                    }
                }
                // ── ALIEN QUEEN BOSS: Egg Burst + Psychic Beam ──
                if (e.type === 'alienQueen') {
                    if (!e.phaseChangeNotif && e.hp < e.maxHp * 0.5) {
                        e.phase = 2; e.phaseChangeNotif = true; e.speed *= 1.3;
                        showNotif('👽 ALIEN QUEEN ENRAGES!', true);
                        for (let k = 0; k < 14; k++) createExplosion(e.x + (Math.random()-0.5)*80, e.y + (Math.random()-0.5)*80, '#00796b');
                    }
                    const aqPhase2 = e.phase === 2;
                    // Egg burst: ring of slow alien projectiles
                    if (!e.eggTimer) e.eggTimer = aqPhase2 ? 90 : 140;
                    e.eggTimer--;
                    if (e.eggTimer <= 0) {
                        e.eggTimer = aqPhase2 ? 75 : 120;
                        const count = aqPhase2 ? 14 : 9;
                        for (let k = 0; k < count; k++) {
                            const ra = (k / count) * Math.PI * 2;
                            state.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(ra) * 3.0, vy: Math.sin(ra) * 3.0, damage: 20, life: 200, type: 'plasma' });
                        }
                        showNotif('👽 Egg Burst!');
                    }
                    // Psychic pull: yank player toward queen
                    if (!e.psychicTimer) e.psychicTimer = aqPhase2 ? 140 : 220;
                    e.psychicTimer--;
                    if (e.psychicTimer <= 0 && dist < 500) {
                        e.psychicTimer = aqPhase2 ? 120 : 200;
                        const d = dist || 1;
                        p.x += (edx / d) * (aqPhase2 ? 65 : 45);
                        p.y += (edy / d) * (aqPhase2 ? 65 : 45);
                        p.hp -= aqPhase2 ? 18 : 12;
                        showNotif('👽 Psychic Pull!');
                        for (let k = 0; k < 10; k++) state.particles.push({ x: p.x + (Math.random()-0.5)*20, y: p.y + (Math.random()-0.5)*20, vx: (edx / d) * 2, vy: (edy / d) * 2, life: 40, color: '#1de9b6' });
                    }
                }
                // ── VAMPIRE BOSS: Blood drain + summon vampire kin ──
                if (e.type === 'vampire') {
                    if (!e.phaseChangeNotif && e.hp < e.maxHp * 0.5) {
                        e.phase = 2; e.phaseChangeNotif = true; e.speed *= 1.5;
                        showNotif('🧛 VAMPIRE ENRAGES — THE SWARM RISES!', true);
                        for (let k = 0; k < 12; k++) createExplosion(e.x + (Math.random()-0.5)*60, e.y + (Math.random()-0.5)*60, '#4a0080');
                    }
                    const vampPhase2 = e.phase === 2;
                    // Summon vampire kin periodically
                    if (!e.summonBatTimer) e.summonBatTimer = vampPhase2 ? 180 : 300;
                    e.summonBatTimer--;
                    if (e.summonBatTimer <= 0) {
                        e.summonBatTimer = vampPhase2 ? 160 : 270;
                        const count = vampPhase2 ? 3 : 2;
                        const ws = 1 + p.wave * 0.08;
                        for (let s = 0; s < count; s++) {
                            const sa = (s / count) * Math.PI * 2;
                            state.enemies.push({ x: e.x + Math.cos(sa)*50, y: e.y + Math.sin(sa)*50, w: 12, h: 12, type: 'vampire', hp: 60*ws, maxHp: 60*ws, speed: 1.6, color: '#6a0080', gold: 5, score: 200, sizeScale: 0.7, animTimer: Math.random()*100, elite: false, isBoss: false, isMini: true, knockbackResist: 0, hurtTimer: 0, dormant: false, mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0, isEnraged: false });
                        }
                        showNotif('🧛 The Vampire summons his kin!');
                        for (let k = 0; k < 6; k++) createExplosion(e.x + (Math.random()-0.5)*40, e.y + (Math.random()-0.5)*40, '#6a0080');
                    }
                    // Blood drain: yank player + leech HP
                    if (!e.bloodDrainTimer) e.bloodDrainTimer = vampPhase2 ? 200 : 320;
                    e.bloodDrainTimer--;
                    if (e.bloodDrainTimer <= 0 && dist < 400) {
                        e.bloodDrainTimer = vampPhase2 ? 180 : 280;
                        const d = dist || 1;
                        p.x += (edx / d) * (vampPhase2 ? 50 : 35); p.y += (edy / d) * (vampPhase2 ? 50 : 35);
                        const drain = vampPhase2 ? 16 : 10;
                        p.hp -= drain; e.hp = Math.min(e.maxHp, e.hp + drain * 3);
                        showNotif('🧛 Blood Drain!');
                        for (let k = 0; k < 8; k++) state.particles.push({ x: p.x + (Math.random()-0.5)*16, y: p.y + (Math.random()-0.5)*16, vx: (edx/d)*-1.5, vy: (edy/d)*-1.5, life: 40, color: '#cc0044' });
                    }
                }
                // ── SPIDER BOSS: Web carpet + spiderling hatch ──
                if (e.type === 'spider') {
                    if (!e.phaseChangeNotif && e.hp < e.maxHp * 0.5) {
                        e.phase = 2; e.phaseChangeNotif = true; e.speed *= 1.4;
                        showNotif('🕷 SPIDER ENRAGES — WEBS EVERYWHERE!', true);
                        for (let k = 0; k < 10; k++) createExplosion(e.x + (Math.random()-0.5)*60, e.y + (Math.random()-0.5)*60, '#263238');
                    }
                    const spPhase2 = e.phase === 2;
                    // Web carpet: ring of webs around the boss
                    if (!e.webCarpetTimer) e.webCarpetTimer = spPhase2 ? 100 : 180;
                    e.webCarpetTimer--;
                    if (e.webCarpetTimer <= 0) {
                        e.webCarpetTimer = spPhase2 ? 85 : 150;
                        const webCount = spPhase2 ? 8 : 5;
                        for (let k = 0; k < webCount; k++) {
                            const wa = (k / webCount) * Math.PI * 2;
                            const wr = 30 + Math.random() * 80;
                            state.spiderWebs.push({ x: e.x + Math.cos(wa)*wr, y: e.y + Math.sin(wa)*wr, life: 600 });
                        }
                        showNotif('🕷 Web Carpet!');
                    }
                    // Phase 2: spawn spiderlings periodically
                    if (spPhase2) {
                        if (!e.spiderlingTimer) e.spiderlingTimer = 240;
                        e.spiderlingTimer--;
                        if (e.spiderlingTimer <= 0) {
                            e.spiderlingTimer = 220;
                            const ws = 1 + p.wave * 0.07;
                            for (let s = 0; s < 3; s++) {
                                const sa = Math.random() * Math.PI * 2;
                                state.enemies.push({ x: e.x + Math.cos(sa)*40, y: e.y + Math.sin(sa)*40, w: 10, h: 10, type: 'spider', hp: 40*ws, maxHp: 40*ws, speed: 1.8, color: '#37474f', gold: 4, score: 150, sizeScale: 0.6, animTimer: Math.random()*100, elite: false, isBoss: false, isMini: true, knockbackResist: 0, hurtTimer: 0, dormant: false, mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0, isEnraged: false });
                            }
                            showNotif('🕷 Spiderlings hatch!');
                            for (let k = 0; k < 6; k++) createExplosion(e.x + (Math.random()-0.5)*30, e.y + (Math.random()-0.5)*30, '#37474f');
                        }
                    }
                }
                // ── NECROMANCER BOSS: Raise undead + death ray bursts ──
                if (e.type === 'necromancer') {
                    if (!e.phaseChangeNotif && e.hp < e.maxHp * 0.5) {
                        e.phase = 2; e.phaseChangeNotif = true; e.speed *= 1.3;
                        showNotif('💀 NECROMANCER ENRAGES — RISE, MY DEAD!', true);
                        for (let k = 0; k < 12; k++) createExplosion(e.x + (Math.random()-0.5)*70, e.y + (Math.random()-0.5)*70, '#1a237e');
                    }
                    const necroPhase2 = e.phase === 2;
                    // Raise skeleton minions (boss version — more numerous)
                    if (!e.bossRaiseTimer) e.bossRaiseTimer = necroPhase2 ? 150 : 260;
                    e.bossRaiseTimer--;
                    if (e.bossRaiseTimer <= 0) {
                        e.bossRaiseTimer = necroPhase2 ? 130 : 220;
                        const count = necroPhase2 ? 4 : 2;
                        const ws = 1 + p.wave * 0.06;
                        for (let s = 0; s < count; s++) {
                            const sa = Math.random() * Math.PI * 2, sr = 50 + Math.random() * 100;
                            state.enemies.push({ x: e.x + Math.cos(sa)*sr, y: e.y + Math.sin(sa)*sr, w: 14, h: 14, type: 'skeleton', hp: 50*ws, maxHp: 50*ws, speed: 1.4, color: '#eceff1', gold: 5, score: 180, sizeScale: 0.85, animTimer: Math.random()*100, elite: false, isBoss: false, isMini: true, knockbackResist: 0, hurtTimer: 0, dormant: false, mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0, isEnraged: false });
                            for (let k = 0; k < 4; k++) createExplosion(e.x + Math.cos(sa)*sr + (Math.random()-0.5)*20, e.y + Math.sin(sa)*sr + (Math.random()-0.5)*20, '#4a148c');
                        }
                        showNotif('💀 Rise from the grave!');
                    }
                    // Death ray: spread burst of bone projectiles toward player
                    if (!e.deathRayTimer) e.deathRayTimer = necroPhase2 ? 90 : 160;
                    e.deathRayTimer--;
                    if (e.deathRayTimer <= 0) {
                        e.deathRayTimer = necroPhase2 ? 75 : 140;
                        const toP = Math.atan2(edy, edx);
                        const burst = necroPhase2 ? 5 : 3;
                        for (let k = 0; k < burst; k++) {
                            const fa = toP + (k - Math.floor(burst/2)) * 0.18;
                            state.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(fa)*6.5, vy: Math.sin(fa)*6.5, damage: 18, life: 160, type: 'deathRay' });
                        }
                    }
                }
            }

            // Shielded: paused host in MP (in shop etc.) is immune
            const _hostShielded = typeof MP !== 'undefined' && MP.hostShielded;
            if (hostDist < pContactDist && !(p.rabbitInvTimer > 0) && !_hostShielded) {
                let dmg = (e.isBoss ? 1.5 : 0.5) * state.diffMult.enemyDmgMult * nightMult() * (state._dailyFrenzy ? 1.3 : 1) * (state._dailyEternalNight ? 1.2 : 1);
                if (hasUpgrade('fortress')) dmg *= (0.6 - upgradeLevel('fortress') * 0.1);
                // Turtle shell absorption (Iron Shell, branch 1)
                if (p.pet === 'turtle' && petBranchIs(1, 0, 0) && p.petEvolveLevel >= 1) {
                    const dt3 = Math.max(0, p.petEvolveLevel - 3);
                    const absorb = Math.min(0.45, 0.08 + dt3 * 0.055);
                    dmg *= (1 - absorb);
                    addPetAction(1); // turtle: track absorbed hits
                }
                // Turtle spike shell — return damage (Spike Shell, branch 2)
                if (p.pet === 'turtle' && petBranchIs(2, 0, 0) && p.petEvolveLevel >= 1) {
                    const dt3 = Math.max(0, p.petEvolveLevel - 3);
                    const retDmg = 8 + dt3 * 10;
                    e.hp -= retDmg;
                    if (dt3 >= 2) { const kd = dist||1; e.x += (e.x-p.x)/kd*8; e.y += (e.y-p.y)/kd*8; }
                    if (dt3 >= 5) { state.enemies.forEach(ne => { if (Math.hypot(ne.x-e.x,ne.y-e.y) < 50) { ne.hp -= 20; createExplosion(ne.x, ne.y, '#80c060'); } }); }
                }
                // Hamster cheek bomb: absorb hits (Cheek Bomb, branch 3)
                if (p.pet === 'hamster' && petBranchIs(3, 0, 0) && p.petEvolveLevel >= 1) {
                    if (!p.hamsterCheeks) p.hamsterCheeks = 0;
                    p.hamsterCheeks = Math.min(p.hamsterCheeks + 1, 3);
                    if (p.hamsterCheeks >= 3) {
                        const dt3 = Math.max(0, p.petEvolveLevel - 3);
                        const bDmg = dmg * 2.5 * (dt3 >= 3 ? 1.5 : 1);
                        const bR = 60 + dt3 * 15;
                        state.enemies.forEach(ne => { if (Math.hypot(ne.x-p.x,ne.y-p.y) < bR) { ne.hp -= bDmg; createExplosion(ne.x, ne.y, '#e0a860'); } });
                        // No more instant-kill; high tiers scale damage instead
                        p.hamsterCheeks = 0; showNotif('🐹 Cheek Bomb!');
                        for (let bk = 0; bk < 10; bk++) createExplosion(p.x+(Math.random()-0.5)*40, p.y+(Math.random()-0.5)*40, '#e0a860');
                    }
                }
                // Armor damage reduction (stacks, capped at 50%)
                dmg *= (1 - Math.min(0.50, getArmorBonus('armorDR')));
                // Grit: reduce damage when below 35% HP
                if (p.skills?.grit && p.hp / p.maxHp < 0.35) dmg *= 0.85;
                // Cat dodge (all attacks)
                let catDodgeAmt = p.pet === 'cat' ? 0.20 : 0;
                if (p.pet === 'cat' && petBranchIs(1, 0, 0)) {
                    const dt3c = Math.max(0, p.petEvolveLevel - 3);
                    catDodgeAmt += Math.min(0.55, dt3c * 0.08);
                }
                // Dodge: skill + armor + cat bonus + blob split gene
                const splitDodge = (p.charBlob && p.blobGenes && p.blobGenes.includes('split')) ? 0.25 : 0;
                const babyDodge = p.charBaby ? 0.7 : 0;
                const totalDodge = (p.skills?.dodge ? 0.08 : 0) + getArmorBonus('dodgeBonus') + catDodgeAmt + splitDodge + babyDodge;
                if (totalDodge > 0 && Math.random() < totalDodge) {
                    if (catDodgeAmt > 0 && p.pet === 'cat') {
                        addPetAction(1);
                        for (let k = 0; k < 5; k++) state.particles.push({ x: p.x+(Math.random()-0.5)*16, y: p.y+(Math.random()-0.5)*16, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 20, color: '#a0a0ff' });
                        if (petBranchIs(2, 0, 0) && p.petEvolveLevel >= 1) {
                            const dt3c2 = Math.max(0, p.petEvolveLevel - 3);
                            const decoyCnt = dt3c2 >= 4 ? 2 : 1;
                            for (let dc = 0; dc < decoyCnt; dc++) {
                                const dx2 = p.x + (Math.random()-0.5)*40, dy2 = p.y + (Math.random()-0.5)*40;
                                createExplosion(dx2, dy2, '#a0a0ff');
                            }
                        }
                        if (petBranchIs(3, 0, 0) && p.petEvolveLevel >= 1) {
                            const dt3c3 = Math.max(0, p.petEvolveLevel - 3);
                            const goldAmt = 5 + dt3c3 * 10;
                            state.goldPickups.push({ x: p.x, y: p.y, amount: goldAmt, life: 180 });
                        }
                    } else {
                        createExplosion(p.x, p.y, '#80a0ff');
                    }
                } else {
                    // Drain armor when player is hit
                    drainArmorDurability(1);
                    p.hp -= dmg;
                    // Quest: mark player was hit this frame (noHit quest tracking)
                    state._questHitThisFrame = true;
                    // Blob gene unlock tracking
                    if (p.charBlob) p.blobDmgTaken = (p.blobDmgTaken || 0) + dmg;
                    // Armor spikes: return damage to attacker
                    const spikeDmg = getArmorBonus('armorSpikes');
                    if (spikeDmg > 0) { e.hp -= spikeDmg; createExplosion(e.x, e.y, '#ef9a9a'); }
                    // Vampire leeches HP on contact
                    if (e.type === 'vampire') e.hp = Math.min(e.maxHp, e.hp + dmg * 2);
                    // Jellyfish stings apply a slow
                    if (e.type === 'jellyfish') { p.jellyfishSlow = 150; showNotif('Stung! Slowed!'); }
                    if (hasUpgrade('thorns')) e.hp -= (10 + upgradeLevel('thorns') * 10);
                    if (hasUpgrade('charismac') && !e.isBoss && Math.random() < 0.02 + upgradeLevel('charismac') * 0.01) {
                        e.charmed = true; e.charmTimer = 1800; createExplosion(e.x, e.y, '#e040fb');
                    }
                    if (p.hp <= 0) {
                        if (p.charKoolKat && (p.koolKatLives || 0) > 0) {
                            p.koolKatLives--;
                            p.hp = 1;
                            showNotif('😎 Life lost! ' + p.koolKatLives + ' lives remaining. Deal with it.');
                            createExplosion(p.x, p.y, '#000');
                            for (let kk = 0; kk < 8; kk++) state.particles.push({ x: p.x + (Math.random()-0.5)*24, y: p.y + (Math.random()-0.5)*24, vx: (Math.random()-0.5)*5, vy: -3-Math.random()*2, life: 30, color: '#111' });
                        } else if (hasUpgrade('phoenix') && !p.phoenixUsed) {
                            p.hp = p.maxHp * (0.5 + upgradeLevel('phoenix') * 0.15); p.phoenixUsed = true;
                            showNotif('Phoenix revive!'); createExplosion(p.x, p.y, '#ff8800');
                        } else if (p.skills?.second_chance && !p.secondChanceUsed) {
                            p.hp = 30; p.secondChanceUsed = true;
                            showNotif('Last Stand! Revived with 30 HP!'); createExplosion(p.x, p.y, '#ffffaa');
                        } else endGame();
                    }
                }
            }
        }

        // Elite mod processing
        if (e.mod) {
            // Shield absorption: undo HP damage from this frame, apply to shield instead
            if (e.mod === 'shielded' && e.shield > 0 && (e._hpLastFrame||0) > e.hp) {
                const absorbed = Math.min((e._hpLastFrame||0) - e.hp, e.shield);
                e.shield -= absorbed; e.hp += absorbed;
            }
            e._hpLastFrame = e.hp;
            // Enraged: speed burst when below 50% HP
            if (e.mod === 'enraged' && !e.isEnraged && e.hp < e.maxHp * 0.5) {
                e.isEnraged = true; e.speed *= 1.5; createExplosion(e.x, e.y, '#ff4400');
            }
            // Vampiric: heal nearby allies periodically
            if (e.mod === 'vampiric' && state.frame % 60 === 0) {
                state.enemies.forEach(e2 => { if (e2 !== e && Math.hypot(e2.x-e.x,e2.y-e.y) < 150) e2.hp = Math.min(e2.maxHp, e2.hp + 2); });
            }
        }

        if (e.hp <= 0) {
            // Mod: splitting — spawn 2 smaller copies on death
            if (e.mod === 'splitting' && !e.isSplit) {
                for (let s = 0; s < 2; s++) {
                    const sa = Math.random() * Math.PI * 2;
                    state.enemies.push({ ...e,
                        x: e.x + Math.cos(sa)*20, y: e.y + Math.sin(sa)*20,
                        hp: Math.floor(e.maxHp * 0.3), maxHp: Math.floor(e.maxHp * 0.3),
                        _hpLastFrame: Math.floor(e.maxHp * 0.3),
                        mod: null, isSplit: true, sizeScale: (e.sizeScale||1) * 0.6,
                        shield: 0, maxShield: 0, isEnraged: false
                    });
                }
            }
            // Slimes split into 2 mini-slimes
            if (e.type === 'slime' && !e.isMini) {
                for (let s = 0; s < 2; s++) {
                    const sAng = Math.random() * Math.PI * 2;
                    state.enemies.push({
                        x: e.x + Math.cos(sAng) * 15, y: e.y + Math.sin(sAng) * 15,
                        w: 8, h: 8, type: 'slime', hp: 30, maxHp: 30,
                        speed: e.speed * 1.3, color: '#66bb6a',
                        gold: 3, score: 50, sizeScale: 0.6, animTimer: 0,
                        elite: false, isBoss: false, isMini: true, knockbackResist: 0, hurtTimer: 0
                    });
                }
            }
            state.enemies.splice(i, 1);
            p.streak++; p.streakTimer = 180; p.streakMult = Math.min(50, 1 + Math.floor(p.streak / 3) * 0.5);
            // Streak milestone notifications
            if (p.streak === 10) showNotif('🔥 10x STREAK! +20% bonus damage!');
            if (p.streak === 20) showNotif('⚡ 20x STREAK! +50% bonus damage!');
            if (p.streak === 40) showNotif('💀 40x STREAK! INSTANT KILL MODE!');
            if (p.streak > 40 && p.streak % 10 === 0) showNotif('☄️ ' + p.streak + 'x STREAK! UNSTOPPABLE!');
            // Streak visual burst at milestones
            if (p.streak === 10 || p.streak === 20 || p.streak === 40) {
                const bColor = p.streak >= 40 ? '#ff0044' : p.streak >= 20 ? '#ffaa00' : '#ff6600';
                for (let sb = 0; sb < 20; sb++) createExplosion(p.x + (Math.random()-0.5)*40, p.y + (Math.random()-0.5)*40, bColor);
                // Screen flash
                state.screenShakeDur = p.streak >= 40 ? 18 : p.streak >= 20 ? 12 : 8;
                state.screenShakeMag = p.streak >= 40 ? 10 : p.streak >= 20 ? 7 : 4;
                state.streakFlashTimer = p.streak >= 40 ? 20 : 12;
                state.streakFlashColor = bColor;
            }
            p.score += Math.round(e.score * p.streakMult); p.kills++;
            if (e.isWaveEnemy) state.waveEnemiesKilled++;
            if (p.charKillHeal) p.hp = Math.min(p.maxHp, p.hp + p.charKillHeal);
            // Gamer: build combo on kill
            if (p.charGamer) {
                p.gamerCombo = (p.gamerCombo || 0) + 1;
                p.gamerComboTimer = 240; // 4s to keep combo going
                if (p.gamerCombo % 5 === 0) showNotif('COMBO x' + p.gamerCombo + '! +' + Math.round(Math.min(p.gamerCombo, 20) * 4) + '% DMG');
            }
            // Quest kill tracking
            if (state.currentQuest && !state.currentQuest.failed) {
                const q = state.currentQuest;
                if (q.type === 'waveKills') q.progress = (q.progress || 0) + 1;
                if (q.type === 'noHit') { q._noHitKills = (q._noHitKills || 0) + 1; }
                if (q.type === 'noDash') { q._noDashKills = (q._noDashKills || 0) + 1; }
                if (q.type === 'bossKill' && e.isBoss) q.progress = (q.progress || 0) + 1;
            }
            // Blob gene: kill tracking + absorb
            if (p.charBlob) {
                p.blobKillCount = (p.blobKillCount || 0) + 1;
                if (p.blobGenes && p.blobGenes.includes('absorb')) {
                    p.maxHp += 3; p.hp += 3;
                }
            }
            // Paleontologist: spawn fossil dino minion on kill (max 3)
            if (p.charPaleo && p.fossilMinions && p.fossilMinions.length < 3 && Math.random() < 0.35) {
                p.fossilMinions.push({ x: e.x, y: e.y, life: 1200, attackCooldown: 0 }); // 20s
                createExplosion(e.x, e.y, '#e0d5b5');
                showNotif('Fossil dino summoned! (' + p.fossilMinions.length + '/3)');
            }
            // Youtuber: subscriber count updated from kills (done in main update loop)
            // Pirate: bonus gold loot roll on each kill
            if (p.charBonusGoldRoll && Math.random() < 0.4) {
                const lootAmt = 25 + Math.floor(Math.random() * 76);
                state.goldPickups.push({ x: e.x + (Math.random()-0.5)*20, y: e.y + (Math.random()-0.5)*20, amount: lootAmt, life: 180 });
                p.totalGoldEarned = (p.totalGoldEarned || 0) + lootAmt;
            }
            // Achievement tracking
            state.pacifistTimer = 0;
            persist.lifetimeKills = (persist.lifetimeKills || 0) + 1;
            // Speed Demon: 20 melee kills in 1 second
            if (e.hitByMelee >= state.frame - 2) {
                state.speedKillWindow.push(state.frame);
                state.speedKillWindow = state.speedKillWindow.filter(f => state.frame - f <= 60);
                if (state.speedKillWindow.length >= 20 && !persist.achievements.speedDemon) grantAchievement('speedDemon');
            }
            // Ninja unlock: kill 50 enemies while dashing
            if (p.dashing && !persist.achievements.dashKills) {
                p.dashKillsThisRun = (p.dashKillsThisRun || 0) + 1;
                if (p.dashKillsThisRun >= 50) grantAchievement('dashKills');
            }
            // Witch unlock: kill the red wizard as the Wizard
            if (e.isRedWizard && p.character === 'wizard' && !persist.achievements.witchUnlock) {
                grantAchievement('witchUnlock');
            }
            // Clown ball: mimic drops a ball if pet is maxed (25%, different pet types needed)
            if (e.type === 'mimic' && !e.isBoss) {
                const petKey = p.pet;
                const balls = persist.clownBalls || [];
                if (petKey && p.petEvolveLevel >= 10 && !balls.includes(petKey) && Math.random() < 0.25) {
                    persist.clownBalls = [...balls, petKey];
                    savePersist(persist);
                    showNotif('Clown Ball found! (' + persist.clownBalls.length + '/3)');
                    if (persist.clownBalls.length >= 3 && !persist.achievements.clownUnlock) grantAchievement('clownUnlock');
                }
            }
            // XP gain
            const xpGain = e.isBoss ? 15 : e.mod ? 5 : e.elite ? 3 : 1;
            p.xp += xpGain;
            while (p.xp >= p.xpToNext) {
                p.xp -= p.xpToNext; p.xpLevel++;
                p.xpToNext = Math.floor(10 + p.xpLevel * 8);
                p.skillPoints++; updateSkillBtn();
                showNotif('Level ' + p.xpLevel + '! Skill point earned! Open Skills');
            }
            // Fury stacks (skill)
            if (p.skills?.fury) p.furyKills = (p.furyKills || 0) + 1;
            let goldAmt = e.gold * (hasUpgrade('goldRush') ? 2 + upgradeLevel('goldRush') : 1) * p.streakMult * state.diffMult.goldMult * (p._eventGoldMult || 1);
            state.goldPickups.push({ x: e.x, y: e.y, amount: Math.round(goldAmt), life: 180 });
            // Old Man: drop time tokens
            if (p.charOldMan && !p.superOldMan && (e.isBoss || Math.random() < 0.20)) {
                state.timeTokenPickups.push({ x: e.x + (Math.random()-0.5)*16, y: e.y + (Math.random()-0.5)*16, life: 360 });
            }
            createExplosion(e.x, e.y, e.color);
            if (hasUpgrade('vampiric')) p.hp = Math.min(p.maxHp, p.hp + 5 + upgradeLevel('vampiric') * 3);
            if (Math.random() < 0.07) state.heartPickups.push({ x: e.x, y: e.y, life: 600 });
            // Fusion ingredient drops (per-enemy chance)
            const ingKey = ENEMY_INGREDIENT_DROP[e.type];
            const ingChance = ENEMY_INGREDIENT_CHANCE[e.type] || 0;
            if (ingKey && Math.random() < ingChance) {
                p.fusionIngredients[ingKey] = (p.fusionIngredients[ingKey] || 0) + 1;
                showNotif('Found ' + FUSION_INGREDIENTS[ingKey].name + '!');
            }
            if (e.isBoss) {
                state.bossActive = false; p.bossesKilled++;
                // Gamer: earn a cheat code every 2 boss kills
                if (p.charGamer && p.bossesKilled % 2 === 0) {
                    const used = new Set([...(p.gamerCodes || []), p.gamerActiveCode].filter(Boolean));
                    const pool = GAMER_CODES.filter(c => !used.has(c.id));
                    const pick = (pool.length > 0 ? pool : GAMER_CODES)[Math.floor(Math.random() * (pool.length || GAMER_CODES.length))];
                    p.gamerCodes = [...(p.gamerCodes || []), pick.id];
                    showNotif('Cheat code earned: ' + pick.name + '! (Press V to activate)');
                }
                state.postBossCooldown = 420; // 7s grace — no wave advance or shadow demon
                // 10% chance to spawn a challenge zone after boss kill
                if (!state.challengeZone && !e.isGrimReaper && Math.random() < 0.10) {
                    const angle = Math.random() * Math.PI * 2, dist = 300 + Math.random() * 200;
                    state.challengeZone = {
                        x: Math.max(200, Math.min(WORLD_W - 200, p.x + Math.cos(angle) * dist)),
                        y: Math.max(200, Math.min(WORLD_H - 200, p.y + Math.sin(angle) * dist)),
                        r: 110, maxWaves: 3, wave: 0, active: false, complete: false, enemiesLeft: 0, _spawning: false
                    };
                    showNotif('A CHALLENGE ZONE appeared nearby!');
                }
                // Scientist unlock: kill any boss with an explosion
                if ((e.hitByExplosion || 0) >= state.frame - 5 && !persist.achievements.bossExplosion) grantAchievement('bossExplosion');
                if (e.isGrimReaper) {
                    // World final boss defeated — special handling
                    state.grimReaperDefeated = true;
                    if (!persist.achievements.deathDefied) grantAchievement('deathDefied');
                    // World-specific pet unlocks
                    if (e.type === 'trexBoss' && p.charPaleo && !persist.achievements.extinctionEvent) grantAchievement('extinctionEvent');
                    if (e.type === 'megalodon' && (p.charSailor || p.charPirate) && !persist.achievements.whaleOfATime) grantAchievement('whaleOfATime');
                    if (e.type === 'alienQueen' && (p.charAlien || p.charAstronaut) && !persist.achievements.firstContact) grantAchievement('firstContact');
                    if (e.type === 'grimReaper' && !persist.achievements.beyondDeath) grantAchievement('beyondDeath');
                    // Steve unlock: beat on Hard
                    if (state.difficulty === 'hard' && !persist.achievements.hardestWin) grantAchievement('hardestWin');
                    // Extreme mode unlock: beat Hard in under 30 minutes (twice)
                    if (state.difficulty === 'hard' && state.runStartTime > 0) {
                        const runMin = (Date.now() - state.runStartTime) / 60000;
                        if (runMin < 30) {
                            persist.hardFastWins = (persist.hardFastWins || 0) + 1;
                            savePersist(persist);
                            if (persist.hardFastWins >= 2) {
                                persist.extremeUnlocked = true;
                                savePersist(persist);
                                showNotif('☠ EXTREME MODE UNLOCKED!');
                                const eb = document.getElementById('diff-extreme');
                                if (eb) eb.style.display = '';
                            } else {
                                showNotif('Hard <30min: ' + persist.hardFastWins + '/2 — EXTREME mode progress!');
                            }
                        }
                    }
                    // Old Man unlock: beat as Knight on Easy (4 times total)
                    if (state.difficulty === 'easy' && p.character === 'knight') {
                        persist.knightEasyWins = (persist.knightEasyWins || 0) + 1;
                        savePersist(persist);
                        if (persist.knightEasyWins >= 4 && !persist.achievements.knightEasyX4) grantAchievement('knightEasyX4');
                    }
                    // Robot unlock: beat as Scientist
                    if (p.character === 'scientist' && !persist.achievements.robotUnlock) grantAchievement('robotUnlock');
                    state.paused = true;
                    showPostReaperOverlay(e.type);
                } else {
                    if (state.dinoWorld) {
                        if (p.unlockedDinoTypes < DINO_ENEMY_TYPES.length) {
                            p.unlockedDinoTypes++;
                            showNotif('New dino threat: ' + DINO_ENEMY_TYPES[p.unlockedDinoTypes - 1].type.toUpperCase() + '!');
                        }
                    } else if (state.sailorWorld) {
                        if (p.unlockedSailorTypes < SAILOR_ENEMY_TYPES.length) {
                            p.unlockedSailorTypes++;
                            showNotif('New sea creature: ' + SAILOR_ENEMY_TYPES[p.unlockedSailorTypes - 1].type.toUpperCase() + '!');
                        }
                    } else if (state.alienWorld) {
                        if (p.unlockedAlienTypes < ALIEN_ENEMY_TYPES.length) {
                            p.unlockedAlienTypes++;
                            showNotif('New alien form: ' + ALIEN_ENEMY_TYPES[p.unlockedAlienTypes - 1].type.toUpperCase() + '!');
                        }
                    } else {
                        if (p.unlockedEnemyTypes < ENEMY_TYPES.length) {
                            p.unlockedEnemyTypes++;
                            showNotif('New enemy unlocked: ' + ENEMY_TYPES[p.unlockedEnemyTypes - 1].type.toUpperCase() + '!');
                        }
                    }
                }
            }
            if (e.isBounty) {
                const bountyGold = 80 + p.wave * 10;
                p.gold += bountyGold;
                state.pendingUpgradeCount++; updateUpgradeButton();
                showNotif('💰 BOUNTY CLAIMED! +' + bountyGold + ' Gold + Free Upgrade!');
                for (let k = 0; k < 16; k++) createExplosion(e.x + (Math.random()-0.5)*30, e.y + (Math.random()-0.5)*30, '#ffd700');
                state.bountyTarget = null;
            }
            if (e.isShadowDemon) {
                state.shadowDemonActive = false;
                state.runShadowDemonsKilled++;
                showNotif('Shadow Demon vanquished! Treasures await!');
                for (let s = 0; s < 2; s++) {
                    const sa = Math.random() * Math.PI * 2;
                    state.treasureChests.push({ x: e.x + Math.cos(sa)*50, y: e.y + Math.sin(sa)*50, opened: false, openedTimer: 0 });
                }
            }
            checkMilestone(); checkEvolve();
        }
    }

    // Player Projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const pr = state.projectiles[i];

        // Boomerang direction handling
        if (pr.type === 'boomerang') {
            pr.distTraveled += Math.hypot(pr.vx, pr.vy);
            if (!pr.returning && pr.distTraveled >= pr.maxDist) {
                pr.returning = true;
            }
            if (pr.returning) {
                const brdx = p.x - pr.x, brdy = p.y - pr.y, brd = Math.hypot(brdx, brdy) || 1;
                if (brd < 20) { pr.life = 0; }
                else { pr.vx = (brdx / brd) * 7; pr.vy = (brdy / brd) * 7; }
            }
        }

        if (pr.homing && state.enemies.length > 0) {
            let closest = null, minD = Infinity;
            state.enemies.forEach(e => {
                if (p.charReaper && e.type === 'skeleton') return;
                const d = Math.hypot(e.x - pr.x, e.y - pr.y); if (d < minD) { minD = d; closest = e; }
            });
            if (!closest) closest = state.enemies[0];
            const a = Math.atan2(closest.y - pr.y, closest.x - pr.x);
            pr.vx += Math.cos(a) * 0.5; pr.vy += Math.sin(a) * 0.5;
            const s = Math.hypot(pr.vx, pr.vy); pr.vx = (pr.vx / s) * 5; pr.vy = (pr.vy / s) * 5;
        }
        pr.x += pr.vx; pr.y += pr.vy; pr.life--;

        // Bomb: explode on arrival
        if (pr.type === 'bomb') {
            if (pr.life <= 0) {
                hitEnemies(pr.x, pr.y, ALL_WEAPONS.bomb.range, pr.damage, false, true);
                createExplosion(pr.x, pr.y, '#ff8800');
                for (let k = 0; k < 4; k++) createExplosion(pr.x + (Math.random() - 0.5) * 40, pr.y + (Math.random() - 0.5) * 40, '#ffaa00');
                state.projectiles.splice(i, 1);
            }
            continue;
        }
        // Bucket throw: AoE water puddle on arrival that slows enemies
        if (pr.type === 'bucket') {
            if (pr.life <= 0) {
                state.slipperyPatches = state.slipperyPatches || [];
                state.slipperyPatches.push({ x: pr.x, y: pr.y, life: 240, radius: 45 });
                createExplosion(pr.x, pr.y, '#29b6f6');
                for (let k = 0; k < 5; k++) state.particles.push({ x: pr.x+(Math.random()-0.5)*30, y: pr.y+(Math.random()-0.5)*30, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3-1, life: 25, color: '#b3e5fc' });
                state.projectiles.splice(i, 1);
            }
            continue;
        }
        // Cube Bomb: colorful AoE explosion on arrival or enemy hit
        if (pr.type === 'cubeBomb') {
            const cubeColors = ['#ff1744','#2979ff','#00e676','#ffd600','#e040fb'];
            let hitEnemy = false;
            for (let j = state.enemies.length - 1; j >= 0; j--) {
                const ej = state.enemies[j];
                if (Math.hypot(ej.x - pr.x, ej.y - pr.y) < 16) { hitEnemy = true; break; }
            }
            if (pr.life <= 0 || hitEnemy) {
                // Big colorful explosion
                for (let k = 0; k < 6; k++) createExplosion(pr.x + (Math.random()-0.5)*60, pr.y + (Math.random()-0.5)*60, cubeColors[k % cubeColors.length]);
                state.enemies.forEach(e => {
                    if (Math.hypot(e.x - pr.x, e.y - pr.y) < 90) {
                        e.hp -= pr.cubeDamage || 65; e.hitFlash = 12;
                        if (!e.isBoss) { e.stunned = true; e.stunTimer = 60; }
                        state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(pr.cubeDamage || 65), life: 50, vy: -1.5, crit: false });
                    }
                });
                state.projectiles.splice(i, 1);
            }
            continue;
        }
        // Atomic Bomb: massive explosion on arrival
        if (pr.type === 'atomicBomb') {
            if (pr.life <= 0) {
                hitEnemies(pr.x, pr.y, 130, pr.damage, false, true);
                for (let k = 0; k < 10; k++) createExplosion(pr.x + (Math.random()-0.5)*100, pr.y + (Math.random()-0.5)*100, '#ff8800');
                createExplosion(pr.x, pr.y, '#ffff00');
                state.projectiles.splice(i, 1);
            }
            continue;
        }
        // Water bolt: bounce off world edges and enemies
        if (pr.type === 'waterBolt') {
            if (pr.x < 0 || pr.x > WORLD_W) { pr.vx *= -1; pr.bounces = (pr.bounces||0) - 1; }
            if (pr.y < 0 || pr.y > WORLD_H) { pr.vy *= -1; pr.bounces = (pr.bounces||0) - 1; }
            if ((pr.bounces||0) < 0) { state.projectiles.splice(i, 1); continue; }
        }
        // Thunderbow: on enemy hit, arc lightning to 2 nearby enemies
        if (pr.type === 'thunderbow') {
            for (let j = state.enemies.length - 1; j >= 0; j--) {
                if (p.charReaper && state.enemies[j].type === 'skeleton') continue;
                if (Math.hypot(state.enemies[j].x - pr.x, state.enemies[j].y - pr.y) < 18) {
                    const ej = state.enemies[j];
                    ej.hp -= pr.damage; ej.hitFlash = 6; createExplosion(pr.x, pr.y, '#ffee58');
                    state.damageNumbers.push({ x: ej.x, y: ej.y - 10, value: Math.round(pr.damage), life: 50, vy: -1.5, crit: false });
                    // Arc to 2 more
                    let src = ej, hits = 0;
                    const chainSet = new Set([ej]);
                    while (hits < 2) {
                        let next = null, nd = Infinity;
                        state.enemies.forEach(e2 => { if (chainSet.has(e2) || (p.charReaper && e2.type === 'skeleton')) return; const d2 = Math.hypot(e2.x-src.x,e2.y-src.y); if (d2 < 120 && d2 < nd) { nd = d2; next = e2; } });
                        if (!next) break;
                        next.hp -= pr.damage * 0.5; chainSet.add(next); src = next; hits++;
                        state.lightningEffects.push({ x: next.x, y: next.y, life: 12 }); createExplosion(next.x, next.y, '#ffee58');
                    }
                    pr.life = 0; break;
                }
            }
            if (pr.life <= 0) { state.projectiles.splice(i, 1); continue; }
        }

        for (let j = state.enemies.length - 1; j >= 0; j--) {
            if (p.charReaper && state.enemies[j].type === 'skeleton') continue; // ally skeletons immune to player projectiles
            if (state.enemies[j].isTamed) continue; // tamed allies immune to player projectiles
            if (Math.hypot(state.enemies[j].x - pr.x, state.enemies[j].y - pr.y) < 18) {
                const ej = state.enemies[j];
                // Piercing projectiles respect hurtTimer
                if (pr.piercing && ej.hurtTimer > 0) continue;
                ej.hp -= pr.damage; ej.hitFlash = 6; createExplosion(pr.x, pr.y, '#ff3e3e');
                state.damageNumbers.push({ x: ej.x + (Math.random() - 0.5) * 16, y: ej.y - 10, value: Math.round(pr.damage), life: 50, vy: -1.5, crit: false });
                if (!ej.isBoss) {
                    const pdx = ej.x - pr.x, pdy = ej.y - pr.y, pd = Math.hypot(pdx, pdy) || 1;
                    ej.x += (pdx / pd) * 6 * (1 - (ej.knockbackResist || 0));
                    ej.y += (pdy / pd) * 6 * (1 - (ej.knockbackResist || 0));
                }
                // Harpoon: pin enemy for 2s
                if (pr.type === 'harpoon' && !ej.isBoss) { ej.pinnedTimer = 120; createExplosion(ej.x, ej.y, '#4fc3f7'); }
                // Hook (fishing rod): pull enemy toward player
                if (pr.type === 'hook') {
                    pr.life = 0; // remove hook on hit
                    const pullDur = 30;
                    ej.pullingToPlayer = pullDur; ej.pullSource = state.player;
                    createExplosion(ej.x, ej.y, '#29b6f6');
                }
                // Stun pulse: stun enemy for 1s
                if (pr.type === 'stunPulse' && !ej.isBoss) { ej.stunned = true; ej.stunTimer = 60; createExplosion(ej.x, ej.y, '#18ffff'); }
                // Flask: AoE acid explosion on impact
                if (pr.type === 'flask') {
                    state.enemies.forEach(e2 => { if (Math.hypot(e2.x - pr.x, e2.y - pr.y) < 60) { e2.hp -= pr.damage * 0.5; e2.hitFlash = 6; e2.poisoned = true; e2.poisonTimer = 240; e2.poisonDmg = 6; } });
                    for (let k = 0; k < 8; k++) createExplosion(pr.x + (Math.random()-0.5)*60, pr.y + (Math.random()-0.5)*60, '#cddc39');
                }
                if (pr.piercing) { ej.hurtTimer = 12; }
                else { pr.life = 0; break; }
            }
        }
        if (pr.life <= 0) state.projectiles.splice(i, 1);
    }

    // Wolf slow effect tick
    state.enemies.forEach(e => { if (e.wolfSlowed > 0) e.wolfSlowed--; });
}
