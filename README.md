# Geeks Talk MVP

[![Repo Views](https://komarev.com/ghpvc/?username=CG-5228&repo=geeks-talk-mvp&label=Repo%20Views&color=0e75b6&style=flat)](https://github.com/CG-5228/geeks-talk-mvp)

Geeks Talk is a comprehensive real-time chat and voice communication platform designed for discussions around various subjects. This project is built using Next.js 14 with TypeScript, Prisma for database management, and Tailwind CSS for styling.

## Features

- **Real-time Chat**: Users can send and receive messages instantly in chat rooms with live typing indicators
- **Voice Rooms**: Advanced voice chat with group management, collaborative whiteboard, and document editing
- **Video Chat**: Full-featured video calling with screen sharing, HD/SD quality options, participant grid, spotlight mode, and real-time chat sidebar
- **One-on-One Voice Chat**: End-to-end encrypted 1v1 voice chat with random matching based on topics
- **Collaborative Canvas**: Real-time whiteboard with tldraw integration for drawing and file annotation
- **Document Collaboration**: Google Docs-like collaborative editing with TipTap and Yjs
- **File Management**: Upload and share files with S3 integration
- **Authentication**: Secure user authentication using Google OAuth and email/password
- **Email Verification**: Email-based verification system with Resend API for signup, password reset, and password change
- **Site Announcements**: Admin-controlled notification banners for main site and live subdomain with persistent/timed display options
- **Admin Panel**: Comprehensive admin dashboard with user management, site banner management, bug reports, contact inbox, and analytics
- **Moderation**: Built-in moderation tools and user reporting system
- **Responsive Design**: Fully responsive UI built with Tailwind CSS
- **Voice Features**: Push-to-talk, click-to-talk, vote-kick polls, and group management

## Project Structure

```
geeks-talk-mvp
├── app
│   ├── api
│   │   ├── auth
│   │   ├── messages
│   │   ├── voice
│   │   └── socket
│   ├── (chat)
│   ├── layout.tsx
│   └── globals.css
├── lib
├── prisma
├── types
├── middleware.ts
├── next.config.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- PostgreSQL database (version 13 or higher)
- AWS S3 bucket (for file uploads)
- LiveKit server (for voice chat)
- SMTP email service or Resend API account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/geeks-talk-mvp.git
   cd geeks-talk-mvp
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Set up your environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/geekstalk_db"

   # NextAuth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret-key-here"

   # Google OAuth (Optional - for Google sign-in)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Email Configuration (SMTP)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   EMAIL_FROM="no-reply@geekstalk.co"
   EMAIL_TO="admin@geekstalk.co"

   # Resend API (Alternative to SMTP for verification emails)
   RESEND_API_KEY="your-resend-api-key"
   EMAIL_NO_REPLY="no-reply@geekstalk.co"

   # Email Verification Settings
   VERIFICATION_CODE_TTL_MIN="10"  # Code expires after 10 minutes
   VERIFICATION_MAX_ATTEMPTS="5"   # Max failed attempts before code is locked

   # AWS S3 (for file uploads)
   AWS_ACCESS_KEY_ID="your-aws-access-key"
   AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
   AWS_REGION="us-east-1"
   AWS_S3_BUCKET="geekstalk-uploads-prod"

   # LiveKit (for voice and video chat)
   LIVEKIT_API_KEY="your-livekit-api-key"
   LIVEKIT_SECRET="your-livekit-api-secret"
   LIVEKIT_URL="wss://your-livekit-server.com"

   # Social Media Links (Optional)
   NEXT_PUBLIC_INSTAGRAM_URL="https://instagram.com/yourusername"
   NEXT_PUBLIC_X_URL="https://x.com/yourusername"
   NEXT_PUBLIC_DISCORD_URL="https://discord.gg/yourinvite"
   NEXT_PUBLIC_FACEBOOK_URL="https://facebook.com/yourpage"
   NEXT_PUBLIC_YOUTUBE_URL="https://youtube.com/@yourchannel"
   ```

4. Run the Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

### Prisma commands

- To sync schema without losing data in dev:
  ```
  npx prisma db push
  ```
- To create a migration:
  ```
  npx prisma migrate dev -n contact_and_bug_models
  ```

6. Start the development server:
   ```bash
   npm run dev
   ```

### Usage

- Navigate to `http://localhost:3000` to access the application
- Use the authentication options to log in and start chatting or joining voice rooms
- Create channels, join voice groups, and collaborate on documents in real-time

## Site Announcements System

The application includes a comprehensive site-wide announcement banner system that allows administrators to display notifications to users.

### Features

- **Dual Scope Support**: Separate banners for main site and live subdomain
- **Display Modes**: 
  - **Persistent**: Banner stays visible until user dismisses it
  - **Timed**: Banner automatically hides after specified duration
- **Multiple Variants**: Warning, Info, Danger, and Success color schemes
- **Real-time Updates**: Changes appear instantly on all connected user pages via Server-Sent Events (SSE)
- **Dismissal Tracking**: Remembers user dismissals per banner (via localStorage for guests, database for logged-in users)
- **Admin Management**: Full CRUD operations through admin panel with real-time status monitoring

### Admin Panel Access

Navigate to `/admin/[hash]/site-banner` to manage site announcements. Features include:
- Create/edit banners for main site and live subdomain
- Toggle active/inactive status
- Delete banners
- View real-time status of active banners
- Reset dismissals to show banner to all users again

### API Endpoints

- `GET /api/admin/announcements?scope=main|live`: Get announcement for admin (returns all, including inactive)
- `POST /api/admin/announcements`: Create or update announcement
- `PATCH /api/admin/announcements`: Toggle active/inactive status
- `DELETE /api/admin/announcements?scope=main|live`: Delete announcement
- `GET /api/announcements?scope=main|live`: Get active announcement for users
- `GET /api/announcements/realtime?scope=main|live`: SSE endpoint for real-time updates
- `POST /api/user/announcement-dismiss`: Record user dismissal

## Video Chat System

The application includes a full-featured video calling system powered by LiveKit.

### Features

- **One-on-One & Group Calls**: Support for both private and group video calls
- **Waiting Room**: Preview video/mic before starting, share room codes, see participants
- **Screen Sharing**: Share your screen with other participants
- **Video Quality Control**: HD, SD, and Low quality options
- **Participant Grid**: Responsive grid layout for multiple participants
- **Spotlight Mode**: Focus on one participant
- **Real-time Chat**: Text chat sidebar during video calls
- **Connection Quality Indicators**: Visual feedback for network quality
- **Camera & Microphone Controls**: Toggle video/audio on/off

### Usage

1. Navigate to `/video` page
2. Choose between "One-on-One" or "Group Call"
3. Create a room or join with a room code
4. Use the waiting room to preview and invite others
5. Start the call when ready

## Email Verification System

The application includes a comprehensive email verification system for enhanced security:

### Features

- **Signup Verification**: New users must verify their email before account creation
- **Password Reset**: Secure password reset via email verification codes
- **Password Change**: Option to change password using email verification instead of current password
- **Domain Validation**: Only allows specific email providers (icloud, gmail, outlook, yahoo, qq)
- **Rate Limiting**: Prevents abuse with request limits per email/IP
- **Code Security**: 6-digit codes with configurable TTL and attempt limits

### Configuration

The email verification system uses the following environment variables:

- `EMAIL_NO_REPLY`: The "from" address for verification emails (e.g., "no-reply@geekstalk.co")
- `VERIFICATION_CODE_TTL_MIN`: How long verification codes remain valid (default: 10 minutes)
- `VERIFICATION_MAX_ATTEMPTS`: Maximum failed attempts before code is locked (default: 5)

### API Endpoints

- `POST /api/auth/request-code`: Request a verification code for signup/reset/change
- `POST /api/auth/verify-code`: Verify and consume a verification code
- `POST /api/auth/reset-password`: Reset password using verified code
- `POST /api/auth/change-password`: Change password (supports both current password and email verification)

### Security Features

- **Code Expiration**: Codes automatically expire after the configured TTL
- **Attempt Limiting**: Codes are locked after maximum failed attempts
- **One-time Use**: Codes are consumed after successful verification
- **Rate Limiting**: Prevents spam with per-email and per-IP limits
- **Domain Restrictions**: Only allows trusted email providers

## Production Deployment

### Server Requirements

- **Node.js**: Version 18 or higher
- **PostgreSQL**: Version 13 or higher
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: Minimum 20GB SSD
- **Network**: Stable internet connection

### Deployment Steps

1. **Prepare your server:**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib -y
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Set up PostgreSQL:**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE geekstalk_db;
   CREATE USER geekstalk_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE geekstalk_db TO geekstalk_user;
   \q
   ```

3. **Deploy the application:**
   ```bash
   # Clone your repository
   git clone https://github.com/yourusername/geeks-talk-mvp.git
   cd geeks-talk-mvp
   
   # Install dependencies
   npm install --legacy-peer-deps
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your production values
   
   # Run database migrations
   npx prisma migrate deploy
   npx prisma generate
   
   # Build the application
   npm run build
   ```

4. **Start with PM2:**
   ```bash
   # Create PM2 ecosystem file
   cat > ecosystem.config.js << EOF
   module.exports = {
     apps: [{
       name: 'geeks-talk',
       script: 'npm',
       args: 'start',
       cwd: '/path/to/your/app',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   }
   EOF
   
   # Start the application
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

5. **Set up Nginx (optional but recommended):**
   ```bash
   sudo apt install nginx -y
   
   # Create Nginx configuration
   sudo nano /etc/nginx/sites-available/geeks-talk
   ```
   
   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   # Enable the site
   sudo ln -s /etc/nginx/sites-available/geeks-talk /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

### Environment Variables for Production

Make sure to set these environment variables in your production environment:

- `NODE_ENV=production`
- `NEXTAUTH_URL=https://your-domain.com`
- `NEXTAUTH_SECRET` (generate a secure random string)
- All database, email, AWS, and LiveKit credentials

### Monitoring and Maintenance

- **Logs**: `pm2 logs geeks-talk`
- **Status**: `pm2 status`
- **Restart**: `pm2 restart geeks-talk`
- **Database backups**: Set up regular PostgreSQL backups
- **SSL renewal**: Certbot will auto-renew, but monitor the process

### Troubleshooting

1. **Database connection issues**: Check PostgreSQL service and connection string
2. **Email not working**: Verify SMTP credentials or Resend API key
3. **File uploads failing**: Check AWS S3 credentials and bucket permissions
4. **Voice chat not working**: Verify LiveKit server configuration
5. **Build failures**: Ensure all dependencies are installed with `--legacy-peer-deps`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License. See the LICENSE file for details.