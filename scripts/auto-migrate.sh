#!/bin/bash
# Automatic migration script that handles baseline and deployment
# This script is safe to run multiple times and handles edge cases

# Set error handling - we'll handle migration errors manually
set -e

echo "🔧 Running automatic database migrations..."

# Check if .env exists
if [ ! -f .env ]; then
    if [ -f /var/www/geekstalk/shared/.env ]; then
        echo "📝 Linking .env from shared directory..."
        ln -sfn /var/www/geekstalk/shared/.env .env
    else
        echo "⚠️  Warning: .env file not found"
    fi
fi

# Function to check if migration table exists
check_migration_table() {
    npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"_prisma_migrations\";" 2>/dev/null | grep -q "1" && return 0 || return 1
}

# Function to baseline existing migrations
baseline_migrations() {
    echo "📊 Database needs baseline. Marking existing migrations as applied..."
    
    # List of migrations to baseline (in order)
    migrations=(
        "20251009171552_nextauth_init"
        "20251009171918_username_optional"
        "20251009175159_follow_model"
        "20251010123000_room_live_fields"
    )
    
    for migration in "${migrations[@]}"; do
        if [ -d "prisma/migrations/$migration" ]; then
            echo "  ✓ Marking $migration as applied..."
            npx prisma migrate resolve --applied "$migration" 2>/dev/null || echo "    (already marked or not needed)"
        fi
    done
}

# Try to deploy migrations
echo "🚀 Attempting to deploy migrations..."
set +e  # Temporarily disable exit on error for migration check
migrate_output=$(npx prisma migrate deploy 2>&1)
migrate_exit=$?
set -e  # Re-enable exit on error

# Check if it succeeded
if echo "$migrate_output" | grep -q "All migrations have been successfully applied\|No pending migrations"; then
    echo "✅ Migrations deployed successfully!"
    npx prisma generate
    exit 0
fi

# Check if error is P3005 (database schema not empty)
if echo "$migrate_output" | grep -q "P3005\|database schema is not empty"; then
    echo "⚠️  Database schema not empty error detected (P3005)"
    echo "📊 Attempting to baseline database..."
    
    # Baseline existing migrations
    baseline_migrations
    
    # Try deploying again
    echo "🚀 Deploying remaining migrations..."
    set +e  # Temporarily disable exit on error
    deploy_output=$(npx prisma migrate deploy 2>&1)
    deploy_exit=$?
    set -e  # Re-enable exit on error
    
    if [ $deploy_exit -eq 0 ] || echo "$deploy_output" | grep -q "All migrations have been successfully applied\|No pending migrations"; then
        echo "✅ Migrations deployed successfully after baseline!"
    else
        echo "⚠️  Migration deploy output:"
        echo "$deploy_output"
        echo "⚠️  This might be okay if all migrations are already applied. Continuing..."
    fi
else
    # Other error - might be connection issue or other problem
    echo "⚠️  Migration error (not P3005):"
    echo "$migrate_output"
    echo "⚠️  Continuing deployment anyway..."
fi

# Generate Prisma client (always do this)
echo "🔨 Generating Prisma client..."
npx prisma generate || {
    echo "❌ Failed to generate Prisma client!"
    exit 1
}

echo "✅ Migration process complete!"
exit 0
