const STORAGE_KEY = "rift_run_profiles_v2";
const MAX_LEVEL = 50;
const MAX_SLOTS = 18;

const ITEM_TYPES = new Set([
  "cannon",
  "burst",
  "warp",
  "mine",
  "rocket",
  "helper",
  "aegis",
  "azure_infusor",
  "void_infusor",
  "amber_infusor",
  "quantum_bound",
  "plating",
  "regen",
  "thruster",
]);

const ITEM_DEFAULT_COSTS = {
  cannon: { buyBase: 80, upgradeBase: 34 },
  burst: { buyBase: 120, upgradeBase: 44 },
  warp: { buyBase: 140, upgradeBase: 55 },
  mine: { buyBase: 130, upgradeBase: 53 },
  rocket: { buyBase: 175, upgradeBase: 62 },
  helper: { buyBase: 190, upgradeBase: 64 },
  aegis: { buyBase: 210, upgradeBase: 68 },
  azure_infusor: { buyBase: 145, upgradeBase: 48 },
  void_infusor: { buyBase: 150, upgradeBase: 49 },
  amber_infusor: { buyBase: 145, upgradeBase: 48 },
  quantum_bound: { buyBase: 180, upgradeBase: 56 },
  plating: { buyBase: 90, upgradeBase: 36 },
  regen: { buyBase: 95, upgradeBase: 39 },
  thruster: { buyBase: 92, upgradeBase: 37 },
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

function readStore() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("rift_run_profiles_v1");
  if (!raw) {
    return { players: {} };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.players !== "object") {
      return { players: {} };
    }
    return parsed;
  } catch {
    return { players: {} };
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getOrCreatePlayer(id) {
  const key = String(id ?? "").trim().toLowerCase();
  const store = readStore();

  if (!store.players[key]) {
    store.players[key] = createDefaultPlayer(key);
    writeStore(store);
    return { ...store.players[key] };
  }

  return normalizePlayer(store.players[key]);
}

export function savePlayer(player) {
  const store = readStore();
  store.players[player.id] = normalizePlayer(player);
  writeStore(store);
}

export function clonePlayer(player) {
  return JSON.parse(JSON.stringify(player));
}

function createDefaultPlayer(id) {
  return {
    id,
    xpBank: 1000000,
    voidBank: 0,
    azureBank: 0,
    amberBank: 0,
    bestTime: 0,
    totalKills: 0,
    wins: 0,
    nextItemId: 2,
    items: [
      { id: 1, type: "cannon", level: 0, slot: 0, spentXp: 0 },
    ],
    upgrades: {
      health: 0,
      speed: 0,
      armor: 0,
      regen: 0,
      magnet: 0,
      cannonDamage: 0,
      cannonFireRate: 0,
      cannonRange: 0,
      specialSlot: 0,
      secondarySlot: 0,
      warpPower: 0,
      warpCooldown: 0,
      mineDamage: 0,
      mineRadius: 0,
      mineCooldown: 0,
      rocketDamage: 0,
      rocketCooldown: 0,
      rocketTurn: 0,
      helperDamage: 0,
      helperFireRate: 0,
      helperDurability: 0,
    },
  };
}

function normalizePlayer(player) {
  const p = createDefaultPlayer(player.id);
  p.xpBank = Math.max(0, Number(player.xpBank) || 0);
  p.voidBank = Math.max(0, Number(player.voidBank) || 0);
  p.azureBank = Math.max(0, Number(player.azureBank) || 0);
  p.amberBank = Math.max(0, Number(player.amberBank) || 0);
  p.bestTime = Math.max(0, Number(player.bestTime) || 0);
  p.totalKills = Math.max(0, Number(player.totalKills) || 0);
  p.wins = Math.max(0, Number(player.wins) || 0);

  const source = player.upgrades ?? {};
  Object.keys(p.upgrades).forEach((key) => {
    p.upgrades[key] = clampInt(source[key], 0, MAX_LEVEL);
  });

  if (Number.isFinite(Number(source.damage))) {
    p.upgrades.cannonDamage = Math.max(p.upgrades.cannonDamage, clampInt(source.damage, 0, MAX_LEVEL));
  }
  if (Number.isFinite(Number(source.fireRate))) {
    p.upgrades.cannonFireRate = Math.max(p.upgrades.cannonFireRate, clampInt(source.fireRate, 0, MAX_LEVEL));
  }
  if (Number.isFinite(Number(source.range))) {
    p.upgrades.cannonRange = Math.max(p.upgrades.cannonRange, clampInt(source.range, 0, MAX_LEVEL));
  }
  if (Number.isFinite(Number(source.dash))) {
    p.upgrades.warpPower = Math.max(p.upgrades.warpPower, clampInt(source.dash, 0, MAX_LEVEL));
    p.upgrades.warpCooldown = Math.max(p.upgrades.warpCooldown, clampInt(source.dash, 0, MAX_LEVEL));
  }

  const normalizedItems = [];
  let maxId = 0;
  if (Array.isArray(player.items)) {
    for (const raw of player.items) {
      if (!raw || typeof raw !== "object") continue;
      if (!ITEM_TYPES.has(raw.type)) continue;
      const id = Math.max(1, clampInt(raw.id, 1, 1000000));
      const level = clampInt(raw.level, 0, MAX_LEVEL);
      const slot = normalizeSlot(raw.slot);
      const spentXp = Number.isFinite(Number(raw.spentXp))
        ? Math.max(0, Math.floor(Number(raw.spentXp)))
        : estimateLegacySpentXp(raw.type, level);
      const normalized = { id, type: raw.type, level, slot, spentXp };
      if (raw.type === "mine") {
        normalized.skillTree = normalizeMineSkillTree(raw.skillTree, level);
        normalized.level = Math.min(MAX_LEVEL, getMineTreeTotalLevel(normalized.skillTree));
      } else if (raw.type === "warp") {
        normalized.warpTree = normalizeWarpSkillTree(raw.warpTree, level);
        normalized.level = Math.min(MAX_LEVEL, getWarpTreeTotalLevel(normalized.warpTree));
      }
      normalizedItems.push(normalized);
      maxId = Math.max(maxId, id);
    }
  }

  if (normalizedItems.length === 0) {
    normalizedItems.push({ id: 1, type: "cannon", level: 0, slot: 0, spentXp: 0 });
    maxId = 1;

    if (player.ownedSpecial?.warp) {
      const warpLegacyLevel = p.upgrades.warpPower;
      normalizedItems.push({
        id: ++maxId,
        type: "warp",
        level: Math.min(MAX_LEVEL, warpLegacyLevel),
        slot: null,
        spentXp: estimateLegacySpentXp("warp", warpLegacyLevel),
        warpTree: normalizeWarpSkillTree(null, warpLegacyLevel),
      });
    }
    if (player.ownedSpecial?.mine) {
      const mineLegacyLevel = p.upgrades.mineDamage;
      normalizedItems.push({
        id: ++maxId,
        type: "mine",
        level: Math.min(MAX_LEVEL, mineLegacyLevel),
        slot: null,
        spentXp: estimateLegacySpentXp("mine", mineLegacyLevel),
        skillTree: normalizeMineSkillTree(null, mineLegacyLevel),
      });
    }
    if (player.ownedSecondary?.rocket) normalizedItems.push({ id: ++maxId, type: "rocket", level: p.upgrades.rocketDamage, slot: null, spentXp: estimateLegacySpentXp("rocket", p.upgrades.rocketDamage) });
    if (player.ownedSecondary?.helper) normalizedItems.push({ id: ++maxId, type: "helper", level: p.upgrades.helperDamage, slot: null, spentXp: estimateLegacySpentXp("helper", p.upgrades.helperDamage) });
  }

  p.items = normalizedItems;
  const requestedNext = clampInt(player.nextItemId, 1, 1000000);
  p.nextItemId = Math.max(maxId + 1, requestedNext || 1);

  return p;
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
    const legacy = clampInt(fallbackLevel, 0, MAX_LEVEL);
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
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_LEVEL), 0);
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
    const legacy = clampInt(fallbackLevel, 0, MAX_LEVEL);
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
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_LEVEL), 0);
}

function normalizeSlot(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n >= MAX_SLOTS) return null;
  return n;
}

function clampInt(value, min, max) {
  const n = Math.floor(Number(value) || 0);
  return Math.max(min, Math.min(max, n));
}

function estimateLegacySpentXp(type, level) {
  const cfg = ITEM_DEFAULT_COSTS[type];
  if (!cfg) return 0;

  let total = cfg.buyBase;
  const lvl = clampInt(level, 0, MAX_LEVEL);
  for (let i = 0; i < lvl; i += 1) {
    total += Math.floor(cfg.upgradeBase + i * 8 + i * i * 0.65);
  }
  return Math.max(0, total);
}

