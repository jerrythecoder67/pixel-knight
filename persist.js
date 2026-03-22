// ─── PERSISTENT STORAGE ───
const PERSIST_KEY = 'pixelKnightPersist';
const PERSIST_DEFAULT = {
    achievements: {}, unlockedPets: [], unlockedCharacters: [],
    mergedPetConfig: null, selectedCharacter: 'knight', selectedSkin: 'default',
    bestDay: 0, bestWave: 0, lifetimeGold: 0, lifetimeKills: 0, totalRuns: 0,
    knightEasyWins: 0, totalShopPurchases: 0, fatCrocKills: 0,
    lifetimeTames: 0,
    clownBalls: [],
    pirateRun: { bones: 0, crocKills: 0, sharkKills: 0 },
    totalLosses: 0,
    fossilPos: null,
    runHistory: [],
    seenEnemies: {},
    leaderboard: [], endlessLeaderboard: [] // endlessLeaderboard kept for backwards compat
};
function loadPersist() {
    try { return Object.assign({}, PERSIST_DEFAULT, JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}')); }
    catch(e) { return Object.assign({}, PERSIST_DEFAULT); }
}
function savePersist(data) { localStorage.setItem(PERSIST_KEY, JSON.stringify(data)); }
const persist = loadPersist();
// Register unlocked pets into PET_TYPES on load
persist.unlockedPets.forEach(key => { if (UNLOCKABLE_PETS[key]) PET_TYPES[key] = UNLOCKABLE_PETS[key]; });

// Pet evolution: 3-level branching tree. petBranch[0/1/2] = chosen branch at each depth (1/2/3, 0=not chosen).
// petEvolveLevel = total tiers unlocked (0-10). First 3 are the 3 branch choices; tiers 4-10 are deep upgrades.
