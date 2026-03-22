// @ts-nocheck
/**
 * Pixel Drifter - Core Engine
 * Camera, weapons, shop, upgrades, bosses, evolution
 */
const canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 600;
const TILE = 32, WORLD_W = 4800, WORLD_H = 3600;
const DAY_LEN = 5100, NIGHT_LEN = 3000; // ~85s day, ~50s night at 60fps

// ─── PETS ───
const PET_TYPES = {
    dog:     { name: 'Dog',     icon: '🐶', desc: 'Fetches gold automatically from afar' },
    cat:     { name: 'Cat',     icon: '🐱', desc: 'Chance to dodge enemy projectiles' },
    chicken: { name: 'Chicken', icon: '🐔', desc: 'Lays timed explosive eggs' },
    rabbit:  { name: 'Rabbit',  icon: '🐰', desc: 'Boosts your dash — faster & more charges' },
    snake:   { name: 'Snake',   icon: '🐍', desc: 'Poisons nearby enemies passively' },
    bird:    { name: 'Bird',    icon: '🐦', desc: 'Commands wind — vortexes, tailwind bursts, and lightning storms' },
    hamster: { name: 'Hamster', icon: '🐹', desc: 'Hoards gold — bonus gold on every pickup' },
    turtle:  { name: 'Turtle',  icon: '🐢', desc: 'Shell absorbs a portion of damage taken' }
};

// ─── ACHIEVEMENTS ───
const ACHIEVEMENTS = {
    millionaire:       { name: 'Millionaire',          icon: '💰', desc: 'Earn 1,000,000 lifetime gold',               reward: null },
    mrBeast:           { name: 'Mr. Beast',            icon: '💸', desc: 'Earn 1,000,000,000 lifetime gold',          reward: null },
    richestMan:        { name: 'Richest Man on Earth', icon: '🤑', desc: 'Earn 1,000,000,000,000 lifetime gold',      reward: 'pet:scroogeMcduck' },
    monsterSlayer:     { name: 'Monster Slayer',       icon: '⚔',  desc: 'Kill 1,000 monsters in one run',          reward: 'pet:dragon' },
    pacifist:          { name: 'Pacifist',             icon: '☮',  desc: 'Go 5 minutes without a kill in one run',   reward: 'pet:unicorn' },
    forgery:           { name: 'Forgery',              icon: '🔥', desc: 'Forge all 8 fusion weapons in one run',     reward: 'pet:phoenix' },
    gearedUp:          { name: 'Geared Up',            icon: '🛡',  desc: 'Equip a full set of armor',               reward: null },
    survivalist:       { name: 'Survivalist',          icon: '🌙', desc: 'Survive 10 nights in one run',             reward: 'pet:bat' },
    hoarder:           { name: 'Hoarder',              icon: '📦', desc: 'Buy all extra weapon slots and fill them all up', reward: null },
    speedDemon:        { name: 'Speed Demon',          icon: '⚡', desc: 'Kill 20 enemies with melee in 1 second',   reward: null },
    blessed:           { name: 'Blessed',              icon: '😇', desc: 'Be saved by an angel 6+ times in one run', reward: null },
    shadowDemonSlayer: { name: 'Shadow Demon Slayer',  icon: '👹', desc: 'Kill 3 shadow demons in one run',          reward: null },
    webbed:            { name: 'Webbed',               icon: '🕸',  desc: 'Survive 30 seconds stuck in spider webs', reward: 'pet:spider' },
    deathDefied:       { name: 'Death Defied',         icon: '💀', desc: 'Defeat the final boss of your world',      reward: null },
    extinctionEvent:   { name: 'Extinction Event',     icon: '🦕', desc: 'Defeat the T-Rex as the Paleontologist or Dinosaur',   reward: 'pet:dinopal' },
    whaleOfATime:      { name: 'Whale of a Time',      icon: '🦈', desc: 'Defeat the Megalodon as the Sailor or Pirate', reward: 'pet:sharky' },
    firstContact:      { name: 'First Contact',        icon: '👽', desc: 'Defeat the Alien Queen as the Alien or Astronaut', reward: 'pet:littleGuy' },
    beyondDeath:       { name: 'Beyond Death',         icon: '👻', desc: 'Defeat the Grim Reaper in a standard world run', reward: 'pet:ghosty' },
    chopAllTrees:      { name: 'Lumberjack',           icon: '🪓', desc: 'Fell every tree in your world',             reward: null },
    dashKills:         { name: 'Invisible Hand',        icon: '🥷', desc: 'Kill 50 enemies while dashing',             reward: null },
    bossExplosion:     { name: 'Boom!',                icon: '💥', desc: 'Destroy a boss with an explosion',           reward: null },
    hardestWin:        { name: 'Unkillable',            icon: '🏆', desc: 'Defeat the Grim Reaper on Hard difficulty', reward: null },
    knightEasyX4:      { name: 'Senior Knight',         icon: '👴', desc: 'Beat the Reaper as Knight on Easy 4 times', reward: null },
    robotUnlock:       { name: 'Machine Supremacy',     icon: '🤖', desc: 'Beat the game as the Scientist',            reward: null },
    witchUnlock:       { name: 'Red Wizardslayer',      icon: '🧙', desc: 'Kill the rare Red Wizard while playing as Wizard', reward: null },
    tooLongDidntRead:  { name: 'TL;DR',                 icon: '📖', desc: 'You didn\'t even read it, did you?',         reward: null },
    shopper100:        { name: 'Retail Therapy',         icon: '🛒', desc: 'Buy 100 items from the shop across all runs', reward: null },
    dinoKing:          { name: 'Dino King',              icon: '🦕', desc: 'Die to a crocodile as the Fat character after killing 30 or more crocs', reward: null },
    gamerUnlock:       { name: 'Gamer',                  icon: '🎮', desc: 'Reach wave 20 without opening the shop',     reward: null },
    sailorUnlock:      { name: 'Sea Legs',               icon: '⚓', desc: 'Die in the biggest lake as the Knight, having spent 30s in each of the two biggest lakes', reward: null },
    commanderUnlock:   { name: 'First Blood',            icon: '📢', desc: 'Finish your first run (any character)',       reward: null },
    astronautUnlock:   { name: 'Pacifist Contact',       icon: '🛸', desc: 'Complete a run as Alien without killing any human space explorers', reward: null },
    clownUnlock:       { name: 'Triple Clown',           icon: '🎪', desc: 'Collect 3 Clown Balls from mimics (max your pet in 3 different-pet runs)', reward: null },
    stickmanUnlock:    { name: 'Branch Collector',       icon: '🕴', desc: 'Collect 30 tree branches in one run (oak trees drop them)', reward: null },
    cavemanUnlock:     { name: 'Eat Wood',               icon: '🦣', desc: 'Type "eatwood" while holding wood',          reward: null },
    pirateUnlock:      { name: 'Sea Dog',                icon: '🏴‍☠️', desc: '10 bones + 20 croc kills + 1 shark kill + 100k gold in one run', reward: null },
    youtuberUnlock:    { name: 'Going Viral',            icon: '📱', desc: 'Reach wave 30 as any character',                                 reward: null },
    koolKatUnlock:     { name: 'Deal With It',           icon: '😎', desc: 'Play as Bob with a max-level cat pet',                           reward: null },
    cowboyUnlock:      { name: 'Hardened',               icon: '🤠', desc: 'Complete a Hard difficulty run',                                 reward: null },
    bobUnlock:         { name: 'Average Joe',            icon: '🙂', desc: 'Lose 10 runs',                                                   reward: null },
    janitorUnlock:     { name: 'Speed Collector',        icon: '🧹', desc: 'Pick up 50 items (gold + hearts) in 5 seconds',                  reward: null },
    babyUnlock:        { name: 'YOLO',                   icon: '👶', desc: 'Die within the first 30 seconds of a run',                       reward: null },
    rubixCuberUnlock:  { name: 'Puzzle Master',          icon: '🎲', desc: 'Find a Rubix Cube in a chest and solve the minigame',            reward: null },
    paleoUnlock:       { name: 'Fossil Discovery',       icon: '🦕', desc: 'Find and examine your fossil after dying as Dinosaur',           reward: null },
};

// ─── CHARACTERS ───
const CHARACTERS = {
    knight: {
        name: 'Knight', icon: '⚔',
        desc: 'Melee-focused with natural resilience.',
        pros: ['+15% melee damage', 'Slight base armor'],
        cons: ['No special abilities'],
        notes: [],
        unlock: null, unlockHint: null,
        specialWeapon: 'Iron Sword',
    },
    villager: {
        name: 'Villager', icon: '👨‍🌾',
        desc: 'An angry peasant with a pitchfork. And a grudge.',
        pros: ['Pitchfork hits wide arc (multiple enemies)', 'Crits launch pitchfork as a thrown projectile', 'Enemies with <25% HP briefly flee when hit'],
        cons: ['No armor', '-15 max HP'],
        notes: [],
        unlock: null, unlockHint: null,
        specialWeapon: 'Pitchfork',
    },
    archer: {
        name: 'Archer', icon: '🏹',
        desc: 'Shots home to the nearest enemy and pierce.',
        pros: ['+40% ranged damage', 'Arrows home to closest enemy', 'Pierce all targets', 'Starts with bow'],
        cons: ['-20% melee damage'],
        notes: [],
        unlock: null, unlockHint: null,
        specialWeapon: 'Hunter\'s Longbow',
    },
    reaper: {
        name: 'Reaper', icon: '💀',
        desc: 'Harbinger of death. Skeletons respect the craft.',
        pros: ['+60% melee damage', 'Kills restore HP', 'Skeletons auto-ally', 'Small instakill chance'],
        cons: ['Cannot use shop', '-30 max HP', 'Enemies +10% HP', 'Can be instakilled (rare)'],
        notes: [],
        unlock: 'deathDefied', unlockHint: null,
        specialWeapon: 'Death Scythe',
    },
    monsterChar: {
        name: 'Monster', icon: '👾',
        desc: 'You ARE the monster. The knights fear you.',
        pros: ['Fight knights instead of normal enemies', 'Skill tree lets you become different enemy types'],
        cons: ['Harder enemies — humans adapt and call for help', 'No shop (trade with goblins instead)'],
        notes: [],
        unlock: 'custom', unlockHint: 'Me is tamed by guy with whip',
        specialWeapon: 'Natural Form', // weapons change based on current monster form
    },
    dinosaur: {
        name: 'Dinosaur', icon: '🦕',
        desc: 'Extinction? Not today.',
        pros: ['No weapon — uses claws (upgradeable)', 'Roar (charges in 10s): fears nearby enemies', 'Grows larger over time (up to +300% size)'],
        cons: ['No ranged attacks', 'Slow turning', 'Roar replaces dash'],
        notes: ['RAWR'],
        unlock: 'dinoKing', unlockHint: null,
        specialWeapon: 'Claws',
    },
    dragon: {
        name: 'Dragon', icon: '🐲',
        desc: 'Ancient. Fireborn. Scales forged in the deep.',
        pros: ['Hold click to charge fire breath (release to blast)', 'Immune to lava', '+25% size (large hitbox absorbs hits)'],
        cons: ['Requires a specific ritual to unlock', 'No armor slots'],
        notes: [],
        unlock: 'custom', unlockHint: null,
        hasDragonRitual: true,
        specialWeapon: 'Dragon Breath', // charge-up fire breath AoE
    },
    ninja: {
        name: 'Ninja', icon: '🥷',
        desc: 'Blink. Strike. Vanish.',
        pros: ['+60% movement speed', 'Dash makes you invisible briefly', 'High crit rate'],
        cons: ['Max HP: 50', 'Slightly slower for 2s after each dash'],
        notes: [],
        unlock: 'dashKills', unlockHint: 'Kill 50 enemies while dashing',
        specialWeapon: 'Shuriken',
    },
    rogue: {
        name: 'Rogue', icon: '🗡',
        desc: 'Strike from the shadows. Die in the light.',
        pros: ['Backstab: massive damage from behind', 'High crit rate', 'Very fast', 'Dash powers up Shadow Blade for 1.5s (3× dmg)'],
        cons: ['Very low max HP'],
        notes: [],
        unlock: 'custom', unlockHint: null,
        specialWeapon: 'Shadow Blade',
    },
    vampire: {
        name: 'Vampire', icon: '🧛',
        desc: 'Night is your domain.',
        pros: ['15% lifesteal', '+30% speed & damage at night'],
        cons: ['-20% speed & damage during day', '-20 max HP'],
        notes: ['Name stolen allegedly, copyright is pending, lawyers and jury still deciding.'],
        unlock: 'shadowDemonSlayer', unlockHint: null,
        specialWeapon: 'Fang Daggers',
    },
    sailor: {
        name: 'Sailor', icon: '⚓',
        desc: 'The sea is home. Land is the enemy.',
        pros: ['Fishing rod pulls hit enemies toward you', 'Right-click: telescope zooms out (you disappear)', '2× movement speed on water', 'Sea world: ocean with grass islands'],
        cons: ['0.5× speed on land', 'Fishing rod cooldown slow off water'],
        notes: [],
        unlock: 'sailorUnlock', unlockHint: null,
        specialWeapon: 'Fishing Rod',
    },
    pirate: {
        name: 'Pirate', icon: '🏴‍☠️',
        desc: 'Cannonballs, grappling hooks, and greed.',
        pros: ['Cutlass: heavy melee with knockback', 'Grapple hook replaces dash (pull enemies in or launch toward them)', 'Every kill has a bonus gold loot roll (+25-100g)', 'Sea world: mostly ocean with island outposts'],
        cons: ['Grapple hook has long cooldown', 'No armor slots'],
        notes: [],
        unlock: 'pirateUnlock', unlockHint: '10 bones + 20 croc kills + 1 shark kill + 100k gold in one run',
        specialWeapon: 'Cutlass',
    },
    wizard: {
        name: 'Wizard', icon: '🧙',
        desc: 'Wields rune-powered spells instead of weapons.',
        pros: ['Up to 4 rune slots', 'Powerful spells (fire, lightning, orb, heal)', 'Mana-based casting'],
        cons: ['Must charge mana before each spell', 'Runes have limited uses'],
        notes: ['Different playstyle'],
        unlock: 'custom', unlockHint: 'Complete a trial', hasTrialUnlock: true,
        specialWeapon: 'Arcane Staff',
    },
    witch: {
        name: 'Witch', icon: '🧙‍♀️',
        desc: 'Brews chaos every wave. Magic is the only tool.',
        pros: ['Brew a random potion at wave start (heal / freeze bomb / poison cloud / chaos)', 'Potions scale with wave number', 'Broomstick sweeps in a wide arc to knock back enemies'],
        cons: ['Potion effect is completely random', 'Frail (low max HP)'],
        notes: [],
        unlock: 'witchUnlock', unlockHint: 'Hunt the rare Red Wizard — but only if you are a Wizard yourself.',
        specialWeapon: 'Enchanted Broomstick',
    },
    angel: {
        name: 'Angel', icon: '😇',
        desc: 'Descended from above. Blesses allies and smites evil.',
        pros: ['Passive heal: +2 HP every 5s', 'Divine Sword fires holy projectile on attack'],
        cons: ['???'],
        notes: [],
        unlock: 'blessed', unlockHint: 'Be healed by an angel 6 times in one run',
        specialWeapon: 'Divine Sword',
    },
    fashionModel: {
        name: 'Fashion Model', icon: '💅',
        desc: 'Too beautiful to die. Probably.',
        pros: ['+50% gold from enemies', 'Beauty aura slows nearby enemies every 2s', 'Stiletto Heel always crits'],
        cons: ['1 weapon slot only', 'No armor', 'Shop costs more'],
        notes: [],
        unlock: 'custom', unlockHint: null,
        specialWeapon: 'Stiletto Heel',
    },
    gamer: {
        name: 'Gamer', icon: '🎮',
        desc: 'This isn\'t their first run. Or their hundredth.',
        pros: ['Kill combo: each kill adds +4% dmg (max +80% at 20 combo)', 'Combo resets after 4s without a kill', 'Every 2 boss kills: earn a cheat code ability'],
        cons: ['Occasionally lags (brief movement freeze)', 'Cheat codes are random'],
        notes: [],
        unlock: 'gamerUnlock', unlockHint: 'Get caught up in the game',
        specialWeapon: 'Controller (stun pulse)',
    },
    shopper: {
        name: 'Shopper', icon: '🛒',
        desc: 'Born to spend. The shop is your domain.',
        pros: ['Every 1000 gold held = +1% dmg & +0.5% speed', 'Shop refreshes every wave (items improve)', 'Each purchase has a bonus roll'],
        cons: ['Stat bonus lost when spending gold', 'No other passive bonuses'],
        notes: ['I\'ll buy this, and this, and this, and this too, and this...'],
        unlock: 'shopper100', unlockHint: 'Buy 100 items from the shop total',
        specialWeapon: 'Shopping Bag',
    },
    rich: {
        name: 'Rich', icon: '🤑',
        desc: 'Money solves everything. Allegedly.',
        pros: ['+50% gold from all sources', 'Butler companion fights alongside you'],
        cons: ['Butler demands a paycheck every 5 waves — can\'t pay = game over', 'Enemies target you first'],
        notes: ['Yes. I hired a butler even though I have a monocle laser. I\'m rich. It doesn\'t matter.'],
        unlock: 'custom', unlockHint: 'Buy him with 10,000,000 lifetime gold now! 0% off!',
        hasBuyUnlock: true, buyPrice: 10000000,
        specialWeapon: 'Monocle Laser',
    },
    fat: {
        name: 'Fat', icon: '🍔',
        desc: '???',
        pros: ['???'],
        cons: ['???'],
        notes: ['Thicc'],
        unlock: 'custom', unlockHint: null,
        specialWeapon: 'Dinner Fork',
    },
    scientist: {
        name: 'Scientist', icon: '🧪',
        desc: 'Blacksmith replaced with a mixing station. Chaos is chemistry.',
        pros: ['Craft powerful chemicals at the mixing station', 'Each chemical has a unique effect'],
        cons: ['No blacksmith access', 'Chemicals cost shop ingredients'],
        notes: [],
        unlock: 'bossExplosion', unlockHint: 'Kill a boss with an explosion',
        specialWeapon: 'Chemical Flask',
    },
    robot: {
        name: 'Robot', icon: '🤖',
        desc: 'A relentless machine. Fires devastating lasers. Occasionally crashes.',
        pros: ['Every 15–40s: fire a laser beam in movement direction (2.5s, high DPS)', 'Mechanical resilience'],
        cons: ['Randomly shuts down for 5s every 100–200s (unable to move or act)'],
        notes: ['BEEP BOOP. SHUTTING DOWN. TURNING BACK ON. LASER CANNON ACTIVATE. SCANNING. ALL ENEMIES DESTROYED. BEEP BOOP.'],
        unlock: 'robotUnlock', unlockHint: 'Some victories take more than one form',
        specialWeapon: 'Laser Cannon',
    },
    engineer: {
        name: 'Engineer', icon: '🔧',
        desc: 'Build it. Fix it. Wrench it.',
        pros: ['Wrench: 2× damage vs bosses', 'Stand on a barricade + G to repair it', 'Barricades have 10 HP (double)', 'Half wood cost for barricades'],
        cons: ['-20% movement speed', 'Wrench short range'],
        notes: [],
        unlock: 'forgery', unlockHint: 'Forge all 8 fusion weapons in one run',
        specialWeapon: 'Wrench',
    },
    alien: {
        name: 'Alien', icon: '👽',
        desc: 'Not from around here. Has some tricks up its sleeve.',
        pros: ['+30% movement speed', 'Dash teleports to cursor position', '10% instakill chance on attack', 'Fires all equipped weapons simultaneously'],
        cons: ['Plays on a harder enemy roster', 'Smaller max HP'],
        notes: ['Crocodiles and Salamanders become Human and Alien hostile space explorers.'],
        unlock: 'custom', unlockHint: null,
        hasAlienEgg: true,
        specialWeapon: 'Plasma Blaster',
    },
    astronaut: {
        name: 'Astronaut', icon: '🧑‍🚀',
        desc: 'Lost in space. Found friends.',
        pros: ['Alien world — human space marines fight for you', 'Plasma cannon pierces all targets', 'Jetpack: hold SPACE to hover briefly', 'Marines and aliens fight each other too'],
        cons: ['Alien explorers are 2× harder', 'No melee range'],
        notes: [],
        unlock: 'astronautUnlock', unlockHint: null,
        specialWeapon: 'Plasma Cannon',
    },
    caveman: {
        name: 'Caveman', icon: '🦣',
        desc: 'No shop. No mercy. Club solves everything.',
        pros: ['Club: massive damage + stuns enemies 0.5s', 'Immune to lava damage', 'Bash trees in one hit', '20% instinct dodge chance'],
        cons: ['Cannot use shop or blacksmith', 'Very slow movement', 'No armor'],
        notes: [],
        unlock: 'cavemanUnlock', unlockHint: 'ME EAT WOOD. ME FAIL. ME TRY AGAIN',
        specialWeapon: 'Club',
    },
    stickman: {
        name: 'Stickman', icon: '🕴',
        desc: 'Drawn from a notebook. Alive somehow.',
        pros: ['Stick: very fast attacks', 'Hold attack button to spin 360° (hits all nearby)', 'Stickman world: everything becomes a pencil sketch'],
        cons: ['Very low damage', 'Short range', 'Oak branch barricades only have 1 HP'],
        notes: [],
        unlock: 'stickmanUnlock', unlockHint: 'Git sum stix',
        specialWeapon: 'Stick',
    },
    clown: {
        name: 'Clown', icon: '🤡',
        desc: 'Everyone\'s laughing. Even the enemies.',
        pros: ['Balloon sword bounces enemies off each other', 'All pets appear as balloon animals (cosmetic)', 'Joy aura: enemies occasionally drop bonus gold', 'Pet death: balloon pop stuns nearby enemies'],
        cons: ['Balloon sword: very low damage', 'Balloon sword breaks fast (low durability)'],
        notes: [],
        unlock: 'clownUnlock', unlockHint: null,
        specialWeapon: 'Balloon Sword',
    },
    monsterTamer: {
        name: 'Monster Tamer', icon: '🐾',
        desc: 'Choose two pets. Even your enemies may switch sides.',
        pros: ['Start with 2 pets', 'Pets evolve 1.5× faster', 'Enemies may defect when hitting you', 'Starts with whip'],
        cons: ['-50% player damage', '-25% speed'],
        notes: [],
        unlock: 'custom', unlockHint: null,
        specialWeapon: 'Taming Whip',
    },
    oldMan: {
        name: 'Old Man', icon: '👴',
        desc: 'Slow and frail — until he isn\'t.',
        pros: ['SUPER OLD MAN mode: collect 3 time tokens to activate (grow huge, gain all stats, cane becomes any weapon for 5s)'],
        cons: ['-40% movement speed', 'Low base damage'],
        notes: [],
        unlock: 'knightEasyX4', unlockHint: null,
        specialWeapon: 'Cane',
    },
    diver: {
        name: 'Diver', icon: '🤿',
        desc: 'The water holds secrets. Only the brave go under.',
        pros: ['Can dive underwater — water becomes translucent', 'Find treasure chests and fish underwater', 'Safe from most land enemies while submerged'],
        cons: ['Underwater enemies'],
        notes: [],
        unlock: 'custom', unlockHint: 'Swim with the fishies for a while',
        specialWeapon: 'Harpoon Gun',
    },
    blob: {
        name: 'Blob', icon: '🫧',
        desc: 'Formless. Evolving. Upgrades replaced with genes.',
        pros: ['Gene menu replaces upgrades', 'Start with spike + eye, absorb fallen enemies', 'Highly customisable biology'],
        cons: ['No weapons', 'No shop items', 'Gene system must be learned'],
        notes: [],
        unlock: 'custom', unlockHint: 'Coming soon...',
        specialWeapon: 'Blob Spike',
    },
    hoarder: {
        name: 'Hoarder', icon: '📦',
        desc: 'Carries and fires two weapons simultaneously.',
        pros: ['Right-click fires secondary weapon', '+1 weapon slot', '+15% gold'],
        cons: ['-0.3 movement speed'],
        notes: [],
        unlock: 'hoarder', unlockHint: 'Buy and fill all extra weapon slots',
        // No signature weapon — carries whatever is in the shop
    },
    collector: {
        name: 'Collector', icon: '📚',
        desc: 'A connoisseur of rare finds.',
        pros: ['+50% collectible drops', 'Built-in magnet', 'Better upgrade pool'],
        cons: ['Shop costs 50% more', 'Auto-sells unused weapons every 10-30 waves'],
        notes: [],
        unlock: 'custom', unlockHint: 'Collect one of every drop',
        specialWeapon: 'Golden Sword',
    },
    gambler: {
        name: 'Gambler', icon: '🎰',
        desc: 'Everything is random.',
        pros: ['Everything costs less', 'Random massive bonuses possible'],
        cons: ['Pets, upgrades, and wave effects are fully randomised'],
        notes: ['EVERYTHING IS RANDOM!'],
        unlock: 'custom', unlockHint: 'Reroll the shop 100 times in a single run',
        specialWeapon: 'Dice Bomb',
    },
    steve: {
        name: 'Steve', icon: '⛏',
        desc: 'Just a regular guy. With a diamond sword.',
        pros: ['Diamond Sword deals massive damage when obtained', 'Balanced stats'],
        cons: ['No special abilities', 'Gets hungry (stamina drains over time)'],
        notes: ['Definitely NOT stolen from Minecraft (pls don\'t sue me).'],
        unlock: 'hardestWin', unlockHint: null,
        specialWeapon: 'Diamond Sword',
    },
    lumberjack: {
        name: 'Lumberjack', icon: '🪓',
        desc: 'Slow, steady, and hits like a falling oak.',
        pros: ['+40% melee damage', 'Axe hits multiple enemies in arc'],
        cons: ['-30% movement speed', 'No armor'],
        notes: ['Definetely NOT stolen from Don\'t Starve (also pls don\'t sue me i\'m innocent).'],
        unlock: 'chopAllTrees', unlockHint: 'Fell every tree in your world',
        specialWeapon: 'Ryan (Legendary Axe)',
    },
    librarian: {
        name: 'Librarian', icon: '📖',
        desc: 'Knowledge is power. Every upgrade stacks higher than expected.',
        pros: ['Upgrades multiply (×1.5) instead of adding flat', '+6 upgrade choices', 'Rare books drop as buffs'],
        cons: ['Must buy upgrades (costs gold)', 'Slightly frail'],
        notes: [],
        unlock: 'tooLongDidntRead', unlockHint: null,
        specialWeapon: 'Tome of Power',
    },
    demon: {
        name: 'Demon', icon: '😈',
        desc: 'Born in hellfire. Lava is your home.',
        pros: ['Immune to lava damage', '+40% damage while in lava', 'Fire aura slows nearby enemies'],
        cons: ['-20 max HP', '-15% speed outside lava'],
        notes: [],
        unlock: 'custom', unlockHint: 'Get firey hot',
        specialWeapon: 'Hellfire Trident',
    },
    commander: {
        name: 'Commander', icon: '📢',
        desc: 'One shout commands the battlefield.',
        pros: ['Megaphone fires expanding sound rings (knockback + stun + silence + ally buff)', 'Pets deal +30% damage while nearby', 'Press E: Rally shout — +25% personal damage for 5s'],
        cons: ['Megaphone 3s cooldown', 'Low base damage'],
        notes: [],
        unlock: 'commanderUnlock', unlockHint: 'Finish your first run',
        specialWeapon: 'Megaphone',
    },
    bob: {
        name: 'Bob', icon: '🙂',
        desc: 'Just a normal guy. With a completely random weapon.',
        pros: ['Starts with a random weapon (anything goes!)', 'Nearby enemies occasionally stop and stare at Bob for 1s'],
        cons: ['No special stats', 'Weapon could be anything — good or bad'],
        notes: ['Average. Completely average.'],
        unlock: 'bobUnlock', unlockHint: 'Lose 10 runs',
        specialWeapon: 'Random',
    },
    youtuber: {
        name: 'Youtuber', icon: '📱',
        desc: 'Kills = subscribers = bonus gold. Some enemies become fans.',
        pros: ['Kill count = subscriber bonus (+1g per pickup per 10 kills)', 'Some enemies randomly become fans and fight for you', 'Selfie Stick: wide melee arc + big knockback'],
        cons: ['Subscribers reset on death', 'Must reach wave 30 to unlock'],
        notes: ['SMASH THAT LIKE BUTTON'],
        unlock: 'youtuberUnlock', unlockHint: 'Reach wave 30 as any character',
        specialWeapon: 'Selfie Stick',
    },
    koolKat: {
        name: 'Kool Kat', icon: '😎',
        desc: 'Very low HP. Nine lives. Three weapons. Way too cool.',
        pros: ['9 lives — revive at 1 HP each time', 'THREE cycling weapons: Claws → Meow → Coolness Effect', '"Coolness Effect" gives enemies deal-with-it sunglasses and makes them allies'],
        cons: ['30 max HP', 'Coolness Effect has long cooldown between cycles'],
        notes: ['Deal with it.'],
        unlock: 'koolKatUnlock', unlockHint: null,
        specialWeapon: 'Kool Kat Claws',
    },
    cowboy: {
        name: 'Cowboy', icon: '🤠',
        desc: 'Lasso, revolvers, and bounty gold.',
        pros: ['Lasso: ranged pull + stun (press R to switch to Revolver)', 'Revolver: 6 quick shots then 2s reload', '2× gold from all kills (bounty hunting)'],
        cons: ['Revolver needs 2s reload after 6 shots', 'Lasso has long cooldown'],
        notes: [],
        unlock: 'cowboyUnlock', unlockHint: 'Complete a Hard difficulty run',
        specialWeapon: 'Lasso + Revolver',
    },
    janitor: {
        name: 'Janitor', icon: '🧹',
        desc: 'Mop. Bucket. Vacuum. Every tool for every mess.',
        pros: ['Mop: leaves slippery trail (enemies slow 50%)', 'Bucket throw (SHIFT): AoE water puddle slows enemies', 'Vacuum (E): pulls all nearby enemies toward you'],
        cons: ['Low damage', 'Each tool has its own cooldown'],
        notes: [],
        unlock: 'janitorUnlock', unlockHint: 'Quick pickup',
        specialWeapon: 'Mop',
    },
    baby: {
        name: 'Baby', icon: '👶',
        desc: 'Tiny. Dies in 2 hits. 40% dodge chance.',
        pros: ['40% dodge chance (roguelike-style dodge)', 'Tiny hitbox (50% size scale)', 'Toy Mallet: massive knockback'],
        cons: ['20 max HP (dies in 2 hits)', 'Very low damage'],
        notes: ['googoogaga BAP BAP BAP wheeeeeeee'],
        unlock: 'babyUnlock', unlockHint: 'Die within the first 30 seconds of a run',
        specialWeapon: 'Toy Mallet',
    },
    rubixCuber: {
        name: 'Rubix Cuber', icon: '🎲',
        desc: 'Average guy. Throws explosive colorful cube bombs.',
        pros: ['Rubix Bomb: thrown cube explodes in colorful AoE', 'Each explosion has a wide stun radius'],
        cons: ['Long cooldown between throws', 'Very low melee range otherwise'],
        notes: ['MWAH HA HA!!! EAT PUZZLE!'],
        unlock: 'rubixCuberUnlock', unlockHint: null,
        specialWeapon: 'Rubix Bomb',
    },
    paleontologist: {
        name: 'Paleontologist', icon: '🔬',
        desc: 'Fossil staff fires bone shards. Kills summon fossil dino minions.',
        pros: ['Fossil Staff: fires bone projectiles', 'Kills summon fossil dino minions (max 3 at once, 20s lifespan)', 'Minions attack nearby enemies'],
        cons: ['Fragile (low HP)', 'Minions expire quickly'],
        notes: [],
        unlock: 'paleoUnlock', unlockHint: null,
        specialWeapon: 'Fossil Staff',
    },
};

// ─── BLOB GENE SYSTEM ───
const BLOB_GENES = [
    { id: 'spike',  name: 'Spike',        icon: '▲', color: '#66bb6a', desc: '+25% damage. You are pointy.',               startUnlocked: true },
    { id: 'eye',    name: 'Eye',          icon: '◉', color: '#42a5f5', desc: '+30 attack range. You see further.',         startUnlocked: true },
    { id: 'acid',   name: 'Acid Spit',   icon: '◆', color: '#cddc39', desc: 'Ranged acid bolt on each attack.',            unlockKey: 'blobDamage100', unlockDesc: 'Deal 100 damage' },
    { id: 'armor',  name: 'Armor Plate', icon: '▪', color: '#90a4ae', desc: '+40% max HP.',                                unlockKey: 'blobTookDmg50', unlockDesc: 'Take 50 damage' },
    { id: 'cilia',  name: 'Speed Cilia', icon: '≋', color: '#80deea', desc: '+35% movement speed.',                       unlockKey: 'blobWaves3',    unlockDesc: 'Survive 3 waves' },
    { id: 'regen',  name: 'Regen Core',  icon: '♥', color: '#f48fb1', desc: 'Restore 1 HP every 3 seconds.',              unlockKey: 'blobKills5',    unlockDesc: 'Kill 5 enemies' },
    { id: 'absorb', name: 'Absorption',  icon: '✦', color: '#ce93d8', desc: 'On kill: absorb enemy for +3 max HP.',       unlockKey: 'blobWaves5',    unlockDesc: 'Survive 5 waves' },
    { id: 'toxin',  name: 'Toxin Cloud', icon: '☁', color: '#a5d6a7', desc: 'Slow nearby enemies by 40%.',                unlockKey: 'blobKills20',   unlockDesc: 'Kill 20 enemies' },
    { id: 'split',  name: 'Cell Split',  icon: '◈', color: '#fff59d', desc: '25% dodge chance.',                          unlockKey: 'blobNearDeath', unlockDesc: 'Survive below 10% HP' },
    { id: 'macro',  name: 'Macro Cell',  icon: '⬆', color: '#ffd54f', desc: '+60% size and +60% max HP.',                 unlockKey: 'blobEquip4',    unlockDesc: 'Equip 4 genes' },
];

// ─── UNLOCKABLE PETS ───
const UNLOCKABLE_PETS = {
    unicorn:       { name: 'Unicorn',       icon: '🦄', desc: 'Heals you steadily and boosts your survivability' },
    dragon:        { name: 'Dragon',        icon: '🐉', desc: 'Breathes fire at nearby enemies periodically' },
    bat:           { name: 'Bat',           icon: '🦇', desc: 'Echolocation — slows and reveals nearby enemies' },
    scroogeMcduck: { name: 'Scrooge McDuck',icon: '🎩', desc: 'Doubles all gold pickups automatically' },
    spider:        { name: 'Spider',        icon: '🕷', desc: 'Drops webs on nearby enemies, slowing them' },
    dinopal:       { name: 'Dino Pal',      icon: '🦕', desc: 'A baby raptor that lunges at nearby enemies' },
    sharky:        { name: 'Sharky',        icon: '🦈', desc: 'A tiny shark that circles you and chomps enemies' },
    littleGuy:     { name: 'Little Guy',    icon: '👾', desc: 'A small alien that fires plasma at enemies' },
    ghosty:        { name: 'Ghosty',        icon: '👻', desc: 'A ghost companion that phases through enemies and heals you' },
    phoenix:       { name: 'Phoenix',       icon: '🔥', desc: 'A firebird reborn from your forge — circles you and erupts in flames' },
};

// ─── SKINS ───
const SKINS = {
    default:      { name: 'Knight',        icon: '⚔',  desc: 'The classic warrior look',                  unlock: null },
    millionaire:  { name: 'Top Hat',       icon: '🎩', desc: 'A distinguished top hat with a golden $ symbol', unlock: 'millionaire' },
    mrBeast:      { name: 'Rich Dude',     icon: '💸', desc: 'Sharp suit and monocle',                     unlock: 'mrBeast' },
    richestMan:   { name: 'Midas Touch',   icon: '✨', desc: 'Everything you touch turns to gold',         unlock: 'richestMan' },
    deathDefied:  { name: 'Grim Reaper',   icon: '💀', desc: 'Wreathed in Death\'s own vestments',        unlock: 'deathDefied' },
    steve:        { name: 'Steve',         icon: '⛏',  desc: 'A fellow from another cubic world',          unlock: 'gearedUp' },
    speedDemon:   { name: 'Fire Knight',   icon: '🔥', desc: 'Flame-etched armor for the swift',          unlock: 'speedDemon' },
    shadowSlayer: { name: 'Shadow Knight', icon: '🌑', desc: 'Dark armor forged in demon blood',           unlock: 'shadowDemonSlayer' },
};

const PET_EVOLUTIONS = {
    // ─── DOG ───
    dog: [
        { name: 'Retriever', icon: '🎾', desc: 'Fetches gold with growing range',
          branches: [
            { name: 'Golden Retriever', icon: '🥇', desc: 'Gold rush specialist — pulls faster and earns more',
              branches: [
                { name: 'Champion Fetch', icon: '🏆', desc: 'Gold pull range +400px, speed ×2',
                  tiers: [
                    { name: 'Wide Sweep',   icon: '🎾', desc: 'Gold pull +150px range' },
                    { name: 'Quick Paws',   icon: '🎾', desc: 'Gold pull speed ×1.5' },
                    { name: 'Long Arm',     icon: '🎾', desc: 'Gold pull +250px more range' },
                    { name: 'Rocket Fetch', icon: '🏆', desc: 'Gold pull speed ×2, range +100px' },
                    { name: 'Treasure Nose',icon: '🏆', desc: 'Gold pickups worth +5 extra each' },
                    { name: 'Hoarder Paws', icon: '🏆', desc: 'Gold pull range +200px more, pickup +5 gold' },
                    { name: 'Grand Fetch',  icon: '🏆', desc: 'Gold pull range now 600px total, speed ×3' }
                  ]
                },
                { name: 'Labrador', icon: '🦴', desc: 'Loyal fetch — gold pickups heal you slightly',
                  tiers: [
                    { name: 'Warm Muzzle',  icon: '🦴', desc: 'Gold pull +150px range' },
                    { name: 'Soft Mouth',   icon: '🦴', desc: 'Each gold pickup heals 1 HP' },
                    { name: 'Loyal Paws',   icon: '🦴', desc: 'Gold pull +200px, +2 HP per pickup' },
                    { name: 'Good Boy',     icon: '🦴', desc: 'Every 20 gold collected: heal 5 HP' },
                    { name: 'Devoted',      icon: '🦴', desc: 'Gold pull range +200px more' },
                    { name: 'Best Friend',  icon: '🦴', desc: 'Gold pickup heals 3 HP each' },
                    { name: 'Unconditional',icon: '🦴', desc: 'Gold pickups restore 5 HP each' }
                  ]
                },
                { name: 'Border Collie', icon: '🐕', desc: 'Herds enemies — gold pull pushes foes away',
                  tiers: [
                    { name: 'Herding Bark', icon: '🐕', desc: 'Gold pull +150px range' },
                    { name: 'Nip & Run',    icon: '🐕', desc: 'Collecting gold nudges nearby foes back 10px' },
                    { name: 'Flank Drive',  icon: '🐕', desc: 'Gold pull +200px, nudge range +20px' },
                    { name: 'Circle Drive', icon: '🐕', desc: 'Gold collection knocks back foes 25px' },
                    { name: 'Herd Master',  icon: '🐕', desc: 'Knockback range doubled' },
                    { name: 'Iron Herd',    icon: '🐕', desc: 'Gold pull +200px, knockback +10px' },
                    { name: 'Top Dog',      icon: '🐕', desc: 'Gold collection stuns nearby foes 0.5s' }
                  ]
                }
              ]
            }
          ]
        },
        { name: 'Guard Dog', icon: '🦮', desc: 'Bark damages nearby enemies on a timer',
          branches: [
                { name: 'Attack Dog', icon: '⚔️', desc: 'Bark deals heavy damage in a wide radius',
                  tiers: [
                    { name: 'Loud Bark',    icon: '🦮', desc: 'Bark every 3s, 20 AoE damage' },
                    { name: 'Fierce Bark',  icon: '🦮', desc: 'Bark damage +15, radius +15px' },
                    { name: 'Deep Growl',   icon: '⚔️', desc: 'Bark damage +20, stuns 0.3s' },
                    { name: 'War Howl',     icon: '⚔️', desc: 'Bark every 2.5s, damage +20 more' },
                    { name: 'Feral Rage',   icon: '⚔️', desc: 'Bark radius +30px, damage +15' },
                    { name: 'Pack Leader',  icon: '⚔️', desc: 'Bark spawns 2 echo blasts beside you' },
                    { name: 'Alpha Strike', icon: '⚔️', desc: 'Bark now deals 150 total AoE damage' }
                  ]
                },
                { name: 'Sentinel', icon: '🛡️', desc: 'Bark pushes enemies back, guarding your space',
                  tiers: [
                    { name: 'Loud Bark',    icon: '🦮', desc: 'Bark every 3s, 20 AoE damage' },
                    { name: 'Push Bark',    icon: '🛡️', desc: 'Bark knockback +20px' },
                    { name: 'Shove Howl',   icon: '🛡️', desc: 'Bark pushes harder +15px more' },
                    { name: 'Repel Burst',  icon: '🛡️', desc: 'Bark radius +25px, knockback +15px' },
                    { name: 'Force Howl',   icon: '🛡️', desc: 'Bark creates mini-shockwave' },
                    { name: 'Zone Control', icon: '🛡️', desc: 'Bark also briefly slows pushed enemies' },
                    { name: 'Aegis Howl',   icon: '🛡️', desc: 'Bark range huge, enemies can\'t close in' }
                  ]
                },
                { name: 'Thunder Hound', icon: '⚡', desc: 'Bark also stuns and chains lightning',
                  tiers: [
                    { name: 'Loud Bark',    icon: '🦮', desc: 'Bark every 3s, 20 AoE damage' },
                    { name: 'Shock Bark',   icon: '⚡', desc: 'Bark stuns hit enemies 0.5s' },
                    { name: 'Static Howl',  icon: '⚡', desc: 'Bark also chains to 2 nearby foes' },
                    { name: 'Thunder Clap', icon: '⚡', desc: 'Bark chains to 3 foes, stun 0.7s' },
                    { name: 'Storm Bark',   icon: '⚡', desc: 'Bark interval −0.5s, chain +1 target' },
                    { name: 'Volt Howl',    icon: '⚡', desc: 'Bark damage +30, stun 1s' },
                    { name: 'Zeus Dog',     icon: '⚡', desc: 'Bark triggers a full lightning strike' }
                  ]
                }
              ]
        },
        { name: 'Bloodhound', icon: '🔍', desc: 'Marks bounty targets and hunts elites',
          branches: [
                { name: 'Tracker', icon: '🗺️', desc: 'Bounties appear faster and pay more',
                  tiers: [
                    { name: 'Keen Nose',    icon: '🔍', desc: 'Bounty chance +50%' },
                    { name: 'Scent Lock',   icon: '🗺️', desc: 'Bounty reward +30%' },
                    { name: 'Trail Finder', icon: '🗺️', desc: 'Bounty chance +50% more' },
                    { name: 'Big Payout',   icon: '🗺️', desc: 'Bounty reward +50% more' },
                    { name: 'Hot On Trail', icon: '🗺️', desc: 'Bounties spawn every wave' },
                    { name: 'Master Track', icon: '🗺️', desc: 'Bounty reward ×2 total' },
                    { name: 'Manhunter',    icon: '🗺️', desc: 'Every elite is auto-marked as bounty' }
                  ]
                },
                { name: 'Sniffer', icon: '👃', desc: 'Reveals hidden enemies and chests nearby',
                  tiers: [
                    { name: 'Keen Nose',    icon: '🔍', desc: 'Bounty chance +50%' },
                    { name: 'Sniff Out',    icon: '👃', desc: 'Nearby chests glow on minimap' },
                    { name: 'Deep Sniff',   icon: '👃', desc: 'Enemies briefly revealed off-screen' },
                    { name: 'Scent Trail',  icon: '👃', desc: 'Bounties drop +20% extra gold' },
                    { name: 'Alert Nose',   icon: '👃', desc: 'Immune to surprise attacks (no first-hit crit)' },
                    { name: 'Bloodscent',   icon: '👃', desc: 'Bounty kills heal 10 HP' },
                    { name: 'Wolfnose',     icon: '👃', desc: 'Detect all elites from anywhere on map' }
                  ]
                },
                { name: 'Wolf', icon: '🐺', desc: 'Aggressive — bonus damage when hunting marked targets',
                  tiers: [
                    { name: 'Keen Nose',    icon: '🔍', desc: 'Bounty chance +50%' },
                    { name: 'Prey Drive',   icon: '🐺', desc: '+15% damage to marked/bounty targets' },
                    { name: 'Pack Instinct',icon: '🐺', desc: '+10% damage to all enemies' },
                    { name: 'Lone Wolf',    icon: '🐺', desc: '+20% damage when below 50% HP' },
                    { name: 'Frenzy',       icon: '🐺', desc: 'Kill streak extends +5% damage bonus' },
                    { name: 'Wolf Blood',   icon: '🐺', desc: '+20% overall damage' },
                    { name: 'Alpha Wolf',   icon: '🐺', desc: 'All damage +35%, mark any enemy on kill' }
                  ]
                }
              ]
            }
        ],
    // ─── CAT ───
    cat: [
        { name: 'Acrobat', icon: '🤸', desc: 'Dodge more often and more reliably',
          branches: [
            { name: 'Gymnast', icon: '🎭', desc: 'Near-perfect dodge with speed burst on success',
              tiers: [
                { name: 'Nimble',      icon: '🤸', desc: 'Dodge chance +10%' },
                { name: 'Graceful',    icon: '🤸', desc: 'Successful dodge gives brief +20% speed' },
                { name: 'Lithe',       icon: '🎭', desc: 'Dodge chance +10% more' },
                { name: 'Spring Step', icon: '🎭', desc: 'Speed burst on dodge lasts longer' },
                { name: 'Vault',       icon: '🎭', desc: 'Dodge chance now 60% total' },
                { name: 'Aerial',      icon: '🎭', desc: 'Speed burst +30%, dodge chance +5%' },
                { name: 'Untouchable', icon: '🎭', desc: 'Dodge chance 75%, stacks with all bonuses' }
              ]
            },
            { name: 'Contortionist', icon: '🌀', desc: 'Dodges leave after-images that confuse enemies',
              tiers: [
                { name: 'Nimble',       icon: '🤸', desc: 'Dodge chance +10%' },
                { name: 'Blurry',       icon: '🌀', desc: 'Dodge leaves a harmless decoy for 1s' },
                { name: 'Ghost Step',   icon: '🌀', desc: 'Decoy lasts 2s, distracts enemies' },
                { name: 'Afterimage',   icon: '🌀', desc: 'Decoy absorbs one hit before fading' },
                { name: 'Twin Decoy',   icon: '🌀', desc: 'Leave 2 decoys per dodge' },
                { name: 'Mirage',       icon: '🌀', desc: 'Decoys last 3s and deal 10 contact dmg' },
                { name: 'Phantasm',     icon: '🌀', desc: '3 decoys per dodge, each absorbs 1 hit' }
              ]
            },
            { name: 'Speed Demon Cat', icon: '💨', desc: 'Dodge builds momentum — get faster over time',
              tiers: [
                { name: 'Nimble',      icon: '🤸', desc: 'Dodge chance +10%' },
                { name: 'Slip Away',   icon: '💨', desc: 'Each dodge: +3% movement speed (stacks ×5)' },
                { name: 'Wind Feet',   icon: '💨', desc: 'Stack limit raised to 8' },
                { name: 'Blur Run',    icon: '💨', desc: 'Max speed stacks give +30% total' },
                { name: 'Sonic Paws',  icon: '💨', desc: 'Stacks no longer decay for 5s after dodge' },
                { name: 'Hyper Drive', icon: '💨', desc: 'Speed bonus per stack increased to +5%' },
                { name: 'Mach Cat',    icon: '💨', desc: 'At max stacks: become briefly invincible' }
              ]
            }
          ]
        },
        { name: 'Ninja Cat', icon: '🥷', desc: 'Dodge leaves explosive shadow decoys',
          branches: [
            { name: 'Assassin', icon: '🗡️', desc: 'Decoy explodes for massive damage',
              tiers: [
                { name: 'Shadow Step',  icon: '🥷', desc: 'Dodged hit leaves a decoy that explodes for 20 dmg' },
                { name: 'Flash Step',   icon: '🗡️', desc: 'Decoy explosion damage +25' },
                { name: 'Kill Switch',  icon: '🗡️', desc: 'Decoy pulls nearby enemies before exploding' },
                { name: 'Death Mark',   icon: '🗡️', desc: 'Explosion radius +20px, damage +30' },
                { name: 'One-Shot',     icon: '🗡️', desc: 'Decoy instakills non-boss enemies below 15% HP' },
                { name: 'Void Slash',   icon: '🗡️', desc: 'Explosion chains to 2 nearby foes' },
                { name: 'Vanishing Act',icon: '🗡️', desc: 'Leave 2 decoys, each instakill-capable' }
              ]
            },
            { name: 'Shadow Dancer', icon: '🌑', desc: 'Multiple weaker decoys that slow and poison',
              tiers: [
                { name: 'Shadow Step',  icon: '🥷', desc: 'Dodged hit leaves a decoy that explodes for 20 dmg' },
                { name: 'Dark Trail',   icon: '🌑', desc: 'Decoys slow enemies caught in blast' },
                { name: 'Toxic Shadow', icon: '🌑', desc: 'Decoy blast also poisons for 3s' },
                { name: 'Dark Dance',   icon: '🌑', desc: 'Leave 2 decoys per dodge' },
                { name: 'Shadow Flood', icon: '🌑', desc: 'Decoys slow duration increased to 2s' },
                { name: 'Night Terror', icon: '🌑', desc: 'Poison from decoys ticks faster' },
                { name: 'Void Dance',   icon: '🌑', desc: '3 decoys per dodge, each poisons and slows' }
              ]
            },
            { name: 'Smoke Bomb Cat', icon: '💣', desc: 'Dodge creates a smoke screen — blinds nearby foes',
              tiers: [
                { name: 'Shadow Step',  icon: '🥷', desc: 'Dodged hit leaves a decoy that explodes for 20 dmg' },
                { name: 'Smoke Puff',   icon: '💣', desc: 'Dodge leaves smoke: enemies in 40px lose 30% speed' },
                { name: 'Dense Smoke',  icon: '💣', desc: 'Smoke radius +20px, lasts 2s' },
                { name: 'Flash Powder', icon: '💣', desc: 'Enemies in smoke take +20% damage from you' },
                { name: 'Choking Fog',  icon: '💣', desc: 'Smoke deals 5 dmg/s to enemies inside' },
                { name: 'Blinding Ash', icon: '💣', desc: 'Smoke makes enemies slow AND deal less damage' },
                { name: 'Napalm Smoke', icon: '💣', desc: 'Smoke burns — 15 dmg/s, massive radius' }
              ]
            }
          ]
        },
        { name: 'Lucky Cat', icon: '🍀', desc: 'Dodges generate gold and luck bonuses',
          branches: [
            { name: 'Fortune Cat', icon: '🪙', desc: 'Dodge drops generous gold',
              tiers: [
                { name: 'Coin Flip',     icon: '🍀', desc: 'Dodge drops 5 gold' },
                { name: 'Lucky Break',   icon: '🪙', desc: 'Dodge drops 10 gold' },
                { name: 'Gold Dust',     icon: '🪙', desc: 'Dodge drops 18 gold' },
                { name: 'Silver Paws',   icon: '🪙', desc: 'Dodge drops 28 gold' },
                { name: 'Midas Touch',   icon: '🪙', desc: 'Dodge drops 40 gold' },
                { name: 'Fortune Smile', icon: '🪙', desc: 'Dodge drops 55 gold' },
                { name: 'Jackpot',       icon: '🪙', desc: 'Dodge drops 75 gold' }
              ]
            },
            { name: 'Charm Cat', icon: '💖', desc: 'Dodges briefly charm nearby enemies',
              tiers: [
                { name: 'Coin Flip',    icon: '🍀', desc: 'Dodge drops 5 gold' },
                { name: 'Sweet Aura',   icon: '💖', desc: '20% chance dodge charms 1 nearby enemy for 3s' },
                { name: 'Warm Eyes',    icon: '💖', desc: 'Charm chance +15%' },
                { name: 'Alluring',     icon: '💖', desc: 'Charmed enemies fight for you' },
                { name: 'Mass Charm',   icon: '💖', desc: 'Dodge can charm up to 2 enemies' },
                { name: 'Love Aura',    icon: '💖', desc: 'Charm duration +3s' },
                { name: 'Enchantress',  icon: '💖', desc: 'Dodge always charms nearest enemy, drops gold too' }
              ]
            },
            { name: 'Crit Cat', icon: '💥', desc: 'Lucky dodges boost your next attack to a critical hit',
              tiers: [
                { name: 'Coin Flip',    icon: '🍀', desc: 'Dodge drops 5 gold' },
                { name: 'Lucky Strike', icon: '💥', desc: 'After dodge: next attack crits (25% chance)' },
                { name: 'Hot Hands',    icon: '💥', desc: 'Crit chance after dodge +20%' },
                { name: 'Razor Luck',   icon: '💥', desc: 'Guaranteed crit after every dodge' },
                { name: 'Double Edge',  icon: '💥', desc: 'Guaranteed crit lasts 2 attacks' },
                { name: 'Lucky Frenzy', icon: '💥', desc: 'Crit window lasts 3 attacks' },
                { name: 'Fortune Blade',icon: '💥', desc: 'Crit multiplier after dodge is ×3 instead of ×2' }
              ]
            }
          ]
        }
    ],
    // ─── CHICKEN ───
    chicken: [
        { name: 'Bomb Chicken', icon: '💣', desc: 'Eggs explode bigger and more often',
          branches: [
            { name: 'Nuke Hen', icon: '☢️', desc: 'One massive egg with enormous blast',
              tiers: [
                { name: 'Big Boom',    icon: '💣', desc: 'Egg blast radius +20px' },
                { name: 'Heavy Shell', icon: '☢️', desc: 'Egg damage +40' },
                { name: 'Fast Fuse',   icon: '☢️', desc: 'Egg fuse time −1s' },
                { name: 'Warhead',     icon: '☢️', desc: 'Egg damage +60, radius +20px more' },
                { name: 'Fallout',     icon: '☢️', desc: 'Explosion leaves fire puddle for 3s' },
                { name: 'Critical Mass',icon:'☢️', desc: 'Egg radius +30px, damage +50' },
                { name: 'Nuke Egg',    icon: '☢️', desc: 'Egg is one giant blast: 300 dmg, huge radius' }
              ]
            },
            { name: 'Rapid Layer', icon: '⏱️', desc: 'Lay eggs more frequently',
              tiers: [
                { name: 'Big Boom',     icon: '💣', desc: 'Egg blast radius +20px' },
                { name: 'Quick Lay',    icon: '⏱️', desc: 'Egg cooldown −30 frames' },
                { name: 'Speedy Cluck', icon: '⏱️', desc: 'Egg cooldown −30 more frames' },
                { name: 'Machine Hen',  icon: '⏱️', desc: 'Egg cooldown −40 more frames' },
                { name: 'Overdrive',    icon: '⏱️', desc: 'Lay 2 eggs at once' },
                { name: 'Fury Layer',   icon: '⏱️', desc: 'Egg cooldown halved from current' },
                { name: 'Endless Eggs', icon: '⏱️', desc: 'Lay 3 eggs at once, very short fuse' }
              ]
            },
            { name: 'Napalm Bird', icon: '🔥', desc: 'Eggs leave fire trails on explosion',
              tiers: [
                { name: 'Big Boom',    icon: '💣', desc: 'Egg blast radius +20px' },
                { name: 'Ember Egg',   icon: '🔥', desc: 'Egg explosion leaves fire for 2s' },
                { name: 'Burning Yolk',icon: '🔥', desc: 'Fire lasts 3s, deals 8 dmg/s' },
                { name: 'Inferno Egg', icon: '🔥', desc: 'Fire patch radius +20px' },
                { name: 'Wall of Fire',icon: '🔥', desc: 'Explosion spawns 3 fire patches' },
                { name: 'Scorched',    icon: '🔥', desc: 'Enemies hit by fire take +20% damage from you' },
                { name: 'Napalm Nest', icon: '🔥', desc: 'Every egg spawns 5 fire patches in a ring' }
              ]
            }
          ]
        },
        { name: 'Cluster Hen', icon: '🧨', desc: 'Eggs split into smaller sub-eggs on explode',
          branches: [
            { name: 'Scatter Hen', icon: '🎆', desc: 'Many mini-eggs spread in all directions',
              tiers: [
                { name: 'Split',         icon: '🧨', desc: 'Egg splits into 3 mini-eggs' },
                { name: 'Wide Scatter',  icon: '🎆', desc: 'Mini-eggs spread further apart' },
                { name: 'Extra Shards',  icon: '🎆', desc: 'Egg splits into 5 mini-eggs' },
                { name: 'Shrapnel',      icon: '🎆', desc: 'Mini-eggs deal +20 damage each' },
                { name: 'Frag Burst',    icon: '🎆', desc: 'Mini-eggs pierce through 1 enemy' },
                { name: 'Storm Split',   icon: '🎆', desc: 'Egg splits into 8 mini-eggs' },
                { name: 'Swarm Bomb',    icon: '🎆', desc: '12 mini-eggs in full ring, each explodes' }
              ]
            },
            { name: 'Bouncing Bombs', icon: '⚽', desc: 'Mini-eggs bounce off walls and enemies',
              tiers: [
                { name: 'Split',         icon: '🧨', desc: 'Egg splits into 3 mini-eggs' },
                { name: 'Rubber Yolk',   icon: '⚽', desc: 'Mini-eggs bounce once' },
                { name: 'Pinball Hen',   icon: '⚽', desc: 'Mini-eggs bounce twice, +15 dmg' },
                { name: 'Ricochet',      icon: '⚽', desc: 'Mini-eggs bounce 4 times' },
                { name: 'Chain Bounce',  icon: '⚽', desc: 'Each bounce deals extra damage' },
                { name: 'Super Bounce',  icon: '⚽', desc: 'Mini-eggs home toward enemies after first bounce' },
                { name: 'Pinball Frenzy',icon: '⚽', desc: 'Mini-eggs bounce 8 times, each hit +30 dmg' }
              ]
            },
            { name: 'Chain Reaction', icon: '💥', desc: 'Mini-eggs also split when they explode',
              tiers: [
                { name: 'Split',         icon: '🧨', desc: 'Egg splits into 3 mini-eggs' },
                { name: 'Micro Split',   icon: '💥', desc: 'Each mini-egg splits into 2 micro-eggs' },
                { name: 'Fission',       icon: '💥', desc: 'Micro-eggs deal 15 damage each' },
                { name: 'Chain Egg',     icon: '💥', desc: 'Micro-eggs also have small AoE' },
                { name: 'Cascade',       icon: '💥', desc: 'Splits happen 3 levels deep' },
                { name: 'Fractal Bomb',  icon: '💥', desc: 'Each split adds +10 dmg to sub-eggs' },
                { name: 'Nuclear Cluck', icon: '💥', desc: '4-level chain reaction, entire screen covered' }
              ]
            }
          ]
        },
        { name: 'Golden Egg', icon: '🥚', desc: 'Eggs drop gold and provide economic bonuses',
          branches: [
            { name: 'Coin Egg', icon: '🪙', desc: 'Eggs drop increasing gold on explosion',
              tiers: [
                { name: 'Gold Yolk',   icon: '🥚', desc: 'Egg explosion drops 8 gold' },
                { name: 'Rich Yolk',   icon: '🪙', desc: 'Egg explosion drops 18 gold' },
                { name: 'Silver Egg',  icon: '🪙', desc: 'Egg explosion drops 30 gold' },
                { name: 'Gold Egg',    icon: '🪙', desc: 'Egg explosion drops 45 gold' },
                { name: 'Jewel Egg',   icon: '🪙', desc: 'Egg explosion drops 60 gold' },
                { name: 'Treasure Egg',icon: '🪙', desc: 'Egg explosion drops 80 gold' },
                { name: 'Midas Cluck', icon: '🪙', desc: 'Egg explosion drops 110 gold + heals 5 HP' }
              ]
            },
            { name: 'Merchant Hen', icon: '🛒', desc: 'Eggs reduce shop prices when collected',
              tiers: [
                { name: 'Gold Yolk',    icon: '🥚', desc: 'Egg explosion drops 8 gold' },
                { name: 'Bargain Cluck',icon: '🛒', desc: 'Shop items cost 5% less (stacks ×5)' },
                { name: 'Deal Finder',  icon: '🛒', desc: 'Shop discount +5% more' },
                { name: 'Bulk Buy',     icon: '🛒', desc: 'Shop discount +5% more' },
                { name: 'Wholesale',    icon: '🛒', desc: 'Shop discount total now 25%' },
                { name: 'Black Market', icon: '🛒', desc: 'Shop items 30% cheaper' },
                { name: 'Free Range',   icon: '🛒', desc: 'Shop is 40% cheaper, eggs drop more gold' }
              ]
            },
            { name: 'XP Egg', icon: '⭐', desc: 'Eggs drop upgrade tokens when they explode',
              tiers: [
                { name: 'Gold Yolk',    icon: '🥚', desc: 'Egg explosion drops 8 gold' },
                { name: 'Star Egg',     icon: '⭐', desc: '10% chance egg explosion grants +1 upgrade point' },
                { name: 'Lucky Shell',  icon: '⭐', desc: 'Upgrade chance +10%' },
                { name: 'Skill Egg',    icon: '⭐', desc: 'Upgrade chance 30%' },
                { name: 'Power Yolk',   icon: '⭐', desc: 'Upgrade chance 40%, eggs drop more gold too' },
                { name: 'Genius Cluck', icon: '⭐', desc: 'Upgrade chance 50%' },
                { name: 'Ascension Egg',icon: '⭐', desc: 'Every egg guaranteed +1 upgrade point' }
              ]
            }
          ]
        }
    ],
    // ─── RABBIT ───
    rabbit: [
        { name: 'Speed Bunny', icon: '⚡', desc: 'Faster dashes and movement speed',
          branches: [
            { name: 'Cheetah Bunny', icon: '🏃', desc: 'Movement speed specialization',
              tiers: [
                { name: 'Quick Paws',  icon: '⚡', desc: 'Dash cooldown −8 frames' },
                { name: 'Fleet Foot',  icon: '🏃', desc: 'Movement speed +15%' },
                { name: 'Sprint',      icon: '🏃', desc: 'Movement speed +15% more' },
                { name: 'Wind Runner', icon: '🏃', desc: 'Speed +15% more, dash cooldown −5' },
                { name: 'Light Feet',  icon: '🏃', desc: 'At high speed: dodge chance +10%' },
                { name: 'Zoom',        icon: '🏃', desc: 'Speed +20% more' },
                { name: 'Sonic Bunny', icon: '🏃', desc: 'Speed +25% more, leave speed trail that boosts further' }
              ]
            },
            { name: 'Flash Bunny', icon: '⚡', desc: 'Rapid repeat dashes with short cooldown',
              tiers: [
                { name: 'Quick Paws',  icon: '⚡', desc: 'Dash cooldown −8 frames' },
                { name: 'Rapid Hop',   icon: '⚡', desc: 'Dash cooldown −10 more frames' },
                { name: 'Stutter Step',icon: '⚡', desc: 'Dash cooldown −10 more frames' },
                { name: 'Blur',        icon: '⚡', desc: 'Dash cooldown −10 more frames' },
                { name: 'Blink Dash',  icon: '⚡', desc: 'Can store 2 dash charges' },
                { name: 'Hyper Hop',   icon: '⚡', desc: 'Dash charges recover 30% faster' },
                { name: 'Instaflash',  icon: '⚡', desc: '3 dash charges, near-zero cooldown' }
              ]
            },
            { name: 'Boost Bunny', icon: '🚀', desc: 'Dash distance dramatically increased',
              tiers: [
                { name: 'Quick Paws',   icon: '⚡', desc: 'Dash cooldown −8 frames' },
                { name: 'Long Leap',    icon: '🚀', desc: 'Dash distance +30%' },
                { name: 'Power Dash',   icon: '🚀', desc: 'Dash distance +30% more' },
                { name: 'Rocket Hop',   icon: '🚀', desc: 'Dash distance doubled from base' },
                { name: 'Hyper Leap',   icon: '🚀', desc: 'Dash distance +50% more' },
                { name: 'Orbital Skip', icon: '🚀', desc: 'Dash leaves afterburn trail damaging foes' },
                { name: 'Warp Bunny',   icon: '🚀', desc: 'Dash is a teleport — no travel, instant arrival' }
              ]
            }
          ]
        },
        { name: 'Leap Bunny', icon: '🦘', desc: 'Dash damages enemies along its path',
          branches: [
            { name: 'Battering Ram', icon: '🐏', desc: 'Dash deals heavy damage and knockback',
              tiers: [
                { name: 'War Stomp',   icon: '🦘', desc: 'Dash damages nearby foes for 25 dmg' },
                { name: 'Ram Charge',  icon: '🐏', desc: 'Dash damage +20, knock back +15px' },
                { name: 'Shockwave',   icon: '🐏', desc: 'Land creates shockwave ring' },
                { name: 'Earthquake',  icon: '🐏', desc: 'Shockwave damage +30' },
                { name: 'Crusher',     icon: '🐏', desc: 'Dash knocks back all enemies in wide cone' },
                { name: 'Juggernaut',  icon: '🐏', desc: 'Dash damage +50, briefly stuns foes hit' },
                { name: 'Comet Strike',icon: '🐏', desc: 'Dash deals 200 dmg in huge AoE on landing' }
              ]
            },
            { name: 'Drill Bunny', icon: '🌀', desc: 'Dash pierces through enemies in a line',
              tiers: [
                { name: 'War Stomp',   icon: '🦘', desc: 'Dash damages nearby foes for 25 dmg' },
                { name: 'Pierce Hop',  icon: '🌀', desc: 'Dash now hits all enemies along its path' },
                { name: 'Skewer',      icon: '🌀', desc: 'Dash damage +25' },
                { name: 'Drill Dash',  icon: '🌀', desc: 'Pierce hits deal extra knockback sideways' },
                { name: 'Spiral Rush', icon: '🌀', desc: 'Dash path widens to hit more targets' },
                { name: 'Tunnelbore',  icon: '🌀', desc: 'Dash damage +40, path width doubled' },
                { name: 'Destroyer',   icon: '🌀', desc: 'Dash pierces infinitely, leaves fire trail' }
              ]
            },
            { name: 'Poison Leap', icon: '☠️', desc: 'Dash coats hit enemies in poison',
              tiers: [
                { name: 'War Stomp',    icon: '🦘', desc: 'Dash damages nearby foes for 25 dmg' },
                { name: 'Toxic Hop',    icon: '☠️', desc: 'Enemies hit by dash are poisoned for 3s' },
                { name: 'Deep Venom',   icon: '☠️', desc: 'Poison duration +2s, damage +3/tick' },
                { name: 'Venomous',     icon: '☠️', desc: 'Poison stacks — each dash reapplies' },
                { name: 'Toxic Wave',   icon: '☠️', desc: 'Landing creates poison cloud for 2s' },
                { name: 'Plague Leap',  icon: '☠️', desc: 'Poisoned enemies spread venom on death' },
                { name: 'Venom Lord',   icon: '☠️', desc: 'Dash poison deals 15/tick, lasts 8s' }
              ]
            }
          ]
        },
        { name: 'Ghost Bunny', icon: '👻', desc: 'Dash grants brief invincibility',
          branches: [
            { name: 'Phase Bunny', icon: '🌫️', desc: 'Long invincibility window on every dash',
              tiers: [
                { name: 'Blink',       icon: '👻', desc: 'Invincible for 0.25s during dash' },
                { name: 'Phase',       icon: '🌫️', desc: 'Invincible window extended to 0.4s' },
                { name: 'Ethereal',    icon: '🌫️', desc: 'Invincible for 0.5s after dash ends' },
                { name: 'Mist Form',   icon: '🌫️', desc: 'Invincibility applies to entire dash' },
                { name: 'Ghost Walk',  icon: '🌫️', desc: '+0.3s invincibility after landing' },
                { name: 'Spectral',    icon: '🌫️', desc: 'Invincibility total now ~1.5s' },
                { name: 'Untouchable', icon: '🌫️', desc: 'Invincible 2s total; can chain into next dash' }
              ]
            },
            { name: 'Counter Bunny', icon: '🥊', desc: 'Invincibility frame triggers a counter-attack',
              tiers: [
                { name: 'Blink',         icon: '👻', desc: 'Invincible for 0.25s during dash' },
                { name: 'Dodge Counter', icon: '🥊', desc: 'Attacks during invincibility deal +25% damage' },
                { name: 'Riposte',       icon: '🥊', desc: 'First attack after dash always crits' },
                { name: 'Flash Strike',  icon: '🥊', desc: 'Auto-attack immediately on dash end' },
                { name: 'Overpower',     icon: '🥊', desc: 'Counter attack deals ×2 damage' },
                { name: 'Blitz',         icon: '🥊', desc: 'Counter attacks 3 times rapidly' },
                { name: 'Wrath Hop',     icon: '🥊', desc: 'Counter attack is a 360° AoE slam' }
              ]
            },
            { name: 'Healing Dash', icon: '💚', desc: 'Invincibility frames restore HP',
              tiers: [
                { name: 'Blink',       icon: '👻', desc: 'Invincible for 0.25s during dash' },
                { name: 'Mend Dash',   icon: '💚', desc: 'Each dash heals 3 HP' },
                { name: 'Recovery',    icon: '💚', desc: 'Dash heals 5 HP' },
                { name: 'Vital Rush',  icon: '💚', desc: 'Dash heals 8 HP' },
                { name: 'Life Blink',  icon: '💚', desc: 'Dash heals 12 HP' },
                { name: 'Rejuvenate',  icon: '💚', desc: 'Dash heals 18 HP' },
                { name: 'Phoenix Hop', icon: '💚', desc: 'Dash heals 25 HP; if below 20% HP, heals 60' }
              ]
            }
          ]
        }
    ],
    // ─── SNAKE ───
    snake: [
        { name: 'Viper', icon: '☠️', desc: 'Stronger, longer-lasting poison aura',
          branches: [
            { name: 'King Cobra', icon: '👑', desc: 'Extremely potent venom that stacks',
              tiers: [
                { name: 'Potent Venom', icon: '☠️', desc: 'Poison damage +4/tick' },
                { name: 'Toxic Blood',  icon: '👑', desc: 'Poison duration +2s' },
                { name: 'Virulent',     icon: '👑', desc: 'Poison damage +4/tick more' },
                { name: 'Deep Rot',     icon: '👑', desc: 'Poison stacks up to 2 times on same enemy' },
                { name: 'Necrotoxin',   icon: '👑', desc: 'Poison reduces enemy defense by 10%' },
                { name: 'Venom King',   icon: '👑', desc: 'Poison kills explode into venom cloud' },
                { name: 'Black Venom',  icon: '👑', desc: 'Poison ticks 3×/sec, each tick stacks debuff' }
              ]
            },
            { name: 'Rattlesnake', icon: '🪘', desc: 'Rapid-fire venom bursts from nearby position',
              tiers: [
                { name: 'Potent Venom', icon: '☠️', desc: 'Poison damage +4/tick' },
                { name: 'Rattle Burst', icon: '🪘', desc: 'Every 4s fires 3 venom blobs outward' },
                { name: 'Rapid Rattle', icon: '🪘', desc: 'Burst fires every 3s, +1 blob' },
                { name: 'Venom Fan',    icon: '🪘', desc: 'Burst fires 6 blobs in a wide spread' },
                { name: 'Fury Fangs',   icon: '🪘', desc: 'Burst fires every 2s' },
                { name: 'Death Rattle', icon: '🪘', desc: 'Each blob also poisons for longer' },
                { name: 'Serpent Storm',icon: '🪘', desc: 'Burst every 1.5s: 8 blobs in full ring' }
              ]
            },
            { name: 'Plague Snake', icon: '🧫', desc: 'Poison spreads from dead enemies to living',
              tiers: [
                { name: 'Potent Venom', icon: '☠️', desc: 'Poison damage +4/tick' },
                { name: 'Contagion',    icon: '🧫', desc: 'Poison kills infect 1 nearby enemy' },
                { name: 'Plague Bite',  icon: '🧫', desc: 'Infection jumps to 2 nearby enemies' },
                { name: 'Epidemic',     icon: '🧫', desc: 'Infection radius +30px' },
                { name: 'Pandemic',     icon: '🧫', desc: 'Infection jumps to 3 enemies' },
                { name: 'Viral',        icon: '🧫', desc: 'Infected enemies spread even faster' },
                { name: 'Apocalypse',   icon: '🧫', desc: 'Kills chain-infect entire screen' }
              ]
            }
          ]
        },
        { name: 'Cobra', icon: '👁️', desc: 'Spits venom projectiles at enemies',
          branches: [
            { name: 'Sniper Cobra', icon: '🎯', desc: 'Long-range precision venom shots',
              tiers: [
                { name: 'Spit',          icon: '👁️', desc: 'Fire 1 venom blob every 3s' },
                { name: 'Piercing Spit', icon: '🎯', desc: 'Venom blob pierces through enemies' },
                { name: 'Long Fang',     icon: '🎯', desc: 'Venom blob range +50px' },
                { name: 'True Aim',      icon: '🎯', desc: 'Venom blob homes toward target' },
                { name: 'Marksman',      icon: '🎯', desc: 'Venom blob damage +30' },
                { name: 'Deadeye',       icon: '🎯', desc: 'Venom blob fires every 2s, damage +20 more' },
                { name: 'Viper Shot',    icon: '🎯', desc: 'Fires 2 piercing homing blobs per shot' }
              ]
            },
            { name: 'Spitting Cobra', icon: '💦', desc: 'Rapid multi-shot spray of venom',
              tiers: [
                { name: 'Spit',         icon: '👁️', desc: 'Fire 1 venom blob every 3s' },
                { name: 'Twin Spit',    icon: '💦', desc: 'Fire 2 venom blobs per shot' },
                { name: 'Triple Shot',  icon: '💦', desc: 'Fire 3 venom blobs' },
                { name: 'Quad Fangs',   icon: '💦', desc: 'Fire 4 blobs in spread' },
                { name: 'Storm Spit',   icon: '💦', desc: 'Fire 6 blobs, shorter cooldown' },
                { name: 'Venom Rain',   icon: '💦', desc: 'Fire 8 blobs covering wide arc' },
                { name: 'Venom Blizzard',icon:'💦', desc: 'Fire 12 blobs in full ring every 1.5s' }
              ]
            },
            { name: 'Acid Snake', icon: '🟢', desc: 'Venom blobs leave corrosive puddles',
              tiers: [
                { name: 'Spit',          icon: '👁️', desc: 'Fire 1 venom blob every 3s' },
                { name: 'Acid Glob',     icon: '🟢', desc: 'Venom blob creates acid puddle on hit' },
                { name: 'Toxic Pool',    icon: '🟢', desc: 'Puddle lasts 3s, 5 dmg/s' },
                { name: 'Corrosion',     icon: '🟢', desc: 'Puddle weakens enemies: take +15% damage' },
                { name: 'Acid Bath',     icon: '🟢', desc: 'Puddle radius +20px, lasts longer' },
                { name: 'Dissolve',      icon: '🟢', desc: 'Enemies in puddle lose armor completely' },
                { name: 'Acid Ocean',    icon: '🟢', desc: 'Huge acid zones follow your movement' }
              ]
            }
          ]
        },
        { name: 'Constrictor', icon: '🌀', desc: 'Slows nearby enemies passively',
          branches: [
            { name: 'Boa', icon: '💪', desc: 'Extreme slow + holds enemies in place',
              tiers: [
                { name: 'Slow Coil',    icon: '🌀', desc: 'Nearby enemies slowed 15%' },
                { name: 'Grip',         icon: '💪', desc: 'Slow increased to 25%' },
                { name: 'Squeeze',      icon: '💪', desc: 'Slow radius +20px' },
                { name: 'Iron Coil',    icon: '💪', desc: 'Slow increased to 40%' },
                { name: 'Crush',        icon: '💪', desc: 'Closest enemy is fully stopped for 1s every 5s' },
                { name: 'Anaconda',     icon: '💪', desc: 'Stopped enemy takes +30% bonus damage' },
                { name: 'Titan Crush',  icon: '💪', desc: 'Hold 2 enemies at once, slow all others 50%' }
              ]
            },
            { name: 'Web Snake', icon: '🕸️', desc: 'Leaves sticky patches that immobilize enemies',
              tiers: [
                { name: 'Slow Coil',    icon: '🌀', desc: 'Nearby enemies slowed 15%' },
                { name: 'Sticky Trail', icon: '🕸️', desc: 'Leave slow patches while moving' },
                { name: 'Dense Web',    icon: '🕸️', desc: 'Patches last longer, slow more' },
                { name: 'Trap Zone',    icon: '🕸️', desc: 'Patches also reduce enemy attack speed' },
                { name: 'Spider Coil',  icon: '🕸️', desc: 'Enemies in patches take damage over time' },
                { name: 'Death Web',    icon: '🕸️', desc: 'Patches fully stop enemies for 0.5s' },
                { name: 'Web Fortress', icon: '🕸️', desc: 'Entire arena coated in web, everything slowed 60%' }
              ]
            },
            { name: 'Drain Snake', icon: '💜', desc: 'Slowed enemies lose HP to you slowly',
              tiers: [
                { name: 'Slow Coil',    icon: '🌀', desc: 'Nearby enemies slowed 15%' },
                { name: 'Life Drain',   icon: '💜', desc: 'Slowed enemies lose 2 HP/s, you gain half' },
                { name: 'Siphon',       icon: '💜', desc: 'Drain rate increased to 4 HP/s' },
                { name: 'Leech Coil',   icon: '💜', desc: 'Drain radius +30px' },
                { name: 'Soul Drain',   icon: '💜', desc: 'Drain 6 HP/s, excess goes to max HP temp bonus' },
                { name: 'Void Coil',    icon: '💜', desc: 'Drain 10 HP/s from all slowed enemies' },
                { name: 'Void Serpent', icon: '💜', desc: 'Drain 15 HP/s, heal for 100% of drain' }
              ]
            }
          ]
        }
    ],
    // ─── BIRD ───
    bird: [
        { name: 'Vortex', icon: '🌀', desc: 'Summon spinning wind vortexes that pull and damage enemies',
          branches: [
            { name: 'Cyclone', icon: '🌪️', desc: 'Massive long-lasting vortexes with huge pull radius',
              tiers: [
                { name: 'Funnel',        icon: '🌀', desc: 'Vortex every 5s — pulls enemies within 80px, 4 dmg/s' },
                { name: 'Widen',         icon: '🌪️', desc: 'Vortex radius +20px' },
                { name: 'Deep Pull',     icon: '🌪️', desc: 'Pull force increased; vortex lasts longer' },
                { name: 'Eye of Storm',  icon: '🌪️', desc: 'Vortex center deals bonus damage per tick' },
                { name: 'Linger',        icon: '🌪️', desc: 'Vortex duration +2s, radius grows over time' },
                { name: 'Major Cyclone', icon: '🌪️', desc: 'Enormous vortex; briefly stuns pulled enemies' },
                { name: 'Tornado',       icon: '🌪️', desc: 'Roaming vortex sweeps the area, 15 dmg/s' }
              ]
            },
            { name: 'Dust Devil', icon: '💨', desc: 'Spawn multiple orbiting mini-vortexes around you',
              tiers: [
                { name: 'Funnel',       icon: '🌀', desc: 'Vortex every 5s — pulls enemies within 80px, 4 dmg/s' },
                { name: 'Twin Funnels', icon: '💨', desc: 'Spawn 2 vortexes that orbit around you' },
                { name: 'Swarm',        icon: '💨', desc: 'Spawn 3 orbiting vortexes' },
                { name: 'Dance',        icon: '💨', desc: 'Vortexes orbit faster, covering more area' },
                { name: 'Surge',        icon: '💨', desc: 'Each vortex deals 8 dmg/s' },
                { name: 'Whirl Storm',  icon: '💨', desc: '5 orbiting vortexes at once' },
                { name: 'Maelstrom',    icon: '💨', desc: '8 orbiting vortexes; 12 dmg/s each' }
              ]
            },
            { name: 'Gale Force', icon: '⚡', desc: 'Vortex shreds enemies with razor wind — heavy damage',
              tiers: [
                { name: 'Funnel',          icon: '🌀', desc: 'Vortex every 5s — pulls enemies within 80px, 4 dmg/s' },
                { name: 'Sharp Wind',      icon: '⚡', desc: 'Vortex damage +5/s' },
                { name: 'Shred',           icon: '⚡', desc: 'Vortex damage +5 more' },
                { name: 'Razor Gale',      icon: '⚡', desc: 'Enemies in vortex slowed 30%' },
                { name: 'Crushing Winds',  icon: '⚡', desc: 'Enemies in vortex take +20% damage from all sources' },
                { name: 'Blade Storm',     icon: '⚡', desc: 'Vortex deals 20 dmg/s' },
                { name: 'Wind Reaper',     icon: '⚡', desc: '25 dmg/s; enemies inside die 25% faster' }
              ]
            }
          ]
        },
        { name: 'Tailwind', icon: '💨', desc: 'Ride the wind — speed boosts, dash enhancements, and wind trails',
          branches: [
            { name: 'Slipstream', icon: '🏃', desc: 'Pure movement speed and evasion',
              tiers: [
                { name: 'Gust',         icon: '💨', desc: '+15% movement speed passively' },
                { name: 'Speed Up',     icon: '🏃', desc: '+10% more movement speed' },
                { name: 'Air Step',     icon: '🏃', desc: '+5% more movement speed' },
                { name: 'Wind Walk',    icon: '🏃', desc: 'Dashing briefly makes you untouchable' },
                { name: 'Blur',         icon: '🏃', desc: '+15% movement speed more' },
                { name: 'Phantom Step', icon: '🏃', desc: 'Dash afterimage absorbs 1 hit' },
                { name: 'Sonic Boom',   icon: '🏃', desc: 'Max speed; dash creates a shockwave knocking back enemies' }
              ]
            },
            { name: 'Gust Trail', icon: '🌬️', desc: 'Leave a damaging wind trail in your wake',
              tiers: [
                { name: 'Gust',           icon: '💨', desc: '+15% movement speed passively' },
                { name: 'Wind Trail',     icon: '🌬️', desc: 'Movement leaves trail dealing 5 dmg/s to enemies' },
                { name: 'Sharp Trail',    icon: '🌬️', desc: 'Trail damage +5' },
                { name: 'Long Trail',     icon: '🌬️', desc: 'Trail lasts 50% longer' },
                { name: 'Gale Path',      icon: '🌬️', desc: 'Trail also slows enemies 30%' },
                { name: 'Storm Track',    icon: '🌬️', desc: 'Trail deals 20 dmg/s in a wider swath' },
                { name: 'Hurricane Path', icon: '🌬️', desc: 'Massive trail, 30 dmg/s, briefly stuns on contact' }
              ]
            },
            { name: 'Jet Stream', icon: '🚀', desc: 'Dash deals collision damage; extra charges unlock with upgrades',
              tiers: [
                { name: 'Gust',       icon: '💨', desc: '+15% movement speed passively' },
                { name: 'Burst',      icon: '🚀', desc: 'Dashing deals 20 collision damage to nearby enemies' },
                { name: 'Momentum',   icon: '🚀', desc: 'Dash damage +20' },
                { name: 'Impact',     icon: '🚀', desc: 'Dash knocks enemies back hard' },
                { name: 'Airborne',   icon: '🚀', desc: '+1 extra dash charge' },
                { name: 'Mach Dash',  icon: '🚀', desc: '+1 more dash charge; dash deals 60 total damage' },
                { name: 'Hypersonic', icon: '🚀', desc: 'Every 15s: unlimited dashes for 3s' }
              ]
            }
          ]
        },
        { name: 'Storm', icon: '⛈️', desc: 'Build static charge on nearby enemies, then unleash lightning',
          branches: [
            { name: 'Lightning Rod', icon: '⚡', desc: 'Discharge fires focused bolts that chain between enemies',
              tiers: [
                { name: 'Static',         icon: '⛈️', desc: 'Nearby enemies gain charge; discharge every 8s for 30 dmg' },
                { name: 'Focused Strike', icon: '⚡', desc: 'Discharge hits highest-HP enemy for 50 dmg' },
                { name: 'Chain',          icon: '⚡', desc: 'Discharge chains to 2 nearby enemies' },
                { name: 'Overcharge',     icon: '⚡', desc: 'Charge builds faster; discharge dmg +20' },
                { name: 'Forked',         icon: '⚡', desc: 'Each bolt chains to 2 more targets' },
                { name: 'Ball Lightning', icon: '⚡', desc: 'Bouncing bolt hits up to 5 enemies' },
                { name: 'God Strike',     icon: '⚡', desc: '200-dmg bolt every 5s; chains to all nearby' }
              ]
            },
            { name: 'Thunderhead', icon: '🌩️', desc: 'Storm discharges fire far more frequently',
              tiers: [
                { name: 'Static',        icon: '⛈️', desc: 'Nearby enemies gain charge; discharge every 5s for 30 dmg' },
                { name: 'Storm Cloud',   icon: '🌩️', desc: 'More frequent discharges hitting closest enemy' },
                { name: 'Bigger Cloud',  icon: '🌩️', desc: 'Charge radius +40px' },
                { name: 'Heavy Thunder', icon: '🌩️', desc: '+15 dmg per discharge' },
                { name: 'Persistent',    icon: '🌩️', desc: 'Discharge rate +50% faster' },
                { name: 'Supercell',     icon: '🌩️', desc: 'Discharges hit 3 enemies at once' },
                { name: 'Megastorm',     icon: '🌩️', desc: 'Rapid discharge hits 5 enemies every 3s' }
              ]
            },
            { name: 'Tempest', icon: '🌪️', desc: 'Discharge blasts knock enemies back with shockwaves',
              tiers: [
                { name: 'Static',          icon: '⛈️', desc: 'Nearby enemies gain charge; discharge every 8s for 30 dmg' },
                { name: 'Wind Shock',      icon: '🌪️', desc: 'Discharge pushes enemies back' },
                { name: 'Shockwave',       icon: '🌪️', desc: 'Knockback range +50px' },
                { name: 'Thunder Clap',    icon: '🌪️', desc: 'Discharge stuns all nearby enemies for 0.5s' },
                { name: 'Lightning Spear', icon: '🌪️', desc: 'Discharge fires 3 bolts in different directions' },
                { name: 'Squall',          icon: '🌪️', desc: 'Periodic mini-storms spawn on random enemies' },
                { name: 'Perfect Storm',   icon: '🌪️', desc: 'Every 5s: 50 dmg to all enemies + push to screen edges' }
              ]
            }
          ]
        }
    ],
    // ─── HAMSTER ───
    hamster: [
        { name: 'Hoarder', icon: '💰', desc: 'Extra bonus gold on every pickup',
          branches: [
            { name: 'Pack Rat', icon: '🐀', desc: 'Simply earns more and more gold',
              tiers: [
                { name: 'Pack Rat',      icon: '💰', desc: '+4 bonus gold per pickup' },
                { name: 'Collector',     icon: '🐀', desc: '+6 bonus gold per pickup' },
                { name: 'Hoarder',       icon: '🐀', desc: '+9 bonus gold per pickup' },
                { name: 'Packmaster',    icon: '🐀', desc: '+13 bonus gold per pickup' },
                { name: 'Gold Fever',    icon: '🐀', desc: '+18 bonus gold per pickup' },
                { name: 'Greedmaster',   icon: '🐀', desc: '+24 bonus gold per pickup' },
                { name: 'Dragon Hoard',  icon: '🐀', desc: '+32 bonus gold per pickup' }
              ]
            },
            { name: 'Investor', icon: '📈', desc: 'Gold pickups also grant small stat bonuses',
              tiers: [
                { name: 'Pack Rat',       icon: '💰', desc: '+4 bonus gold per pickup' },
                { name: 'Compound',       icon: '📈', desc: 'Every 50 gold: +1% permanent damage' },
                { name: 'Interest',       icon: '📈', desc: 'Compound triggers every 40 gold' },
                { name: 'Portfolio',      icon: '📈', desc: 'Compound also gives +1 max HP' },
                { name: 'Dividends',      icon: '📈', desc: 'Compound triggers every 30 gold' },
                { name: 'Bull Market',    icon: '📈', desc: 'Compound gives +2% damage and +2 HP' },
                { name: 'Wall Street',    icon: '📈', desc: 'Every 20 gold: +3% damage, +2 HP, +1 speed' }
              ]
            },
            { name: 'Banker', icon: '🏦', desc: 'Stored gold grants temporary combat power',
              tiers: [
                { name: 'Pack Rat',    icon: '💰', desc: '+4 bonus gold per pickup' },
                { name: 'Piggy Bank',  icon: '🏦', desc: 'At 200+ gold: +10% damage' },
                { name: 'Savings',     icon: '🏦', desc: 'At 200+ gold: +5% more damage' },
                { name: 'Vault',       icon: '🏦', desc: 'At 500+ gold: +20% total damage' },
                { name: 'Fort Knox',   icon: '🏦', desc: 'Also gain +10% speed when rich' },
                { name: 'Billionaire', icon: '🏦', desc: 'At 1000+ gold: +15% more damage, +10% speed' },
                { name: 'Tycoon',      icon: '🏦', desc: 'Rich bonuses stack — every 200g above threshold: +5% damage' }
              ]
            }
          ]
        },
        { name: 'Wheel Runner', icon: '⚙️', desc: 'Moving builds up a speed burst',
          branches: [
            { name: 'Nitro Hamster', icon: '🏎️', desc: 'Speed burst is faster and lasts longer',
              tiers: [
                { name: 'Speedy Wheel', icon: '⚙️', desc: 'After 3s moving: +20% speed for 2s' },
                { name: 'Overdrive',    icon: '🏎️', desc: 'Speed burst +5% more' },
                { name: 'Turbo',        icon: '🏎️', desc: 'Burst lasts +1s' },
                { name: 'Nitro',        icon: '🏎️', desc: 'Speed burst +10% more, charge time −0.5s' },
                { name: 'Supercharge',  icon: '🏎️', desc: 'Burst lasts +1s more' },
                { name: 'Full Throttle',icon: '🏎️', desc: 'Speed burst +15% more' },
                { name: 'Hyperdrive',   icon: '🏎️', desc: 'Burst gives +70% speed for 5s, 1s charge' }
              ]
            },
            { name: 'Fire Wheel', icon: '🔥', desc: 'Speed burst leaves a burning fire trail',
              tiers: [
                { name: 'Speedy Wheel', icon: '⚙️', desc: 'After 3s moving: +20% speed for 2s' },
                { name: 'Ember Run',    icon: '🔥', desc: 'Burst leaves fire trail dealing 6 dmg/s' },
                { name: 'Blaze',        icon: '🔥', desc: 'Fire trail damage +4 more' },
                { name: 'Inferno Run',  icon: '🔥', desc: 'Fire trail width doubled' },
                { name: 'Wildfire',     icon: '🔥', desc: 'Fire trail lasts longer' },
                { name: 'Scorched Path',icon: '🔥', desc: 'Fire trail also slows enemies 20%' },
                { name: 'Pyro Wheel',   icon: '🔥', desc: 'Massive fire storm on burst activation' }
              ]
            },
            { name: 'Ram Hamster', icon: '🐏', desc: 'Speed burst lets you deal collision damage',
              tiers: [
                { name: 'Speedy Wheel', icon: '⚙️', desc: 'After 3s moving: +20% speed for 2s' },
                { name: 'Body Check',   icon: '🐏', desc: 'While bursting: contact deals 20 damage' },
                { name: 'Shoulder Ram', icon: '🐏', desc: 'Contact damage +15, knockback +10px' },
                { name: 'Battering Run',icon: '🐏', desc: 'Contact damage +20, bigger hit area' },
                { name: 'War Charge',   icon: '🐏', desc: 'Contact damage +25, stuns foes 0.5s' },
                { name: 'Juggernaut',   icon: '🐏', desc: 'Contact damage +30, immune to knockback during burst' },
                { name: 'Hyper Ram',    icon: '🐏', desc: 'Contact deals 150 dmg, sends foes flying' }
              ]
            }
          ]
        },
        { name: 'Cheek Bomb', icon: '💥', desc: 'Absorbs hits in cheeks, releases as explosion',
          branches: [
            { name: 'Power Bomb', icon: '💣', desc: 'Release is a huge damage explosion',
              tiers: [
                { name: 'Stuff Cheeks', icon: '💥', desc: 'Store up to 3 hits, release as burst' },
                { name: 'Big Blast',    icon: '💣', desc: 'Burst damage +30%' },
                { name: 'Power Charge', icon: '💣', desc: 'Burst radius +20px' },
                { name: 'Explosive',    icon: '💣', desc: 'Burst damage +30% more' },
                { name: 'Overload',     icon: '💣', desc: 'Burst radius +30px more' },
                { name: 'Mega Bomb',    icon: '💣', desc: 'Burst damage +40% more' },
                { name: 'Annihilate',   icon: '💣', desc: 'Burst deals 400 total damage in huge radius' }
              ]
            },
            { name: 'Shield Hamster', icon: '🛡️', desc: 'Cheeks absorb more hits before releasing',
              tiers: [
                { name: 'Stuff Cheeks', icon: '💥', desc: 'Store up to 3 hits, release as burst' },
                { name: 'Puffy Cheeks', icon: '🛡️', desc: 'Store up to 4 hits' },
                { name: 'Plump',        icon: '🛡️', desc: 'Store up to 5 hits' },
                { name: 'Bulging',      icon: '🛡️', desc: 'Store up to 6 hits' },
                { name: 'Invincible Cheeks',icon:'🛡️',desc: 'Store up to 7 hits, each stored hit reduces next burst cooldown' },
                { name: 'Iron Cheeks',  icon: '🛡️', desc: 'Store up to 8 hits, each stored hit heals 1 HP' },
                { name: 'Fortress Cheeks',icon:'🛡️',desc: 'Store 10 hits; during storage you take 30% less damage' }
              ]
            },
            { name: 'Scatter Hamster', icon: '🎆', desc: 'Burst releases many seeking projectiles',
              tiers: [
                { name: 'Stuff Cheeks', icon: '💥', desc: 'Store up to 3 hits, release as burst' },
                { name: 'Spit Shot',    icon: '🎆', desc: 'Burst fires 4 seeking projectiles' },
                { name: 'Scatter Shot', icon: '🎆', desc: 'Burst fires 6 seeking projectiles' },
                { name: 'Hail Fire',    icon: '🎆', desc: 'Burst fires 8 projectiles, each deals 30 dmg' },
                { name: 'Storm Burst',  icon: '🎆', desc: 'Burst fires 12 seeking shots' },
                { name: 'Seeking Flak', icon: '🎆', desc: 'Projectiles home more aggressively' },
                { name: 'Lock-On',      icon: '🎆', desc: '20 seeking shots hit every enemy on screen once' }
              ]
            }
          ]
        }
    ],
    // ─── TURTLE ───
    turtle: [
        { name: 'Iron Shell', icon: '🛡️', desc: 'Shell absorbs a portion of damage taken',
          branches: [
            { name: 'Diamond Shell', icon: '💎', desc: 'Maximum damage absorption',
              tiers: [
                { name: 'Hard Shell',   icon: '🛡️', desc: 'Absorb 10% of damage taken' },
                { name: 'Solid Shell',  icon: '💎', desc: 'Absorb 15% of damage taken' },
                { name: 'Tough Shell',  icon: '💎', desc: 'Absorb 20% of damage taken' },
                { name: 'Iron Shell',   icon: '💎', desc: 'Absorb 28% of damage taken' },
                { name: 'Steel Shell',  icon: '💎', desc: 'Absorb 35% of damage taken' },
                { name: 'Titanium Shell',     icon: '💎', desc: 'Absorb 43% of damage taken' },
                { name: 'Diamond Shell',icon: '💎', desc: 'Absorb 50% of damage taken' }
              ]
            },
            { name: 'Reactive Shell', icon: '⚡', desc: 'Absorption generates a damage-boosting charge',
              tiers: [
                { name: 'Hard Shell',    icon: '🛡️', desc: 'Absorb 10% of damage taken' },
                { name: 'Shell Charge',  icon: '⚡', desc: 'Each absorbed hit charges shell (+5% damage, max 3)' },
                { name: 'Power Shell',   icon: '⚡', desc: 'Charge max raised to 5' },
                { name: 'Discharge',     icon: '⚡', desc: 'At max charge: next attack unleashes stored energy' },
                { name: 'Overcharge',    icon: '⚡', desc: 'Discharge deals 80 bonus AoE damage' },
                { name: 'Shell Cannon',  icon: '⚡', desc: 'Discharge fires in 3 directions' },
                { name: 'Living Battery',icon: '⚡', desc: 'Always max charge; discharge every attack' }
              ]
            },
            { name: 'Mirror Shell', icon: '🪞', desc: 'Absorbed damage is stored and returned as reflect burst',
              tiers: [
                { name: 'Hard Shell',    icon: '🛡️', desc: 'Absorb 10% of damage taken' },
                { name: 'Deflect',       icon: '🪞', desc: 'Absorbed damage stored; release as burst when hit 5 times' },
                { name: 'Reflection',    icon: '🪞', desc: 'Burst damage = stored damage ×1.5' },
                { name: 'Mirror Blast',  icon: '🪞', desc: 'Burst fires outward in all directions' },
                { name: 'Echo Shield',   icon: '🪞', desc: 'Burst triggers every 4 hits' },
                { name: 'Perfect Mirror',icon: '🪞', desc: 'Reflection multiplier ×2.5' },
                { name: 'Shining Aegis', icon: '🪞', desc: 'Every hit reflected; burst huge AoE 360°' }
              ]
            }
          ]
        },
        { name: 'Spike Shell', icon: '💢', desc: 'Shell spikes deal damage back to attackers',
          branches: [
            { name: 'Razorback', icon: '🔪', desc: 'Massive retaliation damage',
              tiers: [
                { name: 'Spiny',       icon: '💢', desc: 'Return 8 dmg to attackers' },
                { name: 'Thorny',      icon: '🔪', desc: 'Return 15 dmg to attackers' },
                { name: 'Barbed',      icon: '🔪', desc: 'Return 22 dmg, knockback' },
                { name: 'Spike Burst', icon: '🔪', desc: 'Return 30 dmg, small AoE' },
                { name: 'Razor',       icon: '🔪', desc: 'Return 40 dmg' },
                { name: 'Razorback',   icon: '🔪', desc: 'Return 55 dmg, AoE explosion' },
                { name: 'Death Spikes',icon: '🔪', desc: 'Return 80 dmg, large AoE, stuns 1s' }
              ]
            },
            { name: 'Poison Turtle', icon: '☠️', desc: 'Spikes also coat attackers in poison',
              tiers: [
                { name: 'Spiny',         icon: '💢', desc: 'Return 8 dmg to attackers' },
                { name: 'Venom Spikes',  icon: '☠️', desc: 'Attackers are poisoned for 3s' },
                { name: 'Deep Poison',   icon: '☠️', desc: 'Poison duration +2s, +3 dmg/tick' },
                { name: 'Toxic Shell',   icon: '☠️', desc: 'Poison also slows attacker 20%' },
                { name: 'Plague Spikes', icon: '☠️', desc: 'Poison spreads to enemies near the attacker' },
                { name: 'Lethal Shell',  icon: '☠️', desc: 'Poison damage +5/tick more' },
                { name: 'Venom Fortress',icon: '☠️', desc: 'All nearby enemies passively poisoned; attacker gets 2 stacks' }
              ]
            },
            { name: 'Shock Shell', icon: '⚡', desc: 'Spikes release electricity on hit',
              tiers: [
                { name: 'Spiny',         icon: '💢', desc: 'Return 8 dmg to attackers' },
                { name: 'Static Spike',  icon: '⚡', desc: 'Attacker hit stuns for 0.3s' },
                { name: 'Shock Pulse',   icon: '⚡', desc: 'Shock chains to 1 nearby enemy' },
                { name: 'Arc Shell',     icon: '⚡', desc: 'Shock chains to 2 enemies, damage +15' },
                { name: 'Tesla Shell',   icon: '⚡', desc: 'Shock stun duration +0.3s' },
                { name: 'Lightning Rod', icon: '⚡', desc: 'Shock chains to 4 enemies' },
                { name: 'Electro Turtle',icon: '⚡', desc: 'Every hit: full lightning AoE, stun all nearby 1s' }
              ]
            }
          ]
        },
        { name: 'Ancient Shell', icon: '🏺', desc: 'Shell slowly regenerates your HP',
          branches: [
            { name: 'Mending Shell', icon: '💚', desc: 'Continuously increasing HP regen',
              tiers: [
                { name: 'Self Repair',  icon: '🏺', desc: 'Regen 1 HP per 3 seconds' },
                { name: 'Shell Mend',   icon: '💚', desc: 'Regen 1 HP per 2 seconds' },
                { name: 'Healing',      icon: '💚', desc: 'Regen 2 HP per 2 seconds' },
                { name: 'Renewal',      icon: '💚', desc: 'Regen 2 HP per second' },
                { name: 'Restoration',  icon: '💚', desc: 'Regen 3 HP per second' },
                { name: 'Vitality',     icon: '💚', desc: 'Regen 4 HP per second' },
                { name: 'Ancient Power',icon: '💚', desc: 'Regen 6 HP/s + +40 max HP' }
              ]
            },
            { name: 'Overgrowth Shell', icon: '🌱', desc: 'Shell grows larger — increasing max HP',
              tiers: [
                { name: 'Self Repair',  icon: '🏺', desc: 'Regen 1 HP per 3 seconds' },
                { name: 'Thicken',      icon: '🌱', desc: 'Max HP +20' },
                { name: 'Grow Shell',   icon: '🌱', desc: 'Max HP +25, regen +0.5 HP/s' },
                { name: 'Reinforce',    icon: '🌱', desc: 'Max HP +30' },
                { name: 'Fortify',      icon: '🌱', desc: 'Max HP +35, regen +1 HP/s' },
                { name: 'Bulwark',      icon: '🌱', desc: 'Max HP +40' },
                { name: 'Colossus',     icon: '🌱', desc: 'Max HP +200 total from this path, regen 3 HP/s' }
              ]
            },
            { name: 'Soul Shell', icon: '✨', desc: 'Shell links to your spirit — heals when you kill',
              tiers: [
                { name: 'Self Repair',   icon: '🏺', desc: 'Regen 1 HP per 3 seconds' },
                { name: 'Life Steal',    icon: '✨', desc: 'Kills restore 2 HP' },
                { name: 'Soul Harvest',  icon: '✨', desc: 'Kill restore +1 HP more' },
                { name: 'Spirit Bond',   icon: '✨', desc: 'Kills restore 5 HP' },
                { name: 'Soul Link',     icon: '✨', desc: 'Boss kills restore 30 HP' },
                { name: 'Soul Feast',    icon: '✨', desc: 'Kills restore 8 HP' },
                { name: 'Immortal Shell',icon: '✨', desc: 'Kill restores 12 HP; on low HP: kill restores 30 HP' }
              ]
            }
          ]
        }
    ]
};

// ─── WEAPONS ───
const ALL_WEAPONS = {
    sword:       { name: 'Sword',         icon: '⚔️',   range: 40,  damage: 50,  cooldown: 15,  desc: 'Basic melee slash',                          price: 0,   maxDurability: 200 },
    bow:         { name: 'Bow & Arrow',   icon: '🏹',   range: 250, damage: 35,  cooldown: 25,  desc: 'Fires arrows toward cursor',                  price: 150, maxDurability: 160 },
    doubleSword: { name: 'Double Sword',  icon: '⚔️⚔️', range: 50,  damage: 35,  cooldown: 20,  desc: 'Slashes front AND back',                      price: 200, maxDurability: 140 },
    spear:       { name: 'Spear',         icon: '🔱',   range: 65,  damage: 45,  cooldown: 18,  desc: 'Long thrust, far reaching',                   price: 180, maxDurability: 175 },
    axe:         { name: 'War Axe',       icon: '🪓',   range: 45,  damage: 80,  cooldown: 30,  desc: 'Slow devastating cleave',                     price: 250, maxDurability: 170 },
    dagger:      { name: 'Twin Daggers',  icon: '🗡️',   range: 30,  damage: 25,  cooldown: 8,   desc: 'Rapid strikes',                               price: 120, maxDurability: 120 },
    crossbow:    { name: 'Crossbow',      icon: '🎯',   range: 300, damage: 60,  cooldown: 40,  desc: 'Powerful long-range bolt',                    price: 300, maxDurability: 150 },
    flail:       { name: 'Flail',         icon: '⛓️',   range: 60,  damage: 55,  cooldown: 22,  desc: 'Wide sweeping arc',                           price: 220, maxDurability: 145 },
    magicStaff:  { name: 'Magic Staff',   icon: '🪄',   range: 200, damage: 30,  cooldown: 20,  desc: 'Homing magic orbs',                           price: 350, maxDurability: 100 },
    boomerang:   { name: 'Boomerang',     icon: '🪃',   range: 200, damage: 40,  cooldown: 35,  desc: 'Returns to you, hits twice',                  price: 280, maxDurability: 185 },
    scythe:      { name: 'Scythe',        icon: '🌙',   range: 55,  damage: 65,  cooldown: 28,  desc: '360 spin, hits all around',                   price: 240, maxDurability: 155 },
    bomb:        { name: 'Bomb',          icon: '💣',   range: 70,  damage: 120, cooldown: 60,  desc: 'Thrown fused explosive',                      price: 320, maxDurability: 80  },
    whip:        { name: 'Whip',          icon: '🪢',   range: 90,  damage: 45,  cooldown: 18,  desc: 'Wide arc, chains through all enemies hit',    price: 210, maxDurability: 130 },
    // ── Charity weapon (given free when player has no weapons and no gold) ──
    woodenDagger: { name: 'Wooden Dagger', icon: '🪵', range: 35, damage: 25, cooldown: 15, desc: 'A crude stick. Better than nothing.', price: 0, maxDurability: 150, isCharity: true },
    // ── Fusion weapons (crafted at Blacksmith) ──
    mace:              { name: 'Mace',                  icon: '🔨', range: 58,  damage: 105, cooldown: 35,  desc: 'AOE slam — devastating area damage',    price: 0, maxDurability: 200, isFusion: true, ingredients: ['flail',  'spike_orb']        },
    atomicBomb:        { name: 'Atomic Bomb',            icon: '☢',  range: 130, damage: 280, cooldown: 120, desc: 'Huge explosion with massive blast',     price: 0, maxDurability: 80,  isFusion: true, ingredients: ['bomb',   'flame_gem']        },
    poseidonTrident:   { name: "Poseidon's Trident",    icon: '🔱', range: 280, damage: 62,  cooldown: 22,  desc: '3 bouncing water bolts',               price: 0, maxDurability: 175, isFusion: true, ingredients: ['spear',  'water_gem']        },
    thunderbow:        { name: 'Thunderbow',             icon: '⚡', range: 260, damage: 52,  cooldown: 28,  desc: 'Arrows chain lightning on hit',         price: 0, maxDurability: 155, isFusion: true, ingredients: ['bow',    'lightning_shard']  },
    soulReaper:        { name: 'Soul Reaper',            icon: '💀', range: 46,  damage: 72,  cooldown: 16,  desc: 'Lifesteal + executes at 15% HP',        price: 0, maxDurability: 165, isFusion: true, ingredients: ['sword',  'soul_crystal']     },
    serpentFangs:      { name: 'Serpent Fangs',         icon: '🐍', range: 28,  damage: 30,  cooldown: 7,   desc: 'Ultra-fast — poisons on every hit',     price: 0, maxDurability: 115, isFusion: true, ingredients: ['dagger', 'venom_fang']       },
    deathScythe:       { name: "Death's Scythe",        icon: '☠',  range: 62,  damage: 78,  cooldown: 30,  desc: '360 spin + executes at 20% HP',         price: 0, maxDurability: 150, isFusion: true, ingredients: ['scythe', 'bone_fragment']    },
    chainLightningWhip:{ name: 'Chain Lightning Whip',  icon: '⚡', range: 100, damage: 55,  cooldown: 20,  desc: 'Whip that chains to 4 more enemies',   price: 0, maxDurability: 125, isFusion: true, ingredients: ['whip',   'chain_link']       },
    // ─── Character-exclusive starting weapons (not purchaseable) ───
    hellfireStaff:     { name: 'Hellfire Staff',        icon: '🔥', range: 60,  damage: 55,  cooldown: 22,  desc: 'AoE fire cone; +60% dmg in lava',       price: 0, maxDurability: 200, isCharExclusive: true },
    plasmaBlaster:     { name: 'Plasma Blaster',        icon: '🔫', range: 280, damage: 42,  cooldown: 20,  desc: 'Piercing energy bolt toward cursor',     price: 0, maxDurability: 200, isCharExclusive: true },
    dragonBreath:      { name: 'Dragon Breath',         icon: '🔥', range: 0,   damage: 0,   cooldown: 1,   desc: 'Hold to charge fire cone — release to fire.',   price: 0, maxDurability: 9999, isCharExclusive: true },
    blobSpike:         { name: 'Blob Spike',            icon: '▲', range: 42,  damage: 28,  cooldown: 35,  desc: 'Melee spike. Grows with gene upgrades.',        price: 0, maxDurability: 9999, isCharExclusive: true },
    blobAcid:          { name: 'Acid Spit',             icon: '◆', range: 240, damage: 20,  cooldown: 30,  desc: 'Ranged acid bolt (acid gene).',                 price: 0, maxDurability: 9999, isCharExclusive: true },
    // ─── Additional character-exclusive weapons ───
    dinnerFork:      { name: 'Dinner Fork',     icon: '🍴', range: 35,  damage: 55,  cooldown: 10, desc: 'Fast jabs.',                                         price: 0, maxDurability: 9999, isCharExclusive: true },
    stilettoHeel:    { name: 'Stiletto Heel',   icon: '👠', range: 26,  damage: 28,  cooldown: 5,  desc: 'Rapid poke. +35% crit.',                              price: 0, maxDurability: 9999, isCharExclusive: true },
    shadowBlade:     { name: 'Shadow Blade',    icon: '🗡', range: 38,  damage: 55,  cooldown: 14, desc: '3× damage for 60 frames after dash.',                 price: 0, maxDurability: 9999, isCharExclusive: true },
    divineSword:     { name: 'Divine Sword',    icon: '✝', range: 44,  damage: 50,  cooldown: 18, desc: 'Melee + fires holy bolt on each swing.',              price: 0, maxDurability: 9999, isCharExclusive: true },
    monoLaser:       { name: 'Monocle Laser',   icon: '🔴', range: 320, damage: 80,  cooldown: 50, desc: 'Precise laser beam.',                                 price: 0, maxDurability: 9999, isCharExclusive: true },
    harpoonGun:      { name: 'Harpoon Gun',     icon: '🎣', range: 270, damage: 50,  cooldown: 55, desc: 'Pins target 1.5s. Bonus dmg underwater.',             price: 0, maxDurability: 9999, isCharExclusive: true },
    hellfireTrident: { name: 'Hellfire Trident',icon: '🔱', range: 62,  damage: 65,  cooldown: 20, desc: 'Trident. Hits leave burning ground.',                 price: 0, maxDurability: 9999, isCharExclusive: true },
    cutlass:         { name: 'Cutlass',          icon: '⚔', range: 48,  damage: 75,  cooldown: 26, desc: 'Heavy swing. Strong knockback.',                      price: 0, maxDurability: 9999, isCharExclusive: true },
    enchantedBroom:  { name: 'Enchanted Broom', icon: '🧹', range: 72,  damage: 38,  cooldown: 18, desc: 'Wide arc 360 sweep.',                                 price: 0, maxDurability: 9999, isCharExclusive: true },
    oldManCane:      { name: 'Cane',             icon: '🦯', range: 36,  damage: 30,  cooldown: 22, desc: '25% stun. Becomes any weapon in SUPER mode.',        price: 0, maxDurability: 9999, isCharExclusive: true },
    ryanAxe:         { name: 'Ryan',             icon: '🪓', range: 55,  damage: 90,  cooldown: 35, desc: 'Legendary axe. Wide arc.',                           price: 0, maxDurability: 9999, isCharExclusive: true },
    shuriken:        { name: 'Shuriken',         icon: '⭐', range: 220, damage: 38,  cooldown: 12, desc: 'Thrown ranged star.',                                 price: 0, maxDurability: 9999, isCharExclusive: true },
    chemFlask:       { name: 'Chemical Flask',   icon: '🧪', range: 120, damage: 55,  cooldown: 40, desc: 'Thrown — AoE explosion on impact.',                   price: 0, maxDurability: 9999, isCharExclusive: true },
    shoppingBag:     { name: 'Shopping Bag',     icon: '🛍', range: 40,  damage: 45,  cooldown: 16, desc: 'Heavier with more purchases.',                        price: 0, maxDurability: 9999, isCharExclusive: true },
    gameController:  { name: 'Controller',       icon: '🎮', range: 200, damage: 35,  cooldown: 20, desc: 'Stun pulse — freezes enemies 1.5s.',                  price: 0, maxDurability: 9999, isCharExclusive: true },
    goldenSword:     { name: 'Golden Sword',     icon: '⚔', range: 42,  damage: 55,  cooldown: 16, desc: "Extra gold per kill.",                                price: 0, maxDurability: 9999, isCharExclusive: true },
    tamingWhip:      { name: 'Taming Whip',      icon: '🪢', range: 95,  damage: 35,  cooldown: 16, desc: 'Wide arc. Extra taming chance.',                      price: 0, maxDurability: 9999, isCharExclusive: true },
    fangsWeapon:     { name: 'Fang Daggers',     icon: '🗡', range: 30,  damage: 30,  cooldown: 7,  desc: 'Fast dual strikes. Lifesteal on hit.',                price: 0, maxDurability: 9999, isCharExclusive: true },
    // ─── New character-exclusive weapons ───
    pitchfork:       { name: 'Pitchfork',        icon: '🌾', range: 55,  damage: 35,  cooldown: 18, desc: 'Wide arc hits multiple enemies. Crits throw it.',      price: 0, maxDurability: 9999, isCharExclusive: true },
    fishingRod:      { name: 'Fishing Rod',      icon: '🎣', range: 200, damage: 20,  cooldown: 40, desc: 'Pulls hit enemy toward you. Right-click: telescope.',  price: 0, maxDurability: 9999, isCharExclusive: true },
    wrench:          { name: 'Wrench',           icon: '🔧', range: 38,  damage: 60,  cooldown: 22, desc: '2× damage vs bosses. Stand on barricade + G to repair.',price: 0, maxDurability: 9999, isCharExclusive: true },
    megaphone:       { name: 'Megaphone',        icon: '📢', range: 200, damage: 15,  cooldown: 180,desc: 'Expanding rings: knockback + stun + silence + ally buff.',price: 0, maxDurability: 9999, isCharExclusive: true },
    plasmaCannon:    { name: 'Plasma Cannon',    icon: '🔫', range: 300, damage: 55,  cooldown: 30, desc: 'Piercing bolt. Bonus damage vs alien explorers.',      price: 0, maxDurability: 9999, isCharExclusive: true },
    stick:           { name: 'Stick',            icon: '🪵', range: 32,  damage: 18,  cooldown: 6,  desc: 'Very fast. Hold attack to spin 360° hitting all nearby.',price: 0, maxDurability: 9999, isCharExclusive: true },
    club:            { name: 'Club',             icon: '🪨', range: 52,  damage: 110, cooldown: 40, desc: 'Massive damage. Stuns hit enemies for 0.5s.',          price: 0, maxDurability: 9999, isCharExclusive: true },
    balloonSword:    { name: 'Balloon Sword',    icon: '🎈', range: 38,  damage: 12,  cooldown: 10, desc: 'Bounces enemies. Pops near lava/fire for AoE stun.',   price: 0, maxDurability: 200,  isCharExclusive: true },
    selfieStick:     { name: 'Selfie Stick',     icon: '🤳', range: 52,  damage: 28,  cooldown: 14, desc: 'Wide arc melee + knockback. Crits: subscriber gold bonus.', price: 0, maxDurability: 9999, isCharExclusive: true },
    koolKatClaws:    { name: 'Kool Kat Claws',   icon: '🐾', range: 35,  damage: 18,  cooldown: 5,  desc: 'Cycles: Claws → Meow (pulse) → Coolness Effect (ally AoE).', price: 0, maxDurability: 9999, isCharExclusive: true },
    lasso:           { name: 'Lasso',            icon: '🪢', range: 180, damage: 10,  cooldown: 50, desc: 'Ranged pull + stun. Switch to Revolver with R.',          price: 0, maxDurability: 9999, isCharExclusive: true },
    revolver:        { name: 'Revolver',         icon: '🔫', range: 260, damage: 42,  cooldown: 8,  desc: '6 quick shots then 2s reload. 2× bounty gold.',           price: 0, maxDurability: 9999, isCharExclusive: true },
    mop:             { name: 'Mop',              icon: '🧹', range: 45,  damage: 20,  cooldown: 20, desc: 'Leaves slippery trail. SHIFT: bucket throw. E: vacuum.',   price: 0, maxDurability: 9999, isCharExclusive: true },
    toyMallet:       { name: 'Toy Mallet',       icon: '🔨', range: 42,  damage: 14,  cooldown: 22, desc: 'Big knockback, low damage. Baby has 40% dodge.',          price: 0, maxDurability: 9999, isCharExclusive: true },
    cubeBomb:        { name: 'Rubix Bomb',        icon: '🎲', range: 220, damage: 65,  cooldown: 55, desc: 'Throw a colorful cube bomb. Explodes in wide AoE stun.',  price: 0, maxDurability: 9999, isCharExclusive: true },
    fossilStaff:     { name: 'Fossil Staff',     icon: '🦴', range: 230, damage: 38,  cooldown: 28, desc: 'Fires bone shards. Kills summon fossil dino minions.',     price: 0, maxDurability: 9999, isCharExclusive: true },
};

// ─── ARMOR ───
const ARMOR_CATALOG = {
    helmet: [
        { id: 'iron_helm',   name: 'Iron Helm',   desc: '+20 max HP',       price: 150, statKey: 'maxHp',          statVal: 20,   color: '#607d8b', shape: 'basic'  },
        { id: 'winged_helm', name: 'Winged Helm', desc: '+0.6 move speed',  price: 200, statKey: 'speed',          statVal: 0.6,  color: '#81d4fa', shape: 'winged' },
        { id: 'skull_crown', name: 'Skull Crown', desc: '+12% crit chance', price: 280, statKey: 'skillCritChance',statVal: 0.12, color: '#efebe9', shape: 'skull'  },
    ],
    chest: [
        { id: 'chainmail',    name: 'Chainmail',    desc: '-15% dmg taken',         price: 200, statKey: 'armorDR',    statVal: 0.15, color: '#9e9e9e', shape: 'basic'  },
        { id: 'spiked_plate', name: 'Spiked Plate', desc: 'Return 20 dmg when hit', price: 280, statKey: 'armorSpikes',statVal: 20,   color: '#37474f', shape: 'spiked' },
        { id: 'mage_robe',    name: "Mage's Robe",  desc: '+25% damage dealt',      price: 320, statKey: 'damagePct',  statVal: 0.25, color: '#7e57c2', shape: 'robe'   },
    ],
    leggings: [
        { id: 'iron_greaves',    name: 'Iron Greaves',    desc: '-10% dmg taken',   price: 150, statKey: 'armorDR',    statVal: 0.10, color: '#78909c', shape: 'basic'  },
        { id: 'spiky_tassets',   name: 'Spiky Tassets',   desc: '15 dmg on contact',price: 200, statKey: 'armorSpikes',statVal: 15,   color: '#546e7a', shape: 'spiked' },
        { id: 'shadow_leggings', name: 'Shadow Leggings', desc: '+8% dodge chance', price: 240, statKey: 'dodgeBonus', statVal: 0.08, color: '#212121', shape: 'basic'  },
    ],
    boots: [
        { id: 'iron_boots',    name: 'Iron Boots',    desc: '-10% dmg taken', price: 150, statKey: 'armorDR', statVal: 0.10, color: '#78909c', shape: 'basic'  },
        { id: 'mercury_boots', name: 'Mercury Boots', desc: '+0.8 move speed',price: 220, statKey: 'speed',   statVal: 0.8,  color: '#b0bec5', shape: 'basic'  },
        { id: 'spiked_boots',  name: 'Spiked Boots',  desc: '15 dmg on dash', price: 190, statKey: 'dashDmg', statVal: 15,   color: '#455a64', shape: 'spiked' },
    ],
};

const ARMOR_MAX_DURABILITY = 400;

// ─── FUSION INGREDIENTS ───
const FUSION_INGREDIENTS = {
    spike_orb:      { name: 'Spike Orb',      color: '#a5a5a5', desc: 'Troll drops (4%)'      },
    flame_gem:      { name: 'Flame Gem',       color: '#ff7043', desc: 'Imp drops (3%)'},
    water_gem:      { name: 'Water Gem',       color: '#29b6f6', desc: 'Crocodile drops (2%)'  },
    lightning_shard:{ name: 'Lightning Shard', color: '#ffee58', desc: 'Wizard drops (6%)'     },
    soul_crystal:   { name: 'Soul Crystal',    color: '#ab47bc', desc: 'Demon drops (4%)'    },
    venom_fang:     { name: 'Venom Fang',      color: '#66bb6a', desc: 'Vampire drops (7%)'        },
    bone_fragment:  { name: 'Bone Fragment',   color: '#fff9c4', desc: 'Skeleton drops (10%)'   },
    chain_link:     { name: 'Chain Link',      color: '#bdbdbd', desc: 'Golem drops (3%)'      },
};
const ENEMY_INGREDIENT_DROP = {
    troll:   'spike_orb',
    imp:     'flame_gem',
    wizard:  'lightning_shard',
    demon:   'soul_crystal',
    vampire: 'venom_fang',
    skeleton:'bone_fragment',
    golem:   'chain_link',
};
const ENEMY_INGREDIENT_CHANCE = {
    troll:   0.04,
    imp:     0.03,
    wizard:  0.06,
    demon:   0.04,
    vampire: 0.07,
    skeleton:0.10,
    golem:   0.03,
};

// ─── BESTIARY ───
const BESTIARY_INFO = {
    // Standard world
    slime:       { name:'Slime',         world:'standard', color:'#69f0ae', desc:'Bounces toward you with reckless enthusiasm. Has never had a plan in its life.' },
    skeleton:    { name:'Skeleton',      world:'standard', color:'#e0e0e0', desc:'Rattles bones menacingly. Immune to fear — no flesh to shiver.' },
    wraith:      { name:'Wraith',        world:'standard', color:'#ce93d8', desc:'Phases through walls, blinks around you. Refuses to stay in one spot.' },
    troll:       { name:'Troll',         world:'standard', color:'#a5d6a7', desc:'Large, angry, and surprisingly good at ground-pounding. Do not let it catch you.' },
    imp:         { name:'Imp',           world:'standard', color:'#ff8a65', desc:'Small and fast. Splits into two when low on health. Twice the annoyance.' },
    golem:       { name:'Golem',         world:'standard', color:'#90a4ae', desc:'Built of stone. Hardens under pressure. Charges at full speed when enraged.' },
    vampire:     { name:'Vampire',       world:'standard', color:'#b71c1c', desc:'Drains your blood from a distance. Summons kin. Very dramatic about the whole thing.' },
    spider:      { name:'Spider',        world:'standard', color:'#6d4c41', desc:'Drops webs to slow you. Lays eggs that hatch into spiderlings. You\'re welcome.' },
    wizard:      { name:'Wizard',        world:'standard', color:'#7986cb', desc:'Fired magic bolts. Studied for 40 years to shoot purple orbs at a stranger.' },
    demon:       { name:'Demon',         world:'standard', color:'#c62828', desc:'Erupts in hellfire rings. Enjoys the suffering. Classic demon behavior.' },
    mimic:       { name:'Mimic',         world:'standard', color:'#ffd54f', desc:'Disguised as a chest. You keep falling for it. It respects you for that.' },
    necromancer: { name:'Necromancer',   world:'standard', color:'#7c4dff', desc:'Raises skeletons from the dead. Fires bone rays. Very busy at all times.' },
    grimReaper:  { name:'Grim Reaper',   world:'standard', color:'#4a148c', desc:'Death itself. Scythe fan, soul drain, phase 2 ring burst. Not here to negotiate.' },
    // Alien world
    parasite:    { name:'Parasite',      world:'alien',    color:'#ccff90', desc:'Attaches and drains. Very small, very persistent, very gross.' },
    alienDrone:  { name:'Alien Drone',   world:'alien',    color:'#b2ff59', desc:'Fires plasma bolts. Part of a hive. Not really thinking for itself.' },
    alienSwarmer:{ name:'Alien Swarmer', world:'alien',    color:'#ccff90', desc:'Tiny. Fast. Comes in packs of dozens. Each one is nothing. Together they\'re a problem.' },
    xeno:        { name:'Xeno',          world:'alien',    color:'#69f0ae', desc:'Fast alien skirmisher. Skitters sideways. Has four eyes and no patience.' },
    crystalloid: { name:'Crystalloid',   world:'alien',    color:'#ce93d8', desc:'Living crystal entity. Refracts light into prismatic blasts. Shatters loudly.' },
    hiveMind:    { name:'Hive Mind',     world:'alien',    color:'#76ff03', desc:'Pulses psychic energy in waves. The brains of the operation — literally.' },
    alienBrute:  { name:'Alien Brute',   world:'alien',    color:'#004d40', desc:'Massive armored alien warrior. Slow as a boulder. Hits like a meteor.' },
    alienQueen:  { name:'Alien Queen',   world:'alien',    color:'#00e5ff', desc:'Mother of the swarm. Egg bursts, psychic pull, enrages at half health. Regal.' },
    // Sailor world
    eel:         { name:'Eel',           world:'sailor',   color:'#4dd0e1', desc:'Lurks in the water. Shocks you on contact. Does not care where you are going.' },
    piranha:     { name:'Piranha',       world:'sailor',   color:'#ef5350', desc:'Schools of teeth. Fast, aggressive, and aggressively toothy.' },
    shark:       { name:'Shark',         world:'sailor',   color:'#b0bec5', desc:'Patrol swimmer. Charges on sight. Has been waiting its whole life for this.' },
    octopus:     { name:'Octopus',       world:'sailor',   color:'#7e57c2', desc:'Squirts ink clouds that slow you. Eight arms, zero mercy, infinite ink.' },
    seaCroc:     { name:'Sea Croc',      world:'sailor',   color:'#2e7d32', desc:'A crocodile. But in the sea. Somehow this is worse.' },
    jellyfish:   { name:'Jellyfish',     world:'sailor',   color:'#e040fb', desc:'Drifts peacefully. Stings you on contact. Has no brain and does not need one.' },
    mantaRay:    { name:'Manta Ray',     world:'sailor',   color:'#26c6da', desc:'Glides overhead. Swoops down to ram you. Beautiful, but not friendly.' },
    megalodon:   { name:'Megalodon',     world:'sailor',   color:'#546e7a', desc:'Ancient apex predator. Tail sweep, water rush, full enrage. Very not extinct.' },
    // Dino world
    raptor:      { name:'Raptor',        world:'dino',     color:'#8d6e63', desc:'Pack hunter. Boosts speed near allies. Clever girl.' },
    compy:       { name:'Compsognathus', world:'dino',     color:'#a1887f', desc:'Tiny. Fast. Seems harmless. Is not harmless when there are thirty of them.' },
    pterodactyl: { name:'Pterodactyl',   world:'dino',     color:'#78909c', desc:'Circles overhead then dive-bombs. Screams the entire time.' },
    stegosaurus: { name:'Stegosaurus',   world:'dino',     color:'#689f38', desc:'Plated back absorbs knockback. Swings its spiked tail like it owns the place.' },
    triceratops: { name:'Triceratops',   world:'dino',     color:'#5d4037', desc:'Charges in a straight line and will not stop. Three horns, zero brakes.' },
    ankylosaurus:{ name:'Ankylosaurus',  world:'dino',     color:'#4e342e', desc:'Armored tank. Tail swipe hits wide. Slow but impossibly hard to dent.' },
    spinosaurus: { name:'Spinosaurus',   world:'dino',     color:'#455a64', desc:'Massive sail-backed predator. Slower than its rage suggests. Very, very large.' },
    trexBoss:    { name:'T-Rex King',    world:'dino',     color:'#e65100', desc:'King of the dinosaurs. Ground stomp, roar charge, enrages at 50%. Respect it.' },
};
const BESTIARY_WORLDS = [
    { key:'standard', label:'Standard', color:'#aaa'    },
    { key:'alien',    label:'Alien',    color:'#69f0ae' },
    { key:'sailor',   label:'Sailor',   color:'#4dd0e1' },
    { key:'dino',     label:'Dino',     color:'#8d6e63' },
];

// ─── UPGRADES ───
const ALL_UPGRADES = [
    { id: 'fireSlash', name: 'Fire Slash', icon: '🔥', desc: 'Attacks emit fire trail', tier: 1 },
    { id: 'speedBoost', name: 'Swift Feet', icon: '💨', desc: '+30% movement speed', tier: 1 },
    { id: 'thorns', name: 'Thorns', icon: '🌿', desc: 'Enemies take 10 dmg on touch', tier: 1 },
    { id: 'vampiric', name: 'Vampiric', icon: '🩸', desc: 'Heal 5 HP per kill', tier: 2 },
    { id: 'critStrike', name: 'Critical Strike', icon: '💥', desc: '25% chance double damage', tier: 2 },
    { id: 'goldRush', name: 'Gold Rush', icon: '💰', desc: '2x gold drops', tier: 2 },
    { id: 'shockwave', name: 'Shockwave', icon: '🌊', desc: 'Dash creates damaging wave', tier: 3 },
    { id: 'lightning', name: 'Lightning Strike', icon: '⚡', desc: 'Every 5th attack: lightning AoE', tier: 3 },
    { id: 'frostAura', name: 'Frost Aura', icon: '❄️', desc: 'Slow nearby enemies 40%', tier: 3 },
    { id: 'shadowClone', name: 'Shadow Clone', icon: '👤', desc: 'Ghost mirrors your attacks', tier: 4 },
    { id: 'berserker', name: 'Berserker', icon: '😤', desc: '+50% dmg below 30% HP', tier: 4 },
    { id: 'magnetism', name: 'Magnetism', icon: '🧲', desc: 'Gold attracted from afar', tier: 4 },
    { id: 'phoenix', name: 'Phoenix', icon: '🔶', desc: 'Revive once at 50% HP', tier: 5 },
    { id: 'inferno', name: 'Inferno', icon: '☄️', desc: 'Fire trail as you walk', tier: 5 },
    { id: 'vortex', name: 'Vortex', icon: '🌀', desc: 'Attacks pull enemies in', tier: 5 },
    { id: 'reaper', name: 'Reaper', icon: '💀', desc: '2% instant kill chance', tier: 6 },
    { id: 'fortress', name: 'Fortress', icon: '🏰', desc: 'Take 40% less damage', tier: 6 },
    { id: 'multishot', name: 'Multishot', icon: '🎆', desc: 'Ranged fires 3 projectiles', tier: 6 },
    { id: 'bull', name: 'Bull', icon: '🐂', desc: 'Deal 50% more knockback', tier: 6 },
    { id: 'charismac', name: 'Charismac', icon: '❤️', desc: '2% chance for enemy to start fighting for you for 30 secs', tier: 5 },
    { id: 'big', name: 'Big', icon: '🗿', desc: '2x size, 2x HP, 2x damage, WAY less speed', tier: 6 },
    { id: 'poisonTouch', name: 'Poison Touch', icon: '☠️', desc: 'Attacks poison enemies for 5s', tier: 3 },
    { id: 'spectralOrbs', name: 'Spectral Orbs', icon: '🔮', desc: '2 orbs orbit you, damaging foes', tier: 4 },
    { id: 'mirrorShield', name: 'Mirror Shield', icon: '🛡️', desc: '30% chance to reflect projectiles', tier: 5 },
    { id: 'extraSlot', name: 'Extra Pocket', icon: '🎒', desc: '+1 upgrade slot (can stack up to 3×)', tier: 3 },
];
const MILESTONE_KILLS = [5, 15, 30, 50, 80, 120];


// ─── SKILL TREE ───
const SKILL_TREE = {
    keen_edge:    { name:'Sharp Edge',   icon:'⚔️',  branch:'combat',   req:null,          desc:'+8% all damage' },
    quick_strike: { name:'Quick Strike', icon:'⚡',  branch:'combat',   req:'keen_edge',   desc:'-12% attack cooldown' },
    crit_eye:     { name:'Crit Eye',     icon:'🎯',  branch:'combat',   req:'quick_strike',desc:'+7% crit chance' },
    fury:         { name:'Fury',         icon:'💢',  branch:'combat',   req:'crit_eye',    desc:'+5% dmg per 10 kills this wave (max +40%)' },
    execute:      { name:'Execute',      icon:'💀',  branch:'combat',   req:'fury',        desc:'Enemies below 15% HP take +80% damage' },
    iron_hide:    { name:'Iron Hide',    icon:'🛡️', branch:'survival', req:null,          desc:'+20 max HP' },
    life_tap:     { name:'Life Tap',     icon:'🩸',  branch:'survival', req:'iron_hide',   desc:'3% lifesteal on all damage dealt' },
    dodge:        { name:'Evasion',      icon:'💨',  branch:'survival', req:'life_tap',    desc:'8% chance to dodge incoming hits' },
    grit:         { name:'Grit',         icon:'🧱',  branch:'survival', req:'dodge',       desc:'-15% damage taken when below 35% HP' },
    second_chance:{ name:'Last Stand',   icon:'✨',  branch:'survival', req:'grit',        desc:'Revive once per run with 30 HP' },
    prospector:   { name:'Prospector',   icon:'💰',  branch:'utility',  req:null,          desc:'+20% gold pickup value' },
    hustle:       { name:'Hustle',       icon:'🏃',  branch:'utility',  req:'prospector',  desc:'+0.35 base movement speed' },
    wide_arc:     { name:'Wide Arc',     icon:'↔️',  branch:'utility',  req:'hustle',      desc:'+20px attack range' },
    momentum:     { name:'Momentum',     icon:'🔄',  branch:'utility',  req:'wide_arc',    desc:'+4% speed per sec of movement (max +32%)' },
    pathfinder:   { name:'Pathfinder',   icon:'🗺️', branch:'utility',  req:'momentum',    desc:'Immune to water slowdown; +15% speed on all terrain' },
};

// ─── MID-RUN EVENTS ───
// Each event: { id, name, desc, duration (frames), apply(state,p), remove(state,p) }
// apply() sets state flags; remove() clears them after duration.
const MID_RUN_EVENTS = [
    {
        id: 'goldRush', name: '⚡ GOLD RUSH!', desc: 'Double gold drops for 30 seconds.',
        duration: 1800,
        apply:  (s, p) => { p._eventGoldMult = 2.0; },
        remove: (s, p) => { delete p._eventGoldMult; }
    },
    {
        id: 'eclipse', name: '🌑 ECLIPSE', desc: 'All enemies are stronger — but so are you.',
        duration: 1800,
        apply:  (s, p) => { s._eclipseActive = true; },
        remove: (s, p) => { s._eclipseActive = false; }
    },
    {
        id: 'bloodMoon', name: '🩸 BLOOD MOON', desc: 'All enemies this wave are elite.',
        duration: 900,
        apply:  (s, p) => { s._bloodMoonActive = true; s.enemies.forEach(e => { if (!e.isBoss && !e.elite) { e.elite = true; e.hp = Math.round(e.hp * 1.5); e.maxHp = e.hp; } }); },
        remove: (s, p) => { s._bloodMoonActive = false; }
    },
    {
        id: 'earthquake', name: '🌋 EARTHQUAKE', desc: 'The ground shakes violently!',
        duration: 360,
        apply:  (s, p) => { s._earthquakeActive = true; s.screenShakeMag = 6; s.screenShakeDur = 360; },
        remove: (s, p) => { s._earthquakeActive = false; }
    },
    {
        id: 'meteorShower', name: '☄️ METEOR SHOWER', desc: 'Flaming rocks rain from the sky!',
        duration: 1200,
        apply:  (s, p) => { s._meteorActive = true; s._meteorTimer = 0; },
        remove: (s, p) => { s._meteorActive = false; }
    },
    {
        id: 'wildHunt', name: '🐺 WILD HUNT', desc: 'Enemy spawns doubled this wave.',
        duration: 0, // instant — modifies current wave
        apply:  (s, p) => { const extra = s.waveSpawnQueue.slice(); s.waveSpawnQueue = [...s.waveSpawnQueue, ...extra]; s.waveEnemiesTotal = (s.waveEnemiesTotal || 0) + extra.length; },
        remove: (s, p) => {}
    },
    {
        id: 'healingSpring', name: '💧 HEALING SPRING', desc: 'A spring of healing energy restores your health.',
        duration: 1200,
        apply:  (s, p) => { s._healSpringActive = true; s._healSpringTimer = 0; },
        remove: (s, p) => { s._healSpringActive = false; }
    },
    {
        id: 'frost', name: '❄️ FROSTBIND', desc: 'Enemies are slowed for 20 seconds.',
        duration: 1200,
        apply:  (s, p) => { s._frostActive = true; },
        remove: (s, p) => { s._frostActive = false; }
    },
];

// ─── WEATHER ───
const WEATHER_STAGES = [
    { stage: 0, name: '',              fogAlpha: 0,    speedMult: 1.0,  lightningChance: 0 },
    { stage: 1, name: 'Light Rain',    fogAlpha: 0.08, speedMult: 0.95, lightningChance: 0 },
    { stage: 2, name: 'Heavy Rain',    fogAlpha: 0.22, speedMult: 0.85, lightningChance: 0 },
    { stage: 3, name: 'Storm',         fogAlpha: 0.32, speedMult: 0.75, lightningChance: 0.003 },
];
const WEATHER_EXTREME = [
    { name: 'Blizzard',   fogAlpha: 0.55, speedMult: 0.4,  lightningChance: 0 },
    { name: 'Hailstorm',  fogAlpha: 0.3,  speedMult: 0.65, lightningChance: 0.005, hail: true },
    { name: 'Hurricane',  fogAlpha: 0.45, speedMult: 0.55, lightningChance: 0.007 },
    { name: 'Tornado',    fogAlpha: 0.38, speedMult: 0.6,  lightningChance: 0.004, tornado: true },
];

// ─── DIFFICULTY ───
const DIFFICULTY_SETTINGS = {
    easy:    { enemyHpMult: 1.0,  enemySpeedMult: 1.0,  enemyDmgMult: 1.0,  playerHpMult: 1.05, goldMult: 0.90, spawnMult: 0.85, label: 'EASY' },
    normal:  { enemyHpMult: 1.20, enemySpeedMult: 1.08, enemyDmgMult: 1.20, playerHpMult: 0.95, goldMult: 0.78, spawnMult: 1.0,  label: 'NORMAL' },
    hard:    { enemyHpMult: 1.45, enemySpeedMult: 1.22, enemyDmgMult: 1.60, playerHpMult: 0.75, goldMult: 0.62, spawnMult: 1.2,  label: 'HARD' },
    extreme: { enemyHpMult: 5.0,  enemySpeedMult: 1.6,  enemyDmgMult: 2.0,  playerHpMult: 0.4,  goldMult: 0.4,  spawnMult: 1.5, label: 'EXTREME' }
};

// ─── WIZARD RUNES ───
// Runes replace weapons for the Wizard character. Mana fills over time;
// when full the player can cast a rune by pressing its slot key.
const RUNES = {
    fireball:   { name: 'Fireball',    icon: '🔥', desc: 'AoE explosion, 60 dmg',        maxCharges: 5,  price: 60,  manaCost: 100 },
    frostbolt:  { name: 'Frostbolt',   icon: '❄️', desc: 'Slow all nearby enemies 4s',   maxCharges: 7, price: 50,  manaCost: 100 },
    lightning:  { name: 'Chain Bolt',  icon: '⚡', desc: 'Chain lightning to 4 enemies', maxCharges: 5,  price: 70,  manaCost: 100 },
    shadowstep: { name: 'Shadow Step', icon: '👤', desc: 'Teleport to cursor',            maxCharges: 3,  price: 80,  manaCost: 100 },
    healrune:   { name: 'Heal Rune',   icon: '💚', desc: 'Restore 30 HP',                maxCharges: 3,  price: 55,  manaCost: 100 },
    arcaneorb:  { name: 'Arcane Orb',  icon: '🔮', desc: 'Slow-moving piercing orb',     maxCharges: 7,  price: 65,  manaCost: 100 },
    blizzard:   { name: 'Blizzard',    icon: '🌨️', desc: 'Wide slow AoE for 3s',         maxCharges: 4,  price: 90,  manaCost: 100 },
    voidburst:  { name: 'Void Burst',  icon: '🌀', desc: 'Pulls enemies in, then blasts', maxCharges: 3, price: 100, manaCost: 100 },
};

// Evolution bonuses per level
const EVOLVE_BONUSES = {
    fireSlash: lvl => `Fire dmg +${lvl * 50}%`,
    speedBoost: lvl => `Speed +${lvl * 15}% more`,
    thorns: lvl => `Thorn dmg +${lvl * 10}`,
    vampiric: lvl => `Heal +${lvl * 3} per kill`,
    critStrike: lvl => `Crit chance +${lvl * 10}%`,
    goldRush: lvl => `Gold +${lvl}x more`,
    shockwave: lvl => `Wave radius +${lvl * 20}`,
    lightning: lvl => `Every ${Math.max(2, 5 - lvl)} hits, chains to ${lvl} extra enemies`,
    frostAura: lvl => `Slow +${lvl * 10}% more`,
    shadowClone: lvl => `Clone dmg +${lvl * 25}%`,
    berserker: lvl => `Threshold +${lvl * 10}% HP`,
    magnetism: lvl => `Range +${lvl * 50}`,
    phoenix: lvl => `Revive at ${50 + lvl * 15}% HP`,
    inferno: lvl => `Trail dmg +${lvl * 50}%`,
    vortex: lvl => `Pull strength +${lvl * 30}%`,
    reaper: lvl => `Kill chance +${lvl}%`,
    fortress: lvl => `Reduction +${lvl * 10}%`,
    multishot: lvl => `+${lvl} extra projectiles`,
    bull: lvl => `Knockback +${lvl * 30}% more`,
    charismac: lvl => `Charm chance +${lvl}%`,
    big: lvl => `+${lvl * 60} max HP, +${lvl * 30}% damage`,
    poisonTouch: lvl => `Poison +${lvl * 3} dmg/tick, +${lvl}s duration`,
    spectralOrbs: lvl => `+${lvl} extra orb, +${lvl * 20}% orb damage`,
    mirrorShield: lvl => `Reflect chance +${lvl * 15}%`,
    extraSlot: () => '+1 more upgrade slot',
};

