module.exports = {
  apps: [{
    name: 'screenshot-service',
    script: 'python3',
    args: '/home/user/webapp/screenshot_service.py',
    watch: false,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000
  }]
}
