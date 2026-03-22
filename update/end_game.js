// ─── END GAME ───
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
    // Leaderboard — save all runs with score (difficulty-weighted)
    {
        const _dm = { easy: 0.9, normal: 1.0, hard: 1.1, extreme: 1.2 };
        const _dMult = _dm[state.difficulty] || 1.0;
        const _score = Math.round(((p.wave || 1) * 1000 + (p.kills || 0) * 10 + (p.totalGoldEarned || 0) * 0.1) * _dMult);
        if (!persist.leaderboard) persist.leaderboard = [];
        persist.leaderboard.push({
            character: p.character || 'knight',
            wave: p.wave || 1, kills: p.kills || 0,
            gold: p.totalGoldEarned || 0,
            score: _score,
            difficulty: state.difficulty || 'normal',
            date: new Date().toLocaleDateString()
        });
        persist.leaderboard.sort((a, b) => b.score - a.score);
        if (persist.leaderboard.length > 10) persist.leaderboard.length = 10;
    }
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
    // Leaderboard display on game-over screen
    const elDiv = document.getElementById('overlay-endless-lb');
    if (elDiv && persist.leaderboard && persist.leaderboard.length > 0) {
        const _CA2 = { paleontologist:'Paleo', astronaut:'Astro', fashionModel:'Model', monsterTamer:'Tamer', lumberjack:'Lumber', commander:'Cmdr', scientist:'Sci', koolKat:'KoolKat', stickman:'Stick', oldMan:'OldMan', engineer:'Eng', rubixCuber:'Rubix' };
        elDiv.innerHTML = '<div class="lb-title">LEADERBOARD</div>' +
            '<table class="lb-table"><thead><tr><th>#</th><th>CHAR</th><th>SCORE</th><th>WAVE</th><th>KILLS</th><th>DIFF</th><th>DATE</th></tr></thead><tbody>' +
            persist.leaderboard.map((e, i) => {
                const charDef = CHARACTERS[e.character];
                const cName = _CA2[e.character] || (charDef ? charDef.name : (e.character || 'Knight'));
                return '<tr class="' + (i===0?'lb-rank1':'') + '">' +
                    '<td class="lb-rank">#'+(i+1)+'</td>' +
                    '<td class="lb-char">'+cName+'</td>' +
                    '<td class="lb-wave">'+(e.score||0).toLocaleString()+'</td>' +
                    '<td class="lb-kills">'+e.wave+'</td>' +
                    '<td class="lb-gold">'+(e.kills||0).toLocaleString()+'</td>' +
                    '<td class="lb-time">'+(e.difficulty||'normal')+'</td>' +
                    '<td class="lb-date">'+(e.date||'')+'</td></tr>';
            }).join('') + '</tbody></table>';
    } else if (elDiv) {
        elDiv.innerHTML = '';
    }
}
