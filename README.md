# 📻 CHILL VIBE - Retro Indian Barbershop Radio

"CHILL VIBE" is a nostalgic web radio player that recreates the cozy atmosphere of a retro Indian barbershop playing soft romantic Bollywood classics. It features a custom CSS/SVG-illustrated active scene and a synchronized playback engine that ensures all visitors worldwide hear the same audio offset at the same time—creating a true "live radio" experience. 

Presence is handled in real-time by a PartyKit WebSocket server.

---

## 🛠️ Stack and Architecture

- **Frontend**: Plain HTML5, CSS3 (variables, transitions, keyframe animations), and vanilla JavaScript. Loaded without any build steps.
- **Audio Engine**: Hidden official YouTube IFrame Player API. Audio is streamed client-side directly from YouTube (never downloaded or cached).
- **Presence**: PartyKit backend broadcasting connection count to all clients.
- **Hosting**: Cloudflare Pages for the static frontend, PartyKit Cloud for the presence server.

---

## 📜 YouTube Terms of Service (ToS) Compliance

> [!IMPORTANT]
> This application relies strictly on the official YouTube IFrame Player API. All playback happens client-side, and no copyrighted media files are downloaded, stored, or rehosted. The player is kept visually hidden using absolute off-screen coordinates (`left: -9999px`) rather than CSS `display: none` (which breaks playback in multiple engines). Future modifications must preserve this client-side embedding mechanism to comply with YouTube ToS.

---

## 💻 Local Development Setup

### 1. Install Dependencies
Ensure you have [Node.js](https://nodejs.org/) installed, and run:
```bash
npm install
```

### 2. Auto-generate your Playlist Metadata (Duration Array)
Rather than manually calculating track lengths (which is error-prone and breaks synchronized playback if wrong), run the included CLI script to fetch metadata directly from the YouTube Data API:

1. Obtain a YouTube Data API Key from the [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com).
2. Run the script:
   ```bash
   node scripts/fetch-playlist.js <YOUR_API_KEY> <YOUR_YOUTUBE_PLAYLIST_ID>
   ```
3. Copy the output arrays (`PLAYLIST_ID`, `TRACK_DURATIONS`, and `TRACK_TITLES`) and paste them directly into the configuration block at the top of [`app.js`](file:///c:/Users/RISHABH-THAKUR/OneDrive/Desktop/chill-vibe/app.js).

### 3. Run the PartyKit Server
Start the local WebSocket development server:
```bash
npm run dev
```
By default, the server runs on `http://localhost:1999`.

### 4. Serve the Frontend
Since there is no build step or bundler needed for the frontend, you can:
- Open [`index.html`](file:///c:/Users/RISHABH-THAKUR/OneDrive/Desktop/chill-vibe/index.html) directly in your browser.
- Or run a simple static server (e.g. `npx serve .` or use VS Code Live Server).

---

## 🚀 Production Deployment

### 1. Deploy the Presence Server (PartyKit)
Publish your PartyKit WebSocket backend:
```bash
npm run deploy
```
Once deployed, the CLI will output your production host URL (e.g., `chill-vibe.username.partykit.dev`).

### 2. Update the Frontend URL
Open [`app.js`](file:///c:/Users/RISHABH-THAKUR/OneDrive/Desktop/chill-vibe/app.js) and replace `PARTYKIT_HOST` with your deployed production host:
```javascript
// app.js
const PARTYKIT_HOST = "chill-vibe.username.partykit.dev"; // 👈 Update this line
```

### 3. Deploy the Frontend (Cloudflare Pages)
Since CHILL VIBE is static, you can deploy it instantly on Cloudflare Pages:

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git** (or select **Upload assets**).
2. If connecting to Git, select your repository.
3. Configure the build:
   - **Framework preset**: None
   - **Build command**: (Leave empty)
   - **Build output directory**: `.` (Root directory)
4. Click **Save and Deploy**.

### 4. Map a Custom Domain (Cloudflare DNS)
To point your custom domain (e.g. `radio.mywebsite.com`) to Cloudflare Pages:
1. In the Pages dashboard, go to the **Custom domains** tab of your project.
2. Click **Set up a custom domain** and enter your subdomain.
3. Cloudflare will automatically configure the SSL certificate and add the correct CNAME record to your DNS zone.
