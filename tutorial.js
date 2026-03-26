// ─── TUTORIAL SYSTEM ───
// Triggered on first launch (persist.tutorialDone falsy).
// Knight character, no pet. Scripted steps walk through core mechanics.

const _TSTEPS = [
    { id: 'welcome',     lines: ['Welcome to', 'PIXEL KNIGHT!'],               sub: 'Looks like you\'re new here.\nGood luck! Press [E] to continue.',             promptKey: 'e'     },
    { id: 'move',        lines: ['Move with', 'WASD'],                          sub: 'Arrow keys work too, no judgment...',                                         promptKey: null    },
    { id: 'attack',      lines: ['Left CLICK', 'to Attack!'],                   sub: 'That slime isn\'t gonna splat itself!',                                       promptKey: 'click' },
    { id: 'kill1',       lines: ['Squish that', 'SLIME!'],                      sub: 'Finish it off!',                                                              promptKey: null    },
    { id: 'wave',        lines: ['Kill ALL', 'the enemies!'],                   sub: 'They just keep coming... deal with it.',                                      promptKey: null    },
    { id: 'gold',        lines: ['Collect', 'the GOLD!'],                       sub: 'Money money money! Grab every last coin.',                                    promptKey: null    },
    { id: 'dash_info',   lines: ['Press SPACE', 'to DASH!'],                   sub: 'Close gaps, dodge attacks, look cool.\nPress [E] to try it!',                 promptKey: 'e'     },
    { id: 'dash_do',     lines: ['DASH through', 'the enemies!'],               sub: 'Press Space — speed is life out here.',                                       promptKey: null    },
    { id: 'streak',      lines: ['Kill fast for', 'a STREAK BONUS!'],           sub: 'Higher streak = more damage. The crowd loves it.\nPress [E] to continue',    promptKey: 'e'     },
    { id: 'barricade',   lines: ['Press G to drop', 'a BARRICADE!'],            sub: 'Let them run into YOU for once. You have 5 wood.',                            promptKey: null    },
    { id: 'skeleton',    lines: ['Press X to', 'summon a SKELETON!'],           sub: 'Finally, some backup. Costs 5 bones.',                                        promptKey: null    },
    { id: 'trees',       lines: ['Chop a TREE', 'for Wood!'],                   sub: 'Attack a tree. Wood = barricades & torches.',                                 promptKey: null    },
    { id: 'night',       lines: ['Night falls.', 'Press F for a TORCH!'],       sub: 'Light it before you become a snack.',                                         promptKey: null    },
    { id: 'upgrade',     lines: ['Open UPGRADES', 'to get stronger!'],          sub: 'Go ahead — treat yourself to something nice!\nClick the UPGRADES button.',    promptKey: null    },
    { id: 'pets',        lines: ['Pick a PET', 'each run!'],                    sub: 'They\'re useful AND adorable. Win-win.\nPress [E] to continue',               promptKey: 'e'     },
    { id: 'weapons',     lines: ['Weapons BREAK.', 'Use the BLACKSMITH!'],      sub: 'Keep them repaired or you\'ll be punching slimes.\nPress [E] to continue',   promptKey: 'e'     },
    { id: 'done',        lines: ['You\'re ready,', 'KNIGHT!'],                  sub: 'Don\'t die too fast out there. Press [E] to start!',                         promptKey: 'e'     },
];

// Completion conditions for play-phase steps (return true to advance)
function _tCheck(id, t) {
    const p = state.player;
    switch (id) {
        case 'move':      return Math.hypot(p.x - t.startX, p.y - t.startY) > 160;
        case 'kill1':     return state.enemies.filter(e => e._tutTag === 'atk').length === 0;
        case 'wave':      return t.waveSpawned && state.enemies.filter(e => e._tutTag === 'wave').length === 0;
        case 'gold':      return p.gold > t.goldBefore;
        case 'dash_do':   return t.dashed;
        case 'barricade': return state.barricades && state.barricades.length > 0;
        case 'skeleton':  return state.skeletonWarriors && state.skeletonWarriors.length > 0;
        case 'trees':     return (p.pineWood || 0) + (p.redWood || 0) > 0;
        case 'night':     return p.torchTimer > 0;
        case 'upgrade':   return t.upgradeOpened;
        default:          return false;
    }
}

// ─── Helpers ───

function _tSpawnEnemy(x, y, tag) {
    const base = ENEMY_TYPES.find(e => e.id === 'slime') || ENEMY_TYPES[0];
    state.enemies.push({
        ...base, type: 'slime',
        x, y, w: 16, h: 16, hp: 35, maxHp: 35,
        speed: 0.7, color: base.color || '#4caf50',
        gold: 15, score: 0,
        sizeScale: 1, animTimer: Math.random() * 100, hurtTimer: 0,
        knockbackResist: 0, dormant: false, waterOnly: false,
        mod: null, shield: 0, maxShield: 0, _hpLastFrame: 0,
        isEnraged: false, isBoss: false, isWaveEnemy: false,
        facingX: 1, facingY: 0, elite: false,
        _tutTag: tag,
    });
}

function _tRestoreDay() {
    state.dayNight.alpha = 0;
    state.dayNight.timer = 0;
    state.dayNight.phase = 'day';
    state.dayNight.eveningShown = false;
}

// ─── Step enter ───

function _tEnterStep(idx) {
    const t = state.tutorial;
    const step = _TSTEPS[idx];
    const p = state.player;

    t.stepIdx = idx;
    t.stepDelay = 0;
    t.pendingStep = -1;
    t.promptPhase = (step.promptKey !== null);
    t._eWasDown = !!state.keys['e'];

    switch (step.id) {
        case 'move':
            t.startX = p.x; t.startY = p.y;
            break;
        case 'attack':
            state.enemies = state.enemies.filter(e => !e._tutTag);
            _tSpawnEnemy(p.x + 90, p.y, 'atk');
            break;
        case 'wave':
            state.enemies = state.enemies.filter(e => !e._tutTag);
            for (let i = 0; i < 5; i++) {
                const ang = (i / 5) * Math.PI * 2;
                _tSpawnEnemy(p.x + Math.cos(ang) * 140, p.y + Math.sin(ang) * 140, 'wave');
            }
            t.waveSpawned = true;
            break;
        case 'gold':
            t.goldBefore = p.gold;
            for (let i = 0; i < 3; i++) {
                state.goldPickups.push({
                    x: p.x + (Math.random() - 0.5) * 80,
                    y: p.y + (Math.random() - 0.5) * 80,
                    amount: 20, life: 1200,
                });
            }
            break;
        case 'dash_do':
            state.enemies = state.enemies.filter(e => !e._tutTag);
            _tSpawnEnemy(p.x + 110, p.y, 'dash');
            _tSpawnEnemy(p.x - 110, p.y, 'dash');
            t.dashed = false;
            break;
        case 'barricade':
            state.barricades = [];
            p.pineWood = Math.max(p.pineWood || 0, 5);
            break;
        case 'skeleton':
            state.skeletonWarriors = [];
            p.bones = Math.max(p.bones || 0, 5);
            break;
        case 'trees': {
            const nearTree = state.trees && state.trees.find(tr => Math.hypot(tr.x - p.x, tr.y - p.y) < 350);
            if (!nearTree) {
                state.trees = state.trees || [];
                state.trees.unshift({ x: p.x + 96, y: p.y - 16, hp: 5, maxHp: 5, hurtTimer: 0 });
            }
            break;
        }
        case 'night':
            state.enemies = state.enemies.filter(e => !e._tutTag);
            state.dayNight.alpha = 0.88;
            state.dayNight.timer = 999999999;
            state.dayNight.phase = 'night';
            break;
        case 'upgrade':
            t.upgradeOpened = false;
            if (p.gold < 100) { p.gold += 100; p.totalGoldEarned = (p.totalGoldEarned || 0) + 100; }
            _tRestoreDay();
            break;
        case 'done':
            state.enemies = state.enemies.filter(e => !e._tutTag);
            _tRestoreDay();
            break;
    }
}

// ─── Advance ───

function _tAdvance() {
    const t = state.tutorial;
    const next = t.stepIdx + 1;
    if (next >= _TSTEPS.length) { _tFinish(); return; }
    // Brief pause between steps before entering the next one
    t.pendingStep = next;
    t.stepDelay = 18; // ~300ms at 60fps
    t.promptPhase = false; // hide current prompt text during delay
}

// ─── Finish ───

function _tFinish() {
    state.enemies = state.enemies.filter(e => !e._tutTag);
    _tRestoreDay();
    persist.tutorialDone = true;
    savePersist(persist);
    canvas.removeEventListener('mousedown', _tClickListener);
    state.tutorial = null;
    state.difficulty = null; // triggers animated menu background in draw()
    state.paused = true;     // stop game logic without triggering game-over overlay
    document.getElementById('right-panel').classList.add('hidden');
    document.getElementById('title-overlay').classList.remove('hidden');
    _audio.startMusic();
}

// Click listener for 'click' prompt steps
function _tClickListener(e) {
    if (e.button !== 0) return;
    const t = state.tutorial;
    if (!t || !t.active || !t.promptPhase) return;
    const step = _TSTEPS[t.stepIdx];
    if (step.promptKey === 'click') _tAdvance();
}

// ─── Update (called every frame from update.js) ───

function updateTutorial() {
    const t = state.tutorial;
    if (!t || !t.active) return;

    // Step transition delay — pause before showing next step
    if (t.stepDelay > 0) {
        t.stepDelay--;
        if (t.stepDelay === 0 && t.pendingStep >= 0) {
            _tEnterStep(t.pendingStep);
        }
        return;
    }

    const step = _TSTEPS[t.stepIdx];

    if (t.promptPhase) {
        if (step.promptKey === 'e') {
            if (state.keys['e'] && !t._eWasDown) {
                t._eWasDown = true;
                _tAdvance();
                return;
            }
            if (!state.keys['e']) t._eWasDown = false;
        }
        return; // game paused during prompt
    }

    // ── Play phase ──
    if (step.id === 'dash_do' && state.player.dashing) t.dashed = true;
    if (step.id === 'upgrade' && state.upgradeOpen) t.upgradeOpened = true;

    if (_tCheck(step.id, t)) _tAdvance();
}

// ─── Draw (called every frame from draw.js) ───

function drawTutorial() {
    const t = state.tutorial;
    if (!t || !t.active) return;

    // Don't draw anything during the between-step delay
    if (t.stepDelay > 0) return;

    const step = _TSTEPS[t.stepIdx];
    const p = state.player;
    const cx = state.camera.x, cy = state.camera.y;

    // Dark overlay during prompt phase
    if (t.promptPhase) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.58)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Text box above player
    const screenX = Math.round(p.x - cx);
    const screenY = Math.round(p.y - cy);
    const boxX = Math.max(10, Math.min(canvas.width - 10, screenX));
    const boxY = Math.max(60, Math.min(canvas.height - 120, screenY - 100));

    ctx.save();
    ctx.textAlign = 'center';

    const lineH = 26;
    const subLines = step.sub ? step.sub.split('\n') : [];
    const totalTextH = step.lines.length * lineH + (subLines.length ? subLines.length * 14 + 8 : 0);
    const boxW = 280;
    const boxH = totalTextH + 24;
    const bx = boxX - boxW / 2;
    const by = boxY - boxH;

    // Box background
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, boxW, boxH, 6) : ctx.rect(bx, by, boxW, boxH);
    ctx.fill();

    // Gold border for prompt, white for play
    ctx.strokeStyle = t.promptPhase ? '#ffd700' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, boxW, boxH, 6) : ctx.rect(bx, by, boxW, boxH);
    ctx.stroke();

    // Main lines
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffffff';
    step.lines.forEach((line, i) => {
        if (line) ctx.fillText(line, boxX, by + 22 + i * lineH);
    });

    // Sub text
    if (subLines.length) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#b0bec5';
        subLines.forEach((sl, i) => {
            ctx.fillText(sl, boxX, by + 22 + step.lines.length * lineH + 6 + i * 14);
        });
    }

    // Small step counter
    ctx.font = '8px monospace';
    ctx.fillStyle = '#546e7a';
    ctx.fillText((t.stepIdx + 1) + ' / ' + _TSTEPS.length, boxX, by + boxH - 4);

    ctx.restore();
}

// ─── Start ───

function startTutorial() {
    const p = state.player;

    // Force knight, normal difficulty
    p.character = 'knight';
    persist.selectedCharacter = 'knight';
    persist.selectedSkin = 'default';
    state.difficulty = 'normal';
    const d = DIFFICULTY_SETTINGS['normal'];
    state.diffMult = d;
    p.maxHp = 999; p.hp = 999; // can't die during tutorial
    p.gold = 0; p.totalGoldEarned = 0;
    state.gameOver = false;

    // Reset world flags (mirrors selectPet)
    p.pet = null;
    p.chickenTimer = 0; p.rabbitInvTimer = 0;
    p.hamsterBurst = 0; p.hamsterMoveTimer = 0; p.hamsterCheeks = 0; p.parrotTimer = 0;
    p.petActionCount = 0; p.petUpgradeReady = false;
    state.sailorWorld = false; state.alienWorld = false;
    state.dinoWorld = false; state.stickWorld = false;
    state.waveAllSpawned = false;
    state.paused = false;
    state.barricades = []; state.skeletonWarriors = [];
    state.shopLocks = {}; state.shopLockedPrices = {};
    state.mapVariant = 'normal';
    state.activeEvent = null; state.currentQuest = null;
    state.dungeonPortal = null; state.dungeon = null;
    state._dailyEnemySpeedMult = 1; state._dailyNoHeal = false; state._dailyGoldMult = 1;
    state._dailyEnemyHpMult = 1; state._dailyBossRush = false; state._dailyNoDash = false;
    state._dailyEternalNight = false; state._dailyGiantEnemies = false;
    state._dailyPoison = false; state._dailyFrenzy = false;
    state.weather = { stage: 0, wavesLeft: 0, extreme: null, rainParticles: [], lightningFlash: 0, tornadoX: WORLD_W/2, tornadoY: WORLD_H/2 };
    state._eclipseActive = false; state._bloodMoonActive = false;
    state._earthquakeActive = false; state._meteorActive = false;
    state._healSpringActive = false; state._frostActive = false;
    state.enemies = []; state.goldPickups = []; state.particles = [];
    state.projectiles = []; state.treasureChests = [];
    state.crocodiles = []; state.salamanders = []; state.fish = []; state.sharks = [];
    state.humanExplorers = []; state.alienExplorers = [];
    state.waveSpawnQueue = [];
    state.isDailyChallenge = false;

    applyCharacterBonuses();
    updateWeaponHUD();
    state.runStartTime = Date.now();
    spawnTrees();

    // Hide all select overlays, show game panel
    ['title-overlay','difficulty-overlay','character-overlay','skin-overlay','pet-overlay',
     'lore-overlay','leaderboard-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    document.getElementById('right-panel').classList.remove('hidden');
    _audio.startMusic();

    // Init tutorial state
    state.tutorial = {
        active: true,
        stepIdx: 0,
        promptPhase: true,
        stepDelay: 0,
        pendingStep: -1,
        _eWasDown: false,
        startX: p.x, startY: p.y,
        waveSpawned: false,
        goldBefore: 0,
        dashed: false,
        upgradeOpened: false,
    };

    // Position camera on player
    state.camera.x = p.x - 400;
    state.camera.y = p.y - 300;

    canvas.addEventListener('mousedown', _tClickListener);
    _tEnterStep(0);
}
