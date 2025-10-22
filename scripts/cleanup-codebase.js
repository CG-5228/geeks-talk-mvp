const fs = require('fs');
const path = require('path');

// Files to clean up console.log statements
const filesToClean = [
  'utils/useAggressiveHeartbeat.ts',
  'utils/useRobustOfflineDetection.ts',
  'components/auth/SessionSharer.tsx',
  'app/api/online/route.ts',
  'app/api/user/cleanup-offline/route.ts',
  'app/api/user/set-offline/route.ts',
  'app/api/user/heartbeat/route.ts',
  'app/api/user/logout/route.ts',
  'lib/auth.ts',
  'app/api/live/messages/route.ts',
  'app/api/live/dms/message/[messageId]/route.ts',
  'app/api/live/messages/[messageId]/route.ts',
  'app/api/user/report/route.ts',
  'middleware.ts',
  'app/live/transfer-session/page.tsx',
  'app/signin/page.tsx',
  'components/admin/AdminManager.tsx',
  'components/voice/VoiceIntegration.tsx',
  'components/voice/GroupList.tsx',
  'components/voice/RandomQueue.tsx',
  'app/api/live/channels/[channelId]/route.ts',
  'components/live/dm/StartDMDialog.tsx',
  'components/live/dm/DMDetails.tsx',
  'components/live/channel/MessageItem.tsx',
  'components/live/dm/DMConversation.tsx',
  'components/live/message/MessageActionMenu.tsx',
  'app/live/ChatDashboard.tsx',
  'components/live/channel/MessageList.tsx',
  'components/header/UserMenu.tsx',
  'components/voice/CollaborativeEditor.tsx',
  'app/api/collaboration/[groupId]/route.ts'
];

function cleanConsoleLogs(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;

    // Remove console.log statements (but keep console.error and console.warn)
    content = content.replace(/^\s*console\.log\([^)]*\);\s*$/gm, '');
    content = content.replace(/^\s*console\.log\([^)]*\);\s*$/gm, '');
    
    // Remove empty lines that were left behind
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove trailing whitespace
    content = content.replace(/[ \t]+$/gm, '');

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Cleaned: ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
  }
}

console.log('🧹 Starting codebase cleanup...\n');

filesToClean.forEach(file => {
  cleanConsoleLogs(file);
});

console.log('\n✅ Codebase cleanup completed!');
console.log('📝 Removed console.log statements from production files');
console.log('🔧 Preserved console.error and console.warn for debugging');
