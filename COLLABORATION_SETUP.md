# Real-time Collaborative Editing Setup

## Overview
This implementation provides Google Docs-like real-time collaborative editing using:
- **TipTap Editor** with Yjs for document synchronization
- **WebSocket server** for real-time communication
- **CollaborationCursor** for live cursor tracking
- **User awareness** showing connected collaborators

## Features Implemented

### ✅ Real-time Document Synchronization
- Multiple users can edit the same document simultaneously
- Changes appear instantly for all participants
- Conflict-free merging using Yjs operational transformation

### ✅ Live Cursor Tracking
- See other users' cursors in real-time
- User names and colors for each cursor
- Selection highlighting for each user
- Smooth cursor animations

### ✅ Connected Users Display
- Show avatars of connected users in header
- Real-time user count and names
- Connection status indicators
- User presence awareness

### ✅ Enhanced Status Bar
- Live connection status (Connected/Disconnected)
- Real connected user count and names
- Last saved timestamp
- Sync status indicators

## Setup Instructions

### 1. Start the Collaboration Server
The WebSocket server needs to run on port 3001 for real-time synchronization:

```bash
# Option 1: Run collaboration server separately
node lib/collaboration-server.js

# Option 2: Run both server and Next.js together
npm run dev:collab
```

### 2. Start the Next.js Application
```bash
npm run dev
```

### 3. Test Collaborative Editing
1. Open the voice chat page
2. Upload a document (Word doc, PDF, or text file)
3. Open the document in collaborative editor
4. Open the same page in another browser/tab
5. Both users should see each other's cursors and changes in real-time

## Technical Implementation

### WebSocket Server (`lib/collaboration-server.js`)
- Handles Yjs document synchronization
- Manages WebSocket connections per group
- Broadcasts changes to all connected clients
- Runs on port 3001

### CollaborativeEditor Component
- **Yjs Document**: Core document state management
- **WebSocketProvider**: Real-time synchronization
- **CollaborationCursor**: Live cursor tracking
- **Awareness Protocol**: User presence tracking

### Key Features
- **User Colors**: Consistent colors generated from user ID
- **Cursor Labels**: User names displayed above cursors
- **Selection Highlighting**: Visual feedback for text selections
- **Connection Status**: Real-time connection monitoring
- **Auto-save**: Document persistence via API

## File Structure
```
components/voice/CollaborativeEditor.tsx  # Main editor component
lib/collaboration-server.js              # WebSocket server
app/api/collaboration/[groupId]/route.ts  # API endpoints
```

## Usage in Voice Groups
1. Navigate to a voice group
2. Upload a document to the file canvas
3. Click to open in collaborative editor
4. Multiple users can now edit simultaneously
5. See live cursors, changes, and connected users

## Troubleshooting

### WebSocket Connection Issues
- Ensure collaboration server is running on port 3001
- Check browser console for connection errors
- Verify firewall settings allow WebSocket connections

### Cursor Not Showing
- Check if other users are connected to the same group
- Verify WebSocket provider is properly initialized
- Ensure CollaborationCursor extension is loaded

### Document Not Syncing
- Check network connection
- Verify groupId is consistent across users
- Check browser console for Yjs errors

## Development Notes
- Uses `y-websocket` for WebSocket transport
- TipTap version compatibility handled with legacy peer deps
- WebSocket server runs independently of Next.js
- Real-time features require both servers running
