#!/bin/bash
# Script to run database migrations on the production server
# Usage: Run this script on your server or via SSH

set -e

echo "🔧 Running database migrations..."

# Navigate to the current deployment directory
cd /var/www/geekstalk/current || {
    echo "❌ Error: Could not find /var/www/geekstalk/current"
    echo "Please ensure you're running this from the server or the deployment directory exists."
    exit 1
}

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Linking from shared directory..."
    ln -sfn /var/www/geekstalk/shared/.env .env
fi

# Check migration status
echo "📊 Checking migration status..."
npx prisma migrate status || echo "⚠️  Migration status check failed, continuing..."

# Deploy migrations
echo "🚀 Deploying migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate

echo "✅ Migration complete!"
echo ""
echo "Verifying SiteAnnouncement table exists..."
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"SiteAnnouncement\";" || echo "⚠️  Could not verify table (this is okay if it's the first run)"
