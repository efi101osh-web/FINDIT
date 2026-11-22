# FINDIT: Setup Guide

> **Status: PARTIAL.** Only Part 1 (getting your laptop ready) is written, because nothing else exists to run yet. Each later part is added **in the stage that creates the thing it sets up**, after being tested. The headings of those future parts are listed at the end so you know what is coming. They contain no instructions yet.

You will run FINDIT on **your own laptop**. The coding assistant writes code in the cloud and saves it to GitHub. You download it with Git, and then everything runs locally.

---

## Part 1. Get your laptop ready

### 1.1 Install these (all free)

| Tool | What it is | Get it from | Check it worked |
|---|---|---|---|
| **Node.js 22 (LTS)** | Runs the backend and the build tools | nodejs.org | `node --version` prints `v22.x.x` |
| **npm** | Installs libraries (comes with Node.js) | included | `npm --version` prints a number such as `10.x.x` |
| **Git** | Downloads and saves versions of the code | git-scm.com | `git --version` prints `git version 2.x.x` |
| **Visual Studio Code** | Code editor | code.visualstudio.com | It opens |
| **Postman** | Lets you send test requests to the API | postman.com | It opens |

**About the Node.js version:** the project is developed and tested with **Node 22**. A newer version may work, but it has not been tested, so Node 22 is recommended. If you install a different version, tell the assistant.

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

A *branch* is a separate line of work. The assistant saves its work on the branch `claude/beautiful-clarke-jsqjs1`, not on `main`, so `main` stays stable. When a stage is reviewed and working, it can be merged into `main`. This is the "feature branch" habit the brief asks for. Merging into `main` happens only when you decide.

---

## Future parts (headings only; nothing written yet)

| Part | Written in |
|---|---|
| 2. Run the backend and check `/health` | Stage 2–3 |
| 3. Create the MongoDB Atlas database and connect | Stage 3 |
| 4. Create the first admin account | Stage 4 |
| 5. Test the API with Postman | Stage 4–6 |
| 6. Create and run the mobile app in Expo Go | Stage 7 |
| 7. Connect your phone to the backend (finding your laptop's IP address, Wi-Fi and firewall troubleshooting) | Stage 8 |
| 8. Set up Cloudinary | Stage 9 |
| 9. Run the admin dashboard | Stage 12 |
| 10. Troubleshooting guide | Grows throughout; finalised in Stage 19 |
