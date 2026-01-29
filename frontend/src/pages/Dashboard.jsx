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
import { format, subDays, parseISO, startOfYear, eachDayOfInterval } from 'date-fns';

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

  // Generate contribution grid data
  const generateContributionData = () => {
    const today = new Date();
    const yearStart = subDays(today, 365);
    const allDays = eachDayOfInterval({ start: yearStart, end: today });

    const activityMap = {};
    activityData.forEach(day => {
      activityMap[day.date] = day.tasks_completed + Math.floor(day.focus_time / 25);
    });

    return allDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = activityMap[dateStr] || 0;
      let level = 0;
      if (count > 0) level = 1;
      if (count >= 3) level = 2;
      if (count >= 5) level = 3;
      if (count >= 8) level = 4;

      return { date: dateStr, count, level };
    });
  };

  const contributionData = generateContributionData();

  // Group by weeks for grid display
  const weeks = [];
  let currentWeek = [];
  contributionData.forEach((day, index) => {
    const dayOfWeek = new Date(day.date).getDay();
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const totalContributions = contributionData.reduce((sum, d) => sum + d.count, 0);

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
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Level {user?.current_level || 1}</p>
                  <p className="text-4xl font-bold font-mono mt-1">{user?.total_xp || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">XP</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center glow-primary">
                  <Zap className="w-8 h-8 text-violet-500" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress to Level {(user?.current_level || 1) + 1}</span>
                  <span>{xpForNextLevel()} XP needed</span>
                </div>
                <Progress value={xpProgress()} className="h-2" />
              </div>
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
            <CardContent className="p-6">
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
            <CardContent className="p-6">
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
        <Card data-testid="contribution-grid-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-['Outfit']">Activity</CardTitle>
                <CardDescription>{totalContributions} contributions this year</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className={`w-3 h-3 rounded-sm contribution-cell level-${level}`}
                    />
                  ))}
                </div>
                <span>More</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-2">
              <TooltipProvider>
                <div className="flex gap-1" style={{ minWidth: 'max-content' }}>
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                        const day = week.find(d => new Date(d.date).getDay() === dayIndex);
                        if (!day) return <div key={dayIndex} className="w-3 h-3" />;

                        return (
                          <Tooltip key={day.date}>
                            <TooltipTrigger>
                              <div
                                className={`w-3 h-3 rounded-sm contribution-cell level-${day.level} hover:ring-1 hover:ring-primary transition-all cursor-pointer`}
                                data-testid={`contribution-cell-${day.date}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">{day.count} contributions</p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(day.date), 'MMM d, yyyy')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </TooltipProvider>
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
                      {stats?.weekly_completion_rate || 0}% completion this week
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
