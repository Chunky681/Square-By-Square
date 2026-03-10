# Rift Run

Browser survival game with ID-based player profiles and no password login.

## Core Loop

1. Enter a `Player ID`.
2. Existing ID loads that profile. New ID creates one.
3. Choose difficulty `1-10`.
4. From menu: choose `Play` or `Upgrade`.
5. Survive for 1:00.

## Save Rules

- Survive 1:00: run rewards are committed to your profile.
- Die before 1:00: run rewards are discarded and profile rolls back to pre-run state.

## Combat Features

- Fast movement + dash`r`n- Kill XP is granted immediately, plus extra bonus XP when dropped orbs are collected
- Mouse aim and firing
- Difficulty-scaled enemy health/speed/spawn rates
- High-tier enemy variants at harder difficulties (`berserker`, `tank`, `phantom`)
- Crits, multishot, regen, armor, loot magnet, and projectile range effects
- Web Audio sound effects for shooting, hits, kills, dash, upgrades, and results

## Upgrades

- 10 upgrade categories
- Each upgrade scales from level `0` to `50`
- Costs scale progressively with level

## Controls

- `WASD` / Arrow keys: move
- Mouse: aim
- Left mouse: fire
- `Space`: dash

## Run Locally

```powershell
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).


