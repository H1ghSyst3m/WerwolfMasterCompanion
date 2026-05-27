# Werwolf Master Companion

Werwolf Master Companion is a mobile-first helper for running a game of Werwolf, also known as Werewolf. It gives the game master a structured flow for setup, role reveal, night actions, day discussion, voting, deaths, win checks, and game state so the group can focus on playing.

The app UI is German because the game flow and role names are written for German-speaking rounds.

## Play Modes

### Local Mode

Use one device as the game master's companion.

- Add players and choose the role mix.
- Assign roles randomly or manually.
- Let players privately reveal their roles on the same device.
- Run the full night and day flow from the game master's screen.
- Keep the active game saved automatically in the browser.
- Works offline once the app is loaded.

### Online Mode

Use one game-master device while players join from their own phones.

- The game master creates a room.
- Players join by room code, join link, or QR code.
- Players reveal their own role on their own phone.
- The game master still controls setup, night, day, voting, and game end.
- Players can reconnect while the server process is still running.

Online Mode needs the included Node WebSocket server. Rooms are stored in memory, so restarting the server clears active rooms.

## What It Supports

- Player setup for groups of 5 or more.
- Recommended wolf count during role setup.
- Random and manual role assignment.
- Private role reveal before the first night.
- Configurable wolf win mode.
- Configurable role/team reveal after day eliminations.
- Day discussion timer.
- Day voting and execution flow.
- Night actions for wolves, seer-style roles, witch, Amor, Urwolf, Nachtgast, and Beschützer.
- Hunter death triggers, including chained deaths.
- Lovers and heartbreak deaths.
- Special wins for Narr, Dorftrottel, and lovers.
- Local browser save and restore.
- Online rooms with player reconnect tokens.
- PWA-style browser install support.
- Capacitor build path for Android and iOS wrappers.

## Supported Roles

- Werwolf
- Dorfbewohner
- Seher
- Hexe
- Jäger
- Amor
- Narr
- Dorftrottel
- Aura-Seher
- Detektiv
- Urwolf
- Nachtgast
- Beschützer
- Verfluchter
- Harter Bursche

Role details and edge cases are documented in [docs/roles.md](docs/roles.md).

## Quick Start

Requirements:

- Node.js `>=22.12.0`
- npm

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Vite will print the local URL to open in your browser.

## Running Online Mode Locally

Online Mode needs the frontend and the WebSocket server running at the same time. For development, start both with:

```bash
npm run dev:all
```

This starts Vite on `0.0.0.0` and the WebSocket server on port `8787`, which is useful when testing from another phone or computer on the same network.

If you prefer separate logs or need to debug one side, run them in two terminals instead.

Terminal 1:

```bash
npm run server:dev
```

Terminal 2:

```bash
npm run dev
```

The server exposes:

- `GET /health`
- `WS /ws`

By default, the server listens on port `8787`. It also respects `PORT` and `WERWOLF_PORT`.

## Useful Commands

```bash
npm run dev          # Start the Vite frontend only
npm run dev:all      # Start frontend and Online Mode server
npm run server:dev   # Start the Online Mode server with watch mode
npm run server:start # Start the Online Mode server
npm run build        # Type-check and build the web app
npm run test         # Run the test suite
npm run lint         # Run ESLint
```

## Deployment Notes

The frontend is built with Vite, React, and TypeScript.

For Online Mode deployments, configure the public URLs used by browser clients:

- `VITE_WS_URL`: WebSocket endpoint, for example `wss://example.com/ws`
- `VITE_PUBLIC_APP_URL`: public frontend URL used for QR and join links

If `VITE_WS_URL` is not set, clients default to the current hostname on port `8787` with path `/ws`.

For native mobile wrappers, see [docs/capacitor.md](docs/capacitor.md).

## More Documentation

- [Game flow](docs/game-flow.md)
- [Online Mode](docs/online-mode.md)
- [Roles](docs/roles.md)
- [Capacitor mobile setup](docs/capacitor.md)
- [Architecture](docs/architecture.md)
