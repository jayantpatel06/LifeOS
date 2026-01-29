import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { User, Mail, Calendar, Flame, Zap, Award, Shield, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  return (
    <div className="space-y-6 max-w-3xl lg:max-w-full" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-['Outfit'] tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <Card data-testid="profile-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-violet-500" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{user?.username}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                  <Award className="w-3 h-3 mr-1" />
                  Level {user?.current_level || 1}
                </Badge>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  {user?.total_xp || 0} XP
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Member since</p>
                <p className="font-medium">
                  {user?.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="font-medium text-orange-500">{user?.current_streak || 0} days</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10">
              <Flame className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Longest Streak</p>
                <p className="font-medium text-amber-500">{user?.longest_streak || 0} days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card data-testid="account-actions-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-500" />
            Account
          </CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/50">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">Sign out of your account on this device</p>
            </div>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
              data-testid="settings-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img src="/logo192-v2.png" alt="LifeOS Logo" className="w-full h-full object-cover" />
          </div>
          <h3 className="font-semibold text-lg">LifeOS</h3>
          <p className="text-sm text-muted-foreground mt-1">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground mt-4">
            Your all-in-one productivity platform
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
