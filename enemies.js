/**
 * Pixel Drifter - Enemy & Boss Definitions
 * 10 enemy types with elite variants, boss versions
 */

// 10 base enemy types - unlocked progressively via boss kills
const ENEMY_TYPES = [
    { type: 'slime', hp: 80, speed: 1.2, color: '#4caf50', gold: 8, score: 100, size: 1 },
    { type: 'skeleton', hp: 120, speed: 1.5, color: '#d4c89a', gold: 15, score: 150, size: 1 },
    { type: 'wraith', hp: 60, speed: 2.0, color: '#7b1fa2', gold: 12, score: 200, size: 1 },
    { type: 'troll', hp: 200, speed: 0.8, color: '#388e3c', gold: 30, score: 300, size: 1.4, knockbackResist: 0.3 },
    { type: 'imp', hp: 50, speed: 2.5, color: '#e91e63', gold: 10, score: 120, size: 0.8 },
    { type: 'golem', hp: 400, speed: 0.6, color: '#795548', gold: 40, score: 400, size: 1.6, knockbackResist: 0.8 },
    { type: 'vampire', hp: 100, speed: 1.8, color: '#880088', gold: 20, score: 250, size: 1 },
    { type: 'spider', hp: 70, speed: 2.2, color: '#333', gold: 14, score: 180, size: 0.9 },
    { type: 'wizard', hp: 90, speed: 1.0, color: '#1565c0', gold: 25, score: 280, size: 1 },
    { type: 'demon', hp: 200, speed: 1.6, color: '#b71c1c', gold: 35, score: 350, size: 1.3, knockbackResist: 0.3 },
    { type: 'mimic', hp: 180, speed: 2.4, color: '#5c3317', gold: 80, score: 500, size: 1 },
    { type: 'necromancer', hp: 130, speed: 1.1, color: '#4a0e8f', gold: 30, score: 320, size: 1 },
];

// Human enemy types — used in Monster game mode
const HUMAN_ENEMY_TYPES = [
    { type: 'villager', hp: 40, speed: 1.8, color: '#795548', gold: 10, score: 80, size: 0.85 },
    { type: 'guardKnight', hp: 150, speed: 1.2, color: '#546e7a', gold: 20, score: 160, size: 1 },
    { type: 'humanArcher', hp: 80, speed: 1.3, color: '#2e7d32', gold: 16, score: 140, size: 0.9, isRanged: true },
    { type: 'crossbowman', hp: 90, speed: 1.1, color: '#1565c0', gold: 18, score: 160, size: 0.95, isRanged: true },
    { type: 'captain', hp: 280, speed: 1.0, color: '#b71c1c', gold: 45, score: 380, size: 1.2, knockbackResist: 0.2 },
    { type: 'paladin', hp: 500, speed: 0.7, color: '#ffd700', gold: 80, score: 600, size: 1.5, knockbackResist: 0.6, isBossType: true },
];

const SAILOR_ENEMY_TYPES = [
    { type: 'eel',       hp: 80,  speed: 2.8, color: '#004d40', gold: 20, score: 200, size: 1.0, waterOnly: true },
    { type: 'piranha',   hp: 55,  speed: 3.2, color: '#c62828', gold: 14, score: 150, size: 0.8, waterOnly: true },
    { type: 'shark',     hp: 200, speed: 2.2, color: '#607d8b', gold: 30, score: 300, size: 1.4, waterOnly: true },
    { type: 'octopus',   hp: 120, speed: 1.0, color: '#9c27b0', gold: 25, score: 250, size: 1.2, waterOnly: true, webbing: true },
    { type: 'seaCroc',   hp: 170, speed: 1.6, color: '#33691e', gold: 28, score: 270, size: 1.2, waterOnly: true },
    { type: 'jellyfish', hp: 60,  speed: 0.7, color: '#e040fb', gold: 18, score: 180, size: 1.0, waterOnly: true },
    { type: 'mantaRay',  hp: 140, speed: 2.0, color: '#37474f', gold: 22, score: 240, size: 1.4, waterOnly: true },
];

const DINO_ENEMY_TYPES = [
    { type: 'raptor',       hp: 75,  speed: 2.6, color: '#558b2f', gold: 12, score: 130, size: 0.85 },
    { type: 'pterodactyl',  hp: 90,  speed: 1.8, color: '#78909c', gold: 18, score: 200, size: 0.9 },
    { type: 'triceratops',  hp: 260, speed: 0.9, color: '#4e7c59', gold: 32, score: 320, size: 1.4, knockbackResist: 0.35 },
    { type: 'ankylosaurus', hp: 420, speed: 0.5, color: '#795548', gold: 45, score: 430, size: 1.6, knockbackResist: 0.8 },
];

const ALIEN_ENEMY_TYPES = [
    { type: 'xeno',      hp: 90,  speed: 2.1, color: '#00bfa5', gold: 15, score: 150, size: 1.0 },
    { type: 'alienDrone',hp: 45,  speed: 3.2, color: '#b2ff59', gold: 8,  score: 90,  size: 0.8 },
    { type: 'hiveMind',  hp: 250, speed: 1.2, color: '#69f0ae', gold: 50, score: 500, size: 1.4, knockbackResist: 0.2 },
    { type: 'parasite',  hp: 30,  speed: 3.8, color: '#76ff03', gold: 6,  score: 60,  size: 0.7 },
];

function drawEnemySprite(ctx, e, ex, ey) {
    const bob = Math.sin(e.animTimer * 0.1) * 2;
    const s = e.elite ? 1.25 : 1;
    ctx.save();
    ctx.translate(ex, ey + bob);
    ctx.scale(s * (e.sizeScale || 1), s * (e.sizeScale || 1));

    // Tamed glow (green, pulsing)
    if (e.isTamed) {
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 10 + Math.sin(e.animTimer * 0.15) * 5;
    }
    // Elite glow
    if (e.elite) {
        ctx.shadowColor = '#ff0'; ctx.shadowBlur = 8;
    }
    if (e.isBoss) {
        ctx.shadowColor = '#f00'; ctx.shadowBlur = 14;
    }

    switch (e.type) {
        case 'slime': {
            const sq = 1 + Math.sin(e.animTimer * 0.15) * 0.15;
            ctx.fillStyle = e.color;
            ctx.fillRect(-8 * sq, -6 / sq, 16 * sq, 12 / sq);
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(-6 * sq, -4 / sq, 12 * sq, 4 / sq);
            ctx.fillStyle = '#fff';
            ctx.fillRect(-5, -5, 3, 3); ctx.fillRect(2, -5, 3, 3);
            ctx.fillStyle = '#000';
            ctx.fillRect(-4, -4, 2, 2); ctx.fillRect(3, -4, 2, 2);
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(-3, 0, 6, 2);
            break;
        }
        case 'skeleton': {
            ctx.fillStyle = e.color;
            ctx.fillRect(-6, -12, 12, 10);
            ctx.fillStyle = '#000';
            ctx.fillRect(-4, -10, 3, 3); ctx.fillRect(1, -10, 3, 3); ctx.fillRect(-2, -6, 4, 2);
            ctx.fillStyle = e.color;
            ctx.fillRect(-4, -2, 8, 8);
            ctx.fillStyle = '#000';
            ctx.fillRect(-2, 0, 1, 4); ctx.fillRect(1, 0, 1, 4);
            ctx.fillStyle = e.color;
            ctx.fillRect(-4, 6, 3, 6); ctx.fillRect(1, 6, 3, 6);
            ctx.fillStyle = '#888';
            ctx.fillRect(7, -8, 2, 14);
            ctx.fillStyle = '#654';
            ctx.fillRect(6, 4, 4, 3);
            break;
        }
        case 'wraith': {
            ctx.globalAlpha = 0.6 + Math.sin(e.animTimer * 0.05) * 0.2;
            ctx.fillStyle = e.color;
            ctx.fillRect(-7, -10, 14, 16);
            ctx.fillStyle = '#4a148c';
            ctx.fillRect(-8, -14, 16, 8);
            ctx.fillStyle = '#e040fb';
            ctx.fillRect(-4, -10, 3, 2); ctx.fillRect(1, -10, 3, 2);
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = e.color;
                ctx.globalAlpha = 0.3 + Math.sin(e.animTimer * 0.08 + i) * 0.2;
                ctx.fillRect(-7 + i * 3, 6, 2, 4 + Math.sin(e.animTimer * 0.1 + i) * 3);
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'troll': {
            // Body — stocky green
            ctx.fillStyle = e.color;
            ctx.fillRect(-10, -12, 20, 20);
            // Belly stripe
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(-8, -4, 16, 6);
            // Big bulbous nose
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(-4, -8, 8, 6);
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(-3, -6, 6, 4);
            // Beady yellow eyes
            ctx.fillStyle = '#fdd835';
            ctx.fillRect(-7, -11, 4, 3); ctx.fillRect(3, -11, 4, 3);
            ctx.fillStyle = '#000';
            ctx.fillRect(-6, -10, 2, 2); ctx.fillRect(4, -10, 2, 2);
            // Club (left hand)
            ctx.fillStyle = '#4e342e';
            ctx.fillRect(-18, -10, 4, 14);
            ctx.fillStyle = '#6d4c41';
            ctx.fillRect(-20, -14, 8, 5);
            // Arms + legs
            ctx.fillStyle = e.color;
            ctx.fillRect(10, -6, 4, 10);
            ctx.fillRect(-8, 8, 5, 6); ctx.fillRect(3, 8, 5, 6);
            break;
        }
        case 'imp': {
            ctx.fillStyle = e.color;
            ctx.fillRect(-5, -8, 10, 12);
            ctx.fillStyle = '#880e4f';
            ctx.fillRect(-10, -7, 5, 6); ctx.fillRect(5, -7, 5, 6);
            ctx.fillStyle = '#ff0';
            ctx.fillRect(-3, -6, 2, 2); ctx.fillRect(1, -6, 2, 2);
            ctx.fillStyle = e.color;
            ctx.fillRect(5, 2, 6, 2); ctx.fillRect(9, 0, 2, 2);
            break;
        }
        case 'golem': {
            ctx.fillStyle = e.color;
            ctx.fillRect(-12, -14, 24, 24);
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(-10, -10, 20, 6);
            ctx.fillStyle = '#ff0';
            ctx.fillRect(-6, -8, 4, 3); ctx.fillRect(2, -8, 4, 3);
            ctx.fillStyle = e.color;
            ctx.fillRect(-16, -4, 4, 14); ctx.fillRect(12, -4, 4, 14);
            ctx.fillRect(-10, 10, 7, 6); ctx.fillRect(3, 10, 7, 6);
            ctx.fillStyle = '#4e342e';
            ctx.fillRect(-8, 2, 16, 4);
            break;
        }
        case 'vampire': {
            ctx.fillStyle = '#222';
            ctx.fillRect(-8, -6, 16, 14);
            ctx.fillStyle = '#dbb';
            ctx.fillRect(-5, -12, 10, 8);
            ctx.fillStyle = e.color;
            ctx.fillRect(-10, -14, 20, 6);
            ctx.fillStyle = '#f00';
            ctx.fillRect(-4, -8, 3, 2); ctx.fillRect(1, -8, 3, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(-2, -4, 1, 3); ctx.fillRect(1, -4, 1, 3);
            ctx.fillStyle = '#222';
            ctx.fillRect(-12, -4, 4, 10); ctx.fillRect(8, -4, 4, 10);
            break;
        }
        case 'spider': {
            ctx.fillStyle = e.color;
            ctx.fillRect(-6, -5, 12, 10);
            ctx.fillStyle = '#f00';
            for (let i = 0; i < 4; i++) { ctx.fillRect(-3 + i * 2, -4, 1, 1); }
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(-10 + Math.sin(e.animTimer * 0.1 + i) * 2, -3 + i * 3, 4, 2);
                ctx.fillRect(6 - Math.sin(e.animTimer * 0.1 + i) * 2, -3 + i * 3, 4, 2);
            }
            break;
        }
        case 'wizard': {
            ctx.fillStyle = e.color;
            ctx.fillRect(-6, -4, 12, 14);
            ctx.fillStyle = '#0d47a1';
            ctx.fillRect(-7, -14, 14, 12);
            ctx.fillRect(-4, -18, 8, 4);
            ctx.fillStyle = '#ff0';
            ctx.fillRect(-1, -20, 2, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(-4, -8, 3, 2); ctx.fillRect(1, -8, 3, 2);
            ctx.fillStyle = '#8b6914';
            ctx.fillRect(7, -12, 2, 20);
            ctx.fillStyle = '#4fc3f7';
            ctx.beginPath(); ctx.arc(8, -14, 3, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'demon': {
            ctx.fillStyle = e.color;
            ctx.fillRect(-8, -10, 16, 18);
            ctx.fillStyle = '#f00';
            ctx.fillRect(-10, -16, 4, 8); ctx.fillRect(6, -16, 4, 8);
            ctx.fillStyle = '#ff0';
            ctx.fillRect(-5, -6, 3, 3); ctx.fillRect(2, -6, 3, 3);
            ctx.fillStyle = '#000';
            ctx.fillRect(-3, -2, 6, 2);
            ctx.fillStyle = e.color;
            ctx.fillRect(-12, -2, 4, 10); ctx.fillRect(8, -2, 4, 10);
            ctx.fillRect(-6, 8, 4, 6); ctx.fillRect(2, 8, 4, 6);
            ctx.fillStyle = '#880000';
            ctx.fillRect(-14, -6, 6, 4); ctx.fillRect(8, -6, 6, 4);
            break;
        }
        case 'mimic': {
            if (e.dormant) {
                // Looks identical to a treasure chest — blend in
                ctx.fillStyle = '#5c3317'; ctx.fillRect(-13, 1, 26, 13);
                ctx.fillStyle = '#7a4520'; ctx.fillRect(-13, -8, 26, 11);
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(-13, -8, 26, 22);
                ctx.fillStyle = '#ffd700'; ctx.fillRect(-4, -2, 8, 7);
                ctx.fillStyle = '#aa8800'; ctx.fillRect(-2, 0, 4, 4);
                // Subtle tell: tiny red eyes flicker in the latch every few seconds
                if (Math.floor(e.animTimer / 55) % 4 === 0) {
                    ctx.fillStyle = '#ff2200';
                    ctx.fillRect(-3, 1, 2, 1); ctx.fillRect(1, 1, 2, 1);
                }
                ctx.restore(); return; // skip HP bar while dormant
            }
            // Awake: gaping chest monster with teeth and legs
            ctx.fillStyle = '#3d1a07'; ctx.fillRect(-13, 0, 26, 16);
            ctx.fillStyle = '#5c2a10'; ctx.fillRect(-13, -12, 26, 14);
            ctx.strokeStyle = '#7a5500'; ctx.lineWidth = 2; ctx.strokeRect(-13, -12, 26, 28);
            // Bottom teeth
            ctx.fillStyle = '#e8d8a0';
            ctx.fillRect(-10, -2, 3, 7); ctx.fillRect(-4, -2, 3, 7); ctx.fillRect(2, -2, 3, 7); ctx.fillRect(8, -2, 3, 7);
            // Top teeth
            ctx.fillRect(-9, -12, 3, 6); ctx.fillRect(-3, -12, 3, 6); ctx.fillRect(3, -12, 3, 6); ctx.fillRect(9, -12, 3, 6);
            // Tongue
            ctx.fillStyle = '#cc2200'; ctx.fillRect(-3, 4, 6, 8); ctx.fillRect(-2, 12, 4, 4);
            // Glowing red eyes
            ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#ff2200'; ctx.fillRect(-8, -8, 5, 4); ctx.fillRect(3, -8, 5, 4);
            ctx.fillStyle = '#ff8800'; ctx.fillRect(-7, -7, 3, 2); ctx.fillRect(4, -7, 3, 2);
            ctx.shadowBlur = 0;
            // Stubby legs
            ctx.fillStyle = '#3d1a07'; ctx.fillRect(-10, 15, 7, 7); ctx.fillRect(3, 15, 7, 7);
            break;
        }
        case 'necromancer': {
            // Dark robe
            ctx.fillStyle = '#1a0035'; ctx.fillRect(-7, -2, 14, 18);
            ctx.fillStyle = '#110026'; ctx.fillRect(-9, 8, 18, 8);
            // Hood
            ctx.fillStyle = '#1a0035'; ctx.fillRect(-8, -14, 16, 14); ctx.fillRect(-4, -20, 8, 8);
            // Skull face
            ctx.fillStyle = '#d0c890'; ctx.fillRect(-5, -12, 10, 10);
            ctx.fillStyle = '#000'; ctx.fillRect(-4, -10, 3, 3); ctx.fillRect(1, -10, 3, 3);
            ctx.fillRect(-2, -6, 4, 2);
            // Staff
            ctx.fillStyle = '#2d0055'; ctx.fillRect(8, -18, 2, 24);
            // Skull orb
            ctx.shadowColor = '#9c27b0'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#d0c890'; ctx.beginPath(); ctx.arc(9, -20, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#9c27b0'; ctx.beginPath(); ctx.arc(9, -20, 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Pulsing purple wisp orbiting the skull orb
            const wa = e.animTimer * 0.12;
            ctx.fillStyle = `rgba(156,39,176,${0.5 + Math.sin(wa) * 0.3})`;
            ctx.beginPath(); ctx.arc(9 + Math.cos(wa) * 5, -20 + Math.sin(wa) * 4, 2, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'shadowDemon': {
            // Dark aura wisps
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#6600cc';
            for (let w = 0; w < 5; w++) {
                const wx = Math.sin(e.animTimer * 0.07 + w * 1.26) * 14;
                const wy = Math.cos(e.animTimer * 0.05 + w * 1.26) * 10;
                ctx.fillRect(wx - 4, wy - 26 - w * 3, 8, 10);
            }
            ctx.globalAlpha = 1;
            // Body
            ctx.fillStyle = '#0d001a'; ctx.fillRect(-14, -18, 28, 32);
            // Shoulders
            ctx.fillStyle = '#1a0030';
            ctx.fillRect(-18, -14, 6, 18); ctx.fillRect(12, -14, 6, 18);
            // Horns
            ctx.fillStyle = '#2d0055';
            ctx.fillRect(-17, -30, 6, 16); ctx.fillRect(11, -30, 6, 16);
            ctx.fillRect(-19, -36, 5, 8); ctx.fillRect(14, -36, 5, 8);
            // Eyes glowing red
            ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-8, -12, 6, 5); ctx.fillRect(2, -12, 6, 5);
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(-7, -11, 4, 3); ctx.fillRect(3, -11, 4, 3);
            ctx.shadowBlur = 0;
            // Mouth
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(-5, -2, 10, 3);
            ctx.fillStyle = '#ff2200';
            ctx.fillRect(-4, -1, 2, 4); ctx.fillRect(-1, -1, 2, 4); ctx.fillRect(2, -1, 2, 4);
            // Claws
            ctx.fillStyle = '#1a0030';
            ctx.fillRect(-20, 4, 6, 14); ctx.fillRect(14, 4, 6, 14);
            ctx.fillStyle = '#3d0070';
            ctx.fillRect(-23, 16, 4, 5); ctx.fillRect(-20, 18, 4, 5); ctx.fillRect(-17, 16, 4, 5);
            ctx.fillRect(19, 16, 4, 5); ctx.fillRect(16, 18, 4, 5); ctx.fillRect(13, 16, 4, 5);
            break;
        }
        // ── Human enemies (Monster mode) ──
        case 'villager': {
            // Peasant — no armor, rough tunic, terrified expression
            ctx.fillStyle = '#795548'; ctx.fillRect(-4, 6, 3, 6); ctx.fillRect(1, 6, 3, 6); // legs
            ctx.fillStyle = '#5d4037'; ctx.fillRect(-4, 10, 3, 3); ctx.fillRect(1, 10, 3, 3); // shoes
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(-5, -6, 10, 14); // tunic
            ctx.fillStyle = '#a1887f'; ctx.fillRect(-7, -3, 2, 9); ctx.fillRect(5, -3, 2, 9); // arms
            ctx.fillStyle = '#ffb74d'; ctx.fillRect(-4, -16, 8, 12); // face
            ctx.fillStyle = '#795548'; ctx.fillRect(-4, -18, 8, 4); // rough hair
            ctx.fillStyle = '#000'; ctx.fillRect(-3, -13, 2, 2); ctx.fillRect(1, -13, 2, 2); // wide scared eyes
            ctx.fillRect(-2, -9, 4, 1); // grimace
            // Pitchfork
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(-10, -18, 2, 24);
            ctx.fillStyle = '#a0522d'; ctx.fillRect(-12, -22, 2, 6); ctx.fillRect(-8, -22, 2, 6);
            break;
        }
        case 'guardKnight': {
            // Standard human knight — grey/blue armor
            ctx.fillStyle = '#37474f'; ctx.fillRect(-4, 10, 4, 3); ctx.fillRect(1, 10, 4, 3); // boots
            ctx.fillStyle = '#546e7a'; ctx.fillRect(-4, 6, 3, 5); ctx.fillRect(1, 6, 3, 5); // greaves
            ctx.fillStyle = '#455a64'; ctx.fillRect(-6, -8, 12, 16); // chest
            ctx.fillStyle = '#546e7a'; ctx.fillRect(-8, -4, 2, 10); ctx.fillRect(6, -4, 2, 10); // pauldrons
            ctx.fillStyle = '#b0bec5'; ctx.fillRect(-5, -4, 10, 6); // breastplate shine
            ctx.fillStyle = '#b0bec5'; ctx.fillRect(-4, -16, 8, 10); // helmet
            ctx.fillStyle = '#90a4ae'; ctx.fillRect(-2, -12, 4, 2); // visor
            // Sword
            ctx.fillStyle = '#90a4ae'; ctx.fillRect(8, -20, 2, 22); ctx.fillStyle = '#ffd700'; ctx.fillRect(6, -4, 6, 2);
            break;
        }
        case 'humanArcher': {
            // Green-cloaked archer
            ctx.fillStyle = '#2e7d32'; ctx.fillRect(-4, 10, 3, 3); ctx.fillRect(1, 10, 3, 3); // boots
            ctx.fillStyle = '#388e3c'; ctx.fillRect(-4, 6, 3, 5); ctx.fillRect(1, 6, 3, 5); // leggings
            ctx.fillStyle = '#1b5e20'; ctx.fillRect(-6, -8, 12, 16); // cloak body
            ctx.fillStyle = '#2e7d32'; ctx.fillRect(-8, -4, 2, 10); ctx.fillRect(6, -4, 2, 10); // arms
            ctx.fillStyle = '#ffb74d'; ctx.fillRect(-4, -16, 8, 10); // face
            ctx.fillStyle = '#2e7d32'; ctx.fillRect(-5, -20, 10, 6); // hood
            ctx.fillStyle = '#000'; ctx.fillRect(-3, -13, 2, 2); ctx.fillRect(1, -13, 2, 2);
            // Bow
            ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(-13, -8, 10, -0.9, 0.9); ctx.stroke();
            ctx.fillStyle = '#ddd'; ctx.fillRect(-14, -8, 1, 2); ctx.fillRect(-4, -8, 1, 2); // bowstring
            // Arrow
            ctx.fillStyle = '#a0522d'; ctx.fillRect(-14, -9, 10, 1); ctx.fillStyle = '#b0bec5'; ctx.fillRect(-4, -10, 2, 3);
            break;
        }
        case 'crossbowman': {
            // Blue-armored crossbowman
            ctx.fillStyle = '#0d47a1'; ctx.fillRect(-4, 10, 3, 3); ctx.fillRect(1, 10, 3, 3);
            ctx.fillStyle = '#1565c0'; ctx.fillRect(-4, 6, 3, 5); ctx.fillRect(1, 6, 3, 5);
            ctx.fillStyle = '#0d47a1'; ctx.fillRect(-6, -8, 12, 16);
            ctx.fillStyle = '#1976d2'; ctx.fillRect(-8, -4, 2, 10); ctx.fillRect(6, -4, 2, 10);
            ctx.fillStyle = '#ffb74d'; ctx.fillRect(-4, -16, 8, 10);
            ctx.fillStyle = '#0d47a1'; ctx.fillRect(-4, -20, 8, 6); ctx.fillRect(-2, -22, 4, 4); // closed helmet
            ctx.fillStyle = '#90a4ae'; ctx.fillRect(-3, -16, 6, 2); // visor slit
            // Crossbow stock
            ctx.fillStyle = '#5d4037'; ctx.fillRect(7, -6, 10, 4);
            ctx.fillStyle = '#78909c'; ctx.fillRect(8, -8, 8, 2); ctx.fillRect(15, -9, 3, 4); // bow arms
            break;
        }
        case 'captain': {
            // Red-armored captain — bigger, more imposing
            ctx.fillStyle = '#b71c1c'; ctx.fillRect(-5, 10, 4, 4); ctx.fillRect(2, 10, 4, 4);
            ctx.fillStyle = '#c62828'; ctx.fillRect(-5, 5, 4, 6); ctx.fillRect(2, 5, 4, 6);
            ctx.fillStyle = '#b71c1c'; ctx.fillRect(-7, -8, 14, 18);
            ctx.fillStyle = '#ef5350'; ctx.fillRect(-6, -4, 12, 6); // breastplate
            ctx.fillStyle = '#c62828'; ctx.fillRect(-10, -4, 3, 12); ctx.fillRect(7, -4, 3, 12); // pauldrons
            ctx.fillStyle = '#c62828'; ctx.fillRect(-5, -20, 10, 14); // helmet
            ctx.fillStyle = '#ef5350'; ctx.fillRect(-2, -24, 4, 6); // red plume
            ctx.fillStyle = '#90a4ae'; ctx.fillRect(-4, -16, 8, 2); // visor
            ctx.fillStyle = '#000'; ctx.fillRect(-3, -15, 6, 1); // visor slit
            // Big sword
            ctx.fillStyle = '#90a4ae'; ctx.fillRect(9, -28, 3, 32); ctx.fillStyle = '#ffd700'; ctx.fillRect(6, -6, 8, 2);
            break;
        }
        case 'paladin': {
            // Gold-armored paladin boss
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#f9a825'; ctx.fillRect(-6, 12, 5, 4); ctx.fillRect(2, 12, 5, 4);
            ctx.fillStyle = '#ffd54f'; ctx.fillRect(-6, 6, 5, 7); ctx.fillRect(2, 6, 5, 7);
            ctx.fillStyle = '#f9a825'; ctx.fillRect(-8, -10, 16, 22);
            ctx.fillStyle = '#ffd54f'; ctx.fillRect(-7, -6, 14, 8); // bright chest
            ctx.fillStyle = '#f9a825'; ctx.fillRect(-12, -6, 4, 14); ctx.fillRect(8, -6, 4, 14); // big pauldrons
            // Cross emblem
            ctx.fillStyle = '#fff'; ctx.fillRect(-1, -8, 2, 6); ctx.fillRect(-3, -5, 6, 2);
            // Helmet with halo
            ctx.fillStyle = '#f9a825'; ctx.fillRect(-6, -24, 12, 16);
            ctx.fillStyle = '#ffe082'; ctx.fillRect(-3, -28, 6, 6); // crest
            ctx.shadowColor = '#fff700'; ctx.shadowBlur = 12;
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, -32, 8, 0, Math.PI * 2); ctx.stroke(); // holy halo
            ctx.shadowBlur = 0;
            // Shield
            ctx.fillStyle = '#e65100'; ctx.fillRect(-16, -10, 8, 14);
            ctx.fillStyle = '#ffd700'; ctx.fillRect(-13, -8, 4, 2); ctx.fillRect(-13, -4, 4, 2);
            // Holy sword
            ctx.fillStyle = '#ffe082'; ctx.fillRect(9, -34, 3, 38); ctx.fillStyle = '#ffd700'; ctx.fillRect(5, -8, 12, 3);
            break;
        }
        case 'grimReaper': {
            // Swirling dark aura
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#000';
            for (let w = 0; w < 6; w++) {
                const wa = e.animTimer * 0.06 + w * 1.05;
                ctx.fillRect(Math.cos(wa) * 18 - 4, Math.sin(wa) * 14 - 28 - w * 2, 8, 10);
            }
            ctx.globalAlpha = 1;
            // Long robe (floor-length)
            ctx.fillStyle = '#050510';
            ctx.fillRect(-10, -8, 20, 36);
            ctx.fillRect(-14, 14, 28, 10);
            // Hood
            ctx.fillStyle = '#0a0a20';
            ctx.fillRect(-10, -24, 20, 18);
            ctx.fillRect(-6, -30, 12, 8);
            // Skull face in hood shadow
            ctx.fillStyle = '#c8c0a0';
            ctx.fillRect(-5, -22, 10, 10);
            ctx.fillStyle = '#000';
            ctx.fillRect(-4, -20, 3, 4); ctx.fillRect(1, -20, 3, 4);
            ctx.fillRect(-2, -14, 4, 2);
            // Glowing purple eyes
            ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 14;
            ctx.fillStyle = '#cc00ff';
            ctx.fillRect(-3, -20, 2, 3); ctx.fillRect(1, -20, 2, 3);
            ctx.shadowBlur = 0;
            // Scythe staff
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(12, -40, 3, 56);
            // Scythe blade
            ctx.fillStyle = '#b0b8d0';
            ctx.fillRect(2, -48, 20, 4);
            ctx.fillRect(2, -44, 6, 4);
            ctx.fillStyle = '#888fa8';
            ctx.fillRect(3, -47, 18, 2);
            // Bony hands on staff
            ctx.fillStyle = '#c8c0a0';
            ctx.fillRect(10, -6, 5, 4); ctx.fillRect(10, 2, 5, 4);
            // Tattered robe hem — animated
            for (let t = 0; t < 5; t++) {
                const th = 8 + Math.sin(e.animTimer * 0.1 + t * 1.4) * 4;
                ctx.fillStyle = t % 2 === 0 ? '#050510' : '#0a0a20';
                ctx.fillRect(-12 + t * 5, 24, 5, th);
            }
            break;
        }

        // ─── ALIEN WORLD ENEMY TYPES ───
        case 'xeno': {
            // Insectoid — teal carapace, 4 limbs, mandibles
            const xleg = Math.floor(e.animTimer / 8) % 2;
            ctx.fillStyle = '#004d40'; // dark legs
            ctx.fillRect(-6, 4, 3, 6 + (xleg ? 2 : 0)); ctx.fillRect(3, 4, 3, 6 + (xleg ? 0 : 2));
            ctx.fillRect(-5, 2, 2, 5 + (xleg ? 0 : 2)); ctx.fillRect(3, 2, 2, 5 + (xleg ? 2 : 0));
            ctx.fillStyle = '#00695c'; // carapace body
            ctx.fillRect(-6, -8, 12, 14);
            ctx.fillStyle = '#00897b'; // lighter segment
            ctx.fillRect(-5, -6, 10, 4);
            ctx.fillStyle = '#004d40'; // head
            ctx.fillRect(-5, -16, 10, 10);
            ctx.fillStyle = '#1de9b6'; // glowing eyes
            ctx.shadowColor = '#1de9b6'; ctx.shadowBlur = 5;
            ctx.fillRect(-4, -14, 2, 2); ctx.fillRect(2, -14, 2, 2);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#00695c'; // mandibles
            ctx.fillRect(-6, -11, 2, 3); ctx.fillRect(4, -11, 2, 3);
            break;
        }
        case 'alienDrone': {
            // Small fast floater — lime green, no legs, pulsing ring
            const dpulse = Math.sin(e.animTimer * 0.2) * 2;
            ctx.globalAlpha = 0.8 + Math.sin(e.animTimer * 0.15) * 0.15;
            ctx.fillStyle = '#b2ff59';
            ctx.fillRect(-5, -4 + dpulse, 10, 8);
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(-3, -6 + dpulse, 6, 4);
            // 2 small eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(-2, -4 + dpulse, 1, 1); ctx.fillRect(1, -4 + dpulse, 1, 1);
            // wing-like fins on sides
            ctx.fillStyle = '#ccff90';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(-10, -2 + dpulse, 5, 2); ctx.fillRect(5, -2 + dpulse, 5, 2);
            ctx.globalAlpha = 1;
            break;
        }
        case 'hiveMind': {
            // Large psychic blob — slow, pulsing emerald, tentacles, crown of eyes
            const hpulse = Math.sin(e.animTimer * 0.06) * 2;
            // Tentacles (animated)
            ctx.fillStyle = '#1b5e20';
            for (let t = 0; t < 5; t++) {
                const toff = Math.sin(e.animTimer * 0.08 + t * 1.3) * 4;
                ctx.fillRect(-10 + t * 5, 10 + toff, 4, 8 - toff * 0.5);
            }
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(-10, -10 + hpulse, 20, 22);
            ctx.fillStyle = '#43a047';
            ctx.fillRect(-8, -8 + hpulse, 16, 12);
            // Brain folds
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(-7, -6 + hpulse, 2, 6); ctx.fillRect(-2, -7 + hpulse, 2, 7); ctx.fillRect(3, -6 + hpulse, 2, 6);
            // Row of 3 eyes across top
            ctx.shadowColor = '#69f0ae'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#69f0ae';
            ctx.fillRect(-6, -13 + hpulse, 3, 3); ctx.fillRect(-1, -14 + hpulse, 3, 3); ctx.fillRect(4, -13 + hpulse, 3, 3);
            ctx.shadowBlur = 0;
            break;
        }
        case 'parasite': {
            // Tiny fast crawler — bright lime, centipede body
            const pleg = Math.floor(e.animTimer / 5) % 2;
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(-6, -2, 4, 6); ctx.fillRect(-1, -3, 4, 7); ctx.fillRect(4, -2, 3, 5);
            // Many tiny legs
            ctx.fillStyle = '#33691e';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(-5 + i * 4, 3 + (pleg && i % 2 === 0 ? 2 : 0), 1, 3);
                ctx.fillRect(-4 + i * 4, 3 + (pleg && i % 2 !== 0 ? 2 : 0), 1, 3);
            }
            // Head with mandibles
            ctx.fillStyle = '#b2ff59';
            ctx.fillRect(-7, -5, 5, 5);
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(-9, -3, 2, 2); ctx.fillRect(-9, -1, 2, 2); // mandibles
            ctx.fillStyle = '#000';
            ctx.fillRect(-6, -4, 1, 1); // eye
            break;
        }
        // ── SAILOR WORLD ENEMIES ──────────────────────────────────────
        case 'eel': {
            const ew = Math.sin(e.animTimer * 0.15) * 4;
            ctx.fillStyle = '#002419'; // tail fin
            ctx.fillRect(-18, -4 + ew, 7, 9);
            ctx.fillStyle = e.color; // segments undulate
            ctx.fillRect(-12, -3 + ew, 9, 7);
            ctx.fillRect(-3, -3, 9, 7);
            ctx.fillRect(5, -3 - ew, 9, 7);
            ctx.fillStyle = '#00695c'; // head
            ctx.fillRect(12, -5, 9, 8);
            ctx.fillStyle = '#fff'; ctx.fillRect(13, -4, 3, 3); // eye white
            ctx.fillStyle = '#000'; ctx.fillRect(14, -3, 2, 2);
            ctx.fillStyle = '#004d40'; ctx.fillRect(18, -2, 5, 3); // snout
            ctx.fillStyle = '#fff'; // teeth
            ctx.fillRect(18, 0, 2, 2); ctx.fillRect(21, 0, 2, 2);
            break;
        }
        case 'piranha': {
            const pjaw = Math.floor(e.animTimer / 5) % 2;
            ctx.fillStyle = '#b71c1c'; // tail
            ctx.fillRect(7, -8, 6, 7); ctx.fillRect(7, 2, 6, 7);
            ctx.fillStyle = e.color; // body
            ctx.fillRect(-8, -6, 16, 13);
            ctx.fillRect(-6, -8, 12, 4); ctx.fillRect(-6, 7, 12, 4);
            ctx.fillStyle = '#ef9a9a'; // belly
            ctx.fillRect(-6, 0, 12, 5);
            ctx.fillStyle = '#b71c1c'; // dorsal fin
            ctx.fillRect(-5, -11, 4, 5); ctx.fillRect(-1, -10, 3, 4);
            ctx.fillStyle = '#fff'; // eye
            ctx.fillRect(-5, -4, 4, 4);
            ctx.fillStyle = '#000'; ctx.fillRect(-4, -3, 2, 2);
            // Big underbite jaw
            ctx.fillStyle = e.color;
            ctx.fillRect(-7, 5 + (pjaw ? 1 : 0), 11, 4);
            // Teeth both rows
            ctx.fillStyle = '#fff';
            for (let t = 0; t < 4; t++) {
                ctx.fillRect(-6 + t * 3, 1, 2, 4);
                ctx.fillRect(-6 + t * 3, 5 + (pjaw ? 1 : 0), 2, 3);
            }
            break;
        }
        case 'shark': {
            // Wave-spawned shark (simpler than world shark)
            const sf = e.facingX || 1;
            ctx.save(); ctx.scale(sf, 1);
            ctx.fillStyle = '#546e7a'; // caudal fin
            ctx.fillRect(-20, -6, 5, 5); ctx.fillRect(-20, 2, 5, 5);
            ctx.fillStyle = e.color; // body
            ctx.fillRect(-16, -7, 38, 14);
            ctx.fillStyle = '#90a4ae'; // belly
            ctx.fillRect(-12, 0, 28, 6);
            ctx.fillStyle = e.color; // dorsal fin
            ctx.fillRect(-4, -16, 6, 10); ctx.fillRect(0, -13, 4, 7);
            ctx.fillStyle = '#455a64'; // pectoral fin
            ctx.fillRect(2, 4, 10, 5);
            ctx.fillStyle = '#fff'; // eye
            ctx.fillRect(14, -5, 5, 5);
            ctx.fillStyle = '#000'; ctx.fillRect(15, -4, 3, 3);
            ctx.fillStyle = '#546e7a'; // snout tip
            ctx.fillRect(20, -3, 5, 6);
            ctx.restore();
            break;
        }
        case 'octopus': {
            const oleg = Math.floor(e.animTimer / 8) % 2;
            // Tentacles (8 animated)
            ctx.fillStyle = '#6a1b9a';
            for (let t = 0; t < 8; t++) {
                const ta = (t / 8) * Math.PI * 2;
                const tlen = 12 + (oleg && t % 2 === 0 ? 4 : 0);
                ctx.fillRect(Math.cos(ta) * 8 - 2, Math.sin(ta) * 8 + 4 - 2, 4, tlen * 0.6);
            }
            // Mantle (body)
            ctx.fillStyle = e.color;
            ctx.fillRect(-10, -14, 20, 20);
            ctx.fillRect(-8, -18, 16, 6); // top dome
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(-7, -10, 5, 5); ctx.fillRect(2, -10, 5, 5);
            ctx.fillStyle = '#ffd600';
            ctx.fillRect(-6, -9, 3, 3); ctx.fillRect(3, -9, 3, 3);
            ctx.fillStyle = '#000';
            ctx.fillRect(-5, -8, 1, 1); ctx.fillRect(4, -8, 1, 1);
            // Sucker row on a tentacle hint
            ctx.fillStyle = '#ce93d8';
            ctx.fillRect(-11, -2, 2, 2); ctx.fillRect(-11, 2, 2, 2);
            break;
        }
        case 'seaCroc': {
            // Saltwater croc — darker, stockier aquatic build
            const scleg = Math.floor(e.animTimer / 10) % 2;
            ctx.fillStyle = '#1b5e20'; // tail
            ctx.fillRect(-22, -3, 12, 7);
            ctx.fillRect(-18, -5, 4, 3); // tail ridge
            ctx.fillStyle = e.color; // body
            ctx.fillRect(-10, -7, 26, 14);
            ctx.fillStyle = '#2e7d32'; // back ridges
            for (let r = 0; r < 4; r++) ctx.fillRect(-6 + r * 6, -10, 4, 5);
            ctx.fillStyle = '#1b5e20'; // belly stripe
            ctx.fillRect(-8, 2, 20, 5);
            // Head (wide flat snout)
            ctx.fillStyle = e.color;
            ctx.fillRect(14, -6, 14, 8);
            ctx.fillRect(20, -4, 8, 6); // snout extension
            // Eye ridge
            ctx.fillStyle = '#388e3c';
            ctx.fillRect(15, -9, 5, 4);
            ctx.fillStyle = '#ffd600'; ctx.fillRect(16, -8, 3, 2);
            ctx.fillStyle = '#000'; ctx.fillRect(17, -8, 1, 1);
            // Teeth
            ctx.fillStyle = '#fff';
            ctx.fillRect(20, -2, 2, 3); ctx.fillRect(24, -2, 2, 3);
            // Legs
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(-6, 7, 5, 5 + (scleg ? 2 : 0)); ctx.fillRect(2, 7, 5, 5 + (scleg ? 0 : 2));
            break;
        }
        case 'jellyfish': {
            const jp = Math.sin(e.animTimer * 0.12) * 3;
            ctx.globalAlpha = 0.75 + Math.sin(e.animTimer * 0.1) * 0.15;
            // Tentacles (trailing, electric)
            ctx.fillStyle = '#ce93d8';
            for (let t = 0; t < 5; t++) {
                const toff = Math.sin(e.animTimer * 0.08 + t * 1.2) * 3;
                ctx.fillRect(-8 + t * 4, 8 + jp, 2, 14 + toff);
            }
            ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 8;
            // Bell (pulsing dome)
            ctx.fillStyle = e.color;
            ctx.fillRect(-10, -8 + jp, 20, 16);
            ctx.fillRect(-8, -13 + jp, 16, 7); // top dome
            // Inner glow ring
            ctx.fillStyle = '#f48fb1';
            ctx.fillRect(-7, -7 + jp, 14, 8);
            ctx.fillRect(-5, -11 + jp, 10, 5);
            // Eyes (simple)
            ctx.fillStyle = '#fff';
            ctx.fillRect(-5, -4 + jp, 3, 3); ctx.fillRect(2, -4 + jp, 3, 3);
            ctx.fillStyle = '#7b1fa2'; ctx.fillRect(-4, -3 + jp, 1, 1); ctx.fillRect(3, -3 + jp, 1, 1);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            break;
        }
        case 'mantaRay': {
            const mf = Math.sin(e.animTimer * 0.1) * 5; // wing flap
            // Whip tail
            ctx.fillStyle = '#263238';
            ctx.fillRect(6, 2, 4, 18); ctx.fillRect(8, 18, 2, 8);
            // Wings (wide diamond shape)
            ctx.fillStyle = e.color;
            ctx.fillRect(-22, -3 + mf, 20, 8); // left wing
            ctx.fillRect(2, -3 - mf, 20, 8);  // right wing
            ctx.fillStyle = '#455a64'; // wing tips
            ctx.fillRect(-26, 0 + mf, 6, 4);
            ctx.fillRect(20, 0 - mf, 6, 4);
            // Body (disc)
            ctx.fillStyle = e.color;
            ctx.fillRect(-8, -8, 16, 14);
            ctx.fillStyle = '#546e7a'; // belly pattern
            ctx.fillRect(-5, -2, 10, 6);
            // Cephalic fins ("horns" at front)
            ctx.fillStyle = '#37474f';
            ctx.fillRect(-6, -12, 4, 6); ctx.fillRect(2, -12, 4, 6);
            // Eyes
            ctx.fillStyle = '#fff'; ctx.fillRect(-5, -6, 3, 3); ctx.fillRect(2, -6, 3, 3);
            ctx.fillStyle = '#000'; ctx.fillRect(-4, -5, 1, 1); ctx.fillRect(3, -5, 1, 1);
            break;
        }
        case 'megalodon': {
            // Ancient giant shark — boss. sizeScale applied externally.
            const mgf = e.facingX || 1;
            ctx.save(); ctx.scale(mgf, 1);
            ctx.shadowColor = '#1565c0'; ctx.shadowBlur = 12;
            // Caudal fin (massive split tail)
            ctx.fillStyle = '#263238';
            ctx.fillRect(-22, -10, 8, 9); ctx.fillRect(-22, 4, 8, 9);
            // Body
            ctx.fillStyle = '#455a64';
            ctx.fillRect(-18, -12, 44, 24);
            // Belly (lighter)
            ctx.fillStyle = '#90a4ae';
            ctx.fillRect(-14, 2, 36, 10);
            // Battle scars
            ctx.fillStyle = '#37474f';
            ctx.fillRect(-2, -8, 3, 5); ctx.fillRect(8, -10, 2, 7);
            // Dorsal fin (massive)
            ctx.fillStyle = '#263238';
            ctx.fillRect(-6, -26, 10, 16); ctx.fillRect(-2, -22, 6, 12);
            // Pectoral fin
            ctx.fillStyle = '#37474f';
            ctx.fillRect(4, 8, 14, 8);
            // Head (blunt snout)
            ctx.fillStyle = '#455a64';
            ctx.fillRect(22, -10, 12, 20);
            ctx.fillRect(30, -7, 8, 14); // snout
            // Multiple rows of teeth
            ctx.fillStyle = '#fff';
            for (let t = 0; t < 5; t++) {
                ctx.fillRect(23 + t * 4, -11, 3, 5); // top teeth
                ctx.fillRect(23 + t * 4, 7, 3, 5);   // bottom teeth
            }
            // Eye (ancient, cold)
            ctx.fillStyle = '#b3e5fc'; ctx.shadowColor = '#29b6f6'; ctx.shadowBlur = 6;
            ctx.fillRect(20, -7, 6, 6);
            ctx.fillStyle = '#000'; ctx.fillRect(21, -6, 4, 4);
            ctx.fillStyle = '#fff'; ctx.fillRect(23, -5, 1, 1); // glint
            ctx.shadowBlur = 0;
            ctx.restore();
            break;
        }
        // ── DINO WORLD ENEMIES ──────────────────────────────────────
        case 'raptor': {
            const rleg = Math.floor(e.animTimer / 6) % 2;
            // Tail (counterbalance, swept back)
            ctx.fillStyle = '#33691e';
            ctx.fillRect(-16, -2, 10, 4); ctx.fillRect(-12, -4, 4, 3);
            // Body (forward-leaning)
            ctx.fillStyle = e.color;
            ctx.fillRect(-6, -8, 14, 13);
            // Neck + head (lunging forward)
            ctx.fillRect(6, -14, 9, 9);
            // Snout (elongated)
            ctx.fillStyle = '#33691e';
            ctx.fillRect(13, -12, 6, 4);
            // Eye
            ctx.fillStyle = '#ffd600'; ctx.fillRect(7, -13, 2, 2);
            ctx.fillStyle = '#000'; ctx.fillRect(8, -13, 1, 1);
            // Nostrils
            ctx.fillStyle = '#1b5e20'; ctx.fillRect(16, -10, 2, 1);
            // Tiny arms
            ctx.fillStyle = e.color; ctx.fillRect(2, -4, 3, 5);
            ctx.fillStyle = '#33691e'; ctx.fillRect(4, 0, 4, 2); // claw
            // Legs
            ctx.fillStyle = '#33691e';
            ctx.fillRect(-3, 5, 4, 5 + (rleg ? 3 : 0));
            ctx.fillRect(3, 5, 4, 5 + (rleg ? 0 : 3));
            // Sickle claw
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(-4, 10 + (rleg ? 3 : 0), 5, 2);
            ctx.fillRect(2, 10 + (rleg ? 0 : 3), 5, 2);
            break;
        }
        case 'pterodactyl': {
            const fwing = Math.sin(e.animTimer * 0.18) * 5;
            // Wings (V-shape)
            ctx.fillStyle = '#546e7a';
            ctx.fillRect(-22, -5 + fwing, 16, 6); // left
            ctx.fillRect(6, -5 - fwing, 16, 6);   // right
            ctx.fillStyle = '#37474f'; // wing membrane texture
            ctx.fillRect(-20, -2 + fwing, 12, 3); ctx.fillRect(8, -2 - fwing, 12, 3);
            // Wing tips
            ctx.fillStyle = '#263238';
            ctx.fillRect(-26, -3 + fwing, 5, 5); ctx.fillRect(21, -3 - fwing, 5, 5);
            // Body
            ctx.fillStyle = e.color;
            ctx.fillRect(-5, -7, 10, 12);
            // Head crest
            ctx.fillStyle = '#78909c'; ctx.fillRect(-3, -16, 3, 10);
            // Head
            ctx.fillStyle = e.color; ctx.fillRect(-4, -14, 8, 9);
            // Long beak
            ctx.fillStyle = '#90a4ae';
            ctx.fillRect(3, -11, 13, 3); // upper
            ctx.fillRect(3, -8, 12, 2);  // lower
            // Eye
            ctx.fillStyle = '#ffd600'; ctx.fillRect(-2, -12, 3, 3);
            ctx.fillStyle = '#000'; ctx.fillRect(-1, -11, 2, 2);
            // Legs/feet tucked
            ctx.fillStyle = '#546e7a';
            ctx.fillRect(-3, 5, 3, 5); ctx.fillRect(0, 5, 3, 5);
            break;
        }
        case 'triceratops': {
            const tcleg = Math.floor(e.animTimer / 10) % 2;
            // Tail
            ctx.fillStyle = '#2e7d32'; ctx.fillRect(-22, -2, 12, 5);
            // Body (wide, stocky)
            ctx.fillStyle = e.color;
            ctx.fillRect(-14, -10, 30, 20);
            // Frill (collar) — fan shape
            ctx.fillStyle = '#a5d6a7';
            ctx.fillRect(12, -20, 16, 14);
            ctx.fillStyle = '#388e3c';
            ctx.fillRect(13, -18, 3, 10); ctx.fillRect(17, -20, 3, 12); ctx.fillRect(21, -18, 3, 10);
            // Belly
            ctx.fillStyle = '#81c784'; ctx.fillRect(-12, 0, 26, 8);
            // Head (short, broad)
            ctx.fillStyle = e.color;
            ctx.fillRect(14, -12, 14, 14);
            // Three horns
            ctx.fillStyle = '#fff';
            ctx.fillRect(25, -16, 4, 8);  // large nose horn
            ctx.fillRect(16, -16, 3, 6);  // left brow horn
            ctx.fillRect(22, -16, 3, 6);  // right brow horn
            // Eye
            ctx.fillStyle = '#ffd600'; ctx.fillRect(15, -8, 3, 3);
            ctx.fillStyle = '#000'; ctx.fillRect(16, -7, 2, 2);
            // 4 legs
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(-10, 10, 6, 6 + (tcleg ? 2 : 0)); ctx.fillRect(-2, 10, 6, 6 + (tcleg ? 0 : 2));
            ctx.fillRect(6, 10, 6, 6 + (tcleg ? 2 : 0)); ctx.fillRect(10, 10, 6, 6 + (tcleg ? 0 : 2));
            break;
        }
        case 'ankylosaurus': {
            const aleg = Math.floor(e.animTimer / 12) % 2;
            // Club tail
            ctx.fillStyle = '#4e342e'; ctx.fillRect(-28, -2, 16, 5);
            ctx.fillStyle = '#3e2723'; // club
            ctx.fillRect(-36, -6, 12, 12);
            // Spikes on club
            ctx.fillStyle = '#6d4c41'; ctx.fillRect(-34, -9, 3, 4); ctx.fillRect(-28, -9, 3, 4); ctx.fillRect(-32, -8, 3, 3);
            // Body (wide armored)
            ctx.fillStyle = e.color;
            ctx.fillRect(-14, -8, 32, 18);
            // Armor plates (rows of ovals)
            const platecols = ['#a1887f', '#8d6e63', '#6d4c41'];
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 4; col++) {
                    ctx.fillStyle = platecols[(row + col) % 3];
                    ctx.fillRect(-10 + col * 7, -14 + row * 7, 6, 6);
                }
            }
            // Side spikes
            ctx.fillStyle = '#4e342e';
            ctx.fillRect(-14, -4, 4, 8); ctx.fillRect(10, -4, 4, 8);
            // Head (small, low)
            ctx.fillStyle = '#6d4c41';
            ctx.fillRect(14, -5, 12, 9);
            ctx.fillRect(22, -3, 6, 5); // snout
            // Eye
            ctx.fillStyle = '#ffd600'; ctx.fillRect(16, -4, 2, 2);
            ctx.fillStyle = '#000'; ctx.fillRect(16, -4, 1, 1);
            // 4 stubby legs
            ctx.fillStyle = '#4e342e';
            ctx.fillRect(-10, 10, 6, 5 + (aleg ? 2 : 0)); ctx.fillRect(-2, 10, 6, 5 + (aleg ? 0 : 2));
            ctx.fillRect(5, 10, 6, 5 + (aleg ? 2 : 0)); ctx.fillRect(9, 10, 6, 5 + (aleg ? 0 : 2));
            break;
        }
        case 'trexBoss': {
            // T-Rex king — massive, terrifying bipedal apex predator
            const tbleg = Math.floor(e.animTimer / 10) % 2;
            // Tail (thick, counterweight)
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(-28, 2, 18, 8); ctx.fillRect(-24, -2, 10, 5);
            // Body (massive)
            ctx.fillStyle = e.color;
            ctx.fillRect(-12, -14, 28, 28);
            // Scale texture rows
            ctx.fillStyle = '#2e7d32';
            for (let sr = 0; sr < 3; sr++) ctx.fillRect(-10, -8 + sr * 8, 24, 4);
            // Belly
            ctx.fillStyle = '#a5d6a7'; ctx.fillRect(-10, 0, 22, 12);
            // Neck
            ctx.fillStyle = e.color; ctx.fillRect(12, -22, 12, 10);
            // Head (HUGE — iconic T-Rex profile)
            ctx.fillStyle = e.color;
            ctx.fillRect(8, -36, 24, 18);
            // Brow ridges
            ctx.fillStyle = '#1b5e20'; ctx.fillRect(9, -38, 8, 4); ctx.fillRect(22, -38, 8, 4);
            // Upper jaw
            ctx.fillStyle = e.color; ctx.fillRect(28, -32, 10, 8);
            // Lower jaw (slightly open)
            ctx.fillStyle = '#2d6a4f'; ctx.fillRect(8, -20, 22, 7);
            // Rows of teeth
            ctx.fillStyle = '#fff';
            for (let t = 0; t < 6; t++) {
                ctx.fillRect(10 + t * 4, -22, 3, 5);   // top teeth
                ctx.fillRect(10 + t * 4, -18, 3, 5);   // bottom teeth
            }
            // Eye (small, fierce)
            ctx.fillStyle = '#ffd600'; ctx.shadowColor = '#ff6f00'; ctx.shadowBlur = 6;
            ctx.fillRect(10, -34, 5, 5);
            ctx.fillStyle = '#000'; ctx.fillRect(11, -33, 3, 3);
            ctx.fillStyle = '#fff'; ctx.fillRect(13, -32, 1, 1);
            ctx.shadowBlur = 0;
            // Tiny arms (iconic)
            ctx.fillStyle = '#2e7d32'; ctx.fillRect(14, -10, 4, 8); ctx.fillRect(12, -3, 5, 3);
            // Thick legs
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(-10, 14, 10, 12 + (tbleg ? 4 : 0));
            ctx.fillRect(2, 14, 10, 12 + (tbleg ? 0 : 4));
            // Feet
            ctx.fillStyle = '#000';
            ctx.fillRect(-12, 26 + (tbleg ? 4 : 0), 14, 3);
            ctx.fillRect(0, 26 + (tbleg ? 0 : 4), 14, 3);
            break;
        }
        case 'alienQueen': {
            // Biomechanical alien queen — final boss of alien world
            const aqt = e.animTimer;
            // Outer spine array (oscillating)
            ctx.fillStyle = '#004d40';
            for (let s = 0; s < 6; s++) {
                const sa = (s / 6) * Math.PI * 2 + Math.sin(aqt * 0.05) * 0.3;
                const sr = 24;
                ctx.fillRect(Math.cos(sa) * sr - 2, Math.sin(sa) * sr - 18 - 2, 4, 10);
            }
            // Tail (long, segmented)
            ctx.fillStyle = '#00695c';
            ctx.fillRect(-32, 8, 12, 5); ctx.fillRect(-28, 4, 6, 5);
            ctx.fillRect(-22, 2, 8, 5); ctx.fillRect(-16, 0, 8, 6);
            ctx.fillStyle = '#004d40'; ctx.fillRect(-36, 6, 6, 9); // tail tip
            // Legs (6 total)
            ctx.fillStyle = '#00695c';
            const qleg = Math.floor(aqt / 7) % 2;
            for (let l = 0; l < 3; l++) {
                const lx = -8 + l * 8;
                ctx.fillRect(lx, 12, 4, 10 + (qleg && l % 2 === 0 ? 3 : 0));
                ctx.fillRect(lx + 4, 12, 4, 10 + (qleg && l % 2 !== 0 ? 3 : 0));
            }
            // Carapace body
            ctx.fillStyle = '#00796b';
            ctx.fillRect(-14, -14, 28, 28);
            ctx.fillStyle = '#00897b'; // lighter chest
            ctx.fillRect(-10, -8, 20, 14);
            // Exoskeleton segments
            ctx.fillStyle = '#004d40';
            ctx.fillRect(-14, -8, 4, 22); ctx.fillRect(10, -8, 4, 22);
            ctx.fillRect(-12, -14, 24, 4);
            // Head (elongated, regal)
            ctx.fillStyle = '#00695c';
            ctx.fillRect(-8, -30, 16, 18);
            ctx.fillRect(-6, -36, 12, 8);
            ctx.fillRect(-4, -40, 8, 6); // crown dome
            // Crown of bioluminescent eyes (5 eyes)
            ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(-6, -28, 3, 3); ctx.fillRect(3, -28, 3, 3);
            ctx.fillRect(-3, -33, 3, 3); // center eye
            ctx.fillStyle = '#80deea'; ctx.fillRect(-5, -24, 2, 2); ctx.fillRect(3, -24, 2, 2);
            ctx.shadowBlur = 0;
            // Mandibles
            ctx.fillStyle = '#004d40';
            ctx.fillRect(-12, -22, 4, 8); ctx.fillRect(8, -22, 4, 8);
            // Inner mandibles
            ctx.fillStyle = '#1de9b6';
            ctx.fillRect(-10, -20, 2, 5); ctx.fillRect(8, -20, 2, 5);
            // Arms (upper, large)
            ctx.fillStyle = '#00695c';
            ctx.fillRect(-22, -10, 8, 16); ctx.fillRect(14, -10, 8, 16);
            // Clawed hands
            ctx.fillStyle = '#004d40';
            ctx.fillRect(-24, 4, 4, 5); ctx.fillRect(-22, 6, 3, 4);
            ctx.fillRect(20, 4, 4, 5); ctx.fillRect(19, 6, 3, 4);
            break;
        }
        default: {
            // Unknown enemy type — render a visible magenta square so it's obvious
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#fff';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('???', 0, 3);
            break;
        }
    }

    ctx.shadowBlur = 0;

    // HP bar (regular enemies only — bosses use the top-of-screen boss bar in draw.js)
    if (e.hp < e.maxHp && !e.isBoss) {
        const hpFrac = Math.max(0, Math.min(1, e.hp / (e.maxHp || 1)));
        ctx.fillStyle = '#300';
        ctx.fillRect(-10, -20, 20, 3);
        ctx.fillStyle = '#f00';
        ctx.fillRect(-10, -20, 20 * hpFrac, 3);
    }

    // "Deal With It" sunglasses — kool kat coolness effect
    if (e.dealWithIt) {
        ctx.fillStyle = '#000';
        ctx.fillRect(-8, -16, 6, 4); ctx.fillRect(2, -16, 6, 4);
        ctx.fillRect(-2, -14, 4, 3); // bridge
        ctx.fillStyle = '#333';
        ctx.fillRect(-7, -15, 2, 2); ctx.fillRect(3, -15, 2, 2); // lens highlights
    }

    // Boss crown
    if (e.isBoss) {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-6, -24, 12, 4);
        ctx.fillRect(-6, -28, 3, 4); ctx.fillRect(-1, -26, 2, 2); ctx.fillRect(3, -28, 3, 4);
    }

    // Elite star
    if (e.elite && !e.isBoss) {
        ctx.fillStyle = '#ff0';
        ctx.fillRect(-2, -22, 4, 4);
    }

    // Elite mod ring and shield bar
    if (e.mod) {
        const modColors = { shielded: '#4080ff', enraged: '#ff4400', splitting: '#ffdd00', vampiric: '#40cc60' };
        const col = modColors[e.mod] || '#ffffff';
        const pulse = 0.7 + Math.sin(e.animTimer * 0.15) * 0.3;
        ctx.shadowColor = col; ctx.shadowBlur = e.isEnraged ? 18 : 10;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        // Shield bar above HP bar (shielded only)
        if (e.mod === 'shielded' && e.maxShield > 0 && e.shield > 0) {
            const sw = 20 * (e.shield / e.maxShield);
            ctx.fillStyle = '#003366'; ctx.fillRect(-10, -24, 20, 3);
            ctx.fillStyle = '#4080ff'; ctx.fillRect(-10, -24, sw, 3);
        }
    }

    ctx.restore();
}

function drawCrocodile(ctx, c, ex, ey) {
    const bob = Math.sin(c.animTimer * 0.1) * 1.5;
    const flip = c.facingX >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(ex, ey + bob);
    ctx.scale(flip, 1);
    if (c.hurtTimer > 0) { ctx.globalAlpha = 0.5 + Math.sin(c.animTimer * 0.5) * 0.3; }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-16, 8, 32, 4);

    // Tail
    ctx.fillStyle = '#388e3c';
    ctx.fillRect(-18, -3, 7, 6);
    ctx.fillRect(-22, -2, 5, 4);

    // Body
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(-11, -6, 22, 12);

    // Belly (lighter)
    ctx.fillStyle = '#66bb6a';
    ctx.fillRect(-8, 0, 18, 5);

    // Head
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(11, -5, 10, 9);

    // Snout
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(19, -3, 6, 5);

    // Teeth — top jaw
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(20, -4, 2, 3); ctx.fillRect(23, -4, 2, 3);

    // Eye
    ctx.fillStyle = '#f9a825'; ctx.fillRect(13, -6, 3, 3);
    ctx.fillStyle = '#1a1a00'; ctx.fillRect(14, -5, 2, 2);

    // Legs
    ctx.fillStyle = '#388e3c';
    ctx.fillRect(-7, 5, 5, 6); ctx.fillRect(5, 5, 5, 6);   // back, front
    ctx.fillRect(-7, -10, 5, 5); ctx.fillRect(5, -10, 5, 5);

    // Scale bumps
    ctx.fillStyle = '#1b5e20';
    for (let s = -6; s <= 10; s += 5) { ctx.fillRect(s, -7, 3, 2); }

    ctx.globalAlpha = 1;

    // HP bar
    if (c.hp < c.maxHp) {
        ctx.scale(flip, 1); // unflip for HP bar
        ctx.fillStyle = '#300'; ctx.fillRect(-16, -20, 32, 3);
        ctx.fillStyle = '#f00'; ctx.fillRect(-16, -20, 32 * (c.hp / c.maxHp), 3);
    }

    ctx.restore();
}

// ─── BESTIARY ───
let _bestiaryWorld = 'standard';

function makeBestiarySprite(type) {
    const c = document.createElement('canvas');
    c.width = 48; c.height = 48;
    const ctx2 = c.getContext('2d');
    ctx2.fillStyle = '#0a0a1a';
    ctx2.fillRect(0, 0, 48, 48);
    const info = BESTIARY_INFO[type] || {};
    const mock = {
        type, animTimer: 20, hp: 50, maxHp: 50, hurtTimer: 0,
        color: info.color || '#888',
        facingX: 1, facingY: 0, dir: 1,
        isBoss: false, isMini: false, animFrame: 0, x: 0, y: 0,
    };
    ctx2.save();
    ctx2.translate(24, 28);
    try { drawEnemySprite(ctx2, mock, 0, 0); } catch(err) {
        ctx2.fillStyle = info.color || '#888';
        ctx2.fillRect(-8, -8, 16, 16);
    }
    ctx2.restore();
    return c;
}

function renderBestiary(worldKey) {
    _bestiaryWorld = worldKey;
    if (!persist.seenEnemies) persist.seenEnemies = {};
    // Update active tab highlight only (tabs were built once in openBestiary)
    document.querySelectorAll('#bestiary-world-tabs .bestiary-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.world === worldKey);
    });
    const listEl = document.getElementById('bestiary-list');
    listEl.innerHTML = '';
    Object.entries(BESTIARY_INFO).filter(([, v]) => v.world === worldKey).forEach(([type, info]) => {
        const seen = !!persist.seenEnemies[type];
        const card = document.createElement('div');
        card.className = 'bestiary-card' + (seen ? '' : ' unseen');
        const wrap = document.createElement('div');
        wrap.className = 'bestiary-sprite-wrap';
        wrap.appendChild(makeBestiarySprite(type));
        card.appendChild(wrap);
        const nameEl = document.createElement('div');
        nameEl.className = 'bestiary-name';
        nameEl.textContent = seen ? info.name : '???';
        card.appendChild(nameEl);
        const worldTag = document.createElement('div');
        worldTag.className = 'bestiary-world-tag';
        worldTag.textContent = info.world.toUpperCase();
        card.appendChild(worldTag);
        const descEl = document.createElement('div');
        descEl.className = 'bestiary-desc';
        descEl.textContent = seen ? info.desc : 'Encounter this enemy to unlock its entry.';
        card.appendChild(descEl);
        listEl.appendChild(card);
    });
}

function openBestiary() {
    if (!persist.seenEnemies) persist.seenEnemies = {};
    const panel = document.getElementById('bestiary-panel');
    const tabsEl = document.getElementById('bestiary-world-tabs');
    panel.classList.remove('hidden');
    state.paused = true;
    // Build tabs once; use event delegation so no listener is lost on re-render
    tabsEl.innerHTML = BESTIARY_WORLDS.map(w =>
        '<button class="bestiary-tab" data-world="' + w.key + '" style="color:' + w.color + ';border-color:' + w.color + '">' + w.label + '</button>'
    ).join('');
    tabsEl.onclick = (e) => {
        const btn = e.target.closest('.bestiary-tab');
        if (btn) renderBestiary(btn.dataset.world);
    };
    renderBestiary(_bestiaryWorld);
}
