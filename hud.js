// ─── HUD ───
function updateWeaponHUD() {
    const p = state.player;
    if (p.character === 'wizard') {
        // Show rune slots instead of weapon slots
        for (let s = 1; s <= 5; s++) {
            const el = document.getElementById('weapon-' + s);
            if (!el) continue;
            if (s > 4) { el.style.display = 'none'; continue; }
            el.style.display = '';
            const runeKey = p.runeSlots[s];
            if (runeKey && RUNES[runeKey]) {
                const charges = p.runeDurability[runeKey] || 0;
                const maxC = RUNES[runeKey].maxCharges;
                const pct = Math.round((charges / maxC) * 100);
                const col = pct > 60 ? '#40c4ff' : pct > 25 ? '#ff9800' : '#f44336';
                el.innerHTML = s + ': ' + RUNES[runeKey].icon + ' ' + RUNES[runeKey].name +
                    ' <span style="font-size:6px;color:' + col + '">[' + charges + ']</span>' +
                    `<div class="dur-bar-wrap"><div class="dur-bar-fill" style="width:${pct}%;background:${col}"></div></div>`;
                el.className = 'weapon-slot' + (p.mana >= p.maxMana ? ' active' : '');
            } else {
                el.innerHTML = s + ': [empty]';
                el.className = 'weapon-slot locked';
            }
        }
        return;
    }
    for (let s = 1; s <= 5; s++) {
        const el = document.getElementById('weapon-' + s);
        if (!el) continue;
        if (s > p.maxWeaponSlots) { el.style.display = 'none'; continue; }
        el.style.display = '';
        const key = p.weaponSlots[s];
        if (key) {
            const maxDur = ALL_WEAPONS[key]?.maxDurability || 100;
            const dur = Math.max(0, p.weaponDurability[key] ?? maxDur);
            const pct = Math.round((dur / maxDur) * 100);
            const col = pct > 60 ? '#4caf50' : pct > 25 ? '#ff9800' : '#f44336';
            el.innerHTML = s + ': ' + ALL_WEAPONS[key].name +
                `<div class="dur-bar-wrap"><div class="dur-bar-fill" style="width:${pct}%;background:${col}"></div></div>`;
            el.className = 'weapon-slot' + (p.weapon === key ? ' active' : '');
        } else {
            el.innerHTML = s + ': ???';
            el.className = 'weapon-slot locked';
        }
    }
}
function updateOldManHUD() {
    const el = document.getElementById('oldman-hud');
    if (!el) return;
    const p = state.player;
    if (!p.charOldMan) { el.style.display = 'none'; return; }
    el.style.display = '';
    if (p.superOldMan) {
        const secs = Math.ceil(p.superOldManTimer / 60);
        el.innerHTML = `<div style="color:#a78bfa;text-shadow:0 0 6px #a78bfa">[SUPER OLD MAN] ${secs}s</div>`;
    } else {
        const tokens = p.timeTokens || 0;
        const pips = ['○','○','○'].map((_, i) => i < tokens ? '<span style="color:#a78bfa">●</span>' : '<span style="color:#555">○</span>').join(' ');
        el.innerHTML = `<div style="color:#ccc">TIME: ${pips} (${tokens}/3)</div>`;
    }
}

function updateGamerCodesHUD() {
    const el = document.getElementById('gamer-codes-hud');
    if (!el) return;
    const p = state.player;
    if (!p.charGamer) { el.style.display = 'none'; return; }
    el.style.display = '';
    let html = '';
    if (p.gamerActiveCode) {
        const code = GAMER_CODES.find(c => c.id === p.gamerActiveCode);
        const secs = Math.ceil(p.gamerCodeTimer / 60);
        html += `<div style="color:${code?.color||'#fff'};margin-bottom:3px">[ACTIVE] ${p.gamerActiveCode.toUpperCase()}${secs > 0 ? ' ' + secs + 's' : ''}</div>`;
    }
    if (p.gamerInstakill > 0) html += `<div style="color:#f44336;margin-bottom:3px">[INSTAKILL] ${p.gamerInstakill} hit${p.gamerInstakill > 1 ? 's' : ''}</div>`;
    const queue = p.gamerCodes || [];
    if (queue.length > 0) html += `<div style="color:#aaa">QUEUED (V): ${queue.map(id => { const c = GAMER_CODES.find(x=>x.id===id); return c ? `<span style="color:${c.color}">${c.name}</span>` : id; }).join(' · ')}</div>`;
    el.innerHTML = html || '<div style="color:#555">No codes (V)</div>';
}

function updateUpgradesHUD() {
    const el = document.getElementById('upgrades-hud'); el.innerHTML = '';
    state.player.upgrades.forEach(id => {
        const upg = ALL_UPGRADES.find(u => u.id === id);
        const lvl = state.player.upgradeLevels[id] || 0;
        const badge = document.createElement('div');
        badge.className = 'upgrade-badge' + (lvl > 0 ? ' evolved' : '');
        badge.innerText = upg.icon + ' ' + upg.name + (lvl > 0 ? ' Lv.' + (lvl + 1) : '');
        el.appendChild(badge);
    });
}
function showNotif(text, important = false) {
    if (state.upgradeOpen || state.evolveOpen || state.petEvolveOpen || state.gamerShopOpen) return;
    state.notifText = text; state.notifTimer = 140;
    const el = document.getElementById('notification');
    el.classList.remove('hidden');
    el.classList.toggle('notif-important', important);
    document.getElementById('notif-text').innerText = text;
}

