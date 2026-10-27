# Hollowstead

Hollowstead is an original 2D side-view colony-survival game for mobile, inspired by Oxygen Not Included. It uses no Klei assets, names, or trademarks. You guide three settlers carving a home inside a hollow asteroid, where every tile tracks oxygen, CO₂, heat, and germs. You don't control the settlers directly: you queue jobs and they keep themselves alive while they work.

It is built with HTML5 canvas and plain JavaScript (an installable PWA) and wrapped for Android with Capacitor 6.

## Features
- Procedural asteroid with pan, pinch-zoom, and tap-to-dig/build
- O₂ and CO₂ simulated per tile (CO₂ sinks), plus heat and germ diffusion
- Settler needs: air, calories, stress, and health; disease (Grey Cough); breakdowns
- Job queue with player-set priorities from 1 to 9
- Food (farms), power (a Crank Dynamo and a shared battery), and lichen delivered by settlers to the Aerator
- Research tree: Scrubber, Med Cot, Couch, and Cooler
- Pause and 1×/2×/4× speed, plus save/load (autosaves to localStorage)

## Quick start
```bash
git clone https://github.com/Eathercrackout/hollowstead && cd hollowstead
python3 -m http.server 8080 -d www     # then open http://localhost:8080 (or your LAN IP on a phone)
```

## Build the Android APK
You need Node 18 or newer, JDK 17, and the Android SDK (platform 34 and build-tools 34).
```bash
npm install
export JAVA_HOME=/path/to/jdk17 ANDROID_HOME=/path/to/android-sdk   # or create android/local.properties with sdk.dir=...
npx cap sync android
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```
The prebuilt debug APK is attached to the latest GitHub Release.

---
## Goal
**Win:** reach Cycle 20 (1 cycle = 120 s, so 40 minutes of game time) with all 3 settlers alive. You can keep playing after you win. **Lose:** every settler dies.

## v0.5.0 look and UI
v0.5.0 replaces the flat-colour visuals with an original hand-drawn cutaway style.
- **Art:** procedural layered rock, soil and lichen textures with outlines and shading, plus soft translucent gas (light-blue O₂, dark-grey CO₂). Buildings are rounded and chunky. Settlers have round heads, blink, bob while idle and change expression with stress. The background is a dark vignette.
- **UI:**
  - A bottom category bar (Dig / Base / Oxygen / Food / Power / Colony / Tools / Menu) opens building menus showing each building's cost.
  - A colony vitals panel sits top-left, and the speed and overlay cluster (Normal / O₂ / Heat / Germs) sits top-right.
  - Tapping a tile or settler opens an inspector card.
- **Performance:** tile art is pre-rendered and only redrawn when tiles change. Gas is drawn as a 1-pixel-per-tile image that is smoothed and scaled. The headless browser holds 60 fps at 4×.

## v0.4.0 air loop
- CO₂ sinks and O₂ rises. Settlers breathe from their own tile or the tile above it, whichever has more O₂.
- The **Scrubber** is available from the start. It turns CO₂ into O₂ 1:1 and uses 5 power/s.
- **Air Synthesis** research (60 pts) unlocks the **O₂ Vat** (15 stone). It makes 0.3 O₂/s from power alone (8/s) and stops above a gas pressure of 1.8. A Scrubber plus a Vat makes a sustainable air loop without lichen.
- Settlers can't dig straight below their feet (diagonal-down is fine). Trapped settlers get a red **!** and a "TRAPPED" label. Unreachable jobs show a red ✕, the HUD counts them, and settlers skip them.

## Gameplay
- The asteroid is a 60×44 grid of Stone, Soil, Lichen, and Bedrock tiles, with random caves. Some caves hold old air and some hold pockets of CO₂.
- Every open tile tracks how much O₂ and CO₂ it holds, and the gas spreads between tiles. CO₂ sinks and O₂ rises.
- Settlers take O₂ from the tile at their head and breathe out CO₂. If the air is too thin, they hold their breath and their breath bar drains. When it gets low, they drop their job and look for better air. At 0 they suffocate. When everyone is gone, the game is over and you can start a new colony.
- Work runs on a job queue. Idle settlers pick the nearest job they can reach (by path search). They can walk, fall, climb ladders, and step up 1-tile ledges.
- Digging gives resources: Stone gives +2 stone, Soil +1 stone, Lichen +4 lichen.
- Buildings:
  - Ladder costs 1 stone.
  - Lichen Aerator costs 10 stone. It burns lichen to make O₂ and stops when gas pressure on its tile is 1.8 or higher.

## Milestone 2 additions
- **Food:** each settler has calories (1000 max, about 150 s from full to empty). Below 350 kcal they eat 1 food (+500 kcal). At 0 kcal their health drains, and they starve after about 45 s.
- **Farm** (4 stone): build it on an open tile that sits on top of soil. A crop takes 90 s to grow with power and grows at 40% speed without it. Ripe crops create a harvest job worth +2 food.
- **Power:** the colony shares one battery (1000 capacity, no wires). The **Crank Dynamo** (8 stone) gets an operate job when the battery drops below 60%, and a settler cranks it at +40/s. The Aerator uses 6/s and Farms use 2/s.
- **Delivery:** the Aerator holds its own lichen. When it runs low, a supply job sends a settler to the Colony Pod (the purple dome) to fetch up to 4 lichen and carry it over.
- **Priorities:** jobs have hidden priorities, from highest to lowest: supply (7), then harvest and operate (6), then dig and build (5). Breathing and eating interrupt any job.

## Milestone 3 additions
- **Heat:** every tile has a temperature. Heat spreads quickly through gas and slowly through rock, and deeper tiles start warmer. The Aerator, a Dynamo being cranked, the Scrubber and settlers all add heat, and the Cooler removes it. Settlers get stressed above 35°C or below 6°C and lose health above 45°C.
- **Germs and disease:** germs spread through gas and slowly die off. Old CO₂ pockets start out full of germs. Breathing germy air builds exposure until a settler catches *Grey Cough*. A sick settler works at half speed, uses more O₂ and spreads germs. They recover after about 90 s, or about 4× faster resting on a Med Cot.
- **Stress (0–100):** it goes up from holding breath, hunger, sickness, bad temperatures and working, and goes down while idle. A settler above 70 heads to a Couch if one exists (−8/s). At 100 they break down and do nothing for 20 s.
- **Research:** a Research Desk (6 stone) gets research jobs while a tech is selected (tap 🔬 Research). Tech tree:
  - Air Synthesis (60 pts) unlocks the O₂ Vat.
  - Field Medicine (30 pts) unlocks the Med Cot.
  - Leisure (40 pts) unlocks the Couch.
  - Thermal Control (50 pts, needs Air Synthesis) unlocks the Cooler.
- **Priorities (1–9):** P− / P / P+ set the priority for new jobs, and the 🔢 Set Prio tool changes an existing job's priority. Settlers do the highest-priority job they can reach first, nearest first. Breathing, eating, a Med Cot when sick and a Couch when stressed come before any job.
- **Save/Load:** the game saves to localStorage automatically every 30 s, and there are 💾/📂 buttons. A saved colony loads automatically when you start the game.
- **Start:** 30 stone (enough for an Aerator, a Farm and a Dynamo) and 10 food.
- **Toolbar:** the tool row scrolls sideways (swipe it), with a fixed system row above it. It fits portrait and landscape.

## Controls
- Tap with the selected tool: Dig, Ladder, Aerator, or Cancel.
- Drag with one finger to pan. Pinch to zoom (mouse wheel on desktop).
- O₂ View turns on the gas overlay.
- The top-right buttons pause and set speed to 1×, 2×, or 4×. On desktop, Space pauses and the 1, 2, and 4 keys set speed.

## Run in a browser
    python3 -m http.server 8080 -d www      # or: npx serve www
## Android (Capacitor 6, project in ./android)
Install the release APK with `adb install -r hollowstead-debug.apk`.
To rebuild:
    export JAVA_HOME=~/jdk ANDROID_HOME=~/android-sdk
    npm install && npx cap sync android && (cd android && ./gradlew assembleDebug)
The output is `android/app/build/outputs/apk/debug/app-debug.apk`.

## Code
- `www/sim.js`: the simulation (no DOM). You can run it headless in Node with `require('./www/sim.js')`.
- `www/game.js`: rendering and input.

## Planned milestones
Food, power, heat, germs and disease, research, stress, and save/load.
