import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Plus, FileText, BookOpen, Wallet, Zap, MoreVertical, Trash2, Edit, Star, StarOff,
  Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2,
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon, File, Search, Tag, X, Check, ArrowLeft
} from 'lucide-react';



const DEFAULT_CATEGORIES = [
  { value: 'study', label: 'Study', icon: BookOpen, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'shopping', label: 'Shopping', icon: Wallet, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'general', label: 'General', icon: FileText, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'quick', label: 'Quick', icon: Zap, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
];

const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  const addYoutubeVideo = () => {
    const url = window.prompt('Enter YouTube URL:');
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.commands.setImage({ src: url });
    }
  };

  return (
    <div className="border-b border-border bg-muted/30 p-2 flex flex-wrap gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-accent' : ''}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-accent' : ''}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-accent' : ''}
      >
        <Strikethrough className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
      >
        <Heading1 className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
      >
        <Heading2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-accent' : ''}
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-accent' : ''}
      >
        <ListOrdered className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'bg-accent' : ''}
      >
        <Quote className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'bg-accent' : ''}
      >
        <Code className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button type="button" variant="ghost" size="icon" onClick={addYoutubeVideo}>
        <YoutubeIcon className="w-4 h-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={addImage}>
        <ImageIcon className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) editor.commands.setLink({ href: url });
        }}
        className={editor.isActive('link') ? 'bg-accent' : ''}
      >
        <LinkIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};

export const Notes = () => {
  const { api, user, refreshUser } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNote, setSelectedNote] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Labels State
  const [customLabels, setCustomLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [isAddLabelOpen, setIsAddLabelOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['general']);
  const [editingNote, setEditingNote] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      Image,
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: { class: 'youtube-video' },
        controls: true
      }),
      Placeholder.configure({ placeholder: 'Write something amazing...' })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4'
      }
    },
    editable: true,
  });

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
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Sync custom labels from user profile
  useEffect(() => {
    if (user?.custom_note_labels) {
      setCustomLabels(user.custom_note_labels);
    }
  }, [user]);

  const handleAddLabel = async (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    const updatedLabels = [...customLabels, newLabelName.trim()];

    try {
      await api.put('/auth/labels', { labels: updatedLabels });
      await refreshUser();
      setNewLabelName('');
      setIsAddLabelOpen(false);
      toast.success('Label created');
    } catch (error) {
      toast.error('Failed to create label');
    }
  };

  const handleDeleteLabel = async (labelToDelete) => {
    const updatedLabels = customLabels.filter(l => l !== labelToDelete);
    try {
      await api.put('/auth/labels', { labels: updatedLabels });
      await refreshUser();
      if (activeTab === labelToDelete) setActiveTab('all');
      toast.success('Label deleted');
    } catch (error) {
      toast.error('Failed to delete label');
    }
  }

  const getCategoryStyles = (catValue) => {
    const defaultCat = DEFAULT_CATEGORIES.find(c => c.value === catValue);
    if (defaultCat) return defaultCat;

    return {
      label: catValue,
      icon: Tag,
      color: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
    };
  };

  const toggleCategory = (catValue) => {
    setSelectedCategories(prev =>
      prev.includes(catValue)
        ? prev.filter(c => c !== catValue)
        : [...prev, catValue]
    );
  };

  const resetForm = () => {
    setTitle('');
    setSelectedCategories(['general']);
    setEditingNote(null);
    editor?.commands.setContent('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editor || editor.isEmpty) {
      toast.error('Please add some content to your note');
      return;
    }

    const noteData = {
      title,
      content: editor?.getHTML() || '',
      categories: selectedCategories,
      is_favorite: editingNote?.is_favorite || false
    };

    try {
      if (editingNote) {
        await api.put(`/notes/${editingNote.id}`, noteData);
        toast.success('Note updated!');
      } else {
        await api.post('/notes', noteData);
        toast.success('Note created! +5 XP');
      }
      fetchNotes();
      setDialogOpen(false);
      setSelectedNote(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  /* ... handleDelete, toggleFavorite ... */
  const handleDelete = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
      toast.success('Note deleted');
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleToggleFavorite = async (note) => {
    try {
      const updatedNote = { ...note, is_favorite: !note.is_favorite };
      await api.put(`/notes/${note.id}`, { is_favorite: updatedNote.is_favorite });
      setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
      if (selectedNote?.id === note.id) {
        setSelectedNote(updatedNote);
      }
      toast.success(updatedNote.is_favorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setSelectedCategories(note.categories || ['general']);
    editor?.commands.setContent(note.content || '');
    setDialogOpen(true);
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
  };

  const filteredNotes = notes.filter(note => {
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'favorites' && note.is_favorite) ||
      (note.categories && note.categories.includes(activeTab));
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const NoteCard = ({ note }) => {
    const config = getCategoryStyles(note.category);
    const Icon = config.icon;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`group p-4 rounded-xl border transition-all duration-200 cursor-pointer ${selectedNote?.id === note.id
          ? 'bg-primary/10 border-primary/30'
          : 'bg-card border-border/50 hover:border-primary/30'
          }`}
        onClick={() => handleSelectNote(note)}
        data-testid={`note-card-${note.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {note.is_favorite && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
              <p className="font-medium truncate">{note.title}</p>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {note.content?.replace(/<[^>]*>/g, '').slice(0, 100) || 'No content'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {(note.categories || ['general']).map(cat => {
                const config = getCategoryStyles(cat);
                const Icon = config.icon;
                return (
                  <Badge key={cat} variant="outline" className={config.color}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                );
              })}
              <span className="text-xs text-muted-foreground">
                {(() => {
                  try {
                    return format(new Date(note.updated_at), 'MMM d, yyyy');
                  } catch (e) {
                    return '';
                  }
                })()}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`note-menu-${note.id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleFavorite(note); }}>
                {note.is_favorite ? <StarOff className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2" />}
                {note.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(note); }}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notes-page">

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="note-search-input"
        />
      </div>

      {/* Tabs and Add Note Button */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex items-center">
            <TabsTrigger value="all" data-testid="notes-tab-all">All</TabsTrigger>
            <TabsTrigger value="favorites" data-testid="notes-tab-favorites">
              <Star className="w-4 h-4 mr-1 hidden sm:inline" />
              Favorites
            </TabsTrigger>

            {DEFAULT_CATEGORIES.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value} data-testid={`notes-tab-${cat.value}`}>
                {cat.label}
              </TabsTrigger>
            ))}

            {customLabels.map(label => (
              <TabsTrigger key={label} value={label} className="group relative pr-6">
                {label}
                <X
                  className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-destructive transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handleDeleteLabel(label); }}
                />
              </TabsTrigger>
            ))}

            <Button variant="ghost" size="sm" className="px-2 h-7 ml-1" onClick={() => setIsAddLabelOpen(true)} title="Add Label">
              <Plus className="w-4 h-4" />
            </Button>
          </TabsList>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 w-full lg:w-auto" data-testid="add-note-btn">
              <Plus className="w-4 h-4" /> New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="note-title">Title</Label>
                  <Input
                    id="note-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title"
                    required
                    data-testid="note-title-input"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Labels</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start gap-2 h-auto py-2 px-3 min-h-[42px] border-border bg-muted/20 hover:bg-muted/30 transition-colors">
                        {selectedCategories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedCategories.map(cat => {
                              const config = getCategoryStyles(cat);
                              return (
                                <Badge key={cat} variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
                                  {config.label}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Select labels...</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[300px]" align="start">
                      <div className="p-2 text-xs font-semibold text-muted-foreground border-b border-border/50 mb-1">
                        Select Categories
                      </div>
                      <ScrollArea className="h-[200px]">
                        {DEFAULT_CATEGORIES.map(cat => (
                          <DropdownMenuItem
                            key={cat.value}
                            onClick={(e) => { e.preventDefault(); toggleCategory(cat.value); }}
                            className="flex items-center justify-between py-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <cat.icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{cat.label}</span>
                            </div>
                            {selectedCategories.includes(cat.value) && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </DropdownMenuItem>
                        ))}
                        {customLabels.length > 0 && <DropdownMenuSeparator />}
                        {customLabels.map(label => (
                          <DropdownMenuItem
                            key={label}
                            onClick={(e) => { e.preventDefault(); toggleCategory(label); }}
                            className="flex items-center justify-between py-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{label}</span>
                            </div>
                            {selectedCategories.includes(label) && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </ScrollArea>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setIsAddLabelOpen(true)}
                        className="py-2 cursor-pointer text-primary focus:text-primary font-medium"
                      >
                        <Plus className="w-4 h-4 mr-2" /> New Label
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <EditorToolbar editor={editor} />
                  <EditorContent editor={editor} data-testid="note-content-editor" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-violet-600 to-indigo-600" data-testid="note-submit-btn">
                  {editingNote ? 'Update' : 'Create'} Note
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>


      {/* Notes Content */}
      <div className="relative min-h-[600px]">
        <AnimatePresence mode="wait" initial={false}>
          {!selectedNote ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {filteredNotes.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No notes found</p>
                    <p className="text-sm text-muted-foreground/70 mb-4">
                      Create your first note to get started
                    </p>
                    <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" /> Create Note
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[700px] pr-4">
                  <AnimatePresence mode="popLayout">
                    {filteredNotes.map(note => (
                      <div key={note.id} className="mb-3">
                        <NoteCard note={note} />
                      </div>
                    ))}
                  </AnimatePresence>
                </ScrollArea>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="min-h-[600px]" data-testid="note-preview">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedNote(null)}
                        className="h-8 w-8"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <CardTitle className="text-xl">{selectedNote.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFavorite(selectedNote)}
                        data-testid="note-preview-favorite-btn"
                      >
                        {selectedNote.is_favorite ? (
                          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        ) : (
                          <StarOff className="w-5 h-5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(selectedNote)}
                        data-testid="note-preview-edit-btn"
                      >
                        <Edit className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 pl-11">
                    <p className="text-sm text-muted-foreground">
                      Last updated: {(() => {
                        try {
                          return format(new Date(selectedNote.updated_at), 'MMM d, yyyy h:mm a');
                        } catch (e) {
                          return 'N/A';
                        }
                      })()}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedNote.categories || ['general']).map(cat => {
                        const config = getCategoryStyles(cat);
                        const Icon = config.icon;
                        return (
                          <Badge key={cat} variant="outline" className={config.color}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[600px] px-11">
                    <div
                      className="tiptap prose prose-invert max-w-none pb-20"
                      dangerouslySetInnerHTML={{ __html: selectedNote.content || '<p>No content</p>' }}
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Add Label Dialog */}
      <Dialog open={isAddLabelOpen} onOpenChange={setIsAddLabelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Label</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLabel} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="label-name">Label Name</Label>
              <Input
                id="label-name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="e.g. Work, Ideas"
                required
                maxLength={20}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddLabelOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                Create Label
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
