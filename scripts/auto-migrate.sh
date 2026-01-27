#!/bin/bash
# Safe automatic migration script
# This script prioritizes DATA SAFETY over automatic fixes
# 
# IMPORTANT: This script will NOT automatically mark migrations as applied
# because doing so can cause data loss if the database was modified with
# `prisma db push` or manually.

set -e

echo "🔧 Running safe database migrations..."

# Check if .env exists
if [ ! -f .env ]; then
    if [ -f /var/www/geekstalk/shared/.env ]; then
        echo "📝 Linking .env from shared directory..."
        ln -sfn /var/www/geekstalk/shared/.env .env
    else
        echo "⚠️  Warning: .env file not found"
    fi
fi

# Try to deploy migrations
echo "🚀 Attempting to deploy migrations..."
set +e  # Temporarily disable exit on error
migrate_output=$(npx prisma migrate deploy 2>&1)
migrate_exit=$?
set -e  # Re-enable exit on error

echo "Migration output:"
echo "$migrate_output"

# Check if it succeeded
if [ $migrate_exit -eq 0 ]; then
    echo "✅ Migrations deployed successfully!"
elif echo "$migrate_output" | grep -q "All migrations have been successfully applied\|No pending migrations"; then
    echo "✅ All migrations already applied!"
elif echo "$migrate_output" | grep -q "P3005\|database schema is not empty"; then
    echo ""
    echo "⚠️  Database schema not empty error (P3005)"
    echo ""
    echo "This happens when the database was modified outside of Prisma migrations"
    echo "(e.g., using 'prisma db push' or manual SQL)."
    echo ""
    echo "⚠️  AUTOMATIC BASELINE DISABLED FOR DATA SAFETY"
    echo ""
    echo "The application will continue to work with the existing schema."
    echo "If you need to sync migrations, please do it manually:"
    echo ""
    echo "  1. SSH into the server"
    echo "  2. cd /var/www/geekstalk/current"
    echo "  3. Run: npx prisma migrate resolve --applied <migration_name>"
    echo ""
    echo "Available migrations that may need to be marked as applied:"
    ls -1 prisma/migrations/ | grep -v migration_lock.toml | while read dir; do
        echo "    - $dir"
    done
    echo ""
else
    echo ""
    echo "⚠️  Migration error (not P3005):"
    echo "$migrate_output"
    echo ""
    echo "The application will continue - existing schema should still work."
fi

# Always generate Prisma client (this is safe and necessary)
echo ""
echo "🔨 Generating Prisma client..."
npx prisma generate || {
    echo "❌ Failed to generate Prisma client!"
    exit 1
}

echo ""
echo "✅ Migration process complete!"
echo ""
echo "Note: If you see P3005 errors above, the database is working but"
echo "      migrations are not in sync. This is safe but should be fixed manually."
exit 0
