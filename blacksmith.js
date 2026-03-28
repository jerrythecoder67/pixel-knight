// ─── BLACKSMITH ───

// ── Alien Unlock: 5-step mini-game (Reaper only, in Fusion tab) ──
// Step 0: idle
// Step 1: UFO descending toward A, beam active, A rises + disappears
// Step 2: UFO hovers in place of A; other letters glow, waiting
// Step 3: alien walks out toward clicked letter
// Step 4: alien returns holding letter; player can click alien to knock it down
// Step 5: alien wobbles then falls
// Step 6: alien falling; folder visible and draggable; catch it to unlock
// Step 7: caught — sparkle finish
let _alienStep = 0;

const _AL = {
    canvas: null, ctx: null, raf: null, frame: 0,
    ufoX: 0, ufoY: -60, ufoBaseY: 0,
    beamAlpha: 0,
    aSpan: null, aX: 0, aY: 0, aRiseY: 0, aAlpha: 1,
    grabSpan: null,
    alienX: 0, alienY: 0, alienDir: 1, alienHolding: false, alienTarget: 0,
    wobbleTimer: 0,
    fallX: 0, fallY: 0, fallVY: 0.2,
    folderEl: null, folderX: 100, folderW: 112,
    folderDrag: false, folderDragOffX: 0,
};

function _alienCoords(span) {
    const ov = document.getElementById('blacksmith-overlay');
    if (!ov) return { x: 0, y: 0 };
    const or = ov.getBoundingClientRect();
    const sr = span.getBoundingClientRect();
    return { x: sr.left - or.left + sr.width / 2, y: sr.top - or.top + sr.height / 2 };
}

function _alienStartCanvas() {
    if (_AL.canvas) return;
    const c = document.createElement('canvas');
    c.id = 'alien-anim-canvas';
    c.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;background:transparent;';
    document.body.appendChild(c);
    _AL.canvas = c;
    _AL.ctx = c.getContext('2d');
    function _sz() {
        const ov = document.getElementById('blacksmith-overlay');
        if (!ov) return;
        const r = ov.getBoundingClientRect();
        c.style.left = r.left + 'px'; c.style.top = r.top + 'px';
        if (c.width !== Math.round(r.width)) c.width = Math.round(r.width);
        if (c.height !== Math.round(r.height)) c.height = Math.round(r.height);
    }
    _sz();
    function _loop() { _sz(); _alienRender(); _AL.raf = requestAnimationFrame(_loop); }
    _AL.raf = requestAnimationFrame(_loop);
}

function _alienCleanup() {
    if (_AL.raf) { cancelAnimationFrame(_AL.raf); _AL.raf = null; }
    if (_AL.canvas) { _AL.canvas.remove(); _AL.canvas = null; _AL.ctx = null; }
    if (_AL.folderEl) { _AL.folderEl.remove(); _AL.folderEl = null; }
    document.removeEventListener('mousemove', _folderMove);
    document.removeEventListener('mouseup', _folderUp);
    _alienStep = 0;
    _AL.frame = 0; _AL.ufoY = -60; _AL.beamAlpha = 0; _AL.aRiseY = 0; _AL.aAlpha = 1;
    _AL.alienHolding = false; _AL.fallVY = 0.2; _AL.folderDrag = false;
    const wrap = document.getElementById('bs-title-letters');
    if (wrap) [...wrap.children].forEach(s => { s.style.visibility = ''; s.style.color = ''; s.style.cursor = 'default'; });
}

// ── Pixel art: UFO shaped like the letter A ──
function _drawUFO(ctx, cx, cy) {
    const S = 2;
    ctx.save(); ctx.translate(Math.round(cx), Math.round(cy));
    // Two legs at bottom (like A's feet)
    ctx.fillStyle = '#8aaac0';
    ctx.fillRect(-5*S, 4*S, S, 2*S);
    ctx.fillRect(4*S, 4*S, S, 2*S);
    // Wide saucer body / crossbar (A's horizontal bar)
    ctx.fillStyle = '#b0cce0';
    ctx.fillRect(-5*S, 2*S, 10*S, 2*S);
    // Arch / dome mid
    ctx.fillStyle = '#c8e0f4';
    ctx.fillRect(-3*S, 0, 6*S, 2*S);
    // Dome upper
    ctx.fillStyle = '#a8d4f0';
    ctx.fillRect(-2*S, -2*S, 4*S, 2*S);
    // Peak
    ctx.fillStyle = '#80c4e8';
    ctx.fillRect(-S, -4*S, 2*S, 2*S);
    // Cockpit window (dark)
    ctx.fillStyle = '#0d2a4a';
    ctx.fillRect(-S, 0, 2*S, 2*S);
    // Pulsing beacon at tip
    const p = 0.35 + 0.55 * Math.sin(_AL.frame * 0.14);
    ctx.fillStyle = `rgba(160,230,255,${p})`;
    ctx.fillRect(-S, -4*S, 2*S, 2*S);
    // Underside glow when beam active
    if (_AL.beamAlpha > 0.01) {
        ctx.fillStyle = `rgba(255,220,60,${_AL.beamAlpha * 0.9})`;
        ctx.fillRect(-3*S, 4*S, 6*S, S);
    }
    ctx.restore();
}

// ── Tractor beam ──
function _drawBeam(ctx, cx, cy) {
    if (_AL.beamAlpha < 0.01) return;
    ctx.save();
    const grad = ctx.createLinearGradient(cx, cy + 8, cx, cy + 64);
    grad.addColorStop(0, `rgba(255,224,60,${_AL.beamAlpha})`);
    grad.addColorStop(1, `rgba(255,224,60,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 8);
    ctx.lineTo(cx + 4, cy + 8);
    ctx.lineTo(cx + 24, cy + 64);
    ctx.lineTo(cx - 24, cy + 64);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// ── Pixel art alien ──
function _drawAlien(ctx, cx, cy, dir, holding, wobble) {
    const S = 2;
    const bob = Math.sin(_AL.frame * 0.28) * S;
    ctx.save(); ctx.translate(Math.round(cx + wobble), Math.round(cy));
    // Head (big oval)
    ctx.fillStyle = '#69f0ae';
    ctx.fillRect(-3*S, 0, 6*S, 5*S);
    // Large almond eyes
    ctx.fillStyle = '#001800';
    ctx.fillRect(-2*S, S, 2*S, 2*S);
    ctx.fillRect(0, S, 2*S, 2*S);
    // Mouth
    ctx.fillStyle = '#3da870';
    ctx.fillRect(-2*S, 3*S, 4*S, S);
    // Body
    ctx.fillStyle = '#42b883';
    ctx.fillRect(-2*S, 5*S, 4*S, 4*S);
    // Arms: raised if holding letter, normal if walking
    ctx.fillStyle = '#69f0ae';
    if (holding) {
        ctx.fillRect(-4*S, S, 2*S, 5*S);  // left arm up
        ctx.fillRect(2*S, S, 2*S, 5*S);   // right arm up
    } else {
        ctx.fillRect(-4*S, 6*S, 2*S, 2*S);
        ctx.fillRect(2*S, 6*S, 2*S, 2*S);
    }
    // Legs with walk animation
    ctx.fillRect(-2*S, 9*S, S, 3*S + (dir > 0 ? bob : -bob));
    ctx.fillRect(S, 9*S, S, 3*S + (dir > 0 ? -bob : bob));
    // Held letter above head
    if (holding && _AL.grabSpan) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(_AL.grabSpan.textContent, 0, -3);
    }
    ctx.restore();
}

// ── Main render loop ──
function _alienRender() {
    const ctx = _AL.ctx, cvs = _AL.canvas;
    if (!ctx || !cvs) return;
    _AL.frame++;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    if (_alienStep === 0) return;

    // UFO display Y: oscillate once settled
    const ufoShowY = _alienStep >= 2
        ? _AL.ufoBaseY + Math.sin(_AL.frame * 0.055) * 2
        : _AL.ufoY;

    // ── Step 1: UFO descends + A rises into beam ──
    if (_alienStep === 1) {
        _AL.ufoY = Math.min(_AL.ufoY + 1.4, _AL.ufoBaseY);
        _AL.beamAlpha = Math.min(0.85, _AL.beamAlpha + 0.018);
        // A rises up once UFO is close enough
        if (_AL.ufoY > _AL.ufoBaseY - 30) {
            _AL.aRiseY -= 1.1;
            _AL.aAlpha = Math.max(0, _AL.aAlpha - 0.032);
            ctx.globalAlpha = _AL.aAlpha;
            ctx.fillStyle = '#ffe082';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('A', _AL.aX, _AL.aY + _AL.aRiseY);
            ctx.globalAlpha = 1;
        }
        _drawBeam(ctx, _AL.ufoX, _AL.ufoY);
        _drawUFO(ctx, _AL.ufoX, _AL.ufoY);
        if (_AL.ufoY >= _AL.ufoBaseY && _AL.aAlpha <= 0) {
            _AL.beamAlpha = 0;
            _alienStep = 2;
            _alienEnableLetters();
        }
        return;
    }

    // Always draw UFO for steps 2+
    _drawUFO(ctx, _AL.ufoX, ufoShowY);

    if (_alienStep === 2) return;

    // ── Step 3: Alien walks to target letter ──
    if (_alienStep === 3) {
        _AL.alienDir = _AL.alienTarget > _AL.alienX ? 1 : -1;
        if (Math.abs(_AL.alienTarget - _AL.alienX) > 2) {
            _AL.alienX += _AL.alienDir * 2;
        } else {
            _AL.alienX = _AL.alienTarget;
            if (_AL.grabSpan) _AL.grabSpan.style.visibility = 'hidden';
            _AL.alienHolding = true;
            _AL.alienDir *= -1;
            _AL.alienTarget = _AL.ufoX;
            _alienStep = 4;
            _AL.canvas.style.pointerEvents = 'auto';
            _AL.canvas.addEventListener('click', _alienHitTest);
        }
        _drawAlien(ctx, _AL.alienX, _AL.alienY, _AL.alienDir, false, 0);
        return;
    }

    // ── Step 4: Alien returns holding letter ──
    if (_alienStep === 4) {
        _AL.alienDir = _AL.alienTarget > _AL.alienX ? 1 : -1;
        if (Math.abs(_AL.alienTarget - _AL.alienX) > 1.5) {
            _AL.alienX += _AL.alienDir * 1.5;
        } else {
            // Back at UFO — letter goes back, reset to hovering
            _AL.alienX = _AL.alienTarget;
            if (_AL.grabSpan) _AL.grabSpan.style.visibility = 'visible';
            _AL.grabSpan = null; _AL.alienHolding = false;
            _AL.canvas.style.pointerEvents = 'none';
            _AL.canvas.removeEventListener('click', _alienHitTest);
            _alienEnableLetters();
            _alienStep = 2;
        }
        _drawAlien(ctx, _AL.alienX, _AL.alienY, _AL.alienDir, _AL.alienHolding, 0);
        return;
    }

    // ── Step 5: Alien wobbles ──
    if (_alienStep === 5) {
        _AL.wobbleTimer--;
        const wobble = Math.sin(_AL.frame * 0.55) * 5 * (_AL.wobbleTimer / 52);
        _drawAlien(ctx, _AL.alienX, _AL.alienY, _AL.alienDir, true, wobble);
        if (_AL.wobbleTimer <= 0) {
            _AL.fallX = _AL.alienX; _AL.fallY = _AL.alienY;
            _AL.fallVY = 0.18;
            _alienStep = 6;
            _alienShowFolder();
        }
        return;
    }

    // ── Step 6: Alien falls; folder catch ──
    if (_alienStep === 6) {
        _AL.fallVY = Math.min(_AL.fallVY + 0.038, 2.8);
        _AL.fallY += _AL.fallVY;
        _drawAlien(ctx, _AL.fallX, _AL.fallY, 1, true, 0);
        // Catch zone: folder sits at or.bottom-90 viewport → cvs.height-90 in canvas coords
        const folderTop = cvs.height - 90;
        const alienFeet = _AL.fallY + 24;
        if (alienFeet >= folderTop && alienFeet <= folderTop + 44) {
            if (_AL.fallX >= _AL.folderX && _AL.fallX <= _AL.folderX + _AL.folderW) {
                _alienCatch(); return;
            }
        }
        // Escaped off bottom
        if (_AL.fallY > cvs.height + 40) {
            if (_AL.grabSpan) _AL.grabSpan.style.visibility = 'visible';
            _AL.grabSpan = null; _AL.alienHolding = false;
            if (_AL.folderEl) { _AL.folderEl.remove(); _AL.folderEl = null; }
            document.removeEventListener('mousemove', _folderMove);
            document.removeEventListener('mouseup', _folderUp);
            _AL.canvas.style.pointerEvents = 'none';
            _alienEnableLetters();
            _alienStep = 2;
        }
        return;
    }

    // ── Step 7: Caught sparkle ──
    if (_alienStep === 7) {
        for (let i = 0; i < 6; i++) {
            const a = _AL.frame * 0.22 + i * (Math.PI * 2 / 6);
            const r = 16 + Math.sin(_AL.frame * 0.18 + i) * 5;
            const fade = Math.max(0, 1 - _AL.frame / 90);
            ctx.fillStyle = `rgba(255,216,60,${fade * 0.9})`;
            ctx.fillRect(_AL.fallX + Math.cos(a) * r - 2, _AL.fallY + 10 + Math.sin(a) * r - 2, 4, 4);
        }
    }
}

function _alienEnableLetters() {
    const wrap = document.getElementById('bs-title-letters');
    if (!wrap) return;
    [...wrap.children].forEach(span => {
        if (span.textContent === 'A' || span.style.visibility === 'hidden') return;
        span.style.cursor = 'pointer';
        span.style.color = '#ffe082';
        // Once-only click per re-enable cycle
        function _h() {
            span.removeEventListener('click', _h);
            _bsGrabLetter(span);
        }
        span._alienHandler = _h;
        span.addEventListener('click', _h);
    });
}

function _alienDisableLetters() {
    const wrap = document.getElementById('bs-title-letters');
    if (!wrap) return;
    [...wrap.children].forEach(span => {
        if (span._alienHandler) { span.removeEventListener('click', span._alienHandler); span._alienHandler = null; }
        span.style.cursor = 'default'; span.style.color = '';
    });
}

function _bsGrabLetter(span) {
    if (_alienStep !== 2) return;
    _alienDisableLetters();
    _AL.grabSpan = span;
    const c = _alienCoords(span);
    _AL.alienX = _AL.ufoX;
    _AL.alienY = _AL.ufoBaseY + 14;
    _AL.alienDir = c.x > _AL.ufoX ? 1 : -1;
    _AL.alienTarget = c.x;
    _AL.alienHolding = false;
    _alienStep = 3;
}

function _alienHitTest(e) {
    if (_alienStep !== 4) return;
    const r = _AL.canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (mx >= _AL.alienX - 12 && mx <= _AL.alienX + 12 && my >= _AL.alienY && my <= _AL.alienY + 30) {
        _alienStep = 5; _AL.wobbleTimer = 52;
        _AL.canvas.style.pointerEvents = 'none';
        _AL.canvas.removeEventListener('click', _alienHitTest);
    }
}

function _alienShowFolder() {
    if (_AL.folderEl) return;
    const ov = document.getElementById('blacksmith-overlay');
    if (!ov) return;
    const or = ov.getBoundingClientRect();
    _AL.folderX = Math.round(or.width / 2 - _AL.folderW / 2);
    const f = document.createElement('div');
    f.id = 'alien-folder';
    f.style.cssText = `position:fixed;left:${or.left + _AL.folderX}px;top:${or.bottom - 90}px;` +
        `width:${_AL.folderW}px;height:26px;` +
        `background:#c88a18;border:2px solid #8a5a00;border-top:5px solid #e8a820;border-radius:0 5px 2px 2px;` +
        `cursor:grab;z-index:10000;display:flex;align-items:center;justify-content:center;` +
        `font-family:var(--font-pixel);font-size:6px;color:#3a1a00;letter-spacing:1px;` +
        `user-select:none;pointer-events:auto;box-shadow:1px 2px 6px rgba(0,0,0,0.5);`;
    f.textContent = 'CHARACTER SHEET';
    f.addEventListener('mousedown', e => {
        _AL.folderDrag = true;
        _AL.folderDragOffX = e.clientX - or.left - _AL.folderX;
        f.style.cursor = 'grabbing'; e.preventDefault();
    });
    document.addEventListener('mousemove', _folderMove);
    document.addEventListener('mouseup', _folderUp);
    document.body.appendChild(f);
    _AL.folderEl = f;
}

function _folderMove(e) {
    if (!_AL.folderDrag || !_AL.folderEl) return;
    const ov = document.getElementById('blacksmith-overlay');
    if (!ov) return;
    const or = ov.getBoundingClientRect();
    _AL.folderX = Math.max(0, Math.min(or.width - _AL.folderW, e.clientX - or.left - _AL.folderDragOffX));
    _AL.folderEl.style.left = (or.left + _AL.folderX) + 'px';
}
function _folderUp() { _AL.folderDrag = false; if (_AL.folderEl) _AL.folderEl.style.cursor = 'grab'; }

function _alienCatch() {
    _alienStep = 7; _AL.frame = 0;
    _AL.canvas.style.pointerEvents = 'none';
    if (_AL.folderEl) { _AL.folderEl.remove(); _AL.folderEl = null; }
    document.removeEventListener('mousemove', _folderMove);
    document.removeEventListener('mouseup', _folderUp);
    if (!persist.unlockedCharacters.includes('alien')) {
        persist.unlockedCharacters.push('alien');
        savePersist(persist);
        showNotif('ALIEN UNLOCKED! First contact established.');
    } else {
        showNotif('First contact... again. The alien seems confused.');
    }
    setTimeout(() => {
        _alienCleanup();
        const g = document.getElementById('bs-alien-gimmick');
        if (g) { g.style.height = '22px'; g.innerHTML = '<div style="font-family:var(--font-pixel);font-size:7px;color:#69f0ae;text-align:center;padding:5px;letter-spacing:2px;">ALIEN UNLOCKED</div>'; }
    }, 1800);
}

// ── Title letters init ──
function _initBsTitleLetters() {
    const wrap = document.getElementById('bs-title-letters');
    if (!wrap) return;
    wrap.innerHTML = '';
    'BLACKSMITH'.split('').forEach(ch => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.cssText = 'cursor:default;transition:color 0.12s;';
        if (ch === 'A') {
            const isReaper = state.player.charReaper === true || state.player.character === 'reaper';
            if (isReaper) {
                span.style.cursor = 'pointer';
                span.addEventListener('mouseenter', () => { if (_alienStep === 0) span.style.color = '#ffe082'; });
                span.addEventListener('mouseleave', () => { if (_alienStep === 0) span.style.color = ''; });
                span.addEventListener('click', () => {
                    if (_alienStep !== 0) return;
                    _AL.aSpan = span;
                    const co = _alienCoords(span);
                    _AL.aX = co.x; _AL.aY = co.y;
                    _AL.ufoX = co.x;
                    _AL.ufoY = co.y - 80;
                    _AL.ufoBaseY = co.y - 14;
                    _AL.aRiseY = 0; _AL.aAlpha = 1;
                    span.style.visibility = 'hidden';
                    _alienStep = 1;
                    _alienStartCanvas();
                });
            }
        }
        wrap.appendChild(span);
    });
}

function toggleBlacksmith() {
    if (state.upgradeOpen || state.evolveOpen || state.petEvolveOpen || state.gamerShopOpen || state.gameOver || !state.difficulty) return;
    state.blacksmithOpen = !state.blacksmithOpen;
    state.paused = state.blacksmithOpen;
    const el = document.getElementById('blacksmith-overlay');
    if (state.blacksmithOpen) { el.classList.remove('hidden'); _initBsTitleLetters(); renderBlacksmith(); }
    else { el.classList.add('hidden'); if (_alienStep > 0) _alienCleanup(); }
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

