const PLAYER_API_BASE = "/api/player";
const LOCAL_PLAYER_PREFIX = "rift-run-player:";
const SAVE_RETRY_DELAY_MS = 400;
const MAX_LEVEL = 50;
const MAX_SLOTS = 18;

const ITEM_TYPES = new Set([
  "cannon",
  "burst",
  "lance",
  "combo_link",
  "warp",
  "void_counter",
  "mine",
  "bulwark_anchor",
  "siege_spikes",
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
  lance: { buyBase: 168, upgradeBase: 59 },
  combo_link: { buyBase: 154, upgradeBase: 54 },
  warp: { buyBase: 140, upgradeBase: 55 },
  void_counter: { buyBase: 172, upgradeBase: 60 },
  mine: { buyBase: 130, upgradeBase: 53 },
  bulwark_anchor: { buyBase: 155, upgradeBase: 57 },
  siege_spikes: { buyBase: 168, upgradeBase: 60 },
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
  chainDamage: 8,
  chainLimit: 8,
};

const ROCKET_POD_TREE_LIMITS = {
  cooldown: 10,
  clusterCount: 8,
  explosionRadius: 10,
  explosionDamage: 10,
  shockDamage: 10,
  shockDuration: 8,
  turnRate: 8,
  speed: 8,
  life: 8,
  afterburnUnlock: 1,
  afterburnShield: 10,
  afterburnDuration: 8,
  afterburnSpeed: 8,
  afterburnConvert: 8,
  afterburnRange: 8,
  infuseUnlock: 1,
  infuseDuration: 8,
  infuseCadence: 8,
  infusePayload: 10,
  infuseCount: 6,
};

const VOID_COUNTER_TREE_LIMITS = {
  cooldown: 10,
  burstRadius: 10,
  burstDamage: 10,
  exileDuration: 10,
  teleporterDuration: 10,
  infectUnlock: 1,
  infectRadius: 10,
  infectInfusion: 8,
  infectLingering: 10,
  imprintUnlock: 1,
  imprintWindow: 8,
  imprintCharges: 6,
  imprintInfusion: 8,
};

const AEGIS_TREE_LIMITS = {
  duration: 10,
  cooldown: 10,
  storeCap: 10,
  beamDamage: 8,
  beamRadius: 8,
  beamControl: 8,
  beamSummon: 6,
};

const BULWARK_ANCHOR_TREE_LIMITS = {
  cooldown: 12,
  radius: 12,
  duration: 10,
  reduction: 10,
  pulseDamage: 12,
  pulseRate: 10,
  barrierWidth: 8,
  trapDamage: 8,
  turretUnlock: 1,
  turretCount: 6,
  turretDamage: 10,
  turretRate: 10,
  turretTurn: 8,
  turretRange: 8,
};

const COMBO_LINK_TREE_LIMITS = {
  comboGain: 16,
  comboCap: 18,
  comboWindow: 16,
};

const SIEGE_SPIKES_TREE_LIMITS = {
  cooldown: 12,
  length: 12,
  duration: 10,
  touchDamage: 12,
  hitRate: 8,
  turretUnlock: 1,
  turretCount: 6,
  turretDamage: 10,
  turretRate: 10,
  turretTurn: 8,
  turretRange: 8,
  drawBoost: 8,
  relayUnlock: 1,
  relayEfficiency: 8,
  relayConversion: 10,
  relayTracking: 8,
  relayWallCap: 4,
  relayRegen: 8,
};

let didWarnSaveFailure = false;
let isSaveFlushRunning = false;
let saveRetryTimer = null;
const pendingPlayerSaves = new Map();
let storageMode = null;

function apiPathForPlayer(id) {
  return `${PLAYER_API_BASE}/${encodeURIComponent(id)}`;
}

function localStorageKeyForPlayer(id) {
  return `${LOCAL_PLAYER_PREFIX}${id}`;
}

function canUseLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const key = `${LOCAL_PLAYER_PREFIX}__probe__`;
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function requestJsonSync(method, path, payload = null) {
  const xhr = new XMLHttpRequest();
  xhr.open(method, path, false);
  xhr.setRequestHeader("Accept", "application/json");
  if (payload !== null) {
    xhr.setRequestHeader("Content-Type", "application/json");
  }
  xhr.send(payload === null ? null : JSON.stringify(payload));

  const text = (xhr.responseText || "").trim();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (xhr.status >= 200 && xhr.status < 300) {
    return body;
  }

  const apiMessage = body && typeof body.error === "string" ? body.error : null;
  throw new Error(apiMessage || `Storage request failed (${xhr.status}).`);
}

async function requestJsonAsync(method, path, payload = null) {
  const options = {
    method,
    headers: {
      Accept: "application/json",
    },
  };
  if (payload !== null) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(path, options);
  const text = (await response.text()).trim();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (response.ok) {
    return body;
  }

  const apiMessage = body && typeof body.error === "string" ? body.error : null;
  throw new Error(apiMessage || `Storage request failed (${response.status}).`);
}

function readPlayerFromFile(id) {
  const result = requestJsonSync("GET", apiPathForPlayer(id));
  if (!result || typeof result !== "object" || !("player" in result)) {
    return null;
  }
  return result.player;
}

function readPlayerFromLocalStorage(id) {
  if (!canUseLocalStorage()) return null;
  const raw = window.localStorage.getItem(localStorageKeyForPlayer(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writePlayerToFileSync(player) {
  requestJsonSync("PUT", apiPathForPlayer(player.id), { player });
}

async function writePlayerToFileAsync(player) {
  await requestJsonAsync("PUT", apiPathForPlayer(player.id), { player });
}

function writePlayerToLocalStorage(player) {
  if (!canUseLocalStorage()) {
    throw new Error("Browser localStorage is unavailable.");
  }
  window.localStorage.setItem(localStorageKeyForPlayer(player.id), JSON.stringify(player));
}

function makeStorageUnavailableError(cause) {
  const error = new Error("Could not access player storage. On GitHub Pages this game uses browser localStorage.");
  error.cause = cause;
  return error;
}

export function getOrCreatePlayer(id) {
  const key = String(id ?? "").trim().toLowerCase();
  if (!key) {
    throw new Error("Player ID is required.");
  }

  try {
    if (storageMode !== "local") {
      try {
        const existing = readPlayerFromFile(key);
        storageMode = "api";
        if (existing && typeof existing === "object") {
          return normalizePlayer(existing);
        }

        const created = createDefaultPlayer(key);
        writePlayerToFileSync(created);
        return normalizePlayer(created);
      } catch {
        // Fall back to browser storage when API-backed storage is unavailable
        // (for example when running on GitHub Pages).
      }
    }

    if (!canUseLocalStorage()) {
      throw new Error("Neither API storage nor browser localStorage is available.");
    }

    storageMode = "local";
    const localExisting = readPlayerFromLocalStorage(key);
    if (localExisting && typeof localExisting === "object") {
      return normalizePlayer(localExisting);
    }

    const created = createDefaultPlayer(key);
    writePlayerToLocalStorage(created);
    return normalizePlayer(created);
  } catch (err) {
    throw makeStorageUnavailableError(err);
  }
}

export function savePlayer(player) {
  const normalized = normalizePlayer(player);
  pendingPlayerSaves.set(normalized.id, normalized);
  scheduleSaveFlush();
}

function scheduleSaveFlush(delayMs = 0) {
  if (isSaveFlushRunning) return;
  if (delayMs > 0) {
    if (saveRetryTimer !== null) return;
    saveRetryTimer = setTimeout(() => {
      saveRetryTimer = null;
      if (isSaveFlushRunning || pendingPlayerSaves.size === 0) return;
      isSaveFlushRunning = true;
      void flushPendingSaves();
    }, delayMs);
    return;
  }

  isSaveFlushRunning = true;
  void flushPendingSaves();
}

async function flushPendingSaves() {
  while (pendingPlayerSaves.size > 0) {
    const entry = pendingPlayerSaves.entries().next().value;
    if (!entry) break;
    const [playerId, snapshot] = entry;
    pendingPlayerSaves.delete(playerId);
    try {
      if (storageMode === "local") {
        writePlayerToLocalStorage(snapshot);
      } else {
        await writePlayerToFileAsync(snapshot);
        storageMode = "api";
      }
      didWarnSaveFailure = false;
    } catch (err) {
      if (canUseLocalStorage()) {
        try {
          storageMode = "local";
          writePlayerToLocalStorage(snapshot);
          didWarnSaveFailure = false;
          continue;
        } catch {
          // Keep existing retry behavior below when localStorage write fails.
        }
      }

      pendingPlayerSaves.set(playerId, snapshot);
      if (!didWarnSaveFailure) {
        didWarnSaveFailure = true;
        console.error("Player save failed. Retrying in the background.", err);
      }
      isSaveFlushRunning = false;
      scheduleSaveFlush(SAVE_RETRY_DELAY_MS);
      return;
    }
  }

  isSaveFlushRunning = false;
}

function flushPendingSavesSynchronously() {
  if (pendingPlayerSaves.size === 0) return;
  for (const snapshot of pendingPlayerSaves.values()) {
    try {
      if (storageMode === "local") {
        writePlayerToLocalStorage(snapshot);
      } else {
        writePlayerToFileSync(snapshot);
      }
    } catch {
      try {
        if (canUseLocalStorage()) {
          storageMode = "local";
          writePlayerToLocalStorage(snapshot);
        }
      } catch {
        // Ignore unload-time save errors.
      }
    }
  }
  pendingPlayerSaves.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flushPendingSavesSynchronously);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushPendingSavesSynchronously();
    }
  });
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
    marathonCheckpointDistance: 0,
    marathonCheckpointX: 0,
    marathonCheckpointY: 0,
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
  const marathonDirect = Number(player.marathonCheckpointDistance);
  const marathonLegacy = Number(player.marathonCheckpoint?.distance);
  p.marathonCheckpointDistance = Math.max(
    0,
    Math.floor(
      Number.isFinite(marathonDirect)
        ? marathonDirect
        : (Number.isFinite(marathonLegacy) ? marathonLegacy : 0),
    ),
  );
  const checkpointDirectX = Number(player.marathonCheckpointX);
  const checkpointDirectY = Number(player.marathonCheckpointY);
  const checkpointLegacyX = Number(player.marathonCheckpoint?.x);
  const checkpointLegacyY = Number(player.marathonCheckpoint?.y);
  p.marathonCheckpointX = Number.isFinite(checkpointDirectX)
    ? checkpointDirectX
    : (Number.isFinite(checkpointLegacyX) ? checkpointLegacyX : p.marathonCheckpointDistance);
  p.marathonCheckpointY = Number.isFinite(checkpointDirectY)
    ? checkpointDirectY
    : (Number.isFinite(checkpointLegacyY) ? checkpointLegacyY : 0);

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
      } else if (raw.type === "rocket") {
        normalized.rocketTree = normalizeRocketPodSkillTree(raw.rocketTree, level);
        normalized.level = Math.min(MAX_LEVEL, getRocketPodTreeTotalLevel(normalized.rocketTree));
      } else if (raw.type === "void_counter") {
        normalized.counterTree = normalizeVoidCounterSkillTree(raw.counterTree, level);
        normalized.level = Math.min(MAX_LEVEL, getVoidCounterTreeTotalLevel(normalized.counterTree));
      } else if (raw.type === "aegis") {
        normalized.aegisTree = normalizeAegisSkillTree(raw.aegisTree, level);
        normalized.level = Math.min(MAX_LEVEL, getAegisTreeTotalLevel(normalized.aegisTree));
      } else if (raw.type === "bulwark_anchor") {
        normalized.bulwarkTree = normalizeBulwarkAnchorSkillTree(raw.bulwarkTree, level);
        normalized.level = Math.min(MAX_LEVEL, getBulwarkAnchorTreeTotalLevel(normalized.bulwarkTree));
      } else if (raw.type === "combo_link") {
        normalized.comboTree = normalizeComboLinkSkillTree(raw.comboTree, level);
        normalized.level = Math.min(MAX_LEVEL, getComboLinkTreeTotalLevel(normalized.comboTree));
      } else if (raw.type === "siege_spikes") {
        normalized.siegeTree = normalizeSiegeSpikesSkillTree(raw.siegeTree, level);
        normalized.level = Math.min(MAX_LEVEL, getSiegeSpikesTreeTotalLevel(normalized.siegeTree));
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
    if (player.ownedSpecial?.aegis) {
      const aegisLegacyLevel = clampInt(player.aegisLevel, 0, MAX_LEVEL);
      normalizedItems.push({
        id: ++maxId,
        type: "aegis",
        level: Math.min(MAX_LEVEL, aegisLegacyLevel),
        slot: null,
        spentXp: estimateLegacySpentXp("aegis", aegisLegacyLevel),
        aegisTree: normalizeAegisSkillTree(null, aegisLegacyLevel),
      });
    }
    if (player.ownedSecondary?.rocket) {
      const rocketLegacyLevel = clampInt(p.upgrades.rocketDamage, 0, MAX_LEVEL);
      normalizedItems.push({
        id: ++maxId,
        type: "rocket",
        level: Math.min(MAX_LEVEL, rocketLegacyLevel),
        slot: null,
        spentXp: estimateLegacySpentXp("rocket", rocketLegacyLevel),
        rocketTree: normalizeRocketPodSkillTree(null, rocketLegacyLevel),
      });
    }
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
    chainDamage: 0,
    chainLimit: 0,
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
    tree.chainDamage = clampInt(source.chainDamage, 0, WARP_TREE_LIMITS.chainDamage);
    tree.chainLimit = clampInt(source.chainLimit, 0, WARP_TREE_LIMITS.chainLimit);
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
    tree.chainDamage = 0;
    tree.chainLimit = 0;
  }
  if (tree.comboUnlock <= 0) {
    tree.comboWindow = 0;
    tree.infusionPower = 0;
    tree.swapPulse = 0;
    tree.chainDamage = 0;
    tree.chainLimit = 0;
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
    tree.chainDamage,
    tree.chainLimit,
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_LEVEL), 0);
}

function createDefaultRocketPodSkillTree() {
  return {
    cooldown: 0,
    clusterCount: 0,
    explosionRadius: 0,
    explosionDamage: 0,
    shockDamage: 0,
    shockDuration: 0,
    turnRate: 0,
    speed: 0,
    life: 0,
    afterburnUnlock: 0,
    afterburnShield: 0,
    afterburnDuration: 0,
    afterburnSpeed: 0,
    afterburnConvert: 0,
    afterburnRange: 0,
    infuseUnlock: 0,
    infuseDuration: 0,
    infuseCadence: 0,
    infusePayload: 0,
    infuseCount: 0,
  };
}

function enforceRocketPodBranchChoice(tree) {
  if (!tree) return tree;
  const afterburnScore = (tree.afterburnUnlock || 0)
    + (tree.afterburnShield || 0)
    + (tree.afterburnDuration || 0)
    + (tree.afterburnSpeed || 0)
    + (tree.afterburnConvert || 0)
    + (tree.afterburnRange || 0);
  const infuseScore = (tree.infuseUnlock || 0)
    + (tree.infuseDuration || 0)
    + (tree.infuseCadence || 0)
    + (tree.infusePayload || 0)
    + (tree.infuseCount || 0);
  if ((tree.afterburnUnlock || 0) > 0 && (tree.infuseUnlock || 0) > 0) {
    if (afterburnScore >= infuseScore) {
      tree.infuseUnlock = 0;
      tree.infuseDuration = 0;
      tree.infuseCadence = 0;
      tree.infusePayload = 0;
      tree.infuseCount = 0;
    } else {
      tree.afterburnUnlock = 0;
      tree.afterburnShield = 0;
      tree.afterburnDuration = 0;
      tree.afterburnSpeed = 0;
      tree.afterburnConvert = 0;
      tree.afterburnRange = 0;
    }
  }
  if ((tree.afterburnUnlock || 0) <= 0) {
    tree.afterburnShield = 0;
    tree.afterburnDuration = 0;
    tree.afterburnSpeed = 0;
    tree.afterburnConvert = 0;
    tree.afterburnRange = 0;
  }
  if ((tree.infuseUnlock || 0) <= 0) {
    tree.infuseDuration = 0;
    tree.infuseCadence = 0;
    tree.infusePayload = 0;
    tree.infuseCount = 0;
  }
  return tree;
}

function normalizeRocketPodSkillTree(raw, fallbackLevel = 0) {
  const tree = createDefaultRocketPodSkillTree();
  const source = raw && typeof raw === "object" ? raw : null;
  if (source) {
    tree.cooldown = clampInt(source.cooldown, 0, ROCKET_POD_TREE_LIMITS.cooldown);
    tree.clusterCount = clampInt(source.clusterCount, 0, ROCKET_POD_TREE_LIMITS.clusterCount);
    tree.explosionRadius = clampInt(source.explosionRadius, 0, ROCKET_POD_TREE_LIMITS.explosionRadius);
    tree.explosionDamage = clampInt(source.explosionDamage, 0, ROCKET_POD_TREE_LIMITS.explosionDamage);
    tree.shockDamage = clampInt(source.shockDamage, 0, ROCKET_POD_TREE_LIMITS.shockDamage);
    tree.shockDuration = clampInt(source.shockDuration, 0, ROCKET_POD_TREE_LIMITS.shockDuration);
    tree.turnRate = clampInt(source.turnRate, 0, ROCKET_POD_TREE_LIMITS.turnRate);
    tree.speed = clampInt(source.speed, 0, ROCKET_POD_TREE_LIMITS.speed);
    tree.life = clampInt(source.life, 0, ROCKET_POD_TREE_LIMITS.life);
    tree.afterburnUnlock = clampInt(source.afterburnUnlock, 0, ROCKET_POD_TREE_LIMITS.afterburnUnlock);
    tree.afterburnShield = clampInt(source.afterburnShield, 0, ROCKET_POD_TREE_LIMITS.afterburnShield);
    tree.afterburnDuration = clampInt(source.afterburnDuration, 0, ROCKET_POD_TREE_LIMITS.afterburnDuration);
    tree.afterburnSpeed = clampInt(source.afterburnSpeed, 0, ROCKET_POD_TREE_LIMITS.afterburnSpeed);
    tree.afterburnConvert = clampInt(source.afterburnConvert, 0, ROCKET_POD_TREE_LIMITS.afterburnConvert);
    tree.afterburnRange = clampInt(source.afterburnRange, 0, ROCKET_POD_TREE_LIMITS.afterburnRange);
    tree.infuseUnlock = clampInt(source.infuseUnlock, 0, ROCKET_POD_TREE_LIMITS.infuseUnlock);
    tree.infuseDuration = clampInt(source.infuseDuration, 0, ROCKET_POD_TREE_LIMITS.infuseDuration);
    tree.infuseCadence = clampInt(source.infuseCadence, 0, ROCKET_POD_TREE_LIMITS.infuseCadence);
    tree.infusePayload = clampInt(source.infusePayload, 0, ROCKET_POD_TREE_LIMITS.infusePayload);
    tree.infuseCount = clampInt(source.infuseCount, 0, ROCKET_POD_TREE_LIMITS.infuseCount);
    return enforceRocketPodBranchChoice(tree);
  }

  const legacy = clampInt(fallbackLevel, 0, MAX_LEVEL);
  tree.cooldown = clampInt(Math.floor(legacy * 0.19), 0, ROCKET_POD_TREE_LIMITS.cooldown);
  tree.clusterCount = clampInt(Math.floor(legacy * 0.13), 0, ROCKET_POD_TREE_LIMITS.clusterCount);
  tree.explosionRadius = clampInt(Math.floor(legacy * 0.23), 0, ROCKET_POD_TREE_LIMITS.explosionRadius);
  tree.explosionDamage = clampInt(Math.floor(legacy * 0.24), 0, ROCKET_POD_TREE_LIMITS.explosionDamage);
  tree.shockDamage = clampInt(Math.floor(legacy * 0.16), 0, ROCKET_POD_TREE_LIMITS.shockDamage);
  tree.shockDuration = clampInt(Math.floor(legacy * 0.11), 0, ROCKET_POD_TREE_LIMITS.shockDuration);
  tree.turnRate = clampInt(Math.floor(legacy * 0.12), 0, ROCKET_POD_TREE_LIMITS.turnRate);
  tree.speed = clampInt(Math.floor(legacy * 0.12), 0, ROCKET_POD_TREE_LIMITS.speed);
  tree.life = clampInt(Math.floor(legacy * 0.1), 0, ROCKET_POD_TREE_LIMITS.life);
  tree.afterburnUnlock = 0;
  tree.afterburnShield = 0;
  tree.afterburnDuration = 0;
  tree.afterburnSpeed = 0;
  tree.afterburnConvert = 0;
  tree.afterburnRange = 0;
  tree.infuseUnlock = 0;
  tree.infuseDuration = 0;
  tree.infuseCadence = 0;
  tree.infusePayload = 0;
  tree.infuseCount = 0;
  return enforceRocketPodBranchChoice(tree);
}

function getRocketPodTreeTotalLevel(tree) {
  if (!tree) return 0;
  return [
    tree.cooldown,
    tree.clusterCount,
    tree.explosionRadius,
    tree.explosionDamage,
    tree.shockDamage,
    tree.shockDuration,
    tree.turnRate,
    tree.speed,
    tree.life,
    tree.afterburnUnlock,
    tree.afterburnShield,
    tree.afterburnDuration,
    tree.afterburnSpeed,
    tree.afterburnConvert,
    tree.afterburnRange,
    tree.infuseUnlock,
    tree.infuseDuration,
    tree.infuseCadence,
    tree.infusePayload,
    tree.infuseCount,
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_LEVEL), 0);
}

function createDefaultVoidCounterSkillTree() {
  return {
    cooldown: 0,
    burstRadius: 0,
    burstDamage: 0,
    exileDuration: 0,
    teleporterDuration: 0,
    infectUnlock: 0,
    infectRadius: 0,
    infectInfusion: 0,
    infectLingering: 0,
    imprintUnlock: 0,
    imprintWindow: 0,
    imprintCharges: 0,
    imprintInfusion: 0,
  };
}

function enforceVoidCounterBranchChoice(tree) {
  if (!tree) return tree;
  const infectionScore = (tree.infectUnlock || 0) + (tree.infectRadius || 0) + (tree.infectInfusion || 0) + (tree.infectLingering || 0);
  const imprintScore = (tree.imprintUnlock || 0) + (tree.imprintWindow || 0) + (tree.imprintCharges || 0) + (tree.imprintInfusion || 0);
  if ((tree.infectUnlock || 0) > 0 && (tree.imprintUnlock || 0) > 0) {
    if (infectionScore >= imprintScore) {
      tree.imprintUnlock = 0;
      tree.imprintWindow = 0;
      tree.imprintCharges = 0;
      tree.imprintInfusion = 0;
    } else {
      tree.infectUnlock = 0;
      tree.infectRadius = 0;
      tree.infectInfusion = 0;
      tree.infectLingering = 0;
    }
  }
  if ((tree.infectUnlock || 0) <= 0) {
    tree.infectRadius = 0;
    tree.infectInfusion = 0;
    tree.infectLingering = 0;
  }
  if ((tree.imprintUnlock || 0) <= 0) {
    tree.imprintWindow = 0;
    tree.imprintCharges = 0;
    tree.imprintInfusion = 0;
  }
  return tree;
}

function normalizeVoidCounterSkillTree(raw, fallbackLevel = 0) {
  const tree = createDefaultVoidCounterSkillTree();
  const source = raw && typeof raw === "object" ? raw : null;
  if (source) {
    tree.cooldown = clampInt(source.cooldown, 0, VOID_COUNTER_TREE_LIMITS.cooldown);
    tree.burstRadius = clampInt(source.burstRadius, 0, VOID_COUNTER_TREE_LIMITS.burstRadius);
    tree.burstDamage = clampInt(source.burstDamage, 0, VOID_COUNTER_TREE_LIMITS.burstDamage);
    tree.exileDuration = clampInt(source.exileDuration, 0, VOID_COUNTER_TREE_LIMITS.exileDuration);
    tree.teleporterDuration = clampInt(source.teleporterDuration, 0, VOID_COUNTER_TREE_LIMITS.teleporterDuration);
    tree.infectUnlock = clampInt(source.infectUnlock, 0, VOID_COUNTER_TREE_LIMITS.infectUnlock);
    tree.infectRadius = clampInt(source.infectRadius, 0, VOID_COUNTER_TREE_LIMITS.infectRadius);
    tree.infectInfusion = clampInt(source.infectInfusion, 0, VOID_COUNTER_TREE_LIMITS.infectInfusion);
    tree.infectLingering = clampInt(source.infectLingering, 0, VOID_COUNTER_TREE_LIMITS.infectLingering);
    tree.imprintUnlock = clampInt(source.imprintUnlock, 0, VOID_COUNTER_TREE_LIMITS.imprintUnlock);
    tree.imprintWindow = clampInt(source.imprintWindow, 0, VOID_COUNTER_TREE_LIMITS.imprintWindow);
    tree.imprintCharges = clampInt(source.imprintCharges, 0, VOID_COUNTER_TREE_LIMITS.imprintCharges);
    tree.imprintInfusion = clampInt(source.imprintInfusion, 0, VOID_COUNTER_TREE_LIMITS.imprintInfusion);
  } else {
    const legacy = clampInt(fallbackLevel, 0, MAX_LEVEL);
    tree.cooldown = clampInt(Math.floor(legacy * 0.26), 0, VOID_COUNTER_TREE_LIMITS.cooldown);
    tree.burstRadius = clampInt(Math.floor(legacy * 0.22), 0, VOID_COUNTER_TREE_LIMITS.burstRadius);
    tree.burstDamage = clampInt(Math.floor(legacy * 0.24), 0, VOID_COUNTER_TREE_LIMITS.burstDamage);
    tree.exileDuration = clampInt(Math.floor(legacy * 0.16), 0, VOID_COUNTER_TREE_LIMITS.exileDuration);
    tree.teleporterDuration = clampInt(Math.floor(legacy * 0.12), 0, VOID_COUNTER_TREE_LIMITS.teleporterDuration);
    tree.infectUnlock = legacy >= 24 ? 1 : 0;
    tree.infectRadius = tree.infectUnlock ? clampInt(Math.floor((legacy - 24) * 0.2), 0, VOID_COUNTER_TREE_LIMITS.infectRadius) : 0;
    tree.infectInfusion = tree.infectUnlock ? clampInt(Math.floor((legacy - 28) * 0.16), 0, VOID_COUNTER_TREE_LIMITS.infectInfusion) : 0;
    tree.infectLingering = tree.infectUnlock ? clampInt(Math.floor((legacy - 32) * 0.14), 0, VOID_COUNTER_TREE_LIMITS.infectLingering) : 0;
  }
  return enforceVoidCounterBranchChoice(tree);
}

function getVoidCounterTreeTotalLevel(tree) {
  if (!tree) return 0;
  return [
    tree.cooldown,
    tree.burstRadius,
    tree.burstDamage,
    tree.exileDuration,
    tree.teleporterDuration,
    tree.infectUnlock,
    tree.infectRadius,
    tree.infectInfusion,
    tree.infectLingering,
    tree.imprintUnlock,
    tree.imprintWindow,
    tree.imprintCharges,
    tree.imprintInfusion,
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_LEVEL), 0);
}

function createDefaultAegisSkillTree() {
  return {
    duration: 0,
    cooldown: 0,
    storeCap: 0,
    beamDamage: 0,
    beamRadius: 0,
    beamControl: 0,
    beamSummon: 0,
  };
}

function normalizeAegisSkillTree(raw, fallbackLevel = 0) {
  const tree = createDefaultAegisSkillTree();
  const source = raw && typeof raw === "object" ? raw : null;
  if (source) {
    tree.duration = clampInt(source.duration, 0, AEGIS_TREE_LIMITS.duration);
    tree.cooldown = clampInt(source.cooldown, 0, AEGIS_TREE_LIMITS.cooldown);
    tree.storeCap = clampInt(source.storeCap, 0, AEGIS_TREE_LIMITS.storeCap);
    tree.beamDamage = clampInt(source.beamDamage, 0, AEGIS_TREE_LIMITS.beamDamage);
    tree.beamRadius = clampInt(source.beamRadius, 0, AEGIS_TREE_LIMITS.beamRadius);
    tree.beamControl = clampInt(source.beamControl, 0, AEGIS_TREE_LIMITS.beamControl);
    tree.beamSummon = clampInt(source.beamSummon, 0, AEGIS_TREE_LIMITS.beamSummon);
    return tree;
  }

  const legacy = clampInt(fallbackLevel, 0, MAX_LEVEL);
  tree.duration = clampInt(Math.floor(legacy * 0.22), 0, AEGIS_TREE_LIMITS.duration);
  tree.cooldown = clampInt(Math.floor(legacy * 0.2), 0, AEGIS_TREE_LIMITS.cooldown);
  tree.storeCap = clampInt(Math.floor(legacy * 0.2), 0, AEGIS_TREE_LIMITS.storeCap);
  tree.beamDamage = clampInt(Math.floor(legacy * 0.14), 0, AEGIS_TREE_LIMITS.beamDamage);
  tree.beamRadius = clampInt(Math.floor(legacy * 0.12), 0, AEGIS_TREE_LIMITS.beamRadius);
  tree.beamControl = clampInt(Math.floor(legacy * 0.12), 0, AEGIS_TREE_LIMITS.beamControl);
  tree.beamSummon = 0;
  return tree;
}

function getAegisTreeTotalLevel(tree) {
  if (!tree) return 0;
  return [
    tree.duration,
    tree.cooldown,
    tree.storeCap,
    tree.beamDamage,
    tree.beamRadius,
    tree.beamControl,
    tree.beamSummon,
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_LEVEL), 0);
}

function createDefaultBulwarkAnchorSkillTree() {
  return {
    cooldown: 0,
    radius: 0,
    duration: 0,
    reduction: 0,
    pulseDamage: 0,
    pulseRate: 0,
    barrierWidth: 0,
    trapDamage: 0,
    turretUnlock: 0,
    turretCount: 0,
    turretDamage: 0,
    turretRate: 0,
    turretTurn: 0,
    turretRange: 0,
  };
}

function normalizeBulwarkAnchorSkillTree(raw, fallbackLevel = 0) {
  const tree = createDefaultBulwarkAnchorSkillTree();
  const source = raw && typeof raw === "object" ? raw : null;
  if (source) {
    tree.cooldown = clampInt(source.cooldown, 0, BULWARK_ANCHOR_TREE_LIMITS.cooldown);
    tree.radius = clampInt(source.radius, 0, BULWARK_ANCHOR_TREE_LIMITS.radius);
    tree.duration = clampInt(source.duration, 0, BULWARK_ANCHOR_TREE_LIMITS.duration);
    tree.reduction = clampInt(Number.isFinite(Number(source.reduction)) ? source.reduction : source.damageReduction, 0, BULWARK_ANCHOR_TREE_LIMITS.reduction);
    tree.pulseDamage = clampInt(source.pulseDamage, 0, BULWARK_ANCHOR_TREE_LIMITS.pulseDamage);
    tree.pulseRate = clampInt(Number.isFinite(Number(source.pulseRate)) ? source.pulseRate : source.pulseInterval, 0, BULWARK_ANCHOR_TREE_LIMITS.pulseRate);
    tree.barrierWidth = clampInt(source.barrierWidth, 0, BULWARK_ANCHOR_TREE_LIMITS.barrierWidth);
    tree.trapDamage = clampInt(Number.isFinite(Number(source.trapDamage)) ? source.trapDamage : source.trapDamageBonus, 0, BULWARK_ANCHOR_TREE_LIMITS.trapDamage);
    tree.turretUnlock = clampInt(source.turretUnlock, 0, BULWARK_ANCHOR_TREE_LIMITS.turretUnlock);
    tree.turretCount = clampInt(source.turretCount, 0, BULWARK_ANCHOR_TREE_LIMITS.turretCount);
    tree.turretDamage = clampInt(source.turretDamage, 0, BULWARK_ANCHOR_TREE_LIMITS.turretDamage);
    tree.turretRate = clampInt(source.turretRate, 0, BULWARK_ANCHOR_TREE_LIMITS.turretRate);
    tree.turretTurn = clampInt(source.turretTurn, 0, BULWARK_ANCHOR_TREE_LIMITS.turretTurn);
    tree.turretRange = clampInt(source.turretRange, 0, BULWARK_ANCHOR_TREE_LIMITS.turretRange);
    if (tree.turretUnlock <= 0) {
      tree.turretCount = 0;
      tree.turretDamage = 0;
      tree.turretRate = 0;
      tree.turretTurn = 0;
      tree.turretRange = 0;
    }
    return tree;
  }

  const legacy = clampInt(fallbackLevel, 0, MAX_LEVEL);
  tree.cooldown = clampInt(Math.floor(legacy * 0.22), 0, BULWARK_ANCHOR_TREE_LIMITS.cooldown);
  tree.radius = clampInt(Math.floor(legacy * 0.24), 0, BULWARK_ANCHOR_TREE_LIMITS.radius);
  tree.duration = clampInt(Math.floor(legacy * 0.18), 0, BULWARK_ANCHOR_TREE_LIMITS.duration);
  tree.reduction = clampInt(Math.floor(legacy * 0.14), 0, BULWARK_ANCHOR_TREE_LIMITS.reduction);
  tree.pulseDamage = clampInt(Math.floor(legacy * 0.2), 0, BULWARK_ANCHOR_TREE_LIMITS.pulseDamage);
  tree.pulseRate = clampInt(Math.floor(legacy * 0.14), 0, BULWARK_ANCHOR_TREE_LIMITS.pulseRate);
  tree.barrierWidth = clampInt(Math.floor(legacy * 0.16), 0, BULWARK_ANCHOR_TREE_LIMITS.barrierWidth);
  tree.trapDamage = clampInt(Math.floor(legacy * 0.12), 0, BULWARK_ANCHOR_TREE_LIMITS.trapDamage);
  tree.turretUnlock = legacy >= 22 ? 1 : 0;
  tree.turretCount = tree.turretUnlock ? clampInt(Math.floor((legacy - 22) * 0.18), 0, BULWARK_ANCHOR_TREE_LIMITS.turretCount) : 0;
  tree.turretDamage = tree.turretUnlock ? clampInt(Math.floor((legacy - 24) * 0.2), 0, BULWARK_ANCHOR_TREE_LIMITS.turretDamage) : 0;
  tree.turretRate = tree.turretUnlock ? clampInt(Math.floor((legacy - 26) * 0.18), 0, BULWARK_ANCHOR_TREE_LIMITS.turretRate) : 0;
  tree.turretTurn = tree.turretUnlock ? clampInt(Math.floor((legacy - 26) * 0.14), 0, BULWARK_ANCHOR_TREE_LIMITS.turretTurn) : 0;
  tree.turretRange = tree.turretUnlock ? clampInt(Math.floor((legacy - 28) * 0.12), 0, BULWARK_ANCHOR_TREE_LIMITS.turretRange) : 0;
  return tree;
}

function getBulwarkAnchorTreeTotalLevel(tree) {
  if (!tree) return 0;
  return [
    tree.cooldown,
    tree.radius,
    tree.duration,
    tree.reduction,
    tree.pulseDamage,
    tree.pulseRate,
    tree.barrierWidth,
    tree.trapDamage,
    tree.turretUnlock,
    tree.turretCount,
    tree.turretDamage,
    tree.turretRate,
    tree.turretTurn,
    tree.turretRange,
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_LEVEL), 0);
}

function createDefaultComboLinkSkillTree() {
  return {
    comboGain: 0,
    comboCap: 0,
    comboWindow: 0,
  };
}

function normalizeComboLinkSkillTree(raw, fallbackLevel = 0) {
  const tree = createDefaultComboLinkSkillTree();
  const source = raw && typeof raw === "object" ? raw : null;
  if (source) {
    tree.comboGain = clampInt(source.comboGain, 0, COMBO_LINK_TREE_LIMITS.comboGain);
    tree.comboCap = clampInt(source.comboCap, 0, COMBO_LINK_TREE_LIMITS.comboCap);
    tree.comboWindow = clampInt(source.comboWindow, 0, COMBO_LINK_TREE_LIMITS.comboWindow);
    return tree;
  }

  const legacy = clampInt(fallbackLevel, 0, MAX_LEVEL);
  tree.comboGain = clampInt(Math.floor(legacy * 0.34), 0, COMBO_LINK_TREE_LIMITS.comboGain);
  tree.comboCap = clampInt(Math.floor(legacy * 0.38), 0, COMBO_LINK_TREE_LIMITS.comboCap);
  tree.comboWindow = clampInt(Math.floor(legacy * 0.34), 0, COMBO_LINK_TREE_LIMITS.comboWindow);
  return tree;
}

function getComboLinkTreeTotalLevel(tree) {
  if (!tree) return 0;
  return [
    tree.comboGain,
    tree.comboCap,
    tree.comboWindow,
  ].reduce((sum, value) => sum + clampInt(value, 0, MAX_LEVEL), 0);
}

function createDefaultSiegeSpikesSkillTree() {
  return {
    cooldown: 0,
    length: 0,
    duration: 0,
    touchDamage: 0,
    hitRate: 0,
    turretUnlock: 0,
    turretCount: 0,
    turretDamage: 0,
    turretRate: 0,
    turretTurn: 0,
    turretRange: 0,
    relayUnlock: 0,
    relayEfficiency: 0,
    relayConversion: 0,
    relayTracking: 0,
    relayWallCap: 0,
    relayRegen: 0,
  };
}

function normalizeSiegeSpikesBranchChoice(tree) {
  if (!tree || typeof tree !== "object") return;
  const turretScore = (tree.turretUnlock || 0)
    + (tree.turretCount || 0)
    + (tree.turretDamage || 0)
    + (tree.turretRate || 0)
    + (tree.turretTurn || 0)
    + (tree.turretRange || 0);
  const relayScore = (tree.relayUnlock || 0)
    + (tree.relayEfficiency || 0)
    + (tree.relayConversion || 0)
    + (tree.relayTracking || 0)
    + (tree.relayWallCap || 0)
    + (tree.relayRegen || 0);

  if (tree.turretUnlock > 0 && tree.relayUnlock > 0) {
    if (relayScore > turretScore) {
      tree.turretUnlock = 0;
      tree.turretCount = 0;
      tree.turretDamage = 0;
      tree.turretRate = 0;
      tree.turretTurn = 0;
      tree.turretRange = 0;
    } else {
      tree.relayUnlock = 0;
      tree.relayEfficiency = 0;
      tree.relayConversion = 0;
      tree.relayTracking = 0;
      tree.relayWallCap = 0;
      tree.relayRegen = 0;
    }
  }

  if (tree.turretUnlock <= 0) {
    tree.turretCount = 0;
    tree.turretDamage = 0;
    tree.turretRate = 0;
    tree.turretTurn = 0;
    tree.turretRange = 0;
  }
  if (tree.relayUnlock <= 0) {
    tree.relayEfficiency = 0;
    tree.relayConversion = 0;
    tree.relayTracking = 0;
    tree.relayWallCap = 0;
    tree.relayRegen = 0;
  }
}

function normalizeSiegeSpikesSkillTree(raw, fallbackLevel = 0) {
  const tree = createDefaultSiegeSpikesSkillTree();
  const source = raw && typeof raw === "object" ? raw : null;
  if (source) {
    tree.cooldown = clampInt(source.cooldown, 0, SIEGE_SPIKES_TREE_LIMITS.cooldown);
    tree.length = clampInt(Number.isFinite(Number(source.length)) ? source.length : source.range, 0, SIEGE_SPIKES_TREE_LIMITS.length);
    tree.duration = clampInt(source.duration, 0, SIEGE_SPIKES_TREE_LIMITS.duration);
    tree.touchDamage = clampInt(Number.isFinite(Number(source.touchDamage)) ? source.touchDamage : source.damage, 0, SIEGE_SPIKES_TREE_LIMITS.touchDamage);
    tree.hitRate = clampInt(Number.isFinite(Number(source.hitRate)) ? source.hitRate : source.hitInterval, 0, SIEGE_SPIKES_TREE_LIMITS.hitRate);
    tree.turretUnlock = clampInt(source.turretUnlock, 0, SIEGE_SPIKES_TREE_LIMITS.turretUnlock);
    tree.turretCount = clampInt(source.turretCount, 0, SIEGE_SPIKES_TREE_LIMITS.turretCount);
    tree.turretDamage = clampInt(source.turretDamage, 0, SIEGE_SPIKES_TREE_LIMITS.turretDamage);
    tree.turretRate = clampInt(source.turretRate, 0, SIEGE_SPIKES_TREE_LIMITS.turretRate);
    tree.turretTurn = clampInt(source.turretTurn, 0, SIEGE_SPIKES_TREE_LIMITS.turretTurn);
    tree.turretRange = clampInt(source.turretRange, 0, SIEGE_SPIKES_TREE_LIMITS.turretRange);
    const legacyDrawBoost = clampInt(source.drawBoost, 0, SIEGE_SPIKES_TREE_LIMITS.drawBoost);
    if (legacyDrawBoost > 0) {
      tree.length = clampInt(tree.length + legacyDrawBoost, 0, SIEGE_SPIKES_TREE_LIMITS.length);
    }
    tree.relayUnlock = clampInt(source.relayUnlock, 0, SIEGE_SPIKES_TREE_LIMITS.relayUnlock);
    tree.relayEfficiency = clampInt(source.relayEfficiency, 0, SIEGE_SPIKES_TREE_LIMITS.relayEfficiency);
    tree.relayConversion = clampInt(source.relayConversion, 0, SIEGE_SPIKES_TREE_LIMITS.relayConversion);
    tree.relayTracking = clampInt(source.relayTracking, 0, SIEGE_SPIKES_TREE_LIMITS.relayTracking);
    tree.relayWallCap = clampInt(source.relayWallCap, 0, SIEGE_SPIKES_TREE_LIMITS.relayWallCap);
    tree.relayRegen = clampInt(source.relayRegen, 0, SIEGE_SPIKES_TREE_LIMITS.relayRegen);
    normalizeSiegeSpikesBranchChoice(tree);
    return tree;
  }

  const legacy = clampInt(fallbackLevel, 0, MAX_LEVEL);
  tree.cooldown = clampInt(Math.floor(legacy * 0.24), 0, SIEGE_SPIKES_TREE_LIMITS.cooldown);
  tree.length = clampInt(Math.floor(legacy * 0.24), 0, SIEGE_SPIKES_TREE_LIMITS.length);
  tree.duration = clampInt(Math.floor(legacy * 0.2), 0, SIEGE_SPIKES_TREE_LIMITS.duration);
  tree.touchDamage = clampInt(Math.floor(legacy * 0.24), 0, SIEGE_SPIKES_TREE_LIMITS.touchDamage);
  tree.hitRate = clampInt(Math.floor(legacy * 0.16), 0, SIEGE_SPIKES_TREE_LIMITS.hitRate);
  tree.turretUnlock = legacy >= 22 ? 1 : 0;
  tree.turretCount = tree.turretUnlock ? clampInt(Math.floor((legacy - 22) * 0.16), 0, SIEGE_SPIKES_TREE_LIMITS.turretCount) : 0;
  tree.turretDamage = tree.turretUnlock ? clampInt(Math.floor((legacy - 24) * 0.2), 0, SIEGE_SPIKES_TREE_LIMITS.turretDamage) : 0;
  tree.turretRate = tree.turretUnlock ? clampInt(Math.floor((legacy - 26) * 0.16), 0, SIEGE_SPIKES_TREE_LIMITS.turretRate) : 0;
  tree.turretTurn = tree.turretUnlock ? clampInt(Math.floor((legacy - 26) * 0.14), 0, SIEGE_SPIKES_TREE_LIMITS.turretTurn) : 0;
  tree.turretRange = tree.turretUnlock ? clampInt(Math.floor((legacy - 28) * 0.12), 0, SIEGE_SPIKES_TREE_LIMITS.turretRange) : 0;
  const legacyDrawBoost = tree.turretUnlock ? clampInt(Math.floor((legacy - 24) * 0.18), 0, SIEGE_SPIKES_TREE_LIMITS.drawBoost) : 0;
  if (legacyDrawBoost > 0) {
    tree.length = clampInt(tree.length + legacyDrawBoost, 0, SIEGE_SPIKES_TREE_LIMITS.length);
  }
  tree.relayUnlock = 0;
  tree.relayEfficiency = 0;
  tree.relayConversion = 0;
  tree.relayTracking = 0;
  tree.relayWallCap = 0;
  tree.relayRegen = 0;
  normalizeSiegeSpikesBranchChoice(tree);
  return tree;
}

function getSiegeSpikesTreeTotalLevel(tree) {
  if (!tree) return 0;
  return [
    tree.cooldown,
    tree.length,
    tree.duration,
    tree.touchDamage,
    tree.hitRate,
    tree.turretUnlock,
    tree.turretCount,
    tree.turretDamage,
    tree.turretRate,
    tree.turretTurn,
    tree.turretRange,
    tree.relayUnlock,
    tree.relayEfficiency,
    tree.relayConversion,
    tree.relayTracking,
    tree.relayWallCap,
    tree.relayRegen,
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

