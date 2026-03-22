function selectPet(key) {
    // Close shop if open during pet selection (fixes the glitch)
    if (state.shopOpen) { state.shopOpen = false; document.getElementById('shop-overlay').classList.add('hidden'); }
    state.player.pet = key;
    state.player.chickenTimer = 300;
    state.player.rabbitInvTimer = 0;
    state.player.hamsterBurst = 0;
    state.player.hamsterMoveTimer = 0;
    state.player.hamsterCheeks = 0;
    state.player.parrotTimer = 0;
    state.player.petActionCount = 0;
    state.player.petActionThreshold = getPetActionThreshold(key, 0);
    state.player.petUpgradeReady = false;
    updatePetUpgradeButton();
    document.getElementById('pet-overlay').classList.add('hidden');
    // Reset world flags before applying character bonuses (so char bonuses can set them)
    state.sailorWorld = false;
    state.alienWorld = false;
    state.dinoWorld = false;
    state.stickWorld = false;
    // Apply character bonuses now that all selections are done, then start game
    applyCharacterBonuses();
    updateWeaponHUD();
    state.waveAllSpawned = false;
    state.paused = false;
    state.barricades = [];
    state.skeletonWarriors = [];
    state.shopLocks = {};
    state.shopLockedPrices = {};
    state.killedByCroc = false;
    state.killedBySalamander = false;
    state.mapVariant = 'normal';
    state.activeEvent = null;
    state._eclipseActive = false; state._bloodMoonActive = false; state._earthquakeActive = false;
    state._meteorActive = false; state._healSpringActive = false; state._frostActive = false;
    state.weather = { stage: 0, wavesLeft: 0, extreme: null, rainParticles: [], lightningFlash: 0, tornadoX: WORLD_W/2, tornadoY: WORLD_H/2 };
    state.dragonRitualInLava = false;
    state.dragonRitualCrocHit = false;
    state.hasRubixCube = false;
    state.slipperyPatches = [];
    state.janitorPickupWindow = [];
    // Notify if wizard trial is active
    if (state.wizardTrialActive) {
        setTimeout(() => showNotif('⚡ WIZARD TRIAL: Reach Wave ' + state.wizardTrialWaveTarget + ' to unlock!', true), 500);
    }
    // Reset wizard rune state
    if (state.player.character === 'wizard') {
        state.player.mana = 0;
        state.player.manaRegen = 0.12;
        state.player.manaStacks = 1;
        // Give starting fireball if no runes owned
        if (Object.keys(state.player.ownedRunes || {}).length === 0) {
            state.player.ownedRunes = { fireball: true };
            state.player.runeDurability = { fireball: RUNES['fireball'].maxCharges };
            state.player.runeSlots = { 1: 'fireball', 2: null, 3: null, 4: null };
        }
    }
    persist.hasPlayed = true; savePersist(persist);
    state.runStartTime = Date.now();
    document.getElementById('right-panel').classList.remove('hidden');
    spawnCrocodiles();
    spawnSalamanders();
    spawnFishAndSharks();
    // Dino world: rocky badlands terrain (paleontologist OR dinosaur character)
    if (state.player.charPaleo || state.player.charDinosaur) {
        state.dinoWorld = true;
        applyDinoWorldTerrain();
    }
    // Apply sailor/pirate world BEFORE spawnTrees so trees filter correctly
    if (state.player.charSailor || state.player.charPirate) {
        state.sailorWorld = true;
        applySailorWorldTerrain();
        // In sailor world crocs don't exist — replace with land crabs
        state.crocodiles = [];
        spawnCrabs();
    }
    if (state.player.charAlien || state.player.charAstronaut) {
        state.alienWorld = true;
        // Explorers replace crocs and salas in alien world
        state.crocodiles = [];
        state.salamanders = [];
        spawnAlienExplorers();
        spawnHumanExplorers();
        // Astronaut: marines are allies, aliens are much harder
        if (state.player.charAstronaut) {
            state.humanExplorers.forEach(h => { h.isAlly = true; });
            state.alienExplorers.forEach(a => { a.hp *= 2; a.maxHp = a.hp; a.damage *= 2; a.speed *= 1.5; });
        }
    }
    // Map variant selection (before spawnTrees so water tiles filter correctly)
    // In MP host mode: skip random roll — host applies the variant in mpStartGame() after lobby.
    // In MP guest mode: variant is applied in mpGuestStartGame().
    if (typeof MP === 'undefined' || !state.mpMode) {
        const vRoll = Math.random();
        if (vRoll < 0.50)       { state.mapVariant = 'normal'; }
        else if (vRoll < 0.667) { state.mapVariant = 'island';  applyIslandVariant(); }
        else if (vRoll < 0.833) { state.mapVariant = 'canyon';  applyCanyonVariant(); }
        else                    { state.mapVariant = 'cave';    applyCaveVariant(); }
        if (state.mapVariant === 'cave') {
            state.dayNight.phase = 'day';
            state.dayNight.alpha = 0.45;
            state.dayNight.timer = 999999999;
            state.dayNight.eveningShown = true;
            showNotif('The cave is silent. Only stone and fire remain.');
        } else if (state.mapVariant === 'island') {
            showNotif('Island world — deep water surrounds the land.');
        } else if (state.mapVariant === 'canyon') {
            showNotif('Canyon world — a great chasm splits the earth.');
        }
    }
    spawnTrees();
    // Build wave queue AFTER all world flags are set (alien/sailor world affects enemy types)
    state.waveSpawnQueue = buildWaveQueue(false);
    showNotif(PET_TYPES[key].icon + ' ' + PET_TYPES[key].name + ' joined you!');
    // Multiplayer: pause and show create/join choice instead of starting immediately
    if (state.mpMode) { mpShowChoice(); return; }
}

function selectDifficulty(key) {
    const d = DIFFICULTY_SETTINGS[key];
    state.difficulty = key;
    state.diffMult = d;
    const p = state.player;
    p.maxHp = Math.round(100 * d.playerHpMult);
    p.hp = p.maxHp;
    document.getElementById('difficulty-overlay').classList.add('hidden');
    _audio.startMusic();
    openCharacterSelect();
    showNotif('Difficulty: ' + d.label + '!');
}

// ─── CHARACTER SELECT ───
function buildPetOverlay() {
    const div = document.getElementById('pet-choices');
    div.innerHTML = '';
    const basePets = ['dog','cat','chicken','rabbit','snake','bird','hamster','turtle'];
    basePets.forEach(pet => {
        const t = PET_TYPES[pet];
        const btn = document.createElement('button');
        btn.className = 'diff-btn pet-' + pet;
        btn.innerHTML = t.icon + ' ' + t.name.toUpperCase() + '<br><span>' + t.desc + '</span>';
        btn.addEventListener('click', () => selectPet(pet));
        div.appendChild(btn);
    });
    persist.unlockedPets.forEach(pet => {
        const t = UNLOCKABLE_PETS[pet];
        if (!t) return;
        const btn = document.createElement('button');
        btn.className = 'diff-btn pet-unlockable';
        btn.innerHTML = t.icon + ' ' + t.name.toUpperCase() + '<br><span>' + t.desc + '</span>';
        btn.addEventListener('click', () => selectPet(pet));
        div.appendChild(btn);
    });
}

function isCharacterUnlocked(key) {
    const def = CHARACTERS[key];
    if (!def || !def.unlock) return true;
    if (def.unlock === 'custom') return persist.unlockedCharacters.includes(key);
    return !!persist.achievements[def.unlock];
}

// Character-specific color palettes for preview canvas
const CHAR_COLORS = {
    knight:       { body: '#8b0000', legs: '#555',    boots: '#3e2723', helm: '#546e7a', visor: '#1de9b6', accent: '#ff3e3e' },
    hoarder:      { body: '#5d4037', legs: '#4e342e', boots: '#3e2723', helm: '#6d4c41', visor: '#a1887f', accent: '#ffd54f' },
    reaper:       { body: '#1a0a2e', legs: '#0d0520', boots: '#0a0315', helm: '#2a0a3a', visor: '#7b00d4', accent: '#cc00ff' },
    fat:          { body: '#bf360c', legs: '#8d1600', boots: '#6d1e0c', helm: '#e64a19', visor: '#ffab91', accent: '#ff6d00' },
    collector:    { body: '#1565c0', legs: '#0d47a1', boots: '#0a3570', helm: '#1976d2', visor: '#82b1ff', accent: '#64b5f6' },
    archer:       { body: '#2e7d32', legs: '#1b5e20', boots: '#1a4c1e', helm: '#388e3c', visor: '#69f0ae', accent: '#00e676' },
    monsterTamer: { body: '#6a1b9a', legs: '#4a148c', boots: '#38006b', helm: '#7b1fa2', visor: '#ce93d8', accent: '#e040fb' },
    fashionModel: { body: '#c2185b', legs: '#880e4f', boots: '#6a0f38', helm: '#e91e63', visor: '#ff80ab', accent: '#ff4081' },
    vampire:      { body: '#1a0030', legs: '#0d0020', boots: '#0a0015', helm: '#2d004d', visor: '#9c00cc', accent: '#cc00ff' },
    rogue:        { body: '#263238', legs: '#1c262b', boots: '#111', helm: '#37474f', visor: '#00bcd4', accent: '#00e5ff' },
    wizard:       { body: '#0d47a1', legs: '#1565c0', boots: '#0a3570', helm: '#1976d2', visor: '#e3f2fd', accent: '#40c4ff' },
    gambler:      { body: '#b71c1c', legs: '#7f0000', boots: '#5a0000', helm: '#c62828', visor: '#ffd700', accent: '#ffab00' },
    librarian:    { body: '#4e342e', legs: '#3e2723', boots: '#1a1a1a', helm: '#6d4c41', visor: '#ffe082', accent: '#ffd54f' },
    shopper:      { body: '#00838f', legs: '#006064', boots: '#004d40', helm: '#00acc1', visor: '#e0f7fa', accent: '#80deea' },
    gamer:        { body: '#1a237e', legs: '#0d1b6e', boots: '#0a1550', helm: '#283593', visor: '#00e5ff', accent: '#18ffff' },
    angel:        { body: '#f5f5f5', legs: '#e0e0e0', boots: '#bdbdbd', helm: '#fafafa', visor: '#fff9c4', accent: '#ffe082' },
    diver:        { body: '#01579b', legs: '#0277bd', boots: '#01579b', helm: '#0288d1', visor: '#b3e5fc', accent: '#40c4ff' },
    dinosaur:     { body: '#33691e', legs: '#1b5e20', boots: '#1a3d10', helm: '#558b2f', visor: '#ccff90', accent: '#76ff03' },
    demon:        { body: '#b71c1c', legs: '#7f0000', boots: '#4e0000', helm: '#c62828', visor: '#ff6d00', accent: '#ff1744' },
    alien:        { body: '#00695c', legs: '#004d40', boots: '#00251a', helm: '#00897b', visor: '#b2dfdb', accent: '#1de9b6' },
    monsterChar:  { body: '#4a148c', legs: '#38006b', boots: '#1a0030', helm: '#6a1b9a', visor: '#ea80fc', accent: '#e040fb' },
    dragon:       { body: '#b71c1c', legs: '#7f0000', boots: '#4a0000', helm: '#c62828', visor: '#ffcc02', accent: '#ff6d00' },
    rich:         { body: '#f57f17', legs: '#e65100', boots: '#bf360c', helm: '#f9a825', visor: '#fff9c4', accent: '#ffd600' },
    blob:         { body: '#558b2f', legs: '#33691e', boots: '#1b5e20', helm: '#7cb342', visor: '#ccff90', accent: '#76ff03' },
};

function drawCharPreview(canvas, charKey, isLocked) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.save();
    c.translate(canvas.width / 2, 50);
    const s = 1.2;
    const F = (clr) => isLocked ? '#1a1a20' : clr;
    const R = (x, y, w, h, clr) => { c.fillStyle = F(clr); c.fillRect(x*s, y*s, w*s, h*s); };

    // ── Shared base-body helpers (knight proportions) ──
    function legs(pClr, lbClr, rbClr) {
        R(-4,8,3,6,pClr); R(1,8,3,6,pClr);
        R(-5,14,4,3,lbClr); R(1,14,4,3,rbClr);
    }
    function arms(aClr) { R(-8,-4,3,10,aClr); R(5,-4,3,10,aClr); }
    function body(bClr) { R(-5,-8,10,16,bClr); }
    function helm(hClr, vClr, pClr) {
        R(-5,-20,10,12,hClr);
        if (vClr) R(-4,-16,8,2,vClr);
        if (pClr) R(-1,-22,2,4,pClr);
    }
    function sword() { R(9,-12,2,17,'#b0bec5'); R(8,-5,5,2,'#8b0000'); }
    function shield() { R(-15,-8,5,11,'#8b0000'); R(-14,-5,3,5,'#c62828'); R(-13,-8,1,11,'#c62828'); }
    function face(skinClr, hairClr) {
        R(-5,-20,10,12,skinClr);          // face block
        R(-5,-20,10,3,hairClr);           // hair top
        R(-3,-14,2,2,'#3e2723'); R(1,-14,2,2,'#3e2723'); // eyes
    }

    switch (charKey) {
        case 'knight': {
            sword();
            shield();
            R(-5,12,4,3,'#37474f'); R(1,12,4,3,'#37474f');
            R(-4,8,3,6,'#455a64'); R(1,8,3,6,'#455a64');
            R(-5,-8,10,16,'#546e7a');
            R(-9,-8,4,3,'#455a64'); R(5,-8,4,3,'#455a64');
            R(-9,-4,4,10,'#455a64'); R(5,-4,4,10,'#455a64');
            R(-6,-14,12,2,'#455a64'); R(-5,-20,10,8,'#546e7a');
            R(-4,-16,8,2,'#1de9b6'); R(-1,-22,2,6,'#c62828');
            break;
        }
        case 'hoarder': {
            // backpack (right side)
            R(4,-9,7,14,'#5d4037'); R(9,-9,1,14,'#4e342e');
            // items sticking out of backpack
            R(10,-12,2,15,'#795548'); R(10,-13,5,4,'#78909c');
            // left sword hanging
            R(-12,-12,2,16,'#b0bec5'); R(-13,-5,4,2,'#8b0000');
            // right sword (held)
            sword();
            // mismatched boots
            R(-5,12,4,3,'#3e2723'); R(1,12,4,3,'#455a64');
            R(-4,8,3,6,'#4e342e'); R(1,8,3,6,'#455a64');
            R(-5,-8,10,16,'#6d4c41');
            R(-8,-4,3,10,'#5d4037'); R(5,-4,3,10,'#5d4037');
            R(-5,-14,10,10,'#d4956a');
            R(-3,-12,2,2,'#3e2723'); R(1,-12,2,2,'#3e2723');
            // 3 stacked hats (smallest on top)
            R(-5,-16,10,3,'#5d4037');
            R(-4,-20,8,5,'#6d4c41');
            R(-3,-23,6,4,'#4e342e');
            R(-2,-26,4,4,'#5d4037');
            R(-4,-17,8,2,'#ffd54f');
            break;
        }
        case 'reaper': {
            // scythe handle (left side, tall)
            R(-13,-30,2,40,'#5d4037');
            // scythe blade (L-shape at top)
            R(-13,-30,14,3,'#78909c');
            R(-13,-33,4,6,'#90a4ae');
            R(0,-30,2,5,'#607d8b');
            // cloak body (narrower)
            R(-9,-6,18,8,'#1a0a2e');
            R(-10,2,20,8,'#0d0520');
            R(-11,10,22,5,'#080315');
            R(-6,-6,12,6,'#140820');
            // hood back/top (distinct purple, drawn before skull)
            R(-6,-24,12,6,'#2a0040');
            // skull shifted down — sits at same height as knight helm (y=-20 to y=-9)
            R(-4,-20,8,11,'#dde0d0');
            R(-4,-20,8,3,'#c8ccc0');
            // eye sockets
            R(-3,-16,2,3,'#1a0a2e'); R(1,-16,2,3,'#1a0a2e');
            R(-1,-13,2,2,'#c8ccc0');
            // teeth
            R(-3,-10,2,2,'#dde0d0'); R(-1,-10,2,2,'#dde0d0'); R(1,-10,2,2,'#dde0d0');
            // hood side panels: y=-20, h=14 → reaches cloak body at y=-6
            R(-7,-20,3,14,'#2a0040');
            R(4,-20,3,14,'#2a0040');
            break;
        }
        case 'fat': {
            // fat sword (right, wider)
            R(13,-10,3,17,'#b0bec5'); R(12,-4,6,2,'#8b0000');
            shield();
            // wide boots
            R(-8,13,6,3,'#37474f'); R(2,13,6,3,'#37474f');
            // wide legs
            R(-7,8,5,7,'#455a64'); R(2,8,5,7,'#455a64');
            // fat body (20 wide)
            R(-10,-8,20,16,'#546e7a');
            // shoulder pads (wider, further out)
            R(-14,-8,5,3,'#455a64'); R(9,-8,5,3,'#455a64');
            // fat arms
            R(-14,-4,5,10,'#455a64'); R(9,-4,5,10,'#455a64');
            // neck collar
            R(-8,-14,16,2,'#455a64');
            // fat helmet (16 wide)
            R(-8,-20,16,8,'#546e7a');
            R(-7,-16,14,2,'#1de9b6');
            R(-1,-22,2,6,'#c62828');
            // fat gorget/neck (fills gap y=-12 to y=-8)
            R(-6,-12,12,4,'#455a64');
            break;
        }
        case 'collector': {
            sword();
            // magnifying glass (left hand) — rect-based lens
            R(-15,-8,5,2,'#795548');
            R(-17,-12,9,9,'#90a4ae');
            R(-16,-11,7,7,'#e3f2fd');
            R(-14,-10,3,3,'#bbdefb');
            // boots (brown)
            R(-5,12,4,3,'#5d4037'); R(1,12,4,3,'#5d4037');
            // legs (jeans)
            R(-4,8,3,6,'#1565c0'); R(1,8,3,6,'#1565c0');
            // neck
            R(-3,-8,6,2,'#ffb74d');
            // body (t-shirt)
            R(-5,-8,10,16,'#42a5f5');
            // arms (skin)
            R(-8,-4,3,10,'#ffb74d'); R(5,-4,3,10,'#ffb74d');
            // face (skin)
            R(-5,-20,10,12,'#ffb74d');
            // hair (brown)
            R(-5,-20,10,3,'#5d4037');
            // glasses
            R(-4,-14,3,3,'#90a4ae'); R(0,-14,3,3,'#90a4ae'); R(-1,-13,2,1,'#90a4ae');
            // eyes through glasses
            R(-3,-13,2,2,'#000'); R(1,-13,2,2,'#000');
            break;
        }
        case 'archer': {
            // quiver (right back) with arrow shafts
            R(6,-12,4,15,'#795548');
            R(7,-15,1,5,'#a5d6a7'); R(8,-17,1,6,'#a5d6a7'); R(9,-14,1,4,'#a5d6a7');
            // bow (left side, rect approximation)
            R(-16,-14,3,4,'#8d6e63');
            R(-17,-10,2,14,'#8d6e63');
            R(-16,4,3,4,'#8d6e63');
            // bowstring
            R(-14,-10,1,14,'#d4d4aa');
            // nocked arrow (horizontal)
            R(-13,-1,18,1,'#a5d6a7');
            // boots
            R(-5,12,4,3,'#4e342e'); R(1,12,4,3,'#4e342e');
            // legs (brown padded)
            R(-4,8,3,6,'#795548'); R(1,8,3,6,'#795548');
            // neck (fills gap y=-10 to y=-8)
            R(-3,-10,6,2,'#ffb74d');
            // body (dark green shirt)
            R(-5,-8,10,16,'#2e7d32');
            R(-8,-4,3,10,'#2e7d32'); R(5,-4,3,10,'#2e7d32');
            // face
            R(-5,-20,10,10,'#ffb74d');
            R(-3,-14,2,2,'#000'); R(1,-14,2,2,'#000');
            // green hat (wide brim + crown)
            R(-7,-20,14,3,'#1b5e20');
            R(-4,-26,8,8,'#2e7d32');
            break;
        }
        case 'monsterTamer': {
            // whip (right arm, zigzag of rects)
            R(7,-2,4,2,'#795548');
            R(11,0,3,2,'#8d6e63'); R(14,2,3,2,'#795548'); R(17,4,2,2,'#6d4c41');
            // wide brim ranger hat
            R(-9,-18,18,2,'#5d4037');
            R(-5,-26,10,10,'#4e342e');
            R(-4,-27,8,2,'#795548');
            // boots
            R(-5,12,4,3,'#4e342e'); R(1,12,4,3,'#4e342e');
            R(-4,8,3,6,'#795548'); R(1,8,3,6,'#795548');
            // neck
            R(-3,-8,5,2,'#ffb74d');
            // body (shirt + vest)
            R(-5,-8,10,16,'#5d4037');
            R(-3,-6,6,12,'#3e2723');
            R(-8,-4,3,10,'#6d4c41'); R(5,-4,3,10,'#6d4c41');
            // face
            R(-5,-18,10,10,'#ffb74d');
            R(-5,-18,10,2,'#5d4037');
            R(-3,-13,2,2,'#000'); R(1,-13,2,2,'#000');
            break;
        }
        case 'fashionModel': {
            // microphone (left hand, held high)
            R(-12,-18,2,16,'#9e9e9e');  // handle
            R(-14,-22,6,5,'#424242');   // mic head (dark)
            R(-13,-21,4,3,'#bdbdbd');   // mic grill
            // sparkle crosses (repositioned to visible area)
            R(-17,-7,1,4,'#ffd700'); R(-19,-5,4,1,'#ffd700');
            R(13,-7,1,4,'#ffd700'); R(11,-5,4,1,'#ffd700');
            // neck
            R(-2,-8,4,2,'#ffb74d');
            // elegant dress torso (V-neck)
            R(-5,-8,10,11,'#c2185b');
            R(-3,-8,6,4,'#ad1457');     // V-neck shadow
            R(-1,-8,2,8,'#ad1457');     // center seam
            // glitter dots
            R(-4,-5,2,2,'#f48fb1'); R(2,-5,2,2,'#f48fb1');
            R(-3,-1,2,2,'#f8bbd0'); R(1,-1,2,2,'#f8bbd0');
            // arms (slender, skin tone)
            R(-8,-6,3,9,'#ffb74d'); R(5,-6,3,9,'#ffb74d');
            // face (prominent features)
            R(-5,-20,10,12,'#ffb74d');
            // eyes with lashes
            R(-4,-16,3,2,'#000'); R(1,-16,3,2,'#000'); // lashes top
            R(-4,-15,3,3,'#000'); R(1,-15,3,3,'#000'); // eyes
            R(-3,-14,1,1,'#4fc3f7'); R(2,-14,1,1,'#4fc3f7'); // iris highlight
            // red lips
            R(-3,-11,7,3,'#c2185b');
            R(-2,-11,5,1,'#f06292'); // upper lip highlight
            // blush marks
            R(-5,-13,2,1,'#f8bbd0'); R(3,-13,2,1,'#f8bbd0');
            // voluminous hair
            R(-7,-28,14,10,'#9c27b0');
            R(-8,-25,4,7,'#7b1fa2');   // left volume
            R(4,-25,4,7,'#7b1fa2');    // right volume
            R(-6,-32,12,6,'#ab47bc');  // top layer
            R(-4,-33,8,3,'#9c27b0');   // very top
            // hair highlight streak
            R(-2,-29,2,6,'#ce93d8');
            break;
        }
        case 'vampire': {
            // cloak arm panels (narrower)
            R(-11,-14,4,10,'#1a0030'); R(7,-14,4,10,'#1a0030');
            // cloak body (narrower)
            R(-8,-6,16,10,'#1a0030');
            R(-10,4,20,8,'#0d0020');
            R(-11,12,22,5,'#070010');
            R(-5,-6,10,8,'#7b0000');
            R(-4,-8,8,16,'#2d004d');
            R(-3,10,3,6,'#0d0020'); R(0,10,3,6,'#0d0020');
            R(-4,14,4,3,'#111'); R(1,14,4,3,'#111');
            // pale neck
            R(-2,-8,4,2,'#e8d8f0');
            // pale face (no hood)
            R(-5,-20,10,12,'#e8d8f0');
            R(-5,-20,10,3,'#111');
            // red eyes (rects, no arc)
            R(-3,-14,2,2,'#cc0000'); R(1,-14,2,2,'#cc0000');
            // fangs
            R(-2,-7,1,3,'#fff'); R(1,-7,1,3,'#fff');
            break;
        }
        case 'rogue': {
            // two daggers (axis-aligned)
            R(-12,-14,2,14,'#b0bec5'); R(-13,-7,4,2,'#37474f');
            R(10,-14,2,14,'#b0bec5'); R(9,-7,4,2,'#37474f');
            // dark cloak (no hood)
            R(-8,-22,16,16,'#1c262b');
            R(-10,-12,20,6,'#263238');
            R(-5,-8,10,16,'#37474f');
            R(-8,-4,3,10,'#263238'); R(5,-4,3,10,'#263238');
            R(-4,8,3,6,'#1c262b'); R(1,8,3,6,'#1c262b');
            R(-5,12,4,3,'#111'); R(1,12,4,3,'#111');
            // face
            R(-5,-20,10,12,'#ffb74d');
            R(-5,-20,10,3,'#1c262b');
            // glowing eyes (rect)
            R(-3,-14,2,2,'#00e5ff'); R(1,-14,2,2,'#00e5ff');
            // mask (lower face)
            R(-5,-12,10,4,'#263238');
            break;
        }
        case 'wizard': {
            // staff (left side, tall)
            R(-13,-28,2,38,'#5d4037');
            // staff orb (square, no arc)
            R(-16,-32,8,8,'#40c4ff');
            R(-15,-33,6,3,'#80d8ff');
            // wide robe
            R(-7,-8,14,18,'#0d47a1');
            R(-9,4,18,6,'#1565c0');
            R(-9,-4,2,12,'#0d47a1'); R(7,-4,2,12,'#0d47a1');
            // rune details
            R(-5,-4,2,2,'#40c4ff'); R(-5,-1,6,1,'#40c4ff');
            R(1,1,2,2,'#40c4ff'); R(1,4,5,1,'#40c4ff');
            // legs + boots
            R(-3,10,3,5,'#0a3570'); R(0,10,3,5,'#0a3570');
            R(-4,13,4,3,'#3e2723'); R(0,13,4,3,'#3e2723');
            // face
            // neck + wider face (10 wide, matching knight)
            R(-3,-8,6,2,'#ffb74d');
            R(-5,-14,10,8,'#ffb74d');
            R(-3,-12,2,2,'#000'); R(1,-12,2,2,'#000');
            R(-3,-10,7,3,'#e0e0e0');
            // tall wizard hat
            R(-9,-14,18,3,'#0d47a1');
            R(-7,-24,14,12,'#1565c0');
            R(-5,-32,10,10,'#0d47a1');
            R(-3,-36,6,6,'#0a3570');
            // star on hat (cross shape)
            R(-1,-30,2,6,'#ffd700'); R(-3,-28,6,2,'#ffd700');
            break;
        }
        case 'gambler': {
            // dice in right hand (rect dots, no arc)
            R(9,-2,8,8,'#fff');
            R(10,-1,6,6,'#f5f5f5');
            R(11,0,2,2,'#e53935'); R(14,0,2,2,'#e53935');
            R(12,2,2,2,'#e53935');
            R(11,4,2,2,'#e53935'); R(14,4,2,2,'#e53935');
            // Old West hat
            R(-9,-14,18,2,'#111');
            R(-6,-24,12,12,'#1a1a1a');
            R(-5,-25,10,3,'#333');
            R(-4,-26,8,2,'#ffd700');
            // duster coat (long)
            R(-6,-8,12,16,'#b71c1c');
            R(-8,4,16,8,'#a31515');
            R(-9,10,18,8,'#b71c1c');
            R(-1,-6,2,4,'#ffd700');
            R(-8,-4,2,12,'#b71c1c'); R(6,-4,2,12,'#b71c1c');
            R(-4,10,3,6,'#7f0000'); R(1,10,3,6,'#7f0000');
            R(-5,14,4,3,'#111'); R(1,14,4,3,'#111');
            // face
            R(-5,-14,10,8,'#ffb74d');
            R(-4,-13,2,2,'#000'); R(1,-13,2,2,'#000');
            // mustache (rect, no arc)
            R(-3,-9,7,2,'#5d4037');
            break;
        }
        case 'steve': {
            // diamond sword
            R(9,-14,2,18,'#00bcd4');
            R(8,-7,4,2,'#8d6e63');
            R(8,-6,2,4,'#795548');
            // boots (brown)
            R(-5,12,4,3,'#795548'); R(1,12,4,3,'#795548');
            // gray pants
            R(-4,8,3,6,'#607d8b'); R(1,8,3,6,'#607d8b');
            // blue shirt
            R(-5,-8,10,16,'#3f51b5');
            // blocky arms (skin)
            R(-8,-8,3,16,'#d4956a'); R(5,-8,3,16,'#d4956a');
            // Minecraft pixelated square face
            R(-5,-22,10,14,'#d4956a');
            R(-5,-22,10,2,'#8b6914');
            // pixel eyes
            R(-3,-17,2,2,'#4a2e1c'); R(1,-17,2,2,'#4a2e1c');
            R(0,-14,1,1,'#c4865e');
            R(-2,-12,5,2,'#7b4f36');
            break;
        }
        case 'lumberjack': {
            // Ryan the axe (right hand)
            R(9,-10,2,20,'#8d6e63');
            R(11,-12,7,8,'#e53935');
            R(11,-14,5,4,'#ef5350');
            R(13,-15,4,3,'#b0bec5');
            // boots
            R(-6,12,5,3,'#3e2723'); R(1,12,5,3,'#3e2723');
            // dark red overalls
            R(-5,8,4,6,'#7f0000'); R(1,8,4,6,'#7f0000');
            // red checkered shirt
            R(-5,-8,10,16,'#c62828');
            R(-5,-8,5,4,'#b71c1c'); R(0,-4,5,4,'#b71c1c');
            R(-5,0,5,4,'#b71c1c'); R(0,4,5,4,'#b71c1c');
            // overalls straps
            R(-4,-8,2,8,'#7f0000'); R(2,-8,2,8,'#7f0000');
            R(-8,-4,3,10,'#c62828'); R(5,-4,3,10,'#c62828');
            // face
            R(-5,-20,10,10,'#d4956a');
            R(-5,-20,10,3,'#4e342e');
            // big beard (covers lower face)
            R(-5,-13,10,7,'#5d4037');
            R(-6,-11,12,5,'#4e342e');
            // eyes above beard
            R(-3,-17,2,2,'#3e2723'); R(1,-17,2,2,'#3e2723');
            break;
        }
        case 'ninja': {
            // shuriken (right hand)
            R(8,-9,6,2,'#78909c');
            R(10,-11,2,6,'#78909c');
            R(8,-11,2,2,'#607d8b'); R(12,-11,2,2,'#607d8b');
            R(8,-9,2,2,'#607d8b'); R(12,-9,2,2,'#607d8b');
            // all-black outfit
            R(-5,12,4,3,'#212121'); R(1,12,4,3,'#212121');
            R(-4,8,3,6,'#212121'); R(1,8,3,6,'#212121');
            R(-5,-8,10,16,'#212121');
            R(-8,-4,3,10,'#212121'); R(5,-4,3,10,'#212121');
            // head wrap (all black)
            R(-5,-20,10,12,'#212121');
            // single long eye slit (both eyes through one opening)
            R(-4,-14,8,2,'#00e5ff');
            R(-4,-6,8,2,'#37474f');
            break;
        }
        case 'scientist': {
            // beaker (left hand)
            R(-12,-8,4,12,'#e3f2fd');
            R(-11,-10,3,3,'#bbdefb');
            R(-13,-5,6,2,'#4fc3f7');
            R(-12,-4,4,3,'#29b6f6');
            // neck (fills gap y=-10 to y=-8)
            R(-3,-10,6,2,'#ffb74d');
            // lab coat
            R(-5,-8,10,16,'#fff');
            R(-8,4,16,6,'#f5f5f5');
            R(-5,-8,2,12,'#e0e0e0'); R(3,-8,2,12,'#e0e0e0');
            // shirt underneath
            R(-3,-6,6,10,'#2196f3');
            R(-8,-4,3,10,'#fff'); R(5,-4,3,10,'#fff');
            // legs/pants
            R(-4,8,3,6,'#37474f'); R(1,8,3,6,'#37474f');
            R(-5,12,4,3,'#263238'); R(1,12,4,3,'#263238');
            // face
            R(-5,-20,10,10,'#ffb74d');
            R(-5,-20,10,3,'#5d4037');
            // goggles on forehead
            R(-5,-18,4,3,'#ffeb3b'); R(1,-18,4,3,'#ffeb3b');
            R(-1,-18,2,3,'#fff');
            R(-3,-13,2,2,'#000'); R(1,-13,2,2,'#000');
            break;
        }
        case 'oldMan': {
            // cane (right hand)
            R(9,-4,2,22,'#8d6e63');
            R(6,-4,5,2,'#6d4c41');
            R(6,-6,2,4,'#6d4c41');
            // boots
            R(-5,13,4,3,'#5d4037'); R(1,13,4,3,'#5d4037');
            // legs (hunched — body shifted)
            R(-4,7,3,7,'#455a64'); R(1,7,3,7,'#455a64');
            // thin neck
            R(-3,-9,5,2,'#e8b48a');
            // body (slightly asymmetric for hunch)
            R(-4,-9,9,16,'#546e7a');
            // arms (thin)
            R(-7,-5,2,10,'#5d4037'); R(5,-5,2,10,'#5d4037');
            // face
            R(-4,-21,9,12,'#e8b48a');
            // wrinkle lines
            R(-3,-12,3,1,'#c48b5e'); R(1,-12,3,1,'#c48b5e');
            R(-2,-10,5,1,'#c48b5e');
            // eyes (squinting)
            R(-2,-16,3,1,'#5d4037'); R(2,-16,3,1,'#5d4037');
            // white hair
            R(-4,-21,9,3,'#e0e0e0');
            R(-5,-19,2,3,'#e0e0e0'); R(5,-19,2,3,'#e0e0e0');
            break;
        }
        case 'robot': {
            // antenna
            R(-1,-30,2,8,'#90a4ae');
            R(-3,-31,6,2,'#ffd700');
            // box head
            R(-6,-26,12,12,'#455a64');
            R(-7,-27,14,2,'#37474f');
            // eye panel
            R(-5,-22,10,5,'#000');
            R(-4,-21,3,3,'#f44336'); R(1,-21,3,3,'#f44336');
            // mouth grille
            R(-4,-16,2,2,'#263238'); R(-1,-16,2,2,'#263238'); R(2,-16,2,2,'#263238');
            // neck
            R(-2,-14,4,6,'#546e7a');
            // metallic body
            R(-6,-8,12,16,'#546e7a');
            R(-5,-6,10,2,'#607d8b');
            R(-4,-4,4,4,'#4dd0e1');
            R(1,-3,4,5,'#37474f');
            R(2,-2,2,1,'#263238'); R(2,0,2,1,'#263238'); R(2,2,2,1,'#263238');
            // mechanical arms
            R(-10,-6,4,12,'#455a64'); R(6,-6,4,12,'#455a64');
            R(-10,-6,4,2,'#37474f'); R(6,-6,4,2,'#37474f');
            // legs + wide feet
            R(-5,8,4,6,'#455a64'); R(1,8,4,6,'#455a64');
            R(-6,12,5,3,'#37474f'); R(1,12,5,3,'#37474f');
            break;
        }
        case 'librarian': {
            // Book in left hand
            R(-12,-4,6,9,'#ffe082'); R(-11,-5,4,2,'#ffd54f'); R(-11,-4,1,9,'#e0c040');
            R(-9,-3,3,7,'#000');
            // boots
            R(-5,12,4,3,'#1a1a1a'); R(1,12,4,3,'#1a1a1a');
            // legs
            R(-4,8,3,6,'#3e2723'); R(1,8,3,6,'#3e2723');
            // cardigan body + inner shirt
            R(-5,-8,10,16,'#4e342e'); R(-3,-6,6,12,'#3e2723');
            // sleeves
            R(-8,-4,3,10,'#6d4c41'); R(5,-4,3,10,'#6d4c41');
            // face + bun
            R(-5,-18,10,12,'#d4956a'); R(-5,-18,10,3,'#5d4037');
            // glasses
            R(-4,-12,3,3,'#90a4ae'); R(0,-12,3,3,'#90a4ae'); R(-1,-11,2,1,'#90a4ae');
            R(-3,-11,2,2,'#000'); R(1,-11,2,2,'#000');
            break;
        }
        case 'shopper': {
            // shopping bag
            R(-13,-4,7,10,'#00acc1'); R(-12,-5,5,3,'#00bcd4');
            // boots
            R(-5,12,4,3,'#004d40'); R(1,12,4,3,'#004d40');
            // jeans
            R(-4,8,3,6,'#006064'); R(1,8,3,6,'#006064');
            // t-shirt
            R(-5,-8,10,16,'#00838f');
            // arms
            R(-8,-4,3,10,'#00acc1'); R(5,-4,3,10,'#00acc1');
            // face
            R(-5,-18,10,12,'#ffb74d'); R(-5,-18,10,3,'#5d4037');
            // visor cap
            R(-6,-18,12,2,'#004d40'); R(-5,-22,10,6,'#00695c');
            R(-3,-12,2,2,'#000'); R(1,-12,2,2,'#000');
            break;
        }
        case 'gamer': {
            // controller
            R(7,-4,8,5,'#37474f'); R(8,-3,2,2,'#f44336'); R(11,-5,2,2,'#4caf50');
            // boots
            R(-5,12,4,3,'#1a1a2e'); R(1,12,4,3,'#1a1a2e');
            // pants
            R(-4,8,3,6,'#16213e'); R(1,8,3,6,'#16213e');
            // hoodie
            R(-5,-8,10,16,'#1a237e');
            // arms
            R(-8,-4,3,10,'#283593'); R(5,-4,3,10,'#283593');
            // face + beanie
            R(-5,-18,10,12,'#d4956a'); R(-5,-18,10,3,'#1a1a2e');
            // headphones
            R(-7,-18,2,6,'#283593'); R(5,-18,2,6,'#283593');
            R(-7,-20,14,3,'#1a237e');
            R(-3,-12,2,2,'#000'); R(1,-12,2,2,'#000');
            break;
        }
        case 'angel': {
            // wings
            R(-14,-6,6,12,'#f5f5f5'); R(-16,-4,4,8,'#e8e8e8');
            R(8,-6,6,12,'#f5f5f5'); R(12,-4,4,8,'#e8e8e8');
            // boots
            R(-5,12,4,3,'#f5f5f5'); R(1,12,4,3,'#f5f5f5');
            // robe lower
            R(-4,8,3,6,'#e0e0e0'); R(1,8,3,6,'#e0e0e0');
            // robe body (long)
            R(-5,-8,10,18,'#fafafa');
            // arms
            R(-8,-4,3,10,'#f5f5f5'); R(5,-4,3,10,'#f5f5f5');
            // face + hair
            R(-5,-18,10,12,'#ffe0b2'); R(-5,-18,10,3,'#ffd54f');
            R(-3,-12,2,2,'#5d4037'); R(1,-12,2,2,'#5d4037');
            // halo
            if (!isLocked) { c.shadowColor = '#ffd700'; c.shadowBlur = 8; }
            R(-4,-22,8,2,'#ffd700');
            c.shadowBlur = 0;
            break;
        }
        case 'diver': {
            // air tank
            R(4,-9,5,14,'#01579b'); R(8,-7,2,10,'#0277bd');
            // flippers
            R(-5,10,5,5,'#4fc3f7'); R(1,10,5,5,'#4fc3f7');
            // legs
            R(-4,8,3,6,'#0277bd'); R(1,8,3,6,'#0277bd');
            // wetsuit body + arms
            R(-5,-8,10,16,'#01579b');
            R(-8,-4,3,10,'#0288d1'); R(5,-4,3,10,'#0288d1');
            // hood
            R(-5,-18,10,12,'#01579b'); R(-4,-18,8,2,'#0288d1');
            // mask lens
            R(-4,-14,8,6,'#b3e5fc'); R(-3,-13,6,4,'#4fc3f7');
            break;
        }
        case 'dinosaur': {
            // tail
            R(-8,10,4,6,'#2e7d32'); R(-10,14,3,5,'#33691e'); R(-11,17,2,4,'#2e7d32');
            // feet (claws)
            R(-7,12,6,3,'#1b5e20'); R(1,12,6,3,'#1b5e20');
            // legs (big)
            R(-6,2,5,12,'#388e3c'); R(1,2,5,12,'#388e3c');
            // body
            R(-6,-8,12,18,'#33691e');
            // belly (lighter for contrast)
            R(-3,-6,6,10,'#43a047');
            // stubby arms
            R(-10,-6,5,12,'#2e7d32'); R(5,-6,5,12,'#2e7d32');
            // head
            R(-6,-22,12,16,'#33691e'); R(-7,-24,14,4,'#2e7d32');
            // yellow eyes (visible!)
            R(-5,-21,4,4,'#ffd600'); R(1,-21,4,4,'#ffd600');
            R(-4,-20,2,2,'#000'); R(2,-20,2,2,'#000'); // pupils
            // snout
            R(-5,-12,10,3,'#2e7d32');
            // teeth (white)
            R(-4,-12,2,2,'#fff'); R(1,-12,2,2,'#fff');
            // brighter spines
            R(-2,-26,2,6,'#66bb6a'); R(0,-28,2,8,'#4caf50'); R(2,-26,2,6,'#66bb6a');
            break;
        }
        case 'demon': {
            // hellfire trident (right hand)
            R(9,-20,2,28,'#795548');
            R(7,-22,2,4,'#ef5350'); R(9,-24,2,6,'#e53935'); R(11,-22,2,4,'#ef5350');
            // hooves
            R(-5,12,4,3,'#4e0000'); R(1,12,4,3,'#4e0000');
            // legs
            R(-4,8,3,6,'#6d1e0c'); R(1,8,3,6,'#6d1e0c');
            // body (dark red)
            R(-5,-8,10,16,'#b71c1c');
            R(-8,-4,3,10,'#c62828'); R(5,-4,3,10,'#c62828');
            R(-3,-8,6,2,'#e65100');
            // red-skinned head
            R(-5,-20,10,12,'#c62828');
            // curved horns
            R(-3,-22,2,6,'#4e0000'); R(-4,-26,2,6,'#3e0000');
            R(1,-22,2,6,'#4e0000'); R(2,-26,2,6,'#3e0000');
            // glowing orange eyes
            c.shadowColor = F('#ff6d00'); c.shadowBlur = isLocked ? 0 : 5;
            R(-3,-14,2,2,'#ff6d00'); R(1,-14,2,2,'#ff6d00');
            c.shadowBlur = 0;
            break;
        }
        case 'alien': {
            // plasma cannon (right hand)
            R(9,-6,9,5,'#00695c'); R(17,-8,4,9,'#00897b');
            // feet
            R(-5,12,4,3,'#00251a'); R(1,12,4,3,'#00251a');
            // thin legs
            R(-4,8,2,6,'#004d40'); R(2,8,2,6,'#004d40');
            // narrow body
            R(-4,-8,8,16,'#00695c');
            // thin arms
            R(-7,-4,3,10,'#00897b'); R(4,-4,3,10,'#00897b');
            // large dome head
            R(-7,-22,14,16,'#00897b');
            R(-8,-20,16,4,'#00695c');
            // large black eyes
            R(-5,-18,4,5,'#000'); R(1,-18,4,5,'#000');
            R(-4,-17,2,3,'#1de9b6'); R(2,-17,2,3,'#1de9b6');
            break;
        }
        case 'monsterChar': {
            // scythe (left side)
            R(-13,-28,2,38,'#5d4037');
            R(-13,-28,14,3,'#78909c'); R(-13,-31,4,6,'#90a4ae'); R(0,-28,2,5,'#607d8b');
            // large feet
            R(-6,12,5,3,'#1a0030'); R(1,12,5,3,'#1a0030');
            // legs
            R(-5,8,4,6,'#4a148c'); R(1,8,4,6,'#4a148c');
            // hulking body
            R(-6,-8,12,16,'#4a148c');
            R(-9,-4,4,10,'#38006b'); R(5,-4,4,10,'#38006b');
            R(-3,-8,6,2,'#6a1b9a');
            // monstrous head
            R(-7,-20,14,14,'#5e35b1');
            // horns
            R(-5,-22,2,6,'#311b92'); R(3,-22,2,6,'#311b92');
            // glowing purple eyes
            c.shadowColor = F('#ea80fc'); c.shadowBlur = isLocked ? 0 : 5;
            R(-4,-14,3,3,'#ea80fc'); R(1,-14,3,3,'#ea80fc');
            c.shadowBlur = 0;
            // fangs
            R(-2,-9,2,3,'#fff'); R(0,-9,2,3,'#fff');
            break;
        }
        case 'dragon': {
            // wings (behind body)
            R(-18,-8,10,20,'#7f0000'); R(-20,-6,4,16,'#9e2020');
            R(8,-8,10,20,'#7f0000'); R(16,-6,4,16,'#9e2020');
            // clawed feet
            R(-7,12,5,3,'#4a0000'); R(2,12,5,3,'#4a0000');
            // large legs
            R(-6,2,5,12,'#b71c1c'); R(1,2,5,12,'#b71c1c');
            // body (large, scaly)
            R(-8,-8,16,18,'#b71c1c');
            // arms
            R(-12,-4,5,12,'#c62828'); R(7,-4,5,12,'#c62828');
            // neck
            R(-4,-8,8,4,'#b71c1c');
            // dragon head
            R(-6,-22,12,16,'#c62828');
            // snout
            R(-5,-10,10,4,'#7f0000'); R(-3,-9,6,2,'#9e2020');
            // horns
            R(-4,-24,2,8,'#4a0000'); R(2,-24,2,8,'#4a0000');
            // golden eyes
            c.shadowColor = F('#ffd600'); c.shadowBlur = isLocked ? 0 : 5;
            R(-3,-20,2,2,'#ffd600'); R(1,-20,2,2,'#ffd600');
            c.shadowBlur = 0;
            break;
        }
        case 'rich': {
            // briefcase (left hand)
            R(-14,-4,8,8,'#8d6e63'); R(-14,-5,8,2,'#795548'); R(-11,-5,2,4,'#6d4c41');
            // monocle laser (right)
            R(9,-10,2,22,'#ffd700'); R(7,-12,6,2,'#ffd700');
            // fancy shoes
            R(-6,12,5,3,'#111'); R(1,12,6,3,'#111');
            // suit pants
            R(-5,8,4,6,'#2c2c2c'); R(1,8,4,6,'#2c2c2c');
            // suit jacket + white shirt
            R(-5,-8,10,16,'#1a1a1a');
            R(-3,-4,6,8,'#fafafa');
            R(-5,-8,2,12,'#212121'); R(3,-8,2,12,'#212121');
            // arms
            R(-8,-4,3,10,'#1a1a1a'); R(5,-4,3,10,'#1a1a1a');
            // face + mustache
            R(-3,-8,6,2,'#d4956a');
            R(-5,-20,10,12,'#d4956a');
            R(-3,-9,7,1,'#5d4037');
            R(-3,-14,2,2,'#5d4037'); R(1,-14,2,2,'#5d4037');
            // monocle (right eye ring)
            c.strokeStyle = F('#ffd700'); c.lineWidth = 1;
            c.beginPath(); c.arc(2*s, -13*s, 3*s, 0, Math.PI*2); c.stroke();
            // top hat
            R(-7,-20,14,2,'#111');
            R(-5,-34,10,16,'#1a1a1a');
            R(-3,-31,6,2,'#ffd700');
            break;
        }
        case 'blob': {
            // irregular blob body
            R(-8,-8,16,20,'#558b2f');
            R(-10,-4,20,12,'#7cb342');
            R(-7,-14,14,10,'#558b2f');
            R(-9,10,18,5,'#33691e');
            // spikes
            R(-4,-16,3,6,'#33691e'); R(1,-16,3,6,'#33691e');
            R(-12,0,4,4,'#33691e'); R(8,0,4,4,'#33691e');
            // central eye
            R(-4,-8,8,7,'#c5e1a5');
            R(-3,-7,6,5,'#fff');
            R(-1,-6,3,4,'#000');
            R(-1,-5,2,2,'#3e2723');
            // highlights
            R(-6,-12,4,2,'#aed581'); R(2,-12,4,2,'#aed581');
            break;
        }
        case 'witch': {
            // broomstick (left side, diagonal)
            R(-14,2,2,22,'#8d6e63');
            R(-16,22,6,2,'#6d4c41');
            R(-12,4,4,2,'#a5d6a7'); R(-14,6,4,2,'#a5d6a7'); R(-16,8,4,2,'#a5d6a7');
            // pointed boots (black)
            R(-5,12,5,3,'#212121'); R(1,12,5,3,'#212121');
            R(-6,14,2,3,'#111'); R(4,14,2,3,'#111');
            // robe body (purple)
            R(-6,-8,12,22,'#6a1b9a');
            R(-8,4,16,8,'#7b1fa2'); R(-9,10,18,6,'#6a1b9a');
            // sleeves
            R(-10,-4,4,14,'#4a148c'); R(6,-4,4,14,'#4a148c');
            // neck + pale face
            R(-3,-8,6,2,'#e8b48a');
            R(-5,-20,10,12,'#d4956a');
            // glowing green eyes
            c.shadowColor = F('#69f0ae'); c.shadowBlur = isLocked ? 0 : 6;
            R(-3,-14,2,2,'#69f0ae'); R(1,-14,2,2,'#69f0ae');
            c.shadowBlur = 0;
            // hat brim + tall crown
            R(-8,-20,16,2,'#212121');
            R(-5,-36,10,18,'#212121');
            R(-4,-37,8,2,'#4a148c');
            R(-5,-22,10,2,'#6a1b9a');
            break;
        }
        case 'pirate': {
            // cutlass (right hand)
            R(9,-14,2,20,'#b0bec5');
            R(8,-6,6,2,'#37474f'); R(8,-8,2,4,'#8d6e63');
            // peg leg (right)
            R(2,10,4,10,'#8d6e63'); R(1,18,6,2,'#6d4c41');
            // boot (left)
            R(-5,12,4,3,'#3e2723');
            // legs
            R(-4,8,3,6,'#455a64'); R(1,8,3,6,'#8d6e63');
            // striped shirt
            R(-5,-8,10,16,'#1565c0');
            R(-5,-4,10,2,'#e0e0e0'); R(-5,0,10,2,'#e0e0e0'); R(-5,4,10,2,'#e0e0e0');
            // arms (left skin, right sleeve)
            R(-8,-4,3,10,'#d4956a'); R(5,-4,3,10,'#1565c0');
            // hook hand (left)
            R(-10,5,2,6,'#b0bec5'); R(-12,6,4,2,'#90a4ae'); R(-13,6,2,4,'#b0bec5');
            // face (tan)
            R(-5,-20,10,12,'#d4956a');
            // eyepatch (left)
            R(-4,-16,4,3,'#111'); R(-5,-14,1,4,'#111');
            // right eye
            R(1,-14,2,2,'#3e2723');
            // red bandana
            R(-6,-20,12,3,'#c62828');
            R(-5,-23,10,5,'#e53935');
            R(-7,-21,2,5,'#c62828'); R(5,-21,2,5,'#c62828');
            break;
        }
        case 'villager': {
            // boots
            R(-5,14,5,3,'#4e342e'); R(1,14,5,3,'#4e342e');
            // trousers (brown)
            R(-5,6,5,9,'#6d4c41'); R(1,6,5,9,'#6d4c41');
            // tunic (tan linen)
            R(-6,-8,12,15,'#c8a96e');
            // apron (front)
            R(-3,-4,6,12,'#e8d5a3');
            // arms
            R(-9,-6,4,10,'#c8a96e'); R(6,-6,4,10,'#c8a96e');
            // pitchfork (right hand)
            R(10,-20,2,26,'#8d6e63');
            R(8,-20,2,5,'#b0bec5'); R(10,-22,2,5,'#b0bec5'); R(12,-20,2,5,'#b0bec5');
            // face (weathered skin)
            R(-4,-20,8,12,'#c68642');
            // hair (brown, messy)
            R(-5,-24,10,6,'#5d4037');
            R(-6,-22,2,4,'#5d4037'); R(4,-22,2,4,'#5d4037');
            // eyes (angry)
            R(-3,-16,2,2,'#3e2723'); R(1,-16,2,2,'#3e2723');
            // angry brow lines
            R(-4,-18,4,1,'#3e2723'); R(0,-18,4,1,'#3e2723');
            break;
        }
        case 'sailor': {
            // white bell-bottom trousers
            R(-6,6,6,12,'#e0e0e0'); R(1,6,6,12,'#e0e0e0');
            // navy collar shirt
            R(-6,-8,12,15,'#1a237e');
            // white collar V
            R(-4,-8,3,5,'#e0e0e0'); R(1,-8,3,5,'#e0e0e0');
            R(-2,-4,4,3,'#e0e0e0');
            // arms
            R(-9,-6,4,10,'#1a237e'); R(6,-6,4,10,'#1a237e');
            // fishing rod (right hand)
            R(10,-18,2,26,'#8d6e63');
            R(12,-20,1,1,'#b0bec5'); // fishing line end
            // face (sea-tanned)
            R(-4,-20,8,12,'#d4956a');
            // sailor hat (white with dark brim)
            R(-6,-24,12,5,'#e0e0e0');
            R(-5,-26,10,3,'#e0e0e0');
            R(-8,-22,16,2,'#1a237e'); // brim
            // eyes
            R(-3,-16,2,2,'#3e2723'); R(1,-16,2,2,'#3e2723');
            // smile
            R(-2,-12,4,1,'#a0522d');
            break;
        }
        case 'engineer': {
            // boots
            R(-5,14,5,3,'#3e2723'); R(1,14,5,3,'#3e2723');
            // work trousers (denim)
            R(-5,6,5,9,'#455a64'); R(1,6,5,9,'#455a64');
            // high-vis vest (orange over grey shirt)
            R(-6,-8,12,15,'#78909c');
            R(-6,-8,4,15,'#ff6f00'); R(2,-8,4,15,'#ff6f00'); // vest sides
            // arms
            R(-9,-6,4,10,'#78909c'); R(6,-6,4,10,'#78909c');
            // wrench (right hand)
            R(10,-18,3,22,'#607d8b');
            R(8,-18,7,3,'#455a64'); R(8,-20,7,3,'#455a64');
            // face
            R(-4,-20,8,12,'#c68642');
            // hard hat (yellow)
            R(-6,-24,12,5,'#fdd835');
            R(-7,-24,14,3,'#f9a825'); // brim
            R(-5,-30,10,8,'#fdd835');
            // eyes
            R(-3,-16,2,2,'#37474f'); R(1,-16,2,2,'#37474f');
            break;
        }
        case 'commander': {
            // boots (black)
            R(-5,14,5,3,'#212121'); R(1,14,5,3,'#212121');
            // dress trousers (dark olive)
            R(-5,6,5,9,'#33691e'); R(1,6,5,9,'#33691e');
            // military jacket (olive green)
            R(-6,-8,12,15,'#558b2f');
            // gold trim
            R(-5,-8,1,15,'#ffd700'); R(4,-8,1,15,'#ffd700');
            // medal ribbons
            R(-4,-4,6,2,'#f44336'); R(-4,-2,6,2,'#2196f3'); R(-4,0,6,2,'#ffeb3b');
            // arms with epaulettes
            R(-9,-6,4,10,'#558b2f'); R(6,-6,4,10,'#558b2f');
            R(-9,-6,4,2,'#ffd700'); R(6,-6,4,2,'#ffd700'); // epaulettes
            // megaphone (right hand)
            R(10,-8,4,4,'#b0bec5'); R(13,-10,6,8,'#90a4ae'); R(19,-12,4,12,'#78909c');
            // face
            R(-4,-20,8,12,'#c68642');
            // peaked cap
            R(-7,-22,14,2,'#212121'); // brim
            R(-5,-30,10,10,'#33691e');
            R(-6,-30,12,2,'#ffd700');
            // eyes
            R(-3,-16,2,2,'#3e2723'); R(1,-16,2,2,'#3e2723');
            // moustache
            R(-3,-13,6,2,'#5d4037');
            break;
        }
        case 'astronaut': {
            // boots (white thick)
            R(-6,14,6,4,'#e0e0e0'); R(1,14,6,4,'#e0e0e0');
            // legs (white suit)
            R(-5,4,5,11,'#f5f5f5'); R(1,4,5,11,'#f5f5f5');
            // body suit (white)
            R(-7,-8,14,13,'#f5f5f5');
            // chest panel (grey details)
            R(-4,-6,8,7,'#90a4ae');
            R(-3,-5,2,2,'#ef5350'); R(1,-5,2,2,'#64b5f6'); // indicator lights
            // arms (bulky)
            R(-11,-6,5,10,'#e0e0e0'); R(7,-6,5,10,'#e0e0e0');
            // gloves
            R(-11,3,5,3,'#9e9e9e'); R(7,3,5,3,'#9e9e9e');
            // plasma cannon (right arm)
            R(12,-4,10,5,'#78909c'); R(20,-6,4,9,'#546e7a');
            // helmet (rounded, large)
            R(-8,-24,16,17,'#eeeeee');
            R(-7,-26,14,4,'#e0e0e0');
            // visor (gold tinted)
            R(-5,-22,10,8,'#ffd54f');
            c.globalAlpha = 0.5; R(-5,-22,10,8,'#ff8f00'); c.globalAlpha = 1;
            // NASA logo patch
            R(-5,-10,2,2,'#1565c0'); R(-3,-10,2,2,'#f44336');
            break;
        }
        case 'stickman': {
            // pixel art stickman — no circles/arcs
            const bc = F('#000');
            const fc = F('#fff');
            // top hat (solid black)
            R(-7,-23,14,2,bc);      // brim
            R(-4,-34,8,11,bc);      // crown
            // head (square, white fill + black border)
            R(-6,-22,12,12,bc);     // outline
            R(-5,-21,10,10,fc);     // white fill
            // eyes
            R(-4,-19,2,2,bc);
            R(2,-19,2,2,bc);
            // mouth (flat line)
            R(-3,-15,7,2,bc);
            // neck + body (spine)
            R(-1,-10,2,13,bc);
            // left arm (two rect segments for angled look)
            R(-7,-5,6,2,bc);
            R(-9,-3,2,4,bc);
            // right arm (raised) + stick weapon
            R(1,-7,5,2,bc);
            R(5,-22,2,15,bc);       // stick weapon going up
            // legs
            R(-3,3,2,5,bc);
            R(-5,7,4,2,bc);         // left foot
            R(1,3,2,5,bc);
            R(0,7,4,2,bc);          // right foot
            break;
        }
        case 'caveman': {
            // feet (big, bare)
            R(-7,14,7,4,'#c68642'); R(1,14,7,4,'#c68642');
            // legs (big, hairy-ish)
            R(-7,4,7,11,'#c68642'); R(1,4,7,11,'#c68642');
            // body (large, orange rags)
            R(-8,-8,16,13,'#e65100');
            // rag texture (darker patches)
            R(-6,-6,4,4,'#bf360c'); R(2,-2,4,4,'#bf360c');
            // arms (thick)
            R(-12,-6,5,12,'#c68642'); R(8,-6,5,12,'#c68642');
            // club (right hand)
            R(13,-16,5,22,'#5d4037');
            R(11,-18,9,6,'#4e342e'); // club head
            R(10,-20,11,4,'#3e2723');
            // face (wide jaw)
            R(-5,-20,10,12,'#c68642');
            // jaw / underbite
            R(-4,-12,8,4,'#d4956a');
            // hair (messy dark)
            R(-6,-24,12,6,'#4e342e');
            R(-7,-22,3,4,'#3e2723'); R(4,-22,3,4,'#3e2723');
            // eyes (small, beady)
            R(-3,-18,2,2,'#3e2723'); R(1,-18,2,2,'#3e2723');
            // brow (heavy)
            R(-4,-20,8,2,'#4e342e');
            // bone accessories
            R(-8,-8,3,2,'#eeeeee'); R(6,-8,3,2,'#eeeeee');
            break;
        }
        case 'clown': {
            // big shoes (colorful)
            R(-9,14,10,5,'#f44336'); R(0,14,10,5,'#f44336');
            // striped legs
            R(-5,6,5,9,'#ce93d8'); R(1,6,5,9,'#ce93d8');
            R(-5,8,5,2,'#80cbc4'); R(1,8,5,2,'#80cbc4');
            R(-5,12,5,2,'#80cbc4'); R(1,12,5,2,'#80cbc4');
            // colorful polka-dot suit
            R(-7,-8,14,15,'#fff9c4');
            R(-5,-6,3,3,'#f44336'); R(2,-6,3,3,'#2196f3');
            R(-4,-1,3,3,'#4caf50'); R(2,1,3,3,'#ff9800');
            R(-5,5,3,3,'#9c27b0'); R(2,4,3,3,'#f44336');
            // ruffle collar
            R(-8,-8,16,4,'#e91e63');
            R(-9,-10,18,3,'#f48fb1');
            // arms
            R(-11,-4,4,10,'#fff9c4'); R(8,-4,4,10,'#fff9c4');
            // balloon sword (right hand)
            R(12,-16,3,22,'#f44336');
            R(10,-20,7,7,'#ff1744'); // balloon
            // face (white)
            R(-5,-20,10,12,'#fafafa');
            // rainbow perm hair
            R(-8,-26,16,8,'#ce93d8');
            R(-9,-22,4,4,'#ef9a9a'); R(5,-22,4,4,'#80cbc4');
            R(-10,-20,3,4,'#fff176'); R(7,-20,3,4,'#a5d6a7');
            // red nose (pixel art square)
            R(-2,-16,4,4,'#f44336');
            R(-1,-15,2,2,'#ef9a9a'); // nose highlight
            // eyes (pixel art squares, dark blue)
            R(-6,-20,5,5,'#1a237e'); R(1,-20,5,5,'#1a237e');
            R(-5,-19,2,2,'#fff'); R(2,-19,2,2,'#fff'); // eye shine
            // big smile (stepped rect curve)
            R(-5,-12,2,2,'#d32f2f');
            R(-3,-11,7,2,'#d32f2f');
            R(4,-12,2,2,'#d32f2f');
            break;
        }
        case 'bob': {
            const bc = isLocked ? '#888' : '#c68642';
            // Plain shoes
            R(-6,14,6,4,'#5d4037'); R(1,14,6,4,'#5d4037');
            // Plain jeans
            R(-5,6,5,9,'#1565c0'); R(1,6,5,9,'#1565c0');
            // Plain t-shirt (gray)
            R(-7,-8,14,15,'#9e9e9e');
            // arms
            R(-11,-4,4,10,bc); R(8,-4,4,10,bc);
            // face
            R(-5,-20,10,12,bc);
            // Brown hair (flat)
            R(-6,-24,12,6,'#5d4037');
            // neutral eyes
            R(-4,-16,2,2,'#212121'); R(2,-16,2,2,'#212121');
            // flat mouth
            R(-3,-12,6,2,'#5d4037');
            // question mark above head (confused vibe)
            c.fillStyle = F('#ffb300');
            c.font = 'bold 12px monospace'; c.textAlign = 'center';
            c.fillText('?', 0, -30);
            break;
        }
        case 'youtuber': {
            const yc = isLocked ? '#888' : '#ffccbc'; // skin tone
            // sneakers
            R(-7,14,7,4,'#f44336'); R(1,14,7,4,'#f44336');
            // jeans
            R(-5,6,5,9,'#1565c0'); R(1,6,5,9,'#1565c0');
            // merch hoodie (red)
            R(-7,-8,14,15,'#e53935');
            // YT play button logo on hoodie
            R(-3,-3,7,4,'#fff');    // white badge
            R(-1,-2,3,3,'#e53935'); // red play triangle hint
            // arms (skin)
            R(-11,-4,4,10,yc); R(8,-4,4,10,yc);
            // selfie stick in right hand
            R(11,-22,2,28,'#9e9e9e'); // stick
            R(7,-26,10,7,'#424242');  // phone body
            R(8,-25,8,5,'#29b6f6');   // screen (blue)
            R(11,-27,2,1,'#90a4ae'); // front camera dot
            // ring light (square pixel art version — no arc)
            R(-12,-41,24,3,'#ffd600'); // top bar
            R(-12,-38,3,9,'#ffd600');  // left bar
            R(9,-38,3,9,'#ffd600');    // right bar
            R(-12,-30,24,3,'#ffd600'); // bottom bar
            // face
            R(-5,-20,10,12,yc);
            // hair (stylish dark + colored streak)
            R(-6,-26,12,8,'#212121');
            R(-7,-23,3,5,'#f44336'); // red streak left side
            R(-4,-27,10,3,'#212121'); // top hair
            // eyebrows
            R(-4,-17,3,1,'#5d4037'); R(1,-17,3,1,'#5d4037');
            // eyes (normal 2×2)
            R(-4,-15,2,2,'#5d4037'); R(2,-15,2,2,'#5d4037');
            // smile (normal width)
            R(-3,-11,7,2,'#c2185b');
            break;
        }
        case 'koolKat': {
            const kc = '#fdd835'; // YELLOW cat fur
            // paws (feet)
            R(-7,14,7,5,kc); R(1,14,7,5,kc);
            // legs
            R(-5,6,5,9,kc); R(1,6,5,9,kc);
            // body (deeper yellow)
            R(-7,-8,14,15,'#f9a825');
            R(-5,-6,10,11,'#f57f17'); // darker belly
            // arms
            R(-11,-4,4,10,kc); R(8,-4,4,10,kc);
            // cat head (yellow)
            R(-6,-20,12,12,kc);
            // ears (yellow outer, pink inner)
            R(-7,-26,4,7,kc); R(3,-26,4,7,kc);
            R(-6,-25,2,5,'#f48fb1'); R(4,-25,2,5,'#f48fb1');
            // === "Deal With It" pixel art sunglasses (smaller) ===
            // Raised outer corners
            R(-11,-18,2,3,'#000'); R(9,-18,2,3,'#000');
            // Left lens main body
            R(-10,-16,8,6,'#000');
            R(-12,-16,2,6,'#000'); // left outer edge
            // Right lens main body
            R(2,-16,8,6,'#000');
            R(10,-16,2,6,'#000'); // right outer edge
            // Bridge (lower center)
            R(-2,-14,4,4,'#000');
            // Temple arms
            R(-13,-17,2,2,'#000'); // left
            R(12,-17,4,2,'#000');  // right
            // Checkerboard (white squares over black lenses)
            R(-10,-16,2,2,'#fff'); R(-6,-16,2,2,'#fff'); // left lens row 1
            R(-8,-14,2,2,'#fff');  R(-4,-14,2,2,'#fff'); // left lens row 2
            R(3,-16,2,2,'#fff');   R(7,-16,2,2,'#fff');  // right lens row 1
            R(5,-14,2,2,'#fff');   R(9,-14,2,2,'#fff');  // right lens row 2
            // nose (pink)
            R(-1,-10,2,2,'#f06292');
            // whisker rects
            R(-14,-12,7,1,kc); R(-14,-10,7,1,kc);
            R(7,-12,7,1,kc);   R(7,-10,7,1,kc);
            break;
        }
        case 'cowboy': {
            const cc = isLocked ? '#888' : '#c68642';
            // boots (brown, with spurs)
            R(-7,14,7,5,'#5d4037'); R(1,14,7,5,'#5d4037');
            R(-9,17,2,2,'#ffd600'); R(8,17,2,2,'#ffd600'); // spurs
            // jeans (denim)
            R(-5,6,5,9,'#1565c0'); R(1,6,5,9,'#1565c0');
            // shirt (tan)
            R(-7,-8,14,15,'#a1887f');
            // vest
            R(-5,-8,4,12,'#795548'); R(2,-8,3,12,'#795548');
            // arms
            R(-11,-4,4,10,cc); R(8,-4,4,10,cc);
            // lasso in right hand (pixel art square coil)
            R(10,-8,9,2,F('#a1887f')); // top
            R(10,-6,2,7,F('#a1887f')); // left side
            R(17,-6,2,7,F('#a1887f')); // right side
            R(10,1,9,2,F('#a1887f'));  // bottom
            R(14,-8,2,7,F('#a1887f')); // rope going up from coil
            // revolver in left hand
            R(-16,-4,6,3,'#616161');
            R(-15,-7,4,4,'#424242');
            // face
            R(-5,-20,10,12,cc);
            // cowboy hat (brown, wide brim)
            R(-12,-22,24,4,'#5d4037'); // brim
            R(-7,-32,14,11,'#5d4037'); // crown
            R(-8,-23,16,2,'#795548'); // hat band
            // eyes
            R(-4,-16,2,2,'#212121'); R(2,-16,2,2,'#212121');
            // mustache
            R(-4,-11,8,3,'#4e342e');
            break;
        }
        case 'janitor': {
            const jac = isLocked ? '#888' : '#c68642';
            // boots
            R(-6,14,6,4,'#424242'); R(1,14,6,4,'#424242');
            // overalls (dark blue)
            R(-5,6,5,9,'#1a237e'); R(1,6,5,9,'#1a237e');
            R(-7,-8,14,15,'#1a237e'); // bib
            R(-6,-3,12,2,'#1565c0'); // strap
            // arms
            R(-11,-4,4,10,jac); R(8,-4,4,10,jac);
            // mop in right hand
            R(10,-24,3,30,'#8d6e63'); // handle
            R(7,-24,9,5,'#cfd8dc'); R(5,-22,13,3,'#cfd8dc'); R(7,-20,9,3,'#bdbdbd'); // mop head
            // bucket in left hand
            R(-16,4,8,9,'#ffd600');
            R(-17,3,10,2,'#f9a825'); // rim
            R(-15,4,2,9,'#fbc02d'); // handle
            // face
            R(-5,-20,10,12,jac);
            // bucket hat (gray)
            R(-8,-22,16,4,'#9e9e9e'); // brim
            R(-6,-28,12,7,'#757575'); // crown
            // eyes
            R(-4,-16,2,2,'#212121'); R(2,-16,2,2,'#212121');
            // small smile
            R(-3,-12,6,2,'#5d4037');
            break;
        }
        case 'baby': {
            const bbc = isLocked ? '#888' : '#ffccbc';
            // tiny feet (chubby)
            R(-5,14,5,4,bbc); R(1,14,5,4,bbc);
            // onesie (light blue, covers everything)
            R(-6,-2,12,16,'#b3e5fc');
            R(-5,-10,10,9,'#b3e5fc');
            // bib (white with drool)
            R(-4,-4,8,5,'#fff');
            R(-1,-1,2,2,'#e0f7fa'); // drool
            // stubby arms
            R(-9,-6,4,8,bbc); R(6,-6,4,8,bbc);
            // toy mallet in right hand
            R(9,-14,3,16,'#a1887f'); // handle
            R(7,-18,7,6,'#ef9a9a'); // mallet head
            // big head (oversized baby proportions)
            R(-7,-22,14,14,bbc);
            // bald with a single tuft of hair
            R(-2,-24,4,4,'#ffb74d');
            // big eyes (pixel art squares)
            R(-6,-20,5,5,'#212121'); R(1,-20,5,5,'#212121');
            R(-5,-19,2,2,'#fff'); R(2,-19,2,2,'#fff'); // eye shine
            // open mouth
            R(-3,-12,6,3,'#ef9a9a');
            R(-2,-12,4,2,'#fff'); // teeth (baby has some!)
            break;
        }
        case 'rubixCuber': {
            const rc2 = isLocked ? '#888' : '#c68642';
            // shoes (plain)
            R(-6,14,6,4,'#424242'); R(1,14,6,4,'#424242');
            // jeans
            R(-5,6,5,9,'#1565c0'); R(1,6,5,9,'#1565c0');
            // plain shirt (white)
            R(-7,-8,14,15,'#eeeeee');
            // arms
            R(-11,-4,4,10,rc2); R(8,-4,4,10,rc2);
            // Rubix cube held in both hands (colorful 3×3 grid)
            const cubeX = -9, cubeY = -16;
            const cColors = ['#f44336','#1565c0','#2e7d32'];
            const cubeGrid = [[0,1,2],[2,0,1],[1,2,0]];
            for (let cr = 0; cr < 3; cr++) {
                for (let cc2 = 0; cc2 < 3; cc2++) {
                    R(cubeX + cc2*6, cubeY + cr*6, 5, 5, cColors[cubeGrid[cr][cc2]]);
                }
            }
            // cube border
            R(cubeX-1, cubeY-1, 19, 19, 'rgba(0,0,0,0.3)'); // shadow — drawn BEFORE the cube is drawn so it goes under (render order is fine since fillRect stacks)
            // face (plain)
            R(-5,-20,10,12,rc2);
            // hair (regular)
            R(-6,-24,12,5,'#5d4037');
            // eyes
            R(-4,-16,2,2,'#212121'); R(2,-16,2,2,'#212121');
            R(-3,-12,6,2,'#5d4037'); // mouth
            break;
        }
        case 'paleontologist': {
            const pac = isLocked ? '#888' : '#c68642';
            // boots (brown)
            R(-7,14,7,5,'#795548'); R(1,14,7,5,'#795548');
            // khaki pants
            R(-5,6,5,9,'#c8b560'); R(1,6,5,9,'#c8b560');
            // professor shirt (beige)
            R(-7,-8,14,15,'#efebe9');
            // lab coat / field vest
            R(-7,-8,4,15,'#e0e0e0'); R(4,-8,3,15,'#e0e0e0');
            // arms
            R(-11,-4,4,10,pac); R(8,-4,4,10,pac);
            // fossil staff in right hand (bone top)
            R(10,-26,3,30,'#a1887f'); // staff
            R(7,-30,9,5,'#e0d5b5'); // bone crosspiece
            R(7,-26,3,4,'#e0d5b5'); R(15,-26,3,4,'#e0d5b5'); // bone ends
            // magnifying glass in left hand (pixel art square lens)
            R(-20,-8,12,12,F('#9e9e9e')); // frame outer
            R(-19,-7,10,10,F('#b3e5fc')); // glass inner
            R(-15,4,3,5,F('#795548'));    // handle
            // face
            R(-5,-20,10,12,pac);
            // wide-brim hat (explorer hat)
            R(-10,-22,20,4,'#8d6e63'); // brim
            R(-7,-30,14,9,'#6d4c41'); // crown
            // glasses (pixel art square frames)
            R(-7,-19,6,6,F('#424242')); // left lens outer
            R(-6,-18,4,4,F('#b3e5fc')); // left glass
            R(1,-19,6,6,F('#424242'));  // right lens outer
            R(2,-18,4,4,F('#b3e5fc'));  // right glass
            R(-1,-17,2,2,F('#424242')); // bridge
            // smile
            R(-3,-12,6,2,'#5d4037');
            break;
        }
    }
    c.restore();
}

function openCharacterSelect() {
    let selectedKey = persist.selectedCharacter || 'knight';
    if (!isCharacterUnlocked(selectedKey)) selectedKey = 'knight';

    const div = document.getElementById('char-choices');
    div.innerHTML = '';

    function updateInfoPanel(key) {
        const def = CHARACTERS[key];
        const panel = document.getElementById('char-info-panel');
        panel.innerHTML = '';
        const title = document.createElement('div');
        title.style.cssText = 'font-family:var(--font-pixel);font-size:8px;color:#d0a0ff;margin-bottom:6px;letter-spacing:1px;';
        title.textContent = def.name.toUpperCase() + ' — ' + def.desc;
        panel.appendChild(title);
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:20px;';
        const prosDiv = document.createElement('div');
        def.pros.forEach(p => { const d=document.createElement('div'); d.style.cssText='font-family:var(--font-pixel);font-size:6px;color:#66bb6a;line-height:1.9;'; d.textContent='+ '+p; prosDiv.appendChild(d); });
        const consDiv = document.createElement('div');
        def.cons.forEach(p => { const d=document.createElement('div'); d.style.cssText='font-family:var(--font-pixel);font-size:6px;color:#ef9a9a;line-height:1.9;'; d.textContent='− '+p; consDiv.appendChild(d); });
        row.appendChild(prosDiv); row.appendChild(consDiv);
        panel.appendChild(row);
        // Notes: white text, shown after pros/cons
        if (def.notes && def.notes.length > 0) {
            const notesDiv = document.createElement('div');
            notesDiv.style.cssText = 'margin-top:5px;';
            def.notes.forEach(n => { const d=document.createElement('div'); d.style.cssText='font-family:var(--font-pixel);font-size:6px;color:#ffffff;line-height:1.9;'; d.textContent='• '+n; notesDiv.appendChild(d); });
            panel.appendChild(notesDiv);
        }
        // Show trial info for locked wizard
        if (def.hasTrialUnlock && !persist.unlockedCharacters.includes(key)) {
            const attempts = persist.wizardAttempts || 0;
            const tier = Math.floor(attempts / 3);
            const waveTarget = 20 + tier * 5;
            const trialDiv = document.createElement('div');
            trialDiv.style.cssText = 'font-family:var(--font-pixel);font-size:6px;color:#40c4ff;margin-top:8px;line-height:2;';
            trialDiv.innerHTML = '⚡ Trial: Reach <b>Wave ' + waveTarget + '</b> to unlock<br>Attempts this tier: ' + (attempts % 3) + '/3';
            panel.appendChild(trialDiv);
        }
        // Show buy info for rich (and any future buy-unlock characters)
        const btn = document.getElementById('char-continue-btn');
        if (btn) {
            if (def.hasBuyUnlock && !persist.unlockedCharacters.includes(key)) {
                const canAfford = (persist.lifetimeGold || 0) >= def.buyPrice;
                btn.textContent = 'BUY (' + (def.buyPrice / 1000000) + 'M lifetime gold)';
                btn.style.color = canAfford ? '#ffd700' : '#ef9a9a';
            } else {
                btn.textContent = 'CONTINUE';
                btn.style.color = '';
            }
        }
    }

    Object.entries(CHARACTERS).forEach(([key, def]) => {
        const unlocked = isCharacterUnlocked(key);
        const card = document.createElement('div');
        card.className = 'char-card' + (unlocked ? '' : ' char-locked') + (key === selectedKey ? ' char-selected' : '');

        const cvs = document.createElement('canvas');
        cvs.width = 36; cvs.height = 54; cvs.className = 'char-preview';
        card.appendChild(cvs);

        if (unlocked) {
            const nameEl = document.createElement('div');
            nameEl.className = 'char-name';
            nameEl.textContent = def.name.toUpperCase();
            card.appendChild(nameEl);
        } else {
            const lockEl = document.createElement('div'); lockEl.className = 'char-lock-icon';
            lockEl.textContent = def.hasTrialUnlock ? '⚡' : '🔒';
            card.appendChild(lockEl);
            if (def.unlockHint) { const hintEl = document.createElement('div'); hintEl.className = 'char-lock-hint'; hintEl.textContent = def.unlockHint; card.appendChild(hintEl); }
        }

        if (unlocked) {
            card.addEventListener('click', () => {
                if (selectedKey === key) return;
                selectedKey = key;
                div.querySelectorAll('.char-card').forEach(c => c.classList.remove('char-selected'));
                card.classList.add('char-selected');
                updateInfoPanel(key);
            });
        } else if (def.hasTrialUnlock) {
            // Wizard trial: selectable even when locked — trial starts on continue
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                if (selectedKey === key) return;
                selectedKey = key;
                div.querySelectorAll('.char-card').forEach(c => c.classList.remove('char-selected'));
                card.classList.add('char-selected');
                updateInfoPanel(key);
            });
        } else if (def.hasBuyUnlock) {
            // Rich buy: selectable when locked — player pays lifetime gold on continue
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                if (selectedKey === key) return;
                selectedKey = key;
                div.querySelectorAll('.char-card').forEach(c => c.classList.remove('char-selected'));
                card.classList.add('char-selected');
                updateInfoPanel(key);
            });
        }

        div.appendChild(card);
        drawCharPreview(cvs, key, !unlocked);
    });

    // Block all mousedowns inside overlay from reaching window listener (capture phase)
    const overlay = document.getElementById('char-overlay');
    overlay.onmousedown = (e) => e.stopPropagation();

    const continueBtn = document.getElementById('char-continue-btn');
    continueBtn.onmousedown = (e) => e.stopPropagation();
    continueBtn.onclick = () => selectCharacter(selectedKey);

    updateInfoPanel(selectedKey);
    overlay.classList.remove('hidden');
    state.characterSelectOpen = true;
}

function selectCharacter(key) {
    const def = CHARACTERS[key];
    // Rich buy-unlock: gate on lifetime gold before proceeding
    if (def && def.hasBuyUnlock && !persist.unlockedCharacters.includes(key)) {
        if ((persist.lifetimeGold || 0) < def.buyPrice) {
            showNotif('Need ' + def.buyPrice.toLocaleString() + ' lifetime gold to hire Rich!');
            return;
        }
        persist.lifetimeGold -= def.buyPrice;
        persist.unlockedCharacters.push(key);
        savePersist(persist);
        showNotif('Hired! -' + (def.buyPrice / 1000000) + 'M lifetime gold. A pleasure doing business.');
    }
    persist.selectedCharacter = key;
    savePersist(persist);
    state.player.character = key;
    document.getElementById('char-overlay').classList.add('hidden');
    state.characterSelectOpen = false;
    // If wizard and not yet unlocked, auto-start the trial
    if (def && def.hasTrialUnlock && !persist.unlockedCharacters.includes(key)) {
        const attempts = persist.wizardAttempts || 0;
        const tier = Math.floor(attempts / 3);
        state.wizardTrialActive = true;
        state.wizardTrialWaveTarget = 20 + tier * 5;
        // Give starting fireball rune
        const p = state.player;
        p.ownedRunes['fireball'] = true;
        p.runeDurability['fireball'] = RUNES['fireball'].maxCharges;
        p.runeSlots[1] = 'fireball';
    }
    buildPetOverlay();
    document.getElementById('pet-overlay').classList.remove('hidden');
}

// (Wizard trial now handled inside selectCharacter — no separate overlay needed)

function drawSkinPreview(cvs, skinKey) {
    const c = cvs.getContext('2d');
    c.clearRect(0, 0, cvs.width, cvs.height);
    c.save();
    c.translate(cvs.width / 2, 47); // origin at character center
    const s = 1.5;

    let bodyCol = '#8b0000', legCol = '#555', bootCol = '#3e2723';
    if (skinKey === 'richestMan')    { bodyCol = '#c9a227'; legCol = '#a18a00'; bootCol = '#b8860b'; }
    else if (skinKey === 'deathDefied') { bodyCol = '#050510'; legCol = '#050510'; bootCol = '#0a0a20'; }
    else if (skinKey === 'steve')    { bodyCol = '#1565c0'; legCol = '#4a148c'; bootCol = '#3e2723'; }
    else if (skinKey === 'speedDemon')  { bodyCol = '#7f0000'; legCol = '#4a0000'; bootCol = '#3a0000'; }
    else if (skinKey === 'shadowSlayer') { bodyCol = '#1a0030'; legCol = '#0d0020'; bootCol = '#0d0020'; }
    else if (skinKey === 'mrBeast')  { bodyCol = '#0d1b3e'; legCol = '#0d1b3e'; bootCol = '#3e2723'; }

    // Boots
    c.fillStyle = bootCol; c.fillRect(-5*s, 12*s, 4*s, 3*s); c.fillRect(1*s, 12*s, 4*s, 3*s);
    // Legs
    c.fillStyle = legCol; c.fillRect(-4*s, 8*s, 3*s, 6*s); c.fillRect(1*s, 8*s, 3*s, 6*s);
    // Body
    c.fillStyle = bodyCol; c.fillRect(-6*s, -8*s, 12*s, 16*s);
    // Arms
    c.fillStyle = '#78909c'; c.fillRect(-9*s, -4*s, 3*s, 10*s); c.fillRect(6*s, -4*s, 3*s, 10*s);
    // Default helmet
    c.fillStyle = '#546e7a'; c.fillRect(-5*s, -14*s, 10*s, 10*s);
    c.fillStyle = '#1de9b6'; c.fillRect(-3*s, -10*s, 6*s, 2*s);
    c.fillStyle = '#8b0000'; c.fillRect(-1*s, -16*s, 2*s, 4*s);

    // Skin accessories
    if (skinKey === 'millionaire') {
        c.fillStyle = '#111'; c.fillRect(-7*s, -14*s, 14*s, 4*s);
        c.fillStyle = '#1a1a1a'; c.fillRect(-5*s, -26*s, 10*s, 14*s);
        c.fillStyle = '#ffd700'; c.fillRect(-2*s, -22*s, 4*s, 8*s);
        c.fillStyle = '#111'; c.fillRect(-1*s, -20*s, 2*s, 2*s);
    } else if (skinKey === 'mrBeast') {
        c.fillStyle = '#b0bec5'; c.fillRect(-5*s, -10*s, 10*s, 4*s);
        c.strokeStyle = '#ffd700'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(-2*s, -9*s, 3*s, 0, Math.PI*2); c.stroke();
        c.fillStyle = '#ffd700'; c.fillRect(-1*s, -9*s, 2*s, 4*s);
    } else if (skinKey === 'richestMan') {
        c.shadowColor = '#ffd700'; c.shadowBlur = 8;
        c.strokeStyle = 'rgba(255,215,0,0.5)'; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, 20*s, 0, Math.PI*2); c.stroke();
        c.shadowBlur = 0;
    } else if (skinKey === 'deathDefied') {
        c.fillStyle = '#050510'; c.fillRect(-8*s, -22*s, 16*s, 16*s);
        c.fillStyle = '#0a0a20'; c.fillRect(-5*s, -28*s, 10*s, 8*s);
        c.shadowColor = '#cc00ff'; c.shadowBlur = 6;
        c.fillStyle = '#cc00ff'; c.fillRect(-3*s, -17*s, 2*s, 2*s); c.fillRect(1*s, -17*s, 2*s, 2*s);
        c.shadowBlur = 0;
    } else if (skinKey === 'steve') {
        c.fillStyle = '#c8a870'; c.fillRect(-7*s, -22*s, 14*s, 12*s);
        c.fillStyle = '#4a2f18'; c.fillRect(-7*s, -22*s, 14*s, 5*s);
        c.fillStyle = '#1565c0'; c.fillRect(-5*s, -18*s, 3*s, 3*s); c.fillRect(2*s, -18*s, 3*s, 3*s);
        c.fillStyle = '#000'; c.fillRect(-3*s, -12*s, 6*s, 2*s);
    } else if (skinKey === 'speedDemon') {
        c.shadowColor = '#ff6600'; c.shadowBlur = 8;
        c.fillStyle = 'rgba(255,80,0,0.85)';
        c.fillRect(-3*s, 10*s, 2*s, 5*s); c.fillRect(1*s, 10*s, 2*s, 5*s);
        c.shadowBlur = 0;
    } else if (skinKey === 'shadowSlayer') {
        c.shadowColor = '#7b00d4'; c.shadowBlur = 8;
        c.strokeStyle = 'rgba(123,0,212,0.6)'; c.lineWidth = 1;
        c.strokeRect(-7*s, -14*s, 14*s, 30*s);
        c.fillStyle = 'rgba(180,0,255,0.7)';
        c.fillRect(-4*s, -4*s, 2*s, 2*s); c.fillRect(2*s, -4*s, 2*s, 2*s); c.fillRect(-1*s, 0, 2*s, 4*s);
        c.shadowBlur = 0;
    }
    c.restore();
}

function openSkinSelect() {
    const available = Object.entries(SKINS).filter(([key, s]) => !s.unlock || persist.achievements[s.unlock]);
    const div = document.getElementById('skin-choices');
    div.innerHTML = '';
    available.forEach(([key, s]) => {
        const btn = document.createElement('button');
        const isSel = (persist.selectedSkin || 'default') === key;
        btn.className = 'skin-btn' + (isSel ? ' char-selected' : '');
        const cvs = document.createElement('canvas');
        cvs.width = 50; cvs.height = 74; cvs.className = 'skin-preview';
        btn.appendChild(cvs);
        const nameDiv = document.createElement('div');
        nameDiv.className = 'skin-name'; nameDiv.textContent = s.name.toUpperCase();
        btn.appendChild(nameDiv);
        const descSpan = document.createElement('span');
        descSpan.textContent = s.desc; btn.appendChild(descSpan);
        btn.addEventListener('click', () => selectSkin(key));
        div.appendChild(btn);
        drawSkinPreview(cvs, key);
    });
    document.getElementById('skin-overlay').classList.remove('hidden');
}

function selectSkin(key) {
    persist.selectedSkin = key;
    savePersist(persist);
    document.getElementById('skin-overlay').classList.add('hidden');
    document.getElementById('pet-overlay').classList.remove('hidden');
}

function _giveWeapon(p, key) {
    p.weaponSlots[1] = key; p.weapon = key;
    if (!p.ownedWeapons.includes(key)) {
        p.ownedWeapons.push(key);
        p.weaponDurability[key] = ALL_WEAPONS[key].maxDurability;
    }
    p.ownedWeapons = p.ownedWeapons.filter(w => w === key || w !== 'sword');
    delete p.weaponDurability['sword'];
}

function applyCharacterBonuses() {
    const p = state.player;
    p.character = persist.selectedCharacter || 'knight';
    switch (p.character) {
        case 'knight':
            p.damageMult = (p.damageMult || 1) * 1.15;
            p.charBaseArmor = true;
            break;
        case 'hoarder':
            p.maxWeaponSlots = 4;
            if (!p.weaponSlots[4]) p.weaponSlots[4] = null;
            p.goldMult = (p.goldMult || 1) * 1.15;
            p.speed = Math.max(1.5, p.speed - 0.3);
            break;
        case 'reaper':
            p.damageMult = (p.damageMult || 1) * 1.6;
            p.maxHp -= 30; p.hp = p.maxHp;
            p.charNoShop = true;
            p.charKillHeal = 3;       // HP restored per kill
            p.charInstakill = 0.04;   // 4% chance to instakill on hit
            p.charInstakillable = 0.01; // 1% chance enemy instakills you
            p.charReaper = true;      // skeletons become allies
            p.weaponSlots[1] = 'scythe';
            p.weapon = 'scythe';
            if (!p.ownedWeapons.includes('scythe')) {
                p.ownedWeapons.push('scythe');
                p.weaponDurability['scythe'] = ALL_WEAPONS['scythe'].maxDurability;
            }
            p.ownedWeapons = p.ownedWeapons.filter(w => w !== 'sword');
            delete p.weaponDurability['sword'];
            break;
        case 'fat':
            p.maxHp += 80; p.hp = p.maxHp;
            p.damageMult = (p.damageMult || 1) * 1.3;
            p.speed = Math.max(1.2, p.speed * 0.6);
            p.charFat = true;
            _giveWeapon(p, 'dinnerFork');
            break;
        case 'collector':
            p.charDropMult = 1.5;
            p.charMagnetRadius = 90;
            p.charBetterUpgrades = true;
            p.charShopCostMult = 1.5;
            p.charCollector = true;
            _giveWeapon(p, 'goldenSword');
            break;
        case 'archer':
            p.charRangedMult = 1.4;
            p.charMeleeMult = 0.8;
            p.charHomingArrows = true;
            p.charPierceArrows = true;
            _giveWeapon(p, 'bow');
            break;
        case 'monsterTamer':
            p.damageMult = (p.damageMult || 1) * 0.5;
            p.speed = Math.max(1.2, p.speed * 0.75);
            p.charTamer = true;
            _giveWeapon(p, 'tamingWhip');
            break;
        case 'fashionModel':
            p.goldMult = (p.goldMult || 1) * 1.5;
            p.maxWeaponSlots = 1;
            p.charNoArmor = true;
            p.charModelAura = true;
            p.charFashion = true;
            _giveWeapon(p, 'stilettoHeel');
            break;
        case 'vampire':
            p.charLifesteal = 0.15;
            p.maxHp -= 20; p.hp = Math.min(p.hp, p.maxHp);
            p.charVampire = true;
            _giveWeapon(p, 'fangsWeapon');
            break;
        case 'rogue':
            p.critChance = (p.critChance || 0) + 0.22;
            p.speed += 0.8;
            p.maxHp = Math.max(30, p.maxHp - 60);
            p.hp = p.maxHp;
            p.charRogue = true;
            _giveWeapon(p, 'shadowBlade');
            break;
        case 'wizard':
            p.charWizard = true;
            p.mana = 100; p.maxMana = 100;
            p.runeSlots = 2;
            break;
        case 'gambler':
            p.charGambler = true;
            p.charShopCostMult = 0.6;
            { const gambWeapons = Object.keys(ALL_WEAPONS).filter(k => !ALL_WEAPONS[k].isFusion && !ALL_WEAPONS[k].isCharExclusive && !ALL_WEAPONS[k].isCharity && k !== 'sword');
              const gw = gambWeapons[Math.floor(Math.random() * gambWeapons.length)];
              _giveWeapon(p, gw); }
            break;
        case 'steve':
            p.charSteve = true;
            p.hunger = 100; p.maxHunger = 100;
            p.hungerTimer = 0;
            break;
        case 'lumberjack':
            p.damageMult = (p.damageMult || 1) * 1.4;
            p.speed = Math.max(1.2, p.speed * 0.7);
            p.charNoArmor = true;
            p.charAxeArc = true;
            _giveWeapon(p, 'ryanAxe');
            break;
        case 'ninja':
            p.speed += 1.5;
            p.critChance = (p.critChance || 0) + 0.25;
            p.maxHp = 50; p.hp = 50;
            p.charNinja = true;
            _giveWeapon(p, 'shuriken');
            break;
        case 'scientist':
            p.charScientist = true;
            _giveWeapon(p, 'chemFlask');
            break;
        case 'oldMan':
            p.damageMult = (p.damageMult || 1) * 0.6;
            p.speed = Math.max(0.8, p.speed * 0.6);
            p.charOldMan = true;
            p.timeTokens = 0;
            _giveWeapon(p, 'oldManCane');
            break;
        case 'robot':
            p.maxHp += 30; p.hp = p.maxHp;
            p.charRobot = true;
            p.laserTimer = (Math.floor(Math.random() * 26) + 15) * 60;
            p.shutdownTimer = (Math.floor(Math.random() * 101) + 100) * 60;
            p.isShutdown = false;
            break;
        case 'librarian':
            p.charLibrarian = true;
            _giveWeapon(p, 'magicStaff');
            break;
        case 'shopper':
            p.charShopper = true;
            p.totalPurchases = 0;
            _giveWeapon(p, 'shoppingBag');
            break;
        case 'gamer':
            p.charGamer = true;
            p.gamerCombo = 0; p.gamerComboTimer = 0;
            _giveWeapon(p, 'gameController');
            break;
        case 'angel':
            p.charAngel = true;
            p.maxHp += 20; p.hp = p.maxHp;
            p.charHealAura = true;
            _giveWeapon(p, 'divineSword');
            showNotif('Divine light surrounds you. Smite evil.');
            break;
        case 'diver':
            p.charDiver = true;
            _giveWeapon(p, 'harpoonGun');
            break;
        case 'dinosaur':
            p.charDinosaur = true;
            p.sizeScale = (p.sizeScale || 1) * 1.25;
            p.maxHp += 40; p.hp = p.maxHp;
            _giveWeapon(p, 'scythe');
            break;
        case 'demon':
            p.maxHp -= 20; p.hp = p.maxHp;
            p.charDemon = true;
            _giveWeapon(p, 'hellfireTrident');
            break;
        case 'alien':
            p.speed += 0.9;
            p.charInstakill = 0.10;
            p.charAlien = true;
            _giveWeapon(p, 'plasmaBlaster');
            break;
        case 'dragon':
            p.maxHp += 20; p.hp = p.maxHp;
            p.charDragon = true;
            p.charNoArmor = true;
            p.dragonBreathCharge = 0;
            _giveWeapon(p, 'dragonBreath');
            showNotif('Hold CLICK to charge breath. Release to fire!');
            break;
        case 'rich':
            p.goldMult = (p.goldMult || 1) * 1.5;
            p.charRich = true;
            state.butler = { x: p.x - 40, y: p.y, hp: 999, maxHp: 999, animTimer: 0, hurtTimer: 0, attackCooldown: 0, facingX: 1 };
            _giveWeapon(p, 'monoLaser');
            break;
        case 'monsterChar':
            p.charMonster = true;
            _giveWeapon(p, 'scythe');
            break;
        case 'blob':
            p.charBlob = true;
            p.charNoShop = true;
            p.maxHp = 60; p.hp = 60;
            // Start with spike + eye genes equipped
            p.blobGenes = ['spike', 'eye'];
            p.blobGeneUnlocks = { spike: true, eye: true };
            p.blobDamageDealt = 0; p.blobDmgTaken = 0; p.blobWavesSurvived = 0; p.blobKillCount = 0;
            // Spike = starting weapon; eye = range bonus
            p.ownedWeapons = ['blobSpike'];
            p.weapon = 'blobSpike';
            p.weaponSlots = { 1: 'blobSpike', 2: null, 3: null };
            p.weaponDurability = { blobSpike: ALL_WEAPONS.blobSpike.maxDurability };
            p.damageMult = (p.damageMult || 1) * 1.25;   // spike
            p.attackRangeBonus = (p.attackRangeBonus || 0) + 30; // eye
            break;
        case 'witch':
            p.charWitch = true;
            p.maxHp = 65; p.hp = 65;
            p.speed += 0.3;
            // Broomstick as melee weapon with knockback
            p.charKnockbackMelee = true;
            p.witchPotionReady = true; // get a potion at wave start
            showNotif('A potion brews at each wave start. [P to open shop]');
            break;
        case 'pirate':
            p.charPirate = true;
            p.charBonusGoldRoll = true; // on kill: bonus gold 25-100g chance
            p.charGrapple = true; // dash is replaced by grapple hook
            p.charNoArmor = true;
            p.speed -= 0.2; // slightly slow (peg leg)
            showNotif('Grapple replaces dash! SPACE to hook enemies in.');
            break;
        case 'villager':
            p.charVillager = true;
            p.charNoArmor = true;
            p.maxHp -= 15; p.hp = Math.max(1, p.maxHp);
            _giveWeapon(p, 'pitchfork');
            showNotif('Angry mob of one!');
            break;
        case 'sailor':
            p.charSailor = true;
            _giveWeapon(p, 'fishingRod');
            showNotif('The sea awaits! Right-click = telescope. 2× speed on water.');
            break;
        case 'engineer':
            p.charEngineer = true;
            p.speed *= 0.8;
            _giveWeapon(p, 'wrench');
            showNotif('Wrench time! 2× damage vs bosses. Repair barricades with G.');
            break;
        case 'commander':
            p.charCommander = true;
            _giveWeapon(p, 'megaphone');
            showNotif('Sound off! Megaphone: expanding rings. Press E to rally!');
            break;
        case 'astronaut':
            p.charAstronaut = true;
            state.alienWorld = true;
            _giveWeapon(p, 'plasmaCannon');
            showNotif('Alien world! Human marines are your allies. Aliens are NOT happy.');
            break;
        case 'stickman':
            p.charStickman = true;
            state.stickWorld = true;
            _giveWeapon(p, 'stick');
            showNotif('Drawn from a notebook! Hold attack for 360° spin. Chop oaks for branches.');
            break;
        case 'caveman':
            p.charCaveman = true;
            p.charNoShop = true;
            p.charNoArmor = true;
            p.speed *= 0.7;
            _giveWeapon(p, 'club');
            showNotif('UGH. No shop. Big club. Immune to lava. Type "eatwood" to eat wood.');
            break;
        case 'clown':
            p.charClown = true;
            _giveWeapon(p, 'balloonSword');
            showNotif('HONK! Pets are now balloon animals! Joy aura drops bonus gold!');
            break;
        case 'bob': {
            p.charBob = true;
            const bobWeapons = Object.keys(ALL_WEAPONS).filter(k => !ALL_WEAPONS[k].isFusion && !ALL_WEAPONS[k].isCharExclusive && !ALL_WEAPONS[k].isCharity && k !== 'sword');
            const bobWpn = bobWeapons[Math.floor(Math.random() * bobWeapons.length)];
            _giveWeapon(p, bobWpn);
            showNotif('Your weapon is: ' + ALL_WEAPONS[bobWpn].name + '! Good luck, Bob.');
            break;
        }
        case 'youtuber':
            p.charYoutuber = true;
            p.subscribers = 0;
            _giveWeapon(p, 'selfieStick');
            showNotif('SMASH THAT LIKE BUTTON! Kills = subscribers = bonus gold!');
            break;
        case 'koolKat':
            p.charKoolKat = true;
            p.koolKatLives = 9;
            p.koolKatMode = 0;
            p.maxHp = 30; p.hp = 30;
            _giveWeapon(p, 'koolKatClaws');
            showNotif('9 lives! Claws → Meow → Coolness Effect. Cycle on each attack. Deal with it.');
            break;
        case 'cowboy':
            p.charCowboy = true;
            p.goldMult = (p.goldMult || 1) * 2;
            p.revolverShots = 6;
            p.revolverReload = 0;
            _giveWeapon(p, 'lasso');
            p.weaponSlots[2] = 'revolver';
            if (!p.ownedWeapons.includes('revolver')) p.ownedWeapons.push('revolver');
            p.weaponDurability['revolver'] = 9999;
            showNotif('Lasso + Revolver! 2× bounty gold. Press R to switch. 6 shots then reload!');
            break;
        case 'janitor':
            p.charJanitor = true;
            p.bucketCooldown = 0;
            p.vacuumCooldown = 0;
            _giveWeapon(p, 'mop');
            showNotif('Mop it up! SHIFT: bucket throw. E: vacuum pull. Mop leaves slippery trails!');
            break;
        case 'baby':
            p.charBaby = true;
            p.maxHp = 20; p.hp = 20;
            p.sizeScale = (p.sizeScale || 1) * 0.5;
            _giveWeapon(p, 'toyMallet');
            showNotif('googoogaga! 40% dodge. 2-hit death. Tiny hitbox!');
            break;
        case 'rubixCuber':
            p.charRubixCuber = true;
            _giveWeapon(p, 'cubeBomb');
            showNotif('Cube bomb ready! Throw to explode in colorful AoE!');
            break;
        case 'paleontologist':
            p.charPaleo = true;
            p.fossilMinions = [];
            _giveWeapon(p, 'fossilStaff');
            showNotif('Fossil staff! Kills summon fossil dino minions (max 3).');
            break;
    }
}
// Wire up sailor/pirate world terrain inversion AFTER applyCharacterBonuses runs
const _origApplyCharBonus = applyCharacterBonuses;
// (sailor/pirate world terrain is applied in selectPet after spawnCrocodiles)

// Pet overlay built after function is defined.
buildPetOverlay();
