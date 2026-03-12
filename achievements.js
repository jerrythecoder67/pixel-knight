// ─── ACHIEVEMENT SYSTEM ───
function grantAchievement(id) {
    if (persist.achievements[id]) return;
    persist.achievements[id] = true;
    const ach = ACHIEVEMENTS[id];
    if (ach.reward) {
        if (ach.reward.startsWith('pet:')) {
            const petKey = ach.reward.slice(4);
            if (!persist.unlockedPets.includes(petKey)) persist.unlockedPets.push(petKey);
            if (UNLOCKABLE_PETS[petKey]) PET_TYPES[petKey] = UNLOCKABLE_PETS[petKey];
        } else if (ach.reward.startsWith('char:')) {
            const charKey = ach.reward.slice(5);
            if (!persist.unlockedCharacters.includes(charKey)) persist.unlockedCharacters.push(charKey);
        }
    }
    savePersist(persist);
    state.achievementsThisRun.push(id);
    buildPetOverlay();
    showNotif(ach.icon + ' ACHIEVEMENT: ' + ach.name + '!', true);
}

function checkAchievements() {
    if (state.gameOver) return;
    const p = state.player;
    if (!persist.achievements.millionaire    && persist.lifetimeGold >= 1e6)   grantAchievement('millionaire');
    if (!persist.achievements.mrBeast        && persist.lifetimeGold >= 1e9)   grantAchievement('mrBeast');
    if (!persist.achievements.richestMan     && persist.lifetimeGold >= 1e12)  grantAchievement('richestMan');
    if (!persist.achievements.monsterSlayer  && p.kills >= 1000) grantAchievement('monsterSlayer');
    if (!persist.achievements.pacifist && state.pacifistTimer >= 18000) grantAchievement('pacifist'); // 5 minutes
    if (!persist.achievements.survivalist && state.dayNight.dayCount >= 11) grantAchievement('survivalist');
    if (!persist.achievements.blessed && state.runAngelHeals >= 6) grantAchievement('blessed');
    if (!persist.achievements.shadowDemonSlayer && state.runShadowDemonsKilled >= 3) grantAchievement('shadowDemonSlayer');
    if (!persist.achievements.webbed && state.webbedTimer >= 1800) grantAchievement('webbed');
    if (!persist.achievements.gearedUp) {
        const a = p.armor;
        if (a.helmet && a.chest && a.leggings && a.boots) grantAchievement('gearedUp');
    }
    if (!persist.achievements.hoarder) {
        if (p.maxWeaponSlots >= 5) {
            let filled = true;
            for (let s = 1; s <= 5; s++) { if (!p.weaponSlots[s]) { filled = false; break; } }
            if (filled) grantAchievement('hoarder');
        }
    }
}


function resetProgress() {
    const confirmed = confirm('Reset ALL progress? Achievements, unlocked pets, and characters will be deleted. This cannot be undone!');
    if (!confirmed) return;
    localStorage.removeItem(PERSIST_KEY);
    localStorage.removeItem('pixelKnightBest');
    location.reload();
}

function openAchievementsPanel() {
    const div = document.getElementById('ach-panel-list');
    div.innerHTML = Object.entries(ACHIEVEMENTS).map(([id, a]) => {
        const earned = persist.achievements[id];
        return '<div class="ach-entry' + (earned ? ' ach-earned' : ' ach-locked') + '">' +
            '<span class="ach-icon">' + (earned ? a.icon : '?') + '</span>' +
            '<span class="ach-info"><b>' + (earned ? a.name : '???') + '</b><br>' +
            (earned ? a.desc : 'Not yet unlocked') + '</span></div>';
    }).join('');
    document.getElementById('ach-panel').classList.remove('hidden');
}

function togglePause() {
    if (state.gameOver || state.upgradeOpen || state.evolveOpen || state.petEvolveOpen || state.shopOpen || state.skillTreeOpen || state.characterSelectOpen || !state.difficulty) return;
    const el = document.getElementById('pause-overlay');
    if (el.classList.contains('hidden')) {
        state.paused = true; el.classList.remove('hidden');
        const p = state.player;
        if (p.pet) {
            const pd = PET_TYPES[p.pet];
            const leafNode = getPetNode(p.pet, p.petBranch);
            const pathLabel = leafNode ? ' [' + leafNode.name + ']' : (p.petBranch[0] ? ' [' + PET_EVOLUTIONS[p.pet][p.petBranch[0]-1].name + ']' : '');
            document.getElementById('pause-pet-label').innerText = pd.icon + ' ' + pd.name + pathLabel + ' Lv.' + (p.petLevel + 1);
        } else {
            document.getElementById('pause-pet-label').innerText = '';
        }
    } else {
        state.paused = false; el.classList.add('hidden');
    }
}
document.getElementById('pause-btn').addEventListener('click', () => togglePause());
document.getElementById('pause-resume-btn').addEventListener('click', () => togglePause());
document.getElementById('pause-shop-btn').addEventListener('click', () => {
    document.getElementById('pause-overlay').classList.add('hidden');
    state.paused = false;
    toggleShop();
});
document.getElementById('pause-quit-btn').addEventListener('click', () => {
    document.getElementById('pause-overlay').classList.add('hidden');
    endGame();
});

