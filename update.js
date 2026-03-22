// ─── UPDATE ───
function update() {
    if (state.gameOver) return;
    // MP host: keep simulation running while paused (shop/upgrade) so guests aren't frozen.
    // Only applies after the game has actually started (not during lobby).
    // Host player is shielded (immune to damage) while paused.
    const _mpRunning = typeof MP !== 'undefined' && MP.active && MP.isHost && MP.gameStarted;
    if (typeof MP !== 'undefined') MP.hostShielded = state.paused && _mpRunning;
    if (state.paused && !_mpRunning) return;
    state.frame++;
    state.pacifistTimer++;
    if (state.frame % 120 === 0) checkAchievements();

    updateDayNight();
    updateCharacterEffects();
    updatePlayer();

    if (!MP.active || MP.isHost) {
        // Host and single-player: run full simulation
        updateEnemies();
        updateCreatures();
        updateNature();
        updateWave();
        updateEvents();
    } else {
        // Guest: only run local effects; enemies/wave come from host snapshots
        updateNature(); // particles/fire trails still render locally
        // Animate enemy sprites locally between host snapshots
        state.enemies.forEach(e => { e.animTimer = (e.animTimer || 0) + 1; if (e.hurtTimer > 0) e.hurtTimer--; });
    }

    updateWeather();
    updatePets();
    updateHud();

    // Multiplayer per-frame actions
    if (MP.active) {
        if (MP.isHost) {
            mpUpdateGuestPlayers();
            mpBroadcastState();
        } else {
            mpSendInputs();
        }
    }
}
