// ─── COMBAT ───
function playerAttack() {
    if (state.player.attackCooldown > 0) return;
    const wpnKey = state.player.weapon, wpn = ALL_WEAPONS[wpnKey];
    state.player.attacking = true; state.player.attackCooldown = Math.round(wpn.cooldown * (state.player.attackSpeedMult || 1)); state.player.attackCount++;
    // Melee attacks aim toward the mouse cursor (so you can run and attack behind you)
    const _mx = state.mouse.x + state.camera.x, _my = state.mouse.y + state.camera.y;
    const _md = Math.hypot(_mx - state.player.x, _my - state.player.y) || 1;
    const fx = (_mx - state.player.x) / _md;
    const fy = (_my - state.player.y) / _md;
    // Snap sprite facing to attack direction; store exact attack vector for drawAttackEffect
    if (Math.abs(fx) > 0.1) state.player.facingX = fx;
    state.player.atkFX = fx; state.player.atkFY = fy;
    let baseDmg = wpn.damage * (state.player.damageMult || 1);
    // Demon: +40% damage while standing in lava
    if (state.player.charDemon && getTerrainAt(state.player.x, state.player.y) === 'lava') baseDmg *= 1.4;
    const elvl = upgradeLevel('berserker');
    if (hasUpgrade('berserker') && state.player.hp < state.player.maxHp * (0.3 + elvl * 0.1)) baseDmg *= 1.5;
    // Streak bonus damage
    const streak = state.player.streak;
    if (streak >= 40) baseDmg *= 2.5;
    else if (streak >= 20) baseDmg *= 1.5;
    else if (streak >= 10) baseDmg *= 1.2;
    // Fury skill: +5% dmg per 10 kills this wave (max +40%)
    if (state.player.skills?.fury) baseDmg *= 1 + Math.min(0.4, Math.floor((state.player.furyKills||0) / 10) * 0.05);
    const critChance = (hasUpgrade('critStrike') ? 0.25 + upgradeLevel('critStrike') * 0.1 : 0) + (state.player.skillCritChance || 0) + getArmorBonus('skillCritChance');
    const isCrit = Math.random() < critChance;
    if (isCrit) baseDmg *= 2;
    // Mage's Robe bonus damage
    baseDmg *= (1 + getArmorBonus('damagePct'));
    // Weapon upgrade bonus (+20% per tier)
    baseDmg *= (1 + (state.player.weaponUpgrades[wpnKey] || 0) * 0.20);
    // Gamer: combo multiplier (kills build combo, caps at 20x = +80% dmg)
    if (state.player.charGamer && state.player.gamerCombo > 0)
        baseDmg *= 1 + Math.min(state.player.gamerCombo, 20) * 0.04;
    // Shopper: +1% per 1000 gold currently held
    if (state.player.charShopper && state.player.gold > 0)
        baseDmg *= 1 + Math.floor(state.player.gold / 1000) * 0.01;
    // Drain durability per attack — very slowly, only on attack
    drainDurability(wpnKey, wpnKey === 'dagger' || wpnKey === 'serpentFangs' ? 0.8 : 0.4);

    if (wpnKey === 'bow' || wpnKey === 'crossbow' || wpnKey === 'thunderbow') {
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        const afx = (mx - state.player.x) / al, afy = (my - state.player.y) / al;
        const cnt = hasUpgrade('multishot') ? 3 + upgradeLevel('multishot') : 1;
        for (let i = 0; i < cnt; i++) {
            const sp = cnt > 1 ? (i - Math.floor(cnt / 2)) * 0.25 : 0;
            const c = Math.cos(sp), s = Math.sin(sp);
            state.projectiles.push({
                x: state.player.x, y: state.player.y,
                vx: (afx * c - afy * s) * 8, vy: (afx * s + afy * c) * 8,
                damage: baseDmg, life: wpnKey === 'crossbow' ? 50 : 35, type: wpnKey
            });
        }
    } else if (wpnKey === 'magicStaff') {
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        const afx = (mx - state.player.x) / al, afy = (my - state.player.y) / al;
        const cnt = hasUpgrade('multishot') ? 3 + upgradeLevel('multishot') : 1;
        for (let i = 0; i < cnt; i++) {
            state.projectiles.push({
                x: state.player.x, y: state.player.y,
                vx: afx * 5 + (i - 1) * 2, vy: afy * 5, damage: baseDmg, life: 60, type: 'magic', homing: true
            });
        }
    } else if (wpnKey === 'boomerang') {
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        const afx = (mx - state.player.x) / al, afy = (my - state.player.y) / al;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: afx * 7, vy: afy * 7,
            damage: baseDmg, life: 130, type: 'boomerang',
            returning: false, distTraveled: 0, maxDist: wpn.range, piercing: true
        });
    } else if (wpnKey === 'scythe') {
        hitEnemies(state.player.x, state.player.y, wpn.range, baseDmg, isCrit);
    } else if (wpnKey === 'bomb') {
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        const afx = (mx - state.player.x) / al, afy = (my - state.player.y) / al;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: afx * 4, vy: afy * 4,
            damage: baseDmg, life: 50, type: 'bomb'
        });
    } else if (wpnKey === 'doubleSword') {
        hitEnemies(state.player.x + fx * 25, state.player.y + fy * 25, wpn.range, baseDmg, isCrit);
        hitEnemies(state.player.x - fx * 25, state.player.y - fy * 25, wpn.range, baseDmg, isCrit);
    } else if (wpnKey === 'whip') {
        // Chains through all enemies in a wide forward arc
        const ax = fx || 1, ay = fy || 0;
        state.enemies.forEach(e => {
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const dist = Math.hypot(edx, edy);
            if (dist < wpn.range) {
                const dot = (edx / (dist || 1)) * ax + (edy / (dist || 1)) * ay;
                if (dot > -0.3) { // ~107° wide arc forward
                    e.hp -= baseDmg;
                    const rchance = hasUpgrade('reaper') ? 0.02 + upgradeLevel('reaper') * 0.01 : 0;
                    if (Math.random() < rchance) e.hp = 0;
                    if (state.player.streak >= 40 && !e.isBoss && !e.isShadowDemon) e.hp = -9999;
                    createExplosion(e.x, e.y, '#d4a040');
                    if (!e.isBoss) {
                        const kbd = dist || 1;
                        const resist = e.knockbackResist || 0;
                        const bullMult = hasUpgrade('bull') ? 1.5 + upgradeLevel('bull') * 0.3 : 1;
                        e.x += (edx / kbd) * 14 * (1 - resist) * bullMult;
                        e.y += (edy / kbd) * 14 * (1 - resist) * bullMult;
                    }
                    if (hasUpgrade('poisonTouch')) {
                        const dur = 300 + upgradeLevel('poisonTouch') * 60;
                        const pdmg = 5 + upgradeLevel('poisonTouch') * 3;
                        e.poisoned = true; e.poisonTimer = dur; e.poisonDmg = pdmg;
                    }
                    state.damageNumbers.push({ x: e.x + (Math.random() - 0.5) * 16, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
                }
            }
        });
    // ── Fusion weapon attacks ──
    } else if (wpnKey === 'mace') {
        // AOE slam — hits all in large radius
        hitEnemies(state.player.x, state.player.y, wpn.range, baseDmg, isCrit);
        for (let k = 0; k < 8; k++) state.particles.push({ x: state.player.x, y: state.player.y, vx: Math.cos(k*Math.PI/4)*5, vy: Math.sin(k*Math.PI/4)*5, life: 20, color: '#ef9a9a' });
    } else if (wpnKey === 'atomicBomb') {
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        state.projectiles.push({ x: state.player.x, y: state.player.y, vx: (mx-state.player.x)/al*4, vy: (my-state.player.y)/al*4, damage: baseDmg, life: 55, type: 'atomicBomb' });
    } else if (wpnKey === 'poseidonTrident') {
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        const bx = (mx-state.player.x)/al, by = (my-state.player.y)/al;
        for (let b = -1; b <= 1; b++) {
            const ang = Math.atan2(by, bx) + b * 0.3;
            state.projectiles.push({ x: state.player.x, y: state.player.y, vx: Math.cos(ang)*8, vy: Math.sin(ang)*8, damage: baseDmg, life: 45, type: 'waterBolt', bounces: 3 });
        }
    } else if (wpnKey === 'soulReaper') {
        // Melee with lifesteal + execute at 15%
        const p2 = state.player;
        state.enemies.forEach(e => {
            if (Math.hypot(e.x-p2.x, e.y-p2.y) < wpn.range) {
                let d = baseDmg;
                if (e.hp / e.maxHp < 0.15) { e.hp = 0; createExplosion(e.x, e.y, '#ab47bc'); return; }
                e.hp -= d;
                p2.hp = Math.min(p2.maxHp, p2.hp + d * 0.08);
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(d), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'serpentFangs') {
        // Fast strikes that always poison
        state.enemies.forEach(e => {
            if (Math.hypot(e.x-state.player.x, e.y-state.player.y) < wpn.range) {
                e.hp -= baseDmg;
                e.poisoned = true; e.poisonTimer = 360; e.poisonDmg = 8;
                createExplosion(e.x, e.y, '#66bb6a');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'deathScythe') {
        // 360° like scythe but execute at 20% HP
        state.enemies.forEach(e => {
            if (Math.hypot(e.x-state.player.x, e.y-state.player.y) < wpn.range) {
                if (!e.isBoss && e.hp / e.maxHp < 0.20) { e.hp = 0; createExplosion(e.x, e.y, '#fff9c4'); return; }
                e.hp -= baseDmg;
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'chainLightningWhip') {
        // Whip arc then chain 4 more times
        const axw = fx || 1, ayw = fy || 0;
        const hitSet = new Set();
        state.enemies.forEach(e => {
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const dist = Math.hypot(edx, edy);
            if (dist < wpn.range && (edx/(dist||1))*axw + (edy/(dist||1))*ayw > -0.3) {
                e.hp -= baseDmg; hitSet.add(e); createExplosion(e.x, e.y, '#ffee58');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
        // Chain 4 more hops
        let chainSrc = [...hitSet][0];
        for (let ch = 0; ch < 4 && chainSrc; ch++) {
            let next = null, nd = Infinity;
            state.enemies.forEach(e2 => { if (hitSet.has(e2)) return; const d2 = Math.hypot(e2.x-chainSrc.x, e2.y-chainSrc.y); if (d2 < 130 && d2 < nd) { nd = d2; next = e2; } });
            if (!next) break;
            next.hp -= baseDmg * 0.6; hitSet.add(next); chainSrc = next;
            createExplosion(next.x, next.y, '#ffee58'); state.lightningEffects.push({ x: next.x, y: next.y, life: 12 });
            state.damageNumbers.push({ x: next.x, y: next.y - 10, value: Math.round(baseDmg * 0.6), life: 50, vy: -1.5, crit: false });
        }
    } else if (wpnKey === 'dragonBreath') {
        // Charge-up fire breath — handled via mouseHeld in update.js; do nothing here
    } else if (wpnKey === 'hellfireStaff' || wpnKey === 'hellfireTrident') {
        // AoE fire cone in attack direction
        const ax = fx || 1, ay = fy || 0;
        state.enemies.forEach(e => {
            if (e.isTamed) return;
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const dist = Math.hypot(edx, edy);
            const dot = (edx / (dist || 1)) * ax + (edy / (dist || 1)) * ay;
            if (dist < wpn.range && dot > 0.3) {
                const fireDmg = baseDmg * (getTerrainAt(state.player.x, state.player.y) === 'lava' ? 1.6 : 1);
                e.hp -= fireDmg; e.hitFlash = 6;
                createExplosion(e.x, e.y, '#ff6600');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(fireDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'plasmaBlaster') {
        // Piercing energy bolt toward cursor
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        const afx = (mx - state.player.x) / al, afy = (my - state.player.y) / al;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: afx * 11, vy: afy * 11,
            damage: baseDmg, life: 55, type: 'plasma', piercing: true
        });
    } else if (wpnKey === 'enchantedBroom') {
        // 360° sweep — knockback all nearby enemies
        state.enemies.forEach(e => {
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const dist = Math.hypot(edx, edy);
            if (dist < wpn.range) {
                e.hp -= baseDmg; e.hitFlash = 8;
                const kd = dist || 1;
                e.x += (edx / kd) * 30 * (1 - (e.knockbackResist || 0));
                e.y += (edy / kd) * 30 * (1 - (e.knockbackResist || 0));
                createExplosion(e.x, e.y, '#9c27b0');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'shadowBlade') {
        // Triple damage after a dash (shadowBladeActive window)
        const multiplier = state.player.shadowBladeActive ? 3 : 1;
        if (state.player.shadowBladeActive) { state.player.shadowBladeActive = false; createExplosion(state.player.x, state.player.y, '#00e5ff'); }
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < wpn.range) {
                const d = baseDmg * multiplier; e.hp -= d; e.hitFlash = 8;
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(d), life: 50, vy: -1.5, crit: isCrit || multiplier > 1 });
            }
        });
    } else if (wpnKey === 'divineSword') {
        // Melee swing + fires a holy projectile
        hitEnemies(state.player.x + fx * 20, state.player.y + fy * 20, wpn.range, baseDmg, isCrit);
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: fx * 7, vy: fy * 7,
            damage: baseDmg * 0.6, life: 50, type: 'divine'
        });
    } else if (wpnKey === 'monoLaser') {
        // Ranged laser beam toward cursor — piercing
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (mx - state.player.x) / al * 14, vy: (my - state.player.y) / al * 14,
            damage: baseDmg, life: 40, type: 'laser', piercing: true
        });
    } else if (wpnKey === 'harpoonGun') {
        // Pinning harpoon toward cursor — slows and pins for 2s; bonus damage underwater
        if (state.underwater) baseDmg *= 1.5;
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (mx - state.player.x) / al * 9, vy: (my - state.player.y) / al * 9,
            damage: baseDmg, life: 60, type: 'harpoon', pinning: true
        });
    } else if (wpnKey === 'cutlass') {
        // Heavy melee with strong knockback
        state.enemies.forEach(e => {
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const dist = Math.hypot(edx, edy);
            if (dist < wpn.range) {
                e.hp -= baseDmg * 1.2; e.hitFlash = 8;
                const kd = dist || 1;
                e.x += (edx / kd) * 55 * (1 - (e.knockbackResist || 0));
                e.y += (edy / kd) * 55 * (1 - (e.knockbackResist || 0));
                createExplosion(e.x, e.y, '#b0bec5');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg * 1.2), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'ryanAxe') {
        // Wide arc cone hit (90° forward)
        const ax = fx || 1, ay = fy || 0;
        state.enemies.forEach(e => {
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const dist = Math.hypot(edx, edy);
            if (dist < wpn.range) {
                const dot = (edx / (dist || 1)) * ax + (edy / (dist || 1)) * ay;
                if (dot > 0) { // 90° arc forward
                    e.hp -= baseDmg; e.hitFlash = 8;
                    createExplosion(e.x, e.y, '#e53935');
                    state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
                }
            }
        });
    } else if (wpnKey === 'shuriken') {
        // Ranged spinning projectile toward cursor
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (mx - state.player.x) / al * 10, vy: (my - state.player.y) / al * 10,
            damage: baseDmg, life: 45, type: 'shuriken', piercing: true
        });
    } else if (wpnKey === 'chemFlask') {
        // Thrown AoE acid explosion
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (mx - state.player.x) / al * 5, vy: (my - state.player.y) / al * 5,
            damage: baseDmg, life: 55, type: 'flask'
        });
    } else if (wpnKey === 'gameController') {
        // Stun pulse projectile toward cursor
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (mx - state.player.x) / al * 8, vy: (my - state.player.y) / al * 8,
            damage: baseDmg, life: 50, type: 'stunPulse'
        });
    } else if (wpnKey === 'tamingWhip') {
        // Like whip but with taming chance
        const ax2 = fx || 1, ay2 = fy || 0;
        state.enemies.forEach(e => {
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const dist = Math.hypot(edx, edy);
            if (dist < wpn.range) {
                const dot = (edx / (dist || 1)) * ax2 + (edy / (dist || 1)) * ay2;
                if (dot > -0.3) {
                    e.hp -= baseDmg; e.hitFlash = 8;
                    createExplosion(e.x, e.y, '#8d6e63');
                    if (Math.random() < 0.08 && !e.isBoss && !e.isTamed) { e.isTamed = true; e.tamedBy = 'player'; }
                    state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
                }
            }
        });
    } else if (wpnKey === 'fangsWeapon') {
        // Lifesteal melee (15%)
        const p2 = state.player;
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - p2.x, e.y - p2.y) < wpn.range) {
                e.hp -= baseDmg; e.hitFlash = 8;
                p2.hp = Math.min(p2.maxHp, p2.hp + baseDmg * 0.15);
                createExplosion(e.x, e.y, '#880e4f');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'oldManCane') {
        // Melee with 25% stun chance
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < wpn.range) {
                e.hp -= baseDmg; e.hitFlash = 8;
                if (Math.random() < 0.25 && !e.isBoss) { e.stunTimer = 120; e.stunned = true; }
                createExplosion(e.x, e.y, '#9e9e9e');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'goldenSword') {
        // Melee + bonus gold on hit
        const p2 = state.player;
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - p2.x, e.y - p2.y) < wpn.range) {
                e.hp -= baseDmg; e.hitFlash = 8;
                const goldGain = 1 + Math.floor(p2.wave * 0.5);
                p2.gold += goldGain; p2.totalGoldEarned += goldGain;
                state.goldPickups.push({ x: e.x, y: e.y - 10, amount: goldGain, life: 30 });
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'shoppingBag') {
        // Wide swing (larger AoE than sword)
        hitEnemies(state.player.x + fx * 15, state.player.y + fy * 15, wpn.range, baseDmg, isCrit);
    } else if (wpnKey === 'dinnerFork') {
        // Forward thrust (narrow but long)
        const ax = fx || 1, ay = fy || 0;
        state.enemies.forEach(e => {
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const dist = Math.hypot(edx, edy);
            if (dist < wpn.range) {
                const dot = (edx / (dist || 1)) * ax + (edy / (dist || 1)) * ay;
                if (dot > 0.5) { // narrow 60° forward cone
                    e.hp -= baseDmg * 1.3; e.hitFlash = 8;
                    createExplosion(e.x, e.y, '#ffd54f');
                    state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg * 1.3), life: 50, vy: -1.5, crit: isCrit });
                }
            }
        });
    } else if (wpnKey === 'stilettoHeel') {
        // Fast melee with extra crit bonus
        hitEnemies(state.player.x + fx * 18, state.player.y + fy * 18, wpn.range, baseDmg, true); // always crits
    } else if (wpnKey === 'pitchfork') {
        // Wide arc forward + crits launch the pitchfork as a projectile
        const ax = fx || 1, ay = fy || 0;
        state.enemies.forEach(e => {
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const dist = Math.hypot(edx, edy);
            if (dist < wpn.range) {
                const dot = (edx / (dist || 1)) * ax + (edy / (dist || 1)) * ay;
                if (dot > -0.5) { // wide ~120° arc
                    e.hp -= baseDmg; e.hitFlash = 8;
                    createExplosion(e.x, e.y, '#a1887f');
                    state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
                    // Below 25% HP: enemies flee briefly
                    if (e.hp > 0 && e.hp / e.maxHp < 0.25 && !e.isBoss) {
                        e.fleeing = true; e.fleeTimer = 120;
                    }
                }
            }
        });
        if (isCrit) { // launch pitchfork as projectile on crit
            state.projectiles.push({
                x: state.player.x, y: state.player.y,
                vx: ax * 9, vy: ay * 9,
                damage: baseDmg * 0.8, life: 45, type: 'pitchfork', piercing: true
            });
        }
    } else if (wpnKey === 'fishingRod') {
        // Long-range pull: launch hook toward cursor; on hit pulls enemy toward player
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (mx - state.player.x) / al * 10, vy: (my - state.player.y) / al * 10,
            damage: baseDmg, life: 50, type: 'hook', pulling: true
        });
    } else if (wpnKey === 'wrench') {
        // Melee: 2× damage vs bosses; also repairs barricades if adjacent
        const dmgMult = state.enemies.some(e => e.isBoss && Math.hypot(e.x - state.player.x, e.y - state.player.y) < wpn.range) ? 2 : 1;
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < wpn.range) {
                const d = baseDmg * (e.isBoss ? 2 : 1);
                e.hp -= d; e.hitFlash = 8;
                createExplosion(e.x, e.y, '#78909c');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(d), life: 50, vy: -1.5, crit: isCrit });
            }
        });
        // Repair adjacent barricade when G is held (handled in input.js; just deal damage here)
    } else if (wpnKey === 'megaphone') {
        // 3 expanding shockwave rings: knockback + stun + silence + ally buff
        for (let ri = 0; ri < 3; ri++) {
            state.shockwaves.push({
                x: state.player.x, y: state.player.y,
                r: 10 + ri * 15, maxR: 220,
                damage: baseDmg, life: 50, isMegaphone: true, hitSet: new Set(), delay: ri * 6
            });
        }
        if (state.player.pet) state.player.petMegaphoneBuff = 180;
    } else if (wpnKey === 'plasmaCannon') {
        // Piercing plasma bolt toward cursor; bonus vs alien explorers
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        let alienBonus = state.alienExplorers && state.alienExplorers.some(a =>
            Math.hypot(a.x - mx, a.y - my) < 80) ? 1.5 : 1;
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (mx - state.player.x) / al * 12, vy: (my - state.player.y) / al * 12,
            damage: baseDmg * alienBonus, life: 55, type: 'plasma', piercing: true
        });
        // Also hit alien explorers along the path
        if (state.alienWorld && state.alienExplorers) {
            const afx2 = (mx - state.player.x) / al, afy2 = (my - state.player.y) / al;
            state.alienExplorers.forEach(a => {
                const adx = a.x - state.player.x, ady = a.y - state.player.y;
                const proj = adx * afx2 + ady * afy2;
                if (proj > 0 && proj < wpn.range) {
                    const perpDist = Math.abs(adx * afy2 - ady * afx2);
                    if (perpDist < 14) { a.hp -= baseDmg * 1.5; a.hurtTimer = 12; }
                }
            });
        }
    } else if (wpnKey === 'stick') {
        // Very fast melee; hold attack key for 360° spin (spinTimer handled in update/input)
        if (state.player.stickSpin) {
            // Spin mode: 360° hit all nearby
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < wpn.range) {
                    e.hp -= baseDmg; e.hitFlash = 5;
                    createExplosion(e.x, e.y, '#90a4ae');
                    state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 40, vy: -1.5, crit: isCrit });
                }
            });
        } else {
            hitEnemies(state.player.x + fx * 16, state.player.y + fy * 16, wpn.range, baseDmg, isCrit);
        }
    } else if (wpnKey === 'club') {
        // Massive melee damage + 0.5s stun on hit
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < wpn.range) {
                e.hp -= baseDmg; e.hitFlash = 12;
                if (!e.isBoss) { e.stunned = true; e.stunTimer = 30; } // 0.5s @ 60fps
                const edx = e.x - state.player.x, edy = e.y - state.player.y, kd = Math.hypot(edx, edy) || 1;
                e.x += (edx / kd) * 20 * (1 - (e.knockbackResist || 0));
                e.y += (edy / kd) * 20 * (1 - (e.knockbackResist || 0));
                createExplosion(e.x, e.y, '#795548');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'selfieStick') {
        // Wide arc melee + knockback; crits add subscriber gold bonus
        const ax = fx || 1, ay = fy || 0;
        state.enemies.forEach(e => {
            const edx = e.x - state.player.x, edy = e.y - state.player.y;
            const d = Math.hypot(edx, edy);
            if (d < wpn.range) {
                const dot = (edx / (d || 1)) * ax + (edy / (d || 1)) * ay;
                if (dot > -0.3) { // wide ~180° arc
                    e.hp -= baseDmg; e.hitFlash = 8;
                    e.x += (edx / (d || 1)) * 28 * (1 - (e.knockbackResist || 0));
                    e.y += (edy / (d || 1)) * 28 * (1 - (e.knockbackResist || 0));
                    state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
                    if (isCrit && state.player.charYoutuber) {
                        // Subscriber bonus: +1g per 10 kills as free gold
                        const subBonus = Math.floor((state.player.subscribers || 0) / 10);
                        if (subBonus > 0) state.goldPickups.push({ x: e.x, y: e.y, amount: subBonus, life: 120 });
                    }
                }
            }
        });
    } else if (wpnKey === 'koolKatClaws') {
        // Cycles: 0=claws, 1=meow, 2=coolness
        const p = state.player;
        const mode = p.koolKatMode || 0;
        if (mode === 0) {
            // Fast claw slash in forward arc
            state.enemies.forEach(e => {
                const edx = e.x - p.x, edy = e.y - p.y, d = Math.hypot(edx, edy);
                if (d < wpn.range) {
                    const dot = (edx / (d || 1)) * (fx || 1) + (edy / (d || 1)) * (fy || 0);
                    if (dot > 0.2) { e.hp -= baseDmg; e.hitFlash = 6; state.damageNumbers.push({ x: e.x, y: e.y - 8, value: Math.round(baseDmg), life: 40, vy: -1.2, crit: isCrit }); }
                }
            });
        } else if (mode === 1) {
            // Meow: knockback pulse in all directions
            state.enemies.forEach(e => {
                const edx = e.x - p.x, edy = e.y - p.y, d = Math.hypot(edx, edy);
                if (d < 90) {
                    e.hp -= baseDmg * 0.5;
                    e.x += (edx / (d || 1)) * 45 * (1 - (e.knockbackResist || 0));
                    e.y += (edy / (d || 1)) * 45 * (1 - (e.knockbackResist || 0));
                    createExplosion(e.x, e.y, '#f06292');
                }
            });
            showNotif('MEOW!');
        } else {
            // Coolness Effect: AoE — non-boss enemies get deal-with-it sunglasses and become allies for 8s
            let affected = 0;
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - p.x, e.y - p.y) < 120 && !e.isBoss) {
                    if (Math.random() < 0.5) {
                        e.dealWithIt = true; e.isTamed = true; e.tamedTimer = 480;
                        createExplosion(e.x, e.y, '#000'); affected++;
                    }
                }
            });
            showNotif('Coolness Effect! ' + affected + ' enemies: deal with it. 😎');
        }
        p.koolKatMode = (mode + 1) % 3;
    } else if (wpnKey === 'lasso') {
        // Ranged: fire a hook projectile that pulls enemy in and stuns
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (fx || 1) * 10, vy: (fy || 0) * 10,
            life: 22, damage: baseDmg, type: 'hook', pulling: true,
            color: '#a1887f', radius: 6
        });
    } else if (wpnKey === 'revolver') {
        // 6 quick shots; track count; 2s reload
        const p = state.player;
        if ((p.revolverReload || 0) > 0) { showNotif('Reloading... (' + Math.ceil(p.revolverReload / 60) + 's)'); return; }
        p.revolverShots = Math.max(0, (p.revolverShots || 6) - 1);
        state.projectiles.push({
            x: p.x, y: p.y,
            vx: (fx || 1) * 14, vy: (fy || 0) * 14,
            life: 20, damage: baseDmg, type: 'bullet',
            color: '#ffd54f', radius: 4, pierce: false
        });
        if (p.revolverShots <= 0) {
            p.revolverReload = 120; // 2s at 60fps
            p.revolverShots = 6;
            showNotif('Click! Reloading...');
        }
    } else if (wpnKey === 'mop') {
        // Melee hit + spawn slippery patch at player position
        hitEnemies(state.player.x + fx * 16, state.player.y + fy * 16, wpn.range, baseDmg, isCrit);
        state.slipperyPatches = state.slipperyPatches || [];
        state.slipperyPatches.push({ x: state.player.x, y: state.player.y, life: 300, radius: 30 });
        // Water splash visual
        createExplosion(state.player.x + fx * 16, state.player.y + fy * 16, '#29b6f6');
        for (let k = 0; k < 6; k++) state.particles.push({ x: state.player.x + (Math.random()-0.5)*20, y: state.player.y + (Math.random()-0.5)*20, vx: (Math.random()-0.5)*4, vy: -Math.random()*3, life: 28, color: '#b3e5fc' });
    } else if (wpnKey === 'toyMallet') {
        // Low dmg, massive knockback
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < wpn.range) {
                e.hp -= baseDmg; e.hitFlash = 8;
                const edx = e.x - state.player.x, edy = e.y - state.player.y, kd = Math.hypot(edx, edy) || 1;
                e.x += (edx / kd) * 55 * (1 - (e.knockbackResist || 0));
                e.y += (edy / kd) * 55 * (1 - (e.knockbackResist || 0));
                createExplosion(e.x, e.y, '#ff8a65');
                state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
            }
        });
    } else if (wpnKey === 'cubeBomb') {
        // Throw a cube projectile; on hit/expire it explodes in colorful AoE with stun
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (fx || 1) * 8, vy: (fy || 0) * 8,
            life: 28, damage: 0, type: 'cubeBomb',
            color: '#ff1744', radius: 8,
            cubeDamage: baseDmg
        });
    } else if (wpnKey === 'fossilStaff') {
        // Fire a bone projectile that damages enemies it passes through
        state.projectiles.push({
            x: state.player.x, y: state.player.y,
            vx: (fx || 1) * 11, vy: (fy || 0) * 11,
            life: 22, damage: baseDmg, type: 'bone',
            color: '#e0d5b5', radius: 5, pierce: true
        });
    } else if (wpnKey === 'balloonSword') {
        // Low-dmg melee that bounces enemies; pops near lava for AoE stun
        const nearLava = getTerrainAt(state.player.x, state.player.y) === 'lava' ||
            [-32,0,32].some(ox => [-32,0,32].some(oy => getTerrainAt(state.player.x+ox, state.player.y+oy) === 'lava'));
        if (nearLava) {
            // Pop: AoE stun all nearby
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < 100) {
                    if (!e.isBoss) { e.stunned = true; e.stunTimer = 90; }
                    createExplosion(e.x, e.y, '#f06292');
                }
            });
            showNotif('POP! Balloon burst near lava — AoE stun!');
        } else {
            state.enemies.forEach(e => {
                if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < wpn.range) {
                    e.hp -= baseDmg; e.hitFlash = 8;
                    const edx = e.x - state.player.x, edy = e.y - state.player.y, kd = Math.hypot(edx, edy) || 1;
                    e.x += (edx / kd) * 40 * (1 - (e.knockbackResist || 0)); // big bounce
                    e.y += (edy / kd) * 40 * (1 - (e.knockbackResist || 0));
                    createExplosion(e.x, e.y, '#f06292');
                    state.damageNumbers.push({ x: e.x, y: e.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
                }
            });
        }
    } else {
        hitEnemies(state.player.x + fx * 20, state.player.y + fy * 20, wpn.range, baseDmg, isCrit);
    }

    // Timber knockback (weapon upgrade)
    if (state.player.weaponUpgrades[wpnKey]?.knockback) {
        const attackX = state.player.x + fx * 20, attackY = state.player.y + fy * 20;
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - attackX, e.y - attackY) < (wpn.range || 40) + 10) {
                const kdx = e.x - state.player.x, kdy = e.y - state.player.y, kd = Math.hypot(kdx, kdy) || 1;
                e.x += (kdx/kd) * 40 * (1 - (e.knockbackResist || 0));
                e.y += (kdy/kd) * 40 * (1 - (e.knockbackResist || 0));
            }
        });
    }

    // Chop nearby trees (melee weapons only)
    if (!['bow', 'crossbow', 'thunderbow', 'magicStaff', 'poseidonTrident', 'bomb', 'atomicBomb'].includes(wpnKey)) {
        const attackX = state.player.x + fx * 20, attackY = state.player.y + fy * 20;
        state.trees.forEach(tr => {
            if (Math.hypot(tr.x - attackX, tr.y - attackY) < (wpn.range || 40) + 10) {
                tr.hp--; tr.hurtTimer = 8;
                state.damageNumbers.push({ x: tr.x, y: tr.y - 10, value: 1, life: 40, vy: -1, crit: false });
            }
        });
    }

    if (hasUpgrade('fireSlash')) {
        const mult = 1 + upgradeLevel('fireSlash') * 0.5;
        for (let i = 1; i <= 5; i++) state.fireTrails.push({ x: state.player.x + fx * i * 18, y: state.player.y + fy * i * 18, life: 40, damage: 10 * mult });
    }
    if (hasUpgrade('lightning')) {
        const lvl = upgradeLevel('lightning');
        const freq = Math.max(2, 5 - lvl);
        if (state.player.attackCount % freq === 0) {
            const chains = lvl; // +1 chain per upgrade level (0 = no chain, just AoE)
            const hitSet = new Set();
            // Initial strike: closest enemy in radius
            let first = null, minD = Infinity;
            state.enemies.forEach(en => {
                const d = Math.hypot(en.x - state.player.x, en.y - state.player.y);
                if (d < 150 && d < minD) { minD = d; first = en; }
            });
            if (first) {
                const strikeEnemy = (en, depth) => {
                    if (!en || hitSet.has(en)) return;
                    hitSet.add(en);
                    en.hp -= 40;
                    state.lightningEffects.push({ x: en.x, y: en.y, life: 15 });
                    createExplosion(en.x, en.y, '#88f');
                    if (depth < chains) {
                        // Jump to nearest unhit enemy within 120px
                        let next = null, nd = Infinity;
                        state.enemies.forEach(e2 => {
                            if (hitSet.has(e2)) return;
                            const d2 = Math.hypot(e2.x - en.x, e2.y - en.y);
                            if (d2 < 120 && d2 < nd) { nd = d2; next = e2; }
                        });
                        strikeEnemy(next, depth + 1);
                    }
                };
                strikeEnemy(first, 0);
            }
        }
    }
    if (hasUpgrade('vortex')) {
        const str = 1 + upgradeLevel('vortex') * 0.3;
        state.enemies.forEach(en => {
            const d = Math.hypot(en.x - state.player.x, en.y - state.player.y);
            if (d < 120 && d > 10) { en.x += (state.player.x - en.x) * 3 * str / d; en.y += (state.player.y - en.y) * 3 * str / d; }
        });
    }
    if (hasUpgrade('shadowClone')) state.player.cloneAttackTimer = 10;

    // Alien: fire all other equipped weapon slots simultaneously (3 arms)
    if (state.player.charAlien) {
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        const al = Math.hypot(mx - state.player.x, my - state.player.y) || 1;
        const afx = (mx - state.player.x) / al, afy = (my - state.player.y) / al;
        let extraSlotIdx = 0;
        for (let s = 1; s <= state.player.maxWeaponSlots; s++) {
            const extraKey = state.player.weaponSlots[s];
            if (!extraKey || extraKey === wpnKey) continue;
            const extraWpn = ALL_WEAPONS[extraKey];
            if (!extraWpn || extraKey === 'dragonBreath') continue;
            extraSlotIdx++;
            const extraDmg = extraWpn.damage * (state.player.damageMult || 1);
            // Fan out: alternate left (-) and right (+) spread per extra slot
            const spread = extraSlotIdx % 2 === 1 ? -0.25 : 0.25;
            const cs = Math.cos(spread), sn = Math.sin(spread);
            const sfx = afx * cs - afy * sn, sfy = afx * sn + afy * cs;
            drainDurability(extraKey, 0.4);
            if (extraKey === 'plasmaBlaster') {
                state.projectiles.push({ x: state.player.x, y: state.player.y, vx: sfx * 11, vy: sfy * 11, damage: extraDmg, life: 55, type: 'plasma', piercing: true });
            } else if (extraKey === 'bow' || extraKey === 'crossbow' || extraKey === 'thunderbow') {
                const spd = extraKey === 'crossbow' ? 9 : 8;
                const life = extraKey === 'crossbow' ? 50 : 35;
                state.projectiles.push({ x: state.player.x, y: state.player.y, vx: sfx * spd, vy: sfy * spd, damage: extraDmg, life, type: extraKey });
            } else if (extraKey === 'magicStaff') {
                state.projectiles.push({ x: state.player.x, y: state.player.y, vx: sfx * 5, vy: sfy * 5, damage: extraDmg, life: 60, type: 'magic', homing: true });
            } else {
                // Melee: hit enemies in spread direction
                hitEnemies(state.player.x + sfx * 20, state.player.y + sfy * 20, extraWpn.range * 0.8, extraDmg, false);
            }
        }
    }

    // Hit fish and sharks when underwater (melee range around attack point)
    if (state.underwater) {
        const atkX = state.player.x + fx * 20, atkY = state.player.y + fy * 20;
        const atkRange = Math.min(wpn.range || 40, 50); // cap so ranged weapons don't get screen-wide AoE
        if (state.fish) {
            for (let fi = state.fish.length - 1; fi >= 0; fi--) {
                const f = state.fish[fi];
                if (Math.hypot(f.x - atkX, f.y - atkY) < atkRange) {
                    f.hurtTimer = 8;
                    // Kill fish → heal player
                    state.fish.splice(fi, 1);
                    const heal = f.healAmt || 8;
                    state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
                    createExplosion(f.x, f.y, '#ff9800');
                    state.damageNumbers.push({ x: f.x, y: f.y - 10, value: heal, life: 50, vy: -1.5, crit: false, heal: true });
                }
            }
        }
        if (state.sharks) {
            for (const sh of state.sharks) {
                if (Math.hypot(sh.x - atkX, sh.y - atkY) < atkRange) {
                    sh.hp -= baseDmg; sh.hurtTimer = 10;
                    createExplosion(sh.x, sh.y, '#1565c0');
                    state.damageNumbers.push({ x: sh.x, y: sh.y - 10, value: Math.round(baseDmg), life: 50, vy: -1.5, crit: isCrit });
                }
            }
        }
    }
}

function hitEnemies(cx, cy, range, damage, isCrit = false, isExplosion = false) {
    const p = state.player;
    const effectiveRange = range + (p.attackRangeBonus || 0);
    state.enemies.forEach(e => {
        if (p.charReaper && e.type === 'skeleton') return; // ally skeletons are untouchable
        if (e.isTamed) return; // tamed allies are untouchable
        if (Math.hypot(e.x - cx, e.y - cy) < effectiveRange) {
            // Monster Tamer: 15% chance to tame on hit instead of dealing damage
            if (p.charTamer && !e.isBoss && !e.isShadowDemon && Math.random() < 0.15) {
                e.isTamed = true;
                e.tamedTimer = 600;
                e.hurtTimer = 12;
                persist.lifetimeTames = (persist.lifetimeTames || 0) + 1;
                showNotif('Tamed a ' + e.type + '! (' + persist.lifetimeTames + '/100)');
                if (!persist.unlockedCharacters.includes('monsterChar') && persist.lifetimeTames >= 100) {
                    persist.unlockedCharacters.push('monsterChar');
                    showNotif('MONSTER UNLOCKED! 100 creatures tamed!');
                }
                savePersist(persist);
                return;
            }
            let d = damage;
            // Execute: +80% dmg to low HP enemies
            if (p.skills?.execute && e.maxHp > 0 && e.hp / e.maxHp < 0.15) d *= 1.8;
            // Vampire: day/night damage swing
            if (p.vampDamageMult) d *= p.vampDamageMult;
            // Reaper character: instakill chance
            if (p.charInstakill && !e.isBoss && Math.random() < p.charInstakill) d = e.hp + 1;
            e.hp -= d; e.hitFlash = 6;
            if (isExplosion) e.hitByExplosion = state.frame;
            e.hitByMelee = state.frame; // mark for Speed Demon tracking
            if (p.charBlob) p.blobDamageDealt = (p.blobDamageDealt || 0) + d;
            // Lifesteal (upgrade)
            if (p.lifeStealBonus > 0) p.hp = Math.min(p.maxHp, p.hp + d * p.lifeStealBonus);
            // Lifesteal (vampire character)
            if (p.charLifesteal) p.hp = Math.min(p.maxHp, p.hp + d * p.charLifesteal);
            const rchance = hasUpgrade('reaper') ? 0.02 + upgradeLevel('reaper') * 0.01 : 0;
            if (Math.random() < rchance) e.hp = 0;
            // 40x streak: instant kill non-bosses
            if (state.player.streak >= 40 && !e.isBoss && !e.isShadowDemon) e.hp = -9999;
            createExplosion(e.x, e.y, '#ff3e3e');
            if (!e.isBoss) {
                const kbdx = e.x - cx, kbdy = e.y - cy, kbd = Math.hypot(kbdx, kbdy) || 1;
                const resist = e.knockbackResist || 0;
                const bullMult = hasUpgrade('bull') ? 1.5 + upgradeLevel('bull') * 0.3 : 1;
                const witchMult = p.charKnockbackMelee ? 3.5 : 1;
                e.x += (kbdx / kbd) * 10 * (1 - resist) * bullMult * witchMult;
                e.y += (kbdy / kbd) * 10 * (1 - resist) * bullMult * witchMult;
            }
            if (hasUpgrade('poisonTouch')) {
                const dur = 300 + upgradeLevel('poisonTouch') * 60;
                const pdmg = 5 + upgradeLevel('poisonTouch') * 3;
                e.poisoned = true; e.poisonTimer = dur; e.poisonDmg = pdmg;
            }
            state.damageNumbers.push({ x: e.x + (Math.random() - 0.5) * 16, y: e.y - 10, value: Math.round(d), life: 50, vy: -1.5, crit: isCrit });
        }
    });
}

function tryDash() {
    if (state.player.dashCooldown > 0 || state.player.dashing) return;
    const p = state.player;
    // Pirate: grapple hook replaces dash
    if (p.charGrapple) {
        if (p.grappleCooldown > 0) { showNotif('Grapple on cooldown! (' + Math.ceil(p.grappleCooldown / 60) + 's)'); return; }
        // Pull nearest enemy toward player (or launch player toward cursor if no enemy nearby)
        let target = null; let tDist = 280;
        state.enemies.forEach(e => { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < tDist) { tDist = d; target = e; } });
        if (target) {
            // Pull enemy toward player
            const gdx = p.x - target.x, gdy = p.y - target.y, gd = Math.hypot(gdx, gdy) || 1;
            target.x += (gdx / gd) * Math.min(tDist * 0.7, 120);
            target.y += (gdy / gd) * Math.min(tDist * 0.7, 120);
            createExplosion(target.x, target.y, '#b0bec5');
            state.lightningEffects.push({ x1: p.x, y1: p.y, x2: target.x, y2: target.y, life: 10 });
            showNotif('Grapple!');
        } else {
            // Launch toward cursor
            const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
            const gdx = mx - p.x, gdy = my - p.y, gd = Math.hypot(gdx, gdy) || 1;
            p.x += (gdx / gd) * 80; p.y += (gdy / gd) * 80;
            createExplosion(p.x, p.y, '#b0bec5');
            showNotif('Grapple launch!');
        }
        p.grappleCooldown = 120; // 2s cooldown
        return;
    }
    // Alien: dash teleports to cursor position
    if (p.charAlien) {
        const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
        p.x = mx; p.y = my;
        p.dashCooldown = 45; p.dashing = true; p.dashTimer = 8;
        for (let k = 0; k < 14; k++) state.particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 28, color: 'rgba(80,255,200,0.85)' });
        createExplosion(p.x, p.y, '#40e0d0');
        return;
    }
    const el2 = p.petEvolveLevel; const dt = Math.max(0, el2 - 3); // deep tier index
    // Rabbit Speed path (branch 1): reduced cooldown
    let cooldown = 45;
    if (p.pet === 'rabbit' && petBranchIs(1, 0, 0) && el2 >= 1) cooldown = Math.max(15, 45 - dt * 5);
    // Rabbit Ghost path (branch 3): short invincibility — nerfed: not whole dash, just 0.25-0.6s
    if (p.pet === 'rabbit' && petBranchIs(3, 0, 0) && el2 >= 1) {
        p.rabbitInvTimer = dt <= 1 ? 15 : dt <= 3 ? 25 : dt <= 5 ? 36 : 45;
        if (dt >= 2) {
            for (let k = 0; k < 6; k++) state.particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, life: 30, color: 'rgba(160,255,160,0.6)' });
        }
    }
    p.dashing = true; p.dashTimer = 8; p.dashCooldown = cooldown;
    state._mpDashing = true; // tell host we dashed this frame
    // Ninja: become invisible during dash, trigger post-dash slow
    if (p.charNinja) { p.ninjaInvisible = true; p.ninjaInvisTimer = 55; }
    // Rogue: shadowBlade becomes super-powered for 90 frames after dash
    if (p.charRogue && p.weapon === 'shadowBlade') { p.shadowBladeActive = true; p.shadowBladeTimer = 90; }
    if (p.pet === 'rabbit') addPetAction(1); // rabbit: track dashes
    if (hasUpgrade('shockwave')) {
        const r = 80 + upgradeLevel('shockwave') * 20;
        state.shockwaves.push({ x: p.x, y: p.y, radius: 10, maxRadius: r, damage: 25 });
    }
    // Rabbit Leap path (branch 2): damage enemies along dash path
    if (p.pet === 'rabbit' && petBranchIs(2, 0, 0) && el2 >= 1) {
        const leapDmg = 25 + dt * 15;
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - p.x, e.y - p.y) < 60) {
                e.hp -= leapDmg;
                if (dt >= 2) { state.shockwaves.push({ x: p.x, y: p.y, radius: 10, maxRadius: 60, damage: leapDmg }); }
                createExplosion(e.x, e.y, '#a0ffa0');
            }
        });
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) state.particles.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 20, color });
}

