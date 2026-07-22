# Wayfare App Store previews

Upload these five images to the iPhone 6.7-inch screenshot slot in filename order.
Every final is `1290x2796`, uses current in-game UI, and stays below Apple's
per-image upload limit.

1. `01-live-your-story.png` — core life-story promise
2. `02-shape-who-you-become.png` — yearly Activities and player agency
3. `03-build-your-career.png` — skill growth and career ladders
4. `04-build-a-family.png` — relationships and family
5. `05-leave-a-legacy.png` — ambitions, generations, and inheritance

Regenerate the complete set after a UI change with:

```powershell
node scripts/capture-screenshots.js
```

The script launches the local Wayfare build, seeds deterministic marketing
scenes, captures real gameplay, and rebuilds all five final images.
