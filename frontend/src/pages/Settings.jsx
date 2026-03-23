import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCachedFetch } from '../contexts/DataCacheContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';
import {
  User, Flame, Zap, LogOut,
  CheckSquare, Timer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, eachDayOfInterval, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const Settings = () => {
  const { user, api, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cachedSettingsData, cacheLoading] = useCachedFetch('settingsData', async (signal) => {
    const [statsRes, activityRes] = await Promise.all([
      api.get('/dashboard/stats', { signal }),
      api.get('/dashboard/activity?days=365', { signal }),
    ]);

    return {
      activityData: activityRes.data,
      stats: statsRes.data,
    };
  }, [api]);

  useEffect(() => {
    if (cachedSettingsData) {
      setStats(cachedSettingsData.stats);
      setActivityData(cachedSettingsData.activityData);
      setLoading(false);
    } else if (!cacheLoading) {
      setLoading(false);
    }
  }, [cacheLoading, cachedSettingsData]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  // XP helpers
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
    if (level < 10) { levelXP = level * 100; nextLevelXP = (level + 1) * 100; }
    else if (level < 25) { levelXP = 1000 + (level - 10) * 200; nextLevelXP = levelXP + 200; }
    else if (level < 50) { levelXP = 4000 + (level - 25) * 500; nextLevelXP = levelXP + 500; }
    else { levelXP = 16500 + (level - 50) * 1000; nextLevelXP = levelXP + 1000; }
    return Math.min(100, ((xp - levelXP) / (nextLevelXP - levelXP)) * 100);
  };

  /**
   * Contribution Grid Algorithm:
   * Generates 12 months (365 days) of contribution data in a format suitable 
   * for a GitHub-style activity graph.
   * 1. Maps activities by date into a lookup table.
   * 2. Iterates over the last 12 months, figuring out the leading empty days 
   *    needed to align the start of the month to the correct day of the week.
   * 3. Calculates the "level" (0-4) of activity for color coding.
   * 4. Pads the end of the month with empty cells to keep the grid aligned.
   */
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
      const monthDays = [];
      const leadingDays = start.getDay();
      for (let j = 0; j < leadingDays; j++) monthDays.push({ type: 'empty' });
      eachDayOfInterval({ start, end }).forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = activityMap[dateStr] || 0;
        let level = 0;
        if (count > 0) level = 1;
        if (count >= 3) level = 2;
        if (count >= 5) level = 3;
        if (count >= 8) level = 4;
        monthDays.push({ type: 'day', date: dateStr, count, level });
      });
      while (monthDays.length % 7 !== 0) monthDays.push({ type: 'empty' });
      months.push({ name: monthName, days: monthDays });
    }
    return months;
  };

  const monthsData = useMemo(generateMonthData, [activityData]);
  const totalSubmissions = activityData.reduce((sum, d) => sum + d.tasks_completed + Math.floor(d.focus_time / 25), 0);
  const totalActiveDays = activityData.filter(d => (d.tasks_completed + d.focus_time) > 0).length;

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Profile Card Skeleton */}
        <div className="rounded-2xl bg-card shadow-neu-sm overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-primary/10 animate-pulse" />
                <div className="h-5 w-24 rounded-md bg-primary/10 animate-pulse" />
                <div className="h-3 w-32 rounded-md bg-primary/5 animate-pulse" />
              </div>
              <div className="h-8 w-24 rounded-xl bg-primary/10 animate-pulse" />
            </div>
            {/* Avatar + Info */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-40 rounded-lg bg-primary/10 animate-pulse" />
                <div className="h-4 w-52 rounded-md bg-primary/5 animate-pulse" />
              </div>
            </div>
            {/* Contribution Grid Placeholder */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-12 rounded-md bg-primary/10 animate-pulse" />
                  <div className="h-4 w-48 rounded-md bg-primary/5 animate-pulse" />
                </div>
                <div className="flex gap-4">
                  <div className="h-4 w-24 rounded-md bg-primary/5 animate-pulse" />
                  <div className="h-4 w-24 rounded-md bg-primary/5 animate-pulse" />
                </div>
              </div>
              <div className="h-[100px] w-full rounded-xl bg-primary/5 animate-pulse" />
            </div>
          </div>
        </div>
        {/* Focus Settings Card Skeleton */}
        <div className="rounded-2xl bg-card shadow-neu-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 animate-pulse" />
            <div className="h-5 w-32 rounded-md bg-primary/10 animate-pulse" />
          </div>
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="h-4 w-36 rounded-md bg-primary/5 animate-pulse" />
              <div className="h-8 w-20 rounded-xl bg-primary/10 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="settings-page">
      {/* Profile Section */}
      <Card data-testid="profile-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-4 text-violet-500" />
                Profile <span className="text-xs text-muted-foreground mt-1">
                  Member since {user?.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'N/A'}
                </span>
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
              onClick={handleLogout}
              data-testid="settings-logout-btn"
            >
              <LogOut className="w-6 h-6" />
              Sign Out
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{user?.username}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Separator />

          {/* Contribution Grid */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight">{totalSubmissions}</span>
                <span className="text-muted-foreground font-medium text-sm">activities in the past one year</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <p>Active days: <span className="text-foreground font-semibold">{totalActiveDays}</span></p>
                <p>Max streak: <span className="text-foreground font-semibold">{user?.longest_streak || 0}</span></p>
              </div>
            </div>
            <div className="overflow-x-auto pb-2 -mx-2 px-2">
              <div className="flex justify-between items-start w-full min-w-[950px]">
              <TooltipProvider>
                {monthsData.map((month, mIdx) => (
                  <div key={mIdx} className="flex flex-col gap-1 flex-1 max-w-fit">
                    <div className="grid grid-rows-7 grid-flow-col gap-1 h-[100px]">
                      {month.days.map((day, dIdx) => (
                        <div key={dIdx} className="w-2.5 h-2.5 flex items-center justify-center">
                          {day.type === 'empty' ? (
                            <div className="w-2 h-2 rounded-lg bg-muted/10 opacity-30" />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-2.5 h-2.5 rounded-lg contribution-cell level-${day.level} hover:opacity-80 transition-all cursor-pointer shadow-neu-xs`}
                                  data-testid={`contribution-cell-${day.date}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-popover/95 backdrop-blur-md">
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
                    <p className="text-[15px] font-medium text-muted-foreground text-center">
                      {month.name}
                    </p>
                  </div>
                ))}
              </TooltipProvider>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="h-full">
          <Card className="h-full bg-gradient-to-br from-card to-orange-950/20 shadow-neu" data-testid="streak-card">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Best Streak</p>
                  <p className="text-4xl font-bold font-mono mt-1">{user?.longest_streak || 0}</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* XP Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="h-full">
          <Card className="h-full bg-gradient-to-br from-card to-violet-950/20 shadow-neu" data-testid="xp-card">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Level {user?.current_level || 1}</p>
                  <p className="text-4xl font-bold font-mono tracking-tighter mt-1">
                    {user?.total_xp || 0}<span className="text-lg text-muted-foreground">/{xpForNextLevel() + (user?.total_xp || 0)}</span>
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center glow-primary shrink-0">
                  <Zap className="w-8 h-8 text-violet-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks Today */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="h-full">
          <Card className="h-full bg-gradient-to-br from-card to-emerald-950/20" data-testid="tasks-today-card">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-4xl font-bold font-mono mt-1">
                    {stats?.total_tasks_completed || 0}
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center glow-secondary">
                  <CheckSquare className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Focus Time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="h-full">
          <Card className="h-full bg-gradient-to-br from-card to-blue-950/20" data-testid="focus-time-card">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Focus</p>
                  <p className="text-4xl font-bold font-mono mt-1">
                    {Math.floor((stats?.total_focus_time || 0) / 60)}
                    <span className="text-lg text-muted-foreground">h </span>
                    {(stats?.total_focus_time || 0) % 60}
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
    </div>
  );
};
