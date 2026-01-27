# 🚀 GeeksTalk Deployment Guide

This guide covers deploying GeeksTalk using Systemd + CI-built artifacts with npm.

## 📋 Prerequisites

- Ubuntu 22.04+ server
- Node.js 20+
- PostgreSQL database
- SSL certificates
- GitHub repository with Actions enabled

## 🔧 One-Time Server Setup

### 1. Run the setup script on your server:

```bash
# Copy the setup script to your server
scp deploy/setup-server.sh ubuntu@YOUR_SERVER:/tmp/
ssh ubuntu@YOUR_SERVER "chmod +x /tmp/setup-server.sh && /tmp/setup-server.sh"
```

### 2. Create production environment file:

```bash
# On your server
sudo nano /var/www/geekstalk/shared/.env
```

Copy the contents from `deploy/env.production.example` and fill in your actual values.

### 3. Set up Nginx:

```bash
# Copy nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/geekstalk
sudo ln -s /etc/nginx/sites-available/geekstalk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 🔑 GitHub Secrets Setup

In your GitHub repository, go to Settings → Secrets and variables → Actions, add:

- `SSH_HOST`: Your server IP address
- `SSH_USER`: `ubuntu` (or your server user)
- `SSH_KEY`: Your private SSH key content

## 🚀 Deployment Methods

### Automatic Deployment (Recommended)

1. Push to `main` branch
2. GitHub Actions will automatically:
   - Build the application
   - Create deployment artifact
   - Upload to server
   - Deploy and restart service

### Manual Deployment

```bash
# Edit the script with your server IP
nano deploy/manual-deploy.sh

# Run manual deployment
./deploy/manual-deploy.sh
```

### Rollback

```bash
# List available releases
ls -1 /var/www/geekstalk/releases

# Rollback to specific release
./deploy/rollback.sh
```

## 🔍 Monitoring & Troubleshooting

### Check service status:
```bash
sudo systemctl status geekstalk
```

### View logs:
```bash
# Recent logs
journalctl -u geekstalk -n 200 --no-pager

# Follow logs
journalctl -u geekstalk -f
```

### Health check:
```bash
curl -I http://127.0.0.1:3000
curl -I https://geekstalk.org/health
```

### Database migrations:
```bash
cd /var/www/geekstalk/current
npx prisma migrate status
npx prisma migrate deploy
```

### Fix missing SiteAnnouncement table:
If you see an error about `SiteAnnouncement` table not existing on the server:

**Option 1: Quick Fix (Recommended)**
```bash
# SSH into your server
ssh ubuntu@YOUR_SERVER_IP

# Navigate to current deployment
cd /var/www/geekstalk/current

# Run the quick fix script
bash scripts/quick-fix-migration.sh
```

**Option 2: Manual Fix**
If you see the error "The database schema is not empty" (P3005):
```bash
# SSH into your server
ssh ubuntu@YOUR_SERVER_IP

# Navigate to current deployment
cd /var/www/geekstalk/current

# Mark existing migrations as applied (baseline)
npx prisma migrate resolve --applied 20251009171552_nextauth_init
npx prisma migrate resolve --applied 20251009171918_username_optional
npx prisma migrate resolve --applied 20251009175159_follow_model
npx prisma migrate resolve --applied 20251010123000_room_live_fields

# Now deploy the SiteAnnouncement migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Restart the service
sudo systemctl restart geekstalk
```

**Option 3: Interactive Baseline**
```bash
# Use the interactive baseline script
bash scripts/baseline-database.sh
```

## 📁 Directory Structure

```
/var/www/geekstalk/
├── current/          # Symlink to current release
├── releases/         # All deployment releases
├── shared/           # Shared files (env, logs)
└── upload/           # Temporary upload directory
```

## 🔧 Common Issues

### 1. Service won't start
```bash
# Check logs
journalctl -u geekstalk -f

# Check if port is in use
sudo netstat -tlnp | grep :3000
```

### 2. Database connection issues
```bash
# Test database connection
cd /var/www/geekstalk/current
npx prisma db push
```

### 3. Build failures
```bash
# Check GitHub Actions logs
# Ensure all dependencies are in package.json (not devDependencies)
```

### 4. Permission issues
```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /var/www/geekstalk
```

## 🔄 Maintenance

### Update dependencies:
1. Update `package.json` locally
2. Test build locally: `npm run build`
3. Commit and push to trigger deployment

### Database updates:
- Prisma migrations run automatically during deployment
- For manual migrations: `cd /var/www/geekstalk/current && npx prisma migrate deploy`

### SSL certificate renewal:
```bash
# If using Let's Encrypt
sudo certbot renew
sudo systemctl reload nginx
```

## 📊 Performance Monitoring

### Check resource usage:
```bash
# CPU and memory
htop

# Disk usage
df -h
du -sh /var/www/geekstalk/releases/*
```

### Application metrics:
- Health endpoint: `https://geekstalk.org/health`
- Service status: `systemctl status geekstalk`
- Log analysis: `journalctl -u geekstalk --since "1 hour ago"`

## 🛡️ Security

### Firewall setup:
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Regular updates:
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 📞 Support

If you encounter issues:

1. Check the logs: `journalctl -u geekstalk -f`
2. Verify environment variables in `/var/www/geekstalk/shared/.env`
3. Test database connectivity
4. Check GitHub Actions for build errors

For additional help, check the main project documentation or create an issue in the repository.
