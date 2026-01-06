// reload-global.js
const { exec } = require('child_process');

const APP_NAME = 'chat'; // or 'all' for all apps

exec(`pm2 reload ${APP_NAME}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error reloading: ${error.message}`);
    return;
  }
  if (stderr) console.error(`PM2 stderr: ${stderr}`);
  console.log(`PM2 stdout:\n${stdout}`);
});

