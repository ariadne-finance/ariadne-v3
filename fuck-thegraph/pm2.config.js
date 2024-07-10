module.exports = {
	apps : [
    {
			namespace: 'a3',
      name: "a3-fuck-thegraph",
      script: 'fuck-thegraph.mjs',
			kill_timeout: 6 * 1000,
			restart_delay: 3 * 1000,
			autorestart: true,
			max_restarts: 0,
			watch: false,
			wait_ready: false
    }
  ]
};
