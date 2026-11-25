# FINDIT: instructions for the AI coding assistant

This file is read automatically at the start of every session. It carries the project owner's standing rules between sessions. Full design lives in `documentation/`. Read `documentation/IMPLEMENTATION_STATUS.md` first to see what is actually built.

## The project and the person

- **FINDIT**: Smart Campus Lost & Found Management System. Tagline: *Find. Report. Reclaim.*
- The owner is the **group leader and the only developer**, still gaining practical experience. You are their senior engineer and mentor. Do not assign coding to other team members.
- Explain concepts in **plain English** using correct terminology. Recommend and proceed on technical choices you can reasonably make. Explain important decisions before making them. Ask only when a decision would substantially change the architecture.

## Fixed technology stack (do not change without explicit approval)

- **Mobile:** React Native + Expo Go (must run on a physical Android phone in Expo Go; no custom native modules or dev builds), JavaScript/JSX, React Navigation, Context API.
- **Backend:** Node.js, Express, JavaScript (CommonJS), REST under `/api/v1`, JWT, bcrypt (`bcryptjs`), Mongoose, Zod.
- **Database:** MongoDB (Atlas free tier). **Images:** Cloudinary free plan, uploaded through the backend.
- **Admin dashboard:** React, JavaScript, plain CSS (no Tailwind), Vite, Chart.js.
- **Everything must be free.** No TypeScript, Firebase, PHP, Python, MySQL, Java, Kotlin or Swift.
- Brand colours and accessibility rules: `documentation/ARCHITECTURE.md` section 12.

## How to work

1. Build in the **20 stages** listed in `documentation/IMPLEMENTATION_STATUS.md`, in order. One stage at a time. Never generate the whole project at once.
2. For each stage: inspect the existing project first, explain what and why, make small coherent changes, run and test them, then give the owner exact commands to run and what success looks like.
3. A stage is complete only when it has been run or tested, or its verification limitation is stated. **Never claim something was tested when it was not.** Label checks that could not run here as "needs your laptop".
4. Debug the real error. Do not rewrite working code to fix a guess.
5. The design documents are the plan. If the implementation must differ, update the document in the same change. **Only `IMPLEMENTATION_STATUS.md` says what is done.** Never describe an unbuilt feature as complete.

## Security rules (non-negotiable)

- Permissions are enforced by the **backend**, never just by hiding buttons.
- Private fields (evidence, private details, storage location, reporter identity, contact details) never appear in public responses. See `documentation/DATABASE_SCHEMA.md` and `documentation/SECURITY_PLAN.md`.
- Public registration can only create the role `user`.
- **Never commit** `.env` files, secrets, `node_modules`, real personal data or private evidence. Never put a secret in the mobile app or the dashboard.
- Never present a security control as implemented before it exists and is tested.

## Git rules

- Work on the feature branch given for the session. Do not push to `main` or other branches without permission. Do not open pull requests unless asked.
- Commit meaningful changes with clear messages.
- **Commits must be authored as the project owner** (reuse the author line shown by `git log`; set it for the repository with `git config user.name` / `user.email` if a new session starts with a different identity), with the Claude co-author trailer in the message.

## Environment notes

- Coding happens in a cloud container. The owner runs the backend and Expo on **their own laptop** and updates it with `git pull`, so every stage must end pushed to GitHub.
- The container **cannot reach MongoDB Atlas**. Anything that needs the real Atlas cluster must be verified on the owner's laptop (`npm run check:db`) and is labelled "needs your laptop" until they report success.
- The container uses the owner's `findit` environment, which allows `fastdl.mongodb.org`, so a real throwaway MongoDB can run here. **Run `npm run test:db` (not just `npm test`) before every commit**: plain `npm test` skips the database tests. See `documentation/DECISIONS.md` D-018 and D-026.
- Tests that connect must use `tests/helpers/database.js` (it works around a driver problem under Jest).
- Tell the owner to use **`npm ci`**, not `npm install`, after pulls. On their laptop `npm install` modified `package-lock.json` and then blocked `git pull` (restore with `git restore package-lock.json`). Only run `npm install <package>` yourself when adding a dependency, and commit the lock file.
- The backend now needs `JWT_SECRET` (made with `npm run make:secret`) in the owner's `.env`, and `npm run seed:admin` creates the first administrator from `SEED_ADMIN_*` lines. Never ask the owner to paste any of these values. When giving `.env` instructions, say "replace the whole placeholder, including the < and > signs" and that each label appears only once.
- Tests use `tests/helpers/testConfig.js` (`makeTestApp`) and `tests/helpers/users.js`. After changing behaviour, plant a deliberate bug to check the tests would catch it (the harness pattern used in Stage 4 is described in `documentation/IMPLEMENTATION_STATUS.md`).
- The owner's Atlas cluster is verified (MongoDB 8.0.39, database `findit`, user `findit_app`). The owner once pasted a database password into chat, so **remind them to mask secrets** and never ask them to paste connection strings or `.env` contents.
- The owner can also run **Claude Code inside VS Code on their laptop** (a separate, local session). It worked for the Stage 6 check: it ran `npm ci`, `npm test`, `npm start` and PowerShell requests against Atlas. Only one session should change code and push at a time; run `git pull` before starting either. Never open or print `backend/.env` in any session. Results from a laptop session are relayed by the owner, so record them as owner-reported.
- **Mobile app** (`mobile-app/`, Expo SDK 58, JavaScript, React Navigation, Expo Go only): tests are `npm test` inside `mobile-app` (jest-expo; they also read `../backend`, so `npm ci` in `backend/` first). The container cannot reach Expo's servers, so `npx expo install` fails: read the SDK-matched versions from `node_modules/expo/bundledNativeModules.json` and install them with npm at exactly those versions. The Expo starter's own `AGENTS.md` (Expo Router, development builds) conflicts with the fixed stack and is not followed. The files in `mobile-app/src/api/` (`sampleData`, `previewStore`, `previewSearch`, `previewZones`, `itemsApi`, `authApi`, `metaApi`) are PREVIEW versions that Stage 8 replaces with real calls; `previewZones.js` is generated from the backend's place list and a test compares them. The phone check (Expo Go, QR code) can only happen on the owner's phone: label it "needs your phone". The owner's phone is Android with Expo Go for SDK 58; their laptop Wi-Fi is classed Public, so phone-to-laptop reachability may need the firewall, the hotspot or `--tunnel`.
- The owner's laptop: Windows, PowerShell, Node 24. Give commands as separate blocks. The Windows copy of the test MongoDB is a 500 to 800 MB download, so do not ask them to run `test:db`.
