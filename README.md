# Wayfare

Psuedo-elegant indie life simulator running as a PWA.

## GitHub Pages Upload

1. Create a new repository on GitHub (for example `wayfare`).
2. In the repo, click **Add file > Upload files**.
3. Upload the contents of this folder: `index.html`, `manifest.json`, `service-worker.js`, `privacy.html`, `terms.html`, and `/icons`.
4. Commit to `main`.
5. Open **Settings > Pages > Build and deployment**. Set **Source** to **Deploy from a branch** and choose `main` and `/root`.
6. Visit your GitHub Pages URL to test install.

## Updating Later

1. Re-upload changed files to `main`.
2. If `manifest.json` or `service-worker.js` changed, rename the cache in `service-worker.js` (for example `wayfare-pwa-v2`) so users get the update.
3. Trigger a normal GitHub Pages deploy; no extra action needed.

## Play

Use Android Chrome for automatic install, or iOS Safari: Tap Share > Add to Home Screen.