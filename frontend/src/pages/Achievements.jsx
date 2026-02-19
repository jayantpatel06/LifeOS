import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import {
  Trophy, Flame, CheckCircle2, Clock, FileText, Brain, Lock,
  Award, Target, Zap, Star
} from 'lucide-react';
import { motion } from 'framer-motion';

const iconMap = {
  check: CheckCircle2,
  trophy: Trophy,
  crown: Star,
  flame: Flame,
  clock: Clock,
  brain: Brain,
  'file-text': FileText,
};

const typeConfig = {
  task: { label: 'Tasks', color: 'violet', icon: CheckCircle2 },
  streak: { label: 'Streaks', color: 'orange', icon: Flame },
  focus: { label: 'Focus', color: 'blue', icon: Clock },
  focus_hours: { label: 'Focus Hours', color: 'emerald', icon: Brain },
  notes: { label: 'Notes', color: 'purple', icon: FileText },
};

export const Achievements = () => {
  const { api, user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await api.get('/achievements');
        setAchievements(response.data);
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [api]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalXPEarned = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp_reward, 0);

  // Group achievements by type
  const groupedAchievements = achievements.reduce((acc, achievement) => {
    const type = achievement.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(achievement);
    return acc;
  }, {});

  const AchievementCard = ({ achievement }) => {
    const Icon = iconMap[achievement.badge_icon] || Trophy;
    const config = typeConfig[achievement.type] || typeConfig.task;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={achievement.unlocked ? { scale: 1.02 } : {}}
        className={`relative p-4 rounded-xl border transition-all duration-300 ${achievement.unlocked
          ? `bg-gradient-to-br from-${config.color}-500/10 to-${config.color}-950/20 border-${config.color}-500/30 hover:border-${config.color}-500/50`
          : 'bg-card/50 border-border/30 opacity-60'
          }`}
        data-testid={`achievement-card-${achievement.id}`}
      >
        {/* Lock overlay for locked achievements */}
        {!achievement.unlocked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[1px]">
            <Lock className="w-6 h-6 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${achievement.unlocked
            ? `bg-${config.color}-500/20`
            : 'bg-muted/50'
            }`}>
            <Icon className={`w-6 h-6 ${achievement.unlocked ? `text-${config.color}-500` : 'text-muted-foreground/50'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`font-semibold ${!achievement.unlocked && 'text-muted-foreground'}`}>
                {achievement.name}
              </p>
              {achievement.unlocked && (
                <Badge variant="outline" className={`bg-${config.color}-500/20 text-${config.color}-400 border-${config.color}-500/30 text-xs`}>
                  Unlocked
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{achievement.description}</p>

            <div className="flex items-center justify-between mt-3">
              <Badge variant="outline" className="bg-muted/50 text-xs">
                <Zap className="w-3 h-3 mr-1 text-amber-500" />
                +{achievement.xp_reward} XP
              </Badge>

              {achievement.unlocked && achievement.unlocked_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(achievement.unlocked_at).toLocaleDateString()}
                </span>
              )}
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
    <div className="space-y-4" data-testid="achievements-page">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-amber-500/20 bg-gradient-to-br from-card to-amber-950/20" data-testid="achievements-unlocked-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <p className="text-sm text-muted-foreground">Unlocked</p>
                  <p className="text-4xl font-bold font-mono mt-1">
                    {unlockedCount}
                    <span className="text-lg text-muted-foreground">/{achievements.length}</span>
                  </p>
                </div>
                <div className="flex-1 px-2 pt-8">
                  <Progress value={(unlockedCount / achievements.length) * 100} className="h-3" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-amber-500" />
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
          <Card className="border-violet-500/20 bg-gradient-to-br from-card to-violet-950/20" data-testid="xp-earned-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">XP from Achievements</p>
                  <p className="text-4xl font-bold font-mono text-violet-500 mt-1">{totalXPEarned}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-violet-500" />
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
          <Card className="border-emerald-500/20 bg-gradient-to-br from-card to-emerald-950/20" data-testid="level-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Level</p>
                  <p className="text-4xl font-bold font-mono text-emerald-500 mt-1">{user?.current_level || 1}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Achievement Categories */}
      {Object.entries(groupedAchievements).map(([type, typeAchievements], groupIndex) => {
        const config = typeConfig[type] || typeConfig.task;
        const ConfigIcon = config.icon;

        return (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + groupIndex * 0.1 }}
          >
            <Card data-testid={`achievement-group-${type}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ConfigIcon className={`w-5 h-5 text-${config.color}-500`} />
                  {config.label} Achievements
                </CardTitle>
                <CardDescription>
                  {typeAchievements.filter(a => a.unlocked).length} of {typeAchievements.length} unlocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeAchievements.map(achievement => (
                    <AchievementCard key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Motivation Section */}
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Keep Going!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Complete tasks, maintain streaks, and log focus sessions to unlock more achievements
            and earn XP rewards.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
