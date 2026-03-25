// ─── AUDIO ───
const _audio = (() => {
    let _ctx = null;
    let _musicInterval = null;
    let _musicStart = 0;
    let _outroQueued = false;
    let _outroBeat   = -1; // absolute beat index where outro locks in (-1 = not scheduled)

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

    // ── BGM ── C minor (with harmonic minor flavour), 128 BPM
    // Structure: Intro (×1) → [A B C A D] loop → Outro on playOutro()
    // Melodies by user; bass/harmony/intro/transition/outro by arrangement.
    // Voice 1: square melody | Voice 2: triangle bass | Voice 3: square harmony (half-note pace)
    const HALF = 60 / 128 / 2; // ~0.234s per 8th note
    const SEC  = 32;            // steps per section

    // Frequency reference (C minor / harmonic minor)
    // G3=196  Ab3=207  Bb3=233  B3=247  C4=262  D4=294  Eb4=311
    // F4=349  G4=392  Ab4=415  Bb4=466  B4=494  C5=523  D5=587
    // Eb5=622  F5=698  G5=784  Ab5=831  Bb5=932  C6=1047

    // ── A — Cm/G7 — main hook ────────────────────────────────────────────
    const MEL_A  = [262,330,392,523, 392,330,349,294,
                    247,294,349,392, 349,294,330,262,
                    262,330,392,523, 392,330,440,349,
                    294,349,392,392, 247,247,262,0  ];
    // Bass: bar1 ascending run C-E-G, bar2 sparse, bar3 run again, bar4 descending run G-F-E-D resolve C
    const BASS_A = [131,165,196,0, 0,0,0,0, 196,0,0,0, 262,0,0,0,
                    131,165,196,0, 0,0,0,0, 196,175,165,147, 131,0,0,0 ];
    // Harmony: one chord tone per bar, checked consonant against melody's beat-1 note
    // pos 0: C4+G4=P5 ✓  pos 8: B3+B4=octave ✓  pos 16: C4+G4=P5 ✓  pos 24: D4+B4=M6 ✓
    const HARM_A = [392,0,0,0,0,0,0,0, 494,0,0,0,0,0,0,0,
                    392,0,0,0,0,0,0,0, 494,0,0,0,0,0,0,0 ];

    // ── B — same progression, octave higher ──────────────────────────────
    const MEL_B  = [523,659,784,1047, 784,659,698,587,
                    784,698,659,587,  523,392,523,0,
                    523,659,784,1047, 784,988,880,698,
                    784,698,659,587,  659,587,523,0  ];
    // bar2 & bar4: descending run G-F-E with resolve; bar1 & bar3 sparse
    const BASS_B = [131,0,0,0, 196,0,0,0, 196,175,165,0, 131,0,0,0,
                    131,0,0,0, 196,0,0,0, 196,175,165,147, 131,0,0,0 ];
    // pos 0: C5+G4=P5 ✓  pos 8: G5+B4=m3 ✓  pos 16: C5+G4 ✓  pos 24: G5+B4 ✓
    const HARM_B = [392,0,0,0,0,0,0,0, 494,0,0,0,0,0,0,0,
                    392,0,0,0,0,0,0,0, 494,0,0,0,0,0,0,0 ];

    // ── C — rhythmic driving section ─────────────────────────────────────
    const MEL_C  = [262,0,330,0, 294,0,247,0,
                    262,0,330,0, 349,0,392,0,
                    440,0,349,349, 392,0,330,330,
                    349,330,294,247, 262,196,262,0  ];
    // bar1 ascending run C-E-G, bar3 F-G-A run, bar4 descending F-E-D-C
    const BASS_C = [131,165,196,0, 0,0,0,0, 131,0,0,0, 175,0,0,0,
                    175,196,220,0, 196,0,0,0, 175,165,147,131, 131,0,0,0 ];
    // Just one harmony note on bar 1 — melody is busy enough everywhere else
    const HARM_C = [392,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,   0,0,0,0,0,0,0,0  ];

    // ── D — transition: Cm/G7, builds tension back to A ──────────────────
    const MEL_D  = [523,659,784,659, 523,392,330,262,
                    494,587,698,784, 698,587,494,392,
                    523,659,784,659, 523,392,330,262,
                    494,392,494,587, 784,698,659,523  ];
    // bar2 descending G-F-E, bar4 ascending run G-A-B-C4 building tension
    const BASS_D = [131,0,0,0, 196,0,0,0, 196,175,165,0, 131,0,0,0,
                    131,0,0,0, 196,0,0,0, 196,220,247,262, 196,0,0,0 ];
    // pos 0: C5+C5=unison ✓  pos 8: B4+B4=unison ✓  pos 28: G5+C5=P5 ✓
    const HARM_D = [523,0,0,0,0,0,0,0, 494,0,0,0,0,0,0,0,
                    523,0,0,0,0,0,0,0, 494,0,0,0,523,0,0,0 ];

    // ── INTRO — sparse → full, previews the A hook ───────────────────────
    const MEL_I  = [262,0,392,0, 523,0,392,0,
                    262,330,392,523, 392,330,349,0,
                    262,330,392,523, 392,330,349,294,
                    247,294,349,392, 349,294,330,262  ];
    const BASS_I = [0,0,0,0,0,0,0,0,   0,0,0,0,0,0,0,0,
                    131,0,165,0, 0,0,0,0, 196,0,0,0, 262,0,0,0 ];
    const HARM_I = [0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0, 392,0,0,0,0,0,0,0  ];

    // ── OUTRO — A hook reprise → descend → final C ───────────────────────
    const MEL_O  = [262,330,392,523, 392,330,349,294,
                    247,294,349,392, 349,294,330,262,
                    523,392,330,262, 196,0,0,0,
                    262,0,0,0,       0,0,0,0      ];
    // bar1 ascending run, bar3 descending run G-F-E-D-C, bar4 fades to silence
    const BASS_O = [131,165,196,0, 0,0,0,0, 196,0,0,0, 262,0,0,0,
                    196,175,165,147, 131,0,0,0, 131,0,0,0, 0,0,0,0  ];
    const HARM_O = [392,0,0,0,0,0,0,0, 494,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,   0,0,0,0,0,0,0,0   ];

    // Loop order: A B C A D
    const LOOP = [
        { mel:MEL_A, bass:BASS_A, x:HARM_A, xt:'square',   xd:0.72, xv:0.06 },
        { mel:MEL_B, bass:BASS_B, x:HARM_B, xt:'square',   xd:0.85, xv:0.05 },
        { mel:MEL_C, bass:BASS_C, x:HARM_C, xt:'square',   xd:0.72, xv:0.06 },
        { mel:MEL_A, bass:BASS_A, x:HARM_A, xt:'square',   xd:0.72, xv:0.06 },
        { mel:MEL_D, bass:BASS_D, x:HARM_D, xt:'triangle', xd:0.88, xv:0.07 },
    ];
    const LOOP_LEN = LOOP.length * SEC; // 160

    function _playRow(mel, bass, x, xt, xd, xv, si, t) {
        if (mel[si])  tone(mel[si],  'square',   HALF * 0.80, 0.13, t);
        if (bass[si]) tone(bass[si], 'triangle', HALF * 0.88, 0.19, t);
        if (x[si])    tone(x[si],    xt, HALF * xd, xv, t);
    }

    function _sched() {
        try {
            const c = ac(), now = c.currentTime, LA = 1.2;
            const from = Math.floor((now - _musicStart) / HALF);
            const to   = from + Math.ceil(LA / HALF) + 2;

            // Lock outro to next section boundary once queued
            if (_outroQueued && _outroBeat < 0) {
                const postIntro = from - SEC;
                _outroBeat = postIntro < 0
                    ? SEC  // still in intro → start outro right after it
                    : SEC + Math.ceil((postIntro + 1) / SEC) * SEC;
                _outroQueued = false;
            }

            for (let b = Math.max(0, from); b <= to; b++) {
                const t = _musicStart + b * HALF;
                if (t < now - 0.01) continue;

                // Outro
                if (_outroBeat >= 0 && b >= _outroBeat) {
                    const oi = b - _outroBeat;
                    if (oi >= SEC) {
                        clearInterval(_musicInterval); _musicInterval = null; _outroBeat = -1;
                        return;
                    }
                    _playRow(MEL_O, BASS_O, HARM_O, 'square', 0.72, 0.06, oi, t);
                    continue;
                }

                // Intro
                if (b < SEC) {
                    _playRow(MEL_I, BASS_I, HARM_I, 'square', 0.72, 0.05, b, t);
                    continue;
                }

                // Main loop A B C A D
                const li = (b - SEC) % LOOP_LEN;
                const s  = LOOP[Math.floor(li / SEC)];
                _playRow(s.mel, s.bass, s.x, s.xt, s.xd, s.xv, li % SEC, t);
            }
        } catch(e) {}
    }

    function startMusic() {
        if (_musicInterval) clearInterval(_musicInterval);
        _musicInterval = null;
        _outroQueued = false;
        _outroBeat   = -1;
        try {
            const ctx = ac();
            ctx.resume().catch(() => {});
            _musicStart = ctx.currentTime + 0.1;
            _sched();
            _musicInterval = setInterval(_sched, 900);
        } catch(e) {}
    }

    // Graceful game-over ending — finishes current section then plays outro
    function playOutro() {
        if (_outroQueued || _outroBeat >= 0) return;
        _outroQueued = true;
    }

    function stopMusic() {
        if (_musicInterval) { clearInterval(_musicInterval); _musicInterval = null; }
        _outroQueued = false; _outroBeat = -1;
    }

    return { sfx, startMusic, stopMusic, playOutro };
})();

// Start music on first user interaction
document.addEventListener('click',   () => _audio.startMusic(), { once: true });
document.addEventListener('keydown', () => _audio.startMusic(), { once: true });
