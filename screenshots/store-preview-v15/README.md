# Wayfare App Store previews

Upload these six images to the iPhone 6.7-inch screenshot slot in filename order.
Every final is `1284x2778`, uses current in-game UI, and stays below Apple's
per-image upload limit.

1. `01-live-your-story.png` — core life-story promise
2. `02-name-every-companion.png` — Companions: naming, personality, and the bond (1.8 headline)
3. `03-shape-who-you-become.png` — yearly Activities and player agency
4. `04-build-your-career.png` — skill growth and career ladders
5. `05-build-a-family.png` — relationships and family
6. `06-leave-a-legacy.png` — ambitions, generations, and inheritance

Regenerate the complete set after a UI change with:

```powershell
node scripts/capture-screenshots.js
```

On macOS or Linux, point the script at a Chrome or Chromium binary:

```sh
BROWSER_PATH=/path/to/chromium node scripts/capture-screenshots.js
```

The script launches the local Wayfare build, starts a real life so every state
field exists, seeds deterministic marketing scenes (including unlocked
achievements and an optional scroll target per scene), captures real gameplay,
and rebuilds all six final images.

Supersedes `store-preview-v14`, which predates Companions.
