#!/bin/bash
# Script to baseline an existing production database
# This marks existing migrations as applied without running them
# Usage: Run this on your server after checking which migrations are already applied

set -e

echo "🔧 Database Baseline Script"
echo "=========================="
echo ""
echo "This script will help you baseline your database."
echo "It marks existing migrations as 'applied' so Prisma can track future migrations."
echo ""

# Navigate to the current deployment directory
cd /var/www/geekstalk/current || {
    echo "❌ Error: Could not find /var/www/geekstalk/current"
    exit 1
}

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Linking from shared directory..."
    ln -sfn /var/www/geekstalk/shared/.env .env
fi

echo "📊 Checking current migration status..."
npx prisma migrate status || true

echo ""
echo "📋 Available migrations:"
ls -1 prisma/migrations/ | grep -E '^[0-9]' | sort

echo ""
echo "⚠️  IMPORTANT: Before proceeding, check which migrations have already been applied to your database."
echo ""
echo "To check if SiteAnnouncement table exists:"
echo "  psql \$DATABASE_URL -c \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SiteAnnouncement';\""
echo ""
read -p "Does the SiteAnnouncement table exist? (y/n): " has_site_announcement

if [ "$has_site_announcement" = "y" ] || [ "$has_site_announcement" = "Y" ]; then
    echo ""
    echo "✅ SiteAnnouncement table exists. Marking all migrations as applied..."
    
    # Mark all migrations as applied
    npx prisma migrate resolve --applied 20251009171552_nextauth_init
    npx prisma migrate resolve --applied 20251009171918_username_optional
    npx prisma migrate resolve --applied 20251009175159_follow_model
    npx prisma migrate resolve --applied 20251010123000_room_live_fields
    npx prisma migrate resolve --applied 20250110000000_add_site_announcements
    
    echo "✅ All migrations marked as applied!"
else
    echo ""
    echo "📝 Marking migrations that are already applied (before SiteAnnouncement)..."
    
    # Mark migrations before SiteAnnouncement as applied
    npx prisma migrate resolve --applied 20251009171552_nextauth_init
    npx prisma migrate resolve --applied 20251009171918_username_optional
    npx prisma migrate resolve --applied 20251009175159_follow_model
    npx prisma migrate resolve --applied 20251010123000_room_live_fields
    
    echo ""
    echo "🚀 Now deploying the SiteAnnouncement migration..."
    npx prisma migrate deploy
fi

echo ""
echo "🔨 Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Baseline complete!"
echo ""
echo "Verifying SiteAnnouncement table..."
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"SiteAnnouncement\";" 2>/dev/null && echo "✅ SiteAnnouncement table exists!" || echo "⚠️  Could not verify (table may not exist yet)"
