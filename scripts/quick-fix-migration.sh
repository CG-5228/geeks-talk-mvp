#!/bin/bash
# Quick fix: Mark existing migrations as applied, then deploy SiteAnnouncement
# This assumes your database already has all tables except SiteAnnouncement

set -e

cd /var/www/geekstalk/current || exit 1

if [ ! -f .env ]; then
    ln -sfn /var/www/geekstalk/shared/.env .env
fi

echo "🔧 Quick Migration Fix"
echo "======================"
echo ""
echo "Marking existing migrations as applied..."

# Mark all existing migrations as applied (they're already in the database)
npx prisma migrate resolve --applied 20251009171552_nextauth_init || echo "Already marked"
npx prisma migrate resolve --applied 20251009171918_username_optional || echo "Already marked"
npx prisma migrate resolve --applied 20251009175159_follow_model || echo "Already marked"
npx prisma migrate resolve --applied 20251010123000_room_live_fields || echo "Already marked"

echo ""
echo "🚀 Deploying SiteAnnouncement migration..."
npx prisma migrate deploy

echo ""
echo "🔨 Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Done! Restarting service..."
sudo systemctl restart geekstalk

echo "✅ Complete!"
