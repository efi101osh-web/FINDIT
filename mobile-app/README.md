# FINDIT mobile app

React Native + **Expo SDK 58** (JavaScript), opened on an Android phone with **Expo Go**. It is the phone side of FINDIT: *Find. Report. Reclaim.*

> **Status (Stage 7, checkpoint 7a):** Welcome, Login, Register, Home and Profile screens, on **preview data**. The app does **not** talk to the server yet (Stage 8) and says so on screen. See [documentation/IMPLEMENTATION_STATUS.md](../documentation/IMPLEMENTATION_STATUS.md) for what is built and verified.

## Run it

You need Node 22 or 24, and Expo Go on an Android phone, on the same Wi-Fi as the laptop. Step by step: [documentation/SETUP_GUIDE.md](../documentation/SETUP_GUIDE.md) Part 8.

| Command | What it does |
|---|---|
| `npm ci` | Install the libraries exactly as recorded in `package-lock.json` (use this, not `npm install`) |
| `npx expo start` | Start the app server and show a QR code for Expo Go |
| `npm test` | Run the automated tests (111). No phone or server needed |

## Folder map

```text
App.js                 Entry point: providers + navigation
src/
├── theme/             Colours, spacing, type, status colours (FINDIT's design tokens)
├── components/        Button, TextField, ItemCard, StatusBadge, Chip, Notice, Logo, Screen, StateViews
├── screens/           One file per screen
├── navigation/        RootNavigator, AuthStack, AppStack, MainTabs
├── context/           AuthContext (who is logged in)
├── hooks/             useOptions (the server's lists of places etc.)
├── api/               PREVIEW versions that return sample data (replaced by real calls in Stage 8)
└── utils/             validation, format, labels, place
tests/                 Jest tests (jest-expo + Testing Library)
```

## Rules for working here

- **No secret ever goes in the app.** Everything in it can be read by anyone who has the app. The server address will be read from `EXPO_PUBLIC_API_URL`, which is public by design (Stage 8).
- **Only libraries that work in Expo Go.** Anything needing a custom native build needs explicit approval first.
- **Place names are never typed into the app.** They come from the server's list (`GET /meta/options`); the app shows them with `placeText`.
- **Add libraries with the SDK's own versions** (see `node_modules/expo/bundledNativeModules.json`), not whatever is newest.
- Tests that compare the app with the backend (password rules, labels, place names, report fields) read `../backend`, so run `npm ci` in `backend/` too. They are skipped with a warning if it is missing.
