# AGENTS.md — operator guide for the WebToApp Kit

You (an AI coding agent) are operating **WebToApp Kit**: an Expo template that turns a web
app / PWA into a native iOS + Android app that **passes Apple review** (Guideline 4.2),
configured by editing **one file**. Your job is to take a founder from this repo to a
build submitted to the stores, with as little manual work as possible.

Read this whole file before doing anything. Then follow "The whole job" below.

---

## 🚨 Non-negotiable rules

1. **Use the versioned Expo docs.** This template targets **Expo SDK 57 / React Native 0.86**.
   Before writing or changing any native/Expo code, read the exact versioned docs at
   <https://docs.expo.dev/versions/v57.0.0/>. APIs differ between SDKs — do not rely on memory.
2. **Edit `client.config.js` only.** That is THE per-client file. Do **not** modify `src/`,
   `app.config.ts`, or `eas.json` to make a normal app work — everything is driven by config.
   Touch `src/` only when explicitly extending the template itself.
3. **Never strip the native features to "simplify".** A bare WebView with no native capability
   is exactly what Apple rejects under 4.2. Push + at least one real native feature are what get
   the app approved. Keep them on unless the founder has a specific reason not to.
4. **Confirm before destructive or outward-facing steps** — submitting to a store, transferring
   accounts, spending money. Configuration and local builds: proceed.

---

## The whole job (per client)

```bash
1. clone/degit this repo            # a fresh copy for this client
2. npm install
3. edit client.config.js            # name, bundleId, url, color, domains  ← the only file
4. drop your logo at assets/logo.png, then `npm run assets`  # generates every icon/splash
5. npm run validate                 # config + Apple 4.2 + asset standards gate
6. eas init                         # creates the project, prints projectId → paste into client.config.js
7. eas build  &&  eas submit        # build and ship
```

Steps 3–5 are yours to do autonomously. Steps 6–7 spend money / touch the founder's
accounts — confirm first and have the founder run `eas login` with their own account.

Full human checklist (accounts, privacy policy, `.well-known` files, store listings):
see [`docs/ONBOARDING.md`](./docs/ONBOARDING.md).

---

## The one file: `client.config.js`

`app.config.ts` reads this and generates the entire Expo config. Schema
(authoritative source: [`src/webtoapp.types.ts`](./src/webtoapp.types.ts)):

| Field | Type | How to derive it | Example |
|-------|------|------------------|---------|
| `name` | string | The app's display name (shown under the icon). | `"Acme"` |
| `slug` | string | Lowercase, dashes. From the name. | `"acme"` |
| `bundleId` | string | Reverse-DNS. Usually `com.<brand>.app`. **Immutable after first submit** — get it right. | `"com.acme.app"` |
| `scheme` | string | Deep-link scheme, one word. | `"acme"` → `acme://` |
| `url` | string | The web app the wrapper loads. Must be HTTPS and not block framing. | `"https://app.acme.com"` |
| `logo` | string | Source logo for `npm run assets` (square PNG, 1024×1024). Default `./assets/logo.png`. | `"./assets/logo.png"` |
| `iconScale` | number? | Icon fill: `1` = full-bleed (a finished/square logo), `~0.8` = padded on bg (a bare symbol). Default `0.8`. | `1` |
| `primaryColor` | string | Brand accent (loading spinner, error-screen button). | `"#00d08c"` |
| `backgroundColor` | string | Splash / app background. | `"#0b1020"` |
| `associatedDomains` | string[] | Domains for iOS universal links + Android app links. **No protocol.** Empty `[]` if not using links. | `["app.acme.com"]` |
| `allowedHosts` | string[]? | Extra hosts that stay **inside** the app. Anything off `url`'s host opens in the system browser, which breaks OAuth / hosted checkout — list those hosts here. | `["accounts.google.com"]` |
| `version` | string? | Marketing version. Bump per store release. Default `"1.0.0"`. | `"1.2.0"` |
| `features.push` | boolean | Register for push (expo-notifications). Strong 4.2 signal — keep `true`. | `true` |
| `features.share` | boolean | Native share via `window.WebToAppBridge`. | `true` |
| `features.pullToRefresh` | boolean | Pull down to reload. **iOS only** — no-op on Android. | `true` |
| `features.ota` | boolean? | **Pro/Autopilot:** over-the-air JS updates (expo-updates). Needs `eas.projectId`. Off by default. | `true` |
| `androidGoogleServicesFile` | string? | Path to Firebase `google-services.json`. **Required for Android push** (iOS doesn't need it). | `"./google-services.json"` |
| `eas.projectId` | string | Filled after `eas init`. Required for push to work. | `"..."` |

Validate your work after editing — run, in order:

- **`npm run validate`** — WebToApp Kit pre-flight: checks every config field and runs the Apple
  4.2 readiness gate. It **fails (exit 1) on a bare WebView** with no native features. This is
  your go/no-go before building.
- **`npx expo config`** — confirms the config resolves into a valid Expo config (bundle id,
  plugins, `extra`).
- `npx tsc --noEmit` typechecks the template's TypeScript in `src/`. (The JSDoc `@type` in
  `client.config.js` gives editor autocomplete/errors; `tsc` does not check the `.js` config.)

---

## If you're operating this for a non-technical founder

Ask only what you can't infer. Minimal question set:

1. **App name** and the **web URL** it should load.
2. **Brand color** (or: "I'll pull it from your site").
3. Do they want **push notifications**? (Recommend yes — it's the main thing that gets past 4.2.)
4. Do they have **Apple Developer** ($99/yr) and **Google Play** ($25 once) accounts? (Needed to submit; the accounts stay theirs.)
5. A **privacy policy URL**? (Both stores require it.)

Then: fill `client.config.js`, derive `slug`/`bundleId`/`scheme` yourself, confirm the values
back to them in plain language, and proceed. Don't ask for things you can derive.

---

## Why this passes Apple 4.2 (don't undo it)

Apple rejects apps that are "just a website." This template ships the native layer that
gets approval **without touching the founder's web app**:

- Native push (`src/native/push.ts`), deep/universal links (`src/native/linking.ts`),
  native share + a `window.WebToAppBridge` (`src/native/bridge.ts`)
- Robust WebView: loading, error-with-retry, offline screen, pull-to-refresh (iOS), safe areas,
  Android hardware back, external links open in the system browser (`src/WebViewScreen.tsx`)

If you remove these to "keep it simple," you reintroduce the 4.2 rejection. Keep push + at
least one more native feature live.

### The web bridge (what the founder's web app can call)

Available on `window.WebToAppBridge` before the page's own scripts run; a
`WebToAppBridgeReady` event also fires.

| Call | Effect |
|------|--------|
| `WebToAppBridge.share({ title, message, url })` | Native share sheet (needs `features.share`) |
| `WebToAppBridge.setBadge(n)` | App icon badge count |
| `WebToAppBridge.ready()` | Tells native the web app booted |
| `WebToAppBridge.pushToken` | Expo push token, once registered |
| `window.addEventListener("WebToAppPushToken", e => e.detail)` | Same token, as it arrives |

Send a push with `data: { url: "https://app.acme.com/orders/42" }` and tapping it opens that
route in the WebView. None of this is required — the web app works untouched without it.

---

## Commands

```bash
npm install                       # deps
npm run assets                    # generate every icon/splash from assets/logo.png
npm run validate                  # pre-flight: config + Apple 4.2 + asset standards
npm start                         # Expo dev server
npm run ios | npm run android     # run on simulator/device
npx tsc --noEmit                  # typecheck the template's TypeScript (src/)
npx expo config                   # the real config check — must resolve without error
npx expo export --platform ios    # validate the JS bundle builds
eas init / eas build / eas submit # create project / build / ship (eas-cli, founder's account)
```

> `npm run release` and `npm run ota` are **Kit Pro** scripts — they do not exist in this free
> template. Don't tell a founder to run them here; use the `eas build` / `eas update` commands
> above instead.

---

## File map — what each thing is (and whether you touch it)

```
client.config.js     ← EDIT THIS per client. The only one.
client.config.d.ts   ← its types (don't edit)
app.config.ts        ← generates Expo config from client.config.js (don't edit for normal use)
eas.json             ← build/submit profiles (edit only to add real submit credentials)
assets/              ← drop your logo.png, then run `npm run assets`
src/
├── App.tsx              ← offline gate + splash + safe areas
├── WebViewScreen.tsx    ← WebView + back handler + bridge + links
├── OfflineScreen.tsx
├── webtoapp.types.ts        ← the ClientConfig schema (authoritative)
├── theme.ts             ← runtime config from app.config extra
├── components/          ← LoadingScreen, ErrorScreen
└── native/              ← push.ts, linking.ts, bridge.ts  (the anti-4.2 layer)
```

Machine-readable index for navigation: [`llms.txt`](./llms.txt).
Per-client human checklist + troubleshooting: [`docs/ONBOARDING.md`](./docs/ONBOARDING.md).
