import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import {
  Flame, Zap, CheckSquare, FileText, Timer, TrendingUp,
  Calendar, Target, Award, ChevronRight, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, subDays, parseISO, startOfYear, eachDayOfInterval, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const Dashboard = () => {
  const { user, api, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/activity?days=365')
        ]);
        setStats(statsRes.data);
        setActivityData(activityRes.data);
        refreshUser();
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [api, refreshUser]);

  // Generate contribution month-by-month data
  const generateMonthData = () => {
    const today = new Date();
    const months = [];

    const activityMap = {};
    activityData.forEach(day => {
      activityMap[day.date] = day.tasks_completed + Math.floor(day.focus_time / 25);
    });

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const monthName = format(monthDate, 'MMM');
      const year = format(monthDate, 'yyyy');

      const monthDays = [];
      const leadingDays = start.getDay();

      // Leading placeholders to align the 1st day to the correct row (weekday)
      for (let j = 0; j < leadingDays; j++) {
        monthDays.push({ type: 'empty' });
      }

      // Actual days
      const daysInMonth = eachDayOfInterval({ start, end });
      daysInMonth.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = activityMap[dateStr] || 0;
        let level = 0;
        if (count > 0) level = 1;
        if (count >= 3) level = 2;
        if (count >= 5) level = 3;
        if (count >= 8) level = 4;

        monthDays.push({ type: 'day', date: dateStr, count, level });
      });

      // Trailing placeholders to complete the last week
      while (monthDays.length % 7 !== 0) {
        monthDays.push({ type: 'empty' });
      }

      months.push({ name: monthName, year, days: monthDays });
    }
    return months;
  };

  const monthsData = generateMonthData();
  const totalSubmissions = activityData.reduce((sum, d) => sum + d.tasks_completed + Math.floor(d.focus_time / 25), 0);
  const totalActiveDays = activityData.filter(d => (d.tasks_completed + d.focus_time) > 0).length;

  const xpForNextLevel = () => {
    const level = user?.current_level || 1;
    const xp = user?.total_xp || 0;
    if (level < 10) return (level + 1) * 100 - xp;
    if (level < 25) return 1000 + (level - 9) * 200 - xp;
    if (level < 50) return 4000 + (level - 24) * 500 - xp;
    return 16500 + (level - 49) * 1000 - xp;
  };

  const xpProgress = () => {
    const level = user?.current_level || 1;
    const xp = user?.total_xp || 0;
    let levelXP, nextLevelXP;

    if (level < 10) {
      levelXP = level * 100;
      nextLevelXP = (level + 1) * 100;
    } else if (level < 25) {
      levelXP = 1000 + (level - 10) * 200;
      nextLevelXP = levelXP + 200;
    } else if (level < 50) {
      levelXP = 4000 + (level - 25) * 500;
      nextLevelXP = levelXP + 500;
    } else {
      levelXP = 16500 + (level - 50) * 1000;
      nextLevelXP = levelXP + 1000;
    }

    return Math.min(100, ((xp - levelXP) / (nextLevelXP - levelXP)) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Outfit'] tracking-tight">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Link to="/tasks">
          <Button className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20" data-testid="quick-add-task-btn">
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-orange-500/40 bg-gradient-to-br from-card to-orange-950/20 shadow-lg shadow-orange-900/10" data-testid="streak-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-4xl font-bold font-mono mt-1">{user?.current_streak || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Best: {user?.longest_streak || 0} days
                  </p>
                </div>
                <div className={`w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center ${user?.current_streak > 0 ? 'glow-fire' : ''}`}>
                  <Flame className={`w-8 h-8 text-orange-500 ${user?.current_streak > 0 ? 'animate-fire' : ''}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* XP Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-violet-500/40 bg-gradient-to-br from-card to-violet-950/20 shadow-lg shadow-violet-900/10" data-testid="xp-card">
            <CardContent className="p-6 pb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Level {user?.current_level || 1}</p>
                  <p className="text-4xl font-bold font-mono tracking-tighter mt-1">
                    {user?.total_xp || 0}<span className="text-lg text-muted-foreground">/{xpForNextLevel() + user?.total_xp}</span>
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center glow-primary shrink-0">
                  <Zap className="w-8 h-8 text-violet-500" />
                </div>
              </div>
              <Progress value={xpProgress()} className="h-2 bg-violet-500/10" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-emerald-500/20 bg-gradient-to-br from-card to-emerald-950/20" data-testid="tasks-today-card">
            <CardContent className="p-6 pb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tasks Today</p>
                  <p className="text-4xl font-bold font-mono mt-1">
                    {stats?.tasks_completed_today || 0}
                    <span className="text-lg text-muted-foreground">/{stats?.tasks_total_today || 0}</span>
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center glow-secondary">
                  <CheckSquare className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
              <Progress
                value={stats?.tasks_total_today > 0 ? (stats?.tasks_completed_today / stats?.tasks_total_today) * 100 : 0}
                className="h-2"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Focus Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-blue-500/20 bg-gradient-to-br from-card to-blue-950/20" data-testid="focus-time-card">
            <CardContent className="p-6 pb-11">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Focus Today</p>
                  <p className="text-4xl font-bold font-mono mt-1">
                    {Math.floor((stats?.focus_time_today || 0) / 60)}
                    <span className="text-lg text-muted-foreground">h </span>
                    {(stats?.focus_time_today || 0) % 60}
                    <span className="text-lg text-muted-foreground">m</span>
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <Timer className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Contribution Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card data-testid="contribution-grid-card" className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardHeader className="pb-2 pt-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight">{totalSubmissions}</span>
                <span className="text-muted-foreground font-medium">submissions in the past one year</span>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <p>Total active days: <span className="text-foreground font-semibold">{totalActiveDays}</span></p>
                <p>Max streak: <span className="text-foreground font-semibold">{user?.longest_streak || 0}</span></p>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 border border-border/50 rounded-lg text-xs font-semibold hover:bg-muted/30 transition-colors cursor-pointer">
                  {new Date().getFullYear()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="py-1">
              <div className="flex justify-between items-start w-full">
                <TooltipProvider>
                  {monthsData.map((month, mIdx) => (
                    <div key={mIdx} className="flex flex-col gap-1 flex-1 max-w-fit">
                      {/* Vertical Grid: 7 Rows for days, flowing into columns for weeks */}
                      <div className="grid grid-rows-7 grid-flow-col gap-1 h-[100px]">
                        {month.days.map((day, dIdx) => (
                          <div key={dIdx} className="w-2.5 h-2.5 flex items-center justify-center">
                            {day.type === 'empty' ? (
                              <div className="w-2 h-2 rounded-sm bg-muted/10 opacity-30" />
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`w-2.5 h-2.5 rounded-sm contribution-cell level-${day.level} hover:opacity-80 transition-all cursor-pointer shadow-sm`}
                                    data-testid={`contribution-cell-${day.date}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-popover/95 backdrop-blur-md border-border shadow-2xl">
                                  <div className="space-y-1">
                                    <p className="font-bold text-[10px]">{day.count} contributions</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {format(parseISO(day.date), 'MMMM d, yyyy')}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Month Label at Bottom */}
                      <p className="text-[15px] font-medium text-muted-foreground text-center">
                        {month.name}
                      </p>
                    </div>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
                    <p className="text-sm text-muted-foreground">
                      {stats?.weekly_completion_rate || 0}% complete this week
                    </p>
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
                    <p className="text-sm text-muted-foreground">{stats?.notes_count || 0} notes created</p>
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
