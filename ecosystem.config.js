module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: '/var/www/Ecommerce/frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 'max',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        REVALIDATE_SECRET: 'hc_revalidate_948ed9a8708b4b315486079e28f3ff72',
        NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_live_SWeqL1yqDC0Hu9',
      },
    },
  ],
}
