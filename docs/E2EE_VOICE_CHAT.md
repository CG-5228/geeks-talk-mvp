# E2EE 1v1 Random Voice Chat

## Overview

This document describes the end-to-end encrypted 1v1 random voice chat feature implemented with LiveKit SFU and client-side encryption.

## Security Architecture

### E2EE Implementation
- **Transport**: LiveKit SFU (Selective Forwarding Unit)
- **Encryption**: SFrame with client-generated X25519 keys
- **Key Exchange**: X25519 Diffie-Hellman over LiveKit DataChannel
- **Key Derivation**: HKDF-SHA256 with room name as info
- **Rekey**: Every 10 minutes and on participant changes

### Security Guarantees
- **Media E2EE**: Audio/video streams are encrypted end-to-end
- **Server Never Sees Keys**: All key material stays on client
- **Perfect Forward Secrecy**: Keys are rotated regularly
- **No Key Storage**: Server never persists or logs encryption keys

### Limitations
- **Text Chat**: Not E2EE by default (encrypted in transit only)
- **File Sharing**: Not E2EE by default (encrypted in transit only)
- **Browser Support**: Requires insertable streams support

## Environment Setup

### Required Environment Variables

Add these to your `.env` file:

```env
# Redis (required for 1v1 random chat)
REDIS_URL=redis://localhost:6379
# or
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# LiveKit (required)
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### Redis Installation

#### Local Development
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Docker
docker run -d -p 6379:6379 redis:alpine
```

#### Production
- Use managed Redis service (AWS ElastiCache, Redis Cloud, etc.)
- Configure persistence and backup
- Set up monitoring and alerts

## How E2EE Works

### 1. Key Generation
- Client generates X25519 keypair using Web Crypto API
- Private key never leaves the client
- Public key is shared via LiveKit DataChannel

### 2. Key Exchange
- Both clients exchange public keys over reliable DataChannel
- X25519 Diffie-Hellman derives shared secret
- HKDF-SHA256 derives encryption key from shared secret + room name

### 3. Encryption Setup
- LiveKit SFrame encryption is configured with derived key
- Audio/video streams are encrypted before transmission
- Server only sees encrypted data

### 4. Rekey Process
- New X25519 keypair generated every 10 minutes
- New public keys exchanged via DataChannel
- New encryption key derived and applied
- Old keys are discarded

## API Endpoints

### Queue Management
- `POST /api/voice/random/queue` - Enter queue with topics
- `GET /api/voice/random/queue/status` - Poll for match
- `DELETE /api/voice/random/queue` - Leave queue

### LiveKit Token
- `GET /api/livekit/token?roomName=X` - Get short-lived token (5 min max)

## Component Architecture

### TopicSelection.tsx
- Multi-select topic interface
- Custom tag input
- "Match with anyone" option

### RandomQueue.tsx
- State machine: topic-selection → queue → matched → in-room
- Polling for matches
- Queue status display

### OneOnOneRoom.tsx
- LiveKit room connection
- E2EE key exchange
- Voice controls (mic disabled until E2EE ready)
- Rekey management

## Manual Testing

### Setup
1. Install Redis locally
2. Set environment variables
3. Start the application

### Test Flow
1. Open two browsers (or incognito + normal)
2. Both select overlapping topics (e.g., "Cybersecurity")
3. Click "Start Matching"
4. Verify both matched within 5 seconds
5. Verify "Exchanging keys..." → "Encrypted ✓"
6. Speak, verify audio works
7. Wait 10 minutes, verify rekey occurs
8. One user leaves, verify other sees disconnect

## Troubleshooting

### Redis Connection Issues
- Check Redis is running: `redis-cli ping`
- Verify connection string format
- Check firewall/network settings

### E2EE Not Working
- Check browser support: `getE2EESupportInfo()`
- Verify LiveKit server supports SFrame
- Check console for crypto errors

### Matching Issues
- Check Redis queue: `redis-cli lrange rv:queue 0 -1`
- Verify topic overlap logic
- Check API logs for errors

### Token Issues
- Verify LiveKit credentials
- Check token expiry (5 minutes max)
- Verify room name format

## Security Considerations

### Client-Side
- Keys are generated in secure context
- Sensitive data is cleared from memory
- No key material is logged

### Server-Side
- No key exchange API endpoints
- No key storage or persistence
- Minimal logging (no PII, no keys)

### Network
- All key exchange over LiveKit DataChannel
- Keys never sent over HTTP
- Room names are validated to prevent injection

## Performance

### Redis
- Queue operations are atomic
- TTLs handle cleanup automatically
- Minimal memory usage per user

### LiveKit
- Short-lived tokens (5 min max)
- Minimal grants (only required permissions)
- Efficient SFU routing

### Client
- E2EE adds minimal overhead
- Rekey is asynchronous
- Graceful fallback for unsupported browsers

## Future Enhancements

### Option B: E2EE Text Chat
- Encrypt messages with AES-GCM
- Use DH-derived key for encryption
- Include random nonce + auth tag

### Option B: E2EE File Sharing
- Encrypt file chunks client-side
- Share decryption keys via DataChannel
- Decrypt client-side on download

### Additional Features
- Group voice chat with E2EE
- Screen sharing with E2EE
- Recording with E2EE (complex)
