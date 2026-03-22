// ─── MID-RUN EVENT TICK ───
function updateEvents() {
    const p = state.player;

    if (state.activeEvent) {
        if (state.activeEvent.duration > 0) {
            state.activeEvent.timer--;
            if (state.activeEvent.timer <= 0) {
                state.activeEvent.remove(state, p);
                state.activeEvent = null;
            }
        }
        // Meteor shower: spawn fireballs from sky every 45 frames
        if (state._meteorActive && state.frame % 45 === 0) {
            const mx = state.camera.x + Math.random() * 800;
            const my = state.camera.y + Math.random() * 600;
            hitEnemies(mx, my, 60, 25, false, true);
            if (p.hp > 0) {
                const pdist = Math.hypot(p.x - mx, p.y - my);
                if (pdist < 60) { p.hp -= 8; createExplosion(mx, my, '#ff6600'); }
            }
            createExplosion(mx, my, '#ff4400');
        }
        // Healing spring: restore 1 HP every 90 frames
        if (state._healSpringActive) {
            state._healSpringTimer++;
            if (state._healSpringTimer % 90 === 0) p.hp = Math.min(p.maxHp, p.hp + 1);
        }
        // Eclipse: +30% enemy dmg and hp already applied via flag in enemy logic
        // Frost: slow enemies (applied in enemy speed check below via _frostActive flag)
    }
}
