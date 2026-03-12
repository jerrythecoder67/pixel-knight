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

