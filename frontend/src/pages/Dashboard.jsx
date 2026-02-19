import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import {
  Flame, CheckSquare, FileText, Timer,
  Calendar, Target, Award, ChevronRight, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export const Dashboard = () => {
  const { user, api, refreshUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('☀️');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [tasksRes, habitsRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/habits')
        ]);
        setTasks(tasksRes.data || []);
        setHabits(habitsRes.data || []);
        refreshUser();
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [api, refreshUser]);


  // Get today's tasks (pending first, then completed, limit to 4)
  const todaysTasks = tasks
    .sort((a, b) => {
      // Pending tasks first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      // Then by priority
      return b.priority - a.priority;
    })
    .slice(0, 4);

  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;

  // Priority/category colors
  const getPriorityColor = (priority) => {
    if (priority >= 3) return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    if (priority === 2) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const getPriorityLabel = (priority) => {
    if (priority >= 3) return 'High';
    if (priority === 2) return 'Medium';
    return 'Low';
  };

  const getCategoryColor = (category) => {
    const colors = {
      daily: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      weekly: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      goal: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return colors[category] || 'bg-muted/30 text-muted-foreground border-border/50';
  };

  const toggleTaskComplete = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      refreshUser();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const toggleHabitComplete = async (habitId, currentlyCompleted) => {
    try {
      const newCompleted = !currentlyCompleted;
      await api.put(`/habits/${habitId}`, { is_completed: newCompleted });
      setHabits(habits.map(h => h.id === habitId ? { ...h, is_completed: newCompleted } : h));
      refreshUser();
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    }
  };

  const completedHabitsCount = habits.filter(h => h.is_completed).length;

  const createHabit = async () => {
    if (!newHabitTitle.trim()) return;
    try {
      const res = await api.post('/habits', {
        title: newHabitTitle.trim(),
        icon: newHabitIcon || '☀️'
      });
      setHabits([...habits, res.data]);
      setNewHabitTitle('');
      setNewHabitIcon('☀️');
      setHabitDialogOpen(false);
    } catch (error) {
      console.error('Failed to create habit:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
        <Link to="/tasks">
          <Button size="sm" className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20" data-testid="quick-add-task-btn">
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </Link>
      </div>



      {/* Tasks and Habits Preview - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Tasks Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="border-violet-500/20 bg-gradient-to-br from-card to-violet-950/10 shadow-lg shadow-violet-900/5 h-full" data-testid="quick-tasks-preview">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Tasks</CardTitle>
                <span className="text-sm text-emerald-500 font-semibold">
                  {completedTasksCount}/{completedTasksCount + pendingTasksCount}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {todaysTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>
              ) : (
                todaysTasks.map((task) => (
                  <div key={task.id} className={`flex items-center justify-between py-2 border-b border-border/30 last:border-0 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => toggleTaskComplete(task.id, task.status)}
                        className="border-emerald-500/50 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <span className={`text-sm truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(task.category)}`}>
                        {task.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <Link to="/tasks" className="block pt-2">
                <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  View all tasks
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Habits Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-emerald-500/20 bg-gradient-to-br from-card to-emerald-950/10 shadow-lg shadow-emerald-900/5 h-full" data-testid="habits-preview">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Today's Habits</CardTitle>
                <span className="text-sm text-emerald-500 font-semibold">
                  {completedHabitsCount}/{habits.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {habits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No habits yet</p>
              ) : (
                habits.map((habit) => (
                  <div key={habit.id} className={`flex items-center justify-between py-2 border-b border-border/30 last:border-0 ${habit.is_completed ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={habit.is_completed}
                        onCheckedChange={() => toggleHabitComplete(habit.id, habit.is_completed)}
                        className="border-emerald-500/50 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <span className="text-lg mr-1">{habit.icon}</span>
                      <span className={`text-sm truncate ${habit.is_completed ? 'line-through text-muted-foreground' : ''}`}>{habit.title}</span>
                    </div>
                    {habit.current_streak > 0 && (
                      <div className="flex items-center gap-1 text-orange-500 shrink-0 ml-2">
                        <Flame className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">{habit.current_streak}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              <Dialog open={habitDialogOpen} onOpenChange={setHabitDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-center text-muted-foreground hover:text-foreground mt-2 gap-2">
                    <Plus className="w-4 h-4" />
                    Add habit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Habit</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-3">
                      <Input
                        value={newHabitIcon}
                        onChange={(e) => setNewHabitIcon(e.target.value)}
                        placeholder="☀️"
                        className="w-16 text-center text-xl"
                        maxLength={2}
                      />
                      <Input
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="Habit name..."
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && createHabit()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setHabitDialogOpen(false)}>Cancel</Button>
                    <Button onClick={createHabit} disabled={!newHabitTitle.trim()}>Create Habit</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>
      </div>


      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link to="/tasks">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group" data-testid="quick-tasks-card">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <CheckSquare className="w-6 h-6 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Tasks</p>
                    <p className="text-sm text-muted-foreground">Manage your tasks</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link to="/notes">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group" data-testid="quick-notes-card">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Notes</p>
                    <p className="text-sm text-muted-foreground">View your notes</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link to="/achievements">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group" data-testid="quick-achievements-card">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Achievements</p>
                    <p className="text-sm text-muted-foreground">View your progress</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};
