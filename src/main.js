
import { clonePlayer, getOrCreatePlayer, savePlayer } from "./storage.js";
import { ENEMY_CONFIG, pickEnemyKindForDifficulty } from "./enemyConfig.js";

const RUN_DURATION = 60;
const ARENA_WIDTH = 1600;
const ARENA_HEIGHT = 900;
const MAX_UPGRADE_LEVEL = 50;
const SHIP_MOUNT_RADIUS = 16;

const MAX_VISIBLE_SLOTS = 18;

const SLOT_LAYOUT = [
  { key: 0, name: "Front", x: 50, y: 14 },
  { key: 1, name: "Front-R", x: 62, y: 18, affinity: "infusor" },
  { key: 2, name: "Right-Up", x: 74, y: 30 },
  { key: 3, name: "Right", x: 80, y: 45 },
  { key: 4, name: "Right-Low", x: 76, y: 62 },
  { key: 5, name: "Back-R", x: 66, y: 74 },
  { key: 6, name: "Back", x: 50, y: 80 },
  { key: 7, name: "Back-L", x: 34, y: 74 },
  { key: 8, name: "Left-Low", x: 24, y: 62 },
  { key: 9, name: "Left", x: 20, y: 45 },
  { key: 10, name: "Left-Up", x: 26, y: 30 },
  { key: 11, name: "Front-L", x: 38, y: 18, affinity: "infusor" },
  { key: 12, name: "Nose-R", x: 58, y: 12, affinity: "infusor" },
  { key: 13, name: "Nose-L", x: 42, y: 12, affinity: "infusor" },
  { key: 14, name: "Core", x: 50, y: 50 },
  { key: 15, name: "Void", x: 41, y: 42, affinity: "void" },
  { key: 16, name: "Azure", x: 59, y: 42, affinity: "azure" },
  { key: 17, name: "Amber", x: 50, y: 62, affinity: "amber" },
];

const FRONT_WEAPON_SLOT_KEY = 0;
const INFUSOR_SLOT_KEYS = new Set([1, 11, 12, 13]);
const WEAPON_TYPES = new Set(["cannon", "burst"]);
const INFUSOR_TYPES = new Set(["azure_infusor", "void_infusor", "amber_infusor", "quantum_bound"]);

const SPECIAL_AFFINITY_BY_TYPE = {
  warp: "void",
  helper: "azure",
  rocket: "azure",
  aegis: "azure",
  mine: "amber",
};

const ITEM_CATALOG = {
  cannon: {
    name: "Cannon",
    kind: "weapon",
    trigger: "fire",
    buyBase: 80,
    buyScale: 1.35,
    upgradeBase: 34,
    fireRate: 2.6,
    damage: 12,
    spread: 0,
    projectiles: 1,
    speed: 560,
    color: "#7dd3fc",
    desc: "Directional weapon hardpoint.",
  },
  burst: {
    name: "Burst Cannon",
    kind: "weapon",
    trigger: "fire",
    buyBase: 120,
    buyScale: 1.38,
    upgradeBase: 44,
    fireRate: 3.1,
    damage: 8,
    spread: 0.18,
    projectiles: 3,
    speed: 540,
    color: "#ffd37d",
    desc: "Three-shot directional burst.",
  },
  warp: {
    name: "Warp Module",
    kind: "ability",
    trigger: "void",
    buyBase: 140,
    buyScale: 1.42,
    upgradeBase: 55,
    color: "#58c5ff",
    desc: "Space key directional teleport + burst.",
  },
  mine: {
    name: "Mine Layer",
    kind: "ability",
    trigger: "amber",
    buyBase: 130,
    buyScale: 1.4,
    upgradeBase: 53,
    color: "#ffbf7a",
    desc: "E key deployable mine.",
  },
  rocket: {
    name: "Rocket Pod",
    kind: "ability",
    trigger: "azure",
    buyBase: 175,
    buyScale: 1.46,
    upgradeBase: 62,
    color: "#ffd58a",
    desc: "C key tracking rocket.",
  },
  helper: {
    name: "Summon Bay",
    kind: "ability",
    trigger: "azure",
    buyBase: 190,
    buyScale: 1.48,
    upgradeBase: 64,
    color: "#9ec9ff",
    desc: "C key summons allied combat units that scale with level.",
  },
  aegis: {
    name: "Aegis Matrix",
    kind: "ability",
    trigger: "azure",
    buyBase: 210,
    buyScale: 1.5,
    upgradeBase: 68,
    color: "#8ff2ff",
    desc: "C key absorb shield that releases stored-energy rockets.",
  },
  azure_infusor: {
    name: "Azure Infusor",
    kind: "support",
    buyBase: 145,
    buyScale: 1.36,
    upgradeBase: 48,
    color: "#8ddfff",
    desc: "Adds a chance for Front gun shots to become Azure energy.",
  },
  void_infusor: {
    name: "Void Infusor",
    kind: "support",
    buyBase: 150,
    buyScale: 1.37,
    upgradeBase: 49,
    color: "#c09bff",
    desc: "Adds a chance for Front gun shots to become Void energy.",
  },
  amber_infusor: {
    name: "Amber Infusor",
    kind: "support",
    buyBase: 145,
    buyScale: 1.36,
    upgradeBase: 48,
    color: "#ffd08a",
    desc: "Adds a chance for Front gun shots to become Amber energy.",
  },
  quantum_bound: {
    name: "Quantum Bound",
    kind: "support",
    buyBase: 180,
    buyScale: 1.4,
    upgradeBase: 56,
    color: "#a2c6ff",
    desc: "Adds slight Front gun heat-seeking guidance; stronger with level.",
  },
  plating: {
    name: "Hull Plating",
    kind: "support",
    buyBase: 90,
    buyScale: 1.32,
    upgradeBase: 36,
    color: "#7cf47d",
    desc: "Passive max HP boost.",
  },
  regen: {
    name: "Regen Core",
    kind: "support",
    buyBase: 95,
    buyScale: 1.33,
    upgradeBase: 39,
    color: "#99ffaa",
    desc: "Passive health regen boost.",
  },
  thruster: {
    name: "Thruster Pack",
    kind: "support",
    buyBase: 92,
    buyScale: 1.31,
    upgradeBase: 37,
    color: "#8de9ff",
    desc: "Passive movement speed boost.",
  },
};

const MINE_TREE_LIMITS = {
  size: 10,
  cooldown: 10,
  activeLimit: 8,
  charges: 5,
  stockpile: 6,
  chainUnlock: 1,
  chainRange: 6,
  chainDamage: 6,
  chainRecharge: 4,
  gooUnlock: 1,
  gooFuse: 6,
  gooBlast: 6,
  gooDrive: 5,
};

const WARP_TREE_LIMITS = {
  distance: 10,
  cooldown: 10,
  burstRadius: 10,
  burstDamage: 10,
  comboUnlock: 1,
  comboWindow: 6,
  infusionPower: 5,
  swapPulse: 5,
};

const MINE_TREE_DEFINITION = [
  {
    id: "mine_core",
    title: "Node 1 - Mine Layer Core",
    desc: "Foundational mine upgrades for radius, cooldown, active mine cap, repeat detonations, and stored charges.",
    upgrades: [
      { key: "size", label: "Mine Size", max: MINE_TREE_LIMITS.size, costBase: 42, costStep: 9, costCurve: 0.74 },
      { key: "cooldown", label: "Ability Cooldown", max: MINE_TREE_LIMITS.cooldown, costBase: 46, costStep: 10, costCurve: 0.78 },
      { key: "activeLimit", label: "Max Active Mines", max: MINE_TREE_LIMITS.activeLimit, costBase: 36, costStep: 8, costCurve: 0.7 },
      { key: "charges", label: "Detonation Charges", max: MINE_TREE_LIMITS.charges, costBase: 58, costStep: 12, costCurve: 0.95 },
      { key: "stockpile", label: "Stored Charges", max: MINE_TREE_LIMITS.stockpile, costBase: 52, costStep: 11, costCurve: 0.86 },
    ],
  },
  {
    id: "amber_chain_grid",
    title: "Node 2 - Amber Chain Grid",
    desc: "Path A. Mines form Amber links. Enemies that touch a link take damage and break it until recharge.",
    upgrades: [
      { key: "chainUnlock", label: "Grid Activation", max: MINE_TREE_LIMITS.chainUnlock, costBase: 108, costStep: 0, costCurve: 0 },
      { key: "chainRange", label: "Link Range", max: MINE_TREE_LIMITS.chainRange, costBase: 56, costStep: 11, costCurve: 0.88, requires: "chainUnlock" },
      { key: "chainDamage", label: "Chain Damage", max: MINE_TREE_LIMITS.chainDamage, costBase: 62, costStep: 12, costCurve: 0.92, requires: "chainUnlock" },
      { key: "chainRecharge", label: "Link Recharge Rate", max: MINE_TREE_LIMITS.chainRecharge, costBase: 68, costStep: 13, costCurve: 0.96, requires: "chainUnlock" },
    ],
  },
  {
    id: "amber_sticky_goo",
    title: "Node 3 - Sticky Goo Mines",
    desc: "Path B. Mines attach goo to enemies. Gooed enemies seek allies, then detonate. Cannot combine with Node 2.",
    upgrades: [
      { key: "gooUnlock", label: "Goo Activation", max: MINE_TREE_LIMITS.gooUnlock, costBase: 108, costStep: 0, costCurve: 0 },
      { key: "gooFuse", label: "Fuse Time", max: MINE_TREE_LIMITS.gooFuse, costBase: 58, costStep: 10, costCurve: 0.84, requires: "gooUnlock" },
      { key: "gooBlast", label: "Goo Blast Damage", max: MINE_TREE_LIMITS.gooBlast, costBase: 64, costStep: 11, costCurve: 0.9, requires: "gooUnlock" },
      { key: "gooDrive", label: "Ally Seek Speed", max: MINE_TREE_LIMITS.gooDrive, costBase: 52, costStep: 9, costCurve: 0.78, requires: "gooUnlock" },
    ],
  },
];

const WARP_TREE_DEFINITION = [
  {
    id: "warp_core",
    title: "Node 1 - Warp Core",
    desc: "Core teleport upgrades for distance, cooldown, burst radius, and burst damage.",
    upgrades: [
      { key: "distance", label: "Warp Distance", max: WARP_TREE_LIMITS.distance, costBase: 46, costStep: 10, costCurve: 0.78 },
      { key: "cooldown", label: "Ability Cooldown", max: WARP_TREE_LIMITS.cooldown, costBase: 48, costStep: 10, costCurve: 0.8 },
      { key: "burstRadius", label: "Burst Radius", max: WARP_TREE_LIMITS.burstRadius, costBase: 44, costStep: 9, costCurve: 0.74 },
      { key: "burstDamage", label: "Burst Damage", max: WARP_TREE_LIMITS.burstDamage, costBase: 52, costStep: 11, costCurve: 0.86 },
    ],
  },
  {
    id: "warp_combo",
    title: "Node 2 - Void Combo Relay",
    desc: "On warp-kill, gain a combo window to infuse mines or swap with non-boss enemies.",
    upgrades: [
      { key: "comboUnlock", label: "Combo Activation", max: WARP_TREE_LIMITS.comboUnlock, costBase: 118, costStep: 0, costCurve: 0 },
      { key: "comboWindow", label: "Combo Window", max: WARP_TREE_LIMITS.comboWindow, costBase: 58, costStep: 10, costCurve: 0.82, requires: "comboUnlock" },
      { key: "infusionPower", label: "Infusion Amplifier", max: WARP_TREE_LIMITS.infusionPower, costBase: 64, costStep: 11, costCurve: 0.88, requires: "comboUnlock" },
      { key: "swapPulse", label: "Swap Pulse", max: WARP_TREE_LIMITS.swapPulse, costBase: 60, costStep: 10, costCurve: 0.84, requires: "comboUnlock" },
    ],
  },
];

const DIFFICULTY_META = {
  1: "Calm",
  2: "Alert",
  3: "Skirmish",
  4: "Pressure",
  5: "Brutal",
  6: "Savage",
  7: "Nightmare",
  8: "Overdrive",
  9: "Cataclysm",
  10: "Abyss",
};
const TEST_DIFFICULTY_VALUE = "test";

const DROP_COLORS = {
  essence: "#9cf3a6",
  void: "#ba93ff",
  azure: "#7ecbff",
  amber: "#ffd37d",
};

const SPECIAL_CURRENCY_BY_KILL = {
  warp: "void",
  mine: "amber",
  helper: "azure",
  rocket: "azure",
};

const BOSS_BOTTOM_LEFT_MINION_BY_TYPE = {
  void: "boss_bottom_left_minion_void",
  azure: "boss_bottom_left_minion_azure",
  amber: "boss_bottom_left_minion_amber",
};

const BOSS_BOTTOM_LEFT_SHIELD_TYPES = ["void", "azure", "amber"];
const BOSS_BOTTOM_LEFT_SHIELD_COLORS = {
  void: "186,144,255",
  azure: "120,220,255",
  amber: "255,207,120",
};

const BOSS_BOTTOM_LEFT_SHIELD_LAYOUT = {
  void: { offsetX: -290, offsetY: -65, angle: Math.atan2(-65, -290) },
  azure: { offsetX: 175, offsetY: 221, angle: Math.atan2(221, 175) },
  amber: { offsetX: 136, offsetY: -215, angle: Math.atan2(-215, 136) },
};
const BOSS_BOTTOM_LEFT_SHIELD_SCALE = 0.28;
const BOSS_BOTTOM_LEFT_SHIELD_HIT_RADIUS = 36;
const BOSS_BOTTOM_LEFT_MINION_ORBIT_OFFSET = 132;
const BOSS_BOTTOM_LEFT_MINION_ORBIT_SWAY = 10;

const screens = {
  id: document.getElementById("id-screen"),
  menu: document.getElementById("menu-screen"),
  upgrade: document.getElementById("upgrade-screen"),
  game: document.getElementById("game-screen"),
  result: document.getElementById("result-screen"),
};

const ui = {
  idInput: document.getElementById("player-id-input"),
  idMsg: document.getElementById("id-message"),
  idContinue: document.getElementById("id-continue-btn"),
  menuTitle: document.getElementById("menu-title"),
  statXp: document.getElementById("stat-xp"),
  statVoid: document.getElementById("stat-void"),
  statAzure: document.getElementById("stat-azure"),
  statAmber: document.getElementById("stat-amber"),
  statBest: document.getElementById("stat-best"),
  statKills: document.getElementById("stat-kills"),
  statWins: document.getElementById("stat-wins"),
  playBtn: document.getElementById("play-btn"),
  upgradeBtn: document.getElementById("upgrade-btn"),
  switchIdBtn: document.getElementById("switch-id-btn"),
  difficultySelect: document.getElementById("difficulty-select"),
  difficultyNote: document.getElementById("difficulty-note"),
  slotGrid: document.getElementById("ship-slot-grid"),
  upgradeBack: document.getElementById("upgrade-back-btn"),
  upgradeMsg: document.getElementById("upgrade-message"),
  upgradePartLabel: document.getElementById("upgrade-part-label"),
  slotActions: document.getElementById("slot-actions"),
  upgradeXpChip: document.getElementById("upgrade-xp-chip"),
  upgradeXpValue: document.getElementById("upgrade-xp-value"),
  resultTitle: document.getElementById("result-title"),
  resultSummary: document.getElementById("result-summary"),
  resultMenu: document.getElementById("result-menu-btn"),
  resultRetry: document.getElementById("result-retry-btn"),
  timer: document.getElementById("hud-timer"),
  health: document.getElementById("hud-health"),
  healthText: document.getElementById("hud-health-text"),
  healthFill: document.getElementById("hud-health-fill"),
  cdVoid: document.getElementById("hud-cd-void"),
  cdVoidFill: document.getElementById("hud-cd-void-fill"),
  cdVoidText: document.getElementById("hud-cd-void-text"),
  cdAzure: document.getElementById("hud-cd-azure"),
  cdAzureFill: document.getElementById("hud-cd-azure-fill"),
  cdAzureText: document.getElementById("hud-cd-azure-text"),
  cdAmber: document.getElementById("hud-cd-amber"),
  cdAmberFill: document.getElementById("hud-cd-amber-fill"),
  cdAmberText: document.getElementById("hud-cd-amber-text"),
  cdCannon: document.getElementById("hud-cd-cannon"),
  cdCannonFill: document.getElementById("hud-cd-cannon-fill"),
  cdCannonText: document.getElementById("hud-cd-cannon-text"),
  runEssence: document.getElementById("hud-run-essence"),
  runEssenceValue: document.getElementById("hud-run-essence-value"),
  runVoid: document.getElementById("hud-run-void"),
  runVoidValue: document.getElementById("hud-run-void-value"),
  runAzure: document.getElementById("hud-run-azure"),
  runAzureValue: document.getElementById("hud-run-azure-value"),
  runAmber: document.getElementById("hud-run-amber"),
  runAmberValue: document.getElementById("hud-run-amber-value"),
  kills: document.getElementById("hud-kills"),
  wave: document.getElementById("hud-wave"),
  hudDifficulty: document.getElementById("hud-difficulty"),
  testSpawnPanel: document.getElementById("test-spawn-panel"),
  testSpawnList: document.getElementById("test-spawn-list"),
  testDifficultySelect: document.getElementById("test-difficulty-select"),
  testInvincibleToggle: document.getElementById("test-invincible-toggle"),
  testExitBtn: document.getElementById("test-exit-btn"),
};

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const audio = createAudioSystem();
const ENEMY_SKIN_CONFIG = {
  chaser: { src: "./assets/ui/enemies/sheet/cell_r0_c0.png", scale: 2.2, spin: 0.26, pulseRate: 3.0, pulseAmp: 0.055, bobRate: 2.8, bobAmp: 0.55, glowRgb: "255,126,84", glowRate: 7.3 },
  brute: { src: "./assets/ui/enemies/sheet/cell_r0_c4.png", scale: 2.3, spin: -0.14, pulseRate: 2.2, pulseAmp: 0.04, bobRate: 2.0, bobAmp: 0.35, glowRgb: "255,145,92", glowRate: 5.6 },
  dart: { src: "./assets/ui/enemies/sheet/cell_r2_c3.png", scale: 2.65, spin: 0.82, pulseRate: 4.2, pulseAmp: 0.03, bobRate: 4.0, bobAmp: 0.7, glowRgb: "255,170,92", glowRate: 10.2 },
  berserker: { src: "./assets/ui/enemies/sheet/cell_r2_c1.png", scale: 2.3, spin: 0.64, pulseRate: 4.4, pulseAmp: 0.075, bobRate: 3.2, bobAmp: 0.65, glowRgb: "255,102,92", glowRate: 11.2 },
  tank: { src: "./assets/ui/enemies/sheet/cell_r1_c3.png", scale: 2.35, spin: -0.08, pulseRate: 2.0, pulseAmp: 0.03, bobRate: 1.9, bobAmp: 0.28, glowRgb: "124,236,118", glowRate: 4.8 },
  phantom: { src: "./assets/ui/enemies/sheet/cell_r1_c1.png", scale: 2.3, spin: 0.24, pulseRate: 2.7, pulseAmp: 0.09, bobRate: 3.5, bobAmp: 0.85, glowRgb: "210,130,255", glowRate: 8.9, alpha: 0.88 },
  leaper: { src: "./assets/ui/enemies/sheet/cell_r0_c3.png", scale: 2.4, spin: 0.48, pulseRate: 3.6, pulseAmp: 0.05, bobRate: 3.6, bobAmp: 0.85, glowRgb: "255,108,86", glowRate: 9.6 },
  splitter: { src: "./assets/ui/enemies/sheet/cell_r0_c2.png", scale: 2.5, spin: -0.42, pulseRate: 2.9, pulseAmp: 0.06, bobRate: 2.7, bobAmp: 0.78, glowRgb: "255,116,226", glowRate: 8.3 },
  shardling: { src: "./assets/ui/enemies/sheet/cell_r2_c0.png", scale: 2.0, spin: 0.54, pulseRate: 4.1, pulseAmp: 0.08, bobRate: 3.9, bobAmp: 0.76, glowRgb: "255,192,85", glowRate: 10.8 },
  siphon: { src: "./assets/ui/enemies/sheet/cell_r2_c2.png", scale: 2.45, spin: -0.35, pulseRate: 3.3, pulseAmp: 0.065, bobRate: 2.6, bobAmp: 0.7, glowRgb: "201,120,255", glowRate: 7.9 },
  mini_boss: { src: "./assets/ui/enemies/sheet/cell_r1_c0.png", scale: 2.8, spin: 0.2, pulseRate: 2.2, pulseAmp: 0.05, bobRate: 2.1, bobAmp: 0.62, glowRgb: "212,125,255", glowRate: 6.1 },
  mini_boss_miner: { src: "./assets/ui/enemies/sheet/cell_r0_c1.png", scale: 2.85, spin: -0.18, pulseRate: 2.0, pulseAmp: 0.045, bobRate: 2.0, bobAmp: 0.58, glowRgb: "255,176,92", glowRate: 5.9 },
  mega_cannon_boss: { src: "./assets/ui/enemies/sheet/cell_r2_c4.png", scale: 3.0, spin: 0.12, pulseRate: 1.8, pulseAmp: 0.035, bobRate: 1.8, bobAmp: 0.42, glowRgb: "255,176,118", glowRate: 5.2 },
  siphon_overlord: { src: "./assets/ui/enemies/sheet/cell_r3_c2.png", scale: 3.2, spin: 0.06, pulseRate: 1.9, pulseAmp: 0.03, bobRate: 1.7, bobAmp: 0.35, glowRgb: "174,124,255", glowRate: 5.3 },
  boss_bottom_left: { src: "./assets/ui/enemies/bosses/boss_bottom_left.png", scale: 3.7, pulseRate: 1.2, pulseAmp: 0.02, bobRate: 1.5, bobAmp: 0.25, glowRgb: "255,174,110", glowRate: 4.4, aspect: 1.61 },
  boss_bottom_left_minion_void: { src: "./assets/ui/enemies/minions/minion_void.png", scale: 2.45, pulseRate: 2.4, pulseAmp: 0.05, bobRate: 3.1, bobAmp: 0.55, glowRgb: "205,136,255", glowRate: 8.3, aspect: 1.21 },
  boss_bottom_left_minion_azure: { src: "./assets/ui/enemies/minions/minion_azure.png", scale: 2.45, pulseRate: 2.35, pulseAmp: 0.05, bobRate: 3.05, bobAmp: 0.52, glowRgb: "128,212,255", glowRate: 8.0, aspect: 1.12 },
  boss_bottom_left_minion_amber: { src: "./assets/ui/enemies/minions/minion_amber.png", scale: 2.4, pulseRate: 2.3, pulseAmp: 0.05, bobRate: 3.0, bobAmp: 0.5, glowRgb: "255,196,118", glowRate: 7.7, aspect: 1.26 },
};
const ENEMY_SPRITES = Object.fromEntries(
  Object.entries(ENEMY_SKIN_CONFIG).map(([kind, cfg]) => [kind, { ...cfg, img: loadImage(cfg.src) }]),
);
const BOSS_BOTTOM_LEFT_SHIELD_IMAGES = {
  void: loadImage("./assets/ui/enemies/shields/shield_void.png"),
  azure: loadImage("./assets/ui/enemies/shields/shield_azure.png"),
  amber: loadImage("./assets/ui/enemies/shields/shield_amber.png"),
};
const PLAYER_ROCKET_SHEET = loadImage("./assets/ui/pixel-aet/polished/player_rocket.png");
const PLAYER_ROCKET_FRAME_SIZE = 16;

const state = {
  player: null,
  playerAtRunStart: null,
  mode: "id",
  selectedDifficulty: 1,
  testDifficulty: 1,
  testInvincible: false,
  input: { up: false, down: false, left: false, right: false, firing: false, void: false, voidCursor: false, azure: false, amber: false },
  mouse: { x: 0, y: 0 },
  world: null,
  raf: 0,
  lastT: 0,
  selectedSlotKey: 0,
};

boot();

function boot() {
  bindUI();
  bindInput();
  fillDifficultySelect();
  fillTestDifficultySelect();
  updateDifficultyNote();
  resize();
  window.addEventListener("resize", resize);
  loop(performance.now());
  buildTestSpawnButtons();
  updateTestSpawnPanelVisibility();
}

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function bindUI() {
  ui.idContinue.addEventListener("click", submitPlayerId);
  ui.idInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitPlayerId();
    }
  });

  ui.playBtn.addEventListener("click", startRun);
  ui.upgradeBtn.addEventListener("click", openLoadout);
  ui.switchIdBtn.addEventListener("click", () => setScreen("id"));
  ui.upgradeBack.addEventListener("click", openMenu);

          ui.resultMenu.addEventListener("click", openMenu);
  ui.resultRetry.addEventListener("click", startRun);

  ui.difficultySelect.addEventListener("change", () => {
    const selected = ui.difficultySelect.value;
    state.selectedDifficulty = selected === TEST_DIFFICULTY_VALUE ? TEST_DIFFICULTY_VALUE : (Number(selected) || 1);
    updateDifficultyNote();
  });

  if (ui.testDifficultySelect) {
    ui.testDifficultySelect.addEventListener("change", () => {
      const selected = Number(ui.testDifficultySelect.value) || 1;
      setTestModeDifficulty(selected);
    });
  }
  if (ui.testInvincibleToggle) {
    ui.testInvincibleToggle.addEventListener("change", () => {
      setTestModeInvincible(ui.testInvincibleToggle.checked);
    });
  }
  if (ui.testExitBtn) {
    ui.testExitBtn.addEventListener("click", () => {
      if (state.world?.isTestMode && state.mode === "game") exitTestModeRun();
    });
  }
}

function submitPlayerId() {
  const id = ui.idInput.value.trim();
  if (id.length < 2) {
    ui.idMsg.textContent = "Use at least 2 characters.";
    return;
  }

  try {
    ui.idContinue.disabled = true;
    audio.unlock();
    state.player = getOrCreatePlayer(id);
    savePlayer(state.player);
    ui.idMsg.textContent = "";
    openMenu();
  } catch (err) {
    console.error("Failed to continue with player ID.", err);
    ui.idMsg.textContent = "Could not load that player ID. Try again.";
  } finally {
    ui.idContinue.disabled = false;
  }
}

function bindInput() {
  const clearInputState = () => {
    state.input.up = false;
    state.input.down = false;
    state.input.left = false;
    state.input.right = false;
    state.input.firing = false;
    state.input.void = false;
    state.input.voidCursor = false;
    state.input.azure = false;
    state.input.amber = false;
  };

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "escape" && state.mode === "game" && state.world?.isTestMode) {
      e.preventDefault();
      exitTestModeRun();
      return;
    }
    if (k === "w" || k === "arrowup") state.input.up = true;
    if (k === "s" || k === "arrowdown") state.input.down = true;
    if (k === "a" || k === "arrowleft") state.input.left = true;
    if (k === "d" || k === "arrowright") state.input.right = true;
    if (k === " ") state.input.void = true;
    if (k === "c") state.input.azure = true;
    if (k === "e") state.input.amber = true;
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || k === "arrowup") state.input.up = false;
    if (k === "s" || k === "arrowdown") state.input.down = false;
    if (k === "a" || k === "arrowleft") state.input.left = false;
    if (k === "d" || k === "arrowright") state.input.right = false;
  });

  window.addEventListener("blur", clearInputState);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInputState();
  });

  window.addEventListener("wheel", (e) => {
    if (state.mode === "game" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
    }
  }, { passive: false });
  window.addEventListener("contextmenu", (e) => {
    if (state.mode === "game") e.preventDefault();
  });

  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = ((e.clientX - r.left) / Math.max(1, r.width)) * canvas.width;
    state.mouse.y = ((e.clientY - r.top) / Math.max(1, r.height)) * canvas.height;
  });
  canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = ((e.clientX - r.left) / Math.max(1, r.width)) * canvas.width;
    state.mouse.y = ((e.clientY - r.top) / Math.max(1, r.height)) * canvas.height;
    if (e.button !== 0) {
      if (state.mode === "game") {
        if (e.button === 2) {
          const handledCombo = tryHandleWarpComboSelection();
          if (!handledCombo) state.input.voidCursor = true;
        }
        e.preventDefault();
      }
      return;
    }
    audio.unlock();
    state.input.firing = true;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (e.button === 0) state.input.firing = false;
  });
  canvas.addEventListener("pointercancel", () => { state.input.firing = false; });
  canvas.addEventListener("pointerleave", () => { state.input.firing = false; });
}

function isWarpComboEnemyEligible(enemy) {
  if (!enemy || enemy.hp <= 0) return false;
  return !isMiniBossKind(enemy.kind);
}

function getWarpComboMineTarget(w, x, y) {
  let chosen = null;
  let best = 26;
  for (const mine of w.mines) {
    if (!mine || mine.expired || (mine.chargesLeft || 0) <= 0) continue;
    const pickR = Math.max(10, (mine.visualRadius || mine.r * 0.22) + 7);
    const d = Math.hypot(mine.x - x, mine.y - y);
    if (d <= pickR && d < best) {
      best = d;
      chosen = mine;
    }
  }
  return chosen;
}

function getWarpComboEnemyTarget(w, x, y) {
  let chosen = null;
  let best = 28;
  for (const enemy of w.enemies) {
    if (!isWarpComboEnemyEligible(enemy)) continue;
    const pickR = Math.max(12, (enemy.r || 10) + 8);
    const d = Math.hypot(enemy.x - x, enemy.y - y);
    if (d <= pickR && d < best) {
      best = d;
      chosen = enemy;
    }
  }
  return chosen;
}

function infuseMineWithVoid(mine, mult = 2) {
  if (!mine || mine.voidInfused) return false;
  const amplify = Math.max(1, mult || 2);
  mine.voidInfused = true;
  mine.affinity = "void";
  mine.chargeRateMult = Math.max(1, mine.chargeRateMult || 1, amplify);
  mine.r = (mine.r || 50) * amplify;
  mine.dmg = (mine.dmg || 40) * amplify;
  mine.trigger = (mine.trigger || (mine.r || 50) * 0.45) * amplify;
  mine.visualRadius = Math.max(7, (mine.visualRadius || (mine.r || 50) * 0.24) * Math.sqrt(amplify));
  mine.chainRange = (mine.chainRange || 0) * amplify;
  mine.chainDamageMult = (mine.chainDamageMult || 1) * amplify;
  mine.chainWidth = (mine.chainWidth || 0) * Math.sqrt(amplify);
  mine.chainRecharge = Math.max(0.2, (mine.chainRecharge || 2.8) / amplify);
  mine.rearm = Math.max(0.04, (mine.rearm || 0.75) / amplify);
  mine.armed = Math.max(0, (mine.armed || 0) / amplify);
  mine.gooBlastMult = (mine.gooBlastMult || 1) * amplify;
  mine.gooSeekSpeed = (mine.gooSeekSpeed || 0) * amplify;
  if (Number.isFinite(mine.gooFuse) && mine.gooFuse > 0) {
    mine.gooFuse = Math.max(0.35, mine.gooFuse / amplify);
  }
  return true;
}

function tryHandleWarpComboSelection() {
  const w = state.world;
  if (!w || state.mode !== "game") return false;
  const p = w.player;
  if (!p || (p.warpComboT || 0) <= 0) return false;

  const module = pickAbility("void");
  if (!module || module.type !== "warp") return false;
  const stacks = countSlottedByType(module.type);
  const stats = getWarpAbilityStats(module, stacks);
  if (!stats.comboEnabled) return false;

  const mx = state.mouse.x;
  const my = state.mouse.y;

  const mine = getWarpComboMineTarget(w, mx, my);
  if (mine) {
    const infused = infuseMineWithVoid(mine, stats.comboInfusionMult);
    if (infused) {
      p.warpComboT = 0;
      p.warpComboDuration = 0;
      splash(w, mine.x, mine.y, "#b78cff", 10, 1.4);
      audio.play("warp");
      return true;
    }
  }

  const enemy = getWarpComboEnemyTarget(w, mx, my);
  if (!enemy) return false;

  const px = p.x;
  const py = p.y;
  p.x = clamp(enemy.x, 14, canvas.width - 14);
  p.y = clamp(enemy.y, 14, canvas.height - 14);
  enemy.x = clamp(px, enemy.r || 10, canvas.width - (enemy.r || 10));
  enemy.y = clamp(py, enemy.r || 10, canvas.height - (enemy.r || 10));
  enemy.hitFlash = Math.max(enemy.hitFlash || 0, 0.2);
  p.warpComboT = 0;
  p.warpComboDuration = 0;

  if ((stats.swapPulseScale || 0) > 0) {
    applyWarpBurstDamage(w, p.x, p.y, stats, {
      radiusMult: 0.55 + stats.swapPulseScale,
      damageMult: 0.28 + stats.swapPulseScale,
      sourceKind: "warp_swap",
    });
    applyWarpBurstDamage(w, enemy.x, enemy.y, stats, {
      radiusMult: 0.55 + stats.swapPulseScale,
      damageMult: 0.22 + stats.swapPulseScale * 0.85,
      sourceKind: "warp_swap",
    });
  }

  splash(w, p.x, p.y, "#b993ff", 12, 1.5);
  splash(w, enemy.x, enemy.y, "#b993ff", 12, 1.5);
  audio.play("warp");
  return true;
}

function fillDifficultySelect() {
  ui.difficultySelect.innerHTML = "";
  for (let d = 1; d <= 10; d += 1) {
    const option = document.createElement("option");
    option.value = String(d);
    option.textContent = `D${d} - ${DIFFICULTY_META[d]}`;
    ui.difficultySelect.appendChild(option);
  }
  const testOption = document.createElement("option");
  testOption.value = TEST_DIFFICULTY_VALUE;
  testOption.textContent = "Test - Manual Spawns";
  ui.difficultySelect.appendChild(testOption);
  ui.difficultySelect.value = String(state.selectedDifficulty);
}

function fillTestDifficultySelect() {
  if (!ui.testDifficultySelect) return;
  ui.testDifficultySelect.innerHTML = "";
  for (let d = 1; d <= 10; d += 1) {
    const option = document.createElement("option");
    option.value = String(d);
    option.textContent = `D${d}`;
    ui.testDifficultySelect.appendChild(option);
  }
  ui.testDifficultySelect.value = String(state.testDifficulty || 1);
}

function isTestDifficulty(difficulty) {
  return difficulty === TEST_DIFFICULTY_VALUE;
}

function getDifficultyTier(difficulty) {
  const n = Number(difficulty);
  if (!Number.isFinite(n)) return 1;
  return clamp(Math.floor(n), 1, 10);
}

function updateDifficultyNote() {
  if (isTestDifficulty(state.selectedDifficulty)) {
    ui.difficultyNote.textContent = `Test: endless run, no auto waves. Use the right panel to spawn enemies and live-scale at D${state.testDifficulty}.`;
    return;
  }

  const d = getDifficultyTier(state.selectedDifficulty);
  const s = difficultyScale(d);
  ui.difficultyNote.textContent = `D${d} ${DIFFICULTY_META[d]}: enemy HP x${s.enemyHp.toFixed(2)}, speed x${s.enemySpeed.toFixed(2)}, rewards x${s.reward.toFixed(2)}.`;
}

function difficultyScale(d) {
  return {
    enemyHp: 1 + (d - 1) * 0.24,
    enemySpeed: 1 + (d - 1) * 0.09,
    enemyDamage: 1 + (d - 1) * 0.16,
    spawnRate: 1 + (d - 1) * 0.16,
    reward: 1 + (d - 1) * 0.3,
  };
}

function formatEnemyName(kind) {
  return String(kind)
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildTestSpawnButtons() {
  if (!ui.testSpawnList) return;
  ui.testSpawnList.innerHTML = "";

  for (const kind of Object.keys(ENEMY_CONFIG)) {
    const row = document.createElement("div");
    row.className = "test-spawn-row";

    const name = document.createElement("div");
    name.className = "test-spawn-name";
    name.textContent = formatEnemyName(kind);
    row.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "test-spawn-actions";
    for (const amount of [1, 10, 100]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "test-spawn-btn";
      btn.textContent = `${amount}x`;
      btn.addEventListener("click", () => spawnEnemyFromTestPanel(kind, amount));
      actions.appendChild(btn);
    }
    row.appendChild(actions);
    ui.testSpawnList.appendChild(row);
  }
}

function setTestModeDifficulty(difficulty) {
  const d = getDifficultyTier(difficulty);
  state.testDifficulty = d;
  if (ui.testDifficultySelect) ui.testDifficultySelect.value = String(d);
  updateDifficultyNote();

  const w = state.world;
  if (!w || !w.isTestMode) return;
  w.difficulty = d;
  w.scale = difficultyScale(d);
  w.difficultyMode = `test-${d}`;
}

function setTestModeInvincible(enabled) {
  const active = !!enabled;
  state.testInvincible = active;
  if (ui.testInvincibleToggle) ui.testInvincibleToggle.checked = active;
  const w = state.world;
  if (w && w.isTestMode) {
    w.testPlayerInvincible = active;
  }
}

function exitTestModeRun() {
  if (!state.world?.isTestMode) return;
  state.world = null;
  state.input.firing = false;
  state.input.void = false;
  state.input.azure = false;
  state.input.amber = false;
  openMenu();
}

function updateTestSpawnPanelVisibility() {
  if (!ui.testSpawnPanel) return;
  const show = state.mode === "game" && !!state.world?.isTestMode;
  ui.testSpawnPanel.classList.toggle("active", show);
  if (show && ui.testDifficultySelect) {
    ui.testDifficultySelect.value = String(state.world?.difficulty || state.testDifficulty || 1);
  }
  if (ui.testInvincibleToggle) {
    const inv = show ? !!state.world?.testPlayerInvincible : !!state.testInvincible;
    ui.testInvincibleToggle.checked = inv;
  }
}

function spawnEnemyFromTestPanel(kind, count = 1) {
  const w = state.world;
  if (!w || !w.isTestMode || state.mode !== "game") return;

  const amount = clamp(Math.floor(Number(count) || 1), 1, 200);
  for (let i = 0; i < amount; i += 1) {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = -24; y = Math.random() * canvas.height; }
    if (edge === 1) { x = canvas.width + 24; y = Math.random() * canvas.height; }
    if (edge === 2) { x = Math.random() * canvas.width; y = -24; }
    if (edge === 3) { x = Math.random() * canvas.width; y = canvas.height + 24; }
    spawnEnemyByKind(w, kind, x, y);
  }
}

function resize() {
  canvas.width = ARENA_WIDTH;
  canvas.height = ARENA_HEIGHT;

  const scale = Math.min(window.innerWidth / ARENA_WIDTH, window.innerHeight / ARENA_HEIGHT);
  const drawW = Math.max(1, Math.floor(ARENA_WIDTH * scale));
  const drawH = Math.max(1, Math.floor(ARENA_HEIGHT * scale));

  canvas.style.width = `${drawW}px`;
  canvas.style.height = `${drawH}px`;
}

function setScreen(name) {
  state.mode = name;
  Object.entries(screens).forEach(([key, el]) => el.classList.toggle("active", key === name));
  if (name === "game") resize();
  updateTestSpawnPanelVisibility();
}

function openMenu() {
  if (!state.player) {
    setScreen("id");
    return;
  }

  ui.menuTitle.textContent = `Player: ${state.player.id}`;
  if (ui.statXp) ui.statXp.textContent = String(state.player.xpBank);
  if (ui.statVoid) ui.statVoid.textContent = String(state.player.voidBank || 0);
  if (ui.statAzure) ui.statAzure.textContent = String(state.player.azureBank || 0);
  if (ui.statAmber) ui.statAmber.textContent = String(state.player.amberBank || 0);
  if (ui.statBest) ui.statBest.textContent = `${Math.floor(state.player.bestTime)}s`;
  if (ui.statKills) ui.statKills.textContent = String(state.player.totalKills);
  if (ui.statWins) ui.statWins.textContent = String(state.player.wins);
  ui.difficultySelect.value = String(state.selectedDifficulty);
  updateDifficultyNote();
  setScreen("menu");
}
function openLoadout() {
  if (!state.player) return;

  const hadMigration = assignUnslottedItemsToOpenSlots();
  if (hadMigration) savePlayer(state.player);
  const clamped = clamp(Math.floor(state.selectedSlotKey || 0), 0, MAX_VISIBLE_SLOTS - 1);
  state.selectedSlotKey = clamped;
  ui.upgradeMsg.textContent = "";
  renderLoadoutPanel();
  setScreen("upgrade");
}

function selectLoadoutPart(slotKey) {
  state.selectedSlotKey = clamp(Math.floor(slotKey), 0, MAX_VISIBLE_SLOTS - 1);
  ui.upgradeMsg.textContent = "";
  renderLoadoutPanel();
}

function getSlotByKey(slotKey) {
  return SLOT_LAYOUT.find((slot) => slot.key === slotKey) || null;
}

function getSlotAffinity(slotKey) {
  const slot = getSlotByKey(slotKey);
  return slot?.affinity || null;
}

function getSlotLabel(slot) {
  if (!slot?.affinity) return slot?.name || "Slot";
  return `${slot.name} Slot`;
}

function isItemAllowedInSlot(type, slotKey) {
  const isWeapon = WEAPON_TYPES.has(type);
  const isInfusor = INFUSOR_TYPES.has(type);
  if (slotKey === FRONT_WEAPON_SLOT_KEY) return isWeapon;
  if (INFUSOR_SLOT_KEYS.has(slotKey)) return isInfusor;
  if (isWeapon || isInfusor) return false;

  const slotAffinity = getSlotAffinity(slotKey);
  const itemAffinity = SPECIAL_AFFINITY_BY_TYPE[type] || null;
  if (slotAffinity) return itemAffinity === slotAffinity;
  if (itemAffinity) return false;
  return true;
}

function getAllowedItemTypesForSlot(slotKey) {
  return Object.keys(ITEM_CATALOG).filter((type) => isItemAllowedInSlot(type, slotKey));
}

function getSlotActionHint(slot) {
  if (slot.key === FRONT_WEAPON_SLOT_KEY) return "Front slot: weapon-only (Cannon or Burst Cannon).";
  if (INFUSOR_SLOT_KEYS.has(slot.key)) return "Infusor slot: only Infusor modules can be installed.";
  if (slot.affinity === "infusor") return "Infusor slot: only Infusor modules can be installed.";
  if (slot.affinity === "void") return "Void slot: only Void abilities can be installed.";
  if (slot.affinity === "azure") return "Azure slot: only Azure abilities can be installed.";
  if (slot.affinity === "amber") return "Amber slot: only Amber abilities can be installed.";
  return "Core/support slots cannot hold weapons, infusors, or Void/Azure/Amber abilities.";
}

function createDefaultMineSkillTree() {
  return {
    size: 0,
    cooldown: 0,
    activeLimit: 0,
    charges: 0,
    stockpile: 0,
    chainUnlock: 0,
    chainRange: 0,
    chainDamage: 0,
    chainRecharge: 0,
    gooUnlock: 0,
    gooFuse: 0,
    gooBlast: 0,
    gooDrive: 0,
  };
}

function normalizeMineBranchChoice(tree) {
  if (!tree || typeof tree !== "object") return;
  const chainScore = (tree.chainUnlock || 0) + (tree.chainRange || 0) + (tree.chainDamage || 0) + (tree.chainRecharge || 0);
  const gooScore = (tree.gooUnlock || 0) + (tree.gooFuse || 0) + (tree.gooBlast || 0) + (tree.gooDrive || 0);
  if (tree.chainUnlock > 0 && tree.gooUnlock > 0) {
    if (gooScore > chainScore) {
      tree.chainUnlock = 0;
      tree.chainRange = 0;
      tree.chainDamage = 0;
      tree.chainRecharge = 0;
    } else {
      tree.gooUnlock = 0;
      tree.gooFuse = 0;
      tree.gooBlast = 0;
      tree.gooDrive = 0;
    }
  }
  if (tree.chainUnlock <= 0) {
    tree.chainRange = 0;
    tree.chainDamage = 0;
    tree.chainRecharge = 0;
  }
  if (tree.gooUnlock <= 0) {
    tree.gooFuse = 0;
    tree.gooBlast = 0;
    tree.gooDrive = 0;
  }
}

function normalizeMineSkillTree(raw, fallbackLevel = 0) {
  const tree = createDefaultMineSkillTree();
  const source = raw && typeof raw === "object" ? raw : null;
  if (source) {
    tree.size = clampInt(source.size, 0, MINE_TREE_LIMITS.size);
    tree.cooldown = clampInt(source.cooldown, 0, MINE_TREE_LIMITS.cooldown);
    const legacyActiveLimit = Number.isFinite(Number(source.activeLimit)) ? source.activeLimit : source.duration;
    tree.activeLimit = clampInt(legacyActiveLimit, 0, MINE_TREE_LIMITS.activeLimit);
    tree.charges = clampInt(source.charges, 0, MINE_TREE_LIMITS.charges);
    tree.stockpile = clampInt(source.stockpile, 0, MINE_TREE_LIMITS.stockpile);
    tree.chainUnlock = clampInt(source.chainUnlock, 0, MINE_TREE_LIMITS.chainUnlock);
    tree.chainRange = clampInt(source.chainRange, 0, MINE_TREE_LIMITS.chainRange);
    tree.chainDamage = clampInt(source.chainDamage, 0, MINE_TREE_LIMITS.chainDamage);
    const legacyRecharge = Number.isFinite(Number(source.chainRecharge)) ? source.chainRecharge : source.chainJumps;
    tree.chainRecharge = clampInt(legacyRecharge, 0, MINE_TREE_LIMITS.chainRecharge);
    tree.gooUnlock = clampInt(source.gooUnlock, 0, MINE_TREE_LIMITS.gooUnlock);
    tree.gooFuse = clampInt(source.gooFuse, 0, MINE_TREE_LIMITS.gooFuse);
    tree.gooBlast = clampInt(source.gooBlast, 0, MINE_TREE_LIMITS.gooBlast);
    tree.gooDrive = clampInt(source.gooDrive, 0, MINE_TREE_LIMITS.gooDrive);
  } else {
    const legacy = clampInt(fallbackLevel, 0, MAX_UPGRADE_LEVEL);
    tree.size = clampInt(Math.floor(legacy * 0.3), 0, MINE_TREE_LIMITS.size);
    tree.cooldown = clampInt(Math.floor(legacy * 0.28), 0, MINE_TREE_LIMITS.cooldown);
    tree.activeLimit = clampInt(Math.floor(legacy * 0.2), 0, MINE_TREE_LIMITS.activeLimit);
    tree.charges = clampInt(Math.floor(legacy * 0.16), 0, MINE_TREE_LIMITS.charges);
    tree.stockpile = clampInt(Math.floor(legacy * 0.14), 0, MINE_TREE_LIMITS.stockpile);
    tree.chainUnlock = legacy >= 8 ? 1 : 0;
    tree.chainRange = tree.chainUnlock ? clampInt(Math.floor((legacy - 8) * 0.18), 0, MINE_TREE_LIMITS.chainRange) : 0;
    tree.chainDamage = tree.chainUnlock ? clampInt(Math.floor((legacy - 10) * 0.16), 0, MINE_TREE_LIMITS.chainDamage) : 0;
    tree.chainRecharge = tree.chainUnlock ? clampInt(Math.floor((legacy - 12) * 0.12), 0, MINE_TREE_LIMITS.chainRecharge) : 0;
    tree.gooUnlock = 0;
    tree.gooFuse = 0;
    tree.gooBlast = 0;
    tree.gooDrive = 0;
  }
  normalizeMineBranchChoice(tree);
  return tree;
}

function getMineTreeTotalLevel(tree) {
  if (!tree) return 0;
  return [
    tree.size,
    tree.cooldown,
    tree.activeLimit,
    tree.charges,
    tree.stockpile,
    tree.chainUnlock,
    tree.chainRange,
    tree.chainDamage,
    tree.chainRecharge,
    tree.gooUnlock,
    tree.gooFuse,
    tree.gooBlast,
    tree.gooDrive,
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_UPGRADE_LEVEL), 0);
}

function syncMineItemLevel(item) {
  if (!item || item.type !== "mine") return;
  const normalized = normalizeMineSkillTree(item.skillTree, item.level || 0);
  if (item.skillTree && typeof item.skillTree === "object") {
    Object.assign(item.skillTree, normalized);
  } else {
    item.skillTree = normalized;
  }
  item.level = clampInt(getMineTreeTotalLevel(item.skillTree), 0, MAX_UPGRADE_LEVEL);
}

function ensureMineSkillTree(item) {
  if (!item || item.type !== "mine") return null;
  syncMineItemLevel(item);
  return item.skillTree;
}

function getMineAbilityStats(module, stacks = 1) {
  const tree = normalizeMineSkillTree(module?.skillTree, module?.level || 0);
  const stackScale = getAbilityStackScale(stacks);
  const radius = 46 + tree.size * 2.8;
  const damage = 44 + tree.size * 3.4 + tree.charges * 2.2;
  const charges = 1 + tree.charges;
  const maxActiveMines = 4 + tree.activeLimit * 2;
  const chargeCapacity = 1 + tree.stockpile;
  const cooldown = Math.max(4.6 - tree.cooldown * 0.17, 0.65) * stackScale;
  const rearm = Math.max(0.36, 0.9 - tree.charges * 0.07);
  const chainEnabled = tree.chainUnlock > 0 && tree.gooUnlock <= 0;
  const gooEnabled = tree.gooUnlock > 0 && tree.chainUnlock <= 0;
  return {
    radius,
    visualRadius: Math.max(9, radius * 0.24),
    triggerRadius: radius * 0.45,
    damage,
    charges,
    maxActiveMines,
    chargeCapacity,
    cooldown,
    rearm,
    chainEnabled,
    chainRange: chainEnabled ? 120 + tree.chainRange * 24 : 0,
    chainDamageMult: chainEnabled ? 1 + tree.chainDamage * 0.11 : 1,
    chainRecharge: chainEnabled ? Math.max(0.65, 2.8 - tree.chainRecharge * 0.28) : 0,
    chainWidth: chainEnabled ? 11 + tree.size * 0.35 : 0,
    gooEnabled,
    gooFuse: gooEnabled ? Math.max(0.8, 4.2 - tree.gooFuse * 0.42) : 0,
    gooBlastMult: gooEnabled ? 1 + tree.gooBlast * 0.14 : 1,
    gooSeekSpeed: gooEnabled ? 96 + tree.gooDrive * 24 : 0,
    tree,
  };
}

function getMineTreeUpgradeDefinition(upgradeKey) {
  for (const node of MINE_TREE_DEFINITION) {
    const found = node.upgrades.find((upgrade) => upgrade.key === upgradeKey);
    if (found) return { node, upgrade: found };
  }
  return null;
}

function calculateMineTreeUpgradeCost(item, upgradeKey) {
  const found = getMineTreeUpgradeDefinition(upgradeKey);
  if (!found) return Number.POSITIVE_INFINITY;
  const { upgrade } = found;
  if (!item || item.type !== "mine") return Number.POSITIVE_INFINITY;
  const tree = normalizeMineSkillTree(item.skillTree, item.level || 0);
  const current = clampInt(tree[upgrade.key], 0, upgrade.max);
  const owned = countOwnedType(item.type);
  return Math.floor((upgrade.costBase + current * upgrade.costStep + current * current * upgrade.costCurve) * (1 + (owned - 1) * 0.2));
}

function createDefaultWarpSkillTree() {
  return {
    distance: 0,
    cooldown: 0,
    burstRadius: 0,
    burstDamage: 0,
    comboUnlock: 0,
    comboWindow: 0,
    infusionPower: 0,
    swapPulse: 0,
  };
}

function normalizeWarpSkillTree(raw, fallbackLevel = 0) {
  const tree = createDefaultWarpSkillTree();
  const source = raw && typeof raw === "object" ? raw : null;
  if (source) {
    tree.distance = clampInt(source.distance, 0, WARP_TREE_LIMITS.distance);
    tree.cooldown = clampInt(source.cooldown, 0, WARP_TREE_LIMITS.cooldown);
    tree.burstRadius = clampInt(source.burstRadius, 0, WARP_TREE_LIMITS.burstRadius);
    tree.burstDamage = clampInt(source.burstDamage, 0, WARP_TREE_LIMITS.burstDamage);
    tree.comboUnlock = clampInt(source.comboUnlock, 0, WARP_TREE_LIMITS.comboUnlock);
    tree.comboWindow = clampInt(source.comboWindow, 0, WARP_TREE_LIMITS.comboWindow);
    tree.infusionPower = clampInt(source.infusionPower, 0, WARP_TREE_LIMITS.infusionPower);
    tree.swapPulse = clampInt(source.swapPulse, 0, WARP_TREE_LIMITS.swapPulse);
  } else {
    const legacy = clampInt(fallbackLevel, 0, MAX_UPGRADE_LEVEL);
    tree.distance = clampInt(Math.floor(legacy * 0.3), 0, WARP_TREE_LIMITS.distance);
    tree.cooldown = clampInt(Math.floor(legacy * 0.27), 0, WARP_TREE_LIMITS.cooldown);
    tree.burstRadius = clampInt(Math.floor(legacy * 0.22), 0, WARP_TREE_LIMITS.burstRadius);
    tree.burstDamage = clampInt(Math.floor(legacy * 0.2), 0, WARP_TREE_LIMITS.burstDamage);
    tree.comboUnlock = legacy >= 12 ? 1 : 0;
    tree.comboWindow = tree.comboUnlock ? clampInt(Math.floor((legacy - 12) * 0.15), 0, WARP_TREE_LIMITS.comboWindow) : 0;
    tree.infusionPower = tree.comboUnlock ? clampInt(Math.floor((legacy - 14) * 0.12), 0, WARP_TREE_LIMITS.infusionPower) : 0;
    tree.swapPulse = tree.comboUnlock ? clampInt(Math.floor((legacy - 16) * 0.1), 0, WARP_TREE_LIMITS.swapPulse) : 0;
  }
  if (tree.comboUnlock <= 0) {
    tree.comboWindow = 0;
    tree.infusionPower = 0;
    tree.swapPulse = 0;
  }
  return tree;
}

function getWarpTreeTotalLevel(tree) {
  if (!tree) return 0;
  return [
    tree.distance,
    tree.cooldown,
    tree.burstRadius,
    tree.burstDamage,
    tree.comboUnlock,
    tree.comboWindow,
    tree.infusionPower,
    tree.swapPulse,
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_UPGRADE_LEVEL), 0);
}

function syncWarpItemLevel(item) {
  if (!item || item.type !== "warp") return;
  const normalized = normalizeWarpSkillTree(item.warpTree, item.level || 0);
  if (item.warpTree && typeof item.warpTree === "object") {
    Object.assign(item.warpTree, normalized);
  } else {
    item.warpTree = normalized;
  }
  item.level = clampInt(getWarpTreeTotalLevel(item.warpTree), 0, MAX_UPGRADE_LEVEL);
}

function ensureWarpSkillTree(item) {
  if (!item || item.type !== "warp") return null;
  syncWarpItemLevel(item);
  return item.warpTree;
}

function getWarpAbilityStats(module, stacks = 1) {
  const tree = normalizeWarpSkillTree(module?.warpTree, module?.level || 0);
  const stackScale = getAbilityStackScale(stacks);
  const distance = 150 + tree.distance * 9;
  const damageRadius = 94 + tree.burstRadius * 6.4;
  const damage = 54 + tree.burstDamage * 5.1;
  const cooldown = Math.max(6 - tree.cooldown * 0.2, 1.1) * stackScale;
  const comboEnabled = tree.comboUnlock > 0;
  return {
    distance,
    damageRadius,
    damage,
    cooldown,
    comboEnabled,
    comboWindow: comboEnabled ? 3 + tree.comboWindow * 0.26 : 0,
    comboInfusionMult: comboEnabled ? 2 + tree.infusionPower * 0.2 : 2,
    swapPulseScale: comboEnabled ? tree.swapPulse * 0.18 : 0,
    tree,
  };
}

function getWarpTreeUpgradeDefinition(upgradeKey) {
  for (const node of WARP_TREE_DEFINITION) {
    const found = node.upgrades.find((upgrade) => upgrade.key === upgradeKey);
    if (found) return { node, upgrade: found };
  }
  return null;
}

function calculateWarpTreeUpgradeCost(item, upgradeKey) {
  const found = getWarpTreeUpgradeDefinition(upgradeKey);
  if (!found) return Number.POSITIVE_INFINITY;
  const { upgrade } = found;
  if (!item || item.type !== "warp") return Number.POSITIVE_INFINITY;
  const tree = normalizeWarpSkillTree(item.warpTree, item.level || 0);
  const current = clampInt(tree[upgrade.key], 0, upgrade.max);
  const owned = countOwnedType(item.type);
  return Math.floor((upgrade.costBase + current * upgrade.costStep + current * current * upgrade.costCurve) * (1 + (owned - 1) * 0.2));
}

function isMineUpgradePathBlocked(tree, upgrade) {
  if (!tree || !upgrade) return false;
  if (upgrade.key === "chainUnlock") return (tree.gooUnlock || 0) > 0;
  if (upgrade.key === "gooUnlock") return (tree.chainUnlock || 0) > 0;
  if (upgrade.requires === "chainUnlock" && (tree.gooUnlock || 0) > 0) return true;
  if (upgrade.requires === "gooUnlock" && (tree.chainUnlock || 0) > 0) return true;
  return false;
}

function createStatListElement(title, lines) {
  const card = document.createElement("div");
  card.className = "slot-stat-card";
  const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const titleHtml = title ? `<h4>${title}</h4>` : "";
  const lineHtml = safeLines.map((line) => `<li>${line}</li>`).join("");
  card.innerHTML = `${titleHtml}<ul>${lineHtml}</ul>`;
  return card;
}

function getItemStatLines(item) {
  if (!item) return [];
  const cfg = ITEM_CATALOG[item.type];
  if (!cfg) return [];

  if (item.type === "mine") {
    const stats = getMineAbilityStats(item, countSlottedByType("mine"));
    const lines = [
      `Damage ${stats.damage.toFixed(1)}`,
      `Cooldown ${stats.cooldown.toFixed(2)}s`,
      `Explosion Radius ${stats.radius.toFixed(1)}`,
      `Max Active Mines ${Math.floor(stats.maxActiveMines)}`,
      `Stored Charges ${Math.floor(stats.chargeCapacity)}`,
      `Detonation Charges ${stats.charges}`,
      `Rearm Time ${stats.rearm.toFixed(2)}s`,
    ];
    if (stats.chainEnabled) {
      lines.push(`Chain Grid Range ${stats.chainRange.toFixed(0)}`);
      lines.push(`Chain Damage x${stats.chainDamageMult.toFixed(2)}`);
      lines.push(`Link Recharge ${stats.chainRecharge.toFixed(2)}s`);
    } else if (stats.gooEnabled) {
      lines.push(`Sticky Goo Fuse ${stats.gooFuse.toFixed(2)}s`);
      lines.push(`Goo Blast x${stats.gooBlastMult.toFixed(2)}`);
      lines.push(`Goo Seek Speed ${stats.gooSeekSpeed.toFixed(0)}`);
    } else {
      lines.push("Special Path Inactive");
    }
    return lines;
  }

  if (cfg.kind === "weapon") {
    const fireRate = cfg.fireRate * (1 + item.level * 0.03);
    const cooldown = 1 / Math.max(0.01, fireRate);
    const damage = cfg.damage * (1 + item.level * 0.08);
    return [
      `Damage ${damage.toFixed(1)} per shot`,
      `Fire Rate ${fireRate.toFixed(2)}/s`,
      `Cooldown ${cooldown.toFixed(2)}s`,
      `Projectiles ${cfg.projectiles || 1}`,
    ];
  }

  if (item.type === "warp") {
    const stats = getWarpAbilityStats(item, countSlottedByType(item.type));
    const lines = [
      `Warp Distance ${stats.distance.toFixed(0)}`,
      `Burst Radius ${stats.damageRadius.toFixed(1)}`,
      `Burst Damage ${stats.damage.toFixed(1)}`,
      `Cooldown ${stats.cooldown.toFixed(2)}s`,
    ];
    if (stats.comboEnabled) {
      lines.push(`Combo Window ${stats.comboWindow.toFixed(2)}s`);
      lines.push(`Mine Infusion x${stats.comboInfusionMult.toFixed(2)}`);
      lines.push(`Swap Pulse +${(stats.swapPulseScale * 100).toFixed(0)}%`);
    } else {
      lines.push("Combo Path Inactive");
    }
    return lines;
  }

  if (item.type === "rocket") {
    const damage = 56 + item.level * 3.2;
    const turn = 3.2 + item.level * 0.07;
    const cooldown = getAbilityCooldownTotal(item, countSlottedByType(item.type));
    return [
      `Rocket Damage ${damage.toFixed(1)}`,
      `Turn Rate ${turn.toFixed(2)}`,
      `Cooldown ${cooldown.toFixed(2)}s`,
    ];
  }

  if (item.type === "helper") {
    const composition = getHelperSummonComposition(item.level);
    const total = composition.reduce((sum, entry) => sum + entry.count, 0);
    const cooldown = getAbilityCooldownTotal(item, countSlottedByType(item.type));
    return [
      `Summoned Units ${total}`,
      `Summon Tier ${getHelperSummonTier(item.level)}`,
      `Cooldown ${cooldown.toFixed(2)}s`,
    ];
  }

  if (item.type === "aegis") {
    const duration = getAegisDuration(item.level);
    const storeCap = getAegisStoreCap(item.level);
    const cooldown = getAegisCooldown(item.level, countSlottedByType(item.type));
    return [
      `Shield Duration ${duration.toFixed(2)}s`,
      `Stored Damage Cap ${storeCap.toFixed(0)}`,
      `Cooldown ${cooldown.toFixed(2)}s`,
    ];
  }

  if (item.type === "quantum_bound") {
    const stats = getQuantumBoundStats([item]);
    if (!stats) return ["No active guidance"];
    return [
      `Seek Turn ${stats.seekTurn.toFixed(3)}`,
      `Seek Range ${stats.seekRange.toFixed(0)}`,
      `Seek Lead ${stats.seekLead.toFixed(3)}`,
    ];
  }

  if (item.type === "plating") return [`Bonus Max HP +${(item.level + 1) * 6}`];
  if (item.type === "regen") return [`Bonus Regen +${((item.level + 1) * 0.05).toFixed(2)}/s`];
  if (item.type === "thruster") return [`Move Speed +${(((item.level + 1) * 0.014) * 100).toFixed(1)}%`];
  if (item.type === "azure_infusor" || item.type === "void_infusor" || item.type === "amber_infusor") {
    return [`Front-shot proc chance ${(getInfusorProcChance(item.level) * 100).toFixed(1)}%`];
  }

  return [`Level ${item.level}`];
}

function createCoreSlotSummaryCard() {
  const slotted = getSlottedItems();
  const platingPower = totalItemLevel(slotted, "plating");
  const regenPower = totalItemLevel(slotted, "regen");
  const thrusterPower = totalItemLevel(slotted, "thruster");
  const maxHp = 100 + platingPower * 6;
  const speed = 242 * (1 + thrusterPower * 0.014);
  const regen = 0.08 + regenPower * 0.05;

  const lines = [
    `Hull ${maxHp.toFixed(0)} HP`,
    `Regen ${regen.toFixed(2)}/s`,
    `Move Speed ${speed.toFixed(1)}`,
  ];

  const voidAbility = pickAbility("void");
  const azureAbility = pickAbility("azure");
  const amberAbility = pickAbility("amber");
  if (voidAbility) lines.push(`Void: ${ITEM_CATALOG[voidAbility.type]?.name || voidAbility.type}`);
  if (azureAbility) lines.push(`Azure: ${ITEM_CATALOG[azureAbility.type]?.name || azureAbility.type}`);
  if (amberAbility) lines.push(`Amber: ${ITEM_CATALOG[amberAbility.type]?.name || amberAbility.type}`);

  return createStatListElement("Player Snapshot", lines);
}

function renderLoadoutPanel() {
  if (!state.player) return;

  const slot = SLOT_LAYOUT[state.selectedSlotKey] || SLOT_LAYOUT[0];
  const occupied = getItemInSlot(slot.key);
  if (occupied?.type === "mine") syncMineItemLevel(occupied);
  if (occupied?.type === "warp") syncWarpItemLevel(occupied);
  ui.upgradePartLabel.textContent = occupied
    ? `Selected Slot: ${getSlotLabel(slot)} (${ITEM_CATALOG[occupied.type]?.name || occupied.type}, Lv ${occupied.level})`
    : `Selected Slot: ${getSlotLabel(slot)} (Empty)`;

  if (ui.upgradeXpValue) ui.upgradeXpValue.textContent = String(state.player.xpBank);
  else if (ui.upgradeXpChip) ui.upgradeXpChip.textContent = `Essence: ${state.player.xpBank}`;

  renderSlotGrid();
  renderSlotActions(slot, occupied);
}

function renderSlotGrid() {
  if (!ui.slotGrid) return;
  ui.slotGrid.innerHTML = "";

  for (const slot of SLOT_LAYOUT) {
    const item = getItemInSlot(slot.key);
    const btn = document.createElement("button");
    btn.className = "slot-node";
    if (state.selectedSlotKey === slot.key) btn.classList.add("active");
    if (item) btn.classList.add("filled");
    if (slot.affinity) btn.classList.add(`slot-${slot.affinity}`);
    btn.style.left = `${slot.x}%`;
    btn.style.top = `${slot.y}%`;
    btn.type = "button";
    btn.textContent = item ? `${slot.name}\n${shortItemLabel(item.type)}` : slot.name;
    btn.addEventListener("click", () => selectLoadoutPart(slot.key));
    ui.slotGrid.appendChild(btn);
  }
}

function renderSlotActions(slot, occupied) {
  if (!ui.slotActions) return;
  ui.slotActions.innerHTML = "";

  const allowedTypes = getAllowedItemTypesForSlot(slot.key);

  if (!occupied) {
    if (slot.key === 14) {
      ui.slotActions.appendChild(createCoreSlotSummaryCard());
      const slotted = getSlottedItems();
      for (const item of slotted) {
        const title = ITEM_CATALOG[item.type]?.name || item.type;
        ui.slotActions.appendChild(createStatListElement(title, getItemStatLines(item)));
      }
    }

    const hint = document.createElement("p");
    hint.className = "slot-actions-empty";
    hint.textContent = `This slot is empty. ${getSlotActionHint(slot)}`;
    ui.slotActions.appendChild(hint);

    if (!allowedTypes.length) return;

    for (const type of allowedTypes) {
      const data = ITEM_CATALOG[type];
      const buyCost = calculateBuyCost(type);
      const row = document.createElement("div");
      row.className = "slot-action-item";
      row.innerHTML = `<div><h3>${data.name}</h3><p>${data.desc}</p></div>`;

      const controls = document.createElement("div");
      controls.className = "slot-action-controls";
      const buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.textContent = `Buy (${buyCost} Essence)`;
      buyBtn.disabled = state.player.xpBank < buyCost;
      buyBtn.addEventListener("click", () => buyItemForSlot(slot.key, type));
      controls.appendChild(buyBtn);

      row.appendChild(controls);
      ui.slotActions.appendChild(row);
    }
    return;
  }

  const data = ITEM_CATALOG[occupied.type];
  if (!data) return;
  if (occupied.type === "mine") ensureMineSkillTree(occupied);
  if (occupied.type === "warp") ensureWarpSkillTree(occupied);

  const row = document.createElement("div");
  row.className = "slot-action-item";
  row.innerHTML = `<div><h3>${data.name} (Lv ${occupied.level}/${MAX_UPGRADE_LEVEL})</h3><p>${data.desc}</p></div>`;

  const controls = document.createElement("div");
  controls.className = "slot-action-controls";

  if (occupied.type !== "mine" && occupied.type !== "warp") {
    const upgradeCost = calculateUpgradeCost(occupied);
    const upgradeBtn = document.createElement("button");
    upgradeBtn.type = "button";
    if (occupied.level >= MAX_UPGRADE_LEVEL) {
      upgradeBtn.textContent = "Maxed";
      upgradeBtn.disabled = true;
    } else {
      upgradeBtn.textContent = `Upgrade (${upgradeCost} Essence)`;
      upgradeBtn.disabled = state.player.xpBank < upgradeCost;
      upgradeBtn.addEventListener("click", () => upgradeItemInSlot(slot.key));
    }
    controls.appendChild(upgradeBtn);
  }

  const refundXp = getItemRefundValue(occupied);
  const sellBtn = document.createElement("button");
  sellBtn.type = "button";
  sellBtn.className = "sell-btn";
  sellBtn.textContent = `Sell (+${refundXp} Essence)`;
  sellBtn.addEventListener("click", () => sellItemInSlot(slot.key));

  controls.appendChild(sellBtn);
  row.appendChild(controls);
  ui.slotActions.appendChild(row);

  ui.slotActions.appendChild(createStatListElement("Current Stats", getItemStatLines(occupied)));

  if (occupied.type === "mine") {
    const tree = ensureMineSkillTree(occupied);
    for (const node of MINE_TREE_DEFINITION) {
      const nodeCard = document.createElement("div");
      nodeCard.className = "slot-skill-node";
      nodeCard.innerHTML = `<h4>${node.title}</h4><p>${node.desc}</p>`;

      for (const upgrade of node.upgrades) {
        const current = clampInt(tree[upgrade.key], 0, upgrade.max);
        const unlocked = !upgrade.requires || (tree[upgrade.requires] || 0) > 0;
        const pathBlocked = isMineUpgradePathBlocked(tree, upgrade);
        const atMax = current >= upgrade.max;
        const cost = atMax ? 0 : calculateMineTreeUpgradeCost(occupied, upgrade.key);
        const isUnlockUpgrade = upgrade.key === "chainUnlock" || upgrade.key === "gooUnlock";

        const upgradeRow = document.createElement("div");
        upgradeRow.className = "slot-skill-upgrade";
        upgradeRow.innerHTML = `<div><strong>${upgrade.label}</strong><p>Lv ${current}/${upgrade.max}</p></div>`;

        const btn = document.createElement("button");
        btn.type = "button";
        if (atMax) {
          btn.textContent = "Maxed";
          btn.disabled = true;
        } else if (pathBlocked) {
          btn.textContent = "Path Locked";
          btn.disabled = true;
        } else if (!unlocked) {
          btn.textContent = "Locked";
          btn.disabled = true;
        } else {
          btn.textContent = current <= 0 && isUnlockUpgrade ? `Unlock (${cost} Essence)` : `Upgrade (${cost} Essence)`;
          btn.disabled = false;
          btn.addEventListener("click", () => upgradeMineSkillTreeNode(slot.key, upgrade.key));
        }

        upgradeRow.appendChild(btn);
        nodeCard.appendChild(upgradeRow);
      }

      ui.slotActions.appendChild(nodeCard);
    }
  }

  if (occupied.type === "warp") {
    const tree = ensureWarpSkillTree(occupied);
    for (const node of WARP_TREE_DEFINITION) {
      const nodeCard = document.createElement("div");
      nodeCard.className = "slot-skill-node";
      nodeCard.innerHTML = `<h4>${node.title}</h4><p>${node.desc}</p>`;

      for (const upgrade of node.upgrades) {
        const current = clampInt(tree[upgrade.key], 0, upgrade.max);
        const unlocked = !upgrade.requires || (tree[upgrade.requires] || 0) > 0;
        const atMax = current >= upgrade.max;
        const cost = atMax ? 0 : calculateWarpTreeUpgradeCost(occupied, upgrade.key);
        const isUnlockUpgrade = upgrade.key === "comboUnlock";

        const upgradeRow = document.createElement("div");
        upgradeRow.className = "slot-skill-upgrade";
        upgradeRow.innerHTML = `<div><strong>${upgrade.label}</strong><p>Lv ${current}/${upgrade.max}</p></div>`;

        const btn = document.createElement("button");
        btn.type = "button";
        if (atMax) {
          btn.textContent = "Maxed";
          btn.disabled = true;
        } else if (!unlocked) {
          btn.textContent = "Locked";
          btn.disabled = true;
        } else {
          btn.textContent = current <= 0 && isUnlockUpgrade ? `Unlock (${cost} Essence)` : `Upgrade (${cost} Essence)`;
          btn.disabled = false;
          btn.addEventListener("click", () => upgradeWarpSkillTreeNode(slot.key, upgrade.key));
        }

        upgradeRow.appendChild(btn);
        nodeCard.appendChild(upgradeRow);
      }

      ui.slotActions.appendChild(nodeCard);
    }
  }
}

function upgradeMineSkillTreeNode(slotKey, upgradeKey) {
  if (!state.player) return;
  const item = getItemInSlot(slotKey);
  if (!item || item.type !== "mine") {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = "Mine upgrade failed: Mine Layer is not installed in this slot.";
    return;
  }

  const found = getMineTreeUpgradeDefinition(upgradeKey);
  if (!found) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = "Mine upgrade failed: unknown upgrade node.";
    return;
  }
  const { upgrade } = found;
  const tree = ensureMineSkillTree(item);
  if (!tree) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = "Mine upgrade failed: unable to initialize mine skill tree.";
    return;
  }

  if (isMineUpgradePathBlocked(tree, upgrade)) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = "This path is locked. Choose either Node 2 or Node 3 for this Mine Layer.";
    return;
  }
  if (upgrade.requires && (tree[upgrade.requires] || 0) <= 0) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = upgrade.requires === "gooUnlock"
      ? "This enhancement is locked. Unlock Sticky Goo Mines first."
      : "This enhancement is locked. Unlock Amber Chain Grid first.";
    return;
  }
  const current = clampInt(tree[upgrade.key], 0, upgrade.max);
  if (current >= upgrade.max) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = `${upgrade.label} is already maxed.`;
    return;
  }

  const cost = calculateMineTreeUpgradeCost(item, upgrade.key);
  if (state.player.xpBank < cost) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = `Need ${cost} Essence for ${upgrade.label}.`;
    return;
  }

  state.player.xpBank -= cost;
  tree[upgrade.key] = current + 1;
  syncMineItemLevel(item);
  item.spentXp = Math.max(0, Math.floor(Number(item.spentXp) || 0)) + cost;
  savePlayer(state.player);
  audio.play("upgrade");
  if (ui.upgradeMsg) ui.upgradeMsg.textContent = `${upgrade.label} upgraded to Lv ${tree[upgrade.key]}/${upgrade.max}.`;
  renderLoadoutPanel();
}

function upgradeWarpSkillTreeNode(slotKey, upgradeKey) {
  if (!state.player) return;
  const item = getItemInSlot(slotKey);
  if (!item || item.type !== "warp") {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = "Warp upgrade failed: Warp Module is not installed in this slot.";
    return;
  }

  const found = getWarpTreeUpgradeDefinition(upgradeKey);
  if (!found) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = "Warp upgrade failed: unknown upgrade node.";
    return;
  }
  const { upgrade } = found;
  const tree = ensureWarpSkillTree(item);
  if (!tree) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = "Warp upgrade failed: unable to initialize warp skill tree.";
    return;
  }

  if (upgrade.requires && (tree[upgrade.requires] || 0) <= 0) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = "This enhancement is locked. Unlock Void Combo Relay first.";
    return;
  }
  const current = clampInt(tree[upgrade.key], 0, upgrade.max);
  if (current >= upgrade.max) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = `${upgrade.label} is already maxed.`;
    return;
  }

  const cost = calculateWarpTreeUpgradeCost(item, upgrade.key);
  if (state.player.xpBank < cost) {
    if (ui.upgradeMsg) ui.upgradeMsg.textContent = `Need ${cost} Essence for ${upgrade.label}.`;
    return;
  }

  state.player.xpBank -= cost;
  tree[upgrade.key] = current + 1;
  syncWarpItemLevel(item);
  item.spentXp = Math.max(0, Math.floor(Number(item.spentXp) || 0)) + cost;
  savePlayer(state.player);
  audio.play("upgrade");
  if (ui.upgradeMsg) ui.upgradeMsg.textContent = `${upgrade.label} upgraded to Lv ${tree[upgrade.key]}/${upgrade.max}.`;
  renderLoadoutPanel();
}

function buyItemForSlot(slotKey, type) {
  if (!state.player) return;
  if (getItemInSlot(slotKey)) return;
  if (!isItemAllowedInSlot(type, slotKey)) return;

  const cost = calculateBuyCost(type);
  if (state.player.xpBank < cost) return;

  state.player.xpBank -= cost;
  const newItem = {
    id: state.player.nextItemId,
    type,
    level: 0,
    slot: slotKey,
    spentXp: cost,
  };
  if (type === "mine") {
    newItem.skillTree = createDefaultMineSkillTree();
    syncMineItemLevel(newItem);
  } else if (type === "warp") {
    newItem.warpTree = createDefaultWarpSkillTree();
    syncWarpItemLevel(newItem);
  }
  state.player.items.push(newItem);
  state.player.nextItemId += 1;
  savePlayer(state.player);
  audio.play("upgrade");
  renderLoadoutPanel();
}

function upgradeItemInSlot(slotKey) {
  if (!state.player) return;
  const item = getItemInSlot(slotKey);
  if (!item || item.level >= MAX_UPGRADE_LEVEL) return;
  if (item.type === "mine" || item.type === "warp") return;

  const cost = calculateUpgradeCost(item);
  if (state.player.xpBank < cost) return;

  state.player.xpBank -= cost;
  item.level += 1;
  item.spentXp = Math.max(0, Math.floor(Number(item.spentXp) || 0)) + cost;
  savePlayer(state.player);
  audio.play("upgrade");
  renderLoadoutPanel();
}

function sellItemInSlot(slotKey) {
  if (!state.player) return;
  const index = state.player.items.findIndex((item) => item.slot === slotKey);
  if (index < 0) return;

  const item = state.player.items[index];
  const refundXp = getItemRefundValue(item);
  state.player.xpBank += refundXp;
  state.player.items.splice(index, 1);
  savePlayer(state.player);
  audio.play("upgrade");
  ui.upgradeMsg.textContent = `Sold ${ITEM_CATALOG[item.type]?.name || "module"} for ${refundXp} Essence refund.`;
  renderLoadoutPanel();
}

function getItemInSlot(slotKey) {
  return state.player.items.find((item) => item.slot === slotKey) || null;
}

function getItemRefundValue(item) {
  return Math.max(0, Math.floor(Number(item.spentXp) || 0));
}

function assignUnslottedItemsToOpenSlots() {
  const occupiedByItem = new Map();
  const pending = [];
  for (const item of state.player.items) {
    if (item.slot === null || item.slot < 0 || item.slot >= MAX_VISIBLE_SLOTS) {
      pending.push(item);
      continue;
    }

    if (!isItemAllowedInSlot(item.type, item.slot)) {
      pending.push(item);
      continue;
    }

    if (occupiedByItem.has(item.slot)) {
      pending.push(item);
      continue;
    }

    occupiedByItem.set(item.slot, item);
  }

  const openSlots = SLOT_LAYOUT
    .map((slot) => slot.key)
    .filter((key) => !occupiedByItem.has(key));

  let changed = false;
  for (const item of pending) {
    const idx = openSlots.findIndex((slotKey) => isItemAllowedInSlot(item.type, slotKey));
    const nextSlot = idx < 0 ? undefined : openSlots.splice(idx, 1)[0];
    if (nextSlot === undefined) {
      if (item.slot !== null) {
        item.slot = null;
        changed = true;
      }
      continue;
    }
    if (item.slot !== nextSlot) {
      item.slot = nextSlot;
      changed = true;
    }
  }
  return changed;
}

function shortItemLabel(type) {
  if (type === "cannon") return "CN";
  if (type === "burst") return "BR";
  if (type === "warp") return "WP";
  if (type === "mine") return "MN";
  if (type === "rocket") return "RK";
  if (type === "helper") return "HP";
  if (type === "aegis") return "AG";
  if (type === "azure_infusor") return "AI";
  if (type === "void_infusor") return "VI";
  if (type === "amber_infusor") return "MI";
  if (type === "quantum_bound") return "QB";
  if (type === "plating") return "PL";
  if (type === "regen") return "RG";
  if (type === "thruster") return "TH";
  return "IT";
}

function countOwnedType(type) {
  return state.player.items.filter((item) => item.type === type).length;
}

function calculateBuyCost(type) {
  const cfg = ITEM_CATALOG[type];
  const owned = countOwnedType(type);
  return Math.floor(cfg.buyBase * Math.pow(cfg.buyScale, owned));
}

function calculateUpgradeCost(item) {
  const cfg = ITEM_CATALOG[item.type];
  const owned = countOwnedType(item.type);
  return Math.floor((cfg.upgradeBase + item.level * 8 + item.level * item.level * 0.65) * (1 + (owned - 1) * 0.2));
}

function startRun() {
  if (!state.player) return;

  const hadMigration = assignUnslottedItemsToOpenSlots();
  if (hadMigration) savePlayer(state.player);

  audio.unlock();
  state.playerAtRunStart = clonePlayer(state.player);
  state.world = makeWorld(state.player, state.selectedDifficulty);
  setScreen("game");
}

function makeWorld(profile, difficulty) {
  const isTestMode = isTestDifficulty(difficulty);
  const difficultyTier = isTestMode ? getDifficultyTier(state.testDifficulty) : getDifficultyTier(difficulty);
  const scale = difficultyScale(difficultyTier);

  const slottedItems = profile.items.filter((item) => item.slot !== null && item.slot >= 0 && item.slot < MAX_VISIBLE_SLOTS);
  const platingPower = totalItemLevel(slottedItems, "plating");
  const regenPower = totalItemLevel(slottedItems, "regen");
  const thrusterPower = totalItemLevel(slottedItems, "thruster");

  const maxHp = 100 + platingPower * 6;
  const speed = 242 * (1 + thrusterPower * 0.014);
  const armor = Math.min(0.5, profile.upgrades.armor * 0.005);
  const regen = 0.08 + regenPower * 0.05;
  const magnet = 120 + profile.upgrades.magnet * 3;

  const world = {
    difficulty: difficultyTier,
    difficultyMode: isTestMode ? TEST_DIFFICULTY_VALUE : String(difficultyTier),
    isTestMode,
    scale,
    t: 0,
    timer: isTestMode ? Number.POSITIVE_INFINITY : RUN_DURATION,
    nextSpawn: 0.8,
    threat: 1,
    kills: 0,
    runEssence: 0,
    runVoid: 0,
    runAzure: 0,
    runAmber: 0,
    particles: [],
    bullets: [],
    enemies: [],
    drops: [],
    mines: [],
    enemyMines: [],
    bossBursts: [],
    rockets: [],
    allies: [],
    nextMineId: 1,
    mineLinkCooldowns: {},
    testPlayerInvincible: isTestMode ? !!state.testInvincible : false,
    helper: null,
    player: {
      x: canvas.width * 0.5,
      y: canvas.height * 0.5,
      vx: 0,
      vy: 0,
      hp: maxHp,
      maxHp,
      speed,
      armor,
      regen,
      magnet,
      fireCdByItem: {},
      voidCd: 0,
      azureCd: 0,
      amberCd: 0,
      amberCharges: 0,
      amberChargeCap: 0,
      warpComboT: 0,
      warpComboDuration: 0,
      hitFlash: 0,
      angle: 0,
      dashIFrames: 0,
      aegisT: 0,
      aegisDuration: 0,
      aegisStoredDamage: 0,
      aegisStoreCap: 0,
      aegisLevel: 0,
      aegisFlash: 0,
    },
  };
  syncAmberMineChargeCapacity(world, true);
  return world;
}

function loop(t) {
  const dt = Math.min(0.033, (t - state.lastT) / 1000 || 0.016);
  state.lastT = t;

  if (state.mode === "game" && state.world) {
    stepGame(dt);
    drawGame();
  }

  state.raf = requestAnimationFrame(loop);
}

function stepGame(dt) {
  const w = state.world;
  const p = w.player;

  w.t += dt;
  w.timer = w.isTestMode ? Number.POSITIVE_INFINITY : Math.max(0, RUN_DURATION - w.t);
  w.threat = 1 + Math.floor(w.t / 22);

  p.voidCd = Math.max(0, p.voidCd - dt);
  p.azureCd = Math.max(0, p.azureCd - dt);
  p.amberCd = Math.max(0, p.amberCd - dt * getVoidMineChargeRateMultiplier(w));
  p.warpComboT = Math.max(0, p.warpComboT - dt);
  if ((p.warpComboT || 0) <= 0) p.warpComboDuration = 0;
  stepAmberMineRecharge(w);
  p.dashIFrames = Math.max(0, p.dashIFrames - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

  for (const key of Object.keys(p.fireCdByItem)) {
    p.fireCdByItem[key] = Math.max(0, p.fireCdByItem[key] - dt);
  }

  const moveX = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
  const moveY = (state.input.down ? 1 : 0) - (state.input.up ? 1 : 0);
  const moveLen = Math.hypot(moveX, moveY) || 1;
  p.vx = (moveX / moveLen) * p.speed;
  p.vy = (moveY / moveLen) * p.speed;

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.angle = Math.atan2(state.mouse.y - p.y, state.mouse.x - p.x);
  clampPlayer(p);

  if (state.input.voidCursor) {
    useVoidAbility(w, "cursor");
    state.input.voidCursor = false;
  }

  if (state.input.void) {
    useVoidAbility(w);
    state.input.void = false;
  }

  if (state.input.azure) {
    useAzureAbility(w);
    state.input.azure = false;
  }

  if (state.input.amber) {
    useAmberAbility(w);
    state.input.amber = false;
  }

  if (state.input.firing) {
    fireSlottedWeapons(w);
  }

  if (!w.isTestMode && w.t >= w.nextSpawn) {
    spawnEnemyWave(w);
    const baseGap = Math.max(0.35, 1.02 - w.threat * 0.022);
    w.nextSpawn += baseGap / w.scale.spawnRate;
  }

  stepBullets(w, dt);
  stepRockets(w, dt);
  stepMines(w, dt);
  stepEnemyMines(w, dt);
  stepBossBursts(w, dt);
  stepHelper(w, dt);
  stepEnemies(w, dt);
  resolveCombat(w);
  stepAegisShield(w, dt);
  collectDrops(w, dt);
  stepParticles(w, dt);

  updateHud(w);

  if (p.hp <= 0) {
    if (w.isTestMode) {
      exitTestModeRun();
      return;
    }
    endRun(false);
    return;
  }

  if (!w.isTestMode && w.timer <= 0) {
    endRun(true);
  }
}

function slotMultiplier(slotKey) {
  return 1;
}

function getSlottedItems() {
  return state.player.items.filter((item) => item.slot !== null && item.slot >= 0 && item.slot < MAX_VISIBLE_SLOTS);
}

function totalItemLevel(items, type) {
  return items.filter((item) => item.type === type).reduce((sum, item) => sum + item.level + 1, 0);
}

function getSlotVector(slotKey) {
  const slot = SLOT_LAYOUT[slotKey] || SLOT_LAYOUT[0];
  return {
    x: (slot.x - 50) / 50,
    y: (slot.y - 50) / 50,
  };
}

function rotateVector(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: x * c - y * s,
    y: x * s + y * c,
  };
}

function getMountTransform(player, slotKey) {
  const front = getSlotVector(0);
  const current = getSlotVector(slotKey);
  const frontAngle = Math.atan2(front.y, front.x);
  const slotAngle = Math.atan2(current.y, current.x);
  const relativeAngle = slotAngle - frontAngle;

  const local = {
    x: current.x * SHIP_MOUNT_RADIUS,
    y: current.y * SHIP_MOUNT_RADIUS,
  };
  const rotated = rotateVector(local.x, local.y, player.angle + Math.PI / 2);
  return {
    x: player.x + rotated.x,
    y: player.y + rotated.y,
    aim: player.angle + relativeAngle,
  };
}

function getFrontInfusorModules() {
  return getSlottedItems().filter((item) => INFUSOR_TYPES.has(item.type) && INFUSOR_SLOT_KEYS.has(item.slot));
}

function getInfusorProcChance(level) {
  return clamp(0.07 + Math.max(0, level || 0) * 0.0075, 0, 0.58);
}

function rollFrontShotAffinity(infusors) {
  const triggered = [];
  for (const item of infusors) {
    const chance = getInfusorProcChance(item.level);
    if (item.type === "azure_infusor" && Math.random() < chance) triggered.push("azure");
    if (item.type === "void_infusor" && Math.random() < chance) triggered.push("void");
    if (item.type === "amber_infusor" && Math.random() < chance) triggered.push("amber");
  }
  if (!triggered.length) return null;
  return triggered[Math.floor(Math.random() * triggered.length)] || null;
}

function getQuantumBoundStats(infusors) {
  const power = infusors
    .filter((item) => item.type === "quantum_bound")
    .reduce((sum, item) => sum + item.level + 1, 0);
  if (power <= 0) return null;
  return {
    seekTurn: 0.2 + power * 0.055,
    seekRange: 150 + power * 8,
    seekLead: 0.025 + power * 0.0016,
  };
}

function fireSlottedWeapons(w) {
  const p = w.player;
  const slotted = getSlottedItems();
  const infusors = getFrontInfusorModules();
  const quantumStats = getQuantumBoundStats(infusors);

  for (const item of slotted) {
    const cfg = ITEM_CATALOG[item.type];
    if (!cfg || cfg.kind !== "weapon") continue;

    const cdKey = String(item.id);
    const currentCd = p.fireCdByItem[cdKey] || 0;
    if (currentCd > 0) continue;

    const fireRate = cfg.fireRate * (1 + item.level * 0.03);
    p.fireCdByItem[cdKey] = 1 / fireRate;

    const mount = getMountTransform(p, item.slot);
    const shotCount = cfg.projectiles || 1;
    const spread = cfg.spread || 0;
    const damage = cfg.damage * (1 + item.level * 0.08);

    for (let i = 0; i < shotCount; i += 1) {
      const t = shotCount === 1 ? 0 : i / (shotCount - 1) - 0.5;
      const a = mount.aim + t * spread;
      const shotMods = item.slot === FRONT_WEAPON_SLOT_KEY
        ? {
            affinity: rollFrontShotAffinity(infusors),
            seekTurn: quantumStats?.seekTurn || 0,
            seekRange: quantumStats?.seekRange || 0,
            seekLead: quantumStats?.seekLead || 0,
          }
        : null;
      fireCannon(w, mount.x, mount.y, a, damage, cfg.speed || 760, shotMods);
    }

    audio.play("shoot");
  }
}

function pickAbility(triggerType) {
  const slotted = getSlottedItems();
  const abilities = slotted.filter((item) => {
    const cfg = ITEM_CATALOG[item.type];
    return cfg && cfg.kind === "ability" && cfg.trigger === triggerType;
  });

  if (!abilities.length) return null;
  abilities.sort((a, b) => b.level - a.level || a.id - b.id);
  return abilities[0];
}

function countSlottedByType(type) {
  return getSlottedItems().filter((item) => item.type === type).length;
}

function getAbilityStackScale(stacks) {
  return 1 - Math.min(0.35, Math.max(0, stacks - 1) * 0.08);
}

function getAegisDuration(level) {
  const lv = clamp(level || 0, 0, MAX_UPGRADE_LEVEL - 1);
  const t = lv / Math.max(1, MAX_UPGRADE_LEVEL - 1);
  return 1.5 + t * 1.5;
}

function getAegisStoreCap(level) {
  return 160 + Math.max(0, level || 0) * 9;
}

function getAegisCooldown(level, stacks) {
  return Math.max(9.8 - (level || 0) * 0.085, 5.2) * getAbilityStackScale(stacks);
}

function getAegisTimeBurnPerDamage(level) {
  const lv = clamp(level || 0, 0, MAX_UPGRADE_LEVEL);
  return Math.max(0.0065, 0.014 - lv * 0.00016);
}

function isPlayerInvulnerable(player) {
  return (player.dashIFrames || 0) > 0 || (player.aegisT || 0) > 0;
}

function applyPlayerDamage(w, damage, opts = {}) {
  const p = w.player;
  const hit = Math.max(0, damage || 0);
  if (hit <= 0) return false;
  if (w?.isTestMode && w.testPlayerInvincible) return false;

  if ((p.aegisT || 0) > 0) {
    p.aegisStoredDamage = Math.min(p.aegisStoreCap || Number.POSITIVE_INFINITY, (p.aegisStoredDamage || 0) + hit);
    const timeBurn = hit * getAegisTimeBurnPerDamage(p.aegisLevel || 0);
    p.aegisT = Math.max(0, (p.aegisT || 0) - timeBurn);
    p.aegisFlash = Math.max(p.aegisFlash || 0, 0.2);
    if (opts.absorbSplash !== false) {
      splash(w, p.x, p.y, "#8fdfff", 4, 0.7);
    }
    if ((p.aegisT || 0) <= 0) {
      collapseAegisShield(w);
    }
    return false;
  }
  if ((p.dashIFrames || 0) > 0) return false;

  p.hp -= hit;
  p.hitFlash = Math.max(p.hitFlash || 0, opts.hitFlash || 0.12);
  if (opts.splashColor) {
    splash(w, p.x, p.y, opts.splashColor, opts.splashCount || 8, opts.splashForce || 1.2);
  }
  if (opts.playSound) audio.play("playerHit");
  return true;
}

function getAegisRocketCount(storedDamage, level) {
  const stored = Math.max(0, storedDamage || 0);
  const lv = Math.max(0, level || 0);
  return clamp(Math.floor(2 + lv * 0.08 + stored / 22), 2, 24);
}

function releaseAegisEnergyRockets(w) {
  const p = w.player;
  const stored = Math.max(0, p.aegisStoredDamage || 0);
  const level = Math.max(0, p.aegisLevel || 0);
  if (stored <= 0.01) {
    splash(w, p.x, p.y, "#8acff8", 8, 1.0);
    return;
  }

  const rocketCount = getAegisRocketCount(stored, level);
  const basePerRocket = 16 + level * 1.15;
  const bonusTotal = stored * (0.85 + level * 0.005);
  const totalDamage = rocketCount * basePerRocket + bonusTotal;
  const rocketDamage = totalDamage / rocketCount;
  const turn = 5.4 + level * 0.04;

  for (let i = 0; i < rocketCount; i += 1) {
    const a = (i / rocketCount) * Math.PI * 2 + Math.random() * 0.18;
    const speed = 250 + Math.random() * 50;
    w.rockets.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 3.6,
      dmg: rocketDamage,
      turn,
      affinity: "azure",
      energy: true,
    });
  }

  splash(w, p.x, p.y, "#9af4ff", 20 + Math.floor(rocketCount * 0.5), 2.3);
  audio.play("rocketLaunch");
}

function collapseAegisShield(w) {
  const p = w.player;
  const wasActive = (p.aegisDuration || 0) > 0 || (p.aegisStoreCap || 0) > 0 || (p.aegisLevel || 0) > 0;
  if (!wasActive) return;

  releaseAegisEnergyRockets(w);
  p.aegisT = 0;
  p.aegisStoredDamage = 0;
  p.aegisDuration = 0;
  p.aegisStoreCap = 0;
  p.aegisLevel = 0;
}

function stepAegisShield(w, dt) {
  const p = w.player;
  p.aegisFlash = Math.max(0, (p.aegisFlash || 0) - dt);
  if ((p.aegisT || 0) <= 0) return;
  p.aegisT = Math.max(0, p.aegisT - dt);
  if (p.aegisT > 0) return;

  collapseAegisShield(w);
}

function getAbilityCooldownTotal(module, stacks) {
  if (!module) return 0;
  const stackScale = getAbilityStackScale(stacks);
  if (module.type === "warp") return getWarpAbilityStats(module, stacks).cooldown;
  if (module.type === "rocket") return Math.max(5.2 - module.level * 0.06, 1.0) * stackScale;
  if (module.type === "helper") return Math.max(8 - module.level * 0.05, 2.0) * stackScale;
  if (module.type === "aegis") return getAegisCooldown(module.level, stacks);
  if (module.type === "mine") return getMineAbilityStats(module, stacks).cooldown;
  return 0;
}

function getAbilityCooldownSnapshot(triggerType, player) {
  const module = pickAbility(triggerType);
  if (!module) return { available: false, remaining: 0, total: 0 };
  const stacks = countSlottedByType(module.type);
  const total = getAbilityCooldownTotal(module, stacks);
  const remaining = triggerType === "void"
    ? player.voidCd
    : triggerType === "azure"
      ? player.azureCd
      : player.amberCd;
  if (triggerType === "amber" && module.type === "mine") {
    const stats = getMineAbilityStats(module, stacks);
    const cap = Math.max(1, Math.floor(player.amberChargeCap || stats.chargeCapacity || 1));
    const charges = clampInt(player.amberCharges ?? cap, 0, cap);
    const rechargeRemaining = charges >= cap ? 0 : Math.max(0, remaining || 0);
    return {
      available: true,
      remaining: rechargeRemaining,
      total: Math.max(0.001, total || 0.001),
      status: charges > 0 ? "ready" : "cooldown",
      fillPct: charges >= cap ? 1 : clamp(1 - rechargeRemaining / Math.max(0.001, total || 0.001), 0, 1),
      text: charges >= cap ? `${charges}/${cap}` : `${charges}/${cap} (${rechargeRemaining.toFixed(1)}s)`,
    };
  }
  return { available: true, remaining: Math.max(0, remaining || 0), total: Math.max(0.001, total || 0.001) };
}

function syncAmberMineChargeCapacity(w, fillToCap = false) {
  const p = w.player;
  const module = pickAbility("amber");
  if (!module) {
    p.amberChargeCap = 0;
    p.amberCharges = 0;
    return null;
  }
  if (module.type !== "mine") {
    p.amberChargeCap = 0;
    p.amberCharges = 0;
    return null;
  }

  const stacks = countSlottedByType(module.type);
  const stats = getMineAbilityStats(module, stacks);
  const cap = Math.max(1, Math.floor(stats.chargeCapacity || 1));
  p.amberChargeCap = cap;
  if (fillToCap || !Number.isFinite(p.amberCharges)) {
    p.amberCharges = cap;
  } else {
    p.amberCharges = clampInt(p.amberCharges, 0, cap);
  }
  if (p.amberCharges >= cap) p.amberCd = 0;
  return { module, stacks, stats, cap };
}

function stepAmberMineRecharge(w) {
  const data = syncAmberMineChargeCapacity(w, false);
  if (!data) return;
  const p = w.player;
  const { stats, cap } = data;

  if (p.amberCharges >= cap) {
    p.amberCd = 0;
    return;
  }

  if (p.amberCd > 0) return;

  p.amberCharges = Math.min(cap, (p.amberCharges || 0) + 1);
  p.amberCd = p.amberCharges < cap ? stats.cooldown : 0;
}

function getCannonCooldownSnapshot(player) {
  const weapons = getSlottedItems().filter((item) => ITEM_CATALOG[item.type]?.kind === "weapon");
  if (!weapons.length) return { available: false, remaining: 0, total: 0 };

  let chosen = null;
  for (const item of weapons) {
    const cfg = ITEM_CATALOG[item.type];
    if (!cfg) continue;
    const total = 1 / Math.max(0.01, cfg.fireRate * (1 + item.level * 0.03));
    const remaining = Math.max(0, player.fireCdByItem[String(item.id)] || 0);
    if (!chosen || remaining < chosen.remaining || (remaining === chosen.remaining && total < chosen.total)) {
      chosen = { available: true, remaining, total: Math.max(0.001, total) };
    }
  }

  return chosen || { available: false, remaining: 0, total: 0 };
}

function setCooldownHud(panelEl, fillEl, textEl, snapshot) {
  if (!panelEl || !fillEl || !textEl) return;
  const status = snapshot?.status || (snapshot?.available ? (snapshot.remaining <= 0.001 ? "ready" : "cooldown") : "unavailable");
  panelEl.classList.remove("ready", "cooldown", "unavailable");
  panelEl.classList.add(status);

  if (!snapshot?.available) {
    fillEl.style.width = "0%";
    textEl.textContent = "N/A";
    return;
  }

  const progress = Number.isFinite(snapshot.fillPct)
    ? clamp(snapshot.fillPct, 0, 1)
    : clamp(1 - snapshot.remaining / Math.max(0.001, snapshot.total), 0, 1);
  fillEl.style.width = `${Math.round(progress * 100)}%`;
  textEl.textContent = snapshot.text || (snapshot.remaining <= 0.001 ? "Ready" : `${snapshot.remaining.toFixed(1)}s`);
}

function getInputDirectionVector() {
  const x = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
  const y = (state.input.down ? 1 : 0) - (state.input.up ? 1 : 0);
  const len = Math.hypot(x, y);
  if (len <= 0.001) return null;
  return { x: x / len, y: y / len };
}

function getPredictiveAimAngle(fromX, fromY, targetX, targetY, targetVx, targetVy, projectileSpeed, opts = {}) {
  const speed = Math.max(1, projectileSpeed || 1);
  const baseDist = Math.hypot(targetX - fromX, targetY - fromY);
  const leadBias = Math.max(0, opts.leadBias ?? 1);
  const maxLead = Math.max(0, opts.maxLead ?? 1.2);
  const leadT = clamp((baseDist / speed) * leadBias, 0, maxLead);
  const tx = targetX + (targetVx || 0) * leadT;
  const ty = targetY + (targetVy || 0) * leadT;
  return Math.atan2(ty - fromY, tx - fromX);
}

function applyWarpBurstDamage(w, x, y, warpStats, opts = {}) {
  const stats = (warpStats && typeof warpStats === "object")
    ? warpStats
    : { damageRadius: 94, damage: 54 };
  const radius = Math.max(12, (stats.damageRadius || 94) * Math.max(0.15, opts.radiusMult || 1));
  const baseDamage = Math.max(1, (stats.damage || 54) * Math.max(0.05, opts.damageMult || 1));
  let kills = 0;

  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    const beforeHp = e.hp;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d > radius) continue;
    markEnemyHit(e);

    const falloff = 1 - d / radius;
    const raw = baseDamage * (0.35 + falloff * 0.65);

    if (applyTypedShieldBlock(w, e, x, y, "void")) {
      e.lastHitKind = opts.sourceKind || "warp";
      continue;
    }

    if (e.kind === "mega_cannon_boss" && e.shieldT > 0) {
      e.hp = Math.min(e.maxHp || e.hp, e.hp + raw * 0.45);
      splash(w, e.x, e.y, "#8effa8", 6, 0.9);
      continue;
    }

    let dealt = raw;
    if (isMiniBossKind(e.kind)) {
      const guard = Math.max(0, Math.min(0.9, e.guard || 0));
      dealt *= (1 - guard);
    }

    e.hp -= dealt;
    registerSiphonOverlordHit(w, e, dealt);
    e.lastHitKind = opts.sourceKind || "warp";
    if (beforeHp > 0 && e.hp <= 0) kills += 1;
  }

  splash(w, x, y, "#8edbff", 22, 2.7);
  return kills;
}

function useVoidAbility(w, mode = "movement") {
  const p = w.player;
  if (p.voidCd > 0) return;

  const module = pickAbility("void");
  if (!module) return;

  const stacks = countSlottedByType(module.type);

  if (module.type === "warp") {
    const stats = getWarpAbilityStats(module, stacks);
    const sourceX = p.x;
    const sourceY = p.y;
    let dir = null;
    let distance = stats.distance;

    if (mode === "cursor") {
      const dx = state.mouse.x - p.x;
      const dy = state.mouse.y - p.y;
      const distToCursor = Math.hypot(dx, dy);
      if (distToCursor <= 0.001) return;
      dir = { x: dx / distToCursor, y: dy / distToCursor };
      distance = Math.min(distance, distToCursor);
    } else {
      dir = getInputDirectionVector();
      if (!dir) return;
    }

    p.x += dir.x * distance;
    p.y += dir.y * distance;
    clampPlayer(p);
    const kills = applyWarpBurstDamage(w, p.x, p.y, stats, { sourceKind: "warp" });
    if (stats.comboEnabled && kills >= 1) {
      p.warpComboT = Math.max(p.warpComboT || 0, stats.comboWindow);
      p.warpComboDuration = stats.comboWindow;
      splash(w, p.x, p.y, "#b88dff", 10, 1.25);
    }
    splash(w, sourceX, sourceY, "#70ccff", 10, 1.45);
    p.dashIFrames = 0.22 + module.level * 0.003;
    p.voidCd = stats.cooldown;
    audio.play("warp");
  }
}

function useAzureAbility(w) {
  const p = w.player;
  if (p.azureCd > 0) return;

  const module = pickAbility("azure");
  if (!module) return;

  const stacks = countSlottedByType(module.type);

  if (module.type === "rocket") {
    const turn = 3.2 + module.level * 0.07;
    const damage = 56 + module.level * 3.2;
    const speed = 280;
    w.rockets.push({ x: p.x, y: p.y, vx: Math.cos(p.angle) * speed, vy: Math.sin(p.angle) * speed, life: 4.2, dmg: damage, turn, affinity: "azure" });
    p.azureCd = Math.max(5.2 - module.level * 0.06, 1.0) * (1 - Math.min(0.35, (stacks - 1) * 0.08));
    audio.play("rocketLaunch");
    return;
  }

  if (module.type === "helper") {
    const summoned = summonHelperAllies(w, module.level);
    if (summoned <= 0) return;
    p.azureCd = Math.max(8 - module.level * 0.05, 2.0) * (1 - Math.min(0.35, (stacks - 1) * 0.08));
    splash(w, p.x, p.y, "#92e9ff", 12 + summoned, 1.5);
    audio.play("helperSpawn");
    return;
  }

  if (module.type === "aegis") {
    const duration = getAegisDuration(module.level);
    p.aegisT = duration;
    p.aegisDuration = duration;
    p.aegisStoredDamage = 0;
    p.aegisStoreCap = getAegisStoreCap(module.level);
    p.aegisLevel = module.level;
    p.aegisFlash = 0.22;
    p.azureCd = getAegisCooldown(module.level, stacks);
    splash(w, p.x, p.y, "#8fe9ff", 12, 1.3);
    audio.play("helperSpawn");
  }
}

function useAmberAbility(w) {
  const p = w.player;

  const module = pickAbility("amber");
  if (!module) return;

  const stacks = countSlottedByType(module.type);

  if (module.type === "mine") {
    const stats = getMineAbilityStats(module, stacks);
    syncAmberMineChargeCapacity(w, false);
    const maxStored = Math.max(1, Math.floor(p.amberChargeCap || stats.chargeCapacity || 1));
    p.amberCharges = clampInt(p.amberCharges ?? maxStored, 0, maxStored);
    if (p.amberCharges <= 0) return;

    for (const mine of w.mines) {
      if (!Number.isFinite(mine.id) || mine.id <= 0) mine.id = w.nextMineId++;
    }

    const activeMines = w.mines
      .filter((mine) => !mine.expired && (mine.chargesLeft || 0) > 0)
      .sort((a, b) => (a.id || 0) - (b.id || 0));
    const maxActive = Math.max(1, Math.floor(stats.maxActiveMines || 1));
    if (activeMines.length >= maxActive) {
      const trimCount = activeMines.length - maxActive + 1;
      const removeIds = new Set(activeMines.slice(0, trimCount).map((mine) => mine.id));
      w.mines = w.mines.filter((mine) => !removeIds.has(mine.id));
    }

    w.mines.push({
      id: w.nextMineId++,
      x: p.x,
      y: p.y,
      r: stats.radius,
      dmg: stats.damage,
      armed: 0.35,
      affinity: "amber",
      chargesLeft: stats.charges,
      maxCharges: stats.charges,
      rearm: stats.rearm,
      trigger: stats.triggerRadius,
      visualRadius: stats.visualRadius,
      pulse: Math.random() * Math.PI * 2,
      chainEnabled: stats.chainEnabled,
      chainRange: stats.chainRange,
      chainDamageMult: stats.chainDamageMult,
      chainRecharge: stats.chainRecharge,
      chainWidth: stats.chainWidth,
      gooEnabled: stats.gooEnabled,
      gooFuse: stats.gooFuse,
      gooBlastMult: stats.gooBlastMult,
      gooSeekSpeed: stats.gooSeekSpeed,
    });
    p.amberCharges = Math.max(0, p.amberCharges - 1);
    p.amberCd = p.amberCharges < maxStored && p.amberCd <= 0.001 ? stats.cooldown : p.amberCd;
    audio.play("minePlace");
    return;
  }

  if (p.amberCd > 0) return;
}

function getAffinityGlowRgb(affinity) {
  if (affinity === "void") return "210,166,255";
  if (affinity === "amber") return "255,212,134";
  if (affinity === "azure") return "154,224,255";
  return "154,224,255";
}

function getAffinityColorHex(affinity) {
  if (affinity === "void") return "#c99eff";
  if (affinity === "amber") return "#ffd08d";
  if (affinity === "azure") return "#8ee8ff";
  return "#7dd3fc";
}

function fireCannon(w, originX, originY, angle, damage, speed, mods = null) {
  const shotSpeed = speed ?? 620;
  const critChance = 0.06;
  const critMult = 1.45;
  const crit = Math.random() < critChance;
  const shotAffinity = mods?.affinity || null;
  w.bullets.push({
    x: originX,
    y: originY,
    vx: Math.cos(angle) * shotSpeed,
    vy: Math.sin(angle) * shotSpeed,
    life: 1.0,
    dmg: crit ? damage * critMult : damage,
    crit,
    affinity: shotAffinity,
    seekTurn: mods?.seekTurn || 0,
    seekRange: mods?.seekRange || 0,
    seekLead: mods?.seekLead || 0,
    pulseSeed: Math.random() * Math.PI * 2,
  });
  const splashColor = shotAffinity ? getAffinityColorHex(shotAffinity) : (crit ? "#ffd9ff" : "#c98bff");
  splash(w, originX + Math.cos(angle) * 8, originY + Math.sin(angle) * 8, splashColor, crit ? 4 : 3, 0.62);
}

function isEnemyEnabledForWorld(w, kind) {
  const cfg = ENEMY_CONFIG[kind];
  if (!cfg) return false;
  if (!cfg.enabled) return false;
  return w.difficulty >= (cfg.startDifficulty || 1);
}

function isMiniBossKind(kind) {
  return kind === "mini_boss" || kind === "mini_boss_miner" || kind === "mega_cannon_boss" || kind === "siphon_overlord" || isBossBottomLeft(kind);
}

function placeEnemyMine(w, x, y, opts = {}) {
  const radius = opts.radius ?? 72;
  const damage = opts.damage ?? 26;
  const armed = opts.armed ?? 0.9;
  const life = opts.life ?? 11.5;
  const trigger = opts.trigger ?? Math.max(30, radius * 0.48);
  w.enemyMines.push({
    x,
    y,
    r: radius,
    dmg: damage,
    armed,
    life,
    trigger,
    pulse: Math.random() * 6.28,
  });
}

function markEnemyHit(e) {
  if (!e) return;
  const fallbackMax = Math.max(1, e.hp || 1);
  if (!Number.isFinite(e.maxHp) || e.maxHp <= 0) e.maxHp = fallbackMax;
  e.showHp = true;
  e.hitFlash = Math.max(e.hitFlash || 0, 0.16);
}

function shortestAngleDelta(fromAngle, toAngle) {
  let delta = toAngle - fromAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function getEnemyTurnRate(kind) {
  if (kind === "dart" || kind === "shardling") return 12.5;
  if (kind === "berserker" || kind === "phantom") return 10.5;
  if (isBossBottomLeftMinion(kind)) return 9.4;
  if (kind === "siphon_overlord") return 4.8;
  if (kind === "mini_boss" || kind === "mini_boss_miner" || kind === "mega_cannon_boss" || isBossBottomLeft(kind)) return 5.8;
  return 8.8;
}

function isSiphonOverlord(kind) {
  return kind === "siphon_overlord";
}

function healEnemy(e, amount) {
  if (!e || amount <= 0 || e.hp <= 0) return;
  e.hp = Math.min(e.maxHp || e.hp, e.hp + amount);
}

function isSiphonWeakSpotHit(e, hitX, hitY) {
  const impact = Math.atan2(hitY - e.y, hitX - e.x);
  const back = (e.facing || 0) + Math.PI;
  return Math.abs(shortestAngleDelta(back, impact)) <= 0.68;
}

function registerSiphonOverlordHit(w, e, dealt) {
  if (!isSiphonOverlord(e.kind)) return;
  if (dealt <= 0) return;
  if (e.stunnedT > 0) return;

  e.staggerNeed = e.staggerNeed || 84;
  e.staggerMeter = (e.staggerMeter || 0) + Math.max(2.4, dealt * 0.2);
  if (e.staggerMeter >= e.staggerNeed) {
    e.staggerMeter = 0;
    e.stunnedT = 3.6;
    e.staggerNeed = Math.min(175, e.staggerNeed + 20);
    e.guard = 0;
    e.weakSpotFlash = Math.max(e.weakSpotFlash || 0, 0.22);
    e.laserChargeT = 0;
    e.laserFired = true;
    splash(w, e.x, e.y, "#9cc8ff", 20, 2.1);
    audio.play("mineBlast");
  }
}

function isBossBottomLeft(kind) {
  return kind === "boss_bottom_left";
}

function isBossBottomLeftMinion(kind) {
  return kind === "boss_bottom_left_minion_void" || kind === "boss_bottom_left_minion_azure" || kind === "boss_bottom_left_minion_amber";
}

function findBossBottomLeftMinion(w, boss, shieldType) {
  const kind = BOSS_BOTTOM_LEFT_MINION_BY_TYPE[shieldType];
  if (!kind) return null;
  for (const enemy of w.enemies) {
    if (enemy.kind === kind && enemy.owner === boss && enemy.hp > 0) return enemy;
  }
  return null;
}

function getBossBottomLeftShieldNode(e, type, worldTime) {
  const layout = BOSS_BOTTOM_LEFT_SHIELD_LAYOUT[type];
  if (!layout) return null;
  const spin = e.shieldSpin || 0;
  const pul = (Math.sin(worldTime * 5.1 + spin * 0.8 + layout.angle) + 1) * 0.5;
  const glow = (e.shieldBreakFlash?.[type] || 0) / 0.32;
  const scale = BOSS_BOTTOM_LEFT_SHIELD_SCALE * (1 + pul * 0.05 + glow * 0.12);
  const offset = rotateVector(layout.offsetX * scale, layout.offsetY * scale, spin);
  const hitRadius = BOSS_BOTTOM_LEFT_SHIELD_HIT_RADIUS * (1 + pul * 0.15 + glow * 0.1);
  return {
    x: e.x + offset.x,
    y: e.y + offset.y,
    scale,
    pulse: pul,
    glow,
    spin,
    hitRadius,
    layout,
  };
}

function getBossBottomLeftShieldAtImpact(e, hitX, hitY, worldTime, radiusPad = 0) {
  if (!isBossBottomLeft(e.kind)) return null;
  const shieldState = e.shieldActive || {};
  let bestType = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const type of BOSS_BOTTOM_LEFT_SHIELD_TYPES) {
    if (!shieldState[type]) continue;
    const node = getBossBottomLeftShieldNode(e, type, worldTime);
    if (!node) continue;
    const dist = Math.hypot(hitX - node.x, hitY - node.y);
    if (dist <= node.hitRadius + radiusPad && dist < bestDist) {
      bestDist = dist;
      bestType = type;
    }
  }
  return bestType;
}

function getPointToSegmentDistanceSq(ax, ay, bx, by, px, py) {
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy;
  if (lenSq <= 0.000001) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = clamp(((px - ax) * vx + (py - ay) * vy) / lenSq, 0, 1);
  const qx = ax + vx * t;
  const qy = ay + vy * t;
  const dx = px - qx;
  const dy = py - qy;
  return dx * dx + dy * dy;
}

function doesSegmentHitCircle(ax, ay, bx, by, cx, cy, radius) {
  const rr = Math.max(0, radius) * Math.max(0, radius);
  return getPointToSegmentDistanceSq(ax, ay, bx, by, cx, cy) <= rr;
}

function getBossBottomLeftShieldOnSegment(e, ax, ay, bx, by, worldTime, radiusPad = 0) {
  if (!isBossBottomLeft(e.kind)) return null;
  let bestType = null;
  let bestNode = null;
  let bestDistSq = Number.POSITIVE_INFINITY;
  for (const type of BOSS_BOTTOM_LEFT_SHIELD_TYPES) {
    if (!e.shieldActive?.[type]) continue;
    const node = getBossBottomLeftShieldNode(e, type, worldTime);
    if (!node) continue;
    const rr = node.hitRadius + radiusPad;
    if (!doesSegmentHitCircle(ax, ay, bx, by, node.x, node.y, rr)) continue;
    const distSq = getPointToSegmentDistanceSq(ax, ay, bx, by, node.x, node.y);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestType = type;
      bestNode = node;
    }
  }
  if (!bestType) return null;
  return { type: bestType, node: bestNode };
}

function hasBossBottomLeftActiveShield(e) {
  if (!isBossBottomLeft(e?.kind)) return false;
  for (const type of BOSS_BOTTOM_LEFT_SHIELD_TYPES) {
    if (e.shieldActive?.[type]) return true;
  }
  return false;
}

function getNearestBossBottomLeftShieldNode(e, worldTime, hitX, hitY) {
  if (!isBossBottomLeft(e.kind)) return null;
  let bestNode = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const type of BOSS_BOTTOM_LEFT_SHIELD_TYPES) {
    if (!e.shieldActive?.[type]) continue;
    const node = getBossBottomLeftShieldNode(e, type, worldTime);
    if (!node) continue;
    const dist = Math.hypot(hitX - node.x, hitY - node.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestNode = node;
    }
  }
  return bestNode;
}

function applyTypedShieldBlock(w, e, hitX, hitY, affinity) {
  if (isBossBottomLeftMinion(e.kind)) {
    if (!e.typedShieldUp) return false;
    if (affinity === e.shieldType) {
      e.typedShieldUp = false;
      e.shieldBreakFlash = 0.3;
      splash(w, e.x, e.y, affinity === "void" ? "#c79aff" : affinity === "azure" ? "#99d9ff" : "#ffd68a", 10, 1.5);
    } else {
      splash(w, e.x, e.y, "#c7d0df", 6, 0.9);
    }
    return true;
  }

  if (!isBossBottomLeft(e.kind)) return false;
  let resolvedHitX = hitX;
  let resolvedHitY = hitY;
  let blockedType = getBossBottomLeftShieldAtImpact(e, resolvedHitX, resolvedHitY, w.t, 10);
  if (!blockedType && hasBossBottomLeftActiveShield(e) && Math.hypot(hitX - e.x, hitY - e.y) <= e.r + 12) {
    const nearestShieldNode = getNearestBossBottomLeftShieldNode(e, w.t, hitX, hitY);
    if (nearestShieldNode) {
      resolvedHitX = nearestShieldNode.x;
      resolvedHitY = nearestShieldNode.y;
      blockedType = getBossBottomLeftShieldAtImpact(e, resolvedHitX, resolvedHitY, w.t, 10);
    }
  }
  if (!blockedType) return false;
  const blockedNode = getBossBottomLeftShieldNode(e, blockedType, w.t)
    || { x: resolvedHitX, y: resolvedHitY };

  if (affinity === blockedType) {
    e.shieldActive[blockedType] = false;
    e.shieldBreakFlash[blockedType] = 0.32;
    const aliveMinion = findBossBottomLeftMinion(w, e, blockedType);
    e.shieldRestoreCd[blockedType] = aliveMinion ? 4.0 : Number.POSITIVE_INFINITY;
    splash(
      w,
      blockedNode.x,
      blockedNode.y,
      blockedType === "void" ? "#bc8fff" : blockedType === "azure" ? "#89d3ff" : "#ffd084",
      11,
      1.4,
    );
  } else {
    splash(w, blockedNode.x, blockedNode.y, "#d9e7ff", 7, 0.9);
  }
  return true;
}

function queueBossBottomLeftBurst(w, boss, x, y, opts = {}) {
  const delay = opts.delay ?? 1.0;
  const radius = opts.radius ?? 34;
  const damage = opts.damage ?? 26;
  const color = opts.color ?? "255,176,114";
  w.bossBursts.push({
    owner: boss,
    x: clamp(x, 30, canvas.width - 30),
    y: clamp(y, 30, canvas.height - 30),
    r: radius,
    t: delay,
    total: Math.max(0.01, delay),
    dmg: damage,
    color,
    fired: false,
    linger: 0.16,
  });
}

function getSummonedAggroTarget(w, fromX, fromY) {
  const fallback = w.player;
  let target = fallback;
  let best = Math.hypot((fallback?.x || 0) - fromX, (fallback?.y || 0) - fromY);
  if (!Array.isArray(w.allies) || w.allies.length === 0) return target;

  for (const ally of w.allies) {
    if (!ally || ally.hp <= 0) continue;
    const d = Math.hypot((ally.x || 0) - fromX, (ally.y || 0) - fromY);
    if (d < best) {
      best = d;
      target = ally;
    }
  }
  return target;
}

function getTargetVelocity(target) {
  const vx = Number.isFinite(target?.vx) ? target.vx : 0;
  const vy = Number.isFinite(target?.vy) ? target.vy : 0;
  return { vx, vy };
}

function spawnBossBottomLeftPattern(w, e, phase, target = null) {
  const focus = target && Number.isFinite(target.x) && Number.isFinite(target.y) ? target : w.player;
  const fx = focus.x;
  const fy = focus.y;
  const fvx = Number.isFinite(focus.vx) ? focus.vx : 0;
  const fvy = Number.isFinite(focus.vy) ? focus.vy : 0;
  const baseDelay = phase === 1 ? 0.92 : phase === 2 ? 0.74 : 0.58;
  const damage = 22 + phase * 4 + w.threat * 0.52;
  const choice = Math.floor(Math.random() * 7);

  if (choice === 0) {
    const count = 9 + phase * 3;
    const ring = 76 + phase * 18;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
      queueBossBottomLeftBurst(w, e, fx + Math.cos(a) * ring, fy + Math.sin(a) * ring, {
        delay: baseDelay + Math.random() * 0.12,
        radius: 24 + phase * 2,
        damage,
        color: "255,190,118",
      });
    }
    if (phase >= 2) {
      const innerCount = 6 + phase * 2;
      const innerRing = ring * 0.58;
      for (let i = 0; i < innerCount; i += 1) {
        const a = (i / innerCount) * Math.PI * 2 + 0.2;
        queueBossBottomLeftBurst(w, e, fx + Math.cos(a) * innerRing, fy + Math.sin(a) * innerRing, {
          delay: baseDelay + 0.22 + Math.random() * 0.08,
          radius: 19 + phase * 1.7,
          damage: damage * 0.9,
          color: "255,156,122",
        });
      }
    }
    return;
  }

  if (choice === 1) {
    const aim = Math.atan2(fy - e.y, fx - e.x);
    const normal = aim + Math.PI * 0.5;
    const laneCount = phase === 1 ? 3 : 5;
    const laneHalf = Math.floor(laneCount * 0.5);
    for (let line = -laneHalf; line <= laneHalf; line += 1) {
      for (let i = 1; i <= 5 + phase; i += 1) {
        const dist = 64 + i * (58 + phase * 5);
        const lateral = line * (22 + phase * 8);
        const px = e.x + Math.cos(aim) * dist + Math.cos(normal) * lateral;
        const py = e.y + Math.sin(aim) * dist + Math.sin(normal) * lateral;
        queueBossBottomLeftBurst(w, e, px, py, {
          delay: baseDelay + i * 0.045 + Math.abs(line) * 0.02,
          radius: 18 + phase * 2.2,
          damage,
          color: "255,160,128",
        });
      }
    }
    return;
  }

  if (choice === 2) {
    const count = 12 + phase * 4;
    const baseA = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i += 1) {
      const t = i / Math.max(1, count - 1);
      const spiralA = baseA + t * Math.PI * (2.6 + phase * 0.58);
      const dist = 36 + t * (248 + phase * 48);
      queueBossBottomLeftBurst(w, e, e.x + Math.cos(spiralA) * dist, e.y + Math.sin(spiralA) * dist, {
        delay: baseDelay + t * 0.2,
        radius: 17 + phase * 1.8,
        damage,
        color: "220,146,255",
      });
      if (phase >= 2) {
        const mirrorA = spiralA + Math.PI;
        queueBossBottomLeftBurst(w, e, e.x + Math.cos(mirrorA) * dist, e.y + Math.sin(mirrorA) * dist, {
          delay: baseDelay + 0.08 + t * 0.2,
          radius: 16 + phase * 1.6,
          damage: damage * 0.82,
          color: "170,130,255",
        });
      }
    }
    return;
  }

  if (choice === 3) {
    const spacing = 58 - phase * 4;
    for (let ix = -3; ix <= 3; ix += 1) {
      for (let iy = -2; iy <= 2; iy += 1) {
        if ((ix + iy) % 2 === 0 && Math.abs(ix) + Math.abs(iy) > 0) continue;
        queueBossBottomLeftBurst(w, e, fx + ix * spacing, fy + iy * spacing, {
          delay: baseDelay + (Math.abs(ix) + Math.abs(iy)) * 0.038,
          radius: 20 + phase * 2,
          damage,
          color: "130,218,255",
        });
      }
    }
    return;
  }

  const dirA = Math.atan2(fvy, fvx);
  const fallbackA = Math.atan2(fy - e.y, fx - e.x);
  const trailA = Math.hypot(fvx, fvy) > 30 ? dirA : fallbackA;
  if (choice === 4) {
    for (let i = 0; i < 10 + phase * 3; i += 1) {
      const d = 26 + i * (44 + phase * 4);
      const side = (Math.random() - 0.5) * (38 + phase * 14);
      const nx = Math.cos(trailA + Math.PI * 0.5) * side;
      const ny = Math.sin(trailA + Math.PI * 0.5) * side;
      queueBossBottomLeftBurst(w, e, fx + Math.cos(trailA) * d + nx, fy + Math.sin(trailA) * d + ny, {
        delay: baseDelay + i * 0.032,
        radius: 16 + phase * 1.9,
        damage,
        color: "255,202,130",
      });
    }
    return;
  }

  if (choice === 5) {
    const ringA = 132 + phase * 18;
    const ringB = 80 + phase * 14;
    const countA = 10 + phase * 3;
    const countB = 8 + phase * 3;
    for (let i = 0; i < countA; i += 1) {
      const a = (i / countA) * Math.PI * 2;
      queueBossBottomLeftBurst(w, e, fx + Math.cos(a) * ringA, fy + Math.sin(a) * ringA, {
        delay: baseDelay + 0.02 + (i % 3) * 0.01,
        radius: 18 + phase * 2,
        damage: damage * 0.9,
        color: "255,170,122",
      });
    }
    for (let i = 0; i < countB; i += 1) {
      const a = (i / countB) * Math.PI * 2 + 0.2;
      queueBossBottomLeftBurst(w, e, fx + Math.cos(a) * ringB, fy + Math.sin(a) * ringB, {
        delay: baseDelay + 0.26 + (i % 2) * 0.015,
        radius: 19 + phase * 2.1,
        damage,
        color: "255,132,120",
      });
    }
    queueBossBottomLeftBurst(w, e, fx, fy, {
      delay: baseDelay + 0.48,
      radius: 24 + phase * 2.2,
      damage: damage * 1.1,
      color: "255,118,108",
    });
    return;
  }

  const waveCount = 3 + phase;
  const spokes = 5 + phase;
  const seedA = Math.random() * Math.PI * 2;
  for (let wave = 0; wave < waveCount; wave += 1) {
    const spin = seedA + wave * (0.44 + phase * 0.1);
    const dist = 72 + wave * (46 + phase * 6);
    for (let i = 0; i < spokes; i += 1) {
      const a = spin + (i / spokes) * Math.PI * 2;
      const nx = Math.cos(trailA + Math.PI * 0.5) * ((Math.random() - 0.5) * (24 + phase * 8));
      const ny = Math.sin(trailA + Math.PI * 0.5) * ((Math.random() - 0.5) * (24 + phase * 8));
      queueBossBottomLeftBurst(w, e, e.x + Math.cos(a) * dist + nx, e.y + Math.sin(a) * dist + ny, {
        delay: baseDelay + wave * 0.12 + i * 0.008,
        radius: 17 + phase * 1.8,
        damage: damage * 0.92,
        color: "255,208,138",
      });
    }
  }
}

function stepBossBursts(w, dt) {
  const p = w.player;
  const kept = [];
  for (const burst of w.bossBursts) {
    if (!burst.fired && burst.owner && burst.owner.hp <= 0) continue;

    if (!burst.fired) {
      burst.t -= dt;
      if (burst.t <= 0) {
        burst.fired = true;
        burst.linger = 0.18;
        const rawDamage = Math.abs(burst.dmg) * w.scale.enemyDamage;
        if (Math.hypot(p.x - burst.x, p.y - burst.y) <= burst.r + 10) {
          const dmg = rawDamage * (1 - Math.min(0.62, p.armor));
          applyPlayerDamage(w, dmg, { hitFlash: 0.14, playSound: true, absorbSplash: false });
        }
        if (Array.isArray(w.allies) && w.allies.length > 0) {
          for (const ally of w.allies) {
            if (!ally || ally.hp <= 0) continue;
            const hitR = burst.r + Math.max(7, (ally.r || 10) * 0.75);
            if (Math.hypot(ally.x - burst.x, ally.y - burst.y) > hitR) continue;
            ally.hp -= rawDamage * 0.88;
            ally.hitFlash = Math.max(ally.hitFlash || 0, 0.13);
          }
        }
        splash(w, burst.x, burst.y, "#ffad7e", 14 + burst.r * 0.18, 1.7);
      }
    } else {
      burst.linger -= dt;
    }

    if ((!burst.fired && burst.t > 0) || (burst.fired && burst.linger > 0)) {
      kept.push(burst);
    }
  }
  w.bossBursts = kept;
}

function spawnEnemyByKind(w, kind, x, y) {
  const hpScale = w.scale.enemyHp;
  const spdScale = w.scale.enemySpeed;

  if (kind === "chaser") {
    w.enemies.push({ kind, x, y, hp: (34 + w.threat * 4) * hpScale, speed: (140 + w.threat * 2) * spdScale, r: 12, cd: 0, zig: 0 });
    return;
  }

  if (kind === "brute") {
    w.enemies.push({ kind, x, y, hp: (90 + w.threat * 10) * hpScale, speed: (92 + w.threat) * spdScale, r: 17, cd: 0, zig: 0 });
    return;
  }

  if (kind === "dart") {
    w.enemies.push({ kind, x, y, hp: (30 + w.threat * 3) * hpScale, speed: (125 + w.threat * 2) * spdScale, r: 10, cd: 1.2, zig: 0 });
    return;
  }

  if (kind === "berserker") {
    w.enemies.push({ kind, x, y, hp: (42 + w.threat * 5) * hpScale, speed: (170 + w.threat * 3) * spdScale, r: 11, cd: 0.4, zig: Math.random() * 6.28 });
    return;
  }

  if (kind === "tank") {
    w.enemies.push({ kind, x, y, hp: (170 + w.threat * 14) * hpScale, speed: (72 + w.threat * 0.9) * spdScale, r: 22, cd: 1.6, zig: 0 });
    return;
  }

  if (kind === "leaper") {
    w.enemies.push({
      kind,
      x,
      y,
      hp: (54 + w.threat * 6) * hpScale,
      speed: (130 + w.threat * 1.8) * spdScale,
      r: 12,
      cd: 1.2,
      zig: Math.random() * 6.28,
      windup: 0,
      dashT: 0,
      dashVx: 0,
      dashVy: 0,
    });
    return;
  }

  if (kind === "splitter") {
    const hp = (84 + w.threat * 9) * hpScale;
    w.enemies.push({
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      speed: (112 + w.threat * 1.6) * spdScale,
      r: 14,
      cd: 0,
      zig: Math.random() * 6.28,
    });
    return;
  }

  if (kind === "siphon") {
    const hp = (66 + w.threat * 7) * hpScale;
    w.enemies.push({
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      speed: (102 + w.threat * 1.25) * spdScale,
      r: 13,
      cd: 0,
      drainCd: 0.32,
      orbit: Math.random() * 6.28,
    });
    return;
  }

  if (kind === "mini_boss") {
    const hp = (560 + w.threat * 44) * hpScale;
    w.enemies.push({
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      speed: (88 + w.threat * 1.2) * spdScale,
      r: 30,
      cd: 0,
      orbit: Math.random() * 6.28,
      volleyCd: 1.7,
      dashCd: 4.8,
      summonCd: 8.8,
      windup: 0,
      dashT: 0,
      dashVx: 0,
      dashVy: 0,
      guard: 0.2,
      phase: 1,
    });
    return;
  }

  if (kind === "mini_boss_miner") {
    const hp = (590 + w.threat * 48) * hpScale;
    w.enemies.push({
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      speed: (84 + w.threat * 1.12) * spdScale,
      r: 32,
      cd: 0,
      orbit: Math.random() * 6.28,
      mineCd: 1.45,
      detonateCd: 5.6,
      volleyCd: 2.25,
      guard: 0.22,
      phase: 1,
    });
    return;
  }

  if (kind === "mega_cannon_boss") {
    const hp = (1540 + w.threat * 96) * hpScale;
    w.enemies.push({
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      speed: (74 + w.threat * 0.82) * spdScale,
      r: 38,
      orbit: Math.random() * 6.28,
      cannonAim: Math.random() * Math.PI * 2,
      chargeCd: 3.0,
      chargeT: 0,
      chargeFired: true,
      shieldCd: 6.6,
      shieldT: 0,
      guard: 0.34,
      phase: 1,
    });
    return;
  }

  if (kind === "siphon_overlord") {
    const hp = (3080 + w.threat * 192) * hpScale;
    w.enemies.push({
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      speed: (79 + w.threat * 0.9) * spdScale,
      r: 44,
      orbit: Math.random() * 6.28,
      guard: 0.38,
      phase: 1,
      missileCd: 1.3,
      laserCd: 3.8,
      laserChargeT: 0,
      laserFired: true,
      summonCd: 6.6,
      allyDrainCd: 1.6,
      allyDrainPulse: 0,
      drainLinks: [],
      staggerMeter: 0,
      staggerNeed: 84,
      stunnedT: 0,
      weakSpotFlash: 0,
    });
    return;
  }

  if (kind === "boss_bottom_left") {
    const hp = (2460 + w.threat * 156) * hpScale;
    const boss = {
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      speed: (76 + w.threat * 0.86) * spdScale,
      r: 43,
      orbit: Math.random() * 6.28,
      guard: 0.38,
      phase: 1,
      shieldSpin: Math.random() * Math.PI * 2,
      shieldActive: { void: true, azure: true, amber: true },
      shieldRestoreCd: { void: 0, azure: 0, amber: 0 },
      shieldBreakFlash: { void: 0, azure: 0, amber: 0 },
      minionOrbit: Math.random() * Math.PI * 2,
      patternCd: 2.6,
      patternPulse: 0,
      volleyCd: 1.7,
      slamCd: 5.6,
      slamChargeT: 0,
      slamChargeTotal: 0,
      slamFired: true,
    };
    w.enemies.push(boss);

    const minionHp = (188 + w.threat * 14) * hpScale;
    const orbitRadius = boss.r + BOSS_BOTTOM_LEFT_MINION_ORBIT_OFFSET;
    for (let i = 0; i < BOSS_BOTTOM_LEFT_SHIELD_TYPES.length; i += 1) {
      const shieldType = BOSS_BOTTOM_LEFT_SHIELD_TYPES[i];
      const minionKind = BOSS_BOTTOM_LEFT_MINION_BY_TYPE[shieldType];
      if (!minionKind) continue;
      w.enemies.push({
        kind: minionKind,
        x: x + Math.cos((i / 3) * Math.PI * 2) * orbitRadius,
        y: y + Math.sin((i / 3) * Math.PI * 2) * orbitRadius,
        hp: minionHp,
        maxHp: minionHp,
        speed: 0,
        r: 16,
        guard: 0.08,
        owner: boss,
        shieldType,
        typedShieldUp: true,
        shieldBreakFlash: 0,
        orbitOffset: (i / 3) * Math.PI * 2,
        shotCd: 1.1 + Math.random() * 0.7,
      });
    }
    return;
  }

  if (kind === "shardling") {
    w.enemies.push({
      kind,
      x,
      y,
      hp: Math.max(10, (22 + w.threat * 2.5) * hpScale),
      speed: (168 + w.threat * 2.4) * spdScale,
      r: 8,
      cd: 0,
      zig: Math.random() * 6.28,
    });
    return;
  }

  // Fallback: phantom
  w.enemies.push({ kind: "phantom", x, y, hp: (58 + w.threat * 6) * hpScale, speed: (150 + w.threat * 2.2) * spdScale, r: 12, cd: 1.0, zig: Math.random() * 6.28, phase: 0 });
}

function spawnEnemyWave(w) {
  const count = 1 + Math.floor(w.threat * 0.48 + (w.difficulty - 1) * 0.35);
  for (let i = 0; i < count; i += 1) {
    const kind = pickEnemyKindForDifficulty(w.difficulty);
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = -24; y = Math.random() * canvas.height; }
    if (edge === 1) { x = canvas.width + 24; y = Math.random() * canvas.height; }
    if (edge === 2) { x = Math.random() * canvas.width; y = -24; }
    if (edge === 3) { x = Math.random() * canvas.width; y = canvas.height + 24; }
    const spawnKind = isMiniBossKind(kind) && w.enemies.some((e) => isMiniBossKind(e.kind)) ? "tank" : kind;
    spawnEnemyByKind(w, spawnKind, x, y);
  }
}

function stepBullets(w, dt) {
  for (const b of w.bullets) {
    b.px = b.x;
    b.py = b.y;
    if (b.enemy && (b.megaShot || b.voidMissile) && !b.smartAim) {
      const target = getSummonedAggroTarget(w, b.x, b.y);
      const velocity = getTargetVelocity(target);
      const lead = b.voidMissile ? (b.targetLead ?? 0.15) : (b.targetLead ?? 0.22);
      const tx = target.x + velocity.vx * lead;
      const ty = target.y + velocity.vy * lead;
      const desired = Math.atan2(ty - b.y, tx - b.x);
      const current = Math.atan2(b.vy, b.vx);
      let delta = desired - current;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const turnRate = b.voidMissile ? (b.turn ?? 2.9) : (b.turn ?? 3.4);
      const next = current + clamp(delta, -turnRate * dt, turnRate * dt);
      const speed = Math.hypot(b.vx, b.vy) || 1;
      b.vx = Math.cos(next) * speed;
      b.vy = Math.sin(next) * speed;
    } else if (!b.enemy && (b.seekTurn || 0) > 0 && w.enemies.length > 0) {
      let target = null;
      let best = b.seekRange || 0;
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        const dist = Math.hypot(e.x - b.x, e.y - b.y);
        if (dist < best) {
          best = dist;
          target = e;
        }
      }
      if (target) {
        const lead = (b.seekLead || 0) * 40;
        const tx = target.x + (target.vx || 0) * lead;
        const ty = target.y + (target.vy || 0) * lead;
        const desired = Math.atan2(ty - b.y, tx - b.x);
        const current = Math.atan2(b.vy, b.vx);
        let delta = desired - current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const next = current + clamp(delta, -(b.seekTurn || 0) * dt, (b.seekTurn || 0) * dt);
        const speed = Math.hypot(b.vx, b.vy) || 1;
        b.vx = Math.cos(next) * speed;
        b.vy = Math.sin(next) * speed;
      }
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  w.bullets = w.bullets.filter((b) => b.life > 0 && b.x > -40 && b.y > -40 && b.x < canvas.width + 40 && b.y < canvas.height + 40);
}

function stepRockets(w, dt) {
  for (const r of w.rockets) {
    r.px = r.x;
    r.py = r.y;
    r.life -= dt;
    let target = null;
    let best = Infinity;
    for (const e of w.enemies) {
      const dist = Math.hypot(e.x - r.x, e.y - r.y);
      if (dist < best) {
        best = dist;
        target = e;
      }
    }

    if (target) {
      const desired = Math.atan2(target.y - r.y, target.x - r.x);
      const current = Math.atan2(r.vy, r.vx);
      let delta = desired - current;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const next = current + clamp(delta, -r.turn * dt, r.turn * dt);
      const speed = Math.hypot(r.vx, r.vy);
      r.vx = Math.cos(next) * speed;
      r.vy = Math.sin(next) * speed;
    }

    r.x += r.vx * dt;
    r.y += r.vy * dt;
  }

  w.rockets = w.rockets.filter((r) => r.life > 0);
}

function getMineLinkKey(a, b) {
  const aid = Math.floor(a?.id || 0);
  const bid = Math.floor(b?.id || 0);
  if (aid <= bid) return `${aid}:${bid}`;
  return `${bid}:${aid}`;
}

function getMineChainAffinityType(mine) {
  if (!mine) return "normal";
  return (mine.affinity === "void" || mine.voidInfused) ? "void" : "normal";
}

function canMinesChainTogether(a, b) {
  return getMineChainAffinityType(a) === getMineChainAffinityType(b);
}

function getVoidMineChargeRateMultiplier(w) {
  if (!w || !Array.isArray(w.mines) || w.mines.length <= 0) return 1;
  let mult = 1;
  for (const mine of w.mines) {
    if (!mine || mine.expired || (mine.chargesLeft || 0) <= 0) continue;
    if (!mine.voidInfused) continue;
    const mineMult = Math.max(1, Number(mine.chargeRateMult) || 1);
    if (mineMult > mult) mult = mineMult;
  }
  return mult;
}

function getPointToSegmentDistancePx(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const denom = abx * abx + aby * aby;
  if (denom <= 0.0001) return Math.hypot(px - ax, py - ay);
  const t = clamp((apx * abx + apy * aby) / denom, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function getClosestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const denom = abx * abx + aby * aby;
  if (denom <= 0.0001) return { x: ax, y: ay };
  const t = clamp((apx * abx + apy * aby) / denom, 0, 1);
  return { x: ax + abx * t, y: ay + aby * t };
}

function findClosestEnemyToPoint(w, x, y, exclude = null, maxDistance = Number.POSITIVE_INFINITY) {
  let best = null;
  let bestDist = maxDistance;
  for (const e of w.enemies) {
    if (!e || e.hp <= 0 || e === exclude) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

function consumePlayerMineCharge(m) {
  m.chargesLeft = Math.max(0, (m.chargesLeft || 1) - 1);
  if (m.chargesLeft > 0) {
    m.armed = Math.max(m.rearm || 0.7, 0.04);
  } else {
    m.expired = true;
  }
}

function applyStickyGooMineToEnemy(w, mine, enemy) {
  if (!mine || !enemy || enemy.hp <= 0) return;
  const fuse = Math.max(0.8, mine.gooFuse || 3.2);
  const payload = {
    timer: fuse,
    total: fuse,
    seekSpeed: Math.max(36, mine.gooSeekSpeed || 96),
    radius: Math.max(12, mine.r || 54),
    dmg: Math.max(1, (mine.dmg || 44) * (mine.gooBlastMult || 1)),
    affinity: mine.affinity || "amber",
  };
  const current = enemy.gooMine;
  if (!current || payload.dmg >= (current.dmg || 0) || payload.timer <= (current.timer || Number.POSITIVE_INFINITY)) {
    enemy.gooMine = payload;
    enemy.gooMinePulse = 0.4;
  }
  markEnemyHit(enemy);
  splash(w, enemy.x, enemy.y, (mine.voidInfused || mine.affinity === "void") ? "#bc8bff" : "#a7ff9d", 8, 1.0);
}

function detonateGooMineOnEnemy(w, carrier, gooData) {
  if (!carrier || !gooData) return;
  const radius = Math.max(12, gooData.radius || 52);
  const damage = Math.max(1, gooData.dmg || 46);
  const affinity = gooData.affinity || "amber";

  for (const e of w.enemies) {
    if (!e || e.hp <= 0) continue;
    const d = Math.hypot(e.x - carrier.x, e.y - carrier.y);
    if (d > radius) continue;

    markEnemyHit(e);
    if (applyTypedShieldBlock(w, e, carrier.x, carrier.y, affinity)) {
      e.lastHitKind = "mine";
      continue;
    }

    const falloff = 1 - d / radius;
    const dealt = damage * (0.35 + falloff * 0.65);
    if (e.kind === "mega_cannon_boss" && e.shieldT > 0) {
      e.hp = Math.min(e.maxHp || e.hp, e.hp + dealt * 0.55);
      splash(w, e.x, e.y, "#8bff9f", 6, 1.0);
    } else {
      e.hp -= dealt;
      registerSiphonOverlordHit(w, e, dealt);
      e.lastHitKind = "mine";
    }
  }

  carrier.gooMine = null;
  carrier.gooMinePulse = 0;
  splash(w, carrier.x, carrier.y, affinity === "void" ? "#ba8dff" : "#9fff9f", 14 + radius * 0.18, 2.4);
  audio.play("mineBlast");
}

function detonatePlayerMine(w, m) {
  if (!m || m.expired || (m.chargesLeft || 0) <= 0) return;

  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - m.x, e.y - m.y);
    if (d > m.r) continue;
    markEnemyHit(e);
    if (applyTypedShieldBlock(w, e, m.x, m.y, m.affinity || "amber")) {
      e.lastHitKind = "mine";
      continue;
    }
    const falloff = 1 - d / m.r;
    const dealt = m.dmg * (0.35 + falloff * 0.65);
    if (e.kind === "mega_cannon_boss" && e.shieldT > 0) {
      e.hp = Math.min(e.maxHp || e.hp, e.hp + dealt * 0.55);
      splash(w, e.x, e.y, "#8bff9f", 6, 1.0);
    } else {
      e.hp -= dealt;
      registerSiphonOverlordHit(w, e, dealt);
      e.lastHitKind = "mine";
    }
  }

  consumePlayerMineCharge(m);

  splash(w, m.x, m.y, (m.voidInfused || m.affinity === "void") ? "#c18cff" : "#ffbb7d", 14 + m.r * 0.22, 2.7);
  audio.play("mineBlast");
}

function stepMines(w, dt) {
  if (!w.mineLinkCooldowns || typeof w.mineLinkCooldowns !== "object") w.mineLinkCooldowns = {};

  const kept = [];
  for (const m of w.mines) {
    m.armed -= dt;
    m.pulse = (m.pulse || 0) + dt * 4.2;
    if (!Number.isFinite(m.id) || m.id <= 0) m.id = w.nextMineId++;
    if (!Number.isFinite(m.chargesLeft)) m.chargesLeft = 1;
    if (!Number.isFinite(m.maxCharges)) m.maxCharges = Math.max(1, m.chargesLeft);
    if (!Number.isFinite(m.rearm)) m.rearm = 0.75;
    if (!Number.isFinite(m.chargeRateMult)) m.chargeRateMult = m.voidInfused ? 2 : 1;
    if (typeof m.expired !== "boolean") m.expired = false;
    if (typeof m.gooEnabled !== "boolean") m.gooEnabled = false;
    if (!Number.isFinite(m.gooFuse)) m.gooFuse = 0;
    if (!Number.isFinite(m.gooBlastMult)) m.gooBlastMult = 1;
    if (!Number.isFinite(m.gooSeekSpeed)) m.gooSeekSpeed = 0;

    if (m.expired || m.chargesLeft <= 0) {
      continue;
    }

    if (m.armed <= 0) {
      const triggerRadius = Math.max(8, m.trigger || m.r * 0.45);
      if (m.gooEnabled) {
        const targetEnemy = findClosestEnemyToPoint(w, m.x, m.y, null, triggerRadius);
        if (targetEnemy) {
          applyStickyGooMineToEnemy(w, m, targetEnemy);
          consumePlayerMineCharge(m);
        }
      } else {
        const shouldDetonate = w.enemies.some((e) => e.hp > 0 && Math.hypot(e.x - m.x, e.y - m.y) < triggerRadius);
        if (shouldDetonate) {
          detonatePlayerMine(w, m);
        }
      }
      if (!m.expired && m.chargesLeft > 0) {
        kept.push(m);
      }
      continue;
    }

    kept.push(m);
  }

  w.mines = kept;

  const keys = Object.keys(w.mineLinkCooldowns);
  for (const key of keys) {
    w.mineLinkCooldowns[key] = Math.max(0, (w.mineLinkCooldowns[key] || 0) - dt);
    if (w.mineLinkCooldowns[key] <= 0.001) delete w.mineLinkCooldowns[key];
  }

  const chainMines = w.mines.filter((m) => !m.expired && (m.chargesLeft || 0) > 0 && m.chainEnabled && (m.chainRange || 0) > 0);
  const validLinkKeys = new Set();
  for (let i = 0; i < chainMines.length; i += 1) {
    const a = chainMines[i];
    for (let j = i + 1; j < chainMines.length; j += 1) {
      const b = chainMines[j];
      if (!canMinesChainTogether(a, b)) continue;
      const maxRange = Math.min(a.chainRange || 0, b.chainRange || 0);
      const pairDist = Math.hypot(a.x - b.x, a.y - b.y);
      if (maxRange <= 0 || pairDist > maxRange) continue;

      const key = getMineLinkKey(a, b);
      validLinkKeys.add(key);
      if ((w.mineLinkCooldowns[key] || 0) > 0) continue;

      const width = Math.max(4, Math.min(a.chainWidth || 10, b.chainWidth || 10));
      let tripped = false;
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        const distToLink = getPointToSegmentDistancePx(e.x, e.y, a.x, a.y, b.x, b.y);
        if (distToLink > (e.r || 10) + width * 0.5) continue;

        const impact = getClosestPointOnSegment(e.x, e.y, a.x, a.y, b.x, b.y);
        markEnemyHit(e);
        const linkAffinity = getMineChainAffinityType(a) === "void" ? "void" : "amber";
        if (!applyTypedShieldBlock(w, e, impact.x, impact.y, linkAffinity)) {
          const linkDamage = ((a.dmg + b.dmg) * 0.5) * 0.34 * ((a.chainDamageMult + b.chainDamageMult) * 0.5);
          if (e.kind === "mega_cannon_boss" && e.shieldT > 0) {
            e.hp = Math.min(e.maxHp || e.hp, e.hp + linkDamage * 0.5);
            splash(w, e.x, e.y, "#8bff9f", 6, 1.0);
          } else {
            e.hp -= linkDamage;
            registerSiphonOverlordHit(w, e, linkDamage);
            e.lastHitKind = "mine";
          }
        } else {
          e.lastHitKind = "mine";
        }

        const recharge = Math.max(0.35, ((a.chainRecharge || 2.8) + (b.chainRecharge || 2.8)) * 0.5);
        w.mineLinkCooldowns[key] = recharge;
        splash(w, impact.x, impact.y, linkAffinity === "void" ? "#be90ff" : "#ffc27d", 10, 1.4);
        audio.play("enemyShot");
        tripped = true;
        break;
      }

      if (tripped) continue;
    }
  }

  for (const key of Object.keys(w.mineLinkCooldowns)) {
    if (!validLinkKeys.has(key)) delete w.mineLinkCooldowns[key];
  }
}

function stepEnemyMines(w, dt) {
  const p = w.player;
  const kept = [];

  for (const m of w.enemyMines) {
    m.life -= dt;
    m.armed -= dt;
    m.pulse = (m.pulse || 0) + dt * 4.6;

    let shouldExplode = false;
    const dist = Math.hypot(p.x - m.x, p.y - m.y);
    if (m.armed <= 0 && dist <= m.trigger) shouldExplode = true;
    if (m.life <= 0) shouldExplode = true;

    if (!shouldExplode) {
      kept.push(m);
      continue;
    }

    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d <= m.r) {
      const falloff = 1 - d / m.r;
      const raw = m.dmg * (0.32 + falloff * 0.68) * w.scale.enemyDamage;
      const damage = raw * (1 - Math.min(0.62, p.armor));
      applyPlayerDamage(w, damage, { hitFlash: 0.14, absorbSplash: false });
    }

    if (Array.isArray(w.allies) && w.allies.length > 0) {
      for (const ally of w.allies) {
        const hd = Math.hypot(ally.x - m.x, ally.y - m.y);
        if (hd > m.r) continue;
        const hfalloff = 1 - hd / m.r;
        ally.hp -= m.dmg * (0.28 + hfalloff * 0.52) * 0.48;
        ally.hitFlash = Math.max(ally.hitFlash || 0, 0.12);
      }
    }

    for (const other of w.enemyMines) {
      if (other === m || other.life <= 0) continue;
      const od = Math.hypot(other.x - m.x, other.y - m.y);
      if (od <= m.r * 0.7) other.armed = Math.min(other.armed, 0.05);
    }

    splash(w, m.x, m.y, "#ff945f", 20, 2.8);
    audio.play("mineBlast");
  }

  w.enemyMines = kept;
}

function getHelperSummonTier(moduleLevel) {
  const level = clamp(Math.floor(moduleLevel || 0), 0, MAX_UPGRADE_LEVEL);
  if (level >= 40) return 5;
  if (level >= 28) return 4;
  if (level >= 16) return 3;
  if (level >= 8) return 2;
  return 1;
}

function getHelperSummonComposition(moduleLevel) {
  const tier = getHelperSummonTier(moduleLevel);
  if (tier >= 5) {
    return [
      { kind: "mini_boss", count: 3 },
      { kind: "chaser", count: 4 },
      { kind: "dart", count: 3 },
      { kind: "brute", count: 2 },
    ];
  }
  if (tier === 4) {
    return [
      { kind: "mini_boss", count: 2 },
      { kind: "chaser", count: 3 },
      { kind: "dart", count: 3 },
      { kind: "brute", count: 1 },
    ];
  }
  if (tier === 3) {
    return [
      { kind: "mini_boss", count: 1 },
      { kind: "chaser", count: 3 },
      { kind: "dart", count: 2 },
      { kind: "brute", count: 1 },
    ];
  }
  if (tier === 2) {
    return [
      { kind: "chaser", count: 2 },
      { kind: "dart", count: 2 },
      { kind: "brute", count: 1 },
    ];
  }
  return [
    { kind: "chaser", count: 1 },
    { kind: "dart", count: 1 },
  ];
}

function getSummonedAllyTemplate(kind) {
  if (kind === "mini_boss") {
    return {
      r: 20,
      hp: 220,
      hpPerLevel: 36,
      speed: 116,
      speedPerLevel: 2.6,
      preferredRange: 220,
      fireRange: 560,
      fireRate: 0.72,
      fireRatePerLevel: 0.012,
      dmg: 17,
      dmgPerLevel: 2.0,
      bulletSpeed: 640,
      bulletLife: 1.35,
      shots: 3,
      spread: 0.22,
      strafe: 0.38,
      orbitRate: 1.6,
      turnRate: 7.4,
    };
  }
  if (kind === "brute") {
    return {
      r: 15,
      hp: 130,
      hpPerLevel: 22,
      speed: 136,
      speedPerLevel: 2.0,
      preferredRange: 175,
      fireRange: 430,
      fireRate: 0.84,
      fireRatePerLevel: 0.015,
      dmg: 13.5,
      dmgPerLevel: 1.65,
      bulletSpeed: 575,
      bulletLife: 1.2,
      shots: 1,
      spread: 0,
      strafe: 0.2,
      orbitRate: 1.7,
      turnRate: 8.2,
    };
  }
  if (kind === "dart") {
    return {
      r: 10,
      hp: 74,
      hpPerLevel: 12,
      speed: 208,
      speedPerLevel: 3.5,
      preferredRange: 250,
      fireRange: 590,
      fireRate: 1.55,
      fireRatePerLevel: 0.024,
      dmg: 8,
      dmgPerLevel: 1.05,
      bulletSpeed: 760,
      bulletLife: 1.18,
      shots: 1,
      spread: 0,
      strafe: 0.5,
      orbitRate: 3.8,
      turnRate: 11.8,
    };
  }
  return {
    r: 12,
    hp: 92,
    hpPerLevel: 15,
    speed: 184,
    speedPerLevel: 2.8,
    preferredRange: 150,
    fireRange: 430,
    fireRate: 1.24,
    fireRatePerLevel: 0.02,
    dmg: 9.4,
    dmgPerLevel: 1.2,
    bulletSpeed: 670,
    bulletLife: 1.12,
    shots: 1,
    spread: 0,
    strafe: 0.28,
    orbitRate: 2.8,
    turnRate: 9.8,
  };
}

function createSummonedAlly(kind, x, y, moduleLevel) {
  const power = Math.max(1, Math.floor(moduleLevel || 0) + 1);
  const tier = getHelperSummonTier(moduleLevel);
  const cfg = getSummonedAllyTemplate(kind);
  const fireRate = cfg.fireRate * (1 + cfg.fireRatePerLevel * power);
  const fireCdSeed = Math.min(0.45, 1 / Math.max(0.22, fireRate));
  const life = 14 + power * 0.45 + tier * 1.2 + (kind === "mini_boss" ? 4.5 : 0);
  return {
    ally: true,
    kind,
    x,
    y,
    r: cfg.r,
    hp: cfg.hp + cfg.hpPerLevel * power,
    maxHp: cfg.hp + cfg.hpPerLevel * power,
    speed: cfg.speed + cfg.speedPerLevel * power,
    preferredRange: cfg.preferredRange,
    fireRange: cfg.fireRange + tier * 12,
    fireRate,
    dmg: cfg.dmg + cfg.dmgPerLevel * power,
    bulletSpeed: cfg.bulletSpeed + power * 4.5,
    bulletLife: cfg.bulletLife + tier * 0.04,
    shots: cfg.shots,
    spread: cfg.spread,
    strafe: cfg.strafe,
    orbitRate: cfg.orbitRate,
    turnRate: cfg.turnRate,
    fireCd: Math.random() * fireCdSeed,
    cd: Math.random() * fireCdSeed,
    volleyCd: 0.55 + Math.random() * 0.32,
    dashCd: 2.4 + Math.random() * 0.8,
    dashT: 0,
    dashVx: 0,
    dashVy: 0,
    windup: 0,
    orbit: Math.random() * Math.PI * 2,
    facing: Math.random() * Math.PI * 2,
    phase: 1,
    guard: 0,
    vx: 0,
    vy: 0,
    hitFlash: 0,
    life,
  };
}

function summonHelperAllies(w, moduleLevel) {
  const composition = getHelperSummonComposition(moduleLevel);
  const p = w.player;
  const total = composition.reduce((sum, entry) => sum + entry.count, 0);
  if (total <= 0) return 0;

  const summoned = [];
  let idx = 0;
  for (const entry of composition) {
    for (let i = 0; i < entry.count; i += 1) {
      const t = idx / total;
      const a = t * Math.PI * 2 + Math.random() * 0.28;
      const radius = 38 + (idx % 5) * 10 + Math.random() * 8;
      const sx = p.x + Math.cos(a) * radius;
      const sy = p.y + Math.sin(a) * radius;
      summoned.push(createSummonedAlly(entry.kind, sx, sy, moduleLevel));
      idx += 1;
    }
  }

  w.allies = summoned;
  w.helper = null;
  return summoned.length;
}

function stepHelper(w, dt) {
  if (!Array.isArray(w.allies) || w.allies.length === 0) return;

  const p = w.player;
  const alive = [];
  const invDt = 1 / Math.max(0.001, dt);

  const shootAllyBullet = (ally, angle, opts = {}) => {
    const speed = opts.speed ?? ally.bulletSpeed ?? 650;
    const life = opts.life ?? ally.bulletLife ?? 1.1;
    const dmgScale = opts.dmgScale ?? 1;
    w.bullets.push({
      x: ally.x + Math.cos(angle) * (ally.r + 4),
      y: ally.y + Math.sin(angle) * (ally.r + 4),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      dmg: ally.dmg * dmgScale,
      helper: true,
      ally: true,
      affinity: "azure",
    });
  };

  for (const ally of w.allies) {
    const prevX = ally.x;
    const prevY = ally.y;

    ally.life -= dt;
    ally.fireCd = Math.max(0, (ally.fireCd || 0) - dt);
    ally.cd = Math.max(0, (ally.cd || 0) - dt);
    ally.volleyCd = Math.max(0, (ally.volleyCd || 0) - dt);
    ally.dashCd = Math.max(0, (ally.dashCd || 0) - dt);
    ally.hitFlash = Math.max(0, (ally.hitFlash || 0) - dt);
    if (ally.kind !== "mini_boss") {
      ally.orbit = (ally.orbit || 0) + dt * (ally.orbitRate || 2.4);
    }

    if (ally.life <= 0 || ally.hp <= 0) {
      splash(w, ally.x, ally.y, "#9ef3ff", 8 + Math.max(0, ally.r - 8) * 0.6, 1.9);
      continue;
    }

    let target = null;
    let best = Number.POSITIVE_INFINITY;
    for (const enemy of w.enemies) {
      if (enemy.hp <= 0) continue;
      const d = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
      if (d < best) {
        best = d;
        target = enemy;
      }
    }

    if (target) {
      const dx = target.x - ally.x;
      const dy = target.y - ally.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const desired = Math.atan2(dy, dx);
      const targetSpeed = (target.speed || 0) * (target.dashT > 0 ? 2.2 : 1);
      const tvx = Number.isFinite(target.vx) ? target.vx : Math.cos(target.facing || desired) * targetSpeed;
      const tvy = Number.isFinite(target.vy) ? target.vy : Math.sin(target.facing || desired) * targetSpeed;
      const hpPct = ally.hp / Math.max(1, ally.maxHp || ally.hp);
      const phase = hpPct > 0.66 ? 1 : hpPct > 0.33 ? 2 : 3;
      ally.phase = phase;

      const turnRate = ally.kind === "mini_boss" ? (2.4 + phase * 0.35) : (ally.turnRate || 8);
      const delta = shortestAngleDelta(ally.facing || desired, desired);
      ally.facing = (ally.facing || desired) + clamp(delta, -turnRate * dt, turnRate * dt);

      if (ally.kind === "dart") {
        const preferred = 250;
        const dir = d > preferred ? 1 : -0.75;
        ally.x += (dx / d) * ally.speed * dir * dt;
        ally.y += (dy / d) * ally.speed * dir * dt;

        if (ally.cd <= 0 && d < (ally.fireRange || 560)) {
          const aim = getPredictiveAimAngle(ally.x, ally.y, target.x, target.y, tvx, tvy, ally.bulletSpeed || 700, {
            leadBias: 0.9,
            maxLead: 1.1,
          });
          shootAllyBullet(ally, aim, { speed: (ally.bulletSpeed || 700) * 0.96, life: ally.bulletLife || 1.2, dmgScale: 1.0 });
          ally.cd = Math.max(0.22, 1 / Math.max(0.28, ally.fireRate || 1));
          if (Math.random() < 0.22) audio.play("helperShot");
        }
      } else if (ally.kind === "mini_boss") {
        if ((ally.dashT || 0) > 0) {
          ally.x += ally.dashVx * dt;
          ally.y += ally.dashVy * dt;
          ally.dashT = Math.max(0, (ally.dashT || 0) - dt);
          ally.guard = 0.45;

          if (ally.dashT <= 0) {
            const burstShots = phase >= 3 ? 14 : 10;
            const burstSpeed = Math.max(260, (ally.bulletSpeed || 640) * 0.48 + phase * 18);
            for (let i = 0; i < burstShots; i += 1) {
              const a = (i / burstShots) * Math.PI * 2;
              shootAllyBullet(ally, a, { speed: burstSpeed, life: 2.0, dmgScale: 0.5 + phase * 0.08 });
            }
            splash(w, ally.x, ally.y, "#9feaff", 14, 1.6);
            audio.play("helperShot");
          }
        } else if ((ally.windup || 0) > 0) {
          ally.windup = Math.max(0, (ally.windup || 0) - dt);
          ally.guard = 0.72;
          if (ally.windup <= 0) {
            const leadX = target.x + tvx * 0.2;
            const leadY = target.y + tvy * 0.2;
            const ldx = leadX - ally.x;
            const ldy = leadY - ally.y;
            const ld = Math.hypot(ldx, ldy) || 1;
            const dashSpeed = ally.speed * (phase >= 3 ? 3.15 : 2.9);
            ally.dashVx = (ldx / ld) * dashSpeed;
            ally.dashVy = (ldy / ld) * dashSpeed;
            ally.dashT = phase >= 3 ? 0.34 : 0.3;
            splash(w, ally.x, ally.y, "#a7f0ff", 9, 1.2);
          }
        } else {
          ally.orbit += dt * (2.2 + phase * 0.32);
          const side = Math.sin(ally.orbit || 0) * 0.58;
          const preferred = 240 - phase * 18;
          const dir = d > preferred ? 1 : d < preferred - 60 ? -0.45 : 0.06;
          ally.x += ((dx / d) + (-dy / d) * side) * ally.speed * dir * dt;
          ally.y += ((dy / d) + (dx / d) * side) * ally.speed * dir * dt;
          ally.guard = phase >= 3 ? 0.28 : 0.2;

          if (ally.volleyCd <= 0 && d < (ally.fireRange || 540)) {
            const shots = phase === 1 ? 5 : phase === 2 ? 7 : 9;
            const spread = phase === 1 ? 0.72 : 0.95;
            const speed = Math.max(280, (ally.bulletSpeed || 640) * 0.62 + phase * 14);
            const aim = getPredictiveAimAngle(ally.x, ally.y, target.x, target.y, tvx, tvy, speed, {
              leadBias: 0.82 + phase * 0.04,
              maxLead: 1.05,
            });
            for (let i = 0; i < shots; i += 1) {
              const t = shots <= 1 ? 0.5 : i / (shots - 1);
              const a = aim + (t - 0.5) * spread;
              shootAllyBullet(ally, a, { speed, life: 2.2, dmgScale: 0.56 + phase * 0.08 });
            }
            const baseCd = phase === 1 ? 1.95 : phase === 2 ? 1.5 : 1.1;
            ally.volleyCd = Math.max(0.4, baseCd / Math.max(0.7, ally.fireRate || 1));
            if (Math.random() < 0.24) audio.play("helperShot");
          }

          if (ally.dashCd <= 0 && d < 470) {
            ally.windup = phase === 1 ? 0.44 : 0.34;
            const baseDashCd = phase === 1 ? 5.2 : phase === 2 ? 4.3 : 3.6;
            ally.dashCd = Math.max(1.2, baseDashCd / Math.max(0.75, ally.fireRate || 1));
          }
        }
      } else {
        ally.x += (dx / d) * ally.speed * dt;
        ally.y += (dy / d) * ally.speed * dt;
      }
    } else {
      ally.guard = 0;
      ally.windup = 0;
      ally.dashT = 0;
      const holdA = (ally.orbit || 0) + (ally.r * 0.11);
      const holdR = 46 + (ally.r || 12) * 1.4;
      const tx = p.x + Math.cos(holdA) * holdR;
      const ty = p.y + Math.sin(holdA) * holdR;
      const rdx = tx - ally.x;
      const rdy = ty - ally.y;
      const rd = Math.hypot(rdx, rdy);
      if (rd > 0.001) {
        const step = Math.min(rd, ally.speed * dt);
        ally.x += (rdx / rd) * step;
        ally.y += (rdy / rd) * step;
      }
    }

    ally.x = clamp(ally.x, 18, canvas.width - 18);
    ally.y = clamp(ally.y, 18, canvas.height - 18);
    ally.vx = (ally.x - prevX) * invDt;
    ally.vy = (ally.y - prevY) * invDt;
    alive.push(ally);
  }

  w.allies = alive;
}
function stepEnemies(w, dt) {
  const p = w.player;
  for (const e of w.enemies) {
    if (!Number.isFinite(e.maxHp) || e.maxHp <= 0) e.maxHp = Math.max(1, e.hp || 1);
    e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt);
    e.weakSpotFlash = Math.max(0, (e.weakSpotFlash || 0) - dt);
    e.allyDrainPulse = Math.max(0, (e.allyDrainPulse || 0) - dt);
    e.gooMinePulse = Math.max(0, (e.gooMinePulse || 0) - dt);

    if (e.gooMine && Number.isFinite(e.gooMine.timer)) {
      e.gooMine.timer = Math.max(0, e.gooMine.timer - dt);
      if (e.gooMine.timer <= 0) {
        detonateGooMineOnEnemy(w, e, e.gooMine);
        if (e.hp <= 0) continue;
        continue;
      }

      const allyTarget = findClosestEnemyToPoint(w, e.x, e.y, e);
      if (allyTarget) {
        const adx = allyTarget.x - e.x;
        const ady = allyTarget.y - e.y;
        const ad = Math.hypot(adx, ady) || 1;
        const desired = Math.atan2(ady, adx);
        if (!Number.isFinite(e.facing)) e.facing = desired;
        const deltaFacing = shortestAngleDelta(e.facing, desired);
        e.facing += clamp(deltaFacing, -9.5 * dt, 9.5 * dt);
        const moveSpeed = Math.max(40, e.gooMine.seekSpeed || e.speed || 90);
        e.x += (adx / ad) * moveSpeed * dt;
        e.y += (ady / ad) * moveSpeed * dt;
        e.x = clamp(e.x, e.r || 12, canvas.width - (e.r || 12));
        e.y = clamp(e.y, e.r || 12, canvas.height - (e.r || 12));
      }
      continue;
    }

    const target = getSummonedAggroTarget(w, e.x, e.y);
    const targetVelocity = getTargetVelocity(target);
    const targetIsPlayer = target === p;
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const desiredFacing = Math.atan2(dy, dx);
    if (!Number.isFinite(e.facing)) e.facing = desiredFacing;
    if (!(isSiphonOverlord(e.kind) && e.stunnedT > 0)) {
      const turnRate = getEnemyTurnRate(e.kind);
      const deltaFacing = shortestAngleDelta(e.facing, desiredFacing);
      e.facing += clamp(deltaFacing, -turnRate * dt, turnRate * dt);
    }

    if (e.kind === "dart") {
      const preferred = 250;
      const dir = d > preferred ? 1 : -0.75;
      e.x += (dx / d) * e.speed * dir * dt;
      e.y += (dy / d) * e.speed * dir * dt;
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = Math.max(0.8, 1.25 - w.difficulty * 0.04);
        const v = 330 + w.difficulty * 8;
        w.bullets.push({ x: e.x, y: e.y, vx: (dx / d) * v, vy: (dy / d) * v, life: 2.2, dmg: -(8 + w.threat * 0.55), enemy: true });
        audio.play("enemyShot");
      }
    } else if (e.kind === "leaper") {
      if (e.dashT > 0) {
        e.x += e.dashVx * dt;
        e.y += e.dashVy * dt;
        e.dashT -= dt;
        continue;
      }

      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          const leadX = target.x + targetVelocity.vx * 0.16;
          const leadY = target.y + targetVelocity.vy * 0.16;
          const ldx = leadX - e.x;
          const ldy = leadY - e.y;
          const ld = Math.hypot(ldx, ldy) || 1;
          const dashSpeed = (440 + w.threat * 4) * w.scale.enemySpeed;
          e.dashVx = (ldx / ld) * dashSpeed;
          e.dashVy = (ldy / ld) * dashSpeed;
          e.dashT = 0.26;
          splash(w, e.x, e.y, "#92ffbe", 8, 1.25);
        }
        continue;
      }

      e.zig += dt * 5.2;
      const side = Math.sin(e.zig) * 0.3;
      const moveBias = d > 170 ? 1 : d < 95 ? -0.45 : 0.1;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * moveBias * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * moveBias * dt;
      e.cd -= dt;
      if (e.cd <= 0 && d < 360) {
        e.windup = 0.36;
        e.cd = 1.55 + Math.random() * 0.22;
      }
    } else if (e.kind === "berserker") {
      e.zig += dt * 7;
      const side = Math.sin(e.zig) * 0.55;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * dt;
    } else if (e.kind === "siphon") {
      e.orbit += dt * 3.3;
      const side = Math.sin(e.orbit) * 0.45;
      const preferred = 185;
      const dir = d > preferred ? 1 : d < 132 ? -0.75 : 0.08;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * dir * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * dir * dt;

      e.drainCd = Math.max(0, (e.drainCd || 0) - dt);
      if (d < 230 && e.drainCd <= 0) {
        const rawDmg = (5 + w.threat * 0.22) * w.scale.enemyDamage;
        let applied = 0;
        if (targetIsPlayer) {
          applied = rawDmg * (1 - Math.min(0.62, p.armor));
          applyPlayerDamage(w, applied, { hitFlash: 0.12, splashColor: "#ff8df0", splashCount: 8, splashForce: 1.15, absorbSplash: false });
          if (!isPlayerInvulnerable(p)) audio.play("enemyShot");
        } else {
          applied = rawDmg * 0.9;
          target.hp -= applied;
          target.hitFlash = Math.max(target.hitFlash || 0, 0.12);
          splash(w, target.x, target.y, "#8fdfff", 6, 0.9);
          audio.play("enemyShot");
        }
        if (e.maxHp) {
          e.hp = Math.min(e.maxHp, e.hp + applied * 0.42);
          splash(w, e.x, e.y, "#b58cff", 6, 1.0);
        }
        e.drainCd = 0.45;
      }
    } else if (e.kind === "mini_boss") {
      const hpPct = e.hp / Math.max(1, e.maxHp || e.hp);
      const phase = hpPct > 0.66 ? 1 : hpPct > 0.33 ? 2 : 3;
      e.phase = phase;

      if (e.dashT > 0) {
        e.x += e.dashVx * dt;
        e.y += e.dashVy * dt;
        e.dashT -= dt;
        e.guard = 0.45;
        if (e.dashT <= 0) {
          const burstShots = phase >= 3 ? 14 : 10;
          const burstDmg = -(11 + phase * 2 + w.threat * 0.35);
          for (let i = 0; i < burstShots; i += 1) {
            const a = (i / burstShots) * Math.PI * 2;
            const v = 280 + phase * 25;
            w.bullets.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * v,
              vy: Math.sin(a) * v,
              life: 2.1,
              dmg: burstDmg,
              enemy: true,
            });
          }
          splash(w, e.x, e.y, "#ffb774", 18, 1.9);
          audio.play("mineBlast");
        }
        continue;
      }

      if (e.windup > 0) {
        e.windup -= dt;
        e.guard = 0.72;
        if (e.windup <= 0) {
          const leadX = target.x + targetVelocity.vx * 0.2;
          const leadY = target.y + targetVelocity.vy * 0.2;
          const ldx = leadX - e.x;
          const ldy = leadY - e.y;
          const ld = Math.hypot(ldx, ldy) || 1;
          const dashSpeed = (470 + w.threat * 3.8) * w.scale.enemySpeed;
          e.dashVx = (ldx / ld) * dashSpeed;
          e.dashVy = (ldy / ld) * dashSpeed;
          e.dashT = phase >= 3 ? 0.38 : 0.32;
          splash(w, e.x, e.y, "#ffd48a", 12, 1.5);
        }
        continue;
      }

      e.orbit += dt * (2.2 + phase * 0.32);
      const side = Math.sin(e.orbit) * 0.58;
      const preferred = 240 - phase * 18;
      const dir = d > preferred ? 1 : d < preferred - 60 ? -0.45 : 0.06;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * dir * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * dir * dt;
      e.guard = phase >= 3 ? 0.28 : 0.2;

      e.volleyCd = Math.max(0, (e.volleyCd || 0) - dt);
      if (e.volleyCd <= 0 && d < 540) {
        const aim = Math.atan2(dy, dx);
        const shots = phase === 1 ? 5 : phase === 2 ? 7 : 9;
        const spread = phase === 1 ? 0.72 : 0.95;
        const shotSpeed = 305 + phase * 35 + w.threat * 1.2;
        const dmg = -(10 + phase * 2 + w.threat * 0.42);
        for (let i = 0; i < shots; i += 1) {
          const t = shots <= 1 ? 0.5 : i / (shots - 1);
          const a = aim + (t - 0.5) * spread;
          w.bullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * shotSpeed,
            vy: Math.sin(a) * shotSpeed,
            life: 2.6,
            dmg,
            enemy: true,
          });
        }
        e.volleyCd = phase === 1 ? 1.95 : phase === 2 ? 1.5 : 1.1;
        audio.play("enemyShot");
      }

      e.dashCd = Math.max(0, (e.dashCd || 0) - dt);
      if (e.dashCd <= 0 && d < 470) {
        e.windup = phase === 1 ? 0.44 : 0.34;
        e.dashCd = phase === 1 ? 5.2 : phase === 2 ? 4.3 : 3.6;
      }

      e.summonCd = Math.max(0, (e.summonCd || 0) - dt);
      if (phase >= 2 && e.summonCd <= 0) {
        const summonKindA = phase >= 3 ? "splitter" : "leaper";
        const summonKindB = phase >= 3 ? "siphon" : "berserker";
        const options = [summonKindA, summonKindB].filter((k) => isEnemyEnabledForWorld(w, k));
        const summonCount = phase >= 3 ? 2 : 1;
        for (let i = 0; i < summonCount; i += 1) {
          const spawnKind = options[i % Math.max(1, options.length)] || "chaser";
          const a = Math.random() * Math.PI * 2;
          const sx = e.x + Math.cos(a) * (30 + Math.random() * 16);
          const sy = e.y + Math.sin(a) * (30 + Math.random() * 16);
          spawnEnemyByKind(w, spawnKind, sx, sy);
        }
        e.summonCd = phase >= 3 ? 7.6 : 10.0;
        splash(w, e.x, e.y, "#ff9a7d", 10, 1.35);
      }
    } else if (e.kind === "mini_boss_miner") {
      const hpPct = e.hp / Math.max(1, e.maxHp || e.hp);
      const phase = hpPct > 0.66 ? 1 : hpPct > 0.33 ? 2 : 3;
      e.phase = phase;

      e.orbit += dt * (1.85 + phase * 0.26);
      const side = Math.sin(e.orbit) * 0.52;
      const preferred = 255 - phase * 20;
      const dir = d > preferred ? 1 : d < preferred - 65 ? -0.38 : 0.05;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * dir * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * dir * dt;
      e.guard = phase >= 3 ? 0.34 : 0.25;

      e.mineCd = Math.max(0, (e.mineCd || 0) - dt);
      if (e.mineCd <= 0) {
        const mineCount = phase === 1 ? 1 : phase === 2 ? 2 : 3;
        for (let i = 0; i < mineCount; i += 1) {
          const offset = (i - (mineCount - 1) * 0.5) * 22;
          const angle = Math.atan2(dy, dx) + Math.PI * 0.5;
          const mx = e.x + Math.cos(angle) * offset;
          const my = e.y + Math.sin(angle) * offset;
          placeEnemyMine(w, mx, my, {
            radius: 66 + phase * 9,
            damage: 24 + phase * 4 + w.threat * 0.36,
            armed: Math.max(0.26, 0.78 - phase * 0.14),
            life: 10.2 + phase * 0.6,
            trigger: 34 + phase * 3,
          });
        }
        e.mineCd = phase === 1 ? 2.2 : phase === 2 ? 1.6 : 1.2;
        splash(w, e.x, e.y, "#ffad72", 9, 1.2);
      }

      e.volleyCd = Math.max(0, (e.volleyCd || 0) - dt);
      if (e.volleyCd <= 0 && d < 520) {
        const aim = Math.atan2(dy, dx);
        const shots = phase === 1 ? 3 : phase === 2 ? 5 : 7;
        const spread = phase === 1 ? 0.42 : 0.68;
        const speed = 280 + phase * 22;
        const dmg = -(8 + phase * 2 + w.threat * 0.3);
        for (let i = 0; i < shots; i += 1) {
          const t = shots <= 1 ? 0.5 : i / (shots - 1);
          const a = aim + (t - 0.5) * spread;
          w.bullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 2.2,
            dmg,
            enemy: true,
          });
        }
        e.volleyCd = phase === 1 ? 2.6 : phase === 2 ? 1.9 : 1.35;
        audio.play("enemyShot");
      }

      e.detonateCd = Math.max(0, (e.detonateCd || 0) - dt);
      if (e.detonateCd <= 0 && w.enemyMines.length > 0) {
        let detonated = 0;
        for (const m of w.enemyMines) {
          const md = Math.hypot(target.x - m.x, target.y - m.y);
          if (md < 260 || phase >= 3) {
            m.armed = Math.min(m.armed, 0.02);
            detonated += 1;
          }
          if (detonated >= (phase === 1 ? 2 : phase === 2 ? 3 : 5)) break;
        }
        e.detonateCd = phase === 1 ? 6.2 : phase === 2 ? 4.9 : 3.8;
        splash(w, e.x, e.y, "#ffbf7b", 11, 1.3);
      }
    } else if (e.kind === "siphon_overlord") {
      const hpPct = e.hp / Math.max(1, e.maxHp || e.hp);
      const phase = hpPct > 0.5 ? 1 : 2;
      e.phase = phase;

      if (e.stunnedT > 0) {
        e.stunnedT = Math.max(0, e.stunnedT - dt);
        e.guard = 0;
        if (e.stunnedT <= 0) splash(w, e.x, e.y, "#8ddfba", 12, 1.2);
        continue;
      }

      e.orbit += dt * (1.55 + phase * 0.18);
      const side = Math.sin(e.orbit) * 0.42;
      const preferred = phase === 1 ? 320 : 280;
      const dir = d > preferred ? 1 : d < preferred - 75 ? -0.24 : 0.05;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * dir * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * dir * dt;
      e.guard = phase === 1 ? 0.42 : 0.48;

      if (hpPct <= 0.5) {
        e.allyDrainCd = Math.max(0, (e.allyDrainCd || 0) - dt);
        if (e.allyDrainCd <= 0) {
          const donors = w.enemies
            .filter((other) => other !== e && other.hp > 4 && !isMiniBossKind(other.kind))
            .map((other) => ({ enemy: other, dist: Math.hypot(other.x - e.x, other.y - e.y) }))
            .filter((entry) => entry.dist < 260)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3);

          let drained = 0;
          e.drainLinks = [];
          for (const entry of donors) {
            const ally = entry.enemy;
            const amount = Math.min(ally.hp - 1, 16 + w.threat * 0.65);
            if (amount <= 0) continue;
            ally.hp -= amount;
            drained += amount;
            e.drainLinks.push({ x: ally.x, y: ally.y });
            splash(w, ally.x, ally.y, "#9b6dff", 5, 0.8);
          }

          if (drained > 0) {
            healEnemy(e, drained * 0.82);
            e.allyDrainPulse = 0.3;
            splash(w, e.x, e.y, "#9ef3bc", 11, 1.25);
          }
          e.allyDrainCd = phase === 1 ? 1.45 : 0.95;
        }
      } else {
        e.drainLinks = [];
      }

      e.missileCd = Math.max(0, (e.missileCd || 0) - dt);
      if (e.missileCd <= 0 && d < 760) {
        const missiles = phase === 1 ? 3 : 4;
        const spread = phase === 1 ? 0.62 : 0.82;
        const aim = Math.atan2(dy, dx);
        for (let i = 0; i < missiles; i += 1) {
          const t = missiles <= 1 ? 0.5 : i / (missiles - 1);
          const a = aim + (t - 0.5) * spread;
          const speed = 230 + phase * 18;
          w.bullets.push({
            x: e.x + Math.cos(a) * (e.r + 8),
            y: e.y + Math.sin(a) * (e.r + 8),
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 4.8,
            dmg: -(13 + phase * 2 + w.threat * 0.44),
            enemy: true,
            voidMissile: true,
            turn: phase === 1 ? 2.6 : 3.2,
            targetLead: phase === 1 ? 0.12 : 0.18,
            siphonSource: e,
            siphonRatio: 0.45,
          });
        }
        e.missileCd = phase === 1 ? 2.35 : 1.75;
        splash(w, e.x, e.y, "#a678ff", 9, 1.1);
        audio.play("enemyShot");
      }

      e.laserChargeT = Math.max(0, (e.laserChargeT || 0) - dt);
      e.laserCd = Math.max(0, (e.laserCd || 0) - dt);
      if (e.laserChargeT <= 0 && e.laserCd <= 0 && d < 760) {
        e.laserChargeT = phase === 1 ? 1.05 : 0.88;
        e.laserChargeTotal = e.laserChargeT;
        e.laserCd = phase === 1 ? 5.8 : 4.8;
        e.laserFired = false;
        splash(w, e.x, e.y, "#d79cff", 10, 1.2);
      }

      if (e.laserChargeT > 0) {
        e.guard = Math.max(e.guard, 0.68);
      } else if (!e.laserFired && e.laserCd > 0) {
        const aim = Math.atan2(dy, dx);
        const spread = phase === 1 ? 0.26 : 0.34;
        for (let i = 0; i < 3; i += 1) {
          const t = i / 2;
          const a = aim + (t - 0.5) * spread;
          const speed = 980;
          w.bullets.push({
            x: e.x + Math.cos(a) * (e.r + 10),
            y: e.y + Math.sin(a) * (e.r + 10),
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 1.3,
            dmg: -(20 + phase * 3 + w.threat * 0.54),
            enemy: true,
            laserShot: true,
            siphonSource: e,
            siphonRatio: 0.6,
          });
        }
        e.laserFired = true;
        splash(w, e.x, e.y, "#ffc3fb", 16, 1.6);
        audio.play("mineBlast");
      }

      e.summonCd = Math.max(0, (e.summonCd || 0) - dt);
      if (e.summonCd <= 0) {
        const summonCount = phase === 1 ? 2 : 3;
        for (let i = 0; i < summonCount; i += 1) {
          if (!isEnemyEnabledForWorld(w, "siphon")) break;
          const a = Math.random() * Math.PI * 2;
          spawnEnemyByKind(w, "siphon", e.x + Math.cos(a) * (40 + Math.random() * 22), e.y + Math.sin(a) * (40 + Math.random() * 22));
        }
        e.summonCd = phase === 1 ? 9.0 : 6.8;
        splash(w, e.x, e.y, "#bc8cff", 12, 1.4);
      }
    } else if (e.kind === "mega_cannon_boss") {
      const hpPct = e.hp / Math.max(1, e.maxHp || e.hp);
      const phase = hpPct > 0.55 ? 1 : 2;
      e.phase = phase;

      e.orbit += dt * (1.3 + phase * 0.25);
      const side = Math.sin(e.orbit) * 0.36;
      const preferred = phase === 1 ? 300 : 250;
      const dir = d > preferred ? 1 : d < preferred - 70 ? -0.28 : 0.04;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * dir * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * dir * dt;

      const desiredAim = Math.atan2(dy, dx);
      let deltaAim = desiredAim - (e.cannonAim ?? desiredAim);
      while (deltaAim > Math.PI) deltaAim -= Math.PI * 2;
      while (deltaAim < -Math.PI) deltaAim += Math.PI * 2;
      e.cannonAim = (e.cannonAim ?? desiredAim) + clamp(deltaAim, -(1.2 + phase * 0.4) * dt, (1.2 + phase * 0.4) * dt);

      e.shieldT = Math.max(0, (e.shieldT || 0) - dt);
      e.shieldCd = Math.max(0, (e.shieldCd || 0) - dt);
      if (e.shieldCd <= 0 && e.shieldT <= 0) {
        e.shieldT = phase === 1 ? 2.0 : 2.8;
        e.shieldCd = phase === 1 ? 8.9 : 6.7;
        splash(w, e.x, e.y, "#7cff95", 14, 1.7);
      }

      e.guard = e.shieldT > 0 ? 0.85 : (phase === 1 ? 0.34 : 0.4);
      if (e.shieldT > 0) continue;

      e.chargeT = Math.max(0, (e.chargeT || 0) - dt);
      e.chargeCd = Math.max(0, (e.chargeCd || 0) - dt);
      if (e.chargeT <= 0 && e.chargeCd <= 0 && d < 760) {
        e.chargeT = phase === 1 ? 1.2 : 1.0;
        e.chargeCd = phase === 1 ? 4.9 : 3.9;
        e.chargeFired = false;
        splash(w, e.x, e.y, "#ffcc8f", 10, 1.2);
      }

      if (e.chargeT <= 0 && e.chargeCd > 0 && !e.chargeFired) {
        const shotSpeed = 430 + phase * 60;
        const megaDmg = -(24 + phase * 5 + w.threat * 0.52);
        w.bullets.push({
          x: e.x + Math.cos(e.cannonAim) * (e.r + 12),
          y: e.y + Math.sin(e.cannonAim) * (e.r + 12),
          vx: Math.cos(e.cannonAim) * shotSpeed,
          vy: Math.sin(e.cannonAim) * shotSpeed,
          life: 4.4,
          dmg: megaDmg,
          enemy: true,
          megaShot: true,
          turn: phase === 1 ? 0.65 : 0.95,
          targetLead: phase === 1 ? 0.03 : 0.06,
        });
        e.chargeFired = true;
        splash(w, e.x, e.y, "#ffb275", 14, 1.8);
        audio.play("mineBlast");
      }
    } else if (isBossBottomLeft(e.kind)) {
      const hpPct = e.hp / Math.max(1, e.maxHp || e.hp);
      const phase = hpPct > 0.66 ? 1 : hpPct > 0.33 ? 2 : 3;
      e.phase = phase;

      e.orbit += dt * (1.2 + phase * 0.18);
      const side = Math.sin(e.orbit) * 0.32;
      const preferred = phase === 1 ? 335 : phase === 2 ? 292 : 255;
      const dir = d > preferred ? 1 : d < preferred - 70 ? -0.24 : 0.05;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * dir * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * dir * dt;
      e.minionOrbit = (e.minionOrbit || 0) + dt * (1.05 + phase * 0.2);
      e.shieldSpin = (e.shieldSpin || 0) + dt * (0.7 + phase * 0.1);
      e.patternPulse = Math.max(0, (e.patternPulse || 0) - dt);

      let activeShields = 0;
      for (const type of BOSS_BOTTOM_LEFT_SHIELD_TYPES) {
        e.shieldBreakFlash[type] = Math.max(0, (e.shieldBreakFlash[type] || 0) - dt);
        if (e.shieldActive[type]) activeShields += 1;
        const supportMinion = findBossBottomLeftMinion(w, e, type);
        if (!supportMinion) {
          e.shieldRestoreCd[type] = Number.POSITIVE_INFINITY;
          continue;
        }
        if (e.shieldActive[type]) {
          e.shieldRestoreCd[type] = 0;
          continue;
        }
        e.shieldRestoreCd[type] = Math.max(0, (e.shieldRestoreCd[type] || (3.4 - phase * 0.3)) - dt);
        if (e.shieldRestoreCd[type] <= 0) {
          e.shieldActive[type] = true;
          e.shieldRestoreCd[type] = 0;
          splash(w, e.x, e.y, type === "void" ? "#bc8fff" : type === "azure" ? "#85d3ff" : "#ffd487", 10, 1.2);
          activeShields += 1;
        }
      }

      e.guard = 0.24 + activeShields * 0.12;

      e.patternCd = Math.max(0, (e.patternCd || 2.4) - dt);
      if (e.patternCd <= 0) {
        spawnBossBottomLeftPattern(w, e, phase, target);
        e.patternPulse = Math.max(e.patternPulse || 0, 0.5);
        e.patternCd = phase === 1 ? 2.55 : phase === 2 ? 2.0 : 1.55;
        splash(w, e.x, e.y, "#ffbf85", 12, 1.25);
        audio.play("enemyShot");
      }

      e.volleyCd = Math.max(0, (e.volleyCd || (phase === 1 ? 1.7 : phase === 2 ? 1.35 : 1.05)) - dt);
      if (e.volleyCd <= 0 && d < 760) {
        const shots = phase === 1 ? 3 : phase === 2 ? 4 : 6;
        const spread = phase === 1 ? 0.36 : phase === 2 ? 0.52 : 0.7;
        const aim = Math.atan2(dy, dx);
        for (let i = 0; i < shots; i += 1) {
          const t = shots <= 1 ? 0.5 : i / (shots - 1);
          const a = aim + (t - 0.5) * spread;
          const speed = 255 + phase * 30;
          w.bullets.push({
            x: e.x + Math.cos(a) * (e.r + 12),
            y: e.y + Math.sin(a) * (e.r + 12),
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 4.8,
            dmg: -(13 + phase * 2 + w.threat * 0.42),
            enemy: true,
            voidMissile: phase >= 2,
            turn: phase === 1 ? 2.1 : (phase === 2 ? 2.7 : 3.3),
            targetLead: phase === 1 ? 0.05 : (phase === 2 ? 0.09 : 0.13),
          });
        }
        e.volleyCd = phase === 1 ? 1.6 : phase === 2 ? 1.2 : 0.88;
        splash(w, e.x, e.y, "#ffb885", 10, 1.15);
        audio.play("enemyShot");
      }

      e.slamChargeT = Math.max(0, (e.slamChargeT || 0) - dt);
      e.slamCd = Math.max(0, (e.slamCd || (phase === 1 ? 5.8 : phase === 2 ? 4.8 : 3.9)) - dt);
      if (e.slamChargeT <= 0 && e.slamCd <= 0) {
        e.slamChargeT = phase === 1 ? 0.95 : phase === 2 ? 0.78 : 0.62;
        e.slamChargeTotal = e.slamChargeT;
        e.slamFired = false;
        e.slamCd = phase === 1 ? 6.4 : phase === 2 ? 5.0 : 4.0;
        splash(w, e.x, e.y, "#ffc49c", 12, 1.45);
      }
      if ((e.slamChargeT || 0) > 0) {
        e.guard = Math.max(e.guard, 0.72);
      } else if (!e.slamFired) {
        e.slamFired = true;
        const count = phase === 1 ? 11 : phase === 2 ? 15 : 19;
        const ring = 78 + phase * 18;
        for (let i = 0; i < count; i += 1) {
          const a = (i / count) * Math.PI * 2;
          queueBossBottomLeftBurst(w, e, e.x + Math.cos(a) * ring, e.y + Math.sin(a) * ring, {
            delay: 0.1 + (i % 3) * 0.018,
            radius: 21 + phase * 2.2,
            damage: 20 + phase * 4 + w.threat * 0.44,
            color: "255,170,124",
          });
        }
        queueBossBottomLeftBurst(w, e, target.x, target.y, {
          delay: 0.34,
          radius: 26 + phase * 2.2,
          damage: 22 + phase * 5 + w.threat * 0.5,
          color: "255,128,116",
        });
        e.patternPulse = Math.max(e.patternPulse || 0, 0.62);
        splash(w, e.x, e.y, "#ffba8d", 18, 1.9);
        audio.play("mineBlast");
      }
    } else if (isBossBottomLeftMinion(e.kind)) {
      const boss = e.owner;
      if (!boss || boss.hp <= 0) {
        e.hp = 0;
        e.despawn = true;
        continue;
      }

      e.shieldBreakFlash = Math.max(0, (e.shieldBreakFlash || 0) - dt);
      const orbitR = boss.r + BOSS_BOTTOM_LEFT_MINION_ORBIT_OFFSET + Math.sin(w.t * 2.4 + e.orbitOffset * 2.2) * BOSS_BOTTOM_LEFT_MINION_ORBIT_SWAY;
      const a = (boss.minionOrbit || 0) + e.orbitOffset;
      const tx = boss.x + Math.cos(a) * orbitR;
      const ty = boss.y + Math.sin(a) * orbitR;
      e.x += (tx - e.x) * Math.min(1, dt * 7.4);
      e.y += (ty - e.y) * Math.min(1, dt * 7.4);
      e.guard = e.typedShieldUp ? 0.46 : 0.09;

      const minionPhase = boss.phase || 1;
      e.shotCd = Math.max(0, (e.shotCd || (minionPhase === 1 ? 1.9 : minionPhase === 2 ? 1.4 : 1.0)) - dt);
      if (e.shotCd <= 0) {
        const aim = Math.atan2(target.y - e.y, target.x - e.x);
        if (e.shieldType === "void") {
          const speed = 230 + minionPhase * 24;
          const leadAim = getPredictiveAimAngle(e.x, e.y, target.x, target.y, targetVelocity.vx, targetVelocity.vy, speed, {
            leadBias: 0.92 + minionPhase * 0.06,
            maxLead: 1.15,
          });
          w.bullets.push({
            x: e.x + Math.cos(leadAim) * (e.r + 6),
            y: e.y + Math.sin(leadAim) * (e.r + 6),
            vx: Math.cos(leadAim) * speed,
            vy: Math.sin(leadAim) * speed,
            life: 4.2,
            dmg: -(9 + minionPhase * 2 + w.threat * 0.32),
            enemy: true,
            voidMissile: true,
            smartAim: true,
          });
        } else if (e.shieldType === "azure") {
          const spread = minionPhase >= 3 ? 0.18 : 0.12;
          for (let i = 0; i < 2; i += 1) {
            const aShot = aim + (i === 0 ? -0.5 : 0.5) * spread;
            const speed = 860 + minionPhase * 40;
            w.bullets.push({
              x: e.x + Math.cos(aShot) * (e.r + 6),
              y: e.y + Math.sin(aShot) * (e.r + 6),
              vx: Math.cos(aShot) * speed,
              vy: Math.sin(aShot) * speed,
              life: 1.15,
              dmg: -(8 + minionPhase * 1.5 + w.threat * 0.28),
              enemy: true,
              laserShot: true,
            });
          }
        } else {
          const speed = 265 + minionPhase * 20;
          const leadAim = getPredictiveAimAngle(e.x, e.y, target.x, target.y, targetVelocity.vx, targetVelocity.vy, speed, {
            leadBias: 0.8 + minionPhase * 0.05,
            maxLead: 0.95,
          });
          w.bullets.push({
            x: e.x + Math.cos(leadAim) * (e.r + 6),
            y: e.y + Math.sin(leadAim) * (e.r + 6),
            vx: Math.cos(leadAim) * speed,
            vy: Math.sin(leadAim) * speed,
            life: 3.9,
            dmg: -(11 + minionPhase * 2.2 + w.threat * 0.34),
            enemy: true,
            megaShot: true,
            smartAim: true,
          });
        }
        e.shotCd = minionPhase === 1 ? 1.8 + Math.random() * 0.25 : minionPhase === 2 ? 1.35 + Math.random() * 0.2 : 0.9 + Math.random() * 0.16;
        splash(w, e.x, e.y, e.shieldType === "void" ? "#bc8eff" : e.shieldType === "azure" ? "#8fd8ff" : "#ffc885", 7, 0.9);
      }
    } else if (e.kind === "splitter") {
      e.zig += dt * 4.8;
      const side = Math.sin(e.zig) * 0.24;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * dt;
    } else if (e.kind === "shardling") {
      e.zig += dt * 8.2;
      const side = Math.sin(e.zig) * 0.38;
      e.x += ((dx / d) + (-dy / d) * side) * e.speed * dt;
      e.y += ((dy / d) + (dx / d) * side) * e.speed * dt;
    } else if (e.kind === "tank") {
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
    } else if (e.kind === "phantom") {
      e.phase += dt;
      const blink = (Math.sin(e.phase * 6) + 1) * 0.5;
      const speedMod = 0.65 + blink * 0.65;
      e.x += (dx / d) * e.speed * speedMod * dt;
      e.y += (dy / d) * e.speed * speedMod * dt;
    } else {
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
    }
  }
}

function getEnemyContactBase(kind) {
  if (isBossBottomLeft(kind)) return 74;
  if (isBossBottomLeftMinion(kind)) return 22;
  if (kind === "siphon_overlord") return 78;
  if (kind === "mega_cannon_boss") return 66;
  if (kind === "mini_boss_miner") return 50;
  if (kind === "mini_boss") return 54;
  if (kind === "tank") return 42;
  if (kind === "splitter") return 30;
  if (kind === "leaper") return 29;
  if (kind === "berserker") return 28;
  if (kind === "brute") return 24;
  if (kind === "siphon") return 20;
  if (kind === "shardling") return 15;
  return 16;
}

function getEnemyEssenceBase(kind) {
  if (isBossBottomLeft(kind)) return 118;
  if (isBossBottomLeftMinion(kind)) return 24;
  if (kind === "siphon_overlord") return 132;
  if (kind === "mega_cannon_boss") return 88;
  if (kind === "mini_boss_miner") return 42;
  if (kind === "mini_boss") return 44;
  if (kind === "tank") return 19;
  if (kind === "splitter") return 18;
  if (kind === "phantom") return 16;
  if (kind === "siphon") return 15;
  if (kind === "leaper") return 13;
  if (kind === "brute") return 12;
  if (kind === "berserker") return 11;
  if (kind === "dart") return 9;
  if (kind === "shardling") return 5;
  return 7;
}

function resolveCombat(w) {
  const p = w.player;

  for (const b of w.bullets) {
    if (!b.enemy) {
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        const prevX = Number.isFinite(b.px) ? b.px : b.x;
        const prevY = Number.isFinite(b.py) ? b.py : b.y;
        const hitCore = doesSegmentHitCircle(prevX, prevY, b.x, b.y, e.x, e.y, e.r + 4);
        const shieldPathHit = isBossBottomLeft(e.kind)
          ? getBossBottomLeftShieldOnSegment(e, prevX, prevY, b.x, b.y, w.t, 16)
          : null;
        const hitShieldNode = !!shieldPathHit;
        if (!hitCore && !hitShieldNode) continue;

        let impactX = shieldPathHit?.node?.x ?? b.x;
        let impactY = shieldPathHit?.node?.y ?? b.y;
        if (isBossBottomLeft(e.kind) && hitCore && !hitShieldNode && hasBossBottomLeftActiveShield(e)) {
          const nearestShieldNode = getNearestBossBottomLeftShieldNode(e, w.t, b.x, b.y);
          if (nearestShieldNode) {
            impactX = nearestShieldNode.x;
            impactY = nearestShieldNode.y;
          }
        }

        markEnemyHit(e);
        const affinity = b.affinity || (b.helper ? "azure" : null);
        if (applyTypedShieldBlock(w, e, impactX, impactY, affinity)) {
          b.life = 0;
          break;
        }
        if (e.kind === "mega_cannon_boss" && e.shieldT > 0) {
          const heal = Math.max(4, b.dmg * 0.6);
          e.hp = Math.min(e.maxHp || e.hp, e.hp + heal);
          b.life = 0;
          splash(w, e.x, e.y, "#8effa6", 7, 1.05);
          break;
        }

        let dealt = b.dmg;
        if (isMiniBossKind(e.kind)) {
          const guard = Math.max(0, Math.min(0.9, e.guard || 0));
          dealt *= (1 - guard);
        }
        let weakSpotHit = false;
        if (isSiphonOverlord(e.kind) && e.stunnedT > 0 && isSiphonWeakSpotHit(e, b.x, b.y)) {
          dealt *= 10;
          weakSpotHit = true;
          e.weakSpotFlash = Math.max(e.weakSpotFlash || 0, 0.28);
          splash(w, e.x, e.y, "#ffdff8", 14, 1.7);
        }
        e.hp -= dealt;
        registerSiphonOverlordHit(w, e, dealt);
        e.lastHitKind = b.helper ? "helper" : "essence";
        b.life = 0;
        splash(w, e.x, e.y, weakSpotHit ? "#ffcfff" : b.crit ? "#fff1a4" : "#ffd37d", weakSpotHit ? 15 : (b.crit ? 12 : 6), weakSpotHit ? 2.0 : 1.6);
        if (b.crit) audio.play("crit");
        else audio.play("hit");
        break;
      }
    } else if (b.enemy) {
      if (Array.isArray(w.allies) && w.allies.length > 0) {
        const hitR = b.megaShot ? 18 : b.voidMissile ? 14 : b.laserShot ? 13 : 12;
        for (const ally of w.allies) {
          if (ally.hp <= 0) continue;
          if (Math.hypot(b.x - ally.x, b.y - ally.y) > hitR + (ally.r || 10) * 0.45) continue;
          const dmg = Math.abs(b.dmg) * 0.9;
          ally.hp -= dmg;
          ally.hitFlash = Math.max(ally.hitFlash || 0, 0.14);
          b.life = 0;
          splash(w, ally.x, ally.y, "#8fdfff", 6, 0.85);
          if (b.siphonSource && b.siphonRatio > 0) {
            healEnemy(b.siphonSource, dmg * b.siphonRatio);
            splash(w, b.siphonSource.x, b.siphonSource.y, "#9af2ba", 6, 0.9);
          }
          break;
        }
      }

      if (b.life > 0 && Math.hypot(b.x - p.x, b.y - p.y) <= (b.megaShot ? 22 : b.voidMissile ? 17 : b.laserShot ? 16 : 15)) {
        if ((p.aegisT || 0) > 0 || p.dashIFrames <= 0) {
          const dmg = Math.abs(b.dmg) * w.scale.enemyDamage * (1 - Math.min(0.62, p.armor));
          const hitLanded = applyPlayerDamage(w, dmg, { hitFlash: 0.14, playSound: true, absorbSplash: false });
          b.life = 0;
          splash(w, p.x, p.y, b.voidMissile ? "#bf8fff" : b.laserShot ? "#ff9ae9" : b.megaShot ? "#ffb87f" : "#ff8b8b", b.megaShot ? 18 : b.voidMissile ? 13 : b.laserShot ? 12 : 10, b.megaShot ? 2.9 : 2.2);
          if (hitLanded && b.siphonSource && b.siphonRatio > 0) {
            healEnemy(b.siphonSource, dmg * b.siphonRatio);
            splash(w, b.siphonSource.x, b.siphonSource.y, "#9af2ba", 6, 0.9);
          }
        }
      }
    }
  }

  for (const e of w.enemies) {
    if (Math.hypot(e.x - p.x, e.y - p.y) <= e.r + 13 && ((p.aegisT || 0) > 0 || p.dashIFrames <= 0)) {
      const baseContact = getEnemyContactBase(e.kind);
      const dmg = baseContact * 0.016 * w.scale.enemyDamage * (1 - Math.min(0.62, p.armor));
      const hitLanded = applyPlayerDamage(w, dmg, { hitFlash: 0.1, absorbSplash: false });
      if (hitLanded && isSiphonOverlord(e.kind)) {
        healEnemy(e, dmg * 0.68);
        splash(w, e.x, e.y, "#8be0b0", 5, 0.9);
      }
    }

    if (Array.isArray(w.allies) && w.allies.length > 0) {
      const baseContact = getEnemyContactBase(e.kind);
      for (const ally of w.allies) {
        if (ally.hp <= 0) continue;
        if (Math.hypot(e.x - ally.x, e.y - ally.y) > e.r + Math.max(8, (ally.r || 10) * 0.9)) continue;
        ally.hp -= baseContact * 0.013;
        ally.hitFlash = Math.max(ally.hitFlash || 0, 0.09);
      }
    }
  }

  for (const r of w.rockets) {
    let exploded = false;
    for (const e of w.enemies) {
      const prevX = Number.isFinite(r.px) ? r.px : r.x;
      const prevY = Number.isFinite(r.py) ? r.py : r.y;
      const hitCore = doesSegmentHitCircle(prevX, prevY, r.x, r.y, e.x, e.y, e.r + 7);
      const hitShieldNode = isBossBottomLeft(e.kind)
        ? !!getBossBottomLeftShieldOnSegment(e, prevX, prevY, r.x, r.y, w.t, 18)
        : false;
      if (hitCore || hitShieldNode) {
        exploded = true;
        break;
      }
    }
    if (!exploded) continue;

    for (const e of w.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - r.x, e.y - r.y);
      if (d <= 95) {
        let impactX = r.x;
        let impactY = r.y;
        if (isBossBottomLeft(e.kind) && hasBossBottomLeftActiveShield(e) && d <= e.r + 12) {
          const nearestShieldNode = getNearestBossBottomLeftShieldNode(e, w.t, r.x, r.y);
          if (nearestShieldNode) {
            impactX = nearestShieldNode.x;
            impactY = nearestShieldNode.y;
          }
        }
        markEnemyHit(e);
        if (applyTypedShieldBlock(w, e, impactX, impactY, r.affinity || "azure")) {
          e.lastHitKind = "rocket";
          continue;
        }
        if (e.kind === "mega_cannon_boss" && e.shieldT > 0) {
          const heal = Math.max(5, r.dmg * 0.48);
          e.hp = Math.min(e.maxHp || e.hp, e.hp + heal);
          splash(w, e.x, e.y, "#8effa6", 8, 1.1);
          continue;
        }
        const falloff = 1 - d / 95;
        let dealt = r.dmg * (0.4 + falloff * 0.6);
        if (isMiniBossKind(e.kind)) {
          const guard = Math.max(0, Math.min(0.9, e.guard || 0));
          dealt *= (1 - guard);
        }
        e.hp -= dealt;
        registerSiphonOverlordHit(w, e, dealt);
        e.lastHitKind = "rocket";
      }
    }

    splash(w, r.x, r.y, "#ffd58a", 16, 2.9);
    audio.play("mineBlast");
    r.life = -1;
  }

  const alive = [];
  const spawned = [];
  for (const e of w.enemies) {
    if (e.hp > 0) {
      alive.push(e);
      continue;
    }

    if (e.despawn) {
      continue;
    }

    w.kills += 1;
    const baseXp = getEnemyEssenceBase(e.kind);
    const essence = Math.floor(baseXp * w.scale.reward);
    const bonusEssence = Math.max(1, Math.floor(essence * 0.45));
    const specialKind = SPECIAL_CURRENCY_BY_KILL[e.lastHitKind];
    const specialAmount = Math.max(1, Math.floor(essence * 0.35));

    if (e.kind === "splitter") {
      const shardlingsEnabled = isEnemyEnabledForWorld(w, "shardling");
      if (shardlingsEnabled) {
        const shardHp = Math.max(10, Math.floor((e.maxHp || 44) * 0.24));
        const shardSpeed = (168 + w.threat * 2.4) * w.scale.enemySpeed;
        for (let i = 0; i < 2; i += 1) {
          const a = Math.random() * Math.PI * 2;
          spawned.push({
            kind: "shardling",
            x: e.x + Math.cos(a) * 11,
            y: e.y + Math.sin(a) * 11,
            hp: shardHp,
            speed: shardSpeed,
            r: 8,
            cd: 0,
            zig: Math.random() * 6.28,
          });
        }
      }
      splash(w, e.x, e.y, "#ffb4f7", 12, 1.75);
    }

    if (e.kind === "mini_boss") {
      const bonusOrb = Math.max(8, Math.floor(essence * 0.75));
      w.drops.push({ x: e.x - 9, y: e.y + 3, t: 2.8, kind: "essence", amount: bonusOrb, color: DROP_COLORS.essence });
      splash(w, e.x, e.y, "#ff9b6b", 30, 3.3);
    }
    if (e.kind === "mini_boss_miner") {
      const amberBonus = Math.max(6, Math.floor(essence * 0.6));
      w.drops.push({ x: e.x + 9, y: e.y - 2, t: 2.8, kind: "amber", amount: amberBonus, color: DROP_COLORS.amber });
      splash(w, e.x, e.y, "#ffad62", 32, 3.4);
      w.enemyMines = w.enemyMines.filter((m) => Math.hypot(m.x - e.x, m.y - e.y) > 280);
    }
    if (e.kind === "mega_cannon_boss") {
      const bonusOrb = Math.max(14, Math.floor(essence * 0.9));
      w.drops.push({ x: e.x, y: e.y, t: 3.2, kind: "essence", amount: bonusOrb, color: DROP_COLORS.essence });
      w.drops.push({ x: e.x - 12, y: e.y + 6, t: 3.2, kind: "azure", amount: Math.max(4, Math.floor(essence * 0.3)), color: DROP_COLORS.azure });
      splash(w, e.x, e.y, "#ffbd89", 40, 3.9);
    }
    if (e.kind === "siphon_overlord") {
      const bonusOrb = Math.max(22, Math.floor(essence * 1.1));
      w.drops.push({ x: e.x, y: e.y, t: 3.4, kind: "essence", amount: bonusOrb, color: DROP_COLORS.essence });
      w.drops.push({ x: e.x - 14, y: e.y - 2, t: 3.4, kind: "void", amount: Math.max(6, Math.floor(essence * 0.34)), color: DROP_COLORS.void });
      w.drops.push({ x: e.x + 14, y: e.y + 4, t: 3.4, kind: "azure", amount: Math.max(5, Math.floor(essence * 0.24)), color: DROP_COLORS.azure });
      splash(w, e.x, e.y, "#c7a0ff", 54, 4.3);
    }
    if (isBossBottomLeft(e.kind)) {
      const bonusOrb = Math.max(20, Math.floor(essence * 1.05));
      w.drops.push({ x: e.x, y: e.y, t: 3.6, kind: "essence", amount: bonusOrb, color: DROP_COLORS.essence });
      w.drops.push({ x: e.x - 16, y: e.y + 5, t: 3.6, kind: "void", amount: Math.max(6, Math.floor(essence * 0.28)), color: DROP_COLORS.void });
      w.drops.push({ x: e.x + 14, y: e.y + 7, t: 3.6, kind: "azure", amount: Math.max(6, Math.floor(essence * 0.27)), color: DROP_COLORS.azure });
      w.drops.push({ x: e.x + 4, y: e.y - 12, t: 3.6, kind: "amber", amount: Math.max(6, Math.floor(essence * 0.27)), color: DROP_COLORS.amber });
      splash(w, e.x, e.y, "#ffbf84", 56, 4.4);
      w.bossBursts = w.bossBursts.filter((burst) => burst.owner !== e);
      for (const minion of w.enemies) {
        if (isBossBottomLeftMinion(minion.kind) && minion.owner === e) {
          minion.hp = 0;
          minion.despawn = true;
        }
      }
    }
    if (isBossBottomLeftMinion(e.kind)) {
      const rewardKind = e.shieldType === "void" ? "void" : e.shieldType === "azure" ? "azure" : "amber";
      w.drops.push({ x: e.x, y: e.y, t: 2.3, kind: rewardKind, amount: Math.max(1, Math.floor(essence * 0.2)), color: DROP_COLORS[rewardKind] });
      splash(w, e.x, e.y, rewardKind === "void" ? "#ba93ff" : rewardKind === "azure" ? "#88d5ff" : "#ffd184", 18, 2.0);
    }

    w.runEssence += essence;
    w.drops.push({ x: e.x, y: e.y, t: 2.2, kind: "essence", amount: bonusEssence, color: DROP_COLORS.essence });
    if (specialKind) {
      w.drops.push({ x: e.x + 7, y: e.y - 6, t: 2.2, kind: specialKind, amount: specialAmount, color: DROP_COLORS[specialKind] });
    }
    splash(w, e.x, e.y, "#90f59a", 14, 2.9);
    audio.play("kill");
  }
  w.enemies = alive.concat(spawned);
  w.rockets = w.rockets.filter((r) => r.life > 0);
}

function collectDrops(w, dt) {
  const p = w.player;
  w.drops = w.drops.filter((d) => {
    d.t -= dt;
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 26) {
      p.hp = Math.min(p.maxHp, p.hp + 1.1);
      if (d.kind === "essence") w.runEssence += d.amount || 0;
      else if (d.kind === "void") w.runVoid += d.amount || 0;
      else if (d.kind === "azure") w.runAzure += d.amount || 0;
      else if (d.kind === "amber") w.runAmber += d.amount || 0;
      splash(w, d.x, d.y, d.color || "#b8ff93", 5, 1.5);
      audio.play("pickup");
      return false;
    }
    if (dist < p.magnet) {
      d.x += (dx / (dist || 1)) * 260 * dt;
      d.y += (dy / (dist || 1)) * 260 * dt;
    }
    return d.t > 0;
  });
}

function stepParticles(w, dt) {
  for (const p of w.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  w.particles = w.particles.filter((p) => p.life > 0);
}

function getEnemyTelegraphState(e, worldTime) {
  let intensity = 0;
  let color = "255,170,112";
  const setTelegraph = (value, rgb) => {
    if (value > intensity) {
      intensity = value;
      color = rgb;
    }
  };

  if (e.windup > 0) {
    const total = e.kind === "mini_boss" ? 0.44 : 0.36;
    const p = 1 - clamp(e.windup / Math.max(0.01, total), 0, 1);
    setTelegraph(0.46 + p * 0.54, e.kind === "mini_boss" ? "255,162,104" : "140,255,196");
  }
  if (e.kind === "mega_cannon_boss" && e.chargeT > 0) {
    const total = e.phase === 1 ? 1.2 : 1.0;
    const p = 1 - clamp(e.chargeT / Math.max(0.01, total), 0, 1);
    setTelegraph(0.52 + p * 0.48, "255,188,118");
  }
  if (e.kind === "mega_cannon_boss" && e.shieldT > 0) {
    const total = e.phase === 1 ? 2.0 : 2.8;
    const p = 1 - clamp(e.shieldT / Math.max(0.01, total), 0, 1);
    setTelegraph(0.62 + p * 0.3, "126,255,156");
  }
  if (e.kind === "dart" && (e.cd || 0) < 0.24) {
    const p = 1 - clamp((e.cd || 0) / 0.24, 0, 1);
    setTelegraph(0.22 + p * 0.5, "255,134,108");
  }
  if (e.kind === "siphon" && (e.drainCd || 0) < 0.14) {
    const p = 1 - clamp((e.drainCd || 0) / 0.14, 0, 1);
    setTelegraph(0.24 + p * 0.46, "203,138,255");
  }
  if (e.kind === "mini_boss" && (e.volleyCd || 0) < 0.2) {
    const p = 1 - clamp((e.volleyCd || 0) / 0.2, 0, 1);
    setTelegraph(0.24 + p * 0.36, "255,150,114");
  }
  if (e.kind === "mini_boss_miner" && (e.detonateCd || 0) < 0.5) {
    const p = 1 - clamp((e.detonateCd || 0) / 0.5, 0, 1);
    setTelegraph(0.28 + p * 0.52, "255,187,106");
  }
  if (isSiphonOverlord(e.kind)) {
    if (e.stunnedT > 0) {
      const p = clamp(e.stunnedT / 3.6, 0, 1);
      setTelegraph(0.55 + (1 - p) * 0.38, "156,220,255");
    }
    if (e.laserChargeT > 0) {
      const total = e.laserChargeTotal || 1.0;
      const p = 1 - clamp(e.laserChargeT / Math.max(0.01, total), 0, 1);
      setTelegraph(0.58 + p * 0.4, "241,167,255");
    }
    if ((e.missileCd || 0) < 0.22) {
      const p = 1 - clamp((e.missileCd || 0) / 0.22, 0, 1);
      setTelegraph(0.36 + p * 0.42, "173,132,255");
    }
    if ((e.allyDrainPulse || 0) > 0.01) {
      setTelegraph(0.65, "138,255,180");
    }
  }
  if (isBossBottomLeft(e.kind)) {
    if ((e.patternPulse || 0) > 0.01) {
      const p = clamp((e.patternPulse || 0) / 0.42, 0, 1);
      setTelegraph(0.52 + p * 0.42, "255,188,118");
    }
    if ((e.slamChargeT || 0) > 0) {
      const total = e.slamChargeTotal || 0.8;
      const p = 1 - clamp((e.slamChargeT || 0) / Math.max(0.01, total), 0, 1);
      setTelegraph(0.62 + p * 0.34, "255,148,118");
    }
    if ((e.volleyCd || 0) < 0.24) {
      const p = 1 - clamp((e.volleyCd || 0) / 0.24, 0, 1);
      setTelegraph(0.36 + p * 0.32, "255,188,122");
    }
    for (const type of BOSS_BOTTOM_LEFT_SHIELD_TYPES) {
      if (!e.shieldActive?.[type]) {
        const cd = e.shieldRestoreCd?.[type];
        if (Number.isFinite(cd) && cd < 1.2) {
          const p = 1 - clamp(cd / 1.2, 0, 1);
          setTelegraph(0.38 + p * 0.36, BOSS_BOTTOM_LEFT_SHIELD_COLORS[type]);
        }
      }
    }
  }
  if (isBossBottomLeftMinion(e.kind) && e.typedShieldUp) {
    setTelegraph(0.34 + (Math.sin(worldTime * 5.4 + (e.orbitOffset || 0) * 5) + 1) * 0.14, BOSS_BOTTOM_LEFT_SHIELD_COLORS[e.shieldType] || "220,220,220");
  }
  if (isBossBottomLeftMinion(e.kind) && (e.shotCd || 0) < 0.22) {
    const p = 1 - clamp((e.shotCd || 0) / 0.22, 0, 1);
    setTelegraph(0.28 + p * 0.35, BOSS_BOTTOM_LEFT_SHIELD_COLORS[e.shieldType] || "220,220,220");
  }

  const clampedIntensity = clamp(intensity, 0, 1);
  const pulse = (Math.sin(worldTime * (10 + clampedIntensity * 10) + e.r * 0.37 + (e.orbit || e.zig || 0)) + 1) * 0.5;
  return { intensity: clampedIntensity, color, pulse };
}

function drawEnemySprite(e, worldTime, telegraph) {
  const skin = ENEMY_SPRITES[e.kind];
  if (!skin || !skin.img || !skin.img.complete || skin.img.naturalWidth <= 0) return false;

  const seed = (e.orbit || e.zig || e.phase || 0) + e.r * 0.17;
  const telegraphIntensity = clamp(telegraph?.intensity || 0, 0, 1);
  const hitFlash = clamp((e.hitFlash || 0) / 0.16, 0, 1);
  const pulse = 1 + Math.sin(worldTime * (skin.pulseRate || 2.8) + seed) * (skin.pulseAmp || 0.04);
  const bob = Math.sin(worldTime * (skin.bobRate || 2.4) + seed * 1.3) * (skin.bobAmp || 0.45) * (e.r / 20);
  const size = e.r * (skin.scale || 2.25) * pulse * (1 + telegraphIntensity * 0.08 + (telegraph?.pulse || 0) * telegraphIntensity * 0.04);
  let drawW = size;
  let drawH = size;
  if (Number.isFinite(skin.aspect) && skin.aspect > 0) {
    if (skin.aspect >= 1) drawW = size * skin.aspect;
    else drawH = size / skin.aspect;
  }
  const shake = Math.sin(worldTime * (12 + telegraphIntensity * 18) + seed * 2.1) * telegraphIntensity * 0.08;
  const rot = (e.facing || 0) + (skin.facingOffset || 0) + shake;

  ctx.save();
  ctx.translate(e.x, e.y + bob);
  ctx.rotate(rot);
  ctx.globalAlpha = (skin.alpha ?? 0.98) * (1 + hitFlash * 0.05);
  if (telegraphIntensity > 0.02) {
    ctx.shadowColor = `rgba(${telegraph?.color || skin.glowRgb || "255,160,110"},${0.24 + telegraphIntensity * 0.4})`;
    ctx.shadowBlur = 7 + telegraphIntensity * 14;
  }
  ctx.drawImage(skin.img, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
  ctx.restore();

  const glowPulse = (Math.sin(worldTime * (skin.glowRate || 6.5) + seed) + 1) * 0.5;
  const glowRgb = telegraphIntensity > 0.08 ? (telegraph?.color || skin.glowRgb || "255,142,94") : (skin.glowRgb || "255,142,94");
  const glowAlpha = 0.16 + glowPulse * 0.22 + telegraphIntensity * 0.35 + hitFlash * 0.34;
  ctx.strokeStyle = `rgba(${glowRgb},${glowAlpha})`;
  ctx.lineWidth = 1.4 + telegraphIntensity * 1.1;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r + 3 + glowPulse * 2.2 + telegraphIntensity * 3.4, 0, Math.PI * 2);
  ctx.stroke();
  if (hitFlash > 0.02) {
    ctx.fillStyle = `rgba(255,247,213,${hitFlash * 0.22})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r + 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 1;
  return true;
}

function drawBossBottomLeftShields(e, worldTime) {
  if (!isBossBottomLeft(e.kind)) return;

  for (const type of BOSS_BOTTOM_LEFT_SHIELD_TYPES) {
    const img = BOSS_BOTTOM_LEFT_SHIELD_IMAGES[type];
    if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) continue;

    const active = !!(e.shieldActive && e.shieldActive[type]);
    if (!active) continue;

    const node = getBossBottomLeftShieldNode(e, type, worldTime);
    if (!node) continue;

    const drawW = img.naturalWidth * node.scale;
    const drawH = img.naturalHeight * node.scale;

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(node.spin);
    ctx.globalAlpha = 0.72 + node.pulse * 0.2 + node.glow * 0.16;
    ctx.drawImage(img, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
    ctx.restore();

    ctx.strokeStyle = `rgba(${BOSS_BOTTOM_LEFT_SHIELD_COLORS[type]},${0.3 + node.pulse * 0.26 + node.glow * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.hitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawBossBottomLeftMinionShield(e, worldTime) {
  if (!isBossBottomLeftMinion(e.kind) || !e.typedShieldUp) return;
  const type = e.shieldType;
  const img = BOSS_BOTTOM_LEFT_SHIELD_IMAGES[type];
  if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;

  const pulse = (Math.sin(worldTime * 7.2 + (e.orbitOffset || 0) * 4) + 1) * 0.5;
  const scale = 0.062 + pulse * 0.006;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const spin = worldTime * 1.5 + (e.orbitOffset || 0) * 0.6;

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(spin);
  ctx.globalAlpha = 0.66 + pulse * 0.18;
  ctx.drawImage(img, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
  ctx.restore();

  ctx.strokeStyle = `rgba(${BOSS_BOTTOM_LEFT_SHIELD_COLORS[type]},${0.34 + pulse * 0.26})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r + 7 + pulse * 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawBossBursts(w) {
  for (const burst of w.bossBursts) {
    if (!burst.fired) {
      const t = clamp(1 - burst.t / Math.max(0.01, burst.total), 0, 1);
      const pulse = (Math.sin(w.t * (8 + t * 6) + burst.x * 0.01 + burst.y * 0.02) + 1) * 0.5;
      const alpha = 0.18 + t * 0.46 + pulse * 0.12;
      const radius = burst.r + pulse * (3 + t * 2);
      ctx.fillStyle = `rgba(${burst.color || "255,182,120"},${0.08 + t * 0.16})`;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${burst.color || "255,182,120"},${alpha})`;
      ctx.lineWidth = 1.6 + t * 1.1;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const p = clamp((burst.linger || 0) / 0.18, 0, 1);
      ctx.fillStyle = `rgba(255,167,122,${0.24 + p * 0.36})`;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, burst.r * (0.72 + (1 - p) * 0.34), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.lineWidth = 1;
}

function drawGame() {
  const w = state.world;
  if (!w) return;

  const grad = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.5, 60, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.84);
  grad.addColorStop(0, "#1a2a36");
  grad.addColorStop(1, "#0a1016");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawBossBursts(w);
  const p = w.player;
  const warpComboActive = (p.warpComboT || 0) > 0;

  for (let i = 0; i < w.mines.length; i += 1) {
    const a = w.mines[i];
    if (!a?.chainEnabled || a.expired || (a.chargesLeft || 0) <= 0) continue;
    for (let j = i + 1; j < w.mines.length; j += 1) {
      const b = w.mines[j];
      if (!b?.chainEnabled || b.expired || (b.chargesLeft || 0) <= 0) continue;
      if (!canMinesChainTogether(a, b)) continue;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const linkRange = Math.min(a.chainRange || 0, b.chainRange || 0);
      if (linkRange <= 0 || dist > linkRange) continue;
      const key = getMineLinkKey(a, b);
      const cooldownT = w.mineLinkCooldowns?.[key] || 0;
      if (cooldownT > 0) continue;
      const pulse = (Math.sin(w.t * 5.8 + i * 0.5 + j * 0.7) + 1) * 0.5;
      const alpha = 0.18 + pulse * 0.16;
      const linkRgb = getMineChainAffinityType(a) === "void" ? "187,141,255" : "255,184,94";
      ctx.strokeStyle = `rgba(${linkRgb},${alpha})`;
      ctx.lineWidth = Math.max(1, Math.min(a.chainWidth || 10, b.chainWidth || 10) * 0.14);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 1;

  for (const m of w.mines) {
    const pulse = (Math.sin(m.pulse || 0) + 1) * 0.5;
    const coreR = Math.max(5, m.visualRadius || m.r * 0.22);
    const armedPct = clamp(1 - (m.armed || 0) / Math.max(0.01, m.rearm || 0.9), 0, 1);
    const isVoidMine = m.voidInfused || m.affinity === "void";
    const edgeColor = isVoidMine ? "204,150,255" : (m.gooEnabled ? "150,255,155" : "255,186,116");
    const fillColor = isVoidMine ? "222,184,255" : (m.gooEnabled ? "168,255,176" : "255,206,138");
    const coreColor = isVoidMine ? "#c897ff" : (m.gooEnabled ? "#a9ff9e" : "#ffcc8b");
    const tickOn = isVoidMine ? "rgba(235,208,255,0.95)" : (m.gooEnabled ? "rgba(198,255,201,0.95)" : "rgba(255,228,170,0.95)");
    const tickOff = isVoidMine ? "rgba(94,66,126,0.52)" : (m.gooEnabled ? "rgba(64,109,66,0.5)" : "rgba(116,91,58,0.5)");

    ctx.strokeStyle = `rgba(${edgeColor},${0.55 + pulse * 0.2})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, coreR + armedPct * 2.8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(${fillColor},${0.62 + pulse * 0.24})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, coreR * 0.72, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = coreColor;
    ctx.fillRect(m.x - 3, m.y - 3, 6, 6);

    const maxCharges = Math.max(1, Math.floor(m.maxCharges || 1));
    const chargesLeft = clamp(Math.floor(m.chargesLeft || 0), 0, maxCharges);
    const tickR = coreR + 8;
    for (let i = 0; i < maxCharges; i += 1) {
      const a = (i / maxCharges) * Math.PI * 2 - Math.PI * 0.5;
      const tx = m.x + Math.cos(a) * tickR;
      const ty = m.y + Math.sin(a) * tickR;
      ctx.fillStyle = i < chargesLeft ? tickOn : tickOff;
      ctx.beginPath();
      ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (warpComboActive && !m.expired && (m.chargesLeft || 0) > 0) {
      const comboPulse = (Math.sin(w.t * 8.8 + (m.id || 0) * 0.3) + 1) * 0.5;
      ctx.strokeStyle = `rgba(184,139,255,${0.35 + comboPulse * 0.3})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(m.x, m.y, coreR + 11 + comboPulse * 2.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  ctx.lineWidth = 1;

  for (const m of w.enemyMines) {
    const arm = Math.max(0, m.armed || 0);
    const t = Math.max(0, Math.min(1, 1 - arm / 0.9));
    const pulse = (Math.sin(m.pulse || 0) + 1) * 0.5;

    ctx.fillStyle = `rgba(255,120,72,${0.4 + pulse * 0.28})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,160,102,${0.5 + t * 0.38})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * 0.2 + t * (m.r * 0.1), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,96,68,${0.2 + t * 0.45})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.trigger, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  for (const r of w.rockets) {
    ctx.fillStyle = r.energy ? "#9df7ff" : "#ffd78a";
    ctx.beginPath();
    ctx.arc(r.x, r.y, 5.2, 0, Math.PI * 2);
    ctx.fill();
    if (r.energy) {
      ctx.strokeStyle = "rgba(164,246,255,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 8.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  for (const d of w.drops) {
    ctx.fillStyle = d.color || DROP_COLORS.essence;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const b of w.bullets) {
    if (!b.enemy && !b.helper && PLAYER_ROCKET_SHEET.complete && PLAYER_ROCKET_SHEET.naturalWidth > 0 && PLAYER_ROCKET_SHEET.naturalHeight > 0) {
      const pulse = (Math.sin(w.t * 13.5 + (b.pulseSeed || 0)) + 1) * 0.5;
      const speed = Math.hypot(b.vx, b.vy) || 1;
      const nx = b.vx / speed;
      const ny = b.vy / speed;
      const trailX = b.x - nx * 6.5;
      const trailY = b.y - ny * 6.5;
      const glowRgb = b.affinity ? getAffinityGlowRgb(b.affinity) : (b.crit ? "255,236,196" : getAffinityGlowRgb(null));

      ctx.fillStyle = `rgba(${glowRgb},${0.08 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(trailX, trailY, b.crit ? 7.2 : 5.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${glowRgb},${0.11 + pulse * 0.15})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.crit ? 7.8 : 6.3, 0, Math.PI * 2);
      ctx.fill();

      const frameCount = Math.max(1, Math.floor(PLAYER_ROCKET_SHEET.naturalWidth / PLAYER_ROCKET_FRAME_SIZE));
      const frame = Math.floor((w.t * 24 + (b.pulseSeed || 0) * 5) % frameCount);
      const spriteSize = b.crit ? 18 : 16;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI * 0.5);
      ctx.drawImage(
        PLAYER_ROCKET_SHEET,
        frame * PLAYER_ROCKET_FRAME_SIZE,
        0,
        PLAYER_ROCKET_FRAME_SIZE,
        PLAYER_ROCKET_FRAME_SIZE,
        -spriteSize * 0.5,
        -spriteSize * 0.5,
        spriteSize,
        spriteSize,
      );
      ctx.restore();
      continue;
    }

    let bulletColor = "#7dd3fc";
    if (b.voidMissile) bulletColor = "#a678ff";
    else if (b.laserShot) bulletColor = "#ffb9f8";
    else if (b.megaShot) bulletColor = "#ffc58f";
    else if (b.enemy) bulletColor = "#ff8b8b";
    else if (b.affinity === "void") bulletColor = "#c99eff";
    else if (b.affinity === "amber") bulletColor = "#ffd08d";
    else if (b.affinity === "azure") bulletColor = "#8ee8ff";
    else if (b.crit) bulletColor = "#fff3a8";
    else if (b.helper) bulletColor = "#9ec9ff";
    ctx.fillStyle = bulletColor;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.megaShot ? 6.5 : b.voidMissile ? 4.8 : b.laserShot ? 4.4 : b.enemy ? 3.5 : 3, 0, Math.PI * 2);
    ctx.fill();
    if (b.megaShot) {
      ctx.strokeStyle = "rgba(255, 173, 111, 0.65)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 9.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.voidMissile) {
      ctx.strokeStyle = "rgba(193, 148, 255, 0.58)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 7.1, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.laserShot) {
      ctx.strokeStyle = "rgba(255, 198, 252, 0.62)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 1;

  for (const e of w.enemies) {
    const telegraph = getEnemyTelegraphState(e, w.t);
    const drewSprite = drawEnemySprite(e, w.t, telegraph);
    if (!drewSprite) {
      ctx.fillStyle = e.kind === "mini_boss_miner"
        ? "#ffb160"
        : e.kind === "mega_cannon_boss"
          ? "#ffcb84"
        : e.kind === "siphon_overlord"
          ? "#b48cff"
        : e.kind === "boss_bottom_left"
          ? "#ffbf89"
        : e.kind === "boss_bottom_left_minion_void"
          ? "#be8cff"
        : e.kind === "boss_bottom_left_minion_azure"
          ? "#89d5ff"
        : e.kind === "boss_bottom_left_minion_amber"
          ? "#ffd07e"
        : e.kind === "tank"
        ? "#ffcc74"
        : e.kind === "phantom"
          ? "#7f9bff"
          : e.kind === "brute"
            ? "#ffb36a"
            : e.kind === "dart"
              ? "#c58bff"
              : e.kind === "berserker"
                ? "#ff7f94"
                : e.kind === "leaper"
                  ? "#8bffc5"
                  : e.kind === "splitter"
                    ? "#ff9cd7"
                    : e.kind === "shardling"
                      ? "#ffd5fb"
                      : e.kind === "siphon"
                        ? "#b388ff"
                        : "#ff6f6f";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();

      const nose = e.facing || 0;
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(nose) * (e.r + 6), e.y + Math.sin(nose) * (e.r + 6));
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    if (isBossBottomLeft(e.kind)) {
      drawBossBottomLeftShields(e, w.t);
    }
    if (isBossBottomLeftMinion(e.kind)) {
      drawBossBottomLeftMinionShield(e, w.t);
    }

    if (telegraph.intensity > 0.05) {
      const outer = e.r + 7 + telegraph.pulse * (3 + telegraph.intensity * 5);
      const burstSpin = w.t * (1.8 + telegraph.intensity * 2.4);
      ctx.strokeStyle = `rgba(${telegraph.color},${0.22 + telegraph.intensity * 0.48})`;
      ctx.lineWidth = 1.1 + telegraph.intensity * 1.6;
      ctx.beginPath();
      ctx.arc(e.x, e.y, outer, 0, Math.PI * 2);
      ctx.stroke();

      const spikes = 3 + Math.floor(telegraph.intensity * 4);
      for (let i = 0; i < spikes; i += 1) {
        const a = burstSpin + (i / spikes) * Math.PI * 2;
        const inner = outer + 1.5;
        const tip = inner + 4 + telegraph.intensity * 7;
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(a) * inner, e.y + Math.sin(a) * inner);
        ctx.lineTo(e.x + Math.cos(a) * tip, e.y + Math.sin(a) * tip);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    if (e.gooMine && (e.gooMine.timer || 0) > 0) {
      const total = Math.max(0.8, e.gooMine.total || 4.2);
      const pct = clamp((e.gooMine.timer || 0) / total, 0, 1);
      const pulse = (Math.sin(w.t * 10.5 + (e.x + e.y) * 0.02) + 1) * 0.5;
      ctx.strokeStyle = `rgba(162,255,148,${0.4 + pulse * 0.28})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 7 + pulse * 2, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * pct);
      ctx.stroke();
      ctx.fillStyle = `rgba(170,255,168,${0.28 + pulse * 0.22})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.max(2.5, (e.r || 10) * 0.24), 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
    }

    if (e.showHp) {
      const hpPct = clamp(e.hp / Math.max(1, e.maxHp || e.hp), 0, 1);
      const barW = Math.max(24, e.r * 2.2);
      const barH = isMiniBossKind(e.kind) ? 6 : (isBossBottomLeftMinion(e.kind) ? 5 : 4);
      const barX = e.x - barW * 0.5;
      const barY = e.y - e.r - 15;

      ctx.fillStyle = "rgba(12,18,27,0.78)";
      ctx.fillRect(barX - 1.5, barY - 1.5, barW + 3, barH + 3);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpPct > 0.6 ? "#84ef9a" : hpPct > 0.32 ? "#ffd17a" : "#ff8989";
      ctx.fillRect(barX, barY, barW * hpPct, barH);

      if (isSiphonOverlord(e.kind)) {
        const stunPct = e.stunnedT > 0 ? 1 : clamp((e.staggerMeter || 0) / Math.max(1, e.staggerNeed || 84), 0, 1);
        const stunY = barY + barH + 3;
        ctx.fillStyle = "rgba(90,120,170,0.2)";
        ctx.fillRect(barX, stunY, barW, 3);
        ctx.fillStyle = e.stunnedT > 0 ? "#8edcff" : "#8ba8ff";
        ctx.fillRect(barX, stunY, barW * stunPct, 3);
      }
    }

    if (isMiniBossKind(e.kind)) {
      const guard = Math.max(0, Math.min(0.85, e.guard || 0));
      const phase = e.phase || 1;

      if (e.kind === "mini_boss" && e.windup > 0) {
        const t = Math.max(0, Math.min(1, e.windup / 0.45));
        ctx.strokeStyle = `rgba(255,171,114,${0.35 + t * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 14 + (1 - t) * 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.kind === "mini_boss_miner") {
        const mineRing = 17 + ((Math.sin(w.t * 4.2 + e.orbit) + 1) * 0.5) * 6;
        ctx.strokeStyle = "rgba(255,176,96,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + mineRing, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.kind === "mega_cannon_boss") {
        const cannonLen = e.r + 20;
        const ax = e.x + Math.cos(e.cannonAim || 0) * cannonLen;
        const ay = e.y + Math.sin(e.cannonAim || 0) * cannonLen;
        ctx.strokeStyle = "rgba(255, 210, 150, 0.85)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(ax, ay);
        ctx.stroke();

        if (e.shieldT > 0) {
          const total = phase === 1 ? 2.0 : 2.8;
          const chargeUp = 1 - clamp(e.shieldT / total, 0, 1);
          const pulse = (Math.sin(w.t * 9.2) + 1) * 0.5;
          const spin = w.t * (2.4 + pulse * 0.8);

          ctx.fillStyle = `rgba(112,255,144,${0.12 + pulse * 0.08 + chargeUp * 0.08})`;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 11 + pulse * 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(122,255,156,${0.5 + pulse * 0.3})`;
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 16 + pulse * 4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(186,255,200,${0.22 + chargeUp * 0.35})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 25 + pulse * 8, 0, Math.PI * 2);
          ctx.stroke();

          const rays = 6;
          ctx.strokeStyle = `rgba(154,255,176,${0.24 + pulse * 0.28})`;
          ctx.lineWidth = 1.3;
          for (let i = 0; i < rays; i += 1) {
            const a = spin + (i / rays) * Math.PI * 2;
            const inner = e.r + 12 + pulse * 3;
            const outer = e.r + 22 + pulse * 8 + chargeUp * 6;
            ctx.beginPath();
            ctx.moveTo(e.x + Math.cos(a) * inner, e.y + Math.sin(a) * inner);
            ctx.lineTo(e.x + Math.cos(a) * outer, e.y + Math.sin(a) * outer);
            ctx.stroke();
          }
        }

        if (e.chargeT > 0) {
          const total = phase === 1 ? 1.2 : 1.0;
          const t = Math.max(0, Math.min(1, e.chargeT / total));
          ctx.strokeStyle = `rgba(255,178,117,${0.35 + (1 - t) * 0.5})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 22 - t * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (e.kind === "siphon_overlord") {
        const back = (e.facing || 0) + Math.PI;
        const weakSpotR = e.stunnedT > 0 ? 8.5 : 5.4;
        const weakSpotX = e.x + Math.cos(back) * (e.r + 5);
        const weakSpotY = e.y + Math.sin(back) * (e.r + 5);
        const weakAlpha = e.stunnedT > 0 ? 0.82 : 0.35;
        const weakPulse = (Math.sin(w.t * (e.stunnedT > 0 ? 12 : 5.2)) + 1) * 0.5;
        const weakFlash = clamp((e.weakSpotFlash || 0) / 0.28, 0, 1);

        ctx.fillStyle = `rgba(255,182,246,${weakAlpha + weakPulse * 0.14 + weakFlash * 0.24})`;
        ctx.beginPath();
        ctx.arc(weakSpotX, weakSpotY, weakSpotR + weakFlash * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,227,255,${0.34 + weakPulse * 0.35 + weakFlash * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(weakSpotX, weakSpotY, weakSpotR + 2.4 + weakPulse * 2.2, 0, Math.PI * 2);
        ctx.stroke();

        if (e.stunnedT > 0) {
          const stunPulse = (Math.sin(w.t * 9.4) + 1) * 0.5;
          ctx.strokeStyle = `rgba(160,228,255,${0.3 + stunPulse * 0.36})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 13 + stunPulse * 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        if ((e.allyDrainPulse || 0) > 0.01 && Array.isArray(e.drainLinks)) {
          const linkA = clamp((e.allyDrainPulse || 0) / 0.3, 0, 1);
          ctx.strokeStyle = `rgba(145,255,189,${0.16 + linkA * 0.52})`;
          ctx.lineWidth = 2;
          for (const link of e.drainLinks) {
            if (!link) continue;
            ctx.beginPath();
            ctx.moveTo(link.x, link.y);
            ctx.lineTo(e.x, e.y);
            ctx.stroke();
          }
          ctx.lineWidth = 1;
        }

        if (e.laserChargeT > 0) {
          const total = e.laserChargeTotal || 1.0;
          const t = 1 - clamp(e.laserChargeT / Math.max(0.01, total), 0, 1);
          const baseAim = e.facing || 0;
          const spread = e.phase === 1 ? 0.26 : 0.34;
          const len = 220 + t * 620;
          ctx.strokeStyle = `rgba(246,182,255,${0.22 + t * 0.46})`;
          ctx.lineWidth = 1.5 + t * 1.4;
          for (let i = 0; i < 3; i += 1) {
            const m = i / 2 - 0.5;
            const a = baseAim + m * spread;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + Math.cos(a) * len, e.y + Math.sin(a) * len);
            ctx.stroke();
          }
          ctx.lineWidth = 1;
        }
      }

      if (isBossBottomLeft(e.kind)) {
        if ((e.patternPulse || 0) > 0.01) {
          const p = clamp((e.patternPulse || 0) / 0.42, 0, 1);
          ctx.strokeStyle = `rgba(255,196,128,${0.26 + p * 0.36})`;
          ctx.lineWidth = 2.1;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 20 + p * 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (guard > 0.01) {
        ctx.strokeStyle = `rgba(255,225,186,${0.14 + guard * 0.45})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    if (e.kind === "leaper" && e.windup > 0) {
      const t = Math.max(0, Math.min(1, e.windup / 0.36));
      ctx.strokeStyle = `rgba(139,255,197,${0.28 + t * 0.42})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 8 + (1 - t) * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (e.kind === "siphon") {
      const distToPlayer = Math.hypot(e.x - p.x, e.y - p.y);
      if (distToPlayer < 240) {
        const glow = 1 - distToPlayer / 240;
        ctx.strokeStyle = `rgba(204,146,255,${0.2 + glow * 0.55})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }

    if (warpComboActive) {
      const comboPulse = (Math.sin(w.t * 8.5 + e.x * 0.02 + e.y * 0.015) + 1) * 0.5;
      ctx.strokeStyle = `rgba(192,145,255,${0.26 + comboPulse * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 9 + comboPulse * 2.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  if (Array.isArray(w.allies) && w.allies.length > 0) {
    for (const ally of w.allies) {
      if (ally.hp <= 0) continue;
      const pulse = (Math.sin(w.t * (6.5 + (ally.r || 10) * 0.02) + ally.x * 0.02 + ally.y * 0.01) + 1) * 0.5;
      const drewSprite = drawEnemySprite(ally, w.t, { intensity: 0.2 + pulse * 0.18, color: "120,255,224", pulse });
      if (!drewSprite) {
        ctx.fillStyle = "rgba(146,235,255,0.9)";
        ctx.beginPath();
        ctx.arc(ally.x, ally.y, ally.r || 10, 0, Math.PI * 2);
        ctx.fill();
      }

      const ringR = (ally.r || 10) + 8 + pulse * 2.4;
      ctx.strokeStyle = `rgba(122,255,224,${0.48 + pulse * 0.34})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ally.x, ally.y, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(179,255,241,${0.6 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(ally.x, ally.y - ringR - 6);
      ctx.lineTo(ally.x - 3.6, ally.y - ringR - 1.2);
      ctx.lineTo(ally.x + 3.6, ally.y - ringR - 1.2);
      ctx.closePath();
      ctx.fill();

      const hpPct = clamp(ally.hp / Math.max(1, ally.maxHp || ally.hp), 0, 1);
      const barW = Math.max(18, (ally.r || 10) * 1.8);
      const barX = ally.x - barW * 0.5;
      const barY = ally.y + (ally.r || 10) + 10;
      ctx.fillStyle = "rgba(12,24,30,0.72)";
      ctx.fillRect(barX - 1, barY - 1, barW + 2, 5);
      ctx.fillStyle = "rgba(86,140,162,0.65)";
      ctx.fillRect(barX, barY, barW, 3);
      ctx.fillStyle = "#90fff0";
      ctx.fillRect(barX, barY, barW * hpPct, 3);
    }
    ctx.lineWidth = 1;
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = p.hitFlash > 0 ? "#ffd0d0" : "#dff4ff";
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#64c6ff";
  ctx.fillRect(8, -3, 12, 6);
  ctx.restore();

  if ((p.aegisT || 0) > 0) {
    const shieldPct = clamp(p.aegisT / Math.max(0.001, p.aegisDuration || 1), 0, 1);
    const predictedRockets = getAegisRocketCount(p.aegisStoredDamage || 0, p.aegisLevel || 0);
    const flash = clamp((p.aegisFlash || 0) / 0.2, 0, 1);

    // Primary blue shield aura while Aegis is active.
    const pulse = (Math.sin(w.t * 8.4) + 1) * 0.5;
    ctx.fillStyle = `rgba(96,192,255,${0.1 + pulse * 0.07 + flash * 0.1})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 19.5 + pulse * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(132,220,255,${0.5 + pulse * 0.24 + flash * 0.2})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 21.5 + pulse * 1.8, 0, Math.PI * 2);
    ctx.stroke();

    // One sparkle marker per rocket that would be released right now.
    for (let i = 0; i < predictedRockets; i += 1) {
      const baseA = (i / predictedRockets) * Math.PI * 2 + w.t * (0.8 + (i % 3) * 0.22);
      const orbit = 29 + Math.sin(w.t * 2.2 + i * 0.37) * 2.5;
      const sx = p.x + Math.cos(baseA) * orbit;
      const sy = p.y + Math.sin(baseA) * orbit;
      const twinkle = (Math.sin(w.t * 11 + i * 1.9) + 1) * 0.5;
      const sparkleR = 1.2 + twinkle * 1.2;

      ctx.fillStyle = `rgba(178,244,255,${0.36 + twinkle * 0.44})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sparkleR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(130,218,255,${0.24 + twinkle * 0.34})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 2.1, sy);
      ctx.lineTo(sx + 2.1, sy);
      ctx.moveTo(sx, sy - 2.1);
      ctx.lineTo(sx, sy + 2.1);
      ctx.stroke();
    }

    // Shield duration bar above player head (blue only, no numeric timer).
    const barW = 52;
    const barH = 6;
    const barX = p.x - barW * 0.5;
    const barY = p.y - 38;
    ctx.fillStyle = "rgba(12,24,38,0.82)";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = "rgba(50,86,120,0.8)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "rgba(108,213,255,0.94)";
    ctx.fillRect(barX, barY, barW * shieldPct, barH);

    if (flash > 0.02) {
      ctx.fillStyle = `rgba(165,240,255,${0.14 + flash * 0.25})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 + flash * 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (p.dashIFrames > 0) {
    ctx.strokeStyle = "rgba(125,211,252,0.9)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const pt of w.particles) {
    ctx.fillStyle = `rgba(${pt.r},${pt.g},${pt.b},${Math.max(0, pt.life / pt.ttl)})`;
    ctx.fillRect(pt.x, pt.y, 3, 3);
  }
}

function drawGrid() {
  const step = Math.max(56, Math.floor(Math.min(canvas.width, canvas.height) / 12));
  ctx.strokeStyle = "rgba(125, 211, 252, 0.08)";
  ctx.lineWidth = 1;

  for (let x = step * 0.5; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = step * 0.5; y < canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function splash(w, x, y, color, count, force) {
  const burstColor = color ?? "#ffffff";
  const burstCount = count ?? 8;
  const burstForce = force ?? 2;
  const [r, g, b] = hexToRgb(burstColor);
  for (let i = 0; i < burstCount; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = (45 + Math.random() * 220) * burstForce;
    const ttl = 0.15 + Math.random() * 0.35;
    w.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: ttl,
      ttl,
      r,
      g,
      b,
    });
  }
}

function endRun(survived) {
  if (!state.world || !state.player) return;

  const w = state.world;
  const bankedEssence = Math.floor(w.runEssence);
  const bankedVoid = Math.floor(w.runVoid);
  const bankedAzure = Math.floor(w.runAzure);
  const bankedAmber = Math.floor(w.runAmber);

  if (survived) {
    state.player.xpBank += bankedEssence;
    state.player.voidBank = (state.player.voidBank || 0) + bankedVoid;
    state.player.azureBank = (state.player.azureBank || 0) + bankedAzure;
    state.player.amberBank = (state.player.amberBank || 0) + bankedAmber;
    state.player.totalKills += w.kills;
    state.player.wins += 1;
    state.player.bestTime = Math.max(state.player.bestTime, RUN_DURATION);
    savePlayer(state.player);

    ui.resultTitle.textContent = "Survived";
    ui.resultSummary.textContent = `You held out for ${RUN_DURATION}s at D${w.difficulty}. Banked +${bankedEssence} Essence, +${bankedVoid} Void, +${bankedAzure} Azure, +${bankedAmber} Amber.`;
    audio.play("win");
  } else {
    state.player = clonePlayer(state.playerAtRunStart || state.player);
    savePlayer(state.player);

    const elapsed = RUN_DURATION - w.timer;
    ui.resultTitle.textContent = "Defeated";
    ui.resultSummary.textContent = `Run failed after ${Math.floor(elapsed)}s. ${bankedEssence} Essence, ${bankedVoid} Void, ${bankedAzure} Azure, and ${bankedAmber} Amber were lost.`;
    audio.play("lose");
  }

  state.world = null;
  state.input.firing = false;
  setScreen("result");
}

function clampPlayer(p) {
  p.x = clamp(p.x, 14, canvas.width - 14);
  p.y = clamp(p.y, 14, canvas.height - 14);
}

function updateHud(w) {
  const p = w.player;
  ui.timer.textContent = w.isTestMode ? "TEST \u221e" : formatTime(w.timer);
  const hpNow = Math.max(0, Math.floor(p.hp));
  const hpMax = Math.max(1, Math.floor(p.maxHp));
  const hpPct = clamp(p.hp / Math.max(1, p.maxHp), 0, 1);
  if (ui.healthText) ui.healthText.textContent = `${hpNow}/${hpMax}`;
  else ui.health.textContent = `HP ${hpNow}/${hpMax}`;
  if (ui.healthFill) ui.healthFill.style.width = `${Math.round(hpPct * 100)}%`;

  const voidSnapshot = getAbilityCooldownSnapshot("void", p);
  if ((p.warpComboT || 0) > 0) {
    voidSnapshot.status = "ready";
    voidSnapshot.fillPct = clamp((p.warpComboT || 0) / Math.max(0.001, p.warpComboDuration || 1), 0, 1);
    voidSnapshot.text = `Combo ${p.warpComboT.toFixed(1)}s`;
  }
  setCooldownHud(ui.cdVoid, ui.cdVoidFill, ui.cdVoidText, voidSnapshot);
  const azureSnapshot = getAbilityCooldownSnapshot("azure", p);
  if ((p.aegisT || 0) > 0) {
    azureSnapshot.status = "cooldown";
    azureSnapshot.fillPct = clamp((p.aegisT || 0) / Math.max(0.001, p.aegisDuration || 1), 0, 1);
    azureSnapshot.text = "Active";
  }
  setCooldownHud(ui.cdAzure, ui.cdAzureFill, ui.cdAzureText, azureSnapshot);
  setCooldownHud(ui.cdAmber, ui.cdAmberFill, ui.cdAmberText, getAbilityCooldownSnapshot("amber", p));
  setCooldownHud(ui.cdCannon, ui.cdCannonFill, ui.cdCannonText, getCannonCooldownSnapshot(p));

  if (ui.runEssenceValue) ui.runEssenceValue.textContent = String(Math.floor(w.runEssence));
  else ui.runEssence.textContent = `Run Essence ${Math.floor(w.runEssence)}`;
  if (ui.runVoidValue) ui.runVoidValue.textContent = String(Math.floor(w.runVoid));
  else ui.runVoid.textContent = `Run Void ${Math.floor(w.runVoid)}`;
  if (ui.runAzureValue) ui.runAzureValue.textContent = String(Math.floor(w.runAzure));
  else ui.runAzure.textContent = `Run Azure ${Math.floor(w.runAzure)}`;
  if (ui.runAmberValue) ui.runAmberValue.textContent = String(Math.floor(w.runAmber));
  else ui.runAmber.textContent = `Run Amber ${Math.floor(w.runAmber)}`;
  ui.kills.textContent = `Kills ${w.kills}`;
  ui.wave.textContent = `Threat ${w.threat}`;
  ui.hudDifficulty.textContent = w.isTestMode ? `TEST D${w.difficulty}` : `D${w.difficulty}`;
}

function createAudioSystem() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctxAudio = null;
  let unlocked = false;

  function ensure() {
    if (!Ctx) return null;
    if (!ctxAudio) ctxAudio = new Ctx();
    return ctxAudio;
  }

  function tone(freq, duration, type, gain) {
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function play(name) {
    if (!unlocked) return;
    if (name === "shoot") tone(420, 0.05, "square", 0.03);
    else if (name === "hit") tone(250, 0.04, "triangle", 0.04);
    else if (name === "crit") tone(760, 0.08, "triangle", 0.05);
    else if (name === "kill") tone(180, 0.09, "sawtooth", 0.045);
    else if (name === "pickup") tone(920, 0.05, "sine", 0.03);
    else if (name === "warp") tone(510, 0.12, "triangle", 0.04);
    else if (name === "minePlace") tone(150, 0.05, "square", 0.04);
    else if (name === "mineBlast") tone(90, 0.14, "sawtooth", 0.06);
    else if (name === "rocketLaunch") tone(260, 0.08, "square", 0.05);
    else if (name === "helperSpawn") tone(560, 0.08, "sine", 0.04);
    else if (name === "helperShot") tone(680, 0.04, "triangle", 0.025);
    else if (name === "enemyShot") tone(140, 0.05, "square", 0.03);
    else if (name === "playerHit") tone(96, 0.1, "sawtooth", 0.055);
    else if (name === "upgrade") tone(740, 0.06, "triangle", 0.04);
    else if (name === "win") {
      tone(520, 0.09, "sine", 0.05);
      setTimeout(() => tone(690, 0.12, "sine", 0.05), 80);
    } else if (name === "lose") tone(112, 0.2, "triangle", 0.05);
  }

  function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    unlocked = true;
  }

  return { play, unlock };
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return [255, 255, 255];
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return [255, 255, 255];
  return [
    Number.parseInt(raw.slice(0, 2), 16) || 255,
    Number.parseInt(raw.slice(2, 4), 16) || 255,
    Number.parseInt(raw.slice(4, 6), 16) || 255,
  ];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function clampInt(value, min, max) {
  const n = Math.floor(Number(value) || 0);
  return clamp(n, min, max);
}








