"use client";
import { useState, useCallback, useEffect } from 'react';
import { Tldraw, Editor, TLUiOverrides } from '@tldraw/tldraw';
import { useSession } from 'next-auth/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Pen, FileText, Upload, Download, Trash2 } from 'lucide-react';
import CollaborativeEditor from './CollaborativeEditor';
import { useStyledDialog } from '../ui/StyledDialog';

interface VoiceCanvasProps {
  groupId: string;
}

interface GroupFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  uploader: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

export default function VoiceCanvas({ groupId }: VoiceCanvasProps) {
  const { data: session } = useSession();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [groupFiles, setGroupFiles] = useState<GroupFile[]>([]);
  const [activeDocument, setActiveDocument] = useState<{ file: GroupFile; content: string } | null>(null);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showDialog, DialogComponent } = useStyledDialog();

  // Fetch group files on component mount
  useEffect(() => {
    fetchGroupFiles();
  }, [groupId]);

  const fetchGroupFiles = async () => {
    try {
      const response = await fetch(`/api/voice/groups/${groupId}/files`);
      if (response.ok) {
        const data = await response.json();
        setGroupFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching group files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  const handleExport = useCallback(async () => {
    if (!editor) return;
    
    try {
      // Get the current page
      const page = editor.getCurrentPage();
      const shapeIds = editor.getPageShapeIds(page.id);
      
      if (shapeIds.size === 0) {
        showDialog({
          title: 'Nothing to Export',
          message: 'Draw something first before exporting.',
          type: 'info'
        });
        return;
      }

      // Export as PNG using html2canvas
      const canvas = document.querySelector('.tl-canvas') as HTMLElement;
      if (canvas) {
        const canvasData = await html2canvas(canvas, {
          backgroundColor: '#ffffff',
          scale: 2,
        });
        
        const link = document.createElement('a');
        link.download = `whiteboard-${groupId}-${Date.now()}.png`;
        link.href = canvasData.toDataURL();
        link.click();
      } else {
        showDialog({
          title: 'Canvas Error',
          message: 'Canvas not found. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      showDialog({
          title: 'Export Failed',
          message: 'Failed to export whiteboard',
          type: 'error'
        });
    }
  }, [editor, groupId]);

  const handleUploadFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.txt';
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) return;
      
      try {
        // Upload files to the group
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch(`/api/voice/groups/${groupId}/files`, {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            setGroupFiles(prev => [data.file, ...prev]);
          }
        }
        
        // If in drawing mode and file is an image, add to canvas
        if (isDrawingMode && editor) {
          for (const file of files) {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                  // Create image shape using tldraw's proper API
                  const imageShape = {
                    type: 'image' as const,
                    x: 100 + Math.random() * 200,
                    y: 100 + Math.random() * 200,
                    props: {
                      w: Math.min(img.width, 400),
                      h: Math.min(img.height, 300),
                      url: e.target?.result as string,
                    },
                  };
                  
                  // Add to canvas
                  editor.createShapes([imageShape]);
                };
                img.src = e.target?.result as string;
              };
              reader.readAsDataURL(file);
            }
          }
        }
      } catch (error) {
        console.error('File upload failed:', error);
        showDialog({
          title: 'Upload Failed',
          message: 'Failed to upload file',
          type: 'error'
        });
      }
    };
    
    input.click();
  }, [editor, isDrawingMode, groupId]);

  const handleExportPDF = useCallback(async () => {
    if (!editor) return;
    
    try {
      const page = editor.getCurrentPage();
      const shapeIds = editor.getPageShapeIds(page.id);
      
      if (shapeIds.size === 0) {
        showDialog({
          title: 'Nothing to Export',
          message: 'Draw something first before exporting.',
          type: 'info'
        });
        return;
      }

      // Export as PDF using jsPDF
      const canvas = document.querySelector('.tl-canvas') as HTMLElement;
      if (canvas) {
        const canvasData = await html2canvas(canvas, {
          backgroundColor: '#ffffff',
          scale: 2,
        });
        
        const imgData = canvasData.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const imgWidth = 297; // A4 width in mm
        const pageHeight = 210; // A4 height in mm
        const imgHeight = (canvasData.height * imgWidth) / canvasData.width;
        let heightLeft = imgHeight;
        
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save(`whiteboard-${groupId}-${Date.now()}.pdf`);
      } else {
        showDialog({
          title: 'Canvas Error',
          message: 'Canvas not found. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      showDialog({
          title: 'PDF Export Failed',
          message: 'Failed to export PDF',
          type: 'error'
        });
    }
  }, [editor, groupId]);

  const handleClearCanvas = useCallback(() => {
    if (!editor) return;
    
    if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      const page = editor.getCurrentPage();
      const shapeIds = editor.getPageShapeIds(page.id);
      
      if (shapeIds.size > 0) {
        editor.deleteShapes(Array.from(shapeIds));
      }
    }
  }, [editor]);


  const extractTextFromDocx = useCallback(async (file: File, fileName: string) => {
    try {
      // Use mammoth to properly parse .docx files
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      if (result.value && result.value.trim().length > 0) {
        return `<h1>${fileName}</h1>${result.value}<p><em>Note: This document has been converted from .docx format. You can now edit it collaboratively.</em></p>`;
      } else {
        return `<h1>${fileName}</h1><p>Welcome to collaborative editing!</p><p>Start typing to edit this document. You can use formatting tools like <strong>bold</strong>, <em>italic</em>, and more.</p><p>This document is ready for real-time collaboration with other users.</p>`;
      }
    } catch (error) {
      console.error('Error parsing .docx file:', error);
      return `<h1>${fileName}</h1><p>Welcome to collaborative editing!</p><p>Start typing to edit this document. You can use formatting tools like <strong>bold</strong>, <em>italic</em>, and more.</p><p>This document is ready for real-time collaboration with other users.</p>`;
    }
  }, []);

  const handleDisplayFile = useCallback(async (file: GroupFile) => {
    if (file.fileType.startsWith('image/')) {
      // For images, download and display
      try {
        const response = await fetch(`/api/voice/groups/${groupId}/files/${file.id}`);
        if (response.ok) {
          const data = await response.json();
          const img = new Image();
          img.onload = () => {
            // Switch to drawing mode and add image to canvas
            setIsDrawingMode(true);
            setTimeout(() => {
              if (editor) {
                const imageShape = {
                  type: 'image' as const,
                  x: 100,
                  y: 100,
                  props: {
                    w: Math.min(img.width, 600),
                    h: Math.min(img.height, 400),
                    url: data.downloadUrl,
                  },
                };
                editor.createShapes([imageShape]);
              }
            }, 100);
          };
          img.src = data.downloadUrl;
        }
      } catch (error) {
        console.error('Error loading image:', error);
      }
    } else if (file.fileType === 'application/pdf') {
      // For PDF files, show a message about PDF support
      showDialog({
        title: 'PDF Support Coming Soon',
        message: `PDF file: ${file.fileName}\n\nPDF viewing and annotation will be available soon. For now, you can:\n1. Convert to images and upload\n2. Use the drawing mode to create annotations`,
        type: 'info'
      });
    } else if (file.fileName.endsWith('.docx') || file.fileName.endsWith('.doc') || file.fileType.includes('document')) {
      // For Word documents, open collaborative editor
      setIsProcessingDocument(true);
      try {
        const response = await fetch(`/api/voice/groups/${groupId}/files/${file.id}`);
        if (response.ok) {
          const data = await response.json();
          // For now, create a simple document content
          const textContent = `<h1>${file.fileName}</h1><p>Welcome to collaborative editing!</p><p>Start typing to edit this document. You can use formatting tools like <strong>bold</strong>, <em>italic</em>, and more.</p><p>This document is ready for real-time collaboration with other users.</p>`;
          setActiveDocument({ file, content: textContent });
        }
      } catch (error) {
        console.error('Error loading document:', error);
        showDialog({
          title: 'Document Loading Error',
          message: 'Failed to load the document. Please try again.',
          type: 'error'
        });
      } finally {
        setIsProcessingDocument(false);
      }
    } else if (file.fileType.startsWith('text/') || file.fileName.endsWith('.txt')) {
      // For text files, download and show content
      try {
        const response = await fetch(`/api/voice/groups/${groupId}/files/${file.id}`);
        if (response.ok) {
          const data = await response.json();
          const textResponse = await fetch(data.downloadUrl);
          const content = await textResponse.text();
          
          setIsDrawingMode(true);
          setTimeout(() => {
            if (editor) {
              const textShape = {
                type: 'text' as const,
                x: 100,
                y: 100,
                text: `📄 ${file.fileName}\n\n${content.substring(0, 1000)}${content.length > 1000 ? '\n\n... (truncated)' : ''}`,
                props: {
                  size: 'm',
                  color: 'black',
                  font: 'draw',
                },
              };
              editor.createShapes([textShape]);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error loading text file:', error);
      }
    } else {
      // For other file types, show a generic message
      showDialog({
        title: 'File Type Not Supported',
        message: `File: ${file.fileName}\n\nFile type: ${file.fileType}\n\nThis file type is not yet supported for live editing. You can:\n• Switch to drawing mode to add annotations\n• Export your work as PNG/PDF`,
        type: 'info'
      });
    }
  }, [editor, groupId]);

  // Custom UI overrides to add our buttons
  const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
      // Add custom tools
      tools.export = {
        id: 'export',
        icon: 'export',
        label: 'Export PNG',
        kbd: 'e',
        onSelect: () => {
          handleExport();
        },
      };
      
      tools.exportPdf = {
        id: 'exportPdf',
        icon: 'file-text',
        label: 'Export PDF',
        kbd: 'p',
        onSelect: () => {
          handleExportPDF();
        },
      };
      
      tools.upload = {
        id: 'upload',
        icon: 'upload',
        label: 'Upload File',
        kbd: 'u',
        onSelect: () => {
          handleUploadFile();
        },
      };

      tools.clear = {
        id: 'clear',
        icon: 'trash',
        label: 'Clear Canvas',
        kbd: 'c',
        onSelect: () => {
          handleClearCanvas();
        },
      };
      
      return tools;
    },
    actions(editor, actions) {
      // Add custom actions to the menu
      actions.exportPng = {
        id: 'export-png',
        label: 'Export as PNG',
        kbd: 'e',
        onSelect: () => {
          handleExport();
        },
      };
      
      actions.exportPdf = {
        id: 'export-pdf',
        label: 'Export as PDF',
        kbd: 'p',
        onSelect: () => {
          handleExportPDF();
        },
      };
      
      actions.uploadFile = {
        id: 'upload-file',
        label: 'Upload File',
        kbd: 'u',
        onSelect: () => {
          handleUploadFile();
        },
      };

      actions.clearCanvas = {
        id: 'clear-canvas',
        label: 'Clear Canvas',
        kbd: 'c',
        onSelect: () => {
          handleClearCanvas();
        },
      };
      
      return actions;
    },
  };

  return (
    <div className="h-full w-full relative">
      {/* Mode toggle buttons - moved to bottom right to not interfere with tldraw */}
      <div className="absolute bottom-4 right-4 z-20 bg-card/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDrawingMode(false)}
            className={`p-2 rounded-lg transition-colors ${
              !isDrawingMode 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-white/10 text-muted-foreground hover:bg-white/20'
            }`}
            title="File Canvas Mode"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDrawingMode(true)}
            className={`p-2 rounded-lg transition-colors ${
              isDrawingMode 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-white/10 text-muted-foreground hover:bg-white/20'
            }`}
            title="Drawing Mode"
          >
            <Pen className="w-4 h-4" />
          </button>
        </div>
      </div>

          {/* Canvas content */}
          <div className="h-full w-full" style={{ minHeight: '400px' }}>
            {isProcessingDocument ? (
              // Loading state for document processing
              <div className="h-full w-full flex items-center justify-center bg-background/70">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Processing Document</h3>
                  <p className="text-sm text-muted-foreground">
                    Converting your Word document for collaborative editing...
                  </p>
                </div>
              </div>
            ) : activeDocument ? (
              // Collaborative document editor
              <CollaborativeEditor
                fileName={activeDocument.file.fileName}
                fileContent={activeDocument.content}
                groupId={groupId}
                onClose={() => setActiveDocument(null)}
              />
            ) : isDrawingMode ? (
          // Drawing mode - show tldraw whiteboard
          <div className="h-full w-full">
            <Tldraw
              onMount={handleMount}
              overrides={uiOverrides}
              persistenceKey={`voice-canvas-${groupId}`}
              hideUi={false}
            />
          </div>
        ) : (
          // File canvas mode - show uploaded files
          <div className="h-full w-full bg-background/50 flex flex-col">
            {/* Header for file canvas mode */}
            <div className="p-4 border-b border-border/20 bg-card/95 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    File Canvas
                  </span>
                  {session?.user?.name && (
                    <span className="text-xs text-muted-foreground">
                      • {session.user.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleUploadFile}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </button>
              </div>
            </div>
            
            {/* File upload area */}
            <div className="p-6 border-b border-border/20">
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">
                  Upload files to display on the canvas
                </span>
                <div className="text-xs text-muted-foreground/70">
                  <strong>Supported:</strong> Images (PNG, JPG, GIF) • Text files (.txt) • Word docs (.docx, .doc) • PDFs
                </div>
                <div className="text-xs text-muted-foreground/70">
                  <strong>Note:</strong> Word docs and PDFs will show as editable text shapes for annotation
                </div>
              </div>
            </div>

            {/* Files list */}
            <div className="flex-1 p-6">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading files...</p>
                  </div>
                </div>
              ) : groupFiles.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No files uploaded</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload files to display them on the canvas
                    </p>
                    <button
                      onClick={handleUploadFile}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Upload Files
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {groupFiles.map((file) => (
                    <div key={file.id} className="bg-card/50 rounded-lg p-4 border border-border/20 hover:border-border/40 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate" title={file.fileName}>
                            {file.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.fileSize / 1024).toFixed(1)} KB
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {file.uploader.name || file.uploader.username || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      
                      {file.fileType.startsWith('image/') ? (
                        <div className="aspect-video bg-muted/20 rounded mb-2 overflow-hidden">
                          <img
                            src={`/api/voice/groups/${groupId}/files/${file.id}`}
                            alt={file.fileName}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => handleDisplayFile(file)}
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted/20 rounded mb-2 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleDisplayFile(file)}
                        className="w-full px-3 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                      >
                        {file.fileType.startsWith('image/') 
                          ? 'View & Annotate' 
                          : file.fileName.endsWith('.docx') || file.fileName.endsWith('.doc')
                          ? 'Edit & Annotate'
                          : file.fileType === 'application/pdf'
                          ? 'View & Annotate'
                          : 'View Content'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Styled Dialog */}
      <DialogComponent />
    </div>
  );
}
