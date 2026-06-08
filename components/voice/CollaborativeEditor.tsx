"use client";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { X, Save, Download, Users, Wifi, WifiOff } from 'lucide-react';
import { WebsocketProvider } from 'y-websocket';

interface CollaborativeEditorProps {
  fileName: string;
  fileContent?: string;
  groupId: string;
  onClose: () => void;
}

// Generate consistent color for user
function generateUserColor(userId: string): string {
  const colors = [
    '#f783ac', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
    '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3',
    '#ff9f43', '#10ac84', '#ee5a24', '#0984e3', '#6c5ce7'
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export default function CollaborativeEditor({
  fileName,
  fileContent = '',
  groupId,
  onClose
}: CollaborativeEditorProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [doc, setDoc] = useState<any>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ...(doc && provider ? [
        Collaboration.configure({
          document: doc,
        }),
        CollaborationCursor.configure({
          provider: provider,
          user: {
            name: session?.user?.name || 'Anonymous',
            color: session?.user?.id ? generateUserColor(session.user.id) : '#f783ac',
          },
        }),
      ] : []),
    ],
    content: fileContent || `<h1>${fileName}</h1><p>Start editing this document collaboratively...</p>`,
    editable: true,
    immediatelyRender: false, // Fix SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: 'min-height: 400px; padding: 1rem;',
      },
    },
  });

  useEffect(() => {
    // Initialize Yjs document and WebSocket provider for collaboration
    if (typeof window !== 'undefined') {
      import('yjs').then(async ({ Doc }) => {
        const yDoc = new Doc();
        setDoc(yDoc);

        // Fetch a short-lived collaboration token (granted only to group members).
        // The Yjs WS server rejects connections without a valid token for this group.
        let token = '';
        try {
          const res = await fetch(`/api/collaboration/token?groupId=${encodeURIComponent(groupId)}`);
          if (res.ok) token = (await res.json())?.token || '';
        } catch {
          // No token — the WS server will reject the connection below.
        }

        // Create WebSocket provider. URL comes from env so prod points at the
        // deployed collaboration server (defaults to the local dev server).
        const wsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:3001';
        const wsProvider = new WebsocketProvider(
          wsUrl,
          groupId,
          yDoc,
          { params: { token } }
        );

        setProvider(wsProvider);
        providerRef.current = wsProvider;

        // Handle connection status
        wsProvider.on('status', (event: any) => {

          setIsConnected(event.status === 'connected');
        });

        // Handle connection errors
        wsProvider.on('connection-error', (error: any) => {
          console.error('WebSocket connection error:', error);
          setIsConnected(false);
        });

        // Handle connection close
        wsProvider.on('connection-close', (event: any) => {

          setIsConnected(false);
        });

        // Handle awareness changes (connected users)
        wsProvider.awareness.on('change', () => {
          const users = Array.from(wsProvider.awareness.getStates().values());

          setConnectedUsers(users);
        });

        // Handle document updates
        yDoc.on('update', (update: any, origin: any) => {

        });

        // Handle document changes
        yDoc.on('afterTransaction', (transaction: any) => {

        });

        // Set initial connection status
        setIsConnected(wsProvider.wsconnected);

        // Add some debugging

        setIsLoading(false);
      });
    }

    // Cleanup on unmount
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
    };
  }, [groupId, session]);

  // Update editor content when fileContent changes
  useEffect(() => {
    if (editor && fileContent) {
      editor.commands.setContent(fileContent);
    } else if (editor) {
      editor.commands.setContent(`<h1>${fileName}</h1><p>Start editing this document collaboratively...</p>`);
    }
  }, [editor, fileContent, fileName]);

  const handleSave = async () => {
    if (editor && provider) {
      const content = editor.getHTML();

      try {
        // Save document content via API
        const response = await fetch(`/api/collaboration/${groupId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'save',
            content: content,
            fileName: fileName
          }),
        });

        if (response.ok) {
          setLastSaved(new Date());

        } else {
          console.error('Failed to save document');
        }
      } catch (error) {
        console.error('Error saving document:', error);
      }
    }
  };

  const handleExport = () => {
    if (editor) {
      const content = editor.getHTML();
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.[^/.]+$/, '')}_edited.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading collaborative editor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .ProseMirror .collaboration-cursor__caret {
          position: relative;
          margin-left: -1px;
          margin-right: -1px;
          border-left: 1px solid #0d0d0d;
          border-right: 1px solid #0d0d0d;
          word-break: normal;
          pointer-events: none;
        }

        .ProseMirror .collaboration-cursor__label {
          position: absolute;
          top: -1.4em;
          left: -1px;
          font-size: 12px;
          font-style: normal;
          font-weight: 600;
          line-height: normal;
          user-select: none;
          color: #0d0d0d;
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 1000;
        }

        .ProseMirror .collaboration-cursor__selection {
          position: absolute;
          pointer-events: none;
          opacity: 0.2;
        }
      `}</style>
      <div className="h-full w-full flex flex-col bg-white">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">📄 {fileName}</h2>
          <span className="text-sm text-gray-500">Collaborative Editing</span>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="w-4 h-4" />
                <span className="text-xs">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs">Disconnected</span>
              </div>
            )}
          </div>

          {/* Connected Users */}
          {connectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div className="flex -space-x-2">
                {connectedUsers.slice(0, 3).map((user, index) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: user.color || '#f783ac' }}
                    title={user.name || 'Anonymous'}
                  >
                    {(user.name || 'A').charAt(0).toUpperCase()}
                  </div>
                ))}
                {connectedUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs font-medium text-white">
                    +{connectedUsers.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto bg-white">
        <EditorContent
          editor={editor}
          className="h-full min-h-[500px] prose prose-sm max-w-none p-6 focus:outline-none text-gray-900"
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>
            Connected users: {connectedUsers.length > 0 ? connectedUsers.length : 1}
            {connectedUsers.length > 0 && (
              <span className="ml-1">
                ({connectedUsers.map(u => u.name || 'Anonymous').join(', ')})
              </span>
            )}
          </span>
          <span>•</span>
          <span>Real-time collaboration</span>
          {lastSaved && (
            <>
              <span>•</span>
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
      </div>
    </>
  );
}
