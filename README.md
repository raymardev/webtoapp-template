# webtoapp-template 🚀

> The reusable Expo wrapper behind **Ship to Stores**. Turns a client's web/PWA
> into a native app that **passes Apple review** — configured by editing one file.

Part of the [Ship to Stores](https://raymartin.es/ship) service. Each client = clone this,
edit `client.config.js`, swap two images, `eas build` + `eas submit`. Days → hours.

## Operate it with AI 🤖

Built to be driven by an AI coding agent (Claude Code, Cursor, …). Point your agent at the
repo and it can configure and ship the app for you:

- **[`AGENTS.md`](./AGENTS.md)** — the operator runbook every agent reads first.
- **[`llms.txt`](./llms.txt)** — a machine-readable map of the repo.
- **`ship-my-app` skill** (Claude Code) — the conversational autopilot that runs the whole launch for you, available in **WebToApp Kit Pro** (raymartin.es/ship).

Prefer to do it by hand? The steps below still work.

## The whole job per client

```bash
1. degit raymardev/webtoapp-template acme-app   # new copy
2. edit client.config.js                          # name, bundleId, url, color, domains
3. drop your logo at assets/logo.png → npm run assets   # generates every icon/splash
4. npm run validate && eas init && eas build && eas submit
```

## What's in the box (the anti-4.2 layer)

Apple rejects apps that are "just a website" (Guideline 4.2). This template ships the
native capabilities that get it approved — **without touching the client's web app**:

- **Robust WebView** — native loading, error screen with retry, external links open in the system browser
- **Push notifications** (`expo-notifications`) — auto token registration, forwarded to the web via `window.ShipBridge`
- **Deep / universal links** — open web routes from notifications and links (iOS `associatedDomains` + Android `intentFilters`)
- **Offline screen** with auto-retry (`@react-native-community/netinfo`)
- **Pull-to-refresh**, **safe areas**, **Android hardware back** (navigates WebView history)
- **Native share** + a documented **`window.ShipBridge`** (web ↔ native messaging)

## Configuration — one file

Everything per-client lives in [`client.config.js`](./client.config.js):

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

`app.config.ts` reads it and generates the full Expo config. You normally never touch
anything else.

## The web bridge

The client's web app can opt into native features (no native code required):

```js
// in the client's web app
window.ShipBridge?.share({ title: "Acme", message: "Check this", url: location.href });
window.addEventListener("ShipPushToken", (e) => console.log("push token", e.detail));
```

## Structure

```
client.config.js        ← edit this per client
client.config.d.ts      ← its types (don't edit)
app.config.ts           ← generates Expo config from client.config
eas.json                ← build/submit profiles
assets/                 ← drop logo.png, then `npm run assets` generates the rest
src/
├── App.tsx             ← offline gate + splash + safe areas
├── WebViewScreen.tsx   ← WebView + back handler + bridge + links
├── OfflineScreen.tsx
├── ship.types.ts       ← shared config types
├── components/         ← LoadingScreen, ErrorScreen
└── native/             ← push.ts, linking.ts, bridge.ts
```

## Commands

```bash
npm start            # Expo dev server
npm run ios          # run on iOS simulator/device
npm run android      # run on Android
npx tsc --noEmit     # typecheck
npx expo export --platform ios   # validate the JS bundle
```

See [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) for the full per-client checklist.
