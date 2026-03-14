import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Zap, CheckSquare, FileText, Wallet, Timer, Flame, ArrowRight, Shield, Sparkles, BarChart3, Brain, Target, Trophy, ChevronDown, Star, User, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(2, 'Username must be at least 2 characters').max(30, 'Username must be 30 characters or less'),
});

export const Auth = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const lenisRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const lenis = new Lenis({
      wrapper: container,
      content: container.firstElementChild,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    const rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({});
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(fieldErrors);
      toast.error(Object.values(fieldErrors).flat()[0]);
      return;
    }
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
    setErrors({});
    const result = registerSchema.safeParse({ email: registerEmail, password: registerPassword, username: registerUsername });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(fieldErrors);
      toast.error(Object.values(fieldErrors).flat()[0]);
      return;
    }
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
    { icon: Zap, label: 'Habit Tracking', color: 'text-yellow-500' },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, { offset: 25 });
    } else {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openAuth = () => setAuthOpen(true);

  const detailedFeatures = [
    {
      icon: CheckSquare,
      title: 'Smart Task Management',
      description: 'Organize tasks with priorities, due dates, and categories. Track your productivity with visual progress indicators.',
      color: 'from-violet-500 to-purple-600',
    },
    {
      icon: FileText,
      title: 'Rich Notes Editor',
      description: 'A powerful editor with support for images, links, embeds, mentions, and markdown. Your thoughts, beautifully organized.',
      color: 'from-blue-500 to-cyan-600',
    },
    {
      icon: Wallet,
      title: 'Budget Tracker',
      description: 'Multiple sheets, CSV import/export, and real-time totals. Keep your finances in check with a spreadsheet-like experience.',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: Timer,
      title: 'Focus Timer',
      description: 'Pomodoro-style focus sessions with ambient sounds. Stay in the zone and build deep work habits.',
      color: 'from-orange-500 to-red-600',
    },
    {
      icon: Trophy,
      title: 'Achievements & XP',
      description: 'Earn experience points, unlock achievements, and level up as you complete tasks and stay consistent.',
      color: 'from-yellow-500 to-amber-600',
    },
    {
      icon: Flame,
      title: 'Streaks & Habits',
      description: 'Build daily streaks that keep you motivated. Visual activity grids show your consistency over time.',
      color: 'from-red-500 to-pink-600',
    },
  ];

  const stats = [
    { value: '6+', label: 'Productivity Tools' },
    { value: '100%', label: 'Free & Open' },
    { value: '0', label: 'Ads or Tracking' },
    { value: '∞', label: 'Possibilities' },
  ];

  return (
    <div ref={scrollContainerRef} className="h-screen overflow-y-auto">
      <div>
      {/* Section 1: Hero + Auth */}
      <section className="min-h-screen flex flex-col relative overflow-hidden">
        {/* Navbar — Glassmorphism */}
        <nav className="relative z-20 flex items-center justify-center px-4 md:px-8 pt-5 shrink-0">
          <div className="flex items-center justify-between w-full max-w-4xl px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/35 shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_0_26px_rgba(255,255,255,0.22)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="/logo192-v2.png" alt="LifeOS" className="w-full h-full object-cover" />
              </div>
              <span className="text-base font-bold font-['Outfit'] tracking-tight">LifeOS</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => scrollToSection('features')} className="hover:text-foreground transition-colors">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="hover:text-foreground transition-colors">How it works</button>
            </div>
            <Button
              size="sm"
              className="rounded-full px-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-sm"
              onClick={openAuth}
            >
              Get Started
            </Button>
          </div>
        </nav>

        {/* Hero body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 mt-8 md:px-12 lg:px-16 gap-8 pb-10 text-center">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-bold font-['Outfit'] leading-[1] tracking-tight">
                <span className="text-foreground/25">YOUR LIFE</span>
                <br />
                <span className="text-foreground/25">FULLY</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400">
                  ORGANIZED
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-sm md:text-base text-muted-foreground max-w-md mx-auto leading-relaxed mt-6 mb-8"
            >
              Experience the next generation of productivity.
              Tasks, notes, budget, and focus tools — all unified
              in one powerful gamified platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                size="lg"
                className="rounded-full px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 gap-2 shadow-lg shadow-violet-600/25 text-base"
                onClick={openAuth}
              >
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex -space-x-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <span>Loved by productivity enthusiasts</span>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Feature pills row - Desktop - full screen width */}
        <div className="hidden lg:block w-full overflow-hidden mt-6 shrink-0">
          <div className="flex gap-2.5" style={{ width: 'max-content', animation: 'pill-scroll 35s linear infinite' }}>
            {[...features, ...features, ...features, ...features].map((feature, index) => (
              <div
                key={`pill-d-${index}`}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl shadow-sm whitespace-nowrap shrink-0"
              >
                <feature.icon className={`w-3.5 h-3.5 ${feature.color}`} />
                <span className="text-xs font-medium text-foreground/80">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile feature pills - auto-scroll glassmorphism */}
        <div className="flex lg:hidden overflow-hidden shrink-0 py-4 px-214">
  2        <div className="flex gap-2.5" style={{animation: 'pill-scroll 30s linear infinite' }}>
            {[...features, ...features, ...features, ...features].map((feature, index) => (
              <div
                key={`pill-m-${index}`}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl shadow-sm whitespace-nowrap shrink-0"
              >
                <feature.icon className={`w-3.5 h-3.5 ${feature.color}`} />
                <span className="text-xs font-medium text-foreground/80">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="flex justify-center pb-6 shrink-0"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground/30" />
        </motion.div>
      </section>

      {/* Section 2: Stats Bar */}
      <section className="py-12 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold font-['Outfit'] text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section 3: Detailed Features */}
      <section id="features" className="py-16 px-6 scroll-mt-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] mb-4">
              Everything You Need,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">
                One Platform
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Stop juggling multiple apps. LifeOS brings all your productivity tools together
              in a beautiful, gamified experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {detailedFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-card/60 backdrop-blur-sm border-border/30 hover:shadow-neu transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold font-['Outfit'] mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <section id="how-it-works" className="py-16 px-6 border-t border-border/30 scroll-mt-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] mb-4">
              Get Started in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
                3 Steps
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Sparkles, title: 'Create Account', desc: 'Sign up in seconds with just an email and password.' },
              { step: '02', icon: Target, title: 'Set Your Goals', desc: 'Add tasks, create notes, set budgets, and configure your focus sessions.' },
              { step: '03', icon: BarChart3, title: 'Track Progress', desc: 'Watch your streaks grow, earn XP, and unlock achievements as you stay consistent.' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="text-center"
              >
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-card/80 shadow-neu flex items-center justify-center">
                    <item.icon className="w-7 h-7 text-violet-500" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold font-['Outfit'] mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Why LifeOS */}
      <section className="py-16 px-6 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] mb-4">
              Built Different
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              LifeOS isn't just another todo app. It's a complete life management system.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Shield, text: 'Privacy-first — your data stays yours' },
              { icon: Zap, text: 'Blazing fast with real-time sync' },
              { icon: Brain, text: 'Gamified to keep you motivated' },
              { icon: Sparkles, text: 'Beautiful neumorphic design' },
            ].map((item, index) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm shadow-neu-sm"
              >
                <item.icon className="w-5 h-5 text-violet-500 shrink-0" />
                <span className="text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Final CTA */}
      <section className="py-20 px-6 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] mb-4">
            Ready to Take Control?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join LifeOS and start organizing your life today. It's free.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-lg px-8 gap-2"
            onClick={openAuth}
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/30 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg overflow-hidden">
            <img src="/logo192-v2.png" alt="LifeOS" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold font-['Outfit']">LifeOS</span>
        </div>
        <p className="text-xs text-muted-foreground">Your life, organized. Built with care.</p>
      </footer>
      </div>

      {/* Auth Dialog */}
      <Dialog open={authOpen} onOpenChange={(open) => { setAuthOpen(open); if (!open) setAuthTab('login'); }}>
        <DialogContent className="max-w-[880px] w-full md:h-auto h-screen border-0 shadow-2xl p-0 pt-12 md:pt-0 gap-0 bg-slate-950 rounded-2xl overflow-y-auto md:overflow-hidden flex flex-col justify-center md:justify-start mt-6 md:mt-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col md:flex-col"
          >
            {/* Top accent bar */}
            <div/>

            <div className="flex flex-col md:flex-row-reverse min-h-[500px]">
              {/* Right panel (form) — rendered second, placed on right via row-reverse */}
              <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-[26px] font-bold font-['Outfit'] text-white leading-tight">
                    Sign in to LifeOS{' '}
                    <span className="inline-block w-7 h-7 align-middle">
                      <img src="/logo192-v2.png" alt="" className="w-full h-full object-cover rounded-lg" />
                    </span>
                    <br />
                    <span className="text-white">to continue</span>
                  </h1>
                </div>

                <Tabs value={authTab} onValueChange={setAuthTab} className="w-full">
                  <TabsContent value="login" className="mt-0">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="Email address"
                          className="h-12 pl-11 bg-slate-800 border-0 rounded-full text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/30"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                          data-testid="login-email-input"
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1 ml-4">{errors.email[0]}</p>}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Password"
                          className="h-12 pl-11 bg-slate-800 border-0 rounded-full text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/30"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          data-testid="login-password-input"
                        />
                        {errors.password && <p className="text-xs text-red-500 mt-1 ml-4">{errors.password[0]}</p>}
                      </div>
                      <div className="pt-2" />
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all duration-200"
                        disabled={loading}
                        data-testid="login-submit-btn"
                      >
                        {loading ? 'Signing in...' : 'Sign in'}
                      </Button>
                    </form>
                    <p className="text-center text-sm text-gray-400 mt-6">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        className="text-violet-600 font-medium hover:underline"
                        onClick={() => setAuthTab('register')}
                      >
                        Create one
                      </button>
                    </p>
                  </TabsContent>

                  <TabsContent value="register" className="mt-0">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          id="register-username"
                          type="text"
                          placeholder="Username"
                          className="h-12 pl-11 bg-slate-800 border-0 rounded-full text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/30"
                          value={registerUsername}
                          onChange={(e) => setRegisterUsername(e.target.value)}
                          required
                          data-testid="register-username-input"
                        />
                        {errors.username && <p className="text-xs text-red-500 mt-1 ml-4">{errors.username[0]}</p>}
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="Email address"
                          className="h-12 pl-11 bg-slate-800 border-0 rounded-full text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/30"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          required
                          data-testid="register-email-input"
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1 ml-4">{errors.email[0]}</p>}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="Password"
                          className="h-12 pl-11 bg-slate-800 border-0 rounded-full text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/30"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          required
                          data-testid="register-password-input"
                        />
                        {errors.password && <p className="text-xs text-red-500 mt-1 ml-4">{errors.password[0]}</p>}
                      </div>
                      <div className="pt-2" />
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all duration-200"
                        disabled={loading}
                        data-testid="register-submit-btn"
                      >
                        {loading ? 'Creating account...' : 'Create account'}
                      </Button>
                    </form>
                    <p className="text-center text-sm text-gray-400 mt-6">
                      Already have an account?{' '}
                      <button
                        type="button"
                        className="text-violet-600 font-medium hover:underline"
                        onClick={() => setAuthTab('login')}
                      >
                        Sign in
                      </button>
                    </p>
                  </TabsContent>

                  <TabsList className="sr-only">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Right panel — Illustration */}
              <div className="hidden md:flex md:w-[45%] items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-10 relative overflow-hidden">
                

                {/* Central logo */}
                <div className="relative z-10 flex flex-col items-center">
                  <div >
                    <img src="/logo192-v2.png" alt="LifeOS" className="w-14 h-14 object-cover rounded-xl" />
                  </div>

                  {/* Feature icons randomly positioned around */}
                  {features.slice(0, 4).map((f, i) => {
                    const angles = [45, 135, 225, 315];
                    const angle = angles[i];
                    const radius = 90;
                    const x = Math.cos((angle * Math.PI) / 180) * radius;
                    const y = Math.sin((angle * 2 * Math.PI) / 180) * radius ;
                    return (
                      <div
                        key={f.label}
                        className="absolute w-10 h-10 rounded-full bg-slate-800 shadow-md flex items-center justify-center"
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                      >
                        <f.icon className={`w-5 h-5 ${f.color}`} />
                      </div>
                    );
                  })}

                  
                </div>

                {/* Decorative dots */}
                <div className="absolute top-8 right-8 w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute bottom-12 left-12 w-2 h-2 rounded-full bg-violet-400" />
                <div className="absolute top-1/3 left-8 w-1.5 h-1.5 rounded-full bg-amber-400" />
                <div className="absolute bottom-1/4 right-16 w-1.5 h-1.5 rounded-full bg-pink-400" />
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
