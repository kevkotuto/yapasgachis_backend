module.exports = {
  apps: [
    {
      name: 'yapasgachis-api',
      script: 'bootstrap.js',
      cwd: '/var/www/yapasgachis',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3050
      },
      error_file: '/var/www/yapasgachis/logs/error.log',
      out_file: '/var/www/yapasgachis/logs/out.log',
      log_file: '/var/www/yapasgachis/logs/combined.log',
      time: true
    }
  ]
};
