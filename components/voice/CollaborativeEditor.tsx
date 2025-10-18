"use client";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { X, Save, Download } from 'lucide-react';

interface CollaborativeEditorProps {
  fileName: string;
  fileContent?: string;
  groupId: string;
  onClose: () => void;
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      ...(doc ? [
        Collaboration.configure({
          document: doc,
        }),
        CollaborationCursor.configure({
          provider: null, // We'll set this up with WebSocket later
          user: {
            name: session?.user?.name || 'Anonymous',
            color: '#f783ac',
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
    // Initialize Yjs document for collaboration
    if (typeof window !== 'undefined') {
      import('yjs').then(({ Doc }) => {
        const yDoc = new Doc();
        setDoc(yDoc);
        setIsLoading(false);
      });
    }
  }, []);

  // Update editor content when fileContent changes
  useEffect(() => {
    if (editor && fileContent) {
      editor.commands.setContent(fileContent);
    } else if (editor) {
      editor.commands.setContent(`<h1>${fileName}</h1><p>Start editing this document collaboratively...</p>`);
    }
  }, [editor, fileContent, fileName]);

  const handleSave = () => {
    if (editor) {
      const content = editor.getHTML();
      // TODO: Save to S3 or database
      console.log('Saving document:', content);
      alert('Document saved! (This will be connected to S3 storage)');
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
    <div className="h-full w-full flex flex-col bg-white">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">📄 {fileName}</h2>
          <span className="text-sm text-gray-500">Collaborative Editing</span>
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
          <span>Connected users: {session?.user?.name || 'You'}</span>
          <span>•</span>
          <span>Real-time collaboration</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}
