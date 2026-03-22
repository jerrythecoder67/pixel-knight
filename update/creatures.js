// ─── CREATURES: CROCS, CRABS, SALAMANDERS, FISH, SHARKS, EXPLORERS, BUTLER, SKELETON WARRIORS ───
function updateCreatures() {
    const p = state.player;

    // ─── CROCODILE UPDATE ───
    function crocTerrainOk(tx, ty) {
        const t = getTerrainAt(tx, ty);
        return t === 'water' || t === 'stone';
    }
    for (let ci = state.crocodiles.length - 1; ci >= 0; ci--) {
        const c = state.crocodiles[ci];
        c.animTimer++; if (c.hurtTimer > 0) c.hurtTimer--;
        if (c.attackCooldown > 0) c.attackCooldown--;

        if (c.hp <= 0) {
            if (!c.killedBySala) {
                p.kills++; p.score += c.score;
            }
            // Dino unlock: track croc kills as Fat character (only player kills)
            if (!c.killedBySala && p.character === 'fat') {
                persist.fatCrocKills = (persist.fatCrocKills || 0) + 1;
                savePersist(persist);
            }
            // Pirate unlock: track croc kills this run
            if (!c.killedBySala) {
                persist.pirateRun = persist.pirateRun || { bones: 0, crocKills: 0, sharkKills: 0 };
                persist.pirateRun.crocKills++;
            }
            if (!c.killedBySala) {
                state.goldPickups.push({ x: c.x, y: c.y, amount: c.gold, life: 180 });
                if (Math.random() < 0.02) {
                    p.fusionIngredients['water_gem'] = (p.fusionIngredients['water_gem'] || 0) + 1;
                    showNotif('Found Water Gem!');
                }
            }
            createExplosion(c.x, c.y, '#2e7d32');
            for (let k = 0; k < 6; k++) state.particles.push({ x: c.x, y: c.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4 - 1, life: 40, color: '#388e3c' });
            state.crocodiles.splice(ci, 1);
            checkMilestone(); checkEvolve();
            continue;
        }

        const onWater = isOnWater(c.x, c.y);
        const cSpd = onWater ? c.waterSpeed : c.stoneSpeed;
        const cdx = p.x - c.x, cdy = p.y - c.y, cDist = Math.hypot(cdx, cdy);
        const chaseRange = onWater ? 260 : 180;

        // Check if this croc should target a nearby salamander instead of the player
        let chasingSala = false;
        if (c.nearFoePool && state.salamanders.length > 0) {
            for (const s of state.salamanders) {
                if (Math.hypot(s.x - c.x, s.y - c.y) < 240) { chasingSala = true; break; }
            }
        }

        // If croc is on illegal terrain (not water or stone), force return to lake immediately
        if (!crocTerrainOk(c.x, c.y)) {
            const hd = Math.hypot(c.homeX - c.x, c.homeY - c.y) || 1;
            c.x += ((c.homeX - c.x) / hd) * c.waterSpeed * 2;
            c.y += ((c.homeY - c.y) / hd) * c.waterSpeed * 2;
        } else if (!chasingSala && !state.underwater && cDist < chaseRange && crocTerrainOk(p.x, p.y)) {
            // Chase player — player must be on water or stone, and croc only moves to water/stone
            if (cDist > 5) {
                const mx = (cdx / cDist) * cSpd, my = (cdy / cDist) * cSpd;
                if (crocTerrainOk(c.x + mx, c.y + my)) { c.x += mx; c.y += my; }
                else if (crocTerrainOk(c.x + mx, c.y))  { c.x += mx; }
                else if (crocTerrainOk(c.x, c.y + my))  { c.y += my; }
            }
            c.facingX = cdx > 0 ? 1 : -1;
        } else {
            // Patrol/wander, only on water/stone
            if (c.wanderTimer <= 0) {
                c.wanderAngle = Math.random() * Math.PI * 2;
                c.wanderTimer = 120 + Math.floor(Math.random() * 180);
            }
            c.wanderTimer--;
            const mx = Math.cos(c.wanderAngle) * cSpd * 0.4, my = Math.sin(c.wanderAngle) * cSpd * 0.4;
            if (crocTerrainOk(c.x + mx, c.y + my)) { c.x += mx; c.y += my; }
            else { c.wanderTimer = 0; } // pick new direction
        }

        // Clamp to world
        c.x = Math.max(0, Math.min(WORLD_W, c.x));
        c.y = Math.max(0, Math.min(WORLD_H, c.y));

        // Attack player — only when player is on water or stone, not underwater, and not focused on sala
        if (!chasingSala && !state.underwater && cDist < 22 && c.attackCooldown <= 0 && crocTerrainOk(p.x, p.y)) {
            let dmg = c.damage * state.diffMult.enemyDmgMult;
            if (hasUpgrade('fortress')) dmg *= (0.6 - upgradeLevel('fortress') * 0.1);
            if (p.pet === 'turtle' && petBranchIs(1, 0, 0) && p.petEvolveLevel >= 1) {
                dmg *= (1 - Math.min(0.45, 0.08 + Math.max(0, p.petEvolveLevel - 3) * 0.055));
                addPetAction(1);
            }
            dmg *= (1 - Math.min(0.50, getArmorBonus('armorDR')));
            drainArmorDurability(1);
            p.hp -= dmg; c.attackCooldown = 80;
            if (p.hp <= 0) state.killedByCroc = true;
            // Dragon ritual step 2: croc attacks dinosaur while they're both in/near lava
            if (p.character === 'dinosaur' && state.dragonRitualInLava) state.dragonRitualCrocHit = true;
            const cSpikes = getArmorBonus('armorSpikes');
            if (cSpikes > 0) { c.hp -= cSpikes; createExplosion(c.x, c.y, '#ef9a9a'); }
            createExplosion(p.x, p.y, '#2e7d32');
            if (cDist > 0) { p.x -= (cdx / cDist) * 10; p.y -= (cdy / cDist) * 10; }
        }

        // Take damage from player projectiles
        for (let pi = state.projectiles.length - 1; pi >= 0; pi--) {
            const pr = state.projectiles[pi];
            if (Math.hypot(pr.x - c.x, pr.y - c.y) < 18) {
                c.hp -= pr.damage; c.hurtTimer = 12;
                state.damageNumbers.push({ x: c.x, y: c.y - 10, value: Math.round(pr.damage), life: 50, vy: -1.5, crit: false });
                createExplosion(pr.x, pr.y, '#88ee66');
                if (!pr.piercing) { pr.life = 0; }
            }
        }

        // Take melee damage
        if (p.attacking && Math.hypot(p.x - c.x, p.y - c.y) < 50 + (p.attackRangeBonus || 0)) {
            if (!c._meleeHurt || c._meleeHurt !== p.attackCount) {
                c._meleeHurt = p.attackCount;
                let dmg = (p.damageMult || 1) * 20;
                c.hp -= dmg; c.hurtTimer = 12;
                state.damageNumbers.push({ x: c.x, y: c.y - 10, value: Math.round(dmg), life: 50, vy: -1.5, crit: false });
                createExplosion(c.x, c.y, '#88ee66');
            }
        }

        // Fight salamanders if pools border
        if (c.nearFoePool && state.salamanders.length > 0) {
            let closestSala = null, closestDist = 240;
            for (const s of state.salamanders) {
                const sd = Math.hypot(s.x - c.x, s.y - c.y);
                if (sd < closestDist) { closestDist = sd; closestSala = s; }
            }
            if (closestSala && closestDist < 200) {
                const ddx = closestSala.x - c.x, ddy = closestSala.y - c.y;
                const dd = Math.hypot(ddx, ddy) || 1;
                const moveX = (ddx/dd)*cSpd, moveY = (ddy/dd)*cSpd;
                if (crocTerrainOk(c.x + moveX, c.y + moveY)) { c.x += moveX; c.y += moveY; }
                if (closestDist < 22 && c.attackCooldown <= 0) {
                    closestSala.hp -= 15; closestSala.hurtTimer = 12; c.attackCooldown = 80;
                    state.damageNumbers.push({ x: closestSala.x, y: closestSala.y - 10, value: 15, life: 40, vy: -1.2, crit: false });
                }
            }
        }
    }

    // ─── CRAB UPDATE (sailor world land predators) ───
    if (state.sailorWorld && state.crabs) {
        const crabTerrainOk = (tx, ty) => getTerrainAt(tx, ty) !== 'water';
        for (let ci = state.crabs.length - 1; ci >= 0; ci--) {
            const cr = state.crabs[ci];
            cr.animTimer++; if (cr.hurtTimer > 0) cr.hurtTimer--;
            if (cr.attackCooldown > 0) cr.attackCooldown--;

            if (cr.hp <= 0) {
                p.kills++; p.score += cr.score;
                state.goldPickups.push({ x: cr.x, y: cr.y, amount: cr.gold, life: 180 });
                createExplosion(cr.x, cr.y, '#e65100');
                for (let k = 0; k < 6; k++) state.particles.push({ x: cr.x, y: cr.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4-1, life: 40, color: '#ff6d00' });
                state.crabs.splice(ci, 1);
                checkMilestone(); checkEvolve();
                continue;
            }

            // Force return to home island if on water
            if (!crabTerrainOk(cr.x, cr.y)) {
                const hd = Math.hypot(cr.homeX - cr.x, cr.homeY - cr.y) || 1;
                cr.x += ((cr.homeX - cr.x) / hd) * cr.speed * 2;
                cr.y += ((cr.homeY - cr.y) / hd) * cr.speed * 2;
            } else {
                const cdx = p.x - cr.x, cdy = p.y - cr.y, cDist = Math.hypot(cdx, cdy);
                if (!state.underwater && cDist < 220 && crabTerrainOk(p.x, p.y)) {
                    if (cDist > 5) {
                        const mx = (cdx/cDist)*cr.speed, my = (cdy/cDist)*cr.speed;
                        if (crabTerrainOk(cr.x+mx, cr.y+my)) { cr.x += mx; cr.y += my; }
                        else if (crabTerrainOk(cr.x+mx, cr.y)) { cr.x += mx; }
                        else if (crabTerrainOk(cr.x, cr.y+my)) { cr.y += my; }
                        else { cr.wanderTimer = 0; }
                    }
                    cr.facingX = cdx > 0 ? 1 : -1;
                    if (cDist < 22 && cr.attackCooldown <= 0) {
                        let dmg = cr.damage * state.diffMult.enemyDmgMult * (1 - Math.min(0.50, getArmorBonus('armorDR')));
                        drainArmorDurability(1);
                        p.hp -= dmg; cr.attackCooldown = 75;
                        createExplosion(p.x, p.y, '#e65100');
                        if (p.hp <= 0) endGame();
                    }
                } else {
                    // Wander on land
                    if (cr.wanderTimer <= 0) {
                        cr.wanderAngle = Math.random() * Math.PI * 2;
                        cr.wanderTimer = 120 + Math.floor(Math.random() * 180);
                    }
                    cr.wanderTimer--;
                    const mx = Math.cos(cr.wanderAngle)*cr.speed*0.4, my = Math.sin(cr.wanderAngle)*cr.speed*0.4;
                    if (crabTerrainOk(cr.x+mx, cr.y+my)) { cr.x += mx; cr.y += my; }
                    else { cr.wanderTimer = 0; }
                }
            }
            cr.x = Math.max(0, Math.min(WORLD_W, cr.x));
            cr.y = Math.max(0, Math.min(WORLD_H, cr.y));

            // Projectile damage
            for (let pi = state.projectiles.length - 1; pi >= 0; pi--) {
                const pr = state.projectiles[pi];
                if (Math.hypot(pr.x - cr.x, pr.y - cr.y) < 16) {
                    cr.hp -= pr.damage; cr.hurtTimer = 12;
                    state.damageNumbers.push({ x: cr.x, y: cr.y - 10, value: Math.round(pr.damage), life: 50, vy: -1.5, crit: false });
                    createExplosion(pr.x, pr.y, '#ff6d00');
                    if (!pr.piercing) { pr.life = 0; }
                }
            }
            // Melee damage
            if (p.attacking && Math.hypot(p.x - cr.x, p.y - cr.y) < 50 + (p.attackRangeBonus || 0)) {
                if (!cr._meleeHurt || cr._meleeHurt !== p.attackCount) {
                    cr._meleeHurt = p.attackCount;
                    const dmg = (p.damageMult || 1) * 20;
                    cr.hp -= dmg; cr.hurtTimer = 12;
                    state.damageNumbers.push({ x: cr.x, y: cr.y - 10, value: Math.round(dmg), life: 50, vy: -1.5, crit: false });
                    createExplosion(cr.x, cr.y, '#ff6d00');
                }
            }
        }
    }

    // ─── SALAMANDER UPDATE ───
    function salaTerrainOk(tx, ty) {
        const t = getTerrainAt(tx, ty);
        return t === 'lava' || t === 'stone';
    }
    for (let si = state.salamanders.length - 1; si >= 0; si--) {
        const s = state.salamanders[si];
        s.animTimer++; if (s.hurtTimer > 0) s.hurtTimer--;
        if (s.attackCooldown > 0) s.attackCooldown--;

        if (s.hp <= 0) {
            p.kills++; p.score += s.score;
            state.goldPickups.push({ x: s.x, y: s.y, amount: s.gold, life: 180 });
            createExplosion(s.x, s.y, '#e64a19');
            for (let k = 0; k < 6; k++) state.particles.push({ x: s.x, y: s.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4 - 1, life: 40, color: '#ff7043' });
            state.salamanders.splice(si, 1);
            checkMilestone(); checkEvolve();
            continue;
        }

        const onLava = isOnLava(s.x, s.y);
        const sSpd = onLava ? s.lavaSpeed : s.stoneSpeed;
        const sdx = p.x - s.x, sdy = p.y - s.y, sDist = Math.hypot(sdx, sdy);
        const sChaseRange = onLava ? 260 : 180;

        // Check if should target nearby croc instead of player
        let crocTarget = null, crocTargetDist = Infinity;
        if (s.nearFoePool && state.crocodiles.length > 0) {
            for (const c of state.crocodiles) {
                const cd = Math.hypot(c.x - s.x, c.y - s.y);
                if (cd < 240 && cd < crocTargetDist) { crocTargetDist = cd; crocTarget = c; }
            }
        }

        // Force return to lava if on illegal terrain
        if (!salaTerrainOk(s.x, s.y)) {
            const hd = Math.hypot(s.homeX - s.x, s.homeY - s.y) || 1;
            s.x += ((s.homeX - s.x) / hd) * s.lavaSpeed * 2;
            s.y += ((s.homeY - s.y) / hd) * s.lavaSpeed * 2;
        } else if (crocTarget) {
            // Chase croc and fight it
            const cdx = crocTarget.x - s.x, cdy = crocTarget.y - s.y;
            const cd = Math.hypot(cdx, cdy) || 1;
            const mx = (cdx/cd)*sSpd, my = (cdy/cd)*sSpd;
            if (salaTerrainOk(s.x + mx, s.y + my)) { s.x += mx; s.y += my; }
            else if (salaTerrainOk(s.x + mx, s.y)) { s.x += mx; }
            else if (salaTerrainOk(s.x, s.y + my)) { s.y += my; }
            s.facingX = cdx > 0 ? 1 : -1;
            if (crocTargetDist < 22 && s.attackCooldown <= 0) {
                crocTarget.hp -= s.damage; crocTarget.hurtTimer = 12; s.attackCooldown = 80;
                if (crocTarget.hp <= 0) crocTarget.killedBySala = true;
                state.damageNumbers.push({ x: crocTarget.x, y: crocTarget.y - 10, value: Math.round(s.damage), life: 40, vy: -1.2, crit: false });
            }
        } else if (sDist < sChaseRange && salaTerrainOk(p.x, p.y)) {
            if (sDist > 5) {
                const mx = (sdx / sDist) * sSpd, my = (sdy / sDist) * sSpd;
                if (salaTerrainOk(s.x + mx, s.y + my)) { s.x += mx; s.y += my; }
                else if (salaTerrainOk(s.x + mx, s.y)) { s.x += mx; }
                else if (salaTerrainOk(s.x, s.y + my)) { s.y += my; }
            }
            s.facingX = sdx > 0 ? 1 : -1;
        } else {
            if (s.wanderTimer <= 0) {
                s.wanderAngle = Math.random() * Math.PI * 2;
                s.wanderTimer = 120 + Math.floor(Math.random() * 180);
            }
            s.wanderTimer--;
            const mx = Math.cos(s.wanderAngle) * sSpd * 0.4, my = Math.sin(s.wanderAngle) * sSpd * 0.4;
            if (salaTerrainOk(s.x + mx, s.y + my)) { s.x += mx; s.y += my; }
            else { s.wanderTimer = 0; }
        }

        s.x = Math.max(0, Math.min(WORLD_W, s.x));
        s.y = Math.max(0, Math.min(WORLD_H, s.y));

        // Attack player — only when player is on lava or stone, and not focused on croc
        if (!crocTarget && sDist < 22 && s.attackCooldown <= 0 && salaTerrainOk(p.x, p.y)) {
            let dmg = s.damage * state.diffMult.enemyDmgMult;
            if (hasUpgrade('fortress')) dmg *= (0.6 - upgradeLevel('fortress') * 0.1);
            dmg *= (1 - Math.min(0.50, getArmorBonus('armorDR')));
            drainArmorDurability(1);
            p.hp -= dmg; s.attackCooldown = 80;
            // Dragon ritual step 3: killed by salamander
            if (p.hp <= 0) state.killedBySalamander = true;
            const sSpikes = getArmorBonus('armorSpikes');
            if (sSpikes > 0) { s.hp -= sSpikes; createExplosion(s.x, s.y, '#ef9a9a'); }
            createExplosion(p.x, p.y, '#e64a19');
            // Fire particles on hit
            for (let k = 0; k < 4; k++) state.particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*3, vy: -Math.random()*2, life: 25, color: '#ff7043' });
            if (sDist > 0) { p.x -= (sdx / sDist) * 10; p.y -= (sdy / sDist) * 10; }
        }

        // Take damage from player projectiles
        for (let pi = state.projectiles.length - 1; pi >= 0; pi--) {
            const pr = state.projectiles[pi];
            if (Math.hypot(pr.x - s.x, pr.y - s.y) < 18) {
                s.hp -= pr.damage; s.hurtTimer = 12;
                state.damageNumbers.push({ x: s.x, y: s.y - 10, value: Math.round(pr.damage), life: 50, vy: -1.5, crit: false });
                createExplosion(pr.x, pr.y, '#ff7043');
                if (!pr.piercing) { pr.life = 0; }
            }
        }

        // Take melee damage
        if (p.attacking && Math.hypot(p.x - s.x, p.y - s.y) < 50 + (p.attackRangeBonus || 0)) {
            if (!s._meleeHurt || s._meleeHurt !== p.attackCount) {
                s._meleeHurt = p.attackCount;
                let dmg = (p.damageMult || 1) * 20;
                s.hp -= dmg; s.hurtTimer = 12;
                state.damageNumbers.push({ x: s.x, y: s.y - 10, value: Math.round(dmg), life: 50, vy: -1.5, crit: false });
                createExplosion(s.x, s.y, '#ff7043');
            }
        }

        // Fight crocodiles if pools border
        if (s.nearFoePool && state.crocodiles.length > 0) {
            let closestCroc = null, closestDist = 240;
            for (const c of state.crocodiles) {
                const cd = Math.hypot(c.x - s.x, c.y - s.y);
                if (cd < closestDist) { closestDist = cd; closestCroc = c; }
            }
            if (closestCroc && closestDist < 200) {
                const ddx = closestCroc.x - s.x, ddy = closestCroc.y - s.y;
                const dd = Math.hypot(ddx, ddy) || 1;
                const moveX = (ddx/dd)*sSpd, moveY = (ddy/dd)*sSpd;
                if (salaTerrainOk(s.x + moveX, s.y + moveY)) { s.x += moveX; s.y += moveY; }
                if (closestDist < 22 && s.attackCooldown <= 0) {
                    closestCroc.hp -= 15; closestCroc.hurtTimer = 12; s.attackCooldown = 80;
                    state.damageNumbers.push({ x: closestCroc.x, y: closestCroc.y - 10, value: 15, life: 40, vy: -1.2, crit: false });
                }
            }
        }
    }

    // ─── FISH UPDATE (underwater only) ───
    if (state.underwater && state.fish) {
        for (const f of state.fish) {
            if (f.hurtTimer > 0) f.hurtTimer--;
            f.wanderTimer--;
            if (f.wanderTimer <= 0) {
                f.vx = (Math.random()-0.5)*1.2; f.vy = (Math.random()-0.5)*1.2;
                f.wanderTimer = 60 + Math.floor(Math.random()*120);
            }
            const nx = f.x + f.vx, ny = f.y + f.vy;
            const fxOk = canStayUnderwater(nx, f.y), fyOk = canStayUnderwater(f.x, ny);
            if (fxOk) f.x = nx; else f.vx *= -1;
            if (fyOk) f.y = ny; else f.vy *= -1;
            if (!fxOk && !fyOk) {
                const a = Math.random() * Math.PI * 2;
                const sp = 0.5 + Math.random() * 0.7;
                f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp;
                f.wanderTimer = 0;
            }
        }
    }

    // ─── SHARK UPDATE (underwater only) ───
    if (state.underwater && state.sharks) {
        for (let si = state.sharks.length - 1; si >= 0; si--) {
            const sh = state.sharks[si];
            if (sh.hp <= 0) {
                // Drop a heal pickup
                state.heartPickups = state.heartPickups || [];
                state.heartPickups.push({ x: sh.x, y: sh.y, amount: 20, life: 600 });
                state.damageNumbers.push({ x: sh.x, y: sh.y - 10, value: 20, life: 50, vy: -1.5, crit: false });
                persist.pirateRun = persist.pirateRun || { bones: 0, crocKills: 0, sharkKills: 0 };
                persist.pirateRun.sharkKills++;
                state.sharks.splice(si, 1); continue;
            }
            if (sh.hurtTimer > 0) sh.hurtTimer--;
            if (sh.attackCooldown > 0) sh.attackCooldown--;
            sh.animTimer++;
            const sdx = p.x - sh.x, sdy = p.y - sh.y, sDist = Math.hypot(sdx, sdy);
            if (sDist < 220) {
                if (sDist > 5) {
                    const mx = (sdx/sDist)*sh.speed, my = (sdy/sDist)*sh.speed;
                    const sxOk = canStayUnderwater(sh.x+mx, sh.y), syOk = canStayUnderwater(sh.x, sh.y+my);
                    if (sxOk) sh.x += mx;
                    if (syOk) sh.y += my;
                    if (!sxOk && !syOk) { sh.wanderAngle = Math.random()*Math.PI*2; sh.wanderTimer = 0; }
                }
                sh.facingX = sdx > 0 ? 1 : -1;
                if (sDist < 20 && sh.attackCooldown <= 0 && !(p.rabbitInvTimer > 0)) {
                    let dmg = sh.damage * state.diffMult.enemyDmgMult;
                    dmg *= (1 - Math.min(0.50, getArmorBonus('armorDR')));
                    p.hp -= dmg; sh.attackCooldown = 90;
                    createExplosion(p.x, p.y, '#1565c0');
                    if (p.hp <= 0) endGame();
                }
            } else {
                // Return home if too far from spawn lake
                const homeDist = sh.homeX !== undefined ? Math.hypot(sh.x - sh.homeX, sh.y - sh.homeY) : 0;
                if (homeDist > 200) {
                    const hd = homeDist || 1;
                    const hx = (sh.homeX - sh.x) / hd * sh.speed * 0.6;
                    const hy = (sh.homeY - sh.y) / hd * sh.speed * 0.6;
                    if (canStayUnderwater(sh.x+hx, sh.y)) sh.x += hx;
                    if (canStayUnderwater(sh.x, sh.y+hy)) sh.y += hy;
                } else {
                    sh.wanderTimer--;
                    if (sh.wanderTimer <= 0) {
                        sh.wanderAngle = Math.random()*Math.PI*2;
                        sh.wanderTimer = 90 + Math.floor(Math.random()*120);
                    }
                    const wx = Math.cos(sh.wanderAngle)*sh.speed*0.4, wy = Math.sin(sh.wanderAngle)*sh.speed*0.4;
                    const swxOk = canStayUnderwater(sh.x+wx, sh.y), swyOk = canStayUnderwater(sh.x, sh.y+wy);
                    if (swxOk) sh.x += wx;
                    if (swyOk) sh.y += wy;
                    if (!swxOk && !swyOk) { sh.wanderAngle = Math.random()*Math.PI*2; sh.wanderTimer = 0; }
                }
            }
            sh.x = Math.max(0, Math.min(WORLD_W, sh.x));
            sh.y = Math.max(0, Math.min(WORLD_H, sh.y));
        }
    }

    // ─── ALIEN WORLD: HUMAN EXPLORER (SPACE MARINE) UPDATE ───
    if (state.alienWorld) {
        for (let hi = state.humanExplorers.length - 1; hi >= 0; hi--) {
            const h = state.humanExplorers[hi];
            h.animTimer++; if (h.hurtTimer > 0) h.hurtTimer--;
            if (h.attackCooldown > 0) h.attackCooldown--;
            if (h.shootCooldown > 0) h.shootCooldown--;

            if (h.hp <= 0) {
                p.kills++; p.score += h.score;
                // Track human kills for astronaut unlock (alien char must finish without killing any)
                if (p.character === 'alien') p.humanKillsThisRun = (p.humanKillsThisRun || 0) + 1;
                state.goldPickups.push({ x: h.x, y: h.y, amount: h.gold, life: 180 });
                createExplosion(h.x, h.y, '#4fc3f7');
                for (let k = 0; k < 8; k++) state.particles.push({ x: h.x, y: h.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4-1, life: 40, color: '#80d8ff' });
                state.humanExplorers.splice(hi, 1);
                checkMilestone(); checkEvolve(); continue;
            }

            const hdx = p.x - h.x, hdy = p.y - h.y, hDist = Math.hypot(hdx, hdy);
            const homeDist = Math.hypot(h.x - h.homeX, h.y - h.homeY);

            // Check for nearby alien explorer to fight
            let alienFoe = null, alienFoeDist = 300;
            if (h.nearFoe) {
                for (const a of state.alienExplorers) {
                    const d = Math.hypot(a.x - h.x, a.y - h.y);
                    if (d < alienFoeDist) { alienFoeDist = d; alienFoe = a; }
                }
            }

            if (alienFoe && alienFoeDist < 250) {
                // Fight alien explorer
                const adx = alienFoe.x - h.x, ady = alienFoe.y - h.y, ad = Math.hypot(adx, ady) || 1;
                h.x += (adx/ad)*h.speed*0.8; h.y += (ady/ad)*h.speed*0.8;
                h.facingX = adx > 0 ? 1 : -1;
                if (alienFoeDist < 24 && h.attackCooldown <= 0) {
                    alienFoe.hp -= 18; alienFoe.hurtTimer = 12; h.attackCooldown = 70;
                    state.damageNumbers.push({ x: alienFoe.x, y: alienFoe.y - 10, value: 18, life: 40, vy: -1.2, crit: false });
                }
            } else if (homeDist > 400) {
                // Return to lake encampment
                const rd = Math.hypot(h.homeX - h.x, h.homeY - h.y) || 1;
                h.x += ((h.homeX - h.x)/rd)*h.speed; h.y += ((h.homeY - h.y)/rd)*h.speed;
            } else if (isOnWater(p.x, p.y)) {
                // Player stepped into their lake — attack!
                h.x += (hdx/hDist)*h.speed; h.y += (hdy/hDist)*h.speed;
                h.facingX = hdx > 0 ? 1 : -1;
                // Shoot laser at player from medium range
                if (hDist > 80 && hDist < 280 && h.shootCooldown <= 0) {
                    const sx = hdx/hDist, sy = hdy/hDist;
                    state.enemyProjectiles.push({ x: h.x, y: h.y, vx: sx*6, vy: sy*6, damage: h.damage * state.diffMult.enemyDmgMult, life: 55, type: 'laser', color: '#00e5ff' });
                    h.shootCooldown = 90;
                }
                // Melee if close
                if (hDist < 24 && h.attackCooldown <= 0) {
                    let dmg = h.damage * state.diffMult.enemyDmgMult * (1 - Math.min(0.5, getArmorBonus('armorDR')));
                    drainArmorDurability(1);
                    p.hp -= dmg; h.attackCooldown = 80;
                    createExplosion(p.x, p.y, '#4fc3f7');
                }
            } else {
                // Player outside encampment — wander peacefully
                if (h.wanderTimer <= 0) { h.wanderAngle = Math.random()*Math.PI*2; h.wanderTimer = 120 + Math.random()*180; }
                h.wanderTimer--;
                const wx = Math.cos(h.wanderAngle)*h.speed*0.4, wy = Math.sin(h.wanderAngle)*h.speed*0.4;
                const nx = h.x+wx, ny = h.y+wy;
                if (Math.hypot(nx-h.homeX, ny-h.homeY) < 450) { h.x = nx; h.y = ny; }
                else h.wanderTimer = 0;
            }
            h.x = Math.max(0, Math.min(WORLD_W, h.x)); h.y = Math.max(0, Math.min(WORLD_H, h.y));

            // Take projectile damage
            for (let pi = state.projectiles.length - 1; pi >= 0; pi--) {
                const pr = state.projectiles[pi];
                if (Math.hypot(pr.x - h.x, pr.y - h.y) < 18) {
                    h.hp -= pr.damage; h.hurtTimer = 12;
                    state.damageNumbers.push({ x: h.x, y: h.y - 10, value: Math.round(pr.damage), life: 50, vy: -1.5, crit: false });
                    if (!pr.piercing) pr.life = 0;
                }
            }
            // Take melee damage
            if (p.attacking && Math.hypot(p.x - h.x, p.y - h.y) < 50 + (p.attackRangeBonus || 0)) {
                if (!h._meleeHurt || h._meleeHurt !== p.attackCount) {
                    h._meleeHurt = p.attackCount;
                    let dmg = (p.damageMult || 1) * 20;
                    h.hp -= dmg; h.hurtTimer = 12;
                    state.damageNumbers.push({ x: h.x, y: h.y - 10, value: Math.round(dmg), life: 50, vy: -1.5, crit: false });
                }
            }
        }

        // ─── ALIEN WORLD: ALIEN SCOUT UPDATE ───
        for (let ai = state.alienExplorers.length - 1; ai >= 0; ai--) {
            const a = state.alienExplorers[ai];
            a.animTimer++; if (a.hurtTimer > 0) a.hurtTimer--;
            if (a.attackCooldown > 0) a.attackCooldown--;
            if (a.blinkCooldown > 0) a.blinkCooldown--;

            if (a.hp <= 0) {
                p.kills++; p.score += a.score;
                state.goldPickups.push({ x: a.x, y: a.y, amount: a.gold, life: 180 });
                createExplosion(a.x, a.y, '#69f0ae');
                for (let k = 0; k < 8; k++) state.particles.push({ x: a.x, y: a.y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5-1, life: 40, color: '#b2ff59' });
                state.alienExplorers.splice(ai, 1);
                checkMilestone(); checkEvolve(); continue;
            }

            const adx = p.x - a.x, ady = p.y - a.y, aDist = Math.hypot(adx, ady);
            const aHomeDist = Math.hypot(a.x - a.homeX, a.y - a.homeY);

            // Fight human explorers if outposts border
            let humanFoe = null, humanFoeDist = 300;
            if (a.nearFoe) {
                for (const h of state.humanExplorers) {
                    const d = Math.hypot(h.x - a.x, h.y - a.y);
                    if (d < humanFoeDist) { humanFoeDist = d; humanFoe = h; }
                }
            }

            if (humanFoe && humanFoeDist < 250) {
                const hdx2 = humanFoe.x - a.x, hdy2 = humanFoe.y - a.y, hd2 = Math.hypot(hdx2, hdy2) || 1;
                a.x += (hdx2/hd2)*a.speed*0.8; a.y += (hdy2/hd2)*a.speed*0.8;
                if (humanFoeDist < 24 && a.attackCooldown <= 0) {
                    humanFoe.hp -= 20; humanFoe.hurtTimer = 12; a.attackCooldown = 65;
                    state.damageNumbers.push({ x: humanFoe.x, y: humanFoe.y - 10, value: 20, life: 40, vy: -1.2, crit: false });
                }
            } else if (aHomeDist > 400) {
                const rd = Math.hypot(a.homeX - a.x, a.homeY - a.y) || 1;
                a.x += ((a.homeX - a.x)/rd)*a.speed; a.y += ((a.homeY - a.y)/rd)*a.speed;
            } else if (isOnLava(p.x, p.y)) {
                // Player stepped into their lava pool — attack!
                if (aDist > 150 && a.blinkCooldown <= 0) {
                    a.x += (adx/aDist) * Math.min(140, aDist * 0.6);
                    a.y += (ady/aDist) * Math.min(140, aDist * 0.6);
                    a.blinkCooldown = 300;
                    for (let k = 0; k < 10; k++) state.particles.push({ x: a.x, y: a.y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 30, color: '#b2ff59' });
                }
                a.x += (adx/aDist)*a.speed; a.y += (ady/aDist)*a.speed;
                a.facingX = adx > 0 ? 1 : -1;
                if (aDist < 24 && a.attackCooldown <= 0) {
                    let dmg = a.damage * state.diffMult.enemyDmgMult * (1 - Math.min(0.5, getArmorBonus('armorDR')));
                    drainArmorDurability(1);
                    p.hp -= dmg; a.attackCooldown = 70;
                    createExplosion(p.x, p.y, '#69f0ae');
                }
            } else {
                // Player outside encampment — wander peacefully
                if (a.wanderTimer <= 0) { a.wanderAngle = Math.random()*Math.PI*2; a.wanderTimer = 90 + Math.random()*150; }
                a.wanderTimer--;
                const wx = Math.cos(a.wanderAngle)*a.speed*0.5, wy = Math.sin(a.wanderAngle)*a.speed*0.5;
                const nx = a.x+wx, ny = a.y+wy;
                if (Math.hypot(nx-a.homeX, ny-a.homeY) < 450) { a.x = nx; a.y = ny; }
                else a.wanderTimer = 0;
            }
            a.x = Math.max(0, Math.min(WORLD_W, a.x)); a.y = Math.max(0, Math.min(WORLD_H, a.y));

            for (let pi = state.projectiles.length - 1; pi >= 0; pi--) {
                const pr = state.projectiles[pi];
                if (Math.hypot(pr.x - a.x, pr.y - a.y) < 16) {
                    a.hp -= pr.damage; a.hurtTimer = 12;
                    state.damageNumbers.push({ x: a.x, y: a.y - 10, value: Math.round(pr.damage), life: 50, vy: -1.5, crit: false });
                    if (!pr.piercing) pr.life = 0;
                }
            }
            if (p.attacking && Math.hypot(p.x - a.x, p.y - a.y) < 50 + (p.attackRangeBonus || 0)) {
                if (!a._meleeHurt || a._meleeHurt !== p.attackCount) {
                    a._meleeHurt = p.attackCount;
                    let dmg = (p.damageMult || 1) * 20;
                    a.hp -= dmg; a.hurtTimer = 12;
                    state.damageNumbers.push({ x: a.x, y: a.y - 10, value: Math.round(dmg), life: 50, vy: -1.5, crit: false });
                }
            }
        }
    }

    // ─── BUTLER UPDATE ───
    if (state.butler && p.charRich) {
        const b = state.butler;
        b.animTimer++;
        if (b.hurtTimer > 0) b.hurtTimer--;
        if (b.attackCooldown > 0) b.attackCooldown--;
        // Follow player: stay ~55px behind
        const bdx = p.x - b.x, bdy = p.y - b.y;
        const bdist = Math.hypot(bdx, bdy) || 1;
        if (bdist > 55) {
            const spd = Math.min(3.2, (bdist - 55) * 0.12);
            b.x += (bdx / bdist) * spd;
            b.y += (bdy / bdist) * spd;
        }
        // Butler attacks nearest enemy within 100px
        let butlerTarget = null, butlerTargetDist = 100;
        for (const e of state.enemies) {
            if (e.isTamed || e.isShadowDemon) continue;
            const ed = Math.hypot(e.x - b.x, e.y - b.y);
            if (ed < butlerTargetDist) { butlerTargetDist = ed; butlerTarget = e; }
        }
        if (butlerTarget && b.attackCooldown <= 0) {
            const dmg = 12 + p.wave * 2;
            butlerTarget.hp -= dmg;
            butlerTarget.hurtTimer = 10;
            b.attackCooldown = 60;
            state.damageNumbers.push({ x: butlerTarget.x, y: butlerTarget.y - 14, value: dmg, life: 40, vy: -1.2, crit: false });
        }
    } else if (!p.charRich && state.butler) {
        state.butler = null; // clean up if character switched
    }

    // ─── SKELETON WARRIOR UPDATE ───
    for (let wi = state.skeletonWarriors.length - 1; wi >= 0; wi--) {
        const w = state.skeletonWarriors[wi];
        w.animTimer++; if (w.hurtTimer > 0) w.hurtTimer--;
        if (w.attackCooldown > 0) w.attackCooldown--;
        if (w.hp <= 0) {
            createExplosion(w.x, w.y, '#9e9e9e');
            for (let k = 0; k < 4; k++) state.particles.push({ x: w.x, y: w.y, vx: (Math.random()-0.5)*3, vy: -Math.random()*2 - 1, life: 35, color: '#bdbdbd' });
            state.skeletonWarriors.splice(wi, 1);
            continue;
        }
        // Find closest enemy within 200px
        let closestEnemy = null, closestEDist = 200;
        for (const e of state.enemies) {
            const ed = Math.hypot(e.x - w.x, e.y - w.y);
            if (ed < closestEDist) { closestEDist = ed; closestEnemy = e; }
        }
        if (closestEnemy) {
            // Chase enemy
            const dx = closestEnemy.x - w.x, dy = closestEnemy.y - w.y, dd = Math.hypot(dx, dy) || 1;
            if (closestEDist > 18) { w.x += (dx/dd) * 1.6; w.y += (dy/dd) * 1.6; }
            w.facingX = dx > 0 ? 1 : -1;
            // Attack
            if (closestEDist < 22 && w.attackCooldown <= 0) {
                closestEnemy.hp -= 18; closestEnemy.hurtTimer = 10; w.attackCooldown = 60;
                state.damageNumbers.push({ x: closestEnemy.x, y: closestEnemy.y - 10, value: 18, life: 40, vy: -1.2, crit: false });
                createExplosion(closestEnemy.x, closestEnemy.y, '#9e9e9e');
            }
        } else {
            // Drift toward player if no target
            const pdx = p.x - w.x, pdy = p.y - w.y, pd = Math.hypot(pdx, pdy) || 1;
            if (pd > 50) { w.x += (pdx/pd) * 1.0; w.y += (pdy/pd) * 1.0; }
        }
        w.x = Math.max(0, Math.min(WORLD_W, w.x));
        w.y = Math.max(0, Math.min(WORLD_H, w.y));
    }
}
