module.exports = {
  apps: [{
    name: 'reconciliation-agent',
    script: 'src/services/reconciliation/scheduler.ts',
    interpreter: 'tsx',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/reconciliation-error.log',
    out_file: './logs/reconciliation-out.log',
    log_file: './logs/reconciliation-combined.log',
    time: true,
    merge_logs: true,
    cron_restart: '0 4 * * *', // Restart diário às 4h
    kill_timeout: 5000,
    listen_timeout: 3000,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};