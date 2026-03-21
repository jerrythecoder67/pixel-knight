// ─── UPDATE ───
function update() {
    if (state.gameOver || state.paused) return;
    state.frame++;
    state.pacifistTimer++;
    if (state.frame % 120 === 0) checkAchievements();
    const p = state.player;

    // ─── DAY / NIGHT ───
    {
        const dn = state.dayNight;
        const EVENING_FRAMES = 600;
        dn.timer--;
        // Evening warning: last 600 frames of day
        if (dn.phase === 'day' && dn.timer <= EVENING_FRAMES && !dn.eveningShown) {
            dn.eveningShown = true;
            showNotif('Night approaches...');
        }
        const targetAlpha = dn.phase === 'night' ? 1.0 : 0;
        dn.alpha += (targetAlpha - dn.alpha) * 0.018;
        if (dn.timer <= 0) {
            if (dn.phase === 'day') {
                dn.phase = 'night'; dn.timer = NIGHT_LEN; dn.eveningShown = false;
                showNotif('Night falls... enemies grow stronger!');
            } else {
                dn.phase = 'day'; dn.timer = DAY_LEN; dn.dayCount++;
                showNotif('Day ' + dn.dayCount + ' — you survived the night!');
            }
        }
    }

    // ─── CHARACTER RUNTIME EFFECTS ───
    // Vampire: day/night stat swings
    if (p.charVampire) {
        const isNight = state.dayNight.phase === 'night';
        p.vampDamageMult = isNight ? 1.3 : 0.8;
        p.vampSpeedMult = isNight ? 1.3 : 0.8;
    }
    // Robot: laser beam and shutdown
    if (p.charRobot && !p.isShutdown) {
        if (!p.laserTimer) p.laserTimer = (Math.floor(Math.random() * 26) + 15) * 60;
        p.laserTimer--;
        if (p.laserTimer <= 0) {
            p.laserTimer = (Math.floor(Math.random() * 26) + 15) * 60;
            p.robotLaserActive = true; p.robotLaserTimer = 150; // 2.5s
            showNotif('ROBOT LASER!');
        }
        if (!p.shutdownTimer) p.shutdownTimer = (Math.floor(Math.random() * 101) + 100) * 60;
        p.shutdownTimer--;
        if (p.shutdownTimer <= 0) {
            p.isShutdown = true; p.shutdownDuration = 300; // 5s
            showNotif('ROBOT SHUTDOWN!');
        }
    }
    if (p.isShutdown) {
        p.shutdownDuration--;
        if (p.shutdownDuration <= 0) {
            p.isShutdown = false;
            p.shutdownTimer = (Math.floor(Math.random() * 101) + 100) * 60;
            showNotif('Robot rebooted!');
        }
    }
    if (p.robotLaserActive) {
        p.robotLaserTimer--;
        if (p.robotLaserTimer <= 0) p.robotLaserActive = false;
        else if (state.frame % 3 === 0) {
            const lx = p.x + p.facingX * 40, ly = p.y + p.facingY * 40;
            hitEnemies(lx, ly, 60, 18, false, false);
            createExplosion(lx, ly, '#00e5ff');
        }
    }
    // Robot: malfunction in water
    if (p.charRobot) {
        if (isOnWater(p.x, p.y)) {
            if (!p.robotMalfunction) {
                p.robotMalfunction = true;
                p.robotMalfunctionTimer = 120 + Math.floor(Math.random() * 180);
                showNotif('MALFUNCTION! Water detected!');
                state.screenShakeMag = 5; state.screenShakeDur = 25;
            }
            if (p.robotMalfunction) {
                p.robotMalfunctionTimer--;
                p.x += (Math.random() - 0.5) * 6;
                p.y += (Math.random() - 0.5) * 6;
                if (Math.random() < 0.02) playerAttack();
                if (state.frame % 4 === 0) state.particles.push({
                    x: p.x + (Math.random() - 0.5) * 20,
                    y: p.y + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2,
                    life: 18, color: 'rgba(0,200,255,0.9)'
                });
                if (p.robotMalfunctionTimer <= 0) p.robotMalfunctionTimer = 60 + Math.floor(Math.random() * 120);
            }
        } else {
            p.robotMalfunction = false;
        }
    }
    // Steve: hunger drain
    if (p.charSteve && state.frame % 300 === 0) {
        p.hunger = Math.max(0, (p.hunger || 0) - 5);
        if (p.hunger <= 0 && state.frame % 300 === 0) {
            p.hp -= 3;
            if (state.frame % 1800 === 0) showNotif('Steve is hungry!');
        }
    }
    // Collector: magnet pulls gold
    if (p.charMagnetRadius && state.frame % 4 === 0) {
        const rad = p.charMagnetRadius;
        state.goldPickups.forEach(g => {
            const dx = p.x - g.x, dy = p.y - g.y;
            const d = Math.hypot(dx, dy);
            if (d < rad && d > 1) { g.x += (dx / d) * 3; g.y += (dy / d) * 3; }
        });
    }
    // Diver unlock: track water time (3 min = 10800 frames in one run)
    if (isOnWater(p.x, p.y)) {
        state.waterFrames++;
        if (state.waterFrames >= 10800 && !persist.unlockedCharacters.includes('diver')) {
            persist.unlockedCharacters.push('diver');
            savePersist(persist);
            showNotif('DIVER UNLOCKED! Check the character select.', true);
        }
    }

    // Sailor unlock: track time in top 2 biggest lakes (as any character)
    if (isOnWater(p.x, p.y) && lakes.length >= 1) {
        const sortedLakes = [...lakes].sort((a, b) => b.size - a.size);
        const lake1 = sortedLakes[0], lake2 = sortedLakes[1];
        if (lake1 && Math.hypot(p.x - lake1.cx, p.y - lake1.cy) < Math.sqrt(lake1.size) * TILE * 0.6)
            p.lakeSec1 = (p.lakeSec1 || 0) + 1 / 60;
        if (lake2 && Math.hypot(p.x - lake2.cx, p.y - lake2.cy) < Math.sqrt(lake2.size) * TILE * 0.6)
            p.lakeSec2 = (p.lakeSec2 || 0) + 1 / 60;
    }
    // Pirate: grapple cooldown tick
    if (p.charPirate && p.grappleCooldown > 0) p.grappleCooldown--;

    // Blob gene runtime effects
    if (p.charBlob) {
        // Regen: +1 HP every 3 seconds when regen gene equipped
        if (p.blobGenes && p.blobGenes.includes('regen') && state.frame % 180 === 0) {
            if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + 1); createExplosion(p.x, p.y, '#f48fb1'); }
        }
        // Toxin: slow all nearby enemies 40% (applied each frame as a flag)
        if (p.blobGenes && p.blobGenes.includes('toxin')) {
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - p.x, e.y - p.y) < 80) e.toxinSlowed = state.frame + 3;
            });
        }
        // Gene unlock checks
        if (p.blobGenes) {
            const genes = p.blobGenes;
            const unlocks = p.blobGeneUnlocks || {};
            // Acid: deal 100 total damage
            if (!unlocks.blobDamage100 && (p.blobDamageDealt || 0) >= 100) {
                p.blobGeneUnlocks.blobDamage100 = true;
                showNotif('Gene unlocked: Acid Spit!');
            }
            // Armor: take 50 total damage
            if (!unlocks.blobTookDmg50 && (p.blobDmgTaken || 0) >= 50) {
                p.blobGeneUnlocks.blobTookDmg50 = true;
                showNotif('Gene unlocked: Armor Plate!');
            }
            // Speed Cilia: survive 3 waves
            if (!unlocks.blobWaves3 && (p.blobWavesSurvived || 0) >= 3) {
                p.blobGeneUnlocks.blobWaves3 = true;
                showNotif('Gene unlocked: Speed Cilia!');
            }
            // Regen Core: kill 5 enemies
            if (!unlocks.blobKills5 && (p.blobKillCount || 0) >= 5) {
                p.blobGeneUnlocks.blobKills5 = true;
                showNotif('Gene unlocked: Regen Core!');
            }
            // Absorption: survive 5 waves
            if (!unlocks.blobWaves5 && (p.blobWavesSurvived || 0) >= 5) {
                p.blobGeneUnlocks.blobWaves5 = true;
                showNotif('Gene unlocked: Absorption!');
            }
            // Toxin Cloud: kill 20 enemies
            if (!unlocks.blobKills20 && (p.blobKillCount || 0) >= 20) {
                p.blobGeneUnlocks.blobKills20 = true;
                showNotif('Gene unlocked: Toxin Cloud!');
            }
            // Cell Split: survive below 10% HP
            if (!unlocks.blobNearDeath && p.hp <= p.maxHp * 0.1 && p.hp > 0) {
                p.blobGeneUnlocks.blobNearDeath = true;
                showNotif('Gene unlocked: Cell Split!');
            }
            // Macro Cell: equip 4 genes
            if (!unlocks.blobEquip4 && genes.length >= 4) {
                p.blobGeneUnlocks.blobEquip4 = true;
                showNotif('Gene unlocked: Macro Cell!');
            }
        }
    }

    // Check if player is in a web (before movement)
    const playerInWeb = state.spiderWebs.some(w => Math.hypot(w.x - p.x, w.y - p.y) < 25 * (p.sizeScale || 1));
    if (playerInWeb && !p.dashing) { state.webbedTimer++; } else { state.webbedTimer = 0; }

    // Spectral orbs update
    if (hasUpgrade('spectralOrbs')) {
        p.orbAngle += 0.04;
        const orbCount = 2 + upgradeLevel('spectralOrbs');
        const orbDmg = 8 * (1 + upgradeLevel('spectralOrbs') * 0.2);
        for (let o = 0; o < orbCount; o++) {
            const oAng = p.orbAngle + (o * Math.PI * 2 / orbCount);
            const ox = p.x + Math.cos(oAng) * 50, oy = p.y + Math.sin(oAng) * 50;
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - ox, e.y - oy) < 14) {
                    e.hp -= orbDmg * 0.04;
                    if (Math.random() < 0.05) state.particles.push({ x: ox, y: oy, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 12, color: '#b388ff' });
                }
            });
        }
    }

    // Movement
    let dx = 0, dy = 0;
    if (state.keys['w'] || state.keys['arrowup']) dy -= 1;
    if (state.keys['s'] || state.keys['arrowdown']) dy += 1;
    if (state.keys['a'] || state.keys['arrowleft']) dx -= 1;
    if (state.keys['d'] || state.keys['arrowright']) dx += 1;
    if (state.joyDir) { dx += state.joyDir.x; dy += state.joyDir.y; }
    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        let spd = p.speed;
        if (p.dashing) spd *= 3;
        if (p.ninjaSlowTimer > 0) spd *= 0.45; // Ninja post-dash slow
        if (p.isShutdown) spd = 0; // Robot shutdown: can't move
        if (p.vampSpeedMult) spd *= p.vampSpeedMult; // Vampire day/night
        if (playerInWeb && !p.dashing) spd *= 0.3;
        // Water slowdown (pathfinder immune; also negated while dashing; sailor immune)
        if (!p.dashing && !p.skills?.pathfinder && !p.charSailor && isOnWater(p.x, p.y)) spd *= state.underwater ? 0.7 : 0.55;
        // Sailor: 2× on water, 0.5× on land
        if (p.charSailor) { if (isOnWater(p.x, p.y)) spd *= 2; else spd *= 0.5; }
        // Lava slowdown (demon and dragon are immune; demon gets a boost instead)
        if (!p.dashing && getTerrainAt(p.x, p.y) === 'lava') {
            if (p.charDemon) spd *= 1.2;
            else if (!p.charDragon) spd *= 0.6;
        }
        // Demon: -15% speed off lava
        if (p.charDemon && getTerrainAt(p.x, p.y) !== 'lava') spd *= 0.85;
        // Pathfinder: bonus speed on all terrain
        if (p.skills?.pathfinder) spd *= 1.15;
        // Hamster wheel runner burst
        if (p.hamsterBurst > 0) spd *= (1 + 0.20 + (petBranchIs(2, 0, 0) ? Math.min(0.50, Math.max(0, p.petEvolveLevel - 3) * 0.08) : 0));
        // Bird Tailwind path: passive speed boost
        if (p.pet === 'bird' && petBranchIs(2, 0, 0) && p.petEvolveLevel >= 1) spd *= 1.15 + Math.min(0.35, Math.max(0, p.petEvolveLevel - 3) * 0.05);
        // Momentum skill: stacks speed while moving
        if (p.hasMomentum) {
            if (state.frame % 60 === 0) p.momentumStacks = Math.min(8, (p.momentumStacks||0) + 1);
            spd *= 1 + (p.momentumStacks||0) * 0.04;
        }
        // Shopper: speed bonus from gold held (+0.5% per 1000g)
        if (p.charShopper && p.gold > 0) spd *= 1 + Math.floor(p.gold / 1000) * 0.005;
        // Jellyfish sting slow
        if (p.jellyfishSlow > 0) { spd *= 0.45; p.jellyfishSlow--; }
        p.x += dx * spd; p.y += dy * spd; p.facingX = dx; p.facingY = dy;
        p.animTimer++; if (p.animTimer % 10 === 0) p.animFrame = 1 - p.animFrame;
        if (hasUpgrade('inferno') && state.frame % 4 === 0) {
            const mult = 1 + upgradeLevel('inferno') * 0.5;
            state.fireTrails.push({ x: p.x, y: p.y, life: 50, damage: 8 * mult });
        }
        // Bird Tailwind - Gust Trail: wind trail while moving
        if (p.pet === 'bird' && petBranchIs(2, 2, 0) && p.petEvolveLevel >= 4 && state.frame % 6 === 0) {
            const wDmg = 5 + Math.max(0, p.petEvolveLevel - 3) * 2.5;
            state.fireTrails.push({ x: p.x, y: p.y, life: 40 + Math.max(0, p.petEvolveLevel - 3) * 8, damage: wDmg });
        }
    } else {
        // Momentum: decay stacks when standing still
        if (p.hasMomentum && (p.momentumStacks||0) > 0 && state.frame % 60 === 0) {
            p.momentumStacks = Math.max(0, p.momentumStacks - 1);
        }
    }

    if (p.dashing) {
        p.dashTimer--;
        // Spiked boots: deal damage to enemies during dash
        const dashDmg = getArmorBonus('dashDmg');
        if (dashDmg > 0 && state.frame % 3 === 0) {
            state.enemies.forEach(e => { if (Math.hypot(e.x-p.x,e.y-p.y) < 24) { e.hp -= dashDmg; createExplosion(e.x,e.y,'#455a64'); } });
        }
        if (p.dashTimer <= 0) p.dashing = false;
    }
    // Ninja: count down invisibility timer (persists after dash ends)
    if (p.charNinja && p.ninjaInvisTimer > 0) {
        p.ninjaInvisTimer--;
        if (p.ninjaInvisTimer <= 0) {
            p.ninjaInvisible = false;
            p.ninjaSlowTimer = 120;
        }
    }
    if (p.ninjaSlowTimer > 0) p.ninjaSlowTimer--;
    if (p.dashCooldown > 0) p.dashCooldown--;
    if (p.rabbitInvTimer > 0) p.rabbitInvTimer--;
    if (p.attackCooldown > 0) p.attackCooldown--;
    if (p.attackCooldown < ALL_WEAPONS[p.weapon].cooldown - 5) p.attacking = false;

    if (p.cloneAttackTimer > 0) {
        p.cloneAttackTimer--;
        if (p.cloneAttackTimer === 0) {
            const wpn = ALL_WEAPONS[p.weapon];
            const cloneDmg = wpn.damage * (0.5 + upgradeLevel('shadowClone') * 0.25);
            hitEnemies(p.x - p.facingX * 30, p.y - p.facingY * 30, wpn.range, cloneDmg);
            createExplosion(p.x - p.facingX * 30, p.y - p.facingY * 30, '#88f');
        }
    }

    p.x = Math.max(16, Math.min(WORLD_W - 16, p.x));
    p.y = Math.max(16, Math.min(WORLD_H - 16, p.y));
    state.camera.x = Math.max(0, Math.min(WORLD_W - canvas.width, p.x - canvas.width / 2));
    state.camera.y = Math.max(0, Math.min(WORLD_H - canvas.height, p.y - canvas.height / 2));
    if (state.screenShakeDur > 0) state.screenShakeDur--;

    if (state.bossWarningTimer > 0) { state.bossWarningTimer--; if (state.bossWarningTimer === 0) document.getElementById('boss-warning').classList.add('hidden'); }

    // Tree trunk collision (player can't walk through trunks; dashing ignores it)
    if (!p.dashing) {
        state.trees.forEach(tr => {
            const trunkCY = tr.y + 10; // trunk center is below tree base point
            const dx = p.x - tr.x, dy = p.y - trunkCY;
            const d = Math.hypot(dx, dy);
            if (d < 14 && d > 0) { p.x = tr.x + (dx / d) * 14; p.y = trunkCY + (dy / d) * 14; }
        });
    }

    // Trees: update hurt timers, remove chopped trees
    for (let ti = state.trees.length - 1; ti >= 0; ti--) {
        const tr = state.trees[ti];
        if (tr.hurtTimer > 0) tr.hurtTimer--;
        if (tr.hp <= 0) {
            state.trees.splice(ti, 1);
            const type = tr.treeType || 'oak';
            if (type === 'dead') {
                createExplosion(tr.x, tr.y, '#9e9e9e');
                if (Math.random() < 0.4) { p.bones = (p.bones || 0) + 1; showNotif('Found a Bone!'); }
            } else if (type === 'fruit') {
                createExplosion(tr.x, tr.y, '#e91e63');
                state.goldPickups.push({ x: tr.x, y: tr.y, amount: 2, life: 180 });
                if (Math.random() < 0.7) { p.hp = Math.min(p.maxHp, p.hp + 5); showNotif('+5 HP from fruit tree!'); }
            } else if (type === 'redwood') {
                createExplosion(tr.x, tr.y, '#5d4037');
                state.goldPickups.push({ x: tr.x, y: tr.y, amount: 10, life: 180 });
                if (Math.random() < 0.6) {
                    const woodAmt = 1 + Math.floor(Math.random() * 2);
                    p.redWood = (p.redWood || 0) + woodAmt;
                    showNotif('Found ' + woodAmt + ' Redwood!');
                }
            } else if (type === 'pine') {
                createExplosion(tr.x, tr.y, '#1b5e20');
                state.goldPickups.push({ x: tr.x, y: tr.y, amount: 8, life: 180 });
                if (Math.random() < 0.3) { p.pineWood = (p.pineWood || 0) + 1; showNotif('Found Pine Wood!'); }
            } else { // oak
                state.goldPickups.push({ x: tr.x, y: tr.y, amount: 5, life: 180 });
                createExplosion(tr.x, tr.y, '#8d6e63');
                // Branch drops (for stickman unlock)
                const branchAmt = 1 + Math.floor(Math.random() * 2);
                p.branchCount = (p.branchCount || 0) + branchAmt;
                if (p.branchCount < 30) showNotif(p.branchCount + ' branches collected!');
                if (p.branchCount >= 30 && !persist.achievements.stickmanUnlock) grantAchievement('stickmanUnlock');
            }
            // chopAllTrees: check if all trees chopped
            if (state.trees.length === 0 && !persist.achievements.chopAllTrees) {
                grantAchievement('chopAllTrees');
            }
        }
    }

    // Barricade: collision with player, enemy damage, decay
    for (let bi = state.barricades.length - 1; bi >= 0; bi--) {
        const b = state.barricades[bi];
        // Player collision (same push as trees)
        if (!p.dashing) {
            const bdx = p.x - b.x, bdy = p.y - b.y, bd = Math.hypot(bdx, bdy);
            if (bd < 18 && bd > 0) { p.x = b.x + (bdx / bd) * 18; p.y = b.y + (bdy / bd) * 18; }
        }
        // Enemies collide with barricade and take positional correction every frame
        for (const e of state.enemies) {
            const edx = e.x - b.x, edy = e.y - b.y, ed = Math.hypot(edx, edy);
            if (ed < 20 && ed > 0) {
                // Push enemy outside collision radius (solid block)
                e.x = b.x + (edx / ed) * 20;
                e.y = b.y + (edy / ed) * 20;
                // Damage barricade every 30 frames of contact
                if (!b._lastEnemyHit || state.frame - b._lastEnemyHit > 30) {
                    b.hp--; b._lastEnemyHit = state.frame;
                }
            }
        }
        if (b.hp <= 0) {
            state.barricades.splice(bi, 1);
            createExplosion(b.x, b.y, '#8d6e63');
        }
    }

    // Torch timer: only ticks down during night
    if (p.torchTimer > 0 && state.dayNight.phase === 'night') {
        p.torchTimer--;
        if (p.torchTimer === 0) showNotif('Torch burned out!');
    }

    // Janitor: tick down cooldowns
    if (p.charJanitor) {
        if ((p.vacuumCooldown || 0) > 0) p.vacuumCooldown--;
        if ((p.bucketCooldown || 0) > 0) p.bucketCooldown--;
    }
    // Cowboy: tick down revolver reload
    if (p.charCowboy && (p.revolverReload || 0) > 0) {
        p.revolverReload--;
        if (p.revolverReload <= 0) { p.revolverShots = 6; showNotif('Reloaded! 6 shots ready.'); }
    }
    // Youtuber: subscriber count tracks kills; joy aura — random enemy fan conversion
    if (p.charYoutuber) {
        p.subscribers = p.kills || 0;
        if (state.frame % 180 === 0 && state.enemies.length > 0) {
            const candidate = state.enemies.filter(e => !e.isBoss && !e.isTamed).sort(() => Math.random() - 0.5)[0];
            if (candidate && Math.random() < 0.25) {
                candidate.isTamed = true; candidate.tamedTimer = 600;
                showNotif('A fan joined you! (' + (p.subscribers || 0) + ' subscribers)');
                createExplosion(candidate.x, candidate.y, '#ff5252');
            }
        }
    }
    // Paleontologist: update fossil minions
    if (p.charPaleo && p.fossilMinions) {
        for (let i = p.fossilMinions.length - 1; i >= 0; i--) {
            const fm = p.fossilMinions[i];
            fm.life--;
            if (fm.life <= 0) { p.fossilMinions.splice(i, 1); continue; }
            // Find nearest enemy
            let nearest = null, nearDist = 100;
            state.enemies.forEach(e => { if (!e.isBoss && !e.isTamed) { const d = Math.hypot(e.x - fm.x, e.y - fm.y); if (d < nearDist) { nearDist = d; nearest = e; } } });
            if (nearest) {
                const fdx = nearest.x - fm.x, fdy = nearest.y - fm.y, fd = Math.hypot(fdx, fdy) || 1;
                fm.x += (fdx / fd) * 1.8; fm.y += (fdy / fd) * 1.8;
                if (nearDist < 24) {
                    fm.attackCooldown = (fm.attackCooldown || 0) - 1;
                    if (fm.attackCooldown <= 0) {
                        nearest.hp -= 20; nearest.hitFlash = 8;
                        fm.attackCooldown = 60;
                        createExplosion(nearest.x, nearest.y, '#e0d5b5');
                    }
                }
            } else {
                // Drift toward player if no target
                const fpdx = p.x - fm.x, fpdy = p.y - fm.y, fpd = Math.hypot(fpdx, fpdy) || 1;
                if (fpd > 50) { fm.x += (fpdx / fpd) * 1.2; fm.y += (fpdy / fpd) * 1.2; }
            }
        }
    }

    // Demon fire aura: slows nearby enemies
    if (p.charDemon && state.frame % 6 === 0) {
        for (const e of state.enemies) {
            if (Math.hypot(e.x - p.x, e.y - p.y) < 80) {
                e.slowTimer = (e.slowTimer || 0) + 20;
                if (state.frame % 60 === 0) {
                    e.hp -= 1; e.hurtTimer = 8; // minor aura burn
                }
            }
        }
    }

    // Dragon: charge-up fire breath (hold mouse to charge, release to fire)
    if (p.charDragon) {
        if (state.mouseHeld) {
            p.dragonBreathCharge = Math.min(90, (p.dragonBreathCharge || 0) + 1);
        } else if (p.dragonBreathCharge > 0) {
            if (p.dragonBreathCharge >= 10) {
                const chargeRatio = p.dragonBreathCharge / 90;
                const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
                const al = Math.hypot(mx - p.x, my - p.y) || 1;
                const bfx = (mx - p.x) / al, bfy = (my - p.y) / al;
                const range = 80 + chargeRatio * 120;
                const dmg = 40 + chargeRatio * 80;
                state.enemies.forEach(e => {
                    if (e.isTamed) return;
                    const edx = e.x - p.x, edy = e.y - p.y, dist = Math.hypot(edx, edy);
                    const dot = (edx / (dist || 1)) * bfx + (edy / (dist || 1)) * bfy;
                    if (dist < range && dot > 0.3) {
                        e.hp -= dmg; e.hitFlash = 8;
                        createExplosion(e.x, e.y, '#ff6600');
                        state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(dmg), life: 50, vy: -1.5, crit: false });
                    }
                });
                for (let k = 0; k < Math.floor(chargeRatio * 8) + 3; k++) {
                    createExplosion(p.x + bfx * (Math.random() * range * 0.8), p.y + bfy * (Math.random() * range * 0.8), '#ff6600');
                }
            }
            p.dragonBreathCharge = 0;
        }
    }

    // Stickman: hold attack mouse for 360° spin mode
    if (p.charStickman && p.weapon === 'stick') {
        p.stickSpin = state.mouseHeld;
        if (p.stickSpin) p.attackCooldown = Math.min(p.attackCooldown, 4); // fast while spinning
    }
    // Rogue: shadowBladeActive window timer
    if (p.charRogue && p.shadowBladeTimer > 0) {
        p.shadowBladeTimer--;
        if (p.shadowBladeTimer <= 0) p.shadowBladeActive = false;
    }

    // Angel: passive heal aura (+2 HP every 5s)
    if (p.charAngel) {
        p.angelHealTimer = (p.angelHealTimer || 0) + 1;
        if (p.angelHealTimer >= 300 && p.hp < p.maxHp) {
            p.hp = Math.min(p.maxHp, p.hp + 2);
            p.angelHealTimer = 0;
            createExplosion(p.x, p.y, '#ffe082');
        }
    }

    // Gamer: combo timer countdown
    if (p.charGamer) {
        if (p.gamerComboTimer > 0) {
            p.gamerComboTimer--;
            if (p.gamerComboTimer <= 0 && p.gamerCombo > 0) {
                p.gamerCombo = 0;
                showNotif('Combo lost!');
            }
        }
    }

    // Fashion Model: beauty aura - periodically slows nearby enemies
    if (p.charModelAura) {
        p.fashionAuraTimer = (p.fashionAuraTimer || 0) + 1;
        if (p.fashionAuraTimer >= 120) {
            p.fashionAuraTimer = 0;
            const auraRadius = 80;
            let affected = 0;
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - p.x, e.y - p.y) < auraRadius && !e.isBoss) {
                    e.charmed = true; e.charmedTimer = 80;
                    affected++;
                }
            });
            if (affected > 0) {
                for (let k = 0; k < 8; k++) state.particles.push({ x: p.x + (Math.random()-0.5)*80, y: p.y + (Math.random()-0.5)*80, vx: (Math.random()-0.5)*2, vy: -1.5 - Math.random(), life: 45, color: 'rgba(255,100,200,0.75)' });
            }
        }
    }

    // Diver: underwater oxygen + auto-surface
    if (state.underwater) {
        if (!canStayUnderwater(p.x, p.y)) {
            state.underwater = false;
            showNotif('Surfaced!');
        } else {
            p.oxygenTimer = (p.oxygenTimer || 0) - 1;
            if (p.oxygenTimer <= 0) {
                // No air — take damage every second, no auto-surface
                if (state.frame % 60 === 0) {
                    p.hp -= 8;
                    showNotif('Out of air! Drowning!');
                    if (p.hp <= 0) endGame();
                }
            } else if (p.oxygenTimer === 300) {
                showNotif('Low oxygen! 5 seconds!');
            }
        }
    }

    // Wizard mana regen
    if (p.character === 'wizard' && !state.paused) {
        const fullMana = p.maxMana * p.manaStacks;
        if (p.mana < fullMana) {
            p.mana = Math.min(fullMana, p.mana + p.manaRegen);
        }
        // Update mana bar HUD
        const manaWrap = document.getElementById('mana-bar-wrap');
        if (manaWrap) {
            manaWrap.style.display = 'flex';
            const pct = Math.min(100, (p.mana % p.maxMana) / p.maxMana * 100);
            document.getElementById('mana-bar-fill').style.width = pct + '%';
            const readyLabel = document.getElementById('mana-ready-label');
            const canCast = p.mana >= p.maxMana;
            readyLabel.style.display = canCast ? '' : 'none';
        }
    } else {
        const manaWrap = document.getElementById('mana-bar-wrap');
        if (manaWrap) manaWrap.style.display = 'none';
    }

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

        const edx = p.x - e.x, edy = p.y - e.y, dist = Math.hypot(edx, edy);
        const pContactDist = 20 * (p.sizeScale || 1);
        // Ninja invisibility: enemies slow to a wander when player is invisible
        if (p.ninjaInvisible && dist > 40) { e.x += (Math.random()-0.5)*0.5; e.y += (Math.random()-0.5)*0.5; continue; }
        // Underwater: land enemies can't reach the diver
        if (state.underwater && !e.underwaterCapable) { e.x += (Math.random()-0.5)*0.8; e.y += (Math.random()-0.5)*0.8; continue; }
        let spd = e.speed;
        if (hasUpgrade('frostAura') && dist < 100 + upgradeLevel('frostAura') * 10) spd *= 0.6 - upgradeLevel('frostAura') * 0.1;
        spd *= nightMult();
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

            if (dist < pContactDist && !(p.rabbitInvTimer > 0)) {
                let dmg = (e.isBoss ? 1.5 : 0.5) * state.diffMult.enemyDmgMult * nightMult();
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
            let goldAmt = e.gold * (hasUpgrade('goldRush') ? 2 + upgradeLevel('goldRush') : 1) * p.streakMult * state.diffMult.goldMult;
            state.goldPickups.push({ x: e.x, y: e.y, amount: Math.round(goldAmt), life: 180 });
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
                state.postBossCooldown = 420; // 7s grace — no wave advance or shadow demon
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

    // Projectiles
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

    // Gold
    let dogBonus = 0;
    if (p.pet === 'dog') {
        // Base + retriever path bonuses
        dogBonus = 150;
        if (petBranchIs(1, 0, 0)) { // Retriever path — capped at 600px max, no screen-wide
            const dt3 = Math.max(0, p.petEvolveLevel - 3);
            dogBonus += Math.min(450, dt3 * 75);
        }
    }
    const magR = (hasUpgrade('magnetism') ? 200 + upgradeLevel('magnetism') * 50 : 60) + dogBonus;
    const goldPullSpeed = (p.pet === 'dog' && petBranchIs(1, 0, 0) && p.petEvolveLevel >= 5) ? 12 : 5;
    for (let i = state.goldPickups.length - 1; i >= 0; i--) {
        const g = state.goldPickups[i]; g.life--;
        const d = Math.hypot(g.x - p.x, g.y - p.y);
        if (d < magR) { const pull = Math.min(goldPullSpeed, magR / d); g.x += (p.x - g.x) / d * pull; g.y += (p.y - g.y) / d * pull; }
        if (d < 20) {
            // Janitor pickup tracking (50 pickups in 5s = 300 frames)
            if (p.charJanitor) {
                state.janitorPickupWindow = state.janitorPickupWindow || [];
                state.janitorPickupWindow.push(state.frame);
                state.janitorPickupWindow = state.janitorPickupWindow.filter(f => state.frame - f < 300);
                if (state.janitorPickupWindow.length >= 50 && !persist.achievements.janitorUnlock) grantAchievement('janitorUnlock');
            }
            let amt = g.amount;
            // Hamster hoarder path bonuses (branch 1)
            if (p.pet === 'hamster' && petBranchIs(1, 0, 0)) {
                const dt3 = Math.max(0, p.petEvolveLevel - 3);
                const bonus = 4 + dt3 * 4;
                amt += bonus;
                addPetAction(bonus); // track bonus gold hoarded
            }
            amt = Math.round(amt * (p.goldMult || 1));
            // Scrooge McDuck: double all gold
            if (p.pet === 'scroogeMcduck') amt *= 2;
            p.gold += amt;
            p.totalGoldEarned = (p.totalGoldEarned || 0) + amt;
            state.damageNumbers.push({ x: g.x, y: g.y - 8, value: amt, life: 45, vy: -0.9, crit: false, isGold: true });
            state.goldPickups.splice(i, 1);
            // Dog: track gold fetched by magnetism
            if (p.pet === 'dog' && dogBonus > 0) addPetAction(1);
        }
        else if (g.life <= 0) state.goldPickups.splice(i, 1);
    }

    // Hearts
    for (let i = state.heartPickups.length - 1; i >= 0; i--) {
        const h = state.heartPickups[i]; h.life--;
        const d = Math.hypot(h.x - p.x, h.y - p.y);
        if (d < 20) {
            p.hp = Math.min(p.maxHp, p.hp + 30); showNotif('Healed +30!');
            createExplosion(h.x, h.y, '#ff4444');
            // Janitor: also track heart pickups
            if (p.charJanitor) {
                state.janitorPickupWindow = state.janitorPickupWindow || [];
                state.janitorPickupWindow.push(state.frame);
                state.janitorPickupWindow = state.janitorPickupWindow.filter(f => state.frame - f < 300);
                if (state.janitorPickupWindow.length >= 50 && !persist.achievements.janitorUnlock) grantAchievement('janitorUnlock');
            }
            state.heartPickups.splice(i, 1);
        } else if (h.life <= 0) state.heartPickups.splice(i, 1);
    }

    // Lava damage (demon and dragon are immune)
    if (getTerrainAt(p.x, p.y) === 'lava') {
        if (!p.charDemon && !p.charDragon) {
            // Track continuous lava time for demon unlock
            p.lavaContinuousTimer = (p.lavaContinuousTimer || 0) + 1;
            if (p.lavaContinuousTimer >= 2400 && !persist.unlockedCharacters.includes('demon')) {
                persist.unlockedCharacters.push('demon');
                savePersist(persist);
                showNotif('DEMON UNLOCKED! You survived 40s in lava!');
            }
            if (!(p.rabbitInvTimer > 0) && state.frame % 20 === 0) {
                p.hp -= 2;
                createExplosion(p.x, p.y, '#ff6600');
                if (p.hp <= 0) {
                    if (hasUpgrade('phoenix') && !p.phoenixUsed) {
                        p.hp = p.maxHp * (0.5 + upgradeLevel('phoenix') * 0.15); p.phoenixUsed = true;
                        showNotif('Phoenix revive!'); createExplosion(p.x, p.y, '#ff8800');
                    } else if (p.skills?.second_chance && !p.secondChanceUsed) {
                        p.hp = 30; p.secondChanceUsed = true;
                        showNotif('Last Stand! Revived with 30 HP!'); createExplosion(p.x, p.y, '#ffffaa');
                    } else endGame();
                }
            }
        }
        // Dragon ritual step 1: dinosaur character stood in lava
        if (p.character === 'dinosaur') state.dragonRitualInLava = true;
    } else {
        p.lavaContinuousTimer = 0;
    }

    // Fire trails
    for (let i = state.fireTrails.length - 1; i >= 0; i--) {
        const f = state.fireTrails[i]; f.life--;
        state.enemies.forEach(e => { if (Math.hypot(e.x - f.x, e.y - f.y) < 18) e.hp -= f.damage * 0.1; });
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
        state.enemies.forEach(e => {
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
                createExplosion(ch.x, ch.y, '#ffd700');
                for (let k = 0; k < 3; k++) createExplosion(ch.x + (Math.random()-0.5)*24, ch.y + (Math.random()-0.5)*24, '#ffaa00');
            }
        }
    }

    // Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i]; pt.x += pt.vx; pt.y += pt.vy; pt.life--;
        if (pt.life <= 0) state.particles.splice(i, 1);
    }

    // Damage numbers
    for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
        const dn = state.damageNumbers[i]; dn.y += dn.vy; dn.life--;
        if (dn.life <= 0) state.damageNumbers.splice(i, 1);
    }

    // Drain wave spawn queue — stagger enemy arrivals until all are out
    if (!state.waveAllSpawned && !state.bossActive && state.waveBreather === 0) {
        if (state.waveSpawnTimer > 0) {
            state.waveSpawnTimer--;
        } else if (state.waveSpawnQueue.length > 0) {
            const typeEntry = state.waveSpawnQueue.shift();
            spawnWaveEnemy(typeEntry);
            state.waveSpawnTimer = typeEntry.startsWith('horde:') ? 20 : 45;
        } else {
            state.waveAllSpawned = true;
        }
    }

    if (state.postBossCooldown > 0) state.postBossCooldown--;
    // Endless mode: track timer, stop normal wave advancement
    if (state.endlessMode) state.endlessTimer = (state.endlessTimer || 0) + 1;

    // Wave advance: regular waves need 3/4 kills; boss waves use old all-dead system
    const _waveQuota = state.waveEnemiesTotal > 0 ? Math.ceil(state.waveEnemiesTotal * 0.75) : 0;
    const _waveDone = state.bossActive ? false
        : state.hordeWave && state.hordeTimer <= 0 ? true
        : state.waveEnemiesTotal > 0
            ? (state.waveEnemiesKilled >= _waveQuota)
            : (state.waveAllSpawned && state.enemies.length === 0);
    if (!state.endlessMode && _waveDone && state.waveBreather === 0 && state.postBossCooldown === 0) {
        if (state.waveEnemiesTotal > 0) { state.waveSpawnQueue = []; state.waveAllSpawned = true; }
        p.wave++; createExplosion(p.x, p.y, '#4e4e6e');
        state.waveBreather = 240;
        p.furyKills = 0; // Reset fury stacks each wave
        // Youtuber unlock: reach wave 30 as any character
        if (p.wave >= 30 && !persist.achievements.youtuberUnlock) grantAchievement('youtuberUnlock');
        state.hordeWave = false;
        state.waveAllSpawned = false;
        // Blob gene: wave survival tracking
        if (p.charBlob) p.blobWavesSurvived = (p.blobWavesSurvived || 0) + 1;
        // Witch: brew a random potion at wave start
        if (p.charWitch) {
            p.witchPotionReady = true;
            const potionTypes = ['heal', 'freeze', 'poison', 'chaos'];
            p.witchPotionType = potionTypes[Math.floor(Math.random() * potionTypes.length)];
            showNotif('Witch brews: ' + p.witchPotionType + ' potion! [Click to use]');
        }
        // Butler paycheck: every 5 waves, Rich must pay up or lose
        if (p.charRich && state.butler && p.wave % 5 === 0) {
            const paycheckAmt = 200 + p.wave * 30;
            if (p.gold >= paycheckAmt) {
                p.gold -= paycheckAmt;
                showNotif('Butler paycheck: -' + paycheckAmt + 'g. "A pleasure, sir."');
            } else {
                showNotif('You can\'t pay the butler! He quits — game over.');
                state.butler = null;
                endGame();
            }
        }
        // Wizard trial win condition
        if (state.wizardTrialActive && p.wave > state.wizardTrialWaveTarget) {
            state.wizardTrialActive = false;
            if (!persist.unlockedCharacters.includes('wizard')) {
                persist.unlockedCharacters.push('wizard');
                savePersist(persist);
                showNotif('WIZARD UNLOCKED!');
            } else {
                showNotif('Trial complete! Wizard is yours.');
            }
        }
        // Apply interest to locked shop items (+1% per wave)
        for (const key of Object.keys(state.shopLocks)) {
            if (state.shopLocks[key]) {
                state.shopLockedPrices[key] = Math.min(
                    Math.round((state.shopLockedPrices[key] || ALL_WEAPONS[key].price) * 1.01),
                    Math.round(ALL_WEAPONS[key].price * 2.5)
                );
            }
        }
        const bossInterval = state.difficulty === 'extreme' ? 20 : 10;
        const reaperInterval = state.difficulty === 'extreme' ? 40 : 20;
        if (p.wave % bossInterval === 0) {
            // Check for world final boss at reaper-interval multiples
            const _worldAllDone = state.dinoWorld ? (p.unlockedDinoTypes >= DINO_ENEMY_TYPES.length)
                : state.sailorWorld ? (p.unlockedSailorTypes >= SAILOR_ENEMY_TYPES.length)
                : state.alienWorld ? (p.unlockedAlienTypes >= ALIEN_ENEMY_TYPES.length)
                : (p.unlockedEnemyTypes >= ENEMY_TYPES.length);
            if (p.wave % reaperInterval === 0 && _worldAllDone) {
                if (state.dinoWorld) spawnTRexBoss();
                else if (state.sailorWorld) spawnMegalodonBoss();
                else if (state.alienWorld) spawnAlienQueenBoss();
                else spawnGrimReaper();
                randomizeShop(); // auto-refresh on boss wave
            } else {
                spawnBoss(p.wave);
                randomizeShop(); // auto-refresh on boss wave
                showNotif('Wave ' + p.wave + ' — BOSS WAVE!', true);
            }
            state.waveSpawnQueue = []; state.waveEnemiesTotal = 0; state.waveEnemiesKilled = 0; // boss wave: boss already spawned directly
        } else if (p.wave % 5 === 0 && Math.random() < 0.6) {
            // Horde wave: many weakened enemies, kill them all to advance
            state.hordeWave = true;
            state.hordeTimer = 1800; // 30 seconds
            state.waveSpawnQueue = buildWaveQueue(true);
            showNotif('WAVE ' + p.wave + ' — HORDE WAVE! Survive the swarm!');
        } else {
            state.waveSpawnQueue = buildWaveQueue(false);
            showNotif('Wave ' + p.wave + (p.wave % 5 === 0 ? ' — Elite Wave!' : '') + '!');
        }
        if (p.wave % 5 === 0 && p.wave > 0 && !persist.achievements.gamerUnlock) showGamerShop();
    }
    if (state.waveBreather > 0) state.waveBreather--;
    if (state.hordeWave && state.hordeTimer > 0) state.hordeTimer--;
    // Horde wave ends when timer expires OR kill quota met (handled by wave advance check above)

    // Bounty system: random marked enemy, scales 1-2% chance per wave check
    if (state.frame % 300 === 0 && !state.bountyTarget && state.enemies.length > 0 && p.kills >= 5) {
        const bloodhoundMult = (p.pet === 'dog' && petBranchIs(3, 0, 0) && p.petEvolveLevel >= 1) ? 1.5 + Math.max(0, p.petEvolveLevel - 3) * 0.1 : 1;
        const bountyChance = Math.min(0.04, (0.01 + p.wave * 0.001) * bloodhoundMult);
        if (Math.random() < bountyChance) {
            const eligible = state.enemies.filter(e => !e.isBoss && !e.isShadowDemon && !e.isMini);
            if (eligible.length > 0) {
                state.bountyTarget = eligible[Math.floor(Math.random() * eligible.length)];
                state.bountyTarget.isBounty = true;
                showNotif('💰 BOUNTY TARGET marked! Kill for big reward!');
            }
        }
    }
    // Clear bounty if target died or no longer in enemies
    if (state.bountyTarget && !state.enemies.includes(state.bountyTarget)) {
        state.bountyTarget = null;
    }

    // Shadow demon: very rare world threat (after 20 kills, ~4% per 5s check)
    if (state.frame % 300 === 0 && !state.shadowDemonActive && !state.bossActive && state.postBossCooldown === 0 && p.kills >= 20) {
        if (Math.random() < 0.04) spawnShadowDemon();
    }

    // Angel: appears when player HP < 10, heals fully and smites nearby foes
    if (state.angelCooldown > 0) state.angelCooldown--;
    if (state.angelTimer > 0) state.angelTimer--;
    if (p.hp > 0 && p.hp < 10 && state.angelCooldown === 0 && Math.random() < 0.03) {
        p.hp = p.maxHp;
        state.angelTimer = 160;
        state.angelCooldown = 18000;
        state.runAngelHeals++;
        let smited = 0;
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - p.x, e.y - p.y) < 260 && !e.isBoss && !e.isShadowDemon) {
                e.hp = -9999; createExplosion(e.x, e.y, '#ffd700'); smited++;
            }
        });
        for (let i = 0; i < 24; i++) {
            const ga = Math.random() * Math.PI * 2;
            state.particles.push({ x: p.x + Math.cos(ga)*40, y: p.y + Math.sin(ga)*40, vx: Math.cos(ga)*4, vy: Math.sin(ga)*4 - 2, life: 80, color: '#ffd700' });
        }
        showNotif('An Angel descended! Healed!' + (smited > 0 ? ' ' + smited + ' foes smited!' : ''));
    }

    // ─── PET ABILITIES ───
    if (p.pet) {
        const el2 = p.petEvolveLevel; const dt = Math.max(0, el2 - 3);

        // DOG: gold magnetism handled in gold section; Guard Dog bark (branch 2)
        if (p.pet === 'dog' && petBranchIs(2, 0, 0) && el2 >= 1 && state.frame % 180 === 0) {
            const barkDmg = 20 + dt * 10;
            const barkRadius = 80 + dt * 5;
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - p.x, e.y - p.y) < barkRadius) {
                    e.hp -= barkDmg;
                    if (dt >= 2) { const kd = Math.hypot(e.x-p.x,e.y-p.y)||1; e.x += (e.x-p.x)/kd*8; e.y += (e.y-p.y)/kd*8; }
                    if (dt >= 4) { e.wolfSlowed = 60; }
                    createExplosion(e.x, e.y, '#c8a050');
                }
            });
        }
        // DOG: Bloodhound — bounty chance handled in bounty section

        // CAT: base dodge + evolution handled in enemy projectile section

        // CHICKEN: egg laying
        if (p.pet === 'chicken') {
            p.chickenTimer--;
            if (p.chickenTimer <= 0) {
                p.chickenTimer = Math.max(80, 300 - dt * 25);
                state.eggs.push({ x: p.x, y: p.y, timer: Math.max(60, 180 - dt * 20), branch: p.petBranch[0], deepTier: dt });
            }
        }

        // SNAKE: passive poison aura
        if (p.pet === 'snake' && state.frame % 60 === 0) {
            const snakeRadius = 60 + dt * 8;
            const snakeDmg = 3 + (petBranchIs(1, 0, 0) ? dt * 3 : 0);
            const snakeDur = 180 + (petBranchIs(1, 0, 0) ? dt * 40 : 0);
            let snakeHits = 0;
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - p.x, e.y - p.y) < snakeRadius) {
                    if (!e.poisoned) snakeHits++;
                    e.poisoned = true; e.poisonDmg = Math.max(e.poisonDmg||0, snakeDmg); e.poisonTimer = snakeDur;
                }
            });
            if (snakeHits > 0) addPetAction(snakeHits); // snake: track new poisonings
            // Constrictor path: slow aura (branch 3)
            if (petBranchIs(3, 0, 0) && el2 >= 1) {
                const slowR = 80 + dt * 15;
                state.enemies.forEach(e => {
                    if (Math.hypot(e.x - p.x, e.y - p.y) < slowR) e.wolfSlowed = 30;
                });
            }
            // Cobra path: spit venom projectile (branch 2)
            if (petBranchIs(2, 0, 0) && state.frame % 180 === 0 && state.enemies.length > 0) {
                let closest = null, md = Infinity;
                state.enemies.forEach(e => { const d = Math.hypot(e.x-p.x,e.y-p.y); if (d < md) { md = d; closest = e; } });
                if (closest) {
                    const cnt = dt >= 2 ? 2 : dt >= 5 ? 4 : 1;
                    for (let vi = 0; vi < cnt; vi++) {
                        const va = Math.atan2(closest.y-p.y, closest.x-p.x) + (vi - Math.floor(cnt/2)) * 0.25;
                        state.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(va)*5, vy: Math.sin(va)*5, damage: 20 + dt*6, life: 60, type: 'magic', homing: false });
                    }
                }
            }
        }

        // BIRD: Windstorm paths
        if (p.pet === 'bird') {
            if (!state.birdVortexes) state.birdVortexes = [];
            // Path 1: Vortex — periodic vortexes that pull and damage enemies
            if (petBranchIs(1, 0, 0) && el2 >= 1) {
                if (!p.birdVortexTimer) p.birdVortexTimer = 0;
                p.birdVortexTimer++;
                const vInterval = Math.max(180, 300 - dt * 15);
                if (p.birdVortexTimer >= vInterval) {
                    p.birdVortexTimer = 0;
                    const vRadius = 80 + (p.petBranch[1] === 1 ? dt * 20 : 0);
                    const vLife = 120 + dt * 20 + (p.petBranch[1] === 1 ? dt * 15 : 0);
                    const vDmg = 4 + (p.petBranch[1] === 3 ? dt * 4 : dt);
                    const count = p.petBranch[1] === 2 ? Math.min(2 + Math.floor(dt / 2), 8) : 1;
                    for (let v = 0; v < count; v++) {
                        const a = (v / count) * Math.PI * 2;
                        const ox = count > 1 ? Math.cos(a) * 70 : 0;
                        const oy = count > 1 ? Math.sin(a) * 70 : 0;
                        state.birdVortexes.push({ x: p.x + ox, y: p.y + oy, life: vLife, radius: vRadius, dmg: vDmg, orbiting: count > 1, angle: a });
                    }
                }
                for (let v = state.birdVortexes.length - 1; v >= 0; v--) {
                    const vx = state.birdVortexes[v];
                    if (vx.orbiting) { vx.angle += 0.025; vx.x = p.x + Math.cos(vx.angle) * 70; vx.y = p.y + Math.sin(vx.angle) * 70; }
                    vx.life--;
                    if (vx.life <= 0) { state.birdVortexes.splice(v, 1); continue; }
                    if (state.frame % 10 === 0) createExplosion(vx.x + (Math.random()-0.5)*vx.radius*0.8, vx.y + (Math.random()-0.5)*vx.radius*0.8, '#80c0ff');
                    state.enemies.forEach(e => {
                        const d = Math.hypot(e.x - vx.x, e.y - vx.y);
                        if (d < vx.radius && d > 1) {
                            const pull = Math.min(2.5, (vx.radius / d) * 0.5);
                            e.x += (vx.x - e.x) / d * pull; e.y += (vx.y - e.y) / d * pull;
                            if (state.frame % 30 === 0) { e.hp -= vx.dmg; createExplosion(e.x, e.y, '#60a0ff'); }
                        }
                    });
                }
            }
            // Path 2: Jet Stream — dash collision damage
            if (petBranchIs(2, 3, 0) && el2 >= 4 && p.dashing && state.frame % 5 === 0) {
                const jDmg = 20 + dt * 10;
                state.enemies.forEach(e => {
                    if (Math.hypot(e.x-p.x, e.y-p.y) < 40) {
                        e.hp -= jDmg; const kd = Math.hypot(e.x-p.x,e.y-p.y)||1;
                        e.x += (e.x-p.x)/kd*18; e.y += (e.y-p.y)/kd*18;
                        createExplosion(e.x, e.y, '#80d0ff');
                    }
                });
            }
            // Path 3: Storm — static charge builds up, periodic lightning discharge
            if (petBranchIs(3, 0, 0) && el2 >= 1) {
                if (!p.birdStormTimer) p.birdStormTimer = 0;
                p.birdStormTimer++;
                const chargeR = 150 + dt * 25;
                if (state.frame % 60 === 0) state.enemies.forEach(e => { if (Math.hypot(e.x-p.x,e.y-p.y) < chargeR) e.charged = true; });
                const dischargeRate = p.petBranch[1] === 2 ? Math.max(180, 300 - dt * 20) : Math.max(240, 480 - dt * 20);
                if (p.birdStormTimer >= dischargeRate) {
                    p.birdStormTimer = 0;
                    const dDmg = 30 + dt * 15;
                    let stormStrikes = 0;
                    state.enemies.forEach(e => {
                        if (e.charged) {
                            stormStrikes++;
                            e.hp -= dDmg; e.charged = false; createExplosion(e.x, e.y, '#ffff80');
                            if (p.petBranch[1] === 1) { // Lightning Rod: chain
                                state.enemies.filter(e2 => Math.hypot(e2.x-e.x,e2.y-e.y) < 80 + dt * 10).slice(0, Math.min(1 + Math.floor(dt/2), 4)).forEach(e2 => { e2.hp -= dDmg * 0.6; createExplosion(e2.x, e2.y, '#ffff80'); });
                            }
                            if (p.petBranch[1] === 3) { // Tempest: knockback
                                const kbR = 60 + dt * 15;
                                state.enemies.forEach(e2 => { const d2 = Math.hypot(e2.x-e.x,e2.y-e.y); if (d2 < kbR && d2 > 1) { e2.x += (e2.x-e.x)/d2*20; e2.y += (e2.y-e.y)/d2*20; } });
                            }
                        }
                    });
                    if (stormStrikes > 0) addPetAction(stormStrikes); // bird: track storm strikes
                    showNotif('Storm Discharge!');
                }
            }
        }

        // HAMSTER: hoarder handled in gold section; Wheel Runner path (branch 2)
        if (p.pet === 'hamster' && petBranchIs(2, 0, 0)) {
            if (!p.hamsterMoveTimer) p.hamsterMoveTimer = 0;
            const moving = (state.keys['w']||state.keys['s']||state.keys['a']||state.keys['d']);
            if (moving) { p.hamsterMoveTimer = Math.min(p.hamsterMoveTimer + 1, 180); }
            else { p.hamsterMoveTimer = Math.max(0, p.hamsterMoveTimer - 2); }
            if (p.hamsterMoveTimer >= 180 && !p.hamsterBurst) {
                p.hamsterBurst = 120 + dt * 40;
                showNotif('🐹 Turbo Wheel!');
            }
            if (p.hamsterBurst > 0) {
                p.hamsterBurst--;
                if (dt >= 4 && state.frame % 5 === 0) state.fireTrails.push({ x: p.x, y: p.y, life: 40, damage: 6 });
            }
        }
        // Hamster cheek bomb: init tracker (branch 3)
        if (p.pet === 'hamster' && petBranchIs(3, 0, 0) && el2 >= 1) {
            if (!p.hamsterCheeks) p.hamsterCheeks = 0;
        }

        // TURTLE: iron shell — damage absorption in contact damage section
        // Ancient shell: HP regen (branch 3)
        if (p.pet === 'turtle' && petBranchIs(3, 0, 0) && el2 >= 1) {
            const regenRate = dt <= 1 ? 180 : dt <= 3 ? 90 : dt <= 5 ? 45 : 20;
            if (state.frame % regenRate === 0) p.hp = Math.min(p.maxHp, p.hp + 1);
        }

        // ─── UNLOCKABLE PETS ───
        // UNICORN: passive healing every 5 seconds + sparkle
        if (p.pet === 'unicorn' && state.frame % 300 === 0) {
            p.hp = Math.min(p.maxHp, p.hp + 3);
            for (let k = 0; k < 6; k++) state.particles.push({ x: p.x + (Math.random()-0.5)*24, y: p.y + (Math.random()-0.5)*24, vx: (Math.random()-0.5)*1.5, vy: -Math.random()*2, life: 60, color: '#ff88ff' });
            addPetAction(1);
        }

        // DRAGON: fire breath at nearest enemy every 2 seconds
        if (p.pet === 'dragon') {
            if (!p.dragonBreathTimer) p.dragonBreathTimer = 0;
            p.dragonBreathTimer++;
            if (p.dragonBreathTimer >= 120 && state.enemies.length > 0) {
                p.dragonBreathTimer = 0;
                let closest = null, md = 320;
                state.enemies.forEach(e => { const d = Math.hypot(e.x-p.x,e.y-p.y); if (d < md) { md = d; closest = e; } });
                if (closest) {
                    const ang = Math.atan2(closest.y-p.y, closest.x-p.x);
                    for (let i = 0; i < 5; i++) {
                        const a = ang + (Math.random()-0.5)*0.5;
                        state.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a)*7, vy: Math.sin(a)*7, damage: 22, life: 38, type: 'fire', homing: false });
                    }
                    state.fireTrails.push({ x: p.x, y: p.y, life: 25, damage: 6 });
                    addPetAction(1);
                }
            }
        }

        // BAT: echolocation pulse every 3 seconds — slows + marks nearby enemies
        if (p.pet === 'bat') {
            if (!p.batPulseTimer) p.batPulseTimer = 0;
            p.batPulseTimer++;
            if (p.batPulseTimer >= 180) {
                p.batPulseTimer = 0;
                const batR = 220;
                let hits = 0;
                state.enemies.forEach(e => {
                    if (Math.hypot(e.x-p.x,e.y-p.y) < batR) {
                        e.wolfSlowed = 90;
                        hits++;
                        createExplosion(e.x, e.y, '#9b59b6');
                    }
                });
                if (hits > 0) addPetAction(hits);
            }
        }

        // SCROOGE MCDUCK: gold doubled in gold section; sparkle effect
        if (p.pet === 'scroogeMcduck' && state.frame % 90 === 0 && state.goldPickups.length > 0) {
            addPetAction(1);
        }

        // SPIDER: drops webs near enemies periodically
        if (p.pet === 'spider' && state.frame % 120 === 0) {
            const nearest = state.enemies.reduce((a, e) => (!a || Math.hypot(e.x-p.x,e.y-p.y) < Math.hypot(a.x-p.x,a.y-p.y)) ? e : a, null);
            if (nearest && Math.hypot(nearest.x-p.x,nearest.y-p.y) < 280) {
                state.spiderWebs.push({ x: nearest.x, y: nearest.y, life: 480 });
                addPetAction(1);
            }
        }

        // DINOPAL: baby raptor — lunges at nearest enemy every 2s
        if (p.pet === 'dinopal') {
            if (!p.dinopalTimer) p.dinopalTimer = 0;
            p.dinopalTimer++;
            if (p.dinopalTimer >= 120 && state.enemies.length > 0) {
                p.dinopalTimer = 0;
                let closest = null, md = 300;
                state.enemies.forEach(e => { const d = Math.hypot(e.x-p.x,e.y-p.y); if (d < md) { md = d; closest = e; } });
                if (closest) {
                    closest.hp -= 35; closest.hurtTimer = 8;
                    for (let k = 0; k < 5; k++) createExplosion(closest.x+(Math.random()-0.5)*16, closest.y+(Math.random()-0.5)*16, '#558b2f');
                    addPetAction(1);
                }
            }
        }

        // SHARKY: circles player + chomps nearby enemies every 1.5s
        if (p.pet === 'sharky') {
            if (!p.sharkyAngle) p.sharkyAngle = 0;
            p.sharkyAngle += 0.04;
            if (!p.sharkyTimer) p.sharkyTimer = 0;
            p.sharkyTimer++;
            const sharkX = p.x + Math.cos(p.sharkyAngle) * 60, sharkY = p.y + Math.sin(p.sharkyAngle) * 60;
            // Shark fin trail bubbles
            if (state.frame % 6 === 0) state.particles.push({ x: sharkX, y: sharkY, vx: (Math.random()-0.5)*1.5, vy: -Math.random()*1.5, life: 25, color: 'rgba(100,180,220,0.5)' });
            if (p.sharkyTimer >= 90) {
                p.sharkyTimer = 0;
                let chomped = false;
                state.enemies.forEach(e => { if (Math.hypot(e.x-sharkX,e.y-sharkY) < 40) { e.hp -= 28; e.hurtTimer = 8; createExplosion(e.x, e.y, '#546e7a'); chomped = true; addPetAction(1); } });
                if (chomped) { for (let k = 0; k < 8; k++) state.particles.push({ x: sharkX+(Math.random()-0.5)*20, y: sharkY+(Math.random()-0.5)*20, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 30, color: '#90caf9' }); }
            }
        }

        // LITTLE GUY: alien companion shoots plasma at nearest enemy every 2s
        if (p.pet === 'littleGuy') {
            if (!p.littleGuyTimer) p.littleGuyTimer = 0;
            p.littleGuyTimer++;
            // Glow pulse every 10 frames
            if (state.frame % 10 === 0) state.particles.push({ x: p.x - 36 + (Math.random()-0.5)*10, y: p.y - 10 + (Math.random()-0.5)*10, vx: 0, vy: -0.5, life: 20, color: '#1de9b6' });
            if (p.littleGuyTimer >= 120 && state.enemies.length > 0) {
                p.littleGuyTimer = 0;
                let closest = null, md = 350;
                state.enemies.forEach(e => { const d = Math.hypot(e.x-p.x,e.y-p.y); if (d < md) { md = d; closest = e; } });
                if (closest) {
                    const lgx = p.x - 36, lgy = p.y - 10; // approximate littleGuy orbit position
                    const ang = Math.atan2(closest.y-lgy, closest.x-lgx);
                    state.projectiles.push({ x: lgx, y: lgy, vx: Math.cos(ang)*8, vy: Math.sin(ang)*8, damage: 30, life: 50, type: 'plasma', homing: false });
                    for (let k = 0; k < 6; k++) state.particles.push({ x: lgx+(Math.random()-0.5)*12, y: lgy+(Math.random()-0.5)*12, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 25, color: '#1de9b6' });
                    addPetAction(1);
                }
            }
        }

        // GHOSTY: phases through enemies every 3s, damaging all it passes through + heals player
        if (p.pet === 'ghosty') {
            if (!p.ghostyTimer) p.ghostyTimer = 0;
            p.ghostyTimer++;
            if (p.ghostyTimer >= 180) {
                p.ghostyTimer = 0;
                let hits = 0;
                state.enemies.forEach(e => { if (Math.hypot(e.x-p.x,e.y-p.y) < 180) { e.hp -= 20; hits++; createExplosion(e.x, e.y, '#b3e5fc'); } });
                if (hits > 0) { p.hp = Math.min(p.maxHp, p.hp + hits * 3); addPetAction(hits); }
                for (let k = 0; k < 8; k++) state.particles.push({ x: p.x+(Math.random()-0.5)*30, y: p.y+(Math.random()-0.5)*30, vx: (Math.random()-0.5)*2, vy: -Math.random()*2, life: 50, color: '#e3f2fd' });
            }
        }

        // PHOENIX: firebird — orbits player and erupts in a fire burst every 2s
        if (p.pet === 'phoenix') {
            if (!p.phoenixAngle) p.phoenixAngle = 0;
            p.phoenixAngle += 0.05;
            if (!p.phoenixTimer) p.phoenixTimer = 0;
            p.phoenixTimer++;
            const phx = p.x + Math.cos(p.phoenixAngle) * 50, phy = p.y + Math.sin(p.phoenixAngle) * 50;
            // Constant fire trail
            if (state.frame % 4 === 0) state.particles.push({ x: phx + (Math.random()-0.5)*8, y: phy + (Math.random()-0.5)*8, vx: (Math.random()-0.5)*1.5, vy: -Math.random()*2, life: 28, color: Math.random() > 0.5 ? '#ff6d00' : '#ffcc02' });
            if (p.phoenixTimer >= 120) {
                p.phoenixTimer = 0;
                state.enemies.forEach(e => { if (Math.hypot(e.x-phx,e.y-phy) < 60) { e.hp -= 40; createExplosion(e.x, e.y, '#ff6d00'); } });
                for (let k = 0; k < 6; k++) {
                    const a = (k / 6) * Math.PI * 2;
                    state.projectiles.push({ x: phx, y: phy, vx: Math.cos(a)*5, vy: Math.sin(a)*5, damage: 18, life: 25, type: 'fire', homing: false });
                }
                // Eruption burst at phoenix position
                for (let k = 0; k < 14; k++) createExplosion(phx+(Math.random()-0.5)*20, phy+(Math.random()-0.5)*20, k % 2 === 0 ? '#ff6d00' : '#ffcc02');
                addPetAction(1);
            }
        }
    }

    // Wolf slow effect tick
    state.enemies.forEach(e => { if (e.wolfSlowed > 0) e.wolfSlowed--; });

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

    if (state.notifTimer > 0) { state.notifTimer--; if (state.notifTimer === 0) document.getElementById('notification').classList.add('hidden'); }

    document.getElementById('hp-val').innerText = Math.max(0, Math.round(p.hp));
    document.getElementById('gold-val').innerText = (p.gold || 0).toLocaleString();
    // Day count shown on canvas clock — no DOM element needed
    const _wqTotal = state.waveEnemiesTotal || 0;
    const _wqQuota = _wqTotal > 0 ? Math.ceil(_wqTotal * 0.75) : 0;
    const _wqKills = _wqQuota > 0 ? Math.min(state.waveEnemiesKilled || 0, _wqQuota) : 0;
    document.getElementById('wave-val').innerText = p.wave + (_wqQuota > 0 ? ' (' + _wqKills + '/' + _wqQuota + ')' : '');
    document.getElementById('kills-val').innerText = p.kills;
    // Wood HUD — show/hide based on possession
    const pwEl = document.getElementById('pinewood-box');
    const rwEl = document.getElementById('redwood-box');
    if (pwEl) { pwEl.style.display = p.pineWood > 0 ? '' : 'none'; document.getElementById('pinewood-val').innerText = p.pineWood; }
    if (rwEl) { rwEl.style.display = p.redWood > 0 ? '' : 'none'; document.getElementById('redwood-val').innerText = p.redWood; }
    const torchEl = document.getElementById('torch-box');
    if (torchEl) {
        torchEl.style.display = p.torchTimer > 0 ? '' : 'none';
        const torchSec = Math.ceil(p.torchTimer / 60);
        document.getElementById('torch-val').innerText = torchSec + 's';
        torchEl.style.color = torchSec <= 10 ? '#ff5252' : '';
    }
    const bonesEl = document.getElementById('bones-box');
    if (bonesEl) { bonesEl.style.display = (p.bones || 0) > 0 ? '' : 'none'; document.getElementById('bones-val').innerText = p.bones || 0; }

    if (p.streakTimer > 0) { p.streakTimer--; if (p.streakTimer <= 0) { p.streak = 0; p.streakMult = 1; } }

    // Boss HP bar (HTML element — show and update when boss is active)
    const bossBarEl = document.getElementById('boss-bar');
    const activeBoss = state.enemies.find(e => e.isBoss && !e.isShadowDemon);
    if (state.bossActive && activeBoss) {
        const BOSS_LABELS = {
            troll: 'TROLL KING', wraith: 'WRAITH LORD', golem: 'STONE GOLEM', demon: 'ARCH DEMON',
            imp: 'IMP OVERLORD', vampire: 'VAMPIRE LORD', spider: 'BROOD QUEEN',
            necromancer: 'LICH NECROMANCER', wizard: 'GRAND WIZARD', skeleton: 'SKELETON KING',
            slime: 'KING SLIME', grimReaper: 'THE GRIM REAPER',
            trexBoss: 'T-REX KING', megalodon: 'THE MEGALODON', alienQueen: 'ALIEN QUEEN',
        };
        const label = BOSS_LABELS[activeBoss.type] || activeBoss.type.toUpperCase();
        const hpFrac = Math.max(0, activeBoss.hp / (activeBoss.maxHp || 1)) * 100;
        bossBarEl.classList.remove('hidden');
        document.getElementById('boss-bar-label').innerText = label;
        document.getElementById('boss-bar-fill').style.width = hpFrac.toFixed(1) + '%';
    } else {
        bossBarEl.classList.add('hidden');
    }
}

function endGame() {
    // Wizard trial: count as a fail if still active
    if (state.wizardTrialActive) {
        persist.wizardAttempts = (persist.wizardAttempts || 0) + 1;
        savePersist(persist);
        state.wizardTrialActive = false;
    }
    state.gameOver = true;
    document.getElementById('right-panel').classList.add('hidden');
    const p = state.player;
    // Bob unlock: lose 10 runs
    persist.totalLosses = (persist.totalLosses || 0) + 1;
    if (persist.totalLosses >= 10 && !persist.achievements.bobUnlock) grantAchievement('bobUnlock');
    // Baby unlock: die within first 30 seconds of a run
    if ((Date.now() - (state.runStartTime || Date.now())) < 30000 && !persist.achievements.babyUnlock) grantAchievement('babyUnlock');
    // Cowboy unlock: complete a Hard difficulty run (surviving long enough = wave >= 5)
    if (state.difficulty === 'hard' && (p.wave || 1) >= 5 && !persist.achievements.cowboyUnlock) grantAchievement('cowboyUnlock');
    // Kool Kat unlock: finished a run as Bob with a max-level cat pet (petEvolveLevel >= 10)
    if (p.character === 'bob' && p.pet === 'cat' && (p.petEvolveLevel || 0) >= 10 && !persist.achievements.koolKatUnlock) grantAchievement('koolKatUnlock');
    // Commander unlock: finish your first run (any character)
    if (!persist.achievements.commanderUnlock) grantAchievement('commanderUnlock');
    // Astronaut unlock: finish a run as Alien without killing any human explorers
    if (p.character === 'alien' && (p.humanKillsThisRun || 0) === 0 && !persist.achievements.astronautUnlock)
        grantAchievement('astronautUnlock');
    // Pirate unlock: 10 bones + 20 croc kills + 1 shark kill + 100k gold in one run
    {
        const pr = persist.pirateRun || {};
        if (!persist.achievements.pirateUnlock &&
            (p.bones || 0) >= 10 && (pr.crocKills || 0) >= 20 &&
            (pr.sharkKills || 0) >= 1 && (p.totalGoldEarned || 0) >= 100000)
            grantAchievement('pirateUnlock');
        persist.pirateRun = { bones: 0, crocKills: 0, sharkKills: 0 }; // reset for next run
    }
    // Sailor unlock: die in biggest lake as Knight after 30s in each of the top 2 biggest lakes
    if (p.character === 'knight' && (p.lakeSec1 || 0) >= 30 && (p.lakeSec2 || 0) >= 30 && lakes.length >= 1) {
        const sortedLakes = [...lakes].sort((a, b) => b.size - a.size);
        const lake1 = sortedLakes[0];
        const inBiggestLake = Math.hypot(p.x - lake1.cx, p.y - lake1.cy) < Math.sqrt(lake1.size) * TILE * 0.6;
        if (inBiggestLake && isOnWater(p.x, p.y) && !persist.achievements.sailorUnlock)
            grantAchievement('sailorUnlock');
    }
    const day = state.dayNight.dayCount;
    // 40% of run gold goes to lifetime pool
    const runGoldContrib = Math.round((p.totalGoldEarned || 0) * 0.4);
    persist.lifetimeGold = (persist.lifetimeGold || 0) + runGoldContrib;
    // Check gold achievements at end of run
    if (!persist.achievements.millionaire && persist.lifetimeGold >= 1e6) grantAchievement('millionaire');
    if (!persist.achievements.mrBeast && persist.lifetimeGold >= 1e9) grantAchievement('mrBeast');
    if (!persist.achievements.richestMan && persist.lifetimeGold >= 1e12) grantAchievement('richestMan');
    // DinoKing: die to a croc as Fat after killing 30+ crocs total
    if (state.killedByCroc && p.character === 'fat' && (persist.fatCrocKills || 0) >= 30) {
        if (!persist.achievements.dinoKing) grantAchievement('dinoKing');
    }
    // Paleontologist fossil: if dinosaur dies, save fossil position for next run
    if (p.character === 'dinosaur') {
        persist.fossilPos = { x: Math.round(p.x), y: Math.round(p.y) };
        savePersist(persist);
    }
    // Dragon ritual: die to salamander as dinosaur after standing in lava AND getting hit by a croc in lava
    if (state.killedBySalamander && p.character === 'dinosaur' && state.dragonRitualInLava && state.dragonRitualCrocHit) {
        if (!persist.unlockedCharacters.includes('dragon')) {
            persist.unlockedCharacters.push('dragon');
            showNotif('DRAGON UNLOCKED! The ritual is complete!');
        }
    }
    // Rich character: unlock at 10M lifetime gold
    if (!persist.unlockedCharacters.includes('rich') && persist.lifetimeGold >= 10_000_000) {
        persist.unlockedCharacters.push('rich');
        showNotif('RICH UNLOCKED! 10,000,000 lifetime gold earned!');
    }
    // Run History: track last 10 runs
    if (!persist.runHistory) persist.runHistory = [];
    persist.runHistory.unshift({
        character: p.character || 'knight',
        day: day,
        wave: p.wave || 1,
        kills: p.kills || 0,
        bossesKilled: p.bossesKilled || 0,
        difficulty: state.difficulty || 'normal',
        gold: p.totalGoldEarned || 0,
        date: new Date().toLocaleDateString()
    });
    if (persist.runHistory.length > 10) persist.runHistory.length = 10;
    // Update persist
    persist.lifetimeKills = (persist.lifetimeKills || 0); // already tracked per kill
    persist.totalRuns = (persist.totalRuns || 0) + 1;
    const newBest = !persist.bestDay || day > persist.bestDay;
    if (newBest) persist.bestDay = day;
    const newBestWave = p.wave > (persist.bestWave || 0);
    if (newBestWave) persist.bestWave = p.wave;
    savePersist(persist);
    // Death transition: red hold → fade to black → pixelated overlay reveal
    (function runDeathTransition() {
        const dc = document.getElementById('death-canvas');
        const overlayEl = document.getElementById('overlay');
        const pixTile = document.getElementById('pix-tile');
        const pixMorph = document.getElementById('pix-morph');
        if (!dc || !pixTile) { overlayEl.classList.remove('hidden'); return; }
        dc.width = 800; dc.height = 600;
        dc.style.display = 'block';
        dc.style.opacity = '1';
        const dtx = dc.getContext('2d');
        let phase = 0; // 0=red, 1=fade-to-black, 2=pixelate-in
        let tick = 0;
        const RED_HOLD = 22;   // ~370ms
        const FADE_TICKS = 30; // ~500ms
        // Block sizes: large (blocky) → 1 (full clarity)
        const PIX_STEPS = [32, 24, 16, 12, 8, 6, 4, 3, 2, 1];
        const PIX_HOLD = 7; // frames per step
        let pixIdx = 0;

        function setPixel(bs) {
            pixTile.setAttribute('width', bs);
            pixTile.setAttribute('height', bs);
            pixMorph.setAttribute('radius', Math.max(0, Math.floor(bs / 2) - 1));
            overlayEl.style.filter = bs > 1 ? 'url(#pix-filter)' : '';
        }

        function step() {
            tick++;
            if (phase === 0) {
                // Red hold — canvas solid red
                dtx.fillStyle = '#cc0000'; dtx.fillRect(0, 0, 800, 600);
                if (tick >= RED_HOLD) { phase = 1; tick = 0; }
            } else if (phase === 1) {
                // Fade canvas from red to black
                const t = tick / FADE_TICKS;
                const rv = Math.round(204 * (1 - t));
                dtx.fillStyle = `rgb(${rv},0,0)`; dtx.fillRect(0, 0, 800, 600);
                if (tick >= FADE_TICKS) {
                    phase = 2; tick = 0; pixIdx = 0;
                    dtx.fillStyle = '#000'; dtx.fillRect(0, 0, 800, 600);
                    // Show overlay (canvas still covers it with black)
                    overlayEl.classList.remove('hidden');
                    setPixel(PIX_STEPS[0]);
                }
            } else if (phase === 2) {
                // Each step: decrease block size (overlay gets sharper), fade canvas out
                if (tick === 1) setPixel(PIX_STEPS[pixIdx]);
                // Canvas fades out as we progress through pixel steps
                const progress = pixIdx / PIX_STEPS.length;
                dc.style.opacity = String(Math.max(0, 1 - progress));
                dtx.fillStyle = '#000'; dtx.fillRect(0, 0, 800, 600);
                if (tick >= PIX_HOLD) {
                    tick = 0; pixIdx++;
                    if (pixIdx >= PIX_STEPS.length) {
                        overlayEl.style.filter = '';
                        dc.style.display = 'none';
                        return;
                    }
                }
            }
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    })();
    document.getElementById('overlay-stats').innerHTML =
        'Day: <b>' + day + '</b> &nbsp;|&nbsp; Kills: ' + p.kills +
        ' &nbsp;|&nbsp; Wave: ' + p.wave + ' &nbsp;|&nbsp; Bosses: ' + p.bossesKilled +
        '<br><span style="color:#ffd700;font-size:10px">+' + runGoldContrib.toLocaleString() + ' lifetime gold (40% of run earnings)</span>';
    const _waveRecord = newBestWave ? ' | ★ Best Wave: ' + p.wave + '!' : ' | Best Wave: ' + (persist.bestWave || p.wave);
    document.getElementById('high-score-stats').innerText = newBest
        ? '★ NEW BEST! Day ' + day + ' reached!' + _waveRecord
        : 'Best Run: Day ' + persist.bestDay + _waveRecord + ' | Runs: ' + persist.totalRuns + ' | Lifetime Gold: ' + (persist.lifetimeGold || 0).toLocaleString();
    // Show achievements earned this run
    const achDiv = document.getElementById('overlay-achievements');
    if (state.achievementsThisRun.length > 0) {
        achDiv.innerHTML = '<div class="ach-run-title">Achievements Unlocked This Run:</div>' +
            state.achievementsThisRun.map(id => {
                const a = ACHIEVEMENTS[id];
                return '<span class="ach-badge">' + a.icon + ' ' + a.name + '</span>';
            }).join('');
    } else {
        const total = Object.keys(persist.achievements).length;
        const max = Object.keys(ACHIEVEMENTS).length;
        achDiv.innerHTML = '<div class="ach-run-title">Achievements: ' + total + ' / ' + max + ' earned</div>';
    }
    // Run History display (skip index 0 = current run)
    const histDiv = document.getElementById('overlay-run-history');
    if (histDiv) {
        const pastRuns = (persist.runHistory || []).slice(1);
        if (pastRuns.length > 0) {
            const _CHAR_ABBREV = {
                paleontologist:'Paleo', astronaut:'Astro', fashionModel:'Model',
                monsterTamer:'Tamer', lumberjack:'Lumber', rubixCuber:'Rubix',
                commander:'Cmdr', scientist:'Sci', koolKat:'KoolKat',
                stickman:'Stickman', librarian:'Librar', youtuber:'YTuber',
                monsterChar:'Monster', oldMan:'OldMan', engineer:'Eng',
            };
            const _diffLabel = { easy: 'EZ', normal: 'NRM', hard: 'HRD', extreme: 'XTR' };
            const _abbr = (s, max) => s.length > max ? s.slice(0, max - 1) + '…' : s;
            histDiv.innerHTML = '<div class="run-hist-title">RECENT RUNS</div>' +
                '<table class="run-hist-table"><thead><tr>' +
                '<th>CHARACTER</th><th>DAY</th><th>WAVE</th><th>KILLS</th><th>BOSSES</th><th>DIFF</th><th>DATE</th>' +
                '</tr></thead><tbody>' +
                pastRuns.slice(0, 9).map(r => {
                    const charDef = CHARACTERS[r.character];
                    const fullName = charDef ? charDef.name : (r.character || 'Knight');
                    const charName = _CHAR_ABBREV[r.character] || fullName;
                    return '<tr>' +
                        '<td class="rh-char">' + _abbr(charName, 10) + '</td>' +
                        '<td class="rh-day">' + (r.day || '?') + '</td>' +
                        '<td class="rh-wave">' + (r.wave || 1) + '</td>' +
                        '<td class="rh-kills">' + (r.kills || 0).toLocaleString() + '</td>' +
                        '<td class="rh-bosses">' + (r.bossesKilled || 0) + '</td>' +
                        '<td class="rh-diff">' + (_diffLabel[r.difficulty] || (r.difficulty || 'NRM').slice(0,3).toUpperCase()) + '</td>' +
                        '<td class="rh-date">' + (r.date || '') + '</td>' +
                        '</tr>';
                }).join('') +
                '</tbody></table>';
        } else {
            histDiv.innerHTML = '';
        }
    }
}

