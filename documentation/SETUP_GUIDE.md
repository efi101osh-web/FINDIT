# FINDIT: Setup Guide

> **Status: PARTIAL.** Part 1 (getting your laptop ready), Part 2 (install and test the backend) and Part 3 (create the database and run the server) are written. Each later part is added **in the stage that creates the thing it sets up**, after being tested. The headings of those future parts are listed at the end so you know what is coming. They contain no instructions yet.
>
> **Verification status:** Part 2 was tested in a Linux cloud container (Node 22) and on the owner's Windows laptop (PowerShell, Node 24.20.0) as of Stage 2. **Part 3 was tested in the container against a real local MongoDB, and on 2026-11-23 on the owner's Windows laptop against a real MongoDB Atlas free cluster** (connection check and health page both succeeded). If your result differs, copy the whole terminal text and send it to the assistant.

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

**Success looks like:** a line such as `added 413 packages` (a few fewer on Windows is normal) and no red `ERR!` lines. Yellow `deprecated` warnings and a note about "moderate severity vulnerabilities" are expected and harmless. They come from the test tool, not our code. **Do not run `npm audit fix --force`.**

### 2.4 Run the automated tests

```bash
npm test
```

**Success looks like:**

```text
[tests] Database tests are SKIPPED. Run "npm run test:db" to include them (first run downloads MongoDB once; see the setup guide).

Test Suites: 2 skipped, 4 passed, 4 of 6 total
Tests:       7 skipped, 66 passed, 73 total
```

The **7 skipped** tests are the ones that need a real MongoDB. They are deliberately skipped on your laptop (the program they need is a large one-time download, see 3.10), and they are run by the assistant on every change. A skipped test is never counted as passed. What matters for you: **0 failed**.

### 2.5 If something goes wrong

| What you see | Meaning and fix |
|---|---|
| `'npm' is not recognized` / `command not found` | Node.js is not installed, or the terminal was opened before installing it. Install Node 22 or 24 and **close and reopen VS Code** |
| `EBADENGINE` warning, or tests will not start | Your Node.js version is not supported. Run `node --version`. Use **22.x or 24.x** |
| `running scripts is disabled on this system` (Windows PowerShell) | PowerShell's safety setting is blocking npm's script. Type `npm.cmd` instead of `npm` (same program), or use Command Prompt |
| `git pull` says *"Your local changes to the following files would be overwritten by merge: backend/package-lock.json"* | `npm install` rewrote that file on your computer and Git is protecting it. Nothing of yours is lost. Run `git status` (only `package-lock.json` should be listed), then `git restore package-lock.json`, then `git pull`, then `npm ci`. If `git status` lists other files you did not change on purpose, send the output before restoring |
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
| `The database did not answer in time` | **Most often your IP address is not allowed:** redo 3.4. Also check your internet, a VPN, and that the cluster is not paused |
| `The database address could not be found` | The part after `@` in the connection string is wrong, or you are offline. Copy the string from Atlas again |
| `Port 4000 is already in use` | Another program uses the port. Close it, or add `PORT=4001` to `backend/.env` |

If it is none of these, copy the **whole** terminal text and send it. (The tool hides your password in its messages, but check before pasting.)

### 3.10 Optional: run the database tests on your laptop

**You can skip this.** The assistant runs these tests on every change in its own environment. Running them yourself needs a **one-time download of a test copy of MongoDB: about 500 to 800 MB on Windows**. It is stored in your user folder (outside the project) and reused. Only do this on a good connection, with a few GB of free disk space (my estimate; I have not measured it on Windows).

```bash
npm run test:db
```

On success you will see `Tests: 73 passed, 73 total`. This test database is created in memory and thrown away afterwards. **It never touches your Atlas database.**

---

## Future parts (headings only; nothing written yet)

| Part | Written in |
|---|---|
| 4. Create the first admin account | Stage 4 |
| 5. Test the API with Postman | Stage 4–6 |
| 6. Create and run the mobile app in Expo Go | Stage 7 |
| 7. Connect your phone to the backend (finding your laptop's IP address, Wi-Fi and firewall troubleshooting) | Stage 8 |
| 8. Set up Cloudinary | Stage 9 |
| 9. Run the admin dashboard | Stage 12 |
| 10. Troubleshooting guide | Grows throughout; finalised in Stage 19 |
