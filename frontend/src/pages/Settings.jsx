import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';
import {
  User, Mail, Calendar, Flame, Zap, Award, Shield, LogOut,
  CheckSquare, Timer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, eachDayOfInterval, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const { user, api, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/activity?days=365'),
        ]);
        setStats(statsRes.data);
        setActivityData(activityRes.data);
        refreshUser();
      } catch (error) {
        console.error('Failed to fetch settings data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api, refreshUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
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

  // Contribution grid
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

  const monthsData = generateMonthData();
  const totalSubmissions = activityData.reduce((sum, d) => sum + d.tasks_completed + Math.floor(d.focus_time / 25), 0);
  const totalActiveDays = activityData.filter(d => (d.tasks_completed + d.focus_time) > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
            <div className="flex justify-between items-start w-full">
              <TooltipProvider>
                {monthsData.map((month, mIdx) => (
                  <div key={mIdx} className="flex flex-col gap-1 flex-1 max-w-fit">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="h-full">
          <Card className="h-full border-orange-500/40 bg-gradient-to-br from-card to-orange-950/20 shadow-lg shadow-orange-900/10" data-testid="streak-card">
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
          <Card className="h-full border-violet-500/40 bg-gradient-to-br from-card to-violet-950/20 shadow-lg shadow-violet-900/10" data-testid="xp-card">
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
          <Card className="h-full border-emerald-500/20 bg-gradient-to-br from-card to-emerald-950/20" data-testid="tasks-today-card">
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
          <Card className="h-full border-blue-500/20 bg-gradient-to-br from-card to-blue-950/20" data-testid="focus-time-card">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Focus</p>
                  <p className="text-4xl font-bold font-mono mt-1">
                    {Math.floor((stats?.total_focus_time || 0) / 60)}
                    <span className="text-lg text-muted-foreground">h </span>
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
