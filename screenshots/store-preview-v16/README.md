# Wayfare App Store previews (1.9)

Upload these eight images to the iPhone 6.7-inch screenshot slot in filename order.
Every final is `1284x2778` and uses current in-game UI.

1. `01-live-your-story.png` — core life-story promise
2. `02-see-the-world.png` — Travel: passport, regions, destination postcards (1.9 headline)
3. `03-five-dreams.png` — the Bucket List on the Life tab (1.9)
4. `04-name-every-companion.png` — Companions: naming, personality, and the bond
5. `05-shape-who-you-become.png` — yearly Activities and player agency
6. `06-build-your-career.png` — skill growth and career ladders
7. `07-build-a-family.png` — relationships and family
8. `08-leave-a-legacy.png` — ambitions, generations, and inheritance

Frame 2 shows the destination postcard art, so fetch it first, then regenerate:

```powershell
node scripts/fetch-travel-art.js
node scripts/capture-screenshots.js
```

On macOS or Linux, point the script at a Chrome or Chromium binary:

```sh
BROWSER_PATH=/path/to/chromium node scripts/capture-screenshots.js
```

Supersedes `store-preview-v15`, which predates Travel and the Bucket List.
