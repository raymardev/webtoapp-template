# WebToApp Kit — turn your web app into a native app that passes Apple review

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
[![Expo SDK 56](https://img.shields.io/badge/Expo-SDK%2056-000.svg?logo=expo)](https://docs.expo.dev/versions/v56.0.0/)
[![Passes Apple 4.2](https://img.shields.io/badge/Apple-built%20to%20pass%204.2-0a84ff.svg?logo=apple)](#why-apple-rejects-web-wrappers--and-how-this-passes)

> Wrap your **web app or PWA** into a native **iOS + Android** app — by editing **one file**.
> The free, open-source template behind [**WebToApp Kit**](https://raymartin.es/ship).

You built a great web app. The stores want a *native* one — and Apple **rejects** anything that's
"just a website" (Guideline 4.2). This template ships the native layer that gets you **approved**,
**without touching your web app**. Drive it with an AI agent, or do it by hand.

📲 **Shipped & live on both stores:** [4Pets on the App Store](https://apps.apple.com/es/app/4pets-cuidado-de-mascotas/id6739944436) · [on Google Play](https://play.google.com/store/apps/details?id=care.fourpets.app)

## Quick start

```bash
1. npx degit raymardev/webtoapp-template my-app   # fresh copy
2. edit client.config.js                          # name, bundleId, url, color, domains  ← the only file
3. drop your logo at assets/logo.png → npm run assets   # generates every icon + splash
4. npm run validate                               # config + Apple 4.2 gate + asset standards
5. eas init && eas build && eas submit            # build & ship (your Apple/Google accounts)
```

`client.config.js` is the **only** file you edit.

## Why Apple rejects web wrappers — and how this passes

Apple Guideline **4.2** rejects apps that are "just a website in a shell." This template ships the
native capabilities that earn approval — **without changing a line of your web app**:

- **Robust WebView** — native loading, error screen with retry, external links open in the system browser
- **Push notifications** (`expo-notifications`) — auto token registration, forwarded to your web app via `window.ShipBridge`
- **Deep / universal links** — open web routes from notifications and links (iOS `associatedDomains` + Android `intentFilters`)
- **Offline screen** with auto-retry, **pull-to-refresh**, **safe areas**, **Android hardware back**
- **Native share** + a documented **`window.ShipBridge`** (web ↔ native messaging)

Keep push + at least one native feature on — that's what gets you past 4.2. The `npm run validate`
gate **fails on a bare WebView**, so you don't get surprised at review time.

## One file: `client.config.js`

```js
const config = {
  name: "Acme",
  bundleId: "com.acme.app",
  scheme: "acme",
  url: "https://app.acme.com",
  primaryColor: "#00d08c",
  associatedDomains: ["app.acme.com"], // universal links
  features: { push: true, share: true, pullToRefresh: true },
};
```

`app.config.ts` reads it and generates the full Expo config. You normally never touch anything else.

## Operate it with AI 🤖

Built to be driven by an AI coding agent (Claude Code, Cursor, …):

- **[`AGENTS.md`](./AGENTS.md)** — the operator runbook every agent reads first ([agents.md](https://agents.md) standard)
- **[`llms.txt`](./llms.txt)** — a machine-readable map of the repo ([llmstxt.org](https://llmstxt.org))

Point your agent at the repo and say *"ship my app to the stores"* — it configures, validates, and
walks you through the build. The full conversational autopilot (the `ship-my-app` skill) ships with **Pro** ↓

## Free vs Pro vs Done-for-you

| | This template · **free** | [**Kit Pro**](https://raymartin.es/ship) · €99 | [**Done-for-you**](https://raymartin.es/ship) · from €900 |
|---|:---:|:---:|:---:|
| Full anti-4.2 native wrapper | ✅ | ✅ | ✅ |
| One-file config + asset generator | ✅ | ✅ | ✅ |
| `npm run validate` 4.2 gate | ✅ | ✅ | ✅ |
| AI agent docs (AGENTS.md, llms.txt) | ✅ | ✅ | ✅ |
| **`ship-my-app` AI operator** (runs the launch) | — | ✅ | ✅ |
| **Store-readiness auditor** (Apple/Play pre-check) | — | ✅ | ✅ |
| **One-command release** + **OTA updates** | — | ✅ | ✅ |
| **Lifetime updates** as Expo's SDK moves | — | ✅ | ✅ |
| Private support | — | ✅ | ✅ |
| **We publish it for you** | — | — | ✅ |

→ **[Get Pro or hire the done-for-you service at raymartin.es/ship](https://raymartin.es/ship)**

## The web bridge

Your web app can opt into native features — no native code:

```js
window.ShipBridge?.share({ title: "Acme", message: "Check this", url: location.href });
window.addEventListener("ShipPushToken", (e) => console.log("push token", e.detail));
```

## Structure

```
client.config.js        ← edit this. The only one.
app.config.ts           ← generates Expo config from client.config
assets/                 ← drop logo.png, then `npm run assets`
src/
├── App.tsx             ← offline gate + splash + safe areas
├── WebViewScreen.tsx   ← WebView + back handler + bridge + links
├── ship.types.ts       ← shared config types
├── components/         ← LoadingScreen, ErrorScreen
└── native/             ← push.ts, linking.ts, bridge.ts  (the anti-4.2 layer)
```

## Commands

```bash
npm run assets       # generate every icon + splash from assets/logo.png
npm run validate     # pre-flight: config + Apple 4.2 + asset standards
npm start            # Expo dev server
npm run ios | npm run android
npx tsc --noEmit     # typecheck
```

See [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) for the full checklist (accounts, privacy policy, store listings).

## License

MIT © Ray Martín. Built with [Expo](https://expo.dev).
Want the AI autopilot or someone to publish it for you? → **[raymartin.es/ship](https://raymartin.es/ship)**
