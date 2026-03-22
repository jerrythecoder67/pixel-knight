// ─── HUD: DOM UPDATES, NOTIFICATION TIMER, BOSS HP BAR ───
function updateHud() {
    const p = state.player;

    // Notification timer
    if (state.notifTimer > 0) { state.notifTimer--; if (state.notifTimer === 0) document.getElementById('notification').classList.add('hidden'); }

    // Core stats
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

    // Torch HUD
    const torchEl = document.getElementById('torch-box');
    if (torchEl) {
        torchEl.style.display = p.torchTimer > 0 ? '' : 'none';
        const torchSec = Math.ceil(p.torchTimer / 60);
        document.getElementById('torch-val').innerText = torchSec + 's';
        torchEl.style.color = torchSec <= 10 ? '#ff5252' : '';
    }

    // Bones HUD
    const bonesEl = document.getElementById('bones-box');
    if (bonesEl) { bonesEl.style.display = (p.bones || 0) > 0 ? '' : 'none'; document.getElementById('bones-val').innerText = p.bones || 0; }

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
