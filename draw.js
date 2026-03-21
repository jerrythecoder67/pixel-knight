// ─── NIGHT OVERLAY OFFSCREEN CANVAS ───
let _nightCanvas = null, _nightCtx = null;
function _getNightLayer(w, h) {
    if (!_nightCanvas || _nightCanvas.width !== w || _nightCanvas.height !== h) {
        _nightCanvas = document.createElement('canvas');
        _nightCanvas.width = w; _nightCanvas.height = h;
        _nightCtx = _nightCanvas.getContext('2d');
    }
    return { nc: _nightCanvas, nctx: _nightCtx };
}

// ─── MENU CHARACTER KEYS ───
const _MENU_CHAR_KEYS = [
    'knight','villager','archer','reaper','monsterChar','dinosaur','dragon','ninja','rogue',
    'vampire','sailor','pirate','wizard','witch','angel','fashionModel','gamer','shopper',
    'rich','fat','scientist','robot','engineer','alien','astronaut','caveman','stickman',
    'clown','monsterTamer','oldMan','diver','blob','hoarder','collector','gambler','steve',
    'lumberjack','librarian','demon','commander','bob','youtuber','koolKat','cowboy',
    'janitor','baby','rubixCuber','paleontologist',
];
const _MENU_ENEMY_KEYS = ['slime','skeleton','wraith','troll','imp','vampire','spider','wizard','demon','necromancer'];

function drawMenuChar(ctx, charKey, t) {
    const leg = Math.floor(t / 6) % 2;
    const bobY = Math.round(Math.sin(t * 0.08) * 1.5);
    ctx.save();
    ctx.translate(0, bobY);
    if (charKey === 'knight') {
        // Exact default knight appearance (no armor items)
        const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
        if (leg === 0) { R(-4, 8, 3, 6, '#555'); R(1, 10, 3, 4, '#555'); }
        else           { R(-4, 10, 3, 4, '#555'); R(1, 8, 3, 6, '#555'); }
        R(-5, 12, 4, 3, '#3e2723'); R(1, 12, 4, 3, '#3e2723');
        R(-6, -8, 12, 16, '#8b0000');
        R(-5, 6, 10, 6, '#6a0000');
        R(-6, -6, 12, 14, '#78909c');
        R(-4, -4, 8, 8, '#90a4ae');
        R(-1, -3, 2, 6, '#607d8b');
        R(-9, -4, 3, 10, '#78909c'); R(6, -4, 3, 10, '#78909c');
        R(-5, -14, 10, 10, '#546e7a');
        R(-3, -10, 6, 2, '#1de9b6');
        R(-1, -16, 2, 4, '#8b0000');
    } else {
        // Delegate to the exact in-game character drawing function
        const mockP = {
            character: charKey, animFrame: leg,
            monsterForm: 'default', robotLaserActive: false,
            isShutdown: false, armor: {},
        };
        const savedFrame = state.frame;
        state.frame = t;
        drawCharacterBodyNonKnight(mockP);
        state.frame = savedFrame;
    }
    ctx.restore();
}

function _menuLerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function _menuLerpColor(c1, c2, t) {
    // Expects '#rrggbb'
    const r1 = parseInt(c1.slice(1,3),16), g1 = parseInt(c1.slice(3,5),16), b1 = parseInt(c1.slice(5,7),16);
    const r2 = parseInt(c2.slice(1,3),16), g2 = parseInt(c2.slice(3,5),16), b2 = parseInt(c2.slice(5,7),16);
    return 'rgb(' + Math.round(_menuLerp(r1,r2,t)) + ',' + Math.round(_menuLerp(g1,g2,t)) + ',' + Math.round(_menuLerp(b1,b2,t)) + ')';
}

// ─── DRAW ───
function draw() {
    // StickWorld: intercept every fillRect — pure #000/#fff draw as-is, all other colours → white fill + black outline
    canvas.style.filter = '';
    const _ispaleo = state.dinoWorld;
    ctx.fillStyle = state.alienWorld ? '#06001a' : _ispaleo ? '#1e0c04' : (state.stickWorld ? '#ffffff' : '#1a1a2e'); ctx.fillRect(0, 0, canvas.width, canvas.height);
    let _swFR = null;
    if (state.stickWorld) {
        _swFR = CanvasRenderingContext2D.prototype.fillRect;
        CanvasRenderingContext2D.prototype.fillRect = function(x, y, w, h) {
            const c = this.fillStyle;
            if (c === '#000' || c === '#000000' || c === '#fff' || c === '#ffffff' || c === 'black' || c === 'white') {
                _swFR.call(this, x, y, w, h); return;
            }
            const pFS = this.fillStyle, pSS = this.strokeStyle, pLW = this.lineWidth;
            this.fillStyle = '#ffffff'; _swFR.call(this, x, y, w, h);
            this.strokeStyle = '#000000'; this.lineWidth = 0.5; this.strokeRect(x, y, w, h);
            this.fillStyle = pFS; this.strokeStyle = pSS; this.lineWidth = pLW;
        };
    }
    // Alien world: draw distant stars in background
    if (state.alienWorld) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let si = 0; si < 60; si++) {
            const sx2 = (si * 137 + 23) % canvas.width, sy2 = (si * 251 + 47) % canvas.height;
            const ss = (si % 3 === 0) ? 2 : 1;
            // Slowly drift with camera (parallax)
            const px2 = (sx2 - (state.camera.x * 0.02) % canvas.width + canvas.width) % canvas.width;
            const py2 = (sy2 - (state.camera.y * 0.02) % canvas.height + canvas.height) % canvas.height;
            ctx.fillRect(px2, py2, ss, ss);
        }
    }
    // ─── ANIMATED MAIN MENU BACKGROUND ───
    if (!state.difficulty) {
        if (!state.menuBg) {
            state.menuBg = {
                t: 0,
                dayT: Math.random() * 3600,
                stars: Array.from({ length: 90 }, (_, i) => ({
                    x: (i * 137.3 + 23) % 800,
                    y: (i * 251.7 + 47) % 420,
                    size: i % 5 === 0 ? 2 : 1,
                    phase: (i * 1.7) % (Math.PI * 2),
                    speed: 0.02 + (i % 7) * 0.01
                })),
                entities: [],
                spawnTimer: 90,
                sparks: [],
            };
        }
        const mb = state.menuBg;
        mb.t++;
        mb.dayT = (mb.dayT + 0.4) % 3600;

        // ── Day/night cycle sky ──
        const dp = mb.dayT / 3600; // 0-1 normalized
        // phases: 0-0.08 dawn, 0.08-0.5 day, 0.5-0.58 dusk, 0.58-1.0 night
        let isNight = false;
        let skyTop, skyBot, ambientBright;
        if (dp < 0.08) { // dawn
            const t2 = dp / 0.08;
            skyTop = _menuLerpColor('#030310', '#e64a19', t2);
            skyBot = _menuLerpColor('#12050a', '#ff8f00', t2);
            ambientBright = t2 * 0.5;
        } else if (dp < 0.5) { // day
            const t2 = (dp - 0.08) / 0.42;
            skyTop = _menuLerpColor('#e64a19', '#1565c0', t2);
            skyBot = _menuLerpColor('#ff8f00', '#42a5f5', t2);
            ambientBright = 0.5 + t2 * 0.5;
        } else if (dp < 0.58) { // dusk
            const t2 = (dp - 0.5) / 0.08;
            skyTop = _menuLerpColor('#1565c0', '#b71c1c', t2);
            skyBot = _menuLerpColor('#42a5f5', '#ff6f00', t2);
            ambientBright = 1 - t2 * 0.7;
            isNight = t2 > 0.6;
        } else { // night
            skyTop = '#030310'; skyBot = '#12050a';
            ambientBright = 0; isNight = true;
        }
        const skyG = ctx.createLinearGradient(0, 0, 0, 600);
        skyG.addColorStop(0, skyTop); skyG.addColorStop(1, skyBot);
        ctx.fillStyle = skyG; ctx.fillRect(0, 0, 800, 600);

        // ── Sun or Moon ──
        const sunAngle = dp * Math.PI * 2 - Math.PI / 2;
        const sunX = 400 + Math.cos(sunAngle) * 340;
        const sunY = 300 + Math.sin(sunAngle) * 280;
        if (sunY < 490) {
            if (isNight) {
                // Pixel-art moon: layered gray squares with craters
                const mx = Math.round(sunX), my = Math.round(sunY);
                ctx.fillStyle = '#c8cfd4'; ctx.fillRect(mx-7, my-7, 14, 14);
                ctx.fillStyle = '#dce5ea'; ctx.fillRect(mx-5, my-5, 10, 10);
                ctx.fillStyle = '#b0bec5'; ctx.fillRect(mx-3, my-3, 4, 4);   // crater 1
                ctx.fillStyle = '#b0bec5'; ctx.fillRect(mx+1, my+2, 3, 3);   // crater 2
                ctx.fillStyle = '#b0bec5'; ctx.fillRect(mx-4, my+3, 3, 3);   // crater 3
                ctx.fillStyle = '#eceff1'; ctx.fillRect(mx-5, my-5, 3, 3);   // highlight
            } else {
                // Pixel-art sun: yellow center + 8 directional rays
                const sx = Math.round(sunX), sy = Math.round(sunY);
                // Glow halo (very faint)
                ctx.globalAlpha = 0.12 * ambientBright;
                ctx.fillStyle = '#fffde7'; ctx.fillRect(sx-20, sy-20, 40, 40);
                ctx.globalAlpha = 1;
                // Cardinal rays
                ctx.fillStyle = '#fff176';
                ctx.fillRect(sx-3, sy-15, 6, 6);  // top
                ctx.fillRect(sx-3, sy+9,  6, 6);  // bottom
                ctx.fillRect(sx-15, sy-3, 6, 6);  // left
                ctx.fillRect(sx+9,  sy-3, 6, 6);  // right
                // Diagonal rays
                ctx.fillRect(sx-12, sy-12, 4, 4);
                ctx.fillRect(sx+8,  sy-12, 4, 4);
                ctx.fillRect(sx-12, sy+8,  4, 4);
                ctx.fillRect(sx+8,  sy+8,  4, 4);
                // Core
                ctx.fillStyle = '#ffee58'; ctx.fillRect(sx-7, sy-7, 14, 14);
                ctx.fillStyle = '#fff9c4'; ctx.fillRect(sx-5, sy-5, 10, 10);
                ctx.fillStyle = '#ffffff'; ctx.fillRect(sx-2, sy-2, 4, 4);
            }
        }

        // ── Stars (night/dawn only) ──
        if (isNight || dp < 0.08 || dp > 0.55) {
            const starAlpha = isNight ? 1 : (dp < 0.08 ? 1 - dp / 0.08 : (dp - 0.55) / 0.05);
            mb.stars.forEach(s => {
                s.phase += s.speed;
                ctx.globalAlpha = Math.max(0, starAlpha) * (0.45 + Math.sin(s.phase) * 0.45);
                ctx.fillStyle = s.size > 1 ? '#ffe8a0' : '#ffffff';
                ctx.fillRect(s.x, s.y, s.size, s.size);
            });
            ctx.globalAlpha = 1;
        }

        // ── Mountains ──
        const mtDark = ambientBright < 0.3 ? '#0c0c20' : _menuLerpColor('#0c0c20', '#1a2a14', ambientBright);
        ctx.fillStyle = mtDark;
        ctx.beginPath(); ctx.moveTo(0, 600);
        const mtPts = [0,320, 80,250, 160,310, 240,240, 320,290, 400,220, 480,280, 560,230, 640,270, 720,245, 800,300];
        for (let mi = 0; mi < mtPts.length; mi += 2) ctx.lineTo(mtPts[mi], mtPts[mi+1]);
        ctx.lineTo(800, 600); ctx.fill();

        // ── Hills ──
        const hillDark = ambientBright < 0.3 ? '#0f0f18' : _menuLerpColor('#0f0f18', '#1e3a18', ambientBright);
        ctx.fillStyle = hillDark;
        ctx.beginPath(); ctx.moveTo(0, 600);
        const hillPts = [0,380, 100,350, 200,365, 300,340, 400,360, 500,345, 600,355, 700,342, 800,358];
        for (let hi = 0; hi < hillPts.length; hi += 2) ctx.lineTo(hillPts[hi], hillPts[hi+1]);
        ctx.lineTo(800, 600); ctx.fill();

        // ── Ground ──
        const groundCol = ambientBright < 0.3 ? '#0a110a' : _menuLerpColor('#0a110a', '#1a3a0a', ambientBright);
        ctx.fillStyle = groundCol; ctx.fillRect(0, 490, 800, 110);
        const grassCol = ambientBright < 0.3 ? '#152015' : _menuLerpColor('#152015', '#2e5c14', ambientBright);
        ctx.fillStyle = grassCol; ctx.fillRect(0, 488, 800, 4);

        // ── Build available entity pools (locked chars/enemies don't appear) ──
        const _ALWAYS_CHARS = ['knight', 'villager', 'archer'];
        const _availChars = _MENU_CHAR_KEYS.filter(k =>
            _ALWAYS_CHARS.includes(k) || (persist.unlockedCharacters || []).includes(k)
        );
        const _ALWAYS_ENEMIES = ['slime', 'skeleton'];
        const _availEnemies = _MENU_ENEMY_KEYS.filter(k =>
            _ALWAYS_ENEMIES.includes(k) || !!(persist.seenEnemies || {})[k]
        );
        const groundY = 490;

        // ── Spawn entities ──
        mb.spawnTimer--;
        if (mb.spawnTimer <= 0 && _availChars.length > 0) {
            const roll = Math.random();
            const fromLeft = Math.random() < 0.5;
            const sX = fromLeft ? -50 : 850;
            const sd = fromLeft ? 1 : -1;
            const _usedChars = new Set(mb.entities.filter(e => e.type === 'char').map(e => e.key));
            const _freeChars = _availChars.filter(k => !_usedChars.has(k));
            const _charPool = _freeChars.length > 0 ? _freeChars : _availChars;
            const rC = () => _charPool[Math.floor(Math.random() * _charPool.length)];
            const rE = () => _availEnemies[Math.floor(Math.random() * _availEnemies.length)];
            if (roll < 0.25) {
                // Single char walking
                mb.entities.push({ type:'char', key:rC(), x:sX, dir:sd, speed:2.5+Math.random()*2, animT:0, state:'walking' });
            } else if (roll < 0.40) {
                // Two chars side by side
                const spd = 2.5 + Math.random() * 1.5;
                mb.entities.push(
                    { type:'char', key:rC(), x:sX,        dir:sd, speed:spd, animT:0, state:'walking' },
                    { type:'char', key:rC(), x:sX+sd*-35, dir:sd, speed:spd, animT:3, state:'walking' }
                );
            } else if (roll < 0.55) {
                // Char pre-chased by 1 enemy
                const cSpd = 3.2 + Math.random() * 1.5;
                const _ce = { type:'char',  key:rC(), x:sX,       dir:sd, speed:cSpd,      animT:0, state:'fleeing', hadEncounter:true, origDir:sd };
                const _ee = { type:'enemy', key:rE(), x:sX+sd*-70, dir:sd, speed:cSpd-0.8, animT:0, state:'chasing', hadEncounter:true };
                _ee.target = _ce;
                if (Math.random() < 0.10) _ce.counterTimer = 80 + Math.floor(Math.random() * 80);
                mb.entities.push(_ce, _ee);
            } else if (roll < 0.65) {
                // Lone enemy walking
                mb.entities.push({ type:'enemy', key:rE(), x:sX, dir:sd, speed:1.5+Math.random()*1.2, animT:0, state:'walking' });
            } else if (roll < 0.80) {
                // Gang-up: char chased by 2 enemies
                const cSpd = 3.2 + Math.random() * 1.2;
                const _ce = { type:'char',  key:rC(), x:sX,         dir:sd, speed:cSpd,      animT:0, state:'fleeing', hadEncounter:true, origDir:sd };
                const _e1 = { type:'enemy', key:rE(), x:sX+sd*-60,  dir:sd, speed:cSpd-0.7,  animT:0, state:'chasing', hadEncounter:true };
                const _e2 = { type:'enemy', key:rE(), x:sX+sd*-120, dir:sd, speed:cSpd-1.1,  animT:0, state:'chasing', hadEncounter:true };
                _e1.target = _ce; _e2.target = _ce;
                _ce.gangChasers = [_e1, _e2];
                _ce.gangVariant = Math.random() < 0.5 ? 'A' : 'B';
                mb.entities.push(_ce, _e1, _e2);
            } else {
                // Ambush flip: char sneaks up behind walking enemy
                const eSpd = 1.5 + Math.random();
                const _ee = { type:'enemy', key:rE(), x:sX,       dir:sd, speed:eSpd,      animT:0, state:'walking',      hadEncounter:true };
                const _ce = { type:'char',  key:rC(), x:sX+sd*-80, dir:sd, speed:eSpd+1.6, animT:0, state:'ambush_chase', hadEncounter:true };
                _ce.target = _ee;
                mb.entities.push(_ee, _ce);
            }
            mb.spawnTimer = 180 + Math.random() * 240;
        }

        // ── Encounter detection ──

        // Block A: Walking char meets walking enemy
        {
            const wC = mb.entities.filter(e => e.type==='char'  && !e.hadEncounter && e.state==='walking');
            const wE = mb.entities.filter(e => e.type==='enemy' && !e.hadEncounter && e.state==='walking');
            for (const ce of wC) {
                for (const ee of wE) {
                    if (Math.abs(ce.x - ee.x) < 55) {
                        ce.hadEncounter = ee.hadEncounter = true;
                        const fd = ce.x < ee.x ? -1 : 1;
                        const r = Math.random();
                        if (r < 0.25) {
                            // Enemy walks past then turns and chases
                            ee.state = 'post_pass'; ee.passTimer = 55; ee.target = ce;
                        } else if (r < 0.50) {
                            // Char flees, enemy chases (10% counter chance)
                            ce.origDir = ce.dir; ce.state = 'fleeing'; ce.dir = fd; ce.speed += 0.8;
                            ee.state = 'chasing'; ee.target = ce; ee.speed += 0.5;
                            if (Math.random() < 0.10) ce.counterTimer = 80 + Math.floor(Math.random() * 80);
                        } else if (r < 0.75) {
                            // Char one-shots enemy → hero pose
                            ce.state = 'hero'; ce.heroTimer = 45; ce.speed = 0;
                            ee.state = 'dying'; ee.dieTimer = 30;
                            for (let s = 0; s < 8; s++) mb.sparks.push({ x:(ce.x+ee.x)/2, y:groundY-18, vx:(Math.random()-0.5)*4, vy:-(Math.random()*3+1), life:35, maxLife:50 });
                            if (Math.random() < 0.10) ce.victoryStrut = true;
                        } else {
                            // Timid enemy: panics and flees from char
                            ee.state = 'timid_flee'; ee.dir = ee.x < ce.x ? -1 : 1; ee.speed += 1.5;
                        }
                    }
                }
            }
        }

        // Block B: Fleeing char meets walking enemy head-on → double hero or scatter
        {
            const fC = mb.entities.filter(e => e.type==='char'  && e.state==='fleeing' && !e.frontKilled);
            const wE = mb.entities.filter(e => e.type==='enemy' && e.state==='walking' && !e.hadEncounter);
            for (const ce of fC) {
                for (const ee of wE) {
                    const toward = (ce.dir > 0 && ee.x > ce.x && ee.dir < 0) ||
                                   (ce.dir < 0 && ee.x < ce.x && ee.dir > 0);
                    if (toward && Math.abs(ce.x - ee.x) < 55) {
                        ee.hadEncounter = true;
                        if (Math.random() < 0.50) {
                            // Double hero: kill front, mark to kill chaser next
                            ee.state = 'dying'; ee.dieTimer = 30;
                            ce.frontKilled = true; ce.state = 'hero'; ce.heroTimer = 40; ce.speed = 0;
                            ce.postHeroState = 'double_hero';
                            for (let s = 0; s < 8; s++) mb.sparks.push({ x:(ce.x+ee.x)/2, y:groundY-18, vx:(Math.random()-0.5)*4, vy:-(Math.random()*3+1), life:30, maxLife:30 });
                        } else {
                            // Three-way scatter
                            const sd = () => (Math.random() < 0.5 ? -1 : 1);
                            ee.state = 'scatter'; ee.dir = sd(); ee.speed = 3 + Math.random();
                            ce.state = 'scatter'; ce.dir = sd(); ce.speed = 3 + Math.random();
                            const ch = mb.entities.find(e => e.type==='enemy' && e.target===ce && e.state==='chasing');
                            if (ch) { ch.state = 'scatter'; ch.dir = sd(); ch.speed = 3 + Math.random(); ch.target = null; }
                        }
                    }
                }
            }
        }

        // Block C: Chaser catches fleeing char
        {
            for (const ee of mb.entities.filter(e => e.type==='enemy' && e.state==='chasing' && e.target)) {
                const ce = ee.target;
                if (!ce || !mb.entities.includes(ce) || ce.state==='dying' || ce.state==='caught' || ce.state==='hero') continue;
                if (Math.abs(ee.x - ce.x) < 22) {
                    if (ce.gangChasers && ce.gangChasers[0] === ee && !ce.gangFrontCaught) {
                        // Front gang-chaser catches char
                        if (ce.gangVariant === 'A') {
                            // Char kills front, flees rear
                            ee.state = 'dying'; ee.dieTimer = 30; ce.gangFrontCaught = true;
                            ce.state = 'hero'; ce.heroTimer = 35; ce.speed = 0; ce.postHeroState = 'gang_flee';
                            for (let s = 0; s < 6; s++) mb.sparks.push({ x:(ce.x+ee.x)/2, y:groundY-18, vx:(Math.random()-0.5)*3, vy:-(Math.random()*3+1), life:25, maxLife:25 });
                        } else {
                            // Variant B: front enemy catches char, rear wanders off
                            ce.state = 'caught'; ce.caughtTimer = 40; ce.catchProcessed = true;
                            ee.state = 'walking'; ee.target = null;
                            if (ce.gangChasers[1]) { ce.gangChasers[1].target = null; ce.gangChasers[1].state = 'walking'; }
                        }
                    } else if (!ce.catchProcessed) {
                        // Normal catch (single chaser or rear gang enemy)
                        ce.catchProcessed = true; ce.state = 'caught'; ce.caughtTimer = 40;
                        ee.state = 'walking'; ee.target = null; ee.speed = Math.max(ee.speed - 0.5, 1.5);
                    }
                }
            }
        }

        // Block D: Walking char near active chase → hero save or flee-too
        {
            const wC = mb.entities.filter(e => e.type==='char' && !e.hadEncounter && e.state==='walking');
            const actC = mb.entities.filter(e => e.type==='enemy' && e.state==='chasing' && e.target && mb.entities.includes(e.target));
            for (const hero of wC) {
                for (const chaser of actC) {
                    if (chaser.target === hero) continue;
                    if (Math.abs(hero.x - chaser.x) < 60) {
                        hero.hadEncounter = true;
                        if (Math.random() < 0.5) {
                            // Hero save: kill chaser, rescued char walks with hero
                            const fl = chaser.target;
                            chaser.state = 'dying'; chaser.dieTimer = 30;
                            hero.state = 'hero'; hero.heroTimer = 40; hero.speed = 0;
                            hero.rescuedChar = fl;
                            for (let s = 0; s < 8; s++) mb.sparks.push({ x:(hero.x+chaser.x)/2, y:groundY-18, vx:(Math.random()-0.5)*4, vy:-(Math.random()*3+1), life:30, maxLife:30 });
                        } else {
                            // Flee-too: hero also runs
                            hero.origDir = hero.dir;
                            hero.state = 'fleeing'; hero.dir = hero.x < chaser.x ? -1 : 1; hero.speed += 1.0;
                        }
                        break;
                    }
                }
            }
        }

        // Block E: Counter-attack timer for fleeing chars
        {
            for (const ce of mb.entities.filter(e => e.type==='char' && e.state==='fleeing' && e.counterTimer !== undefined)) {
                if (--ce.counterTimer <= 0) {
                    delete ce.counterTimer;
                    const ch = mb.entities.find(e => e.type==='enemy' && e.target===ce && (e.state==='chasing' || e.state==='post_pass'));
                    if (ch) {
                        ce.dir = ch.x < ce.x ? -1 : 1;
                        ce.state = 'counter_hero'; ce.counterHeroTimer = 40; ce.speed = 0;
                        ch.state = 'dying'; ch.dieTimer = 30;
                        for (let s = 0; s < 8; s++) mb.sparks.push({ x:(ce.x+ch.x)/2, y:groundY-18, vx:(Math.random()-0.5)*4, vy:-(Math.random()*3+1), life:30, maxLife:30 });
                    }
                }
            }
        }

        // Block F: Ambush char catches walking enemy
        {
            for (const ce of mb.entities.filter(e => e.type==='char' && e.state==='ambush_chase' && e.target)) {
                const ee = ce.target;
                if (!ee || !mb.entities.includes(ee) || ee.state !== 'walking') continue;
                if (Math.abs(ce.x - ee.x) < 30) {
                    ee.state = 'dying'; ee.dieTimer = 30; ce.target = null;
                    for (let s = 0; s < 8; s++) mb.sparks.push({ x:(ce.x+ee.x)/2, y:groundY-18, vx:(Math.random()-0.5)*4, vy:-(Math.random()*3+1), life:30, maxLife:30 });
                    if (Math.random() < 0.10) { ce.state = 'victory'; ce.victoryTimer = 60; ce.speed = 0; }
                    else { ce.state = 'walking'; ce.speed = 2 + Math.random() * 1.5; }
                }
            }
        }

        // ── Update & draw entities ──
        for (let ei = mb.entities.length - 1; ei >= 0; ei--) {
            const en = mb.entities[ei];
            en.animT++;

            // ── Movement & state transitions ──
            if (en.state === 'dying') {
                if (--en.dieTimer <= 0) { mb.entities.splice(ei, 1); continue; }
            } else if (en.state === 'caught') {
                if (--en.caughtTimer <= 0) { mb.entities.splice(ei, 1); continue; }
            } else if (en.state === 'hero' || en.state === 'counter_hero') {
                const tk = en.state === 'hero' ? 'heroTimer' : 'counterHeroTimer';
                if (--en[tk] <= 0) {
                    if (en.postHeroState === 'double_hero') {
                        delete en.postHeroState;
                        const ch = mb.entities.find(e => e.type==='enemy' && e.target===en && (e.state==='chasing' || e.state==='post_pass'));
                        if (ch) {
                            // Second slash: turn and kill chaser
                            en.dir = ch.x < en.x ? -1 : 1;
                            ch.state = 'dying'; ch.dieTimer = 30;
                            for (let s = 0; s < 8; s++) mb.sparks.push({ x:(en.x+ch.x)/2, y:groundY-18, vx:(Math.random()-0.5)*4, vy:-(Math.random()*3+1), life:30, maxLife:30 });
                            en.state = 'hero'; en.heroTimer = 35;
                        } else {
                            if (en.victoryStrut) { en.victoryStrut=false; en.state='victory'; en.victoryTimer=60; en.speed=0; }
                            else { en.state='walking'; en.speed=2+Math.random()*1.5; en.dir=en.origDir||en.dir; }
                        }
                    } else if (en.postHeroState === 'gang_flee') {
                        delete en.postHeroState;
                        const rear = en.gangChasers && mb.entities.includes(en.gangChasers[1]) ? en.gangChasers[1] : null;
                        if (rear && rear.state === 'chasing') {
                            en.state = 'fleeing'; en.dir = rear.x < en.x ? 1 : -1; en.speed = rear.speed + 0.8;
                        } else {
                            en.state = 'walking'; en.speed = 2 + Math.random() * 1.5;
                        }
                    } else {
                        if (en.victoryStrut) {
                            en.victoryStrut = false; en.state = 'victory'; en.victoryTimer = 60; en.speed = 0;
                        } else {
                            en.state = 'walking'; en.speed = 2 + Math.random() * 1.5;
                            if (en.rescuedChar && mb.entities.includes(en.rescuedChar)) {
                                const rc = en.rescuedChar; rc.state = 'walking'; rc.dir = en.dir; rc.speed = en.speed;
                            }
                            delete en.rescuedChar;
                        }
                    }
                }
                // hero/counter_hero: stand still (no x movement)
            } else if (en.state === 'victory') {
                if (--en.victoryTimer <= 0) { en.state = 'walking'; en.speed = 2 + Math.random() * 1.5; }
                // victory: no x movement (bounce is visual only)
            } else if (en.state === 'post_pass') {
                en.x += en.dir * en.speed;
                if (--en.passTimer <= 0) {
                    en.state = 'chasing';
                    if (en.target) en.dir = en.target.x < en.x ? -1 : 1;
                    en.speed += 0.8;
                }
            } else if ((en.state === 'chasing' || en.state === 'ambush_chase') && en.target) {
                en.dir = en.target.x < en.x ? -1 : 1;
                en.x += en.dir * en.speed;
            } else {
                // walking, fleeing, timid_flee, scatter, ambush_chase (no target)
                en.x += en.dir * en.speed;
            }

            if (en.x > 950 || en.x < -150) { mb.entities.splice(ei, 1); continue; }

            // ── Draw ──
            ctx.save();
            ctx.translate(Math.round(en.x), groundY);
            if (en.dir < 0) ctx.scale(-1, 1);

            if (en.state === 'dying') {
                ctx.globalAlpha = (en.dieTimer / 30) * (en.animT % 3 < 2 ? 1 : 0.2);
            } else if (en.state === 'caught') {
                ctx.globalAlpha = en.animT % 4 < 2 ? 1 : 0.15;
            }
            if (en.state === 'victory') {
                ctx.translate(0, -Math.abs(Math.sin(en.animT * 0.3)) * 6);
            }

            if (en.type === 'char') {
                const isIdle = en.state==='hero' || en.state==='counter_hero' || en.state==='victory' || en.state==='caught';
                drawMenuChar(ctx, en.key, isIdle ? 0 : en.animT);
                if (en.state === 'hero' || en.state === 'counter_hero') {
                    const tk = en.state === 'hero' ? 'heroTimer' : 'counterHeroTimer';
                    const base = en.state === 'hero' ? 45 : 40;
                    ctx.globalAlpha = Math.min((en[tk] / base) * 2, 1);
                    ctx.fillStyle = '#ffffff'; ctx.fillRect(6, -18, 16, 2); ctx.fillRect(12, -24, 2, 12);
                    ctx.fillStyle = '#ffd700'; ctx.fillRect(8, -20, 12, 2); ctx.fillRect(13, -26, 2, 10);
                    ctx.globalAlpha = 1;
                }
            } else {
                const mock = {
                    type: en.key, animTimer: en.animT, hp: 50, maxHp: 50,
                    hurtTimer: en.state === 'dying' ? 10 : 0,
                    color: (BESTIARY_INFO[en.key] || {}).color || '#888',
                    facingX: 1, facingY: 0, dir: 1, isBoss: false, isMini: false, animFrame: 0, x: 0, y: 0,
                };
                try { drawEnemySprite(ctx, mock, 0, 0); } catch(e2) {}
            }
            ctx.restore();
        }

        // ── Sparks from character clashes (random) ──
        if (mb.t % 50 === 0 && mb.entities.length >= 2) {
            const sx = 200 + Math.random() * 400, sy = groundY - 20;
            for (let sp = 0; sp < 5; sp++) {
                mb.sparks.push({ x: sx, y: sy, vx: (Math.random()-0.5)*3, vy: -(Math.random()*2+0.5), life: 25+Math.random()*20, maxLife:45 });
            }
        }
        for (let sp = mb.sparks.length - 1; sp >= 0; sp--) {
            const spark = mb.sparks[sp];
            spark.x += spark.vx; spark.y += spark.vy; spark.vy += 0.07; spark.life--;
            if (spark.life <= 0) { mb.sparks.splice(sp, 1); continue; }
            ctx.globalAlpha = spark.life / spark.maxLife;
            ctx.fillStyle = isNight ? '#ffd700' : '#ffffff';
            ctx.fillRect(Math.round(spark.x), Math.round(spark.y), 2, 2);
        }
        ctx.globalAlpha = 1;

        // ── Ambient glow halo ──
        const haloColor = isNight ? 'rgba(100,50,200,0.08)' : 'rgba(255,200,50,0.09)';
        const haloG = ctx.createRadialGradient(400, 220, 10, 400, 220, 220);
        haloG.addColorStop(0, haloColor); haloG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haloG; ctx.fillRect(0, 0, 800, 600);

        return; // skip game drawing while on menu
    }

    const shakeX = state.screenShakeDur > 0 ? (Math.random() - 0.5) * state.screenShakeMag * 2 : 0;
    const shakeY = state.screenShakeDur > 0 ? (Math.random() - 0.5) * state.screenShakeMag * 2 : 0;
    const cx = state.camera.x + shakeX, cy = state.camera.y + shakeY;

    // Telescope zoom (sailor right-click) — scale world 0.35× centered on canvas, showing ~2.9× more
    const TELE_S = 0.35;
    if (state.telescopeActive) {
        ctx.save();
        ctx.translate(canvas.width / 2 * (1 - TELE_S), canvas.height / 2 * (1 - TELE_S));
        ctx.scale(TELE_S, TELE_S);
    }

    // Terrain — extend loop bounds when telescope active so all visible tiles are drawn
    const _teleW = state.telescopeActive ? canvas.width / TELE_S : canvas.width;
    const _teleH = state.telescopeActive ? canvas.height / TELE_S : canvas.height;
    const _teleCxOff = state.telescopeActive ? (_teleW - canvas.width) / 2 : 0;
    const _teleCyOff = state.telescopeActive ? (_teleH - canvas.height) / 2 : 0;
    const sc = Math.floor((cx - _teleCxOff) / TILE), sr = Math.floor((cy - _teleCyOff) / TILE);
    const ec = sc + Math.ceil(_teleW / TILE) + 1, er = sr + Math.ceil(_teleH / TILE) + 1;
    const tf = state.frame; // shorthand for animation
    for (let r = sr; r <= er; r++) for (let c = sc; c <= ec; c++) {
        if (r < 0 || c < 0 || r >= terrainMap.length || c >= (terrainMap[0] || []).length) continue;
        const t = terrainMap[r][c], sx = c * TILE - cx, sy = r * TILE - cy;

        // StickWorld: all tiles are white with a thin black border (notebook paper look)
        if (state.stickWorld) {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, TILE, TILE);
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 0.5;
            ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
            // Mark special tiles with tiny black symbols (lava = hash pattern, water = dots)
            if (t === 'water') { ctx.fillStyle = '#000000'; ctx.fillRect(sx+6,sy+6,3,3); ctx.fillRect(sx+16,sy+16,3,3); ctx.fillRect(sx+22,sy+10,3,3); }
            if (t === 'lava')  { ctx.fillStyle = '#000000'; ctx.fillRect(sx+4,sy+4,TILE-8,2); ctx.fillRect(sx+4,sy+14,TILE-8,2); ctx.fillRect(sx+4,sy+24,TILE-8,2); }
            continue;
        }

        // Underwater: sandy seafloor + translucent water for actual water tiles and passage tiles
        if (state.underwater) {
            const isPassage = underwaterPassages.has(r * 10000 + c);
            if (t === 'water' || isPassage) {
                ctx.fillStyle = '#8a7060';
                ctx.fillRect(sx, sy, TILE, TILE);
                const wPhase = (tf * 0.04 + r * 0.7 + c * 0.5) % (Math.PI * 2);
                // Both water and passage tiles use the same translucency — no visible seam
                const alpha = 0.52 + Math.sin(wPhase) * 0.06;
                ctx.fillStyle = `rgba(10,55,140,${alpha})`;
                ctx.fillRect(sx, sy, TILE, TILE);
                continue;
            }
        }

        if (t === 'water') {
            if (state.alienWorld) {
                // Cyan coolant pool
                const wPhase = (tf * 0.04 + r * 0.7 + c * 0.5) % (Math.PI * 2);
                ctx.fillStyle = `rgba(0,${Math.floor(160 + Math.sin(wPhase)*20)},${Math.floor(200 + Math.sin(wPhase+1)*30)},1)`;
                ctx.fillRect(sx, sy, TILE, TILE);
                ctx.fillStyle = `rgba(100,255,255,${0.18 + Math.sin(wPhase)*0.1})`;
                ctx.fillRect(sx + ((tf * 2 + c * 13 + r * 7) % TILE), sy + 4, 4, TILE - 8);
            } else if (_ispaleo) {
                // Tar pit: thick black-brown, slow oily bubbles
                const tPhase = (tf * 0.015 + r * 0.4 + c * 0.3) % (Math.PI * 2);
                const tBright = Math.floor(4 + Math.sin(tPhase) * 3);
                ctx.fillStyle = `rgb(${tBright + 18},${tBright + 8},${tBright})`;
                ctx.fillRect(sx, sy, TILE, TILE);
                // Oily sheen
                if ((r * 7 + c * 11 + Math.floor(tf / 60)) % 7 === 0) {
                    ctx.fillStyle = `rgba(60,30,5,${0.4 + Math.sin(tPhase) * 0.2})`;
                    ctx.fillRect(sx + 6, sy + 8, 8, 4);
                }
                // Slow bubble
                if ((r * 5 + c * 9 + Math.floor(tf / 80)) % 11 === 0) {
                    ctx.fillStyle = 'rgba(40,20,5,0.7)';
                    ctx.fillRect(sx + (c * 5 + r * 3) % 20 + 4, sy + (r * 3 + c * 7) % 18 + 4, 3, 3);
                }
            } else if (state.sailorWorld) {
                // Deep ocean: darker navy blue with white foam streaks
                const wPhase = (tf * 0.03 + r * 0.6 + c * 0.4) % (Math.PI * 2);
                const wBright = Math.floor(8 + Math.sin(wPhase) * 6);
                ctx.fillStyle = `rgb(${wBright + 8},${wBright + 28},${wBright + 100})`;
                ctx.fillRect(sx, sy, TILE, TILE);
                // White foam streaks
                if ((r + c + Math.floor(tf / 30)) % 5 === 0) {
                    ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.sin(wPhase) * 0.08})`;
                    ctx.fillRect(sx + 2, sy + 14, 12, 2);
                }
            } else {
                // Animated water: rippling brightness and small shimmer waves
                const wPhase = (tf * 0.04 + r * 0.7 + c * 0.5) % (Math.PI * 2);
                const wBright = Math.floor(20 + Math.sin(wPhase) * 8);
                ctx.fillStyle = `rgb(${wBright + 6},${wBright + 38},${wBright + 90})`;
                ctx.fillRect(sx, sy, TILE, TILE);
                // Shimmer highlight — moves across tile
                const shimX = ((tf * 2 + c * 13 + r * 7) % TILE);
                ctx.fillStyle = `rgba(100,180,255,${0.12 + Math.sin(wPhase + 1) * 0.08})`;
                ctx.fillRect(sx + shimX, sy + 4, 4, TILE - 8);
            }
            continue;
        }

        if (t === 'lava') {
            if (_ispaleo) {
                // Black tar: asphalt-dark, nearly opaque, slow oily gleam
                const tP = (tf * 0.02 + r * 0.5 + c * 0.4) % (Math.PI * 2);
                const tB = Math.floor(6 + Math.sin(tP) * 4);
                ctx.fillStyle = `rgb(${tB + 5},${tB + 2},${tB})`;
                ctx.fillRect(sx, sy, TILE, TILE);
                ctx.fillStyle = `rgba(40,20,5,${0.18 + Math.sin(tP + 1) * 0.08})`;
                ctx.fillRect(sx + ((tf + c * 9 + r * 7) % TILE), sy + 8, 3, TILE - 16);
                if ((r * 5 + c * 7 + Math.floor(tf / 40)) % 7 === 0) {
                    ctx.fillStyle = 'rgba(30,15,3,0.8)';
                    ctx.fillRect(sx + 8 + (c % 5) * 4, sy + 8, 2, 2);
                }
            } else if (state.alienWorld) {
                // Green plasma pool
                const lPhase = (tf * 0.06 + r * 0.8 + c * 0.6) % (Math.PI * 2);
                const lBright = Math.floor(30 + Math.sin(lPhase) * 15);
                ctx.fillStyle = `rgb(0,${Math.min(255, lBright + 160)},${Math.max(0, lBright + 20)})`;
                ctx.fillRect(sx, sy, TILE, TILE);
                ctx.fillStyle = `rgba(100,255,120,${0.2 + Math.sin(lPhase + 1) * 0.1})`;
                ctx.fillRect(sx + ((tf * 1.5 + c * 11 + r * 9) % TILE), sy + 4, 4, TILE - 8);
                if ((r * 5 + c * 7 + Math.floor(tf / 20)) % 5 === 0) {
                    ctx.fillStyle = 'rgba(180,255,100,0.6)';
                    ctx.fillRect(sx + 10 + (c % 6) * 3, sy + 10, 3, 3);
                }
            } else {
                // Animated lava: pulsing orange-red
                const lPhase = (tf * 0.06 + r * 0.8 + c * 0.6) % (Math.PI * 2);
                const lBright = Math.floor(30 + Math.sin(lPhase) * 15);
                ctx.fillStyle = `rgb(${Math.min(255, lBright + 180)},${Math.max(0, lBright + 30)},0)`;
                ctx.fillRect(sx, sy, TILE, TILE);
                // Glow shimmer
                ctx.fillStyle = `rgba(255,160,0,${0.22 + Math.sin(lPhase + 1) * 0.12})`;
                const shimX2 = ((tf * 1.5 + c * 11 + r * 9) % TILE);
                ctx.fillRect(sx + shimX2, sy + 4, 4, TILE - 8);
                // Bubble dot
                if ((r * 5 + c * 7 + Math.floor(tf / 20)) % 5 === 0) {
                    ctx.fillStyle = 'rgba(255,220,60,0.6)';
                    ctx.fillRect(sx + 10 + (c % 6) * 3, sy + 10, 3, 3);
                }
            }
            continue;
        }

        if (t === 'flower') {
            ctx.fillStyle = '#3a6b2b'; ctx.fillRect(sx, sy, TILE, TILE);
            // Animated petal color: slight hue shift
            const colors = ['#ff6b6b', '#ffeb3b', '#e040fb', '#40c4ff'];
            const ci = (r * 7 + c * 13) % 4;
            ctx.fillStyle = colors[ci];
            // Sway: flower center shifts slightly left/right
            const sway = Math.sin(tf * 0.05 + r * 1.3 + c * 0.9) * 2;
            ctx.fillRect(sx + 12 + sway, sy + 12, 6, 6);
            // Stem flicker
            ctx.fillStyle = '#2a5a1e';
            ctx.fillRect(sx + 14 + sway * 0.5, sy + 18, 2, 6);
            continue;
        }

        if (t === 'grass1' || t === 'grass2') {
            if (_ispaleo) {
                // Reddish badlands clay — dry, cracked earth
                ctx.fillStyle = t === 'grass1' ? '#8b4513' : '#7a3b10';
                ctx.fillRect(sx, sy, TILE, TILE);
                // Crack lines
                if ((r * 5 + c * 7) % 6 === 0) {
                    ctx.fillStyle = 'rgba(50,20,5,0.45)';
                    ctx.fillRect(sx + 5, sy + 14, 14, 1); ctx.fillRect(sx + 12, sy + 8, 1, 10);
                }
            } else if (state.sailorWorld) {
                // Sandy island: warm sand color
                ctx.fillStyle = t === 'grass1' ? '#c2a24a' : '#b8953e';
                ctx.fillRect(sx, sy, TILE, TILE);
                // Small sand texture dots
                if ((r * 3 + c * 7) % 5 === 0) {
                    ctx.fillStyle = 'rgba(180,140,50,0.5)';
                    ctx.fillRect(sx + (c * 7) % 20, sy + (r * 5) % 20, 3, 3);
                }
            } else if (state.alienWorld) {
                // Purple alien ground
                ctx.fillStyle = t === 'grass1' ? '#2a1845' : '#341e58';
                ctx.fillRect(sx, sy, TILE, TILE);
                if ((r + c) % 3 === 0) {
                    const swayG = Math.sin(tf * 0.06 + r * 1.1 + c * 0.8) * 2;
                    ctx.fillStyle = t === 'grass1' ? '#4a2875' : '#5a3090';
                    ctx.fillRect(sx + 6 + swayG, sy + 4, 2, 10);
                    ctx.fillRect(sx + 20 - swayG, sy + 8, 2, 8);
                    ctx.fillRect(sx + 14 + swayG * 0.5, sy + 2, 2, 12);
                }
            } else {
                ctx.fillStyle = t === 'grass1' ? '#2d5a1e' : '#3a6b2b';
                ctx.fillRect(sx, sy, TILE, TILE);
                // Grass blades: animated sway on a subset of tiles
                if ((r + c) % 3 === 0) {
                    const swayG = Math.sin(tf * 0.06 + r * 1.1 + c * 0.8) * 2;
                    ctx.fillStyle = t === 'grass1' ? '#3a7028' : '#4a8035';
                    // Blade 1
                    ctx.fillRect(sx + 6 + swayG, sy + 4, 2, 10);
                    // Blade 2
                    ctx.fillRect(sx + 20 - swayG, sy + 8, 2, 8);
                    ctx.fillRect(sx + 14 + swayG * 0.5, sy + 2, 2, 12);
                }
            }
            continue;
        }

        if (t === 'dirt') {
            ctx.fillStyle = state.alienWorld ? '#1e0e30' : _ispaleo ? '#7a3c18' : '#6b5230'; ctx.fillRect(sx, sy, TILE, TILE);
            if ((r * 3 + c * 5) % 4 === 0) {
                ctx.fillStyle = state.alienWorld ? 'rgba(80,40,120,0.4)' : _ispaleo ? 'rgba(100,40,10,0.4)' : 'rgba(80,55,25,0.4)';
                ctx.fillRect(sx + 6, sy + 8, 8, 3); ctx.fillRect(sx + 18, sy + 20, 5, 3);
            }
            // Paleo world: scattered bone fragments on dirt
            if (state.dinoWorld && (r * 7 + c * 11) % 9 === 0) {
                ctx.fillStyle = 'rgba(220,200,170,0.55)';
                const bx2 = sx + (r * 5 + c * 3) % 18 + 2, by2 = sy + (r * 3 + c * 7) % 18 + 2;
                ctx.fillRect(bx2, by2, 7, 2); ctx.fillRect(bx2 + 2, by2 - 2, 2, 6); // cross bone
            }
            continue;
        }

        if (t === 'stone') {
            ctx.fillStyle = state.alienWorld ? '#3a3a50' : _ispaleo ? '#6b4a30' : '#5a5a5a'; ctx.fillRect(sx, sy, TILE, TILE);
            ctx.fillStyle = state.alienWorld ? 'rgba(30,30,60,0.5)' : _ispaleo ? 'rgba(60,30,10,0.4)' : 'rgba(40,40,40,0.5)';
            if ((r + c) % 2 === 0) { ctx.fillRect(sx + 4, sy + 12, 14, 2); }
            else { ctx.fillRect(sx + 10, sy + 4, 2, 18); }
            // Paleo world: bone fragments on stone too
            if (state.dinoWorld && (r * 13 + c * 7) % 11 === 0) {
                ctx.fillStyle = 'rgba(210,190,155,0.45)';
                const bx3 = sx + (r * 7 + c * 5) % 16 + 2, by3 = sy + (r * 5 + c * 9) % 16 + 2;
                ctx.fillRect(bx3, by3, 6, 2); ctx.fillRect(bx3 + 2, by3 - 1, 2, 5);
            }
            ctx.fillStyle = state.alienWorld ? 'rgba(120,120,200,0.25)' : 'rgba(120,120,120,0.3)';
            ctx.fillRect(sx + 2, sy + 2, 6, 4);
            continue;
        }

        ctx.fillStyle = state.alienWorld ? '#2a1845' : '#2d5a1e'; ctx.fillRect(sx, sy, TILE, TILE);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
    for (let x = -(cx % TILE); x < canvas.width; x += TILE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = -(cy % TILE); y < canvas.height; y += TILE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    // StickWorld: notebook paper horizontal blue lines
    if (state.stickWorld) {
        ctx.save();
        ctx.globalAlpha = 0.18; ctx.strokeStyle = '#4a90d9'; ctx.lineWidth = 1;
        for (let y2 = 8; y2 < canvas.height; y2 += 16) {
            ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(canvas.width, y2); ctx.stroke();
        }
        ctx.restore();
    }

    // Trees — pass 1: trunks only (below player)
    state.trees.forEach(tr => {
        const tx = tr.x - cx, ty = tr.y - cy;
        if (tx < -60 || tx > canvas.width + 60 || ty < -80 || ty > canvas.height + 60) return;
        const flash = tr.hurtTimer > 0;
        const type = tr.treeType || 'oak';
        if (type === 'dead') {
            // Bare grey trunk
            ctx.fillStyle = flash ? '#cccccc' : '#757575';
            ctx.fillRect(tx - 4, ty - 2, 8, 22);
            ctx.fillStyle = flash ? '#eeeeee' : '#9e9e9e';
            ctx.fillRect(tx - 2, ty - 2, 2, 22);
        } else if (type === 'redwood') {
            // Wide reddish-brown trunk
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.fillRect(tx - 14, ty + 12, 28, 8);
            ctx.fillStyle = flash ? '#ff8888' : '#4e1a0a';
            ctx.fillRect(tx - 9, ty - 2, 18, 30);
            ctx.fillStyle = flash ? '#ffbbbb' : '#7b2e12';
            ctx.fillRect(tx - 7, ty - 2, 5, 30);
            // Bark detail
            ctx.fillStyle = flash ? '#ff9999' : '#5d2211';
            ctx.fillRect(tx + 1, ty + 4, 3, 20);
        } else {
            // oak / pine / fruit — shared trunk style
            const trunkW = type === 'oak' ? 4 : 12;  // oak=skinny, pine=normal
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(tx - trunkW/2 - 2, ty + 10, trunkW + 4, 6);
            ctx.fillStyle = flash ? '#ff8888' : (type === 'oak' ? '#4e342e' : '#5d4037');
            ctx.fillRect(tx - trunkW/2, ty - 2, trunkW, 24);
            ctx.fillStyle = flash ? '#ffbbbb' : (type === 'oak' ? '#6d4c41' : '#795548');
            ctx.fillRect(tx - trunkW/2 + 2, ty - 2, Math.max(2, trunkW/3), 24);
        }
    });

    // Barricades (below player)
    state.barricades.forEach(b => {
        const bx = b.x - cx, by = b.y - cy;
        if (bx < -60 || bx > canvas.width + 60 || by < -60 || by > canvas.height + 60) return;
        ctx.fillStyle = '#5d4037'; ctx.fillRect(bx - 14, by - 16, 28, 32);
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(bx - 12, by - 14, 4, 28);
        ctx.fillStyle = '#4e342e'; ctx.fillRect(bx - 14, by + 4, 28, 3);
        ctx.fillStyle = '#795548'; ctx.fillRect(bx - 2, by - 16, 4, 32);
        if (b.hp < b.maxHp) {
            ctx.fillStyle = '#222'; ctx.fillRect(bx - 14, by - 22, 28, 4);
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(bx - 14, by - 22, Math.round(28 * b.hp / b.maxHp), 4);
        }
    });

    // Skeleton Warriors (player-crafted allies)
    state.skeletonWarriors.forEach(sw => {
        const swx = sw.x - cx, swy = sw.y - cy;
        if (swx < -40 || swx > canvas.width + 40 || swy < -40 || swy > canvas.height + 40) return;
        const flash = sw.hurtTimer > 0;
        ctx.save();
        ctx.translate(swx, swy);
        if (sw.facingX < 0) ctx.scale(-1, 1);
        // Body (ribcage)
        ctx.fillStyle = flash ? '#ffffff' : '#e0e0e0';
        ctx.fillRect(-5, -14, 10, 10);
        // Ribs
        ctx.fillStyle = flash ? '#ffffff' : '#bdbdbd';
        ctx.fillRect(-4, -12, 2, 6); ctx.fillRect(-1, -12, 2, 6); ctx.fillRect(2, -12, 2, 6);
        // Head
        ctx.fillStyle = flash ? '#ffffff' : '#f5f5f5';
        ctx.fillRect(-4, -24, 8, 8);
        // Eyes (green — friendly)
        ctx.fillStyle = '#69f0ae';
        ctx.fillRect(-3, -22, 2, 2); ctx.fillRect(1, -22, 2, 2);
        // Legs
        ctx.fillStyle = flash ? '#ffffff' : '#bdbdbd';
        ctx.fillRect(-4, -4, 3, 10); ctx.fillRect(1, -4, 3, 10);
        // Sword arm
        ctx.fillStyle = flash ? '#ffffff' : '#e0e0e0';
        ctx.fillRect(5, -14, 3, 8);
        ctx.fillStyle = '#90caf9';
        ctx.fillRect(6, -20, 2, 8);
        ctx.restore();
        // HP bar
        if (sw.hp < sw.maxHp) {
            ctx.fillStyle = '#222'; ctx.fillRect(swx - 12, swy - 30, 24, 3);
            ctx.fillStyle = '#69f0ae'; ctx.fillRect(swx - 12, swy - 30, Math.round(24 * sw.hp / sw.maxHp), 3);
        }
    });

    // Spider webs
    state.spiderWebs.forEach(w => {
        const wx = w.x - cx, wy = w.y - cy;
        const alpha = (w.life / 600) * 0.7;
        ctx.strokeStyle = `rgba(160,160,160,${alpha})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 20, wy + Math.sin(a) * 20); ctx.stroke();
        }
        ctx.strokeStyle = `rgba(180,180,180,${alpha * 0.5})`;
        for (let r = 7; r <= 20; r += 6) {
            ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
        }
    });

    // Fire trails
    state.fireTrails.forEach(f => {
        const a = f.life / 50;
        ctx.fillStyle = `rgba(255,${80 + f.life * 3},0,${a})`; ctx.fillRect(f.x - cx - 6, f.y - cy - 6, 12, 12);
        ctx.fillStyle = `rgba(255,255,50,${a * 0.5})`; ctx.fillRect(f.x - cx - 3, f.y - cy - 3, 6, 6);
    });

    // Shockwaves
    state.shockwaves.forEach(sw => {
        ctx.strokeStyle = `rgba(100,200,255,${1 - sw.radius / sw.maxRadius})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sw.x - cx, sw.y - cy, sw.radius, 0, Math.PI * 2); ctx.stroke();
    });

    // Lightning
    state.lightningEffects.forEach(l => {
        ctx.fillStyle = `rgba(150,180,255,${l.life / 15})`;
        for (let i = 0; i < 3; i++) { ctx.fillRect(l.x - cx + (Math.random() - 0.5) * 30, l.y - cy - Math.random() * 40, 3, 12 + Math.random() * 20); }
    });

    // Particles
    state.particles.forEach(pt => { ctx.fillStyle = pt.color; ctx.fillRect(pt.x - cx, pt.y - cy, 4, 4); });

    // Gold
    state.goldPickups.forEach(g => {
        const bob = Math.sin(g.life * 0.15) * 2;
        ctx.fillStyle = '#ffd700'; ctx.fillRect(g.x - cx - 3, g.y - cy - 3 + bob, 6, 6);
        ctx.fillStyle = '#fff8a0'; ctx.fillRect(g.x - cx - 1, g.y - cy - 1 + bob, 2, 2);
    });

    // Treasure chests
    state.treasureChests.forEach(ch => {
        const chx = ch.x - cx, chy = ch.y - cy;
        if (chx < -60 || chx > canvas.width + 60 || chy < -60 || chy > canvas.height + 60) return;
        ctx.save();
        if (ch.opened) {
            ctx.globalAlpha = 0.3;
        } else {
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6 + Math.sin(state.frame * 0.08) * 4;
        }
        // Body
        ctx.fillStyle = '#5c3317'; ctx.fillRect(chx - 13, chy + 1, 26, 13);
        // Lid
        ctx.fillStyle = '#7a4520'; ctx.fillRect(chx - 13, chy - 8, 26, 11);
        // Gold trim
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(chx - 13, chy - 8, 26, 22);
        // Latch
        ctx.fillStyle = '#ffd700'; ctx.fillRect(chx - 4, chy - 2, 8, 7);
        ctx.fillStyle = '#aa8800'; ctx.fillRect(chx - 2, chy, 4, 4);
        // Mimic tell: faint red eyes flicker in the latch
        if (ch.isMimic && !ch.opened && state.frame % 90 < 4) {
            ctx.fillStyle = 'rgba(200,0,0,0.7)';
            ctx.fillRect(chx - 2, chy + 1, 1, 1); ctx.fillRect(chx + 1, chy + 1, 1, 1);
        }
        ctx.restore();
        // Arrow indicator when close
        const chd = Math.hypot(ch.x - state.player.x, ch.y - state.player.y);
        if (chd < 120 && !ch.opened) {
            ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#ffd700'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            ctx.strokeText('CHEST', chx, chy - 16); ctx.fillText('CHEST', chx, chy - 16);
            ctx.restore();
        }
    });

    // Hearts
    state.heartPickups.forEach(h => {
        const bob = Math.sin(state.frame * 0.1) * 3;
        const x = h.x - cx, y = h.y - cy + bob;
        ctx.save(); ctx.shadowColor = '#ff6666'; ctx.shadowBlur = 10 + Math.sin(state.frame * 0.1) * 5;
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(x - 4, y - 4, 3, 3); ctx.fillRect(x + 1, y - 4, 3, 3);
        ctx.fillRect(x - 5, y - 1, 10, 4); ctx.fillRect(x - 3, y + 3, 6, 2); ctx.fillRect(x - 1, y + 5, 2, 2);
        ctx.restore();
    });

    // Enemies
    state.enemies.forEach(e => {
        const ex = e.x - cx, ey = e.y - cy;
        const _eCull = state.telescopeActive ? canvas.width * 2 : 50;
        if (ex < -_eCull || ex > canvas.width + _eCull || ey < -_eCull || ey > canvas.height + _eCull) return;
        ctx.save();
        if (e.isTamed) { ctx.shadowColor = '#00e676'; ctx.shadowBlur = 10 + Math.sin(state.frame * 0.15) * 5; }
        if (e.charmed) { ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 10; }
        if (state.player.charReaper && e.type === 'skeleton') { ctx.shadowColor = '#8844ff'; ctx.shadowBlur = 9; }
        if (e.poisoned) { ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 6; }
        if (e.hardened) { ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 14 + Math.sin(state.frame * 0.2) * 6; }
        if (e.golemPowered) { ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 16; }
        if (e.groundPoundWindup) { ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 10 + Math.sin(state.frame * 0.5) * 5; }
        // StickWorld: draw enemy as white shape + black outline, skip colored sprite
        if (state.stickWorld) {
            const eScale = (e.elite ? 1.25 : 1) * (e.sizeScale || 1);
            const ew = Math.round(12 * eScale), eh = Math.round(16 * eScale);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff'; ctx.fillRect(ex - ew/2, ey - eh, ew, eh);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
            ctx.strokeRect(ex - ew/2 + 0.5, ey - eh + 0.5, ew - 1, eh - 1);
            ctx.fillStyle = '#000';
            ctx.fillRect(ex - 3, ey - eh + 4, 2, 2); ctx.fillRect(ex + 1, ey - eh + 4, 2, 2); // eyes
            if (e.isBoss) { // big X for bosses
                ctx.lineWidth = 2; ctx.beginPath();
                ctx.moveTo(ex - ew/2 + 2, ey - eh + 2); ctx.lineTo(ex + ew/2 - 2, ey - 2);
                ctx.moveTo(ex + ew/2 - 2, ey - eh + 2); ctx.lineTo(ex - ew/2 + 2, ey - 2);
                ctx.stroke();
            }
            ctx.restore(); return;
        }
        drawEnemySprite(ctx, e, ex, ey);
        // Tamed: draw timer bar above enemy
        if (e.isTamed) {
            const bw = 22, bh = 3;
            const bx = ex - bw / 2, by2 = ey - 22;
            ctx.fillStyle = '#1b5e20'; ctx.fillRect(bx, by2, bw, bh);
            ctx.fillStyle = '#00e676'; ctx.fillRect(bx, by2, Math.round(bw * e.tamedTimer / 600), bh);
        }
        if (e.hitFlash > 0) {
            ctx.globalAlpha = (e.hitFlash / 6) * 0.55;
            ctx.fillStyle = '#ff2020';
            const sz = 14 * (e.sizeScale || 1);
            ctx.fillRect(ex - sz, ey - sz * 1.2, sz * 2, sz * 2.4);
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    });

    // Crocodiles
    state.crocodiles.forEach(c => {
        const ex = c.x - cx, ey = c.y - cy;
        if (ex < -60 || ex > canvas.width + 60 || ey < -60 || ey > canvas.height + 60) return;
        drawCrocodile(ctx, c, ex, ey);
    });

    // Crabs (sailor world land predators)
    if (state.sailorWorld && state.crabs) state.crabs.forEach(cr => {
        const ex = cr.x - cx, ey = cr.y - cy;
        if (ex < -40 || ex > canvas.width + 40 || ey < -40 || ey > canvas.height + 40) return;
        const flash = cr.hurtTimer > 0;
        const t = cr.animTimer;
        ctx.save(); ctx.translate(ex, ey); ctx.scale(cr.facingX, 1);
        // Legs (animated — alternate pairs)
        const legCol = flash ? '#fff' : '#bf360c';
        ctx.fillStyle = legCol;
        const legWiggle = Math.sin(t * 0.2) * 2;
        // Left side legs (negative x in local space, flip via facingX)
        ctx.fillRect(-18, -4 + legWiggle, 6, 3);    // front left
        ctx.fillRect(-18, 4 - legWiggle, 6, 3);     // back left
        ctx.fillRect(-14, -8 + legWiggle, 4, 4);    // mid-upper left
        // Right side legs
        ctx.fillRect(12, -4 - legWiggle, 6, 3);     // front right
        ctx.fillRect(12, 4 + legWiggle, 6, 3);      // back right
        ctx.fillRect(10, -8 - legWiggle, 4, 4);     // mid-upper right
        // Body (rounded carapace)
        const bodyCol = flash ? '#fff' : '#d84315';
        ctx.fillStyle = bodyCol;
        ctx.fillRect(-11, -9, 22, 18);   // main body
        ctx.fillRect(-13, -6, 26, 12);   // wider middle
        // Shell highlight
        ctx.fillStyle = flash ? '#fff' : '#e64a19';
        ctx.fillRect(-8, -7, 16, 5);
        // Claws (large)
        ctx.fillStyle = legCol;
        ctx.fillRect(-20, -12, 10, 8);   // left claw base
        ctx.fillRect(-26, -16, 8, 7);    // left claw top pincer
        ctx.fillRect(-26, -8, 8, 5);     // left claw bot pincer
        ctx.fillRect(10, -12, 10, 8);    // right claw base
        ctx.fillRect(18, -16, 8, 7);     // right claw top pincer
        ctx.fillRect(18, -8, 8, 5);      // right claw bot pincer
        // Eyes (stalks)
        ctx.fillStyle = '#000';
        ctx.fillRect(-7, -13, 4, 5); ctx.fillRect(3, -13, 4, 5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-6, -12, 2, 2); ctx.fillRect(4, -12, 2, 2);
        // HP bar
        const hf = cr.hp / cr.maxHp;
        ctx.fillStyle = '#1a0000'; ctx.fillRect(-14, 12, 28, 3);
        ctx.fillStyle = '#e53935'; ctx.fillRect(-14, 12, Math.round(28 * hf), 3);
        ctx.restore();
    });

    // Salamanders (orange-red croc variant)
    state.salamanders.forEach(s => {
        const ex = s.x - cx, ey = s.y - cy;
        if (ex < -60 || ex > canvas.width + 60 || ey < -60 || ey > canvas.height + 60) return;
        ctx.save();
        if (s.hurtTimer > 0) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 6; }
        const flip = s.facingX < 0 ? -1 : 1;
        ctx.scale(flip, 1);
        const sx = ex * flip, sy = ey;
        // Body
        ctx.fillStyle = s.hurtTimer > 0 ? '#ffccaa' : '#e64a19';
        ctx.fillRect(sx - 10, sy - 4, 20, 9);
        // Head
        ctx.fillStyle = s.hurtTimer > 0 ? '#ffd0b0' : '#bf360c';
        ctx.fillRect(sx + 7, sy - 3, 8, 7);
        // Snout
        ctx.fillStyle = s.hurtTimer > 0 ? '#ffccaa' : '#d84315';
        ctx.fillRect(sx + 13, sy - 1, 5, 4);
        // Highlight
        ctx.fillStyle = s.hurtTimer > 0 ? '#ffe0cc' : '#ff7043';
        ctx.fillRect(sx - 8, sy - 3, 12, 3);
        // Eye
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(sx + 9, sy - 2, 2, 2);
        // Tail
        ctx.fillStyle = s.hurtTimer > 0 ? '#ffccaa' : '#bf360c';
        ctx.fillRect(sx - 18, sy - 1, 10, 5);
        ctx.fillRect(sx - 24, sy, 8, 3);
        // Legs
        const legOff = Math.floor(s.animTimer / 12) % 2 === 0 ? 2 : -1;
        ctx.fillStyle = '#bf360c';
        ctx.fillRect(sx - 5, sy + 4, 4, 4 + legOff);
        ctx.fillRect(sx + 1, sy + 4, 4, 4 - legOff);
        // Fire glow (flicker on lava)
        if (isOnLava(s.x, s.y) && state.frame % 6 < 3) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ff6d00';
            ctx.fillRect(sx - 12, sy - 6, 24, 14);
            ctx.globalAlpha = 1;
        }
        // HP bar
        if (s.hp < s.maxHp) {
            ctx.fillStyle = '#222'; ctx.fillRect(sx - 12, sy - 10, 24, 3);
            ctx.fillStyle = '#e64a19'; ctx.fillRect(sx - 12, sy - 10, Math.round(24 * s.hp / s.maxHp), 3);
        }
        ctx.restore();
    });

    // Space explorers (alien world only)
    if (state.alienWorld) {
        // Human explorers (space marines)
        state.humanExplorers.forEach(h => {
            const ex = h.x - cx, ey = h.y - cy;
            if (ex < -60 || ex > canvas.width + 60 || ey < -60 || ey > canvas.height + 60) return;
            ctx.save();
            if (h.hurtTimer > 0) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; }
            const flip = h.facingX < 0 ? -1 : 1;
            ctx.scale(flip, 1);
            const hx = ex * flip, hy = ey;
            // Legs
            const legAnim = Math.floor(h.animTimer / 10) % 2;
            ctx.fillStyle = '#37474f';
            ctx.fillRect(hx - 5, hy + 8, 5, 7 + (legAnim ? 2 : 0));
            ctx.fillRect(hx + 1, hy + 8, 5, 7 + (legAnim ? 0 : 2));
            // Boots
            ctx.fillStyle = '#263238';
            ctx.fillRect(hx - 6, hy + 14 + (legAnim ? 2 : 0), 6, 3);
            ctx.fillRect(hx + 1, hy + 14 + (legAnim ? 0 : 2), 6, 3);
            // Body (space suit)
            ctx.fillStyle = h.hurtTimer > 0 ? '#b0bec5' : '#607d8b';
            ctx.fillRect(hx - 7, hy - 4, 14, 13);
            // Chest armor plate
            ctx.fillStyle = '#455a64';
            ctx.fillRect(hx - 5, hy - 2, 10, 7);
            // Visor highlight
            ctx.fillStyle = '#00acc1';
            ctx.fillRect(hx - 1, hy - 1, 8, 3);
            // Helmet
            ctx.fillStyle = h.hurtTimer > 0 ? '#cfd8dc' : '#78909c';
            ctx.fillRect(hx - 6, hy - 14, 12, 11);
            // Visor
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(hx - 4, hy - 12, 8, 5);
            if (state.frame % 40 < 3) { // visor flicker
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#fff';
                ctx.fillRect(hx - 4, hy - 12, 8, 5);
                ctx.globalAlpha = 1;
            }
            // Arms
            ctx.fillStyle = '#546e7a';
            ctx.fillRect(hx - 11, hy - 3, 5, 9);
            ctx.fillRect(hx + 7, hy - 3, 5, 9);
            // Laser rifle (right arm)
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(hx + 11, hy - 1, 10, 4);
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(hx + 20, hy, 3, 2);
            // HP bar
            if (h.hp < h.maxHp) {
                ctx.fillStyle = '#222'; ctx.fillRect(hx - 10, hy - 18, 20, 3);
                ctx.fillStyle = '#4caf50'; ctx.fillRect(hx - 10, hy - 18, Math.round(20 * h.hp / h.maxHp), 3);
            }
            ctx.restore();
        });

        // Alien explorers (scouts)
        state.alienExplorers.forEach(a => {
            const ex = a.x - cx, ey = a.y - cy;
            if (ex < -60 || ex > canvas.width + 60 || ey < -60 || ey > canvas.height + 60) return;
            ctx.save();
            if (a.hurtTimer > 0) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; }
            const flip = a.facingX < 0 ? -1 : 1;
            ctx.scale(flip, 1);
            const ax = ex * flip, ay = ey;
            // Tentacle legs (3 pairs, animated)
            ctx.fillStyle = '#00897b';
            for (let t = 0; t < 3; t++) {
                const tx = ax - 6 + t * 6;
                const tLen = 8 + Math.round(Math.sin(a.animTimer * 0.2 + t) * 3);
                ctx.fillRect(tx, ay + 7, 3, tLen);
            }
            // Body (ovoid)
            ctx.fillStyle = a.hurtTimer > 0 ? '#b2dfdb' : '#00bfa5';
            ctx.fillRect(ax - 8, ay - 8, 16, 16);
            // Bioluminescent stripe
            ctx.fillStyle = a.hurtTimer > 0 ? '#e0f7fa' : '#64ffda';
            ctx.globalAlpha = 0.7 + Math.sin(state.frame * 0.1 + a.animTimer) * 0.3;
            ctx.fillRect(ax - 6, ay - 2, 12, 3);
            ctx.globalAlpha = 1;
            // Head dome
            ctx.fillStyle = a.hurtTimer > 0 ? '#b2dfdb' : '#00897b';
            ctx.fillRect(ax - 6, ay - 14, 12, 7);
            // Eyes (3 eyes, glowing)
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(ax - 5, ay - 12, 3, 3);
            ctx.fillRect(ax - 1, ay - 13, 3, 3);
            ctx.fillRect(ax + 3, ay - 12, 3, 3);
            // Glow effect
            ctx.globalAlpha = 0.25 + Math.sin(state.frame * 0.08) * 0.1;
            ctx.fillStyle = '#64ffda';
            ctx.fillRect(ax - 10, ay - 16, 20, 26);
            ctx.globalAlpha = 1;
            // Blink flash
            if (a.blinkFlash && a.blinkFlash > 0) {
                ctx.globalAlpha = a.blinkFlash / 8;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(ax - 10, ay - 16, 20, 26);
                ctx.globalAlpha = 1;
                a.blinkFlash--;
            }
            // HP bar
            if (a.hp < a.maxHp) {
                ctx.fillStyle = '#222'; ctx.fillRect(ax - 10, ay - 20, 20, 3);
                ctx.fillStyle = '#00bfa5'; ctx.fillRect(ax - 10, ay - 20, Math.round(20 * a.hp / a.maxHp), 3);
            }
            ctx.restore();
        });
    }

    // Butler (Rich character companion)
    if (state.butler) {
        const b = state.butler;
        const bx = b.x - cx, by = b.y - cy;
        if (bx > -40 && bx < canvas.width + 40 && by > -40 && by < canvas.height + 40) {
            ctx.save();
            const af = Math.floor(b.animTimer / 10) % 2;
            const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(bx + x, by + y, w, h); };
            // Shoes
            R(-5,12,4,3,'#111'); R(1,12,4,3,'#111');
            // Suit trousers (dark grey, pinstripe)
            const ll = af === 0 ? [-4,8,3,6] : [-4,10,3,4];
            const rl = af === 0 ? [1,10,3,4] : [1,8,3,6];
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx + ll[0], by + ll[1], ll[2], ll[3]);
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx + rl[0], by + rl[1], rl[2], rl[3]);
            // Jacket (very dark with white lapels)
            R(-5,-8,10,16,'#1a1a1a');
            R(-2,-6,4,10,'#f5f5f5');  // shirt
            R(-1,-5,2,7,'#9e9e9e');   // grey tie (subordinate, not gold)
            R(-8,-4,3,10,'#1a1a1a'); R(5,-4,3,10,'#1a1a1a'); // arms
            R(-8,4,3,2,'#f5f5f5'); R(5,4,3,2,'#f5f5f5');    // cuffs
            // Face
            R(-5,-18,10,12,'#ffe0b2');
            R(-3,-12,2,2,'#5d4037'); R(1,-12,2,2,'#5d4037'); // eyes
            R(-2,-8,5,2,'#4a2f18'); // thin moustache (less elaborate than rich)
            // Proper bowler hat (not as tall as rich's top hat)
            R(-6,-20,12,2,'#111');    // brim
            R(-4,-28,8,10,'#1a1a1a'); // crown
            R(-3,-27,6,2,'#333');     // band
            // "Serving" tray in one hand (right side)
            R(6,-2,10,1,'#b0bec5');  // tray
            R(8,-3,6,1,'#d0d0d0');   // shine
            // Hurt flash
            if (b.hurtTimer > 0) { ctx.globalAlpha = 0.4; ctx.fillStyle = '#fff'; ctx.fillRect(bx - 8, by - 28, 16, 42); ctx.globalAlpha = 1; }
            // Attack flash
            if (b.attackCooldown > 55) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8; R(6,-2,10,1,'#ffd700'); ctx.shadowBlur = 0; }
            // Paycheck warning every 5 waves (show warning icon above butler when wave is close)
            ctx.restore();
        }
    }

    // Bounty marker
    if (state.bountyTarget) {
        const bt = state.bountyTarget;
        const bx = bt.x - cx, by = bt.y - cy;
        const pulse = 1 + Math.sin(state.frame * 0.15) * 0.3;
        ctx.save();
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10 * pulse;
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bx, by, 16 * (bt.sizeScale || 1) * pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
        ctx.fillText('💰', bx, by - 22 * (bt.sizeScale || 1));
        ctx.shadowBlur = 0; ctx.restore();
    }

    // Player projectiles
    state.projectiles.forEach(pr => {
        const px = pr.x - cx, py = pr.y - cy;
        if (pr.type === 'bow' || pr.type === 'crossbow' || pr.type === 'thunderbow') {
            ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(pr.vy, pr.vx));
            const arrowCol = pr.type === 'thunderbow' ? '#ffee58' : pr.type === 'crossbow' ? '#8a6232' : '#c8a050';
            ctx.fillStyle = arrowCol; ctx.fillRect(-8, -1, 16, 2);
            ctx.fillStyle = '#ddd'; ctx.fillRect(6, -2, 4, 4); ctx.restore();
            if (pr.type === 'thunderbow') { ctx.fillStyle = 'rgba(255,238,88,0.4)'; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); }
        } else if (pr.type === 'waterBolt') {
            ctx.fillStyle = '#29b6f6'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#b3e5fc'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        } else if (pr.type === 'atomicBomb') {
            ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
        } else if (pr.type === 'magic' || pr.type === 'reflected') {
            ctx.fillStyle = pr.type === 'reflected' ? 'rgba(180,200,255,0.9)' : 'rgba(180,100,255,0.8)';
            ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        } else if (pr.type === 'boomerang') {
            ctx.save(); ctx.translate(px, py); ctx.rotate(state.frame * 0.3);
            ctx.fillStyle = '#c8a050';
            ctx.beginPath(); ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (pr.type === 'bomb') {
            ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
            if (state.frame % 4 < 2) {
                ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.arc(px + 3, py - 6, 2, 0, Math.PI * 2); ctx.fill();
            }
        } else if (pr.type === 'bone') {
            ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(pr.vy, pr.vx));
            ctx.fillStyle = '#d4c89a'; ctx.fillRect(-5, -1, 10, 2); ctx.restore();
        } else if (pr.type === 'plasma') {
            ctx.save();
            ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12;
            ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#00b0ff'; ctx.beginPath(); ctx.arc(px - pr.vx * 2, py - pr.vy * 2, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (pr.type === 'divine') {
            // Holy golden orb with glow
            ctx.save();
            ctx.shadowColor = '#ffe082'; ctx.shadowBlur = 14;
            ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff9c4'; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (pr.type === 'laser') {
            // Thin fast laser beam with red glow
            ctx.save();
            ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 10;
            ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(px - pr.vx * 2, py - pr.vy * 2); ctx.lineTo(px, py); ctx.stroke();
            ctx.strokeStyle = '#ff8a80'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(px - pr.vx * 3, py - pr.vy * 3); ctx.lineTo(px, py); ctx.stroke();
            ctx.restore();
        } else if (pr.type === 'harpoon') {
            // Pointed harpoon with line trail
            ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(pr.vy, pr.vx));
            ctx.fillStyle = '#b0bec5'; ctx.fillRect(-10, -2, 20, 4);
            ctx.fillStyle = '#90a4ae'; ctx.fillRect(8, -4, 4, 8); // barbs
            ctx.fillStyle = '#78909c'; ctx.fillRect(-10, -1, 4, 2); // tail
            ctx.restore();
        } else if (pr.type === 'shuriken') {
            // Spinning shuriken
            ctx.save(); ctx.translate(px, py); ctx.rotate(state.frame * 0.4);
            ctx.fillStyle = '#78909c';
            ctx.fillRect(-5, -1, 10, 2); ctx.fillRect(-1, -5, 2, 10);
            ctx.fillStyle = '#90a4ae'; ctx.fillRect(-4, -4, 3, 3); ctx.fillRect(1, -4, 3, 3);
            ctx.fillRect(-4, 1, 3, 3); ctx.fillRect(1, 1, 3, 3);
            ctx.restore();
        } else if (pr.type === 'flask') {
            // Green glowing flask projectile
            ctx.save();
            ctx.shadowColor = '#76ff03'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#cddc39'; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e6ee9c'; ctx.beginPath(); ctx.arc(px - 2, py - 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (pr.type === 'stunPulse') {
            // Cyan electric pulse
            ctx.save();
            ctx.shadowColor = '#18ffff'; ctx.shadowBlur = 12;
            ctx.fillStyle = '#18ffff'; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
            // Pulse ring
            const pulsePct = (pr.life / 50);
            ctx.globalAlpha = pulsePct * 0.5;
            ctx.strokeStyle = '#18ffff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(px, py, 7 + (1 - pulsePct) * 10, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        } else if (pr.type === 'cubeBomb') {
            // Spinning rubix cube projectile
            const cubeColors = ['#ff1744','#2979ff','#00e676','#ffd600','#e040fb','#ff6d00'];
            ctx.save(); ctx.translate(px, py); ctx.rotate(state.frame * 0.25);
            const cs = 7; // cell size
            for (let ri = 0; ri < 2; ri++) {
                for (let ci2 = 0; ci2 < 2; ci2++) {
                    ctx.fillStyle = cubeColors[(ri * 2 + ci2 + Math.floor(state.frame / 4)) % cubeColors.length];
                    ctx.fillRect(-cs + ci2 * cs, -cs + ri * cs, cs - 1, cs - 1);
                }
            }
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
            ctx.strokeRect(-cs, -cs, cs * 2, cs * 2);
            ctx.restore();
        }
    });

    // Enemy projectiles
    state.enemyProjectiles.forEach(ep => {
        const epx = ep.x - cx, epy = ep.y - cy;
        if (ep.type === 'bone') {
            ctx.save(); ctx.translate(epx, epy); ctx.rotate(Math.atan2(ep.vy, ep.vx));
            ctx.fillStyle = '#d4c89a'; ctx.fillRect(-6, -1, 12, 2); ctx.restore();
        } else if (ep.type === 'groundfire') {
            ctx.save(); ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(epx, epy, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(epx, epy, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (ep.type === 'hellfire') {
            ctx.save(); ctx.shadowColor = '#cc0000'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#8b0000'; ctx.beginPath(); ctx.arc(epx, epy, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff2020'; ctx.beginPath(); ctx.arc(epx, epy, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (ep.type === 'ground') {
            // T-Rex stomp shockwave chunk
            ctx.save(); ctx.shadowColor = '#6d4c41'; ctx.shadowBlur = 6;
            ctx.fillStyle = '#4e342e'; ctx.beginPath(); ctx.arc(epx, epy, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#a1887f'; ctx.beginPath(); ctx.arc(epx, epy, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (ep.type === 'water') {
            // Megalodon tail sweep water bullet
            ctx.save(); ctx.shadowColor = '#00bcd4'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#0288d1'; ctx.beginPath(); ctx.arc(epx, epy, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#b3e5fc'; ctx.beginPath(); ctx.arc(epx, epy, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (ep.type === 'plasma') {
            // Alien Queen egg burst
            ctx.save(); ctx.shadowColor = '#1de9b6'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#00796b'; ctx.beginPath(); ctx.arc(epx, epy, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1de9b6'; ctx.beginPath(); ctx.arc(epx, epy, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (ep.type === 'deathRay') {
            // Necromancer bone shard
            ctx.save(); ctx.shadowColor = '#7c4dff'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#4a148c'; ctx.beginPath(); ctx.arc(epx, epy, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#d1c4e9'; ctx.fillRect(epx - 1, epy - 4, 2, 8); ctx.fillRect(epx - 4, epy - 1, 8, 2);
            ctx.restore();
        } else {
            ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.arc(epx, epy, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(epx, epy, 2, 0, Math.PI * 2); ctx.fill();
        }
    });

    // Janitor slippery patches
    if (state.slipperyPatches) {
        state.slipperyPatches.forEach(sp => {
            const sx = sp.x - cx, sy = sp.y - cy;
            if (sx < -60 || sx > canvas.width + 60 || sy < -60 || sy > canvas.height + 60) return;
            ctx.save();
            ctx.globalAlpha = Math.min(0.45, sp.life / 300 * 0.5);
            ctx.fillStyle = '#29b6f6';
            ctx.beginPath(); ctx.ellipse(sx, sy, sp.radius, sp.radius * 0.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.restore();
        });
    }

    // Paleontologist: draw fossil at persist.fossilPos
    if (persist.fossilPos && state.player.character !== 'dinosaur') {
        const fx2 = persist.fossilPos.x - cx, fy2 = persist.fossilPos.y - cy;
        if (fx2 > -40 && fx2 < canvas.width + 40 && fy2 > -40 && fy2 < canvas.height + 40) {
            ctx.save(); ctx.translate(fx2, fy2);
            ctx.globalAlpha = 0.85;
            // Simple bone fossil shape
            ctx.fillStyle = '#e8dfc0';
            ctx.fillRect(-8, -2, 16, 4); // spine
            ctx.fillRect(-7, -5, 3, 10); // rib 1
            ctx.fillRect(-2, -5, 3, 10); // rib 2
            ctx.fillRect(3, -5, 3, 10);  // rib 3
            ctx.fillRect(-10, -3, 4, 6); // head
            ctx.fillRect(7, 0, 6, 3);    // tail
            ctx.globalAlpha = 0.55; ctx.fillStyle = '#fff';
            ctx.font = '8px monospace'; ctx.textAlign = 'center';
            ctx.fillText('[E] examine', 0, -12);
            ctx.restore();
        }
    }

    // Paleontologist: draw fossil dino minions
    const pFm = state.player.fossilMinions;
    if (pFm && pFm.length > 0) {
        pFm.forEach(fm => {
            const fmx = fm.x - cx, fmy = fm.y - cy;
            if (fmx < -40 || fmx > canvas.width + 40 || fmy < -40 || fmy > canvas.height + 40) return;
            ctx.save(); ctx.translate(fmx, fmy);
            ctx.globalAlpha = Math.min(1, fm.life / 60);
            const bob2 = Math.sin(state.frame * 0.08) * 2;
            ctx.translate(0, bob2);
            ctx.fillStyle = '#e0d5b5'; // bone white
            ctx.fillRect(-5, -8, 10, 8); // body
            ctx.fillRect(-8, -6, 4, 6);  // tail
            ctx.fillRect(4, -10, 5, 4);  // head
            ctx.fillRect(3, -7, 3, 8);   // neck
            ctx.fillStyle = '#76ff03'; ctx.fillRect(5, -9, 2, 2); // eye
            ctx.restore();
        });
    }

    // Fish & sharks — only visible when underwater
    if (state.underwater) {
        // Fish
        if (state.fish) {
            for (const f of state.fish) {
                const fx2 = f.x - cx, fy2 = f.y - cy;
                if (fx2 < -16 || fx2 > canvas.width + 16 || fy2 < -8 || fy2 > canvas.height + 8) continue;
                const flash = f.hurtTimer > 0;
                const cols = [['#ff6d00','#ff9100'],['#00b0ff','#40c4ff'],['#ffd600','#ffea00']];
                const [body, fin] = flash ? ['#fff','#fff'] : cols[f.colorVariant % 3];
                const dir = f.vx >= 0 ? 1 : -1;
                ctx.save(); ctx.translate(fx2, fy2); ctx.scale(dir, 1);
                ctx.fillStyle = body; ctx.fillRect(-5, -2, 8, 4);  // body
                ctx.fillStyle = fin;  ctx.fillRect(-7, -3, 3, 6);  // tail
                ctx.fillRect(0, -3, 3, 2); ctx.fillRect(0, 1, 3, 2); // fins
                ctx.fillStyle = '#000'; ctx.fillRect(2, -1, 1, 1); // eye
                ctx.restore();
            }
        }
        // Sharks
        if (state.sharks) {
            for (const sh of state.sharks) {
                const sx2 = sh.x - cx, sy2 = sh.y - cy;
                if (sx2 < -70 || sx2 > canvas.width + 70 || sy2 < -70 || sy2 > canvas.height + 70) continue;
                const flash = sh.hurtTimer > 0;
                const bodyCol = flash ? '#fff' : '#37474f';
                const bellyCol = flash ? '#fff' : '#eceff1';
                const finCol  = flash ? '#fff' : '#263238';
                ctx.save(); ctx.translate(sx2, sy2); ctx.scale(sh.facingX, 1);
                // === Torpedo body: tapered at tail, tapered at snout ===
                ctx.fillStyle = bodyCol;
                ctx.fillRect(-24, -5, 6, 10);   // tail stub (narrowest)
                ctx.fillRect(-18, -8, 10, 16);  // rear body (widens)
                ctx.fillRect(-8, -10, 20, 20);  // center (widest)
                ctx.fillRect(12, -8, 10, 16);   // front narrowing
                ctx.fillRect(20, -5, 8, 10);    // snout taper
                ctx.fillRect(26, -2, 5, 5);     // snout tip (pointed)
                // === Belly (lighter countershading) ===
                ctx.fillStyle = bellyCol;
                ctx.fillRect(-18, 4, 46, 5);
                // === Caudal fin (split tail) ===
                ctx.fillStyle = finCol;
                ctx.fillRect(-32, -13, 10, 9);  // upper tail lobe
                ctx.fillRect(-32, 4, 10, 9);    // lower tail lobe
                ctx.fillRect(-26, -4, 5, 8);    // tail connector
                // === Dorsal fin (tall triangle) ===
                ctx.fillRect(-4, -24, 5, 14);   // spike
                ctx.fillRect(-9, -18, 5, 8);    // left base
                ctx.fillRect(1, -18, 5, 8);     // right base
                // === Pectoral fin ===
                ctx.fillStyle = bodyCol;
                ctx.fillRect(2, 9, 14, 5);      // side fin
                // === Eye ===
                ctx.fillStyle = '#111'; ctx.fillRect(18, -6, 7, 7);
                ctx.fillStyle = '#000'; ctx.fillRect(19, -5, 5, 5);
                ctx.fillStyle = '#fff'; ctx.fillRect(20, -5, 3, 3);
                // === Gills (dark lines) ===
                ctx.fillStyle = finCol;
                ctx.fillRect(8, -9, 2, 18); ctx.fillRect(5, -9, 2, 18);
                // HP bar
                const hf = sh.hp / sh.maxHp;
                ctx.fillStyle = '#1a0000'; ctx.fillRect(-24, 18, 58, 5);
                ctx.fillStyle = '#e53935'; ctx.fillRect(-24, 18, Math.round(58 * hf), 5);
                ctx.restore();
            }
        }
    }

    // Player
    drawPlayer();

    // HP bar — always shown under player (vampire survivors style), always red
    {
        const p = state.player;
        const px = p.x - cx, py = p.y - cy;
        const hpFrac = Math.max(0, Math.min(1, p.hp / p.maxHp));
        const barW = 32, barH = 4, barX = px - barW / 2, barY = py + 20;
        ctx.fillStyle = '#1a0000'; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(barX, barY, Math.round(barW * hpFrac), barH);
    }
    // Oxygen bar — below HP bar when diving
    if (state.underwater) {
        const p = state.player;
        const px = p.x - cx, py = p.y - cy;
        const oxyMax = 1800, oxyFrac = Math.max(0, (p.oxygenTimer || 0) / oxyMax);
        const barW = 32, barH = 4, barX = px - barW / 2, barY = py + 26;
        ctx.fillStyle = '#001a33'; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = oxyFrac > 0.3 ? '#00bcd4' : (oxyFrac > 0.1 ? '#ff9800' : '#f44336');
        ctx.fillRect(barX, barY, Math.round(barW * oxyFrac), barH);
    }

    // Trees — pass 2: canopy (above player, player walks behind)
    state.trees.forEach(tr => {
        const tx = tr.x - cx, ty = tr.y - cy;
        if (tx < -60 || tx > canvas.width + 60 || ty < -80 || ty > canvas.height + 60) return;
        const flash = tr.hurtTimer > 0;
        const type = tr.treeType || 'oak';

        if (type === 'oak') {
            // Narrow triangular silhouette (skinny)
            ctx.fillStyle = flash ? '#99cc77' : '#33691e';
            ctx.fillRect(tx - 14, ty - 24, 28, 16);
            ctx.fillStyle = flash ? '#aad988' : '#558b2f';
            ctx.fillRect(tx - 10, ty - 38, 20, 16);
            ctx.fillStyle = flash ? '#bbee99' : '#689f38';
            ctx.fillRect(tx - 6, ty - 52, 12, 16);
            ctx.fillStyle = flash ? '#ccffaa' : '#8bc34a';
            ctx.fillRect(tx - 3, ty - 64, 6, 14);
        } else if (type === 'pine') {
            // Wide lush layered canopy in pine green
            ctx.fillStyle = flash ? '#77bb77' : '#1b5e20';
            ctx.fillRect(tx - 22, ty - 30, 44, 22);
            ctx.fillStyle = flash ? '#88cc88' : '#2e7d32';
            ctx.fillRect(tx - 18, ty - 46, 36, 18);
            ctx.fillStyle = flash ? '#99dd99' : '#2d6a2d';
            ctx.fillRect(tx - 12, ty - 60, 24, 16);
            ctx.fillStyle = flash ? '#aaeaaa' : '#388e3c';
            ctx.fillRect(tx - 7, ty - 72, 14, 14);
            ctx.fillStyle = flash ? '#ccffcc' : '#4caf50';
            ctx.fillRect(tx - 14, ty - 38, 5, 4);
            ctx.fillRect(tx + 6, ty - 52, 4, 4);
            ctx.fillRect(tx - 3, ty - 64, 4, 4);
        } else if (type === 'dead') {
            // No canopy, just bare branches
            ctx.strokeStyle = flash ? '#cccccc' : '#616161';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tx, ty - 2); ctx.lineTo(tx - 14, ty - 20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(tx, ty - 2); ctx.lineTo(tx + 12, ty - 18); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(tx, ty - 8); ctx.lineTo(tx - 8, ty - 24); ctx.stroke();
            ctx.lineWidth = 1;
        } else if (type === 'fruit') {
            // Round pinkish canopy with fruit dots
            ctx.fillStyle = flash ? '#ff9999' : '#c62828';
            ctx.fillRect(tx - 16, ty - 28, 32, 18);
            ctx.fillStyle = flash ? '#ffcccc' : '#e53935';
            ctx.fillRect(tx - 12, ty - 40, 24, 16);
            ctx.fillStyle = flash ? '#ffdddd' : '#ef5350';
            ctx.fillRect(tx - 7, ty - 50, 14, 14);
            // Fruit dots
            ctx.fillStyle = flash ? '#fff' : '#ffd54f';
            ctx.fillRect(tx - 9, ty - 26, 4, 4);
            ctx.fillRect(tx + 3, ty - 28, 4, 4);
            ctx.fillRect(tx - 3, ty - 38, 4, 4);
        } else if (type === 'redwood') {
            // Very tall, wide reddish canopy
            ctx.fillStyle = flash ? '#88cc88' : '#2e7d32';
            ctx.fillRect(tx - 26, ty - 36, 52, 26);
            ctx.fillStyle = flash ? '#99dd99' : '#388e3c';
            ctx.fillRect(tx - 22, ty - 58, 44, 24);
            ctx.fillStyle = flash ? '#aaeaaa' : '#43a047';
            ctx.fillRect(tx - 16, ty - 78, 32, 22);
            ctx.fillStyle = flash ? '#bbffbb' : '#4caf50';
            ctx.fillRect(tx - 10, ty - 96, 20, 20);
            ctx.fillStyle = flash ? '#ccffcc' : '#66bb6a';
            ctx.fillRect(tx - 5, ty - 110, 10, 16);
            // Reddish bark peek above canopy base
            ctx.fillStyle = flash ? '#ff9999' : '#7b2e12';
            ctx.fillRect(tx - 4, ty - 38, 8, 4);
        }

        // HP bar (when damaged)
        if (tr.hp < tr.maxHp) {
            const barY = type === 'redwood' ? ty - 118 : type === 'dead' ? ty - 30 : type === 'fruit' ? ty - 56 : ty - 80;
            ctx.fillStyle = '#222'; ctx.fillRect(tx - 16, barY, 32, 4);
            const hpCol = type === 'redwood' ? '#8d6e63' : '#4caf50';
            ctx.fillStyle = hpCol; ctx.fillRect(tx - 16, barY, Math.round(32 * tr.hp / tr.maxHp), 4);
        }
    });

    // Pet
    if (state.player.pet) {
        const pp = state.player, psx = pp.x - cx, psy = pp.y - cy;
        const bob = Math.sin(state.frame * 0.12) * 3;
        const petX = psx - 22, petY = psy + 8 + bob;
        ctx.save(); ctx.translate(petX, petY);
        // Rabbit invincibility glow
        if (pp.pet === 'rabbit' && pp.rabbitInvTimer > 0) { ctx.shadowColor = '#a0ffa0'; ctx.shadowBlur = 14; }
        switch (pp.pet) {
            case 'dog':
                ctx.fillStyle = '#c8a050'; ctx.fillRect(-6, -4, 12, 8);
                ctx.fillRect(-8, -4, 3, 5); ctx.fillRect(5, -4, 3, 5);
                ctx.fillStyle = '#000'; ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1, -2, 2, 2);
                ctx.fillStyle = '#e08040'; ctx.fillRect(-1, 2, 2, 1);
                ctx.fillStyle = '#c8a050'; ctx.fillRect(6, 2, 5, 2);
                break;
            case 'cat':
                ctx.fillStyle = '#888'; ctx.fillRect(-5, -5, 10, 9);
                ctx.fillRect(-6, -8, 3, 4); ctx.fillRect(3, -8, 3, 4);
                ctx.fillStyle = '#000'; ctx.fillRect(-3, -3, 2, 2); ctx.fillRect(1, -3, 2, 2);
                ctx.fillStyle = '#f88'; ctx.fillRect(-1, 0, 2, 1);
                ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-5, 1); ctx.lineTo(-9, 0); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(5, 1); ctx.lineTo(9, 0); ctx.stroke();
                break;
            case 'chicken':
                // Body
                ctx.fillStyle = '#f0f0f0'; ctx.fillRect(-5, 0, 10, 7);
                ctx.fillStyle = '#d8d8d8'; ctx.fillRect(-7, 1, 3, 4); ctx.fillRect(4, 1, 3, 4); // wing tips
                // Head
                ctx.fillStyle = '#f0f0f0'; ctx.fillRect(-3, -7, 7, 7);
                // Comb
                ctx.fillStyle = '#cc2200'; ctx.fillRect(-1, -11, 2, 5); ctx.fillRect(2, -10, 2, 4);
                // Beak (facing right)
                ctx.fillStyle = '#ff8800'; ctx.fillRect(3, -4, 4, 2);
                // Eye
                ctx.fillStyle = '#000'; ctx.fillRect(1, -5, 2, 2);
                // Wattle
                ctx.fillStyle = '#cc2200'; ctx.fillRect(2, -2, 2, 3);
                // Feet
                ctx.fillStyle = '#ff8800'; ctx.fillRect(-3, 7, 2, 3); ctx.fillRect(1, 7, 2, 3);
                break;
            case 'rabbit':
                // Ears (tall)
                ctx.fillStyle = '#e8d8e8'; ctx.fillRect(-4, -14, 3, 12); ctx.fillRect(2, -14, 3, 12);
                ctx.fillStyle = '#ffaaaa'; ctx.fillRect(-3, -13, 1, 10); ctx.fillRect(3, -13, 1, 10);
                // Body
                ctx.fillStyle = '#f0e0f0'; ctx.fillRect(-5, 1, 10, 7);
                // Head
                ctx.fillStyle = '#f0e0f0'; ctx.fillRect(-4, -3, 9, 5);
                // Eyes (pink)
                ctx.fillStyle = '#dd0044'; ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(2, -2, 2, 2);
                // Nose
                ctx.fillStyle = '#ffaaaa'; ctx.fillRect(-1, 1, 2, 1);
                // Fluffy tail
                ctx.fillStyle = '#fff'; ctx.fillRect(4, 3, 4, 4);
                // Feet
                ctx.fillStyle = '#e8d8e8'; ctx.fillRect(-5, 8, 4, 2); ctx.fillRect(1, 8, 5, 2);
                break;
            case 'snake':
                // Coiled body
                ctx.fillStyle = '#40c060'; ctx.fillRect(-5, 3, 8, 4);   // bottom loop
                ctx.fillStyle = '#35aa50'; ctx.fillRect(-5, 0, 3, 4);   // left side
                ctx.fillStyle = '#40c060'; ctx.fillRect(-1, -4, 5, 5);  // mid coil
                // Upper body going right toward head
                ctx.fillStyle = '#40c060'; ctx.fillRect(-1, -7, 8, 4);
                // Head (right-facing)
                ctx.fillStyle = '#208040'; ctx.fillRect(5, -10, 8, 5);
                // Eye
                ctx.fillStyle = '#ffdd00'; ctx.fillRect(7, -9, 2, 2);
                ctx.fillStyle = '#000'; ctx.fillRect(8, -8, 1, 1);
                // Tongue (forked)
                ctx.fillStyle = '#ff3030'; ctx.fillRect(12, -8, 3, 1);
                ctx.fillRect(14, -9, 1, 1); ctx.fillRect(14, -7, 1, 1);
                // Belly stripe
                ctx.fillStyle = '#70e090'; ctx.fillRect(-4, 4, 6, 2); ctx.fillRect(-4, 1, 2, 3);
                break;
            case 'bird':
                // Tail feathers (right)
                ctx.fillStyle = '#5090ff'; ctx.fillRect(4, 0, 6, 3); ctx.fillRect(6, 3, 4, 2);
                // Body
                ctx.fillStyle = '#4080ff'; ctx.fillRect(-4, -4, 9, 7);
                // Wing (left, spread)
                ctx.fillStyle = '#2060dd'; ctx.fillRect(-11, -3, 8, 5);
                ctx.fillStyle = '#3070ee'; ctx.fillRect(-10, -5, 5, 3);
                // Head (left-facing)
                ctx.fillStyle = '#4080ff'; ctx.fillRect(-6, -8, 7, 5);
                // Beak (left)
                ctx.fillStyle = '#ffdd00'; ctx.fillRect(-9, -6, 4, 2);
                // Eye
                ctx.fillStyle = '#000'; ctx.fillRect(-3, -7, 2, 2);
                ctx.fillStyle = '#fff'; ctx.fillRect(-3, -7, 1, 1);
                break;
            case 'hamster':
                // Ears
                ctx.fillStyle = '#aa7040'; ctx.fillRect(-4, -10, 3, 4); ctx.fillRect(1, -10, 3, 4);
                ctx.fillStyle = '#cc9060'; ctx.fillRect(-3, -9, 1, 2); ctx.fillRect(2, -9, 1, 2);
                // Head + body
                ctx.fillStyle = '#d4a060'; ctx.fillRect(-6, -6, 12, 13);
                // Chubby cheek pouches (bulging sides)
                ctx.fillStyle = '#e8ba80'; ctx.fillRect(-9, -3, 4, 6); ctx.fillRect(5, -3, 4, 6);
                // Eyes
                ctx.fillStyle = '#000'; ctx.fillRect(-3, -4, 2, 2); ctx.fillRect(1, -4, 2, 2);
                ctx.fillStyle = '#fff'; ctx.fillRect(-3, -4, 1, 1); ctx.fillRect(1, -4, 1, 1);
                // Nose
                ctx.fillStyle = '#ff9090'; ctx.fillRect(-1, -1, 2, 1);
                // Tiny feet
                ctx.fillStyle = '#c09050'; ctx.fillRect(-4, 7, 3, 2); ctx.fillRect(1, 7, 3, 2);
                break;
            case 'turtle':
                // Legs (top-down view)
                ctx.fillStyle = '#70a840';
                ctx.fillRect(-12, -5, 5, 3); ctx.fillRect(7, -5, 5, 3);
                ctx.fillRect(-11, 3, 5, 3);  ctx.fillRect(6, 3, 5, 3);
                // Shell border
                ctx.fillStyle = '#304020'; ctx.fillRect(-8, -7, 16, 14);
                // Shell main
                ctx.fillStyle = '#508030'; ctx.fillRect(-7, -6, 14, 12);
                // Shell highlight edges
                ctx.fillStyle = '#608840'; ctx.fillRect(-5, -7, 10, 2); ctx.fillRect(-5, 5, 10, 2);
                // Shell hex scute pattern
                ctx.fillStyle = '#304020';
                ctx.fillRect(-4, -4, 3, 3); ctx.fillRect(1, -5, 3, 4);
                ctx.fillRect(-6, 0, 3, 4);  ctx.fillRect(-2, 0, 3, 4); ctx.fillRect(3, 0, 3, 3);
                ctx.fillRect(-3, 4, 3, 2);
                // Head (top)
                ctx.fillStyle = '#70a840'; ctx.fillRect(-3, -11, 6, 5);
                ctx.fillStyle = '#000'; ctx.fillRect(-2, -10, 2, 2); ctx.fillRect(1, -10, 2, 2);
                break;
            case 'dinopal': {
                // Baby raptor (small, green, two-legged)
                ctx.fillStyle = '#558b2f'; ctx.fillRect(-5, 1, 10, 7); // body
                ctx.fillStyle = '#388e3c'; ctx.fillRect(-3, -4, 6, 6); // neck/head
                ctx.fillStyle = '#33691e'; ctx.fillRect(-6, 6, 3, 4); ctx.fillRect(3, 6, 3, 4); // legs
                ctx.fillStyle = '#2e7b32'; ctx.fillRect(-8, 7, 3, 2); ctx.fillRect(6, 7, 3, 2); // feet
                ctx.fillStyle = '#000'; ctx.fillRect(-2, -3, 1, 1); ctx.fillRect(1, -3, 1, 1); // eyes
                ctx.fillStyle = '#43a047'; ctx.fillRect(-7, 3, 3, 3); // tail start
                ctx.fillStyle = '#558b2f'; ctx.fillRect(-9, 4, 3, 2); // tail end
                break;
            }
            case 'sharky': {
                // Tiny shark: blue-grey body, dorsal fin, tail
                const saf = Math.cos(state.frame * 0.06) > 0 ? 1 : -1; // waggle direction
                ctx.save(); ctx.scale(saf, 1);
                ctx.fillStyle = '#546e7a'; // body
                ctx.beginPath(); ctx.ellipse(0, 1, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#37474f'; // dorsal fin
                ctx.fillRect(-2, -8, 4, 7);
                ctx.fillStyle = '#78909c'; // belly
                ctx.beginPath(); ctx.ellipse(0, 3, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#546e7a'; // caudal fin
                ctx.fillRect(7, -3, 4, 4); ctx.fillRect(7, 2, 4, 4);
                ctx.fillStyle = '#000'; ctx.fillRect(-6, -1, 2, 2); // eye
                ctx.restore();
                break;
            }
            case 'littleGuy': {
                // Small alien: big head, tiny body, glowing eyes
                ctx.fillStyle = '#004d40'; // body
                ctx.fillRect(-3, 1, 6, 6);
                ctx.fillStyle = '#00695c'; // head (big)
                ctx.fillRect(-6, -8, 12, 10);
                ctx.fillStyle = '#000'; ctx.fillRect(-4, -6, 4, 4); ctx.fillRect(1, -6, 4, 4); // eyes bg
                ctx.shadowColor = '#1de9b6'; ctx.shadowBlur = 5;
                ctx.fillStyle = '#1de9b6'; ctx.fillRect(-4, -6, 3, 3); ctx.fillRect(1, -6, 3, 3); // glowing eyes
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#004d40'; // legs
                ctx.fillRect(-3, 7, 2, 3); ctx.fillRect(1, 7, 2, 3);
                break;
            }
            case 'ghosty': {
                // Ghost: wispy white translucent
                ctx.save(); ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.75;
                const gWave = Math.sin(state.frame * 0.12) * 2;
                ctx.fillStyle = '#e3f2fd';
                ctx.beginPath(); ctx.ellipse(0, -2 + gWave * 0.3, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(-8, 4 + gWave * 0.3, 16, 6); // sheet body
                // Wavy bottom edge
                ctx.fillStyle = '#bbdefb';
                ctx.fillRect(-8, 9, 3, 2); ctx.fillRect(-2, 9, 3, 2); ctx.fillRect(4, 9, 3, 2);
                ctx.globalAlpha = ctx.globalAlpha / 0.75;
                ctx.restore();
                // Eyes (dark hollow)
                ctx.fillStyle = 'rgba(30,60,100,0.8)'; ctx.beginPath(); ctx.ellipse(-3, 0 + gWave * 0.3, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(3, 0 + gWave * 0.3, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'phoenix': {
                // Firebird: orbits player — orange/red feathered body with flame tail
                const phA = p.phoenixAngle || 0;
                const phOx = Math.cos(phA) * 50, phOy = Math.sin(phA) * 50;
                ctx.save();
                ctx.translate(phOx, phOy);
                // Flame glow
                ctx.save(); ctx.shadowColor = '#ff6d00'; ctx.shadowBlur = 10; ctx.restore();
                // Body
                ctx.fillStyle = '#e64a19'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 9, phA + Math.PI * 0.5, 0, Math.PI * 2); ctx.fill();
                // Wing flicker
                const phWing = Math.sin(state.frame * 0.18) * 3;
                ctx.fillStyle = '#ff6d00'; ctx.beginPath(); ctx.ellipse(-5 + phWing * 0.5, -2, 4, 6, phA + 0.8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ff6d00'; ctx.beginPath(); ctx.ellipse(5 - phWing * 0.5, -2, 4, 6, phA - 0.8, 0, Math.PI * 2); ctx.fill();
                // Head
                ctx.fillStyle = '#ffcc02'; ctx.beginPath(); ctx.arc(0, -7, 4, 0, Math.PI * 2); ctx.fill();
                // Eyes
                ctx.fillStyle = '#bf360c'; ctx.beginPath(); ctx.arc(-2, -8, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(2, -8, 1.2, 0, Math.PI * 2); ctx.fill();
                // Tail flame streaks
                ctx.fillStyle = 'rgba(255,160,0,0.7)';
                ctx.beginPath(); ctx.moveTo(-3, 7); ctx.lineTo(0, 14 + phWing); ctx.lineTo(3, 7); ctx.fill();
                ctx.fillStyle = 'rgba(255,235,59,0.5)';
                ctx.beginPath(); ctx.moveTo(-1, 7); ctx.lineTo(0, 18 + phWing * 1.5); ctx.lineTo(1, 7); ctx.fill();
                ctx.restore();
                break;
            }
        }
        ctx.restore();

        // Egg drawing
        state.eggs.forEach(eg => {
            const ex2 = eg.x - cx, ey2 = eg.y - cy;
            const pulse = 1 + Math.sin(eg.timer * 0.2) * 0.15;
            ctx.save(); ctx.translate(ex2, ey2); ctx.scale(pulse, pulse);
            ctx.fillStyle = '#fff8c0'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2); ctx.stroke();
            // Fuse spark
            if (state.frame % 4 < 2) { ctx.fillStyle = '#ff8800'; ctx.fillRect(-1, -9, 2, 3); }
            ctx.restore();
        });
    }

    // Damage numbers
    ctx.save(); ctx.textAlign = 'center';
    state.damageNumbers.forEach(dn => {
        ctx.globalAlpha = dn.life / 50;
        if (dn.isGold) {
            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            const label = '+' + dn.value + 'g';
            ctx.strokeText(label, dn.x - cx, dn.y - cy);
            ctx.fillText(label, dn.x - cx, dn.y - cy);
        } else {
            ctx.font = dn.crit ? 'bold 13px monospace' : 'bold 10px monospace';
            ctx.fillStyle = dn.crit ? '#ffdd00' : '#ffffff';
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            ctx.strokeText('-' + dn.value, dn.x - cx, dn.y - cy);
            ctx.fillText('-' + dn.value, dn.x - cx, dn.y - cy);
        }
    });
    ctx.globalAlpha = 1; ctx.restore();

    // Streak milestone screen flash
    if (state.streakFlashTimer > 0) {
        state.streakFlashTimer--;
        const flashAlpha = (state.streakFlashTimer / 20) * 0.28;
        ctx.save(); ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = state.streakFlashColor || '#ff6600';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Combo text
    if (state.player.streak > 2) {
        const cpx = state.player.x - cx, cpy = state.player.y - cy;
        const sk = state.player.streak;
        ctx.save(); ctx.textAlign = 'center';
        const comboSize = sk >= 40 ? 16 : sk >= 20 ? 13 : sk >= 10 ? 11 : 10;
        ctx.font = 'bold ' + comboSize + 'px monospace';
        const comboColor = sk >= 40 ? '#ff0044' : sk >= 20 ? '#ff8800' : sk >= 10 ? '#ff4400' : '#ffd700';
        ctx.fillStyle = comboColor; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        const bonusTag = sk >= 40 ? ' 💀INSTAKILL' : sk >= 20 ? ' ⚡+50%DMG' : sk >= 10 ? ' 🔥+20%DMG' : '';
        const txt = sk + 'x COMBO' + bonusTag;
        if (sk >= 20) { ctx.shadowColor = comboColor; ctx.shadowBlur = 10 + Math.sin(state.frame * 0.2) * 4; }
        ctx.strokeText(txt, cpx, cpy - 50 * (state.player.sizeScale || 1));
        ctx.fillText(txt, cpx, cpy - 50 * (state.player.sizeScale || 1));
        ctx.shadowBlur = 0; ctx.restore();
    }

    // Wave breather countdown
    if (state.waveBreather > 0) {
        const sec = Math.ceil(state.waveBreather / 60);
        ctx.save(); ctx.textAlign = 'center';
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = `rgba(100,180,255,${0.6 + Math.sin(state.frame * 0.15) * 0.3})`;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        const wt = 'Wave ' + state.player.wave + ' incoming in ' + sec + '...';
        ctx.strokeText(wt, canvas.width / 2, canvas.height / 2 - 60);
        ctx.fillText(wt, canvas.width / 2, canvas.height / 2 - 60);
        ctx.restore();
    }

    // Horde wave timer bar
    if (state.hordeWave) {
        const progress = state.hordeTimer / 1800;
        const barW = 300, barH = 12;
        const bx = canvas.width / 2 - barW / 2, by = canvas.height - 60;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
        ctx.fillStyle = `rgba(255,${Math.floor(100 + progress * 155)},0,0.9)`;
        ctx.fillRect(bx, by, barW * progress, barH);
        ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, barW, barH);
        ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.strokeText('🌊 HORDE — ' + Math.ceil(state.hordeTimer / 60) + 's remaining', canvas.width / 2, by - 4);
        ctx.fillText('🌊 HORDE — ' + Math.ceil(state.hordeTimer / 60) + 's remaining', canvas.width / 2, by - 4);
        ctx.restore();
    }

    // Angel visual
    if (state.angelTimer > 0) {
        const alpha = Math.min(1, state.angelTimer / 40);
        const apx = state.player.x - cx, apy = state.player.y - cy;
        const floatY = Math.sin(state.frame * 0.06) * 4;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.shadowColor = '#ffe870'; ctx.shadowBlur = 22;
        // Halo
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(apx, apy - 68 + floatY, 15, 4, 0, 0, Math.PI * 2); ctx.stroke();
        // Wings
        ctx.fillStyle = 'rgba(255,248,200,0.75)';
        ctx.beginPath(); ctx.ellipse(apx - 22, apy - 52 + floatY, 18, 9, -0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(apx + 22, apy - 52 + floatY, 18, 9, 0.35, 0, Math.PI * 2); ctx.fill();
        // Body
        ctx.fillStyle = '#fff8e0'; ctx.fillRect(apx - 6, apy - 62 + floatY, 12, 18);
        // Head
        ctx.fillStyle = '#ffe8c0'; ctx.beginPath(); ctx.arc(apx, apy - 70 + floatY, 7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Smite ring (burst at start)
        if (state.angelTimer > 130) {
            const prog = (state.angelTimer - 130) / 30;
            ctx.save(); ctx.globalAlpha = prog * 0.4;
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(apx, apy, 260 * (1 - prog), 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }

    // Web slow indicator
    if (state.spiderWebs.some(w => Math.hypot(w.x - state.player.x, w.y - state.player.y) < 25 * (state.player.sizeScale || 1))) {
        const cpx = state.player.x - cx, cpy = state.player.y - cy;
        ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#aaa'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.strokeText('WEBBED', cpx, cpy - 38); ctx.fillText('WEBBED', cpx, cpy - 38);
        ctx.restore();
    }

    // ─── WEATHER VISUALS ───
    if (state.difficulty && !state.gameOver) {
        const _wdr = state.weather;
        const _wds = _wdr.extreme || (_wdr.stage > 0 ? WEATHER_STAGES[_wdr.stage] : null);
        if (_wds && _wds.fogAlpha > 0) {
            // Fog overlay
            ctx.save();
            ctx.fillStyle = _wdr.extreme?.name === 'Blizzard' ? `rgba(200,220,255,${_wds.fogAlpha})` : `rgba(80,90,100,${_wds.fogAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        // Rain streaks (screen-space)
        if (_wdr.rainParticles.length > 0) {
            ctx.save();
            ctx.strokeStyle = _wdr.stage === 1 ? 'rgba(180,200,255,0.35)' : 'rgba(160,190,255,0.55)';
            ctx.lineWidth = _wdr.stage >= 3 ? 1.5 : 1;
            for (const r of _wdr.rainParticles) {
                const sx = r.x - cx, sy = r.y - cy;
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + r.vx * 3, sy + r.vy * 3); ctx.stroke();
            }
            ctx.restore();
        }
        // Lightning flash
        if (_wdr.lightningFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255,255,220,${_wdr.lightningFlash / 8 * 0.35})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        // Tornado visual (world-space spiral)
        if (_wds?.tornado) {
            ctx.save();
            ctx.translate(_wdr.tornadoX - cx, _wdr.tornadoY - cy);
            for (let ti = 0; ti < 5; ti++) {
                const tr = 30 + ti * 20;
                const ta = state.frame * 0.05 + ti * 0.8;
                ctx.beginPath();
                ctx.arc(0, 0, tr, ta, ta + Math.PI * 1.5);
                ctx.strokeStyle = `rgba(150,170,200,${0.6 - ti * 0.1})`;
                ctx.lineWidth = 4 - ti * 0.5;
                ctx.stroke();
            }
            ctx.restore();
        }
        // Active event banner (top of screen)
        if (state.activeEvent && state.activeEvent.timer > 0) {
            const ev = state.activeEvent;
            const frac = ev.duration > 0 ? ev.timer / ev.duration : 1;
            ctx.save();
            ctx.globalAlpha = Math.min(1, frac * 3, (1 - frac) * 3 + 0.3);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, canvas.width, 18);
            ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillStyle = '#ffd700'; ctx.fillText(ev.name, canvas.width / 2, 13);
            ctx.restore();
        }
        // Weather label (top-right corner)
        if (_wds && _wds.name) {
            ctx.save();
            ctx.font = '8px monospace'; ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(180,200,255,0.7)';
            ctx.fillText(_wds.name, canvas.width - 8, 16);
            ctx.restore();
        }
    }

    // ─── NIGHT OVERLAY + DAY CLOCK ───
    // Restore telescope zoom before screen-space overlays (night, HUD, etc.)
    if (state.telescopeActive) ctx.restore();

    const dn = state.dayNight;
    if (dn.alpha > 0.01) {
        const nightAlpha = Math.min(0.97, dn.alpha * 0.97 + 0.03);
        const p = state.player;
        const plx = p.x - cx, ply = p.y - cy;
        // Night vision multipliers per character (0 = skip overlay entirely)
        const NV = { vampire: 0, ninja: 1.8, robot: 1.6, monster: 1.5, reaper: 1.4, alien: 1.5, astronaut: 1.5, oldMan: 1.3 };
        const nvMult = NV[p.character] ?? 1;
        if (nvMult !== 0) {
            // Use offscreen canvas so destination-out only cuts through the dark overlay,
            // not through the game content underneath.
            const { nc, nctx } = _getNightLayer(canvas.width, canvas.height);
            nctx.clearRect(0, 0, nc.width, nc.height);
            nctx.globalCompositeOperation = 'source-over';
            // Alien world: bright white night instead of darkness
            const isAlienNight = state.alienWorld;
            const nightFill = isAlienNight
                ? `rgba(220,235,255,${nightAlpha})`
                : p.character === 'robot'
                    ? `rgba(0,15,3,${nightAlpha * 0.7})`
                    : `rgba(3,5,25,${nightAlpha})`;
            nctx.fillStyle = nightFill;
            nctx.fillRect(0, 0, nc.width, nc.height);
            if (isAlienNight) {
                // Alien night: blinding white overlay, destination-out punches a transparent hole near player
                nctx.globalCompositeOperation = 'destination-out';
                const baseR = (p.torchTimer > 0 ? 180 + Math.min(60, p.torchTimer / 20) : 80) * nvMult;
                const pg2 = nctx.createRadialGradient(plx, ply, 0, plx, ply, baseR);
                pg2.addColorStop(0,    'rgba(0,0,0,1)');
                pg2.addColorStop(0.3,  'rgba(0,0,0,0.95)');
                pg2.addColorStop(0.55, 'rgba(0,0,0,0.55)');
                pg2.addColorStop(0.75, 'rgba(0,0,0,0.15)');
                pg2.addColorStop(1,    'rgba(0,0,0,0)');
                nctx.fillStyle = pg2;
                nctx.fillRect(0, 0, nc.width, nc.height);
                ctx.drawImage(nc, 0, 0);
            } else {
            // Punch light holes using destination-out on the offscreen canvas only
            nctx.globalCompositeOperation = 'destination-out';
            const baseR = (p.torchTimer > 0 ? 180 + Math.min(60, p.torchTimer / 20) : 80) * nvMult;
            const pg = nctx.createRadialGradient(plx, ply, 0, plx, ply, baseR);
            pg.addColorStop(0,    'rgba(0,0,0,1)');
            pg.addColorStop(0.3,  'rgba(0,0,0,0.95)');
            pg.addColorStop(0.55, 'rgba(0,0,0,0.55)');
            pg.addColorStop(0.75, 'rgba(0,0,0,0.15)');
            pg.addColorStop(1,    'rgba(0,0,0,0)');
            nctx.fillStyle = pg;
            nctx.fillRect(0, 0, nc.width, nc.height);
            // Lava glow: punch radial holes around visible lava tiles
            {
                const lavR = 50 + Math.sin(state.frame * 0.08) * 6;
                const tileX0 = Math.floor(cx / TILE), tileY0 = Math.floor(cy / TILE);
                const tileX1 = Math.ceil((cx + canvas.width) / TILE), tileY1 = Math.ceil((cy + canvas.height) / TILE);
                for (let tr = tileY0; tr <= tileY1; tr++) {
                    for (let tc = tileX0; tc <= tileX1; tc++) {
                        if (terrainMap[tr]?.[tc] !== 'lava') continue;
                        const lx = tc * TILE + TILE / 2 - cx, ly = tr * TILE + TILE / 2 - cy;
                        const lg = nctx.createRadialGradient(lx, ly, 0, lx, ly, lavR);
                        lg.addColorStop(0, 'rgba(0,0,0,0.55)');
                        lg.addColorStop(1, 'rgba(0,0,0,0)');
                        nctx.fillStyle = lg;
                        nctx.fillRect(lx - lavR, ly - lavR, lavR * 2, lavR * 2);
                    }
                }
                // Orange warm tint over lava tiles (source-over pass)
                nctx.globalCompositeOperation = 'source-over';
                for (let tr = tileY0; tr <= tileY1; tr++) {
                    for (let tc = tileX0; tc <= tileX1; tc++) {
                        if (terrainMap[tr]?.[tc] !== 'lava') continue;
                        const lx = tc * TILE + TILE / 2 - cx, ly = tr * TILE + TILE / 2 - cy;
                        const og = nctx.createRadialGradient(lx, ly, 0, lx, ly, lavR);
                        og.addColorStop(0, `rgba(255,80,0,${0.10 * dn.alpha})`);
                        og.addColorStop(1, 'rgba(0,0,0,0)');
                        nctx.fillStyle = og;
                        nctx.fillRect(lx - lavR, ly - lavR, lavR * 2, lavR * 2);
                    }
                }
                nctx.globalCompositeOperation = 'destination-out';
            }
            // Warm torch glow overlay (orange tint around player when torch is lit)
            if (p.torchTimer > 0) {
                nctx.globalCompositeOperation = 'source-over';
                const tg = nctx.createRadialGradient(plx, ply, 0, plx, ply, baseR * 0.7);
                const torchBright = Math.min(1, p.torchTimer / 300);
                tg.addColorStop(0, `rgba(255,140,30,${torchBright * 0.18})`);
                tg.addColorStop(0.5, `rgba(255,80,10,${torchBright * 0.08})`);
                tg.addColorStop(1, 'rgba(0,0,0,0)');
                nctx.fillStyle = tg;
                nctx.fillRect(0, 0, nc.width, nc.height);
            }
            // Composite the night overlay onto the main canvas
            ctx.drawImage(nc, 0, 0);
            } // end else (non-alien night)
        }
    }
    // Evening darkening tint (gradual as day ends)
    if (dn.phase === 'day' && dn.timer <= 600) {
        const ep = (600 - dn.timer) / 600;
        ctx.fillStyle = `rgba(10,5,30,${ep * 0.28})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // ─── TELESCOPE SPYGLASS FRAME (0.35× zoom = ~2.9× view range) ───
    if (state.telescopeActive) {
        const cw = canvas.width, ch = canvas.height;
        const vignR = Math.min(cw, ch) * 0.46;
        // Black corners outside the circle
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.rect(0, 0, cw, ch);
        ctx.arc(cw / 2, ch / 2, vignR, 0, Math.PI * 2, true); // punch circle out
        ctx.fill('evenodd');
        // Vignette gradient inside circle
        const vig = ctx.createRadialGradient(cw/2, ch/2, vignR * 0.65, cw/2, ch/2, vignR);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = vig; ctx.fillRect(0, 0, cw, ch);
        // Wooden ring border
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(cw/2, ch/2, vignR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cw/2, ch/2, vignR + 5, 0, Math.PI * 2); ctx.stroke();
        // Crosshair
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cw/2, ch/2 - 20); ctx.lineTo(cw/2, ch/2 + 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cw/2 - 20, ch/2); ctx.lineTo(cw/2 + 20, ch/2); ctx.stroke();
    }

    // ─── UNDERWATER OVERLAY ───
    if (state.underwater) {
        const p = state.player;
        // Bubble particles (random rise each frame)
        if (state.frame % 8 === 0) {
            state.particles.push({
                x: p.x - state.camera.x + (Math.random()-0.5)*60,
                y: p.y - state.camera.y + 10 + Math.random()*20,
                vx: (Math.random()-0.5)*0.4, vy: -1.2 - Math.random()*0.8,
                life: 80 + Math.random()*40, color: 'rgba(160,220,255,0.55)'
            });
        }
        // Oxygen bar — drawn under the player (rendered in drawPlayer pass instead)
    }

    // ─── Day/Night Clock (pixel art) — only during active gameplay ───
    if (state.difficulty && !state.gameOver) {
    ctx.save();
    {
        const EVENING_FRAMES = 600;
        const TOTAL = DAY_LEN + NIGHT_LEN;
        const DAY_PURE = DAY_LEN - EVENING_FRAMES;
        const dayFrac = DAY_PURE / TOTAL;
        const eveFrac = EVENING_FRAMES / TOTAL;
        const nightFrac = NIGHT_LEN / TOTAL;
        const cx = 685, cy = 76, r = 30;
        const PS = 3; // each "pixel" is 3×3 canvas pixels
        const startA = -Math.PI / 2;
        const dayEnd = startA + dayFrac * Math.PI * 2;
        const eveEnd = dayEnd + eveFrac * Math.PI * 2;

        // Draw pixel grid
        const steps = Math.ceil(r / PS) + 1;
        for (let py = -steps; py <= steps; py++) {
            for (let px = -steps; px <= steps; px++) {
                const wx = px * PS, wy = py * PS;
                const dist = Math.sqrt(wx * wx + wy * wy);
                if (dist > r + PS * 0.5) continue;
                let col;
                if (dist > r - PS) {
                    col = '#2a1c04'; // outer border ring
                } else if (dist < PS * 1.5) {
                    col = '#111'; // center hub
                } else {
                    let angle = Math.atan2(wy, wx) - startA;
                    if (angle < 0) angle += Math.PI * 2;
                    const frac = angle / (Math.PI * 2);
                    if (frac < dayFrac) {
                        col = dist < r * 0.55 ? '#f0d040' : '#c8a818'; // day (two-tone)
                    } else if (frac < dayFrac + eveFrac) {
                        col = '#cc4400'; // evening
                    } else {
                        col = dist < r * 0.6 ? '#0d1258' : '#080a2a'; // night (two-tone)
                    }
                }
                ctx.fillStyle = col;
                ctx.fillRect(Math.round(cx + wx - PS / 2), Math.round(cy + wy - PS / 2), PS, PS);
            }
        }

        // Needle angle
        let needleA;
        if (dn.phase === 'day') {
            if (dn.timer > EVENING_FRAMES) {
                needleA = startA + ((DAY_LEN - dn.timer) / DAY_PURE) * dayFrac * Math.PI * 2;
            } else {
                needleA = dayEnd + ((EVENING_FRAMES - dn.timer) / EVENING_FRAMES) * eveFrac * Math.PI * 2;
            }
        } else {
            needleA = eveEnd + ((NIGHT_LEN - dn.timer) / NIGHT_LEN) * nightFrac * Math.PI * 2;
        }

        // Pixel needle — draw as discrete squares along the line
        const nLen = r - 8;
        for (let t = PS * 2; t <= nLen; t += PS) {
            const nx = Math.round(cx + Math.cos(needleA) * t);
            const ny = Math.round(cy + Math.sin(needleA) * t);
            ctx.fillStyle = 'rgba(0,0,0,0.45)'; // shadow offset
            ctx.fillRect(nx, ny, PS - 1, PS - 1);
            ctx.fillStyle = t > nLen * 0.5 ? '#ffffff' : '#bbbbbb';
            ctx.fillRect(nx - 1, ny - 1, PS - 1, PS - 1);
        }

        // Center hub pixel
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(cx - PS, cy - PS, PS * 2, PS * 2);
        ctx.fillStyle = '#dddddd'; ctx.fillRect(cx - 1, cy - 1, PS - 1, PS - 1);

        // Labels below clock
        const phaseLabel = dn.phase === 'night' ? 'NIGHT' : (dn.timer <= EVENING_FRAMES ? 'EVENING' : 'DAY');
        const phaseColor = dn.phase === 'night' ? '#8090ff' : (dn.timer <= EVENING_FRAMES ? '#ff8040' : '#ffe060');
        ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.strokeText('DAY ' + dn.dayCount, cx, cy + r + 14);
        ctx.fillStyle = phaseColor;
        ctx.fillText('DAY ' + dn.dayCount, cx, cy + r + 14);
        ctx.font = '7px monospace'; ctx.lineWidth = 2;
        ctx.strokeText(phaseLabel, cx, cy + r + 24);
        ctx.fillText(phaseLabel, cx, cy + r + 24);
    }
    ctx.restore();
    } // end clock guard

    // Witch potion indicator (bottom right, when potion is brewed)
    if (state.player.charWitch && state.player.witchPotionReady) {
        const POTION_COLORS = { heal: '#66bb6a', freeze: '#4fc3f7', poison: '#ab47bc', chaos: '#ff7043' };
        const POTION_ICONS  = { heal: '♥ HEAL', freeze: '❄ FREEZE', poison: '☠ POISON', chaos: '✦ CHAOS' };
        const pType = state.player.witchPotionType || 'chaos';
        const pCol = POTION_COLORS[pType] || '#ff7043';
        const pLabel = POTION_ICONS[pType] || pType.toUpperCase();
        const pw = 100, ph = 18, px2 = canvas.width - pw - 8, py2 = canvas.height - ph - 22;
        const pulse = 0.8 + Math.sin(state.frame * 0.15) * 0.2;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = 'rgba(10,6,20,0.85)'; ctx.fillRect(px2 - 2, py2 - 2, pw + 4, ph + 4);
        ctx.fillStyle = pCol; ctx.fillRect(px2, py2, pw, ph);
        ctx.strokeStyle = pCol; ctx.lineWidth = 2; ctx.globalAlpha = 1;
        ctx.strokeRect(px2, py2, pw, ph);
        ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#000';
        ctx.fillText(pLabel + ' POTION', px2 + pw / 2, py2 + 12);
        ctx.restore();
        ctx.save(); ctx.textAlign = 'center'; ctx.font = '7px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText('[Click] to use', px2 + pw / 2, py2 - 4);
        ctx.restore();
    }

    // Pet action progress bar (bottom left, when pet has an active threshold)
    {
        const pp = state.player;
        const cfg = pp.pet ? PET_ACTION_CONFIG[pp.pet] : null;
        if (pp.pet && cfg && pp.petActionThreshold > 0 && pp.petEvolveLevel < 10 && !pp.petUpgradeReady) {
            const pW = 120, pH = 5, pX = 8, pY = canvas.height - 22;
            const frac = Math.min(1, pp.petActionCount / pp.petActionThreshold);
            ctx.fillStyle = 'rgba(10,8,28,0.8)'; ctx.fillRect(pX - 1, pY - 1, pW + 2, pH + 2);
            ctx.fillStyle = '#ff9800'; ctx.fillRect(pX, pY, Math.round(pW * frac), pH);
            ctx.strokeStyle = '#cc6000'; ctx.lineWidth = 1; ctx.strokeRect(pX, pY, pW, pH);
            ctx.fillStyle = '#ffb74d'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
            ctx.fillText(PET_TYPES[pp.pet].icon + ' ' + pp.petActionCount + '/' + pp.petActionThreshold + ' ' + cfg.label, pX, pY - 3);
        }
    }

    // XP bar (bottom center)
    {
        const xp = state.player;
        const bW = 180, bH = 6, bX = canvas.width / 2 - bW / 2, bY = canvas.height - 14;
        ctx.fillStyle = 'rgba(15,10,35,0.85)'; ctx.fillRect(bX - 1, bY - 1, bW + 2, bH + 2);
        const xpFrac = xp.xpToNext > 0 ? xp.xp / xp.xpToNext : 0;
        ctx.fillStyle = '#7050ee'; ctx.fillRect(bX, bY, Math.round(bW * xpFrac), bH);
        ctx.strokeStyle = '#5030aa'; ctx.lineWidth = 1; ctx.strokeRect(bX, bY, bW, bH);
        ctx.fillStyle = xp.skillPoints > 0 ? '#ffdd00' : '#b090ff';
        ctx.font = '8px monospace'; ctx.textAlign = 'center';
        const spTxt = xp.skillPoints > 0 ? '  [' + xp.skillPoints + ' SKILL PT' + (xp.skillPoints > 1 ? 'S' : '') + ']' : '';
        ctx.fillText('LV' + xp.xpLevel + '  ' + xp.xp + '/' + xp.xpToNext + ' XP' + spTxt, canvas.width / 2, bY - 3);
    }
    if (state.gameOver) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    if (_swFR) CanvasRenderingContext2D.prototype.fillRect = _swFR; // restore after stickWorld frame
}

function drawCharacterBodyNonKnight(p) {
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    const af = p.animFrame || 0;
    // Leg animation helpers
    const ll = af === 0 ? [-4,8,3,6] : [-4,10,3,4];
    const rl = af === 0 ? [1,10,3,4] : [1,8,3,6];
    switch (p.character) {
        case 'hoarder': {
            R(4,-9,7,14,'#5d4037'); R(9,-9,1,14,'#4e342e');
            R(10,-12,2,15,'#795548'); R(10,-13,5,4,'#78909c');
            R(-12,-12,2,16,'#b0bec5'); R(-13,-5,4,2,'#8b0000');
            R(-5,12,4,3,'#3e2723'); R(1,12,4,3,'#455a64');
            R(ll[0],ll[1],ll[2],ll[3],'#4e342e'); R(rl[0],rl[1],rl[2],rl[3],'#455a64');
            R(-5,-8,10,16,'#6d4c41');
            R(-8,-4,3,10,'#5d4037'); R(5,-4,3,10,'#5d4037');
            R(-5,-14,10,10,'#d4956a');
            R(-3,-12,2,2,'#3e2723'); R(1,-12,2,2,'#3e2723');
            R(-5,-16,10,3,'#5d4037'); R(-4,-20,8,5,'#6d4c41');
            R(-3,-23,6,4,'#4e342e'); R(-2,-26,4,4,'#5d4037');
            R(-4,-17,8,2,'#ffd54f');
            break;
        }
        case 'reaper': {
            R(-13,-28,2,38,'#5d4037'); R(-13,-28,14,3,'#78909c');
            R(-13,-31,4,6,'#90a4ae'); R(0,-28,2,5,'#607d8b');
            R(-9,-6,18,8,'#1a0a2e'); R(-10,2,20,8,'#0d0520');
            R(-11,10,22,5,'#080315'); R(-6,-6,12,6,'#140820');
            R(-6,-22,12,6,'#2a0040');
            R(-4,-18,8,11,'#dde0d0'); R(-4,-18,8,3,'#c8ccc0');
            R(-3,-14,2,3,'#1a0a2e'); R(1,-14,2,3,'#1a0a2e');
            R(-1,-11,2,2,'#c8ccc0');
            R(-3,-8,2,2,'#dde0d0'); R(-1,-8,2,2,'#dde0d0'); R(1,-8,2,2,'#dde0d0');
            R(-7,-18,3,14,'#2a0040'); R(4,-18,3,14,'#2a0040');
            break;
        }
        case 'fat': {
            R(-8,13,6,3,'#37474f'); R(2,13,6,3,'#37474f');
            R(ll[0]-3,ll[1],ll[2]+2,ll[3],'#455a64'); R(rl[0],rl[1],rl[2]+2,rl[3],'#455a64');
            R(-10,-8,20,16,'#546e7a');
            R(-14,-8,5,3,'#455a64'); R(9,-8,5,3,'#455a64');
            R(-14,-4,5,10,'#455a64'); R(9,-4,5,10,'#455a64');
            R(-8,-14,16,2,'#455a64');
            R(-8,-18,16,8,'#546e7a'); R(-7,-14,14,2,'#1de9b6');
            R(-1,-20,2,6,'#c62828');
            R(-6,-10,12,4,'#455a64');
            break;
        }
        case 'collector': {
            R(-15,-8,5,2,'#795548'); R(-17,-12,9,9,'#90a4ae');
            R(-16,-11,7,7,'#e3f2fd'); R(-14,-10,3,3,'#bbdefb');
            R(-5,12,4,3,'#5d4037'); R(1,12,4,3,'#5d4037');
            R(ll[0],ll[1],ll[2],ll[3],'#1565c0'); R(rl[0],rl[1],rl[2],rl[3],'#1565c0');
            R(-3,-8,6,2,'#ffb74d');
            R(-5,-8,10,16,'#42a5f5');
            R(-8,-4,3,10,'#ffb74d'); R(5,-4,3,10,'#ffb74d');
            R(-5,-18,10,12,'#ffb74d'); R(-5,-18,10,3,'#5d4037');
            R(-4,-12,3,3,'#90a4ae'); R(0,-12,3,3,'#90a4ae'); R(-1,-11,2,1,'#90a4ae');
            R(-3,-11,2,2,'#000'); R(1,-11,2,2,'#000');
            break;
        }
        case 'archer': {
            R(6,-12,4,15,'#795548');
            R(7,-15,1,5,'#a5d6a7'); R(8,-17,1,6,'#a5d6a7'); R(9,-14,1,4,'#a5d6a7');
            R(-16,-14,3,4,'#8d6e63'); R(-17,-10,2,14,'#8d6e63'); R(-16,4,3,4,'#8d6e63');
            R(-14,-10,1,14,'#d4d4aa'); R(-13,-1,18,1,'#a5d6a7');
            R(-5,12,4,3,'#4e342e'); R(1,12,4,3,'#4e342e');
            R(ll[0],ll[1],ll[2],ll[3],'#795548'); R(rl[0],rl[1],rl[2],rl[3],'#795548');
            R(-3,-10,6,2,'#ffb74d');
            R(-5,-8,10,16,'#2e7d32');
            R(-8,-4,3,10,'#2e7d32'); R(5,-4,3,10,'#2e7d32');
            R(-5,-18,10,10,'#ffb74d');
            R(-3,-12,2,2,'#000'); R(1,-12,2,2,'#000');
            R(-7,-18,14,3,'#1b5e20'); R(-4,-24,8,8,'#2e7d32');
            break;
        }
        case 'monsterTamer': {
            R(7,-2,4,2,'#795548'); R(11,0,3,2,'#8d6e63'); R(14,2,3,2,'#795548'); R(17,4,2,2,'#6d4c41');
            R(-9,-18,18,2,'#5d4037'); R(-5,-26,10,10,'#4e342e'); R(-4,-27,8,2,'#795548');
            R(-5,12,4,3,'#4e342e'); R(1,12,4,3,'#4e342e');
            R(ll[0],ll[1],ll[2],ll[3],'#795548'); R(rl[0],rl[1],rl[2],rl[3],'#795548');
            R(-3,-8,5,2,'#ffb74d');
            R(-5,-8,10,16,'#5d4037'); R(-3,-6,6,12,'#3e2723');
            R(-8,-4,3,10,'#6d4c41'); R(5,-4,3,10,'#6d4c41');
            R(-5,-16,10,10,'#ffb74d'); R(-5,-16,10,2,'#5d4037');
            R(-3,-11,2,2,'#000'); R(1,-11,2,2,'#000');
            break;
        }
        case 'fashionModel': {
            // Mic (left hand)
            R(-12,-16,2,14,'#bdbdbd'); R(-13,-20,4,5,'#424242'); R(-14,-22,6,3,'#bdbdbd');
            // Sparkle crosses
            R(-18,-9,1,5,'#ffd700'); R(-20,-7,5,1,'#ffd700');
            R(14,-9,1,5,'#ffd700'); R(12,-7,5,1,'#ffd700');
            // Neck
            R(-3,-8,5,2,'#ffb74d');
            // Dress body
            R(-4,-8,8,18,'#c2185b'); R(-8,4,16,8,'#e91e63'); R(-6,10,12,5,'#c2185b');
            // Arms (slender, skin tone)
            R(-7,-6,3,10,'#ffb74d'); R(4,-6,3,10,'#ffb74d');
            // Shoes
            R(-3,14,3,3,'#c2185b'); R(0,14,3,3,'#c2185b');
            R(-4,17,2,2,'#ad1457'); R(3,17,2,2,'#ad1457');
            // Face
            R(-5,-18,10,12,'#ffb74d');
            // Voluminous purple hair
            R(-6,-20,12,4,'#7b1fa2');
            R(-7,-18,2,4,'#7b1fa2'); R(5,-18,2,4,'#7b1fa2'); // side volume
            R(-8,-25,4,7,'#7b1fa2'); R(4,-25,4,7,'#7b1fa2'); // extra volume
            R(-6,-30,12,6,'#ab47bc'); // top layer
            R(-2,-28,2,6,'#ce93d8'); // highlight streak
            // Eye lashes + eyes
            R(-4,-15,3,2,'#000'); R(1,-15,3,2,'#000'); // lashes
            R(-4,-14,3,3,'#000'); R(1,-14,3,3,'#000'); // eyes
            R(-3,-13,1,1,'#4fc3f7'); R(2,-13,1,1,'#4fc3f7'); // iris highlight
            // Blush + red lips
            R(-5,-12,2,1,'#f8bbd0'); R(3,-12,2,1,'#f8bbd0'); // blush
            R(-3,-10,7,3,'#c2185b'); // lips
            R(-2,-10,5,1,'#f06292'); // upper lip highlight
            break;
        }
        case 'vampire': {
            R(-11,-14,4,10,'#1a0030'); R(7,-14,4,10,'#1a0030');
            R(-8,-6,16,10,'#1a0030'); R(-10,4,20,8,'#0d0020');
            R(-11,12,22,5,'#070010'); R(-5,-6,10,8,'#7b0000');
            R(-4,-8,8,16,'#2d004d');
            R(ll[0],ll[1]+2,ll[2],ll[3]-2,'#0d0020'); R(rl[0],rl[1]+2,rl[2],rl[3]-2,'#0d0020');
            R(-4,14,4,3,'#111'); R(1,14,4,3,'#111');
            R(-2,-8,4,2,'#e8d8f0');
            R(-5,-18,10,12,'#e8d8f0'); R(-5,-18,10,3,'#111');
            R(-3,-12,2,2,'#cc0000'); R(1,-12,2,2,'#cc0000');
            R(-2,-7,1,3,'#fff'); R(1,-7,1,3,'#fff');
            break;
        }
        case 'rogue': {
            R(-12,-14,2,14,'#b0bec5'); R(-13,-7,4,2,'#37474f');
            R(10,-14,2,14,'#b0bec5'); R(9,-7,4,2,'#37474f');
            R(-8,-20,16,16,'#1c262b'); R(-10,-12,20,6,'#263238');
            R(-5,-8,10,16,'#37474f');
            R(-8,-4,3,10,'#263238'); R(5,-4,3,10,'#263238');
            R(ll[0],ll[1],ll[2],ll[3],'#1c262b'); R(rl[0],rl[1],rl[2],rl[3],'#1c262b');
            R(-5,12,4,3,'#111'); R(1,12,4,3,'#111');
            R(-5,-18,10,12,'#ffb74d'); R(-5,-18,10,3,'#1c262b');
            R(-3,-12,2,2,'#00e5ff'); R(1,-12,2,2,'#00e5ff');
            R(-5,-10,10,4,'#263238');
            break;
        }
        case 'wizard': {
            R(-13,-26,2,38,'#5d4037');
            R(-16,-30,8,8,'#40c4ff'); R(-15,-31,6,3,'#80d8ff');
            R(-7,-8,14,18,'#0d47a1'); R(-9,4,18,6,'#1565c0');
            R(-9,-4,2,12,'#0d47a1'); R(7,-4,2,12,'#0d47a1');
            R(-5,-4,2,2,'#40c4ff'); R(-5,-1,6,1,'#40c4ff');
            R(ll[0],ll[1],ll[2]+1,ll[3],'#0a3570'); R(rl[0],rl[1],rl[2]+1,rl[3],'#0a3570');
            R(-4,13,4,3,'#3e2723'); R(0,13,4,3,'#3e2723');
            R(-3,-8,6,2,'#ffb74d'); R(-5,-12,10,8,'#ffb74d');
            R(-3,-10,2,2,'#000'); R(1,-10,2,2,'#000');
            R(-3,-8,7,3,'#e0e0e0');
            R(-9,-12,18,3,'#0d47a1'); R(-7,-22,14,12,'#1565c0');
            R(-5,-30,10,10,'#0d47a1'); R(-3,-34,6,6,'#0a3570');
            R(-1,-28,2,6,'#ffd700'); R(-3,-26,6,2,'#ffd700');
            break;
        }
        case 'gambler': {
            R(9,-2,8,8,'#fff'); R(10,-1,6,6,'#f5f5f5');
            R(11,0,2,2,'#e53935'); R(14,0,2,2,'#e53935');
            R(12,2,2,2,'#e53935'); R(11,4,2,2,'#e53935'); R(14,4,2,2,'#e53935');
            R(-9,-14,18,2,'#111'); R(-6,-24,12,12,'#1a1a1a');
            R(-5,-25,10,3,'#333'); R(-4,-26,8,2,'#ffd700');
            R(-6,-8,12,16,'#b71c1c'); R(-8,4,16,8,'#a31515');
            R(-9,10,18,8,'#b71c1c'); R(-1,-6,2,4,'#ffd700');
            R(-8,-4,2,12,'#b71c1c'); R(6,-4,2,12,'#b71c1c');
            R(ll[0],ll[1],ll[2],ll[3],'#7f0000'); R(rl[0],rl[1],rl[2],rl[3],'#7f0000');
            R(-5,14,4,3,'#111'); R(1,14,4,3,'#111');
            R(-5,-12,10,8,'#ffb74d');
            R(-4,-11,2,2,'#000'); R(1,-11,2,2,'#000');
            R(-3,-7,7,2,'#5d4037');
            break;
        }
        case 'steve': {
            R(9,-14,2,18,'#00bcd4'); R(8,-7,4,2,'#8d6e63'); R(8,-6,2,4,'#795548');
            R(-5,12,4,3,'#795548'); R(1,12,4,3,'#795548');
            R(ll[0],ll[1],ll[2],ll[3],'#607d8b'); R(rl[0],rl[1],rl[2],rl[3],'#607d8b');
            R(-5,-8,10,16,'#3f51b5');
            R(-8,-8,3,16,'#d4956a'); R(5,-8,3,16,'#d4956a');
            R(-5,-20,10,14,'#d4956a'); R(-5,-20,10,2,'#8b6914');
            R(-3,-15,2,2,'#4a2e1c'); R(1,-15,2,2,'#4a2e1c');
            R(0,-12,1,1,'#c4865e'); R(-2,-10,5,2,'#7b4f36');
            break;
        }
        case 'lumberjack': {
            R(9,-10,2,20,'#8d6e63');
            R(11,-12,7,8,'#e53935'); R(11,-14,5,4,'#ef5350'); R(13,-15,4,3,'#b0bec5');
            R(-6,12,5,3,'#3e2723'); R(1,12,5,3,'#3e2723');
            R(ll[0],ll[1],ll[2],ll[3],'#7f0000'); R(rl[0],rl[1],rl[2],rl[3],'#7f0000');
            R(-5,-8,10,16,'#c62828');
            R(-5,-8,5,4,'#b71c1c'); R(0,-4,5,4,'#b71c1c');
            R(-5,0,5,4,'#b71c1c'); R(0,4,5,4,'#b71c1c');
            R(-4,-8,2,8,'#7f0000'); R(2,-8,2,8,'#7f0000');
            R(-8,-4,3,10,'#c62828'); R(5,-4,3,10,'#c62828');
            R(-5,-18,10,10,'#d4956a'); R(-5,-18,10,3,'#4e342e');
            R(-5,-11,10,7,'#5d4037'); R(-6,-9,12,5,'#4e342e');
            R(-3,-15,2,2,'#3e2723'); R(1,-15,2,2,'#3e2723');
            break;
        }
        case 'ninja': {
            R(8,-9,6,2,'#78909c'); R(10,-11,2,6,'#78909c');
            R(8,-11,2,2,'#607d8b'); R(12,-11,2,2,'#607d8b');
            R(-5,12,4,3,'#212121'); R(1,12,4,3,'#212121');
            R(ll[0],ll[1],ll[2],ll[3],'#212121'); R(rl[0],rl[1],rl[2],rl[3],'#212121');
            R(-5,-8,10,16,'#212121');
            R(-8,-4,3,10,'#212121'); R(5,-4,3,10,'#212121');
            R(-5,-18,10,12,'#212121');
            R(-4,-12,8,2,'#00e5ff');
            R(-4,-4,8,2,'#37474f');
            break;
        }
        case 'scientist': {
            R(-12,-8,4,12,'#e3f2fd'); R(-11,-10,3,3,'#bbdefb');
            R(-13,-5,6,2,'#4fc3f7'); R(-12,-4,4,3,'#29b6f6');
            R(-3,-10,6,2,'#ffb74d');
            R(-5,-8,10,16,'#fff'); R(-8,4,16,6,'#f5f5f5');
            R(-5,-8,2,12,'#e0e0e0'); R(3,-8,2,12,'#e0e0e0');
            R(-3,-6,6,10,'#2196f3');
            R(-8,-4,3,10,'#fff'); R(5,-4,3,10,'#fff');
            R(ll[0],ll[1],ll[2],ll[3],'#37474f'); R(rl[0],rl[1],rl[2],rl[3],'#37474f');
            R(-5,12,4,3,'#263238'); R(1,12,4,3,'#263238');
            R(-5,-18,10,10,'#ffb74d'); R(-5,-18,10,3,'#5d4037');
            R(-5,-16,4,3,'#ffeb3b'); R(1,-16,4,3,'#ffeb3b');
            R(-1,-16,2,3,'#fff');
            R(-3,-11,2,2,'#000'); R(1,-11,2,2,'#000');
            break;
        }
        case 'oldMan': {
            R(9,-4,2,22,'#8d6e63'); R(6,-4,5,2,'#6d4c41'); R(6,-6,2,4,'#6d4c41');
            R(-5,13,4,3,'#5d4037'); R(1,13,4,3,'#5d4037');
            R(ll[0],ll[1],ll[2],ll[3],'#455a64'); R(rl[0],rl[1],rl[2],rl[3],'#455a64');
            R(-3,-9,5,2,'#e8b48a');
            R(-4,-9,9,16,'#546e7a');
            R(-7,-5,2,10,'#5d4037'); R(5,-5,2,10,'#5d4037');
            R(-4,-19,9,12,'#e8b48a');
            R(-3,-10,3,1,'#c48b5e'); R(1,-10,3,1,'#c48b5e');
            R(-2,-8,5,1,'#c48b5e');
            R(-2,-14,3,1,'#5d4037'); R(2,-14,3,1,'#5d4037');
            R(-4,-19,9,3,'#e0e0e0');
            R(-5,-17,2,3,'#e0e0e0'); R(5,-17,2,3,'#e0e0e0');
            break;
        }
        case 'robot': {
            R(-1,-28,2,8,'#90a4ae'); R(-3,-29,6,2,'#ffd700');
            R(-6,-24,12,12,'#455a64'); R(-7,-25,14,2,'#37474f');
            R(-5,-20,10,5,'#000');
            R(-4,-19,3,3,'#f44336'); R(1,-19,3,3,'#f44336');
            R(-4,-14,2,2,'#263238'); R(-1,-14,2,2,'#263238'); R(2,-14,2,2,'#263238');
            R(-2,-12,4,6,'#546e7a');
            R(-6,-8,12,16,'#546e7a');
            R(-5,-6,10,2,'#607d8b'); R(-4,-4,4,4,'#4dd0e1');
            R(1,-3,4,5,'#37474f');
            R(-10,-6,4,12,'#455a64'); R(6,-6,4,12,'#455a64');
            R(-10,-6,4,2,'#37474f'); R(6,-6,4,2,'#37474f');
            R(ll[0],ll[1],ll[2]+1,ll[3],'#455a64'); R(rl[0],rl[1],rl[2]+1,rl[3],'#455a64');
            R(-6,12,5,3,'#37474f'); R(1,12,5,3,'#37474f');
            // Laser glow when active
            if (p.robotLaserActive) {
                ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12;
                R(-4,-19,3,3,'#00e5ff'); R(1,-19,3,3,'#00e5ff');
                ctx.shadowBlur = 0;
            }
            // Shutdown flicker
            if (p.isShutdown && state.frame % 6 < 3) ctx.globalAlpha = 0.4;
            break;
        }
        // ── New characters (placeholders until look is defined) ──
        case 'librarian': {
            // Glasses + open book + cardigan
            R(-5,12,4,3,'#3e2723'); R(1,12,4,3,'#3e2723');
            R(ll[0],ll[1],ll[2],ll[3],'#5d4037'); R(rl[0],rl[1],rl[2],rl[3],'#5d4037');
            R(-5,-8,10,16,'#4e342e'); R(-3,-6,6,12,'#3e2723');
            R(-8,-4,3,10,'#6d4c41'); R(5,-4,3,10,'#6d4c41');
            R(-5,-18,10,12,'#d4956a'); R(-5,-18,10,3,'#5d4037');
            R(-4,-12,3,3,'#90a4ae'); R(0,-12,3,3,'#90a4ae'); R(-1,-11,2,1,'#90a4ae');
            R(-3,-11,2,2,'#000'); R(1,-11,2,2,'#000');
            // Book in hand
            R(-12,-4,6,9,'#ffe082'); R(-11,-5,4,2,'#ffd54f'); R(-11,-4,1,9,'#e0c040');
            R(-9,-3,3,7,'#000'); // text lines
            break;
        }
        case 'shopper': {
            // Shopping bag + casual outfit
            R(-13,-4,7,10,'#00acc1'); R(-12,-5,5,3,'#00bcd4');
            R(-5,12,4,3,'#004d40'); R(1,12,4,3,'#004d40');
            R(ll[0],ll[1],ll[2],ll[3],'#006064'); R(rl[0],rl[1],rl[2],rl[3],'#006064');
            R(-5,-8,10,16,'#00838f'); R(-8,-4,3,10,'#00acc1'); R(5,-4,3,10,'#00acc1');
            R(-5,-18,10,12,'#ffb74d'); R(-5,-18,10,3,'#5d4037');
            R(-3,-12,2,2,'#000'); R(1,-12,2,2,'#000');
            // Visor/cap
            R(-6,-18,12,2,'#004d40'); R(-5,-22,10,6,'#00695c');
            break;
        }
        case 'gamer': {
            // Hoodie + controller + headphones
            R(-5,12,4,3,'#1a1a2e'); R(1,12,4,3,'#1a1a2e');
            R(ll[0],ll[1],ll[2],ll[3],'#16213e'); R(rl[0],rl[1],rl[2],rl[3],'#16213e');
            R(-5,-8,10,16,'#1a237e'); R(-8,-4,3,10,'#283593'); R(5,-4,3,10,'#283593');
            R(-5,-18,10,12,'#d4956a'); R(-5,-18,10,3,'#1a1a2e');
            // Headphones
            R(-7,-18,2,6,'#283593'); R(5,-18,2,6,'#283593');
            R(-7,-20,14,3,'#1a237e');
            R(-3,-12,2,2,'#000'); R(1,-12,2,2,'#000');
            // Controller in hand (tiny)
            R(7,-4,8,5,'#37474f'); R(8,-3,2,2,'#f44336'); R(11,-5,2,2,'#4caf50');
            break;
        }
        case 'angel': {
            // White robe + halo + wings
            R(-5,12,4,3,'#f5f5f5'); R(1,12,4,3,'#f5f5f5');
            R(ll[0],ll[1],ll[2],ll[3],'#e0e0e0'); R(rl[0],rl[1],rl[2],rl[3],'#e0e0e0');
            R(-5,-8,10,18,'#fafafa'); R(-8,-4,3,10,'#f5f5f5'); R(5,-4,3,10,'#f5f5f5');
            R(-5,-18,10,12,'#ffe0b2'); R(-5,-18,10,3,'#ffd54f');
            R(-3,-12,2,2,'#5d4037'); R(1,-12,2,2,'#5d4037');
            // Halo
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
            R(-4,-22,8,2,'#ffd700'); ctx.shadowBlur = 0;
            // Wings (white, simplified)
            R(-14,-6,6,12,'#f5f5f5'); R(-16,-4,4,8,'#e0e0e0');
            R(8,-6,6,12,'#f5f5f5'); R(12,-4,4,8,'#e0e0e0');
            break;
        }
        case 'diver': {
            // Wetsuit + flippers + tank
            R(4,-9,5,14,'#01579b'); R(8,-7,2,10,'#0277bd'); // tank
            R(-5,10,5,5,'#4fc3f7'); R(1,10,5,5,'#4fc3f7'); // flippers
            R(ll[0],ll[1],ll[2],ll[3],'#0277bd'); R(rl[0],rl[1],rl[2],rl[3],'#0277bd');
            R(-5,-8,10,16,'#01579b'); R(-8,-4,3,10,'#0288d1'); R(5,-4,3,10,'#0288d1');
            // Mask + face
            R(-5,-18,10,12,'#01579b'); // hood
            R(-4,-14,8,6,'#b3e5fc'); // mask lens
            R(-3,-13,6,4,'#4fc3f7'); // inner lens
            R(-4,-18,8,2,'#0288d1'); // top of hood
            break;
        }
        case 'dinosaur': {
            // Big green body, tail, small arms, no weapon
            R(-6,12,5,3,'#2e7d32'); R(1,12,5,3,'#2e7d32');
            R(ll[0]-2,ll[1],ll[2]+2,ll[3]+2,'#388e3c'); R(rl[0],rl[1],rl[2]+2,rl[3]+2,'#388e3c');
            R(-6,-8,12,18,'#33691e'); // body
            R(-3,-6,6,10,'#43a047'); // belly (lighter)
            R(-10,-6,5,12,'#2e7d32'); R(5,-6,5,12,'#2e7d32'); // arms (stubby)
            // Tail
            R(-8,10,4,6,'#2e7d32'); R(-10,14,3,5,'#33691e'); R(-11,17,2,4,'#2e7d32');
            // Head
            R(-6,-22,12,16,'#33691e');
            R(-7,-24,14,4,'#2e7d32'); // top ridge
            R(-5,-21,4,4,'#ffd600'); R(1,-21,4,4,'#ffd600'); // yellow eyes
            R(-4,-20,2,2,'#000'); R(2,-20,2,2,'#000'); // pupils
            R(-5,-12,10,3,'#2e7d32'); // snout
            R(-4,-12,2,2,'#fff'); R(1,-12,2,2,'#fff'); // teeth
            // Spines (bright)
            R(-2,-26,2,6,'#66bb6a'); R(0,-28,2,8,'#4caf50'); R(2,-26,2,6,'#66bb6a');
            break;
        }
        case 'monsterChar': {
            // Shifting form: visual matches current enemy form
            const mForm = p.monsterForm || 'default';
            if (mForm === 'slime') {
                // Slime form: chunky green blob with player-scale
                ctx.save();
                ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.9;
                ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.ellipse(0, 2, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.ellipse(0, 3, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-3, -1, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(3, -1, 2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = ctx.globalAlpha / 0.9;
                ctx.restore();
            } else if (mForm === 'skeleton') {
                // Skeleton form
                R(-4,12,3,3,'#efebe9'); R(1,12,3,3,'#efebe9');
                R(ll[0],ll[1],ll[2],ll[3],'#d7ccc8'); R(rl[0],rl[1],rl[2],rl[3],'#d7ccc8');
                R(-4,-8,8,16,'#efebe9'); R(-7,-4,3,10,'#efebe9'); R(4,-4,3,10,'#efebe9');
                R(-4,-18,8,12,'#efebe9'); R(-2,-14,4,2,'#000'); R(-1,-10,2,2,'#000');
                R(-3,-8,6,2,'#efebe9');
            } else {
                // Default: hulking purple monster (matches character select)
                R(-6,12,5,3,'#1a0030'); R(1,12,5,3,'#1a0030'); // large feet
                R(ll[0]-2,ll[1],ll[2]+3,ll[3],'#4a148c'); R(rl[0],rl[1],rl[2]+3,rl[3],'#4a148c');
                R(-7,-8,14,18,'#4a148c'); // big body
                R(-9,-4,4,10,'#38006b'); R(5,-4,4,10,'#38006b'); // thick arms
                // Head
                R(-7,-20,14,14,'#5e35b1');
                R(-7,-26,14,8,'#4a148c');
                // Horns
                R(-5,-26,2,6,'#311b92'); R(3,-26,2,6,'#311b92');
                // Glowing purple eyes
                ctx.shadowColor = '#ea80fc'; ctx.shadowBlur = 5;
                R(-4,-14,3,3,'#ea80fc'); R(1,-14,3,3,'#ea80fc');
                ctx.shadowBlur = 0;
                // Fangs
                R(-2,-9,2,3,'#fff'); R(0,-9,2,3,'#fff');
            }
            break;
        }
        case 'blob': {
            const bWobble = Math.sin(state.frame * 0.08) * 1.5;
            // Main blob body (dark green, wobbles slightly)
            ctx.save();
            ctx.fillStyle = '#558b2f';
            ctx.beginPath(); ctx.ellipse(0, 2, 10 + bWobble, 9 - bWobble * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7cb342';
            ctx.beginPath(); ctx.ellipse(0, 1, 7 + bWobble * 0.5, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            // Side bumps / irregular shape
            R(-10,-4,4,8,'#558b2f'); R(6,-4,4,8,'#558b2f');
            R(-9,6,18,5,'#33691e'); // base/bottom mass
            R(-7,-12,14,8,'#558b2f'); // upper mass
            // Side spikes
            R(-12,0,4,4,'#33691e'); R(8,0,4,4,'#33691e');
            // Top spikes
            R(-4,-16,3,6,'#33691e'); R(1,-16,3,6,'#33691e');
            R(-1,-19,2,4,'#2e7b32');
            // Central eye
            R(-4,-8,8,7,'#c5e1a5');
            R(-3,-7,6,5,'#fff');
            R(-1,-6,3,4,'#000');
            R(-1,-5,2,2,'#3e2723');
            // Highlights
            R(-6,-12,4,2,'#aed581'); R(2,-12,4,2,'#aed581');
            break;
        }
        case 'demon': {
            // Boots (dark)
            R(-5,12,4,3,'#1a0000'); R(1,12,4,3,'#1a0000');
            // Legs (dark crimson)
            R(ll[0],ll[1],ll[2],ll[3],'#7f0000'); R(rl[0],rl[1],rl[2],rl[3],'#7f0000');
            // Body
            R(-5,-8,10,16,'#b71c1c');
            // Arms
            R(-8,-4,3,10,'#c62828'); R(5,-4,3,10,'#c62828');
            // Tail (curls right from lower body)
            R(6,6,4,2,'#b71c1c'); R(9,8,3,2,'#c62828'); R(11,10,2,3,'#b71c1c');
            // Bat wings
            R(-16,-10,8,14,'#3a0000'); R(-18,-8,4,9,'#2a0000');
            R(8,-10,8,14,'#3a0000'); R(14,-8,4,9,'#2a0000');
            R(-14,-10,4,2,'#7f0000'); R(10,-10,4,2,'#7f0000'); // wing membrane highlight
            // Face (bright red skin)
            R(-5,-18,10,12,'#ef5350');
            // Glowing orange eyes
            ctx.shadowColor = '#ff6f00'; ctx.shadowBlur = 6;
            R(-3,-13,2,2,'#ff6d00'); R(1,-13,2,2,'#ff6d00');
            ctx.shadowBlur = 0;
            // Grin
            R(-3,-9,6,2,'#7f0000'); R(-2,-9,1,1,'#ef5350'); R(1,-9,1,1,'#ef5350');
            // Horns (curved up from head)
            R(-4,-22,2,6,'#4a0000'); R(-5,-24,2,3,'#3a0000');
            R(2,-22,2,6,'#4a0000'); R(3,-24,2,3,'#3a0000');
            break;
        }
        case 'alien': {
            // Dark feet
            R(-5,12,4,3,'#00251a'); R(1,12,4,3,'#00251a');
            // Thin legs
            R(-4,8,2,6,'#004d40'); R(2,8,2,6,'#004d40');
            // Narrow body
            R(-4,-8,8,16,'#00695c');
            // Thin arms
            R(-7,-4,3,10,'#00897b'); R(4,-4,3,10,'#00897b');
            // Large dome head
            R(-7,-22,14,16,'#00897b');
            R(-8,-20,16,4,'#00695c');
            // Large black eyes with teal pupils
            R(-5,-18,4,5,'#000'); R(1,-18,4,5,'#000');
            R(-4,-17,2,3,'#1de9b6'); R(2,-17,2,3,'#1de9b6');
            break;
        }
        case 'dragon': {
            // Feet (claws)
            R(-7,12,5,3,'#7f0000'); R(2,12,5,3,'#7f0000');
            // Legs (thick red, like dino)
            R(ll[0]-2,ll[1],ll[2]+2,ll[3]+2,'#c62828'); R(rl[0],rl[1],rl[2]+2,rl[3]+2,'#c62828');
            // Tail
            R(-8,10,4,6,'#b71c1c'); R(-10,14,3,5,'#c62828'); R(-11,17,2,4,'#b71c1c');
            // Bat wings (large, dark red-black)
            R(-20,-12,10,18,'#3a0000'); R(-23,-8,5,12,'#2a0000');
            R(10,-12,10,18,'#3a0000'); R(18,-8,5,12,'#2a0000');
            R(-18,-12,6,2,'#7f0000'); R(10,-12,6,2,'#7f0000'); // wing highlights
            // Body (stocky red, like dino)
            R(-6,-8,12,18,'#7f0000');
            // Stubby arms
            R(-10,-6,5,12,'#b71c1c'); R(5,-6,5,12,'#b71c1c');
            // Dragon head (red, like dino scaled up)
            R(-6,-22,12,16,'#b71c1c');
            R(-7,-24,14,4,'#c62828'); // top ridge
            // Glowing orange eyes
            ctx.shadowColor = '#ff6f00'; ctx.shadowBlur = 7;
            R(-4,-20,2,3,'#ff6d00'); R(2,-20,2,3,'#ff6d00');
            ctx.shadowBlur = 0;
            R(-5,-12,10,4,'#7f0000'); // snout
            // Horns
            R(-4,-26,2,6,'#4a0000'); R(-5,-28,2,3,'#3a0000');
            R(2,-26,2,6,'#4a0000'); R(3,-28,2,3,'#3a0000');
            // Dorsal spines (red)
            R(-2,-26,2,6,'#c62828'); R(0,-28,2,8,'#b71c1c'); R(2,-26,2,6,'#c62828');
            break;
        }
        case 'rich': {
            // Fancy shoes
            R(-5,12,4,3,'#111'); R(1,12,4,3,'#111');
            // Pinstripe suit trousers
            R(ll[0],ll[1],ll[2],ll[3],'#212121'); R(rl[0],rl[1],rl[2],rl[3],'#212121');
            R(ll[0]+1,ll[1],1,ll[3],'#333'); R(rl[0]+1,rl[1],1,rl[3],'#333');
            // Dark suit jacket
            R(-5,-8,10,16,'#212121');
            // White shirt + gold tie
            R(-2,-6,4,10,'#f5f5f5');
            R(-1,-5,2,8,'#ffd700');
            // Arms + white cuffs
            R(-8,-4,3,10,'#212121'); R(5,-4,3,10,'#212121');
            R(-8,4,3,2,'#f5f5f5'); R(5,4,3,2,'#f5f5f5');
            // Face
            R(-5,-18,10,12,'#ffb74d');
            R(-3,-12,2,2,'#5d4037'); R(1,-12,2,2,'#5d4037');
            // Moustache
            R(-3,-8,6,2,'#4a2f18');
            // Monocle (gold ring, right eye)
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(2, -11, 2.5, 0, Math.PI * 2); ctx.stroke();
            R(3,-9,1,3,'#ffd700'); // monocle chain
            // Top hat
            R(-7,-20,14,2,'#111');    // brim
            R(-5,-34,10,16,'#1a1a1a'); // crown
            R(-4,-32,8,2,'#333');      // band
            R(-3,-31,6,2,'#ffd700');   // gold band
            break;
        }
        case 'witch': {
            // Boots (black, pointed)
            R(-5,12,4,4,'#1a1a1a'); R(1,12,4,4,'#1a1a1a');
            R(-7,13,3,3,'#1a1a1a'); R(3,13,3,3,'#1a1a1a'); // pointy boot tips
            // Long purple robe legs (covers legs)
            R(-6,-8,12,22,'#6a1b9a');
            // Robe body
            R(-6,-22,12,16,'#4a148c');
            // Belt (gold clasp)
            R(-6,-8,12,3,'#7b1fa2');
            R(-2,-8,4,3,'#ffd700');
            // Arms (robe sleeves)
            R(-9,-18,4,14,'#4a148c'); R(5,-18,4,14,'#4a148c');
            // Hands (pale)
            R(-9,-4,4,4,'#eeeeee'); R(5,-4,4,4,'#eeeeee');
            // Face
            R(-5,-30,10,10,'#eeeeee');
            // Long nose
            R(0,-24,2,4,'#ddd');
            // Eyes (glowing green)
            ctx.fillStyle = '#00e676'; ctx.fillRect(-3,-28,2,2); ctx.fillRect(1,-28,2,2);
            // Pointy hat
            R(-6,-34,12,6,'#1a1a1a');   // brim
            // Cone
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath(); ctx.moveTo(-5,-34); ctx.lineTo(5,-34); ctx.lineTo(1,-52); ctx.closePath(); ctx.fill();
            // Hat band (purple buckle)
            R(-4,-36,8,2,'#7b1fa2');
            R(-1,-37,2,2,'#ffd700');
            // Broomstick on back
            ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(7,-20); ctx.lineTo(7,14); ctx.stroke();
            ctx.fillStyle = '#f9a825'; ctx.fillRect(4,12,6,6); // bristles
            ctx.fillStyle = '#f57f17'; ctx.fillRect(3,14,8,4);
            break;
        }
        case 'pirate': {
            // Wooden peg leg (right) + boot (left)
            R(-5,10,4,5,'#8b0000'); R(1,10,3,5,'#8d6e63'); // left boot, right peg
            R(1,13,3,3,'#a0522d'); // peg base
            // Torn striped trousers
            R(ll[0],ll[1],ll[2],ll[3],'#1a237e'); R(rl[0],rl[1],rl[2],rl[3],'#1a237e');
            // Horizontal stripes on pants
            for (let sr = 0; sr < 3; sr++) { R(-6, 0 + sr*3, 12, 1, '#e3f2fd'); }
            // Torn shirt body (cream + rips)
            R(-5,-10,10,16,'#fffde7');
            // Horizontal shirt stripes
            R(-5,-7,10,2,'#e53935'); R(-5,-1,10,2,'#e53935'); R(-5,5,10,2,'#e53935');
            // Tattered edges
            R(-7,-8,2,4,'#fffde7'); R(5,-8,2,4,'#fffde7');
            // Arms
            R(-8,-6,3,12,'#fffde7'); R(5,-6,3,12,'#fffde7');
            // Hook hand (left)
            ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-7,4); ctx.quadraticCurveTo(-12,4,-12,0); ctx.stroke();
            // Face (rough, tanned)
            R(-5,-22,10,12,'#d2691e');
            // Eyepatch (left)
            R(-5,-18,5,4,'#1a1a1a');
            ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-5,-16); ctx.lineTo(0,-16); ctx.stroke();
            // Right eye
            R(1,-18,2,2,'#222');
            // Stubble / scar
            R(-4,-12,8,2,'#8b4513');
            R(-1,-15,1,3,'#8b0000'); // scar
            // Bandana (red)
            R(-6,-24,12,5,'#c62828');
            R(-7,-23,3,3,'#c62828'); R(4,-23,3,3,'#c62828'); // sides
            R(-5,-24,10,2,'#e53935'); // top fold
            // Bandana knot (right side)
            R(5,-22,4,4,'#b71c1c');
            R(6,-25,3,3,'#b71c1c');
            break;
        }
        case 'stickman': {
            // Stick figure: black lines, white head — works with stickWorld B&W filter
            R(-3,-28,6,10,'#000'); R(-7,-18,14,2,'#000'); // hat crown + brim
            R(-5,-17,10,10,'#000'); R(-4,-16,8,8,'#fff'); // head border + fill
            R(-3,-14,2,2,'#000'); R(1,-14,2,2,'#000');    // eyes
            R(-2,-10,5,1,'#000');                          // mouth
            R(-1,-7,2,14,'#000');                          // spine
            R(-8,-3,7,2,'#000'); R(1,-3,7,2,'#000');      // arms
            R(7,-12,2,9,'#000');                           // stick weapon
            if (af === 0) {
                R(-3,7,2,8,'#000'); R(-5,14,6,2,'#000');  // left leg + foot
                R(1,9,2,6,'#000');  R(0,14,4,2,'#000');   // right leg + foot
            } else {
                R(-3,9,2,6,'#000'); R(-5,14,4,2,'#000');
                R(1,7,2,8,'#000');  R(0,14,6,2,'#000');
            }
            break;
        }
        case 'villager': {
            R(-5,14,5,3,'#4e342e'); R(1,14,5,3,'#4e342e');
            R(ll[0],ll[1],ll[2],ll[3],'#6d4c41'); R(rl[0],rl[1],rl[2],rl[3],'#6d4c41');
            R(-6,-8,12,15,'#c8a96e'); R(-3,-4,6,12,'#e8d5a3');
            R(-9,-6,4,10,'#c8a96e'); R(6,-6,4,10,'#c8a96e');
            R(10,-20,2,26,'#8d6e63');
            R(8,-20,2,5,'#b0bec5'); R(10,-22,2,5,'#b0bec5'); R(12,-20,2,5,'#b0bec5');
            R(-4,-20,8,12,'#c68642');
            R(-5,-24,10,6,'#5d4037'); R(-6,-22,2,4,'#5d4037'); R(4,-22,2,4,'#5d4037');
            R(-3,-16,2,2,'#3e2723'); R(1,-16,2,2,'#3e2723');
            R(-4,-18,4,1,'#3e2723'); R(0,-18,4,1,'#3e2723');
            break;
        }
        case 'sailor': {
            R(-6,14,6,4,'#e0e0e0'); R(1,14,6,4,'#e0e0e0');
            R(ll[0],ll[1],ll[2],ll[3],'#e0e0e0'); R(rl[0],rl[1],rl[2],rl[3],'#e0e0e0');
            R(-6,-8,12,15,'#1a237e');
            R(-4,-8,3,5,'#e0e0e0'); R(1,-8,3,5,'#e0e0e0'); R(-2,-4,4,3,'#e0e0e0');
            R(-9,-6,4,10,'#1a237e'); R(6,-6,4,10,'#1a237e');
            R(10,-18,2,26,'#8d6e63');
            R(-4,-20,8,12,'#d4956a');
            R(-6,-24,12,5,'#e0e0e0'); R(-5,-26,10,3,'#e0e0e0'); R(-8,-22,16,2,'#1a237e');
            R(-3,-16,2,2,'#3e2723'); R(1,-16,2,2,'#3e2723');
            R(-2,-12,4,1,'#a0522d');
            break;
        }
        case 'engineer': {
            R(-5,14,5,3,'#3e2723'); R(1,14,5,3,'#3e2723');
            R(ll[0],ll[1],ll[2],ll[3],'#455a64'); R(rl[0],rl[1],rl[2],rl[3],'#455a64');
            R(-6,-8,12,15,'#78909c');
            R(-6,-8,4,15,'#ff6f00'); R(2,-8,4,15,'#ff6f00');
            R(-9,-6,4,10,'#78909c'); R(6,-6,4,10,'#78909c');
            R(10,-18,3,22,'#607d8b'); R(8,-18,7,3,'#455a64'); R(8,-20,7,3,'#455a64');
            R(-4,-20,8,12,'#c68642');
            R(-6,-24,12,5,'#fdd835'); R(-7,-24,14,3,'#f9a825'); R(-5,-30,10,8,'#fdd835');
            R(-3,-16,2,2,'#37474f'); R(1,-16,2,2,'#37474f');
            break;
        }
        case 'astronaut': {
            R(-6,14,6,4,'#e0e0e0'); R(1,14,6,4,'#e0e0e0');
            R(ll[0],ll[1],ll[2],ll[3],'#f5f5f5'); R(rl[0],rl[1],rl[2],rl[3],'#f5f5f5');
            R(-7,-8,14,13,'#f5f5f5'); R(-4,-6,8,7,'#90a4ae');
            R(-3,-5,2,2,'#ef5350'); R(1,-5,2,2,'#64b5f6');
            R(-11,-6,5,10,'#e0e0e0'); R(7,-6,5,10,'#e0e0e0');
            R(-11,3,5,3,'#9e9e9e'); R(7,3,5,3,'#9e9e9e');
            R(12,-4,10,5,'#78909c'); R(20,-6,4,9,'#546e7a');
            R(-8,-24,16,17,'#eeeeee'); R(-7,-26,14,4,'#e0e0e0');
            R(-5,-22,10,8,'#ffd54f');
            ctx.globalAlpha = 0.5; R(-5,-22,10,8,'#ff8f00'); ctx.globalAlpha = 1;
            R(-5,-10,2,2,'#1565c0'); R(-3,-10,2,2,'#f44336');
            break;
        }
        case 'commander': {
            R(-5,14,5,3,'#212121'); R(1,14,5,3,'#212121');
            R(ll[0],ll[1],ll[2],ll[3],'#33691e'); R(rl[0],rl[1],rl[2],rl[3],'#33691e');
            R(-6,-8,12,15,'#558b2f');
            R(-5,-8,1,15,'#ffd700'); R(4,-8,1,15,'#ffd700');
            R(-4,-4,6,2,'#f44336'); R(-4,-2,6,2,'#2196f3'); R(-4,0,6,2,'#ffeb3b');
            R(-9,-6,4,10,'#558b2f'); R(6,-6,4,10,'#558b2f');
            R(-9,-6,4,2,'#ffd700'); R(6,-6,4,2,'#ffd700');
            R(10,-8,4,4,'#b0bec5'); R(13,-10,6,8,'#90a4ae'); R(19,-12,4,12,'#78909c');
            R(-4,-20,8,12,'#c68642');
            R(-7,-22,14,2,'#212121'); R(-5,-30,10,10,'#33691e'); R(-6,-30,12,2,'#ffd700');
            R(-3,-16,2,2,'#3e2723'); R(1,-16,2,2,'#3e2723');
            R(-3,-13,6,2,'#5d4037');
            break;
        }
        case 'caveman': {
            R(-7,14,7,4,'#c68642'); R(1,14,7,4,'#c68642');
            R(ll[0],ll[1],ll[2],ll[3],'#c68642'); R(rl[0],rl[1],rl[2],rl[3],'#c68642');
            R(-8,-8,16,13,'#e65100'); R(-6,-6,4,4,'#bf360c'); R(2,-2,4,4,'#bf360c');
            R(-12,-6,5,12,'#c68642'); R(8,-6,5,12,'#c68642');
            R(13,-16,5,22,'#5d4037'); R(11,-18,9,6,'#4e342e'); R(10,-20,11,4,'#3e2723');
            R(-5,-20,10,12,'#c68642'); R(-4,-12,8,4,'#d4956a');
            R(-6,-24,12,6,'#4e342e'); R(-7,-22,3,4,'#3e2723'); R(4,-22,3,4,'#3e2723');
            R(-3,-18,2,2,'#3e2723'); R(1,-18,2,2,'#3e2723');
            R(-4,-20,8,2,'#4e342e');
            R(-8,-8,3,2,'#eeeeee'); R(6,-8,3,2,'#eeeeee');
            break;
        }
        case 'clown': {
            R(-9,14,10,5,'#f44336'); R(0,14,10,5,'#f44336');
            R(ll[0],ll[1],ll[2],ll[3],'#ce93d8'); R(rl[0],rl[1],rl[2],rl[3],'#ce93d8');
            R(-5,8,5,2,'#80cbc4'); R(1,8,5,2,'#80cbc4');
            R(-5,12,5,2,'#80cbc4'); R(1,12,5,2,'#80cbc4');
            R(-7,-8,14,15,'#fff9c4');
            R(-5,-6,3,3,'#f44336'); R(2,-6,3,3,'#2196f3');
            R(-4,-1,3,3,'#4caf50'); R(2,1,3,3,'#ff9800');
            R(-5,5,3,3,'#9c27b0'); R(2,4,3,3,'#f44336');
            R(-8,-8,16,4,'#e91e63'); R(-9,-10,18,3,'#f48fb1');
            R(-11,-4,4,10,'#fff9c4'); R(8,-4,4,10,'#fff9c4');
            R(12,-16,3,22,'#f44336'); R(10,-20,7,7,'#ff1744');
            R(-5,-20,10,12,'#fafafa');
            R(-8,-26,16,8,'#ce93d8');
            R(-9,-22,4,4,'#ef9a9a'); R(5,-22,4,4,'#80cbc4');
            R(-10,-20,3,4,'#fff176'); R(7,-20,3,4,'#a5d6a7');
            R(-2,-16,4,4,'#f44336'); R(-1,-15,2,2,'#ef9a9a');
            R(-6,-20,5,5,'#1a237e'); R(1,-20,5,5,'#1a237e');
            R(-5,-19,2,2,'#fff'); R(2,-19,2,2,'#fff');
            R(-5,-12,2,2,'#d32f2f'); R(-3,-11,7,2,'#d32f2f'); R(4,-12,2,2,'#d32f2f');
            break;
        }
        case 'bob': {
            R(-6,14,6,4,'#5d4037'); R(1,14,6,4,'#5d4037');
            R(ll[0],ll[1],ll[2],ll[3],'#1565c0'); R(rl[0],rl[1],rl[2],rl[3],'#1565c0');
            R(-7,-8,14,15,'#9e9e9e');
            R(-11,-4,4,10,'#c68642'); R(8,-4,4,10,'#c68642');
            R(-5,-20,10,12,'#c68642');
            R(-6,-24,12,6,'#5d4037');
            R(-4,-16,2,2,'#212121'); R(2,-16,2,2,'#212121');
            R(-3,-12,6,2,'#5d4037');
            ctx.fillStyle = '#ffb300'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            ctx.fillText('?', 0, -26); ctx.textAlign = 'left';
            break;
        }
        case 'youtuber': {
            R(-7,14,7,4,'#f44336'); R(1,14,7,4,'#f44336');
            R(ll[0],ll[1],ll[2],ll[3],'#1565c0'); R(rl[0],rl[1],rl[2],rl[3],'#1565c0');
            R(-7,-8,14,15,'#e53935');
            R(-3,-3,7,4,'#fff'); R(-1,-2,3,3,'#e53935');
            R(-11,-4,4,10,'#ffccbc'); R(8,-4,4,10,'#ffccbc');
            R(11,-22,2,28,'#9e9e9e'); R(7,-26,10,7,'#424242'); R(8,-25,8,5,'#29b6f6');
            R(-12,-41,24,3,'#ffd600'); R(-12,-38,3,9,'#ffd600'); R(9,-38,3,9,'#ffd600'); R(-12,-30,24,3,'#ffd600');
            R(-5,-20,10,12,'#ffccbc');
            R(-6,-26,12,8,'#212121'); R(-7,-23,3,5,'#f44336'); R(-4,-27,10,3,'#212121');
            R(-4,-17,3,1,'#5d4037'); R(1,-17,3,1,'#5d4037');
            R(-4,-15,2,2,'#5d4037'); R(2,-15,2,2,'#5d4037');
            R(-3,-11,7,2,'#c2185b');
            break;
        }
        case 'koolKat': {
            const kc = '#fdd835';
            R(-7,14,7,5,kc); R(1,14,7,5,kc);
            R(ll[0],ll[1],ll[2],ll[3],kc); R(rl[0],rl[1],rl[2],rl[3],kc);
            R(-7,-8,14,15,'#f9a825'); R(-5,-6,10,11,'#f57f17');
            R(-11,-4,4,10,kc); R(8,-4,4,10,kc);
            R(-6,-20,12,12,kc);
            R(-7,-26,4,7,kc); R(3,-26,4,7,kc);
            R(-6,-25,2,5,'#f48fb1'); R(4,-25,2,5,'#f48fb1');
            R(-11,-18,2,3,'#000'); R(9,-18,2,3,'#000');
            R(-10,-16,8,6,'#000'); R(-12,-16,2,6,'#000');
            R(2,-16,8,6,'#000'); R(10,-16,2,6,'#000');
            R(-2,-14,4,4,'#000');
            R(-13,-17,2,2,'#000'); R(12,-17,4,2,'#000');
            R(-10,-16,2,2,'#fff'); R(-6,-16,2,2,'#fff');
            R(-8,-14,2,2,'#fff'); R(-4,-14,2,2,'#fff');
            R(3,-16,2,2,'#fff'); R(7,-16,2,2,'#fff');
            R(5,-14,2,2,'#fff'); R(9,-14,2,2,'#fff');
            R(-1,-10,2,2,'#f06292');
            R(-14,-12,7,1,kc); R(-14,-10,7,1,kc); R(7,-12,7,1,kc); R(7,-10,7,1,kc);
            break;
        }
        case 'cowboy': {
            const cc2 = '#c68642';
            R(-7,14,7,5,'#5d4037'); R(1,14,7,5,'#5d4037');
            R(-9,17,2,2,'#ffd600'); R(8,17,2,2,'#ffd600');
            R(ll[0],ll[1],ll[2],ll[3],'#1565c0'); R(rl[0],rl[1],rl[2],rl[3],'#1565c0');
            R(-7,-8,14,15,'#a1887f'); R(-5,-8,4,12,'#795548'); R(2,-8,3,12,'#795548');
            R(-11,-4,4,10,cc2); R(8,-4,4,10,cc2);
            R(10,-8,9,2,'#a1887f'); R(10,-6,2,7,'#a1887f'); R(17,-6,2,7,'#a1887f'); R(10,1,9,2,'#a1887f'); R(14,-8,2,7,'#a1887f');
            R(-16,-4,6,3,'#616161'); R(-15,-7,4,4,'#424242');
            R(-5,-20,10,12,cc2);
            R(-12,-22,24,4,'#5d4037'); R(-7,-32,14,11,'#5d4037'); R(-8,-23,16,2,'#795548');
            R(-4,-16,2,2,'#212121'); R(2,-16,2,2,'#212121');
            R(-4,-11,8,3,'#4e342e');
            break;
        }
        case 'janitor': {
            const jc = '#c68642';
            R(-6,14,6,4,'#424242'); R(1,14,6,4,'#424242');
            R(ll[0],ll[1],ll[2],ll[3],'#1a237e'); R(rl[0],rl[1],rl[2],rl[3],'#1a237e');
            R(-7,-8,14,15,'#1a237e'); R(-6,-3,12,2,'#1565c0');
            R(-11,-4,4,10,jc); R(8,-4,4,10,jc);
            R(10,-24,3,30,'#8d6e63'); R(7,-24,9,5,'#cfd8dc'); R(5,-22,13,3,'#cfd8dc'); R(7,-20,9,3,'#bdbdbd');
            R(-16,4,8,9,'#ffd600'); R(-17,3,10,2,'#f9a825'); R(-15,4,2,9,'#fbc02d');
            R(-5,-20,10,12,jc);
            R(-8,-22,16,4,'#9e9e9e'); R(-6,-28,12,7,'#757575');
            R(-4,-16,2,2,'#212121'); R(2,-16,2,2,'#212121');
            R(-3,-12,6,2,'#5d4037');
            break;
        }
        case 'baby': {
            const bbc = '#ffccbc';
            R(-5,14,5,4,bbc); R(1,14,5,4,bbc);
            R(ll[0],ll[1],ll[2],ll[3],'#b3e5fc'); R(rl[0],rl[1],rl[2],rl[3],'#b3e5fc');
            R(-6,-2,12,16,'#b3e5fc'); R(-5,-10,10,9,'#b3e5fc');
            R(-4,-4,8,5,'#fff'); R(-1,-1,2,2,'#e0f7fa');
            R(-9,-6,4,8,bbc); R(6,-6,4,8,bbc);
            R(9,-14,3,16,'#a1887f'); R(7,-18,7,6,'#ef9a9a');
            R(-7,-22,14,14,bbc); R(-2,-24,4,4,'#ffb74d');
            R(-6,-20,5,5,'#212121'); R(1,-20,5,5,'#212121');
            R(-5,-19,2,2,'#fff'); R(2,-19,2,2,'#fff');
            R(-3,-12,6,3,'#ef9a9a'); R(-2,-12,4,2,'#fff');
            break;
        }
        case 'rubixCuber': {
            const rc = '#c68642';
            R(-6,14,6,4,'#424242'); R(1,14,6,4,'#424242');
            R(ll[0],ll[1],ll[2],ll[3],'#1565c0'); R(rl[0],rl[1],rl[2],rl[3],'#1565c0');
            R(-7,-8,14,15,'#eeeeee');
            R(-11,-4,4,10,rc); R(8,-4,4,10,rc);
            const cubeX = -9, cubeY = -16;
            const cColors2 = ['#f44336','#1565c0','#2e7d32'];
            const cubeGrid2 = [[0,1,2],[2,0,1],[1,2,0]];
            for (let cr2 = 0; cr2 < 3; cr2++) {
                for (let cc3 = 0; cc3 < 3; cc3++) {
                    R(cubeX + cc3*6, cubeY + cr2*6, 5, 5, cColors2[cubeGrid2[cr2][cc3]]);
                }
            }
            R(-5,-20,10,12,rc);
            R(-6,-24,12,5,'#5d4037');
            R(-4,-16,2,2,'#212121'); R(2,-16,2,2,'#212121');
            R(-3,-12,6,2,'#5d4037');
            break;
        }
        case 'paleontologist': {
            const pac = '#c68642';
            R(-7,14,7,5,'#795548'); R(1,14,7,5,'#795548');
            R(ll[0],ll[1],ll[2],ll[3],'#c8b560'); R(rl[0],rl[1],rl[2],rl[3],'#c8b560');
            R(-7,-8,14,15,'#efebe9'); R(-7,-8,4,15,'#e0e0e0'); R(4,-8,3,15,'#e0e0e0');
            R(-11,-4,4,10,pac); R(8,-4,4,10,pac);
            R(10,-26,3,30,'#a1887f'); R(7,-30,9,5,'#e0d5b5'); R(7,-26,3,4,'#e0d5b5'); R(15,-26,3,4,'#e0d5b5');
            R(-20,-8,12,12,'#9e9e9e'); R(-19,-7,10,10,'#b3e5fc'); R(-15,4,3,5,'#795548');
            R(-5,-20,10,12,pac);
            R(-10,-22,20,4,'#8d6e63'); R(-7,-30,14,9,'#6d4c41');
            R(-7,-19,6,6,'#424242'); R(-6,-18,4,4,'#b3e5fc');
            R(1,-19,6,6,'#424242'); R(2,-18,4,4,'#b3e5fc'); R(-1,-17,2,2,'#424242');
            R(-3,-12,6,2,'#5d4037');
            break;
        }
        default: {
            // Fallback: simple colored knight
            R(-5,12,4,3,'#3e2723'); R(1,12,4,3,'#3e2723');
            R(ll[0],ll[1],ll[2],ll[3],'#555'); R(rl[0],rl[1],rl[2],rl[3],'#555');
            R(-5,-8,10,16,'#8b0000'); R(-8,-4,3,10,'#78909c'); R(5,-4,3,10,'#78909c');
            R(-5,-14,10,10,'#546e7a'); R(-3,-10,6,2,'#1de9b6');
            R(-1,-16,2,4,'#8b0000');
        }
    }
}

function drawPlayer() {
    const px = state.player.x - state.camera.x, py = state.player.y - state.camera.y, p = state.player;
    ctx.save(); ctx.translate(px, py);
    if (p.ninjaInvisible) ctx.globalAlpha = 0.28; // Ninja: translucent to player while dashing
    if (p.sizeScale && p.sizeScale !== 1) ctx.scale(p.sizeScale, p.sizeScale);

    // Boat hull when on water
    if (isOnWater(p.x, p.y)) {
        const bob = Math.sin(state.frame * 0.08) * 1.5;
        ctx.save(); ctx.translate(0, bob);
        ctx.fillStyle = '#8B4513'; ctx.fillRect(-14, 8, 28, 10); // hull planks
        ctx.fillStyle = '#A0522D'; ctx.fillRect(-13, 8, 26, 3);  // lighter top plank
        ctx.fillStyle = '#6B3410'; ctx.fillRect(-14, 15, 28, 3); // dark bottom
        ctx.fillStyle = '#5d3a1a'; ctx.fillRect(-16, 12, 5, 6); ctx.fillRect(11, 12, 5, 6); // bow/stern
        // Water splash ripple
        ctx.strokeStyle = `rgba(100,180,255,${0.4 + Math.sin(state.frame * 0.1) * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 18, 18, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    } else {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-8, 10, 16, 4); // shadow
    }

    // ─── CHARACTER BODY ───
    const skin = persist.selectedSkin || 'default';
    if (!p.character || p.character === 'knight') {
        // ── Knight: full armor-aware rendering + skin support ──
        let skinBodyCol = null, skinLegCol = null, skinBootCol = null;
        if (skin === 'richestMan')   { skinBodyCol = '#c9a227'; skinLegCol = '#a18a00'; skinBootCol = '#b8860b'; }
        else if (skin === 'deathDefied') { skinBodyCol = '#050510'; skinLegCol = '#050510'; skinBootCol = '#0a0a20'; }
        else if (skin === 'steve')   { skinBodyCol = '#1565c0'; skinLegCol = '#4a148c'; skinBootCol = '#3e2723'; }
        else if (skin === 'speedDemon') { skinBodyCol = '#7f0000'; skinLegCol = '#4a0000'; skinBootCol = '#3a0000'; }
        else if (skin === 'shadowSlayer') { skinBodyCol = '#1a0030'; skinLegCol = '#0d0020'; skinBootCol = '#0d0020'; }
        else if (skin === 'mrBeast') { skinBodyCol = '#0d1b3e'; skinLegCol = '#0d1b3e'; skinBootCol = '#3e2723'; }
        const chestId = p.armor?.chest;
        const chestColBase = chestId === 'chainmail' ? '#9e9e9e' : chestId === 'spiked_plate' ? '#37474f' : chestId === 'mage_robe' ? '#7e57c2' : '#8b0000';
        const chestCol = skinBodyCol || chestColBase;
        ctx.fillStyle = chestCol; ctx.fillRect(-6, -8, 12, 16);
        ctx.fillStyle = skinBodyCol ? skinBodyCol : (chestId === 'mage_robe' ? '#5c35a0' : '#6a0000'); ctx.fillRect(-5, 6, 10, 6 + Math.sin(state.frame * 0.1) * 2);
        if (chestId === 'spiked_plate' && !skinBodyCol) { ctx.fillStyle = '#90a4ae'; for (let sp=0;sp<3;sp++) { ctx.fillRect(-4+sp*4, -10, 2, 3); } }
        if (chestId === 'mage_robe' && !skinBodyCol) { ctx.fillStyle = '#ce93d8'; ctx.fillRect(-1, -4, 2, 8); ctx.fillRect(-4, -1, 8, 2); }
        const legId = p.armor?.leggings;
        const legColBase = legId === 'iron_greaves' ? '#78909c' : legId === 'spiky_tassets' ? '#546e7a' : legId === 'shadow_leggings' ? '#1a1a1a' : '#555';
        const legCol = skinLegCol || legColBase;
        if (p.animFrame === 0) { ctx.fillStyle = legCol; ctx.fillRect(-4, 8, 3, 6); ctx.fillRect(1, 10, 3, 4); }
        else { ctx.fillStyle = legCol; ctx.fillRect(-4, 10, 3, 4); ctx.fillRect(1, 8, 3, 6); }
        if (legId === 'spiky_tassets' && !skinLegCol) { ctx.fillStyle = '#90a4ae'; ctx.fillRect(-5, 7, 2, 2); ctx.fillRect(3, 7, 2, 2); }
        const bootId = p.armor?.boots;
        const bootColBase = bootId === 'iron_boots' ? '#78909c' : bootId === 'mercury_boots' ? '#b0bec5' : bootId === 'spiked_boots' ? '#455a64' : '#3e2723';
        const bootCol = skinBootCol || bootColBase;
        ctx.fillStyle = bootCol; ctx.fillRect(-5, 12, 4, 3); ctx.fillRect(1, 12, 4, 3);
        if (bootId === 'spiked_boots') { ctx.fillStyle = '#90a4ae'; ctx.fillRect(-6, 14, 2, 2); ctx.fillRect(4, 14, 2, 2); }
        if (chestId === 'chainmail') { ctx.fillStyle = 'rgba(180,180,200,0.35)'; for (let r=0;r<3;r++) for (let c2=0;c2<2;c2++) ctx.fillRect(-5+c2*6, -6+r*5, 4, 3); }
        if (!skinBodyCol) {
            ctx.fillStyle = '#78909c'; ctx.fillRect(-6, -6, 12, 14);
            ctx.fillStyle = '#90a4ae'; ctx.fillRect(-4, -4, 8, 8);
            ctx.fillStyle = '#607d8b'; ctx.fillRect(-1, -3, 2, 6);
            ctx.fillStyle = '#78909c'; ctx.fillRect(-9, -4, 3, 10); ctx.fillRect(6, -4, 3, 10);
        } else {
            ctx.fillStyle = skinBodyCol; ctx.fillRect(-9, -4, 3, 10); ctx.fillRect(6, -4, 3, 10);
        }
        const helmId = p.armor?.helmet;
        if (helmId === 'winged_helm') {
            ctx.fillStyle = '#81d4fa'; ctx.fillRect(-5, -14, 10, 10); ctx.fillStyle = '#29b6f6'; ctx.fillRect(-3, -10, 6, 2);
            ctx.fillStyle = '#b3e5fc'; ctx.fillRect(-10, -13, 5, 4); ctx.fillRect(5, -13, 5, 4);
            ctx.fillStyle = '#81d4fa'; ctx.fillRect(-12, -11, 3, 2); ctx.fillRect(9, -11, 3, 2);
        } else if (helmId === 'skull_crown') {
            ctx.fillStyle = '#efebe9'; ctx.fillRect(-5, -14, 10, 10); ctx.fillStyle = '#fff9c4'; ctx.fillRect(-3, -10, 6, 2);
            ctx.fillStyle = '#efebe9'; ctx.fillRect(-5, -17, 2, 4); ctx.fillRect(-1, -18, 2, 5); ctx.fillRect(3, -17, 2, 4);
        } else if (helmId === 'iron_helm') {
            ctx.fillStyle = '#546e7a'; ctx.fillRect(-5, -14, 10, 10); ctx.fillStyle = '#78909c'; ctx.fillRect(-3, -10, 6, 2);
        } else {
            ctx.fillStyle = '#546e7a'; ctx.fillRect(-5, -14, 10, 10); ctx.fillStyle = '#1de9b6'; ctx.fillRect(-3, -10, 6, 2);
        }
        ctx.fillStyle = '#8b0000'; ctx.fillRect(-1, -16, 2, 4);
    } else {
        // ── Non-knight: draw character-specific body from character art ──
        drawCharacterBodyNonKnight(p);
    }

    // ─── SKIN ACCESSORIES / OVERRIDES (knight only) ───
    if ((!p.character || p.character === 'knight') && skin === 'millionaire') {
        // Top hat overwrites default helmet
        ctx.fillStyle = '#111'; ctx.fillRect(-7, -14, 14, 4);  // brim
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-5, -26, 10, 14); // crown
        ctx.fillStyle = '#ffd700'; ctx.fillRect(-2, -22, 4, 8);  // $ stem/dollar
        ctx.fillStyle = '#111'; ctx.fillRect(-1, -20, 2, 2);      // $ crossbar
    } else if (skin === 'mrBeast') {
        // Suit collar + monocle
        ctx.fillStyle = '#b0bec5'; ctx.fillRect(-5, -10, 10, 4); // white collar
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(-2, -9, 3, 0, Math.PI * 2); ctx.stroke(); // monocle
        ctx.fillStyle = '#ffd700'; ctx.fillRect(-1, -9, 2, 4); // monocle chain
    } else if (skin === 'richestMan') {
        // Gold glow
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(255,215,0,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    } else if (skin === 'deathDefied') {
        // Dark hood overwrites helmet
        ctx.fillStyle = '#050510'; ctx.fillRect(-8, -22, 16, 16); // hood
        ctx.fillStyle = '#0a0a20'; ctx.fillRect(-5, -28, 10, 8);  // hood peak
        // Purple eyes
        ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#cc00ff'; ctx.fillRect(-3, -17, 2, 2); ctx.fillRect(1, -17, 2, 2);
        ctx.shadowBlur = 0;
    } else if (skin === 'steve') {
        // Steve's blocky head overwrites helmet
        ctx.fillStyle = '#c8a870'; ctx.fillRect(-7, -22, 14, 12); // face
        ctx.fillStyle = '#4a2f18'; ctx.fillRect(-7, -22, 14, 5);  // hair
        ctx.fillStyle = '#1565c0'; ctx.fillRect(-5, -18, 3, 3); ctx.fillRect(2, -18, 3, 3); // eyes
        ctx.fillStyle = '#c8a870'; ctx.fillRect(-4, -14, 8, 3);   // nose/chin area
        ctx.fillStyle = '#000'; ctx.fillRect(-3, -12, 6, 2);       // mouth
    } else if (skin === 'speedDemon') {
        // Flame particles on boots/shins
        const fa = state.frame * 0.15;
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 8;
        for (let fi = 0; fi < 4; fi++) {
            ctx.fillStyle = `rgba(255,${60 + fi * 30},0,${0.6 - fi * 0.1})`;
            ctx.fillRect(-3 + fi * 2 + Math.sin(fa + fi) * 1.5, 10 + Math.cos(fa + fi) * 1.5, 2, 3 + Math.abs(Math.sin(fa + fi * 1.5)) * 3);
        }
        ctx.shadowBlur = 0;
    } else if (skin === 'shadowSlayer') {
        // Purple rune glow outline
        ctx.shadowColor = '#7b00d4'; ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(123,0,212,0.5)'; ctx.lineWidth = 1;
        ctx.strokeRect(-7, -14, 14, 30);
        // Rune symbols
        ctx.fillStyle = 'rgba(180,0,255,0.6)';
        ctx.fillRect(-4, -4, 2, 2); ctx.fillRect(2, -4, 2, 2); ctx.fillRect(-1, 0, 2, 4);
        ctx.shadowBlur = 0;
    }

    drawWeaponInHand(p);
    if (p.attacking) drawAttackEffect(p);

    // Spectral orbs
    if (hasUpgrade('spectralOrbs')) {
        const orbCount = 2 + upgradeLevel('spectralOrbs');
        for (let o = 0; o < orbCount; o++) {
            const oAng = p.orbAngle + (o * Math.PI * 2 / orbCount);
            const ox = Math.cos(oAng) * 50, oy = Math.sin(oAng) * 50;
            ctx.save();
            ctx.shadowColor = '#b388ff'; ctx.shadowBlur = 12;
            ctx.fillStyle = 'rgba(179,136,255,0.9)';
            ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox, oy, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    if (hasUpgrade('shadowClone') && p.cloneAttackTimer > 0) {
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#66f';
        ctx.fillRect(-p.facingX * 30 - 6, -p.facingY * 30 - 12, 12, 24); ctx.globalAlpha = 1;
    }
    if (hasUpgrade('frostAura')) {
        ctx.strokeStyle = `rgba(100,200,255,${0.2 + Math.sin(state.frame * 0.05) * 0.1})`;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 100 + upgradeLevel('frostAura') * 10, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}

function drawWeaponInHand(p) {
    const wpn = p.weapon, flip = p.facingX < 0 ? -1 : 1;
    ctx.save();
    switch (wpn) {
        case 'sword': ctx.fillStyle = '#bbb'; ctx.fillRect(7 * flip, -8, 2 * flip, 14); ctx.fillStyle = '#8b6914'; ctx.fillRect(6 * flip, 4, 4 * flip, 3); break;
        case 'bow': ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8 * flip, -2, 10, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke(); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8 * flip, -8); ctx.lineTo(8 * flip, 6); ctx.stroke(); break;
        case 'doubleSword': ctx.fillStyle = '#bbb'; ctx.fillRect(7 * flip, -10, 2 * flip, 12); ctx.fillRect(-9 * flip, -2, 2 * flip, 12); ctx.fillStyle = '#8b6914'; ctx.fillRect(6 * flip, 0, 4 * flip, 3); ctx.fillRect(-10 * flip, -2, 4 * flip, 3); break;
        case 'spear': ctx.fillStyle = '#8b6914'; ctx.fillRect(6 * flip, -14, 2 * flip, 22); ctx.fillStyle = '#ccc'; ctx.fillRect(5 * flip, -18, 4 * flip, 6); break;
        case 'axe': ctx.fillStyle = '#8b6914'; ctx.fillRect(6 * flip, -10, 2 * flip, 18); ctx.fillStyle = '#777'; ctx.fillRect(5 * flip, -12, 6 * flip, 6); break;
        case 'dagger': ctx.fillStyle = '#bbb'; ctx.fillRect(7 * flip, -4, 2 * flip, 8); ctx.fillRect(-9 * flip, -4, 2 * flip, 8); break;
        case 'woodenDagger': ctx.fillStyle = '#8b5e3c'; ctx.fillRect(7 * flip, -6, 2 * flip, 12); ctx.fillStyle = '#c49a6c'; ctx.fillRect(6 * flip, 4, 4 * flip, 3); ctx.fillStyle = '#6b3a1f'; ctx.fillRect(7 * flip, -8, 2 * flip, 3); break;
        case 'crossbow': ctx.fillStyle = '#5d4037'; ctx.fillRect(5 * flip, -4, 8 * flip, 3); ctx.fillRect(6 * flip, -6, 2 * flip, 8); break;
        case 'flail': ctx.fillStyle = '#8b6914'; ctx.fillRect(6 * flip, -2, 2 * flip, 10); const ce = 14 * flip + Math.sin(state.frame * 0.2) * 4; ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7 * flip, -2); ctx.lineTo(ce, -10); ctx.stroke(); ctx.fillStyle = '#555'; ctx.fillRect(ce - 3, -14, 6, 6); break;
        case 'magicStaff': ctx.fillStyle = '#5e35b1'; ctx.fillRect(6 * flip, -14, 2 * flip, 22); ctx.fillStyle = '#e040fb'; ctx.beginPath(); ctx.arc(7 * flip, -16, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(7 * flip, -16, 1.5, 0, Math.PI * 2); ctx.fill(); break;
        case 'boomerang':
            ctx.save(); ctx.translate(8 * flip, -4); ctx.rotate(state.frame * 0.15 * flip);
            ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore(); break;
        case 'scythe':
            ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -14); ctx.stroke();
            ctx.strokeStyle = '#ccc'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(4 * flip, -12, 9, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
            break;
        case 'bomb':
            ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(9 * flip, -4, 5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(9 * flip, -8); ctx.lineTo(9 * flip + 3 * flip, -13); ctx.stroke();
            if (state.frame % 6 < 3) { ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.arc(9 * flip + 3 * flip, -14, 2, 0, Math.PI * 2); ctx.fill(); }
            break;
        case 'whip': {
            // Handle
            ctx.fillStyle = '#5d3010'; ctx.fillRect(5 * flip, -2, 3 * flip, 10);
            // Whip cord with animated curl
            const wr = state.frame * 0.15 * flip;
            ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(7 * flip, -2);
            ctx.bezierCurveTo(14 * flip, -10 + Math.sin(wr) * 4, 20 * flip, -6, 26 * flip, -14 + Math.sin(wr + 1) * 5);
            ctx.stroke();
            // Cracker tip
            ctx.strokeStyle = '#e8c070'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(26 * flip, -14 + Math.sin(wr + 1) * 5);
            ctx.lineTo(30 * flip, -18 + Math.sin(wr + 2) * 3);
            ctx.stroke();
            break;
        }
        // ── FUSION WEAPONS ──
        case 'mace': {
            ctx.fillStyle = '#6d4c41'; ctx.fillRect(6*flip,-4,2*flip,14);
            const mb = Math.sin(state.frame*0.12)*2;
            ctx.fillStyle = '#78909c'; ctx.fillRect(3*flip,-14+mb,8*flip,10);
            ctx.fillStyle = '#90a4ae';
            ctx.fillRect(1*flip,-16+mb,4*flip,4); ctx.fillRect(9*flip,-16+mb,4*flip,4); ctx.fillRect(4*flip,-18+mb,6*flip,4);
            break;
        }
        case 'atomicBomb': {
            ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(9*flip,-5,8,0,Math.PI*2); ctx.fill();
            const ag = 0.4+Math.sin(state.frame*0.1)*0.3;
            ctx.fillStyle = `rgba(0,255,80,${ag})`; ctx.beginPath(); ctx.arc(9*flip,-5,5,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(9*flip,-5,2,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(9*flip,-12); ctx.lineTo(9*flip+3*flip,-18); ctx.stroke();
            if (state.frame%4<2) { ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.arc(9*flip+3*flip,-19,3,0,Math.PI*2); ctx.fill(); }
            break;
        }
        case 'poseidonTrident': {
            ctx.fillStyle = '#1565c0'; ctx.fillRect(6*flip,-16,2*flip,26);
            ctx.fillStyle = '#29b6f6';
            ctx.fillRect(4*flip,-22,2*flip,8); ctx.fillRect(6*flip,-24,2*flip,10); ctx.fillRect(8*flip,-22,2*flip,8);
            const wv = 0.3+Math.sin(state.frame*0.18)*0.2;
            ctx.fillStyle = `rgba(100,220,255,${wv})`; ctx.fillRect(3*flip,-22+Math.sin(state.frame*0.18)*1.5,8*flip,2);
            break;
        }
        case 'thunderbow': {
            ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(8*flip,-2,10,-Math.PI*0.4,Math.PI*0.4); ctx.stroke();
            ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(8*flip,-8); ctx.lineTo(8*flip,6); ctx.stroke();
            if (state.frame%8<5) { ctx.strokeStyle = '#ffe000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8*flip,-7); ctx.lineTo(10*flip,-1); ctx.lineTo(6*flip,2); ctx.lineTo(9*flip,5); ctx.stroke(); }
            break;
        }
        case 'soulReaper': {
            ctx.fillStyle = '#4a148c'; ctx.fillRect(6*flip,-12,2*flip,20);
            ctx.fillStyle = '#ce93d8'; ctx.fillRect(4*flip,-2,6*flip,3);
            const sg = 0.2+Math.sin(state.frame*0.08)*0.15;
            ctx.fillStyle = `rgba(200,100,255,${sg})`; ctx.beginPath(); ctx.arc(7*flip,-6,7,0,Math.PI*2); ctx.fill();
            break;
        }
        case 'serpentFangs': {
            ctx.fillStyle = '#2e7d32'; ctx.fillRect(6*flip,-8,3*flip,12); ctx.fillRect(-8*flip,-8,3*flip,12);
            ctx.fillStyle = '#a5d6a7'; ctx.fillRect(7*flip,-10,2*flip,3); ctx.fillRect(-7*flip,-10,2*flip,3);
            if (state.frame%30<15) { const vt=(state.frame%30)/15; ctx.fillStyle='#76ff03'; ctx.fillRect(7*flip,-4+vt*8,2,2); ctx.fillRect(-7*flip,-4+vt*8,2,2); }
            break;
        }
        case 'deathScythe': {
            ctx.fillStyle = '#212121'; ctx.fillRect(-1,-18,2,28);
            ctx.strokeStyle = '#455a64'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(6*flip,-14,15,Math.PI*0.45,Math.PI*1.55); ctx.stroke();
            const dg = 0.35+Math.sin(state.frame*0.1)*0.25;
            ctx.strokeStyle = `rgba(100,0,180,${dg})`; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(6*flip,-14,15,Math.PI*0.6,Math.PI*1.4); ctx.stroke();
            break;
        }
        case 'chainLightningWhip': {
            ctx.fillStyle = '#37474f'; ctx.fillRect(5*flip,-2,3*flip,10);
            const ct = state.frame*0.2;
            for (let i=0;i<4;i++) { const lx=(7+(i+1)*4.5)*flip,ly=-5+Math.sin(ct+i*0.8)*5; ctx.fillStyle=i%2===0?'#607d8b':'#78909c'; ctx.fillRect(lx-2,ly-2,4,4); }
            if (state.frame%5<3) { ctx.strokeStyle='rgba(255,230,0,0.9)'; ctx.lineWidth=1; const lx=(7+5*4.5)*flip,ly=-5+Math.sin(ct+3.2)*5; ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+4*flip,ly-5); ctx.stroke(); }
            break;
        }
        // ── CHARACTER WEAPONS ──
        case 'stick': {
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(6*flip,-16,2*flip,28);
            ctx.fillStyle = '#a1887f'; ctx.fillRect(5*flip,-16,4*flip,3);
            break;
        }
        case 'club': {
            ctx.fillStyle = '#4e342e'; ctx.fillRect(6*flip,-2,2*flip,12);
            ctx.fillStyle = '#3e2723'; ctx.fillRect(3*flip,-14,8*flip,14);
            ctx.fillStyle = '#5d4037'; ctx.fillRect(4*flip,-16,6*flip,4);
            break;
        }
        case 'balloonSword': {
            const bc = ['#ef5350','#ff9800','#ffee58','#66bb6a','#42a5f5','#ab47bc'];
            for (let i=0;i<6;i++) { ctx.fillStyle=bc[i]; ctx.fillRect(6*flip,-20+i*5,4*flip,4); }
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(7*flip,-20,2*flip,3);
            break;
        }
        case 'hellfireStaff': {
            ctx.fillStyle = '#b71c1c'; ctx.fillRect(6*flip,-14,2*flip,24);
            const ft = state.frame*0.15;
            ctx.fillStyle = '#ff5722'; ctx.beginPath(); ctx.arc(7*flip,-16,5,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgba(255,220,0,${0.6+Math.sin(ft)*0.35})`; ctx.beginPath(); ctx.arc(7*flip,-16,3,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgba(255,255,200,${0.5+Math.sin(ft*1.4)*0.4})`; ctx.beginPath(); ctx.arc(7*flip,-17,1.5,0,Math.PI*2); ctx.fill();
            break;
        }
        case 'plasmaBlaster': case 'plasmaCannon': {
            ctx.fillStyle = '#37474f'; ctx.fillRect(4*flip,-5,9*flip,6);
            ctx.fillStyle = '#546e7a'; ctx.fillRect(4*flip,-7,6*flip,4);
            const pt = 0.5+Math.sin(state.frame*0.2)*0.4;
            ctx.fillStyle = `rgba(0,188,212,${pt})`; ctx.beginPath(); ctx.arc(12*flip,-2,4,0,Math.PI*2); ctx.fill();
            break;
        }
        case 'dragonBreath': {
            const dt = state.frame*0.2;
            ctx.fillStyle = `rgba(255,${80+Math.sin(dt)*40},0,0.8)`; ctx.beginPath(); ctx.arc(14*flip,-2,6+Math.sin(dt)*2,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgba(255,200,0,0.6)`; ctx.beginPath(); ctx.arc(20*flip,-2,3+Math.sin(dt+1)*1.5,0,Math.PI*2); ctx.fill();
            break;
        }
        case 'blobSpike': {
            ctx.fillStyle = '#43a047'; ctx.fillRect(6*flip,-8,6*flip,8);
            ctx.fillStyle = '#81c784'; ctx.fillRect(5*flip,-10,3*flip,4); ctx.fillRect(9*flip,-10,3*flip,4); ctx.fillRect(12*flip,-5,3*flip,4);
            break;
        }
        case 'blobAcid': {
            const ba = state.frame*0.12;
            ctx.fillStyle = '#76ff03'; ctx.beginPath(); ctx.arc(11*flip,-2+Math.sin(ba)*2,6,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgba(200,255,0,${0.5+Math.sin(ba)*0.3})`; ctx.beginPath(); ctx.arc(11*flip,-2+Math.sin(ba)*2,3,0,Math.PI*2); ctx.fill();
            break;
        }
        case 'dinnerFork': {
            ctx.fillStyle = '#9e9e9e'; ctx.fillRect(7*flip,-8,2*flip,18);
            ctx.fillStyle = '#bdbdbd';
            ctx.fillRect(5*flip,-20,2*flip,12); ctx.fillRect(7*flip,-22,2*flip,14); ctx.fillRect(9*flip,-22,2*flip,14); ctx.fillRect(11*flip,-20,2*flip,12);
            ctx.fillRect(5*flip,-22,8*flip,2);
            break;
        }
        case 'stilettoHeel': {
            ctx.fillStyle = '#e91e63'; ctx.fillRect(4*flip,-10,8*flip,14);
            ctx.fillStyle = '#880e4f'; ctx.fillRect(4*flip,-12,8*flip,3);
            ctx.fillStyle = '#c2185b'; ctx.fillRect(11*flip,3,2*flip,8);
            break;
        }
        case 'shadowBlade': {
            ctx.fillStyle = '#212121'; ctx.fillRect(6*flip,-14,2*flip,20);
            ctx.fillStyle = '#424242'; ctx.fillRect(4*flip,-2,6*flip,3);
            const sh = Math.sin(state.frame*0.1)*2;
            ctx.fillStyle = `rgba(120,0,220,${0.25+Math.sin(state.frame*0.12)*0.15})`; ctx.fillRect(4*flip,-14+sh,6*flip,3);
            break;
        }
        case 'divineSword': {
            ctx.fillStyle = '#ffd700'; ctx.fillRect(6*flip,-14,2*flip,20);
            ctx.fillStyle = '#fff59d'; ctx.fillRect(4*flip,-2,6*flip,3);
            const dv = 0.2+Math.sin(state.frame*0.1)*0.12;
            ctx.fillStyle = `rgba(255,230,100,${dv})`; ctx.beginPath(); ctx.arc(7*flip,-8,9,0,Math.PI*2); ctx.fill();
            break;
        }
        case 'monoLaser': {
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(9*flip,-4,6,0,Math.PI*2); ctx.stroke();
            const ml = 0.6+Math.sin(state.frame*0.2)*0.4;
            ctx.strokeStyle = `rgba(255,50,50,${ml})`; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(14*flip,-4); ctx.lineTo(25*flip,-4); ctx.stroke();
            break;
        }
        case 'harpoonGun': {
            ctx.fillStyle = '#455a64'; ctx.fillRect(4*flip,-4,8*flip,6);
            ctx.fillStyle = '#78909c'; ctx.fillRect(4*flip,-6,5*flip,4);
            ctx.fillStyle = '#ccc'; ctx.fillRect(11*flip,-3,5*flip,2); ctx.fillRect(14*flip,-5,2*flip,3);
            break;
        }
        case 'hellfireTrident': {
            ctx.fillStyle = '#b71c1c'; ctx.fillRect(6*flip,-16,2*flip,28);
            ctx.fillStyle = '#ff5722'; ctx.fillRect(4*flip,-22,2*flip,8); ctx.fillRect(6*flip,-24,2*flip,10); ctx.fillRect(8*flip,-22,2*flip,8);
            const ht = 0.35+Math.sin(state.frame*0.2)*0.25;
            ctx.fillStyle = `rgba(255,120,0,${ht})`; ctx.fillRect(3*flip,-24+Math.sin(state.frame*0.2),8*flip,2);
            break;
        }
        case 'cutlass': {
            ctx.fillStyle = '#ccc'; ctx.fillRect(6*flip,-14,3*flip,18);
            ctx.fillStyle = '#bbb'; ctx.fillRect(5*flip,-14,2*flip,10);
            ctx.fillStyle = '#ffd700'; ctx.fillRect(4*flip,2,7*flip,3);
            ctx.fillStyle = '#8b6914'; ctx.fillRect(6*flip,4,2*flip,8);
            break;
        }
        case 'enchantedBroom': {
            ctx.fillStyle = '#795548'; ctx.fillRect(7*flip,-18,2*flip,30);
            ctx.fillStyle = '#ffb300'; ctx.fillRect(4*flip,8,8*flip,4);
            ctx.fillStyle = '#a1887f'; ctx.fillRect(4*flip,12,8*flip,4);
            const bs = state.frame*0.2;
            ctx.fillStyle = `rgba(255,220,50,${0.55+Math.sin(bs)*0.35})`; ctx.fillRect(3*flip+Math.sin(bs)*2,4,2,2); ctx.fillRect(10*flip+Math.sin(bs+1)*2,6,2,2);
            break;
        }
        case 'oldManCane': {
            ctx.fillStyle = '#795548'; ctx.fillRect(7*flip,-14,2*flip,26);
            ctx.fillStyle = '#5d4037'; ctx.fillRect(4*flip,-16,6*flip,4); ctx.fillRect(4*flip,-18,2*flip,3);
            break;
        }
        case 'ryanAxe': {
            ctx.fillStyle = '#5d4037'; ctx.fillRect(6*flip,-10,2*flip,22);
            ctx.fillStyle = '#9e9e9e'; ctx.fillRect(3*flip,-18,8*flip,12);
            ctx.fillStyle = '#bdbdbd'; ctx.fillRect(4*flip,-16,6*flip,6);
            break;
        }
        case 'shuriken': {
            ctx.save(); ctx.translate(10*flip,-6); ctx.rotate(state.frame*0.25*flip);
            ctx.fillStyle = '#9e9e9e'; ctx.fillRect(-5,-1,10,2); ctx.fillRect(-1,-5,2,10);
            ctx.fillStyle = '#bdbdbd'; ctx.fillRect(-2,-2,4,4);
            ctx.restore();
            break;
        }
        case 'chemFlask': {
            ctx.fillStyle = '#66bb6a'; ctx.fillRect(5*flip,-8,6*flip,12);
            ctx.fillStyle = '#90caf9'; ctx.fillRect(7*flip,-14,2*flip,7);
            if (Math.sin(state.frame*0.15)>0.4) { ctx.fillStyle='rgba(100,255,100,0.55)'; ctx.beginPath(); ctx.arc(7*flip,-7,2,0,Math.PI*2); ctx.fill(); }
            break;
        }
        case 'shoppingBag': {
            ctx.fillStyle = '#ff7043'; ctx.fillRect(4*flip,-4,8*flip,12);
            ctx.fillStyle = '#e64a19'; ctx.fillRect(4*flip,-4,8*flip,2);
            ctx.strokeStyle = '#bf360c'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(6*flip,-4); ctx.lineTo(6*flip,-8); ctx.moveTo(10*flip,-4); ctx.lineTo(10*flip,-8); ctx.stroke();
            break;
        }
        case 'gameController': {
            ctx.fillStyle = '#37474f'; ctx.fillRect(3*flip,-4,10*flip,8);
            ctx.fillStyle = '#546e7a'; ctx.fillRect(3*flip,-4,3*flip,4); ctx.fillRect(10*flip,-4,3*flip,4);
            ctx.fillStyle = '#ef5350'; ctx.fillRect(5*flip,-2,2,2);
            ctx.fillStyle = '#42a5f5'; ctx.fillRect(8*flip,-2,2,2);
            break;
        }
        case 'goldenSword': {
            ctx.fillStyle = '#ffd700'; ctx.fillRect(6*flip,-14,2*flip,20);
            ctx.fillStyle = '#ffb300'; ctx.fillRect(5*flip,-14,4*flip,4);
            ctx.fillStyle = '#fff176'; ctx.fillRect(6*flip,-14,2*flip,3);
            break;
        }
        case 'tamingWhip': {
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(5*flip,-2,3*flip,10);
            const tw = state.frame*0.15*flip;
            ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(7*flip,-2); ctx.bezierCurveTo(12*flip,-8+Math.sin(tw)*3,18*flip,-4,22*flip,-10+Math.sin(tw+1)*4); ctx.stroke();
            break;
        }
        case 'fangsWeapon': {
            ctx.fillStyle = '#7b1fa2'; ctx.fillRect(6*flip,-10,3*flip,14); ctx.fillRect(-8*flip,-10,3*flip,14);
            ctx.fillStyle = '#e040fb'; ctx.fillRect(7*flip,-12,2*flip,4); ctx.fillRect(-7*flip,-12,2*flip,4);
            break;
        }
        case 'pitchfork': {
            ctx.fillStyle = '#5d4037'; ctx.fillRect(6*flip,-16,2*flip,28);
            ctx.fillStyle = '#9e9e9e';
            ctx.fillRect(4*flip,-22,2*flip,8); ctx.fillRect(6*flip,-24,2*flip,10); ctx.fillRect(8*flip,-22,2*flip,8);
            break;
        }
        case 'fishingRod': {
            ctx.fillStyle = '#795548'; ctx.fillRect(6*flip,-16,2*flip,26);
            const fr = state.frame*0.1;
            ctx.strokeStyle = '#bbb'; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(7*flip,-16); ctx.lineTo(7*flip+7*flip,-22+Math.sin(fr)*2); ctx.stroke();
            ctx.fillStyle = '#f44336'; ctx.fillRect(7*flip+6*flip,-20+Math.sin(fr)*2,3,2);
            break;
        }
        case 'wrench': {
            ctx.fillStyle = '#607d8b'; ctx.fillRect(6*flip,-10,3*flip,20);
            ctx.fillStyle = '#78909c'; ctx.fillRect(4*flip,-14,6*flip,6);
            ctx.fillStyle = '#546e7a'; ctx.fillRect(4*flip,-14,3*flip,3);
            break;
        }
        case 'megaphone': {
            ctx.fillStyle = '#fdd835'; ctx.fillRect(4*flip,-6,4*flip,8); ctx.fillRect(8*flip,-9,5*flip,14);
            ctx.fillStyle = '#f9a825'; ctx.fillRect(4*flip,-4,4*flip,4);
            break;
        }
        case 'revolver': {
            ctx.fillStyle = '#424242'; ctx.fillRect(4*flip,-4,9*flip,5);
            ctx.fillStyle = '#616161'; ctx.fillRect(4*flip,-6,5*flip,4);
            ctx.fillStyle = '#37474f'; ctx.fillRect(6*flip,1,3*flip,7);
            break;
        }
        case 'mop': {
            ctx.fillStyle = '#795548'; ctx.fillRect(7*flip,-16,2*flip,28);
            ctx.fillStyle = '#bbb'; ctx.fillRect(3*flip,8,8*flip,3);
            const mt = state.frame*0.2;
            ctx.fillStyle = '#9e9e9e';
            ctx.fillRect(3*flip+Math.sin(mt)*1,10,2,5); ctx.fillRect(6*flip+Math.sin(mt+1)*1,10,2,5); ctx.fillRect(9*flip+Math.sin(mt+2)*1,10,2,5);
            break;
        }
        case 'toyMallet': {
            ctx.fillStyle = '#795548'; ctx.fillRect(7*flip,-8,2*flip,18);
            ctx.fillStyle = '#e91e63'; ctx.fillRect(2*flip,-16,10*flip,8);
            ctx.fillStyle = '#f48fb1'; ctx.fillRect(3*flip,-15,8*flip,3);
            break;
        }
        case 'cubeBomb': {
            ctx.fillStyle = '#e53935'; ctx.fillRect(5*flip,-14,8,8);
            ctx.fillStyle = '#ff7043'; ctx.fillRect(5*flip,-14,8,3);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 0.5;
            ctx.strokeRect(5*flip,-14,8,8);
            ctx.beginPath(); ctx.moveTo(5*flip+3,-14); ctx.lineTo(5*flip+3,-6); ctx.moveTo(5*flip+6,-14); ctx.lineTo(5*flip+6,-6); ctx.stroke();
            ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(5*flip,-14); ctx.lineTo(5*flip+2*flip,-20); ctx.stroke();
            if (state.frame%5<2) { ctx.fillStyle='#ffee58'; ctx.beginPath(); ctx.arc(5*flip+2*flip,-21,2,0,Math.PI*2); ctx.fill(); }
            break;
        }
        case 'fossilStaff': {
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(6*flip,-16,2*flip,28);
            ctx.fillStyle = '#bcaaa4'; ctx.fillRect(4*flip,-24,8*flip,10);
            ctx.fillStyle = '#a1887f'; ctx.fillRect(5*flip,-22,6*flip,4);
            const fst = 0.18+Math.sin(state.frame*0.1)*0.12;
            ctx.fillStyle = `rgba(200,180,140,${fst})`; ctx.beginPath(); ctx.arc(8*flip,-19,6,0,Math.PI*2); ctx.fill();
            break;
        }
        case 'selfieStick': {
            ctx.fillStyle = '#9e9e9e'; ctx.fillRect(7*flip,-20,2*flip,32);
            ctx.fillStyle = '#37474f'; ctx.fillRect(4*flip,-25,6*flip,6);
            ctx.fillStyle = '#1a237e'; ctx.fillRect(5*flip,-24,4*flip,4);
            break;
        }
        case 'koolKatClaws': {
            ctx.strokeStyle = '#fdd835'; ctx.lineWidth = 1.5;
            for (let i=0;i<3;i++) { ctx.beginPath(); ctx.moveTo((8+i*2)*flip,0); ctx.lineTo((12+i*2)*flip,-8); ctx.stroke(); }
            break;
        }
        case 'lasso': {
            const la = state.frame*0.18*flip;
            ctx.strokeStyle = '#a1887f'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(14*flip,-6,6+Math.sin(la)*1.5,3,la,0,Math.PI*2); ctx.stroke();
            ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(8*flip,2); ctx.lineTo(8*flip,-6); ctx.stroke();
            break;
        }
    }
    ctx.restore();
}

function drawAttackEffect(p) {
    const fx = p.atkFX ?? p.facingX, fy = p.atkFY ?? p.facingY;
    const ang = Math.atan2(fy, fx);
    ctx.save(); ctx.lineWidth = 3;
    switch (p.weapon) {
        case 'sword':
            ctx.strokeStyle = 'rgba(200,220,255,0.8)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(fx * 20, fy * 20, 28, ang - 0.9, ang + 0.9); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 9;
            ctx.beginPath(); ctx.arc(fx * 20, fy * 20, 22, ang - 0.6, ang + 0.6); ctx.stroke();
            break;
        case 'doubleSword':
            ctx.strokeStyle = 'rgba(200,220,255,0.8)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(fx * 22, fy * 22, 26, ang - 0.9, ang + 0.9); ctx.stroke();
            ctx.beginPath(); ctx.arc(-fx * 22, -fy * 22, 26, ang + Math.PI - 0.9, ang + Math.PI + 0.9); ctx.stroke();
            break;
        case 'spear':
            ctx.strokeStyle = 'rgba(200,255,200,0.8)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(fx * 12, fy * 12); ctx.lineTo(fx * 58, fy * 58); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(fx * 18, fy * 18); ctx.lineTo(fx * 50, fy * 50); ctx.stroke();
            break;
        case 'axe':
            ctx.strokeStyle = 'rgba(255,140,0,0.85)'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(fx * 16, fy * 16, 36, ang - 1.3, ang + 1.3); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,210,50,0.25)'; ctx.lineWidth = 14;
            ctx.beginPath(); ctx.arc(fx * 16, fy * 16, 28, ang - 0.9, ang + 0.9); ctx.stroke();
            break;
        case 'dagger':
            ctx.strokeStyle = 'rgba(180,255,255,0.8)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(fx * 16, fy * 16, 16, ang - 0.7, ang + 0.7); ctx.stroke();
            ctx.beginPath(); ctx.arc(-fx * 12, -fy * 12, 12, ang + Math.PI - 0.7, ang + Math.PI + 0.7); ctx.stroke();
            break;
        case 'flail':
            ctx.strokeStyle = 'rgba(255,100,80,0.7)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, 40, ang - 1.6, ang + 1.6); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,180,100,0.25)'; ctx.lineWidth = 12;
            ctx.beginPath(); ctx.arc(0, 0, 34, ang - 1.2, ang + 1.2); ctx.stroke();
            break;
        case 'scythe':
            ctx.strokeStyle = 'rgba(180,100,255,0.85)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(220,150,255,0.2)'; ctx.lineWidth = 16;
            ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
            break;
        case 'whip':
            // Wide lash arc in the facing direction
            ctx.strokeStyle = 'rgba(180,110,30,0.9)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(fx * 20, fy * 20, 60, ang - 1.5, ang + 1.5); ctx.stroke();
            ctx.strokeStyle = 'rgba(230,190,90,0.45)'; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.arc(fx * 20, fy * 20, 50, ang - 1.1, ang + 1.1); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,220,0.9)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(fx * 60, fy * 60, 10, ang - 0.5, ang + 0.5); ctx.stroke();
            break;
        case 'bow': case 'crossbow': case 'harpoonGun': case 'revolver':
            ctx.strokeStyle = 'rgba(200,170,80,0.85)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(fx*10,fy*10); ctx.lineTo(fx*60,fy*60); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,200,0.25)'; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(fx*14,fy*14); ctx.lineTo(fx*54,fy*54); ctx.stroke();
            break;
        case 'woodenDagger': case 'stick': case 'pitchfork': case 'dinnerFork':
            ctx.strokeStyle = 'rgba(160,120,60,0.8)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(fx*10,fy*10); ctx.lineTo(fx*50,fy*50); ctx.stroke();
            ctx.strokeStyle = 'rgba(220,180,100,0.25)'; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(fx*14,fy*14); ctx.lineTo(fx*44,fy*44); ctx.stroke();
            break;
        case 'magicStaff': case 'fossilStaff': case 'enchantedBroom':
            ctx.strokeStyle = 'rgba(180,50,255,0.85)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0,0,36,0,Math.PI*2); ctx.stroke();
            ctx.strokeStyle = 'rgba(220,120,255,0.2)'; ctx.lineWidth = 14;
            ctx.beginPath(); ctx.arc(0,0,28,0,Math.PI*2); ctx.stroke();
            break;
        case 'boomerang':
            ctx.strokeStyle = 'rgba(200,160,50,0.85)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0,0,38,ang-2.0,ang+2.0); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,220,100,0.2)'; ctx.lineWidth = 12;
            ctx.beginPath(); ctx.arc(0,0,30,ang-1.6,ang+1.6); ctx.stroke();
            break;
        case 'bomb': case 'atomicBomb': case 'cubeBomb':
            ctx.strokeStyle = 'rgba(255,100,0,0.85)'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(0,0,50,0,Math.PI*2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,200,50,0.2)'; ctx.lineWidth = 18;
            ctx.beginPath(); ctx.arc(0,0,40,0,Math.PI*2); ctx.stroke();
            break;
        case 'mace': case 'club': case 'ryanAxe': case 'toyMallet': case 'wrench':
            ctx.strokeStyle = 'rgba(200,180,140,0.85)'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(fx*16,fy*16,38,ang-1.4,ang+1.4); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,230,180,0.2)'; ctx.lineWidth = 16;
            ctx.beginPath(); ctx.arc(fx*16,fy*16,30,ang-1.0,ang+1.0); ctx.stroke();
            break;
        case 'poseidonTrident': case 'hellfireTrident':
            ctx.strokeStyle = p.weapon==='hellfireTrident' ? 'rgba(255,80,20,0.85)' : 'rgba(30,150,255,0.85)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(fx*12,fy*12); ctx.lineTo(fx*62,fy*62); ctx.stroke();
            ctx.strokeStyle = p.weapon==='hellfireTrident' ? 'rgba(255,180,50,0.3)' : 'rgba(100,220,255,0.3)'; ctx.lineWidth = 9;
            ctx.beginPath(); ctx.moveTo(fx*16,fy*16); ctx.lineTo(fx*56,fy*56); ctx.stroke();
            break;
        case 'thunderbow':
            ctx.strokeStyle = 'rgba(255,230,0,0.9)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(fx*10,fy*10); ctx.lineTo(fx*58,fy*58); ctx.stroke();
            ctx.strokeStyle = 'rgba(150,200,255,0.4)'; ctx.lineWidth = 9;
            ctx.beginPath(); ctx.moveTo(fx*14,fy*14); ctx.lineTo(fx*52,fy*52); ctx.stroke();
            break;
        case 'soulReaper':
            ctx.strokeStyle = 'rgba(150,50,255,0.85)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0,0,40,ang-0.9,ang+0.9); ctx.stroke();
            ctx.strokeStyle = 'rgba(200,120,255,0.2)'; ctx.lineWidth = 16;
            ctx.beginPath(); ctx.arc(0,0,32,ang-0.65,ang+0.65); ctx.stroke();
            break;
        case 'serpentFangs': case 'fangsWeapon':
            ctx.strokeStyle = 'rgba(50,200,80,0.8)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(fx*14,fy*14,16,ang-0.7,ang+0.7); ctx.stroke();
            ctx.beginPath(); ctx.arc(-fx*10,-fy*10,12,ang+Math.PI-0.7,ang+Math.PI+0.7); ctx.stroke();
            break;
        case 'deathScythe':
            ctx.strokeStyle = 'rgba(100,0,200,0.85)'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(0,0,52,0,Math.PI*2); ctx.stroke();
            ctx.strokeStyle = 'rgba(180,0,255,0.15)'; ctx.lineWidth = 20;
            ctx.beginPath(); ctx.arc(0,0,42,0,Math.PI*2); ctx.stroke();
            break;
        case 'chainLightningWhip': case 'tamingWhip':
            ctx.strokeStyle = 'rgba(100,200,255,0.9)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(fx*20,fy*20,65,ang-1.6,ang+1.6); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,100,0.3)'; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.arc(fx*20,fy*20,55,ang-1.2,ang+1.2); ctx.stroke();
            break;
        case 'goldenSword': case 'divineSword':
            ctx.strokeStyle = 'rgba(255,215,0,0.9)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(fx*18,fy*18,30,ang-0.9,ang+0.9); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,240,150,0.25)'; ctx.lineWidth = 14;
            ctx.beginPath(); ctx.arc(fx*18,fy*18,24,ang-0.65,ang+0.65); ctx.stroke();
            break;
        case 'shadowBlade':
            ctx.strokeStyle = 'rgba(130,0,255,0.85)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(fx*18,fy*18,28,ang-0.9,ang+0.9); ctx.stroke();
            ctx.strokeStyle = 'rgba(80,0,180,0.2)'; ctx.lineWidth = 12;
            ctx.beginPath(); ctx.arc(fx*18,fy*18,22,ang-0.65,ang+0.65); ctx.stroke();
            break;
        case 'cutlass':
            ctx.strokeStyle = 'rgba(200,210,255,0.8)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(fx*18,fy*18,32,ang-1.1,ang+1.1); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,200,50,0.2)'; ctx.lineWidth = 12;
            ctx.beginPath(); ctx.arc(fx*18,fy*18,24,ang-0.8,ang+0.8); ctx.stroke();
            break;
        case 'hellfireStaff': case 'dragonBreath':
            ctx.strokeStyle = 'rgba(255,80,0,0.85)'; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.arc(fx*20,fy*20,32,ang-1.2,ang+1.2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,220,0,0.3)'; ctx.lineWidth = 22;
            ctx.beginPath(); ctx.arc(fx*20,fy*20,24,ang-0.9,ang+0.9); ctx.stroke();
            break;
        case 'blobSpike': case 'blobAcid':
            ctx.strokeStyle = 'rgba(50,220,80,0.8)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(fx*14,fy*14,28,ang-1.1,ang+1.1); ctx.stroke();
            ctx.strokeStyle = 'rgba(120,255,50,0.2)'; ctx.lineWidth = 14;
            ctx.beginPath(); ctx.arc(fx*14,fy*14,22,ang-0.8,ang+0.8); ctx.stroke();
            break;
        case 'plasmaBlaster': case 'plasmaCannon': case 'monoLaser':
            ctx.strokeStyle = 'rgba(0,220,255,0.9)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(fx*10,fy*10); ctx.lineTo(fx*80,fy*80); ctx.stroke();
            ctx.strokeStyle = 'rgba(100,240,255,0.3)'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(fx*14,fy*14); ctx.lineTo(fx*74,fy*74); ctx.stroke();
            break;
        case 'shuriken':
            ctx.strokeStyle = 'rgba(200,220,220,0.8)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0,0,32,0,Math.PI*2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.arc(0,0,26,0,Math.PI*2); ctx.stroke();
            break;
        case 'chemFlask':
            ctx.strokeStyle = 'rgba(50,200,80,0.8)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0,0,32,0,Math.PI*2); ctx.stroke();
            ctx.strokeStyle = 'rgba(100,255,80,0.2)'; ctx.lineWidth = 14;
            ctx.beginPath(); ctx.arc(0,0,24,0,Math.PI*2); ctx.stroke();
            break;
        case 'megaphone':
            ctx.strokeStyle = 'rgba(255,220,0,0.8)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(fx*16,fy*16,38,ang-1.5,ang+1.5); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,240,100,0.2)'; ctx.lineWidth = 14;
            ctx.beginPath(); ctx.arc(fx*16,fy*16,30,ang-1.1,ang+1.1); ctx.stroke();
            break;
        case 'stilettoHeel': case 'balloonSword': case 'selfieStick':
        case 'lasso': case 'gameController': case 'koolKatClaws':
        case 'shoppingBag': case 'mop': case 'fishingRod': case 'oldManCane':
            ctx.strokeStyle = 'rgba(220,100,180,0.8)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(fx*14,fy*14,28,ang-1.2,ang+1.2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,150,220,0.2)'; ctx.lineWidth = 12;
            ctx.beginPath(); ctx.arc(fx*14,fy*14,22,ang-0.9,ang+0.9); ctx.stroke();
            break;
    }
    ctx.restore();
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();
