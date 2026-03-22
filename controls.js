// ─── MOBILE & CONTROLLER SUPPORT ───

// ── Mobile: show controls only on touch devices ──
(function initTouchDetect() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('mobile-controls').style.display = 'block';
    }
})();

// ── Mobile: Virtual Joystick ──
const _JOY_RADIUS = 55;
let _joyTouch = null; // { id, cx, cy }

const _joyZone = document.getElementById('joy-zone');
const _joyKnob = document.getElementById('joy-knob');

function _resetJoy() {
    _joyTouch = null;
    state.joyDir = null;
    if (_joyKnob) _joyKnob.style.transform = 'translate(-50%, -50%)';
}

_joyZone.addEventListener('touchstart', e => {
    if (!state.difficulty || state.gameOver || state.paused) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const r = _joyZone.getBoundingClientRect();
    _joyTouch = { id: t.identifier, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}, { passive: false });

_joyZone.addEventListener('touchmove', e => {
    if (!_joyTouch) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier !== _joyTouch.id) continue;
        let dx = t.clientX - _joyTouch.cx;
        let dy = t.clientY - _joyTouch.cy;
        const dist = Math.hypot(dx, dy);
        if (dist > _JOY_RADIUS) { dx = dx / dist * _JOY_RADIUS; dy = dy / dist * _JOY_RADIUS; }
        state.joyDir = { x: dx / _JOY_RADIUS, y: dy / _JOY_RADIUS };
        if (_joyKnob) _joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
}, { passive: false });

_joyZone.addEventListener('touchend', e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (_joyTouch && e.changedTouches[i].identifier === _joyTouch.id) _resetJoy();
    }
}, { passive: false });
_joyZone.addEventListener('touchcancel', _resetJoy, { passive: false });

// ── Mobile: Attack & Dash buttons ──
document.getElementById('m-attack').addEventListener('touchstart', e => {
    e.preventDefault();
    if (state.difficulty && !state.gameOver && !state.paused) {
        if (!state.player.charDragon) playerAttack();
    }
}, { passive: false });

document.getElementById('m-dash').addEventListener('touchstart', e => {
    e.preventDefault();
    if (state.difficulty && !state.gameOver && !state.paused) tryDash();
}, { passive: false });


// ── Gamepad / Controller Support ──
// Layout: Left stick = move, Right stick = aim, A=attack, B=dash,
// Start=pause, LB/RB=cycle weapons, X=open menu (shop/forge/upgrades/skills/pet), Y=special
let _gpPrev = {}; // previous button states for edge detection

function _gpBtn(gp, idx) { return gp.buttons[idx] && gp.buttons[idx].pressed; }
function _gpBtnEdge(gp, idx) {
    const now = _gpBtn(gp, idx);
    const prev = !!_gpPrev[idx];
    _gpPrev[idx] = now;
    return now && !prev;
}

// Cycle through available in-game menus for X button
let _gpMenuIdx = 0;
const _GP_MENUS = [
    { id: 'shop-btn',         open: () => typeof toggleShop === 'function' && toggleShop() },
    { id: 'blacksmith-btn',   open: () => typeof toggleBlacksmith === 'function' && toggleBlacksmith() },
    { id: 'upgrade-btn',      open: () => typeof openUpgradeMenu === 'function' && openUpgradeMenu() },
    { id: 'skill-tree-btn',   open: () => typeof openSkillTree === 'function' && openSkillTree() },
    { id: 'pet-upgrade-btn',  open: () => typeof openPetEvolve === 'function' && openPetEvolve() },
];

function _gpOpenNextMenu() {
    for (let tries = 0; tries < _GP_MENUS.length; tries++) {
        _gpMenuIdx = (_gpMenuIdx + 1) % _GP_MENUS.length;
        const entry = _GP_MENUS[_gpMenuIdx];
        const el = document.getElementById(entry.id);
        if (el && !el.classList.contains('hidden')) { entry.open(); return; }
    }
}

// Map Y to character special ability (varies by character)
function _gpSpecial() {
    const p = state.player;
    // Sailor: toggle telescope
    if (p.charSailor) { state.telescopeActive = !state.telescopeActive; showNotif(state.telescopeActive ? 'Telescope: looking ahead...' : 'Telescope down.'); return; }
    // Diver: dive toggle (space normally does dash; diver uses 'e'?)
    if (p.charDiver && typeof triggerDiverDive === 'function') { triggerDiverDive(); return; }
    // Witch: use potion
    if (p.charWitch) { useWitchPotion(); return; }
    // Robot: use ability
    if (p.charRobot && typeof robotAbility === 'function') { robotAbility(); return; }
    // Default: nothing (or could open bestiary, etc.)
}

function pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) { state.gamepadActive = false; return; }
    state.gamepadActive = true;

    const inMenu = state.gameOver || state.paused || state.upgradeOpen || state.shopOpen ||
                   state.skillTreeOpen || state.evolveOpen || state.petEvolveOpen ||
                   state.characterSelectOpen || !state.difficulty;

    // Left stick → movement (axes 0,1)
    const lx = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1]) > 0.15 ? gp.axes[1] : 0;
    state.joyDir = (lx !== 0 || ly !== 0) ? { x: lx, y: ly } : null;

    // Right stick → aim direction (axes 2,3)
    const rx = Math.abs(gp.axes[2]) > 0.2 ? gp.axes[2] : 0;
    const ry = Math.abs(gp.axes[3]) > 0.2 ? gp.axes[3] : 0;
    if (rx !== 0 || ry !== 0) {
        // Convert right-stick to canvas space facing direction
        state.gamepadDir = { x: rx, y: ry };
        const p = state.player;
        if (!inMenu) {
            // Point mouse in the aim direction from player center
            const cam = state.camera;
            state.mouse.x = (p.x - cam.x) + rx * 120;
            state.mouse.y = (p.y - cam.y) + ry * 120;
            // Update facing
            const rl = Math.hypot(rx, ry);
            p.facingX = rx / rl; p.facingY = ry / rl;
        }
    }

    if (inMenu) { _gpPrev = {}; return; } // skip action buttons in menus

    // A (idx 0) = attack
    if (_gpBtnEdge(gp, 0)) { if (!state.player.charDragon) playerAttack(); }
    // B (idx 1) = dash
    if (_gpBtnEdge(gp, 1)) tryDash();
    // X (idx 2) = cycle open menus
    if (_gpBtnEdge(gp, 2)) _gpOpenNextMenu();
    // Y (idx 3) = special
    if (_gpBtnEdge(gp, 3)) _gpSpecial();
    // Start (idx 9) = pause
    if (_gpBtnEdge(gp, 9)) togglePause();
    // LB (idx 4) = cycle weapon left
    if (_gpBtnEdge(gp, 4)) cycleWeapon(-1);
    // RB (idx 5) = cycle weapon right
    if (_gpBtnEdge(gp, 5)) cycleWeapon(1);
}

// Weapon cycle helper
function cycleWeapon(dir) {
    const p = state.player;
    const slots = [1, 2, 3].filter(s => p.weaponSlots[s]);
    if (slots.length <= 1) return;
    const curSlot = Object.keys(p.weaponSlots).find(s => p.weaponSlots[s] === p.weapon) || 1;
    const idx = slots.indexOf(Number(curSlot));
    const next = slots[(idx + slots.length + dir) % slots.length];
    p.weapon = p.weaponSlots[next];
    showNotif('Weapon: ' + p.weapon.toUpperCase());
}

// Hook into the game loop — pollGamepad runs each frame
const _origRequestFrame = window.requestAnimationFrame.bind(window);
(function patchLoop() {
    const _origDraw = typeof draw === 'function' ? draw : null;
    // Poll gamepad every animation frame by patching the global loop flag
    const _gpInterval = setInterval(pollGamepad, 16); // ~60fps polling
})();
