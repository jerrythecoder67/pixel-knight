// ─── PET ABILITIES ───
function updatePets() {
    const p = state.player;

    if (!p.pet) return;

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
