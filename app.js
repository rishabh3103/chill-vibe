/* ==========================================================================
   CHILL VIBE - Retro Indian Barbershop Radio Audio & Presence Client Engine
   ========================================================================== */



// ==========================================================================
// CONFIGURATION CONSTANTS (REPLACE WITH YOUR PLAYLIST INFORMATION)
// ==========================================================================

// 1. Fixed epoch stream start timestamp in milliseconds (the 'birth' of the station).
// Set in the past or close to now. Let's use August 1, 2026, 00:00:00 UTC.
const STREAM_START = 1785542400000; 

// The playlist info will load dynamically from playlist.json.
// These variables act as fallback placeholders in case playlist.json is missing or fails.
let PLAYLIST_ID = "PLinVjP-aRmltp5oCTTm9p8AHut05y0kgC"; 
let TRACK_IDS = []; // Will store active video IDs dynamically loaded from playlist.json
let TRACK_DURATIONS = [
  240, 180, 210, 300, 150
];
let currentTrackIndex = 0; // Local track index tracker to prevent YouTube playlist URL overflows
let failedTracks = new Set(); // Tracks failed YouTube video indexes to bypass in sync calculations

function playTrack(index, offset = 0) {
  currentTrackIndex = index;
  if (TRACK_IDS.length > 0) {
    player.loadVideoById(TRACK_IDS[index], offset);
  } else {
    player.loadPlaylist(PLAYLIST_ID, index, offset);
  }
}

function getActivePlaylistSource() {
  return TRACK_IDS.length > 0 ? TRACK_IDS : PLAYLIST_ID;
}
let TRACK_TITLES = [
  "Bollywood Lofi Chill - Song 1",
  "Nostalgic Romantic Soft Melody - Song 2",
  "Midnight Barbershop Session - Song 3",
  "Monsoon Rain Over Bombay - Song 4",
  "Retro Cafe Acoustic Vibe - Song 5"
];

 

// Asynchronous config loader promise
let TOTAL_DURATION = TRACK_DURATIONS.reduce((sum, val) => sum + val, 0);

async function loadPlaylistConfig() {
  try {
    const response = await fetch('playlist.json');
    if (!response.ok) throw new Error("Could not find playlist.json");
    const data = await response.json();
    PLAYLIST_ID = data.playlistId || PLAYLIST_ID;
    if (data.ids && data.ids.length > 0) {
      TRACK_IDS = data.ids;
    }
    if (data.durations && data.durations.length > 0) {
      TRACK_DURATIONS = data.durations;
      TRACK_TITLES = data.titles || [];
      TOTAL_DURATION = TRACK_DURATIONS.reduce((sum, val) => sum + val, 0);
      console.log(`Successfully loaded ${TRACK_DURATIONS.length} tracks dynamically from playlist.json`);
    }
  } catch (err) {
    console.warn("Failed to load playlist.json dynamically. Using local placeholders.", err);
  }
}

const configLoadPromise = loadPlaylistConfig();

// ==========================================================================
// RADIO MATH SYSTEM (SYNCHRONIZATION MECHANICS)
// ==========================================================================

/**
 * Calculates which track index and offset within that track should be playing right now
 */
function calculateCurrentTrack() {
  const now = Date.now();
  const elapsedMs = now - STREAM_START;
  
  if (elapsedMs < 0) {
    // If stream start is in the future, fallback to beginning
    return { index: 0, offset: 0 };
  }
  
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  
  // Calculate active durations excluding failed tracks
  let activeDurations = [];
  let originalIndexMap = []; // Maps activeDurations index back to original index
  
  for (let i = 0; i < TRACK_DURATIONS.length; i++) {
    if (!failedTracks.has(i)) {
      activeDurations.push(TRACK_DURATIONS[i]);
      originalIndexMap.push(i);
    }
  }
  
  if (activeDurations.length === 0) {
    return { index: 0, offset: 0 };
  }
  
  const activeTotalDuration = activeDurations.reduce((sum, val) => sum + val, 0);
  const playlistTime = elapsedSeconds % activeTotalDuration;
  
  let accumulatedTime = 0;
  for (let i = 0; i < activeDurations.length; i++) {
    if (playlistTime < accumulatedTime + activeDurations[i]) {
      return {
        index: originalIndexMap[i],
        offset: playlistTime - accumulatedTime
      };
    }
    accumulatedTime += activeDurations[i];
  }
  
  return { index: originalIndexMap[0], offset: 0 };
}

// ==========================================================================
// AUDIO ENGINE (YOUTUBE IFRAME PLAYER IMPLEMENTATION)
// ==========================================================================

let player;
let playerReady = false;
let hasEntered = true; // Auto-entered since overlay is removed
let isPlaying = false;
let isMuted = false;
let isManualMode = false;
let isInitialized = false; // Tracks first-time play trigger

// Register global ready callback before loading the YouTube script
window.youtubeApiReady = false;

function handleApiReady() {
  if (window.youtubeApiReady) return;
  window.youtubeApiReady = true;
  clearTimeout(apiLoadTimeout);
  initPlayer();
}

// In case the API is already loaded in the environment
if (window.YT && typeof window.YT.Player === 'function') {
  handleApiReady();
} else {
  window.onYouTubeIframeAPIReady = handleApiReady;
}

// Inject the YouTube IFrame API script tag dynamically (bulletproof head append)
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

// Timeout check for ad-blockers preventing script execution
const apiLoadTimeout = setTimeout(() => {
  if (!window.youtubeApiReady) {
    console.warn("YouTube API script failed to initialize. Displaying fallback message.");
    const fallbackBox = document.getElementById("adblock-fallback");
    if (fallbackBox) fallbackBox.classList.remove("hidden");
    const enterBtnText = document.getElementById("enter-btn-text");
    if (enterBtnText) enterBtnText.textContent = "OFFLINE";
  }
}, 6000);

/**
 * Instantiates the YouTube IFrame Player
 */
function initPlayer() {
  player = new YT.Player('youtube-player', {
    height: '240',
    width: '320',
    playerVars: {
      'playsinline': 1,
      'controls': 0,
      'disablekb': 1,
      'fs': 0,
      'rel': 0,
      'modestbranding': 1,
      'autoplay': 0,
      'enablejsapi': 1
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
}

async function onPlayerReady(event) {
  // Wait until the playlist config JSON is successfully loaded
  await configLoadPromise;
  
  playerReady = true;
  console.log("YouTube Player API Ready.");

  // Update LCD to show ready to play
  const titleDisplay = document.getElementById("now-playing-title");
  if (titleDisplay) {
    titleDisplay.textContent = "NOW PLAYING: READY / CLICK TUNE IN TO START PLAYBACK";
  }
  const statusDisplay = document.getElementById("radio-status-text");
  if (statusDisplay) {
    statusDisplay.textContent = "READY / OFFLINE";
  }
  
  // Enable control buttons
  document.getElementById("play-pause-btn").removeAttribute("disabled");
  document.getElementById("mute-btn").removeAttribute("disabled");
  document.getElementById("volume-slider").removeAttribute("disabled");
  document.getElementById("prev-btn").removeAttribute("disabled");
  document.getElementById("next-btn").removeAttribute("disabled");
}

function onPlayerStateChange(event) {
  // YT.PlayerState: -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    document.body.classList.add("playing");
    updateNowPlayingDisplay();
    updateProgressBar();
    updateControlsUI();
  }
  
  if (event.data === YT.PlayerState.ENDED) {
    console.log("Track ended. Advancing to next track...");
    if (isManualMode) {
      nextTrack();
    } else {
      syncPlayer(true);
    }
  }
}

/**
 * Handles error events (broken, deleted, or embedded-restricted videos)
 * Automatically skips to the next track to keep playback rolling.
 */
function onPlayerError(event) {
  console.error("YouTube Player Error occurred code:", event.data);
  // Mark the current track as failed to prevent Sync Guard loops
  failedTracks.add(currentTrackIndex);
  console.warn(`Track index ${currentTrackIndex} added to failedTracks.`);
  
  // Advance/Skip to next track immediately
  skipToNextTrack();
}

/**
 * Programmatic skip to next track in the playlist sequence
 */
function skipToNextTrack() {
  if (!playerReady) return;
  try {
    if (isManualMode) {
      const nextIndex = getRandomTrackIndex();
      console.log(`Bypassing error track (manual mode). Loading index: ${nextIndex}`);
      playTrack(nextIndex, 0);
    } else {
      console.log("Bypassing error track (live mode). Resyncing to next live track...");
      syncPlayer(true);
    }
  } catch (e) {
    console.error("Error attempting to skip track:", e);
  }
}

// ==========================================================================
// RADIO TUNING AND SYNC CONTROL ACTIONS
// ==========================================================================

function startPlayback() {
  if (!playerReady) return;
  
  const state = calculateCurrentTrack();
  console.log(`Starting playback. Syncing to track index: ${state.index} at offset: ${state.offset}s`);

  // Safari Autoplay Guard: synchronous trigger first
  player.playVideo();
  player.unMute();
  player.setVolume(50);
  
  // Load individual video or fallback playlist
  playTrack(state.index, state.offset);
  
  updateControlsUI();
  startRadioTicks();
}

function togglePlay() {
  if (!playerReady) return;
  
  if (isPlaying) {
    player.pauseVideo();
    isPlaying = false;
    document.body.classList.remove("playing");
    updateControlsUI();
  } else {
    isPlaying = true;
    document.body.classList.add("playing");
    
    if (!isInitialized) {
      // First-time play triggers calculations and loads playlist
      isInitialized = true;
      startPlayback();
    } else {
      if (isManualMode) {
        player.playVideo();
      } else {
        // Resync playback calculation when clicking play in live mode
        const state = calculateCurrentTrack();
        console.log(`Resumed radio. Seeking to index ${state.index} at offset ${state.offset}s`);
        
        playTrack(state.index, state.offset);
      }
      updateControlsUI();
    }
  }
}

function getRandomTrackIndex() {
  if (TRACK_DURATIONS.length <= 1) return 0;
  let randIndex;
  let attempts = 0;
  do {
    randIndex = Math.floor(Math.random() * TRACK_DURATIONS.length);
    attempts++;
  } while ((randIndex === currentTrackIndex || failedTracks.has(randIndex)) && attempts < 100);
  return randIndex;
}

function nextTrack() {
  if (!playerReady) return;
  isManualMode = true;
  
  try {
    const nextIndex = getRandomTrackIndex();
    console.log(`Shuffling: Loading next track index: ${nextIndex}`);
    playTrack(nextIndex, 0);
    updateControlsUI();
  } catch (e) {
    console.error("Failed to skip to next track:", e);
  }
}

function prevTrack() {
  if (!playerReady) return;
  isManualMode = true;
  
  try {
    const prevIndex = getRandomTrackIndex();
    console.log(`Shuffling: Loading previous track index: ${prevIndex}`);
    playTrack(prevIndex, 0);
    updateControlsUI();
  } catch (e) {
    console.error("Failed to skip to previous track:", e);
  }
}



function toggleMute() {
  if (!playerReady) return;
  
  if (isMuted) {
    player.unMute();
    isMuted = false;
  } else {
    player.mute();
    isMuted = true;
  }
  updateControlsUI();
}

function handleVolumeChange(event) {
  if (!playerReady) return;
  const vol = event.target.value;
  player.setVolume(vol);
  
  if (vol > 0 && isMuted) {
    player.unMute();
    isMuted = false;
  }
  updateControlsUI();
}

// ==========================================================================
// BACKGROUND THROTTLING / DESYNC PREVENTION
// ==========================================================================

let syncIntervalId = null;

function startRadioTicks() {
  // 1. Keep player state checked every 5 seconds for desync
  if (syncIntervalId) clearInterval(syncIntervalId);
  syncIntervalId = setInterval(() => {
    syncPlayer();
  }, 5000);
  
  // 2. Slow interval checking for active songs
  setInterval(() => {
    updateNowPlayingDisplay();
    updateProgressBar();
  }, 1000);
}

/**
 * Checks for index mismatch or drifting offsets, corrects the player
 */
function syncPlayer(force = false) {
  if (!playerReady || !isPlaying || !hasEntered) return;
  // If in manual track selection mode, bypass the automatic sync loops
  if (isManualMode && !force) return;
  if (typeof player.getPlayerState !== 'function') return;
  
  const expectedState = calculateCurrentTrack();
  const playerState = player.getPlayerState();
  
  // Resync if playing (1), buffering (3), or forced by tab activity
  if (playerState === 1 || playerState === 3 || force) {
    const activeIndex = currentTrackIndex;
    const activeTime = player.getCurrentTime();
    
    if (activeIndex !== expectedState.index) {
      console.log(`Sync Guard: Track index mismatch (current: ${activeIndex}, target: ${expectedState.index}). Navigating...`);
      playTrack(expectedState.index, expectedState.offset);
    } else {
      const drift = Math.abs(activeTime - expectedState.offset);
      // Correction threshold is 3 seconds
      if (drift > 3) {
        console.log(`Sync Guard: Time drift detected (${drift.toFixed(2)}s). Adjusting player to ${expectedState.offset}s...`);
        player.seekTo(expectedState.offset, true);
      }
    }
  }
}

// Visibility API trigger: prevents desync caused by background setInterval throttling
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && hasEntered && isPlaying && !isManualMode) {
    console.log("Tab focused. Forcing immediate synchronization with radio stream...");
    syncPlayer(true);
  }
});

// ==========================================================================
// UI RENDER AND UPDATES
// ==========================================================================

function updateNowPlayingDisplay() {
  if (!player || typeof player.getVideoData !== 'function') return;
  
  const videoData = player.getVideoData();
  const activeIndex = currentTrackIndex;
  
  let title = "";
  if (videoData && videoData.title) {
    title = videoData.title;
  } else if (activeIndex >= 0 && activeIndex < TRACK_TITLES.length) {
    title = TRACK_TITLES[activeIndex];
  } else {
    title = "Soft Retro Melodies";
  }
  
  const titleDisplay = document.getElementById("now-playing-title");
  if (titleDisplay) {
    titleDisplay.textContent = `NOW PLAYING: ${title}`;
  }
  
  const statusDisplay = document.getElementById("radio-status-text");
  if (statusDisplay) {
    if (!isPlaying) {
      statusDisplay.textContent = "MUTED / PAUSED";
    } else {
      statusDisplay.textContent = isManualMode ? "MANUAL / SKIPPED" : "LIVE / TUNED";
    }
  }
}

function updateProgressBar() {
  if (!player || !playerReady || typeof player.getCurrentTime !== 'function') return;
  
  const currentTime = player.getCurrentTime() || 0;
  const duration = player.getDuration() || 0;
  
  // Format as MM:SS
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  
  const currentEl = document.getElementById("current-time-display");
  const totalEl = document.getElementById("total-time-display");
  const fillEl = document.getElementById("progress-bar-fill");
  
  if (currentEl) currentEl.textContent = formatTime(currentTime);
  if (totalEl) totalEl.textContent = formatTime(duration);
  
  if (fillEl) {
    const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
    fillEl.style.width = `${percent}%`;
  }
}

function updateControlsUI() {
  const playBtn = document.getElementById("play-pause-btn");
  const muteBtn = document.getElementById("mute-btn");
  const volumeSlider = document.getElementById("volume-slider");
  
  if (playBtn) {
    playBtn.querySelector(".btn-icon").textContent = isPlaying ? "⏸" : "▶";
    playBtn.querySelector(".btn-label").textContent = isPlaying ? "TUNED" : "TUNE IN";
  }
  
  if (muteBtn) {
    muteBtn.querySelector(".btn-icon").textContent = isMuted ? "🔇" : "🔊";
    muteBtn.querySelector(".btn-label").textContent = isMuted ? "UNMUTE" : "MUTE";
  }
  
  if (volumeSlider) {
    volumeSlider.value = isMuted ? 0 : player.getVolume();
  }
}

// ==========================================================================
// CLOCK ENGINE
// ==========================================================================

function updateClock() {
  const clockEl = document.getElementById("local-time");
  if (!clockEl) return;
  
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; 
  
  const strHours = hours.toString().padStart(2, '0');
  const strMinutes = minutes.toString().padStart(2, '0');
  const strSeconds = seconds.toString().padStart(2, '0');
  
  clockEl.textContent = `${strHours}:${strMinutes}:${strSeconds} ${ampm}`;
}

setInterval(updateClock, 1000);
updateClock();

// ==========================================================================
// DOM CONTENT BINDINGS
// ==========================================================================

function initApp() {
  // Bind Controls
  const playBtn = document.getElementById("play-pause-btn");
  if (playBtn) {
    playBtn.addEventListener("click", togglePlay);
  }
  
  const muteBtn = document.getElementById("mute-btn");
  if (muteBtn) {
    muteBtn.addEventListener("click", toggleMute);
  }
  
  const volumeSlider = document.getElementById("volume-slider");
  if (volumeSlider) {
    volumeSlider.addEventListener("input", handleVolumeChange);
  }

  // Bind Next / Prev / Sync Live
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) {
    nextBtn.addEventListener("click", nextTrack);
  }

  const prevBtn = document.getElementById("prev-btn");
  if (prevBtn) {
    prevBtn.addEventListener("click", prevTrack);
  }
}

// Ensure bindings execute regardless of loading timing (interactive or loaded)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
