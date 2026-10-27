# Hollowstead v0.3.0 QA Report
Date: 2026-10-26. Build: commit `b5b8931` (www/ sim.js + game.js). Nothing was fixed; this is documentation only.

## How it was tested
- **`qa/sim_qa.js`**: a headless Node harness with about 40 targeted scenarios plus long unattended and scripted "competent player" runs. It finishes in about 9 s. Raw output: `qa/sim_qa_output.txt`.
- **`qa/browser_qa.js`**: Playwright Chromium runs at portrait 390×844, landscape 844×390 and small 320×568, at 2× DPR. Output: `qa/browser_qa_output.txt`. Screenshots are in `qa/screens/` (31 PNGs), and I looked at all of them.
- To re-run: `python3 -m http.server 8765 -d www &` then `node qa/sim_qa.js && node qa/browser_qa.js`.

### Systems covered
| System | Result |
|---|---|
| Pathfinding (walk, fall, ladder climb, unreachable jobs, digging under feet) | Works, with 2 bugs (B1, B4) |
| O₂/CO₂ diffusion and conservation | Pass: mass conserved exactly over 200 s, with no negative or NaN values |
| CO₂ sinking | **Fail** (B3) |
| Aerator (power gate, lichen use, 1.8 overpressure stop) | Pass |
| Scrubber | Pass (it nets out O₂ negative, see the balance section) |
| Food, eating, farms, soil rule | Pass |
| Battery and Dynamo (auto crank jobs, idle with no consumers) | Pass |
| Heat and Cooler, heatstroke | Pass (the Cooler deletes heat instead of moving it, which is a design note) |
| Germs, Grey Cough, Med Cot (recovers in 22.8 s vs 90 s), 3 sick settlers sharing 1 cot | Pass |
| Stress, Couch (80 down to 15 in 8.6 s), breakdowns | Pass, with a breakdown loop (B6) |
| Research (prerequisites, unlocks, re-picking a finished tech, switching) | Pass, with a minor issue (B9) |
| Priorities (p9 before p1, setPri on a taken job) | Pass |
| Save/load (size, determinism, bad version, carried lichen) | Pass (deterministic to 3 decimals). See B7 and B8 |
| Game over and New colony | Pass |
| UI portrait, landscape and 320 px; overlays; research panel; toolbar scroll | Several issues (V1–V8) |
| Pinch zoom | **Not verifiable headless.** Synthetic PointerEvents make `setPointerCapture` throw (see B10). It still needs a real-device test. |

## Bugs
Severity scale: **Critical** means a run is lost or unwinnable through no fault of the player. **High** means it seriously hurts play. **Medium** is noticeable. **Low** is cosmetic or an edge case.

| # | Sev | Bug | Repro | Evidence |
|---|---|---|---|---|
| B1 | **Critical** | **Settlers dig themselves into pits and get permanently stuck.** Digging is allowed up to 2 tiles below the standing tile (`near()` uses `dy<=2`), so settlers dig through the floor and fall in. With no ladder they can't climb out, and they sit "idle" forever while reachable jobs pile up untaken. | Queue digs in a column below the chamber floor (`cy+3..cy+8`), or play normally and dig downward. | Competent-player v1 run, seed 42 at t=200 s: two settlers at y=31 (9 tiles below the floor), idle, with supply/harvest/build jobs unassigned. The colony died of hunger and suffocation at 449 s. A scenario also confirmed a tile 2 below a settler gets dug while the floor tile stays. |
| B2 | **High** | **There's no feedback for unreachable jobs.** Unreachable digs and builds stay queued silently forever, and settlers show "idle". A player can't tell whether the colony is stuck. | Queue a dig on an isolated cave wall. | The competent v2 runs stalled with about 6 unreachable digs queued. Stone sat at 2–3 for 15+ minutes and the colony died at 600–1149 s. Auto-cancelling digs left untaken for 30 s (v3) made all 3 seeds survive past 25 min. |
| B3 | **High** | **CO₂ doesn't sink; it ends up higher than at the floor.** The buoyancy term in `gasStep` swaps CO₂ the wrong way (`c-=sw` moves CO₂ from the lower cell up). | Start a colony, run 300 s, and compare CO₂ on the chamber's top and bottom rows. | Top row CO₂ was 10.93 and bottom row 4.18, the opposite of the intended design and the README. Settler heads sit in the CO₂ layer. |
| B4 | Medium | **Taps on the HUD panel pass through to the world** and queue jobs under it. | Select Dig and tap the top-left info panel. | 1 job was created in each of the 3 viewports. |
| B5 | Medium | **The Scrubber reduces total O₂** (it returns 0.8 O₂ per CO₂ while settlers exhale 0.6 CO₂ per O₂). Without lichen the colony is mathematically doomed. Combined with finite lichen, there's no sustainable air loop. | Scrubber scenario, and the competent v3 runs. | In v3 seeds 42 and 7, room O₂ fell to 0.18 and 0.09 by 1440 s after lichen hit 0 at about 1200 s, with a scrubber running. See the balance section. |
| B6 | Medium | **Breakdown loop.** After a breakdown, stress resets to 60, but if the cause (bad air, a crowded spot) remains, the settler breaks down again and again. | Competent v3 seed 42. | Bram had 10+ breakdowns in one run, and Toma 7 in a v2 run. The root cause of the stress source wasn't isolated; it's likely holding breath in a CO₂ layer (see B3). |
| B7 | Medium | **"New colony" doesn't clear or overwrite the save.** Autosave runs only every 30 s and is skipped while `S.over`. Reloading within 30 s of starting a new colony restores the previous colony's last autosave, which may be seconds from death. There's also no way to start fresh while a save exists. | Play past 30 s, die, tap New colony, then reload within 30 s. | Found by code inspection (`saveT` in `game.js`). The browser run died before the first autosave, so it loaded a fresh game. |
| B8 | Low | **Save on game over / save of a dead colony.** Manual Save works while `S.over`, so the player can save a dead colony, which then auto-loads on every launch straight into the game-over screen. | Die, tap 💾 Save, then reload. | Code inspection. |
| B9 | Low | **Switching research discards progress.** `pickTech` resets `pts=0`. | Research Medicine to 20/30, then pick Leisure. | `switching tech resets points -> 0.0` |
| B10 | Low | **`setPointerCapture` can throw**, and it isn't in a try block. When it throws, the pointerdown handler aborts before recording the pointer, so that gesture is lost. This was seen with synthetic events and is rare on real devices, but it's a robustness gap. | Dispatch a synthetic PointerEvent. | A console error in every viewport. |
| B11 | Low | **Farms take up an aerator/pod row, and 1 of the 7 soil tiles is the Pod's**, so only 6 farm spots exist at the start. This isn't communicated. | Try to build 7 farms. | The scenario built 6. |
| B12 | Low | **Starting farm overproduction.** With 6 farms, food grows without limit (113–123 at 24 min). There's no storage cap, spoilage or use for surplus. | Competent v3. | See the balance section. |

## Visual and UI problems
| # | Viewport | Problem | Screenshot |
|---|---|---|---|
| V1 | Landscape | The two toolbar rows take about 110 px of 390 (28%). The camera starts centred, so **the chamber floor and settlers are hidden behind the toolbar**; one settler is fully covered. | `landscape_06_busy_4x.png` |
| V2 | 320 px | System-row labels clip or overlap ("Norma", "Resear", Save and Load icons collide); 4 labels are measured wider than their buttons. The Research row text runs off the panel. | `small_02_overlay*.png`, `small_03_research.png` |
| V3 | Portrait | "🔬 Research" label is wider than its button (67 vs 50 px). The speed buttons float over the map below the HUD. | `portrait_01_start.png` |
| V4 | All | The HUD panel is semi-transparent over the map and blocks taps (B4). The settler lines get long, and stress isn't color-coded per value. | `portrait_01_start.png` |
| V5 | All | The heat overlay tints solids and gas in the same pastel colors, so it reads as one wash with no legend or °C readout. The germ overlay has no legend either. | `*_02_overlay2.png`, `*_02_overlay3.png` |
| V6 | All | **Toolbar discoverability.** Swiping is the only way to reach Cooler, Set Prio and Cancel in portrait, and that takes 2 full swipes with no momentum. Only a 3 px scrollbar hints at it. No costs are shown on buttons. | `portrait_04_toolbar_scrolled.png` |
| V7 | All | **No tile inspector.** You can't tap a tile to see O₂, CO₂, temperature and germ numbers, or tap a settler to see their status. | — |
| V8 | All | Unreachable jobs look identical to active ones (B2), and dead settlers are only shown as grey sprites. The game-over screen has no stats beyond time. | `*_08_game_over.png` |
| V9 | All | The "Tap rock to dig…" and other toasts overlap the system row area in portrait at 320 px. | `small_01_start.png` |

## Balance findings (numbers)
**Air**
- A settler breathes 0.1 O₂/s and exhales 0.06 CO₂/s. The starting chamber holds about 102 O₂, which lasts about 340 s for 3 settlers with no aerator.
- **Unattended colony:** every seed dies at **371–393 s** (6.2–6.5 min) from suffocation, with breakdowns first.
- **Aerator:** +33 O₂ per 60 s (0.55/s) for 0.12 lichen/s, so 1 lichen ≈ 4.6 O₂. It uses about 6 power/s. The tile heats to about 28°C, and overpressure caps the tile at 1.79.
- **Lichen supply:** maps hold 193–337 lichen tiles (772–1348 units), so one aerator could run for about 107–187 min if all of it could be mined. In practice the starting band yields far less: v3 runs **ran out of lichen at about 20 min (seed 42/7)**, after which room O₂ fell 0.71 → 0.18 (seed 42) and 0.54 → 0.09 (seed 7).
- **Scrubber:** −0.7 CO₂ / +0.6 O₂ per 60 s in the test room. That's tiny next to 3 settlers' 0.3 O₂/s demand, and it can't sustain air (B5).

**Food**
- 3 settlers eat 2.4 food/min. A powered farm makes 1.33/min, and an unpowered one 0.53/min. **2 powered farms is break-even**, and 6 farms gave a large surplus (113–123 food by 24 min).
- With no food the colony starves at **179 s**, and 10 starting food lasts about 4 min.

**Power**
- The battery stayed at 600–980 in every run, and the Dynamo is cranked about 25 s at a time. **Power is never a real constraint.**

**Heat**
- The chamber settles at **28–29.5°C** in every long run, never reaching the 35°C stress threshold.
- At 50°C, settlers die of heatstroke in under 60 s.
- The Cooler brought a 40°C room to an average of 28°C in 120 s. **Heat is currently flavor, not pressure.**

**Germs and stress**
- In 200-germ air, the first infection came at 14.6 s and all 3 settlers got sick. Recovery took 90 s unaided or 22.8 s on a Med Cot.
- One sick settler did not infect others in 300 s. **Disease is mild.**
- **Stress:** a busy, healthy colony stays near 0 because working adds +0.45/s and idling −0.4/s. Stress spikes come almost entirely from bad air.

**Research and economy**
- With one researcher, Air Scrubbing finished in 33.8 s, so the whole tree takes about 2.5 min. **Research is too fast or cheap.**
- **Stone is the real early bottleneck.** Stone hovered at 0–4 during the first 10 minutes in v1/v2 runs, delaying the Desk and Scrubber.

**Competent-player survival (25-min target)**
| Script version | Seed 42 | Seed 7 | Seed 123 |
|---|---|---|---|
| v1: naive digging, including downward | died 449 s | died 866 s | died 863 s |
| v2: horizontal tunnels only | died 1149 s | died 982 s | died 600 s |
| v3: v2 plus cancelling stuck digs | **alive at 1500 s** (O₂ falling) | **alive at 1500 s** (O₂ 0.09) | **alive at 1500 s** (O₂ 1.09) |

The game is survivable past 20 minutes only with player-side workarounds for B1 and B2, and 2 of 3 seeds were heading toward suffocation at the 25-minute mark.

**Performance:** 60 unreachable jobs cost about 1.6 ms per simulated second, so it's fine at 4×. BFS uses `Array.shift`, which is O(n²); this is worth fixing before larger maps.

## Top improvement suggestions (ranked)
1. **Fix B1 (pits).** Limit digging reach to `dy` of −2..+1 so settlers never dig below their feet, or auto-queue a ladder. Add a "stuck" check where a settler with no path to any job or the Pod shows "trapped!".
2. **Fix B3 (CO₂ buoyancy sign).** It's a one-line fix, but it changes the whole air game, so re-balance afterward.
3. **Show unreachable jobs (B2).** Grey or red dashed outlines and an "unreachable" toast after N seconds, and optionally auto-unassign.
4. **A sustainable O₂ loop.** Make lichen renewable (a Lichen Bed that grows lichen on soil using CO₂), or make the Scrubber ≥1:1, so long games are possible and the finite-lichen clock becomes a mid-game goal rather than certain death.
5. **Landscape layout (V1).** Collapse the system row into a single ☰ menu, or move it to a side rail in landscape. Start the camera offset so the floor sits above the toolbar.
6. **Block world taps under UI (B4)** for the HUD and panels, and add a **tile and settler inspector** on long-press (V7).
7. **Save UX (B7, B8).** "New colony" should write a fresh save immediately. Add a title screen with Continue and New, and don't autoload a dead colony.
8. **Retune pressure systems.** Make research cost about 3× more, make power matter (e.g. the Aerator draws 15/s, or add a battery-drain building), make heat build up (bigger heat output, deeper hot biomes), and make germs spread person-to-person.
9. **Small-screen labels (V2, V3).** Use icon-only buttons below 70 px width, and wrap research row text.
10. **Make `setPointerCapture` try/catch-safe (B10)** and do a real-device pinch-zoom test on Android.

## Artifacts
- `QA_REPORT.md` (this file)
- `qa/sim_qa.js` and `qa/sim_qa_output.txt`
- `qa/browser_qa.js` and `qa/browser_qa_output.txt`
- `qa/screens/` contains 31 screenshots (portrait, landscape and 320 px): start, 3 overlays, research panel, scrolled toolbar, pinch, busy at 4×, low air, game over and corrupt save.

---
# v0.4.0 fix verification (2026-10-26)
| QA item | Fix | Verified by |
|---|---|---|
| B3 CO₂ rose instead of sinking | The swap sign in `gasStep` is flipped. Settlers breathe the better of their body tile and head tile. | `qa/fix_checks.js`: bottom row CO₂ 6.96 vs top row 0.92 |
| B5 no sustainable air | The Scrubber is 1:1 and unlocked at start. New O₂ Vat (power → O₂, research "Air Synthesis"). Dynamo output 40 → 60/s. | Scrubber CO₂ −17.6 / O₂ +17.6 per min. Vat +18 O₂/min. |
| B1 pits / trapped settlers | Dig reach no longer allows straight-below-feet. A flood-fill reachability check every 2 s flags trapped settlers (red ! and log message). | fix_checks: rule, trapped flag set and cleared by a ladder |
| B2 unreachable jobs | Jobs get an `unr` flag and a red ✕ outline, the HUD counts them, and settlers skip them. BFS queue is now O(n). | fix_checks; perf 0.98 ms per sim-second with 60 unreachable jobs |
| B4 HUD taps reached the map | Taps inside the HUD rectangle are ignored. | browser: 0 jobs created in all 3 viewports |
| B6 breakdown loop | After a breakdown, stress resets to 30, then a 120 s calm period caps stress at 90 and cuts stress gain to 30%. | fix_checks: no second breakdown under continuous stress |
| B7/B8 save issues | New colony saves immediately. You can't manually save a dead colony, and a dead colony isn't autoloaded. | `qa/browser_newcolony.js` |
| B9 research progress lost | Progress is kept per tech. | fix_checks |
| B10 pointer capture | Wrapped in try/catch. | Synthetic pinch now zooms 28 → 80 with no JS errors |
| Starvation while seeking air | Settlers eat when below 150 kcal even while short of air. | competent runs: 0 starvation deaths |
| V2/V3 labels | Narrow system buttons show only their icon. | screenshots `small_*`, `portrait_*` |
| Win condition | Win at Cycle 20 with everyone alive, with a victory overlay and Keep playing. | fix_checks and `portrait_11_victory.png` |

**Competent player (`qa/competent_v4.js`, 2700 s = 45 min):**

| Seed | Settlers alive | Won | Room O₂ minimum (whole run) | Room O₂ minimum (after 10 min) | Breakdowns |
|---|---|---|---|---|---|
| 42 | 3/3 | yes | 0.84 | 1.45 | 0 |
| 7 | 3/3 | yes | 0.67 | 1.32 | 0 |
| 123 | 3/3 | yes | 0.92 | 1.71 | 0 |

**Unattended colonies still lose:** seeds 42, 7 and 123 fell at 252 s, 223 s and 254 s.

**Not fixed (not blocking a win):** V1 (landscape toolbar height, which is only mitigated by starting the camera lower), V5 (overlay legends), V6 (toolbar discoverability), V7 (tile inspector), B11 and B12, and the heat, power and research tuning.
