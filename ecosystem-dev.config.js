module.exports = {
  apps: [{
    name: 'authorr-hono-server',
    script: 'npm',
    args: 'run dev:sandbox',
    cwd: '/home/user/webapp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    log_file: '/home/user/webapp/server-combined.log',
    out_file: '/home/user/webapp/server-out.log',
    error_file: '/home/user/webapp/server-error.log',
    time: true
  }]
};