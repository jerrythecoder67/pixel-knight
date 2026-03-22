// ─── WAVE ADVANCEMENT, BOSS SPAWNING, HORDE/ELITE WAVES ───
function updateWave() {
    const p = state.player;

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
        // 5% chance per wave: random mid-run event
        if (!state.activeEvent && Math.random() < 0.05) {
            const ev = MID_RUN_EVENTS[Math.floor(Math.random() * MID_RUN_EVENTS.length)];
            const clone = Object.assign({}, ev, { timer: ev.duration });
            state.activeEvent = clone;
            clone.apply(state, p);
            showNotif('EVENT: ' + ev.name + ' — ' + ev.desc, true);
        }
        // Weather: 8% chance per wave to start rain if not already raining
        if (state.weather.stage === 0 && !state.weather.extreme && p.wave >= 5 && Math.random() < 0.08) {
            state.weather.stage = 1;
            state.weather.wavesLeft = 10;
            showNotif('It begins to rain...');
        }
        // Advance weather stage every 3 waves of rain
        if (state.weather.stage > 0 && state.weather.wavesLeft > 0) {
            state.weather.wavesLeft--;
            const wl = state.weather.wavesLeft;
            if (wl === 7) {
            state.weather.stage = 2; showNotif('The rain grows heavier. Fog rolls in.');
            // Spawn fog patches scattered around the world
            state.weather.fogPatches = [];
            const patchCount = 8 + Math.floor(Math.random() * 6);
            for (let _fp = 0; _fp < patchCount; _fp++) {
                state.weather.fogPatches.push({
                    x: 300 + Math.random() * (WORLD_W - 600),
                    y: 300 + Math.random() * (WORLD_H - 600),
                    r: 120 + Math.random() * 160, // radius 120-280px
                    drift: (Math.random() - 0.5) * 0.3, // slow horizontal drift
                });
            }
        }
            else if (wl === 4) { state.weather.stage = 3; showNotif('A storm breaks! Lightning fills the sky.'); }
            else if (wl === 1 && Math.random() < 0.25) {
                // Rare extreme weather at end
                const extreme = WEATHER_EXTREME[Math.floor(Math.random() * WEATHER_EXTREME.length)];
                state.weather.extreme = extreme;
                state.weather.wavesLeft = 2;
                showNotif('EXTREME WEATHER: ' + extreme.name + '!', true);
            } else if (wl === 0) {
                state.weather.stage = 0; state.weather.extreme = null;
                showNotif('The storm passes.');
            }
        }
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
}
