
import { clonePlayer, getOrCreatePlayer, savePlayer } from "./storage.js";

const RUN_DURATION = 60;
const MAX_UPGRADE_LEVEL = 50;
const SHIP_MOUNT_RADIUS = 16;

const MAX_VISIBLE_SLOTS = 15;

const SLOT_LAYOUT = [
  { key: 0, name: "Front", x: 50, y: 14 },
  { key: 1, name: "Front-R", x: 62, y: 18 },
  { key: 2, name: "Right-Up", x: 74, y: 30 },
  { key: 3, name: "Right", x: 80, y: 45 },
  { key: 4, name: "Right-Low", x: 76, y: 62 },
  { key: 5, name: "Back-R", x: 66, y: 74 },
  { key: 6, name: "Back", x: 50, y: 80 },
  { key: 7, name: "Back-L", x: 34, y: 74 },
  { key: 8, name: "Left-Low", x: 24, y: 62 },
  { key: 9, name: "Left", x: 20, y: 45 },
  { key: 10, name: "Left-Up", x: 26, y: 30 },
  { key: 11, name: "Front-L", x: 38, y: 18 },
  { key: 12, name: "Nose-R", x: 58, y: 12 },
  { key: 13, name: "Nose-L", x: 42, y: 12 },
  { key: 14, name: "Core", x: 50, y: 50 },
];

const ITEM_CATALOG = {
  cannon: {
    name: "Cannon",
    kind: "weapon",
    trigger: "fire",
    buyBase: 80,
    buyScale: 1.35,
    upgradeBase: 34,
    fireRate: 4.8,
    damage: 12,
    spread: 0,
    projectiles: 1,
    speed: 760,
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
    speed: 730,
    color: "#ffd37d",
    desc: "Three-shot directional burst.",
  },
  warp: {
    name: "Warp Module",
    kind: "ability",
    trigger: "special",
    buyBase: 140,
    buyScale: 1.42,
    upgradeBase: 55,
    color: "#58c5ff",
    desc: "Space key short-range teleport.",
  },
  mine: {
    name: "Mine Layer",
    kind: "ability",
    trigger: "special",
    buyBase: 130,
    buyScale: 1.4,
    upgradeBase: 53,
    color: "#ffbf7a",
    desc: "Space key deployable mine.",
  },
  rocket: {
    name: "Rocket Pod",
    kind: "ability",
    trigger: "secondary",
    buyBase: 175,
    buyScale: 1.46,
    upgradeBase: 62,
    color: "#ffd58a",
    desc: "C key tracking rocket.",
  },
  helper: {
    name: "Helper Bay",
    kind: "ability",
    trigger: "secondary",
    buyBase: 190,
    buyScale: 1.48,
    upgradeBase: 64,
    color: "#9ec9ff",
    desc: "C key deploy helper drone.",
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

const DROP_COLORS = {
  essence: "#9cf3a6",
  void: "#ba93ff",
  azure: "#7ecbff",
  amber: "#ffd37d",
};

const SPECIAL_CURRENCY_BY_KILL = {
  mine: "amber",
  helper: "void",
  rocket: "azure",
};

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
};

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const audio = createAudioSystem();

const state = {
  player: null,
  playerAtRunStart: null,
  mode: "id",
  selectedDifficulty: 1,
  input: { up: false, down: false, left: false, right: false, firing: false, special: false, secondary: false },
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
  updateDifficultyNote();
  resize();
  window.addEventListener("resize", resize);
  loop(performance.now());
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
    state.selectedDifficulty = Number(ui.difficultySelect.value) || 1;
    updateDifficultyNote();
  });
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
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || k === "arrowup") state.input.up = true;
    if (k === "s" || k === "arrowdown") state.input.down = true;
    if (k === "a" || k === "arrowleft") state.input.left = true;
    if (k === "d" || k === "arrowright") state.input.right = true;
    if (k === " ") state.input.special = true;
    if (k === "c") state.input.secondary = true;
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || k === "arrowup") state.input.up = false;
    if (k === "s" || k === "arrowdown") state.input.down = false;
    if (k === "a" || k === "arrowleft") state.input.left = false;
    if (k === "d" || k === "arrowright") state.input.right = false;
  });

  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = ((e.clientX - r.left) / Math.max(1, r.width)) * canvas.width;
    state.mouse.y = ((e.clientY - r.top) / Math.max(1, r.height)) * canvas.height;
  });
  canvas.addEventListener("pointerdown", () => {
    audio.unlock();
    state.input.firing = true;
  });
  canvas.addEventListener("pointerup", () => { state.input.firing = false; });
  canvas.addEventListener("pointerleave", () => { state.input.firing = false; });
}

function fillDifficultySelect() {
  ui.difficultySelect.innerHTML = "";
  for (let d = 1; d <= 10; d += 1) {
    const option = document.createElement("option");
    option.value = String(d);
    option.textContent = `D${d} - ${DIFFICULTY_META[d]}`;
    ui.difficultySelect.appendChild(option);
  }
  ui.difficultySelect.value = String(state.selectedDifficulty);
}

function updateDifficultyNote() {
  const d = state.selectedDifficulty;
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

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
}

function setScreen(name) {
  state.mode = name;
  Object.entries(screens).forEach(([key, el]) => el.classList.toggle("active", key === name));
}

function openMenu() {
  if (!state.player) {
    setScreen("id");
    return;
  }

  ui.menuTitle.textContent = `Player: ${state.player.id}`;
  ui.statXp.textContent = String(state.player.xpBank);
  if (ui.statVoid) ui.statVoid.textContent = String(state.player.voidBank || 0);
  if (ui.statAzure) ui.statAzure.textContent = String(state.player.azureBank || 0);
  if (ui.statAmber) ui.statAmber.textContent = String(state.player.amberBank || 0);
  ui.statBest.textContent = `${Math.floor(state.player.bestTime)}s`;
  ui.statKills.textContent = String(state.player.totalKills);
  ui.statWins.textContent = String(state.player.wins);
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

function renderLoadoutPanel() {
  if (!state.player) return;

  const slot = SLOT_LAYOUT[state.selectedSlotKey] || SLOT_LAYOUT[0];
  const occupied = getItemInSlot(slot.key);
  ui.upgradePartLabel.textContent = occupied
    ? `Selected Slot: ${slot.name} (${ITEM_CATALOG[occupied.type]?.name || occupied.type}, Lv ${occupied.level})`
    : `Selected Slot: ${slot.name} (Empty)`;

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

  if (!occupied) {
    const hint = document.createElement("p");
    hint.className = "slot-actions-empty";
    hint.textContent = "This slot is empty. Buy a module to install it here.";
    ui.slotActions.appendChild(hint);

    for (const [type, data] of Object.entries(ITEM_CATALOG)) {
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

  const row = document.createElement("div");
  row.className = "slot-action-item";
  row.innerHTML = `<div><h3>${data.name} (Lv ${occupied.level}/${MAX_UPGRADE_LEVEL})</h3><p>${data.desc}</p></div>`;

  const controls = document.createElement("div");
  controls.className = "slot-action-controls";

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

  const refundXp = getItemRefundValue(occupied);
  const sellBtn = document.createElement("button");
  sellBtn.type = "button";
  sellBtn.className = "sell-btn";
  sellBtn.textContent = `Sell (+${refundXp} Essence)`;
  sellBtn.addEventListener("click", () => sellItemInSlot(slot.key));

  controls.appendChild(upgradeBtn);
  controls.appendChild(sellBtn);
  row.appendChild(controls);
  ui.slotActions.appendChild(row);
}

function buyItemForSlot(slotKey, type) {
  if (!state.player) return;
  if (getItemInSlot(slotKey)) return;

  const cost = calculateBuyCost(type);
  if (state.player.xpBank < cost) return;

  state.player.xpBank -= cost;
  state.player.items.push({
    id: state.player.nextItemId,
    type,
    level: 0,
    slot: slotKey,
    spentXp: cost,
  });
  state.player.nextItemId += 1;
  savePlayer(state.player);
  audio.play("upgrade");
  renderLoadoutPanel();
}

function upgradeItemInSlot(slotKey) {
  if (!state.player) return;
  const item = getItemInSlot(slotKey);
  if (!item || item.level >= MAX_UPGRADE_LEVEL) return;

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
  const displaced = [];
  for (const item of state.player.items) {
    if (item.slot === null || item.slot < 0 || item.slot >= MAX_VISIBLE_SLOTS) continue;
    if (!occupiedByItem.has(item.slot)) occupiedByItem.set(item.slot, item);
    else displaced.push(item);
  }

  const openSlots = SLOT_LAYOUT.map((slot) => slot.key).filter((key) => !occupiedByItem.has(key));
  const pending = [
    ...displaced,
    ...state.player.items.filter((item) => item.slot === null || item.slot < 0 || item.slot >= MAX_VISIBLE_SLOTS),
  ];

  let changed = displaced.length > 0;
  for (const item of pending) {
    const nextSlot = openSlots.shift();
    if (nextSlot === undefined) {
      item.slot = null;
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

  audio.unlock();
  state.playerAtRunStart = clonePlayer(state.player);
  state.world = makeWorld(state.player, state.selectedDifficulty);
  setScreen("game");
}

function makeWorld(profile, difficulty) {
  const scale = difficultyScale(difficulty);

  const slottedItems = profile.items.filter((item) => item.slot !== null && item.slot >= 0 && item.slot < MAX_VISIBLE_SLOTS);
  const platingPower = totalItemLevel(slottedItems, "plating");
  const regenPower = totalItemLevel(slottedItems, "regen");
  const thrusterPower = totalItemLevel(slottedItems, "thruster");

  const maxHp = 100 + platingPower * 6;
  const speed = 242 * (1 + thrusterPower * 0.014);
  const armor = Math.min(0.5, profile.upgrades.armor * 0.005);
  const regen = 0.08 + regenPower * 0.05;
  const magnet = 120 + profile.upgrades.magnet * 3;

  return {
    difficulty,
    scale,
    t: 0,
    timer: RUN_DURATION,
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
    rockets: [],
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
      specialCd: 0,
      secondaryCd: 0,
      hitFlash: 0,
      angle: 0,
      dashIFrames: 0,
    },
  };
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
  w.timer = Math.max(0, RUN_DURATION - w.t);
  w.threat = 1 + Math.floor(w.t / 22);

  p.specialCd = Math.max(0, p.specialCd - dt);
  p.secondaryCd = Math.max(0, p.secondaryCd - dt);
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

  if (state.input.special) {
    useSpecialAbility(w);
    state.input.special = false;
  }

  if (state.input.secondary) {
    useSecondaryAbility(w);
    state.input.secondary = false;
  }

  if (state.input.firing) {
    fireSlottedWeapons(w);
  }

  if (w.t >= w.nextSpawn) {
    spawnEnemyWave(w);
    const baseGap = Math.max(0.35, 1.02 - w.threat * 0.022);
    w.nextSpawn += baseGap / w.scale.spawnRate;
  }

  stepBullets(w, dt);
  stepRockets(w, dt);
  stepMines(w, dt);
  stepHelper(w, dt);
  stepEnemies(w, dt);
  resolveCombat(w);
  collectDrops(w, dt);
  stepParticles(w, dt);

  updateHud(w);

  if (p.hp <= 0) {
    endRun(false);
    return;
  }

  if (w.timer <= 0) {
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

function fireSlottedWeapons(w) {
  const p = w.player;
  const slotted = getSlottedItems();

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
      fireCannon(w, mount.x, mount.y, a, damage, cfg.speed || 760);
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

function useSpecialAbility(w) {
  const p = w.player;
  if (p.specialCd > 0) return;

  const module = pickAbility("special");
  if (!module) return;

  const stacks = countSlottedByType(module.type);

  if (module.type === "warp") {
    const distance = 150 + module.level * 4.2;
    const dx = Math.cos(p.angle);
    const dy = Math.sin(p.angle);
    p.x += dx * distance;
    p.y += dy * distance;
    clampPlayer(p);
    p.dashIFrames = 0.22 + module.level * 0.003;
    p.specialCd = Math.max(6 - module.level * 0.06, 1.1) * (1 - Math.min(0.35, (stacks - 1) * 0.08));
    splash(w, p.x, p.y, "#7dd3fc", 16, 2.4);
    audio.play("warp");
    return;
  }

  if (module.type === "mine") {
    const radius = 46 + module.level * 1.7;
    const damage = 44 + module.level * 3.4;
    w.mines.push({ x: p.x, y: p.y, r: radius, dmg: damage, life: 18, armed: 0.35 });
    p.specialCd = Math.max(4.6 - module.level * 0.05, 0.9) * (1 - Math.min(0.35, (stacks - 1) * 0.08));
    audio.play("minePlace");
  }
}

function useSecondaryAbility(w) {
  const p = w.player;
  if (p.secondaryCd > 0) return;

  const module = pickAbility("secondary");
  if (!module) return;

  const stacks = countSlottedByType(module.type);

  if (module.type === "rocket") {
    const turn = 3.2 + module.level * 0.07;
    const damage = 56 + module.level * 3.2;
    const speed = 280;
    w.rockets.push({ x: p.x, y: p.y, vx: Math.cos(p.angle) * speed, vy: Math.sin(p.angle) * speed, life: 4.2, dmg: damage, turn });
    p.secondaryCd = Math.max(5.2 - module.level * 0.06, 1.0) * (1 - Math.min(0.35, (stacks - 1) * 0.08));
    audio.play("rocketLaunch");
    return;
  }

  if (module.type === "helper") {
    const hp = 70 + module.level * 6;
    const life = 16 + module.level * 0.28;
    const fireRate = 1.3 * (1 + module.level * 0.02);
    const dmg = 11 + module.level * 1.6;

    w.helper = { x: p.x + 34, y: p.y, hp, maxHp: hp, life, fireCd: 0, fireRate, dmg, orbit: 0 };
    p.secondaryCd = Math.max(8 - module.level * 0.05, 2.0) * (1 - Math.min(0.35, (stacks - 1) * 0.08));
    audio.play("helperSpawn");
  }
}

function fireCannon(w, originX, originY, angle, damage, speed) {
  const shotSpeed = speed ?? 780;
  const critChance = 0.06;
  const critMult = 1.45;
  const crit = Math.random() < critChance;
  w.bullets.push({
    x: originX,
    y: originY,
    vx: Math.cos(angle) * shotSpeed,
    vy: Math.sin(angle) * shotSpeed,
    life: 1.0,
    dmg: crit ? damage * critMult : damage,
    crit,
  });
}

function spawnEnemyWave(w) {
  const count = 1 + Math.floor(w.threat * 0.48 + (w.difficulty - 1) * 0.35);
  for (let i = 0; i < count; i += 1) {
    const kind = pickEnemyKind(w.difficulty);
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = -24; y = Math.random() * canvas.height; }
    if (edge === 1) { x = canvas.width + 24; y = Math.random() * canvas.height; }
    if (edge === 2) { x = Math.random() * canvas.width; y = -24; }
    if (edge === 3) { x = Math.random() * canvas.width; y = canvas.height + 24; }

    const hpScale = w.scale.enemyHp;
    const spdScale = w.scale.enemySpeed;

    if (kind === "chaser") w.enemies.push({ kind, x, y, hp: (34 + w.threat * 4) * hpScale, speed: (140 + w.threat * 2) * spdScale, r: 12, cd: 0, zig: 0 });
    else if (kind === "brute") w.enemies.push({ kind, x, y, hp: (90 + w.threat * 10) * hpScale, speed: (92 + w.threat) * spdScale, r: 17, cd: 0, zig: 0 });
    else if (kind === "dart") w.enemies.push({ kind, x, y, hp: (30 + w.threat * 3) * hpScale, speed: (125 + w.threat * 2) * spdScale, r: 10, cd: 1.2, zig: 0 });
    else if (kind === "berserker") w.enemies.push({ kind, x, y, hp: (42 + w.threat * 5) * hpScale, speed: (170 + w.threat * 3) * spdScale, r: 11, cd: 0.4, zig: Math.random() * 6.28 });
    else if (kind === "tank") w.enemies.push({ kind, x, y, hp: (170 + w.threat * 14) * hpScale, speed: (72 + w.threat * 0.9) * spdScale, r: 22, cd: 1.6, zig: 0 });
    else w.enemies.push({ kind: "phantom", x, y, hp: (58 + w.threat * 6) * hpScale, speed: (150 + w.threat * 2.2) * spdScale, r: 12, cd: 1.0, zig: Math.random() * 6.28, phase: 0 });
  }
}

function pickEnemyKind(difficulty) {
  const r = Math.random();
  if (difficulty <= 2) return r < 0.72 ? "chaser" : r < 0.95 ? "dart" : "brute";
  if (difficulty <= 4) return r < 0.54 ? "chaser" : r < 0.76 ? "dart" : r < 0.93 ? "brute" : "berserker";
  if (difficulty <= 7) return r < 0.38 ? "chaser" : r < 0.57 ? "dart" : r < 0.75 ? "berserker" : r < 0.9 ? "brute" : "tank";
  return r < 0.22 ? "chaser" : r < 0.38 ? "dart" : r < 0.58 ? "berserker" : r < 0.75 ? "brute" : r < 0.9 ? "tank" : "phantom";
}

function stepBullets(w, dt) {
  for (const b of w.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  w.bullets = w.bullets.filter((b) => b.life > 0 && b.x > -40 && b.y > -40 && b.x < canvas.width + 40 && b.y < canvas.height + 40);
}

function stepRockets(w, dt) {
  for (const r of w.rockets) {
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

function stepMines(w, dt) {
  for (const m of w.mines) {
    m.life -= dt;
    m.armed -= dt;
    if (m.armed > 0) continue;

    const trigger = w.enemies.some((e) => Math.hypot(e.x - m.x, e.y - m.y) < m.r * 0.45);
    if (!trigger) continue;

    for (const e of w.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - m.x, e.y - m.y);
      if (d <= m.r) {
        const falloff = 1 - d / m.r;
        e.hp -= m.dmg * (0.35 + falloff * 0.65);
        e.lastHitKind = "mine";
      }
    }

    m.life = -1;
    splash(w, m.x, m.y, "#ffbb7d", 20, 3.3);
    audio.play("mineBlast");
  }

  w.mines = w.mines.filter((m) => m.life > 0);
}

function stepHelper(w, dt) {
  if (!w.helper) return;
  const h = w.helper;
  const p = w.player;

  h.life -= dt;
  h.fireCd = Math.max(0, h.fireCd - dt);
  h.orbit += dt * 3;

  const targetX = p.x + Math.cos(h.orbit) * 52;
  const targetY = p.y + Math.sin(h.orbit) * 52;
  h.x += (targetX - h.x) * 6.5 * dt;
  h.y += (targetY - h.y) * 6.5 * dt;

  if (h.fireCd <= 0 && w.enemies.length > 0) {
    let nearest = w.enemies[0];
    let best = Math.hypot(nearest.x - h.x, nearest.y - h.y);
    for (const e of w.enemies) {
      const d = Math.hypot(e.x - h.x, e.y - h.y);
      if (d < best) {
        best = d;
        nearest = e;
      }
    }

    const a = Math.atan2(nearest.y - h.y, nearest.x - h.x);
    w.bullets.push({ x: h.x, y: h.y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, life: 1.0, dmg: h.dmg, helper: true });
    h.fireCd = 1 / h.fireRate;
    audio.play("helperShot");
  }

  if (h.life <= 0 || h.hp <= 0) {
    splash(w, h.x, h.y, "#9ec9ff", 10, 2.3);
    w.helper = null;
  }
}
function stepEnemies(w, dt) {
  const p = w.player;
  for (const e of w.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;

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
    } else if (e.kind === "berserker") {
      e.zig += dt * 7;
      const side = Math.sin(e.zig) * 0.55;
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

function resolveCombat(w) {
  const p = w.player;

  for (const b of w.bullets) {
    if (!b.enemy) {
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) <= e.r + 4) {
          e.hp -= b.dmg;
          e.lastHitKind = b.helper ? "helper" : "essence";
          b.life = 0;
          splash(w, e.x, e.y, b.crit ? "#fff1a4" : "#ffd37d", b.crit ? 12 : 6, 1.6);
          if (b.crit) audio.play("crit");
          else audio.play("hit");
          break;
        }
      }
    } else if (Math.hypot(b.x - p.x, b.y - p.y) <= 15 && p.dashIFrames <= 0) {
      const dmg = Math.abs(b.dmg) * w.scale.enemyDamage * (1 - Math.min(0.62, p.armor));
      p.hp -= dmg;
      p.hitFlash = 0.14;
      b.life = 0;
      splash(w, p.x, p.y, "#ff8b8b", 10, 2.2);
      audio.play("playerHit");
    }

    if (b.enemy && w.helper && Math.hypot(b.x - w.helper.x, b.y - w.helper.y) <= 12) {
      w.helper.hp -= Math.abs(b.dmg) * 0.9;
      b.life = 0;
    }
  }

  for (const e of w.enemies) {
    if (Math.hypot(e.x - p.x, e.y - p.y) <= e.r + 13 && p.dashIFrames <= 0) {
      const baseContact = e.kind === "tank" ? 42 : e.kind === "berserker" ? 28 : e.kind === "brute" ? 24 : 16;
      const dmg = baseContact * 0.016 * w.scale.enemyDamage * (1 - Math.min(0.62, p.armor));
      p.hp -= dmg;
      p.hitFlash = 0.1;
    }

    if (w.helper && Math.hypot(e.x - w.helper.x, e.y - w.helper.y) <= e.r + 12) {
      w.helper.hp -= 14 * 0.016;
    }
  }

  for (const r of w.rockets) {
    let exploded = false;
    for (const e of w.enemies) {
      if (Math.hypot(r.x - e.x, r.y - e.y) <= e.r + 7) {
        exploded = true;
        break;
      }
    }
    if (!exploded) continue;

    for (const e of w.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - r.x, e.y - r.y);
      if (d <= 95) {
        const falloff = 1 - d / 95;
        e.hp -= r.dmg * (0.4 + falloff * 0.6);
        e.lastHitKind = "rocket";
      }
    }

    splash(w, r.x, r.y, "#ffd58a", 16, 2.9);
    audio.play("mineBlast");
    r.life = -1;
  }

  const alive = [];
  for (const e of w.enemies) {
    if (e.hp > 0) {
      alive.push(e);
      continue;
    }

    w.kills += 1;
    const baseXp = e.kind === "tank" ? 19 : e.kind === "phantom" ? 16 : e.kind === "brute" ? 12 : e.kind === "berserker" ? 11 : e.kind === "dart" ? 9 : 7;
    const essence = Math.floor(baseXp * w.scale.reward);
    const bonusEssence = Math.max(1, Math.floor(essence * 0.45));
    const specialKind = SPECIAL_CURRENCY_BY_KILL[e.lastHitKind];
    const specialAmount = Math.max(1, Math.floor(essence * 0.35));

    w.runEssence += essence;
    w.drops.push({ x: e.x, y: e.y, t: 2.2, kind: "essence", amount: bonusEssence, color: DROP_COLORS.essence });
    if (specialKind) {
      w.drops.push({ x: e.x + 7, y: e.y - 6, t: 2.2, kind: specialKind, amount: specialAmount, color: DROP_COLORS[specialKind] });
    }
    splash(w, e.x, e.y, "#90f59a", 14, 2.9);
    audio.play("kill");
  }
  w.enemies = alive;
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

function drawGame() {
  const w = state.world;
  if (!w) return;

  const grad = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.5, 60, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.84);
  grad.addColorStop(0, "#1a2a36");
  grad.addColorStop(1, "#0a1016");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  for (const m of w.mines) {
    ctx.strokeStyle = "#ffbb7d";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffcc8b";
    ctx.fillRect(m.x - 3, m.y - 3, 6, 6);
  }

  for (const r of w.rockets) {
    ctx.fillStyle = "#ffd78a";
    ctx.beginPath();
    ctx.arc(r.x, r.y, 5.2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const d of w.drops) {
    ctx.fillStyle = d.color || DROP_COLORS.essence;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const b of w.bullets) {
    ctx.fillStyle = b.enemy ? "#ff8b8b" : b.crit ? "#fff3a8" : b.helper ? "#9ec9ff" : "#7dd3fc";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.enemy ? 3.5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of w.enemies) {
    ctx.fillStyle = e.kind === "tank" ? "#ffcc74" : e.kind === "phantom" ? "#7f9bff" : e.kind === "brute" ? "#ffb36a" : e.kind === "dart" ? "#c58bff" : e.kind === "berserker" ? "#ff7f94" : "#ff6f6f";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (w.helper) {
    ctx.fillStyle = "#b7dcff";
    ctx.beginPath();
    ctx.arc(w.helper.x, w.helper.y, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  const p = w.player;
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
  ui.timer.textContent = formatTime(w.timer);
  ui.health.textContent = `HP ${Math.max(0, Math.floor(p.hp))}/${Math.floor(p.maxHp)}`;
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
  ui.hudDifficulty.textContent = `D${w.difficulty}`;
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








