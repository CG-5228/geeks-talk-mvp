module.exports = {
  apps: [{
    name: 'geeks-talk',
    script: 'npm',
    args: 'start',
    cwd: process.cwd(),
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto restart
    watch: false,
    max_memory_restart: '1G',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Health monitoring
    min_uptime: '10s',
    max_restarts: 10,
  }, {
    // Yjs collaboration WebSocket server. MUST be a single instance (fork) —
    // it holds shared in-memory CRDT document state that cannot be split across
    // cluster workers. nginx proxies the public collab WS path to PORT 3001.
    name: 'geeks-talk-yjs',
    script: 'lib/yjs-websocket-server.js',
    cwd: process.cwd(),
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '127.0.0.1',
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001,
      HOST: 'localhost',
    },
    watch: false,
    max_memory_restart: '512M',
    kill_timeout: 5000,
  }]
};
