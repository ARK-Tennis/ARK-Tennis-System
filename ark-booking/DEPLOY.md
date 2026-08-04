# Deploying the ARK Tennis booking site

This is a React app (Vite). Vercel builds and hosts it — no server for you to manage.

## 1. Get the code into a GitHub repo
Easiest path since you don't have a dev setup:
1. Go to github.com → create a new repository (e.g. `ark-tennis-booking`), keep it **Private**.
2. On the repo page, use **"uploading an existing file"** (or drag-and-drop) to upload every file in
   this folder, keeping the same structure (the `src/` folder needs to stay a folder).

If you'd rather do it from a terminal instead: `git init`, `git add .`, `git commit -m "initial"`,
then follow GitHub's instructions to push to the new repo.

## 2. Import into Vercel
1. vercel.com → **Add New → Project**
2. Import the `ark-tennis-booking` repo
3. Framework preset should auto-detect as **Vite** — leave build settings default
4. Before deploying, add an **Environment Variable**:
   - Name: `VITE_API_BASE_URL`
   - Value: your Apps Script `/exec` URL (the one you've been testing with, e.g.
     `https://script.google.com/a/macros/ark-tennis.com/s/AKfycb.../exec`)
5. Click **Deploy**

Vercel gives you a live URL immediately (something like `ark-tennis-booking.vercel.app`) — that's a
fully working version you can click through right away.

## 3. Point book.ark-tennis.com at it
1. In Vercel: Project → **Settings → Domains** → add `book.ark-tennis.com`
2. Vercel will show you a CNAME record to add — something like:
   ```
   Type: CNAME
   Name: book
   Value: cname.vercel-dns.com
   ```
3. In GoDaddy: **My Products → DNS** (next to ark-tennis.com, not inside Website Builder) →
   add that exact CNAME record
4. DNS changes can take anywhere from a few minutes to a few hours to go live. Vercel's Domains
   page will show a green checkmark once it's connected.

## Updating the site later
Any time I give you updated code, replace the files in the GitHub repo (same upload method) —
Vercel automatically rebuilds and redeploys within about a minute of a change landing in the repo.
No redeploy button to remember, unlike Apps Script.

## Local preview (optional)
If you ever want to see changes before they're live:
```
npm install
npm run dev
```
opens it at localhost in your browser, using whatever `VITE_API_BASE_URL` is in a local `.env` file
(copy `.env.example` to `.env` and fill in your real URL).
