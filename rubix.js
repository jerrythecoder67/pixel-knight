// ─── RUBIX MINIGAME ───
// 3×3 grid, 3 colors (red/blue/green). Solved when each row is all one color.
// Arrow keys: left/right rotate the focused row, up/down shift focused row.

(function() {
    const COLORS = ['#f44336', '#1565c0', '#2e7d32']; // R, B, G
    const SOLVED = [[0,0,0],[1,1,1],[2,2,2]]; // each row = one color
    let grid = [];
    let focusRow = 0;

    function randomizeGrid() {
        // Create solved grid then shuffle rows by rotating randomly
        grid = SOLVED.map(row => [...row]);
        for (let s = 0; s < 30; s++) {
            const r = Math.floor(Math.random() * 3);
            const shift = 1 + Math.floor(Math.random() * 2);
            rotateRow(r, shift);
        }
        // Make sure it's not already solved after randomizing
        if (isSolved()) randomizeGrid();
    }

    function rotateRow(row, n) {
        for (let i = 0; i < n; i++) {
            grid[row].push(grid[row].shift());
        }
    }

    function isSolved() {
        return grid.every(row => row.every(c => c === row[0]));
    }

    function renderRubix() {
        const rc = document.getElementById('rubixCanvas');
        if (!rc) return;
        const rctx = rc.getContext('2d');
        rctx.clearRect(0, 0, 180, 180);
        const cellSize = 56;
        const gap = 4;
        const offX = 6, offY = 6;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const x = offX + c * (cellSize + gap);
                const y = offY + r * (cellSize + gap);
                rctx.fillStyle = COLORS[grid[r][c]];
                rctx.fillRect(x, y, cellSize, cellSize);
                // Inner highlight
                rctx.fillStyle = 'rgba(255,255,255,0.2)';
                rctx.fillRect(x + 3, y + 3, cellSize - 6, 6);
                // Dark border
                rctx.strokeStyle = '#111';
                rctx.lineWidth = 2;
                rctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            }
            // Focus indicator: bright border on focused row
            if (r === focusRow) {
                rctx.strokeStyle = '#ffd600';
                rctx.lineWidth = 3;
                rctx.strokeRect(offX - 3, offY + r * (cellSize + gap) - 3, 3 * (cellSize + gap) - gap + 6, cellSize + 6);
            }
        }
        // Color labels on left
        const labelColors = ['#ef9a9a','#90caf9','#a5d6a7'];
        for (let r = 0; r < 3; r++) {
            rctx.fillStyle = labelColors[r];
            rctx.font = 'bold 9px monospace';
            rctx.textAlign = 'right';
            rctx.fillText(['ROW 1','ROW 2','ROW 3'][r], offX - 5, offY + r * (cellSize + gap) + cellSize / 2 + 3);
        }
    }

    function openRubixMinigame() {
        if (!state.hasRubixCube) return;
        randomizeGrid();
        focusRow = 0;
        document.getElementById('rubix-overlay').classList.remove('hidden');
        state.paused = true;
        renderRubix();
        updateStatus();
    }

    function closeRubixMinigame() {
        document.getElementById('rubix-overlay').classList.add('hidden');
        state.paused = false;
    }

    function updateStatus() {
        const el = document.getElementById('rubix-status');
        if (el) el.textContent = 'Row ' + (focusRow + 1) + ' selected — ← → rotate, ↑ ↓ change row';
    }

    document.getElementById('rubix-close-btn').addEventListener('click', closeRubixMinigame);

    document.addEventListener('keydown', function(e) {
        const overlay = document.getElementById('rubix-overlay');
        if (!overlay || overlay.classList.contains('hidden')) return;
        e.preventDefault();
        if (e.key === 'ArrowLeft') { rotateRow(focusRow, 2); renderRubix(); } // rotate left = rotate by 2 (3-1)
        if (e.key === 'ArrowRight') { rotateRow(focusRow, 1); renderRubix(); }
        if (e.key === 'ArrowUp') { focusRow = (focusRow + 2) % 3; renderRubix(); updateStatus(); }
        if (e.key === 'ArrowDown') { focusRow = (focusRow + 1) % 3; renderRubix(); updateStatus(); }
        if (e.key === 'Escape') { closeRubixMinigame(); return; }
        if (isSolved()) {
            document.getElementById('rubix-status').textContent = 'SOLVED! Achievement unlocked!';
            state.hasRubixCube = false;
            if (!persist.achievements.rubixCuberUnlock) grantAchievement('rubixCuberUnlock');
            setTimeout(closeRubixMinigame, 1500);
        }
    });

    // Expose to global scope for input.js
    window.openRubixMinigame = openRubixMinigame;
})();
