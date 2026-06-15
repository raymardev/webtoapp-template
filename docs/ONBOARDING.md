# New client → published, step by step

The repeatable checklist behind a "Ship to Stores" delivery. Target: **a few hours**, not days.

## 0. Pre-flight (before quoting)

- [ ] Client has (or will create) an **Apple Developer** account ($99/yr) and **Google Play** account ($25 once)
- [ ] The web app is **responsive / mobile-ready**
- [ ] There's a **privacy policy URL** (both stores require it)
- [ ] You know which native features are needed (push? deep links?)

> If the web is a thin "just a website" and the client wants the cheapest WebView with
> **no** native features, **do not offer the pass-review guarantee** — that risk is Apple's, not yours.

## 1. Spin up the project

```bash
npx degit raymardev/webtoapp-template <client>-app
cd <client>-app
npm install
```

## 2. Configure (`client.config.js`)

Edit the single config file:

| Field | Example | Notes |
|-------|---------|-------|
| `name` | `"Acme"` | Shown under the icon |
| `slug` | `"acme"` | lowercase-dashes |
| `bundleId` | `"com.acme.app"` | iOS + Android id |
| `scheme` | `"acme"` | deep link scheme |
| `url` | `"https://app.acme.com"` | the web app to load |
| `primaryColor` | `"#00d08c"` | brand accent |
| `backgroundColor` | `"#0b1020"` | splash / app bg |
| `associatedDomains` | `["app.acme.com"]` | universal links |
| `features` | `{ push, share, pullToRefresh }` | toggle natives |

## 3. Branding assets

- [ ] Put the client's logo (square PNG, 1024×1024 ideal) at `assets/logo.png`
- [ ] Run `npm run assets` — generates the icon, Android adaptive icon, splash and favicon to store standards
- [ ] `npm run validate` confirms every asset is the right size

## 4. EAS setup

```bash
npm i -g eas-cli
eas login
eas init                 # creates the project, prints the projectId
```

- [ ] Paste the `projectId` into `client.config.js` → `eas.projectId` (needed for push)

## 5. Universal links (if enabled)

- [ ] iOS: host `/.well-known/apple-app-site-association` on the client's domain
- [ ] Android: host `/.well-known/assetlinks.json` (get the fingerprint from `eas credentials`)

## 6. Build & test

```bash
eas build --profile preview --platform all     # internal test build
```

- [ ] Install on a real device, verify: loads, push prompt, offline screen, back button, external links

## 7. Submit to the stores

```bash
eas build --profile production --platform all
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

- [ ] Fill the store listings (screenshots, description, privacy policy, data safety / privacy labels)
- [ ] Submit for review, handle any feedback

## 8. Hand off (you own it)

- [ ] Transfer accounts so they're in the **client's** name
- [ ] Hand over the repo
- [ ] Give them the one-liner for their next release: `eas build --profile production --platform all && eas submit --profile production --platform all`

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Apple 4.2 rejection | Ensure push + at least one native feature are enabled and actually used |
| Push token is null | Set `eas.projectId`; test on a **real device** (not simulator) |
| Universal links don't open | Check the `.well-known` files are served with `Content-Type: application/json` and no redirect |
| White screen | Verify `url` is reachable over HTTPS and not blocked by CSP/`X-Frame-Options` |
