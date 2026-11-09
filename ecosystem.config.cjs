module.exports = {
  apps: [
    {
      name: 'roniguard-web',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
    },
    {
      name: 'roniguard-bot',
      script: 'bot-vps.js',
      instances: 1,
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
