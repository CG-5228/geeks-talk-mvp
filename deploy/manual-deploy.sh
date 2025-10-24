#!/bin/bash
set -euxo pipefail

echo "🚀 Manual deployment script..."

# Build locally
echo "📦 Building application..."
rm -rf node_modules .next
npm ci
npx prisma generate
npm run build
npm prune --omit=dev

# Create artifact
echo "📦 Creating deployment artifact..."
mkdir -p artifact
cp -r .next next.config.* package.json package-lock.json node_modules public prisma artifact/ 2>/dev/null || true
tar -C artifact -czf app.tgz .

# Upload to server
echo "📤 Uploading to server..."
ts=$(date +%s)
scp -i ~/.ssh/geekstalk-ec2-eu-west-1-ed25519.pem app.tgz ubuntu@YOUR_SERVER_IP:/var/www/geekstalk/upload/$ts.tgz

# Deploy on server
echo "🚀 Deploying on server..."
ssh -i ~/.ssh/geekstalk-ec2-eu-west-1-ed25519.pem ubuntu@YOUR_SERVER_IP << EOF
set -euxo pipefail

# Create release directory
mkdir -p /var/www/geekstalk/releases/$ts
tar -C /var/www/geekstalk/releases/$ts -xzf /var/www/geekstalk/upload/$ts.tgz

# Link environment file
ln -sfn /var/www/geekstalk/shared/.env /var/www/geekstalk/releases/$ts/.env

# Run database migrations
cd /var/www/geekstalk/releases/$ts
npx prisma migrate deploy

# Ensure Redis is running (required for E2EE 1v1 random voice chat)
sudo systemctl start redis-server || echo "Redis already running"
redis-cli ping || echo "Redis connection test failed"

# Atomically switch to new release
ln -sfn /var/www/geekstalk/releases/$ts /var/www/geekstalk/current

# Restart service
sudo systemctl restart geekstalk

# Clean up old releases (keep last 5)
cd /var/www/geekstalk/releases
ls -1tr | head -n -5 | xargs -r rm -rf

# Clean up upload
rm -f /var/www/geekstalk/upload/$ts.tgz

echo "✅ Deployment complete!"
EOF

echo "🎉 Manual deployment finished!"
