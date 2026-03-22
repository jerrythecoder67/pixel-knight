// ─── TERRAIN ───
const terrainMap = [];
(function generateTerrain() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    for (let y = 0; y < rows; y++) {
        terrainMap[y] = [];
        for (let x = 0; x < cols; x++) {
            const n = Math.sin(x * 0.3) * Math.cos(y * 0.2) + Math.sin(x * 0.1 + y * 0.15) * 0.5;
            if (n > 0.7) terrainMap[y][x] = 'water';
            else if (n > 0.3) terrainMap[y][x] = 'stone';
            else if (n < -0.5) terrainMap[y][x] = 'dirt';
            else if (Math.random() < 0.05) terrainMap[y][x] = 'flower';
            else terrainMap[y][x] = Math.random() < 0.5 ? 'grass1' : 'grass2';
        }
    }
})();

// Lava pool generation: 1-2 organic pools placed away from center (player spawn)
(function generateLavaPools() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    const centerR = Math.floor(rows / 2), centerC = Math.floor(cols / 2);
    const poolCount = 1 + Math.floor(Math.random() * 2);
    for (let p = 0; p < poolCount; p++) {
        let cr, cc;
        do {
            cr = 8 + Math.floor(Math.random() * (rows - 16));
            cc = 8 + Math.floor(Math.random() * (cols - 16));
        } while (Math.abs(cr - centerR) < 20 && Math.abs(cc - centerC) < 20);
        // Varied sizes and border widths, like water clusters
        const baseRadius = 3 + Math.floor(Math.random() * 4);  // 3–6 tiles (tighter range)
        const borderWidth = 1 + Math.floor(Math.random() * 3); // 1–3 tile stone border
        // Unique noise params per pool for organic shape
        const ph1 = Math.random() * Math.PI * 2;
        const ph2 = Math.random() * Math.PI * 2;
        const ph3 = Math.random() * Math.PI * 2;
        const fr1 = 1 + Math.floor(Math.random() * 3); // 1-3 only (avoid 4-lobe '+' shape)
        const fr2 = 2 + Math.floor(Math.random() * 3); // 2-4
        const fr3 = 6 + Math.floor(Math.random() * 3); // 6-8 fine detail
        const maxScan = baseRadius * 2 + borderWidth;
        for (let dr = -maxScan; dr <= maxScan; dr++) {
            for (let dc = -maxScan; dc <= maxScan; dc++) {
                const tr = cr + dr, tc = cc + dc;
                if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) continue;
                if (terrainMap[tr][tc] === 'water') continue;
                const dist = Math.sqrt(dr * dr + dc * dc);
                const angle = Math.atan2(dr, dc);
                // Organic radius: low-freq shape + mid detail + fine noise
                const wobble = Math.sin(angle * fr1 + ph1) * 0.28 + Math.sin(angle * fr2 + ph2) * 0.18 + Math.sin(angle * fr3 + ph3) * 0.1;
                const lavaR = baseRadius * (1 + wobble);
                const stoneR = lavaR + borderWidth;
                if (dist <= lavaR) {
                    terrainMap[tr][tc] = 'lava';
                } else if (dist <= stoneR && terrainMap[tr][tc] !== 'lava') {
                    terrainMap[tr][tc] = 'stone';
                }
            }
        }
    }
    // Post-process: any water tile adjacent to lava becomes stone (no lava-water contact)
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (terrainMap[r][c] === 'water') {
                for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    if (terrainMap[r+dr]?.[c+dc] === 'lava') { terrainMap[r][c] = 'stone'; break; }
                }
            }
        }
    }
})();

// ─── LAKE PASSAGES ───
// Stone tiles between nearby lake clusters become underwater-only passages.
// terrainMap is NOT modified — passages are tracked in underwaterPassages.
const underwaterPassages = new Set(); // key = r * 10000 + c
(function generateLakePassages() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    const vis = Array.from({ length: rows }, () => new Uint8Array(cols));
    const clusters = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (vis[r][c] || terrainMap[r][c] !== 'water') continue;
            const tiles = [], q = [[r, c]]; vis[r][c] = 1;
            while (q.length) {
                const [cr, cc] = q.shift(); tiles.push([cr, cc]);
                for (const [dr2, dc2] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nr = cr+dr2, nc = cc+dc2;
                    if (nr>=0&&nr<rows&&nc>=0&&nc<cols&&!vis[nr][nc]&&terrainMap[nr][nc]==='water') { vis[nr][nc]=1; q.push([nr,nc]); }
                }
            }
            if (tiles.length >= 4) clusters.push(tiles);
        }
    }
    for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
            const a = clusters[i], b = clusters[j];
            const step = Math.max(1, Math.floor(Math.min(a.length, b.length) / 12));
            let bestDist = Infinity, bestA = null, bestB = null;
            for (let ai = 0; ai < a.length; ai += step) {
                for (let bi = 0; bi < b.length; bi += step) {
                    const d = Math.hypot(a[ai][0]-b[bi][0], a[ai][1]-b[bi][1]);
                    if (d < bestDist) { bestDist = d; bestA = a[ai]; bestB = b[bi]; }
                }
            }
            if (!bestA || bestDist > 14) continue;
            const dR = bestB[0] - bestA[0], dC = bestB[1] - bestA[1];
            // Use Manhattan*2 steps so round() never skips a tile (no checkered gaps)
            const scanSteps = (Math.abs(dR) + Math.abs(dC)) * 2;
            if (scanSteps < 2) continue;
            // Only create passage if path between them is entirely stone or water
            let allStoneOrWater = true;
            for (let s = 1; s < scanSteps; s++) {
                const pr = Math.round(bestA[0] + dR * s / scanSteps);
                const pc = Math.round(bestA[1] + dC * s / scanSteps);
                if (pr<0||pr>=rows||pc<0||pc>=cols) continue;
                const t = terrainMap[pr][pc];
                if (t !== 'stone' && t !== 'water') { allStoneOrWater = false; break; }
            }
            if (!allStoneOrWater) continue;
            // 3×3 square kernel at each step — fills all neighbors, no checkerboard on diagonals
            for (let s = 1; s < scanSteps; s++) {
                const pr = Math.round(bestA[0] + dR * s / scanSteps);
                const pc = Math.round(bestA[1] + dC * s / scanSteps);
                for (let oR = -1; oR <= 1; oR++) {
                    for (let oC = -1; oC <= 1; oC++) {
                        const pr2 = pr + oR, pc2 = pc + oC;
                        if (pr2>=0&&pr2<rows&&pc2>=0&&pc2<cols&&terrainMap[pr2][pc2]==='stone') {
                            underwaterPassages.add(pr2 * 10000 + pc2);
                        }
                    }
                }
            }
        }
    }
})();

// ─── FOREST SEEDS ───
// 7 forests: 5 biome-typed, 2 rare redwood-only
const FOREST_SEEDS = (function generateForestSeeds() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    const centerR = Math.floor(rows / 2), centerC = Math.floor(cols / 2);
    const seeds = [];
    const forestTypes = ['oak', 'pine', 'dead', 'fruit', 'pine'];
    for (let i = 0; i < 5; i++) {
        let fr, fc, attempts = 0;
        do {
            fr = 10 + Math.floor(Math.random() * (rows - 20));
            fc = 10 + Math.floor(Math.random() * (cols - 20));
            attempts++;
        } while (attempts < 30 && Math.abs(fr - centerR) < 8 && Math.abs(fc - centerC) < 8);
        seeds.push({ cr: fr, cc: fc, radius: 5 + Math.floor(Math.random() * 5), type: forestTypes[i] });
    }
    // 2 rare redwood forests (smaller, denser)
    for (let i = 0; i < 2; i++) {
        let fr, fc, attempts = 0;
        do {
            fr = 15 + Math.floor(Math.random() * (rows - 30));
            fc = 15 + Math.floor(Math.random() * (cols - 30));
            attempts++;
        } while (attempts < 30 && (Math.abs(fr - centerR) < 10 || Math.abs(fc - centerC) < 10));
        seeds.push({ cr: fr, cc: fc, radius: 3 + Math.floor(Math.random() * 2), type: 'redwood' });
    }
    return seeds;
})();

// ─── TREE POSITIONS ───
const WORLD_TREE_POSITIONS = [];
(function generateTreePositions() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    const centerR = Math.floor(rows / 2), centerC = Math.floor(cols / 2);

    for (let r = 2; r < rows - 2; r++) {
        for (let c = 2; c < cols - 2; c++) {
            const t = terrainMap[r][c];
            if (t === 'water' || t === 'lava' || t === 'stone' || t === 'void') continue;
            // Keep clear around spawn
            if (Math.abs(r - centerR) < 6 && Math.abs(c - centerC) < 6) continue;

            // Check if inside a forest seed
            let forestType = null;
            for (const seed of FOREST_SEEDS) {
                const dist = Math.hypot(r - seed.cr, c - seed.cc);
                if (dist <= seed.radius) { forestType = seed.type; break; }
            }

            // Density: forests are denser (~4%), open world is sparser (~1.2%)
            const seed = (r * 7919 + c * 3571) % 1000;
            const threshold = forestType ? 40 : 12;
            if (seed >= threshold) continue;

            // Assign tree type
            let treeType;
            if (forestType) {
                treeType = forestType;
            } else {
                // Check neighbors for terrain hints
                const hasStone = [[-1,0],[1,0],[0,-1],[0,1]].some(([dr,dc]) => terrainMap[r+dr]?.[c+dc] === 'stone');
                const hasWater = [[-1,0],[1,0],[0,-1],[0,1]].some(([dr,dc]) => terrainMap[r+dr]?.[c+dc] === 'water');
                if (hasWater && seed % 100 < 60) treeType = 'fruit';
                else if (hasStone && seed % 100 < 55) treeType = 'pine';
                else if (seed % 100 < 5) treeType = 'dead';
                else treeType = 'oak';
            }

            WORLD_TREE_POSITIONS.push({ tx: c * TILE + TILE / 2, ty: r * TILE + TILE / 2, treeType });
        }
    }
})();

// ─── TERRAIN HELPERS ───
function getTerrainAt(wx, wy) {
    const tc = Math.floor(wx / TILE), tr = Math.floor(wy / TILE);
    if (tr < 0 || tr >= terrainMap.length || tc < 0) return 'grass1';
    const row = terrainMap[tr]; if (!row) return 'grass1';
    return row[tc] || 'grass1';
}
function isOnWater(wx, wy) { return getTerrainAt(wx, wy) === 'water'; }
function isOnLava(wx, wy) { return getTerrainAt(wx, wy) === 'lava'; }
function isPassageTile(wx, wy) {
    const tc = Math.floor(wx / TILE), tr = Math.floor(wy / TILE);
    return underwaterPassages.has(tr * 10000 + tc);
}
function canStayUnderwater(wx, wy) { return isOnWater(wx, wy) || isPassageTile(wx, wy); }

// ─── LAKE DETECTION ───
const lakes = [];
(function findLakes() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (visited[r][c] || terrainMap[r][c] !== 'water') continue;
            const tiles = [], queue = [[r, c]];
            visited[r][c] = 1;
            while (queue.length) {
                const [cr, cc] = queue.shift();
                tiles.push([cr, cc]);
                for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nr = cr+dr, nc = cc+dc;
                    if (nr>=0&&nr<rows&&nc>=0&&nc<cols&&!visited[nr][nc]&&terrainMap[nr][nc]==='water') {
                        visited[nr][nc] = 1; queue.push([nr, nc]);
                    }
                }
            }
            const sumR = tiles.reduce((s,t)=>s+t[0],0)/tiles.length;
            const sumC = tiles.reduce((s,t)=>s+t[1],0)/tiles.length;
            lakes.push({ size: tiles.length, cx: (sumC+0.5)*TILE, cy: (sumR+0.5)*TILE });
        }
    }
})();

// ─── LAVA POOL DETECTION ───
const lavaPools = [];
(function findLavaPools() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (visited[r][c] || terrainMap[r][c] !== 'lava') continue;
            const tiles = [], queue = [[r, c]];
            visited[r][c] = 1;
            while (queue.length) {
                const [cr, cc] = queue.shift();
                tiles.push([cr, cc]);
                for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nr = cr+dr, nc = cc+dc;
                    if (nr>=0&&nr<rows&&nc>=0&&nc<cols&&!visited[nr][nc]&&terrainMap[nr][nc]==='lava') {
                        visited[nr][nc] = 1; queue.push([nr, nc]);
                    }
                }
            }
            const sumR = tiles.reduce((s,t)=>s+t[0],0)/tiles.length;
            const sumC = tiles.reduce((s,t)=>s+t[1],0)/tiles.length;
            lavaPools.push({ size: tiles.length, cx: (sumC+0.5)*TILE, cy: (sumR+0.5)*TILE });
        }
    }
})();

// ─── DINO WORLD: rocky badlands — stone, dirt, bone dust ───
function applyDinoWorldTerrain() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const t = terrainMap[r][c];
            const rng = (r * 1000 + c * 7) % 100; // deterministic pseudo-random
            if (t === 'flower') {
                // Flowers become stone rubble or dirt
                terrainMap[r][c] = rng < 60 ? 'stone' : 'dirt';
            } else if (t === 'grass2') {
                // Lush grass becomes dry dirt
                terrainMap[r][c] = rng < 70 ? 'dirt' : 'stone';
            } else if (t === 'grass1') {
                // Some grass survives, most becomes dirt
                if (rng < 55) terrainMap[r][c] = 'dirt';
                else if (rng < 75) terrainMap[r][c] = 'stone';
            }
            // lava, water, stone already unchanged
        }
    }
}

// ─── MAP VARIANT: ISLAND — organic coastline with sand beach ───
function applyIslandVariant() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    const centerR = rows / 2, centerC = cols / 2;
    const ph1 = Math.random() * Math.PI * 2, ph2 = Math.random() * Math.PI * 2;
    const ph3 = Math.random() * Math.PI * 2, ph4 = Math.random() * Math.PI * 2;
    // Track only tiles converted BY the island variant (not pre-existing interior lakes)
    const islandWater = new Set();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (terrainMap[r][c] === 'water') continue; // skip pre-existing water
            const dr = (r - centerR) / centerR, dc = (c - centerC) / centerC;
            const dist = Math.sqrt(dr * dr + dc * dc);
            const angle = Math.atan2(dr, dc);
            const noise = Math.sin(angle * 3 + ph1) * 0.07
                        + Math.sin(angle * 5 + ph2) * 0.04
                        + Math.sin(angle * 9 + ph3) * 0.025
                        + Math.sin(angle * 15 + ph4) * 0.012;
            if (dist > 0.80 + noise) {
                terrainMap[r][c] = 'water';
                islandWater.add(r * 10000 + c);
            }
        }
    }
    // Sand beach: expand 1-3 tiles inward from island border water only
    const sandDepth = 1 + Math.floor(Math.random() * 3); // 1-3 tile beach width
    let frontier = new Set();
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (terrainMap[r][c] === 'water') continue;
            const adj4 = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
            if (adj4.some(([ar,ac]) => islandWater.has(ar*10000+ac))) frontier.add(r*10000+c);
        }
    }
    for (let depth = 0; depth < sandDepth; depth++) {
        const next = new Set();
        for (const key of frontier) {
            const r = Math.floor(key / 10000), c = key % 10000;
            if (terrainMap[r][c] !== 'lava' && terrainMap[r][c] !== 'water') {
                terrainMap[r][c] = 'sand';
            }
            // Expand frontier one more tile inward for next depth pass
            if (depth < sandDepth - 1) {
                for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nr = r+dr, nc = c+dc;
                    if (nr>0&&nr<rows-1&&nc>0&&nc<cols-1&&terrainMap[nr][nc]!=='water'&&terrainMap[nr][nc]!=='sand'&&terrainMap[nr][nc]!=='lava')
                        next.add(nr*10000+nc);
                }
            }
        }
        frontier = next;
    }
}

// ─── MAP VARIANT: CANYON — chasm down the middle with slight diagonal + wood bridges ───
function applyCanyonVariant() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    const halfW = 4; // canyon half-width in tiles
    // Two wood bridge spans
    const bridge1Lo = Math.floor(cols * 0.33), bridge1Hi = Math.floor(cols * 0.38);
    const bridge2Lo = Math.floor(cols * 0.62), bridge2Hi = Math.floor(cols * 0.67);
    const bridgeCols = new Set();
    for (let c = bridge1Lo; c <= bridge1Hi; c++) bridgeCols.add(c);
    for (let c = bridge2Lo; c <= bridge2Hi; c++) bridgeCols.add(c);
    // Record centerR per column so we can place bridges at the right rows
    const centerRAt = {};
    for (let c = 0; c < cols; c++) {
        if (bridgeCols.has(c)) continue;
        // Centered with a gentle 20% diagonal (not corner-to-corner) + sine noise
        const slope = Math.round((c / (cols - 1) - 0.5) * rows * 0.20);
        const noise = Math.round(Math.sin(c * 0.09) * 8 + Math.sin(c * 0.03) * 5);
        const cR = Math.max(halfW + 2, Math.min(rows - halfW - 3, Math.floor(rows / 2) + slope + noise));
        centerRAt[c] = cR;
        for (let dr = -halfW; dr <= halfW; dr++) {
            const r = cR + dr;
            if (r >= 0 && r < rows) terrainMap[r][c] = 'void';
        }
    }
    // Stone border along canyon edges
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (terrainMap[r][c] !== 'void') {
                const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
                if (adj.some(([ar,ac]) => terrainMap[ar]?.[ac] === 'void') && terrainMap[r][c] !== 'lava') {
                    terrainMap[r][c] = 'stone';
                }
            }
        }
    }
    // Mark bridge tiles as wooden planks using neighboring centerR
    for (const bc of bridgeCols) {
        const nearL = centerRAt[bc - 1], nearR = centerRAt[bc + 1];
        const bCenterR = nearL !== undefined ? nearL : nearR !== undefined ? nearR : Math.floor(rows / 2);
        for (let dr = -halfW; dr <= halfW; dr++) {
            const r = bCenterR + dr;
            if (r >= 0 && r < rows && terrainMap[r][bc] !== 'void' && terrainMap[r][bc] !== 'stone' && terrainMap[r][bc] !== 'lava') {
                terrainMap[r][bc] = 'bridge';
            }
        }
    }
}

// ─── MAP VARIANT: CAVE — all stone, no grass/trees, extra lava, permanent dim ───
function applyCaveVariant() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const t = terrainMap[r][c];
            if (t === 'grass1' || t === 'grass2' || t === 'dirt' || t === 'flower') {
                terrainMap[r][c] = 'stone';
            }
        }
    }
    // Extra lava pools (2-4 more)
    const centerR = Math.floor(rows / 2), centerC = Math.floor(cols / 2);
    const extraPools = 2 + Math.floor(Math.random() * 3);
    for (let p = 0; p < extraPools; p++) {
        let cr, cc;
        do {
            cr = 10 + Math.floor(Math.random() * (rows - 20));
            cc = 10 + Math.floor(Math.random() * (cols - 20));
        } while (Math.abs(cr - centerR) < 15 && Math.abs(cc - centerC) < 15);
        const baseR = 2 + Math.floor(Math.random() * 5);
        for (let dr = -baseR - 1; dr <= baseR + 1; dr++) {
            for (let dc = -baseR - 1; dc <= baseR + 1; dc++) {
                const nr = cr + dr, nc = cc + dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                const d = Math.hypot(dr, dc);
                if (d <= baseR) terrainMap[nr][nc] = 'lava';
                else if (d <= baseR + 1 && terrainMap[nr][nc] !== 'lava') terrainMap[nr][nc] = 'stone';
            }
        }
    }
}

// ─── SAILOR / PIRATE WORLD: invert land and water ───
function applySailorWorldTerrain() {
    const cols = Math.ceil(WORLD_W / TILE), rows = Math.ceil(WORLD_H / TILE);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const t = terrainMap[r][c];
            if (t === 'water') terrainMap[r][c] = 'grass1';
            else if (t !== 'lava' && t !== 'stone') terrainMap[r][c] = 'water';
        }
    }
}
