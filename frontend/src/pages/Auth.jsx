import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Zap, CheckSquare, FileText, Wallet, Timer, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export const Auth = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(registerEmail, registerPassword, registerUsername);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: CheckSquare, label: 'Task Management', color: 'text-violet-500' },
    { icon: FileText, label: 'Rich Notes', color: 'text-blue-500' },
    { icon: Wallet, label: 'Budget Tracking', color: 'text-emerald-500' },
    { icon: Timer, label: 'Focus Timer', color: 'text-orange-500' },
    { icon: Flame, label: 'Streak System', color: 'text-red-500' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-12 xl:px-20 bg-gradient-to-br from-background via-card to-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl glow-primary overflow-hidden">
              <img src="/logo192.png" alt="LifeOS Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight">LifeOS</h1>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold font-['Outfit'] mb-4 leading-tight">
            Your Life,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">
              Organized
            </span>
          </h2>

          <p className="text-lg text-muted-foreground mb-12 max-w-lg">
            The all-in-one productivity platform that combines tasks, notes, budget tracking,
            and focus tools in a gamified experience.
          </p>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.4 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50"
              >
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
                <span className="text-sm font-medium">{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/logo192.png" alt="LifeOS Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold font-['Outfit']">LifeOS</span>
          </div>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-['Outfit']">Get Started</CardTitle>
              <CardDescription>Sign in or create an account to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                  <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        data-testid="login-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        data-testid="login-password-input"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                      disabled={loading}
                      data-testid="login-submit-btn"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="johndoe"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        required
                        data-testid="register-username-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                        data-testid="register-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        data-testid="register-password-input"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                      disabled={loading}
                      data-testid="register-submit-btn"
                    >
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
