// ─── UPGRADES ───
function getMilestoneKills(idx) {
    if (idx < MILESTONE_KILLS.length) return MILESTONE_KILLS[idx];
    return MILESTONE_KILLS[MILESTONE_KILLS.length - 1] + (idx - MILESTONE_KILLS.length + 1) * 60;
}

function buildUpgradeChoices() {
    const choices = [];
    const owned = state.player.upgrades;
    const maxSlots = state.player.maxUpgrades || 6;
    let attempts = 0;
    while (choices.length < 3 && attempts < 60) {
        attempts++;
        let choice;
        if (owned.length < maxSlots) {
            if (owned.length > 0 && Math.random() < 0.25) {
                const id = owned[Math.floor(Math.random() * owned.length)];
                choice = ALL_UPGRADES.find(u => u.id === id);
            } else {
                const avail = ALL_UPGRADES.filter(u => !owned.includes(u.id) && !choices.find(c => c.id === u.id));
                if (avail.length > 0) choice = avail[Math.floor(Math.random() * avail.length)];
                else if (owned.length > 0) {
                    const id = owned[Math.floor(Math.random() * owned.length)];
                    choice = ALL_UPGRADES.find(u => u.id === id);
                }
            }
        } else {
            const id = owned[Math.floor(Math.random() * owned.length)];
            choice = ALL_UPGRADES.find(u => u.id === id);
        }
        if (choice && !choices.find(c => c.id === choice.id)) {
            const clone = { ...choice };
            if (owned.includes(clone.id)) {
                const nextLvl = (state.player.upgradeLevels[clone.id] || 0) + 1;
                clone.desc = EVOLVE_BONUSES[clone.id] ? EVOLVE_BONUSES[clone.id](nextLvl) : clone.desc;
                clone.name = clone.name + " Lv." + (nextLvl + 1);
            }
            choices.push(clone);
        }
        if (owned.length >= maxSlots && choices.length >= Math.min(3, owned.length)) break;
    }
    return choices;
}

function checkMilestone() {
    const idx = state.player.milestoneIndex;
    if (state.player.kills >= getMilestoneKills(idx)) {
        state.player.milestoneIndex++;
        if (state.player.charBlob) {
            // Blob: get a gene slot instead of an upgrade
            state.pendingUpgradeCount++; updateUpgradeButton();
        } else {
            const choices = buildUpgradeChoices();
            if (choices.length > 0) { state.pendingUpgradeCount++; updateUpgradeButton(); }
        }
    }
}

function checkEvolve() {
    if (state.player.upgrades.length === 0) return;
    if (state.player.kills >= state.player.nextEvolveKills) {
        state.player.nextEvolveKills += 70;
        state.pendingEvolveCount++;
        updateUpgradeButton();
    }
}

function showUpgradeUI() {
    const el = document.getElementById('upgrade-overlay'); el.classList.remove('hidden');
    const c = document.getElementById('upgrade-choices'); c.innerHTML = '';
    state.pendingUpgradeChoices.forEach(upg => {
        const card = document.createElement('div'); card.className = 'upgrade-card';
        card.innerHTML = `<div class="upgrade-icon">${upg.icon}</div>
            <div class="upgrade-name">${upg.name}</div><div class="upgrade-desc">${upg.desc}</div>`;
        card.addEventListener('click', () => pickUpgrade(upg));
        c.appendChild(card);
    });
}

function showEvolveUI() {
    const el = document.getElementById('evolve-overlay'); el.classList.remove('hidden');
    const c = document.getElementById('evolve-choices'); c.innerHTML = '';
    const owned = [...state.player.upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
    owned.forEach(id => {
        const upg = ALL_UPGRADES.find(u => u.id === id);
        const lvl = (state.player.upgradeLevels[id] || 0) + 1;
        const card = document.createElement('div'); card.className = 'evolve-card';
        card.innerHTML = `<div class="upgrade-icon">${upg.icon}</div>
            <div class="upgrade-name">${upg.name} Lv.${lvl + 1}</div>
            <div class="upgrade-desc">${EVOLVE_BONUSES[id] ? EVOLVE_BONUSES[id](lvl) : upg.desc}</div>
            <div class="evolve-level">Current: Lv.${lvl}</div>`;
        card.addEventListener('click', () => pickEvolve(id));
        c.appendChild(card);
    });
}

function pickUpgrade(upg) {
    if (upg.id === 'petEvolve') {
        // Close the upgrade overlay and open the pet evolve path overlay
        state.upgradeOpen = false;
        document.getElementById('upgrade-overlay').classList.add('hidden');
        // If no path chosen yet, show path selection; otherwise show tier upgrade
        openPetEvolveOverlay();
        return;
    }
    if (state.player.upgrades.includes(upg.id)) {
        state.player.upgradeLevels[upg.id] = (state.player.upgradeLevels[upg.id] || 0) + 1;
    } else {
        state.player.upgrades.push(upg.id);
        state.player.upgradeLevels[upg.id] = 0;
    }
    applyUpgrade(upg.id); updateUpgradesHUD();
    state.pendingUpgradeCount = Math.max(0, state.pendingUpgradeCount - 1);
    if (state.pendingUpgradeCount > 0) {
        state.pendingUpgradeChoices = buildUpgradeChoices();
        showUpgradeUI();
        return;
    }
    state.upgradeOpen = false; state.paused = false;
    state.pendingUpgradeChoices = [];
    document.getElementById('upgrade-overlay').classList.add('hidden');
    updateUpgradeButton();
}

function pickEvolve(id) {
    state.player.upgradeLevels[id] = (state.player.upgradeLevels[id] || 0) + 1;
    state.pendingEvolveCount = Math.max(0, state.pendingEvolveCount - 1);
    state.evolveOpen = false; state.paused = false;
    document.getElementById('evolve-overlay').classList.add('hidden');
    updateUpgradeButton();
    const upg = ALL_UPGRADES.find(u => u.id === id);
    showNotif(upg.name + ' evolved to Lv.' + (state.player.upgradeLevels[id] + 1) + '!');
    applyUpgrade(id); updateUpgradesHUD();
}

function openPetEvolveOverlay() {
    const p = state.player;
    if (p.petEvolveLevel >= 10) { closePetEvolveFull(); return; }
    state.petEvolveOpen = true; state.paused = true;
    const depth = petDepth();
    if (depth < 3) { showPetEvolveBranch(depth); }
    else { showPetEvolveTier(); }
}

// Show 3 branch choices at the given depth (0, 1, or 2)
function showPetEvolveBranch(depth) {
    const p = state.player;
    const petDef = PET_TYPES[p.pet];
    // Walk the tree to the current node
    const parentNode = depth === 0 ? null : getPetNode(p.pet, p.petBranch);
    const choices = depth === 0 ? PET_EVOLUTIONS[p.pet] : (parentNode ? parentNode.branches : null);
    if (!choices) { showPetEvolveTier(); return; }
    const depthLabels = ['evolution path', 'specialization', 'mastery'];
    document.getElementById('pet-evolve-overlay').classList.remove('hidden');
    document.getElementById('pet-evolve-subtitle').innerText = petDef.icon + ' ' + petDef.name + ' — Choose your ' + depthLabels[depth] + ':';
    const c = document.getElementById('pet-evolve-choices'); c.innerHTML = '';
    choices.forEach((node, idx) => {
        const card = document.createElement('div'); card.className = 'pet-evolve-card';
        card.innerHTML = `<div class="upgrade-icon">${node.icon}</div><div class="upgrade-name">${node.name}</div><div class="upgrade-desc">${node.desc}</div>`;
        card.addEventListener('click', () => pickPetBranch(depth, idx + 1));
        c.appendChild(card);
    });
}

function pickPetBranch(depth, choice) {
    const p = state.player;
    p.petBranch[depth] = choice;
    p.petEvolveLevel++; p.petLevel++;
    const node = getPetNode(p.pet, p.petBranch);
    if (node) showNotif(PET_TYPES[p.pet].icon + ' ' + node.name + ' path chosen!');
    state.petEvolveOpen = false; state.paused = false;
    document.getElementById('pet-evolve-overlay').classList.add('hidden');
    updateUpgradesHUD();
    applyPetEvolve();
}

function showPetEvolveTier() {
    const p = state.player;
    const petDef = PET_TYPES[p.pet];
    const leafNode = getPetNode(p.pet, p.petBranch);
    // petEvolveLevel counts: 3 branch picks + deep tiers. Deep tier index = petEvolveLevel - 3
    const deepTierIdx = p.petEvolveLevel - 3;
    if (!leafNode || !leafNode.tiers) { closePetEvolveFull(); return; }
    const tierDef = leafNode.tiers[deepTierIdx];
    if (!tierDef || p.petEvolveLevel >= 10) {
        showNotif(petDef.icon + ' ' + leafNode.name + ' is fully evolved!');
        closePetEvolveFull(); return;
    }
    document.getElementById('pet-evolve-overlay').classList.remove('hidden');
    document.getElementById('pet-evolve-subtitle').innerText = petDef.icon + ' ' + leafNode.name + ' — Tier ' + (deepTierIdx + 1) + ':';
    const c = document.getElementById('pet-evolve-choices'); c.innerHTML = '';
    const card = document.createElement('div'); card.className = 'pet-evolve-card'; card.style.width = '200px';
    card.innerHTML = `<div class="upgrade-icon">${tierDef.icon}</div><div class="upgrade-name">${tierDef.name}</div><div class="upgrade-desc">${tierDef.desc}</div>`;
    card.addEventListener('click', () => pickPetEvolveTier());
    c.appendChild(card);
}

function closePetEvolveFull() {
    state.petEvolveOpen = false; state.paused = false;
    document.getElementById('pet-evolve-overlay').classList.add('hidden');
}

function pickPetEvolveTier() {
    const p = state.player;
    const deepTierIdx = p.petEvolveLevel - 3;
    const leafNode = getPetNode(p.pet, p.petBranch);
    const tierDef = leafNode.tiers[deepTierIdx];
    showNotif(PET_TYPES[p.pet].icon + ' ' + tierDef.name + ' unlocked!');
    p.petEvolveLevel++; p.petLevel++;
    state.petEvolveOpen = false; state.paused = false;
    document.getElementById('pet-evolve-overlay').classList.add('hidden');
    updateUpgradesHUD();
    applyPetEvolve();
}

function applyPetEvolve() {
    const p = state.player;
    const leaf = getPetNode(p.pet, p.petBranch);
    // Turtle Ancient Shell > Overgrowth: max HP bonus at high tier
    if (p.pet === 'turtle' && p.petBranch[0] === 3 && p.petBranch[1] === 2 && p.petEvolveLevel >= 7) {
        p.maxHp += 40; p.hp = Math.min(p.hp + 40, p.maxHp);
    }
    // Rabbit Ghost > Healing Dash: minor speed stat
    if (p.pet === 'rabbit' && p.petBranch[0] === 3 && p.petEvolveLevel >= 4) {
        p.speed = Math.min(p.speed * 1.05, 10);
    }
}

function updateUpgradeButton() {
    const total = state.pendingUpgradeCount + state.pendingEvolveCount;
    const btn = document.getElementById('upgrade-btn');
    if (total > 0) {
        btn.classList.remove('hidden');
        let label;
        if (state.player.charBlob && state.pendingUpgradeCount > 0) label = '🧬 GENE SLOT';
        else label = state.pendingUpgradeCount > 0 ? '⬆ UPGRADES' : '⭐ EVOLVE';
        btn.innerText = label + ': ' + total;
    } else {
        btn.classList.add('hidden');
    }
}

// ─── BLOB GENE SYSTEM ───

function showGeneUI() {
    const p = state.player;
    const overlay = document.getElementById('gene-overlay');
    overlay.classList.remove('hidden');

    // Show equipped genes
    const equippedEl = document.getElementById('gene-equipped');
    if (equippedEl) {
        equippedEl.innerHTML = '';
        (p.blobGenes || []).forEach(id => {
            const g = BLOB_GENES.find(x => x.id === id);
            if (!g) return;
            const chip = document.createElement('div');
            chip.style.cssText = `font-family:var(--font-pixel);font-size:6px;color:${g.color};background:#0d1f0d;border:1px solid ${g.color};border-radius:3px;padding:2px 6px;`;
            chip.textContent = g.icon + ' ' + g.name;
            equippedEl.appendChild(chip);
        });
        if ((p.blobGenes || []).length === 0) equippedEl.innerHTML = '<span style="font-family:var(--font-pixel);font-size:6px;color:#444">No genes equipped yet</span>';
    }

    // Available genes: unlocked this run, not already equipped
    const available = BLOB_GENES.filter(g =>
        (g.startUnlocked || p.blobGeneUnlocks[g.unlockKey]) && !p.blobGenes.includes(g.id)
    );
    // Locked genes (not yet earned)
    const locked = BLOB_GENES.filter(g =>
        !g.startUnlocked && !p.blobGeneUnlocks[g.unlockKey] && !p.blobGenes.includes(g.id)
    );

    // Build available gene cards
    const choicesEl = document.getElementById('gene-choices');
    choicesEl.innerHTML = '';
    if (available.length === 0) {
        choicesEl.innerHTML = '<div style="font-family:var(--font-pixel);font-size:7px;color:#555;padding:16px;">All unlocked genes equipped.<br>Unlock more by playing!</div>';
    }
    available.forEach(g => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.style.cssText = 'border-color:' + g.color + ';min-width:100px;max-width:130px;';
        card.innerHTML = `<div class="upgrade-icon" style="color:${g.color}">${g.icon}</div>
            <div class="upgrade-name" style="color:${g.color}">${g.name}</div>
            <div class="upgrade-desc">${g.desc}</div>`;
        card.addEventListener('click', () => selectGene(g.id));
        choicesEl.appendChild(card);
    });

    // Build locked gene list
    const lockedEl = document.getElementById('gene-locked-list');
    lockedEl.innerHTML = '';
    locked.forEach(g => {
        const chip = document.createElement('div');
        chip.style.cssText = 'font-family:var(--font-pixel);font-size:5px;color:#444;background:#1a1a1a;border:1px solid #333;border-radius:3px;padding:3px 6px;';
        chip.textContent = g.icon + ' ' + g.name + ' — ' + g.unlockDesc;
        lockedEl.appendChild(chip);
    });

    // Draw blob preview with current genes
    _drawGeneBlobPreview(p.blobGenes);
}

function _drawGeneBlobPreview(genes) {
    const cvs = document.getElementById('gene-blob-preview');
    if (!cvs) return;
    const gCtx = cvs.getContext('2d');
    gCtx.clearRect(0, 0, cvs.width, cvs.height);
    gCtx.fillStyle = '#0a1a0a';
    gCtx.fillRect(0, 0, cvs.width, cvs.height);
    // Draw blob centered
    gCtx.save(); gCtx.translate(40, 58); gCtx.globalAlpha = 0.85;
    const hasMacro = genes.includes('macro');
    const bodyW = hasMacro ? 18 : 12, bodyH = hasMacro ? 16 : 10;
    // Armor plates
    if (genes.includes('armor')) {
        gCtx.fillStyle = '#90a4ae';
        for (let ai = 0; ai < 5; ai++) {
            const aa = ai * Math.PI * 2 / 5;
            gCtx.fillRect(Math.cos(aa) * (bodyW + 2) - 3, Math.sin(aa) * (bodyH + 2) - 3, 6, 6);
        }
    }
    // Main body
    gCtx.fillStyle = '#c8e6c9'; gCtx.beginPath(); gCtx.ellipse(0, 2, bodyW, bodyH, 0, 0, Math.PI * 2); gCtx.fill();
    gCtx.fillStyle = '#a5d6a7'; gCtx.beginPath(); gCtx.ellipse(0, 3, bodyW * 0.65, bodyH * 0.65, 0, 0, Math.PI * 2); gCtx.fill();
    // Cilia (speed) — tiny hairs at bottom
    if (genes.includes('cilia')) {
        gCtx.strokeStyle = '#80deea'; gCtx.lineWidth = 1;
        for (let ci = 0; ci < 7; ci++) {
            const cx2 = -bodyW + ci * (bodyW * 2 / 6), cy2 = bodyH;
            gCtx.beginPath(); gCtx.moveTo(cx2, cy2); gCtx.lineTo(cx2 + (Math.random() > 0.5 ? 2 : -2), cy2 + 5); gCtx.stroke();
        }
    }
    // Eye
    gCtx.fillStyle = '#fff'; gCtx.beginPath(); gCtx.ellipse(-1, 0, 4, 5, 0, 0, Math.PI * 2); gCtx.fill();
    gCtx.fillStyle = '#1a237e'; gCtx.beginPath(); gCtx.arc(-1, 0, 2.8, 0, Math.PI * 2); gCtx.fill();
    gCtx.fillStyle = '#000'; gCtx.beginPath(); gCtx.arc(-0.5, -0.5, 1.8, 0, Math.PI * 2); gCtx.fill();
    gCtx.fillStyle = '#fff'; gCtx.beginPath(); gCtx.arc(-1.8, -1.5, 0.8, 0, Math.PI * 2); gCtx.fill();
    // Spike
    if (genes.includes('spike')) {
        gCtx.fillStyle = '#66bb6a'; gCtx.fillRect(-2, -bodyH - 10, 4, 8); gCtx.fillRect(-1, -bodyH - 14, 2, 5);
    }
    // Acid drips
    if (genes.includes('acid')) {
        gCtx.fillStyle = '#cddc39';
        for (let adi = 0; adi < 4; adi++) {
            const adx = -9 + adi * 6, ady = bodyH - 2;
            gCtx.beginPath(); gCtx.arc(adx, ady + 2, 2, 0, Math.PI * 2); gCtx.fill();
        }
    }
    // Regen heart
    if (genes.includes('regen')) {
        gCtx.fillStyle = '#f48fb1'; gCtx.font = '9px serif'; gCtx.textAlign = 'center'; gCtx.fillText('♥', bodyW - 2, -bodyH + 2);
    }
    // Toxin cloud tint
    if (genes.includes('toxin')) {
        gCtx.strokeStyle = 'rgba(165,214,167,0.5)'; gCtx.lineWidth = 2;
        gCtx.beginPath(); gCtx.ellipse(0, 2, bodyW + 8, bodyH + 8, 0, 0, Math.PI * 2); gCtx.stroke();
    }
    gCtx.restore();
}

function selectGene(id) {
    const p = state.player;
    const gene = BLOB_GENES.find(g => g.id === id);
    if (!gene || p.blobGenes.includes(id)) return;
    p.blobGenes.push(id);

    // Apply immediate stat effects
    if (id === 'spike') { p.damageMult = (p.damageMult || 1) * 1.25; }
    if (id === 'eye') { p.attackRangeBonus = (p.attackRangeBonus || 0) + 30; }
    if (id === 'armor') { const b = Math.round(p.maxHp * 0.4); p.maxHp += b; p.hp = Math.min(p.maxHp, p.hp + b); }
    if (id === 'cilia') { p.speed *= 1.35; }
    if (id === 'macro') { p.sizeScale = (p.sizeScale || 1) * 1.6; const b = Math.round(p.maxHp * 0.6); p.maxHp += b; p.hp = Math.min(p.maxHp, p.hp + b); }
    if (id === 'acid') {
        // Give blob acid projectile in slot 2
        if (!p.ownedWeapons.includes('blobAcid')) {
            p.ownedWeapons.push('blobAcid');
            p.weaponDurability = p.weaponDurability || {};
            p.weaponDurability['blobAcid'] = ALL_WEAPONS.blobAcid.maxDurability;
            p.weaponSlots[2] = 'blobAcid';
        }
    }
    showNotif('Gene equipped: ' + gene.name + '!');

    // Check macro unlock (equip 4 genes)
    if (p.blobGenes.length >= 4 && !p.blobGeneUnlocks['blobEquip4']) {
        p.blobGeneUnlocks['blobEquip4'] = true;
        showNotif('Macro Cell gene unlocked!');
    }

    document.getElementById('gene-overlay').classList.add('hidden');
    state.pendingUpgradeCount = Math.max(0, state.pendingUpgradeCount - 1);
    if (state.pendingUpgradeCount > 0) {
        showGeneUI();
    } else {
        state.upgradeOpen = false; state.paused = false;
    }
    updateUpgradeButton();
}

function updateSkillBtn() {
    const btn = document.getElementById('skill-tree-btn');
    if (!btn) return;
    const p = state.player;
    if (p.skillPoints > 0) {
        btn.classList.remove('hidden');
        btn.classList.add('pulsing');
        btn.innerText = '✦ SKILLS (' + p.skillPoints + ')';
    } else {
        btn.classList.remove('pulsing');
        btn.classList.add('hidden');
    }
}

function purchaseSkill(id) {
    const p = state.player;
    const skill = SKILL_TREE[id];
    if (!skill) return;
    if (p.skillPoints <= 0) return;
    if (p.skills[id]) return;
    if (skill.req && !p.skills[skill.req]) return;
    p.skills[id] = true;
    p.skillPoints--;
    // Apply immediate stat effects
    if (id === 'keen_edge')    p.damageMult = (p.damageMult || 1) + 0.08;
    if (id === 'quick_strike') p.attackSpeedMult = (p.attackSpeedMult || 1) * 0.88;
    if (id === 'crit_eye')     p.skillCritChance = (p.skillCritChance || 0) + 0.07;
    if (id === 'iron_hide')    { p.maxHp += 20; p.hp = Math.min(p.hp + 20, p.maxHp); }
    if (id === 'life_tap')     p.lifeStealBonus = (p.lifeStealBonus || 0) + 0.03;
    if (id === 'prospector')   p.goldMult = (p.goldMult || 1) * 1.20;
    if (id === 'hustle')       p.speed += 0.35;
    if (id === 'wide_arc')     p.attackRangeBonus = (p.attackRangeBonus || 0) + 20;
    if (id === 'momentum')     p.hasMomentum = true;
    // pathfinder: checked via p.skills.pathfinder — no extra flag needed
    showNotif(skill.name + ' unlocked!');
    updateSkillBtn();
    renderSkillTree();
}

function renderSkillTree() {
    const overlay = document.getElementById('skill-tree-overlay');
    if (!overlay) return;
    const p = state.player;
    const label = document.getElementById('skill-pts-label');
    if (label) label.innerText = 'Skill Points: ' + p.skillPoints + '  |  Level ' + p.xpLevel;
    overlay.querySelectorAll('.skill-card').forEach(card => {
        const id = card.dataset.skill;
        if (!id || !SKILL_TREE[id]) return;
        const sk = SKILL_TREE[id];
        const owned = !!p.skills[id];
        const locked = sk.req && !p.skills[sk.req];
        const canBuy = !owned && !locked && p.skillPoints > 0;
        card.className = 'skill-card' + (owned ? ' owned' : locked ? ' locked' : canBuy ? ' available' : '');
        card.onclick = canBuy ? () => purchaseSkill(id) : null;
    });
}

function applyUpgrade(id) {
    const p = state.player;
    if (id === 'extraSlot') { p.maxUpgrades = Math.min(9, (p.maxUpgrades || 6) + 1); }
    if (id === 'speedBoost') p.speed = 3 * (1 + 0.3 * (1 + (p.upgradeLevels[id] || 0) * 0.15));
    if (id === 'big') {
        const bigLvl = p.upgradeLevels['big'] || 0;
        if (bigLvl === 0) {
            p.sizeScale = 2;
            p.maxHp = Math.round(p.maxHp * 2);
            p.hp = Math.min(Math.round(p.hp * 2), p.maxHp);
            p.damageMult = (p.damageMult || 1) * 2;
            p.speed = Math.max(1.2, p.speed * 0.4);
        } else {
            p.maxHp += 60; p.hp = Math.min(p.hp + 60, p.maxHp); p.damageMult += 0.3;
        }
    }
}

function hasUpgrade(id) { return state.player.upgrades.includes(id); }
function upgradeLevel(id) { return state.player.upgradeLevels[id] || 0; }
function nightMult() { return state.dayNight.phase === 'night' ? 1.3 : 1.0; }

