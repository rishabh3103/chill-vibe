const { spawn, exec } = require('child_process');

console.log("\x1b[36m%s\x1b[0m", "Starting CHILL VIBE Dev Server...");

// Spawn partykit dev process and inherit stdio so user keys (b, c, x) still work
const partykit = spawn('npx', ['partykit', 'dev'], { 
  stdio: 'inherit',
  shell: true 
});

// Wait for compilation to complete before launching browser
setTimeout(() => {
  const url = 'http://localhost:1999';
  console.log(`\x1b[32mLaunching browser at: ${url}\x1b[0m`);
  
  const startCommand = process.platform === 'win32' 
    ? `start ${url}` 
    : process.platform === 'darwin' 
      ? `open ${url}` 
      : `xdg-open ${url}`;
      
  exec(startCommand, (err) => {
    if (err) {
      console.warn("Could not launch browser automatically:", err.message);
      console.log(`Please visit ${url} manually in your browser.`);
    }
  });
}, 2500);

// Ensure dev script exit propagates cleanly
partykit.on('exit', (code) => {
  process.exit(code || 0);
});
