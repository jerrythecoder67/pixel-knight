// ─── DAILY CHALLENGE SYSTEM ───
// Uses date as a seed so every player gets the same daily parameters without a backend.

const DAILY_CHARS = ['knight', 'archer', 'ninja', 'wizard', 'scientist', 'lumberjack',
    'gamer', 'chef', 'caveman', 'robot', 'vampire', 'pirate'];

const DAILY_MODIFIERS = [
    { id: 'speedBoost',   name: 'Speed Demons',    color: '#ff5722', scoreMult: 0.3,
      desc: 'All enemies move 40% faster.',
      apply: s => { s._dailyEnemySpeedMult = 1.4; } },
    { id: 'noHeal',       name: 'No Healing',       color: '#e91e63', scoreMult: 0.4,
      desc: 'Heart pickups give no HP.',
      apply: s => { s._dailyNoHeal = true; } },
    { id: 'goldRush',     name: 'Gold Rush',        color: '#ffc107', scoreMult: 0.1,
      desc: '3× gold drops, but enemies have 50% more HP.',
      apply: (s, p) => { s._dailyGoldMult = 3; s._dailyEnemyHpMult = 1.5; } },
    { id: 'bossRush',     name: 'Boss Rush',        color: '#b71c1c', scoreMult: 0.5,
      desc: 'A boss spawns every 3 waves.',
      apply: s => { s._dailyBossRush = true; } },
    { id: 'noDash',       name: 'No Dash',          color: '#9c27b0', scoreMult: 0.25,
      desc: 'Dashing is disabled.',
      apply: s => { s._dailyNoDash = true; } },
    { id: 'tiny',         name: 'Tiny Mode',        color: '#00bcd4', scoreMult: 0.15,
      desc: 'You are half size, but 50% faster.',
      apply: (s, p) => { p.sizeScale = (p.sizeScale || 1) * 0.5; p.speed *= 1.5; } },
    { id: 'eternalNight', name: 'Eternal Night',    color: '#263238', scoreMult: 0.2,
      desc: 'Permanent night. Enemies deal 20% more damage.',
      apply: s => { s._dailyEternalNight = true; s.dayNight.alpha = 0.92; s.dayNight.timer = 999999999; } },
    { id: 'giantEnemies', name: 'Giant Enemies',   color: '#4caf50', scoreMult: 0.3,
      desc: 'All enemies are 1.5× size with 50% more HP.',
      apply: s => { s._dailyGiantEnemies = true; } },
    { id: 'poison',       name: 'Poison World',     color: '#8bc34a', scoreMult: 0.25,
      desc: 'You lose 2 HP every 5 seconds.',
      apply: s => { s._dailyPoison = true; } },
    { id: 'frenzy',       name: 'Frenzy',           color: '#ff9800', scoreMult: 0.2,
      desc: '+30% enemy damage, −30% enemy HP.',
      apply: s => { s._dailyFrenzy = true; } },
];

// ─── Seeded RNG (LCG) ───
function _lcgSeed(seed) {
    let s = seed >>> 0;
    return function() {
        s = Math.imul(s, 1664525) + 1013904223 >>> 0;
        return s / 0x100000000;
    };
}

function _dateStr() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function _hashSeed(n) {
    let h = n;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}

function getDailyParams() {
    const seed = _hashSeed(_dateStr());
    const rng = _lcgSeed(seed);

    const charKey = DAILY_CHARS[Math.floor(rng() * DAILY_CHARS.length)];

    // Pick 2 modifiers (no repeats)
    const pool = DAILY_MODIFIERS.slice();
    const mod1 = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const mod2 = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const modifiers = [mod1, mod2];

    const scoreMult = 1.5 + modifiers.reduce((s, m) => s + m.scoreMult, 0);

    const difficulties = ['easy', 'normal', 'hard'];
    const difficulty = difficulties[Math.floor(rng() * difficulties.length)];

    return { charKey, modifiers, scoreMult, difficulty };
}

function getDailyDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Open daily overlay ───
function openDailyOverlay() {
    const params = getDailyParams();
    const dateKey = getDailyDateKey();
    const prev = persist.dailyChallenge;
    const alreadyDone = prev && prev.date === dateKey;

    const charData = CHARACTERS[params.charKey] || { name: params.charKey, icon: '⚔' };

    const multStr = params.scoreMult.toFixed(1) + '×';

    let prevHtml = '';
    if (alreadyDone) {
        prevHtml = `<div style="font-family:var(--font-pixel);font-size:7px;color:#ffd700;margin-bottom:8px">
            Today's score: ${prev.score.toLocaleString()} (wave ${prev.wave})
        </div>`;
    }

    const modHtml = params.modifiers.map(m =>
        `<div style="font-family:var(--font-pixel);font-size:6px;margin:4px 0;padding:4px 10px;border-left:3px solid ${m.color};background:rgba(0,0,0,0.3)">
            <span style="color:${m.color}">${m.name}</span> — ${m.desc}
        </div>`
    ).join('');

    const el = document.getElementById('daily-overlay');
    document.getElementById('daily-content').innerHTML = `
        <div style="font-family:var(--font-pixel);font-size:8px;color:#aaa;margin-bottom:10px">${getDailyDateKey()}</div>
        <div style="font-family:var(--font-pixel);font-size:10px;color:#fff;margin-bottom:8px">
            CHARACTER: <span style="color:#ffd700">${charData.icon || ''} ${charData.name || params.charKey}</span>
        </div>
        <div style="font-family:var(--font-pixel);font-size:7px;color:#aaa;margin-bottom:4px">TODAY'S MODIFIERS:</div>
        ${modHtml}
        <div style="font-family:var(--font-pixel);font-size:7px;color:#69f0ae;margin:10px 0 4px">
            SCORE MULTIPLIER: ${multStr}
        </div>
        ${prevHtml}
    `;

    const startBtn = document.getElementById('daily-start-btn');
    startBtn.textContent = alreadyDone ? 'PLAY AGAIN (score locked)' : 'START DAILY CHALLENGE';
    startBtn.onclick = () => startDailyChallenge(params);

    el.classList.remove('hidden');
}

function startDailyChallenge(params) {
    document.getElementById('daily-overlay').classList.add('hidden');
    document.getElementById('difficulty-overlay').classList.add('hidden');

    // Set daily flags
    state.isDailyChallenge = true;
    state.dailyParams = params;

    // Set difficulty directly (bypass overlay)
    const d = DIFFICULTY_SETTINGS[params.difficulty];
    state.difficulty = params.difficulty;
    state.diffMult = d;
    state.player.maxHp = Math.round(100 * (d.playerHpMult || 1));
    state.player.hp = state.player.maxHp;

    // Force daily character (bypass character select)
    persist.selectedCharacter = params.charKey;
    savePersist(persist);
    state.player.character = params.charKey;

    // Start music, open skin select (player still chooses skin + pet)
    if (typeof _audio !== 'undefined') _audio.startMusic();
    openSkinSelect();
}

function applyDailyModifiers() {
    const params = state.dailyParams;
    if (!params) return;
    const p = state.player;
    params.modifiers.forEach(m => m.apply(state, p));
}

function updateDailyModifiers() {
    if (!state.isDailyChallenge) return;
    const p = state.player;

    // Poison: -2 HP every 5 seconds
    if (state._dailyPoison && state.frame % 300 === 0 && p.hp > 1) {
        p.hp = Math.max(1, p.hp - 2);
    }
    // No heal: cancel any HP over max (hearts give 0 — handled in player.js pickup)
    // Eternal night: maintained via state flag (dayNight timer is already frozen)
}

// ─── Score record ───
function recordDailyScore(score, wave) {
    if (!state.isDailyChallenge) return;
    const dateKey = getDailyDateKey();
    const prev = persist.dailyChallenge;
    // Only update if better score OR new day
    if (!prev || prev.date !== dateKey || score > (prev.score || 0)) {
        persist.dailyChallenge = { date: dateKey, score, wave, completed: true };
        savePersist(persist);
    }
}

// ─── Share score text ───
function shareDailyScore() {
    const prev = persist.dailyChallenge;
    if (!prev) return;
    const params = getDailyParams();
    const modNames = params.modifiers.map(m => m.name).join(' + ');
    const text = `Pixel Knight Daily Challenge ${prev.date}\nScore: ${prev.score.toLocaleString()} | Wave ${prev.wave}\nModifiers: ${modNames}\n`;
    navigator.clipboard.writeText(text).then(() => showNotif('Score copied to clipboard!'));
}
