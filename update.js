// ─── UPDATE ───
function update() {
    if (state.gameOver || state.paused) return;
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
