const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("\x1b[33m%s\x1b[0m", "Usage: node scripts/fetch-playlist.js <API_KEY> <PLAYLIST_ID>");
  console.log("To obtain an API key, visit: https://console.cloud.google.com/apis/library/youtube.googleapis.com");
  process.exit(1);
}

const [apiKey, playlistId] = args;

// Helper to parse ISO 8601 duration (e.g. PT4M20S, PT1H2M30S)
function parseISODuration(durationStr) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationStr.match(regex);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || 0, 10);
  const minutes = parseInt(matches[2] || 0, 10);
  const seconds = parseInt(matches[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchPlaylist() {
  try {
    console.log(`\x1b[36mFetching items from playlist ID:\x1b[0m ${playlistId}...`);
    let videoIds = [];
    let videoTitles = [];
    let nextPageToken = '';
    
    // Page loop for playlist items
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.items) {
        for (const item of data.items) {
          const videoId = item.contentDetails?.videoId;
          const title = item.snippet?.title;
          if (videoId) {
            videoIds.push(videoId);
            videoTitles.push(title || "Unknown Track");
          }
        }
      }
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    console.log(`\x1b[36mFound ${videoIds.length} tracks. Fetching details (durations)...\x1b[0m`);
    
    let durations = [];
    // Fetch video details in chunks of 50 (API limit)
    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunk.join(',')}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch video details: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.items) {
        const durationMap = {};
        for (const item of data.items) {
          durationMap[item.id] = parseISODuration(item.contentDetails?.duration || "PT0S");
        }
        for (const id of chunk) {
          durations.push(durationMap[id] || 0);
        }
      }
    }
    
    // FILTER OUT NON-PLAYABLE AND LONG TRACKS (> 8 Minutes)
    let playableIds = [];
    let playableDurations = [];
    let playableTitles = [];
    let skippedLongTracksCount = 0;
    let unavailableCount = 0;

    for (let i = 0; i < videoIds.length; i++) {
      const dur = durations[i];
      if (dur === 0) {
        unavailableCount++;
      } else if (dur > 480) { // 8 minutes threshold
        skippedLongTracksCount++;
      } else {
        playableIds.push(videoIds[i]);
        playableDurations.push(dur);
        playableTitles.push(videoTitles[i]);
      }
    }

    // Package into JSON payload
    const playlistData = {
      playlistId: playlistId,
      ids: playableIds,
      durations: playableDurations,
      titles: playableTitles
    };
    
    // Write JSON file directly to workspace root
    const filename = args[2] || 'playlist.json';
    const outputPath = path.join(__dirname, `../${filename}`);
    fs.writeFileSync(outputPath, JSON.stringify(playlistData, null, 2), 'utf-8');
    
    console.log(`\n\x1b[32mSuccess! Filtered playlist details written to ${filename} in project root.\x1b[0m\n`);
    console.log(`Saved ${playableDurations.length} active tracks successfully.`);
    console.log(`Filtered out ${unavailableCount} unavailable videos.`);
    console.log(`Filtered out ${skippedLongTracksCount} songs longer than 8 minutes.`);

  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", `Error fetching playlist data: ${error.message}`);
    console.log("Please check your API key, playlist visibility (should be Public or Unlisted), and your internet connection.");
  }
}

fetchPlaylist();
