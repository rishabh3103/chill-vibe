const fs = require('fs');
const path = require('path');

const files = ['playlist_1.json', 'playlist_2.json', 'playlist_3.json', 'playlist_4.json', 'playlist_5.json'];
let allIds = [];
let allDurations = [];
let allTitles = [];
const seenIds = new Set();

for (const file of files) {
  const filePath = path.join(__dirname, `../${file}`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (let i = 0; i < data.ids.length; i++) {
      const id = data.ids[i];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        allIds.push(id);
        allDurations.push(data.durations[i]);
        allTitles.push(data.titles[i]);
      }
    }
  }
}

// Packages all tracks into a single unified playlist.json database
const merged = {
  playlistId: "PLinVjP-aRmltp5oCTTm9p8AHut05y0kgC",
  ids: allIds,
  durations: allDurations,
  titles: allTitles
};

fs.writeFileSync(path.join(__dirname, '../playlist.json'), JSON.stringify(merged, null, 2), 'utf-8');
console.log(`Merged all 5 playlists successfully. Total unique active tracks: ${allIds.length}`);
