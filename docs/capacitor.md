# Capacitor - Mobile App Setup

Capacitor wraps the Vite/React SPA in a native WebView shell for iOS and Android.

## Prerequisites

| Platform | Required tools |
|---|---|
| Android | Android Studio + JDK 17 |
| iOS | Xcode 15+ (macOS only) |
| Both | Node.js 22.12.0 (already required) |

## First-Time Setup

After cloning the repo and running `npm install`, initialize the native projects once:

```bash
npm install

# Android
npm run build:app
npx cap add android
npx cap sync android

# iOS (macOS only)
npm run build:app
npx cap add ios
npx cap sync ios
```

The generated `android/` and `ios/` folders are gitignored. Re-run the setup after a fresh clone.

## Daily Workflow

```bash
# Build web assets for Capacitor and sync to both platforms
npm run cap:sync

# Build, sync Android, and open Android Studio
npm run cap:android

# Build, sync iOS, and open Xcode (macOS only)
npm run cap:ios
```

## Build Modes

| Command | `base` | `outDir` | Purpose |
|---|---|---|---|
| `npm run build` | `/WerwolfMasterCompanion/` | `dist` | Web deployment |
| `npm run build:app` | `./` | `dist-app` | Capacitor WebView |
| `npm run dev` | `/` | in-memory | Vite dev server |

The two build outputs are independent. Changing the web deployment build does not change the Capacitor build output, and vice versa.

## Local vs Online Mode

Local Mode works offline in the WebView because all game state is client-side and stored with `localStorage`.

Online Mode requires a reachable Node websocket server:

- `VITE_WS_URL` points the app to the websocket endpoint, for example `wss://example.com/ws`. `http://` and `https://` values are normalized to `ws://` and `wss://`; host/path values are resolved with the current page's websocket scheme.
- `VITE_PUBLIC_APP_URL` optionally points to the public frontend URL used in QR/join links.

If `VITE_WS_URL` is not configured, the browser defaults to the current hostname on port `8787` and path `/ws`.
If `VITE_PUBLIC_APP_URL` is not configured, QR/join links default to the current frontend URL from `window.location.href`.

## What Works Out of the Box

- `localStorage` save/restore in Local Mode, identical behavior inside the WebView.
- Online reconnect tokens while the server process still has the room.
- Touch/pointer events, including drag-to-reveal role cards.
- Tailwind CSS compiled into static assets with no runtime dependency.
- Game logic as pure TypeScript without native API requirements.

## Recommended Next Steps

- **App icon & splash screen:** use `@capacitor/assets` to generate required sizes from one source image.
- **Status bar:** install `@capacitor/status-bar` to control native status bar color.
- **Android back button:** install `@capacitor/app` and listen for `backButton` events to navigate instead of exiting the app.
