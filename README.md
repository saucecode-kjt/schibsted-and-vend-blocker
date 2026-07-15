# Schibsted & Vend Blocker

A browser extension (Chromium + Firefox) that removes the  cookie/tracking-consent pop-up on ten Nordic news sites, restores the page scrolling that pop-up locks, and blocks the network requests that load it in the first place.

## Description

On vg.no, aftenposten.no, e24.no, bt.no, aftenbladet.no, aftonbladet.se, svd.se, omni.se, tv4.se, and fotbollskanalen.se (and their subdomains), this extension:

- **Removes the consent iframe.** A `MutationObserver` watches for elements matching Schibsted's markup (`iframe[src*="cmp"]`, or ids starting with `sp_message_iframe_`) and deletes them the instant they're inserted — removing the nearest `sp_message_container_*` wrapper if one exists, otherwise the iframe's immediate parent (never `<body>`).
- **Blocks the tracking subdomain.** A static `declarativeNetRequest` rule blocks requests to each site's `cmp.<domain>` subdomain, scoped so it only applies when the request originates from that same site.
- **Restores scrolling.** Schibsted locks `<body>` (`overflow: hidden; position: fixed`) while its dialog is "open." A second observer strips that lock's trigger class the moment it appears, and force-resets `overflow`/`position` on `<html>`, `<body>`, and `main#application` whenever it finds them actually locked, regardless of what caused it.

It requests only the `declarativeNetRequest` permission, collects no data, and needs no account or login.

Both browser targets are built from the same source — one content script, one DNR ruleset — with only the manifest differing per browser (Firefox needs `browser_specific_settings`, Chromium doesn't).

## Requirements

- [Node.js](https://nodejs.org/) 20 or later (developed against 20.19.2)
- npm 10+ (bundled with Node; developed against 11.4.1)
- Chromium and/or Firefox, for loading/testing the built extension

## Dependencies

Dev-only — the extension itself ships zero runtime dependencies:

- [`vite`](https://vitejs.dev/) `^6.0.0` — bundles the content script
- [`web-ext`](https://github.com/mozilla/web-ext) `^8.3.0` — lint, run, and package both browser targets

## Getting started

```bash
npm install
npm run build
```

This compiles the content script once and fans it out into two ready-to-load extensions: `dist/chromium` and `dist/firefox`. See [How to test](#how-to-test) below to load either one in a browser.

## Available scripts

| Script | What it does                                                                                           |
| --- |--------------------------------------------------------------------------------------------------------|
| `npm run dev` | Builds in watch mode — rebuilds `dist/chromium` and `dist/firefox` on every source change.             |
| `npm run build` | One-shot build for both browser targets.                                                               |
| `npm run start:firefox` | Launches Firefox via `web-ext run` with the extension pre-loaded from `dist/firefox`.                  |
| `npm run start:chromium` | Launches Chromium via `web-ext run --target chromium` with the extension pre-loaded from `dist/chromium`.    |
| `npm run package:firefox` | Zips `dist/firefox` into `web-ext-artifacts/firefox/` for AMO submission.                              |
| `npm run package:chromium` | Zips `dist/chromium` into `web-ext-artifacts/chromium/` for Chrome Web Store submission.                   |
| `npm run package` | Runs both `package:firefox` and `package:chromium`.                                                      |
| `npm run lint` | Runs `web-ext lint` against `dist/firefox` (AMO-specific validation; no Chromium equivalent is bundled). |

## How to test

Run `npm run build` first so `dist/chromium` and `dist/firefox` exist.

### Chromium

1. Go to `chrome://extensions`
2. Toggle **Developer mode** on (top-right)
3. Click **Load unpacked**
4. Select the `dist/chromium` folder

The extension stays installed across restarts. After a rebuild, click the reload icon on its card in `chrome://extensions` to pick up changes.

Alternatively, `npm run start:chromium` launches a fresh Chromium instance with it already loaded — convenient for one-off testing, but changes still require re-running the script.

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `dist/firefox/manifest.json`

This is temporary — it's removed when Firefox closes, and needs re-loading after every rebuild.

For a smoother loop, `npm run start:firefox` launches Firefox via `web-ext run`, which auto-reloads the extension whenever `dist/firefox` changes (pair it with `npm run dev` running in another terminal for live-reload on source changes).

Run `npm run lint` before submitting to AMO — it runs the same `addons-linter` checks Mozilla's own validator uses.

## Store dashboards

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)

## License

GPL-3.0. Forks and derivatives must also be open-sourced under GPL-3.0 and credit the original author, Jan Thore Skjelfjord. See [LICENSE](LICENSE) for the full text.
