Release checklist — super-ultimate-tictactoe

This document describes commands and verification steps for producing a production build and publishing to GitHub Pages (static `dist/`).

1) Prereqs
- Node >=16
- Ensure working tree clean and pushed to remote (recommended)

2) Build & verify locally
```bash
npm install
npm run build
npm run preview
# open the preview URL (http://localhost:5173 by default)
```
- Verify the app loads and core flows work (start game, play moves, analysis mode, end-state banner).

3) Run checks
```bash
npm run typecheck
npm test
```
- Fix issues before deploying.

4) Base path (GitHub Pages)
- If deploying to `https://<user>.github.io/<repo>/` set the base before building:
```bash
# set base to the repo name path
VITE_BASE=/<repo>/ npm run build
```
- Otherwise the default base `'/'` is used.

5) Publish `dist/` to GitHub Pages (choose one)
- Using `gh-pages` (recommended when comfortable with Node tooling):
```bash
npx gh-pages -d dist
```
- Using git subtree push (no extra packages):
```bash
git subtree push --prefix dist origin gh-pages
```

6) Verify deployment
- Open the deployed URL and verify that no network 404s occurred for JS/CSS assets (network tab).
- Confirm banners/overlays load and there are no console errors.
- If assets 404, the likely cause is an incorrect `base` — rebuild with `VITE_BASE` set.

7) Rollback
- To rollback, revert the `gh-pages` branch to the previous commit or redeploy an earlier `dist/` build.

8) Post-release monitoring
- Enable remote logging briefly and watch for uncaught errors from real users.

Notes
- For SPA routing with history API, GitHub Pages needs a `404.html` copy of `index.html` to serve as fallback. For this app, we recommend serving the root and avoiding deep routes or use the repo base.
- The repo includes `npm run deploy:gh-pages` and `npm run deploy:gh-pages:subtree` scripts for convenience.
