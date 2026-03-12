// ─── PET EVOLUTION HELPERS ───
// Returns the current leaf/branch node based on the player's chosen branches.
function getPetNode(pet, branches) {
    const tree = PET_EVOLUTIONS[pet];
    if (!tree) return null;
    const b0 = branches[0], b1 = branches[1], b2 = branches[2];
    if (!b0) return null;
    const n0 = tree[b0 - 1];
    if (!b1) return n0;
    const n1 = n0.branches[b1 - 1];
    if (!b2) return n1;
    return n1.branches[b2 - 1];
}
// Returns true if the player's branches match (b1,b2,b3). Pass 0 to match any.
function petBranchIs(b1, b2, b3) {
    const pb = state.player.petBranch;
    return (!b1 || pb[0] === b1) && (!b2 || pb[1] === b2) && (!b3 || pb[2] === b3);
}
// How many branch choices the player has made (0-3).
function petDepth() {
    const pb = state.player.petBranch;
    if (!pb[0]) return 0; if (!pb[1]) return 1; if (!pb[2]) return 2; return 3;
}

// ─── PET ACTION CONFIG ───
// Each pet has a base action threshold for first upgrade; doubles each evolution.
const PET_ACTION_CONFIG = {
    dog:     { base: 200, label: 'Gold Fetched' },
    cat:     { base: 50,  label: 'Projectiles Dodged' },
    chicken: { base: 20,  label: 'Eggs Detonated' },
    rabbit:  { base: 30,  label: 'Dashes' },
    snake:   { base: 50,  label: 'Enemies Poisoned' },
    bird:    { base: 40,  label: 'Storm Strikes' },
    hamster: { base: 80,  label: 'Bonus Gold Hoarded' },
    turtle:  { base: 30,  label: 'Hits Absorbed' },
};
function getPetActionThreshold(pet, level) {
    const cfg = PET_ACTION_CONFIG[pet];
    if (!cfg) return 999999;
    return Math.round(cfg.base * Math.pow(2, level));
}
function addPetAction(amount) {
    const p = state.player;
    if (!p.pet || p.petUpgradeReady || p.petEvolveLevel >= 10) return;
    p.petActionCount += (amount || 1);
    if (p.petActionThreshold > 0 && p.petActionCount >= p.petActionThreshold) {
        p.petUpgradeReady = true;
        updatePetUpgradeButton();
        showNotif('PET UPGRADE READY!');
    }
}
function updatePetUpgradeButton() {
    const p = state.player;
    const btn = document.getElementById('pet-upgrade-btn');
    if (!btn) return;
    if (p.pet && p.petUpgradeReady && p.petEvolveLevel < 10) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
}
