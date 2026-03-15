import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useEditor, EditorContent } from '@tiptap/react';
import { cn } from '../lib/utils';
import { useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import createSuggestion from '../extensions/suggestion';
import Instagram from '../extensions/Instagram';
import { isInstagramUrl, getInstagramId } from '../extensions/Instagram';
import {
  Plus, FileText, Trash2, Edit, Star, StarOff,
  Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2,
  Link as LinkIcon, Image as ImageIcon,
  Search, ChevronRight, ChevronDown, File, Upload, ArrowLeft, X
} from 'lucide-react';

// --- Editor Toolbar (Reused) ---
const EditorToolbar = ({ editor, onBack }) => {
  const { api } = useAuth();
  if (!editor) return null;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const promise = api.post('/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        toast.promise(promise, {
          loading: 'Uploading image...',
          success: (res) => {
            const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
            const rawThumb = res.data.thumbnailUrl || res.data.url;
            const thumbUrl = rawThumb?.startsWith('http') ? rawThumb : `${baseUrl}${rawThumb || ''}`;
            const rawFull = res.data.fullImageUrl || thumbUrl;
            const fullUrl = rawFull?.startsWith('http') ? rawFull : `${baseUrl}${rawFull || ''}`;

            if (!thumbUrl) throw new Error('Upload response missing thumbnail URL');

            editor.commands.setImage({
              src: thumbUrl,
              alt: fullUrl,
              title: res.data.fullImageId || ''
            });
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
    <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-1 pl-5 flex flex-wrap gap-0.5 sticky top-0 z-10 items-center shadow-neu-inset-sm rounded-b-xl">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="h-8 w-8 mr-1 text-muted-foreground hover:text-foreground"
        title="Back to Notes"
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="w-px h-5 bg-muted-foreground/15 rounded-full mx-1 self-center" />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="Bold" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="Italic" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} title="Strikethrough" />

      <div className="w-px h-5 bg-muted-foreground/15 rounded-full mx-1 self-center" />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={Heading1} title="Heading 1" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading2} title="Heading 2" />

      <div className="w-px h-5 bg-muted-foreground/15 rounded-full mx-1 self-center" />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} title="Bullet List" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} title="Ordered List" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={Quote} title="Quote" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} icon={Code} title="Code Block" />

      <div className="w-px h-5 bg-muted-foreground/15 rounded-full mx-1 self-center" />

      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => document.getElementById('image-upload').click()} title="Upload Image">
        <Upload className="w-4 h-4" />
      </Button>
      <input type="file" id="image-upload" accept="image/*" onChange={handleImageUpload} className="hidden" />

      <ToolbarBtn onClick={() => {
        if (editor.isActive('link')) {
          editor.chain().focus().unsetLink().run();
        } else {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
        }
      }} isActive={editor.isActive('link')} icon={LinkIcon} title="Link" />
    </div>
  );
};

// --- Tree View Components ---

const NoteTreeItem = ({ note, level, onSelect, selectedId, onToggleExpand, expandedIds, onCreateChild, onDelete, onToggleFavorite, editingId, onRename, onCancelEdit }) => {
  const hasChildren = note.children && note.children.length > 0;
  const isExpanded = expandedIds.includes(note.id);
  const isSelected = selectedId === note.id;
  const isEditing = editingId === note.id;
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onRename(note.id, e.target.value);
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const handleBlur = (e) => {
    onRename(note.id, e.target.value);
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "group flex items-center gap-2 py-2.5 px-3 rounded-2xl cursor-pointer transition-all duration-150 text-base",
          isSelected
            ? "bg-primary/10 text-primary font-semibold shadow-neu-sm"
            : "text-foreground/80 hover:bg-muted/60 hover:text-foreground hover:shadow-neu-xs"
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
        onClick={() => onSelect(note)}
      >
        <div
          className={cn("p-0.5 rounded-lg hover:bg-muted-foreground/20 transition-colors cursor-pointer", !hasChildren && "invisible")}
          onClick={(e) => { e.stopPropagation(); onToggleExpand(note.id); }}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <FileText className={cn("w-4 h-4 shrink-0", note.is_favorite ? "text-yellow-500" : "opacity-60")} />
          {isEditing ? (
            <input
              ref={inputRef}
              defaultValue={note.title || ''}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-xl shadow-neu-inset-sm px-1.5 py-0.5 text-base w-full focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Page title"
            />
          ) : (
            <span className={cn("truncate", note.is_favorite && "text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)] font-semibold")}>
              {note.is_favorite && <Star className="w-3.5 h-3.5 inline mr-1.5 fill-yellow-400 text-yellow-400" />}
              {note.title || "Untitled"}
            </span>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", note.is_favorite ? "text-yellow-400 hover:text-yellow-500" : "hover:text-yellow-400 hover:bg-yellow-400/10")}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(note); }}
            title={note.is_favorite ? "Remove favorite" : "Add to favorites"}
          >
            {note.is_favorite ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-background/80"
            onClick={(e) => { e.stopPropagation(); onCreateChild(note.id); }}
            title="Add sub-page"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
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
              editingId={editingId}
              onRename={onRename}
              onCancelEdit={onCancelEdit}
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
  const [editingId, setEditingId] = useState(null);

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
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', class: 'text-primary underline cursor-pointer hover:text-primary/80' } }),
      Image.configure({ inline: true }),
      Youtube.configure({ width: 640, height: 360, controls: true }),
      Instagram.configure({ width: 400, height: 500 }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-primary/20 text-primary px-1.5 py-0.5 rounded-lg cursor-pointer font-medium hover:bg-primary/30 transition-colors',
        },
        suggestion: createSuggestion(({ query }) => {
          const allNotes = notesRef.current || [];
          const q = query.toLowerCase();
          const matches = q
            ? allNotes.filter(item => item.title?.toLowerCase().includes(q))
            : [...allNotes];
          // Add parent name for disambiguation
          const enriched = matches.map(item => {
            const parent = item.parent_id ? allNotes.find(n => n.id === item.parent_id) : null;
            return { ...item, parentTitle: parent?.title || null };
          });
          if (query.length > 0) {
            enriched.push({ id: 'new', title: query, isNew: true });
          }
          return enriched;
        })
      }),
      Placeholder.configure({ placeholder: 'Start writing...' })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none w-full focus:outline-none min-h-[200px] py-4 px-4 text-base leading-relaxed break-words whitespace-pre-wrap [&_img]:max-h-[350px] [&_img]:w-auto [&_img]:rounded-2xl [&_img]:shadow-neu-sm [&_img]:cursor-zoom-in [&_img]:inline-block [&_img]:mr-2 [&_img]:mb-2 [&_img]:align-top'
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain')?.trim();
        if (!text) return false;

        // YouTube detection
        const ytMatch = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/);
        if (ytMatch) {
          event.preventDefault();
          const node = view.state.schema.nodes.youtube;
          if (node) {
            const tr = view.state.tr.replaceSelectionWith(
              node.create({ src: text })
            );
            view.dispatch(tr);
            return true;
          }
        }

        // Instagram detection
        if (isInstagramUrl(text)) {
          const result = getInstagramId(text);
          if (result) {
            event.preventDefault();
            const node = view.state.schema.nodes.instagram;
            if (node) {
              const tr = view.state.tr.replaceSelectionWith(
                node.create({ src: text, postId: result.id, isReel: result.isReel })
              );
              view.dispatch(tr);
              return true;
            }
          }
        }

        // Image URL detection
        if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(text)) {
          event.preventDefault();
          const node = view.state.schema.nodes.image;
          if (node) {
            const tr = view.state.tr.replaceSelectionWith(
              node.create({ src: text })
            );
            view.dispatch(tr);
            return true;
          }
        }

        return false;
      },
      handleClick: (view, pos, event) => {
        const link = event.target.closest('a');
        if (link && link.href) {
          event.preventDefault();
          window.open(link.href, '_blank', 'noopener,noreferrer');
          return true;
        }
        return false;
      },
      handleClickOn: (view, pos, node, nodePos, event, direct) => {
        if (node && node.type && node.type.name === 'image') {
          const fullSrc = (node.attrs.alt && node.attrs.alt.trim()) ? node.attrs.alt : node.attrs.src;
          setLightboxSrc(fullSrc);
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

  const fetchNotes = useCallback(async (signal) => {
    try {
      const response = await api.get('/notes', { signal });
      setNotes(response.data);
    } catch (error) {
      if (!signal?.aborted) toast.error('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    const controller = new AbortController();
    fetchNotes(controller.signal);
    return () => controller.abort();
  }, [fetchNotes]);

  // Tree Building Logic
  const noteTree = useMemo(() => {
    const noteMap = {};
    const rootNotes = [];

    const sortNotes = (arr) => arr.sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });

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

    // Sort children at every level
    const sortTree = (nodes) => {
      sortNotes(nodes);
      nodes.forEach(n => { if (n.children.length) sortTree(n.children); });
    };
    sortTree(rootNotes);

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
      setEditingId(res.data.id);
      if (parentId) {
        setExpandedIds(prev => [...prev, parentId]);
      }
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

  const handleInlineRename = async (id, newTitle) => {
    const title = newTitle.trim() || 'Untitled';
    setEditingId(null);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title } : n));
    try {
      await api.put(`/notes/${id}`, { title });
    } catch (e) {
      console.error("Rename failed", e);
    }
  };

  const handleToggleFavorite = async (note) => {
    const newVal = !note.is_favorite;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_favorite: newVal } : n));
    try {
      api.put(`/notes/${note.id}`, { is_favorite: newVal });
    } catch (e) { }
  };

  const handleBack = () => {
    if (selectedNoteId && editor) {
      handleSaveContent(selectedNoteId, editor.getHTML());
    }
    setSelectedNoteId(null);
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
              className="max-w-full max-h-full rounded-2xl shadow-neu object-contain outline-none"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="flex-1 rounded-t-xl overflow-hidden bg-card/10 backdrop-blur-sm shadow-neu">
        {selectedNote ? (
          <div className="h-full flex flex-col bg-background">
            {/* Toolbar Area */}
            <div className="z-10">
              <EditorToolbar editor={editor} onBack={handleBack} />
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-auto">
              <div className="p-2 px-5 md:p-4 md:pl-8 w-full">
                {/* Title Input */}
                <input
                  value={selectedNote.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-3xl font-bold bg-transparent border-none focus:outline-none w-full placeholder:text-muted-foreground/20 text-foreground mt-2 mb-2 tracking-tight"
                  placeholder="Untitled"
                />

                {/* Content */}
                <div className="min-h-[380px]" onClick={() => editor?.chain().focus().run()}>
                  <EditorContent editor={editor} className="prose prose-stone dark:prose-invert max-w-none leading-normal" />
                </div>
              </div>
            </div>

            {/* Footer Meta — pinned to bottom */}
            <div className="px-6 py-2 text-xs text-muted-foreground/60 shrink-0">
              Last updated: {format(new Date(selectedNote.updated_at), 'MMM d, h:mm a')}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-background">
            {/* Homepage Header */}
            <div className="px-6 py-5 flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground tracking-tight">My Notes</h1>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCreateNote()}>
                <Plus className="w-4 h-4" /> New Page
              </Button>
            </div>
            <div className="mx-0 h-px bg-gradient-to-r from-transparent via-muted-foreground/15 to-transparent" />

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-0.5">
                {noteTree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
                    <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <h2 className="text-lg font-medium text-foreground mb-1">No pages yet</h2>
                    <p className="max-w-xs text-sm mb-4">Create your first page to get started.</p>
                    <Button variant="outline" size="sm" onClick={() => handleCreateNote()}>
                      <Plus className="w-4 h-4 mr-2" /> New Page
                    </Button>
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
                      editingId={editingId}
                      onRename={handleInlineRename}
                      onCancelEdit={() => setEditingId(null)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};
