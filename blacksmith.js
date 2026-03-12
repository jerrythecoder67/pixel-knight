// ─── BLACKSMITH ───
let _alienEggStep = 0; // 0=idle, 1=A clicked (UFO visible), 2=I clicked (alien visible), 3=done

function _initBsTitleLetters() {
    const wrap = document.getElementById('bs-title-letters');
    if (!wrap) return;
    wrap.innerHTML = '';
    const letters = 'BLACKSMITH';
    letters.split('').forEach((ch, idx) => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.cssText = 'cursor:default;transition:color 0.15s;';
        if (ch === 'A' || ch === 'I') {
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => _bsLetterClick(ch));
            span.addEventListener('mouseenter', () => { span.style.color = '#ffe082'; });
            span.addEventListener('mouseleave', () => { span.style.color = ''; });
        }
        wrap.appendChild(span);
    });
}

function _bsLetterClick(letter) {
    if (persist.unlockedCharacters.includes('alien')) return; // already unlocked
    const gimmick = document.getElementById('bs-alien-gimmick');
    if (letter === 'A' && _alienEggStep === 0) {
        _alienEggStep = 1;
        gimmick.style.height = '38px';
        gimmick.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:38px;font-size:22px;animation:bs-ufo-float 1s ease-in-out infinite alternate;user-select:none;">🛸</div>';
        if (!document.getElementById('bs-ufo-style')) {
            const style = document.createElement('style'); style.id = 'bs-ufo-style';
            style.textContent = '@keyframes bs-ufo-float { from{transform:translateY(-3px)} to{transform:translateY(3px)} }';
            document.head.appendChild(style);
        }
    } else if (letter === 'I' && _alienEggStep === 1) {
        _alienEggStep = 2;
        gimmick.style.height = '38px';
        gimmick.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:12px;height:38px;user-select:none;">' +
            '<span style="font-size:22px;">🛸</span>' +
            '<span id="bs-alien-catch" style="font-size:18px;cursor:pointer;animation:bs-alien-drop 0.5s ease-out forwards;" title="Catch it!">👽</span></div>';
        if (!document.getElementById('bs-alien-style')) {
            const style = document.createElement('style'); style.id = 'bs-alien-style';
            style.textContent = '@keyframes bs-alien-drop { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }';
            document.head.appendChild(style);
        }
        setTimeout(() => {
            const catchEl = document.getElementById('bs-alien-catch');
            if (catchEl) catchEl.addEventListener('click', _catchAlien);
        }, 200);
    }
}

function _catchAlien() {
    if (_alienEggStep !== 2) return;
    _alienEggStep = 3;
    const gimmick = document.getElementById('bs-alien-gimmick');
    if (gimmick) {
        gimmick.style.height = '28px';
        gimmick.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:28px;font-size:10px;color:#80cbc4;white-space:nowrap;letter-spacing:1px;">👽 ALIEN UNLOCKED!</div>';
    }
    persist.unlockedCharacters.push('alien');
    savePersist(persist);
    showNotif('ALIEN UNLOCKED! The visitor has arrived!');
}

function toggleBlacksmith() {
    if (state.upgradeOpen || state.evolveOpen || state.petEvolveOpen || state.gamerShopOpen || state.gameOver || !state.difficulty) return;
    state.blacksmithOpen = !state.blacksmithOpen;
    state.paused = state.blacksmithOpen;
    const el = document.getElementById('blacksmith-overlay');
    if (state.blacksmithOpen) { el.classList.remove('hidden'); _initBsTitleLetters(); renderBlacksmith(); }
    else el.classList.add('hidden');
}

function setBlacksmithTab(tab) {
    state.blacksmithTab = tab;
    document.querySelectorAll('.bs-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderBlacksmith();
}

function renderBlacksmith() {
    const p = state.player;
    document.getElementById('bs-gold-val').innerText = p.gold;
    const cont = document.getElementById('bs-content');
    cont.innerHTML = '';
    const tab = state.blacksmithTab || 'repair';

    if (tab === 'repair') {
        // Wizard: show rune repair instead of weapons
        if (p.character === 'wizard') {
            const runeKeys = Object.keys(p.ownedRunes || {});
            if (runeKeys.length === 0) {
                cont.innerHTML = '<div style="font-size:8px;opacity:0.6;padding:8px">No runes to repair.</div>';
            } else {
                const header = document.createElement('div');
                header.style.cssText = 'font-size:8px;color:#40c4ff;margin-bottom:6px;';
                header.textContent = '✦ RUNE REPAIR';
                cont.appendChild(header);
                runeKeys.forEach(runeKey => {
                    const rune = RUNES[runeKey];
                    if (!rune) return;
                    const charges = p.runeDurability[runeKey] || 0;
                    if (charges >= rune.maxCharges) return; // full
                    const missing = rune.maxCharges - charges;
                    const cost = missing * 8;
                    const pct = Math.round((charges / rune.maxCharges) * 100);
                    const col = pct > 60 ? '#40c4ff' : pct > 25 ? '#ff9800' : '#f44336';
                    const card = document.createElement('div'); card.className = 'bs-card';
                    card.innerHTML = `<div class="bs-name">${rune.icon} ${rune.name}</div>
                        <div class="bs-desc">Charges: ${charges}/${rune.maxCharges}</div>
                        <div class="dur-bar-wrap"><div class="dur-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                        <div class="bs-price">${cost} Gold — Restore all</div>`;
                    if (p.gold >= cost) {
                        card.addEventListener('click', () => {
                            p.gold -= cost; p.runeDurability[runeKey] = rune.maxCharges;
                            showNotif(rune.name + ' restored!'); updateWeaponHUD(); renderBlacksmith();
                        });
                    } else { card.classList.add('disabled'); }
                    cont.appendChild(card);
                });
            }
            return; // wizard uses rune repair only
        }

        p.ownedWeapons.forEach(key => {
            const w = ALL_WEAPONS[key];
            const maxDur = w.maxDurability;
            const dur = Math.max(0, p.weaponDurability[key] ?? maxDur);
            if (dur >= maxDur) return; // not damaged
            const cost = weaponRepairCost(key);
            const pct = Math.round((dur/maxDur)*100);
            const col = pct > 60 ? '#4caf50' : pct > 25 ? '#ff9800' : '#f44336';
            const card = document.createElement('div'); card.className = 'bs-card';
            card.innerHTML = `<div class="bs-name">${w.name}</div>
                <div class="bs-desc">Durability: ${Math.floor(dur)}/${maxDur}</div>
                <div class="dur-bar-wrap"><div class="dur-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                <div class="bs-price">${cost} Gold</div>`;
            if (p.gold >= cost) card.addEventListener('click', () => repairWeapon(key));
            else card.classList.add('disabled');
            cont.appendChild(card);
        });
        // Armor repair section
        const armorSlots = ['helmet','chest','leggings','boots'];
        for (const slotName of armorSlots) {
            const pieceId = p.armor[slotName];
            if (!pieceId) continue;
            const dur = Math.max(0, p.armorDurability[pieceId] ?? ARMOR_MAX_DURABILITY);
            if (dur >= ARMOR_MAX_DURABILITY) continue;
            const piece = ARMOR_CATALOG[slotName].find(pc => pc.id === pieceId);
            if (!piece) continue;
            const cost = armorRepairCost(slotName, pieceId);
            const pct = Math.round((dur / ARMOR_MAX_DURABILITY) * 100);
            const col = pct > 60 ? '#4caf50' : pct > 25 ? '#ff9800' : '#f44336';
            const card = document.createElement('div'); card.className = 'bs-card';
            card.innerHTML = `<div class="bs-name">${piece.name} <span style="opacity:0.6;font-size:8px">(${slotName})</span></div>
                <div class="bs-desc">Durability: ${Math.floor(dur)}/${ARMOR_MAX_DURABILITY}</div>
                <div class="dur-bar-wrap"><div class="dur-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                <div class="bs-price">${cost} Gold</div>`;
            if (p.gold >= cost) card.addEventListener('click', () => repairArmor(slotName, pieceId));
            else card.classList.add('disabled');
            cont.appendChild(card);
        }
        if (cont.children.length === 0) cont.innerHTML = '<div style="font-size:9px;opacity:0.6;padding:20px">All weapons and armor are in good condition!</div>';
    }

    else if (tab === 'upgrade') {
        p.ownedWeapons.forEach(key => {
            const w = ALL_WEAPONS[key];
            if (w.isCharity) return; // can't upgrade charity weapon
            const lvl = p.weaponUpgrades[key] || 0;
            const costs = [100, 250, 500];
            const maxed = lvl >= 3;
            const cost = maxed ? 0 : costs[lvl];
            const card = document.createElement('div'); card.className = 'bs-card';
            card.innerHTML = `<div class="bs-name">${w.name}</div>
                <div class="bs-desc">Tier ${lvl}/3 — +${lvl*20}% dmg</div>
                <div class="bs-price ${maxed ? 'bs-maxed' : p.gold >= cost ? 'bs-ready' : ''}">${maxed ? 'MAX TIER' : cost + ' Gold'}</div>`;
            if (!maxed && p.gold >= cost) card.addEventListener('click', () => upgradeWeaponBlacksmith(key));
            else if (maxed || p.gold < cost) card.classList.add('disabled');
            cont.appendChild(card);
        });
    }

    else if (tab === 'slots') {
        const cur = p.maxWeaponSlots;
        if (cur < 4) {
            const card = document.createElement('div'); card.className = 'bs-card' + (p.gold >= 500 ? '' : ' disabled');
            card.innerHTML = `<div class="bs-name">4th Weapon Slot</div><div class="bs-desc">Unlock a 4th quick-slot</div><div class="bs-price">500 Gold</div>`;
            if (p.gold >= 500) card.addEventListener('click', () => buyWeaponSlot(4));
            cont.appendChild(card);
        }
        if (cur < 5) {
            const card = document.createElement('div'); card.className = 'bs-card' + (p.gold >= 1000 && cur >= 4 ? '' : ' disabled');
            card.innerHTML = `<div class="bs-name">5th Weapon Slot</div><div class="bs-desc">Requires slot 4 first</div><div class="bs-price">1000 Gold</div>`;
            if (p.gold >= 1000 && cur >= 4) card.addEventListener('click', () => buyWeaponSlot(5));
            cont.appendChild(card);
        }
        if (cur >= 5) cont.innerHTML = '<div style="font-size:9px;opacity:0.6;padding:20px">All weapon slots unlocked!</div>';
    }

    else if (tab === 'armor') {
        if (p.charNoArmor) {
            const msg = document.createElement('div');
            msg.style.cssText = 'text-align:center;color:#ef9a9a;font-family:var(--font-pixel);font-size:8px;padding:20px;line-height:2;';
            msg.textContent = 'This character cannot wear armor.';
            cont.appendChild(msg);
        } else
        for (const [slotName, pieces] of Object.entries(ARMOR_CATALOG)) {
            const label = document.createElement('div'); label.className = 'armor-slot-label';
            label.innerText = slotName.toUpperCase() + (p.armor[slotName] ? ' — equipped: ' + pieces.find(pc=>pc.id===p.armor[slotName])?.name : '');
            cont.appendChild(label);
            pieces.forEach(piece => {
                const owned = p.armor[slotName] === piece.id;
                const canAfford = p.gold >= piece.price;
                const card = document.createElement('div'); card.className = 'bs-card' + (owned ? '' : canAfford ? '' : ' disabled');
                if (owned) card.style.borderColor = '#3eff6e';
                card.innerHTML = `<div class="bs-name" style="color:${piece.color}">${piece.name}</div>
                    <div class="bs-desc">${piece.desc}</div>
                    <div class="bs-price ${owned ? 'bs-ready' : ''}">${owned ? 'EQUIPPED' : piece.price + ' Gold'}</div>`;
                if (!owned && canAfford) card.addEventListener('click', () => buyArmorPiece(slotName, piece.id));
                cont.appendChild(card);
            });
        }
    }

    else if (tab === 'fusion') {
        Object.entries(ALL_WEAPONS).filter(([,w])=>w.isFusion).forEach(([key, w]) => {
            const [baseWeapon, ingId] = w.ingredients;
            const hasBase = p.ownedWeapons.includes(baseWeapon);
            const hasIng = (p.fusionIngredients[ingId] || 0) > 0;
            const alreadyOwned = p.ownedWeapons.includes(key);
            const ingInfo = FUSION_INGREDIENTS[ingId];
            const baseWpnName = ALL_WEAPONS[baseWeapon]?.name || baseWeapon;
            const canCraft = hasBase && hasIng && !alreadyOwned;
            const card = document.createElement('div'); card.className = 'bs-card' + (canCraft ? '' : ' disabled');
            if (alreadyOwned) card.style.borderColor = '#3eff6e';
            card.innerHTML = `<div class="bs-name">${w.name}</div>
                <div class="bs-desc">${w.desc}</div>
                <div class="bs-desc" style="margin-top:4px">
                    <span class="ingr-chip" style="border-color:${hasBase?'#4caf50':'#f44336'}">${baseWpnName}</span>
                    <span class="ingr-chip" style="border-color:${hasIng?'#4caf50':'#f44336'};color:${ingInfo?.color||'#fff'}">${ingInfo?.name||ingId} (${p.fusionIngredients[ingId]||0})</span>
                </div>
                <div class="bs-price ${alreadyOwned?'bs-ready':canCraft?'bs-ready':''}">${alreadyOwned?'CRAFTED':'CRAFT'}</div>`;
            if (canCraft) card.addEventListener('click', () => craftFusionWeapon(key));
            cont.appendChild(card);
        });
    }
}

function weaponRepairCost(key) {
    const w = ALL_WEAPONS[key];
    const p = state.player;
    const maxDur = w.maxDurability;
    const dur = Math.max(0, p.weaponDurability[key] ?? maxDur);
    const damageFraction = (maxDur - dur) / maxDur;
    const base = Math.max(60, w.price);
    return Math.max(5, Math.round(base * damageFraction * 0.6));
}

function repairWeapon(key) {
    const p = state.player;
    const w = ALL_WEAPONS[key];
    const maxDur = w.maxDurability;
    const cost = weaponRepairCost(key);
    if (p.gold < cost) return;
    p.gold -= cost;
    p.weaponDurability[key] = maxDur;
    p.weaponWarnedLow[key] = false;
    showNotif(w.name + ' repaired!');
    updateWeaponHUD(); renderBlacksmith();
}

function armorRepairCost(slotName, pieceId) {
    const piece = ARMOR_CATALOG[slotName]?.find(pc => pc.id === pieceId);
    if (!piece) return 5;
    const dur = Math.max(0, state.player.armorDurability[pieceId] ?? ARMOR_MAX_DURABILITY);
    const damageFraction = (ARMOR_MAX_DURABILITY - dur) / ARMOR_MAX_DURABILITY;
    const base = Math.max(80, piece.price);
    return Math.max(5, Math.round(base * damageFraction * 0.5));
}

function repairArmor(slotName, pieceId) {
    const p = state.player;
    const piece = ARMOR_CATALOG[slotName]?.find(pc => pc.id === pieceId);
    if (!piece) return;
    const cost = armorRepairCost(slotName, pieceId);
    if (p.gold < cost) return;
    p.gold -= cost;
    p.armorDurability[pieceId] = ARMOR_MAX_DURABILITY;
    p.armorWarnedLow[pieceId] = false;
    showNotif(piece.name + ' repaired!');
    renderBlacksmith();
}

function upgradeWeaponBlacksmith(key) {
    const p = state.player;
    const lvl = p.weaponUpgrades[key] || 0;
    if (lvl >= 3) return;
    const costs = [100, 250, 500];
    if (p.gold < costs[lvl]) return;
    p.gold -= costs[lvl];
    p.weaponUpgrades[key] = lvl + 1;
    showNotif(ALL_WEAPONS[key].name + ' upgraded to Tier ' + (lvl+1) + '!');
    renderBlacksmith();
}

function buyWeaponSlot(slotNum) {
    const p = state.player;
    const costs = { 4: 500, 5: 1000 };
    const cost = costs[slotNum];
    if (!cost || p.gold < cost || p.maxWeaponSlots >= slotNum) return;
    p.gold -= cost;
    p.maxWeaponSlots = slotNum;
    p.weaponSlots[slotNum] = null;
    showNotif('Weapon slot ' + slotNum + ' unlocked!');
    updateWeaponHUD(); renderBlacksmith();
}

function buyArmorPiece(slotName, pieceId) {
    const p = state.player;
    const pieces = ARMOR_CATALOG[slotName];
    const piece = pieces.find(pc => pc.id === pieceId);
    if (!piece || p.gold < piece.price) return;
    // Remove old piece's stat and refund half
    if (p.armor[slotName]) {
        const oldPiece = pieces.find(pc => pc.id === p.armor[slotName]);
        if (oldPiece) { applyArmorPiece(oldPiece, -1); p.gold += Math.floor(oldPiece.price * 0.5); }
    }
    p.gold -= piece.price;
    p.armor[slotName] = pieceId;
    // Initialize durability for newly equipped piece (full if brand new)
    if (p.armorDurability[pieceId] === undefined || p.armorDurability[pieceId] <= 0) {
        p.armorDurability[pieceId] = ARMOR_MAX_DURABILITY;
        p.armorWarnedLow[pieceId] = false;
    }
    applyArmorPiece(piece, 1);
    showNotif('Equipped ' + piece.name + '!');
    renderBlacksmith();
}

function craftFusionWeapon(key) {
    const p = state.player;
    const w = ALL_WEAPONS[key];
    const [, ingId] = w.ingredients;
    if (!p.ownedWeapons.includes(w.ingredients[0])) return;
    if ((p.fusionIngredients[ingId] || 0) <= 0) return;
    if (p.ownedWeapons.includes(key)) return;
    p.fusionIngredients[ingId]--;
    p.ownedWeapons.push(key);
    p.weaponDurability[key] = w.maxDurability;
    const maxSlots = p.maxWeaponSlots;
    for (let s = 1; s <= maxSlots; s++) { if (!p.weaponSlots[s]) { p.weaponSlots[s] = key; break; } }
    showNotif('Crafted ' + w.name + '!');
    // Check Forgery achievement: all 8 fusion weapons owned
    const fusionKeys = Object.keys(ALL_WEAPONS).filter(k => ALL_WEAPONS[k].isFusion);
    if (fusionKeys.every(k => p.ownedWeapons.includes(k)) && !persist.achievements.forgery) grantAchievement('forgery');
    updateWeaponHUD(); renderBlacksmith();
}

