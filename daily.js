// ─── DAILY CHALLENGE SYSTEM ───
// Uses date as a seed so every player gets the same character + pet without a backend.

const DAILY_CHARS = ['knight', 'archer', 'ninja', 'wizard', 'scientist', 'lumberjack',
    'gamer', 'chef', 'caveman', 'robot', 'vampire', 'pirate'];

const DAILY_PETS = ['dog', 'cat', 'chicken', 'rabbit', 'snake', 'bird', 'hamster', 'turtle'];

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
    const petKey  = DAILY_PETS[Math.floor(rng() * DAILY_PETS.length)];
    return { charKey, petKey };
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
    const petData  = PET_TYPES[params.petKey]   || { icon: '🐾', name: params.petKey };

    let prevHtml = '';
    if (alreadyDone) {
        prevHtml = `<div style="font-family:var(--font-pixel);font-size:7px;color:#ffd700;margin-top:10px">
            Today's score: ${prev.score.toLocaleString()} (wave ${prev.wave})
        </div>`;
    }

    const contentEl = document.getElementById('daily-content');
    contentEl.innerHTML = `
        <div style="font-family:var(--font-pixel);font-size:7px;color:#aaa;margin-bottom:12px">${dateKey}</div>
        <div style="display:flex;gap:24px;justify-content:center;align-items:center;margin-bottom:12px">
            <div style="text-align:center">
                <div style="font-family:var(--font-pixel);font-size:7px;color:#aaa;margin-bottom:4px">CHARACTER</div>
                <div style="font-family:var(--font-pixel);font-size:18px">${charData.icon || '⚔'}</div>
                <div style="font-family:var(--font-pixel);font-size:8px;color:#ffd700">${charData.name || params.charKey}</div>
            </div>
            <div style="font-family:var(--font-pixel);font-size:12px;color:#555">+</div>
            <div style="text-align:center">
                <div style="font-family:var(--font-pixel);font-size:7px;color:#aaa;margin-bottom:4px">PET</div>
                <div style="font-family:var(--font-pixel);font-size:18px">${petData.icon || '🐾'}</div>
                <div style="font-family:var(--font-pixel);font-size:8px;color:#69f0ae">${petData.name || params.petKey}</div>
            </div>
        </div>
        ${prevHtml}
        <div style="font-family:var(--font-pixel);font-size:6px;color:#555;margin-top:8px">CLICK TO START</div>
    `;
    contentEl.onclick = () => startDailyChallenge(params);

    document.getElementById('daily-overlay').classList.remove('hidden');
}

function startDailyChallenge(params) {
    document.getElementById('daily-overlay').classList.add('hidden');
    document.getElementById('title-overlay').classList.add('hidden');

    // Set daily flags
    state.isDailyChallenge = true;
    state.dailyParams = params;

    // Set normal difficulty
    const d = DIFFICULTY_SETTINGS['normal'];
    state.difficulty = 'normal';
    state.diffMult = d;
    state.player.maxHp = Math.round(100 * (d.playerHpMult || 1));
    state.player.hp = state.player.maxHp;

    // Force daily character
    persist.selectedCharacter = params.charKey;
    persist.selectedSkin = 'default';
    savePersist(persist);
    state.player.character = params.charKey;

    // Reset pet branching
    state.player.petBranch = [0, 0, 0];
    state.player.petEvolveLevel = 0;

    // Start music, jump straight to game via selectPet (skips all select screens)
    if (typeof _audio !== 'undefined') _audio.startMusic();
    selectPet(params.petKey);
}

function applyDailyModifiers() {
    // No modifiers in the reworked daily system — kept for API compat
}

function updateDailyModifiers() {
    // No per-frame modifier effects in the reworked daily system
}

// ─── Score record ───
function recordDailyScore(score, wave) {
    if (!state.isDailyChallenge) return;
    const dateKey = getDailyDateKey();
    const prev = persist.dailyChallenge;
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
    const charData = CHARACTERS[params.charKey] || { name: params.charKey };
    const petData  = PET_TYPES[params.petKey]   || { name: params.petKey };
    const text = `Pixel Knight Daily Challenge ${prev.date}\nCharacter: ${charData.name} + ${petData.name}\nScore: ${prev.score.toLocaleString()} | Wave ${prev.wave}\n`;
    navigator.clipboard.writeText(text).then(() => showNotif('Score copied to clipboard!'));
}
