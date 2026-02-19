import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import {
  Plus, Calendar, Clock, Edit, Trash2,
  CheckCircle2, Circle, Flame, CalendarDays, Palette, X,
  ListChecks, Square, CheckSquare, ChevronDown, ChevronRight, RotateCcw, GripVertical, Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Separator } from '../components/ui/separator';

// DnD Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLORS = [
  { id: 'default', bg: 'bg-card', border: 'border-border/50', label: 'Default' },
  { id: 'red', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Red' },
  { id: 'orange', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Orange' },
  { id: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Amber' },
  { id: 'green', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Green' },
  { id: 'teal', bg: 'bg-teal-500/10', border: 'border-teal-500/20', label: 'Teal' },
  { id: 'blue', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Blue' },
  { id: 'indigo', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', label: 'Indigo' },
  { id: 'purple', bg: 'bg-violet-500/10', border: 'border-violet-500/20', label: 'Purple' },
  { id: 'pink', bg: 'bg-pink-500/10', border: 'border-pink-500/20', label: 'Pink' },
];

// Sortable Checklist Item Component
const SortableChecklistItem = ({ id, item, idx, onToggle, onChange, onRemove, completed }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group active:cursor-grabbing">
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground/50 hover:text-foreground">
        <GripVertical className="w-4 h-4" />
      </div>
      <button type="button" onClick={() => onToggle(idx)}>
        {item.completed ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
      </button>
      <Input
        value={item.text}
        onChange={(e) => onChange(idx, e.target.value)}
        className={cn("h-8 bg-transparent border-none shadow-none focus-visible:ring-0 text-base", item.completed && "line-through text-muted-foreground")}
      />
      <button type="button" onClick={() => onRemove(idx)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
    </div>
  );
};

// Standard Task Card Component (No DnD)
const TaskCard = ({ task, onClick, onColorUpdate, onDelete, onEdit, onReset, onToggleItem, onPin }) => {
  const colorConfig = COLORS.find(c => c.bg === task.color) || COLORS[0];
  const checklist = task.checklist || [];
  // Show ALL active items
  const activeItems = checklist.filter(i => !i.completed);
  const completedItems = checklist.filter(i => i.completed);

  return (
    <div className="mb-6 break-inside-avoid">
      <div
        className={cn(
          "group relative rounded-xl border transition-all duration-200 overflow-hidden hover:shadow-md flex flex-col",
          colorConfig.bg,
          colorConfig.border
        )}
      >
        {/* Action Overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10" onPointerDown={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full backdrop-blur-sm", task.is_pinned ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-background/50 hover:bg-background/80 text-muted-foreground")} onClick={() => onPin(task)}>
            <Pin className={cn("w-3.5 h-3.5", task.is_pinned && "fill-current")} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-sm">
                <Palette className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
                {COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onColorUpdate(task, c.id)}
                    className={cn("w-5 h-5 rounded-full border border-border/50", c.bg)}
                    title={c.label}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-sm" onClick={() => onEdit(task)}>
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-sm" onClick={() => onReset(task)}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/50 hover:bg-destructive/10 hover:text-destructive backdrop-blur-sm" onClick={() => onDelete(task.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="p-4 flex-1">
          <h3 className="font-semibold text-xl mb-3 break-words pr-8 flex items-center gap-2">
            {task.title}
          </h3>
          <Separator className="mb-2" />
          <div className="space-y-1">
            {activeItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleItem(task, item); }}
                  className="mt-1 text-muted-foreground/80 hover:text-primary transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
                >
                  <Square className="w-5 h-5" />
                </button>
                <span className="text-base leading-relaxed break-words text-foreground/90 font-medium">{item.text}</span>
              </div>
            ))}

            {!task.checklist?.length && task.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{task.description}</p>
            )}
          </div>

          {completedItems.length > 0 && (
            <div className="mt-4 pt-2 border-t border-border/10">
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                  <ChevronDown className="w-4 h-4" />
                  {completedItems.length} Completed
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-2 pl-2 border-l-2 border-border/30 ml-1.5">
                  {completedItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-muted-foreground/60">
                      <CheckCircle2 className="w-3 h-3 mt-1.5 shrink-0" />
                      <span className="text-base line-through break-words decoration-muted-foreground/40">{item.text}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Tasks = () => {
  const { isSidebarCollapsed } = useOutletContext() || { isSidebarCollapsed: false };
  const { api } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Quick Add State
  const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickColor, setQuickColor] = useState('default');
  const [checklistItems, setChecklistItems] = useState([{ text: '', completed: false }]);

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('default');
  const [editChecklistItems, setEditChecklistItems] = useState([]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // Require 8px movement to start drag
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchTasks = useCallback(async () => {
    try {
      const response = await api.get('/tasks');
      // Keep position sorting for stability, but we removed drag
      const tasksWithPos = response.data.map((t, i) => ({ ...t, position: t.position ?? i }));
      setTasks(tasksWithPos.sort((a, b) => a.position - b.position));
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // --- Handlers for Quick Add & Basic Ops ---

  const handleChecklistItemChange = (index, value) => {
    const newItems = [...checklistItems];
    newItems[index].text = value;
    setChecklistItems(newItems);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newItems = [...checklistItems];
      if (index === -1) {
        // From Title
        newItems.push({ text: '', completed: false });
      } else {
        // From Item
        newItems.splice(index + 1, 0, { text: '', completed: false });
      }
      setChecklistItems(newItems);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const validItems = checklistItems.filter(i => i.text.trim() !== '');
    if (!quickTitle.trim() && validItems.length === 0) return;

    const taskData = {
      title: quickTitle || 'Untitled List',
      checklist: validItems,
      color: COLORS.find(c => c.id === quickColor)?.bg || 'bg-card',
      category: 'daily',
      priority: 2,
      position: tasks.length // Append to end
    };

    try {
      await api.post('/tasks', taskData);
      toast.success('List created!');
      setQuickTitle('');
      setQuickColor('default');
      setChecklistItems([{ text: '', completed: false }]);
      setIsQuickAddExpanded(false);
      fetchTasks();
    } catch (error) {
      toast.error('Failed to create list');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingTask) return;

    const taskData = {
      title: editTitle,
      color: COLORS.find(c => c.id === editColor)?.bg || 'bg-card',
      checklist: editChecklistItems.filter(i => i.text.trim() !== '')
    };

    try {
      await api.put(`/tasks/${editingTask.id}`, taskData);
      toast.success('List updated!');
      setDialogOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update list');
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('List deleted');
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      toast.error('Failed to delete list');
    }
  };

  // --- Handlers for Edit Dialog ---

  const handleEditClick = (task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditChecklistItems((task.checklist || []).map((item, idx) => ({ ...item, id: `item-${idx}-${Date.now()}` })));
    const colorObj = COLORS.find(c => c.bg === task.color) || COLORS[0];
    setEditColor(colorObj.id);
    setDialogOpen(true);
  };

  const handleEditChecklistItemChange = (index, value) => {
    const newItems = [...editChecklistItems];
    newItems[index].text = value;
    setEditChecklistItems(newItems);
  };

  const handleEditChecklistAdd = () => {
    setEditChecklistItems([...editChecklistItems, { text: '', completed: false, id: `new-${Date.now()}` }]);
  };

  const handleEditChecklistRemove = (index) => {
    const newItems = [...editChecklistItems];
    newItems.splice(index, 1);
    setEditChecklistItems(newItems);
  };

  const handleEditChecklistToggle = (index) => {
    const newItems = [...editChecklistItems];
    newItems[index].completed = !newItems[index].completed;
    setEditChecklistItems(newItems);
  };

  const handlePin = async (task) => {
    const newPinned = !task.is_pinned;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_pinned: newPinned } : t));
    try {
      await api.put(`/tasks/${task.id}`, { is_pinned: newPinned });
      toast.success(newPinned ? 'Task pinned' : 'Task unpinned');
    } catch (error) {
      fetchTasks();
      toast.error('Failed to update pin status');
    }
  };

  const handleColorUpdate = async (task, colorId) => {
    const colorObj = COLORS.find(c => c.id === colorId);
    if (!colorObj) return;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, color: colorObj.bg } : t));
    try { await api.put(`/tasks/${task.id}`, { color: colorObj.bg }); } catch (error) { fetchTasks(); }
  };

  const handleReset = async (task) => {
    if (!task.checklist || task.checklist.length === 0) return;
    const newChecklist = task.checklist.map(item => ({ ...item, completed: false }));
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, checklist: newChecklist } : t));
    try { await api.put(`/tasks/${task.id}`, { checklist: newChecklist }); toast.success('List reset!'); } catch (error) { fetchTasks(); toast.error('Failed to reset list'); }
  };

  const handleToggleItem = async (task, itemToToggle) => {
    if (!task.checklist) return;
    const newChecklist = task.checklist.map(i => i === itemToToggle ? { ...i, completed: !i.completed } : i);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, checklist: newChecklist } : t));
    try { await api.put(`/tasks/${task.id}`, { checklist: newChecklist }); } catch (error) { fetchTasks(); }
  };

  // --- Drag and Drop Handlers (Checklist Only) ---

  const handleDragEndChecklist = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setEditChecklistItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (loading) return <div className="flex justify-center h-96"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const quickAddColorClass = COLORS.find(c => c.id === quickColor)?.bg || 'bg-card';

  return (
    <div className="space-y-6 w-full p-4" data-testid="tasks-page">
      {/* Quick Add Input */}
      <div className="max-w-xl mx-auto w-full relative z-20">
        <div className={cn(quickAddColorClass, "border border-border rounded-xl shadow-sm transition-all duration-200 overflow-hidden", isQuickAddExpanded ? "shadow-lg ring-1 ring-primary/20" : "hover:shadow-md")}>
          {!isQuickAddExpanded ? (
            <div
              className="p-3 px-4 flex items-center gap-3 cursor-text text-muted-foreground font-medium"
              onClick={() => setIsQuickAddExpanded(true)}
            >
              <Plus className="w-5 h-5" />
              <span>Create a new list...</span>
            </div>
          ) : (
            <form onSubmit={handleQuickAdd} className="p-4 space-y-3">
              <Input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Title"
                className="border-none shadow-none text-xl font-semibold px-0 focus-visible:ring-0 h-auto py-0 bg-transparent placeholder:text-muted-foreground/50"
                autoFocus
                onKeyDown={(e) => handleKeyDown(e, -1)}
              />

              <div className="space-y-2">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <Square className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    <Input
                      value={item.text}
                      onChange={(e) => handleChecklistItemChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      placeholder="List item"
                      className="border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent text-base"
                      autoFocus={idx === checklistItems.length - 1 && item.text === '' && checklistItems.length > 1}
                    />
                    <button type="button" onClick={() => { const newItems = [...checklistItems]; newItems.splice(idx, 1); setChecklistItems(newItems); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground cursor-pointer transition-colors" onClick={() => { setChecklistItems([...checklistItems, { text: '', completed: false }]); }}>
                  <Plus className="w-4 h-4" /> <span className="text-base">List item</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Palette className="w-4 h-4 text-muted-foreground" /></Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="flex gap-1">
                        {COLORS.map(c => (
                          <button key={c.id} type="button" onClick={() => setQuickColor(c.id)} className={cn("w-5 h-5 rounded-full border border-border/50", c.bg, quickColor === c.id && "ring-2 ring-primary")} />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setIsQuickAddExpanded(false); }}>Close</Button>
                  <Button type="submit" size="sm">Save</Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Task Grid - No DnD */}
      {/* Task Grid */}
      {tasks.some(t => t.is_pinned) ? (
        <>
          <div className="mb-10">
            <h6 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 pl-1">Pinned</h6>
            <div className={cn(
              "columns-1 md:columns-2 gap-6 space-y-6 mx-auto",
              isSidebarCollapsed
                ? "lg:columns-3 xl:columns-4"
                : "lg:columns-2 xl:columns-3"
            )}>
              {tasks.filter(t => t.is_pinned).map(task => (
                <TaskCard
                  className="w-full mb-6 break-inside-avoid"
                  key={task.id}
                  task={task}
                  onClick={() => { }}
                  onColorUpdate={handleColorUpdate}
                  onDelete={handleDelete}
                  onEdit={handleEditClick}
                  onReset={handleReset}
                  onToggleItem={handleToggleItem}
                  onPin={handlePin}
                />
              ))}
            </div>
          </div>

          {tasks.some(t => !t.is_pinned) && (
            <div>
              <h6 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 pl-1">Others</h6>
              <div className={cn(
                "columns-1 md:columns-2 gap-6 space-y-6 mx-auto",
                isSidebarCollapsed
                  ? "lg:columns-3 xl:columns-4"
                  : "lg:columns-2 xl:columns-3"
              )}>
                {tasks.filter(t => !t.is_pinned).map(task => (
                  <TaskCard
                    className="w-full mb-6 break-inside-avoid"
                    key={task.id}
                    task={task}
                    onClick={() => { }}
                    onColorUpdate={handleColorUpdate}
                    onDelete={handleDelete}
                    onEdit={handleEditClick}
                    onReset={handleReset}
                    onToggleItem={handleToggleItem}
                    onPin={handlePin}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={cn(
          "columns-1 md:columns-2 gap-6 space-y-6 mx-auto",
          isSidebarCollapsed
            ? "lg:columns-3 xl:columns-4"
            : "lg:columns-2 xl:columns-3"
        )}>
          {tasks.map(task => (
            <TaskCard
              className="w-full mb-6 break-inside-avoid"
              key={task.id}
              task={task}
              onClick={() => { }}
              onColorUpdate={handleColorUpdate}
              onDelete={handleDelete}
              onEdit={handleEditClick}
              onReset={handleReset}
              onToggleItem={handleToggleItem}
              onPin={handlePin}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      < Dialog open={dialogOpen} onOpenChange={setDialogOpen} >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Edit List</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-2">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="text-xl font-semibold" required />

            <div className="max-h-[50vh] overflow-y-auto pr-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndChecklist}
              >
                <SortableContext
                  items={editChecklistItems.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {editChecklistItems.map((item, idx) => (
                      <SortableChecklistItem
                        key={item.id}
                        id={item.id}
                        item={item}
                        idx={idx}
                        onToggle={handleEditChecklistToggle}
                        onChange={handleEditChecklistItemChange}
                        onRemove={handleEditChecklistRemove}
                        completed={item.completed}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <Button type="button" variant="ghost" size="sm" onClick={handleEditChecklistAdd} className="w-full justify-start text-muted-foreground mt-2"><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
