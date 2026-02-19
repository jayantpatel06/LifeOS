import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus, Calendar, Clock, Tag, MoreVertical, Trash2, Edit,
  CheckCircle2, Circle, Flame, Zap, Target, ListTodo, CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const categoryConfig = {
  daily: { label: 'Daily', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CalendarDays },
  weekly: { label: 'Weekly', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Calendar },
  high_priority: { label: 'High Priority', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Flame },
};

const priorityLabels = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export const Tasks = () => {
  const { api } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('daily');
  const [priority, setPriority] = useState('2');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('daily');
    setPriority('2');
    setEstimatedTime('');
    setDueDate('');
    setEditingTask(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const taskData = {
      title,
      description,
      category,
      priority: parseInt(priority),
      estimated_time: estimatedTime ? parseInt(estimatedTime) : null,
      due_date: dueDate || null,
      tags: []
    };

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, taskData);
        toast.success('Task updated!');
      } else {
        await api.post('/tasks', taskData);
        toast.success('Task created! +5 XP');
      }
      fetchTasks();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save task');
    }
  };

  const handleComplete = async (task) => {
    try {
      await api.patch(`/tasks/${task.id}/complete`);
      toast.success('Task completed! Great job!', {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      });
      fetchTasks();
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleReopen = async (task) => {
    try {
      await api.put(`/tasks/${task.id}`, { status: 'pending' });
      toast.success('Task reopened');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to reopen task');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category);
    setPriority(task.priority.toString());
    setEstimatedTime(task.estimated_time?.toString() || '');
    setDueDate(task.due_date || '');
    setDialogOpen(true);
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return task.status !== 'completed';
    if (activeTab === 'completed') return task.status === 'completed';
    return task.category === activeTab && task.status !== 'completed';
  });

  const TaskCard = ({ task }) => {
    const config = categoryConfig[task.category] || categoryConfig.daily;
    const Icon = config.icon;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`group p-4 rounded-xl border transition-all duration-200 ${task.status === 'completed'
          ? 'bg-muted/30 border-border/30'
          : 'bg-card border-border/50 hover:border-primary/30'
          } ${task.priority === 3 && task.status !== 'completed' ? 'border-l-4 border-l-red-500' : ''}`}
        data-testid={`task-card-${task.id}`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => task.status === 'completed' ? handleReopen(task) : handleComplete(task)}
            className="mt-1 flex-shrink-0"
            data-testid={`task-complete-btn-${task.id}`}
          >
            {task.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 hover:text-emerald-400 transition-colors" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </p>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`task-menu-${task.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(task)} data-testid={`task-edit-${task.id}`}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(task.id)}
                    className="text-destructive"
                    data-testid={`task-delete-${task.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="outline" className={config.color}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>

              {task.estimated_time && (
                <Badge variant="outline" className="bg-muted/50">
                  <Clock className="w-3 h-3 mr-1" />
                  {task.estimated_time}min
                </Badge>
              )}

              {task.due_date && (
                <Badge variant="outline" className="bg-muted/50">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(new Date(task.due_date), 'MMM d')}
                </Badge>
              )}

              <Badge
                variant="outline"
                className={
                  task.priority === 3 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    task.priority === 2 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-green-500/20 text-green-400 border-green-500/30'
                }
              >
                {priorityLabels[task.priority]}
              </Badge>
            </div>
          </div>
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
    <div className="space-y-4" data-testid="tasks-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tasks.filter(t => t.status !== 'completed').length} tasks remaining
        </p>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600" data-testid="add-task-btn">
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                  data-testid="task-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={3}
                  data-testid="task-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="task-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="high_priority">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger data-testid="task-priority-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Low</SelectItem>
                      <SelectItem value="2">Medium</SelectItem>
                      <SelectItem value="3">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedTime">Time (minutes)</Label>
                  <Input
                    id="estimatedTime"
                    type="number"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="30"
                    data-testid="task-time-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    data-testid="task-date-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-violet-600 to-indigo-600" data-testid="task-submit-btn">
                  {editingTask ? 'Update' : 'Create'} Task
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="all" data-testid="tab-all">
            <ListTodo className="w-4 h-4 mr-2 hidden sm:inline" />
            All
          </TabsTrigger>
          <TabsTrigger value="daily" data-testid="tab-daily">
            <CalendarDays className="w-4 h-4 mr-2 hidden sm:inline" />
            Daily
          </TabsTrigger>
          <TabsTrigger value="weekly" data-testid="tab-weekly">
            <Calendar className="w-4 h-4 mr-2 hidden sm:inline" />
            Weekly
          </TabsTrigger>
          <TabsTrigger value="high_priority" data-testid="tab-high-priority">
            <Flame className="w-4 h-4 mr-2 hidden sm:inline" />
            Priority
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            <CheckCircle2 className="w-4 h-4 mr-2 hidden sm:inline" />
            Done
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {filteredTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No tasks here</p>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  {activeTab === 'completed' ? 'Complete some tasks to see them here' : 'Add a task to get started'}
                </p>
                {activeTab !== 'completed' && (
                  <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Task
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};
