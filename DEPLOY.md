# Deploying to GitHub Pages

This guide walks you through putting both apps live on GitHub Pages.
You will end up with two URLs:

- **DM Console:** `https://YOUR-GITHUB-USERNAME.github.io/greenhunger-dm/`
- **Player App:** `https://YOUR-GITHUB-USERNAME.github.io/greenhunger-players/`

---

## What you need

- A GitHub account (free at github.com)
- Git installed on your computer
- Node.js installed (see README.md)

---

## Part 1 — Create two GitHub repositories

### DM repo

1. Go to https://github.com/new
2. Repository name: `greenhunger-dm`
3. Set to **Public**
4. Click **Create repository**
5. Don't add a README — leave it empty

### Players repo

1. Go to https://github.com/new
2. Repository name: `greenhunger-players`
3. Set to **Public**
4. Click **Create repository**
5. Leave it empty

---

## Part 2 — Deploy the DM app

Open Terminal and run these commands. Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username.

```bash
cd green-hunger-v7/dm
npm install
npm run build
```

This creates a `dist/` folder with the built app. Now push it to GitHub:

```bash
cd dist
git init
git add .
git commit -m "Deploy DM app v7"
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/greenhunger-dm.git
git push -u origin main
```

### Enable GitHub Pages for the DM repo

1. Go to your `greenhunger-dm` repository on GitHub
2. Click **Settings** (top right of the repo)
3. Scroll down to **Pages** in the left sidebar
4. Under "Source", select **Deploy from a branch**
5. Branch: `main` / folder: `/ (root)`
6. Click **Save**
7. Wait 2–3 minutes, then your app is live at:
   `https://YOUR-GITHUB-USERNAME.github.io/greenhunger-dm/`

---

## Part 3 — Deploy the Players app

```bash
cd green-hunger-v7/players
npm install
npm run build
```

```bash
cd dist
git init
git add .
git commit -m "Deploy Players app v7"
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/greenhunger-players.git
git push -u origin main
```

### Enable GitHub Pages for the Players repo

Same steps as above but for `greenhunger-players`.

Your player URL will be:
`https://YOUR-GITHUB-USERNAME.github.io/greenhunger-players/`

---

## Part 4 — Test it

1. Open the DM Console URL in your browser
2. Open the Player App URL in another browser window (or on your phone)
3. In the DM Console, click **Next →** to advance a beat
4. The scene name on the Player App should update within a second

---

## Updating the app after changes

Whenever you want to push new code, just repeat the build + push steps:

```bash
cd green-hunger-v7/dm   (or /players)
npm run build
cd dist
git add .
git commit -m "Update"
git push
```

GitHub Pages picks up the new files automatically within a minute or two.

---

## Sharing with your players

Just send them the Players App URL:
`https://YOUR-GITHUB-USERNAME.github.io/greenhunger-players/`

They open it on their phone or laptop before the session starts.
No login required. It connects automatically.
