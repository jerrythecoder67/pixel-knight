// ─── CHARACTER RUNTIME EFFECTS ───
function updateCharacterEffects() {
    const p = state.player;
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
    // Store for use by updatePlayer
    state._playerInWeb = playerInWeb;

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
}
