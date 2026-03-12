// ─── AUDIO ───
const _audio = (() => {
    let _ctx = null;
    let _musicInterval = null;
    let _musicStart = 0;

    function ac() {
        if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (_ctx.state === 'suspended') _ctx.resume();
        return _ctx;
    }
    function tone(freq, type, dur, vol, when) {
        try {
            const c = ac(), t = when || c.currentTime;
            const osc = c.createOscillator(), g = c.createGain();
            osc.connect(g); g.connect(c.destination);
            osc.type = type; osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.start(t); osc.stop(t + dur + 0.01);
        } catch(e) {}
    }
    const sfx = {
        swing(){}, hit(){}, death(){}, hurt(){}, gold(){}, dash(){},
        upgrade(){}, boss(){}, achievement(){}, click(){}, explode(){}, heal(){},
    };

    // BGM — simple chiptune Am-F-C-G loop (8th-note steps, 128 BPM)
    const HALF = 60 / 128 / 2; // ~0.234s per 8th note
    const MEL  = [440,523,659,784,659,523,440,330, 349,440,523,440,349,262,349,440,
                  262,330,392,523,392,330,262,330, 392,294,392,587,392,294,392,440];
    const BASS = [220,0,220,0,220,0,220,0,  175,0,175,0,175,0,175,0,
                  131,0,131,0,131,0,131,0,  196,0,196,0,196,0,196,0];

    function _sched() {
        try {
            const c = ac(), now = c.currentTime, LA = 1.2;
            const from = Math.floor((now - _musicStart) / HALF);
            const to   = from + Math.ceil(LA / HALF) + 2;
            for (let b = Math.max(0, from); b <= to; b++) {
                const t = _musicStart + b * HALF;
                if (t < now - 0.01) continue;
                const idx = ((b % MEL.length) + MEL.length) % MEL.length;
                if (MEL[idx])  tone(MEL[idx],  'square',   HALF * 0.78, 0.12, t);
                if (BASS[idx]) tone(BASS[idx], 'triangle', HALF * 0.88, 0.18, t);
            }
        } catch(e) {}
    }

    function startMusic() {
        if (_musicInterval) return;
        try {
            const ctx = ac();
            ctx.resume().catch(() => {});
            _musicStart = ctx.currentTime + 0.1;
            _sched();
            _musicInterval = setInterval(_sched, 900);
        } catch(e) {}
    }
    function stopMusic() {
        if (_musicInterval) { clearInterval(_musicInterval); _musicInterval = null; }
    }

    return { sfx, startMusic, stopMusic };
})();

// Start music on first user interaction (before mode selection)
document.addEventListener('click', () => _audio.startMusic(), { once: true });
document.addEventListener('keydown', () => _audio.startMusic(), { once: true });
