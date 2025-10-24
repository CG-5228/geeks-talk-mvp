#!/bin/bash
set -euxo pipefail

echo "🚀 Setting up GeeksTalk server deployment..."

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Redis (required for E2EE 1v1 random voice chat)
sudo apt-get update
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installations
node -v
npm -v
redis-cli ping

# Create app directories
sudo mkdir -p /var/www/geekstalk/{releases,shared,upload}
sudo chown -R ubuntu:ubuntu /var/www/geekstalk

# Create systemd service
sudo cp geekstalk.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable geekstalk

echo "✅ Server setup complete!"
echo "📝 Next steps:"
echo "1. Create /var/www/geekstalk/shared/.env with your production secrets"
echo "2. Set up GitHub Secrets: SSH_HOST, SSH_USER, SSH_KEY"
echo "3. Push to main branch to trigger deployment"
