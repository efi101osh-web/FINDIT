# FINDIT: Setup Guide

> **Status: PARTIAL.** Part 1 (getting your laptop ready), Part 2 (install and test the backend), Part 3 (create the database and run the server), Part 4 (first administrator), Part 5 (try the API with Postman) and Part 6 (report lost and found items) are written. Each later part is added **in the stage that creates the thing it sets up**, after being tested. The headings of those future parts are listed at the end so you know what is coming. They contain no instructions yet.
>
> **Verification status:** Part 2 was tested in a Linux cloud container (Node 22) and on the owner's Windows laptop (PowerShell, Node 24.20.0) as of Stage 2. **Part 3 was tested in the container against a real local MongoDB, and on 2026-11-23 on the owner's Windows laptop against a real MongoDB Atlas free cluster** (connection check and health page both succeeded). **Parts 4 and 5 were tested in the container (a live server, a real database and the Postman collection run with Newman: 11 requests, 19 checks, 0 failed) and then on the owner's Windows laptop against Atlas (first administrator created; every Postman request gave its expected result).** **Part 6 was tested in the container only (a live server, a real database and the Postman collection run with Newman: 26 requests, 0 failed; the laptop run is pending).** If your result differs, copy the whole terminal text and send it to the assistant.

You will run FINDIT on **your own laptop**. The coding assistant writes code in the cloud and saves it to GitHub. You download it with Git, and then everything runs locally.

---

## Part 1. Get your laptop ready

### 1.1 Install these (all free)

| Tool | What it is | Get it from | Check it worked |
|---|---|---|---|
| **Node.js 22 (LTS)** | Runs the backend and the build tools | nodejs.org | `node --version` prints `v22.x.x` (or `v24.x.x`) |
| **npm** | Installs libraries (comes with Node.js) | included | `npm --version` prints a number such as `10.x.x` |
| **Git** | Downloads and saves versions of the code | git-scm.com | `git --version` prints `git version 2.x.x` |
| **Visual Studio Code** | Code editor | code.visualstudio.com | It opens |
| **Postman** | Lets you send test requests to the API | postman.com | It opens |

**About the Node.js version:** the project is developed on **Node 22** and has also been run successfully on **Node 24.20.0** (Windows). Either is fine. Odd-numbered versions such as Node 23 are not supported by the test tool (Jest 30).

Open a terminal (VS Code: **Terminal → New Terminal**) and run each check command. Send the assistant the output if anything looks different.

### 1.2 On your phone

Install **Expo Go** from the Google Play Store. You do not need an account to start.

### 1.3 Accounts to create later (do not create them yet)

You will be guided through each one at the stage that needs it:

| Account | Needed at | Cost |
|---|---|---|
| MongoDB Atlas | Stage 3 | Free |
| Cloudinary | Stage 9 | Free |

### 1.4 Get the code

The code is saved to your GitHub repository. In the terminal, in the folder where you want the project:

```bash
git clone https://github.com/efi101osh-web/FINDIT.git
cd FINDIT
git checkout claude/beautiful-clarke-jsqjs1
```

If the repository is private, Git will ask you to sign in to GitHub.

Later, each time the assistant says new work has been saved, update your copy with:

```bash
git pull
```

**What success looks like:** you see a `documentation` folder containing the files listed in [README.md](README.md).

### 1.5 Where the Git branch fits (plain English)

A *branch* is a separate draft of the project. `main` is conventionally the "official" draft. For now there is only one branch, `claude/beautiful-clarke-jsqjs1`, and all the work lives there, which is perfectly fine. Once there is a working, reviewed milestone, a `main` branch can be created for the stable version, and new work stays on separate branches (the "feature branch" habit the brief asks for). That happens only when you decide.

---

## Part 2. Install the backend and run its tests

**Goal:** download the libraries and run the automated tests. This needs **no database and no accounts**, and it proves your laptop and the project work together.

### 2.1 Get the latest code

In a terminal, inside the `FINDIT` folder:

```bash
git pull
```

### 2.2 Open the backend folder

In VS Code: **File → Open Folder → FINDIT**, then **Terminal → New Terminal**, and:

```bash
cd backend
```

### 2.3 Install the libraries

Use `npm ci` ("clean install"). It installs exactly the versions recorded in `package-lock.json` and **never rewrites that file**. (Plain `npm install` can rewrite it on your computer, and then `git pull` refuses to run; see the troubleshooting table.) Run it again after any `git pull` that changes `package.json` or `package-lock.json`:

```bash
npm ci
```

**Success looks like:** a line such as `added 431 packages` (a couple fewer on Windows is normal) and no red `ERR!` lines. Yellow `deprecated` warnings and a note about "moderate severity vulnerabilities" are expected and harmless. They come from the test tool, not our code. **Do not run `npm audit fix --force`.**

### 2.4 Run the automated tests

```bash
npm test
```

**Success looks like:**

```text
[tests] Database tests are SKIPPED. Run "npm run test:db" to include them (first run downloads MongoDB once; see the setup guide).

Test Suites: 8 skipped, 12 passed, 12 of 20 total
Tests:       113 skipped, 237 passed, 350 total
```

*(The numbers grow as the project grows. They are correct for the Stage 5 code; an older checkout shows smaller numbers.)*

The **113 skipped** tests are the ones that need a real MongoDB. They are deliberately skipped on your laptop (the program they need is a large one-time download, see 3.10), and they are run by the assistant on every change. A skipped test is never counted as passed. What matters for you: **0 failed**.

### 2.5 If something goes wrong

| What you see | Meaning and fix |
|---|---|
| `'npm' is not recognized` / `command not found` | Node.js is not installed, or the terminal was opened before installing it. Install Node 22 or 24 and **close and reopen VS Code** |
| `EBADENGINE` warning, or tests will not start | Your Node.js version is not supported. Run `node --version`. Use **22.x or 24.x** |
| `running scripts is disabled on this system` (Windows PowerShell) | PowerShell's safety setting is blocking npm's script. Type `npm.cmd` instead of `npm` (same program), or use Command Prompt |
| `git pull` says *"Your local changes to the following files would be overwritten by merge: backend/package-lock.json"* | `npm install` rewrote that file on your computer and Git is protecting it. Nothing of yours is lost. Run `git status` (only `package-lock.json` should be listed), then `git restore package-lock.json`, then `git pull`, then `npm ci`. If `git status` lists other files you did not change on purpose, send the output before restoring |
| Postman says `Error: read ECONNRESET` on a request that should work | A connection that had sat idle was reused just as the server closed it. Press **Send** again. (Updated servers keep idle connections open for 65 seconds instead of 5, which prevents it.) |
| Postman says `Error: connect ECONNREFUSED 127.0.0.1:4000` | The server is not running. Start it with `npm run dev` and wait for the `FINDIT API is running` line. Keep that window open |
| Any test says **failed** | Copy the **whole** terminal text and send it to the assistant |

---

## Part 3. Create the free database and run the server

**Goal:** create your own free database in the cloud (MongoDB Atlas), connect FINDIT to it, and see the health check say `"database":"connected"`.

> The Atlas website changes its screens from time to time. The steps below describe *what* to do, based on how the screens looked when this was first tested. Button names may look slightly different. If you get stuck, describe what you see, or send a screenshot with **every password and connection string covered**.
>
> **Golden rule:** your *connection string* contains your database password. **Never paste it into chat, commit it, screenshot it or share it.** It lives only in `backend/.env`, which Git ignores.
>
> **If a password ever appears anywhere except your private `.env`** (a chat, an email, a screenshot, a screen share), treat it as leaked and replace it straight away. In Atlas open **Database Access**, create a new user with a new password, delete the old user, and update `.env`. It takes about three minutes, and it makes the leaked password useless. When you need help with something that contains a password, replace the password with `***` first.

### 3.1 Create an Atlas account

Go to <https://www.mongodb.com/atlas> and choose **Try Free**. You can use **Sign up with Google**, or fill in the form (first name, last name, email and a strong password; Company is optional). Verify your email if asked and answer the welcome questions (any answers are fine). The account password is **not** the database password you create later.

### 3.2 Create a free cluster

On the **Set up your cluster** screen:

- **Free (M0)** must be selected. This is the free tier, and **no payment card is needed**. If Atlas asks for card details for the free option, stop and tell the assistant.
- **Name:** `Cluster0` is fine. Our code does not care what it is called.
- **Preload sample dataset:** leave it **unticked**. We do not need the example data.
- **Region:** the one nearest to you (for example Paris).
- **Do not** click *"Skip - I'm here for something else"*.

Click **Create** and wait a minute or two.

### 3.3 Create a database user with limited rights

Atlas shows a quick setup screen. It **adds your current IP address automatically** and **creates a first database user with the powerful "Atlas Admin" role**. FINDIT does not need that much power, so we create a limited user instead:

1. In the left menu open **Database Access** → **Add New Database User**.
2. Authentication method: **Password**. Username: `findit_app`.
3. Password: make your own, **letters and digits only**, at least 12 characters (special characters can break the connection string). Save it in a private place such as a password manager, **not** in the project and **not** in chat.
4. Built-in role: **Read and write to any database**.
5. Leave **Custom Roles**, **Specific Privileges** and **Restrict Access** alone (nothing selected), and keep **Temporary User turned OFF**. A temporary user is deleted automatically, and your app would suddenly stop connecting.
6. Click **Add User**.
7. Back in the list, **delete the automatically created Atlas Admin user** (**Delete** next to it). From now on only `findit_app` can connect.

### 3.4 Check your computer is allowed to connect

In the left menu open **Network Access**. Your current IP address should already be on the list (Atlas added it during setup). If not, choose **Add IP Address** → **Add Current IP Address** → **Confirm**.

Atlas only accepts connections from addresses on this list. **When you change network** (home Wi-Fi, campus Wi-Fi, a phone hotspot), your address changes and you must add the new one. It is the most common reason for connection failures. For a short demo on an unknown network you can choose **Allow access from anywhere**, which is less secure, so remove it afterwards.

**On mobile data, a MiFi or a phone hotspot, use "Allow access from anywhere" while you develop.** Mobile networks share one public address between many customers and change it often (sometimes within minutes), so an entry for "your current address" can stop working while you are using it. This is safe enough for development because the database holds only test data, the database user has limited rights, and the password is strong. Tighten it again before real use.

### 3.5 Get the connection string

Go to **Database** → find your cluster → **Connect** → **Drivers** → **Node.js**. Leave **Enable network compression** unticked. Atlas shows a connection string in one of two shapes. **Both work with FINDIT:**

```text
mongodb+srv://<db_username>:<db_password>@cluster0.abc12.mongodb.net/?appName=Cluster0
```

or a longer one with three server names:

```text
mongodb://<db_username>:<db_password>@ac-abc12-shard-00-00.abc12.mongodb.net:27017,ac-abc12-shard-00-01.abc12.mongodb.net:27017,ac-abc12-shard-00-02.abc12.mongodb.net:27017/?ssl=true&replicaSet=atlas-abc12-shard-0&authSource=admin
```

Atlas also shows example code (`import { MongoClient } ...`). **Ignore it.** FINDIT already contains its own connection code, and you only need the address.

Replace `<db_username>` with `findit_app` and `<db_password>` with your password, **removing the `<` and `>` signs too**.

### 3.6 Create your private settings file

In the `backend` folder, copy the example file to a new file named `.env`:

```bash
cp .env.example .env
```

On Windows Command Prompt or PowerShell use `copy .env.example .env` instead. Open `backend/.env` in VS Code and make the line read:

```text
MONGODB_URI=<your finished connection string>
```

Rules for that line: the label `MONGODB_URI=` appears **only once, at the very start**; the string follows it **directly**; **one line, no quotes, no spaces, no `<` or `>`**. Save with Ctrl+S. Then check Git ignores the file: run `git status`. `.env` must **not** appear in the list.

To check the start of the line without showing the password, run this (it prints only the first 20 characters):

```powershell
Get-Content .env | Where-Object { $_ -notlike '#*' -and $_ -like '*mongo*' } | ForEach-Object { $_.Substring(0, [Math]::Min(20, $_.Length)) }
```

A correct file prints `MONGODB_URI=mongodb:` and `MONGODB_DB_NAME=find`.

### 3.7 Check the connection

```bash
npm run check:db
```

**Success looks like this** (the version and address will differ a little):

```text
Connecting to MongoDB (waiting up to 10 seconds)...
SUCCESS: connected to MongoDB.
  Database name : findit
  Server version: 8.0.x
  Server address: ac-abc12-shard-00-00.abc12.mongodb.net
```

This command only *reads*: it never changes your data, and it never prints your password, so it is safe to paste its output to the assistant. If it fails, it explains what to check. See 3.9.

### 3.8 Start the server

```bash
npm run dev
```

**Success looks like:**

```text
> findit-backend@0.1.0 dev
> node --watch src/server.js

Connected to MongoDB (database "findit").
FINDIT API is running (development mode).
Health check: http://localhost:4000/api/v1/health
Press Ctrl+C to stop.
```

Open <http://localhost:4000/api/v1/health>. You should see `"database":"connected"`:

```json
{"success":true,"data":{"status":"ok","database":"connected","uptimeSeconds":12,"time":"2026-11-22T15:00:00.000Z"}}
```

If Windows shows a firewall pop-up for Node.js, choose **Allow access on private networks**. Stop the server with **Ctrl+C** (on Windows, type `Y` if it asks `Terminate batch job (Y/N)?`).

### 3.9 If something goes wrong

The program explains problems in plain words. The common ones:

| Message starts with | Meaning and fix |
|---|---|
| `Settings problem: MONGODB_URI is not set` | The `.env` file is missing, is in the wrong folder (it must be inside `backend`), or the line is empty. Redo 3.6 |
| `Invalid MONGODB_URI. The value starts with "MONGODB_URI=" again` | The label was pasted twice. Delete the second `MONGODB_URI=` so the line reads `MONGODB_URI=mongodb://...` |
| `Invalid MONGODB_URI. It must start with ...` | Something comes before `mongodb`. Run the 20-character check in 3.6 to see the start of the line, and remove whatever precedes `mongodb` |
| `MONGODB_URI still contains a placeholder` | You left `<db_username>` or `<db_password>` in. Replace the whole placeholder including the `<` `>` |
| `The database rejected the username or password` | Wrong username or password, or the password has special characters. In Atlas → Database Access, edit the user and set a new letters-and-digits password. Update `.env` |
| `The database did not answer in time` | **Most often your IP address is not allowed:** redo 3.4 (on mobile data or a MiFi choose *Allow access from anywhere*, and wait until it shows Active). **On a slow or mobile connection, give it longer:** add the line `MONGODB_TIMEOUT_MS=30000` to `backend/.env` (it waits 30 seconds instead of 10), save, and try again. Also check your internet, a VPN, and that the cluster is not paused. To test whether your network can reach Atlas at all, run `Test-NetConnection <the first server name after the @ in your connection string> -Port 27017` and look for `TcpTestSucceeded : True`. If it says `False`, this network blocks the database port: try another network (home or campus Wi-Fi, or a phone hotspot that worked before). The long "IP whitelist" sentence in the message is printed for any timeout, so it does not prove the address is the cause |
| `The database address could not be found` | The part after `@` in the connection string is wrong, or you are offline. Copy the string from Atlas again |
| `Port 4000 is already in use` | Another program uses the port. Close it, or add `PORT=4001` to `backend/.env` |

If it is none of these, copy the **whole** terminal text and send it. (The tool hides your password in its messages, but check before pasting.)

### 3.10 Optional: run the database tests on your laptop

**You can skip this.** The assistant runs these tests on every change in its own environment. Running them yourself needs a **one-time download of a test copy of MongoDB: about 500 to 800 MB on Windows**. It is stored in your user folder (outside the project) and reused. Only do this on a good connection, with a few GB of free disk space (my estimate; I have not measured it on Windows).

```bash
npm run test:db
```

On success you will see `Tests: 350 passed, 350 total` (a smaller number on an older checkout). This test database is created in memory and thrown away afterwards. **It never touches your Atlas database.**

---

## Part 4. Create your first administrator account

**Goal:** make the server ready for logins and create the first administrator in your Atlas database. FINDIT has **no public way to become an administrator**: sign-up only ever creates regular users, so you create the first administrator yourself, on your own computer.

### 4.1 Get the latest code

In the `backend` folder:

```bash
git pull
```

```bash
npm ci
```

```bash
npm test
```

You should see `Tests: 60 skipped, 150 passed, 210 total` on the Stage 4 code (later stages show larger numbers), with 0 failed.

### 4.2 Make a secret key for logins

```bash
npm run make:secret
```

It prints one long line of 96 letters and digits. **Copy it.** This key signs the "tickets" (tokens) people receive when they log in. Anyone who has it could forge a login, so it lives **only** in `backend/.env`. Never paste it into chat or commit it. (If it ever leaks, run this command again to make a new one. Everyone is then simply logged out.)

### 4.3 Add the new settings to `.env`

Open the `backend/.env` file you already have (do **not** copy `.env.example` over it, or you would lose your database setting). Add these four lines at the bottom, replacing every `<...>` part **including the `<` and `>` signs**:

```text
JWT_SECRET=<paste the 96-character key here>
SEED_ADMIN_EMAIL=<the email you will log in with as administrator>
SEED_ADMIN_PASSWORD=<a strong password: 8 or more characters with at least one letter and one number>
SEED_ADMIN_NAME=<your name>
```

Rules: no quotes, no spaces around `=`, each label appears only once, one line each. Choose a password you have never used anywhere else (12 or more characters is better), and **do not paste it into chat**. Save with Ctrl+S.

### 4.4 Create the administrator

```bash
npm run seed:admin
```

**Success looks like** (with your email):

```text
SUCCESS: you@example.com is now an administrator.
NEXT: delete the SEED_ADMIN_PASSWORD line from backend/.env. It is not needed any more.
```

The script never prints your password. It is safe to run again: it will say `Nothing to do: ... is already an administrator`, and it never changes an existing password.

### 4.5 Remove the password from `.env`

Delete the whole `SEED_ADMIN_PASSWORD=...` line from `backend/.env` and save. It was only needed once, and a password does not belong in a file for longer than necessary.

### 4.6 Start the server

```bash
npm run dev
```

**Success looks like** the same as before: `Connected to MongoDB (database "findit").` then `FINDIT API is running (development mode).` and the health-check line. Leave it running for Part 5.

### 4.7 If something goes wrong

| Message starts with | Meaning and fix |
|---|---|
| `Settings problem: JWT_SECRET is not set` | The `JWT_SECRET=` line is missing, empty or misspelled in `backend/.env`. Redo 4.2 and 4.3 |
| `Invalid JWT_SECRET. It is too short` | Paste the **whole** 96-character line from `npm run make:secret`, with nothing cut off |
| `Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in backend/.env first` | Those two lines are missing or empty. Redo 4.3 |
| `Could not create the administrator: SEED_ADMIN_PASSWORD: Password must contain...` | The password is too weak. It needs 8 or more characters with at least one letter and one number |
| `Could not create the administrator: SEED_ADMIN_EMAIL: Enter a valid email address.` | The email is not valid. Check for typos or leftover `<` `>` |
| `... already exists as a regular account, so nothing was changed` | That email has already signed up as a normal user. To make it an administrator on purpose, run `npm run seed:admin -- --promote` |

---

## Part 5. Try the API with Postman

**Goal:** use FINDIT's API by clicking buttons, check that login works, and see the safety rules refuse bad requests. Postman is a free tool for sending requests to an API and checking the replies.

### 5.1 Open Postman and import the requests

Open Postman (Part 1.1). It may ask you to create a free account. That is fine. Click **Import**, then choose the file `documentation/postman/FINDIT.postman_collection.json` from your `FINDIT` folder (drag it in or browse to it). A collection called **FINDIT API** appears in the left list.

*Postman changes its screens often. If yours looks different, describe what you see.*

### 5.2 Run the requests in order

The server from Part 4 must be running. Open the collection, click request **0. Health check**, then **Send**. Under the reply, the **Test Results** tab shows green **PASS** lines. Do the same for **1, 2, 3, 4, 5** in order:

| Request | What it does | What to look for |
|---|---|---|
| 0. Health check | Is the server and database up? | `database` is `connected` |
| 1. Register | Creates a brand-new throwaway test account (a fresh email every time) | Status **201**; `role` is `user`; no password hash in the reply |
| 2. Login | Logs in; the token is saved automatically | Status **200** |
| 3. Who am I | Shows the logged-in account | Status **200**; your test email |
| 4. Update my profile | Changes the name | Status **200** |
| 5. Change my password | Changes the password | Status **200** |

Then open the last folder, **Things that SHOULD be refused**, and send each request. For these, a green **PASS** means the refusal **worked**: signing up as an admin is refused, a wrong password is refused, no token is refused, and changing your email through the profile is refused.

You can also run everything at once: hover over the collection, click the **⋯** menu, choose **Run collection**, then **Run**. Everything should be green, with **0 failed**.

### 5.3 Check that your administrator works

Open the collection and go to its **Variables** tab. In the **Current value** column, type your administrator email and password into `adminEmail` and `adminPassword`, and save. Then send **Optional: log in as the ADMINISTRATOR**. You should get status **200**, and the test **this account is an administrator** passes. When you are done, **clear those two values** (do not share or export the collection while they are filled in).

### 5.4 If something goes wrong

| What you see | Meaning and fix |
|---|---|
| `Could not get any response` / `ECONNREFUSED` | The server is not running. Start it with `npm run dev` (Part 4.6) and look for the `FINDIT API is running` line |
| **3. Who am I** gives `401` | There is no token yet. Send **1. Register** or **2. Login** first, then try again |
| `429 RATE_LIMITED` | Too many failed logins for that email. Wait the number of seconds in the `Retry-After` header, or stop and restart the server (the counters live in memory) |
| **1. Register** says the email already exists | You edited its body by hand. Put `{{email}}` back, since the request normally makes a new email each time |
| `The database ... ` errors in the server window | See Part 3.9 |

Every **Register** creates a harmless test account in your Atlas database `findit`. They are fake data, and you can delete them later in Atlas under **Browse Collections**.

## Part 6. Report lost and found items (Stage 5)

**Goal:** use the new item features by clicking in Postman: see the campus place options, report a lost item and a found item, look at your own reports, edit one, close one, and watch the safety rules refuse bad requests. The data you create is fake test data.

**Uses:** your Atlas database. Use your **phone's hotspot** if the MiFi cannot reach Atlas (Part 3.9).

### 6.1 Get the latest code

In the `backend` folder, run these one at a time:

```bash
git pull
```

```bash
npm ci
```

```bash
npm test
```

**Success looks like:** `Tests: 113 skipped, 237 passed, 350 total` and **0 failed**. (If `git pull` complains about `package-lock.json`, run `git restore package-lock.json` and then `git pull` again.)

### 6.2 Start the server

```bash
npm start
```

**Success looks like:** `Connected to MongoDB (database "findit").` then `FINDIT API is running (development mode).` Leave this window open. The first time, the server also creates the new `items` collection and its indexes in Atlas; that takes a second.

### 6.3 Replace the Postman collection

The collection grew from 11 to 26 requests. In Postman, delete the old **FINDIT API** collection (right-click it, then **Delete**), then **Import** `documentation/postman/FINDIT.postman_collection.json` again (Part 5.1).

### 6.4 Run the new requests in order

Send **0** to **5** again first (they sign you up as a new throwaway tester and log you in), then:

| Request | What it does | What to look for |
|---|---|---|
| 6. See the place options | Asks the server which places exist | Status **200**. In the reply, `MALE_HALLS` has a list of halls and `LIBRARY` asks for a description |
| 7. Report a LOST item | Reports lost headphones, last seen in the library | Status **201**. `status` is `OPEN`, `isMine` is `true`, and you can see your own `privateDetails` |
| 8. Report a FOUND item | Reports found keys, near a male hall (Winslow) | Status **201**. `reportType` is `FOUND` |
| 9. My reports | Lists the reports you made, newest first | Status **200**. Both reports are there, and **no** private details appear in the list |
| 10. View one of my reports | Opens the found item in full | Status **200**. You see `privateStorageLocation` (only you and administrators can) |
| 11. Edit my LOST report | Changes the brand, and moves the place to a female hall | Status **200**. Only the fields you sent changed |
| 12. Close my LOST report | "Found it myself" | Status **200**. `status` is `CLOSED` |

Then open the folder **Things that SHOULD be refused** and send the new requests at the bottom. A green **PASS** means the refusal **worked**: a future date, a status sent by the client, a hall that is not on the list, no login, closing twice, editing a closed report, an unknown report and an oversized page are all refused.

If you use **Run collection**, the request named **Optional: log in as the ADMINISTRATOR** will show red unless you filled in your administrator details (Part 5.3). That is expected and not a problem with the code.

### 6.5 Try the place rules yourself

Open **7. Report a LOST item**, go to **Body**, and change `"generalLocation"` to `"MALE_HALLS"` and `"locationDetail"` to `"Nyberg"`, then **Send**. You should get **400**, with a message that the hall must be one of the listed places (Nyberg is a female hall). Change `"locationDetail"` to `"Winslow"` and **Send**: now it works. Put the request back to how it was before you move on, or re-import the collection.

### 6.6 Look at the data in Atlas (optional)

In Atlas, open your cluster, click **Browse Collections**, then database `findit`. A new collection **items** holds your test reports, next to **users**. The private details are stored there (it is your own database), but the API only shows them to the reporter and to administrators.

### 6.7 If something goes wrong

| What you see | Meaning and fix |
|---|---|
| `ECONNREFUSED` | The server is not running. Start it with `npm start` |
| Request 7 or 8 returns **400** about `dateOccurred` | The request fills in today's date by itself. If you pasted your own body, use the form `2026-11-24` and a date within the last year, not later than tomorrow |
| Requests 9 to 12 return **404** or the URL shows `{{foundItemId}}` | Requests 7 and 8 must be sent first in the same session, because they save the report ids. Send **7** and **8** again |
| **11** or **12** returns **409** | The report was already closed. Send **7** again for a fresh one |
| **401** | The token is missing. Send **2. Login** again |

### 6.8 What to tell the assistant

Please tell it: (1) the `npm test` result line, (2) whether requests 6 to 12 and the refusals all gave what the table says (or which one did not, with the reply text, **after replacing any email or token with `***`**), and (3) **which side Emerald Hall and Topaz Hall belong to (male or female hall)**, and whether "Nyberg" is the right spelling.

---

## Future parts (headings only; nothing written yet)

| Part | Written in |
|---|---|
| 7. Create and run the mobile app in Expo Go | Stage 7 |
| 8. Connect your phone to the backend (finding your laptop's IP address, Wi-Fi and firewall troubleshooting) | Stage 8 |
| 9. Set up Cloudinary | Stage 9 |
| 10. Run the admin dashboard | Stage 12 |
| 11. Troubleshooting guide | Grows throughout; finalised in Stage 19 |
