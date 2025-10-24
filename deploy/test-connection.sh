#!/bin/bash
set -euxo pipefail

echo "🔍 Testing GitHub Actions deployment connection..."

# Check if SSH key exists
if [ ! -f ~/.ssh/geekstalk-ec2-eu-west-1-ed25519.pem ]; then
    echo "❌ SSH key not found. Please check your key path:"
    echo "Expected: ~/.ssh/geekstalk-ec2-eu-west-1-ed25519.pem"
    exit 1
fi

# Check if server IP is provided
if [ -z "${1:-}" ]; then
    echo "❌ Please provide server IP as argument:"
    echo "Usage: ./test-connection.sh YOUR_SERVER_IP"
    exit 1
fi

SERVER_IP=$1

echo "🔑 Testing SSH connection to $SERVER_IP..."

# Test SSH connection
if ssh -i ~/.ssh/geekstalk-ec2-eu-west-1-ed25519.pem -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$SERVER_IP "echo 'SSH connection successful!'"; then
    echo "✅ SSH connection successful!"
    
    # Test if required directories exist
    echo "📁 Checking server directories..."
    ssh -i ~/.ssh/geekstalk-ec2-eu-west-1-ed25519.pem ubuntu@$SERVER_IP "
        if [ -d '/var/www/geekstalk' ]; then
            echo '✅ /var/www/geekstalk directory exists'
        else
            echo '❌ /var/www/geekstalk directory not found. Run setup-server.sh first.'
        fi
        
        if [ -f '/var/www/geekstalk/shared/.env' ]; then
            echo '✅ Environment file exists'
        else
            echo '❌ Environment file not found. Create /var/www/geekstalk/shared/.env'
        fi
    "
    
    echo ""
    echo "🎉 Connection test completed!"
    echo "📋 Next steps:"
    echo "1. Add GitHub Secrets:"
    echo "   - SSH_HOST: $SERVER_IP"
    echo "   - SSH_USER: ubuntu"
    echo "   - SSH_KEY: $(cat ~/.ssh/geekstalk-ec2-eu-west-1-ed25519.pem)"
    echo ""
    echo "2. Push to main branch to trigger deployment"
    
else
    echo "❌ SSH connection failed!"
    echo "Please check:"
    echo "1. Server IP is correct"
    echo "2. SSH key is added to server"
    echo "3. Server is running and accessible"
    exit 1
fi
