const { execSync } = require('child_process');
const path = require('path');

const apiKey = "AIzaSyApnpJM3WCwMC3Kyc7wW-8NN1BHiUZkYUY";
const playlists = [
  { id: "PLBKzzWUn97oYJt_RYipYqqUd6XmbjwfLx", file: "playlist_1.json" },
  { id: "PLLounUW9rgqHr6YYR7r4oQOIeqdCZ7gO8", file: "playlist_2.json" },
  { id: "PLGLkhTDJJKA_oB2JYb4INru1mrcXRYLc5", file: "playlist_3.json" },
  { id: "PLu1VwkFUm56jdkb3_AK9KHBOudjDQ3-J9", file: "playlist_4.json" },
  { id: "PLHuHXHyLu7BGZyHRvtx8HLb1OfJsgWyp4", file: "playlist_5.json" }
];

console.log("Starting batch fetch for all 5 stations...");
for (const p of playlists) {
  try {
    console.log(`\n======================================================`);
    console.log(`Fetching Playlist: ${p.id} -> ${p.file}`);
    console.log(`======================================================`);
    execSync(`node scripts/fetch-playlist.js ${apiKey} ${p.id} ${p.file}`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Error fetching station ${p.file}:`, err);
  }
}
console.log("\nBatch fetch completed successfully!");
