// ─── PLAYER MOVEMENT, DASH, ATTACKS, PICKUPS, LAVA/WATER DAMAGE ───
function updatePlayer() {
    const p = state.player;
    const playerInWeb = state._playerInWeb || false;

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
        if (p._gamerSpeedBoost) spd *= 3;
        if (p.superOldMan) spd *= 3;
        if (p.dashing) spd *= 3;
        if (p.ninjaSlowTimer > 0) spd *= 0.45; // Ninja post-dash slow
        if (p.isShutdown) spd = 0; // Robot shutdown: can't move
        if (p.vampSpeedMult) spd *= p.vampSpeedMult; // Vampire day/night
        if (playerInWeb && !p.dashing) spd *= 0.3;
        // Weather player speed penalty (not while dashing)
        if (!p.dashing) { const _wsP = state.weather.extreme || (state.weather.stage > 0 ? WEATHER_STAGES[state.weather.stage] : null); if (_wsP) spd *= _wsP.speedMult; }
        if (state._eclipseActive) spd *= 1.3; // eclipse boosts player too
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
        const _nx = p.x + dx * spd, _ny = p.y + dy * spd;
        const _voidX = getTerrainAt(_nx, p.y) === 'void';
        const _voidY = getTerrainAt(p.x, _ny) === 'void';
        if (!_voidX && !_voidY) { p.x = _nx; p.y = _ny; }
        else if (!_voidX) { p.x = _nx; }
        else if (!_voidY) { p.y = _ny; }
        // Challenge zone: lock player inside when active
        if (state.challengeZone && state.challengeZone.active && !state.challengeZone.complete) {
            const cz = state.challengeZone;
            const distCZ = Math.hypot(p.x - cz.x, p.y - cz.y);
            if (distCZ > cz.r - 10) {
                const ang = Math.atan2(p.y - cz.y, p.x - cz.x);
                p.x = cz.x + Math.cos(ang) * (cz.r - 10);
                p.y = cz.y + Math.sin(ang) * (cz.r - 10);
            }
        }
        p.facingX = dx; p.facingY = dy;
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
        // Tick active timed cheat code
        if (p.gamerActiveCode && p.gamerCodeTimer > 0) {
            p.gamerCodeTimer--;
            // GODMODE: keep invincible
            if (p.gamerActiveCode === 'godmode') p.rabbitInvTimer = Math.max(p.rabbitInvTimer || 0, 2);
            // SPEEDHACK: apply speed multiplier (reset each frame)
            if (p.gamerActiveCode === 'speedhack') p._gamerSpeedBoost = true;
            // BIGMODE: apply size + damage
            if (p.gamerActiveCode === 'bigmode') { p._gamerBigMode = true; }
            // AIMBOT: flag checked in combat.js
            if (p.gamerCodeTimer <= 0) {
                const ended = p.gamerActiveCode;
                p.gamerActiveCode = null;
                p._gamerSpeedBoost = false;
                p._gamerBigMode = false;
                showNotif(ended.toUpperCase() + ' ended.');
            }
        } else {
            p._gamerSpeedBoost = false;
            p._gamerBigMode = false;
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

    // Gold pickups
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
    // MP guests skip local gold pickup — host handles it in mpUpdateGuestPlayers() and broadcasts the shared pool
    const _mpGuest = typeof MP !== 'undefined' && MP.active && !MP.isHost;
    for (let i = state.goldPickups.length - 1; i >= 0; i--) {
        const g = state.goldPickups[i]; g.life--;
        const d = Math.hypot(g.x - p.x, g.y - p.y);
        if (d < magR) { const pull = Math.min(goldPullSpeed, magR / d); g.x += (p.x - g.x) / d * pull; g.y += (p.y - g.y) / d * pull; }
        if (d < 20 && !_mpGuest) {
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
            // Daily challenge gold modifier
            if (state._dailyGoldMult && state._dailyGoldMult !== 1) amt = Math.round(amt * state._dailyGoldMult);
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
            if (state._dailyNoHeal) { showNotif('No Healing! (daily modifier)'); state.heartPickups.splice(i, 1); continue; }
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

    // Time tokens (Old Man character)
    for (let i = state.timeTokenPickups.length - 1; i >= 0; i--) {
        const tk = state.timeTokenPickups[i]; tk.life--;
        if (Math.hypot(tk.x - p.x, tk.y - p.y) < 24) {
            p.timeTokens = (p.timeTokens || 0) + 1;
            createExplosion(tk.x, tk.y, '#a78bfa');
            state.timeTokenPickups.splice(i, 1);
            if (p.timeTokens >= 3) {
                p.timeTokens = 0;
                p.superOldMan = true;
                p.superOldManTimer = 300;
                p.hp = Math.min(p.maxHp, p.hp + 50);
                showNotif('SUPER OLD MAN! 5 seconds of power!', true);
                for (let k = 0; k < 10; k++) createExplosion(p.x + (Math.random()-0.5)*50, p.y + (Math.random()-0.5)*50, '#a78bfa');
            } else {
                showNotif('Time Token! (' + p.timeTokens + '/3)');
            }
        } else if (tk.life <= 0) state.timeTokenPickups.splice(i, 1);
    }
    // SUPER OLD MAN timer
    if (p.superOldMan && p.charOldMan) {
        p.superOldManTimer--;
        if (p.superOldManTimer <= 0) {
            p.superOldMan = false;
            showNotif('SUPER OLD MAN faded...');
        }
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

    // Streak timer
    if (p.streakTimer > 0) { p.streakTimer--; if (p.streakTimer <= 0) { p.streak = 0; p.streakMult = 1; } }
}
