// ─── DAY / NIGHT ───
function updateDayNight() {
    const p = state.player;
    const dn = state.dayNight;
    // Freeze day/night during tutorial — night step sets it manually via _tEnterStep
    if (state.tutorial && state.tutorial.active) return;
    if (state.mapVariant === 'cave') { dn.alpha = 0.45; } // cave: frozen dim
    else {
    const EVENING_FRAMES = 600;
    dn.timer--;
    // Evening warning: last 600 frames of day
    if (dn.phase === 'day' && dn.timer <= EVENING_FRAMES && !dn.eveningShown) {
        dn.eveningShown = true;
        showNotif('Night approaches...');
    }
    const targetAlpha = dn.phase === 'night' ? 1.0 : 0;
    dn.alpha += (targetAlpha - dn.alpha) * 0.018;
    if (dn.timer <= 0) {
        if (dn.phase === 'day') {
            dn.phase = 'night'; dn.timer = NIGHT_LEN; dn.eveningShown = false;
            showNotif('Night falls... enemies grow stronger!');
        } else {
            dn.phase = 'day'; dn.timer = DAY_LEN; dn.dayCount++;
            showNotif('Day ' + dn.dayCount + ' — you survived the night!');
        }
    }
    } // end non-cave branch
}
