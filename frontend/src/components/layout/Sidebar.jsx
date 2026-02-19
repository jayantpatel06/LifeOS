import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Wallet,
  Timer,
  Trophy,
  Settings,

  Flame,
  Zap,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/notes', icon: FileText, label: 'Notes' },
  { to: '/budget', icon: Wallet, label: 'Budget' },
  { to: '/focus', icon: Timer, label: 'Focus Timer' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = ({ isCollapsed, toggleCollapse }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);


  const NavItem = ({ item }) => {
    const content = (
      <NavLink
        to={item.to}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-primary/10 text-primary border border-primary/20 shadow-lg glow-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            isCollapsed && !mobileOpen ? "justify-center" : ""
          )
        }
        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {(!isCollapsed || mobileOpen) && <span>{item.label}</span>}
      </NavLink>
    );

    if (isCollapsed && !mobileOpen) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const NavContent = () => (
    <TooltipProvider>
      {/* Logo Area */}
      <div className={cn(
        "p-6 flex items-center transition-all duration-300",
        (isCollapsed && !mobileOpen) ? "justify-center px-0" : "px-6 justify-start"
      )}>
        <button
          onClick={toggleCollapse}
          className="flex items-center gap-3 overflow-hidden group/logo"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ">
            <img src="/logo192-v2.png" alt="LifeOS Logo" className="w-full h-full object-cover" />
          </div>
          {(!isCollapsed || mobileOpen) && (
            <span className="text-xl font-bold font-['Outfit'] tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 group-hover/logo:text-primary transition-colors">LifeOS</span>
          )}
        </button>
      </div>

      {/* User Stats */}
      <div className={cn("px-4 mb-4 transition-all duration-300", (isCollapsed && !mobileOpen) ? "px-2" : "px-4")}>
        <div className={cn(
          "p-4 rounded-xl bg-gradient-to-br from-card to-muted/50 border border-border/50 transition-all duration-100 overflow-hidden",
          (isCollapsed && !mobileOpen) ? "p-2 items-center flex flex-col" : ""
        )}>
          <div className={cn("flex items-center gap-3 mb-3 w-full", (isCollapsed && !mobileOpen) ? "flex-col mb-0" : "")}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold shrink-0 cursor-pointer hover:ring-2 ring-primary/50 transition-all">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            {(!isCollapsed || mobileOpen) && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2">
                <p className="font-medium truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground">Level {user?.current_level || 1}</p>
              </div>
            )}
          </div>

          {(!isCollapsed || mobileOpen) && (
            <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-sm">
                <Flame className={cn("w-4 h-4 text-orange-500", user?.current_streak > 0 && "animate-fire")} />
                <span className="font-mono">{user?.current_streak || 0}</span>
                <span className="text-muted-foreground text-xs">streak</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-violet-500" />
                <span className="font-mono">{user?.total_xp || 0}</span>
                <span className="text-muted-foreground text-xs">XP</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className={cn("mx-4 w-auto", (isCollapsed && !mobileOpen) ? "mx-2" : "mx-4")} />

      {/* Navigation */}
      <ScrollArea className={cn("flex-1 py-3", (isCollapsed && !mobileOpen) ? "px-1" : "px-3")}>
        <nav className={cn("space-y-1 flex flex-col", (isCollapsed && !mobileOpen) ? "items-center" : "items-stretch")}>
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
      </ScrollArea>

    </TooltipProvider>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-toggle"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-background border-r border-border/50 flex flex-col",
          (isCollapsed && !mobileOpen) ? "w-16" : "w-52",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
};
