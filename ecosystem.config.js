// PM2 configuration for EC2 deployment
module.exports = {
  apps: [{
    name: 'political-ad-tracker',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster', // Enable cluster mode for load balancing
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
