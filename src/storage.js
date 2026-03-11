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
  plating: { buyBase: 90, upgradeBase: 36 },
  regen: { buyBase: 95, upgradeBase: 39 },
  thruster: { buyBase: 92, upgradeBase: 37 },
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
      normalizedItems.push({ id, type: raw.type, level, slot, spentXp });
      maxId = Math.max(maxId, id);
    }
  }

  if (normalizedItems.length === 0) {
    normalizedItems.push({ id: 1, type: "cannon", level: 0, slot: 0, spentXp: 0 });
    maxId = 1;

    if (player.ownedSpecial?.warp) normalizedItems.push({ id: ++maxId, type: "warp", level: p.upgrades.warpPower, slot: null, spentXp: estimateLegacySpentXp("warp", p.upgrades.warpPower) });
    if (player.ownedSpecial?.mine) normalizedItems.push({ id: ++maxId, type: "mine", level: p.upgrades.mineDamage, slot: null, spentXp: estimateLegacySpentXp("mine", p.upgrades.mineDamage) });
    if (player.ownedSecondary?.rocket) normalizedItems.push({ id: ++maxId, type: "rocket", level: p.upgrades.rocketDamage, slot: null, spentXp: estimateLegacySpentXp("rocket", p.upgrades.rocketDamage) });
    if (player.ownedSecondary?.helper) normalizedItems.push({ id: ++maxId, type: "helper", level: p.upgrades.helperDamage, slot: null, spentXp: estimateLegacySpentXp("helper", p.upgrades.helperDamage) });
  }

  p.items = normalizedItems;
  const requestedNext = clampInt(player.nextItemId, 1, 1000000);
  p.nextItemId = Math.max(maxId + 1, requestedNext || 1);

  return p;
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

