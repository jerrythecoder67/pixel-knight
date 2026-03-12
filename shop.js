// ─── GAMER TEMPTATION SHOP ───
function showGamerShop() {
    if (!state.difficulty || state.gameOver || state.player.wave < 5) return;
    const p = state.player;
    state.gamerShopOpen = true;
    state.paused = true;
    document.getElementById('gamer-shop-gold-val').textContent = p.gold;
    const streak = state.gamerShopStreak;
    const discountPct = streak * 10;
    const subtitle = streak >= 4 ? 'The deals are too good to refuse...' :
                     streak >= 2 ? 'The merchant grows desperate!' :
                     'The merchant has special offers...';
    document.getElementById('gamer-shop-subtitle').textContent =
        discountPct > 0 ? subtitle + ' (' + discountPct + '% OFF!)' : subtitle;
    const streakEl = document.getElementById('gamer-shop-streak-info');
    streakEl.textContent = streak > 0 ?
        'Resisted ' + streak + ' time' + (streak > 1 ? 's' : '') + '!' : '';
    const cont = document.getElementById('gamer-shop-items');
    cont.innerHTML = '';
    const candidates = Object.entries(ALL_WEAPONS).filter(([k, w]) => !w.isFusion && w.price > 0 && !p.ownedWeapons.includes(k));
    const picks = candidates.sort(() => Math.random() - 0.5).slice(0, 3);
    if (picks.length === 0) {
        cont.innerHTML = '<div style="font-size:9px;opacity:0.7;padding:8px">You own every weapon. Nothing to tempt you.</div>';
    } else {
        picks.forEach(([key, wpn]) => {
            const price = Math.max(10, Math.round(wpn.price * (1 - discountPct / 100)));
            const card = document.createElement('div');
            card.className = 'gamer-shop-card';
            card.innerHTML =
                '<span class="gs-icon">' + wpn.icon + '</span>' +
                '<div class="gs-info"><span class="gs-name">' + wpn.name + '</span><span class="gs-desc">' + wpn.desc + '</span></div>' +
                '<button class="gamer-shop-btn" disabled>' + price + 'g</button>';
            card.querySelector('.gamer-shop-btn').addEventListener('click', () => buyGamerShopWeapon(key, price));
            cont.appendChild(card);
        });
    }
    document.getElementById('gamer-shop-skip-btn').disabled = true;
    const timerEl = document.getElementById('gamer-shop-timer');
    timerEl.textContent = 'Activating in 2s...';
    let countdown = 2;
    const iv = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(iv);
            timerEl.textContent = '';
            document.querySelectorAll('.gamer-shop-btn').forEach(b => b.disabled = false);
            document.getElementById('gamer-shop-skip-btn').disabled = false;
        } else {
            timerEl.textContent = 'Activating in ' + countdown + 's...';
        }
    }, 1000);
    document.getElementById('gamer-shop-overlay').classList.remove('hidden');
}
function buyGamerShopWeapon(key, price) {
    const p = state.player;
    if (p.gold < price) { showNotif('Not enough gold!'); return; }
    p.gold -= price;
    if (!p.ownedWeapons.includes(key)) {
        p.ownedWeapons.push(key);
        p.weaponDurability[key] = ALL_WEAPONS[key].maxDurability;
        const maxSlots = p.maxWeaponSlots;
        for (let s = 1; s <= maxSlots; s++) { if (!p.weaponSlots[s]) { p.weaponSlots[s] = key; break; } }
        updateWeaponHUD();
    }
    state.gamerShopStreak = 0;
    closeGamerShop();
    showNotif('Bought ' + ALL_WEAPONS[key].name + '!');
}
function skipGamerShop() {
    state.gamerShopStreak++;
    closeGamerShop();
    if (state.gamerShopStreak >= 6 && !persist.achievements.gamerUnlock) {
        grantAchievement('gamerUnlock');
    }
}
function closeGamerShop() {
    state.gamerShopOpen = false;
    state.paused = false;
    document.getElementById('gamer-shop-overlay').classList.add('hidden');
}

function toggleShop() {
    if (state.upgradeOpen || state.evolveOpen || state.petEvolveOpen || state.gamerShopOpen || state.gameOver) return;
    if (state.difficulty && state.player.charNoShop) { showNotif('The Reaper needs no shop.'); return; }
    // Close blacksmith if open
    if (state.blacksmithOpen) { state.blacksmithOpen = false; document.getElementById('blacksmith-overlay').classList.add('hidden'); }
    const preGame = !state.difficulty;
    state.shopOpen = !state.shopOpen;
    if (!preGame) state.paused = state.shopOpen;
    const el = document.getElementById('shop-overlay');
    if (state.shopOpen) {
        el.classList.remove('hidden'); renderShop();
        if (state.difficulty) state.shopOpenedThisRun = true;
    } else el.classList.add('hidden');
}

function toggleShopLock(key) {
    if (state.shopLocks[key]) {
        delete state.shopLocks[key];
        delete state.shopLockedPrices[key];
    } else {
        state.shopLocks[key] = true;
        state.shopLockedPrices[key] = ALL_WEAPONS[key].price;
    }
    renderShop();
}

function rerollShop() {
    const p = state.player;
    const cost = p.wave * 6;
    if (p.gold < cost) { showNotif('Need ' + cost + 'g to reroll!'); return; }
    p.gold -= cost;
    randomizeShop();
    renderShop();
    showNotif('Shop rerolled!');
}

function sellPineWood() {
    const p = state.player;
    if (!p.pineWood) return;
    const gain = 5 * p.wave;
    p.gold += gain; p.pineWood--;
    p.totalGoldEarned = (p.totalGoldEarned || 0) + gain;
    showNotif('+' + gain + 'g for Pine Wood!');
    renderShop();
}

function sellRedWood() {
    const p = state.player;
    if (!p.redWood) return;
    const gain = 30 * p.wave;
    p.gold += gain; p.redWood--;
    p.totalGoldEarned = (p.totalGoldEarned || 0) + gain;
    showNotif('+' + gain + 'g for Redwood!');
    renderShop();
}

function sellBone() {
    const p = state.player;
    if (!(p.bones > 0)) return;
    const gain = 10 * p.wave;
    p.gold += gain; p.bones--;
    p.totalGoldEarned = (p.totalGoldEarned || 0) + gain;
    showNotif('+' + gain + 'g for Bone!');
    renderShop();
}

function buyTimberUpgrade() {
    const p = state.player;
    const totalWood = (p.pineWood || 0) + (p.redWood || 0);
    if (totalWood < 3 || p.gold < 50) { showNotif('Need 3 Wood + 50g!'); return; }
    // Consume: prefer pine to preserve redwood
    let need = 3;
    const usePine = Math.min(need, p.pineWood || 0); p.pineWood -= usePine; need -= usePine;
    if (need > 0) p.redWood -= need;
    p.gold -= 50;
    p.weaponUpgrades[p.weapon] = p.weaponUpgrades[p.weapon] || {};
    if (p.weaponUpgrades[p.weapon].knockback) {
        showNotif(ALL_WEAPONS[p.weapon].name + ' already has knockback!');
        // Refund
        p.gold += 50; p.pineWood += usePine; p.redWood += need;
        return;
    }
    p.weaponUpgrades[p.weapon].knockback = true;
    showNotif('Timber upgrade! ' + ALL_WEAPONS[p.weapon].name + ' now knocks back!');
    renderShop();
}

function renderRuneShop() {
    const p = state.player;
    document.getElementById('shop-gold-val').innerText = p.gold;
    const c = document.getElementById('shop-items'); c.innerHTML = '';
    const header = document.createElement('div');
    header.style.cssText = 'font-size:8px;color:#40c4ff;margin-bottom:6px;letter-spacing:1px;';
    header.textContent = '✦ RUNE SHOP — ' + (p.manaStacks > 1 ? p.manaStacks + ' mana stacks' : 'Mana charges every ~14s');
    c.appendChild(header);
    // Show 3 random runes not yet owned
    const available = Object.entries(RUNES).filter(([k]) => !p.ownedRunes[k]);
    const picks = available.sort(() => Math.random() - 0.5).slice(0, 3);
    if (picks.length === 0) {
        c.innerHTML += '<div style="font-size:8px;opacity:0.6;padding:8px">You own all runes.</div>';
    } else {
        picks.forEach(([key, rune]) => {
            const card = document.createElement('div');
            card.className = 'shop-card';
            const charges = p.runeDurability[key] || rune.maxCharges;
            card.innerHTML = `<div class="shop-icon">${rune.icon}</div>
                <div class="shop-name">${rune.name}</div>
                <div class="shop-desc">${rune.desc}</div>
                <div class="shop-desc">Charges: ${rune.maxCharges}</div>
                <div class="shop-price">${rune.price}g</div>`;
            if (p.gold >= rune.price) {
                card.addEventListener('click', () => {
                    if (p.gold < rune.price) return;
                    p.gold -= rune.price;
                    p.ownedRunes[key] = true;
                    p.runeDurability[key] = rune.maxCharges;
                    // Auto-assign to first empty rune slot
                    for (let s = 1; s <= 4; s++) { if (!p.runeSlots[s]) { p.runeSlots[s] = key; break; } }
                    showNotif('Got ' + rune.name + '!');
                    updateWeaponHUD(); renderRuneShop();
                });
            } else {
                card.style.opacity = '0.5';
            }
            c.appendChild(card);
        });
    }
    // Mana upgrades
    const uDiv = document.createElement('div');
    uDiv.style.cssText = 'margin-top:10px;border-top:1px solid #1565c0;padding-top:8px;font-size:7px;color:#90caf9;';
    uDiv.innerHTML = '<div style="color:#40c4ff;font-size:8px;margin-bottom:4px;">MANA UPGRADES</div>';
    const manaUpgrades = [
        { id: 'manaFast', label: 'Faster Mana (+33% regen)', cost: 80, apply: () => { p.manaRegen *= 1.33; } },
        { id: 'manaStack', label: 'Mana Stack (hold 2 casts)', cost: 120, apply: () => { p.manaStacks = Math.min(3, (p.manaStacks || 1) + 1); } },
        { id: 'runeCharges', label: '+3 charges on all runes', cost: 100, apply: () => { Object.keys(p.runeDurability).forEach(k => { p.runeDurability[k] += 3; }); } },
        { id: 'runeSlot4', label: 'Unlock Rune Slot 4', cost: 150, apply: () => { /* slot 4 already exists */ } },
    ];
    manaUpgrades.forEach(u => {
        if (p.skills[u.id]) return; // already bought
        const btn = document.createElement('button');
        btn.className = 'shop-link-btn';
        btn.style.cssText = 'font-size:7px;margin:2px;';
        btn.textContent = u.label + ' — ' + u.cost + 'g';
        btn.disabled = p.gold < u.cost;
        btn.addEventListener('click', () => {
            if (p.gold < u.cost) return;
            p.gold -= u.cost; p.skills[u.id] = true; u.apply(); showNotif(u.label + '!'); renderRuneShop();
        });
        uDiv.appendChild(btn);
    });
    c.appendChild(uDiv);
}

function renderShop() {
    const p = state.player;
    // Wizard during trial uses rune shop
    if (p.character === 'wizard') { renderRuneShop(); return; }
    document.getElementById('shop-gold-val').innerText = p.gold;
    const c = document.getElementById('shop-items'); c.innerHTML = '';

    // Weapon cards with lock buttons
    state.shopWeapons.forEach(key => {
        const w = ALL_WEAPONS[key], owned = p.ownedWeapons.includes(key);
        const locked = !!state.shopLocks[key];
        const price = locked && state.shopLockedPrices[key] ? state.shopLockedPrices[key] : w.price;
        const displayPrice = locked ? price + 'g (+1%/wave)' : price + 'g';

        const card = document.createElement('div');
        card.className = 'shop-card' + (owned ? ' owned' : '') + (locked ? ' shop-locked' : '');
        card.style.position = 'relative';

        card.innerHTML = `<div class="shop-icon">${w.icon}</div>
            <div class="shop-name">${w.name}</div>
            <div class="shop-desc">${w.desc}</div>
            <div class="shop-desc">DMG:${w.damage} RNG:${w.range}</div>
            <div class="shop-price">${owned ? 'OWNED ✓' : displayPrice}</div>`;

        // Lock button
        if (!owned) {
            const lockBtn = document.createElement('button');
            lockBtn.className = 'shop-lock-btn';
            lockBtn.textContent = locked ? '🔒' : '🔓';
            lockBtn.title = locked ? 'Unlock slot' : 'Lock this item';
            lockBtn.style.cssText = 'position:absolute;top:4px;right:4px;font-size:10px;padding:2px 4px;cursor:pointer;background:#333;border:1px solid #555;border-radius:3px;';
            lockBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleShopLock(key); });
            card.appendChild(lockBtn);
        }

        if (!owned && p.gold >= price) card.addEventListener('click', () => buyWeapon(key, price));
        c.appendChild(card);
    });

    // Reroll button
    const rerollCost = p.wave * 6;
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'shop-link-btn';
    rerollBtn.style.cssText = 'margin-top:8px;width:100%;font-size:8px;';
    rerollBtn.textContent = '🎲 Reroll (' + rerollCost + 'g)';
    rerollBtn.addEventListener('click', rerollShop);
    c.appendChild(rerollBtn);

    // Wood sell section
    const totalWood = (p.pineWood || 0) + (p.redWood || 0);
    if (totalWood > 0 || (p.pineWood || 0) > 0 || (p.redWood || 0) > 0) {
        const woodDiv = document.createElement('div');
        woodDiv.style.cssText = 'margin-top:10px;border-top:1px solid #444;padding-top:8px;font-size:8px;color:#a5d6a7;';
        woodDiv.innerHTML = '<div style="color:#66bb6a;font-size:8px;margin-bottom:4px">WOOD MARKET</div>';

        if ((p.pineWood || 0) > 0) {
            const pineBtn = document.createElement('button');
            pineBtn.className = 'shop-link-btn';
            pineBtn.style.cssText = 'font-size:7px;margin:2px;';
            pineBtn.textContent = 'Sell Pine Wood (' + p.pineWood + ') — ' + (5 * p.wave) + 'g each';
            pineBtn.addEventListener('click', sellPineWood);
            woodDiv.appendChild(pineBtn);
        }
        if ((p.redWood || 0) > 0) {
            const redBtn = document.createElement('button');
            redBtn.className = 'shop-link-btn';
            redBtn.style.cssText = 'font-size:7px;margin:2px;';
            redBtn.textContent = 'Sell Redwood (' + p.redWood + ') — ' + (30 * p.wave) + 'g each';
            redBtn.addEventListener('click', sellRedWood);
            woodDiv.appendChild(redBtn);
        }

        // Timber upgrade
        if (totalWood > 0) {
            const timberBtn = document.createElement('button');
            timberBtn.className = 'shop-link-btn';
            timberBtn.style.cssText = 'font-size:7px;margin:2px;';
            const hasKnockback = p.weaponUpgrades[p.weapon]?.knockback;
            timberBtn.textContent = hasKnockback
                ? ALL_WEAPONS[p.weapon]?.name + ': knockback ACTIVE'
                : 'Timber Upgrade: 3 Wood + 50g → Knockback on ' + (ALL_WEAPONS[p.weapon]?.name || 'weapon');
            timberBtn.disabled = hasKnockback || totalWood < 3 || p.gold < 50;
            timberBtn.addEventListener('click', buyTimberUpgrade);
            woodDiv.appendChild(timberBtn);
        }

        c.appendChild(woodDiv);
    }

    // Bones market
    if ((p.bones || 0) > 0) {
        const boneDiv = document.createElement('div');
        boneDiv.style.cssText = 'margin-top:10px;border-top:1px solid #444;padding-top:8px;font-size:8px;color:#e0e0e0;';
        boneDiv.innerHTML = '<div style="color:#bdbdbd;font-size:8px;margin-bottom:4px">BONE MARKET</div>';
        const boneBtn = document.createElement('button');
        boneBtn.className = 'shop-link-btn';
        boneBtn.style.cssText = 'font-size:7px;margin:2px;';
        boneBtn.textContent = 'Sell Bone (' + p.bones + ') — ' + (10 * p.wave) + 'g each';
        boneBtn.addEventListener('click', sellBone);
        boneDiv.appendChild(boneBtn);
        c.appendChild(boneDiv);
    }
}

function buyWeapon(key, priceOverride) {
    const w = ALL_WEAPONS[key];
    const price = priceOverride !== undefined ? priceOverride : w.price;
    if (state.player.gold < price) return;
    state.player.gold -= price;
    persist.totalShopPurchases = (persist.totalShopPurchases || 0) + 1;
    savePersist(persist);
    if (!persist.achievements.shopper100 && persist.totalShopPurchases >= 100) grantAchievement('shopper100');
    state.player.ownedWeapons.push(key);
    // Initialize durability for newly acquired weapon
    state.player.weaponDurability[key] = w.maxDurability;
    const maxSlots = state.player.maxWeaponSlots;
    for (let s = 1; s <= maxSlots; s++) { if (!state.player.weaponSlots[s]) { state.player.weaponSlots[s] = key; break; } }
    // Remove lock if it was locked (now owned)
    if (state.shopLocks[key]) { delete state.shopLocks[key]; delete state.shopLockedPrices[key]; }
    showNotif('Bought ' + w.name + '!');
    updateWeaponHUD(); randomizeShop(); renderShop();
}
