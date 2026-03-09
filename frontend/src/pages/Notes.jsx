import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useEditor, EditorContent } from '@tiptap/react';
import { cn } from '../lib/utils';
import { PanelResizeHandle, Panel, PanelGroup } from "react-resizable-panels";
import { useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import createSuggestion from '../extensions/suggestion';
import Instagram from '../extensions/Instagram';
import {
  Plus, FileText, MoreVertical, Trash2, Edit, Star, StarOff,
  Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2,
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon, Instagram as InstagramIcon,
  Search, ChevronRight, ChevronDown, File, Upload, PanelLeft, X
} from 'lucide-react';

// --- Editor Toolbar (Reused) ---
const EditorToolbar = ({ editor, onToggleSidebar, isSidebarCollapsed }) => {
  const { api } = useAuth();
  if (!editor) return null;

  const addYoutubeVideo = () => {
    const url = window.prompt('Enter YouTube URL:');
    if (url) editor.commands.setYoutubeVideo({ src: url });
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) editor.commands.setImage({ src: url });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const promise = api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        toast.promise(promise, {
          loading: 'Uploading image...',
          success: (res) => {
            const url = api.defaults.baseURL.replace('/api', '') + res.data.url;
            editor.commands.setImage({ src: url });
            return 'Image uploaded';
          },
          error: 'Failed to upload image'
        });
      } catch (error) {
        console.error("Upload failed", error);
      }
    }
    e.target.value = '';
  };

  const addInstagramPost = () => {
    const url = window.prompt('Enter Instagram post or reel URL:');
    if (url) editor.commands.setInstagramPost({ src: url });
  };

  const ToolbarBtn = ({ onClick, isActive, icon: Icon, title }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("h-8 w-8", isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );

  return (
    <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-1 flex flex-wrap gap-0.5 sticky top-0 z-10 items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className={cn("h-8 w-8 mr-1", isSidebarCollapsed ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}
        title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
      >
        <PanelLeft className="w-4 h-4" />
      </Button>
      <div className="w-px h-5 bg-border mx-1 self-center" />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="Bold" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="Italic" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} title="Strikethrough" />

      <div className="w-px h-5 bg-border mx-1 self-center" />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={Heading1} title="Heading 1" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading2} title="Heading 2" />

      <div className="w-px h-5 bg-border mx-1 self-center" />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} title="Bullet List" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} title="Ordered List" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={Quote} title="Quote" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} icon={Code} title="Code Block" />

      <div className="w-px h-5 bg-border mx-1 self-center" />

      <ToolbarBtn onClick={addYoutubeVideo} icon={YoutubeIcon} title="Add YouTube" />
      <ToolbarBtn onClick={addInstagramPost} icon={InstagramIcon} title="Add Instagram" />
      <ToolbarBtn onClick={addImage} icon={ImageIcon} title="Add Image URL" />
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => document.getElementById('image-upload').click()} title="Upload Image">
        <Upload className="w-4 h-4" />
      </Button>
      <input type="file" id="image-upload" accept="image/*" onChange={handleImageUpload} className="hidden" />

      <ToolbarBtn onClick={() => { const url = window.prompt('Enter URL:'); if (url) editor.commands.setLink({ href: url }); }} isActive={editor.isActive('link')} icon={LinkIcon} title="Link" />
    </div>
  );
};

// --- Tree View Components ---

const NoteTreeItem = ({ note, level, onSelect, selectedId, onToggleExpand, expandedIds, onCreateChild, onDelete, onToggleFavorite }) => {
  const hasChildren = note.children && note.children.length > 0;
  const isExpanded = expandedIds.includes(note.id);
  const isSelected = selectedId === note.id;

  return (
    <div className="select-none">
      <div
        className={cn(
          "group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors text-sm",
          isSelected ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelect(note)}
      >
        <div
          className={cn("p-0.5 rounded-sm hover:bg-muted-foreground/20 transition-colors cursor-pointer", !hasChildren && "invisible")}
          onClick={(e) => { e.stopPropagation(); onToggleExpand(note.id); }}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span className="truncate">{note.title || "Untitled"}</span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-background/80">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateChild(note.id); }}>
                <Plus className="w-3.5 h-3.5 mr-2" /> Add sub-page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite(note); }}>
                {note.is_favorite ? <StarOff className="w-3.5 h-3.5 mr-2" /> : <Star className="w-3.5 h-3.5 mr-2" />}
                {note.is_favorite ? "Remove favorite" : "Add to favorites"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-background/80"
            onClick={(e) => { e.stopPropagation(); onCreateChild(note.id); }}
            title="Add sub-page"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-0">
          {note.children.map(child => (
            <NoteTreeItem
              key={child.id}
              note={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              onToggleExpand={onToggleExpand}
              expandedIds={expandedIds}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Notes = () => {
  const { api } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const sidebarRef = useRef(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Refs for Auto-save & Editor Context
  const saveTimeoutRef = useRef(null);
  const selectedNoteIdRef = useRef(selectedNoteId);
  const saveContentRef = useRef(null);
  const notesRef = useRef(notes);

  useEffect(() => { notesRef.current = notes; }, [notes]);

  useEffect(() => { selectedNoteIdRef.current = selectedNoteId; }, [selectedNoteId]);

  // Editor State
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      Image.configure({ inline: true }),
      Youtube.configure({ width: 640, height: 360, controls: true }),
      Instagram.configure({ width: 400, height: 500 }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm cursor-pointer font-medium hover:bg-primary/30 transition-colors',
        },
        suggestion: createSuggestion(({ query }) => {
          const allNotes = notesRef.current || [];
          const q = query.toLowerCase();
          const matches = allNotes.filter(item => item.title?.toLowerCase().includes(q)).slice(0, 5);
          if (query.length > 0) {
            matches.push({ id: 'new', title: query, isNew: true });
          }
          return matches;
        })
      }),
      Placeholder.configure({ placeholder: 'Start writing...' })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none w-full focus:outline-none min-h-[500px] py-4 px-4 text-base leading-relaxed break-words whitespace-pre-wrap [&_img]:max-h-[350px] [&_img]:w-auto [&_img]:rounded-md [&_img]:shadow-sm [&_img]:cursor-zoom-in [&_img]:inline-block [&_img]:mr-2 [&_img]:mb-2 [&_img]:align-top'
      },
      handleClickOn: (view, pos, node, nodePos, event, direct) => {
        if (node && node.type && node.type.name === 'image') {
          setLightboxSrc(node.attrs.src);
          setIsLightboxOpen(true);
          return true;
        }
        if (node && node.type && node.type.name === 'mention') {
          const id = node.attrs.id;
          if (id) {
            window.dispatchEvent(new CustomEvent('open-note', { detail: { id } }));
          }
          return true;
        }
        return false;
      },
      createNoteHandler: async (title) => {
        try {
          const res = await api.post('/notes', {
            title: title || 'Untitled',
            content: '',
            parent_id: selectedNoteIdRef.current
          });
          window.dispatchEvent(new CustomEvent('note-created', { detail: { note: res.data } }));
          return res.data;
        } catch (e) {
          toast.error('Failed to create sub-page inline');
          return null;
        }
      }
    },
    onUpdate: ({ editor }) => {
      // Debounced save could go here
    }
  });

  // Handle events from inline mentions
  useEffect(() => {
    const handleOpenNote = (e) => {
      const id = e.detail.id;
      const note = notesRef.current.find(n => n.id === id);
      if (note) {
        if (selectedNoteIdRef.current && editor) {
          if (saveContentRef.current) saveContentRef.current(selectedNoteIdRef.current, editor.getHTML());
        }
        setSelectedNoteId(note.id);
        if (note.parent_id) {
          setExpandedIds(prev => prev.includes(note.parent_id) ? prev : [...prev, note.parent_id]);
        }
      }
    };

    const handleNoteCreated = (e) => {
      const newNote = e.detail.note;
      setNotes(prev => [...prev, newNote]);
      if (newNote.parent_id) {
        setExpandedIds(prev => prev.includes(newNote.parent_id) ? prev : [...prev, newNote.parent_id]);
      }
      toast.success('Sub-page inline created');
    };

    window.addEventListener('open-note', handleOpenNote);
    window.addEventListener('note-created', handleNoteCreated);
    return () => {
      window.removeEventListener('open-note', handleOpenNote);
      window.removeEventListener('note-created', handleNoteCreated);
    };
  }, [editor]);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await api.get('/notes');
      setNotes(response.data);
    } catch (error) {
      toast.error('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Tree Building Logic
  const noteTree = useMemo(() => {
    const noteMap = {};
    const rootNotes = [];

    // Pass 1: Initialize map
    notes.forEach(note => {
      noteMap[note.id] = { ...note, children: [] };
    });

    // Pass 2: Build tree
    notes.forEach(note => {
      if (note.parent_id && noteMap[note.parent_id]) {
        noteMap[note.parent_id].children.push(noteMap[note.id]);
      } else {
        rootNotes.push(noteMap[note.id]);
      }
    });

    return rootNotes;
  }, [notes]);

  // Selection Logic
  const selectedNote = useMemo(() =>
    notes.find(n => n.id === selectedNoteId),
    [notes, selectedNoteId]);

  useEffect(() => {
    if (editor && selectedNote && editor.getHTML() !== selectedNote.content) {
      editor.commands.setContent(selectedNote.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId, editor]); // Only update when ID changes to avoid cursor jumps

  // Actions
  const handleSelectNote = (note) => {
    if (selectedNoteId === note.id) return;
    // Auto-save previous note if needed? (For now relying on manual Save or blur)
    if (selectedNoteId && editor) {
      handleSaveContent(selectedNoteId, editor.getHTML());
    }
    setSelectedNoteId(note.id);
  };

  const handleToggleExpand = (id) => {
    setExpandedIds(prev => prev.includes(id)
      ? prev.filter(i => i !== id)
      : [...prev, id]
    );
  };

  const handleCreateNote = async (parentId = null) => {
    try {
      const res = await api.post('/notes', {
        title: 'Untitled',
        content: '',
        parent_id: parentId
      });
      setNotes(prev => [...prev, res.data]);
      setSelectedNoteId(res.data.id);
      if (parentId) {
        setExpandedIds(prev => [...prev, parentId]);
      }
      toast.success('New page created');
    } catch (e) {
      toast.error('Failed to create page');
    }
  };

  const handleDeleteNote = async (id) => {
    if (!confirm('Are you sure? This will delete all sub-pages as well.')) return;
    try {
      await api.delete(`/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id)); // Needs recursive filter if purely local, but fetch refresh is safer
      if (selectedNoteId === id) setSelectedNoteId(null);
      fetchNotes(); // Refresh to clean up children
      toast.success('Page deleted');
    } catch (e) {
      toast.error('Failed to delete page');
    }
  };

  const handleSaveContent = useCallback(async (id, content) => {
    // If id is not passed, use current selected
    const targetId = id || selectedNoteId;
    if (!targetId) return;

    // Optimistic update
    setNotes(prev => prev.map(n => n.id === targetId ? { ...n, content } : n));

    try {
      await api.put(`/notes/${targetId}`, { content });
    } catch (e) {
      console.error("Auto-save failed", e);
      toast.error("Failed to save changes. Check connection.");
    }
  }, [api, selectedNoteId]);

  // Keep ref up to date
  useEffect(() => { saveContentRef.current = handleSaveContent; }, [handleSaveContent]); // Dependent on notes

  // Auto-save Listener
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(() => {
        const id = selectedNoteIdRef.current;
        const fn = saveContentRef.current;
        if (id && fn) {
          fn(id, editor.getHTML());
        }
      }, 1000); // 1s delay
    };

    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor]);

  const handleTitleChange = async (newTitle) => {
    if (!selectedNoteId) return;
    setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, title: newTitle } : n));
    try {
      await api.put(`/notes/${selectedNoteId}`, { title: newTitle });
    } catch (e) {
      console.error("Title save failed", e);
    }
  };

  const handleToggleFavorite = async (note) => {
    const newVal = !note.is_favorite;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_favorite: newVal } : n));
    try {
      api.put(`/notes/${note.id}`, { is_favorite: newVal });
    } catch (e) { }
  };

  const toggleSidebar = () => {
    const panel = sidebarRef.current;
    if (panel) {
      if (isSidebarCollapsed) {
        panel.expand();
      } else {
        panel.collapse();
      }
      // Note: react-resizable-panels doesn't seem to expose current collapsed state directly easily without callback
      // But we can approximate with our own state
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col" data-testid="notes-page">
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 sm:p-8"
            onClick={() => setIsLightboxOpen(false)}
          >
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" onClick={() => setIsLightboxOpen(false)}>
              <X className="w-8 h-8" />
            </Button>
            <motion.img
              src={lightboxSrc}
              alt="Preview"
              className="max-w-full max-h-full rounded-lg shadow-2xl object-contain outline-none"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="flex-1 border border-border/40 rounded-xl overflow-hidden bg-card/10 backdrop-blur-sm">
        <PanelGroup direction="horizontal">
          {/* Sidebar Panel */}
          <Panel
            ref={sidebarRef}
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsible={true}
            onCollapse={() => setIsSidebarCollapsed(true)}
            onExpand={() => setIsSidebarCollapsed(false)}
            className={cn("flex flex-col border-r border-border/40 bg-background/50", isSidebarCollapsed && "min-w-0 p-0 overflow-hidden")}
          >
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pages</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleCreateNote()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-2">
              <div className="pb-4">
                {noteTree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                    <span className="text-xs">No pages</span>
                  </div>
                ) : (
                  noteTree.map(note => (
                    <NoteTreeItem
                      key={note.id}
                      note={note}
                      level={0}
                      selectedId={selectedNoteId}
                      onSelect={handleSelectNote}
                      onToggleExpand={handleToggleExpand}
                      expandedIds={expandedIds}
                      onCreateChild={handleCreateNote}
                      onDelete={handleDeleteNote}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </Panel>

          <PanelResizeHandle className={cn("w-px bg-border/50 hover:bg-primary/50 transition-colors w-1 hover:w-1 active:bg-primary z-50 cursor-col-resize", isSidebarCollapsed && "w-0 hidden")} />

          {/* Editor Panel */}
          <Panel defaultSize={80}>
            {selectedNote ? (
              <div className="h-full flex flex-col bg-background">
                {/* Toolbar Area */}
                <div className="border-b border-border/40 z-10">
                  <EditorToolbar editor={editor} onToggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 w-full">
                    {/* Title Input */}
                    <input
                      value={selectedNote.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="text-3xl font-bold bg-transparent border-none focus:outline-none w-full placeholder:text-muted-foreground/20 text-foreground mb-4 tracking-tight"
                      placeholder="Untitled"
                    />

                    {/* Cont ent */}
                    <div className="min-h-[500px] pb-20" onClick={() => editor?.chain().focus().run()}>
                      <EditorContent editor={editor} className="prose prose-stone dark:prose-invert max-w-none leading-normal" />
                    </div>

                    {/* Footer Meta */}
                    <div className="mt-8 pt-4 border-t border-border/20 text-xs text-muted-foreground/40">
                      Last updated: {format(new Date(selectedNote.updated_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <h2 className="text-lg font-medium text-foreground mb-1">No page selected</h2>
                <p className="max-w-xs text-sm">Select a page to start writing.</p>
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};
