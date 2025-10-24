#!/bin/bash
set -euxo pipefail

echo "🔄 Rollback script..."

# List available releases
echo "📋 Available releases:"
ls -1 /var/www/geekstalk/releases

# Get target release
read -p "Enter the release timestamp to rollback to: " target_release

if [ ! -d "/var/www/geekstalk/releases/$target_release" ]; then
    echo "❌ Release $target_release not found!"
    exit 1
fi

# Rollback
echo "🔄 Rolling back to release $target_release..."
sudo ln -sfn /var/www/geekstalk/releases/$target_release /var/www/geekstalk/current
sudo systemctl restart geekstalk

echo "✅ Rollback complete!"
echo "📊 Service status:"
sudo systemctl status geekstalk --no-pager
