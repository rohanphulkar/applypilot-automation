const path = require('path');

module.exports = {
  apps: [
    {
      name: 'applypilot-api',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'applypilot-worker',
      script: 'src/worker.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
