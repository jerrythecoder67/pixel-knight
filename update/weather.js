// ─── WEATHER TICK, SHADOW DEMON, ANGEL ───
function updateWeather() {
    const p = state.player;

    // ─── WEATHER TICK ───
    const _wx = state.weather;
    const _ws = _wx.extreme || (_wx.stage > 0 ? WEATHER_STAGES[_wx.stage] : null);
    if (_ws) {
        // Lightning strikes — instakill enemies, half-HP player, start fires
        if (_ws.lightningChance && Math.random() < _ws.lightningChance) {
            const lx = state.camera.x + Math.random() * 800;
            const ly = state.camera.y + Math.random() * 600;
            state.lightningEffects.push({ x: lx, y: ly, life: 22, alpha: 1 });
            // Hit enemies in 192px (6 tiles) radius — instakill non-bosses, half HP on bosses
            const _strikeR = 192;
            for (const e of state.enemies) {
                if (Math.hypot(e.x - lx, e.y - ly) < _strikeR) {
                    if (e.isBoss) { e.hp = Math.max(1, Math.floor(e.hp / 2)); }
                    else { e.hp = 0; }
                    e.hitFlash = 8;
                    state.damageNumbers.push({ x: e.x, y: e.y, value: e.isBoss ? Math.floor(e.maxHp / 2) : e.maxHp, life: 50, crit: true });
                }
            }
            // Start fires at the strike point — random 1-8 second duration
            const fireDur = 60 + Math.floor(Math.random() * 420); // 1-8s in frames
            for (let fi = 0; fi < 6; fi++) {
                state.fireTrails.push({ x: lx + (Math.random()-0.5)*80, y: ly + (Math.random()-0.5)*80, life: fireDur, damage: 12 });
            }
            // Hit player if in range
            const pd = Math.hypot(p.x - lx, p.y - ly);
            if (pd < _strikeR) {
                const dmg = Math.floor(p.maxHp / 2);
                p.hp -= dmg;
                createExplosion(p.x, p.y, '#ffffaa');
                showNotif('LIGHTNING STRIKE! -' + dmg + ' HP!');
            }
            _wx.lightningFlash = 10;
        }
        if (_wx.lightningFlash > 0) _wx.lightningFlash--;
        // Hail damage to player every 3s
        if (_ws.hail && state.frame % 180 === 0) {
            p.hp -= 3; createExplosion(p.x, p.y, '#aaddff'); showNotif('Hail batters you!');
        }
        // Tornado: moves around world and pulls player
        if (_ws.tornado) {
            _wx.tornadoX += Math.sin(state.frame * 0.01) * 1.5;
            _wx.tornadoY += Math.cos(state.frame * 0.008) * 1.2;
            _wx.tornadoX = Math.max(200, Math.min(WORLD_W - 200, _wx.tornadoX));
            _wx.tornadoY = Math.max(200, Math.min(WORLD_H - 200, _wx.tornadoY));
            const td = Math.hypot(p.x - _wx.tornadoX, p.y - _wx.tornadoY);
            if (td < 300) {
                const pull = (300 - td) / 300 * 2.5;
                p.x += (_wx.tornadoX - p.x) / (td || 1) * pull;
                p.y += (_wx.tornadoY - p.y) / (td || 1) * pull;
            }
        }
        // Fog patch drift
        if (_wx.fogPatches) {
            for (const fp of _wx.fogPatches) { fp.x += fp.drift; fp.x = ((fp.x - 100) % (WORLD_W + 200)) + 100; }
        }
        // Rain particles (spawn new ones each frame)
        if (_wx.stage > 0 && state.frame % 2 === 0) {
            const intensity = _wx.stage === 1 ? 3 : _wx.stage === 2 ? 7 : 12;
            for (let ri = 0; ri < intensity; ri++) {
                _wx.rainParticles.push({
                    x: state.camera.x + Math.random() * 820,
                    y: state.camera.y - 10,
                    vy: 8 + Math.random() * 4,
                    vx: -1 + Math.random() * 0.5,
                    life: 60 + Math.random() * 30
                });
            }
        }
        // Tick rain particles
        for (let ri = _wx.rainParticles.length - 1; ri >= 0; ri--) {
            const r = _wx.rainParticles[ri];
            r.x += r.vx; r.y += r.vy; r.life--;
            if (r.life <= 0) _wx.rainParticles.splice(ri, 1);
        }
    } else {
        _wx.rainParticles.length = 0;
        if (_wx.fogPatches) _wx.fogPatches.length = 0;
    }

    // Shadow demon: very rare world threat (after 20 kills, ~4% per 5s check)
    if (state.frame % 300 === 0 && !state.shadowDemonActive && !state.bossActive && state.postBossCooldown === 0 && p.kills >= 20) {
        if (Math.random() < 0.04) spawnShadowDemon();
    }

    // Angel: appears when player HP < 10, heals fully and smites nearby foes
    if (state.angelCooldown > 0) state.angelCooldown--;
    if (state.angelTimer > 0) state.angelTimer--;
    if (p.hp > 0 && p.hp < 10 && state.angelCooldown === 0 && Math.random() < 0.03) {
        p.hp = p.maxHp;
        state.angelTimer = 160;
        state.angelCooldown = 18000;
        state.runAngelHeals++;
        let smited = 0;
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - p.x, e.y - p.y) < 260 && !e.isBoss && !e.isShadowDemon) {
                e.hp = -9999; createExplosion(e.x, e.y, '#ffd700'); smited++;
            }
        });
        for (let i = 0; i < 24; i++) {
            const ga = Math.random() * Math.PI * 2;
            state.particles.push({ x: p.x + Math.cos(ga)*40, y: p.y + Math.sin(ga)*40, vx: Math.cos(ga)*4, vy: Math.sin(ga)*4 - 2, life: 80, color: '#ffd700' });
        }
        showNotif('An Angel descended! Healed!' + (smited > 0 ? ' ' + smited + ' foes smited!' : ''));
    }
}
