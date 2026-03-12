// ─── ARMOR / DURABILITY HELPERS ───
function getArmorBonus(statKey) {
    let total = 0;
    const a = state.player.armor;
    for (const slotName of ['helmet','chest','leggings','boots']) {
        if (!a[slotName]) continue;
        for (const pieces of Object.values(ARMOR_CATALOG)) {
            const piece = pieces.find(pc => pc.id === a[slotName]);
            if (piece && piece.statKey === statKey) total += piece.statVal;
        }
    }
    return total;
}

function applyArmorPiece(piece, mult) {
    const p = state.player;
    if (!piece) return;
    if (piece.statKey === 'speed')  p.speed += piece.statVal * mult;
    if (piece.statKey === 'maxHp')  { p.maxHp += piece.statVal * mult; if (mult > 0) p.hp = Math.min(p.maxHp, p.hp + piece.statVal); }
}

function drainDurability(weaponKey, amount) {
    if (!weaponKey || !ALL_WEAPONS[weaponKey]) return;
    const p = state.player;
    const maxDur = ALL_WEAPONS[weaponKey].maxDurability;
    if (p.weaponDurability[weaponKey] === undefined) p.weaponDurability[weaponKey] = maxDur;
    p.weaponDurability[weaponKey] -= amount;
    if (p.weaponDurability[weaponKey] <= 0) {
        breakWeapon(weaponKey);
    } else {
        // Warn once when dropping to or below 20%
        if (!p.weaponWarnedLow[weaponKey] && p.weaponDurability[weaponKey] <= maxDur * 0.2) {
            p.weaponWarnedLow[weaponKey] = true;
            showNotif('Your ' + ALL_WEAPONS[weaponKey].name + ' is almost broken!');
        }
        updateWeaponHUD();
    }
}

function breakWeapon(key) {
    const p = state.player;
    p.weaponDurability[key] = 0;
    p.ownedWeapons = p.ownedWeapons.filter(k => k !== key);
    delete p.weaponUpgrades[key];
    for (let s = 1; s <= 5; s++) { if (p.weaponSlots[s] === key) p.weaponSlots[s] = null; }
    showNotif(ALL_WEAPONS[key]?.name + ' broke!');
    // Equip next available weapon
    const next = p.ownedWeapons[0] || null;
    if (next) {
        p.weapon = next;
        for (let s = 1; s <= 5; s++) { if (p.weaponSlots[s] === next) break; if (!p.weaponSlots[s]) { p.weaponSlots[s] = next; break; } }
    } else {
        // No weapons left — give a charity wooden dagger
        const charity = 'woodenDagger';
        p.ownedWeapons.push(charity);
        p.weaponDurability[charity] = ALL_WEAPONS[charity].maxDurability;
        p.weaponWarnedLow[charity] = false;
        p.weapon = charity;
        p.weaponSlots[1] = charity;
        setTimeout(() => showNotif('The shop felt bad and gave you a Wooden Dagger, even if it\'s a bad one.'), 1200);
    }
    updateWeaponHUD();
}

function drainArmorDurability(amount) {
    const p = state.player;
    const slots = ['helmet', 'chest', 'leggings', 'boots'];
    for (const slotName of slots) {
        const pieceId = p.armor[slotName];
        if (!pieceId) continue;
        if (p.armorDurability[pieceId] === undefined) p.armorDurability[pieceId] = ARMOR_MAX_DURABILITY;
        p.armorDurability[pieceId] -= amount;
        if (p.armorDurability[pieceId] <= 0) {
            breakArmorPiece(slotName, pieceId);
        } else if (!p.armorWarnedLow[pieceId] && p.armorDurability[pieceId] <= ARMOR_MAX_DURABILITY * 0.2) {
            p.armorWarnedLow[pieceId] = true;
            const pieceName = Object.values(ARMOR_CATALOG).flat().find(pc => pc.id === pieceId)?.name || pieceId;
            showNotif('Your ' + pieceName + ' is almost broken!');
        }
    }
}

function breakArmorPiece(slotName, pieceId) {
    const p = state.player;
    const pieces = ARMOR_CATALOG[slotName];
    const piece = pieces?.find(pc => pc.id === pieceId);
    if (piece) applyArmorPiece(piece, -1);
    p.armor[slotName] = null;
    p.armorDurability[pieceId] = 0;
    showNotif((piece?.name || 'Armor') + ' broke!');
}

