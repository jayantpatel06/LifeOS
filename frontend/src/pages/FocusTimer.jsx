import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { Play, Pause, RotateCcw, Coffee, Brain, Target, Clock, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TIMER_PRESETS = {
  focus: { label: 'Focus', duration: 25, icon: Brain, color: 'violet' },
  short_break: { label: 'Short Break', duration: 5, icon: Coffee, color: 'emerald' },
  long_break: { label: 'Long Break', duration: 15, icon: Coffee, color: 'blue' },
};

export const FocusTimer = () => {
  const { api, refreshUser } = useAuth();
  const [mode, setMode] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_PRESETS.focus.duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [customDuration, setCustomDuration] = useState('25');
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/focus/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch focus stats:', error);
    }
  }, [api]);

  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);

    // Play notification sound
    try {
      audioRef.current?.play();
    } catch (e) {
      console.log('Audio play failed:', e);
    }

    if (mode === 'focus' && currentSession) {
      try {
        await api.patch(`/focus/${currentSession.id}/complete`, {
          duration_actual: TIMER_PRESETS.focus.duration,
          interrupted: false
        });
        toast.success('Focus session completed! +25 XP', {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        });
        setSessionsCompleted(prev => prev + 1);
        fetchStats();
        refreshUser();
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
      setCurrentSession(null);
    }

    // Auto switch to break
    if (mode === 'focus') {
      const nextMode = sessionsCompleted > 0 && (sessionsCompleted + 1) % 4 === 0 ? 'long_break' : 'short_break';
      setMode(nextMode);
      setTimeLeft(TIMER_PRESETS[nextMode].duration * 60);
      toast.info(`Time for a ${nextMode === 'long_break' ? 'long' : 'short'} break!`);
    } else {
      setMode('focus');
      setTimeLeft(TIMER_PRESETS.focus.duration * 60);
      toast.info('Break complete! Ready to focus?');
    }
  }, [mode, currentSession, sessionsCompleted, api, fetchStats, refreshUser]);

  useEffect(() => {
    fetchStats();
    // Create audio element for notification
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQT1U5rW24NsCwAPkdLkjV0EA1Gd2+KIXgEAOpTW4YdaAABzk9zjg1gAAFSW2eKDVwAAQJPW4YVYAAAyktThiFoAAC6R0+GKXQAALL/T4YxgAAAwv9PhkGMAADS/0+GUZgAAOMbQ4ZlpAAA8xtDhnWwAAEDE0OGhcAAAQr3Q4aVzAABGvdDhqXYAAEq90OGteQAATrnP4bF8AABSuc/htX8AAFW5z+G5ggAAWrXP4b2FAABYI8riqogAAF0iyuKujAAAYSLK4rKPAABlIsrist');
  }, [fetchStats]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, handleTimerComplete]);

  const startTimer = async () => {
    if (mode === 'focus' && !currentSession) {
      try {
        const response = await api.post('/focus/start', {
          duration_planned: parseInt(customDuration)
        });
        setCurrentSession(response.data);
      } catch (error) {
        toast.error('Failed to start session');
        return;
      }
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
  };

  const resetTimer = async () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);

    if (currentSession && mode === 'focus') {
      try {
        await api.patch(`/focus/${currentSession.id}/complete`, {
          duration_actual: TIMER_PRESETS[mode].duration * 60 - timeLeft,
          interrupted: true
        });
      } catch (error) {
        console.error('Failed to mark session as interrupted:', error);
      }
      setCurrentSession(null);
    }

    setTimeLeft(TIMER_PRESETS[mode].duration * 60);
  };

  const changeMode = (newMode) => {
    if (isRunning) {
      pauseTimer();
    }
    if (currentSession) {
      setCurrentSession(null);
    }
    setMode(newMode);
    setTimeLeft(TIMER_PRESETS[newMode].duration * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((TIMER_PRESETS[mode].duration * 60 - timeLeft) / (TIMER_PRESETS[mode].duration * 60)) * 100;
  const config = TIMER_PRESETS[mode];
  const Icon = config.icon;

  return (
    <div className="space-y-6" data-testid="focus-page">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold font-['Outfit'] tracking-tight">Focus Timer</h1>
        <p className="text-muted-foreground mt-1">Stay productive with the Pomodoro Technique</p>
      </div>

      {/* Timer */}
      <div className="flex justify-center">
        <Card className={`w-full max-w-lg border-${config.color}-500/20 bg-gradient-to-br from-card to-${config.color}-950/10`} data-testid="timer-card">
          <CardContent className="p-8">
            {/* Mode Selector */}
            <div className="flex justify-center gap-2 mb-8">
              {Object.entries(TIMER_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant={mode === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => changeMode(key)}
                  className={mode === key ? `bg-${preset.color}-600 hover:bg-${preset.color}-700` : ''}
                  data-testid={`mode-${key}-btn`}
                >
                  <preset.icon className="w-4 h-4 mr-2" />
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Timer Display */}
            <div className="relative w-64 h-64 mx-auto mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/30"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={`text-${config.color}-500`}
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                  initial={false}
                  animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100) }}
                  transition={{ duration: 0.5 }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  key={timeLeft}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-bold font-mono"
                  data-testid="timer-display"
                >
                  {formatTime(timeLeft)}
                </motion.div>
                <Badge variant="outline" className={`mt-2 bg-${config.color}-500/20 text-${config.color}-400 border-${config.color}-500/30`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {!isRunning ? (
                <Button
                  size="lg"
                  onClick={startTimer}
                  className={`gap-2 bg-gradient-to-r from-${config.color}-600 to-${config.color}-700 hover:from-${config.color}-700 hover:to-${config.color}-800 shadow-lg`}
                  data-testid="start-btn"
                >
                  <Play className="w-5 h-5" /> Start
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={pauseTimer}
                  variant="outline"
                  className="gap-2"
                  data-testid="pause-btn"
                >
                  <Pause className="w-5 h-5" /> Pause
                </Button>
              )}

              <Button
                size="lg"
                variant="ghost"
                onClick={resetTimer}
                className="gap-2"
                data-testid="reset-btn"
              >
                <RotateCcw className="w-5 h-5" /> Reset
              </Button>
            </div>

            {/* Session Info */}
            {currentSession && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center text-sm text-muted-foreground"
              >
                Session in progress...
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card data-testid="today-focus-stat">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    {Math.floor((stats?.today_focus_time || 0) / 60)}h {(stats?.today_focus_time || 0) % 60}m
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-violet-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card data-testid="sessions-today-stat">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sessions Today</p>
                  <p className="text-2xl font-bold font-mono mt-1">{stats?.today_sessions || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card data-testid="total-focus-stat">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Focus</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    {Math.floor((stats?.total_focus_time || 0) / 60)}h
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card data-testid="completion-rate-stat">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    {stats?.completion_rate?.toFixed(0) || 0}%
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pomodoro Technique Info */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-500" />
            How to use the Pomodoro Technique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-violet-500">1</span>
              </div>
              <p className="text-muted-foreground">Choose a task to work on</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-violet-500">2</span>
              </div>
              <p className="text-muted-foreground">Work for 25 minutes (one "pomodoro")</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-violet-500">3</span>
              </div>
              <p className="text-muted-foreground">Take a 5-minute break</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-violet-500">4</span>
              </div>
              <p className="text-muted-foreground">After 4 pomodoros, take a longer break (15-30 min)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
