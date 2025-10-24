#!/bin/bash
set -euxo pipefail

echo "🔍 Checking Redis status for E2EE 1v1 random voice chat..."

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis is not installed"
    exit 1
fi

# Check if Redis is running
if ! systemctl is-active --quiet redis-server; then
    echo "❌ Redis service is not running"
    echo "🚀 Starting Redis service..."
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
fi

# Test Redis connection
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is running and responding"
else
    echo "❌ Redis is not responding"
    exit 1
fi

# Check Redis version
redis_version=$(redis-cli --version | cut -d' ' -f2)
echo "📊 Redis version: $redis_version"

# Test basic operations
echo "🧪 Testing Redis operations..."
redis-cli set test_key "test_value" > /dev/null
if redis-cli get test_key | grep -q "test_value"; then
    echo "✅ Redis read/write operations working"
    redis-cli del test_key > /dev/null
else
    echo "❌ Redis read/write operations failed"
    exit 1
fi

echo "🎉 Redis is ready for E2EE 1v1 random voice chat!"
