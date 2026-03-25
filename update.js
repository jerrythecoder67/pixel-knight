// ─── UPDATE ───
function update() {
    if (state.gameOver) return;
    // Tutorial always processes first (handles key detection + step pausing)
    if (state.tutorial && state.tutorial.active) updateTutorial();
    if (state.tutorial && state.tutorial.active && state.tutorial.promptPhase) return;
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
    // Skip local player update when spectating (dead guest) — camera driven by host position in mpApplyState
    if (typeof MP === 'undefined' || !MP._spectating) updatePlayer();

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
