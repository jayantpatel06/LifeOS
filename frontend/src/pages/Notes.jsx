import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Plus, FileText, BookOpen, Wallet, Zap, MoreVertical, Trash2, Edit, Star, StarOff,
  Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2,
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon, File, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const categoryConfig = {
  study: { label: 'Study', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: BookOpen },
  budget: { label: 'Budget', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Wallet },
  general: { label: 'General', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: FileText },
  quick: { label: 'Quick', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Zap },
};

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

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const ToolbarButton = ({ onClick, isActive, children, title }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-8 w-8 transition-colors ${isActive
          ? 'bg-cyan-500/20 text-cyan-400'
          : 'text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10'
        }`}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30 rounded-t-lg">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Code"
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-border mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-border mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-border mx-1" />

      <ToolbarButton onClick={addLink} title="Add Link">
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addImage} title="Add Image">
        <ImageIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addYoutubeVideo} title="Add YouTube Video">
        <YoutubeIcon className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
};

export const Notes = () => {
  const { api } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNote, setSelectedNote] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [editingNote, setEditingNote] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: { class: 'youtube-video' }
      }),
      Placeholder.configure({ placeholder: 'Start writing your note...' })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4'
      }
    }
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

  const resetForm = () => {
    setTitle('');
    setCategory('general');
    setEditingNote(null);
    editor?.commands.setContent('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const noteData = {
      title,
      content: editor?.getHTML() || '',
      category,
      tags: [],
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

  const handleDelete = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      toast.success('Note deleted');
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      fetchNotes();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleToggleFavorite = async (note) => {
    try {
      await api.put(`/notes/${note.id}`, { is_favorite: !note.is_favorite });
      fetchNotes();
      toast.success(note.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setCategory(note.category);
    editor?.commands.setContent(note.content || '');
    setDialogOpen(true);
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
  };

  const filteredNotes = notes.filter(note => {
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'favorites' && note.is_favorite) ||
      note.category === activeTab;
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const NoteCard = ({ note }) => {
    const config = categoryConfig[note.category] || categoryConfig.general;
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
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className={config.color}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(note.updated_at), 'MMM d, yyyy')}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Outfit'] tracking-tight">Notes</h1>
          <p className="text-muted-foreground mt-1">{notes.length} notes</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600" data-testid="add-note-btn">
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

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="note-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="study">Study</SelectItem>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="quick">Quick</SelectItem>
                    </SelectContent>
                  </Select>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="all" data-testid="notes-tab-all">All</TabsTrigger>
          <TabsTrigger value="favorites" data-testid="notes-tab-favorites">
            <Star className="w-4 h-4 mr-1 hidden sm:inline" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="study" data-testid="notes-tab-study">Study</TabsTrigger>
          <TabsTrigger value="budget" data-testid="notes-tab-budget">Budget</TabsTrigger>
          <TabsTrigger value="general" data-testid="notes-tab-general">General</TabsTrigger>
          <TabsTrigger value="quick" data-testid="notes-tab-quick">Quick</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes List */}
        <div className="space-y-3">
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
            <ScrollArea className="h-[600px] pr-4">
              <AnimatePresence mode="popLayout">
                {filteredNotes.map(note => (
                  <div key={note.id} className="mb-3">
                    <NoteCard note={note} />
                  </div>
                ))}
              </AnimatePresence>
            </ScrollArea>
          )}
        </div>

        {/* Note Preview */}
        <div className="hidden lg:block">
          {selectedNote ? (
            <Card className="sticky top-6" data-testid="note-preview">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{selectedNote.title}</CardTitle>
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
                <p className="text-sm text-muted-foreground">
                  Last updated: {format(new Date(selectedNote.updated_at), 'MMM d, yyyy h:mm a')}
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div
                    className="tiptap prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedNote.content || '<p>No content</p>' }}
                  />
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-24">
                <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a note to preview</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
