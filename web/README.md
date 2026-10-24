# Tugui MVP-01

Requires Node.js 22.12+ and npm. From the repository root:

```sh
cd web
npm install
npm test
npm run build
npm run dev
```

Open the local URL Vite prints (normally http://127.0.0.1:5173).
Movement starts immediately. Tap Left/Right to commit one turn at the approaching
tile center. Release a key before pressing again. R restarts, including after an
edge failure. Switching tabs or losing window focus pauses; long stalls are discarded.

Playtest: queue opposite turns quickly and confirm the first wins; hold an arrow
across several centers and confirm it turns only once. Try repeated corners,
the grid edge, R, and leaving/returning to the tab. The north-up map helps locate
edges while the simple perspective view follows turns.

`src/simulation.js` owns grid coordinates, movement progress, input latches and
failure. Change `speed` in the scene's `createSimulation` calls to tune difficulty.
`src/main.js` owns Phaser input, time handling, perspective graphics and camera
smoothing. No button states are implemented.

Validation in the implementation environment was blocked because Node.js and npm
were absent. Tests, dependency availability, build and browser rendering must be
verified with the commands above; no lockfile could be generated.
