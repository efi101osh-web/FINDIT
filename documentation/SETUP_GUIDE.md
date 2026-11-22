# FINDIT: Setup Guide

> **Status: PARTIAL.** Part 1 (getting your laptop ready) and Part 2 (running the backend) are written. Each later part is added **in the stage that creates the thing it sets up**, after being tested. The headings of those future parts are listed at the end so you know what is coming. They contain no instructions yet.
>
> **Part 2 was tested in a Linux cloud container (Node 22) and on the owner's Windows laptop (PowerShell, Node 24.20.0).** If your result differs, copy the whole terminal text and send it to the assistant.

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

## Part 2. Run the backend and check it works

**Goal:** start the FINDIT server on your laptop and see it answer. This proves your laptop, Node.js and the project work together.

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

```bash
npm install
```

**Success looks like:** a line such as `added 362 packages` (anything from about 362 to 364 is normal; it varies slightly by operating system) and no red `ERR!` lines. You may see a yellow `deprecated` warning. That is expected and harmless.

### 2.4 (Optional) create your settings file

The defaults work, so you can skip this for now. When later stages need secrets, you will copy the example file like this:

```bash
cp .env.example .env
```

On Windows Command Prompt or PowerShell use `copy .env.example .env` instead. The real `.env` file is private and Git ignores it.

### 2.5 Start the server

```bash
npm run dev
```

**Success looks like exactly this:**

```text
> findit-backend@0.1.0 dev
> node --watch src/server.js

FINDIT API is running (development mode).
Health check: http://localhost:4000/api/v1/health
Press Ctrl+C to stop.
```

The terminal now stays busy. That is correct: the server is running. If Windows shows a firewall pop-up for Node.js, choose **Allow access on private networks**.

### 2.6 Check it in your browser

Open <http://localhost:4000/api/v1/health>. **Success looks like:**

```json
{"success":true,"data":{"status":"ok","uptimeSeconds":12,"time":"2026-11-22T15:00:00.000Z"}}
```

(`uptimeSeconds` and `time` will differ.) Also try <http://localhost:4000/api/v1/nope>. You should see a tidy error message, `{"success":false,"error":{"code":"NOT_FOUND", ...}}`, and not a technical crash page.

### 2.7 Run the automated tests

Stop the server with **Ctrl+C** (on Windows, type `Y` if it asks `Terminate batch job (Y/N)?`), or open a second terminal (**Terminal → New Terminal**, then `cd backend`), and run:

```bash
npm test
```

**Success looks like:**

```text
Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total
```

### 2.8 If something goes wrong

| What you see | Meaning and fix |
|---|---|
| `'npm' is not recognized` / `command not found` | Node.js is not installed, or the terminal was opened before installing it. Install Node 22 and **close and reopen VS Code** |
| `Port 4000 is already in use` | Another program is using that port. Close it, or add `PORT=4001` to `backend/.env` |
| `Settings problem: Invalid PORT ...` | Your `.env` has a bad value. Fix or delete that line |
| `EBADENGINE` warning, or tests will not start | Your Node.js version is not supported. Run `node --version`. Use **22.x or 24.x** |
| `running scripts is disabled on this system` (Windows PowerShell) | PowerShell's safety setting is blocking npm's script. Type `npm.cmd` instead of `npm` (same program), or use Command Prompt |
| Browser says "This site can't be reached" | The server is not running. Look at the terminal for the error |
| Anything else | Copy the **whole** terminal text and send it to me |

---

## Future parts (headings only; nothing written yet)

| Part | Written in |
|---|---|
| 3. Create the MongoDB Atlas database and connect | Stage 3 |
| 4. Create the first admin account | Stage 4 |
| 5. Test the API with Postman | Stage 4–6 |
| 6. Create and run the mobile app in Expo Go | Stage 7 |
| 7. Connect your phone to the backend (finding your laptop's IP address, Wi-Fi and firewall troubleshooting) | Stage 8 |
| 8. Set up Cloudinary | Stage 9 |
| 9. Run the admin dashboard | Stage 12 |
| 10. Troubleshooting guide | Grows throughout; finalised in Stage 19 |
