// ─── INPUT ───
// Dev tool: press \ to activate, type command, press Enter to execute
let _devBuffer = null;

window.addEventListener('keydown', e => {
    // Never process game keys when the user is typing in an input field
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Dev tool intercept
    if (e.key === '\\') { _devBuffer = ''; e.preventDefault(); return; }
    if (_devBuffer !== null) {
        if (e.key === 'Escape') { _devBuffer = null; return; }
        if (e.key === 'Enter') {
            const cmd = _devBuffer.trim();
            _devBuffer = null;
            if (cmd === 'unlock_all') {
                const keys = Object.keys(CHARACTERS);
                keys.forEach(k => { if (!persist.unlockedCharacters.includes(k)) persist.unlockedCharacters.push(k); });
                // Grant all achievement-based unlock conditions
                Object.values(CHARACTERS).forEach(def => {
                    if (def.unlock && def.unlock !== 'custom') persist.achievements[def.unlock] = true;
                });
                // Grant all achievements (pets, skins, stat unlocks)
                Object.keys(ACHIEVEMENTS).forEach(id => { persist.achievements[id] = true; });
                // Unlock all bestiary entries
                if (!persist.seenEnemies) persist.seenEnemies = {};
                Object.keys(BESTIARY_INFO).forEach(type => { persist.seenEnemies[type] = true; });
                persist.htpDismissed = true;
                persist.lifetimeGold = (persist.lifetimeGold || 0) + 100000000; // enough for rich
                savePersist(persist);
                showNotif('[DEV] All characters + achievements + bestiary unlocked!', true);
            } else if (cmd.startsWith('unlock ') || cmd.startsWith('unlock_')) {
                const charKey = cmd.slice(7).trim().toLowerCase().replace(/_/g, '');
                const allKeys = Object.keys(CHARACTERS);
                const match = allKeys.find(k => k.toLowerCase() === charKey) ||
                              allKeys.find(k => CHARACTERS[k].name.toLowerCase() === charKey);
                if (match) {
                    if (!persist.unlockedCharacters.includes(match)) persist.unlockedCharacters.push(match);
                    const def = CHARACTERS[match];
                    if (def.unlock && def.unlock !== 'custom') persist.achievements[def.unlock] = true;
                    savePersist(persist);
                    showNotif('[DEV] Unlocked: ' + CHARACTERS[match].name + '!', true);
                    if (state.characterSelectOpen || !state.difficulty) openCharacterSelect();
                } else {
                    const names = allKeys.map(k => k).join(', ');
                    showNotif('[DEV] Unknown: "' + charKey + '". Valid: ' + names.slice(0, 80) + '...', true);
                }
            } else {
                showNotif('[DEV] Unknown command: ' + cmd);
            }
            return;
        }
        if (e.key === 'Backspace') { _devBuffer = _devBuffer.slice(0, -1); }
        else if (e.key.length === 1) { _devBuffer += e.key; }
        e.preventDefault();
        return;
    }

    state.keys[e.key.toLowerCase()] = true;
    const k = e.key.toLowerCase();
    // Block in-game hotkeys while the game-over/death overlay is visible
    const _overlayOpen = document.getElementById('overlay') && !document.getElementById('overlay').classList.contains('hidden');
    if (_overlayOpen) return;
    if (k === 'p') toggleShop();
    if (k === 'escape') togglePause();
    if (k === '1') { if (state.player.character === 'wizard') castRune(1); else equipSlot(1); }
    if (k === '2') { if (state.player.character === 'wizard') castRune(2); else equipSlot(2); }
    if (k === '3') { if (state.player.character === 'wizard') castRune(3); else equipSlot(3); }
    if (k === '4') { if (state.player.character === 'wizard') castRune(4); else equipSlot(4); }
    if (k === '5') equipSlot(5);
    if (k === 'b') toggleBlacksmith();
    if (k === 'c') toggleDive();
    if (k === 'f') lightTorch();
    if (k === 'g') deployBarricade();
    if (k === 'e') {
        // Janitor vacuum: pull all nearby enemies toward player
        const p3 = state.player;
        if (!state.paused && !state.gameOver && p3.charJanitor && (p3.vacuumCooldown || 0) <= 0) {
            state.enemies.forEach(en => {
                const vdx = p3.x - en.x, vdy = p3.y - en.y, vd = Math.hypot(vdx, vdy);
                if (vd < 200 && vd > 5) { en.x += (vdx / vd) * 60; en.y += (vdy / vd) * 60; }
            });
            p3.vacuumCooldown = 90; // 1.5s
            showNotif('VACUUM! 🌀');
            createExplosion(p3.x, p3.y, '#4fc3f7');
        }
        // Paleontologist: examine fossil
        if (!state.paused && !state.gameOver && p3.character !== 'dinosaur' && persist.fossilPos) {
            const fdx = p3.x - persist.fossilPos.x, fdy = p3.y - persist.fossilPos.y;
            if (Math.hypot(fdx, fdy) < 60) {
                persist.fossilPos = null; savePersist(persist);
                if (!persist.achievements.paleoUnlock) grantAchievement('paleoUnlock');
            }
        }
    }
    if (k === 'q') useWitchPotion();
    if (k === 'x') craftSkeletonWarrior();
    if (k === 'z' && state.hasRubixCube && !state.gameOver && !state.paused) openRubixMinigame();
    if (k === ' ') { e.preventDefault(); tryDash(); }
    // Janitor bucket throw (SHIFT key)
    if ((k === 'shift' || e.key === 'Shift') && !state.paused && !state.gameOver) {
        const p4 = state.player;
        if (p4.charJanitor && (p4.bucketCooldown || 0) <= 0) {
            const bfx = p4.facingX || 1, bfy = p4.facingY || 0;
            state.projectiles.push({
                x: p4.x, y: p4.y,
                vx: bfx * 9, vy: bfy * 9,
                life: 24, damage: 18, type: 'bucket',
                color: '#29b6f6', radius: 10
            });
            p4.bucketCooldown = 90;
            showNotif('Bucket throw!');
        }
    }
    if (k === 'tab') { e.preventDefault(); toggleFullscreen(); }
    // Caveman "eatwood" key sequence
    if (!state.paused && !state.gameOver && e.key.length === 1) {
        const p2 = state.player;
        p2.cavemanEatSeq = ((p2.cavemanEatSeq || '') + e.key.toLowerCase()).slice(-7);
        if (p2.cavemanEatSeq === 'eatwood') {
            p2.cavemanEatSeq = '';
            if ((p2.pineWood || 0) + (p2.redWood || 0) > 0) {
                if (p2.pineWood > 0) p2.pineWood--; else p2.redWood--;
                p2.hp = Math.min(p2.maxHp, p2.hp + 5);
                showNotif('Om nom nom. +5 HP!');
                if (!persist.achievements.cavemanUnlock) grantAchievement('cavemanUnlock');
            }
        }
    }
});
window.addEventListener('keyup', e => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    state.keys[e.key.toLowerCase()] = false;
});
window.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    // Divide by CSS scale so mouse coords match logical canvas coords in fullscreen
    state.mouse.x = (e.clientX - r.left) * canvas.width / r.width;
    state.mouse.y = (e.clientY - r.top) * canvas.height / r.height;
});
window.addEventListener('mousedown', (e) => {
    if (state.gameOver || state.paused || state.characterSelectOpen) return;
    if (e.target.closest('button, input, select, #ui-layer')) return;
    state.mouseHeld = true;
    if (!state.player.charDragon) playerAttack();
    state._mpAttacking = true; // tell host we attacked this frame
});
window.addEventListener('mouseup', () => { state.mouseHeld = false; });
canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (state.player.charSailor && !state.paused && !state.gameOver) {
        state.telescopeActive = !state.telescopeActive;
        showNotif(state.telescopeActive ? 'Telescope: looking ahead...' : 'Telescope down.');
    }
});
document.getElementById('restart-btn').addEventListener('click', () => location.reload());
document.getElementById('reset-progress-btn').addEventListener('click', () => resetProgress());
// MP death screen buttons
document.getElementById('mp-spectate-btn').addEventListener('click', () => {
    // Hide the death overlay, stay in spectate mode (camera follows host)
    _mpDeathOverlayHide();
});
document.getElementById('mp-quit-btn').addEventListener('click', () => {
    _mpDeathOverlayHide();
    if (typeof mpDisconnect === 'function') mpDisconnect();
});
document.getElementById('mp-respawn-btn').addEventListener('click', () => {
    if (typeof mpRequestRespawn === 'function') mpRequestRespawn();
});
document.getElementById('pause-reset-btn').addEventListener('click', () => resetProgress());
document.getElementById('pause-ach-btn').addEventListener('click', () => openAchievementsPanel());
document.getElementById('ach-panel-close').addEventListener('click', () => document.getElementById('ach-panel').classList.add('hidden'));
document.getElementById('pause-bestiary-btn').addEventListener('click', () => openBestiary());
document.getElementById('bestiary-close-btn').addEventListener('click', () => {
    document.getElementById('bestiary-panel').classList.add('hidden');
    const pauseEl = document.getElementById('pause-overlay');
    const pauseVisible = pauseEl && !pauseEl.classList.contains('hidden');
    if (!state.gameOver && !pauseVisible) state.paused = false;
});
document.getElementById('post-reaper-keep').addEventListener('click', () => {
    document.getElementById('post-reaper-overlay').classList.add('hidden');
    state.endlessMode = true;
    state.endlessTimer = 0;
    state.paused = false;
    showNotif('Endless Mode! Face infinite hordes...', true);
});
document.getElementById('post-reaper-quit').addEventListener('click', () => {
    document.getElementById('post-reaper-overlay').classList.add('hidden');
    endGame();
});
document.getElementById('shop-close-btn').addEventListener('click', () => toggleShop());
document.getElementById('shop-btn').addEventListener('click', () => toggleShop());
document.getElementById('blacksmith-btn').addEventListener('click', () => toggleBlacksmith());
document.getElementById('blacksmith-close-btn').addEventListener('click', () => toggleBlacksmith());
document.getElementById('bs-tabs').addEventListener('click', e => {
    const tab = e.target.dataset?.tab;
    if (tab) setBlacksmithTab(tab);
});
document.getElementById('diff-easy').addEventListener('click', () => selectDifficulty('easy'));
document.getElementById('diff-normal').addEventListener('click', () => selectDifficulty('normal'));
document.getElementById('diff-hard').addEventListener('click', () => selectDifficulty('hard'));
document.getElementById('diff-extreme').addEventListener('click', () => selectDifficulty('extreme'));
// Show extreme button if already unlocked
if (persist.extremeUnlocked) document.getElementById('diff-extreme').style.display = '';
function buildDynamicLore() {
    const el = document.getElementById('lore-dynamic');
    if (!el) return;
    const uc = persist.unlockedCharacters || [];
    const ach = persist.achievements || {};

    // ── Character blurbs ──────────────────────────────────────────────────────
    // key → blurb text. null key = always shown (base characters).
    const BLURBS = [
        // BASE — always visible
        { key: null, name: 'The Knight',
          text: 'The Knight is the first. The original. The template from which all others deviate. His sword is reliable, his fate is not, and the number of runs ended by overconfident melee range is not something the archives record but absolutely should.' },
        { key: null, name: 'The Villager',
          text: 'The Villager arrived at the castle gates with a pitchfork and refused to leave until added to the roster. The royal hiring committee did not invite him. He showed up anyway, and the committee was frankly too afraid of the pitchfork to say no.' },
        { key: null, name: 'The Archer',
          text: 'The Archer prefers distance. From enemies, from NPCs, from conversations, from everything. His arrows home to the nearest target. His social skills do not. He considers this an acceptable tradeoff and has not asked for anyone\'s opinion on the matter.' },
        // UNLOCKABLE
        { key: 'reaper', name: 'The Reaper',
          text: 'The Reaper grew tired of working for free. After millennia of claiming the dead on behalf of abstract forces, he switched sides — kills restore his HP, skeletons auto-ally with him, and the shop is off-limits. The realm considers this ethically ambiguous. He considers it overdue.' },
        { key: 'monsterChar', name: 'The Monster',
          text: 'The Monster was tamed, and then he turned around. He now fights on the knight\'s side, which means fighting the knights. His former colleagues have not taken this gracefully. He does not apologize. He does not have the vocal anatomy for it.' },
        { key: 'dinosaur', name: 'The Dinosaur',
          text: 'The Dinosaur predates everything, including reasonable game balance. Extinction didn\'t take — he simply waited several million years for the pixel age to arrive, then returned with a roar that temporarily deranges nearby enemies and a body that grows larger over time. This was not in the design document.' },
        { key: 'dragon', name: 'The Dragon',
          text: 'The Dragon underwent a ritual. The details are not recorded. Something was sacrificed. Something was gained. The result is a creature immune to lava who breathes fire on held command. He has no armor slots. He does not need armor slots. He is a dragon.' },
        { key: 'ninja', name: 'The Ninja',
          text: 'The Ninja has never been seen arriving anywhere. He is simply already there when you look. Fifty max HP. Dash makes him invisible. Very high crit rate. Whether fifty HP is a profound statement about speed over longevity or a significant design flaw is left as an exercise to the player.' },
        { key: 'rogue', name: 'The Rogue',
          text: 'The Rogue attacks from behind. Most enemies consider this unsporting. Most tacticians consider it brilliant. The Shadow Blade supercharges after a dash. Do not stand in front of her, because she will not be there by the time you look.' },
        { key: 'vampire', name: 'The Vampire',
          text: 'The Vampire has a pending copyright dispute with the enemy Vampires regarding name usage. His lawyer, who is also a vampire (and is named Vampire (don\'t ask about it it\'s weird (at least he\'s paying well, but why does his lawyer bother?))), is handling it. He thrives at night — faster and stronger — and suffers during daylight. The day/night cycle is thus a personal matter for him.' },
        { key: 'sailor', name: 'The Sailor',
          text: 'The Sailor was found adrift on a lake. The circumstances of his recruitment remain unclear. On water he moves at double speed; on land he moves at half. He is aware of this tradeoff and has deep, complicated feelings about dry ground.' },
        { key: 'pirate', name: 'The Pirate',
          text: 'The Pirate makes money. Every kill has a bonus gold roll. Every engagement is a transaction. The grapple hook is a business tool and the cutlass is a closing argument. He needed ten bones, twenty croc kills, one shark kill, and a hundred thousand gold just to qualify. He considers these reasonable prerequisites.' },
        { key: 'wizard', name: 'The Wizard',
          text: 'The Wizard completed a trial. The details are obscure and the prize significant: rune-powered spells that bypass the weapon economy entirely. His mana charges over time. His patience with mana-draining fights is finite. He does not discuss the trial.' },
        { key: 'witch', name: 'The Witch',
          text: 'The Witch\'s potions are random. This is not a bug. She brews chaos as a philosophy — the wave-start potion might freeze the entire screen or barely manage a light drizzle. She is at peace with this uncertainty in a way players have struggled to match.' },
        { key: 'angel', name: 'The Angel',
          text: 'The Angel descended after enough healings were observed. She passively heals, fires holy projectiles, and is, by every metric, a good person. This makes her somewhat anomalous among this roster. She does not comment on this.' },
        { key: 'fashionModel', name: 'The Fashion Model',
          text: 'The Fashion Model earns fifty percent bonus gold from kills and does not find this alarming. Her beauty aura slows nearby enemies every two seconds. She has one weapon slot, no armor, shop costs more, and surviving knights have not satisfactorily explained why these feel like acceptable terms.' },
        { key: 'gamer', name: 'The Gamer',
          text: 'The Gamer has played more runs than you. He earns bonus damage per kill combo, gains cheat codes from boss kills, and occasionally lags — a brief movement freeze. He insists this has happened before and he knows how to handle it. He sometimes does not.' },
        { key: 'shopper', name: 'The Shopper',
          text: 'The Shopper\'s bonus scales with gold held, which means spending gold is technically self-defeating. He knows this. He buys things anyway. The shop refreshes every wave. The prices are reasonable. This is, he knows, exactly the problem.' },
        { key: 'rich', name: 'Rich',
          text: 'The Rich character has a butler. The butler fights. The butler demands payment every five waves. If payment is not delivered, the run ends. This may be the most accurate simulation of wealth dynamics in any video game produced to date.' },
        { key: 'fat', name: 'Fat',
          text: 'The Fat character\'s stats are listed as ???. His weapon is a Dinner Fork. His cons are also ???. He unlocks the Dinosaur if killed by crocodiles after engaging thirty of them simultaneously. The realm offers no explanation for any of this. The realm has a sense of humor.' },
        { key: 'scientist', name: 'The Scientist',
          text: 'The Scientist replaced the Blacksmith with a mixing station and did not look back. His Chemical Flasks are brewed from shop ingredients and each has a unique effect. He was unlocked by killing a boss with an explosion. The records do not specify whether this was intentional. The records do not ask.' },
        { key: 'robot', name: 'The Robot',
          text: 'The Robot fires a laser beam every fifteen to forty seconds in the direction of movement. It also randomly shuts down for five seconds every one hundred to two hundred seconds. BEEP BOOP. This is by design. BEEP BOOP. The realm confirms this is intentional. BEEP BOOP.' },
        { key: 'engineer', name: 'The Engineer',
          text: 'The Engineer repairs barricades by standing on them. He halves their wood cost, doubles their HP, and deals double damage to bosses. He moves slowly. He is building something. Other warriors are advised to stay out of his way while he does it.' },
        { key: 'alien', name: 'The Alien',
          text: 'The Alien is not from here. This is apparent from the teleport-dash, the simultaneous all-weapons firing, and the ten percent instakill chance. They play against a harder enemy roster because the realm adjusts to perceived threats. The realm is not wrong.' },
        { key: 'astronaut', name: 'The Astronaut',
          text: 'The Astronaut arrived after completing a pacifist run as the Alien — the only way to reach a planet with allied marines is apparently to not kill anyone on the way there. He now has those marines. The marines and the alien faction fight each other constantly. He considers this fine. It is, tactically, fine.' },
        { key: 'caveman', name: 'The Caveman',
          text: 'The Caveman typed \'eatwood\' while holding wood and was rewarded with a character slot. He cannot use the shop or the blacksmith. He stuns enemies, bashes trees in one hit, and is immune to lava damage. These are his gifts. For him, they are sufficient.' },
        { key: 'stickman', name: 'The Stickman',
          text: 'The Stickman was drawn in a notebook and achieved sentience. The world around him becomes a pencil sketch. His Stick attacks very fast and spins 360 degrees when held. His barricades have 1 HP. The Stickman is a speed character. Use the Stickman for speed. Do not use the Stickman for barricades.' },
        { key: 'clown', name: 'The Clown',
          text: 'The Clown\'s balloon sword has very low damage and breaks fast. His pets appear as balloon animals. His joy aura makes enemies drop bonus gold. When a pet dies, the balloon pop stuns nearby enemies. Everyone is laughing — even, somehow, the enemies. The Clown expected this.' },
        { key: 'monsterTamer', name: 'The Monster Tamer',
          text: 'The Monster Tamer carries a whip and two pets and the quiet confidence of someone who has read the rules carefully and followed them exactly four times. Enemies may defect when striking him. He does fifty percent player damage. He has two pets. He considers this a reasonable arrangement.' },
        { key: 'oldMan', name: 'The Old Man',
          text: 'The Old Man is slow. His cane has low base damage. Collect three time tokens and he enters SUPER OLD MAN mode: enormous size, every stat maxed, cane becomes any weapon for five seconds. He then returns to being slow and old. The window was worth it. It always is.' },
        { key: 'diver', name: 'The Diver',
          text: 'The Diver was found in the deep after spending enough time below the surface to be worth documenting. Beneath the waterline lie treasure chests, fish, sharks, and stone passages connecting seemingly separate lakes. Safe from most land enemies while submerged. Not safe from everything else. He knew this going in.' },
        { key: 'blob', name: 'The Blob',
          text: 'The Blob has no weapons. It has genes. Genes replace upgrades. Genes alter biology. Start with Spike and Eye. Absorb the fallen to unlock more. By wave twenty, the Blob can be almost anything. By wave one, it is a small sphere with two options. Progress is relative.' },
        { key: 'hoarder', name: 'The Hoarder',
          text: 'The Hoarder fires two weapons simultaneously, right-click for secondary. He has an extra slot and fifteen percent bonus gold and moves slightly slower. He considers none of this a problem. He has more guns than you. He has opinions about this. The opinions are satisfied.' },
        { key: 'collector', name: 'The Collector',
          text: 'The Collector has a built-in magnet, a superior upgrade pool, and fifty percent better collectible drops. She also auto-sells unused weapons every ten to thirty waves. She is at peace with this in the way of someone who has too many things anyway and knows it.' },
        { key: 'gambler', name: 'The Gambler',
          text: 'The Gambler\'s pets, upgrades, and wave effects are all fully randomised. The potential upside is massive. The downside is also possible. The Gambler knows the odds. The Gambler is not playing against the odds. The Gambler is the odds. The Gambler rolled this blurb too.' },
        { key: 'steve', name: 'Steve',
          text: 'Steve is a regular guy with a diamond sword. He gets hungry — stamina drains over time. He has no special abilities. He is balanced. He is definitely not stolen from any intellectual property and the developer thanks you for not raising the matter.' },
        { key: 'lumberjack', name: 'The Lumberjack',
          text: 'The Lumberjack felled every tree in his world. All of them. Every last one. The achievement said \'Fell every tree\' and he took it personally. His axe swings wide and hits multiple enemies. He moves slowly. The trees moved slower. This worked out.' },
        { key: 'librarian', name: 'The Librarian',
          text: 'The Librarian unlocked by reading the lore all the way to the end without skipping. She studied hard. Her upgrades multiply instead of adding flat. She has six more upgrade choices than normal. She bought the correct book. Knowledge is, demonstrably, power.' },
        { key: 'demon', name: 'The Demon',
          text: 'The Demon is native to lava. He is immune to it. He deals forty percent bonus damage while standing in it and his fire aura slows nearby enemies. Outside lava: minus twenty max HP, minus fifteen percent speed. He does not go outside lava. It is a lifestyle, not a build.' },
        { key: 'commander', name: 'The Commander',
          text: 'The Commander unlocked by finishing the first run — someone had to. He fires expanding sound rings that stun, silence, and buff allies. His rally shout adds twenty-five percent personal damage for five seconds. Pets deal thirty percent more damage near him. He commands. Things obey.' },
        { key: 'bob', name: 'Bob',
          text: 'Bob lost ten runs. He appeared on the roster afterward with a smile and a completely random starting weapon. Nobody asked him to show up. He simply did. He has no special stats. Nearby enemies occasionally stop and stare at him for one second. Bob accepts this as his identity.' },
        { key: 'youtuber', name: 'The Youtuber',
          text: 'The Youtuber reached wave thirty and earned his slot. Kills generate subscriber bonus gold. Some enemies randomly become fans and fight for him. The Selfie Stick has wide arc and massive knockback. SMASH THAT LIKE BUTTON is listed in his character notes. The realm does not have a like button. He is working on this.' },
        { key: 'koolKat', name: 'Kool Kat',
          text: 'The Kool Kat has thirty max HP, nine lives, and three cycling weapons: Claws, Meow, and the Coolness Effect. The Coolness Effect gives enemies deal-with-it sunglasses and converts them to allies. The Kool Kat views this as inevitable. It is, after all, impossible to resist cool.' },
        { key: 'cowboy', name: 'The Cowboy',
          text: 'The Cowboy completed a Hard difficulty run and arrived on the roster with a lasso, a revolver, and double gold from all kills. The revolver holds six shots and then a two-second reload. He has opinions about the reload window. The opinions are stoic. They are always stoic.' },
        { key: 'janitor', name: 'The Janitor',
          text: 'The Janitor picked up fifty items in five seconds and the realm considered this efficient enough to warrant its own character. He leaves slippery mop trails, throws water buckets, and vacuums enemies toward him with a press of E. His damage is low. His floor is clean. This is enough.' },
        { key: 'baby', name: 'The Baby',
          text: 'The Baby died within the first thirty seconds of a run and was added to the roster as acknowledgment. He has twenty max HP and dies in two hits. He also has a forty percent dodge chance and a tiny hitbox. The Toy Mallet delivers massive knockback. He does not know what most of these words mean.' },
        { key: 'rubixCuber', name: 'The Rubix Cuber',
          text: 'The Rubix Cuber found a cube in a chest, solved the minigame, and was rewarded with a character slot. Her weapon is an explosive Rubix Bomb — thrown, colorful, wide stun radius, long cooldown. Her melee is not impressive. She solved the cube. The cube is impossible. She does not need impressive melee.' },
        { key: 'paleontologist', name: 'The Paleontologist',
          text: 'The Paleontologist fires bone shards from a fossil staff. His kills summon fossil dinosaur minions — up to three at once, each with a twenty-second lifespan. He is fragile. He has three dinosaurs. The math works out in his favor more often than not, and he knows it.' },
    ];

    let html = '';

    // Build character blurbs
    const visibleBlurbs = BLURBS.filter(b => b.key === null || uc.includes(b.key));
    if (visibleBlurbs.length > 0) {
        html += '<hr><p><strong>THE CHRONICLES OF YOUR HEROES</strong></p>';
        html += '<p><em>The following entries have been added to the archive as each warrior proved themselves worthy of documentation.</em></p>';
        for (const b of visibleBlurbs) {
            html += `<p><em>${b.name}</em> — ${b.text}</p>`;
        }
    }

    // Sailor world lore (gated behind sailor or pirate unlock)
    if (uc.includes('sailor') || uc.includes('pirate')) {
        html += '<hr><p><strong>THE SAILOR\'S WORLD</strong></p>';
        html += '<p>Certain warriors know a world that landlocked knights will never see. In the Sailor\'s World, the proportions are inverted: ocean dominates, and land is the exception — grass islands rising from the endless blue like forgotten afterthoughts.</p>';
        html += '<p>The crocodiles remain, but repurposed. Former lake positions are now elevated islands in the vast sea, and the creatures that once ruled those waters have adapted accordingly. <em>Shore Crabs</em> patrol these islands: armored, territorial, and considerably more irritated than the situation requires. They charge anything that walks onto their territory. Their claws are not decorative. They do not negotiate with the Sailor any more than the crocodiles did.</p>';
        html += '<p>The water is vast and patrolled by sharks — as always, but now they occupy the majority of the world rather than scattered lakes. <em>Eels</em> lurk in narrow channels. <em>Piranhas</em> school in the shallows. <em>Manta Rays</em> circle the deep. The <em>Octopus</em> is slow, territorial, and does not appreciate visitors — it will spray ink and slow anything that gets close. For the Sailor, this is home. For the Pirate, it is a place of business.</p>';
        html += '<p>At the end of every age, the <em>Megalodon</em> surfaces. It is not a shark in any sense the modern era would recognize — sixty feet of ancient predator, older than the creatures it eats, capable of a tail sweep that sends projectiles in every direction and a water rush that covers half the ocean in a second. It has always been here. It is simply more apparent now.</p>';
    }

    // Dino world lore (gated behind dinosaur or paleontologist unlock)
    if (uc.includes('dinosaur') || uc.includes('paleontologist')) {
        html += '<hr><p><strong>THE PREHISTORIC WORLD</strong></p>';
        html += '<p>The Dinosaur does not travel to this world. He is from it. The Paleontologist arrived later, by accident, and has not fully come to terms with the implications.</p>';
        html += '<p>In the Prehistoric World, the standard ecosystem has been replaced with one that predates it by approximately sixty-five million years. <em>Raptors</em> are fast and coordinated — they do not hunt alone, and they do not miss. <em>Pterodactyls</em> circle overhead and dive. <em>Triceratops</em> are armored and charge with the conviction of something that has never been stopped. <em>Ankylosauruses</em> are not fast, but they are built in a way that suggests they were designed to ignore consequences.</p>';
        html += '<p>At the end of the age, the <em>T-Rex</em> arrives. It has two attacks: a ground stomp that sends shockwaves outward, and a charge that covers more distance than the player prefers. In its second phase, it does both faster. The T-Rex is not subtle. The T-Rex has never needed to be subtle.</p>';
        html += '<p>The Paleontologist\'s fossil minions are, in this world, no longer metaphors. They are extremely motivated.</p>';
    }

    // Alien world lore (gated behind alien or astronaut unlock)
    if (uc.includes('alien') || uc.includes('astronaut')) {
        html += '<hr><p><strong>THE ALIEN WORLD</strong></p>';
        html += '<p>Not all warriors fight in the pixel forest. Some fight in a different world entirely — one of alien architecture and cold starlight, where the ecosystem has been replaced wholesale.</p>';
        html += '<p>In the Alien World, the crocodiles, salamanders, crabs, and fish do not exist. They have been replaced by two hostile factions: armed human space explorers and alien entities, engaged in a territorial war of unclear origin and no apparent end date. The knight who enters this world is unwelcome by both parties.</p>';
        html += '<p>The Alien plays as the aggressor — the human faction hunts them, and the alien faction is not on their side either. The Astronaut arrives as a recognized ally of the human marines, who fight for him; the alien faction remains hostile. The crossfire between both sides is substantial. This is, tactically, useful.</p>';
        html += '<p>Crocodiles and salamanders do not visit this world. The physics remain unchanged, because physics do not care what world you are in.</p>';
    }

    el.innerHTML = html;
}

document.getElementById('lore-btn').addEventListener('click', () => {
    buildDynamicLore();
    document.getElementById('difficulty-overlay').classList.add('hidden');
    document.getElementById('lore-overlay').classList.remove('hidden');
    document.getElementById('lore-scroll').scrollTop = 0;
});
document.getElementById('lore-close-btn').addEventListener('click', () => {
    const scroll = document.getElementById('lore-scroll');
    const didntRead = scroll.scrollTop === 0;
    document.getElementById('lore-overlay').classList.add('hidden');
    document.getElementById('difficulty-overlay').classList.remove('hidden');
    if (didntRead && !persist.achievements.tooLongDidntRead) grantAchievement('tooLongDidntRead');
    _audio.startMusic();
});
document.getElementById('lb-btn').addEventListener('click', () => {
    const div = document.getElementById('lb-content');
    const lb = persist.leaderboard || [];
    if (lb.length === 0) {
        div.innerHTML = '<p style="font-size:9px;color:#666;text-align:center;margin-top:16px;">No runs yet.<br>Complete a run to appear here!</p>';
    } else {
        const _CA = { paleontologist:'Paleo', astronaut:'Astro', fashionModel:'Model', monsterTamer:'Tamer', lumberjack:'Lumber', commander:'Cmdr', scientist:'Sci', koolKat:'KoolKat', stickman:'Stick', oldMan:'OldMan', engineer:'Eng', rubixCuber:'Rubix' };
        div.innerHTML = '<table class="lb-table"><thead><tr><th>#</th><th>CHAR</th><th>SCORE</th><th>WAVE</th><th>KILLS</th><th>DIFF</th><th>DATE</th></tr></thead><tbody>' +
            lb.map((e, i) => {
                const charDef = CHARACTERS[e.character];
                const cName = _CA[e.character] || (charDef ? charDef.name : e.character) || 'Knight';
                return '<tr class="'+(i===0?'lb-rank1':'')+'">' +
                    '<td class="lb-rank">#'+(i+1)+'</td><td class="lb-char">'+cName+'</td>' +
                    '<td class="lb-wave">'+(e.score||0).toLocaleString()+'</td>' +
                    '<td class="lb-kills">'+e.wave+'</td>' +
                    '<td class="lb-gold">'+(e.kills||0).toLocaleString()+'</td>' +
                    '<td class="lb-time">'+(e.difficulty||'normal')+'</td><td class="lb-date">'+(e.date||'')+'</td></tr>';
            }).join('') + '</tbody></table>';
    }
    document.getElementById('difficulty-overlay').classList.add('hidden');
    document.getElementById('leaderboard-overlay').classList.remove('hidden');
});
document.getElementById('lb-close-btn').addEventListener('click', () => {
    document.getElementById('leaderboard-overlay').classList.add('hidden');
    document.getElementById('difficulty-overlay').classList.remove('hidden');
});
document.getElementById('gamer-shop-skip-btn').addEventListener('click', () => skipGamerShop());
document.getElementById('upgrade-close-btn').addEventListener('click', () => {
    state.upgradeOpen = false; state.paused = false;
    document.getElementById('upgrade-overlay').classList.add('hidden');
    updateUpgradeButton();
});
document.getElementById('upgrade-reroll-btn').addEventListener('click', () => {
    if (state.player.gold < 50) { showNotif('Need 50 Gold to reroll!'); return; }
    state.player.gold -= 50;
    state.pendingUpgradeChoices = buildUpgradeChoices();
    showUpgradeUI();
});
document.getElementById('upgrade-btn').addEventListener('click', () => {
    if (state.gameOver || state.shopOpen) return;
    if (state.pendingUpgradeCount > 0) {
        state.upgradeOpen = true; state.paused = true;
        if (state.player.charBlob) {
            showGeneUI();
        } else {
            if (!state.pendingUpgradeChoices || state.pendingUpgradeChoices.length === 0)
                state.pendingUpgradeChoices = buildUpgradeChoices();
            showUpgradeUI();
        }
    } else if (state.pendingEvolveCount > 0 && state.player.upgrades.length > 0) {
        state.evolveOpen = true; state.paused = true;
        showEvolveUI();
    }
});
document.getElementById('pet-upgrade-btn').addEventListener('click', () => {
    const p = state.player;
    if (state.gameOver || !p.petUpgradeReady || p.petEvolveLevel >= 10) return;
    p.petUpgradeReady = false;
    p.petActionCount = 0;
    p.petActionThreshold = getPetActionThreshold(p.pet, p.petEvolveLevel + 1);
    updatePetUpgradeButton();
    openPetEvolveOverlay();
});
document.getElementById('skill-tree-btn').addEventListener('click', () => {
    if (state.gameOver) return;
    state.skillTreeOpen = !state.skillTreeOpen;
    const overlay = document.getElementById('skill-tree-overlay');
    if (state.skillTreeOpen) {
        state.paused = true;
        overlay.classList.remove('hidden');
        renderSkillTree();
    } else {
        state.paused = false;
        overlay.classList.add('hidden');
    }
});
document.getElementById('skill-tree-close-btn').addEventListener('click', () => {
    state.skillTreeOpen = false;
    state.paused = false;
    document.getElementById('skill-tree-overlay').classList.add('hidden');
});

function equipSlot(s) { if (s <= state.player.maxWeaponSlots && state.player.weaponSlots[s]) { state.player.weapon = state.player.weaponSlots[s]; updateWeaponHUD(); } }

function castRune(slot) {
    if (state.paused || state.gameOver) return;
    const p = state.player;
    const runeKey = p.runeSlots[slot];
    if (!runeKey) { showNotif('No rune in slot ' + slot); return; }
    if (p.mana < p.maxMana) { showNotif('No mana! (' + Math.floor(p.mana) + '/' + p.maxMana + ')'); return; }
    const charges = p.runeDurability[runeKey] || 0;
    if (charges <= 0) { showNotif(RUNES[runeKey].name + ' is out of charges! Repair it.'); return; }
    // Consume mana and charge
    p.mana -= p.maxMana;
    p.runeDurability[runeKey]--;
    // Execute the spell
    const mx = state.mouse.x + state.camera.x, my = state.mouse.y + state.camera.y;
    switch (runeKey) {
        case 'fireball':
            hitEnemies(p.x, p.y, 100, 60, false, true);
            createExplosion(p.x, p.y, '#ff5722'); createExplosion(p.x, p.y, '#ff9800');
            addScreenShake(8, 8);
            showNotif('Fireball!');
            break;
        case 'frostbolt':
            state.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) < 200) { e.frozen = 240; } });
            createExplosion(p.x, p.y, '#80deea');
            showNotif('Frostbolt!');
            break;
        case 'lightning':
            { let targets = state.enemies.filter(e => Math.hypot(e.x-p.x,e.y-p.y)<300).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,4);
              targets.forEach(e => { e.hp -= 45; e.hurtTimer = 10; state.lightningEffects.push({x1:p.x,y1:p.y,x2:e.x,y2:e.y,life:8}); });
              showNotif('Chain Bolt!'); }
            break;
        case 'shadowstep':
            p.x = mx; p.y = my;
            createExplosion(p.x, p.y, '#7e57c2');
            showNotif('Shadow Step!');
            break;
        case 'healrune':
            p.hp = Math.min(p.maxHp, p.hp + 30);
            createExplosion(p.x, p.y, '#69f0ae');
            showNotif('+30 HP!');
            break;
        case 'arcaneorb':
            state.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(Math.atan2(my-p.y,mx-p.x))*3, vy: Math.sin(Math.atan2(my-p.y,mx-p.x))*3, damage: 40, range: 600, life: 200, type: 'arcane', size: 10 });
            showNotif('Arcane Orb!');
            break;
        case 'blizzard':
            state.enemies.forEach(e => { if (Math.hypot(e.x-p.x,e.y-p.y)<250) { e.frozen=360; e.hp -= 15; e.hurtTimer=10; } });
            createExplosion(p.x, p.y, '#b3e5fc'); createExplosion(p.x, p.y, '#81d4fa');
            showNotif('Blizzard!');
            break;
        case 'voidburst':
            { let pulled = state.enemies.filter(e=>Math.hypot(e.x-p.x,e.y-p.y)<240);
              pulled.forEach(e=>{ const d=Math.hypot(e.x-p.x,e.y-p.y)||1; e.x+=(p.x-e.x)/d*60; e.y+=(p.y-e.y)/d*60; });
              setTimeout(()=>{ hitEnemies(p.x,p.y,120,50,false,true); createExplosion(p.x,p.y,'#7e57c2'); }, 300);
              showNotif('Void Burst!'); }
            break;
    }
    updateWeaponHUD();
}

function lightTorch() {
    if (state.paused || state.gameOver) return;
    const p = state.player;
    if (p.redWood > 0) {
        p.redWood--; p.torchTimer = (p.torchTimer || 0) + 3600;
        showNotif('Redwood torch lit! (60s)');
    } else if (p.pineWood > 0) {
        p.pineWood--; p.torchTimer = (p.torchTimer || 0) + 900;
        showNotif('Pine torch lit! (15s)');
    } else {
        showNotif('No wood! Chop a pine or redwood tree.');
    }
}
function deployBarricade() {
    if (state.paused || state.gameOver) return;
    const p = state.player;
    if (p.pineWood >= 5) { p.pineWood -= 5; }
    else if (p.redWood >= 2) { p.redWood -= 2; }
    else { showNotif('Need 5 Pine Wood or 2 Redwood!'); return; }
    state.barricades.push({ x: p.x, y: p.y, hp: 5, maxHp: 5 });
    showNotif('Barricade deployed!');
}
function craftSkeletonWarrior() {
    if (state.paused || state.gameOver) return;
    const p = state.player;
    if ((p.bones || 0) < 5) { showNotif('Need 5 Bones to craft a Skeleton Warrior!'); return; }
    if (state.skeletonWarriors.length >= 3) { showNotif('Max 3 Skeleton Warriors!'); return; }
    p.bones -= 5;
    const angle = Math.random() * Math.PI * 2;
    state.skeletonWarriors.push({
        x: p.x + Math.cos(angle) * 30,
        y: p.y + Math.sin(angle) * 30,
        hp: 60, maxHp: 60,
        attackCooldown: 0, hurtTimer: 0, animTimer: 0,
        facingX: 1, target: null
    });
    showNotif('Skeleton Warrior rises!');
}
function useWitchPotion() {
    if (state.paused || state.gameOver) return;
    const p = state.player;
    if (!p.charWitch) return;
    if (!p.witchPotionReady) { showNotif('No potion brewed yet! Survive to the next wave.'); return; }
    p.witchPotionReady = false;
    const potionScale = 1 + p.wave * 0.05;
    switch (p.witchPotionType) {
        case 'heal':
            p.hp = Math.min(p.maxHp, p.hp + Math.round(20 * potionScale));
            createExplosion(p.x, p.y, '#69f0ae');
            showNotif('Healing Potion! +' + Math.round(20 * potionScale) + ' HP');
            break;
        case 'freeze':
            state.enemies.forEach(e => { if (Math.hypot(e.x-p.x,e.y-p.y) < 200) e.frozen = 300; });
            createExplosion(p.x, p.y, '#80deea'); createExplosion(p.x, p.y, '#4dd0e1');
            showNotif('Freeze Bomb! Enemies frozen!');
            break;
        case 'poison':
            state.enemies.forEach(e => { if (Math.hypot(e.x-p.x,e.y-p.y) < 160) { e.poisoned = 180; e.poisonDmg = Math.round(3 * potionScale); } });
            createExplosion(p.x, p.y, '#a5d6a7'); createExplosion(p.x, p.y, '#66bb6a');
            showNotif('Poison Cloud! Enemies infected!');
            break;
        case 'chaos':
            hitEnemies(p.x, p.y, 220, Math.round(40 * potionScale), true, true);
            createExplosion(p.x, p.y, '#ce93d8'); createExplosion(p.x, p.y, '#f48fb1');
            addScreenShake(10, 10);
            showNotif('Chaos Potion! KABOOM!');
            break;
    }
}

function openHowToPlay() {
    const el = document.getElementById('htp-overlay');
    el.classList.remove('hidden');
    el.style.display = 'flex';
}
function closeHowToPlay(e) {
    if (e) e.stopPropagation();
    const el = document.getElementById('htp-overlay');
    el.classList.add('hidden');
    el.style.display = 'none';
    // Mark dismissed so it won't auto-show again
    persist.htpDismissed = true;
    savePersist(persist);
}
document.getElementById('htp-close-btn').addEventListener('click', closeHowToPlay);
document.getElementById('pause-htp-btn').addEventListener('click', openHowToPlay);
// Auto-show for new players / after reset progress
if (!persist.htpDismissed) {
    openHowToPlay();
}

// ─── DIVE TOGGLE ───
function toggleDive() {
    if (state.paused || state.gameOver) return;
    const p = state.player;
    if (!p.charDiver) { showNotif('Only the Diver can dive!'); return; }
    if (!isOnWater(p.x, p.y)) { showNotif('Must be standing on water to dive! [C]'); return; }
    state.underwater = !state.underwater;
    if (state.underwater) {
        p.oxygenTimer = 1800; // 30 seconds of air
        showNotif('Diving! [C] to surface. Watch your oxygen!');
    } else {
        showNotif('Surfaced.');
    }
}

// ─── FULLSCREEN MODE ───
let _fullscreenMode = false;
function applyFullscreenScale() {
    const container = document.getElementById('game-container');
    const scaleX = (window.innerWidth - 8) / (canvas.width + 8);
    const scaleY = (window.innerHeight - 8) / (canvas.height + 8);
    const scale = Math.min(scaleX, scaleY);
    container.style.transform = `scale(${scale})`;
}
function toggleFullscreen() {
    _fullscreenMode = !_fullscreenMode;
    const container = document.getElementById('game-container');
    const btn = document.getElementById('fs-btn');
    if (_fullscreenMode) {
        applyFullscreenScale();
        if (btn) { btn.textContent = '[X]'; btn.classList.add('active'); btn.title = 'Exit Fullscreen (Tab)'; }
    } else {
        container.style.transform = '';
        if (btn) { btn.textContent = '[ ]'; btn.classList.remove('active'); btn.title = 'Fullscreen (Tab)'; }
    }
}
window.addEventListener('resize', () => { if (_fullscreenMode) applyFullscreenScale(); });
document.getElementById('fs-btn').addEventListener('click', toggleFullscreen);


